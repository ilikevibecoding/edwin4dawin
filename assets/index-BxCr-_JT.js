(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const r of o.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&n(r)}).observe(document,{childList:!0,subtree:!0});function e(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(i){if(i.ep)return;i.ep=!0;const o=e(i);fetch(i.href,o)}})();const Wd={low:.25,medium:.4,high:.5,ultra:.5},Xd={low:2500,medium:3500,high:5e3,ultra:6e3};function qd(){const s=new URLSearchParams(window.location.search),t=n=>{const i=s.get(n);if(i===null||i==="")return null;if(i.includes("/")){const[r,a]=i.split("/").map(Number);return a?r/a:null}const o=Number(i);return Number.isFinite(o)?o:null},e=s.get("quality")??"high";return{bench:s.get("bench"),seed:t("seed")??20260904,time:t("time"),weather:s.get("weather")??null,quality:["low","medium","high","ultra"].includes(e)?e:"high",freeze:s.get("freeze")==="1",fixedDt:t("dt"),noHud:s.get("nohud")==="1",width:t("w"),height:t("h"),autostart:s.get("autostart")==="1"||s.get("bench")!==null,grid:s.get("grid")==="1",debug:s.get("debug")==="1",debugRoads:s.get("debugroads")==="1",dbg:new Set((s.get("dbg")??"").split(",").filter(Boolean))}}/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Yc="170",Yd=0,Dh=1,$d=2,Du=1,Iu=2,Fi=3,Yi=0,Tn=1,nn=2,cs=0,Gi=1,Ih=2,zh=3,Nh=4,jd=5,Ps=100,Zd=101,Kd=102,Jd=103,Qd=104,tf=200,ef=201,nf=202,sf=203,Ql=204,tc=205,of=206,rf=207,af=208,lf=209,cf=210,hf=211,uf=212,df=213,ff=214,ec=0,nc=1,ic=2,_o=3,sc=4,oc=5,rc=6,ac=7,zu=0,pf=1,mf=2,Vi=0,gf=1,vf=2,xf=3,wf=4,yf=5,_f=6,Mf=7,Nu=300,Mo=301,bo=302,lc=303,cc=304,Na=306,So=1e3,Qe=1001,hc=1002,Nn=1003,bf=1004,Ur=1005,ye=1006,ja=1007,Bi=1008,ti=1009,Uu=1010,Fu=1011,br=1012,$c=1013,wi=1014,$n=1015,In=1016,jc=1017,Zc=1018,Eo=1020,ku=35902,Ou=1021,Bu=1022,En=1023,Hu=1024,Gu=1025,xo=1026,To=1027,Sr=1028,Ua=1029,Vu=1030,Kc=1031,Jc=1033,va=33776,xa=33777,wa=33778,ya=33779,uc=35840,dc=35841,fc=35842,pc=35843,mc=36196,gc=37492,vc=37496,xc=37808,wc=37809,yc=37810,_c=37811,Mc=37812,bc=37813,Sc=37814,Ec=37815,Tc=37816,Ac=37817,Cc=37818,Rc=37819,Pc=37820,Lc=37821,_a=36492,Dc=36494,Ic=36495,Wu=36283,zc=36284,Nc=36285,Uc=36286,Sf=3200,Xu=3201,qu=0,Ef=1,vi="",Dn="srgb",Gs="srgb-linear",Fa="linear",Pe="srgb",$s=7680,Uh=519,Tf=512,Af=513,Cf=514,Yu=515,Rf=516,Pf=517,Lf=518,Df=519,Fh=35044,kh=35048,Oh="300 es",Hi=2e3,Sa=2001;class Do{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){if(this._listeners===void 0)return!1;const n=this._listeners;return n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){if(this._listeners===void 0)return;const i=this._listeners[t];if(i!==void 0){const o=i.indexOf(e);o!==-1&&i.splice(o,1)}}dispatchEvent(t){if(this._listeners===void 0)return;const n=this._listeners[t.type];if(n!==void 0){t.target=this;const i=n.slice(0);for(let o=0,r=i.length;o<r;o++)i[o].call(this,t);t.target=null}}}const _n=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Bh=1234567;const gr=Math.PI/180,Er=180/Math.PI;function Io(){const s=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(_n[s&255]+_n[s>>8&255]+_n[s>>16&255]+_n[s>>24&255]+"-"+_n[t&255]+_n[t>>8&255]+"-"+_n[t>>16&15|64]+_n[t>>24&255]+"-"+_n[e&63|128]+_n[e>>8&255]+"-"+_n[e>>16&255]+_n[e>>24&255]+_n[n&255]+_n[n>>8&255]+_n[n>>16&255]+_n[n>>24&255]).toLowerCase()}function Je(s,t,e){return Math.max(t,Math.min(e,s))}function Qc(s,t){return(s%t+t)%t}function If(s,t,e,n,i){return n+(s-t)*(i-n)/(e-t)}function zf(s,t,e){return s!==t?(e-s)/(t-s):0}function vr(s,t,e){return(1-e)*s+e*t}function Nf(s,t,e,n){return vr(s,t,1-Math.exp(-e*n))}function Uf(s,t=1){return t-Math.abs(Qc(s,t*2)-t)}function Ff(s,t,e){return s<=t?0:s>=e?1:(s=(s-t)/(e-t),s*s*(3-2*s))}function kf(s,t,e){return s<=t?0:s>=e?1:(s=(s-t)/(e-t),s*s*s*(s*(s*6-15)+10))}function Of(s,t){return s+Math.floor(Math.random()*(t-s+1))}function Bf(s,t){return s+Math.random()*(t-s)}function Hf(s){return s*(.5-Math.random())}function Gf(s){s!==void 0&&(Bh=s);let t=Bh+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function Vf(s){return s*gr}function Wf(s){return s*Er}function Xf(s){return(s&s-1)===0&&s!==0}function qf(s){return Math.pow(2,Math.ceil(Math.log(s)/Math.LN2))}function Yf(s){return Math.pow(2,Math.floor(Math.log(s)/Math.LN2))}function $f(s,t,e,n,i){const o=Math.cos,r=Math.sin,a=o(e/2),l=r(e/2),h=o((t+n)/2),c=r((t+n)/2),d=o((t-n)/2),u=r((t-n)/2),p=o((n-t)/2),f=r((n-t)/2);switch(i){case"XYX":s.set(a*c,l*d,l*u,a*h);break;case"YZY":s.set(l*u,a*c,l*d,a*h);break;case"ZXZ":s.set(l*d,l*u,a*c,a*h);break;case"XZX":s.set(a*c,l*f,l*p,a*h);break;case"YXY":s.set(l*p,a*c,l*f,a*h);break;case"ZYZ":s.set(l*f,l*p,a*c,a*h);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+i)}}function uo(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("Invalid component type.")}}function Pn(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("Invalid component type.")}}const mn={DEG2RAD:gr,RAD2DEG:Er,generateUUID:Io,clamp:Je,euclideanModulo:Qc,mapLinear:If,inverseLerp:zf,lerp:vr,damp:Nf,pingpong:Uf,smoothstep:Ff,smootherstep:kf,randInt:Of,randFloat:Bf,randFloatSpread:Hf,seededRandom:Gf,degToRad:Vf,radToDeg:Wf,isPowerOfTwo:Xf,ceilPowerOfTwo:qf,floorPowerOfTwo:Yf,setQuaternionFromProperEuler:$f,normalize:Pn,denormalize:uo};class Rt{constructor(t=0,e=0){Rt.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,n=this.y,i=t.elements;return this.x=i[0]*e+i[3]*n+i[6],this.y=i[1]*e+i[4]*n+i[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(Je(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const n=Math.cos(e),i=Math.sin(e),o=this.x-t.x,r=this.y-t.y;return this.x=o*n-r*i+t.x,this.y=o*i+r*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class de{constructor(t,e,n,i,o,r,a,l,h){de.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,i,o,r,a,l,h)}set(t,e,n,i,o,r,a,l,h){const c=this.elements;return c[0]=t,c[1]=i,c[2]=a,c[3]=e,c[4]=o,c[5]=l,c[6]=n,c[7]=r,c[8]=h,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,i=e.elements,o=this.elements,r=n[0],a=n[3],l=n[6],h=n[1],c=n[4],d=n[7],u=n[2],p=n[5],f=n[8],v=i[0],m=i[3],g=i[6],w=i[1],y=i[4],x=i[7],b=i[2],M=i[5],S=i[8];return o[0]=r*v+a*w+l*b,o[3]=r*m+a*y+l*M,o[6]=r*g+a*x+l*S,o[1]=h*v+c*w+d*b,o[4]=h*m+c*y+d*M,o[7]=h*g+c*x+d*S,o[2]=u*v+p*w+f*b,o[5]=u*m+p*y+f*M,o[8]=u*g+p*x+f*S,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[1],i=t[2],o=t[3],r=t[4],a=t[5],l=t[6],h=t[7],c=t[8];return e*r*c-e*a*h-n*o*c+n*a*l+i*o*h-i*r*l}invert(){const t=this.elements,e=t[0],n=t[1],i=t[2],o=t[3],r=t[4],a=t[5],l=t[6],h=t[7],c=t[8],d=c*r-a*h,u=a*l-c*o,p=h*o-r*l,f=e*d+n*u+i*p;if(f===0)return this.set(0,0,0,0,0,0,0,0,0);const v=1/f;return t[0]=d*v,t[1]=(i*h-c*n)*v,t[2]=(a*n-i*r)*v,t[3]=u*v,t[4]=(c*e-i*l)*v,t[5]=(i*o-a*e)*v,t[6]=p*v,t[7]=(n*l-h*e)*v,t[8]=(r*e-n*o)*v,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,i,o,r,a){const l=Math.cos(o),h=Math.sin(o);return this.set(n*l,n*h,-n*(l*r+h*a)+r+t,-i*h,i*l,-i*(-h*r+l*a)+a+e,0,0,1),this}scale(t,e){return this.premultiply(Za.makeScale(t,e)),this}rotate(t){return this.premultiply(Za.makeRotation(-t)),this}translate(t,e){return this.premultiply(Za.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,n=t.elements;for(let i=0;i<9;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const Za=new de;function $u(s){for(let t=s.length-1;t>=0;--t)if(s[t]>=65535)return!0;return!1}function Ea(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function jf(){const s=Ea("canvas");return s.style.display="block",s}const Hh={};function dr(s){s in Hh||(Hh[s]=!0,console.warn(s))}function Zf(s,t,e){return new Promise(function(n,i){function o(){switch(s.clientWaitSync(t,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:i();break;case s.TIMEOUT_EXPIRED:setTimeout(o,e);break;default:n()}}setTimeout(o,e)})}function Kf(s){const t=s.elements;t[2]=.5*t[2]+.5*t[3],t[6]=.5*t[6]+.5*t[7],t[10]=.5*t[10]+.5*t[11],t[14]=.5*t[14]+.5*t[15]}function Jf(s){const t=s.elements;t[11]===-1?(t[10]=-t[10]-1,t[14]=-t[14]):(t[10]=-t[10],t[14]=-t[14]+1)}const we={enabled:!0,workingColorSpace:Gs,spaces:{},convert:function(s,t,e){return this.enabled===!1||t===e||!t||!e||(this.spaces[t].transfer===Pe&&(s.r=Wi(s.r),s.g=Wi(s.g),s.b=Wi(s.b)),this.spaces[t].primaries!==this.spaces[e].primaries&&(s.applyMatrix3(this.spaces[t].toXYZ),s.applyMatrix3(this.spaces[e].fromXYZ)),this.spaces[e].transfer===Pe&&(s.r=wo(s.r),s.g=wo(s.g),s.b=wo(s.b))),s},fromWorkingColorSpace:function(s,t){return this.convert(s,this.workingColorSpace,t)},toWorkingColorSpace:function(s,t){return this.convert(s,t,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===vi?Fa:this.spaces[s].transfer},getLuminanceCoefficients:function(s,t=this.workingColorSpace){return s.fromArray(this.spaces[t].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,t,e){return s.copy(this.spaces[t].toXYZ).multiply(this.spaces[e].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace}};function Wi(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function wo(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}const Gh=[.64,.33,.3,.6,.15,.06],Vh=[.2126,.7152,.0722],Wh=[.3127,.329],Xh=new de().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),qh=new de().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);we.define({[Gs]:{primaries:Gh,whitePoint:Wh,transfer:Fa,toXYZ:Xh,fromXYZ:qh,luminanceCoefficients:Vh,workingColorSpaceConfig:{unpackColorSpace:Dn},outputColorSpaceConfig:{drawingBufferColorSpace:Dn}},[Dn]:{primaries:Gh,whitePoint:Wh,transfer:Pe,toXYZ:Xh,fromXYZ:qh,luminanceCoefficients:Vh,outputColorSpaceConfig:{drawingBufferColorSpace:Dn}}});let js;class Qf{static getDataURL(t){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let e;if(t instanceof HTMLCanvasElement)e=t;else{js===void 0&&(js=Ea("canvas")),js.width=t.width,js.height=t.height;const n=js.getContext("2d");t instanceof ImageData?n.putImageData(t,0,0):n.drawImage(t,0,0,t.width,t.height),e=js}return e.width>2048||e.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",t),e.toDataURL("image/jpeg",.6)):e.toDataURL("image/png")}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=Ea("canvas");e.width=t.width,e.height=t.height;const n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);const i=n.getImageData(0,0,t.width,t.height),o=i.data;for(let r=0;r<o.length;r++)o[r]=Wi(o[r]/255)*255;return n.putImageData(i,0,0),e}else if(t.data){const e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Wi(e[n]/255)*255):e[n]=Wi(e[n]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let tp=0;class ju{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:tp++}),this.uuid=Io(),this.data=t,this.dataReady=!0,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let o;if(Array.isArray(i)){o=[];for(let r=0,a=i.length;r<a;r++)i[r].isDataTexture?o.push(Ka(i[r].image)):o.push(Ka(i[r]))}else o=Ka(i);n.url=o}return e||(t.images[this.uuid]=n),n}}function Ka(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?Qf.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let ep=0;class An extends Do{constructor(t=An.DEFAULT_IMAGE,e=An.DEFAULT_MAPPING,n=Qe,i=Qe,o=ye,r=Bi,a=En,l=ti,h=An.DEFAULT_ANISOTROPY,c=vi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:ep++}),this.uuid=Io(),this.name="",this.source=new ju(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=o,this.minFilter=r,this.anisotropy=h,this.format=a,this.internalFormat=null,this.type=l,this.offset=new Rt(0,0),this.repeat=new Rt(1,1),this.center=new Rt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new de,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=c,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Nu)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case So:t.x=t.x-Math.floor(t.x);break;case Qe:t.x=t.x<0?0:1;break;case hc:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case So:t.y=t.y-Math.floor(t.y);break;case Qe:t.y=t.y<0?0:1;break;case hc:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}An.DEFAULT_IMAGE=null;An.DEFAULT_MAPPING=Nu;An.DEFAULT_ANISOTROPY=1;class ze{constructor(t=0,e=0,n=0,i=1){ze.prototype.isVector4=!0,this.x=t,this.y=e,this.z=n,this.w=i}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,i){return this.x=t,this.y=e,this.z=n,this.w=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,n=this.y,i=this.z,o=this.w,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*i+r[12]*o,this.y=r[1]*e+r[5]*n+r[9]*i+r[13]*o,this.z=r[2]*e+r[6]*n+r[10]*i+r[14]*o,this.w=r[3]*e+r[7]*n+r[11]*i+r[15]*o,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,i,o;const l=t.elements,h=l[0],c=l[4],d=l[8],u=l[1],p=l[5],f=l[9],v=l[2],m=l[6],g=l[10];if(Math.abs(c-u)<.01&&Math.abs(d-v)<.01&&Math.abs(f-m)<.01){if(Math.abs(c+u)<.1&&Math.abs(d+v)<.1&&Math.abs(f+m)<.1&&Math.abs(h+p+g-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const y=(h+1)/2,x=(p+1)/2,b=(g+1)/2,M=(c+u)/4,S=(d+v)/4,T=(f+m)/4;return y>x&&y>b?y<.01?(n=0,i=.707106781,o=.707106781):(n=Math.sqrt(y),i=M/n,o=S/n):x>b?x<.01?(n=.707106781,i=0,o=.707106781):(i=Math.sqrt(x),n=M/i,o=T/i):b<.01?(n=.707106781,i=.707106781,o=0):(o=Math.sqrt(b),n=S/o,i=T/o),this.set(n,i,o,e),this}let w=Math.sqrt((m-f)*(m-f)+(d-v)*(d-v)+(u-c)*(u-c));return Math.abs(w)<.001&&(w=1),this.x=(m-f)/w,this.y=(d-v)/w,this.z=(u-c)/w,this.w=Math.acos((h+p+g-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this.w=Math.max(t.w,Math.min(e.w,this.w)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this.w=Math.max(t,Math.min(e,this.w)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class np extends Do{constructor(t=1,e=1,n={}){super(),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=1,this.scissor=new ze(0,0,t,e),this.scissorTest=!1,this.viewport=new ze(0,0,t,e);const i={width:t,height:e,depth:1};n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:ye,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},n);const o=new An(i,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace);o.flipY=!1,o.generateMipmaps=n.generateMipmaps,o.internalFormat=n.internalFormat,this.textures=[];const r=n.count;for(let a=0;a<r;a++)this.textures[a]=o.clone(),this.textures[a].isRenderTargetTexture=!0;this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.depthTexture=n.depthTexture,this.samples=n.samples}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let i=0,o=this.textures.length;i<o;i++)this.textures[i].image.width=t,this.textures[i].image.height=e,this.textures[i].image.depth=n;this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let n=0,i=t.textures.length;n<i;n++)this.textures[n]=t.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0;const e=Object.assign({},t.texture.image);return this.texture.source=new ju(e),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class vn extends np{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}}class Zu extends An{constructor(t=null,e=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=Nn,this.minFilter=Nn,this.wrapR=Qe,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class Ku extends An{constructor(t=null,e=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=Nn,this.minFilter=Nn,this.wrapR=Qe,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Xe{constructor(t=0,e=0,n=0,i=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=i}static slerpFlat(t,e,n,i,o,r,a){let l=n[i+0],h=n[i+1],c=n[i+2],d=n[i+3];const u=o[r+0],p=o[r+1],f=o[r+2],v=o[r+3];if(a===0){t[e+0]=l,t[e+1]=h,t[e+2]=c,t[e+3]=d;return}if(a===1){t[e+0]=u,t[e+1]=p,t[e+2]=f,t[e+3]=v;return}if(d!==v||l!==u||h!==p||c!==f){let m=1-a;const g=l*u+h*p+c*f+d*v,w=g>=0?1:-1,y=1-g*g;if(y>Number.EPSILON){const b=Math.sqrt(y),M=Math.atan2(b,g*w);m=Math.sin(m*M)/b,a=Math.sin(a*M)/b}const x=a*w;if(l=l*m+u*x,h=h*m+p*x,c=c*m+f*x,d=d*m+v*x,m===1-a){const b=1/Math.sqrt(l*l+h*h+c*c+d*d);l*=b,h*=b,c*=b,d*=b}}t[e]=l,t[e+1]=h,t[e+2]=c,t[e+3]=d}static multiplyQuaternionsFlat(t,e,n,i,o,r){const a=n[i],l=n[i+1],h=n[i+2],c=n[i+3],d=o[r],u=o[r+1],p=o[r+2],f=o[r+3];return t[e]=a*f+c*d+l*p-h*u,t[e+1]=l*f+c*u+h*d-a*p,t[e+2]=h*f+c*p+a*u-l*d,t[e+3]=c*f-a*d-l*u-h*p,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,i){return this._x=t,this._y=e,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const n=t._x,i=t._y,o=t._z,r=t._order,a=Math.cos,l=Math.sin,h=a(n/2),c=a(i/2),d=a(o/2),u=l(n/2),p=l(i/2),f=l(o/2);switch(r){case"XYZ":this._x=u*c*d+h*p*f,this._y=h*p*d-u*c*f,this._z=h*c*f+u*p*d,this._w=h*c*d-u*p*f;break;case"YXZ":this._x=u*c*d+h*p*f,this._y=h*p*d-u*c*f,this._z=h*c*f-u*p*d,this._w=h*c*d+u*p*f;break;case"ZXY":this._x=u*c*d-h*p*f,this._y=h*p*d+u*c*f,this._z=h*c*f+u*p*d,this._w=h*c*d-u*p*f;break;case"ZYX":this._x=u*c*d-h*p*f,this._y=h*p*d+u*c*f,this._z=h*c*f-u*p*d,this._w=h*c*d+u*p*f;break;case"YZX":this._x=u*c*d+h*p*f,this._y=h*p*d+u*c*f,this._z=h*c*f-u*p*d,this._w=h*c*d-u*p*f;break;case"XZY":this._x=u*c*d-h*p*f,this._y=h*p*d-u*c*f,this._z=h*c*f+u*p*d,this._w=h*c*d+u*p*f;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+r)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const n=e/2,i=Math.sin(n);return this._x=t.x*i,this._y=t.y*i,this._z=t.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,n=e[0],i=e[4],o=e[8],r=e[1],a=e[5],l=e[9],h=e[2],c=e[6],d=e[10],u=n+a+d;if(u>0){const p=.5/Math.sqrt(u+1);this._w=.25/p,this._x=(c-l)*p,this._y=(o-h)*p,this._z=(r-i)*p}else if(n>a&&n>d){const p=2*Math.sqrt(1+n-a-d);this._w=(c-l)/p,this._x=.25*p,this._y=(i+r)/p,this._z=(o+h)/p}else if(a>d){const p=2*Math.sqrt(1+a-n-d);this._w=(o-h)/p,this._x=(i+r)/p,this._y=.25*p,this._z=(l+c)/p}else{const p=2*Math.sqrt(1+d-n-a);this._w=(r-i)/p,this._x=(o+h)/p,this._y=(l+c)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<Number.EPSILON?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Je(this.dot(t),-1,1)))}rotateTowards(t,e){const n=this.angleTo(t);if(n===0)return this;const i=Math.min(1,e/n);return this.slerp(t,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const n=t._x,i=t._y,o=t._z,r=t._w,a=e._x,l=e._y,h=e._z,c=e._w;return this._x=n*c+r*a+i*h-o*l,this._y=i*c+r*l+o*a-n*h,this._z=o*c+r*h+n*l-i*a,this._w=r*c-n*a-i*l-o*h,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);const n=this._x,i=this._y,o=this._z,r=this._w;let a=r*t._w+n*t._x+i*t._y+o*t._z;if(a<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,a=-a):this.copy(t),a>=1)return this._w=r,this._x=n,this._y=i,this._z=o,this;const l=1-a*a;if(l<=Number.EPSILON){const p=1-e;return this._w=p*r+e*this._w,this._x=p*n+e*this._x,this._y=p*i+e*this._y,this._z=p*o+e*this._z,this.normalize(),this}const h=Math.sqrt(l),c=Math.atan2(h,a),d=Math.sin((1-e)*c)/h,u=Math.sin(e*c)/h;return this._w=r*d+this._w*u,this._x=n*d+this._x*u,this._y=i*d+this._y*u,this._z=o*d+this._z*u,this._onChangeCallback(),this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),o=Math.sqrt(n);return this.set(i*Math.sin(t),i*Math.cos(t),o*Math.sin(e),o*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class C{constructor(t=0,e=0,n=0){C.prototype.isVector3=!0,this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Yh.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Yh.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,n=this.y,i=this.z,o=t.elements;return this.x=o[0]*e+o[3]*n+o[6]*i,this.y=o[1]*e+o[4]*n+o[7]*i,this.z=o[2]*e+o[5]*n+o[8]*i,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,n=this.y,i=this.z,o=t.elements,r=1/(o[3]*e+o[7]*n+o[11]*i+o[15]);return this.x=(o[0]*e+o[4]*n+o[8]*i+o[12])*r,this.y=(o[1]*e+o[5]*n+o[9]*i+o[13])*r,this.z=(o[2]*e+o[6]*n+o[10]*i+o[14])*r,this}applyQuaternion(t){const e=this.x,n=this.y,i=this.z,o=t.x,r=t.y,a=t.z,l=t.w,h=2*(r*i-a*n),c=2*(a*e-o*i),d=2*(o*n-r*e);return this.x=e+l*h+r*d-a*c,this.y=n+l*c+a*h-o*d,this.z=i+l*d+o*c-r*h,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,n=this.y,i=this.z,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*i,this.y=o[1]*e+o[5]*n+o[9]*i,this.z=o[2]*e+o[6]*n+o[10]*i,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const n=t.x,i=t.y,o=t.z,r=e.x,a=e.y,l=e.z;return this.x=i*l-o*a,this.y=o*r-n*l,this.z=n*a-i*r,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return Ja.copy(this).projectOnVector(t),this.sub(Ja)}reflect(t){return this.sub(Ja.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(Je(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y,i=this.z-t.z;return e*e+n*n+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){const i=Math.sin(e)*t;return this.x=i*Math.sin(n),this.y=Math.cos(e)*t,this.z=i*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),i=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=i,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Ja=new C,Yh=new Xe;class Be{constructor(t=new C(1/0,1/0,1/0),e=new C(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(ni.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(ni.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=ni.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const n=t.geometry;if(n!==void 0){const o=n.getAttribute("position");if(e===!0&&o!==void 0&&t.isInstancedMesh!==!0)for(let r=0,a=o.count;r<a;r++)t.isMesh===!0?t.getVertexPosition(r,ni):ni.fromBufferAttribute(o,r),ni.applyMatrix4(t.matrixWorld),this.expandByPoint(ni);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Fr.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Fr.copy(n.boundingBox)),Fr.applyMatrix4(t.matrixWorld),this.union(Fr)}const i=t.children;for(let o=0,r=i.length;o<r;o++)this.expandByObject(i[o],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,ni),ni.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Wo),kr.subVectors(this.max,Wo),Zs.subVectors(t.a,Wo),Ks.subVectors(t.b,Wo),Js.subVectors(t.c,Wo),Zi.subVectors(Ks,Zs),Ki.subVectors(Js,Ks),gs.subVectors(Zs,Js);let e=[0,-Zi.z,Zi.y,0,-Ki.z,Ki.y,0,-gs.z,gs.y,Zi.z,0,-Zi.x,Ki.z,0,-Ki.x,gs.z,0,-gs.x,-Zi.y,Zi.x,0,-Ki.y,Ki.x,0,-gs.y,gs.x,0];return!Qa(e,Zs,Ks,Js,kr)||(e=[1,0,0,0,1,0,0,0,1],!Qa(e,Zs,Ks,Js,kr))?!1:(Or.crossVectors(Zi,Ki),e=[Or.x,Or.y,Or.z],Qa(e,Zs,Ks,Js,kr))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,ni).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(ni).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Ci[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Ci[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Ci[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Ci[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Ci[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Ci[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Ci[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Ci[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Ci),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}const Ci=[new C,new C,new C,new C,new C,new C,new C,new C],ni=new C,Fr=new Be,Zs=new C,Ks=new C,Js=new C,Zi=new C,Ki=new C,gs=new C,Wo=new C,kr=new C,Or=new C,vs=new C;function Qa(s,t,e,n,i){for(let o=0,r=s.length-3;o<=r;o+=3){vs.fromArray(s,o);const a=i.x*Math.abs(vs.x)+i.y*Math.abs(vs.y)+i.z*Math.abs(vs.z),l=t.dot(vs),h=e.dot(vs),c=n.dot(vs);if(Math.max(-Math.max(l,h,c),Math.min(l,h,c))>a)return!1}return!0}const ip=new Be,Xo=new C,tl=new C;class Ne{constructor(t=new C,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const n=this.center;e!==void 0?n.copy(e):ip.setFromPoints(t).getCenter(n);let i=0;for(let o=0,r=t.length;o<r;o++)i=Math.max(i,n.distanceToSquared(t[o]));return this.radius=Math.sqrt(i),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Xo.subVectors(t,this.center);const e=Xo.lengthSq();if(e>this.radius*this.radius){const n=Math.sqrt(e),i=(n-this.radius)*.5;this.center.addScaledVector(Xo,i/n),this.radius+=i}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(tl.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Xo.copy(t.center).add(tl)),this.expandByPoint(Xo.copy(t.center).sub(tl))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}}const Ri=new C,el=new C,Br=new C,Ji=new C,nl=new C,Hr=new C,il=new C;class Ju{constructor(t=new C,e=new C(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Ri)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=Ri.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Ri.copy(this.origin).addScaledVector(this.direction,e),Ri.distanceToSquared(t))}distanceSqToSegment(t,e,n,i){el.copy(t).add(e).multiplyScalar(.5),Br.copy(e).sub(t).normalize(),Ji.copy(this.origin).sub(el);const o=t.distanceTo(e)*.5,r=-this.direction.dot(Br),a=Ji.dot(this.direction),l=-Ji.dot(Br),h=Ji.lengthSq(),c=Math.abs(1-r*r);let d,u,p,f;if(c>0)if(d=r*l-a,u=r*a-l,f=o*c,d>=0)if(u>=-f)if(u<=f){const v=1/c;d*=v,u*=v,p=d*(d+r*u+2*a)+u*(r*d+u+2*l)+h}else u=o,d=Math.max(0,-(r*u+a)),p=-d*d+u*(u+2*l)+h;else u=-o,d=Math.max(0,-(r*u+a)),p=-d*d+u*(u+2*l)+h;else u<=-f?(d=Math.max(0,-(-r*o+a)),u=d>0?-o:Math.min(Math.max(-o,-l),o),p=-d*d+u*(u+2*l)+h):u<=f?(d=0,u=Math.min(Math.max(-o,-l),o),p=u*(u+2*l)+h):(d=Math.max(0,-(r*o+a)),u=d>0?o:Math.min(Math.max(-o,-l),o),p=-d*d+u*(u+2*l)+h);else u=r>0?-o:o,d=Math.max(0,-(r*u+a)),p=-d*d+u*(u+2*l)+h;return n&&n.copy(this.origin).addScaledVector(this.direction,d),i&&i.copy(el).addScaledVector(Br,u),p}intersectSphere(t,e){Ri.subVectors(t.center,this.origin);const n=Ri.dot(this.direction),i=Ri.dot(Ri)-n*n,o=t.radius*t.radius;if(i>o)return null;const r=Math.sqrt(o-i),a=n-r,l=n+r;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){const n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,i,o,r,a,l;const h=1/this.direction.x,c=1/this.direction.y,d=1/this.direction.z,u=this.origin;return h>=0?(n=(t.min.x-u.x)*h,i=(t.max.x-u.x)*h):(n=(t.max.x-u.x)*h,i=(t.min.x-u.x)*h),c>=0?(o=(t.min.y-u.y)*c,r=(t.max.y-u.y)*c):(o=(t.max.y-u.y)*c,r=(t.min.y-u.y)*c),n>r||o>i||((o>n||isNaN(n))&&(n=o),(r<i||isNaN(i))&&(i=r),d>=0?(a=(t.min.z-u.z)*d,l=(t.max.z-u.z)*d):(a=(t.max.z-u.z)*d,l=(t.min.z-u.z)*d),n>l||a>i)||((a>n||n!==n)&&(n=a),(l<i||i!==i)&&(i=l),i<0)?null:this.at(n>=0?n:i,e)}intersectsBox(t){return this.intersectBox(t,Ri)!==null}intersectTriangle(t,e,n,i,o){nl.subVectors(e,t),Hr.subVectors(n,t),il.crossVectors(nl,Hr);let r=this.direction.dot(il),a;if(r>0){if(i)return null;a=1}else if(r<0)a=-1,r=-r;else return null;Ji.subVectors(this.origin,t);const l=a*this.direction.dot(Hr.crossVectors(Ji,Hr));if(l<0)return null;const h=a*this.direction.dot(nl.cross(Ji));if(h<0||l+h>r)return null;const c=-a*Ji.dot(il);return c<0?null:this.at(c/r,o)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class jt{constructor(t,e,n,i,o,r,a,l,h,c,d,u,p,f,v,m){jt.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,i,o,r,a,l,h,c,d,u,p,f,v,m)}set(t,e,n,i,o,r,a,l,h,c,d,u,p,f,v,m){const g=this.elements;return g[0]=t,g[4]=e,g[8]=n,g[12]=i,g[1]=o,g[5]=r,g[9]=a,g[13]=l,g[2]=h,g[6]=c,g[10]=d,g[14]=u,g[3]=p,g[7]=f,g[11]=v,g[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new jt().fromArray(this.elements)}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){const e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,n=t.elements,i=1/Qs.setFromMatrixColumn(t,0).length(),o=1/Qs.setFromMatrixColumn(t,1).length(),r=1/Qs.setFromMatrixColumn(t,2).length();return e[0]=n[0]*i,e[1]=n[1]*i,e[2]=n[2]*i,e[3]=0,e[4]=n[4]*o,e[5]=n[5]*o,e[6]=n[6]*o,e[7]=0,e[8]=n[8]*r,e[9]=n[9]*r,e[10]=n[10]*r,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,n=t.x,i=t.y,o=t.z,r=Math.cos(n),a=Math.sin(n),l=Math.cos(i),h=Math.sin(i),c=Math.cos(o),d=Math.sin(o);if(t.order==="XYZ"){const u=r*c,p=r*d,f=a*c,v=a*d;e[0]=l*c,e[4]=-l*d,e[8]=h,e[1]=p+f*h,e[5]=u-v*h,e[9]=-a*l,e[2]=v-u*h,e[6]=f+p*h,e[10]=r*l}else if(t.order==="YXZ"){const u=l*c,p=l*d,f=h*c,v=h*d;e[0]=u+v*a,e[4]=f*a-p,e[8]=r*h,e[1]=r*d,e[5]=r*c,e[9]=-a,e[2]=p*a-f,e[6]=v+u*a,e[10]=r*l}else if(t.order==="ZXY"){const u=l*c,p=l*d,f=h*c,v=h*d;e[0]=u-v*a,e[4]=-r*d,e[8]=f+p*a,e[1]=p+f*a,e[5]=r*c,e[9]=v-u*a,e[2]=-r*h,e[6]=a,e[10]=r*l}else if(t.order==="ZYX"){const u=r*c,p=r*d,f=a*c,v=a*d;e[0]=l*c,e[4]=f*h-p,e[8]=u*h+v,e[1]=l*d,e[5]=v*h+u,e[9]=p*h-f,e[2]=-h,e[6]=a*l,e[10]=r*l}else if(t.order==="YZX"){const u=r*l,p=r*h,f=a*l,v=a*h;e[0]=l*c,e[4]=v-u*d,e[8]=f*d+p,e[1]=d,e[5]=r*c,e[9]=-a*c,e[2]=-h*c,e[6]=p*d+f,e[10]=u-v*d}else if(t.order==="XZY"){const u=r*l,p=r*h,f=a*l,v=a*h;e[0]=l*c,e[4]=-d,e[8]=h*c,e[1]=u*d+v,e[5]=r*c,e[9]=p*d-f,e[2]=f*d-p,e[6]=a*c,e[10]=v*d+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(sp,t,op)}lookAt(t,e,n){const i=this.elements;return Gn.subVectors(t,e),Gn.lengthSq()===0&&(Gn.z=1),Gn.normalize(),Qi.crossVectors(n,Gn),Qi.lengthSq()===0&&(Math.abs(n.z)===1?Gn.x+=1e-4:Gn.z+=1e-4,Gn.normalize(),Qi.crossVectors(n,Gn)),Qi.normalize(),Gr.crossVectors(Gn,Qi),i[0]=Qi.x,i[4]=Gr.x,i[8]=Gn.x,i[1]=Qi.y,i[5]=Gr.y,i[9]=Gn.y,i[2]=Qi.z,i[6]=Gr.z,i[10]=Gn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,i=e.elements,o=this.elements,r=n[0],a=n[4],l=n[8],h=n[12],c=n[1],d=n[5],u=n[9],p=n[13],f=n[2],v=n[6],m=n[10],g=n[14],w=n[3],y=n[7],x=n[11],b=n[15],M=i[0],S=i[4],T=i[8],_=i[12],E=i[1],A=i[5],U=i[9],F=i[13],I=i[2],B=i[6],k=i[10],P=i[14],H=i[3],G=i[7],N=i[11],$=i[15];return o[0]=r*M+a*E+l*I+h*H,o[4]=r*S+a*A+l*B+h*G,o[8]=r*T+a*U+l*k+h*N,o[12]=r*_+a*F+l*P+h*$,o[1]=c*M+d*E+u*I+p*H,o[5]=c*S+d*A+u*B+p*G,o[9]=c*T+d*U+u*k+p*N,o[13]=c*_+d*F+u*P+p*$,o[2]=f*M+v*E+m*I+g*H,o[6]=f*S+v*A+m*B+g*G,o[10]=f*T+v*U+m*k+g*N,o[14]=f*_+v*F+m*P+g*$,o[3]=w*M+y*E+x*I+b*H,o[7]=w*S+y*A+x*B+b*G,o[11]=w*T+y*U+x*k+b*N,o[15]=w*_+y*F+x*P+b*$,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[4],i=t[8],o=t[12],r=t[1],a=t[5],l=t[9],h=t[13],c=t[2],d=t[6],u=t[10],p=t[14],f=t[3],v=t[7],m=t[11],g=t[15];return f*(+o*l*d-i*h*d-o*a*u+n*h*u+i*a*p-n*l*p)+v*(+e*l*p-e*h*u+o*r*u-i*r*p+i*h*c-o*l*c)+m*(+e*h*d-e*a*p-o*r*d+n*r*p+o*a*c-n*h*c)+g*(-i*a*c-e*l*d+e*a*u+i*r*d-n*r*u+n*l*c)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){const i=this.elements;return t.isVector3?(i[12]=t.x,i[13]=t.y,i[14]=t.z):(i[12]=t,i[13]=e,i[14]=n),this}invert(){const t=this.elements,e=t[0],n=t[1],i=t[2],o=t[3],r=t[4],a=t[5],l=t[6],h=t[7],c=t[8],d=t[9],u=t[10],p=t[11],f=t[12],v=t[13],m=t[14],g=t[15],w=d*m*h-v*u*h+v*l*p-a*m*p-d*l*g+a*u*g,y=f*u*h-c*m*h-f*l*p+r*m*p+c*l*g-r*u*g,x=c*v*h-f*d*h+f*a*p-r*v*p-c*a*g+r*d*g,b=f*d*l-c*v*l-f*a*u+r*v*u+c*a*m-r*d*m,M=e*w+n*y+i*x+o*b;if(M===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const S=1/M;return t[0]=w*S,t[1]=(v*u*o-d*m*o-v*i*p+n*m*p+d*i*g-n*u*g)*S,t[2]=(a*m*o-v*l*o+v*i*h-n*m*h-a*i*g+n*l*g)*S,t[3]=(d*l*o-a*u*o-d*i*h+n*u*h+a*i*p-n*l*p)*S,t[4]=y*S,t[5]=(c*m*o-f*u*o+f*i*p-e*m*p-c*i*g+e*u*g)*S,t[6]=(f*l*o-r*m*o-f*i*h+e*m*h+r*i*g-e*l*g)*S,t[7]=(r*u*o-c*l*o+c*i*h-e*u*h-r*i*p+e*l*p)*S,t[8]=x*S,t[9]=(f*d*o-c*v*o-f*n*p+e*v*p+c*n*g-e*d*g)*S,t[10]=(r*v*o-f*a*o+f*n*h-e*v*h-r*n*g+e*a*g)*S,t[11]=(c*a*o-r*d*o-c*n*h+e*d*h+r*n*p-e*a*p)*S,t[12]=b*S,t[13]=(c*v*i-f*d*i+f*n*u-e*v*u-c*n*m+e*d*m)*S,t[14]=(f*a*i-r*v*i-f*n*l+e*v*l+r*n*m-e*a*m)*S,t[15]=(r*d*i-c*a*i+c*n*l-e*d*l-r*n*u+e*a*u)*S,this}scale(t){const e=this.elements,n=t.x,i=t.y,o=t.z;return e[0]*=n,e[4]*=i,e[8]*=o,e[1]*=n,e[5]*=i,e[9]*=o,e[2]*=n,e[6]*=i,e[10]*=o,e[3]*=n,e[7]*=i,e[11]*=o,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],i=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,i))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const n=Math.cos(e),i=Math.sin(e),o=1-n,r=t.x,a=t.y,l=t.z,h=o*r,c=o*a;return this.set(h*r+n,h*a-i*l,h*l+i*a,0,h*a+i*l,c*a+n,c*l-i*r,0,h*l-i*a,c*l+i*r,o*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,i,o,r){return this.set(1,n,o,0,t,1,r,0,e,i,1,0,0,0,0,1),this}compose(t,e,n){const i=this.elements,o=e._x,r=e._y,a=e._z,l=e._w,h=o+o,c=r+r,d=a+a,u=o*h,p=o*c,f=o*d,v=r*c,m=r*d,g=a*d,w=l*h,y=l*c,x=l*d,b=n.x,M=n.y,S=n.z;return i[0]=(1-(v+g))*b,i[1]=(p+x)*b,i[2]=(f-y)*b,i[3]=0,i[4]=(p-x)*M,i[5]=(1-(u+g))*M,i[6]=(m+w)*M,i[7]=0,i[8]=(f+y)*S,i[9]=(m-w)*S,i[10]=(1-(u+v))*S,i[11]=0,i[12]=t.x,i[13]=t.y,i[14]=t.z,i[15]=1,this}decompose(t,e,n){const i=this.elements;let o=Qs.set(i[0],i[1],i[2]).length();const r=Qs.set(i[4],i[5],i[6]).length(),a=Qs.set(i[8],i[9],i[10]).length();this.determinant()<0&&(o=-o),t.x=i[12],t.y=i[13],t.z=i[14],ii.copy(this);const h=1/o,c=1/r,d=1/a;return ii.elements[0]*=h,ii.elements[1]*=h,ii.elements[2]*=h,ii.elements[4]*=c,ii.elements[5]*=c,ii.elements[6]*=c,ii.elements[8]*=d,ii.elements[9]*=d,ii.elements[10]*=d,e.setFromRotationMatrix(ii),n.x=o,n.y=r,n.z=a,this}makePerspective(t,e,n,i,o,r,a=Hi){const l=this.elements,h=2*o/(e-t),c=2*o/(n-i),d=(e+t)/(e-t),u=(n+i)/(n-i);let p,f;if(a===Hi)p=-(r+o)/(r-o),f=-2*r*o/(r-o);else if(a===Sa)p=-r/(r-o),f=-r*o/(r-o);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=h,l[4]=0,l[8]=d,l[12]=0,l[1]=0,l[5]=c,l[9]=u,l[13]=0,l[2]=0,l[6]=0,l[10]=p,l[14]=f,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,n,i,o,r,a=Hi){const l=this.elements,h=1/(e-t),c=1/(n-i),d=1/(r-o),u=(e+t)*h,p=(n+i)*c;let f,v;if(a===Hi)f=(r+o)*d,v=-2*d;else if(a===Sa)f=o*d,v=-1*d;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=2*h,l[4]=0,l[8]=0,l[12]=-u,l[1]=0,l[5]=2*c,l[9]=0,l[13]=-p,l[2]=0,l[6]=0,l[10]=v,l[14]=-f,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){const e=this.elements,n=t.elements;for(let i=0;i<16;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}}const Qs=new C,ii=new jt,sp=new C(0,0,0),op=new C(1,1,1),Qi=new C,Gr=new C,Gn=new C,$h=new jt,jh=new Xe;class He{constructor(t=0,e=0,n=0,i=He.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=i}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,i=this._order){return this._x=t,this._y=e,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){const i=t.elements,o=i[0],r=i[4],a=i[8],l=i[1],h=i[5],c=i[9],d=i[2],u=i[6],p=i[10];switch(e){case"XYZ":this._y=Math.asin(Je(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-c,p),this._z=Math.atan2(-r,o)):(this._x=Math.atan2(u,h),this._z=0);break;case"YXZ":this._x=Math.asin(-Je(c,-1,1)),Math.abs(c)<.9999999?(this._y=Math.atan2(a,p),this._z=Math.atan2(l,h)):(this._y=Math.atan2(-d,o),this._z=0);break;case"ZXY":this._x=Math.asin(Je(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,p),this._z=Math.atan2(-r,h)):(this._y=0,this._z=Math.atan2(l,o));break;case"ZYX":this._y=Math.asin(-Je(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,p),this._z=Math.atan2(l,o)):(this._x=0,this._z=Math.atan2(-r,h));break;case"YZX":this._z=Math.asin(Je(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-c,h),this._y=Math.atan2(-d,o)):(this._x=0,this._y=Math.atan2(a,p));break;case"XZY":this._z=Math.asin(-Je(r,-1,1)),Math.abs(r)<.9999999?(this._x=Math.atan2(u,h),this._y=Math.atan2(a,o)):(this._x=Math.atan2(-c,p),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return $h.makeRotationFromQuaternion(t),this.setFromRotationMatrix($h,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return jh.setFromEuler(this),this.setFromQuaternion(jh,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}He.DEFAULT_ORDER="XYZ";class Qu{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let rp=0;const Zh=new C,to=new Xe,Pi=new jt,Vr=new C,qo=new C,ap=new C,lp=new Xe,Kh=new C(1,0,0),Jh=new C(0,1,0),Qh=new C(0,0,1),t0={type:"added"},cp={type:"removed"},eo={type:"childadded",child:null},sl={type:"childremoved",child:null};class wn extends Do{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:rp++}),this.uuid=Io(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=wn.DEFAULT_UP.clone();const t=new C,e=new He,n=new Xe,i=new C(1,1,1);function o(){n.setFromEuler(e,!1)}function r(){e.setFromQuaternion(n,void 0,!1)}e._onChange(o),n._onChange(r),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new jt},normalMatrix:{value:new de}}),this.matrix=new jt,this.matrixWorld=new jt,this.matrixAutoUpdate=wn.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=wn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Qu,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return to.setFromAxisAngle(t,e),this.quaternion.multiply(to),this}rotateOnWorldAxis(t,e){return to.setFromAxisAngle(t,e),this.quaternion.premultiply(to),this}rotateX(t){return this.rotateOnAxis(Kh,t)}rotateY(t){return this.rotateOnAxis(Jh,t)}rotateZ(t){return this.rotateOnAxis(Qh,t)}translateOnAxis(t,e){return Zh.copy(t).applyQuaternion(this.quaternion),this.position.add(Zh.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Kh,t)}translateY(t){return this.translateOnAxis(Jh,t)}translateZ(t){return this.translateOnAxis(Qh,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Pi.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?Vr.copy(t):Vr.set(t,e,n);const i=this.parent;this.updateWorldMatrix(!0,!1),qo.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Pi.lookAt(qo,Vr,this.up):Pi.lookAt(Vr,qo,this.up),this.quaternion.setFromRotationMatrix(Pi),i&&(Pi.extractRotation(i.matrixWorld),to.setFromRotationMatrix(Pi),this.quaternion.premultiply(to.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(t0),eo.child=t,this.dispatchEvent(eo),eo.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(cp),sl.child=t,this.dispatchEvent(sl),sl.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Pi.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Pi.multiply(t.parent.matrixWorld)),t.applyMatrix4(Pi),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(t0),eo.child=t,this.dispatchEvent(eo),eo.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,i=this.children.length;n<i;n++){const r=this.children[n].getObjectByProperty(t,e);if(r!==void 0)return r}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);const i=this.children;for(let o=0,r=i.length;o<r;o++)i[o].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(qo,t,ap),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(qo,lp,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e){const n=this.parent;if(t===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){const i=this.children;for(let o=0,r=i.length;o<r;o++)i[o].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.visibility=this._visibility,i.active=this._active,i.bounds=this._bounds.map(a=>({boxInitialized:a.boxInitialized,boxMin:a.box.min.toArray(),boxMax:a.box.max.toArray(),sphereInitialized:a.sphereInitialized,sphereRadius:a.sphere.radius,sphereCenter:a.sphere.center.toArray()})),i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.geometryCount=this._geometryCount,i.matricesTexture=this._matricesTexture.toJSON(t),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(i.boundingSphere={center:i.boundingSphere.center.toArray(),radius:i.boundingSphere.radius}),this.boundingBox!==null&&(i.boundingBox={min:i.boundingBox.min.toArray(),max:i.boundingBox.max.toArray()}));function o(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=o(t.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let h=0,c=l.length;h<c;h++){const d=l[h];o(t.shapes,d)}else o(t.shapes,l)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(o(t.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,h=this.material.length;l<h;l++)a.push(o(t.materials,this.material[l]));i.material=a}else i.material=o(t.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];i.animations.push(o(t.animations,l))}}if(e){const a=r(t.geometries),l=r(t.materials),h=r(t.textures),c=r(t.images),d=r(t.shapes),u=r(t.skeletons),p=r(t.animations),f=r(t.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),h.length>0&&(n.textures=h),c.length>0&&(n.images=c),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),p.length>0&&(n.animations=p),f.length>0&&(n.nodes=f)}return n.object=i,n;function r(a){const l=[];for(const h in a){const c=a[h];delete c.metadata,l.push(c)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){const i=t.children[n];this.add(i.clone())}return this}}wn.DEFAULT_UP=new C(0,1,0);wn.DEFAULT_MATRIX_AUTO_UPDATE=!0;wn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const si=new C,Li=new C,ol=new C,Di=new C,no=new C,io=new C,e0=new C,rl=new C,al=new C,ll=new C,cl=new ze,hl=new ze,ul=new ze;class ai{constructor(t=new C,e=new C,n=new C){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,i){i.subVectors(n,e),si.subVectors(t,e),i.cross(si);const o=i.lengthSq();return o>0?i.multiplyScalar(1/Math.sqrt(o)):i.set(0,0,0)}static getBarycoord(t,e,n,i,o){si.subVectors(i,e),Li.subVectors(n,e),ol.subVectors(t,e);const r=si.dot(si),a=si.dot(Li),l=si.dot(ol),h=Li.dot(Li),c=Li.dot(ol),d=r*h-a*a;if(d===0)return o.set(0,0,0),null;const u=1/d,p=(h*l-a*c)*u,f=(r*c-a*l)*u;return o.set(1-p-f,f,p)}static containsPoint(t,e,n,i){return this.getBarycoord(t,e,n,i,Di)===null?!1:Di.x>=0&&Di.y>=0&&Di.x+Di.y<=1}static getInterpolation(t,e,n,i,o,r,a,l){return this.getBarycoord(t,e,n,i,Di)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(o,Di.x),l.addScaledVector(r,Di.y),l.addScaledVector(a,Di.z),l)}static getInterpolatedAttribute(t,e,n,i,o,r){return cl.setScalar(0),hl.setScalar(0),ul.setScalar(0),cl.fromBufferAttribute(t,e),hl.fromBufferAttribute(t,n),ul.fromBufferAttribute(t,i),r.setScalar(0),r.addScaledVector(cl,o.x),r.addScaledVector(hl,o.y),r.addScaledVector(ul,o.z),r}static isFrontFacing(t,e,n,i){return si.subVectors(n,e),Li.subVectors(t,e),si.cross(Li).dot(i)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,i){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[i]),this}setFromAttributeAndIndices(t,e,n,i){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,i),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return si.subVectors(this.c,this.b),Li.subVectors(this.a,this.b),si.cross(Li).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return ai.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return ai.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,i,o){return ai.getInterpolation(t,this.a,this.b,this.c,e,n,i,o)}containsPoint(t){return ai.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return ai.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const n=this.a,i=this.b,o=this.c;let r,a;no.subVectors(i,n),io.subVectors(o,n),rl.subVectors(t,n);const l=no.dot(rl),h=io.dot(rl);if(l<=0&&h<=0)return e.copy(n);al.subVectors(t,i);const c=no.dot(al),d=io.dot(al);if(c>=0&&d<=c)return e.copy(i);const u=l*d-c*h;if(u<=0&&l>=0&&c<=0)return r=l/(l-c),e.copy(n).addScaledVector(no,r);ll.subVectors(t,o);const p=no.dot(ll),f=io.dot(ll);if(f>=0&&p<=f)return e.copy(o);const v=p*h-l*f;if(v<=0&&h>=0&&f<=0)return a=h/(h-f),e.copy(n).addScaledVector(io,a);const m=c*f-p*d;if(m<=0&&d-c>=0&&p-f>=0)return e0.subVectors(o,i),a=(d-c)/(d-c+(p-f)),e.copy(i).addScaledVector(e0,a);const g=1/(m+v+u);return r=v*g,a=u*g,e.copy(n).addScaledVector(no,r).addScaledVector(io,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const td={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ts={h:0,s:0,l:0},Wr={h:0,s:0,l:0};function dl(s,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?s+(t-s)*6*e:e<1/2?t:e<2/3?s+(t-s)*6*(2/3-e):s}class Vt{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){const i=t;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Dn){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,we.toWorkingColorSpace(this,e),this}setRGB(t,e,n,i=we.workingColorSpace){return this.r=t,this.g=e,this.b=n,we.toWorkingColorSpace(this,i),this}setHSL(t,e,n,i=we.workingColorSpace){if(t=Qc(t,1),e=Je(e,0,1),n=Je(n,0,1),e===0)this.r=this.g=this.b=n;else{const o=n<=.5?n*(1+e):n+e-n*e,r=2*n-o;this.r=dl(r,o,t+1/3),this.g=dl(r,o,t),this.b=dl(r,o,t-1/3)}return we.toWorkingColorSpace(this,i),this}setStyle(t,e=Dn){function n(o){o!==void 0&&parseFloat(o)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(t)){let o;const r=i[1],a=i[2];switch(r){case"rgb":case"rgba":if(o=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(o[4]),this.setRGB(Math.min(255,parseInt(o[1],10))/255,Math.min(255,parseInt(o[2],10))/255,Math.min(255,parseInt(o[3],10))/255,e);if(o=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(o[4]),this.setRGB(Math.min(100,parseInt(o[1],10))/100,Math.min(100,parseInt(o[2],10))/100,Math.min(100,parseInt(o[3],10))/100,e);break;case"hsl":case"hsla":if(o=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(o[4]),this.setHSL(parseFloat(o[1])/360,parseFloat(o[2])/100,parseFloat(o[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(t)){const o=i[1],r=o.length;if(r===3)return this.setRGB(parseInt(o.charAt(0),16)/15,parseInt(o.charAt(1),16)/15,parseInt(o.charAt(2),16)/15,e);if(r===6)return this.setHex(parseInt(o,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Dn){const n=td[t.toLowerCase()];return n!==void 0?this.setHex(n,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Wi(t.r),this.g=Wi(t.g),this.b=Wi(t.b),this}copyLinearToSRGB(t){return this.r=wo(t.r),this.g=wo(t.g),this.b=wo(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Dn){return we.fromWorkingColorSpace(Mn.copy(this),t),Math.round(Je(Mn.r*255,0,255))*65536+Math.round(Je(Mn.g*255,0,255))*256+Math.round(Je(Mn.b*255,0,255))}getHexString(t=Dn){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=we.workingColorSpace){we.fromWorkingColorSpace(Mn.copy(this),e);const n=Mn.r,i=Mn.g,o=Mn.b,r=Math.max(n,i,o),a=Math.min(n,i,o);let l,h;const c=(a+r)/2;if(a===r)l=0,h=0;else{const d=r-a;switch(h=c<=.5?d/(r+a):d/(2-r-a),r){case n:l=(i-o)/d+(i<o?6:0);break;case i:l=(o-n)/d+2;break;case o:l=(n-i)/d+4;break}l/=6}return t.h=l,t.s=h,t.l=c,t}getRGB(t,e=we.workingColorSpace){return we.fromWorkingColorSpace(Mn.copy(this),e),t.r=Mn.r,t.g=Mn.g,t.b=Mn.b,t}getStyle(t=Dn){we.fromWorkingColorSpace(Mn.copy(this),t);const e=Mn.r,n=Mn.g,i=Mn.b;return t!==Dn?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(t,e,n){return this.getHSL(ts),this.setHSL(ts.h+t,ts.s+e,ts.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(ts),t.getHSL(Wr);const n=vr(ts.h,Wr.h,e),i=vr(ts.s,Wr.s,e),o=vr(ts.l,Wr.l,e);return this.setHSL(n,i,o),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,n=this.g,i=this.b,o=t.elements;return this.r=o[0]*e+o[3]*n+o[6]*i,this.g=o[1]*e+o[4]*n+o[7]*i,this.b=o[2]*e+o[5]*n+o[8]*i,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Mn=new Vt;Vt.NAMES=td;let hp=0;class zo extends Do{static get type(){return"Material"}get type(){return this.constructor.type}set type(t){}constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:hp++}),this.uuid=Io(),this.name="",this.blending=Gi,this.side=Yi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Ql,this.blendDst=tc,this.blendEquation=Ps,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Vt(0,0,0),this.blendAlpha=0,this.depthFunc=_o,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Uh,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=$s,this.stencilZFail=$s,this.stencilZPass=$s,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const n=t[e];if(n===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}const i=this[e];if(i===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Gi&&(n.blending=this.blending),this.side!==Yi&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Ql&&(n.blendSrc=this.blendSrc),this.blendDst!==tc&&(n.blendDst=this.blendDst),this.blendEquation!==Ps&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==_o&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Uh&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==$s&&(n.stencilFail=this.stencilFail),this.stencilZFail!==$s&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==$s&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(o){const r=[];for(const a in o){const l=o[a];delete l.metadata,r.push(l)}return r}if(e){const o=i(t.textures),r=i(t.images);o.length>0&&(n.textures=o),r.length>0&&(n.images=r)}return n}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let n=null;if(e!==null){const i=e.length;n=new Array(i);for(let o=0;o!==i;++o)n[o]=e[o].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class th extends zo{static get type(){return"MeshBasicMaterial"}constructor(t){super(),this.isMeshBasicMaterial=!0,this.color=new Vt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new He,this.combine=zu,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const Oi=up();function up(){const s=new ArrayBuffer(4),t=new Float32Array(s),e=new Uint32Array(s),n=new Uint32Array(512),i=new Uint32Array(512);for(let l=0;l<256;++l){const h=l-127;h<-27?(n[l]=0,n[l|256]=32768,i[l]=24,i[l|256]=24):h<-14?(n[l]=1024>>-h-14,n[l|256]=1024>>-h-14|32768,i[l]=-h-1,i[l|256]=-h-1):h<=15?(n[l]=h+15<<10,n[l|256]=h+15<<10|32768,i[l]=13,i[l|256]=13):h<128?(n[l]=31744,n[l|256]=64512,i[l]=24,i[l|256]=24):(n[l]=31744,n[l|256]=64512,i[l]=13,i[l|256]=13)}const o=new Uint32Array(2048),r=new Uint32Array(64),a=new Uint32Array(64);for(let l=1;l<1024;++l){let h=l<<13,c=0;for(;!(h&8388608);)h<<=1,c-=8388608;h&=-8388609,c+=947912704,o[l]=h|c}for(let l=1024;l<2048;++l)o[l]=939524096+(l-1024<<13);for(let l=1;l<31;++l)r[l]=l<<23;r[31]=1199570944,r[32]=2147483648;for(let l=33;l<63;++l)r[l]=2147483648+(l-32<<23);r[63]=3347054592;for(let l=1;l<64;++l)l!==32&&(a[l]=1024);return{floatView:t,uint32View:e,baseTable:n,shiftTable:i,mantissaTable:o,exponentTable:r,offsetTable:a}}function dp(s){Math.abs(s)>65504&&console.warn("THREE.DataUtils.toHalfFloat(): Value out of range."),s=Je(s,-65504,65504),Oi.floatView[0]=s;const t=Oi.uint32View[0],e=t>>23&511;return Oi.baseTable[e]+((t&8388607)>>Oi.shiftTable[e])}function fp(s){const t=s>>10;return Oi.uint32View[0]=Oi.mantissaTable[Oi.offsetTable[t]+(s&1023)]+Oi.exponentTable[t],Oi.floatView[0]}const pp={toHalfFloat:dp,fromHalfFloat:fp},Ze=new C,Xr=new Rt;class _e{constructor(t,e,n=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=Fh,this.updateRanges=[],this.gpuType=$n,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let i=0,o=this.itemSize;i<o;i++)this.array[t+i]=e.array[n+i];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)Xr.fromBufferAttribute(this,e),Xr.applyMatrix3(t),this.setXY(e,Xr.x,Xr.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)Ze.fromBufferAttribute(this,e),Ze.applyMatrix3(t),this.setXYZ(e,Ze.x,Ze.y,Ze.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)Ze.fromBufferAttribute(this,e),Ze.applyMatrix4(t),this.setXYZ(e,Ze.x,Ze.y,Ze.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Ze.fromBufferAttribute(this,e),Ze.applyNormalMatrix(t),this.setXYZ(e,Ze.x,Ze.y,Ze.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Ze.fromBufferAttribute(this,e),Ze.transformDirection(t),this.setXYZ(e,Ze.x,Ze.y,Ze.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=uo(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=Pn(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=uo(e,this.array)),e}setX(t,e){return this.normalized&&(e=Pn(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=uo(e,this.array)),e}setY(t,e){return this.normalized&&(e=Pn(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=uo(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Pn(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=uo(e,this.array)),e}setW(t,e){return this.normalized&&(e=Pn(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=Pn(e,this.array),n=Pn(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,i){return t*=this.itemSize,this.normalized&&(e=Pn(e,this.array),n=Pn(n,this.array),i=Pn(i,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this}setXYZW(t,e,n,i,o){return t*=this.itemSize,this.normalized&&(e=Pn(e,this.array),n=Pn(n,this.array),i=Pn(i,this.array),o=Pn(o,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this.array[t+3]=o,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==Fh&&(t.usage=this.usage),t}}class ed extends _e{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class nd extends _e{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class Mt extends _e{constructor(t,e,n){super(new Float32Array(t),e,n)}}let mp=0;const Kn=new jt,fl=new wn,so=new C,Vn=new Be,Yo=new Be,an=new C;class oe extends Do{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:mp++}),this.uuid=Io(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new($u(t)?nd:ed)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const o=new de().getNormalMatrix(t);n.applyNormalMatrix(o),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(t),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return Kn.makeRotationFromQuaternion(t),this.applyMatrix4(Kn),this}rotateX(t){return Kn.makeRotationX(t),this.applyMatrix4(Kn),this}rotateY(t){return Kn.makeRotationY(t),this.applyMatrix4(Kn),this}rotateZ(t){return Kn.makeRotationZ(t),this.applyMatrix4(Kn),this}translate(t,e,n){return Kn.makeTranslation(t,e,n),this.applyMatrix4(Kn),this}scale(t,e,n){return Kn.makeScale(t,e,n),this.applyMatrix4(Kn),this}lookAt(t){return fl.lookAt(t),fl.updateMatrix(),this.applyMatrix4(fl.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(so).negate(),this.translate(so.x,so.y,so.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const n=[];for(let i=0,o=t.length;i<o;i++){const r=t[i];n.push(r.x,r.y,r.z||0)}this.setAttribute("position",new Mt(n,3))}else{for(let n=0,i=e.count;n<i;n++){const o=t[n];e.setXYZ(n,o.x,o.y,o.z||0)}t.length>e.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Be);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new C(-1/0,-1/0,-1/0),new C(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,i=e.length;n<i;n++){const o=e[n];Vn.setFromBufferAttribute(o),this.morphTargetsRelative?(an.addVectors(this.boundingBox.min,Vn.min),this.boundingBox.expandByPoint(an),an.addVectors(this.boundingBox.max,Vn.max),this.boundingBox.expandByPoint(an)):(this.boundingBox.expandByPoint(Vn.min),this.boundingBox.expandByPoint(Vn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ne);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new C,1/0);return}if(t){const n=this.boundingSphere.center;if(Vn.setFromBufferAttribute(t),e)for(let o=0,r=e.length;o<r;o++){const a=e[o];Yo.setFromBufferAttribute(a),this.morphTargetsRelative?(an.addVectors(Vn.min,Yo.min),Vn.expandByPoint(an),an.addVectors(Vn.max,Yo.max),Vn.expandByPoint(an)):(Vn.expandByPoint(Yo.min),Vn.expandByPoint(Yo.max))}Vn.getCenter(n);let i=0;for(let o=0,r=t.count;o<r;o++)an.fromBufferAttribute(t,o),i=Math.max(i,n.distanceToSquared(an));if(e)for(let o=0,r=e.length;o<r;o++){const a=e[o],l=this.morphTargetsRelative;for(let h=0,c=a.count;h<c;h++)an.fromBufferAttribute(a,h),l&&(so.fromBufferAttribute(t,h),an.add(so)),i=Math.max(i,n.distanceToSquared(an))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=e.position,i=e.normal,o=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new _e(new Float32Array(4*n.count),4));const r=this.getAttribute("tangent"),a=[],l=[];for(let T=0;T<n.count;T++)a[T]=new C,l[T]=new C;const h=new C,c=new C,d=new C,u=new Rt,p=new Rt,f=new Rt,v=new C,m=new C;function g(T,_,E){h.fromBufferAttribute(n,T),c.fromBufferAttribute(n,_),d.fromBufferAttribute(n,E),u.fromBufferAttribute(o,T),p.fromBufferAttribute(o,_),f.fromBufferAttribute(o,E),c.sub(h),d.sub(h),p.sub(u),f.sub(u);const A=1/(p.x*f.y-f.x*p.y);isFinite(A)&&(v.copy(c).multiplyScalar(f.y).addScaledVector(d,-p.y).multiplyScalar(A),m.copy(d).multiplyScalar(p.x).addScaledVector(c,-f.x).multiplyScalar(A),a[T].add(v),a[_].add(v),a[E].add(v),l[T].add(m),l[_].add(m),l[E].add(m))}let w=this.groups;w.length===0&&(w=[{start:0,count:t.count}]);for(let T=0,_=w.length;T<_;++T){const E=w[T],A=E.start,U=E.count;for(let F=A,I=A+U;F<I;F+=3)g(t.getX(F+0),t.getX(F+1),t.getX(F+2))}const y=new C,x=new C,b=new C,M=new C;function S(T){b.fromBufferAttribute(i,T),M.copy(b);const _=a[T];y.copy(_),y.sub(b.multiplyScalar(b.dot(_))).normalize(),x.crossVectors(M,_);const A=x.dot(l[T])<0?-1:1;r.setXYZW(T,y.x,y.y,y.z,A)}for(let T=0,_=w.length;T<_;++T){const E=w[T],A=E.start,U=E.count;for(let F=A,I=A+U;F<I;F+=3)S(t.getX(F+0)),S(t.getX(F+1)),S(t.getX(F+2))}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new _e(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,p=n.count;u<p;u++)n.setXYZ(u,0,0,0);const i=new C,o=new C,r=new C,a=new C,l=new C,h=new C,c=new C,d=new C;if(t)for(let u=0,p=t.count;u<p;u+=3){const f=t.getX(u+0),v=t.getX(u+1),m=t.getX(u+2);i.fromBufferAttribute(e,f),o.fromBufferAttribute(e,v),r.fromBufferAttribute(e,m),c.subVectors(r,o),d.subVectors(i,o),c.cross(d),a.fromBufferAttribute(n,f),l.fromBufferAttribute(n,v),h.fromBufferAttribute(n,m),a.add(c),l.add(c),h.add(c),n.setXYZ(f,a.x,a.y,a.z),n.setXYZ(v,l.x,l.y,l.z),n.setXYZ(m,h.x,h.y,h.z)}else for(let u=0,p=e.count;u<p;u+=3)i.fromBufferAttribute(e,u+0),o.fromBufferAttribute(e,u+1),r.fromBufferAttribute(e,u+2),c.subVectors(r,o),d.subVectors(i,o),c.cross(d),n.setXYZ(u+0,c.x,c.y,c.z),n.setXYZ(u+1,c.x,c.y,c.z),n.setXYZ(u+2,c.x,c.y,c.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)an.fromBufferAttribute(t,e),an.normalize(),t.setXYZ(e,an.x,an.y,an.z)}toNonIndexed(){function t(a,l){const h=a.array,c=a.itemSize,d=a.normalized,u=new h.constructor(l.length*c);let p=0,f=0;for(let v=0,m=l.length;v<m;v++){a.isInterleavedBufferAttribute?p=l[v]*a.data.stride+a.offset:p=l[v]*c;for(let g=0;g<c;g++)u[f++]=h[p++]}return new _e(u,c,d)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new oe,n=this.index.array,i=this.attributes;for(const a in i){const l=i[a],h=t(l,n);e.setAttribute(a,h)}const o=this.morphAttributes;for(const a in o){const l=[],h=o[a];for(let c=0,d=h.length;c<d;c++){const u=h[c],p=t(u,n);l.push(p)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;const r=this.groups;for(let a=0,l=r.length;a<l;a++){const h=r[a];e.addGroup(h.start,h.count,h.materialIndex)}return e}toJSON(){const t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const h in l)l[h]!==void 0&&(t[h]=l[h]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const n=this.attributes;for(const l in n){const h=n[l];t.data.attributes[l]=h.toJSON(t.data)}const i={};let o=!1;for(const l in this.morphAttributes){const h=this.morphAttributes[l],c=[];for(let d=0,u=h.length;d<u;d++){const p=h[d];c.push(p.toJSON(t.data))}c.length>0&&(i[l]=c,o=!0)}o&&(t.data.morphAttributes=i,t.data.morphTargetsRelative=this.morphTargetsRelative);const r=this.groups;r.length>0&&(t.data.groups=JSON.parse(JSON.stringify(r)));const a=this.boundingSphere;return a!==null&&(t.data.boundingSphere={center:a.center.toArray(),radius:a.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const n=t.index;n!==null&&this.setIndex(n.clone(e));const i=t.attributes;for(const h in i){const c=i[h];this.setAttribute(h,c.clone(e))}const o=t.morphAttributes;for(const h in o){const c=[],d=o[h];for(let u=0,p=d.length;u<p;u++)c.push(d[u].clone(e));this.morphAttributes[h]=c}this.morphTargetsRelative=t.morphTargetsRelative;const r=t.groups;for(let h=0,c=r.length;h<c;h++){const d=r[h];this.addGroup(d.start,d.count,d.materialIndex)}const a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const n0=new jt,xs=new Ju,qr=new Ne,i0=new C,Yr=new C,$r=new C,jr=new C,pl=new C,Zr=new C,s0=new C,Kr=new C;class pe extends wn{constructor(t=new oe,e=new th){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let o=0,r=i.length;o<r;o++){const a=i[o].name||String(o);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=o}}}}getVertexPosition(t,e){const n=this.geometry,i=n.attributes.position,o=n.morphAttributes.position,r=n.morphTargetsRelative;e.fromBufferAttribute(i,t);const a=this.morphTargetInfluences;if(o&&a){Zr.set(0,0,0);for(let l=0,h=o.length;l<h;l++){const c=a[l],d=o[l];c!==0&&(pl.fromBufferAttribute(d,t),r?Zr.addScaledVector(pl,c):Zr.addScaledVector(pl.sub(e),c))}e.add(Zr)}return e}raycast(t,e){const n=this.geometry,i=this.material,o=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),qr.copy(n.boundingSphere),qr.applyMatrix4(o),xs.copy(t.ray).recast(t.near),!(qr.containsPoint(xs.origin)===!1&&(xs.intersectSphere(qr,i0)===null||xs.origin.distanceToSquared(i0)>(t.far-t.near)**2))&&(n0.copy(o).invert(),xs.copy(t.ray).applyMatrix4(n0),!(n.boundingBox!==null&&xs.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,xs)))}_computeIntersections(t,e,n){let i;const o=this.geometry,r=this.material,a=o.index,l=o.attributes.position,h=o.attributes.uv,c=o.attributes.uv1,d=o.attributes.normal,u=o.groups,p=o.drawRange;if(a!==null)if(Array.isArray(r))for(let f=0,v=u.length;f<v;f++){const m=u[f],g=r[m.materialIndex],w=Math.max(m.start,p.start),y=Math.min(a.count,Math.min(m.start+m.count,p.start+p.count));for(let x=w,b=y;x<b;x+=3){const M=a.getX(x),S=a.getX(x+1),T=a.getX(x+2);i=Jr(this,g,t,n,h,c,d,M,S,T),i&&(i.faceIndex=Math.floor(x/3),i.face.materialIndex=m.materialIndex,e.push(i))}}else{const f=Math.max(0,p.start),v=Math.min(a.count,p.start+p.count);for(let m=f,g=v;m<g;m+=3){const w=a.getX(m),y=a.getX(m+1),x=a.getX(m+2);i=Jr(this,r,t,n,h,c,d,w,y,x),i&&(i.faceIndex=Math.floor(m/3),e.push(i))}}else if(l!==void 0)if(Array.isArray(r))for(let f=0,v=u.length;f<v;f++){const m=u[f],g=r[m.materialIndex],w=Math.max(m.start,p.start),y=Math.min(l.count,Math.min(m.start+m.count,p.start+p.count));for(let x=w,b=y;x<b;x+=3){const M=x,S=x+1,T=x+2;i=Jr(this,g,t,n,h,c,d,M,S,T),i&&(i.faceIndex=Math.floor(x/3),i.face.materialIndex=m.materialIndex,e.push(i))}}else{const f=Math.max(0,p.start),v=Math.min(l.count,p.start+p.count);for(let m=f,g=v;m<g;m+=3){const w=m,y=m+1,x=m+2;i=Jr(this,r,t,n,h,c,d,w,y,x),i&&(i.faceIndex=Math.floor(m/3),e.push(i))}}}}function gp(s,t,e,n,i,o,r,a){let l;if(t.side===Tn?l=n.intersectTriangle(r,o,i,!0,a):l=n.intersectTriangle(i,o,r,t.side===Yi,a),l===null)return null;Kr.copy(a),Kr.applyMatrix4(s.matrixWorld);const h=e.ray.origin.distanceTo(Kr);return h<e.near||h>e.far?null:{distance:h,point:Kr.clone(),object:s}}function Jr(s,t,e,n,i,o,r,a,l,h){s.getVertexPosition(a,Yr),s.getVertexPosition(l,$r),s.getVertexPosition(h,jr);const c=gp(s,t,e,n,Yr,$r,jr,s0);if(c){const d=new C;ai.getBarycoord(s0,Yr,$r,jr,d),i&&(c.uv=ai.getInterpolatedAttribute(i,a,l,h,d,new Rt)),o&&(c.uv1=ai.getInterpolatedAttribute(o,a,l,h,d,new Rt)),r&&(c.normal=ai.getInterpolatedAttribute(r,a,l,h,d,new C),c.normal.dot(n.direction)>0&&c.normal.multiplyScalar(-1));const u={a,b:l,c:h,normal:new C,materialIndex:0};ai.getNormal(Yr,$r,jr,u.normal),c.face=u,c.barycoord=d}return c}class kt extends oe{constructor(t=1,e=1,n=1,i=1,o=1,r=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:i,heightSegments:o,depthSegments:r};const a=this;i=Math.floor(i),o=Math.floor(o),r=Math.floor(r);const l=[],h=[],c=[],d=[];let u=0,p=0;f("z","y","x",-1,-1,n,e,t,r,o,0),f("z","y","x",1,-1,n,e,-t,r,o,1),f("x","z","y",1,1,t,n,e,i,r,2),f("x","z","y",1,-1,t,n,-e,i,r,3),f("x","y","z",1,-1,t,e,n,i,o,4),f("x","y","z",-1,-1,t,e,-n,i,o,5),this.setIndex(l),this.setAttribute("position",new Mt(h,3)),this.setAttribute("normal",new Mt(c,3)),this.setAttribute("uv",new Mt(d,2));function f(v,m,g,w,y,x,b,M,S,T,_){const E=x/S,A=b/T,U=x/2,F=b/2,I=M/2,B=S+1,k=T+1;let P=0,H=0;const G=new C;for(let N=0;N<k;N++){const $=N*A-F;for(let W=0;W<B;W++){const et=W*E-U;G[v]=et*w,G[m]=$*y,G[g]=I,h.push(G.x,G.y,G.z),G[v]=0,G[m]=0,G[g]=M>0?1:-1,c.push(G.x,G.y,G.z),d.push(W/S),d.push(1-N/T),P+=1}}for(let N=0;N<T;N++)for(let $=0;$<S;$++){const W=u+$+B*N,et=u+$+B*(N+1),X=u+($+1)+B*(N+1),q=u+($+1)+B*N;l.push(W,et,q),l.push(et,X,q),H+=6}a.addGroup(p,H,_),p+=H,u+=P}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new kt(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function Ao(s){const t={};for(const e in s){t[e]={};for(const n in s[e]){const i=s[e][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=i.clone():Array.isArray(i)?t[e][n]=i.slice():t[e][n]=i}}return t}function Ln(s){const t={};for(let e=0;e<s.length;e++){const n=Ao(s[e]);for(const i in n)t[i]=n[i]}return t}function vp(s){const t=[];for(let e=0;e<s.length;e++)t.push(s[e].clone());return t}function id(s){const t=s.getRenderTarget();return t===null?s.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:we.workingColorSpace}const xp={clone:Ao,merge:Ln};var wp=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,yp=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Oe extends zo{static get type(){return"ShaderMaterial"}constructor(t){super(),this.isShaderMaterial=!0,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=wp,this.fragmentShader=yp,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Ao(t.uniforms),this.uniformsGroups=vp(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const i in this.uniforms){const r=this.uniforms[i].value;r&&r.isTexture?e.uniforms[i]={type:"t",value:r.toJSON(t).uuid}:r&&r.isColor?e.uniforms[i]={type:"c",value:r.getHex()}:r&&r.isVector2?e.uniforms[i]={type:"v2",value:r.toArray()}:r&&r.isVector3?e.uniforms[i]={type:"v3",value:r.toArray()}:r&&r.isVector4?e.uniforms[i]={type:"v4",value:r.toArray()}:r&&r.isMatrix3?e.uniforms[i]={type:"m3",value:r.toArray()}:r&&r.isMatrix4?e.uniforms[i]={type:"m4",value:r.toArray()}:e.uniforms[i]={value:r}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}}class sd extends wn{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new jt,this.projectionMatrix=new jt,this.projectionMatrixInverse=new jt,this.coordinateSystem=Hi}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const es=new C,o0=new Rt,r0=new Rt;class kn extends sd{constructor(t=50,e=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=Er*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(gr*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Er*2*Math.atan(Math.tan(gr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){es.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(es.x,es.y).multiplyScalar(-t/es.z),es.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(es.x,es.y).multiplyScalar(-t/es.z)}getViewSize(t,e){return this.getViewBounds(t,o0,r0),e.subVectors(r0,o0)}setViewOffset(t,e,n,i,o,r){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=o,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(gr*.5*this.fov)/this.zoom,n=2*e,i=this.aspect*n,o=-.5*i;const r=this.view;if(this.view!==null&&this.view.enabled){const l=r.fullWidth,h=r.fullHeight;o+=r.offsetX*i/l,e-=r.offsetY*n/h,i*=r.width/l,n*=r.height/h}const a=this.filmOffset;a!==0&&(o+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(o,o+i,e,e-n,t,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const oo=-90,ro=1;class _p extends wn{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new kn(oo,ro,t,e);i.layers=this.layers,this.add(i);const o=new kn(oo,ro,t,e);o.layers=this.layers,this.add(o);const r=new kn(oo,ro,t,e);r.layers=this.layers,this.add(r);const a=new kn(oo,ro,t,e);a.layers=this.layers,this.add(a);const l=new kn(oo,ro,t,e);l.layers=this.layers,this.add(l);const h=new kn(oo,ro,t,e);h.layers=this.layers,this.add(h)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[n,i,o,r,a,l]=e;for(const h of e)this.remove(h);if(t===Hi)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),o.up.set(0,0,-1),o.lookAt(0,1,0),r.up.set(0,0,1),r.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===Sa)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),o.up.set(0,0,1),o.lookAt(0,1,0),r.up.set(0,0,-1),r.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const h of e)this.add(h),h.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[o,r,a,l,h,c]=this.children,d=t.getRenderTarget(),u=t.getActiveCubeFace(),p=t.getActiveMipmapLevel(),f=t.xr.enabled;t.xr.enabled=!1;const v=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,t.setRenderTarget(n,0,i),t.render(e,o),t.setRenderTarget(n,1,i),t.render(e,r),t.setRenderTarget(n,2,i),t.render(e,a),t.setRenderTarget(n,3,i),t.render(e,l),t.setRenderTarget(n,4,i),t.render(e,h),n.texture.generateMipmaps=v,t.setRenderTarget(n,5,i),t.render(e,c),t.setRenderTarget(d,u,p),t.xr.enabled=f,n.texture.needsPMREMUpdate=!0}}class od extends An{constructor(t,e,n,i,o,r,a,l,h,c){t=t!==void 0?t:[],e=e!==void 0?e:Mo,super(t,e,n,i,o,r,a,l,h,c),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class Mp extends vn{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const n={width:t,height:t,depth:1},i=[n,n,n,n,n,n];this.texture=new od(i,e.mapping,e.wrapS,e.wrapT,e.magFilter,e.minFilter,e.format,e.type,e.anisotropy,e.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=e.generateMipmaps!==void 0?e.generateMipmaps:!1,this.texture.minFilter=e.minFilter!==void 0?e.minFilter:ye}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},i=new kt(5,5,5),o=new Oe({name:"CubemapFromEquirect",uniforms:Ao(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Tn,blending:cs});o.uniforms.tEquirect.value=e;const r=new pe(i,o),a=e.minFilter;return e.minFilter===Bi&&(e.minFilter=ye),new _p(1,10,this).update(t,r),e.minFilter=a,r.geometry.dispose(),r.material.dispose(),this}clear(t,e,n,i){const o=t.getRenderTarget();for(let r=0;r<6;r++)t.setRenderTarget(this,r),t.clear(e,n,i);t.setRenderTarget(o)}}const ml=new C,bp=new C,Sp=new de;class ls{constructor(t=new C(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,i){return this.normal.set(t,e,n),this.constant=i,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){const i=ml.subVectors(n,e).cross(bp.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(i,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const n=t.delta(ml),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const o=-(t.start.dot(this.normal)+this.constant)/i;return o<0||o>1?null:e.copy(t.start).addScaledVector(n,o)}intersectsLine(t){const e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const n=e||Sp.getNormalMatrix(t),i=this.coplanarPoint(ml).applyMatrix4(t),o=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(o),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const ws=new Ne,Qr=new C;class Us{constructor(t=new ls,e=new ls,n=new ls,i=new ls,o=new ls,r=new ls){this.planes=[t,e,n,i,o,r]}set(t,e,n,i,o,r){const a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(i),a[4].copy(o),a[5].copy(r),this}copy(t){const e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=Hi){const n=this.planes,i=t.elements,o=i[0],r=i[1],a=i[2],l=i[3],h=i[4],c=i[5],d=i[6],u=i[7],p=i[8],f=i[9],v=i[10],m=i[11],g=i[12],w=i[13],y=i[14],x=i[15];if(n[0].setComponents(l-o,u-h,m-p,x-g).normalize(),n[1].setComponents(l+o,u+h,m+p,x+g).normalize(),n[2].setComponents(l+r,u+c,m+f,x+w).normalize(),n[3].setComponents(l-r,u-c,m-f,x-w).normalize(),n[4].setComponents(l-a,u-d,m-v,x-y).normalize(),e===Hi)n[5].setComponents(l+a,u+d,m+v,x+y).normalize();else if(e===Sa)n[5].setComponents(a,d,v,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),ws.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),ws.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(ws)}intersectsSprite(t){return ws.center.set(0,0,0),ws.radius=.7071067811865476,ws.applyMatrix4(t.matrixWorld),this.intersectsSphere(ws)}intersectsSphere(t){const e=this.planes,n=t.center,i=-t.radius;for(let o=0;o<6;o++)if(e[o].distanceToPoint(n)<i)return!1;return!0}intersectsBox(t){const e=this.planes;for(let n=0;n<6;n++){const i=e[n];if(Qr.x=i.normal.x>0?t.max.x:t.min.x,Qr.y=i.normal.y>0?t.max.y:t.min.y,Qr.z=i.normal.z>0?t.max.z:t.min.z,i.distanceToPoint(Qr)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function rd(){let s=null,t=!1,e=null,n=null;function i(o,r){e(o,r),n=s.requestAnimationFrame(i)}return{start:function(){t!==!0&&e!==null&&(n=s.requestAnimationFrame(i),t=!0)},stop:function(){s.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(o){e=o},setContext:function(o){s=o}}}function Ep(s){const t=new WeakMap;function e(a,l){const h=a.array,c=a.usage,d=h.byteLength,u=s.createBuffer();s.bindBuffer(l,u),s.bufferData(l,h,c),a.onUploadCallback();let p;if(h instanceof Float32Array)p=s.FLOAT;else if(h instanceof Uint16Array)a.isFloat16BufferAttribute?p=s.HALF_FLOAT:p=s.UNSIGNED_SHORT;else if(h instanceof Int16Array)p=s.SHORT;else if(h instanceof Uint32Array)p=s.UNSIGNED_INT;else if(h instanceof Int32Array)p=s.INT;else if(h instanceof Int8Array)p=s.BYTE;else if(h instanceof Uint8Array)p=s.UNSIGNED_BYTE;else if(h instanceof Uint8ClampedArray)p=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+h);return{buffer:u,type:p,bytesPerElement:h.BYTES_PER_ELEMENT,version:a.version,size:d}}function n(a,l,h){const c=l.array,d=l.updateRanges;if(s.bindBuffer(h,a),d.length===0)s.bufferSubData(h,0,c);else{d.sort((p,f)=>p.start-f.start);let u=0;for(let p=1;p<d.length;p++){const f=d[u],v=d[p];v.start<=f.start+f.count+1?f.count=Math.max(f.count,v.start+v.count-f.start):(++u,d[u]=v)}d.length=u+1;for(let p=0,f=d.length;p<f;p++){const v=d[p];s.bufferSubData(h,v.start*c.BYTES_PER_ELEMENT,c,v.start,v.count)}l.clearUpdateRanges()}l.onUploadCallback()}function i(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function o(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=t.get(a);l&&(s.deleteBuffer(l.buffer),t.delete(a))}function r(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const c=t.get(a);(!c||c.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const h=t.get(a);if(h===void 0)t.set(a,e(a,l));else if(h.version<a.version){if(h.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(h.buffer,a,l),h.version=a.version}}return{get:i,remove:o,update:r}}class _i extends oe{constructor(t=1,e=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:i};const o=t/2,r=e/2,a=Math.floor(n),l=Math.floor(i),h=a+1,c=l+1,d=t/a,u=e/l,p=[],f=[],v=[],m=[];for(let g=0;g<c;g++){const w=g*u-r;for(let y=0;y<h;y++){const x=y*d-o;f.push(x,-w,0),v.push(0,0,1),m.push(y/a),m.push(1-g/l)}}for(let g=0;g<l;g++)for(let w=0;w<a;w++){const y=w+h*g,x=w+h*(g+1),b=w+1+h*(g+1),M=w+1+h*g;p.push(y,x,M),p.push(x,b,M)}this.setIndex(p),this.setAttribute("position",new Mt(f,3)),this.setAttribute("normal",new Mt(v,3)),this.setAttribute("uv",new Mt(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new _i(t.width,t.height,t.widthSegments,t.heightSegments)}}var Tp=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Ap=`#ifdef USE_ALPHAHASH
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
#endif`,Cp=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Rp=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Pp=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Lp=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Dp=`#ifdef USE_AOMAP
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
#endif`,Ip=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,zp=`#ifdef USE_BATCHING
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
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,Np=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Up=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Fp=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,kp=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,Op=`#ifdef USE_IRIDESCENCE
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
#endif`,Bp=`#ifdef USE_BUMPMAP
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
#endif`,Hp=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,Gp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Vp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Wp=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Xp=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,qp=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Yp=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,$p=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,jp=`#define PI 3.141592653589793
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
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
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
} // validated`,Zp=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,Kp=`vec3 transformedNormal = objectNormal;
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
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Jp=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Qp=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,tm=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,em=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,nm="gl_FragColor = linearToOutputTexel( gl_FragColor );",im=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,sm=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,om=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,rm=`#ifdef USE_ENVMAP
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
#endif`,am=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,lm=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,cm=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,hm=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,um=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,dm=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,fm=`#ifdef USE_GRADIENTMAP
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
}`,pm=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,mm=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,gm=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,vm=`uniform bool receiveShadow;
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
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
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
#endif`,xm=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
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
#endif`,wm=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,ym=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,_m=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Mm=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,bm=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
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
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
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
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
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
#endif`,Sm=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
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
		float v = 0.5 / ( gv + gl );
		return saturate(v);
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
	vec3 f0 = material.specularColor;
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
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
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
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
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
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
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
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Em=`
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
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
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
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
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
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Tm=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
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
#endif`,Am=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Cm=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Rm=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Pm=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Lm=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Dm=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Im=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,zm=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Nm=`#if defined( USE_POINTS_UV )
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
#endif`,Um=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Fm=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,km=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Om=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Bm=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Hm=`#ifdef USE_MORPHTARGETS
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
#endif`,Gm=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Vm=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
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
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Wm=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Xm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,qm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Ym=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,$m=`#ifdef USE_NORMALMAP
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
#endif`,jm=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Zm=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Km=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Jm=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Qm=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,tg=`vec3 packNormalToRGB( const in vec3 normal ) {
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
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,eg=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,ng=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,ig=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,sg=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,og=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,rg=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,ag=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
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
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
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
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
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
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,lg=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,cg=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
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
#endif`,hg=`float getShadowMask() {
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
	#if NUM_POINT_LIGHT_SHADOWS > 0
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
}`,ug=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,dg=`#ifdef USE_SKINNING
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
#endif`,fg=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,pg=`#ifdef USE_SKINNING
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
#endif`,mg=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,gg=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,vg=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,xg=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,wg=`#ifdef USE_TRANSMISSION
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
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,yg=`#ifdef USE_TRANSMISSION
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
#endif`,_g=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Mg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,bg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Sg=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Eg=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Tg=`uniform sampler2D t2D;
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
}`,Ag=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Cg=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Rg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Pg=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Lg=`#include <common>
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
}`,Dg=`#if DEPTH_PACKING == 3200
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
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,Ig=`#define DISTANCE
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
}`,zg=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,Ng=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Ug=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Fg=`uniform float scale;
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
}`,kg=`uniform vec3 diffuse;
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
}`,Og=`#include <common>
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
}`,Bg=`uniform vec3 diffuse;
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
}`,Hg=`#define LAMBERT
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
}`,Gg=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
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
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
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
}`,Vg=`#define MATCAP
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
}`,Wg=`#define MATCAP
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
}`,Xg=`#define NORMAL
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
}`,qg=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
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
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Yg=`#define PHONG
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
}`,$g=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
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
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
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
}`,jg=`#define STANDARD
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
}`,Zg=`#define STANDARD
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
#include <packing>
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
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
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
}`,Kg=`#define TOON
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
}`,Jg=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
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
}`,Qg=`uniform float size;
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
}`,t1=`uniform vec3 diffuse;
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
}`,e1=`#include <common>
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
}`,n1=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
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
}`,i1=`uniform float rotation;
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
}`,s1=`uniform vec3 diffuse;
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
}`,ae={alphahash_fragment:Tp,alphahash_pars_fragment:Ap,alphamap_fragment:Cp,alphamap_pars_fragment:Rp,alphatest_fragment:Pp,alphatest_pars_fragment:Lp,aomap_fragment:Dp,aomap_pars_fragment:Ip,batching_pars_vertex:zp,batching_vertex:Np,begin_vertex:Up,beginnormal_vertex:Fp,bsdfs:kp,iridescence_fragment:Op,bumpmap_pars_fragment:Bp,clipping_planes_fragment:Hp,clipping_planes_pars_fragment:Gp,clipping_planes_pars_vertex:Vp,clipping_planes_vertex:Wp,color_fragment:Xp,color_pars_fragment:qp,color_pars_vertex:Yp,color_vertex:$p,common:jp,cube_uv_reflection_fragment:Zp,defaultnormal_vertex:Kp,displacementmap_pars_vertex:Jp,displacementmap_vertex:Qp,emissivemap_fragment:tm,emissivemap_pars_fragment:em,colorspace_fragment:nm,colorspace_pars_fragment:im,envmap_fragment:sm,envmap_common_pars_fragment:om,envmap_pars_fragment:rm,envmap_pars_vertex:am,envmap_physical_pars_fragment:xm,envmap_vertex:lm,fog_vertex:cm,fog_pars_vertex:hm,fog_fragment:um,fog_pars_fragment:dm,gradientmap_pars_fragment:fm,lightmap_pars_fragment:pm,lights_lambert_fragment:mm,lights_lambert_pars_fragment:gm,lights_pars_begin:vm,lights_toon_fragment:wm,lights_toon_pars_fragment:ym,lights_phong_fragment:_m,lights_phong_pars_fragment:Mm,lights_physical_fragment:bm,lights_physical_pars_fragment:Sm,lights_fragment_begin:Em,lights_fragment_maps:Tm,lights_fragment_end:Am,logdepthbuf_fragment:Cm,logdepthbuf_pars_fragment:Rm,logdepthbuf_pars_vertex:Pm,logdepthbuf_vertex:Lm,map_fragment:Dm,map_pars_fragment:Im,map_particle_fragment:zm,map_particle_pars_fragment:Nm,metalnessmap_fragment:Um,metalnessmap_pars_fragment:Fm,morphinstance_vertex:km,morphcolor_vertex:Om,morphnormal_vertex:Bm,morphtarget_pars_vertex:Hm,morphtarget_vertex:Gm,normal_fragment_begin:Vm,normal_fragment_maps:Wm,normal_pars_fragment:Xm,normal_pars_vertex:qm,normal_vertex:Ym,normalmap_pars_fragment:$m,clearcoat_normal_fragment_begin:jm,clearcoat_normal_fragment_maps:Zm,clearcoat_pars_fragment:Km,iridescence_pars_fragment:Jm,opaque_fragment:Qm,packing:tg,premultiplied_alpha_fragment:eg,project_vertex:ng,dithering_fragment:ig,dithering_pars_fragment:sg,roughnessmap_fragment:og,roughnessmap_pars_fragment:rg,shadowmap_pars_fragment:ag,shadowmap_pars_vertex:lg,shadowmap_vertex:cg,shadowmask_pars_fragment:hg,skinbase_vertex:ug,skinning_pars_vertex:dg,skinning_vertex:fg,skinnormal_vertex:pg,specularmap_fragment:mg,specularmap_pars_fragment:gg,tonemapping_fragment:vg,tonemapping_pars_fragment:xg,transmission_fragment:wg,transmission_pars_fragment:yg,uv_pars_fragment:_g,uv_pars_vertex:Mg,uv_vertex:bg,worldpos_vertex:Sg,background_vert:Eg,background_frag:Tg,backgroundCube_vert:Ag,backgroundCube_frag:Cg,cube_vert:Rg,cube_frag:Pg,depth_vert:Lg,depth_frag:Dg,distanceRGBA_vert:Ig,distanceRGBA_frag:zg,equirect_vert:Ng,equirect_frag:Ug,linedashed_vert:Fg,linedashed_frag:kg,meshbasic_vert:Og,meshbasic_frag:Bg,meshlambert_vert:Hg,meshlambert_frag:Gg,meshmatcap_vert:Vg,meshmatcap_frag:Wg,meshnormal_vert:Xg,meshnormal_frag:qg,meshphong_vert:Yg,meshphong_frag:$g,meshphysical_vert:jg,meshphysical_frag:Zg,meshtoon_vert:Kg,meshtoon_frag:Jg,points_vert:Qg,points_frag:t1,shadow_vert:e1,shadow_frag:n1,sprite_vert:i1,sprite_frag:s1},Ut={common:{diffuse:{value:new Vt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new de},alphaMap:{value:null},alphaMapTransform:{value:new de},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new de}},envmap:{envMap:{value:null},envMapRotation:{value:new de},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new de}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new de}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new de},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new de},normalScale:{value:new Rt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new de},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new de}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new de}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new de}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Vt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Vt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new de},alphaTest:{value:0},uvTransform:{value:new de}},sprite:{diffuse:{value:new Vt(16777215)},opacity:{value:1},center:{value:new Rt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new de},alphaMap:{value:null},alphaMapTransform:{value:new de},alphaTest:{value:0}}},mi={basic:{uniforms:Ln([Ut.common,Ut.specularmap,Ut.envmap,Ut.aomap,Ut.lightmap,Ut.fog]),vertexShader:ae.meshbasic_vert,fragmentShader:ae.meshbasic_frag},lambert:{uniforms:Ln([Ut.common,Ut.specularmap,Ut.envmap,Ut.aomap,Ut.lightmap,Ut.emissivemap,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.fog,Ut.lights,{emissive:{value:new Vt(0)}}]),vertexShader:ae.meshlambert_vert,fragmentShader:ae.meshlambert_frag},phong:{uniforms:Ln([Ut.common,Ut.specularmap,Ut.envmap,Ut.aomap,Ut.lightmap,Ut.emissivemap,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.fog,Ut.lights,{emissive:{value:new Vt(0)},specular:{value:new Vt(1118481)},shininess:{value:30}}]),vertexShader:ae.meshphong_vert,fragmentShader:ae.meshphong_frag},standard:{uniforms:Ln([Ut.common,Ut.envmap,Ut.aomap,Ut.lightmap,Ut.emissivemap,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.roughnessmap,Ut.metalnessmap,Ut.fog,Ut.lights,{emissive:{value:new Vt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:ae.meshphysical_vert,fragmentShader:ae.meshphysical_frag},toon:{uniforms:Ln([Ut.common,Ut.aomap,Ut.lightmap,Ut.emissivemap,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.gradientmap,Ut.fog,Ut.lights,{emissive:{value:new Vt(0)}}]),vertexShader:ae.meshtoon_vert,fragmentShader:ae.meshtoon_frag},matcap:{uniforms:Ln([Ut.common,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.fog,{matcap:{value:null}}]),vertexShader:ae.meshmatcap_vert,fragmentShader:ae.meshmatcap_frag},points:{uniforms:Ln([Ut.points,Ut.fog]),vertexShader:ae.points_vert,fragmentShader:ae.points_frag},dashed:{uniforms:Ln([Ut.common,Ut.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:ae.linedashed_vert,fragmentShader:ae.linedashed_frag},depth:{uniforms:Ln([Ut.common,Ut.displacementmap]),vertexShader:ae.depth_vert,fragmentShader:ae.depth_frag},normal:{uniforms:Ln([Ut.common,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,{opacity:{value:1}}]),vertexShader:ae.meshnormal_vert,fragmentShader:ae.meshnormal_frag},sprite:{uniforms:Ln([Ut.sprite,Ut.fog]),vertexShader:ae.sprite_vert,fragmentShader:ae.sprite_frag},background:{uniforms:{uvTransform:{value:new de},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:ae.background_vert,fragmentShader:ae.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new de}},vertexShader:ae.backgroundCube_vert,fragmentShader:ae.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:ae.cube_vert,fragmentShader:ae.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:ae.equirect_vert,fragmentShader:ae.equirect_frag},distanceRGBA:{uniforms:Ln([Ut.common,Ut.displacementmap,{referencePosition:{value:new C},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:ae.distanceRGBA_vert,fragmentShader:ae.distanceRGBA_frag},shadow:{uniforms:Ln([Ut.lights,Ut.fog,{color:{value:new Vt(0)},opacity:{value:1}}]),vertexShader:ae.shadow_vert,fragmentShader:ae.shadow_frag}};mi.physical={uniforms:Ln([mi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new de},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new de},clearcoatNormalScale:{value:new Rt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new de},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new de},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new de},sheen:{value:0},sheenColor:{value:new Vt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new de},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new de},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new de},transmissionSamplerSize:{value:new Rt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new de},attenuationDistance:{value:0},attenuationColor:{value:new Vt(0)},specularColor:{value:new Vt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new de},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new de},anisotropyVector:{value:new Rt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new de}}]),vertexShader:ae.meshphysical_vert,fragmentShader:ae.meshphysical_frag};const ta={r:0,b:0,g:0},ys=new He,o1=new jt;function r1(s,t,e,n,i,o,r){const a=new Vt(0);let l=o===!0?0:1,h,c,d=null,u=0,p=null;function f(w){let y=w.isScene===!0?w.background:null;return y&&y.isTexture&&(y=(w.backgroundBlurriness>0?e:t).get(y)),y}function v(w){let y=!1;const x=f(w);x===null?g(a,l):x&&x.isColor&&(g(x,1),y=!0);const b=s.xr.getEnvironmentBlendMode();b==="additive"?n.buffers.color.setClear(0,0,0,1,r):b==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,r),(s.autoClear||y)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function m(w,y){const x=f(y);x&&(x.isCubeTexture||x.mapping===Na)?(c===void 0&&(c=new pe(new kt(1,1,1),new Oe({name:"BackgroundCubeMaterial",uniforms:Ao(mi.backgroundCube.uniforms),vertexShader:mi.backgroundCube.vertexShader,fragmentShader:mi.backgroundCube.fragmentShader,side:Tn,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(b,M,S){this.matrixWorld.copyPosition(S.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(c)),ys.copy(y.backgroundRotation),ys.x*=-1,ys.y*=-1,ys.z*=-1,x.isCubeTexture&&x.isRenderTargetTexture===!1&&(ys.y*=-1,ys.z*=-1),c.material.uniforms.envMap.value=x,c.material.uniforms.flipEnvMap.value=x.isCubeTexture&&x.isRenderTargetTexture===!1?-1:1,c.material.uniforms.backgroundBlurriness.value=y.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(o1.makeRotationFromEuler(ys)),c.material.toneMapped=we.getTransfer(x.colorSpace)!==Pe,(d!==x||u!==x.version||p!==s.toneMapping)&&(c.material.needsUpdate=!0,d=x,u=x.version,p=s.toneMapping),c.layers.enableAll(),w.unshift(c,c.geometry,c.material,0,0,null)):x&&x.isTexture&&(h===void 0&&(h=new pe(new _i(2,2),new Oe({name:"BackgroundMaterial",uniforms:Ao(mi.background.uniforms),vertexShader:mi.background.vertexShader,fragmentShader:mi.background.fragmentShader,side:Yi,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),Object.defineProperty(h.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(h)),h.material.uniforms.t2D.value=x,h.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,h.material.toneMapped=we.getTransfer(x.colorSpace)!==Pe,x.matrixAutoUpdate===!0&&x.updateMatrix(),h.material.uniforms.uvTransform.value.copy(x.matrix),(d!==x||u!==x.version||p!==s.toneMapping)&&(h.material.needsUpdate=!0,d=x,u=x.version,p=s.toneMapping),h.layers.enableAll(),w.unshift(h,h.geometry,h.material,0,0,null))}function g(w,y){w.getRGB(ta,id(s)),n.buffers.color.setClear(ta.r,ta.g,ta.b,y,r)}return{getClearColor:function(){return a},setClearColor:function(w,y=1){a.set(w),l=y,g(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(w){l=w,g(a,l)},render:v,addToRenderList:m}}function a1(s,t){const e=s.getParameter(s.MAX_VERTEX_ATTRIBS),n={},i=u(null);let o=i,r=!1;function a(E,A,U,F,I){let B=!1;const k=d(F,U,A);o!==k&&(o=k,h(o.object)),B=p(E,F,U,I),B&&f(E,F,U,I),I!==null&&t.update(I,s.ELEMENT_ARRAY_BUFFER),(B||r)&&(r=!1,x(E,A,U,F),I!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,t.get(I).buffer))}function l(){return s.createVertexArray()}function h(E){return s.bindVertexArray(E)}function c(E){return s.deleteVertexArray(E)}function d(E,A,U){const F=U.wireframe===!0;let I=n[E.id];I===void 0&&(I={},n[E.id]=I);let B=I[A.id];B===void 0&&(B={},I[A.id]=B);let k=B[F];return k===void 0&&(k=u(l()),B[F]=k),k}function u(E){const A=[],U=[],F=[];for(let I=0;I<e;I++)A[I]=0,U[I]=0,F[I]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:A,enabledAttributes:U,attributeDivisors:F,object:E,attributes:{},index:null}}function p(E,A,U,F){const I=o.attributes,B=A.attributes;let k=0;const P=U.getAttributes();for(const H in P)if(P[H].location>=0){const N=I[H];let $=B[H];if($===void 0&&(H==="instanceMatrix"&&E.instanceMatrix&&($=E.instanceMatrix),H==="instanceColor"&&E.instanceColor&&($=E.instanceColor)),N===void 0||N.attribute!==$||$&&N.data!==$.data)return!0;k++}return o.attributesNum!==k||o.index!==F}function f(E,A,U,F){const I={},B=A.attributes;let k=0;const P=U.getAttributes();for(const H in P)if(P[H].location>=0){let N=B[H];N===void 0&&(H==="instanceMatrix"&&E.instanceMatrix&&(N=E.instanceMatrix),H==="instanceColor"&&E.instanceColor&&(N=E.instanceColor));const $={};$.attribute=N,N&&N.data&&($.data=N.data),I[H]=$,k++}o.attributes=I,o.attributesNum=k,o.index=F}function v(){const E=o.newAttributes;for(let A=0,U=E.length;A<U;A++)E[A]=0}function m(E){g(E,0)}function g(E,A){const U=o.newAttributes,F=o.enabledAttributes,I=o.attributeDivisors;U[E]=1,F[E]===0&&(s.enableVertexAttribArray(E),F[E]=1),I[E]!==A&&(s.vertexAttribDivisor(E,A),I[E]=A)}function w(){const E=o.newAttributes,A=o.enabledAttributes;for(let U=0,F=A.length;U<F;U++)A[U]!==E[U]&&(s.disableVertexAttribArray(U),A[U]=0)}function y(E,A,U,F,I,B,k){k===!0?s.vertexAttribIPointer(E,A,U,I,B):s.vertexAttribPointer(E,A,U,F,I,B)}function x(E,A,U,F){v();const I=F.attributes,B=U.getAttributes(),k=A.defaultAttributeValues;for(const P in B){const H=B[P];if(H.location>=0){let G=I[P];if(G===void 0&&(P==="instanceMatrix"&&E.instanceMatrix&&(G=E.instanceMatrix),P==="instanceColor"&&E.instanceColor&&(G=E.instanceColor)),G!==void 0){const N=G.normalized,$=G.itemSize,W=t.get(G);if(W===void 0)continue;const et=W.buffer,X=W.type,q=W.bytesPerElement,V=X===s.INT||X===s.UNSIGNED_INT||G.gpuType===$c;if(G.isInterleavedBufferAttribute){const st=G.data,ct=st.stride,pt=G.offset;if(st.isInstancedInterleavedBuffer){for(let K=0;K<H.locationSize;K++)g(H.location+K,st.meshPerAttribute);E.isInstancedMesh!==!0&&F._maxInstanceCount===void 0&&(F._maxInstanceCount=st.meshPerAttribute*st.count)}else for(let K=0;K<H.locationSize;K++)m(H.location+K);s.bindBuffer(s.ARRAY_BUFFER,et);for(let K=0;K<H.locationSize;K++)y(H.location+K,$/H.locationSize,X,N,ct*q,(pt+$/H.locationSize*K)*q,V)}else{if(G.isInstancedBufferAttribute){for(let st=0;st<H.locationSize;st++)g(H.location+st,G.meshPerAttribute);E.isInstancedMesh!==!0&&F._maxInstanceCount===void 0&&(F._maxInstanceCount=G.meshPerAttribute*G.count)}else for(let st=0;st<H.locationSize;st++)m(H.location+st);s.bindBuffer(s.ARRAY_BUFFER,et);for(let st=0;st<H.locationSize;st++)y(H.location+st,$/H.locationSize,X,N,$*q,$/H.locationSize*st*q,V)}}else if(k!==void 0){const N=k[P];if(N!==void 0)switch(N.length){case 2:s.vertexAttrib2fv(H.location,N);break;case 3:s.vertexAttrib3fv(H.location,N);break;case 4:s.vertexAttrib4fv(H.location,N);break;default:s.vertexAttrib1fv(H.location,N)}}}}w()}function b(){T();for(const E in n){const A=n[E];for(const U in A){const F=A[U];for(const I in F)c(F[I].object),delete F[I];delete A[U]}delete n[E]}}function M(E){if(n[E.id]===void 0)return;const A=n[E.id];for(const U in A){const F=A[U];for(const I in F)c(F[I].object),delete F[I];delete A[U]}delete n[E.id]}function S(E){for(const A in n){const U=n[A];if(U[E.id]===void 0)continue;const F=U[E.id];for(const I in F)c(F[I].object),delete F[I];delete U[E.id]}}function T(){_(),r=!0,o!==i&&(o=i,h(o.object))}function _(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:a,reset:T,resetDefaultState:_,dispose:b,releaseStatesOfGeometry:M,releaseStatesOfProgram:S,initAttributes:v,enableAttribute:m,disableUnusedAttributes:w}}function l1(s,t,e){let n;function i(h){n=h}function o(h,c){s.drawArrays(n,h,c),e.update(c,n,1)}function r(h,c,d){d!==0&&(s.drawArraysInstanced(n,h,c,d),e.update(c,n,d))}function a(h,c,d){if(d===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,h,0,c,0,d);let p=0;for(let f=0;f<d;f++)p+=c[f];e.update(p,n,1)}function l(h,c,d,u){if(d===0)return;const p=t.get("WEBGL_multi_draw");if(p===null)for(let f=0;f<h.length;f++)r(h[f],c[f],u[f]);else{p.multiDrawArraysInstancedWEBGL(n,h,0,c,0,u,0,d);let f=0;for(let v=0;v<d;v++)f+=c[v]*u[v];e.update(f,n,1)}}this.setMode=i,this.render=o,this.renderInstances=r,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function c1(s,t,e,n){let i;function o(){if(i!==void 0)return i;if(t.has("EXT_texture_filter_anisotropic")===!0){const S=t.get("EXT_texture_filter_anisotropic");i=s.getParameter(S.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function r(S){return!(S!==En&&n.convert(S)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(S){const T=S===In&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(S!==ti&&n.convert(S)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE)&&S!==$n&&!T)}function l(S){if(S==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";S="mediump"}return S==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let h=e.precision!==void 0?e.precision:"highp";const c=l(h);c!==h&&(console.warn("THREE.WebGLRenderer:",h,"not supported, using",c,"instead."),h=c);const d=e.logarithmicDepthBuffer===!0,u=e.reverseDepthBuffer===!0&&t.has("EXT_clip_control"),p=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),f=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),v=s.getParameter(s.MAX_TEXTURE_SIZE),m=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),g=s.getParameter(s.MAX_VERTEX_ATTRIBS),w=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),y=s.getParameter(s.MAX_VARYING_VECTORS),x=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),b=f>0,M=s.getParameter(s.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:o,getMaxPrecision:l,textureFormatReadable:r,textureTypeReadable:a,precision:h,logarithmicDepthBuffer:d,reverseDepthBuffer:u,maxTextures:p,maxVertexTextures:f,maxTextureSize:v,maxCubemapSize:m,maxAttributes:g,maxVertexUniforms:w,maxVaryings:y,maxFragmentUniforms:x,vertexTextures:b,maxSamples:M}}function h1(s){const t=this;let e=null,n=0,i=!1,o=!1;const r=new ls,a=new de,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){const p=d.length!==0||u||n!==0||i;return i=u,n=d.length,p},this.beginShadows=function(){o=!0,c(null)},this.endShadows=function(){o=!1},this.setGlobalState=function(d,u){e=c(d,u,0)},this.setState=function(d,u,p){const f=d.clippingPlanes,v=d.clipIntersection,m=d.clipShadows,g=s.get(d);if(!i||f===null||f.length===0||o&&!m)o?c(null):h();else{const w=o?0:n,y=w*4;let x=g.clippingState||null;l.value=x,x=c(f,u,y,p);for(let b=0;b!==y;++b)x[b]=e[b];g.clippingState=x,this.numIntersection=v?this.numPlanes:0,this.numPlanes+=w}};function h(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function c(d,u,p,f){const v=d!==null?d.length:0;let m=null;if(v!==0){if(m=l.value,f!==!0||m===null){const g=p+v*4,w=u.matrixWorldInverse;a.getNormalMatrix(w),(m===null||m.length<g)&&(m=new Float32Array(g));for(let y=0,x=p;y!==v;++y,x+=4)r.copy(d[y]).applyMatrix4(w,a),r.normal.toArray(m,x),m[x+3]=r.constant}l.value=m,l.needsUpdate=!0}return t.numPlanes=v,t.numIntersection=0,m}}function u1(s){let t=new WeakMap;function e(r,a){return a===lc?r.mapping=Mo:a===cc&&(r.mapping=bo),r}function n(r){if(r&&r.isTexture){const a=r.mapping;if(a===lc||a===cc)if(t.has(r)){const l=t.get(r).texture;return e(l,r.mapping)}else{const l=r.image;if(l&&l.height>0){const h=new Mp(l.height);return h.fromEquirectangularTexture(s,r),t.set(r,h),r.addEventListener("dispose",i),e(h.texture,r.mapping)}else return null}}return r}function i(r){const a=r.target;a.removeEventListener("dispose",i);const l=t.get(a);l!==void 0&&(t.delete(a),l.dispose())}function o(){t=new WeakMap}return{get:n,dispose:o}}class No extends sd{constructor(t=-1,e=1,n=1,i=-1,o=.1,r=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=i,this.near=o,this.far=r,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,i,o,r){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=o,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let o=n-t,r=n+t,a=i+e,l=i-e;if(this.view!==null&&this.view.enabled){const h=(this.right-this.left)/this.view.fullWidth/this.zoom,c=(this.top-this.bottom)/this.view.fullHeight/this.zoom;o+=h*this.view.offsetX,r=o+h*this.view.width,a-=c*this.view.offsetY,l=a-c*this.view.height}this.projectionMatrix.makeOrthographic(o,r,a,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}const po=4,a0=[.125,.215,.35,.446,.526,.582],Ls=20,gl=new No,l0=new Vt;let vl=null,xl=0,wl=0,yl=!1;const Rs=(1+Math.sqrt(5))/2,ao=1/Rs,c0=[new C(-Rs,ao,0),new C(Rs,ao,0),new C(-ao,0,Rs),new C(ao,0,Rs),new C(0,Rs,-ao),new C(0,Rs,ao),new C(-1,1,-1),new C(1,1,-1),new C(-1,1,1),new C(1,1,1)];class Fc{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,n=.1,i=100){vl=this._renderer.getRenderTarget(),xl=this._renderer.getActiveCubeFace(),wl=this._renderer.getActiveMipmapLevel(),yl=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const o=this._allocateTargets();return o.depthBuffer=!0,this._sceneToCubeUV(t,n,i,o),e>0&&this._blur(o,0,0,e),this._applyPMREM(o),this._cleanup(o),o}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=d0(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=u0(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(vl,xl,wl),this._renderer.xr.enabled=yl,t.scissorTest=!1,ea(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Mo||t.mapping===bo?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),vl=this._renderer.getRenderTarget(),xl=this._renderer.getActiveCubeFace(),wl=this._renderer.getActiveMipmapLevel(),yl=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:ye,minFilter:ye,generateMipmaps:!1,type:In,format:En,colorSpace:Gs,depthBuffer:!1},i=h0(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=h0(t,e,n);const{_lodMax:o}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=d1(o)),this._blurMaterial=f1(o,t,e)}return i}_compileMaterial(t){const e=new pe(this._lodPlanes[0],t);this._renderer.compile(e,gl)}_sceneToCubeUV(t,e,n,i){const a=new kn(90,1,e,n),l=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],c=this._renderer,d=c.autoClear,u=c.toneMapping;c.getClearColor(l0),c.toneMapping=Vi,c.autoClear=!1;const p=new th({name:"PMREM.Background",side:Tn,depthWrite:!1,depthTest:!1}),f=new pe(new kt,p);let v=!1;const m=t.background;m?m.isColor&&(p.color.copy(m),t.background=null,v=!0):(p.color.copy(l0),v=!0);for(let g=0;g<6;g++){const w=g%3;w===0?(a.up.set(0,l[g],0),a.lookAt(h[g],0,0)):w===1?(a.up.set(0,0,l[g]),a.lookAt(0,h[g],0)):(a.up.set(0,l[g],0),a.lookAt(0,0,h[g]));const y=this._cubeSize;ea(i,w*y,g>2?y:0,y,y),c.setRenderTarget(i),v&&c.render(f,a),c.render(t,a)}f.geometry.dispose(),f.material.dispose(),c.toneMapping=u,c.autoClear=d,t.background=m}_textureToCubeUV(t,e){const n=this._renderer,i=t.mapping===Mo||t.mapping===bo;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=d0()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=u0());const o=i?this._cubemapMaterial:this._equirectMaterial,r=new pe(this._lodPlanes[0],o),a=o.uniforms;a.envMap.value=t;const l=this._cubeSize;ea(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(r,gl)}_applyPMREM(t){const e=this._renderer,n=e.autoClear;e.autoClear=!1;const i=this._lodPlanes.length;for(let o=1;o<i;o++){const r=Math.sqrt(this._sigmas[o]*this._sigmas[o]-this._sigmas[o-1]*this._sigmas[o-1]),a=c0[(i-o-1)%c0.length];this._blur(t,o-1,o,r,a)}e.autoClear=n}_blur(t,e,n,i,o){const r=this._pingPongRenderTarget;this._halfBlur(t,r,e,n,i,"latitudinal",o),this._halfBlur(r,t,n,n,i,"longitudinal",o)}_halfBlur(t,e,n,i,o,r,a){const l=this._renderer,h=this._blurMaterial;r!=="latitudinal"&&r!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const c=3,d=new pe(this._lodPlanes[i],h),u=h.uniforms,p=this._sizeLods[n]-1,f=isFinite(o)?Math.PI/(2*p):2*Math.PI/(2*Ls-1),v=o/f,m=isFinite(o)?1+Math.floor(c*v):Ls;m>Ls&&console.warn(`sigmaRadians, ${o}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Ls}`);const g=[];let w=0;for(let S=0;S<Ls;++S){const T=S/v,_=Math.exp(-T*T/2);g.push(_),S===0?w+=_:S<m&&(w+=2*_)}for(let S=0;S<g.length;S++)g[S]=g[S]/w;u.envMap.value=t.texture,u.samples.value=m,u.weights.value=g,u.latitudinal.value=r==="latitudinal",a&&(u.poleAxis.value=a);const{_lodMax:y}=this;u.dTheta.value=f,u.mipInt.value=y-n;const x=this._sizeLods[i],b=3*x*(i>y-po?i-y+po:0),M=4*(this._cubeSize-x);ea(e,b,M,3*x,2*x),l.setRenderTarget(e),l.render(d,gl)}}function d1(s){const t=[],e=[],n=[];let i=s;const o=s-po+1+a0.length;for(let r=0;r<o;r++){const a=Math.pow(2,i);e.push(a);let l=1/a;r>s-po?l=a0[r-s+po-1]:r===0&&(l=0),n.push(l);const h=1/(a-2),c=-h,d=1+h,u=[c,c,d,c,d,d,c,c,d,d,c,d],p=6,f=6,v=3,m=2,g=1,w=new Float32Array(v*f*p),y=new Float32Array(m*f*p),x=new Float32Array(g*f*p);for(let M=0;M<p;M++){const S=M%3*2/3-1,T=M>2?0:-1,_=[S,T,0,S+2/3,T,0,S+2/3,T+1,0,S,T,0,S+2/3,T+1,0,S,T+1,0];w.set(_,v*f*M),y.set(u,m*f*M);const E=[M,M,M,M,M,M];x.set(E,g*f*M)}const b=new oe;b.setAttribute("position",new _e(w,v)),b.setAttribute("uv",new _e(y,m)),b.setAttribute("faceIndex",new _e(x,g)),t.push(b),i>po&&i--}return{lodPlanes:t,sizeLods:e,sigmas:n}}function h0(s,t,e){const n=new vn(s,t,e);return n.texture.mapping=Na,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function ea(s,t,e,n,i){s.viewport.set(t,e,n,i),s.scissor.set(t,e,n,i)}function f1(s,t,e){const n=new Float32Array(Ls),i=new C(0,1,0);return new Oe({name:"SphericalGaussianBlur",defines:{n:Ls,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:eh(),fragmentShader:`

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
		`,blending:cs,depthTest:!1,depthWrite:!1})}function u0(){return new Oe({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:eh(),fragmentShader:`

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
		`,blending:cs,depthTest:!1,depthWrite:!1})}function d0(){return new Oe({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:eh(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:cs,depthTest:!1,depthWrite:!1})}function eh(){return`

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
	`}function p1(s){let t=new WeakMap,e=null;function n(a){if(a&&a.isTexture){const l=a.mapping,h=l===lc||l===cc,c=l===Mo||l===bo;if(h||c){let d=t.get(a);const u=d!==void 0?d.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==u)return e===null&&(e=new Fc(s)),d=h?e.fromEquirectangular(a,d):e.fromCubemap(a,d),d.texture.pmremVersion=a.pmremVersion,t.set(a,d),d.texture;if(d!==void 0)return d.texture;{const p=a.image;return h&&p&&p.height>0||c&&p&&i(p)?(e===null&&(e=new Fc(s)),d=h?e.fromEquirectangular(a):e.fromCubemap(a),d.texture.pmremVersion=a.pmremVersion,t.set(a,d),a.addEventListener("dispose",o),d.texture):null}}}return a}function i(a){let l=0;const h=6;for(let c=0;c<h;c++)a[c]!==void 0&&l++;return l===h}function o(a){const l=a.target;l.removeEventListener("dispose",o);const h=t.get(l);h!==void 0&&(t.delete(l),h.dispose())}function r(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:n,dispose:r}}function m1(s){const t={};function e(n){if(t[n]!==void 0)return t[n];let i;switch(n){case"WEBGL_depth_texture":i=s.getExtension("WEBGL_depth_texture")||s.getExtension("MOZ_WEBGL_depth_texture")||s.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":i=s.getExtension("EXT_texture_filter_anisotropic")||s.getExtension("MOZ_EXT_texture_filter_anisotropic")||s.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":i=s.getExtension("WEBGL_compressed_texture_s3tc")||s.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":i=s.getExtension("WEBGL_compressed_texture_pvrtc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:i=s.getExtension(n)}return t[n]=i,i}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){const i=e(n);return i===null&&dr("THREE.WebGLRenderer: "+n+" extension not supported."),i}}}function g1(s,t,e,n){const i={},o=new WeakMap;function r(d){const u=d.target;u.index!==null&&t.remove(u.index);for(const f in u.attributes)t.remove(u.attributes[f]);for(const f in u.morphAttributes){const v=u.morphAttributes[f];for(let m=0,g=v.length;m<g;m++)t.remove(v[m])}u.removeEventListener("dispose",r),delete i[u.id];const p=o.get(u);p&&(t.remove(p),o.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function a(d,u){return i[u.id]===!0||(u.addEventListener("dispose",r),i[u.id]=!0,e.memory.geometries++),u}function l(d){const u=d.attributes;for(const f in u)t.update(u[f],s.ARRAY_BUFFER);const p=d.morphAttributes;for(const f in p){const v=p[f];for(let m=0,g=v.length;m<g;m++)t.update(v[m],s.ARRAY_BUFFER)}}function h(d){const u=[],p=d.index,f=d.attributes.position;let v=0;if(p!==null){const w=p.array;v=p.version;for(let y=0,x=w.length;y<x;y+=3){const b=w[y+0],M=w[y+1],S=w[y+2];u.push(b,M,M,S,S,b)}}else if(f!==void 0){const w=f.array;v=f.version;for(let y=0,x=w.length/3-1;y<x;y+=3){const b=y+0,M=y+1,S=y+2;u.push(b,M,M,S,S,b)}}else return;const m=new($u(u)?nd:ed)(u,1);m.version=v;const g=o.get(d);g&&t.remove(g),o.set(d,m)}function c(d){const u=o.get(d);if(u){const p=d.index;p!==null&&u.version<p.version&&h(d)}else h(d);return o.get(d)}return{get:a,update:l,getWireframeAttribute:c}}function v1(s,t,e){let n;function i(u){n=u}let o,r;function a(u){o=u.type,r=u.bytesPerElement}function l(u,p){s.drawElements(n,p,o,u*r),e.update(p,n,1)}function h(u,p,f){f!==0&&(s.drawElementsInstanced(n,p,o,u*r,f),e.update(p,n,f))}function c(u,p,f){if(f===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,p,0,o,u,0,f);let m=0;for(let g=0;g<f;g++)m+=p[g];e.update(m,n,1)}function d(u,p,f,v){if(f===0)return;const m=t.get("WEBGL_multi_draw");if(m===null)for(let g=0;g<u.length;g++)h(u[g]/r,p[g],v[g]);else{m.multiDrawElementsInstancedWEBGL(n,p,0,o,u,0,v,0,f);let g=0;for(let w=0;w<f;w++)g+=p[w]*v[w];e.update(g,n,1)}}this.setMode=i,this.setIndex=a,this.render=l,this.renderInstances=h,this.renderMultiDraw=c,this.renderMultiDrawInstances=d}function x1(s){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(o,r,a){switch(e.calls++,r){case s.TRIANGLES:e.triangles+=a*(o/3);break;case s.LINES:e.lines+=a*(o/2);break;case s.LINE_STRIP:e.lines+=a*(o-1);break;case s.LINE_LOOP:e.lines+=a*o;break;case s.POINTS:e.points+=a*o;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",r);break}}function i(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:i,update:n}}function w1(s,t,e){const n=new WeakMap,i=new ze;function o(r,a,l){const h=r.morphTargetInfluences,c=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,d=c!==void 0?c.length:0;let u=n.get(a);if(u===void 0||u.count!==d){let E=function(){T.dispose(),n.delete(a),a.removeEventListener("dispose",E)};var p=E;u!==void 0&&u.texture.dispose();const f=a.morphAttributes.position!==void 0,v=a.morphAttributes.normal!==void 0,m=a.morphAttributes.color!==void 0,g=a.morphAttributes.position||[],w=a.morphAttributes.normal||[],y=a.morphAttributes.color||[];let x=0;f===!0&&(x=1),v===!0&&(x=2),m===!0&&(x=3);let b=a.attributes.position.count*x,M=1;b>t.maxTextureSize&&(M=Math.ceil(b/t.maxTextureSize),b=t.maxTextureSize);const S=new Float32Array(b*M*4*d),T=new Zu(S,b,M,d);T.type=$n,T.needsUpdate=!0;const _=x*4;for(let A=0;A<d;A++){const U=g[A],F=w[A],I=y[A],B=b*M*4*A;for(let k=0;k<U.count;k++){const P=k*_;f===!0&&(i.fromBufferAttribute(U,k),S[B+P+0]=i.x,S[B+P+1]=i.y,S[B+P+2]=i.z,S[B+P+3]=0),v===!0&&(i.fromBufferAttribute(F,k),S[B+P+4]=i.x,S[B+P+5]=i.y,S[B+P+6]=i.z,S[B+P+7]=0),m===!0&&(i.fromBufferAttribute(I,k),S[B+P+8]=i.x,S[B+P+9]=i.y,S[B+P+10]=i.z,S[B+P+11]=I.itemSize===4?i.w:1)}}u={count:d,texture:T,size:new Rt(b,M)},n.set(a,u),a.addEventListener("dispose",E)}if(r.isInstancedMesh===!0&&r.morphTexture!==null)l.getUniforms().setValue(s,"morphTexture",r.morphTexture,e);else{let f=0;for(let m=0;m<h.length;m++)f+=h[m];const v=a.morphTargetsRelative?1:1-f;l.getUniforms().setValue(s,"morphTargetBaseInfluence",v),l.getUniforms().setValue(s,"morphTargetInfluences",h)}l.getUniforms().setValue(s,"morphTargetsTexture",u.texture,e),l.getUniforms().setValue(s,"morphTargetsTextureSize",u.size)}return{update:o}}function y1(s,t,e,n){let i=new WeakMap;function o(l){const h=n.render.frame,c=l.geometry,d=t.get(l,c);if(i.get(d)!==h&&(t.update(d),i.set(d,h)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),i.get(l)!==h&&(e.update(l.instanceMatrix,s.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,s.ARRAY_BUFFER),i.set(l,h))),l.isSkinnedMesh){const u=l.skeleton;i.get(u)!==h&&(u.update(),i.set(u,h))}return d}function r(){i=new WeakMap}function a(l){const h=l.target;h.removeEventListener("dispose",a),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:o,dispose:r}}class ka extends An{constructor(t,e,n,i,o,r,a,l,h,c=xo){if(c!==xo&&c!==To)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&c===xo&&(n=wi),n===void 0&&c===To&&(n=Eo),super(null,i,o,r,a,l,c,n,h),this.isDepthTexture=!0,this.image={width:t,height:e},this.magFilter=a!==void 0?a:Nn,this.minFilter=l!==void 0?l:Nn,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}const ad=new An,f0=new ka(1,1),ld=new Zu,cd=new Ku,hd=new od,p0=[],m0=[],g0=new Float32Array(16),v0=new Float32Array(9),x0=new Float32Array(4);function Uo(s,t,e){const n=s[0];if(n<=0||n>0)return s;const i=t*e;let o=p0[i];if(o===void 0&&(o=new Float32Array(i),p0[i]=o),t!==0){n.toArray(o,0);for(let r=1,a=0;r!==t;++r)a+=e,s[r].toArray(o,a)}return o}function on(s,t){if(s.length!==t.length)return!1;for(let e=0,n=s.length;e<n;e++)if(s[e]!==t[e])return!1;return!0}function rn(s,t){for(let e=0,n=t.length;e<n;e++)s[e]=t[e]}function Oa(s,t){let e=m0[t];e===void 0&&(e=new Int32Array(t),m0[t]=e);for(let n=0;n!==t;++n)e[n]=s.allocateTextureUnit();return e}function _1(s,t){const e=this.cache;e[0]!==t&&(s.uniform1f(this.addr,t),e[0]=t)}function M1(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(on(e,t))return;s.uniform2fv(this.addr,t),rn(e,t)}}function b1(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(s.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(on(e,t))return;s.uniform3fv(this.addr,t),rn(e,t)}}function S1(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(on(e,t))return;s.uniform4fv(this.addr,t),rn(e,t)}}function E1(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(on(e,t))return;s.uniformMatrix2fv(this.addr,!1,t),rn(e,t)}else{if(on(e,n))return;x0.set(n),s.uniformMatrix2fv(this.addr,!1,x0),rn(e,n)}}function T1(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(on(e,t))return;s.uniformMatrix3fv(this.addr,!1,t),rn(e,t)}else{if(on(e,n))return;v0.set(n),s.uniformMatrix3fv(this.addr,!1,v0),rn(e,n)}}function A1(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(on(e,t))return;s.uniformMatrix4fv(this.addr,!1,t),rn(e,t)}else{if(on(e,n))return;g0.set(n),s.uniformMatrix4fv(this.addr,!1,g0),rn(e,n)}}function C1(s,t){const e=this.cache;e[0]!==t&&(s.uniform1i(this.addr,t),e[0]=t)}function R1(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(on(e,t))return;s.uniform2iv(this.addr,t),rn(e,t)}}function P1(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(on(e,t))return;s.uniform3iv(this.addr,t),rn(e,t)}}function L1(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(on(e,t))return;s.uniform4iv(this.addr,t),rn(e,t)}}function D1(s,t){const e=this.cache;e[0]!==t&&(s.uniform1ui(this.addr,t),e[0]=t)}function I1(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(on(e,t))return;s.uniform2uiv(this.addr,t),rn(e,t)}}function z1(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(on(e,t))return;s.uniform3uiv(this.addr,t),rn(e,t)}}function N1(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(on(e,t))return;s.uniform4uiv(this.addr,t),rn(e,t)}}function U1(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);let o;this.type===s.SAMPLER_2D_SHADOW?(f0.compareFunction=Yu,o=f0):o=ad,e.setTexture2D(t||o,i)}function F1(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTexture3D(t||cd,i)}function k1(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTextureCube(t||hd,i)}function O1(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTexture2DArray(t||ld,i)}function B1(s){switch(s){case 5126:return _1;case 35664:return M1;case 35665:return b1;case 35666:return S1;case 35674:return E1;case 35675:return T1;case 35676:return A1;case 5124:case 35670:return C1;case 35667:case 35671:return R1;case 35668:case 35672:return P1;case 35669:case 35673:return L1;case 5125:return D1;case 36294:return I1;case 36295:return z1;case 36296:return N1;case 35678:case 36198:case 36298:case 36306:case 35682:return U1;case 35679:case 36299:case 36307:return F1;case 35680:case 36300:case 36308:case 36293:return k1;case 36289:case 36303:case 36311:case 36292:return O1}}function H1(s,t){s.uniform1fv(this.addr,t)}function G1(s,t){const e=Uo(t,this.size,2);s.uniform2fv(this.addr,e)}function V1(s,t){const e=Uo(t,this.size,3);s.uniform3fv(this.addr,e)}function W1(s,t){const e=Uo(t,this.size,4);s.uniform4fv(this.addr,e)}function X1(s,t){const e=Uo(t,this.size,4);s.uniformMatrix2fv(this.addr,!1,e)}function q1(s,t){const e=Uo(t,this.size,9);s.uniformMatrix3fv(this.addr,!1,e)}function Y1(s,t){const e=Uo(t,this.size,16);s.uniformMatrix4fv(this.addr,!1,e)}function $1(s,t){s.uniform1iv(this.addr,t)}function j1(s,t){s.uniform2iv(this.addr,t)}function Z1(s,t){s.uniform3iv(this.addr,t)}function K1(s,t){s.uniform4iv(this.addr,t)}function J1(s,t){s.uniform1uiv(this.addr,t)}function Q1(s,t){s.uniform2uiv(this.addr,t)}function tv(s,t){s.uniform3uiv(this.addr,t)}function ev(s,t){s.uniform4uiv(this.addr,t)}function nv(s,t,e){const n=this.cache,i=t.length,o=Oa(e,i);on(n,o)||(s.uniform1iv(this.addr,o),rn(n,o));for(let r=0;r!==i;++r)e.setTexture2D(t[r]||ad,o[r])}function iv(s,t,e){const n=this.cache,i=t.length,o=Oa(e,i);on(n,o)||(s.uniform1iv(this.addr,o),rn(n,o));for(let r=0;r!==i;++r)e.setTexture3D(t[r]||cd,o[r])}function sv(s,t,e){const n=this.cache,i=t.length,o=Oa(e,i);on(n,o)||(s.uniform1iv(this.addr,o),rn(n,o));for(let r=0;r!==i;++r)e.setTextureCube(t[r]||hd,o[r])}function ov(s,t,e){const n=this.cache,i=t.length,o=Oa(e,i);on(n,o)||(s.uniform1iv(this.addr,o),rn(n,o));for(let r=0;r!==i;++r)e.setTexture2DArray(t[r]||ld,o[r])}function rv(s){switch(s){case 5126:return H1;case 35664:return G1;case 35665:return V1;case 35666:return W1;case 35674:return X1;case 35675:return q1;case 35676:return Y1;case 5124:case 35670:return $1;case 35667:case 35671:return j1;case 35668:case 35672:return Z1;case 35669:case 35673:return K1;case 5125:return J1;case 36294:return Q1;case 36295:return tv;case 36296:return ev;case 35678:case 36198:case 36298:case 36306:case 35682:return nv;case 35679:case 36299:case 36307:return iv;case 35680:case 36300:case 36308:case 36293:return sv;case 36289:case 36303:case 36311:case 36292:return ov}}class av{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=B1(e.type)}}class lv{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=rv(e.type)}}class cv{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){const i=this.seq;for(let o=0,r=i.length;o!==r;++o){const a=i[o];a.setValue(t,e[a.id],n)}}}const _l=/(\w+)(\])?(\[|\.)?/g;function w0(s,t){s.seq.push(t),s.map[t.id]=t}function hv(s,t,e){const n=s.name,i=n.length;for(_l.lastIndex=0;;){const o=_l.exec(n),r=_l.lastIndex;let a=o[1];const l=o[2]==="]",h=o[3];if(l&&(a=a|0),h===void 0||h==="["&&r+2===i){w0(e,h===void 0?new av(a,s,t):new lv(a,s,t));break}else{let d=e.map[a];d===void 0&&(d=new cv(a),w0(e,d)),e=d}}}class Ma{constructor(t,e){this.seq=[],this.map={};const n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let i=0;i<n;++i){const o=t.getActiveUniform(e,i),r=t.getUniformLocation(e,o.name);hv(o,r,this)}}setValue(t,e,n,i){const o=this.map[e];o!==void 0&&o.setValue(t,n,i)}setOptional(t,e,n){const i=e[n];i!==void 0&&this.setValue(t,n,i)}static upload(t,e,n,i){for(let o=0,r=e.length;o!==r;++o){const a=e[o],l=n[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,i)}}static seqWithValue(t,e){const n=[];for(let i=0,o=t.length;i!==o;++i){const r=t[i];r.id in e&&n.push(r)}return n}}function y0(s,t,e){const n=s.createShader(t);return s.shaderSource(n,e),s.compileShader(n),n}const uv=37297;let dv=0;function fv(s,t){const e=s.split(`
`),n=[],i=Math.max(t-6,0),o=Math.min(t+6,e.length);for(let r=i;r<o;r++){const a=r+1;n.push(`${a===t?">":" "} ${a}: ${e[r]}`)}return n.join(`
`)}const _0=new de;function pv(s){we._getMatrix(_0,we.workingColorSpace,s);const t=`mat3( ${_0.elements.map(e=>e.toFixed(4))} )`;switch(we.getTransfer(s)){case Fa:return[t,"LinearTransferOETF"];case Pe:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",s),[t,"LinearTransferOETF"]}}function M0(s,t,e){const n=s.getShaderParameter(t,s.COMPILE_STATUS),i=s.getShaderInfoLog(t).trim();if(n&&i==="")return"";const o=/ERROR: 0:(\d+)/.exec(i);if(o){const r=parseInt(o[1]);return e.toUpperCase()+`

`+i+`

`+fv(s.getShaderSource(t),r)}else return i}function mv(s,t){const e=pv(t);return[`vec4 ${s}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}function gv(s,t){let e;switch(t){case gf:e="Linear";break;case vf:e="Reinhard";break;case xf:e="Cineon";break;case wf:e="ACESFilmic";break;case _f:e="AgX";break;case Mf:e="Neutral";break;case yf:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+s+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const na=new C;function vv(){we.getLuminanceCoefficients(na);const s=na.x.toFixed(4),t=na.y.toFixed(4),e=na.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function xv(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(fr).join(`
`)}function wv(s){const t=[];for(const e in s){const n=s[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function yv(s,t){const e={},n=s.getProgramParameter(t,s.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const o=s.getActiveAttrib(t,i),r=o.name;let a=1;o.type===s.FLOAT_MAT2&&(a=2),o.type===s.FLOAT_MAT3&&(a=3),o.type===s.FLOAT_MAT4&&(a=4),e[r]={type:o.type,location:s.getAttribLocation(t,r),locationSize:a}}return e}function fr(s){return s!==""}function b0(s,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return s.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function S0(s,t){return s.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const _v=/^[ \t]*#include +<([\w\d./]+)>/gm;function kc(s){return s.replace(_v,bv)}const Mv=new Map;function bv(s,t){let e=ae[t];if(e===void 0){const n=Mv.get(t);if(n!==void 0)e=ae[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("Can not resolve #include <"+t+">")}return kc(e)}const Sv=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function E0(s){return s.replace(Sv,Ev)}function Ev(s,t,e,n){let i="";for(let o=parseInt(t);o<parseInt(e);o++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+o+" ]").replace(/UNROLLED_LOOP_INDEX/g,o);return i}function T0(s){let t=`precision ${s.precision} float;
	precision ${s.precision} int;
	precision ${s.precision} sampler2D;
	precision ${s.precision} samplerCube;
	precision ${s.precision} sampler3D;
	precision ${s.precision} sampler2DArray;
	precision ${s.precision} sampler2DShadow;
	precision ${s.precision} samplerCubeShadow;
	precision ${s.precision} sampler2DArrayShadow;
	precision ${s.precision} isampler2D;
	precision ${s.precision} isampler3D;
	precision ${s.precision} isamplerCube;
	precision ${s.precision} isampler2DArray;
	precision ${s.precision} usampler2D;
	precision ${s.precision} usampler3D;
	precision ${s.precision} usamplerCube;
	precision ${s.precision} usampler2DArray;
	`;return s.precision==="highp"?t+=`
#define HIGH_PRECISION`:s.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:s.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function Tv(s){let t="SHADOWMAP_TYPE_BASIC";return s.shadowMapType===Du?t="SHADOWMAP_TYPE_PCF":s.shadowMapType===Iu?t="SHADOWMAP_TYPE_PCF_SOFT":s.shadowMapType===Fi&&(t="SHADOWMAP_TYPE_VSM"),t}function Av(s){let t="ENVMAP_TYPE_CUBE";if(s.envMap)switch(s.envMapMode){case Mo:case bo:t="ENVMAP_TYPE_CUBE";break;case Na:t="ENVMAP_TYPE_CUBE_UV";break}return t}function Cv(s){let t="ENVMAP_MODE_REFLECTION";if(s.envMap)switch(s.envMapMode){case bo:t="ENVMAP_MODE_REFRACTION";break}return t}function Rv(s){let t="ENVMAP_BLENDING_NONE";if(s.envMap)switch(s.combine){case zu:t="ENVMAP_BLENDING_MULTIPLY";break;case pf:t="ENVMAP_BLENDING_MIX";break;case mf:t="ENVMAP_BLENDING_ADD";break}return t}function Pv(s){const t=s.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),7*16)),texelHeight:n,maxMip:e}}function Lv(s,t,e,n){const i=s.getContext(),o=e.defines;let r=e.vertexShader,a=e.fragmentShader;const l=Tv(e),h=Av(e),c=Cv(e),d=Rv(e),u=Pv(e),p=xv(e),f=wv(o),v=i.createProgram();let m,g,w=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,f].filter(fr).join(`
`),m.length>0&&(m+=`
`),g=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,f].filter(fr).join(`
`),g.length>0&&(g+=`
`)):(m=[T0(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,f,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(fr).join(`
`),g=[T0(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,f,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.envMap?"#define "+c:"",e.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Vi?"#define TONE_MAPPING":"",e.toneMapping!==Vi?ae.tonemapping_pars_fragment:"",e.toneMapping!==Vi?gv("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",ae.colorspace_pars_fragment,mv("linearToOutputTexel",e.outputColorSpace),vv(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(fr).join(`
`)),r=kc(r),r=b0(r,e),r=S0(r,e),a=kc(a),a=b0(a,e),a=S0(a,e),r=E0(r),a=E0(a),e.isRawShaderMaterial!==!0&&(w=`#version 300 es
`,m=[p,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,g=["#define varying in",e.glslVersion===Oh?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Oh?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+g);const y=w+m+r,x=w+g+a,b=y0(i,i.VERTEX_SHADER,y),M=y0(i,i.FRAGMENT_SHADER,x);i.attachShader(v,b),i.attachShader(v,M),e.index0AttributeName!==void 0?i.bindAttribLocation(v,0,e.index0AttributeName):e.morphTargets===!0&&i.bindAttribLocation(v,0,"position"),i.linkProgram(v);function S(A){if(s.debug.checkShaderErrors){const U=i.getProgramInfoLog(v).trim(),F=i.getShaderInfoLog(b).trim(),I=i.getShaderInfoLog(M).trim();let B=!0,k=!0;if(i.getProgramParameter(v,i.LINK_STATUS)===!1)if(B=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(i,v,b,M);else{const P=M0(i,b,"vertex"),H=M0(i,M,"fragment");console.error("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(v,i.VALIDATE_STATUS)+`

Material Name: `+A.name+`
Material Type: `+A.type+`

Program Info Log: `+U+`
`+P+`
`+H)}else U!==""?console.warn("THREE.WebGLProgram: Program Info Log:",U):(F===""||I==="")&&(k=!1);k&&(A.diagnostics={runnable:B,programLog:U,vertexShader:{log:F,prefix:m},fragmentShader:{log:I,prefix:g}})}i.deleteShader(b),i.deleteShader(M),T=new Ma(i,v),_=yv(i,v)}let T;this.getUniforms=function(){return T===void 0&&S(this),T};let _;this.getAttributes=function(){return _===void 0&&S(this),_};let E=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return E===!1&&(E=i.getProgramParameter(v,uv)),E},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(v),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=dv++,this.cacheKey=t,this.usedTimes=1,this.program=v,this.vertexShader=b,this.fragmentShader=M,this}let Dv=0;class Iv{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,n=t.fragmentShader,i=this._getShaderStage(e),o=this._getShaderStage(n),r=this._getShaderCacheForMaterial(t);return r.has(i)===!1&&(r.add(i),i.usedTimes++),r.has(o)===!1&&(r.add(o),o.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){const e=this.shaderCache;let n=e.get(t);return n===void 0&&(n=new zv(t),e.set(t,n)),n}}class zv{constructor(t){this.id=Dv++,this.code=t,this.usedTimes=0}}function Nv(s,t,e,n,i,o,r){const a=new Qu,l=new Iv,h=new Set,c=[],d=i.logarithmicDepthBuffer,u=i.vertexTextures;let p=i.precision;const f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function v(_){return h.add(_),_===0?"uv":`uv${_}`}function m(_,E,A,U,F){const I=U.fog,B=F.geometry,k=_.isMeshStandardMaterial?U.environment:null,P=(_.isMeshStandardMaterial?e:t).get(_.envMap||k),H=P&&P.mapping===Na?P.image.height:null,G=f[_.type];_.precision!==null&&(p=i.getMaxPrecision(_.precision),p!==_.precision&&console.warn("THREE.WebGLProgram.getParameters:",_.precision,"not supported, using",p,"instead."));const N=B.morphAttributes.position||B.morphAttributes.normal||B.morphAttributes.color,$=N!==void 0?N.length:0;let W=0;B.morphAttributes.position!==void 0&&(W=1),B.morphAttributes.normal!==void 0&&(W=2),B.morphAttributes.color!==void 0&&(W=3);let et,X,q,V;if(G){const ue=mi[G];et=ue.vertexShader,X=ue.fragmentShader}else et=_.vertexShader,X=_.fragmentShader,l.update(_),q=l.getVertexShaderID(_),V=l.getFragmentShaderID(_);const st=s.getRenderTarget(),ct=s.state.buffers.depth.getReversed(),pt=F.isInstancedMesh===!0,K=F.isBatchedMesh===!0,ot=!!_.map,j=!!_.matcap,nt=!!P,D=!!_.aoMap,J=!!_.lightMap,Z=!!_.bumpMap,rt=!!_.normalMap,dt=!!_.displacementMap,xt=!!_.emissiveMap,ft=!!_.metalnessMap,z=!!_.roughnessMap,R=_.anisotropy>0,tt=_.clearcoat>0,ht=_.dispersion>0,gt=_.iridescence>0,ut=_.sheen>0,Nt=_.transmission>0,bt=R&&!!_.anisotropyMap,Dt=tt&&!!_.clearcoatMap,ee=tt&&!!_.clearcoatNormalMap,yt=tt&&!!_.clearcoatRoughnessMap,Ot=gt&&!!_.iridescenceMap,Yt=gt&&!!_.iridescenceThicknessMap,Ft=ut&&!!_.sheenColorMap,Lt=ut&&!!_.sheenRoughnessMap,le=!!_.specularMap,te=!!_.specularColorMap,ge=!!_.specularIntensityMap,Y=Nt&&!!_.transmissionMap,zt=Nt&&!!_.thicknessMap,mt=!!_.gradientMap,wt=!!_.alphaMap,Et=_.alphaTest>0,Tt=!!_.alphaHash,ie=!!_.extensions;let Me=Vi;_.toneMapped&&(st===null||st.isXRRenderTarget===!0)&&(Me=s.toneMapping);const Ve={shaderID:G,shaderType:_.type,shaderName:_.name,vertexShader:et,fragmentShader:X,defines:_.defines,customVertexShaderID:q,customFragmentShaderID:V,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:p,batching:K,batchingColor:K&&F._colorsTexture!==null,instancing:pt,instancingColor:pt&&F.instanceColor!==null,instancingMorph:pt&&F.morphTexture!==null,supportsVertexTextures:u,outputColorSpace:st===null?s.outputColorSpace:st.isXRRenderTarget===!0?st.texture.colorSpace:Gs,alphaToCoverage:!!_.alphaToCoverage,map:ot,matcap:j,envMap:nt,envMapMode:nt&&P.mapping,envMapCubeUVHeight:H,aoMap:D,lightMap:J,bumpMap:Z,normalMap:rt,displacementMap:u&&dt,emissiveMap:xt,normalMapObjectSpace:rt&&_.normalMapType===Ef,normalMapTangentSpace:rt&&_.normalMapType===qu,metalnessMap:ft,roughnessMap:z,anisotropy:R,anisotropyMap:bt,clearcoat:tt,clearcoatMap:Dt,clearcoatNormalMap:ee,clearcoatRoughnessMap:yt,dispersion:ht,iridescence:gt,iridescenceMap:Ot,iridescenceThicknessMap:Yt,sheen:ut,sheenColorMap:Ft,sheenRoughnessMap:Lt,specularMap:le,specularColorMap:te,specularIntensityMap:ge,transmission:Nt,transmissionMap:Y,thicknessMap:zt,gradientMap:mt,opaque:_.transparent===!1&&_.blending===Gi&&_.alphaToCoverage===!1,alphaMap:wt,alphaTest:Et,alphaHash:Tt,combine:_.combine,mapUv:ot&&v(_.map.channel),aoMapUv:D&&v(_.aoMap.channel),lightMapUv:J&&v(_.lightMap.channel),bumpMapUv:Z&&v(_.bumpMap.channel),normalMapUv:rt&&v(_.normalMap.channel),displacementMapUv:dt&&v(_.displacementMap.channel),emissiveMapUv:xt&&v(_.emissiveMap.channel),metalnessMapUv:ft&&v(_.metalnessMap.channel),roughnessMapUv:z&&v(_.roughnessMap.channel),anisotropyMapUv:bt&&v(_.anisotropyMap.channel),clearcoatMapUv:Dt&&v(_.clearcoatMap.channel),clearcoatNormalMapUv:ee&&v(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:yt&&v(_.clearcoatRoughnessMap.channel),iridescenceMapUv:Ot&&v(_.iridescenceMap.channel),iridescenceThicknessMapUv:Yt&&v(_.iridescenceThicknessMap.channel),sheenColorMapUv:Ft&&v(_.sheenColorMap.channel),sheenRoughnessMapUv:Lt&&v(_.sheenRoughnessMap.channel),specularMapUv:le&&v(_.specularMap.channel),specularColorMapUv:te&&v(_.specularColorMap.channel),specularIntensityMapUv:ge&&v(_.specularIntensityMap.channel),transmissionMapUv:Y&&v(_.transmissionMap.channel),thicknessMapUv:zt&&v(_.thicknessMap.channel),alphaMapUv:wt&&v(_.alphaMap.channel),vertexTangents:!!B.attributes.tangent&&(rt||R),vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!B.attributes.color&&B.attributes.color.itemSize===4,pointsUvs:F.isPoints===!0&&!!B.attributes.uv&&(ot||wt),fog:!!I,useFog:_.fog===!0,fogExp2:!!I&&I.isFogExp2,flatShading:_.flatShading===!0,sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:d,reverseDepthBuffer:ct,skinning:F.isSkinnedMesh===!0,morphTargets:B.morphAttributes.position!==void 0,morphNormals:B.morphAttributes.normal!==void 0,morphColors:B.morphAttributes.color!==void 0,morphTargetsCount:$,morphTextureStride:W,numDirLights:E.directional.length,numPointLights:E.point.length,numSpotLights:E.spot.length,numSpotLightMaps:E.spotLightMap.length,numRectAreaLights:E.rectArea.length,numHemiLights:E.hemi.length,numDirLightShadows:E.directionalShadowMap.length,numPointLightShadows:E.pointShadowMap.length,numSpotLightShadows:E.spotShadowMap.length,numSpotLightShadowsWithMaps:E.numSpotLightShadowsWithMaps,numLightProbes:E.numLightProbes,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:_.dithering,shadowMapEnabled:s.shadowMap.enabled&&A.length>0,shadowMapType:s.shadowMap.type,toneMapping:Me,decodeVideoTexture:ot&&_.map.isVideoTexture===!0&&we.getTransfer(_.map.colorSpace)===Pe,decodeVideoTextureEmissive:xt&&_.emissiveMap.isVideoTexture===!0&&we.getTransfer(_.emissiveMap.colorSpace)===Pe,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===nn,flipSided:_.side===Tn,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:ie&&_.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ie&&_.extensions.multiDraw===!0||K)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return Ve.vertexUv1s=h.has(1),Ve.vertexUv2s=h.has(2),Ve.vertexUv3s=h.has(3),h.clear(),Ve}function g(_){const E=[];if(_.shaderID?E.push(_.shaderID):(E.push(_.customVertexShaderID),E.push(_.customFragmentShaderID)),_.defines!==void 0)for(const A in _.defines)E.push(A),E.push(_.defines[A]);return _.isRawShaderMaterial===!1&&(w(E,_),y(E,_),E.push(s.outputColorSpace)),E.push(_.customProgramCacheKey),E.join()}function w(_,E){_.push(E.precision),_.push(E.outputColorSpace),_.push(E.envMapMode),_.push(E.envMapCubeUVHeight),_.push(E.mapUv),_.push(E.alphaMapUv),_.push(E.lightMapUv),_.push(E.aoMapUv),_.push(E.bumpMapUv),_.push(E.normalMapUv),_.push(E.displacementMapUv),_.push(E.emissiveMapUv),_.push(E.metalnessMapUv),_.push(E.roughnessMapUv),_.push(E.anisotropyMapUv),_.push(E.clearcoatMapUv),_.push(E.clearcoatNormalMapUv),_.push(E.clearcoatRoughnessMapUv),_.push(E.iridescenceMapUv),_.push(E.iridescenceThicknessMapUv),_.push(E.sheenColorMapUv),_.push(E.sheenRoughnessMapUv),_.push(E.specularMapUv),_.push(E.specularColorMapUv),_.push(E.specularIntensityMapUv),_.push(E.transmissionMapUv),_.push(E.thicknessMapUv),_.push(E.combine),_.push(E.fogExp2),_.push(E.sizeAttenuation),_.push(E.morphTargetsCount),_.push(E.morphAttributeCount),_.push(E.numDirLights),_.push(E.numPointLights),_.push(E.numSpotLights),_.push(E.numSpotLightMaps),_.push(E.numHemiLights),_.push(E.numRectAreaLights),_.push(E.numDirLightShadows),_.push(E.numPointLightShadows),_.push(E.numSpotLightShadows),_.push(E.numSpotLightShadowsWithMaps),_.push(E.numLightProbes),_.push(E.shadowMapType),_.push(E.toneMapping),_.push(E.numClippingPlanes),_.push(E.numClipIntersection),_.push(E.depthPacking)}function y(_,E){a.disableAll(),E.supportsVertexTextures&&a.enable(0),E.instancing&&a.enable(1),E.instancingColor&&a.enable(2),E.instancingMorph&&a.enable(3),E.matcap&&a.enable(4),E.envMap&&a.enable(5),E.normalMapObjectSpace&&a.enable(6),E.normalMapTangentSpace&&a.enable(7),E.clearcoat&&a.enable(8),E.iridescence&&a.enable(9),E.alphaTest&&a.enable(10),E.vertexColors&&a.enable(11),E.vertexAlphas&&a.enable(12),E.vertexUv1s&&a.enable(13),E.vertexUv2s&&a.enable(14),E.vertexUv3s&&a.enable(15),E.vertexTangents&&a.enable(16),E.anisotropy&&a.enable(17),E.alphaHash&&a.enable(18),E.batching&&a.enable(19),E.dispersion&&a.enable(20),E.batchingColor&&a.enable(21),_.push(a.mask),a.disableAll(),E.fog&&a.enable(0),E.useFog&&a.enable(1),E.flatShading&&a.enable(2),E.logarithmicDepthBuffer&&a.enable(3),E.reverseDepthBuffer&&a.enable(4),E.skinning&&a.enable(5),E.morphTargets&&a.enable(6),E.morphNormals&&a.enable(7),E.morphColors&&a.enable(8),E.premultipliedAlpha&&a.enable(9),E.shadowMapEnabled&&a.enable(10),E.doubleSided&&a.enable(11),E.flipSided&&a.enable(12),E.useDepthPacking&&a.enable(13),E.dithering&&a.enable(14),E.transmission&&a.enable(15),E.sheen&&a.enable(16),E.opaque&&a.enable(17),E.pointsUvs&&a.enable(18),E.decodeVideoTexture&&a.enable(19),E.decodeVideoTextureEmissive&&a.enable(20),E.alphaToCoverage&&a.enable(21),_.push(a.mask)}function x(_){const E=f[_.type];let A;if(E){const U=mi[E];A=xp.clone(U.uniforms)}else A=_.uniforms;return A}function b(_,E){let A;for(let U=0,F=c.length;U<F;U++){const I=c[U];if(I.cacheKey===E){A=I,++A.usedTimes;break}}return A===void 0&&(A=new Lv(s,E,_,o),c.push(A)),A}function M(_){if(--_.usedTimes===0){const E=c.indexOf(_);c[E]=c[c.length-1],c.pop(),_.destroy()}}function S(_){l.remove(_)}function T(){l.dispose()}return{getParameters:m,getProgramCacheKey:g,getUniforms:x,acquireProgram:b,releaseProgram:M,releaseShaderCache:S,programs:c,dispose:T}}function Uv(){let s=new WeakMap;function t(r){return s.has(r)}function e(r){let a=s.get(r);return a===void 0&&(a={},s.set(r,a)),a}function n(r){s.delete(r)}function i(r,a,l){s.get(r)[a]=l}function o(){s=new WeakMap}return{has:t,get:e,remove:n,update:i,dispose:o}}function Fv(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.material.id!==t.material.id?s.material.id-t.material.id:s.z!==t.z?s.z-t.z:s.id-t.id}function A0(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.z!==t.z?t.z-s.z:s.id-t.id}function C0(){const s=[];let t=0;const e=[],n=[],i=[];function o(){t=0,e.length=0,n.length=0,i.length=0}function r(d,u,p,f,v,m){let g=s[t];return g===void 0?(g={id:d.id,object:d,geometry:u,material:p,groupOrder:f,renderOrder:d.renderOrder,z:v,group:m},s[t]=g):(g.id=d.id,g.object=d,g.geometry=u,g.material=p,g.groupOrder=f,g.renderOrder=d.renderOrder,g.z=v,g.group=m),t++,g}function a(d,u,p,f,v,m){const g=r(d,u,p,f,v,m);p.transmission>0?n.push(g):p.transparent===!0?i.push(g):e.push(g)}function l(d,u,p,f,v,m){const g=r(d,u,p,f,v,m);p.transmission>0?n.unshift(g):p.transparent===!0?i.unshift(g):e.unshift(g)}function h(d,u){e.length>1&&e.sort(d||Fv),n.length>1&&n.sort(u||A0),i.length>1&&i.sort(u||A0)}function c(){for(let d=t,u=s.length;d<u;d++){const p=s[d];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:e,transmissive:n,transparent:i,init:o,push:a,unshift:l,finish:c,sort:h}}function kv(){let s=new WeakMap;function t(n,i){const o=s.get(n);let r;return o===void 0?(r=new C0,s.set(n,[r])):i>=o.length?(r=new C0,o.push(r)):r=o[i],r}function e(){s=new WeakMap}return{get:t,dispose:e}}function Ov(){const s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new C,color:new Vt};break;case"SpotLight":e={position:new C,direction:new C,color:new Vt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new C,color:new Vt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new C,skyColor:new Vt,groundColor:new Vt};break;case"RectAreaLight":e={color:new Vt,position:new C,halfWidth:new C,halfHeight:new C};break}return s[t.id]=e,e}}}function Bv(){const s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Rt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Rt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Rt,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[t.id]=e,e}}}let Hv=0;function Gv(s,t){return(t.castShadow?2:0)-(s.castShadow?2:0)+(t.map?1:0)-(s.map?1:0)}function Vv(s){const t=new Ov,e=Bv(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let h=0;h<9;h++)n.probe.push(new C);const i=new C,o=new jt,r=new jt;function a(h){let c=0,d=0,u=0;for(let _=0;_<9;_++)n.probe[_].set(0,0,0);let p=0,f=0,v=0,m=0,g=0,w=0,y=0,x=0,b=0,M=0,S=0;h.sort(Gv);for(let _=0,E=h.length;_<E;_++){const A=h[_],U=A.color,F=A.intensity,I=A.distance,B=A.shadow&&A.shadow.map?A.shadow.map.texture:null;if(A.isAmbientLight)c+=U.r*F,d+=U.g*F,u+=U.b*F;else if(A.isLightProbe){for(let k=0;k<9;k++)n.probe[k].addScaledVector(A.sh.coefficients[k],F);S++}else if(A.isDirectionalLight){const k=t.get(A);if(k.color.copy(A.color).multiplyScalar(A.intensity),A.castShadow){const P=A.shadow,H=e.get(A);H.shadowIntensity=P.intensity,H.shadowBias=P.bias,H.shadowNormalBias=P.normalBias,H.shadowRadius=P.radius,H.shadowMapSize=P.mapSize,n.directionalShadow[p]=H,n.directionalShadowMap[p]=B,n.directionalShadowMatrix[p]=A.shadow.matrix,w++}n.directional[p]=k,p++}else if(A.isSpotLight){const k=t.get(A);k.position.setFromMatrixPosition(A.matrixWorld),k.color.copy(U).multiplyScalar(F),k.distance=I,k.coneCos=Math.cos(A.angle),k.penumbraCos=Math.cos(A.angle*(1-A.penumbra)),k.decay=A.decay,n.spot[v]=k;const P=A.shadow;if(A.map&&(n.spotLightMap[b]=A.map,b++,P.updateMatrices(A),A.castShadow&&M++),n.spotLightMatrix[v]=P.matrix,A.castShadow){const H=e.get(A);H.shadowIntensity=P.intensity,H.shadowBias=P.bias,H.shadowNormalBias=P.normalBias,H.shadowRadius=P.radius,H.shadowMapSize=P.mapSize,n.spotShadow[v]=H,n.spotShadowMap[v]=B,x++}v++}else if(A.isRectAreaLight){const k=t.get(A);k.color.copy(U).multiplyScalar(F),k.halfWidth.set(A.width*.5,0,0),k.halfHeight.set(0,A.height*.5,0),n.rectArea[m]=k,m++}else if(A.isPointLight){const k=t.get(A);if(k.color.copy(A.color).multiplyScalar(A.intensity),k.distance=A.distance,k.decay=A.decay,A.castShadow){const P=A.shadow,H=e.get(A);H.shadowIntensity=P.intensity,H.shadowBias=P.bias,H.shadowNormalBias=P.normalBias,H.shadowRadius=P.radius,H.shadowMapSize=P.mapSize,H.shadowCameraNear=P.camera.near,H.shadowCameraFar=P.camera.far,n.pointShadow[f]=H,n.pointShadowMap[f]=B,n.pointShadowMatrix[f]=A.shadow.matrix,y++}n.point[f]=k,f++}else if(A.isHemisphereLight){const k=t.get(A);k.skyColor.copy(A.color).multiplyScalar(F),k.groundColor.copy(A.groundColor).multiplyScalar(F),n.hemi[g]=k,g++}}m>0&&(s.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Ut.LTC_FLOAT_1,n.rectAreaLTC2=Ut.LTC_FLOAT_2):(n.rectAreaLTC1=Ut.LTC_HALF_1,n.rectAreaLTC2=Ut.LTC_HALF_2)),n.ambient[0]=c,n.ambient[1]=d,n.ambient[2]=u;const T=n.hash;(T.directionalLength!==p||T.pointLength!==f||T.spotLength!==v||T.rectAreaLength!==m||T.hemiLength!==g||T.numDirectionalShadows!==w||T.numPointShadows!==y||T.numSpotShadows!==x||T.numSpotMaps!==b||T.numLightProbes!==S)&&(n.directional.length=p,n.spot.length=v,n.rectArea.length=m,n.point.length=f,n.hemi.length=g,n.directionalShadow.length=w,n.directionalShadowMap.length=w,n.pointShadow.length=y,n.pointShadowMap.length=y,n.spotShadow.length=x,n.spotShadowMap.length=x,n.directionalShadowMatrix.length=w,n.pointShadowMatrix.length=y,n.spotLightMatrix.length=x+b-M,n.spotLightMap.length=b,n.numSpotLightShadowsWithMaps=M,n.numLightProbes=S,T.directionalLength=p,T.pointLength=f,T.spotLength=v,T.rectAreaLength=m,T.hemiLength=g,T.numDirectionalShadows=w,T.numPointShadows=y,T.numSpotShadows=x,T.numSpotMaps=b,T.numLightProbes=S,n.version=Hv++)}function l(h,c){let d=0,u=0,p=0,f=0,v=0;const m=c.matrixWorldInverse;for(let g=0,w=h.length;g<w;g++){const y=h[g];if(y.isDirectionalLight){const x=n.directional[d];x.direction.setFromMatrixPosition(y.matrixWorld),i.setFromMatrixPosition(y.target.matrixWorld),x.direction.sub(i),x.direction.transformDirection(m),d++}else if(y.isSpotLight){const x=n.spot[p];x.position.setFromMatrixPosition(y.matrixWorld),x.position.applyMatrix4(m),x.direction.setFromMatrixPosition(y.matrixWorld),i.setFromMatrixPosition(y.target.matrixWorld),x.direction.sub(i),x.direction.transformDirection(m),p++}else if(y.isRectAreaLight){const x=n.rectArea[f];x.position.setFromMatrixPosition(y.matrixWorld),x.position.applyMatrix4(m),r.identity(),o.copy(y.matrixWorld),o.premultiply(m),r.extractRotation(o),x.halfWidth.set(y.width*.5,0,0),x.halfHeight.set(0,y.height*.5,0),x.halfWidth.applyMatrix4(r),x.halfHeight.applyMatrix4(r),f++}else if(y.isPointLight){const x=n.point[u];x.position.setFromMatrixPosition(y.matrixWorld),x.position.applyMatrix4(m),u++}else if(y.isHemisphereLight){const x=n.hemi[v];x.direction.setFromMatrixPosition(y.matrixWorld),x.direction.transformDirection(m),v++}}}return{setup:a,setupView:l,state:n}}function R0(s){const t=new Vv(s),e=[],n=[];function i(c){h.camera=c,e.length=0,n.length=0}function o(c){e.push(c)}function r(c){n.push(c)}function a(){t.setup(e)}function l(c){t.setupView(e,c)}const h={lightsArray:e,shadowsArray:n,camera:null,lights:t,transmissionRenderTarget:{}};return{init:i,state:h,setupLights:a,setupLightsView:l,pushLight:o,pushShadow:r}}function Wv(s){let t=new WeakMap;function e(i,o=0){const r=t.get(i);let a;return r===void 0?(a=new R0(s),t.set(i,[a])):o>=r.length?(a=new R0(s),r.push(a)):a=r[o],a}function n(){t=new WeakMap}return{get:e,dispose:n}}class ud extends zo{static get type(){return"MeshDepthMaterial"}constructor(t){super(),this.isMeshDepthMaterial=!0,this.depthPacking=Sf,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class Xv extends zo{static get type(){return"MeshDistanceMaterial"}constructor(t){super(),this.isMeshDistanceMaterial=!0,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}const qv=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Yv=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function $v(s,t,e){let n=new Us;const i=new Rt,o=new Rt,r=new ze,a=new ud({depthPacking:Xu}),l=new Xv,h={},c=e.maxTextureSize,d={[Yi]:Tn,[Tn]:Yi,[nn]:nn},u=new Oe({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Rt},radius:{value:4}},vertexShader:qv,fragmentShader:Yv}),p=u.clone();p.defines.HORIZONTAL_PASS=1;const f=new oe;f.setAttribute("position",new _e(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const v=new pe(f,u),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Du;let g=this.type;this.render=function(M,S,T){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||M.length===0)return;const _=s.getRenderTarget(),E=s.getActiveCubeFace(),A=s.getActiveMipmapLevel(),U=s.state;U.setBlending(cs),U.buffers.color.setClear(1,1,1,1),U.buffers.depth.setTest(!0),U.setScissorTest(!1);const F=g!==Fi&&this.type===Fi,I=g===Fi&&this.type!==Fi;for(let B=0,k=M.length;B<k;B++){const P=M[B],H=P.shadow;if(H===void 0){console.warn("THREE.WebGLShadowMap:",P,"has no shadow.");continue}if(H.autoUpdate===!1&&H.needsUpdate===!1)continue;i.copy(H.mapSize);const G=H.getFrameExtents();if(i.multiply(G),o.copy(H.mapSize),(i.x>c||i.y>c)&&(i.x>c&&(o.x=Math.floor(c/G.x),i.x=o.x*G.x,H.mapSize.x=o.x),i.y>c&&(o.y=Math.floor(c/G.y),i.y=o.y*G.y,H.mapSize.y=o.y)),H.map===null||F===!0||I===!0){const $=this.type!==Fi?{minFilter:Nn,magFilter:Nn}:{};H.map!==null&&H.map.dispose(),H.map=new vn(i.x,i.y,$),H.map.texture.name=P.name+".shadowMap",H.camera.updateProjectionMatrix()}s.setRenderTarget(H.map),s.clear();const N=H.getViewportCount();for(let $=0;$<N;$++){const W=H.getViewport($);r.set(o.x*W.x,o.y*W.y,o.x*W.z,o.y*W.w),U.viewport(r),H.updateMatrices(P,$),n=H.getFrustum(),x(S,T,H.camera,P,this.type)}H.isPointLightShadow!==!0&&this.type===Fi&&w(H,T),H.needsUpdate=!1}g=this.type,m.needsUpdate=!1,s.setRenderTarget(_,E,A)};function w(M,S){const T=t.update(v);u.defines.VSM_SAMPLES!==M.blurSamples&&(u.defines.VSM_SAMPLES=M.blurSamples,p.defines.VSM_SAMPLES=M.blurSamples,u.needsUpdate=!0,p.needsUpdate=!0),M.mapPass===null&&(M.mapPass=new vn(i.x,i.y)),u.uniforms.shadow_pass.value=M.map.texture,u.uniforms.resolution.value=M.mapSize,u.uniforms.radius.value=M.radius,s.setRenderTarget(M.mapPass),s.clear(),s.renderBufferDirect(S,null,T,u,v,null),p.uniforms.shadow_pass.value=M.mapPass.texture,p.uniforms.resolution.value=M.mapSize,p.uniforms.radius.value=M.radius,s.setRenderTarget(M.map),s.clear(),s.renderBufferDirect(S,null,T,p,v,null)}function y(M,S,T,_){let E=null;const A=T.isPointLight===!0?M.customDistanceMaterial:M.customDepthMaterial;if(A!==void 0)E=A;else if(E=T.isPointLight===!0?l:a,s.localClippingEnabled&&S.clipShadows===!0&&Array.isArray(S.clippingPlanes)&&S.clippingPlanes.length!==0||S.displacementMap&&S.displacementScale!==0||S.alphaMap&&S.alphaTest>0||S.map&&S.alphaTest>0){const U=E.uuid,F=S.uuid;let I=h[U];I===void 0&&(I={},h[U]=I);let B=I[F];B===void 0&&(B=E.clone(),I[F]=B,S.addEventListener("dispose",b)),E=B}if(E.visible=S.visible,E.wireframe=S.wireframe,_===Fi?E.side=S.shadowSide!==null?S.shadowSide:S.side:E.side=S.shadowSide!==null?S.shadowSide:d[S.side],E.alphaMap=S.alphaMap,E.alphaTest=S.alphaTest,E.map=S.map,E.clipShadows=S.clipShadows,E.clippingPlanes=S.clippingPlanes,E.clipIntersection=S.clipIntersection,E.displacementMap=S.displacementMap,E.displacementScale=S.displacementScale,E.displacementBias=S.displacementBias,E.wireframeLinewidth=S.wireframeLinewidth,E.linewidth=S.linewidth,T.isPointLight===!0&&E.isMeshDistanceMaterial===!0){const U=s.properties.get(E);U.light=T}return E}function x(M,S,T,_,E){if(M.visible===!1)return;if(M.layers.test(S.layers)&&(M.isMesh||M.isLine||M.isPoints)&&(M.castShadow||M.receiveShadow&&E===Fi)&&(!M.frustumCulled||n.intersectsObject(M))){M.modelViewMatrix.multiplyMatrices(T.matrixWorldInverse,M.matrixWorld);const F=t.update(M),I=M.material;if(Array.isArray(I)){const B=F.groups;for(let k=0,P=B.length;k<P;k++){const H=B[k],G=I[H.materialIndex];if(G&&G.visible){const N=y(M,G,_,E);M.onBeforeShadow(s,M,S,T,F,N,H),s.renderBufferDirect(T,null,F,N,M,H),M.onAfterShadow(s,M,S,T,F,N,H)}}}else if(I.visible){const B=y(M,I,_,E);M.onBeforeShadow(s,M,S,T,F,B,null),s.renderBufferDirect(T,null,F,B,M,null),M.onAfterShadow(s,M,S,T,F,B,null)}}const U=M.children;for(let F=0,I=U.length;F<I;F++)x(U[F],S,T,_,E)}function b(M){M.target.removeEventListener("dispose",b);for(const T in h){const _=h[T],E=M.target.uuid;E in _&&(_[E].dispose(),delete _[E])}}}const jv={[ec]:nc,[ic]:rc,[sc]:ac,[_o]:oc,[nc]:ec,[rc]:ic,[ac]:sc,[oc]:_o};function Zv(s,t){function e(){let Y=!1;const zt=new ze;let mt=null;const wt=new ze(0,0,0,0);return{setMask:function(Et){mt!==Et&&!Y&&(s.colorMask(Et,Et,Et,Et),mt=Et)},setLocked:function(Et){Y=Et},setClear:function(Et,Tt,ie,Me,Ve){Ve===!0&&(Et*=Me,Tt*=Me,ie*=Me),zt.set(Et,Tt,ie,Me),wt.equals(zt)===!1&&(s.clearColor(Et,Tt,ie,Me),wt.copy(zt))},reset:function(){Y=!1,mt=null,wt.set(-1,0,0,0)}}}function n(){let Y=!1,zt=!1,mt=null,wt=null,Et=null;return{setReversed:function(Tt){if(zt!==Tt){const ie=t.get("EXT_clip_control");zt?ie.clipControlEXT(ie.LOWER_LEFT_EXT,ie.ZERO_TO_ONE_EXT):ie.clipControlEXT(ie.LOWER_LEFT_EXT,ie.NEGATIVE_ONE_TO_ONE_EXT);const Me=Et;Et=null,this.setClear(Me)}zt=Tt},getReversed:function(){return zt},setTest:function(Tt){Tt?st(s.DEPTH_TEST):ct(s.DEPTH_TEST)},setMask:function(Tt){mt!==Tt&&!Y&&(s.depthMask(Tt),mt=Tt)},setFunc:function(Tt){if(zt&&(Tt=jv[Tt]),wt!==Tt){switch(Tt){case ec:s.depthFunc(s.NEVER);break;case nc:s.depthFunc(s.ALWAYS);break;case ic:s.depthFunc(s.LESS);break;case _o:s.depthFunc(s.LEQUAL);break;case sc:s.depthFunc(s.EQUAL);break;case oc:s.depthFunc(s.GEQUAL);break;case rc:s.depthFunc(s.GREATER);break;case ac:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}wt=Tt}},setLocked:function(Tt){Y=Tt},setClear:function(Tt){Et!==Tt&&(zt&&(Tt=1-Tt),s.clearDepth(Tt),Et=Tt)},reset:function(){Y=!1,mt=null,wt=null,Et=null,zt=!1}}}function i(){let Y=!1,zt=null,mt=null,wt=null,Et=null,Tt=null,ie=null,Me=null,Ve=null;return{setTest:function(ue){Y||(ue?st(s.STENCIL_TEST):ct(s.STENCIL_TEST))},setMask:function(ue){zt!==ue&&!Y&&(s.stencilMask(ue),zt=ue)},setFunc:function(ue,Ue,dn){(mt!==ue||wt!==Ue||Et!==dn)&&(s.stencilFunc(ue,Ue,dn),mt=ue,wt=Ue,Et=dn)},setOp:function(ue,Ue,dn){(Tt!==ue||ie!==Ue||Me!==dn)&&(s.stencilOp(ue,Ue,dn),Tt=ue,ie=Ue,Me=dn)},setLocked:function(ue){Y=ue},setClear:function(ue){Ve!==ue&&(s.clearStencil(ue),Ve=ue)},reset:function(){Y=!1,zt=null,mt=null,wt=null,Et=null,Tt=null,ie=null,Me=null,Ve=null}}}const o=new e,r=new n,a=new i,l=new WeakMap,h=new WeakMap;let c={},d={},u=new WeakMap,p=[],f=null,v=!1,m=null,g=null,w=null,y=null,x=null,b=null,M=null,S=new Vt(0,0,0),T=0,_=!1,E=null,A=null,U=null,F=null,I=null;const B=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let k=!1,P=0;const H=s.getParameter(s.VERSION);H.indexOf("WebGL")!==-1?(P=parseFloat(/^WebGL (\d)/.exec(H)[1]),k=P>=1):H.indexOf("OpenGL ES")!==-1&&(P=parseFloat(/^OpenGL ES (\d)/.exec(H)[1]),k=P>=2);let G=null,N={};const $=s.getParameter(s.SCISSOR_BOX),W=s.getParameter(s.VIEWPORT),et=new ze().fromArray($),X=new ze().fromArray(W);function q(Y,zt,mt,wt){const Et=new Uint8Array(4),Tt=s.createTexture();s.bindTexture(Y,Tt),s.texParameteri(Y,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(Y,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let ie=0;ie<mt;ie++)Y===s.TEXTURE_3D||Y===s.TEXTURE_2D_ARRAY?s.texImage3D(zt,0,s.RGBA,1,1,wt,0,s.RGBA,s.UNSIGNED_BYTE,Et):s.texImage2D(zt+ie,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,Et);return Tt}const V={};V[s.TEXTURE_2D]=q(s.TEXTURE_2D,s.TEXTURE_2D,1),V[s.TEXTURE_CUBE_MAP]=q(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),V[s.TEXTURE_2D_ARRAY]=q(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),V[s.TEXTURE_3D]=q(s.TEXTURE_3D,s.TEXTURE_3D,1,1),o.setClear(0,0,0,1),r.setClear(1),a.setClear(0),st(s.DEPTH_TEST),r.setFunc(_o),Z(!1),rt(Dh),st(s.CULL_FACE),D(cs);function st(Y){c[Y]!==!0&&(s.enable(Y),c[Y]=!0)}function ct(Y){c[Y]!==!1&&(s.disable(Y),c[Y]=!1)}function pt(Y,zt){return d[Y]!==zt?(s.bindFramebuffer(Y,zt),d[Y]=zt,Y===s.DRAW_FRAMEBUFFER&&(d[s.FRAMEBUFFER]=zt),Y===s.FRAMEBUFFER&&(d[s.DRAW_FRAMEBUFFER]=zt),!0):!1}function K(Y,zt){let mt=p,wt=!1;if(Y){mt=u.get(zt),mt===void 0&&(mt=[],u.set(zt,mt));const Et=Y.textures;if(mt.length!==Et.length||mt[0]!==s.COLOR_ATTACHMENT0){for(let Tt=0,ie=Et.length;Tt<ie;Tt++)mt[Tt]=s.COLOR_ATTACHMENT0+Tt;mt.length=Et.length,wt=!0}}else mt[0]!==s.BACK&&(mt[0]=s.BACK,wt=!0);wt&&s.drawBuffers(mt)}function ot(Y){return f!==Y?(s.useProgram(Y),f=Y,!0):!1}const j={[Ps]:s.FUNC_ADD,[Zd]:s.FUNC_SUBTRACT,[Kd]:s.FUNC_REVERSE_SUBTRACT};j[Jd]=s.MIN,j[Qd]=s.MAX;const nt={[tf]:s.ZERO,[ef]:s.ONE,[nf]:s.SRC_COLOR,[Ql]:s.SRC_ALPHA,[cf]:s.SRC_ALPHA_SATURATE,[af]:s.DST_COLOR,[of]:s.DST_ALPHA,[sf]:s.ONE_MINUS_SRC_COLOR,[tc]:s.ONE_MINUS_SRC_ALPHA,[lf]:s.ONE_MINUS_DST_COLOR,[rf]:s.ONE_MINUS_DST_ALPHA,[hf]:s.CONSTANT_COLOR,[uf]:s.ONE_MINUS_CONSTANT_COLOR,[df]:s.CONSTANT_ALPHA,[ff]:s.ONE_MINUS_CONSTANT_ALPHA};function D(Y,zt,mt,wt,Et,Tt,ie,Me,Ve,ue){if(Y===cs){v===!0&&(ct(s.BLEND),v=!1);return}if(v===!1&&(st(s.BLEND),v=!0),Y!==jd){if(Y!==m||ue!==_){if((g!==Ps||x!==Ps)&&(s.blendEquation(s.FUNC_ADD),g=Ps,x=Ps),ue)switch(Y){case Gi:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case Ih:s.blendFunc(s.ONE,s.ONE);break;case zh:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case Nh:s.blendFuncSeparate(s.ZERO,s.SRC_COLOR,s.ZERO,s.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",Y);break}else switch(Y){case Gi:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case Ih:s.blendFunc(s.SRC_ALPHA,s.ONE);break;case zh:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case Nh:s.blendFunc(s.ZERO,s.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",Y);break}w=null,y=null,b=null,M=null,S.set(0,0,0),T=0,m=Y,_=ue}return}Et=Et||zt,Tt=Tt||mt,ie=ie||wt,(zt!==g||Et!==x)&&(s.blendEquationSeparate(j[zt],j[Et]),g=zt,x=Et),(mt!==w||wt!==y||Tt!==b||ie!==M)&&(s.blendFuncSeparate(nt[mt],nt[wt],nt[Tt],nt[ie]),w=mt,y=wt,b=Tt,M=ie),(Me.equals(S)===!1||Ve!==T)&&(s.blendColor(Me.r,Me.g,Me.b,Ve),S.copy(Me),T=Ve),m=Y,_=!1}function J(Y,zt){Y.side===nn?ct(s.CULL_FACE):st(s.CULL_FACE);let mt=Y.side===Tn;zt&&(mt=!mt),Z(mt),Y.blending===Gi&&Y.transparent===!1?D(cs):D(Y.blending,Y.blendEquation,Y.blendSrc,Y.blendDst,Y.blendEquationAlpha,Y.blendSrcAlpha,Y.blendDstAlpha,Y.blendColor,Y.blendAlpha,Y.premultipliedAlpha),r.setFunc(Y.depthFunc),r.setTest(Y.depthTest),r.setMask(Y.depthWrite),o.setMask(Y.colorWrite);const wt=Y.stencilWrite;a.setTest(wt),wt&&(a.setMask(Y.stencilWriteMask),a.setFunc(Y.stencilFunc,Y.stencilRef,Y.stencilFuncMask),a.setOp(Y.stencilFail,Y.stencilZFail,Y.stencilZPass)),xt(Y.polygonOffset,Y.polygonOffsetFactor,Y.polygonOffsetUnits),Y.alphaToCoverage===!0?st(s.SAMPLE_ALPHA_TO_COVERAGE):ct(s.SAMPLE_ALPHA_TO_COVERAGE)}function Z(Y){E!==Y&&(Y?s.frontFace(s.CW):s.frontFace(s.CCW),E=Y)}function rt(Y){Y!==Yd?(st(s.CULL_FACE),Y!==A&&(Y===Dh?s.cullFace(s.BACK):Y===$d?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):ct(s.CULL_FACE),A=Y}function dt(Y){Y!==U&&(k&&s.lineWidth(Y),U=Y)}function xt(Y,zt,mt){Y?(st(s.POLYGON_OFFSET_FILL),(F!==zt||I!==mt)&&(s.polygonOffset(zt,mt),F=zt,I=mt)):ct(s.POLYGON_OFFSET_FILL)}function ft(Y){Y?st(s.SCISSOR_TEST):ct(s.SCISSOR_TEST)}function z(Y){Y===void 0&&(Y=s.TEXTURE0+B-1),G!==Y&&(s.activeTexture(Y),G=Y)}function R(Y,zt,mt){mt===void 0&&(G===null?mt=s.TEXTURE0+B-1:mt=G);let wt=N[mt];wt===void 0&&(wt={type:void 0,texture:void 0},N[mt]=wt),(wt.type!==Y||wt.texture!==zt)&&(G!==mt&&(s.activeTexture(mt),G=mt),s.bindTexture(Y,zt||V[Y]),wt.type=Y,wt.texture=zt)}function tt(){const Y=N[G];Y!==void 0&&Y.type!==void 0&&(s.bindTexture(Y.type,null),Y.type=void 0,Y.texture=void 0)}function ht(){try{s.compressedTexImage2D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function gt(){try{s.compressedTexImage3D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function ut(){try{s.texSubImage2D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function Nt(){try{s.texSubImage3D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function bt(){try{s.compressedTexSubImage2D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function Dt(){try{s.compressedTexSubImage3D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function ee(){try{s.texStorage2D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function yt(){try{s.texStorage3D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function Ot(){try{s.texImage2D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function Yt(){try{s.texImage3D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function Ft(Y){et.equals(Y)===!1&&(s.scissor(Y.x,Y.y,Y.z,Y.w),et.copy(Y))}function Lt(Y){X.equals(Y)===!1&&(s.viewport(Y.x,Y.y,Y.z,Y.w),X.copy(Y))}function le(Y,zt){let mt=h.get(zt);mt===void 0&&(mt=new WeakMap,h.set(zt,mt));let wt=mt.get(Y);wt===void 0&&(wt=s.getUniformBlockIndex(zt,Y.name),mt.set(Y,wt))}function te(Y,zt){const wt=h.get(zt).get(Y);l.get(zt)!==wt&&(s.uniformBlockBinding(zt,wt,Y.__bindingPointIndex),l.set(zt,wt))}function ge(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),r.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),c={},G=null,N={},d={},u=new WeakMap,p=[],f=null,v=!1,m=null,g=null,w=null,y=null,x=null,b=null,M=null,S=new Vt(0,0,0),T=0,_=!1,E=null,A=null,U=null,F=null,I=null,et.set(0,0,s.canvas.width,s.canvas.height),X.set(0,0,s.canvas.width,s.canvas.height),o.reset(),r.reset(),a.reset()}return{buffers:{color:o,depth:r,stencil:a},enable:st,disable:ct,bindFramebuffer:pt,drawBuffers:K,useProgram:ot,setBlending:D,setMaterial:J,setFlipSided:Z,setCullFace:rt,setLineWidth:dt,setPolygonOffset:xt,setScissorTest:ft,activeTexture:z,bindTexture:R,unbindTexture:tt,compressedTexImage2D:ht,compressedTexImage3D:gt,texImage2D:Ot,texImage3D:Yt,updateUBOMapping:le,uniformBlockBinding:te,texStorage2D:ee,texStorage3D:yt,texSubImage2D:ut,texSubImage3D:Nt,compressedTexSubImage2D:bt,compressedTexSubImage3D:Dt,scissor:Ft,viewport:Lt,reset:ge}}function P0(s,t,e,n){const i=Kv(n);switch(e){case Ou:return s*t;case Hu:return s*t;case Gu:return s*t*2;case Sr:return s*t/i.components*i.byteLength;case Ua:return s*t/i.components*i.byteLength;case Vu:return s*t*2/i.components*i.byteLength;case Kc:return s*t*2/i.components*i.byteLength;case Bu:return s*t*3/i.components*i.byteLength;case En:return s*t*4/i.components*i.byteLength;case Jc:return s*t*4/i.components*i.byteLength;case va:case xa:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*8;case wa:case ya:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case dc:case pc:return Math.max(s,16)*Math.max(t,8)/4;case uc:case fc:return Math.max(s,8)*Math.max(t,8)/2;case mc:case gc:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*8;case vc:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case xc:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case wc:return Math.floor((s+4)/5)*Math.floor((t+3)/4)*16;case yc:return Math.floor((s+4)/5)*Math.floor((t+4)/5)*16;case _c:return Math.floor((s+5)/6)*Math.floor((t+4)/5)*16;case Mc:return Math.floor((s+5)/6)*Math.floor((t+5)/6)*16;case bc:return Math.floor((s+7)/8)*Math.floor((t+4)/5)*16;case Sc:return Math.floor((s+7)/8)*Math.floor((t+5)/6)*16;case Ec:return Math.floor((s+7)/8)*Math.floor((t+7)/8)*16;case Tc:return Math.floor((s+9)/10)*Math.floor((t+4)/5)*16;case Ac:return Math.floor((s+9)/10)*Math.floor((t+5)/6)*16;case Cc:return Math.floor((s+9)/10)*Math.floor((t+7)/8)*16;case Rc:return Math.floor((s+9)/10)*Math.floor((t+9)/10)*16;case Pc:return Math.floor((s+11)/12)*Math.floor((t+9)/10)*16;case Lc:return Math.floor((s+11)/12)*Math.floor((t+11)/12)*16;case _a:case Dc:case Ic:return Math.ceil(s/4)*Math.ceil(t/4)*16;case Wu:case zc:return Math.ceil(s/4)*Math.ceil(t/4)*8;case Nc:case Uc:return Math.ceil(s/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function Kv(s){switch(s){case ti:case Uu:return{byteLength:1,components:1};case br:case Fu:case In:return{byteLength:2,components:1};case jc:case Zc:return{byteLength:2,components:4};case wi:case $c:case $n:return{byteLength:4,components:1};case ku:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${s}.`)}function Jv(s,t,e,n,i,o,r){const a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),h=new Rt,c=new WeakMap;let d;const u=new WeakMap;let p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function f(z,R){return p?new OffscreenCanvas(z,R):Ea("canvas")}function v(z,R,tt){let ht=1;const gt=ft(z);if((gt.width>tt||gt.height>tt)&&(ht=tt/Math.max(gt.width,gt.height)),ht<1)if(typeof HTMLImageElement<"u"&&z instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&z instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&z instanceof ImageBitmap||typeof VideoFrame<"u"&&z instanceof VideoFrame){const ut=Math.floor(ht*gt.width),Nt=Math.floor(ht*gt.height);d===void 0&&(d=f(ut,Nt));const bt=R?f(ut,Nt):d;return bt.width=ut,bt.height=Nt,bt.getContext("2d").drawImage(z,0,0,ut,Nt),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+gt.width+"x"+gt.height+") to ("+ut+"x"+Nt+")."),bt}else return"data"in z&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+gt.width+"x"+gt.height+")."),z;return z}function m(z){return z.generateMipmaps}function g(z){s.generateMipmap(z)}function w(z){return z.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:z.isWebGL3DRenderTarget?s.TEXTURE_3D:z.isWebGLArrayRenderTarget||z.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function y(z,R,tt,ht,gt=!1){if(z!==null){if(s[z]!==void 0)return s[z];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+z+"'")}let ut=R;if(R===s.RED&&(tt===s.FLOAT&&(ut=s.R32F),tt===s.HALF_FLOAT&&(ut=s.R16F),tt===s.UNSIGNED_BYTE&&(ut=s.R8)),R===s.RED_INTEGER&&(tt===s.UNSIGNED_BYTE&&(ut=s.R8UI),tt===s.UNSIGNED_SHORT&&(ut=s.R16UI),tt===s.UNSIGNED_INT&&(ut=s.R32UI),tt===s.BYTE&&(ut=s.R8I),tt===s.SHORT&&(ut=s.R16I),tt===s.INT&&(ut=s.R32I)),R===s.RG&&(tt===s.FLOAT&&(ut=s.RG32F),tt===s.HALF_FLOAT&&(ut=s.RG16F),tt===s.UNSIGNED_BYTE&&(ut=s.RG8)),R===s.RG_INTEGER&&(tt===s.UNSIGNED_BYTE&&(ut=s.RG8UI),tt===s.UNSIGNED_SHORT&&(ut=s.RG16UI),tt===s.UNSIGNED_INT&&(ut=s.RG32UI),tt===s.BYTE&&(ut=s.RG8I),tt===s.SHORT&&(ut=s.RG16I),tt===s.INT&&(ut=s.RG32I)),R===s.RGB_INTEGER&&(tt===s.UNSIGNED_BYTE&&(ut=s.RGB8UI),tt===s.UNSIGNED_SHORT&&(ut=s.RGB16UI),tt===s.UNSIGNED_INT&&(ut=s.RGB32UI),tt===s.BYTE&&(ut=s.RGB8I),tt===s.SHORT&&(ut=s.RGB16I),tt===s.INT&&(ut=s.RGB32I)),R===s.RGBA_INTEGER&&(tt===s.UNSIGNED_BYTE&&(ut=s.RGBA8UI),tt===s.UNSIGNED_SHORT&&(ut=s.RGBA16UI),tt===s.UNSIGNED_INT&&(ut=s.RGBA32UI),tt===s.BYTE&&(ut=s.RGBA8I),tt===s.SHORT&&(ut=s.RGBA16I),tt===s.INT&&(ut=s.RGBA32I)),R===s.RGB&&tt===s.UNSIGNED_INT_5_9_9_9_REV&&(ut=s.RGB9_E5),R===s.RGBA){const Nt=gt?Fa:we.getTransfer(ht);tt===s.FLOAT&&(ut=s.RGBA32F),tt===s.HALF_FLOAT&&(ut=s.RGBA16F),tt===s.UNSIGNED_BYTE&&(ut=Nt===Pe?s.SRGB8_ALPHA8:s.RGBA8),tt===s.UNSIGNED_SHORT_4_4_4_4&&(ut=s.RGBA4),tt===s.UNSIGNED_SHORT_5_5_5_1&&(ut=s.RGB5_A1)}return(ut===s.R16F||ut===s.R32F||ut===s.RG16F||ut===s.RG32F||ut===s.RGBA16F||ut===s.RGBA32F)&&t.get("EXT_color_buffer_float"),ut}function x(z,R){let tt;return z?R===null||R===wi||R===Eo?tt=s.DEPTH24_STENCIL8:R===$n?tt=s.DEPTH32F_STENCIL8:R===br&&(tt=s.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):R===null||R===wi||R===Eo?tt=s.DEPTH_COMPONENT24:R===$n?tt=s.DEPTH_COMPONENT32F:R===br&&(tt=s.DEPTH_COMPONENT16),tt}function b(z,R){return m(z)===!0||z.isFramebufferTexture&&z.minFilter!==Nn&&z.minFilter!==ye?Math.log2(Math.max(R.width,R.height))+1:z.mipmaps!==void 0&&z.mipmaps.length>0?z.mipmaps.length:z.isCompressedTexture&&Array.isArray(z.image)?R.mipmaps.length:1}function M(z){const R=z.target;R.removeEventListener("dispose",M),T(R),R.isVideoTexture&&c.delete(R)}function S(z){const R=z.target;R.removeEventListener("dispose",S),E(R)}function T(z){const R=n.get(z);if(R.__webglInit===void 0)return;const tt=z.source,ht=u.get(tt);if(ht){const gt=ht[R.__cacheKey];gt.usedTimes--,gt.usedTimes===0&&_(z),Object.keys(ht).length===0&&u.delete(tt)}n.remove(z)}function _(z){const R=n.get(z);s.deleteTexture(R.__webglTexture);const tt=z.source,ht=u.get(tt);delete ht[R.__cacheKey],r.memory.textures--}function E(z){const R=n.get(z);if(z.depthTexture&&(z.depthTexture.dispose(),n.remove(z.depthTexture)),z.isWebGLCubeRenderTarget)for(let ht=0;ht<6;ht++){if(Array.isArray(R.__webglFramebuffer[ht]))for(let gt=0;gt<R.__webglFramebuffer[ht].length;gt++)s.deleteFramebuffer(R.__webglFramebuffer[ht][gt]);else s.deleteFramebuffer(R.__webglFramebuffer[ht]);R.__webglDepthbuffer&&s.deleteRenderbuffer(R.__webglDepthbuffer[ht])}else{if(Array.isArray(R.__webglFramebuffer))for(let ht=0;ht<R.__webglFramebuffer.length;ht++)s.deleteFramebuffer(R.__webglFramebuffer[ht]);else s.deleteFramebuffer(R.__webglFramebuffer);if(R.__webglDepthbuffer&&s.deleteRenderbuffer(R.__webglDepthbuffer),R.__webglMultisampledFramebuffer&&s.deleteFramebuffer(R.__webglMultisampledFramebuffer),R.__webglColorRenderbuffer)for(let ht=0;ht<R.__webglColorRenderbuffer.length;ht++)R.__webglColorRenderbuffer[ht]&&s.deleteRenderbuffer(R.__webglColorRenderbuffer[ht]);R.__webglDepthRenderbuffer&&s.deleteRenderbuffer(R.__webglDepthRenderbuffer)}const tt=z.textures;for(let ht=0,gt=tt.length;ht<gt;ht++){const ut=n.get(tt[ht]);ut.__webglTexture&&(s.deleteTexture(ut.__webglTexture),r.memory.textures--),n.remove(tt[ht])}n.remove(z)}let A=0;function U(){A=0}function F(){const z=A;return z>=i.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+z+" texture units while this GPU supports only "+i.maxTextures),A+=1,z}function I(z){const R=[];return R.push(z.wrapS),R.push(z.wrapT),R.push(z.wrapR||0),R.push(z.magFilter),R.push(z.minFilter),R.push(z.anisotropy),R.push(z.internalFormat),R.push(z.format),R.push(z.type),R.push(z.generateMipmaps),R.push(z.premultiplyAlpha),R.push(z.flipY),R.push(z.unpackAlignment),R.push(z.colorSpace),R.join()}function B(z,R){const tt=n.get(z);if(z.isVideoTexture&&dt(z),z.isRenderTargetTexture===!1&&z.version>0&&tt.__version!==z.version){const ht=z.image;if(ht===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(ht.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{X(tt,z,R);return}}e.bindTexture(s.TEXTURE_2D,tt.__webglTexture,s.TEXTURE0+R)}function k(z,R){const tt=n.get(z);if(z.version>0&&tt.__version!==z.version){X(tt,z,R);return}e.bindTexture(s.TEXTURE_2D_ARRAY,tt.__webglTexture,s.TEXTURE0+R)}function P(z,R){const tt=n.get(z);if(z.version>0&&tt.__version!==z.version){X(tt,z,R);return}e.bindTexture(s.TEXTURE_3D,tt.__webglTexture,s.TEXTURE0+R)}function H(z,R){const tt=n.get(z);if(z.version>0&&tt.__version!==z.version){q(tt,z,R);return}e.bindTexture(s.TEXTURE_CUBE_MAP,tt.__webglTexture,s.TEXTURE0+R)}const G={[So]:s.REPEAT,[Qe]:s.CLAMP_TO_EDGE,[hc]:s.MIRRORED_REPEAT},N={[Nn]:s.NEAREST,[bf]:s.NEAREST_MIPMAP_NEAREST,[Ur]:s.NEAREST_MIPMAP_LINEAR,[ye]:s.LINEAR,[ja]:s.LINEAR_MIPMAP_NEAREST,[Bi]:s.LINEAR_MIPMAP_LINEAR},$={[Tf]:s.NEVER,[Df]:s.ALWAYS,[Af]:s.LESS,[Yu]:s.LEQUAL,[Cf]:s.EQUAL,[Lf]:s.GEQUAL,[Rf]:s.GREATER,[Pf]:s.NOTEQUAL};function W(z,R){if(R.type===$n&&t.has("OES_texture_float_linear")===!1&&(R.magFilter===ye||R.magFilter===ja||R.magFilter===Ur||R.magFilter===Bi||R.minFilter===ye||R.minFilter===ja||R.minFilter===Ur||R.minFilter===Bi)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(z,s.TEXTURE_WRAP_S,G[R.wrapS]),s.texParameteri(z,s.TEXTURE_WRAP_T,G[R.wrapT]),(z===s.TEXTURE_3D||z===s.TEXTURE_2D_ARRAY)&&s.texParameteri(z,s.TEXTURE_WRAP_R,G[R.wrapR]),s.texParameteri(z,s.TEXTURE_MAG_FILTER,N[R.magFilter]),s.texParameteri(z,s.TEXTURE_MIN_FILTER,N[R.minFilter]),R.compareFunction&&(s.texParameteri(z,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(z,s.TEXTURE_COMPARE_FUNC,$[R.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(R.magFilter===Nn||R.minFilter!==Ur&&R.minFilter!==Bi||R.type===$n&&t.has("OES_texture_float_linear")===!1)return;if(R.anisotropy>1||n.get(R).__currentAnisotropy){const tt=t.get("EXT_texture_filter_anisotropic");s.texParameterf(z,tt.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(R.anisotropy,i.getMaxAnisotropy())),n.get(R).__currentAnisotropy=R.anisotropy}}}function et(z,R){let tt=!1;z.__webglInit===void 0&&(z.__webglInit=!0,R.addEventListener("dispose",M));const ht=R.source;let gt=u.get(ht);gt===void 0&&(gt={},u.set(ht,gt));const ut=I(R);if(ut!==z.__cacheKey){gt[ut]===void 0&&(gt[ut]={texture:s.createTexture(),usedTimes:0},r.memory.textures++,tt=!0),gt[ut].usedTimes++;const Nt=gt[z.__cacheKey];Nt!==void 0&&(gt[z.__cacheKey].usedTimes--,Nt.usedTimes===0&&_(R)),z.__cacheKey=ut,z.__webglTexture=gt[ut].texture}return tt}function X(z,R,tt){let ht=s.TEXTURE_2D;(R.isDataArrayTexture||R.isCompressedArrayTexture)&&(ht=s.TEXTURE_2D_ARRAY),R.isData3DTexture&&(ht=s.TEXTURE_3D);const gt=et(z,R),ut=R.source;e.bindTexture(ht,z.__webglTexture,s.TEXTURE0+tt);const Nt=n.get(ut);if(ut.version!==Nt.__version||gt===!0){e.activeTexture(s.TEXTURE0+tt);const bt=we.getPrimaries(we.workingColorSpace),Dt=R.colorSpace===vi?null:we.getPrimaries(R.colorSpace),ee=R.colorSpace===vi||bt===Dt?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,R.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,R.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,R.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,ee);let yt=v(R.image,!1,i.maxTextureSize);yt=xt(R,yt);const Ot=o.convert(R.format,R.colorSpace),Yt=o.convert(R.type);let Ft=y(R.internalFormat,Ot,Yt,R.colorSpace,R.isVideoTexture);W(ht,R);let Lt;const le=R.mipmaps,te=R.isVideoTexture!==!0,ge=Nt.__version===void 0||gt===!0,Y=ut.dataReady,zt=b(R,yt);if(R.isDepthTexture)Ft=x(R.format===To,R.type),ge&&(te?e.texStorage2D(s.TEXTURE_2D,1,Ft,yt.width,yt.height):e.texImage2D(s.TEXTURE_2D,0,Ft,yt.width,yt.height,0,Ot,Yt,null));else if(R.isDataTexture)if(le.length>0){te&&ge&&e.texStorage2D(s.TEXTURE_2D,zt,Ft,le[0].width,le[0].height);for(let mt=0,wt=le.length;mt<wt;mt++)Lt=le[mt],te?Y&&e.texSubImage2D(s.TEXTURE_2D,mt,0,0,Lt.width,Lt.height,Ot,Yt,Lt.data):e.texImage2D(s.TEXTURE_2D,mt,Ft,Lt.width,Lt.height,0,Ot,Yt,Lt.data);R.generateMipmaps=!1}else te?(ge&&e.texStorage2D(s.TEXTURE_2D,zt,Ft,yt.width,yt.height),Y&&e.texSubImage2D(s.TEXTURE_2D,0,0,0,yt.width,yt.height,Ot,Yt,yt.data)):e.texImage2D(s.TEXTURE_2D,0,Ft,yt.width,yt.height,0,Ot,Yt,yt.data);else if(R.isCompressedTexture)if(R.isCompressedArrayTexture){te&&ge&&e.texStorage3D(s.TEXTURE_2D_ARRAY,zt,Ft,le[0].width,le[0].height,yt.depth);for(let mt=0,wt=le.length;mt<wt;mt++)if(Lt=le[mt],R.format!==En)if(Ot!==null)if(te){if(Y)if(R.layerUpdates.size>0){const Et=P0(Lt.width,Lt.height,R.format,R.type);for(const Tt of R.layerUpdates){const ie=Lt.data.subarray(Tt*Et/Lt.data.BYTES_PER_ELEMENT,(Tt+1)*Et/Lt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,mt,0,0,Tt,Lt.width,Lt.height,1,Ot,ie)}R.clearLayerUpdates()}else e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,mt,0,0,0,Lt.width,Lt.height,yt.depth,Ot,Lt.data)}else e.compressedTexImage3D(s.TEXTURE_2D_ARRAY,mt,Ft,Lt.width,Lt.height,yt.depth,0,Lt.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else te?Y&&e.texSubImage3D(s.TEXTURE_2D_ARRAY,mt,0,0,0,Lt.width,Lt.height,yt.depth,Ot,Yt,Lt.data):e.texImage3D(s.TEXTURE_2D_ARRAY,mt,Ft,Lt.width,Lt.height,yt.depth,0,Ot,Yt,Lt.data)}else{te&&ge&&e.texStorage2D(s.TEXTURE_2D,zt,Ft,le[0].width,le[0].height);for(let mt=0,wt=le.length;mt<wt;mt++)Lt=le[mt],R.format!==En?Ot!==null?te?Y&&e.compressedTexSubImage2D(s.TEXTURE_2D,mt,0,0,Lt.width,Lt.height,Ot,Lt.data):e.compressedTexImage2D(s.TEXTURE_2D,mt,Ft,Lt.width,Lt.height,0,Lt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):te?Y&&e.texSubImage2D(s.TEXTURE_2D,mt,0,0,Lt.width,Lt.height,Ot,Yt,Lt.data):e.texImage2D(s.TEXTURE_2D,mt,Ft,Lt.width,Lt.height,0,Ot,Yt,Lt.data)}else if(R.isDataArrayTexture)if(te){if(ge&&e.texStorage3D(s.TEXTURE_2D_ARRAY,zt,Ft,yt.width,yt.height,yt.depth),Y)if(R.layerUpdates.size>0){const mt=P0(yt.width,yt.height,R.format,R.type);for(const wt of R.layerUpdates){const Et=yt.data.subarray(wt*mt/yt.data.BYTES_PER_ELEMENT,(wt+1)*mt/yt.data.BYTES_PER_ELEMENT);e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,wt,yt.width,yt.height,1,Ot,Yt,Et)}R.clearLayerUpdates()}else e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,yt.width,yt.height,yt.depth,Ot,Yt,yt.data)}else e.texImage3D(s.TEXTURE_2D_ARRAY,0,Ft,yt.width,yt.height,yt.depth,0,Ot,Yt,yt.data);else if(R.isData3DTexture)te?(ge&&e.texStorage3D(s.TEXTURE_3D,zt,Ft,yt.width,yt.height,yt.depth),Y&&e.texSubImage3D(s.TEXTURE_3D,0,0,0,0,yt.width,yt.height,yt.depth,Ot,Yt,yt.data)):e.texImage3D(s.TEXTURE_3D,0,Ft,yt.width,yt.height,yt.depth,0,Ot,Yt,yt.data);else if(R.isFramebufferTexture){if(ge)if(te)e.texStorage2D(s.TEXTURE_2D,zt,Ft,yt.width,yt.height);else{let mt=yt.width,wt=yt.height;for(let Et=0;Et<zt;Et++)e.texImage2D(s.TEXTURE_2D,Et,Ft,mt,wt,0,Ot,Yt,null),mt>>=1,wt>>=1}}else if(le.length>0){if(te&&ge){const mt=ft(le[0]);e.texStorage2D(s.TEXTURE_2D,zt,Ft,mt.width,mt.height)}for(let mt=0,wt=le.length;mt<wt;mt++)Lt=le[mt],te?Y&&e.texSubImage2D(s.TEXTURE_2D,mt,0,0,Ot,Yt,Lt):e.texImage2D(s.TEXTURE_2D,mt,Ft,Ot,Yt,Lt);R.generateMipmaps=!1}else if(te){if(ge){const mt=ft(yt);e.texStorage2D(s.TEXTURE_2D,zt,Ft,mt.width,mt.height)}Y&&e.texSubImage2D(s.TEXTURE_2D,0,0,0,Ot,Yt,yt)}else e.texImage2D(s.TEXTURE_2D,0,Ft,Ot,Yt,yt);m(R)&&g(ht),Nt.__version=ut.version,R.onUpdate&&R.onUpdate(R)}z.__version=R.version}function q(z,R,tt){if(R.image.length!==6)return;const ht=et(z,R),gt=R.source;e.bindTexture(s.TEXTURE_CUBE_MAP,z.__webglTexture,s.TEXTURE0+tt);const ut=n.get(gt);if(gt.version!==ut.__version||ht===!0){e.activeTexture(s.TEXTURE0+tt);const Nt=we.getPrimaries(we.workingColorSpace),bt=R.colorSpace===vi?null:we.getPrimaries(R.colorSpace),Dt=R.colorSpace===vi||Nt===bt?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,R.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,R.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,R.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,Dt);const ee=R.isCompressedTexture||R.image[0].isCompressedTexture,yt=R.image[0]&&R.image[0].isDataTexture,Ot=[];for(let wt=0;wt<6;wt++)!ee&&!yt?Ot[wt]=v(R.image[wt],!0,i.maxCubemapSize):Ot[wt]=yt?R.image[wt].image:R.image[wt],Ot[wt]=xt(R,Ot[wt]);const Yt=Ot[0],Ft=o.convert(R.format,R.colorSpace),Lt=o.convert(R.type),le=y(R.internalFormat,Ft,Lt,R.colorSpace),te=R.isVideoTexture!==!0,ge=ut.__version===void 0||ht===!0,Y=gt.dataReady;let zt=b(R,Yt);W(s.TEXTURE_CUBE_MAP,R);let mt;if(ee){te&&ge&&e.texStorage2D(s.TEXTURE_CUBE_MAP,zt,le,Yt.width,Yt.height);for(let wt=0;wt<6;wt++){mt=Ot[wt].mipmaps;for(let Et=0;Et<mt.length;Et++){const Tt=mt[Et];R.format!==En?Ft!==null?te?Y&&e.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,Et,0,0,Tt.width,Tt.height,Ft,Tt.data):e.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,Et,le,Tt.width,Tt.height,0,Tt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):te?Y&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,Et,0,0,Tt.width,Tt.height,Ft,Lt,Tt.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,Et,le,Tt.width,Tt.height,0,Ft,Lt,Tt.data)}}}else{if(mt=R.mipmaps,te&&ge){mt.length>0&&zt++;const wt=ft(Ot[0]);e.texStorage2D(s.TEXTURE_CUBE_MAP,zt,le,wt.width,wt.height)}for(let wt=0;wt<6;wt++)if(yt){te?Y&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,0,0,0,Ot[wt].width,Ot[wt].height,Ft,Lt,Ot[wt].data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,0,le,Ot[wt].width,Ot[wt].height,0,Ft,Lt,Ot[wt].data);for(let Et=0;Et<mt.length;Et++){const ie=mt[Et].image[wt].image;te?Y&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,Et+1,0,0,ie.width,ie.height,Ft,Lt,ie.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,Et+1,le,ie.width,ie.height,0,Ft,Lt,ie.data)}}else{te?Y&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,0,0,0,Ft,Lt,Ot[wt]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,0,le,Ft,Lt,Ot[wt]);for(let Et=0;Et<mt.length;Et++){const Tt=mt[Et];te?Y&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,Et+1,0,0,Ft,Lt,Tt.image[wt]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,Et+1,le,Ft,Lt,Tt.image[wt])}}}m(R)&&g(s.TEXTURE_CUBE_MAP),ut.__version=gt.version,R.onUpdate&&R.onUpdate(R)}z.__version=R.version}function V(z,R,tt,ht,gt,ut){const Nt=o.convert(tt.format,tt.colorSpace),bt=o.convert(tt.type),Dt=y(tt.internalFormat,Nt,bt,tt.colorSpace),ee=n.get(R),yt=n.get(tt);if(yt.__renderTarget=R,!ee.__hasExternalTextures){const Ot=Math.max(1,R.width>>ut),Yt=Math.max(1,R.height>>ut);gt===s.TEXTURE_3D||gt===s.TEXTURE_2D_ARRAY?e.texImage3D(gt,ut,Dt,Ot,Yt,R.depth,0,Nt,bt,null):e.texImage2D(gt,ut,Dt,Ot,Yt,0,Nt,bt,null)}e.bindFramebuffer(s.FRAMEBUFFER,z),rt(R)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,ht,gt,yt.__webglTexture,0,Z(R)):(gt===s.TEXTURE_2D||gt>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&gt<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,ht,gt,yt.__webglTexture,ut),e.bindFramebuffer(s.FRAMEBUFFER,null)}function st(z,R,tt){if(s.bindRenderbuffer(s.RENDERBUFFER,z),R.depthBuffer){const ht=R.depthTexture,gt=ht&&ht.isDepthTexture?ht.type:null,ut=x(R.stencilBuffer,gt),Nt=R.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,bt=Z(R);rt(R)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,bt,ut,R.width,R.height):tt?s.renderbufferStorageMultisample(s.RENDERBUFFER,bt,ut,R.width,R.height):s.renderbufferStorage(s.RENDERBUFFER,ut,R.width,R.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,Nt,s.RENDERBUFFER,z)}else{const ht=R.textures;for(let gt=0;gt<ht.length;gt++){const ut=ht[gt],Nt=o.convert(ut.format,ut.colorSpace),bt=o.convert(ut.type),Dt=y(ut.internalFormat,Nt,bt,ut.colorSpace),ee=Z(R);tt&&rt(R)===!1?s.renderbufferStorageMultisample(s.RENDERBUFFER,ee,Dt,R.width,R.height):rt(R)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,ee,Dt,R.width,R.height):s.renderbufferStorage(s.RENDERBUFFER,Dt,R.width,R.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function ct(z,R){if(R&&R.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(s.FRAMEBUFFER,z),!(R.depthTexture&&R.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const ht=n.get(R.depthTexture);ht.__renderTarget=R,(!ht.__webglTexture||R.depthTexture.image.width!==R.width||R.depthTexture.image.height!==R.height)&&(R.depthTexture.image.width=R.width,R.depthTexture.image.height=R.height,R.depthTexture.needsUpdate=!0),B(R.depthTexture,0);const gt=ht.__webglTexture,ut=Z(R);if(R.depthTexture.format===xo)rt(R)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,gt,0,ut):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,gt,0);else if(R.depthTexture.format===To)rt(R)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,gt,0,ut):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,gt,0);else throw new Error("Unknown depthTexture format")}function pt(z){const R=n.get(z),tt=z.isWebGLCubeRenderTarget===!0;if(R.__boundDepthTexture!==z.depthTexture){const ht=z.depthTexture;if(R.__depthDisposeCallback&&R.__depthDisposeCallback(),ht){const gt=()=>{delete R.__boundDepthTexture,delete R.__depthDisposeCallback,ht.removeEventListener("dispose",gt)};ht.addEventListener("dispose",gt),R.__depthDisposeCallback=gt}R.__boundDepthTexture=ht}if(z.depthTexture&&!R.__autoAllocateDepthBuffer){if(tt)throw new Error("target.depthTexture not supported in Cube render targets");ct(R.__webglFramebuffer,z)}else if(tt){R.__webglDepthbuffer=[];for(let ht=0;ht<6;ht++)if(e.bindFramebuffer(s.FRAMEBUFFER,R.__webglFramebuffer[ht]),R.__webglDepthbuffer[ht]===void 0)R.__webglDepthbuffer[ht]=s.createRenderbuffer(),st(R.__webglDepthbuffer[ht],z,!1);else{const gt=z.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,ut=R.__webglDepthbuffer[ht];s.bindRenderbuffer(s.RENDERBUFFER,ut),s.framebufferRenderbuffer(s.FRAMEBUFFER,gt,s.RENDERBUFFER,ut)}}else if(e.bindFramebuffer(s.FRAMEBUFFER,R.__webglFramebuffer),R.__webglDepthbuffer===void 0)R.__webglDepthbuffer=s.createRenderbuffer(),st(R.__webglDepthbuffer,z,!1);else{const ht=z.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,gt=R.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,gt),s.framebufferRenderbuffer(s.FRAMEBUFFER,ht,s.RENDERBUFFER,gt)}e.bindFramebuffer(s.FRAMEBUFFER,null)}function K(z,R,tt){const ht=n.get(z);R!==void 0&&V(ht.__webglFramebuffer,z,z.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),tt!==void 0&&pt(z)}function ot(z){const R=z.texture,tt=n.get(z),ht=n.get(R);z.addEventListener("dispose",S);const gt=z.textures,ut=z.isWebGLCubeRenderTarget===!0,Nt=gt.length>1;if(Nt||(ht.__webglTexture===void 0&&(ht.__webglTexture=s.createTexture()),ht.__version=R.version,r.memory.textures++),ut){tt.__webglFramebuffer=[];for(let bt=0;bt<6;bt++)if(R.mipmaps&&R.mipmaps.length>0){tt.__webglFramebuffer[bt]=[];for(let Dt=0;Dt<R.mipmaps.length;Dt++)tt.__webglFramebuffer[bt][Dt]=s.createFramebuffer()}else tt.__webglFramebuffer[bt]=s.createFramebuffer()}else{if(R.mipmaps&&R.mipmaps.length>0){tt.__webglFramebuffer=[];for(let bt=0;bt<R.mipmaps.length;bt++)tt.__webglFramebuffer[bt]=s.createFramebuffer()}else tt.__webglFramebuffer=s.createFramebuffer();if(Nt)for(let bt=0,Dt=gt.length;bt<Dt;bt++){const ee=n.get(gt[bt]);ee.__webglTexture===void 0&&(ee.__webglTexture=s.createTexture(),r.memory.textures++)}if(z.samples>0&&rt(z)===!1){tt.__webglMultisampledFramebuffer=s.createFramebuffer(),tt.__webglColorRenderbuffer=[],e.bindFramebuffer(s.FRAMEBUFFER,tt.__webglMultisampledFramebuffer);for(let bt=0;bt<gt.length;bt++){const Dt=gt[bt];tt.__webglColorRenderbuffer[bt]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,tt.__webglColorRenderbuffer[bt]);const ee=o.convert(Dt.format,Dt.colorSpace),yt=o.convert(Dt.type),Ot=y(Dt.internalFormat,ee,yt,Dt.colorSpace,z.isXRRenderTarget===!0),Yt=Z(z);s.renderbufferStorageMultisample(s.RENDERBUFFER,Yt,Ot,z.width,z.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+bt,s.RENDERBUFFER,tt.__webglColorRenderbuffer[bt])}s.bindRenderbuffer(s.RENDERBUFFER,null),z.depthBuffer&&(tt.__webglDepthRenderbuffer=s.createRenderbuffer(),st(tt.__webglDepthRenderbuffer,z,!0)),e.bindFramebuffer(s.FRAMEBUFFER,null)}}if(ut){e.bindTexture(s.TEXTURE_CUBE_MAP,ht.__webglTexture),W(s.TEXTURE_CUBE_MAP,R);for(let bt=0;bt<6;bt++)if(R.mipmaps&&R.mipmaps.length>0)for(let Dt=0;Dt<R.mipmaps.length;Dt++)V(tt.__webglFramebuffer[bt][Dt],z,R,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+bt,Dt);else V(tt.__webglFramebuffer[bt],z,R,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+bt,0);m(R)&&g(s.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(Nt){for(let bt=0,Dt=gt.length;bt<Dt;bt++){const ee=gt[bt],yt=n.get(ee);e.bindTexture(s.TEXTURE_2D,yt.__webglTexture),W(s.TEXTURE_2D,ee),V(tt.__webglFramebuffer,z,ee,s.COLOR_ATTACHMENT0+bt,s.TEXTURE_2D,0),m(ee)&&g(s.TEXTURE_2D)}e.unbindTexture()}else{let bt=s.TEXTURE_2D;if((z.isWebGL3DRenderTarget||z.isWebGLArrayRenderTarget)&&(bt=z.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),e.bindTexture(bt,ht.__webglTexture),W(bt,R),R.mipmaps&&R.mipmaps.length>0)for(let Dt=0;Dt<R.mipmaps.length;Dt++)V(tt.__webglFramebuffer[Dt],z,R,s.COLOR_ATTACHMENT0,bt,Dt);else V(tt.__webglFramebuffer,z,R,s.COLOR_ATTACHMENT0,bt,0);m(R)&&g(bt),e.unbindTexture()}z.depthBuffer&&pt(z)}function j(z){const R=z.textures;for(let tt=0,ht=R.length;tt<ht;tt++){const gt=R[tt];if(m(gt)){const ut=w(z),Nt=n.get(gt).__webglTexture;e.bindTexture(ut,Nt),g(ut),e.unbindTexture()}}}const nt=[],D=[];function J(z){if(z.samples>0){if(rt(z)===!1){const R=z.textures,tt=z.width,ht=z.height;let gt=s.COLOR_BUFFER_BIT;const ut=z.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,Nt=n.get(z),bt=R.length>1;if(bt)for(let Dt=0;Dt<R.length;Dt++)e.bindFramebuffer(s.FRAMEBUFFER,Nt.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+Dt,s.RENDERBUFFER,null),e.bindFramebuffer(s.FRAMEBUFFER,Nt.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+Dt,s.TEXTURE_2D,null,0);e.bindFramebuffer(s.READ_FRAMEBUFFER,Nt.__webglMultisampledFramebuffer),e.bindFramebuffer(s.DRAW_FRAMEBUFFER,Nt.__webglFramebuffer);for(let Dt=0;Dt<R.length;Dt++){if(z.resolveDepthBuffer&&(z.depthBuffer&&(gt|=s.DEPTH_BUFFER_BIT),z.stencilBuffer&&z.resolveStencilBuffer&&(gt|=s.STENCIL_BUFFER_BIT)),bt){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,Nt.__webglColorRenderbuffer[Dt]);const ee=n.get(R[Dt]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,ee,0)}s.blitFramebuffer(0,0,tt,ht,0,0,tt,ht,gt,s.NEAREST),l===!0&&(nt.length=0,D.length=0,nt.push(s.COLOR_ATTACHMENT0+Dt),z.depthBuffer&&z.resolveDepthBuffer===!1&&(nt.push(ut),D.push(ut),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,D)),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,nt))}if(e.bindFramebuffer(s.READ_FRAMEBUFFER,null),e.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),bt)for(let Dt=0;Dt<R.length;Dt++){e.bindFramebuffer(s.FRAMEBUFFER,Nt.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+Dt,s.RENDERBUFFER,Nt.__webglColorRenderbuffer[Dt]);const ee=n.get(R[Dt]).__webglTexture;e.bindFramebuffer(s.FRAMEBUFFER,Nt.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+Dt,s.TEXTURE_2D,ee,0)}e.bindFramebuffer(s.DRAW_FRAMEBUFFER,Nt.__webglMultisampledFramebuffer)}else if(z.depthBuffer&&z.resolveDepthBuffer===!1&&l){const R=z.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[R])}}}function Z(z){return Math.min(i.maxSamples,z.samples)}function rt(z){const R=n.get(z);return z.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&R.__useRenderToTexture!==!1}function dt(z){const R=r.render.frame;c.get(z)!==R&&(c.set(z,R),z.update())}function xt(z,R){const tt=z.colorSpace,ht=z.format,gt=z.type;return z.isCompressedTexture===!0||z.isVideoTexture===!0||tt!==Gs&&tt!==vi&&(we.getTransfer(tt)===Pe?(ht!==En||gt!==ti)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",tt)),R}function ft(z){return typeof HTMLImageElement<"u"&&z instanceof HTMLImageElement?(h.width=z.naturalWidth||z.width,h.height=z.naturalHeight||z.height):typeof VideoFrame<"u"&&z instanceof VideoFrame?(h.width=z.displayWidth,h.height=z.displayHeight):(h.width=z.width,h.height=z.height),h}this.allocateTextureUnit=F,this.resetTextureUnits=U,this.setTexture2D=B,this.setTexture2DArray=k,this.setTexture3D=P,this.setTextureCube=H,this.rebindTextures=K,this.setupRenderTarget=ot,this.updateRenderTargetMipmap=j,this.updateMultisampleRenderTarget=J,this.setupDepthRenderbuffer=pt,this.setupFrameBufferTexture=V,this.useMultisampledRTT=rt}function Qv(s,t){function e(n,i=vi){let o;const r=we.getTransfer(i);if(n===ti)return s.UNSIGNED_BYTE;if(n===jc)return s.UNSIGNED_SHORT_4_4_4_4;if(n===Zc)return s.UNSIGNED_SHORT_5_5_5_1;if(n===ku)return s.UNSIGNED_INT_5_9_9_9_REV;if(n===Uu)return s.BYTE;if(n===Fu)return s.SHORT;if(n===br)return s.UNSIGNED_SHORT;if(n===$c)return s.INT;if(n===wi)return s.UNSIGNED_INT;if(n===$n)return s.FLOAT;if(n===In)return s.HALF_FLOAT;if(n===Ou)return s.ALPHA;if(n===Bu)return s.RGB;if(n===En)return s.RGBA;if(n===Hu)return s.LUMINANCE;if(n===Gu)return s.LUMINANCE_ALPHA;if(n===xo)return s.DEPTH_COMPONENT;if(n===To)return s.DEPTH_STENCIL;if(n===Sr)return s.RED;if(n===Ua)return s.RED_INTEGER;if(n===Vu)return s.RG;if(n===Kc)return s.RG_INTEGER;if(n===Jc)return s.RGBA_INTEGER;if(n===va||n===xa||n===wa||n===ya)if(r===Pe)if(o=t.get("WEBGL_compressed_texture_s3tc_srgb"),o!==null){if(n===va)return o.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===xa)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===wa)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===ya)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(o=t.get("WEBGL_compressed_texture_s3tc"),o!==null){if(n===va)return o.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===xa)return o.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===wa)return o.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===ya)return o.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===uc||n===dc||n===fc||n===pc)if(o=t.get("WEBGL_compressed_texture_pvrtc"),o!==null){if(n===uc)return o.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===dc)return o.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===fc)return o.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===pc)return o.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===mc||n===gc||n===vc)if(o=t.get("WEBGL_compressed_texture_etc"),o!==null){if(n===mc||n===gc)return r===Pe?o.COMPRESSED_SRGB8_ETC2:o.COMPRESSED_RGB8_ETC2;if(n===vc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:o.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===xc||n===wc||n===yc||n===_c||n===Mc||n===bc||n===Sc||n===Ec||n===Tc||n===Ac||n===Cc||n===Rc||n===Pc||n===Lc)if(o=t.get("WEBGL_compressed_texture_astc"),o!==null){if(n===xc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:o.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===wc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:o.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===yc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:o.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===_c)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:o.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Mc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:o.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===bc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:o.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Sc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:o.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Ec)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:o.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Tc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:o.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Ac)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:o.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Cc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:o.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Rc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:o.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Pc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:o.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Lc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:o.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===_a||n===Dc||n===Ic)if(o=t.get("EXT_texture_compression_bptc"),o!==null){if(n===_a)return r===Pe?o.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:o.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Dc)return o.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Ic)return o.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Wu||n===zc||n===Nc||n===Uc)if(o=t.get("EXT_texture_compression_rgtc"),o!==null){if(n===_a)return o.COMPRESSED_RED_RGTC1_EXT;if(n===zc)return o.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Nc)return o.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Uc)return o.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Eo?s.UNSIGNED_INT_24_8:s[n]!==void 0?s[n]:null}return{convert:e}}class tx extends kn{constructor(t=[]){super(),this.isArrayCamera=!0,this.cameras=t}}class Ye extends wn{constructor(){super(),this.isGroup=!0,this.type="Group"}}const ex={type:"move"};class Ml{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ye,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ye,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new C,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new C),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ye,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new C,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new C),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let i=null,o=null,r=null;const a=this._targetRay,l=this._grip,h=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(h&&t.hand){r=!0;for(const v of t.hand.values()){const m=e.getJointPose(v,n),g=this._getHandJoint(h,v);m!==null&&(g.matrix.fromArray(m.transform.matrix),g.matrix.decompose(g.position,g.rotation,g.scale),g.matrixWorldNeedsUpdate=!0,g.jointRadius=m.radius),g.visible=m!==null}const c=h.joints["index-finger-tip"],d=h.joints["thumb-tip"],u=c.position.distanceTo(d.position),p=.02,f=.005;h.inputState.pinching&&u>p+f?(h.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!h.inputState.pinching&&u<=p-f&&(h.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(o=e.getPose(t.gripSpace,n),o!==null&&(l.matrix.fromArray(o.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,o.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(o.linearVelocity)):l.hasLinearVelocity=!1,o.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(o.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(i=e.getPose(t.targetRaySpace,n),i===null&&o!==null&&(i=o),i!==null&&(a.matrix.fromArray(i.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,i.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(i.linearVelocity)):a.hasLinearVelocity=!1,i.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(i.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(ex)))}return a!==null&&(a.visible=i!==null),l!==null&&(l.visible=o!==null),h!==null&&(h.visible=r!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const n=new Ye;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}}const nx=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,ix=`
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

}`;class sx{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e,n){if(this.texture===null){const i=new An,o=t.properties.get(i);o.__webglTexture=e.texture,(e.depthNear!=n.depthNear||e.depthFar!=n.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,n=new Oe({vertexShader:nx,fragmentShader:ix,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new pe(new _i(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class ox extends Do{constructor(t,e){super();const n=this;let i=null,o=1,r=null,a="local-floor",l=1,h=null,c=null,d=null,u=null,p=null,f=null;const v=new sx,m=e.getContextAttributes();let g=null,w=null;const y=[],x=[],b=new Rt;let M=null;const S=new kn;S.viewport=new ze;const T=new kn;T.viewport=new ze;const _=[S,T],E=new tx;let A=null,U=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(X){let q=y[X];return q===void 0&&(q=new Ml,y[X]=q),q.getTargetRaySpace()},this.getControllerGrip=function(X){let q=y[X];return q===void 0&&(q=new Ml,y[X]=q),q.getGripSpace()},this.getHand=function(X){let q=y[X];return q===void 0&&(q=new Ml,y[X]=q),q.getHandSpace()};function F(X){const q=x.indexOf(X.inputSource);if(q===-1)return;const V=y[q];V!==void 0&&(V.update(X.inputSource,X.frame,h||r),V.dispatchEvent({type:X.type,data:X.inputSource}))}function I(){i.removeEventListener("select",F),i.removeEventListener("selectstart",F),i.removeEventListener("selectend",F),i.removeEventListener("squeeze",F),i.removeEventListener("squeezestart",F),i.removeEventListener("squeezeend",F),i.removeEventListener("end",I),i.removeEventListener("inputsourceschange",B);for(let X=0;X<y.length;X++){const q=x[X];q!==null&&(x[X]=null,y[X].disconnect(q))}A=null,U=null,v.reset(),t.setRenderTarget(g),p=null,u=null,d=null,i=null,w=null,et.stop(),n.isPresenting=!1,t.setPixelRatio(M),t.setSize(b.width,b.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(X){o=X,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(X){a=X,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return h||r},this.setReferenceSpace=function(X){h=X},this.getBaseLayer=function(){return u!==null?u:p},this.getBinding=function(){return d},this.getFrame=function(){return f},this.getSession=function(){return i},this.setSession=async function(X){if(i=X,i!==null){if(g=t.getRenderTarget(),i.addEventListener("select",F),i.addEventListener("selectstart",F),i.addEventListener("selectend",F),i.addEventListener("squeeze",F),i.addEventListener("squeezestart",F),i.addEventListener("squeezeend",F),i.addEventListener("end",I),i.addEventListener("inputsourceschange",B),m.xrCompatible!==!0&&await e.makeXRCompatible(),M=t.getPixelRatio(),t.getSize(b),i.renderState.layers===void 0){const q={antialias:m.antialias,alpha:!0,depth:m.depth,stencil:m.stencil,framebufferScaleFactor:o};p=new XRWebGLLayer(i,e,q),i.updateRenderState({baseLayer:p}),t.setPixelRatio(1),t.setSize(p.framebufferWidth,p.framebufferHeight,!1),w=new vn(p.framebufferWidth,p.framebufferHeight,{format:En,type:ti,colorSpace:t.outputColorSpace,stencilBuffer:m.stencil})}else{let q=null,V=null,st=null;m.depth&&(st=m.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,q=m.stencil?To:xo,V=m.stencil?Eo:wi);const ct={colorFormat:e.RGBA8,depthFormat:st,scaleFactor:o};d=new XRWebGLBinding(i,e),u=d.createProjectionLayer(ct),i.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),w=new vn(u.textureWidth,u.textureHeight,{format:En,type:ti,depthTexture:new ka(u.textureWidth,u.textureHeight,V,void 0,void 0,void 0,void 0,void 0,void 0,q),stencilBuffer:m.stencil,colorSpace:t.outputColorSpace,samples:m.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1})}w.isXRRenderTarget=!0,this.setFoveation(l),h=null,r=await i.requestReferenceSpace(a),et.setContext(i),et.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return v.getDepthTexture()};function B(X){for(let q=0;q<X.removed.length;q++){const V=X.removed[q],st=x.indexOf(V);st>=0&&(x[st]=null,y[st].disconnect(V))}for(let q=0;q<X.added.length;q++){const V=X.added[q];let st=x.indexOf(V);if(st===-1){for(let pt=0;pt<y.length;pt++)if(pt>=x.length){x.push(V),st=pt;break}else if(x[pt]===null){x[pt]=V,st=pt;break}if(st===-1)break}const ct=y[st];ct&&ct.connect(V)}}const k=new C,P=new C;function H(X,q,V){k.setFromMatrixPosition(q.matrixWorld),P.setFromMatrixPosition(V.matrixWorld);const st=k.distanceTo(P),ct=q.projectionMatrix.elements,pt=V.projectionMatrix.elements,K=ct[14]/(ct[10]-1),ot=ct[14]/(ct[10]+1),j=(ct[9]+1)/ct[5],nt=(ct[9]-1)/ct[5],D=(ct[8]-1)/ct[0],J=(pt[8]+1)/pt[0],Z=K*D,rt=K*J,dt=st/(-D+J),xt=dt*-D;if(q.matrixWorld.decompose(X.position,X.quaternion,X.scale),X.translateX(xt),X.translateZ(dt),X.matrixWorld.compose(X.position,X.quaternion,X.scale),X.matrixWorldInverse.copy(X.matrixWorld).invert(),ct[10]===-1)X.projectionMatrix.copy(q.projectionMatrix),X.projectionMatrixInverse.copy(q.projectionMatrixInverse);else{const ft=K+dt,z=ot+dt,R=Z-xt,tt=rt+(st-xt),ht=j*ot/z*ft,gt=nt*ot/z*ft;X.projectionMatrix.makePerspective(R,tt,ht,gt,ft,z),X.projectionMatrixInverse.copy(X.projectionMatrix).invert()}}function G(X,q){q===null?X.matrixWorld.copy(X.matrix):X.matrixWorld.multiplyMatrices(q.matrixWorld,X.matrix),X.matrixWorldInverse.copy(X.matrixWorld).invert()}this.updateCamera=function(X){if(i===null)return;let q=X.near,V=X.far;v.texture!==null&&(v.depthNear>0&&(q=v.depthNear),v.depthFar>0&&(V=v.depthFar)),E.near=T.near=S.near=q,E.far=T.far=S.far=V,(A!==E.near||U!==E.far)&&(i.updateRenderState({depthNear:E.near,depthFar:E.far}),A=E.near,U=E.far),S.layers.mask=X.layers.mask|2,T.layers.mask=X.layers.mask|4,E.layers.mask=S.layers.mask|T.layers.mask;const st=X.parent,ct=E.cameras;G(E,st);for(let pt=0;pt<ct.length;pt++)G(ct[pt],st);ct.length===2?H(E,S,T):E.projectionMatrix.copy(S.projectionMatrix),N(X,E,st)};function N(X,q,V){V===null?X.matrix.copy(q.matrixWorld):(X.matrix.copy(V.matrixWorld),X.matrix.invert(),X.matrix.multiply(q.matrixWorld)),X.matrix.decompose(X.position,X.quaternion,X.scale),X.updateMatrixWorld(!0),X.projectionMatrix.copy(q.projectionMatrix),X.projectionMatrixInverse.copy(q.projectionMatrixInverse),X.isPerspectiveCamera&&(X.fov=Er*2*Math.atan(1/X.projectionMatrix.elements[5]),X.zoom=1)}this.getCamera=function(){return E},this.getFoveation=function(){if(!(u===null&&p===null))return l},this.setFoveation=function(X){l=X,u!==null&&(u.fixedFoveation=X),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=X)},this.hasDepthSensing=function(){return v.texture!==null},this.getDepthSensingMesh=function(){return v.getMesh(E)};let $=null;function W(X,q){if(c=q.getViewerPose(h||r),f=q,c!==null){const V=c.views;p!==null&&(t.setRenderTargetFramebuffer(w,p.framebuffer),t.setRenderTarget(w));let st=!1;V.length!==E.cameras.length&&(E.cameras.length=0,st=!0);for(let pt=0;pt<V.length;pt++){const K=V[pt];let ot=null;if(p!==null)ot=p.getViewport(K);else{const nt=d.getViewSubImage(u,K);ot=nt.viewport,pt===0&&(t.setRenderTargetTextures(w,nt.colorTexture,u.ignoreDepthValues?void 0:nt.depthStencilTexture),t.setRenderTarget(w))}let j=_[pt];j===void 0&&(j=new kn,j.layers.enable(pt),j.viewport=new ze,_[pt]=j),j.matrix.fromArray(K.transform.matrix),j.matrix.decompose(j.position,j.quaternion,j.scale),j.projectionMatrix.fromArray(K.projectionMatrix),j.projectionMatrixInverse.copy(j.projectionMatrix).invert(),j.viewport.set(ot.x,ot.y,ot.width,ot.height),pt===0&&(E.matrix.copy(j.matrix),E.matrix.decompose(E.position,E.quaternion,E.scale)),st===!0&&E.cameras.push(j)}const ct=i.enabledFeatures;if(ct&&ct.includes("depth-sensing")){const pt=d.getDepthInformation(V[0]);pt&&pt.isValid&&pt.texture&&v.init(t,pt,i.renderState)}}for(let V=0;V<y.length;V++){const st=x[V],ct=y[V];st!==null&&ct!==void 0&&ct.update(st,q,h||r)}$&&$(X,q),q.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:q}),f=null}const et=new rd;et.setAnimationLoop(W),this.setAnimationLoop=function(X){$=X},this.dispose=function(){}}}const _s=new He,rx=new jt;function ax(s,t){function e(m,g){m.matrixAutoUpdate===!0&&m.updateMatrix(),g.value.copy(m.matrix)}function n(m,g){g.color.getRGB(m.fogColor.value,id(s)),g.isFog?(m.fogNear.value=g.near,m.fogFar.value=g.far):g.isFogExp2&&(m.fogDensity.value=g.density)}function i(m,g,w,y,x){g.isMeshBasicMaterial||g.isMeshLambertMaterial?o(m,g):g.isMeshToonMaterial?(o(m,g),d(m,g)):g.isMeshPhongMaterial?(o(m,g),c(m,g)):g.isMeshStandardMaterial?(o(m,g),u(m,g),g.isMeshPhysicalMaterial&&p(m,g,x)):g.isMeshMatcapMaterial?(o(m,g),f(m,g)):g.isMeshDepthMaterial?o(m,g):g.isMeshDistanceMaterial?(o(m,g),v(m,g)):g.isMeshNormalMaterial?o(m,g):g.isLineBasicMaterial?(r(m,g),g.isLineDashedMaterial&&a(m,g)):g.isPointsMaterial?l(m,g,w,y):g.isSpriteMaterial?h(m,g):g.isShadowMaterial?(m.color.value.copy(g.color),m.opacity.value=g.opacity):g.isShaderMaterial&&(g.uniformsNeedUpdate=!1)}function o(m,g){m.opacity.value=g.opacity,g.color&&m.diffuse.value.copy(g.color),g.emissive&&m.emissive.value.copy(g.emissive).multiplyScalar(g.emissiveIntensity),g.map&&(m.map.value=g.map,e(g.map,m.mapTransform)),g.alphaMap&&(m.alphaMap.value=g.alphaMap,e(g.alphaMap,m.alphaMapTransform)),g.bumpMap&&(m.bumpMap.value=g.bumpMap,e(g.bumpMap,m.bumpMapTransform),m.bumpScale.value=g.bumpScale,g.side===Tn&&(m.bumpScale.value*=-1)),g.normalMap&&(m.normalMap.value=g.normalMap,e(g.normalMap,m.normalMapTransform),m.normalScale.value.copy(g.normalScale),g.side===Tn&&m.normalScale.value.negate()),g.displacementMap&&(m.displacementMap.value=g.displacementMap,e(g.displacementMap,m.displacementMapTransform),m.displacementScale.value=g.displacementScale,m.displacementBias.value=g.displacementBias),g.emissiveMap&&(m.emissiveMap.value=g.emissiveMap,e(g.emissiveMap,m.emissiveMapTransform)),g.specularMap&&(m.specularMap.value=g.specularMap,e(g.specularMap,m.specularMapTransform)),g.alphaTest>0&&(m.alphaTest.value=g.alphaTest);const w=t.get(g),y=w.envMap,x=w.envMapRotation;y&&(m.envMap.value=y,_s.copy(x),_s.x*=-1,_s.y*=-1,_s.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(_s.y*=-1,_s.z*=-1),m.envMapRotation.value.setFromMatrix4(rx.makeRotationFromEuler(_s)),m.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=g.reflectivity,m.ior.value=g.ior,m.refractionRatio.value=g.refractionRatio),g.lightMap&&(m.lightMap.value=g.lightMap,m.lightMapIntensity.value=g.lightMapIntensity,e(g.lightMap,m.lightMapTransform)),g.aoMap&&(m.aoMap.value=g.aoMap,m.aoMapIntensity.value=g.aoMapIntensity,e(g.aoMap,m.aoMapTransform))}function r(m,g){m.diffuse.value.copy(g.color),m.opacity.value=g.opacity,g.map&&(m.map.value=g.map,e(g.map,m.mapTransform))}function a(m,g){m.dashSize.value=g.dashSize,m.totalSize.value=g.dashSize+g.gapSize,m.scale.value=g.scale}function l(m,g,w,y){m.diffuse.value.copy(g.color),m.opacity.value=g.opacity,m.size.value=g.size*w,m.scale.value=y*.5,g.map&&(m.map.value=g.map,e(g.map,m.uvTransform)),g.alphaMap&&(m.alphaMap.value=g.alphaMap,e(g.alphaMap,m.alphaMapTransform)),g.alphaTest>0&&(m.alphaTest.value=g.alphaTest)}function h(m,g){m.diffuse.value.copy(g.color),m.opacity.value=g.opacity,m.rotation.value=g.rotation,g.map&&(m.map.value=g.map,e(g.map,m.mapTransform)),g.alphaMap&&(m.alphaMap.value=g.alphaMap,e(g.alphaMap,m.alphaMapTransform)),g.alphaTest>0&&(m.alphaTest.value=g.alphaTest)}function c(m,g){m.specular.value.copy(g.specular),m.shininess.value=Math.max(g.shininess,1e-4)}function d(m,g){g.gradientMap&&(m.gradientMap.value=g.gradientMap)}function u(m,g){m.metalness.value=g.metalness,g.metalnessMap&&(m.metalnessMap.value=g.metalnessMap,e(g.metalnessMap,m.metalnessMapTransform)),m.roughness.value=g.roughness,g.roughnessMap&&(m.roughnessMap.value=g.roughnessMap,e(g.roughnessMap,m.roughnessMapTransform)),g.envMap&&(m.envMapIntensity.value=g.envMapIntensity)}function p(m,g,w){m.ior.value=g.ior,g.sheen>0&&(m.sheenColor.value.copy(g.sheenColor).multiplyScalar(g.sheen),m.sheenRoughness.value=g.sheenRoughness,g.sheenColorMap&&(m.sheenColorMap.value=g.sheenColorMap,e(g.sheenColorMap,m.sheenColorMapTransform)),g.sheenRoughnessMap&&(m.sheenRoughnessMap.value=g.sheenRoughnessMap,e(g.sheenRoughnessMap,m.sheenRoughnessMapTransform))),g.clearcoat>0&&(m.clearcoat.value=g.clearcoat,m.clearcoatRoughness.value=g.clearcoatRoughness,g.clearcoatMap&&(m.clearcoatMap.value=g.clearcoatMap,e(g.clearcoatMap,m.clearcoatMapTransform)),g.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=g.clearcoatRoughnessMap,e(g.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),g.clearcoatNormalMap&&(m.clearcoatNormalMap.value=g.clearcoatNormalMap,e(g.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(g.clearcoatNormalScale),g.side===Tn&&m.clearcoatNormalScale.value.negate())),g.dispersion>0&&(m.dispersion.value=g.dispersion),g.iridescence>0&&(m.iridescence.value=g.iridescence,m.iridescenceIOR.value=g.iridescenceIOR,m.iridescenceThicknessMinimum.value=g.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=g.iridescenceThicknessRange[1],g.iridescenceMap&&(m.iridescenceMap.value=g.iridescenceMap,e(g.iridescenceMap,m.iridescenceMapTransform)),g.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=g.iridescenceThicknessMap,e(g.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),g.transmission>0&&(m.transmission.value=g.transmission,m.transmissionSamplerMap.value=w.texture,m.transmissionSamplerSize.value.set(w.width,w.height),g.transmissionMap&&(m.transmissionMap.value=g.transmissionMap,e(g.transmissionMap,m.transmissionMapTransform)),m.thickness.value=g.thickness,g.thicknessMap&&(m.thicknessMap.value=g.thicknessMap,e(g.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=g.attenuationDistance,m.attenuationColor.value.copy(g.attenuationColor)),g.anisotropy>0&&(m.anisotropyVector.value.set(g.anisotropy*Math.cos(g.anisotropyRotation),g.anisotropy*Math.sin(g.anisotropyRotation)),g.anisotropyMap&&(m.anisotropyMap.value=g.anisotropyMap,e(g.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=g.specularIntensity,m.specularColor.value.copy(g.specularColor),g.specularColorMap&&(m.specularColorMap.value=g.specularColorMap,e(g.specularColorMap,m.specularColorMapTransform)),g.specularIntensityMap&&(m.specularIntensityMap.value=g.specularIntensityMap,e(g.specularIntensityMap,m.specularIntensityMapTransform))}function f(m,g){g.matcap&&(m.matcap.value=g.matcap)}function v(m,g){const w=t.get(g).light;m.referencePosition.value.setFromMatrixPosition(w.matrixWorld),m.nearDistance.value=w.shadow.camera.near,m.farDistance.value=w.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function lx(s,t,e,n){let i={},o={},r=[];const a=s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS);function l(w,y){const x=y.program;n.uniformBlockBinding(w,x)}function h(w,y){let x=i[w.id];x===void 0&&(f(w),x=c(w),i[w.id]=x,w.addEventListener("dispose",m));const b=y.program;n.updateUBOMapping(w,b);const M=t.render.frame;o[w.id]!==M&&(u(w),o[w.id]=M)}function c(w){const y=d();w.__bindingPointIndex=y;const x=s.createBuffer(),b=w.__size,M=w.usage;return s.bindBuffer(s.UNIFORM_BUFFER,x),s.bufferData(s.UNIFORM_BUFFER,b,M),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,y,x),x}function d(){for(let w=0;w<a;w++)if(r.indexOf(w)===-1)return r.push(w),w;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(w){const y=i[w.id],x=w.uniforms,b=w.__cache;s.bindBuffer(s.UNIFORM_BUFFER,y);for(let M=0,S=x.length;M<S;M++){const T=Array.isArray(x[M])?x[M]:[x[M]];for(let _=0,E=T.length;_<E;_++){const A=T[_];if(p(A,M,_,b)===!0){const U=A.__offset,F=Array.isArray(A.value)?A.value:[A.value];let I=0;for(let B=0;B<F.length;B++){const k=F[B],P=v(k);typeof k=="number"||typeof k=="boolean"?(A.__data[0]=k,s.bufferSubData(s.UNIFORM_BUFFER,U+I,A.__data)):k.isMatrix3?(A.__data[0]=k.elements[0],A.__data[1]=k.elements[1],A.__data[2]=k.elements[2],A.__data[3]=0,A.__data[4]=k.elements[3],A.__data[5]=k.elements[4],A.__data[6]=k.elements[5],A.__data[7]=0,A.__data[8]=k.elements[6],A.__data[9]=k.elements[7],A.__data[10]=k.elements[8],A.__data[11]=0):(k.toArray(A.__data,I),I+=P.storage/Float32Array.BYTES_PER_ELEMENT)}s.bufferSubData(s.UNIFORM_BUFFER,U,A.__data)}}}s.bindBuffer(s.UNIFORM_BUFFER,null)}function p(w,y,x,b){const M=w.value,S=y+"_"+x;if(b[S]===void 0)return typeof M=="number"||typeof M=="boolean"?b[S]=M:b[S]=M.clone(),!0;{const T=b[S];if(typeof M=="number"||typeof M=="boolean"){if(T!==M)return b[S]=M,!0}else if(T.equals(M)===!1)return T.copy(M),!0}return!1}function f(w){const y=w.uniforms;let x=0;const b=16;for(let S=0,T=y.length;S<T;S++){const _=Array.isArray(y[S])?y[S]:[y[S]];for(let E=0,A=_.length;E<A;E++){const U=_[E],F=Array.isArray(U.value)?U.value:[U.value];for(let I=0,B=F.length;I<B;I++){const k=F[I],P=v(k),H=x%b,G=H%P.boundary,N=H+G;x+=G,N!==0&&b-N<P.storage&&(x+=b-N),U.__data=new Float32Array(P.storage/Float32Array.BYTES_PER_ELEMENT),U.__offset=x,x+=P.storage}}}const M=x%b;return M>0&&(x+=b-M),w.__size=x,w.__cache={},this}function v(w){const y={boundary:0,storage:0};return typeof w=="number"||typeof w=="boolean"?(y.boundary=4,y.storage=4):w.isVector2?(y.boundary=8,y.storage=8):w.isVector3||w.isColor?(y.boundary=16,y.storage=12):w.isVector4?(y.boundary=16,y.storage=16):w.isMatrix3?(y.boundary=48,y.storage=48):w.isMatrix4?(y.boundary=64,y.storage=64):w.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",w),y}function m(w){const y=w.target;y.removeEventListener("dispose",m);const x=r.indexOf(y.__bindingPointIndex);r.splice(x,1),s.deleteBuffer(i[y.id]),delete i[y.id],delete o[y.id]}function g(){for(const w in i)s.deleteBuffer(i[w]);r=[],i={},o={}}return{bind:l,update:h,dispose:g}}class cx{constructor(t={}){const{canvas:e=jf(),context:n=null,depth:i=!0,stencil:o=!1,alpha:r=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:h=!1,powerPreference:c="default",failIfMajorPerformanceCaveat:d=!1,reverseDepthBuffer:u=!1}=t;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");p=n.getContextAttributes().alpha}else p=r;const f=new Uint32Array(4),v=new Int32Array(4);let m=null,g=null;const w=[],y=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=Dn,this.toneMapping=Vi,this.toneMappingExposure=1;const x=this;let b=!1,M=0,S=0,T=null,_=-1,E=null;const A=new ze,U=new ze;let F=null;const I=new Vt(0);let B=0,k=e.width,P=e.height,H=1,G=null,N=null;const $=new ze(0,0,k,P),W=new ze(0,0,k,P);let et=!1;const X=new Us;let q=!1,V=!1;const st=new jt,ct=new jt,pt=new C,K=new ze,ot={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let j=!1;function nt(){return T===null?H:1}let D=n;function J(L,Q){return e.getContext(L,Q)}try{const L={alpha:!0,depth:i,stencil:o,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:h,powerPreference:c,failIfMajorPerformanceCaveat:d};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${Yc}`),e.addEventListener("webglcontextlost",wt,!1),e.addEventListener("webglcontextrestored",Et,!1),e.addEventListener("webglcontextcreationerror",Tt,!1),D===null){const Q="webgl2";if(D=J(Q,L),D===null)throw J(Q)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(L){throw console.error("THREE.WebGLRenderer: "+L.message),L}let Z,rt,dt,xt,ft,z,R,tt,ht,gt,ut,Nt,bt,Dt,ee,yt,Ot,Yt,Ft,Lt,le,te,ge,Y;function zt(){Z=new m1(D),Z.init(),te=new Qv(D,Z),rt=new c1(D,Z,t,te),dt=new Zv(D,Z),rt.reverseDepthBuffer&&u&&dt.buffers.depth.setReversed(!0),xt=new x1(D),ft=new Uv,z=new Jv(D,Z,dt,ft,rt,te,xt),R=new u1(x),tt=new p1(x),ht=new Ep(D),ge=new a1(D,ht),gt=new g1(D,ht,xt,ge),ut=new y1(D,gt,ht,xt),Ft=new w1(D,rt,z),yt=new h1(ft),Nt=new Nv(x,R,tt,Z,rt,ge,yt),bt=new ax(x,ft),Dt=new kv,ee=new Wv(Z),Yt=new r1(x,R,tt,dt,ut,p,l),Ot=new $v(x,ut,rt),Y=new lx(D,xt,rt,dt),Lt=new l1(D,Z,xt),le=new v1(D,Z,xt),xt.programs=Nt.programs,x.capabilities=rt,x.extensions=Z,x.properties=ft,x.renderLists=Dt,x.shadowMap=Ot,x.state=dt,x.info=xt}zt();const mt=new ox(x,D);this.xr=mt,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){const L=Z.get("WEBGL_lose_context");L&&L.loseContext()},this.forceContextRestore=function(){const L=Z.get("WEBGL_lose_context");L&&L.restoreContext()},this.getPixelRatio=function(){return H},this.setPixelRatio=function(L){L!==void 0&&(H=L,this.setSize(k,P,!1))},this.getSize=function(L){return L.set(k,P)},this.setSize=function(L,Q,at=!0){if(mt.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}k=L,P=Q,e.width=Math.floor(L*H),e.height=Math.floor(Q*H),at===!0&&(e.style.width=L+"px",e.style.height=Q+"px"),this.setViewport(0,0,L,Q)},this.getDrawingBufferSize=function(L){return L.set(k*H,P*H).floor()},this.setDrawingBufferSize=function(L,Q,at){k=L,P=Q,H=at,e.width=Math.floor(L*at),e.height=Math.floor(Q*at),this.setViewport(0,0,L,Q)},this.getCurrentViewport=function(L){return L.copy(A)},this.getViewport=function(L){return L.copy($)},this.setViewport=function(L,Q,at,lt){L.isVector4?$.set(L.x,L.y,L.z,L.w):$.set(L,Q,at,lt),dt.viewport(A.copy($).multiplyScalar(H).round())},this.getScissor=function(L){return L.copy(W)},this.setScissor=function(L,Q,at,lt){L.isVector4?W.set(L.x,L.y,L.z,L.w):W.set(L,Q,at,lt),dt.scissor(U.copy(W).multiplyScalar(H).round())},this.getScissorTest=function(){return et},this.setScissorTest=function(L){dt.setScissorTest(et=L)},this.setOpaqueSort=function(L){G=L},this.setTransparentSort=function(L){N=L},this.getClearColor=function(L){return L.copy(Yt.getClearColor())},this.setClearColor=function(){Yt.setClearColor.apply(Yt,arguments)},this.getClearAlpha=function(){return Yt.getClearAlpha()},this.setClearAlpha=function(){Yt.setClearAlpha.apply(Yt,arguments)},this.clear=function(L=!0,Q=!0,at=!0){let lt=0;if(L){let it=!1;if(T!==null){const At=T.texture.format;it=At===Jc||At===Kc||At===Ua}if(it){const At=T.texture.type,Pt=At===ti||At===wi||At===br||At===Eo||At===jc||At===Zc,$t=Yt.getClearColor(),qt=Yt.getClearAlpha(),re=$t.r,Ht=$t.g,Wt=$t.b;Pt?(f[0]=re,f[1]=Ht,f[2]=Wt,f[3]=qt,D.clearBufferuiv(D.COLOR,0,f)):(v[0]=re,v[1]=Ht,v[2]=Wt,v[3]=qt,D.clearBufferiv(D.COLOR,0,v))}else lt|=D.COLOR_BUFFER_BIT}Q&&(lt|=D.DEPTH_BUFFER_BIT),at&&(lt|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),D.clear(lt)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",wt,!1),e.removeEventListener("webglcontextrestored",Et,!1),e.removeEventListener("webglcontextcreationerror",Tt,!1),Dt.dispose(),ee.dispose(),ft.dispose(),R.dispose(),tt.dispose(),ut.dispose(),ge.dispose(),Y.dispose(),Nt.dispose(),mt.dispose(),mt.removeEventListener("sessionstart",On),mt.removeEventListener("sessionend",bi),yn.stop()};function wt(L){L.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),b=!0}function Et(){console.log("THREE.WebGLRenderer: Context Restored."),b=!1;const L=xt.autoReset,Q=Ot.enabled,at=Ot.autoUpdate,lt=Ot.needsUpdate,it=Ot.type;zt(),xt.autoReset=L,Ot.enabled=Q,Ot.autoUpdate=at,Ot.needsUpdate=lt,Ot.type=it}function Tt(L){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",L.statusMessage)}function ie(L){const Q=L.target;Q.removeEventListener("dispose",ie),Me(Q)}function Me(L){Ve(L),ft.remove(L)}function Ve(L){const Q=ft.get(L).programs;Q!==void 0&&(Q.forEach(function(at){Nt.releaseProgram(at)}),L.isShaderMaterial&&Nt.releaseShaderCache(L))}this.renderBufferDirect=function(L,Q,at,lt,it,At){Q===null&&(Q=ot);const Pt=it.isMesh&&it.matrixWorld.determinant()<0,$t=Bo(L,Q,at,lt,it);dt.setMaterial(lt,Pt);let qt=at.index,re=1;if(lt.wireframe===!0){if(qt=gt.getWireframeAttribute(at),qt===void 0)return;re=2}const Ht=at.drawRange,Wt=at.attributes.position;let me=Ht.start*re,Ee=(Ht.start+Ht.count)*re;At!==null&&(me=Math.max(me,At.start*re),Ee=Math.min(Ee,(At.start+At.count)*re)),qt!==null?(me=Math.max(me,0),Ee=Math.min(Ee,qt.count)):Wt!=null&&(me=Math.max(me,0),Ee=Math.min(Ee,Wt.count));const Ae=Ee-me;if(Ae<0||Ae===1/0)return;ge.setup(it,lt,$t,at,qt);let We,fe=Lt;if(qt!==null&&(We=ht.get(qt),fe=le,fe.setIndex(We)),it.isMesh)lt.wireframe===!0?(dt.setLineWidth(lt.wireframeLinewidth*nt()),fe.setMode(D.LINES)):fe.setMode(D.TRIANGLES);else if(it.isLine){let Zt=lt.linewidth;Zt===void 0&&(Zt=1),dt.setLineWidth(Zt*nt()),it.isLineSegments?fe.setMode(D.LINES):it.isLineLoop?fe.setMode(D.LINE_LOOP):fe.setMode(D.LINE_STRIP)}else it.isPoints?fe.setMode(D.POINTS):it.isSprite&&fe.setMode(D.TRIANGLES);if(it.isBatchedMesh)if(it._multiDrawInstances!==null)fe.renderMultiDrawInstances(it._multiDrawStarts,it._multiDrawCounts,it._multiDrawCount,it._multiDrawInstances);else if(Z.get("WEBGL_multi_draw"))fe.renderMultiDraw(it._multiDrawStarts,it._multiDrawCounts,it._multiDrawCount);else{const Zt=it._multiDrawStarts,ei=it._multiDrawCounts,ve=it._multiDrawCount,Zn=qt?ht.get(qt).bytesPerElement:1,Ai=ft.get(lt).currentProgram.getUniforms();for(let fn=0;fn<ve;fn++)Ai.setValue(D,"_gl_DrawID",fn),fe.render(Zt[fn]/Zn,ei[fn])}else if(it.isInstancedMesh)fe.renderInstances(me,Ae,it.count);else if(at.isInstancedBufferGeometry){const Zt=at._maxInstanceCount!==void 0?at._maxInstanceCount:1/0,ei=Math.min(at.instanceCount,Zt);fe.renderInstances(me,Ae,ei)}else fe.render(me,Ae)};function ue(L,Q,at){L.transparent===!0&&L.side===nn&&L.forceSinglePass===!1?(L.side=Tn,L.needsUpdate=!0,Ei(L,Q,at),L.side=Yi,L.needsUpdate=!0,Ei(L,Q,at),L.side=nn):Ei(L,Q,at)}this.compile=function(L,Q,at=null){at===null&&(at=L),g=ee.get(at),g.init(Q),y.push(g),at.traverseVisible(function(it){it.isLight&&it.layers.test(Q.layers)&&(g.pushLight(it),it.castShadow&&g.pushShadow(it))}),L!==at&&L.traverseVisible(function(it){it.isLight&&it.layers.test(Q.layers)&&(g.pushLight(it),it.castShadow&&g.pushShadow(it))}),g.setupLights();const lt=new Set;return L.traverse(function(it){if(!(it.isMesh||it.isPoints||it.isLine||it.isSprite))return;const At=it.material;if(At)if(Array.isArray(At))for(let Pt=0;Pt<At.length;Pt++){const $t=At[Pt];ue($t,at,it),lt.add($t)}else ue(At,at,it),lt.add(At)}),y.pop(),g=null,lt},this.compileAsync=function(L,Q,at=null){const lt=this.compile(L,Q,at);return new Promise(it=>{function At(){if(lt.forEach(function(Pt){ft.get(Pt).currentProgram.isReady()&&lt.delete(Pt)}),lt.size===0){it(L);return}setTimeout(At,10)}Z.get("KHR_parallel_shader_compile")!==null?At():setTimeout(At,10)})};let Ue=null;function dn(L){Ue&&Ue(L)}function On(){yn.stop()}function bi(){yn.start()}const yn=new rd;yn.setAnimationLoop(dn),typeof self<"u"&&yn.setContext(self),this.setAnimationLoop=function(L){Ue=L,mt.setAnimationLoop(L),L===null?yn.stop():yn.start()},mt.addEventListener("sessionstart",On),mt.addEventListener("sessionend",bi),this.render=function(L,Q){if(Q!==void 0&&Q.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(b===!0)return;if(L.matrixWorldAutoUpdate===!0&&L.updateMatrixWorld(),Q.parent===null&&Q.matrixWorldAutoUpdate===!0&&Q.updateMatrixWorld(),mt.enabled===!0&&mt.isPresenting===!0&&(mt.cameraAutoUpdate===!0&&mt.updateCamera(Q),Q=mt.getCamera()),L.isScene===!0&&L.onBeforeRender(x,L,Q,T),g=ee.get(L,y.length),g.init(Q),y.push(g),ct.multiplyMatrices(Q.projectionMatrix,Q.matrixWorldInverse),X.setFromProjectionMatrix(ct),V=this.localClippingEnabled,q=yt.init(this.clippingPlanes,V),m=Dt.get(L,w.length),m.init(),w.push(m),mt.enabled===!0&&mt.isPresenting===!0){const At=x.xr.getDepthSensingMesh();At!==null&&ko(At,Q,-1/0,x.sortObjects)}ko(L,Q,0,x.sortObjects),m.finish(),x.sortObjects===!0&&m.sort(G,N),j=mt.enabled===!1||mt.isPresenting===!1||mt.hasDepthSensing()===!1,j&&Yt.addToRenderList(m,L),this.info.render.frame++,q===!0&&yt.beginShadows();const at=g.state.shadowsArray;Ot.render(at,L,Q),q===!0&&yt.endShadows(),this.info.autoReset===!0&&this.info.reset();const lt=m.opaque,it=m.transmissive;if(g.setupLights(),Q.isArrayCamera){const At=Q.cameras;if(it.length>0)for(let Pt=0,$t=At.length;Pt<$t;Pt++){const qt=At[Pt];Oo(lt,it,L,qt)}j&&Yt.render(L);for(let Pt=0,$t=At.length;Pt<$t;Pt++){const qt=At[Pt];Ws(m,L,qt,qt.viewport)}}else it.length>0&&Oo(lt,it,L,Q),j&&Yt.render(L),Ws(m,L,Q);T!==null&&(z.updateMultisampleRenderTarget(T),z.updateRenderTargetMipmap(T)),L.isScene===!0&&L.onAfterRender(x,L,Q),ge.resetDefaultState(),_=-1,E=null,y.pop(),y.length>0?(g=y[y.length-1],q===!0&&yt.setGlobalState(x.clippingPlanes,g.state.camera)):g=null,w.pop(),w.length>0?m=w[w.length-1]:m=null};function ko(L,Q,at,lt){if(L.visible===!1)return;if(L.layers.test(Q.layers)){if(L.isGroup)at=L.renderOrder;else if(L.isLOD)L.autoUpdate===!0&&L.update(Q);else if(L.isLight)g.pushLight(L),L.castShadow&&g.pushShadow(L);else if(L.isSprite){if(!L.frustumCulled||X.intersectsSprite(L)){lt&&K.setFromMatrixPosition(L.matrixWorld).applyMatrix4(ct);const Pt=ut.update(L),$t=L.material;$t.visible&&m.push(L,Pt,$t,at,K.z,null)}}else if((L.isMesh||L.isLine||L.isPoints)&&(!L.frustumCulled||X.intersectsObject(L))){const Pt=ut.update(L),$t=L.material;if(lt&&(L.boundingSphere!==void 0?(L.boundingSphere===null&&L.computeBoundingSphere(),K.copy(L.boundingSphere.center)):(Pt.boundingSphere===null&&Pt.computeBoundingSphere(),K.copy(Pt.boundingSphere.center)),K.applyMatrix4(L.matrixWorld).applyMatrix4(ct)),Array.isArray($t)){const qt=Pt.groups;for(let re=0,Ht=qt.length;re<Ht;re++){const Wt=qt[re],me=$t[Wt.materialIndex];me&&me.visible&&m.push(L,Pt,me,at,K.z,Wt)}}else $t.visible&&m.push(L,Pt,$t,at,K.z,null)}}const At=L.children;for(let Pt=0,$t=At.length;Pt<$t;Pt++)ko(At[Pt],Q,at,lt)}function Ws(L,Q,at,lt){const it=L.opaque,At=L.transmissive,Pt=L.transparent;g.setupLightsView(at),q===!0&&yt.setGlobalState(x.clippingPlanes,at),lt&&dt.viewport(A.copy(lt)),it.length>0&&us(it,Q,at),At.length>0&&us(At,Q,at),Pt.length>0&&us(Pt,Q,at),dt.buffers.depth.setTest(!0),dt.buffers.depth.setMask(!0),dt.buffers.color.setMask(!0),dt.setPolygonOffset(!1)}function Oo(L,Q,at,lt){if((at.isScene===!0?at.overrideMaterial:null)!==null)return;g.state.transmissionRenderTarget[lt.id]===void 0&&(g.state.transmissionRenderTarget[lt.id]=new vn(1,1,{generateMipmaps:!0,type:Z.has("EXT_color_buffer_half_float")||Z.has("EXT_color_buffer_float")?In:ti,minFilter:Bi,samples:4,stencilBuffer:o,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:we.workingColorSpace}));const At=g.state.transmissionRenderTarget[lt.id],Pt=lt.viewport||A;At.setSize(Pt.z,Pt.w);const $t=x.getRenderTarget();x.setRenderTarget(At),x.getClearColor(I),B=x.getClearAlpha(),B<1&&x.setClearColor(16777215,.5),x.clear(),j&&Yt.render(at);const qt=x.toneMapping;x.toneMapping=Vi;const re=lt.viewport;if(lt.viewport!==void 0&&(lt.viewport=void 0),g.setupLightsView(lt),q===!0&&yt.setGlobalState(x.clippingPlanes,lt),us(L,at,lt),z.updateMultisampleRenderTarget(At),z.updateRenderTargetMipmap(At),Z.has("WEBGL_multisampled_render_to_texture")===!1){let Ht=!1;for(let Wt=0,me=Q.length;Wt<me;Wt++){const Ee=Q[Wt],Ae=Ee.object,We=Ee.geometry,fe=Ee.material,Zt=Ee.group;if(fe.side===nn&&Ae.layers.test(lt.layers)){const ei=fe.side;fe.side=Tn,fe.needsUpdate=!0,Si(Ae,at,lt,We,fe,Zt),fe.side=ei,fe.needsUpdate=!0,Ht=!0}}Ht===!0&&(z.updateMultisampleRenderTarget(At),z.updateRenderTargetMipmap(At))}x.setRenderTarget($t),x.setClearColor(I,B),re!==void 0&&(lt.viewport=re),x.toneMapping=qt}function us(L,Q,at){const lt=Q.isScene===!0?Q.overrideMaterial:null;for(let it=0,At=L.length;it<At;it++){const Pt=L[it],$t=Pt.object,qt=Pt.geometry,re=lt===null?Pt.material:lt,Ht=Pt.group;$t.layers.test(at.layers)&&Si($t,Q,at,qt,re,Ht)}}function Si(L,Q,at,lt,it,At){L.onBeforeRender(x,Q,at,lt,it,At),L.modelViewMatrix.multiplyMatrices(at.matrixWorldInverse,L.matrixWorld),L.normalMatrix.getNormalMatrix(L.modelViewMatrix),it.onBeforeRender(x,Q,at,lt,L,At),it.transparent===!0&&it.side===nn&&it.forceSinglePass===!1?(it.side=Tn,it.needsUpdate=!0,x.renderBufferDirect(at,Q,lt,it,L,At),it.side=Yi,it.needsUpdate=!0,x.renderBufferDirect(at,Q,lt,it,L,At),it.side=nn):x.renderBufferDirect(at,Q,lt,it,L,At),L.onAfterRender(x,Q,at,lt,it,At)}function Ei(L,Q,at){Q.isScene!==!0&&(Q=ot);const lt=ft.get(L),it=g.state.lights,At=g.state.shadowsArray,Pt=it.state.version,$t=Nt.getParameters(L,it.state,At,Q,at),qt=Nt.getProgramCacheKey($t);let re=lt.programs;lt.environment=L.isMeshStandardMaterial?Q.environment:null,lt.fog=Q.fog,lt.envMap=(L.isMeshStandardMaterial?tt:R).get(L.envMap||lt.environment),lt.envMapRotation=lt.environment!==null&&L.envMap===null?Q.environmentRotation:L.envMapRotation,re===void 0&&(L.addEventListener("dispose",ie),re=new Map,lt.programs=re);let Ht=re.get(qt);if(Ht!==void 0){if(lt.currentProgram===Ht&&lt.lightsStateVersion===Pt)return Nr(L,$t),Ht}else $t.uniforms=Nt.getUniforms(L),L.onBeforeCompile($t,x),Ht=Nt.acquireProgram($t,qt),re.set(qt,Ht),lt.uniforms=$t.uniforms;const Wt=lt.uniforms;return(!L.isShaderMaterial&&!L.isRawShaderMaterial||L.clipping===!0)&&(Wt.clippingPlanes=yt.uniform),Nr(L,$t),lt.needsLights=Va(L),lt.lightsStateVersion=Pt,lt.needsLights&&(Wt.ambientLightColor.value=it.state.ambient,Wt.lightProbe.value=it.state.probe,Wt.directionalLights.value=it.state.directional,Wt.directionalLightShadows.value=it.state.directionalShadow,Wt.spotLights.value=it.state.spot,Wt.spotLightShadows.value=it.state.spotShadow,Wt.rectAreaLights.value=it.state.rectArea,Wt.ltc_1.value=it.state.rectAreaLTC1,Wt.ltc_2.value=it.state.rectAreaLTC2,Wt.pointLights.value=it.state.point,Wt.pointLightShadows.value=it.state.pointShadow,Wt.hemisphereLights.value=it.state.hemi,Wt.directionalShadowMap.value=it.state.directionalShadowMap,Wt.directionalShadowMatrix.value=it.state.directionalShadowMatrix,Wt.spotShadowMap.value=it.state.spotShadowMap,Wt.spotLightMatrix.value=it.state.spotLightMatrix,Wt.spotLightMap.value=it.state.spotLightMap,Wt.pointShadowMap.value=it.state.pointShadowMap,Wt.pointShadowMatrix.value=it.state.pointShadowMatrix),lt.currentProgram=Ht,lt.uniformsList=null,Ht}function Ti(L){if(L.uniformsList===null){const Q=L.currentProgram.getUniforms();L.uniformsList=Ma.seqWithValue(Q.seq,L.uniforms)}return L.uniformsList}function Nr(L,Q){const at=ft.get(L);at.outputColorSpace=Q.outputColorSpace,at.batching=Q.batching,at.batchingColor=Q.batchingColor,at.instancing=Q.instancing,at.instancingColor=Q.instancingColor,at.instancingMorph=Q.instancingMorph,at.skinning=Q.skinning,at.morphTargets=Q.morphTargets,at.morphNormals=Q.morphNormals,at.morphColors=Q.morphColors,at.morphTargetsCount=Q.morphTargetsCount,at.numClippingPlanes=Q.numClippingPlanes,at.numIntersection=Q.numClipIntersection,at.vertexAlphas=Q.vertexAlphas,at.vertexTangents=Q.vertexTangents,at.toneMapping=Q.toneMapping}function Bo(L,Q,at,lt,it){Q.isScene!==!0&&(Q=ot),z.resetTextureUnits();const At=Q.fog,Pt=lt.isMeshStandardMaterial?Q.environment:null,$t=T===null?x.outputColorSpace:T.isXRRenderTarget===!0?T.texture.colorSpace:Gs,qt=(lt.isMeshStandardMaterial?tt:R).get(lt.envMap||Pt),re=lt.vertexColors===!0&&!!at.attributes.color&&at.attributes.color.itemSize===4,Ht=!!at.attributes.tangent&&(!!lt.normalMap||lt.anisotropy>0),Wt=!!at.morphAttributes.position,me=!!at.morphAttributes.normal,Ee=!!at.morphAttributes.color;let Ae=Vi;lt.toneMapped&&(T===null||T.isXRRenderTarget===!0)&&(Ae=x.toneMapping);const We=at.morphAttributes.position||at.morphAttributes.normal||at.morphAttributes.color,fe=We!==void 0?We.length:0,Zt=ft.get(lt),ei=g.state.lights;if(q===!0&&(V===!0||L!==E)){const Cn=L===E&&lt.id===_;yt.setState(lt,L,Cn)}let ve=!1;lt.version===Zt.__version?(Zt.needsLights&&Zt.lightsStateVersion!==ei.state.version||Zt.outputColorSpace!==$t||it.isBatchedMesh&&Zt.batching===!1||!it.isBatchedMesh&&Zt.batching===!0||it.isBatchedMesh&&Zt.batchingColor===!0&&it.colorTexture===null||it.isBatchedMesh&&Zt.batchingColor===!1&&it.colorTexture!==null||it.isInstancedMesh&&Zt.instancing===!1||!it.isInstancedMesh&&Zt.instancing===!0||it.isSkinnedMesh&&Zt.skinning===!1||!it.isSkinnedMesh&&Zt.skinning===!0||it.isInstancedMesh&&Zt.instancingColor===!0&&it.instanceColor===null||it.isInstancedMesh&&Zt.instancingColor===!1&&it.instanceColor!==null||it.isInstancedMesh&&Zt.instancingMorph===!0&&it.morphTexture===null||it.isInstancedMesh&&Zt.instancingMorph===!1&&it.morphTexture!==null||Zt.envMap!==qt||lt.fog===!0&&Zt.fog!==At||Zt.numClippingPlanes!==void 0&&(Zt.numClippingPlanes!==yt.numPlanes||Zt.numIntersection!==yt.numIntersection)||Zt.vertexAlphas!==re||Zt.vertexTangents!==Ht||Zt.morphTargets!==Wt||Zt.morphNormals!==me||Zt.morphColors!==Ee||Zt.toneMapping!==Ae||Zt.morphTargetsCount!==fe)&&(ve=!0):(ve=!0,Zt.__version=lt.version);let Zn=Zt.currentProgram;ve===!0&&(Zn=Ei(lt,Q,it));let Ai=!1,fn=!1,$i=!1;const Ce=Zn.getUniforms(),Bn=Zt.uniforms;if(dt.useProgram(Zn.program)&&(Ai=!0,fn=!0,$i=!0),lt.id!==_&&(_=lt.id,fn=!0),Ai||E!==L){dt.buffers.depth.getReversed()?(st.copy(L.projectionMatrix),Kf(st),Jf(st),Ce.setValue(D,"projectionMatrix",st)):Ce.setValue(D,"projectionMatrix",L.projectionMatrix),Ce.setValue(D,"viewMatrix",L.matrixWorldInverse);const Hn=Ce.map.cameraPosition;Hn!==void 0&&Hn.setValue(D,pt.setFromMatrixPosition(L.matrixWorld)),rt.logarithmicDepthBuffer&&Ce.setValue(D,"logDepthBufFC",2/(Math.log(L.far+1)/Math.LN2)),(lt.isMeshPhongMaterial||lt.isMeshToonMaterial||lt.isMeshLambertMaterial||lt.isMeshBasicMaterial||lt.isMeshStandardMaterial||lt.isShaderMaterial)&&Ce.setValue(D,"isOrthographic",L.isOrthographicCamera===!0),E!==L&&(E=L,fn=!0,$i=!0)}if(it.isSkinnedMesh){Ce.setOptional(D,it,"bindMatrix"),Ce.setOptional(D,it,"bindMatrixInverse");const Cn=it.skeleton;Cn&&(Cn.boneTexture===null&&Cn.computeBoneTexture(),Ce.setValue(D,"boneTexture",Cn.boneTexture,z))}it.isBatchedMesh&&(Ce.setOptional(D,it,"batchingTexture"),Ce.setValue(D,"batchingTexture",it._matricesTexture,z),Ce.setOptional(D,it,"batchingIdTexture"),Ce.setValue(D,"batchingIdTexture",it._indirectTexture,z),Ce.setOptional(D,it,"batchingColorTexture"),it._colorsTexture!==null&&Ce.setValue(D,"batchingColorTexture",it._colorsTexture,z));const Xs=at.morphAttributes;if((Xs.position!==void 0||Xs.normal!==void 0||Xs.color!==void 0)&&Ft.update(it,at,Zn),(fn||Zt.receiveShadow!==it.receiveShadow)&&(Zt.receiveShadow=it.receiveShadow,Ce.setValue(D,"receiveShadow",it.receiveShadow)),lt.isMeshGouraudMaterial&&lt.envMap!==null&&(Bn.envMap.value=qt,Bn.flipEnvMap.value=qt.isCubeTexture&&qt.isRenderTargetTexture===!1?-1:1),lt.isMeshStandardMaterial&&lt.envMap===null&&Q.environment!==null&&(Bn.envMapIntensity.value=Q.environmentIntensity),fn&&(Ce.setValue(D,"toneMappingExposure",x.toneMappingExposure),Zt.needsLights&&wh(Bn,$i),At&&lt.fog===!0&&bt.refreshFogUniforms(Bn,At),bt.refreshMaterialUniforms(Bn,lt,H,P,g.state.transmissionRenderTarget[L.id]),Ma.upload(D,Ti(Zt),Bn,z)),lt.isShaderMaterial&&lt.uniformsNeedUpdate===!0&&(Ma.upload(D,Ti(Zt),Bn,z),lt.uniformsNeedUpdate=!1),lt.isSpriteMaterial&&Ce.setValue(D,"center",it.center),Ce.setValue(D,"modelViewMatrix",it.modelViewMatrix),Ce.setValue(D,"normalMatrix",it.normalMatrix),Ce.setValue(D,"modelMatrix",it.matrixWorld),lt.isShaderMaterial||lt.isRawShaderMaterial){const Cn=lt.uniformsGroups;for(let Hn=0,ci=Cn.length;Hn<ci;Hn++){const ds=Cn[Hn];Y.update(ds,Zn),Y.bind(ds,Zn)}}return Zn}function wh(L,Q){L.ambientLightColor.needsUpdate=Q,L.lightProbe.needsUpdate=Q,L.directionalLights.needsUpdate=Q,L.directionalLightShadows.needsUpdate=Q,L.pointLights.needsUpdate=Q,L.pointLightShadows.needsUpdate=Q,L.spotLights.needsUpdate=Q,L.spotLightShadows.needsUpdate=Q,L.rectAreaLights.needsUpdate=Q,L.hemisphereLights.needsUpdate=Q}function Va(L){return L.isMeshLambertMaterial||L.isMeshToonMaterial||L.isMeshPhongMaterial||L.isMeshStandardMaterial||L.isShadowMaterial||L.isShaderMaterial&&L.lights===!0}this.getActiveCubeFace=function(){return M},this.getActiveMipmapLevel=function(){return S},this.getRenderTarget=function(){return T},this.setRenderTargetTextures=function(L,Q,at){ft.get(L.texture).__webglTexture=Q,ft.get(L.depthTexture).__webglTexture=at;const lt=ft.get(L);lt.__hasExternalTextures=!0,lt.__autoAllocateDepthBuffer=at===void 0,lt.__autoAllocateDepthBuffer||Z.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),lt.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(L,Q){const at=ft.get(L);at.__webglFramebuffer=Q,at.__useDefaultFramebuffer=Q===void 0},this.setRenderTarget=function(L,Q=0,at=0){T=L,M=Q,S=at;let lt=!0,it=null,At=!1,Pt=!1;if(L){const qt=ft.get(L);if(qt.__useDefaultFramebuffer!==void 0)dt.bindFramebuffer(D.FRAMEBUFFER,null),lt=!1;else if(qt.__webglFramebuffer===void 0)z.setupRenderTarget(L);else if(qt.__hasExternalTextures)z.rebindTextures(L,ft.get(L.texture).__webglTexture,ft.get(L.depthTexture).__webglTexture);else if(L.depthBuffer){const Wt=L.depthTexture;if(qt.__boundDepthTexture!==Wt){if(Wt!==null&&ft.has(Wt)&&(L.width!==Wt.image.width||L.height!==Wt.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");z.setupDepthRenderbuffer(L)}}const re=L.texture;(re.isData3DTexture||re.isDataArrayTexture||re.isCompressedArrayTexture)&&(Pt=!0);const Ht=ft.get(L).__webglFramebuffer;L.isWebGLCubeRenderTarget?(Array.isArray(Ht[Q])?it=Ht[Q][at]:it=Ht[Q],At=!0):L.samples>0&&z.useMultisampledRTT(L)===!1?it=ft.get(L).__webglMultisampledFramebuffer:Array.isArray(Ht)?it=Ht[at]:it=Ht,A.copy(L.viewport),U.copy(L.scissor),F=L.scissorTest}else A.copy($).multiplyScalar(H).floor(),U.copy(W).multiplyScalar(H).floor(),F=et;if(dt.bindFramebuffer(D.FRAMEBUFFER,it)&&lt&&dt.drawBuffers(L,it),dt.viewport(A),dt.scissor(U),dt.setScissorTest(F),At){const qt=ft.get(L.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+Q,qt.__webglTexture,at)}else if(Pt){const qt=ft.get(L.texture),re=Q||0;D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,qt.__webglTexture,at||0,re)}_=-1},this.readRenderTargetPixels=function(L,Q,at,lt,it,At,Pt){if(!(L&&L.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let $t=ft.get(L).__webglFramebuffer;if(L.isWebGLCubeRenderTarget&&Pt!==void 0&&($t=$t[Pt]),$t){dt.bindFramebuffer(D.FRAMEBUFFER,$t);try{const qt=L.texture,re=qt.format,Ht=qt.type;if(!rt.textureFormatReadable(re)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!rt.textureTypeReadable(Ht)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}Q>=0&&Q<=L.width-lt&&at>=0&&at<=L.height-it&&D.readPixels(Q,at,lt,it,te.convert(re),te.convert(Ht),At)}finally{const qt=T!==null?ft.get(T).__webglFramebuffer:null;dt.bindFramebuffer(D.FRAMEBUFFER,qt)}}},this.readRenderTargetPixelsAsync=async function(L,Q,at,lt,it,At,Pt){if(!(L&&L.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let $t=ft.get(L).__webglFramebuffer;if(L.isWebGLCubeRenderTarget&&Pt!==void 0&&($t=$t[Pt]),$t){const qt=L.texture,re=qt.format,Ht=qt.type;if(!rt.textureFormatReadable(re))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!rt.textureTypeReadable(Ht))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(Q>=0&&Q<=L.width-lt&&at>=0&&at<=L.height-it){dt.bindFramebuffer(D.FRAMEBUFFER,$t);const Wt=D.createBuffer();D.bindBuffer(D.PIXEL_PACK_BUFFER,Wt),D.bufferData(D.PIXEL_PACK_BUFFER,At.byteLength,D.STREAM_READ),D.readPixels(Q,at,lt,it,te.convert(re),te.convert(Ht),0);const me=T!==null?ft.get(T).__webglFramebuffer:null;dt.bindFramebuffer(D.FRAMEBUFFER,me);const Ee=D.fenceSync(D.SYNC_GPU_COMMANDS_COMPLETE,0);return D.flush(),await Zf(D,Ee,4),D.bindBuffer(D.PIXEL_PACK_BUFFER,Wt),D.getBufferSubData(D.PIXEL_PACK_BUFFER,0,At),D.deleteBuffer(Wt),D.deleteSync(Ee),At}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(L,Q=null,at=0){L.isTexture!==!0&&(dr("WebGLRenderer: copyFramebufferToTexture function signature has changed."),Q=arguments[0]||null,L=arguments[1]);const lt=Math.pow(2,-at),it=Math.floor(L.image.width*lt),At=Math.floor(L.image.height*lt),Pt=Q!==null?Q.x:0,$t=Q!==null?Q.y:0;z.setTexture2D(L,0),D.copyTexSubImage2D(D.TEXTURE_2D,at,0,0,Pt,$t,it,At),dt.unbindTexture()},this.copyTextureToTexture=function(L,Q,at=null,lt=null,it=0){L.isTexture!==!0&&(dr("WebGLRenderer: copyTextureToTexture function signature has changed."),lt=arguments[0]||null,L=arguments[1],Q=arguments[2],it=arguments[3]||0,at=null);let At,Pt,$t,qt,re,Ht,Wt,me,Ee;const Ae=L.isCompressedTexture?L.mipmaps[it]:L.image;at!==null?(At=at.max.x-at.min.x,Pt=at.max.y-at.min.y,$t=at.isBox3?at.max.z-at.min.z:1,qt=at.min.x,re=at.min.y,Ht=at.isBox3?at.min.z:0):(At=Ae.width,Pt=Ae.height,$t=Ae.depth||1,qt=0,re=0,Ht=0),lt!==null?(Wt=lt.x,me=lt.y,Ee=lt.z):(Wt=0,me=0,Ee=0);const We=te.convert(Q.format),fe=te.convert(Q.type);let Zt;Q.isData3DTexture?(z.setTexture3D(Q,0),Zt=D.TEXTURE_3D):Q.isDataArrayTexture||Q.isCompressedArrayTexture?(z.setTexture2DArray(Q,0),Zt=D.TEXTURE_2D_ARRAY):(z.setTexture2D(Q,0),Zt=D.TEXTURE_2D),D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,Q.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,Q.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,Q.unpackAlignment);const ei=D.getParameter(D.UNPACK_ROW_LENGTH),ve=D.getParameter(D.UNPACK_IMAGE_HEIGHT),Zn=D.getParameter(D.UNPACK_SKIP_PIXELS),Ai=D.getParameter(D.UNPACK_SKIP_ROWS),fn=D.getParameter(D.UNPACK_SKIP_IMAGES);D.pixelStorei(D.UNPACK_ROW_LENGTH,Ae.width),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,Ae.height),D.pixelStorei(D.UNPACK_SKIP_PIXELS,qt),D.pixelStorei(D.UNPACK_SKIP_ROWS,re),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Ht);const $i=L.isDataArrayTexture||L.isData3DTexture,Ce=Q.isDataArrayTexture||Q.isData3DTexture;if(L.isRenderTargetTexture||L.isDepthTexture){const Bn=ft.get(L),Xs=ft.get(Q),Cn=ft.get(Bn.__renderTarget),Hn=ft.get(Xs.__renderTarget);dt.bindFramebuffer(D.READ_FRAMEBUFFER,Cn.__webglFramebuffer),dt.bindFramebuffer(D.DRAW_FRAMEBUFFER,Hn.__webglFramebuffer);for(let ci=0;ci<$t;ci++)$i&&D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,ft.get(L).__webglTexture,it,Ht+ci),L.isDepthTexture?(Ce&&D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,ft.get(Q).__webglTexture,it,Ee+ci),D.blitFramebuffer(qt,re,At,Pt,Wt,me,At,Pt,D.DEPTH_BUFFER_BIT,D.NEAREST)):Ce?D.copyTexSubImage3D(Zt,it,Wt,me,Ee+ci,qt,re,At,Pt):D.copyTexSubImage2D(Zt,it,Wt,me,Ee+ci,qt,re,At,Pt);dt.bindFramebuffer(D.READ_FRAMEBUFFER,null),dt.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else Ce?L.isDataTexture||L.isData3DTexture?D.texSubImage3D(Zt,it,Wt,me,Ee,At,Pt,$t,We,fe,Ae.data):Q.isCompressedArrayTexture?D.compressedTexSubImage3D(Zt,it,Wt,me,Ee,At,Pt,$t,We,Ae.data):D.texSubImage3D(Zt,it,Wt,me,Ee,At,Pt,$t,We,fe,Ae):L.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,it,Wt,me,At,Pt,We,fe,Ae.data):L.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,it,Wt,me,Ae.width,Ae.height,We,Ae.data):D.texSubImage2D(D.TEXTURE_2D,it,Wt,me,At,Pt,We,fe,Ae);D.pixelStorei(D.UNPACK_ROW_LENGTH,ei),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,ve),D.pixelStorei(D.UNPACK_SKIP_PIXELS,Zn),D.pixelStorei(D.UNPACK_SKIP_ROWS,Ai),D.pixelStorei(D.UNPACK_SKIP_IMAGES,fn),it===0&&Q.generateMipmaps&&D.generateMipmap(Zt),dt.unbindTexture()},this.copyTextureToTexture3D=function(L,Q,at=null,lt=null,it=0){return L.isTexture!==!0&&(dr("WebGLRenderer: copyTextureToTexture3D function signature has changed."),at=arguments[0]||null,lt=arguments[1]||null,L=arguments[2],Q=arguments[3],it=arguments[4]||0),dr('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(L,Q,at,lt,it)},this.initRenderTarget=function(L){ft.get(L).__webglFramebuffer===void 0&&z.setupRenderTarget(L)},this.initTexture=function(L){L.isCubeTexture?z.setTextureCube(L,0):L.isData3DTexture?z.setTexture3D(L,0):L.isDataArrayTexture||L.isCompressedArrayTexture?z.setTexture2DArray(L,0):z.setTexture2D(L,0),dt.unbindTexture()},this.resetState=function(){M=0,S=0,T=null,dt.reset(),ge.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Hi}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorspace=we._getDrawingBufferColorSpace(t),e.unpackColorSpace=we._getUnpackColorSpace()}}class Co extends wn{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new He,this.environmentIntensity=1,this.environmentRotation=new He,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}}class Fs extends An{constructor(t=null,e=1,n=1,i,o,r,a,l,h=Nn,c=Nn,d,u){super(null,r,a,l,h,c,i,o,d,u),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class hs extends _e{constructor(t,e,n,i=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=i}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){const t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}}const lo=new jt,L0=new jt,ia=[],D0=new Be,hx=new jt,$o=new pe,jo=new Ne;class Xi extends pe{constructor(t,e,n){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new hs(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let i=0;i<n;i++)this.setMatrixAt(i,hx)}computeBoundingBox(){const t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new Be),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,lo),D0.copy(t.boundingBox).applyMatrix4(lo),this.boundingBox.union(D0)}computeBoundingSphere(){const t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new Ne),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,lo),jo.copy(t.boundingSphere).applyMatrix4(lo),this.boundingSphere.union(jo)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){const n=e.morphTargetInfluences,i=this.morphTexture.source.data.data,o=n.length+1,r=t*o+1;for(let a=0;a<n.length;a++)n[a]=i[r+a]}raycast(t,e){const n=this.matrixWorld,i=this.count;if($o.geometry=this.geometry,$o.material=this.material,$o.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),jo.copy(this.boundingSphere),jo.applyMatrix4(n),t.ray.intersectsSphere(jo)!==!1))for(let o=0;o<i;o++){this.getMatrixAt(o,lo),L0.multiplyMatrices(n,lo),$o.matrixWorld=L0,$o.raycast(t,ia);for(let r=0,a=ia.length;r<a;r++){const l=ia[r];l.instanceId=o,l.object=this,e.push(l)}ia.length=0}}setColorAt(t,e){this.instanceColor===null&&(this.instanceColor=new hs(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3)}setMatrixAt(t,e){e.toArray(this.instanceMatrix.array,t*16)}setMorphAt(t,e){const n=e.morphTargetInfluences,i=n.length+1;this.morphTexture===null&&(this.morphTexture=new Fs(new Float32Array(i*this.count),i,this.count,Sr,$n));const o=this.morphTexture.source.data.data;let r=0;for(let h=0;h<n.length;h++)r+=n[h];const a=this.geometry.morphTargetsRelative?1:1-r,l=i*t;o[l]=a,o.set(n,l+1)}updateMorphTargets(){}dispose(){return this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null),this}}function bl(s,t){return s-t}function ux(s,t){return s.z-t.z}function dx(s,t){return t.z-s.z}class fx{constructor(){this.index=0,this.pool=[],this.list=[]}push(t,e,n,i){const o=this.pool,r=this.list;this.index>=o.length&&o.push({start:-1,count:-1,z:-1,index:-1});const a=o[this.index];r.push(a),this.index++,a.start=t,a.count=e,a.z=n,a.index=i}reset(){this.list.length=0,this.index=0}}const Un=new jt,px=new Vt(1,1,1),Sl=new Us,sa=new Be,Ms=new Ne,Zo=new C,I0=new C,mx=new C,El=new fx,bn=new pe,oa=[];function gx(s,t,e=0){const n=t.itemSize;if(s.isInterleavedBufferAttribute||s.array.constructor!==t.array.constructor){const i=s.count;for(let o=0;o<i;o++)for(let r=0;r<n;r++)t.setComponent(o+e,r,s.getComponent(o,r))}else t.array.set(s.array,e*n);t.needsUpdate=!0}function bs(s,t){if(s.constructor!==t.constructor){const e=Math.min(s.length,t.length);for(let n=0;n<e;n++)t[n]=s[n]}else{const e=Math.min(s.length,t.length);t.set(new s.constructor(s.buffer,0,e))}}class vx extends pe{get maxInstanceCount(){return this._maxInstanceCount}get instanceCount(){return this._instanceInfo.length-this._availableInstanceIds.length}get unusedVertexCount(){return this._maxVertexCount-this._nextVertexStart}get unusedIndexCount(){return this._maxIndexCount-this._nextIndexStart}constructor(t,e,n=e*2,i){super(new oe,i),this.isBatchedMesh=!0,this.perObjectFrustumCulled=!0,this.sortObjects=!0,this.boundingBox=null,this.boundingSphere=null,this.customSort=null,this._instanceInfo=[],this._geometryInfo=[],this._availableInstanceIds=[],this._availableGeometryIds=[],this._nextIndexStart=0,this._nextVertexStart=0,this._geometryCount=0,this._visibilityChanged=!0,this._geometryInitialized=!1,this._maxInstanceCount=t,this._maxVertexCount=e,this._maxIndexCount=n,this._multiDrawCounts=new Int32Array(t),this._multiDrawStarts=new Int32Array(t),this._multiDrawCount=0,this._multiDrawInstances=null,this._matricesTexture=null,this._indirectTexture=null,this._colorsTexture=null,this._initMatricesTexture(),this._initIndirectTexture()}_initMatricesTexture(){let t=Math.sqrt(this._maxInstanceCount*4);t=Math.ceil(t/4)*4,t=Math.max(t,4);const e=new Float32Array(t*t*4),n=new Fs(e,t,t,En,$n);this._matricesTexture=n}_initIndirectTexture(){let t=Math.sqrt(this._maxInstanceCount);t=Math.ceil(t);const e=new Uint32Array(t*t),n=new Fs(e,t,t,Ua,wi);this._indirectTexture=n}_initColorsTexture(){let t=Math.sqrt(this._maxInstanceCount);t=Math.ceil(t);const e=new Float32Array(t*t*4).fill(1),n=new Fs(e,t,t,En,$n);n.colorSpace=we.workingColorSpace,this._colorsTexture=n}_initializeGeometry(t){const e=this.geometry,n=this._maxVertexCount,i=this._maxIndexCount;if(this._geometryInitialized===!1){for(const o in t.attributes){const r=t.getAttribute(o),{array:a,itemSize:l,normalized:h}=r,c=new a.constructor(n*l),d=new _e(c,l,h);e.setAttribute(o,d)}if(t.getIndex()!==null){const o=n>65535?new Uint32Array(i):new Uint16Array(i);e.setIndex(new _e(o,1))}this._geometryInitialized=!0}}_validateGeometry(t){const e=this.geometry;if(!!t.getIndex()!=!!e.getIndex())throw new Error('BatchedMesh: All geometries must consistently have "index".');for(const n in e.attributes){if(!t.hasAttribute(n))throw new Error(`BatchedMesh: Added geometry missing "${n}". All geometries must have consistent attributes.`);const i=t.getAttribute(n),o=e.getAttribute(n);if(i.itemSize!==o.itemSize||i.normalized!==o.normalized)throw new Error("BatchedMesh: All attributes must have a consistent itemSize and normalized value.")}}setCustomSort(t){return this.customSort=t,this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Be);const t=this.boundingBox,e=this._instanceInfo;t.makeEmpty();for(let n=0,i=e.length;n<i;n++){if(e[n].active===!1)continue;const o=e[n].geometryIndex;this.getMatrixAt(n,Un),this.getBoundingBoxAt(o,sa).applyMatrix4(Un),t.union(sa)}}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ne);const t=this.boundingSphere,e=this._instanceInfo;t.makeEmpty();for(let n=0,i=e.length;n<i;n++){if(e[n].active===!1)continue;const o=e[n].geometryIndex;this.getMatrixAt(n,Un),this.getBoundingSphereAt(o,Ms).applyMatrix4(Un),t.union(Ms)}}addInstance(t){if(this._instanceInfo.length>=this.maxInstanceCount&&this._availableInstanceIds.length===0)throw new Error("BatchedMesh: Maximum item count reached.");const n={visible:!0,active:!0,geometryIndex:t};let i=null;this._availableInstanceIds.length>0?(this._availableInstanceIds.sort(bl),i=this._availableInstanceIds.shift(),this._instanceInfo[i]=n):(i=this._instanceInfo.length,this._instanceInfo.push(n));const o=this._matricesTexture;Un.identity().toArray(o.image.data,i*16),o.needsUpdate=!0;const r=this._colorsTexture;return r&&(px.toArray(r.image.data,i*4),r.needsUpdate=!0),this._visibilityChanged=!0,i}addGeometry(t,e=-1,n=-1){this._initializeGeometry(t),this._validateGeometry(t);const i={vertexStart:-1,vertexCount:-1,reservedVertexCount:-1,indexStart:-1,indexCount:-1,reservedIndexCount:-1,start:-1,count:-1,boundingBox:null,boundingSphere:null,active:!0},o=this._geometryInfo;i.vertexStart=this._nextVertexStart,i.reservedVertexCount=e===-1?t.getAttribute("position").count:e;const r=t.getIndex();if(r!==null&&(i.indexStart=this._nextIndexStart,i.reservedIndexCount=n===-1?r.count:n),i.indexStart!==-1&&i.indexStart+i.reservedIndexCount>this._maxIndexCount||i.vertexStart+i.reservedVertexCount>this._maxVertexCount)throw new Error("BatchedMesh: Reserved space request exceeds the maximum buffer size.");let l;return this._availableGeometryIds.length>0?(this._availableGeometryIds.sort(bl),l=this._availableGeometryIds.shift(),o[l]=i):(l=this._geometryCount,this._geometryCount++,o.push(i)),this.setGeometryAt(l,t),this._nextIndexStart=i.indexStart+i.reservedIndexCount,this._nextVertexStart=i.vertexStart+i.reservedVertexCount,l}setGeometryAt(t,e){if(t>=this._geometryCount)throw new Error("BatchedMesh: Maximum geometry count reached.");this._validateGeometry(e);const n=this.geometry,i=n.getIndex()!==null,o=n.getIndex(),r=e.getIndex(),a=this._geometryInfo[t];if(i&&r.count>a.reservedIndexCount||e.attributes.position.count>a.reservedVertexCount)throw new Error("BatchedMesh: Reserved space not large enough for provided geometry.");const l=a.vertexStart,h=a.reservedVertexCount;a.vertexCount=e.getAttribute("position").count;for(const c in n.attributes){const d=e.getAttribute(c),u=n.getAttribute(c);gx(d,u,l);const p=d.itemSize;for(let f=d.count,v=h;f<v;f++){const m=l+f;for(let g=0;g<p;g++)u.setComponent(m,g,0)}u.needsUpdate=!0,u.addUpdateRange(l*p,h*p)}if(i){const c=a.indexStart,d=a.reservedIndexCount;a.indexCount=e.getIndex().count;for(let u=0;u<r.count;u++)o.setX(c+u,l+r.getX(u));for(let u=r.count,p=d;u<p;u++)o.setX(c+u,l);o.needsUpdate=!0,o.addUpdateRange(c,a.reservedIndexCount)}return a.start=i?a.indexStart:a.vertexStart,a.count=i?a.indexCount:a.vertexCount,a.boundingBox=null,e.boundingBox!==null&&(a.boundingBox=e.boundingBox.clone()),a.boundingSphere=null,e.boundingSphere!==null&&(a.boundingSphere=e.boundingSphere.clone()),this._visibilityChanged=!0,t}deleteGeometry(t){const e=this._geometryInfo;if(t>=e.length||e[t].active===!1)return this;const n=this._instanceInfo;for(let i=0,o=n.length;i<o;i++)n[i].geometryIndex===t&&this.deleteInstance(i);return e[t].active=!1,this._availableGeometryIds.push(t),this._visibilityChanged=!0,this}deleteInstance(t){const e=this._instanceInfo;return t>=e.length||e[t].active===!1?this:(e[t].active=!1,this._availableInstanceIds.push(t),this._visibilityChanged=!0,this)}optimize(){let t=0,e=0;const n=this._geometryInfo,i=n.map((r,a)=>a).sort((r,a)=>n[r].vertexStart-n[a].vertexStart),o=this.geometry;for(let r=0,a=n.length;r<a;r++){const l=i[r],h=n[l];if(h.active!==!1){if(o.index!==null){if(h.indexStart!==e){const{indexStart:c,vertexStart:d,reservedIndexCount:u}=h,p=o.index,f=p.array,v=t-d;for(let m=c;m<c+u;m++)f[m]=f[m]+v;p.array.copyWithin(e,c,c+u),p.addUpdateRange(e,u),h.indexStart=e}e+=h.reservedIndexCount}if(h.vertexStart!==t){const{vertexStart:c,reservedVertexCount:d}=h,u=o.attributes;for(const p in u){const f=u[p],{array:v,itemSize:m}=f;v.copyWithin(t*m,c*m,(c+d)*m),f.addUpdateRange(t*m,d*m)}h.vertexStart=t}t+=h.reservedVertexCount,h.start=o.index?h.indexStart:h.vertexStart,this._nextIndexStart=o.index?h.indexStart+h.reservedIndexCount:0,this._nextVertexStart=h.vertexStart+h.reservedVertexCount}}return this}getBoundingBoxAt(t,e){if(t>=this._geometryCount)return null;const n=this.geometry,i=this._geometryInfo[t];if(i.boundingBox===null){const o=new Be,r=n.index,a=n.attributes.position;for(let l=i.start,h=i.start+i.count;l<h;l++){let c=l;r&&(c=r.getX(c)),o.expandByPoint(Zo.fromBufferAttribute(a,c))}i.boundingBox=o}return e.copy(i.boundingBox),e}getBoundingSphereAt(t,e){if(t>=this._geometryCount)return null;const n=this.geometry,i=this._geometryInfo[t];if(i.boundingSphere===null){const o=new Ne;this.getBoundingBoxAt(t,sa),sa.getCenter(o.center);const r=n.index,a=n.attributes.position;let l=0;for(let h=i.start,c=i.start+i.count;h<c;h++){let d=h;r&&(d=r.getX(d)),Zo.fromBufferAttribute(a,d),l=Math.max(l,o.center.distanceToSquared(Zo))}o.radius=Math.sqrt(l),i.boundingSphere=o}return e.copy(i.boundingSphere),e}setMatrixAt(t,e){const n=this._instanceInfo,i=this._matricesTexture,o=this._matricesTexture.image.data;return t>=n.length||n[t].active===!1?this:(e.toArray(o,t*16),i.needsUpdate=!0,this)}getMatrixAt(t,e){const n=this._instanceInfo,i=this._matricesTexture.image.data;return t>=n.length||n[t].active===!1?null:e.fromArray(i,t*16)}setColorAt(t,e){this._colorsTexture===null&&this._initColorsTexture();const n=this._colorsTexture,i=this._colorsTexture.image.data,o=this._instanceInfo;return t>=o.length||o[t].active===!1?this:(e.toArray(i,t*4),n.needsUpdate=!0,this)}getColorAt(t,e){const n=this._colorsTexture.image.data,i=this._instanceInfo;return t>=i.length||i[t].active===!1?null:e.fromArray(n,t*4)}setVisibleAt(t,e){const n=this._instanceInfo;return t>=n.length||n[t].active===!1||n[t].visible===e?this:(n[t].visible=e,this._visibilityChanged=!0,this)}getVisibleAt(t){const e=this._instanceInfo;return t>=e.length||e[t].active===!1?!1:e[t].visible}setGeometryIdAt(t,e){const n=this._instanceInfo,i=this._geometryInfo;return t>=n.length||n[t].active===!1||e>=i.length||i[e].active===!1?null:(n[t].geometryIndex=e,this)}getGeometryIdAt(t){const e=this._instanceInfo;return t>=e.length||e[t].active===!1?-1:e[t].geometryIndex}getGeometryRangeAt(t,e={}){if(t<0||t>=this._geometryCount)return null;const n=this._geometryInfo[t];return e.vertexStart=n.vertexStart,e.vertexCount=n.vertexCount,e.reservedVertexCount=n.reservedVertexCount,e.indexStart=n.indexStart,e.indexCount=n.indexCount,e.reservedIndexCount=n.reservedIndexCount,e.start=n.start,e.count=n.count,e}setInstanceCount(t){const e=this._availableInstanceIds,n=this._instanceInfo;for(e.sort(bl);e[e.length-1]===n.length;)n.pop(),e.pop();if(t<n.length)throw new Error(`BatchedMesh: Instance ids outside the range ${t} are being used. Cannot shrink instance count.`);const i=new Int32Array(t),o=new Int32Array(t);bs(this._multiDrawCounts,i),bs(this._multiDrawStarts,o),this._multiDrawCounts=i,this._multiDrawStarts=o,this._maxInstanceCount=t;const r=this._indirectTexture,a=this._matricesTexture,l=this._colorsTexture;r.dispose(),this._initIndirectTexture(),bs(r.image.data,this._indirectTexture.image.data),a.dispose(),this._initMatricesTexture(),bs(a.image.data,this._matricesTexture.image.data),l&&(l.dispose(),this._initColorsTexture(),bs(l.image.data,this._colorsTexture.image.data))}setGeometrySize(t,e){const n=[...this._geometryInfo].filter(a=>a.active);if(Math.max(...n.map(a=>a.vertexStart+a.reservedVertexCount))>t)throw new Error(`BatchedMesh: Geometry vertex values are being used outside the range ${e}. Cannot shrink further.`);if(this.geometry.index&&Math.max(...n.map(l=>l.indexStart+l.reservedIndexCount))>e)throw new Error(`BatchedMesh: Geometry index values are being used outside the range ${e}. Cannot shrink further.`);const o=this.geometry;o.dispose(),this._maxVertexCount=t,this._maxIndexCount=e,this._geometryInitialized&&(this._geometryInitialized=!1,this.geometry=new oe,this._initializeGeometry(o));const r=this.geometry;o.index&&bs(o.index.array,r.index.array);for(const a in o.attributes)bs(o.attributes[a].array,r.attributes[a].array)}raycast(t,e){const n=this._instanceInfo,i=this._geometryInfo,o=this.matrixWorld,r=this.geometry;bn.material=this.material,bn.geometry.index=r.index,bn.geometry.attributes=r.attributes,bn.geometry.boundingBox===null&&(bn.geometry.boundingBox=new Be),bn.geometry.boundingSphere===null&&(bn.geometry.boundingSphere=new Ne);for(let a=0,l=n.length;a<l;a++){if(!n[a].visible||!n[a].active)continue;const h=n[a].geometryIndex,c=i[h];bn.geometry.setDrawRange(c.start,c.count),this.getMatrixAt(a,bn.matrixWorld).premultiply(o),this.getBoundingBoxAt(h,bn.geometry.boundingBox),this.getBoundingSphereAt(h,bn.geometry.boundingSphere),bn.raycast(t,oa);for(let d=0,u=oa.length;d<u;d++){const p=oa[d];p.object=this,p.batchId=a,e.push(p)}oa.length=0}bn.material=null,bn.geometry.index=null,bn.geometry.attributes={},bn.geometry.setDrawRange(0,1/0)}copy(t){return super.copy(t),this.geometry=t.geometry.clone(),this.perObjectFrustumCulled=t.perObjectFrustumCulled,this.sortObjects=t.sortObjects,this.boundingBox=t.boundingBox!==null?t.boundingBox.clone():null,this.boundingSphere=t.boundingSphere!==null?t.boundingSphere.clone():null,this._geometryInfo=t._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox!==null?e.boundingBox.clone():null,boundingSphere:e.boundingSphere!==null?e.boundingSphere.clone():null})),this._instanceInfo=t._instanceInfo.map(e=>({...e})),this._maxInstanceCount=t._maxInstanceCount,this._maxVertexCount=t._maxVertexCount,this._maxIndexCount=t._maxIndexCount,this._geometryInitialized=t._geometryInitialized,this._geometryCount=t._geometryCount,this._multiDrawCounts=t._multiDrawCounts.slice(),this._multiDrawStarts=t._multiDrawStarts.slice(),this._matricesTexture=t._matricesTexture.clone(),this._matricesTexture.image.data=this._matricesTexture.image.data.slice(),this._colorsTexture!==null&&(this._colorsTexture=t._colorsTexture.clone(),this._colorsTexture.image.data=this._colorsTexture.image.data.slice()),this}dispose(){return this.geometry.dispose(),this._matricesTexture.dispose(),this._matricesTexture=null,this._indirectTexture.dispose(),this._indirectTexture=null,this._colorsTexture!==null&&(this._colorsTexture.dispose(),this._colorsTexture=null),this}onBeforeRender(t,e,n,i,o){if(!this._visibilityChanged&&!this.perObjectFrustumCulled&&!this.sortObjects)return;const r=i.getIndex(),a=r===null?1:r.array.BYTES_PER_ELEMENT,l=this._instanceInfo,h=this._multiDrawStarts,c=this._multiDrawCounts,d=this._geometryInfo,u=this.perObjectFrustumCulled,p=this._indirectTexture,f=p.image.data;u&&(Un.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse).multiply(this.matrixWorld),Sl.setFromProjectionMatrix(Un,t.coordinateSystem));let v=0;if(this.sortObjects){Un.copy(this.matrixWorld).invert(),Zo.setFromMatrixPosition(n.matrixWorld).applyMatrix4(Un),I0.set(0,0,-1).transformDirection(n.matrixWorld).transformDirection(Un);for(let w=0,y=l.length;w<y;w++)if(l[w].visible&&l[w].active){const x=l[w].geometryIndex;this.getMatrixAt(w,Un),this.getBoundingSphereAt(x,Ms).applyMatrix4(Un);let b=!1;if(u&&(b=!Sl.intersectsSphere(Ms)),!b){const M=d[x],S=mx.subVectors(Ms.center,Zo).dot(I0);El.push(M.start,M.count,S,w)}}const m=El.list,g=this.customSort;g===null?m.sort(o.transparent?dx:ux):g.call(this,m,n);for(let w=0,y=m.length;w<y;w++){const x=m[w];h[v]=x.start*a,c[v]=x.count,f[v]=x.index,v++}El.reset()}else for(let m=0,g=l.length;m<g;m++)if(l[m].visible&&l[m].active){const w=l[m].geometryIndex;let y=!1;if(u&&(this.getMatrixAt(m,Un),this.getBoundingSphereAt(w,Ms).applyMatrix4(Un),y=!Sl.intersectsSphere(Ms)),!y){const x=d[w];h[v]=x.start*a,c[v]=x.count,f[v]=m,v++}}p.needsUpdate=!0,this._multiDrawCount=v,this._visibilityChanged=!1}onBeforeShadow(t,e,n,i,o,r){this.onBeforeRender(t,null,i,o,r)}}class xx extends zo{static get type(){return"PointsMaterial"}constructor(t){super(),this.isPointsMaterial=!0,this.color=new Vt(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}}const z0=new jt,Oc=new Ju,ra=new Ne,aa=new C;class wx extends wn{constructor(t=new oe,e=new xx){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}raycast(t,e){const n=this.geometry,i=this.matrixWorld,o=t.params.Points.threshold,r=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),ra.copy(n.boundingSphere),ra.applyMatrix4(i),ra.radius+=o,t.ray.intersectsSphere(ra)===!1)return;z0.copy(i).invert(),Oc.copy(t.ray).applyMatrix4(z0);const a=o/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,h=n.index,d=n.attributes.position;if(h!==null){const u=Math.max(0,r.start),p=Math.min(h.count,r.start+r.count);for(let f=u,v=p;f<v;f++){const m=h.getX(f);aa.fromBufferAttribute(d,m),N0(aa,m,l,i,t,e,this)}}else{const u=Math.max(0,r.start),p=Math.min(d.count,r.start+r.count);for(let f=u,v=p;f<v;f++)aa.fromBufferAttribute(d,f),N0(aa,f,l,i,t,e,this)}}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let o=0,r=i.length;o<r;o++){const a=i[o].name||String(o);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=o}}}}}function N0(s,t,e,n,i,o,r){const a=Oc.distanceSqToPoint(s);if(a<e){const l=new C;Oc.closestPointToPoint(s,l),l.applyMatrix4(n);const h=i.ray.origin.distanceTo(l);if(h<i.near||h>i.far)return;o.push({distance:h,distanceToRay:Math.sqrt(a),point:l,index:t,face:null,faceIndex:null,barycoord:null,object:r})}}class Rr extends An{constructor(t,e,n,i,o,r,a,l,h){super(t,e,n,i,o,r,a,l,h),this.isCanvasTexture=!0,this.needsUpdate=!0}}class Mi{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(t,e){const n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){const t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const e=[];let n,i=this.getPoint(0),o=0;e.push(0);for(let r=1;r<=t;r++)n=this.getPoint(r/t),o+=n.distanceTo(i),e.push(o),i=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e){const n=this.getLengths();let i=0;const o=n.length;let r;e?r=e:r=t*n[o-1];let a=0,l=o-1,h;for(;a<=l;)if(i=Math.floor(a+(l-a)/2),h=n[i]-r,h<0)a=i+1;else if(h>0)l=i-1;else{l=i;break}if(i=l,n[i]===r)return i/(o-1);const c=n[i],u=n[i+1]-c,p=(r-c)/u;return(i+p)/(o-1)}getTangent(t,e){let i=t-1e-4,o=t+1e-4;i<0&&(i=0),o>1&&(o=1);const r=this.getPoint(i),a=this.getPoint(o),l=e||(r.isVector2?new Rt:new C);return l.copy(a).sub(r).normalize(),l}getTangentAt(t,e){const n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e){const n=new C,i=[],o=[],r=[],a=new C,l=new jt;for(let p=0;p<=t;p++){const f=p/t;i[p]=this.getTangentAt(f,new C)}o[0]=new C,r[0]=new C;let h=Number.MAX_VALUE;const c=Math.abs(i[0].x),d=Math.abs(i[0].y),u=Math.abs(i[0].z);c<=h&&(h=c,n.set(1,0,0)),d<=h&&(h=d,n.set(0,1,0)),u<=h&&n.set(0,0,1),a.crossVectors(i[0],n).normalize(),o[0].crossVectors(i[0],a),r[0].crossVectors(i[0],o[0]);for(let p=1;p<=t;p++){if(o[p]=o[p-1].clone(),r[p]=r[p-1].clone(),a.crossVectors(i[p-1],i[p]),a.length()>Number.EPSILON){a.normalize();const f=Math.acos(Je(i[p-1].dot(i[p]),-1,1));o[p].applyMatrix4(l.makeRotationAxis(a,f))}r[p].crossVectors(i[p],o[p])}if(e===!0){let p=Math.acos(Je(o[0].dot(o[t]),-1,1));p/=t,i[0].dot(a.crossVectors(o[0],o[t]))>0&&(p=-p);for(let f=1;f<=t;f++)o[f].applyMatrix4(l.makeRotationAxis(i[f],p*f)),r[f].crossVectors(i[f],o[f])}return{tangents:i,normals:o,binormals:r}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){const t={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}}class nh extends Mi{constructor(t=0,e=0,n=1,i=1,o=0,r=Math.PI*2,a=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=i,this.aStartAngle=o,this.aEndAngle=r,this.aClockwise=a,this.aRotation=l}getPoint(t,e=new Rt){const n=e,i=Math.PI*2;let o=this.aEndAngle-this.aStartAngle;const r=Math.abs(o)<Number.EPSILON;for(;o<0;)o+=i;for(;o>i;)o-=i;o<Number.EPSILON&&(r?o=0:o=i),this.aClockwise===!0&&!r&&(o===i?o=-i:o=o-i);const a=this.aStartAngle+t*o;let l=this.aX+this.xRadius*Math.cos(a),h=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){const c=Math.cos(this.aRotation),d=Math.sin(this.aRotation),u=l-this.aX,p=h-this.aY;l=u*c-p*d+this.aX,h=u*d+p*c+this.aY}return n.set(l,h)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){const t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}}class yx extends nh{constructor(t,e,n,i,o,r){super(t,e,n,n,i,o,r),this.isArcCurve=!0,this.type="ArcCurve"}}function ih(){let s=0,t=0,e=0,n=0;function i(o,r,a,l){s=o,t=a,e=-3*o+3*r-2*a-l,n=2*o-2*r+a+l}return{initCatmullRom:function(o,r,a,l,h){i(r,a,h*(a-o),h*(l-r))},initNonuniformCatmullRom:function(o,r,a,l,h,c,d){let u=(r-o)/h-(a-o)/(h+c)+(a-r)/c,p=(a-r)/c-(l-r)/(c+d)+(l-a)/d;u*=c,p*=c,i(r,a,u,p)},calc:function(o){const r=o*o,a=r*o;return s+t*o+e*r+n*a}}}const la=new C,Tl=new ih,Al=new ih,Cl=new ih;class dd extends Mi{constructor(t=[],e=!1,n="centripetal",i=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=i}getPoint(t,e=new C){const n=e,i=this.points,o=i.length,r=(o-(this.closed?0:1))*t;let a=Math.floor(r),l=r-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/o)+1)*o:l===0&&a===o-1&&(a=o-2,l=1);let h,c;this.closed||a>0?h=i[(a-1)%o]:(la.subVectors(i[0],i[1]).add(i[0]),h=la);const d=i[a%o],u=i[(a+1)%o];if(this.closed||a+2<o?c=i[(a+2)%o]:(la.subVectors(i[o-1],i[o-2]).add(i[o-1]),c=la),this.curveType==="centripetal"||this.curveType==="chordal"){const p=this.curveType==="chordal"?.5:.25;let f=Math.pow(h.distanceToSquared(d),p),v=Math.pow(d.distanceToSquared(u),p),m=Math.pow(u.distanceToSquared(c),p);v<1e-4&&(v=1),f<1e-4&&(f=v),m<1e-4&&(m=v),Tl.initNonuniformCatmullRom(h.x,d.x,u.x,c.x,f,v,m),Al.initNonuniformCatmullRom(h.y,d.y,u.y,c.y,f,v,m),Cl.initNonuniformCatmullRom(h.z,d.z,u.z,c.z,f,v,m)}else this.curveType==="catmullrom"&&(Tl.initCatmullRom(h.x,d.x,u.x,c.x,this.tension),Al.initCatmullRom(h.y,d.y,u.y,c.y,this.tension),Cl.initCatmullRom(h.z,d.z,u.z,c.z,this.tension));return n.set(Tl.calc(l),Al.calc(l),Cl.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(i.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const i=this.points[e];t.points.push(i.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(new C().fromArray(i))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}}function U0(s,t,e,n,i){const o=(n-t)*.5,r=(i-e)*.5,a=s*s,l=s*a;return(2*e-2*n+o+r)*l+(-3*e+3*n-2*o-r)*a+o*s+e}function _x(s,t){const e=1-s;return e*e*t}function Mx(s,t){return 2*(1-s)*s*t}function bx(s,t){return s*s*t}function xr(s,t,e,n){return _x(s,t)+Mx(s,e)+bx(s,n)}function Sx(s,t){const e=1-s;return e*e*e*t}function Ex(s,t){const e=1-s;return 3*e*e*s*t}function Tx(s,t){return 3*(1-s)*s*s*t}function Ax(s,t){return s*s*s*t}function wr(s,t,e,n,i){return Sx(s,t)+Ex(s,e)+Tx(s,n)+Ax(s,i)}class fd extends Mi{constructor(t=new Rt,e=new Rt,n=new Rt,i=new Rt){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new Rt){const n=e,i=this.v0,o=this.v1,r=this.v2,a=this.v3;return n.set(wr(t,i.x,o.x,r.x,a.x),wr(t,i.y,o.y,r.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Cx extends Mi{constructor(t=new C,e=new C,n=new C,i=new C){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new C){const n=e,i=this.v0,o=this.v1,r=this.v2,a=this.v3;return n.set(wr(t,i.x,o.x,r.x,a.x),wr(t,i.y,o.y,r.y,a.y),wr(t,i.z,o.z,r.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class pd extends Mi{constructor(t=new Rt,e=new Rt){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new Rt){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new Rt){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Rx extends Mi{constructor(t=new C,e=new C){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new C){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new C){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class md extends Mi{constructor(t=new Rt,e=new Rt,n=new Rt){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new Rt){const n=e,i=this.v0,o=this.v1,r=this.v2;return n.set(xr(t,i.x,o.x,r.x),xr(t,i.y,o.y,r.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class gd extends Mi{constructor(t=new C,e=new C,n=new C){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new C){const n=e,i=this.v0,o=this.v1,r=this.v2;return n.set(xr(t,i.x,o.x,r.x),xr(t,i.y,o.y,r.y),xr(t,i.z,o.z,r.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class vd extends Mi{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new Rt){const n=e,i=this.points,o=(i.length-1)*t,r=Math.floor(o),a=o-r,l=i[r===0?r:r-1],h=i[r],c=i[r>i.length-2?i.length-1:r+1],d=i[r>i.length-3?i.length-1:r+2];return n.set(U0(a,l.x,h.x,c.x,d.x),U0(a,l.y,h.y,c.y,d.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(i.clone())}return this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const i=this.points[e];t.points.push(i.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(new Rt().fromArray(i))}return this}}var Bc=Object.freeze({__proto__:null,ArcCurve:yx,CatmullRomCurve3:dd,CubicBezierCurve:fd,CubicBezierCurve3:Cx,EllipseCurve:nh,LineCurve:pd,LineCurve3:Rx,QuadraticBezierCurve:md,QuadraticBezierCurve3:gd,SplineCurve:vd});class Px extends Mi{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){const t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){const n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Bc[n](e,t))}return this}getPoint(t,e){const n=t*this.getLength(),i=this.getCurveLengths();let o=0;for(;o<i.length;){if(i[o]>=n){const r=i[o]-n,a=this.curves[o],l=a.getLength(),h=l===0?0:1-r/l;return a.getPointAt(h,e)}o++}return null}getLength(){const t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const t=[];let e=0;for(let n=0,i=this.curves.length;n<i;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){const e=[];let n;for(let i=0,o=this.curves;i<o.length;i++){const r=o[i],a=r.isEllipseCurve?t*2:r.isLineCurve||r.isLineCurve3?1:r.isSplineCurve?t*r.points.length:t,l=r.getPoints(a);for(let h=0;h<l.length;h++){const c=l[h];n&&n.equals(c)||(e.push(c),n=c)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const i=t.curves[e];this.curves.push(i.clone())}return this.autoClose=t.autoClose,this}toJSON(){const t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){const i=this.curves[e];t.curves.push(i.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const i=t.curves[e];this.curves.push(new Bc[i.type]().fromJSON(i))}return this}}class Lx extends Px{constructor(t){super(),this.type="Path",this.currentPoint=new Rt,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){const n=new pd(this.currentPoint.clone(),new Rt(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,i){const o=new md(this.currentPoint.clone(),new Rt(t,e),new Rt(n,i));return this.curves.push(o),this.currentPoint.set(n,i),this}bezierCurveTo(t,e,n,i,o,r){const a=new fd(this.currentPoint.clone(),new Rt(t,e),new Rt(n,i),new Rt(o,r));return this.curves.push(a),this.currentPoint.set(o,r),this}splineThru(t){const e=[this.currentPoint.clone()].concat(t),n=new vd(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,i,o,r){const a=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+a,e+l,n,i,o,r),this}absarc(t,e,n,i,o,r){return this.absellipse(t,e,n,n,i,o,r),this}ellipse(t,e,n,i,o,r,a,l){const h=this.currentPoint.x,c=this.currentPoint.y;return this.absellipse(t+h,e+c,n,i,o,r,a,l),this}absellipse(t,e,n,i,o,r,a,l){const h=new nh(t,e,n,i,o,r,a,l);if(this.curves.length>0){const d=h.getPoint(0);d.equals(this.currentPoint)||this.lineTo(d.x,d.y)}this.curves.push(h);const c=h.getPoint(1);return this.currentPoint.copy(c),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){const t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}}class Ba extends oe{constructor(t=[new Rt(0,-.5),new Rt(.5,0),new Rt(0,.5)],e=12,n=0,i=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:t,segments:e,phiStart:n,phiLength:i},e=Math.floor(e),i=Je(i,0,Math.PI*2);const o=[],r=[],a=[],l=[],h=[],c=1/e,d=new C,u=new Rt,p=new C,f=new C,v=new C;let m=0,g=0;for(let w=0;w<=t.length-1;w++)switch(w){case 0:m=t[w+1].x-t[w].x,g=t[w+1].y-t[w].y,p.x=g*1,p.y=-m,p.z=g*0,v.copy(p),p.normalize(),l.push(p.x,p.y,p.z);break;case t.length-1:l.push(v.x,v.y,v.z);break;default:m=t[w+1].x-t[w].x,g=t[w+1].y-t[w].y,p.x=g*1,p.y=-m,p.z=g*0,f.copy(p),p.x+=v.x,p.y+=v.y,p.z+=v.z,p.normalize(),l.push(p.x,p.y,p.z),v.copy(f)}for(let w=0;w<=e;w++){const y=n+w*c*i,x=Math.sin(y),b=Math.cos(y);for(let M=0;M<=t.length-1;M++){d.x=t[M].x*x,d.y=t[M].y,d.z=t[M].x*b,r.push(d.x,d.y,d.z),u.x=w/e,u.y=M/(t.length-1),a.push(u.x,u.y);const S=l[3*M+0]*x,T=l[3*M+1],_=l[3*M+0]*b;h.push(S,T,_)}}for(let w=0;w<e;w++)for(let y=0;y<t.length-1;y++){const x=y+w*t.length,b=x,M=x+t.length,S=x+t.length+1,T=x+1;o.push(b,M,T),o.push(S,T,M)}this.setIndex(o),this.setAttribute("position",new Mt(r,3)),this.setAttribute("uv",new Mt(a,2)),this.setAttribute("normal",new Mt(h,3))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ba(t.points,t.segments,t.phiStart,t.phiLength)}}class sh extends Ba{constructor(t=1,e=1,n=4,i=8){const o=new Lx;o.absarc(0,-e/2,t,Math.PI*1.5,0),o.absarc(0,e/2,t,0,Math.PI*.5),super(o.getPoints(n),i),this.type="CapsuleGeometry",this.parameters={radius:t,length:e,capSegments:n,radialSegments:i}}static fromJSON(t){return new sh(t.radius,t.length,t.capSegments,t.radialSegments)}}class oh extends oe{constructor(t=1,e=32,n=0,i=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:i},e=Math.max(3,e);const o=[],r=[],a=[],l=[],h=new C,c=new Rt;r.push(0,0,0),a.push(0,0,1),l.push(.5,.5);for(let d=0,u=3;d<=e;d++,u+=3){const p=n+d/e*i;h.x=t*Math.cos(p),h.y=t*Math.sin(p),r.push(h.x,h.y,h.z),a.push(0,0,1),c.x=(r[u]/t+1)/2,c.y=(r[u+1]/t+1)/2,l.push(c.x,c.y)}for(let d=1;d<=e;d++)o.push(d,d+1,0);this.setIndex(o),this.setAttribute("position",new Mt(r,3)),this.setAttribute("normal",new Mt(a,3)),this.setAttribute("uv",new Mt(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new oh(t.radius,t.segments,t.thetaStart,t.thetaLength)}}class be extends oe{constructor(t=1,e=1,n=1,i=32,o=1,r=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:i,heightSegments:o,openEnded:r,thetaStart:a,thetaLength:l};const h=this;i=Math.floor(i),o=Math.floor(o);const c=[],d=[],u=[],p=[];let f=0;const v=[],m=n/2;let g=0;w(),r===!1&&(t>0&&y(!0),e>0&&y(!1)),this.setIndex(c),this.setAttribute("position",new Mt(d,3)),this.setAttribute("normal",new Mt(u,3)),this.setAttribute("uv",new Mt(p,2));function w(){const x=new C,b=new C;let M=0;const S=(e-t)/n;for(let T=0;T<=o;T++){const _=[],E=T/o,A=E*(e-t)+t;for(let U=0;U<=i;U++){const F=U/i,I=F*l+a,B=Math.sin(I),k=Math.cos(I);b.x=A*B,b.y=-E*n+m,b.z=A*k,d.push(b.x,b.y,b.z),x.set(B,S,k).normalize(),u.push(x.x,x.y,x.z),p.push(F,1-E),_.push(f++)}v.push(_)}for(let T=0;T<i;T++)for(let _=0;_<o;_++){const E=v[_][T],A=v[_+1][T],U=v[_+1][T+1],F=v[_][T+1];(t>0||_!==0)&&(c.push(E,A,F),M+=3),(e>0||_!==o-1)&&(c.push(A,U,F),M+=3)}h.addGroup(g,M,0),g+=M}function y(x){const b=f,M=new Rt,S=new C;let T=0;const _=x===!0?t:e,E=x===!0?1:-1;for(let U=1;U<=i;U++)d.push(0,m*E,0),u.push(0,E,0),p.push(.5,.5),f++;const A=f;for(let U=0;U<=i;U++){const I=U/i*l+a,B=Math.cos(I),k=Math.sin(I);S.x=_*k,S.y=m*E,S.z=_*B,d.push(S.x,S.y,S.z),u.push(0,E,0),M.x=B*.5+.5,M.y=k*.5*E+.5,p.push(M.x,M.y),f++}for(let U=0;U<i;U++){const F=b+U,I=A+U;x===!0?c.push(I,I+1,F):c.push(I+1,I,F),T+=3}h.addGroup(g,T,x===!0?1:2),g+=T}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new be(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class rh extends oe{constructor(t=[],e=[],n=1,i=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:n,detail:i};const o=[],r=[];a(i),h(n),c(),this.setAttribute("position",new Mt(o,3)),this.setAttribute("normal",new Mt(o.slice(),3)),this.setAttribute("uv",new Mt(r,2)),i===0?this.computeVertexNormals():this.normalizeNormals();function a(w){const y=new C,x=new C,b=new C;for(let M=0;M<e.length;M+=3)p(e[M+0],y),p(e[M+1],x),p(e[M+2],b),l(y,x,b,w)}function l(w,y,x,b){const M=b+1,S=[];for(let T=0;T<=M;T++){S[T]=[];const _=w.clone().lerp(x,T/M),E=y.clone().lerp(x,T/M),A=M-T;for(let U=0;U<=A;U++)U===0&&T===M?S[T][U]=_:S[T][U]=_.clone().lerp(E,U/A)}for(let T=0;T<M;T++)for(let _=0;_<2*(M-T)-1;_++){const E=Math.floor(_/2);_%2===0?(u(S[T][E+1]),u(S[T+1][E]),u(S[T][E])):(u(S[T][E+1]),u(S[T+1][E+1]),u(S[T+1][E]))}}function h(w){const y=new C;for(let x=0;x<o.length;x+=3)y.x=o[x+0],y.y=o[x+1],y.z=o[x+2],y.normalize().multiplyScalar(w),o[x+0]=y.x,o[x+1]=y.y,o[x+2]=y.z}function c(){const w=new C;for(let y=0;y<o.length;y+=3){w.x=o[y+0],w.y=o[y+1],w.z=o[y+2];const x=m(w)/2/Math.PI+.5,b=g(w)/Math.PI+.5;r.push(x,1-b)}f(),d()}function d(){for(let w=0;w<r.length;w+=6){const y=r[w+0],x=r[w+2],b=r[w+4],M=Math.max(y,x,b),S=Math.min(y,x,b);M>.9&&S<.1&&(y<.2&&(r[w+0]+=1),x<.2&&(r[w+2]+=1),b<.2&&(r[w+4]+=1))}}function u(w){o.push(w.x,w.y,w.z)}function p(w,y){const x=w*3;y.x=t[x+0],y.y=t[x+1],y.z=t[x+2]}function f(){const w=new C,y=new C,x=new C,b=new C,M=new Rt,S=new Rt,T=new Rt;for(let _=0,E=0;_<o.length;_+=9,E+=6){w.set(o[_+0],o[_+1],o[_+2]),y.set(o[_+3],o[_+4],o[_+5]),x.set(o[_+6],o[_+7],o[_+8]),M.set(r[E+0],r[E+1]),S.set(r[E+2],r[E+3]),T.set(r[E+4],r[E+5]),b.copy(w).add(y).add(x).divideScalar(3);const A=m(b);v(M,E+0,w,A),v(S,E+2,y,A),v(T,E+4,x,A)}}function v(w,y,x,b){b<0&&w.x===1&&(r[y]=w.x-1),x.x===0&&x.z===0&&(r[y]=b/2/Math.PI+.5)}function m(w){return Math.atan2(w.z,-w.x)}function g(w){return Math.atan2(-w.y,Math.sqrt(w.x*w.x+w.z*w.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new rh(t.vertices,t.indices,t.radius,t.details)}}class ah extends rh{constructor(t=1,e=0){const n=(1+Math.sqrt(5))/2,i=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],o=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(i,o,t,e),this.type="IcosahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new ah(t.radius,t.detail)}}class li extends oe{constructor(t=1,e=32,n=16,i=0,o=Math.PI*2,r=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:i,phiLength:o,thetaStart:r,thetaLength:a},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));const l=Math.min(r+a,Math.PI);let h=0;const c=[],d=new C,u=new C,p=[],f=[],v=[],m=[];for(let g=0;g<=n;g++){const w=[],y=g/n;let x=0;g===0&&r===0?x=.5/e:g===n&&l===Math.PI&&(x=-.5/e);for(let b=0;b<=e;b++){const M=b/e;d.x=-t*Math.cos(i+M*o)*Math.sin(r+y*a),d.y=t*Math.cos(r+y*a),d.z=t*Math.sin(i+M*o)*Math.sin(r+y*a),f.push(d.x,d.y,d.z),u.copy(d).normalize(),v.push(u.x,u.y,u.z),m.push(M+x,1-y),w.push(h++)}c.push(w)}for(let g=0;g<n;g++)for(let w=0;w<e;w++){const y=c[g][w+1],x=c[g][w],b=c[g+1][w],M=c[g+1][w+1];(g!==0||r>0)&&p.push(y,x,M),(g!==n-1||l<Math.PI)&&p.push(x,b,M)}this.setIndex(p),this.setAttribute("position",new Mt(f,3)),this.setAttribute("normal",new Mt(v,3)),this.setAttribute("uv",new Mt(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new li(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}class yr extends oe{constructor(t=1,e=.4,n=12,i=48,o=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:i,arc:o},n=Math.floor(n),i=Math.floor(i);const r=[],a=[],l=[],h=[],c=new C,d=new C,u=new C;for(let p=0;p<=n;p++)for(let f=0;f<=i;f++){const v=f/i*o,m=p/n*Math.PI*2;d.x=(t+e*Math.cos(m))*Math.cos(v),d.y=(t+e*Math.cos(m))*Math.sin(v),d.z=e*Math.sin(m),a.push(d.x,d.y,d.z),c.x=t*Math.cos(v),c.y=t*Math.sin(v),u.subVectors(d,c).normalize(),l.push(u.x,u.y,u.z),h.push(f/i),h.push(p/n)}for(let p=1;p<=n;p++)for(let f=1;f<=i;f++){const v=(i+1)*p+f-1,m=(i+1)*(p-1)+f-1,g=(i+1)*(p-1)+f,w=(i+1)*p+f;r.push(v,m,w),r.push(m,g,w)}this.setIndex(r),this.setAttribute("position",new Mt(a,3)),this.setAttribute("normal",new Mt(l,3)),this.setAttribute("uv",new Mt(h,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new yr(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}}class lh extends oe{constructor(t=new gd(new C(-1,-1,0),new C(-1,1,0),new C(1,1,0)),e=64,n=1,i=8,o=!1){super(),this.type="TubeGeometry",this.parameters={path:t,tubularSegments:e,radius:n,radialSegments:i,closed:o};const r=t.computeFrenetFrames(e,o);this.tangents=r.tangents,this.normals=r.normals,this.binormals=r.binormals;const a=new C,l=new C,h=new Rt;let c=new C;const d=[],u=[],p=[],f=[];v(),this.setIndex(f),this.setAttribute("position",new Mt(d,3)),this.setAttribute("normal",new Mt(u,3)),this.setAttribute("uv",new Mt(p,2));function v(){for(let y=0;y<e;y++)m(y);m(o===!1?e:0),w(),g()}function m(y){c=t.getPointAt(y/e,c);const x=r.normals[y],b=r.binormals[y];for(let M=0;M<=i;M++){const S=M/i*Math.PI*2,T=Math.sin(S),_=-Math.cos(S);l.x=_*x.x+T*b.x,l.y=_*x.y+T*b.y,l.z=_*x.z+T*b.z,l.normalize(),u.push(l.x,l.y,l.z),a.x=c.x+n*l.x,a.y=c.y+n*l.y,a.z=c.z+n*l.z,d.push(a.x,a.y,a.z)}}function g(){for(let y=1;y<=e;y++)for(let x=1;x<=i;x++){const b=(i+1)*(y-1)+(x-1),M=(i+1)*y+(x-1),S=(i+1)*y+x,T=(i+1)*(y-1)+x;f.push(b,M,T),f.push(M,S,T)}}function w(){for(let y=0;y<=e;y++)for(let x=0;x<=i;x++)h.x=y/e,h.y=x/i,p.push(h.x,h.y)}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){const t=super.toJSON();return t.path=this.parameters.path.toJSON(),t}static fromJSON(t){return new lh(new Bc[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}}class ce extends zo{static get type(){return"MeshStandardMaterial"}constructor(t){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.color=new Vt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Vt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=qu,this.normalScale=new Rt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new He,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class Ko extends ce{static get type(){return"MeshPhysicalMaterial"}constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new Rt(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Je(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Vt(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Vt(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Vt(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){this._dispersion>0!=t>0&&this.version++,this._dispersion=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}}class Dx extends wn{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Vt(t),this.intensity=e}dispose(){}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(e.object.target=this.target.uuid),e}}const Rl=new jt,F0=new C,k0=new C;class Ix{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Rt(512,512),this.map=null,this.mapPass=null,this.matrix=new jt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Us,this._frameExtents=new Rt(1,1),this._viewportCount=1,this._viewports=[new ze(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,n=this.matrix;F0.setFromMatrixPosition(t.matrixWorld),e.position.copy(F0),k0.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(k0),e.updateMatrixWorld(),Rl.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Rl),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Rl)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}class zx extends Ix{constructor(){super(new No(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Nx extends Dx{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(wn.DEFAULT_UP),this.updateMatrix(),this.target=new wn,this.shadow=new zx}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Yc}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Yc);const Pl=new jt;class Ha{constructor(t){t=t||{},this.zNear=t.webGL===!0?-1:0,this.vertices={near:[new C,new C,new C,new C],far:[new C,new C,new C,new C]},t.projectionMatrix!==void 0&&this.setFromProjectionMatrix(t.projectionMatrix,t.maxFar||1e4)}setFromProjectionMatrix(t,e){const n=this.zNear,i=t.elements[2*4+3]===0;return Pl.copy(t).invert(),this.vertices.near[0].set(1,1,n),this.vertices.near[1].set(1,-1,n),this.vertices.near[2].set(-1,-1,n),this.vertices.near[3].set(-1,1,n),this.vertices.near.forEach(function(o){o.applyMatrix4(Pl)}),this.vertices.far[0].set(1,1,1),this.vertices.far[1].set(1,-1,1),this.vertices.far[2].set(-1,-1,1),this.vertices.far[3].set(-1,1,1),this.vertices.far.forEach(function(o){o.applyMatrix4(Pl);const r=Math.abs(o.z);i?o.z*=Math.min(e/r,1):o.multiplyScalar(Math.min(e/r,1))}),this.vertices}split(t,e){for(;t.length>e.length;)e.push(new Ha);e.length=t.length;for(let n=0;n<t.length;n++){const i=e[n];if(n===0)for(let o=0;o<4;o++)i.vertices.near[o].copy(this.vertices.near[o]);else for(let o=0;o<4;o++)i.vertices.near[o].lerpVectors(this.vertices.near[o],this.vertices.far[o],t[n-1]);if(n===t.length-1)for(let o=0;o<4;o++)i.vertices.far[o].copy(this.vertices.far[o]);else for(let o=0;o<4;o++)i.vertices.far[o].lerpVectors(this.vertices.near[o],this.vertices.far[o],t[n])}}toSpace(t,e){for(let n=0;n<4;n++)e.vertices.near[n].copy(this.vertices.near[n]).applyMatrix4(t),e.vertices.far[n].copy(this.vertices.far[n]).applyMatrix4(t)}}const O0={lights_fragment_begin:`
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
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		// Iridescence F0 approximation
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

		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
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

  		// spot lights are ordered [shadows with maps, shadows without maps, maps without shadows, none]
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

#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct ) && defined( USE_CSM ) && defined( CSM_CASCADES )

	DirectionalLight directionalLight;
	float linearDepth = (vViewPosition.z) / (shadowFar - cameraNear);
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif

	#if defined( USE_SHADOWMAP ) && defined( CSM_FADE )
		vec2 cascade;
		float cascadeCenter;
		float closestEdge;
		float margin;
		float csmx;
		float csmy;

		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {

			directionalLight = directionalLights[ i ];
			getDirectionalLightInfo( directionalLight, directLight );

			#if ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
				// NOTE: Depth gets larger away from the camera.
				// cascade.x is closer, cascade.y is further
				cascade = CSM_cascades[ i ];
				cascadeCenter = ( cascade.x + cascade.y ) / 2.0;
				closestEdge = linearDepth < cascadeCenter ? cascade.x : cascade.y;
				margin = 0.25 * pow( closestEdge, 2.0 );
				csmx = cascade.x - margin / 2.0;
				csmy = cascade.y + margin / 2.0;
				if( linearDepth >= csmx && ( linearDepth < csmy || UNROLLED_LOOP_INDEX == CSM_CASCADES - 1 ) ) {

					float dist = min( linearDepth - csmx, csmy - linearDepth );
					float ratio = clamp( dist / margin, 0.0, 1.0 );

					vec3 prevColor = directLight.color;
					directionalLightShadow = directionalLightShadows[ i ];
					directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;

					bool shouldFadeLastCascade = UNROLLED_LOOP_INDEX == CSM_CASCADES - 1 && linearDepth > cascadeCenter;
					directLight.color = mix( prevColor, directLight.color, shouldFadeLastCascade ? ratio : 1.0 );

					ReflectedLight prevLight = reflectedLight;
					RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );

					bool shouldBlend = UNROLLED_LOOP_INDEX != CSM_CASCADES - 1 || UNROLLED_LOOP_INDEX == CSM_CASCADES - 1 && linearDepth < cascadeCenter;
					float blendRatio = shouldBlend ? ratio : 1.0;

					reflectedLight.directDiffuse = mix( prevLight.directDiffuse, reflectedLight.directDiffuse, blendRatio );
					reflectedLight.directSpecular = mix( prevLight.directSpecular, reflectedLight.directSpecular, blendRatio );
					reflectedLight.indirectDiffuse = mix( prevLight.indirectDiffuse, reflectedLight.indirectDiffuse, blendRatio );
					reflectedLight.indirectSpecular = mix( prevLight.indirectSpecular, reflectedLight.indirectSpecular, blendRatio );

				}
			#endif

		}
		#pragma unroll_loop_end
	#elif defined (USE_SHADOWMAP)

		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {

			directionalLight = directionalLights[ i ];
			getDirectionalLightInfo( directionalLight, directLight );

			#if ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )

				directionalLightShadow = directionalLightShadows[ i ];
				if(linearDepth >= CSM_cascades[UNROLLED_LOOP_INDEX].x && linearDepth < CSM_cascades[UNROLLED_LOOP_INDEX].y) directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;

				if(linearDepth >= CSM_cascades[UNROLLED_LOOP_INDEX].x && (linearDepth < CSM_cascades[UNROLLED_LOOP_INDEX].y || UNROLLED_LOOP_INDEX == CSM_CASCADES - 1)) RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );

			#endif

		}
		#pragma unroll_loop_end

	#elif ( NUM_DIR_LIGHT_SHADOWS > 0 )
		// note: no loop here - all CSM lights are in fact one light only
		getDirectionalLightInfo( directionalLights[0], directLight );
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );

	#endif

	#if ( NUM_DIR_LIGHTS > NUM_DIR_LIGHT_SHADOWS)
		// compute the lights not casting shadows (if any)

		#pragma unroll_loop_start
		for ( int i = NUM_DIR_LIGHT_SHADOWS; i < NUM_DIR_LIGHTS; i ++ ) {

			directionalLight = directionalLights[ i ];

			getDirectionalLightInfo( directionalLight, directLight );

			RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );

		}
		#pragma unroll_loop_end

	#endif

#endif


#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct ) && !defined( USE_CSM ) && !defined( CSM_CASCADES )

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

#endif

#if defined( RE_IndirectSpecular )

	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );

#endif
`,lights_pars_begin:`
#if defined( USE_CSM ) && defined( CSM_CASCADES )
uniform vec2 CSM_cascades[CSM_CASCADES];
uniform float cameraNear;
uniform float shadowFar;
#endif
	`+ae.lights_pars_begin},B0=new jt,Ll=new Ha({webGL:!0}),Ii=new C,Jo=new Be,Dl=[],Il=[],zl=new jt,H0=new jt,Ux=new C(0,1,0);class Fx{constructor(t){this.camera=t.camera,this.parent=t.parent,this.cascades=t.cascades||3,this.maxFar=t.maxFar||1e5,this.mode=t.mode||"practical",this.shadowMapSize=t.shadowMapSize||2048,this.shadowBias=t.shadowBias||1e-6,this.lightDirection=t.lightDirection||new C(1,-1,1).normalize(),this.lightIntensity=t.lightIntensity||3,this.lightNear=t.lightNear||1,this.lightFar=t.lightFar||2e3,this.lightMargin=t.lightMargin||200,this.customSplitsCallback=t.customSplitsCallback,this.fade=!1,this.mainFrustum=new Ha({webGL:!0}),this.frustums=[],this.breaks=[],this.lights=[],this.shaders=new Map,this.createLights(),this.updateFrustums(),this.injectInclude()}createLights(){for(let t=0;t<this.cascades;t++){const e=new Nx(16777215,this.lightIntensity);e.castShadow=!0,e.shadow.mapSize.width=this.shadowMapSize,e.shadow.mapSize.height=this.shadowMapSize,e.shadow.camera.near=this.lightNear,e.shadow.camera.far=this.lightFar,e.shadow.bias=this.shadowBias,this.parent.add(e),this.parent.add(e.target),this.lights.push(e)}}initCascades(){const t=this.camera;t.updateProjectionMatrix(),this.mainFrustum.setFromProjectionMatrix(t.projectionMatrix,this.maxFar),this.mainFrustum.split(this.breaks,this.frustums)}updateShadowBounds(){const t=this.frustums;for(let e=0;e<t.length;e++){const i=this.lights[e].shadow.camera,o=this.frustums[e],r=o.vertices.near,a=o.vertices.far,l=a[0];let h;l.distanceTo(a[2])>l.distanceTo(r[2])?h=a[2]:h=r[2];let c=l.distanceTo(h);if(this.fade){const d=this.camera,u=Math.max(d.far,this.maxFar),p=o.vertices.far[0].z/(u-d.near),f=.25*Math.pow(p,2)*(u-d.near);c+=f}i.left=-c/2,i.right=c/2,i.top=c/2,i.bottom=-c/2,i.updateProjectionMatrix()}}getBreaks(){const t=this.camera,e=Math.min(t.far,this.maxFar);switch(this.breaks.length=0,this.mode){case"uniform":n(this.cascades,t.near,e,this.breaks);break;case"logarithmic":i(this.cascades,t.near,e,this.breaks);break;case"practical":o(this.cascades,t.near,e,.5,this.breaks);break;case"custom":this.customSplitsCallback===void 0&&console.error("CSM: Custom split scheme callback not defined."),this.customSplitsCallback(this.cascades,t.near,e,this.breaks);break}function n(r,a,l,h){for(let c=1;c<r;c++)h.push((a+(l-a)*c/r)/l);h.push(1)}function i(r,a,l,h){for(let c=1;c<r;c++)h.push(a*(l/a)**(c/r)/l);h.push(1)}function o(r,a,l,h,c){Dl.length=0,Il.length=0,i(r,a,l,Il),n(r,a,l,Dl);for(let d=1;d<r;d++)c.push(mn.lerp(Dl[d-1],Il[d-1],h));c.push(1)}}update(){const t=this.camera,e=this.frustums;zl.lookAt(new C,this.lightDirection,Ux),H0.copy(zl).invert();for(let n=0;n<e.length;n++){const i=this.lights[n],o=i.shadow.camera,r=(o.right-o.left)/this.shadowMapSize,a=(o.top-o.bottom)/this.shadowMapSize;B0.multiplyMatrices(H0,t.matrixWorld),e[n].toSpace(B0,Ll);const l=Ll.vertices.near,h=Ll.vertices.far;Jo.makeEmpty();for(let c=0;c<4;c++)Jo.expandByPoint(l[c]),Jo.expandByPoint(h[c]);Jo.getCenter(Ii),Ii.z=Jo.max.z+this.lightMargin,Ii.x=Math.floor(Ii.x/r)*r,Ii.y=Math.floor(Ii.y/a)*a,Ii.applyMatrix4(zl),i.position.copy(Ii),i.target.position.copy(Ii),i.target.position.x+=this.lightDirection.x,i.target.position.y+=this.lightDirection.y,i.target.position.z+=this.lightDirection.z}}injectInclude(){ae.lights_fragment_begin=O0.lights_fragment_begin,ae.lights_pars_begin=O0.lights_pars_begin}setupMaterial(t){t.defines=t.defines||{},t.defines.USE_CSM=1,t.defines.CSM_CASCADES=this.cascades,this.fade&&(t.defines.CSM_FADE="");const e=[],n=this,i=this.shaders;t.onBeforeCompile=function(o){const r=Math.min(n.camera.far,n.maxFar);n.getExtendedBreaks(e),o.uniforms.CSM_cascades={value:e},o.uniforms.cameraNear={value:n.camera.near},o.uniforms.shadowFar={value:r},i.set(t,o)},i.set(t,null)}updateUniforms(){const t=Math.min(this.camera.far,this.maxFar);this.shaders.forEach(function(n,i){if(n!==null){const o=n.uniforms;this.getExtendedBreaks(o.CSM_cascades.value),o.cameraNear.value=this.camera.near,o.shadowFar.value=t}!this.fade&&"CSM_FADE"in i.defines?(delete i.defines.CSM_FADE,i.needsUpdate=!0):this.fade&&!("CSM_FADE"in i.defines)&&(i.defines.CSM_FADE="",i.needsUpdate=!0)},this)}getExtendedBreaks(t){for(;t.length<this.breaks.length;)t.push(new Rt);t.length=this.breaks.length;for(let e=0;e<this.cascades;e++){const n=this.breaks[e],i=this.breaks[e-1]||0;t[e].x=i,t[e].y=n}}updateFrustums(){this.getBreaks(),this.initCascades(),this.updateShadowBounds(),this.updateUniforms()}remove(){for(let t=0;t<this.lights.length;t++)this.parent.remove(this.lights[t].target),this.parent.remove(this.lights[t])}dispose(){const t=this.shaders;t.forEach(function(e,n){delete n.onBeforeCompile,delete n.defines.USE_CSM,delete n.defines.CSM_CASCADES,delete n.defines.CSM_FADE,e!==null&&(delete e.uniforms.CSM_cascades,delete e.uniforms.cameraNear,delete e.uniforms.shadowFar),n.needsUpdate=!0}),t.clear()}}const ki=new Uint8Array(512);{const s=new Uint8Array(256);for(let e=0;e<256;e++)s[e]=e;let t=625341585;for(let e=255;e>0;e--){t^=t<<13,t>>>=0,t^=t>>>17,t^=t<<5,t>>>=0;const n=t%(e+1),i=s[e];s[e]=s[n],s[n]=i}for(let e=0;e<512;e++)ki[e]=s[e&255]}const G0=[1,1,-1,1,1,-1,-1,-1,1,0,-1,0,0,1,0,-1];function V0(s){return s*s*s*(s*(s*6-15)+10)}function Gt(s,t){const e=Math.floor(s),n=Math.floor(t),i=s-e,o=t-n,r=e&255,a=n&255,l=V0(i),h=V0(o),c=(g,w,y)=>{const x=(g&7)*2;return G0[x]*w+G0[x+1]*y},d=ki[ki[r]+a],u=ki[ki[r]+a+1],p=ki[ki[r+1]+a],f=ki[ki[r+1]+a+1],v=c(d,i,o)+l*(c(p,i-1,o)-c(d,i,o)),m=c(u,i,o-1)+l*(c(f,i-1,o-1)-c(u,i,o-1));return(v+h*(m-v))*1.41}function De(s,t,e=5,n=2,i=.5){let o=.5,r=1,a=0,l=0;for(let h=0;h<e;h++)a+=o*Gt(s*r+h*17.13,t*r-h*9.71),l+=o,o*=i,r*=n;return a/l}function Qo(s,t,e=4){let n=.5,i=1,o=0;for(let r=0;r<e;r++){const a=1-Math.abs(Gt(s*i+r*3.3,t*i+r*7.7));o+=a*a*n,n*=.5,i*=2.1}return o}function St(s,t,e){const n=Math.min(1,Math.max(0,(e-s)/(t-s)));return n*n*(3-2*n)}function Qt(s,t,e){return s<t?t:s>e?e:s}function se(s,t,e){return s+(t-s)*e}function pi(s,t,e){const n=Qt(.5+.5*(t-s)/e,0,1);return se(t,s,n)-e*n*(1-n)}const kx=6,Ox=1,Bx=new Vt(.26,.24,.2),ns=[{el:-18,sun:[.5,.6,.85],sunI:.12,zen:[.006,.01,.024],hor:[.018,.024,.042],haze:[.014,.018,.03],sunHaze:[.02,.022,.03],amb:.15},{el:-8,sun:[.5,.6,.85],sunI:.12,zen:[.006,.011,.028],hor:[.035,.035,.065],haze:[.024,.026,.045],sunHaze:[.06,.03,.03],amb:.16},{el:-2,sun:[.9,.35,.15],sunI:.06,zen:[.015,.035,.1],hor:[.42,.22,.2],haze:[.22,.16,.2],sunHaze:[.9,.35,.18],amb:.4},{el:4,sun:[1,.5,.22],sunI:.3,zen:[.035,.1,.3],hor:[.82,.48,.34],haze:[.5,.4,.4],sunHaze:[1,.55,.3],amb:.85},{el:14,sun:[1,.74,.46],sunI:.62,zen:[.03,.11,.34],hor:[.66,.58,.54],haze:[.54,.52,.54],sunHaze:[1,.75,.5],amb:1},{el:30,sun:[1,.94,.84],sunI:.938,zen:[.022,.12,.32],hor:[.17,.29,.4],haze:[.48,.54,.64],sunHaze:[1,.92,.8],amb:1},{el:90,sun:[1,.97,.93],sunI:1,zen:[.02,.12,.32],hor:[.16,.29,.4],haze:[.47,.54,.65],sunHaze:[.98,.93,.84],amb:1}];function Hx(s){let t=ns[0],e=ns[ns.length-1];for(let o=0;o<ns.length-1;o++)if(s>=ns[o].el&&s<=ns[o+1].el){t=ns[o],e=ns[o+1];break}const n=St(t.el,e.el,Qt(s,t.el,e.el)),i=(o,r)=>[se(o[0],r[0],n),se(o[1],r[1],n),se(o[2],r[2],n)];return{el:s,sun:i(t.sun,e.sun),sunI:se(t.sunI,e.sunI,n),zen:i(t.zen,e.zen),hor:i(t.hor,e.hor),haze:i(t.haze,e.haze),sunHaze:i(t.sunHaze,e.sunHaze),amb:se(t.amb,e.amb,n)}}const W0={clear:{coverage:.27,hazeDensity:15e-6,hazeHeight:1400,windSpeed:3.5,turbulence:.2,cloudBase:1500,cloudTop:3500,rain:0,sunDim:1},scattered:{coverage:.37,hazeDensity:19e-6,hazeHeight:1300,windSpeed:7,turbulence:.4,cloudBase:1300,cloudTop:3500,rain:0,sunDim:.97},cloudy:{coverage:.7,hazeDensity:32e-6,hazeHeight:1100,windSpeed:10,turbulence:.7,cloudBase:900,cloudTop:2e3,rain:0,sunDim:.72},storm:{coverage:.92,hazeDensity:55e-6,hazeHeight:900,windSpeed:15,turbulence:1,cloudBase:700,cloudTop:3200,rain:1,sunDim:.4}};function Gx(s){const t=25.8*Math.PI/180,e=10*Math.PI/180,n=(s-12)*15*Math.PI/180,i=Math.sin(t)*Math.sin(e)+Math.cos(t)*Math.cos(e)*Math.cos(n),o=Math.asin(Qt(i,-1,1)),r=(Math.sin(e)-Math.sin(o)*Math.sin(t))/(Math.cos(o)*Math.cos(t)||1e-6);let a=Math.acos(Qt(r,-1,1));return n>0&&(a=2*Math.PI-a),{dir:new C(Math.cos(o)*Math.sin(a),Math.sin(o),-Math.cos(o)*Math.cos(a)).normalize(),elevation:o*180/Math.PI,azimuth:a*180/Math.PI}}class Vx{hour=14.5;weather="clear";preset=W0.clear;state={sunDir:new C(0,1,0),sunElevation:60,sunColor:new Vt,sunIntensity:3,zenith:new Vt,horizon:new Vt,haze:new Vt,sunHaze:new Vt,ground:new Vt,ambientIntensity:1,night:0};uniforms={uSunDir:{value:new C(0,1,0)},uSunColor:{value:new Vt(1,1,1)},uZenithColor:{value:new Vt},uHorizonColor:{value:new Vt},uHazeColor:{value:new Vt},uSunHazeColor:{value:new Vt},uGroundColor:{value:new Vt},uHazeDensity:{value:3e-5},uHazeHeight:{value:1300},uCloudCoverage:{value:.3},uCloudBase:{value:1500},uCloudTop:{value:2600},uCloudWind:{value:new Rt(0,0)},uCloudSeed:{value:0},uNight:{value:0},uTime:{value:0}};cloudOffset=new Rt;windDir=new Rt(1,.35).normalize();time=0;constructor(t){this.uniforms.uCloudSeed.value=t%1e3/1e3*37.7}setWeather(t){this.weather=t,this.preset=W0[t]}update(t){this.time+=t;const e=this.preset;this.cloudOffset.addScaledVector(this.windDir,e.windSpeed*2.2*t);const{dir:n,elevation:i}=Gx(this.hour),o=Hx(i),r=this.state,a=new C(-n.x,Math.max(.25,-n.y*.8+.3),-n.z).normalize(),l=St(0,-4,i);r.sunDir.copy(n).lerp(a,l).normalize(),r.sunElevation=i,r.sunColor.setRGB(o.sun[0],o.sun[1],o.sun[2]);const h=o.sunI*e.sunDim;r.sunIntensity=h*se(kx,Ox,l),r.zenith.setRGB(o.zen[0],o.zen[1],o.zen[2]),r.horizon.setRGB(o.hor[0],o.hor[1],o.hor[2]),r.haze.setRGB(o.haze[0],o.haze[1],o.haze[2]),r.sunHaze.setRGB(o.sunHaze[0],o.sunHaze[1],o.sunHaze[2]),r.ambientIntensity=o.amb,r.night=1-St(-12,-1,i);const c=St(.45,.95,e.coverage),d=r.horizon.r*.2126+r.horizon.g*.7152+r.horizon.b*.0722,u=new Vt(d,d,d).lerp(r.horizon,.3),p=r.zenith.clone().lerp(u,c*.8),f=r.horizon.clone().lerp(u,c*.7).multiplyScalar(se(1,.9,c)),v=r.haze.clone().lerp(new Vt(d,d,d),c*.6).multiplyScalar(se(1,.9,c)),m=r.zenith.clone().lerp(r.horizon,.3);r.ground.copy(r.sunColor).multiplyScalar(r.sunIntensity*Math.max(r.sunDir.y,0)/Math.PI).add(m).multiply(Bx);const g=this.uniforms;g.uSunDir.value.copy(n),g.uSunColor.value.copy(r.sunColor).multiplyScalar(h),g.uZenithColor.value.copy(p),g.uHorizonColor.value.copy(f),g.uHazeColor.value.copy(v),g.uSunHazeColor.value.copy(r.sunHaze).multiplyScalar(se(1,.6,c)),g.uGroundColor.value.copy(r.ground),g.uHazeDensity.value=e.hazeDensity,g.uHazeHeight.value=e.hazeHeight,g.uCloudCoverage.value=e.coverage,g.uCloudBase.value=e.cloudBase,g.uCloudTop.value=e.cloudTop,g.uCloudWind.value.copy(this.cloudOffset),g.uNight.value=r.night,g.uTime.value=this.time}}function X0(s){let t=2166136261;for(let e=0;e<s.length;e++)t^=s.charCodeAt(e),t=Math.imul(t,16777619)>>>0;return t>>>0}function Nl(s,t,e=0){let n=(s|0)*374761393+(t|0)*668265263+(e|0)*2147483647;return n=(n^n>>>13)*1274126177,n=n^n>>>16,(n>>>0)/4294967296}class $e{a;b;c;d;constructor(t){const e=typeof t=="string"?X0(t):t>>>0;this.a=e^2654435769,this.b=e*2246822507>>>0,this.c=e*3266489909>>>0,this.d=1;for(let n=0;n<12;n++)this.next()}next(){this.a>>>=0,this.b>>>=0,this.c>>>=0,this.d>>>=0;let t=this.a+this.b|0;return this.a=this.b^this.b>>>9,this.b=this.c+(this.c<<3)|0,this.c=this.c<<21|this.c>>>11,this.d=this.d+1|0,t=t+this.d|0,this.c=this.c+t|0,(t>>>0)/4294967296}range(t,e){return t+(e-t)*this.next()}int(t,e){return t+Math.floor(this.next()*(e-t+1))}pick(t){return t[Math.floor(this.next()*t.length)]}chance(t){return this.next()<t}gauss(){return(this.next()+this.next()+this.next()+this.next()-2)*1.7320508}fork(t){return new $e(X0(t)^Math.floor(this.next()*4294967295))}}const Ro=2e4,he=2048,Is=Ro/he,pn=Ro/2;var ne=(s=>(s[s.OCEAN=0]="OCEAN",s[s.BAY=1]="BAY",s[s.BEACH=2]="BEACH",s[s.MANGROVE=3]="MANGROVE",s[s.PARK=4]="PARK",s[s.RES_LOW=5]="RES_LOW",s[s.RES_MID=6]="RES_MID",s[s.DOWNTOWN=7]="DOWNTOWN",s[s.HOTEL=8]="HOTEL",s[s.INDUSTRIAL=9]="INDUSTRIAL",s[s.AIRPORT=10]="AIRPORT",s[s.GOLF=11]="GOLF",s[s.ROCK=12]="ROCK",s[s.LOT=13]="LOT",s[s.CONSTRUCTION=14]="CONSTRUCTION",s[s.STADIUM=15]="STADIUM",s[s.MARINA=16]="MARINA",s[s.SANDBAR=17]="SANDBAR",s[s.ROAD=18]="ROAD",s[s.WETLAND_FLAT=19]="WETLAND_FLAT",s))(ne||{});const xd={cx:-1150,cz:-3050,hw:950,hh:300,rot:.04};function Wx(s){let t=1/0,e=-1/0,n=1/0,i=-1/0;for(const[a,l]of s.pts)t=Math.min(t,a),e=Math.max(e,a),n=Math.min(n,l),i=Math.max(i,l);const o=(t+e)/2,r=(n+i)/2;return{...s,bx:o,bz:r,br:Math.max(e-t,i-n)/2+s.width+80}}function mo(s,t,e,n,i,o,r,a=0){const l=Math.cos(-r),h=Math.sin(-r),c=s-e,d=t-n,u=c*l-d*h,p=c*h+d*l,f=Math.abs(u)-i+a,v=Math.abs(p)-o+a,m=Math.max(f,0),g=Math.max(v,0);return Math.hypot(m,g)+Math.min(Math.max(f,v),0)-a}function hn(s,t,e,n,i,o,r,a,l=.18){const h=Math.cos(-r),c=Math.sin(-r),d=s-e,u=t-n,p=d*h-u*c,f=d*c+u*h,v=Math.atan2(f/o,p/i),m=De(Math.cos(v)*1.7+a*13.1,Math.sin(v)*1.7+a*7.3,4),g=Gt(Math.cos(v)*4.1+a,Math.sin(v)*4.1-a),w=1+l*m+l*.35*g;return(Math.hypot(p/(i*w),f/(o*w))-1)*Math.min(i,o)*w}function zs(s,t,e,n,i,o){const r=i-e,a=o-n,l=s-e,h=t-n,c=Qt((l*r+h*a)/(r*r+a*a||1),0,1);return Math.hypot(l-r*c,h-a*c)}function q0(s,t,e){let n=1/0;for(let i=0;i<e.length-1;i++)n=Math.min(n,zs(s,t,e[i][0],e[i][1],e[i+1][0],e[i+1][1]));return n}function Y0(s,t,e,n){let i=1/0;for(let o=0;o<e.length-1;o++){const[r,a]=e[o],[l,h]=e[o+1],c=l-r,d=h-a,u=s-r,p=t-a,f=Qt((u*c+p*d)/(c*c+d*d||1),0,1),v=Math.hypot(u-c*f,p-d*f)-se(n[o],n[o+1],f);i=Math.min(i,v)}return i}const tr={cx:195,cz:2520,rx:262,rz:380,rot:.05},gn=[[55,2190],[-5,1790]],wd=42;function yd(s,t){return hn(s,t,200,2380,100,62,.5,15,.25)}function Xx(s){let t=-2500+320*De(s/3400+3.1,.37,3)+110*De(s/800+9.2,1.1,3);return t+=520*Math.exp(-(((s+3800)/900)**2)),t+=220*Math.exp(-(((s+2500)/500)**2)),t-=250*St(1200,2400,s)*(1-St(3200,4200,s)),t}const as=[[-2100,-3050],[-2900,-2900],[-3700,-2650],[-4600,-2150],[-5500,-1500],[-6500,-700]],qx=[95,80,62,50,40,32];function Yx(s){for(let t=0;t<as.length-1;t++){const[e,n]=as[t],[i,o]=as[t+1];if(s>=n&&s<=o)return se(e,i,(s-n)/(o-n))}return s<as[0][1]?as[0][0]:as[as.length-1][0]}function $x(s){return-9e3+320*De(s/2600+1.3,.8,3)}function _d(){return[{id:"lake-north",cx:-5900,cz:-6600,rx:480,rz:330,rot:.3,seed:61},{id:"lake-west",cx:-7550,cz:550,rx:520,rz:300,rot:-.2,seed:62},{id:"lake-south",cx:-4300,cz:4300,rx:380,rz:260,rot:.5,seed:63}]}function jx(){const s=[],t=_d();s.push({id:"mainland",bx:-6e3,bz:0,br:2e4,sd:(a,l)=>{let h=a-Xx(l);const c=Y0(a,l,as,qx);h=Math.max(h,-c);for(const d of t)Math.abs(a-d.cx)>d.rx*1.6||Math.abs(l-d.cz)>d.rz*1.8||(h=Math.max(h,-hn(a,l,d.cx,d.cz,d.rx,d.rz,d.rot,d.seed,.22)));return h},beach:40,height:3.2,seabed:.02,shelf:3.2});const e=[[2750,-8200],[2700,-6800],[2640,-5400],[2600,-4e3],[2520,-2600],[2400,-1500],[2250,-900],[2050,-500]],n=[280,420,460,430,380,330,240,90];s.push({id:"barrier",bx:2500,bz:-4200,br:5200,sd:(a,l)=>{const h=Y0(a,l,e,n),c=60*De(a/700+1.2,l/700+4.4,3);return h+c},beach:62,height:2.6,seabed:.012,shelf:6}),s.push({id:"garza",bx:190,bz:2450,br:1e3,sd:(a,l)=>{let h=hn(a,l,tr.cx,tr.cz,tr.rx,tr.rz,tr.rot,11,.14);return h=pi(h,hn(a,l,260,2900,160,150,.1,12,.2),110),h=pi(h,hn(a,l,-10,2740,115,120,.3,13,.25),100),h=pi(h,hn(a,l,390,2500,100,150,0,17,.2),110),h=pi(h,hn(a,l,375,2160,85,115,.2,14,.2),110),h=pi(h,hn(a,l,130,2240,110,85,-.1,16,.2),100),h=pi(h,zs(a,l,gn[0][0],gn[0][1],gn[1][0],gn[1][1])-wd,60),h=Math.max(h,-yd(a,l)*2.5+12),h},beach:70,height:2.4,seabed:.01,shelf:3.5,isle:!0}),s.push({id:"isla-b",bx:-1350,bz:2560,br:800,sd:(a,l)=>hn(a,l,-1350,2560,420,260,.05,21,.2),beach:50,height:2.3,seabed:.012,shelf:3.5,isle:!0}),s.push({id:"southkey",bx:1900,bz:5700,br:3200,sd:(a,l)=>{let h=hn(a,l,1900,5700,1500,1050,.25,31,.14);return h=pi(h,hn(a,l,1e3,6400,700,500,-.3,32,.24),300),h=pi(h,hn(a,l,2900,4900,500,700,.5,33,.18),260),h},beach:80,height:2.8,seabed:.014,shelf:6,rocky:!0,isle:!0}),s.push({id:"tortuga",bx:1180,bz:-830,br:900,sd:(a,l)=>pi(hn(a,l,1180,-830,520,300,.35,51,.2),zs(a,l,985,-410,1150,-650)-56,60),beach:55,height:2.3,seabed:.012,shelf:3.5,isle:!0});const i=xd;s.push({id:"port",bx:i.cx,bz:i.cz,br:1300,sd:(a,l)=>mo(a,l,i.cx,i.cz,i.hw,i.hh,i.rot,30),beach:0,height:3,seabed:.06,shelf:6}),s.push({id:"isla-n1",bx:-450,bz:-3900,br:750,sd:(a,l)=>hn(a,l,-450,-3900,375,200,.1,41,.2),beach:45,height:2.3,seabed:.012,shelf:3.5,isle:!0}),s.push({id:"isla-n2",bx:700,bz:-4e3,br:800,sd:(a,l)=>hn(a,l,700,-4e3,400,210,-.15,42,.2),beach:45,height:2.3,seabed:.012,shelf:3.5,isle:!0}),s.push({id:"isla-n3",bx:1550,bz:-4100,br:650,sd:(a,l)=>hn(a,l,1550,-4100,315,170,.2,43,.22),beach:45,height:2.3,seabed:.012,shelf:3.5,isle:!0});for(let a=0;a<5;a++){const l=-3e3+a*330;s.push({id:`finger-${a}`,bx:1870-a*25,bz:l,br:520,sd:(h,c)=>mo(h,c,1870-a*25,l,300,95,.02,40),beach:25,height:2.4,seabed:.05,shelf:3.5})}const o=new $e("mangrove-islets"),r=[[-1700,-1800,900,600,9],[-1500,1300,800,500,8],[-500,-6200,1800,900,12],[900,-6600,1200,700,8],[700,4300,700,450,6],[-1e3,4600,1100,600,7]];for(const[a,l,h,c,d]of r)for(let u=0;u<d;u++){const p=a+o.gauss()*h*.45,f=l+o.gauss()*c*.45,v=o.range(70,240),m=o.range(60,180),g=o.range(0,Math.PI),w=o.int(100,900);s.push({id:`mang-${a}-${u}`,bx:p,bz:f,br:Math.max(v,m)*1.6+60,sd:(y,x)=>hn(y,x,p,f,v,m,g,w,.35),beach:0,height:.55,seabed:.004,shelf:1.6,wet:!0})}return s}function Zx(){const s=[],t=e=>s.push(e);return t({id:"downtown",zone:7,cx:-2650,cz:-3900,hw:750,hh:620,rot:.02,gridX:130,gridZ:110,density:.92,hMin:40,hMax:260}),t({id:"brickell",zone:6,cx:-2900,cz:-2350,hw:550,hh:420,rot:.02,gridX:120,gridZ:120,density:.85,hMin:25,hMax:120}),t({id:"midtown",zone:6,cx:-3500,cz:-5300,hw:900,hh:700,rot:0,gridX:120,gridZ:140,density:.8,hMin:12,hMax:60}),t({id:"construction-dt",zone:14,cx:-2250,cz:-4250,hw:70,hh:60,rot:.02,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"construction-dt2",zone:14,cx:-3150,cz:-3550,hw:65,hh:55,rot:.02,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"construction-hotel",zone:14,cx:2480,cz:-2450,hw:60,hh:60,rot:-.1,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"stadium-lot",zone:13,cx:-2900,cz:-2e3,hw:330,hh:260,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"bayfront-park",zone:4,cx:-2050,cz:-4300,hw:170,hh:380,rot:.02,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"industrial-river",zone:9,cx:-3300,cz:-3050,hw:700,hh:380,rot:-.1,gridX:170,gridZ:160,density:.6,hMin:6,hMax:16}),t({id:"industrial-port",zone:9,cx:-1150,cz:-3050,hw:950,hh:300,rot:.04,gridX:0,gridZ:0,density:.5,hMin:6,hMax:14}),t({id:"airport",zone:10,cx:-7800,cz:-1400,hw:1100,hh:900,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"airstrip",zone:10,cx:2500,cz:5750,hw:700,hh:130,rot:.55,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"inland-golf",zone:11,cx:-5200,cz:-3950,hw:480,hh:380,rot:.1,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"west-golf",zone:11,cx:-6300,cz:3600,hw:500,hh:400,rot:-.15,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"north-park",zone:4,cx:-4350,cz:-6650,hw:380,hh:300,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"south-park",zone:4,cx:-4950,cz:2150,hw:420,hh:280,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"garza-park",zone:4,cx:365,cz:2160,hw:120,hh:105,rot:.2,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"barrier-golf",zone:11,cx:2680,cz:-5300,hw:420,hh:520,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"southkey-golf",zone:11,cx:1300,cz:6300,hw:550,hh:420,rot:-.3,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"north-res",zone:5,cx:-5600,cz:-5400,hw:2100,hh:1800,rot:0,gridX:95,gridZ:140,density:.75,hMin:4,hMax:11}),t({id:"west-res",zone:5,cx:-5300,cz:-2700,hw:1500,hh:1150,rot:0,gridX:100,gridZ:130,density:.75,hMin:4,hMax:12}),t({id:"mid-res",zone:5,cx:-4900,cz:-900,hw:1400,hh:600,rot:0,gridX:105,gridZ:140,density:.55,hMin:4,hMax:10}),t({id:"south-res",zone:5,cx:-4200,cz:1300,hw:1700,hh:1500,rot:0,gridX:105,gridZ:135,density:.7,hMin:4,hMax:10}),t({id:"far-west-res",zone:5,cx:-7950,cz:-4200,hw:650,hh:3e3,rot:0,gridX:110,gridZ:150,density:.45,hMin:4,hMax:10}),t({id:"west-res-2",zone:5,cx:-7750,cz:900,hw:850,hh:2e3,rot:0,gridX:115,gridZ:150,density:.4,hMin:4,hMax:9}),t({id:"far-south-res",zone:5,cx:-6600,cz:4300,hw:2e3,hh:1400,rot:0,gridX:105,gridZ:140,density:.55,hMin:4,hMax:10}),t({id:"south-shore-res",zone:5,cx:-3900,cz:3900,hw:1400,hh:900,rot:0,gridX:105,gridZ:135,density:.6,hMin:4,hMax:10}),t({id:"far-south-res-2",zone:5,cx:-4800,cz:6500,hw:2e3,hh:1200,rot:0,gridX:110,gridZ:140,density:.5,hMin:4,hMax:9}),t({id:"far-south-res-4",zone:5,cx:-7700,cz:6700,hw:900,hh:1e3,rot:0,gridX:120,gridZ:150,density:.38,hMin:4,hMax:9}),t({id:"south-edge-res",zone:5,cx:-5500,cz:8800,hw:3100,hh:1100,rot:0,gridX:120,gridZ:150,density:.35,hMin:4,hMax:9}),t({id:"north-res-2",zone:5,cx:-4800,cz:-8e3,hw:2400,hh:800,rot:0,gridX:100,gridZ:140,density:.55,hMin:4,hMax:10}),t({id:"far-north-res",zone:5,cx:-7950,cz:-8e3,hw:650,hh:800,rot:0,gridX:120,gridZ:150,density:.4,hMin:4,hMax:9}),t({id:"north-edge-res",zone:5,cx:-5500,cz:-9400,hw:3100,hh:600,rot:0,gridX:120,gridZ:150,density:.35,hMin:4,hMax:9}),t({id:"south-bayfront",zone:6,cx:-3e3,cz:-900,hw:480,hh:650,rot:0,gridX:120,gridZ:130,density:.6,hMin:8,hMax:35}),t({id:"hotel-south",zone:8,cx:2330,cz:-1500,hw:330,hh:1250,rot:-.12,gridX:130,gridZ:110,density:.85,hMin:20,hMax:110}),t({id:"hotel-mid",zone:8,cx:2600,cz:-3800,hw:300,hh:1300,rot:-.03,gridX:130,gridZ:105,density:.85,hMin:25,hMax:130}),t({id:"barrier-res",zone:5,cx:2650,cz:-6900,hw:350,hh:1200,rot:0,gridX:90,gridZ:110,density:.7,hMin:4,hMax:12}),t({id:"finger-res",zone:5,cx:1820,cz:-2340,hw:330,hh:760,rot:.02,gridX:0,gridZ:0,density:.7,hMin:4,hMax:9}),t({id:"garza-res",zone:5,cx:40,cz:2770,hw:200,hh:170,rot:.1,gridX:0,gridZ:0,density:.55,hMin:4,hMax:9,track:[[-10,2600],[-60,2690],[-60,2780],[20,2800],[110,2830],[200,2800]]}),t({id:"tortuga-res",zone:5,cx:1180,cz:-830,hw:420,hh:230,rot:.35,gridX:0,gridZ:0,density:.55,hMin:4,hMax:10,track:[[1156,-656],[1031,-714],[886,-842],[891,-1e3],[1062,-1033],[1225,-952],[1340,-885]]}),t({id:"isla-b-res",zone:5,cx:-1350,cz:2560,hw:330,hh:190,rot:.05,gridX:0,gridZ:0,density:.5,hMin:4,hMax:9,track:[[-1500,2577],[-1480,2680],[-1320,2720],[-1180,2660],[-1140,2547]]}),t({id:"southkey-res",zone:5,cx:2200,cz:5300,hw:700,hh:500,rot:.25,gridX:130,gridZ:150,density:.6,hMin:4,hMax:10}),t({id:"isla-n-res",zone:5,cx:700,cz:-4e3,hw:300,hh:160,rot:-.15,gridX:0,gridZ:0,density:.5,hMin:4,hMax:9,track:[[700,-3990],[640,-4075],[760,-4125],[880,-4085],[1030,-4030]]}),t({id:"isla-n1-res",zone:5,cx:-450,cz:-3900,hw:270,hh:150,rot:.1,gridX:0,gridZ:0,density:.5,hMin:4,hMax:9,track:[[-450,-3880],[-520,-3975],[-400,-4030],[-270,-3985],[-150,-3900]]}),s}function Kx(s){const t=new $e("streets"),e=new Map;for(const n of s){if(n.gridX<=0||n.gridZ<=0)continue;const i=[];for(let r=-n.hw;r<=n.hw+1;r+=n.gridX*t.range(.9,1.15))i.push(Math.min(r,n.hw));const o=[];for(let r=-n.hh;r<=n.hh+1;r+=n.gridZ*t.range(.9,1.15))o.push(Math.min(r,n.hh));e.set(n.id,{xs:i,zs:o})}return e}function Jx(s,t){const e=[],n=new $e("canals"),i=s.find(l=>l.id==="south-res"),o=i&&t.get(i.id);if(i&&o){const l=[...o.xs.map(h=>i.cx+h),-3400];for(let h=3;h<o.zs.length-3;h+=2){const c=i.cz+(o.zs[h]+o.zs[h+1])/2,d=n.range(1100,1900),u=i.cx+i.hw;e.push({id:`canal-s-${h}`,a:[u+320,c],b:[u-d,c],width:24,depth:2.6,culverts:l,culvertHalf:9.5})}}const r=s.find(l=>l.id==="west-res"),a=r&&t.get(r.id);if(r&&a){const l=a.xs.map(h=>r.cx+h);for(let h=1;h<a.zs.length-1;h++){const c=r.cz+(a.zs[h]+a.zs[h+1])/2;if(c<-2650||c>-1650||h%2===0)continue;const d=Yx(c),u=n.range(700,1200);d-u>r.cx-r.hw+120&&e.push({id:`canal-w-${h}`,a:[d+90,c],b:[d-u,c],width:20,depth:2.4,culverts:l,culvertHalf:8.5}),h%4===1&&d+500<r.cx+r.hw-150&&e.push({id:`canal-e-${h}`,a:[d-90,c],b:[Math.min(d+n.range(450,700),r.cx+r.hw-150),c],width:18,depth:2.4,culverts:l,culvertHalf:8.5})}}return e}function Qx(){const s=[];return s.push({id:"south-hwy-mainland",cls:"highway",width:22,lanes:4,traffic:14,pts:[[-6900,2650],[-6e3,2650],[-4500,2700],[-3400,2700],[-2790,2690]]}),s.push({id:"garza-hwy",cls:"highway",width:22,lanes:4,traffic:14,pts:[[-1650,2590],[-1050,2540],[-990,2537]]}),s.push({id:"garza-hwy-2",cls:"highway",width:22,lanes:4,traffic:14,pts:[[-10,2600],[10,2450],[30,2300],[gn[0][0],gn[0][1]],[gn[1][0],gn[1][1]]]}),s.push({id:"garza-east",cls:"arterial",width:14,lanes:2,traffic:5,pts:[[30,2300],[150,2265],[280,2235],[355,2185],[385,2160],[400,2195],[370,2220],[335,2205],[355,2185]]}),s.push({id:"garza-marina-rd",cls:"street",width:9,lanes:2,traffic:2,pts:[[355,2185],[395,2125],[420,2075]]}),s.push({id:"tortuga-rd",cls:"highway",width:22,lanes:4,traffic:12,pts:[[980,-400],[1200,-720],[1415,-1015]]}),s.push({id:"dt-bayshore",cls:"arterial",width:16,lanes:4,traffic:10,pts:[[-3400,-5300],[-2900,-5150],[-2560,-4950],[-2420,-4700],[-2330,-4450],[-2260,-4200],[-2200,-3900],[-2100,-3700],[-2150,-3450],[-2200,-3300],[-2380,-3110]]}),s.push({id:"dt-bayshore-s",cls:"arterial",width:16,lanes:4,traffic:10,pts:[[-2470,-2870],[-2450,-2600],[-2550,-2200],[-2680,-1800],[-2760,-1500],[-3350,-1500]]}),s.push({id:"dt-avenue",cls:"arterial",width:16,lanes:4,traffic:9,pts:[[-3400,-9900],[-3400,-7300],[-3400,-6e3],[-3400,-4600],[-3350,-3500],[-3330,-2900]]}),s.push({id:"dt-avenue-s",cls:"arterial",width:16,lanes:4,traffic:9,pts:[[-3290,-2650],[-3350,-1500],[-3400,0],[-3400,1600],[-3400,2700]]}),s.push({id:"north-cw-approach",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-3400,-6e3],[-2900,-6350],[-2545,-6626]]}),s.push({id:"west-arterial",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-6800,-9900],[-6800,-7e3],[-6800,-4e3],[-6800,-300],[-6900,1500],[-6900,2650]]}),s.push({id:"north-arterial",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-9900,-5300],[-8500,-5300],[-6800,-5300],[-4400,-5300],[-3400,-5300]]}),s.push({id:"airport-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[-6800,-2050],[-7300,-2050],[-7800,-2050]]}),s.push({id:"mid-arterial",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-9900,-300],[-8500,-300],[-6800,-300],[-5500,-300],[-4400,-320],[-3400,-300]]}),s.push({id:"south-arterial",cls:"arterial",width:15,lanes:4,traffic:6,pts:[[-9900,1200],[-8500,1200],[-6900,1200],[-5e3,1250],[-3400,1300]]}),s.push({id:"barrier-spine",cls:"arterial",width:16,lanes:4,traffic:10,pts:[[2720,-8e3],[2680,-6600],[2620,-5200],[2600,-4e3],[2520,-2600],[2400,-1500],[2260,-800],[2050,-500]]}),s.push({id:"barrier-spine-loop",cls:"street",width:10,lanes:2,traffic:2,pts:[[2720,-8e3],[2775,-8060],[2760,-8135],[2695,-8145],[2660,-8080],[2720,-8e3]]}),s.push({id:"barrier-beach-rd",cls:"street",width:10,lanes:2,traffic:4,pts:[[2680,-6600],[2900,-6400],[2880,-5200],[2850,-4e3],[2790,-2700],[2650,-1500],[2400,-1500]]}),s.push({id:"southkey-rd",cls:"arterial",width:14,lanes:2,traffic:5,pts:[[1465,4695],[1600,5e3],[1900,5400],[2300,5700],[2700,6100],[2600,6350],[2200,6450],[1700,6250],[1500,5900],[1900,5400]]}),s.push({id:"southkey-rd-2",cls:"street",width:10,lanes:2,traffic:3,pts:[[1500,5900],[1250,6200]]}),s.push({id:"southkey-marina-rd",cls:"street",width:9,lanes:2,traffic:2,pts:[[1600,5e3],[1420,4880],[1260,4780]]}),s.push({id:"isla-n-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[-760,-3880],[-450,-3880],[-150,-3900]]}),s.push({id:"isla-n2-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[380,-3980],[700,-3990],[1030,-4030]]}),s.push({id:"isla-n3-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[1335,-4082],[1550,-4100],[1780,-4120]]}),s.push({id:"port-rd",cls:"arterial",width:14,lanes:2,traffic:5,pts:[[-2050,-3050],[-1600,-3050],[-1150,-3050],[-700,-3060],[-260,-3070]]}),s}function t2(){const s=[];return s.push({id:"garza-bridge",pts:[[gn[1][0],gn[1][1]],[330,1250],[700,300],[980,-400]],width:30,deck:8,archHeight:26,archT:.51,archLength:560,lanes:6,traffic:16}),s.push({id:"tortuga-bridge",pts:[[1415,-1015],[1800,-600],[2050,-500]],width:22,deck:7,archHeight:18,archT:.45,archLength:380,lanes:4,traffic:12}),s.push({id:"garza-west",pts:[[-990,2537],[-10,2600]],width:22,deck:6,archHeight:0,archT:.5,archLength:0,lanes:4,traffic:14}),s.push({id:"islab-west",pts:[[-2790,2690],[-2100,2650],[-1650,2590]],width:22,deck:7,archHeight:18,archT:.45,archLength:360,lanes:4,traffic:14}),s.push({id:"north-cw-1",pts:[[-2100,-3700],[-1500,-3780],[-760,-3880]],width:24,deck:8,archHeight:26,archT:.4,archLength:480,lanes:6,traffic:14}),s.push({id:"north-cw-2",pts:[[-150,-3900],[380,-3980]],width:24,deck:8,archHeight:0,archT:.5,archLength:0,lanes:6,traffic:14}),s.push({id:"north-cw-3",pts:[[1030,-4030],[1335,-4082]],width:24,deck:8,archHeight:0,archT:.5,archLength:0,lanes:6,traffic:14}),s.push({id:"north-cw-4",pts:[[1780,-4120],[2200,-4080],[2600,-4e3]],width:24,deck:8,archHeight:20,archT:.5,archLength:380,lanes:6,traffic:14}),s.push({id:"far-north-cw",pts:[[-2545,-6626],[-1e3,-6750],[500,-6800],[1800,-6850],[2650,-6900]],width:18,deck:7,archHeight:16,archT:.55,archLength:360,lanes:4,traffic:7}),s.push({id:"port-bridge",pts:[[-2200,-3300],[-2050,-3050]],width:14,deck:6,archHeight:0,archT:.5,archLength:0,lanes:2,traffic:5}),s.push({id:"bayshore-river",pts:[[-2380,-3110],[-2470,-2870]],width:16,deck:6,archHeight:0,archT:.5,archLength:0,lanes:4,traffic:10}),s.push({id:"avenue-river",pts:[[-3330,-2900],[-3290,-2650]],width:16,deck:6,archHeight:0,archT:.5,archLength:0,lanes:4,traffic:9}),s}function e2(){return[{id:"dt-marina",x:-2150,z:-4150,rot:Math.PI*.5,piers:7,pierLen:110},{id:"garza-marina",x:420,z:2035,rot:0,piers:5,pierLen:90},{id:"barrier-marina",x:2075,z:-1400,rot:-Math.PI*.5,piers:6,pierLen:100},{id:"south-marina",x:-2760,z:2950,rot:Math.PI*.5,piers:4,pierLen:80},{id:"southkey-marina",x:1238,z:4730,rot:.09,piers:4,pierLen:80},{id:"north-marina",x:-2535,z:-5600,rot:Math.PI*.5,piers:5,pierLen:90}]}function n2(){return[{id:"rwy-09",a:[-8800,-1350],b:[-6950,-1350],width:50},{id:"rwy-13",a:[-8500,-2150],b:[-7073,-896],width:42},{id:"strip-southkey",a:[1950,5450],b:[3100,6100],width:24}]}function i2(){return[{id:"ship-channel",pts:[[4200,2200],[3e3,1600],[2e3,600],[1e3,-1200],[200,-2600],[-450,-3350]],width:180,depth:14,boats:3,speed:5},{id:"intracoastal",pts:[[1800,-7600],[1900,-6200],[1950,-4500],[2e3,-3200],[1950,-1800],[1850,-800],[1700,200]],width:110,depth:6,boats:8,speed:9},{id:"garza-channel",pts:[[-1e3,3300],[200,3250],[1e3,3100],[1900,2400],[2600,1400],[3400,400]],width:90,depth:7,boats:9,speed:12},{id:"arch-channel",pts:[[-1200,1200],[-300,1e3],[500,750],[1400,300],[2400,-100]],width:100,depth:8,boats:6,speed:11},{id:"ref-boats",pts:[[-200,3550],[300,3250],[520,2950],[800,2600],[1200,2250]],width:40,depth:4,boats:3,speed:18},{id:"flats-route",pts:[[-2100,3400],[-1200,3500],[-300,3600],[700,3700],[1500,4100]],width:40,depth:3,boats:5,speed:10},{id:"bay-route",pts:[[-1900,-4300],[-1200,-2500],[-600,-600],[0,1200],[500,1900]],width:60,depth:4,boats:7,speed:9},{id:"north-route",pts:[[-1800,-5900],[-800,-5200],[200,-4600],[1200,-4600],[1900,-5200]],width:60,depth:4,boats:5,speed:8},{id:"ocean-route",pts:[[3800,-8e3],[3700,-5e3],[3600,-2e3],[3700,1e3],[3900,4e3],[4100,7e3]],width:300,depth:25,boats:4,speed:6}].map(Wx)}function s2(){return[{id:"stadium",kind:"stadium",x:-2900,z:-2450,rot:.15,size:150},{id:"lighthouse",kind:"lighthouse",x:3250,z:5300,rot:0,size:30},{id:"terminal",kind:"terminal",x:-7800,z:-1900,rot:0,size:220},{id:"hangars",kind:"hangars",x:-7400,z:-2250,rot:0,size:120},{id:"cranes-port",kind:"cranes",x:-1150,z:-3330,rot:0,size:1600},{id:"cruise",kind:"cruise",x:-900,z:-2780,rot:0,size:300},{id:"tanks",kind:"tanks",x:-3600,z:-3100,rot:0,size:160},{id:"seaplane-base",kind:"seaplane",x:-2050,z:-4700,rot:Math.PI*.5,size:60},{id:"golf-club",kind:"clubhouse",x:1215,z:6250,rot:-.3,size:30}]}class o2{n=he;height=new Float32Array(he*he);zone=new Uint8Array(he*he);veg=new Uint8Array(he*he);coast=new Float32Array(he*he);exposure=new Uint8Array(he*he);districts=Zx();roads=Qx();bridges=t2();marinas=e2();runways=n2();channels=i2();pois=s2();landmasses=jx();lakes=_d();grids=Kx(this.districts);canals=Jx(this.districts,this.grids);toCell(t,e){return[(t+pn)/Ro*he,(e+pn)/Ro*he]}heightAt(t,e){const[n,i]=this.toCell(t,e),o=Qt(Math.floor(n),0,he-2),r=Qt(Math.floor(i),0,he-2),a=Qt(n-o,0,1),l=Qt(i-r,0,1),h=this.height,c=h[r*he+o],d=h[r*he+o+1],u=h[(r+1)*he+o],p=h[(r+1)*he+o+1];return se(se(c,d,a),se(u,p,a),l)}zoneAt(t,e){const[n,i]=this.toCell(t,e),o=Qt(Math.round(n),0,he-1),r=Qt(Math.round(i),0,he-1);return this.zone[r*he+o]}coastAt(t,e){const[n,i]=this.toCell(t,e),o=Qt(Math.round(n),0,he-1),r=Qt(Math.round(i),0,he-1);return this.coast[r*he+o]}vegAt(t,e){const[n,i]=this.toCell(t,e),o=Qt(Math.round(n),0,he-1),r=Qt(Math.round(i),0,he-1);return this.veg[r*he+o]/255}exposureAt(t,e){const[n,i]=this.toCell(t,e),o=Qt(Math.round(n),0,he-1),r=Qt(Math.round(i),0,he-1);return this.exposure[r*he+o]/255}isLand(t,e){return this.heightAt(t,e)>.05}districtAt(t,e){for(const n of this.districts)if(mo(t,e,n.cx,n.cz,n.hw,n.hh,n.rot)<0)return n;return null}regionalDepth(t,e){let n=3+2.6*(.5+.5*De(t/1100,e/1100,3))+1.2*De(t/350+4,e/350,2);n-=2.4*St(.12,.42,De(t/650+9,e/650+2,3)),n+=.8*De(t/190+8.8,e/190-4.4,3),n-=2.3*St(.22,.58,De(t/330+2,e/330-7,3)+.25*Gt(t/120-5,e/120+2))*St(2.6,4.2,n),n=Math.max(n,.7);const i=3380+380*De(e/3e3,.5,2)+170*De(e/1100+3.1,2.2,3),o=t-i+420*De(t/1300+4.4,e/1e3-6.6,3)+130*Gt(t/330+1.1,e/330-3.3);o>0&&(n+=o*.004+2.5*St(0,1300,o)+3*St(500,2300,o)+15*St(1400,4500,o)+1.5*Qo(t/600+1,e/260,3)*St(0,900,o));const r=St(-400,1400,t+300*De(e/1200,3.3,2))*(1-St(.4,1.4,Math.hypot((t-2600)/2600,(e-1900)/2400)));n+=4.5*r;const a=St(7200,9400,e+400*De(t/3e3,1.7,2));n+=18*a;const l=St(8300,9800,-e+400*De(t/3e3,5.1,2));n+=10*l;const h=Qo(t/900+2,e/380+1,3);return n-=1.6*h*r,n}generate(t){const e=he,n=this.landmasses,i=512,o=e/i,r=Is*o,a=new Float32Array(i*i),l=new Int16Array(i*i),h=new Float32Array(i*i),c=new Float32Array(i*i),d=new Float32Array(i*i),u=new Float32Array(i*i),p=new Float32Array(i*i),f=new Float32Array(i*i);for(let k=0;k<i;k++){const P=-pn+(k+.5)*r;for(let H=0;H<i;H++){const G=-pn+(H+.5)*r;let N=1/0,$=-1;for(let et=0;et<n.length;et++){const X=n[et];if(Math.hypot(G-X.bx,P-X.bz)-X.br>N)continue;const V=X.sd(G,P);V<N&&(N=V,$=et)}const W=k*i+H;if(a[W]=N,l[W]=$,u[W]=n[$].seabed,p[W]=n[$].shelf,h[W]=this.regionalDepth(G,P),c[W]=De(G/260,P/260,3),$===0&&N<0){const et=-N,X=2*De(G/1500+2,P/1500-1,3)+.9*De(G/420+7,P/420+3,3),q=2.2*Math.exp(-(((et-1500)/1e3)**2));d[W]=St(150,1100,et)*(1.6+X+q)}else d[W]=0}t&&!(k&31)&&t(k/i*.3)}{const G=[],N=[];for(let X=0;X<8;X++){const q=X/8*Math.PI*2+.2;G.push(Math.cos(q)),N.push(Math.sin(q))}const $=new Float32Array(8),W=(X,q)=>{const V=Math.floor((X+pn)/r),st=Math.floor((q+pn)/r);return V<0||st<0||V>=i||st>=i?V<0?-1e3:1e3:a[st*i+V]},et=(X,q,V)=>{const st=Qt(Math.floor((X+pn)/r),0,i-1),pt=Qt(Math.floor((q+pn)/r),0,i-1)*i+st;return Math.min(h[pt],.05+Math.max(V,0)*u[pt]+(n[l[pt]].beach===0?p[pt]:0))};for(let X=0;X<i;X++){const q=-pn+(X+.5)*r;for(let V=0;V<i;V++){const st=X*i+V,ct=a[st];if(ct<-450){f[st]=0;continue}const pt=-pn+(V+.5)*r;for(let D=0;D<8;D++){let J=0,Z=ct>=0;for(let rt=1;rt<=40;rt++){const dt=pt+G[D]*rt*200,xt=q+N[D]*rt*200,ft=W(dt,xt);if(ft<0){if(!Z){if(rt*200>600)break;continue}break}Z=!0;const z=dt>pn||xt>pn||xt<-pn?25:et(dt,xt,ft);J+=200*St(.5,12,z)}$[D]=J}let K=0,ot=0,j=0;for(let D=0;D<8;D++){const J=$[D];J>K?(j=ot,ot=K,K=J):J>ot?(j=ot,ot=J):J>j&&(j=J)}const nt=(K+ot+j)/(3*40*200);f[st]=St(.04,.8,nt)}}t&&t(.35)}const v=(k,P,H,G,N)=>{const $=N*i+G;return se(se(k[$],k[$+1],P),se(k[$+i],k[$+i+1],P),H)};let m=0,g=0,w=0,y=0;const x=(k,P)=>{const H=Qt(k/o-.5,0,i-1.001),G=Qt(P/o-.5,0,i-1.001),N=Math.floor(H),$=Math.floor(G),W=H-N,et=G-$;m=W,g=et,w=N,y=$;const X=v(a,W,et,N,$),q=$*i+N,V=q+1,st=q+i,ct=st+1;let pt=l[q],K=a[q];return a[V]<K&&(K=a[V],pt=l[V]),a[st]<K&&(K=a[st],pt=l[st]),a[ct]<K&&(K=a[ct],pt=l[ct]),[X,pt]};let b=0,M=1;const S=()=>{const k=y*i+w,P=k+1,H=k+i,G=H+1,N=se(a[P]-a[k],a[G]-a[H],g),$=se(a[H]-a[k],a[G]-a[P],m),W=Math.hypot(N,$);W>1e-6?(b=N/W,M=$/W):(b=0,M=1)},T=this.channels,_=this.runways,E=this.districts,A=this.lakes,U=this.canals,F=U.map(k=>({minX:Math.min(k.a[0],k.b[0])-k.width,maxX:Math.max(k.a[0],k.b[0])+k.width,z:k.a[1]})),I=this.marinas,B=this.roads.filter(k=>k.cls==="highway"||k.cls==="arterial").map(k=>{let P=1/0,H=-1/0,G=1/0,N=-1/0;for(const[W,et]of k.pts)P=Math.min(P,W),H=Math.max(H,W),G=Math.min(G,et),N=Math.max(N,et);const $=k.width*.5+20;return{pts:k.pts,hw:k.width*.5,minX:P-$,maxX:H+$,minZ:G-$,maxZ:N+$}});for(let k=0;k<e;k++){const P=-pn+(k+.5)*Is,H=$x(P);for(let G=0;G<e;G++){const N=-pn+(G+.5)*Is,$=k*e+G;let[W,et]=x(G+.5,k+.5);const X=n[et],q=v(f,m,g,w,y);if(Math.abs(W)<90&&(X.beach>0||X.wet)){const ot=9*Gt(N/60+3.3,P/60-1.7)+4*Gt(N/21+8.1,P/21+2.2);W+=ot*(X.wet?1.8:1)}this.coast[$]=W,this.exposure[$]=Math.round(255*Qt(q,0,1));const V=v(c,m,g,w,y);let st=0;if(et===0&&W>-160)for(const ot of A){if(Math.abs(N-ot.cx)>ot.rx*1.5+160||Math.abs(P-ot.cz)>ot.rz*1.6+160)continue;const j=hn(N,P,ot.cx,ot.cz,ot.rx,ot.rz,ot.rot,ot.seed,.22);st=Math.max(st,1-St(0,140,j))}let ct,pt,K=0;if(W<0){const ot=-W;let j=null;for(const J of E)if(mo(N,P,J.cx,J.cz,J.hw,J.hh,J.rot)<0){j=J;break}const nt=j!==null&&(j.zone===7||j.zone===6||j.zone===9||j.zone===13||j.zone===14||j.zone===15||j.zone===16||j.zone===8&&q<.3);if(X.wet)ct=.15+X.height*St(0,60,ot)+.15*Gt(N/30,P/30),pt=3,K=255;else if(X.beach===0)ct=X.height+.2*Gt(N/40,P/40),pt=9,K=10;else{const J=Math.max(.25+.4*q,.45+.9*(.5+.5*Gt(N/600+5.2,P/600-1.3))+.35*Gt(N/240+1.7,P/240-4.1)+.15*Gt(N/90+6.3,P/90+2.4)),Z=nt?5:X.beach*(.45+1.4*q)*J*(st>0?1.6:1),rt=ot+5*Gt(N/42+7.7,P/42-3.3)*St(3,12,ot),dt=St(0,Z,rt);if(ct=.25+(X.height-.25)*dt+.6*V*dt+.12*Gt(N/18,P/18),ct+=.18*q*St(.3,.55,dt)*(1-St(.6,.85,dt))*(.5+.5*Gt(N/60+3,P/60-5)),X.id==="barrier"||X.id==="southkey"){const xt=St(30,70,ot)*(1-St(90,160,ot))*(.4+.6*q);ct+=2.2*xt*(.6+.4*Qo(N/140,P/140,3))}if(pt=dt<.45?2:5,K=dt<.45?20:150,st>0&&pt===2&&(pt=4,K=120),ot<60&&st===0){if(X.isle&&q<.24){const xt=Gt(N/150+4.4,P/150-2.9);if(xt>.12){const ft=18+22*(.5+.5*xt);ot<ft&&(pt=3,ct=Math.min(ct,.3+.5*St(0,ft,ot))+.1*Gt(N/12,P/12),K=255)}}if(pt===2){const xt=De(N/210+9,P/210-4,2);(X.rocky?N>2400&&Qo(N/90+5,P/90+5,3)>.62:xt>.36&&q>.3)&&ot<26&&(pt=12,ct=.3+1.1*St(0,22,ot)+.9*Qo(N/14,P/14,2)*(1-St(20,26,ot)),K=0)}}if(X.id==="garza"&&P<gn[0][1]+60&&zs(N,P,gn[0][0],gn[0][1],gn[1][0],gn[1][1])<wd+40){const xt=St(gn[0][1]+60,gn[0][1]-40,P);xt>.5&&(pt=2,K=15);const ft=se(.3,.8+.08*Gt(N/40,P/40),St(0,16,ot));ct=se(ct,Math.max(ct,ft),xt)}}if(et===0){const J=v(d,m,g,w,y)*(1-st);ct+=J+.25*Gt(N/95+2,P/95)*St(0,.5,J);const Z=St(H+160,H-160,N);if(Z>0){const rt=Gt(N/70+1,P/70+5),dt=rt<-.32?-.25:.35+.4*(.5+.5*rt)+.05*Gt(N/9,P/9);ct=se(ct,dt,Z),Z>.5&&(pt=19);let xt=1/0;for(const ft of B)N<ft.minX||N>ft.maxX||P<ft.minZ||P>ft.maxZ||(xt=Math.min(xt,q0(N,P,ft.pts)-ft.hw));xt<16&&(ct=Math.max(ct,se(1.4+.1*Gt(N/30,P/30),ct,St(3,16,xt))),xt<6&&(K=Math.min(K,30)))}}let D=!1;if(ct>1.4&&j!==null){const J=j;D=!0,pt=J.zone,J.zone===7?(ct=Math.max(ct,3.6),K=30):J.zone===11?(ct+=2.5*De(N/180,P/180,3)+1.5,K=255):J.zone===4?K=120+Math.floor(100*St(-.1,.4,V)):J.zone===10?(ct=se(ct,2.8+.05*Gt(N/50,P/50),St(0,-150,mo(N,P,J.cx,J.cz,J.hw,J.hh,J.rot))),K=35):J.zone===13||J.zone===14||J.zone===9?K=5:J.zone===8||J.zone===6?K=60:J.track?K=Math.floor((185+70*St(-.3,.4,V))*(1-.6*St(.22,.5,Gt(N/95+5,P/95-2)))):K=70+Math.floor(115*St(-.25,.45,V))}for(const J of _){const Z=zs(N,P,J.a[0],J.a[1],J.b[0],J.b[1]);Z<J.width*.5+60&&(ct=se(ct,2.9,St(J.width*.5+60,J.width*.5+10,Z)))}if(pt===5&&!D){if(pt=4,K=Math.floor(150+105*St(-.35,.3,V)),X.isle){const J=Gt(N/95+5,P/95-2);K=Math.floor(Math.min(255,K+45)*(1-.55*St(.22,.5,J))),J>.44&&ct>1.6&&(pt=2,K=15)}st>0&&(K=Math.min(K,160))}if(pt===19){const J=St(.5,.64,.5+.5*De(N/240+3,P/240+8,3));K=Math.floor(40+215*J),ct<0&&(K=0)}for(let J=0;J<U.length;J++){const Z=F[J];if(Math.abs(P-Z.z)>U[J].width||N<Z.minX||N>Z.maxX)continue;const rt=U[J],dt=zs(N,P,rt.a[0],rt.a[1],rt.b[0],rt.b[1]);if(dt>=rt.width*.5)continue;let xt=!1;for(const ft of rt.culverts)if(Math.abs(N-ft)<rt.culvertHalf){xt=!0;break}xt||(ct=-(.5+(rt.depth-.5)*St(rt.width*.5,rt.width*.5-6,dt)),pt=1,K=0)}}else{const ot=v(h,m,g,w,y),j=v(u,m,g,w,y),nt=v(p,m,g,w,y);let D;if(X.wet)D=Math.min(ot,.05+W*j);else if(X.beach===0)D=Math.min(ot,nt+W*j);else{const Z=.45+.95*q,rt=.05+W*j*Z;S();const dt=1.9+.5*Gt(N/330+2,P/330-7)+W*.0012,xt=pi(rt,dt,.7);let ft=xt;const z=St(50,160,W),R=.6*De(N/150+5.5,P/150+1.5,3)+.4*Gt(N/70-3.3,P/70+8.8);ft+=(.7*R+1.1*St(-.45,-.8,R)-.5*St(.45,.8,R))*z;const tt=Qt(400+130*De(N/520+3.7,P/520-2.1,3)+210*De(N/1700+1,P/1700+8,2),200,620),ht=170+110*(.5+.5*Gt(N/300-1,P/300+6)),gt=N-b*(W-tt),ut=P-M*(W-tt),Nt=.5*Gt(gt/150+2.2,ut/150-9.9)+.3*Gt(N/95-4.4,P/95+1.7)+.2*Gt(N/260+7.7,P/260-3.1),bt=St(tt-ht,tt+ht,W+200*Nt);if(ft+=1.4*St(.3,.7,-Nt)*St(tt-320,tt-60,W),q>.35&&W<300){const Dt=N-b*W,ee=P-M*W,yt=Math.max(0,Math.sin(W/38+1.6*Gt(Dt/120+4,ee/120-1))),Ot=St(-.25,.3,Gt(Dt/260+5.5,ee/260+2.5));ft-=.35*yt*yt*Ot*St(.35,.7,q)*St(20,60,W)*(1-St(160,300,W))}ft=Math.max(ft,Math.min(xt,.45)),D=se(Math.min(ft,ot),ot,bt)}if(Math.abs(N-190)<260&&Math.abs(P-2380)<220){const Z=yd(N,P);Z<0&&(D=Math.max(D,.5+1.7*St(0,-45,Z)))}const J=Math.max(1-Math.hypot((N+350)/520,(P-3250)/260),1-Math.hypot((N-2500)/700,(P-3300)/300),1-Math.hypot((N-1200)/600,(P-1500)/260));if(J>0){const Z=St(0,.45,J)*(.6+.4*De(N/130+7,P/130-3,3));D=se(D,-.12+.6*(1-Z),Z*.94)}for(const Z of T){if(Math.abs(N-Z.bx)>Z.br||Math.abs(P-Z.bz)>Z.br)continue;const rt=Z.width>=200;let dt=q0(N,P,Z.pts)-Z.width*.5;rt&&(dt+=(80*De(N/380+1.5,P/380-2.5,2)+130*Gt(N/1100+3.3,P/1100-6.1))*St(-Z.width*.3,0,dt));const xt=rt?220:60;if(dt<xt){let ft=St(-Z.width*.1,xt,dt);rt&&(ft=1-(1-ft)*(1-ft)),D=Math.max(D,Z.depth*(1-ft)+D*ft)}}for(const Z of I){if(Math.abs(N-Z.x)>420||Math.abs(P-Z.z)>420)continue;const rt=Math.sin(Z.rot),dt=-Math.cos(Z.rot),xt=Z.pierLen*.5+40,ft=mo(N,P,Z.x+rt*xt,Z.z+dt*xt,Z.piers*14+40,xt+10,Z.rot);ft<40&&(D=Math.max(D,2.6*(1-St(-5,40,ft))))}for(let Z=0;Z<U.length;Z++){const rt=F[Z];if(Math.abs(P-rt.z)>U[Z].width||N<rt.minX||N>rt.maxX)continue;const dt=U[Z],xt=zs(N,P,dt.a[0],dt.a[1],dt.b[0],dt.b[1]);xt<dt.width*.5&&(D=Math.max(D,.5+(dt.depth-.5)*St(dt.width*.5,dt.width*.5-6,xt)))}D+=.08*Gt(N/45,P/45),ct=-D,pt=ct>-.35?17:D>9?0:1,ct>0&&(pt=17),K=0}this.height[$]=ct,this.zone[$]=pt,this.veg[$]=Qt(K,0,255)}t&&!(k&63)&&t(.35+k/e*.65)}}}const jn=`
float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = m * p; a *= 0.5; }
  return v;
}
float fbm3(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 3; i++) { v += a * vnoise(p); p = m * p; a *= 0.5; }
  return v;
}
`,Fo=`
uniform vec3 uSunDir;
uniform vec3 uSunColor;      // linear radiance scale of direct sun
uniform vec3 uZenithColor;
uniform vec3 uHorizonColor;
uniform vec3 uHazeColor;     // colour of in-scattered haze near the horizon
uniform vec3 uSunHazeColor;  // haze colour looking toward the sun
uniform float uHazeDensity;  // extinction per metre at sea level
uniform float uHazeHeight;   // scale height (m)
uniform float uCloudCoverage;
uniform float uCloudBase;
uniform float uCloudTop;
uniform vec2 uCloudWind;     // world offset of the cloud field (m)
uniform float uCloudSeed;
uniform float uNight;        // 0 day .. 1 night
uniform float uTime;
`,Pr=`
float worley2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 r = g + hash22(i + g) - f;
    d = min(d, dot(r, r));
  }
  return sqrt(d);
}
/** Macro cloud field in cloud space: x = coverage (0 clear .. 1 solid), y = "interior" (how deep inside a
 *  mass; drives vertical development so large cells tower while small ones stay flat), z = column
 *  thickness over a wide ramp (keeps varying across a closed deck, where x and y have saturated, so the
 *  underside of an overcast shows its cells).
 *  Individual cumulus are domain-warped cellular blobs (two worley scales, ~6 km and ~3 km spacing) that
 *  only develop where a slow ~17 km macro field is high: clusters of distinct 1-4 km masses separated by
 *  sectors of clear sky, rather than an even sprinkle that fuses into a band near the horizon. */
/** Raw (un-thresholded) macro field; the raymarch bakes this and thresholds it per height so that every
 *  cell shrinks toward its top, while the ground shadow thresholds it once at the base footprint. */
float cloudFieldRaw(vec2 cs) {
  vec2 p = cs * 0.00015 + uCloudSeed;
  vec2 warp = (vec2(fbm3(p * 1.3), fbm3(p * 1.3 + 4.2)) - 0.5) * 0.35;
  float macro = fbm3(p * 0.4 + 9.0);
  float cellsA = 1.0 - worley2(cs * (1.0 / 6000.0) + warp + uCloudSeed * 0.37);
  float cellsB = 1.0 - worley2(cs * (1.0 / 3000.0) + warp * 1.5 + uCloudSeed * 0.61 + 2.3);
  return (cellsA * 0.65 + cellsB * 0.35) * 0.55 + macro * 0.45;
}
/** Coverage threshold on the raw field (the cloud base footprint). */
float cloudThreshold() { return 0.72 - uCloudCoverage * 0.40; }
vec3 cloudFieldCS(vec2 cs) {
  float f = cloudFieldRaw(cs);
  float thr = cloudThreshold();
  // narrow ramp: the edge detail comes from the 3D noise erosion, a wide ramp only made thin veils
  float cov = smoothstep(thr, thr + 0.09, f);
  float interior = smoothstep(thr + 0.03, thr + 0.25, f);
  float column = smoothstep(thr - 0.04, thr + 0.5, f);
  return vec3(cov, interior, column);
}
float cloudCoverageCS(vec2 cs) { return cloudFieldCS(cs).x; }
float cloudCoverage2D(vec2 wp) { return cloudCoverageCS(wp + uCloudWind); }
/** Cloud shadow factor (1 = lit, ~0.35 = under a dense cloud) at a world position. */
float cloudShadow(vec3 wp) {
  // project along the sun direction up to the cloud base
  float k = (uCloudBase - wp.y) / max(uSunDir.y, 0.15);
  vec2 sp = wp.xz + uSunDir.xz * k;
  float c = cloudCoverage2D(sp);
  return 1.0 - 0.72 * c * smoothstep(0.0, 0.25, uSunDir.y);
}
`,Lr=`
/** Sky gradient. uZenithColor is the deep blue of the upper sky, uHorizonColor the saturated blue-cyan a
 *  few degrees above the horizon; the blend has a short tail (most of it happens below 20 deg) so the sky
 *  stays saturated down to ~5 deg. Only the last ~2 deg whiten toward the haze colour (the band the
 *  aerial perspective fades distant terrain and clouds into), so there is no pale zone above the horizon. */
vec3 skyRadiance(vec3 dir) {
  float y = clamp(dir.y, -1.0, 1.0);
  float up = max(y, 0.0);
  // the horizon glow reaches higher when the sun is low (long paths through lit air all around)
  float kLow = mix(3.5, 5.0, smoothstep(0.05, 0.35, uSunDir.y));
  float lowMix = pow(1.0 - up, kLow);
  vec3 col = mix(uZenithColor, uHorizonColor, lowMix);
  // narrow warm-white haze band; never darker than the low sky so a warm sunset horizon keeps its glow
  float hband = pow(1.0 - up, 55.0);
  vec3 hazeWhite = max(mix(uHazeColor, uSunHazeColor, 0.3), uHorizonColor * 1.05);
  col = mix(col, hazeWhite, hband * 0.85 * smoothstep(-0.05, 0.12, uSunDir.y));
  // slight brightening of the sky toward the sun (mie forward scatter), strongest near horizon
  float cosSun = dot(dir, uSunDir);
  float horizonMix = pow(1.0 - up, 14.0);
  float mie = pow(max(cosSun, 0.0), 8.0) * (0.08 + 0.5 * horizonMix);
  col += uSunHazeColor * mie * smoothstep(-0.1, 0.15, uSunDir.y);
  // sunset band
  float band = exp(-abs(y) * 9.0) * pow(max(cosSun, 0.0), 2.0);
  col += uSunHazeColor * band * 0.35 * (1.0 - smoothstep(0.15, 0.5, uSunDir.y)) * smoothstep(-0.12, 0.05, uSunDir.y);
  // below the horizon: dark sea haze
  col = mix(col, uHazeColor * 0.75, smoothstep(0.0, -0.08, y));
  return col;
}
vec3 sunDisc(vec3 dir) {
  float cosSun = dot(dir, uSunDir);
  float disc = smoothstep(0.99985, 0.99995, cosSun);
  float glow = pow(max(cosSun, 0.0), 1400.0) * 0.6 + pow(max(cosSun, 0.0), 160.0) * 0.08;
  return uSunColor * (disc * 40.0 + glow) * smoothstep(-0.05, 0.02, uSunDir.y);
}
`,ch=`
float opticalDepth(float y0, float y1, float d) {
  float H = uHazeHeight;
  float dy = y1 - y0;
  float dens;
  if (abs(dy) < 1.0) dens = exp(-max(y0, 0.0) / H);
  else dens = H / dy * (exp(-max(y0, 0.0) / H) - exp(-max(y1, 0.0) / H));
  return uHazeDensity * dens * d;
}
vec3 applyAerial(vec3 col, vec3 camPos, vec3 wp) {
  vec3 dv = wp - camPos;
  float d = length(dv);
  vec3 dir = dv / max(d, 1e-3);
  float od = opticalDepth(camPos.y, wp.y, d);
  float ext = exp(-od);
  // in-scattered light: the sky colour in this direction (seamless horizon), darker for downward rays
  vec3 skyHaze = skyRadiance(vec3(dir.x, max(dir.y, 0.0), dir.z));
  float down = smoothstep(0.0, -0.35, dir.y);
  vec3 haze = mix(skyHaze, uHazeColor * 0.8, down);
  return col * ext + haze * (1.0 - ext);
}
`;function r2(s=64){const t=s,e=new Uint8Array(t*t*t*4),n=(d,u,p,f)=>{let v=d*374761393+u*668265263+p*2147483647+f*1013904223|0;return v=Math.imul(v^v>>>13,1274126177),((v^v>>>16)>>>0)/4294967296},i=(d,u)=>(d%u+u)%u,o=(d,u,p,f,v)=>{const m=Math.floor(d),g=Math.floor(u),w=Math.floor(p),y=d-m,x=u-g,b=p-w,M=k=>k*k*k*(k*(k*6-15)+10),S=M(y),T=M(x),_=M(b),E=(k,P,H,G,N,$)=>{const et=n(i(k,f),i(P,f),i(H,f),v)*6.2831853,X=n(i(k,f),i(P,f),i(H,f),v+7)*3.1415926,q=Math.cos(et)*Math.sin(X),V=Math.sin(et)*Math.sin(X),st=Math.cos(X);return q*G+V*N+st*$},A=(k,P,H)=>k+(P-k)*H,U=A(E(m,g,w,y,x,b),E(m+1,g,w,y-1,x,b),S),F=A(E(m,g+1,w,y,x-1,b),E(m+1,g+1,w,y-1,x-1,b),S),I=A(E(m,g,w+1,y,x,b-1),E(m+1,g,w+1,y-1,x,b-1),S),B=A(E(m,g+1,w+1,y,x-1,b-1),E(m+1,g+1,w+1,y-1,x-1,b-1),S);return A(A(U,F,T),A(I,B,T),_)},r=(d,u,p,f,v)=>{const m=Math.floor(d),g=Math.floor(u),w=Math.floor(p);let y=1e9;for(let x=-1;x<=1;x++)for(let b=-1;b<=1;b++)for(let M=-1;M<=1;M++){const S=m+M,T=g+b,_=w+x,E=S+n(i(S,f),i(T,f),i(_,f),v),A=T+n(i(S,f),i(T,f),i(_,f),v+3),U=_+n(i(S,f),i(T,f),i(_,f),v+5),F=(E-d)**2+(A-u)**2+(U-p)**2;F<y&&(y=F)}return 1-Math.min(1,Math.sqrt(y))},a=(d,u,p,f,v)=>f+(d-u)/(p-u)*(v-f),l=d=>Math.min(1,Math.max(0,d));let h=0;for(let d=0;d<t;d++)for(let u=0;u<t;u++)for(let p=0;p<t;p++){const f=p/t,v=u/t,m=d/t;let g=0,w=.5,y=0;for(let F=0;F<3;F++){const I=4<<F;g+=w*o(f*I,v*I,m*I,I,11+F),y+=w,w*=.5}g=g/y*.5+.5;const x=r(f*4,v*4,m*4,4,31),b=r(f*8,v*8,m*8,8,41),M=r(f*16,v*16,m*16,16,51),S=x*.625+b*.25+M*.125,T=a(g,0,1,S,1),_=r(f*4,v*4,m*4,4,61),E=r(f*8,v*8,m*8,8,71),A=_*.65+E*.35,U=(o(f*8,v*8,m*8,8,81)*.65+o(f*16,v*16,m*16,16,91)*.35)*.5+.5;e[h++]=Math.round(l(T)*255),e[h++]=Math.round(l(A)*255),e[h++]=Math.round(l(U)*255),e[h++]=Math.round(l(g)*255)}const c=new Ku(e,t,t,t);return c.format=En,c.type=ti,c.minFilter=ye,c.magFilter=ye,c.wrapS=c.wrapT=c.wrapR=So,c.unpackAlignment=1,c.needsUpdate=!0,c}const $0=1024,j0=76e3,a2=42e3,l2=7e3,c2=`
vec3 moonDirection() { return normalize(vec3(-uSunDir.x, max(0.25, -uSunDir.y * 0.8 + 0.3), -uSunDir.z)); }
vec3 stars(vec3 dir) {
  vec3 d = dir * 220.0;
  vec3 c = floor(d);
  float h = hash12(c.xy + c.z * 17.0);
  float star = smoothstep(0.985, 1.0, h) * step(0.15, dir.y);
  vec3 f = fract(d) - 0.5;
  star *= smoothstep(0.35, 0.0, length(f));
  return vec3(star) * (0.6 + 0.4 * hash12(c.zx));
}
/** starVis: 1 in clear sky, 0 behind cloud (stars vanish before the sky glow does: they are point
 *  sources, any haze or cloud veil kills them first). */
vec3 skyBackground(vec3 dir, float starVis) {
  vec3 sky = skyRadiance(dir);
  sky += sunDisc(dir);
  vec3 moonDir = moonDirection();
  float cm = dot(dir, moonDir);
  float moon = smoothstep(0.99975, 0.99992, cm) * 1.6 + pow(max(cm, 0.0), 700.0) * 0.08;
  sky += vec3(0.75, 0.8, 0.95) * moon * uNight;
  sky += stars(dir) * uNight * 0.55 * starVis;
  return sky;
}
`,h2=`
${Fo}
${jn}
${Pr}
uniform vec2 uCovCenter;
uniform float uCovExtent;
in vec2 vUv;
void main() {
  vec2 cs = uCovCenter + (vUv - 0.5) * uCovExtent;
  float f = cloudFieldRaw(cs);
  vec2 p = cs * 0.00015 + uCloudSeed;
  // slow field: which masses develop vertically (0 flat .. 1 towering)
  float tower = clamp((fbm3(p * 0.7 + 3.1) - 0.22) / 0.46, 0.0, 1.0);
  // slight variation of the base altitude between cells
  float baseVar = clamp((fbm3(p * 2.2 + 5.5) - 0.2) / 0.5, 0.0, 1.0);
  // ~1 km turret field: modulates the column height inside a cell so a mass breaks into several towers
  // of different heights instead of one smooth mound; it also warps the 3D noise domain so the 64^3
  // tile never repeats visibly across the sky
  float turret = clamp((fbm3(p * 7.0 + 21.0) - 0.25) / 0.4, 0.0, 1.0);
  gl_FragColor = vec4(f, tower, baseVar, turret);
}
`,u2=`
precision highp sampler3D;
${Fo}
${jn}
${Pr}
${Lr}
${ch}
uniform sampler3D uNoise3D;
uniform sampler2D uCovTex;
uniform vec3 uGroundColor;
uniform vec2 uCovCenter;
uniform float uCovExtent;
uniform vec3 uCamPos;
uniform mat4 uInvProj;
uniform mat4 uInvView;
uniform float uCloudSteps;
uniform float uMaxDist;
in vec2 vUv;

const float SIGMA = 0.03;         // extinction per metre at unit density (dense cumulus)
const float NOISE_SCALE = 1.0 / 2600.0;

// interleaved gradient noise: a pure function of the pixel position, so frames are reproducible
float ign(vec2 px) { return fract(52.9829189 * fract(0.06711056 * px.x + 0.00583715 * px.y)); }

/** Macro field at a world xz position: x raw field, y vertical development (0 flat .. 1 towering),
 *  z base variation, w turret field (~1 km). */
vec4 macroField(vec2 wp) {
  vec2 uv = (wp + uCloudWind - uCovCenter) / uCovExtent + 0.5;
  return texture(uCovTex, uv);
}

/** Vertical envelope of the layer (before noise): a flat base whose footprint is exactly cloudCoverage2D
 *  (so the ground shadows still match), columns whose height is set by how far the raw field exceeds the
 *  threshold (cell interiors tower, edges stay low), by the slow "tower" field (some masses develop
 *  vertically, others stay flat) and by the ~1 km turret field. Returns coverage * vertical profile;
 *  hf = height fraction in the slab, hn = fraction of this column's own height, H = column height. */
float envelope(vec3 p, vec4 f, out float hf, out float hn, out float H) {
  float thick = uCloudTop - uCloudBase;
  // base altitude: varies between cells (f.z) with a gentle ~1 km undulation (f.w) so no base is a ruler line
  float base = uCloudBase + (f.z - 0.5) * 0.16 * thick + (f.w - 0.5) * 0.05 * thick;
  hf = (p.y - base) / thick;
  float d = f.x - cloudThreshold();
  // base footprint (identical to cloudCoverage2D, so the ground shadows match)
  float cov = smoothstep(0.0, 0.09, d);
  // own height of this column: low at the footprint edge, rising steeply with the depth inside the cell
  // (steep walls, a narrow skirt of low tufts instead of a wide thin shelf around each tower; the sqrt
  // rounds a conical cell into a dome), faster over towering masses; the turret field then breaks the
  // mound into several towers of different heights
  float g = mix(0.55, 0.16, f.y);
  float dg = max(d, 0.0) / g;
  H = 0.1 + 0.9 * sqrt(clamp(dg * 2.2, 0.0, 1.0));
  // a closed deck saturates the field, so its thickness (and the light coming through it) varies with
  // the turret field alone: give it a wider range so the underside shows thick dark cells and thin bright gaps
  float deck = smoothstep(0.45, 0.7, uCloudCoverage);
  H = clamp(H * mix(mix(0.55, 0.28, deck), 1.1, f.w), 0.05, 1.0);
  hn = hf / H;
  // cumulus keep a fairly sharp flat base (the shape noise still nibbles it into shallow lumps); a closed
  // deck gets a soft one carved into hanging cells. The upper two thirds of the column are a soft ramp
  // the shape noise cuts into cauliflower lobes several hundred metres tall.
  float baseRamp = mix(0.09, 0.18, smoothstep(0.45, 0.7, uCloudCoverage));
  float v = smoothstep(0.0, baseRamp, hf) * (1.0 - smoothstep(0.25, 1.0, hn)) * (1.0 - smoothstep(0.9, 1.0, hf));
  // cov^2: the soft footprint fringe thins out for the noise to shred instead of forming a plate
  return cov * cov * v;
}

vec3 noiseCoord(vec3 p, vec4 f) {
  vec3 q = (p + vec3(uCloudWind.x, 0.0, uCloudWind.y)) * NOISE_SCALE;
  // slow domain warp breaks the tiling of the 64^3 texture
  return q + vec3(f.w * 0.9, f.z * 0.53, f.w * 0.6);
}

/** Shape-eroded density: solid interiors, cauliflower lobes where the envelope thins (top and edges). */
float shapeDensity(float e, float hn, vec4 n) {
  float shape = clamp((n.r * 0.6 + n.g * 0.25 + n.a * 0.15 - 0.3) / 0.7, 0.0, 1.0);
  // bases stay solid and slightly mottled; the erosion grows toward the top where it carves the lobes
  float erosion = mix(0.7, 1.3, clamp(hn, 0.0, 1.0));
  return e * 1.2 - (1.0 - shape) * erosion;
}

/** Expected noised density for an envelope value (what shapeDensity averages to over the noise): the
 *  envelope alone would count the soft fringe outside the visible surface as cloud. */
float meanDensity(float e, float hn) { return clamp(e * 1.2 - 0.5 * mix(0.7, 1.3, clamp(hn, 0.0, 1.0)), 0.0, 1.0); }

/** Density without edge detail (used by the light march). */
float densityBase(vec3 p, vec4 f) {
  float hf, hn, H;
  float e = envelope(p, f, hf, hn, H);
  if (e <= 0.002) return 0.0;
  vec4 n = texture(uNoise3D, noiseCoord(p, f));
  return clamp(shapeDensity(e, hn, n), 0.0, 1.0);
}

/** Full density with detail erosion of the edges; mott returns the low-frequency shape noise so the
 *  lighting can mottle the undersides without another fetch. */
float densityFull(vec3 p, vec4 f, float e, float hn, out float mott) {
  vec3 q = noiseCoord(p, f);
  vec4 n = texture(uNoise3D, q);
  mott = n.a;
  float d = shapeDensity(e, hn, n);
  if (d <= 0.0) return 0.0;
  // worley erosion, billowy lobes at the base and sides, wispier toward the top
  float det = texture(uNoise3D, q * 3.0 + vec3(0.37, 0.11, 0.73)).g;
  float wisp = texture(uNoise3D, q * 5.0 + vec3(0.61, 0.29, 0.17)).b;
  float er = mix(det, wisp, smoothstep(0.45, 1.0, hn));
  // remap (rather than subtract) so eroded edges keep a steep density gradient: crisp cauliflower lobes
  float k = 0.5 * (1.0 - er);
  d = (d - k) / (1.0 - k);
  return clamp(d * 2.5, 0.0, 1.0);
}

/** Optical depth toward the light. Three short steps sample the noised density (lobes shadow their
 *  neighbours: the cauliflower relief), three long steps sample only the smooth envelope (a long step
 *  through the noised field would switch on and off as it crosses lobes and terrace the shading), and
 *  the rest of the column above the sample is added analytically (the flat base of a tall tower is
 *  shadowed by the whole tower). */
float lightOD(vec3 p, vec3 L, float H, float hf) {
  float thick = uCloudTop - uCloudBase;
  float od = 0.0;
  float t = 0.0;
  float s = 24.0;
  float last = 0.0;
  for (int i = 0; i < 6; i++) {
    vec3 q = p + L * (t + s * 0.5);
    if (q.y > uCloudTop + 1.0 || q.y < uCloudBase - 300.0) break;
    vec4 f = macroField(q.xz);
    if (i < 3) last = densityBase(q, f);
    else { float qhf, qhn, qH; last = meanDensity(envelope(q, f, qhf, qhn, qH), qhn); }
    od += last * s;
    t += s;
    s *= 2.0;
  }
  float rem = max((H - hf) * thick / max(L.y, 0.25) - t, 0.0);
  od += min(rem, 1200.0) * last * 0.5;
  // shadowing uses a reduced extinction: multiple scattering carries light deeper than Beer-Lambert alone
  return od * SIGMA * 0.7;
}

// Henyey-Greenstein phase normalised so that isotropic = 1
float hgN(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * c, 1.5); }
// dual-lobe phase: forward lobe gives the silver lining near the sun, back lobe keeps bases readable
float phase2(float c, float k) { return mix(hgN(c, 0.74 * k), hgN(c, -0.2 * k), 0.42); }
// Beer-Lambert with a cheap multiple-scattering approximation: 3 octaves of attenuated extinction, each
// with a flatter phase (light that has scattered several times has lost its direction, so the forward
// peak toward a low sun lights the rims but not the shadowed cores). The slow tail keeps the shaded
// walls at ~25 % of the lit crown while the base of a tall tower (~25 units of optical depth) drops to ~5 %.
vec3 scatter(float od, float c) {
  return vec3(0.44 * exp(-od) * phase2(c, 1.0), 0.36 * exp(-0.25 * od) * phase2(c, 0.5), 0.20 * exp(-0.06 * od) * phase2(c, 0.2));
}

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 vpos = uInvProj * vec4(ndc, 1.0, 1.0);
  vpos /= vpos.w;
  vec3 dir = normalize((uInvView * vec4(vpos.xyz, 0.0)).xyz);

  // light: the sun, handing over to the moon once the sun is below the horizon
  float nightMix = smoothstep(0.02, -0.08, uSunDir.y);
  vec3 moonDir = normalize(vec3(-uSunDir.x, max(0.25, -uSunDir.y * 0.8 + 0.3), -uSunDir.z));
  vec3 L = normalize(mix(uSunDir, moonDir, nightMix));
  // moonlit cumulus sit a few times above the night sky, not at the daylight ratio: the night exposure
  // boost (x3.5) would otherwise turn them white
  vec3 lightCol = uSunColor * 2.9 * mix(1.0, 0.3, nightMix);

  float T = 1.0;
  vec3 col = vec3(0.0);
  float ro_y = uCamPos.y;
  float t0 = -1.0, t1 = -1.0;
  float tb = (uCloudBase - ro_y) / dir.y;
  float tt = (uCloudTop - ro_y) / dir.y;
  if (ro_y < uCloudBase) { if (dir.y > 0.008) { t0 = tb; t1 = tt; } }
  else if (ro_y > uCloudTop) { if (dir.y < -0.008) { t0 = tt; t1 = tb; } }
  else { t0 = 0.0; t1 = dir.y > 0.0 ? tt : tb; }
  float meanDist = 0.0;
  if (t0 >= 0.0 && t0 < uMaxDist) {
    t1 = min(t1, uMaxDist);
    float pathLen = t1 - t0;
    // three step sizes: coarse through clear air, fine inside the envelope, and a surface step that
    // resolves the silhouette while the ray is still mostly transparent. The fine step is budget-limited
    // over the slab crossing and grows with distance (pixel footprint).
    float budget = uCloudSteps * 8.0;
    float dtF = max(pathLen / (budget * 0.6), 36.0 + t0 * 0.003);
    float dtC = dtF * 3.0;
    float dtS = dtF * (1.0 / 3.0);
    float t = t0 + ign(gl_FragCoord.xy) * dtF;

    float cosSun = dot(dir, L);
    float forward = smoothstep(0.3, 0.95, cosSun);
    // low sun: the whole lower sky glows warm, so the bounce light on the undersides turns warm too
    float lowSun = (1.0 - smoothstep(0.04, 0.3, L.y)) * (1.0 - nightMix);
    // sky light on the tops: hemisphere average of the dome (deep blue) whitened by aerosol scatter
    vec3 skyAmb = mix(uZenithColor, uHazeColor, 0.5) * 0.95;
    // bounce light on the bases: the sunlit sea and land (warm and dim at sunset, when the glowing
    // horizon haze takes over), and at night the city's glow on the undersides
    vec3 gndAmb = uGroundColor * 0.18 + uSunHazeColor * 0.32 * lowSun + vec3(1.0, 0.9, 0.8) * 0.035 * uNight;

    int level = 0;          // 0 coarse, 1 fine, 2 surface
    int empty = 0;
    int sinceLight = 9;
    float lt = 1.0;
    float wsum = 0.0;
    const vec3 ONE3 = vec3(1.0);
    for (int i = 0; i < 200; i++) {
      if (float(i) >= budget || t > t1 || T < 0.01) break;
      vec3 p = uCamPos + dir * t;
      vec4 f = macroField(p.xz);
      float hf, hn, H;
      float e = envelope(p, f, hf, hn, H);
      if (e <= 0.004) {
        // clear air: fall back to coarse steps after a couple of empty samples
        if (level > 0) { empty++; if (empty > 2) level = 0; }
        t += level == 0 ? dtC : (level == 1 ? dtF : dtS);
        continue;
      }
      if (level == 0) {
        // entered the envelope during a coarse step: back up and resample finely
        level = 1;
        t = max(t + dtF - dtC, t0);
        continue;
      }
      float mott;
      float dens = densityFull(p, f, e, hn, mott);
      if (dens <= 0.003) {
        empty++;
        if (level == 2 && empty > 1) level = 1;
        t += level == 1 ? dtF : dtS;
        continue;
      }
      empty = 0;
      if (level == 1 && T > 0.35) {
        // first density after a fine step: back up and resolve the surface with the small step
        level = 2;
        t = max(t + dtS - dtF, t0);
        continue;
      }
      float dt = level == 2 ? dtS : dtF;
      // the light march varies slowly along the ray: reuse it for the next 1-2 samples (the far light
      // steps sample the smooth envelope, so the reuse does not skip lobe shadows the eye would notice)
      if (sinceLight >= (level == 2 ? 2 : 1)) {
        lt = dot(scatter(lightOD(p, L, H, hf), cosSun), ONE3);
        sinceLight = 0;
      } else sinceLight++;
      float powder = 1.0 - exp(-dens * 5.0);
      float sunTerm = lt * mix(mix(0.7, 1.0, powder), 1.0, forward);
      // ambient: sky from above, sea/haze bounce from below, occluded by the column of cloud overhead
      // (the crown is open to the sky, the flat base of a tall tower sees almost none of it; thin cells
      // stay bright underneath). The overhead thickness is modulated by the low-frequency shape noise so
      // the bases read as mottled (hollows between the lobes let more light through), not an even grey.
      float thick = uCloudTop - uCloudBase;
      float above = max(H - hf, 0.0) * thick * mix(1.3, 0.6, mott);
      float below = max(hf, 0.0) * thick * mix(1.3, 0.6, mott);
      // walls: a sample near the outer surface (envelope well below 1) sees half the sky sideways
      float side = (1.0 - 0.7 * e) * smoothstep(0.0, 0.3, hn) * 0.6;
      float aoSky = max(mix(0.12, 1.0, exp(-above * 0.0022)), side);
      float aoGnd = max(mix(0.15, 1.0, exp(-below * 0.003)), side);
      vec3 amb = (skyAmb * aoSky + gndAmb * aoGnd) * mix(0.6, 1.3, mott);
      vec3 S = lightCol * sunTerm + amb;
      float a = 1.0 - exp(-dens * SIGMA * dt);
      col += T * a * S;
      meanDist += T * a * t;
      wsum += T * a;
      T *= 1.0 - a;
      if (level == 2 && T < 0.35) level = 1;
      t += dt;
    }
    if (wsum > 0.0) meanDist /= wsum; else meanDist = t0;
  }

  float alpha = 1.0 - T;
  if (alpha > 0.0005) {
    vec3 c = col / alpha;
    vec3 far = uCamPos + dir * meanDist;
    c = applyAerial(c, uCamPos, far);
    // distant clouds sink into the horizon haze (long low-angle paths through humid air); the aerial
    // perspective above already carries them to the haze colour, this only removes the cut-off at uMaxDist
    float fade = exp(-meanDist * 1.0e-5) * (1.0 - smoothstep(0.7 * uMaxDist, uMaxDist, meanDist));
    alpha *= fade;
    col = c * alpha;
  } else {
    alpha = 0.0;
    col = vec3(0.0);
  }
  gl_FragColor = vec4(col, 1.0 - alpha);
}
`,Z0=`
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,d2=`
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = vec4(p.xy, p.w * 0.999999, p.w);
}
`,f2=`
${Fo}
${jn}
${Lr}
${c2}
uniform sampler2D uCloudTex;
uniform vec2 uCloudTexel;
uniform vec2 uResolution;
uniform mat4 uInvProj;
uniform mat4 uInvView;
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 ndc = uv * 2.0 - 1.0;
  vec4 vpos = uInvProj * vec4(ndc, 1.0, 1.0);
  vpos /= vpos.w;
  vec3 dir = normalize((uInvView * vec4(vpos.xyz, 0.0)).xyz);
  // tent-filtered upsample of the reduced-resolution cloud layer (4 bilinear taps = 3x3 tent)
  vec2 o = uCloudTexel * 0.35;
  vec4 c = texture(uCloudTex, uv + vec2(-o.x, -o.y)) + texture(uCloudTex, uv + vec2(o.x, -o.y))
         + texture(uCloudTex, uv + vec2(-o.x, o.y)) + texture(uCloudTex, uv + vec2(o.x, o.y));
  c *= 0.25;
  vec3 sky = skyBackground(dir, smoothstep(0.6, 0.97, c.a));
  gl_FragColor = vec4(sky * c.a + c.rgb, 1.0);
}
`,p2=`
out vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`,m2=`
${Fo}
${jn}
${Pr}
${Lr}
uniform vec3 uGroundColor;
in vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  vec3 col = skyRadiance(dir);
  float up = max(dir.y, 0.0);
  // The dome is a saturated stylised gradient; the light a surface actually receives from a clear sky is
  // whitened by aerosol scattering and by sunlight bounced off the ground, so the probe blends toward a
  // neutral haze/ground mix (strongest low in the sky, absent at the zenith). Keeps white surfaces white
  // and shadows cool rather than blue without touching the visible sky.
  vec3 fill = mix(uHazeColor, uGroundColor, 0.25);
  col = mix(col, fill, 0.65 * pow(1.0 - up, 0.3));
  // clouds as a soft neutral brightening band so reflections and the IBL pick up overcast (grey, not blue) light
  float cov = uCloudCoverage;
  vec3 cloudCol = vec3(dot(uHorizonColor, vec3(0.2126, 0.7152, 0.0722))) * 1.15;
  col = mix(col, cloudCol, cov * 0.35 * smoothstep(0.0, 0.3, dir.y));
  vec3 sun = sunDisc(dir);
  col += min(sun, vec3(12.0));
  // sunlit ground below the horizon: bounce light for walls, hulls and undersides
  col = mix(col, uGroundColor, smoothstep(0.02, -0.06, dir.y));
  gl_FragColor = vec4(col, 1.0);
}
`;class g2{constructor(t,e,n){this.atmos=t,this.noise=r2(64),this.scale=n.scale,this.covRT=new vn($0,$0,{type:In,format:En,depthBuffer:!1,generateMipmaps:!1,minFilter:ye,magFilter:ye,wrapS:Qe,wrapT:Qe}),this.covMat=new Oe({vertexShader:Z0,fragmentShader:h2,uniforms:{...t.uniforms,uCovCenter:{value:this.covCenter},uCovExtent:{value:j0}},depthTest:!1,depthWrite:!1}),this.cloudMat=new Oe({vertexShader:Z0,fragmentShader:u2,uniforms:{...t.uniforms,uNoise3D:{value:this.noise},uCovTex:{value:this.covRT.texture},uCovCenter:{value:this.covCenter},uCovExtent:{value:j0},uCamPos:{value:new C},uInvProj:{value:new jt},uInvView:{value:new jt},uCloudSteps:{value:n.cloudSteps},uMaxDist:{value:a2}},depthTest:!1,depthWrite:!1}),this.quad=new pe(new _i(2,2),this.cloudMat),this.quad.frustumCulled=!1,this.quadScene.add(this.quad),this.cloudRT=new vn(4,4,{type:In,depthBuffer:!1,minFilter:ye,magFilter:ye}),this.domeMat=new Oe({vertexShader:d2,fragmentShader:f2,uniforms:{...t.uniforms,uCloudTex:{value:this.cloudRT.texture},uCloudTexel:{value:new Rt(.25,.25)},uResolution:{value:new Rt(1,1)},uInvProj:{value:new jt},uInvView:{value:new jt}},side:Tn,depthWrite:!1,depthTest:!0}),this.dome=new pe(new li(1,24,12),this.domeMat),this.dome.frustumCulled=!1,this.dome.renderOrder=-1e3,this.dome.isSky=!0,this.envMat=new Oe({vertexShader:p2,fragmentShader:m2,uniforms:{...t.uniforms},side:Tn,depthWrite:!1});const i=new pe(new li(50,32,16),this.envMat);this.envScene.add(i),this.pmrem=new Fc(e),this.pmrem.compileEquirectangularShader()}dome;cloudMat;covMat;domeMat;quad;quadScene=new Co;quadCam=new No(-1,1,1,-1,0,1);cloudRT;covRT;covBaked=!1;covCenter=new Rt;scale;envScene=new Co;envMat;pmrem=null;envRT=null;envMap=null;noise;setCloudSteps(t){this.cloudMat.uniforms.uCloudSteps.value=t}updateEnvironment(){return this.envRT&&this.envRT.dispose(),this.envRT=this.pmrem.fromScene(this.envScene,0,.1,200),this.envMap=this.envRT.texture,this.envMap}updateCoverage(t,e){const n=this.atmos.uniforms.uCloudWind.value,i=e.position.x+n.x,o=e.position.z+n.y;if(this.covBaked&&Math.hypot(i-this.covCenter.x,o-this.covCenter.y)<l2)return;this.covCenter.set(i,o),this.covBaked=!0,this.quad.material=this.covMat;const r=t.getRenderTarget();t.setRenderTarget(this.covRT),t.render(this.quadScene,this.quadCam),t.setRenderTarget(r),this.quad.material=this.cloudMat}render(t,e,n,i){const o=Math.max(2,Math.round(n*this.scale)),r=Math.max(2,Math.round(i*this.scale));(this.cloudRT.width!==o||this.cloudRT.height!==r)&&this.cloudRT.setSize(o,r),this.updateCoverage(t,e);const a=this.cloudMat.uniforms;a.uCamPos.value.copy(e.position),a.uInvProj.value.copy(e.projectionMatrixInverse),a.uInvView.value.copy(e.matrixWorld);const l=this.domeMat.uniforms;l.uResolution.value.set(n,i),l.uCloudTexel.value.set(1/o,1/r),l.uInvProj.value.copy(e.projectionMatrixInverse),l.uInvView.value.copy(e.matrixWorld);const h=t.getRenderTarget();t.setRenderTarget(this.cloudRT),t.render(this.quadScene,this.quadCam),t.setRenderTarget(h),this.dome.position.copy(e.position),this.dome.scale.setScalar(e.far*.9)}}class v2{height;zone;constructor(t,e){if(e.capabilities.isWebGL2&&e.extensions.has("OES_texture_float_linear"))this.height=new Fs(t.height,he,he,Sr,$n);else{const o=new Uint16Array(t.height.length);for(let r=0;r<o.length;r++)o[r]=pp.toHalfFloat(t.height[r]);this.height=new Fs(o,he,he,Sr,In)}this.height.minFilter=ye,this.height.magFilter=ye,this.height.wrapS=this.height.wrapT=Qe,this.height.generateMipmaps=!1,this.height.needsUpdate=!0;const i=new Uint8Array(he*he*4);for(let o=0;o<he*he;o++){i[o*4]=t.zone[o],i[o*4+1]=t.veg[o];const r=t.coast[o];i[o*4+2]=Math.max(0,Math.min(255,Math.round(128+r*.5))),i[o*4+3]=t.exposure[o]}this.zone=new Fs(i,he,he,En,ti),this.zone.minFilter=Nn,this.zone.magFilter=Nn,this.zone.wrapS=this.zone.wrapT=Qe,this.zone.generateMipmaps=!1,this.zone.needsUpdate=!0}}const x2=96,Md=8,bd=7;function w2(s,t){const e=Md*2**s,n=x2,i=n*e/2,o=n/4,r=3*n/4,a=[],l=[],h=[],c=new Int32Array((n+1)*(n+1)).fill(-1);let d=0;for(let p=0;p<=n;p++)for(let f=0;f<=n;f++){if(t&&f>o&&f<r&&p>o&&p<r)continue;c[p*(n+1)+f]=d++,a.push(-i+f*e,0,-i+p*e);let m=0,g=0;(f===0||f===n||p===0||p===n)&&s<bd-1&&((f===0||f===n)&&(p&1)===1?g=e:(p===0||p===n)&&(f&1)===1&&(m=e)),l.push(m,g)}for(let p=0;p<n;p++)for(let f=0;f<n;f++){const v=c[p*(n+1)+f],m=c[p*(n+1)+f+1],g=c[(p+1)*(n+1)+f],w=c[(p+1)*(n+1)+f+1];v<0||m<0||g<0||w<0||(f+p&1?h.push(v,w,m,v,g,w):h.push(v,g,m,m,g,w))}const u=new oe;return u.setAttribute("position",new Mt(a,3)),u.setAttribute("aEdge",new Mt(l,2)),u.setIndex(h),u.computeBoundingSphere(),u.boundingSphere=new Ne(new C(0,0,0),i*1.5+200),u}const y2=`
uniform sampler2D uHeightTex;
uniform vec3 uRingOffset;
uniform float uWorldSize;
attribute vec2 aEdge;
varying vec3 vWorldPos;
varying float vHeight;
float terrainHeight(vec2 wp) {
  vec2 uv = (wp + vec2(uWorldSize * 0.5)) / uWorldSize;
  return texture2D(uHeightTex, uv).r;
}
`,_2=`
vec3 wp = position + uRingOffset;
float h;
if (aEdge.x != 0.0 || aEdge.y != 0.0) {
  h = 0.5 * (terrainHeight(wp.xz + aEdge) + terrainHeight(wp.xz - aEdge));
} else {
  h = terrainHeight(wp.xz);
}
wp.y = h;
vWorldPos = wp;
vHeight = h;
// normal from finite differences of the height field (independent of mesh resolution)
float e = 12.0;
float hx = terrainHeight(wp.xz + vec2(e, 0.0)) - terrainHeight(wp.xz - vec2(e, 0.0));
float hz = terrainHeight(wp.xz + vec2(0.0, e)) - terrainHeight(wp.xz - vec2(0.0, e));
vec3 tnormal = normalize(vec3(-hx, 2.0 * e, -hz));
`,M2=`
uniform sampler2D uZoneTex;
uniform sampler2D uHeightTex;
uniform float uWorldSize;
uniform float uMapN;
varying vec3 vWorldPos;
varying float vHeight;
${jn}
vec4 zoneSample(vec2 wp) {
  vec2 uv = (wp + vec2(uWorldSize * 0.5)) / uWorldSize;
  return texture2D(uZoneTex, uv);
}
// bilinear canopy density (G) and wave exposure (A) from the nearest-filtered zone texture
vec2 zoneSmooth(vec2 wp) {
  vec2 t = (wp + vec2(uWorldSize * 0.5)) / uWorldSize * uMapN - 0.5;
  vec2 f = fract(t);
  vec2 b = (floor(t) + 0.5) / uMapN;
  float px = 1.0 / uMapN;
  vec2 s00 = texture2D(uZoneTex, b).ga;
  vec2 s10 = texture2D(uZoneTex, b + vec2(px, 0.0)).ga;
  vec2 s01 = texture2D(uZoneTex, b + vec2(0.0, px)).ga;
  vec2 s11 = texture2D(uZoneTex, b + vec2(px, px)).ga;
  return mix(mix(s00, s10, f.x), mix(s01, s11, f.x), f.y);
}
// ground under a tree canopy: leaf litter and dark soil with blotches of shaded foliage so that thinned
// distant planting still reads as a continuous dark-green mass from altitude
vec3 canopyFloor(vec2 wp, float n1, float n2) {
  vec3 litter = vec3(0.19, 0.15, 0.085);
  vec3 shade = vec3(0.085, 0.16, 0.06);
  vec3 c = mix(litter, shade, smoothstep(0.38, 0.66, n2 + 0.12 * n1));
  return c * (0.85 + 0.3 * n1);
}
// open ground of the tropical lowland: lawn, dry grass and bare sandy soil in broad patches
vec3 openGround(vec2 wp, float n1, float n2, float n3, float n4, float dryness) {
  vec3 lawn = vec3(0.19, 0.33, 0.11);
  vec3 dry = vec3(0.44, 0.40, 0.21);
  vec3 soil = vec3(0.52, 0.46, 0.34);
  vec3 c = mix(lawn, dry, smoothstep(0.3 - 0.35 * dryness, 0.75 - 0.35 * dryness, n4 + 0.25 * n2));
  c = mix(c, soil, smoothstep(0.62, 0.74, n3) * 0.7);
  return c * (0.88 + 0.24 * n1);
}
vec3 zoneAlbedo(int zone, vec2 wp, float h, float veg, float coast, float expo, out float rough) {
  float n1 = vnoise(wp * 0.35);
  float n2 = fbm3(wp * 0.045);
  float n3 = vnoise(wp * 0.008);
  float n4 = fbm3(wp * 0.0032 + 17.0);
  rough = 0.9;
  vec3 c;
  // sandy fringe where the land ramps up from a sandy shore (sheltered lake and canal banks stay grassy)
  float sandy = (1.0 - smoothstep(0.9, 1.75, h)) * smoothstep(0.06, 0.28, expo);
  float canopy = smoothstep(0.30, 0.82, veg);
  if (zone == 0 || zone == 1) {
    // seabed: sand with seagrass patches in the shallows, pale sand flats where it is very shallow
    vec3 sand = vec3(0.66, 0.60, 0.44);
    vec3 grass = vec3(0.16, 0.24, 0.13);
    float depth = -h;
    float sg = smoothstep(0.55, 0.75, fbm3(wp * 0.012 + 3.0)) * smoothstep(0.6, 1.6, depth) * (1.0 - smoothstep(5.0, 9.0, depth));
    c = mix(sand, grass, sg) * (0.9 + 0.2 * n2);
    c = mix(c, vec3(0.75, 0.69, 0.52) * (0.94 + 0.12 * n1), (1.0 - smoothstep(0.5, 1.4, depth)) * (1.0 - sg));
    c = mix(c, vec3(0.28, 0.32, 0.30), smoothstep(12.0, 30.0, depth));
  } else if (zone == 17) {
    // sand flats / bars: rippled pale sand, darker where it is still awash
    float ripple = 0.5 + 0.5 * sin(wp.x * 0.9 + wp.y * 0.35 + 3.0 * n2);
    c = vec3(0.75, 0.69, 0.52) * (0.9 + 0.14 * n2) * (0.96 + 0.06 * ripple);
    c = mix(c, vec3(0.48, 0.44, 0.34), 1.0 - smoothstep(-0.1, 0.25, h));
    rough = 0.8;
  } else if (zone == 2) {
    vec3 dry = vec3(0.68, 0.58, 0.40);
    vec3 wet = vec3(0.33, 0.27, 0.18);
    // the bands are keyed to height, so every threshold wanders with a slow along-shore noise: the wet
    // band, tide lines and dune toe come and go instead of ringing the island as contours
    float wander = fbm3(wp * 0.011 + 23.0) - 0.5;
    float wander2 = vnoise(wp * 0.03 + 41.0) - 0.5;
    // swash zone widens with wave exposure; a darker saturated band sits right at the waterline
    float swash = 0.35 + 0.45 * expo + 0.3 * wander;
    float wetness = 1.0 - smoothstep(0.18, swash + 0.35, h + 0.12 * wander2);
    c = mix(dry, wet, wetness) * (0.92 + 0.16 * n2) * (0.95 + 0.1 * n1);
    c = mix(c, vec3(0.26, 0.23, 0.19), (1.0 - smoothstep(0.05, 0.3, h)) * 0.6);
    // close range: wind ripples in the dry sand, trampled paths and footprints where people walk
    float dist = length(cameraPosition - vWorldPos);
    float closeF = 1.0 - smoothstep(60.0, 220.0, dist);
    if (closeF > 0.0) {
      float ripple = 0.5 + 0.5 * sin(dot(wp, vec2(0.83, 0.55)) * 5.5 + 2.5 * vnoise(wp * 0.6));
      float grain = vnoise(wp * 5.0);
      float path = smoothstep(0.86, 0.94, vnoise(wp * 0.07 + 7.0 + 0.6 * vec2(n2)));
      c *= 1.0 + closeF * (1.0 - wetness) * ((0.07 * ripple - 0.035) + 0.06 * (grain - 0.5) - 0.12 * path);
      c *= 1.0 - closeF * wetness * 0.08 * (grain - 0.5);
    }
    // tide marks: thin wrack lines that wander along the beach, strewn with weed and debris
    float tideH1 = swash + 0.12 + 0.06 * n2 + 0.1 * wander2;
    float tideH2 = swash + 0.28 + 0.05 * n1 + 0.08 * wander;
    float tide1 = 1.0 - smoothstep(0.0, 0.05, abs(h - tideH1));
    float tide2 = 1.0 - smoothstep(0.0, 0.03, abs(h - tideH2));
    float debris = smoothstep(0.55, 0.75, vnoise(wp * 1.3 + 9.0)) * step(0.35, vnoise(wp * 0.09));
    c *= 1.0 - 0.16 * tide1 * (0.5 + 0.5 * n1) - 0.08 * tide2;
    c = mix(c, vec3(0.30, 0.25, 0.14), (0.7 * tide1 + 0.4 * tide2) * debris);
    // sea oats and dune grass on the upper beach: khaki tussocks in patches, denser where the shore faces the sea
    float grassN = vnoise(wp * 0.05 + 4.0);
    float tuft = vnoise(wp * 0.9 + 2.0);
    float dune = smoothstep(0.95 + 0.2 * wander, 1.5, h) * smoothstep(0.5 - 0.15 * expo, 0.68, grassN) * (0.55 + 0.45 * smoothstep(0.35, 0.7, tuft));
    c = mix(c, vec3(0.42, 0.42, 0.20) * (0.8 + 0.4 * n1), dune * 0.8);
    // wet sand is dark and a little glossy (the sun glints off it), dry sand matte
    rough = mix(0.95, 0.42, wetness * wetness);
  } else if (zone == 3) {
    vec3 mud = vec3(0.28, 0.24, 0.16);
    vec3 shade = vec3(0.075, 0.15, 0.06);
    c = mix(mud, shade, smoothstep(0.3, 0.6, n2 + 0.15 * n1) * canopy) * (0.9 + 0.2 * n1);
    c = mix(c, vec3(0.2, 0.19, 0.15), 1.0 - smoothstep(0.1, 0.4, h));
    rough = 0.75;
  } else if (zone == 4 || zone == 10) {
    // parkland / generic forest floor, and airport grass
    float dryness = zone == 10 ? 0.5 : 0.25;
    c = openGround(wp, n1, n2, n3, n4, dryness);
    c = mix(c, canopyFloor(wp, n1, n2), canopy * (zone == 10 ? 0.5 : 0.9));
    c = mix(c, vec3(0.64, 0.57, 0.42) * (0.92 + 0.16 * n2), sandy);
  } else if (zone == 11) {
    c = mix(vec3(0.20, 0.44, 0.11), vec3(0.30, 0.52, 0.15), n2) * (0.92 + 0.16 * n1);
    // rough and tree lines between fairways
    c = mix(c, vec3(0.27, 0.36, 0.14), smoothstep(0.45, 0.6, n3));
    c = mix(c, canopyFloor(wp, n1, n2), canopy * 0.7 * smoothstep(0.5, 0.62, n3));
    // bunkers
    float bunker = smoothstep(0.66, 0.72, fbm3(wp * 0.02 + 9.0));
    c = mix(c, vec3(0.78, 0.72, 0.55), bunker);
    // fairway stripes
    c *= 1.0 + 0.05 * sin(wp.x * 0.35 + wp.y * 0.12);
  } else if (zone == 5) {
    // suburbs: lawns, dry yards and pale sandy lots, darkening under the street trees
    c = openGround(wp, n1, n2, n3, n4, 0.45);
    vec3 lot = vec3(0.54, 0.49, 0.41);
    c = mix(c, lot, smoothstep(0.55, 0.7, fbm3(wp * 0.03 + 5.0)) * 0.8);
    c = mix(c, canopyFloor(wp, n1, n2), canopy * 0.85);
    c = mix(c, vec3(0.64, 0.57, 0.42) * (0.92 + 0.16 * n2), sandy);
  } else if (zone == 19) {
    // sawgrass marsh: tan-green prairie, dark tree islands (hammocks) where the canopy is dense, brown pools
    vec3 saw = mix(vec3(0.50, 0.49, 0.25), vec3(0.36, 0.41, 0.17), smoothstep(0.35, 0.65, n2));
    c = saw * (0.9 + 0.2 * n1);
    c = mix(c, canopyFloor(wp, n1, n2), canopy);
    c = mix(c, vec3(0.16, 0.15, 0.10), 1.0 - smoothstep(-0.05, 0.2, h));
    rough = 0.85;
  } else if (zone == 6 || zone == 8) {
    c = mix(vec3(0.36, 0.35, 0.33), vec3(0.48, 0.46, 0.42), n2) * (0.92 + 0.16 * n1);
    c = mix(c, vec3(0.22, 0.34, 0.14), smoothstep(0.6, 0.75, fbm3(wp * 0.02 + 1.0)) * 0.7);
    rough = 0.8;
  } else if (zone == 7) {
    c = mix(vec3(0.24, 0.24, 0.24), vec3(0.38, 0.37, 0.35), n2) * (0.92 + 0.16 * n1);
    rough = 0.75;
  } else if (zone == 9) {
    c = mix(vec3(0.40, 0.39, 0.37), vec3(0.30, 0.28, 0.26), n2) * (0.9 + 0.2 * n1);
    c *= 1.0 - 0.25 * smoothstep(0.6, 0.8, fbm3(wp * 0.05 + 2.0));
    rough = 0.8;
  } else if (zone == 10) {
    c = mix(vec3(0.26, 0.40, 0.16), vec3(0.36, 0.42, 0.20), n2) * (0.92 + 0.16 * n1);
  } else if (zone == 13) {
    c = vec3(0.18, 0.18, 0.19) * (0.9 + 0.2 * n1);
    // parking bays
    float bay = step(0.93, fract(wp.x / 2.7)) * step(fract(wp.y / 11.0), 0.5);
    c = mix(c, vec3(0.75), bay * 0.8);
    rough = 0.7;
  } else if (zone == 14) {
    c = mix(vec3(0.48, 0.38, 0.27), vec3(0.6, 0.52, 0.4), n2) * (0.9 + 0.2 * n1);
  } else if (zone == 15) {
    c = vec3(0.45, 0.44, 0.42) * (0.92 + 0.16 * n1);
    rough = 0.7;
  } else if (zone == 12) {
    // rocky shore: dark wet limestone, barnacle-pale above the splash line
    c = mix(vec3(0.40, 0.37, 0.32), vec3(0.20, 0.19, 0.17), smoothstep(0.35, 0.7, n2 + 0.2 * n1)) * (0.8 + 0.4 * n1);
    c = mix(c, vec3(0.14, 0.14, 0.13), 1.0 - smoothstep(0.2, 0.7, h));
    rough = 0.7;
  } else if (zone == 18) {
    c = vec3(0.16, 0.16, 0.16) * (0.9 + 0.2 * n1);
    rough = 0.7;
  } else {
    c = vec3(0.3, 0.35, 0.2);
  }
  return c;
}
`,b2=`
{
  // jittered zone lookup hides the cell grid of the zone map
  float cellSize = uWorldSize / uMapN;
  vec2 jitter = (hash22(floor(vWorldPos.xz * 0.5)) - 0.5) * cellSize * 1.35;
  vec4 zs = zoneSample(vWorldPos.xz + jitter);
  int zone = int(zs.r * 255.0 + 0.5);
  vec2 smoothVE = zoneSmooth(vWorldPos.xz);
  float veg = smoothVE.x;
  float expo = smoothVE.y;
  float coast = (zs.b - 0.5) * 512.0;
  float rough;
  vec3 alb = zoneAlbedo(zone, vWorldPos.xz, vHeight, veg, coast, expo, rough);
  // wet band right at the waterline for every land zone (beaches shade their own swash zone)
  if (zone != 0 && zone != 1 && zone != 2 && zone != 17) {
    float wetBand = 1.0 - smoothstep(0.05, 0.45, vHeight);
    alb = mix(alb, alb * 0.62, wetBand);
    rough = mix(rough, 0.7, wetBand);
  }
  // beyond the authored map the ground continues as the same kind of country: the clamped zone
  // texture gives a flat colour, so stamp tree cover and roof/lot patches on it so the sprawl
  // reads as endless texture fading into the haze instead of ending at a straight line
  float beyond = smoothstep(uWorldSize * 0.5 - 350.0, uWorldSize * 0.5 + 250.0, max(abs(vWorldPos.x), abs(vWorldPos.z)));
  if (beyond > 0.0) {
    float n5 = fbm3(vWorldPos.xz * 0.02 + 11.0);
    float n6 = vnoise(vWorldPos.xz * 0.035 + 4.0);
    vec3 tree = vec3(0.09, 0.16, 0.06);
    vec3 farc = alb;
    if (zone != 19) farc = mix(farc, vec3(0.52, 0.49, 0.44), smoothstep(0.55, 0.62, n6) * 0.7);
    farc = mix(farc, tree, smoothstep(0.48, 0.6, n5) * 0.85);
    alb = mix(alb, farc, beyond);
  }
  diffuseColor.rgb *= alb;
  roughnessFactor = rough;
}
`;class S2{constructor(t){this.textures=t;const e=new ce({color:16777215,roughness:.9,metalness:0}),n={uHeightTex:{value:t.height},uZoneTex:{value:t.zone},uRingOffset:this.offsetUniform,uWorldSize:{value:Ro},uMapN:{value:he}},i=e.onBeforeCompile;e.onBeforeCompile=(o,r)=>{i?.(o,r),Object.assign(o.uniforms,n),o.vertexShader=o.vertexShader.replace("#include <common>",`#include <common>
${y2}`).replace("#include <beginnormal_vertex>",`${_2}
vec3 objectNormal = tnormal;
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif`).replace("#include <begin_vertex>","vec3 transformed = wp;"),o.fragmentShader=o.fragmentShader.replace("#include <common>",`#include <common>
${M2}`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
${b2}`)},e.customProgramCacheKey=()=>"terrain-v4",this.material=e;for(let o=0;o<bd;o++){const r=w2(o,o>0),a=new pe(r,e);a.frustumCulled=!1,a.receiveShadow=!0,a.castShadow=!1,a.matrixAutoUpdate=!1,this.rings.push(a),this.group.add(a)}}group=new Ye;material;rings=[];offsetUniform={value:new C};update(t,e){const n=Md*2,i=Math.round(t/n)*n,o=Math.round(e/n)*n;this.offsetUniform.value.set(i,0,o)}}const Ga=0,Sd=1,Dr=2,yi=4,hh=.6,E2=3,Tr=s=>1<<s,ks=(1<<yi)-1,Ta=[],_r={all:ks,mid:ks,near:ks},Mr=[];function T2(s){s.length,Ta.length=0,Mr.length=0;let t=0,e=0,n=0;for(let i=0;i<s.length;i++){const o=s[i];Ta.push(o.texel),Mr.push({near:o.near,far:o.far}),t|=1<<i,o.texel<E2&&(e|=1<<i),o.texel<hh&&(n|=1<<i)}_r.all=t,_r.mid=e,_r.near=n}function Vs(s,t,e=ks){const n=_r[s]&e;return t&&n===_r.all?Tr(Ga):(t?Tr(Sd):0)|n<<Dr}function Ir(s){return(s&Tr(Ga))!==0||s>>Dr!==0}function A2(s,t,e=!0){s.layers.mask=Vs(t,e)}function Ed(s){s.layers.set(Ga),s.layers.enable(Sd)}function C2(s){return Tr(Ga)|Tr(Dr+s)}function R2(s,t){const e=s.shadowMap,n=e.render.bind(e),i=[];e.render=(o,r,a)=>{if(!e.enabled||o.length===0||!e.autoUpdate&&!e.needsUpdate)return;const l=e.needsUpdate,h=a.layers.mask,c=s.info.render;pr.calls.length=pr.triangles.length=0;for(const d of o){const u=t(d);a.layers.mask=u>=0?C2(u):h,i[0]=d,e.needsUpdate=l,Hc=u<0||(Ta[u]??0)<hh;const p=c.calls,f=c.triangles;n(i,r,a),pr.calls.push(c.calls-p),pr.triangles.push(c.triangles-f)}Hc=!1,i.length=0,e.needsUpdate=!1,a.layers.mask=h}}let Hc=!1;const pr={calls:[],triangles:[]};function Td(s){return(Ta[s]??0)<hh}function P2(){return Hc}const er=new Ne,K0=new jt,ca=new jt;class Ad{viewFrustum=new Us;shadowFrustum=new Us;cascadeFrustums=[];cascadeCount=0;shadowDir=new C(1,0,0);spread=1;tmp=new C;update(t,e,n){ca.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this.viewFrustum.setFromProjectionMatrix(ca);const i=t.near,o=i*Math.tan(mn.DEG2RAD*.5*t.fov)/t.zoom,r=2*o,a=t.aspect*r,l=(c,d,u)=>{const p=d/i;K0.makePerspective(-a/2*p,a/2*p,o*p,(o-r)*p,d,Math.max(d+1,u),t.coordinateSystem),ca.multiplyMatrices(K0,t.matrixWorldInverse),c.setFromProjectionMatrix(ca)};l(this.shadowFrustum,i,e),this.cascadeCount=Math.min(Mr.length,yi);for(let c=0;c<this.cascadeCount;c++){const d=this.cascadeFrustums[c]??=new Us;l(d,Math.max(i,Mr[c].near),Math.min(e,Mr[c].far))}const h=Math.hypot(n.x,n.z);h>1e-5&&this.shadowDir.set(-n.x/h,0,-n.z/h),this.spread=Math.min(20,h/Math.max(n.y,.001))}boxInView(t){return this.viewFrustum.intersectsBox(t)}sphereInView(t,e){return er.set(t,e),this.viewFrustum.intersectsSphere(er)}casterInView(t,e,n){return this.sweep(t,e,n),this.shadowFrustum.intersectsSphere(er)}casterCascades(t,e,n){if(this.cascadeCount===0)return this.casterInView(t,e,n)?ks:0;this.sweep(t,e,n);let i=0;for(let o=0;o<this.cascadeCount;o++)this.cascadeFrustums[o].intersectsSphere(er)&&(i|=1<<o);return i}boxCasterCascades(t,e){const n=Math.max(0,e)*this.spread,i=this.shadowDir;if(Ss.copy(t),i.x>0?Ss.max.x+=i.x*n:Ss.min.x+=i.x*n,i.z>0?Ss.max.z+=i.z*n:Ss.min.z+=i.z*n,this.cascadeCount===0)return this.shadowFrustum.intersectsBox(Ss)?ks:0;let o=0;for(let r=0;r<this.cascadeCount;r++)this.cascadeFrustums[r].intersectsBox(Ss)&&(o|=1<<r);return o}sweep(t,e,n){const i=Math.max(0,n)*this.spread;this.tmp.copy(t).addScaledVector(this.shadowDir,i*.5),er.set(this.tmp,e+i*.5)}}const Ss=new Be;function Cd(){return{uReflTex:{value:null},uReflDepth:{value:null},uReflVP:{value:new jt},uReflParams:{value:new ze(0,1,1,0)},uReflTexel:{value:new Rt(1,1)},uReflTune:{value:new ze(.5,.6,.12,.3)}}}const ha=`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,L2=`
${Fo}
${jn}
${Pr}
${Lr}
${ch}
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform mat4 uInvProj; // inverse of the unclipped projection: the oblique row does not change the ray directions
uniform mat4 uInvView;
uniform vec3 uCamPos;  // mirror camera, below the surface
uniform float uLogDepthFC;
uniform float uCloudShadowStrength;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tColor, vUv);
  float depth = texture2D(tDepth, vUv).r;
  if (c.a <= 0.0 || depth >= 0.99999) { gl_FragColor = c; return; }
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 vdir4 = uInvProj * vec4(ndc, 1.0, 1.0);
  vec3 vdir = vdir4.xyz / vdir4.w;
  vdir /= -vdir.z;
  float w = exp2(depth * 2.0 / uLogDepthFC) - 1.0;
  vec3 q = (uInvView * vec4(vdir * w, 1.0)).xyz; // the mirrored object, in the real world
  // the mirror ray crosses the surface where the reflected ray leaves the water
  vec3 d = q - uCamPos;
  float t = clamp(-uCamPos.y / max(d.y, 1e-4), 0.0, 1.0);
  vec3 p = uCamPos + d * t;
  vec3 col = c.rgb;
  float cs = cloudShadow(q);
  float sunShare = 0.62 * smoothstep(-0.05, 0.2, uSunDir.y);
  col *= 1.0 - (1.0 - cs) * sunShare * uCloudShadowStrength;
  vec3 dv = q - p;
  float dist = length(dv);
  vec3 dir = dv / max(dist, 1e-3);
  float ext = exp(-opticalDepth(p.y, q.y, dist));
  vec3 skyHaze = skyRadiance(vec3(dir.x, max(dir.y, 0.0), dir.z));
  vec3 haze = mix(skyHaze, uHazeColor * 0.8, smoothstep(0.0, -0.35, dir.y));
  // premultiplied: the in-scattered haze only fills the covered fraction of the texel
  col = col * ext + haze * (1.0 - ext) * c.a;
  gl_FragColor = vec4(col, c.a);
}
`,D2=`
uniform sampler2D tSrc;
uniform float uLod;
uniform vec2 uTexel; // of the source level
varying vec2 vUv;
void main() {
  vec4 c = textureLod(tSrc, vUv, uLod) * 0.25;
  c += (textureLod(tSrc, vUv + vec2(uTexel.x, 0.0), uLod) + textureLod(tSrc, vUv - vec2(uTexel.x, 0.0), uLod)
      + textureLod(tSrc, vUv + vec2(0.0, uTexel.y), uLod) + textureLod(tSrc, vUv - vec2(0.0, uTexel.y), uLod)) * 0.125;
  c += (textureLod(tSrc, vUv + uTexel, uLod) + textureLod(tSrc, vUv - uTexel, uLod)
      + textureLod(tSrc, vUv + vec2(uTexel.x, -uTexel.y), uLod) + textureLod(tSrc, vUv - vec2(uTexel.x, -uTexel.y), uLod)) * 0.0625;
  gl_FragColor = c;
}
`,I2=`
uniform sampler2D tSrc;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(tSrc, vUv); }
`,z2=`
uniform sampler2D tColor;
uniform float uLod;
varying vec2 vUv;
void main() {
  vec4 c = textureLod(tColor, vUv, uLod);
  vec3 col = pow(max(c.rgb, 0.0), vec3(1.0 / 2.2)) + (1.0 - c.a) * vec3(0.35, 0.0, 0.35);
  gl_FragColor = vec4(col, 1.0);
}
`;function J0(s,t){const e=s,n=e.boundingSphere;if(n)nr.copy(n);else{const i=e.geometry;if(!i)return 1/0;i.boundingSphere||i.computeBoundingSphere(),nr.copy(i.boundingSphere)}return nr.applyMatrix4(s.matrixWorld),Math.max(0,nr.center.distanceTo(t.position)-nr.radius)}function N2(s){const t=s.geometry;return t?(t.boundingSphere||t.computeBoundingSphere(),t.boundingSphere.radius):0}function U2(s){const t=s.geometry;if(!t)return 0;const e=t.index?t.index.count:t.attributes.position?.count??0;return Math.floor(e/3)}const nr=new Ne;class F2{constructor(t,e,n,i){this.renderer=t,this.scale=n,this.range=i,Ed(this.camera);const o=new ka(1,1,wi);this.sceneRT=new vn(1,1,{type:In,depthTexture:o,depthBuffer:!0,minFilter:ye,magFilter:ye}),this.outRT=new vn(1,1,{type:In,depthBuffer:!1,generateMipmaps:!1,minFilter:Bi,magFilter:ye}),this.uniforms.uReflTex.value=this.outRT.texture,this.uniforms.uReflDepth.value=o,this.resolveMat=new Oe({vertexShader:ha,fragmentShader:L2,uniforms:{...e.uniforms,tColor:{value:this.sceneRT.texture},tDepth:{value:o},uInvProj:{value:this.baseProjInv},uInvView:{value:this.camera.matrixWorld},uCamPos:{value:this.camera.position},uLogDepthFC:{value:1},uCloudShadowStrength:{value:1}},depthTest:!1,depthWrite:!1}),this.downMat=new Oe({vertexShader:ha,fragmentShader:D2,uniforms:{tSrc:{value:this.outRT.texture},uLod:{value:0},uTexel:{value:new Rt}},depthTest:!1,depthWrite:!1}),this.copyMat=new Oe({vertexShader:ha,fragmentShader:I2,uniforms:{tSrc:{value:null}},depthTest:!1,depthWrite:!1}),this.quad=new pe(new _i(2,2),this.resolveMat),this.quad.frustumCulled=!1,this.quadScene.add(this.quad);const r=t.shadowMap,a=r.render;r.render=(l,h,c)=>{if(!this.inPass){a.call(r,l,h,c);return}for(let f=0;f<this.hidden.length;f++)this.hidden[f].visible=this.wasVisible[f];const d=t.info.render,u=d.calls,p=d.triangles;a.call(r,l,h,c),this.stats.shadowCalls=d.calls-u,this.stats.shadowTriangles=d.triangles-p;for(const f of this.hidden)f.visible=!1}}camera=new kn;uniforms=Cd();clipOffset=.15;enabled=!0;cloudShadowStrength=1;stats={calls:0,triangles:0,shadowCalls:0,shadowTriangles:0,width:1,height:1,hidden:0};sceneRT;outRT;levelRTs=[];levels=1;resolveMat;downMat;copyMat;quad;quadScene=new Co;quadCam=new No(-1,1,1,-1,0,1);excluded=[];filters=[];hidden=[];wasVisible=[];inPass=!1;baseProjInv=new jt;plane=new ls;clip=new ze;q=new ze;prevClear=new Vt;width=1;height=1;exclude(...t){for(const e of t)this.excluded.includes(e)||this.excluded.push(e)}excludeChildrenWhen(t,e){this.filters.push({root:t,skip:e})}setSize(t,e){const n=Math.max(2,Math.round(t*this.scale)),i=Math.max(2,Math.round(e*this.scale));if(n===this.width&&i===this.height)return;this.width=n,this.height=i,this.sceneRT.setSize(n,i),this.outRT.setSize(n,i);const o=Math.floor(Math.log2(Math.max(n,i)))+1;for(this.outRT.texture.mipmaps=Array.from({length:o},()=>({})),this.levels=1;this.levels<o&&Math.min(n>>this.levels,i>>this.levels)>=4;)this.levels++;for(let r=1;r<this.levels;r++)(this.levelRTs[r]??=new vn(1,1,{type:In,depthBuffer:!1,minFilter:ye,magFilter:ye})).setSize(n>>r,i>>r);this.uniforms.uReflTexel.value.set(1/n,1/i),this.stats.width=n,this.stats.height=i}setupCamera(t){const e=this.camera,n=t.matrixWorld.elements,i=n[12],o=n[13],r=n[14],a=-n[8],l=-n[9],h=-n[10];e.position.set(i,-o,r),e.up.set(n[4],-n[5],n[6]),e.lookAt(i+a,-(o+l),r+h),e.fov=t.fov,e.aspect=t.aspect,e.near=t.near,e.far=t.far,e.zoom=t.zoom,e.updateProjectionMatrix(),this.baseProjInv.copy(e.projectionMatrixInverse),e.updateMatrixWorld(!0),this.plane.set(k2,this.clipOffset),this.plane.applyMatrix4(e.matrixWorldInverse);const c=this.clip.set(this.plane.normal.x,this.plane.normal.y,this.plane.normal.z,this.plane.constant),d=e.projectionMatrix.elements,u=this.q;u.x=(Math.sign(c.x)+d[8])/d[0],u.y=(Math.sign(c.y)+d[9])/d[5],u.z=-1,u.w=(1+d[10])/d[14],c.multiplyScalar(2/c.dot(u)),d[2]=c.x,d[6]=c.y,d[10]=c.z+1,d[14]=c.w,e.projectionMatrixInverse.copy(e.projectionMatrix).invert(),this.uniforms.uReflVP.value.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse)}render(t,e){const n=this.uniforms.uReflParams.value;if(!this.enabled||this.scale<=0||e.matrixWorld.elements[13]<.3){n.x=0,this.stats.calls=this.stats.triangles=this.stats.shadowCalls=this.stats.shadowTriangles=0;return}const i=this.renderer;this.setupCamera(e);const o=this.camera,r=2/(Math.log(o.far+1)/Math.LN2);n.set(1,r,this.height*.5/Math.tan(mn.DEG2RAD*.5*o.fov),this.levels-1);const a=i.info.render,l=a.calls,h=a.triangles;this.stats.shadowCalls=this.stats.shadowTriangles=0;const c=this.hidden;c.length=0;for(const f of this.excluded)c.push(f);for(const f of this.filters)for(const v of f.root.children)v.visible&&f.skip(v,e)&&c.push(v);this.wasVisible.length=c.length;for(let f=0;f<c.length;f++)this.wasVisible[f]=c[f].visible,c[f].visible=!1;const d=i.getRenderTarget();i.getClearColor(this.prevClear);const u=i.getClearAlpha();i.setClearColor(0,0),i.setRenderTarget(this.sceneRT),this.inPass=!0,i.render(t,o),this.inPass=!1,i.setClearColor(this.prevClear,u);for(let f=0;f<c.length;f++)c[f].visible=this.wasVisible[f];this.stats.hidden=c.length;const p=this.resolveMat.uniforms;p.uLogDepthFC.value=r,p.uCloudShadowStrength.value=this.cloudShadowStrength,this.quad.material=this.resolveMat,this.outRT.viewport.set(0,0,this.width,this.height),i.setRenderTarget(this.outRT),i.render(this.quadScene,this.quadCam);for(let f=1;f<this.levels;f++){const v=this.width>>f,m=this.height>>f;this.quad.material=this.downMat,this.downMat.uniforms.uLod.value=f-1,this.downMat.uniforms.uTexel.value.set(1/(this.width>>f-1),1/(this.height>>f-1)),i.setRenderTarget(this.levelRTs[f]),i.render(this.quadScene,this.quadCam),this.quad.material=this.copyMat,this.copyMat.uniforms.tSrc.value=this.levelRTs[f].texture,this.outRT.viewport.set(0,0,v,m),i.setRenderTarget(this.outRT,0,f),i.render(this.quadScene,this.quadCam)}this.outRT.viewport.set(0,0,this.width,this.height),this.quad.material=this.resolveMat,i.setRenderTarget(d),this.stats.calls=a.calls-l-this.stats.shadowCalls,this.stats.triangles=a.triangles-h-this.stats.shadowTriangles}debugLod=0;debugBlit(){this.debugMat||(this.debugMat=new Oe({vertexShader:ha,fragmentShader:z2,uniforms:{tColor:{value:this.outRT.texture},uLod:{value:0}},depthTest:!1,depthWrite:!1})),this.debugMat.uniforms.uLod.value=this.debugLod;const t=this.quad.material;this.quad.material=this.debugMat,this.renderer.setRenderTarget(null),this.renderer.render(this.quadScene,this.quadCam),this.quad.material=t}debugMat=null}const k2=new C(0,1,0),O2=0,B2=`
uniform vec3 uWaterOffset;
varying vec3 vWorldPos;
`,H2=`
vec3 wp = position + uWaterOffset;
wp.y = 0.0;
vWorldPos = wp;
`,G2=`
uniform sampler2D uHeightTex;
uniform sampler2D uZoneTex; // r: zone id, g: vegetation, b: 128 + 0.5 * signed distance to the coastline (m)
uniform sampler2D uWakeTex;
uniform vec4 uWakeRegion; // center.xy, size, unused
uniform float uWorldSize;
uniform float uWaveTime;
uniform float uWindSpeed;
uniform vec2 uWindDir;
uniform vec3 uSunDirW;
uniform sampler2D uReflTex;   // premultiplied mirror image of the scene (alpha 0 where only sky would be seen)
uniform sampler2D uReflDepth; // its logarithmic depth
uniform mat4 uReflVP;
uniform vec4 uReflParams;     // x: active, y: log-depth constant, z: focal length (texels), w: top mip level
uniform vec2 uReflTexel;
uniform vec4 uReflTune;       // x: streak scale, y: perturbation scale, z/w: streak (fraction of the height) fading the image out
varying vec3 vWorldPos;
${jn}
float terrainHeightW(vec2 wp) {
  vec2 uv = (wp + vec2(uWorldSize * 0.5)) / uWorldSize;
  return texture2D(uHeightTex, uv).r;
}
float fbm2o(vec2 p) {
  return 0.667 * vnoise(p) + 0.333 * vnoise(mat2(1.6, 1.2, -1.2, 1.6) * p + 5.2);
}
// value noise with analytic derivatives (value, d/dx, d/dy)
vec3 noised(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  float a = hash12(i), b = hash12(i + vec2(1.0, 0.0)), c = hash12(i + vec2(0.0, 1.0)), d = hash12(i + vec2(1.0, 1.0));
  float k0 = a, k1 = b - a, k2 = c - a, k3 = a - b - c + d;
  return vec3(k0 + k1 * u.x + k2 * u.y + k3 * u.x * u.y, du * vec2(k1 + k3 * u.y, k2 + k3 * u.x));
}
vec2 rot2(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
// Slope (world xz) of one advected, wind-aligned noise layer. L: across-wind feature size (m), the
// along-wind size is L / stretch (wind waves are short along the wind and long across it). The pattern
// drifts downwind (toward -wd) at 'speed' m/s. 'amp' is the slope amplitude.
vec2 chopSlope(vec2 p, vec2 wd, float L, float stretch, float speed, float t, float seed, float amp, out float val) {
  vec2 wc = vec2(-wd.y, wd.x);
  vec2 q = vec2((dot(p, wd) + speed * t) * stretch / L + seed, dot(p, wc) / L + seed * 1.73);
  vec3 n = noised(q);
  val = n.x;
  return amp * (n.y * stretch * wd + n.z * wc);
}
// Slope of a deep-water swell component travelling toward -dir with sharpened crests.
vec2 swellSlope(vec2 p, vec2 dir, float L, float A, float t, float phase) {
  float k = 6.2831853 / L;
  float w = sqrt(9.81 * k);
  float ph = k * dot(p, dir) + w * t + phase;
  float s = sin(ph), c = cos(ph);
  return dir * (A * k * 0.7 * c * (1.0 + s));
}
float smithBeckmann(float cosT, float alpha) {
  float tanT = sqrt(max(1.0 - cosT * cosT, 0.0)) / max(cosT, 1e-4);
  float a = 1.0 / max(alpha * tanT, 1e-4);
  return a >= 1.6 ? 1.0 : (3.535 * a + 2.181 * a * a) / (1.0 + 2.276 * a + 2.577 * a * a);
}
// Anisotropic Gaussian slope density (Cox-Munk style) of facets around the resolved normal, evaluated at
// slope offset 'sh' with total variance 'mss'; elongated along the view azimuth (stretch 'st') so the
// highlight forms a streak toward the sun. Integrates to 1 over slope space.
float slopePdf(vec2 sh, vec2 va, float st, float mss) {
  float along = dot(sh, va), across = dot(sh, vec2(-va.y, va.x));
  return exp(-(along * along / (mss * st) + across * across * st / mss)) / (PI * mss);
}
// Measured sea-slope distributions are peaked (positive kurtosis): a narrow core over a wider skirt of the
// same total variance, which gives glints a sharp centre with a soft halo and the sun path a tighter core.
float slopePdfPeaked(vec2 sh, vec2 va, float st, float mss) {
  return 0.75 * slopePdf(sh, va, st, mss * 0.7) + 0.25 * slopePdf(sh, va, st, mss * 1.9);
}
// Sun glitter as a resolvable sparkle field. The unresolved slope variance is carried by a world-anchored
// random slope field of nine octaves (0.7 m to 180 m cells, of which a pixel evaluates the five starting
// at the finest whose cell spans a few pixels; the variance of the octaves too fine for the current
// footprint is handed to the finest resolvable one), plus a residual lobe (13 %) for the facets no octave
// resolves. Wherever
// the field's slope hits the specular slope a glint lights up: dense in the centre of the path, sparse at
// its edges, of a few pixels at any distance. The expectation over the field equals the analytic
// distribution with the full variance, so the glitter energy does not depend on the distance; the field
// evolves as a slow Gaussian process in time and drifts with the wind, so glints wax and wane rather than
// flicker, and camera motion only moves them with the water they sit on.
// Glitter is seen looking toward the light at a grazing angle close to its elevation, which foreshortens
// the water along the light's azimuth; the cells are stretched along that (world-fixed) azimuth by the
// same factor so a glint stays a few pixels in both screen directions instead of a wide horizontal blob.
// dx, dy: world-space extent of the pixel (screen derivatives of the surface position).
float sunGlitter(vec3 N, vec3 V, vec3 L, float mss, vec2 wp, vec2 dx, vec2 dy, float t) {
  float NdotL = dot(N, L);
  float NdotV = dot(N, V);
  if (NdotL <= 0.002 || NdotV <= 0.002) return 0.0;
  vec3 H = normalize(L + V);
  float NdotH = max(dot(N, H), 1e-3);
  vec2 sh = -H.xz / max(H.y, 0.05) + N.xz / max(N.y, 0.05);
  vec2 va = V.xz;
  float vl = length(va);
  va = vl > 1e-4 ? va / vl : vec2(1.0, 0.0);
  vec2 vc = vec2(-va.y, va.x);
  float st = 1.0 + 0.3 * (1.0 - clamp(V.y, 0.0, 1.0));
  float P;
  // the field is only evaluated where the highlight (widened to catch the field's tails) is visible
  if (slopePdf(sh, va, st, mss * 4.0) * mss > 1e-4) {
    vec2 sa = L.xz;
    float sl = length(sa);
    sa = sl > 1e-3 ? sa / sl : va;
    vec2 sc = vec2(-sa.y, sa.x);
    // half the foreshortening at the path's centre: dashes out there, round glints on the steeper near path
    float stretch = sqrt(clamp(1.0 / max(L.y, 0.12), 1.0, 8.0));
    // pixel footprint along / across the light's azimuth, in the stretched metric of the cells
    float footEff = max((abs(dot(dx, sa)) + abs(dot(dy, sa))) / stretch, abs(dot(dx, sc)) + abs(dot(dy, sc)));
    vec2 s = vec2(0.0);   // slope offset of the resolved facets
    float resolved = 0.0; // fraction of the variance they carry
    vec2 gp = wp + uWindDir * (0.9 * t);
    vec2 gq = vec2(dot(gp, sa) / stretch, dot(gp, sc));
    // nine octaves of 0.7 m * 2^o with variance shares 0.272 * 0.7^o (87 % in all); a pixel evaluates the five
    // starting at the finest octave whose cell spans more than 3 px. That one fades in until its cell spans
    // 6 px ('u'), the coarsest of the five fades out over the same stretch, so the window slides seamlessly;
    // the shares of the octaves finer than the window ride on its finest member, those coarser on its
    // fourth, so the field's variance (and the 13 % residual lobe) never depends on the distance.
    float oF = log2(max(footEff / 0.7, 1e-4)) + 1.585;
    int o0 = int(floor(oF)) + 1;
    float u = float(o0) - oF;
    if (o0 < 0) { o0 = 0; u = 1.0; }
    float w0 = smoothstep(0.0, 1.0, u), w4 = 1.0 - w0;
    float sh0 = 0.272 * pow(0.7, float(o0));
    float carry = 0.272 * (1.0 - pow(0.7, float(o0))) / 0.3;
    float extra3 = max(0.272 * (pow(0.7, float(o0 + 5)) - pow(0.7, 9.0)) / 0.3, 0.0) + (o0 + 4 <= 8 ? sh0 * 0.2401 * (1.0 - w4 * w4) : 0.0);
    for (int i = 0; i < 5; i++) {
      int o = o0 + i;
      if (o > 8) break;
      float fo = float(o);
      float cell = 0.7 * exp2(fo);
      float f = sh0 * pow(0.7, float(i)) + carry + (i == 3 ? extra3 : 0.0);
      float w = i == 0 ? w0 : (i == 4 ? w4 : 1.0);
      carry = i == 0 ? f * (1.0 - w * w) : 0.0;
      if (w < 0.003) continue;
      vec2 q = gq / cell;
      // two independent value-noise vectors (0.214 rms per component) rotated by a slow phase: a unit-variance
      // Gaussian-like process whose rate follows the wave period of the cell size
      float ph = 1.6 * t * inversesqrt(cell) + 0.7 * fo;
      vec2 n1 = vec2(vnoise(q + 3.1 + 17.0 * fo), vnoise(q * 1.07 + 9.7 + 17.0 * fo)) - 0.5;
      vec2 n2 = vec2(vnoise(q * 0.93 + 5.3 + 17.0 * fo), vnoise(q * 1.11 + 12.9 + 17.0 * fo)) - 0.5;
      vec2 n = (n1 * cos(ph) + n2 * sin(ph)) * 4.67;
      s += (sqrt(0.5 * mss * f) * w) * n;
      resolved += f * w * w;
    }
    // the facets share the anisotropy of the analytic distribution
    s = va * (dot(s, va) * sqrt(st)) + vc * (dot(s, vc) * inversesqrt(st));
    P = slopePdfPeaked(sh - s, va, st, mss * (1.0 - resolved));
  } else {
    P = slopePdfPeaked(sh, va, st, mss);
  }
  float D = P / (NdotH * NdotH * NdotH * NdotH);
  float alpha = sqrt(mss);
  float G = smithBeckmann(NdotV, alpha) * smithBeckmann(NdotL, alpha);
  float LdotH = clamp(dot(L, H), 0.0, 1.0);
  float F = 0.02 + 0.98 * pow(1.0 - LdotH, 5.0);
  return D * F * G / (4.0 * NdotV);
}
// Mirror image of the scene along the reflected ray (render/reflection.ts). P: surface point, V: view
// vector, N: wave normal, mss: unresolved slope variance, dist: camera distance. Returns premultiplied
// colour and coverage; coverage 0 where the reflected ray only sees sky (the caller keeps its sky there).
vec4 sceneReflection(vec3 P, vec3 V, vec3 N, float mss, float dist) {
  vec4 rc = uReflVP * vec4(P, 1.0);
  if (rc.w <= 0.0) return vec4(0.0);
  float wp = rc.w; // depth of P for the mirror camera (equals its depth for the real camera)
  vec2 uv0 = rc.xy / wp * 0.5 + 0.5;
  vec2 lim = uReflTexel * 0.5;
  // The flat mirror sees an object along this ray at depth wq. The real reflected ray leaves P tilted by
  // the wave slope and travels about the same path length L, so its hit point is displaced by (R - R0) L:
  // that is the mirror image displaced by the same vector (clip-space displacement per metre: dclip).
  vec3 R = reflect(-V, N);
  R.y = max(R.y, 0.02);
  vec3 R0 = vec3(-V.x, V.y, -V.z);
  vec4 dclip = uReflVP * vec4((R - R0) * uReflTune.y, 0.0);
  float k = dist / wp; // metres along the ray per unit of depth
  float dq = texture2D(uReflDepth, clamp(uv0, lim, 1.0 - lim)).r;
  float wq = dq < 0.99999 ? exp2(dq * 2.0 / uReflParams.y) - 1.0 : wp * 8.0; // sky: assume a distant object
  float L = max(wq - wp, 0.0) * k;
  vec4 rc1 = rc * (wq / wp) + dclip * L;
  vec2 uv1 = rc1.xy / max(rc1.w, 1e-3) * 0.5 + 0.5;
  // re-project once with the depth found at the displaced lookup, so a ray that hits a nearer object (or
  // misses the one the flat mirror saw) uses that path length instead
  dq = texture2D(uReflDepth, clamp(uv1, lim, 1.0 - lim)).r;
  wq = dq < 0.99999 ? exp2(dq * 2.0 / uReflParams.y) - 1.0 : wp * 8.0;
  L = max(wq - wp, 0.0) * k;
  rc1 = rc * (wq / wp) + dclip * L;
  vec2 uv = rc1.xy / max(rc1.w, 1e-3) * 0.5 + 0.5;
  uv = uv0 + clamp(uv - uv0, vec2(-0.08), vec2(0.08));
  // The unresolved facets tilt the reflected rays by twice their slope (rms sqrt(mss / 2) per axis). A tilt in
  // the view plane changes the ray's elevation fully, a sideways tilt turns it by only sin(grazing angle), so
  // the image of a point at share L / D of the mirror distance is smeared into a vertical streak (the glitter-
  // path ellipse): rms 2 sigma share in elevation and that times |V.y| across. uReflTune.x scales the streak.
  float share = clamp(1.0 - wp / max(wq, wp), 0.0, 1.0);
  float streak = uReflTune.x * sqrt(mss) * share * uReflParams.z; // texels along the image's vertical
  float across = streak * clamp(abs(V.y), 0.1, 1.0);
  // the cross-streak blur comes from the mip chain, the streak from five taps along it (mip level raised so
  // the taps overlap; the cross blur is then at most 0.4 of the streak)
  float lod = clamp(log2(max(max(across, 0.375 * streak), 1.0)), 0.0, uReflParams.w);
  // a streak longer than a good part of the image carries no more information than the environment map
  float clarity = 1.0 - smoothstep(uReflTune.z, uReflTune.w, streak * uReflTexel.y);
  float edge = smoothstep(0.0, 0.015, uv.x) * smoothstep(0.0, 0.015, 1.0 - uv.x) * smoothstep(0.0, 0.015, uv.y) * smoothstep(0.0, 0.015, 1.0 - uv.y);
  vec2 dv = vec2(0.0, 0.75 * streak * uReflTexel.y);
  vec4 c = textureLod(uReflTex, uv, lod) * 0.316
         + (textureLod(uReflTex, uv + dv, lod) + textureLod(uReflTex, uv - dv, lod)) * 0.239
         + (textureLod(uReflTex, uv + 2.0 * dv, lod) + textureLod(uReflTex, uv - 2.0 * dv, lod)) * 0.103;
  return c * (clarity * edge);
}
`,V2=`
vec3 wN; vec3 wV; float wFoam; float wMss; vec3 wBodyR; vec2 wDx; vec2 wDy; vec3 wDbg; float wDist;
{
  vec2 wp = vWorldPos.xz;
  vec2 dxw = dFdx(wp), dyw = dFdy(wp);
  float foot = length(abs(dxw) + abs(dyw)); // metres of water per pixel
  float terrainH = terrainHeightW(wp);
  float depth = -terrainH;
  if (depth < -0.05) discard;
  depth = max(depth, 0.0);
  vec3 toCam = cameraPosition - vWorldPos;
  float dist = length(toCam);
  vec3 V = toCam / max(dist, 1e-3);
  float t = uWaveTime;
  vec2 wd = uWindDir; // waves arrive from +wd (open ocean side) and travel toward -wd
  float wind = clamp(uWindSpeed / 6.0, 0.35, 1.8);

  // ---- shelter: land upwind kills chop; swell needs kilometres of open fetch and deep water
  float o1 = 1.0 - smoothstep(-2.5, 0.2, terrainHeightW(wp + wd * 90.0));
  float o2 = 1.0 - smoothstep(-2.5, 0.2, terrainHeightW(wp + wd * 240.0));
  float o3 = 1.0 - smoothstep(-2.5, 0.2, terrainHeightW(wp + wd * 520.0));
  float open = (o1 + o2 + o3) * 0.3333;
  float shallowF = smoothstep(0.0, 1.2, depth);
  float chopF = mix(0.2, 1.0, open) * shallowF;
  // short wind waves regenerate within a hundred metres of fetch: only the nearest upwind shore calms them
  float rippleF = mix(0.3, 1.0, 0.6 * o1 + 0.4 * open) * smoothstep(0.0, 0.5, depth);
  float s4 = 1.0 - smoothstep(-4.0, 0.5, terrainHeightW(wp + wd * 1100.0));
  float s5 = 1.0 - smoothstep(-4.0, 0.5, terrainHeightW(wp + wd * 2400.0));
  float swellF = min(open, min(s4, s5)) * smoothstep(4.0, 9.0, depth);

  // ---- wave field: every layer fades out when its wavelength approaches the pixel footprint; the
  //      slope variance that is filtered away goes into the microfacet roughness instead
  vec2 g = vec2(0.0);
  float mss = 0.0;
  float val0 = 0.5, val1 = 0.5, val2 = 0.5, val3 = 0.5;
  float wSw = 1.0 - smoothstep(4.0, 22.0, foot);
  if (swellF > 0.001 && wSw > 0.001) {
    vec2 gs = swellSlope(wp, rot2(wd, -0.22), 76.0, 0.55, t, 0.0)
            + swellSlope(wp, rot2(wd, 0.10), 54.0, 0.40, t, 2.1)
            + swellSlope(wp, rot2(wd, 0.36), 41.0, 0.27, t, 4.4);
    g += gs * swellF * wSw;
  }
  mss += 0.0035 * swellF * (1.0 - wSw * wSw);
  float w0 = 1.0 - smoothstep(2.8, 6.0, foot);
  float a0 = 0.035 * wind * chopF;
  if (w0 > 0.001) g += chopSlope(wp, rot2(wd, 0.15), 14.0, 2.0, 4.5, t, 1.3, a0, val0) * w0;
  mss += a0 * a0 * (1.0 - w0 * w0);
  // wind sea: short-crested directional waves whose height follows the wave groups of the layer above
  float wWs = 1.0 - smoothstep(1.1, 2.6, foot);
  if (wWs > 0.001 && chopF > 0.001) {
    float grp = (0.55 + 0.9 * val0) * chopF * wind;
    vec2 gw = swellSlope(wp, rot2(wd, -0.30), 11.0, 0.050, t, 1.0)
            + swellSlope(wp, rot2(wd, 0.18), 7.5, 0.045, t, 3.3)
            + swellSlope(wp, rot2(wd, 0.02), 5.5, 0.028, t, 5.9);
    g += gw * grp * wWs;
  }
  mss += 0.0015 * chopF * wind * (1.0 - wWs * wWs);
  float w1 = 1.0 - smoothstep(1.0, 2.2, foot);
  float a1 = 0.12 * wind * mix(chopF, rippleF, 0.4);
  if (w1 > 0.001) g += chopSlope(wp, rot2(wd, -0.2), 5.0, 1.8, 2.7, t, 3.7, a1, val1) * w1;
  mss += a1 * a1 * (1.0 - w1 * w1);
  // short crested ripples of the local wind sea, bunched by the groups of the layer above
  float w2 = 1.0 - smoothstep(0.35, 0.75, foot);
  float a2 = 0.14 * wind * rippleF;
  if (w2 > 0.001) {
    g += chopSlope(wp, rot2(wd, 0.3), 1.7, 1.4, 1.6, t, 7.1, a2, val2) * w2;
    float grp2 = (0.5 + 1.0 * val1) * rippleF * wind * w2;
    g += (swellSlope(wp, rot2(wd, -0.35), 3.4, 0.022, t, 2.7) + swellSlope(wp, rot2(wd, 0.25), 2.2, 0.013, t, 8.1)) * grp2;
  }
  mss += (a2 * a2 + 0.0012 * rippleF * wind) * (1.0 - w2 * w2);
  float w3 = 1.0 - smoothstep(0.1, 0.22, foot);
  float a3 = 0.12 * wind * rippleF;
  if (w3 > 0.001) g += chopSlope(wp, rot2(wd, -0.05), 0.5, 1.2, 0.9, t, 11.3, a3, val3) * w3;
  mss += a3 * a3 * (1.0 - w3 * w3);
  // capillary ripples are never resolved
  mss += 0.002 + 0.003 * wind * mix(0.3, 1.0, open);

  // ---- wakes: r = foam, gb = normal perturbation, a = coverage
  // the wake map is rendered top-down with screen-up = north (-Z), so v grows toward -Z
  vec2 wuv = vec2(wp.x - uWakeRegion.x, uWakeRegion.y - wp.y) / uWakeRegion.z + 0.5;
  vec4 wake = vec4(0.0);
  if (all(greaterThan(wuv, vec2(0.0))) && all(lessThan(wuv, vec2(1.0)))) wake = texture2D(uWakeTex, wuv);
  g += (wake.gb - 0.5) * 2.0 * wake.a * 0.4;
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));

  // ---- body colour: two-flow shallow-water reflectance, the bed seen through the column plus the
  //      column's own back-scatter, along the refracted sun path down and the refracted view path up
  float cosV = clamp(dot(N, V), 0.0, 1.0);
  float sin2r = (1.0 - cosV * cosV) / 1.77;
  float cosR = sqrt(max(1.0 - sin2r, 0.0));
  float sunUp = clamp(uSunDirW.y, 0.12, 1.0);
  float cosSunR = sqrt(1.0 - (1.0 - sunUp * sunUp) / 1.77);
  float path = depth * (1.0 / cosSunR + 1.0 / max(cosR, 0.2));
  // clear tropical shelf water: red is gone within a metre, green within a few, blue reaches the deep bed
  vec3 K = vec3(0.9, 0.23, 0.18);
  vec3 T = exp(-K * path);
  vec3 refr = refract(-V, N, 0.75);
  vec2 bedP = wp + refr.xz / max(-refr.y, 0.25) * depth;
  float grainFade = 1.0 - smoothstep(3.0, 10.0, foot);
  float grain = mix(0.5, fbm2o(bedP * 0.045), grainFade);
  // sand ripples and burrow mounds resolve in the near field (landing, taxiing)
  float rippleFade = 1.0 - smoothstep(0.25, 1.0, foot);
  float sandRipple = rippleFade > 0.001 ? mix(0.5, vnoise(vec2(dot(bedP, wd) * 1.4 + 2.0 * vnoise(bedP * 0.2), dot(bedP, vec2(-wd.y, wd.x)) * 0.35)), rippleFade) : 0.5;
  // bed albedo is physical (neutral sun+sky irradiance since the lighting rebalance): coral sand
  vec3 sand = vec3(0.52, 0.49, 0.42) * (0.86 + 0.24 * grain + 0.14 * (sandRipple - 0.5));
  float sgN = fbm3(bedP * 0.012 + 3.0);
  float sg = smoothstep(0.54, 0.68, sgN + 0.12 * (grain - 0.5)) * smoothstep(0.5, 1.6, depth) * (1.0 - smoothstep(5.0, 9.0, depth));
  vec3 bed = mix(sand, vec3(0.07, 0.11, 0.05), sg);
  // wet sand at the waterline (mirrors the terrain's wet band above it)
  bed *= mix(0.72, 1.0, smoothstep(0.0, 0.45, depth));
  // wave focusing: shallow bed brightness follows the crests of the short waves (cheap caustics)
  float caustic = ((val1 - 0.5) * w1 * 0.5 + (val2 - 0.5) * w2 * 0.45 + (val3 - 0.5) * w3 * 0.35) * rippleF;
  bed *= 1.0 + caustic * (1.0 - smoothstep(1.5, 5.0, depth)) * smoothstep(0.05, 0.3, depth);
  // deep-water reflectance under neutral irradiance: blue-teal bay water carrying some suspended matter,
  // clearer and bluer ocean beyond the shelf (a few percent, peaking in the blue)
  vec3 Rinf = mix(vec3(0.038, 0.094, 0.168), vec3(0.013, 0.048, 0.128), smoothstep(8.0, 22.0, depth));
  vec3 R = bed * T + Rinf * (1.0 - T);
  // suspended sediment: milky, pale turquoise over the flats and along the shore
  float milkN = fbm2o(wp * 0.004 + 9.0);
  float milk = (1.0 - smoothstep(0.3, 3.5, depth)) * (0.3 + 0.7 * smoothstep(0.35, 0.8, milkN));
  R += vec3(0.045, 0.075, 0.105) * milk * (1.0 - exp(-path * 0.9));

  // ---- foam: shore wash driven by exposure to the incoming waves, surf lines, whitecaps, wakes
  float foam = 0.0;
  if (depth < 4.0) {
    vec4 zs = texture2D(uZoneTex, (wp + vec2(uWorldSize * 0.5)) / uWorldSize);
    // only a real coastline makes wash and surf; submerged sandbars and flats stay foam-free
    float coastD = (zs.b * 255.0 - 128.0) * 2.0;
    float coastGate = 1.0 - smoothstep(150.0, 230.0, coastD);
    float e = 12.0;
    float hx = terrainHeightW(wp + vec2(e, 0.0)) - terrainHeightW(wp - vec2(e, 0.0));
    float hz = terrainHeightW(wp + vec2(0.0, e)) - terrainHeightW(wp - vec2(0.0, e));
    vec2 gd = vec2(-hx, -hz) / (2.0 * e); // gradient of depth: points offshore
    float slope = length(gd);
    vec2 off = gd / max(slope, 1e-4);
    vec2 alongShore = vec2(-off.y, off.x);
    float shoreDist = min(depth / max(slope, 0.003), 300.0); // metres to the waterline along the bed
    // only a real waterline breaks waves: the bed must actually reach land where the slope says it does,
    // otherwise shallow humps (sandbars, patch reefs) drew concentric foam rings around themselves
    float landAhead = smoothstep(-0.15, 0.12, terrainHeightW(wp - off * (shoreDist + 6.0)));
    coastGate *= landAhead;
    // wave exposure of this shore: the map's fetch-based exposure (zone alpha) times the wind-facing factor
    float exposure = zs.a * (0.3 + 0.7 * (0.5 + 0.5 * dot(off, wd))) * mix(0.5, 1.0, open);
    float fineFade = 1.0 - smoothstep(2.0, 6.0, foot);
    float pa = vnoise(wp * 0.03 + vec2(t * 0.03, -t * 0.02));
    float patches = mix(pa, 0.5 * (pa + vnoise(wp * 0.09 + 7.0 - t * 0.05)), fineFade);
    float streaks = mix(0.5, vnoise(vec2(dot(wp, off) * 0.45 - t * 0.35, dot(wp, alongShore) * 0.05 + 3.0)), 1.0 - smoothstep(0.5, 2.0, foot));
    // swash: a few metres of broken wash at the waterline, wider and denser on exposed beaches
    float swashW = 4.0 + 12.0 * exposure + 3.0 * sin(t * 0.9 + dot(wp, alongShore) * 0.02 + patches * 4.0);
    float wash = 1.0 - smoothstep(swashW * 0.3, swashW, shoreDist);
    // the broken pattern is thresholded up close; from altitude its coverage is what reads, so the
    // threshold softens with the footprint into a continuous line of the same mean whiteness
    float thr = 0.72 - 0.42 * exposure;
    float soft = mix(0.2, 0.6, smoothstep(1.0, 4.0, foot));
    float shore = wash * coastGate * smoothstep(thr - soft * 0.5, thr + soft * 0.5, 0.55 * patches + 0.45 * streaks) * smoothstep(0.08, 0.3, exposure);
    // surf: wind waves break in knee-deep water on exposed shores as broken lines running shoreward
    float crest = sin(shoreDist * 0.3 - t * 1.2 + patches * 3.0);
    float surf = smoothstep(0.55, 1.0, crest) * smoothstep(0.45, 0.85, exposure) * smoothstep(0.4, 0.7, patches) * coastGate
               * smoothstep(0.3, 0.5, depth) * (1.0 - smoothstep(0.9, 1.5, depth)) * smoothstep(2.5, 6.0, uWindSpeed);
    foam = shore + surf * 0.6;
    // silt stirred up over very gentle muddy bottoms (mangrove shores)
    float mud = (1.0 - smoothstep(0.004, 0.012, slope)) * (1.0 - smoothstep(0.3, 2.0, depth)) * coastGate;
    R = mix(R, vec3(0.05, 0.062, 0.075), mud * 0.4 * (1.0 - exp(-path)));
  }
  // whitecaps (fresh breeze and up): short crest-parallel streaks riding on the steepest chop groups; the
  // streak pattern is filtered to its coverage once its cells fall below a few pixels (no cell-shaped flecks)
  float capFade = 1.0 - smoothstep(1.0, 3.0, foot);
  float streak = vnoise(vec2((dot(wp, wd) + 4.5 * t) * 0.25, dot(wp, vec2(-wd.y, wd.x)) * 0.08 + 7.0));
  float caps = mix(0.08, smoothstep(0.7, 0.82, streak), capFade);
  float whitecap = caps * smoothstep(0.6, 0.9, val0) * smoothstep(7.0, 14.0, uWindSpeed) * smoothstep(2.0, 6.0, depth) * open * w0;
  // wake foam is churned water, never a flat sheet: a fine world-anchored grain modulates it (and keeps
  // it below saturation) so a fresh float/hull wake reads as turbulent froth instead of a white bar
  float wakeGrain = 0.55 + 0.45 * vnoise(wp * 1.7 + vec2(t * 0.6, 0.0)) * (0.6 + 0.8 * vnoise(wp * 4.3 - t * 0.9));
  foam = clamp(foam + wake.r * 0.85 * wakeGrain + whitecap, 0.0, 0.92);

  wN = N; wV = V; wFoam = foam; wMss = mss; wDx = dxw; wDy = dyw; wDist = dist;
  wBodyR = R;
  wDbg = vec3(depth, milk, open);
  normal = normalize((viewMatrix * vec4(N, 0.0)).xyz);
  nonPerturbedNormal = normal;
  // the lighting pipeline is used to gather shadowed irradiance (diffuse = 1) which we scale ourselves
  diffuseColor.rgb = vec3(1.0);
  roughnessFactor = clamp(pow(mss, 0.25), 0.05, 1.0);
  metalnessFactor = 0.0;
}
`,W2=`
#if defined( RE_IndirectDiffuse ) && defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
  iblIrradiance += getIBLIrradiance( geometryNormal );
#endif
`,X2=`
{
  // E / pi from the pipeline (direct sun with shadows + sky irradiance), diffuseColor was 1
  vec3 Ediff = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
  float shadow = 1.0;
  vec3 sunCol = vec3(0.0);
  #if NUM_DIR_LIGHTS > 0
    sunCol = directionalLights[0].color;
    float nl = saturate(dot(normal, directionalLights[0].direction));
    vec3 unsh = sunCol * nl * RECIPROCAL_PI;
    float ul = max(max(unsh.r, unsh.g), unsh.b);
    if (ul > 1e-5) shadow = clamp(max(max(reflectedLight.directDiffuse.r, reflectedLight.directDiffuse.g), reflectedLight.directDiffuse.b) / ul, 0.0, 1.0);
  #endif
  float rSky = clamp(pow(wMss, 0.25), 0.05, 1.0);
  vec3 Rdir = reflect(-wV, wN);
  // rays reflected toward the sea are caught by the next wave and end up showing the sky just above the horizon
  Rdir.y = max(Rdir.y, 0.02 + 0.08 * rSky);
  Rdir = normalize(Rdir);
  vec3 sky;
  #if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
    sky = textureCubeUV(envMap, Rdir, rSky).rgb;
  #else
    sky = vec3(0.45, 0.6, 0.8);
  #endif
  // The environment probe is blended toward a neutral haze/ground fill for the diffuse IBL (sky.ts), so as a
  // mirror it is greyer and brighter than the visible dome, most of all low above the horizon where the water
  // reflects it at grazing angles. Restore the dome's chroma and radiance there (nothing at the zenith).
  float whitening = 0.65 * pow(1.0 - clamp(Rdir.y, 0.0, 1.0), 0.3);
  float lum = dot(sky, vec3(0.2126, 0.7152, 0.0722));
  sky = max(lum * (1.0 - 0.18 * whitening) + (sky - lum) * (1.0 + 2.2 * whitening), vec3(0.0));
  // the mirrored scene (aircraft, shore, piers, city) replaces the sky where the reflected ray meets an object
  if (uReflParams.x > 0.5) {
    vec4 refl = sceneReflection(vWorldPos, wV, wN, wMss, wDist);
    sky = sky * (1.0 - refl.a) + refl.rgb;
  }
  float cosV = clamp(dot(wN, wV), 0.0, 1.0);
  // ensemble Fresnel of the rough surface: the unresolved facets take the grazing reflectance well below a mirror's
  float Fg = max(1.0 - 1.6 * rSky * rSky, 0.45);
  float F = 0.02 + (Fg - 0.02) * pow(1.0 - cosV, 5.0);
  vec3 body = wBodyR * Ediff;
  // the CSM sun now carries physical irradiance (x6); the glitter BRDF was tuned for the old scale
  vec3 glitter = sunCol * 0.25 * shadow * sunGlitter(wN, wV, uSunDirW, wMss, vWorldPos.xz, wDx, wDy, uWaveTime);
  vec3 col = mix(body, sky, F) + glitter * (1.0 - wFoam);
  vec3 foamCol = vec3(0.9, 0.91, 0.91) * Ediff;
  col = mix(col, foamCol, wFoam);
  outgoingLight = col;
  #ifdef WATER_DEBUG
    // depth (m/16), diffuse irradiance E/pi (green, /2.5), Fresnel sky weight
    outgoingLight = vec3(wDbg.x / 16.0, Ediff.g / 2.5, F);
    #if WATER_DEBUG == 2
      outgoingLight = vec3(wDbg.y, wDbg.z, wMss * 20.0);
    #endif
  #endif
}
gl_FragColor = vec4( outgoingLight, 1.0 );
`;class q2{mesh;material;offset={value:new C};uniforms;constructor(t,e){const n=new ce({color:16777215,roughness:.3,metalness:0});this.uniforms={uHeightTex:{value:t.height},uZoneTex:{value:t.zone},uWakeTex:{value:e},uWakeRegion:{value:new ze(0,0,3e3,0)},uWaterOffset:this.offset,uWorldSize:{value:Ro},uWaveTime:{value:0},uWindSpeed:{value:6},uWindDir:{value:new Rt(.94,.34)},uSunDirW:{value:new C(0,1,0)},...Cd()};const i=this.uniforms,o=n.onBeforeCompile;n.onBeforeCompile=(l,h)=>{o?.(l,h),Object.assign(l.uniforms,i),l.vertexShader=l.vertexShader.replace("#include <common>",`#include <common>
${B2}`).replace("#include <begin_vertex>",`${H2}
vec3 transformed = wp;`),l.fragmentShader=""+l.fragmentShader.replace("#include <common>",`#include <common>
${G2}`).replace("#include <normal_fragment_begin>",`#include <normal_fragment_begin>
${V2}`).replace("#include <lights_fragment_maps>",W2).replace("#include <opaque_fragment>",X2)},n.customProgramCacheKey=()=>`water-v3-${O2}`,this.material=n;const r=13e4,a=new _i(r,r,64,64);a.rotateX(-Math.PI/2),this.mesh=new pe(a,n),this.mesh.frustumCulled=!1,this.mesh.receiveShadow=!0,this.mesh.matrixAutoUpdate=!1,this.mesh.renderOrder=5}attachReflection(t){for(const e of Object.keys(t))this.uniforms[e].value=t[e].value}update(t,e,n,i,o,r,a,l){this.offset.value.set(Math.round(t/50)*50,0,Math.round(e/50)*50),this.uniforms.uWaveTime.value=n,this.uniforms.uWindSpeed.value=i,this.uniforms.uWindDir.value.copy(o),this.uniforms.uSunDirW.value.copy(r),this.uniforms.uWakeRegion.value.set(a.x,a.y,l,0)}}class Y2{rt;scene=new Co;camera;center=new Rt;size;constructor(t=1024,e=3200){this.size=e,this.rt=new vn(t,t,{type:ti,depthBuffer:!1,minFilter:ye,magFilter:ye}),this.rt.texture.wrapS=this.rt.texture.wrapT=Qe,this.camera=new No(-e/2,e/2,e/2,-e/2,1,400),this.camera.up.set(0,0,-1)}get texture(){return this.rt.texture}render(t,e,n){this.center.set(Math.round(e/8)*8,Math.round(n/8)*8),this.camera.position.set(this.center.x,200,this.center.y),this.camera.lookAt(this.center.x,0,this.center.y),this.camera.updateMatrixWorld();const i=t.getRenderTarget(),o=t.getClearColor(new Vt),r=t.getClearAlpha();t.setRenderTarget(this.rt),t.setClearColor(32896,0),t.clear(!0,!1,!1),t.render(this.scene,this.camera),t.setClearColor(o,r),t.setRenderTarget(i)}}const $2=new Oe({vertexShader:`
    attribute float aAge;     // 0 fresh .. 1 old
    attribute float aSide;    // -1 .. 1 across the ribbon
    attribute float aFade;    // 0 at a trail start / gap, 1 in the body
    varying float vAge; varying float vSide; varying vec2 vWp; varying float vFade;
    void main() { vAge = aAge; vSide = aSide; vFade = aFade; vWp = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,fragmentShader:`
    varying float vAge; varying float vSide; varying vec2 vWp; varying float vFade;
    uniform float uStrength;
    float h21(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 q) { vec2 i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
    void main() {
      float edge = 1.0 - smoothstep(0.55, 1.0, abs(vSide));
      float life = 1.0 - vAge;
      // turbulent white core right behind the hull, fading and thinning with age, plus fainter V arms;
      // kept wide enough to survive the wake map's ~1.6 m texels (the old thin twin lines aliased into dots)
      float core = (1.0 - smoothstep(0.0, 0.9, abs(vSide))) * (0.45 + 0.4 * (1.0 - smoothstep(0.0, 0.5, vAge)));
      float arms = smoothstep(0.45, 0.8, abs(vSide)) * (1.0 - smoothstep(0.85, 1.0, abs(vSide))) * 0.5;
      // world-anchored breakup so a long wake reads as churned foam patches, not a chalk line; the
      // contrast is highest right behind the hull where the fresh froth is most turbulent
      float breakup = 0.4 + 0.6 * vn(vWp * 0.35) * (0.6 + 0.8 * vn(vWp * 1.3 + 4.0));
      breakup = mix(breakup, 0.3 + 0.9 * vn(vWp * 2.6 + 11.0) * breakup, 1.0 - smoothstep(0.0, 0.25, vAge));
      float foam = (core + arms) * life * life * edge * uStrength * breakup * vFade;
      vec2 n = vec2(sign(vSide) * 0.35 * life * edge * vFade, 0.0);
      gl_FragColor = vec4(foam, 0.5 + n.x, 0.5 + n.y, edge * life * vFade);
    }
  `,uniforms:{uStrength:{value:1}},transparent:!0,depthTest:!1,depthWrite:!1,side:nn,blending:Gi}),Gc=new Oe({vertexShader:`
    #include <common>
    #include <logdepthbuf_pars_vertex>
    attribute float aAge; attribute float aSide; attribute float aFade;
    varying float vAge; varying float vSide; varying float vFade;
    void main() {
      vAge = aAge; vSide = aSide; vFade = aFade;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }
  `,fragmentShader:`
    #include <common>
    #include <logdepthbuf_pars_fragment>
    varying float vAge; varying float vSide; varying float vFade;
    uniform float uStrength;
    void main() {
      #include <logdepthbuf_fragment>
      float edge = 1.0 - smoothstep(0.2, 1.0, abs(vSide));
      float life = (1.0 - vAge);
      float a = edge * life * life * uStrength * smoothstep(0.0, 0.05, vAge) * vFade;
      gl_FragColor = vec4(vec3(0.95, 0.97, 1.0), a);
    }
  `,uniforms:{uStrength:{value:.7}},transparent:!0,depthWrite:!1,side:nn}),j2=new Oe({vertexShader:`
    #include <common>
    #include <logdepthbuf_pars_vertex>
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }
  `,fragmentShader:`
    #include <common>
    #include <logdepthbuf_pars_fragment>
    varying vec2 vUv;
    uniform vec2 uHull;      // hull half-extents as a fraction of the quad (x along, y across)
    uniform float uStrength;
    float hash21(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
    float vnoise(vec2 q) {
      vec2 i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x), mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y);
    }
    void main() {
      #include <logdepthbuf_fragment>
      vec2 p = (vUv - 0.5) * 2.0;              // x: -1 stern .. +1 bow, y across
      // waterline plan of a float: fullest a little aft of midships, drawn to a fine bow and a narrower stern
      float along = clamp(p.x / uHull.x, -1.0, 1.0);
      float bowT = smoothstep(-0.2, 1.0, along), sternT = smoothstep(0.1, -1.0, along);
      float halfBeam = uHull.y * (1.0 - 0.94 * pow(bowT, 2.2)) * (1.0 - 0.55 * pow(sternT, 1.8));
      float side = abs(p.y) - halfBeam;
      float ends = abs(p.x) - uHull.x;
      float outside = max(max(side, ends), 0.0);      // 0 inside the hull outline, grows outward (quad units)
      float inside = max(-max(side, ends), 0.0);
      // streaky, world-scale foam grain stretched along the hull (the meniscus is fed by the tiny bow wave and
      // trails aft along the waterline rather than forming an even ring)
      vec2 np = vec2(p.x * 7.0, p.y * 26.0);
      float grain = 0.55 * vnoise(np) + 0.45 * vnoise(np * 2.1 + vec2(3.7, 9.2));
      float streak = vnoise(vec2(p.x * 3.0, p.y * 40.0) + 1.3);
      // meniscus: a thin bright line on the hull side, strongest at the bow, thinning toward the stern
      float lineW = 0.018 + 0.03 * bowT;
      float meniscus = exp(-outside * outside / (lineW * lineW)) * (0.6 + 0.5 * bowT) * (0.55 + 0.7 * grain);
      // bow ripple: two faint crescents ahead of the stem
      vec2 stem = vec2(uHull.x, 0.0);
      float rb = length((p - stem) * vec2(1.0, 1.6));
      float ahead = smoothstep(-0.05, 0.15, p.x - uHull.x) * smoothstep(0.7, 0.2, rb);
      float ripple = (0.5 + 0.5 * cos(rb * 44.0)) * ahead * 0.35 * smoothstep(0.02, 0.08, rb);
      // disturbed water: a soft halo hugging the waterline, dragged aft into a faint streak behind the stern
      float halo = exp(-outside * 14.0) * 0.16 * (0.6 + 0.6 * streak);
      float wake = smoothstep(0.0, 0.6, -p.x - uHull.x) * exp(-abs(p.y) * abs(p.y) / (uHull.y * uHull.y * 0.5)) * 0.10 * (0.5 + streak);
      // the hull itself covers the inside; fade the decal there so nothing shows through gaps at the bow/stern
      float coverage = 1.0 - smoothstep(0.0, 0.06, inside);
      float foam = (meniscus + ripple + halo + wake) * coverage * uStrength * smoothstep(1.0, 0.85, max(abs(p.x), abs(p.y)));
      // drawn as a decal in the main scene (the shared wake map is ~3 m/px, far too coarse for a hull ring):
      // sky-lit foam, slightly translucent so the water colour shows through the halo
      gl_FragColor = vec4(vec3(0.90, 0.94, 0.97), clamp(foam, 0.0, 0.85));
    }
  `,uniforms:{uHull:{value:new Rt(.72,.28)},uStrength:{value:1}},transparent:!0,depthTest:!0,depthWrite:!1,side:nn});class Ar{mesh;constructor(t,e,n=1){const i=t+2.6,o=e+2.2,r=j2.clone();r.uniforms.uHull.value=new Rt(t/i,e/o),r.uniforms.uStrength.value=n,this.mesh=new pe(new _i(i,o),r),this.mesh.frustumCulled=!1,this.mesh.visible=!1,this.mesh.renderOrder=6}static flat=new Xe().setFromAxisAngle(new C(1,0,0),-Math.PI/2);spin=new Xe;static up=new C(0,1,0);update(t,e,n,i,o,r=1){this.mesh.visible=o,o&&(this.mesh.position.set(t,.07,e),this.spin.setFromAxisAngle(Ar.up,Math.atan2(-i,n)),this.mesh.quaternion.copy(this.spin).multiply(Ar.flat),this.mesh.material.uniforms.uStrength.value=r)}}class go{constructor(t,e,n,i=1,o=$2){this.width=e,this.lifetime=n,this.capacity=t,this.positions=new Float32Array(t*2*3),this.ages=new Float32Array(t*2),this.sides=new Float32Array(t*2),this.fades=new Float32Array(t*2);const r=[];for(let l=0;l<t-1;l++){const h=l*2,c=h+1,d=h+2,u=h+3;r.push(h,d,c,c,d,u)}this.geo=new oe,this.geo.setAttribute("position",new _e(this.positions,3)),this.geo.setAttribute("aAge",new _e(this.ages,1)),this.geo.setAttribute("aSide",new _e(this.sides,1)),this.geo.setAttribute("aFade",new _e(this.fades,1)),this.geo.setIndex(r),this.geo.setDrawRange(0,0);const a=o.clone();a.uniforms.uStrength.value=i,this.mesh=new pe(this.geo,a),this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1}mesh;capacity;positions;ages;sides;fades;points=[];lastX=NaN;lastZ=NaN;ramp=0;geo;update(t,e,n,i,o){const a=Number.isNaN(this.lastX),l=a?0:Math.hypot(t-this.lastX,e-this.lastZ);if(i&&(a||l>Math.max(2,o*.25))){const c=a?1:t-this.lastX,d=a?0:e-this.lastZ,u=Math.hypot(c,d)||1,p=!a&&l>Math.max(12,o*1.5);if(p){const v=this.points[this.points.length-1];v&&this.points.push({...v,fade:0})}(a||p)&&(this.ramp=4);const f=this.ramp>0?1-this.ramp--/5:1;for(this.points.push({x:t,z:e,dx:c/u,dz:d/u,t:n,fade:f});this.points.length>this.capacity;)this.points.shift();this.lastX=t,this.lastZ=e}for(;this.points.length&&n-this.points[0].t>this.lifetime;)this.points.shift();const h=this.points.length;for(let c=0;c<h;c++){const d=this.points[c],u=Math.min(1,(n-d.t)/this.lifetime),p=this.width*(.6+1.8*u),f=-d.dz*p,v=d.dx*p;this.positions[c*6]=d.x-f,this.positions[c*6+1]=.05,this.positions[c*6+2]=d.z-v,this.positions[c*6+3]=d.x+f,this.positions[c*6+4]=.05,this.positions[c*6+5]=d.z+v,this.ages[c*2]=u,this.ages[c*2+1]=u,this.sides[c*2]=-1,this.sides[c*2+1]=1,this.fades[c*2]=d.fade,this.fades[c*2+1]=d.fade}this.geo.attributes.position.needsUpdate=!0,this.geo.attributes.aAge.needsUpdate=!0,this.geo.attributes.aSide.needsUpdate=!0,this.geo.attributes.aFade.needsUpdate=!0,this.geo.setDrawRange(0,Math.max(0,(h-1)*6))}reset(){this.points.length=0,this.lastX=NaN,this.lastZ=NaN,this.ramp=0,this.geo.setDrawRange(0,0)}}const ua=`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,Z2=`
${Fo}
${jn}
${Pr}
${Lr}
${ch}
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform mat4 uInvProj;
uniform mat4 uInvView;
uniform vec3 uCamPos;
uniform float uLogDepthFC;
uniform float uCloudShadowStrength;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tColor, vUv);
  float depth = texture2D(tDepth, vUv).r;
  if (depth >= 0.99999) { gl_FragColor = c; return; }
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 vdir4 = uInvProj * vec4(ndc, 1.0, 1.0);
  vec3 vdir = vdir4.xyz / vdir4.w;
  vdir /= -vdir.z;
  float w = exp2(depth * 2.0 / uLogDepthFC) - 1.0;
  vec3 vpos = vdir * w;
  vec3 wp = (uInvView * vec4(vpos, 1.0)).xyz;
  vec3 col = c.rgb;
  // clouds shade the ground: only the direct-sun share of the light is removed
  float cs = cloudShadow(wp);
  float sunShare = 0.62 * smoothstep(-0.05, 0.2, uSunDir.y);
  col *= 1.0 - (1.0 - cs) * sunShare * uCloudShadowStrength;
  col = applyAerial(col, uCamPos, wp);
  gl_FragColor = vec4(col, 1.0);
}
`,K2=`
uniform sampler2D tColor;
uniform float uThreshold;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tColor, vUv).rgb;
  float l = max(max(c.r, c.g), c.b);
  float k = max(l - uThreshold, 0.0);
  k = k / (1.0 + k);
  gl_FragColor = vec4(c * (k / max(l, 1e-4)), 1.0);
}
`,J2=`
uniform sampler2D tColor;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec3 s = texture2D(tColor, vUv).rgb * 0.227;
  s += (texture2D(tColor, vUv + uDir * 1.385).rgb + texture2D(tColor, vUv - uDir * 1.385).rgb) * 0.316;
  s += (texture2D(tColor, vUv + uDir * 3.231).rgb + texture2D(tColor, vUv - uDir * 3.231).rgb) * 0.070;
  gl_FragColor = vec4(s, 1.0);
}
`,Q2=`
uniform sampler2D tColor;
uniform sampler2D tBloom0;
uniform sampler2D tBloom1;
uniform sampler2D tBloom2;
uniform float uBloom;
uniform float uExposure;
uniform float uSaturation;
uniform float uVignette;
uniform vec3 uLift;
uniform vec3 uGain;
uniform vec2 uResolution;
uniform float uGrain;
uniform float uTime;
varying vec2 vUv;
vec3 aces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  vec3 c = texture2D(tColor, vUv).rgb;
  vec3 bloom = texture2D(tBloom0, vUv).rgb * 0.5 + texture2D(tBloom1, vUv).rgb * 0.3 + texture2D(tBloom2, vUv).rgb * 0.25;
  c += bloom * uBloom;
  c *= uExposure;
  // grade: subtle lift/gain (teal shadows, warm highlights)
  c = c * uGain + uLift * (1.0 - smoothstep(0.0, 0.6, c));
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSaturation);
  // gentle contrast around mid grey
  c = mix(c, c * c * (3.0 - 2.0 * min(c, vec3(1.0))), 0.18);
  c = aces(c);
  vec2 q = vUv - 0.5;
  float vig = 1.0 - uVignette * smoothstep(0.35, 0.95, length(q) * 1.35);
  c *= vig;
  // fine film grain hides banding in the sky gradients
  c += (hash(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5) * uGrain;
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  gl_FragColor = vec4(c, 1.0);
}
`;class tw{constructor(t,e,n){this.renderer=t,this.opts=n;const i=new ka(1,1,wi);this.sceneRT=new vn(1,1,{type:In,samples:n.samples,depthTexture:i,depthBuffer:!0,minFilter:ye,magFilter:ye}),this.fogRT=new vn(1,1,{type:In,depthBuffer:!1,minFilter:ye,magFilter:ye});for(let o=0;o<3;o++)this.bloomRTs.push(new vn(1,1,{type:In,depthBuffer:!1,minFilter:ye,magFilter:ye})),this.bloomTmp.push(new vn(1,1,{type:In,depthBuffer:!1,minFilter:ye,magFilter:ye}));this.aerialMat=new Oe({vertexShader:ua,fragmentShader:Z2,uniforms:{...e.uniforms,tColor:{value:null},tDepth:{value:null},uInvProj:{value:new jt},uInvView:{value:new jt},uCamPos:{value:new C},uLogDepthFC:{value:1},uCloudShadowStrength:{value:1}},depthTest:!1,depthWrite:!1}),this.brightMat=new Oe({vertexShader:ua,fragmentShader:K2,uniforms:{tColor:{value:null},uThreshold:{value:1.5}},depthTest:!1,depthWrite:!1}),this.blurMat=new Oe({vertexShader:ua,fragmentShader:J2,uniforms:{tColor:{value:null},uDir:{value:new Rt}},depthTest:!1,depthWrite:!1}),this.compositeMat=new Oe({vertexShader:ua,fragmentShader:Q2,uniforms:{tColor:{value:null},tBloom0:{value:null},tBloom1:{value:null},tBloom2:{value:null},uBloom:{value:.2},uExposure:{value:.92},uSaturation:{value:1.16},uVignette:{value:.25},uLift:{value:new C(0,.002,.004)},uGain:{value:new C(1.03,1,.97)},uResolution:{value:new Rt(1,1)},uGrain:{value:.004},uTime:{value:0}},depthTest:!1,depthWrite:!1}),this.quad=new pe(new _i(2,2),this.aerialMat),this.quad.frustumCulled=!1,this.quadScene.add(this.quad)}sceneRT;fogRT;bloomRTs=[];bloomTmp=[];quad;quadScene=new Co;quadCam=new No(-1,1,1,-1,0,1);aerialMat;brightMat;blurMat;compositeMat;width=1;height=1;exposure=1;cloudShadowStrength=1;setSize(t,e){this.width=t,this.height=e,this.sceneRT.setSize(t,e),this.fogRT.setSize(t,e);for(let n=0;n<3;n++){const i=2**(n+1);this.bloomRTs[n].setSize(Math.max(1,Math.round(t/i)),Math.max(1,Math.round(e/i))),this.bloomTmp[n].setSize(Math.max(1,Math.round(t/i)),Math.max(1,Math.round(e/i)))}this.compositeMat.uniforms.uResolution.value.set(t,e)}get target(){return this.sceneRT}blit(t,e){this.quad.material=t,this.renderer.setRenderTarget(e),this.renderer.render(this.quadScene,this.quadCam)}finish(t,e){const n=this.renderer,i=this.aerialMat.uniforms;if(i.tColor.value=this.sceneRT.texture,i.tDepth.value=this.sceneRT.depthTexture,i.uInvProj.value.copy(t.projectionMatrixInverse),i.uInvView.value.copy(t.matrixWorld),i.uCamPos.value.copy(t.position),i.uLogDepthFC.value=2/(Math.log(t.far+1)/Math.LN2),i.uCloudShadowStrength.value=this.cloudShadowStrength,this.blit(this.aerialMat,this.fogRT),this.opts.bloom){this.brightMat.uniforms.tColor.value=this.fogRT.texture,this.blit(this.brightMat,this.bloomRTs[0]);for(let r=0;r<3;r++){const a=this.bloomRTs[r],l=this.bloomTmp[r],h=a.width,c=a.height;r>0&&(this.blurMat.uniforms.tColor.value=this.bloomRTs[r-1].texture,this.blurMat.uniforms.uDir.value.set(.5/h,.5/c),this.blit(this.blurMat,a)),this.blurMat.uniforms.tColor.value=a.texture,this.blurMat.uniforms.uDir.value.set(1/h,0),this.blit(this.blurMat,l),this.blurMat.uniforms.tColor.value=l.texture,this.blurMat.uniforms.uDir.value.set(0,1/c),this.blit(this.blurMat,a)}}const o=this.compositeMat.uniforms;o.tColor.value=this.fogRT.texture,o.tBloom0.value=this.bloomRTs[0].texture,o.tBloom1.value=this.bloomRTs[1].texture,o.tBloom2.value=this.bloomRTs[2].texture,o.uBloom.value=this.opts.bloom?.18:0,o.uExposure.value=this.exposure*(1+2.5*this.aerialMat.uniforms.uNight.value),o.uTime.value=e,this.blit(this.compositeMat,null),n.setRenderTarget(null)}}const Ul=new jt,Q0=new jt,ew=new C(0,1,0),Fl=new C,tu=new C,ui=new Be,di=new C,kl=[0,1,2,3].map(()=>new C),oi=Array.from({length:32},()=>new C),nw=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],ir=(s,t,e)=>Math.min(e,Math.max(t,s)),Ol=(s,t=1.12)=>Math.pow(t,Math.round(Math.log(s)/Math.log(t))),eu=(s,t=1.1)=>Math.pow(t,Math.ceil(Math.log(s)/Math.log(t)));function iw(){const s=ae.lights_fragment_begin;ae.lights_fragment_begin=s.replace("vec2 cascade;","vec2 cascade; float csmDbgShadow = 1.0; float csmDbgIdx = -1.0;").replace("bool shouldFadeLastCascade",`csmDbgShadow = min(csmDbgShadow, directLight.color.g / max(prevColor.g, 1e-5)); csmDbgIdx = float(UNROLLED_LOOP_INDEX);
					bool shouldFadeLastCascade`).replace("#elif defined (USE_SHADOWMAP)",`{
      vec3 tint = csmDbgIdx < -0.5 ? vec3(0.5) : csmDbgIdx < 0.5 ? vec3(1.0, 0.25, 0.25) : csmDbgIdx < 1.5 ? vec3(0.3, 1.0, 0.3) : csmDbgIdx < 2.5 ? vec3(0.3, 0.5, 1.0) : vec3(1.0, 1.0, 0.3);
      reflectedLight.directDiffuse = tint * mix(0.12, 1.0, csmDbgShadow) * 0.8;
      reflectedLight.indirectDiffuse = vec3(0.0); reflectedLight.directSpecular = vec3(0.0); reflectedLight.indirectSpecular = vec3(0.0);
    }
    #elif defined (USE_SHADOWMAP)`)}class sw{constructor(t){this.camera=t}slabMin=-6;slabMax=380;normalBiasTexels=1;info=[];splits=[30,400,1400];csm;lastKey="";splitsCallback=(t,e,n,i)=>{for(let o=0;o<t-1;o++)i.push(ir(this.splits[o]/n,.001,.999));i.push(1)};attach(t){this.csm=t;for(let e=0;e<t.cascades;e++)this.info.push({texel:1,near:0,far:0})}updateSplits(t,e,n,i){const o=this.camera,r=this.csm.cascades,a=Ol(ir(o.position.distanceTo(e)+n,8,200)),l=Math.max(1,o.position.y-i);o.getWorldDirection(tu);const c=Math.asin(ir(tu.y,-1,1))-mn.DEG2RAD*.5*o.fov/o.zoom,d=c<-.03?l/Math.sin(-c):t,u=Ol(ir(2.2*d,Math.max(300,4*a),.45*t)),p=this.splits;if(p.length=r-1,r===2)p[0]=l>60?u:a;else if(r>=3){p[0]=a,p[1]=u;for(let v=2;v<r-1;v++)p[v]=Ol(Math.sqrt(p[v-1]*t))}const f=`${t}|${p.join("|")}`;f!==this.lastKey&&(this.lastKey=f,this.csm.maxFar=t,this.csm.updateFrustums())}fit(t){const e=this.csm,n=this.camera,i=e.lightDirection;Ul.lookAt(di.set(0,0,0),i,ew),Q0.copy(Ul).invert();const o=Math.max(.06,-i.y),r=e.maxFar,a=n.near;for(let c=0;c<4;c++)Fl.set(c===0||c===3?-1:1,c<2?1:-1,1).applyMatrix4(n.projectionMatrixInverse),kl[c].copy(Fl).multiplyScalar(-1/Fl.z).transformDirection(n.matrixWorld);const l=e.shadowMapSize,h=e.breaks;for(let c=0;c<e.cascades;c++){const d=e.lights[c],u=d.shadow.camera,p=c===0?0:h[c-1],f=h[c],v=Math.max(0,p-.125*p*p),m=c===e.cascades-1?1:Math.min(1,f+.125*f*f),g=Math.max(a,v*(r-a)),w=Math.max(g+1,m*(r-a));let y=0;for(let I=0;I<4;I++)oi[I].copy(n.position).addScaledVector(kl[I],g);for(let I=0;I<4;I++)oi[4+I].copy(n.position).addScaledVector(kl[I],w);c===0?y=8:y=this.clipToSlab(),y===0&&(y=8);let x=1/0;for(let I=0;I<y;I++)x=Math.min(x,oi[I].y);x=Math.max(x,this.slabMin);const b=Math.max(this.slabMax,c>0?t:-1/0),M=ir((b-x)/o,60,7e3);ui.makeEmpty();for(let I=0;I<y;I++)ui.expandByPoint(oi[I].applyMatrix4(Q0));const S=eu(Math.max(2,(ui.max.x-ui.min.x)*1.04)),T=eu(Math.max(2,(ui.max.y-ui.min.y)*1.04)),_=S/l,E=T/l;ui.getCenter(di),di.x=Math.floor(di.x/_)*_,di.y=Math.floor(di.y/E)*E;const A=ui.max.z-ui.min.z;di.z=ui.max.z+M,u.left=-S/2,u.right=S/2,u.top=T/2,u.bottom=-T/2,u.near=1,u.far=M+A+4,u.updateProjectionMatrix(),di.applyMatrix4(Ul),d.position.copy(di),d.target.position.copy(di).add(i);const U=Math.max(_,E),F=this.info[c];F.texel=U,F.near=g,F.far=w,d.shadow.normalBias=U*this.normalBiasTexels,d.shadow.bias=-(.25*U)/(u.far-u.near)}T2(this.info)}clipToSlab(){const t=this.slabMin,e=this.slabMax;let n=8;const i=r=>r.y>=t&&r.y<=e;for(const[r,a]of nw){const l=oi[r],h=oi[a];for(const c of[t,e]){const d=l.y-c,u=h.y-c;d<0==u<0||n>=oi.length||oi[n++].lerpVectors(l,h,d/(d-h.y+c))}}let o=0;for(let r=0;r<n;r++)r<8&&!i(oi[r])||(o!==r&&oi[o].copy(oi[r]),o++);return o}}function nu(s,t,e){const n=Math.hypot(e[0]-t[0],e[1]-t[1]),i=Math.max(2,Math.ceil(n/10));let o=-1,r=-1;for(let h=0;h<=i;h++){const c=h/i,d=t[0]+(e[0]-t[0])*c,u=t[1]+(e[1]-t[1])*c,p=s.heightAt(d,u)>=.8;p&&o<0&&(o=h),p&&(r=h)}if(o<0||r-o<3)return null;const a=o/i,l=r/i;return[[t[0]+(e[0]-t[0])*a,t[1]+(e[1]-t[1])*a],[t[0]+(e[0]-t[0])*l,t[1]+(e[1]-t[1])*l]]}function ow(s){const t=[],e=new Map,n=new Map;for(const r of s.roads)for(let a=0;a<r.pts.length-1;a++)t.push({a:r.pts[a],b:r.pts[a+1],width:r.width,cls:r.cls,lanes:r.lanes,traffic:r.traffic,lift:0});const i=new $e("lots"),o=(r,a,l)=>s.districtAt(a,l)===r;for(const r of s.districts){const a=Math.cos(r.rot),l=Math.sin(r.rot),h=(y,x)=>[r.cx+y*a-x*l,r.cz+y*l+x*a],c=(y,x)=>{const b=y-r.cx,M=x-r.cz;return[b*a+M*l,-b*l+M*a]};if(r.track){const y=[],x=[];let b=1,M=0;for(let S=0;S<r.track.length-1;S++){const T=r.track[S],_=r.track[S+1],E=nu(s,T,_);if(E){const P={a:E[0],b:E[1],width:7,cls:"lane",lanes:2,traffic:.6,lift:0};t.push(P),y.push(P)}const A=Math.hypot(_[0]-T[0],_[1]-T[1]),[U,F]=c(T[0],T[1]),[I,B]=c(_[0],_[1]),k=Math.abs(I-U)>=Math.abs(B-F);for(let P=M;P<A-12;P+=i.range(42,58)){const H=P/A,G=U+(I-U)*H,N=F+(B-F)*H;b=-b;const $=6,W=46,et=20,X=k?{x0:G-et,x1:G+et,z0:Math.min(N+b*$,N+b*($+W)),z1:Math.max(N+b*$,N+b*($+W)),streetWidth:7}:{z0:N-et,z1:N+et,x0:Math.min(G+b*$,G+b*($+W)),x1:Math.max(G+b*$,G+b*($+W)),streetWidth:7},[q,V]=h((X.x0+X.x1)/2,(X.z0+X.z1)/2);s.heightAt(q,V)<1.2||!o(r,q,V)||(x.push(X),M=0)}}e.set(r.id,y),n.set(r.id,x);continue}const d=s.grids.get(r.id);if(!d)continue;const u=[],p=r.zone===ne.DOWNTOWN?14:r.zone===ne.RES_MID||r.zone===ne.HOTEL||r.zone===ne.INDUSTRIAL?12:9,f="street",{xs:v,zs:m}=d,g=(y,x)=>{const b=nu(s,y,x);if(!b)return;const M=[(b[0][0]+b[1][0])/2,(b[0][1]+b[1][1])/2];if(!o(r,M[0],M[1]))return;const S={a:b[0],b:b[1],width:p,cls:f,lanes:2,traffic:r.zone===ne.DOWNTOWN?4:1.5,lift:0};t.push(S),u.push(S)};for(const y of v)for(let x=0;x<m.length-1;x++)g(h(y,m[x]),h(y,m[x+1]));for(const y of m)for(let x=0;x<v.length-1;x++)g(h(v[x],y),h(v[x+1],y));e.set(r.id,u);const w=[];for(let y=0;y<v.length-1;y++)for(let x=0;x<m.length-1;x++){const[b,M]=h((v[y]+v[y+1])/2,(m[x]+m[x+1])/2);o(r,b,M)&&w.push({x0:v[y],x1:v[y+1],z0:m[x],z1:m[x+1],streetWidth:p})}n.set(r.id,w)}for(const r of s.runways)t.push({a:r.a,b:r.b,width:r.width,cls:"runway",lanes:0,traffic:0,lift:0});return{segments:t,streetsByDistrict:e,blocksByDistrict:n}}const rw=`
varying vec2 vRoadUv;   // x across (-1..1), y along (metres)
varying vec3 vRoadInfo; // lanes, width, class
varying vec3 vWorldPosR;
${jn}
`,aw=`
{
  float lanes = vRoadInfo.x;
  float width = vRoadInfo.y;
  float cls = vRoadInfo.z;
  float across = vRoadUv.x; // -1..1
  float along = vRoadUv.y;
  float xm = across * width * 0.5; // metres from centre
  float n = fbm3(vWorldPosR.xz * 0.15);
  float n2 = vnoise(vWorldPosR.xz * 1.7);
  vec3 asphalt = mix(vec3(0.16, 0.16, 0.165), vec3(0.24, 0.235, 0.23), n) * (0.92 + 0.16 * n2);
  // causeways and highways are pale, sun-bleached concrete-asphalt
  if (cls > 2.5 && cls < 4.5) asphalt = mix(vec3(0.30, 0.30, 0.29), vec3(0.40, 0.39, 0.37), n) * (0.94 + 0.12 * n2);
  if (cls < 0.5) {
    // island lane: packed sand and shell with twin wheel ruts, grass creeping in from the verges
    vec3 sand = mix(vec3(0.62, 0.56, 0.44), vec3(0.72, 0.66, 0.52), n) * (0.92 + 0.16 * n2);
    float rut = exp(-pow((abs(xm) - width * 0.22) * 2.2, 2.0));
    sand *= 1.0 - 0.14 * rut;
    float verge = smoothstep(0.55, 1.0, abs(across)) * (0.5 + 0.5 * n2);
    float crown = smoothstep(0.05, 0.16, 0.16 - abs(xm) / max(width, 1.0)) * smoothstep(0.3, 0.7, fbm3(vWorldPosR.xz * 0.6 + 2.0));
    diffuseColor.rgb = mix(sand, vec3(0.30, 0.36, 0.16) * (0.85 + 0.3 * n2), max(verge * 0.8, crown * 0.5));
    roughnessFactor = 0.95;
  } else if (cls > 4.5) {
    // runway: concrete, centre line dashes, threshold bars
    vec3 concrete = mix(vec3(0.33, 0.33, 0.32), vec3(0.42, 0.41, 0.4), n) * (0.94 + 0.12 * n2);
    float centre = step(abs(xm), 0.45) * step(fract(along / 60.0), 0.5);
    float edge = step(width * 0.5 - 1.2, abs(xm)) * step(0.15, width * 0.5 - abs(xm));
    // skid marks near the touchdown zone
    float rubber = smoothstep(0.55, 0.8, fbm3(vWorldPosR.xz * 0.05 + 3.0)) * step(abs(xm), width * 0.28) * 0.35;
    diffuseColor.rgb = mix(concrete * (1.0 - rubber), vec3(0.85), max(centre, edge) * 0.8);
    roughnessFactor = 0.85;
  } else {
    float laneW = width / max(lanes, 1.0);
    float edgeLine = smoothstep(0.12, 0.05, abs(abs(xm) - (width * 0.5 - 0.35)));
    float centreLine = 0.0;
    float dashes = 0.0;
    if (lanes >= 3.5) {
      // divided: double yellow at centre, dashed white lane lines
      centreLine = smoothstep(0.1, 0.04, abs(abs(xm) - 0.25)) * 1.0;
      float k = floor((xm + width * 0.5) / laneW);
      float lanePos = abs(fract((xm + width * 0.5) / laneW) - 0.0) * laneW;
      float laneEdge = smoothstep(0.12, 0.05, min(lanePos, laneW - lanePos)) * step(0.5, k) * step(k, lanes - 1.5);
      dashes = laneEdge * step(fract(along / 12.0), 0.5);
      centreLine = 0.0;
      // median dashes around centre count as lane lines except the exact middle which is solid yellow
      float mid = smoothstep(0.12, 0.05, abs(xm));
      diffuseColor.rgb = asphalt;
      vec3 yellow = vec3(0.85, 0.65, 0.15);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8), max(edgeLine, dashes) * 0.85);
      diffuseColor.rgb = mix(diffuseColor.rgb, yellow, mid * 0.9);
    } else {
      centreLine = smoothstep(0.1, 0.04, abs(xm)) * step(fract(along / 9.0), 0.45);
      diffuseColor.rgb = mix(asphalt, vec3(0.85, 0.7, 0.2), centreLine * 0.85);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8), edgeLine * 0.6 * step(9.5, width));
    }
    // wear: tyre paths slightly darker, patches
    float wheel = exp(-pow((abs(mod(xm + width * 0.5, laneW) - laneW * 0.5) - laneW * 0.28) * 4.0, 2.0));
    diffuseColor.rgb *= 1.0 - 0.12 * wheel;
    diffuseColor.rgb *= 1.0 - 0.15 * smoothstep(0.6, 0.75, fbm3(vWorldPosR.xz * 0.04 + 8.0));
    roughnessFactor = 0.78;
  }
}
`;function lw(s,t,e){const n=[],i=[],o=[],r=[],a=[];let l=0;const h=p=>p==="highway"||p==="causeway"?3:p==="arterial"?2:p==="runway"?5:p==="taxiway"?6:p==="lane"?0:1,c=[];for(const p of t){if(Math.hypot(p.b[0]-p.a[0],p.b[1]-p.a[1])<1)continue;const f=c[c.length-1],v=f&&f[f.length-1];v&&v.cls===p.cls&&v.width===p.width&&v.lift===p.lift&&v.b[0]===p.a[0]&&v.b[1]===p.a[1]?f.push(p):c.push([p])}for(const p of c){const f=[p[0].a,...p.map(_=>_.b)],v=f.length,m=[];for(let _=0;_<v-1;_++){const E=f[_+1][0]-f[_][0],A=f[_+1][1]-f[_][1],U=Math.hypot(E,A);m.push([E/U,A/U])}const g=[];for(let _=0;_<v;_++){const E=m[Math.max(0,_-1)],A=m[Math.min(v-2,_)];let U=-(E[1]+A[1]),F=E[0]+A[0];const I=Math.hypot(U,F)||1;U/=I,F/=I;const B=Math.max(.5,U*-A[1]+F*A[0]);g.push([U/B,F/B])}const w=p[0].width,y=w*.5,x=h(p[0].cls),b=p[0].lanes,M=p[0].lift;let S=0,T=!0;for(let _=0;_<v-1;_++){const[E,A]=f[_],[U,F]=f[_+1],I=Math.hypot(U-E,F-A),B=Math.max(1,Math.ceil(I/15)),k=g[_],P=g[_+1];for(let H=T?0:1;H<=B;H++){const G=H/B,N=E+(U-E)*G,$=A+(F-A)*G,W=k[0]+(P[0]-k[0])*G,et=k[1]+(P[1]-k[1])*G;for(const X of[-1,1]){const q=N+W*y*X,V=$+et*y*X,st=s.heightAt(q,V)+.15+M;n.push(q,st,V),a.push(0,1,0),i.push(X,S+G*I),o.push(b,w,x)}l+=2,(!T||H>0)&&r.push(l-4,l-3,l-2,l-2,l-3,l-1),T=!1}S+=I}}const d=new oe;d.setAttribute("position",new Mt(n,3)),d.setAttribute("normal",new Mt(a,3)),d.setAttribute("aRoadUv",new Mt(i,2)),d.setAttribute("aRoadInfo",new Mt(o,3)),d.setIndex(r),d.computeBoundingSphere();const u=new pe(d,e);return u.receiveShadow=!0,u.castShadow=!1,u.renderOrder=2,u.frustumCulled=!1,[u]}function cw(){const s=new ce({color:16777215,roughness:.8,metalness:0,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2});return s.onBeforeCompile=t=>{t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aRoadUv; attribute vec3 aRoadInfo; varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vRoadUv = aRoadUv; vRoadInfo = aRoadInfo; vWorldPosR = (modelMatrix * vec4(position, 1.0)).xyz;`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
${rw}`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
${aw}`)},s.customProgramCacheKey=()=>"road-v3",s}function hw(s){let t=0;for(let e=0;e<s.length-1;e++)t+=Math.hypot(s[e+1][0]-s[e][0],s[e+1][1]-s[e][1]);return t}function uw(s,t){let e=0;for(let n=0;n<s.length-1;n++){const i=Math.hypot(s[n+1][0]-s[n][0],s[n+1][1]-s[n][1]);if(t<=e+i||n===s.length-2){const o=Qt((t-e)/i,0,1),r=(s[n+1][0]-s[n][0])/i,a=(s[n+1][1]-s[n][1])/i;return{x:s[n][0]+r*i*o,z:s[n][1]+a*i*o,dx:r,dz:a}}e+=i}return{x:s[0][0],z:s[0][1],dx:1,dz:0}}function dw(s,t,e,n){const i=Math.min(160,n*.25),o=t.heightAt(s.pts[0][0],s.pts[0][1]),r=t.heightAt(s.pts[s.pts.length-1][0],s.pts[s.pts.length-1][1]),a=St(0,i,e),l=St(0,i,n-e);let h=se(Math.max(o,.5)+.3,s.deck,a);if(h=Math.min(h,se(Math.max(r,.5)+.3,s.deck,l)),s.archHeight>0){const c=s.archT*n,d=Math.abs(e-c)/(s.archLength*.5);if(d<1){const u=.5+.5*Math.cos(d*Math.PI);h+=(s.archHeight-s.deck)*u}}return h}const fw=1e3,pw=2500,mw=5e3,gw=6,vw=2.4,xw=1.05,is=.15,sr=10,ww=`
{
  if (vRoadInfo.x > 0.5) {
    float lanes = vRoadInfo.x;
    float width = vRoadInfo.y;
    float median = vRoadInfo.z;
    float xm = vRoadUv.x * width * 0.5;
    float along = vRoadUv.y;
    float n = fbm3(vWorldPosR.xz * 0.11);
    float n2 = vnoise(vWorldPosR.xz * 2.3);
    // sun-bleached concrete pavement, a shade darker than the shoulders so the white lines and the kerbs read
    float onShoulder = step(width * 0.5 + 0.005, abs(xm));
    vec3 conc = mix(vec3(0.46, 0.46, 0.44), vec3(0.58, 0.57, 0.54), n) * (0.94 + 0.12 * n2);
    vec3 shoulder = mix(vec3(0.66, 0.66, 0.63), vec3(0.78, 0.77, 0.74), n) * (0.96 + 0.08 * n2);
    // transverse pavement joints every 6 m, faint longitudinal joints at the lane edges
    float laneW = width / max(lanes, 1.0);
    float u = xm + width * 0.5;
    float k = floor(u / laneW);
    float lp = u - k * laneW;
    float edgeDist = min(lp, laneW - lp);
    float joint = smoothstep(0.10, 0.03, abs(fract(along / 6.0) - 0.5) * 6.0);
    conc *= 1.0 - 0.20 * joint - 0.08 * smoothstep(0.08, 0.02, edgeDist);
    // tyre paths and weathering patches
    float wheel = exp(-pow((abs(lp - laneW * 0.5) - laneW * 0.28) * 3.0, 2.0));
    conc *= 1.0 - 0.10 * wheel;
    conc *= 1.0 - 0.12 * smoothstep(0.6, 0.75, fbm3(vWorldPosR.xz * 0.03 + 8.0));
    shoulder *= 1.0 - 0.15 * joint - 0.1 * smoothstep(0.6, 0.75, fbm3(vWorldPosR.xz * 0.03 + 8.0));
    conc = mix(conc, shoulder, onShoulder);
    // markings sized to read from a 45 m chase camera: 30 cm white edge lines, 30 cm lane dashes (3 m on / 6 m off),
    // yellow centre: dashed on two-lane decks, a double line on four lanes, lines beside the barrier on six
    float laneEdge = smoothstep(0.30, 0.14, edgeDist) * step(0.5, k) * step(k, lanes - 1.5) * step(0.6, abs(xm));
    float dashes = laneEdge * step(fract(along / 9.0), 0.34);
    float edgeLine = smoothstep(0.32, 0.16, abs(abs(xm) - (width * 0.5 - 0.45)));
    float centre = 0.0;
    if (lanes < 3.5) centre = smoothstep(0.2, 0.08, abs(xm)) * step(fract(along / 9.0), 0.45);
    else if (median > 0.0) centre = smoothstep(0.22, 0.09, abs(abs(xm) - (median + 0.45)));
    else centre = smoothstep(0.2, 0.08, abs(abs(xm) - 0.26));
    diffuseColor.rgb = mix(conc, vec3(0.92), max(edgeLine, dashes) * 0.92);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.66, 0.14), centre * 0.94);
    roughnessFactor = 0.82;
  } else {
    // run-off streaks down the faces and a little grime
    float streak = fbm3(vec2(vWorldPosR.x + vWorldPosR.z, vWorldPosR.y * 0.25) * 0.7);
    diffuseColor.rgb *= 0.93 + 0.12 * streak;
  }
}
`;function yw(s){const t=s,e=new ce({color:t.color.clone(),roughness:t.roughness,metalness:0,vertexColors:!0});return t.defines&&(e.defines={...t.defines}),e.onBeforeCompile=(n,i)=>{t.onBeforeCompile.call(t,n,i),n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aRoadUv; attribute vec3 aRoadInfo; varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vRoadUv = aRoadUv; vRoadInfo = aRoadInfo; vWorldPosR = (modelMatrix * vec4(position, 1.0)).xyz;`),n.fragmentShader=n.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;
${jn}`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
${ww}`)},e.customProgramCacheKey=()=>"bridge-concrete-v2",e}function _w(s){const t=s,e=new ce({color:t.color.clone(),roughness:t.roughness,metalness:t.metalness,vertexColors:!0,emissive:new Vt(1,.8,.52),emissiveIntensity:0});return t.defines&&(e.defines={...t.defines}),e.onBeforeCompile=(n,i)=>{t.onBeforeCompile.call(t,n,i),n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
attribute float aGlow; varying float vGlow;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vGlow = aGlow;`),n.fragmentShader=n.fragmentShader.replace("#include <common>",`#include <common>
varying float vGlow;`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
totalEmissiveRadiance *= vGlow;`)},e.customProgramCacheKey=()=>"bridge-steel-v1",e}class Es{constructor(t){this.extraSize=t}pos=[];nrm=[];col=[];extra=[];idx=[];bounds=new Be;get vertexCount(){return this.pos.length/3}get triangleCount(){return this.idx.length/3}vertex(t,e,n,i,o,r,a,l){if(this.pos.push(t,e,n),this.nrm.push(i,o,r),this.col.push(a[0],a[1],a[2]),this.extraSize)if(l)for(let c=0;c<this.extraSize;c++)this.extra.push(l[c]);else for(let c=0;c<this.extraSize;c++)this.extra.push(0);const h=this.bounds;return t<h.min.x&&(h.min.x=t),t>h.max.x&&(h.max.x=t),e<h.min.y&&(h.min.y=e),e>h.max.y&&(h.max.y=e),n<h.min.z&&(h.min.z=n),n>h.max.z&&(h.max.z=n),this.vertexCount-1}append(t){const e=this.vertexCount;for(const n of t.pos)this.pos.push(n);for(const n of t.nrm)this.nrm.push(n);for(const n of t.col)this.col.push(n);for(const n of t.extra)this.extra.push(n);for(const n of t.idx)this.idx.push(n+e);this.bounds.union(t.bounds)}addGeometry(t,e,n){const i=t.getAttribute("position"),o=t.getAttribute("normal"),r=this.vertexCount;for(let l=0;l<i.count;l++)this.vertex(i.getX(l),i.getY(l),i.getZ(l),o.getX(l),o.getY(l),o.getZ(l),e,n);const a=t.getIndex();if(a)for(let l=0;l<a.count;l++)this.idx.push(r+a.getX(l));else for(let l=0;l<i.count;l++)this.idx.push(r+l)}box(t,e,n,i,o,r,a,l,h,c=!1,d){if(!(o<=.005)){or.setFromEuler(bw.set(l,a,0,"YXZ")),iu.compose(Ts.set(t,e+o/2,n),or,Sw.set(i,o,r));for(const u of Mw){if(c&&u.n[1]!==0)continue;tn.set(u.n[0],u.n[1],u.n[2]).applyQuaternion(or);const p=this.vertexCount;for(const f of u.v)Ts.set(f[0],f[1],f[2]).applyMatrix4(iu),this.vertex(Ts.x,Ts.y,Ts.z,tn.x,tn.y,tn.z,h,d);this.idx.push(p,p+1,p+2,p,p+2,p+3)}}}cylinder(t,e,n,i,o,r,a,l=!0,h){if(o<=.005)return;const c=i/2,d=this.vertexCount;for(let u=0;u<=r;u++){const p=u/r*Math.PI*2,f=Math.cos(p),v=Math.sin(p);this.vertex(t+f*c,e,n+v*c,f,0,v,a,h),this.vertex(t+f*c,e+o,n+v*c,f,0,v,a,h)}for(let u=0;u<r;u++){const p=d+u*2,f=p+1,v=p+2,m=p+3;this.idx.push(p,f,v,f,m,v)}if(l){const u=this.vertex(t,e+o,n,0,1,0,a,h),p=this.vertexCount;for(let f=0;f<=r;f++){const v=f/r*Math.PI*2;this.vertex(t+Math.cos(v)*c,e+o,n+Math.sin(v)*c,0,1,0,a,h)}for(let f=0;f<r;f++)this.idx.push(u,p+f+1,p+f)}}disc(t,e,n,i,o,r,a,l){const h=this.vertex(t,e,n,0,1,0,a,l),c=this.vertexCount;for(let d=0;d<=r;d++){const u=d/r*Math.PI*2;this.vertex(t+Math.cos(u)*i,e,n+Math.sin(u)*o,0,1,0,a,l)}for(let d=0;d<r;d++)this.idx.push(h,c+d+1,c+d)}loft(t,e,n,i){for(let o=0;o<e.length-1;o++){const[r,a]=e[o],[l,h]=e[o+1],c=l-r,d=h-a,u=Math.hypot(c,d)||1,p=d/u,f=-c/u,v=Array.isArray(n[0])?n[Math.min(o,n.length-1)]:n,m=this.vertexCount;for(const w of t){const y=w.rx*p,x=f,b=w.rz*p;this.vertex(w.x+w.rx*r,w.y+a,w.z+w.rz*r,y,x,b,v,i),this.vertex(w.x+w.rx*l,w.y+h,w.z+w.rz*l,y,x,b,v,i)}let g=!1;t.length>1&&(Bl.fromArray(this.pos,m*3),su.fromArray(this.pos,(m+1)*3),ou.fromArray(this.pos,(m+3)*3),tn.subVectors(su,Bl).cross(ou.sub(Bl)),Ts.fromArray(this.nrm,m*3),g=tn.dot(Ts)<0);for(let w=1;w<t.length;w++){const y=m+(w-1)*2,x=y+1,b=m+w*2,M=b+1;g?this.idx.push(y,M,x,y,b,M):this.idx.push(y,x,M,y,M,b)}}}strut(t,e,n,i,o){da.subVectors(e,t);const r=da.length();if(r<.1)return;da.divideScalar(r),or.setFromUnitVectors(Ew,da);const a=this.vertexCount;for(let l=0;l<=6;l++){const h=l/6*Math.PI*2;tn.set(Math.cos(h),0,Math.sin(h)).applyQuaternion(or),this.vertex(t.x+tn.x*n,t.y+tn.y*n,t.z+tn.z*n,tn.x,tn.y,tn.z,i,o),this.vertex(e.x+tn.x*n,e.y+tn.y*n,e.z+tn.z*n,tn.x,tn.y,tn.z,i,o)}for(let l=0;l<6;l++){const h=a+l*2,c=h+1,d=h+2,u=h+3;this.idx.push(h,c,d,c,u,d)}}build(t){const e=new oe;e.setAttribute("position",new Mt(this.pos,3)),e.setAttribute("normal",new Mt(this.nrm,3)),e.setAttribute("color",new Mt(this.col,3)),e.setAttribute("uv",new _e(new Float32Array(this.vertexCount*2),2));let n=0;for(const[i,o]of t){const r=new Float32Array(this.vertexCount*o);for(let a=0;a<this.vertexCount;a++)for(let l=0;l<o;l++)r[a*o+l]=this.extra[a*this.extraSize+n+l];e.setAttribute(i,new _e(r,o)),n+=o}return e.setIndex(this.vertexCount>65535?new _e(new Uint32Array(this.idx),1):new _e(new Uint16Array(this.idx),1)),e.boundingBox=this.bounds.clone(),e.boundingSphere=this.bounds.getBoundingSphere(new Ne),e}}const Mw=[{n:[1,0,0],v:[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]]},{n:[-1,0,0],v:[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]]},{n:[0,1,0],v:[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]]},{n:[0,-1,0],v:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]},{n:[0,0,1],v:[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]},{n:[0,0,-1],v:[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]}],iu=new jt,or=new Xe,bw=new He,Ts=new C,Sw=new C,tn=new C,da=new C,Bl=new C,su=new C,ou=new C,Ew=new C(0,1,0);class Tw{constructor(t){this.steel=t}chunks=[];sun=null;cull=new Ad;sunDir=new C(0,1,0);seen=new Set;cameras=[];observe(t){t.isPerspectiveCamera&&this.seen.add(t)}update(t){!this.sun&&t&&(this.sun=t.children.find(o=>o.isDirectionalLight&&o.castShadow)??null);let e=10;this.sun&&(this.sunDir.subVectors(this.sun.position,this.sun.target.position),this.sunDir.lengthSq()>1e-6?this.sunDir.normalize():this.sunDir.set(0,1,0),e=this.sun.intensity);const n=Math.asin(Qt(this.sunDir.y,-1,1))*180/Math.PI,i=Math.max(1-St(2,10,n),1-St(.15,.6,e));if(this.steel.emissiveIntensity=gw*i,this.seen.size&&(this.cameras=[...this.seen],this.seen.clear()),!!this.cameras.length){for(const o of this.chunks){o.dist=1/0;for(const r of o.meshes)r.inView=!1,r.cast=0}for(const o of this.cameras){const r=o.position.x,a=o.position.z,l=Qt(o.position.y*9,5e3,12e3);this.cull.update(o,l,this.sunDir);for(const h of this.chunks){const c=Math.max(0,Math.hypot(h.center.x-r,h.center.z-a)-h.r);h.dist=Math.min(h.dist,c);for(const d of h.meshes)!d.inView&&this.cull.boxInView(d.box)&&(d.inView=!0),c<l&&(d.cast|=this.cull.boxCasterCascades(d.box,d.height))}}for(const o of this.chunks){for(const r of o.meshes){const a=Vs(r.cls,r.inView,r.cast),l=Ir(a);r.mesh.castShadow=l,r.mesh.visible=r.inView||l,r.mesh.layers.mask=a}o.steel&&(o.steel.geometry.setDrawRange(0,o.dist>pw?o.headIndices:1/0),o.dist>mw&&(o.steel.visible=!1))}}}}class Aw extends Ye{constructor(t){super(),this.culler=t}updateMatrixWorld(t){this.culler.update(this.parent),super.updateMatrixWorld(t)}}const ln=[1,1,1],As=[1.08,1.08,1.07],ru=[.86,.86,.86],Hl=[.78,.78,.79],au=[.5,.5,.52],lu=[.74,.75,.76],cu=[1.85,1.9,1.92],hu=[1,1,1],zi=[1,1,1],Cw=[.3,.3,.32],Rw=[.92,.9,.84];function Pw(s,t,e,n){const i=yw(e),o=_w(n),r=new Tw(o),a=new Aw(r),l=[],h=new Es(5),c=[0,0,0,0,0],d=vw,u=xw;for(const f of s.bridges){const v=hw(f.pts),m=f.width,g=m*.5,w=Qt(f.lanes*3.3,8,m-4),y=w*.5,x=W=>{const et=uw(f.pts,W);return{x:et.x,y:dw(f,s,W,v),z:et.z,rx:-et.dz,rz:et.dx,dx:et.dx,dz:et.dz,s:W}},b=W=>Math.atan2(W.dx,W.dz),M=f.archHeight>=20&&f.archLength>=350,S=!M&&f.archHeight>0&&f.archLength>=300,T=f.archT*v,_=M?Math.min(f.archLength*.5,300):S?f.archLength*.8:0,E=T-_/2,A=T+_/2,U=Math.max(1,Math.round(v/fw)),F=v/U,I=W=>Math.min(U-1,Math.max(0,Math.floor(W/F))),B=Array.from({length:U},()=>({struct:new Es(5),deck:new Es(5),steel:new Es(1),heads:new Es(1),tall:new Es(5),arch:new Es(1)})),k=Math.ceil(v/sr),P=[];for(let W=0;W<=k;W+=2){const et=x(Math.min(v,W*sr));P.push(new C(et.x,et.y,et.z))}if((k&1)===1){const W=x(v);P.push(new C(W.x,W.y,W.z))}l.push({id:f.id,pts:P,width:f.width,lanes:f.lanes,traffic:f.traffic});const H=f.lanes>=6?.3:0,G=[0,0,f.lanes,w,H];for(let W=0;W<U;W++){const et=W*F,X=Math.min(v,(W+1)*F),q=[x(et)];for(let j=(Math.floor(et/sr)+1)*sr;j<X-.01;j+=sr)q.push(x(j));q.push(x(X));const V=B[W],st=[[-g,is,0],[-y,is,0],[-y,is,1],[-y,.02,1],[-y,.02,0],[y,.02,0],[y,.02,-1],[y,is,-1],[y,is,0],[g,is,0]],ct=st.length,pt=V.deck.vertexCount;q.forEach((j,nt)=>{for(const[D,J,Z]of st)G[0]=D/y,G[1]=j.s,Z===0?V.deck.vertex(j.x+j.rx*D,j.y+J,j.z+j.rz*D,0,1,0,hu,G):V.deck.vertex(j.x+j.rx*D,j.y+J,j.z+j.rz*D,j.rx*Z,0,j.rz*Z,hu,G);if(nt>0){const D=pt+(nt-1)*ct,J=pt+nt*ct;for(let Z=0;Z<ct;Z+=2)V.deck.idx.push(D+Z,D+Z+1,J+Z,J+Z,D+Z+1,J+Z+1)}});const K=[[-g,is],[-g-.1,u-.24],[-g-.24,u],[-g-.42,u],[-g-.56,u-.24],[-g-.56,-.4],[-g-.24,-1.05],[-m*.31,-d],[m*.31,-d],[g+.24,-1.05],[g+.56,-.4],[g+.56,u-.24],[g+.42,u],[g+.24,u],[g+.1,u-.24],[g,is]],ot=[ln,As,As,As,ln,ru,Hl,Hl,Hl,ru,ln,As,As,As,ln];if(V.struct.loft(q,K,ot,c),H>0){const j=H;V.struct.loft(q,[[j,.02],[j,.3],[j*.4,.9],[-j*.4,.9],[-j,.3],[-j,.02]],[ln,ln,As,ln,ln],c)}for(let j=0;j<q.length-1;j++){const nt=q[j],D=s.heightAt(nt.x,nt.z);if(D<.3)continue;const J=D-.8,Z=nt.y-d+.15;Z-J<.3||nt.y-D>16||V.struct.box(nt.x,J,nt.z,m+.8,Z-J,q[j+1].s-nt.s+.4,b(nt),0,ln,!1,c)}for(let j=1;j<q.length;j++){const nt=q[j-1],D=q[j],J=Math.hypot(D.x-nt.x,D.y-nt.y,D.z-nt.z),Z=Math.atan2(D.x-nt.x,D.z-nt.z),rt=-Math.asin(Qt((D.y-nt.y)/J,-1,1));for(const dt of[-1,1]){const xt=(nt.x+D.x)/2+(nt.rx+D.rx)/2*(g+.33)*dt,ft=(nt.z+D.z)/2+(nt.rz+D.rz)/2*(g+.33)*dt;V.steel.box(xt,(nt.y+D.y)/2+u+.86,ft,.08,.08,J+.1,Z,rt,zi,!0),V.steel.box(xt,(nt.y+D.y)/2+u+.44,ft,.06,.06,J+.1,Z,rt,zi,!0)}}for(let j=Math.ceil(et/4)*4;j<X;j+=4){const nt=x(j),D=b(nt);for(const J of[-1,1])V.steel.box(nt.x+nt.rx*(g+.33)*J,nt.y+u,nt.z+nt.rz*(g+.33)*J,.12,.9,.12,D,0,zi,!0)}for(let j=22,nt=0;j<v-20;j+=45,nt++){if(I(j)!==W)continue;const D=x(j),J=nt%2===0?-1:1,Z=b(D),rt=D.x+D.rx*(g+.33)*J,dt=D.z+D.rz*(g+.33)*J;V.steel.cylinder(rt,D.y+u,dt,.2,9,6,zi,!1);const xt=D.x+D.rx*(g+.33-1.25)*J,ft=D.z+D.rz*(g+.33-1.25)*J;V.steel.box(xt,D.y+u+8.85,ft,2.5,.16,.16,Z,0,zi,!0);const z=D.x+D.rx*(g+.33-2.35)*J,R=D.z+D.rz*(g+.33-2.35)*J;V.heads.box(z,D.y+u+8.62,R,.8,.26,.5,Z,0,Rw,!1,[1])}}const N=m>=20?50:42,$=[];for(let W=N*.5;W<v-N*.3;W+=N)_>0&&W>E-12&&W<A+12||$.push(W);S&&$.push(E,A);for(const W of $){const et=x(W),X=s.heightAt(et.x,et.z);if(et.y-X<2.8)continue;const q=B[I(W)],V=b(et),st=et.y-d,ct=S&&(W===E||W===A),pt=ct?2.4:2,K=st-pt,ot=Math.min(X,-.5)-2.5,j=X<.2,nt=m+6.4,D=(J,Z,rt,dt,xt,ft)=>{if(j){q.struct.box(J,-1,Z,rt+2.4,1.6,dt+2.4,V,0,lu,!1,c),q.struct.disc(J,.05,Z,(rt+2.4)*.5+.9,(dt+2.4)*.5+.9,12,cu,c);const z=Math.min(xt,1.7);ft?q.struct.cylinder(J,.55,Z,rt,z-.55,12,au,!1,c):q.struct.box(J,.55,Z,rt,z-.55,dt,V,0,au,!0,c),ft?q.struct.cylinder(J,z,Z,rt,xt-z,12,ln,!1,c):q.struct.box(J,z,Z,rt,xt-z,dt,V,0,ln,!0,c)}else ft?q.struct.cylinder(J,ot,Z,rt,xt-ot,12,ln,!1,c):q.struct.box(J,ot,Z,rt,xt-ot,dt,V,0,ln,!0,c)};if(m>=20||ct){const J=ct?m*.7:m*.5,Z=ct?3.2:2.2;D(et.x,et.z,J,Z,K,!1),q.struct.box(et.x,K,et.z,nt,pt,Z+1,V,0,ln,!1,c)}else{for(const J of[-m*.3,m*.3])D(et.x+et.rx*J,et.z+et.rz*J,2.4,2.4,K,!0);q.struct.box(et.x,K,et.z,m+5.6,pt,2.6,V,0,ln,!1,c)}q.steel.box(et.x,et.y+.03,et.z,w,.04,.3,V,0,Cw,!1)}if(M){const W=.24*_+10,et=3.2,X=4.8,q=g+1.9,V=_>=240?9:7,st=(_/2-16)/V;for(const ct of[E,A]){const pt=B[I(ct)],K=x(ct),ot=s.heightAt(K.x,K.z),j=b(K),nt=Math.min(ot,-.5)-3;for(const D of[-1,1]){const J=K.x+K.rx*q*D,Z=K.z+K.rz*q*D;pt.tall.box(J,nt,Z,et,K.y+W-nt,X,j,0,ln,!1,c),ot<.2&&(pt.struct.box(J,-1.2,Z,et+3,1.9,X+3,j,0,lu,!1,c),pt.struct.disc(J,.05,Z,(et+3)*.5+1,(X+3)*.5+1,12,cu,c))}pt.struct.box(K.x,K.y-d-2.2,K.z,2*q+et,2.2,X,j,0,ln,!1,c),pt.tall.box(K.x,K.y+W-5,K.z,2*q+et,3.6,X*.7,j,0,ln,!1,c);for(let D=1;D<=V;D++)for(const J of[-1,1]){const Z=ct+J*(D*st+10);if(Z<4||Z>v-4)continue;const rt=x(Z),dt=K.y+W-3-(V-D)*(.45*W/V);for(const xt of[-1,1]){const ft=new C(rt.x+rt.rx*(g+.36)*xt,rt.y+1.1,rt.z+rt.rz*(g+.36)*xt),z=new C(K.x+K.rx*(q-et*.5+.1)*xt,dt,K.z+K.rz*(q-et*.5+.1)*xt);pt.arch.strut(ft,z,.11,zi)}}}}else if(S){const W=B[I(T)],et=f.archHeight*.95+4,X=g+1,q=[[],[]],V=28;for(let st=0;st<=V;st++){const ct=st/V,pt=x(E+_*ct),K=pt.y+et*Math.sin(ct*Math.PI)+.8;for(const ot of[-1,1]){const j=new C(pt.x+pt.rx*X*ot,K,pt.z+pt.rz*X*ot);q[ot<0?0:1].push(j),st%2===1&&st>1&&st<V-1&&W.arch.strut(new C(j.x,pt.y+u+.2,j.z),j,.11,zi)}(st===8||st===14||st===20)&&W.arch.box(pt.x,K-.7,pt.z,2*X,1.2,1.2,b(pt),0,zi,!1)}for(const st of q){const ct=new lh(new dd(st),56,1.15,8,!1);W.arch.addGeometry(ct,zi),ct.dispose()}}for(let W=0;W<U;W++){const et=B[W];h.append(et.deck);const X={meshes:[],steel:null,headIndices:0,center:new C,r:0,dist:1/0},q=new Be,V=(K,ot)=>{K.name=`${f.id}#${W}`,K.castShadow=!0,K.receiveShadow=!0,K.onBeforeRender=(nt,D,J)=>{r.observe(J)};const j=K.geometry.boundingBox;X.meshes.push({mesh:K,cls:ot,box:j,height:j.max.y-j.min.y,inView:!0,cast:ks}),q.union(j),a.add(K)},st=et.struct.idx.length;et.struct.append(et.deck);const ct=new pe(et.struct.build([["aRoadUv",2],["aRoadInfo",3]]),i);if(ct.onBeforeShadow=(K,ot,j)=>{r.observe(j),ct.geometry.setDrawRange(0,st)},ct.onAfterShadow=()=>{ct.geometry.setDrawRange(0,1/0)},V(ct,"all"),et.heads.idx.length||et.steel.idx.length){const K=et.heads.idx.length;et.heads.append(et.steel);const ot=new pe(et.heads.build([["aGlow",1]]),o);V(ot,"near"),X.steel=ot,X.headIndices=K}et.tall.idx.length&&V(new pe(et.tall.build([["aRoadUv",2],["aRoadInfo",3]]),i),"all"),et.arch.idx.length&&V(new pe(et.arch.build([["aGlow",1]]),o),M?"near":"all");const pt=q.getBoundingSphere(new Ne);X.center.copy(pt.center),X.r=pt.radius,r.chunks.push(X)}}const p=h.build([["aRoadUv",2],["aRoadInfo",3]]);return{group:a,routes:l,deckGeometry:p,lampPositions:[]}}function Lw(s){const t=new ce({color:16777215,roughness:.7,metalness:0});return t.onBeforeCompile=e=>{e.uniforms.uNight=s,e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
attribute vec3 aDims;
attribute vec4 aStyle;
attribute vec4 aStyle2;
attribute float aPart;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec3 vDims;
varying vec4 vStyle;
varying vec4 vStyle2;
varying vec3 vWorldPosF;`).replace("#include <begin_vertex>",`#include <begin_vertex>
{
  float form = aStyle2.w;
  if (aPart > 0.5) {
    if (form > 1.5) {
      // flat roof: the body keeps its full height and the roof prism collapses to a point
      if (aPart > 1.5) transformed = vec3(0.0, 1.0, 0.0);
    } else {
      if (aPart < 1.5) transformed.y = 0.68;                        // body top tucks under the roof
      else if (aPart > 2.5 && form > 0.5) transformed.z *= 0.42;    // hip roof: shortened ridge
    }
  }
}
vLocal = transformed;
vLocalN = normal;
vDims = aDims;
vStyle = aStyle;
vStyle2 = aStyle2;
vWorldPosF = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;`),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
uniform float uNight;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec3 vDims;
varying vec4 vStyle;
varying vec4 vStyle2;
varying vec3 vWorldPosF;
${jn}
vec3 roofPalette(float k) {
  if (k < 0.5) return vec3(0.60, 0.31, 0.20);      // terracotta
  if (k < 1.5) return vec3(0.36, 0.36, 0.37);      // grey shingle
  if (k < 2.5) return vec3(0.88, 0.87, 0.84);      // white membrane
  if (k < 3.5) return vec3(0.40, 0.29, 0.22);      // brown
  if (k < 4.5) return vec3(0.20, 0.42, 0.40);      // teal metal
  if (k < 5.5) return vec3(0.56, 0.56, 0.57);      // gravel
  if (k < 6.5) return vec3(0.76, 0.66, 0.50);      // sandy tile
  return vec3(0.52, 0.22, 0.16);                   // dark red tile
}
`).replace("#include <metalnessmap_fragment>",`#include <metalnessmap_fragment>
{
  float style = vStyle.x;
  float floorH = max(vStyle.y, 2.6);
  float seed = vStyle.z;
  float litFrac = vStyle2.x;
  float warmMix = vStyle2.y;
  float variant = vStyle2.z;
  vec3 wall = diffuseColor.rgb; // instance colour
  vec3 meters = vec3((vLocal.x + 0.5) * vDims.x, vLocal.y * vDims.y, (vLocal.z + 0.5) * vDims.z);
  bool isTop = vLocalN.y > 0.6;
  bool isRoofSlope = vLocalN.y > 0.25 && vLocalN.y <= 0.6;
  float sideX = abs(vLocalN.x);
  float u = sideX > 0.5 ? meters.z : meters.x;
  float v = meters.y;
  float facadeSeed = seed + floor(sideX + 0.5) * 3.7 + step(0.0, vLocalN.x + vLocalN.z) * 11.1;
  bool glassy = style < 0.5 || style == 8.0 || style == 9.0;
  // thin, tall concrete frusta are the spires / masts on the crowns
  bool mast = style == 6.0 && vDims.x < 10.0 && vDims.y > 12.0 && vDims.y > vDims.x * 3.0;
  vec3 glassDark = vec3(0.07, 0.10, 0.13);
  vec3 col = wall;
  float rough = 0.75;
  float metal = 0.0;
  vec3 emis = vec3(0.0);
  float grime = fbm3(vWorldPosF.xz * 0.11 + vWorldPosF.y * 0.07);
  if (isTop) {
    if (style == 5.0) {
      col = roofPalette(vStyle.w) * (0.9 + 0.2 * vnoise(vWorldPosF.xz * 1.5));
      rough = 0.85;
    } else if (style == 12.0) {
      // pool water
      col = vec3(0.14, 0.60, 0.72) * (0.92 + 0.16 * vnoise(vWorldPosF.xz * 1.3));
      rough = 0.06; metal = 0.25;
    } else if (style == 13.0) {
      // helipad: dark pad, white ring and H
      vec2 c = meters.xz - vDims.xz * 0.5;
      float r = length(c) / (vDims.x * 0.5);
      float ring = step(0.82, r) * step(r, 0.94);
      float hBar = step(abs(c.x), vDims.x * 0.2) * step(abs(c.y), vDims.x * 0.045);
      float hLegs = step(abs(c.y), vDims.x * 0.28) * step(abs(abs(c.x) - vDims.x * 0.2), vDims.x * 0.045);
      col = mix(vec3(0.24, 0.25, 0.26), vec3(0.9), clamp(ring + hBar + hLegs, 0.0, 1.0) * 0.85);
      rough = 0.8;
    } else if (style == 4.0) {
      col = vec3(0.52, 0.53, 0.54) * (0.9 + 0.2 * vnoise(vWorldPosF.xz * 0.4));
      // skylight strips on warehouses
      float sky = step(0.8, fract(meters.z / 12.0)) * step(2.0, meters.x) * step(meters.x, vDims.x - 2.0);
      col = mix(col, vec3(0.75, 0.8, 0.85), sky * 0.7);
      rough = 0.7;
    } else {
      // tower roofs: dark membrane on glass / stone / brick, pale on concrete and stucco
      vec3 base = glassy ? vec3(0.26, 0.27, 0.28) : style == 10.0 ? vec3(0.30, 0.29, 0.28) : style == 6.0 ? vec3(0.55, 0.55, 0.56) : style == 3.0 ? mix(vec3(0.74, 0.72, 0.68), wall, 0.35) : vec3(0.74, 0.74, 0.72);
      col = base * (0.85 + 0.3 * vnoise(vWorldPosF.xz * 0.6));
      // parapet edge and mechanical pads
      float edgeD = min(min(meters.x, vDims.x - meters.x), min(meters.z, vDims.z - meters.z));
      col = mix(col * 0.7, col, smoothstep(0.6, 1.4, edgeD));
      col = mix(col, col * 0.55, step(0.62, hash12(floor(vWorldPosF.xz / 6.0) + seed)) * 0.3);
      rough = 0.9;
      // aviation beacon on the tallest roofs
      if (vDims.y > 140.0) {
        float dc = length(meters.xz - vDims.xz * 0.5);
        emis += vec3(1.0, 0.08, 0.04) * step(dc, 1.0) * 5.0 * uNight;
      }
    }
  } else if (isRoofSlope) {
    if (style == 5.0) {
      col = roofPalette(vStyle.w) * (0.88 + 0.24 * vnoise(vWorldPosF.xz * 2.0 + vWorldPosF.y));
      col *= 0.92 + 0.08 * step(0.5, fract(v / 0.35));
      rough = 0.85;
    } else {
      // tapered crowns: glass on glass towers (lit from inside at night), painted metal elsewhere
      col = style < 0.5 ? vec3(0.26, 0.36, 0.48) : style == 8.0 ? vec3(0.2, 0.38, 0.36) : wall * 0.8;
      rough = glassy ? 0.1 : 0.5;
      metal = glassy ? 0.85 : 0.2;
      emis = vec3(1.0, 0.85, 0.6) * (glassy ? 0.9 : 0.12) * uNight;
    }
  } else if (vLocalN.y < -0.5) {
    col = wall * 0.5;
  } else {
    float floorIdx = floor(v / floorH);
    float fy = fract(v / floorH);
    float winW = style < 0.5 ? 1.5 : style < 1.5 ? 3.2 : style < 2.5 ? 3.6 : style < 3.5 ? 3.0 : style < 4.5 ? 8.0 : style < 5.5 ? 3.4 : style < 6.5 ? 9.0 : style < 7.5 ? 3.9 : style < 8.5 ? 6.0 : style < 9.5 ? 4.2 : style < 10.5 ? 3.4 : 2.8;
    winW *= 0.85 + 0.3 * variant;
    float fx = fract(u / winW);
    float colIdx = floor(u / winW);
    // window pattern LOD: fade to the average when the pattern is sub-pixel
    float px = fwidth(u / winW) + fwidth(v / floorH);
    float lod = clamp(px * 1.6, 0.0, 1.0);
    // night lighting: per-building lit fraction and warm/cool mix; offices light whole floors
    float nightOn = smoothstep(0.05, 0.5, uNight);
    float wHash = hash12(vec2(colIdx * 1.31 + facadeSeed, floorIdx * 0.77 + seed));
    float fHash = hash11(floorIdx * 0.913 + seed * 0.37);
    float thr = 1.0 - litFrac;
    float office = (glassy || style == 11.0) ? 1.0 : 0.0;
    float lit = mix(step(thr, wHash), max(step(thr + 0.12, fHash) * step(0.2, wHash), step(thr + 0.5, wHash)), office);
    lit = min(lit, 1.0) * nightOn;
    vec3 litCol = mix(vec3(0.78, 0.87, 1.0), vec3(1.0, 0.74, 0.42), step(1.0 - warmMix, hash11(wHash * 17.0 + seed)));
    if (mast) {
      // slender painted spires / masts: pale paint, a red beacon at the tip and a floodlit glow at night
      col = wall * (0.94 + 0.08 * vnoise(vWorldPosF.xz * 3.0 + v * 2.0));
      rough = 0.45; metal = 0.15;
      float tip = smoothstep(vDims.y - 2.5, vDims.y - 1.0, v);
      emis = vec3(1.0, 0.1, 0.05) * tip * 4.0 * uNight + vec3(1.0, 0.78, 0.5) * 0.2 * uNight;
    } else if (style < 0.5) {
      // blue curtain wall: reflective panes between dark spandrels. The pane colour is a pale cool grey-blue with
      // high metalness so the environment map (sky above, haze toward the horizon) reads as a gradient on the tower;
      // panes stay well below the masonry families in brightness so the two read as different materials.
      float mull = step(fx, 0.05) + step(0.95, fx) + step(fy, 0.05);
      float spandrel = step(fy, 0.16 + 0.12 * variant);
      float glass = 1.0 - clamp(mull + spandrel, 0.0, 1.0);
      vec3 tint = mix(vec3(0.34, 0.44, 0.56), vec3(0.22, 0.32, 0.46), variant);
      vec3 spandrelCol = mix(wall * 0.42, vec3(0.06, 0.08, 0.12), step(0.5, hash11(seed * 5.3)));
      col = mix(mix(spandrelCol, wall * 0.3, clamp(mull, 0.0, 1.0)), tint, glass);
      col = mix(col, mix(spandrelCol, tint, 0.72), lod);
      rough = mix(0.5, 0.06, glass);
      metal = glass * 0.88 * (1.0 - 0.25 * lod);
      emis = litCol * lit * glass * 1.4;
    } else if (style < 1.5 || style > 6.5 && style < 7.5) {
      // punched windows on plaster / hotel slab with balconies
      float wx = step(0.22, fx) * step(fx, 0.78);
      float wy = step(0.25, fy) * step(fy, 0.82);
      float glass = wx * wy;
      if (style > 6.5) { glass = step(0.1, fx) * step(fx, 0.9) * step(0.2, fy) * step(fy, 0.9); }
      col = mix(wall, glassDark, glass);
      // sill shadow under each window
      col *= 1.0 - 0.15 * wx * step(0.18, fy) * step(fy, 0.25);
      col = mix(col, mix(wall, glassDark, 0.4), lod);
      rough = mix(0.8, 0.2, glass);
      metal = glass * 0.7 * (1.0 - lod);
      emis = litCol * lit * glass * 1.6;
      if (style > 6.5) { float slab = step(fy, 0.12); col = mix(col, vec3(0.9, 0.9, 0.88), slab * (1.0 - lod)); rough = mix(rough, 0.8, slab); }
    } else if (style < 2.5) {
      // balcony bands: light slab edge, dark recessed glass, railing line
      float slab = step(fy, 0.14);
      float rail = step(0.14, fy) * step(fy, 0.42) * step(0.08, fx) * step(fx, 0.92);
      float glass = step(0.42, fy) * step(fy, 0.95) * step(0.08, fx) * step(fx, 0.92);
      col = mix(wall * 0.9, vec3(0.94, 0.93, 0.9), slab);
      col = mix(col, glassDark * 1.2, glass);
      col = mix(col, wall * 0.75, rail * 0.6);
      col = mix(col, mix(wall, glassDark, 0.45), lod);
      rough = mix(0.8, 0.25, glass);
      metal = glass * 0.6 * (1.0 - lod);
      emis = litCol * lit * glass * 1.3;
    } else if (style < 3.5) {
      // art deco: pastel stucco, horizontal band each floor, vertical fins, small windows, accent every 4 floors
      float fin = step(fx, 0.08);
      float band = step(fy, 0.09);
      float wx = step(0.3, fx) * step(fx, 0.72);
      float wy = step(0.28, fy) * step(fy, 0.8);
      float glass = wx * wy;
      vec3 bandCol = mix(vec3(0.96, 0.95, 0.9), wall * 0.78, step(0.5, variant));
      col = mix(wall, wall * 1.1, fin);
      col = mix(col, glassDark, glass);
      col = mix(col, bandCol, band);
      col = mix(col, vec3(0.96, 0.95, 0.9), step(fract(floorIdx / 4.0), 0.05) * step(fy, 0.16));
      col = mix(col, mix(wall, glassDark, 0.3), lod);
      rough = mix(0.85, 0.25, glass);
      metal = glass * 0.6 * (1.0 - lod);
      emis = litCol * lit * glass * 1.5;
    } else if (style < 4.5) {
      // industrial: corrugated metal, sparse high windows, roll-up doors at ground
      float corr = 0.5 + 0.5 * sin(u * 6.28 * 1.2);
      col = wall * (0.9 + 0.1 * corr * (1.0 - lod));
      float win = step(0.3, fx) * step(fx, 0.7) * step(0.55, fy) * step(fy, 0.8) * step(0.5, hash12(vec2(colIdx, facadeSeed)));
      float door = step(fy, 0.45) * step(0.15, fx) * step(fx, 0.85) * step(floorIdx, 0.5) * step(0.6, hash12(vec2(colIdx + 3.0, facadeSeed)));
      col = mix(col, vec3(0.5, 0.6, 0.65), win * 0.8);
      col = mix(col, wall * 0.55, door);
      col *= 1.0 - 0.2 * smoothstep(0.5, 0.8, grime) * (1.0 - smoothstep(0.0, 4.0, v));
      rough = 0.55; metal = 0.35;
    } else if (style < 5.5) {
      // houses: stucco, windows with white trim, a door
      float wx = step(0.3, fx) * step(fx, 0.7);
      float wy = step(0.3, fy) * step(fy, 0.75);
      float glass = wx * wy * step(0.35, hash12(vec2(colIdx, facadeSeed)));
      float trim = (step(0.25, fx) * step(fx, 0.75) * step(0.25, fy) * step(fy, 0.8)) - glass;
      col = wall * (0.95 + 0.1 * vnoise(vWorldPosF.xz * 2.0 + v));
      col = mix(col, vec3(0.95), trim * 0.7);
      col = mix(col, glassDark, glass);
      col = mix(col, wall, lod);
      rough = mix(0.85, 0.3, glass);
      metal = glass * 0.5 * (1.0 - lod);
      emis = litCol * lit * glass * 1.2;
    } else if (style < 6.5) {
      // plain concrete (parking / utility / podiums)
      col = wall * (0.9 + 0.2 * vnoise(vWorldPosF.xz * 0.5 + v * 0.3));
      float slot = step(0.55, fy) * step(fy, 0.9);
      col = mix(col, col * 0.4, slot * 0.8 * (1.0 - 0.5 * lod));
      rough = 0.85;
    } else if (style < 8.5) {
      // green ribbon glass: continuous glass bands between pale spandrels
      float band = step(0.26, fy) * step(fy, 0.97);
      float mull = step(fract(u / 6.0), 0.03);
      float glass = band * (1.0 - mull);
      vec3 tint = mix(vec3(0.18, 0.36, 0.34), vec3(0.24, 0.42, 0.42), variant);
      col = mix(wall, tint, glass);
      col = mix(col, mix(wall, tint, 0.68), lod);
      rough = mix(0.6, 0.08, glass);
      metal = glass * 0.88 * (1.0 - 0.3 * lod);
      emis = litCol * lit * glass * 1.3;
    } else if (style < 9.5) {
      // dark stone piers with bronze vertical strip windows
      float hs = 0.2 + 0.08 * variant;
      float strip = step(0.5 - hs, fx) * step(fx, 0.5 + hs) * step(0.1, fy);
      vec3 stone = wall * (0.92 + 0.16 * vnoise(vWorldPosF.xz * 0.9 + v * 0.7));
      vec3 bronze = vec3(0.13, 0.10, 0.075);
      col = mix(stone, bronze, strip);
      col = mix(col, mix(stone, bronze, 0.5), lod);
      rough = mix(0.55, 0.15, strip);
      metal = strip * 0.8 * (1.0 - 0.3 * lod);
      emis = litCol * lit * strip * 1.2;
    } else if (style < 10.5) {
      // brick mid-rise: running bond, punched windows with stone lintels, shopfronts at street level
      float row = floor(v / 0.075);
      float brick = hash12(vec2(floor(u / 0.24 + 0.5 * mod(row, 2.0)), row));
      vec3 bcol = wall * (0.86 + 0.28 * brick);
      float wx = step(0.28, fx) * step(fx, 0.72);
      float wy = step(0.22, fy) * step(fy, 0.78);
      float glass = wx * wy;
      float lintel = wx * step(0.78, fy) * step(fy, 0.86);
      float ground = step(floorIdx, 0.5);
      glass = max(glass, ground * step(0.08, fx) * step(fx, 0.92) * step(0.05, fy) * step(fy, 0.85) * step(0.35, hash12(vec2(colIdx, facadeSeed))));
      col = mix(bcol, glassDark, glass);
      col = mix(col, vec3(0.8, 0.78, 0.72), lintel);
      col = mix(col, mix(bcol, glassDark, 0.35), lod);
      rough = mix(0.9, 0.2, glass);
      metal = glass * 0.6 * (1.0 - lod);
      emis = litCol * lit * glass * 1.4;
    } else if (style < 11.5) {
      // white egg-crate frame with deeply recessed glass
      float frame = 1.0 - step(0.12, fx) * step(fx, 0.88) * step(0.14, fy) * step(fy, 0.9);
      float glass = 1.0 - frame;
      float recess = 0.4 * smoothstep(0.62, 0.9, fy) + 0.15 * smoothstep(0.7, 0.88, fx);
      vec3 g = mix(glassDark * 1.3, glassDark * 0.45, recess);
      col = mix(g, wall, frame);
      col = mix(col, mix(wall, glassDark, 0.42), lod);
      rough = mix(0.25, 0.8, frame);
      metal = glass * 0.6 * (1.0 - lod);
      emis = litCol * lit * glass * 1.3;
    } else if (style < 12.5) {
      // pool sides: pale tile
      col = vec3(0.85, 0.9, 0.9);
      rough = 0.4;
    } else {
      col = wall;
      rough = 0.8;
    }
    // ground floor: darker plinth / shopfronts, streaks of grime under sills
    col *= 1.0 - 0.18 * smoothstep(0.55, 0.85, grime) * (1.0 - smoothstep(2.0, 12.0, v));
    col = mix(col, col * 0.8, step(v, 0.8));
    // crown lighting on about two thirds of the tall towers at night: a lit band just below the roof line, warm,
    // cool or (rarely) magenta, brighter than the windows so the skyline keeps its hierarchy after dark
    if (vDims.y > 110.0 && hash11(seed * 1.9 + 3.1) < 0.66) {
      float crown = smoothstep(vDims.y - 7.0, vDims.y - 5.0, v) * (1.0 - smoothstep(vDims.y - 1.0, vDims.y, v));
      float pick = hash11(seed * 2.7);
      vec3 crownCol = pick < 0.5 ? vec3(1.0, 0.85, 0.6) : pick < 0.88 ? vec3(0.4, 0.8, 1.0) : vec3(1.0, 0.35, 0.7);
      emis += crownCol * crown * 8.0 * uNight;
    }
  }
  diffuseColor.rgb = col;
  roughnessFactor = rough;
  metalnessFactor = metal;
  totalEmissiveRadiance += emis;
}`)},t.customProgramCacheKey=()=>"facade-v3",t}function zr(s,t){const e=s.getAttribute("position"),n=new Float32Array(e.count);for(let i=0;i<e.count;i++)n[i]=t(e.getX(i),e.getY(i),e.getZ(i));return s.setAttribute("aPart",new _e(n,1)),s.getAttribute("uv")||s.setAttribute("uv",new _e(new Float32Array(e.count*2),2)),s}function Dw(){const s=new kt(1,1,1);return s.translate(0,.5,0),zr(s,()=>0)}function uu(s,t){const e=new be(.5,.5,1,s,1,!1,t);return e.translate(0,.5,0),zr(e,()=>0)}function Iw(s=.3){const t=new kt(1,1,1),e=t.getAttribute("position");for(let n=0;n<e.count;n++)e.getY(n)>0&&(e.setX(n,e.getX(n)*s),e.setZ(n,e.getZ(n)*s));return t.translate(0,.5,0),t.computeVertexNormals(),zr(t,()=>0)}function zw(){const s=new kt(1,1,1),t=s.getAttribute("position");for(let e=0;e<t.count;e++)t.getY(e)>0&&(t.setX(e,t.getX(e)*.55+.22),t.setZ(e,t.getZ(e)*.8));return s.translate(0,.5,0),s.computeVertexNormals(),zr(s,()=>0)}function Nw(){const s=new kt(1,1,1);s.translate(0,.5,0);const e=.5+.08,n=.66,i=[-e,n,-e],o=[e,n,-e],r=[e,n,e],a=[-e,n,e],l=[0,1,-e],h=[0,1,e],c=(f,v,m)=>[...f,...v,...m],d=new Float32Array([...c(i,l,h),...c(i,h,a),...c(o,r,h),...c(o,h,l),...c(i,o,l),...c(a,h,r)]),u=new oe;u.setAttribute("position",new _e(d,3)),u.computeVertexNormals();const p=Uw([s,u]);return zr(p,(f,v,m)=>v>.99?Math.abs(f)<.01?3:1:v>.6&&v<.7&&Math.abs(f)>.55?2:0)}function Uw(s){const t=[],e=[];for(const i of s){const o=i.index?i.toNonIndexed():i,r=o.getAttribute("position"),a=o.getAttribute("normal");for(let l=0;l<r.count;l++)t.push(r.getX(l),r.getY(l),r.getZ(l)),e.push(a.getX(l),a.getY(l),a.getZ(l))}const n=new oe;return n.setAttribute("position",new Mt(t,3)),n.setAttribute("normal",new Mt(e,3)),n.setAttribute("uv",new Mt(new Float32Array(t.length/3*2),2)),n}const Fw=14,kw=new Array(yi).fill(0);class Ow{group=new Ye;lists=new Map;geos;material;count=0;tileSize=1500;tileOx=-3400;tileOz=-4520;tiles=[];proxies=[];shadowDistance=3200;constructor(t){this.material=Lw(t),this.geos={box:Dw(),cyl:uu(16,0),oct:uu(8,Math.PI/8),frustum:Iw(.3),shear:zw(),house:Nw()}}add(t,e){const n=Math.floor((e.x-this.tileOx)/this.tileSize),i=Math.floor((e.z-this.tileOz)/this.tileSize),o=`${t}|${n}|${i}`;let r=this.lists.get(o);r||(r=[],this.lists.set(o,r)),r.push(e),this.count++}build(){const t=new jt,e=new Xe,n=new C,i=new C,o=new He;for(const[a,l]of this.lists){const h=a.split("|")[0],c=this.geos[h];c.boundingSphere===null&&c.computeBoundingSphere();const d=c.clone(),u=new Xi(d,this.material,l.length),p=new Float32Array(l.length*3),f=new Float32Array(l.length*4),v=new Float32Array(l.length*4),m=new Be;l.forEach((y,x)=>{n.set(y.x,y.y,y.z),e.setFromEuler(o.set(0,y.rot,0)),i.set(y.w,y.h,y.d),u.setMatrixAt(x,t.compose(n,e,i)),u.setColorAt(x,y.color),p[x*3]=y.w,p[x*3+1]=y.h,p[x*3+2]=y.d,f[x*4]=y.style,f[x*4+1]=y.floorH,f[x*4+2]=y.seed,f[x*4+3]=y.roof,v[x*4]=y.lit,v[x*4+1]=y.warm,v[x*4+2]=y.variant,v[x*4+3]=y.form;const b=Math.hypot(y.w,y.d)*.6;m.expandByPoint(n.set(y.x-b,y.y,y.z-b)),m.expandByPoint(n.set(y.x+b,y.y+y.h,y.z+b))}),d.setAttribute("aDims",new hs(p,3)),d.setAttribute("aStyle",new hs(f,4)),d.setAttribute("aStyle2",new hs(v,4));const g=m.getBoundingSphere(new Ne);u.boundingSphere=g,u.castShadow=!0,u.receiveShadow=!0,u.instanceMatrix.needsUpdate=!0,u.instanceColor&&(u.instanceColor.needsUpdate=!0),this.group.add(u);const w=Math.hypot(m.max.x-m.min.x,m.max.z-m.min.z)/2;this.tiles.push({mesh:u,box:m,center:g.center,r:g.radius,height:m.max.y-m.min.y,lodR:w,bits:0})}const r=new Map;for(const[a,l]of this.lists){const h=a.split("|")[0];let c=r.get(h);c||(c=[],r.set(h,c));for(const d of l)d.h>=Fw&&c.push(d)}for(const[a,l]of r){if(!l.length)continue;const h=new Xi(this.geos[a],this.material,l.length),c=new Be;l.forEach((d,u)=>{n.set(d.x,d.y,d.z),e.setFromEuler(o.set(0,d.rot,0)),i.set(d.w,d.h,d.d),h.setMatrixAt(u,t.compose(n,e,i));const p=Math.hypot(d.w,d.d)*.6;c.expandByPoint(n.set(d.x-p,d.y,d.z-p)),c.expandByPoint(n.set(d.x+p,d.y+d.h,d.z+p))}),h.boundingSphere=c.getBoundingSphere(new Ne),h.instanceMatrix.needsUpdate=!0,h.castShadow=!0,h.receiveShadow=!1,h.visible=!1,h.layers.mask=0,h.matrixAutoUpdate=!1,h.name=`shadow-proxy-${a}`,this.group.add(h),this.proxies.push(h)}}updateLod(t,e,n){const i=kw;i.fill(0);for(const r of this.tiles){const a=Math.max(0,Math.hypot(r.center.x-t,r.center.z-e)-r.lodR);r.bits=a<this.shadowDistance?n.casterCascades(r.center,r.r,r.height):0;for(let l=0;l<yi;l++)r.bits&1<<l&&i[l]++}let o=0;for(let r=0;r<yi;r++)i[r]>this.proxies.length+2&&(o|=1<<r);for(const r of this.tiles){const a=n.boxInView(r.box),l=Vs("all",a,r.bits&~o),h=Ir(l);r.mesh.castShadow=h,r.mesh.visible=a||h,r.mesh.layers.mask=l}for(const r of this.proxies)r.visible=r.castShadow=o!==0,r.layers.mask=o<<Dr}}const Bt={GLASS_BLUE:0,PUNCHED:1,BALCONY:2,DECO:3,INDUSTRIAL:4,HOUSE:5,CONCRETE:6,HOTEL:7,GLASS_GREEN:8,STONE:9,BRICK:10,GRID:11,POOL:12,HELIPAD:13},Os=["#f6f3ec","#f2efe6","#ffffff","#efe9dc","#f4f1ea","#e9e6df","#f8f6f1"],Aa=["#efe4cf","#f1e6cf","#e8dcc3","#f3ead6","#ecdfc4"],Ca=["#f2c9a8","#f0bfa0","#efd1b3","#f4b8a0","#f7cdb6","#eeb497"],Rd=["#efc0c6","#f3cfd4","#e9b7c0","#f7d5dc","#e8a9b3"],uh=["#cfe6dc","#bfe0d2","#d8ece2","#b6dccf"],dh=["#f5e6b3","#f2dfa1","#f8ecc4","#efd68e"],Pd=["#cfe0ec","#dbe8f0","#c3d7e6","#b9d3e3"],Bw=["#4a4541","#57504a","#3f3b38","#6a605a","#4d443c","#5d5955"],Hw=["#b98f6a","#a87e5c","#c49a74","#9c6f52","#c8a680","#b07b5b","#8e5e46"],ba=["#b9b9b4","#a7a9a8","#c6c6c1","#9da3a6","#b5b8ba"],Ld=[...Os,...Os,...Aa,...Ca,...Rd,...uh,...dh,...Pd,"#e6d2b8","#e8c9a0","#dfc7a6"],Gw=[...Os.slice(0,3),...Aa,...Ca,...dh,...uh,"#e6d2b8","#e8c9a0","#dfc7a6","#d9b98f","#c9a97c","#b9b28a","#cdbfa3","#d6c2a2","#a9b59a"],Kt={glassBlue:{style:Bt.GLASS_BLUE,floorH:3.9,tints:["#9fb6c8","#8fa9bd","#b0c4d2","#a7bccb","#8898a8","#c2d0da"],lit:[.18,.62],warm:[.15,.5]},glassGreen:{style:Bt.GLASS_GREEN,floorH:3.8,tints:["#f2f2ee","#e8ebe4","#ffffff","#dfe6e0","#e6e2d6","#d9dfd9"],lit:[.18,.58],warm:[.2,.5]},punched:{style:Bt.PUNCHED,floorH:3.3,tints:[...Os,...Aa],lit:[.2,.55],warm:[.6,.95]},balcony:{style:Bt.BALCONY,floorH:3.2,tints:[...Aa,...Os,"#efe0d3","#f0d9c2"],lit:[.2,.5],warm:[.7,.95]},deco:{style:Bt.DECO,floorH:3.4,tints:[...Ca,...Rd,...dh,...uh],lit:[.15,.5],warm:[.6,.9]},stone:{style:Bt.STONE,floorH:3.8,tints:Bw,lit:[.3,.7],warm:[.3,.6]},brick:{style:Bt.BRICK,floorH:3.4,tints:Hw,lit:[.2,.5],warm:[.7,.95]},grid:{style:Bt.GRID,floorH:3.5,tints:["#f7f5f0","#f1eee6","#ffffff","#ece9e1"],lit:[.25,.6],warm:[.3,.7]},hotel:{style:Bt.HOTEL,floorH:3.2,tints:[...Os,...Ca,...Pd],lit:[.3,.6],warm:[.6,.9]},concrete:{style:Bt.CONCRETE,floorH:3,tints:ba,lit:[0,0],warm:[.5,.5]},industrial:{tints:["#b8bcc0","#9aa3a8","#cfd3d6","#8e9aa0","#d8c9a8","#c4b89a","#a9b0b5"],lit:[.05,.2],warm:[.2,.4]},house:{tints:Ld,lit:[.2,.6],warm:[.8,1]}};function Ni(s,t){let e=0;for(const[,i]of t)e+=i;let n=s.next()*e;for(const[i,o]of t)if(n-=o,n<=0)return i;return t[t.length-1][0]}function Vw(s,t,e){const n=new Ow(e),i=new $e("city"),o=new Uint8Array(2e3*2e3),r=(x,b)=>{const M=Math.floor((x+1e4)/10),S=Math.floor((b+1e4)/10);return M<0||S<0||M>=2e3||S>=2e3?-1:S*2e3+M},a=(x,b,M)=>{const S=Math.ceil(M/10);for(let T=-S;T<=S;T++)for(let _=-S;_<=S;_++){const E=r(x+_*10,b+T*10);E>=0&&(o[E]=1)}},l=(x,b,M,S,T,_)=>{const E=M/2+_,A=S/2+_,U=Math.hypot(E,A)+8,F=Math.cos(T),I=Math.sin(T),B=Math.floor((x-U+1e4)/10),k=Math.floor((x+U+1e4)/10),P=Math.floor((b-U+1e4)/10),H=Math.floor((b+U+1e4)/10),G=(N,$)=>{const W=N*F+$*I,et=-N*I+$*F;return Math.abs(W)<=E&&Math.abs(et)<=A};for(let N=P;N<=H;N++)for(let $=B;$<=k;$++){if($<0||N<0||$>=2e3||N>=2e3)continue;const W=$*10-1e4-x,et=N*10-1e4-b;(G(W+5,et+5)||G(W,et)||G(W+10,et)||G(W,et+10)||G(W+10,et+10))&&(o[N*2e3+$]=1)}},h=(x,b)=>{const M=r(x,b);return M>=0&&o[M]===1},c=[],d=(x,b,M,S,T)=>{const _=Math.cos(T),E=Math.sin(T),A=[];for(const[U,F]of[[-M/2,-S/2],[M/2,-S/2],[M/2,S/2],[-M/2,S/2],[0,0],[0,-S/2],[0,S/2],[-M/2,0],[M/2,0]])A.push([x+U*_-F*E,b+U*E+F*_]);return A},u=(x,b,M,S,T,_,E,A,U,F,I={})=>{let B=-1/0;for(const[H,G]of d(b,M,S,_,E))B=Math.max(B,s.heightAt(H,G));if(I.yBase!==void 0&&(B=I.yBase),B<.9)return null;const k=A instanceof Vt?A:new Vt(A);n.add(x,{x:b,y:B-.4,z:M,w:S,h:T+.4,d:_,rot:E,color:k,style:U,floorH:F,seed:i.range(0,1e3),roof:I.roof??5,lit:I.lit??.3,warm:I.warm??.7,variant:I.variant??.5,form:I.form??0});const P=I.margin??3;return P>=0&&l(b,M,S,_,E,P),B+T},p=(x,b,M,S,T)=>{for(const[_,E]of d(x,b,M,S,T))if(s.heightAt(_,E)<1.2)return!1;return!0},f=(x,b,M,S,T)=>{for(const[_,E]of d(x,b,M,S,T))if(h(_,E))return!1;return!0},v=(x,b)=>{const S=b.next()<.16?b.range(0,.04):se(x.lit[0],x.lit[1],Math.pow(b.next(),1.6));return{tint:b.pick(x.tints),lit:S,warm:b.range(x.warm[0],x.warm[1]),variant:b.next()}},m=(x,b,M,S,T,_,E,A,U)=>{const F=Math.cos(E),I=Math.sin(E),B=(G,N)=>[b+G*F-N*I,M+G*I+N*F],k=U.style===Bt.GLASS_BLUE||U.style===Bt.GLASS_GREEN||U.style===Bt.STONE,P=x.pick(ba);if(x.chance(.7)){const G=S*x.range(.25,.45),N=T*x.range(.3,.5),[$,W]=B(x.range(-S*.22,S*.22),x.range(-T*.2,T*.2));u("box",$,W,G,x.range(3,6),N,E,k?"#8d9296":P,Bt.CONCRETE,3,{yBase:_-.2,margin:-1})}const H=x.int(0,3);for(let G=0;G<H;G++){const[N,$]=B(x.range(-S*.35,S*.35),x.range(-T*.35,T*.35));u("box",N,$,x.range(2,4.5),x.range(1.5,3),x.range(2,4),E,P,Bt.CONCRETE,3,{yBase:_-.2,margin:-1})}if(A>40&&x.chance(.35)){const[G,N]=B(S*.25,-T*.25);u("cyl",G,N,3,3.5,3,E,"#c9c9c4",Bt.CONCRETE,3,{yBase:_-.2,margin:-1})}if(A>100&&x.chance(.22)){const G=Math.min(18,Math.min(S,T)*.5),[N,$]=B(-S*.18,T*.16);u("cyl",N,$,G,.5,G,E,"#444444",Bt.HELIPAD,3,{yBase:_,margin:-1})}if(A>120&&x.chance(.35)){const[G,N]=B(S*.3,T*.3);u("frustum",G,N,1.6,x.range(14,32),1.6,E,"#cfd8dc",Bt.CONCRETE,3,{yBase:_,margin:-1})}A>150&&x.chance(.3)&&u("frustum",b,M,4,x.range(25,50),4,E,"#e3e8ec",Bt.CONCRETE,3,{yBase:_,margin:-1})},g=(x,b,M,S,T,_,E,A,U,F=!0)=>{const I=v(A,x),B={lit:I.lit,warm:I.warm,variant:I.variant},k=Math.cos(S),P=Math.sin(S),H=(W,et)=>[b+W*k-et*P,M+W*P+et*k];let G=null,N=T,$=_;switch(U){case 1:{const W=x.range(.72,.85),et=x.range(.5,.65);u("box",b,M,T,E*x.range(.5,.62),_,S,I.tint,A.style,A.floorH,B),u("box",b,M,T*W,E*x.range(.78,.88),_*W,S,I.tint,A.style,A.floorH,B),G=u("box",b,M,T*et,E,_*et,S,I.tint,A.style,A.floorH,B),N=T*et,$=_*et;break}case 2:{N=Math.min(T,_)*.62,$=Math.max(T,_)*1.15,G=u("box",b,M,N,E,$,S,I.tint,A.style,A.floorH,B);break}case 3:{const W=H(-T*.2,0),et=H(T*.15,-_*.22);u("box",W[0],W[1],T*.6,E,_,S,I.tint,A.style,A.floorH,B),G=u("box",et[0],et[1],T*.7,E*x.range(.6,1),_*.56,S,I.tint,A.style,A.floorH,B),N=T*.6,$=_;break}case 4:{const W=T*.18,et=T*.41,X=H(-(et+W)/2,0),q=H((et+W)/2,0);u("box",X[0],X[1],et,E,_*.8,S,I.tint,A.style,A.floorH,B),G=u("box",q[0],q[1],et,E*x.range(.85,1),_*.8,S,I.tint,A.style,A.floorH,B),u("box",b,M,W+2,4,_*.4,S,"#dfe4e8",Bt.CONCRETE,3,{yBase:(G??0)-E*.45,margin:-1}),N=et,$=_*.8;break}case 5:{G=u("box",b,M,T,E*.88,_,S,I.tint,A.style,A.floorH,B);const W=v(Kt.glassBlue,x);G=u("box",b,M,T*.86,E,_*.86,S,W.tint,Bt.GLASS_BLUE,3.9,{lit:.7,warm:.3,variant:W.variant}),N=T*.86,$=_*.86;break}case 6:{const W=[[1,.55],[.86,.72],[.7,.88],[.5,1]];for(const[et,X]of W)G=u("box",b,M,T*et,E*X,_*et,S,I.tint,A.style,A.floorH,B);G!==null&&u("frustum",b,M,3.5,E*.18,3.5,S,"#e8e4dc",Bt.CONCRETE,3,{yBase:G,margin:-1}),N=T*.5,$=_*.5;break}case 7:{const W=x.chance(.45)?"cyl":"oct";N=$=Math.min(T,_),G=u(W,b,M,N,E,$,S,I.tint,A.style,A.floorH,B);break}case 8:{G=u("box",b,M,T,E*.9,_,S,I.tint,A.style,A.floorH,B),G!==null&&(u("frustum",b,M,T,E*.1+6,_,S,I.tint,A.style,A.floorH,{...B,yBase:G-.1,margin:-1}),F=!1);break}default:G=u("box",b,M,T,E,_,S,I.tint,A.style,A.floorH,B)}if(G!==null&&F){const[W,et]=U===3?H(-T*.2,0):U===4?H((T*.41+T*.18)/2,0):[b,M];m(x,W,et,N,$,G,S,E,A)}return G},w=s.districts.find(x=>x.id==="downtown"),y=(x,b,M,S)=>{const T=Math.cos(w.rot),_=Math.sin(w.rot),E=w.cx+b*T-M*_,A=w.cz+b*_+M*T,U=s.heightAt(E,A);if(U<1)return;const F=S(E,A,U);c.push({x:E,z:A,h:F,name:x}),a(E,A,46)};y("Meridian Tower",120,-80,(x,b,M)=>{const S={lit:.5,warm:.3,variant:.2};return u("box",x,b,46,150,46,.1,"#9fb6c8",Bt.GLASS_BLUE,3.9,S),u("box",x,b,38,230,38,.1,"#9fb6c8",Bt.GLASS_BLUE,3.9,S),u("box",x,b,28,285,28,.1,"#b0c4d2",Bt.GLASS_BLUE,3.9,S),u("box",x,b,18,12,18,.1,"#c2d0da",Bt.GLASS_BLUE,3.9,{yBase:M+285,lit:.9,warm:.2,variant:.5,margin:-1}),u("frustum",x,b,9,64,9,.1,"#e8eef2",Bt.CONCRETE,3,{yBase:M+297,margin:-1}),361}),y("Bahía One",-40,70,(x,b,M)=>{const S={lit:.55,warm:.25,variant:.8};return u("oct",x,b,46,262,46,.05,"#8898a8",Bt.GLASS_BLUE,3.9,S),u("frustum",x,b,42,36,42,.05,"#8898a8",Bt.GLASS_BLUE,3.9,{...S,yBase:M+262,margin:-1}),u("frustum",x,b,4,38,4,.05,"#cfd8dc",Bt.CONCRETE,3,{yBase:M+297,margin:-1}),335}),y("Faro Bahía",-180,40,(x,b,M)=>(u("cyl",x,b,40,240,40,0,"#e8ebe4",Bt.GLASS_GREEN,3.8,{lit:.45,warm:.4,variant:.6}),u("cyl",x,b,50,10,50,0,"#e8eef2",Bt.CONCRETE,3,{yBase:M+232,margin:-1}),u("cyl",x,b,24,16,24,0,"#cfe0ec",Bt.GLASS_BLUE,3.9,{yBase:M+242,lit:.95,warm:.3,variant:.4,margin:-1}),u("frustum",x,b,28,18,28,.4,"#dfe4e8",Bt.CONCRETE,3,{yBase:M+258,margin:-1}),u("frustum",x,b,3,30,3,0,"#cfd8dc",Bt.CONCRETE,3,{yBase:M+275,margin:-1}),305)),y("Twin Palms A",40,210,(x,b)=>(u("box",x,b,30,182,56,.05,"#efe4cf",Bt.BALCONY,3.3,{lit:.3,warm:.85,variant:.4}),182)),y("Twin Palms B",110,210,(x,b,M)=>(u("box",x,b,30,182,56,.05,"#efe4cf",Bt.BALCONY,3.3,{lit:.35,warm:.85,variant:.4}),u("box",x-35,b,44,6,12,.05,"#dfe4e8",Bt.CONCRETE,3.3,{yBase:M+118,margin:-1}),182)),y("The Sail",-60,-250,(x,b,M)=>(u("shear",x,b,60,205,44,.9,"#b0c4d2",Bt.GLASS_BLUE,3.9,{lit:.45,warm:.3,variant:.9}),u("box",x,b,3.5,42,24,.9,"#e8eef2",Bt.CONCRETE,3,{yBase:M+204,margin:-1}),247)),y("Terraces",260,120,(x,b)=>{for(let M=0;M<5;M++)u("box",x+M*6,b-M*4,60-M*8,45+M*28,40,0,"#f7f5f0",Bt.GRID,3.5,{lit:.35,warm:.5,variant:.3});return 160}),y("Crown Plaza",-300,-180,(x,b,M)=>{u("box",x,b,42,200,42,.2,"#3a3633",Bt.STONE,3.8,{lit:.55,warm:.4,variant:.5}),u("box",x,b,20,10,20,.2,"#c2d0da",Bt.GLASS_BLUE,3.9,{yBase:M+200,lit:.9,warm:.6,variant:.5,margin:-1});for(let S=0;S<4;S++){const T=.2+S*Math.PI/2;u("box",x+Math.cos(T)*14,b+Math.sin(T)*14,3,44,14,T,"#e8eef2",Bt.CONCRETE,3,{yBase:M+198,margin:-1})}return 244}),y("The Needle",210,-380,(x,b,M)=>(u("box",x,b,22,212,22,.1,"#dfe6e0",Bt.GLASS_GREEN,3.8,{lit:.4,warm:.5,variant:.3}),u("frustum",x,b,16,14,16,.1,"#dfe6e0",Bt.GLASS_GREEN,3.8,{yBase:M+212,lit:.9,warm:.5,variant:.3,margin:-1}),u("frustum",x,b,5,70,5,.1,"#e8eef2",Bt.CONCRETE,3,{yBase:M+224,margin:-1}),294)),y("Gateway",-230,-430,(x,b,M)=>{const S={lit:.45,warm:.8,variant:.6};return u("box",x-26,b,22,156,44,.02,"#f2efe6",Bt.PUNCHED,3.3,S),u("box",x+26,b,22,156,44,.02,"#f2efe6",Bt.PUNCHED,3.3,S),u("box",x,b,76,14,40,.02,"#e9e6df",Bt.GRID,3.5,{yBase:M+156,lit:.6,warm:.5,variant:.6,margin:-1}),170}),y("Helix",330,-240,(x,b,M)=>{for(let S=0;S<12;S++)u("box",x,b,34,16.5,34,S*.1,"#e6e2d6",Bt.GLASS_GREEN,3.9,{yBase:M+S*16,lit:.5,warm:.3,variant:.2});return 198}),y("Aquamarine",-380,230,(x,b)=>{const M={lit:.55,warm:.2,variant:.6};return u("box",x,b,18,228,62,0,"#8fa9bd",Bt.GLASS_BLUE,3.9,M),u("box",x,b,62,228,18,0,"#8fa9bd",Bt.GLASS_BLUE,3.9,M),u("frustum",x,b,24,250,24,0,"#c2d0da",Bt.GLASS_BLUE,3.9,M),250});for(const x of s.districts){const b=t.get(x.id),M=Math.cos(x.rot),S=Math.sin(x.rot),T=(E,A)=>[x.cx+E*M-A*S,x.cz+E*S+A*M];if(!b)continue;const _=i.fork(x.id);for(const E of b){let A=function(){const pt=1-St(.2,1,q),K=$>80&&W>70?2:1;for(let j=0;j<K;j++){const nt=_.next();let D;nt<.07+.22*pt?D=_.range(120,205):nt<.45+.2*pt?D=_.range(70,120):D=_.range(36,72),D*=se(.6,1,pt),D=Math.max(28,D);const J=_.next();let Z,rt;J<(D>110?.34:.22)?(Z=_.range(16,24),rt=_.range(18,30)):J<.82?(Z=_.range(24,Math.min(46,$*.55)),rt=_.range(22,Math.min(46,W*.6))):(Z=_.range(Math.min(44,$*.5),Math.min(74,$*.75)),rt=_.range(18,Math.min(30,W*.4)),D>150&&(D*=.7));const dt=K===1?(P+H)/2+_.range(-$*.1,$*.1):se(P+Z/2+4,H-Z/2-4,j),xt=(G+N)/2+_.range(-W*.15,W*.15),[ft,z]=T(dt,xt);if(!p(ft,z,Z,rt,x.rot)||!f(ft,z,Z+6,rt+6,x.rot))continue;const R=D>110?Ni(_,[[Kt.glassBlue,.34],[Kt.glassGreen,.16],[Kt.punched,.1],[Kt.balcony,.08],[Kt.deco,.08],[Kt.stone,.14],[Kt.grid,.1]]):D>60?Ni(_,[[Kt.glassBlue,.2],[Kt.glassGreen,.12],[Kt.punched,.16],[Kt.balcony,.14],[Kt.deco,.14],[Kt.stone,.1],[Kt.grid,.1],[Kt.brick,.04]]):Ni(_,[[Kt.glassBlue,.1],[Kt.glassGreen,.08],[Kt.punched,.2],[Kt.balcony,.12],[Kt.deco,.18],[Kt.stone,.06],[Kt.grid,.1],[Kt.brick,.16]]);if(D>55&&_.chance(.6)){const gt=Math.min($*.92,Z+_.range(14,36)),ut=Math.min(W*.92,rt+_.range(14,36)),Nt=_.range(8,18);if(_.chance(.45))u("box",ft,z,gt,Nt,ut,x.rot,_.pick(ba),Bt.CONCRETE,3.4,{lit:.1,warm:.5});else{const bt=v(R.style===Bt.STONE?Kt.punched:R,_);u("box",ft,z,gt,Nt,ut,x.rot,bt.tint,R.style===Bt.STONE?Bt.PUNCHED:R.style,R.floorH,{lit:bt.lit,warm:bt.warm,variant:bt.variant})}}let tt;const ht=_.next();R.style===Bt.DECO&&D>60?tt=ht<.55?6:ht<.8?1:0:D>110?tt=ht<.28?1:ht<.4?7:ht<.52?5:ht<.62?8:ht<.72?4:ht<.8?2:0:D>60?tt=ht<.18?1:ht<.3?7:ht<.42?3:ht<.5?2:ht<.58?8:0:tt=ht<.25?3:ht<.35?2:0,g(_,ft,z,x.rot,Z,rt,D,R,tt)}const ot=(j,nt,D,J)=>{let Z=D;for(;Z<J-10;){const rt=_.range(14,30),dt=Math.min(_.range(12,22),(j==="x"?W:$)*.4);if(Z+rt>J)break;const xt=Z+rt/2;if(Z+=rt+_.range(0,3),_.next()>.55+.35*pt)continue;const ft=nt===(j==="x"?G:P)?1:-1,z=j==="x"?xt:nt+ft*dt/2,R=j==="x"?nt+ft*dt/2:xt,tt=j==="x"?rt:dt,ht=j==="x"?dt:rt,[gt,ut]=T(z,R);if(!p(gt,ut,tt,ht,x.rot)||!f(gt,ut,tt+3,ht+3,x.rot))continue;const Nt=Ni(_,[[Kt.brick,.24],[Kt.punched,.28],[Kt.deco,.2],[Kt.balcony,.12],[Kt.grid,.06],[Kt.concrete,.1]]),bt=v(Nt,_),Dt=_.range(12,40)*se(.7,1.1,pt),ee=u("box",gt,ut,tt,Dt,ht,x.rot,bt.tint,Nt.style,Nt.floorH,{lit:bt.lit,warm:bt.warm,variant:bt.variant});ee!==null&&Dt>20&&_.chance(.4)&&u("box",gt,ut,tt*.4,_.range(2.5,4),ht*.45,x.rot,_.pick(ba),Bt.CONCRETE,3,{yBase:ee-.2,margin:-1})}};ot("x",G,P,H),ot("x",N,P,H),ot("z",P,G,N),ot("z",H,G,N)},U=function(){const pt=Math.max(1,Math.round($*W/1800));for(let K=0,ot=0;K<pt*2&&ot<pt;K++){const j=_.range(16,Math.min(44,$*.75)),nt=_.range(16,Math.min(44,W*.75)),D=_.range(P+j/2,H-j/2),J=_.range(G+nt/2,N-nt/2),[Z,rt]=T(D,J);if(!p(Z,rt,j,nt,x.rot)||!f(Z,rt,j+4,nt+4,x.rot))continue;ot++;let dt=se(x.hMin,x.hMax,Math.pow(_.next(),2))*se(.75,1.15,st);dt=Qt(dt,x.hMin*.8,x.hMax);const xt=dt>50?Ni(_,[[Kt.balcony,.3],[Kt.punched,.2],[Kt.grid,.15],[Kt.deco,.1],[Kt.glassGreen,.15],[Kt.glassBlue,.1]]):Ni(_,[[Kt.brick,.28],[Kt.punched,.24],[Kt.deco,.16],[Kt.balcony,.16],[Kt.grid,.1],[Kt.concrete,.06]]),ft=_.next(),z=Math.max($,W)>90&&Math.min(j,nt)>20,R=dt>45?ft<.25?1:ft<.35?7:ft<.5&&z?2:ft<.6?3:0:ft<.25?3:ft<.35&&z?2:0;g(_,Z,rt,x.rot+_.range(-.03,.03),j,nt,dt,xt,R,dt>20)}},F=function(){const pt=_.chance(.65),K=pt?_.range(18,30):_.range(24,40),ot=pt?Math.min(W*.85,_.range(50,95)):_.range(24,40),[j,nt]=T((P+H)/2+_.range(-6,6),(G+N)/2);if(!p(j,nt,K,ot,x.rot)||!f(j,nt,K+4,ot+4,x.rot))return;const D=se(x.hMin,x.hMax,Math.pow(_.next(),1.5)),J=pt?Ni(_,[[Kt.hotel,.55],[Kt.balcony,.25],[Kt.deco,.2]]):Ni(_,[[Kt.glassGreen,.3],[Kt.balcony,.25],[Kt.deco,.2],[Kt.glassBlue,.15],[Kt.punched,.1]]),Z=_.next(),rt=pt?0:Z<.3?7:Z<.5?1:Z<.6?8:0;g(_,j,nt,x.rot,K,ot,D,J,rt);const[dt,xt]=T((P+H)/2+K*.5+12,(G+N)/2);if(p(dt,xt,18,ot*.7,x.rot)&&f(dt,xt,18,ot*.7,x.rot)){const ft=v(Kt.punched,_),z=u("box",dt,xt,18,_.range(4,9),ot*.7,x.rot,ft.tint,Bt.PUNCHED,3.2,{lit:ft.lit,warm:ft.warm});z!==null&&_.chance(.7)&&u("house",dt,xt,_.range(6,10),.4,Math.min(ot*.4,_.range(12,24)),x.rot,"#3fc4de",Bt.POOL,3,{yBase:z,form:2,margin:-1})}},I=function(){const pt=_.range(16,24),K=Math.min(30,W/2-2),ot=St(2200,5500,V),j=Ni(_,[[0,.3],[2,se(.14,.03,ot)],[5,se(.16,.05,ot)],[6,.13],[1,se(.12,.17,ot)],[7,se(.1,.17,ot)],[3,se(.04,.1,ot)],[4,se(.01,.05,ot)]]),nt=ot>.5?Gw:Ld,D=W>=40?[[G+K/2,0],[N-K/2,Math.PI]]:[[(G+N)/2,0]];for(const[J,Z]of D){let rt=P+pt/2;for(;rt<H-pt/2;){const dt=_.range(8,14),xt=_.range(9,17),ft=Math.max(pt*_.range(.9,1.25),dt+6),z=rt;if(rt+=ft,_.next()>(x.density+.15)*ct)continue;const R=Z===0?1:-1,tt=x.rot+Z+_.range(-.12,.12),[ht,gt]=T(z+_.range(-1.5,1.5),J-R*_.range(-3,3));if(_.next()<.08*st){const Ft=Math.min(22,ft-4),Lt=_.range(12,18);if(Ft<12||!p(ht,gt,Ft,Lt,tt)||h(ht,gt))continue;const le=_.chance(.5)?Kt.brick:Kt.punched,te=v(le,_);u("house",ht,gt,Ft,_.range(7,11),Lt,tt,te.tint,le.style,3.1,{lit:te.lit,warm:te.warm,variant:te.variant,form:2,margin:1});continue}if(!p(ht,gt,dt,xt,tt)||h(ht,gt))continue;const ut=_.chance(.28)?2:1,Nt=_.next(),bt=Nt<.42?0:Nt<.78?1:2,Dt=bt===2?ut*3.1+.6:ut*3.1/.68,ee=_.chance(.65)?j:_.pick(ot>.5?[0,1,3,4,6,7,7,1]:[0,1,2,3,4,5,6,7]),yt=v(Kt.house,_);yt.tint=_.pick(nt),u("house",ht,gt,dt,Dt,xt,tt,yt.tint,Bt.HOUSE,3,{roof:ee,form:bt,lit:yt.lit,warm:yt.warm,variant:yt.variant,margin:1});const Ot=Math.cos(tt),Yt=Math.sin(tt);if(_.chance(.3)&&ft-dt>9){const Ft=_.chance(.5)?1:-1,Lt=ht+Ft*(dt/2+3.2)*Ot,le=gt+Ft*(dt/2+3.2)*Yt;p(Lt,le,5.5,6,tt)&&u("house",Lt,le,5.5,2.9,6,tt,yt.tint,Bt.HOUSE,3,{roof:ee,form:2,lit:0,margin:.5})}if(_.chance(.28)){const[Ft,Lt]=T(z,J+R*(xt/2+6));p(Ft,Lt,6,4,x.rot)&&u("house",Ft,Lt,_.range(5,9),.4,_.range(3.5,5),x.rot,"#3fc4de",Bt.POOL,3,{form:2,margin:.5,yBase:s.heightAt(Ft,Lt)})}}}},B=function(){const pt=Math.max(1,Math.round($*W/3600));for(let K=0,ot=0;K<pt*3&&ot<pt;K++){const j=_.range(28,Math.min(80,$*.85)),nt=_.range(22,Math.min(60,W*.85)),D=_.range(P+j/2,H-j/2),J=_.range(G+nt/2,N-nt/2),[Z,rt]=T(D,J);if(!p(Z,rt,j,nt,x.rot)||!f(Z,rt,j,nt,x.rot))continue;ot++;const dt=v(Kt.industrial,_),xt=_.range(8,15),ft=u("box",Z,rt,j,xt,nt,x.rot,dt.tint,Bt.INDUSTRIAL,4,{lit:dt.lit,warm:dt.warm,variant:dt.variant});if(ft!==null){if(_.chance(.5)&&u("box",Z,rt,j+.6,.5,nt+.6,x.rot,"#8f9599",Bt.CONCRETE,3,{yBase:ft-.05,margin:-1}),_.chance(.3)){const[z,R]=T(D-j/2+8,J+nt/2+8);p(z,R,14,10,x.rot)&&u("box",z,R,14,_.range(6,10),10,x.rot,_.pick(Os),Bt.PUNCHED,3.2,{lit:.3,warm:.6})}if(_.chance(.3)){const[z,R]=T(D+j/2+9,J-nt/2+8);p(z,R,12,12,x.rot)&&u("cyl",z,R,_.range(7,12),_.range(7,13),_.range(7,12),0,"#dcdcd4",Bt.CONCRETE,3)}}}};const k=E.streetWidth*.5+3,P=E.x0+k,H=E.x1-k,G=E.z0+k,N=E.z1-k,$=H-P,W=N-G;if($<12||W<12)continue;const[et,X]=T((P+H)/2,(G+N)/2),q=Math.hypot(et-x.cx,X-x.cz)/Math.max(x.hw,x.hh),V=Math.hypot(et-w.cx,X-w.cz),st=1-St(600,4e3,V),ct=1-.45*St(2500,8500,V);if(!(_.next()>x.density*(x.zone===ne.RES_LOW?ct:1)))switch(x.zone){case ne.DOWNTOWN:A();break;case ne.RES_MID:U();break;case ne.HOTEL:F();break;case ne.RES_LOW:I();break;case ne.INDUSTRIAL:B();break}}}return n.build(),{batches:n,landmarkPositions:c,occupied:h,markOccupied:a}}function Ww(s){const n=document.createElement("canvas");n.width=256,n.height=512;const i=n.getContext("2d");i.clearRect(0,0,256,512),i.fillStyle="#8a7458",i.fillRect(256/2,0,256/2,512);for(let a=0;a<512;a+=9)i.fillStyle=a%18===0?"#6e5a44":"#9a8466",i.fillRect(256/2,a,256/2,4);for(let a=0;a<140;a++)i.fillStyle=`rgba(40,30,20,${.1+s.next()*.2})`,i.fillRect(256/2+s.next()*256/2,s.next()*512,3+s.next()*6,2);i.save(),i.beginPath(),i.rect(0,0,256/2,512),i.clip(),i.strokeStyle="#6b7a3a",i.lineWidth=5,i.beginPath(),i.moveTo(256/4,512),i.lineTo(256/4,8),i.stroke();const o=256/2;for(let a=0;a<46;a++){const l=a/46,h=492-l*472,c=(o/2-4)*(.45+.55*Math.sin(Math.PI*Math.min(1,l*1.15))),d=60+Math.round(40*Math.sin(l*7+a));i.fillStyle=`rgb(${40+a%3*8}, ${110+d*.6}, ${40+a%5*5})`;for(const u of[-1,1])i.beginPath(),i.moveTo(o/2,h),i.quadraticCurveTo(o/2+u*c*.5,h-18,o/2+u*c,h-34+6*Math.sin(a)),i.quadraticCurveTo(o/2+u*c*.55,h-6,o/2,h+4),i.fill()}i.restore();const r=new Rr(n);return r.colorSpace=Dn,r.anisotropy=4,r}const Cr=6;function Xw(s){const e=128*Cr,n=128,i=document.createElement("canvas");i.width=e,i.height=n;const o=i.getContext("2d"),r=o.createImageData(e,n),a=r.data,l=(f,v,m,g)=>{const w=(v*e+f)*4;g<=a[w+3]||(a[w]=a[w+1]=a[w+2]=Math.round(255*Math.min(1,Math.max(0,m))),a[w+3]=Math.round(255*Math.min(1,g)))},h=(f,v,m,g,w,y,x)=>{for(let b=0;b<128;b++)for(let M=0;M<128;M++){const S=(M+.5)/128,T=1-(b+.5)/128,_=S-v,E=T-m,A=Math.atan2(E,_),U=g*(1+.14*Gt(Math.cos(A)*2.1+x,Math.sin(A)*2.1+x*.7)+.06*Gt(S*30+x,T*30)),F=Math.hypot(_,E);if(F>U)continue;const I=F/U,B=Math.pow(.5+.5*(E/U),.6),k=.5+.5*Gt(S*22+x*3,T*22-x),P=(y+(w-y)*B)*(.8+.4*k)*(1-.3*I*I)*(1-.3*St(-.55,-1,E/U));l(f*128+M,b,P,1)}},c=(f,v,m,g,w)=>{for(let y=0;y<128;y++)for(let x=0;x<128;x++){const b=(x+.5)/128,M=1-(y+.5)/128,S=b-v,T=M-m,_=Math.atan2(T,S),E=g*(1+.16*Gt(Math.cos(_)*2.3+w,Math.sin(_)*2.3-w)),A=Math.hypot(S,T);if(A>E)continue;const U=A/E,F=.5+.5*Gt(b*26+w,M*26+w*2),B=(.62+.5*(.5+.5*Gt(b*9-w,M*9+w)))*(.8+.4*F)*(1-.45*U*U);l(f*128+x,y,B,1)}},d=(f,v,m,g,w,y)=>{for(let x=0;x<128;x++)for(let b=0;b<128;b++){const M=(b+.5)/128,S=1-(x+.5)/128;S<m||S>g||Math.abs(M-v)>w*(1-.4*(S-m)/(g-m))||l(f*128+b,x,y*(.85+.3*Gt(M*40,S*40)),1)}},u=(f,v,m,g,w,y,x)=>{for(let b=0;b<w;b++){const M=b/w*Math.PI*2+.4*Gt(b*1.7+x,x);for(let S=0;S<=1;S+=.01){const T=g*(.75+.25*Gt(b*3.1,x+b)),_=v+Math.cos(M)*T*S,E=m+Math.sin(M)*T*S*(1-y)-y*g*S*S,A=.045*g*(1-.5*S)/.25;for(let U=-1;U<=1;U+=.25){const F=_-Math.sin(M)*A*U,I=E+Math.cos(M)*A*U,B=Math.floor(F*128),k=Math.floor((1-I)*128);B<0||k<0||B>=128||k>=128||l(f*128+B,k,.75+.35*S-.2*Math.abs(U),1)}}}};d(0,.5,0,.3,.035,.42),h(0,.5,.5,.385,1.15,.58,3+s.next()),h(0,.36,.42,.2,.95,.52,7+s.next()),h(0,.63,.44,.19,1,.54,11+s.next()),d(1,.5,0,.34,.03,.4),h(1,.47,.52,.34,1.1,.55,21+s.next()),h(1,.66,.6,.22,1.2,.6,25+s.next()),h(1,.3,.4,.17,.9,.5,29+s.next()),h(1,.56,.3,.16,.85,.48,33+s.next()),d(2,.5,0,.5,.022,.55),u(2,.5,.52,.24,9,.35,2+s.next()),c(3,.5,.5,.4,5+s.next()),c(4,.5,.5,.38,15+s.next()),c(4,.68,.6,.2,17+s.next()),u(5,.5,.5,.26,9,0,6+s.next());for(let f=0;f<128;f++)for(let v=0;v<128;v++){const m=(f*e+640+v)*4;a[m+3]===0&&Math.hypot((v+.5)/128-.5,(f+.5)/128-.5)<.05&&(a[m]=a[m+1]=a[m+2]=140,a[m+3]=255)}o.putImageData(r,0,0);const p=new Rr(i);return p.colorSpace=vi,p.minFilter=Bi,p.magFilter=ye,p.anisotropy=4,p.generateMipmaps=!0,p}function qw(s,t,e=0){const i=new ah(1,e).getAttribute("position"),o=[],r=[],a=[];for(let l=0;l<i.count;l++){const h=i.getX(l),c=i.getY(l),d=i.getZ(l),u=1+.18*Gt(h*2.1+s,c*2.1+d*1.7-s);o.push(h*u,c*u*(c<0?.65:1),d*u),r.push(h,c,d),a.push(t)}return{pos:o,nrm:r,part:a}}function du(s=!1){const t=[],e=[],n=[],i=[];for(let l=0;l<3;l++){const h=l/3*Math.PI*2,c=(l+1)/3*Math.PI*2,d=Math.cos(h)*.045,u=Math.sin(h)*.045,p=Math.cos(c)*.045,f=Math.sin(c)*.045,v=Math.cos((h+c)/2),m=Math.sin((h+c)/2),g=[[d,0,u],[p,0,f],[p,1,f],[d,0,u],[p,1,f],[d,1,u]];for(const[w,y,x]of g)t.push(w,y,x),e.push(v,0,m),n.push(0),i.push(0,y)}for(const[l,h]of[[3.1,1],[8.7,2],[14.3,3]]){const c=qw(l,h,s&&h===1?1:0);t.push(...c.pos),e.push(...c.nrm),n.push(...c.part);for(let d=0;d<c.part.length;d++)i.push(0,0)}const a=new oe;return a.setAttribute("position",new Mt(t,3)),a.setAttribute("normal",new Mt(e,3)),a.setAttribute("uv",new Mt(i,2)),a.setAttribute("aPart",new Mt(n,1)),a.boundingSphere=new Ne(new C(0,1.2,0),2.6),a}function Yw(){const s=[],t=[],e=[],n=[],r=h=>{const c=.045*(1-.3*h),d=[];for(let u=0;u<=4;u++){const p=u/4*Math.PI*2+Math.PI/4;d.push([Math.cos(p)*c,h,Math.sin(p)*c])}return d};for(let h=0;h<3;h++){const c=r(h/3),d=r((h+1)/3);for(let u=0;u<4;u++){const p=(u+.5)/4*Math.PI*2+Math.PI/4,f=Math.cos(p),v=Math.sin(p),m=[c[u],c[u+1],d[u+1],c[u],d[u+1],d[u]],g=[.55+.4*(u/4),.55+.4*((u+1)/4),.55+.4*((u+1)/4),.55+.4*(u/4),.55+.4*((u+1)/4),.55+.4*(u/4)];m.forEach(([w,y,x],b)=>{s.push(w,y,x),t.push(f,0,v),e.push(g[b],y),n.push(0)})}}const a=7;for(let h=0;h<a;h++){const c=h/a*Math.PI*2,d=.56,u=.14,p=[];for(let v=0;v<=2;v++){const m=v/2,g=d*m,w=1+.16*Math.sin(m*Math.PI*.8)-.5*m*m,y=Math.cos(c)*g,x=Math.sin(c)*g,b=-Math.sin(c)*u*(1-m*.25),M=Math.cos(c)*u*(1-m*.25);p.push([y-b,w,x-M],[y+b,w,x+M])}const f=(v,m,g)=>{for(const w of[v,m,g]){s.push(p[w][0],p[w][1],p[w][2]),t.push(0,1,0),n.push(h+1);const y=Math.floor(w/2),x=w%2;e.push(x*.5,1-y/2)}};f(0,2,1),f(1,2,3),f(2,4,3),f(3,4,5)}const l=new oe;return l.setAttribute("position",new Mt(s,3)),l.setAttribute("normal",new Mt(t,3)),l.setAttribute("uv",new Mt(e,2)),l.setAttribute("aPart",new Mt(n,1)),l.boundingSphere=new Ne(new C(0,.8,0),1.2),l}function $w(){const s=new oe;return s.setAttribute("position",new Mt([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,-.5,0,.5,.5,0,-.5,.5,0],3)),s.setAttribute("normal",new Mt([0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0],3)),s.setAttribute("uv",new Mt([0,0,1,0,1,1,0,0,1,1,0,1],2)),s.boundingSphere=new Ne(new C(0,0,0),2),s}const Dd=`
uniform float uTime;
uniform float uWind;
attribute float aPart;
attribute vec4 aVar; // archetype, seed, crown squash / frond droop, trunk length
varying float vPart;
varying vec3 vWP;
varying vec3 vCrownN; // world-space direction from the puff centre (the undisplaced sphere normal)
varying float vSeed;
${jn}
`,jw=`
vec3 objectNormal = normal;
// foliage normals lean toward the sky so a crown shades as a lit mass of leaves, not a hard ball
if (aPart > 0.5) objectNormal = normalize(mix(normalize(objectNormal * vec3(1.0, 1.0 / max(aVar.z, 0.3), 1.0)), vec3(0.0, 1.0, 0.0), 0.3));
vCrownN = normalize((modelMatrix * instanceMatrix * vec4(normal, 0.0)).xyz);
vSeed = aVar.y;
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif
`,fh=`
vec3 vegShadowC = vec3(0.0);
float vegShadowR = 0.0;
`,Zw=`
vec3 transformed = position;
${fh}
{
  float seed = aVar.y;
  float squash = aVar.z;
  float trunkLen = aVar.w;
  if (aPart < 0.5) {
    transformed.y *= trunkLen + 0.25 * squash;
    transformed.xz *= 0.8 + 0.5 * step(0.5, aVar.x) * step(aVar.x, 1.5);
  } else {
    vegShadowC = (modelMatrix * instanceMatrix * vec4(0.0, trunkLen + 0.85 * squash, 0.0, 1.0)).xyz;
    vegShadowR = 1.2 * length(instanceMatrix[0].xyz);
    // main puff on the trunk axis; two lobes on opposite-ish sides at hashed radius, size and height
    vec2 hs = hash22(vec2(seed * 91.7 + aPart * 3.0, seed * 37.1 - aPart));
    vec2 hs2 = hash22(vec2(seed * 13.3 - aPart, seed * 71.9 + aPart * 5.0));
    float main = step(aPart, 1.5);
    float ang = hash11(seed * 3.7) * 6.2831 + (aPart - 2.0) * (2.2 + 1.3 * hs.x);
    float rad = mix(0.5 + 0.4 * hs.y, 0.0, main);
    float ps = mix(0.5 + 0.35 * hs2.x, 1.0, main);
    vec3 centre = vec3(cos(ang) * rad, trunkLen + 0.85 * squash + mix(-0.2 + 0.5 * hs2.y, 0.0, main) * squash, sin(ang) * rad);
    transformed = centre + transformed * ps * vec3(1.15, squash, 1.05);
  }
  // wind: sway grows with height, phase from the instance position so no two plants move together
  vec3 iw = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float phase = iw.x * 0.13 + iw.z * 0.17;
  float sway = sin(uTime * 1.3 + phase) * 0.6 + sin(uTime * 2.7 + phase * 1.9) * 0.4;
  float k = transformed.y * transformed.y * uWind * 0.035;
  transformed.x += sway * k;
  transformed.z += cos(uTime * 1.1 + phase) * k * 0.6;
  vPart = aPart;
  vWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
}
`,Kw=`
varying float vPart;
varying vec3 vWP;
varying vec3 vCrownN;
varying float vSeed;
float vegNear; // 1 within ~200 m of the camera, 0 beyond 320 m: gates the close-range leaf detail
${jn}
`,Jw=`
#include <color_fragment>
{
  vec3 toCam = cameraPosition - vWP;
  float camDist = length(toCam);
  vegNear = 1.0 - smoothstep(200.0, 320.0, camDist);
  if (vPart < 0.5) {
    diffuseColor.rgb = vec3(0.30, 0.23, 0.16) * (0.8 + 0.4 * vnoise(vWP.xz * 3.0 + vWP.y * 2.0));
  } else {
    vec3 cn = normalize(vCrownN);
    // close range: dissolve the outer band of each puff with leaf-cluster noise so the silhouette reads
    // as ragged foliage instead of a 20-facet ball (a few px of the outline; fades out by 320 m)
    if (vegNear > 0.0) {
      float facing = abs(dot(cn, toCam / max(camDist, 1e-3)));
      float clusters = vnoise(vWP.xz * 1.1 + vWP.y * 0.9) * 0.65 + 0.35 * vnoise(vWP.xz * 3.3 - vWP.y * 2.6);
      if (facing < 0.6 * clusters * vegNear) discard;
    }
    // crown-space wrap lighting: a sunlit yellow-green cap, cooler and darker undersides, and a per-crown
    // yellowness so neighbouring trees differ in more than their base tint
    float yellow = hash11(vSeed * 41.7 + 3.0);
    float cap = smoothstep(-0.55, 0.85, cn.y);
    vec3 sunlit = diffuseColor.rgb * mix(vec3(1.08, 1.06, 0.94), vec3(1.2, 1.12, 0.78), yellow);
    vec3 shade = diffuseColor.rgb * vec3(0.55, 0.6, 0.64);
    diffuseColor.rgb = mix(shade, sunlit, cap);
    // leaf clusters: fine value noise breaks the smooth shading of the puffs; gaps between clusters darken
    float leaf = vnoise(vWP.xz * 1.7 + vWP.y * 1.3);
    diffuseColor.rgb *= 0.74 + 0.5 * leaf;
    diffuseColor.rgb *= 1.0 - 0.35 * smoothstep(0.62, 0.9, vnoise(vWP.xz * 0.55 + vWP.y * 0.4 + 17.0));
  }
}
`,Qw=`
#include <normal_fragment_begin>
if (vPart > 0.5 && vegNear > 0.0) {
  // leaf clusters ~1.2 m across: the gradient of a value noise field tilts the normal cluster by cluster
  float e = 0.25;
  vec2 p = vWP.xz * 0.85;
  float py = vWP.y * 0.7;
  float n0 = vnoise(p + py);
  float nx = vnoise(p + vec2(e, 0.0) + py);
  float nz = vnoise(p + vec2(0.0, e) + py);
  float ny = vnoise(p + py + e);
  vec3 g = (viewMatrix * vec4(nx - n0, ny - n0, nz - n0, 0.0)).xyz / e;
  normal = normalize(normal + 0.4 * vegNear * g);
}
`,ty=`
#include <emissivemap_fragment>
#if NUM_DIR_LIGHTS > 0
if (vPart > 0.5) {
  vec3 V = normalize(vViewPosition);
  vec3 L = directionalLights[0].direction;
  float rim = pow(1.0 - clamp(dot(normal, V), 0.0, 1.0), 3.0);
  float backlit = clamp(dot(-V, L), 0.0, 1.0);
  totalEmissiveRadiance += diffuseColor.rgb * vec3(1.05, 1.1, 0.7) * directionalLights[0].color * (0.07 * rim * backlit);
}
#endif
`,ey=`
vec3 objectNormal = normal;
if (aPart > 0.5) {
  float seed = aVar.y;
  float rot = hash11(seed * 7.7 + aPart) * 0.9 - 0.45 + hash11(seed * 3.3) * 6.2831;
  float c = cos(rot), s = sin(rot);
  objectNormal.xz = mat2(c, -s, s, c) * objectNormal.xz;
}
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif
`,ny=`
vec3 transformed = position;
${fh}
{
  float seed = aVar.y;
  float lean = 0.03 + 0.12 * hash11(seed * 5.1);
  float leanDir = hash11(seed * 9.3) * 6.2831;
  if (aPart > 0.5) {
    vegShadowC = (modelMatrix * instanceMatrix * vec4(cos(leanDir) * lean, 1.0, sin(leanDir) * lean, 1.0)).xyz;
    vegShadowR = 0.6 * length(instanceMatrix[0].xyz);
    float rot = hash11(seed * 7.7 + aPart) * 0.9 - 0.45 + hash11(seed * 3.3) * 6.2831;
    float c = cos(rot), s = sin(rot);
    vec3 rel = transformed - vec3(0.0, 1.0, 0.0);
    rel.xz = mat2(c, -s, s, c) * rel.xz;
    // extra droop toward the frond tip (uv.y = 1 at the base, 0 at the tip)
    float t = 1.0 - uv.y;
    rel.y -= aVar.z * t * t * (0.6 + 0.8 * hash11(seed * 2.9 + aPart));
    transformed = vec3(0.0, 1.0, 0.0) + rel;
  }
  float bend = lean * transformed.y * transformed.y;
  transformed.x += cos(leanDir) * bend;
  transformed.z += sin(leanDir) * bend;
  vec3 iw = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float phase = iw.x * 0.13 + iw.z * 0.17;
  float sway = sin(uTime * 1.3 + phase) * 0.6 + sin(uTime * 2.7 + phase * 1.9) * 0.4;
  float k = transformed.y * transformed.y * uWind * 0.06;
  transformed.x += sway * k;
  transformed.z += cos(uTime * 1.1 + phase) * k * 0.6;
  vPart = aPart;
  vWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
}
`,ph=`
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
vec3 vegL = normalize(vec3(directionalShadowMatrix[ 0 ][0][2], directionalShadowMatrix[ 0 ][1][2], directionalShadowMatrix[ 0 ][2][2]));
vec4 vegShadowPos = vegShadowR > 0.0 ? vec4(vegShadowC - vegL * vegShadowR, 1.0) : worldPosition;
#else
#define vegShadowPos worldPosition
#endif
${ae.shadowmap_vertex.replace(/worldPosition/g,"vegShadowPos")}
`,iy=`
#include <shadowmap_pars_fragment>
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
float vegShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
  return mix( 0.34, 1.0, getShadow( shadowMap, shadowMapSize, shadowIntensity, shadowBias, shadowRadius, shadowCoord ) );
}
#endif
`;function mh(s){return s.replace(/\bgetShadow\(/g,"vegShadow(").replace("#include <shadowmap_pars_fragment>",iy)}const Id=`
attribute vec4 aVar; // archetype (0 crown, 1 palm), seed, card size (unit), crown centre height (unit)
varying vec2 vCardUv;
varying float vElev;
varying float vCol; // atlas column of the side view (top view is 3 columns further)
`,zd=`
vec4 mvPosition;
${fh}
{
  vec4 centre = instanceMatrix * vec4(0.0, aVar.w, 0.0, 1.0);
  vec3 wc = (modelMatrix * centre).xyz;
  float s = length(instanceMatrix[0].xyz);
  vegShadowC = wc;
  vegShadowR = (aVar.x > 0.5 ? 0.6 : 1.2) * s;
  vec3 toCam = cameraPosition - wc;
  // the top view starts blending in from ~8 deg of elevation: a canopy seen from a shallow aerial angle
  // shows mostly lit tops, not the shaded flanks of the side view
  vElev = smoothstep(0.12, 0.75, abs(toCam.y) / max(length(toCam), 1.0));
  vec4 mvCentre = modelViewMatrix * centre;
  // mirror every other card so the same atlas tile reads as two silhouettes
  float flip = step(0.5, fract(aVar.y * 37.0)) * 2.0 - 1.0;
  mvPosition = mvCentre + vec4(position.xy * aVar.z * s, 0.0, 0.0);
  gl_Position = projectionMatrix * mvPosition;
  vCardUv = vec2(flip > 0.0 ? uv.x : 1.0 - uv.x, uv.y);
  vCol = aVar.x > 0.5 ? 2.0 : step(0.5, fract(aVar.y * 11.0));
}
`,Nd=`
uniform sampler2D uAtlas;
varying vec2 vCardUv;
varying float vElev;
varying float vCol;
`,sy=`
{
  vec4 side = texture2D(uAtlas, vec2((vCardUv.x + vCol) / ${Cr}.0, vCardUv.y));
  vec4 top = texture2D(uAtlas, vec2((vCardUv.x + vCol + 3.0) / ${Cr}.0, vCardUv.y));
  diffuseColor.a = mix(side, top, vElev).a;
}
`,oy=`
#include <color_fragment>
{
  vec4 side = texture2D(uAtlas, vec2((vCardUv.x + vCol) / ${Cr}.0, vCardUv.y));
  vec4 top = texture2D(uAtlas, vec2((vCardUv.x + vCol + 3.0) / ${Cr}.0, vCardUv.y));
  vec4 t = mix(side, top, vElev);
  if (t.a < 0.5) discard;
  // lit leaf mass yellows, shaded parts cool off: matches the 3D crowns' wrap lighting
  diffuseColor.rgb *= t.r * 1.02 * mix(vec3(0.72, 0.82, 0.9), vec3(1.12, 1.04, 0.82), smoothstep(0.35, 1.05, t.r));
}
`;function ry(s,t){const e=new ce({color:16777215,roughness:.88});return e.onBeforeCompile=n=>{n.uniforms.uTime=s,n.uniforms.uWind=t,n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
${Dd}`).replace("#include <beginnormal_vertex>",jw).replace("#include <begin_vertex>",Zw).replace("#include <shadowmap_vertex>",ph),n.fragmentShader=mh(n.fragmentShader).replace("#include <common>",`#include <common>
${Kw}`).replace("#include <color_fragment>",Jw).replace("#include <normal_fragment_begin>",Qw).replace("#include <emissivemap_fragment>",ty)},e.customProgramCacheKey=()=>"veg-crown-v7",e}function ay(s,t,e){const n=new ce({map:s,alphaTest:.5,alphaToCoverage:!0,side:nn,roughness:.75,color:16777215});return n.onBeforeCompile=i=>{i.uniforms.uTime=t,i.uniforms.uWind=e,i.vertexShader=i.vertexShader.replace("#include <common>",`#include <common>
${Dd}`).replace("#include <beginnormal_vertex>",ey).replace("#include <begin_vertex>",ny).replace("#include <shadowmap_vertex>",ph),i.fragmentShader=mh(i.fragmentShader).replace("#include <common>",`#include <common>
varying float vPart; varying vec3 vWP;`)},n.customProgramCacheKey=()=>"veg-palm-v6",n}function ly(s){const t=new ud({depthPacking:Xu,alphaTest:.5,side:nn});return t.onBeforeCompile=e=>{e.uniforms.uAtlas={value:s},e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
${Id}`).replace("#include <project_vertex>",zd),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
${Nd}`).replace("#include <map_fragment>",sy)},t.customProgramCacheKey=()=>"veg-card-depth-v3",t}function cy(s){const t=new ce({color:16777215,roughness:.9,alphaTest:.5,alphaToCoverage:!0,side:nn});return t.onBeforeCompile=e=>{e.uniforms.uAtlas={value:s},e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
${Id}`).replace("#include <project_vertex>",zd).replace("#include <shadowmap_vertex>",ph),e.fragmentShader=mh(e.fragmentShader).replace("#include <common>",`#include <common>
${Nd}`).replace("#include <color_fragment>",oy)},t.customProgramCacheKey=()=>"veg-card-v7",t}const fu=900,hy=8,uy=new Array(yi).fill(0),dy=420,fy=200,py=6e4,Gl=new C,pu=new C,mu=new C,my=new C;function gy(s,t,e,n){const i=s.planes[0],o=s.planes[2],r=s.planes[3];Gl.crossVectors(o.normal,r.normal);const a=i.normal.dot(Gl);return Math.abs(a)<1e-9?t.set(e,0,n):(pu.crossVectors(r.normal,i.normal),mu.crossVectors(i.normal,o.normal),t.set(0,0,0).addScaledVector(Gl,-i.constant).addScaledVector(pu,-o.constant).addScaledVector(mu,-r.constant).divideScalar(a))}const vy={0:["#6d7639","#70763e","#627137","#777941","#6e7239","#4a6832","#536a3a","#3d5c2e","#586e37","#4f602d","#344c29","#35502a","#304426","#3d562f","#364f39"],1:["#335528","#3c5c2d","#436832","#2e4c25","#4f6c37","#254021"],2:["#365126","#415a2b","#2f4821","#4a6134","#3a522a","#273c1f"],3:["#61753e","#6e7c44","#536835","#79793f","#817b42","#6c7534"],4:["#5d7534","#526c2d","#697e3a","#486228","#73823f","#5e7435"],5:["#8f7d4b","#9a7f52","#877b4b","#7d7541","#9e8359"]};class xy{group=new Ye;materials=[];uTime={value:0};uWind={value:.5};counts={palms:0,trees:0,mangroves:0,shrubs:0};tiles=[];shadowDistance=1800;viewDistance=9e3;constructor(t,e){const n=new $e("vegetation"),i=Ww(n.fork("fronds")),o=Xw(n.fork("atlas")),r=ry(this.uTime,this.uWind),a=ay(i,this.uTime,this.uWind),l=cy(o),h=ly(o);this.materials.push(r,a,l);const c=du(),d=du(!0),u=Yw(),p=$w(),f=[],v={0:[],1:[],2:[],3:[],4:[],5:[]};for(const P of[0,1,2,3,4,5])v[P]=vy[P].map(H=>new Vt(H));const m=(P,H,G,N,$,W,et=0)=>{const X=W.pick(v[P]).clone();X.offsetHSL(W.range(-.035,.035),W.range(-.1,.08),W.range(-.09,.08));const q=P===2?W.range(.5,.7):P===3?W.range(.6,.85):P===5?W.range(.32,.45):P===1?W.range(.95,1.25):W.range(.7,1),V=P===2?W.range(.15,.3):P===3||P===5?.02:P===1?W.range(.6,.95):W.range(.3,.55),st=W.next();f.push({x:H,y:N,z:G,s:$,rot:W.range(0,Math.PI*2),lean:P===4?(st-.5)*.16+et:0,tint:X,arche:P,seed:st,squash:q,trunk:V})},g=(P,H,G,N,$=5.5,W=11)=>m(4,P,H,G-.15,N.range($,W),N,N.range(-.14,.14)),w=t.n,y=t.zone,x=t.veg,b=t.height;for(let P=0;P<w;P++)for(let H=0;H<w;H++){const G=P*w+H,N=y[G];if(N===ne.OCEAN||N===ne.BAY||N===ne.SANDBAR||N===ne.ROCK||N===ne.LOT||N===ne.CONSTRUCTION||N===ne.STADIUM||N===ne.ROAD||N===ne.MARINA||b[G]<.12)continue;const $=x[G]/255,W=-pn+(H+.5)*Is,et=-pn+(P+.5)*Is,X=Gt(W/150,et/150),q=Gt(W/420+9,et/420-3);let V=0,st=1;switch(N){case ne.MANGROVE:V=.95,st=3;break;case ne.BEACH:V=.6,st=2;break;case ne.PARK:V=.06+.94*St(.35,.95,$)+.08*X,st=$>.6?3:$>.3?2:1;break;case ne.RES_LOW:V=.05+.75*St(.25,.95,$)+.05*X,st=$>.7?3:$>.42?2:1;break;case ne.GOLF:V=.03+.22*St(.1,.6,X);break;case ne.WETLAND_FLAT:V=.85*St(.55,.9,$),st=2;break;case ne.HOTEL:case ne.RES_MID:V=.05;break;case ne.DOWNTOWN:V=.02;break;case ne.AIRPORT:V=.012;break;case ne.INDUSTRIAL:V=.006;break;default:V=0}if(!(V<=0))for(let ct=0;ct<st;ct++){if(Nl(H,P,7+ct*3)>=V)continue;const K=W+(Nl(H,P,8+ct*3)-.5)*Is*1.1,ot=et+(Nl(H,P,9+ct*3)-.5)*Is*1.1,j=t.heightAt(K,ot);if(j<.12)continue;const nt=new $e(G*4+ct),D=nt.next(),J=t.coastAt(K,ot),Z=J>-110;if(N===ne.MANGROVE){if(e(K,ot))continue;m(2,K,ot,j-.2,nt.range(2.4,4.4),nt)}else if(N===ne.BEACH){if(e(K,ot))continue;const rt=St(.65,1.15,j),dt=.5+.5*Gt(K/75+3.3,ot/75-6.1),xt=.5+.5*Gt(K/28+8.8,ot/28+1.2),ft=rt*(.1+.6*St(.35,.75,dt));D<ft?g(K,ot,j,nt):j>.6&&xt>.6&&nt.chance(.75)?m(3,K,ot,j-.15,nt.range(1.2,2.8),nt):j>.45&&j<1.35&&t.exposureAt(K,ot)>.45&&nt.chance(.22*St(.42,.6,.5+.5*Gt(K/40-2.2,ot/40+9.4)))&&m(5,K,ot,j-.1,nt.range(1.6,3),nt)}else if(N===ne.WETLAND_FLAT){if(j<.25||e(K,ot))continue;m(D<.35?1:0,K,ot,j-.3,D<.35?nt.range(7,10):nt.range(4,6.5),nt)}else{if(e(K,ot))continue;const rt=$>.7;if(N===ne.PARK||N===ne.RES_LOW||N===ne.GOLF){const dt=J>-45?.55:Z?.3:0,xt=N===ne.GOLF?.4:N===ne.RES_LOW?Math.max(rt?.14:.35,dt):Math.max(dt,.08),ft=rt?.1+.16*St(.1,.5,q):.05,z=rt?.08:.06;D<xt?g(K,ot,j,nt,6,11):D<xt+ft?m(1,K,ot,j-.3,nt.range(7.5,11),nt):D<xt+ft+z?m(3,K,ot,j-.1,nt.range(1.3,2.8),nt):m(0,K,ot,j-.3,rt?nt.range(4.2,7.5):nt.range(3.8,6.5),nt)}else N===ne.INDUSTRIAL?m(D<.5?3:0,K,ot,j-.2,D<.5?nt.range(1.3,2.4):nt.range(3.5,5.5),nt):N===ne.AIRPORT?m(0,K,ot,j-.3,nt.range(3.2,5),nt):m(4,K,ot,j-.15,nt.range(6,10),nt)}}}const M=new $e("road-palms"),S=[];for(const P of t.roads)(P.cls==="highway"||P.cls==="arterial"||P.cls==="causeway"||P.cls==="street")&&S.push({pts:P.pts,width:P.width,spacing:P.cls==="street"?24:19});for(const P of t.districts)P.track&&S.push({pts:P.track,width:7,spacing:22});for(const P of S){let H=0;for(let G=0;G<P.pts.length-1;G++){const[N,$]=P.pts[G],[W,et]=P.pts[G+1],X=Math.hypot(W-N,et-$);if(X<1)continue;const q=(W-N)/X,V=(et-$)/X;for(let st=14;st<X-8;st+=P.spacing*M.range(.75,1.3),H++){const ct=H&1?1:-1,pt=P.width*.5+M.range(4.5,8),K=N+q*st-V*pt*ct,ot=$+V*st+q*pt*ct,j=t.heightAt(K,ot);if(j<.9)continue;const nt=t.zoneAt(K,ot);nt===ne.INDUSTRIAL||nt===ne.AIRPORT||nt===ne.WETLAND_FLAT||nt===ne.LOT||M.chance(.18)||e(K,ot)||g(K,ot,j,M,6.5,11)}}}const T=new $e("marina-palms");for(const P of t.marinas){const H=Math.sin(P.rot),G=-Math.cos(P.rot),N=-G,$=H;let W=0;if(t.heightAt(P.x,P.z)<0){for(let st=0;st>=-200;st-=2)if(t.heightAt(P.x+H*st,P.z+G*st)>=0){W=st;break}}else for(let st=0;st<=200;st+=2)if(t.heightAt(P.x+H*st,P.z+G*st)<0){W=st;break}const et=P.x+H*W,X=P.z+G*W,q=P.piers*14+30,V=Math.round(q*.28);for(let st=0;st<V;st++){const ct=T.range(-q,q),pt=T.range(10,44),K=et+N*ct-H*pt,ot=X+$*ct-G*pt,j=t.heightAt(K,ot);if(j<.9||e(K,ot))continue;const nt=t.zoneAt(K,ot);nt===ne.ROAD||nt===ne.INDUSTRIAL||nt===ne.LOT||nt===ne.DOWNTOWN||nt===ne.RES_MID||g(K,ot,j,T,6,10.5)}}for(const P of f)P.arche===4?this.counts.palms++:P.arche===2?this.counts.mangroves++:P.arche===3||P.arche===5?this.counts.shrubs++:this.counts.trees++;const _=new Map;for(const P of f){const H=Math.floor(P.x/fu),G=Math.floor(P.z/fu),N=`${H}|${G}`;let $=_.get(N);$||($={crown:[],palm:[],tx:H,tz:G},_.set(N,$)),(P.arche===4?$.palm:$.crown).push(P)}const E=new $e("veg-shuffle"),A=new jt,U=new Xe,F=new C,I=new C,B=new He(0,0,0,"YXZ"),k=(P,H,G,N)=>{for(let J=P.length-1;J>0;J--){const Z=E.int(0,J),rt=P[J];P[J]=P[Z],P[Z]=rt}const $=P.length,W=new oe;for(const J of["position","normal","uv","aPart"])W.setAttribute(J,H.getAttribute(J));W.boundingSphere=H.boundingSphere;let et=null;if(N){et=new oe;for(const J of["position","normal","uv","aPart"])et.setAttribute(J,N.getAttribute(J));et.boundingSphere=N.boundingSphere}const X=new oe;for(const J of["position","normal","uv"])X.setAttribute(J,p.getAttribute(J));X.boundingSphere=p.boundingSphere;const q=new Float32Array($*4),V=new Float32Array($*4),st=new Xi(W,G,$),ct=new Be;P.forEach((J,Z)=>{F.set(J.x,J.y,J.z),B.set(J.lean,J.rot,0),U.setFromEuler(B),I.set(J.s,J.s,J.s),st.setMatrixAt(Z,A.compose(F,U,I)),st.setColorAt(Z,J.tint),q[Z*4]=J.arche,q[Z*4+1]=J.seed,q[Z*4+2]=J.arche===4?.35:J.squash,q[Z*4+3]=J.trunk,J.arche===4?(V[Z*4]=1,V[Z*4+2]=2.45,V[Z*4+3]=1):(V[Z*4]=0,V[Z*4+2]=3.1*J.squash+.3,V[Z*4+3]=J.trunk+.9*J.squash),V[Z*4+1]=J.seed,ct.expandByPoint(F)});const pt=new hs(q,4);W.setAttribute("aVar",pt),X.setAttribute("aVar",new hs(V,4)),st.instanceMatrix.needsUpdate=!0,st.receiveShadow=!0,st.castShadow=!1,st.matrixAutoUpdate=!1;let K=null;et&&(et.setAttribute("aVar",pt),K=new Xi(et,G,$),K.instanceMatrix=st.instanceMatrix,K.instanceColor=st.instanceColor,K.receiveShadow=!0,K.castShadow=!1,K.matrixAutoUpdate=!1,K.visible=!1);const ot=new Xi(X,l,$);ot.instanceMatrix=st.instanceMatrix,ot.instanceColor=st.instanceColor,ot.receiveShadow=!0,ot.castShadow=!1,ot.customDepthMaterial=h,ot.matrixAutoUpdate=!1;const j=P.reduce((J,Z)=>Math.max(J,Z.s),0),nt=ct.getBoundingSphere(new Ne);nt.radius+=j*2.6,ct.min.x-=j*2.6,ct.max.x+=j*2.6,ct.min.z-=j*2.6,ct.max.z+=j*2.6,ct.min.y-=1,ct.max.y+=j*3.7;const D=ct.getBoundingSphere(new Ne);st.boundingSphere=D,ot.boundingSphere=D.clone(),ot.visible=!1,this.group.add(st,ot),K&&(K.boundingSphere=D.clone(),this.group.add(K)),this.tiles.push({near:st,hi:K,far:ot,box:ct,center:D.center,r:D.radius,height:ct.max.y-ct.min.y,lodCenter:nt.center,lodR:nt.radius,n:$,d:0})};for(const P of _.values())P.crown.length&&k(P.crown,c,r,d),P.palm.length&&k(P.palm,u,a,null)}update(t,e){this.uTime.value=t,this.uWind.value=e}updateLod(t,e,n){const i=this.tiles,o=gy(n.viewFrustum,my,t,e).y;for(const l of i)l.d=Math.max(0,Math.sqrt((l.lodCenter.x-t)**2+(l.lodCenter.z-e)**2+(l.lodCenter.y-o)**2)-l.lodR);for(let l=1;l<i.length;l++){const h=i[l];let c=l-1;for(;c>=0&&i[c].d>h.d;)i[c+1]=i[c],c--;i[c+1]=h}let r=py;const a=uy;a.fill(0);for(const l of i){const h=l.d<dy&&r>=l.n;h&&(r-=l.n);const c=n.boxInView(l.box);let d=l.d<this.shadowDistance?n.casterCascades(l.center,l.r,l.height):0;for(let g=0;d>>g&&g<yi;g++)!(d&1<<g)||Td(g)||(a[g]>=hy?d&=~(1<<g):a[g]++);const u=l.hi!==null&&l.d<fy;l.near.visible=h&&c&&!u,l.hi&&(l.hi.visible=h&&c&&u);const p=!h&&c&&l.d<this.viewDistance,f=Vs("all",p,d),v=Ir(f);l.far.visible=p||v,l.far.castShadow=v,l.far.layers.mask=f;const m=h||l.d<3e3?1:l.d<5500?.5:.25;l.far.count=Math.max(1,Math.round(l.n*m))}}}function Ud(s,t,e){const n=new ce({color:16777215,roughness:1,metalness:1,vertexColors:t,emissive:e??0}),i=e!==void 0;return n.onBeforeCompile=o=>{o.vertexShader=o.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aMatParams;
varying vec2 vMatParams;${i?`
attribute float aEmissive;
varying float vEmissive;`:""}`).replace("#include <begin_vertex>",`#include <begin_vertex>
vMatParams = aMatParams;${i?`
vEmissive = aEmissive;`:""}`),o.fragmentShader=o.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vMatParams;${i?`
varying float vEmissive;`:""}`).replace("#include <roughnessmap_fragment>","float roughnessFactor = vMatParams.x;").replace("#include <metalnessmap_fragment>","float metalnessFactor = vMatParams.y;"),i&&(o.fragmentShader=o.fragmentShader.replace("#include <emissivemap_fragment>","totalEmissiveRadiance *= vEmissive;"))},n.customProgramCacheKey=()=>s,n}function wy(s){const t=[],e=[],n=[],i=[],o=[];for(const a of s){const l=a.geometry.index?a.geometry.toNonIndexed():a.geometry,h=l.getAttribute("position"),c=l.getAttribute("normal"),{color:d,roughness:u,metalness:p}=a.material;for(let f=0;f<h.count;f++)t.push(h.getX(f),h.getY(f),h.getZ(f)),e.push(c.getX(f),c.getY(f),c.getZ(f)),n.push(d.r,d.g,d.b),i.push(u,p),o.push(a.emissive?1:0);l!==a.geometry&&l.dispose()}const r=new oe;return r.setAttribute("position",new Mt(t,3)),r.setAttribute("normal",new Mt(e,3)),r.setAttribute("color",new Mt(n,3)),r.setAttribute("aMatParams",new Mt(i,2)),r.setAttribute("aEmissive",new Mt(o,1)),r.computeBoundingSphere(),r}function Vl(s){const t=s.getAttribute("position").count;return s.setAttribute("color",new Mt(new Float32Array(t*3).fill(1),3)),s.setAttribute("aEmissive",new Mt(new Float32Array(t),1)),s}class yy{pos=[];nrm=[];col=[];par=[];box=new Be;v=new C;get vertexCount(){return this.pos.length/3}add(t,e,n,i){const o=(t.index?t.toNonIndexed():t.clone()).applyMatrix4(e),r=o.getAttribute("position"),a=o.getAttribute("normal"),l=i??n.color,h=n.roughness,c=n.metalness,d=(u,p)=>{this.v.set(r.getX(u),r.getY(u),r.getZ(u)),this.pos.push(this.v.x,this.v.y,this.v.z),this.box.expandByPoint(this.v);const f=p?-1:1;this.nrm.push(f*a.getX(u),f*a.getY(u),f*a.getZ(u)),this.col.push(l.r,l.g,l.b),this.par.push(h,c)};for(let u=0;u<r.count;u++)d(u,!1);if(n.side===nn)for(let u=0;u<r.count;u+=3)d(u,!0),d(u+2,!0),d(u+1,!0);o.dispose()}build(){const t=new oe;return t.setAttribute("position",new Mt(this.pos,3)),t.setAttribute("normal",new Mt(this.nrm,3)),t.setAttribute("color",new Mt(this.col,3)),t.setAttribute("aMatParams",new Mt(this.par,2)),t.boundingBox=this.box.clone(),t.boundingSphere=this.box.getBoundingSphere(new Ne),t}}function Vc(s,t,e){const n=Math.floor((s+1e4)/e);return Math.floor((t+1e4)/e)*4096+n}function gu(s,t,e){return s+t+e-Math.max(s,t,e)-Math.min(s,t,e)}const _y=2500,My=1,by=350,Sy=2500,Ey=2.5,Ty=new Array(yi).fill(0);class Ay{constructor(t,e,n,i){this.map=t,this.markOccupied=i,this.mats={concrete:new ce({color:12170926,roughness:.9}),dark:new ce({color:3816768,roughness:.8}),white:new ce({color:15921902,roughness:.6}),steel:new ce({color:10134701,roughness:.45,metalness:.7}),red:new ce({color:13123630,roughness:.6}),blue:new ce({color:3103400,roughness:.6}),green:new ce({color:3046735,roughness:.6}),orange:new ce({color:14252074,roughness:.6}),wood:new ce({color:9136968,roughness:.9}),tank:new ce({color:14474452,roughness:.5,metalness:.3}),glass:new ce({color:10470614,roughness:.15,metalness:.8}),grass:new ce({color:4164142,roughness:.95}),yellow:new ce({color:14725690,roughness:.6}),lampHead:new ce({color:16777215})},this.material=Ud("props-v4",!0,16767392),this.materials.push(this.material);const o=new $e("props");this.buildMarinas(o.fork("marinas")),this.buildPrivateDocks(o.fork("docks")),this.buildFishingPiers(o.fork("piers")),this.buildChannelMarkers(o.fork("markers")),this.buildLifeguardTowers(o.fork("lifeguards")),this.buildClubhouse(o.fork("clubhouse")),this.buildPort(o),this.buildAirport(o),this.buildStadium(),this.buildLighthouse(),this.buildConstruction(o),this.buildLamps(e,n),this.buildSeawalls(),this.flush()}group=new Ye;material;materials=[];lampPositions=[];mooredBoatPositions=[];m=new jt;q=new Xe;p=new C;s=new C;boxes=[];cyls=[];lamps=[];chunks=[];proxies=[];mats;counts={boxes:0,cylinders:0,lamps:0,chunks:0,meshes:0};shoreDistance(t,e,n,i,o=400){const r=a=>this.map.heightAt(t+n*a,e+i*a)<.15;if(!r(0)){for(let a=1;a<=o;a+=1)if(r(a))return a-.5;return o}for(let a=1;a<=o;a+=1)if(!r(-a))return-(a-.5);return-o}piling(t,e,n,i=.18,o="wood"){const r=Math.min(this.map.heightAt(t,e),.2);this.cyl(o,t,r-.3,e,i,n-r+.3)}moor(t,e,n,i){this.map.heightAt(t,e)<-.6&&this.mooredBoatPositions.push({x:t,z:e,rot:n,len:i})}box(t,e,n,i,o,r,a,l=0,h=0){this.p.set(e,n+r/2,i),this.q.setFromEuler(new He(h,l,0)),this.s.set(o,r,a),this.boxes.push({m:this.m.compose(this.p,this.q,this.s).clone(),mat:t,size:gu(o,r,a)})}cyl(t,e,n,i,o,r,a=0,l=0){this.p.set(e,n+r/2,i),this.q.setFromEuler(new He(l,a,0)),this.s.set(o*2,r,o*2),this.cyls.push({m:this.m.compose(this.p,this.q,this.s).clone(),mat:t,size:gu(o*2,r,o*2)})}lamp(t,e,n){this.lamps.push({m:new jt().makeTranslation(t,e,n),mat:"steel",size:.24})}lampGeometry(t){const e=new be(.12,.12,9,t).translate(0,4.5,0),n=new kt(.2,.2,2.4).translate(0,9.1,0),i=new li(.22,6,4).translate(0,9.05,0),o=wy([{geometry:e,material:this.mats.steel},{geometry:n,material:this.mats.steel},{geometry:i,material:this.mats.lampHead,emissive:!0}]);return e.dispose(),n.dispose(),i.dispose(),o}flush(){const t=Vl(new kt(1,1,1)),e=Vl(new be(.5,.5,1,14)),n=Vl(new be(.5,.5,1,6)),i=this.lampGeometry(14),o=this.lampGeometry(6);for(const p of[t,e,n,i,o])p.computeBoundingSphere();const r=new Map,a=p=>{this.p.setFromMatrixPosition(p.m);const f=Vc(this.p.x,this.p.z,_y);let v=r.get(f);return v||(v={boxes:[],cylLarge:[],cylSmall:[],lamps:[]},r.set(f,v)),v},l=p=>p.size>My;for(const p of this.boxes)a(p).boxes.push(p);for(const p of this.cyls)(l(p)?a(p).cylLarge:a(p).cylSmall).push(p);for(const p of this.lamps)a(p).lamps.push(p);this.counts.boxes=this.boxes.length,this.counts.cylinders=this.cyls.length,this.counts.lamps=this.lamps.length;const h=new Ne,c=new C,d=new Vt(16777215);for(const p of r.values()){const f={meshes:[],box:new Be,center:new C,r:0,height:0,bits:0};p.boxes.sort((m,g)=>Number(l(g))-Number(l(m)));const v=(m,g,w,y)=>{if(!m.length)return;const x=g.clone(),b=y?null:new hs(new Float32Array(m.length*2),2);b&&x.setAttribute("aMatParams",b);const M=new Xi(x,this.material,m.length),S=new Be;let T=0;m.forEach((A,U)=>{M.setMatrixAt(U,A.m);const F=this.mats[A.mat];M.setColorAt(U,y?d:F.color),b?.setXY(U,F.roughness,F.metalness),l(A)&&T++,h.copy(g.boundingSphere).applyMatrix4(A.m),S.expandByPoint(c.copy(h.center).addScalar(-h.radius)),S.expandByPoint(c.copy(h.center).addScalar(h.radius))}),M.boundingSphere=S.getBoundingSphere(new Ne),M.castShadow=!0,M.receiveShadow=!0;let _=null;w&&(_=w.clone(),b&&_.setAttribute("aMatParams",b));const E={mesh:M,large:T,total:m.length,mainCount:m.length,hi:x,lo:_};M.onBeforeShadow=()=>{M.count=P2()?E.total:E.large},M.onAfterShadow=()=>{M.count=E.mainCount},f.box.union(S),f.meshes.push(E),this.group.add(M)};v(p.boxes,t,null,!1),v(p.cylLarge,e,null,!1),v(p.cylSmall,e,n,!1),v(p.lamps,i,o,!0),f.box.getBoundingSphere(h),f.center.copy(h.center),f.r=h.radius,f.height=f.box.max.y-f.box.min.y,this.chunks.push(f),this.counts.meshes+=f.meshes.length}this.counts.chunks=this.chunks.length;const u=(p,f,v)=>{const m=p.filter(y=>y.size>=Ey);if(!m.length)return;const g=new Xi(f,this.material,m.length),w=new Be;m.forEach((y,x)=>{g.setMatrixAt(x,y.m),h.copy(f.boundingSphere).applyMatrix4(y.m),w.expandByPoint(c.copy(h.center).addScalar(-h.radius)),w.expandByPoint(c.copy(h.center).addScalar(h.radius))}),g.boundingSphere=w.getBoundingSphere(new Ne),g.instanceMatrix.needsUpdate=!0,g.castShadow=!0,g.receiveShadow=!1,g.visible=!1,g.layers.mask=0,g.matrixAutoUpdate=!1,g.name=v,this.group.add(g),this.proxies.push(g)};u(this.boxes,t,"shadow-proxy-boxes"),u(this.cyls,n,"shadow-proxy-cylinders"),this.boxes.length=0,this.cyls.length=0,this.lamps.length=0}setNight(t){this.material.emissiveIntensity=8*t}updateLod(t,e,n){const i=Ty;i.fill(0);for(const r of this.chunks){r.bits=n.casterCascades(r.center,r.r,r.height);let a=0;for(const l of r.meshes)l.large>0&&a++;for(let l=0;l<yi;l++)r.bits&1<<l&&(i[l]+=a)}let o=0;for(let r=0;r<yi;r++)i[r]>this.proxies.length&&!Td(r)&&(o|=1<<r);for(const r of this.chunks){const a=Math.max(0,Math.hypot(r.center.x-t,r.center.z-e)-r.r),l=n.boxInView(r.box),h=r.bits&~o,c=a>Sy;for(const d of r.meshes){const u=c?d.large:d.total;d.mainCount=u,d.mesh.count=u;const p=l&&u>0,f=Vs(d.large>0?"all":"near",p,h),v=Ir(f);d.mesh.visible=p||v,d.mesh.castShadow=v,d.mesh.layers.mask=f,d.lo&&(d.mesh.geometry=a>by?d.lo:d.hi)}}for(const r of this.proxies)r.visible=r.castShadow=o!==0,r.layers.mask=o<<Dr}buildMarinas(t){for(const e of this.map.marinas){const n=t.fork(e.id),i=Math.sin(e.rot),o=-Math.cos(e.rot),r=-o,a=i,l=this.shoreDistance(e.x,e.z,i,o),h=e.x+i*l,c=e.z+o*l,d=e.piers*n.range(24,30)+24,u=.95,p=-e.rot,f=(M,S,T,_,E,A,U)=>this.box(M,S,T,_,E,A,U,p);f("concrete",h-i*.4,.3,c-o*.4,d,.9,1.2),f("wood",h-i*3.2,u-.3,c-o*3.2,d,.3,5.5);for(let M=-d/2+2;M<d/2;M+=n.range(5,8))this.piling(h+r*M+i*.4,c+a*M+o*.4,u+.55,.2);let v=-d/2+n.range(8,16);for(;v<d/2-8;){const M=h+r*v,S=c+a*v;let T=e.pierLen*n.range(.6,1.2);for(;T>30&&this.map.heightAt(M+i*T,S+o*T)>-1.2;)T-=6;if(T<=30){v+=n.range(22,34);continue}const _=M+i*T/2,E=S+o*T/2,A=n.chance(.3);f("wood",_,u-.3,E,A?3.2:2.2,.3,T);for(let F=n.range(2,6);F<T;F+=n.range(8,12))for(const I of[-1,1])this.piling(M+i*F+r*I*(A?1.7:1.3),S+o*F+a*I*(A?1.7:1.3),u+n.range(.4,.9),n.range(.15,.2));const U=n.range(10,14);for(let F=n.range(6,12);F<T-8;F+=U)for(const I of[-1,1]){if(n.chance(.18))continue;const B=n.range(6,9.5),k=M+i*F+r*I*(B/2+1),P=S+o*F+a*I*(B/2+1);if(f("wood",k,u-.4,P,B,.25,.9),this.piling(M+i*F+r*I*(B+.6),S+o*F+a*I*(B+.6),u+.4,.14),n.chance(.62)){const H=n.range(6.5,12.5),G=M+i*(F+U*.5)+r*I*(H*.45+1.2),N=S+o*(F+U*.5)+a*I*(H*.45+1.2);this.moor(G,N,e.rot+Math.PI/2,H)}}if(n.chance(.55)){const F=n.range(16,26),I=M+i*(T-1.2),B=S+o*(T-1.2);f("wood",I,u-.3,B,F,.3,2.4);for(const k of[-1,1])this.piling(I+r*k*F*.5,B+a*k*F*.5,u+.7,.2);for(const k of[-1,1])n.chance(.7)&&this.moor(I+i*4.5+r*k*F*.25,B+o*4.5+a*k*F*.25,e.rot+Math.PI/2,n.range(13,19))}v+=n.range(22,36)}const m=(n.chance(.5)?-1:1)*(d/2-6),g=h+r*m+i*7,w=c+a*m+o*7;f("wood",g,u-.3,w,9,.3,14);for(const M of[-1,1])this.piling(g+r*M*4+i*6,w+a*M*4+o*6,u+.6,.2);for(const M of[-1,1])this.cyl("steel",g+r*M*3,u,w+a*M*3,.16,4.4);f("white",g,u+4.4,w,10,.5,8),f("red",g,u,w,.9,1.3,.9),this.moor(g+i*12,w+o*12,e.rot+Math.PI/2,n.range(8,12));const y=h-i*22+r*n.range(-8,8),x=c-o*22+a*n.range(-8,8),b=this.map.heightAt(y,x);if(f("white",y,b,x,18,5.5,11),f("dark",y,b+5.5,x,19.5,.5,12.5),this.cyl("white",y+r*6,b+6,x+a*6,.9,5.5),this.markOccupied(y,x,22),n.chance(.7)){const M=h-i*26+r*(d/2-30)*(m>0?-1:1),S=c-o*26+a*(d/2-30)*(m>0?-1:1),T=this.map.heightAt(M,S);if(T>.9){f("steel",M,T+8.6,S,30,.4,10);for(const E of[-1,1])for(const A of[-1,1])this.cyl("steel",M+r*E*14+i*A*4.5,T,S+a*E*14+o*A*4.5,.2,8.6);const _=n.int(4,8);for(let E=0;E<_;E++)f(n.pick(["white","white","blue","red"]),M+r*n.range(-12,12)+i*n.range(-2,2),T+n.int(0,2)*2.8+.4,S+a*n.range(-12,12)+o*n.range(-2,2),2.4,1.4,7);this.markOccupied(M,S,20)}}if(n.chance(.6)){const M=n.chance(.5)?-1:1,S=h+r*M*(d/2+6),T=c+a*M*(d/2+6),_=n.range(40,90);for(let E=0;E<_;E+=n.range(3,4.5)){const A=S+i*E+r*n.range(-1.5,1.5),U=T+o*E+a*n.range(-1.5,1.5);if(this.map.heightAt(A,U)<-3)break;this.box("dark",A,-.8+n.range(0,.5),U,n.range(2.2,3.6),n.range(1.8,2.6),n.range(2.2,3.4),n.range(0,Math.PI),n.range(-.15,.15))}}}}buildPrivateDocks(t){const e=(n,i,o,r,a)=>{const l=this.shoreDistance(n,i,o,r,120);if(l<0||l>=120)return;const h=n+o*l,c=i+r*l,d=a.range(5,9);if(this.map.heightAt(h+o*(d+2),c+r*(d+2))>-.7)return;const p=-Math.atan2(o,-r),f=.75;this.box("wood",h+o*(d/2-1.5),f-.25,c+r*(d/2-1.5),1.8,.25,d+3,p);const v=-r,m=o;for(const g of[d-.6,d*.4])for(const w of[-1,1])this.piling(h+o*g+v*w*.8,c+r*g+m*w*.8,f+a.range(.3,.7),.13);if(a.chance(.55)){const g=a.chance(.5)?-1:1,w=a.range(5.5,10);this.moor(h+o*(d*.6)+v*g*2.4,c+r*(d*.6)+m*g*2.4,p,w)}else if(a.chance(.35)){const g=a.chance(.5)?-1:1;for(const w of[d*.25,d*.8])for(const y of[1.4,4.2])this.piling(h+o*w+v*g*y,c+r*w+m*g*y,f+2.6,.12,"steel");this.box("steel",h+o*(d*.52)+v*g*2.8,f+2.6,c+r*(d*.52)+m*g*2.8,3.4,.2,d*.6,p)}};for(let n=0;n<5;n++){const i=1870-n*25,o=-3e3+n*330,r=t.fork(`finger-${n}`);for(const a of[-1,1])for(let l=-280+r.range(0,30);l<280;l+=r.range(26,44))r.chance(.25)||e(i+l,o+a*60,0,a,r)}for(const n of this.map.canals){const i=t.fork(n.id),o=Math.min(n.a[0],n.b[0]),r=Math.max(n.a[0],n.b[0]);for(let a=o+i.range(15,40);a<r-15;a+=i.range(30,55)){if(n.culverts.some(h=>Math.abs(h-a)<n.culvertHalf+12)||i.chance(.35))continue;const l=i.chance(.5)?-1:1;e(a,n.a[1]-l*(n.width*.5+14),0,l,i)}}}buildFishingPiers(t){const e=[[2700,-4650,1,0,170],[2600,-2350,1,.05,150],[1800,6700,-.2,1,130]];for(const[n,i,o,r,a]of e){const l=t.fork(`${n}-${i}`),h=Math.hypot(o,r),c=o/h,d=r/h,u=this.shoreDistance(n,i,c,d,600);if(u<0||u>=600)continue;const p=n+c*(u-22),f=i+d*(u-22),v=-Math.atan2(c,-d),m=2.6,g=a+22;this.box("wood",p+c*g/2,m-.3,f+d*g/2,3.4,.3,g,v);const w=-d,y=c;for(let S=0;S<g;S+=l.range(7,10))for(const T of[-1,1])this.piling(p+c*S+w*T*1.5,f+d*S+y*T*1.5,m+1.1,.2);for(const S of[-1,1])this.box("wood",p+c*g/2+w*S*1.6,m+.9,f+d*g/2+y*S*1.6,.1,.1,g,v);const x=p+c*(g-2.5),b=f+d*(g-2.5),M=l.range(14,20);this.box("wood",x,m-.3,b,M,.3,5,v);for(const S of[-1,1])this.piling(x+w*S*M*.5,b+y*S*M*.5,m+1.2,.22);this.box(l.pick(["white","blue","orange"]),x+w*M*.22,m,b+y*M*.22,4.5,3,4,v),this.box("dark",x+w*M*.22,m+3,b+y*M*.22,5.2,.3,4.8,v);for(const S of[-1,1])this.cyl("steel",x-w*M*.3+c*S*1.6,m,b-y*M*.3+d*S*1.6,.08,3.2);this.box("white",x-w*M*.3,m+3.2,b-y*M*.3,5,.15,4,v),this.box("white",p-c*2+w*3.5,this.map.heightAt(p-c*2+w*3.5,f-d*2+y*3.5),f-d*2+y*3.5,4,3.2,4,v),this.markOccupied(p,f,12)}}buildChannelMarkers(t){for(const e of this.map.channels){if(e.width>=250||e.depth<3.5)continue;const n=t.fork(e.id);let i=n.range(60,200);for(let o=0;o<e.pts.length-1;o++){const[r,a]=e.pts[o],[l,h]=e.pts[o+1],c=Math.hypot(l-r,h-a),d=(l-r)/c,u=(h-a)/c;let p=i;for(;p<c;p+=n.range(260,420)){const f=r+d*p,v=a+u*p,m=e.width*.5+n.range(6,14);for(const g of[-1,1]){if(n.chance(.3))continue;const w=f-u*m*g+n.range(-3,3),y=v+d*m*g+n.range(-3,3);if(this.map.heightAt(w,y)>-1.2)continue;const x=n.range(3.2,4.2);this.piling(w,y,x,.24,"wood"),this.box(g>0?"red":"green",w,x-1.1,y,1.1,1.1,.25,Math.atan2(d,-u)),n.chance(.3)&&this.box("white",w,x+.1,y,.5,.5,.5)}}i=p-c}}}buildLifeguardTowers(t){const e=[[2600,-7600,1,0,0,1],[3e3,4900,1,.2,-.2,1]],n=["white","yellow","orange","blue","red"];for(const[i,o,r,a,l,h]of e){const c=t.fork(`${i}`),d=i>2900?1600:6e3;for(let u=c.range(120,300);u<d;u+=c.range(380,620)){const p=i+l*u,f=o+h*u,v=this.shoreDistance(p,f,r,a,900);if(v<=0||v>=900)continue;let m=v-14;for(;m>0&&this.map.heightAt(p+r*m,f+a*m)<1;)m-=3;const g=p+r*m,w=f+a*m,y=this.map.heightAt(g,w);if(y<.9||y>3.2||this.map.zoneAt(g,w)!==2)continue;const x=-Math.atan2(r,-a)+c.range(-.2,.2),b=Math.cos(x),M=Math.sin(x),S=c.pick(n);for(const[T,_]of[[-1.2,-1.2],[1.2,-1.2],[1.2,1.2],[-1.2,1.2]])this.cyl("wood",g+T*b-_*M,y,w+T*M+_*b,.12,3);this.box(S,g,y+3,w,3.2,2.4,3,x),this.box("white",g,y+5.4,w,3.9,.25,3.7,x),this.box("wood",g,y+2.9,w,3.6,.15,3.4,x);for(let T=0;T<4;T++)this.box("wood",g-r*(2.2+T*1.1),y+2.9-(T+1)*.7,w-a*(2.2+T*1.1),1,.12,1.2,x);this.markOccupied(g,w,6)}}}buildClubhouse(t){const e=this.map.pois.find(y=>y.kind==="clubhouse");if(!e)return;const n=this.map.heightAt(e.x,e.z);if(n<1)return;const i=Math.cos(e.rot),o=Math.sin(e.rot),r=(y,x)=>[e.x+y*i-x*o,e.z+y*o+x*i],[a,l]=r(0,0);this.box("white",a,n,l,34,5.5,18,e.rot),this.box("dark",a,n+5.5,l,37,.6,21,e.rot),this.box("white",a,n+6.1,l,12,2.4,8,e.rot),this.box("dark",a,n+8.5,l,13.5,.4,9.5,e.rot);const[h,c]=r(0,13);this.box("wood",h,n+.4,c,34,.3,8,e.rot),this.box("white",h,n+4.6,c,35,.35,9,e.rot);for(let y=-3;y<=3;y++){const[x,b]=r(y*5.5,16.5);this.cyl("white",x,n+.7,b,.22,3.9)}const[d,u]=r(24,-4);this.box("white",d,n,u,14,4,12,e.rot),this.box("dark",d,n+4,u,15.5,.5,13.5,e.rot);const[p,f]=r(-26,-8);this.box("concrete",p,n,f,16,3.4,14,e.rot),this.box("dark",p,n+3.4,f,17,.4,15,e.rot);for(let y=0;y<5;y++){const[x,b]=r(-30+y*3.2,3+t.range(-1,1));this.box("white",x,n,b,1.3,1.1,2.4,e.rot),this.box("dark",x,n+1.6,b,1.4,.1,2.2,e.rot)}const[v,m]=r(4,32);this.box("grass",v,n+.05,m,30,.2,20,e.rot),this.cyl("white",v+4,n+.25,m-3,.04,2.2),this.box("red",v+4.3,n+2,m-3,.6,.4,.05,e.rot);const[g,w]=r(-6,-22);this.box("dark",g,n-.05,w,48,.2,18,e.rot),this.markOccupied(e.x,e.z,60)}buildPort(t){const e=xd,n=Math.cos(e.rot),i=Math.sin(e.rot),o=(M,S)=>[e.cx+M*n-S*i,e.cz+M*i+S*n],r=-.04,a=(M,S,T,_,E,A,U)=>{const[F,I]=o(S,_);this.box(M,F,T,I,E,A,U,r)},l=(M,S,T,_,E,A)=>{const[U,F]=o(S,_);this.cyl(M,U,T,F,E,A,r)},h=(M,S)=>{const[T,_]=o(M,S);return this.map.heightAt(T,_)},c=(M,S,T)=>{const[_,E]=o(M,S);this.markOccupied(_,E,T)},d=["red","blue","green","orange","steel","white","blue","red"],u=-300,p=[];for(let M=-780;M<e.hw-150;M+=t.range(185,240))p.push(M);for(const M of p){const S=u+16,T=h(M,S);if(T<1)continue;const _=18,E=40+t.range(-3,5);for(const A of[-1,1])for(const U of[-1,1])a("steel",M+A*_/2,T,S+U*6,1.6,E,1.6);a("steel",M,T+E,S-4,_+4,3,3),a("steel",M,T+E,S+4,_+4,3,3),a("orange",M,T+E+3,S-26,3.2,3,58),a("steel",M,T+E+5,S+12,3,3,18),a("white",M,T+E-14,S-12,6,4,6)}for(const[M,S,T,_]of[[-420,190,30,9],[330,130,22,7]]){const E=u-T/2-3;a("dark",M,-2.5,E,S,_+2.5,T),a(t.pick(["red","blue"]),M,_,E,S-6,1.6,T-2),a("white",M+S*.36,_+1.6,E,S*.14,12,T-6);for(let A=0;A<4;A++)a("steel",M-S*.32+A*S*.18,_+1.6,E,3,6+A%2*3,2)}const f=u+70,v=40;for(let M=-860;M<e.hw-260;M+=175)for(let S=f;S<v-40;S+=58){if(t.chance(.12))continue;const T=h(M+60,S+20);if(T<1)continue;const _=6,E=10,A=t.range(1,4);for(let U=0;U<_;U++)for(let F=0;F<E;F++){if(t.chance(.28))continue;const I=Math.min(4,Math.max(1,Math.round(A+t.range(-1.5,1.5)))),B=M+F*13.4,k=S+U*6.1;for(let P=0;P<I;P++)a(t.pick(d),B,T+P*2.6,k,12.2,2.6,4.9)}c(M+60,S+15,80),t.chance(.5)&&l("steel",M-8,T,S-6,.3,30)}let m=-810;for(;m<e.hw-520;){const M=t.range(120,170),S=t.range(40,55),T=150+t.range(-10,10),_=h(m+M/2,T);if(_>=1){a(t.pick(["concrete","white","tank"]),m+M/2,_,T,M,11+t.range(0,3),S),a("dark",m+M/2,_+11+3,T,M+2,.6,S+2);for(let E=0;E<6;E++)a("steel",m+12+E*(M-24)/5,_,T+S/2+3,4,4.2,6);c(m+M/2,T,Math.max(M,S)*.6)}m+=M+t.range(30,60)}const g=e.hh,w=260,y=h(w,g-60);a("white",w,y,g-60,260,12,40),a("glass",w,y+12,g-60,240,4,36),a("white",w,y,g-20,120,7,30),c(w,g-55,150);const x=g+19;a("dark",w,-2.5,x,290,12.5,36),a("white",w,10,x,280,28,32);for(let M=0;M<6;M++)a("glass",w,13.5+M*3.5,x,276,1.2,33);a("white",w-30,38,x,90,8,22),l("dark",w-90,38,x,4,14);const b=this.map.pois.find(M=>M.kind==="tanks");for(let M=0;M<9;M++){const S=b.x+M%3*52-52,T=b.z+Math.floor(M/3)*52-52,_=this.map.heightAt(S,T);_<1||(this.cyl("tank",S,_,T,t.range(14,22),t.range(10,16)),this.markOccupied(S,T,26))}}buildAirport(t){const e=this.map.pois.find(h=>h.kind==="terminal"),n=this.map.heightAt(e.x,e.z);this.box("white",e.x,n,e.z,260,14,60),this.box("glass",e.x,n+3,e.z+30.5,250,7,1.2),this.box("steel",e.x,n+14,e.z,270,2,66);for(let h=-1;h<=1;h++)this.box("white",e.x+h*90,n,e.z+90,30,9,120),this.box("steel",e.x+h*90,n+9,e.z+90,32,1.2,122);this.box("dark",e.x,n-.1,e.z+130,520,.4,220),this.cyl("concrete",e.x+220,n,e.z-40,4,38),this.box("glass",e.x+220,n+38,e.z-40,14,5,14,.4),this.box("white",e.x+220,n+43,e.z-40,16,1.5,16,.4);const i=this.map.pois.find(h=>h.kind==="hangars");for(let h=0;h<4;h++){const c=i.x+h*80,d=i.z,u=this.map.heightAt(c,d);this.box("concrete",c,u,d,64,12,50),this.box("steel",c,u+12,d,60,5,40),this.box("steel",c,u+17,d,40,3,30),this.markOccupied(c,d,40)}for(let h=-1;h<=1;h++)for(const c of[-1,1]){const d=e.x+h*90+c*34,u=e.z+110;this.cyl("white",d,n+2.2,u,2.6,38,0,Math.PI/2),this.box("white",d,n+2.5,u+2,34,.8,5,0),this.box("white",d,n+3,u+17,12,.6,3),this.box("white",d,n+4,u+18,.6,9,3),this.cyl("steel",d-9,n+.8,u+4,1.4,4.5,0,Math.PI/2),this.cyl("steel",d+9,n+.8,u+4,1.4,4.5,0,Math.PI/2)}this.markOccupied(e.x,e.z+60,320);const o=this.map.runways.find(h=>h.id==="strip-southkey"),r=(o.a[0]+o.b[0])/2+40,a=(o.a[1]+o.b[1])/2-60,l=this.map.heightAt(r,a);l>1&&(this.box("concrete",r,l,a,26,7,20,.55),this.box("steel",r,l+7,a,24,2.5,16,.55),this.markOccupied(r,a,20))}buildStadium(){const t=this.map.pois.find(r=>r.kind==="stadium"),e=this.map.heightAt(t.x,t.z);if(e<1)return;const n=40,i=t.size,o=t.size*.8;for(let r=0;r<n;r++){const a=r/n*Math.PI*2+t.rot,l=Math.cos(a),h=Math.sin(a),c=t.x+l*i,d=t.z+h*o,u=2*Math.PI*(i+o)/2/n+2,p=Math.atan2(l*o,-h*i);this.box("concrete",c,e,d,u,14,22,p),this.box("concrete",c+l*10,e+14,d+h*10,u,12,16,p),this.box("white",c+l*12,e+26,d+h*12,u,1.5,34,p),this.box("steel",c+l*26,e,d+h*26,1.4,30,1.4)}this.box("grass",t.x,e+.05,t.z,i*1.2,.3,o*1.15,t.rot),this.markOccupied(t.x,t.z,i+40)}buildLighthouse(){const t=this.map.pois.find(n=>n.kind==="lighthouse"),e=this.map.heightAt(t.x,t.z);e<.5||(this.cyl("white",t.x,e,t.z,4.2,28),this.cyl("red",t.x,e+10,t.z,4.25,5),this.cyl("dark",t.x,e+28,t.z,2.4,3.5),this.cyl("white",t.x,e+31.5,t.z,1.6,1.4),this.box("white",t.x+12,e,t.z+6,12,5,9,.3),this.markOccupied(t.x,t.z,20))}buildConstruction(t){for(const e of this.map.districts)if(e.id.startsWith("construction")){const n=this.map.heightAt(e.cx,e.cz);if(n<1)continue;const i=t.int(5,12),o=e.hw*1.2,r=e.hh*1.2;for(let h=1;h<=i;h++)this.box("concrete",e.cx,n+h*3.6,e.cz,o,.4,r,e.rot);for(const[h,c]of[[-.4,-.4],[.4,-.4],[.4,.4],[-.4,.4],[0,0],[0,-.4],[0,.4],[-.4,0],[.4,0]]){const d=Math.cos(e.rot),u=Math.sin(e.rot),p=e.cx+h*o*d-c*r*u,f=e.cz+h*o*u+c*r*d;this.cyl("concrete",p,n,f,.45,i*3.6+.4)}this.box("concrete",e.cx+o*.15,n,e.cz,10,i*3.6+6,8,e.rot);const a=e.cx-o*.6,l=e.cz+r*.6;this.box("yellow",a,n,l,2.2,i*3.6+30,2.2),this.box("yellow",a+20,n+i*3.6+30,l,60,1.6,1.6,.4),this.box("yellow",a-8,n+i*3.6+30,l,14,1.6,1.6,.4);for(let h=0;h<5;h++)this.box(t.pick(["blue","white","orange"]),e.cx+t.range(-o,o)*.7,n,e.cz+r*.85,6,2.6,2.4,e.rot);this.markOccupied(e.cx,e.cz,Math.max(o,r))}}buildLamps(t,e){for(const n of t){if(n.cls!=="highway"&&n.cls!=="arterial"&&n.cls!=="causeway")continue;const i=n.b[0]-n.a[0],o=n.b[1]-n.a[1],r=Math.hypot(i,o),a=i/r,l=o/r;let h=0;for(let c=20;c<r;c+=45,h++){const d=h%2===0?-1:1,u=n.a[0]+a*c+-l*(n.width/2+1)*d,p=n.a[1]+l*c+a*(n.width/2+1)*d,f=this.map.heightAt(u,p);f<.8||this.lampPositions.push(new C(u,f,p))}}for(const n of e)this.lampPositions.push(n.clone());for(const n of this.lampPositions)this.lamp(n.x,n.y,n.z)}buildSeawalls(){const t=this.map.districts.find(i=>i.id==="industrial-port"),e=Math.cos(t.rot),n=Math.sin(t.rot);for(let i=-t.hw;i<=t.hw;i+=6)for(const o of[-1,1]){const r=t.cx+i*e-o*t.hh*n,a=t.cz+i*n+o*t.hh*e;this.box("concrete",r,1.4,a,6.2,2.2,2,t.rot)}}}function co(s,t,e){const n=s/2,i=t/2,o=[[-n,-e*.55,0],[n*.55,-e*.55,0],[-n,-e*.1,-i*.95],[-n,-e*.1,i*.95],[n*.35,-e*.15,-i],[n*.35,-e*.15,i],[n,.05,0],[-n,e*.45,-i],[-n,e*.45,i],[n*.4,e*.45,-i*.95],[n*.4,e*.45,i*.95],[n,e*.55,0]],r=[[0,2,4],[0,4,1],[0,1,5],[0,5,3],[1,4,6],[1,6,5],[2,7,9],[2,9,4],[4,9,11],[4,11,6],[3,5,10],[3,10,8],[5,6,11],[5,11,10],[0,3,8],[0,8,7],[0,7,2],[7,8,10],[7,10,9],[9,10,11]],a=[];for(const h of r)for(const c of h)a.push(o[c][0],o[c][1],o[c][2]);const l=new oe;return l.setAttribute("position",new Mt(a,3)),l.computeVertexNormals(),l}class Cy{mats={white:new ce({color:16053488,roughness:.35,metalness:.05}),hullDark:new ce({color:2042424,roughness:.5}),hullRed:new ce({color:10104618,roughness:.55}),hullBlue:new ce({color:2051978,roughness:.5}),teak:new ce({color:11569754,roughness:.8}),glass:new ce({color:2241348,roughness:.1,metalness:.9}),sail:new ce({color:16316142,roughness:.9,side:nn}),steel:new ce({color:9213084,roughness:.5,metalness:.6}),containerWhite:new ce({color:16777215,roughness:.7})};get materials(){return[this.mats.white,this.mats.hullDark,this.mats.hullRed,this.mats.hullBlue,this.mats.teak,this.mats.glass,this.mats.sail,this.mats.steel,this.mats.containerWhite]}build(t,e){const n=new Ye,i=(r,a,l,h,c,d=0,u=0,p=0)=>{const f=new pe(r,a);return f.position.set(l,h,c),f.rotation.set(d,u,p),f.castShadow=!0,f.receiveShadow=!0,n.add(f),f},o=e.pick([this.mats.white,this.mats.white,this.mats.hullDark,this.mats.hullBlue,this.mats.hullRed]);switch(t){case"speed":{const r=e.range(7,10),a=r*.3;return i(co(r,a,1.4),o,0,.3,0),i(new kt(r*.25,.5,a*.8),this.mats.glass,r*.05,1.05,0,0,0,-.35),i(new kt(r*.35,.35,a*.75),this.mats.teak,-r*.2,.8,0),i(new kt(.6,.6,.8),this.mats.steel,-r*.45,.6,0),{group:n,len:r,beam:a,draft:.5,wakeWidth:a*1.4}}case"console":{const r=e.range(6,8),a=r*.32;i(co(r,a,1.3),this.mats.white,0,.3,0),i(new kt(1.2,1.4,1),this.mats.white,0,1.2,0),i(new kt(1.6,.15,1.6),this.mats.hullDark,0,2.3,0);for(const l of[-1,1])i(new be(.04,.04,1.6,6),this.mats.steel,.6*l,1.5,.7*l);return i(new kt(.5,.7,.5),this.mats.hullDark,-r*.45,.7,0),{group:n,len:r,beam:a,draft:.45,wakeWidth:a*1.3}}case"yacht":{const r=e.range(18,32),a=r*.25;return i(co(r,a,r*.16),this.mats.white,0,r*.04,0),i(new kt(r*.5,r*.09,a*.8),this.mats.white,-r*.05,r*.13,0),i(new kt(r*.48,r*.04,a*.82),this.mats.glass,-r*.05,r*.135,0),i(new kt(r*.28,r*.07,a*.6),this.mats.white,-r*.12,r*.21,0),i(new kt(r*.26,r*.03,a*.62),this.mats.glass,-r*.12,r*.215,0),i(new kt(r*.06,r*.09,a*.5),this.mats.white,-r*.2,r*.29,0,0,0,.3),i(new be(.15,.15,1.2,8),this.mats.steel,-r*.2,r*.34,0),{group:n,len:r,beam:a,draft:r*.06,wakeWidth:a*1.5}}case"sail":{const r=e.range(9,14),a=r*.31;i(co(r,a,r*.14),o,0,r*.03,0),i(new kt(r*.3,.7,a*.6),this.mats.white,-r*.05,r*.09+.3,0);const l=r*1.25;i(new be(.06,.09,l,6),this.mats.steel,r*.05,l/2+r*.08,0);const h=new oe;h.setAttribute("position",new Mt([0,0,0,0,l*.9,0,-r*.42,0,0],3)),h.computeVertexNormals(),i(h,this.mats.sail,r*.05,r*.13,0,0,0,0);const c=new oe;return c.setAttribute("position",new Mt([0,0,0,0,l*.75,0,r*.4,0,0],3)),c.computeVertexNormals(),i(c,this.mats.sail,r*.05,r*.13,.05,0,0,0),n.rotation.z=.12,{group:n,len:r,beam:a,draft:1.5,wakeWidth:a*.9}}case"ferry":return i(co(42,12,5),this.mats.hullBlue,0,1.5,0),i(new kt(42*.8,3.2,12*.9),this.mats.white,-1,4.9,0),i(new kt(42*.78,1.2,12*.92),this.mats.glass,-1,5.2,0),i(new kt(42*.4,2.8,12*.6),this.mats.white,-4,7.8,0),i(new be(.6,.7,3,10),this.mats.hullDark,-12,10.5,0),{group:n,len:42,beam:12,draft:2.2,wakeWidth:12*1.3};case"cargo":{const r=e.range(120,180),a=r*.16,l=r*.075;i(co(r,a,l),this.mats.hullDark,0,l*.15,0),i(new kt(r*.9,.8,a*.98),this.mats.hullRed,0,l*.6,0),i(new kt(r*.09,l*1.6,a*.9),this.mats.white,-r*.38,l*.6+l*.8,0),i(new kt(r*.1,2,a*.95),this.mats.glass,-r*.38,l*.6+l*1.55,0),i(new be(1.2,1.5,l*.9,10),this.mats.hullDark,-r*.44,l*.6+l*1.9,0);const h=Math.floor(r*.6/6.4),c=Math.max(3,Math.floor(a/2.6)),d=[];for(let v=0;v<h;v++)for(let m=0;m<c;m++){const g=e.int(1,4);for(let w=0;w<g;w++)d.push({x:r*.3-v*6.4,y:l*.6+.8+1.3+w*2.6,z:(m-(c-1)/2)*2.5,c:e.int(0,5)})}const u=new Xi(new kt(6.1,2.6,2.44),this.mats.containerWhite,d.length),p=new jt,f=[12597547,3049153,2600544,14059792,8227731,15528177].map(v=>new Vt(v));return d.forEach((v,m)=>{u.setMatrixAt(m,p.makeTranslation(v.x,v.y,v.z)),u.setColorAt(m,f[v.c])}),u.castShadow=!0,u.receiveShadow=!0,n.add(u),{group:n,len:r,beam:a,draft:l*.5,wakeWidth:a*1.4}}}}}function Ry(s){let t=0;for(let e=0;e<s.length-1;e++)t+=Math.hypot(s[e+1][0]-s[e][0],s[e+1][1]-s[e][1]);return t}function Py(s,t,e){let n=0;for(let i=0;i<s.length-1;i++){const o=Math.hypot(s[i+1][0]-s[i][0],s[i+1][1]-s[i][1]);if(t<=n+o||i===s.length-2){const r=Qt((t-n)/o,0,1);e.dx=(s[i+1][0]-s[i][0])/o,e.dz=(s[i+1][1]-s[i][1])/o,e.x=s[i][0]+e.dx*o*r,e.z=s[i][1]+e.dz*o*r;return}n+=o}}function Wl(s){s.updateMatrixWorld(!0);const t=s.matrixWorld.clone().invert(),e=new yy,n=new jt,i=new jt,o=new Vt;return s.traverse(r=>{const a=r;if(!a.isMesh)return;n.multiplyMatrices(t,a.matrixWorld);const l=a.material,h=r;if(h.isInstancedMesh)for(let c=0;c<h.count;c++)h.getMatrixAt(c,i),h.instanceColor&&h.getColorAt(c,o),e.add(a.geometry,i.premultiply(n),l,h.instanceColor?o:void 0);else e.add(a.geometry,n,l);a.geometry.dispose()}),e.build()}const vu=5e3,xu=3;function Ly(){const s=[[new kt(4.4,1,1.9),0,0,.65,0],[new kt(2.2,.75,1.7),1,-.2,1.5,0],[new kt(.2,.25,1.6),2,2.2,.8,0]],t=[],e=[],n=[],i=[];for(const[r,a,l,h,c]of s){const d=r.translate(l,h,c).toNonIndexed(),u=d.getAttribute("position"),p=d.getAttribute("normal"),f=d.getAttribute("uv");for(let v=0;v<u.count;v++)t.push(u.getX(v),u.getY(v),u.getZ(v)),e.push(p.getX(v),p.getY(v),p.getZ(v)),n.push(f.getX(v),f.getY(v)),i.push(a);d.dispose(),r.dispose()}const o=new oe;return o.setAttribute("position",new Mt(t,3)),o.setAttribute("normal",new Mt(e,3)),o.setAttribute("uv",new Mt(n,2)),o.setAttribute("aPart",new Mt(i,1)),o.computeBoundingSphere(),o}function Dy(){const s=new ce({color:16777215,emissive:16773840,emissiveIntensity:0}),t=new Vt(1712684),e=n=>n.toFixed(6);return s.onBeforeCompile=n=>{n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
attribute float aPart;
varying float vPart;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vPart = aPart;`),n.fragmentShader=n.fragmentShader.replace("#include <common>",`#include <common>
varying float vPart;`).replace("#include <color_fragment>",`#include <color_fragment>
if (vPart > 1.5) diffuseColor.rgb = vec3(1.0);
else if (vPart > 0.5) diffuseColor.rgb = vec3(${e(t.r)}, ${e(t.g)}, ${e(t.b)});`).replace("#include <roughnessmap_fragment>","float roughnessFactor = vPart > 1.5 ? 1.0 : (vPart > 0.5 ? 0.15 : 0.35);").replace("#include <metalnessmap_fragment>","float metalnessFactor = vPart > 1.5 ? 0.0 : (vPart > 0.5 ? 0.8 : 0.4);").replace("#include <emissivemap_fragment>","totalEmissiveRadiance *= step(1.5, vPart);")},s.customProgramCacheKey=()=>"traffic-car-v1",s}class Iy{constructor(t,e,n,i,o,r){this.map=t,this.wakeScene=i;const a=new $e(`traffic-${o}`),l=new Cy,h=[];for(const I of t.channels){const B=Ry(I.pts);for(let k=0;k<I.boats;k++){const P=I.id==="ocean-route"||I.id==="ship-channel"?a.chance(.6)?"cargo":"ferry":a.pick(["speed","speed","console","yacht","sail","speed"]),H=l.build(P,a),G=P==="cargo"?a.range(4,6):P==="ferry"?7:P==="sail"?a.range(2.5,4):P==="yacht"?a.range(5,9):a.range(9,16),N=new go(P==="cargo"?90:80,H.wakeWidth,P==="cargo"?70:P==="sail"?20:42,P==="sail"?.45:1.5);i.add(N.mesh),h.push(Wl(H.group)),this.boats.push({id:h.length-1,route:I.pts,routeLen:B,s:a.range(0,B),dir:a.chance(.5)?1:-1,speed:G,len:H.len,draft:H.draft,wake:N,phase:a.range(0,100)})}}const c=[];for(const I of r){const B=l.build(a.chance(.4)?"sail":a.chance(.5)?"speed":a.chance(.5)?"console":"yacht",a),k=Qt(I.len/B.len,.6,1.4);B.group.scale.setScalar(k),B.group.position.set(I.x,.05,I.z),B.group.rotation.y=I.rot+(a.chance(.5)?Math.PI:0),h.push(Wl(B.group)),c.push({idx:h.length-1,m:B.group.matrixWorld.clone()})}this.boatCount=this.boats.length+r.length;const d=new Map;for(const I of t.roads)d.set(I.id,I.pts.map(([B,k])=>new C(B,t.heightAt(B,k)+.25,k)));for(const[I,B]of d){const k=t.roads.find(P=>P.id===I);this.carRoutes.push({pts:B,length:this.len3(B),lanes:k.lanes,width:k.width})}for(const I of n)this.carRoutes.push({pts:I.pts.map(B=>B.clone().add(new C(0,.25,0))),length:this.len3(I.pts),lanes:I.lanes,width:I.width});for(const I of e){if(I.cls!=="street"||a.next()>.35)continue;const B=[new C(I.a[0],t.heightAt(I.a[0],I.a[1])+.25,I.a[1]),new C(I.b[0],t.heightAt(I.b[0],I.b[1])+.25,I.b[1])];this.carRoutes.push({pts:B,length:this.len3(B),lanes:2,width:I.width})}const u=["#e8e8e8","#d0d0d0","#1c1c1e","#8a8f94","#b8352e","#2b4c8c","#d9a441","#3d6b3a","#f2f2f2","#6c6f73","#c94f3d","#20242a"];for(let I=0;I<this.carRoutes.length;I++){const B=this.carRoutes[I],k=t.roads.find(G=>G.pts.length===B.pts.length&&G.pts[0][0]===B.pts[0].x),P=k?k.traffic:B.lanes>=4?10:1.2,H=Math.min(120,Math.round(B.length/1e3*P));for(let G=0;G<H;G++){const N=a.chance(.5)?1:-1;this.cars.push({route:I,s:a.range(0,B.length),dir:N,lane:a.int(0,Math.max(0,Math.floor(B.lanes/2)-1)),speed:a.range(11,26)*(B.lanes>=4?1.2:.8),color:new Vt(a.pick(u))})}}this.carCount=this.cars.length;const p=Ly();this.carMat=Dy(),this.materials.push(this.carMat);const f=new Map,v=new Array(this.carRoutes.length).fill(0);for(const I of this.cars)v[I.route]++;const m=new Set,g=new C;for(let I=0;I<this.carRoutes.length;I++){if(!v[I])continue;const B=this.carRoutes[I].pts;m.clear();for(let k=0;k<B.length-1;k++){const P=B[k],H=B[k+1],G=Math.max(1,Math.ceil(P.distanceTo(H)/40));for(let N=0;N<=G;N++){g.lerpVectors(P,H,N/G);const $=Vc(g.x,g.z,vu);m.has($)||(m.add($),f.set($,(f.get($)??0)+v[I]))}}}const w=(I,B)=>{const k=new Xi(p,this.carMat,I);return k.instanceMatrix.setUsage(kh),k.setColorAt(0,this.cars[0]?.color??new Vt(16777215)),k.instanceColor.setUsage(kh),k.castShadow=!0,k.count=0,k.visible=!1,A2(k,"mid"),B?k.boundingSphere=new Ne:k.frustumCulled=!1,this.group.add(k),{mesh:k,capacity:I,n:0,center:new C,r:0,box:new Be}};for(const[I,B]of f){const k=w(B,!0);this.carCells.set(I,k),this.carChunks.push(k)}this.carOverflow=w(Math.max(1,this.cars.length),!1),this.carChunks.push(this.carOverflow);const y=new ce({color:16054008,roughness:.35,metalness:.2}),x=new ce({color:2781119,roughness:.4}),b=I=>{const B=new Ye,k=new pe(new be(1.9,1.9,38,12),y);k.rotation.z=Math.PI/2,B.add(k);const P=new pe(new li(1.9,12,8),y);P.position.x=19,P.scale.set(1.6,1,1),B.add(P);const H=new pe(new kt(6,.5,34),y);H.position.set(1,-.8,0),H.rotation.y=0,B.add(H);const G=new pe(new kt(5,.4,16),y);G.position.set(-3,-.8,12),G.rotation.y=-.45,B.add(G);const N=G.clone();N.position.z=-12,N.rotation.y=.45,B.add(N);const $=new pe(new kt(5,8,.4),x);$.position.set(-16,4.5,0),$.rotation.z=-.4,B.add($);const W=new pe(new kt(4,.3,12),y);W.position.set(-17,1,0),B.add(W);for(const et of[-1,1]){const X=new pe(new be(1.1,1,4.5,10),y);X.rotation.z=Math.PI/2,X.position.set(3,-2.4,et*7),B.add(X)}return B.scale.setScalar(I),h.push(Wl(B)),h.length-1},M=t.runways[0],S=(I,B)=>{const k=se(4e3,M.a[0],I),P=se(M.a[1]+30,M.a[1],I),H=se(900,12,Math.pow(I,.9));return B.set(k,H,P)};this.aircraft.push({id:b(1),path:S,period:240,offset:0,contrail:null}),this.aircraft.push({id:b(.9),path:S,period:240,offset:.5,contrail:null});const T=(I,B)=>{const k=se(M.b[0],-9e3,I),P=M.b[1]-3500*I*I;return B.set(k,12+2200*Math.pow(I,.8),P)};this.aircraft.push({id:b(1),path:T,period:200,offset:.2,contrail:null});const _=(I,B)=>B.set(se(-14e3,14e3,I),9500,se(-9e3,6e3,I)),E=new go(180,25,90,.6,Gc);this.aircraft.push({id:b(1),path:_,period:260,offset:.4,contrail:E});let A=0;for(const I of h)A+=I.getAttribute("position").count;const U=Ud("traffic-movers-v1",!0);this.materials.push(U),this.movers=new vx(h.length,A,A,U);const F=h.map(I=>{const B=this.movers.addInstance(this.movers.addGeometry(I));return I.dispose(),B});for(const I of this.boats)I.id=F[I.id];for(const I of this.aircraft)I.id=F[I.id];for(const I of c)this.movers.setMatrixAt(F[I.idx],I.m);this.movers.frustumCulled=!1,this.movers.castShadow=!0,this.movers.receiveShadow=!0,this.group.add(this.movers)}group=new Ye;materials=[];boats=[];carRoutes=[];cars=[];carChunks=[];carCells=new Map;carOverflow;carMat;movers;aircraft=[];tmp={x:0,z:0,dx:1,dz:0};tmpM=new jt;tmpQ=new Xe;tmpP=new C;tmpS=new C(1,1,1);tmpE=new He(0,0,0,"YXZ");up=new C(0,1,0);pos=new C;dir=new C;side=new C;ahead=new C;boatCount=0;carCount=0;len3(t){let e=0;for(let n=0;n<t.length-1;n++)e+=t[n].distanceTo(t[n+1]);return e}point3(t,e,n,i){let o=0;for(let r=0;r<t.length-1;r++){const a=t[r].distanceTo(t[r+1]);if(e<=o+a||r===t.length-2){const l=Qt((e-o)/a,0,1);i.subVectors(t[r+1],t[r]).divideScalar(a),n.copy(t[r]).addScaledVector(i,a*l);return}o+=a}}get contrailMeshes(){return this.aircraft.filter(t=>t.contrail).map(t=>t.contrail.mesh)}update(t,e,n){const{tmpM:i,tmpQ:o,tmpP:r,tmpS:a,tmpE:l,movers:h}=this;a.set(1,1,1);for(const f of this.boats){const v=f.routeLen;f.s+=f.speed*t*f.dir,f.s>v-5&&(f.s=v-5,f.dir=-1),f.s<5&&(f.s=5,f.dir=1),Py(f.route,f.s,this.tmp);const m=Math.atan2(this.tmp.dx*f.dir,this.tmp.dz*f.dir);r.set(this.tmp.x,-f.draft*.15+.12*Math.sin(e*1.3+f.phase)*(f.len<20?1:.2),this.tmp.z),l.set(.02*Math.sin(e*1.7+f.phase),m-Math.PI/2,.03*Math.sin(e*1.1+f.phase)+(f.speed>8?-.03:0),"XYZ"),h.setMatrixAt(f.id,i.compose(r,o.setFromEuler(l),a)),f.wake.update(this.tmp.x-this.tmp.dx*f.dir*f.len*.4,this.tmp.z-this.tmp.dz*f.dir*f.len*.4,e,!0,f.speed)}const{pos:c,dir:d,side:u,up:p}=this;for(const f of this.carChunks)f.n=0,f.box.makeEmpty();for(let f=0;f<this.cars.length;f++){const v=this.cars[f],m=this.carRoutes[v.route];v.s+=v.speed*t*v.dir,v.s>m.length&&(v.s=0),v.s<0&&(v.s=m.length),this.point3(m.pts,v.s,c,d),v.dir<0&&d.negate(),u.crossVectors(d,p).normalize();const g=(m.lanes>=4?1.5+v.lane*3.2:1.8)+0;c.addScaledVector(u,g);const w=Math.atan2(d.x,d.z)-Math.PI/2,y=-Math.asin(Qt(d.y,-1,1));this.tmpQ.setFromEuler(this.tmpE.set(0,w,y,"YXZ")),this.tmpP.copy(c),this.tmpM.compose(this.tmpP,this.tmpQ,this.tmpS);let x=this.carCells.get(Vc(c.x,c.z,vu));(!x||x.n>=x.capacity)&&(x=this.carOverflow);const b=x.n++;x.mesh.setMatrixAt(b,this.tmpM),x.mesh.setColorAt(b,v.color),x.box.expandByPoint(c)}for(const f of this.carChunks){const v=f.mesh;if(v.count=f.n,!f.n){v.visible=!1;continue}v.visible=!0,v.instanceMatrix.clearUpdateRanges(),v.instanceMatrix.addUpdateRange(0,f.n*16),v.instanceMatrix.needsUpdate=!0,v.instanceColor.clearUpdateRanges(),v.instanceColor.addUpdateRange(0,f.n*3),v.instanceColor.needsUpdate=!0,f.box.min.addScalar(-xu),f.box.max.addScalar(xu),v.boundingSphere&&(f.box.getBoundingSphere(v.boundingSphere),f.center.copy(v.boundingSphere.center),f.r=v.boundingSphere.radius)}this.carMat.emissiveIntensity=6*n;for(const f of this.aircraft){const v=(e/f.period+f.offset)%1,m=f.path(v,this.pos),g=f.path(Math.min(1,v+.002),this.ahead).sub(m).normalize(),w=Math.atan2(g.x,g.z)-Math.PI/2,y=Math.asin(Qt(g.y,-1,1));l.set(0,w,y*.6,"YXZ"),h.setMatrixAt(f.id,i.compose(m,o.setFromEuler(l),a)),f.contrail&&(f.contrail.update(m.x,m.z,e,!0,250),f.contrail.mesh.position.y=m.y-2,f.contrail.mesh.updateMatrix())}}updateCulling(t){for(const e of this.carChunks){if(!e.n||e===this.carOverflow)continue;const n=t.boxInView(e.box),i=t.casterCascades(e.center,e.r,2.5),o=Vs("mid",n,i),r=Ir(o);e.mesh.visible=n||r,e.mesh.castShadow=r,e.mesh.layers.mask=o}}}function fo(s,t=!1){const e=s[0].index!==null,n=new Set(Object.keys(s[0].attributes)),i=new Set(Object.keys(s[0].morphAttributes)),o={},r={},a=s[0].morphTargetsRelative,l=new oe;let h=0;for(let c=0;c<s.length;++c){const d=s[c];let u=0;if(e!==(d.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const p in d.attributes){if(!n.has(p))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+'. All geometries must have compatible attributes; make sure "'+p+'" attribute exists among all geometries, or in none of them.'),null;o[p]===void 0&&(o[p]=[]),o[p].push(d.attributes[p]),u++}if(u!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+". Make sure all geometries have the same number of attributes."),null;if(a!==d.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const p in d.morphAttributes){if(!i.has(p))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+".  .morphAttributes must be consistent throughout all geometries."),null;r[p]===void 0&&(r[p]=[]),r[p].push(d.morphAttributes[p])}if(t){let p;if(e)p=d.index.count;else if(d.attributes.position!==void 0)p=d.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+". The geometry must have either an index or a position attribute"),null;l.addGroup(h,p,c),h+=p}}if(e){let c=0;const d=[];for(let u=0;u<s.length;++u){const p=s[u].index;for(let f=0;f<p.count;++f)d.push(p.getX(f)+c);c+=s[u].attributes.position.count}l.setIndex(d)}for(const c in o){const d=wu(o[c]);if(!d)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+c+" attribute."),null;l.setAttribute(c,d)}for(const c in r){const d=r[c][0].length;if(d===0)break;l.morphAttributes=l.morphAttributes||{},l.morphAttributes[c]=[];for(let u=0;u<d;++u){const p=[];for(let v=0;v<r[c].length;++v)p.push(r[c][v][u]);const f=wu(p);if(!f)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+c+" morphAttribute."),null;l.morphAttributes[c].push(f)}}return l}function wu(s){let t,e,n,i=-1,o=0;for(let h=0;h<s.length;++h){const c=s[h];if(t===void 0&&(t=c.array.constructor),t!==c.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(e===void 0&&(e=c.itemSize),e!==c.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=c.normalized),n!==c.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(i===-1&&(i=c.gpuType),i!==c.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;o+=c.count*e}const r=new t(o),a=new _e(r,e,n);let l=0;for(let h=0;h<s.length;++h){const c=s[h];if(c.isInterleavedBufferAttribute){const d=l/e;for(let u=0,p=c.count;u<p;u++)for(let f=0;f<e;f++){const v=c.getComponent(u,f);a.setComponent(u+d,f,v)}}else r.set(c.array,l);l+=c.count*e}return i!==void 0&&(a.gpuType=i),a}function zy(s,t=1e-4){t=Math.max(t,Number.EPSILON);const e={},n=s.getIndex(),i=s.getAttribute("position"),o=n?n.count:i.count;let r=0;const a=Object.keys(s.attributes),l={},h={},c=[],d=["getX","getY","getZ","getW"],u=["setX","setY","setZ","setW"];for(let w=0,y=a.length;w<y;w++){const x=a[w],b=s.attributes[x];l[x]=new b.constructor(new b.array.constructor(b.count*b.itemSize),b.itemSize,b.normalized);const M=s.morphAttributes[x];M&&(h[x]||(h[x]=[]),M.forEach((S,T)=>{const _=new S.array.constructor(S.count*S.itemSize);h[x][T]=new S.constructor(_,S.itemSize,S.normalized)}))}const p=t*.5,f=Math.log10(1/t),v=Math.pow(10,f),m=p*v;for(let w=0;w<o;w++){const y=n?n.getX(w):w;let x="";for(let b=0,M=a.length;b<M;b++){const S=a[b],T=s.getAttribute(S),_=T.itemSize;for(let E=0;E<_;E++)x+=`${~~(T[d[E]](y)*v+m)},`}if(x in e)c.push(e[x]);else{for(let b=0,M=a.length;b<M;b++){const S=a[b],T=s.getAttribute(S),_=s.morphAttributes[S],E=T.itemSize,A=l[S],U=h[S];for(let F=0;F<E;F++){const I=d[F],B=u[F];if(A[B](r,T[I](y)),_)for(let k=0,P=_.length;k<P;k++)U[k][B](r,_[k][I](y))}}e[x]=r,c.push(r),r++}}const g=s.clone();for(const w in s.attributes){const y=l[w];if(g.setAttribute(w,new y.constructor(y.array.slice(0,r*y.itemSize),y.itemSize,y.normalized)),w in h)for(let x=0;x<h[w].length;x++){const b=h[w][x];g.morphAttributes[w][x]=new b.constructor(b.array.slice(0,r*b.itemSize),b.itemSize,b.normalized)}}return g.setIndex(c),g}const Wc=Math.PI*2;function Hs(s,t,e=[0,0]){const n=s.n??2.2,i=s.nBot??n,o=t*Wc-Math.PI/2,r=Math.cos(o),a=Math.sin(o),l=a<=0,h=l?n:i;return e[1]=Math.sign(r)*Math.pow(Math.abs(r),2/h)*s.w,e[0]=s.yc-Math.sign(a)*Math.pow(Math.abs(a),2/h)*(l?s.top:s.bot),e}function vo(s,t){const e=s.n??2.2,n=s.nBot??e,i=t-s.yc;return i>=0?i>=s.top?null:(Math.PI/2-Math.asin(Math.pow(i/s.top,e/2)))/Wc:-i>=s.bot?null:(Math.PI/2+Math.asin(Math.pow(-i/s.bot,n/2)))/Wc}function Ra(s,t){const e=vo(s,t);return e===null?0:Math.abs(Hs(s,e)[1])}function Ny(s,t=64){let e=0;const n=Hs(s,0),i=[0,0];for(let o=1;o<=t;o++)Hs(s,o/t,i),e+=Math.hypot(i[0]-n[0],i[1]-n[1]),n[0]=i[0],n[1]=i[1];return e}function Uy(s,t,e,n){const i=(a,l)=>a+(l-a)*e,o=s.n??2.2,r=t.n??2.2;return{x:n,yc:i(s.yc,t.yc),w:i(s.w,t.w),top:i(s.top,t.top),bot:i(s.bot,t.bot),n:i(o,r),nBot:i(s.nBot??o,t.nBot??r)}}function Jn(s,t){const e=s.length;for(let r=0;r<e-1;r++){const a=s[r],l=s[r+1],h=Math.min(a.x,l.x),c=Math.max(a.x,l.x);if(t>=h-1e-9&&t<=c+1e-9)return Uy(a,l,c===h?0:(t-a.x)/(l.x-a.x),t)}const n=s[0],i=s[e-1];return{...Math.abs(t-n.x)<Math.abs(t-i.x)?n:i,x:t}}function Fy(s,t){const e=s.slice(),n=s[0].x>s[s.length-1].x;for(const i of t)e.some(o=>Math.abs(o.x-i)<1e-6)||e.push(Jn(s,i));return e.sort((i,o)=>n?o.x-i.x:i.x-o.x),e}function fa(s,t){return s.map(e=>({...e,w:Math.max(e.w-t,.01),top:Math.max(e.top-t,.01),bot:Math.max(e.bot-t,.01)}))}function Xc(s,t,e,n,i){const r=[0],a=Hs(s,t),l=[0,0];for(let d=1;d<=24;d++)Hs(s,t+(e-t)*(d/24),l),r.push(r[d-1]+Math.hypot(l[0]-a[0],l[1]-a[1])),a[0]=l[0],a[1]=l[1];const h=r[24]||1e-9;let c=1;for(let d=1;d<n;d++){const u=h*(d/n);for(;c<24&&r[c]<u;)c++;const p=(u-r[c-1])/Math.max(r[c]-r[c-1],1e-9);i.push(t+(e-t)*((c-1+p)/24))}i.push(e)}function ky(s,t){return e=>{const n=[];let i=0;const o=[0];for(const r of s){const a=typeof r.y=="function"?r.y(e):r.y;let l=e.yc+e.top*.97>a&&e.yc-e.bot*.97<a?vo(e,a):r.fallbackT;l=Math.max(l,i+5e-4),Xc(e,i,l,r.segs,o),i=l}Xc(e,i,.5,t,o);for(const r of o)n.push(r);for(let r=o.length-2;r>=0;r--)n.push(1-o[r]);return n}}function gh(s,t,e,n,i,o){const r=t*(n+1)+e,a=r+n+1;i!==o?s.push(r,r+1,a,r+1,a+1,a):s.push(r,a,r+1,r+1,a,a+1)}function pa(s,t){const e=s.length,n=s.map((v,m)=>t(v,m)),i=n[0].length-1;let o=0;const r=[0];for(let v=1;v<e;v++)o+=Math.abs(s[v].x-s[v-1].x),r.push(o);const a=r.map(v=>v/Math.max(o,1e-6)),l=new Float32Array(e*(i+1)*3),h=new Float32Array(e*(i+1)*2),c=[0,0];for(let v=0;v<e;v++)for(let m=0;m<=i;m++){Hs(s[v],n[v][m],c);const g=v*(i+1)+m;l[g*3]=s[v].x,l[g*3+1]=c[0],l[g*3+2]=c[1],h[g*2]=a[v],h[g*2+1]=n[v][m]}const d=s[e-1].x>=s[0].x,u=new oe;u.setAttribute("position",new _e(l,3));const p=[];for(let v=0;v<e-1;v++)for(let m=0;m<i;m++)gh(p,v,m,i,d,!1);u.setIndex(p),u.computeVertexNormals();const f=u.getAttribute("normal").array;for(let v=0;v<e;v++){const m=v*(i+1),g=m+i;let w=f[m*3]+f[g*3],y=f[m*3+1]+f[g*3+1],x=f[m*3+2]+f[g*3+2];const b=Math.hypot(w,y,x)||1;w/=b,y/=b,x/=b,f[m*3]=w,f[m*3+1]=y,f[m*3+2]=x,f[g*3]=w,f[g*3+1]=y,f[g*3+2]=x}return{sections:s,R:i,t:n,u:a,pos:l,uv:h,normal:f,forwardX:d}}function ma(s,t={}){const e=s.sections.length,n=s.R,i=t.i0??0,o=t.i1??e-1,r=!!t.flip,a=Array.from(s.pos),l=Array.from(s.uv),h=Array.from(s.normal);if(r)for(let p=0;p<h.length;p++)h[p]=-h[p];const c=[];for(let p=i;p<o;p++)for(let f=0;f<n;f++)(!t.quad||t.quad(p,f))&&gh(c,p,f,n,s.forwardX,r);const d=(p,f)=>{const v=s.sections[p],m=s.sections[f?Math.min(p+1,e-1):Math.max(p-1,0)];let g=Math.sign(v.x-m.x)||(f?-1:1);r&&(g=-g);const w=a.length/3;a.push(v.x,v.yc,0),h.push(g,0,0),l.push(s.u[p],.5);for(let y=0;y<=n;y++){const x=p*(n+1)+y;a.push(s.pos[x*3],s.pos[x*3+1],s.pos[x*3+2]),h.push(g,0,0),l.push(s.uv[x*2],s.uv[x*2+1])}for(let y=0;y<n;y++)g>0?c.push(w,w+1+y,w+2+y):c.push(w,w+2+y,w+1+y)};t.capStart&&d(i,!0),t.capEnd&&d(o,!1);const u=new oe;return u.setAttribute("position",new Mt(a,3)),u.setAttribute("normal",new Mt(h,3)),u.setAttribute("uv",new Mt(l,2)),u.setIndex(c),u}function yu(s,t,e,n){return e<s.i0||e>=s.i1?!1:n>=s.j0&&n<s.j1||n+t>=s.j0&&n+t<s.j1}function _u(s,t,e){const n=s.R,{i0:i,i1:o,j0:r,j1:a}=e,l=b=>b>n?b-n:b,h=[];for(let b=r;b<a;b++)h.push([i,l(b)]);for(let b=i;b<o;b++)h.push([b,l(a)]);for(let b=a;b>r;b--)h.push([o,l(b)]);for(let b=o;b>i;b--)h.push([b,l(r)]);const c=(b,M,S)=>{const T=(M*(n+1)+S)*3;return new C(b.pos[T],b.pos[T+1],b.pos[T+2])},d=new C;for(const[b,M]of h)d.add(c(s,b,M));d.multiplyScalar(1/h.length);const u=[],p=[],f=[],v=(b,M,S,T)=>{for(const _ of[b,M,S])u.push(_.x,_.y,_.z),p.push(T.x,T.y,T.z),f.push(0,0)},m=new C,g=new C,w=new C,y=new C;for(let b=0;b<h.length;b++){const[M,S]=h[b],[T,_]=h[(b+1)%h.length],E=c(s,M,S),A=c(s,T,_),U=c(t,M,S),F=c(t,T,_);m.subVectors(A,E),g.subVectors(U,E),w.crossVectors(m,g).normalize(),y.addVectors(E,A).multiplyScalar(.5).sub(d).negate(),w.dot(y)>=0?(v(E,A,U,w),v(A,F,U,w)):(w.negate(),v(E,U,A,w),v(A,U,F,w))}const x=new oe;return x.setAttribute("position",new Mt(u,3)),x.setAttribute("normal",new Mt(p,3)),x.setAttribute("uv",new Mt(f,2)),x}function Mu(s,t,e,n=!1){const i=s.R,o=y=>y>i?y-i:y,r=t.i1-t.i0,a=t.j1-t.j0,l=(y,x)=>{const b=(y*(i+1)+o(x))*3;return[s.pos[b],s.pos[b+1],s.pos[b+2]]},h=(y,x)=>Math.hypot(y[0]-x[0],y[1]-x[1],y[2]-x[2]),c=(y,x,b)=>{let M=0,S=0;if(b)for(let T=0;T<r;T++){const _=h(l(t.i0+T,t.j0+x),l(t.i0+T+1,t.j0+x));T<y&&(M+=_),S+=_}else for(let T=0;T<a;T++){const _=h(l(t.i0+y,t.j0+T),l(t.i0+y,t.j0+T+1));T<x&&(M+=_),S+=_}return[M,S]};let d=0,u=0;for(let y=0;y<=a;y++)d+=c(0,y,!0)[1]/(a+1);for(let y=0;y<=r;y++)u+=c(y,0,!1)[1]/(r+1);const p=[],f=[],v=[],m=[],g=[];for(let y=0;y<=r;y++)for(let x=0;x<=a;x++){const b=t.i0+y,M=o(t.j0+x),S=b*(i+1)+M;p.push(s.pos[S*3],s.pos[S*3+1],s.pos[S*3+2]);const T=e?-1:1;f.push(s.normal[S*3]*T,s.normal[S*3+1]*T,s.normal[S*3+2]*T);const[_,E]=c(y,x,!0),[A,U]=c(y,x,!1);v.push(_/Math.max(E,1e-6),A/Math.max(U,1e-6)),m.push(d,u,n?1:0,e?1:0)}for(let y=0;y<r;y++)for(let x=0;x<a;x++){const b=y*(a+1)+x,M=b+a+1;s.forwardX!==e?g.push(b,b+1,M,b+1,M+1,M):g.push(b,M,b+1,b+1,M,M+1)}const w=new oe;return w.setAttribute("position",new Mt(p,3)),w.setAttribute("normal",new Mt(f,3)),w.setAttribute("uv",new Mt(v,2)),w.setAttribute("aPane",new Mt(m,4)),w.setIndex(g),w}function Oy(s,t,e,n,i,o,r,a=8){const l=g=>Math.max(Ra(Jn(s,g),t)-i,.02),h=[],c=[],d=[],u=[],p=[];for(let g=0;g<=7;g++){const w=Math.PI*1.5-g/7*Math.PI;p.push({x:e+Math.cos(w)*o,y:t-o+Math.sin(w)*o,nx:Math.cos(w),ny:Math.sin(w),v:g/7*.3})}for(let g=1;g<=a;g++)p.push({x:e+(n-e)*(g/a),y:t,nx:0,ny:1,v:.3+.7*(g/a)});const v=10;for(const g of p){const w=l(Math.max(g.x,e));for(let y=0;y<=v;y++){const x=-w+2*w*(y/v);h.push(g.x,g.y,x),c.push(g.nx,g.ny,0),d.push(r.u0+(r.u1-r.u0)*(y/v),r.v1+(r.v0-r.v1)*g.v)}}for(let g=0;g<p.length-1;g++)for(let w=0;w<v;w++){const y=g*(v+1)+w,x=y+v+1;u.push(y,y+1,x,y+1,x+1,x)}const m=new oe;return m.setAttribute("position",new Mt(h,3)),m.setAttribute("normal",new Mt(c,3)),m.setAttribute("uv",new Mt(d,2)),m.setIndex(u),m}function By(s,t,e,n,i){const o=t.clone().sub(s).normalize(),r=i.clone().addScaledVector(o,-i.dot(o)).normalize(),a=new C().crossVectors(o,r).normalize(),l=new kt(e,s.distanceTo(t),n),h=new jt().makeBasis(a,o,r).setPosition(s.clone().add(t).multiplyScalar(.5));return l.applyMatrix4(h),l}function Xl(s,t,e){const n=new _i(s,t),i=n.getAttribute("uv");for(let o=0;o<i.count;o++)i.setXY(o,e.u0+(e.u1-e.u0)*i.getX(o),e.v0+(e.v1-e.v0)*i.getY(o));return n}function Hy(s,t,e,n,i,o=8){const r=Math.min(e,n),a=Math.max(e,n),l=[],h=[],c=[],d=p=>Math.max(Ra(Jn(s,p),t)-i,.02);for(let p=0;p<o;p++){const f=r+(a-r)*(p/o),v=r+(a-r)*((p+1)/o),m=d(f),g=d(v),w=[[f,-m],[v,g],[v,-g],[f,-m],[f,m],[v,g]];for(const[y,x]of w)l.push(y,t,x),h.push(0,1,0),c.push((y-r)/(a-r),x*.5+.5)}const u=new oe;return u.setAttribute("position",new Mt(l,3)),u.setAttribute("normal",new Mt(h,3)),u.setAttribute("uv",new Mt(c,2)),u}function Gy(s,t,e,n=16,i=6){const o=s.length,r=n/2,a=n+i,l=[];for(let w=0;w<=r;w++)l.push(w/r);for(let w=1;w<=i;w++)l.push(1-2*(w/i));for(let w=1;w<=r;w++)l.push(-1+w/r);const h=w=>w<=r||w>=r+i,c=[],d=[],u=[];let p=0;for(let w=1;w<o;w++)p+=Math.abs(s[w].x-s[w-1].x);let f=0;for(let w=0;w<o;w++){const y=s[w];w>0&&(f+=Math.abs(y.x-s[w-1].x));for(let x=0;x<=a;x++){const b=l[x]*y.w;c.push(y.x,h(x)?t(y.x,b):e(y.x,b),b),d.push(f/Math.max(p,1e-6),x/a)}}for(let w=0;w<o-1;w++)for(let y=0;y<a;y++)gh(u,w,y,a,!1,!1);const v=(w,y)=>{const x=c.length/3;let b=0;for(let M=0;M<a;M++)b+=c[(w*(a+1)+M)*3+1];c.push(s[w].x,b/a,0),d.push(w===0?0:1,.5);for(let M=0;M<=a;M++){const S=w*(a+1)+M;c.push(c[S*3],c[S*3+1],c[S*3+2]),d.push(d[S*2],d[S*2+1])}for(let M=0;M<a;M++)y>0?u.push(x,x+1+M,x+2+M):u.push(x,x+2+M,x+1+M)};v(0,1),v(o-1,-1);const m=new oe;m.setAttribute("position",new Mt(c,3)),m.setAttribute("uv",new Mt(d,2)),m.setIndex(u),m.computeVertexNormals();const g=m.getAttribute("normal");for(let w=0;w<o;w++){const y=w*(a+1),x=y+a,b=new C(g.getX(y)+g.getX(x),g.getY(y)+g.getY(x),g.getZ(y)+g.getZ(x)).normalize();g.setXYZ(y,b.x,b.y,b.z),g.setXYZ(x,b.x,b.y,b.z)}return m}const Fd=.0035;function Pa(s,t,e=Fd){return 5*t*(.2969*Math.sqrt(s)-.126*s-.3516*s*s+.2843*s**3-.1036*s**4)+e*s}function La(s,t){return t*Math.sin(Math.PI*s)}function Bs(s,t){return s.rootChord+(s.tipChord-s.rootChord)*(t/s.span)}function Po(s,t){return .3*Bs(s,t)+s.sweep*(t/s.span)}function ql(s,t){return Po(s,t)-Bs(s,t)}function bu(s,t,e){const n=Bs(s,e),i=mn.clamp((Po(s,e)-t)/n,0,1);return Math.tan(s.dihedral)*e+(La(i,s.camber)-Pa(i,s.thickness,s.te))*n}function Vy(s,t,e){const n=Bs(s,e),i=mn.clamp((Po(s,e)-t)/n,0,1);return Math.tan(s.dihedral)*e+(La(i,s.camber)+Pa(i,s.thickness,s.te))*n}function Su(s,t,e,n,i,o=Fd){const r=u=>({x:u,y:La(u,n)+Pa(u,e,o),u:.5-.5*u}),a=u=>({x:u,y:La(u,n)-Pa(u,e,o),u:.5+.5*u}),l=[];if(s==="rear"){l.push(r(1));for(let u=1;u<i;u++)l.push(r(t+(1-t)*(1-u/i)));l.push(r(t),{...r(t),flat:!0}),l.push({...a(t),flat:!0},a(t));for(let u=1;u<i;u++)l.push(a(t+(1-t)*(u/i)));return l.push(a(1),{...r(1),u:1}),l}const h=u=>Math.pow(1-u/i,2),c=s==="front"?t:1;l.push(r(c)),s==="front"&&l.push(r(c));const d=[];for(let u=1;u<=i;u++)d.push(Math.min(h(u),c));for(const u of d)l.push(r(u));for(let u=d.length-2;u>=0;u--)l.push(a(d[u]));return l.push(a(c)),s==="front"&&l.push({...a(c),flat:!0}),l.push({...r(c),u:s==="front"?.5-.5*c:1,flat:s==="front"}),l}const Yl=.22;function Rn(s,t){const e=s.camber??.02,n=t.n??12,i=[],o=[],r=[],a=[],l=[];for(let v=0;v<=t.segments;v++)l.push({z:t.z0+(t.z1-t.z0)*(v/t.segments),scale:1});if(t.tipRound&&t.tipRound>0)for(let m=1;m<=6;m++){const g=m/6*Math.PI/2;l.push({z:t.z1+t.tipRound*Math.sin(g),scale:Math.max(Math.cos(g),.02)})}const h=v=>{const m=Bs(s,v),g=Po(s,v);return t.hingeX!==void 0?(g-t.hingeX)/m:.75};let c=0;const d=(v,m,g,w,y)=>{const x=Bs(s,g),b=Po(s,g),M=s.twist*(g/s.span),S=.5+(v.x-.5)*w,T=v.y*w,_=(S-.3)*x,E=T*x,A=Math.cos(M),U=Math.sin(M),F=_*A+E*U,I=-_*U+E*A;y.push(-F+(b-.3*x),Math.tan(s.dihedral)*m+I,m)},u=t.vOf??(v=>Math.min(1,v/s.span));for(const v of l){const m=Math.min(v.z,t.z1),g=Bs(s,m),w=h(m),y=Su(t.part,t.part==="rear"?w+(t.gap??.015)/g:w,s.thickness,e,n,s.te);c=y.length;for(const x of y){d(x,v.z,m,v.scale,i);const b=u(Math.min(v.z,t.z1));x.flat?(o.push(.02,b),a.push(Yl,Yl,Yl)):(o.push(x.u,b),a.push(1,1,1))}}for(let v=0;v<l.length-1;v++)for(let m=0;m<c-1;m++){const g=v*c+m,w=g+c;r.push(g,w,g+1,g+1,w,w+1)}const p=(v,m,g)=>{const w=h(v),y=Su(m,w,s.thickness,e,n,s.te),x=i.length/3,b=[];for(const _ of y)d(_,v,v,1,b);let M=0,S=0;const T=y.length-1;for(let _=0;_<T;_++)M+=b[_*3],S+=b[_*3+1];i.push(M/T,S/T,v),o.push(.5,u(v)),a.push(1,1,1);for(let _=0;_<T;_++)i.push(b[_*3],b[_*3+1],b[_*3+2]),o.push(y[_].u,u(v)),a.push(1,1,1);for(let _=0;_<T;_++){const E=x+1+_,A=x+1+(_+1)%T;g?r.push(x,A,E):r.push(x,E,A)}};t.capStart&&p(t.z0,t.capStart,!1),t.capEnd&&p(t.z1,t.capEnd,!0);const f=new oe;return f.setAttribute("position",new Mt(i,3)),f.setAttribute("uv",new Mt(o,2)),f.setAttribute("color",new Mt(a,3)),f.setIndex(r),f.computeVertexNormals(),f}function $l(s,t=1e-4){s.deleteAttribute("normal");const e=zy(s,t);return e.computeVertexNormals(),e}function Wy(s,t,e){const o=[],r=[],a=[],l=t*1.35,h=v=>{const m=mn.smoothstep(v,0,.42);let g=t*.75+(l-t*.75)*m;return v>.42&&(g=l+(e-l)*((v-.42)/.58)),v>.82&&(g*=Math.sqrt(Math.max(1-Math.pow((v-.82)/.18,2),0))),Math.max(g,.012)};for(let v=0;v<=16;v++){const m=v/16,g=m<.7?m:.7+.3*(1-Math.pow(1-(m-.7)/.3,1.6)),w=g*s,y=h(g),x=.075+.55*Math.pow(1-g,3.2),b=y*x,M=.95-.7*g,S=Math.cos(M),T=Math.sin(M);for(let _=0;_<12;_++){const E=_/12*Math.PI*2,A=-.5*Math.cos(E),U=Math.sin(E)>=0,F=.07*y*(1-4*A*A)*(1-Math.min(x,.5)*1.6),I=.5*b*Math.sqrt(Math.max(0,1-4*A*A))*Math.abs(Math.sin(E)),B=(A+.15)*y,k=F+(U?I:-I);o.push(B*S-k*T,w,B*T+k*S),a.push(_/12,g)}}for(let v=0;v<16;v++)for(let m=0;m<12;m++){const g=(m+1)%12,w=v*12+m,y=w+12,x=v*12+g,b=x+12;r.push(w,y,x,x,y,b)}const c=16*12,d=o.length/3;let u=0,p=0;for(let v=0;v<12;v++)u+=o[(c+v)*3],p+=o[(c+v)*3+2];o.push(u/12,s,p/12),a.push(.5,1);for(let v=0;v<12;v++)r.push(d,c+v,c+(v+1)%12);const f=new oe;return f.setAttribute("position",new Mt(o,3)),f.setAttribute("uv",new Mt(a,2)),f.setIndex(r),f.computeVertexNormals(),f}function Xy(s,t,e=24){const n=[];for(let r=0;r<=14;r++){const a=r/14;n.push(new Rt(s*Math.pow(Math.max(1-Math.pow(a,1.7),0),.72),a*t))}const o=new Ba(n,e);return o.rotateZ(-Math.PI/2),o}function qy(s,t=8,e=5){const i=[],o=[],r=[],a=[],l=[],h=w=>{a.length=0;const y=w.n??3,x=w.vee??1.15,b=[],M={x:w.x,yc:w.yc,w:w.w,top:w.top,bot:w.bot,n:y},S=[];Xc(M,0,.25,t,S);const T=[0,0];b.push({y:w.yc+w.top,z:0,v:0});for(let _=0;_<S.length;_++)Hs(M,S[_],T),b.push({y:T[0],z:T[1],v:.22*((_+1)/t)});b.push({y:w.yc,z:w.w,v:.22});for(let _=1;_<=e;_++){const E=_/e,A=w.w*(1-E);b.push({y:w.yc-w.bot*(1-Math.pow(1-E,x)),z:A,v:.22+.28*E})}for(const _ of b)a.push(_);for(let _=b.length-1;_>=0;_--)a.push({y:b[_].y,z:-b[_].z,v:1-b[_].v});return a};let c=0;for(let w=1;w<s.length;w++)c+=Math.abs(s[w].x-s[w-1].x);let d=0;const u=(w,y)=>{const x=h(w),b=[];for(const M of x)b.push(i.length/3),i.push(w.x,M.y,M.z),o.push(y,M.v);l.push({pos:b,x:w.x})},p=[];for(let w=0;w<s.length;w++){const y=s[w];w>0&&(d+=Math.abs(y.x-s[w-1].x)),u(y,d/Math.max(c,1e-6)),y.split&&(p.push(l.length-1),u(y,d/Math.max(c,1e-6)))}const f=l[0].pos.length;for(let w=0;w<l.length-1;w++){if(p.includes(w))continue;const y=l[w].pos,x=l[w+1].pos;for(let b=0;b<f-1;b++)r.push(y[b],x[b],y[b+1],y[b+1],x[b],x[b+1])}const v=(w,y,x)=>{const b=i.length/3;let M=0;for(let S=0;S<f-1;S++)M+=i[w[S]*3+1];i.push(y,M/(f-1),0),o.push(x>0?0:1,.5);for(let S=0;S<f-1;S++)x>0?r.push(b,w[S],w[S+1]):r.push(b,w[S+1],w[S])};v(l[0].pos,l[0].x,1),v(l[l.length-1].pos,l[l.length-1].x,-1);const m=new oe;m.setAttribute("position",new Mt(i,3)),m.setAttribute("uv",new Mt(o,2)),m.setIndex(r),m.computeVertexNormals();const g=m.getAttribute("normal");for(const w of l){const y=w.pos[0],x=w.pos[f-1],b=new C(g.getX(y)+g.getX(x),g.getY(y)+g.getY(x),g.getZ(y)+g.getZ(x)).normalize();g.setXYZ(y,b.x,b.y,b.z),g.setXYZ(x,b.x,b.y,b.z)}return m}function kd(s,t){const e=new Xe().setFromUnitVectors(new C(0,1,0),t.clone().sub(s).normalize());return new jt().compose(s.clone().add(t).multiplyScalar(.5),e,new C(1,1,1))}function ri(s,t,e,n=8){const i=new be(e,e,s.distanceTo(t),n);return i.applyMatrix4(kd(s,t)),i}function rr(s,t,e,n){const i=new be(.5,.5,s.distanceTo(t),10);return i.scale(e,1,n),i.applyMatrix4(kd(s,t)),i}function Yy(s,t,e){const n=s instanceof C?s:new C(...s??[0,0,0]),i=t instanceof He?t:new He(...t??[0,0,0]),o=typeof e=="number"?new C(e,e,e):e instanceof C?e:new C(...e??[1,1,1]);return new jt().compose(n,new Xe().setFromEuler(i),o)}function $y(s){const t=s.clone();if(t.index)return t;const e=t.getAttribute("position").count,n=new Uint32Array(e);for(let i=0;i<e;i++)n[i]=i;return t.setIndex(new _e(n,1)),t}function jy(s,t){const e=$y(s);if(!t)return e;if(e.applyMatrix4(t),t.determinant()<0){const n=e.index;for(let i=0;i<n.count;i+=3){const o=n.getX(i+1),r=n.getX(i+2);n.setX(i+1,r),n.setX(i+2,o)}}return e}function Zy(s,t){const e=s.getAttribute("position"),n=e.count,i=new Float32Array(n*3),o=new Float32Array(n*2),r=new Vt;let a=null;for(let l=0;l<n;l++){const h=typeof t=="function"?t(e.getX(l),e.getY(l),e.getZ(l)):t;h!==a&&(r.set(h.color),a=h),i[l*3]=r.r,i[l*3+1]=r.g,i[l*3+2]=r.b,o[l*2]=h.roughness,o[l*2+1]=h.metalness}return s.setAttribute("color",new _e(i,3)),s.setAttribute("aSurf",new _e(o,2)),s}function Ky(){const s=new ce({color:16777215,roughness:1,metalness:1,vertexColors:!0});return s.onBeforeCompile=t=>{t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aSurf;
varying vec2 vSurf;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vSurf = aSurf;`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vSurf;`).replace("#include <roughnessmap_fragment>","float roughnessFactor = roughness * vSurf.x;").replace("#include <metalnessmap_fragment>","float metalnessFactor = metalness * vSurf.y;")},s.customProgramCacheKey=()=>"plane-parts-v1",s}class Sn{constructor(t){this.defaultSurf=t}parts=[];add(t,e,n=this.defaultSurf){const i=jy(t,e);return n&&Zy(i,n),this.parts.push(i),this}get size(){return this.parts.length}build(){if(this.parts.length===1)return this.parts[0];const t=fo(this.parts,!1);if(!t)throw new Error("Batch: parts have incompatible attributes");return t}}function xn(s,t){const e=document.createElement("canvas");return e.width=s,e.height=t,[e,e.getContext("2d")]}function zn(s,t,e=8){const n=new Rr(s);return n.flipY=!1,n.colorSpace=t?Dn:vi,n.wrapS=So,n.wrapT=So,n.anisotropy=e,n}function vh(s,t=2){const e=s.width,n=s.height,i=s.getContext("2d").getImageData(0,0,e,n).data,[o,r]=xn(e,n),a=r.createImageData(e,n),l=(h,c)=>i[((c+n)%n*e+(h+e)%e)*4]/255;for(let h=0;h<n;h++)for(let c=0;c<e;c++){const d=(l(c+1,h)-l(c-1,h))*t,u=(l(c,h+1)-l(c,h-1))*t,p=Math.hypot(d,u,1),f=(h*e+c)*4;a.data[f]=Math.round((-d/p*.5+.5)*255),a.data[f+1]=Math.round((-u/p*.5+.5)*255),a.data[f+2]=Math.round((1/p*.5+.5)*255),a.data[f+3]=255}return r.putImageData(a,0,0),o}function Lo(s,t,e,n,i,o,r="40,35,30"){for(let a=0;a<i;a++){const l=t.range(0,e),h=t.range(0,n),c=t.range(8,60),d=s.createRadialGradient(l,h,0,l,h,c);d.addColorStop(0,`rgba(${r},${o*t.range(.4,1)})`),d.addColorStop(1,`rgba(${r},0)`),s.fillStyle=d,s.fillRect(l-c,h-c,c*2,c*2)}}function Da(s,t,e,n,i,o,r,a={}){const l=a.y0??0,h=a.y1??n,c=a.strength??1,d=(u,p)=>{const f=Math.round(u+p*c);return`rgb(${f},${f},${f})`};s.strokeStyle=d(128,-38),s.lineWidth=2.2,t.strokeStyle=`rgba(30,30,35,${.22*c})`,t.lineWidth=1.5;for(const u of i){const p=u*e;s.beginPath(),s.moveTo(p,l),s.lineTo(p,h),s.stroke(),t.save(),t.strokeStyle=`rgba(40,38,34,${.07*c})`,t.lineWidth=9,t.beginPath(),t.moveTo(p,l),t.lineTo(p,h),t.stroke(),t.restore(),t.beginPath(),t.moveTo(p,l),t.lineTo(p,h),t.stroke();for(const f of[-7,7])for(let v=l+r/2;v<h;v+=r)s.fillStyle=d(128,56),s.beginPath(),s.arc(p+f,v,1.6,0,Math.PI*2),s.fill(),t.fillStyle=`rgba(255,255,255,${.1*c})`,t.beginPath(),t.arc(p+f,v,1.4,0,Math.PI*2),t.fill(),t.fillStyle=`rgba(0,0,0,${.1*c})`,t.beginPath(),t.arc(p+f,v+1.2,1.2,0,Math.PI*2),t.fill()}for(const u of o){const p=u*n;if(!(p<l||p>h)){s.strokeStyle=d(128,-22),s.lineWidth=1.4,s.beginPath(),s.moveTo(0,p),s.lineTo(e,p),s.stroke(),t.strokeStyle=`rgba(30,30,35,${.12*c})`,t.beginPath(),t.moveTo(0,p),t.lineTo(e,p),t.stroke();for(let f=r/2;f<e;f+=r)s.fillStyle=d(128,48),s.beginPath(),s.arc(f,p+5,1.5,0,Math.PI*2),s.fill(),t.fillStyle=`rgba(0,0,0,${.08*c})`,t.beginPath(),t.arc(f,p+6,1.2,0,Math.PI*2),t.fill()}}}const en={upper:"#f3f1ea",under:"#e3d9c2",lower:"#f5cc5a",cheat:"#1c2d5a",pin:"#d8322e",registration:"N726BV"},yo={top:.03,bottom:.1,pin:.125};function Eu(s,t,e,n,i,o,r,a,l,h,c){const d=e/t.length,u=n/t.perimeter(o),p=t.vOf(o,r)??.25,f=a/.72*d;for(const v of[1,-1])s.save(),s.translate(t.uOf(o)*e,(v>0?p:1-p)*n),s.scale(v>0?-1:1,v*(u/d)),s.fillStyle=c,s.font=`${l} ${f.toFixed(1)}px ${h}`,s.textAlign="center",s.textBaseline="middle",s.fillText(i,0,0),s.restore()}function Jy(s){const n=new $e("fuselage-paint"),[i,o]=xn(2048,1024),[r,a]=xn(2048,1024),[l,h]=xn(2048,1024);a.fillStyle="#808080",a.fillRect(0,0,2048,1024),o.fillStyle=en.upper,o.fillRect(0,0,2048,1024);const c=[],d=(T,_)=>s.vOf(T,_)??.5;for(let T=0;T<=2048;T+=8){const _=s.xOf(T/2048),E=s.sillY(_);c.push({px:T,cheatTop:d(_,E-yo.top),cheatBot:d(_,E-yo.bottom),pinBot:d(_,E-yo.pin)})}const u=(T,_,E,A)=>{const U=F=>(A>0?F:1-F)*1024;o.beginPath(),o.moveTo(c[0].px,U(T(c[0])));for(const F of c)o.lineTo(F.px,U(T(F)));for(let F=c.length-1;F>=0;F--)o.lineTo(c[F].px,U(_(c[F])));o.closePath(),o.fillStyle=E,o.fill()};u(T=>T.pinBot,T=>1-T.pinBot,en.lower,1);for(const T of[1,-1])u(_=>_.cheatTop,_=>_.cheatBot,en.cheat,T),u(_=>_.cheatBot,_=>_.pinBot,en.pin,T);const p=[];for(let T=2.32;T<=3.7;T+=.1)p.push([s.uOf(T)*2048,s.topV(T,T>3.4?.45-(T-3.4)*.9:.45)*1024]);o.fillStyle="#2a2d31";for(const T of[1,-1]){const _=T>0?0:1024;o.beginPath(),o.moveTo(p[0][0],_);for(const[E,A]of p)o.lineTo(E,T>0?A:1024-A);o.lineTo(p[p.length-1][0],_),o.closePath(),o.fill()}const f=s.uOf(4.22)*2048;o.fillStyle="#2e3136",o.fillRect(0,0,f,1024),o.fillStyle="#9aa0a6",o.fillRect(f-6,0,6,1024),o.fillStyle="#1b1d20";for(let T=0;T<12;T++)o.fillRect(f*.45,T/12*1024+6,f*.15,1024/12-12);Eu(o,s,2048,1024,en.registration,-3.05,.47,.18,"bold",'"Helvetica Neue", Arial, sans-serif',en.cheat),Eu(o,s,2048,1024,"BAHÍA VISTA AIR TAXI",-.25,.1,.085,"bold italic",'Georgia, "Times New Roman", serif',en.cheat);const v=[3.9,3.2,2.32,1.85,0,-.9,-1.6,-2.6,-3.7,-4.7].map(T=>s.uOf(T));Da(a,o,2048,1024,v,[.12,.2,.3,.42,.5,.58,.7,.8,.88],26),a.strokeStyle="#3a3a3a",a.lineWidth=3,o.strokeStyle="rgba(20,20,25,0.35)",o.lineWidth=2;const m=s.uOf(1.77)*2048,g=s.uOf(.95)*2048;for(const T of[1,-1]){const _=s.vOf(1.3,.4)??.2,E=s.vOf(1.3,-.42)??.4,A=(T>0?_:1-_)*1024,U=(T>0?E:1-E)*1024,F=Math.min(A,U),I=Math.abs(U-A);a.strokeRect(m,F,g-m,I),o.strokeRect(m,F,g-m,I);const B=s.vOf(1,.05)??.25;o.fillStyle="#8a8f94",o.fillRect(g-40,(T>0?B:1-B)*1024-4,22,8)}const w=s.uOf(2.75),y=d(2.75,-.5),x=s.uOf(-.9),b=(T,_,E)=>{const A=T.createLinearGradient(w*2048,0,x*2048,0);A.addColorStop(0,`rgba(${_},${E})`),A.addColorStop(.3,`rgba(${_},${E*.5})`),A.addColorStop(1,`rgba(${_},0)`),T.fillStyle=A,T.beginPath(),T.moveTo(w*2048,(y-.018)*1024),T.lineTo(x*2048,(y-.05)*1024),T.lineTo(x*2048,(y+.05)*1024),T.lineTo(w*2048,(y+.018)*1024),T.closePath(),T.fill()};b(o,"25,22,20",.5);for(let T=0;T<16;T++){const _=s.uOf(n.range(3,4))*2048,E=(.5+n.range(-.06,.06))*1024,A=n.range(40,150),U=o.createLinearGradient(_,0,_+A,0);U.addColorStop(0,`rgba(35,30,22,${n.range(.14,.32)})`),U.addColorStop(1,"rgba(35,30,22,0)"),o.fillStyle=U,o.fillRect(_,E-n.range(1,2),A,n.range(2,4))}Lo(o,n,2048,1024,140,.08);for(let T=0;T<60;T++){const _=n.range(204.8,1843.2),E=n.range(1024*.42,1024*.58);o.strokeStyle=`rgba(40,35,30,${n.range(.05,.2)})`,o.lineWidth=n.range(1,3),o.beginPath(),o.moveTo(_,E),o.lineTo(_+n.range(30,160),E+n.range(-3,3)),o.stroke()}o.fillStyle="rgba(255,255,255,0.05)",o.fillRect(0,0,2048,1024*.12),o.fillRect(0,1024*.88,2048,1024*.12),h.fillStyle="#5a5a5a",h.fillRect(0,0,2048,1024),h.fillStyle="#7a7a7a",h.fillRect(0,0,f,1024),b(h,"170,170,170",.7),Lo(h,n,2048,1024,160,.25,"150,150,150");for(let T=0;T<400;T++){h.strokeStyle=`rgba(120,120,120,${n.range(.2,.5)})`,h.lineWidth=1;const _=n.range(0,2048),E=n.range(0,1024);h.beginPath(),h.moveTo(_,E),h.lineTo(_+n.range(-40,40),E+n.range(-6,6)),h.stroke()}const[M,S]=xn(2048/4,1024/4);S.scale(.25,.25),S.fillStyle="rgb(0,34,0)",S.fillRect(0,0,2048,1024),S.fillStyle="rgb(0,16,0)",S.fillRect(0,0,s.uOf(3.15)*2048,1024),S.fillStyle="rgb(0,120,0)";for(const T of[1,-1]){const _=T>0?0:1024;S.beginPath(),S.moveTo(p[0][0],_);for(const[E,A]of p)S.lineTo(E,T>0?A:1024-A);S.lineTo(p[p.length-1][0],_),S.closePath(),S.fill()}return b(S,"0,110,0",.8),{map:zn(i,!0),roughnessMap:zn(l,!1),normalMap:zn(vh(r,2.4),!1),clearcoatRoughnessMap:zn(M,!1)}}const Ns={WING_V1:.78,TAIL_V0:.8,TAIL_SPAN:2.55},Qy=(s,t)=>Math.min(1,Math.max(0,s/t))*Ns.WING_V1,jl=(s,t)=>.997-(.997-Ns.TAIL_V0)*Math.min(1,Math.max(0,(t-s)/Ns.TAIL_SPAN));function t_(){const e=new $e("wing-paint"),[n,i]=xn(1024,1024),[o,r]=xn(1024,1024),[a,l]=xn(1024,1024),h=Ns.WING_V1,c=Ns.TAIL_V0,d=w=>w*h*1024,u=w=>(1-(1-c)*(1-w/Ns.TAIL_SPAN))*1024;r.fillStyle="#808080",r.fillRect(0,0,1024,1024),i.fillStyle=en.upper,i.fillRect(0,0,1024,1024),i.fillStyle=en.under,i.fillRect(1024*.5,0,1024*.5,d(1)),i.fillStyle=en.lower,i.fillRect(0,d(.905),1024,d(1)-d(.905)),i.fillStyle=en.cheat,i.fillRect(0,d(.885),1024,d(.905)-d(.885)),i.fillStyle=en.pin,i.fillRect(0,d(.876),1024,d(.885)-d(.876)),i.fillStyle=en.lower,i.fillRect(1024*.475,0,1024*.0325,1024);const p=[];for(let w=.04;w<.87;w+=.075)p.push(w*h);Da(r,i,1024,1024,[.14,.33,.5,.67,.86],p,22,{y1:d(1)}),i.fillStyle="#2a2d31",i.fillRect(1024*.3,d(.12),1024*.11,d(.2)-d(.12)),i.fillStyle="#6d7277",i.beginPath(),i.arc(1024*.4,d(.27),9,0,7),i.fill();const f=Ns.TAIL_SPAN-.26,v=f-.05,m=v-.025;i.fillStyle=en.lower,i.fillRect(0,u(f),1024,1024-u(f)),i.fillStyle=en.cheat,i.fillRect(0,u(v),1024,u(f)-u(v)),i.fillStyle=en.pin,i.fillRect(0,u(m),1024,u(v)-u(m));const g=[];for(let w=.12;w<m-.1;w+=.55)g.push(u(w)/1024);Da(r,i,1024,1024,[.3,.7],g,36,{y0:c*1024,strength:.5});for(let w=0;w<90;w++)i.fillStyle=`rgba(90,90,95,${e.range(.3,.7)})`,i.fillRect(1024*.5+e.range(-8,8),e.range(0,1024),e.range(1,3),e.range(1,4));return Lo(i,e,1024,1024,80,.06),l.fillStyle="#5a5a5a",l.fillRect(0,0,1024,1024),l.fillStyle="#909090",l.fillRect(1024*.3,d(.12),1024*.11,d(.2)-d(.12)),Lo(l,e,1024,1024,90,.2,"150,150,150"),{map:zn(n,!0),roughnessMap:zn(a,!1),normalMap:zn(vh(o,2),!1)}}function e_(){const e=new $e("float-paint"),[n,i]=xn(1024,512),[o,r]=xn(1024,512),[a,l]=xn(1024,512);r.fillStyle="#808080",r.fillRect(0,0,1024,512),i.fillStyle="#cfd3d6",i.fillRect(0,0,1024,512);const h=.22,c=(d,u,p,f)=>{d.fillStyle=f,d.fillRect(0,u*512,1024,(p-u)*512),d.fillRect(0,(1-p)*512,1024,(p-u)*512)};c(i,h,.5,"#b9bec2"),c(i,.445,.5,en.lower),c(i,0,.105,"#c3c7ca"),c(i,0,.066,"#2b2e31"),c(i,.105,.118,"#9aa0a5");for(const d of[1,-1]){const u=f=>(d>0?f:1-f)*512,p=i.createLinearGradient(0,u(.165),0,u(.31));p.addColorStop(0,"rgba(60,72,70,0)"),p.addColorStop(.08,"rgba(60,72,70,0.55)"),p.addColorStop(.35,"rgba(70,84,80,0.42)"),p.addColorStop(1,"rgba(70,84,80,0)"),i.fillStyle=p,i.fillRect(0,Math.min(u(.165),u(.31)),1024,Math.abs(u(.31)-u(.165)))}c(i,h-.012,h+.012,en.cheat),Da(r,i,1024,512,[.1,.2,.3,.4,.5,.58,.66,.76,.86,.94],[.118,.5],24,{strength:.8}),r.strokeStyle="#4a4a4a",r.lineWidth=2.5;for(const d of[h,1-h])r.beginPath(),r.moveTo(0,d*512),r.lineTo(1024,d*512),r.stroke();for(let d=0;d<140;d++){const u=e.next()<.5?1:-1,p=g=>(u>0?g:1-g)*512;i.strokeStyle=`rgba(62,80,72,${e.range(.08,.3)})`,i.lineWidth=e.range(1,3);const f=e.range(0,1024),v=p(e.range(.17,.2)),m=e.range(8,40)*u;i.beginPath(),i.moveTo(f,v),i.lineTo(f+e.range(-4,4),v+m),i.stroke()}return Lo(i,e,1024,512,90,.08,"60,60,55"),l.fillStyle="#6a6a6a",l.fillRect(0,0,1024,512),c(l,0,.118,"#8a8a8a"),c(l,0,.066,"#c0c0c0"),c(l,.17,.3,"#9a9a9a"),Lo(l,e,1024,512,100,.25,"160,160,160"),{map:zn(n,!0),roughnessMap:zn(a,!1),normalMap:zn(vh(o,2.2),!1)}}const sn={W:1.3,H:.4,PPM:1500,GRAIN:120,PLACARDS:90},xi={w:Math.round(sn.W*sn.PPM),face:Math.round(sn.H*sn.PPM)},Ds=xi.face+sn.GRAIN+sn.PLACARDS,qc={asi:{x:-.435,y:.112,r:.042},adi:{x:-.335,y:.112,r:.042},alt:{x:-.235,y:.112,r:.042},tc:{x:-.435,y:.012,r:.042},hdg:{x:-.335,y:.012,r:.042},vsi:{x:-.235,y:.012,r:.042},clock:{x:-.565,y:.125,r:.03},suction:{x:-.565,y:.04,r:.026},rpm:{x:.375,y:.118,r:.036},map:{x:.47,y:.118,r:.036},oilp:{x:.34,y:.03,r:.024},oilt:{x:.405,y:.03,r:.024},fuell:{x:.47,y:.03,r:.024},fuelr:{x:.535,y:.03,r:.024},egt:{x:.36,y:-.04,r:.022},amp:{x:.42,y:-.04,r:.022},cht:{x:.48,y:-.04,r:.022}},gi={x:.085,y:.098,w:.2,h:.135};function Tu(s,t){if(s<=t[0][0])return t[0][1];for(let e=1;e<t.length;e++)if(s<=t[e][0]){const[n,i]=t[e-1],[o,r]=t[e];return i+(r-i)*((s-n)/(o-n))}return t[t.length-1][1]}const Zl=s=>Math.min(1,Math.max(0,s)),Ie={asi:s=>Tu(s,[[0,0],[40,30],[60,72],[80,117],[100,162],[120,207],[140,250],[160,287],[180,318],[200,342]]),alt100:s=>(s%1e3+1e3)%1e3*.36,alt1000:s=>(s%1e4+1e4)%1e4*.036,vsi:s=>270+Math.sign(s)*Tu(Math.abs(s),[[0,0],[500,52],[1e3,92],[1500,126],[2e3,158]]),rpm:s=>-135+Zl(s/3e3)*270,map:s=>-135+Zl((s-10)/25)*270,small:s=>-120+Zl(s)*240},Re=s=>(s+sn.W/2)*sn.PPM,Se=s=>(sn.H/2-s)*sn.PPM,Fn=s=>s*sn.PPM,qi=s=>(s-90)*Math.PI/180,ss=(s,t,e,n)=>({u0:s/xi.w,v0:1-n/Ds,u1:e/xi.w,v1:1-t/Ds}),Ia=xi.face,Ke=xi.face+sn.GRAIN,os={face:ss(0,0,xi.w,xi.face),grain:ss(0,Ia+4,xi.w,Ia+sn.GRAIN-4),exit:ss(4,Ke+6,224,Ke+84),belts:ss(234,Ke+6,494,Ke+84),compass:ss(504,Ke+6,664,Ke+84),yoke:ss(674,Ke+6,794,Ke+84),nameplate:ss(804,Ke+6,1164,Ke+84),domeLens:ss(1174,Ke+6,1254,Ke+84)};function Ui(s,t,e,n,i=!0){const o=s.createLinearGradient(t,e-n*1.18,t,e+n*1.18);o.addColorStop(0,"#6c7178"),o.addColorStop(.5,"#3a3e44"),o.addColorStop(1,"#22252a"),s.fillStyle=o,s.beginPath(),s.arc(t,e,n*1.18,0,7),s.fill(),s.fillStyle="#0c0d10",s.beginPath(),s.arc(t,e,n*1.03,0,7),s.fill();const r=s.createRadialGradient(t,e,n*.9,t,e,n*1.03);if(r.addColorStop(0,"rgba(0,0,0,0)"),r.addColorStop(1,"rgba(0,0,0,0.7)"),s.fillStyle=r,s.beginPath(),s.arc(t,e,n*1.03,0,7),s.fill(),s.fillStyle="#07080a",s.beginPath(),s.arc(t,e,n,0,7),s.fill(),i)for(const a of[45,135,225,315])mr(s,t+Math.cos(qi(a))*n*1.11,e+Math.sin(qi(a))*n*1.11,n*.055)}function mr(s,t,e,n){const i=s.createRadialGradient(t-n*.3,e-n*.3,0,t,e,n);i.addColorStop(0,"#c9ccd1"),i.addColorStop(1,"#5a5e64"),s.fillStyle=i,s.beginPath(),s.arc(t,e,n,0,7),s.fill(),s.strokeStyle="#2a2c30",s.lineWidth=Math.max(1,n*.3),s.beginPath(),s.moveTo(t-n*.7,e),s.lineTo(t+n*.7,e),s.moveTo(t,e-n*.7),s.lineTo(t,e+n*.7),s.stroke()}function Wn(s,t,e,n,i,o,r,a,l="#f2f2f2"){const h=qi(i);s.strokeStyle=l,s.lineWidth=a,s.lineCap="butt",s.beginPath(),s.moveTo(t+Math.cos(h)*n*o,e+Math.sin(h)*n*o),s.lineTo(t+Math.cos(h)*n*r,e+Math.sin(h)*n*r),s.stroke()}function qe(s,t,e,n,i,o,r,a,l="#f2f2f2",h="bold"){const c=qi(i);s.fillStyle=l,s.font=`${h} ${Math.round(n*a)}px Arial`,s.textAlign="center",s.textBaseline="middle",s.fillText(r,t+Math.cos(c)*n*o,e+Math.sin(c)*n*o)}function ar(s,t,e,n,i,o,r,a,l){s.strokeStyle=l,s.lineWidth=a,s.beginPath(),s.arc(t,e,n*r,qi(i),qi(o)),s.stroke()}function un(s,t,e,n,i,o="#e4e4e4",r="bold",a="center"){s.fillStyle=o,s.font=`${r} ${i}px Arial`,s.textAlign=a,s.textBaseline="middle",s.fillText(n,t,e)}function rs(s,t,e,n,i,o,r="#f0f0f0",a="#111214",l=0){s.fillStyle=a,s.fillRect(t,e,n,i),s.strokeStyle="rgba(255,255,255,0.35)",s.lineWidth=1.5,s.strokeRect(t+1,e+1,n-2,i-2);const h=l||Math.min(i/(o.length+.6),n/Math.max(...o.map(c=>c.length))*1.8);o.forEach((c,d)=>un(s,t+n/2,e+i*((d+1)/(o.length+1)),c,h,r,"bold"))}function n_(s,t,e,n,i){s.fillStyle="#3a3e44",s.fillRect(t-13,e-22,26,44),s.fillStyle="#0e0f11",s.fillRect(t-10,e-19,20,38);const o=s.createLinearGradient(0,e-18,0,e+18);o.addColorStop(0,n?"#eceff2":"#8d9198"),o.addColorStop(1,n?"#a7abb1":"#d7dadf"),s.fillStyle=o,s.fillRect(t-8,e-(n?17:0),16,17),un(s,t,e+32,i,9,"#e8e8e8")}function i_(){const s=xi.w,t=xi.face,e=new $e("panel-brush"),[n,i]=xn(s,Ds);i.fillStyle="#25282c",i.fillRect(0,0,s,t);for(let f=0;f<9e3;f++)i.fillStyle=`rgba(${e.next()>.5?"255,255,255":"0,0,0"},${e.next()*.05})`,i.fillRect(e.next()*s,e.next()*t,2,2);const o=(f,v,m,g)=>{i.fillStyle="#2c2f34",i.fillRect(Re(f),Se(g),Re(m)-Re(f),Se(v)-Se(g)),i.strokeStyle="rgba(0,0,0,0.6)",i.lineWidth=3,i.strokeRect(Re(f),Se(g),Re(m)-Re(f),Se(v)-Se(g)),i.strokeStyle="rgba(255,255,255,0.12)",i.lineWidth=1.5,i.strokeRect(Re(f)+3,Se(g)+3,Re(m)-Re(f)-6,Se(v)-Se(g)-6);for(const[w,y]of[[f+.012,g-.012],[m-.012,g-.012],[f+.012,v+.012],[m-.012,v+.012]])mr(i,Re(w),Se(y),5)};o(-.6,-.045,-.175,.175),o(-.03,-.045,.2,.175),o(.29,-.075,.62,.175),o(-.63,-.19,.63,-.085);for(let f=-.62;f<=.63;f+=.125)mr(i,Re(f),Se(.188),5),mr(i,Re(f),Se(-.192),5);const r=qc,a=f=>[Re(f.x),Se(f.y),Fn(f.r)];{const[f,v,m]=a(r.asi);Ui(i,f,v,m),ar(i,f,v,m,Ie.asi(48),Ie.asi(95),.9,m*.07,"#f4f4f4"),ar(i,f,v,m,Ie.asi(58),Ie.asi(140),.8,m*.07,"#2fbf58"),ar(i,f,v,m,Ie.asi(140),Ie.asi(180),.8,m*.07,"#f2c230"),Wn(i,f,v,m,Ie.asi(180),.72,.94,m*.06,"#e0322a");for(let g=40;g<=200;g+=10)Wn(i,f,v,m,Ie.asi(g),g%20?.68:.62,.76,g%20?m*.025:m*.04);for(let g=40;g<=200;g+=20)qe(i,f,v,m,Ie.asi(g),.47,String(g),.2);qe(i,f,v,m,180,.22,"KNOTS",.1,"#d0d0d0","normal"),qe(i,f,v,m,0,.28,"AIRSPEED",.1,"#d0d0d0","normal")}{const[f,v,m]=a(r.adi);Ui(i,f,v,m),i.fillStyle="#15171a",i.beginPath(),i.arc(f,v,m,0,7),i.fill()}{const[f,v,m]=a(r.alt);Ui(i,f,v,m);for(let g=0;g<50;g++)Wn(i,f,v,m,g*7.2,g%5?.8:.72,.9,g%5?m*.025:m*.05);for(let g=0;g<10;g++)qe(i,f,v,m,g*36,.58,String(g),.24);qe(i,f,v,m,180,.3,"ALT",.12,"#d0d0d0","normal"),qe(i,f,v,m,180,.42,"FEET",.09,"#d0d0d0","normal"),i.fillStyle="#0a0b0d",i.fillRect(f+m*.36,v-m*.1,m*.34,m*.2),un(i,f+m*.53,v,"29.92",m*.13,"#e8e8e8","normal")}{const[f,v,m]=a(r.tc);Ui(i,f,v,m);for(const g of[-90,-70,70,90])Wn(i,f,v,m,g,.74,.9,m*.05);qe(i,f,v,m,180,.25,"TURN COORDINATOR",.085,"#d0d0d0","normal"),qe(i,f,v,m,-70,.62,"L",.14),qe(i,f,v,m,70,.62,"R",.14),qe(i,f,v,m,180,.85,"2 MIN",.085,"#d0d0d0","normal"),i.strokeStyle="#d9dde3",i.lineWidth=m*.02,i.beginPath(),i.arc(f,v-m*.62,m*1.15,Math.PI*.36,Math.PI*.64),i.stroke(),i.strokeStyle="rgba(255,255,255,0.10)",i.lineWidth=m*.17,i.beginPath(),i.arc(f,v-m*.62,m*1.15,Math.PI*.36,Math.PI*.64),i.stroke(),i.strokeStyle="#e8e8e8",i.lineWidth=m*.025;for(const g of[-1,1])i.beginPath(),i.moveTo(f+g*m*.1,v+m*.44),i.lineTo(f+g*m*.1,v+m*.62),i.stroke()}{const[f,v,m]=a(r.hdg);Ui(i,f,v,m),i.fillStyle="#15171a",i.beginPath(),i.arc(f,v,m,0,7),i.fill();for(const g of[0,45,90,135,180,225,270,315])Wn(i,f,v,m,g,.93,1,m*.04,g===0?"#ff9a2e":"#e8e8e8")}{const[f,v,m]=a(r.vsi);Ui(i,f,v,m);for(const g of[-1,1])for(let w=0;w<=2e3;w+=100)Wn(i,f,v,m,Ie.vsi(g*w),w%500?.78:.7,.88,w%500?m*.025:m*.05);for(const g of[-1,1])for(const w of[500,1e3,1500,2e3])qe(i,f,v,m,Ie.vsi(g*w),.52,String(w/100),.2);qe(i,f,v,m,270,.52,"0",.2),qe(i,f,v,m,90,.3,"VERTICAL",.085,"#d0d0d0","normal"),qe(i,f,v,m,90,.44,"SPEED",.085,"#d0d0d0","normal"),qe(i,f,v,m,350,.22,"UP",.09,"#d0d0d0","normal"),qe(i,f,v,m,190,.22,"DOWN",.09,"#d0d0d0","normal")}{const[f,v,m]=a(r.clock);Ui(i,f,v,m);for(let g=0;g<60;g++)Wn(i,f,v,m,g*6,g%5?.84:.76,.92,g%5?m*.03:m*.06);for(let g=1;g<=12;g++)qe(i,f,v,m,g*30,.6,String(g),.22);Wn(i,f,v,m,315,0,.5,m*.07,"#f2f2f2"),Wn(i,f,v,m,60,0,.72,m*.05,"#f2f2f2"),i.fillStyle="#f2f2f2",i.beginPath(),i.arc(f,v,m*.07,0,7),i.fill()}{const[f,v,m]=a(r.suction);Ui(i,f,v,m);for(let g=0;g<=10;g++)Wn(i,f,v,m,Ie.small(g/10),g%5?.8:.7,.9,g%5?m*.03:m*.06);ar(i,f,v,m,Ie.small(.45),Ie.small(.6),.62,m*.08,"#2fbf58"),qe(i,f,v,m,180,.45,"SUCTION",.12,"#d0d0d0","normal"),Wn(i,f,v,m,Ie.small(.52),-.15,.7,m*.06,"#f2f2f2")}const l=(f,v,m,g,w,y,x,b,M=!1)=>{const[S,T,_]=a(f);Ui(i,S,T,_,M);const E=A=>M?-135+A*270:Ie.small(A);ar(i,S,T,_,E(y),E(x),.82,_*.07,"#2fbf58"),w!==null&&Wn(i,S,T,_,E(w),.7,.92,_*.06,"#e0322a");for(let A=0;A<=g;A++)Wn(i,S,T,_,E(A/g),.72,.86,_*.045);for(let A=0;A<=g;A++)qe(i,S,T,_,E(A/g),.55,b(A),M?.17:.2);qe(i,S,T,_,180,.32,v,M?.12:.14,"#d0d0d0","normal"),m&&qe(i,S,T,_,180,.5,m,M?.09:.11,"#d0d0d0","normal")};l(r.rpm,"RPM","x100",6,2600/3e3,1800/3e3,2600/3e3,f=>String(f*5),!0),l(r.map,"MAN PRESS","IN HG",5,null,.4,.84,f=>String(10+f*5),!0),l(r.oilp,"OIL","PSI",4,.95,.5,.85,f=>String(f*25)),l(r.oilt,"OIL","TEMP",4,.92,.35,.8,f=>String(50+f*50)),l(r.fuell,"FUEL","L",4,null,.15,1,f=>["E","¼","½","¾","F"][f]),l(r.fuelr,"FUEL","R",4,null,.15,1,f=>["E","¼","½","¾","F"][f]),l(r.egt,"EGT","",4,null,.3,.8,f=>String(f*4)),l(r.amp,"AMP","",4,null,.45,.65,f=>String(-60+f*30)),l(r.cht,"CHT","",4,.9,.3,.75,f=>String(f*1));{const f=Re(gi.x-gi.w/2),v=Se(gi.y+gi.h/2),m=Fn(gi.w),g=Fn(gi.h);i.fillStyle="#34383e",i.fillRect(f-22,v-22,m+44,g+44),i.fillStyle="#0a0c0f",i.fillRect(f-4,v-4,m+8,g+8);for(let y=0;y<4;y++)i.fillStyle="#1b1d21",i.fillRect(f+10+y*(m/4),v+g+6,m/4-20,12);for(const[y,x]of[[f-11,v-11],[f+m+11,v-11],[f-11,v+g+11],[f+m+11,v+g+11]])mr(i,y,x,4);un(i,f+m/2,v-12,"GNS 530  ·  BAHÍA VISTA AIR TAXI",9,"#c8ccd2","normal");const w=(y,x,b,M)=>{const S=Re(-.02),T=Re(.19),_=Fn(.036);i.fillStyle="#34383e",i.fillRect(S,y,T-S,_),i.fillStyle="#0a0c0f",i.fillRect(S+6,y+6,T-S-12,_-12),i.fillStyle="#0b1d10",i.fillRect(S+16,y+12,(T-S)*.32,_-24),i.fillRect(S+(T-S)*.55,y+12,(T-S)*.32,_-24),un(i,S+16+(T-S)*.16,y+_/2,x,_*.42,"#ffb347","bold"),un(i,S+(T-S)*.71,y+_/2,b,_*.42,"#ffb347","bold");for(const E of[S+10,T-10])i.fillStyle="#5a5e64",i.beginPath(),i.arc(E,y+_/2,_*.28,0,7),i.fill(),i.fillStyle="#23262a",i.beginPath(),i.arc(E,y+_/2,_*.16,0,7),i.fill();un(i,(S+T)/2,y+_/2,M,_*.22,"#a8adb5","normal")};w(Se(.012),"121.90","118.30","COM"),w(Se(-.03),"110.50","4213","NAV / XPDR")}rs(i,Re(-.6)+4,Se(-.055),Fn(.11),Fn(.026),["N726BV"],"#f4f4f4","#111214",22),rs(i,Re(-.485),Se(-.055),Fn(.19),Fn(.026),["NO SMOKING  ·  FASTEN SEAT BELTS"],"#f4f4f4","#111214",12),rs(i,Re(-.29),Se(-.055),Fn(.11),Fn(.026),["Vfe 95 · Vne 180"],"#f4f4f4","#7a1a14",12),rs(i,Re(-.03),Se(-.078),Fn(.22),Fn(.02),["THIS AIRCRAFT MUST BE OPERATED IN ACCORDANCE WITH THE APPROVED FLIGHT MANUAL"],"#e8e8e8","#111214",7),rs(i,Re(.29)+4,Se(-.095),Fn(.32),Fn(.024),["DHC-2 TYPE FLOATPLANE  ·  MAX GROSS 2350 KG  ·  FUEL 100LL"],"#f4f4f4","#111214",10),["MASTER","ALT","AVIONICS","FUEL PUMP","PITOT HT","NAV","STROBE","BEACON","LDG","TAXI","PANEL","DOME"].forEach((f,v)=>n_(i,Re(-.56+v*.05),Se(-.13),v<3||v===5||v===7,f));{const f=Re(.06),v=Se(-.13);i.fillStyle="#3a3e44",i.beginPath(),i.arc(f,v,26,0,7),i.fill(),i.fillStyle="#0e0f11",i.beginPath(),i.arc(f,v,20,0,7),i.fill();for(const[m,g]of[[-70,"OFF"],[-35,"R"],[0,"L"],[35,"BOTH"],[70,"START"]])un(i,f+Math.cos(qi(m))*36,v+Math.sin(qi(m))*36,g,8,"#e8e8e8","normal");i.fillStyle="#c9ccd1",i.save(),i.translate(f,v),i.rotate(qi(35)),i.fillRect(-3,-3,22,6),i.restore()}{const f=Re(.13),v=Se(-.13);i.fillStyle="#7a1a14",i.fillRect(f-24,v-28,48,56),i.fillStyle="#c0392b",i.fillRect(f-16,v-20,32,40),un(i,f,v-8,"FUEL",9,"#fff"),un(i,f,v+6,"CUT",9,"#fff"),un(i,f,v+18,"OFF",9,"#fff")}for(let f=0;f<16;f++){const v=Re(.22+f*.024),m=Se(-.125);i.fillStyle="#0f1013",i.beginPath(),i.arc(v,m,9,0,7),i.fill(),i.fillStyle="#d8dbe0",i.beginPath(),i.arc(v,m,6,0,7),i.fill()}un(i,Re(.4),Se(-.16),"CIRCUIT BREAKERS  ·  PULL OFF",9,"#c8ccd2","normal");for(const[f,v]of[[.61,"PANEL"],[.56,"RADIO"]])i.fillStyle="#5a5e64",i.beginPath(),i.arc(Re(f),Se(-.125),13,0,7),i.fill(),un(i,Re(f),Se(-.158),v,8,"#c8ccd2","normal");i.fillStyle="#1f2124",i.fillRect(0,Ia,s,sn.GRAIN);for(let f=0;f<26e3;f++){const v=e.next();i.fillStyle=v>.5?`rgba(255,255,255,${(v-.5)*.12})`:`rgba(0,0,0,${(.5-v)*.5})`,i.fillRect(e.next()*s,Ia+e.next()*sn.GRAIN,1+e.next()*2,1+e.next()*2)}i.fillStyle="#000",i.fillRect(0,Ke,s,sn.PLACARDS),rs(i,4,Ke+6,220,78,["EXIT","PULL HANDLE UP · PUSH DOOR"],"#111214","#e8b830",0),rs(i,234,Ke+6,260,78,["FASTEN SEAT BELT","WHILE SEATED"],"#f0f0f0","#111214",0);{const v=Ke+6;i.fillStyle="#0a0a0c",i.fillRect(504,v,160,78),i.fillStyle="#f2f2f2";for(let m=0;m<17;m++){const g=512+m*9;i.fillRect(g,v+40,2,m%4===0?20:10)}un(i,530,v+26,"33",18,"#f2f2f2"),un(i,584,v+26,"N",22,"#f2f2f2"),un(i,638,v+26,"3",18,"#f2f2f2"),i.fillStyle="#ffb347",i.fillRect(583,v+38,3,40)}rs(i,674,Ke+6,120,78,["GARZA 7","N726BV"],"#f0f0f0","#1a1c20",0);{const v=Ke+6,m=i.createLinearGradient(804,v,804,v+78);m.addColorStop(0,"#cfd4da"),m.addColorStop(1,"#8a9099"),i.fillStyle=m,i.fillRect(804,v,360,78),i.strokeStyle="#2a2c30",i.lineWidth=3,i.strokeRect(807,v+3,354,72),un(i,984,v+24,"BAHÍA VISTA AIR TAXI",22,"#1c2d5a","bold italic"),un(i,984,v+56,"GARZA 7 · FLOATPLANE · N726BV",14,"#1c2d5a","normal")}{const v=Ke+6,m=i.createRadialGradient(1214,v+39,4,1214,v+39,40);m.addColorStop(0,"#ffffff"),m.addColorStop(1,"#c8cbd0"),i.fillStyle=m,i.fillRect(1174,v,80,78)}const c=zn(n,!0,8);c.flipY=!0,c.wrapS=Qe,c.wrapT=Qe;const[d,u]=xn(s,Ds);u.fillStyle="#000",u.fillRect(0,0,s,Ds),u.drawImage(n,0,0),u.globalCompositeOperation="multiply",u.fillStyle="#5a5a60",u.fillRect(0,0,s,Ds),u.globalCompositeOperation="source-over",u.fillStyle="#000",u.fillRect(0,Se(-.085),s,Ds-Se(-.085)),u.fillStyle="rgba(0,0,0,0.6)",u.fillRect(0,0,s,t),u.fillStyle="#e8e6dc",u.fillRect(1174,Ke+6,80,78);const p=zn(d,!0,4);return p.flipY=!0,p.wrapS=Qe,p.wrapT=Qe,{map:c,emissive:p}}const Qn={size:512,ball:{x:0,y:0,s:256},card:{x:256,y:0,s:256},ballRadius:1.9,ballDegPerRadius:57,patches:{white:[16,300],black:[80,300],orange:[144,300],red:[208,300],bezel:[272,300],grey:[336,300],yellow:[400,300],glass:[464,300]}};function s_(){const s=Qn.size,[t,e]=xn(s,s);e.fillStyle="#000",e.fillRect(0,0,s,s);{const{x:r,y:a,s:l}=Qn.ball,h=r+l/2,c=a+l/2,d=l/2,u=d/Qn.ballDegPerRadius;e.save(),e.beginPath(),e.arc(h,c,d,0,7),e.clip();const p=e.createLinearGradient(0,c-d,0,c);p.addColorStop(0,"#2b7fd0"),p.addColorStop(1,"#4aa0e8"),e.fillStyle=p,e.fillRect(r,a,l,l/2);const f=e.createLinearGradient(0,c,0,c+d);f.addColorStop(0,"#9a6a3a"),f.addColorStop(1,"#6b4322"),e.fillStyle=f,e.fillRect(r,c,l,l/2),e.fillStyle="#f4f4f4",e.fillRect(r,c-1.5,l,3);for(let v=5;v<=35;v+=5){const m=v%10?d*.16:d*.34;for(const g of[-1,1]){const w=c-g*v*u;e.fillRect(h-m/2,w-1.2,m,2.4),v%10===0&&(e.font=`bold ${Math.round(d*.11)}px Arial`,e.textAlign="center",e.textBaseline="middle",e.fillText(String(v),h-m/2-d*.09,w),e.fillText(String(v),h+m/2+d*.09,w))}}e.restore()}{const{x:r,y:a,s:l}=Qn.card,h=r+l/2,c=a+l/2,d=l/2;e.fillStyle="#101214",e.beginPath(),e.arc(h,c,d,0,7),e.fill();for(let u=0;u<360;u+=5){const p=(u-90)*Math.PI/180,f=u%30?u%10?d*.06:d*.1:d*.14;e.fillStyle="#f2f2f2",e.save(),e.translate(h+Math.cos(p)*d*.98,c+Math.sin(p)*d*.98),e.rotate(p+Math.PI/2),e.fillRect(-1.2,0,2.4,f),e.restore()}for(let u=0;u<360;u+=30){const p=(u-90)*Math.PI/180,f=u===0?"N":u===90?"E":u===180?"S":u===270?"W":String(u/10);e.save(),e.translate(h+Math.cos(p)*d*.66,c+Math.sin(p)*d*.66),e.rotate(p+Math.PI/2),e.fillStyle=u===0?"#ff9a2e":"#f2f2f2",e.font=`bold ${Math.round(d*(u%90?.17:.22))}px Arial`,e.textAlign="center",e.textBaseline="middle",e.fillText(f,0,0),e.restore()}}const n=Qn.patches,i=(r,a)=>{const[l,h]=n[r];e.fillStyle=a,e.fillRect(l-16,h-16,32,32)};i("white","#f4f4f4"),i("black","#0b0c0e"),i("orange","#ff8a1f"),i("red","#d8322e"),i("bezel","#2e3136"),i("grey","#9a9ea4"),i("yellow","#f2c230"),i("glass","#0b0c0e");const o=zn(t,!0,8);return o.flipY=!0,o.wrapS=Qe,o.wrapT=Qe,o}class o_{texture;ctx;w=320;h=216;last="";constructor(){const[t,e]=xn(this.w,this.h);this.ctx=e,this.texture=zn(t,!0,4),this.texture.flipY=!0,this.texture.wrapS=Qe,this.texture.wrapT=Qe,this.draw(0,0,0,0)}draw(t,e,n,i){const o=Math.round(t),r=(Math.round(e)%360+360)%360,a=Math.round(n/10)*10,l=Math.round(i/50)*50,h=`${o}|${r}|${a}|${l}`;if(h===this.last)return!1;this.last=h;const c=this.ctx,d=this.w,u=this.h,p=206;return c.fillStyle="#071a2e",c.fillRect(0,0,d,u),c.save(),c.beginPath(),c.rect(0,0,p,u),c.clip(),c.translate(p/2,u*.62),c.rotate(-r*Math.PI/180),c.fillStyle="#12508a",c.fillRect(-400,-400,800,800),c.fillStyle="#5c9e4a",c.beginPath(),c.ellipse(40,-110,160,46,.35,0,7),c.fill(),c.fillStyle="#7fb56a",c.beginPath(),c.ellipse(-120,60,70,34,-.2,0,7),c.fill(),c.fillStyle="#d9c890",c.beginPath(),c.ellipse(120,-60,40,14,.5,0,7),c.fill(),c.strokeStyle="#e6e6e6",c.lineWidth=3,c.beginPath(),c.moveTo(-160,20),c.lineTo(60,-90),c.stroke(),c.strokeStyle="#ff5fb0",c.lineWidth=3,c.setLineDash([10,6]),c.beginPath(),c.moveTo(0,60),c.lineTo(0,-320),c.stroke(),c.setLineDash([]),c.restore(),c.strokeStyle="rgba(255,255,255,0.35)",c.lineWidth=1,c.beginPath(),c.arc(p/2,u*.62,62,0,7),c.stroke(),c.fillStyle="#ffffff",c.save(),c.translate(p/2,u*.62),c.beginPath(),c.moveTo(0,-12),c.lineTo(3,-2),c.lineTo(12,2),c.lineTo(12,5),c.lineTo(3,3),c.lineTo(3,9),c.lineTo(6,11),c.lineTo(-6,11),c.lineTo(-3,9),c.lineTo(-3,3),c.lineTo(-12,5),c.lineTo(-12,2),c.lineTo(-3,-2),c.closePath(),c.fill(),c.restore(),c.font="bold 10px monospace",c.textAlign="left",c.textBaseline="top",c.fillStyle="#dfe8f2",c.fillText("TRK UP  2NM",5,4),c.fillText("DTK 090  RWY09",5,u-15),c.fillStyle="#04101c",c.fillRect(p,0,d-p,u),c.fillStyle="#20364d",c.fillRect(p,0,1,u),[["GS",`${o}`,"kt"],["TRK",`${r.toString().padStart(3,"0")}`,"°"],["ALT",`${a}`,"ft"],["VS",`${l>0?"+":""}${l}`,"fpm"]].forEach(([v,m,g],w)=>{const y=w*(u/4);c.fillStyle="#20364d",w&&c.fillRect(p,y,d-p,1),c.font="bold 11px monospace",c.textAlign="left",c.textBaseline="top",c.fillStyle="#8fb3d9",c.fillText(v,p+6,y+4),c.textAlign="right",c.fillText(g,d-5,y+4),c.font="bold 30px monospace",c.textBaseline="bottom",c.fillStyle=w===1?"#ff5fb0":"#f4f4f4",c.fillText(m,d-5,y+u/4-2)}),this.texture.needsUpdate=!0,!0}}function r_(){const t=new $e("glass-dirt"),[e,n]=xn(256,256);n.fillStyle="#000",n.fillRect(0,0,256,256);for(let o=0;o<260;o++){const r=t.range(0,256),a=t.range(0,256),l=t.range(6,40),h=n.createRadialGradient(r,a,0,r,a,l),c=t.range(.03,.14);h.addColorStop(0,`rgba(255,255,255,${c})`),h.addColorStop(1,"rgba(255,255,255,0)"),n.fillStyle=h;for(const d of[-256,0,256])for(const u of[-256,0,256])n.fillRect(r-l+d,a-l+u,l*2,l*2)}for(let o=0;o<40;o++){n.strokeStyle=`rgba(255,255,255,${t.range(.03,.1)})`,n.lineWidth=t.range(.5,2);const r=t.range(0,256),a=t.range(0,256),l=t.range(20,90),h=t.range(-.4,.4);for(const c of[-256,0,256])for(const d of[-256,0,256])n.beginPath(),n.moveTo(r+c,a+d),n.lineTo(r+c+Math.cos(h)*l,a+d+Math.sin(h)*l),n.stroke()}return zn(e,!1,4)}function a_(){const[n,i]=xn(256,256),o=i.createRadialGradient(128,128,256*.07,128,128,256/2);o.addColorStop(0,"rgba(40,40,44,0.4)"),o.addColorStop(.35,"rgba(40,40,44,0.18)"),o.addColorStop(.9,"rgba(40,40,44,0.13)"),o.addColorStop(1,"rgba(40,40,44,0)"),i.fillStyle=o,i.fillRect(0,0,256,256);const r=1.3/(Math.PI*2);for(let l=0;l<3;l++){const h=i.createConicGradient(l/3*Math.PI*2,128,128);h.addColorStop(0,"rgba(18,18,22,0.2)"),h.addColorStop(r*.5,"rgba(18,18,22,0.08)"),h.addColorStop(r,"rgba(18,18,22,0)"),h.addColorStop(1,"rgba(18,18,22,0)"),i.fillStyle=h,i.beginPath(),i.arc(128,128,256*.49,0,Math.PI*2),i.fill()}i.strokeStyle="rgba(200,170,60,0.28)",i.lineWidth=7,i.beginPath(),i.arc(128,128,256*.46,0,Math.PI*2),i.stroke();const a=new Rr(n);return a.colorSpace=Dn,a}const lr=.05,Kl=.4,Cs=1.07,Au=.78,cr=2.3,hr=-1.6,Xn=-.25,ho=2.05,ur=.3,Cu=1.66,l_=.52,qn=new C(.55,1.25,0),Jt={fixed:0,asi:1,adi:2,alt100:3,alt1000:4,tc:5,tcBall:6,hdg:7,vsi:8,rpm:9,map:10,oilp:11,oilt:12,egt:13,fuell:14,fuelr:15,adiBank:16},ga=17,Ru=1/15,Ct={metal:{color:9344154,roughness:.38,metalness:.9},darkMetal:{color:2895667,roughness:.45,metalness:.8},spinner:{color:12896462,roughness:.16,metalness:.95},exhaust:{color:5917244,roughness:.6,metalness:.9},rubber:{color:1118740,roughness:.92,metalness:0},headliner:{color:13223357,roughness:.92,metalness:0},bow:{color:14341838,roughness:.85,metalness:0},trim:{color:3027254,roughness:.82,metalness:.04},sidewall:{color:9078141,roughness:.88,metalness:0},doorTrim:{color:10328207,roughness:.86,metalness:0},plastic:{color:3816770,roughness:.7,metalness:0},lightPlastic:{color:12565684,roughness:.6,metalness:0},leather:{color:8017205,roughness:.55,metalness:0},carpet:{color:3485739,roughness:.95,metalness:0},belt:{color:3948356,roughness:.9,metalness:0},prop:{color:1974050,roughness:.5,metalness:.6},propTip:{color:15909424,roughness:.5,metalness:0},shirt:{color:3100527,roughness:.85,metalness:0},skin:{color:13145452,roughness:.7,metalness:0},headset:{color:1710620,roughness:.5,metalness:0},throttle:{color:1381912,roughness:.5,metalness:0},propKnob:{color:2777008,roughness:.5,metalness:0},mixture:{color:12597547,roughness:.6,metalness:0},flapKnob:{color:15263456,roughness:.5,metalness:0},extinguisher:{color:12597547,roughness:.4,metalness:.3}},fi={red:0,green:1,tail:2,beacon:3,strobe:4},cn=Math.PI/180;class c_{pos=[];nrm=[];uv=[];pivot=[];chan=[];clip=[];idx=[];vertex(t,e,n,i,o,r,a,l,h=0){return this.pos.push(n,i,o),this.nrm.push(0,0,1),this.uv.push(r,a),this.pivot.push(t,e,0),this.chan.push(l),this.clip.push(h),this.pos.length/3-1}tick(t,e,n,i,o,r,a,l){const h=(90-e)*cn,c=Math.cos(h),d=Math.sin(h),u=t.r*n,p=t.r*i,f=-d*o/2,v=c*o/2;this.poly(t,[[c*u-f,d*u-v],[c*u+f,d*u+v],[c*p+f,d*p+v],[c*p-f,d*p-v]],r,a,l)}patchUv(t){const[e,n]=Qn.patches[t];return[e/Qn.size,1-n/Qn.size]}poly(t,e,n,i,o){const[r,a]=this.patchUv(o),l=this.pos.length/3;for(const[h,c]of e)this.vertex(t.x,t.y,h,c,n,r,a,i);for(let h=1;h<e.length-1;h++)this.idx.push(l,l+h,l+h+1)}needle(t,e,n,i,o,r="white",a=.18){const l=t.r*e,h=t.r*a;this.poly(t,[[-n/2,-h],[n/2,-h],[n*.22,l],[-n*.22,l]],i,o,r)}cap(t,e,n,i,o="black"){this.disc(t,e,n,i,o,14)}disc(t,e,n,i,o,r=40,a,l=0){const h=Qn.size,[c,d]=this.patchUv(o),u=this.pos.length/3,p=(m,g)=>a?[(a.x+a.s/2+m/e*(a.s/2))/h,1-(a.y+a.s/2-g/e*(a.s/2))/h]:[c,d],[f,v]=p(0,0);this.vertex(t.x,t.y,0,0,n,f,v,i,l);for(let m=0;m<=r;m++){const g=m/r*Math.PI*2,w=Math.cos(g)*e,y=Math.sin(g)*e,[x,b]=p(w,y);this.vertex(t.x,t.y,w,y,n,x,b,i,l)}for(let m=0;m<r;m++)this.idx.push(u,u+1+m,u+2+m)}ring(t,e,n,i,o,r,a=40){const[l,h]=this.patchUv(r),c=this.pos.length/3;for(let d=0;d<=a;d++){const u=d/a*Math.PI*2,p=Math.cos(u),f=Math.sin(u);this.vertex(t.x,t.y,p*e,f*e,i,l,h,o),this.vertex(t.x,t.y,p*n,f*n,i,l,h,o)}for(let d=0;d<a;d++){const u=c+d*2;this.idx.push(u,u+1,u+2,u+1,u+3,u+2)}}bar(t,e,n,i,o,r,a,l){this.poly(t,[[e-i/2,n-o/2],[e+i/2,n-o/2],[e+i/2,n+o/2],[e-i/2,n+o/2]],r,a,l)}build(){const t=new oe;return t.setAttribute("position",new Mt(this.pos,3)),t.setAttribute("normal",new Mt(this.nrm,3)),t.setAttribute("uv",new Mt(this.uv,2)),t.setAttribute("aPivot",new Mt(this.pivot,3)),t.setAttribute("aChan",new Mt(this.chan,1)),t.setAttribute("aClip",new Mt(this.clip,1)),t.setIndex(this.idx),t}}class h_{root=new Ye;materials=[];glassMaterial;paintMaterial;propeller=new Ye;propDisc;propHub;propBlades;aileronL;aileronR;flapL;flapR;elevator;rudder;waterRudders=[];wheels;lights;lightPower={value:new Float32Array(5)};yokeL;yokeR;throttleLever;flapLever;pedalsL;pedalsR;instruments;gpsMesh;gps=new o_;instAngle={value:new Float32Array(ga)};instShift={value:new Float32Array(ga*2)};panelMat;instMat;gpsMat;canvasAcc=Ru;gaugeState={kt:0,ft:0,fpm:0,hdg:0,bankDeg:0,pitchDeg:0,rpm:0,map:0,turnRateDps:0,slip:0};exhaustPos=new C(2.6,-.55,.66);floatSternL=new C(-2.2,-2.15,-1.25);floatSternR=new C(-2.2,-2.15,1.25);floatBowL=new C(2.6,-2,-1.25);floatBowR=new C(2.6,-2,1.25);wingTipL=new C(-.04,1.4,-7.5);wingTipR=new C(-.04,1.4,7.5);cockpitEye=new C(1,1,-.3);exteriorMeshes=[];interiorMeshes=[];spanHalf=7.5;constructor(){const t=[{x:4.55,yc:.02,w:.3,top:.3,bot:.3,n:2},{x:4.35,yc:.02,w:.55,top:.55,bot:.55,n:2},{x:3.9,yc:.02,w:.72,top:.7,bot:.7,n:2.1},{x:3.2,yc:.03,w:.75,top:.72,bot:.7,n:2.3},{x:2.6,yc:.04,w:.77,top:.74,bot:.7,n:3,nBot:2.4},{x:2.3,yc:.05,w:.78,top:.76,bot:.7,n:6,nBot:2.4},{x:2.15,yc:.05,w:.79,top:.88,bot:.7,n:5.2,nBot:2.4},{x:2,yc:.05,w:.8,top:1.01,bot:.7,n:5.2,nBot:2.4},{x:1.85,yc:.05,w:.8,top:1.12,bot:.7,n:5.8,nBot:2.4},{x:1.73,yc:.05,w:.8,top:1.13,bot:.7,n:6.5,nBot:2.4},{x:.95,yc:.05,w:.8,top:1.13,bot:.7,n:6.5,nBot:2.4},{x:0,yc:.05,w:.8,top:1.13,bot:.68,n:6.5,nBot:2.4},{x:-.4,yc:.05,w:.79,top:1.12,bot:.66,n:5.8,nBot:2.4},{x:-.9,yc:.05,w:.76,top:1.08,bot:.62,n:4.4,nBot:2.4},{x:-1.25,yc:.055,w:.7,top:1,bot:.56,n:3.3,nBot:2.3},{x:-1.6,yc:.06,w:.62,top:.9,bot:.5,n:2.7,nBot:2.2},{x:-2.6,yc:.1,w:.44,top:.62,bot:.34,n:2.3,nBot:2.1},{x:-3.7,yc:.16,w:.28,top:.42,bot:.2,n:2.1},{x:-4.7,yc:.24,w:.15,top:.3,bot:.1,n:2},{x:-5.35,yc:.3,w:.06,top:.22,bot:.04,n:2}],e=[[1.77,.95,Cs],[.85,-.42,Cs],[-.52,-1.25,Au]],n=Fy(t,[cr,hr,...e.flatMap(([O,vt])=>[O,vt])]),i=O=>n.findIndex(vt=>Math.abs(vt.x-O)<1e-6),o=O=>O>=hr?Kl:Kl-(hr-O)/(5.35+hr)*.1,r=9,a=2,l=3,h=ky([{y:Cs,segs:r,fallbackT:.1},{y:Au,segs:a,fallbackT:.146},{y:O=>o(O.x),segs:l,fallbackT:.2125},{y:O=>o(O.x)-yo.top,segs:1,fallbackT:.23},{y:O=>o(O.x)-yo.bottom,segs:1,fallbackT:.26},{y:O=>o(O.x)-yo.pin,segs:1,fallbackT:.27}],7),c=r,d=c+a,u=d+l,p=pa(n,h),f=p.R,v=fa(n,lr),m=pa(v,(O,vt)=>p.t[vt]),g=[];for(const[O,vt,_t]of e){const Xt=_t===Cs?c:d;g.push({i0:i(O),i1:i(vt),j0:Xt,j1:u}),g.push({i0:i(O),i1:i(vt),j0:f-u,j1:f-Xt})}const w={i0:i(cr),i1:i(1.85),j0:f-d,j1:f+d};g.push(w);const y=(O,vt)=>g.some(_t=>yu(_t,f,O,vt)),x=i(cr),b=i(hr),M=n[0].x,S=M-n[n.length-1].x,E=Jy({length:S,uOf:O=>(M-O)/S,xOf:O=>M-O*S,vOf:(O,vt)=>{let _t=0;for(;_t<n.length-2&&n[_t+1].x>O;)_t++;const Xt=n[_t],Le=n[_t+1],Fe=mn.clamp((Xt.x-O)/Math.max(Xt.x-Le.x,1e-6),0,1),ke=vo(Xt,vt),Te=vo(Le,vt);return ke===null&&Te===null?null:ke===null?Te:Te===null?ke:ke+(Te-ke)*Fe},topV:(O,vt)=>{const _t=Jn(n,O),Xt=_t.n??2.2,Le=Math.min(Math.abs(vt)/_t.w,.999);return vo(_t,_t.yc+_t.top*Math.pow(1-Math.pow(Le,Xt),1/Xt)*.999)??0},perimeter:O=>Ny(Jn(n,O)),sillY:o}),A=t_(),U=e_(),F=new Ko({map:E.map,roughnessMap:E.roughnessMap,normalMap:E.normalMap,normalScale:new Rt(.55,.55),color:16777215,roughness:1,metalness:0,clearcoat:.7,clearcoatRoughness:1,clearcoatRoughnessMap:E.clearcoatRoughnessMap,envMapIntensity:1});F.shadowSide=nn;const I=new Ko({map:A.map,roughnessMap:A.roughnessMap,normalMap:A.normalMap,normalScale:new Rt(.5,.5),color:16777215,roughness:1,metalness:0,clearcoat:.65,clearcoatRoughness:.14,envMapIntensity:1,vertexColors:!0}),B=new Ko({map:U.map,roughnessMap:U.roughnessMap,normalMap:U.normalMap,normalScale:new Rt(.6,.6),color:16777215,roughness:1,metalness:.55,clearcoat:.2,clearcoatRoughness:.3,envMapIntensity:1}),k=new Ko({color:10470354,transparent:!0,opacity:.1,roughness:.25,metalness:0,envMapIntensity:1,side:Yi,depthWrite:!1,specularIntensity:1,ior:1.52,premultipliedAlpha:!0}),P={uDirt:{value:r_()},uEnvGain:{value:3},uDirtAmount:{value:.35}};k.onBeforeCompile=O=>{Object.assign(O.uniforms,P),O.vertexShader=O.vertexShader.replace("#include <common>",`#include <common>
attribute vec4 aPane;
varying vec4 vPane;
varying vec2 vPaneUv;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vPane = aPane;
vPaneUv = uv;`),O.fragmentShader=O.fragmentShader.replace("#include <common>",`#include <common>
uniform sampler2D uDirt;
uniform float uEnvGain;
uniform float uDirtAmount;
varying vec4 vPane;
varying vec2 vPaneUv;`).replace("#include <opaque_fragment>",`
          // distance to the nearest pane edge in metres (and to the centre post seal on the windshield)
          vec2 dm = vec2(min(vPaneUv.x, 1.0 - vPaneUv.x) * vPane.x, min(vPaneUv.y, 1.0 - vPaneUv.y) * vPane.y);
          float dEdge = min(dm.x, dm.y);
          if (vPane.z > 0.5) dEdge = min(dEdge, abs(vPaneUv.y - 0.5) * vPane.y - 0.006);
          float seal = 1.0 - smoothstep(0.008, 0.019, dEdge);
          float vig = 1.0 - smoothstep(0.0, 0.26, dEdge);
          // the cabin side of the glass carries half the smudge film and catches no sun (the roof shades it)
          float inner = vPane.w;
          float dirt = texture2D(uDirt, vPaneUv * vPane.xy * 1.6).r * uDirtAmount * (1.0 - 0.5 * inner);
          vec3 glassN = normalize(normal), glassV = normalize(vViewPosition);
          float glassNdv = saturate(dot(glassN, glassV));
          float glassF = 0.04 + 0.96 * pow(1.0 - glassNdv, 5.0);
          // smudge film: a broad glossy lobe around the sun's mirror direction (the haze a dirty windshield shows
          // around the sun), strongest where the film is thick; the mirror highlight itself is the GGX term
          vec3 filmSheen = vec3(0.0);
          #if NUM_DIR_LIGHTS > 0
            vec3 sunL = directionalLights[0].direction;
            float sunNdh = saturate(dot(glassN, normalize(sunL + glassV)));
            filmSheen = directionalLights[0].color * pow(sunNdh, 8.0) * (0.10 + dirt * 0.9) * saturate(dot(glassN, sunL) * 4.0) * (1.0 - 0.7 * inner);
          #endif
          // the film only shows where it scatters light (sun sheen, a little of the sky reflection): as a diffuse
          // haze it would frost the panes and make them glow at night
          vec3 glassSpec = reflectedLight.directSpecular * (1.0 + dirt * 2.0) + filmSheen + reflectedLight.indirectSpecular * uEnvGain * (1.0 + dirt * 1.5);
          // soft knee: the sun's mirror image stays bright but never clips to white
          glassSpec = 1.0 - exp(-glassSpec);
          float glassA = clamp(diffuseColor.a + glassF * 0.85 + vig * 0.14 + dirt * 0.08, 0.0, 1.0);
          vec3 glassCol = totalDiffuse * (diffuseColor.a + dirt * 0.08) + glassSpec * (1.0 - 0.5 * vig);
          glassCol = mix(glassCol, totalDiffuse * 0.10, seal);
          glassA = mix(glassA, 1.0, seal);
          gl_FragColor = vec4(glassCol, glassA);
        `).replace("#include <premultiplied_alpha_fragment>","")},k.customProgramCacheKey=()=>"cockpit-glass-v7";const H=new Ko({color:en.upper,roughness:.4,metalness:0,clearcoat:.6,clearcoatRoughness:.15}),G=Ky(),N=i_(),$=new ce({map:N.map,emissiveMap:N.emissive,emissive:16777215,emissiveIntensity:.12,roughness:.75,metalness:0}),W=s_(),et=new ce({map:W,emissiveMap:W,emissive:16777215,emissiveIntensity:.15,roughness:.6,metalness:0});et.onBeforeCompile=O=>{O.uniforms.uInstAngle=this.instAngle,O.uniforms.uInstShift=this.instShift,O.vertexShader=O.vertexShader.replace("#include <common>",`#include <common>
attribute vec3 aPivot;
attribute float aChan;
attribute float aClip;
varying vec2 vInstLocal;
varying float vInstClip;
uniform float uInstAngle[${ga}];
uniform vec2 uInstShift[${ga}];`).replace("#include <begin_vertex>",`
          int instCh = int(aChan + 0.5);
          float instC = cos(uInstAngle[instCh]), instS = sin(uInstAngle[instCh]);
          vec2 instQ = position.xy + uInstShift[instCh];
          vec3 transformed = vec3(aPivot.x + instC * instQ.x - instS * instQ.y, aPivot.y + instS * instQ.x + instC * instQ.y, aPivot.z + position.z);
          vInstLocal = transformed.xy - aPivot.xy;
          vInstClip = aClip;
        `),O.fragmentShader=O.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vInstLocal;
varying float vInstClip;`).replace("#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>
if (vInstClip > 0.0 && dot(vInstLocal, vInstLocal) > vInstClip * vInstClip) discard;`)},et.customProgramCacheKey=()=>"cockpit-instruments-v2";const X=new ce({map:this.gps.texture,emissiveMap:this.gps.texture,emissive:16777215,emissiveIntensity:.55,roughness:.25,metalness:0});this.materials.push(F,I,B,k,H,G,$,et,X),this.glassMaterial=k,this.paintMaterial=F,this.panelMat=$,this.instMat=et,this.gpsMat=X;const q=(O,vt,_t={})=>{const Xt=new pe(O,vt);return Xt.castShadow=_t.cast??!0,Xt.receiveShadow=_t.receive??!0,(_t.parent??this.root).add(Xt),_t.exterior??!0?this.exteriorMeshes.push(Xt):this.interiorMeshes.push(Xt),Xt},V=Yy;q(ma(p,{quad:(O,vt)=>!y(O,vt),capStart:!0,capEnd:!0}),F);const st=new Sn,ct=O=>{const vt=mn.smoothstep(O,Cs,Cs+.045);return{...Ct.headliner,color:new Vt(Ct.headliner.color).multiplyScalar(.78+.22*vt).getHex()}},pt=(O,vt)=>vt>=Cs-.005?ct(vt):vt>=Kl-.005?Ct.trim:Ct.sidewall;st.add(ma(m,{i0:x,i1:b,quad:(O,vt)=>!y(O,vt),flip:!0,capStart:!0,capEnd:!0}),void 0,pt);for(const O of g)st.add(_u(p,m,O),void 0,Ct.trim);st.add(Hy(v,Xn,-1.55,1.95,.01),void 0,Ct.carpet);const K=fo([...g.map(O=>Mu(p,O,!1,O===w)),...g.map(O=>Mu(m,O,!0,O===w))]),ot=new C(2.05,1,0);K.translate(-ot.x,-ot.y,-ot.z);const j=q(K,k,{cast:!1,receive:!1});j.position.copy(ot),j.renderOrder=15;const nt=new Sn,D=new C(cr,.81,0),J=new C(1.85,1.17,0),Z=D.clone().add(J).multiplyScalar(.5);Z.y-=lr*.5,nt.add(new kt(D.distanceTo(J)+.04,.028,.026),V(Z,[0,0,Math.atan2(J.y-D.y,J.x-D.x)]),Ct.trim);const rt=new Sn;for(const O of[-1,1])rt.add(new kt(.3,.04,.22),V([1.3,-.45,O*.72]),Ct.darkMetal);for(let O=0;O<2;O++)rt.add(new be(.05,.06,.28,10),V([2.75-O*.22,-.5,.62+O*.03],[.6,0,1.2]),Ct.exhaust);const dt=new Sn;dt.add(new kt(.5,.12,.28),V([3.7,.7,0]));for(let O=0;O<2;O++)dt.add(new kt(.28,.04,.22),V([3,-.62,(O===0?-1:1)*.35],[(O===0?-1:1)*.35,0,0]));this.propeller.position.set(4.62,.02,0),this.root.add(this.propeller);const xt=new Sn;xt.add(Xy(.27,.58,28),V([0,0,0]),Ct.spinner),xt.add(new be(.27,.29,.18,28),V([-.09,0,0],[0,0,Math.PI/2]),Ct.darkMetal),this.propHub=q(xt.build(),G,{parent:this.propeller,receive:!1});const ft=new Sn,z=1.32,R=.16,tt=Wy(z,.17,.1),ht=(O,vt,_t)=>Math.hypot(vt,_t)>R+z-.17?Ct.propTip:Ct.prop;for(let O=0;O<3;O++){const vt=new jt().makeRotationX(O/3*Math.PI*2);ft.add(tt,vt.clone().multiply(new jt().makeTranslation(0,R,0)),ht)}this.propBlades=q(ft.build(),G,{parent:this.propeller,receive:!1});const gt=new ce({map:a_(),transparent:!0,opacity:0,depthWrite:!1,side:nn,roughness:.6,color:8947848});this.materials.push(gt),this.propDisc=new pe(new oh(1.5,40),gt),this.propDisc.rotation.y=Math.PI/2,this.propDisc.position.x=.05,this.propDisc.renderOrder=15,this.propeller.add(this.propDisc);const ut={span:7.3,rootChord:1.95,tipChord:1.55,sweep:-.28,dihedral:.02,thickness:.11,twist:-.03,camber:.02},Nt=ql(ut,0),bt=Nt+.52,Dt=Nt+.46,ee=O=>Qy(O,ut.span),yt=16,Ot=$l(fo([Rn(ut,{z0:0,z1:.85,segments:2,part:"full",hingeX:bt,capEnd:"rear",n:yt,vOf:ee}),Rn(ut,{z0:.85,z1:3.55,segments:5,part:"front",hingeX:bt,n:yt,vOf:ee}),Rn(ut,{z0:3.55,z1:3.65,segments:1,part:"full",hingeX:bt,capStart:"rear",capEnd:"rear",n:yt,vOf:ee}),Rn(ut,{z0:3.65,z1:6.9,segments:6,part:"front",hingeX:Dt,n:yt,vOf:ee}),Rn(ut,{z0:6.9,z1:7.3,segments:1,part:"full",hingeX:Dt,capStart:"rear",tipRound:.22,n:yt,vOf:ee})])),Yt=new Sn;for(const O of[1,-1])Yt.add(Ot,V(qn,void 0,[1,1,O]));const Ft=(O,vt)=>{const _t=Jn(n,O),Xt=_t.n??2.2;return _t.yc+_t.top*Math.pow(Math.max(1-Math.pow(Math.min(Math.abs(vt)/_t.w,1),Xt),0),1/Xt)},Lt=(O,vt=0)=>qn.y+bu(ut,O-qn.x,vt),le=(O,vt=0)=>qn.y+Vy(ut,O-qn.x,vt),te=(O,vt=0)=>{const _t=Lt(O,vt),Xt=le(O,vt);return _t+Math.min(.05,.5*(Xt-_t))},ge=qn.x+Po(ut,0),Y=qn.x+Nt,zt=.45,mt=.62,wt=.7,Et=O=>{const vt=O>ge?(O-ge)/zt:O<Y?(Y-O)/mt:0,_t=1-Math.min(vt,1);return _t*_t*(3-2*_t)},Tt=O=>.3+(wt-.3)*Math.sqrt(Et(O)),ie=(O,vt)=>{const _t=Math.min(Math.abs(vt),wt);if(O<=ge&&O>=Y)return te(O,_t)-Ft(O,vt);const Xt=O>ge?ge-.01:Y+.01;return(te(Xt,_t)-Ft(Xt,vt))*Et(O)},Me=O=>1-mn.smoothstep(O,.68,1),Ve=[.45,.33,.22,.13,.06].map(O=>ge+O).concat([0,.03,.08,.15,.25,.4,.55,.7,.82,.91,.97,1].map(O=>ge-O*ut.rootChord)).concat([.07,.16,.27,.4,.52,.62].map(O=>Y-O));dt.add(Gy(Ve.map(O=>({x:O,w:Tt(O)})),(O,vt)=>Ft(O,vt)-.012+Math.max(ie(O,vt)+.012,0)*Me(Math.abs(vt)/Tt(O)),(O,vt)=>Ft(O,vt)-.03,24,6));const ue=(O,vt,_t,Xt)=>{const Le=Rn({...ut,dihedral:0},{z0:O,z1:vt,segments:Xt,part:"rear",hingeX:_t,gap:.02,capStart:"rear",capEnd:"rear",n:yt,vOf:ee});Le.translate(-_t,0,0);const Fe=[];for(const ke of[1,-1]){const Te=new Ye;Te.position.set(qn.x+_t,qn.y,0),Te.rotation.x=-ke*ut.dihedral,Te.scale.z=ke;const Ge=new Ye;q(Le,I,{parent:Ge}),Te.add(Ge),this.root.add(Te),Fe.push(Ge)}return[Fe[0],Fe[1]]};[this.flapR,this.flapL]=ue(.87,3.53,bt,5),[this.aileronR,this.aileronL]=ue(3.67,6.88,Dt,6),rt.add(new be(.015,.015,.45,6),V([qn.x+.45,Lt(qn.x+.25)-.06,-3.2],[0,0,Math.PI/2]),Ct.metal);const Ue=14,dn=.004,On={span:2.55,rootChord:1.05,tipChord:.8,sweep:-.175,dihedral:0,thickness:.12,twist:0,camber:0,te:dn},bi=O=>jl(O,On.span),yn=ql(On,0)+.34,ko=$l(fo([Rn(On,{z0:0,z1:.1,segments:1,part:"full",hingeX:yn,capEnd:"rear",n:Ue,vOf:bi}),Rn(On,{z0:.1,z1:2.4,segments:4,part:"front",hingeX:yn,n:Ue,vOf:bi}),Rn(On,{z0:2.4,z1:2.55,segments:1,part:"full",hingeX:yn,capStart:"rear",tipRound:.12,n:Ue,vOf:bi})])),Ws=new C(-4.25,.42,0);for(const O of[-1,1])Yt.add(ko,V(Ws,void 0,[1,1,O]));this.elevator=new Ye,this.elevator.position.set(Ws.x+yn,Ws.y,0),this.root.add(this.elevator);const Oo=Rn(On,{z0:.12,z1:2.38,segments:4,part:"rear",hingeX:yn,gap:.015,capStart:"rear",capEnd:"rear",n:Ue,vOf:bi});Oo.translate(-yn,0,0);const us=new Sn;for(const O of[-1,1])us.add(Oo,V(void 0,void 0,[1,1,O]));q(us.build(),I,{parent:this.elevator});const Si={span:1.55,rootChord:1.5,tipChord:.75,sweep:-.55,dihedral:0,thickness:.12,twist:0,camber:0,te:dn},Ei=O=>jl(O,Si.span),Ti=ql(Si,0)+.48,Nr=$l(fo([Rn(Si,{z0:0,z1:.06,segments:1,part:"full",hingeX:Ti,capEnd:"rear",n:Ue,vOf:Ei}),Rn(Si,{z0:.06,z1:1.45,segments:3,part:"front",hingeX:Ti,n:Ue,vOf:Ei}),Rn(Si,{z0:1.45,z1:1.55,segments:1,part:"full",hingeX:Ti,capStart:"rear",tipRound:.1,n:Ue,vOf:Ei})])),Bo=new C(-4.35,.45,0);Yt.add(Nr,V(Bo,[-Math.PI/2,0,0]));const Va=Rn({span:.33,rootChord:1.3,tipChord:.25,sweep:-.885,dihedral:0,thickness:.1,twist:0,camber:0,te:dn},{z0:0,z1:.33,segments:3,part:"full",n:10,tipRound:.05,vOf:O=>jl(O,2)});Yt.add(Va,V([-2.94,.5,0],[-Math.PI/2,0,0])),q(Yt.build(),I),q(dt.build(),H),this.rudder=new Ye,this.rudder.position.set(Bo.x+Ti,Bo.y,0),this.root.add(this.rudder);const L=Rn(Si,{z0:.08,z1:1.43,segments:3,part:"rear",hingeX:Ti,gap:.015,capStart:"rear",capEnd:"rear",n:Ue,vOf:Ei});L.translate(-Ti,0,0),q(new Sn().add(L,V(void 0,[-Math.PI/2,0,0])).build(),I,{parent:this.rudder}),rt.add(new be(.01,.01,.5,5),V([-2,.9,0],[0,0,.5]),Ct.metal);const Q=new ce({color:16777215,roughness:.2,metalness:0,vertexColors:!0});Q.onBeforeCompile=O=>{O.uniforms.uLightPower=this.lightPower,O.vertexShader=O.vertexShader.replace("#include <common>",`#include <common>
attribute float aLight;
varying float vLight;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vLight = aLight;`),O.fragmentShader=O.fragmentShader.replace("#include <common>",`#include <common>
uniform float uLightPower[5];
varying float vLight;`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
totalEmissiveRadiance = vColor * uLightPower[int(vLight + 0.5)];`)},Q.customProgramCacheKey=()=>"plane-lights-v1",this.materials.push(Q);const at=(O,vt,_t)=>{const Xt=new li(O,8,6),Le=Xt.getAttribute("position").count,Fe=new Vt(vt),ke=new Float32Array(Le*3),Te=new Float32Array(Le);for(let Ge=0;Ge<Le;Ge++)ke[Ge*3]=Fe.r,ke[Ge*3+1]=Fe.g,ke[Ge*3+2]=Fe.b,Te[Ge]=_t;return Xt.setAttribute("color",new _e(ke,3)),Xt.setAttribute("aLight",new _e(Te,1)),Xt},lt=new Sn;for(const[O,vt,_t]of[[this.wingTipL,14162972,fi.red],[this.wingTipR,1624136,fi.green]]){const Xt=Math.sign(O.z)*7.55;lt.add(at(.06,vt,_t),V([O.x,O.y,Xt])),lt.add(at(.035,15922431,fi.strobe),V([O.x-.12,O.y,Xt-Math.sign(O.z)*.02]))}lt.add(at(.04,15922431,fi.tail),V([-5.37,.3,0])),lt.add(at(.05,14162972,fi.beacon),V([-4.8,2.07,0])),this.lights=q(lt.build(),Q,{cast:!1,receive:!1});const it=[{x:2.95,yc:-1.86,w:.05,top:.07,bot:.05,n:2.4,vee:1.5},{x:2.6,yc:-1.9,w:.2,top:.15,bot:.18,n:2.6,vee:1.4},{x:1.9,yc:-1.95,w:.33,top:.18,bot:.28,n:3,vee:1.25},{x:.8,yc:-1.95,w:.37,top:.19,bot:.32,n:3.2,vee:1.15},{x:-.2,yc:-1.95,w:.37,top:.19,bot:.3,n:3.2,vee:1.12},{x:-.35,yc:-1.95,w:.365,top:.19,bot:.295,n:3.2,vee:1.12,split:!0},{x:-.35,yc:-1.95,w:.365,top:.19,bot:.215,n:3.2,vee:1.15,split:!0},{x:-1.3,yc:-1.92,w:.33,top:.18,bot:.2,n:3,vee:1.2},{x:-2.3,yc:-1.86,w:.25,top:.15,bot:.12,n:2.8,vee:1.3},{x:-2.75,yc:-1.8,w:.11,top:.09,bot:.05,n:2.4,vee:1.5}],At=qy(it,8,5),Pt=O=>{const vt=Jn(it.map(_t=>({x:_t.x,yc:_t.yc,w:_t.w,top:_t.top,bot:_t.bot,n:_t.n})),O);return vt.yc+vt.top},$t=new Sn,qt=2.9,re=O=>new C(qn.x+O,qn.y+bu(ut,O,qt)+.03,0),Ht=(O,vt,_t)=>new C(O,vt,_t),Wt=(O,vt,_t)=>{rt.add(new kt(_t,.035,_t*.75),V(O.clone().addScaledVector(vt,.012)),Ct.darkMetal),rt.add(new be(.045,.05,.06,10),V(O.clone().addScaledVector(vt,.045)),Ct.darkMetal)},me=Ht(0,1,0),Ee=Ht(0,-1,0),Ae=-.62,We=1.6,fe=-.9;for(const O of[-1,1]){$t.add(At,V([0,0,O*1.25])),rt.add(new li(.085,10,8),V([2.97,-1.85,O*1.25]),Ct.rubber);const vt=Ht(We,Pt(We),O*1.25),_t=Ht(fe,Pt(fe),O*1.25),Xt=Ht(1.4,Ae,O*.55),Le=Ht(-.7,Ae,O*.5);rt.add(rr(vt,Xt,.14,.05),void 0,Ct.metal),rt.add(rr(_t,Le,.14,.05),void 0,Ct.metal),rt.add(ri(vt.clone().add(Ht(.05,.03,0)),Le,.022),void 0,Ct.metal),rt.add(ri(_t.clone().add(Ht(-.05,.03,0)),Xt,.022),void 0,Ct.metal),Wt(vt,me,.22),Wt(_t,me,.22),Wt(Xt,Ee,.16),Wt(Le,Ee,.16);const Fe=Ht(1.25,Pt(1.25),O*1.36),ke=Ht(-.3,Pt(-.3),O*1.36),Te=re(.25).setZ(O*qt),Ge=re(-.85).setZ(O*qt);rt.add(rr(Fe,Te,.12,.045),void 0,Ct.metal),rt.add(rr(ke,Ge,.12,.045),void 0,Ct.metal),rt.add(ri(Te.clone().setY(Te.y-.05),Ge.clone().setY(Ge.y-.05),.03),void 0,Ct.metal),Wt(Fe,me,.16),Wt(ke,me,.16);for(const Vo of[Te,Ge])rt.add(new kt(.16,.03,.1),V(Vo.clone().setY(Vo.y-.02)),Ct.darkMetal);const hi=new Ye;hi.position.set(-2.72,-1.83,O*1.25),q(new Sn().add(new be(.014,.014,.16,8),V([0,.02,0]),Ct.metal).add(new kt(.2,.3,.022),V([-.06,-.19,0]),Ct.darkMetal).add(new kt(.1,.02,.02),V([-.05,.09,0]),Ct.metal).build(),G,{parent:hi,cast:!1,receive:!1}),this.root.add(hi),this.waterRudders.push(hi);for(const Vo of[2,.4,-1.4])rt.add(new kt(.14,.05,.05),V([Vo,Pt(Vo)+.025,O*1.25+.2*O]),Ct.metal);rt.add(new kt(.05,.05,.12),V([2.55,Pt(2.55)+.025,O*1.25]),Ct.metal)}for(const O of[We,fe]){const vt=Pt(O)+.05;rt.add(rr(Ht(O,vt,-1.25),Ht(O,vt,1.25),.1,.06),void 0,Ct.metal);for(const _t of[-1,1])rt.add(new kt(.18,.06,.16),V([O,Pt(O)+.03,_t*1.16]),Ct.darkMetal)}rt.add(ri(Ht(We,Pt(We)+.05,-1.1),Ht(fe,Pt(fe)+.05,1.1),.008),void 0,Ct.darkMetal),rt.add(ri(Ht(We,Pt(We)+.05,1.1),Ht(fe,Pt(fe)+.05,-1.1),.008),void 0,Ct.darkMetal),q($t.build(),B),q(rt.build(),G),this.wheels=new Ye,this.root.add(this.wheels);const Zt=new yr(.2,.09,6,16),ei=new be(.12,.12,.12,12),ve=new Sn;for(const O of[-1,1])for(const[vt,_t]of[[-.9,1],[2.3,.7]])ve.add(Zt,V([vt,-2.28,O*1.25],void 0,_t),Ct.rubber),ve.add(ei,V([vt,-2.28,O*1.25],[Math.PI/2,0,0],_t),Ct.metal);q(ve.build(),G,{parent:this.wheels,receive:!1});const Ai=((O,vt)=>Ra(Jn(v,O),vt))(2.1,.74)-.03,fn=sn.H,$i=Math.min(sn.W,Ai*2-.02),Ce=new C(Math.sin(ur),-Math.cos(ur),0),Bn=new C(Math.cos(ur),Math.sin(ur),0),Cn=new C(ho,.735,0).clone().addScaledVector(Ce,fn/2),Hn=new jt().makeBasis(new C(0,0,1),Ce.clone().negate(),Bn.clone().negate()).setPosition(Cn),ci=(O,vt,_t)=>new C(O,vt,_t).applyMatrix4(Hn);nt.add(new kt(.16,fn+.02,Ai*2),V(Cn.clone().addScaledVector(Bn,.085),[0,0,ur]),Ct.plastic);const ds=[],Ho={...os.face},yh=(1-$i/sn.W)*.5*(Ho.u1-Ho.u0);Ho.u0+=yh,Ho.u1-=yh;const _h=Xl($i,fn,Ho);_h.applyMatrix4(Hn),ds.push(_h),ds.push(Oy(v,.745,ho-.02,cr-.005,.005,.02,os.grain));const qs=(O,vt,_t,Xt,Le,Fe)=>{const ke=Xl(vt,_t,O),Te=Le.clone().normalize(),Ge=Fe.clone().addScaledVector(Te,-Fe.dot(Te)).normalize(),hi=new C().crossVectors(Ge,Te);ke.applyMatrix4(new jt().makeBasis(hi,Ge,Te).setPosition(Xt)),ds.push(ke)},Go=new C(0,1,0);qs(os.nameplate,.16,.035,new C(ho-.041,.725,.34),new C(-1,0,0),Go),nt.add(new kt(.075,.055,.07),V([ho+.09,.8,0]),Ct.plastic),nt.add(new kt(.02,.035,.024),V([ho+.09,.762,0]),Ct.darkMetal),qs(os.compass,.05,.024,new C(ho+.052,.8,0),new C(-1,0,0),Go),nt.add(new kt(.12,.024,.1),V([.3,1.117,0]),Ct.lightPlastic),qs(os.domeLens,.075,.06,new C(.3,1.1045,0),new C(0,-1,0),new C(1,0,0));const xe=new c_,It=qc,Mh=.0015,Wa=.0025,je=.0035,ji=.0045;xe.needle(It.asi,.86,.004,je,Jt.asi),xe.cap(It.asi,.005,ji,Jt.asi),xe.disc(It.adi,It.adi.r*Qn.ballRadius,Mh,Jt.adi,"white",48,Qn.ball,It.adi.r*.995);for(const O of[-60,-30,-20,-10,10,20,30,60])xe.tick(It.adi,O,Math.abs(O)%30?.9:.84,.98,.0022,Wa,Jt.fixed,"white");xe.poly(It.adi,[[-.055*It.adi.r,.98*It.adi.r],[.055*It.adi.r,.98*It.adi.r],[0,.82*It.adi.r]],Wa,Jt.fixed,"white"),xe.poly(It.adi,[[-.05*It.adi.r,.66*It.adi.r],[.05*It.adi.r,.66*It.adi.r],[0,.8*It.adi.r]],Wa,Jt.adiBank,"orange"),xe.bar(It.adi,-.4*It.adi.r,0,.42*It.adi.r,.004,je,Jt.fixed,"orange"),xe.bar(It.adi,.4*It.adi.r,0,.42*It.adi.r,.004,je,Jt.fixed,"orange"),xe.bar(It.adi,-.19*It.adi.r,-.05*It.adi.r,.004,.1*It.adi.r,je,Jt.fixed,"orange"),xe.bar(It.adi,.19*It.adi.r,-.05*It.adi.r,.004,.1*It.adi.r,je,Jt.fixed,"orange"),xe.disc(It.adi,.003,je,Jt.fixed,"orange",10),xe.needle(It.alt,.62,.007,je,Jt.alt1000,"white",.12),xe.needle(It.alt,.86,.0035,je,Jt.alt100),xe.cap(It.alt,.005,ji,Jt.alt100),xe.bar(It.tc,0,0,1.3*It.tc.r,.005,je,Jt.tc,"white"),xe.bar(It.tc,0,.11*It.tc.r,.006,.26*It.tc.r,je,Jt.tc,"white"),xe.bar(It.tc,0,-.02*It.tc.r,.24*It.tc.r,.008,ji,Jt.tc,"white"),xe.disc({x:It.tc.x,y:It.tc.y-.53*It.tc.r,r:It.tc.r},.0032,je,Jt.tcBall,"black",14),xe.disc(It.hdg,It.hdg.r*.92,Mh,Jt.hdg,"white",48,Qn.card),xe.bar(It.hdg,0,.05*It.hdg.r,.004,.5*It.hdg.r,je,Jt.fixed,"white"),xe.bar(It.hdg,0,.05*It.hdg.r,.46*It.hdg.r,.004,je,Jt.fixed,"white"),xe.bar(It.hdg,0,-.15*It.hdg.r,.18*It.hdg.r,.004,je,Jt.fixed,"white"),xe.poly(It.hdg,[[-.04*It.hdg.r,.99*It.hdg.r],[.04*It.hdg.r,.99*It.hdg.r],[0,.82*It.hdg.r]],je,Jt.fixed,"orange"),xe.needle(It.vsi,.84,.004,je,Jt.vsi),xe.cap(It.vsi,.005,ji,Jt.vsi),xe.needle(It.rpm,.84,.0035,je,Jt.rpm),xe.cap(It.rpm,.004,ji,Jt.rpm),xe.needle(It.map,.84,.0035,je,Jt.map),xe.cap(It.map,.004,ji,Jt.map);for(const[O,vt]of[[It.oilp,Jt.oilp],[It.oilt,Jt.oilt],[It.fuell,Jt.fuell],[It.fuelr,Jt.fuelr],[It.egt,Jt.egt]])xe.needle(O,.8,.0028,je,vt),xe.cap(O,.003,ji,vt);for(const O of[It.amp,It.cht])xe.needle(O,.8,.0028,je,Jt.fixed),xe.cap(O,.003,ji,Jt.fixed);this.instruments=q(xe.build(),et,{exterior:!1,cast:!1}),Hn.decompose(this.instruments.position,this.instruments.quaternion,this.instruments.scale);const Xa=Xl(gi.w,gi.h,{u0:0,v0:0,u1:1,v1:1});Xa.translate(gi.x,gi.y,8e-4),Xa.applyMatrix4(Hn),this.gpsMesh=q(Xa,X,{exterior:!1,cast:!1}),nt.add(new kt(.7,.32,.22),V([1.7,Xn+.16,0]),Ct.plastic),nt.add(new kt(.22,.02,.16),V([1.62,Xn+.33,0]),Ct.darkMetal);const qa=(O,vt,_t)=>new Sn().add(new be(.009,.011,_t,8),V([0,_t/2,0]),Ct.metal).add(vt,V([0,_t+.012,0]),O).build(),bh=new li(.022,12,8);this.throttleLever=q(qa(Ct.throttle,bh,.16),G,{exterior:!1,cast:!1,receive:!1}),this.throttleLever.position.set(1.62,Xn+.34,-.05);for(const[O,vt]of[[0,Ct.propKnob],[.05,Ct.mixture]])nt.add(qa(vt,bh,.15),V([1.62,Xn+.34,O],[0,0,-.35]),vt);this.flapLever=q(qa(Ct.flapKnob,new be(.014,.014,.05,10),.26),G,{exterior:!1,cast:!1,receive:!1}),this.flapLever.position.set(1.42,Xn+.3,.1);const Sh=O=>{const vt=new Sn;for(const _t of[-.34,.34]){const Xt=_t+O;vt.add(new be(.011,.011,.2,8),V([.02,.1,Xt],[0,0,-.2]),Ct.metal),vt.add(new kt(.02,.15,.085),V([.06,.21,Xt],[0,0,-.35]),Ct.darkMetal),vt.add(new kt(.03,.03,.03),V([0,.015,Xt]),Ct.darkMetal)}return vt.build()};this.pedalsL=q(Sh(-.12),G,{exterior:!1,cast:!1,receive:!1}),this.pedalsR=q(Sh(.12),G,{exterior:!1,cast:!1,receive:!1});for(const O of[this.pedalsL,this.pedalsR])O.position.set(1.93,Xn,0);nt.add(new be(.015,.015,1.2,8),V([1.93,Xn+.02,0],[Math.PI/2,0,0]),Ct.metal);const fs=Xn+.4,ps=new C(Cu,l_,0),Od=ci(0,-.175,0).setZ(0),Eh=(O,vt)=>{const _t=new Ye,Xt=new Sn,Le=Od.clone().sub(ps).setZ(0),Fe=Le.clone().normalize();Xt.add(ri(new C(0,0,0),Le.clone().addScaledVector(Fe,.16),.018),void 0,Ct.darkMetal),Xt.add(new be(.03,.03,.04,12),V(Le.clone().addScaledVector(Fe,-.01),[0,0,Math.PI/2-Math.atan2(Fe.y,Fe.x)]),Ct.rubber),Xt.add(new kt(.05,.09,.075),void 0,Ct.plastic),Xt.add(new yr(.15,.013,8,36,Math.PI*1.39),V(void 0,[0,Math.PI/2,Math.PI*.805]),Ct.plastic),Xt.add(new kt(.022,.15,.03),V([0,-.075,0]),Ct.plastic);for(const Te of[-1,1]){Xt.add(new kt(.022,.03,.15),V([0,0,Te*.075]),Ct.plastic);const Ge=new C(0,.15*Math.sin(Math.PI*.195),Te*.15*Math.cos(Math.PI*.195)),hi=Ge.clone().add(new C(0,.08,Te*.03));Xt.add(ri(Ge,hi,.017,10),void 0,Ct.rubber),vt&&(Xt.add(new sh(.03,.045,4,12),V(Ge.clone().lerp(hi,.5).add(new C(-.012,0,0)),[0,0,Te*.2]),Ct.skin),Xt.add(new be(.011,.011,.05,8),V(Ge.clone().lerp(hi,.75).add(new C(.028,0,-Te*.01)),[0,0,Math.PI/2]),Ct.skin))}const ke=new pe(Xt.build(),G);return ke.castShadow=!1,_t.add(ke),_t.position.set(ps.x,ps.y,O),this.root.add(_t),this.interiorMeshes.push(_t),_t};this.yokeL=Eh(-.34,!0),this.yokeR=Eh(.34,!1);for(const O of[-.34,.34])qs(os.yoke,.036,.024,new C(ps.x-.026,ps.y+.015,O),new C(-1,0,0),Go);const Bd=new kt(.46,.12,.46),Hd=new kt(.1,.55,.46),Gd=new kt(.26,.34,.26),Th=[[1,-.34],[1,.34],[-.2,-.34],[-.2,.34],[-1,0]];for(const[O,vt]of Th)nt.add(Bd,V([O,fs,vt]),Ct.leather),nt.add(Hd,V([O-.25,fs+.33,vt],[0,0,.15]),Ct.leather),nt.add(Gd,V([O,Xn+.17,vt]),Ct.darkMetal);const Ya=fs+.06,ms=(O,vt,_t=[0,1,0])=>nt.add(By(Ht(...O),Ht(...vt),.045,.005,Ht(..._t)),void 0,Ct.belt),Ah=(O,vt=[0,0,0])=>nt.add(new kt(.055,.016,.06),V(O,vt),Ct.metal);for(const[O,vt]of Th.slice(1)){const _t=Ya+.004;ms([O,_t,vt-.24],[O,_t,vt-.04]),ms([O,_t,vt+.24],[O,_t,vt+.04]),Ah([O,_t+.004,vt])}ms([.96,Ya+.01,-.6],[1.07,.3,-.36],[.35,1,0]),ms([.96,Ya+.01,-.08],[1.07,.3,-.32],[.35,1,0]),Ah([1.075,.3,-.34],[0,0,.35]),ms([1.1,.78,-.5],[1.09,.31,-.32],[1,.1,0]),ms([1,.8,-.5],[.52,.96,-.68],[0,1,-.3]),ms([.52,.96,.68],[.74,.7,.46],[0,1,.3]);for(const O of[-1,1])nt.add(new kt(.05,.05,.02),V([.52,.96,O*.69]),Ct.darkMetal);const $a=this.cockpitEye.y-.03;nt.add(new kt(.28,.58,.42),V([.95,fs+.06+.29,-.34]),Ct.shirt),nt.add(new li(.11,12,10),V([.98,$a,-.34]),Ct.skin),nt.add(new yr(.115,.018,6,16,Math.PI),V([.98,$a+.03,-.34],[0,Math.PI/2,0]),Ct.headset);for(const O of[-1,1])nt.add(new be(.045,.045,.03,10),V([.98,$a,-.34+O*.12],[Math.PI/2,0,0]),Ct.headset);for(const O of[-1,1]){const vt=Ht(.98,.74,-.34+O*.2),_t=Ht(1.2,.52,-.34+O*.23),Xt=Ht(ps.x-.04,ps.y+.12,-.34+O*.165);nt.add(ri(vt,_t,.045,8),void 0,Ct.shirt),nt.add(ri(_t,Xt,.04,8),void 0,Ct.shirt),nt.add(new li(.045,8,6),V(_t),Ct.shirt)}for(const O of[-1,1])nt.add(ri(Ht(1.05,fs+.1,-.34+O*.11),Ht(1.45,fs+.12,-.34+O*.12),.07,8),void 0,Ct.plastic),nt.add(ri(Ht(1.45,fs+.12,-.34+O*.12),Ht(1.9,Xn+.06,-.34+O*.12),.055,8),void 0,Ct.plastic);const Ch=fa(n,lr+.015),Rh=pa(Ch,(O,vt)=>p.t[vt]),Ph=(()=>{const O=Jn(n,1.3),vt=vo(O,-.42)??.4,_t=p.t[i(1.77)];let Xt=u,Le=1/0;for(let Fe=u;Fe<=f/2;Fe++){const ke=Math.abs(_t[Fe]-vt);ke<Le&&(Le=ke,Xt=Fe)}return Xt})(),Vd=[{i0:i(1.77),i1:i(.95),j0:u,j1:Ph},{i0:i(1.77),i1:i(.95),j0:f-Ph,j1:f-u}];for(const O of Vd)st.add(ma(Rh,{i0:O.i0,i1:O.i1,quad:(vt,_t)=>yu(O,f,vt,_t),flip:!0}),void 0,Ct.doorTrim),st.add(_u(m,Rh,O),void 0,Ct.trim);const Ys=(O,vt)=>Ra(Jn(Ch,O),vt);for(const O of[-1,1])nt.add(new kt(.34,.045,.07),V([1.32,.17,O*(Ys(1.32,.17)-.035)]),Ct.plastic),nt.add(new kt(.05,.05,.012),V([1.06,.06,O*(Ys(1.06,.06)-.006)]),Ct.metal),nt.add(new kt(.1,.018,.02),V([1.1,.05,O*(Ys(1.06,.06)-.025)],[0,0,-.25]),Ct.metal),nt.add(new kt(.3,.16,.02),V([1.3,-.16,O*(Ys(1.3,-.16)-.012)]),Ct.trim),qs(os.exit,.1,.036,new C(1.15,.33,O*(Ys(1.15,.33)-.002)),new C(0,0,-O),Go),qs(os.belts,.1,.03,new C(1.55,.33,O*(Ys(1.55,.33)-.002)),new C(0,0,-O),Go);for(const O of[1.81,.9]){const vt=[Jn(fa(n,lr+.004),O+.012),Jn(fa(n,lr+.004),O-.012)],_t=pa(vt,Xt=>h(Xt));st.add(ma(_t,{flip:!0,quad:(Xt,Le)=>Le<c||Le>=f-c}),void 0,Ct.bow)}for(const O of[-1,1])nt.add(new be(.028,.028,.024,12),V([1.6,1.092,O*.5]),Ct.lightPlastic),nt.add(new be(.015,.015,.028,10),V([1.6,1.091,O*.5]),Ct.plastic);nt.add(new be(.045,.045,.26,10),V([.55,Xn+.14,.62],[0,0,.1]),Ct.extinguisher),nt.add(new kt(.06,.08,.04),V([.55,Xn+.06,.66]),Ct.darkMetal),q(st.build(),G,{exterior:!1,cast:!1}),q(nt.build(),G,{exterior:!1});const Lh=fo(ds);if(!Lh)throw new Error("cockpit: textured parts have incompatible attributes");q(Lh,$,{exterior:!1,cast:!1});for(const O of this.materials)O.isMeshStandardMaterial&&(O.envMapIntensity=1);this.setInstruments(null,0,0)}animate(t,e,n,i,o,r,a,l,h,c=null,d=o){this.aileronR.rotation.z=-e*.35,this.aileronL.rotation.z=e*.35,this.flapR.rotation.z=i*.6,this.flapL.rotation.z=i*.6,this.elevator.rotation.z=t*.4,this.rudder.rotation.y=-n*.45;for(const m of this.waterRudders)m.rotation.y=-n*.5;this.propeller.rotation.x+=o*2600*(Math.PI*2/60)*r;const u=this.propDisc.material;u.opacity=mn.clamp((o-.15)*1.6,0,.75),this.propBlades.visible=o<.55;const p=a%1.2<.06||(a+.15)%1.2<.06,f=Math.pow(l,.6),v=this.lightPower.value;v[fi.red]=v[fi.green]=7*f,v[fi.tail]=6*f,v[fi.beacon]=(2+12*Math.max(0,Math.sin(a*4.5)))*f,v[fi.strobe]=(p?30:0)*f,this.wheels.visible=h,this.wheels.position.y=h?0:.3;for(const m of[this.yokeL,this.yokeR])m.rotation.x=e*.9,m.position.x=Cu-t*.08;this.pedalsL.rotation.z=-n*.32,this.pedalsR.rotation.z=n*.32,this.throttleLever.rotation.z=(.5-mn.clamp(d,0,1))*.9,this.flapLever.rotation.z=-(1.75+mn.clamp(i,0,1)*1.05)+Math.PI/2,this.panelMat.emissiveIntensity=.1+1.3*f,this.instMat.emissiveIntensity=.15+1.4*f,this.gpsMat.emissiveIntensity=.55+1.2*f,this.canvasAcc+=r,this.setInstruments(c,o,d)}setInstruments(t,e,n){const i=this.instAngle.value,o=this.instShift.value,r=qc,a=this.gaugeState,l=t?t.airspeed*1.9438:0,h=t?t.altitude*3.2808:0,c=t?t.verticalSpeed*196.85:0,d=t?t.heading:0,u=t?t.bank:0,p=t?t.pitchAngle:0,f=t?t.beta:0,v=t?Math.max(t.airspeed,15):15,m=t&&!t.onWater&&!t.onGround?9.81*Math.tan(u)/v/cn:0,g=600+e*2e3,w=mn.clamp(11+19*n-(t?t.altitude:0)/300,10,35);a.kt=l,a.ft=h,a.fpm=c,a.hdg=d,a.bankDeg=u/cn,a.pitchDeg=p/cn,a.rpm=g,a.map=w,a.turnRateDps=m,a.slip=f,i[Jt.fixed]=0,i[Jt.asi]=-Ie.asi(l)*cn,i[Jt.adi]=u,i[Jt.adiBank]=u,o[Jt.adi*2]=0,o[Jt.adi*2+1]=-mn.clamp(p/cn,-25,25)*(r.adi.r/30),i[Jt.alt100]=-Ie.alt100(h)*cn,i[Jt.alt1000]=-Ie.alt1000(h)*cn,i[Jt.tc]=-mn.clamp(m/3,-1.6,1.6)*20*cn;const y=mn.clamp(f*5,-1,1)*.36*r.tc.r;o[Jt.tcBall*2]=y,o[Jt.tcBall*2+1]=y*y/(2.3*r.tc.r),i[Jt.hdg]=d*cn,i[Jt.vsi]=-Ie.vsi(c)*cn,i[Jt.rpm]=-Ie.rpm(g)*cn,i[Jt.map]=-Ie.map(w)*cn,i[Jt.oilp]=-Ie.small(e>.05?.55+.25*e:0)*cn,i[Jt.oilt]=-Ie.small(.35+.35*e)*cn,i[Jt.egt]=-Ie.small(.15+.6*e)*cn,i[Jt.fuell]=-Ie.small(.62)*cn,i[Jt.fuelr]=-Ie.small(.57)*cn,this.canvasAcc>=Ru&&(this.canvasAcc=0,this.gps.draw(t?t.groundSpeed*1.9438:0,d,h,c))}debugGauges(){return{...this.gaugeState}}}const Pu=9.81;class za{constructor(t){this.heightAt=t}position=new C(0,.3,0);quaternion=new Xe;velocity=new C;omega=new C;rpm=0;telemetry={airspeed:0,groundSpeed:0,altitude:0,agl:0,verticalSpeed:0,heading:0,alpha:0,beta:0,stalled:!1,onWater:!1,onGround:!1,rpm:0,gForce:1,gearDown:!0,shake:0,buffet:0,gustLevel:0,bank:0,pitchAngle:0,crashed:!1};mass=2350;wingArea=26;span=14.6;chord=1.65;maxThrust=7400;inertia=new C(5600,11600,7400);wind=new C;turbulence=.3;gearDown=!0;gust=new C;gustAmp=0;time=0;buffet=0;crashTimer=0;wreckedTimer=0;lastHeading=0;contactUp=0;tmpV=new C;tmpV2=new C;invQ=new Xe;stations=[{p:new C(2.6,-2.08,-1.25),kind:"bow"},{p:new C(2.6,-2.08,1.25),kind:"bow"},{p:new C(-.2,-2.25,-1.25),kind:"step"},{p:new C(-.2,-2.25,1.25),kind:"step"},{p:new C(-2.3,-1.98,-1.25),kind:"stern"},{p:new C(-2.3,-1.98,1.25),kind:"stern"},{p:new C(.7,-2.27,-1.25),kind:"plane"},{p:new C(.7,-2.27,1.25),kind:"plane"},{p:new C(-.9,-2.57,-1.25),kind:"wheel"},{p:new C(-.9,-2.57,1.25),kind:"wheel"},{p:new C(2.3,-2.48,-1.25),kind:"wheel"},{p:new C(2.3,-2.48,1.25),kind:"wheel"},{p:new C(3.6,-.5,0),kind:"structure"},{p:new C(-.04,1.4,-7.5),kind:"structure"},{p:new C(-.04,1.4,7.5),kind:"structure"},{p:new C(-4.9,2.1,0),kind:"structure"},{p:new C(-5.4,-.2,0),kind:"structure"},{p:new C(.6,1.75,0),kind:"structure"}];static FLOAT_REST_Y=1.96;static WHEEL_REST_Y=2.57;reset(t,e,n,i,o){this.position.set(t,e,n),this.quaternion.setFromEuler(new He(0,i,0));const r=new C(1,0,0).applyQuaternion(this.quaternion);this.velocity.copy(r).multiplyScalar(o),this.omega.set(0,0,0),this.rpm=o>5?.7:.2,this.wreckedTimer=0}forward(t){return t.set(1,0,0).applyQuaternion(this.quaternion)}up(t){return t.set(0,1,0).applyQuaternion(this.quaternion)}step(t,e){if(e<=0){this.probeContacts(),this.updateTelemetry(t);return}const n=Math.max(1,Math.ceil(e/(1/120))),i=e/n;for(let o=0;o<n;o++)this.substep(t,i);this.updateTelemetry(t)}substep(t,e){this.time+=e,this.crashTimer=Math.max(0,this.crashTimer-e);const n=Qt(t.throttle,0,1);this.rpm+=(n*.92+.08-this.rpm)*Qt(e/.7,0,1);const i=this.time*.35,o=Gt(i,1.3)+.4*Gt(i*4,11.7),r=.7*Gt(i*1.7,7.1)+.35*Gt(i*5.1,3.3),a=Gt(i*1.3,3.7)+.4*Gt(i*4.3,6.9),l=this.turbulence*(1.5+2*(1-St(30,300,this.position.y)));this.gustAmp=l,this.gust.set(o,r,a).multiplyScalar(l),this.invQ.copy(this.quaternion).invert();const h=this.tmpV.copy(this.velocity).sub(this.wind).sub(this.gust),c=this.tmpV2.copy(h).applyQuaternion(this.invQ),d=Math.max(c.length(),.5),u=Math.atan2(-c.y,Math.max(c.x,.1)),p=Math.asin(Qt(c.z/d,-1,1)),f=1.2*Math.exp(-this.position.y/9e3),v=.5*f*d*d,m=this.wingArea,g=Qt(t.flaps,0,1),w=.27-g*.03;let y=.32+g*.55+5.4*u;const x=1.7+g*.5;let b=!1,M=0;u>w?(M=u-w,y=Math.max(x-M*6,.9*Math.sin(2*u)),b=!0):u<-.22&&(y=Math.max(y,-.9)),y=Math.min(y,x),this.buffet=se(this.buffet,b?1:St(w-.05,w,u)*.5,Qt(e*6,0,1));const S=.034+.048*y*y+g*.05+(this.gearDown?.012:0)+(b?.1+.6*M:0),T=-.45*p,_=v*m*y,E=v*m*S,A=v*m*T,U=c.clone().normalize(),F=new C(-U.y,U.x,0).normalize();F.lengthSq()<.5&&F.set(0,1,0);const I=new C;I.addScaledVector(U,-E),I.addScaledVector(F,_),I.z+=A;const B=this.maxThrust*Qt((this.rpm-.08)/.92,0,1)*Qt(1-d/120,.2,1)*(f/1.2);I.x+=B;const k=I.y,P=this.omega.x,H=this.omega.y,G=this.omega.z,N=this.span,$=this.chord,W=2*Math.max(d,3),et=P*N/W,X=H*N/W,q=G*$/W,V=Qt(t.roll,-1,1),st=Qt(t.yaw,-1,1),ct=Qt(Math.sqrt(614/Math.max(v,1)),.4,1),pt=Qt(t.pitch,-1,1)*ct,K=-.18*St(0,.035,M),ot=.04-1.3*u-36*q+.43*pt*(1-.15*g)-.06*g+K,j=-.5*et+.072*V-.08*p-.08*X,nt=-.1*p-.16*X-.075*st+.008*V+.06*Qt(y,0,1.5)*et,D=new C(v*m*N*j,v*m*N*nt,v*m*$*ot);D.z+=.25*B,b&&(D.x+=v*m*N*.02*Math.sin(this.time*17)*this.buffet,D.z-=v*m*$*.03*this.buffet),D.x+=v*m*N*.0055*l*Gt(this.time*2.1,9.9),D.z+=v*m*$*.004*l*Gt(this.time*1.9,4.4),D.y+=v*m*N*.002*l*Gt(this.time*1.7,12.4);let J=!1,Z=!1,rt=!1,dt=0;const xt=new C,ft=new C,z=new C,tt=this.heightAt(this.position.x,this.position.z)>.05;this.gearDown=tt&&this.position.y<60;const ht=Math.hypot(this.velocity.x,this.velocity.z),gt=this.quaternion,ut=Math.asin(Qt(2*(gt.x*gt.y+gt.w*gt.z),-1,1));this.contactUp=0;for(const Ft of this.stations){const Lt=Ft.p;ft.copy(Lt).applyQuaternion(this.quaternion).add(this.position);const le=this.heightAt(ft.x,ft.z),te=le<=.05,Y=(te?0:le)-ft.y;if(Y<=0)continue;const zt=Ft.kind==="wheel",mt=Ft.kind==="structure",wt=!zt&&!mt;if(te&&zt||!te&&wt&&this.gearDown)continue;rt=!0,z.copy(this.omega).applyQuaternion(this.quaternion).cross(this.tmpV.copy(ft).sub(this.position)).add(this.velocity);const Et=Math.hypot(z.x,z.z);let Tt,ie;if(mt)Et>12&&this.crash(),te?(J=!0,Tt=12e3*Y-3e3*z.y,ie=-(250*Et+40*Et*Et)*Math.min(Y/.3,1)):(Z=!0,Tt=8e4*Math.min(Y,.6)-8e3*z.y,ie=-.7*Math.max(Tt,0)*Math.min(Et,1));else if(te){J=!0;const Me=St(8,22,Et),Ve=Math.min(Y/.1,1);if(Ft.kind==="plane"){const ue=Qt(.5+3*ut,.25,1.3);Tt=(40*Et*Et*Math.min(Y/.35,1)*ue-250*Et*Ve*z.y)*Me,ie=0}else{dt++;const ue=Ft.kind==="bow",Ue=Ft.kind==="stern",dn=Ue?36e3:ue?24e3:56e3,On=Ue||ue?.15:.2,bi=Y<On?Y*Y/(2*On):Y-On/2,yn=Ue?1-.9*Me:ue?1-.6*Me:1-.3*Me;Tt=dn*Math.min(bi,.9)*yn+3e4*Math.max(Y-.45,0)**2,Tt-=5500*Ve*(1-.5*Me)*z.y,ie=-(4.5*Et*Et*(1-.85*Me)+30*Et)*Math.min(Y/.3,1)}}else{Z=!0,Tt=52e3*Math.min(Y,.5)-6e3*z.y,ie=-(t.brake?.45:.03)*Math.max(Tt,0)*Math.min(Et,1);const ue=new C(0,0,1).applyQuaternion(this.quaternion);ue.y=0,ue.normalize();const Ue=z.dot(ue),dn=Qt(-Ue*900,-.9*Math.max(Tt,0),.9*Math.max(Tt,0));xt.copy(ue).multiplyScalar(dn),this.applyForce(xt,ft,e)}Tt=Math.max(Tt,0),xt.set(0,Tt,0),Et>.01&&xt.add(this.tmpV.set(z.x/Et,0,z.z/Et).multiplyScalar(ie)),this.applyForce(xt,ft,e)}if(dt>0){const Ft=ht;this.omega.y-=st*1500*Math.min(Ft/6,1)*(dt/6)*e/this.inertia.y}if(rt&&this.velocity.y<-15&&this.crash(),Z&&ht>25){const Ft=this.heightAt(this.position.x+2,this.position.z)-this.heightAt(this.position.x-2,this.position.z),Lt=this.heightAt(this.position.x,this.position.z+2)-this.heightAt(this.position.x,this.position.z-2);Math.hypot(Ft,Lt)/4>.2&&this.crash()}const Nt=I.applyQuaternion(this.quaternion);Nt.y-=this.mass*Pu,this.velocity.addScaledVector(Nt,e/this.mass),this.position.addScaledVector(this.velocity,e),this.omega.x+=D.x/this.inertia.x*e,this.omega.y+=D.y/this.inertia.y*e,this.omega.z+=D.z/this.inertia.z*e,(J||Z)&&this.omega.multiplyScalar(1-.8*e);const bt=new Xe(this.omega.x*e*.5,this.omega.y*e*.5,this.omega.z*e*.5,1).normalize();this.quaternion.multiply(bt).normalize();const Dt=this.heightAt(this.position.x,this.position.z),ee=Math.max(Dt,0)+.8;this.position.y<ee&&(this.position.y=ee,this.velocity.y<0&&(this.velocity.y*=-.1),this.velocity.multiplyScalar(1-2.5*e));const yt=1-2*(this.quaternion.x*this.quaternion.x+this.quaternion.z*this.quaternion.z);(rt||this.position.y-Math.max(Dt,0)<3.5)&&yt<.35?(this.wreckedTimer+=e,this.wreckedTimer>2.9&&this.crash()):this.wreckedTimer=0;const Yt=this.forward(this.tmpV);Math.hypot(Yt.x,Yt.z)>.2&&(this.lastHeading=Math.atan2(Yt.x,-Yt.z)),this.telemetry.alpha=u,this.telemetry.beta=p,this.telemetry.stalled=b&&d>12,this.telemetry.onWater=J,this.telemetry.onGround=Z,this.telemetry.gForce=(k+this.contactUp)/(this.mass*Pu),this.telemetry.buffet=this.buffet,this.telemetry.gustLevel=Qt(this.gust.length()/2.5,0,1)*St(8,25,d),this.telemetry.shake=Qt(this.buffet*.7+this.telemetry.gustLevel*.5+St(60,100,d)*.25,0,1)}crash(){const t=this.heightAt(this.position.x,this.position.z),e=t>.05;this.position.y=e?t+za.WHEEL_REST_Y:za.FLOAT_REST_Y,this.quaternion.setFromEuler(new He(0,this.headingToYaw(this.lastHeading),0)),this.velocity.set(0,0,0),this.omega.set(0,0,0),this.rpm=.08,this.buffet=0,this.wreckedTimer=0,this.crashTimer=5}headingToYaw(t){return Math.atan2(Math.cos(t),Math.sin(t))}applyForce(t,e,n){this.velocity.addScaledVector(t,n/this.mass);const i=this.quaternion;this.contactUp+=t.x*2*(i.x*i.y-i.w*i.z)+t.y*(1-2*(i.x*i.x+i.z*i.z))+t.z*2*(i.y*i.z+i.w*i.x);const r=this.tmpV.copy(e).sub(this.position).cross(t);r.applyQuaternion(this.invQ),this.omega.x+=r.x/this.inertia.x*n,this.omega.y+=r.y/this.inertia.y*n,this.omega.z+=r.z/this.inertia.z*n}probeContacts(){let t=!1,e=!1;for(const n of this.stations){if(n.kind==="structure")continue;this.tmpV.copy(n.p).applyQuaternion(this.quaternion).add(this.position);const i=this.heightAt(this.tmpV.x,this.tmpV.z),o=i<=.05;o&&n.kind==="wheel"||(o?0:i)-this.tmpV.y<=0||(o?t=!0:e=!0)}this.telemetry.onWater=t,this.telemetry.onGround=e}updateTelemetry(t){const e=this.telemetry,n=this.forward(this.tmpV);e.airspeed=this.tmpV2.copy(this.velocity).sub(this.wind).length(),e.groundSpeed=Math.hypot(this.velocity.x,this.velocity.z),e.altitude=this.position.y,e.agl=this.position.y-Math.max(0,this.heightAt(this.position.x,this.position.z)),e.verticalSpeed=this.velocity.y,e.heading=(Math.atan2(n.x,-n.z)*180/Math.PI+360)%360,e.rpm=this.rpm,e.gearDown=this.gearDown;const i=this.tmpV2.set(0,0,1).applyQuaternion(this.quaternion);e.bank=Math.asin(Qt(-i.y,-1,1)),e.pitchAngle=Math.asin(Qt(n.y,-1,1)),e.crashed=this.crashTimer>0}}function u_(){const s=document.createElement("canvas");s.width=s.height=64;const t=s.getContext("2d"),e=t.createRadialGradient(32,32,0,32,32,32);return e.addColorStop(0,"rgba(255,255,255,1)"),e.addColorStop(.4,"rgba(255,255,255,0.55)"),e.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=e,t.fillRect(0,0,64,64),new Rr(s)}class Lu{constructor(t,e,n,i,o){this.capacity=t,this.positions=new Float32Array(t*3),this.alphas=new Float32Array(t),this.sizes=new Float32Array(t),this.geo=new oe,this.geo.setAttribute("position",new _e(this.positions,3)),this.geo.setAttribute("aAlpha",new _e(this.alphas,1)),this.geo.setAttribute("aSize",new _e(this.sizes,1));const r=new Oe({uniforms:{uTex:{value:n},uColor:{value:e},uOpacity:{value:i},uScale:{value:1}},vertexShader:`
        attribute float aAlpha; attribute float aSize; varying float vAlpha;
        uniform float uScale;
        void main() { vAlpha = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / max(-mv.z, 0.5); }
      `,fragmentShader:`
        uniform sampler2D uTex; uniform vec3 uColor; uniform float uOpacity; varying float vAlpha;
        void main() { vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(uColor, t.a * vAlpha * uOpacity); }
      `,transparent:!0,depthWrite:!1,blending:o});this.points=new wx(this.geo,r),this.points.frustumCulled=!1,this.geo.setDrawRange(0,0)}points;particles=[];positions;alphas;sizes;geo;emit(t){this.particles.length>=this.capacity&&this.particles.shift(),this.particles.push(t)}clear(){this.particles.length=0,this.geo.setDrawRange(0,0)}update(t,e,n,i){this.points.material.uniforms.uScale.value=i;let o=0;for(let r=this.particles.length-1;r>=0;r--){const a=this.particles[r];if(a.age+=t,a.age>=a.life){this.particles.splice(r,1);continue}a.vy-=e*t;const l=Math.exp(-n*t);a.vx*=l,a.vy*=l,a.vz*=l,a.x+=a.vx*t,a.y+=a.vy*t,a.z+=a.vz*t,a.y<.05&&e>0&&(a.y=.05,a.vy=0);const h=a.age/a.life;this.positions[o*3]=a.x,this.positions[o*3+1]=a.y,this.positions[o*3+2]=a.z,this.alphas[o]=Math.sin(h*Math.PI)*(1-h*.5),this.sizes[o]=a.size*(.6+h*1.2),o++}this.geo.attributes.position.needsUpdate=!0,this.geo.attributes.aAlpha.needsUpdate=!0,this.geo.attributes.aSize.needsUpdate=!0,this.geo.setDrawRange(0,o)}}class d_{wakeL;wakeR;spray;exhaust;vortexL;vortexR;stampL;stampR;tmp=new C;tmp3=new C;rng=new $e("plane-effects");tmp2=new C;sprayAcc=0;exhaustAcc=0;constructor(t,e){this.wakeL=new go(70,1.6,14,1.2),this.wakeR=new go(70,1.6,14,1.2),t.add(this.wakeL.mesh,this.wakeR.mesh),this.stampL=new Ar(5.6,.74,.9),this.stampR=new Ar(5.6,.74,.9),e.add(this.stampL.mesh,this.stampR.mesh);const n=u_();this.spray=new Lu(400,new Vt(.95,.98,1),n,.75,Gi),this.exhaust=new Lu(120,new Vt(.25,.24,.23),n,.22,Gi),e.add(this.spray.points,this.exhaust.points),this.vortexL=new go(90,.5,2.2,.6,Gc),this.vortexR=new go(90,.5,2.2,.6,Gc),e.add(this.vortexL.mesh,this.vortexR.mesh)}reset(){this.wakeL.reset(),this.wakeR.reset(),this.vortexL.reset(),this.vortexR.reset(),this.spray.clear(),this.exhaust.clear(),this.stampL.mesh.visible=!1,this.stampR.mesh.visible=!1,this.sprayAcc=0,this.exhaustAcc=0,this.rng=new $e("plane-effects")}update(t,e,n,i,o){const r=t.telemetry,a=t.quaternion,l=r.groundSpeed,h=this.tmp.copy(e.floatSternL).applyQuaternion(a).add(t.position),c=this.tmp2.copy(e.floatSternR).applyQuaternion(a).add(t.position),d=r.onWater&&l>1.5;this.wakeL.update(h.x,h.z,i,d,l),this.wakeR.update(c.x,c.z,i,d,l);const u=t.forward(this.tmp3),p=Math.hypot(u.x,u.z)||1,f=.9*(1-St(6,18,l));for(const[w,y,x]of[[this.stampL,e.floatBowL,e.floatSternL],[this.stampR,e.floatBowR,e.floatSternR]]){const b=this.tmp.copy(y).add(x).multiplyScalar(.5).setX(.5*(y.x+x.x)-.1).applyQuaternion(a).add(t.position);w.update(b.x,b.z,u.x/p,u.z/p,r.onWater&&f>.02,f)}if(r.onWater&&l>4){const w=90*St(4,14,l)*(1-.5*St(25,40,l));this.sprayAcc+=w*n;const y=t.forward(new C);for(;this.sprayAcc>=1;){this.sprayAcc-=1;for(const x of[e.floatBowL,e.floatBowR]){const b=this.tmp.copy(x).applyQuaternion(a).add(t.position),M=x.z>0?1:-1,S=new C(0,0,1).applyQuaternion(a);this.spray.emit({x:b.x,y:.1,z:b.z,vx:y.x*l*.35+S.x*M*(2+this.rng.next()*3)+(this.rng.next()-.5)*2,vy:2.5+this.rng.next()*3.5+l*.08,vz:y.z*l*.35+S.z*M*(2+this.rng.next()*3)+(this.rng.next()-.5)*2,life:.7+this.rng.next()*.6,age:0,size:.6+this.rng.next()*.8})}}}if(this.spray.update(n,9.81,1.2,o*.9),r.rpm>.2){this.exhaustAcc+=(10+25*r.rpm)*n;const w=t.forward(new C);for(;this.exhaustAcc>=1;){this.exhaustAcc-=1;const y=this.tmp.copy(e.exhaustPos).applyQuaternion(a).add(t.position);this.exhaust.emit({x:y.x,y:y.y,z:y.z,vx:t.velocity.x-w.x*6+(this.rng.next()-.5),vy:t.velocity.y-1.5+this.rng.next()*1.5,vz:t.velocity.z-w.z*6+(this.rng.next()-.5),life:.35+this.rng.next()*.3,age:0,size:.35+this.rng.next()*.3})}}this.exhaust.update(n,-.3,2.5,o*.9);const v=Qt((r.alpha-.13)/.12,0,1)*St(35,55,r.airspeed),m=this.tmp.copy(e.wingTipL).applyQuaternion(a).add(t.position),g=this.tmp2.copy(e.wingTipR).applyQuaternion(a).add(t.position);this.vortexL.update(m.x,m.z,i,v>.05,r.airspeed),this.vortexR.update(g.x,g.z,i,v>.05,r.airspeed),this.vortexL.mesh.position.y=m.y,this.vortexL.mesh.updateMatrix(),this.vortexR.mesh.position.y=g.y,this.vortexR.mesh.updateMatrix(),this.vortexL.mesh.material.uniforms.uStrength.value=v*.7,this.vortexR.mesh.material.uniforms.uStrength.value=v*.7}}class f_{model=new h_;flight;effects;inputs={throttle:0,pitch:0,roll:0,yaw:0,flaps:0,brake:!1};constructor(t,e,n){this.flight=new za(t),this.effects=new d_(n,e),e.add(this.model.root)}place(t,e,n,i,o,r,a,l){this.flight.position.set(t,e,n);const h=Math.atan2(Math.cos(i),Math.sin(i)),c=new He(0,0,0,"YZX");c.set(r,h,o,"YZX"),this.flight.quaternion.setFromEuler(c);const d=new C(1,0,0).applyQuaternion(this.flight.quaternion);this.flight.velocity.copy(d).multiplyScalar(a),this.flight.omega.set(0,0,0),this.flight.rpm=l,this.inputs.throttle=l,this.flight.step(this.inputs,0),this.syncModel(),this.effects.reset()}syncModel(){this.model.root.position.copy(this.flight.position),this.model.root.quaternion.copy(this.flight.quaternion)}update(t,e,n,i,o,r,a){this.flight.wind.copy(i),this.flight.turbulence=o,a&&this.flight.step(this.inputs,t),this.syncModel();const l=this.flight.telemetry;this.model.animate(this.inputs.pitch,this.inputs.roll,this.inputs.yaw,this.inputs.flaps,l.rpm,t,e,n,l.gearDown,l,this.inputs.throttle),this.effects.update(this.flight,this.model,t,e,r)}}class p_{constructor(t){this.camera=t}mode="chase";pos=new C;vel=new C;lookTarget=new C;tmp=new C;tmp2=new C;fwd=new C;lookLift=new C(0,1.2,0);orbitQ=new Xe;euler=new He;q=new Xe;groundHeight=null;smoothQ=new Xe;time=0;initialised=!1;baseFov=50;shakeScale=.5;orbitYaw=0;orbitPitch=0;chaseDistance=25;chaseHeight=6.5;snap(){this.initialised=!1}update(t,e,n){this.time+=n;const i=this.camera,o=t.telemetry,r=o.gustLevel*this.shakeScale,a=o.buffet*this.shakeScale,l=0*this.shakeScale,h=Gt(this.time*2.3,.3)*.1*r+Gt(this.time*9.5,1.3)*.06*a+Gt(this.time*13,2.2)*.015*l,c=Gt(this.time*2.9,4.3)*.1*r+Gt(this.time*11,5.7)*.06*a+Gt(this.time*15,6.1)*.015*l,d=Gt(this.time*2.1,8.3)*.1*r+Gt(this.time*10.2,9.1)*.06*a+Gt(this.time*12,7.7)*.015*l;if(this.mode==="fixed")return;if(this.mode==="cockpit"){const _=this.tmp.copy(e.cockpitEye).applyQuaternion(t.quaternion).add(t.position);this.q.copy(t.quaternion),this.initialised||(this.smoothQ.copy(this.q),this.initialised=!0),this.smoothQ.slerp(this.q,1-Math.exp(-n*14));const E=new Xe().setFromEuler(new He(0,-Math.PI/2,0));i.quaternion.copy(this.smoothQ).multiply(E);const A=new Xe().setFromEuler(new He(-this.orbitPitch*.6,this.orbitYaw*1.2,0,"YXZ"));i.quaternion.multiply(A),_.x+=h*.15,_.y+=c*.15,_.z+=d*.15,i.position.copy(_),i.fov=this.baseFov+12,i.updateProjectionMatrix();return}const u=t.forward(this.fwd),p=Math.atan2(u.x,u.z),f=o.airspeed,v=this.chaseDistance+f*.08,m=this.chaseHeight+f*.012,g=this.orbitQ.setFromEuler(this.euler.set(this.orbitPitch,p+this.orbitYaw,0,"YXZ")),w=this.tmp2.set(0,m,-v).applyQuaternion(g).add(t.position);this.initialised||(this.pos.copy(w),this.vel.set(0,0,0),this.initialised=!0);const y=60,x=2*.9*Math.sqrt(60);w.addScaledVector(t.velocity,x/y);const b=this.tmp.copy(w).sub(this.pos).multiplyScalar(y).addScaledVector(this.vel,-x);this.vel.addScaledVector(b,n),this.pos.addScaledVector(this.vel,n);const M=Math.max(1.2,this.groundHeight?this.groundHeight(this.pos.x,this.pos.z)+2.5:1.2);this.pos.y<M&&(this.pos.y=M,this.vel.y<0&&(this.vel.y=0));const S=this.lookTarget.copy(t.position).addScaledVector(u,6).add(this.lookLift);i.position.copy(this.pos),i.position.x+=h,i.position.y+=c,i.position.z+=d,i.up.set(0,1,0),i.lookAt(S);const T=o.bank;i.rotateZ(-T*.18),i.fov=this.baseFov+St(30,90,f)*6,i.updateProjectionMatrix()}}class m_{constructor(t){this.renderer=t;const n=t.getContext().getExtension("EXT_disjoint_timer_query_webgl2");if(n&&(this.gpuExt=n),"PerformanceObserver"in window)try{new PerformanceObserver(o=>{this.longTasks+=o.getEntries().length}).observe({entryTypes:["longtask"]})}catch{}}times=[];lastStart=0;longTasks=0;gpuQuery=null;gpuExt=null;lastGpuMs=null;visibleObjects=0;beginFrame(){this.lastStart=performance.now();const t=this.renderer.getContext();this.gpuExt&&!this.gpuQuery&&(this.gpuQuery=t.createQuery(),t.beginQuery(this.gpuExt.TIME_ELAPSED_EXT,this.gpuQuery))}endFrame(){const t=performance.now()-this.lastStart;this.times.push(t),this.times.length>600&&this.times.shift();const e=this.renderer.getContext();if(this.gpuExt&&this.gpuQuery){e.endQuery(this.gpuExt.TIME_ELAPSED_EXT);const n=this.gpuQuery;setTimeout(()=>{const i=e.getQueryParameter(n,e.QUERY_RESULT_AVAILABLE),o=e.getParameter(this.gpuExt.GPU_DISJOINT_EXT);i&&!o&&(this.lastGpuMs=e.getQueryParameter(n,e.QUERY_RESULT)/1e6),e.deleteQuery(n)},0),this.gpuQuery=null}}reset(){this.times.length=0,this.longTasks=0}snapshot(){const t=this.times.slice().sort((h,c)=>h-c),e=t.length||1,n=t.reduce((h,c)=>h+c,0)/e,i=t[Math.min(t.length-1,Math.floor(t.length*.99))]??0,o=t.slice(Math.floor(t.length*.99)),r=o.length?o.reduce((h,c)=>h+c,0)/o.length:n,a=this.renderer.info,l=performance.memory;return{frames:t.length,avgMs:n,p99Ms:i,minFps:t.length?1e3/(t[t.length-1]||1):0,avgFps:n?1e3/n:0,onePercentLowFps:r?1e3/r:0,calls:a.render.calls,triangles:a.render.triangles,points:a.render.points,lines:a.render.lines,geometries:a.memory.geometries,textures:a.memory.textures,programs:a.programs?.length??0,jsHeapMB:l?l.usedJSHeapSize/1048576:null,gpuMs:this.lastGpuMs,longTasks:this.longTasks,visibleObjects:this.visibleObjects}}}const g_={low:{samples:0,shadowMapSize:1024,cascades:2,cloudSteps:10,skyScale:.35,shadowFar:1500,anisotropy:2,bloom:!0},medium:{samples:2,shadowMapSize:2048,cascades:3,cloudSteps:16,skyScale:.5,shadowFar:2500,anisotropy:4,bloom:!0},high:{samples:4,shadowMapSize:2048,cascades:3,cloudSteps:24,skyScale:.6,shadowFar:3500,anisotropy:8,bloom:!0},ultra:{samples:4,shadowMapSize:4096,cascades:4,cloudSteps:32,skyScale:1,shadowFar:5e3,anisotropy:16,bloom:!0}};class v_{constructor(t,e){this.canvas=t,this.params=e,this.quality=g_[e.quality],this.renderer=new cx({canvas:t,antialias:!1,powerPreference:"high-performance",logarithmicDepthBuffer:!0,alpha:!1,stencil:!1,preserveDrawingBuffer:!0}),this.renderer.outputColorSpace=Gs,this.renderer.toneMapping=Vi,this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=Iu,this.renderer.shadowMap.autoUpdate=!1,this.renderer.autoClear=!0,this.renderer.info.autoReset=!1,this.camera=new kn(50,16/9,.4,6e4),Ed(this.camera),this.atmos=new Vx(e.seed),e.time!==null&&(this.atmos.hour=e.time),e.weather&&this.atmos.setWeather(e.weather),this.metrics=new m_(this.renderer)}renderer;scene=new Co;camera;atmos;quality;metrics;map;textures;terrain;water;sky;wakes;csm;cascades;post;reflection;roads;bridges;city;vegetation;props;traffic;aircraft;airframeCasters=[];flightCamera;cull=new Ad;shadowPassStats=pr;width=1;height=1;time=0;envTimer=0;lastEnvHour=-1;lastEnvWeather="";litMaterials=new Set;windVec=new C;registerLit(t){if(this.litMaterials.has(t))return;this.litMaterials.add(t);const e=t.onBeforeCompile;this.csm.setupMaterial(t);const n=t.onBeforeCompile;t.onBeforeCompile=(i,o)=>{n.call(t,i,o),e?.call(t,i,o)},t.needsUpdate=!0}registerTree(t){t.traverse(e=>{const n=e.material;if(n)for(const i of Array.isArray(n)?n:[n])i.isMeshStandardMaterial&&this.registerLit(i)})}async tick(t,e,n){t(e,n),await new Promise(i=>setTimeout(i,0))}async init(t){await this.tick(t,"Surveying the coastline",.02),this.map=new o2,this.map.generate(p=>t("Shaping islands and bays",.02+p*.3)),await this.tick(t,"Uploading terrain",.33),this.textures=new v2(this.map,this.renderer);const e=this.quality;this.cascades=new sw(this.camera),this.csm=new Fx({camera:this.camera,parent:this.scene,cascades:e.cascades,maxFar:e.shadowFar,mode:"custom",customSplitsCallback:this.cascades.splitsCallback,shadowMapSize:e.shadowMapSize,lightDirection:new C(.3,-1,.2).normalize(),lightIntensity:1,shadowBias:-2e-4,lightMargin:300}),this.cascades.attach(this.csm),this.csm.fade=!0,this.params.dbg.has("cascades")&&iw(),R2(this.renderer,p=>this.csm.lights.indexOf(p)),this.sky=new g2(this.atmos,this.renderer,{cloudSteps:e.cloudSteps,scale:e.skyScale}),this.sky.dome.name="sky",this.scene.add(this.sky.dome),this.wakes=new Y2(2048,3200),this.terrain=new S2(this.textures),this.registerLit(this.terrain.material),this.terrain.group.name="terrain",this.scene.add(this.terrain.group),this.water=new q2(this.textures,this.wakes.texture),this.registerLit(this.water.material),this.water.mesh.name="water",this.scene.add(this.water.mesh);const n=Xd[this.params.quality];this.reflection=new F2(this.renderer,this.atmos,Wd[this.params.quality],n),this.reflection.exclude(this.water.mesh,this.sky.dome),this.reflection.excludeChildrenWhen(this.terrain.group,p=>N2(p)>n*1.2),this.water.attachReflection(this.reflection.uniforms),await this.tick(t,"Laying out streets",.4);const i=ow(this.map);this.roads=i.segments;const o=cw();this.registerLit(o);const r=this.params.debugRoads?new th({color:16719904}):o;for(const p of lw(this.map,this.roads,r))p.name="roads",this.scene.add(p),this.reflection.exclude(p);await this.tick(t,"Raising bridges",.46);const a=new ce({color:12104874,roughness:.9}),l=new ce({color:14278114,roughness:.4,metalness:.6});this.registerLit(a),this.registerLit(l),this.bridges=Pw(this.map,r,a,l),this.bridges.group.name="bridges",this.scene.add(this.bridges.group),this.reflection.excludeChildrenWhen(this.bridges.group,p=>p.isInstancedMesh===!0&&!p.castShadow),await this.tick(t,"Building the city",.52),this.city=Vw(this.map,i.blocksByDistrict,this.atmos.uniforms.uNight),this.registerLit(this.city.batches.material),this.city.batches.group.name="city",this.scene.add(this.city.batches.group);const h=(p,f)=>J0(p,f)>n;this.reflection.excludeChildrenWhen(this.city.batches.group,h);for(const p of this.roads){const f=Math.hypot(p.b[0]-p.a[0],p.b[1]-p.a[1]),v=Math.max(1,Math.ceil(f/10));for(let m=0;m<=v;m++)this.city.markOccupied(p.a[0]+(p.b[0]-p.a[0])*(m/v),p.a[1]+(p.b[1]-p.a[1])*(m/v),p.width*.5+3)}await this.tick(t,"Dressing harbours and airports",.66),this.props=new Ay(this.map,this.roads,this.bridges.lampPositions,this.city.markOccupied);for(const p of this.props.materials)this.registerLit(p);this.props.group.name="props",this.scene.add(this.props.group),this.reflection.excludeChildrenWhen(this.props.group,h),await this.tick(t,"Planting palms and mangroves",.74),this.vegetation=new xy(this.map,this.city.occupied);for(const p of this.vegetation.materials)this.registerLit(p);this.vegetation.group.name="vegetation",this.scene.add(this.vegetation.group),this.reflection.excludeChildrenWhen(this.vegetation.group,(p,f)=>U2(p)>64||J0(p,f)>1500),await this.tick(t,"Launching boats and traffic",.86),this.traffic=new Iy(this.map,this.roads,this.bridges.routes,this.wakes.scene,this.params.seed,this.props.mooredBoatPositions);for(const p of this.traffic.materials)this.registerLit(p);this.traffic.group.name="traffic",this.scene.add(this.traffic.group);for(const p of this.traffic.contrailMeshes)p.name="contrail",this.scene.add(p);await this.tick(t,"Pre-flighting the aircraft",.92),this.aircraft=new f_((p,f)=>this.map.heightAt(p,f),this.scene,this.wakes.scene),this.registerTree(this.aircraft.model.root),this.aircraft.model.root.traverse(p=>{p.isMesh&&p.castShadow&&this.airframeCasters.push(p)});const c=this.aircraft.effects;this.reflection.exclude(c.stampL.mesh,c.stampR.mesh,c.spray.points,c.exhaust.points,c.vortexL.mesh,c.vortexR.mesh,...this.traffic.contrailMeshes,...this.aircraft.model.interiorMeshes),this.flightCamera=new p_(this.camera),this.flightCamera.groundHeight=(p,f)=>Math.max(0,this.map.heightAt(p,f));const d=this.map.pois.find(p=>p.kind==="seaplane");this.aircraft.place(d.x+120,1.6,d.z+60,0,0,0,0,0),this.post=new tw(this.renderer,this.atmos,{samples:e.samples,bloom:e.bloom});const u=this.params.dbg;u.has("noterrain")&&(this.terrain.group.visible=!1),u.has("noshadow")&&(this.renderer.shadowMap.enabled=!1),u.has("noveg")&&(this.vegetation.group.visible=!1),u.has("nocity")&&(this.city.batches.group.visible=!1),u.has("nocloudshadow")&&(this.post.cloudShadowStrength=0,this.reflection.cloudShadowStrength=0),u.has("norefl")&&(this.reflection.enabled=!1),this.atmos.update(0),this.refreshEnvironment(),await this.tick(t,"Compiling shaders",.97),this.warmShaders(),t("Ready",1)}warmShaders(){const t=this.aircraft.flight,e={p:t.position.clone(),q:t.quaternion.clone(),v:t.velocity.clone(),w:t.omega.clone(),rpm:t.rpm,thr:this.aircraft.inputs.throttle},n=t.position.y;this.aircraft.place(t.position.x,n,t.position.z,Math.PI*.5,0,0,14,1),this.aircraft.inputs.throttle=1;const i=this.camera.position.clone(),o=this.camera.quaternion.clone();this.flightCamera.snap();for(let a=0;a<3;a++)this.update(1/30,!0),this.flightCamera.update(t,this.aircraft.model,1/30);this.render(),this.aircraft.place(t.position.x,60,t.position.z,Math.PI*.5,.05,.1,50,1),this.aircraft.inputs.throttle=1;for(let a=0;a<3;a++)this.update(1/30,!0),this.flightCamera.update(t,this.aircraft.model,1/30);this.render();const r=[];this.scene.traverse(a=>{a.visible||(a.visible=!0,r.push(a))});try{this.renderer.compile(this.scene,this.camera)}finally{for(const a of r)a.visible=!1}this.aircraft.place(e.p.x,e.p.y,e.p.z,Math.PI*.5,0,0,0,e.thr),t.quaternion.copy(e.q),t.velocity.copy(e.v),t.omega.copy(e.w),t.rpm=e.rpm,this.aircraft.syncModel(),this.camera.position.copy(i),this.camera.quaternion.copy(o),this.flightCamera.snap(),this.time=0}refreshEnvironment(){const t=this.sky.updateEnvironment();this.scene.environment=t,this.scene.environmentIntensity=this.atmos.state.ambientIntensity,this.lastEnvHour=this.atmos.hour,this.lastEnvWeather=this.atmos.weather}setSize(t,e,n=1){this.width=t,this.height=e,this.renderer.setPixelRatio(n),this.renderer.setSize(t,e,!1),this.camera.aspect=t/e,this.camera.updateProjectionMatrix(),this.post.setSize(Math.round(t*n),Math.round(e*n)),this.reflection.setSize(Math.round(t*n),Math.round(e*n)),this.csm.updateFrustums()}update(t,e=!0){this.time+=t,this.atmos.update(t);const n=this.atmos.state;this.csm.lightDirection.copy(n.sunDir).negate();const i=1-.45*St(.45,.95,this.atmos.preset.coverage);for(const r of this.csm.lights)r.intensity=n.sunIntensity,r.color.copy(n.sunColor),r.shadow.intensity=i;this.envTimer+=t,(Math.abs(this.atmos.hour-this.lastEnvHour)>.02||this.atmos.weather!==this.lastEnvWeather||this.envTimer>120)&&(this.envTimer=0,this.refreshEnvironment()),this.scene.environmentIntensity=n.ambientIntensity;const o=this.atmos.preset;this.windVec.set(this.atmos.windDir.x,0,this.atmos.windDir.y).multiplyScalar(o.windSpeed),this.vegetation.update(this.time,o.windSpeed),this.traffic.update(t,this.time,n.night),this.props.setNight(n.night),this.aircraft.update(t,this.time,n.night,this.windVec,o.turbulence,this.height,e)}render(){this.metrics.beginFrame(),this.renderer.info.reset();const t=this.camera;t.updateMatrixWorld();const e=t.position.x,n=t.position.z,i=Math.min(12e3,Math.max(this.quality.shadowFar,Math.round(t.position.y*9/250)*250)),o=this.aircraft.flight.position,r=Math.max(0,this.map.heightAt(e,n));this.cascades.updateSplits(i,o,9,r),this.cascades.fit(o.y+5),this.cull.update(t,this.csm.maxFar,this.atmos.state.sunDir),this.terrain.update(e,n),this.city.batches.shadowDistance=this.csm.maxFar,this.vegetation.shadowDistance=Math.max(1800,Math.min(3e3,this.csm.maxFar*.4)),this.vegetation.updateLod(e,n,this.cull),this.city.batches.updateLod(e,n,this.cull),this.props.updateLod(e,n,this.cull),this.traffic.updateCulling(this.cull);const a=o.y-Math.max(0,this.map.heightAt(o.x,o.z))+5,l=Vs("all",!0,this.cull.casterCascades(o,9,a));for(const h of this.airframeCasters)h.layers.mask=l;this.water.update(e,n,this.time,this.atmos.preset.windSpeed,this.atmos.windDir,this.atmos.state.sunDir,this.wakes.center,this.wakes.size),this.wakes.render(this.renderer,e,n),this.sky.render(this.renderer,t,this.post.width,this.post.height),this.renderer.shadowMap.needsUpdate=!0,this.reflection.render(this.scene,t),this.renderer.setRenderTarget(this.post.target),this.renderer.render(this.scene,t),this.post.finish(t,this.time),this.params.dbg.has("reflview")&&this.reflection.debugBlit(),this.metrics.endFrame()}}const x_=.22,w_=.15;function Jl(s,t,e){const n=Math.abs(t)<Math.abs(s)-1e-6&&(t===0||Math.sign(t)===Math.sign(s)),i=e/(n?w_:x_),o=t-s;return Math.abs(o)<=i?t:s+Math.sign(o)*i}class y_{constructor(t){this.canvas=t,window.addEventListener("keydown",e=>{e.repeat||(this.keys.add(e.code),this.pressed.add(e.code),["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)&&e.preventDefault())}),window.addEventListener("keyup",e=>this.keys.delete(e.code)),window.addEventListener("blur",()=>this.keys.clear()),t.addEventListener("mousedown",e=>{this.dragging=!0,this.lastX=e.clientX,this.lastY=e.clientY}),window.addEventListener("mouseup",()=>{this.dragging=!1}),window.addEventListener("mousemove",e=>{this.dragging&&(this.orbitYaw-=(e.clientX-this.lastX)*.006,this.orbitPitch+=(e.clientY-this.lastY)*.005,this.orbitPitch=Math.max(-1.2,Math.min(1.2,this.orbitPitch)),this.lastX=e.clientX,this.lastY=e.clientY)}),t.addEventListener("wheel",e=>{this.flight.throttle=Math.max(0,Math.min(1,this.flight.throttle-Math.sign(e.deltaY)*.05)),e.preventDefault()},{passive:!1})}keys=new Set;flight={throttle:0,pitch:0,roll:0,yaw:0,flaps:0,brake:!1};targetPitch=0;targetRoll=0;targetYaw=0;cmdPitch=0;cmdRoll=0;cmdYaw=0;orbitYaw=0;orbitPitch=0;dragging=!1;lastX=0;lastY=0;pressed=new Set;enabled=!0;down(t){return this.keys.has(t)}consume(t){const e=this.pressed.has(t);return this.pressed.delete(t),e}update(t){if(!this.enabled){this.pressed.clear();return}const e=this.flight,n=(l,h)=>(this.down(l)?1:0)-(this.down(h)?1:0);this.targetPitch=n("KeyS","KeyW")+n("ArrowDown","ArrowUp"),this.targetRoll=n("KeyD","KeyA")+n("ArrowRight","ArrowLeft"),this.targetYaw=n("KeyE","KeyQ");const i=navigator.getGamepads?navigator.getGamepads():[],o=i&&i[0];if(o){const l=h=>Math.abs(h)<.08?0:h;this.targetRoll+=l(o.axes[0]??0),this.targetPitch+=l(o.axes[1]??0),this.targetYaw+=l(o.axes[2]??0),o.buttons[7]?.value&&(e.throttle=Math.min(1,e.throttle+o.buttons[7].value*t*.8)),o.buttons[6]?.value&&(e.throttle=Math.max(0,e.throttle-o.buttons[6].value*t*.8))}const r=l=>Math.max(-1,Math.min(1,l));this.cmdPitch=Jl(this.cmdPitch,r(this.targetPitch),t),this.cmdRoll=Jl(this.cmdRoll,r(this.targetRoll),t),this.cmdYaw=Jl(this.cmdYaw,r(this.targetYaw),t);const a=1-Math.exp(-t*25);e.pitch+=(this.cmdPitch-e.pitch)*a,e.roll+=(this.cmdRoll-e.roll)*a,e.yaw+=(this.cmdYaw-e.yaw)*a,(this.down("ShiftLeft")||this.down("ShiftRight"))&&(e.throttle=Math.min(1,e.throttle+t*.55)),(this.down("ControlLeft")||this.down("ControlRight"))&&(e.throttle=Math.max(0,e.throttle-t*.55)),this.consume("KeyF")&&(e.flaps=e.flaps>.5?0:e.flaps>0?1:.5),e.brake=this.down("KeyB")||this.down("Space"),this.dragging||(this.orbitYaw*=Math.exp(-t*2.2),this.orbitPitch*=Math.exp(-t*2.2))}}const Yn=s=>document.getElementById(s);class __{root=Yn("hud");speed=Yn("hud-speed-val");alt=Yn("hud-alt-val");vs=Yn("hud-vs-val");heading=Yn("hud-heading-val");card=Yn("hud-heading-card");thrFill=Yn("hud-throttle-fill");thrVal=Yn("hud-throttle-val");rpm=Yn("hud-rpm-val");stall=Yn("hud-stall");msg=Yn("hud-msg");cam=Yn("hud-cam");time=Yn("hud-time");visible=!0;msgTimer=0;wasCrashed=!1;show(t){this.visible=t,this.root.classList.toggle("hidden",!t)}toggle(){this.show(!this.visible)}flash(t,e=2.5){this.msg.textContent=t,this.msgTimer=e}update(t,e,n,i,o){if(!this.visible)return;this.speed.textContent=Math.round(t.airspeed*1.9438).toString(),this.alt.textContent=Math.round(t.altitude*3.2808).toString();const r=Math.round(t.verticalSpeed*196.85/50)*50;this.vs.textContent=(r>0?"+":"")+r.toString();const a=Math.round(t.heading)%360;this.heading.textContent=a.toString().padStart(3,"0");const l=["N","NE","E","SE","S","SW","W","NW"];this.card.textContent=l[Math.round(a/45)%8],this.thrFill.style.width=`${Math.round(e*100)}%`,this.thrVal.textContent=`${Math.round(e*100)}%`,this.rpm.textContent=Math.round(600+t.rpm*2e3).toString(),this.stall.classList.toggle("hidden",!t.stalled),t.crashed&&!this.wasCrashed&&this.flash("Crashed — aircraft reset upright on the surface. Throttle up to go again.",5),this.wasCrashed=t.crashed,this.cam.textContent=n.toUpperCase();const h=Math.floor(i)%24,c=Math.floor(i%1*60);this.time.textContent=`${h.toString().padStart(2,"0")}:${c.toString().padStart(2,"0")}`,this.msgTimer>0&&(this.msgTimer-=o,this.msgTimer<=0&&(this.msg.textContent=""))}}const xh=[{id:"aerial-a",name:"Reference A — high aerial",description:"Reference-style wide aerial over Isla Garza looking north: causeway receding NNE, downtown skyline upper-left, boats with wakes below, aircraft lower right.",time:14.6,weather:"scattered",camera:{mode:"fixed",pos:[480,400,3720],headingDeg:-6,pitchDeg:-11,fov:42},plane:{fromCamera:{screenX:.76,screenY:.74,distance:50},headingDeg:200,pitchDeg:2,bankDeg:-24,speed:52,throttle:.75},presim:40,clipInputs:{pitch:.05,roll:-.05,yaw:0}},{id:"cockpit-city",name:"Cockpit approaching the city",description:"From the pilot seat, downtown ahead beyond the bay, instrument panel and windshield frame in view.",time:10.5,weather:"clear",camera:{mode:"cockpit",fov:50},plane:{pos:[-900,320,1400],headingDeg:342,pitchDeg:1,bankDeg:0,speed:58,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"bridge-low",name:"Low-altitude bridge flyover",description:"Chase view 45 m over the northern causeway arch, traffic on the deck, piers meeting the water.",time:15.5,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[-1950,52,-3740],headingDeg:96,pitchDeg:0,bankDeg:4,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:.05,yaw:0}},{id:"skyline-high",name:"High-altitude skyline",description:"Fixed camera 900 m up over the bay looking north-west at the downtown skyline hierarchy, port in the middle distance.",time:16.2,weather:"scattered",camera:{mode:"fixed",pos:[-300,900,-1200],headingDeg:-38,pitchDeg:-10,fov:45},plane:{fromCamera:{screenX:.72,screenY:.68,distance:70},headingDeg:-30,pitchDeg:0,bankDeg:12,speed:60,throttle:.7},presim:30,clipInputs:{pitch:0,roll:.1,yaw:0}},{id:"island-pass",name:"Coastal island pass",description:"Low along the barrier island ocean beach: hotels left, surf and shallows right, dunes and palms below.",time:11.5,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[3350,130,-2200],headingDeg:352,pitchDeg:0,bankDeg:-6,speed:52,throttle:.65},presim:30,clipInputs:{pitch:0,roll:-.05,yaw:0}},{id:"harbor",name:"Harbor and marina pass",description:"Over the port: container cranes, cruise terminal, ship channel and the downtown marina beyond.",time:9.5,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[-2100,160,-2500],headingDeg:52,pitchDeg:0,bankDeg:0,speed:50,throttle:.65},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"water-landing",name:"Seaplane water approach",description:"Final approach a few metres above the Garza channel, floats about to touch: foam, wake and spray.",time:13,weather:"clear",camera:{mode:"chase",fov:48},plane:{pos:[-500,5.5,3330],headingDeg:86,pitchDeg:4,bankDeg:0,speed:29,throttle:.25,flaps:1},presim:30,clipInputs:{pitch:.12,roll:0,yaw:0}},{id:"sunset",name:"Sunset flight",description:"Low sun in the west over the bay, downtown silhouetted, warm haze and long water reflections.",time:17.9,weather:"scattered",camera:{mode:"chase",fov:50},plane:{pos:[1400,280,600],headingDeg:262,pitchDeg:1,bankDeg:0,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"cloudy",name:"Cloudy-weather flight",description:"Heavy cumulus and grey haze over Isla Garza; softer light, cloud shadows moving across the water.",time:15,weather:"cloudy",camera:{mode:"chase",fov:50},plane:{pos:[700,300,3100],headingDeg:335,pitchDeg:0,bankDeg:0,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"night",name:"Night flight with city lights",description:"Over the bay at 22:00 looking toward downtown: lit windows, street lamps, headlights and navigation strobes.",time:22,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[-400,320,-900],headingDeg:318,pitchDeg:0,bankDeg:0,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}}];xh.push({id:"plane-rear-quarter",name:"Aircraft rear three-quarter",description:"Fixed camera 14 m from the aircraft, rear-left-above, aircraft moored at the Garza marina in sunlight.",time:14,weather:"clear",camera:{mode:"fixed",pos:[425.9,4.25,1892.3],headingDeg:205,pitchDeg:-9,fov:40},plane:{pos:[420,1.96,1905],headingDeg:240,pitchDeg:0,bankDeg:0,speed:0,throttle:0},presim:10,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"plane-front-quarter",name:"Aircraft front three-quarter",description:"Fixed camera 13 m ahead-right of the moored aircraft, low, showing cowl, propeller, windshield and floats.",time:10,weather:"clear",camera:{mode:"fixed",pos:[415.6,2.65,1917.2],headingDeg:20,pitchDeg:-3,fov:40},plane:{pos:[420,1.96,1905],headingDeg:240,pitchDeg:0,bankDeg:0,speed:0,throttle:0},presim:10,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"glass-sun",name:"Cockpit glass in direct sun",description:"Close on the windshield and left side windows with the sun behind the camera; interior visible through the glass.",time:15.5,weather:"clear",camera:{mode:"fixed",pos:[418.3,3.05,1911.3],headingDeg:15,pitchDeg:-8,fov:32},plane:{pos:[420,1.96,1905],headingDeg:240,pitchDeg:0,bankDeg:0,speed:0,throttle:0},presim:10,clipInputs:{pitch:0,roll:0,yaw:0}});function M_(s){return xh.find(t=>t.id===s)}class b_{constructor(t){this.game=t}view=null;fixedDt=1/30;frame=0;flying=!1;list(){return xh.map(t=>({id:t.id,name:t.name,description:t.description}))}setup(t){const e=M_(t);if(!e)return!1;this.view=e;const n=this.game;n.atmos.hour=e.time,n.atmos.setWeather(e.weather),n.time=0,this.placePlane(e);for(let i=0;i<Math.round(e.presim/this.fixedDt);i++)n.update(this.fixedDt,!1);return this.placePlane(e),this.setupCamera(e),n.aircraft.inputs.throttle=e.plane.throttle,n.aircraft.inputs.flaps=e.plane.flaps??0,n.aircraft.inputs.pitch=e.clipInputs.pitch,n.aircraft.inputs.roll=e.clipInputs.roll,n.aircraft.inputs.yaw=e.clipInputs.yaw,n.update(this.fixedDt,!1),this.updateCamera(this.fixedDt),this.flying=!1,this.frame=0,n.metrics.reset(),!0}placePlane(t){const e=this.game,n=t.plane;let i;if(n.fromCamera&&t.camera.pos){const r=this.fixedCamera(t),a=n.fromCamera.screenX*2-1,l=1-n.fromCamera.screenY*2,h=new C(a,l,.5).unproject(r).sub(r.position).normalize(),c=r.position.clone().addScaledVector(h,n.fromCamera.distance);i=[c.x,c.y,c.z]}else i=n.pos;const o=r=>r*Math.PI/180;e.aircraft.place(i[0],i[1],i[2],o(n.headingDeg),o(n.pitchDeg),o(n.bankDeg),n.speed,n.throttle)}fixedCamera(t){const e=new kn(t.camera.fov,this.game.camera.aspect,.4,6e4),[n,i,o]=t.camera.pos;e.position.set(n,i,o);const r=(t.camera.headingDeg??0)*Math.PI/180,a=(t.camera.pitchDeg??0)*Math.PI/180;return e.rotation.set(0,0,0),e.rotation.order="YXZ",e.rotation.y=-r,e.rotation.x=a,e.updateMatrixWorld(),e.updateProjectionMatrix(),e}setupCamera(t){const e=this.game,n=e.flightCamera;if(n.baseFov=t.camera.fov,n.orbitPitch=0,n.orbitYaw=0,t.camera.mode==="fixed"){n.mode="fixed";const i=this.fixedCamera(t);e.camera.position.copy(i.position),e.camera.quaternion.copy(i.quaternion),e.camera.fov=t.camera.fov,e.camera.updateProjectionMatrix()}else{n.mode=t.camera.mode,n.snap();for(let i=0;i<120;i++)n.update(e.aircraft.flight,e.aircraft.model,this.fixedDt)}}updateCamera(t){this.game.flightCamera.update(this.game.aircraft.flight,this.game.aircraft.model,t)}onFrame=null;step(t=1){const e=this.game;for(let n=0;n<t;n++)e.update(this.fixedDt,!0),this.updateCamera(this.fixedDt),this.frame++;this.flying=!0,this.onFrame?.(),e.render()}render(){this.game.render()}renderSync(){const t=this.game.renderer.getContext(),e=performance.now();this.game.render(),t.finish();const n=new Uint8Array(4);return t.readPixels(0,0,1,1,t.RGBA,t.UNSIGNED_BYTE,n),performance.now()-e}profile(t=20){const e=[];for(let o=0;o<t;o++)this.game.update(this.fixedDt,!0),this.updateCamera(this.fixedDt),e.push(this.renderSync());const n=e.slice().sort((o,r)=>o-r),i=n.reduce((o,r)=>o+r,0)/n.length;return{frames:t,avgMs:i,minMs:n[0],maxMs:n[n.length-1],p95Ms:n[Math.floor(n.length*.95)],onePercentLowMs:n[n.length-1]}}metrics(){const t=this.game.metrics.snapshot(),e=this.game.aircraft.flight.telemetry;return{...t,frame:this.frame,flying:this.flying,telemetry:{airspeed:e.airspeed,altitude:e.altitude,heading:e.heading,alpha:e.alpha,stalled:e.stalled,onWater:e.onWater},build:window.__build,view:this.view?.id??null,camera:{pos:this.game.camera.position.toArray(),quat:this.game.camera.quaternion.toArray(),fov:this.game.camera.fov}}}project(t,e,n){const i=new C(t,e,n).project(this.game.camera);return i.z>1?null:[(i.x+1)/2,(1-i.y)/2]}landmarks(){const t=this.game,e=t.map.bridges.find(v=>v.id==="garza-bridge"),n=e.pts[0],i=e.pts[e.pts.length-1],o=t.aircraft.flight.position,r={planeCentroid:this.project(o.x,o.y,o.z),bridgeStart:this.project(n[0],7,n[1]),bridgeEnd:this.project(i[0],7,i[1])};for(const v of t.city.landmarkPositions)r[`landmark:${v.name}`]=this.project(v.x,v.h,v.z);const a=t.map.bridges.find(v=>v.id==="tortuga-bridge");a&&(r.bridge2End=this.project(a.pts[a.pts.length-1][0],7,a.pts[a.pts.length-1][1])),r.horizonCentre=this.project(t.camera.position.x+Math.sin(0)*5e4,0,t.camera.position.z-5e4);let l=1/0,h=1/0,c=-1/0,d=-1/0;const u=new C;t.aircraft.model.root.updateMatrixWorld(!0);for(const v of t.aircraft.model.exteriorMeshes){if(!v.visible)continue;const m=v.geometry.getAttribute("position");if(m)for(let g=0;g<m.count;g++){u.fromBufferAttribute(m,g).applyMatrix4(v.matrixWorld);const w=this.project(u.x,u.y,u.z);w&&(l=Math.min(l,w[0]),h=Math.min(h,w[1]),c=Math.max(c,w[0]),d=Math.max(d,w[1]))}}Number.isFinite(l)&&(r.planeBoxMin=[l,h],r.planeBoxMax=[c,d]);const p=new C(0,0,-1).applyQuaternion(t.camera.quaternion),f=new C(p.x,0,p.z).normalize().multiplyScalar(3e4).add(t.camera.position);return r.horizon=this.project(f.x,t.camera.position.y,f.z),r}}window.__build="1b11b7f0e45c-20260905T035617Z";async function S_(){const s=qd(),t=document.getElementById("view"),e=document.getElementById("start-status"),n=document.getElementById("start-btn"),i=document.getElementById("start");n.disabled=!0;const o=new v_(t,s);window.__game=o;const r=(m,g)=>{e.textContent=`${m}… ${Math.round(g*100)}%`};await o.init(r);const a=()=>{const m=s.width??window.innerWidth,g=s.height??window.innerHeight;s.width&&(t.style.width=`${m}px`,t.style.height=`${g}px`),o.setSize(m,g,s.width?1:Math.min(window.devicePixelRatio,1.5))};window.addEventListener("resize",a),a();const l=new __,h=new y_(t),c=new b_(o);if(window.__bench=c,e.textContent=`Build ${window.__build}`,n.disabled=!1,s.bench){if(i.classList.add("hidden"),l.show(!s.noHud),!c.setup(s.bench)){e.textContent=`Unknown bench view ${s.bench}`;return}const g=document.getElementById("benchtag");g.classList.remove("hidden"),g.textContent=`${s.bench} · seed ${s.seed} · ${window.__build}`,s.noHud&&g.classList.add("hidden");const w=()=>l.update(o.aircraft.flight.telemetry,o.aircraft.inputs.throttle,o.flightCamera.mode,o.atmos.hour,1/30);c.onFrame=w;const y=()=>{c.render(),w(),window.__ready=!0,window.__benchReady=!0,s.freeze||requestAnimationFrame(y)};y();return}let d=!1;const u=()=>{d||(d=!0,i.classList.add("hidden"),l.show(!0),h.flight.flaps=1,l.flash("Takeoff: hold Shift for full throttle, keep the nose straight with A/D, and at 50 KIAS hold S to lift off. F toggles flaps, V camera shake.",9),o.aircraft.inputs.throttle=0,o.flightCamera.mode="chase",o.flightCamera.snap())};n.addEventListener("click",u),window.addEventListener("keydown",m=>{m.code==="Enter"&&!d&&u()}),s.autostart&&u();let p=performance.now(),f=0;const v=()=>{const m=performance.now();let g=s.fixedDt??Math.min(.1,(m-p)/1e3);if(p=m,s.freeze&&(g=0),h.update(g),d){const x=h.flight,b=o.aircraft.inputs;if(b.throttle=x.throttle,b.pitch=x.pitch,b.roll=x.roll,b.yaw=x.yaw,b.flaps=x.flaps,b.brake=x.brake,h.consume("KeyC")&&(o.flightCamera.mode=o.flightCamera.mode==="chase"?"cockpit":"chase",o.flightCamera.snap()),h.consume("KeyV")){const M=o.flightCamera;M.shakeScale=M.shakeScale>.25?0:.5,l.flash(M.shakeScale>0?"Camera shake on":"Camera shake off")}if(h.consume("KeyH")&&l.toggle(),h.consume("KeyT")&&(o.atmos.hour=(o.atmos.hour+2)%24,l.flash(`Time ${Math.floor(o.atmos.hour)}:00`)),h.consume("KeyY")){const M=["clear","scattered","cloudy","storm"],S=(M.indexOf(o.atmos.weather)+1)%M.length;o.atmos.setWeather(M[S]),l.flash(`Weather: ${M[S]}`)}if(h.consume("KeyR")){const M=o.map.pois.find(S=>S.kind==="seaplane");o.aircraft.place(M.x+120,1.6,M.z+60,0,0,0,0,0),x.throttle=0,o.flightCamera.snap(),l.flash("Reset to the seaplane base")}h.consume("KeyG")&&(o.aircraft.place(o.aircraft.flight.position.x,350,o.aircraft.flight.position.z,Math.PI*.5,0,0,55,.7),x.throttle=.7,l.flash("Airborne at 350 m")),o.flightCamera.orbitYaw=h.orbitYaw,o.flightCamera.orbitPitch=h.orbitPitch}f+=g;const w=1/60;let y=0;for(;f>=w&&y<8;)o.update(w,d),f-=w,y++;y===8&&(f=0),o.flightCamera.update(o.aircraft.flight,o.aircraft.model,g),o.render(),l.update(o.aircraft.flight.telemetry,o.aircraft.inputs.throttle,o.flightCamera.mode,o.atmos.hour,g),window.__ready=!0,requestAnimationFrame(v)};o.update(0,!1),o.flightCamera.update(o.aircraft.flight,o.aircraft.model,1/60),v()}S_().catch(s=>{console.error(s);const t=document.getElementById("start-status");t&&(t.textContent=`Failed to start: ${s.message}`)});
