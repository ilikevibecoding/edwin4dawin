(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const r of o.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&n(r)}).observe(document,{childList:!0,subtree:!0});function e(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(i){if(i.ep)return;i.ep=!0;const o=e(i);fetch(i.href,o)}})();const hf={low:.25,medium:.4,high:.5,ultra:.5},uf={low:2500,medium:3500,high:5e3,ultra:6e3};function df(){const s=new URLSearchParams(window.location.search),t=n=>{const i=s.get(n);if(i===null||i==="")return null;if(i.includes("/")){const[r,a]=i.split("/").map(Number);return a?r/a:null}const o=Number(i);return Number.isFinite(o)?o:null},e=s.get("quality")??"high";return{bench:s.get("bench"),seed:t("seed")??20260904,time:t("time"),weather:s.get("weather")??null,quality:["low","medium","high","ultra"].includes(e)?e:"high",freeze:s.get("freeze")==="1",fixedDt:t("dt"),noHud:s.get("nohud")==="1",width:t("w"),height:t("h"),autostart:s.get("autostart")==="1"||s.get("bench")!==null,grid:s.get("grid")==="1",debug:s.get("debug")==="1",debugRoads:s.get("debugroads")==="1",dbg:new Set((s.get("dbg")??"").split(",").filter(Boolean))}}/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const nh="170",ff=0,Gh=1,pf=2,$u=1,ju=2,Bi=3,Ki=0,An=1,nn=2,ms=0,Xi=1,Vh=2,Wh=3,Xh=4,mf=5,Us=100,gf=101,vf=102,xf=103,wf=104,yf=200,_f=201,Mf=202,bf=203,lc=204,cc=205,Sf=206,Ef=207,Af=208,Tf=209,Cf=210,Rf=211,Pf=212,Lf=213,Df=214,hc=0,uc=1,dc=2,To=3,fc=4,pc=5,mc=6,gc=7,Zu=0,If=1,zf=2,qi=0,Nf=1,Uf=2,Ff=3,kf=4,Of=5,Bf=6,Hf=7,Ku=300,Co=301,Ro=302,vc=303,xc=304,Va=306,Po=1e3,Qe=1001,wc=1002,Nn=1003,Gf=1004,Wr=1005,_e=1006,nl=1007,Vi=1008,ei=1009,Ju=1010,Qu=1011,Pr=1012,ih=1013,bi=1014,$n=1015,In=1016,sh=1017,oh=1018,Lo=1020,td=35902,ed=1021,nd=1022,En=1023,id=1024,sd=1025,So=1026,Do=1027,Lr=1028,Wa=1029,od=1030,rh=1031,ah=1033,Sa=33776,Ea=33777,Aa=33778,Ta=33779,yc=35840,_c=35841,Mc=35842,bc=35843,Sc=36196,Ec=37492,Ac=37496,Tc=37808,Cc=37809,Rc=37810,Pc=37811,Lc=37812,Dc=37813,Ic=37814,zc=37815,Nc=37816,Uc=37817,Fc=37818,kc=37819,Oc=37820,Bc=37821,Ca=36492,Hc=36494,Gc=36495,rd=36283,Vc=36284,Wc=36285,Xc=36286,Vf=3200,ad=3201,ld=0,Wf=1,wi="",Dn="srgb",Ys="srgb-linear",Xa="linear",Pe="srgb",Qs=7680,qh=519,Xf=512,qf=513,Yf=514,cd=515,$f=516,jf=517,Zf=518,Kf=519,Yh=35044,li=35048,$h="300 es",Wi=2e3,La=2001;class Oo{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){if(this._listeners===void 0)return!1;const n=this._listeners;return n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){if(this._listeners===void 0)return;const i=this._listeners[t];if(i!==void 0){const o=i.indexOf(e);o!==-1&&i.splice(o,1)}}dispatchEvent(t){if(this._listeners===void 0)return;const n=this._listeners[t.type];if(n!==void 0){t.target=this;const i=n.slice(0);for(let o=0,r=i.length;o<r;o++)i[o].call(this,t);t.target=null}}}const _n=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let jh=1234567;const Mr=Math.PI/180,Dr=180/Math.PI;function Bo(){const s=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(_n[s&255]+_n[s>>8&255]+_n[s>>16&255]+_n[s>>24&255]+"-"+_n[t&255]+_n[t>>8&255]+"-"+_n[t>>16&15|64]+_n[t>>24&255]+"-"+_n[e&63|128]+_n[e>>8&255]+"-"+_n[e>>16&255]+_n[e>>24&255]+_n[n&255]+_n[n>>8&255]+_n[n>>16&255]+_n[n>>24&255]).toLowerCase()}function Je(s,t,e){return Math.max(t,Math.min(e,s))}function lh(s,t){return(s%t+t)%t}function Jf(s,t,e,n,i){return n+(s-t)*(i-n)/(e-t)}function Qf(s,t,e){return s!==t?(e-s)/(t-s):0}function br(s,t,e){return(1-e)*s+e*t}function tp(s,t,e,n){return br(s,t,1-Math.exp(-e*n))}function ep(s,t=1){return t-Math.abs(lh(s,t*2)-t)}function np(s,t,e){return s<=t?0:s>=e?1:(s=(s-t)/(e-t),s*s*(3-2*s))}function ip(s,t,e){return s<=t?0:s>=e?1:(s=(s-t)/(e-t),s*s*s*(s*(s*6-15)+10))}function sp(s,t){return s+Math.floor(Math.random()*(t-s+1))}function op(s,t){return s+Math.random()*(t-s)}function rp(s){return s*(.5-Math.random())}function ap(s){s!==void 0&&(jh=s);let t=jh+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function lp(s){return s*Mr}function cp(s){return s*Dr}function hp(s){return(s&s-1)===0&&s!==0}function up(s){return Math.pow(2,Math.ceil(Math.log(s)/Math.LN2))}function dp(s){return Math.pow(2,Math.floor(Math.log(s)/Math.LN2))}function fp(s,t,e,n,i){const o=Math.cos,r=Math.sin,a=o(e/2),l=r(e/2),h=o((t+n)/2),c=r((t+n)/2),d=o((t-n)/2),u=r((t-n)/2),v=o((n-t)/2),p=r((n-t)/2);switch(i){case"XYX":s.set(a*c,l*d,l*u,a*h);break;case"YZY":s.set(l*u,a*c,l*d,a*h);break;case"ZXZ":s.set(l*d,l*u,a*c,a*h);break;case"XZX":s.set(a*c,l*p,l*v,a*h);break;case"YXY":s.set(l*v,a*c,l*p,a*h);break;case"ZYZ":s.set(l*p,l*v,a*c,a*h);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+i)}}function xo(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("Invalid component type.")}}function Pn(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("Invalid component type.")}}const mn={DEG2RAD:Mr,RAD2DEG:Dr,generateUUID:Bo,clamp:Je,euclideanModulo:lh,mapLinear:Jf,inverseLerp:Qf,lerp:br,damp:tp,pingpong:ep,smoothstep:np,smootherstep:ip,randInt:sp,randFloat:op,randFloatSpread:rp,seededRandom:ap,degToRad:lp,radToDeg:cp,isPowerOfTwo:hp,ceilPowerOfTwo:up,floorPowerOfTwo:dp,setQuaternionFromProperEuler:fp,normalize:Pn,denormalize:xo};class Rt{constructor(t=0,e=0){Rt.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,n=this.y,i=t.elements;return this.x=i[0]*e+i[3]*n+i[6],this.y=i[1]*e+i[4]*n+i[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(Je(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const n=Math.cos(e),i=Math.sin(e),o=this.x-t.x,r=this.y-t.y;return this.x=o*n-r*i+t.x,this.y=o*i+r*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class de{constructor(t,e,n,i,o,r,a,l,h){de.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,i,o,r,a,l,h)}set(t,e,n,i,o,r,a,l,h){const c=this.elements;return c[0]=t,c[1]=i,c[2]=a,c[3]=e,c[4]=o,c[5]=l,c[6]=n,c[7]=r,c[8]=h,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,i=e.elements,o=this.elements,r=n[0],a=n[3],l=n[6],h=n[1],c=n[4],d=n[7],u=n[2],v=n[5],p=n[8],g=i[0],f=i[3],m=i[6],y=i[1],w=i[4],x=i[7],b=i[2],M=i[5],A=i[8];return o[0]=r*g+a*y+l*b,o[3]=r*f+a*w+l*M,o[6]=r*m+a*x+l*A,o[1]=h*g+c*y+d*b,o[4]=h*f+c*w+d*M,o[7]=h*m+c*x+d*A,o[2]=u*g+v*y+p*b,o[5]=u*f+v*w+p*M,o[8]=u*m+v*x+p*A,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[1],i=t[2],o=t[3],r=t[4],a=t[5],l=t[6],h=t[7],c=t[8];return e*r*c-e*a*h-n*o*c+n*a*l+i*o*h-i*r*l}invert(){const t=this.elements,e=t[0],n=t[1],i=t[2],o=t[3],r=t[4],a=t[5],l=t[6],h=t[7],c=t[8],d=c*r-a*h,u=a*l-c*o,v=h*o-r*l,p=e*d+n*u+i*v;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);const g=1/p;return t[0]=d*g,t[1]=(i*h-c*n)*g,t[2]=(a*n-i*r)*g,t[3]=u*g,t[4]=(c*e-i*l)*g,t[5]=(i*o-a*e)*g,t[6]=v*g,t[7]=(n*l-h*e)*g,t[8]=(r*e-n*o)*g,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,i,o,r,a){const l=Math.cos(o),h=Math.sin(o);return this.set(n*l,n*h,-n*(l*r+h*a)+r+t,-i*h,i*l,-i*(-h*r+l*a)+a+e,0,0,1),this}scale(t,e){return this.premultiply(il.makeScale(t,e)),this}rotate(t){return this.premultiply(il.makeRotation(-t)),this}translate(t,e){return this.premultiply(il.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,n=t.elements;for(let i=0;i<9;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const il=new de;function hd(s){for(let t=s.length-1;t>=0;--t)if(s[t]>=65535)return!0;return!1}function Da(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function pp(){const s=Da("canvas");return s.style.display="block",s}const Zh={};function wr(s){s in Zh||(Zh[s]=!0,console.warn(s))}function mp(s,t,e){return new Promise(function(n,i){function o(){switch(s.clientWaitSync(t,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:i();break;case s.TIMEOUT_EXPIRED:setTimeout(o,e);break;default:n()}}setTimeout(o,e)})}function gp(s){const t=s.elements;t[2]=.5*t[2]+.5*t[3],t[6]=.5*t[6]+.5*t[7],t[10]=.5*t[10]+.5*t[11],t[14]=.5*t[14]+.5*t[15]}function vp(s){const t=s.elements;t[11]===-1?(t[10]=-t[10]-1,t[14]=-t[14]):(t[10]=-t[10],t[14]=-t[14]+1)}const ye={enabled:!0,workingColorSpace:Ys,spaces:{},convert:function(s,t,e){return this.enabled===!1||t===e||!t||!e||(this.spaces[t].transfer===Pe&&(s.r=Yi(s.r),s.g=Yi(s.g),s.b=Yi(s.b)),this.spaces[t].primaries!==this.spaces[e].primaries&&(s.applyMatrix3(this.spaces[t].toXYZ),s.applyMatrix3(this.spaces[e].fromXYZ)),this.spaces[e].transfer===Pe&&(s.r=Eo(s.r),s.g=Eo(s.g),s.b=Eo(s.b))),s},fromWorkingColorSpace:function(s,t){return this.convert(s,this.workingColorSpace,t)},toWorkingColorSpace:function(s,t){return this.convert(s,t,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===wi?Xa:this.spaces[s].transfer},getLuminanceCoefficients:function(s,t=this.workingColorSpace){return s.fromArray(this.spaces[t].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,t,e){return s.copy(this.spaces[t].toXYZ).multiply(this.spaces[e].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace}};function Yi(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function Eo(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}const Kh=[.64,.33,.3,.6,.15,.06],Jh=[.2126,.7152,.0722],Qh=[.3127,.329],t0=new de().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),e0=new de().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);ye.define({[Ys]:{primaries:Kh,whitePoint:Qh,transfer:Xa,toXYZ:t0,fromXYZ:e0,luminanceCoefficients:Jh,workingColorSpaceConfig:{unpackColorSpace:Dn},outputColorSpaceConfig:{drawingBufferColorSpace:Dn}},[Dn]:{primaries:Kh,whitePoint:Qh,transfer:Pe,toXYZ:t0,fromXYZ:e0,luminanceCoefficients:Jh,outputColorSpaceConfig:{drawingBufferColorSpace:Dn}}});let to;class xp{static getDataURL(t){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let e;if(t instanceof HTMLCanvasElement)e=t;else{to===void 0&&(to=Da("canvas")),to.width=t.width,to.height=t.height;const n=to.getContext("2d");t instanceof ImageData?n.putImageData(t,0,0):n.drawImage(t,0,0,t.width,t.height),e=to}return e.width>2048||e.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",t),e.toDataURL("image/jpeg",.6)):e.toDataURL("image/png")}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=Da("canvas");e.width=t.width,e.height=t.height;const n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);const i=n.getImageData(0,0,t.width,t.height),o=i.data;for(let r=0;r<o.length;r++)o[r]=Yi(o[r]/255)*255;return n.putImageData(i,0,0),e}else if(t.data){const e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Yi(e[n]/255)*255):e[n]=Yi(e[n]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let wp=0;class ud{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:wp++}),this.uuid=Bo(),this.data=t,this.dataReady=!0,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let o;if(Array.isArray(i)){o=[];for(let r=0,a=i.length;r<a;r++)i[r].isDataTexture?o.push(sl(i[r].image)):o.push(sl(i[r]))}else o=sl(i);n.url=o}return e||(t.images[this.uuid]=n),n}}function sl(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?xp.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let yp=0;class Tn extends Oo{constructor(t=Tn.DEFAULT_IMAGE,e=Tn.DEFAULT_MAPPING,n=Qe,i=Qe,o=_e,r=Vi,a=En,l=ei,h=Tn.DEFAULT_ANISOTROPY,c=wi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:yp++}),this.uuid=Bo(),this.name="",this.source=new ud(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=o,this.minFilter=r,this.anisotropy=h,this.format=a,this.internalFormat=null,this.type=l,this.offset=new Rt(0,0),this.repeat=new Rt(1,1),this.center=new Rt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new de,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=c,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Ku)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case Po:t.x=t.x-Math.floor(t.x);break;case Qe:t.x=t.x<0?0:1;break;case wc:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case Po:t.y=t.y-Math.floor(t.y);break;case Qe:t.y=t.y<0?0:1;break;case wc:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}Tn.DEFAULT_IMAGE=null;Tn.DEFAULT_MAPPING=Ku;Tn.DEFAULT_ANISOTROPY=1;class Ne{constructor(t=0,e=0,n=0,i=1){Ne.prototype.isVector4=!0,this.x=t,this.y=e,this.z=n,this.w=i}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,i){return this.x=t,this.y=e,this.z=n,this.w=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,n=this.y,i=this.z,o=this.w,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*i+r[12]*o,this.y=r[1]*e+r[5]*n+r[9]*i+r[13]*o,this.z=r[2]*e+r[6]*n+r[10]*i+r[14]*o,this.w=r[3]*e+r[7]*n+r[11]*i+r[15]*o,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,i,o;const l=t.elements,h=l[0],c=l[4],d=l[8],u=l[1],v=l[5],p=l[9],g=l[2],f=l[6],m=l[10];if(Math.abs(c-u)<.01&&Math.abs(d-g)<.01&&Math.abs(p-f)<.01){if(Math.abs(c+u)<.1&&Math.abs(d+g)<.1&&Math.abs(p+f)<.1&&Math.abs(h+v+m-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const w=(h+1)/2,x=(v+1)/2,b=(m+1)/2,M=(c+u)/4,A=(d+g)/4,S=(p+f)/4;return w>x&&w>b?w<.01?(n=0,i=.707106781,o=.707106781):(n=Math.sqrt(w),i=M/n,o=A/n):x>b?x<.01?(n=.707106781,i=0,o=.707106781):(i=Math.sqrt(x),n=M/i,o=S/i):b<.01?(n=.707106781,i=.707106781,o=0):(o=Math.sqrt(b),n=A/o,i=S/o),this.set(n,i,o,e),this}let y=Math.sqrt((f-p)*(f-p)+(d-g)*(d-g)+(u-c)*(u-c));return Math.abs(y)<.001&&(y=1),this.x=(f-p)/y,this.y=(d-g)/y,this.z=(u-c)/y,this.w=Math.acos((h+v+m-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this.w=Math.max(t.w,Math.min(e.w,this.w)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this.w=Math.max(t,Math.min(e,this.w)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class _p extends Oo{constructor(t=1,e=1,n={}){super(),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=1,this.scissor=new Ne(0,0,t,e),this.scissorTest=!1,this.viewport=new Ne(0,0,t,e);const i={width:t,height:e,depth:1};n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:_e,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},n);const o=new Tn(i,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace);o.flipY=!1,o.generateMipmaps=n.generateMipmaps,o.internalFormat=n.internalFormat,this.textures=[];const r=n.count;for(let a=0;a<r;a++)this.textures[a]=o.clone(),this.textures[a].isRenderTargetTexture=!0;this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.depthTexture=n.depthTexture,this.samples=n.samples}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let i=0,o=this.textures.length;i<o;i++)this.textures[i].image.width=t,this.textures[i].image.height=e,this.textures[i].image.depth=n;this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let n=0,i=t.textures.length;n<i;n++)this.textures[n]=t.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0;const e=Object.assign({},t.texture.image);return this.texture.source=new ud(e),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class vn extends _p{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}}class dd extends Tn{constructor(t=null,e=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=Nn,this.minFilter=Nn,this.wrapR=Qe,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class fd extends Tn{constructor(t=null,e=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=Nn,this.minFilter=Nn,this.wrapR=Qe,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Xe{constructor(t=0,e=0,n=0,i=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=i}static slerpFlat(t,e,n,i,o,r,a){let l=n[i+0],h=n[i+1],c=n[i+2],d=n[i+3];const u=o[r+0],v=o[r+1],p=o[r+2],g=o[r+3];if(a===0){t[e+0]=l,t[e+1]=h,t[e+2]=c,t[e+3]=d;return}if(a===1){t[e+0]=u,t[e+1]=v,t[e+2]=p,t[e+3]=g;return}if(d!==g||l!==u||h!==v||c!==p){let f=1-a;const m=l*u+h*v+c*p+d*g,y=m>=0?1:-1,w=1-m*m;if(w>Number.EPSILON){const b=Math.sqrt(w),M=Math.atan2(b,m*y);f=Math.sin(f*M)/b,a=Math.sin(a*M)/b}const x=a*y;if(l=l*f+u*x,h=h*f+v*x,c=c*f+p*x,d=d*f+g*x,f===1-a){const b=1/Math.sqrt(l*l+h*h+c*c+d*d);l*=b,h*=b,c*=b,d*=b}}t[e]=l,t[e+1]=h,t[e+2]=c,t[e+3]=d}static multiplyQuaternionsFlat(t,e,n,i,o,r){const a=n[i],l=n[i+1],h=n[i+2],c=n[i+3],d=o[r],u=o[r+1],v=o[r+2],p=o[r+3];return t[e]=a*p+c*d+l*v-h*u,t[e+1]=l*p+c*u+h*d-a*v,t[e+2]=h*p+c*v+a*u-l*d,t[e+3]=c*p-a*d-l*u-h*v,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,i){return this._x=t,this._y=e,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const n=t._x,i=t._y,o=t._z,r=t._order,a=Math.cos,l=Math.sin,h=a(n/2),c=a(i/2),d=a(o/2),u=l(n/2),v=l(i/2),p=l(o/2);switch(r){case"XYZ":this._x=u*c*d+h*v*p,this._y=h*v*d-u*c*p,this._z=h*c*p+u*v*d,this._w=h*c*d-u*v*p;break;case"YXZ":this._x=u*c*d+h*v*p,this._y=h*v*d-u*c*p,this._z=h*c*p-u*v*d,this._w=h*c*d+u*v*p;break;case"ZXY":this._x=u*c*d-h*v*p,this._y=h*v*d+u*c*p,this._z=h*c*p+u*v*d,this._w=h*c*d-u*v*p;break;case"ZYX":this._x=u*c*d-h*v*p,this._y=h*v*d+u*c*p,this._z=h*c*p-u*v*d,this._w=h*c*d+u*v*p;break;case"YZX":this._x=u*c*d+h*v*p,this._y=h*v*d+u*c*p,this._z=h*c*p-u*v*d,this._w=h*c*d-u*v*p;break;case"XZY":this._x=u*c*d-h*v*p,this._y=h*v*d-u*c*p,this._z=h*c*p+u*v*d,this._w=h*c*d+u*v*p;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+r)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const n=e/2,i=Math.sin(n);return this._x=t.x*i,this._y=t.y*i,this._z=t.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,n=e[0],i=e[4],o=e[8],r=e[1],a=e[5],l=e[9],h=e[2],c=e[6],d=e[10],u=n+a+d;if(u>0){const v=.5/Math.sqrt(u+1);this._w=.25/v,this._x=(c-l)*v,this._y=(o-h)*v,this._z=(r-i)*v}else if(n>a&&n>d){const v=2*Math.sqrt(1+n-a-d);this._w=(c-l)/v,this._x=.25*v,this._y=(i+r)/v,this._z=(o+h)/v}else if(a>d){const v=2*Math.sqrt(1+a-n-d);this._w=(o-h)/v,this._x=(i+r)/v,this._y=.25*v,this._z=(l+c)/v}else{const v=2*Math.sqrt(1+d-n-a);this._w=(r-i)/v,this._x=(o+h)/v,this._y=(l+c)/v,this._z=.25*v}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<Number.EPSILON?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Je(this.dot(t),-1,1)))}rotateTowards(t,e){const n=this.angleTo(t);if(n===0)return this;const i=Math.min(1,e/n);return this.slerp(t,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const n=t._x,i=t._y,o=t._z,r=t._w,a=e._x,l=e._y,h=e._z,c=e._w;return this._x=n*c+r*a+i*h-o*l,this._y=i*c+r*l+o*a-n*h,this._z=o*c+r*h+n*l-i*a,this._w=r*c-n*a-i*l-o*h,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);const n=this._x,i=this._y,o=this._z,r=this._w;let a=r*t._w+n*t._x+i*t._y+o*t._z;if(a<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,a=-a):this.copy(t),a>=1)return this._w=r,this._x=n,this._y=i,this._z=o,this;const l=1-a*a;if(l<=Number.EPSILON){const v=1-e;return this._w=v*r+e*this._w,this._x=v*n+e*this._x,this._y=v*i+e*this._y,this._z=v*o+e*this._z,this.normalize(),this}const h=Math.sqrt(l),c=Math.atan2(h,a),d=Math.sin((1-e)*c)/h,u=Math.sin(e*c)/h;return this._w=r*d+this._w*u,this._x=n*d+this._x*u,this._y=i*d+this._y*u,this._z=o*d+this._z*u,this._onChangeCallback(),this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),o=Math.sqrt(n);return this.set(i*Math.sin(t),i*Math.cos(t),o*Math.sin(e),o*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class C{constructor(t=0,e=0,n=0){C.prototype.isVector3=!0,this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(n0.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(n0.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,n=this.y,i=this.z,o=t.elements;return this.x=o[0]*e+o[3]*n+o[6]*i,this.y=o[1]*e+o[4]*n+o[7]*i,this.z=o[2]*e+o[5]*n+o[8]*i,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,n=this.y,i=this.z,o=t.elements,r=1/(o[3]*e+o[7]*n+o[11]*i+o[15]);return this.x=(o[0]*e+o[4]*n+o[8]*i+o[12])*r,this.y=(o[1]*e+o[5]*n+o[9]*i+o[13])*r,this.z=(o[2]*e+o[6]*n+o[10]*i+o[14])*r,this}applyQuaternion(t){const e=this.x,n=this.y,i=this.z,o=t.x,r=t.y,a=t.z,l=t.w,h=2*(r*i-a*n),c=2*(a*e-o*i),d=2*(o*n-r*e);return this.x=e+l*h+r*d-a*c,this.y=n+l*c+a*h-o*d,this.z=i+l*d+o*c-r*h,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,n=this.y,i=this.z,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*i,this.y=o[1]*e+o[5]*n+o[9]*i,this.z=o[2]*e+o[6]*n+o[10]*i,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const n=t.x,i=t.y,o=t.z,r=e.x,a=e.y,l=e.z;return this.x=i*l-o*a,this.y=o*r-n*l,this.z=n*a-i*r,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return ol.copy(this).projectOnVector(t),this.sub(ol)}reflect(t){return this.sub(ol.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(Je(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y,i=this.z-t.z;return e*e+n*n+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){const i=Math.sin(e)*t;return this.x=i*Math.sin(n),this.y=Math.cos(e)*t,this.z=i*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),i=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=i,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const ol=new C,n0=new Xe;class Ue{constructor(t=new C(1/0,1/0,1/0),e=new C(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(ii.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(ii.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=ii.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const n=t.geometry;if(n!==void 0){const o=n.getAttribute("position");if(e===!0&&o!==void 0&&t.isInstancedMesh!==!0)for(let r=0,a=o.count;r<a;r++)t.isMesh===!0?t.getVertexPosition(r,ii):ii.fromBufferAttribute(o,r),ii.applyMatrix4(t.matrixWorld),this.expandByPoint(ii);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Xr.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Xr.copy(n.boundingBox)),Xr.applyMatrix4(t.matrixWorld),this.union(Xr)}const i=t.children;for(let o=0,r=i.length;o<r;o++)this.expandByObject(i[o],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,ii),ii.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Ko),qr.subVectors(this.max,Ko),eo.subVectors(t.a,Ko),no.subVectors(t.b,Ko),io.subVectors(t.c,Ko),ts.subVectors(no,eo),es.subVectors(io,no),_s.subVectors(eo,io);let e=[0,-ts.z,ts.y,0,-es.z,es.y,0,-_s.z,_s.y,ts.z,0,-ts.x,es.z,0,-es.x,_s.z,0,-_s.x,-ts.y,ts.x,0,-es.y,es.x,0,-_s.y,_s.x,0];return!rl(e,eo,no,io,qr)||(e=[1,0,0,0,1,0,0,0,1],!rl(e,eo,no,io,qr))?!1:(Yr.crossVectors(ts,es),e=[Yr.x,Yr.y,Yr.z],rl(e,eo,no,io,qr))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,ii).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(ii).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Li[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Li[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Li[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Li[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Li[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Li[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Li[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Li[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Li),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}const Li=[new C,new C,new C,new C,new C,new C,new C,new C],ii=new C,Xr=new Ue,eo=new C,no=new C,io=new C,ts=new C,es=new C,_s=new C,Ko=new C,qr=new C,Yr=new C,Ms=new C;function rl(s,t,e,n,i){for(let o=0,r=s.length-3;o<=r;o+=3){Ms.fromArray(s,o);const a=i.x*Math.abs(Ms.x)+i.y*Math.abs(Ms.y)+i.z*Math.abs(Ms.z),l=t.dot(Ms),h=e.dot(Ms),c=n.dot(Ms);if(Math.max(-Math.max(l,h,c),Math.min(l,h,c))>a)return!1}return!0}const Mp=new Ue,Jo=new C,al=new C;class Le{constructor(t=new C,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const n=this.center;e!==void 0?n.copy(e):Mp.setFromPoints(t).getCenter(n);let i=0;for(let o=0,r=t.length;o<r;o++)i=Math.max(i,n.distanceToSquared(t[o]));return this.radius=Math.sqrt(i),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Jo.subVectors(t,this.center);const e=Jo.lengthSq();if(e>this.radius*this.radius){const n=Math.sqrt(e),i=(n-this.radius)*.5;this.center.addScaledVector(Jo,i/n),this.radius+=i}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(al.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Jo.copy(t.center).add(al)),this.expandByPoint(Jo.copy(t.center).sub(al))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}}const Di=new C,ll=new C,$r=new C,ns=new C,cl=new C,jr=new C,hl=new C;class pd{constructor(t=new C,e=new C(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Di)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=Di.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Di.copy(this.origin).addScaledVector(this.direction,e),Di.distanceToSquared(t))}distanceSqToSegment(t,e,n,i){ll.copy(t).add(e).multiplyScalar(.5),$r.copy(e).sub(t).normalize(),ns.copy(this.origin).sub(ll);const o=t.distanceTo(e)*.5,r=-this.direction.dot($r),a=ns.dot(this.direction),l=-ns.dot($r),h=ns.lengthSq(),c=Math.abs(1-r*r);let d,u,v,p;if(c>0)if(d=r*l-a,u=r*a-l,p=o*c,d>=0)if(u>=-p)if(u<=p){const g=1/c;d*=g,u*=g,v=d*(d+r*u+2*a)+u*(r*d+u+2*l)+h}else u=o,d=Math.max(0,-(r*u+a)),v=-d*d+u*(u+2*l)+h;else u=-o,d=Math.max(0,-(r*u+a)),v=-d*d+u*(u+2*l)+h;else u<=-p?(d=Math.max(0,-(-r*o+a)),u=d>0?-o:Math.min(Math.max(-o,-l),o),v=-d*d+u*(u+2*l)+h):u<=p?(d=0,u=Math.min(Math.max(-o,-l),o),v=u*(u+2*l)+h):(d=Math.max(0,-(r*o+a)),u=d>0?o:Math.min(Math.max(-o,-l),o),v=-d*d+u*(u+2*l)+h);else u=r>0?-o:o,d=Math.max(0,-(r*u+a)),v=-d*d+u*(u+2*l)+h;return n&&n.copy(this.origin).addScaledVector(this.direction,d),i&&i.copy(ll).addScaledVector($r,u),v}intersectSphere(t,e){Di.subVectors(t.center,this.origin);const n=Di.dot(this.direction),i=Di.dot(Di)-n*n,o=t.radius*t.radius;if(i>o)return null;const r=Math.sqrt(o-i),a=n-r,l=n+r;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){const n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,i,o,r,a,l;const h=1/this.direction.x,c=1/this.direction.y,d=1/this.direction.z,u=this.origin;return h>=0?(n=(t.min.x-u.x)*h,i=(t.max.x-u.x)*h):(n=(t.max.x-u.x)*h,i=(t.min.x-u.x)*h),c>=0?(o=(t.min.y-u.y)*c,r=(t.max.y-u.y)*c):(o=(t.max.y-u.y)*c,r=(t.min.y-u.y)*c),n>r||o>i||((o>n||isNaN(n))&&(n=o),(r<i||isNaN(i))&&(i=r),d>=0?(a=(t.min.z-u.z)*d,l=(t.max.z-u.z)*d):(a=(t.max.z-u.z)*d,l=(t.min.z-u.z)*d),n>l||a>i)||((a>n||n!==n)&&(n=a),(l<i||i!==i)&&(i=l),i<0)?null:this.at(n>=0?n:i,e)}intersectsBox(t){return this.intersectBox(t,Di)!==null}intersectTriangle(t,e,n,i,o){cl.subVectors(e,t),jr.subVectors(n,t),hl.crossVectors(cl,jr);let r=this.direction.dot(hl),a;if(r>0){if(i)return null;a=1}else if(r<0)a=-1,r=-r;else return null;ns.subVectors(this.origin,t);const l=a*this.direction.dot(jr.crossVectors(ns,jr));if(l<0)return null;const h=a*this.direction.dot(cl.cross(ns));if(h<0||l+h>r)return null;const c=-a*ns.dot(hl);return c<0?null:this.at(c/r,o)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class jt{constructor(t,e,n,i,o,r,a,l,h,c,d,u,v,p,g,f){jt.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,i,o,r,a,l,h,c,d,u,v,p,g,f)}set(t,e,n,i,o,r,a,l,h,c,d,u,v,p,g,f){const m=this.elements;return m[0]=t,m[4]=e,m[8]=n,m[12]=i,m[1]=o,m[5]=r,m[9]=a,m[13]=l,m[2]=h,m[6]=c,m[10]=d,m[14]=u,m[3]=v,m[7]=p,m[11]=g,m[15]=f,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new jt().fromArray(this.elements)}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){const e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,n=t.elements,i=1/so.setFromMatrixColumn(t,0).length(),o=1/so.setFromMatrixColumn(t,1).length(),r=1/so.setFromMatrixColumn(t,2).length();return e[0]=n[0]*i,e[1]=n[1]*i,e[2]=n[2]*i,e[3]=0,e[4]=n[4]*o,e[5]=n[5]*o,e[6]=n[6]*o,e[7]=0,e[8]=n[8]*r,e[9]=n[9]*r,e[10]=n[10]*r,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,n=t.x,i=t.y,o=t.z,r=Math.cos(n),a=Math.sin(n),l=Math.cos(i),h=Math.sin(i),c=Math.cos(o),d=Math.sin(o);if(t.order==="XYZ"){const u=r*c,v=r*d,p=a*c,g=a*d;e[0]=l*c,e[4]=-l*d,e[8]=h,e[1]=v+p*h,e[5]=u-g*h,e[9]=-a*l,e[2]=g-u*h,e[6]=p+v*h,e[10]=r*l}else if(t.order==="YXZ"){const u=l*c,v=l*d,p=h*c,g=h*d;e[0]=u+g*a,e[4]=p*a-v,e[8]=r*h,e[1]=r*d,e[5]=r*c,e[9]=-a,e[2]=v*a-p,e[6]=g+u*a,e[10]=r*l}else if(t.order==="ZXY"){const u=l*c,v=l*d,p=h*c,g=h*d;e[0]=u-g*a,e[4]=-r*d,e[8]=p+v*a,e[1]=v+p*a,e[5]=r*c,e[9]=g-u*a,e[2]=-r*h,e[6]=a,e[10]=r*l}else if(t.order==="ZYX"){const u=r*c,v=r*d,p=a*c,g=a*d;e[0]=l*c,e[4]=p*h-v,e[8]=u*h+g,e[1]=l*d,e[5]=g*h+u,e[9]=v*h-p,e[2]=-h,e[6]=a*l,e[10]=r*l}else if(t.order==="YZX"){const u=r*l,v=r*h,p=a*l,g=a*h;e[0]=l*c,e[4]=g-u*d,e[8]=p*d+v,e[1]=d,e[5]=r*c,e[9]=-a*c,e[2]=-h*c,e[6]=v*d+p,e[10]=u-g*d}else if(t.order==="XZY"){const u=r*l,v=r*h,p=a*l,g=a*h;e[0]=l*c,e[4]=-d,e[8]=h*c,e[1]=u*d+g,e[5]=r*c,e[9]=v*d-p,e[2]=p*d-v,e[6]=a*c,e[10]=g*d+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(bp,t,Sp)}lookAt(t,e,n){const i=this.elements;return Gn.subVectors(t,e),Gn.lengthSq()===0&&(Gn.z=1),Gn.normalize(),is.crossVectors(n,Gn),is.lengthSq()===0&&(Math.abs(n.z)===1?Gn.x+=1e-4:Gn.z+=1e-4,Gn.normalize(),is.crossVectors(n,Gn)),is.normalize(),Zr.crossVectors(Gn,is),i[0]=is.x,i[4]=Zr.x,i[8]=Gn.x,i[1]=is.y,i[5]=Zr.y,i[9]=Gn.y,i[2]=is.z,i[6]=Zr.z,i[10]=Gn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,i=e.elements,o=this.elements,r=n[0],a=n[4],l=n[8],h=n[12],c=n[1],d=n[5],u=n[9],v=n[13],p=n[2],g=n[6],f=n[10],m=n[14],y=n[3],w=n[7],x=n[11],b=n[15],M=i[0],A=i[4],S=i[8],_=i[12],E=i[1],T=i[5],F=i[9],k=i[13],I=i[2],O=i[6],U=i[10],P=i[14],H=i[3],G=i[7],N=i[11],Y=i[15];return o[0]=r*M+a*E+l*I+h*H,o[4]=r*A+a*T+l*O+h*G,o[8]=r*S+a*F+l*U+h*N,o[12]=r*_+a*k+l*P+h*Y,o[1]=c*M+d*E+u*I+v*H,o[5]=c*A+d*T+u*O+v*G,o[9]=c*S+d*F+u*U+v*N,o[13]=c*_+d*k+u*P+v*Y,o[2]=p*M+g*E+f*I+m*H,o[6]=p*A+g*T+f*O+m*G,o[10]=p*S+g*F+f*U+m*N,o[14]=p*_+g*k+f*P+m*Y,o[3]=y*M+w*E+x*I+b*H,o[7]=y*A+w*T+x*O+b*G,o[11]=y*S+w*F+x*U+b*N,o[15]=y*_+w*k+x*P+b*Y,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[4],i=t[8],o=t[12],r=t[1],a=t[5],l=t[9],h=t[13],c=t[2],d=t[6],u=t[10],v=t[14],p=t[3],g=t[7],f=t[11],m=t[15];return p*(+o*l*d-i*h*d-o*a*u+n*h*u+i*a*v-n*l*v)+g*(+e*l*v-e*h*u+o*r*u-i*r*v+i*h*c-o*l*c)+f*(+e*h*d-e*a*v-o*r*d+n*r*v+o*a*c-n*h*c)+m*(-i*a*c-e*l*d+e*a*u+i*r*d-n*r*u+n*l*c)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){const i=this.elements;return t.isVector3?(i[12]=t.x,i[13]=t.y,i[14]=t.z):(i[12]=t,i[13]=e,i[14]=n),this}invert(){const t=this.elements,e=t[0],n=t[1],i=t[2],o=t[3],r=t[4],a=t[5],l=t[6],h=t[7],c=t[8],d=t[9],u=t[10],v=t[11],p=t[12],g=t[13],f=t[14],m=t[15],y=d*f*h-g*u*h+g*l*v-a*f*v-d*l*m+a*u*m,w=p*u*h-c*f*h-p*l*v+r*f*v+c*l*m-r*u*m,x=c*g*h-p*d*h+p*a*v-r*g*v-c*a*m+r*d*m,b=p*d*l-c*g*l-p*a*u+r*g*u+c*a*f-r*d*f,M=e*y+n*w+i*x+o*b;if(M===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const A=1/M;return t[0]=y*A,t[1]=(g*u*o-d*f*o-g*i*v+n*f*v+d*i*m-n*u*m)*A,t[2]=(a*f*o-g*l*o+g*i*h-n*f*h-a*i*m+n*l*m)*A,t[3]=(d*l*o-a*u*o-d*i*h+n*u*h+a*i*v-n*l*v)*A,t[4]=w*A,t[5]=(c*f*o-p*u*o+p*i*v-e*f*v-c*i*m+e*u*m)*A,t[6]=(p*l*o-r*f*o-p*i*h+e*f*h+r*i*m-e*l*m)*A,t[7]=(r*u*o-c*l*o+c*i*h-e*u*h-r*i*v+e*l*v)*A,t[8]=x*A,t[9]=(p*d*o-c*g*o-p*n*v+e*g*v+c*n*m-e*d*m)*A,t[10]=(r*g*o-p*a*o+p*n*h-e*g*h-r*n*m+e*a*m)*A,t[11]=(c*a*o-r*d*o-c*n*h+e*d*h+r*n*v-e*a*v)*A,t[12]=b*A,t[13]=(c*g*i-p*d*i+p*n*u-e*g*u-c*n*f+e*d*f)*A,t[14]=(p*a*i-r*g*i-p*n*l+e*g*l+r*n*f-e*a*f)*A,t[15]=(r*d*i-c*a*i+c*n*l-e*d*l-r*n*u+e*a*u)*A,this}scale(t){const e=this.elements,n=t.x,i=t.y,o=t.z;return e[0]*=n,e[4]*=i,e[8]*=o,e[1]*=n,e[5]*=i,e[9]*=o,e[2]*=n,e[6]*=i,e[10]*=o,e[3]*=n,e[7]*=i,e[11]*=o,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],i=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,i))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const n=Math.cos(e),i=Math.sin(e),o=1-n,r=t.x,a=t.y,l=t.z,h=o*r,c=o*a;return this.set(h*r+n,h*a-i*l,h*l+i*a,0,h*a+i*l,c*a+n,c*l-i*r,0,h*l-i*a,c*l+i*r,o*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,i,o,r){return this.set(1,n,o,0,t,1,r,0,e,i,1,0,0,0,0,1),this}compose(t,e,n){const i=this.elements,o=e._x,r=e._y,a=e._z,l=e._w,h=o+o,c=r+r,d=a+a,u=o*h,v=o*c,p=o*d,g=r*c,f=r*d,m=a*d,y=l*h,w=l*c,x=l*d,b=n.x,M=n.y,A=n.z;return i[0]=(1-(g+m))*b,i[1]=(v+x)*b,i[2]=(p-w)*b,i[3]=0,i[4]=(v-x)*M,i[5]=(1-(u+m))*M,i[6]=(f+y)*M,i[7]=0,i[8]=(p+w)*A,i[9]=(f-y)*A,i[10]=(1-(u+g))*A,i[11]=0,i[12]=t.x,i[13]=t.y,i[14]=t.z,i[15]=1,this}decompose(t,e,n){const i=this.elements;let o=so.set(i[0],i[1],i[2]).length();const r=so.set(i[4],i[5],i[6]).length(),a=so.set(i[8],i[9],i[10]).length();this.determinant()<0&&(o=-o),t.x=i[12],t.y=i[13],t.z=i[14],si.copy(this);const h=1/o,c=1/r,d=1/a;return si.elements[0]*=h,si.elements[1]*=h,si.elements[2]*=h,si.elements[4]*=c,si.elements[5]*=c,si.elements[6]*=c,si.elements[8]*=d,si.elements[9]*=d,si.elements[10]*=d,e.setFromRotationMatrix(si),n.x=o,n.y=r,n.z=a,this}makePerspective(t,e,n,i,o,r,a=Wi){const l=this.elements,h=2*o/(e-t),c=2*o/(n-i),d=(e+t)/(e-t),u=(n+i)/(n-i);let v,p;if(a===Wi)v=-(r+o)/(r-o),p=-2*r*o/(r-o);else if(a===La)v=-r/(r-o),p=-r*o/(r-o);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=h,l[4]=0,l[8]=d,l[12]=0,l[1]=0,l[5]=c,l[9]=u,l[13]=0,l[2]=0,l[6]=0,l[10]=v,l[14]=p,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,n,i,o,r,a=Wi){const l=this.elements,h=1/(e-t),c=1/(n-i),d=1/(r-o),u=(e+t)*h,v=(n+i)*c;let p,g;if(a===Wi)p=(r+o)*d,g=-2*d;else if(a===La)p=o*d,g=-1*d;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=2*h,l[4]=0,l[8]=0,l[12]=-u,l[1]=0,l[5]=2*c,l[9]=0,l[13]=-v,l[2]=0,l[6]=0,l[10]=g,l[14]=-p,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){const e=this.elements,n=t.elements;for(let i=0;i<16;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}}const so=new C,si=new jt,bp=new C(0,0,0),Sp=new C(1,1,1),is=new C,Zr=new C,Gn=new C,i0=new jt,s0=new Xe;class Be{constructor(t=0,e=0,n=0,i=Be.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=i}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,i=this._order){return this._x=t,this._y=e,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){const i=t.elements,o=i[0],r=i[4],a=i[8],l=i[1],h=i[5],c=i[9],d=i[2],u=i[6],v=i[10];switch(e){case"XYZ":this._y=Math.asin(Je(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-c,v),this._z=Math.atan2(-r,o)):(this._x=Math.atan2(u,h),this._z=0);break;case"YXZ":this._x=Math.asin(-Je(c,-1,1)),Math.abs(c)<.9999999?(this._y=Math.atan2(a,v),this._z=Math.atan2(l,h)):(this._y=Math.atan2(-d,o),this._z=0);break;case"ZXY":this._x=Math.asin(Je(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,v),this._z=Math.atan2(-r,h)):(this._y=0,this._z=Math.atan2(l,o));break;case"ZYX":this._y=Math.asin(-Je(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,v),this._z=Math.atan2(l,o)):(this._x=0,this._z=Math.atan2(-r,h));break;case"YZX":this._z=Math.asin(Je(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-c,h),this._y=Math.atan2(-d,o)):(this._x=0,this._y=Math.atan2(a,v));break;case"XZY":this._z=Math.asin(-Je(r,-1,1)),Math.abs(r)<.9999999?(this._x=Math.atan2(u,h),this._y=Math.atan2(a,o)):(this._x=Math.atan2(-c,v),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return i0.makeRotationFromQuaternion(t),this.setFromRotationMatrix(i0,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return s0.setFromEuler(this),this.setFromQuaternion(s0,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Be.DEFAULT_ORDER="XYZ";class md{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let Ep=0;const o0=new C,oo=new Xe,Ii=new jt,Kr=new C,Qo=new C,Ap=new C,Tp=new Xe,r0=new C(1,0,0),a0=new C(0,1,0),l0=new C(0,0,1),c0={type:"added"},Cp={type:"removed"},ro={type:"childadded",child:null},ul={type:"childremoved",child:null};class wn extends Oo{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Ep++}),this.uuid=Bo(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=wn.DEFAULT_UP.clone();const t=new C,e=new Be,n=new Xe,i=new C(1,1,1);function o(){n.setFromEuler(e,!1)}function r(){e.setFromQuaternion(n,void 0,!1)}e._onChange(o),n._onChange(r),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new jt},normalMatrix:{value:new de}}),this.matrix=new jt,this.matrixWorld=new jt,this.matrixAutoUpdate=wn.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=wn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new md,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return oo.setFromAxisAngle(t,e),this.quaternion.multiply(oo),this}rotateOnWorldAxis(t,e){return oo.setFromAxisAngle(t,e),this.quaternion.premultiply(oo),this}rotateX(t){return this.rotateOnAxis(r0,t)}rotateY(t){return this.rotateOnAxis(a0,t)}rotateZ(t){return this.rotateOnAxis(l0,t)}translateOnAxis(t,e){return o0.copy(t).applyQuaternion(this.quaternion),this.position.add(o0.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(r0,t)}translateY(t){return this.translateOnAxis(a0,t)}translateZ(t){return this.translateOnAxis(l0,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Ii.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?Kr.copy(t):Kr.set(t,e,n);const i=this.parent;this.updateWorldMatrix(!0,!1),Qo.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Ii.lookAt(Qo,Kr,this.up):Ii.lookAt(Kr,Qo,this.up),this.quaternion.setFromRotationMatrix(Ii),i&&(Ii.extractRotation(i.matrixWorld),oo.setFromRotationMatrix(Ii),this.quaternion.premultiply(oo.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(c0),ro.child=t,this.dispatchEvent(ro),ro.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Cp),ul.child=t,this.dispatchEvent(ul),ul.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Ii.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Ii.multiply(t.parent.matrixWorld)),t.applyMatrix4(Ii),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(c0),ro.child=t,this.dispatchEvent(ro),ro.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,i=this.children.length;n<i;n++){const r=this.children[n].getObjectByProperty(t,e);if(r!==void 0)return r}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);const i=this.children;for(let o=0,r=i.length;o<r;o++)i[o].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Qo,t,Ap),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Qo,Tp,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e){const n=this.parent;if(t===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){const i=this.children;for(let o=0,r=i.length;o<r;o++)i[o].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.visibility=this._visibility,i.active=this._active,i.bounds=this._bounds.map(a=>({boxInitialized:a.boxInitialized,boxMin:a.box.min.toArray(),boxMax:a.box.max.toArray(),sphereInitialized:a.sphereInitialized,sphereRadius:a.sphere.radius,sphereCenter:a.sphere.center.toArray()})),i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.geometryCount=this._geometryCount,i.matricesTexture=this._matricesTexture.toJSON(t),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(i.boundingSphere={center:i.boundingSphere.center.toArray(),radius:i.boundingSphere.radius}),this.boundingBox!==null&&(i.boundingBox={min:i.boundingBox.min.toArray(),max:i.boundingBox.max.toArray()}));function o(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=o(t.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let h=0,c=l.length;h<c;h++){const d=l[h];o(t.shapes,d)}else o(t.shapes,l)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(o(t.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,h=this.material.length;l<h;l++)a.push(o(t.materials,this.material[l]));i.material=a}else i.material=o(t.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];i.animations.push(o(t.animations,l))}}if(e){const a=r(t.geometries),l=r(t.materials),h=r(t.textures),c=r(t.images),d=r(t.shapes),u=r(t.skeletons),v=r(t.animations),p=r(t.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),h.length>0&&(n.textures=h),c.length>0&&(n.images=c),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),v.length>0&&(n.animations=v),p.length>0&&(n.nodes=p)}return n.object=i,n;function r(a){const l=[];for(const h in a){const c=a[h];delete c.metadata,l.push(c)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){const i=t.children[n];this.add(i.clone())}return this}}wn.DEFAULT_UP=new C(0,1,0);wn.DEFAULT_MATRIX_AUTO_UPDATE=!0;wn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const oi=new C,zi=new C,dl=new C,Ni=new C,ao=new C,lo=new C,h0=new C,fl=new C,pl=new C,ml=new C,gl=new Ne,vl=new Ne,xl=new Ne;class ci{constructor(t=new C,e=new C,n=new C){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,i){i.subVectors(n,e),oi.subVectors(t,e),i.cross(oi);const o=i.lengthSq();return o>0?i.multiplyScalar(1/Math.sqrt(o)):i.set(0,0,0)}static getBarycoord(t,e,n,i,o){oi.subVectors(i,e),zi.subVectors(n,e),dl.subVectors(t,e);const r=oi.dot(oi),a=oi.dot(zi),l=oi.dot(dl),h=zi.dot(zi),c=zi.dot(dl),d=r*h-a*a;if(d===0)return o.set(0,0,0),null;const u=1/d,v=(h*l-a*c)*u,p=(r*c-a*l)*u;return o.set(1-v-p,p,v)}static containsPoint(t,e,n,i){return this.getBarycoord(t,e,n,i,Ni)===null?!1:Ni.x>=0&&Ni.y>=0&&Ni.x+Ni.y<=1}static getInterpolation(t,e,n,i,o,r,a,l){return this.getBarycoord(t,e,n,i,Ni)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(o,Ni.x),l.addScaledVector(r,Ni.y),l.addScaledVector(a,Ni.z),l)}static getInterpolatedAttribute(t,e,n,i,o,r){return gl.setScalar(0),vl.setScalar(0),xl.setScalar(0),gl.fromBufferAttribute(t,e),vl.fromBufferAttribute(t,n),xl.fromBufferAttribute(t,i),r.setScalar(0),r.addScaledVector(gl,o.x),r.addScaledVector(vl,o.y),r.addScaledVector(xl,o.z),r}static isFrontFacing(t,e,n,i){return oi.subVectors(n,e),zi.subVectors(t,e),oi.cross(zi).dot(i)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,i){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[i]),this}setFromAttributeAndIndices(t,e,n,i){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,i),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return oi.subVectors(this.c,this.b),zi.subVectors(this.a,this.b),oi.cross(zi).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return ci.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return ci.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,i,o){return ci.getInterpolation(t,this.a,this.b,this.c,e,n,i,o)}containsPoint(t){return ci.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return ci.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const n=this.a,i=this.b,o=this.c;let r,a;ao.subVectors(i,n),lo.subVectors(o,n),fl.subVectors(t,n);const l=ao.dot(fl),h=lo.dot(fl);if(l<=0&&h<=0)return e.copy(n);pl.subVectors(t,i);const c=ao.dot(pl),d=lo.dot(pl);if(c>=0&&d<=c)return e.copy(i);const u=l*d-c*h;if(u<=0&&l>=0&&c<=0)return r=l/(l-c),e.copy(n).addScaledVector(ao,r);ml.subVectors(t,o);const v=ao.dot(ml),p=lo.dot(ml);if(p>=0&&v<=p)return e.copy(o);const g=v*h-l*p;if(g<=0&&h>=0&&p<=0)return a=h/(h-p),e.copy(n).addScaledVector(lo,a);const f=c*p-v*d;if(f<=0&&d-c>=0&&v-p>=0)return h0.subVectors(o,i),a=(d-c)/(d-c+(v-p)),e.copy(i).addScaledVector(h0,a);const m=1/(f+g+u);return r=g*m,a=u*m,e.copy(n).addScaledVector(ao,r).addScaledVector(lo,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const gd={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ss={h:0,s:0,l:0},Jr={h:0,s:0,l:0};function wl(s,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?s+(t-s)*6*e:e<1/2?t:e<2/3?s+(t-s)*6*(2/3-e):s}class Ht{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){const i=t;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Dn){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,ye.toWorkingColorSpace(this,e),this}setRGB(t,e,n,i=ye.workingColorSpace){return this.r=t,this.g=e,this.b=n,ye.toWorkingColorSpace(this,i),this}setHSL(t,e,n,i=ye.workingColorSpace){if(t=lh(t,1),e=Je(e,0,1),n=Je(n,0,1),e===0)this.r=this.g=this.b=n;else{const o=n<=.5?n*(1+e):n+e-n*e,r=2*n-o;this.r=wl(r,o,t+1/3),this.g=wl(r,o,t),this.b=wl(r,o,t-1/3)}return ye.toWorkingColorSpace(this,i),this}setStyle(t,e=Dn){function n(o){o!==void 0&&parseFloat(o)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(t)){let o;const r=i[1],a=i[2];switch(r){case"rgb":case"rgba":if(o=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(o[4]),this.setRGB(Math.min(255,parseInt(o[1],10))/255,Math.min(255,parseInt(o[2],10))/255,Math.min(255,parseInt(o[3],10))/255,e);if(o=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(o[4]),this.setRGB(Math.min(100,parseInt(o[1],10))/100,Math.min(100,parseInt(o[2],10))/100,Math.min(100,parseInt(o[3],10))/100,e);break;case"hsl":case"hsla":if(o=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(o[4]),this.setHSL(parseFloat(o[1])/360,parseFloat(o[2])/100,parseFloat(o[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(t)){const o=i[1],r=o.length;if(r===3)return this.setRGB(parseInt(o.charAt(0),16)/15,parseInt(o.charAt(1),16)/15,parseInt(o.charAt(2),16)/15,e);if(r===6)return this.setHex(parseInt(o,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Dn){const n=gd[t.toLowerCase()];return n!==void 0?this.setHex(n,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Yi(t.r),this.g=Yi(t.g),this.b=Yi(t.b),this}copyLinearToSRGB(t){return this.r=Eo(t.r),this.g=Eo(t.g),this.b=Eo(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Dn){return ye.fromWorkingColorSpace(Mn.copy(this),t),Math.round(Je(Mn.r*255,0,255))*65536+Math.round(Je(Mn.g*255,0,255))*256+Math.round(Je(Mn.b*255,0,255))}getHexString(t=Dn){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=ye.workingColorSpace){ye.fromWorkingColorSpace(Mn.copy(this),e);const n=Mn.r,i=Mn.g,o=Mn.b,r=Math.max(n,i,o),a=Math.min(n,i,o);let l,h;const c=(a+r)/2;if(a===r)l=0,h=0;else{const d=r-a;switch(h=c<=.5?d/(r+a):d/(2-r-a),r){case n:l=(i-o)/d+(i<o?6:0);break;case i:l=(o-n)/d+2;break;case o:l=(n-i)/d+4;break}l/=6}return t.h=l,t.s=h,t.l=c,t}getRGB(t,e=ye.workingColorSpace){return ye.fromWorkingColorSpace(Mn.copy(this),e),t.r=Mn.r,t.g=Mn.g,t.b=Mn.b,t}getStyle(t=Dn){ye.fromWorkingColorSpace(Mn.copy(this),t);const e=Mn.r,n=Mn.g,i=Mn.b;return t!==Dn?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(t,e,n){return this.getHSL(ss),this.setHSL(ss.h+t,ss.s+e,ss.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(ss),t.getHSL(Jr);const n=br(ss.h,Jr.h,e),i=br(ss.s,Jr.s,e),o=br(ss.l,Jr.l,e);return this.setHSL(n,i,o),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,n=this.g,i=this.b,o=t.elements;return this.r=o[0]*e+o[3]*n+o[6]*i,this.g=o[1]*e+o[4]*n+o[7]*i,this.b=o[2]*e+o[5]*n+o[8]*i,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Mn=new Ht;Ht.NAMES=gd;let Rp=0;class Ho extends Oo{static get type(){return"Material"}get type(){return this.constructor.type}set type(t){}constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Rp++}),this.uuid=Bo(),this.name="",this.blending=Xi,this.side=Ki,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=lc,this.blendDst=cc,this.blendEquation=Us,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ht(0,0,0),this.blendAlpha=0,this.depthFunc=To,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=qh,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Qs,this.stencilZFail=Qs,this.stencilZPass=Qs,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const n=t[e];if(n===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}const i=this[e];if(i===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Xi&&(n.blending=this.blending),this.side!==Ki&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==lc&&(n.blendSrc=this.blendSrc),this.blendDst!==cc&&(n.blendDst=this.blendDst),this.blendEquation!==Us&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==To&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==qh&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Qs&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Qs&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Qs&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(o){const r=[];for(const a in o){const l=o[a];delete l.metadata,r.push(l)}return r}if(e){const o=i(t.textures),r=i(t.images);o.length>0&&(n.textures=o),r.length>0&&(n.images=r)}return n}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let n=null;if(e!==null){const i=e.length;n=new Array(i);for(let o=0;o!==i;++o)n[o]=e[o].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class ch extends Ho{static get type(){return"MeshBasicMaterial"}constructor(t){super(),this.isMeshBasicMaterial=!0,this.color=new Ht(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Be,this.combine=Zu,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const Gi=Pp();function Pp(){const s=new ArrayBuffer(4),t=new Float32Array(s),e=new Uint32Array(s),n=new Uint32Array(512),i=new Uint32Array(512);for(let l=0;l<256;++l){const h=l-127;h<-27?(n[l]=0,n[l|256]=32768,i[l]=24,i[l|256]=24):h<-14?(n[l]=1024>>-h-14,n[l|256]=1024>>-h-14|32768,i[l]=-h-1,i[l|256]=-h-1):h<=15?(n[l]=h+15<<10,n[l|256]=h+15<<10|32768,i[l]=13,i[l|256]=13):h<128?(n[l]=31744,n[l|256]=64512,i[l]=24,i[l|256]=24):(n[l]=31744,n[l|256]=64512,i[l]=13,i[l|256]=13)}const o=new Uint32Array(2048),r=new Uint32Array(64),a=new Uint32Array(64);for(let l=1;l<1024;++l){let h=l<<13,c=0;for(;!(h&8388608);)h<<=1,c-=8388608;h&=-8388609,c+=947912704,o[l]=h|c}for(let l=1024;l<2048;++l)o[l]=939524096+(l-1024<<13);for(let l=1;l<31;++l)r[l]=l<<23;r[31]=1199570944,r[32]=2147483648;for(let l=33;l<63;++l)r[l]=2147483648+(l-32<<23);r[63]=3347054592;for(let l=1;l<64;++l)l!==32&&(a[l]=1024);return{floatView:t,uint32View:e,baseTable:n,shiftTable:i,mantissaTable:o,exponentTable:r,offsetTable:a}}function Lp(s){Math.abs(s)>65504&&console.warn("THREE.DataUtils.toHalfFloat(): Value out of range."),s=Je(s,-65504,65504),Gi.floatView[0]=s;const t=Gi.uint32View[0],e=t>>23&511;return Gi.baseTable[e]+((t&8388607)>>Gi.shiftTable[e])}function Dp(s){const t=s>>10;return Gi.uint32View[0]=Gi.mantissaTable[Gi.offsetTable[t]+(s&1023)]+Gi.exponentTable[t],Gi.floatView[0]}const Ip={toHalfFloat:Lp,fromHalfFloat:Dp},Ze=new C,Qr=new Rt;class fe{constructor(t,e,n=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=Yh,this.updateRanges=[],this.gpuType=$n,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let i=0,o=this.itemSize;i<o;i++)this.array[t+i]=e.array[n+i];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)Qr.fromBufferAttribute(this,e),Qr.applyMatrix3(t),this.setXY(e,Qr.x,Qr.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)Ze.fromBufferAttribute(this,e),Ze.applyMatrix3(t),this.setXYZ(e,Ze.x,Ze.y,Ze.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)Ze.fromBufferAttribute(this,e),Ze.applyMatrix4(t),this.setXYZ(e,Ze.x,Ze.y,Ze.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Ze.fromBufferAttribute(this,e),Ze.applyNormalMatrix(t),this.setXYZ(e,Ze.x,Ze.y,Ze.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Ze.fromBufferAttribute(this,e),Ze.transformDirection(t),this.setXYZ(e,Ze.x,Ze.y,Ze.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=xo(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=Pn(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=xo(e,this.array)),e}setX(t,e){return this.normalized&&(e=Pn(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=xo(e,this.array)),e}setY(t,e){return this.normalized&&(e=Pn(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=xo(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Pn(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=xo(e,this.array)),e}setW(t,e){return this.normalized&&(e=Pn(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=Pn(e,this.array),n=Pn(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,i){return t*=this.itemSize,this.normalized&&(e=Pn(e,this.array),n=Pn(n,this.array),i=Pn(i,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this}setXYZW(t,e,n,i,o){return t*=this.itemSize,this.normalized&&(e=Pn(e,this.array),n=Pn(n,this.array),i=Pn(i,this.array),o=Pn(o,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this.array[t+3]=o,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==Yh&&(t.usage=this.usage),t}}class vd extends fe{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class xd extends fe{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class Mt extends fe{constructor(t,e,n){super(new Float32Array(t),e,n)}}let zp=0;const Kn=new jt,yl=new wn,co=new C,Vn=new Ue,tr=new Ue,an=new C;class oe extends Oo{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:zp++}),this.uuid=Bo(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(hd(t)?xd:vd)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const o=new de().getNormalMatrix(t);n.applyNormalMatrix(o),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(t),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return Kn.makeRotationFromQuaternion(t),this.applyMatrix4(Kn),this}rotateX(t){return Kn.makeRotationX(t),this.applyMatrix4(Kn),this}rotateY(t){return Kn.makeRotationY(t),this.applyMatrix4(Kn),this}rotateZ(t){return Kn.makeRotationZ(t),this.applyMatrix4(Kn),this}translate(t,e,n){return Kn.makeTranslation(t,e,n),this.applyMatrix4(Kn),this}scale(t,e,n){return Kn.makeScale(t,e,n),this.applyMatrix4(Kn),this}lookAt(t){return yl.lookAt(t),yl.updateMatrix(),this.applyMatrix4(yl.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(co).negate(),this.translate(co.x,co.y,co.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const n=[];for(let i=0,o=t.length;i<o;i++){const r=t[i];n.push(r.x,r.y,r.z||0)}this.setAttribute("position",new Mt(n,3))}else{for(let n=0,i=e.count;n<i;n++){const o=t[n];e.setXYZ(n,o.x,o.y,o.z||0)}t.length>e.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ue);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new C(-1/0,-1/0,-1/0),new C(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,i=e.length;n<i;n++){const o=e[n];Vn.setFromBufferAttribute(o),this.morphTargetsRelative?(an.addVectors(this.boundingBox.min,Vn.min),this.boundingBox.expandByPoint(an),an.addVectors(this.boundingBox.max,Vn.max),this.boundingBox.expandByPoint(an)):(this.boundingBox.expandByPoint(Vn.min),this.boundingBox.expandByPoint(Vn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Le);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new C,1/0);return}if(t){const n=this.boundingSphere.center;if(Vn.setFromBufferAttribute(t),e)for(let o=0,r=e.length;o<r;o++){const a=e[o];tr.setFromBufferAttribute(a),this.morphTargetsRelative?(an.addVectors(Vn.min,tr.min),Vn.expandByPoint(an),an.addVectors(Vn.max,tr.max),Vn.expandByPoint(an)):(Vn.expandByPoint(tr.min),Vn.expandByPoint(tr.max))}Vn.getCenter(n);let i=0;for(let o=0,r=t.count;o<r;o++)an.fromBufferAttribute(t,o),i=Math.max(i,n.distanceToSquared(an));if(e)for(let o=0,r=e.length;o<r;o++){const a=e[o],l=this.morphTargetsRelative;for(let h=0,c=a.count;h<c;h++)an.fromBufferAttribute(a,h),l&&(co.fromBufferAttribute(t,h),an.add(co)),i=Math.max(i,n.distanceToSquared(an))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=e.position,i=e.normal,o=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new fe(new Float32Array(4*n.count),4));const r=this.getAttribute("tangent"),a=[],l=[];for(let S=0;S<n.count;S++)a[S]=new C,l[S]=new C;const h=new C,c=new C,d=new C,u=new Rt,v=new Rt,p=new Rt,g=new C,f=new C;function m(S,_,E){h.fromBufferAttribute(n,S),c.fromBufferAttribute(n,_),d.fromBufferAttribute(n,E),u.fromBufferAttribute(o,S),v.fromBufferAttribute(o,_),p.fromBufferAttribute(o,E),c.sub(h),d.sub(h),v.sub(u),p.sub(u);const T=1/(v.x*p.y-p.x*v.y);isFinite(T)&&(g.copy(c).multiplyScalar(p.y).addScaledVector(d,-v.y).multiplyScalar(T),f.copy(d).multiplyScalar(v.x).addScaledVector(c,-p.x).multiplyScalar(T),a[S].add(g),a[_].add(g),a[E].add(g),l[S].add(f),l[_].add(f),l[E].add(f))}let y=this.groups;y.length===0&&(y=[{start:0,count:t.count}]);for(let S=0,_=y.length;S<_;++S){const E=y[S],T=E.start,F=E.count;for(let k=T,I=T+F;k<I;k+=3)m(t.getX(k+0),t.getX(k+1),t.getX(k+2))}const w=new C,x=new C,b=new C,M=new C;function A(S){b.fromBufferAttribute(i,S),M.copy(b);const _=a[S];w.copy(_),w.sub(b.multiplyScalar(b.dot(_))).normalize(),x.crossVectors(M,_);const T=x.dot(l[S])<0?-1:1;r.setXYZW(S,w.x,w.y,w.z,T)}for(let S=0,_=y.length;S<_;++S){const E=y[S],T=E.start,F=E.count;for(let k=T,I=T+F;k<I;k+=3)A(t.getX(k+0)),A(t.getX(k+1)),A(t.getX(k+2))}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new fe(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,v=n.count;u<v;u++)n.setXYZ(u,0,0,0);const i=new C,o=new C,r=new C,a=new C,l=new C,h=new C,c=new C,d=new C;if(t)for(let u=0,v=t.count;u<v;u+=3){const p=t.getX(u+0),g=t.getX(u+1),f=t.getX(u+2);i.fromBufferAttribute(e,p),o.fromBufferAttribute(e,g),r.fromBufferAttribute(e,f),c.subVectors(r,o),d.subVectors(i,o),c.cross(d),a.fromBufferAttribute(n,p),l.fromBufferAttribute(n,g),h.fromBufferAttribute(n,f),a.add(c),l.add(c),h.add(c),n.setXYZ(p,a.x,a.y,a.z),n.setXYZ(g,l.x,l.y,l.z),n.setXYZ(f,h.x,h.y,h.z)}else for(let u=0,v=e.count;u<v;u+=3)i.fromBufferAttribute(e,u+0),o.fromBufferAttribute(e,u+1),r.fromBufferAttribute(e,u+2),c.subVectors(r,o),d.subVectors(i,o),c.cross(d),n.setXYZ(u+0,c.x,c.y,c.z),n.setXYZ(u+1,c.x,c.y,c.z),n.setXYZ(u+2,c.x,c.y,c.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)an.fromBufferAttribute(t,e),an.normalize(),t.setXYZ(e,an.x,an.y,an.z)}toNonIndexed(){function t(a,l){const h=a.array,c=a.itemSize,d=a.normalized,u=new h.constructor(l.length*c);let v=0,p=0;for(let g=0,f=l.length;g<f;g++){a.isInterleavedBufferAttribute?v=l[g]*a.data.stride+a.offset:v=l[g]*c;for(let m=0;m<c;m++)u[p++]=h[v++]}return new fe(u,c,d)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new oe,n=this.index.array,i=this.attributes;for(const a in i){const l=i[a],h=t(l,n);e.setAttribute(a,h)}const o=this.morphAttributes;for(const a in o){const l=[],h=o[a];for(let c=0,d=h.length;c<d;c++){const u=h[c],v=t(u,n);l.push(v)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;const r=this.groups;for(let a=0,l=r.length;a<l;a++){const h=r[a];e.addGroup(h.start,h.count,h.materialIndex)}return e}toJSON(){const t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const h in l)l[h]!==void 0&&(t[h]=l[h]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const n=this.attributes;for(const l in n){const h=n[l];t.data.attributes[l]=h.toJSON(t.data)}const i={};let o=!1;for(const l in this.morphAttributes){const h=this.morphAttributes[l],c=[];for(let d=0,u=h.length;d<u;d++){const v=h[d];c.push(v.toJSON(t.data))}c.length>0&&(i[l]=c,o=!0)}o&&(t.data.morphAttributes=i,t.data.morphTargetsRelative=this.morphTargetsRelative);const r=this.groups;r.length>0&&(t.data.groups=JSON.parse(JSON.stringify(r)));const a=this.boundingSphere;return a!==null&&(t.data.boundingSphere={center:a.center.toArray(),radius:a.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const n=t.index;n!==null&&this.setIndex(n.clone(e));const i=t.attributes;for(const h in i){const c=i[h];this.setAttribute(h,c.clone(e))}const o=t.morphAttributes;for(const h in o){const c=[],d=o[h];for(let u=0,v=d.length;u<v;u++)c.push(d[u].clone(e));this.morphAttributes[h]=c}this.morphTargetsRelative=t.morphTargetsRelative;const r=t.groups;for(let h=0,c=r.length;h<c;h++){const d=r[h];this.addGroup(d.start,d.count,d.materialIndex)}const a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const u0=new jt,bs=new pd,ta=new Le,d0=new C,ea=new C,na=new C,ia=new C,_l=new C,sa=new C,f0=new C,oa=new C;class pe extends wn{constructor(t=new oe,e=new ch){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let o=0,r=i.length;o<r;o++){const a=i[o].name||String(o);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=o}}}}getVertexPosition(t,e){const n=this.geometry,i=n.attributes.position,o=n.morphAttributes.position,r=n.morphTargetsRelative;e.fromBufferAttribute(i,t);const a=this.morphTargetInfluences;if(o&&a){sa.set(0,0,0);for(let l=0,h=o.length;l<h;l++){const c=a[l],d=o[l];c!==0&&(_l.fromBufferAttribute(d,t),r?sa.addScaledVector(_l,c):sa.addScaledVector(_l.sub(e),c))}e.add(sa)}return e}raycast(t,e){const n=this.geometry,i=this.material,o=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),ta.copy(n.boundingSphere),ta.applyMatrix4(o),bs.copy(t.ray).recast(t.near),!(ta.containsPoint(bs.origin)===!1&&(bs.intersectSphere(ta,d0)===null||bs.origin.distanceToSquared(d0)>(t.far-t.near)**2))&&(u0.copy(o).invert(),bs.copy(t.ray).applyMatrix4(u0),!(n.boundingBox!==null&&bs.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,bs)))}_computeIntersections(t,e,n){let i;const o=this.geometry,r=this.material,a=o.index,l=o.attributes.position,h=o.attributes.uv,c=o.attributes.uv1,d=o.attributes.normal,u=o.groups,v=o.drawRange;if(a!==null)if(Array.isArray(r))for(let p=0,g=u.length;p<g;p++){const f=u[p],m=r[f.materialIndex],y=Math.max(f.start,v.start),w=Math.min(a.count,Math.min(f.start+f.count,v.start+v.count));for(let x=y,b=w;x<b;x+=3){const M=a.getX(x),A=a.getX(x+1),S=a.getX(x+2);i=ra(this,m,t,n,h,c,d,M,A,S),i&&(i.faceIndex=Math.floor(x/3),i.face.materialIndex=f.materialIndex,e.push(i))}}else{const p=Math.max(0,v.start),g=Math.min(a.count,v.start+v.count);for(let f=p,m=g;f<m;f+=3){const y=a.getX(f),w=a.getX(f+1),x=a.getX(f+2);i=ra(this,r,t,n,h,c,d,y,w,x),i&&(i.faceIndex=Math.floor(f/3),e.push(i))}}else if(l!==void 0)if(Array.isArray(r))for(let p=0,g=u.length;p<g;p++){const f=u[p],m=r[f.materialIndex],y=Math.max(f.start,v.start),w=Math.min(l.count,Math.min(f.start+f.count,v.start+v.count));for(let x=y,b=w;x<b;x+=3){const M=x,A=x+1,S=x+2;i=ra(this,m,t,n,h,c,d,M,A,S),i&&(i.faceIndex=Math.floor(x/3),i.face.materialIndex=f.materialIndex,e.push(i))}}else{const p=Math.max(0,v.start),g=Math.min(l.count,v.start+v.count);for(let f=p,m=g;f<m;f+=3){const y=f,w=f+1,x=f+2;i=ra(this,r,t,n,h,c,d,y,w,x),i&&(i.faceIndex=Math.floor(f/3),e.push(i))}}}}function Np(s,t,e,n,i,o,r,a){let l;if(t.side===An?l=n.intersectTriangle(r,o,i,!0,a):l=n.intersectTriangle(i,o,r,t.side===Ki,a),l===null)return null;oa.copy(a),oa.applyMatrix4(s.matrixWorld);const h=e.ray.origin.distanceTo(oa);return h<e.near||h>e.far?null:{distance:h,point:oa.clone(),object:s}}function ra(s,t,e,n,i,o,r,a,l,h){s.getVertexPosition(a,ea),s.getVertexPosition(l,na),s.getVertexPosition(h,ia);const c=Np(s,t,e,n,ea,na,ia,f0);if(c){const d=new C;ci.getBarycoord(f0,ea,na,ia,d),i&&(c.uv=ci.getInterpolatedAttribute(i,a,l,h,d,new Rt)),o&&(c.uv1=ci.getInterpolatedAttribute(o,a,l,h,d,new Rt)),r&&(c.normal=ci.getInterpolatedAttribute(r,a,l,h,d,new C),c.normal.dot(n.direction)>0&&c.normal.multiplyScalar(-1));const u={a,b:l,c:h,normal:new C,materialIndex:0};ci.getNormal(ea,na,ia,u.normal),c.face=u,c.barycoord=d}return c}class kt extends oe{constructor(t=1,e=1,n=1,i=1,o=1,r=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:i,heightSegments:o,depthSegments:r};const a=this;i=Math.floor(i),o=Math.floor(o),r=Math.floor(r);const l=[],h=[],c=[],d=[];let u=0,v=0;p("z","y","x",-1,-1,n,e,t,r,o,0),p("z","y","x",1,-1,n,e,-t,r,o,1),p("x","z","y",1,1,t,n,e,i,r,2),p("x","z","y",1,-1,t,n,-e,i,r,3),p("x","y","z",1,-1,t,e,n,i,o,4),p("x","y","z",-1,-1,t,e,-n,i,o,5),this.setIndex(l),this.setAttribute("position",new Mt(h,3)),this.setAttribute("normal",new Mt(c,3)),this.setAttribute("uv",new Mt(d,2));function p(g,f,m,y,w,x,b,M,A,S,_){const E=x/A,T=b/S,F=x/2,k=b/2,I=M/2,O=A+1,U=S+1;let P=0,H=0;const G=new C;for(let N=0;N<U;N++){const Y=N*T-k;for(let V=0;V<O;V++){const Q=V*E-F;G[g]=Q*y,G[f]=Y*w,G[m]=I,h.push(G.x,G.y,G.z),G[g]=0,G[f]=0,G[m]=M>0?1:-1,c.push(G.x,G.y,G.z),d.push(V/A),d.push(1-N/S),P+=1}}for(let N=0;N<S;N++)for(let Y=0;Y<A;Y++){const V=u+Y+O*N,Q=u+Y+O*(N+1),W=u+(Y+1)+O*(N+1),q=u+(Y+1)+O*N;l.push(V,Q,q),l.push(Q,W,q),H+=6}a.addGroup(v,H,_),v+=H,u+=P}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new kt(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function Io(s){const t={};for(const e in s){t[e]={};for(const n in s[e]){const i=s[e][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=i.clone():Array.isArray(i)?t[e][n]=i.slice():t[e][n]=i}}return t}function Ln(s){const t={};for(let e=0;e<s.length;e++){const n=Io(s[e]);for(const i in n)t[i]=n[i]}return t}function Up(s){const t=[];for(let e=0;e<s.length;e++)t.push(s[e].clone());return t}function wd(s){const t=s.getRenderTarget();return t===null?s.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:ye.workingColorSpace}const Fp={clone:Io,merge:Ln};var kp=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Op=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Ge extends Ho{static get type(){return"ShaderMaterial"}constructor(t){super(),this.isShaderMaterial=!0,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=kp,this.fragmentShader=Op,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=Io(t.uniforms),this.uniformsGroups=Up(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const i in this.uniforms){const r=this.uniforms[i].value;r&&r.isTexture?e.uniforms[i]={type:"t",value:r.toJSON(t).uuid}:r&&r.isColor?e.uniforms[i]={type:"c",value:r.getHex()}:r&&r.isVector2?e.uniforms[i]={type:"v2",value:r.toArray()}:r&&r.isVector3?e.uniforms[i]={type:"v3",value:r.toArray()}:r&&r.isVector4?e.uniforms[i]={type:"v4",value:r.toArray()}:r&&r.isMatrix3?e.uniforms[i]={type:"m3",value:r.toArray()}:r&&r.isMatrix4?e.uniforms[i]={type:"m4",value:r.toArray()}:e.uniforms[i]={value:r}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}}class yd extends wn{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new jt,this.projectionMatrix=new jt,this.projectionMatrixInverse=new jt,this.coordinateSystem=Wi}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const os=new C,p0=new Rt,m0=new Rt;class kn extends yd{constructor(t=50,e=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=Dr*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(Mr*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Dr*2*Math.atan(Math.tan(Mr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){os.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(os.x,os.y).multiplyScalar(-t/os.z),os.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(os.x,os.y).multiplyScalar(-t/os.z)}getViewSize(t,e){return this.getViewBounds(t,p0,m0),e.subVectors(m0,p0)}setViewOffset(t,e,n,i,o,r){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=o,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(Mr*.5*this.fov)/this.zoom,n=2*e,i=this.aspect*n,o=-.5*i;const r=this.view;if(this.view!==null&&this.view.enabled){const l=r.fullWidth,h=r.fullHeight;o+=r.offsetX*i/l,e-=r.offsetY*n/h,i*=r.width/l,n*=r.height/h}const a=this.filmOffset;a!==0&&(o+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(o,o+i,e,e-n,t,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const ho=-90,uo=1;class Bp extends wn{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new kn(ho,uo,t,e);i.layers=this.layers,this.add(i);const o=new kn(ho,uo,t,e);o.layers=this.layers,this.add(o);const r=new kn(ho,uo,t,e);r.layers=this.layers,this.add(r);const a=new kn(ho,uo,t,e);a.layers=this.layers,this.add(a);const l=new kn(ho,uo,t,e);l.layers=this.layers,this.add(l);const h=new kn(ho,uo,t,e);h.layers=this.layers,this.add(h)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[n,i,o,r,a,l]=e;for(const h of e)this.remove(h);if(t===Wi)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),o.up.set(0,0,-1),o.lookAt(0,1,0),r.up.set(0,0,1),r.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===La)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),o.up.set(0,0,1),o.lookAt(0,1,0),r.up.set(0,0,-1),r.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const h of e)this.add(h),h.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[o,r,a,l,h,c]=this.children,d=t.getRenderTarget(),u=t.getActiveCubeFace(),v=t.getActiveMipmapLevel(),p=t.xr.enabled;t.xr.enabled=!1;const g=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,t.setRenderTarget(n,0,i),t.render(e,o),t.setRenderTarget(n,1,i),t.render(e,r),t.setRenderTarget(n,2,i),t.render(e,a),t.setRenderTarget(n,3,i),t.render(e,l),t.setRenderTarget(n,4,i),t.render(e,h),n.texture.generateMipmaps=g,t.setRenderTarget(n,5,i),t.render(e,c),t.setRenderTarget(d,u,v),t.xr.enabled=p,n.texture.needsPMREMUpdate=!0}}class _d extends Tn{constructor(t,e,n,i,o,r,a,l,h,c){t=t!==void 0?t:[],e=e!==void 0?e:Co,super(t,e,n,i,o,r,a,l,h,c),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class Hp extends vn{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const n={width:t,height:t,depth:1},i=[n,n,n,n,n,n];this.texture=new _d(i,e.mapping,e.wrapS,e.wrapT,e.magFilter,e.minFilter,e.format,e.type,e.anisotropy,e.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=e.generateMipmaps!==void 0?e.generateMipmaps:!1,this.texture.minFilter=e.minFilter!==void 0?e.minFilter:_e}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},i=new kt(5,5,5),o=new Ge({name:"CubemapFromEquirect",uniforms:Io(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:An,blending:ms});o.uniforms.tEquirect.value=e;const r=new pe(i,o),a=e.minFilter;return e.minFilter===Vi&&(e.minFilter=_e),new Bp(1,10,this).update(t,r),e.minFilter=a,r.geometry.dispose(),r.material.dispose(),this}clear(t,e,n,i){const o=t.getRenderTarget();for(let r=0;r<6;r++)t.setRenderTarget(this,r),t.clear(e,n,i);t.setRenderTarget(o)}}const Ml=new C,Gp=new C,Vp=new de;class ds{constructor(t=new C(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,i){return this.normal.set(t,e,n),this.constant=i,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){const i=Ml.subVectors(n,e).cross(Gp.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(i,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const n=t.delta(Ml),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const o=-(t.start.dot(this.normal)+this.constant)/i;return o<0||o>1?null:e.copy(t.start).addScaledVector(n,o)}intersectsLine(t){const e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const n=e||Vp.getNormalMatrix(t),i=this.coplanarPoint(Ml).applyMatrix4(t),o=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(o),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Ss=new Le,aa=new C;class fs{constructor(t=new ds,e=new ds,n=new ds,i=new ds,o=new ds,r=new ds){this.planes=[t,e,n,i,o,r]}set(t,e,n,i,o,r){const a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(i),a[4].copy(o),a[5].copy(r),this}copy(t){const e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=Wi){const n=this.planes,i=t.elements,o=i[0],r=i[1],a=i[2],l=i[3],h=i[4],c=i[5],d=i[6],u=i[7],v=i[8],p=i[9],g=i[10],f=i[11],m=i[12],y=i[13],w=i[14],x=i[15];if(n[0].setComponents(l-o,u-h,f-v,x-m).normalize(),n[1].setComponents(l+o,u+h,f+v,x+m).normalize(),n[2].setComponents(l+r,u+c,f+p,x+y).normalize(),n[3].setComponents(l-r,u-c,f-p,x-y).normalize(),n[4].setComponents(l-a,u-d,f-g,x-w).normalize(),e===Wi)n[5].setComponents(l+a,u+d,f+g,x+w).normalize();else if(e===La)n[5].setComponents(a,d,g,w).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Ss.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Ss.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Ss)}intersectsSprite(t){return Ss.center.set(0,0,0),Ss.radius=.7071067811865476,Ss.applyMatrix4(t.matrixWorld),this.intersectsSphere(Ss)}intersectsSphere(t){const e=this.planes,n=t.center,i=-t.radius;for(let o=0;o<6;o++)if(e[o].distanceToPoint(n)<i)return!1;return!0}intersectsBox(t){const e=this.planes;for(let n=0;n<6;n++){const i=e[n];if(aa.x=i.normal.x>0?t.max.x:t.min.x,aa.y=i.normal.y>0?t.max.y:t.min.y,aa.z=i.normal.z>0?t.max.z:t.min.z,i.distanceToPoint(aa)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function Md(){let s=null,t=!1,e=null,n=null;function i(o,r){e(o,r),n=s.requestAnimationFrame(i)}return{start:function(){t!==!0&&e!==null&&(n=s.requestAnimationFrame(i),t=!0)},stop:function(){s.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(o){e=o},setContext:function(o){s=o}}}function Wp(s){const t=new WeakMap;function e(a,l){const h=a.array,c=a.usage,d=h.byteLength,u=s.createBuffer();s.bindBuffer(l,u),s.bufferData(l,h,c),a.onUploadCallback();let v;if(h instanceof Float32Array)v=s.FLOAT;else if(h instanceof Uint16Array)a.isFloat16BufferAttribute?v=s.HALF_FLOAT:v=s.UNSIGNED_SHORT;else if(h instanceof Int16Array)v=s.SHORT;else if(h instanceof Uint32Array)v=s.UNSIGNED_INT;else if(h instanceof Int32Array)v=s.INT;else if(h instanceof Int8Array)v=s.BYTE;else if(h instanceof Uint8Array)v=s.UNSIGNED_BYTE;else if(h instanceof Uint8ClampedArray)v=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+h);return{buffer:u,type:v,bytesPerElement:h.BYTES_PER_ELEMENT,version:a.version,size:d}}function n(a,l,h){const c=l.array,d=l.updateRanges;if(s.bindBuffer(h,a),d.length===0)s.bufferSubData(h,0,c);else{d.sort((v,p)=>v.start-p.start);let u=0;for(let v=1;v<d.length;v++){const p=d[u],g=d[v];g.start<=p.start+p.count+1?p.count=Math.max(p.count,g.start+g.count-p.start):(++u,d[u]=g)}d.length=u+1;for(let v=0,p=d.length;v<p;v++){const g=d[v];s.bufferSubData(h,g.start*c.BYTES_PER_ELEMENT,c,g.start,g.count)}l.clearUpdateRanges()}l.onUploadCallback()}function i(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function o(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=t.get(a);l&&(s.deleteBuffer(l.buffer),t.delete(a))}function r(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const c=t.get(a);(!c||c.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const h=t.get(a);if(h===void 0)t.set(a,e(a,l));else if(h.version<a.version){if(h.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(h.buffer,a,l),h.version=a.version}}return{get:i,remove:o,update:r}}class Si extends oe{constructor(t=1,e=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:i};const o=t/2,r=e/2,a=Math.floor(n),l=Math.floor(i),h=a+1,c=l+1,d=t/a,u=e/l,v=[],p=[],g=[],f=[];for(let m=0;m<c;m++){const y=m*u-r;for(let w=0;w<h;w++){const x=w*d-o;p.push(x,-y,0),g.push(0,0,1),f.push(w/a),f.push(1-m/l)}}for(let m=0;m<l;m++)for(let y=0;y<a;y++){const w=y+h*m,x=y+h*(m+1),b=y+1+h*(m+1),M=y+1+h*m;v.push(w,x,M),v.push(x,b,M)}this.setIndex(v),this.setAttribute("position",new Mt(p,3)),this.setAttribute("normal",new Mt(g,3)),this.setAttribute("uv",new Mt(f,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Si(t.width,t.height,t.widthSegments,t.heightSegments)}}var Xp=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,qp=`#ifdef USE_ALPHAHASH
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
#endif`,Yp=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,$p=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,jp=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Zp=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Kp=`#ifdef USE_AOMAP
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
#endif`,Jp=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Qp=`#ifdef USE_BATCHING
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
#endif`,tm=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,em=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,nm=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,im=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,sm=`#ifdef USE_IRIDESCENCE
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
#endif`,om=`#ifdef USE_BUMPMAP
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
#endif`,rm=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,am=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,lm=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,cm=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,hm=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,um=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,dm=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,fm=`#if defined( USE_COLOR_ALPHA )
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
#endif`,pm=`#define PI 3.141592653589793
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
} // validated`,mm=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,gm=`vec3 transformedNormal = objectNormal;
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
#endif`,vm=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,xm=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,wm=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,ym=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,_m="gl_FragColor = linearToOutputTexel( gl_FragColor );",Mm=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,bm=`#ifdef USE_ENVMAP
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
#endif`,Sm=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Em=`#ifdef USE_ENVMAP
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
#endif`,Am=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Tm=`#ifdef USE_ENVMAP
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
#endif`,Cm=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Rm=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Pm=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Lm=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Dm=`#ifdef USE_GRADIENTMAP
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
}`,Im=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,zm=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Nm=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Um=`uniform bool receiveShadow;
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
#endif`,Fm=`#ifdef USE_ENVMAP
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
#endif`,km=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Om=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Bm=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Hm=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Gm=`PhysicalMaterial material;
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
#endif`,Vm=`struct PhysicalMaterial {
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
}`,Wm=`
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
#endif`,Xm=`#if defined( RE_IndirectDiffuse )
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
#endif`,qm=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Ym=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,$m=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,jm=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Zm=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Km=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Jm=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Qm=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,tg=`#if defined( USE_POINTS_UV )
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
#endif`,eg=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,ng=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,ig=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,sg=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,og=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,rg=`#ifdef USE_MORPHTARGETS
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
#endif`,ag=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,lg=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,cg=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,hg=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,ug=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,dg=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,fg=`#ifdef USE_NORMALMAP
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
#endif`,pg=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,mg=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,gg=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,vg=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,xg=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,wg=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,yg=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,_g=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Mg=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,bg=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Sg=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Eg=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Ag=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Tg=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Cg=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,Rg=`float getShadowMask() {
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
}`,Pg=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Lg=`#ifdef USE_SKINNING
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
#endif`,Dg=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Ig=`#ifdef USE_SKINNING
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
#endif`,zg=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Ng=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Ug=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Fg=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,kg=`#ifdef USE_TRANSMISSION
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
#endif`,Og=`#ifdef USE_TRANSMISSION
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
#endif`,Bg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Hg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Gg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Vg=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Wg=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Xg=`uniform sampler2D t2D;
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
}`,qg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Yg=`#ifdef ENVMAP_TYPE_CUBE
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
}`,$g=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,jg=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Zg=`#include <common>
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
}`,Kg=`#if DEPTH_PACKING == 3200
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
}`,Jg=`#define DISTANCE
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
}`,Qg=`#define DISTANCE
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
}`,t1=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,e1=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,n1=`uniform float scale;
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
}`,i1=`uniform vec3 diffuse;
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
}`,s1=`#include <common>
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
}`,o1=`uniform vec3 diffuse;
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
}`,r1=`#define LAMBERT
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
}`,a1=`#define LAMBERT
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
}`,l1=`#define MATCAP
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
}`,c1=`#define MATCAP
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
}`,h1=`#define NORMAL
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
}`,u1=`#define NORMAL
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
}`,d1=`#define PHONG
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
}`,f1=`#define PHONG
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
}`,p1=`#define STANDARD
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
}`,m1=`#define STANDARD
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
}`,g1=`#define TOON
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
}`,v1=`#define TOON
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
}`,x1=`uniform float size;
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
}`,w1=`uniform vec3 diffuse;
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
}`,y1=`#include <common>
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
}`,_1=`uniform vec3 color;
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
}`,M1=`uniform float rotation;
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
}`,b1=`uniform vec3 diffuse;
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
}`,ae={alphahash_fragment:Xp,alphahash_pars_fragment:qp,alphamap_fragment:Yp,alphamap_pars_fragment:$p,alphatest_fragment:jp,alphatest_pars_fragment:Zp,aomap_fragment:Kp,aomap_pars_fragment:Jp,batching_pars_vertex:Qp,batching_vertex:tm,begin_vertex:em,beginnormal_vertex:nm,bsdfs:im,iridescence_fragment:sm,bumpmap_pars_fragment:om,clipping_planes_fragment:rm,clipping_planes_pars_fragment:am,clipping_planes_pars_vertex:lm,clipping_planes_vertex:cm,color_fragment:hm,color_pars_fragment:um,color_pars_vertex:dm,color_vertex:fm,common:pm,cube_uv_reflection_fragment:mm,defaultnormal_vertex:gm,displacementmap_pars_vertex:vm,displacementmap_vertex:xm,emissivemap_fragment:wm,emissivemap_pars_fragment:ym,colorspace_fragment:_m,colorspace_pars_fragment:Mm,envmap_fragment:bm,envmap_common_pars_fragment:Sm,envmap_pars_fragment:Em,envmap_pars_vertex:Am,envmap_physical_pars_fragment:Fm,envmap_vertex:Tm,fog_vertex:Cm,fog_pars_vertex:Rm,fog_fragment:Pm,fog_pars_fragment:Lm,gradientmap_pars_fragment:Dm,lightmap_pars_fragment:Im,lights_lambert_fragment:zm,lights_lambert_pars_fragment:Nm,lights_pars_begin:Um,lights_toon_fragment:km,lights_toon_pars_fragment:Om,lights_phong_fragment:Bm,lights_phong_pars_fragment:Hm,lights_physical_fragment:Gm,lights_physical_pars_fragment:Vm,lights_fragment_begin:Wm,lights_fragment_maps:Xm,lights_fragment_end:qm,logdepthbuf_fragment:Ym,logdepthbuf_pars_fragment:$m,logdepthbuf_pars_vertex:jm,logdepthbuf_vertex:Zm,map_fragment:Km,map_pars_fragment:Jm,map_particle_fragment:Qm,map_particle_pars_fragment:tg,metalnessmap_fragment:eg,metalnessmap_pars_fragment:ng,morphinstance_vertex:ig,morphcolor_vertex:sg,morphnormal_vertex:og,morphtarget_pars_vertex:rg,morphtarget_vertex:ag,normal_fragment_begin:lg,normal_fragment_maps:cg,normal_pars_fragment:hg,normal_pars_vertex:ug,normal_vertex:dg,normalmap_pars_fragment:fg,clearcoat_normal_fragment_begin:pg,clearcoat_normal_fragment_maps:mg,clearcoat_pars_fragment:gg,iridescence_pars_fragment:vg,opaque_fragment:xg,packing:wg,premultiplied_alpha_fragment:yg,project_vertex:_g,dithering_fragment:Mg,dithering_pars_fragment:bg,roughnessmap_fragment:Sg,roughnessmap_pars_fragment:Eg,shadowmap_pars_fragment:Ag,shadowmap_pars_vertex:Tg,shadowmap_vertex:Cg,shadowmask_pars_fragment:Rg,skinbase_vertex:Pg,skinning_pars_vertex:Lg,skinning_vertex:Dg,skinnormal_vertex:Ig,specularmap_fragment:zg,specularmap_pars_fragment:Ng,tonemapping_fragment:Ug,tonemapping_pars_fragment:Fg,transmission_fragment:kg,transmission_pars_fragment:Og,uv_pars_fragment:Bg,uv_pars_vertex:Hg,uv_vertex:Gg,worldpos_vertex:Vg,background_vert:Wg,background_frag:Xg,backgroundCube_vert:qg,backgroundCube_frag:Yg,cube_vert:$g,cube_frag:jg,depth_vert:Zg,depth_frag:Kg,distanceRGBA_vert:Jg,distanceRGBA_frag:Qg,equirect_vert:t1,equirect_frag:e1,linedashed_vert:n1,linedashed_frag:i1,meshbasic_vert:s1,meshbasic_frag:o1,meshlambert_vert:r1,meshlambert_frag:a1,meshmatcap_vert:l1,meshmatcap_frag:c1,meshnormal_vert:h1,meshnormal_frag:u1,meshphong_vert:d1,meshphong_frag:f1,meshphysical_vert:p1,meshphysical_frag:m1,meshtoon_vert:g1,meshtoon_frag:v1,points_vert:x1,points_frag:w1,shadow_vert:y1,shadow_frag:_1,sprite_vert:M1,sprite_frag:b1},Ut={common:{diffuse:{value:new Ht(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new de},alphaMap:{value:null},alphaMapTransform:{value:new de},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new de}},envmap:{envMap:{value:null},envMapRotation:{value:new de},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new de}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new de}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new de},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new de},normalScale:{value:new Rt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new de},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new de}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new de}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new de}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ht(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ht(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new de},alphaTest:{value:0},uvTransform:{value:new de}},sprite:{diffuse:{value:new Ht(16777215)},opacity:{value:1},center:{value:new Rt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new de},alphaMap:{value:null},alphaMapTransform:{value:new de},alphaTest:{value:0}}},vi={basic:{uniforms:Ln([Ut.common,Ut.specularmap,Ut.envmap,Ut.aomap,Ut.lightmap,Ut.fog]),vertexShader:ae.meshbasic_vert,fragmentShader:ae.meshbasic_frag},lambert:{uniforms:Ln([Ut.common,Ut.specularmap,Ut.envmap,Ut.aomap,Ut.lightmap,Ut.emissivemap,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.fog,Ut.lights,{emissive:{value:new Ht(0)}}]),vertexShader:ae.meshlambert_vert,fragmentShader:ae.meshlambert_frag},phong:{uniforms:Ln([Ut.common,Ut.specularmap,Ut.envmap,Ut.aomap,Ut.lightmap,Ut.emissivemap,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.fog,Ut.lights,{emissive:{value:new Ht(0)},specular:{value:new Ht(1118481)},shininess:{value:30}}]),vertexShader:ae.meshphong_vert,fragmentShader:ae.meshphong_frag},standard:{uniforms:Ln([Ut.common,Ut.envmap,Ut.aomap,Ut.lightmap,Ut.emissivemap,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.roughnessmap,Ut.metalnessmap,Ut.fog,Ut.lights,{emissive:{value:new Ht(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:ae.meshphysical_vert,fragmentShader:ae.meshphysical_frag},toon:{uniforms:Ln([Ut.common,Ut.aomap,Ut.lightmap,Ut.emissivemap,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.gradientmap,Ut.fog,Ut.lights,{emissive:{value:new Ht(0)}}]),vertexShader:ae.meshtoon_vert,fragmentShader:ae.meshtoon_frag},matcap:{uniforms:Ln([Ut.common,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.fog,{matcap:{value:null}}]),vertexShader:ae.meshmatcap_vert,fragmentShader:ae.meshmatcap_frag},points:{uniforms:Ln([Ut.points,Ut.fog]),vertexShader:ae.points_vert,fragmentShader:ae.points_frag},dashed:{uniforms:Ln([Ut.common,Ut.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:ae.linedashed_vert,fragmentShader:ae.linedashed_frag},depth:{uniforms:Ln([Ut.common,Ut.displacementmap]),vertexShader:ae.depth_vert,fragmentShader:ae.depth_frag},normal:{uniforms:Ln([Ut.common,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,{opacity:{value:1}}]),vertexShader:ae.meshnormal_vert,fragmentShader:ae.meshnormal_frag},sprite:{uniforms:Ln([Ut.sprite,Ut.fog]),vertexShader:ae.sprite_vert,fragmentShader:ae.sprite_frag},background:{uniforms:{uvTransform:{value:new de},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:ae.background_vert,fragmentShader:ae.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new de}},vertexShader:ae.backgroundCube_vert,fragmentShader:ae.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:ae.cube_vert,fragmentShader:ae.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:ae.equirect_vert,fragmentShader:ae.equirect_frag},distanceRGBA:{uniforms:Ln([Ut.common,Ut.displacementmap,{referencePosition:{value:new C},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:ae.distanceRGBA_vert,fragmentShader:ae.distanceRGBA_frag},shadow:{uniforms:Ln([Ut.lights,Ut.fog,{color:{value:new Ht(0)},opacity:{value:1}}]),vertexShader:ae.shadow_vert,fragmentShader:ae.shadow_frag}};vi.physical={uniforms:Ln([vi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new de},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new de},clearcoatNormalScale:{value:new Rt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new de},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new de},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new de},sheen:{value:0},sheenColor:{value:new Ht(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new de},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new de},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new de},transmissionSamplerSize:{value:new Rt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new de},attenuationDistance:{value:0},attenuationColor:{value:new Ht(0)},specularColor:{value:new Ht(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new de},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new de},anisotropyVector:{value:new Rt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new de}}]),vertexShader:ae.meshphysical_vert,fragmentShader:ae.meshphysical_frag};const la={r:0,b:0,g:0},Es=new Be,S1=new jt;function E1(s,t,e,n,i,o,r){const a=new Ht(0);let l=o===!0?0:1,h,c,d=null,u=0,v=null;function p(y){let w=y.isScene===!0?y.background:null;return w&&w.isTexture&&(w=(y.backgroundBlurriness>0?e:t).get(w)),w}function g(y){let w=!1;const x=p(y);x===null?m(a,l):x&&x.isColor&&(m(x,1),w=!0);const b=s.xr.getEnvironmentBlendMode();b==="additive"?n.buffers.color.setClear(0,0,0,1,r):b==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,r),(s.autoClear||w)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function f(y,w){const x=p(w);x&&(x.isCubeTexture||x.mapping===Va)?(c===void 0&&(c=new pe(new kt(1,1,1),new Ge({name:"BackgroundCubeMaterial",uniforms:Io(vi.backgroundCube.uniforms),vertexShader:vi.backgroundCube.vertexShader,fragmentShader:vi.backgroundCube.fragmentShader,side:An,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(b,M,A){this.matrixWorld.copyPosition(A.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(c)),Es.copy(w.backgroundRotation),Es.x*=-1,Es.y*=-1,Es.z*=-1,x.isCubeTexture&&x.isRenderTargetTexture===!1&&(Es.y*=-1,Es.z*=-1),c.material.uniforms.envMap.value=x,c.material.uniforms.flipEnvMap.value=x.isCubeTexture&&x.isRenderTargetTexture===!1?-1:1,c.material.uniforms.backgroundBlurriness.value=w.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=w.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(S1.makeRotationFromEuler(Es)),c.material.toneMapped=ye.getTransfer(x.colorSpace)!==Pe,(d!==x||u!==x.version||v!==s.toneMapping)&&(c.material.needsUpdate=!0,d=x,u=x.version,v=s.toneMapping),c.layers.enableAll(),y.unshift(c,c.geometry,c.material,0,0,null)):x&&x.isTexture&&(h===void 0&&(h=new pe(new Si(2,2),new Ge({name:"BackgroundMaterial",uniforms:Io(vi.background.uniforms),vertexShader:vi.background.vertexShader,fragmentShader:vi.background.fragmentShader,side:Ki,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),Object.defineProperty(h.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(h)),h.material.uniforms.t2D.value=x,h.material.uniforms.backgroundIntensity.value=w.backgroundIntensity,h.material.toneMapped=ye.getTransfer(x.colorSpace)!==Pe,x.matrixAutoUpdate===!0&&x.updateMatrix(),h.material.uniforms.uvTransform.value.copy(x.matrix),(d!==x||u!==x.version||v!==s.toneMapping)&&(h.material.needsUpdate=!0,d=x,u=x.version,v=s.toneMapping),h.layers.enableAll(),y.unshift(h,h.geometry,h.material,0,0,null))}function m(y,w){y.getRGB(la,wd(s)),n.buffers.color.setClear(la.r,la.g,la.b,w,r)}return{getClearColor:function(){return a},setClearColor:function(y,w=1){a.set(y),l=w,m(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(y){l=y,m(a,l)},render:g,addToRenderList:f}}function A1(s,t){const e=s.getParameter(s.MAX_VERTEX_ATTRIBS),n={},i=u(null);let o=i,r=!1;function a(E,T,F,k,I){let O=!1;const U=d(k,F,T);o!==U&&(o=U,h(o.object)),O=v(E,k,F,I),O&&p(E,k,F,I),I!==null&&t.update(I,s.ELEMENT_ARRAY_BUFFER),(O||r)&&(r=!1,x(E,T,F,k),I!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,t.get(I).buffer))}function l(){return s.createVertexArray()}function h(E){return s.bindVertexArray(E)}function c(E){return s.deleteVertexArray(E)}function d(E,T,F){const k=F.wireframe===!0;let I=n[E.id];I===void 0&&(I={},n[E.id]=I);let O=I[T.id];O===void 0&&(O={},I[T.id]=O);let U=O[k];return U===void 0&&(U=u(l()),O[k]=U),U}function u(E){const T=[],F=[],k=[];for(let I=0;I<e;I++)T[I]=0,F[I]=0,k[I]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:T,enabledAttributes:F,attributeDivisors:k,object:E,attributes:{},index:null}}function v(E,T,F,k){const I=o.attributes,O=T.attributes;let U=0;const P=F.getAttributes();for(const H in P)if(P[H].location>=0){const N=I[H];let Y=O[H];if(Y===void 0&&(H==="instanceMatrix"&&E.instanceMatrix&&(Y=E.instanceMatrix),H==="instanceColor"&&E.instanceColor&&(Y=E.instanceColor)),N===void 0||N.attribute!==Y||Y&&N.data!==Y.data)return!0;U++}return o.attributesNum!==U||o.index!==k}function p(E,T,F,k){const I={},O=T.attributes;let U=0;const P=F.getAttributes();for(const H in P)if(P[H].location>=0){let N=O[H];N===void 0&&(H==="instanceMatrix"&&E.instanceMatrix&&(N=E.instanceMatrix),H==="instanceColor"&&E.instanceColor&&(N=E.instanceColor));const Y={};Y.attribute=N,N&&N.data&&(Y.data=N.data),I[H]=Y,U++}o.attributes=I,o.attributesNum=U,o.index=k}function g(){const E=o.newAttributes;for(let T=0,F=E.length;T<F;T++)E[T]=0}function f(E){m(E,0)}function m(E,T){const F=o.newAttributes,k=o.enabledAttributes,I=o.attributeDivisors;F[E]=1,k[E]===0&&(s.enableVertexAttribArray(E),k[E]=1),I[E]!==T&&(s.vertexAttribDivisor(E,T),I[E]=T)}function y(){const E=o.newAttributes,T=o.enabledAttributes;for(let F=0,k=T.length;F<k;F++)T[F]!==E[F]&&(s.disableVertexAttribArray(F),T[F]=0)}function w(E,T,F,k,I,O,U){U===!0?s.vertexAttribIPointer(E,T,F,I,O):s.vertexAttribPointer(E,T,F,k,I,O)}function x(E,T,F,k){g();const I=k.attributes,O=F.getAttributes(),U=T.defaultAttributeValues;for(const P in O){const H=O[P];if(H.location>=0){let G=I[P];if(G===void 0&&(P==="instanceMatrix"&&E.instanceMatrix&&(G=E.instanceMatrix),P==="instanceColor"&&E.instanceColor&&(G=E.instanceColor)),G!==void 0){const N=G.normalized,Y=G.itemSize,V=t.get(G);if(V===void 0)continue;const Q=V.buffer,W=V.type,q=V.bytesPerElement,X=W===s.INT||W===s.UNSIGNED_INT||G.gpuType===ih;if(G.isInterleavedBufferAttribute){const it=G.data,at=it.stride,ft=G.offset;if(it.isInstancedInterleavedBuffer){for(let Z=0;Z<H.locationSize;Z++)m(H.location+Z,it.meshPerAttribute);E.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=it.meshPerAttribute*it.count)}else for(let Z=0;Z<H.locationSize;Z++)f(H.location+Z);s.bindBuffer(s.ARRAY_BUFFER,Q);for(let Z=0;Z<H.locationSize;Z++)w(H.location+Z,Y/H.locationSize,W,N,at*q,(ft+Y/H.locationSize*Z)*q,X)}else{if(G.isInstancedBufferAttribute){for(let it=0;it<H.locationSize;it++)m(H.location+it,G.meshPerAttribute);E.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=G.meshPerAttribute*G.count)}else for(let it=0;it<H.locationSize;it++)f(H.location+it);s.bindBuffer(s.ARRAY_BUFFER,Q);for(let it=0;it<H.locationSize;it++)w(H.location+it,Y/H.locationSize,W,N,Y*q,Y/H.locationSize*it*q,X)}}else if(U!==void 0){const N=U[P];if(N!==void 0)switch(N.length){case 2:s.vertexAttrib2fv(H.location,N);break;case 3:s.vertexAttrib3fv(H.location,N);break;case 4:s.vertexAttrib4fv(H.location,N);break;default:s.vertexAttrib1fv(H.location,N)}}}}y()}function b(){S();for(const E in n){const T=n[E];for(const F in T){const k=T[F];for(const I in k)c(k[I].object),delete k[I];delete T[F]}delete n[E]}}function M(E){if(n[E.id]===void 0)return;const T=n[E.id];for(const F in T){const k=T[F];for(const I in k)c(k[I].object),delete k[I];delete T[F]}delete n[E.id]}function A(E){for(const T in n){const F=n[T];if(F[E.id]===void 0)continue;const k=F[E.id];for(const I in k)c(k[I].object),delete k[I];delete F[E.id]}}function S(){_(),r=!0,o!==i&&(o=i,h(o.object))}function _(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:a,reset:S,resetDefaultState:_,dispose:b,releaseStatesOfGeometry:M,releaseStatesOfProgram:A,initAttributes:g,enableAttribute:f,disableUnusedAttributes:y}}function T1(s,t,e){let n;function i(h){n=h}function o(h,c){s.drawArrays(n,h,c),e.update(c,n,1)}function r(h,c,d){d!==0&&(s.drawArraysInstanced(n,h,c,d),e.update(c,n,d))}function a(h,c,d){if(d===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,h,0,c,0,d);let v=0;for(let p=0;p<d;p++)v+=c[p];e.update(v,n,1)}function l(h,c,d,u){if(d===0)return;const v=t.get("WEBGL_multi_draw");if(v===null)for(let p=0;p<h.length;p++)r(h[p],c[p],u[p]);else{v.multiDrawArraysInstancedWEBGL(n,h,0,c,0,u,0,d);let p=0;for(let g=0;g<d;g++)p+=c[g]*u[g];e.update(p,n,1)}}this.setMode=i,this.render=o,this.renderInstances=r,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function C1(s,t,e,n){let i;function o(){if(i!==void 0)return i;if(t.has("EXT_texture_filter_anisotropic")===!0){const A=t.get("EXT_texture_filter_anisotropic");i=s.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function r(A){return!(A!==En&&n.convert(A)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(A){const S=A===In&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(A!==ei&&n.convert(A)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE)&&A!==$n&&!S)}function l(A){if(A==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";A="mediump"}return A==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let h=e.precision!==void 0?e.precision:"highp";const c=l(h);c!==h&&(console.warn("THREE.WebGLRenderer:",h,"not supported, using",c,"instead."),h=c);const d=e.logarithmicDepthBuffer===!0,u=e.reverseDepthBuffer===!0&&t.has("EXT_clip_control"),v=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),p=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),g=s.getParameter(s.MAX_TEXTURE_SIZE),f=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),m=s.getParameter(s.MAX_VERTEX_ATTRIBS),y=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),w=s.getParameter(s.MAX_VARYING_VECTORS),x=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),b=p>0,M=s.getParameter(s.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:o,getMaxPrecision:l,textureFormatReadable:r,textureTypeReadable:a,precision:h,logarithmicDepthBuffer:d,reverseDepthBuffer:u,maxTextures:v,maxVertexTextures:p,maxTextureSize:g,maxCubemapSize:f,maxAttributes:m,maxVertexUniforms:y,maxVaryings:w,maxFragmentUniforms:x,vertexTextures:b,maxSamples:M}}function R1(s){const t=this;let e=null,n=0,i=!1,o=!1;const r=new ds,a=new de,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){const v=d.length!==0||u||n!==0||i;return i=u,n=d.length,v},this.beginShadows=function(){o=!0,c(null)},this.endShadows=function(){o=!1},this.setGlobalState=function(d,u){e=c(d,u,0)},this.setState=function(d,u,v){const p=d.clippingPlanes,g=d.clipIntersection,f=d.clipShadows,m=s.get(d);if(!i||p===null||p.length===0||o&&!f)o?c(null):h();else{const y=o?0:n,w=y*4;let x=m.clippingState||null;l.value=x,x=c(p,u,w,v);for(let b=0;b!==w;++b)x[b]=e[b];m.clippingState=x,this.numIntersection=g?this.numPlanes:0,this.numPlanes+=y}};function h(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function c(d,u,v,p){const g=d!==null?d.length:0;let f=null;if(g!==0){if(f=l.value,p!==!0||f===null){const m=v+g*4,y=u.matrixWorldInverse;a.getNormalMatrix(y),(f===null||f.length<m)&&(f=new Float32Array(m));for(let w=0,x=v;w!==g;++w,x+=4)r.copy(d[w]).applyMatrix4(y,a),r.normal.toArray(f,x),f[x+3]=r.constant}l.value=f,l.needsUpdate=!0}return t.numPlanes=g,t.numIntersection=0,f}}function P1(s){let t=new WeakMap;function e(r,a){return a===vc?r.mapping=Co:a===xc&&(r.mapping=Ro),r}function n(r){if(r&&r.isTexture){const a=r.mapping;if(a===vc||a===xc)if(t.has(r)){const l=t.get(r).texture;return e(l,r.mapping)}else{const l=r.image;if(l&&l.height>0){const h=new Hp(l.height);return h.fromEquirectangularTexture(s,r),t.set(r,h),r.addEventListener("dispose",i),e(h.texture,r.mapping)}else return null}}return r}function i(r){const a=r.target;a.removeEventListener("dispose",i);const l=t.get(a);l!==void 0&&(t.delete(a),l.dispose())}function o(){t=new WeakMap}return{get:n,dispose:o}}class Go extends yd{constructor(t=-1,e=1,n=1,i=-1,o=.1,r=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=i,this.near=o,this.far=r,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,i,o,r){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=o,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let o=n-t,r=n+t,a=i+e,l=i-e;if(this.view!==null&&this.view.enabled){const h=(this.right-this.left)/this.view.fullWidth/this.zoom,c=(this.top-this.bottom)/this.view.fullHeight/this.zoom;o+=h*this.view.offsetX,r=o+h*this.view.width,a-=c*this.view.offsetY,l=a-c*this.view.height}this.projectionMatrix.makeOrthographic(o,r,a,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}const yo=4,g0=[.125,.215,.35,.446,.526,.582],Fs=20,bl=new Go,v0=new Ht;let Sl=null,El=0,Al=0,Tl=!1;const Ns=(1+Math.sqrt(5))/2,fo=1/Ns,x0=[new C(-Ns,fo,0),new C(Ns,fo,0),new C(-fo,0,Ns),new C(fo,0,Ns),new C(0,Ns,-fo),new C(0,Ns,fo),new C(-1,1,-1),new C(1,1,-1),new C(-1,1,1),new C(1,1,1)];class qc{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,n=.1,i=100){Sl=this._renderer.getRenderTarget(),El=this._renderer.getActiveCubeFace(),Al=this._renderer.getActiveMipmapLevel(),Tl=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const o=this._allocateTargets();return o.depthBuffer=!0,this._sceneToCubeUV(t,n,i,o),e>0&&this._blur(o,0,0,e),this._applyPMREM(o),this._cleanup(o),o}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=_0(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=y0(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(Sl,El,Al),this._renderer.xr.enabled=Tl,t.scissorTest=!1,ca(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Co||t.mapping===Ro?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Sl=this._renderer.getRenderTarget(),El=this._renderer.getActiveCubeFace(),Al=this._renderer.getActiveMipmapLevel(),Tl=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:_e,minFilter:_e,generateMipmaps:!1,type:In,format:En,colorSpace:Ys,depthBuffer:!1},i=w0(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=w0(t,e,n);const{_lodMax:o}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=L1(o)),this._blurMaterial=D1(o,t,e)}return i}_compileMaterial(t){const e=new pe(this._lodPlanes[0],t);this._renderer.compile(e,bl)}_sceneToCubeUV(t,e,n,i){const a=new kn(90,1,e,n),l=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],c=this._renderer,d=c.autoClear,u=c.toneMapping;c.getClearColor(v0),c.toneMapping=qi,c.autoClear=!1;const v=new ch({name:"PMREM.Background",side:An,depthWrite:!1,depthTest:!1}),p=new pe(new kt,v);let g=!1;const f=t.background;f?f.isColor&&(v.color.copy(f),t.background=null,g=!0):(v.color.copy(v0),g=!0);for(let m=0;m<6;m++){const y=m%3;y===0?(a.up.set(0,l[m],0),a.lookAt(h[m],0,0)):y===1?(a.up.set(0,0,l[m]),a.lookAt(0,h[m],0)):(a.up.set(0,l[m],0),a.lookAt(0,0,h[m]));const w=this._cubeSize;ca(i,y*w,m>2?w:0,w,w),c.setRenderTarget(i),g&&c.render(p,a),c.render(t,a)}p.geometry.dispose(),p.material.dispose(),c.toneMapping=u,c.autoClear=d,t.background=f}_textureToCubeUV(t,e){const n=this._renderer,i=t.mapping===Co||t.mapping===Ro;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=_0()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=y0());const o=i?this._cubemapMaterial:this._equirectMaterial,r=new pe(this._lodPlanes[0],o),a=o.uniforms;a.envMap.value=t;const l=this._cubeSize;ca(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(r,bl)}_applyPMREM(t){const e=this._renderer,n=e.autoClear;e.autoClear=!1;const i=this._lodPlanes.length;for(let o=1;o<i;o++){const r=Math.sqrt(this._sigmas[o]*this._sigmas[o]-this._sigmas[o-1]*this._sigmas[o-1]),a=x0[(i-o-1)%x0.length];this._blur(t,o-1,o,r,a)}e.autoClear=n}_blur(t,e,n,i,o){const r=this._pingPongRenderTarget;this._halfBlur(t,r,e,n,i,"latitudinal",o),this._halfBlur(r,t,n,n,i,"longitudinal",o)}_halfBlur(t,e,n,i,o,r,a){const l=this._renderer,h=this._blurMaterial;r!=="latitudinal"&&r!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const c=3,d=new pe(this._lodPlanes[i],h),u=h.uniforms,v=this._sizeLods[n]-1,p=isFinite(o)?Math.PI/(2*v):2*Math.PI/(2*Fs-1),g=o/p,f=isFinite(o)?1+Math.floor(c*g):Fs;f>Fs&&console.warn(`sigmaRadians, ${o}, is too large and will clip, as it requested ${f} samples when the maximum is set to ${Fs}`);const m=[];let y=0;for(let A=0;A<Fs;++A){const S=A/g,_=Math.exp(-S*S/2);m.push(_),A===0?y+=_:A<f&&(y+=2*_)}for(let A=0;A<m.length;A++)m[A]=m[A]/y;u.envMap.value=t.texture,u.samples.value=f,u.weights.value=m,u.latitudinal.value=r==="latitudinal",a&&(u.poleAxis.value=a);const{_lodMax:w}=this;u.dTheta.value=p,u.mipInt.value=w-n;const x=this._sizeLods[i],b=3*x*(i>w-yo?i-w+yo:0),M=4*(this._cubeSize-x);ca(e,b,M,3*x,2*x),l.setRenderTarget(e),l.render(d,bl)}}function L1(s){const t=[],e=[],n=[];let i=s;const o=s-yo+1+g0.length;for(let r=0;r<o;r++){const a=Math.pow(2,i);e.push(a);let l=1/a;r>s-yo?l=g0[r-s+yo-1]:r===0&&(l=0),n.push(l);const h=1/(a-2),c=-h,d=1+h,u=[c,c,d,c,d,d,c,c,d,d,c,d],v=6,p=6,g=3,f=2,m=1,y=new Float32Array(g*p*v),w=new Float32Array(f*p*v),x=new Float32Array(m*p*v);for(let M=0;M<v;M++){const A=M%3*2/3-1,S=M>2?0:-1,_=[A,S,0,A+2/3,S,0,A+2/3,S+1,0,A,S,0,A+2/3,S+1,0,A,S+1,0];y.set(_,g*p*M),w.set(u,f*p*M);const E=[M,M,M,M,M,M];x.set(E,m*p*M)}const b=new oe;b.setAttribute("position",new fe(y,g)),b.setAttribute("uv",new fe(w,f)),b.setAttribute("faceIndex",new fe(x,m)),t.push(b),i>yo&&i--}return{lodPlanes:t,sizeLods:e,sigmas:n}}function w0(s,t,e){const n=new vn(s,t,e);return n.texture.mapping=Va,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function ca(s,t,e,n,i){s.viewport.set(t,e,n,i),s.scissor.set(t,e,n,i)}function D1(s,t,e){const n=new Float32Array(Fs),i=new C(0,1,0);return new Ge({name:"SphericalGaussianBlur",defines:{n:Fs,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:hh(),fragmentShader:`

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
		`,blending:ms,depthTest:!1,depthWrite:!1})}function y0(){return new Ge({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:hh(),fragmentShader:`

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
		`,blending:ms,depthTest:!1,depthWrite:!1})}function _0(){return new Ge({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:hh(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:ms,depthTest:!1,depthWrite:!1})}function hh(){return`

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
	`}function I1(s){let t=new WeakMap,e=null;function n(a){if(a&&a.isTexture){const l=a.mapping,h=l===vc||l===xc,c=l===Co||l===Ro;if(h||c){let d=t.get(a);const u=d!==void 0?d.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==u)return e===null&&(e=new qc(s)),d=h?e.fromEquirectangular(a,d):e.fromCubemap(a,d),d.texture.pmremVersion=a.pmremVersion,t.set(a,d),d.texture;if(d!==void 0)return d.texture;{const v=a.image;return h&&v&&v.height>0||c&&v&&i(v)?(e===null&&(e=new qc(s)),d=h?e.fromEquirectangular(a):e.fromCubemap(a),d.texture.pmremVersion=a.pmremVersion,t.set(a,d),a.addEventListener("dispose",o),d.texture):null}}}return a}function i(a){let l=0;const h=6;for(let c=0;c<h;c++)a[c]!==void 0&&l++;return l===h}function o(a){const l=a.target;l.removeEventListener("dispose",o);const h=t.get(l);h!==void 0&&(t.delete(l),h.dispose())}function r(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:n,dispose:r}}function z1(s){const t={};function e(n){if(t[n]!==void 0)return t[n];let i;switch(n){case"WEBGL_depth_texture":i=s.getExtension("WEBGL_depth_texture")||s.getExtension("MOZ_WEBGL_depth_texture")||s.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":i=s.getExtension("EXT_texture_filter_anisotropic")||s.getExtension("MOZ_EXT_texture_filter_anisotropic")||s.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":i=s.getExtension("WEBGL_compressed_texture_s3tc")||s.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":i=s.getExtension("WEBGL_compressed_texture_pvrtc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:i=s.getExtension(n)}return t[n]=i,i}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){const i=e(n);return i===null&&wr("THREE.WebGLRenderer: "+n+" extension not supported."),i}}}function N1(s,t,e,n){const i={},o=new WeakMap;function r(d){const u=d.target;u.index!==null&&t.remove(u.index);for(const p in u.attributes)t.remove(u.attributes[p]);for(const p in u.morphAttributes){const g=u.morphAttributes[p];for(let f=0,m=g.length;f<m;f++)t.remove(g[f])}u.removeEventListener("dispose",r),delete i[u.id];const v=o.get(u);v&&(t.remove(v),o.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function a(d,u){return i[u.id]===!0||(u.addEventListener("dispose",r),i[u.id]=!0,e.memory.geometries++),u}function l(d){const u=d.attributes;for(const p in u)t.update(u[p],s.ARRAY_BUFFER);const v=d.morphAttributes;for(const p in v){const g=v[p];for(let f=0,m=g.length;f<m;f++)t.update(g[f],s.ARRAY_BUFFER)}}function h(d){const u=[],v=d.index,p=d.attributes.position;let g=0;if(v!==null){const y=v.array;g=v.version;for(let w=0,x=y.length;w<x;w+=3){const b=y[w+0],M=y[w+1],A=y[w+2];u.push(b,M,M,A,A,b)}}else if(p!==void 0){const y=p.array;g=p.version;for(let w=0,x=y.length/3-1;w<x;w+=3){const b=w+0,M=w+1,A=w+2;u.push(b,M,M,A,A,b)}}else return;const f=new(hd(u)?xd:vd)(u,1);f.version=g;const m=o.get(d);m&&t.remove(m),o.set(d,f)}function c(d){const u=o.get(d);if(u){const v=d.index;v!==null&&u.version<v.version&&h(d)}else h(d);return o.get(d)}return{get:a,update:l,getWireframeAttribute:c}}function U1(s,t,e){let n;function i(u){n=u}let o,r;function a(u){o=u.type,r=u.bytesPerElement}function l(u,v){s.drawElements(n,v,o,u*r),e.update(v,n,1)}function h(u,v,p){p!==0&&(s.drawElementsInstanced(n,v,o,u*r,p),e.update(v,n,p))}function c(u,v,p){if(p===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,v,0,o,u,0,p);let f=0;for(let m=0;m<p;m++)f+=v[m];e.update(f,n,1)}function d(u,v,p,g){if(p===0)return;const f=t.get("WEBGL_multi_draw");if(f===null)for(let m=0;m<u.length;m++)h(u[m]/r,v[m],g[m]);else{f.multiDrawElementsInstancedWEBGL(n,v,0,o,u,0,g,0,p);let m=0;for(let y=0;y<p;y++)m+=v[y]*g[y];e.update(m,n,1)}}this.setMode=i,this.setIndex=a,this.render=l,this.renderInstances=h,this.renderMultiDraw=c,this.renderMultiDrawInstances=d}function F1(s){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(o,r,a){switch(e.calls++,r){case s.TRIANGLES:e.triangles+=a*(o/3);break;case s.LINES:e.lines+=a*(o/2);break;case s.LINE_STRIP:e.lines+=a*(o-1);break;case s.LINE_LOOP:e.lines+=a*o;break;case s.POINTS:e.points+=a*o;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",r);break}}function i(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:i,update:n}}function k1(s,t,e){const n=new WeakMap,i=new Ne;function o(r,a,l){const h=r.morphTargetInfluences,c=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,d=c!==void 0?c.length:0;let u=n.get(a);if(u===void 0||u.count!==d){let E=function(){S.dispose(),n.delete(a),a.removeEventListener("dispose",E)};var v=E;u!==void 0&&u.texture.dispose();const p=a.morphAttributes.position!==void 0,g=a.morphAttributes.normal!==void 0,f=a.morphAttributes.color!==void 0,m=a.morphAttributes.position||[],y=a.morphAttributes.normal||[],w=a.morphAttributes.color||[];let x=0;p===!0&&(x=1),g===!0&&(x=2),f===!0&&(x=3);let b=a.attributes.position.count*x,M=1;b>t.maxTextureSize&&(M=Math.ceil(b/t.maxTextureSize),b=t.maxTextureSize);const A=new Float32Array(b*M*4*d),S=new dd(A,b,M,d);S.type=$n,S.needsUpdate=!0;const _=x*4;for(let T=0;T<d;T++){const F=m[T],k=y[T],I=w[T],O=b*M*4*T;for(let U=0;U<F.count;U++){const P=U*_;p===!0&&(i.fromBufferAttribute(F,U),A[O+P+0]=i.x,A[O+P+1]=i.y,A[O+P+2]=i.z,A[O+P+3]=0),g===!0&&(i.fromBufferAttribute(k,U),A[O+P+4]=i.x,A[O+P+5]=i.y,A[O+P+6]=i.z,A[O+P+7]=0),f===!0&&(i.fromBufferAttribute(I,U),A[O+P+8]=i.x,A[O+P+9]=i.y,A[O+P+10]=i.z,A[O+P+11]=I.itemSize===4?i.w:1)}}u={count:d,texture:S,size:new Rt(b,M)},n.set(a,u),a.addEventListener("dispose",E)}if(r.isInstancedMesh===!0&&r.morphTexture!==null)l.getUniforms().setValue(s,"morphTexture",r.morphTexture,e);else{let p=0;for(let f=0;f<h.length;f++)p+=h[f];const g=a.morphTargetsRelative?1:1-p;l.getUniforms().setValue(s,"morphTargetBaseInfluence",g),l.getUniforms().setValue(s,"morphTargetInfluences",h)}l.getUniforms().setValue(s,"morphTargetsTexture",u.texture,e),l.getUniforms().setValue(s,"morphTargetsTextureSize",u.size)}return{update:o}}function O1(s,t,e,n){let i=new WeakMap;function o(l){const h=n.render.frame,c=l.geometry,d=t.get(l,c);if(i.get(d)!==h&&(t.update(d),i.set(d,h)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),i.get(l)!==h&&(e.update(l.instanceMatrix,s.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,s.ARRAY_BUFFER),i.set(l,h))),l.isSkinnedMesh){const u=l.skeleton;i.get(u)!==h&&(u.update(),i.set(u,h))}return d}function r(){i=new WeakMap}function a(l){const h=l.target;h.removeEventListener("dispose",a),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:o,dispose:r}}class qa extends Tn{constructor(t,e,n,i,o,r,a,l,h,c=So){if(c!==So&&c!==Do)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&c===So&&(n=bi),n===void 0&&c===Do&&(n=Lo),super(null,i,o,r,a,l,c,n,h),this.isDepthTexture=!0,this.image={width:t,height:e},this.magFilter=a!==void 0?a:Nn,this.minFilter=l!==void 0?l:Nn,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}const bd=new Tn,M0=new qa(1,1),Sd=new dd,Ed=new fd,Ad=new _d,b0=[],S0=[],E0=new Float32Array(16),A0=new Float32Array(9),T0=new Float32Array(4);function Vo(s,t,e){const n=s[0];if(n<=0||n>0)return s;const i=t*e;let o=b0[i];if(o===void 0&&(o=new Float32Array(i),b0[i]=o),t!==0){n.toArray(o,0);for(let r=1,a=0;r!==t;++r)a+=e,s[r].toArray(o,a)}return o}function on(s,t){if(s.length!==t.length)return!1;for(let e=0,n=s.length;e<n;e++)if(s[e]!==t[e])return!1;return!0}function rn(s,t){for(let e=0,n=t.length;e<n;e++)s[e]=t[e]}function Ya(s,t){let e=S0[t];e===void 0&&(e=new Int32Array(t),S0[t]=e);for(let n=0;n!==t;++n)e[n]=s.allocateTextureUnit();return e}function B1(s,t){const e=this.cache;e[0]!==t&&(s.uniform1f(this.addr,t),e[0]=t)}function H1(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(on(e,t))return;s.uniform2fv(this.addr,t),rn(e,t)}}function G1(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(s.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(on(e,t))return;s.uniform3fv(this.addr,t),rn(e,t)}}function V1(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(on(e,t))return;s.uniform4fv(this.addr,t),rn(e,t)}}function W1(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(on(e,t))return;s.uniformMatrix2fv(this.addr,!1,t),rn(e,t)}else{if(on(e,n))return;T0.set(n),s.uniformMatrix2fv(this.addr,!1,T0),rn(e,n)}}function X1(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(on(e,t))return;s.uniformMatrix3fv(this.addr,!1,t),rn(e,t)}else{if(on(e,n))return;A0.set(n),s.uniformMatrix3fv(this.addr,!1,A0),rn(e,n)}}function q1(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(on(e,t))return;s.uniformMatrix4fv(this.addr,!1,t),rn(e,t)}else{if(on(e,n))return;E0.set(n),s.uniformMatrix4fv(this.addr,!1,E0),rn(e,n)}}function Y1(s,t){const e=this.cache;e[0]!==t&&(s.uniform1i(this.addr,t),e[0]=t)}function $1(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(on(e,t))return;s.uniform2iv(this.addr,t),rn(e,t)}}function j1(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(on(e,t))return;s.uniform3iv(this.addr,t),rn(e,t)}}function Z1(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(on(e,t))return;s.uniform4iv(this.addr,t),rn(e,t)}}function K1(s,t){const e=this.cache;e[0]!==t&&(s.uniform1ui(this.addr,t),e[0]=t)}function J1(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(on(e,t))return;s.uniform2uiv(this.addr,t),rn(e,t)}}function Q1(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(on(e,t))return;s.uniform3uiv(this.addr,t),rn(e,t)}}function tv(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(on(e,t))return;s.uniform4uiv(this.addr,t),rn(e,t)}}function ev(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);let o;this.type===s.SAMPLER_2D_SHADOW?(M0.compareFunction=cd,o=M0):o=bd,e.setTexture2D(t||o,i)}function nv(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTexture3D(t||Ed,i)}function iv(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTextureCube(t||Ad,i)}function sv(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTexture2DArray(t||Sd,i)}function ov(s){switch(s){case 5126:return B1;case 35664:return H1;case 35665:return G1;case 35666:return V1;case 35674:return W1;case 35675:return X1;case 35676:return q1;case 5124:case 35670:return Y1;case 35667:case 35671:return $1;case 35668:case 35672:return j1;case 35669:case 35673:return Z1;case 5125:return K1;case 36294:return J1;case 36295:return Q1;case 36296:return tv;case 35678:case 36198:case 36298:case 36306:case 35682:return ev;case 35679:case 36299:case 36307:return nv;case 35680:case 36300:case 36308:case 36293:return iv;case 36289:case 36303:case 36311:case 36292:return sv}}function rv(s,t){s.uniform1fv(this.addr,t)}function av(s,t){const e=Vo(t,this.size,2);s.uniform2fv(this.addr,e)}function lv(s,t){const e=Vo(t,this.size,3);s.uniform3fv(this.addr,e)}function cv(s,t){const e=Vo(t,this.size,4);s.uniform4fv(this.addr,e)}function hv(s,t){const e=Vo(t,this.size,4);s.uniformMatrix2fv(this.addr,!1,e)}function uv(s,t){const e=Vo(t,this.size,9);s.uniformMatrix3fv(this.addr,!1,e)}function dv(s,t){const e=Vo(t,this.size,16);s.uniformMatrix4fv(this.addr,!1,e)}function fv(s,t){s.uniform1iv(this.addr,t)}function pv(s,t){s.uniform2iv(this.addr,t)}function mv(s,t){s.uniform3iv(this.addr,t)}function gv(s,t){s.uniform4iv(this.addr,t)}function vv(s,t){s.uniform1uiv(this.addr,t)}function xv(s,t){s.uniform2uiv(this.addr,t)}function wv(s,t){s.uniform3uiv(this.addr,t)}function yv(s,t){s.uniform4uiv(this.addr,t)}function _v(s,t,e){const n=this.cache,i=t.length,o=Ya(e,i);on(n,o)||(s.uniform1iv(this.addr,o),rn(n,o));for(let r=0;r!==i;++r)e.setTexture2D(t[r]||bd,o[r])}function Mv(s,t,e){const n=this.cache,i=t.length,o=Ya(e,i);on(n,o)||(s.uniform1iv(this.addr,o),rn(n,o));for(let r=0;r!==i;++r)e.setTexture3D(t[r]||Ed,o[r])}function bv(s,t,e){const n=this.cache,i=t.length,o=Ya(e,i);on(n,o)||(s.uniform1iv(this.addr,o),rn(n,o));for(let r=0;r!==i;++r)e.setTextureCube(t[r]||Ad,o[r])}function Sv(s,t,e){const n=this.cache,i=t.length,o=Ya(e,i);on(n,o)||(s.uniform1iv(this.addr,o),rn(n,o));for(let r=0;r!==i;++r)e.setTexture2DArray(t[r]||Sd,o[r])}function Ev(s){switch(s){case 5126:return rv;case 35664:return av;case 35665:return lv;case 35666:return cv;case 35674:return hv;case 35675:return uv;case 35676:return dv;case 5124:case 35670:return fv;case 35667:case 35671:return pv;case 35668:case 35672:return mv;case 35669:case 35673:return gv;case 5125:return vv;case 36294:return xv;case 36295:return wv;case 36296:return yv;case 35678:case 36198:case 36298:case 36306:case 35682:return _v;case 35679:case 36299:case 36307:return Mv;case 35680:case 36300:case 36308:case 36293:return bv;case 36289:case 36303:case 36311:case 36292:return Sv}}class Av{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=ov(e.type)}}class Tv{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=Ev(e.type)}}class Cv{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){const i=this.seq;for(let o=0,r=i.length;o!==r;++o){const a=i[o];a.setValue(t,e[a.id],n)}}}const Cl=/(\w+)(\])?(\[|\.)?/g;function C0(s,t){s.seq.push(t),s.map[t.id]=t}function Rv(s,t,e){const n=s.name,i=n.length;for(Cl.lastIndex=0;;){const o=Cl.exec(n),r=Cl.lastIndex;let a=o[1];const l=o[2]==="]",h=o[3];if(l&&(a=a|0),h===void 0||h==="["&&r+2===i){C0(e,h===void 0?new Av(a,s,t):new Tv(a,s,t));break}else{let d=e.map[a];d===void 0&&(d=new Cv(a),C0(e,d)),e=d}}}class Ra{constructor(t,e){this.seq=[],this.map={};const n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let i=0;i<n;++i){const o=t.getActiveUniform(e,i),r=t.getUniformLocation(e,o.name);Rv(o,r,this)}}setValue(t,e,n,i){const o=this.map[e];o!==void 0&&o.setValue(t,n,i)}setOptional(t,e,n){const i=e[n];i!==void 0&&this.setValue(t,n,i)}static upload(t,e,n,i){for(let o=0,r=e.length;o!==r;++o){const a=e[o],l=n[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,i)}}static seqWithValue(t,e){const n=[];for(let i=0,o=t.length;i!==o;++i){const r=t[i];r.id in e&&n.push(r)}return n}}function R0(s,t,e){const n=s.createShader(t);return s.shaderSource(n,e),s.compileShader(n),n}const Pv=37297;let Lv=0;function Dv(s,t){const e=s.split(`
`),n=[],i=Math.max(t-6,0),o=Math.min(t+6,e.length);for(let r=i;r<o;r++){const a=r+1;n.push(`${a===t?">":" "} ${a}: ${e[r]}`)}return n.join(`
`)}const P0=new de;function Iv(s){ye._getMatrix(P0,ye.workingColorSpace,s);const t=`mat3( ${P0.elements.map(e=>e.toFixed(4))} )`;switch(ye.getTransfer(s)){case Xa:return[t,"LinearTransferOETF"];case Pe:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",s),[t,"LinearTransferOETF"]}}function L0(s,t,e){const n=s.getShaderParameter(t,s.COMPILE_STATUS),i=s.getShaderInfoLog(t).trim();if(n&&i==="")return"";const o=/ERROR: 0:(\d+)/.exec(i);if(o){const r=parseInt(o[1]);return e.toUpperCase()+`

`+i+`

`+Dv(s.getShaderSource(t),r)}else return i}function zv(s,t){const e=Iv(t);return[`vec4 ${s}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}function Nv(s,t){let e;switch(t){case Nf:e="Linear";break;case Uf:e="Reinhard";break;case Ff:e="Cineon";break;case kf:e="ACESFilmic";break;case Bf:e="AgX";break;case Hf:e="Neutral";break;case Of:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+s+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const ha=new C;function Uv(){ye.getLuminanceCoefficients(ha);const s=ha.x.toFixed(4),t=ha.y.toFixed(4),e=ha.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Fv(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(yr).join(`
`)}function kv(s){const t=[];for(const e in s){const n=s[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function Ov(s,t){const e={},n=s.getProgramParameter(t,s.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const o=s.getActiveAttrib(t,i),r=o.name;let a=1;o.type===s.FLOAT_MAT2&&(a=2),o.type===s.FLOAT_MAT3&&(a=3),o.type===s.FLOAT_MAT4&&(a=4),e[r]={type:o.type,location:s.getAttribLocation(t,r),locationSize:a}}return e}function yr(s){return s!==""}function D0(s,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return s.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function I0(s,t){return s.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const Bv=/^[ \t]*#include +<([\w\d./]+)>/gm;function Yc(s){return s.replace(Bv,Gv)}const Hv=new Map;function Gv(s,t){let e=ae[t];if(e===void 0){const n=Hv.get(t);if(n!==void 0)e=ae[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("Can not resolve #include <"+t+">")}return Yc(e)}const Vv=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function z0(s){return s.replace(Vv,Wv)}function Wv(s,t,e,n){let i="";for(let o=parseInt(t);o<parseInt(e);o++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+o+" ]").replace(/UNROLLED_LOOP_INDEX/g,o);return i}function N0(s){let t=`precision ${s.precision} float;
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
#define LOW_PRECISION`),t}function Xv(s){let t="SHADOWMAP_TYPE_BASIC";return s.shadowMapType===$u?t="SHADOWMAP_TYPE_PCF":s.shadowMapType===ju?t="SHADOWMAP_TYPE_PCF_SOFT":s.shadowMapType===Bi&&(t="SHADOWMAP_TYPE_VSM"),t}function qv(s){let t="ENVMAP_TYPE_CUBE";if(s.envMap)switch(s.envMapMode){case Co:case Ro:t="ENVMAP_TYPE_CUBE";break;case Va:t="ENVMAP_TYPE_CUBE_UV";break}return t}function Yv(s){let t="ENVMAP_MODE_REFLECTION";if(s.envMap)switch(s.envMapMode){case Ro:t="ENVMAP_MODE_REFRACTION";break}return t}function $v(s){let t="ENVMAP_BLENDING_NONE";if(s.envMap)switch(s.combine){case Zu:t="ENVMAP_BLENDING_MULTIPLY";break;case If:t="ENVMAP_BLENDING_MIX";break;case zf:t="ENVMAP_BLENDING_ADD";break}return t}function jv(s){const t=s.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),7*16)),texelHeight:n,maxMip:e}}function Zv(s,t,e,n){const i=s.getContext(),o=e.defines;let r=e.vertexShader,a=e.fragmentShader;const l=Xv(e),h=qv(e),c=Yv(e),d=$v(e),u=jv(e),v=Fv(e),p=kv(o),g=i.createProgram();let f,m,y=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(f=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p].filter(yr).join(`
`),f.length>0&&(f+=`
`),m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p].filter(yr).join(`
`),m.length>0&&(m+=`
`)):(f=[N0(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(yr).join(`
`),m=[N0(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.envMap?"#define "+c:"",e.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==qi?"#define TONE_MAPPING":"",e.toneMapping!==qi?ae.tonemapping_pars_fragment:"",e.toneMapping!==qi?Nv("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",ae.colorspace_pars_fragment,zv("linearToOutputTexel",e.outputColorSpace),Uv(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(yr).join(`
`)),r=Yc(r),r=D0(r,e),r=I0(r,e),a=Yc(a),a=D0(a,e),a=I0(a,e),r=z0(r),a=z0(a),e.isRawShaderMaterial!==!0&&(y=`#version 300 es
`,f=[v,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+f,m=["#define varying in",e.glslVersion===$h?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===$h?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);const w=y+f+r,x=y+m+a,b=R0(i,i.VERTEX_SHADER,w),M=R0(i,i.FRAGMENT_SHADER,x);i.attachShader(g,b),i.attachShader(g,M),e.index0AttributeName!==void 0?i.bindAttribLocation(g,0,e.index0AttributeName):e.morphTargets===!0&&i.bindAttribLocation(g,0,"position"),i.linkProgram(g);function A(T){if(s.debug.checkShaderErrors){const F=i.getProgramInfoLog(g).trim(),k=i.getShaderInfoLog(b).trim(),I=i.getShaderInfoLog(M).trim();let O=!0,U=!0;if(i.getProgramParameter(g,i.LINK_STATUS)===!1)if(O=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(i,g,b,M);else{const P=L0(i,b,"vertex"),H=L0(i,M,"fragment");console.error("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(g,i.VALIDATE_STATUS)+`

Material Name: `+T.name+`
Material Type: `+T.type+`

Program Info Log: `+F+`
`+P+`
`+H)}else F!==""?console.warn("THREE.WebGLProgram: Program Info Log:",F):(k===""||I==="")&&(U=!1);U&&(T.diagnostics={runnable:O,programLog:F,vertexShader:{log:k,prefix:f},fragmentShader:{log:I,prefix:m}})}i.deleteShader(b),i.deleteShader(M),S=new Ra(i,g),_=Ov(i,g)}let S;this.getUniforms=function(){return S===void 0&&A(this),S};let _;this.getAttributes=function(){return _===void 0&&A(this),_};let E=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return E===!1&&(E=i.getProgramParameter(g,Pv)),E},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(g),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=Lv++,this.cacheKey=t,this.usedTimes=1,this.program=g,this.vertexShader=b,this.fragmentShader=M,this}let Kv=0;class Jv{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,n=t.fragmentShader,i=this._getShaderStage(e),o=this._getShaderStage(n),r=this._getShaderCacheForMaterial(t);return r.has(i)===!1&&(r.add(i),i.usedTimes++),r.has(o)===!1&&(r.add(o),o.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){const e=this.shaderCache;let n=e.get(t);return n===void 0&&(n=new Qv(t),e.set(t,n)),n}}class Qv{constructor(t){this.id=Kv++,this.code=t,this.usedTimes=0}}function tx(s,t,e,n,i,o,r){const a=new md,l=new Jv,h=new Set,c=[],d=i.logarithmicDepthBuffer,u=i.vertexTextures;let v=i.precision;const p={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function g(_){return h.add(_),_===0?"uv":`uv${_}`}function f(_,E,T,F,k){const I=F.fog,O=k.geometry,U=_.isMeshStandardMaterial?F.environment:null,P=(_.isMeshStandardMaterial?e:t).get(_.envMap||U),H=P&&P.mapping===Va?P.image.height:null,G=p[_.type];_.precision!==null&&(v=i.getMaxPrecision(_.precision),v!==_.precision&&console.warn("THREE.WebGLProgram.getParameters:",_.precision,"not supported, using",v,"instead."));const N=O.morphAttributes.position||O.morphAttributes.normal||O.morphAttributes.color,Y=N!==void 0?N.length:0;let V=0;O.morphAttributes.position!==void 0&&(V=1),O.morphAttributes.normal!==void 0&&(V=2),O.morphAttributes.color!==void 0&&(V=3);let Q,W,q,X;if(G){const ue=vi[G];Q=ue.vertexShader,W=ue.fragmentShader}else Q=_.vertexShader,W=_.fragmentShader,l.update(_),q=l.getVertexShaderID(_),X=l.getFragmentShaderID(_);const it=s.getRenderTarget(),at=s.state.buffers.depth.getReversed(),ft=k.isInstancedMesh===!0,Z=k.isBatchedMesh===!0,ot=!!_.map,j=!!_.matcap,et=!!P,D=!!_.aoMap,J=!!_.lightMap,K=!!_.bumpMap,rt=!!_.normalMap,dt=!!_.displacementMap,xt=!!_.emissiveMap,pt=!!_.metalnessMap,z=!!_.roughnessMap,R=_.anisotropy>0,nt=_.clearcoat>0,ht=_.dispersion>0,gt=_.iridescence>0,ut=_.sheen>0,Nt=_.transmission>0,bt=R&&!!_.anisotropyMap,Dt=nt&&!!_.clearcoatMap,ee=nt&&!!_.clearcoatNormalMap,yt=nt&&!!_.clearcoatRoughnessMap,Ot=gt&&!!_.iridescenceMap,Yt=gt&&!!_.iridescenceThicknessMap,Ft=ut&&!!_.sheenColorMap,Lt=ut&&!!_.sheenRoughnessMap,le=!!_.specularMap,te=!!_.specularColorMap,ve=!!_.specularIntensityMap,$=Nt&&!!_.transmissionMap,zt=Nt&&!!_.thicknessMap,mt=!!_.gradientMap,wt=!!_.alphaMap,Et=_.alphaTest>0,At=!!_.alphaHash,ie=!!_.extensions;let Me=qi;_.toneMapped&&(it===null||it.isXRRenderTarget===!0)&&(Me=s.toneMapping);const Ve={shaderID:G,shaderType:_.type,shaderName:_.name,vertexShader:Q,fragmentShader:W,defines:_.defines,customVertexShaderID:q,customFragmentShaderID:X,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:v,batching:Z,batchingColor:Z&&k._colorsTexture!==null,instancing:ft,instancingColor:ft&&k.instanceColor!==null,instancingMorph:ft&&k.morphTexture!==null,supportsVertexTextures:u,outputColorSpace:it===null?s.outputColorSpace:it.isXRRenderTarget===!0?it.texture.colorSpace:Ys,alphaToCoverage:!!_.alphaToCoverage,map:ot,matcap:j,envMap:et,envMapMode:et&&P.mapping,envMapCubeUVHeight:H,aoMap:D,lightMap:J,bumpMap:K,normalMap:rt,displacementMap:u&&dt,emissiveMap:xt,normalMapObjectSpace:rt&&_.normalMapType===Wf,normalMapTangentSpace:rt&&_.normalMapType===ld,metalnessMap:pt,roughnessMap:z,anisotropy:R,anisotropyMap:bt,clearcoat:nt,clearcoatMap:Dt,clearcoatNormalMap:ee,clearcoatRoughnessMap:yt,dispersion:ht,iridescence:gt,iridescenceMap:Ot,iridescenceThicknessMap:Yt,sheen:ut,sheenColorMap:Ft,sheenRoughnessMap:Lt,specularMap:le,specularColorMap:te,specularIntensityMap:ve,transmission:Nt,transmissionMap:$,thicknessMap:zt,gradientMap:mt,opaque:_.transparent===!1&&_.blending===Xi&&_.alphaToCoverage===!1,alphaMap:wt,alphaTest:Et,alphaHash:At,combine:_.combine,mapUv:ot&&g(_.map.channel),aoMapUv:D&&g(_.aoMap.channel),lightMapUv:J&&g(_.lightMap.channel),bumpMapUv:K&&g(_.bumpMap.channel),normalMapUv:rt&&g(_.normalMap.channel),displacementMapUv:dt&&g(_.displacementMap.channel),emissiveMapUv:xt&&g(_.emissiveMap.channel),metalnessMapUv:pt&&g(_.metalnessMap.channel),roughnessMapUv:z&&g(_.roughnessMap.channel),anisotropyMapUv:bt&&g(_.anisotropyMap.channel),clearcoatMapUv:Dt&&g(_.clearcoatMap.channel),clearcoatNormalMapUv:ee&&g(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:yt&&g(_.clearcoatRoughnessMap.channel),iridescenceMapUv:Ot&&g(_.iridescenceMap.channel),iridescenceThicknessMapUv:Yt&&g(_.iridescenceThicknessMap.channel),sheenColorMapUv:Ft&&g(_.sheenColorMap.channel),sheenRoughnessMapUv:Lt&&g(_.sheenRoughnessMap.channel),specularMapUv:le&&g(_.specularMap.channel),specularColorMapUv:te&&g(_.specularColorMap.channel),specularIntensityMapUv:ve&&g(_.specularIntensityMap.channel),transmissionMapUv:$&&g(_.transmissionMap.channel),thicknessMapUv:zt&&g(_.thicknessMap.channel),alphaMapUv:wt&&g(_.alphaMap.channel),vertexTangents:!!O.attributes.tangent&&(rt||R),vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!O.attributes.color&&O.attributes.color.itemSize===4,pointsUvs:k.isPoints===!0&&!!O.attributes.uv&&(ot||wt),fog:!!I,useFog:_.fog===!0,fogExp2:!!I&&I.isFogExp2,flatShading:_.flatShading===!0,sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:d,reverseDepthBuffer:at,skinning:k.isSkinnedMesh===!0,morphTargets:O.morphAttributes.position!==void 0,morphNormals:O.morphAttributes.normal!==void 0,morphColors:O.morphAttributes.color!==void 0,morphTargetsCount:Y,morphTextureStride:V,numDirLights:E.directional.length,numPointLights:E.point.length,numSpotLights:E.spot.length,numSpotLightMaps:E.spotLightMap.length,numRectAreaLights:E.rectArea.length,numHemiLights:E.hemi.length,numDirLightShadows:E.directionalShadowMap.length,numPointLightShadows:E.pointShadowMap.length,numSpotLightShadows:E.spotShadowMap.length,numSpotLightShadowsWithMaps:E.numSpotLightShadowsWithMaps,numLightProbes:E.numLightProbes,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:_.dithering,shadowMapEnabled:s.shadowMap.enabled&&T.length>0,shadowMapType:s.shadowMap.type,toneMapping:Me,decodeVideoTexture:ot&&_.map.isVideoTexture===!0&&ye.getTransfer(_.map.colorSpace)===Pe,decodeVideoTextureEmissive:xt&&_.emissiveMap.isVideoTexture===!0&&ye.getTransfer(_.emissiveMap.colorSpace)===Pe,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===nn,flipSided:_.side===An,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:ie&&_.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ie&&_.extensions.multiDraw===!0||Z)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return Ve.vertexUv1s=h.has(1),Ve.vertexUv2s=h.has(2),Ve.vertexUv3s=h.has(3),h.clear(),Ve}function m(_){const E=[];if(_.shaderID?E.push(_.shaderID):(E.push(_.customVertexShaderID),E.push(_.customFragmentShaderID)),_.defines!==void 0)for(const T in _.defines)E.push(T),E.push(_.defines[T]);return _.isRawShaderMaterial===!1&&(y(E,_),w(E,_),E.push(s.outputColorSpace)),E.push(_.customProgramCacheKey),E.join()}function y(_,E){_.push(E.precision),_.push(E.outputColorSpace),_.push(E.envMapMode),_.push(E.envMapCubeUVHeight),_.push(E.mapUv),_.push(E.alphaMapUv),_.push(E.lightMapUv),_.push(E.aoMapUv),_.push(E.bumpMapUv),_.push(E.normalMapUv),_.push(E.displacementMapUv),_.push(E.emissiveMapUv),_.push(E.metalnessMapUv),_.push(E.roughnessMapUv),_.push(E.anisotropyMapUv),_.push(E.clearcoatMapUv),_.push(E.clearcoatNormalMapUv),_.push(E.clearcoatRoughnessMapUv),_.push(E.iridescenceMapUv),_.push(E.iridescenceThicknessMapUv),_.push(E.sheenColorMapUv),_.push(E.sheenRoughnessMapUv),_.push(E.specularMapUv),_.push(E.specularColorMapUv),_.push(E.specularIntensityMapUv),_.push(E.transmissionMapUv),_.push(E.thicknessMapUv),_.push(E.combine),_.push(E.fogExp2),_.push(E.sizeAttenuation),_.push(E.morphTargetsCount),_.push(E.morphAttributeCount),_.push(E.numDirLights),_.push(E.numPointLights),_.push(E.numSpotLights),_.push(E.numSpotLightMaps),_.push(E.numHemiLights),_.push(E.numRectAreaLights),_.push(E.numDirLightShadows),_.push(E.numPointLightShadows),_.push(E.numSpotLightShadows),_.push(E.numSpotLightShadowsWithMaps),_.push(E.numLightProbes),_.push(E.shadowMapType),_.push(E.toneMapping),_.push(E.numClippingPlanes),_.push(E.numClipIntersection),_.push(E.depthPacking)}function w(_,E){a.disableAll(),E.supportsVertexTextures&&a.enable(0),E.instancing&&a.enable(1),E.instancingColor&&a.enable(2),E.instancingMorph&&a.enable(3),E.matcap&&a.enable(4),E.envMap&&a.enable(5),E.normalMapObjectSpace&&a.enable(6),E.normalMapTangentSpace&&a.enable(7),E.clearcoat&&a.enable(8),E.iridescence&&a.enable(9),E.alphaTest&&a.enable(10),E.vertexColors&&a.enable(11),E.vertexAlphas&&a.enable(12),E.vertexUv1s&&a.enable(13),E.vertexUv2s&&a.enable(14),E.vertexUv3s&&a.enable(15),E.vertexTangents&&a.enable(16),E.anisotropy&&a.enable(17),E.alphaHash&&a.enable(18),E.batching&&a.enable(19),E.dispersion&&a.enable(20),E.batchingColor&&a.enable(21),_.push(a.mask),a.disableAll(),E.fog&&a.enable(0),E.useFog&&a.enable(1),E.flatShading&&a.enable(2),E.logarithmicDepthBuffer&&a.enable(3),E.reverseDepthBuffer&&a.enable(4),E.skinning&&a.enable(5),E.morphTargets&&a.enable(6),E.morphNormals&&a.enable(7),E.morphColors&&a.enable(8),E.premultipliedAlpha&&a.enable(9),E.shadowMapEnabled&&a.enable(10),E.doubleSided&&a.enable(11),E.flipSided&&a.enable(12),E.useDepthPacking&&a.enable(13),E.dithering&&a.enable(14),E.transmission&&a.enable(15),E.sheen&&a.enable(16),E.opaque&&a.enable(17),E.pointsUvs&&a.enable(18),E.decodeVideoTexture&&a.enable(19),E.decodeVideoTextureEmissive&&a.enable(20),E.alphaToCoverage&&a.enable(21),_.push(a.mask)}function x(_){const E=p[_.type];let T;if(E){const F=vi[E];T=Fp.clone(F.uniforms)}else T=_.uniforms;return T}function b(_,E){let T;for(let F=0,k=c.length;F<k;F++){const I=c[F];if(I.cacheKey===E){T=I,++T.usedTimes;break}}return T===void 0&&(T=new Zv(s,E,_,o),c.push(T)),T}function M(_){if(--_.usedTimes===0){const E=c.indexOf(_);c[E]=c[c.length-1],c.pop(),_.destroy()}}function A(_){l.remove(_)}function S(){l.dispose()}return{getParameters:f,getProgramCacheKey:m,getUniforms:x,acquireProgram:b,releaseProgram:M,releaseShaderCache:A,programs:c,dispose:S}}function ex(){let s=new WeakMap;function t(r){return s.has(r)}function e(r){let a=s.get(r);return a===void 0&&(a={},s.set(r,a)),a}function n(r){s.delete(r)}function i(r,a,l){s.get(r)[a]=l}function o(){s=new WeakMap}return{has:t,get:e,remove:n,update:i,dispose:o}}function nx(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.material.id!==t.material.id?s.material.id-t.material.id:s.z!==t.z?s.z-t.z:s.id-t.id}function U0(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.z!==t.z?t.z-s.z:s.id-t.id}function F0(){const s=[];let t=0;const e=[],n=[],i=[];function o(){t=0,e.length=0,n.length=0,i.length=0}function r(d,u,v,p,g,f){let m=s[t];return m===void 0?(m={id:d.id,object:d,geometry:u,material:v,groupOrder:p,renderOrder:d.renderOrder,z:g,group:f},s[t]=m):(m.id=d.id,m.object=d,m.geometry=u,m.material=v,m.groupOrder=p,m.renderOrder=d.renderOrder,m.z=g,m.group=f),t++,m}function a(d,u,v,p,g,f){const m=r(d,u,v,p,g,f);v.transmission>0?n.push(m):v.transparent===!0?i.push(m):e.push(m)}function l(d,u,v,p,g,f){const m=r(d,u,v,p,g,f);v.transmission>0?n.unshift(m):v.transparent===!0?i.unshift(m):e.unshift(m)}function h(d,u){e.length>1&&e.sort(d||nx),n.length>1&&n.sort(u||U0),i.length>1&&i.sort(u||U0)}function c(){for(let d=t,u=s.length;d<u;d++){const v=s[d];if(v.id===null)break;v.id=null,v.object=null,v.geometry=null,v.material=null,v.group=null}}return{opaque:e,transmissive:n,transparent:i,init:o,push:a,unshift:l,finish:c,sort:h}}function ix(){let s=new WeakMap;function t(n,i){const o=s.get(n);let r;return o===void 0?(r=new F0,s.set(n,[r])):i>=o.length?(r=new F0,o.push(r)):r=o[i],r}function e(){s=new WeakMap}return{get:t,dispose:e}}function sx(){const s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new C,color:new Ht};break;case"SpotLight":e={position:new C,direction:new C,color:new Ht,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new C,color:new Ht,distance:0,decay:0};break;case"HemisphereLight":e={direction:new C,skyColor:new Ht,groundColor:new Ht};break;case"RectAreaLight":e={color:new Ht,position:new C,halfWidth:new C,halfHeight:new C};break}return s[t.id]=e,e}}}function ox(){const s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Rt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Rt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Rt,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[t.id]=e,e}}}let rx=0;function ax(s,t){return(t.castShadow?2:0)-(s.castShadow?2:0)+(t.map?1:0)-(s.map?1:0)}function lx(s){const t=new sx,e=ox(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let h=0;h<9;h++)n.probe.push(new C);const i=new C,o=new jt,r=new jt;function a(h){let c=0,d=0,u=0;for(let _=0;_<9;_++)n.probe[_].set(0,0,0);let v=0,p=0,g=0,f=0,m=0,y=0,w=0,x=0,b=0,M=0,A=0;h.sort(ax);for(let _=0,E=h.length;_<E;_++){const T=h[_],F=T.color,k=T.intensity,I=T.distance,O=T.shadow&&T.shadow.map?T.shadow.map.texture:null;if(T.isAmbientLight)c+=F.r*k,d+=F.g*k,u+=F.b*k;else if(T.isLightProbe){for(let U=0;U<9;U++)n.probe[U].addScaledVector(T.sh.coefficients[U],k);A++}else if(T.isDirectionalLight){const U=t.get(T);if(U.color.copy(T.color).multiplyScalar(T.intensity),T.castShadow){const P=T.shadow,H=e.get(T);H.shadowIntensity=P.intensity,H.shadowBias=P.bias,H.shadowNormalBias=P.normalBias,H.shadowRadius=P.radius,H.shadowMapSize=P.mapSize,n.directionalShadow[v]=H,n.directionalShadowMap[v]=O,n.directionalShadowMatrix[v]=T.shadow.matrix,y++}n.directional[v]=U,v++}else if(T.isSpotLight){const U=t.get(T);U.position.setFromMatrixPosition(T.matrixWorld),U.color.copy(F).multiplyScalar(k),U.distance=I,U.coneCos=Math.cos(T.angle),U.penumbraCos=Math.cos(T.angle*(1-T.penumbra)),U.decay=T.decay,n.spot[g]=U;const P=T.shadow;if(T.map&&(n.spotLightMap[b]=T.map,b++,P.updateMatrices(T),T.castShadow&&M++),n.spotLightMatrix[g]=P.matrix,T.castShadow){const H=e.get(T);H.shadowIntensity=P.intensity,H.shadowBias=P.bias,H.shadowNormalBias=P.normalBias,H.shadowRadius=P.radius,H.shadowMapSize=P.mapSize,n.spotShadow[g]=H,n.spotShadowMap[g]=O,x++}g++}else if(T.isRectAreaLight){const U=t.get(T);U.color.copy(F).multiplyScalar(k),U.halfWidth.set(T.width*.5,0,0),U.halfHeight.set(0,T.height*.5,0),n.rectArea[f]=U,f++}else if(T.isPointLight){const U=t.get(T);if(U.color.copy(T.color).multiplyScalar(T.intensity),U.distance=T.distance,U.decay=T.decay,T.castShadow){const P=T.shadow,H=e.get(T);H.shadowIntensity=P.intensity,H.shadowBias=P.bias,H.shadowNormalBias=P.normalBias,H.shadowRadius=P.radius,H.shadowMapSize=P.mapSize,H.shadowCameraNear=P.camera.near,H.shadowCameraFar=P.camera.far,n.pointShadow[p]=H,n.pointShadowMap[p]=O,n.pointShadowMatrix[p]=T.shadow.matrix,w++}n.point[p]=U,p++}else if(T.isHemisphereLight){const U=t.get(T);U.skyColor.copy(T.color).multiplyScalar(k),U.groundColor.copy(T.groundColor).multiplyScalar(k),n.hemi[m]=U,m++}}f>0&&(s.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Ut.LTC_FLOAT_1,n.rectAreaLTC2=Ut.LTC_FLOAT_2):(n.rectAreaLTC1=Ut.LTC_HALF_1,n.rectAreaLTC2=Ut.LTC_HALF_2)),n.ambient[0]=c,n.ambient[1]=d,n.ambient[2]=u;const S=n.hash;(S.directionalLength!==v||S.pointLength!==p||S.spotLength!==g||S.rectAreaLength!==f||S.hemiLength!==m||S.numDirectionalShadows!==y||S.numPointShadows!==w||S.numSpotShadows!==x||S.numSpotMaps!==b||S.numLightProbes!==A)&&(n.directional.length=v,n.spot.length=g,n.rectArea.length=f,n.point.length=p,n.hemi.length=m,n.directionalShadow.length=y,n.directionalShadowMap.length=y,n.pointShadow.length=w,n.pointShadowMap.length=w,n.spotShadow.length=x,n.spotShadowMap.length=x,n.directionalShadowMatrix.length=y,n.pointShadowMatrix.length=w,n.spotLightMatrix.length=x+b-M,n.spotLightMap.length=b,n.numSpotLightShadowsWithMaps=M,n.numLightProbes=A,S.directionalLength=v,S.pointLength=p,S.spotLength=g,S.rectAreaLength=f,S.hemiLength=m,S.numDirectionalShadows=y,S.numPointShadows=w,S.numSpotShadows=x,S.numSpotMaps=b,S.numLightProbes=A,n.version=rx++)}function l(h,c){let d=0,u=0,v=0,p=0,g=0;const f=c.matrixWorldInverse;for(let m=0,y=h.length;m<y;m++){const w=h[m];if(w.isDirectionalLight){const x=n.directional[d];x.direction.setFromMatrixPosition(w.matrixWorld),i.setFromMatrixPosition(w.target.matrixWorld),x.direction.sub(i),x.direction.transformDirection(f),d++}else if(w.isSpotLight){const x=n.spot[v];x.position.setFromMatrixPosition(w.matrixWorld),x.position.applyMatrix4(f),x.direction.setFromMatrixPosition(w.matrixWorld),i.setFromMatrixPosition(w.target.matrixWorld),x.direction.sub(i),x.direction.transformDirection(f),v++}else if(w.isRectAreaLight){const x=n.rectArea[p];x.position.setFromMatrixPosition(w.matrixWorld),x.position.applyMatrix4(f),r.identity(),o.copy(w.matrixWorld),o.premultiply(f),r.extractRotation(o),x.halfWidth.set(w.width*.5,0,0),x.halfHeight.set(0,w.height*.5,0),x.halfWidth.applyMatrix4(r),x.halfHeight.applyMatrix4(r),p++}else if(w.isPointLight){const x=n.point[u];x.position.setFromMatrixPosition(w.matrixWorld),x.position.applyMatrix4(f),u++}else if(w.isHemisphereLight){const x=n.hemi[g];x.direction.setFromMatrixPosition(w.matrixWorld),x.direction.transformDirection(f),g++}}}return{setup:a,setupView:l,state:n}}function k0(s){const t=new lx(s),e=[],n=[];function i(c){h.camera=c,e.length=0,n.length=0}function o(c){e.push(c)}function r(c){n.push(c)}function a(){t.setup(e)}function l(c){t.setupView(e,c)}const h={lightsArray:e,shadowsArray:n,camera:null,lights:t,transmissionRenderTarget:{}};return{init:i,state:h,setupLights:a,setupLightsView:l,pushLight:o,pushShadow:r}}function cx(s){let t=new WeakMap;function e(i,o=0){const r=t.get(i);let a;return r===void 0?(a=new k0(s),t.set(i,[a])):o>=r.length?(a=new k0(s),r.push(a)):a=r[o],a}function n(){t=new WeakMap}return{get:e,dispose:n}}class Td extends Ho{static get type(){return"MeshDepthMaterial"}constructor(t){super(),this.isMeshDepthMaterial=!0,this.depthPacking=Vf,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class hx extends Ho{static get type(){return"MeshDistanceMaterial"}constructor(t){super(),this.isMeshDistanceMaterial=!0,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}const ux=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,dx=`uniform sampler2D shadow_pass;
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
}`;function fx(s,t,e){let n=new fs;const i=new Rt,o=new Rt,r=new Ne,a=new Td({depthPacking:ad}),l=new hx,h={},c=e.maxTextureSize,d={[Ki]:An,[An]:Ki,[nn]:nn},u=new Ge({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Rt},radius:{value:4}},vertexShader:ux,fragmentShader:dx}),v=u.clone();v.defines.HORIZONTAL_PASS=1;const p=new oe;p.setAttribute("position",new fe(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const g=new pe(p,u),f=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=$u;let m=this.type;this.render=function(M,A,S){if(f.enabled===!1||f.autoUpdate===!1&&f.needsUpdate===!1||M.length===0)return;const _=s.getRenderTarget(),E=s.getActiveCubeFace(),T=s.getActiveMipmapLevel(),F=s.state;F.setBlending(ms),F.buffers.color.setClear(1,1,1,1),F.buffers.depth.setTest(!0),F.setScissorTest(!1);const k=m!==Bi&&this.type===Bi,I=m===Bi&&this.type!==Bi;for(let O=0,U=M.length;O<U;O++){const P=M[O],H=P.shadow;if(H===void 0){console.warn("THREE.WebGLShadowMap:",P,"has no shadow.");continue}if(H.autoUpdate===!1&&H.needsUpdate===!1)continue;i.copy(H.mapSize);const G=H.getFrameExtents();if(i.multiply(G),o.copy(H.mapSize),(i.x>c||i.y>c)&&(i.x>c&&(o.x=Math.floor(c/G.x),i.x=o.x*G.x,H.mapSize.x=o.x),i.y>c&&(o.y=Math.floor(c/G.y),i.y=o.y*G.y,H.mapSize.y=o.y)),H.map===null||k===!0||I===!0){const Y=this.type!==Bi?{minFilter:Nn,magFilter:Nn}:{};H.map!==null&&H.map.dispose(),H.map=new vn(i.x,i.y,Y),H.map.texture.name=P.name+".shadowMap",H.camera.updateProjectionMatrix()}s.setRenderTarget(H.map),s.clear();const N=H.getViewportCount();for(let Y=0;Y<N;Y++){const V=H.getViewport(Y);r.set(o.x*V.x,o.y*V.y,o.x*V.z,o.y*V.w),F.viewport(r),H.updateMatrices(P,Y),n=H.getFrustum(),x(A,S,H.camera,P,this.type)}H.isPointLightShadow!==!0&&this.type===Bi&&y(H,S),H.needsUpdate=!1}m=this.type,f.needsUpdate=!1,s.setRenderTarget(_,E,T)};function y(M,A){const S=t.update(g);u.defines.VSM_SAMPLES!==M.blurSamples&&(u.defines.VSM_SAMPLES=M.blurSamples,v.defines.VSM_SAMPLES=M.blurSamples,u.needsUpdate=!0,v.needsUpdate=!0),M.mapPass===null&&(M.mapPass=new vn(i.x,i.y)),u.uniforms.shadow_pass.value=M.map.texture,u.uniforms.resolution.value=M.mapSize,u.uniforms.radius.value=M.radius,s.setRenderTarget(M.mapPass),s.clear(),s.renderBufferDirect(A,null,S,u,g,null),v.uniforms.shadow_pass.value=M.mapPass.texture,v.uniforms.resolution.value=M.mapSize,v.uniforms.radius.value=M.radius,s.setRenderTarget(M.map),s.clear(),s.renderBufferDirect(A,null,S,v,g,null)}function w(M,A,S,_){let E=null;const T=S.isPointLight===!0?M.customDistanceMaterial:M.customDepthMaterial;if(T!==void 0)E=T;else if(E=S.isPointLight===!0?l:a,s.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0){const F=E.uuid,k=A.uuid;let I=h[F];I===void 0&&(I={},h[F]=I);let O=I[k];O===void 0&&(O=E.clone(),I[k]=O,A.addEventListener("dispose",b)),E=O}if(E.visible=A.visible,E.wireframe=A.wireframe,_===Bi?E.side=A.shadowSide!==null?A.shadowSide:A.side:E.side=A.shadowSide!==null?A.shadowSide:d[A.side],E.alphaMap=A.alphaMap,E.alphaTest=A.alphaTest,E.map=A.map,E.clipShadows=A.clipShadows,E.clippingPlanes=A.clippingPlanes,E.clipIntersection=A.clipIntersection,E.displacementMap=A.displacementMap,E.displacementScale=A.displacementScale,E.displacementBias=A.displacementBias,E.wireframeLinewidth=A.wireframeLinewidth,E.linewidth=A.linewidth,S.isPointLight===!0&&E.isMeshDistanceMaterial===!0){const F=s.properties.get(E);F.light=S}return E}function x(M,A,S,_,E){if(M.visible===!1)return;if(M.layers.test(A.layers)&&(M.isMesh||M.isLine||M.isPoints)&&(M.castShadow||M.receiveShadow&&E===Bi)&&(!M.frustumCulled||n.intersectsObject(M))){M.modelViewMatrix.multiplyMatrices(S.matrixWorldInverse,M.matrixWorld);const k=t.update(M),I=M.material;if(Array.isArray(I)){const O=k.groups;for(let U=0,P=O.length;U<P;U++){const H=O[U],G=I[H.materialIndex];if(G&&G.visible){const N=w(M,G,_,E);M.onBeforeShadow(s,M,A,S,k,N,H),s.renderBufferDirect(S,null,k,N,M,H),M.onAfterShadow(s,M,A,S,k,N,H)}}}else if(I.visible){const O=w(M,I,_,E);M.onBeforeShadow(s,M,A,S,k,O,null),s.renderBufferDirect(S,null,k,O,M,null),M.onAfterShadow(s,M,A,S,k,O,null)}}const F=M.children;for(let k=0,I=F.length;k<I;k++)x(F[k],A,S,_,E)}function b(M){M.target.removeEventListener("dispose",b);for(const S in h){const _=h[S],E=M.target.uuid;E in _&&(_[E].dispose(),delete _[E])}}}const px={[hc]:uc,[dc]:mc,[fc]:gc,[To]:pc,[uc]:hc,[mc]:dc,[gc]:fc,[pc]:To};function mx(s,t){function e(){let $=!1;const zt=new Ne;let mt=null;const wt=new Ne(0,0,0,0);return{setMask:function(Et){mt!==Et&&!$&&(s.colorMask(Et,Et,Et,Et),mt=Et)},setLocked:function(Et){$=Et},setClear:function(Et,At,ie,Me,Ve){Ve===!0&&(Et*=Me,At*=Me,ie*=Me),zt.set(Et,At,ie,Me),wt.equals(zt)===!1&&(s.clearColor(Et,At,ie,Me),wt.copy(zt))},reset:function(){$=!1,mt=null,wt.set(-1,0,0,0)}}}function n(){let $=!1,zt=!1,mt=null,wt=null,Et=null;return{setReversed:function(At){if(zt!==At){const ie=t.get("EXT_clip_control");zt?ie.clipControlEXT(ie.LOWER_LEFT_EXT,ie.ZERO_TO_ONE_EXT):ie.clipControlEXT(ie.LOWER_LEFT_EXT,ie.NEGATIVE_ONE_TO_ONE_EXT);const Me=Et;Et=null,this.setClear(Me)}zt=At},getReversed:function(){return zt},setTest:function(At){At?it(s.DEPTH_TEST):at(s.DEPTH_TEST)},setMask:function(At){mt!==At&&!$&&(s.depthMask(At),mt=At)},setFunc:function(At){if(zt&&(At=px[At]),wt!==At){switch(At){case hc:s.depthFunc(s.NEVER);break;case uc:s.depthFunc(s.ALWAYS);break;case dc:s.depthFunc(s.LESS);break;case To:s.depthFunc(s.LEQUAL);break;case fc:s.depthFunc(s.EQUAL);break;case pc:s.depthFunc(s.GEQUAL);break;case mc:s.depthFunc(s.GREATER);break;case gc:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}wt=At}},setLocked:function(At){$=At},setClear:function(At){Et!==At&&(zt&&(At=1-At),s.clearDepth(At),Et=At)},reset:function(){$=!1,mt=null,wt=null,Et=null,zt=!1}}}function i(){let $=!1,zt=null,mt=null,wt=null,Et=null,At=null,ie=null,Me=null,Ve=null;return{setTest:function(ue){$||(ue?it(s.STENCIL_TEST):at(s.STENCIL_TEST))},setMask:function(ue){zt!==ue&&!$&&(s.stencilMask(ue),zt=ue)},setFunc:function(ue,Fe,dn){(mt!==ue||wt!==Fe||Et!==dn)&&(s.stencilFunc(ue,Fe,dn),mt=ue,wt=Fe,Et=dn)},setOp:function(ue,Fe,dn){(At!==ue||ie!==Fe||Me!==dn)&&(s.stencilOp(ue,Fe,dn),At=ue,ie=Fe,Me=dn)},setLocked:function(ue){$=ue},setClear:function(ue){Ve!==ue&&(s.clearStencil(ue),Ve=ue)},reset:function(){$=!1,zt=null,mt=null,wt=null,Et=null,At=null,ie=null,Me=null,Ve=null}}}const o=new e,r=new n,a=new i,l=new WeakMap,h=new WeakMap;let c={},d={},u=new WeakMap,v=[],p=null,g=!1,f=null,m=null,y=null,w=null,x=null,b=null,M=null,A=new Ht(0,0,0),S=0,_=!1,E=null,T=null,F=null,k=null,I=null;const O=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let U=!1,P=0;const H=s.getParameter(s.VERSION);H.indexOf("WebGL")!==-1?(P=parseFloat(/^WebGL (\d)/.exec(H)[1]),U=P>=1):H.indexOf("OpenGL ES")!==-1&&(P=parseFloat(/^OpenGL ES (\d)/.exec(H)[1]),U=P>=2);let G=null,N={};const Y=s.getParameter(s.SCISSOR_BOX),V=s.getParameter(s.VIEWPORT),Q=new Ne().fromArray(Y),W=new Ne().fromArray(V);function q($,zt,mt,wt){const Et=new Uint8Array(4),At=s.createTexture();s.bindTexture($,At),s.texParameteri($,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri($,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let ie=0;ie<mt;ie++)$===s.TEXTURE_3D||$===s.TEXTURE_2D_ARRAY?s.texImage3D(zt,0,s.RGBA,1,1,wt,0,s.RGBA,s.UNSIGNED_BYTE,Et):s.texImage2D(zt+ie,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,Et);return At}const X={};X[s.TEXTURE_2D]=q(s.TEXTURE_2D,s.TEXTURE_2D,1),X[s.TEXTURE_CUBE_MAP]=q(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),X[s.TEXTURE_2D_ARRAY]=q(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),X[s.TEXTURE_3D]=q(s.TEXTURE_3D,s.TEXTURE_3D,1,1),o.setClear(0,0,0,1),r.setClear(1),a.setClear(0),it(s.DEPTH_TEST),r.setFunc(To),K(!1),rt(Gh),it(s.CULL_FACE),D(ms);function it($){c[$]!==!0&&(s.enable($),c[$]=!0)}function at($){c[$]!==!1&&(s.disable($),c[$]=!1)}function ft($,zt){return d[$]!==zt?(s.bindFramebuffer($,zt),d[$]=zt,$===s.DRAW_FRAMEBUFFER&&(d[s.FRAMEBUFFER]=zt),$===s.FRAMEBUFFER&&(d[s.DRAW_FRAMEBUFFER]=zt),!0):!1}function Z($,zt){let mt=v,wt=!1;if($){mt=u.get(zt),mt===void 0&&(mt=[],u.set(zt,mt));const Et=$.textures;if(mt.length!==Et.length||mt[0]!==s.COLOR_ATTACHMENT0){for(let At=0,ie=Et.length;At<ie;At++)mt[At]=s.COLOR_ATTACHMENT0+At;mt.length=Et.length,wt=!0}}else mt[0]!==s.BACK&&(mt[0]=s.BACK,wt=!0);wt&&s.drawBuffers(mt)}function ot($){return p!==$?(s.useProgram($),p=$,!0):!1}const j={[Us]:s.FUNC_ADD,[gf]:s.FUNC_SUBTRACT,[vf]:s.FUNC_REVERSE_SUBTRACT};j[xf]=s.MIN,j[wf]=s.MAX;const et={[yf]:s.ZERO,[_f]:s.ONE,[Mf]:s.SRC_COLOR,[lc]:s.SRC_ALPHA,[Cf]:s.SRC_ALPHA_SATURATE,[Af]:s.DST_COLOR,[Sf]:s.DST_ALPHA,[bf]:s.ONE_MINUS_SRC_COLOR,[cc]:s.ONE_MINUS_SRC_ALPHA,[Tf]:s.ONE_MINUS_DST_COLOR,[Ef]:s.ONE_MINUS_DST_ALPHA,[Rf]:s.CONSTANT_COLOR,[Pf]:s.ONE_MINUS_CONSTANT_COLOR,[Lf]:s.CONSTANT_ALPHA,[Df]:s.ONE_MINUS_CONSTANT_ALPHA};function D($,zt,mt,wt,Et,At,ie,Me,Ve,ue){if($===ms){g===!0&&(at(s.BLEND),g=!1);return}if(g===!1&&(it(s.BLEND),g=!0),$!==mf){if($!==f||ue!==_){if((m!==Us||x!==Us)&&(s.blendEquation(s.FUNC_ADD),m=Us,x=Us),ue)switch($){case Xi:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case Vh:s.blendFunc(s.ONE,s.ONE);break;case Wh:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case Xh:s.blendFuncSeparate(s.ZERO,s.SRC_COLOR,s.ZERO,s.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",$);break}else switch($){case Xi:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case Vh:s.blendFunc(s.SRC_ALPHA,s.ONE);break;case Wh:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case Xh:s.blendFunc(s.ZERO,s.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",$);break}y=null,w=null,b=null,M=null,A.set(0,0,0),S=0,f=$,_=ue}return}Et=Et||zt,At=At||mt,ie=ie||wt,(zt!==m||Et!==x)&&(s.blendEquationSeparate(j[zt],j[Et]),m=zt,x=Et),(mt!==y||wt!==w||At!==b||ie!==M)&&(s.blendFuncSeparate(et[mt],et[wt],et[At],et[ie]),y=mt,w=wt,b=At,M=ie),(Me.equals(A)===!1||Ve!==S)&&(s.blendColor(Me.r,Me.g,Me.b,Ve),A.copy(Me),S=Ve),f=$,_=!1}function J($,zt){$.side===nn?at(s.CULL_FACE):it(s.CULL_FACE);let mt=$.side===An;zt&&(mt=!mt),K(mt),$.blending===Xi&&$.transparent===!1?D(ms):D($.blending,$.blendEquation,$.blendSrc,$.blendDst,$.blendEquationAlpha,$.blendSrcAlpha,$.blendDstAlpha,$.blendColor,$.blendAlpha,$.premultipliedAlpha),r.setFunc($.depthFunc),r.setTest($.depthTest),r.setMask($.depthWrite),o.setMask($.colorWrite);const wt=$.stencilWrite;a.setTest(wt),wt&&(a.setMask($.stencilWriteMask),a.setFunc($.stencilFunc,$.stencilRef,$.stencilFuncMask),a.setOp($.stencilFail,$.stencilZFail,$.stencilZPass)),xt($.polygonOffset,$.polygonOffsetFactor,$.polygonOffsetUnits),$.alphaToCoverage===!0?it(s.SAMPLE_ALPHA_TO_COVERAGE):at(s.SAMPLE_ALPHA_TO_COVERAGE)}function K($){E!==$&&($?s.frontFace(s.CW):s.frontFace(s.CCW),E=$)}function rt($){$!==ff?(it(s.CULL_FACE),$!==T&&($===Gh?s.cullFace(s.BACK):$===pf?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):at(s.CULL_FACE),T=$}function dt($){$!==F&&(U&&s.lineWidth($),F=$)}function xt($,zt,mt){$?(it(s.POLYGON_OFFSET_FILL),(k!==zt||I!==mt)&&(s.polygonOffset(zt,mt),k=zt,I=mt)):at(s.POLYGON_OFFSET_FILL)}function pt($){$?it(s.SCISSOR_TEST):at(s.SCISSOR_TEST)}function z($){$===void 0&&($=s.TEXTURE0+O-1),G!==$&&(s.activeTexture($),G=$)}function R($,zt,mt){mt===void 0&&(G===null?mt=s.TEXTURE0+O-1:mt=G);let wt=N[mt];wt===void 0&&(wt={type:void 0,texture:void 0},N[mt]=wt),(wt.type!==$||wt.texture!==zt)&&(G!==mt&&(s.activeTexture(mt),G=mt),s.bindTexture($,zt||X[$]),wt.type=$,wt.texture=zt)}function nt(){const $=N[G];$!==void 0&&$.type!==void 0&&(s.bindTexture($.type,null),$.type=void 0,$.texture=void 0)}function ht(){try{s.compressedTexImage2D.apply(s,arguments)}catch($){console.error("THREE.WebGLState:",$)}}function gt(){try{s.compressedTexImage3D.apply(s,arguments)}catch($){console.error("THREE.WebGLState:",$)}}function ut(){try{s.texSubImage2D.apply(s,arguments)}catch($){console.error("THREE.WebGLState:",$)}}function Nt(){try{s.texSubImage3D.apply(s,arguments)}catch($){console.error("THREE.WebGLState:",$)}}function bt(){try{s.compressedTexSubImage2D.apply(s,arguments)}catch($){console.error("THREE.WebGLState:",$)}}function Dt(){try{s.compressedTexSubImage3D.apply(s,arguments)}catch($){console.error("THREE.WebGLState:",$)}}function ee(){try{s.texStorage2D.apply(s,arguments)}catch($){console.error("THREE.WebGLState:",$)}}function yt(){try{s.texStorage3D.apply(s,arguments)}catch($){console.error("THREE.WebGLState:",$)}}function Ot(){try{s.texImage2D.apply(s,arguments)}catch($){console.error("THREE.WebGLState:",$)}}function Yt(){try{s.texImage3D.apply(s,arguments)}catch($){console.error("THREE.WebGLState:",$)}}function Ft($){Q.equals($)===!1&&(s.scissor($.x,$.y,$.z,$.w),Q.copy($))}function Lt($){W.equals($)===!1&&(s.viewport($.x,$.y,$.z,$.w),W.copy($))}function le($,zt){let mt=h.get(zt);mt===void 0&&(mt=new WeakMap,h.set(zt,mt));let wt=mt.get($);wt===void 0&&(wt=s.getUniformBlockIndex(zt,$.name),mt.set($,wt))}function te($,zt){const wt=h.get(zt).get($);l.get(zt)!==wt&&(s.uniformBlockBinding(zt,wt,$.__bindingPointIndex),l.set(zt,wt))}function ve(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),r.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),c={},G=null,N={},d={},u=new WeakMap,v=[],p=null,g=!1,f=null,m=null,y=null,w=null,x=null,b=null,M=null,A=new Ht(0,0,0),S=0,_=!1,E=null,T=null,F=null,k=null,I=null,Q.set(0,0,s.canvas.width,s.canvas.height),W.set(0,0,s.canvas.width,s.canvas.height),o.reset(),r.reset(),a.reset()}return{buffers:{color:o,depth:r,stencil:a},enable:it,disable:at,bindFramebuffer:ft,drawBuffers:Z,useProgram:ot,setBlending:D,setMaterial:J,setFlipSided:K,setCullFace:rt,setLineWidth:dt,setPolygonOffset:xt,setScissorTest:pt,activeTexture:z,bindTexture:R,unbindTexture:nt,compressedTexImage2D:ht,compressedTexImage3D:gt,texImage2D:Ot,texImage3D:Yt,updateUBOMapping:le,uniformBlockBinding:te,texStorage2D:ee,texStorage3D:yt,texSubImage2D:ut,texSubImage3D:Nt,compressedTexSubImage2D:bt,compressedTexSubImage3D:Dt,scissor:Ft,viewport:Lt,reset:ve}}function O0(s,t,e,n){const i=gx(n);switch(e){case ed:return s*t;case id:return s*t;case sd:return s*t*2;case Lr:return s*t/i.components*i.byteLength;case Wa:return s*t/i.components*i.byteLength;case od:return s*t*2/i.components*i.byteLength;case rh:return s*t*2/i.components*i.byteLength;case nd:return s*t*3/i.components*i.byteLength;case En:return s*t*4/i.components*i.byteLength;case ah:return s*t*4/i.components*i.byteLength;case Sa:case Ea:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*8;case Aa:case Ta:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case _c:case bc:return Math.max(s,16)*Math.max(t,8)/4;case yc:case Mc:return Math.max(s,8)*Math.max(t,8)/2;case Sc:case Ec:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*8;case Ac:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case Tc:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case Cc:return Math.floor((s+4)/5)*Math.floor((t+3)/4)*16;case Rc:return Math.floor((s+4)/5)*Math.floor((t+4)/5)*16;case Pc:return Math.floor((s+5)/6)*Math.floor((t+4)/5)*16;case Lc:return Math.floor((s+5)/6)*Math.floor((t+5)/6)*16;case Dc:return Math.floor((s+7)/8)*Math.floor((t+4)/5)*16;case Ic:return Math.floor((s+7)/8)*Math.floor((t+5)/6)*16;case zc:return Math.floor((s+7)/8)*Math.floor((t+7)/8)*16;case Nc:return Math.floor((s+9)/10)*Math.floor((t+4)/5)*16;case Uc:return Math.floor((s+9)/10)*Math.floor((t+5)/6)*16;case Fc:return Math.floor((s+9)/10)*Math.floor((t+7)/8)*16;case kc:return Math.floor((s+9)/10)*Math.floor((t+9)/10)*16;case Oc:return Math.floor((s+11)/12)*Math.floor((t+9)/10)*16;case Bc:return Math.floor((s+11)/12)*Math.floor((t+11)/12)*16;case Ca:case Hc:case Gc:return Math.ceil(s/4)*Math.ceil(t/4)*16;case rd:case Vc:return Math.ceil(s/4)*Math.ceil(t/4)*8;case Wc:case Xc:return Math.ceil(s/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function gx(s){switch(s){case ei:case Ju:return{byteLength:1,components:1};case Pr:case Qu:case In:return{byteLength:2,components:1};case sh:case oh:return{byteLength:2,components:4};case bi:case ih:case $n:return{byteLength:4,components:1};case td:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${s}.`)}function vx(s,t,e,n,i,o,r){const a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),h=new Rt,c=new WeakMap;let d;const u=new WeakMap;let v=!1;try{v=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function p(z,R){return v?new OffscreenCanvas(z,R):Da("canvas")}function g(z,R,nt){let ht=1;const gt=pt(z);if((gt.width>nt||gt.height>nt)&&(ht=nt/Math.max(gt.width,gt.height)),ht<1)if(typeof HTMLImageElement<"u"&&z instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&z instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&z instanceof ImageBitmap||typeof VideoFrame<"u"&&z instanceof VideoFrame){const ut=Math.floor(ht*gt.width),Nt=Math.floor(ht*gt.height);d===void 0&&(d=p(ut,Nt));const bt=R?p(ut,Nt):d;return bt.width=ut,bt.height=Nt,bt.getContext("2d").drawImage(z,0,0,ut,Nt),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+gt.width+"x"+gt.height+") to ("+ut+"x"+Nt+")."),bt}else return"data"in z&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+gt.width+"x"+gt.height+")."),z;return z}function f(z){return z.generateMipmaps}function m(z){s.generateMipmap(z)}function y(z){return z.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:z.isWebGL3DRenderTarget?s.TEXTURE_3D:z.isWebGLArrayRenderTarget||z.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function w(z,R,nt,ht,gt=!1){if(z!==null){if(s[z]!==void 0)return s[z];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+z+"'")}let ut=R;if(R===s.RED&&(nt===s.FLOAT&&(ut=s.R32F),nt===s.HALF_FLOAT&&(ut=s.R16F),nt===s.UNSIGNED_BYTE&&(ut=s.R8)),R===s.RED_INTEGER&&(nt===s.UNSIGNED_BYTE&&(ut=s.R8UI),nt===s.UNSIGNED_SHORT&&(ut=s.R16UI),nt===s.UNSIGNED_INT&&(ut=s.R32UI),nt===s.BYTE&&(ut=s.R8I),nt===s.SHORT&&(ut=s.R16I),nt===s.INT&&(ut=s.R32I)),R===s.RG&&(nt===s.FLOAT&&(ut=s.RG32F),nt===s.HALF_FLOAT&&(ut=s.RG16F),nt===s.UNSIGNED_BYTE&&(ut=s.RG8)),R===s.RG_INTEGER&&(nt===s.UNSIGNED_BYTE&&(ut=s.RG8UI),nt===s.UNSIGNED_SHORT&&(ut=s.RG16UI),nt===s.UNSIGNED_INT&&(ut=s.RG32UI),nt===s.BYTE&&(ut=s.RG8I),nt===s.SHORT&&(ut=s.RG16I),nt===s.INT&&(ut=s.RG32I)),R===s.RGB_INTEGER&&(nt===s.UNSIGNED_BYTE&&(ut=s.RGB8UI),nt===s.UNSIGNED_SHORT&&(ut=s.RGB16UI),nt===s.UNSIGNED_INT&&(ut=s.RGB32UI),nt===s.BYTE&&(ut=s.RGB8I),nt===s.SHORT&&(ut=s.RGB16I),nt===s.INT&&(ut=s.RGB32I)),R===s.RGBA_INTEGER&&(nt===s.UNSIGNED_BYTE&&(ut=s.RGBA8UI),nt===s.UNSIGNED_SHORT&&(ut=s.RGBA16UI),nt===s.UNSIGNED_INT&&(ut=s.RGBA32UI),nt===s.BYTE&&(ut=s.RGBA8I),nt===s.SHORT&&(ut=s.RGBA16I),nt===s.INT&&(ut=s.RGBA32I)),R===s.RGB&&nt===s.UNSIGNED_INT_5_9_9_9_REV&&(ut=s.RGB9_E5),R===s.RGBA){const Nt=gt?Xa:ye.getTransfer(ht);nt===s.FLOAT&&(ut=s.RGBA32F),nt===s.HALF_FLOAT&&(ut=s.RGBA16F),nt===s.UNSIGNED_BYTE&&(ut=Nt===Pe?s.SRGB8_ALPHA8:s.RGBA8),nt===s.UNSIGNED_SHORT_4_4_4_4&&(ut=s.RGBA4),nt===s.UNSIGNED_SHORT_5_5_5_1&&(ut=s.RGB5_A1)}return(ut===s.R16F||ut===s.R32F||ut===s.RG16F||ut===s.RG32F||ut===s.RGBA16F||ut===s.RGBA32F)&&t.get("EXT_color_buffer_float"),ut}function x(z,R){let nt;return z?R===null||R===bi||R===Lo?nt=s.DEPTH24_STENCIL8:R===$n?nt=s.DEPTH32F_STENCIL8:R===Pr&&(nt=s.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):R===null||R===bi||R===Lo?nt=s.DEPTH_COMPONENT24:R===$n?nt=s.DEPTH_COMPONENT32F:R===Pr&&(nt=s.DEPTH_COMPONENT16),nt}function b(z,R){return f(z)===!0||z.isFramebufferTexture&&z.minFilter!==Nn&&z.minFilter!==_e?Math.log2(Math.max(R.width,R.height))+1:z.mipmaps!==void 0&&z.mipmaps.length>0?z.mipmaps.length:z.isCompressedTexture&&Array.isArray(z.image)?R.mipmaps.length:1}function M(z){const R=z.target;R.removeEventListener("dispose",M),S(R),R.isVideoTexture&&c.delete(R)}function A(z){const R=z.target;R.removeEventListener("dispose",A),E(R)}function S(z){const R=n.get(z);if(R.__webglInit===void 0)return;const nt=z.source,ht=u.get(nt);if(ht){const gt=ht[R.__cacheKey];gt.usedTimes--,gt.usedTimes===0&&_(z),Object.keys(ht).length===0&&u.delete(nt)}n.remove(z)}function _(z){const R=n.get(z);s.deleteTexture(R.__webglTexture);const nt=z.source,ht=u.get(nt);delete ht[R.__cacheKey],r.memory.textures--}function E(z){const R=n.get(z);if(z.depthTexture&&(z.depthTexture.dispose(),n.remove(z.depthTexture)),z.isWebGLCubeRenderTarget)for(let ht=0;ht<6;ht++){if(Array.isArray(R.__webglFramebuffer[ht]))for(let gt=0;gt<R.__webglFramebuffer[ht].length;gt++)s.deleteFramebuffer(R.__webglFramebuffer[ht][gt]);else s.deleteFramebuffer(R.__webglFramebuffer[ht]);R.__webglDepthbuffer&&s.deleteRenderbuffer(R.__webglDepthbuffer[ht])}else{if(Array.isArray(R.__webglFramebuffer))for(let ht=0;ht<R.__webglFramebuffer.length;ht++)s.deleteFramebuffer(R.__webglFramebuffer[ht]);else s.deleteFramebuffer(R.__webglFramebuffer);if(R.__webglDepthbuffer&&s.deleteRenderbuffer(R.__webglDepthbuffer),R.__webglMultisampledFramebuffer&&s.deleteFramebuffer(R.__webglMultisampledFramebuffer),R.__webglColorRenderbuffer)for(let ht=0;ht<R.__webglColorRenderbuffer.length;ht++)R.__webglColorRenderbuffer[ht]&&s.deleteRenderbuffer(R.__webglColorRenderbuffer[ht]);R.__webglDepthRenderbuffer&&s.deleteRenderbuffer(R.__webglDepthRenderbuffer)}const nt=z.textures;for(let ht=0,gt=nt.length;ht<gt;ht++){const ut=n.get(nt[ht]);ut.__webglTexture&&(s.deleteTexture(ut.__webglTexture),r.memory.textures--),n.remove(nt[ht])}n.remove(z)}let T=0;function F(){T=0}function k(){const z=T;return z>=i.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+z+" texture units while this GPU supports only "+i.maxTextures),T+=1,z}function I(z){const R=[];return R.push(z.wrapS),R.push(z.wrapT),R.push(z.wrapR||0),R.push(z.magFilter),R.push(z.minFilter),R.push(z.anisotropy),R.push(z.internalFormat),R.push(z.format),R.push(z.type),R.push(z.generateMipmaps),R.push(z.premultiplyAlpha),R.push(z.flipY),R.push(z.unpackAlignment),R.push(z.colorSpace),R.join()}function O(z,R){const nt=n.get(z);if(z.isVideoTexture&&dt(z),z.isRenderTargetTexture===!1&&z.version>0&&nt.__version!==z.version){const ht=z.image;if(ht===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(ht.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{W(nt,z,R);return}}e.bindTexture(s.TEXTURE_2D,nt.__webglTexture,s.TEXTURE0+R)}function U(z,R){const nt=n.get(z);if(z.version>0&&nt.__version!==z.version){W(nt,z,R);return}e.bindTexture(s.TEXTURE_2D_ARRAY,nt.__webglTexture,s.TEXTURE0+R)}function P(z,R){const nt=n.get(z);if(z.version>0&&nt.__version!==z.version){W(nt,z,R);return}e.bindTexture(s.TEXTURE_3D,nt.__webglTexture,s.TEXTURE0+R)}function H(z,R){const nt=n.get(z);if(z.version>0&&nt.__version!==z.version){q(nt,z,R);return}e.bindTexture(s.TEXTURE_CUBE_MAP,nt.__webglTexture,s.TEXTURE0+R)}const G={[Po]:s.REPEAT,[Qe]:s.CLAMP_TO_EDGE,[wc]:s.MIRRORED_REPEAT},N={[Nn]:s.NEAREST,[Gf]:s.NEAREST_MIPMAP_NEAREST,[Wr]:s.NEAREST_MIPMAP_LINEAR,[_e]:s.LINEAR,[nl]:s.LINEAR_MIPMAP_NEAREST,[Vi]:s.LINEAR_MIPMAP_LINEAR},Y={[Xf]:s.NEVER,[Kf]:s.ALWAYS,[qf]:s.LESS,[cd]:s.LEQUAL,[Yf]:s.EQUAL,[Zf]:s.GEQUAL,[$f]:s.GREATER,[jf]:s.NOTEQUAL};function V(z,R){if(R.type===$n&&t.has("OES_texture_float_linear")===!1&&(R.magFilter===_e||R.magFilter===nl||R.magFilter===Wr||R.magFilter===Vi||R.minFilter===_e||R.minFilter===nl||R.minFilter===Wr||R.minFilter===Vi)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(z,s.TEXTURE_WRAP_S,G[R.wrapS]),s.texParameteri(z,s.TEXTURE_WRAP_T,G[R.wrapT]),(z===s.TEXTURE_3D||z===s.TEXTURE_2D_ARRAY)&&s.texParameteri(z,s.TEXTURE_WRAP_R,G[R.wrapR]),s.texParameteri(z,s.TEXTURE_MAG_FILTER,N[R.magFilter]),s.texParameteri(z,s.TEXTURE_MIN_FILTER,N[R.minFilter]),R.compareFunction&&(s.texParameteri(z,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(z,s.TEXTURE_COMPARE_FUNC,Y[R.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(R.magFilter===Nn||R.minFilter!==Wr&&R.minFilter!==Vi||R.type===$n&&t.has("OES_texture_float_linear")===!1)return;if(R.anisotropy>1||n.get(R).__currentAnisotropy){const nt=t.get("EXT_texture_filter_anisotropic");s.texParameterf(z,nt.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(R.anisotropy,i.getMaxAnisotropy())),n.get(R).__currentAnisotropy=R.anisotropy}}}function Q(z,R){let nt=!1;z.__webglInit===void 0&&(z.__webglInit=!0,R.addEventListener("dispose",M));const ht=R.source;let gt=u.get(ht);gt===void 0&&(gt={},u.set(ht,gt));const ut=I(R);if(ut!==z.__cacheKey){gt[ut]===void 0&&(gt[ut]={texture:s.createTexture(),usedTimes:0},r.memory.textures++,nt=!0),gt[ut].usedTimes++;const Nt=gt[z.__cacheKey];Nt!==void 0&&(gt[z.__cacheKey].usedTimes--,Nt.usedTimes===0&&_(R)),z.__cacheKey=ut,z.__webglTexture=gt[ut].texture}return nt}function W(z,R,nt){let ht=s.TEXTURE_2D;(R.isDataArrayTexture||R.isCompressedArrayTexture)&&(ht=s.TEXTURE_2D_ARRAY),R.isData3DTexture&&(ht=s.TEXTURE_3D);const gt=Q(z,R),ut=R.source;e.bindTexture(ht,z.__webglTexture,s.TEXTURE0+nt);const Nt=n.get(ut);if(ut.version!==Nt.__version||gt===!0){e.activeTexture(s.TEXTURE0+nt);const bt=ye.getPrimaries(ye.workingColorSpace),Dt=R.colorSpace===wi?null:ye.getPrimaries(R.colorSpace),ee=R.colorSpace===wi||bt===Dt?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,R.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,R.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,R.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,ee);let yt=g(R.image,!1,i.maxTextureSize);yt=xt(R,yt);const Ot=o.convert(R.format,R.colorSpace),Yt=o.convert(R.type);let Ft=w(R.internalFormat,Ot,Yt,R.colorSpace,R.isVideoTexture);V(ht,R);let Lt;const le=R.mipmaps,te=R.isVideoTexture!==!0,ve=Nt.__version===void 0||gt===!0,$=ut.dataReady,zt=b(R,yt);if(R.isDepthTexture)Ft=x(R.format===Do,R.type),ve&&(te?e.texStorage2D(s.TEXTURE_2D,1,Ft,yt.width,yt.height):e.texImage2D(s.TEXTURE_2D,0,Ft,yt.width,yt.height,0,Ot,Yt,null));else if(R.isDataTexture)if(le.length>0){te&&ve&&e.texStorage2D(s.TEXTURE_2D,zt,Ft,le[0].width,le[0].height);for(let mt=0,wt=le.length;mt<wt;mt++)Lt=le[mt],te?$&&e.texSubImage2D(s.TEXTURE_2D,mt,0,0,Lt.width,Lt.height,Ot,Yt,Lt.data):e.texImage2D(s.TEXTURE_2D,mt,Ft,Lt.width,Lt.height,0,Ot,Yt,Lt.data);R.generateMipmaps=!1}else te?(ve&&e.texStorage2D(s.TEXTURE_2D,zt,Ft,yt.width,yt.height),$&&e.texSubImage2D(s.TEXTURE_2D,0,0,0,yt.width,yt.height,Ot,Yt,yt.data)):e.texImage2D(s.TEXTURE_2D,0,Ft,yt.width,yt.height,0,Ot,Yt,yt.data);else if(R.isCompressedTexture)if(R.isCompressedArrayTexture){te&&ve&&e.texStorage3D(s.TEXTURE_2D_ARRAY,zt,Ft,le[0].width,le[0].height,yt.depth);for(let mt=0,wt=le.length;mt<wt;mt++)if(Lt=le[mt],R.format!==En)if(Ot!==null)if(te){if($)if(R.layerUpdates.size>0){const Et=O0(Lt.width,Lt.height,R.format,R.type);for(const At of R.layerUpdates){const ie=Lt.data.subarray(At*Et/Lt.data.BYTES_PER_ELEMENT,(At+1)*Et/Lt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,mt,0,0,At,Lt.width,Lt.height,1,Ot,ie)}R.clearLayerUpdates()}else e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,mt,0,0,0,Lt.width,Lt.height,yt.depth,Ot,Lt.data)}else e.compressedTexImage3D(s.TEXTURE_2D_ARRAY,mt,Ft,Lt.width,Lt.height,yt.depth,0,Lt.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else te?$&&e.texSubImage3D(s.TEXTURE_2D_ARRAY,mt,0,0,0,Lt.width,Lt.height,yt.depth,Ot,Yt,Lt.data):e.texImage3D(s.TEXTURE_2D_ARRAY,mt,Ft,Lt.width,Lt.height,yt.depth,0,Ot,Yt,Lt.data)}else{te&&ve&&e.texStorage2D(s.TEXTURE_2D,zt,Ft,le[0].width,le[0].height);for(let mt=0,wt=le.length;mt<wt;mt++)Lt=le[mt],R.format!==En?Ot!==null?te?$&&e.compressedTexSubImage2D(s.TEXTURE_2D,mt,0,0,Lt.width,Lt.height,Ot,Lt.data):e.compressedTexImage2D(s.TEXTURE_2D,mt,Ft,Lt.width,Lt.height,0,Lt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):te?$&&e.texSubImage2D(s.TEXTURE_2D,mt,0,0,Lt.width,Lt.height,Ot,Yt,Lt.data):e.texImage2D(s.TEXTURE_2D,mt,Ft,Lt.width,Lt.height,0,Ot,Yt,Lt.data)}else if(R.isDataArrayTexture)if(te){if(ve&&e.texStorage3D(s.TEXTURE_2D_ARRAY,zt,Ft,yt.width,yt.height,yt.depth),$)if(R.layerUpdates.size>0){const mt=O0(yt.width,yt.height,R.format,R.type);for(const wt of R.layerUpdates){const Et=yt.data.subarray(wt*mt/yt.data.BYTES_PER_ELEMENT,(wt+1)*mt/yt.data.BYTES_PER_ELEMENT);e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,wt,yt.width,yt.height,1,Ot,Yt,Et)}R.clearLayerUpdates()}else e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,yt.width,yt.height,yt.depth,Ot,Yt,yt.data)}else e.texImage3D(s.TEXTURE_2D_ARRAY,0,Ft,yt.width,yt.height,yt.depth,0,Ot,Yt,yt.data);else if(R.isData3DTexture)te?(ve&&e.texStorage3D(s.TEXTURE_3D,zt,Ft,yt.width,yt.height,yt.depth),$&&e.texSubImage3D(s.TEXTURE_3D,0,0,0,0,yt.width,yt.height,yt.depth,Ot,Yt,yt.data)):e.texImage3D(s.TEXTURE_3D,0,Ft,yt.width,yt.height,yt.depth,0,Ot,Yt,yt.data);else if(R.isFramebufferTexture){if(ve)if(te)e.texStorage2D(s.TEXTURE_2D,zt,Ft,yt.width,yt.height);else{let mt=yt.width,wt=yt.height;for(let Et=0;Et<zt;Et++)e.texImage2D(s.TEXTURE_2D,Et,Ft,mt,wt,0,Ot,Yt,null),mt>>=1,wt>>=1}}else if(le.length>0){if(te&&ve){const mt=pt(le[0]);e.texStorage2D(s.TEXTURE_2D,zt,Ft,mt.width,mt.height)}for(let mt=0,wt=le.length;mt<wt;mt++)Lt=le[mt],te?$&&e.texSubImage2D(s.TEXTURE_2D,mt,0,0,Ot,Yt,Lt):e.texImage2D(s.TEXTURE_2D,mt,Ft,Ot,Yt,Lt);R.generateMipmaps=!1}else if(te){if(ve){const mt=pt(yt);e.texStorage2D(s.TEXTURE_2D,zt,Ft,mt.width,mt.height)}$&&e.texSubImage2D(s.TEXTURE_2D,0,0,0,Ot,Yt,yt)}else e.texImage2D(s.TEXTURE_2D,0,Ft,Ot,Yt,yt);f(R)&&m(ht),Nt.__version=ut.version,R.onUpdate&&R.onUpdate(R)}z.__version=R.version}function q(z,R,nt){if(R.image.length!==6)return;const ht=Q(z,R),gt=R.source;e.bindTexture(s.TEXTURE_CUBE_MAP,z.__webglTexture,s.TEXTURE0+nt);const ut=n.get(gt);if(gt.version!==ut.__version||ht===!0){e.activeTexture(s.TEXTURE0+nt);const Nt=ye.getPrimaries(ye.workingColorSpace),bt=R.colorSpace===wi?null:ye.getPrimaries(R.colorSpace),Dt=R.colorSpace===wi||Nt===bt?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,R.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,R.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,R.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,Dt);const ee=R.isCompressedTexture||R.image[0].isCompressedTexture,yt=R.image[0]&&R.image[0].isDataTexture,Ot=[];for(let wt=0;wt<6;wt++)!ee&&!yt?Ot[wt]=g(R.image[wt],!0,i.maxCubemapSize):Ot[wt]=yt?R.image[wt].image:R.image[wt],Ot[wt]=xt(R,Ot[wt]);const Yt=Ot[0],Ft=o.convert(R.format,R.colorSpace),Lt=o.convert(R.type),le=w(R.internalFormat,Ft,Lt,R.colorSpace),te=R.isVideoTexture!==!0,ve=ut.__version===void 0||ht===!0,$=gt.dataReady;let zt=b(R,Yt);V(s.TEXTURE_CUBE_MAP,R);let mt;if(ee){te&&ve&&e.texStorage2D(s.TEXTURE_CUBE_MAP,zt,le,Yt.width,Yt.height);for(let wt=0;wt<6;wt++){mt=Ot[wt].mipmaps;for(let Et=0;Et<mt.length;Et++){const At=mt[Et];R.format!==En?Ft!==null?te?$&&e.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,Et,0,0,At.width,At.height,Ft,At.data):e.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,Et,le,At.width,At.height,0,At.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):te?$&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,Et,0,0,At.width,At.height,Ft,Lt,At.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,Et,le,At.width,At.height,0,Ft,Lt,At.data)}}}else{if(mt=R.mipmaps,te&&ve){mt.length>0&&zt++;const wt=pt(Ot[0]);e.texStorage2D(s.TEXTURE_CUBE_MAP,zt,le,wt.width,wt.height)}for(let wt=0;wt<6;wt++)if(yt){te?$&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,0,0,0,Ot[wt].width,Ot[wt].height,Ft,Lt,Ot[wt].data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,0,le,Ot[wt].width,Ot[wt].height,0,Ft,Lt,Ot[wt].data);for(let Et=0;Et<mt.length;Et++){const ie=mt[Et].image[wt].image;te?$&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,Et+1,0,0,ie.width,ie.height,Ft,Lt,ie.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,Et+1,le,ie.width,ie.height,0,Ft,Lt,ie.data)}}else{te?$&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,0,0,0,Ft,Lt,Ot[wt]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,0,le,Ft,Lt,Ot[wt]);for(let Et=0;Et<mt.length;Et++){const At=mt[Et];te?$&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,Et+1,0,0,Ft,Lt,At.image[wt]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+wt,Et+1,le,Ft,Lt,At.image[wt])}}}f(R)&&m(s.TEXTURE_CUBE_MAP),ut.__version=gt.version,R.onUpdate&&R.onUpdate(R)}z.__version=R.version}function X(z,R,nt,ht,gt,ut){const Nt=o.convert(nt.format,nt.colorSpace),bt=o.convert(nt.type),Dt=w(nt.internalFormat,Nt,bt,nt.colorSpace),ee=n.get(R),yt=n.get(nt);if(yt.__renderTarget=R,!ee.__hasExternalTextures){const Ot=Math.max(1,R.width>>ut),Yt=Math.max(1,R.height>>ut);gt===s.TEXTURE_3D||gt===s.TEXTURE_2D_ARRAY?e.texImage3D(gt,ut,Dt,Ot,Yt,R.depth,0,Nt,bt,null):e.texImage2D(gt,ut,Dt,Ot,Yt,0,Nt,bt,null)}e.bindFramebuffer(s.FRAMEBUFFER,z),rt(R)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,ht,gt,yt.__webglTexture,0,K(R)):(gt===s.TEXTURE_2D||gt>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&gt<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,ht,gt,yt.__webglTexture,ut),e.bindFramebuffer(s.FRAMEBUFFER,null)}function it(z,R,nt){if(s.bindRenderbuffer(s.RENDERBUFFER,z),R.depthBuffer){const ht=R.depthTexture,gt=ht&&ht.isDepthTexture?ht.type:null,ut=x(R.stencilBuffer,gt),Nt=R.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,bt=K(R);rt(R)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,bt,ut,R.width,R.height):nt?s.renderbufferStorageMultisample(s.RENDERBUFFER,bt,ut,R.width,R.height):s.renderbufferStorage(s.RENDERBUFFER,ut,R.width,R.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,Nt,s.RENDERBUFFER,z)}else{const ht=R.textures;for(let gt=0;gt<ht.length;gt++){const ut=ht[gt],Nt=o.convert(ut.format,ut.colorSpace),bt=o.convert(ut.type),Dt=w(ut.internalFormat,Nt,bt,ut.colorSpace),ee=K(R);nt&&rt(R)===!1?s.renderbufferStorageMultisample(s.RENDERBUFFER,ee,Dt,R.width,R.height):rt(R)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,ee,Dt,R.width,R.height):s.renderbufferStorage(s.RENDERBUFFER,Dt,R.width,R.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function at(z,R){if(R&&R.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(s.FRAMEBUFFER,z),!(R.depthTexture&&R.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const ht=n.get(R.depthTexture);ht.__renderTarget=R,(!ht.__webglTexture||R.depthTexture.image.width!==R.width||R.depthTexture.image.height!==R.height)&&(R.depthTexture.image.width=R.width,R.depthTexture.image.height=R.height,R.depthTexture.needsUpdate=!0),O(R.depthTexture,0);const gt=ht.__webglTexture,ut=K(R);if(R.depthTexture.format===So)rt(R)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,gt,0,ut):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,gt,0);else if(R.depthTexture.format===Do)rt(R)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,gt,0,ut):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,gt,0);else throw new Error("Unknown depthTexture format")}function ft(z){const R=n.get(z),nt=z.isWebGLCubeRenderTarget===!0;if(R.__boundDepthTexture!==z.depthTexture){const ht=z.depthTexture;if(R.__depthDisposeCallback&&R.__depthDisposeCallback(),ht){const gt=()=>{delete R.__boundDepthTexture,delete R.__depthDisposeCallback,ht.removeEventListener("dispose",gt)};ht.addEventListener("dispose",gt),R.__depthDisposeCallback=gt}R.__boundDepthTexture=ht}if(z.depthTexture&&!R.__autoAllocateDepthBuffer){if(nt)throw new Error("target.depthTexture not supported in Cube render targets");at(R.__webglFramebuffer,z)}else if(nt){R.__webglDepthbuffer=[];for(let ht=0;ht<6;ht++)if(e.bindFramebuffer(s.FRAMEBUFFER,R.__webglFramebuffer[ht]),R.__webglDepthbuffer[ht]===void 0)R.__webglDepthbuffer[ht]=s.createRenderbuffer(),it(R.__webglDepthbuffer[ht],z,!1);else{const gt=z.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,ut=R.__webglDepthbuffer[ht];s.bindRenderbuffer(s.RENDERBUFFER,ut),s.framebufferRenderbuffer(s.FRAMEBUFFER,gt,s.RENDERBUFFER,ut)}}else if(e.bindFramebuffer(s.FRAMEBUFFER,R.__webglFramebuffer),R.__webglDepthbuffer===void 0)R.__webglDepthbuffer=s.createRenderbuffer(),it(R.__webglDepthbuffer,z,!1);else{const ht=z.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,gt=R.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,gt),s.framebufferRenderbuffer(s.FRAMEBUFFER,ht,s.RENDERBUFFER,gt)}e.bindFramebuffer(s.FRAMEBUFFER,null)}function Z(z,R,nt){const ht=n.get(z);R!==void 0&&X(ht.__webglFramebuffer,z,z.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),nt!==void 0&&ft(z)}function ot(z){const R=z.texture,nt=n.get(z),ht=n.get(R);z.addEventListener("dispose",A);const gt=z.textures,ut=z.isWebGLCubeRenderTarget===!0,Nt=gt.length>1;if(Nt||(ht.__webglTexture===void 0&&(ht.__webglTexture=s.createTexture()),ht.__version=R.version,r.memory.textures++),ut){nt.__webglFramebuffer=[];for(let bt=0;bt<6;bt++)if(R.mipmaps&&R.mipmaps.length>0){nt.__webglFramebuffer[bt]=[];for(let Dt=0;Dt<R.mipmaps.length;Dt++)nt.__webglFramebuffer[bt][Dt]=s.createFramebuffer()}else nt.__webglFramebuffer[bt]=s.createFramebuffer()}else{if(R.mipmaps&&R.mipmaps.length>0){nt.__webglFramebuffer=[];for(let bt=0;bt<R.mipmaps.length;bt++)nt.__webglFramebuffer[bt]=s.createFramebuffer()}else nt.__webglFramebuffer=s.createFramebuffer();if(Nt)for(let bt=0,Dt=gt.length;bt<Dt;bt++){const ee=n.get(gt[bt]);ee.__webglTexture===void 0&&(ee.__webglTexture=s.createTexture(),r.memory.textures++)}if(z.samples>0&&rt(z)===!1){nt.__webglMultisampledFramebuffer=s.createFramebuffer(),nt.__webglColorRenderbuffer=[],e.bindFramebuffer(s.FRAMEBUFFER,nt.__webglMultisampledFramebuffer);for(let bt=0;bt<gt.length;bt++){const Dt=gt[bt];nt.__webglColorRenderbuffer[bt]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,nt.__webglColorRenderbuffer[bt]);const ee=o.convert(Dt.format,Dt.colorSpace),yt=o.convert(Dt.type),Ot=w(Dt.internalFormat,ee,yt,Dt.colorSpace,z.isXRRenderTarget===!0),Yt=K(z);s.renderbufferStorageMultisample(s.RENDERBUFFER,Yt,Ot,z.width,z.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+bt,s.RENDERBUFFER,nt.__webglColorRenderbuffer[bt])}s.bindRenderbuffer(s.RENDERBUFFER,null),z.depthBuffer&&(nt.__webglDepthRenderbuffer=s.createRenderbuffer(),it(nt.__webglDepthRenderbuffer,z,!0)),e.bindFramebuffer(s.FRAMEBUFFER,null)}}if(ut){e.bindTexture(s.TEXTURE_CUBE_MAP,ht.__webglTexture),V(s.TEXTURE_CUBE_MAP,R);for(let bt=0;bt<6;bt++)if(R.mipmaps&&R.mipmaps.length>0)for(let Dt=0;Dt<R.mipmaps.length;Dt++)X(nt.__webglFramebuffer[bt][Dt],z,R,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+bt,Dt);else X(nt.__webglFramebuffer[bt],z,R,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+bt,0);f(R)&&m(s.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(Nt){for(let bt=0,Dt=gt.length;bt<Dt;bt++){const ee=gt[bt],yt=n.get(ee);e.bindTexture(s.TEXTURE_2D,yt.__webglTexture),V(s.TEXTURE_2D,ee),X(nt.__webglFramebuffer,z,ee,s.COLOR_ATTACHMENT0+bt,s.TEXTURE_2D,0),f(ee)&&m(s.TEXTURE_2D)}e.unbindTexture()}else{let bt=s.TEXTURE_2D;if((z.isWebGL3DRenderTarget||z.isWebGLArrayRenderTarget)&&(bt=z.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),e.bindTexture(bt,ht.__webglTexture),V(bt,R),R.mipmaps&&R.mipmaps.length>0)for(let Dt=0;Dt<R.mipmaps.length;Dt++)X(nt.__webglFramebuffer[Dt],z,R,s.COLOR_ATTACHMENT0,bt,Dt);else X(nt.__webglFramebuffer,z,R,s.COLOR_ATTACHMENT0,bt,0);f(R)&&m(bt),e.unbindTexture()}z.depthBuffer&&ft(z)}function j(z){const R=z.textures;for(let nt=0,ht=R.length;nt<ht;nt++){const gt=R[nt];if(f(gt)){const ut=y(z),Nt=n.get(gt).__webglTexture;e.bindTexture(ut,Nt),m(ut),e.unbindTexture()}}}const et=[],D=[];function J(z){if(z.samples>0){if(rt(z)===!1){const R=z.textures,nt=z.width,ht=z.height;let gt=s.COLOR_BUFFER_BIT;const ut=z.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,Nt=n.get(z),bt=R.length>1;if(bt)for(let Dt=0;Dt<R.length;Dt++)e.bindFramebuffer(s.FRAMEBUFFER,Nt.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+Dt,s.RENDERBUFFER,null),e.bindFramebuffer(s.FRAMEBUFFER,Nt.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+Dt,s.TEXTURE_2D,null,0);e.bindFramebuffer(s.READ_FRAMEBUFFER,Nt.__webglMultisampledFramebuffer),e.bindFramebuffer(s.DRAW_FRAMEBUFFER,Nt.__webglFramebuffer);for(let Dt=0;Dt<R.length;Dt++){if(z.resolveDepthBuffer&&(z.depthBuffer&&(gt|=s.DEPTH_BUFFER_BIT),z.stencilBuffer&&z.resolveStencilBuffer&&(gt|=s.STENCIL_BUFFER_BIT)),bt){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,Nt.__webglColorRenderbuffer[Dt]);const ee=n.get(R[Dt]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,ee,0)}s.blitFramebuffer(0,0,nt,ht,0,0,nt,ht,gt,s.NEAREST),l===!0&&(et.length=0,D.length=0,et.push(s.COLOR_ATTACHMENT0+Dt),z.depthBuffer&&z.resolveDepthBuffer===!1&&(et.push(ut),D.push(ut),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,D)),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,et))}if(e.bindFramebuffer(s.READ_FRAMEBUFFER,null),e.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),bt)for(let Dt=0;Dt<R.length;Dt++){e.bindFramebuffer(s.FRAMEBUFFER,Nt.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+Dt,s.RENDERBUFFER,Nt.__webglColorRenderbuffer[Dt]);const ee=n.get(R[Dt]).__webglTexture;e.bindFramebuffer(s.FRAMEBUFFER,Nt.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+Dt,s.TEXTURE_2D,ee,0)}e.bindFramebuffer(s.DRAW_FRAMEBUFFER,Nt.__webglMultisampledFramebuffer)}else if(z.depthBuffer&&z.resolveDepthBuffer===!1&&l){const R=z.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[R])}}}function K(z){return Math.min(i.maxSamples,z.samples)}function rt(z){const R=n.get(z);return z.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&R.__useRenderToTexture!==!1}function dt(z){const R=r.render.frame;c.get(z)!==R&&(c.set(z,R),z.update())}function xt(z,R){const nt=z.colorSpace,ht=z.format,gt=z.type;return z.isCompressedTexture===!0||z.isVideoTexture===!0||nt!==Ys&&nt!==wi&&(ye.getTransfer(nt)===Pe?(ht!==En||gt!==ei)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",nt)),R}function pt(z){return typeof HTMLImageElement<"u"&&z instanceof HTMLImageElement?(h.width=z.naturalWidth||z.width,h.height=z.naturalHeight||z.height):typeof VideoFrame<"u"&&z instanceof VideoFrame?(h.width=z.displayWidth,h.height=z.displayHeight):(h.width=z.width,h.height=z.height),h}this.allocateTextureUnit=k,this.resetTextureUnits=F,this.setTexture2D=O,this.setTexture2DArray=U,this.setTexture3D=P,this.setTextureCube=H,this.rebindTextures=Z,this.setupRenderTarget=ot,this.updateRenderTargetMipmap=j,this.updateMultisampleRenderTarget=J,this.setupDepthRenderbuffer=ft,this.setupFrameBufferTexture=X,this.useMultisampledRTT=rt}function xx(s,t){function e(n,i=wi){let o;const r=ye.getTransfer(i);if(n===ei)return s.UNSIGNED_BYTE;if(n===sh)return s.UNSIGNED_SHORT_4_4_4_4;if(n===oh)return s.UNSIGNED_SHORT_5_5_5_1;if(n===td)return s.UNSIGNED_INT_5_9_9_9_REV;if(n===Ju)return s.BYTE;if(n===Qu)return s.SHORT;if(n===Pr)return s.UNSIGNED_SHORT;if(n===ih)return s.INT;if(n===bi)return s.UNSIGNED_INT;if(n===$n)return s.FLOAT;if(n===In)return s.HALF_FLOAT;if(n===ed)return s.ALPHA;if(n===nd)return s.RGB;if(n===En)return s.RGBA;if(n===id)return s.LUMINANCE;if(n===sd)return s.LUMINANCE_ALPHA;if(n===So)return s.DEPTH_COMPONENT;if(n===Do)return s.DEPTH_STENCIL;if(n===Lr)return s.RED;if(n===Wa)return s.RED_INTEGER;if(n===od)return s.RG;if(n===rh)return s.RG_INTEGER;if(n===ah)return s.RGBA_INTEGER;if(n===Sa||n===Ea||n===Aa||n===Ta)if(r===Pe)if(o=t.get("WEBGL_compressed_texture_s3tc_srgb"),o!==null){if(n===Sa)return o.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Ea)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Aa)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Ta)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(o=t.get("WEBGL_compressed_texture_s3tc"),o!==null){if(n===Sa)return o.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Ea)return o.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Aa)return o.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Ta)return o.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===yc||n===_c||n===Mc||n===bc)if(o=t.get("WEBGL_compressed_texture_pvrtc"),o!==null){if(n===yc)return o.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===_c)return o.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Mc)return o.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===bc)return o.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Sc||n===Ec||n===Ac)if(o=t.get("WEBGL_compressed_texture_etc"),o!==null){if(n===Sc||n===Ec)return r===Pe?o.COMPRESSED_SRGB8_ETC2:o.COMPRESSED_RGB8_ETC2;if(n===Ac)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:o.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===Tc||n===Cc||n===Rc||n===Pc||n===Lc||n===Dc||n===Ic||n===zc||n===Nc||n===Uc||n===Fc||n===kc||n===Oc||n===Bc)if(o=t.get("WEBGL_compressed_texture_astc"),o!==null){if(n===Tc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:o.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Cc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:o.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Rc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:o.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Pc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:o.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Lc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:o.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Dc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:o.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Ic)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:o.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===zc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:o.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Nc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:o.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Uc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:o.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Fc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:o.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===kc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:o.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Oc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:o.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Bc)return r===Pe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:o.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Ca||n===Hc||n===Gc)if(o=t.get("EXT_texture_compression_bptc"),o!==null){if(n===Ca)return r===Pe?o.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:o.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Hc)return o.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Gc)return o.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===rd||n===Vc||n===Wc||n===Xc)if(o=t.get("EXT_texture_compression_rgtc"),o!==null){if(n===Ca)return o.COMPRESSED_RED_RGTC1_EXT;if(n===Vc)return o.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Wc)return o.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Xc)return o.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Lo?s.UNSIGNED_INT_24_8:s[n]!==void 0?s[n]:null}return{convert:e}}class wx extends kn{constructor(t=[]){super(),this.isArrayCamera=!0,this.cameras=t}}class Ye extends wn{constructor(){super(),this.isGroup=!0,this.type="Group"}}const yx={type:"move"};class Rl{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ye,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ye,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new C,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new C),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ye,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new C,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new C),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let i=null,o=null,r=null;const a=this._targetRay,l=this._grip,h=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(h&&t.hand){r=!0;for(const g of t.hand.values()){const f=e.getJointPose(g,n),m=this._getHandJoint(h,g);f!==null&&(m.matrix.fromArray(f.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=f.radius),m.visible=f!==null}const c=h.joints["index-finger-tip"],d=h.joints["thumb-tip"],u=c.position.distanceTo(d.position),v=.02,p=.005;h.inputState.pinching&&u>v+p?(h.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!h.inputState.pinching&&u<=v-p&&(h.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(o=e.getPose(t.gripSpace,n),o!==null&&(l.matrix.fromArray(o.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,o.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(o.linearVelocity)):l.hasLinearVelocity=!1,o.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(o.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(i=e.getPose(t.targetRaySpace,n),i===null&&o!==null&&(i=o),i!==null&&(a.matrix.fromArray(i.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,i.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(i.linearVelocity)):a.hasLinearVelocity=!1,i.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(i.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(yx)))}return a!==null&&(a.visible=i!==null),l!==null&&(l.visible=o!==null),h!==null&&(h.visible=r!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const n=new Ye;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}}const _x=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Mx=`
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

}`;class bx{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e,n){if(this.texture===null){const i=new Tn,o=t.properties.get(i);o.__webglTexture=e.texture,(e.depthNear!=n.depthNear||e.depthFar!=n.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,n=new Ge({vertexShader:_x,fragmentShader:Mx,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new pe(new Si(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Sx extends Oo{constructor(t,e){super();const n=this;let i=null,o=1,r=null,a="local-floor",l=1,h=null,c=null,d=null,u=null,v=null,p=null;const g=new bx,f=e.getContextAttributes();let m=null,y=null;const w=[],x=[],b=new Rt;let M=null;const A=new kn;A.viewport=new Ne;const S=new kn;S.viewport=new Ne;const _=[A,S],E=new wx;let T=null,F=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(W){let q=w[W];return q===void 0&&(q=new Rl,w[W]=q),q.getTargetRaySpace()},this.getControllerGrip=function(W){let q=w[W];return q===void 0&&(q=new Rl,w[W]=q),q.getGripSpace()},this.getHand=function(W){let q=w[W];return q===void 0&&(q=new Rl,w[W]=q),q.getHandSpace()};function k(W){const q=x.indexOf(W.inputSource);if(q===-1)return;const X=w[q];X!==void 0&&(X.update(W.inputSource,W.frame,h||r),X.dispatchEvent({type:W.type,data:W.inputSource}))}function I(){i.removeEventListener("select",k),i.removeEventListener("selectstart",k),i.removeEventListener("selectend",k),i.removeEventListener("squeeze",k),i.removeEventListener("squeezestart",k),i.removeEventListener("squeezeend",k),i.removeEventListener("end",I),i.removeEventListener("inputsourceschange",O);for(let W=0;W<w.length;W++){const q=x[W];q!==null&&(x[W]=null,w[W].disconnect(q))}T=null,F=null,g.reset(),t.setRenderTarget(m),v=null,u=null,d=null,i=null,y=null,Q.stop(),n.isPresenting=!1,t.setPixelRatio(M),t.setSize(b.width,b.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(W){o=W,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(W){a=W,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return h||r},this.setReferenceSpace=function(W){h=W},this.getBaseLayer=function(){return u!==null?u:v},this.getBinding=function(){return d},this.getFrame=function(){return p},this.getSession=function(){return i},this.setSession=async function(W){if(i=W,i!==null){if(m=t.getRenderTarget(),i.addEventListener("select",k),i.addEventListener("selectstart",k),i.addEventListener("selectend",k),i.addEventListener("squeeze",k),i.addEventListener("squeezestart",k),i.addEventListener("squeezeend",k),i.addEventListener("end",I),i.addEventListener("inputsourceschange",O),f.xrCompatible!==!0&&await e.makeXRCompatible(),M=t.getPixelRatio(),t.getSize(b),i.renderState.layers===void 0){const q={antialias:f.antialias,alpha:!0,depth:f.depth,stencil:f.stencil,framebufferScaleFactor:o};v=new XRWebGLLayer(i,e,q),i.updateRenderState({baseLayer:v}),t.setPixelRatio(1),t.setSize(v.framebufferWidth,v.framebufferHeight,!1),y=new vn(v.framebufferWidth,v.framebufferHeight,{format:En,type:ei,colorSpace:t.outputColorSpace,stencilBuffer:f.stencil})}else{let q=null,X=null,it=null;f.depth&&(it=f.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,q=f.stencil?Do:So,X=f.stencil?Lo:bi);const at={colorFormat:e.RGBA8,depthFormat:it,scaleFactor:o};d=new XRWebGLBinding(i,e),u=d.createProjectionLayer(at),i.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),y=new vn(u.textureWidth,u.textureHeight,{format:En,type:ei,depthTexture:new qa(u.textureWidth,u.textureHeight,X,void 0,void 0,void 0,void 0,void 0,void 0,q),stencilBuffer:f.stencil,colorSpace:t.outputColorSpace,samples:f.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(l),h=null,r=await i.requestReferenceSpace(a),Q.setContext(i),Q.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function O(W){for(let q=0;q<W.removed.length;q++){const X=W.removed[q],it=x.indexOf(X);it>=0&&(x[it]=null,w[it].disconnect(X))}for(let q=0;q<W.added.length;q++){const X=W.added[q];let it=x.indexOf(X);if(it===-1){for(let ft=0;ft<w.length;ft++)if(ft>=x.length){x.push(X),it=ft;break}else if(x[ft]===null){x[ft]=X,it=ft;break}if(it===-1)break}const at=w[it];at&&at.connect(X)}}const U=new C,P=new C;function H(W,q,X){U.setFromMatrixPosition(q.matrixWorld),P.setFromMatrixPosition(X.matrixWorld);const it=U.distanceTo(P),at=q.projectionMatrix.elements,ft=X.projectionMatrix.elements,Z=at[14]/(at[10]-1),ot=at[14]/(at[10]+1),j=(at[9]+1)/at[5],et=(at[9]-1)/at[5],D=(at[8]-1)/at[0],J=(ft[8]+1)/ft[0],K=Z*D,rt=Z*J,dt=it/(-D+J),xt=dt*-D;if(q.matrixWorld.decompose(W.position,W.quaternion,W.scale),W.translateX(xt),W.translateZ(dt),W.matrixWorld.compose(W.position,W.quaternion,W.scale),W.matrixWorldInverse.copy(W.matrixWorld).invert(),at[10]===-1)W.projectionMatrix.copy(q.projectionMatrix),W.projectionMatrixInverse.copy(q.projectionMatrixInverse);else{const pt=Z+dt,z=ot+dt,R=K-xt,nt=rt+(it-xt),ht=j*ot/z*pt,gt=et*ot/z*pt;W.projectionMatrix.makePerspective(R,nt,ht,gt,pt,z),W.projectionMatrixInverse.copy(W.projectionMatrix).invert()}}function G(W,q){q===null?W.matrixWorld.copy(W.matrix):W.matrixWorld.multiplyMatrices(q.matrixWorld,W.matrix),W.matrixWorldInverse.copy(W.matrixWorld).invert()}this.updateCamera=function(W){if(i===null)return;let q=W.near,X=W.far;g.texture!==null&&(g.depthNear>0&&(q=g.depthNear),g.depthFar>0&&(X=g.depthFar)),E.near=S.near=A.near=q,E.far=S.far=A.far=X,(T!==E.near||F!==E.far)&&(i.updateRenderState({depthNear:E.near,depthFar:E.far}),T=E.near,F=E.far),A.layers.mask=W.layers.mask|2,S.layers.mask=W.layers.mask|4,E.layers.mask=A.layers.mask|S.layers.mask;const it=W.parent,at=E.cameras;G(E,it);for(let ft=0;ft<at.length;ft++)G(at[ft],it);at.length===2?H(E,A,S):E.projectionMatrix.copy(A.projectionMatrix),N(W,E,it)};function N(W,q,X){X===null?W.matrix.copy(q.matrixWorld):(W.matrix.copy(X.matrixWorld),W.matrix.invert(),W.matrix.multiply(q.matrixWorld)),W.matrix.decompose(W.position,W.quaternion,W.scale),W.updateMatrixWorld(!0),W.projectionMatrix.copy(q.projectionMatrix),W.projectionMatrixInverse.copy(q.projectionMatrixInverse),W.isPerspectiveCamera&&(W.fov=Dr*2*Math.atan(1/W.projectionMatrix.elements[5]),W.zoom=1)}this.getCamera=function(){return E},this.getFoveation=function(){if(!(u===null&&v===null))return l},this.setFoveation=function(W){l=W,u!==null&&(u.fixedFoveation=W),v!==null&&v.fixedFoveation!==void 0&&(v.fixedFoveation=W)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(E)};let Y=null;function V(W,q){if(c=q.getViewerPose(h||r),p=q,c!==null){const X=c.views;v!==null&&(t.setRenderTargetFramebuffer(y,v.framebuffer),t.setRenderTarget(y));let it=!1;X.length!==E.cameras.length&&(E.cameras.length=0,it=!0);for(let ft=0;ft<X.length;ft++){const Z=X[ft];let ot=null;if(v!==null)ot=v.getViewport(Z);else{const et=d.getViewSubImage(u,Z);ot=et.viewport,ft===0&&(t.setRenderTargetTextures(y,et.colorTexture,u.ignoreDepthValues?void 0:et.depthStencilTexture),t.setRenderTarget(y))}let j=_[ft];j===void 0&&(j=new kn,j.layers.enable(ft),j.viewport=new Ne,_[ft]=j),j.matrix.fromArray(Z.transform.matrix),j.matrix.decompose(j.position,j.quaternion,j.scale),j.projectionMatrix.fromArray(Z.projectionMatrix),j.projectionMatrixInverse.copy(j.projectionMatrix).invert(),j.viewport.set(ot.x,ot.y,ot.width,ot.height),ft===0&&(E.matrix.copy(j.matrix),E.matrix.decompose(E.position,E.quaternion,E.scale)),it===!0&&E.cameras.push(j)}const at=i.enabledFeatures;if(at&&at.includes("depth-sensing")){const ft=d.getDepthInformation(X[0]);ft&&ft.isValid&&ft.texture&&g.init(t,ft,i.renderState)}}for(let X=0;X<w.length;X++){const it=x[X],at=w[X];it!==null&&at!==void 0&&at.update(it,q,h||r)}Y&&Y(W,q),q.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:q}),p=null}const Q=new Md;Q.setAnimationLoop(V),this.setAnimationLoop=function(W){Y=W},this.dispose=function(){}}}const As=new Be,Ex=new jt;function Ax(s,t){function e(f,m){f.matrixAutoUpdate===!0&&f.updateMatrix(),m.value.copy(f.matrix)}function n(f,m){m.color.getRGB(f.fogColor.value,wd(s)),m.isFog?(f.fogNear.value=m.near,f.fogFar.value=m.far):m.isFogExp2&&(f.fogDensity.value=m.density)}function i(f,m,y,w,x){m.isMeshBasicMaterial||m.isMeshLambertMaterial?o(f,m):m.isMeshToonMaterial?(o(f,m),d(f,m)):m.isMeshPhongMaterial?(o(f,m),c(f,m)):m.isMeshStandardMaterial?(o(f,m),u(f,m),m.isMeshPhysicalMaterial&&v(f,m,x)):m.isMeshMatcapMaterial?(o(f,m),p(f,m)):m.isMeshDepthMaterial?o(f,m):m.isMeshDistanceMaterial?(o(f,m),g(f,m)):m.isMeshNormalMaterial?o(f,m):m.isLineBasicMaterial?(r(f,m),m.isLineDashedMaterial&&a(f,m)):m.isPointsMaterial?l(f,m,y,w):m.isSpriteMaterial?h(f,m):m.isShadowMaterial?(f.color.value.copy(m.color),f.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function o(f,m){f.opacity.value=m.opacity,m.color&&f.diffuse.value.copy(m.color),m.emissive&&f.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(f.map.value=m.map,e(m.map,f.mapTransform)),m.alphaMap&&(f.alphaMap.value=m.alphaMap,e(m.alphaMap,f.alphaMapTransform)),m.bumpMap&&(f.bumpMap.value=m.bumpMap,e(m.bumpMap,f.bumpMapTransform),f.bumpScale.value=m.bumpScale,m.side===An&&(f.bumpScale.value*=-1)),m.normalMap&&(f.normalMap.value=m.normalMap,e(m.normalMap,f.normalMapTransform),f.normalScale.value.copy(m.normalScale),m.side===An&&f.normalScale.value.negate()),m.displacementMap&&(f.displacementMap.value=m.displacementMap,e(m.displacementMap,f.displacementMapTransform),f.displacementScale.value=m.displacementScale,f.displacementBias.value=m.displacementBias),m.emissiveMap&&(f.emissiveMap.value=m.emissiveMap,e(m.emissiveMap,f.emissiveMapTransform)),m.specularMap&&(f.specularMap.value=m.specularMap,e(m.specularMap,f.specularMapTransform)),m.alphaTest>0&&(f.alphaTest.value=m.alphaTest);const y=t.get(m),w=y.envMap,x=y.envMapRotation;w&&(f.envMap.value=w,As.copy(x),As.x*=-1,As.y*=-1,As.z*=-1,w.isCubeTexture&&w.isRenderTargetTexture===!1&&(As.y*=-1,As.z*=-1),f.envMapRotation.value.setFromMatrix4(Ex.makeRotationFromEuler(As)),f.flipEnvMap.value=w.isCubeTexture&&w.isRenderTargetTexture===!1?-1:1,f.reflectivity.value=m.reflectivity,f.ior.value=m.ior,f.refractionRatio.value=m.refractionRatio),m.lightMap&&(f.lightMap.value=m.lightMap,f.lightMapIntensity.value=m.lightMapIntensity,e(m.lightMap,f.lightMapTransform)),m.aoMap&&(f.aoMap.value=m.aoMap,f.aoMapIntensity.value=m.aoMapIntensity,e(m.aoMap,f.aoMapTransform))}function r(f,m){f.diffuse.value.copy(m.color),f.opacity.value=m.opacity,m.map&&(f.map.value=m.map,e(m.map,f.mapTransform))}function a(f,m){f.dashSize.value=m.dashSize,f.totalSize.value=m.dashSize+m.gapSize,f.scale.value=m.scale}function l(f,m,y,w){f.diffuse.value.copy(m.color),f.opacity.value=m.opacity,f.size.value=m.size*y,f.scale.value=w*.5,m.map&&(f.map.value=m.map,e(m.map,f.uvTransform)),m.alphaMap&&(f.alphaMap.value=m.alphaMap,e(m.alphaMap,f.alphaMapTransform)),m.alphaTest>0&&(f.alphaTest.value=m.alphaTest)}function h(f,m){f.diffuse.value.copy(m.color),f.opacity.value=m.opacity,f.rotation.value=m.rotation,m.map&&(f.map.value=m.map,e(m.map,f.mapTransform)),m.alphaMap&&(f.alphaMap.value=m.alphaMap,e(m.alphaMap,f.alphaMapTransform)),m.alphaTest>0&&(f.alphaTest.value=m.alphaTest)}function c(f,m){f.specular.value.copy(m.specular),f.shininess.value=Math.max(m.shininess,1e-4)}function d(f,m){m.gradientMap&&(f.gradientMap.value=m.gradientMap)}function u(f,m){f.metalness.value=m.metalness,m.metalnessMap&&(f.metalnessMap.value=m.metalnessMap,e(m.metalnessMap,f.metalnessMapTransform)),f.roughness.value=m.roughness,m.roughnessMap&&(f.roughnessMap.value=m.roughnessMap,e(m.roughnessMap,f.roughnessMapTransform)),m.envMap&&(f.envMapIntensity.value=m.envMapIntensity)}function v(f,m,y){f.ior.value=m.ior,m.sheen>0&&(f.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),f.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(f.sheenColorMap.value=m.sheenColorMap,e(m.sheenColorMap,f.sheenColorMapTransform)),m.sheenRoughnessMap&&(f.sheenRoughnessMap.value=m.sheenRoughnessMap,e(m.sheenRoughnessMap,f.sheenRoughnessMapTransform))),m.clearcoat>0&&(f.clearcoat.value=m.clearcoat,f.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(f.clearcoatMap.value=m.clearcoatMap,e(m.clearcoatMap,f.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(f.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,e(m.clearcoatRoughnessMap,f.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(f.clearcoatNormalMap.value=m.clearcoatNormalMap,e(m.clearcoatNormalMap,f.clearcoatNormalMapTransform),f.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===An&&f.clearcoatNormalScale.value.negate())),m.dispersion>0&&(f.dispersion.value=m.dispersion),m.iridescence>0&&(f.iridescence.value=m.iridescence,f.iridescenceIOR.value=m.iridescenceIOR,f.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],f.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(f.iridescenceMap.value=m.iridescenceMap,e(m.iridescenceMap,f.iridescenceMapTransform)),m.iridescenceThicknessMap&&(f.iridescenceThicknessMap.value=m.iridescenceThicknessMap,e(m.iridescenceThicknessMap,f.iridescenceThicknessMapTransform))),m.transmission>0&&(f.transmission.value=m.transmission,f.transmissionSamplerMap.value=y.texture,f.transmissionSamplerSize.value.set(y.width,y.height),m.transmissionMap&&(f.transmissionMap.value=m.transmissionMap,e(m.transmissionMap,f.transmissionMapTransform)),f.thickness.value=m.thickness,m.thicknessMap&&(f.thicknessMap.value=m.thicknessMap,e(m.thicknessMap,f.thicknessMapTransform)),f.attenuationDistance.value=m.attenuationDistance,f.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(f.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(f.anisotropyMap.value=m.anisotropyMap,e(m.anisotropyMap,f.anisotropyMapTransform))),f.specularIntensity.value=m.specularIntensity,f.specularColor.value.copy(m.specularColor),m.specularColorMap&&(f.specularColorMap.value=m.specularColorMap,e(m.specularColorMap,f.specularColorMapTransform)),m.specularIntensityMap&&(f.specularIntensityMap.value=m.specularIntensityMap,e(m.specularIntensityMap,f.specularIntensityMapTransform))}function p(f,m){m.matcap&&(f.matcap.value=m.matcap)}function g(f,m){const y=t.get(m).light;f.referencePosition.value.setFromMatrixPosition(y.matrixWorld),f.nearDistance.value=y.shadow.camera.near,f.farDistance.value=y.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function Tx(s,t,e,n){let i={},o={},r=[];const a=s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS);function l(y,w){const x=w.program;n.uniformBlockBinding(y,x)}function h(y,w){let x=i[y.id];x===void 0&&(p(y),x=c(y),i[y.id]=x,y.addEventListener("dispose",f));const b=w.program;n.updateUBOMapping(y,b);const M=t.render.frame;o[y.id]!==M&&(u(y),o[y.id]=M)}function c(y){const w=d();y.__bindingPointIndex=w;const x=s.createBuffer(),b=y.__size,M=y.usage;return s.bindBuffer(s.UNIFORM_BUFFER,x),s.bufferData(s.UNIFORM_BUFFER,b,M),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,w,x),x}function d(){for(let y=0;y<a;y++)if(r.indexOf(y)===-1)return r.push(y),y;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(y){const w=i[y.id],x=y.uniforms,b=y.__cache;s.bindBuffer(s.UNIFORM_BUFFER,w);for(let M=0,A=x.length;M<A;M++){const S=Array.isArray(x[M])?x[M]:[x[M]];for(let _=0,E=S.length;_<E;_++){const T=S[_];if(v(T,M,_,b)===!0){const F=T.__offset,k=Array.isArray(T.value)?T.value:[T.value];let I=0;for(let O=0;O<k.length;O++){const U=k[O],P=g(U);typeof U=="number"||typeof U=="boolean"?(T.__data[0]=U,s.bufferSubData(s.UNIFORM_BUFFER,F+I,T.__data)):U.isMatrix3?(T.__data[0]=U.elements[0],T.__data[1]=U.elements[1],T.__data[2]=U.elements[2],T.__data[3]=0,T.__data[4]=U.elements[3],T.__data[5]=U.elements[4],T.__data[6]=U.elements[5],T.__data[7]=0,T.__data[8]=U.elements[6],T.__data[9]=U.elements[7],T.__data[10]=U.elements[8],T.__data[11]=0):(U.toArray(T.__data,I),I+=P.storage/Float32Array.BYTES_PER_ELEMENT)}s.bufferSubData(s.UNIFORM_BUFFER,F,T.__data)}}}s.bindBuffer(s.UNIFORM_BUFFER,null)}function v(y,w,x,b){const M=y.value,A=w+"_"+x;if(b[A]===void 0)return typeof M=="number"||typeof M=="boolean"?b[A]=M:b[A]=M.clone(),!0;{const S=b[A];if(typeof M=="number"||typeof M=="boolean"){if(S!==M)return b[A]=M,!0}else if(S.equals(M)===!1)return S.copy(M),!0}return!1}function p(y){const w=y.uniforms;let x=0;const b=16;for(let A=0,S=w.length;A<S;A++){const _=Array.isArray(w[A])?w[A]:[w[A]];for(let E=0,T=_.length;E<T;E++){const F=_[E],k=Array.isArray(F.value)?F.value:[F.value];for(let I=0,O=k.length;I<O;I++){const U=k[I],P=g(U),H=x%b,G=H%P.boundary,N=H+G;x+=G,N!==0&&b-N<P.storage&&(x+=b-N),F.__data=new Float32Array(P.storage/Float32Array.BYTES_PER_ELEMENT),F.__offset=x,x+=P.storage}}}const M=x%b;return M>0&&(x+=b-M),y.__size=x,y.__cache={},this}function g(y){const w={boundary:0,storage:0};return typeof y=="number"||typeof y=="boolean"?(w.boundary=4,w.storage=4):y.isVector2?(w.boundary=8,w.storage=8):y.isVector3||y.isColor?(w.boundary=16,w.storage=12):y.isVector4?(w.boundary=16,w.storage=16):y.isMatrix3?(w.boundary=48,w.storage=48):y.isMatrix4?(w.boundary=64,w.storage=64):y.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",y),w}function f(y){const w=y.target;w.removeEventListener("dispose",f);const x=r.indexOf(w.__bindingPointIndex);r.splice(x,1),s.deleteBuffer(i[w.id]),delete i[w.id],delete o[w.id]}function m(){for(const y in i)s.deleteBuffer(i[y]);r=[],i={},o={}}return{bind:l,update:h,dispose:m}}class Cx{constructor(t={}){const{canvas:e=pp(),context:n=null,depth:i=!0,stencil:o=!1,alpha:r=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:h=!1,powerPreference:c="default",failIfMajorPerformanceCaveat:d=!1,reverseDepthBuffer:u=!1}=t;this.isWebGLRenderer=!0;let v;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");v=n.getContextAttributes().alpha}else v=r;const p=new Uint32Array(4),g=new Int32Array(4);let f=null,m=null;const y=[],w=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=Dn,this.toneMapping=qi,this.toneMappingExposure=1;const x=this;let b=!1,M=0,A=0,S=null,_=-1,E=null;const T=new Ne,F=new Ne;let k=null;const I=new Ht(0);let O=0,U=e.width,P=e.height,H=1,G=null,N=null;const Y=new Ne(0,0,U,P),V=new Ne(0,0,U,P);let Q=!1;const W=new fs;let q=!1,X=!1;const it=new jt,at=new jt,ft=new C,Z=new Ne,ot={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let j=!1;function et(){return S===null?H:1}let D=n;function J(L,tt){return e.getContext(L,tt)}try{const L={alpha:!0,depth:i,stencil:o,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:h,powerPreference:c,failIfMajorPerformanceCaveat:d};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${nh}`),e.addEventListener("webglcontextlost",wt,!1),e.addEventListener("webglcontextrestored",Et,!1),e.addEventListener("webglcontextcreationerror",At,!1),D===null){const tt="webgl2";if(D=J(tt,L),D===null)throw J(tt)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(L){throw console.error("THREE.WebGLRenderer: "+L.message),L}let K,rt,dt,xt,pt,z,R,nt,ht,gt,ut,Nt,bt,Dt,ee,yt,Ot,Yt,Ft,Lt,le,te,ve,$;function zt(){K=new z1(D),K.init(),te=new xx(D,K),rt=new C1(D,K,t,te),dt=new mx(D,K),rt.reverseDepthBuffer&&u&&dt.buffers.depth.setReversed(!0),xt=new F1(D),pt=new ex,z=new vx(D,K,dt,pt,rt,te,xt),R=new P1(x),nt=new I1(x),ht=new Wp(D),ve=new A1(D,ht),gt=new N1(D,ht,xt,ve),ut=new O1(D,gt,ht,xt),Ft=new k1(D,rt,z),yt=new R1(pt),Nt=new tx(x,R,nt,K,rt,ve,yt),bt=new Ax(x,pt),Dt=new ix,ee=new cx(K),Yt=new E1(x,R,nt,dt,ut,v,l),Ot=new fx(x,ut,rt),$=new Tx(D,xt,rt,dt),Lt=new T1(D,K,xt),le=new U1(D,K,xt),xt.programs=Nt.programs,x.capabilities=rt,x.extensions=K,x.properties=pt,x.renderLists=Dt,x.shadowMap=Ot,x.state=dt,x.info=xt}zt();const mt=new Sx(x,D);this.xr=mt,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){const L=K.get("WEBGL_lose_context");L&&L.loseContext()},this.forceContextRestore=function(){const L=K.get("WEBGL_lose_context");L&&L.restoreContext()},this.getPixelRatio=function(){return H},this.setPixelRatio=function(L){L!==void 0&&(H=L,this.setSize(U,P,!1))},this.getSize=function(L){return L.set(U,P)},this.setSize=function(L,tt,lt=!0){if(mt.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}U=L,P=tt,e.width=Math.floor(L*H),e.height=Math.floor(tt*H),lt===!0&&(e.style.width=L+"px",e.style.height=tt+"px"),this.setViewport(0,0,L,tt)},this.getDrawingBufferSize=function(L){return L.set(U*H,P*H).floor()},this.setDrawingBufferSize=function(L,tt,lt){U=L,P=tt,H=lt,e.width=Math.floor(L*lt),e.height=Math.floor(tt*lt),this.setViewport(0,0,L,tt)},this.getCurrentViewport=function(L){return L.copy(T)},this.getViewport=function(L){return L.copy(Y)},this.setViewport=function(L,tt,lt,ct){L.isVector4?Y.set(L.x,L.y,L.z,L.w):Y.set(L,tt,lt,ct),dt.viewport(T.copy(Y).multiplyScalar(H).round())},this.getScissor=function(L){return L.copy(V)},this.setScissor=function(L,tt,lt,ct){L.isVector4?V.set(L.x,L.y,L.z,L.w):V.set(L,tt,lt,ct),dt.scissor(F.copy(V).multiplyScalar(H).round())},this.getScissorTest=function(){return Q},this.setScissorTest=function(L){dt.setScissorTest(Q=L)},this.setOpaqueSort=function(L){G=L},this.setTransparentSort=function(L){N=L},this.getClearColor=function(L){return L.copy(Yt.getClearColor())},this.setClearColor=function(){Yt.setClearColor.apply(Yt,arguments)},this.getClearAlpha=function(){return Yt.getClearAlpha()},this.setClearAlpha=function(){Yt.setClearAlpha.apply(Yt,arguments)},this.clear=function(L=!0,tt=!0,lt=!0){let ct=0;if(L){let st=!1;if(S!==null){const Tt=S.texture.format;st=Tt===ah||Tt===rh||Tt===Wa}if(st){const Tt=S.texture.type,Pt=Tt===ei||Tt===bi||Tt===Pr||Tt===Lo||Tt===sh||Tt===oh,$t=Yt.getClearColor(),qt=Yt.getClearAlpha(),re=$t.r,Gt=$t.g,Wt=$t.b;Pt?(p[0]=re,p[1]=Gt,p[2]=Wt,p[3]=qt,D.clearBufferuiv(D.COLOR,0,p)):(g[0]=re,g[1]=Gt,g[2]=Wt,g[3]=qt,D.clearBufferiv(D.COLOR,0,g))}else ct|=D.COLOR_BUFFER_BIT}tt&&(ct|=D.DEPTH_BUFFER_BIT),lt&&(ct|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),D.clear(ct)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",wt,!1),e.removeEventListener("webglcontextrestored",Et,!1),e.removeEventListener("webglcontextcreationerror",At,!1),Dt.dispose(),ee.dispose(),pt.dispose(),R.dispose(),nt.dispose(),ut.dispose(),ve.dispose(),$.dispose(),Nt.dispose(),mt.dispose(),mt.removeEventListener("sessionstart",On),mt.removeEventListener("sessionend",Ai),yn.stop()};function wt(L){L.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),b=!0}function Et(){console.log("THREE.WebGLRenderer: Context Restored."),b=!1;const L=xt.autoReset,tt=Ot.enabled,lt=Ot.autoUpdate,ct=Ot.needsUpdate,st=Ot.type;zt(),xt.autoReset=L,Ot.enabled=tt,Ot.autoUpdate=lt,Ot.needsUpdate=ct,Ot.type=st}function At(L){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",L.statusMessage)}function ie(L){const tt=L.target;tt.removeEventListener("dispose",ie),Me(tt)}function Me(L){Ve(L),pt.remove(L)}function Ve(L){const tt=pt.get(L).programs;tt!==void 0&&(tt.forEach(function(lt){Nt.releaseProgram(lt)}),L.isShaderMaterial&&Nt.releaseShaderCache(L))}this.renderBufferDirect=function(L,tt,lt,ct,st,Tt){tt===null&&(tt=ot);const Pt=st.isMesh&&st.matrixWorld.determinant()<0,$t=Yo(L,tt,lt,ct,st);dt.setMaterial(ct,Pt);let qt=lt.index,re=1;if(ct.wireframe===!0){if(qt=gt.getWireframeAttribute(lt),qt===void 0)return;re=2}const Gt=lt.drawRange,Wt=lt.attributes.position;let ge=Gt.start*re,Ee=(Gt.start+Gt.count)*re;Tt!==null&&(ge=Math.max(ge,Tt.start*re),Ee=Math.min(Ee,(Tt.start+Tt.count)*re)),qt!==null?(ge=Math.max(ge,0),Ee=Math.min(Ee,qt.count)):Wt!=null&&(ge=Math.max(ge,0),Ee=Math.min(Ee,Wt.count));const Te=Ee-ge;if(Te<0||Te===1/0)return;ve.setup(st,ct,$t,lt,qt);let We,me=Lt;if(qt!==null&&(We=ht.get(qt),me=le,me.setIndex(We)),st.isMesh)ct.wireframe===!0?(dt.setLineWidth(ct.wireframeLinewidth*et()),me.setMode(D.LINES)):me.setMode(D.TRIANGLES);else if(st.isLine){let Zt=ct.linewidth;Zt===void 0&&(Zt=1),dt.setLineWidth(Zt*et()),st.isLineSegments?me.setMode(D.LINES):st.isLineLoop?me.setMode(D.LINE_LOOP):me.setMode(D.LINE_STRIP)}else st.isPoints?me.setMode(D.POINTS):st.isSprite&&me.setMode(D.TRIANGLES);if(st.isBatchedMesh)if(st._multiDrawInstances!==null)me.renderMultiDrawInstances(st._multiDrawStarts,st._multiDrawCounts,st._multiDrawCount,st._multiDrawInstances);else if(K.get("WEBGL_multi_draw"))me.renderMultiDraw(st._multiDrawStarts,st._multiDrawCounts,st._multiDrawCount);else{const Zt=st._multiDrawStarts,ni=st._multiDrawCounts,xe=st._multiDrawCount,Zn=qt?ht.get(qt).bytesPerElement:1,Pi=pt.get(ct).currentProgram.getUniforms();for(let fn=0;fn<xe;fn++)Pi.setValue(D,"_gl_DrawID",fn),me.render(Zt[fn]/Zn,ni[fn])}else if(st.isInstancedMesh)me.renderInstances(ge,Te,st.count);else if(lt.isInstancedBufferGeometry){const Zt=lt._maxInstanceCount!==void 0?lt._maxInstanceCount:1/0,ni=Math.min(lt.instanceCount,Zt);me.renderInstances(ge,Te,ni)}else me.render(ge,Te)};function ue(L,tt,lt){L.transparent===!0&&L.side===nn&&L.forceSinglePass===!1?(L.side=An,L.needsUpdate=!0,Ci(L,tt,lt),L.side=Ki,L.needsUpdate=!0,Ci(L,tt,lt),L.side=nn):Ci(L,tt,lt)}this.compile=function(L,tt,lt=null){lt===null&&(lt=L),m=ee.get(lt),m.init(tt),w.push(m),lt.traverseVisible(function(st){st.isLight&&st.layers.test(tt.layers)&&(m.pushLight(st),st.castShadow&&m.pushShadow(st))}),L!==lt&&L.traverseVisible(function(st){st.isLight&&st.layers.test(tt.layers)&&(m.pushLight(st),st.castShadow&&m.pushShadow(st))}),m.setupLights();const ct=new Set;return L.traverse(function(st){if(!(st.isMesh||st.isPoints||st.isLine||st.isSprite))return;const Tt=st.material;if(Tt)if(Array.isArray(Tt))for(let Pt=0;Pt<Tt.length;Pt++){const $t=Tt[Pt];ue($t,lt,st),ct.add($t)}else ue(Tt,lt,st),ct.add(Tt)}),w.pop(),m=null,ct},this.compileAsync=function(L,tt,lt=null){const ct=this.compile(L,tt,lt);return new Promise(st=>{function Tt(){if(ct.forEach(function(Pt){pt.get(Pt).currentProgram.isReady()&&ct.delete(Pt)}),ct.size===0){st(L);return}setTimeout(Tt,10)}K.get("KHR_parallel_shader_compile")!==null?Tt():setTimeout(Tt,10)})};let Fe=null;function dn(L){Fe&&Fe(L)}function On(){yn.stop()}function Ai(){yn.start()}const yn=new Md;yn.setAnimationLoop(dn),typeof self<"u"&&yn.setContext(self),this.setAnimationLoop=function(L){Fe=L,mt.setAnimationLoop(L),L===null?yn.stop():yn.start()},mt.addEventListener("sessionstart",On),mt.addEventListener("sessionend",Ai),this.render=function(L,tt){if(tt!==void 0&&tt.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(b===!0)return;if(L.matrixWorldAutoUpdate===!0&&L.updateMatrixWorld(),tt.parent===null&&tt.matrixWorldAutoUpdate===!0&&tt.updateMatrixWorld(),mt.enabled===!0&&mt.isPresenting===!0&&(mt.cameraAutoUpdate===!0&&mt.updateCamera(tt),tt=mt.getCamera()),L.isScene===!0&&L.onBeforeRender(x,L,tt,S),m=ee.get(L,w.length),m.init(tt),w.push(m),at.multiplyMatrices(tt.projectionMatrix,tt.matrixWorldInverse),W.setFromProjectionMatrix(at),X=this.localClippingEnabled,q=yt.init(this.clippingPlanes,X),f=Dt.get(L,y.length),f.init(),y.push(f),mt.enabled===!0&&mt.isPresenting===!0){const Tt=x.xr.getDepthSensingMesh();Tt!==null&&Xo(Tt,tt,-1/0,x.sortObjects)}Xo(L,tt,0,x.sortObjects),f.finish(),x.sortObjects===!0&&f.sort(G,N),j=mt.enabled===!1||mt.isPresenting===!1||mt.hasDepthSensing()===!1,j&&Yt.addToRenderList(f,L),this.info.render.frame++,q===!0&&yt.beginShadows();const lt=m.state.shadowsArray;Ot.render(lt,L,tt),q===!0&&yt.endShadows(),this.info.autoReset===!0&&this.info.reset();const ct=f.opaque,st=f.transmissive;if(m.setupLights(),tt.isArrayCamera){const Tt=tt.cameras;if(st.length>0)for(let Pt=0,$t=Tt.length;Pt<$t;Pt++){const qt=Tt[Pt];qo(ct,st,L,qt)}j&&Yt.render(L);for(let Pt=0,$t=Tt.length;Pt<$t;Pt++){const qt=Tt[Pt];js(f,L,qt,qt.viewport)}}else st.length>0&&qo(ct,st,L,tt),j&&Yt.render(L),js(f,L,tt);S!==null&&(z.updateMultisampleRenderTarget(S),z.updateRenderTargetMipmap(S)),L.isScene===!0&&L.onAfterRender(x,L,tt),ve.resetDefaultState(),_=-1,E=null,w.pop(),w.length>0?(m=w[w.length-1],q===!0&&yt.setGlobalState(x.clippingPlanes,m.state.camera)):m=null,y.pop(),y.length>0?f=y[y.length-1]:f=null};function Xo(L,tt,lt,ct){if(L.visible===!1)return;if(L.layers.test(tt.layers)){if(L.isGroup)lt=L.renderOrder;else if(L.isLOD)L.autoUpdate===!0&&L.update(tt);else if(L.isLight)m.pushLight(L),L.castShadow&&m.pushShadow(L);else if(L.isSprite){if(!L.frustumCulled||W.intersectsSprite(L)){ct&&Z.setFromMatrixPosition(L.matrixWorld).applyMatrix4(at);const Pt=ut.update(L),$t=L.material;$t.visible&&f.push(L,Pt,$t,lt,Z.z,null)}}else if((L.isMesh||L.isLine||L.isPoints)&&(!L.frustumCulled||W.intersectsObject(L))){const Pt=ut.update(L),$t=L.material;if(ct&&(L.boundingSphere!==void 0?(L.boundingSphere===null&&L.computeBoundingSphere(),Z.copy(L.boundingSphere.center)):(Pt.boundingSphere===null&&Pt.computeBoundingSphere(),Z.copy(Pt.boundingSphere.center)),Z.applyMatrix4(L.matrixWorld).applyMatrix4(at)),Array.isArray($t)){const qt=Pt.groups;for(let re=0,Gt=qt.length;re<Gt;re++){const Wt=qt[re],ge=$t[Wt.materialIndex];ge&&ge.visible&&f.push(L,Pt,ge,lt,Z.z,Wt)}}else $t.visible&&f.push(L,Pt,$t,lt,Z.z,null)}}const Tt=L.children;for(let Pt=0,$t=Tt.length;Pt<$t;Pt++)Xo(Tt[Pt],tt,lt,ct)}function js(L,tt,lt,ct){const st=L.opaque,Tt=L.transmissive,Pt=L.transparent;m.setupLightsView(lt),q===!0&&yt.setGlobalState(x.clippingPlanes,lt),ct&&dt.viewport(T.copy(ct)),st.length>0&&gs(st,tt,lt),Tt.length>0&&gs(Tt,tt,lt),Pt.length>0&&gs(Pt,tt,lt),dt.buffers.depth.setTest(!0),dt.buffers.depth.setMask(!0),dt.buffers.color.setMask(!0),dt.setPolygonOffset(!1)}function qo(L,tt,lt,ct){if((lt.isScene===!0?lt.overrideMaterial:null)!==null)return;m.state.transmissionRenderTarget[ct.id]===void 0&&(m.state.transmissionRenderTarget[ct.id]=new vn(1,1,{generateMipmaps:!0,type:K.has("EXT_color_buffer_half_float")||K.has("EXT_color_buffer_float")?In:ei,minFilter:Vi,samples:4,stencilBuffer:o,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:ye.workingColorSpace}));const Tt=m.state.transmissionRenderTarget[ct.id],Pt=ct.viewport||T;Tt.setSize(Pt.z,Pt.w);const $t=x.getRenderTarget();x.setRenderTarget(Tt),x.getClearColor(I),O=x.getClearAlpha(),O<1&&x.setClearColor(16777215,.5),x.clear(),j&&Yt.render(lt);const qt=x.toneMapping;x.toneMapping=qi;const re=ct.viewport;if(ct.viewport!==void 0&&(ct.viewport=void 0),m.setupLightsView(ct),q===!0&&yt.setGlobalState(x.clippingPlanes,ct),gs(L,lt,ct),z.updateMultisampleRenderTarget(Tt),z.updateRenderTargetMipmap(Tt),K.has("WEBGL_multisampled_render_to_texture")===!1){let Gt=!1;for(let Wt=0,ge=tt.length;Wt<ge;Wt++){const Ee=tt[Wt],Te=Ee.object,We=Ee.geometry,me=Ee.material,Zt=Ee.group;if(me.side===nn&&Te.layers.test(ct.layers)){const ni=me.side;me.side=An,me.needsUpdate=!0,Ti(Te,lt,ct,We,me,Zt),me.side=ni,me.needsUpdate=!0,Gt=!0}}Gt===!0&&(z.updateMultisampleRenderTarget(Tt),z.updateRenderTargetMipmap(Tt))}x.setRenderTarget($t),x.setClearColor(I,O),re!==void 0&&(ct.viewport=re),x.toneMapping=qt}function gs(L,tt,lt){const ct=tt.isScene===!0?tt.overrideMaterial:null;for(let st=0,Tt=L.length;st<Tt;st++){const Pt=L[st],$t=Pt.object,qt=Pt.geometry,re=ct===null?Pt.material:ct,Gt=Pt.group;$t.layers.test(lt.layers)&&Ti($t,tt,lt,qt,re,Gt)}}function Ti(L,tt,lt,ct,st,Tt){L.onBeforeRender(x,tt,lt,ct,st,Tt),L.modelViewMatrix.multiplyMatrices(lt.matrixWorldInverse,L.matrixWorld),L.normalMatrix.getNormalMatrix(L.modelViewMatrix),st.onBeforeRender(x,tt,lt,ct,L,Tt),st.transparent===!0&&st.side===nn&&st.forceSinglePass===!1?(st.side=An,st.needsUpdate=!0,x.renderBufferDirect(lt,tt,ct,st,L,Tt),st.side=Ki,st.needsUpdate=!0,x.renderBufferDirect(lt,tt,ct,st,L,Tt),st.side=nn):x.renderBufferDirect(lt,tt,ct,st,L,Tt),L.onAfterRender(x,tt,lt,ct,st,Tt)}function Ci(L,tt,lt){tt.isScene!==!0&&(tt=ot);const ct=pt.get(L),st=m.state.lights,Tt=m.state.shadowsArray,Pt=st.state.version,$t=Nt.getParameters(L,st.state,Tt,tt,lt),qt=Nt.getProgramCacheKey($t);let re=ct.programs;ct.environment=L.isMeshStandardMaterial?tt.environment:null,ct.fog=tt.fog,ct.envMap=(L.isMeshStandardMaterial?nt:R).get(L.envMap||ct.environment),ct.envMapRotation=ct.environment!==null&&L.envMap===null?tt.environmentRotation:L.envMapRotation,re===void 0&&(L.addEventListener("dispose",ie),re=new Map,ct.programs=re);let Gt=re.get(qt);if(Gt!==void 0){if(ct.currentProgram===Gt&&ct.lightsStateVersion===Pt)return Vr(L,$t),Gt}else $t.uniforms=Nt.getUniforms(L),L.onBeforeCompile($t,x),Gt=Nt.acquireProgram($t,qt),re.set(qt,Gt),ct.uniforms=$t.uniforms;const Wt=ct.uniforms;return(!L.isShaderMaterial&&!L.isRawShaderMaterial||L.clipping===!0)&&(Wt.clippingPlanes=yt.uniform),Vr(L,$t),ct.needsLights=Za(L),ct.lightsStateVersion=Pt,ct.needsLights&&(Wt.ambientLightColor.value=st.state.ambient,Wt.lightProbe.value=st.state.probe,Wt.directionalLights.value=st.state.directional,Wt.directionalLightShadows.value=st.state.directionalShadow,Wt.spotLights.value=st.state.spot,Wt.spotLightShadows.value=st.state.spotShadow,Wt.rectAreaLights.value=st.state.rectArea,Wt.ltc_1.value=st.state.rectAreaLTC1,Wt.ltc_2.value=st.state.rectAreaLTC2,Wt.pointLights.value=st.state.point,Wt.pointLightShadows.value=st.state.pointShadow,Wt.hemisphereLights.value=st.state.hemi,Wt.directionalShadowMap.value=st.state.directionalShadowMap,Wt.directionalShadowMatrix.value=st.state.directionalShadowMatrix,Wt.spotShadowMap.value=st.state.spotShadowMap,Wt.spotLightMatrix.value=st.state.spotLightMatrix,Wt.spotLightMap.value=st.state.spotLightMap,Wt.pointShadowMap.value=st.state.pointShadowMap,Wt.pointShadowMatrix.value=st.state.pointShadowMatrix),ct.currentProgram=Gt,ct.uniformsList=null,Gt}function Ri(L){if(L.uniformsList===null){const tt=L.currentProgram.getUniforms();L.uniformsList=Ra.seqWithValue(tt.seq,L.uniforms)}return L.uniformsList}function Vr(L,tt){const lt=pt.get(L);lt.outputColorSpace=tt.outputColorSpace,lt.batching=tt.batching,lt.batchingColor=tt.batchingColor,lt.instancing=tt.instancing,lt.instancingColor=tt.instancingColor,lt.instancingMorph=tt.instancingMorph,lt.skinning=tt.skinning,lt.morphTargets=tt.morphTargets,lt.morphNormals=tt.morphNormals,lt.morphColors=tt.morphColors,lt.morphTargetsCount=tt.morphTargetsCount,lt.numClippingPlanes=tt.numClippingPlanes,lt.numIntersection=tt.numClipIntersection,lt.vertexAlphas=tt.vertexAlphas,lt.vertexTangents=tt.vertexTangents,lt.toneMapping=tt.toneMapping}function Yo(L,tt,lt,ct,st){tt.isScene!==!0&&(tt=ot),z.resetTextureUnits();const Tt=tt.fog,Pt=ct.isMeshStandardMaterial?tt.environment:null,$t=S===null?x.outputColorSpace:S.isXRRenderTarget===!0?S.texture.colorSpace:Ys,qt=(ct.isMeshStandardMaterial?nt:R).get(ct.envMap||Pt),re=ct.vertexColors===!0&&!!lt.attributes.color&&lt.attributes.color.itemSize===4,Gt=!!lt.attributes.tangent&&(!!ct.normalMap||ct.anisotropy>0),Wt=!!lt.morphAttributes.position,ge=!!lt.morphAttributes.normal,Ee=!!lt.morphAttributes.color;let Te=qi;ct.toneMapped&&(S===null||S.isXRRenderTarget===!0)&&(Te=x.toneMapping);const We=lt.morphAttributes.position||lt.morphAttributes.normal||lt.morphAttributes.color,me=We!==void 0?We.length:0,Zt=pt.get(ct),ni=m.state.lights;if(q===!0&&(X===!0||L!==E)){const Cn=L===E&&ct.id===_;yt.setState(ct,L,Cn)}let xe=!1;ct.version===Zt.__version?(Zt.needsLights&&Zt.lightsStateVersion!==ni.state.version||Zt.outputColorSpace!==$t||st.isBatchedMesh&&Zt.batching===!1||!st.isBatchedMesh&&Zt.batching===!0||st.isBatchedMesh&&Zt.batchingColor===!0&&st.colorTexture===null||st.isBatchedMesh&&Zt.batchingColor===!1&&st.colorTexture!==null||st.isInstancedMesh&&Zt.instancing===!1||!st.isInstancedMesh&&Zt.instancing===!0||st.isSkinnedMesh&&Zt.skinning===!1||!st.isSkinnedMesh&&Zt.skinning===!0||st.isInstancedMesh&&Zt.instancingColor===!0&&st.instanceColor===null||st.isInstancedMesh&&Zt.instancingColor===!1&&st.instanceColor!==null||st.isInstancedMesh&&Zt.instancingMorph===!0&&st.morphTexture===null||st.isInstancedMesh&&Zt.instancingMorph===!1&&st.morphTexture!==null||Zt.envMap!==qt||ct.fog===!0&&Zt.fog!==Tt||Zt.numClippingPlanes!==void 0&&(Zt.numClippingPlanes!==yt.numPlanes||Zt.numIntersection!==yt.numIntersection)||Zt.vertexAlphas!==re||Zt.vertexTangents!==Gt||Zt.morphTargets!==Wt||Zt.morphNormals!==ge||Zt.morphColors!==Ee||Zt.toneMapping!==Te||Zt.morphTargetsCount!==me)&&(xe=!0):(xe=!0,Zt.__version=ct.version);let Zn=Zt.currentProgram;xe===!0&&(Zn=Ci(ct,tt,st));let Pi=!1,fn=!1,Ji=!1;const Ce=Zn.getUniforms(),Bn=Zt.uniforms;if(dt.useProgram(Zn.program)&&(Pi=!0,fn=!0,Ji=!0),ct.id!==_&&(_=ct.id,fn=!0),Pi||E!==L){dt.buffers.depth.getReversed()?(it.copy(L.projectionMatrix),gp(it),vp(it),Ce.setValue(D,"projectionMatrix",it)):Ce.setValue(D,"projectionMatrix",L.projectionMatrix),Ce.setValue(D,"viewMatrix",L.matrixWorldInverse);const Hn=Ce.map.cameraPosition;Hn!==void 0&&Hn.setValue(D,ft.setFromMatrixPosition(L.matrixWorld)),rt.logarithmicDepthBuffer&&Ce.setValue(D,"logDepthBufFC",2/(Math.log(L.far+1)/Math.LN2)),(ct.isMeshPhongMaterial||ct.isMeshToonMaterial||ct.isMeshLambertMaterial||ct.isMeshBasicMaterial||ct.isMeshStandardMaterial||ct.isShaderMaterial)&&Ce.setValue(D,"isOrthographic",L.isOrthographicCamera===!0),E!==L&&(E=L,fn=!0,Ji=!0)}if(st.isSkinnedMesh){Ce.setOptional(D,st,"bindMatrix"),Ce.setOptional(D,st,"bindMatrixInverse");const Cn=st.skeleton;Cn&&(Cn.boneTexture===null&&Cn.computeBoneTexture(),Ce.setValue(D,"boneTexture",Cn.boneTexture,z))}st.isBatchedMesh&&(Ce.setOptional(D,st,"batchingTexture"),Ce.setValue(D,"batchingTexture",st._matricesTexture,z),Ce.setOptional(D,st,"batchingIdTexture"),Ce.setValue(D,"batchingIdTexture",st._indirectTexture,z),Ce.setOptional(D,st,"batchingColorTexture"),st._colorsTexture!==null&&Ce.setValue(D,"batchingColorTexture",st._colorsTexture,z));const Zs=lt.morphAttributes;if((Zs.position!==void 0||Zs.normal!==void 0||Zs.color!==void 0)&&Ft.update(st,lt,Zn),(fn||Zt.receiveShadow!==st.receiveShadow)&&(Zt.receiveShadow=st.receiveShadow,Ce.setValue(D,"receiveShadow",st.receiveShadow)),ct.isMeshGouraudMaterial&&ct.envMap!==null&&(Bn.envMap.value=qt,Bn.flipEnvMap.value=qt.isCubeTexture&&qt.isRenderTargetTexture===!1?-1:1),ct.isMeshStandardMaterial&&ct.envMap===null&&tt.environment!==null&&(Bn.envMapIntensity.value=tt.environmentIntensity),fn&&(Ce.setValue(D,"toneMappingExposure",x.toneMappingExposure),Zt.needsLights&&Rh(Bn,Ji),Tt&&ct.fog===!0&&bt.refreshFogUniforms(Bn,Tt),bt.refreshMaterialUniforms(Bn,ct,H,P,m.state.transmissionRenderTarget[L.id]),Ra.upload(D,Ri(Zt),Bn,z)),ct.isShaderMaterial&&ct.uniformsNeedUpdate===!0&&(Ra.upload(D,Ri(Zt),Bn,z),ct.uniformsNeedUpdate=!1),ct.isSpriteMaterial&&Ce.setValue(D,"center",st.center),Ce.setValue(D,"modelViewMatrix",st.modelViewMatrix),Ce.setValue(D,"normalMatrix",st.normalMatrix),Ce.setValue(D,"modelMatrix",st.matrixWorld),ct.isShaderMaterial||ct.isRawShaderMaterial){const Cn=ct.uniformsGroups;for(let Hn=0,ui=Cn.length;Hn<ui;Hn++){const vs=Cn[Hn];$.update(vs,Zn),$.bind(vs,Zn)}}return Zn}function Rh(L,tt){L.ambientLightColor.needsUpdate=tt,L.lightProbe.needsUpdate=tt,L.directionalLights.needsUpdate=tt,L.directionalLightShadows.needsUpdate=tt,L.pointLights.needsUpdate=tt,L.pointLightShadows.needsUpdate=tt,L.spotLights.needsUpdate=tt,L.spotLightShadows.needsUpdate=tt,L.rectAreaLights.needsUpdate=tt,L.hemisphereLights.needsUpdate=tt}function Za(L){return L.isMeshLambertMaterial||L.isMeshToonMaterial||L.isMeshPhongMaterial||L.isMeshStandardMaterial||L.isShadowMaterial||L.isShaderMaterial&&L.lights===!0}this.getActiveCubeFace=function(){return M},this.getActiveMipmapLevel=function(){return A},this.getRenderTarget=function(){return S},this.setRenderTargetTextures=function(L,tt,lt){pt.get(L.texture).__webglTexture=tt,pt.get(L.depthTexture).__webglTexture=lt;const ct=pt.get(L);ct.__hasExternalTextures=!0,ct.__autoAllocateDepthBuffer=lt===void 0,ct.__autoAllocateDepthBuffer||K.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),ct.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(L,tt){const lt=pt.get(L);lt.__webglFramebuffer=tt,lt.__useDefaultFramebuffer=tt===void 0},this.setRenderTarget=function(L,tt=0,lt=0){S=L,M=tt,A=lt;let ct=!0,st=null,Tt=!1,Pt=!1;if(L){const qt=pt.get(L);if(qt.__useDefaultFramebuffer!==void 0)dt.bindFramebuffer(D.FRAMEBUFFER,null),ct=!1;else if(qt.__webglFramebuffer===void 0)z.setupRenderTarget(L);else if(qt.__hasExternalTextures)z.rebindTextures(L,pt.get(L.texture).__webglTexture,pt.get(L.depthTexture).__webglTexture);else if(L.depthBuffer){const Wt=L.depthTexture;if(qt.__boundDepthTexture!==Wt){if(Wt!==null&&pt.has(Wt)&&(L.width!==Wt.image.width||L.height!==Wt.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");z.setupDepthRenderbuffer(L)}}const re=L.texture;(re.isData3DTexture||re.isDataArrayTexture||re.isCompressedArrayTexture)&&(Pt=!0);const Gt=pt.get(L).__webglFramebuffer;L.isWebGLCubeRenderTarget?(Array.isArray(Gt[tt])?st=Gt[tt][lt]:st=Gt[tt],Tt=!0):L.samples>0&&z.useMultisampledRTT(L)===!1?st=pt.get(L).__webglMultisampledFramebuffer:Array.isArray(Gt)?st=Gt[lt]:st=Gt,T.copy(L.viewport),F.copy(L.scissor),k=L.scissorTest}else T.copy(Y).multiplyScalar(H).floor(),F.copy(V).multiplyScalar(H).floor(),k=Q;if(dt.bindFramebuffer(D.FRAMEBUFFER,st)&&ct&&dt.drawBuffers(L,st),dt.viewport(T),dt.scissor(F),dt.setScissorTest(k),Tt){const qt=pt.get(L.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+tt,qt.__webglTexture,lt)}else if(Pt){const qt=pt.get(L.texture),re=tt||0;D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,qt.__webglTexture,lt||0,re)}_=-1},this.readRenderTargetPixels=function(L,tt,lt,ct,st,Tt,Pt){if(!(L&&L.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let $t=pt.get(L).__webglFramebuffer;if(L.isWebGLCubeRenderTarget&&Pt!==void 0&&($t=$t[Pt]),$t){dt.bindFramebuffer(D.FRAMEBUFFER,$t);try{const qt=L.texture,re=qt.format,Gt=qt.type;if(!rt.textureFormatReadable(re)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!rt.textureTypeReadable(Gt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}tt>=0&&tt<=L.width-ct&&lt>=0&&lt<=L.height-st&&D.readPixels(tt,lt,ct,st,te.convert(re),te.convert(Gt),Tt)}finally{const qt=S!==null?pt.get(S).__webglFramebuffer:null;dt.bindFramebuffer(D.FRAMEBUFFER,qt)}}},this.readRenderTargetPixelsAsync=async function(L,tt,lt,ct,st,Tt,Pt){if(!(L&&L.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let $t=pt.get(L).__webglFramebuffer;if(L.isWebGLCubeRenderTarget&&Pt!==void 0&&($t=$t[Pt]),$t){const qt=L.texture,re=qt.format,Gt=qt.type;if(!rt.textureFormatReadable(re))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!rt.textureTypeReadable(Gt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(tt>=0&&tt<=L.width-ct&&lt>=0&&lt<=L.height-st){dt.bindFramebuffer(D.FRAMEBUFFER,$t);const Wt=D.createBuffer();D.bindBuffer(D.PIXEL_PACK_BUFFER,Wt),D.bufferData(D.PIXEL_PACK_BUFFER,Tt.byteLength,D.STREAM_READ),D.readPixels(tt,lt,ct,st,te.convert(re),te.convert(Gt),0);const ge=S!==null?pt.get(S).__webglFramebuffer:null;dt.bindFramebuffer(D.FRAMEBUFFER,ge);const Ee=D.fenceSync(D.SYNC_GPU_COMMANDS_COMPLETE,0);return D.flush(),await mp(D,Ee,4),D.bindBuffer(D.PIXEL_PACK_BUFFER,Wt),D.getBufferSubData(D.PIXEL_PACK_BUFFER,0,Tt),D.deleteBuffer(Wt),D.deleteSync(Ee),Tt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(L,tt=null,lt=0){L.isTexture!==!0&&(wr("WebGLRenderer: copyFramebufferToTexture function signature has changed."),tt=arguments[0]||null,L=arguments[1]);const ct=Math.pow(2,-lt),st=Math.floor(L.image.width*ct),Tt=Math.floor(L.image.height*ct),Pt=tt!==null?tt.x:0,$t=tt!==null?tt.y:0;z.setTexture2D(L,0),D.copyTexSubImage2D(D.TEXTURE_2D,lt,0,0,Pt,$t,st,Tt),dt.unbindTexture()},this.copyTextureToTexture=function(L,tt,lt=null,ct=null,st=0){L.isTexture!==!0&&(wr("WebGLRenderer: copyTextureToTexture function signature has changed."),ct=arguments[0]||null,L=arguments[1],tt=arguments[2],st=arguments[3]||0,lt=null);let Tt,Pt,$t,qt,re,Gt,Wt,ge,Ee;const Te=L.isCompressedTexture?L.mipmaps[st]:L.image;lt!==null?(Tt=lt.max.x-lt.min.x,Pt=lt.max.y-lt.min.y,$t=lt.isBox3?lt.max.z-lt.min.z:1,qt=lt.min.x,re=lt.min.y,Gt=lt.isBox3?lt.min.z:0):(Tt=Te.width,Pt=Te.height,$t=Te.depth||1,qt=0,re=0,Gt=0),ct!==null?(Wt=ct.x,ge=ct.y,Ee=ct.z):(Wt=0,ge=0,Ee=0);const We=te.convert(tt.format),me=te.convert(tt.type);let Zt;tt.isData3DTexture?(z.setTexture3D(tt,0),Zt=D.TEXTURE_3D):tt.isDataArrayTexture||tt.isCompressedArrayTexture?(z.setTexture2DArray(tt,0),Zt=D.TEXTURE_2D_ARRAY):(z.setTexture2D(tt,0),Zt=D.TEXTURE_2D),D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,tt.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,tt.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,tt.unpackAlignment);const ni=D.getParameter(D.UNPACK_ROW_LENGTH),xe=D.getParameter(D.UNPACK_IMAGE_HEIGHT),Zn=D.getParameter(D.UNPACK_SKIP_PIXELS),Pi=D.getParameter(D.UNPACK_SKIP_ROWS),fn=D.getParameter(D.UNPACK_SKIP_IMAGES);D.pixelStorei(D.UNPACK_ROW_LENGTH,Te.width),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,Te.height),D.pixelStorei(D.UNPACK_SKIP_PIXELS,qt),D.pixelStorei(D.UNPACK_SKIP_ROWS,re),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Gt);const Ji=L.isDataArrayTexture||L.isData3DTexture,Ce=tt.isDataArrayTexture||tt.isData3DTexture;if(L.isRenderTargetTexture||L.isDepthTexture){const Bn=pt.get(L),Zs=pt.get(tt),Cn=pt.get(Bn.__renderTarget),Hn=pt.get(Zs.__renderTarget);dt.bindFramebuffer(D.READ_FRAMEBUFFER,Cn.__webglFramebuffer),dt.bindFramebuffer(D.DRAW_FRAMEBUFFER,Hn.__webglFramebuffer);for(let ui=0;ui<$t;ui++)Ji&&D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,pt.get(L).__webglTexture,st,Gt+ui),L.isDepthTexture?(Ce&&D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,pt.get(tt).__webglTexture,st,Ee+ui),D.blitFramebuffer(qt,re,Tt,Pt,Wt,ge,Tt,Pt,D.DEPTH_BUFFER_BIT,D.NEAREST)):Ce?D.copyTexSubImage3D(Zt,st,Wt,ge,Ee+ui,qt,re,Tt,Pt):D.copyTexSubImage2D(Zt,st,Wt,ge,Ee+ui,qt,re,Tt,Pt);dt.bindFramebuffer(D.READ_FRAMEBUFFER,null),dt.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else Ce?L.isDataTexture||L.isData3DTexture?D.texSubImage3D(Zt,st,Wt,ge,Ee,Tt,Pt,$t,We,me,Te.data):tt.isCompressedArrayTexture?D.compressedTexSubImage3D(Zt,st,Wt,ge,Ee,Tt,Pt,$t,We,Te.data):D.texSubImage3D(Zt,st,Wt,ge,Ee,Tt,Pt,$t,We,me,Te):L.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,st,Wt,ge,Tt,Pt,We,me,Te.data):L.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,st,Wt,ge,Te.width,Te.height,We,Te.data):D.texSubImage2D(D.TEXTURE_2D,st,Wt,ge,Tt,Pt,We,me,Te);D.pixelStorei(D.UNPACK_ROW_LENGTH,ni),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,xe),D.pixelStorei(D.UNPACK_SKIP_PIXELS,Zn),D.pixelStorei(D.UNPACK_SKIP_ROWS,Pi),D.pixelStorei(D.UNPACK_SKIP_IMAGES,fn),st===0&&tt.generateMipmaps&&D.generateMipmap(Zt),dt.unbindTexture()},this.copyTextureToTexture3D=function(L,tt,lt=null,ct=null,st=0){return L.isTexture!==!0&&(wr("WebGLRenderer: copyTextureToTexture3D function signature has changed."),lt=arguments[0]||null,ct=arguments[1]||null,L=arguments[2],tt=arguments[3],st=arguments[4]||0),wr('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(L,tt,lt,ct,st)},this.initRenderTarget=function(L){pt.get(L).__webglFramebuffer===void 0&&z.setupRenderTarget(L)},this.initTexture=function(L){L.isCubeTexture?z.setTextureCube(L,0):L.isData3DTexture?z.setTexture3D(L,0):L.isDataArrayTexture||L.isCompressedArrayTexture?z.setTexture2DArray(L,0):z.setTexture2D(L,0),dt.unbindTexture()},this.resetState=function(){M=0,A=0,S=null,dt.reset(),ve.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Wi}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorspace=ye._getDrawingBufferColorSpace(t),e.unpackColorSpace=ye._getUnpackColorSpace()}}class zo extends wn{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Be,this.environmentIntensity=1,this.environmentRotation=new Be,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}}class Gs extends Tn{constructor(t=null,e=1,n=1,i,o,r,a,l,h=Nn,c=Nn,d,u){super(null,r,a,l,h,c,i,o,d,u),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class _i extends fe{constructor(t,e,n,i=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=i}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){const t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}}const po=new jt,B0=new jt,ua=[],H0=new Ue,Rx=new jt,er=new pe,nr=new Le;class $i extends pe{constructor(t,e,n){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new _i(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let i=0;i<n;i++)this.setMatrixAt(i,Rx)}computeBoundingBox(){const t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new Ue),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,po),H0.copy(t.boundingBox).applyMatrix4(po),this.boundingBox.union(H0)}computeBoundingSphere(){const t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new Le),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,po),nr.copy(t.boundingSphere).applyMatrix4(po),this.boundingSphere.union(nr)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){const n=e.morphTargetInfluences,i=this.morphTexture.source.data.data,o=n.length+1,r=t*o+1;for(let a=0;a<n.length;a++)n[a]=i[r+a]}raycast(t,e){const n=this.matrixWorld,i=this.count;if(er.geometry=this.geometry,er.material=this.material,er.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),nr.copy(this.boundingSphere),nr.applyMatrix4(n),t.ray.intersectsSphere(nr)!==!1))for(let o=0;o<i;o++){this.getMatrixAt(o,po),B0.multiplyMatrices(n,po),er.matrixWorld=B0,er.raycast(t,ua);for(let r=0,a=ua.length;r<a;r++){const l=ua[r];l.instanceId=o,l.object=this,e.push(l)}ua.length=0}}setColorAt(t,e){this.instanceColor===null&&(this.instanceColor=new _i(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3)}setMatrixAt(t,e){e.toArray(this.instanceMatrix.array,t*16)}setMorphAt(t,e){const n=e.morphTargetInfluences,i=n.length+1;this.morphTexture===null&&(this.morphTexture=new Gs(new Float32Array(i*this.count),i,this.count,Lr,$n));const o=this.morphTexture.source.data.data;let r=0;for(let h=0;h<n.length;h++)r+=n[h];const a=this.geometry.morphTargetsRelative?1:1-r,l=i*t;o[l]=a,o.set(n,l+1)}updateMorphTargets(){}dispose(){return this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null),this}}function Pl(s,t){return s-t}function Px(s,t){return s.z-t.z}function Lx(s,t){return t.z-s.z}class Dx{constructor(){this.index=0,this.pool=[],this.list=[]}push(t,e,n,i){const o=this.pool,r=this.list;this.index>=o.length&&o.push({start:-1,count:-1,z:-1,index:-1});const a=o[this.index];r.push(a),this.index++,a.start=t,a.count=e,a.z=n,a.index=i}reset(){this.list.length=0,this.index=0}}const Un=new jt,Ix=new Ht(1,1,1),Ll=new fs,da=new Ue,Ts=new Le,ir=new C,G0=new C,zx=new C,Dl=new Dx,bn=new pe,fa=[];function Nx(s,t,e=0){const n=t.itemSize;if(s.isInterleavedBufferAttribute||s.array.constructor!==t.array.constructor){const i=s.count;for(let o=0;o<i;o++)for(let r=0;r<n;r++)t.setComponent(o+e,r,s.getComponent(o,r))}else t.array.set(s.array,e*n);t.needsUpdate=!0}function Cs(s,t){if(s.constructor!==t.constructor){const e=Math.min(s.length,t.length);for(let n=0;n<e;n++)t[n]=s[n]}else{const e=Math.min(s.length,t.length);t.set(new s.constructor(s.buffer,0,e))}}class Ux extends pe{get maxInstanceCount(){return this._maxInstanceCount}get instanceCount(){return this._instanceInfo.length-this._availableInstanceIds.length}get unusedVertexCount(){return this._maxVertexCount-this._nextVertexStart}get unusedIndexCount(){return this._maxIndexCount-this._nextIndexStart}constructor(t,e,n=e*2,i){super(new oe,i),this.isBatchedMesh=!0,this.perObjectFrustumCulled=!0,this.sortObjects=!0,this.boundingBox=null,this.boundingSphere=null,this.customSort=null,this._instanceInfo=[],this._geometryInfo=[],this._availableInstanceIds=[],this._availableGeometryIds=[],this._nextIndexStart=0,this._nextVertexStart=0,this._geometryCount=0,this._visibilityChanged=!0,this._geometryInitialized=!1,this._maxInstanceCount=t,this._maxVertexCount=e,this._maxIndexCount=n,this._multiDrawCounts=new Int32Array(t),this._multiDrawStarts=new Int32Array(t),this._multiDrawCount=0,this._multiDrawInstances=null,this._matricesTexture=null,this._indirectTexture=null,this._colorsTexture=null,this._initMatricesTexture(),this._initIndirectTexture()}_initMatricesTexture(){let t=Math.sqrt(this._maxInstanceCount*4);t=Math.ceil(t/4)*4,t=Math.max(t,4);const e=new Float32Array(t*t*4),n=new Gs(e,t,t,En,$n);this._matricesTexture=n}_initIndirectTexture(){let t=Math.sqrt(this._maxInstanceCount);t=Math.ceil(t);const e=new Uint32Array(t*t),n=new Gs(e,t,t,Wa,bi);this._indirectTexture=n}_initColorsTexture(){let t=Math.sqrt(this._maxInstanceCount);t=Math.ceil(t);const e=new Float32Array(t*t*4).fill(1),n=new Gs(e,t,t,En,$n);n.colorSpace=ye.workingColorSpace,this._colorsTexture=n}_initializeGeometry(t){const e=this.geometry,n=this._maxVertexCount,i=this._maxIndexCount;if(this._geometryInitialized===!1){for(const o in t.attributes){const r=t.getAttribute(o),{array:a,itemSize:l,normalized:h}=r,c=new a.constructor(n*l),d=new fe(c,l,h);e.setAttribute(o,d)}if(t.getIndex()!==null){const o=n>65535?new Uint32Array(i):new Uint16Array(i);e.setIndex(new fe(o,1))}this._geometryInitialized=!0}}_validateGeometry(t){const e=this.geometry;if(!!t.getIndex()!=!!e.getIndex())throw new Error('BatchedMesh: All geometries must consistently have "index".');for(const n in e.attributes){if(!t.hasAttribute(n))throw new Error(`BatchedMesh: Added geometry missing "${n}". All geometries must have consistent attributes.`);const i=t.getAttribute(n),o=e.getAttribute(n);if(i.itemSize!==o.itemSize||i.normalized!==o.normalized)throw new Error("BatchedMesh: All attributes must have a consistent itemSize and normalized value.")}}setCustomSort(t){return this.customSort=t,this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ue);const t=this.boundingBox,e=this._instanceInfo;t.makeEmpty();for(let n=0,i=e.length;n<i;n++){if(e[n].active===!1)continue;const o=e[n].geometryIndex;this.getMatrixAt(n,Un),this.getBoundingBoxAt(o,da).applyMatrix4(Un),t.union(da)}}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Le);const t=this.boundingSphere,e=this._instanceInfo;t.makeEmpty();for(let n=0,i=e.length;n<i;n++){if(e[n].active===!1)continue;const o=e[n].geometryIndex;this.getMatrixAt(n,Un),this.getBoundingSphereAt(o,Ts).applyMatrix4(Un),t.union(Ts)}}addInstance(t){if(this._instanceInfo.length>=this.maxInstanceCount&&this._availableInstanceIds.length===0)throw new Error("BatchedMesh: Maximum item count reached.");const n={visible:!0,active:!0,geometryIndex:t};let i=null;this._availableInstanceIds.length>0?(this._availableInstanceIds.sort(Pl),i=this._availableInstanceIds.shift(),this._instanceInfo[i]=n):(i=this._instanceInfo.length,this._instanceInfo.push(n));const o=this._matricesTexture;Un.identity().toArray(o.image.data,i*16),o.needsUpdate=!0;const r=this._colorsTexture;return r&&(Ix.toArray(r.image.data,i*4),r.needsUpdate=!0),this._visibilityChanged=!0,i}addGeometry(t,e=-1,n=-1){this._initializeGeometry(t),this._validateGeometry(t);const i={vertexStart:-1,vertexCount:-1,reservedVertexCount:-1,indexStart:-1,indexCount:-1,reservedIndexCount:-1,start:-1,count:-1,boundingBox:null,boundingSphere:null,active:!0},o=this._geometryInfo;i.vertexStart=this._nextVertexStart,i.reservedVertexCount=e===-1?t.getAttribute("position").count:e;const r=t.getIndex();if(r!==null&&(i.indexStart=this._nextIndexStart,i.reservedIndexCount=n===-1?r.count:n),i.indexStart!==-1&&i.indexStart+i.reservedIndexCount>this._maxIndexCount||i.vertexStart+i.reservedVertexCount>this._maxVertexCount)throw new Error("BatchedMesh: Reserved space request exceeds the maximum buffer size.");let l;return this._availableGeometryIds.length>0?(this._availableGeometryIds.sort(Pl),l=this._availableGeometryIds.shift(),o[l]=i):(l=this._geometryCount,this._geometryCount++,o.push(i)),this.setGeometryAt(l,t),this._nextIndexStart=i.indexStart+i.reservedIndexCount,this._nextVertexStart=i.vertexStart+i.reservedVertexCount,l}setGeometryAt(t,e){if(t>=this._geometryCount)throw new Error("BatchedMesh: Maximum geometry count reached.");this._validateGeometry(e);const n=this.geometry,i=n.getIndex()!==null,o=n.getIndex(),r=e.getIndex(),a=this._geometryInfo[t];if(i&&r.count>a.reservedIndexCount||e.attributes.position.count>a.reservedVertexCount)throw new Error("BatchedMesh: Reserved space not large enough for provided geometry.");const l=a.vertexStart,h=a.reservedVertexCount;a.vertexCount=e.getAttribute("position").count;for(const c in n.attributes){const d=e.getAttribute(c),u=n.getAttribute(c);Nx(d,u,l);const v=d.itemSize;for(let p=d.count,g=h;p<g;p++){const f=l+p;for(let m=0;m<v;m++)u.setComponent(f,m,0)}u.needsUpdate=!0,u.addUpdateRange(l*v,h*v)}if(i){const c=a.indexStart,d=a.reservedIndexCount;a.indexCount=e.getIndex().count;for(let u=0;u<r.count;u++)o.setX(c+u,l+r.getX(u));for(let u=r.count,v=d;u<v;u++)o.setX(c+u,l);o.needsUpdate=!0,o.addUpdateRange(c,a.reservedIndexCount)}return a.start=i?a.indexStart:a.vertexStart,a.count=i?a.indexCount:a.vertexCount,a.boundingBox=null,e.boundingBox!==null&&(a.boundingBox=e.boundingBox.clone()),a.boundingSphere=null,e.boundingSphere!==null&&(a.boundingSphere=e.boundingSphere.clone()),this._visibilityChanged=!0,t}deleteGeometry(t){const e=this._geometryInfo;if(t>=e.length||e[t].active===!1)return this;const n=this._instanceInfo;for(let i=0,o=n.length;i<o;i++)n[i].geometryIndex===t&&this.deleteInstance(i);return e[t].active=!1,this._availableGeometryIds.push(t),this._visibilityChanged=!0,this}deleteInstance(t){const e=this._instanceInfo;return t>=e.length||e[t].active===!1?this:(e[t].active=!1,this._availableInstanceIds.push(t),this._visibilityChanged=!0,this)}optimize(){let t=0,e=0;const n=this._geometryInfo,i=n.map((r,a)=>a).sort((r,a)=>n[r].vertexStart-n[a].vertexStart),o=this.geometry;for(let r=0,a=n.length;r<a;r++){const l=i[r],h=n[l];if(h.active!==!1){if(o.index!==null){if(h.indexStart!==e){const{indexStart:c,vertexStart:d,reservedIndexCount:u}=h,v=o.index,p=v.array,g=t-d;for(let f=c;f<c+u;f++)p[f]=p[f]+g;v.array.copyWithin(e,c,c+u),v.addUpdateRange(e,u),h.indexStart=e}e+=h.reservedIndexCount}if(h.vertexStart!==t){const{vertexStart:c,reservedVertexCount:d}=h,u=o.attributes;for(const v in u){const p=u[v],{array:g,itemSize:f}=p;g.copyWithin(t*f,c*f,(c+d)*f),p.addUpdateRange(t*f,d*f)}h.vertexStart=t}t+=h.reservedVertexCount,h.start=o.index?h.indexStart:h.vertexStart,this._nextIndexStart=o.index?h.indexStart+h.reservedIndexCount:0,this._nextVertexStart=h.vertexStart+h.reservedVertexCount}}return this}getBoundingBoxAt(t,e){if(t>=this._geometryCount)return null;const n=this.geometry,i=this._geometryInfo[t];if(i.boundingBox===null){const o=new Ue,r=n.index,a=n.attributes.position;for(let l=i.start,h=i.start+i.count;l<h;l++){let c=l;r&&(c=r.getX(c)),o.expandByPoint(ir.fromBufferAttribute(a,c))}i.boundingBox=o}return e.copy(i.boundingBox),e}getBoundingSphereAt(t,e){if(t>=this._geometryCount)return null;const n=this.geometry,i=this._geometryInfo[t];if(i.boundingSphere===null){const o=new Le;this.getBoundingBoxAt(t,da),da.getCenter(o.center);const r=n.index,a=n.attributes.position;let l=0;for(let h=i.start,c=i.start+i.count;h<c;h++){let d=h;r&&(d=r.getX(d)),ir.fromBufferAttribute(a,d),l=Math.max(l,o.center.distanceToSquared(ir))}o.radius=Math.sqrt(l),i.boundingSphere=o}return e.copy(i.boundingSphere),e}setMatrixAt(t,e){const n=this._instanceInfo,i=this._matricesTexture,o=this._matricesTexture.image.data;return t>=n.length||n[t].active===!1?this:(e.toArray(o,t*16),i.needsUpdate=!0,this)}getMatrixAt(t,e){const n=this._instanceInfo,i=this._matricesTexture.image.data;return t>=n.length||n[t].active===!1?null:e.fromArray(i,t*16)}setColorAt(t,e){this._colorsTexture===null&&this._initColorsTexture();const n=this._colorsTexture,i=this._colorsTexture.image.data,o=this._instanceInfo;return t>=o.length||o[t].active===!1?this:(e.toArray(i,t*4),n.needsUpdate=!0,this)}getColorAt(t,e){const n=this._colorsTexture.image.data,i=this._instanceInfo;return t>=i.length||i[t].active===!1?null:e.fromArray(n,t*4)}setVisibleAt(t,e){const n=this._instanceInfo;return t>=n.length||n[t].active===!1||n[t].visible===e?this:(n[t].visible=e,this._visibilityChanged=!0,this)}getVisibleAt(t){const e=this._instanceInfo;return t>=e.length||e[t].active===!1?!1:e[t].visible}setGeometryIdAt(t,e){const n=this._instanceInfo,i=this._geometryInfo;return t>=n.length||n[t].active===!1||e>=i.length||i[e].active===!1?null:(n[t].geometryIndex=e,this)}getGeometryIdAt(t){const e=this._instanceInfo;return t>=e.length||e[t].active===!1?-1:e[t].geometryIndex}getGeometryRangeAt(t,e={}){if(t<0||t>=this._geometryCount)return null;const n=this._geometryInfo[t];return e.vertexStart=n.vertexStart,e.vertexCount=n.vertexCount,e.reservedVertexCount=n.reservedVertexCount,e.indexStart=n.indexStart,e.indexCount=n.indexCount,e.reservedIndexCount=n.reservedIndexCount,e.start=n.start,e.count=n.count,e}setInstanceCount(t){const e=this._availableInstanceIds,n=this._instanceInfo;for(e.sort(Pl);e[e.length-1]===n.length;)n.pop(),e.pop();if(t<n.length)throw new Error(`BatchedMesh: Instance ids outside the range ${t} are being used. Cannot shrink instance count.`);const i=new Int32Array(t),o=new Int32Array(t);Cs(this._multiDrawCounts,i),Cs(this._multiDrawStarts,o),this._multiDrawCounts=i,this._multiDrawStarts=o,this._maxInstanceCount=t;const r=this._indirectTexture,a=this._matricesTexture,l=this._colorsTexture;r.dispose(),this._initIndirectTexture(),Cs(r.image.data,this._indirectTexture.image.data),a.dispose(),this._initMatricesTexture(),Cs(a.image.data,this._matricesTexture.image.data),l&&(l.dispose(),this._initColorsTexture(),Cs(l.image.data,this._colorsTexture.image.data))}setGeometrySize(t,e){const n=[...this._geometryInfo].filter(a=>a.active);if(Math.max(...n.map(a=>a.vertexStart+a.reservedVertexCount))>t)throw new Error(`BatchedMesh: Geometry vertex values are being used outside the range ${e}. Cannot shrink further.`);if(this.geometry.index&&Math.max(...n.map(l=>l.indexStart+l.reservedIndexCount))>e)throw new Error(`BatchedMesh: Geometry index values are being used outside the range ${e}. Cannot shrink further.`);const o=this.geometry;o.dispose(),this._maxVertexCount=t,this._maxIndexCount=e,this._geometryInitialized&&(this._geometryInitialized=!1,this.geometry=new oe,this._initializeGeometry(o));const r=this.geometry;o.index&&Cs(o.index.array,r.index.array);for(const a in o.attributes)Cs(o.attributes[a].array,r.attributes[a].array)}raycast(t,e){const n=this._instanceInfo,i=this._geometryInfo,o=this.matrixWorld,r=this.geometry;bn.material=this.material,bn.geometry.index=r.index,bn.geometry.attributes=r.attributes,bn.geometry.boundingBox===null&&(bn.geometry.boundingBox=new Ue),bn.geometry.boundingSphere===null&&(bn.geometry.boundingSphere=new Le);for(let a=0,l=n.length;a<l;a++){if(!n[a].visible||!n[a].active)continue;const h=n[a].geometryIndex,c=i[h];bn.geometry.setDrawRange(c.start,c.count),this.getMatrixAt(a,bn.matrixWorld).premultiply(o),this.getBoundingBoxAt(h,bn.geometry.boundingBox),this.getBoundingSphereAt(h,bn.geometry.boundingSphere),bn.raycast(t,fa);for(let d=0,u=fa.length;d<u;d++){const v=fa[d];v.object=this,v.batchId=a,e.push(v)}fa.length=0}bn.material=null,bn.geometry.index=null,bn.geometry.attributes={},bn.geometry.setDrawRange(0,1/0)}copy(t){return super.copy(t),this.geometry=t.geometry.clone(),this.perObjectFrustumCulled=t.perObjectFrustumCulled,this.sortObjects=t.sortObjects,this.boundingBox=t.boundingBox!==null?t.boundingBox.clone():null,this.boundingSphere=t.boundingSphere!==null?t.boundingSphere.clone():null,this._geometryInfo=t._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox!==null?e.boundingBox.clone():null,boundingSphere:e.boundingSphere!==null?e.boundingSphere.clone():null})),this._instanceInfo=t._instanceInfo.map(e=>({...e})),this._maxInstanceCount=t._maxInstanceCount,this._maxVertexCount=t._maxVertexCount,this._maxIndexCount=t._maxIndexCount,this._geometryInitialized=t._geometryInitialized,this._geometryCount=t._geometryCount,this._multiDrawCounts=t._multiDrawCounts.slice(),this._multiDrawStarts=t._multiDrawStarts.slice(),this._matricesTexture=t._matricesTexture.clone(),this._matricesTexture.image.data=this._matricesTexture.image.data.slice(),this._colorsTexture!==null&&(this._colorsTexture=t._colorsTexture.clone(),this._colorsTexture.image.data=this._colorsTexture.image.data.slice()),this}dispose(){return this.geometry.dispose(),this._matricesTexture.dispose(),this._matricesTexture=null,this._indirectTexture.dispose(),this._indirectTexture=null,this._colorsTexture!==null&&(this._colorsTexture.dispose(),this._colorsTexture=null),this}onBeforeRender(t,e,n,i,o){if(!this._visibilityChanged&&!this.perObjectFrustumCulled&&!this.sortObjects)return;const r=i.getIndex(),a=r===null?1:r.array.BYTES_PER_ELEMENT,l=this._instanceInfo,h=this._multiDrawStarts,c=this._multiDrawCounts,d=this._geometryInfo,u=this.perObjectFrustumCulled,v=this._indirectTexture,p=v.image.data;u&&(Un.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse).multiply(this.matrixWorld),Ll.setFromProjectionMatrix(Un,t.coordinateSystem));let g=0;if(this.sortObjects){Un.copy(this.matrixWorld).invert(),ir.setFromMatrixPosition(n.matrixWorld).applyMatrix4(Un),G0.set(0,0,-1).transformDirection(n.matrixWorld).transformDirection(Un);for(let y=0,w=l.length;y<w;y++)if(l[y].visible&&l[y].active){const x=l[y].geometryIndex;this.getMatrixAt(y,Un),this.getBoundingSphereAt(x,Ts).applyMatrix4(Un);let b=!1;if(u&&(b=!Ll.intersectsSphere(Ts)),!b){const M=d[x],A=zx.subVectors(Ts.center,ir).dot(G0);Dl.push(M.start,M.count,A,y)}}const f=Dl.list,m=this.customSort;m===null?f.sort(o.transparent?Lx:Px):m.call(this,f,n);for(let y=0,w=f.length;y<w;y++){const x=f[y];h[g]=x.start*a,c[g]=x.count,p[g]=x.index,g++}Dl.reset()}else for(let f=0,m=l.length;f<m;f++)if(l[f].visible&&l[f].active){const y=l[f].geometryIndex;let w=!1;if(u&&(this.getMatrixAt(f,Un),this.getBoundingSphereAt(y,Ts).applyMatrix4(Un),w=!Ll.intersectsSphere(Ts)),!w){const x=d[y];h[g]=x.start*a,c[g]=x.count,p[g]=f,g++}}v.needsUpdate=!0,this._multiDrawCount=g,this._visibilityChanged=!1}onBeforeShadow(t,e,n,i,o,r){this.onBeforeRender(t,null,i,o,r)}}class Fx extends Ho{static get type(){return"PointsMaterial"}constructor(t){super(),this.isPointsMaterial=!0,this.color=new Ht(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}}const V0=new jt,$c=new pd,pa=new Le,ma=new C;class kx extends wn{constructor(t=new oe,e=new Fx){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}raycast(t,e){const n=this.geometry,i=this.matrixWorld,o=t.params.Points.threshold,r=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),pa.copy(n.boundingSphere),pa.applyMatrix4(i),pa.radius+=o,t.ray.intersectsSphere(pa)===!1)return;V0.copy(i).invert(),$c.copy(t.ray).applyMatrix4(V0);const a=o/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,h=n.index,d=n.attributes.position;if(h!==null){const u=Math.max(0,r.start),v=Math.min(h.count,r.start+r.count);for(let p=u,g=v;p<g;p++){const f=h.getX(p);ma.fromBufferAttribute(d,f),W0(ma,f,l,i,t,e,this)}}else{const u=Math.max(0,r.start),v=Math.min(d.count,r.start+r.count);for(let p=u,g=v;p<g;p++)ma.fromBufferAttribute(d,p),W0(ma,p,l,i,t,e,this)}}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let o=0,r=i.length;o<r;o++){const a=i[o].name||String(o);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=o}}}}}function W0(s,t,e,n,i,o,r){const a=$c.distanceSqToPoint(s);if(a<e){const l=new C;$c.closestPointToPoint(s,l),l.applyMatrix4(n);const h=i.ray.origin.distanceTo(l);if(h<i.near||h>i.far)return;o.push({distance:h,distanceToRay:Math.sqrt(a),point:l,index:t,face:null,faceIndex:null,barycoord:null,object:r})}}class Ur extends Tn{constructor(t,e,n,i,o,r,a,l,h){super(t,e,n,i,o,r,a,l,h),this.isCanvasTexture=!0,this.needsUpdate=!0}}class Ei{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(t,e){const n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){const t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const e=[];let n,i=this.getPoint(0),o=0;e.push(0);for(let r=1;r<=t;r++)n=this.getPoint(r/t),o+=n.distanceTo(i),e.push(o),i=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e){const n=this.getLengths();let i=0;const o=n.length;let r;e?r=e:r=t*n[o-1];let a=0,l=o-1,h;for(;a<=l;)if(i=Math.floor(a+(l-a)/2),h=n[i]-r,h<0)a=i+1;else if(h>0)l=i-1;else{l=i;break}if(i=l,n[i]===r)return i/(o-1);const c=n[i],u=n[i+1]-c,v=(r-c)/u;return(i+v)/(o-1)}getTangent(t,e){let i=t-1e-4,o=t+1e-4;i<0&&(i=0),o>1&&(o=1);const r=this.getPoint(i),a=this.getPoint(o),l=e||(r.isVector2?new Rt:new C);return l.copy(a).sub(r).normalize(),l}getTangentAt(t,e){const n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e){const n=new C,i=[],o=[],r=[],a=new C,l=new jt;for(let v=0;v<=t;v++){const p=v/t;i[v]=this.getTangentAt(p,new C)}o[0]=new C,r[0]=new C;let h=Number.MAX_VALUE;const c=Math.abs(i[0].x),d=Math.abs(i[0].y),u=Math.abs(i[0].z);c<=h&&(h=c,n.set(1,0,0)),d<=h&&(h=d,n.set(0,1,0)),u<=h&&n.set(0,0,1),a.crossVectors(i[0],n).normalize(),o[0].crossVectors(i[0],a),r[0].crossVectors(i[0],o[0]);for(let v=1;v<=t;v++){if(o[v]=o[v-1].clone(),r[v]=r[v-1].clone(),a.crossVectors(i[v-1],i[v]),a.length()>Number.EPSILON){a.normalize();const p=Math.acos(Je(i[v-1].dot(i[v]),-1,1));o[v].applyMatrix4(l.makeRotationAxis(a,p))}r[v].crossVectors(i[v],o[v])}if(e===!0){let v=Math.acos(Je(o[0].dot(o[t]),-1,1));v/=t,i[0].dot(a.crossVectors(o[0],o[t]))>0&&(v=-v);for(let p=1;p<=t;p++)o[p].applyMatrix4(l.makeRotationAxis(i[p],v*p)),r[p].crossVectors(i[p],o[p])}return{tangents:i,normals:o,binormals:r}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){const t={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}}class uh extends Ei{constructor(t=0,e=0,n=1,i=1,o=0,r=Math.PI*2,a=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=i,this.aStartAngle=o,this.aEndAngle=r,this.aClockwise=a,this.aRotation=l}getPoint(t,e=new Rt){const n=e,i=Math.PI*2;let o=this.aEndAngle-this.aStartAngle;const r=Math.abs(o)<Number.EPSILON;for(;o<0;)o+=i;for(;o>i;)o-=i;o<Number.EPSILON&&(r?o=0:o=i),this.aClockwise===!0&&!r&&(o===i?o=-i:o=o-i);const a=this.aStartAngle+t*o;let l=this.aX+this.xRadius*Math.cos(a),h=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){const c=Math.cos(this.aRotation),d=Math.sin(this.aRotation),u=l-this.aX,v=h-this.aY;l=u*c-v*d+this.aX,h=u*d+v*c+this.aY}return n.set(l,h)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){const t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}}class Ox extends uh{constructor(t,e,n,i,o,r){super(t,e,n,n,i,o,r),this.isArcCurve=!0,this.type="ArcCurve"}}function dh(){let s=0,t=0,e=0,n=0;function i(o,r,a,l){s=o,t=a,e=-3*o+3*r-2*a-l,n=2*o-2*r+a+l}return{initCatmullRom:function(o,r,a,l,h){i(r,a,h*(a-o),h*(l-r))},initNonuniformCatmullRom:function(o,r,a,l,h,c,d){let u=(r-o)/h-(a-o)/(h+c)+(a-r)/c,v=(a-r)/c-(l-r)/(c+d)+(l-a)/d;u*=c,v*=c,i(r,a,u,v)},calc:function(o){const r=o*o,a=r*o;return s+t*o+e*r+n*a}}}const ga=new C,Il=new dh,zl=new dh,Nl=new dh;class Cd extends Ei{constructor(t=[],e=!1,n="centripetal",i=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=i}getPoint(t,e=new C){const n=e,i=this.points,o=i.length,r=(o-(this.closed?0:1))*t;let a=Math.floor(r),l=r-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/o)+1)*o:l===0&&a===o-1&&(a=o-2,l=1);let h,c;this.closed||a>0?h=i[(a-1)%o]:(ga.subVectors(i[0],i[1]).add(i[0]),h=ga);const d=i[a%o],u=i[(a+1)%o];if(this.closed||a+2<o?c=i[(a+2)%o]:(ga.subVectors(i[o-1],i[o-2]).add(i[o-1]),c=ga),this.curveType==="centripetal"||this.curveType==="chordal"){const v=this.curveType==="chordal"?.5:.25;let p=Math.pow(h.distanceToSquared(d),v),g=Math.pow(d.distanceToSquared(u),v),f=Math.pow(u.distanceToSquared(c),v);g<1e-4&&(g=1),p<1e-4&&(p=g),f<1e-4&&(f=g),Il.initNonuniformCatmullRom(h.x,d.x,u.x,c.x,p,g,f),zl.initNonuniformCatmullRom(h.y,d.y,u.y,c.y,p,g,f),Nl.initNonuniformCatmullRom(h.z,d.z,u.z,c.z,p,g,f)}else this.curveType==="catmullrom"&&(Il.initCatmullRom(h.x,d.x,u.x,c.x,this.tension),zl.initCatmullRom(h.y,d.y,u.y,c.y,this.tension),Nl.initCatmullRom(h.z,d.z,u.z,c.z,this.tension));return n.set(Il.calc(l),zl.calc(l),Nl.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(i.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const i=this.points[e];t.points.push(i.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(new C().fromArray(i))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}}function X0(s,t,e,n,i){const o=(n-t)*.5,r=(i-e)*.5,a=s*s,l=s*a;return(2*e-2*n+o+r)*l+(-3*e+3*n-2*o-r)*a+o*s+e}function Bx(s,t){const e=1-s;return e*e*t}function Hx(s,t){return 2*(1-s)*s*t}function Gx(s,t){return s*s*t}function Sr(s,t,e,n){return Bx(s,t)+Hx(s,e)+Gx(s,n)}function Vx(s,t){const e=1-s;return e*e*e*t}function Wx(s,t){const e=1-s;return 3*e*e*s*t}function Xx(s,t){return 3*(1-s)*s*s*t}function qx(s,t){return s*s*s*t}function Er(s,t,e,n,i){return Vx(s,t)+Wx(s,e)+Xx(s,n)+qx(s,i)}class Rd extends Ei{constructor(t=new Rt,e=new Rt,n=new Rt,i=new Rt){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new Rt){const n=e,i=this.v0,o=this.v1,r=this.v2,a=this.v3;return n.set(Er(t,i.x,o.x,r.x,a.x),Er(t,i.y,o.y,r.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Yx extends Ei{constructor(t=new C,e=new C,n=new C,i=new C){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new C){const n=e,i=this.v0,o=this.v1,r=this.v2,a=this.v3;return n.set(Er(t,i.x,o.x,r.x,a.x),Er(t,i.y,o.y,r.y,a.y),Er(t,i.z,o.z,r.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Pd extends Ei{constructor(t=new Rt,e=new Rt){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new Rt){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new Rt){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class $x extends Ei{constructor(t=new C,e=new C){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new C){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new C){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Ld extends Ei{constructor(t=new Rt,e=new Rt,n=new Rt){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new Rt){const n=e,i=this.v0,o=this.v1,r=this.v2;return n.set(Sr(t,i.x,o.x,r.x),Sr(t,i.y,o.y,r.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Dd extends Ei{constructor(t=new C,e=new C,n=new C){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new C){const n=e,i=this.v0,o=this.v1,r=this.v2;return n.set(Sr(t,i.x,o.x,r.x),Sr(t,i.y,o.y,r.y),Sr(t,i.z,o.z,r.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Id extends Ei{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new Rt){const n=e,i=this.points,o=(i.length-1)*t,r=Math.floor(o),a=o-r,l=i[r===0?r:r-1],h=i[r],c=i[r>i.length-2?i.length-1:r+1],d=i[r>i.length-3?i.length-1:r+2];return n.set(X0(a,l.x,h.x,c.x,d.x),X0(a,l.y,h.y,c.y,d.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(i.clone())}return this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const i=this.points[e];t.points.push(i.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(new Rt().fromArray(i))}return this}}var jc=Object.freeze({__proto__:null,ArcCurve:Ox,CatmullRomCurve3:Cd,CubicBezierCurve:Rd,CubicBezierCurve3:Yx,EllipseCurve:uh,LineCurve:Pd,LineCurve3:$x,QuadraticBezierCurve:Ld,QuadraticBezierCurve3:Dd,SplineCurve:Id});class jx extends Ei{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){const t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){const n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new jc[n](e,t))}return this}getPoint(t,e){const n=t*this.getLength(),i=this.getCurveLengths();let o=0;for(;o<i.length;){if(i[o]>=n){const r=i[o]-n,a=this.curves[o],l=a.getLength(),h=l===0?0:1-r/l;return a.getPointAt(h,e)}o++}return null}getLength(){const t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const t=[];let e=0;for(let n=0,i=this.curves.length;n<i;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){const e=[];let n;for(let i=0,o=this.curves;i<o.length;i++){const r=o[i],a=r.isEllipseCurve?t*2:r.isLineCurve||r.isLineCurve3?1:r.isSplineCurve?t*r.points.length:t,l=r.getPoints(a);for(let h=0;h<l.length;h++){const c=l[h];n&&n.equals(c)||(e.push(c),n=c)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const i=t.curves[e];this.curves.push(i.clone())}return this.autoClose=t.autoClose,this}toJSON(){const t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){const i=this.curves[e];t.curves.push(i.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const i=t.curves[e];this.curves.push(new jc[i.type]().fromJSON(i))}return this}}class Zx extends jx{constructor(t){super(),this.type="Path",this.currentPoint=new Rt,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){const n=new Pd(this.currentPoint.clone(),new Rt(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,i){const o=new Ld(this.currentPoint.clone(),new Rt(t,e),new Rt(n,i));return this.curves.push(o),this.currentPoint.set(n,i),this}bezierCurveTo(t,e,n,i,o,r){const a=new Rd(this.currentPoint.clone(),new Rt(t,e),new Rt(n,i),new Rt(o,r));return this.curves.push(a),this.currentPoint.set(o,r),this}splineThru(t){const e=[this.currentPoint.clone()].concat(t),n=new Id(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,i,o,r){const a=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+a,e+l,n,i,o,r),this}absarc(t,e,n,i,o,r){return this.absellipse(t,e,n,n,i,o,r),this}ellipse(t,e,n,i,o,r,a,l){const h=this.currentPoint.x,c=this.currentPoint.y;return this.absellipse(t+h,e+c,n,i,o,r,a,l),this}absellipse(t,e,n,i,o,r,a,l){const h=new uh(t,e,n,i,o,r,a,l);if(this.curves.length>0){const d=h.getPoint(0);d.equals(this.currentPoint)||this.lineTo(d.x,d.y)}this.curves.push(h);const c=h.getPoint(1);return this.currentPoint.copy(c),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){const t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}}class $a extends oe{constructor(t=[new Rt(0,-.5),new Rt(.5,0),new Rt(0,.5)],e=12,n=0,i=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:t,segments:e,phiStart:n,phiLength:i},e=Math.floor(e),i=Je(i,0,Math.PI*2);const o=[],r=[],a=[],l=[],h=[],c=1/e,d=new C,u=new Rt,v=new C,p=new C,g=new C;let f=0,m=0;for(let y=0;y<=t.length-1;y++)switch(y){case 0:f=t[y+1].x-t[y].x,m=t[y+1].y-t[y].y,v.x=m*1,v.y=-f,v.z=m*0,g.copy(v),v.normalize(),l.push(v.x,v.y,v.z);break;case t.length-1:l.push(g.x,g.y,g.z);break;default:f=t[y+1].x-t[y].x,m=t[y+1].y-t[y].y,v.x=m*1,v.y=-f,v.z=m*0,p.copy(v),v.x+=g.x,v.y+=g.y,v.z+=g.z,v.normalize(),l.push(v.x,v.y,v.z),g.copy(p)}for(let y=0;y<=e;y++){const w=n+y*c*i,x=Math.sin(w),b=Math.cos(w);for(let M=0;M<=t.length-1;M++){d.x=t[M].x*x,d.y=t[M].y,d.z=t[M].x*b,r.push(d.x,d.y,d.z),u.x=y/e,u.y=M/(t.length-1),a.push(u.x,u.y);const A=l[3*M+0]*x,S=l[3*M+1],_=l[3*M+0]*b;h.push(A,S,_)}}for(let y=0;y<e;y++)for(let w=0;w<t.length-1;w++){const x=w+y*t.length,b=x,M=x+t.length,A=x+t.length+1,S=x+1;o.push(b,M,S),o.push(A,S,M)}this.setIndex(o),this.setAttribute("position",new Mt(r,3)),this.setAttribute("uv",new Mt(a,2)),this.setAttribute("normal",new Mt(h,3))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new $a(t.points,t.segments,t.phiStart,t.phiLength)}}class fh extends $a{constructor(t=1,e=1,n=4,i=8){const o=new Zx;o.absarc(0,-e/2,t,Math.PI*1.5,0),o.absarc(0,e/2,t,0,Math.PI*.5),super(o.getPoints(n),i),this.type="CapsuleGeometry",this.parameters={radius:t,length:e,capSegments:n,radialSegments:i}}static fromJSON(t){return new fh(t.radius,t.length,t.capSegments,t.radialSegments)}}class ph extends oe{constructor(t=1,e=32,n=0,i=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:i},e=Math.max(3,e);const o=[],r=[],a=[],l=[],h=new C,c=new Rt;r.push(0,0,0),a.push(0,0,1),l.push(.5,.5);for(let d=0,u=3;d<=e;d++,u+=3){const v=n+d/e*i;h.x=t*Math.cos(v),h.y=t*Math.sin(v),r.push(h.x,h.y,h.z),a.push(0,0,1),c.x=(r[u]/t+1)/2,c.y=(r[u+1]/t+1)/2,l.push(c.x,c.y)}for(let d=1;d<=e;d++)o.push(d,d+1,0);this.setIndex(o),this.setAttribute("position",new Mt(r,3)),this.setAttribute("normal",new Mt(a,3)),this.setAttribute("uv",new Mt(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ph(t.radius,t.segments,t.thetaStart,t.thetaLength)}}class be extends oe{constructor(t=1,e=1,n=1,i=32,o=1,r=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:i,heightSegments:o,openEnded:r,thetaStart:a,thetaLength:l};const h=this;i=Math.floor(i),o=Math.floor(o);const c=[],d=[],u=[],v=[];let p=0;const g=[],f=n/2;let m=0;y(),r===!1&&(t>0&&w(!0),e>0&&w(!1)),this.setIndex(c),this.setAttribute("position",new Mt(d,3)),this.setAttribute("normal",new Mt(u,3)),this.setAttribute("uv",new Mt(v,2));function y(){const x=new C,b=new C;let M=0;const A=(e-t)/n;for(let S=0;S<=o;S++){const _=[],E=S/o,T=E*(e-t)+t;for(let F=0;F<=i;F++){const k=F/i,I=k*l+a,O=Math.sin(I),U=Math.cos(I);b.x=T*O,b.y=-E*n+f,b.z=T*U,d.push(b.x,b.y,b.z),x.set(O,A,U).normalize(),u.push(x.x,x.y,x.z),v.push(k,1-E),_.push(p++)}g.push(_)}for(let S=0;S<i;S++)for(let _=0;_<o;_++){const E=g[_][S],T=g[_+1][S],F=g[_+1][S+1],k=g[_][S+1];(t>0||_!==0)&&(c.push(E,T,k),M+=3),(e>0||_!==o-1)&&(c.push(T,F,k),M+=3)}h.addGroup(m,M,0),m+=M}function w(x){const b=p,M=new Rt,A=new C;let S=0;const _=x===!0?t:e,E=x===!0?1:-1;for(let F=1;F<=i;F++)d.push(0,f*E,0),u.push(0,E,0),v.push(.5,.5),p++;const T=p;for(let F=0;F<=i;F++){const I=F/i*l+a,O=Math.cos(I),U=Math.sin(I);A.x=_*U,A.y=f*E,A.z=_*O,d.push(A.x,A.y,A.z),u.push(0,E,0),M.x=O*.5+.5,M.y=U*.5*E+.5,v.push(M.x,M.y),p++}for(let F=0;F<i;F++){const k=b+F,I=T+F;x===!0?c.push(I,I+1,k):c.push(I+1,I,k),S+=3}h.addGroup(m,S,x===!0?1:2),m+=S}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new be(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class mh extends oe{constructor(t=[],e=[],n=1,i=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:n,detail:i};const o=[],r=[];a(i),h(n),c(),this.setAttribute("position",new Mt(o,3)),this.setAttribute("normal",new Mt(o.slice(),3)),this.setAttribute("uv",new Mt(r,2)),i===0?this.computeVertexNormals():this.normalizeNormals();function a(y){const w=new C,x=new C,b=new C;for(let M=0;M<e.length;M+=3)v(e[M+0],w),v(e[M+1],x),v(e[M+2],b),l(w,x,b,y)}function l(y,w,x,b){const M=b+1,A=[];for(let S=0;S<=M;S++){A[S]=[];const _=y.clone().lerp(x,S/M),E=w.clone().lerp(x,S/M),T=M-S;for(let F=0;F<=T;F++)F===0&&S===M?A[S][F]=_:A[S][F]=_.clone().lerp(E,F/T)}for(let S=0;S<M;S++)for(let _=0;_<2*(M-S)-1;_++){const E=Math.floor(_/2);_%2===0?(u(A[S][E+1]),u(A[S+1][E]),u(A[S][E])):(u(A[S][E+1]),u(A[S+1][E+1]),u(A[S+1][E]))}}function h(y){const w=new C;for(let x=0;x<o.length;x+=3)w.x=o[x+0],w.y=o[x+1],w.z=o[x+2],w.normalize().multiplyScalar(y),o[x+0]=w.x,o[x+1]=w.y,o[x+2]=w.z}function c(){const y=new C;for(let w=0;w<o.length;w+=3){y.x=o[w+0],y.y=o[w+1],y.z=o[w+2];const x=f(y)/2/Math.PI+.5,b=m(y)/Math.PI+.5;r.push(x,1-b)}p(),d()}function d(){for(let y=0;y<r.length;y+=6){const w=r[y+0],x=r[y+2],b=r[y+4],M=Math.max(w,x,b),A=Math.min(w,x,b);M>.9&&A<.1&&(w<.2&&(r[y+0]+=1),x<.2&&(r[y+2]+=1),b<.2&&(r[y+4]+=1))}}function u(y){o.push(y.x,y.y,y.z)}function v(y,w){const x=y*3;w.x=t[x+0],w.y=t[x+1],w.z=t[x+2]}function p(){const y=new C,w=new C,x=new C,b=new C,M=new Rt,A=new Rt,S=new Rt;for(let _=0,E=0;_<o.length;_+=9,E+=6){y.set(o[_+0],o[_+1],o[_+2]),w.set(o[_+3],o[_+4],o[_+5]),x.set(o[_+6],o[_+7],o[_+8]),M.set(r[E+0],r[E+1]),A.set(r[E+2],r[E+3]),S.set(r[E+4],r[E+5]),b.copy(y).add(w).add(x).divideScalar(3);const T=f(b);g(M,E+0,y,T),g(A,E+2,w,T),g(S,E+4,x,T)}}function g(y,w,x,b){b<0&&y.x===1&&(r[w]=y.x-1),x.x===0&&x.z===0&&(r[w]=b/2/Math.PI+.5)}function f(y){return Math.atan2(y.z,-y.x)}function m(y){return Math.atan2(-y.y,Math.sqrt(y.x*y.x+y.z*y.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new mh(t.vertices,t.indices,t.radius,t.details)}}class gh extends mh{constructor(t=1,e=0){const n=(1+Math.sqrt(5))/2,i=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],o=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(i,o,t,e),this.type="IcosahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new gh(t.radius,t.detail)}}class hi extends oe{constructor(t=1,e=32,n=16,i=0,o=Math.PI*2,r=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:i,phiLength:o,thetaStart:r,thetaLength:a},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));const l=Math.min(r+a,Math.PI);let h=0;const c=[],d=new C,u=new C,v=[],p=[],g=[],f=[];for(let m=0;m<=n;m++){const y=[],w=m/n;let x=0;m===0&&r===0?x=.5/e:m===n&&l===Math.PI&&(x=-.5/e);for(let b=0;b<=e;b++){const M=b/e;d.x=-t*Math.cos(i+M*o)*Math.sin(r+w*a),d.y=t*Math.cos(r+w*a),d.z=t*Math.sin(i+M*o)*Math.sin(r+w*a),p.push(d.x,d.y,d.z),u.copy(d).normalize(),g.push(u.x,u.y,u.z),f.push(M+x,1-w),y.push(h++)}c.push(y)}for(let m=0;m<n;m++)for(let y=0;y<e;y++){const w=c[m][y+1],x=c[m][y],b=c[m+1][y],M=c[m+1][y+1];(m!==0||r>0)&&v.push(w,x,M),(m!==n-1||l<Math.PI)&&v.push(x,b,M)}this.setIndex(v),this.setAttribute("position",new Mt(p,3)),this.setAttribute("normal",new Mt(g,3)),this.setAttribute("uv",new Mt(f,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new hi(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}class Ar extends oe{constructor(t=1,e=.4,n=12,i=48,o=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:i,arc:o},n=Math.floor(n),i=Math.floor(i);const r=[],a=[],l=[],h=[],c=new C,d=new C,u=new C;for(let v=0;v<=n;v++)for(let p=0;p<=i;p++){const g=p/i*o,f=v/n*Math.PI*2;d.x=(t+e*Math.cos(f))*Math.cos(g),d.y=(t+e*Math.cos(f))*Math.sin(g),d.z=e*Math.sin(f),a.push(d.x,d.y,d.z),c.x=t*Math.cos(g),c.y=t*Math.sin(g),u.subVectors(d,c).normalize(),l.push(u.x,u.y,u.z),h.push(p/i),h.push(v/n)}for(let v=1;v<=n;v++)for(let p=1;p<=i;p++){const g=(i+1)*v+p-1,f=(i+1)*(v-1)+p-1,m=(i+1)*(v-1)+p,y=(i+1)*v+p;r.push(g,f,y),r.push(f,m,y)}this.setIndex(r),this.setAttribute("position",new Mt(a,3)),this.setAttribute("normal",new Mt(l,3)),this.setAttribute("uv",new Mt(h,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ar(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}}class vh extends oe{constructor(t=new Dd(new C(-1,-1,0),new C(-1,1,0),new C(1,1,0)),e=64,n=1,i=8,o=!1){super(),this.type="TubeGeometry",this.parameters={path:t,tubularSegments:e,radius:n,radialSegments:i,closed:o};const r=t.computeFrenetFrames(e,o);this.tangents=r.tangents,this.normals=r.normals,this.binormals=r.binormals;const a=new C,l=new C,h=new Rt;let c=new C;const d=[],u=[],v=[],p=[];g(),this.setIndex(p),this.setAttribute("position",new Mt(d,3)),this.setAttribute("normal",new Mt(u,3)),this.setAttribute("uv",new Mt(v,2));function g(){for(let w=0;w<e;w++)f(w);f(o===!1?e:0),y(),m()}function f(w){c=t.getPointAt(w/e,c);const x=r.normals[w],b=r.binormals[w];for(let M=0;M<=i;M++){const A=M/i*Math.PI*2,S=Math.sin(A),_=-Math.cos(A);l.x=_*x.x+S*b.x,l.y=_*x.y+S*b.y,l.z=_*x.z+S*b.z,l.normalize(),u.push(l.x,l.y,l.z),a.x=c.x+n*l.x,a.y=c.y+n*l.y,a.z=c.z+n*l.z,d.push(a.x,a.y,a.z)}}function m(){for(let w=1;w<=e;w++)for(let x=1;x<=i;x++){const b=(i+1)*(w-1)+(x-1),M=(i+1)*w+(x-1),A=(i+1)*w+x,S=(i+1)*(w-1)+x;p.push(b,M,S),p.push(M,A,S)}}function y(){for(let w=0;w<=e;w++)for(let x=0;x<=i;x++)h.x=w/e,h.y=x/i,v.push(h.x,h.y)}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){const t=super.toJSON();return t.path=this.parameters.path.toJSON(),t}static fromJSON(t){return new vh(new jc[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}}class ce extends Ho{static get type(){return"MeshStandardMaterial"}constructor(t){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.color=new Ht(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ht(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ld,this.normalScale=new Rt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Be,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class sr extends ce{static get type(){return"MeshPhysicalMaterial"}constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new Rt(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Je(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Ht(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Ht(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Ht(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){this._dispersion>0!=t>0&&this.version++,this._dispersion=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}}class Kx extends wn{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Ht(t),this.intensity=e}dispose(){}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(e.object.target=this.target.uuid),e}}const Ul=new jt,q0=new C,Y0=new C;class Jx{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Rt(512,512),this.map=null,this.mapPass=null,this.matrix=new jt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new fs,this._frameExtents=new Rt(1,1),this._viewportCount=1,this._viewports=[new Ne(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,n=this.matrix;q0.setFromMatrixPosition(t.matrixWorld),e.position.copy(q0),Y0.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Y0),e.updateMatrixWorld(),Ul.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Ul),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Ul)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}class Qx extends Jx{constructor(){super(new Go(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class t2 extends Kx{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(wn.DEFAULT_UP),this.updateMatrix(),this.target=new wn,this.shadow=new Qx}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:nh}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=nh);const Fl=new jt;class ja{constructor(t){t=t||{},this.zNear=t.webGL===!0?-1:0,this.vertices={near:[new C,new C,new C,new C],far:[new C,new C,new C,new C]},t.projectionMatrix!==void 0&&this.setFromProjectionMatrix(t.projectionMatrix,t.maxFar||1e4)}setFromProjectionMatrix(t,e){const n=this.zNear,i=t.elements[2*4+3]===0;return Fl.copy(t).invert(),this.vertices.near[0].set(1,1,n),this.vertices.near[1].set(1,-1,n),this.vertices.near[2].set(-1,-1,n),this.vertices.near[3].set(-1,1,n),this.vertices.near.forEach(function(o){o.applyMatrix4(Fl)}),this.vertices.far[0].set(1,1,1),this.vertices.far[1].set(1,-1,1),this.vertices.far[2].set(-1,-1,1),this.vertices.far[3].set(-1,1,1),this.vertices.far.forEach(function(o){o.applyMatrix4(Fl);const r=Math.abs(o.z);i?o.z*=Math.min(e/r,1):o.multiplyScalar(Math.min(e/r,1))}),this.vertices}split(t,e){for(;t.length>e.length;)e.push(new ja);e.length=t.length;for(let n=0;n<t.length;n++){const i=e[n];if(n===0)for(let o=0;o<4;o++)i.vertices.near[o].copy(this.vertices.near[o]);else for(let o=0;o<4;o++)i.vertices.near[o].lerpVectors(this.vertices.near[o],this.vertices.far[o],t[n-1]);if(n===t.length-1)for(let o=0;o<4;o++)i.vertices.far[o].copy(this.vertices.far[o]);else for(let o=0;o<4;o++)i.vertices.far[o].lerpVectors(this.vertices.near[o],this.vertices.far[o],t[n])}}toSpace(t,e){for(let n=0;n<4;n++)e.vertices.near[n].copy(this.vertices.near[n]).applyMatrix4(t),e.vertices.far[n].copy(this.vertices.far[n]).applyMatrix4(t)}}const $0={lights_fragment_begin:`
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
	`+ae.lights_pars_begin},j0=new jt,kl=new ja({webGL:!0}),Ui=new C,or=new Ue,Ol=[],Bl=[],Hl=new jt,Z0=new jt,e2=new C(0,1,0);class n2{constructor(t){this.camera=t.camera,this.parent=t.parent,this.cascades=t.cascades||3,this.maxFar=t.maxFar||1e5,this.mode=t.mode||"practical",this.shadowMapSize=t.shadowMapSize||2048,this.shadowBias=t.shadowBias||1e-6,this.lightDirection=t.lightDirection||new C(1,-1,1).normalize(),this.lightIntensity=t.lightIntensity||3,this.lightNear=t.lightNear||1,this.lightFar=t.lightFar||2e3,this.lightMargin=t.lightMargin||200,this.customSplitsCallback=t.customSplitsCallback,this.fade=!1,this.mainFrustum=new ja({webGL:!0}),this.frustums=[],this.breaks=[],this.lights=[],this.shaders=new Map,this.createLights(),this.updateFrustums(),this.injectInclude()}createLights(){for(let t=0;t<this.cascades;t++){const e=new t2(16777215,this.lightIntensity);e.castShadow=!0,e.shadow.mapSize.width=this.shadowMapSize,e.shadow.mapSize.height=this.shadowMapSize,e.shadow.camera.near=this.lightNear,e.shadow.camera.far=this.lightFar,e.shadow.bias=this.shadowBias,this.parent.add(e),this.parent.add(e.target),this.lights.push(e)}}initCascades(){const t=this.camera;t.updateProjectionMatrix(),this.mainFrustum.setFromProjectionMatrix(t.projectionMatrix,this.maxFar),this.mainFrustum.split(this.breaks,this.frustums)}updateShadowBounds(){const t=this.frustums;for(let e=0;e<t.length;e++){const i=this.lights[e].shadow.camera,o=this.frustums[e],r=o.vertices.near,a=o.vertices.far,l=a[0];let h;l.distanceTo(a[2])>l.distanceTo(r[2])?h=a[2]:h=r[2];let c=l.distanceTo(h);if(this.fade){const d=this.camera,u=Math.max(d.far,this.maxFar),v=o.vertices.far[0].z/(u-d.near),p=.25*Math.pow(v,2)*(u-d.near);c+=p}i.left=-c/2,i.right=c/2,i.top=c/2,i.bottom=-c/2,i.updateProjectionMatrix()}}getBreaks(){const t=this.camera,e=Math.min(t.far,this.maxFar);switch(this.breaks.length=0,this.mode){case"uniform":n(this.cascades,t.near,e,this.breaks);break;case"logarithmic":i(this.cascades,t.near,e,this.breaks);break;case"practical":o(this.cascades,t.near,e,.5,this.breaks);break;case"custom":this.customSplitsCallback===void 0&&console.error("CSM: Custom split scheme callback not defined."),this.customSplitsCallback(this.cascades,t.near,e,this.breaks);break}function n(r,a,l,h){for(let c=1;c<r;c++)h.push((a+(l-a)*c/r)/l);h.push(1)}function i(r,a,l,h){for(let c=1;c<r;c++)h.push(a*(l/a)**(c/r)/l);h.push(1)}function o(r,a,l,h,c){Ol.length=0,Bl.length=0,i(r,a,l,Bl),n(r,a,l,Ol);for(let d=1;d<r;d++)c.push(mn.lerp(Ol[d-1],Bl[d-1],h));c.push(1)}}update(){const t=this.camera,e=this.frustums;Hl.lookAt(new C,this.lightDirection,e2),Z0.copy(Hl).invert();for(let n=0;n<e.length;n++){const i=this.lights[n],o=i.shadow.camera,r=(o.right-o.left)/this.shadowMapSize,a=(o.top-o.bottom)/this.shadowMapSize;j0.multiplyMatrices(Z0,t.matrixWorld),e[n].toSpace(j0,kl);const l=kl.vertices.near,h=kl.vertices.far;or.makeEmpty();for(let c=0;c<4;c++)or.expandByPoint(l[c]),or.expandByPoint(h[c]);or.getCenter(Ui),Ui.z=or.max.z+this.lightMargin,Ui.x=Math.floor(Ui.x/r)*r,Ui.y=Math.floor(Ui.y/a)*a,Ui.applyMatrix4(Hl),i.position.copy(Ui),i.target.position.copy(Ui),i.target.position.x+=this.lightDirection.x,i.target.position.y+=this.lightDirection.y,i.target.position.z+=this.lightDirection.z}}injectInclude(){ae.lights_fragment_begin=$0.lights_fragment_begin,ae.lights_pars_begin=$0.lights_pars_begin}setupMaterial(t){t.defines=t.defines||{},t.defines.USE_CSM=1,t.defines.CSM_CASCADES=this.cascades,this.fade&&(t.defines.CSM_FADE="");const e=[],n=this,i=this.shaders;t.onBeforeCompile=function(o){const r=Math.min(n.camera.far,n.maxFar);n.getExtendedBreaks(e),o.uniforms.CSM_cascades={value:e},o.uniforms.cameraNear={value:n.camera.near},o.uniforms.shadowFar={value:r},i.set(t,o)},i.set(t,null)}updateUniforms(){const t=Math.min(this.camera.far,this.maxFar);this.shaders.forEach(function(n,i){if(n!==null){const o=n.uniforms;this.getExtendedBreaks(o.CSM_cascades.value),o.cameraNear.value=this.camera.near,o.shadowFar.value=t}!this.fade&&"CSM_FADE"in i.defines?(delete i.defines.CSM_FADE,i.needsUpdate=!0):this.fade&&!("CSM_FADE"in i.defines)&&(i.defines.CSM_FADE="",i.needsUpdate=!0)},this)}getExtendedBreaks(t){for(;t.length<this.breaks.length;)t.push(new Rt);t.length=this.breaks.length;for(let e=0;e<this.cascades;e++){const n=this.breaks[e],i=this.breaks[e-1]||0;t[e].x=i,t[e].y=n}}updateFrustums(){this.getBreaks(),this.initCascades(),this.updateShadowBounds(),this.updateUniforms()}remove(){for(let t=0;t<this.lights.length;t++)this.parent.remove(this.lights[t].target),this.parent.remove(this.lights[t])}dispose(){const t=this.shaders;t.forEach(function(e,n){delete n.onBeforeCompile,delete n.defines.USE_CSM,delete n.defines.CSM_CASCADES,delete n.defines.CSM_FADE,e!==null&&(delete e.uniforms.CSM_cascades,delete e.uniforms.cameraNear,delete e.uniforms.shadowFar),n.needsUpdate=!0}),t.clear()}}const Hi=new Uint8Array(512);{const s=new Uint8Array(256);for(let e=0;e<256;e++)s[e]=e;let t=625341585;for(let e=255;e>0;e--){t^=t<<13,t>>>=0,t^=t>>>17,t^=t<<5,t>>>=0;const n=t%(e+1),i=s[e];s[e]=s[n],s[n]=i}for(let e=0;e<512;e++)Hi[e]=s[e&255]}const K0=[1,1,-1,1,1,-1,-1,-1,1,0,-1,0,0,1,0,-1];function J0(s){return s*s*s*(s*(s*6-15)+10)}function Vt(s,t){const e=Math.floor(s),n=Math.floor(t),i=s-e,o=t-n,r=e&255,a=n&255,l=J0(i),h=J0(o),c=(m,y,w)=>{const x=(m&7)*2;return K0[x]*y+K0[x+1]*w},d=Hi[Hi[r]+a],u=Hi[Hi[r]+a+1],v=Hi[Hi[r+1]+a],p=Hi[Hi[r+1]+a+1],g=c(d,i,o)+l*(c(v,i-1,o)-c(d,i,o)),f=c(u,i,o-1)+l*(c(p,i-1,o-1)-c(u,i,o-1));return(g+h*(f-g))*1.41}function Ie(s,t,e=5,n=2,i=.5){let o=.5,r=1,a=0,l=0;for(let h=0;h<e;h++)a+=o*Vt(s*r+h*17.13,t*r-h*9.71),l+=o,o*=i,r*=n;return a/l}function rr(s,t,e=4){let n=.5,i=1,o=0;for(let r=0;r<e;r++){const a=1-Math.abs(Vt(s*i+r*3.3,t*i+r*7.7));o+=a*a*n,n*=.5,i*=2.1}return o}function St(s,t,e){const n=Math.min(1,Math.max(0,(e-s)/(t-s)));return n*n*(3-2*n)}function Qt(s,t,e){return s<t?t:s>e?e:s}function se(s,t,e){return s+(t-s)*e}function gi(s,t,e){const n=Qt(.5+.5*(t-s)/e,0,1);return se(t,s,n)-e*n*(1-n)}const i2=6,s2=1,o2=new Ht(.26,.24,.2),rs=[{el:-18,sun:[.5,.6,.85],sunI:.12,zen:[.006,.01,.024],hor:[.018,.024,.042],haze:[.014,.018,.03],sunHaze:[.02,.022,.03],amb:.15},{el:-8,sun:[.5,.6,.85],sunI:.12,zen:[.006,.011,.028],hor:[.035,.035,.065],haze:[.024,.026,.045],sunHaze:[.06,.03,.03],amb:.16},{el:-2,sun:[.9,.35,.15],sunI:.06,zen:[.015,.035,.1],hor:[.42,.22,.2],haze:[.22,.16,.2],sunHaze:[.9,.35,.18],amb:.4},{el:4,sun:[1,.5,.22],sunI:.3,zen:[.035,.1,.3],hor:[.82,.48,.34],haze:[.5,.4,.4],sunHaze:[1,.55,.3],amb:.85},{el:14,sun:[1,.74,.46],sunI:.62,zen:[.03,.11,.34],hor:[.66,.58,.54],haze:[.54,.52,.54],sunHaze:[1,.75,.5],amb:1},{el:30,sun:[1,.94,.84],sunI:.938,zen:[.022,.12,.32],hor:[.17,.29,.4],haze:[.48,.54,.64],sunHaze:[1,.92,.8],amb:1},{el:90,sun:[1,.97,.93],sunI:1,zen:[.02,.12,.32],hor:[.16,.29,.4],haze:[.47,.54,.65],sunHaze:[.98,.93,.84],amb:1}];function r2(s){let t=rs[0],e=rs[rs.length-1];for(let o=0;o<rs.length-1;o++)if(s>=rs[o].el&&s<=rs[o+1].el){t=rs[o],e=rs[o+1];break}const n=St(t.el,e.el,Qt(s,t.el,e.el)),i=(o,r)=>[se(o[0],r[0],n),se(o[1],r[1],n),se(o[2],r[2],n)];return{el:s,sun:i(t.sun,e.sun),sunI:se(t.sunI,e.sunI,n),zen:i(t.zen,e.zen),hor:i(t.hor,e.hor),haze:i(t.haze,e.haze),sunHaze:i(t.sunHaze,e.sunHaze),amb:se(t.amb,e.amb,n)}}const Q0={clear:{coverage:.27,hazeDensity:15e-6,hazeHeight:1400,windSpeed:3.5,turbulence:.2,cloudBase:1500,cloudTop:3500,rain:0,sunDim:1},scattered:{coverage:.37,hazeDensity:19e-6,hazeHeight:1300,windSpeed:7,turbulence:.4,cloudBase:1300,cloudTop:3500,rain:0,sunDim:.97},cloudy:{coverage:.7,hazeDensity:32e-6,hazeHeight:1100,windSpeed:10,turbulence:.7,cloudBase:900,cloudTop:2e3,rain:0,sunDim:.72},storm:{coverage:.92,hazeDensity:55e-6,hazeHeight:900,windSpeed:15,turbulence:1,cloudBase:700,cloudTop:3200,rain:1,sunDim:.4}};function a2(s){const t=25.8*Math.PI/180,e=10*Math.PI/180,n=(s-12)*15*Math.PI/180,i=Math.sin(t)*Math.sin(e)+Math.cos(t)*Math.cos(e)*Math.cos(n),o=Math.asin(Qt(i,-1,1)),r=(Math.sin(e)-Math.sin(o)*Math.sin(t))/(Math.cos(o)*Math.cos(t)||1e-6);let a=Math.acos(Qt(r,-1,1));return n>0&&(a=2*Math.PI-a),{dir:new C(Math.cos(o)*Math.sin(a),Math.sin(o),-Math.cos(o)*Math.cos(a)).normalize(),elevation:o*180/Math.PI,azimuth:a*180/Math.PI}}class l2{hour=14.5;weather="clear";preset=Q0.clear;state={sunDir:new C(0,1,0),sunElevation:60,sunColor:new Ht,sunIntensity:3,zenith:new Ht,horizon:new Ht,haze:new Ht,sunHaze:new Ht,ground:new Ht,ambientIntensity:1,night:0};uniforms={uSunDir:{value:new C(0,1,0)},uSunColor:{value:new Ht(1,1,1)},uZenithColor:{value:new Ht},uHorizonColor:{value:new Ht},uHazeColor:{value:new Ht},uSunHazeColor:{value:new Ht},uGroundColor:{value:new Ht},uHazeDensity:{value:3e-5},uHazeHeight:{value:1300},uCloudCoverage:{value:.3},uCloudBase:{value:1500},uCloudTop:{value:2600},uCloudWind:{value:new Rt(0,0)},uCloudSeed:{value:0},uNight:{value:0},uTime:{value:0}};cloudOffset=new Rt;windDir=new Rt(1,.35).normalize();time=0;constructor(t){this.uniforms.uCloudSeed.value=t%1e3/1e3*37.7}setWeather(t){this.weather=t,this.preset=Q0[t]}update(t){this.time+=t;const e=this.preset;this.cloudOffset.addScaledVector(this.windDir,e.windSpeed*2.2*t);const{dir:n,elevation:i}=a2(this.hour),o=r2(i),r=this.state,a=new C(-n.x,Math.max(.25,-n.y*.8+.3),-n.z).normalize(),l=St(0,-4,i);r.sunDir.copy(n).lerp(a,l).normalize(),r.sunElevation=i,r.sunColor.setRGB(o.sun[0],o.sun[1],o.sun[2]);const h=o.sunI*e.sunDim;r.sunIntensity=h*se(i2,s2,l),r.zenith.setRGB(o.zen[0],o.zen[1],o.zen[2]),r.horizon.setRGB(o.hor[0],o.hor[1],o.hor[2]),r.haze.setRGB(o.haze[0],o.haze[1],o.haze[2]),r.sunHaze.setRGB(o.sunHaze[0],o.sunHaze[1],o.sunHaze[2]),r.ambientIntensity=o.amb,r.night=1-St(-12,-1,i);const c=St(.45,.95,e.coverage),d=r.horizon.r*.2126+r.horizon.g*.7152+r.horizon.b*.0722,u=new Ht(d,d,d).lerp(r.horizon,.3),v=r.zenith.clone().lerp(u,c*.8),p=r.horizon.clone().lerp(u,c*.7).multiplyScalar(se(1,.9,c)),g=r.haze.clone().lerp(new Ht(d,d,d),c*.6).multiplyScalar(se(1,.9,c)),f=r.zenith.clone().lerp(r.horizon,.3);r.ground.copy(r.sunColor).multiplyScalar(r.sunIntensity*Math.max(r.sunDir.y,0)/Math.PI).add(f).multiply(o2);const m=this.uniforms;m.uSunDir.value.copy(n),m.uSunColor.value.copy(r.sunColor).multiplyScalar(h),m.uZenithColor.value.copy(v),m.uHorizonColor.value.copy(p),m.uHazeColor.value.copy(g),m.uSunHazeColor.value.copy(r.sunHaze).multiplyScalar(se(1,.6,c)),m.uGroundColor.value.copy(r.ground),m.uHazeDensity.value=e.hazeDensity,m.uHazeHeight.value=e.hazeHeight,m.uCloudCoverage.value=e.coverage,m.uCloudBase.value=e.cloudBase,m.uCloudTop.value=e.cloudTop,m.uCloudWind.value.copy(this.cloudOffset),m.uNight.value=r.night,m.uTime.value=this.time}}function tu(s){let t=2166136261;for(let e=0;e<s.length;e++)t^=s.charCodeAt(e),t=Math.imul(t,16777619)>>>0;return t>>>0}function Gl(s,t,e=0){let n=(s|0)*374761393+(t|0)*668265263+(e|0)*2147483647;return n=(n^n>>>13)*1274126177,n=n^n>>>16,(n>>>0)/4294967296}class $e{a;b;c;d;constructor(t){const e=typeof t=="string"?tu(t):t>>>0;this.a=e^2654435769,this.b=e*2246822507>>>0,this.c=e*3266489909>>>0,this.d=1;for(let n=0;n<12;n++)this.next()}next(){this.a>>>=0,this.b>>>=0,this.c>>>=0,this.d>>>=0;let t=this.a+this.b|0;return this.a=this.b^this.b>>>9,this.b=this.c+(this.c<<3)|0,this.c=this.c<<21|this.c>>>11,this.d=this.d+1|0,t=t+this.d|0,this.c=this.c+t|0,(t>>>0)/4294967296}range(t,e){return t+(e-t)*this.next()}int(t,e){return t+Math.floor(this.next()*(e-t+1))}pick(t){return t[Math.floor(this.next()*t.length)]}chance(t){return this.next()<t}gauss(){return(this.next()+this.next()+this.next()+this.next()-2)*1.7320508}fork(t){return new $e(tu(t)^Math.floor(this.next()*4294967295))}}const No=2e4,he=2048,Os=No/he,pn=No/2;var ne=(s=>(s[s.OCEAN=0]="OCEAN",s[s.BAY=1]="BAY",s[s.BEACH=2]="BEACH",s[s.MANGROVE=3]="MANGROVE",s[s.PARK=4]="PARK",s[s.RES_LOW=5]="RES_LOW",s[s.RES_MID=6]="RES_MID",s[s.DOWNTOWN=7]="DOWNTOWN",s[s.HOTEL=8]="HOTEL",s[s.INDUSTRIAL=9]="INDUSTRIAL",s[s.AIRPORT=10]="AIRPORT",s[s.GOLF=11]="GOLF",s[s.ROCK=12]="ROCK",s[s.LOT=13]="LOT",s[s.CONSTRUCTION=14]="CONSTRUCTION",s[s.STADIUM=15]="STADIUM",s[s.MARINA=16]="MARINA",s[s.SANDBAR=17]="SANDBAR",s[s.ROAD=18]="ROAD",s[s.WETLAND_FLAT=19]="WETLAND_FLAT",s))(ne||{});const zd={cx:-1150,cz:-3050,hw:950,hh:300,rot:.04};function c2(s){let t=1/0,e=-1/0,n=1/0,i=-1/0;for(const[a,l]of s.pts)t=Math.min(t,a),e=Math.max(e,a),n=Math.min(n,l),i=Math.max(i,l);const o=(t+e)/2,r=(n+i)/2;return{...s,bx:o,bz:r,br:Math.max(e-t,i-n)/2+s.width+80}}function _o(s,t,e,n,i,o,r,a=0){const l=Math.cos(-r),h=Math.sin(-r),c=s-e,d=t-n,u=c*l-d*h,v=c*h+d*l,p=Math.abs(u)-i+a,g=Math.abs(v)-o+a,f=Math.max(p,0),m=Math.max(g,0);return Math.hypot(f,m)+Math.min(Math.max(p,g),0)-a}function hn(s,t,e,n,i,o,r,a,l=.18){const h=Math.cos(-r),c=Math.sin(-r),d=s-e,u=t-n,v=d*h-u*c,p=d*c+u*h,g=Math.atan2(p/o,v/i),f=Ie(Math.cos(g)*1.7+a*13.1,Math.sin(g)*1.7+a*7.3,4),m=Vt(Math.cos(g)*4.1+a,Math.sin(g)*4.1-a),y=1+l*f+l*.35*m;return(Math.hypot(v/(i*y),p/(o*y))-1)*Math.min(i,o)*y}function Bs(s,t,e,n,i,o){const r=i-e,a=o-n,l=s-e,h=t-n,c=Qt((l*r+h*a)/(r*r+a*a||1),0,1);return Math.hypot(l-r*c,h-a*c)}function eu(s,t,e){let n=1/0;for(let i=0;i<e.length-1;i++)n=Math.min(n,Bs(s,t,e[i][0],e[i][1],e[i+1][0],e[i+1][1]));return n}function nu(s,t,e,n){let i=1/0;for(let o=0;o<e.length-1;o++){const[r,a]=e[o],[l,h]=e[o+1],c=l-r,d=h-a,u=s-r,v=t-a,p=Qt((u*c+v*d)/(c*c+d*d||1),0,1),g=Math.hypot(u-c*p,v-d*p)-se(n[o],n[o+1],p);i=Math.min(i,g)}return i}const ar={cx:195,cz:2520,rx:262,rz:380,rot:.05},gn=[[55,2190],[-5,1790]],Nd=42;function Ud(s,t){return hn(s,t,200,2380,100,62,.5,15,.25)}function h2(s){let t=-2500+320*Ie(s/3400+3.1,.37,3)+110*Ie(s/800+9.2,1.1,3);return t+=520*Math.exp(-(((s+3800)/900)**2)),t+=220*Math.exp(-(((s+2500)/500)**2)),t-=250*St(1200,2400,s)*(1-St(3200,4200,s)),t}const us=[[-2100,-3050],[-2900,-2900],[-3700,-2650],[-4600,-2150],[-5500,-1500],[-6500,-700]],u2=[95,80,62,50,40,32];function d2(s){for(let t=0;t<us.length-1;t++){const[e,n]=us[t],[i,o]=us[t+1];if(s>=n&&s<=o)return se(e,i,(s-n)/(o-n))}return s<us[0][1]?us[0][0]:us[us.length-1][0]}function f2(s){return-9e3+320*Ie(s/2600+1.3,.8,3)}function Fd(){return[{id:"lake-north",cx:-5900,cz:-6600,rx:480,rz:330,rot:.3,seed:61},{id:"lake-west",cx:-7550,cz:550,rx:520,rz:300,rot:-.2,seed:62},{id:"lake-south",cx:-4300,cz:4300,rx:380,rz:260,rot:.5,seed:63}]}function p2(){const s=[],t=Fd();s.push({id:"mainland",bx:-6e3,bz:0,br:2e4,sd:(a,l)=>{let h=a-h2(l);const c=nu(a,l,us,u2);h=Math.max(h,-c);for(const d of t)Math.abs(a-d.cx)>d.rx*1.6||Math.abs(l-d.cz)>d.rz*1.8||(h=Math.max(h,-hn(a,l,d.cx,d.cz,d.rx,d.rz,d.rot,d.seed,.22)));return h},beach:40,height:3.2,seabed:.02,shelf:3.2});const e=[[2750,-8200],[2700,-6800],[2640,-5400],[2600,-4e3],[2520,-2600],[2400,-1500],[2250,-900],[2050,-500]],n=[280,420,460,430,380,330,240,90];s.push({id:"barrier",bx:2500,bz:-4200,br:5200,sd:(a,l)=>{const h=nu(a,l,e,n),c=60*Ie(a/700+1.2,l/700+4.4,3);return h+c},beach:62,height:2.6,seabed:.012,shelf:6}),s.push({id:"garza",bx:190,bz:2450,br:1e3,sd:(a,l)=>{let h=hn(a,l,ar.cx,ar.cz,ar.rx,ar.rz,ar.rot,11,.14);return h=gi(h,hn(a,l,260,2900,160,150,.1,12,.2),110),h=gi(h,hn(a,l,-10,2740,115,120,.3,13,.25),100),h=gi(h,hn(a,l,390,2500,100,150,0,17,.2),110),h=gi(h,hn(a,l,375,2160,85,115,.2,14,.2),110),h=gi(h,hn(a,l,130,2240,110,85,-.1,16,.2),100),h=gi(h,Bs(a,l,gn[0][0],gn[0][1],gn[1][0],gn[1][1])-Nd,60),h=Math.max(h,-Ud(a,l)*2.5+12),h},beach:70,height:2.4,seabed:.01,shelf:3.5,isle:!0}),s.push({id:"isla-b",bx:-1350,bz:2560,br:800,sd:(a,l)=>hn(a,l,-1350,2560,420,260,.05,21,.2),beach:50,height:2.3,seabed:.012,shelf:3.5,isle:!0}),s.push({id:"southkey",bx:1900,bz:5700,br:3200,sd:(a,l)=>{let h=hn(a,l,1900,5700,1500,1050,.25,31,.14);return h=gi(h,hn(a,l,1e3,6400,700,500,-.3,32,.24),300),h=gi(h,hn(a,l,2900,4900,500,700,.5,33,.18),260),h},beach:80,height:2.8,seabed:.014,shelf:6,rocky:!0,isle:!0}),s.push({id:"tortuga",bx:1180,bz:-830,br:900,sd:(a,l)=>gi(hn(a,l,1180,-830,520,300,.35,51,.2),Bs(a,l,985,-410,1150,-650)-56,60),beach:55,height:2.3,seabed:.012,shelf:3.5,isle:!0});const i=zd;s.push({id:"port",bx:i.cx,bz:i.cz,br:1300,sd:(a,l)=>_o(a,l,i.cx,i.cz,i.hw,i.hh,i.rot,30),beach:0,height:3,seabed:.06,shelf:6}),s.push({id:"isla-n1",bx:-450,bz:-3900,br:750,sd:(a,l)=>hn(a,l,-450,-3900,375,200,.1,41,.2),beach:45,height:2.3,seabed:.012,shelf:3.5,isle:!0}),s.push({id:"isla-n2",bx:700,bz:-4e3,br:800,sd:(a,l)=>hn(a,l,700,-4e3,400,210,-.15,42,.2),beach:45,height:2.3,seabed:.012,shelf:3.5,isle:!0}),s.push({id:"isla-n3",bx:1550,bz:-4100,br:650,sd:(a,l)=>hn(a,l,1550,-4100,315,170,.2,43,.22),beach:45,height:2.3,seabed:.012,shelf:3.5,isle:!0});for(let a=0;a<5;a++){const l=-3e3+a*330;s.push({id:`finger-${a}`,bx:1870-a*25,bz:l,br:520,sd:(h,c)=>_o(h,c,1870-a*25,l,300,95,.02,40),beach:25,height:2.4,seabed:.05,shelf:3.5})}const o=new $e("mangrove-islets"),r=[[-1700,-1800,900,600,9],[-1500,1300,800,500,8],[-500,-6200,1800,900,12],[900,-6600,1200,700,8],[700,4300,700,450,6],[-1e3,4600,1100,600,7]];for(const[a,l,h,c,d]of r)for(let u=0;u<d;u++){const v=a+o.gauss()*h*.45,p=l+o.gauss()*c*.45,g=o.range(70,240),f=o.range(60,180),m=o.range(0,Math.PI),y=o.int(100,900);s.push({id:`mang-${a}-${u}`,bx:v,bz:p,br:Math.max(g,f)*1.6+60,sd:(w,x)=>hn(w,x,v,p,g,f,m,y,.35),beach:0,height:.55,seabed:.004,shelf:1.6,wet:!0})}return s}function m2(){const s=[],t=e=>s.push(e);return t({id:"downtown",zone:7,cx:-2650,cz:-3900,hw:750,hh:620,rot:.02,gridX:130,gridZ:110,density:.92,hMin:40,hMax:260}),t({id:"brickell",zone:6,cx:-2900,cz:-2350,hw:550,hh:420,rot:.02,gridX:120,gridZ:120,density:.85,hMin:25,hMax:120}),t({id:"midtown",zone:6,cx:-3500,cz:-5300,hw:900,hh:700,rot:0,gridX:120,gridZ:140,density:.8,hMin:12,hMax:60}),t({id:"construction-dt",zone:14,cx:-2250,cz:-4250,hw:70,hh:60,rot:.02,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"construction-dt2",zone:14,cx:-3150,cz:-3550,hw:65,hh:55,rot:.02,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"construction-hotel",zone:14,cx:2480,cz:-2450,hw:60,hh:60,rot:-.1,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"stadium-lot",zone:13,cx:-2900,cz:-2e3,hw:330,hh:260,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"bayfront-park",zone:4,cx:-2050,cz:-4300,hw:170,hh:380,rot:.02,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"industrial-river",zone:9,cx:-3300,cz:-3050,hw:700,hh:380,rot:-.1,gridX:170,gridZ:160,density:.6,hMin:6,hMax:16}),t({id:"industrial-port",zone:9,cx:-1150,cz:-3050,hw:950,hh:300,rot:.04,gridX:0,gridZ:0,density:.5,hMin:6,hMax:14}),t({id:"airport",zone:10,cx:-7800,cz:-1400,hw:1100,hh:900,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"airstrip",zone:10,cx:2500,cz:5750,hw:700,hh:130,rot:.55,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"inland-golf",zone:11,cx:-5200,cz:-3950,hw:480,hh:380,rot:.1,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"west-golf",zone:11,cx:-6300,cz:3600,hw:500,hh:400,rot:-.15,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"north-park",zone:4,cx:-4350,cz:-6650,hw:380,hh:300,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"south-park",zone:4,cx:-4950,cz:2150,hw:420,hh:280,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"garza-park",zone:4,cx:365,cz:2160,hw:120,hh:105,rot:.2,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"barrier-golf",zone:11,cx:2680,cz:-5300,hw:420,hh:520,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"southkey-golf",zone:11,cx:1300,cz:6300,hw:550,hh:420,rot:-.3,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"north-res",zone:5,cx:-5600,cz:-5400,hw:2100,hh:1800,rot:0,gridX:95,gridZ:140,density:.75,hMin:4,hMax:11}),t({id:"west-res",zone:5,cx:-5300,cz:-2700,hw:1500,hh:1150,rot:0,gridX:100,gridZ:130,density:.75,hMin:4,hMax:12}),t({id:"mid-res",zone:5,cx:-4900,cz:-900,hw:1400,hh:600,rot:0,gridX:105,gridZ:140,density:.55,hMin:4,hMax:10}),t({id:"south-res",zone:5,cx:-4200,cz:1300,hw:1700,hh:1500,rot:0,gridX:105,gridZ:135,density:.7,hMin:4,hMax:10}),t({id:"far-west-res",zone:5,cx:-7950,cz:-4200,hw:650,hh:3e3,rot:0,gridX:110,gridZ:150,density:.45,hMin:4,hMax:10}),t({id:"west-res-2",zone:5,cx:-7750,cz:900,hw:850,hh:2e3,rot:0,gridX:115,gridZ:150,density:.4,hMin:4,hMax:9}),t({id:"far-south-res",zone:5,cx:-6600,cz:4300,hw:2e3,hh:1400,rot:0,gridX:105,gridZ:140,density:.55,hMin:4,hMax:10}),t({id:"south-shore-res",zone:5,cx:-3900,cz:3900,hw:1400,hh:900,rot:0,gridX:105,gridZ:135,density:.6,hMin:4,hMax:10}),t({id:"far-south-res-2",zone:5,cx:-4800,cz:6500,hw:2e3,hh:1200,rot:0,gridX:110,gridZ:140,density:.5,hMin:4,hMax:9}),t({id:"far-south-res-4",zone:5,cx:-7700,cz:6700,hw:900,hh:1e3,rot:0,gridX:120,gridZ:150,density:.38,hMin:4,hMax:9}),t({id:"south-edge-res",zone:5,cx:-5500,cz:8800,hw:3100,hh:1100,rot:0,gridX:120,gridZ:150,density:.35,hMin:4,hMax:9}),t({id:"north-res-2",zone:5,cx:-4800,cz:-8e3,hw:2400,hh:800,rot:0,gridX:100,gridZ:140,density:.55,hMin:4,hMax:10}),t({id:"far-north-res",zone:5,cx:-7950,cz:-8e3,hw:650,hh:800,rot:0,gridX:120,gridZ:150,density:.4,hMin:4,hMax:9}),t({id:"north-edge-res",zone:5,cx:-5500,cz:-9400,hw:3100,hh:600,rot:0,gridX:120,gridZ:150,density:.35,hMin:4,hMax:9}),t({id:"south-bayfront",zone:6,cx:-3e3,cz:-900,hw:480,hh:650,rot:0,gridX:120,gridZ:130,density:.6,hMin:8,hMax:35}),t({id:"hotel-south",zone:8,cx:2330,cz:-1500,hw:330,hh:1250,rot:-.12,gridX:130,gridZ:110,density:.85,hMin:20,hMax:110}),t({id:"hotel-mid",zone:8,cx:2600,cz:-3800,hw:300,hh:1300,rot:-.03,gridX:130,gridZ:105,density:.85,hMin:25,hMax:130}),t({id:"barrier-res",zone:5,cx:2650,cz:-6900,hw:350,hh:1200,rot:0,gridX:90,gridZ:110,density:.7,hMin:4,hMax:12}),t({id:"finger-res",zone:5,cx:1820,cz:-2340,hw:330,hh:760,rot:.02,gridX:0,gridZ:0,density:.7,hMin:4,hMax:9}),t({id:"garza-res",zone:5,cx:40,cz:2770,hw:200,hh:170,rot:.1,gridX:0,gridZ:0,density:.55,hMin:4,hMax:9,track:[[-10,2600],[-60,2690],[-60,2780],[20,2800],[110,2830],[200,2800]]}),t({id:"tortuga-res",zone:5,cx:1180,cz:-830,hw:420,hh:230,rot:.35,gridX:0,gridZ:0,density:.55,hMin:4,hMax:10,track:[[1156,-656],[1031,-714],[886,-842],[891,-1e3],[1062,-1033],[1225,-952],[1340,-885]]}),t({id:"isla-b-res",zone:5,cx:-1350,cz:2560,hw:330,hh:190,rot:.05,gridX:0,gridZ:0,density:.5,hMin:4,hMax:9,track:[[-1500,2577],[-1480,2680],[-1320,2720],[-1180,2660],[-1140,2547]]}),t({id:"southkey-res",zone:5,cx:2200,cz:5300,hw:700,hh:500,rot:.25,gridX:130,gridZ:150,density:.6,hMin:4,hMax:10}),t({id:"isla-n-res",zone:5,cx:700,cz:-4e3,hw:300,hh:160,rot:-.15,gridX:0,gridZ:0,density:.5,hMin:4,hMax:9,track:[[700,-3990],[640,-4075],[760,-4125],[880,-4085],[1030,-4030]]}),t({id:"isla-n1-res",zone:5,cx:-450,cz:-3900,hw:270,hh:150,rot:.1,gridX:0,gridZ:0,density:.5,hMin:4,hMax:9,track:[[-450,-3880],[-520,-3975],[-400,-4030],[-270,-3985],[-150,-3900]]}),s}function g2(s){const t=new $e("streets"),e=new Map;for(const n of s){if(n.gridX<=0||n.gridZ<=0)continue;const i=[];for(let r=-n.hw;r<=n.hw+1;r+=n.gridX*t.range(.9,1.15))i.push(Math.min(r,n.hw));const o=[];for(let r=-n.hh;r<=n.hh+1;r+=n.gridZ*t.range(.9,1.15))o.push(Math.min(r,n.hh));e.set(n.id,{xs:i,zs:o})}return e}function v2(s,t){const e=[],n=new $e("canals"),i=s.find(l=>l.id==="south-res"),o=i&&t.get(i.id);if(i&&o){const l=[...o.xs.map(h=>i.cx+h),-3400];for(let h=3;h<o.zs.length-3;h+=2){const c=i.cz+(o.zs[h]+o.zs[h+1])/2,d=n.range(1100,1900),u=i.cx+i.hw;e.push({id:`canal-s-${h}`,a:[u+320,c],b:[u-d,c],width:24,depth:2.6,culverts:l,culvertHalf:9.5})}}const r=s.find(l=>l.id==="west-res"),a=r&&t.get(r.id);if(r&&a){const l=a.xs.map(h=>r.cx+h);for(let h=1;h<a.zs.length-1;h++){const c=r.cz+(a.zs[h]+a.zs[h+1])/2;if(c<-2650||c>-1650||h%2===0)continue;const d=d2(c),u=n.range(700,1200);d-u>r.cx-r.hw+120&&e.push({id:`canal-w-${h}`,a:[d+90,c],b:[d-u,c],width:20,depth:2.4,culverts:l,culvertHalf:8.5}),h%4===1&&d+500<r.cx+r.hw-150&&e.push({id:`canal-e-${h}`,a:[d-90,c],b:[Math.min(d+n.range(450,700),r.cx+r.hw-150),c],width:18,depth:2.4,culverts:l,culvertHalf:8.5})}}return e}function x2(){const s=[];return s.push({id:"south-hwy-mainland",cls:"highway",width:22,lanes:4,traffic:14,pts:[[-6900,2650],[-6e3,2650],[-4500,2700],[-3400,2700],[-2790,2690]]}),s.push({id:"garza-hwy",cls:"highway",width:22,lanes:4,traffic:14,pts:[[-1650,2590],[-1050,2540],[-990,2537]]}),s.push({id:"garza-hwy-2",cls:"highway",width:22,lanes:4,traffic:14,pts:[[-10,2600],[10,2450],[30,2300],[gn[0][0],gn[0][1]],[gn[1][0],gn[1][1]]]}),s.push({id:"garza-east",cls:"arterial",width:14,lanes:2,traffic:5,pts:[[30,2300],[150,2265],[280,2235],[355,2185],[385,2160],[400,2195],[370,2220],[335,2205],[355,2185]]}),s.push({id:"garza-marina-rd",cls:"street",width:9,lanes:2,traffic:2,pts:[[355,2185],[395,2125],[420,2075]]}),s.push({id:"tortuga-rd",cls:"highway",width:22,lanes:4,traffic:12,pts:[[980,-400],[1200,-720],[1415,-1015]]}),s.push({id:"dt-bayshore",cls:"arterial",width:16,lanes:4,traffic:10,pts:[[-3400,-5300],[-2900,-5150],[-2560,-4950],[-2420,-4700],[-2330,-4450],[-2260,-4200],[-2200,-3900],[-2100,-3700],[-2150,-3450],[-2200,-3300],[-2380,-3110]]}),s.push({id:"dt-bayshore-s",cls:"arterial",width:16,lanes:4,traffic:10,pts:[[-2470,-2870],[-2450,-2600],[-2550,-2200],[-2680,-1800],[-2760,-1500],[-3350,-1500]]}),s.push({id:"dt-avenue",cls:"arterial",width:16,lanes:4,traffic:9,pts:[[-3400,-9900],[-3400,-7300],[-3400,-6e3],[-3400,-4600],[-3350,-3500],[-3330,-2900]]}),s.push({id:"dt-avenue-s",cls:"arterial",width:16,lanes:4,traffic:9,pts:[[-3290,-2650],[-3350,-1500],[-3400,0],[-3400,1600],[-3400,2700]]}),s.push({id:"north-cw-approach",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-3400,-6e3],[-2900,-6350],[-2545,-6626]]}),s.push({id:"west-arterial",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-6800,-9900],[-6800,-7e3],[-6800,-4e3],[-6800,-300],[-6900,1500],[-6900,2650]]}),s.push({id:"north-arterial",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-9900,-5300],[-8500,-5300],[-6800,-5300],[-4400,-5300],[-3400,-5300]]}),s.push({id:"airport-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[-6800,-2050],[-7300,-2050],[-7800,-2050]]}),s.push({id:"mid-arterial",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-9900,-300],[-8500,-300],[-6800,-300],[-5500,-300],[-4400,-320],[-3400,-300]]}),s.push({id:"south-arterial",cls:"arterial",width:15,lanes:4,traffic:6,pts:[[-9900,1200],[-8500,1200],[-6900,1200],[-5e3,1250],[-3400,1300]]}),s.push({id:"barrier-spine",cls:"arterial",width:16,lanes:4,traffic:10,pts:[[2720,-8e3],[2680,-6600],[2620,-5200],[2600,-4e3],[2520,-2600],[2400,-1500],[2260,-800],[2050,-500]]}),s.push({id:"barrier-spine-loop",cls:"street",width:10,lanes:2,traffic:2,pts:[[2720,-8e3],[2775,-8060],[2760,-8135],[2695,-8145],[2660,-8080],[2720,-8e3]]}),s.push({id:"barrier-beach-rd",cls:"street",width:10,lanes:2,traffic:4,pts:[[2680,-6600],[2900,-6400],[2880,-5200],[2850,-4e3],[2790,-2700],[2650,-1500],[2400,-1500]]}),s.push({id:"southkey-rd",cls:"arterial",width:14,lanes:2,traffic:5,pts:[[1465,4695],[1600,5e3],[1900,5400],[2300,5700],[2700,6100],[2600,6350],[2200,6450],[1700,6250],[1500,5900],[1900,5400]]}),s.push({id:"southkey-rd-2",cls:"street",width:10,lanes:2,traffic:3,pts:[[1500,5900],[1250,6200]]}),s.push({id:"southkey-marina-rd",cls:"street",width:9,lanes:2,traffic:2,pts:[[1600,5e3],[1420,4880],[1260,4780]]}),s.push({id:"isla-n-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[-760,-3880],[-450,-3880],[-150,-3900]]}),s.push({id:"isla-n2-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[380,-3980],[700,-3990],[1030,-4030]]}),s.push({id:"isla-n3-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[1335,-4082],[1550,-4100],[1780,-4120]]}),s.push({id:"port-rd",cls:"arterial",width:14,lanes:2,traffic:5,pts:[[-2050,-3050],[-1600,-3050],[-1150,-3050],[-700,-3060],[-260,-3070]]}),s}function w2(){const s=[];return s.push({id:"garza-bridge",pts:[[gn[1][0],gn[1][1]],[330,1250],[700,300],[980,-400]],width:30,deck:8,archHeight:26,archT:.51,archLength:560,lanes:6,traffic:16}),s.push({id:"tortuga-bridge",pts:[[1415,-1015],[1800,-600],[2050,-500]],width:22,deck:7,archHeight:18,archT:.45,archLength:380,lanes:4,traffic:12}),s.push({id:"garza-west",pts:[[-990,2537],[-10,2600]],width:22,deck:6,archHeight:0,archT:.5,archLength:0,lanes:4,traffic:14}),s.push({id:"islab-west",pts:[[-2790,2690],[-2100,2650],[-1650,2590]],width:22,deck:7,archHeight:18,archT:.45,archLength:360,lanes:4,traffic:14}),s.push({id:"north-cw-1",pts:[[-2100,-3700],[-1500,-3780],[-760,-3880]],width:24,deck:8,archHeight:26,archT:.4,archLength:480,lanes:6,traffic:14}),s.push({id:"north-cw-2",pts:[[-150,-3900],[380,-3980]],width:24,deck:8,archHeight:0,archT:.5,archLength:0,lanes:6,traffic:14}),s.push({id:"north-cw-3",pts:[[1030,-4030],[1335,-4082]],width:24,deck:8,archHeight:0,archT:.5,archLength:0,lanes:6,traffic:14}),s.push({id:"north-cw-4",pts:[[1780,-4120],[2200,-4080],[2600,-4e3]],width:24,deck:8,archHeight:20,archT:.5,archLength:380,lanes:6,traffic:14}),s.push({id:"far-north-cw",pts:[[-2545,-6626],[-1e3,-6750],[500,-6800],[1800,-6850],[2650,-6900]],width:18,deck:7,archHeight:16,archT:.55,archLength:360,lanes:4,traffic:7}),s.push({id:"port-bridge",pts:[[-2200,-3300],[-2050,-3050]],width:14,deck:6,archHeight:0,archT:.5,archLength:0,lanes:2,traffic:5}),s.push({id:"bayshore-river",pts:[[-2380,-3110],[-2470,-2870]],width:16,deck:6,archHeight:0,archT:.5,archLength:0,lanes:4,traffic:10}),s.push({id:"avenue-river",pts:[[-3330,-2900],[-3290,-2650]],width:16,deck:6,archHeight:0,archT:.5,archLength:0,lanes:4,traffic:9}),s}function y2(){return[{id:"dt-marina",x:-2150,z:-4150,rot:Math.PI*.5,piers:7,pierLen:110},{id:"garza-marina",x:420,z:2035,rot:0,piers:5,pierLen:90},{id:"barrier-marina",x:2075,z:-1400,rot:-Math.PI*.5,piers:6,pierLen:100},{id:"south-marina",x:-2760,z:2950,rot:Math.PI*.5,piers:4,pierLen:80},{id:"southkey-marina",x:1238,z:4730,rot:.09,piers:4,pierLen:80},{id:"north-marina",x:-2535,z:-5600,rot:Math.PI*.5,piers:5,pierLen:90}]}function _2(){return[{id:"rwy-09",a:[-8800,-1350],b:[-6950,-1350],width:50},{id:"rwy-13",a:[-8500,-2150],b:[-7073,-896],width:42},{id:"strip-southkey",a:[1950,5450],b:[3100,6100],width:24}]}function M2(){return[{id:"ship-channel",pts:[[4200,2200],[3e3,1600],[2e3,600],[1e3,-1200],[200,-2600],[-450,-3350]],width:180,depth:14,boats:3,speed:5},{id:"intracoastal",pts:[[1800,-7600],[1900,-6200],[1950,-4500],[2e3,-3200],[1950,-1800],[1850,-800],[1700,200]],width:110,depth:6,boats:8,speed:9},{id:"garza-channel",pts:[[-1e3,3300],[200,3250],[1e3,3100],[1900,2400],[2600,1400],[3400,400]],width:90,depth:7,boats:9,speed:12},{id:"arch-channel",pts:[[-1200,1200],[-300,1e3],[500,750],[1400,300],[2400,-100]],width:100,depth:8,boats:6,speed:11},{id:"ref-boats",pts:[[-200,3550],[300,3250],[520,2950],[800,2600],[1200,2250]],width:40,depth:4,boats:3,speed:18},{id:"flats-route",pts:[[-2100,3400],[-1200,3500],[-300,3600],[700,3700],[1500,4100]],width:40,depth:3,boats:5,speed:10},{id:"bay-route",pts:[[-1900,-4300],[-1200,-2500],[-600,-600],[0,1200],[500,1900]],width:60,depth:4,boats:7,speed:9},{id:"north-route",pts:[[-1800,-5900],[-800,-5200],[200,-4600],[1200,-4600],[1900,-5200]],width:60,depth:4,boats:5,speed:8},{id:"ocean-route",pts:[[3800,-8e3],[3700,-5e3],[3600,-2e3],[3700,1e3],[3900,4e3],[4100,7e3]],width:300,depth:25,boats:4,speed:6}].map(c2)}function b2(){return[{id:"stadium",kind:"stadium",x:-2900,z:-2450,rot:.15,size:150},{id:"lighthouse",kind:"lighthouse",x:3250,z:5300,rot:0,size:30},{id:"terminal",kind:"terminal",x:-7800,z:-1900,rot:0,size:220},{id:"hangars",kind:"hangars",x:-7400,z:-2250,rot:0,size:120},{id:"cranes-port",kind:"cranes",x:-1150,z:-3330,rot:0,size:1600},{id:"cruise",kind:"cruise",x:-900,z:-2780,rot:0,size:300},{id:"tanks",kind:"tanks",x:-3600,z:-3100,rot:0,size:160},{id:"seaplane-base",kind:"seaplane",x:-2050,z:-4700,rot:Math.PI*.5,size:60},{id:"golf-club",kind:"clubhouse",x:1215,z:6250,rot:-.3,size:30}]}class S2{n=he;height=new Float32Array(he*he);zone=new Uint8Array(he*he);veg=new Uint8Array(he*he);coast=new Float32Array(he*he);exposure=new Uint8Array(he*he);districts=m2();roads=x2();bridges=w2();marinas=y2();runways=_2();channels=M2();pois=b2();landmasses=p2();lakes=Fd();grids=g2(this.districts);canals=v2(this.districts,this.grids);toCell(t,e){return[(t+pn)/No*he,(e+pn)/No*he]}heightAt(t,e){const[n,i]=this.toCell(t,e),o=Qt(Math.floor(n),0,he-2),r=Qt(Math.floor(i),0,he-2),a=Qt(n-o,0,1),l=Qt(i-r,0,1),h=this.height,c=h[r*he+o],d=h[r*he+o+1],u=h[(r+1)*he+o],v=h[(r+1)*he+o+1];return se(se(c,d,a),se(u,v,a),l)}zoneAt(t,e){const[n,i]=this.toCell(t,e),o=Qt(Math.round(n),0,he-1),r=Qt(Math.round(i),0,he-1);return this.zone[r*he+o]}coastAt(t,e){const[n,i]=this.toCell(t,e),o=Qt(Math.round(n),0,he-1),r=Qt(Math.round(i),0,he-1);return this.coast[r*he+o]}vegAt(t,e){const[n,i]=this.toCell(t,e),o=Qt(Math.round(n),0,he-1),r=Qt(Math.round(i),0,he-1);return this.veg[r*he+o]/255}exposureAt(t,e){const[n,i]=this.toCell(t,e),o=Qt(Math.round(n),0,he-1),r=Qt(Math.round(i),0,he-1);return this.exposure[r*he+o]/255}isLand(t,e){return this.heightAt(t,e)>.05}districtAt(t,e){for(const n of this.districts)if(_o(t,e,n.cx,n.cz,n.hw,n.hh,n.rot)<0)return n;return null}regionalDepth(t,e){let n=3+2.6*(.5+.5*Ie(t/1100,e/1100,3))+1.2*Ie(t/350+4,e/350,2);n-=2.4*St(.12,.42,Ie(t/650+9,e/650+2,3)),n+=.8*Ie(t/190+8.8,e/190-4.4,3),n-=2.3*St(.22,.58,Ie(t/330+2,e/330-7,3)+.25*Vt(t/120-5,e/120+2))*St(2.6,4.2,n),n=Math.max(n,.7);const i=3380+380*Ie(e/3e3,.5,2)+170*Ie(e/1100+3.1,2.2,3),o=t-i+420*Ie(t/1300+4.4,e/1e3-6.6,3)+130*Vt(t/330+1.1,e/330-3.3);o>0&&(n+=o*.004+2.5*St(0,1300,o)+3*St(500,2300,o)+15*St(1400,4500,o)+1.5*rr(t/600+1,e/260,3)*St(0,900,o));const r=St(-400,1400,t+300*Ie(e/1200,3.3,2))*(1-St(.4,1.4,Math.hypot((t-2600)/2600,(e-1900)/2400)));n+=4.5*r;const a=St(7200,9400,e+400*Ie(t/3e3,1.7,2));n+=18*a;const l=St(8300,9800,-e+400*Ie(t/3e3,5.1,2));n+=10*l;const h=rr(t/900+2,e/380+1,3);return n-=1.6*h*r,n}generate(t){const e=he,n=this.landmasses,i=512,o=e/i,r=Os*o,a=new Float32Array(i*i),l=new Int16Array(i*i),h=new Float32Array(i*i),c=new Float32Array(i*i),d=new Float32Array(i*i),u=new Float32Array(i*i),v=new Float32Array(i*i),p=new Float32Array(i*i);for(let U=0;U<i;U++){const P=-pn+(U+.5)*r;for(let H=0;H<i;H++){const G=-pn+(H+.5)*r;let N=1/0,Y=-1;for(let Q=0;Q<n.length;Q++){const W=n[Q];if(Math.hypot(G-W.bx,P-W.bz)-W.br>N)continue;const X=W.sd(G,P);X<N&&(N=X,Y=Q)}const V=U*i+H;if(a[V]=N,l[V]=Y,u[V]=n[Y].seabed,v[V]=n[Y].shelf,h[V]=this.regionalDepth(G,P),c[V]=Ie(G/260,P/260,3),Y===0&&N<0){const Q=-N,W=2*Ie(G/1500+2,P/1500-1,3)+.9*Ie(G/420+7,P/420+3,3),q=2.2*Math.exp(-(((Q-1500)/1e3)**2));d[V]=St(150,1100,Q)*(1.6+W+q)}else d[V]=0}t&&!(U&31)&&t(U/i*.3)}{const G=[],N=[];for(let W=0;W<8;W++){const q=W/8*Math.PI*2+.2;G.push(Math.cos(q)),N.push(Math.sin(q))}const Y=new Float32Array(8),V=(W,q)=>{const X=Math.floor((W+pn)/r),it=Math.floor((q+pn)/r);return X<0||it<0||X>=i||it>=i?X<0?-1e3:1e3:a[it*i+X]},Q=(W,q,X)=>{const it=Qt(Math.floor((W+pn)/r),0,i-1),ft=Qt(Math.floor((q+pn)/r),0,i-1)*i+it;return Math.min(h[ft],.05+Math.max(X,0)*u[ft]+(n[l[ft]].beach===0?v[ft]:0))};for(let W=0;W<i;W++){const q=-pn+(W+.5)*r;for(let X=0;X<i;X++){const it=W*i+X,at=a[it];if(at<-450){p[it]=0;continue}const ft=-pn+(X+.5)*r;for(let D=0;D<8;D++){let J=0,K=at>=0;for(let rt=1;rt<=40;rt++){const dt=ft+G[D]*rt*200,xt=q+N[D]*rt*200,pt=V(dt,xt);if(pt<0){if(!K){if(rt*200>600)break;continue}break}K=!0;const z=dt>pn||xt>pn||xt<-pn?25:Q(dt,xt,pt);J+=200*St(.5,12,z)}Y[D]=J}let Z=0,ot=0,j=0;for(let D=0;D<8;D++){const J=Y[D];J>Z?(j=ot,ot=Z,Z=J):J>ot?(j=ot,ot=J):J>j&&(j=J)}const et=(Z+ot+j)/(3*40*200);p[it]=St(.04,.8,et)}}t&&t(.35)}const g=(U,P,H,G,N)=>{const Y=N*i+G;return se(se(U[Y],U[Y+1],P),se(U[Y+i],U[Y+i+1],P),H)};let f=0,m=0,y=0,w=0;const x=(U,P)=>{const H=Qt(U/o-.5,0,i-1.001),G=Qt(P/o-.5,0,i-1.001),N=Math.floor(H),Y=Math.floor(G),V=H-N,Q=G-Y;f=V,m=Q,y=N,w=Y;const W=g(a,V,Q,N,Y),q=Y*i+N,X=q+1,it=q+i,at=it+1;let ft=l[q],Z=a[q];return a[X]<Z&&(Z=a[X],ft=l[X]),a[it]<Z&&(Z=a[it],ft=l[it]),a[at]<Z&&(Z=a[at],ft=l[at]),[W,ft]};let b=0,M=1;const A=()=>{const U=w*i+y,P=U+1,H=U+i,G=H+1,N=se(a[P]-a[U],a[G]-a[H],m),Y=se(a[H]-a[U],a[G]-a[P],f),V=Math.hypot(N,Y);V>1e-6?(b=N/V,M=Y/V):(b=0,M=1)},S=this.channels,_=this.runways,E=this.districts,T=this.lakes,F=this.canals,k=F.map(U=>({minX:Math.min(U.a[0],U.b[0])-U.width,maxX:Math.max(U.a[0],U.b[0])+U.width,z:U.a[1]})),I=this.marinas,O=this.roads.filter(U=>U.cls==="highway"||U.cls==="arterial").map(U=>{let P=1/0,H=-1/0,G=1/0,N=-1/0;for(const[V,Q]of U.pts)P=Math.min(P,V),H=Math.max(H,V),G=Math.min(G,Q),N=Math.max(N,Q);const Y=U.width*.5+20;return{pts:U.pts,hw:U.width*.5,minX:P-Y,maxX:H+Y,minZ:G-Y,maxZ:N+Y}});for(let U=0;U<e;U++){const P=-pn+(U+.5)*Os,H=f2(P);for(let G=0;G<e;G++){const N=-pn+(G+.5)*Os,Y=U*e+G;let[V,Q]=x(G+.5,U+.5);const W=n[Q],q=g(p,f,m,y,w);if(Math.abs(V)<90&&(W.beach>0||W.wet)){const ot=9*Vt(N/60+3.3,P/60-1.7)+4*Vt(N/21+8.1,P/21+2.2);V+=ot*(W.wet?1.8:1)}this.coast[Y]=V,this.exposure[Y]=Math.round(255*Qt(q,0,1));const X=g(c,f,m,y,w);let it=0;if(Q===0&&V>-160)for(const ot of T){if(Math.abs(N-ot.cx)>ot.rx*1.5+160||Math.abs(P-ot.cz)>ot.rz*1.6+160)continue;const j=hn(N,P,ot.cx,ot.cz,ot.rx,ot.rz,ot.rot,ot.seed,.22);it=Math.max(it,1-St(0,140,j))}let at,ft,Z=0;if(V<0){const ot=-V;let j=null;for(const J of E)if(_o(N,P,J.cx,J.cz,J.hw,J.hh,J.rot)<0){j=J;break}const et=j!==null&&(j.zone===7||j.zone===6||j.zone===9||j.zone===13||j.zone===14||j.zone===15||j.zone===16||j.zone===8&&q<.3);if(W.wet)at=.15+W.height*St(0,60,ot)+.15*Vt(N/30,P/30),ft=3,Z=255;else if(W.beach===0)at=W.height+.2*Vt(N/40,P/40),ft=9,Z=10;else{const J=Math.max(.25+.4*q,.45+.9*(.5+.5*Vt(N/600+5.2,P/600-1.3))+.35*Vt(N/240+1.7,P/240-4.1)+.15*Vt(N/90+6.3,P/90+2.4)),K=et?5:W.beach*(.45+1.4*q)*J*(it>0?1.6:1),rt=ot+5*Vt(N/42+7.7,P/42-3.3)*St(3,12,ot),dt=St(0,K,rt);if(at=.25+(W.height-.25)*dt+.6*X*dt+.12*Vt(N/18,P/18),at+=.18*q*St(.3,.55,dt)*(1-St(.6,.85,dt))*(.5+.5*Vt(N/60+3,P/60-5)),W.id==="barrier"||W.id==="southkey"){const xt=St(30,70,ot)*(1-St(90,160,ot))*(.4+.6*q);at+=2.2*xt*(.6+.4*rr(N/140,P/140,3))}if(ft=dt<.45?2:5,Z=dt<.45?20:150,it>0&&ft===2&&(ft=4,Z=120),ot<60&&it===0){if(W.isle&&q<.24){const xt=Vt(N/150+4.4,P/150-2.9);if(xt>.12){const pt=18+22*(.5+.5*xt);ot<pt&&(ft=3,at=Math.min(at,.3+.5*St(0,pt,ot))+.1*Vt(N/12,P/12),Z=255)}}if(ft===2){const xt=Ie(N/210+9,P/210-4,2);(W.rocky?N>2400&&rr(N/90+5,P/90+5,3)>.62:xt>.36&&q>.3)&&ot<26&&(ft=12,at=.3+1.1*St(0,22,ot)+.9*rr(N/14,P/14,2)*(1-St(20,26,ot)),Z=0)}}if(W.id==="garza"&&P<gn[0][1]+60&&Bs(N,P,gn[0][0],gn[0][1],gn[1][0],gn[1][1])<Nd+40){const xt=St(gn[0][1]+60,gn[0][1]-40,P);xt>.5&&(ft=2,Z=15);const pt=se(.3,.8+.08*Vt(N/40,P/40),St(0,16,ot));at=se(at,Math.max(at,pt),xt)}}if(Q===0){const J=g(d,f,m,y,w)*(1-it);at+=J+.25*Vt(N/95+2,P/95)*St(0,.5,J);const K=St(H+160,H-160,N);if(K>0){const rt=Vt(N/70+1,P/70+5),dt=rt<-.32?-.25:.35+.4*(.5+.5*rt)+.05*Vt(N/9,P/9);at=se(at,dt,K),K>.5&&(ft=19);let xt=1/0;for(const pt of O)N<pt.minX||N>pt.maxX||P<pt.minZ||P>pt.maxZ||(xt=Math.min(xt,eu(N,P,pt.pts)-pt.hw));xt<16&&(at=Math.max(at,se(1.4+.1*Vt(N/30,P/30),at,St(3,16,xt))),xt<6&&(Z=Math.min(Z,30)))}}let D=!1;if(at>1.4&&j!==null){const J=j;D=!0,ft=J.zone,J.zone===7?(at=Math.max(at,3.6),Z=30):J.zone===11?(at+=2.5*Ie(N/180,P/180,3)+1.5,Z=255):J.zone===4?Z=120+Math.floor(100*St(-.1,.4,X)):J.zone===10?(at=se(at,2.8+.05*Vt(N/50,P/50),St(0,-150,_o(N,P,J.cx,J.cz,J.hw,J.hh,J.rot))),Z=35):J.zone===13||J.zone===14||J.zone===9?Z=5:J.zone===8||J.zone===6?Z=60:J.track?Z=Math.floor((185+70*St(-.3,.4,X))*(1-.6*St(.22,.5,Vt(N/95+5,P/95-2)))):Z=70+Math.floor(115*St(-.25,.45,X))}for(const J of _){const K=Bs(N,P,J.a[0],J.a[1],J.b[0],J.b[1]);K<J.width*.5+60&&(at=se(at,2.9,St(J.width*.5+60,J.width*.5+10,K)))}if(ft===5&&!D){if(ft=4,Z=Math.floor(150+105*St(-.35,.3,X)),W.isle){const J=Vt(N/95+5,P/95-2);Z=Math.floor(Math.min(255,Z+45)*(1-.55*St(.22,.5,J))),J>.44&&at>1.6&&(ft=2,Z=15)}it>0&&(Z=Math.min(Z,160))}if(ft===19){const J=St(.5,.64,.5+.5*Ie(N/240+3,P/240+8,3));Z=Math.floor(40+215*J),at<0&&(Z=0)}for(let J=0;J<F.length;J++){const K=k[J];if(Math.abs(P-K.z)>F[J].width||N<K.minX||N>K.maxX)continue;const rt=F[J],dt=Bs(N,P,rt.a[0],rt.a[1],rt.b[0],rt.b[1]);if(dt>=rt.width*.5)continue;let xt=!1;for(const pt of rt.culverts)if(Math.abs(N-pt)<rt.culvertHalf){xt=!0;break}xt||(at=-(.5+(rt.depth-.5)*St(rt.width*.5,rt.width*.5-6,dt)),ft=1,Z=0)}}else{const ot=g(h,f,m,y,w),j=g(u,f,m,y,w),et=g(v,f,m,y,w);let D;if(W.wet)D=Math.min(ot,.05+V*j);else if(W.beach===0)D=Math.min(ot,et+V*j);else{const K=.45+.95*q,rt=.05+V*j*K;A();const dt=1.9+.5*Vt(N/330+2,P/330-7)+V*.0012,xt=gi(rt,dt,.7);let pt=xt;const z=St(50,160,V),R=.6*Ie(N/150+5.5,P/150+1.5,3)+.4*Vt(N/70-3.3,P/70+8.8);pt+=(.7*R+1.1*St(-.45,-.8,R)-.5*St(.45,.8,R))*z;const nt=Qt(400+130*Ie(N/520+3.7,P/520-2.1,3)+210*Ie(N/1700+1,P/1700+8,2),200,620),ht=170+110*(.5+.5*Vt(N/300-1,P/300+6)),gt=N-b*(V-nt),ut=P-M*(V-nt),Nt=.5*Vt(gt/150+2.2,ut/150-9.9)+.3*Vt(N/95-4.4,P/95+1.7)+.2*Vt(N/260+7.7,P/260-3.1),bt=St(nt-ht,nt+ht,V+200*Nt);if(pt+=1.4*St(.3,.7,-Nt)*St(nt-320,nt-60,V),q>.35&&V<300){const Dt=N-b*V,ee=P-M*V,yt=Math.max(0,Math.sin(V/38+1.6*Vt(Dt/120+4,ee/120-1))),Ot=St(-.25,.3,Vt(Dt/260+5.5,ee/260+2.5));pt-=.35*yt*yt*Ot*St(.35,.7,q)*St(20,60,V)*(1-St(160,300,V))}pt=Math.max(pt,Math.min(xt,.45)),D=se(Math.min(pt,ot),ot,bt)}if(Math.abs(N-190)<260&&Math.abs(P-2380)<220){const K=Ud(N,P);K<0&&(D=Math.max(D,.5+1.7*St(0,-45,K)))}const J=Math.max(1-Math.hypot((N+350)/520,(P-3250)/260),1-Math.hypot((N-2500)/700,(P-3300)/300),1-Math.hypot((N-1200)/600,(P-1500)/260));if(J>0){const K=St(0,.45,J)*(.6+.4*Ie(N/130+7,P/130-3,3));D=se(D,-.12+.6*(1-K),K*.94)}for(const K of S){if(Math.abs(N-K.bx)>K.br||Math.abs(P-K.bz)>K.br)continue;const rt=K.width>=200;let dt=eu(N,P,K.pts)-K.width*.5;rt&&(dt+=(80*Ie(N/380+1.5,P/380-2.5,2)+130*Vt(N/1100+3.3,P/1100-6.1))*St(-K.width*.3,0,dt));const xt=rt?220:60;if(dt<xt){let pt=St(-K.width*.1,xt,dt);rt&&(pt=1-(1-pt)*(1-pt)),D=Math.max(D,K.depth*(1-pt)+D*pt)}}for(const K of I){if(Math.abs(N-K.x)>420||Math.abs(P-K.z)>420)continue;const rt=Math.sin(K.rot),dt=-Math.cos(K.rot),xt=K.pierLen*.5+40,pt=_o(N,P,K.x+rt*xt,K.z+dt*xt,K.piers*14+40,xt+10,K.rot);pt<40&&(D=Math.max(D,2.6*(1-St(-5,40,pt))))}for(let K=0;K<F.length;K++){const rt=k[K];if(Math.abs(P-rt.z)>F[K].width||N<rt.minX||N>rt.maxX)continue;const dt=F[K],xt=Bs(N,P,dt.a[0],dt.a[1],dt.b[0],dt.b[1]);xt<dt.width*.5&&(D=Math.max(D,.5+(dt.depth-.5)*St(dt.width*.5,dt.width*.5-6,xt)))}D+=.08*Vt(N/45,P/45),at=-D,ft=at>-.35?17:D>9?0:1,at>0&&(ft=17),Z=0}this.height[Y]=at,this.zone[Y]=ft,this.veg[Y]=Qt(Z,0,255)}t&&!(U&63)&&t(.35+U/e*.65)}}}const jn=`
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
`,Wo=`
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
`,Fr=`
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
`,kr=`
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
`,xh=`
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
`;function E2(s=64){const t=s,e=new Uint8Array(t*t*t*4),n=(d,u,v,p)=>{let g=d*374761393+u*668265263+v*2147483647+p*1013904223|0;return g=Math.imul(g^g>>>13,1274126177),((g^g>>>16)>>>0)/4294967296},i=(d,u)=>(d%u+u)%u,o=(d,u,v,p,g)=>{const f=Math.floor(d),m=Math.floor(u),y=Math.floor(v),w=d-f,x=u-m,b=v-y,M=U=>U*U*U*(U*(U*6-15)+10),A=M(w),S=M(x),_=M(b),E=(U,P,H,G,N,Y)=>{const Q=n(i(U,p),i(P,p),i(H,p),g)*6.2831853,W=n(i(U,p),i(P,p),i(H,p),g+7)*3.1415926,q=Math.cos(Q)*Math.sin(W),X=Math.sin(Q)*Math.sin(W),it=Math.cos(W);return q*G+X*N+it*Y},T=(U,P,H)=>U+(P-U)*H,F=T(E(f,m,y,w,x,b),E(f+1,m,y,w-1,x,b),A),k=T(E(f,m+1,y,w,x-1,b),E(f+1,m+1,y,w-1,x-1,b),A),I=T(E(f,m,y+1,w,x,b-1),E(f+1,m,y+1,w-1,x,b-1),A),O=T(E(f,m+1,y+1,w,x-1,b-1),E(f+1,m+1,y+1,w-1,x-1,b-1),A);return T(T(F,k,S),T(I,O,S),_)},r=(d,u,v,p,g)=>{const f=Math.floor(d),m=Math.floor(u),y=Math.floor(v);let w=1e9;for(let x=-1;x<=1;x++)for(let b=-1;b<=1;b++)for(let M=-1;M<=1;M++){const A=f+M,S=m+b,_=y+x,E=A+n(i(A,p),i(S,p),i(_,p),g),T=S+n(i(A,p),i(S,p),i(_,p),g+3),F=_+n(i(A,p),i(S,p),i(_,p),g+5),k=(E-d)**2+(T-u)**2+(F-v)**2;k<w&&(w=k)}return 1-Math.min(1,Math.sqrt(w))},a=(d,u,v,p,g)=>p+(d-u)/(v-u)*(g-p),l=d=>Math.min(1,Math.max(0,d));let h=0;for(let d=0;d<t;d++)for(let u=0;u<t;u++)for(let v=0;v<t;v++){const p=v/t,g=u/t,f=d/t;let m=0,y=.5,w=0;for(let k=0;k<3;k++){const I=4<<k;m+=y*o(p*I,g*I,f*I,I,11+k),w+=y,y*=.5}m=m/w*.5+.5;const x=r(p*4,g*4,f*4,4,31),b=r(p*8,g*8,f*8,8,41),M=r(p*16,g*16,f*16,16,51),A=x*.625+b*.25+M*.125,S=a(m,0,1,A,1),_=r(p*4,g*4,f*4,4,61),E=r(p*8,g*8,f*8,8,71),T=_*.65+E*.35,F=(o(p*8,g*8,f*8,8,81)*.65+o(p*16,g*16,f*16,16,91)*.35)*.5+.5;e[h++]=Math.round(l(S)*255),e[h++]=Math.round(l(T)*255),e[h++]=Math.round(l(F)*255),e[h++]=Math.round(l(m)*255)}const c=new fd(e,t,t,t);return c.format=En,c.type=ei,c.minFilter=_e,c.magFilter=_e,c.wrapS=c.wrapT=c.wrapR=Po,c.unpackAlignment=1,c.needsUpdate=!0,c}const iu=1024,su=76e3,A2=42e3,T2=7e3,C2=`
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
`,R2=`
${Wo}
${jn}
${Fr}
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
`,P2=`
precision highp sampler3D;
${Wo}
${jn}
${Fr}
${kr}
${xh}
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
`,ou=`
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,L2=`
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = vec4(p.xy, p.w * 0.999999, p.w);
}
`,D2=`
${Wo}
${jn}
${kr}
${C2}
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
`,I2=`
out vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`,z2=`
${Wo}
${jn}
${Fr}
${kr}
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
`;class N2{constructor(t,e,n){this.atmos=t,this.noise=E2(64),this.scale=n.scale,this.covRT=new vn(iu,iu,{type:In,format:En,depthBuffer:!1,generateMipmaps:!1,minFilter:_e,magFilter:_e,wrapS:Qe,wrapT:Qe}),this.covMat=new Ge({vertexShader:ou,fragmentShader:R2,uniforms:{...t.uniforms,uCovCenter:{value:this.covCenter},uCovExtent:{value:su}},depthTest:!1,depthWrite:!1}),this.cloudMat=new Ge({vertexShader:ou,fragmentShader:P2,uniforms:{...t.uniforms,uNoise3D:{value:this.noise},uCovTex:{value:this.covRT.texture},uCovCenter:{value:this.covCenter},uCovExtent:{value:su},uCamPos:{value:new C},uInvProj:{value:new jt},uInvView:{value:new jt},uCloudSteps:{value:n.cloudSteps},uMaxDist:{value:A2}},depthTest:!1,depthWrite:!1}),this.quad=new pe(new Si(2,2),this.cloudMat),this.quad.frustumCulled=!1,this.quadScene.add(this.quad),this.cloudRT=new vn(4,4,{type:In,depthBuffer:!1,minFilter:_e,magFilter:_e}),this.domeMat=new Ge({vertexShader:L2,fragmentShader:D2,uniforms:{...t.uniforms,uCloudTex:{value:this.cloudRT.texture},uCloudTexel:{value:new Rt(.25,.25)},uResolution:{value:new Rt(1,1)},uInvProj:{value:new jt},uInvView:{value:new jt}},side:An,depthWrite:!1,depthTest:!0}),this.dome=new pe(new hi(1,24,12),this.domeMat),this.dome.frustumCulled=!1,this.dome.renderOrder=-1e3,this.dome.isSky=!0,this.envMat=new Ge({vertexShader:I2,fragmentShader:z2,uniforms:{...t.uniforms},side:An,depthWrite:!1});const i=new pe(new hi(50,32,16),this.envMat);this.envScene.add(i),this.pmrem=new qc(e),this.pmrem.compileEquirectangularShader()}dome;cloudMat;covMat;domeMat;quad;quadScene=new zo;quadCam=new Go(-1,1,1,-1,0,1);cloudRT;covRT;covBaked=!1;covCenter=new Rt;scale;envScene=new zo;envMat;pmrem=null;envRT=null;envMap=null;noise;setCloudSteps(t){this.cloudMat.uniforms.uCloudSteps.value=t}updateEnvironment(){return this.envRT&&this.envRT.dispose(),this.envRT=this.pmrem.fromScene(this.envScene,0,.1,200),this.envMap=this.envRT.texture,this.envMap}updateCoverage(t,e){const n=this.atmos.uniforms.uCloudWind.value,i=e.position.x+n.x,o=e.position.z+n.y;if(this.covBaked&&Math.hypot(i-this.covCenter.x,o-this.covCenter.y)<T2)return;this.covCenter.set(i,o),this.covBaked=!0,this.quad.material=this.covMat;const r=t.getRenderTarget();t.setRenderTarget(this.covRT),t.render(this.quadScene,this.quadCam),t.setRenderTarget(r),this.quad.material=this.cloudMat}render(t,e,n,i){const o=Math.max(2,Math.round(n*this.scale)),r=Math.max(2,Math.round(i*this.scale));(this.cloudRT.width!==o||this.cloudRT.height!==r)&&this.cloudRT.setSize(o,r),this.updateCoverage(t,e);const a=this.cloudMat.uniforms;a.uCamPos.value.copy(e.position),a.uInvProj.value.copy(e.projectionMatrixInverse),a.uInvView.value.copy(e.matrixWorld);const l=this.domeMat.uniforms;l.uResolution.value.set(n,i),l.uCloudTexel.value.set(1/o,1/r),l.uInvProj.value.copy(e.projectionMatrixInverse),l.uInvView.value.copy(e.matrixWorld);const h=t.getRenderTarget();t.setRenderTarget(this.cloudRT),t.render(this.quadScene,this.quadCam),t.setRenderTarget(h),this.dome.position.copy(e.position),this.dome.scale.setScalar(e.far*.9)}}const Uo=0,Or=1,Br=2,ti=4,ji=6,kd=7,wh=.6,U2=3,Ir=s=>1<<s,Vs=(1<<ti)-1,Ia=[],Tr={all:Vs,mid:Vs,near:Vs},Cr=[];function F2(s){s.length,Ia.length=0,Cr.length=0;let t=0,e=0,n=0;for(let i=0;i<s.length;i++){const o=s[i];Ia.push(o.texel),Cr.push({near:o.near,far:o.far}),t|=1<<i,o.texel<U2&&(e|=1<<i),o.texel<wh&&(n|=1<<i)}Tr.all=t,Tr.mid=e,Tr.near=n}function $s(s,t,e=Vs){const n=Tr[s]&e;return t&&n===Tr.all?Ir(Uo):(t?Ir(Or):0)|n<<Br}function Hr(s){return(s&Ir(Uo))!==0||s>>Br!==0}function k2(s,t,e=!0){s.layers.mask=$s(t,e)}function Od(s){s.layers.set(Uo),s.layers.enable(Or)}function O2(s){return Ir(Uo)|Ir(Br+s)}function B2(s,t){const e=s.shadowMap,n=e.render.bind(e),i=[];e.render=(o,r,a)=>{if(!e.enabled||o.length===0||!e.autoUpdate&&!e.needsUpdate)return;const l=e.needsUpdate,h=a.layers.mask,c=s.info.render;ps.calls.length=ps.triangles.length=0;for(const d of o){const u=t(d);a.layers.mask=u>=0?O2(u):h,i[0]=d,e.needsUpdate=l,Zc=u<0||(Ia[u]??0)<wh;const v=c.calls,p=c.triangles;n(i,r,a),ps.calls.push(c.calls-v),ps.triangles.push(c.triangles-p)}Zc=!1,i.length=0,e.needsUpdate=!1,a.layers.mask=h}}let Zc=!1;const ps={calls:[],triangles:[]};function Bd(s){return(Ia[s]??0)<wh}function H2(){return Zc}const lr=new Le,ru=new jt,mo=new jt,G2=new jt().makeScale(1,-1,1);class Hd{viewFrustum=new fs;mirrorFrustum=new fs;shadowFrustum=new fs;cascadeFrustums=[];cascadeCount=0;shadowDir=new C(1,0,0);spread=1;tmp=new C;update(t,e,n){mo.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this.viewFrustum.setFromProjectionMatrix(mo),this.mirrorFrustum.setFromProjectionMatrix(mo.multiply(G2)),mo.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse);const i=t.near,o=i*Math.tan(mn.DEG2RAD*.5*t.fov)/t.zoom,r=2*o,a=t.aspect*r,l=(c,d,u)=>{const v=d/i;ru.makePerspective(-a/2*v,a/2*v,o*v,(o-r)*v,d,Math.max(d+1,u),t.coordinateSystem),mo.multiplyMatrices(ru,t.matrixWorldInverse),c.setFromProjectionMatrix(mo)};l(this.shadowFrustum,i,e),this.cascadeCount=Math.min(Cr.length,ti);for(let c=0;c<this.cascadeCount;c++){const d=this.cascadeFrustums[c]??=new fs;l(d,Math.max(i,Cr[c].near),Math.min(e,Cr[c].far))}const h=Math.hypot(n.x,n.z);h>1e-5&&this.shadowDir.set(-n.x/h,0,-n.z/h),this.spread=Math.min(20,h/Math.max(n.y,.001))}boxInView(t){return this.viewFrustum.intersectsBox(t)}boxInMirror(t){return this.mirrorFrustum.intersectsBox(t)}sphereInView(t,e){return lr.set(t,e),this.viewFrustum.intersectsSphere(lr)}casterInView(t,e,n){return this.sweep(t,e,n),this.shadowFrustum.intersectsSphere(lr)}casterCascades(t,e,n){if(this.cascadeCount===0)return this.casterInView(t,e,n)?Vs:0;this.sweep(t,e,n);let i=0;for(let o=0;o<this.cascadeCount;o++)this.cascadeFrustums[o].intersectsSphere(lr)&&(i|=1<<o);return i}boxCasterCascades(t,e){const n=Math.max(0,e)*this.spread,i=this.shadowDir;if(Rs.copy(t),i.x>0?Rs.max.x+=i.x*n:Rs.min.x+=i.x*n,i.z>0?Rs.max.z+=i.z*n:Rs.min.z+=i.z*n,this.cascadeCount===0)return this.shadowFrustum.intersectsBox(Rs)?Vs:0;let o=0;for(let r=0;r<this.cascadeCount;r++)this.cascadeFrustums[r].intersectsBox(Rs)&&(o|=1<<r);return o}sweep(t,e,n){const i=Math.max(0,n)*this.spread;this.tmp.copy(t).addScaledVector(this.shadowDir,i*.5),lr.set(this.tmp,e+i*.5)}}const Rs=new Ue;class V2{height;zone;heightMin;heightMax;constructor(t,e){let n=1/0,i=-1/0;for(let a=0;a<t.height.length;a++){const l=t.height[a];l<n&&(n=l),l>i&&(i=l)}if(this.heightMin=n,this.heightMax=i,e.capabilities.isWebGL2&&e.extensions.has("OES_texture_float_linear"))this.height=new Gs(t.height,he,he,Lr,$n);else{const a=new Uint16Array(t.height.length);for(let l=0;l<a.length;l++)a[l]=Ip.toHalfFloat(t.height[l]);this.height=new Gs(a,he,he,Lr,In)}this.height.minFilter=_e,this.height.magFilter=_e,this.height.wrapS=this.height.wrapT=Qe,this.height.generateMipmaps=!1,this.height.needsUpdate=!0;const r=new Uint8Array(he*he*4);for(let a=0;a<he*he;a++){r[a*4]=t.zone[a],r[a*4+1]=t.veg[a];const l=t.coast[a];r[a*4+2]=Math.max(0,Math.min(255,Math.round(128+l*.5))),r[a*4+3]=t.exposure[a]}this.zone=new Gs(r,he,he,En,ei),this.zone.minFilter=Nn,this.zone.magFilter=Nn,this.zone.wrapS=this.zone.wrapT=Qe,this.zone.generateMipmaps=!1,this.zone.needsUpdate=!0}}const W2=96,Gd=8,Vd=7,Vl=4;function X2(s,t){const e=Gd*2**s,n=W2,i=n*e/2,o=n/4,r=3*n/4,a=[],l=[],h=new Int32Array((n+1)*(n+1)).fill(-1);let c=0;for(let f=0;f<=n;f++)for(let m=0;m<=n;m++){if(t&&m>o&&m<r&&f>o&&f<r)continue;h[f*(n+1)+m]=c++,a.push(-i+m*e,0,-i+f*e);let w=0,x=0;(m===0||m===n||f===0||f===n)&&s<Vd-1&&((m===0||m===n)&&(f&1)===1?x=e:(f===0||f===n)&&(m&1)===1&&(w=e)),l.push(w,x)}const d=new Mt(a,3),u=new Mt(l,2),v=new Le(new C(0,0,0),i*1.5+200),p=n/Vl,g=[];for(let f=0;f<Vl;f++)for(let m=0;m<Vl;m++){const y=[],w=new Ue;for(let b=f*p;b<(f+1)*p;b++)for(let M=m*p;M<(m+1)*p;M++){const A=h[b*(n+1)+M],S=h[b*(n+1)+M+1],_=h[(b+1)*(n+1)+M],E=h[(b+1)*(n+1)+M+1];if(!(A<0||S<0||_<0||E<0)){M+b&1?y.push(A,E,S,A,_,E):y.push(A,_,S,S,_,E);for(const T of[A,S,_,E])w.expandByPoint(q2.set(a[T*3],0,a[T*3+2]))}}if(!y.length)continue;const x=new oe;x.setAttribute("position",d),x.setAttribute("aEdge",u),x.setIndex(y),x.boundingSphere=v,w.min.x-=e,w.min.z-=e,w.max.x+=e,w.max.z+=e,g.push({geometry:x,box:w})}return g}const q2=new C,Ps=new Ue,Y2=`
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
`,$2=`
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
`,j2=`
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
`,Z2=`
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
`;class K2{constructor(t){this.textures=t;const e=new ce({color:16777215,roughness:.9,metalness:0}),n={uHeightTex:{value:t.height},uZoneTex:{value:t.zone},uRingOffset:this.offsetUniform,uWorldSize:{value:No},uMapN:{value:he}},i=e.onBeforeCompile;e.onBeforeCompile=(o,r)=>{i?.(o,r),Object.assign(o.uniforms,n),o.vertexShader=o.vertexShader.replace("#include <common>",`#include <common>
${Y2}`).replace("#include <beginnormal_vertex>",`${$2}
vec3 objectNormal = tnormal;
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif`).replace("#include <begin_vertex>","vec3 transformed = wp;"),o.fragmentShader=o.fragmentShader.replace("#include <common>",`#include <common>
${j2}`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
${Z2}`)},e.customProgramCacheKey=()=>"terrain-v4",this.material=e;for(let o=0;o<Vd;o++)for(const{geometry:r,box:a}of X2(o,o>0)){const l=new pe(r,e);l.frustumCulled=!1,l.receiveShadow=!0,l.castShadow=!1,l.matrixAutoUpdate=!1,l.name=`ring${o}`,a.min.y=t.heightMin-1,a.max.y=t.heightMax+1,this.sectors.push({mesh:l,box:a}),this.group.add(l)}}group=new Ye;material;sectors=[];offsetUniform={value:new C};update(t,e,n){const i=Gd*2,o=Math.round(t/i)*i,r=Math.round(e/i)*i;this.offsetUniform.value.set(o,0,r);for(const a of this.sectors){if(!n){a.mesh.visible=!0,a.mesh.layers.set(Uo);continue}Ps.copy(a.box),Ps.min.x+=o,Ps.max.x+=o,Ps.min.z+=r,Ps.max.z+=r;const l=n.boxInView(Ps),h=n.boxInMirror(Ps);a.mesh.visible=l||h,a.mesh.layers.set(l&&h?Uo:l?kd:ji)}}}function Wd(){return{uReflTex:{value:null},uReflDepth:{value:null},uReflVP:{value:new jt},uReflParams:{value:new Ne(0,1,1,0)},uReflTexel:{value:new Rt(1,1)},uReflTune:{value:new Ne(.5,.6,.12,.3)}}}const Wl=`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,J2=`
${Wo}
${jn}
${Fr}
${kr}
${xh}
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
`,Q2=`
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
`,tw=`
uniform sampler2D tColor;
uniform float uLod;
varying vec2 vUv;
void main() {
  vec4 c = textureLod(tColor, vUv, uLod);
  vec3 col = pow(max(c.rgb, 0.0), vec3(1.0 / 2.2)) + (1.0 - c.a) * vec3(0.35, 0.0, 0.35);
  gl_FragColor = vec4(col, 1.0);
}
`;function au(s,t){const e=s,n=e.boundingSphere;if(n)cr.copy(n);else{const i=e.geometry;if(!i)return 1/0;i.boundingSphere||i.computeBoundingSphere(),cr.copy(i.boundingSphere)}return cr.applyMatrix4(s.matrixWorld),Math.max(0,cr.center.distanceTo(t.position)-cr.radius)}function ew(s){const t=s.geometry;return t?(t.boundingSphere||t.computeBoundingSphere(),t.boundingSphere.radius):0}function nw(s){const t=s.geometry;if(!t)return 0;const e=t.index?t.index.count:t.attributes.position?.count??0;return Math.floor(e/3)}const cr=new Le;class iw{constructor(t,e,n,i){this.renderer=t,this.scale=n,this.range=i,Od(this.camera),this.camera.layers.enable(ji);const o=new qa(1,1,bi);this.sceneRT=new vn(1,1,{type:In,depthTexture:o,depthBuffer:!0,minFilter:_e,magFilter:_e}),this.outRT=new vn(1,1,{type:In,depthBuffer:!1,generateMipmaps:!1,minFilter:Vi,magFilter:_e}),this.uniforms.uReflTex.value=this.outRT.texture,this.uniforms.uReflDepth.value=o,this.resolveMat=new Ge({vertexShader:Wl,fragmentShader:J2,uniforms:{...e.uniforms,tColor:{value:this.sceneRT.texture},tDepth:{value:o},uInvProj:{value:this.baseProjInv},uInvView:{value:this.camera.matrixWorld},uCamPos:{value:this.camera.position},uLogDepthFC:{value:1},uCloudShadowStrength:{value:1}},depthTest:!1,depthWrite:!1}),this.downMat=new Ge({vertexShader:Wl,fragmentShader:Q2,uniforms:{tSrc:{value:this.outRT.texture},uLod:{value:0},uTexel:{value:new Rt}},depthTest:!1,depthWrite:!1}),this.quad=new pe(new Si(2,2),this.resolveMat),this.quad.frustumCulled=!1,this.quadScene.add(this.quad);const r=t.shadowMap,a=r.render;r.render=(l,h,c)=>{if(!this.inPass){a.call(r,l,h,c);return}for(let p=0;p<this.hidden.length;p++)this.hidden[p].visible=this.wasVisible[p];const d=t.info.render,u=d.calls,v=d.triangles;a.call(r,l,h,c),this.stats.shadowCalls=d.calls-u,this.stats.shadowTriangles=d.triangles-v;for(const p of this.hidden)p.visible=!1}}camera=new kn;uniforms=Wd();clipOffset=.15;enabled=!0;cloudShadowStrength=1;stats={calls:0,triangles:0,shadowCalls:0,shadowTriangles:0,width:1,height:1,hidden:0};sceneRT;outRT;levelRTs=[];levels=1;resolveMat;downMat;quad;quadScene=new zo;quadCam=new Go(-1,1,1,-1,0,1);excluded=[];filters=[];hidden=[];wasVisible=[];inPass=!1;baseProjInv=new jt;plane=new ds;clip=new Ne;q=new Ne;prevClear=new Ht;width=1;height=1;exclude(...t){for(const e of t)this.excluded.includes(e)||this.excluded.push(e)}excludeChildrenWhen(t,e){this.filters.push({root:t,skip:e})}setSize(t,e){const n=Math.max(2,Math.round(t*this.scale)),i=Math.max(2,Math.round(e*this.scale));if(n===this.width&&i===this.height)return;this.width=n,this.height=i,this.sceneRT.setSize(n,i),this.outRT.setSize(n,i);const o=Math.floor(Math.log2(Math.max(n,i)))+1;for(this.outRT.texture.mipmaps=Array.from({length:o},()=>({})),this.levels=1;this.levels<o&&Math.min(n>>this.levels,i>>this.levels)>=4;)this.levels++;for(let r=1;r<this.levels;r++)(this.levelRTs[r]??=new vn(1,1,{type:In,depthBuffer:!1,minFilter:_e,magFilter:_e})).setSize(n>>r,i>>r);this.uniforms.uReflTexel.value.set(1/n,1/i),this.stats.width=n,this.stats.height=i}setupCamera(t){const e=this.camera,n=t.matrixWorld.elements,i=n[12],o=n[13],r=n[14],a=-n[8],l=-n[9],h=-n[10];e.position.set(i,-o,r),e.up.set(n[4],-n[5],n[6]),e.lookAt(i+a,-(o+l),r+h),e.fov=t.fov,e.aspect=t.aspect,e.near=t.near,e.far=t.far,e.zoom=t.zoom,e.updateProjectionMatrix(),this.baseProjInv.copy(e.projectionMatrixInverse),e.updateMatrixWorld(!0),this.plane.set(sw,this.clipOffset),this.plane.applyMatrix4(e.matrixWorldInverse);const c=this.clip.set(this.plane.normal.x,this.plane.normal.y,this.plane.normal.z,this.plane.constant),d=e.projectionMatrix.elements,u=this.q;u.x=(Math.sign(c.x)+d[8])/d[0],u.y=(Math.sign(c.y)+d[9])/d[5],u.z=-1,u.w=(1+d[10])/d[14],c.multiplyScalar(2/c.dot(u)),d[2]=c.x,d[6]=c.y,d[10]=c.z+1,d[14]=c.w,e.projectionMatrixInverse.copy(e.projectionMatrix).invert(),this.uniforms.uReflVP.value.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse)}render(t,e){const n=this.uniforms.uReflParams.value;if(!this.enabled||this.scale<=0||e.matrixWorld.elements[13]<.3){n.x=0,this.stats.calls=this.stats.triangles=this.stats.shadowCalls=this.stats.shadowTriangles=0;return}const i=this.renderer;this.setupCamera(e);const o=this.camera,r=2/(Math.log(o.far+1)/Math.LN2);n.set(1,r,this.height*.5/Math.tan(mn.DEG2RAD*.5*o.fov),this.levels-1);const a=i.info.render,l=a.calls,h=a.triangles;this.stats.shadowCalls=this.stats.shadowTriangles=0;const c=this.hidden;c.length=0;for(const p of this.excluded)c.push(p);for(const p of this.filters)for(const g of p.root.children)g.visible&&p.skip(g,e)&&c.push(g);this.wasVisible.length=c.length;for(let p=0;p<c.length;p++)this.wasVisible[p]=c[p].visible,c[p].visible=!1;const d=i.getRenderTarget();i.getClearColor(this.prevClear);const u=i.getClearAlpha();i.setClearColor(0,0),i.setRenderTarget(this.sceneRT),this.inPass=!0,i.render(t,o),this.inPass=!1,i.setClearColor(this.prevClear,u);for(let p=0;p<c.length;p++)c[p].visible=this.wasVisible[p];this.stats.hidden=c.length;const v=this.resolveMat.uniforms;v.uLogDepthFC.value=r,v.uCloudShadowStrength.value=this.cloudShadowStrength,this.quad.material=this.resolveMat,this.outRT.viewport.set(0,0,this.width,this.height),i.setRenderTarget(this.outRT),i.render(this.quadScene,this.quadCam),this.quad.material=this.downMat;for(let p=1;p<this.levels;p++)this.downMat.uniforms.uLod.value=p-1,this.downMat.uniforms.uTexel.value.set(1/(this.width>>p-1),1/(this.height>>p-1)),i.setRenderTarget(this.levelRTs[p]),i.render(this.quadScene,this.quadCam),i.copyFramebufferToTexture(this.outRT.texture,null,p);this.quad.material=this.resolveMat,i.setRenderTarget(d),this.stats.calls=a.calls-l-this.stats.shadowCalls,this.stats.triangles=a.triangles-h-this.stats.shadowTriangles}debugLod=0;debugBlit(){this.debugMat||(this.debugMat=new Ge({vertexShader:Wl,fragmentShader:tw,uniforms:{tColor:{value:this.outRT.texture},uLod:{value:0}},depthTest:!1,depthWrite:!1})),this.debugMat.uniforms.uLod.value=this.debugLod;const t=this.quad.material;this.quad.material=this.debugMat,this.renderer.setRenderTarget(null),this.renderer.render(this.quadScene,this.quadCam),this.quad.material=t}debugMat=null}const sw=new C(0,1,0),ow=0,rw=`
uniform vec3 uWaterOffset;
varying vec3 vWorldPos;
`,aw=`
vec3 wp = position + uWaterOffset;
wp.y = 0.0;
vWorldPos = wp;
`,lw=`
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
`,cw=`
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
`,hw=`
#if defined( RE_IndirectDiffuse ) && defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
  iblIrradiance += getIBLIrradiance( geometryNormal );
#endif
`,uw=`
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
`;class dw{mesh;material;offset={value:new C};uniforms;constructor(t,e){const n=new ce({color:16777215,roughness:.3,metalness:0});this.uniforms={uHeightTex:{value:t.height},uZoneTex:{value:t.zone},uWakeTex:{value:e},uWakeRegion:{value:new Ne(0,0,3e3,0)},uWaterOffset:this.offset,uWorldSize:{value:No},uWaveTime:{value:0},uWindSpeed:{value:6},uWindDir:{value:new Rt(.94,.34)},uSunDirW:{value:new C(0,1,0)},...Wd()};const i=this.uniforms,o=n.onBeforeCompile;n.onBeforeCompile=(l,h)=>{o?.(l,h),Object.assign(l.uniforms,i),l.vertexShader=l.vertexShader.replace("#include <common>",`#include <common>
${rw}`).replace("#include <begin_vertex>",`${aw}
vec3 transformed = wp;`),l.fragmentShader=""+l.fragmentShader.replace("#include <common>",`#include <common>
${lw}`).replace("#include <normal_fragment_begin>",`#include <normal_fragment_begin>
${cw}`).replace("#include <lights_fragment_maps>",hw).replace("#include <opaque_fragment>",uw)},n.customProgramCacheKey=()=>`water-v3-${ow}`,this.material=n;const r=13e4,a=new Si(r,r,64,64);a.rotateX(-Math.PI/2),this.mesh=new pe(a,n),this.mesh.frustumCulled=!1,this.mesh.receiveShadow=!0,this.mesh.matrixAutoUpdate=!1,this.mesh.renderOrder=5}attachReflection(t){for(const e of Object.keys(t))this.uniforms[e].value=t[e].value}update(t,e,n,i,o,r,a,l){this.offset.value.set(Math.round(t/50)*50,0,Math.round(e/50)*50),this.uniforms.uWaveTime.value=n,this.uniforms.uWindSpeed.value=i,this.uniforms.uWindDir.value.copy(o),this.uniforms.uSunDirW.value.copy(r),this.uniforms.uWakeRegion.value.set(a.x,a.y,l,0)}}class fw{rt;scene=new zo;camera;center=new Rt;size;batch=new qd;constructor(t=1024,e=3200){this.size=e,this.rt=new vn(t,t,{type:ei,depthBuffer:!1,minFilter:_e,magFilter:_e}),this.rt.texture.wrapS=this.rt.texture.wrapT=Qe,this.camera=new Go(-e/2,e/2,e/2,-e/2,1,400),this.camera.up.set(0,0,-1),this.scene.add(this.batch.mesh)}get texture(){return this.rt.texture}render(t,e,n){this.batch.upload(),this.center.set(Math.round(e/8)*8,Math.round(n/8)*8),this.camera.position.set(this.center.x,200,this.center.y),this.camera.lookAt(this.center.x,0,this.center.y),this.camera.updateMatrixWorld();const i=t.getRenderTarget(),o=t.getClearColor(new Ht),r=t.getClearAlpha();t.setRenderTarget(this.rt),t.setClearColor(32896,0),t.clear(!0,!1,!1),t.render(this.scene,this.camera),t.setClearColor(o,r),t.setRenderTarget(i)}}const Xd=new Ge({vertexShader:`
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
  `,uniforms:{uStrength:{value:1}},transparent:!0,depthTest:!1,depthWrite:!1,side:nn,blending:Xi}),Kc=new Ge({vertexShader:`
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
  `,uniforms:{uStrength:{value:.7}},transparent:!0,depthWrite:!1,side:nn}),pw=new Ge({vertexShader:`
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
  `,uniforms:{uHull:{value:new Rt(.72,.28)},uStrength:{value:1}},transparent:!0,depthTest:!0,depthWrite:!1,side:nn});class zr{mesh;constructor(t,e,n=1){const i=t+2.6,o=e+2.2,r=pw.clone();r.uniforms.uHull.value=new Rt(t/i,e/o),r.uniforms.uStrength.value=n,this.mesh=new pe(new Si(i,o),r),this.mesh.frustumCulled=!1,this.mesh.visible=!1,this.mesh.renderOrder=6}static flat=new Xe().setFromAxisAngle(new C(1,0,0),-Math.PI/2);spin=new Xe;static up=new C(0,1,0);update(t,e,n,i,o,r=1){this.mesh.visible=o,o&&(this.mesh.position.set(t,.07,e),this.spin.setFromAxisAngle(zr.up,Math.atan2(-i,n)),this.mesh.quaternion.copy(this.spin).multiply(zr.flat),this.mesh.material.uniforms.uStrength.value=r)}}class qd{mesh;trails=[];geo=new oe;capacity=0;positions=new Float32Array(0);ages=new Float32Array(0);sides=new Float32Array(0);fades=new Float32Array(0);strengths=new Float32Array(0);index=new Uint32Array(0);constructor(){const t=Xd.clone();t.vertexShader=t.vertexShader.replace("attribute float aFade;","attribute float aFade; attribute float aStrength;").replace("varying float vFade;","varying float vFade; flat varying float vStrength;").replace("vFade = aFade;","vFade = aFade; vStrength = aStrength;"),t.fragmentShader=t.fragmentShader.replace("varying float vFade;","varying float vFade; flat varying float vStrength;").replace("uniform float uStrength;","").replace("* uStrength *","* vStrength *"),t.uniforms={},this.geo.setDrawRange(0,0),this.mesh=new pe(this.geo,t),this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1}add(t){this.trails.push(t),this.capacity+=t.capacity}upload(){this.positions.length!==this.capacity*6&&this.allocate();let t=0,e=0;const{positions:n,ages:i,sides:o,fades:r,strengths:a,index:l}=this;for(const d of this.trails){const u=d.count;if(u===0)continue;const v=u*2;n.set(d.positions.subarray(0,v*3),t*3),i.set(d.ages.subarray(0,v),t),o.set(d.sides.subarray(0,v),t),r.set(d.fades.subarray(0,v),t),a.fill(d.strength,t,t+v);for(let p=0;p<u-1;p++){const g=t+p*2,f=g+1,m=g+2,y=g+3;l[e++]=g,l[e++]=m,l[e++]=f,l[e++]=f,l[e++]=m,l[e++]=y}t+=v}const h=this.geo;for(const d of["position","aAge","aSide","aFade","aStrength"]){const u=h.getAttribute(d);u.clearUpdateRanges(),t>0&&u.addUpdateRange(0,t*u.itemSize),u.needsUpdate=!0}const c=h.index;c.clearUpdateRanges(),e>0&&c.addUpdateRange(0,e),c.needsUpdate=!0,h.setDrawRange(0,e)}allocate(){const t=this.capacity;this.positions=new Float32Array(t*6),this.ages=new Float32Array(t*2),this.sides=new Float32Array(t*2),this.fades=new Float32Array(t*2),this.strengths=new Float32Array(t*2),this.index=new Uint32Array(Math.max(6,t*6));const e=this.geo;e.dispose(),e.setAttribute("position",new fe(this.positions,3).setUsage(li)),e.setAttribute("aAge",new fe(this.ages,1).setUsage(li)),e.setAttribute("aSide",new fe(this.sides,1).setUsage(li)),e.setAttribute("aFade",new fe(this.fades,1).setUsage(li)),e.setAttribute("aStrength",new fe(this.strengths,1).setUsage(li)),e.setIndex(new fe(this.index,1).setUsage(li))}}class Mo{constructor(t,e,n,i=1,o=Xd){if(this.width=e,this.lifetime=n,this.capacity=t,this.strength=i,this.positions=new Float32Array(t*2*3),this.ages=new Float32Array(t*2),this.sides=new Float32Array(t*2),this.fades=new Float32Array(t*2),o instanceof qd){o.add(this);return}const r=[];for(let l=0;l<t-1;l++){const h=l*2,c=h+1,d=h+2,u=h+3;r.push(h,d,c,c,d,u)}this.geo=new oe,this.geo.setAttribute("position",new fe(this.positions,3)),this.geo.setAttribute("aAge",new fe(this.ages,1)),this.geo.setAttribute("aSide",new fe(this.sides,1)),this.geo.setAttribute("aFade",new fe(this.fades,1)),this.geo.setIndex(r),this.geo.setDrawRange(0,0);const a=o.clone();a.uniforms.uStrength.value=i,this.mesh=new pe(this.geo,a),this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1}mesh=null;capacity;strength;positions;ages;sides;fades;count=0;points=[];lastX=NaN;lastZ=NaN;ramp=0;geo=null;update(t,e,n,i,o){const a=Number.isNaN(this.lastX),l=a?0:Math.hypot(t-this.lastX,e-this.lastZ);if(i&&(a||l>Math.max(2,o*.25))){const d=a?1:t-this.lastX,u=a?0:e-this.lastZ,v=Math.hypot(d,u)||1,p=!a&&l>Math.max(12,o*1.5);if(p){const f=this.points[this.points.length-1];f&&this.points.push({...f,fade:0})}(a||p)&&(this.ramp=4);const g=this.ramp>0?1-this.ramp--/5:1;for(this.points.push({x:t,z:e,dx:d/v,dz:u/v,t:n,fade:g});this.points.length>this.capacity;)this.points.shift();this.lastX=t,this.lastZ=e}for(;this.points.length&&n-this.points[0].t>this.lifetime;)this.points.shift();const h=this.points.length;for(let d=0;d<h;d++){const u=this.points[d],v=Math.min(1,(n-u.t)/this.lifetime),p=this.width*(.6+1.8*v),g=-u.dz*p,f=u.dx*p;this.positions[d*6]=u.x-g,this.positions[d*6+1]=.05,this.positions[d*6+2]=u.z-f,this.positions[d*6+3]=u.x+g,this.positions[d*6+4]=.05,this.positions[d*6+5]=u.z+f,this.ages[d*2]=v,this.ages[d*2+1]=v,this.sides[d*2]=-1,this.sides[d*2+1]=1,this.fades[d*2]=u.fade,this.fades[d*2+1]=u.fade}this.count=h;const c=this.geo;c&&(c.attributes.position.needsUpdate=!0,c.attributes.aAge.needsUpdate=!0,c.attributes.aSide.needsUpdate=!0,c.attributes.aFade.needsUpdate=!0,c.setDrawRange(0,Math.max(0,(h-1)*6)))}reset(){this.points.length=0,this.lastX=NaN,this.lastZ=NaN,this.ramp=0,this.count=0,this.geo?.setDrawRange(0,0)}}const va=`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,mw=`
${Wo}
${jn}
${Fr}
${kr}
${xh}
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
`,gw=`
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
`,vw=`
uniform sampler2D tColor;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec3 s = texture2D(tColor, vUv).rgb * 0.227;
  s += (texture2D(tColor, vUv + uDir * 1.385).rgb + texture2D(tColor, vUv - uDir * 1.385).rgb) * 0.316;
  s += (texture2D(tColor, vUv + uDir * 3.231).rgb + texture2D(tColor, vUv - uDir * 3.231).rgb) * 0.070;
  gl_FragColor = vec4(s, 1.0);
}
`,xw=`
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
`;class ww{constructor(t,e,n){this.renderer=t,this.opts=n;const i=new qa(1,1,bi);this.sceneRT=new vn(1,1,{type:In,samples:n.samples,depthTexture:i,depthBuffer:!0,minFilter:_e,magFilter:_e}),this.fogRT=new vn(1,1,{type:In,depthBuffer:!1,minFilter:_e,magFilter:_e});for(let o=0;o<3;o++)this.bloomRTs.push(new vn(1,1,{type:In,depthBuffer:!1,minFilter:_e,magFilter:_e})),this.bloomTmp.push(new vn(1,1,{type:In,depthBuffer:!1,minFilter:_e,magFilter:_e}));this.aerialMat=new Ge({vertexShader:va,fragmentShader:mw,uniforms:{...e.uniforms,tColor:{value:null},tDepth:{value:null},uInvProj:{value:new jt},uInvView:{value:new jt},uCamPos:{value:new C},uLogDepthFC:{value:1},uCloudShadowStrength:{value:1}},depthTest:!1,depthWrite:!1}),this.brightMat=new Ge({vertexShader:va,fragmentShader:gw,uniforms:{tColor:{value:null},uThreshold:{value:1.5}},depthTest:!1,depthWrite:!1}),this.blurMat=new Ge({vertexShader:va,fragmentShader:vw,uniforms:{tColor:{value:null},uDir:{value:new Rt}},depthTest:!1,depthWrite:!1}),this.compositeMat=new Ge({vertexShader:va,fragmentShader:xw,uniforms:{tColor:{value:null},tBloom0:{value:null},tBloom1:{value:null},tBloom2:{value:null},uBloom:{value:.2},uExposure:{value:.92},uSaturation:{value:1.16},uVignette:{value:.25},uLift:{value:new C(0,.002,.004)},uGain:{value:new C(1.03,1,.97)},uResolution:{value:new Rt(1,1)},uGrain:{value:.004},uTime:{value:0}},depthTest:!1,depthWrite:!1}),this.quad=new pe(new Si(2,2),this.aerialMat),this.quad.frustumCulled=!1,this.quadScene.add(this.quad)}sceneRT;fogRT;bloomRTs=[];bloomTmp=[];quad;quadScene=new zo;quadCam=new Go(-1,1,1,-1,0,1);aerialMat;brightMat;blurMat;compositeMat;width=1;height=1;exposure=1;cloudShadowStrength=1;setSize(t,e){this.width=t,this.height=e,this.sceneRT.setSize(t,e),this.fogRT.setSize(t,e);for(let n=0;n<3;n++){const i=2**(n+1);this.bloomRTs[n].setSize(Math.max(1,Math.round(t/i)),Math.max(1,Math.round(e/i))),this.bloomTmp[n].setSize(Math.max(1,Math.round(t/i)),Math.max(1,Math.round(e/i)))}this.compositeMat.uniforms.uResolution.value.set(t,e)}get target(){return this.sceneRT}blit(t,e){this.quad.material=t,this.renderer.setRenderTarget(e),this.renderer.render(this.quadScene,this.quadCam)}finish(t,e){const n=this.renderer,i=this.aerialMat.uniforms;if(i.tColor.value=this.sceneRT.texture,i.tDepth.value=this.sceneRT.depthTexture,i.uInvProj.value.copy(t.projectionMatrixInverse),i.uInvView.value.copy(t.matrixWorld),i.uCamPos.value.copy(t.position),i.uLogDepthFC.value=2/(Math.log(t.far+1)/Math.LN2),i.uCloudShadowStrength.value=this.cloudShadowStrength,this.blit(this.aerialMat,this.fogRT),this.opts.bloom){this.brightMat.uniforms.tColor.value=this.fogRT.texture,this.blit(this.brightMat,this.bloomRTs[0]);for(let r=0;r<3;r++){const a=this.bloomRTs[r],l=this.bloomTmp[r],h=a.width,c=a.height;r>0&&(this.blurMat.uniforms.tColor.value=this.bloomRTs[r-1].texture,this.blurMat.uniforms.uDir.value.set(.5/h,.5/c),this.blit(this.blurMat,a)),this.blurMat.uniforms.tColor.value=a.texture,this.blurMat.uniforms.uDir.value.set(1/h,0),this.blit(this.blurMat,l),this.blurMat.uniforms.tColor.value=l.texture,this.blurMat.uniforms.uDir.value.set(0,1/c),this.blit(this.blurMat,a)}}const o=this.compositeMat.uniforms;o.tColor.value=this.fogRT.texture,o.tBloom0.value=this.bloomRTs[0].texture,o.tBloom1.value=this.bloomRTs[1].texture,o.tBloom2.value=this.bloomRTs[2].texture,o.uBloom.value=this.opts.bloom?.18:0,o.uExposure.value=this.exposure*(1+2.5*this.aerialMat.uniforms.uNight.value),o.uTime.value=e,this.blit(this.compositeMat,null),n.setRenderTarget(null)}}const Xl=new jt,lu=new jt,yw=new C(0,1,0),ql=new C,cu=new C,fi=new Ue,pi=new C,Yl=[0,1,2,3].map(()=>new C),ri=Array.from({length:32},()=>new C),_w=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],hr=(s,t,e)=>Math.min(e,Math.max(t,s)),$l=(s,t=1.12)=>Math.pow(t,Math.round(Math.log(s)/Math.log(t))),hu=(s,t=1.1)=>Math.pow(t,Math.ceil(Math.log(s)/Math.log(t)));function Mw(){const s=ae.lights_fragment_begin;ae.lights_fragment_begin=s.replace("vec2 cascade;","vec2 cascade; float csmDbgShadow = 1.0; float csmDbgIdx = -1.0;").replace("bool shouldFadeLastCascade",`csmDbgShadow = min(csmDbgShadow, directLight.color.g / max(prevColor.g, 1e-5)); csmDbgIdx = float(UNROLLED_LOOP_INDEX);
					bool shouldFadeLastCascade`).replace("#elif defined (USE_SHADOWMAP)",`{
      vec3 tint = csmDbgIdx < -0.5 ? vec3(0.5) : csmDbgIdx < 0.5 ? vec3(1.0, 0.25, 0.25) : csmDbgIdx < 1.5 ? vec3(0.3, 1.0, 0.3) : csmDbgIdx < 2.5 ? vec3(0.3, 0.5, 1.0) : vec3(1.0, 1.0, 0.3);
      reflectedLight.directDiffuse = tint * mix(0.12, 1.0, csmDbgShadow) * 0.8;
      reflectedLight.indirectDiffuse = vec3(0.0); reflectedLight.directSpecular = vec3(0.0); reflectedLight.indirectSpecular = vec3(0.0);
    }
    #elif defined (USE_SHADOWMAP)`)}class bw{constructor(t){this.camera=t}slabMin=-6;slabMax=380;normalBiasTexels=1;info=[];splits=[30,400,1400];csm;lastKey="";splitsCallback=(t,e,n,i)=>{for(let o=0;o<t-1;o++)i.push(hr(this.splits[o]/n,.001,.999));i.push(1)};attach(t){this.csm=t;for(let e=0;e<t.cascades;e++)this.info.push({texel:1,near:0,far:0})}updateSplits(t,e,n,i){const o=this.camera,r=this.csm.cascades,a=$l(hr(o.position.distanceTo(e)+n,8,200)),l=Math.max(1,o.position.y-i);o.getWorldDirection(cu);const c=Math.asin(hr(cu.y,-1,1))-mn.DEG2RAD*.5*o.fov/o.zoom,d=c<-.03?l/Math.sin(-c):t,u=$l(hr(2.2*d,Math.max(300,4*a),.45*t)),v=this.splits;if(v.length=r-1,r===2)v[0]=l>60?u:a;else if(r>=3){v[0]=a,v[1]=u;for(let g=2;g<r-1;g++)v[g]=$l(Math.sqrt(v[g-1]*t))}const p=`${t}|${v.join("|")}`;p!==this.lastKey&&(this.lastKey=p,this.csm.maxFar=t,this.csm.updateFrustums())}fit(t){const e=this.csm,n=this.camera,i=e.lightDirection;Xl.lookAt(pi.set(0,0,0),i,yw),lu.copy(Xl).invert();const o=Math.max(.06,-i.y),r=e.maxFar,a=n.near;for(let c=0;c<4;c++)ql.set(c===0||c===3?-1:1,c<2?1:-1,1).applyMatrix4(n.projectionMatrixInverse),Yl[c].copy(ql).multiplyScalar(-1/ql.z).transformDirection(n.matrixWorld);const l=e.shadowMapSize,h=e.breaks;for(let c=0;c<e.cascades;c++){const d=e.lights[c],u=d.shadow.camera,v=c===0?0:h[c-1],p=h[c],g=Math.max(0,v-.125*v*v),f=c===e.cascades-1?1:Math.min(1,p+.125*p*p),m=Math.max(a,g*(r-a)),y=Math.max(m+1,f*(r-a));let w=0;for(let I=0;I<4;I++)ri[I].copy(n.position).addScaledVector(Yl[I],m);for(let I=0;I<4;I++)ri[4+I].copy(n.position).addScaledVector(Yl[I],y);c===0?w=8:w=this.clipToSlab(),w===0&&(w=8);let x=1/0;for(let I=0;I<w;I++)x=Math.min(x,ri[I].y);x=Math.max(x,this.slabMin);const b=Math.max(this.slabMax,c>0?t:-1/0),M=hr((b-x)/o,60,7e3);fi.makeEmpty();for(let I=0;I<w;I++)fi.expandByPoint(ri[I].applyMatrix4(lu));const A=hu(Math.max(2,(fi.max.x-fi.min.x)*1.04)),S=hu(Math.max(2,(fi.max.y-fi.min.y)*1.04)),_=A/l,E=S/l;fi.getCenter(pi),pi.x=Math.floor(pi.x/_)*_,pi.y=Math.floor(pi.y/E)*E;const T=fi.max.z-fi.min.z;pi.z=fi.max.z+M,u.left=-A/2,u.right=A/2,u.top=S/2,u.bottom=-S/2,u.near=1,u.far=M+T+4,u.updateProjectionMatrix(),pi.applyMatrix4(Xl),d.position.copy(pi),d.target.position.copy(pi).add(i);const F=Math.max(_,E),k=this.info[c];k.texel=F,k.near=m,k.far=y,d.shadow.normalBias=F*this.normalBiasTexels,d.shadow.bias=-(.25*F)/(u.far-u.near)}F2(this.info)}clipToSlab(){const t=this.slabMin,e=this.slabMax;let n=8;const i=r=>r.y>=t&&r.y<=e;for(const[r,a]of _w){const l=ri[r],h=ri[a];for(const c of[t,e]){const d=l.y-c,u=h.y-c;d<0==u<0||n>=ri.length||ri[n++].lerpVectors(l,h,d/(d-h.y+c))}}let o=0;for(let r=0;r<n;r++)r<8&&!i(ri[r])||(o!==r&&ri[o].copy(ri[r]),o++);return o}}function uu(s,t,e){const n=Math.hypot(e[0]-t[0],e[1]-t[1]),i=Math.max(2,Math.ceil(n/10));let o=-1,r=-1;for(let h=0;h<=i;h++){const c=h/i,d=t[0]+(e[0]-t[0])*c,u=t[1]+(e[1]-t[1])*c,v=s.heightAt(d,u)>=.8;v&&o<0&&(o=h),v&&(r=h)}if(o<0||r-o<3)return null;const a=o/i,l=r/i;return[[t[0]+(e[0]-t[0])*a,t[1]+(e[1]-t[1])*a],[t[0]+(e[0]-t[0])*l,t[1]+(e[1]-t[1])*l]]}function Sw(s){const t=[],e=new Map,n=new Map;for(const r of s.roads)for(let a=0;a<r.pts.length-1;a++)t.push({a:r.pts[a],b:r.pts[a+1],width:r.width,cls:r.cls,lanes:r.lanes,traffic:r.traffic,lift:0});const i=new $e("lots"),o=(r,a,l)=>s.districtAt(a,l)===r;for(const r of s.districts){const a=Math.cos(r.rot),l=Math.sin(r.rot),h=(w,x)=>[r.cx+w*a-x*l,r.cz+w*l+x*a],c=(w,x)=>{const b=w-r.cx,M=x-r.cz;return[b*a+M*l,-b*l+M*a]};if(r.track){const w=[],x=[];let b=1,M=0;for(let A=0;A<r.track.length-1;A++){const S=r.track[A],_=r.track[A+1],E=uu(s,S,_);if(E){const P={a:E[0],b:E[1],width:7,cls:"lane",lanes:2,traffic:.6,lift:0};t.push(P),w.push(P)}const T=Math.hypot(_[0]-S[0],_[1]-S[1]),[F,k]=c(S[0],S[1]),[I,O]=c(_[0],_[1]),U=Math.abs(I-F)>=Math.abs(O-k);for(let P=M;P<T-12;P+=i.range(42,58)){const H=P/T,G=F+(I-F)*H,N=k+(O-k)*H;b=-b;const Y=6,V=46,Q=20,W=U?{x0:G-Q,x1:G+Q,z0:Math.min(N+b*Y,N+b*(Y+V)),z1:Math.max(N+b*Y,N+b*(Y+V)),streetWidth:7}:{z0:N-Q,z1:N+Q,x0:Math.min(G+b*Y,G+b*(Y+V)),x1:Math.max(G+b*Y,G+b*(Y+V)),streetWidth:7},[q,X]=h((W.x0+W.x1)/2,(W.z0+W.z1)/2);s.heightAt(q,X)<1.2||!o(r,q,X)||(x.push(W),M=0)}}e.set(r.id,w),n.set(r.id,x);continue}const d=s.grids.get(r.id);if(!d)continue;const u=[],v=r.zone===ne.DOWNTOWN?14:r.zone===ne.RES_MID||r.zone===ne.HOTEL||r.zone===ne.INDUSTRIAL?12:9,p="street",{xs:g,zs:f}=d,m=(w,x)=>{const b=uu(s,w,x);if(!b)return;const M=[(b[0][0]+b[1][0])/2,(b[0][1]+b[1][1])/2];if(!o(r,M[0],M[1]))return;const A={a:b[0],b:b[1],width:v,cls:p,lanes:2,traffic:r.zone===ne.DOWNTOWN?4:1.5,lift:0};t.push(A),u.push(A)};for(const w of g)for(let x=0;x<f.length-1;x++)m(h(w,f[x]),h(w,f[x+1]));for(const w of f)for(let x=0;x<g.length-1;x++)m(h(g[x],w),h(g[x+1],w));e.set(r.id,u);const y=[];for(let w=0;w<g.length-1;w++)for(let x=0;x<f.length-1;x++){const[b,M]=h((g[w]+g[w+1])/2,(f[x]+f[x+1])/2);o(r,b,M)&&y.push({x0:g[w],x1:g[w+1],z0:f[x],z1:f[x+1],streetWidth:v})}n.set(r.id,y)}for(const r of s.runways)t.push({a:r.a,b:r.b,width:r.width,cls:"runway",lanes:0,traffic:0,lift:0});return{segments:t,streetsByDistrict:e,blocksByDistrict:n}}const Ew=`
varying vec2 vRoadUv;   // x across (-1..1), y along (metres)
varying vec3 vRoadInfo; // lanes, width, class
varying vec3 vWorldPosR;
${jn}
`,Aw=`
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
`;function Tw(s,t,e){const n=[],i=[],o=[],r=[],a=[];let l=0;const h=w=>w==="highway"||w==="causeway"?3:w==="arterial"?2:w==="runway"?5:w==="taxiway"?6:w==="lane"?0:1,c=[];for(const w of t){if(Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1])<1)continue;const x=c[c.length-1],b=x&&x[x.length-1];b&&b.cls===w.cls&&b.width===w.width&&b.lift===w.lift&&b.b[0]===w.a[0]&&b.b[1]===w.a[1]?x.push(w):c.push([w])}for(const w of c){const x=[w[0].a,...w.map(O=>O.b)],b=x.length,M=[];for(let O=0;O<b-1;O++){const U=x[O+1][0]-x[O][0],P=x[O+1][1]-x[O][1],H=Math.hypot(U,P);M.push([U/H,P/H])}const A=[];for(let O=0;O<b;O++){const U=M[Math.max(0,O-1)],P=M[Math.min(b-2,O)];let H=-(U[1]+P[1]),G=U[0]+P[0];const N=Math.hypot(H,G)||1;H/=N,G/=N;const Y=Math.max(.5,H*-P[1]+G*P[0]);A.push([H/Y,G/Y])}const S=w[0].width,_=S*.5,E=h(w[0].cls),T=w[0].lanes,F=w[0].lift;let k=0,I=!0;for(let O=0;O<b-1;O++){const[U,P]=x[O],[H,G]=x[O+1],N=Math.hypot(H-U,G-P),Y=Math.max(1,Math.ceil(N/15)),V=A[O],Q=A[O+1];for(let W=I?0:1;W<=Y;W++){const q=W/Y,X=U+(H-U)*q,it=P+(G-P)*q,at=V[0]+(Q[0]-V[0])*q,ft=V[1]+(Q[1]-V[1])*q;for(const Z of[-1,1]){const ot=X+at*_*Z,j=it+ft*_*Z,et=s.heightAt(ot,j)+.15+F;n.push(ot,et,j),a.push(0,1,0),i.push(Z,k+q*N),o.push(T,S,E)}l+=2,(!I||W>0)&&r.push(l-4,l-3,l-2,l-2,l-3,l-1),I=!1}k+=N}}const d=new Mt(n,3),u=new Mt(a,3),v=new Mt(i,2),p=new Mt(o,3),g=new Map;for(let w=0;w<r.length;w+=3){const x=r[w],b=r[w+1],M=r[w+2],A=(n[x*3]+n[b*3]+n[M*3])/3,S=(n[x*3+2]+n[b*3+2]+n[M*3+2])/3,_=Math.floor((A+1e4)/du)*4096+Math.floor((S+1e4)/du);let E=g.get(_);E||(E=[],g.set(_,E)),E.push(x,b,M)}const f=[],m=new Ue,y=new C;for(const w of g.values()){const x=new oe;x.setAttribute("position",d),x.setAttribute("normal",u),x.setAttribute("aRoadUv",v),x.setAttribute("aRoadInfo",p),x.setIndex(w),m.makeEmpty();for(const M of w)m.expandByPoint(y.set(n[M*3],n[M*3+1],n[M*3+2]));x.boundingBox=m.clone(),x.boundingSphere=m.getBoundingSphere(new Le);const b=new pe(x,e);b.receiveShadow=!0,b.castShadow=!1,b.renderOrder=2,b.matrixAutoUpdate=!1,f.push(b)}return f}const du=3e3;function Cw(){const s=new ce({color:16777215,roughness:.8,metalness:0,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2});return s.onBeforeCompile=t=>{t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aRoadUv; attribute vec3 aRoadInfo; varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vRoadUv = aRoadUv; vRoadInfo = aRoadInfo; vWorldPosR = (modelMatrix * vec4(position, 1.0)).xyz;`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
${Ew}`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
${Aw}`)},s.customProgramCacheKey=()=>"road-v3",s}function Rw(s){let t=0;for(let e=0;e<s.length-1;e++)t+=Math.hypot(s[e+1][0]-s[e][0],s[e+1][1]-s[e][1]);return t}function Pw(s,t){let e=0;for(let n=0;n<s.length-1;n++){const i=Math.hypot(s[n+1][0]-s[n][0],s[n+1][1]-s[n][1]);if(t<=e+i||n===s.length-2){const o=Qt((t-e)/i,0,1),r=(s[n+1][0]-s[n][0])/i,a=(s[n+1][1]-s[n][1])/i;return{x:s[n][0]+r*i*o,z:s[n][1]+a*i*o,dx:r,dz:a}}e+=i}return{x:s[0][0],z:s[0][1],dx:1,dz:0}}function Lw(s,t,e,n){const i=Math.min(160,n*.25),o=t.heightAt(s.pts[0][0],s.pts[0][1]),r=t.heightAt(s.pts[s.pts.length-1][0],s.pts[s.pts.length-1][1]),a=St(0,i,e),l=St(0,i,n-e);let h=se(Math.max(o,.5)+.3,s.deck,a);if(h=Math.min(h,se(Math.max(r,.5)+.3,s.deck,l)),s.archHeight>0){const c=s.archT*n,d=Math.abs(e-c)/(s.archLength*.5);if(d<1){const u=.5+.5*Math.cos(d*Math.PI);h+=(s.archHeight-s.deck)*u}}return h}const Dw=1e3,Iw=2500,zw=5e3,Nw=6,Uw=2.4,Fw=1.05,as=.15,ur=10,kw=`
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
`;function Ow(s){const t=s,e=new ce({color:t.color.clone(),roughness:t.roughness,metalness:0,vertexColors:!0});return t.defines&&(e.defines={...t.defines}),e.onBeforeCompile=(n,i)=>{t.onBeforeCompile.call(t,n,i),n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aRoadUv; attribute vec3 aRoadInfo; varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vRoadUv = aRoadUv; vRoadInfo = aRoadInfo; vWorldPosR = (modelMatrix * vec4(position, 1.0)).xyz;`),n.fragmentShader=n.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;
${jn}`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
${kw}`)},e.customProgramCacheKey=()=>"bridge-concrete-v2",e}function Bw(s){const t=s,e=new ce({color:t.color.clone(),roughness:t.roughness,metalness:t.metalness,vertexColors:!0,emissive:new Ht(1,.8,.52),emissiveIntensity:0});return t.defines&&(e.defines={...t.defines}),e.onBeforeCompile=(n,i)=>{t.onBeforeCompile.call(t,n,i),n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
attribute float aGlow; varying float vGlow;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vGlow = aGlow;`),n.fragmentShader=n.fragmentShader.replace("#include <common>",`#include <common>
varying float vGlow;`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
totalEmissiveRadiance *= vGlow;`)},e.customProgramCacheKey=()=>"bridge-steel-v1",e}class Ls{constructor(t){this.extraSize=t}pos=[];nrm=[];col=[];extra=[];idx=[];bounds=new Ue;get vertexCount(){return this.pos.length/3}get triangleCount(){return this.idx.length/3}vertex(t,e,n,i,o,r,a,l){if(this.pos.push(t,e,n),this.nrm.push(i,o,r),this.col.push(a[0],a[1],a[2]),this.extraSize)if(l)for(let c=0;c<this.extraSize;c++)this.extra.push(l[c]);else for(let c=0;c<this.extraSize;c++)this.extra.push(0);const h=this.bounds;return t<h.min.x&&(h.min.x=t),t>h.max.x&&(h.max.x=t),e<h.min.y&&(h.min.y=e),e>h.max.y&&(h.max.y=e),n<h.min.z&&(h.min.z=n),n>h.max.z&&(h.max.z=n),this.vertexCount-1}append(t){const e=this.vertexCount;for(const n of t.pos)this.pos.push(n);for(const n of t.nrm)this.nrm.push(n);for(const n of t.col)this.col.push(n);for(const n of t.extra)this.extra.push(n);for(const n of t.idx)this.idx.push(n+e);this.bounds.union(t.bounds)}addGeometry(t,e,n){const i=t.getAttribute("position"),o=t.getAttribute("normal"),r=this.vertexCount;for(let l=0;l<i.count;l++)this.vertex(i.getX(l),i.getY(l),i.getZ(l),o.getX(l),o.getY(l),o.getZ(l),e,n);const a=t.getIndex();if(a)for(let l=0;l<a.count;l++)this.idx.push(r+a.getX(l));else for(let l=0;l<i.count;l++)this.idx.push(r+l)}box(t,e,n,i,o,r,a,l,h,c=!1,d){if(!(o<=.005)){dr.setFromEuler(Gw.set(l,a,0,"YXZ")),fu.compose(Ds.set(t,e+o/2,n),dr,Vw.set(i,o,r));for(const u of Hw){if(c&&u.n[1]!==0)continue;tn.set(u.n[0],u.n[1],u.n[2]).applyQuaternion(dr);const v=this.vertexCount;for(const p of u.v)Ds.set(p[0],p[1],p[2]).applyMatrix4(fu),this.vertex(Ds.x,Ds.y,Ds.z,tn.x,tn.y,tn.z,h,d);this.idx.push(v,v+1,v+2,v,v+2,v+3)}}}cylinder(t,e,n,i,o,r,a,l=!0,h){if(o<=.005)return;const c=i/2,d=this.vertexCount;for(let u=0;u<=r;u++){const v=u/r*Math.PI*2,p=Math.cos(v),g=Math.sin(v);this.vertex(t+p*c,e,n+g*c,p,0,g,a,h),this.vertex(t+p*c,e+o,n+g*c,p,0,g,a,h)}for(let u=0;u<r;u++){const v=d+u*2,p=v+1,g=v+2,f=v+3;this.idx.push(v,p,g,p,f,g)}if(l){const u=this.vertex(t,e+o,n,0,1,0,a,h),v=this.vertexCount;for(let p=0;p<=r;p++){const g=p/r*Math.PI*2;this.vertex(t+Math.cos(g)*c,e+o,n+Math.sin(g)*c,0,1,0,a,h)}for(let p=0;p<r;p++)this.idx.push(u,v+p+1,v+p)}}disc(t,e,n,i,o,r,a,l){const h=this.vertex(t,e,n,0,1,0,a,l),c=this.vertexCount;for(let d=0;d<=r;d++){const u=d/r*Math.PI*2;this.vertex(t+Math.cos(u)*i,e,n+Math.sin(u)*o,0,1,0,a,l)}for(let d=0;d<r;d++)this.idx.push(h,c+d+1,c+d)}loft(t,e,n,i){for(let o=0;o<e.length-1;o++){const[r,a]=e[o],[l,h]=e[o+1],c=l-r,d=h-a,u=Math.hypot(c,d)||1,v=d/u,p=-c/u,g=Array.isArray(n[0])?n[Math.min(o,n.length-1)]:n,f=this.vertexCount;for(const y of t){const w=y.rx*v,x=p,b=y.rz*v;this.vertex(y.x+y.rx*r,y.y+a,y.z+y.rz*r,w,x,b,g,i),this.vertex(y.x+y.rx*l,y.y+h,y.z+y.rz*l,w,x,b,g,i)}let m=!1;t.length>1&&(jl.fromArray(this.pos,f*3),pu.fromArray(this.pos,(f+1)*3),mu.fromArray(this.pos,(f+3)*3),tn.subVectors(pu,jl).cross(mu.sub(jl)),Ds.fromArray(this.nrm,f*3),m=tn.dot(Ds)<0);for(let y=1;y<t.length;y++){const w=f+(y-1)*2,x=w+1,b=f+y*2,M=b+1;m?this.idx.push(w,M,x,w,b,M):this.idx.push(w,x,M,w,M,b)}}}strut(t,e,n,i,o){xa.subVectors(e,t);const r=xa.length();if(r<.1)return;xa.divideScalar(r),dr.setFromUnitVectors(Ww,xa);const a=this.vertexCount;for(let l=0;l<=6;l++){const h=l/6*Math.PI*2;tn.set(Math.cos(h),0,Math.sin(h)).applyQuaternion(dr),this.vertex(t.x+tn.x*n,t.y+tn.y*n,t.z+tn.z*n,tn.x,tn.y,tn.z,i,o),this.vertex(e.x+tn.x*n,e.y+tn.y*n,e.z+tn.z*n,tn.x,tn.y,tn.z,i,o)}for(let l=0;l<6;l++){const h=a+l*2,c=h+1,d=h+2,u=h+3;this.idx.push(h,c,d,c,u,d)}}build(t){const e=new oe;e.setAttribute("position",new Mt(this.pos,3)),e.setAttribute("normal",new Mt(this.nrm,3)),e.setAttribute("color",new Mt(this.col,3)),e.setAttribute("uv",new fe(new Float32Array(this.vertexCount*2),2));let n=0;for(const[i,o]of t){const r=new Float32Array(this.vertexCount*o);for(let a=0;a<this.vertexCount;a++)for(let l=0;l<o;l++)r[a*o+l]=this.extra[a*this.extraSize+n+l];e.setAttribute(i,new fe(r,o)),n+=o}return e.setIndex(this.vertexCount>65535?new fe(new Uint32Array(this.idx),1):new fe(new Uint16Array(this.idx),1)),e.boundingBox=this.bounds.clone(),e.boundingSphere=this.bounds.getBoundingSphere(new Le),e}}const Hw=[{n:[1,0,0],v:[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]]},{n:[-1,0,0],v:[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]]},{n:[0,1,0],v:[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]]},{n:[0,-1,0],v:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]},{n:[0,0,1],v:[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]},{n:[0,0,-1],v:[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]}],fu=new jt,dr=new Xe,Gw=new Be,Ds=new C,Vw=new C,tn=new C,xa=new C,jl=new C,pu=new C,mu=new C,Ww=new C(0,1,0);class Xw{constructor(t){this.steel=t}chunks=[];sun=null;cull=new Hd;sunDir=new C(0,1,0);seen=new Set;cameras=[];observe(t){t.isPerspectiveCamera&&this.seen.add(t)}update(t){!this.sun&&t&&(this.sun=t.children.find(o=>o.isDirectionalLight&&o.castShadow)??null);let e=10;this.sun&&(this.sunDir.subVectors(this.sun.position,this.sun.target.position),this.sunDir.lengthSq()>1e-6?this.sunDir.normalize():this.sunDir.set(0,1,0),e=this.sun.intensity);const n=Math.asin(Qt(this.sunDir.y,-1,1))*180/Math.PI,i=Math.max(1-St(2,10,n),1-St(.15,.6,e));if(this.steel.emissiveIntensity=Nw*i,this.seen.size&&(this.cameras=[...this.seen],this.seen.clear()),!!this.cameras.length){for(const o of this.chunks){o.dist=1/0;for(const r of o.meshes)r.inView=!1,r.cast=0}for(const o of this.cameras){const r=o.position.x,a=o.position.z,l=Qt(o.position.y*9,5e3,12e3);this.cull.update(o,l,this.sunDir);for(const h of this.chunks){const c=Math.max(0,Math.hypot(h.center.x-r,h.center.z-a)-h.r);h.dist=Math.min(h.dist,c);for(const d of h.meshes)!d.inView&&this.cull.boxInView(d.box)&&(d.inView=!0),c<l&&(d.cast|=this.cull.boxCasterCascades(d.box,d.height))}}for(const o of this.chunks){for(const r of o.meshes){const a=$s(r.cls,r.inView,r.cast),l=Hr(a);r.mesh.castShadow=l,r.mesh.visible=r.inView||l,r.mesh.layers.mask=a}o.steel&&(o.steel.geometry.setDrawRange(0,o.dist>Iw?o.headIndices:1/0),o.dist>zw&&(o.steel.visible=!1))}}}}class qw extends Ye{constructor(t){super(),this.culler=t}updateMatrixWorld(t){this.culler.update(this.parent),super.updateMatrixWorld(t)}}const ln=[1,1,1],Is=[1.08,1.08,1.07],gu=[.86,.86,.86],Zl=[.78,.78,.79],vu=[.5,.5,.52],xu=[.74,.75,.76],wu=[1.85,1.9,1.92],yu=[1,1,1],Fi=[1,1,1],Yw=[.3,.3,.32],$w=[.92,.9,.84];function jw(s,t,e,n){const i=Ow(e),o=Bw(n),r=new Xw(o),a=new qw(r),l=[],h=new Ls(5),c=[0,0,0,0,0],d=Uw,u=Fw;for(const p of s.bridges){const g=Rw(p.pts),f=p.width,m=f*.5,y=Qt(p.lanes*3.3,8,f-4),w=y*.5,x=V=>{const Q=Pw(p.pts,V);return{x:Q.x,y:Lw(p,s,V,g),z:Q.z,rx:-Q.dz,rz:Q.dx,dx:Q.dx,dz:Q.dz,s:V}},b=V=>Math.atan2(V.dx,V.dz),M=p.archHeight>=20&&p.archLength>=350,A=!M&&p.archHeight>0&&p.archLength>=300,S=p.archT*g,_=M?Math.min(p.archLength*.5,300):A?p.archLength*.8:0,E=S-_/2,T=S+_/2,F=Math.max(1,Math.round(g/Dw)),k=g/F,I=V=>Math.min(F-1,Math.max(0,Math.floor(V/k))),O=Array.from({length:F},()=>({struct:new Ls(5),deck:new Ls(5),steel:new Ls(1),heads:new Ls(1),tall:new Ls(5),arch:new Ls(1)})),U=Math.ceil(g/ur),P=[];for(let V=0;V<=U;V+=2){const Q=x(Math.min(g,V*ur));P.push(new C(Q.x,Q.y,Q.z))}if((U&1)===1){const V=x(g);P.push(new C(V.x,V.y,V.z))}l.push({id:p.id,pts:P,width:p.width,lanes:p.lanes,traffic:p.traffic});const H=p.lanes>=6?.3:0,G=[0,0,p.lanes,y,H];for(let V=0;V<F;V++){const Q=V*k,W=Math.min(g,(V+1)*k),q=[x(Q)];for(let j=(Math.floor(Q/ur)+1)*ur;j<W-.01;j+=ur)q.push(x(j));q.push(x(W));const X=O[V],it=[[-m,as,0],[-w,as,0],[-w,as,1],[-w,.02,1],[-w,.02,0],[w,.02,0],[w,.02,-1],[w,as,-1],[w,as,0],[m,as,0]],at=it.length,ft=X.deck.vertexCount;q.forEach((j,et)=>{for(const[D,J,K]of it)G[0]=D/w,G[1]=j.s,K===0?X.deck.vertex(j.x+j.rx*D,j.y+J,j.z+j.rz*D,0,1,0,yu,G):X.deck.vertex(j.x+j.rx*D,j.y+J,j.z+j.rz*D,j.rx*K,0,j.rz*K,yu,G);if(et>0){const D=ft+(et-1)*at,J=ft+et*at;for(let K=0;K<at;K+=2)X.deck.idx.push(D+K,D+K+1,J+K,J+K,D+K+1,J+K+1)}});const Z=[[-m,as],[-m-.1,u-.24],[-m-.24,u],[-m-.42,u],[-m-.56,u-.24],[-m-.56,-.4],[-m-.24,-1.05],[-f*.31,-d],[f*.31,-d],[m+.24,-1.05],[m+.56,-.4],[m+.56,u-.24],[m+.42,u],[m+.24,u],[m+.1,u-.24],[m,as]],ot=[ln,Is,Is,Is,ln,gu,Zl,Zl,Zl,gu,ln,Is,Is,Is,ln];if(X.struct.loft(q,Z,ot,c),H>0){const j=H;X.struct.loft(q,[[j,.02],[j,.3],[j*.4,.9],[-j*.4,.9],[-j,.3],[-j,.02]],[ln,ln,Is,ln,ln],c)}for(let j=0;j<q.length-1;j++){const et=q[j],D=s.heightAt(et.x,et.z);if(D<.3)continue;const J=D-.8,K=et.y-d+.15;K-J<.3||et.y-D>16||X.struct.box(et.x,J,et.z,f+.8,K-J,q[j+1].s-et.s+.4,b(et),0,ln,!1,c)}for(let j=1;j<q.length;j++){const et=q[j-1],D=q[j],J=Math.hypot(D.x-et.x,D.y-et.y,D.z-et.z),K=Math.atan2(D.x-et.x,D.z-et.z),rt=-Math.asin(Qt((D.y-et.y)/J,-1,1));for(const dt of[-1,1]){const xt=(et.x+D.x)/2+(et.rx+D.rx)/2*(m+.33)*dt,pt=(et.z+D.z)/2+(et.rz+D.rz)/2*(m+.33)*dt;X.steel.box(xt,(et.y+D.y)/2+u+.86,pt,.08,.08,J+.1,K,rt,Fi,!0),X.steel.box(xt,(et.y+D.y)/2+u+.44,pt,.06,.06,J+.1,K,rt,Fi,!0)}}for(let j=Math.ceil(Q/4)*4;j<W;j+=4){const et=x(j),D=b(et);for(const J of[-1,1])X.steel.box(et.x+et.rx*(m+.33)*J,et.y+u,et.z+et.rz*(m+.33)*J,.12,.9,.12,D,0,Fi,!0)}for(let j=22,et=0;j<g-20;j+=45,et++){if(I(j)!==V)continue;const D=x(j),J=et%2===0?-1:1,K=b(D),rt=D.x+D.rx*(m+.33)*J,dt=D.z+D.rz*(m+.33)*J;X.steel.cylinder(rt,D.y+u,dt,.2,9,6,Fi,!1);const xt=D.x+D.rx*(m+.33-1.25)*J,pt=D.z+D.rz*(m+.33-1.25)*J;X.steel.box(xt,D.y+u+8.85,pt,2.5,.16,.16,K,0,Fi,!0);const z=D.x+D.rx*(m+.33-2.35)*J,R=D.z+D.rz*(m+.33-2.35)*J;X.heads.box(z,D.y+u+8.62,R,.8,.26,.5,K,0,$w,!1,[1])}}const N=f>=20?50:42,Y=[];for(let V=N*.5;V<g-N*.3;V+=N)_>0&&V>E-12&&V<T+12||Y.push(V);A&&Y.push(E,T);for(const V of Y){const Q=x(V),W=s.heightAt(Q.x,Q.z);if(Q.y-W<2.8)continue;const q=O[I(V)],X=b(Q),it=Q.y-d,at=A&&(V===E||V===T),ft=at?2.4:2,Z=it-ft,ot=Math.min(W,-.5)-2.5,j=W<.2,et=f+6.4,D=(J,K,rt,dt,xt,pt)=>{if(j){q.struct.box(J,-1,K,rt+2.4,1.6,dt+2.4,X,0,xu,!1,c),q.struct.disc(J,.05,K,(rt+2.4)*.5+.9,(dt+2.4)*.5+.9,12,wu,c);const z=Math.min(xt,1.7);pt?q.struct.cylinder(J,.55,K,rt,z-.55,12,vu,!1,c):q.struct.box(J,.55,K,rt,z-.55,dt,X,0,vu,!0,c),pt?q.struct.cylinder(J,z,K,rt,xt-z,12,ln,!1,c):q.struct.box(J,z,K,rt,xt-z,dt,X,0,ln,!0,c)}else pt?q.struct.cylinder(J,ot,K,rt,xt-ot,12,ln,!1,c):q.struct.box(J,ot,K,rt,xt-ot,dt,X,0,ln,!0,c)};if(f>=20||at){const J=at?f*.7:f*.5,K=at?3.2:2.2;D(Q.x,Q.z,J,K,Z,!1),q.struct.box(Q.x,Z,Q.z,et,ft,K+1,X,0,ln,!1,c)}else{for(const J of[-f*.3,f*.3])D(Q.x+Q.rx*J,Q.z+Q.rz*J,2.4,2.4,Z,!0);q.struct.box(Q.x,Z,Q.z,f+5.6,ft,2.6,X,0,ln,!1,c)}q.steel.box(Q.x,Q.y+.03,Q.z,y,.04,.3,X,0,Yw,!1)}if(M){const V=.24*_+10,Q=3.2,W=4.8,q=m+1.9,X=_>=240?9:7,it=(_/2-16)/X;for(const at of[E,T]){const ft=O[I(at)],Z=x(at),ot=s.heightAt(Z.x,Z.z),j=b(Z),et=Math.min(ot,-.5)-3;for(const D of[-1,1]){const J=Z.x+Z.rx*q*D,K=Z.z+Z.rz*q*D;ft.tall.box(J,et,K,Q,Z.y+V-et,W,j,0,ln,!1,c),ot<.2&&(ft.struct.box(J,-1.2,K,Q+3,1.9,W+3,j,0,xu,!1,c),ft.struct.disc(J,.05,K,(Q+3)*.5+1,(W+3)*.5+1,12,wu,c))}ft.struct.box(Z.x,Z.y-d-2.2,Z.z,2*q+Q,2.2,W,j,0,ln,!1,c),ft.tall.box(Z.x,Z.y+V-5,Z.z,2*q+Q,3.6,W*.7,j,0,ln,!1,c);for(let D=1;D<=X;D++)for(const J of[-1,1]){const K=at+J*(D*it+10);if(K<4||K>g-4)continue;const rt=x(K),dt=Z.y+V-3-(X-D)*(.45*V/X);for(const xt of[-1,1]){const pt=new C(rt.x+rt.rx*(m+.36)*xt,rt.y+1.1,rt.z+rt.rz*(m+.36)*xt),z=new C(Z.x+Z.rx*(q-Q*.5+.1)*xt,dt,Z.z+Z.rz*(q-Q*.5+.1)*xt);ft.arch.strut(pt,z,.11,Fi)}}}}else if(A){const V=O[I(S)],Q=p.archHeight*.95+4,W=m+1,q=[[],[]],X=28;for(let it=0;it<=X;it++){const at=it/X,ft=x(E+_*at),Z=ft.y+Q*Math.sin(at*Math.PI)+.8;for(const ot of[-1,1]){const j=new C(ft.x+ft.rx*W*ot,Z,ft.z+ft.rz*W*ot);q[ot<0?0:1].push(j),it%2===1&&it>1&&it<X-1&&V.arch.strut(new C(j.x,ft.y+u+.2,j.z),j,.11,Fi)}(it===8||it===14||it===20)&&V.arch.box(ft.x,Z-.7,ft.z,2*W,1.2,1.2,b(ft),0,Fi,!1)}for(const it of q){const at=new vh(new Cd(it),56,1.15,8,!1);V.arch.addGeometry(at,Fi),at.dispose()}}for(let V=0;V<F;V++){const Q=O[V];h.append(Q.deck);const W={meshes:[],steel:null,headIndices:0,center:new C,r:0,dist:1/0},q=new Ue,X=(Z,ot)=>{Z.name=`${p.id}#${V}`,Z.castShadow=!0,Z.receiveShadow=!0,Z.onBeforeRender=(et,D,J)=>{r.observe(J)};const j=Z.geometry.boundingBox;W.meshes.push({mesh:Z,cls:ot,box:j,height:j.max.y-j.min.y,inView:!0,cast:Vs}),q.union(j),a.add(Z)},it=Q.struct.idx.length;Q.struct.append(Q.deck);const at=new pe(Q.struct.build([["aRoadUv",2],["aRoadInfo",3]]),i);if(at.onBeforeShadow=(Z,ot,j)=>{r.observe(j),at.geometry.setDrawRange(0,it)},at.onAfterShadow=()=>{at.geometry.setDrawRange(0,1/0)},X(at,"all"),Q.heads.idx.length||Q.steel.idx.length){const Z=Q.heads.idx.length;Q.heads.append(Q.steel);const ot=new pe(Q.heads.build([["aGlow",1]]),o);X(ot,"near"),W.steel=ot,W.headIndices=Z}Q.tall.idx.length&&X(new pe(Q.tall.build([["aRoadUv",2],["aRoadInfo",3]]),i),"all"),Q.arch.idx.length&&X(new pe(Q.arch.build([["aGlow",1]]),o),M?"near":"all");const ft=q.getBoundingSphere(new Le);W.center.copy(ft.center),W.r=ft.radius,r.chunks.push(W)}}const v=h.build([["aRoadUv",2],["aRoadInfo",3]]);return{group:a,routes:l,deckGeometry:v,lampPositions:[]}}function Zw(s){const t=new ce({color:16777215,roughness:.7,metalness:0});return t.onBeforeCompile=e=>{e.uniforms.uNight=s,e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
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
}`)},t.customProgramCacheKey=()=>"facade-v3",t}function Yd(s,t,e){const n=new ce({color:16777215,roughness:1,metalness:1,vertexColors:t,emissive:e??0}),i=e!==void 0;return n.onBeforeCompile=o=>{o.vertexShader=o.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aMatParams;
varying vec2 vMatParams;${i?`
attribute float aEmissive;
varying float vEmissive;`:""}`).replace("#include <begin_vertex>",`#include <begin_vertex>
vMatParams = aMatParams;${i?`
vEmissive = aEmissive;`:""}`),o.fragmentShader=o.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vMatParams;${i?`
varying float vEmissive;`:""}`).replace("#include <roughnessmap_fragment>","float roughnessFactor = vMatParams.x;").replace("#include <metalnessmap_fragment>","float metalnessFactor = vMatParams.y;"),i&&(o.fragmentShader=o.fragmentShader.replace("#include <emissivemap_fragment>","totalEmissiveRadiance *= vEmissive;"))},n.customProgramCacheKey=()=>s,n}function Kw(s){const t=[],e=[],n=[],i=[],o=[];for(const a of s){const l=a.geometry.index?a.geometry.toNonIndexed():a.geometry,h=l.getAttribute("position"),c=l.getAttribute("normal"),{color:d,roughness:u,metalness:v}=a.material;for(let p=0;p<h.count;p++)t.push(h.getX(p),h.getY(p),h.getZ(p)),e.push(c.getX(p),c.getY(p),c.getZ(p)),n.push(d.r,d.g,d.b),i.push(u,v),o.push(a.emissive?1:0);l!==a.geometry&&l.dispose()}const r=new oe;return r.setAttribute("position",new Mt(t,3)),r.setAttribute("normal",new Mt(e,3)),r.setAttribute("color",new Mt(n,3)),r.setAttribute("aMatParams",new Mt(i,2)),r.setAttribute("aEmissive",new Mt(o,1)),r.computeBoundingSphere(),r}function Kl(s){const t=s.getAttribute("position").count;return s.setAttribute("color",new Mt(new Float32Array(t*3).fill(1),3)),s.setAttribute("aEmissive",new Mt(new Float32Array(t),1)),s}class Jw{pos=[];nrm=[];col=[];par=[];box=new Ue;v=new C;get vertexCount(){return this.pos.length/3}add(t,e,n,i){const o=(t.index?t.toNonIndexed():t.clone()).applyMatrix4(e),r=o.getAttribute("position"),a=o.getAttribute("normal"),l=i??n.color,h=n.roughness,c=n.metalness,d=(u,v)=>{this.v.set(r.getX(u),r.getY(u),r.getZ(u)),this.pos.push(this.v.x,this.v.y,this.v.z),this.box.expandByPoint(this.v);const p=v?-1:1;this.nrm.push(p*a.getX(u),p*a.getY(u),p*a.getZ(u)),this.col.push(l.r,l.g,l.b),this.par.push(h,c)};for(let u=0;u<r.count;u++)d(u,!1);if(n.side===nn)for(let u=0;u<r.count;u+=3)d(u,!0),d(u+2,!0),d(u+1,!0);o.dispose()}build(){const t=new oe;return t.setAttribute("position",new Mt(this.pos,3)),t.setAttribute("normal",new Mt(this.nrm,3)),t.setAttribute("color",new Mt(this.col,3)),t.setAttribute("aMatParams",new Mt(this.par,2)),t.boundingBox=this.box.clone(),t.boundingSphere=this.box.getBoundingSphere(new Le),t}}function yh(s,t,e,n){const i=new Map;for(let l=0;l<t;l++){const h=za(s.matrices[l*16+12],s.matrices[l*16+14],e);let c=i.get(h);c||(c=[],i.set(h,c)),c.push(l)}const o=new Uint32Array(t),r=[];let a=0;for(const l of i.values()){const h=a,c=new Ue;for(const d of l)o[a++]=d,n(d,c);r.push({matrices:s.matrices,colors:s.colors,extras:s.extras,indices:o.subarray(h,a),box:c,count:l.length})}return r}const Qw=.3,ty=new Float32Array([0,0,0,0,0,0,0,0,0,0,0,0,0,-5e3,0,1]);class yi{constructor(t,e,n,i,o,r=null){this.capacity=t;const a=new oe;for(const[h,c]of Object.entries(e.attributes))c.isInstancedBufferAttribute||a.setAttribute(h,c);e.index&&a.setIndex(e.index),a.boundingSphere=e.boundingSphere,a.boundingBox=e.boundingBox;for(const h of i){const c=new Float32Array(t*h.itemSize),d=new _i(c,h.itemSize);d.setUsage(li),a.setAttribute(h.name,d),this.extras.push({attr:d,array:c,size:h.itemSize})}const l=new $i(a,n,t);this.matrices=l.instanceMatrix.array,l.instanceMatrix.setUsage(li),o?(this.colors=new Float32Array(t*3),l.instanceColor=new _i(this.colors,3),l.instanceColor.setUsage(li)):this.colors=null,r&&(l.customDepthMaterial=r),l.receiveShadow=!0,l.castShadow=!1,l.frustumCulled=!1,l.matrixAutoUpdate=!1,l.count=0,l.visible=!1,this.mesh=l}mesh;matrices;colors;extras=[];used=0;holes=0;free=[];ranges=new Map;dirtyMin=1/0;dirtyMax=0;set(t,e){const n=this.ranges.get(t);if(n){if(n.count===e)return!0;this.release(t,n)}if(e===0)return!0;const i=this.alloc(e);if(i<0)return!1;const o=t.indices;if(o){const r=this.colors!==null&&t.colors!==null;for(let a=0;a<e;a++){const l=o[a],h=i+a;this.matrices.set(t.matrices.subarray(l*16,l*16+16),h*16),r&&this.colors.set(t.colors.subarray(l*3,l*3+3),h*3);for(let c=0;c<this.extras.length;c++){const d=this.extras[c];d.array.set(t.extras[c].subarray(l*d.size,(l+1)*d.size),h*d.size)}}}else{this.matrices.set(t.matrices.subarray(0,e*16),i*16),this.colors&&t.colors&&this.colors.set(t.colors.subarray(0,e*3),i*3);for(let r=0;r<this.extras.length;r++){const a=this.extras[r];a.array.set(t.extras[r].subarray(0,e*a.size),i*a.size)}}return this.ranges.set(t,{start:i,count:e}),this.touch(i,e),!0}commit(){if(this.holes>Qw*this.used&&this.used>4096&&this.compact(),this.dirtyMin<this.dirtyMax){const t=this.dirtyMin,e=Math.min(this.dirtyMax,this.used)-t;if(e>0){const n=this.mesh.instanceMatrix;n.clearUpdateRanges(),n.addUpdateRange(t*16,e*16),n.needsUpdate=!0;const i=this.mesh.instanceColor;i&&(i.clearUpdateRanges(),i.addUpdateRange(t*3,e*3),i.needsUpdate=!0);for(const o of this.extras)o.attr.clearUpdateRanges(),o.attr.addUpdateRange(t*o.size,e*o.size),o.attr.needsUpdate=!0}this.dirtyMin=1/0,this.dirtyMax=0}this.mesh.count=this.used,this.mesh.visible=this.used>0}touch(t,e){t<this.dirtyMin&&(this.dirtyMin=t),t+e>this.dirtyMax&&(this.dirtyMax=t+e)}release(t,e){this.ranges.delete(t);for(let l=0;l<e.count;l++)this.matrices.set(ty,(e.start+l)*16);this.touch(e.start,e.count);const n=this.free;let i=0;for(;i<n.length&&n[i].start<e.start;)i++;const o=i>0?n[i-1]:null,r=i<n.length?n[i]:null;o&&o.start+o.count===e.start?(o.count+=e.count,r&&o.start+o.count===r.start&&(o.count+=r.count,n.splice(i,1))):r&&e.start+e.count===r.start?(r.start=e.start,r.count+=e.count):n.splice(i,0,{start:e.start,count:e.count}),this.holes+=e.count;const a=n[n.length-1];a&&a.start+a.count===this.used&&(this.used=a.start,this.holes-=a.count,n.pop())}alloc(t){const e=this.free;for(let i=0;i<e.length;i++){const o=e[i];if(o.count<t)continue;const r=o.start;return o.start+=t,o.count-=t,o.count===0&&e.splice(i,1),this.holes-=t,r}if(this.used+t>this.capacity)return-1;const n=this.used;return this.used+=t,n}compact(){const t=[...this.ranges.values()].sort((n,i)=>n.start-i.start);let e=0;for(const n of t){if(n.start!==e){this.matrices.copyWithin(e*16,n.start*16,(n.start+n.count)*16),this.colors?.copyWithin(e*3,n.start*3,(n.start+n.count)*3);for(const i of this.extras)i.array.copyWithin(e*i.size,n.start*i.size,(n.start+n.count)*i.size);n.start=e}e+=n.count}this.touch(0,e),this.used=e,this.holes=0,this.free.length=0}}function za(s,t,e){const n=Math.floor((s+1e4)/e);return Math.floor((t+1e4)/e)*4096+n}function Gr(s,t){const e=s.getAttribute("position"),n=new Float32Array(e.count);for(let i=0;i<e.count;i++)n[i]=t(e.getX(i),e.getY(i),e.getZ(i));return s.setAttribute("aPart",new fe(n,1)),s.getAttribute("uv")||s.setAttribute("uv",new fe(new Float32Array(e.count*2),2)),s}function ey(){const s=new kt(1,1,1);return s.translate(0,.5,0),Gr(s,()=>0)}function _u(s,t){const e=new be(.5,.5,1,s,1,!1,t);return e.translate(0,.5,0),Gr(e,()=>0)}function ny(s=.3){const t=new kt(1,1,1),e=t.getAttribute("position");for(let n=0;n<e.count;n++)e.getY(n)>0&&(e.setX(n,e.getX(n)*s),e.setZ(n,e.getZ(n)*s));return t.translate(0,.5,0),t.computeVertexNormals(),Gr(t,()=>0)}function iy(){const s=new kt(1,1,1),t=s.getAttribute("position");for(let e=0;e<t.count;e++)t.getY(e)>0&&(t.setX(e,t.getX(e)*.55+.22),t.setZ(e,t.getZ(e)*.8));return s.translate(0,.5,0),s.computeVertexNormals(),Gr(s,()=>0)}function sy(){const s=new kt(1,1,1);s.translate(0,.5,0);const e=.5+.08,n=.66,i=[-e,n,-e],o=[e,n,-e],r=[e,n,e],a=[-e,n,e],l=[0,1,-e],h=[0,1,e],c=(p,g,f)=>[...p,...g,...f],d=new Float32Array([...c(i,l,h),...c(i,h,a),...c(o,r,h),...c(o,h,l),...c(i,o,l),...c(a,h,r)]),u=new oe;u.setAttribute("position",new fe(d,3)),u.computeVertexNormals();const v=oy([s,u]);return Gr(v,(p,g,f)=>g>.99?Math.abs(p)<.01?3:1:g>.6&&g<.7&&Math.abs(p)>.55?2:0)}function oy(s){const t=[],e=[];for(const i of s){const o=i.index?i.toNonIndexed():i,r=o.getAttribute("position"),a=o.getAttribute("normal");for(let l=0;l<r.count;l++)t.push(r.getX(l),r.getY(l),r.getZ(l)),e.push(a.getX(l),a.getY(l),a.getZ(l))}const n=new oe;return n.setAttribute("position",new Mt(t,3)),n.setAttribute("normal",new Mt(e,3)),n.setAttribute("uv",new Mt(new Float32Array(t.length/3*2),2)),n}const ry=14,Mu=[{name:"aDims",itemSize:3},{name:"aStyle",itemSize:4},{name:"aStyle2",itemSize:4}],ay=250,ly=new Array(ti).fill(0),bu=new C;function cy(s,t,e){const n=s.matrices,i=s.extras[0],o=n[t*16+12],r=n[t*16+13],a=n[t*16+14],l=Math.hypot(i[t*3],i[t*3+2])*.6,h=i[t*3+1];e.expandByPoint(bu.set(o-l,r,a-l)),e.expandByPoint(bu.set(o+l,r+h,a+l))}class hy{group=new Ye;lists=new Map;geos;material;count=0;tileSize=1500;tileOx=-3400;tileOz=-4520;tiles=[];cameraBatches=new Map;mirrorBatches=new Map;cameraMeshes=new Set;mirrorMeshes=new Set;proxies=[];shadowDistance=3200;constructor(t){this.material=Zw(t),this.geos={box:ey(),cyl:_u(16,0),oct:_u(8,Math.PI/8),frustum:ny(.3),shear:iy(),house:sy()}}add(t,e){const n=Math.floor((e.x-this.tileOx)/this.tileSize),i=Math.floor((e.z-this.tileOz)/this.tileSize),o=`${t}|${n}|${i}`;let r=this.lists.get(o);r||(r=[],this.lists.set(o,r)),r.push(e),this.count++}build(){const t=new jt,e=new Xe,n=new C,i=new C,o=new Be;for(const[l,h]of this.lists){const c=l.split("|")[0],d=this.geos[c];d.boundingSphere===null&&d.computeBoundingSphere();const u=d.clone(),v=new $i(u,this.material,h.length),p=new Float32Array(h.length*3),g=new Float32Array(h.length*4),f=new Float32Array(h.length*4),m=new Ue;h.forEach((x,b)=>{n.set(x.x,x.y,x.z),e.setFromEuler(o.set(0,x.rot,0)),i.set(x.w,x.h,x.d),v.setMatrixAt(b,t.compose(n,e,i)),v.setColorAt(b,x.color),p[b*3]=x.w,p[b*3+1]=x.h,p[b*3+2]=x.d,g[b*4]=x.style,g[b*4+1]=x.floorH,g[b*4+2]=x.seed,g[b*4+3]=x.roof,f[b*4]=x.lit,f[b*4+1]=x.warm,f[b*4+2]=x.variant,f[b*4+3]=x.form;const M=Math.hypot(x.w,x.d)*.6;m.expandByPoint(n.set(x.x-M,x.y,x.z-M)),m.expandByPoint(n.set(x.x+M,x.y+x.h,x.z+M))}),u.setAttribute("aDims",new _i(p,3)),u.setAttribute("aStyle",new _i(g,4)),u.setAttribute("aStyle2",new _i(f,4));const y=m.getBoundingSphere(new Le);v.boundingSphere=y,v.castShadow=!0,v.receiveShadow=!0,v.instanceMatrix.needsUpdate=!0,v.instanceColor&&(v.instanceColor.needsUpdate=!0),this.group.add(v);const w=Math.hypot(m.max.x-m.min.x,m.max.z-m.min.z)/2;this.tiles.push({mesh:v,kind:c,n:h.length,box:m,center:y.center,r:y.radius,height:m.max.y-m.min.y,lodR:w,bits:0,cells:null,cellsDrawn:!1,mirrorCells:!1,matrices:v.instanceMatrix.array,colors:v.instanceColor.array,extras:[p,g,f]})}const r=new Map;for(const l of this.tiles)r.set(l.kind,(r.get(l.kind)??0)+l.n);for(const[l,h]of r){const c=this.geos[l],d=new yi(h,c,this.material,Mu,!0);d.mesh.layers.set(Or),d.mesh.name=`city-${l}`,this.cameraBatches.set(l,d),this.cameraMeshes.add(d.mesh);const u=new yi(h,c,this.material,Mu,!0);u.mesh.layers.set(ji),u.mesh.name=`city-${l}-mirror`,this.mirrorBatches.set(l,u),this.mirrorMeshes.add(u.mesh),this.group.add(d.mesh,u.mesh)}const a=new Map;for(const[l,h]of this.lists){const c=l.split("|")[0];let d=a.get(c);d||(d=[],a.set(c,d));for(const u of h)u.h>=ry&&d.push(u)}for(const[l,h]of a){if(!h.length)continue;const c=new $i(this.geos[l],this.material,h.length),d=new Ue;h.forEach((u,v)=>{n.set(u.x,u.y,u.z),e.setFromEuler(o.set(0,u.rot,0)),i.set(u.w,u.h,u.d),c.setMatrixAt(v,t.compose(n,e,i));const p=Math.hypot(u.w,u.d)*.6;d.expandByPoint(n.set(u.x-p,u.y,u.z-p)),d.expandByPoint(n.set(u.x+p,u.y+u.h,u.z+p))}),c.boundingSphere=d.getBoundingSphere(new Le),c.instanceMatrix.needsUpdate=!0,c.castShadow=!0,c.receiveShadow=!1,c.visible=!1,c.layers.mask=0,c.matrixAutoUpdate=!1,c.name=`shadow-proxy-${l}`,this.group.add(c),this.proxies.push(c)}}updateLod(t,e,n,i,o){const r=ly;r.fill(0);for(const l of this.tiles){const h=Math.max(0,Math.hypot(l.center.x-t,l.center.z-e)-l.lodR);l.bits=h<this.shadowDistance?n.casterCascades(l.center,l.r,l.height):0;for(let c=0;c<ti;c++)l.bits&1<<c&&r[c]++}let a=0;for(let l=0;l<ti;l++)r[l]>this.proxies.length+2&&(a|=1<<l);for(const l of this.tiles){const h=n.boxInView(l.box),c=this.cameraBatches.get(l.kind);let d=!0;if(h){const f=l.cells??=yh(l,l.n,ay,cy.bind(null,l));for(const m of f)c.set(m,n.boxInView(m.box)?m.count:0)||(d=!1);if(!d)for(const m of f)c.set(m,0);l.cellsDrawn=d}else if(l.cellsDrawn){for(const f of l.cells)c.set(f,0);l.cellsDrawn=!1}let u=$s("all",h&&!d,l.bits&~a);const v=Hr(u),p=h&&Math.max(0,l.center.distanceTo(i)-l.r)<=o,g=this.mirrorBatches.get(l.kind);if(p){let f=!0;for(const m of l.cells)g.set(m,n.boxInMirror(m.box)?m.count:0)||(f=!1);if(!f){for(const m of l.cells)g.set(m,0);u|=1<<ji}l.mirrorCells=f}else if(l.mirrorCells){for(const f of l.cells)g.set(f,0);l.mirrorCells=!1}l.mesh.castShadow=v,l.mesh.visible=u!==0,l.mesh.layers.mask=u}for(const l of this.cameraBatches.values())l.commit();for(const l of this.mirrorBatches.values())l.commit();for(const l of this.proxies)l.visible=l.castShadow=a!==0,l.layers.mask=a<<Br}}const Bt={GLASS_BLUE:0,PUNCHED:1,BALCONY:2,DECO:3,INDUSTRIAL:4,HOUSE:5,CONCRETE:6,HOTEL:7,GLASS_GREEN:8,STONE:9,BRICK:10,GRID:11,POOL:12,HELIPAD:13},Ws=["#f6f3ec","#f2efe6","#ffffff","#efe9dc","#f4f1ea","#e9e6df","#f8f6f1"],Na=["#efe4cf","#f1e6cf","#e8dcc3","#f3ead6","#ecdfc4"],Ua=["#f2c9a8","#f0bfa0","#efd1b3","#f4b8a0","#f7cdb6","#eeb497"],$d=["#efc0c6","#f3cfd4","#e9b7c0","#f7d5dc","#e8a9b3"],_h=["#cfe6dc","#bfe0d2","#d8ece2","#b6dccf"],Mh=["#f5e6b3","#f2dfa1","#f8ecc4","#efd68e"],jd=["#cfe0ec","#dbe8f0","#c3d7e6","#b9d3e3"],uy=["#4a4541","#57504a","#3f3b38","#6a605a","#4d443c","#5d5955"],dy=["#b98f6a","#a87e5c","#c49a74","#9c6f52","#c8a680","#b07b5b","#8e5e46"],Pa=["#b9b9b4","#a7a9a8","#c6c6c1","#9da3a6","#b5b8ba"],Zd=[...Ws,...Ws,...Na,...Ua,...$d,..._h,...Mh,...jd,"#e6d2b8","#e8c9a0","#dfc7a6"],fy=[...Ws.slice(0,3),...Na,...Ua,...Mh,..._h,"#e6d2b8","#e8c9a0","#dfc7a6","#d9b98f","#c9a97c","#b9b28a","#cdbfa3","#d6c2a2","#a9b59a"],Kt={glassBlue:{style:Bt.GLASS_BLUE,floorH:3.9,tints:["#9fb6c8","#8fa9bd","#b0c4d2","#a7bccb","#8898a8","#c2d0da"],lit:[.18,.62],warm:[.15,.5]},glassGreen:{style:Bt.GLASS_GREEN,floorH:3.8,tints:["#f2f2ee","#e8ebe4","#ffffff","#dfe6e0","#e6e2d6","#d9dfd9"],lit:[.18,.58],warm:[.2,.5]},punched:{style:Bt.PUNCHED,floorH:3.3,tints:[...Ws,...Na],lit:[.2,.55],warm:[.6,.95]},balcony:{style:Bt.BALCONY,floorH:3.2,tints:[...Na,...Ws,"#efe0d3","#f0d9c2"],lit:[.2,.5],warm:[.7,.95]},deco:{style:Bt.DECO,floorH:3.4,tints:[...Ua,...$d,...Mh,..._h],lit:[.15,.5],warm:[.6,.9]},stone:{style:Bt.STONE,floorH:3.8,tints:uy,lit:[.3,.7],warm:[.3,.6]},brick:{style:Bt.BRICK,floorH:3.4,tints:dy,lit:[.2,.5],warm:[.7,.95]},grid:{style:Bt.GRID,floorH:3.5,tints:["#f7f5f0","#f1eee6","#ffffff","#ece9e1"],lit:[.25,.6],warm:[.3,.7]},hotel:{style:Bt.HOTEL,floorH:3.2,tints:[...Ws,...Ua,...jd],lit:[.3,.6],warm:[.6,.9]},concrete:{style:Bt.CONCRETE,floorH:3,tints:Pa,lit:[0,0],warm:[.5,.5]},industrial:{tints:["#b8bcc0","#9aa3a8","#cfd3d6","#8e9aa0","#d8c9a8","#c4b89a","#a9b0b5"],lit:[.05,.2],warm:[.2,.4]},house:{tints:Zd,lit:[.2,.6],warm:[.8,1]}};function ki(s,t){let e=0;for(const[,i]of t)e+=i;let n=s.next()*e;for(const[i,o]of t)if(n-=o,n<=0)return i;return t[t.length-1][0]}function py(s,t,e){const n=new hy(e),i=new $e("city"),o=new Uint8Array(2e3*2e3),r=(x,b)=>{const M=Math.floor((x+1e4)/10),A=Math.floor((b+1e4)/10);return M<0||A<0||M>=2e3||A>=2e3?-1:A*2e3+M},a=(x,b,M)=>{const A=Math.ceil(M/10);for(let S=-A;S<=A;S++)for(let _=-A;_<=A;_++){const E=r(x+_*10,b+S*10);E>=0&&(o[E]=1)}},l=(x,b,M,A,S,_)=>{const E=M/2+_,T=A/2+_,F=Math.hypot(E,T)+8,k=Math.cos(S),I=Math.sin(S),O=Math.floor((x-F+1e4)/10),U=Math.floor((x+F+1e4)/10),P=Math.floor((b-F+1e4)/10),H=Math.floor((b+F+1e4)/10),G=(N,Y)=>{const V=N*k+Y*I,Q=-N*I+Y*k;return Math.abs(V)<=E&&Math.abs(Q)<=T};for(let N=P;N<=H;N++)for(let Y=O;Y<=U;Y++){if(Y<0||N<0||Y>=2e3||N>=2e3)continue;const V=Y*10-1e4-x,Q=N*10-1e4-b;(G(V+5,Q+5)||G(V,Q)||G(V+10,Q)||G(V,Q+10)||G(V+10,Q+10))&&(o[N*2e3+Y]=1)}},h=(x,b)=>{const M=r(x,b);return M>=0&&o[M]===1},c=[],d=(x,b,M,A,S)=>{const _=Math.cos(S),E=Math.sin(S),T=[];for(const[F,k]of[[-M/2,-A/2],[M/2,-A/2],[M/2,A/2],[-M/2,A/2],[0,0],[0,-A/2],[0,A/2],[-M/2,0],[M/2,0]])T.push([x+F*_-k*E,b+F*E+k*_]);return T},u=(x,b,M,A,S,_,E,T,F,k,I={})=>{let O=-1/0;for(const[H,G]of d(b,M,A,_,E))O=Math.max(O,s.heightAt(H,G));if(I.yBase!==void 0&&(O=I.yBase),O<.9)return null;const U=T instanceof Ht?T:new Ht(T);n.add(x,{x:b,y:O-.4,z:M,w:A,h:S+.4,d:_,rot:E,color:U,style:F,floorH:k,seed:i.range(0,1e3),roof:I.roof??5,lit:I.lit??.3,warm:I.warm??.7,variant:I.variant??.5,form:I.form??0});const P=I.margin??3;return P>=0&&l(b,M,A,_,E,P),O+S},v=(x,b,M,A,S)=>{for(const[_,E]of d(x,b,M,A,S))if(s.heightAt(_,E)<1.2)return!1;return!0},p=(x,b,M,A,S)=>{for(const[_,E]of d(x,b,M,A,S))if(h(_,E))return!1;return!0},g=(x,b)=>{const A=b.next()<.16?b.range(0,.04):se(x.lit[0],x.lit[1],Math.pow(b.next(),1.6));return{tint:b.pick(x.tints),lit:A,warm:b.range(x.warm[0],x.warm[1]),variant:b.next()}},f=(x,b,M,A,S,_,E,T,F)=>{const k=Math.cos(E),I=Math.sin(E),O=(G,N)=>[b+G*k-N*I,M+G*I+N*k],U=F.style===Bt.GLASS_BLUE||F.style===Bt.GLASS_GREEN||F.style===Bt.STONE,P=x.pick(Pa);if(x.chance(.7)){const G=A*x.range(.25,.45),N=S*x.range(.3,.5),[Y,V]=O(x.range(-A*.22,A*.22),x.range(-S*.2,S*.2));u("box",Y,V,G,x.range(3,6),N,E,U?"#8d9296":P,Bt.CONCRETE,3,{yBase:_-.2,margin:-1})}const H=x.int(0,3);for(let G=0;G<H;G++){const[N,Y]=O(x.range(-A*.35,A*.35),x.range(-S*.35,S*.35));u("box",N,Y,x.range(2,4.5),x.range(1.5,3),x.range(2,4),E,P,Bt.CONCRETE,3,{yBase:_-.2,margin:-1})}if(T>40&&x.chance(.35)){const[G,N]=O(A*.25,-S*.25);u("cyl",G,N,3,3.5,3,E,"#c9c9c4",Bt.CONCRETE,3,{yBase:_-.2,margin:-1})}if(T>100&&x.chance(.22)){const G=Math.min(18,Math.min(A,S)*.5),[N,Y]=O(-A*.18,S*.16);u("cyl",N,Y,G,.5,G,E,"#444444",Bt.HELIPAD,3,{yBase:_,margin:-1})}if(T>120&&x.chance(.35)){const[G,N]=O(A*.3,S*.3);u("frustum",G,N,1.6,x.range(14,32),1.6,E,"#cfd8dc",Bt.CONCRETE,3,{yBase:_,margin:-1})}T>150&&x.chance(.3)&&u("frustum",b,M,4,x.range(25,50),4,E,"#e3e8ec",Bt.CONCRETE,3,{yBase:_,margin:-1})},m=(x,b,M,A,S,_,E,T,F,k=!0)=>{const I=g(T,x),O={lit:I.lit,warm:I.warm,variant:I.variant},U=Math.cos(A),P=Math.sin(A),H=(V,Q)=>[b+V*U-Q*P,M+V*P+Q*U];let G=null,N=S,Y=_;switch(F){case 1:{const V=x.range(.72,.85),Q=x.range(.5,.65);u("box",b,M,S,E*x.range(.5,.62),_,A,I.tint,T.style,T.floorH,O),u("box",b,M,S*V,E*x.range(.78,.88),_*V,A,I.tint,T.style,T.floorH,O),G=u("box",b,M,S*Q,E,_*Q,A,I.tint,T.style,T.floorH,O),N=S*Q,Y=_*Q;break}case 2:{N=Math.min(S,_)*.62,Y=Math.max(S,_)*1.15,G=u("box",b,M,N,E,Y,A,I.tint,T.style,T.floorH,O);break}case 3:{const V=H(-S*.2,0),Q=H(S*.15,-_*.22);u("box",V[0],V[1],S*.6,E,_,A,I.tint,T.style,T.floorH,O),G=u("box",Q[0],Q[1],S*.7,E*x.range(.6,1),_*.56,A,I.tint,T.style,T.floorH,O),N=S*.6,Y=_;break}case 4:{const V=S*.18,Q=S*.41,W=H(-(Q+V)/2,0),q=H((Q+V)/2,0);u("box",W[0],W[1],Q,E,_*.8,A,I.tint,T.style,T.floorH,O),G=u("box",q[0],q[1],Q,E*x.range(.85,1),_*.8,A,I.tint,T.style,T.floorH,O),u("box",b,M,V+2,4,_*.4,A,"#dfe4e8",Bt.CONCRETE,3,{yBase:(G??0)-E*.45,margin:-1}),N=Q,Y=_*.8;break}case 5:{G=u("box",b,M,S,E*.88,_,A,I.tint,T.style,T.floorH,O);const V=g(Kt.glassBlue,x);G=u("box",b,M,S*.86,E,_*.86,A,V.tint,Bt.GLASS_BLUE,3.9,{lit:.7,warm:.3,variant:V.variant}),N=S*.86,Y=_*.86;break}case 6:{const V=[[1,.55],[.86,.72],[.7,.88],[.5,1]];for(const[Q,W]of V)G=u("box",b,M,S*Q,E*W,_*Q,A,I.tint,T.style,T.floorH,O);G!==null&&u("frustum",b,M,3.5,E*.18,3.5,A,"#e8e4dc",Bt.CONCRETE,3,{yBase:G,margin:-1}),N=S*.5,Y=_*.5;break}case 7:{const V=x.chance(.45)?"cyl":"oct";N=Y=Math.min(S,_),G=u(V,b,M,N,E,Y,A,I.tint,T.style,T.floorH,O);break}case 8:{G=u("box",b,M,S,E*.9,_,A,I.tint,T.style,T.floorH,O),G!==null&&(u("frustum",b,M,S,E*.1+6,_,A,I.tint,T.style,T.floorH,{...O,yBase:G-.1,margin:-1}),k=!1);break}default:G=u("box",b,M,S,E,_,A,I.tint,T.style,T.floorH,O)}if(G!==null&&k){const[V,Q]=F===3?H(-S*.2,0):F===4?H((S*.41+S*.18)/2,0):[b,M];f(x,V,Q,N,Y,G,A,E,T)}return G},y=s.districts.find(x=>x.id==="downtown"),w=(x,b,M,A)=>{const S=Math.cos(y.rot),_=Math.sin(y.rot),E=y.cx+b*S-M*_,T=y.cz+b*_+M*S,F=s.heightAt(E,T);if(F<1)return;const k=A(E,T,F);c.push({x:E,z:T,h:k,name:x}),a(E,T,46)};w("Meridian Tower",120,-80,(x,b,M)=>{const A={lit:.5,warm:.3,variant:.2};return u("box",x,b,46,150,46,.1,"#9fb6c8",Bt.GLASS_BLUE,3.9,A),u("box",x,b,38,230,38,.1,"#9fb6c8",Bt.GLASS_BLUE,3.9,A),u("box",x,b,28,285,28,.1,"#b0c4d2",Bt.GLASS_BLUE,3.9,A),u("box",x,b,18,12,18,.1,"#c2d0da",Bt.GLASS_BLUE,3.9,{yBase:M+285,lit:.9,warm:.2,variant:.5,margin:-1}),u("frustum",x,b,9,64,9,.1,"#e8eef2",Bt.CONCRETE,3,{yBase:M+297,margin:-1}),361}),w("Bahía One",-40,70,(x,b,M)=>{const A={lit:.55,warm:.25,variant:.8};return u("oct",x,b,46,262,46,.05,"#8898a8",Bt.GLASS_BLUE,3.9,A),u("frustum",x,b,42,36,42,.05,"#8898a8",Bt.GLASS_BLUE,3.9,{...A,yBase:M+262,margin:-1}),u("frustum",x,b,4,38,4,.05,"#cfd8dc",Bt.CONCRETE,3,{yBase:M+297,margin:-1}),335}),w("Faro Bahía",-180,40,(x,b,M)=>(u("cyl",x,b,40,240,40,0,"#e8ebe4",Bt.GLASS_GREEN,3.8,{lit:.45,warm:.4,variant:.6}),u("cyl",x,b,50,10,50,0,"#e8eef2",Bt.CONCRETE,3,{yBase:M+232,margin:-1}),u("cyl",x,b,24,16,24,0,"#cfe0ec",Bt.GLASS_BLUE,3.9,{yBase:M+242,lit:.95,warm:.3,variant:.4,margin:-1}),u("frustum",x,b,28,18,28,.4,"#dfe4e8",Bt.CONCRETE,3,{yBase:M+258,margin:-1}),u("frustum",x,b,3,30,3,0,"#cfd8dc",Bt.CONCRETE,3,{yBase:M+275,margin:-1}),305)),w("Twin Palms A",40,210,(x,b)=>(u("box",x,b,30,182,56,.05,"#efe4cf",Bt.BALCONY,3.3,{lit:.3,warm:.85,variant:.4}),182)),w("Twin Palms B",110,210,(x,b,M)=>(u("box",x,b,30,182,56,.05,"#efe4cf",Bt.BALCONY,3.3,{lit:.35,warm:.85,variant:.4}),u("box",x-35,b,44,6,12,.05,"#dfe4e8",Bt.CONCRETE,3.3,{yBase:M+118,margin:-1}),182)),w("The Sail",-60,-250,(x,b,M)=>(u("shear",x,b,60,205,44,.9,"#b0c4d2",Bt.GLASS_BLUE,3.9,{lit:.45,warm:.3,variant:.9}),u("box",x,b,3.5,42,24,.9,"#e8eef2",Bt.CONCRETE,3,{yBase:M+204,margin:-1}),247)),w("Terraces",260,120,(x,b)=>{for(let M=0;M<5;M++)u("box",x+M*6,b-M*4,60-M*8,45+M*28,40,0,"#f7f5f0",Bt.GRID,3.5,{lit:.35,warm:.5,variant:.3});return 160}),w("Crown Plaza",-300,-180,(x,b,M)=>{u("box",x,b,42,200,42,.2,"#3a3633",Bt.STONE,3.8,{lit:.55,warm:.4,variant:.5}),u("box",x,b,20,10,20,.2,"#c2d0da",Bt.GLASS_BLUE,3.9,{yBase:M+200,lit:.9,warm:.6,variant:.5,margin:-1});for(let A=0;A<4;A++){const S=.2+A*Math.PI/2;u("box",x+Math.cos(S)*14,b+Math.sin(S)*14,3,44,14,S,"#e8eef2",Bt.CONCRETE,3,{yBase:M+198,margin:-1})}return 244}),w("The Needle",210,-380,(x,b,M)=>(u("box",x,b,22,212,22,.1,"#dfe6e0",Bt.GLASS_GREEN,3.8,{lit:.4,warm:.5,variant:.3}),u("frustum",x,b,16,14,16,.1,"#dfe6e0",Bt.GLASS_GREEN,3.8,{yBase:M+212,lit:.9,warm:.5,variant:.3,margin:-1}),u("frustum",x,b,5,70,5,.1,"#e8eef2",Bt.CONCRETE,3,{yBase:M+224,margin:-1}),294)),w("Gateway",-230,-430,(x,b,M)=>{const A={lit:.45,warm:.8,variant:.6};return u("box",x-26,b,22,156,44,.02,"#f2efe6",Bt.PUNCHED,3.3,A),u("box",x+26,b,22,156,44,.02,"#f2efe6",Bt.PUNCHED,3.3,A),u("box",x,b,76,14,40,.02,"#e9e6df",Bt.GRID,3.5,{yBase:M+156,lit:.6,warm:.5,variant:.6,margin:-1}),170}),w("Helix",330,-240,(x,b,M)=>{for(let A=0;A<12;A++)u("box",x,b,34,16.5,34,A*.1,"#e6e2d6",Bt.GLASS_GREEN,3.9,{yBase:M+A*16,lit:.5,warm:.3,variant:.2});return 198}),w("Aquamarine",-380,230,(x,b)=>{const M={lit:.55,warm:.2,variant:.6};return u("box",x,b,18,228,62,0,"#8fa9bd",Bt.GLASS_BLUE,3.9,M),u("box",x,b,62,228,18,0,"#8fa9bd",Bt.GLASS_BLUE,3.9,M),u("frustum",x,b,24,250,24,0,"#c2d0da",Bt.GLASS_BLUE,3.9,M),250});for(const x of s.districts){const b=t.get(x.id),M=Math.cos(x.rot),A=Math.sin(x.rot),S=(E,T)=>[x.cx+E*M-T*A,x.cz+E*A+T*M];if(!b)continue;const _=i.fork(x.id);for(const E of b){let T=function(){const ft=1-St(.2,1,q),Z=Y>80&&V>70?2:1;for(let j=0;j<Z;j++){const et=_.next();let D;et<.07+.22*ft?D=_.range(120,205):et<.45+.2*ft?D=_.range(70,120):D=_.range(36,72),D*=se(.6,1,ft),D=Math.max(28,D);const J=_.next();let K,rt;J<(D>110?.34:.22)?(K=_.range(16,24),rt=_.range(18,30)):J<.82?(K=_.range(24,Math.min(46,Y*.55)),rt=_.range(22,Math.min(46,V*.6))):(K=_.range(Math.min(44,Y*.5),Math.min(74,Y*.75)),rt=_.range(18,Math.min(30,V*.4)),D>150&&(D*=.7));const dt=Z===1?(P+H)/2+_.range(-Y*.1,Y*.1):se(P+K/2+4,H-K/2-4,j),xt=(G+N)/2+_.range(-V*.15,V*.15),[pt,z]=S(dt,xt);if(!v(pt,z,K,rt,x.rot)||!p(pt,z,K+6,rt+6,x.rot))continue;const R=D>110?ki(_,[[Kt.glassBlue,.34],[Kt.glassGreen,.16],[Kt.punched,.1],[Kt.balcony,.08],[Kt.deco,.08],[Kt.stone,.14],[Kt.grid,.1]]):D>60?ki(_,[[Kt.glassBlue,.2],[Kt.glassGreen,.12],[Kt.punched,.16],[Kt.balcony,.14],[Kt.deco,.14],[Kt.stone,.1],[Kt.grid,.1],[Kt.brick,.04]]):ki(_,[[Kt.glassBlue,.1],[Kt.glassGreen,.08],[Kt.punched,.2],[Kt.balcony,.12],[Kt.deco,.18],[Kt.stone,.06],[Kt.grid,.1],[Kt.brick,.16]]);if(D>55&&_.chance(.6)){const gt=Math.min(Y*.92,K+_.range(14,36)),ut=Math.min(V*.92,rt+_.range(14,36)),Nt=_.range(8,18);if(_.chance(.45))u("box",pt,z,gt,Nt,ut,x.rot,_.pick(Pa),Bt.CONCRETE,3.4,{lit:.1,warm:.5});else{const bt=g(R.style===Bt.STONE?Kt.punched:R,_);u("box",pt,z,gt,Nt,ut,x.rot,bt.tint,R.style===Bt.STONE?Bt.PUNCHED:R.style,R.floorH,{lit:bt.lit,warm:bt.warm,variant:bt.variant})}}let nt;const ht=_.next();R.style===Bt.DECO&&D>60?nt=ht<.55?6:ht<.8?1:0:D>110?nt=ht<.28?1:ht<.4?7:ht<.52?5:ht<.62?8:ht<.72?4:ht<.8?2:0:D>60?nt=ht<.18?1:ht<.3?7:ht<.42?3:ht<.5?2:ht<.58?8:0:nt=ht<.25?3:ht<.35?2:0,m(_,pt,z,x.rot,K,rt,D,R,nt)}const ot=(j,et,D,J)=>{let K=D;for(;K<J-10;){const rt=_.range(14,30),dt=Math.min(_.range(12,22),(j==="x"?V:Y)*.4);if(K+rt>J)break;const xt=K+rt/2;if(K+=rt+_.range(0,3),_.next()>.55+.35*ft)continue;const pt=et===(j==="x"?G:P)?1:-1,z=j==="x"?xt:et+pt*dt/2,R=j==="x"?et+pt*dt/2:xt,nt=j==="x"?rt:dt,ht=j==="x"?dt:rt,[gt,ut]=S(z,R);if(!v(gt,ut,nt,ht,x.rot)||!p(gt,ut,nt+3,ht+3,x.rot))continue;const Nt=ki(_,[[Kt.brick,.24],[Kt.punched,.28],[Kt.deco,.2],[Kt.balcony,.12],[Kt.grid,.06],[Kt.concrete,.1]]),bt=g(Nt,_),Dt=_.range(12,40)*se(.7,1.1,ft),ee=u("box",gt,ut,nt,Dt,ht,x.rot,bt.tint,Nt.style,Nt.floorH,{lit:bt.lit,warm:bt.warm,variant:bt.variant});ee!==null&&Dt>20&&_.chance(.4)&&u("box",gt,ut,nt*.4,_.range(2.5,4),ht*.45,x.rot,_.pick(Pa),Bt.CONCRETE,3,{yBase:ee-.2,margin:-1})}};ot("x",G,P,H),ot("x",N,P,H),ot("z",P,G,N),ot("z",H,G,N)},F=function(){const ft=Math.max(1,Math.round(Y*V/1800));for(let Z=0,ot=0;Z<ft*2&&ot<ft;Z++){const j=_.range(16,Math.min(44,Y*.75)),et=_.range(16,Math.min(44,V*.75)),D=_.range(P+j/2,H-j/2),J=_.range(G+et/2,N-et/2),[K,rt]=S(D,J);if(!v(K,rt,j,et,x.rot)||!p(K,rt,j+4,et+4,x.rot))continue;ot++;let dt=se(x.hMin,x.hMax,Math.pow(_.next(),2))*se(.75,1.15,it);dt=Qt(dt,x.hMin*.8,x.hMax);const xt=dt>50?ki(_,[[Kt.balcony,.3],[Kt.punched,.2],[Kt.grid,.15],[Kt.deco,.1],[Kt.glassGreen,.15],[Kt.glassBlue,.1]]):ki(_,[[Kt.brick,.28],[Kt.punched,.24],[Kt.deco,.16],[Kt.balcony,.16],[Kt.grid,.1],[Kt.concrete,.06]]),pt=_.next(),z=Math.max(Y,V)>90&&Math.min(j,et)>20,R=dt>45?pt<.25?1:pt<.35?7:pt<.5&&z?2:pt<.6?3:0:pt<.25?3:pt<.35&&z?2:0;m(_,K,rt,x.rot+_.range(-.03,.03),j,et,dt,xt,R,dt>20)}},k=function(){const ft=_.chance(.65),Z=ft?_.range(18,30):_.range(24,40),ot=ft?Math.min(V*.85,_.range(50,95)):_.range(24,40),[j,et]=S((P+H)/2+_.range(-6,6),(G+N)/2);if(!v(j,et,Z,ot,x.rot)||!p(j,et,Z+4,ot+4,x.rot))return;const D=se(x.hMin,x.hMax,Math.pow(_.next(),1.5)),J=ft?ki(_,[[Kt.hotel,.55],[Kt.balcony,.25],[Kt.deco,.2]]):ki(_,[[Kt.glassGreen,.3],[Kt.balcony,.25],[Kt.deco,.2],[Kt.glassBlue,.15],[Kt.punched,.1]]),K=_.next(),rt=ft?0:K<.3?7:K<.5?1:K<.6?8:0;m(_,j,et,x.rot,Z,ot,D,J,rt);const[dt,xt]=S((P+H)/2+Z*.5+12,(G+N)/2);if(v(dt,xt,18,ot*.7,x.rot)&&p(dt,xt,18,ot*.7,x.rot)){const pt=g(Kt.punched,_),z=u("box",dt,xt,18,_.range(4,9),ot*.7,x.rot,pt.tint,Bt.PUNCHED,3.2,{lit:pt.lit,warm:pt.warm});z!==null&&_.chance(.7)&&u("house",dt,xt,_.range(6,10),.4,Math.min(ot*.4,_.range(12,24)),x.rot,"#3fc4de",Bt.POOL,3,{yBase:z,form:2,margin:-1})}},I=function(){const ft=_.range(16,24),Z=Math.min(30,V/2-2),ot=St(2200,5500,X),j=ki(_,[[0,.3],[2,se(.14,.03,ot)],[5,se(.16,.05,ot)],[6,.13],[1,se(.12,.17,ot)],[7,se(.1,.17,ot)],[3,se(.04,.1,ot)],[4,se(.01,.05,ot)]]),et=ot>.5?fy:Zd,D=V>=40?[[G+Z/2,0],[N-Z/2,Math.PI]]:[[(G+N)/2,0]];for(const[J,K]of D){let rt=P+ft/2;for(;rt<H-ft/2;){const dt=_.range(8,14),xt=_.range(9,17),pt=Math.max(ft*_.range(.9,1.25),dt+6),z=rt;if(rt+=pt,_.next()>(x.density+.15)*at)continue;const R=K===0?1:-1,nt=x.rot+K+_.range(-.12,.12),[ht,gt]=S(z+_.range(-1.5,1.5),J-R*_.range(-3,3));if(_.next()<.08*it){const Ft=Math.min(22,pt-4),Lt=_.range(12,18);if(Ft<12||!v(ht,gt,Ft,Lt,nt)||h(ht,gt))continue;const le=_.chance(.5)?Kt.brick:Kt.punched,te=g(le,_);u("house",ht,gt,Ft,_.range(7,11),Lt,nt,te.tint,le.style,3.1,{lit:te.lit,warm:te.warm,variant:te.variant,form:2,margin:1});continue}if(!v(ht,gt,dt,xt,nt)||h(ht,gt))continue;const ut=_.chance(.28)?2:1,Nt=_.next(),bt=Nt<.42?0:Nt<.78?1:2,Dt=bt===2?ut*3.1+.6:ut*3.1/.68,ee=_.chance(.65)?j:_.pick(ot>.5?[0,1,3,4,6,7,7,1]:[0,1,2,3,4,5,6,7]),yt=g(Kt.house,_);yt.tint=_.pick(et),u("house",ht,gt,dt,Dt,xt,nt,yt.tint,Bt.HOUSE,3,{roof:ee,form:bt,lit:yt.lit,warm:yt.warm,variant:yt.variant,margin:1});const Ot=Math.cos(nt),Yt=Math.sin(nt);if(_.chance(.3)&&pt-dt>9){const Ft=_.chance(.5)?1:-1,Lt=ht+Ft*(dt/2+3.2)*Ot,le=gt+Ft*(dt/2+3.2)*Yt;v(Lt,le,5.5,6,nt)&&u("house",Lt,le,5.5,2.9,6,nt,yt.tint,Bt.HOUSE,3,{roof:ee,form:2,lit:0,margin:.5})}if(_.chance(.28)){const[Ft,Lt]=S(z,J+R*(xt/2+6));v(Ft,Lt,6,4,x.rot)&&u("house",Ft,Lt,_.range(5,9),.4,_.range(3.5,5),x.rot,"#3fc4de",Bt.POOL,3,{form:2,margin:.5,yBase:s.heightAt(Ft,Lt)})}}}},O=function(){const ft=Math.max(1,Math.round(Y*V/3600));for(let Z=0,ot=0;Z<ft*3&&ot<ft;Z++){const j=_.range(28,Math.min(80,Y*.85)),et=_.range(22,Math.min(60,V*.85)),D=_.range(P+j/2,H-j/2),J=_.range(G+et/2,N-et/2),[K,rt]=S(D,J);if(!v(K,rt,j,et,x.rot)||!p(K,rt,j,et,x.rot))continue;ot++;const dt=g(Kt.industrial,_),xt=_.range(8,15),pt=u("box",K,rt,j,xt,et,x.rot,dt.tint,Bt.INDUSTRIAL,4,{lit:dt.lit,warm:dt.warm,variant:dt.variant});if(pt!==null){if(_.chance(.5)&&u("box",K,rt,j+.6,.5,et+.6,x.rot,"#8f9599",Bt.CONCRETE,3,{yBase:pt-.05,margin:-1}),_.chance(.3)){const[z,R]=S(D-j/2+8,J+et/2+8);v(z,R,14,10,x.rot)&&u("box",z,R,14,_.range(6,10),10,x.rot,_.pick(Ws),Bt.PUNCHED,3.2,{lit:.3,warm:.6})}if(_.chance(.3)){const[z,R]=S(D+j/2+9,J-et/2+8);v(z,R,12,12,x.rot)&&u("cyl",z,R,_.range(7,12),_.range(7,13),_.range(7,12),0,"#dcdcd4",Bt.CONCRETE,3)}}}};const U=E.streetWidth*.5+3,P=E.x0+U,H=E.x1-U,G=E.z0+U,N=E.z1-U,Y=H-P,V=N-G;if(Y<12||V<12)continue;const[Q,W]=S((P+H)/2,(G+N)/2),q=Math.hypot(Q-x.cx,W-x.cz)/Math.max(x.hw,x.hh),X=Math.hypot(Q-y.cx,W-y.cz),it=1-St(600,4e3,X),at=1-.45*St(2500,8500,X);if(!(_.next()>x.density*(x.zone===ne.RES_LOW?at:1)))switch(x.zone){case ne.DOWNTOWN:T();break;case ne.RES_MID:F();break;case ne.HOTEL:k();break;case ne.RES_LOW:I();break;case ne.INDUSTRIAL:O();break}}}return n.build(),{batches:n,landmarkPositions:c,occupied:h,markOccupied:a}}function my(s){const n=document.createElement("canvas");n.width=256,n.height=512;const i=n.getContext("2d");i.clearRect(0,0,256,512),i.fillStyle="#8a7458",i.fillRect(256/2,0,256/2,512);for(let a=0;a<512;a+=9)i.fillStyle=a%18===0?"#6e5a44":"#9a8466",i.fillRect(256/2,a,256/2,4);for(let a=0;a<140;a++)i.fillStyle=`rgba(40,30,20,${.1+s.next()*.2})`,i.fillRect(256/2+s.next()*256/2,s.next()*512,3+s.next()*6,2);i.save(),i.beginPath(),i.rect(0,0,256/2,512),i.clip(),i.strokeStyle="#6b7a3a",i.lineWidth=5,i.beginPath(),i.moveTo(256/4,512),i.lineTo(256/4,8),i.stroke();const o=256/2;for(let a=0;a<46;a++){const l=a/46,h=492-l*472,c=(o/2-4)*(.45+.55*Math.sin(Math.PI*Math.min(1,l*1.15))),d=60+Math.round(40*Math.sin(l*7+a));i.fillStyle=`rgb(${40+a%3*8}, ${110+d*.6}, ${40+a%5*5})`;for(const u of[-1,1])i.beginPath(),i.moveTo(o/2,h),i.quadraticCurveTo(o/2+u*c*.5,h-18,o/2+u*c,h-34+6*Math.sin(a)),i.quadraticCurveTo(o/2+u*c*.55,h-6,o/2,h+4),i.fill()}i.restore();const r=new Ur(n);return r.colorSpace=Dn,r.anisotropy=4,r}const Nr=6;function gy(s){const e=128*Nr,n=128,i=document.createElement("canvas");i.width=e,i.height=n;const o=i.getContext("2d"),r=o.createImageData(e,n),a=r.data,l=(p,g,f,m)=>{const y=(g*e+p)*4;m<=a[y+3]||(a[y]=a[y+1]=a[y+2]=Math.round(255*Math.min(1,Math.max(0,f))),a[y+3]=Math.round(255*Math.min(1,m)))},h=(p,g,f,m,y,w,x)=>{for(let b=0;b<128;b++)for(let M=0;M<128;M++){const A=(M+.5)/128,S=1-(b+.5)/128,_=A-g,E=S-f,T=Math.atan2(E,_),F=m*(1+.14*Vt(Math.cos(T)*2.1+x,Math.sin(T)*2.1+x*.7)+.06*Vt(A*30+x,S*30)),k=Math.hypot(_,E);if(k>F)continue;const I=k/F,O=Math.pow(.5+.5*(E/F),.6),U=.5+.5*Vt(A*22+x*3,S*22-x),P=(w+(y-w)*O)*(.8+.4*U)*(1-.3*I*I)*(1-.3*St(-.55,-1,E/F));l(p*128+M,b,P,1)}},c=(p,g,f,m,y)=>{for(let w=0;w<128;w++)for(let x=0;x<128;x++){const b=(x+.5)/128,M=1-(w+.5)/128,A=b-g,S=M-f,_=Math.atan2(S,A),E=m*(1+.16*Vt(Math.cos(_)*2.3+y,Math.sin(_)*2.3-y)),T=Math.hypot(A,S);if(T>E)continue;const F=T/E,k=.5+.5*Vt(b*26+y,M*26+y*2),O=(.62+.5*(.5+.5*Vt(b*9-y,M*9+y)))*(.8+.4*k)*(1-.45*F*F);l(p*128+x,w,O,1)}},d=(p,g,f,m,y,w)=>{for(let x=0;x<128;x++)for(let b=0;b<128;b++){const M=(b+.5)/128,A=1-(x+.5)/128;A<f||A>m||Math.abs(M-g)>y*(1-.4*(A-f)/(m-f))||l(p*128+b,x,w*(.85+.3*Vt(M*40,A*40)),1)}},u=(p,g,f,m,y,w,x)=>{for(let b=0;b<y;b++){const M=b/y*Math.PI*2+.4*Vt(b*1.7+x,x);for(let A=0;A<=1;A+=.01){const S=m*(.75+.25*Vt(b*3.1,x+b)),_=g+Math.cos(M)*S*A,E=f+Math.sin(M)*S*A*(1-w)-w*m*A*A,T=.045*m*(1-.5*A)/.25;for(let F=-1;F<=1;F+=.25){const k=_-Math.sin(M)*T*F,I=E+Math.cos(M)*T*F,O=Math.floor(k*128),U=Math.floor((1-I)*128);O<0||U<0||O>=128||U>=128||l(p*128+O,U,.75+.35*A-.2*Math.abs(F),1)}}}};d(0,.5,0,.3,.035,.42),h(0,.5,.5,.385,1.15,.58,3+s.next()),h(0,.36,.42,.2,.95,.52,7+s.next()),h(0,.63,.44,.19,1,.54,11+s.next()),d(1,.5,0,.34,.03,.4),h(1,.47,.52,.34,1.1,.55,21+s.next()),h(1,.66,.6,.22,1.2,.6,25+s.next()),h(1,.3,.4,.17,.9,.5,29+s.next()),h(1,.56,.3,.16,.85,.48,33+s.next()),d(2,.5,0,.5,.022,.55),u(2,.5,.52,.24,9,.35,2+s.next()),c(3,.5,.5,.4,5+s.next()),c(4,.5,.5,.38,15+s.next()),c(4,.68,.6,.2,17+s.next()),u(5,.5,.5,.26,9,0,6+s.next());for(let p=0;p<128;p++)for(let g=0;g<128;g++){const f=(p*e+640+g)*4;a[f+3]===0&&Math.hypot((g+.5)/128-.5,(p+.5)/128-.5)<.05&&(a[f]=a[f+1]=a[f+2]=140,a[f+3]=255)}o.putImageData(r,0,0);const v=new Ur(i);return v.colorSpace=wi,v.minFilter=Vi,v.magFilter=_e,v.anisotropy=4,v.generateMipmaps=!0,v}function vy(s,t,e=0){const i=new gh(1,e).getAttribute("position"),o=[],r=[],a=[];for(let l=0;l<i.count;l++){const h=i.getX(l),c=i.getY(l),d=i.getZ(l),u=1+.18*Vt(h*2.1+s,c*2.1+d*1.7-s);o.push(h*u,c*u*(c<0?.65:1),d*u),r.push(h,c,d),a.push(t)}return{pos:o,nrm:r,part:a}}function Su(s=!1){const t=[],e=[],n=[],i=[];for(let l=0;l<3;l++){const h=l/3*Math.PI*2,c=(l+1)/3*Math.PI*2,d=Math.cos(h)*.045,u=Math.sin(h)*.045,v=Math.cos(c)*.045,p=Math.sin(c)*.045,g=Math.cos((h+c)/2),f=Math.sin((h+c)/2),m=[[d,0,u],[v,0,p],[v,1,p],[d,0,u],[v,1,p],[d,1,u]];for(const[y,w,x]of m)t.push(y,w,x),e.push(g,0,f),n.push(0),i.push(0,w)}for(const[l,h]of[[3.1,1],[8.7,2],[14.3,3]]){const c=vy(l,h,s&&h===1?1:0);t.push(...c.pos),e.push(...c.nrm),n.push(...c.part);for(let d=0;d<c.part.length;d++)i.push(0,0)}const a=new oe;return a.setAttribute("position",new Mt(t,3)),a.setAttribute("normal",new Mt(e,3)),a.setAttribute("uv",new Mt(i,2)),a.setAttribute("aPart",new Mt(n,1)),a.boundingSphere=new Le(new C(0,1.2,0),2.6),a}function xy(){const s=[],t=[],e=[],n=[],r=h=>{const c=.045*(1-.3*h),d=[];for(let u=0;u<=4;u++){const v=u/4*Math.PI*2+Math.PI/4;d.push([Math.cos(v)*c,h,Math.sin(v)*c])}return d};for(let h=0;h<3;h++){const c=r(h/3),d=r((h+1)/3);for(let u=0;u<4;u++){const v=(u+.5)/4*Math.PI*2+Math.PI/4,p=Math.cos(v),g=Math.sin(v),f=[c[u],c[u+1],d[u+1],c[u],d[u+1],d[u]],m=[.55+.4*(u/4),.55+.4*((u+1)/4),.55+.4*((u+1)/4),.55+.4*(u/4),.55+.4*((u+1)/4),.55+.4*(u/4)];f.forEach(([y,w,x],b)=>{s.push(y,w,x),t.push(p,0,g),e.push(m[b],w),n.push(0)})}}const a=7;for(let h=0;h<a;h++){const c=h/a*Math.PI*2,d=.56,u=.14,v=[];for(let g=0;g<=2;g++){const f=g/2,m=d*f,y=1+.16*Math.sin(f*Math.PI*.8)-.5*f*f,w=Math.cos(c)*m,x=Math.sin(c)*m,b=-Math.sin(c)*u*(1-f*.25),M=Math.cos(c)*u*(1-f*.25);v.push([w-b,y,x-M],[w+b,y,x+M])}const p=(g,f,m)=>{for(const y of[g,f,m]){s.push(v[y][0],v[y][1],v[y][2]),t.push(0,1,0),n.push(h+1);const w=Math.floor(y/2),x=y%2;e.push(x*.5,1-w/2)}};p(0,2,1),p(1,2,3),p(2,4,3),p(3,4,5)}const l=new oe;return l.setAttribute("position",new Mt(s,3)),l.setAttribute("normal",new Mt(t,3)),l.setAttribute("uv",new Mt(e,2)),l.setAttribute("aPart",new Mt(n,1)),l.boundingSphere=new Le(new C(0,.8,0),1.2),l}function wy(){const s=new oe;return s.setAttribute("position",new Mt([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,-.5,0,.5,.5,0,-.5,.5,0],3)),s.setAttribute("normal",new Mt([0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0],3)),s.setAttribute("uv",new Mt([0,0,1,0,1,1,0,0,1,1,0,1],2)),s.boundingSphere=new Le(new C(0,0,0),2),s}const Kd=`
uniform float uTime;
uniform float uWind;
attribute float aPart;
attribute vec4 aVar; // archetype, seed, crown squash / frond droop, trunk length
varying float vPart;
varying vec3 vWP;
varying vec3 vCrownN; // world-space direction from the puff centre (the undisplaced sphere normal)
varying float vSeed;
${jn}
`,yy=`
vec3 objectNormal = normal;
// foliage normals lean toward the sky so a crown shades as a lit mass of leaves, not a hard ball
if (aPart > 0.5) objectNormal = normalize(mix(normalize(objectNormal * vec3(1.0, 1.0 / max(aVar.z, 0.3), 1.0)), vec3(0.0, 1.0, 0.0), 0.3));
vCrownN = normalize((modelMatrix * instanceMatrix * vec4(normal, 0.0)).xyz);
vSeed = aVar.y;
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif
`,bh=`
vec3 vegShadowC = vec3(0.0);
float vegShadowR = 0.0;
`,_y=`
vec3 transformed = position;
${bh}
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
`,My=`
varying float vPart;
varying vec3 vWP;
varying vec3 vCrownN;
varying float vSeed;
float vegNear; // 1 within ~200 m of the camera, 0 beyond 320 m: gates the close-range leaf detail
${jn}
`,by=`
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
`,Sy=`
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
`,Ey=`
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
`,Ay=`
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
`,Ty=`
vec3 transformed = position;
${bh}
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
`,Sh=`
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
vec3 vegL = normalize(vec3(directionalShadowMatrix[ 0 ][0][2], directionalShadowMatrix[ 0 ][1][2], directionalShadowMatrix[ 0 ][2][2]));
vec4 vegShadowPos = vegShadowR > 0.0 ? vec4(vegShadowC - vegL * vegShadowR, 1.0) : worldPosition;
#else
#define vegShadowPos worldPosition
#endif
${ae.shadowmap_vertex.replace(/worldPosition/g,"vegShadowPos")}
`,Cy=`
#include <shadowmap_pars_fragment>
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
float vegShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
  return mix( 0.34, 1.0, getShadow( shadowMap, shadowMapSize, shadowIntensity, shadowBias, shadowRadius, shadowCoord ) );
}
#endif
`;function Eh(s){return s.replace(/\bgetShadow\(/g,"vegShadow(").replace("#include <shadowmap_pars_fragment>",Cy)}const Jd=`
attribute vec4 aVar; // archetype (0 crown, 1 palm), seed, card size (unit), crown centre height (unit)
varying vec2 vCardUv;
varying float vElev;
varying float vCol; // atlas column of the side view (top view is 3 columns further)
`,Qd=`
vec4 mvPosition;
${bh}
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
`,tf=`
uniform sampler2D uAtlas;
varying vec2 vCardUv;
varying float vElev;
varying float vCol;
`,Ry=`
{
  vec4 side = texture2D(uAtlas, vec2((vCardUv.x + vCol) / ${Nr}.0, vCardUv.y));
  vec4 top = texture2D(uAtlas, vec2((vCardUv.x + vCol + 3.0) / ${Nr}.0, vCardUv.y));
  diffuseColor.a = mix(side, top, vElev).a;
}
`,Py=`
#include <color_fragment>
{
  vec4 side = texture2D(uAtlas, vec2((vCardUv.x + vCol) / ${Nr}.0, vCardUv.y));
  vec4 top = texture2D(uAtlas, vec2((vCardUv.x + vCol + 3.0) / ${Nr}.0, vCardUv.y));
  vec4 t = mix(side, top, vElev);
  if (t.a < 0.5) discard;
  // lit leaf mass yellows, shaded parts cool off: matches the 3D crowns' wrap lighting
  diffuseColor.rgb *= t.r * 1.02 * mix(vec3(0.72, 0.82, 0.9), vec3(1.12, 1.04, 0.82), smoothstep(0.35, 1.05, t.r));
}
`;function Ly(s,t){const e=new ce({color:16777215,roughness:.88});return e.onBeforeCompile=n=>{n.uniforms.uTime=s,n.uniforms.uWind=t,n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
${Kd}`).replace("#include <beginnormal_vertex>",yy).replace("#include <begin_vertex>",_y).replace("#include <shadowmap_vertex>",Sh),n.fragmentShader=Eh(n.fragmentShader).replace("#include <common>",`#include <common>
${My}`).replace("#include <color_fragment>",by).replace("#include <normal_fragment_begin>",Sy).replace("#include <emissivemap_fragment>",Ey)},e.customProgramCacheKey=()=>"veg-crown-v7",e}function Dy(s,t,e){const n=new ce({map:s,alphaTest:.5,alphaToCoverage:!0,side:nn,roughness:.75,color:16777215});return n.onBeforeCompile=i=>{i.uniforms.uTime=t,i.uniforms.uWind=e,i.vertexShader=i.vertexShader.replace("#include <common>",`#include <common>
${Kd}`).replace("#include <beginnormal_vertex>",Ay).replace("#include <begin_vertex>",Ty).replace("#include <shadowmap_vertex>",Sh),i.fragmentShader=Eh(i.fragmentShader).replace("#include <common>",`#include <common>
varying float vPart; varying vec3 vWP;`)},n.customProgramCacheKey=()=>"veg-palm-v6",n}function Iy(s){const t=new Td({depthPacking:ad,alphaTest:.5,side:nn});return t.onBeforeCompile=e=>{e.uniforms.uAtlas={value:s},e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
${Jd}`).replace("#include <project_vertex>",Qd),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
${tf}`).replace("#include <map_fragment>",Ry)},t.customProgramCacheKey=()=>"veg-card-depth-v3",t}function zy(s){const t=new ce({color:16777215,roughness:.9,alphaTest:.5,alphaToCoverage:!0,side:nn});return t.onBeforeCompile=e=>{e.uniforms.uAtlas={value:s},e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
${Jd}`).replace("#include <project_vertex>",Qd).replace("#include <shadowmap_vertex>",Sh),e.fragmentShader=Eh(e.fragmentShader).replace("#include <common>",`#include <common>
${tf}`).replace("#include <color_fragment>",Py)},t.customProgramCacheKey=()=>"veg-card-v7",t}const Ny=262144,Uy=32768,wa=[{name:"aVar",itemSize:4}],Eu=900,Fy=150,Au=32768,ky=8,Oy=new Array(ti).fill(0),By=420,Hy=200,Gy=6e4,ef=1500,Jl=new C,Tu=new C,Cu=new C,Ru=new C,Pu=new C;function Vy(s,t,e,n){const i=s.planes[0],o=s.planes[2],r=s.planes[3];Jl.crossVectors(o.normal,r.normal);const a=i.normal.dot(Jl);return Math.abs(a)<1e-9?t.set(e,0,n):(Tu.crossVectors(r.normal,i.normal),Cu.crossVectors(i.normal,o.normal),t.set(0,0,0).addScaledVector(Jl,-i.constant).addScaledVector(Tu,-o.constant).addScaledVector(Cu,-r.constant).divideScalar(a))}const Wy={0:["#6d7639","#70763e","#627137","#777941","#6e7239","#4a6832","#536a3a","#3d5c2e","#586e37","#4f602d","#344c29","#35502a","#304426","#3d562f","#364f39"],1:["#335528","#3c5c2d","#436832","#2e4c25","#4f6c37","#254021"],2:["#365126","#415a2b","#2f4821","#4a6134","#3a522a","#273c1f"],3:["#61753e","#6e7c44","#536835","#79793f","#817b42","#6c7534"],4:["#5d7534","#526c2d","#697e3a","#486228","#73823f","#5e7435"],5:["#8f7d4b","#9a7f52","#877b4b","#7d7541","#9e8359"]};class Rr{group=new Ye;materials=[];uTime={value:0};uWind={value:.5};counts={palms:0,trees:0,mangroves:0,shrubs:0};tiles=[];shadowDistance=1800;viewDistance=9e3;cameraCards;mirrorCards;cameraBatch;mirrorBatch;nearBatch;hiBatch;constructor(t,e){const n=new $e("vegetation"),i=my(n.fork("fronds")),o=gy(n.fork("atlas")),r=Ly(this.uTime,this.uWind),a=Dy(i,this.uTime,this.uWind),l=zy(o),h=Iy(o);this.materials.push(r,a,l);const c=Su(),d=Su(!0),u=xy(),v=wy();this.cameraBatch=new yi(Ny,v,l,wa,!0,h),this.cameraCards=this.cameraBatch.mesh,this.cameraCards.layers.set(Or),this.cameraCards.name="cards",this.mirrorBatch=new yi(Uy,v,l,wa,!0,h),this.mirrorCards=this.mirrorBatch.mesh,this.mirrorCards.layers.set(ji),this.mirrorCards.name="cards-mirror",this.group.add(this.cameraCards,this.mirrorCards),this.nearBatch=new yi(Au,c,r,wa,!0),this.nearBatch.mesh.name="crowns-near",this.hiBatch=new yi(Au,d,r,wa,!0),this.hiBatch.mesh.name="crowns-hi",this.group.add(this.nearBatch.mesh,this.hiBatch.mesh);const p=[],g={0:[],1:[],2:[],3:[],4:[],5:[]};for(const P of[0,1,2,3,4,5])g[P]=Wy[P].map(H=>new Ht(H));const f=(P,H,G,N,Y,V,Q=0)=>{const W=V.pick(g[P]).clone();W.offsetHSL(V.range(-.035,.035),V.range(-.1,.08),V.range(-.09,.08));const q=.3*W.r+.59*W.g+.11*W.b;W.lerp(new Ht(q,q,q),.42).multiplyScalar(.9);const X=P===2?V.range(.5,.7):P===3?V.range(.6,.85):P===5?V.range(.32,.45):P===1?V.range(.95,1.25):V.range(.7,1),it=P===2?V.range(.15,.3):P===3||P===5?.02:P===1?V.range(.6,.95):V.range(.3,.55),at=V.next();p.push({x:H,y:N,z:G,s:Y,rot:V.range(0,Math.PI*2),lean:P===4?(at-.5)*.16+Q:0,tint:W,arche:P,seed:at,squash:X,trunk:it})},m=(P,H,G,N,Y=5.5,V=11)=>f(4,P,H,G-.15,N.range(Y,V),N,N.range(-.14,.14)),y=t.n,w=t.zone,x=t.veg,b=t.height;for(let P=0;P<y;P++)for(let H=0;H<y;H++){const G=P*y+H,N=w[G];if(N===ne.OCEAN||N===ne.BAY||N===ne.SANDBAR||N===ne.ROCK||N===ne.LOT||N===ne.CONSTRUCTION||N===ne.STADIUM||N===ne.ROAD||N===ne.MARINA||b[G]<.12)continue;const Y=x[G]/255,V=-pn+(H+.5)*Os,Q=-pn+(P+.5)*Os,W=Vt(V/150,Q/150),q=Vt(V/420+9,Q/420-3);let X=0,it=1;switch(N){case ne.MANGROVE:X=.95,it=3;break;case ne.BEACH:X=.6,it=2;break;case ne.PARK:X=.06+.94*St(.35,.95,Y)+.08*W,it=Y>.6?3:Y>.3?2:1;break;case ne.RES_LOW:X=.05+.75*St(.25,.95,Y)+.05*W,it=Y>.7?3:Y>.42?2:1;break;case ne.GOLF:X=.03+.22*St(.1,.6,W);break;case ne.WETLAND_FLAT:X=.85*St(.55,.9,Y),it=2;break;case ne.HOTEL:case ne.RES_MID:X=.05;break;case ne.DOWNTOWN:X=.02;break;case ne.AIRPORT:X=.012;break;case ne.INDUSTRIAL:X=.006;break;default:X=0}if(!(X<=0))for(let at=0;at<it;at++){if(Gl(H,P,7+at*3)>=X)continue;const Z=V+(Gl(H,P,8+at*3)-.5)*Os*1.1,ot=Q+(Gl(H,P,9+at*3)-.5)*Os*1.1,j=t.heightAt(Z,ot);if(j<.12)continue;const et=new $e(G*4+at),D=et.next(),J=t.coastAt(Z,ot),K=J>-110;if(N===ne.MANGROVE){if(e(Z,ot))continue;f(2,Z,ot,j-.2,et.range(2.4,4.4),et)}else if(N===ne.BEACH){if(e(Z,ot))continue;const rt=St(.65,1.15,j),dt=.5+.5*Vt(Z/75+3.3,ot/75-6.1),xt=.5+.5*Vt(Z/28+8.8,ot/28+1.2),pt=rt*(.1+.6*St(.35,.75,dt));D<pt?m(Z,ot,j,et):j>.6&&xt>.6&&et.chance(.75)?f(3,Z,ot,j-.15,et.range(1.2,2.8),et):j>.45&&j<1.35&&t.exposureAt(Z,ot)>.45&&et.chance(.22*St(.42,.6,.5+.5*Vt(Z/40-2.2,ot/40+9.4)))&&f(5,Z,ot,j-.1,et.range(1.6,3),et)}else if(N===ne.WETLAND_FLAT){if(j<.25||e(Z,ot))continue;f(D<.35?1:0,Z,ot,j-.3,D<.35?et.range(7,10):et.range(4,6.5),et)}else{if(e(Z,ot))continue;const rt=Y>.7;if(N===ne.PARK||N===ne.RES_LOW||N===ne.GOLF){const dt=J>-45?.55:K?.3:0,xt=N===ne.GOLF?.4:N===ne.RES_LOW?Math.max(rt?.14:.35,dt):Math.max(dt,.08),pt=rt?.1+.16*St(.1,.5,q):.05,z=rt?.08:.06;D<xt?m(Z,ot,j,et,6,11):D<xt+pt?f(1,Z,ot,j-.3,et.range(7.5,11),et):D<xt+pt+z?f(3,Z,ot,j-.1,et.range(1.3,2.8),et):f(0,Z,ot,j-.3,rt?et.range(4.2,7.5):et.range(3.8,6.5),et)}else N===ne.INDUSTRIAL?f(D<.5?3:0,Z,ot,j-.2,D<.5?et.range(1.3,2.4):et.range(3.5,5.5),et):N===ne.AIRPORT?f(0,Z,ot,j-.3,et.range(3.2,5),et):f(4,Z,ot,j-.15,et.range(6,10),et)}}}const M=new $e("road-palms"),A=[];for(const P of t.roads)(P.cls==="highway"||P.cls==="arterial"||P.cls==="causeway"||P.cls==="street")&&A.push({pts:P.pts,width:P.width,spacing:P.cls==="street"?24:19});for(const P of t.districts)P.track&&A.push({pts:P.track,width:7,spacing:22});for(const P of A){let H=0;for(let G=0;G<P.pts.length-1;G++){const[N,Y]=P.pts[G],[V,Q]=P.pts[G+1],W=Math.hypot(V-N,Q-Y);if(W<1)continue;const q=(V-N)/W,X=(Q-Y)/W;for(let it=14;it<W-8;it+=P.spacing*M.range(.75,1.3),H++){const at=H&1?1:-1,ft=P.width*.5+M.range(4.5,8),Z=N+q*it-X*ft*at,ot=Y+X*it+q*ft*at,j=t.heightAt(Z,ot);if(j<.9)continue;const et=t.zoneAt(Z,ot);et===ne.INDUSTRIAL||et===ne.AIRPORT||et===ne.WETLAND_FLAT||et===ne.LOT||M.chance(.18)||e(Z,ot)||m(Z,ot,j,M,6.5,11)}}}const S=new $e("marina-palms");for(const P of t.marinas){const H=Math.sin(P.rot),G=-Math.cos(P.rot),N=-G,Y=H;let V=0;if(t.heightAt(P.x,P.z)<0){for(let it=0;it>=-200;it-=2)if(t.heightAt(P.x+H*it,P.z+G*it)>=0){V=it;break}}else for(let it=0;it<=200;it+=2)if(t.heightAt(P.x+H*it,P.z+G*it)<0){V=it;break}const Q=P.x+H*V,W=P.z+G*V,q=P.piers*14+30,X=Math.round(q*.28);for(let it=0;it<X;it++){const at=S.range(-q,q),ft=S.range(10,44),Z=Q+N*at-H*ft,ot=W+Y*at-G*ft,j=t.heightAt(Z,ot);if(j<.9||e(Z,ot))continue;const et=t.zoneAt(Z,ot);et===ne.ROAD||et===ne.INDUSTRIAL||et===ne.LOT||et===ne.DOWNTOWN||et===ne.RES_MID||m(Z,ot,j,S,6,10.5)}}for(const P of p)P.arche===4?this.counts.palms++:P.arche===2?this.counts.mangroves++:P.arche===3||P.arche===5?this.counts.shrubs++:this.counts.trees++;const _=new Map;for(const P of p){const H=Math.floor(P.x/Eu),G=Math.floor(P.z/Eu),N=`${H}|${G}`;let Y=_.get(N);Y||(Y={crown:[],palm:[],tx:H,tz:G},_.set(N,Y)),(P.arche===4?Y.palm:Y.crown).push(P)}const E=new $e("veg-shuffle"),T=new jt,F=new Xe,k=new C,I=new C,O=new Be(0,0,0,"YXZ"),U=(P,H,G,N)=>{for(let J=P.length-1;J>0;J--){const K=E.int(0,J),rt=P[J];P[J]=P[K],P[K]=rt}const Y=P.length,V=new oe;for(const J of["position","normal","uv","aPart"])V.setAttribute(J,H.getAttribute(J));V.boundingSphere=H.boundingSphere;let Q=null;if(N){Q=new oe;for(const J of["position","normal","uv","aPart"])Q.setAttribute(J,N.getAttribute(J));Q.boundingSphere=N.boundingSphere}const W=new oe;for(const J of["position","normal","uv"])W.setAttribute(J,v.getAttribute(J));W.boundingSphere=v.boundingSphere;const q=new Float32Array(Y*4),X=new Float32Array(Y*4),it=new $i(V,G,Y),at=new Ue;P.forEach((J,K)=>{k.set(J.x,J.y,J.z),O.set(J.lean,J.rot,0),F.setFromEuler(O),I.set(J.s,J.s,J.s),it.setMatrixAt(K,T.compose(k,F,I)),it.setColorAt(K,J.tint),q[K*4]=J.arche,q[K*4+1]=J.seed,q[K*4+2]=J.arche===4?.35:J.squash,q[K*4+3]=J.trunk,J.arche===4?(X[K*4]=1,X[K*4+2]=2.45,X[K*4+3]=1):(X[K*4]=0,X[K*4+2]=3.1*J.squash+.3,X[K*4+3]=J.trunk+.9*J.squash),X[K*4+1]=J.seed,at.expandByPoint(k)});const ft=new _i(q,4);V.setAttribute("aVar",ft),W.setAttribute("aVar",new _i(X,4)),it.instanceMatrix.needsUpdate=!0,it.receiveShadow=!0,it.castShadow=!1,it.matrixAutoUpdate=!1;let Z=null;Q&&(Q.setAttribute("aVar",ft),Z=new $i(Q,G,Y),Z.instanceMatrix=it.instanceMatrix,Z.instanceColor=it.instanceColor,Z.receiveShadow=!0,Z.castShadow=!1,Z.matrixAutoUpdate=!1,Z.visible=!1);const ot=new $i(W,l,Y);ot.instanceMatrix=it.instanceMatrix,ot.instanceColor=it.instanceColor,ot.receiveShadow=!0,ot.castShadow=!1,ot.customDepthMaterial=h,ot.matrixAutoUpdate=!1;const j=P.reduce((J,K)=>Math.max(J,K.s),0),et=at.getBoundingSphere(new Le);et.radius+=j*2.6,at.min.x-=j*2.6,at.max.x+=j*2.6,at.min.z-=j*2.6,at.max.z+=j*2.6,at.min.y-=1,at.max.y+=j*3.7;const D=at.getBoundingSphere(new Le);it.boundingSphere=D,ot.boundingSphere=D.clone(),ot.visible=!1,this.group.add(it,ot),Z&&(Z.boundingSphere=D.clone(),this.group.add(Z)),this.tiles.push({near:it,hi:Z,far:ot,box:at,center:D.center,r:D.radius,height:at.max.y-at.min.y,lodCenter:et.center,lodR:et.radius,n:Y,d:0,matrices:it.instanceMatrix.array,colors:it.instanceColor.array,extras:[X],cells:null,nearBatch:null,cardCells:!1,mirrorCells:!1,maxS:j})};for(const P of _.values())P.crown.length&&U(P.crown,c,r,d),P.palm.length&&U(P.palm,u,a,null)}update(t,e){this.uTime.value=t,this.uWind.value=e}static cells(t){const e=t.maxS*2.6,n=t.maxS*3.7,i=t.matrices,o=(l,h)=>{const c=i[l*16+12],d=i[l*16+13],u=i[l*16+14];h.expandByPoint(Pu.set(c-e,d-1,u-e)),h.expandByPoint(Pu.set(c+e,d+n,u+e))},r=t.near.geometry.getAttribute("aVar").array,a=yh({matrices:i,colors:t.colors,extras:[r]},t.n,Fy,o);return{near:a,cards:a.map(l=>({...l,extras:t.extras}))}}updateLod(t,e,n,i){const o=this.tiles,r=Vy(n.viewFrustum,Ru,t,e).y,a=i??Ru;for(const c of o)c.d=Math.max(0,Math.sqrt((c.lodCenter.x-t)**2+(c.lodCenter.z-e)**2+(c.lodCenter.y-r)**2)-c.lodR);for(let c=1;c<o.length;c++){const d=o[c];let u=c-1;for(;u>=0&&o[u].d>d.d;)o[u+1]=o[u],u--;o[u+1]=d}let l=Gy;const h=Oy;h.fill(0);for(const c of o){const d=c.d<By&&l>=c.n;d&&(l-=c.n);const u=n.boxInView(c.box);let v=c.d<this.shadowDistance?n.casterCascades(c.center,c.r,c.height):0;for(let S=0;v>>S&&S<ti;S++)!(v&1<<S)||Bd(S)||(h[S]>=ky?v&=~(1<<S):h[S]++);const p=c.hi!==null&&c.d<Hy,g=d&&u;let f=!1;if(c.hi!==null&&(g||c.nearBatch!==null)){const S=g?p?this.hiBatch:this.nearBatch:null,_=(c.cells??=Rr.cells(c)).near;if(c.nearBatch!==null&&c.nearBatch!==S){for(const E of _)c.nearBatch.set(E,0);c.nearBatch=null}if(S!==null){f=!0;for(const E of _)S.set(E,n.boxInView(E.box)?E.count:0)||(f=!1);if(f)c.nearBatch=S;else{for(const E of _)S.set(E,0);c.nearBatch=null}}}c.near.visible=g&&!p&&!f,c.hi&&(c.hi.visible=g&&p&&!f);const m=!d&&u&&c.d<this.viewDistance,y=d||c.d<3e3?1:c.d<5500?.5:.25,w=Math.max(1,Math.round(c.n*y));let x;if(m&&y===1){const S=(c.cells??=Rr.cells(c)).cards;this.cameraBatch.set(c,0),x=!0;for(const _ of S)this.cameraBatch.set(_,n.boxInView(_.box)?_.count:0)||(x=!1);if(!x)for(const _ of S)this.cameraBatch.set(_,0);c.cardCells=x}else{if(c.cardCells){for(const S of c.cells.cards)this.cameraBatch.set(S,0);c.cardCells=!1}x=this.cameraBatch.set(c,m?w:0)}let b=$s("all",m&&!x,v);const M=Hr(b),A=m&&Math.max(0,c.center.distanceTo(a)-c.r)<=ef;if(A&&y===1){const S=(c.cells??=Rr.cells(c)).cards;this.mirrorBatch.set(c,0);let _=!0;for(const E of S)this.mirrorBatch.set(E,n.boxInMirror(E.box)?E.count:0)||(_=!1);if(!_){for(const E of S)this.mirrorBatch.set(E,0);b|=1<<ji}c.mirrorCells=_}else{if(c.mirrorCells){for(const S of c.cells.cards)this.mirrorBatch.set(S,0);c.mirrorCells=!1}this.mirrorBatch.set(c,A?w:0)||(b|=1<<ji)}c.far.visible=b!==0,c.far.castShadow=M,c.far.layers.mask=b,c.far.count=w}this.cameraBatch.commit(),this.mirrorBatch.commit(),this.nearBatch.commit(),this.hiBatch.commit()}}function Lu(s,t,e){return s+t+e-Math.max(s,t,e)-Math.min(s,t,e)}const Xy=250,qy=2500,Yy=1,$y=350,jy=2500,Jc=2.5,Zy=new Array(ti).fill(0),Ky=2;function Du(s){const t=s.filter(n=>n.size>=Jc);if(!t.length)return null;const e=new Float32Array(t.length*16);return t.forEach((n,i)=>e.set(n.m.elements,i*16)),{matrices:e,colors:null,extras:[],count:t.length}}class Jy{constructor(t,e,n,i){this.map=t,this.markOccupied=i,this.mats={concrete:new ce({color:12170926,roughness:.9}),dark:new ce({color:3816768,roughness:.8}),white:new ce({color:15921902,roughness:.6}),steel:new ce({color:10134701,roughness:.45,metalness:.7}),red:new ce({color:13123630,roughness:.6}),blue:new ce({color:3103400,roughness:.6}),green:new ce({color:3046735,roughness:.6}),orange:new ce({color:14252074,roughness:.6}),wood:new ce({color:9136968,roughness:.9}),tank:new ce({color:14474452,roughness:.5,metalness:.3}),glass:new ce({color:10470614,roughness:.15,metalness:.8}),grass:new ce({color:4164142,roughness:.95}),yellow:new ce({color:14725690,roughness:.6}),lampHead:new ce({color:16777215})},this.material=Yd("props-v4",!0,16767392),this.materials.push(this.material);const o=new $e("props");this.buildMarinas(o.fork("marinas")),this.buildPrivateDocks(o.fork("docks")),this.buildFishingPiers(o.fork("piers")),this.buildChannelMarkers(o.fork("markers")),this.buildLifeguardTowers(o.fork("lifeguards")),this.buildClubhouse(o.fork("clubhouse")),this.buildPort(o),this.buildAirport(o),this.buildStadium(),this.buildLighthouse(),this.buildConstruction(o),this.buildLamps(e,n),this.buildSeawalls(),this.flush()}group=new Ye;material;materials=[];lampPositions=[];mooredBoatPositions=[];m=new jt;q=new Xe;p=new C;s=new C;boxes=[];cyls=[];lamps=[];chunks=[];allBatches=[];proxyBatches=[];cameraMeshes=new Set;mirrorMeshes=new Set;mats;counts={boxes:0,cylinders:0,lamps:0,chunks:0,meshes:0};shoreDistance(t,e,n,i,o=400){const r=a=>this.map.heightAt(t+n*a,e+i*a)<.15;if(!r(0)){for(let a=1;a<=o;a+=1)if(r(a))return a-.5;return o}for(let a=1;a<=o;a+=1)if(!r(-a))return-(a-.5);return-o}piling(t,e,n,i=.18,o="wood"){const r=Math.min(this.map.heightAt(t,e),.2);this.cyl(o,t,r-.3,e,i,n-r+.3)}moor(t,e,n,i){this.map.heightAt(t,e)<-.6&&this.mooredBoatPositions.push({x:t,z:e,rot:n,len:i})}box(t,e,n,i,o,r,a,l=0,h=0){this.p.set(e,n+r/2,i),this.q.setFromEuler(new Be(h,l,0)),this.s.set(o,r,a),this.boxes.push({m:this.m.compose(this.p,this.q,this.s).clone(),mat:t,size:Lu(o,r,a)})}cyl(t,e,n,i,o,r,a=0,l=0){this.p.set(e,n+r/2,i),this.q.setFromEuler(new Be(l,a,0)),this.s.set(o*2,r,o*2),this.cyls.push({m:this.m.compose(this.p,this.q,this.s).clone(),mat:t,size:Lu(o*2,r,o*2)})}lamp(t,e,n){this.lamps.push({m:new jt().makeTranslation(t,e,n),mat:"steel",size:.24})}lampGeometry(t){const e=new be(.12,.12,9,t).translate(0,4.5,0),n=new kt(.2,.2,2.4).translate(0,9.1,0),i=new hi(.22,6,4).translate(0,9.05,0),o=Kw([{geometry:e,material:this.mats.steel},{geometry:n,material:this.mats.steel},{geometry:i,material:this.mats.lampHead,emissive:!0}]);return e.dispose(),n.dispose(),i.dispose(),o}flush(){const t=Kl(new kt(1,1,1)),e=Kl(new be(.5,.5,1,14)),n=Kl(new be(.5,.5,1,6)),i=this.lampGeometry(14),o=this.lampGeometry(6);for(const S of[t,e,n,i,o])S.computeBoundingSphere();const r=this.boxes.length,a=this.cyls.length,l=this.lamps.length,h=[{name:"aMatParams",itemSize:2}],c=(S,_,E,T)=>{const F=new yi(_,S,this.material,E,!0);F.mesh.layers.set(Or),F.mesh.name=`props-${T}`;const k=new yi(_,S,this.material,E,!0);return k.mesh.layers.set(ji),k.mesh.name=`props-${T}-mirror`,this.cameraMeshes.add(F.mesh),this.mirrorMeshes.add(k.mesh),this.group.add(F.mesh,k.mesh),{camera:F,mirror:k}},d=c(t,r,h,"boxes"),u=c(e,a,h,"cylinders"),v=c(n,a,h,"cylinders-lo"),p=c(i,l,[],"lamps"),g=c(o,l,[],"lamps-lo");this.allBatches.push(d,u,v,p,g);const f=new Map,m=S=>{this.p.setFromMatrixPosition(S.m);const _=za(this.p.x,this.p.z,qy);let E=f.get(_);return E||(E={boxes:[],cylLarge:[],cylSmall:[],lamps:[]},f.set(_,E)),E},y=S=>S.size>Yy;for(const S of this.boxes)m(S).boxes.push(S);for(const S of this.cyls)(y(S)?m(S).cylLarge:m(S).cylSmall).push(S);for(const S of this.lamps)m(S).lamps.push(S);this.counts.boxes=this.boxes.length,this.counts.cylinders=this.cyls.length,this.counts.lamps=this.lamps.length;const w=new Le,x=new C,b=new Ht(16777215);for(const S of f.values()){const _={meshes:[],box:new Ue,center:new C,r:0,height:0,bits:0,proxies:[Du(S.boxes),Du([...S.cylLarge,...S.cylSmall])]};S.boxes.sort((T,F)=>Number(y(F))-Number(y(T)));const E=(T,F,k,I,O)=>{if(!T.length)return;const U=F.clone(),P=I?null:new _i(new Float32Array(T.length*2),2);P&&U.setAttribute("aMatParams",P);const H=new $i(U,this.material,T.length),G=new Ue;let N=0;T.forEach((Q,W)=>{H.setMatrixAt(W,Q.m);const q=this.mats[Q.mat];H.setColorAt(W,I?b:q.color),P?.setXY(W,q.roughness,q.metalness),y(Q)&&N++,w.copy(F.boundingSphere).applyMatrix4(Q.m),G.expandByPoint(x.copy(w.center).addScalar(-w.radius)),G.expandByPoint(x.copy(w.center).addScalar(w.radius))}),H.boundingSphere=G.getBoundingSphere(new Le),H.castShadow=!0,H.receiveShadow=!0;let Y=null;k&&(Y=k.clone(),P&&Y.setAttribute("aMatParams",P));const V={mesh:H,large:N,total:T.length,mainCount:T.length,hi:U,lo:Y,batches:O,cellsLarge:null,cellsAll:null,inCamera:null,cameraCells:null,inMirror:null,mirrorCells:null,matrices:H.instanceMatrix.array,colors:H.instanceColor.array,extras:P?[P.array]:[]};H.onBeforeShadow=()=>{H.count=H2()?V.total:V.large},H.onAfterShadow=()=>{H.count=V.mainCount},_.box.union(G),_.meshes.push(V),this.group.add(H)};E(S.boxes,t,null,!1,[d,null]),E(S.cylLarge,e,null,!1,[u,null]),E(S.cylSmall,e,n,!1,[u,v]),E(S.lamps,i,o,!0,[p,g]),_.box.getBoundingSphere(w),_.center.copy(w.center),_.r=w.radius,_.height=_.box.max.y-_.box.min.y,this.chunks.push(_),this.counts.meshes+=_.meshes.length}this.counts.chunks=this.chunks.length;const M=this.boxes.filter(S=>S.size>=Jc).length,A=this.cyls.filter(S=>S.size>=Jc).length;for(let S=0;S<ti;S++){const _=[new yi(Math.max(1,M),t,this.material,[],!1),new yi(Math.max(1,A),n,this.material,[],!1)];_[0].mesh.name=`shadow-proxy-boxes-${S}`,_[1].mesh.name=`shadow-proxy-cylinders-${S}`;for(const E of _)E.mesh.castShadow=!0,E.mesh.receiveShadow=!1,E.mesh.layers.set(Br+S),this.group.add(E.mesh);this.proxyBatches.push({shapes:_,active:!1})}this.boxes.length=0,this.cyls.length=0,this.lamps.length=0}cellsOf(t,e){return e===t.total?t.cellsAll??=this.splitMesh(t,e):t.cellsLarge??=this.splitMesh(t,e)}splitMesh(t,e){const n=t.hi.boundingSphere,i=new Le,o=new C;return yh(t,e,Xy,(r,a)=>{this.m.fromArray(t.matrices,r*16),i.copy(n).applyMatrix4(this.m),a.expandByPoint(o.copy(i.center).addScalar(-i.radius)),a.expandByPoint(o.copy(i.center).addScalar(i.radius))})}place(t,e,n,i,o){const r=i==="inCamera"?"cameraCells":"mirrorCells",a=t[i],l=t[r];if(a&&(a!==n||l!==e)){for(const c of l)a.set(c,0);t[i]=null,t[r]=null}if(e===null)return!0;let h=!0;for(const c of e)n.set(c,o(c.box)?c.count:0)||(h=!1);if(!h){for(const c of e)n.set(c,0);return t[i]=null,t[r]=null,!1}return t[i]=n,t[r]=e,!0}setNight(t){this.material.emissiveIntensity=8*t}updateLod(t,e,n,i,o){const r=Zy;r.fill(0);for(const c of this.chunks){c.bits=n.casterCascades(c.center,c.r,c.height);let d=0;for(const u of c.meshes)u.large>0&&d++;for(let u=0;u<ti;u++)c.bits&1<<u&&(r[u]+=d)}let a=0;for(let c=0;c<ti;c++)r[c]>Ky&&!Bd(c)&&(a|=1<<c);const l=c=>n.boxInView(c),h=c=>n.boxInMirror(c);for(const c of this.chunks){const d=Math.max(0,Math.hypot(c.center.x-t,c.center.z-e)-c.r),u=n.boxInView(c.box),v=c.bits&~a,p=d>jy;for(const g of c.meshes){const f=p?g.large:g.total;g.mainCount=f,g.mesh.count=f;const m=u&&f>0,y=g.lo!==null&&d>$y;g.lo&&(g.mesh.geometry=y?g.lo:g.hi);const w=g.batches[y?1:0]??g.batches[0],x=m?this.cellsOf(g,f):null,b=this.place(g,x,w.camera,"inCamera",l);let M=$s(g.large>0?"all":"near",m&&!b,v);const A=Hr(M),S=g.mesh.boundingSphere,_=m&&Math.max(0,S.center.distanceTo(i)-S.radius)<=o;this.place(g,_?x:null,w.mirror,"inMirror",h)||(M|=1<<ji),g.mesh.visible=M!==0,g.mesh.castShadow=A,g.mesh.layers.mask=M}}for(const c of this.allBatches)c.camera.commit(),c.mirror.commit();for(let c=0;c<ti;c++){const d=(a&1<<c)!==0,u=this.proxyBatches[c];if(!(!d&&!u.active)){for(const v of this.chunks){const p=d&&(v.bits&1<<c)!==0;for(let g=0;g<2;g++){const f=v.proxies[g];f&&u.shapes[g].set(f,p?f.count:0)}}for(const v of u.shapes)v.commit();u.active=d}}}buildMarinas(t){for(const e of this.map.marinas){const n=t.fork(e.id),i=Math.sin(e.rot),o=-Math.cos(e.rot),r=-o,a=i,l=this.shoreDistance(e.x,e.z,i,o),h=e.x+i*l,c=e.z+o*l,d=e.piers*n.range(24,30)+24,u=.95,v=-e.rot,p=(M,A,S,_,E,T,F)=>this.box(M,A,S,_,E,T,F,v);p("concrete",h-i*.4,.3,c-o*.4,d,.9,1.2),p("wood",h-i*3.2,u-.3,c-o*3.2,d,.3,5.5);for(let M=-d/2+2;M<d/2;M+=n.range(5,8))this.piling(h+r*M+i*.4,c+a*M+o*.4,u+.55,.2);let g=-d/2+n.range(8,16);for(;g<d/2-8;){const M=h+r*g,A=c+a*g;let S=e.pierLen*n.range(.6,1.2);for(;S>30&&this.map.heightAt(M+i*S,A+o*S)>-1.2;)S-=6;if(S<=30){g+=n.range(22,34);continue}const _=M+i*S/2,E=A+o*S/2,T=n.chance(.3);p("wood",_,u-.3,E,T?3.2:2.2,.3,S);for(let k=n.range(2,6);k<S;k+=n.range(8,12))for(const I of[-1,1])this.piling(M+i*k+r*I*(T?1.7:1.3),A+o*k+a*I*(T?1.7:1.3),u+n.range(.4,.9),n.range(.15,.2));const F=n.range(10,14);for(let k=n.range(6,12);k<S-8;k+=F)for(const I of[-1,1]){if(n.chance(.18))continue;const O=n.range(6,9.5),U=M+i*k+r*I*(O/2+1),P=A+o*k+a*I*(O/2+1);if(p("wood",U,u-.4,P,O,.25,.9),this.piling(M+i*k+r*I*(O+.6),A+o*k+a*I*(O+.6),u+.4,.14),n.chance(.62)){const H=n.range(6.5,12.5),G=M+i*(k+F*.5)+r*I*(H*.45+1.2),N=A+o*(k+F*.5)+a*I*(H*.45+1.2);this.moor(G,N,e.rot+Math.PI/2,H)}}if(n.chance(.55)){const k=n.range(16,26),I=M+i*(S-1.2),O=A+o*(S-1.2);p("wood",I,u-.3,O,k,.3,2.4);for(const U of[-1,1])this.piling(I+r*U*k*.5,O+a*U*k*.5,u+.7,.2);for(const U of[-1,1])n.chance(.7)&&this.moor(I+i*4.5+r*U*k*.25,O+o*4.5+a*U*k*.25,e.rot+Math.PI/2,n.range(13,19))}g+=n.range(22,36)}const f=(n.chance(.5)?-1:1)*(d/2-6),m=h+r*f+i*7,y=c+a*f+o*7;p("wood",m,u-.3,y,9,.3,14);for(const M of[-1,1])this.piling(m+r*M*4+i*6,y+a*M*4+o*6,u+.6,.2);for(const M of[-1,1])this.cyl("steel",m+r*M*3,u,y+a*M*3,.16,4.4);p("white",m,u+4.4,y,10,.5,8),p("red",m,u,y,.9,1.3,.9),this.moor(m+i*12,y+o*12,e.rot+Math.PI/2,n.range(8,12));const w=h-i*22+r*n.range(-8,8),x=c-o*22+a*n.range(-8,8),b=this.map.heightAt(w,x);if(p("white",w,b,x,18,5.5,11),p("dark",w,b+5.5,x,19.5,.5,12.5),this.cyl("white",w+r*6,b+6,x+a*6,.9,5.5),this.markOccupied(w,x,22),n.chance(.7)){const M=h-i*26+r*(d/2-30)*(f>0?-1:1),A=c-o*26+a*(d/2-30)*(f>0?-1:1),S=this.map.heightAt(M,A);if(S>.9){p("steel",M,S+8.6,A,30,.4,10);for(const E of[-1,1])for(const T of[-1,1])this.cyl("steel",M+r*E*14+i*T*4.5,S,A+a*E*14+o*T*4.5,.2,8.6);const _=n.int(4,8);for(let E=0;E<_;E++)p(n.pick(["white","white","blue","red"]),M+r*n.range(-12,12)+i*n.range(-2,2),S+n.int(0,2)*2.8+.4,A+a*n.range(-12,12)+o*n.range(-2,2),2.4,1.4,7);this.markOccupied(M,A,20)}}if(n.chance(.6)){const M=n.chance(.5)?-1:1,A=h+r*M*(d/2+6),S=c+a*M*(d/2+6),_=n.range(40,90);for(let E=0;E<_;E+=n.range(3,4.5)){const T=A+i*E+r*n.range(-1.5,1.5),F=S+o*E+a*n.range(-1.5,1.5);if(this.map.heightAt(T,F)<-3)break;this.box("dark",T,-.8+n.range(0,.5),F,n.range(2.2,3.6),n.range(1.8,2.6),n.range(2.2,3.4),n.range(0,Math.PI),n.range(-.15,.15))}}}}buildPrivateDocks(t){const e=(n,i,o,r,a)=>{const l=this.shoreDistance(n,i,o,r,120);if(l<0||l>=120)return;const h=n+o*l,c=i+r*l,d=a.range(5,9);if(this.map.heightAt(h+o*(d+2),c+r*(d+2))>-.7)return;const v=-Math.atan2(o,-r),p=.75;this.box("wood",h+o*(d/2-1.5),p-.25,c+r*(d/2-1.5),1.8,.25,d+3,v);const g=-r,f=o;for(const m of[d-.6,d*.4])for(const y of[-1,1])this.piling(h+o*m+g*y*.8,c+r*m+f*y*.8,p+a.range(.3,.7),.13);if(a.chance(.55)){const m=a.chance(.5)?-1:1,y=a.range(5.5,10);this.moor(h+o*(d*.6)+g*m*2.4,c+r*(d*.6)+f*m*2.4,v,y)}else if(a.chance(.35)){const m=a.chance(.5)?-1:1;for(const y of[d*.25,d*.8])for(const w of[1.4,4.2])this.piling(h+o*y+g*m*w,c+r*y+f*m*w,p+2.6,.12,"steel");this.box("steel",h+o*(d*.52)+g*m*2.8,p+2.6,c+r*(d*.52)+f*m*2.8,3.4,.2,d*.6,v)}};for(let n=0;n<5;n++){const i=1870-n*25,o=-3e3+n*330,r=t.fork(`finger-${n}`);for(const a of[-1,1])for(let l=-280+r.range(0,30);l<280;l+=r.range(26,44))r.chance(.25)||e(i+l,o+a*60,0,a,r)}for(const n of this.map.canals){const i=t.fork(n.id),o=Math.min(n.a[0],n.b[0]),r=Math.max(n.a[0],n.b[0]);for(let a=o+i.range(15,40);a<r-15;a+=i.range(30,55)){if(n.culverts.some(h=>Math.abs(h-a)<n.culvertHalf+12)||i.chance(.35))continue;const l=i.chance(.5)?-1:1;e(a,n.a[1]-l*(n.width*.5+14),0,l,i)}}}buildFishingPiers(t){const e=[[2700,-4650,1,0,170],[2600,-2350,1,.05,150],[1800,6700,-.2,1,130]];for(const[n,i,o,r,a]of e){const l=t.fork(`${n}-${i}`),h=Math.hypot(o,r),c=o/h,d=r/h,u=this.shoreDistance(n,i,c,d,600);if(u<0||u>=600)continue;const v=n+c*(u-22),p=i+d*(u-22),g=-Math.atan2(c,-d),f=2.6,m=a+22;this.box("wood",v+c*m/2,f-.3,p+d*m/2,3.4,.3,m,g);const y=-d,w=c;for(let A=0;A<m;A+=l.range(7,10))for(const S of[-1,1])this.piling(v+c*A+y*S*1.5,p+d*A+w*S*1.5,f+1.1,.2);for(const A of[-1,1])this.box("wood",v+c*m/2+y*A*1.6,f+.9,p+d*m/2+w*A*1.6,.1,.1,m,g);const x=v+c*(m-2.5),b=p+d*(m-2.5),M=l.range(14,20);this.box("wood",x,f-.3,b,M,.3,5,g);for(const A of[-1,1])this.piling(x+y*A*M*.5,b+w*A*M*.5,f+1.2,.22);this.box(l.pick(["white","blue","orange"]),x+y*M*.22,f,b+w*M*.22,4.5,3,4,g),this.box("dark",x+y*M*.22,f+3,b+w*M*.22,5.2,.3,4.8,g);for(const A of[-1,1])this.cyl("steel",x-y*M*.3+c*A*1.6,f,b-w*M*.3+d*A*1.6,.08,3.2);this.box("white",x-y*M*.3,f+3.2,b-w*M*.3,5,.15,4,g),this.box("white",v-c*2+y*3.5,this.map.heightAt(v-c*2+y*3.5,p-d*2+w*3.5),p-d*2+w*3.5,4,3.2,4,g),this.markOccupied(v,p,12)}}buildChannelMarkers(t){for(const e of this.map.channels){if(e.width>=250||e.depth<3.5)continue;const n=t.fork(e.id);let i=n.range(60,200);for(let o=0;o<e.pts.length-1;o++){const[r,a]=e.pts[o],[l,h]=e.pts[o+1],c=Math.hypot(l-r,h-a),d=(l-r)/c,u=(h-a)/c;let v=i;for(;v<c;v+=n.range(260,420)){const p=r+d*v,g=a+u*v,f=e.width*.5+n.range(6,14);for(const m of[-1,1]){if(n.chance(.3))continue;const y=p-u*f*m+n.range(-3,3),w=g+d*f*m+n.range(-3,3);if(this.map.heightAt(y,w)>-1.2)continue;const x=n.range(3.2,4.2);this.piling(y,w,x,.24,"wood"),this.box(m>0?"red":"green",y,x-1.1,w,1.1,1.1,.25,Math.atan2(d,-u)),n.chance(.3)&&this.box("white",y,x+.1,w,.5,.5,.5)}}i=v-c}}}buildLifeguardTowers(t){const e=[[2600,-7600,1,0,0,1],[3e3,4900,1,.2,-.2,1]],n=["white","yellow","orange","blue","red"];for(const[i,o,r,a,l,h]of e){const c=t.fork(`${i}`),d=i>2900?1600:6e3;for(let u=c.range(120,300);u<d;u+=c.range(380,620)){const v=i+l*u,p=o+h*u,g=this.shoreDistance(v,p,r,a,900);if(g<=0||g>=900)continue;let f=g-14;for(;f>0&&this.map.heightAt(v+r*f,p+a*f)<1;)f-=3;const m=v+r*f,y=p+a*f,w=this.map.heightAt(m,y);if(w<.9||w>3.2||this.map.zoneAt(m,y)!==2)continue;const x=-Math.atan2(r,-a)+c.range(-.2,.2),b=Math.cos(x),M=Math.sin(x),A=c.pick(n);for(const[S,_]of[[-1.2,-1.2],[1.2,-1.2],[1.2,1.2],[-1.2,1.2]])this.cyl("wood",m+S*b-_*M,w,y+S*M+_*b,.12,3);this.box(A,m,w+3,y,3.2,2.4,3,x),this.box("white",m,w+5.4,y,3.9,.25,3.7,x),this.box("wood",m,w+2.9,y,3.6,.15,3.4,x);for(let S=0;S<4;S++)this.box("wood",m-r*(2.2+S*1.1),w+2.9-(S+1)*.7,y-a*(2.2+S*1.1),1,.12,1.2,x);this.markOccupied(m,y,6)}}}buildClubhouse(t){const e=this.map.pois.find(w=>w.kind==="clubhouse");if(!e)return;const n=this.map.heightAt(e.x,e.z);if(n<1)return;const i=Math.cos(e.rot),o=Math.sin(e.rot),r=(w,x)=>[e.x+w*i-x*o,e.z+w*o+x*i],[a,l]=r(0,0);this.box("white",a,n,l,34,5.5,18,e.rot),this.box("dark",a,n+5.5,l,37,.6,21,e.rot),this.box("white",a,n+6.1,l,12,2.4,8,e.rot),this.box("dark",a,n+8.5,l,13.5,.4,9.5,e.rot);const[h,c]=r(0,13);this.box("wood",h,n+.4,c,34,.3,8,e.rot),this.box("white",h,n+4.6,c,35,.35,9,e.rot);for(let w=-3;w<=3;w++){const[x,b]=r(w*5.5,16.5);this.cyl("white",x,n+.7,b,.22,3.9)}const[d,u]=r(24,-4);this.box("white",d,n,u,14,4,12,e.rot),this.box("dark",d,n+4,u,15.5,.5,13.5,e.rot);const[v,p]=r(-26,-8);this.box("concrete",v,n,p,16,3.4,14,e.rot),this.box("dark",v,n+3.4,p,17,.4,15,e.rot);for(let w=0;w<5;w++){const[x,b]=r(-30+w*3.2,3+t.range(-1,1));this.box("white",x,n,b,1.3,1.1,2.4,e.rot),this.box("dark",x,n+1.6,b,1.4,.1,2.2,e.rot)}const[g,f]=r(4,32);this.box("grass",g,n+.05,f,30,.2,20,e.rot),this.cyl("white",g+4,n+.25,f-3,.04,2.2),this.box("red",g+4.3,n+2,f-3,.6,.4,.05,e.rot);const[m,y]=r(-6,-22);this.box("dark",m,n-.05,y,48,.2,18,e.rot),this.markOccupied(e.x,e.z,60)}buildPort(t){const e=zd,n=Math.cos(e.rot),i=Math.sin(e.rot),o=(M,A)=>[e.cx+M*n-A*i,e.cz+M*i+A*n],r=-.04,a=(M,A,S,_,E,T,F)=>{const[k,I]=o(A,_);this.box(M,k,S,I,E,T,F,r)},l=(M,A,S,_,E,T)=>{const[F,k]=o(A,_);this.cyl(M,F,S,k,E,T,r)},h=(M,A)=>{const[S,_]=o(M,A);return this.map.heightAt(S,_)},c=(M,A,S)=>{const[_,E]=o(M,A);this.markOccupied(_,E,S)},d=["red","blue","green","orange","steel","white","blue","red"],u=-300,v=[];for(let M=-780;M<e.hw-150;M+=t.range(185,240))v.push(M);for(const M of v){const A=u+16,S=h(M,A);if(S<1)continue;const _=18,E=40+t.range(-3,5);for(const T of[-1,1])for(const F of[-1,1])a("steel",M+T*_/2,S,A+F*6,1.6,E,1.6);a("steel",M,S+E,A-4,_+4,3,3),a("steel",M,S+E,A+4,_+4,3,3),a("orange",M,S+E+3,A-26,3.2,3,58),a("steel",M,S+E+5,A+12,3,3,18),a("white",M,S+E-14,A-12,6,4,6)}for(const[M,A,S,_]of[[-420,190,30,9],[330,130,22,7]]){const E=u-S/2-3;a("dark",M,-2.5,E,A,_+2.5,S),a(t.pick(["red","blue"]),M,_,E,A-6,1.6,S-2),a("white",M+A*.36,_+1.6,E,A*.14,12,S-6);for(let T=0;T<4;T++)a("steel",M-A*.32+T*A*.18,_+1.6,E,3,6+T%2*3,2)}const p=u+70,g=40;for(let M=-860;M<e.hw-260;M+=175)for(let A=p;A<g-40;A+=58){if(t.chance(.12))continue;const S=h(M+60,A+20);if(S<1)continue;const _=6,E=10,T=t.range(1,4);for(let F=0;F<_;F++)for(let k=0;k<E;k++){if(t.chance(.28))continue;const I=Math.min(4,Math.max(1,Math.round(T+t.range(-1.5,1.5)))),O=M+k*13.4,U=A+F*6.1;for(let P=0;P<I;P++)a(t.pick(d),O,S+P*2.6,U,12.2,2.6,4.9)}c(M+60,A+15,80),t.chance(.5)&&l("steel",M-8,S,A-6,.3,30)}let f=-810;for(;f<e.hw-520;){const M=t.range(120,170),A=t.range(40,55),S=150+t.range(-10,10),_=h(f+M/2,S);if(_>=1){a(t.pick(["concrete","white","tank"]),f+M/2,_,S,M,11+t.range(0,3),A),a("dark",f+M/2,_+11+3,S,M+2,.6,A+2);for(let E=0;E<6;E++)a("steel",f+12+E*(M-24)/5,_,S+A/2+3,4,4.2,6);c(f+M/2,S,Math.max(M,A)*.6)}f+=M+t.range(30,60)}const m=e.hh,y=260,w=h(y,m-60);a("white",y,w,m-60,260,12,40),a("glass",y,w+12,m-60,240,4,36),a("white",y,w,m-20,120,7,30),c(y,m-55,150);const x=m+19;a("dark",y,-2.5,x,290,12.5,36),a("white",y,10,x,280,28,32);for(let M=0;M<6;M++)a("glass",y,13.5+M*3.5,x,276,1.2,33);a("white",y-30,38,x,90,8,22),l("dark",y-90,38,x,4,14);const b=this.map.pois.find(M=>M.kind==="tanks");for(let M=0;M<9;M++){const A=b.x+M%3*52-52,S=b.z+Math.floor(M/3)*52-52,_=this.map.heightAt(A,S);_<1||(this.cyl("tank",A,_,S,t.range(14,22),t.range(10,16)),this.markOccupied(A,S,26))}}buildAirport(t){const e=this.map.pois.find(h=>h.kind==="terminal"),n=this.map.heightAt(e.x,e.z);this.box("white",e.x,n,e.z,260,14,60),this.box("glass",e.x,n+3,e.z+30.5,250,7,1.2),this.box("steel",e.x,n+14,e.z,270,2,66);for(let h=-1;h<=1;h++)this.box("white",e.x+h*90,n,e.z+90,30,9,120),this.box("steel",e.x+h*90,n+9,e.z+90,32,1.2,122);this.box("dark",e.x,n-.1,e.z+130,520,.4,220),this.cyl("concrete",e.x+220,n,e.z-40,4,38),this.box("glass",e.x+220,n+38,e.z-40,14,5,14,.4),this.box("white",e.x+220,n+43,e.z-40,16,1.5,16,.4);const i=this.map.pois.find(h=>h.kind==="hangars");for(let h=0;h<4;h++){const c=i.x+h*80,d=i.z,u=this.map.heightAt(c,d);this.box("concrete",c,u,d,64,12,50),this.box("steel",c,u+12,d,60,5,40),this.box("steel",c,u+17,d,40,3,30),this.markOccupied(c,d,40)}for(let h=-1;h<=1;h++)for(const c of[-1,1]){const d=e.x+h*90+c*34,u=e.z+110;this.cyl("white",d,n+2.2,u,2.6,38,0,Math.PI/2),this.box("white",d,n+2.5,u+2,34,.8,5,0),this.box("white",d,n+3,u+17,12,.6,3),this.box("white",d,n+4,u+18,.6,9,3),this.cyl("steel",d-9,n+.8,u+4,1.4,4.5,0,Math.PI/2),this.cyl("steel",d+9,n+.8,u+4,1.4,4.5,0,Math.PI/2)}this.markOccupied(e.x,e.z+60,320);const o=this.map.runways.find(h=>h.id==="strip-southkey"),r=(o.a[0]+o.b[0])/2+40,a=(o.a[1]+o.b[1])/2-60,l=this.map.heightAt(r,a);l>1&&(this.box("concrete",r,l,a,26,7,20,.55),this.box("steel",r,l+7,a,24,2.5,16,.55),this.markOccupied(r,a,20))}buildStadium(){const t=this.map.pois.find(r=>r.kind==="stadium"),e=this.map.heightAt(t.x,t.z);if(e<1)return;const n=40,i=t.size,o=t.size*.8;for(let r=0;r<n;r++){const a=r/n*Math.PI*2+t.rot,l=Math.cos(a),h=Math.sin(a),c=t.x+l*i,d=t.z+h*o,u=2*Math.PI*(i+o)/2/n+2,v=Math.atan2(l*o,-h*i);this.box("concrete",c,e,d,u,14,22,v),this.box("concrete",c+l*10,e+14,d+h*10,u,12,16,v),this.box("white",c+l*12,e+26,d+h*12,u,1.5,34,v),this.box("steel",c+l*26,e,d+h*26,1.4,30,1.4)}this.box("grass",t.x,e+.05,t.z,i*1.2,.3,o*1.15,t.rot),this.markOccupied(t.x,t.z,i+40)}buildLighthouse(){const t=this.map.pois.find(n=>n.kind==="lighthouse"),e=this.map.heightAt(t.x,t.z);e<.5||(this.cyl("white",t.x,e,t.z,4.2,28),this.cyl("red",t.x,e+10,t.z,4.25,5),this.cyl("dark",t.x,e+28,t.z,2.4,3.5),this.cyl("white",t.x,e+31.5,t.z,1.6,1.4),this.box("white",t.x+12,e,t.z+6,12,5,9,.3),this.markOccupied(t.x,t.z,20))}buildConstruction(t){for(const e of this.map.districts)if(e.id.startsWith("construction")){const n=this.map.heightAt(e.cx,e.cz);if(n<1)continue;const i=t.int(5,12),o=e.hw*1.2,r=e.hh*1.2;for(let h=1;h<=i;h++)this.box("concrete",e.cx,n+h*3.6,e.cz,o,.4,r,e.rot);for(const[h,c]of[[-.4,-.4],[.4,-.4],[.4,.4],[-.4,.4],[0,0],[0,-.4],[0,.4],[-.4,0],[.4,0]]){const d=Math.cos(e.rot),u=Math.sin(e.rot),v=e.cx+h*o*d-c*r*u,p=e.cz+h*o*u+c*r*d;this.cyl("concrete",v,n,p,.45,i*3.6+.4)}this.box("concrete",e.cx+o*.15,n,e.cz,10,i*3.6+6,8,e.rot);const a=e.cx-o*.6,l=e.cz+r*.6;this.box("yellow",a,n,l,2.2,i*3.6+30,2.2),this.box("yellow",a+20,n+i*3.6+30,l,60,1.6,1.6,.4),this.box("yellow",a-8,n+i*3.6+30,l,14,1.6,1.6,.4);for(let h=0;h<5;h++)this.box(t.pick(["blue","white","orange"]),e.cx+t.range(-o,o)*.7,n,e.cz+r*.85,6,2.6,2.4,e.rot);this.markOccupied(e.cx,e.cz,Math.max(o,r))}}buildLamps(t,e){for(const n of t){if(n.cls!=="highway"&&n.cls!=="arterial"&&n.cls!=="causeway")continue;const i=n.b[0]-n.a[0],o=n.b[1]-n.a[1],r=Math.hypot(i,o),a=i/r,l=o/r;let h=0;for(let c=20;c<r;c+=45,h++){const d=h%2===0?-1:1,u=n.a[0]+a*c+-l*(n.width/2+1)*d,v=n.a[1]+l*c+a*(n.width/2+1)*d,p=this.map.heightAt(u,v);p<.8||this.lampPositions.push(new C(u,p,v))}}for(const n of e)this.lampPositions.push(n.clone());for(const n of this.lampPositions)this.lamp(n.x,n.y,n.z)}buildSeawalls(){const t=this.map.districts.find(i=>i.id==="industrial-port"),e=Math.cos(t.rot),n=Math.sin(t.rot);for(let i=-t.hw;i<=t.hw;i+=6)for(const o of[-1,1]){const r=t.cx+i*e-o*t.hh*n,a=t.cz+i*n+o*t.hh*e;this.box("concrete",r,1.4,a,6.2,2.2,2,t.rot)}}}function go(s,t,e){const n=s/2,i=t/2,o=[[-n,-e*.55,0],[n*.55,-e*.55,0],[-n,-e*.1,-i*.95],[-n,-e*.1,i*.95],[n*.35,-e*.15,-i],[n*.35,-e*.15,i],[n,.05,0],[-n,e*.45,-i],[-n,e*.45,i],[n*.4,e*.45,-i*.95],[n*.4,e*.45,i*.95],[n,e*.55,0]],r=[[0,2,4],[0,4,1],[0,1,5],[0,5,3],[1,4,6],[1,6,5],[2,7,9],[2,9,4],[4,9,11],[4,11,6],[3,5,10],[3,10,8],[5,6,11],[5,11,10],[0,3,8],[0,8,7],[0,7,2],[7,8,10],[7,10,9],[9,10,11]],a=[];for(const h of r)for(const c of h)a.push(o[c][0],o[c][1],o[c][2]);const l=new oe;return l.setAttribute("position",new Mt(a,3)),l.computeVertexNormals(),l}class Qy{mats={white:new ce({color:16053488,roughness:.35,metalness:.05}),hullDark:new ce({color:2042424,roughness:.5}),hullRed:new ce({color:10104618,roughness:.55}),hullBlue:new ce({color:2051978,roughness:.5}),teak:new ce({color:11569754,roughness:.8}),glass:new ce({color:2241348,roughness:.1,metalness:.9}),sail:new ce({color:16316142,roughness:.9,side:nn}),steel:new ce({color:9213084,roughness:.5,metalness:.6}),containerWhite:new ce({color:16777215,roughness:.7})};get materials(){return[this.mats.white,this.mats.hullDark,this.mats.hullRed,this.mats.hullBlue,this.mats.teak,this.mats.glass,this.mats.sail,this.mats.steel,this.mats.containerWhite]}build(t,e){const n=new Ye,i=(r,a,l,h,c,d=0,u=0,v=0)=>{const p=new pe(r,a);return p.position.set(l,h,c),p.rotation.set(d,u,v),p.castShadow=!0,p.receiveShadow=!0,n.add(p),p},o=e.pick([this.mats.white,this.mats.white,this.mats.hullDark,this.mats.hullBlue,this.mats.hullRed]);switch(t){case"speed":{const r=e.range(7,10),a=r*.3;return i(go(r,a,1.4),o,0,.3,0),i(new kt(r*.25,.5,a*.8),this.mats.glass,r*.05,1.05,0,0,0,-.35),i(new kt(r*.35,.35,a*.75),this.mats.teak,-r*.2,.8,0),i(new kt(.6,.6,.8),this.mats.steel,-r*.45,.6,0),{group:n,len:r,beam:a,draft:.5,wakeWidth:a*1.4}}case"console":{const r=e.range(6,8),a=r*.32;i(go(r,a,1.3),this.mats.white,0,.3,0),i(new kt(1.2,1.4,1),this.mats.white,0,1.2,0),i(new kt(1.6,.15,1.6),this.mats.hullDark,0,2.3,0);for(const l of[-1,1])i(new be(.04,.04,1.6,6),this.mats.steel,.6*l,1.5,.7*l);return i(new kt(.5,.7,.5),this.mats.hullDark,-r*.45,.7,0),{group:n,len:r,beam:a,draft:.45,wakeWidth:a*1.3}}case"yacht":{const r=e.range(18,32),a=r*.25;return i(go(r,a,r*.16),this.mats.white,0,r*.04,0),i(new kt(r*.5,r*.09,a*.8),this.mats.white,-r*.05,r*.13,0),i(new kt(r*.48,r*.04,a*.82),this.mats.glass,-r*.05,r*.135,0),i(new kt(r*.28,r*.07,a*.6),this.mats.white,-r*.12,r*.21,0),i(new kt(r*.26,r*.03,a*.62),this.mats.glass,-r*.12,r*.215,0),i(new kt(r*.06,r*.09,a*.5),this.mats.white,-r*.2,r*.29,0,0,0,.3),i(new be(.15,.15,1.2,8),this.mats.steel,-r*.2,r*.34,0),{group:n,len:r,beam:a,draft:r*.06,wakeWidth:a*1.5}}case"sail":{const r=e.range(9,14),a=r*.31;i(go(r,a,r*.14),o,0,r*.03,0),i(new kt(r*.3,.7,a*.6),this.mats.white,-r*.05,r*.09+.3,0);const l=r*1.25;i(new be(.06,.09,l,6),this.mats.steel,r*.05,l/2+r*.08,0);const h=new oe;h.setAttribute("position",new Mt([0,0,0,0,l*.9,0,-r*.42,0,0],3)),h.computeVertexNormals(),i(h,this.mats.sail,r*.05,r*.13,0,0,0,0);const c=new oe;return c.setAttribute("position",new Mt([0,0,0,0,l*.75,0,r*.4,0,0],3)),c.computeVertexNormals(),i(c,this.mats.sail,r*.05,r*.13,.05,0,0,0),n.rotation.z=.12,{group:n,len:r,beam:a,draft:1.5,wakeWidth:a*.9}}case"ferry":return i(go(42,12,5),this.mats.hullBlue,0,1.5,0),i(new kt(42*.8,3.2,12*.9),this.mats.white,-1,4.9,0),i(new kt(42*.78,1.2,12*.92),this.mats.glass,-1,5.2,0),i(new kt(42*.4,2.8,12*.6),this.mats.white,-4,7.8,0),i(new be(.6,.7,3,10),this.mats.hullDark,-12,10.5,0),{group:n,len:42,beam:12,draft:2.2,wakeWidth:12*1.3};case"cargo":{const r=e.range(120,180),a=r*.16,l=r*.075;i(go(r,a,l),this.mats.hullDark,0,l*.15,0),i(new kt(r*.9,.8,a*.98),this.mats.hullRed,0,l*.6,0),i(new kt(r*.09,l*1.6,a*.9),this.mats.white,-r*.38,l*.6+l*.8,0),i(new kt(r*.1,2,a*.95),this.mats.glass,-r*.38,l*.6+l*1.55,0),i(new be(1.2,1.5,l*.9,10),this.mats.hullDark,-r*.44,l*.6+l*1.9,0);const h=Math.floor(r*.6/6.4),c=Math.max(3,Math.floor(a/2.6)),d=[];for(let g=0;g<h;g++)for(let f=0;f<c;f++){const m=e.int(1,4);for(let y=0;y<m;y++)d.push({x:r*.3-g*6.4,y:l*.6+.8+1.3+y*2.6,z:(f-(c-1)/2)*2.5,c:e.int(0,5)})}const u=new $i(new kt(6.1,2.6,2.44),this.mats.containerWhite,d.length),v=new jt,p=[12597547,3049153,2600544,14059792,8227731,15528177].map(g=>new Ht(g));return d.forEach((g,f)=>{u.setMatrixAt(f,v.makeTranslation(g.x,g.y,g.z)),u.setColorAt(f,p[g.c])}),u.castShadow=!0,u.receiveShadow=!0,n.add(u),{group:n,len:r,beam:a,draft:l*.5,wakeWidth:a*1.4}}}}}function t_(s){let t=0;for(let e=0;e<s.length-1;e++)t+=Math.hypot(s[e+1][0]-s[e][0],s[e+1][1]-s[e][1]);return t}function e_(s,t,e){let n=0;for(let i=0;i<s.length-1;i++){const o=Math.hypot(s[i+1][0]-s[i][0],s[i+1][1]-s[i][1]);if(t<=n+o||i===s.length-2){const r=Qt((t-n)/o,0,1);e.dx=(s[i+1][0]-s[i][0])/o,e.dz=(s[i+1][1]-s[i][1])/o,e.x=s[i][0]+e.dx*o*r,e.z=s[i][1]+e.dz*o*r;return}n+=o}}function Ql(s){s.updateMatrixWorld(!0);const t=s.matrixWorld.clone().invert(),e=new Jw,n=new jt,i=new jt,o=new Ht;return s.traverse(r=>{const a=r;if(!a.isMesh)return;n.multiplyMatrices(t,a.matrixWorld);const l=a.material,h=r;if(h.isInstancedMesh)for(let c=0;c<h.count;c++)h.getMatrixAt(c,i),h.instanceColor&&h.getColorAt(c,o),e.add(a.geometry,i.premultiply(n),l,h.instanceColor?o:void 0);else e.add(a.geometry,n,l);a.geometry.dispose()}),e.build()}const Iu=5e3,zu=3;function n_(){const s=[[new kt(4.4,1,1.9),0,0,.65,0],[new kt(2.2,.75,1.7),1,-.2,1.5,0],[new kt(.2,.25,1.6),2,2.2,.8,0]],t=[],e=[],n=[],i=[];for(const[r,a,l,h,c]of s){const d=r.translate(l,h,c).toNonIndexed(),u=d.getAttribute("position"),v=d.getAttribute("normal"),p=d.getAttribute("uv");for(let g=0;g<u.count;g++)t.push(u.getX(g),u.getY(g),u.getZ(g)),e.push(v.getX(g),v.getY(g),v.getZ(g)),n.push(p.getX(g),p.getY(g)),i.push(a);d.dispose(),r.dispose()}const o=new oe;return o.setAttribute("position",new Mt(t,3)),o.setAttribute("normal",new Mt(e,3)),o.setAttribute("uv",new Mt(n,2)),o.setAttribute("aPart",new Mt(i,1)),o.computeBoundingSphere(),o}function i_(){const s=new ce({color:16777215,emissive:16773840,emissiveIntensity:0}),t=new Ht(1712684),e=n=>n.toFixed(6);return s.onBeforeCompile=n=>{n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
attribute float aPart;
varying float vPart;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vPart = aPart;`),n.fragmentShader=n.fragmentShader.replace("#include <common>",`#include <common>
varying float vPart;`).replace("#include <color_fragment>",`#include <color_fragment>
if (vPart > 1.5) diffuseColor.rgb = vec3(1.0);
else if (vPart > 0.5) diffuseColor.rgb = vec3(${e(t.r)}, ${e(t.g)}, ${e(t.b)});`).replace("#include <roughnessmap_fragment>","float roughnessFactor = vPart > 1.5 ? 1.0 : (vPart > 0.5 ? 0.15 : 0.35);").replace("#include <metalnessmap_fragment>","float metalnessFactor = vPart > 1.5 ? 0.0 : (vPart > 0.5 ? 0.8 : 0.4);").replace("#include <emissivemap_fragment>","totalEmissiveRadiance *= step(1.5, vPart);")},s.customProgramCacheKey=()=>"traffic-car-v1",s}class s_{constructor(t,e,n,i,o,r){this.map=t;const a=new $e(`traffic-${o}`),l=new Qy,h=[];for(const I of t.channels){const O=t_(I.pts);for(let U=0;U<I.boats;U++){const P=I.id==="ocean-route"||I.id==="ship-channel"?a.chance(.6)?"cargo":"ferry":a.pick(["speed","speed","console","yacht","sail","speed"]),H=l.build(P,a),G=P==="cargo"?a.range(4,6):P==="ferry"?7:P==="sail"?a.range(2.5,4):P==="yacht"?a.range(5,9):a.range(9,16),N=new Mo(P==="cargo"?90:80,H.wakeWidth,P==="cargo"?70:P==="sail"?20:42,P==="sail"?.45:1.5,i);h.push(Ql(H.group)),this.boats.push({id:h.length-1,route:I.pts,routeLen:O,s:a.range(0,O),dir:a.chance(.5)?1:-1,speed:G,len:H.len,draft:H.draft,wake:N,phase:a.range(0,100)})}}const c=[];for(const I of r){const O=l.build(a.chance(.4)?"sail":a.chance(.5)?"speed":a.chance(.5)?"console":"yacht",a),U=Qt(I.len/O.len,.6,1.4);O.group.scale.setScalar(U),O.group.position.set(I.x,.05,I.z),O.group.rotation.y=I.rot+(a.chance(.5)?Math.PI:0),h.push(Ql(O.group)),c.push({idx:h.length-1,m:O.group.matrixWorld.clone()})}this.boatCount=this.boats.length+r.length;const d=new Map;for(const I of t.roads)d.set(I.id,I.pts.map(([O,U])=>new C(O,t.heightAt(O,U)+.25,U)));for(const[I,O]of d){const U=t.roads.find(P=>P.id===I);this.carRoutes.push({pts:O,length:this.len3(O),lanes:U.lanes,width:U.width})}for(const I of n)this.carRoutes.push({pts:I.pts.map(O=>O.clone().add(new C(0,.25,0))),length:this.len3(I.pts),lanes:I.lanes,width:I.width});for(const I of e){if(I.cls!=="street"||a.next()>.35)continue;const O=[new C(I.a[0],t.heightAt(I.a[0],I.a[1])+.25,I.a[1]),new C(I.b[0],t.heightAt(I.b[0],I.b[1])+.25,I.b[1])];this.carRoutes.push({pts:O,length:this.len3(O),lanes:2,width:I.width})}const u=["#e8e8e8","#d0d0d0","#1c1c1e","#8a8f94","#b8352e","#2b4c8c","#d9a441","#3d6b3a","#f2f2f2","#6c6f73","#c94f3d","#20242a"];for(let I=0;I<this.carRoutes.length;I++){const O=this.carRoutes[I],U=t.roads.find(G=>G.pts.length===O.pts.length&&G.pts[0][0]===O.pts[0].x),P=U?U.traffic:O.lanes>=4?10:1.2,H=Math.min(120,Math.round(O.length/1e3*P));for(let G=0;G<H;G++){const N=a.chance(.5)?1:-1;this.cars.push({route:I,s:a.range(0,O.length),dir:N,lane:a.int(0,Math.max(0,Math.floor(O.lanes/2)-1)),speed:a.range(11,26)*(O.lanes>=4?1.2:.8),color:new Ht(a.pick(u))})}}this.carCount=this.cars.length;const v=n_();this.carMat=i_(),this.materials.push(this.carMat);const p=new Map,g=new Array(this.carRoutes.length).fill(0);for(const I of this.cars)g[I.route]++;const f=new Set,m=new C;for(let I=0;I<this.carRoutes.length;I++){if(!g[I])continue;const O=this.carRoutes[I].pts;f.clear();for(let U=0;U<O.length-1;U++){const P=O[U],H=O[U+1],G=Math.max(1,Math.ceil(P.distanceTo(H)/40));for(let N=0;N<=G;N++){m.lerpVectors(P,H,N/G);const Y=za(m.x,m.z,Iu);f.has(Y)||(f.add(Y),p.set(Y,(p.get(Y)??0)+g[I]))}}}const y=(I,O)=>{const U=new $i(v,this.carMat,I);return U.instanceMatrix.setUsage(li),U.setColorAt(0,this.cars[0]?.color??new Ht(16777215)),U.instanceColor.setUsage(li),U.castShadow=!0,U.count=0,U.visible=!1,k2(U,"mid"),O?U.boundingSphere=new Le:U.frustumCulled=!1,this.group.add(U),{mesh:U,capacity:I,n:0,center:new C,r:0,box:new Ue}};for(const[I,O]of p){const U=y(O,!0);this.carCells.set(I,U),this.carChunks.push(U)}this.carOverflow=y(Math.max(1,this.cars.length),!1),this.carChunks.push(this.carOverflow);const w=new ce({color:16054008,roughness:.35,metalness:.2}),x=new ce({color:2781119,roughness:.4}),b=I=>{const O=new Ye,U=new pe(new be(1.9,1.9,38,12),w);U.rotation.z=Math.PI/2,O.add(U);const P=new pe(new hi(1.9,12,8),w);P.position.x=19,P.scale.set(1.6,1,1),O.add(P);const H=new pe(new kt(6,.5,34),w);H.position.set(1,-.8,0),H.rotation.y=0,O.add(H);const G=new pe(new kt(5,.4,16),w);G.position.set(-3,-.8,12),G.rotation.y=-.45,O.add(G);const N=G.clone();N.position.z=-12,N.rotation.y=.45,O.add(N);const Y=new pe(new kt(5,8,.4),x);Y.position.set(-16,4.5,0),Y.rotation.z=-.4,O.add(Y);const V=new pe(new kt(4,.3,12),w);V.position.set(-17,1,0),O.add(V);for(const Q of[-1,1]){const W=new pe(new be(1.1,1,4.5,10),w);W.rotation.z=Math.PI/2,W.position.set(3,-2.4,Q*7),O.add(W)}return O.scale.setScalar(I),h.push(Ql(O)),h.length-1},M=t.runways[0],A=(I,O)=>{const U=se(4e3,M.a[0],I),P=se(M.a[1]+30,M.a[1],I),H=se(900,12,Math.pow(I,.9));return O.set(U,H,P)};this.aircraft.push({id:b(1),path:A,period:240,offset:0,contrail:null}),this.aircraft.push({id:b(.9),path:A,period:240,offset:.5,contrail:null});const S=(I,O)=>{const U=se(M.b[0],-9e3,I),P=M.b[1]-3500*I*I;return O.set(U,12+2200*Math.pow(I,.8),P)};this.aircraft.push({id:b(1),path:S,period:200,offset:.2,contrail:null});const _=(I,O)=>O.set(se(-14e3,14e3,I),9500,se(-9e3,6e3,I)),E=new Mo(180,25,90,.6,Kc);this.aircraft.push({id:b(1),path:_,period:260,offset:.4,contrail:E});let T=0;for(const I of h)T+=I.getAttribute("position").count;const F=Yd("traffic-movers-v1",!0);this.materials.push(F),this.movers=new Ux(h.length,T,T,F);const k=h.map(I=>{const O=this.movers.addInstance(this.movers.addGeometry(I));return I.dispose(),O});for(const I of this.boats)I.id=k[I.id];for(const I of this.aircraft)I.id=k[I.id];for(const I of c)this.movers.setMatrixAt(k[I.idx],I.m);this.movers.frustumCulled=!1,this.movers.castShadow=!0,this.movers.receiveShadow=!0,this.group.add(this.movers)}group=new Ye;materials=[];boats=[];carRoutes=[];cars=[];carChunks=[];carCells=new Map;carOverflow;carMat;movers;aircraft=[];tmp={x:0,z:0,dx:1,dz:0};tmpM=new jt;tmpQ=new Xe;tmpP=new C;tmpS=new C(1,1,1);tmpE=new Be(0,0,0,"YXZ");up=new C(0,1,0);pos=new C;dir=new C;side=new C;ahead=new C;boatCount=0;carCount=0;len3(t){let e=0;for(let n=0;n<t.length-1;n++)e+=t[n].distanceTo(t[n+1]);return e}point3(t,e,n,i){let o=0;for(let r=0;r<t.length-1;r++){const a=t[r].distanceTo(t[r+1]);if(e<=o+a||r===t.length-2){const l=Qt((e-o)/a,0,1);i.subVectors(t[r+1],t[r]).divideScalar(a),n.copy(t[r]).addScaledVector(i,a*l);return}o+=a}}get contrailMeshes(){return this.aircraft.filter(t=>t.contrail).map(t=>t.contrail.mesh)}update(t,e,n){const{tmpM:i,tmpQ:o,tmpP:r,tmpS:a,tmpE:l,movers:h}=this;a.set(1,1,1);for(const p of this.boats){const g=p.routeLen;p.s+=p.speed*t*p.dir,p.s>g-5&&(p.s=g-5,p.dir=-1),p.s<5&&(p.s=5,p.dir=1),e_(p.route,p.s,this.tmp);const f=Math.atan2(this.tmp.dx*p.dir,this.tmp.dz*p.dir);r.set(this.tmp.x,-p.draft*.15+.12*Math.sin(e*1.3+p.phase)*(p.len<20?1:.2),this.tmp.z),l.set(.02*Math.sin(e*1.7+p.phase),f-Math.PI/2,.03*Math.sin(e*1.1+p.phase)+(p.speed>8?-.03:0),"XYZ"),h.setMatrixAt(p.id,i.compose(r,o.setFromEuler(l),a)),p.wake.update(this.tmp.x-this.tmp.dx*p.dir*p.len*.4,this.tmp.z-this.tmp.dz*p.dir*p.len*.4,e,!0,p.speed)}const{pos:c,dir:d,side:u,up:v}=this;for(const p of this.carChunks)p.n=0,p.box.makeEmpty();for(let p=0;p<this.cars.length;p++){const g=this.cars[p],f=this.carRoutes[g.route];g.s+=g.speed*t*g.dir,g.s>f.length&&(g.s=0),g.s<0&&(g.s=f.length),this.point3(f.pts,g.s,c,d),g.dir<0&&d.negate(),u.crossVectors(d,v).normalize();const m=(f.lanes>=4?1.5+g.lane*3.2:1.8)+0;c.addScaledVector(u,m);const y=Math.atan2(d.x,d.z)-Math.PI/2,w=-Math.asin(Qt(d.y,-1,1));this.tmpQ.setFromEuler(this.tmpE.set(0,y,w,"YXZ")),this.tmpP.copy(c),this.tmpM.compose(this.tmpP,this.tmpQ,this.tmpS);let x=this.carCells.get(za(c.x,c.z,Iu));(!x||x.n>=x.capacity)&&(x=this.carOverflow);const b=x.n++;x.mesh.setMatrixAt(b,this.tmpM),x.mesh.setColorAt(b,g.color),x.box.expandByPoint(c)}for(const p of this.carChunks){const g=p.mesh;if(g.count=p.n,!p.n){g.visible=!1;continue}g.visible=!0,g.instanceMatrix.clearUpdateRanges(),g.instanceMatrix.addUpdateRange(0,p.n*16),g.instanceMatrix.needsUpdate=!0,g.instanceColor.clearUpdateRanges(),g.instanceColor.addUpdateRange(0,p.n*3),g.instanceColor.needsUpdate=!0,p.box.min.addScalar(-zu),p.box.max.addScalar(zu),g.boundingSphere&&(p.box.getBoundingSphere(g.boundingSphere),p.center.copy(g.boundingSphere.center),p.r=g.boundingSphere.radius)}this.carMat.emissiveIntensity=6*n;for(const p of this.aircraft){const g=(e/p.period+p.offset)%1,f=p.path(g,this.pos),m=p.path(Math.min(1,g+.002),this.ahead).sub(f).normalize(),y=Math.atan2(m.x,m.z)-Math.PI/2,w=Math.asin(Qt(m.y,-1,1));l.set(0,y,w*.6,"YXZ"),h.setMatrixAt(p.id,i.compose(f,o.setFromEuler(l),a)),p.contrail&&(p.contrail.update(f.x,f.z,e,!0,250),p.contrail.mesh.position.y=f.y-2,p.contrail.mesh.updateMatrix())}}updateCulling(t){for(const e of this.carChunks){if(!e.n||e===this.carOverflow)continue;const n=t.boxInView(e.box),i=t.casterCascades(e.center,e.r,2.5),o=$s("mid",n,i),r=Hr(o);e.mesh.visible=n||r,e.mesh.castShadow=r,e.mesh.layers.mask=o}}}function wo(s,t=!1){const e=s[0].index!==null,n=new Set(Object.keys(s[0].attributes)),i=new Set(Object.keys(s[0].morphAttributes)),o={},r={},a=s[0].morphTargetsRelative,l=new oe;let h=0;for(let c=0;c<s.length;++c){const d=s[c];let u=0;if(e!==(d.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const v in d.attributes){if(!n.has(v))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+'. All geometries must have compatible attributes; make sure "'+v+'" attribute exists among all geometries, or in none of them.'),null;o[v]===void 0&&(o[v]=[]),o[v].push(d.attributes[v]),u++}if(u!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+". Make sure all geometries have the same number of attributes."),null;if(a!==d.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const v in d.morphAttributes){if(!i.has(v))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+".  .morphAttributes must be consistent throughout all geometries."),null;r[v]===void 0&&(r[v]=[]),r[v].push(d.morphAttributes[v])}if(t){let v;if(e)v=d.index.count;else if(d.attributes.position!==void 0)v=d.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+". The geometry must have either an index or a position attribute"),null;l.addGroup(h,v,c),h+=v}}if(e){let c=0;const d=[];for(let u=0;u<s.length;++u){const v=s[u].index;for(let p=0;p<v.count;++p)d.push(v.getX(p)+c);c+=s[u].attributes.position.count}l.setIndex(d)}for(const c in o){const d=Nu(o[c]);if(!d)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+c+" attribute."),null;l.setAttribute(c,d)}for(const c in r){const d=r[c][0].length;if(d===0)break;l.morphAttributes=l.morphAttributes||{},l.morphAttributes[c]=[];for(let u=0;u<d;++u){const v=[];for(let g=0;g<r[c].length;++g)v.push(r[c][g][u]);const p=Nu(v);if(!p)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+c+" morphAttribute."),null;l.morphAttributes[c].push(p)}}return l}function Nu(s){let t,e,n,i=-1,o=0;for(let h=0;h<s.length;++h){const c=s[h];if(t===void 0&&(t=c.array.constructor),t!==c.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(e===void 0&&(e=c.itemSize),e!==c.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=c.normalized),n!==c.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(i===-1&&(i=c.gpuType),i!==c.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;o+=c.count*e}const r=new t(o),a=new fe(r,e,n);let l=0;for(let h=0;h<s.length;++h){const c=s[h];if(c.isInterleavedBufferAttribute){const d=l/e;for(let u=0,v=c.count;u<v;u++)for(let p=0;p<e;p++){const g=c.getComponent(u,p);a.setComponent(u+d,p,g)}}else r.set(c.array,l);l+=c.count*e}return i!==void 0&&(a.gpuType=i),a}function o_(s,t=1e-4){t=Math.max(t,Number.EPSILON);const e={},n=s.getIndex(),i=s.getAttribute("position"),o=n?n.count:i.count;let r=0;const a=Object.keys(s.attributes),l={},h={},c=[],d=["getX","getY","getZ","getW"],u=["setX","setY","setZ","setW"];for(let y=0,w=a.length;y<w;y++){const x=a[y],b=s.attributes[x];l[x]=new b.constructor(new b.array.constructor(b.count*b.itemSize),b.itemSize,b.normalized);const M=s.morphAttributes[x];M&&(h[x]||(h[x]=[]),M.forEach((A,S)=>{const _=new A.array.constructor(A.count*A.itemSize);h[x][S]=new A.constructor(_,A.itemSize,A.normalized)}))}const v=t*.5,p=Math.log10(1/t),g=Math.pow(10,p),f=v*g;for(let y=0;y<o;y++){const w=n?n.getX(y):y;let x="";for(let b=0,M=a.length;b<M;b++){const A=a[b],S=s.getAttribute(A),_=S.itemSize;for(let E=0;E<_;E++)x+=`${~~(S[d[E]](w)*g+f)},`}if(x in e)c.push(e[x]);else{for(let b=0,M=a.length;b<M;b++){const A=a[b],S=s.getAttribute(A),_=s.morphAttributes[A],E=S.itemSize,T=l[A],F=h[A];for(let k=0;k<E;k++){const I=d[k],O=u[k];if(T[O](r,S[I](w)),_)for(let U=0,P=_.length;U<P;U++)F[U][O](r,_[U][I](w))}}e[x]=r,c.push(r),r++}}const m=s.clone();for(const y in s.attributes){const w=l[y];if(m.setAttribute(y,new w.constructor(w.array.slice(0,r*w.itemSize),w.itemSize,w.normalized)),y in h)for(let x=0;x<h[y].length;x++){const b=h[y][x];m.morphAttributes[y][x]=new b.constructor(b.array.slice(0,r*b.itemSize),b.itemSize,b.normalized)}}return m.setIndex(c),m}const Qc=Math.PI*2;function qs(s,t,e=[0,0]){const n=s.n??2.2,i=s.nBot??n,o=t*Qc-Math.PI/2,r=Math.cos(o),a=Math.sin(o),l=a<=0,h=l?n:i;return e[1]=Math.sign(r)*Math.pow(Math.abs(r),2/h)*s.w,e[0]=s.yc-Math.sign(a)*Math.pow(Math.abs(a),2/h)*(l?s.top:s.bot),e}function bo(s,t){const e=s.n??2.2,n=s.nBot??e,i=t-s.yc;return i>=0?i>=s.top?null:(Math.PI/2-Math.asin(Math.pow(i/s.top,e/2)))/Qc:-i>=s.bot?null:(Math.PI/2+Math.asin(Math.pow(-i/s.bot,n/2)))/Qc}function Fa(s,t){const e=bo(s,t);return e===null?0:Math.abs(qs(s,e)[1])}function r_(s,t=64){let e=0;const n=qs(s,0),i=[0,0];for(let o=1;o<=t;o++)qs(s,o/t,i),e+=Math.hypot(i[0]-n[0],i[1]-n[1]),n[0]=i[0],n[1]=i[1];return e}function a_(s,t,e,n){const i=(a,l)=>a+(l-a)*e,o=s.n??2.2,r=t.n??2.2;return{x:n,yc:i(s.yc,t.yc),w:i(s.w,t.w),top:i(s.top,t.top),bot:i(s.bot,t.bot),n:i(o,r),nBot:i(s.nBot??o,t.nBot??r)}}function Jn(s,t){const e=s.length;for(let r=0;r<e-1;r++){const a=s[r],l=s[r+1],h=Math.min(a.x,l.x),c=Math.max(a.x,l.x);if(t>=h-1e-9&&t<=c+1e-9)return a_(a,l,c===h?0:(t-a.x)/(l.x-a.x),t)}const n=s[0],i=s[e-1];return{...Math.abs(t-n.x)<Math.abs(t-i.x)?n:i,x:t}}function l_(s,t){const e=s.slice(),n=s[0].x>s[s.length-1].x;for(const i of t)e.some(o=>Math.abs(o.x-i)<1e-6)||e.push(Jn(s,i));return e.sort((i,o)=>n?o.x-i.x:i.x-o.x),e}function ya(s,t){return s.map(e=>({...e,w:Math.max(e.w-t,.01),top:Math.max(e.top-t,.01),bot:Math.max(e.bot-t,.01)}))}function th(s,t,e,n,i){const r=[0],a=qs(s,t),l=[0,0];for(let d=1;d<=24;d++)qs(s,t+(e-t)*(d/24),l),r.push(r[d-1]+Math.hypot(l[0]-a[0],l[1]-a[1])),a[0]=l[0],a[1]=l[1];const h=r[24]||1e-9;let c=1;for(let d=1;d<n;d++){const u=h*(d/n);for(;c<24&&r[c]<u;)c++;const v=(u-r[c-1])/Math.max(r[c]-r[c-1],1e-9);i.push(t+(e-t)*((c-1+v)/24))}i.push(e)}function c_(s,t){return e=>{const n=[];let i=0;const o=[0];for(const r of s){const a=typeof r.y=="function"?r.y(e):r.y;let l=e.yc+e.top*.97>a&&e.yc-e.bot*.97<a?bo(e,a):r.fallbackT;l=Math.max(l,i+5e-4),th(e,i,l,r.segs,o),i=l}th(e,i,.5,t,o);for(const r of o)n.push(r);for(let r=o.length-2;r>=0;r--)n.push(1-o[r]);return n}}function Ah(s,t,e,n,i,o){const r=t*(n+1)+e,a=r+n+1;i!==o?s.push(r,r+1,a,r+1,a+1,a):s.push(r,a,r+1,r+1,a,a+1)}function _a(s,t){const e=s.length,n=s.map((g,f)=>t(g,f)),i=n[0].length-1;let o=0;const r=[0];for(let g=1;g<e;g++)o+=Math.abs(s[g].x-s[g-1].x),r.push(o);const a=r.map(g=>g/Math.max(o,1e-6)),l=new Float32Array(e*(i+1)*3),h=new Float32Array(e*(i+1)*2),c=[0,0];for(let g=0;g<e;g++)for(let f=0;f<=i;f++){qs(s[g],n[g][f],c);const m=g*(i+1)+f;l[m*3]=s[g].x,l[m*3+1]=c[0],l[m*3+2]=c[1],h[m*2]=a[g],h[m*2+1]=n[g][f]}const d=s[e-1].x>=s[0].x,u=new oe;u.setAttribute("position",new fe(l,3));const v=[];for(let g=0;g<e-1;g++)for(let f=0;f<i;f++)Ah(v,g,f,i,d,!1);u.setIndex(v),u.computeVertexNormals();const p=u.getAttribute("normal").array;for(let g=0;g<e;g++){const f=g*(i+1),m=f+i;let y=p[f*3]+p[m*3],w=p[f*3+1]+p[m*3+1],x=p[f*3+2]+p[m*3+2];const b=Math.hypot(y,w,x)||1;y/=b,w/=b,x/=b,p[f*3]=y,p[f*3+1]=w,p[f*3+2]=x,p[m*3]=y,p[m*3+1]=w,p[m*3+2]=x}return{sections:s,R:i,t:n,u:a,pos:l,uv:h,normal:p,forwardX:d}}function Ma(s,t={}){const e=s.sections.length,n=s.R,i=t.i0??0,o=t.i1??e-1,r=!!t.flip,a=Array.from(s.pos),l=Array.from(s.uv),h=Array.from(s.normal);if(r)for(let v=0;v<h.length;v++)h[v]=-h[v];const c=[];for(let v=i;v<o;v++)for(let p=0;p<n;p++)(!t.quad||t.quad(v,p))&&Ah(c,v,p,n,s.forwardX,r);const d=(v,p)=>{const g=s.sections[v],f=s.sections[p?Math.min(v+1,e-1):Math.max(v-1,0)];let m=Math.sign(g.x-f.x)||(p?-1:1);r&&(m=-m);const y=a.length/3;a.push(g.x,g.yc,0),h.push(m,0,0),l.push(s.u[v],.5);for(let w=0;w<=n;w++){const x=v*(n+1)+w;a.push(s.pos[x*3],s.pos[x*3+1],s.pos[x*3+2]),h.push(m,0,0),l.push(s.uv[x*2],s.uv[x*2+1])}for(let w=0;w<n;w++)m>0?c.push(y,y+1+w,y+2+w):c.push(y,y+2+w,y+1+w)};t.capStart&&d(i,!0),t.capEnd&&d(o,!1);const u=new oe;return u.setAttribute("position",new Mt(a,3)),u.setAttribute("normal",new Mt(h,3)),u.setAttribute("uv",new Mt(l,2)),u.setIndex(c),u}function Uu(s,t,e,n){return e<s.i0||e>=s.i1?!1:n>=s.j0&&n<s.j1||n+t>=s.j0&&n+t<s.j1}function Fu(s,t,e){const n=s.R,{i0:i,i1:o,j0:r,j1:a}=e,l=b=>b>n?b-n:b,h=[];for(let b=r;b<a;b++)h.push([i,l(b)]);for(let b=i;b<o;b++)h.push([b,l(a)]);for(let b=a;b>r;b--)h.push([o,l(b)]);for(let b=o;b>i;b--)h.push([b,l(r)]);const c=(b,M,A)=>{const S=(M*(n+1)+A)*3;return new C(b.pos[S],b.pos[S+1],b.pos[S+2])},d=new C;for(const[b,M]of h)d.add(c(s,b,M));d.multiplyScalar(1/h.length);const u=[],v=[],p=[],g=(b,M,A,S)=>{for(const _ of[b,M,A])u.push(_.x,_.y,_.z),v.push(S.x,S.y,S.z),p.push(0,0)},f=new C,m=new C,y=new C,w=new C;for(let b=0;b<h.length;b++){const[M,A]=h[b],[S,_]=h[(b+1)%h.length],E=c(s,M,A),T=c(s,S,_),F=c(t,M,A),k=c(t,S,_);f.subVectors(T,E),m.subVectors(F,E),y.crossVectors(f,m).normalize(),w.addVectors(E,T).multiplyScalar(.5).sub(d).negate(),y.dot(w)>=0?(g(E,T,F,y),g(T,k,F,y)):(y.negate(),g(E,F,T,y),g(T,F,k,y))}const x=new oe;return x.setAttribute("position",new Mt(u,3)),x.setAttribute("normal",new Mt(v,3)),x.setAttribute("uv",new Mt(p,2)),x}function ku(s,t,e,n=!1){const i=s.R,o=w=>w>i?w-i:w,r=t.i1-t.i0,a=t.j1-t.j0,l=(w,x)=>{const b=(w*(i+1)+o(x))*3;return[s.pos[b],s.pos[b+1],s.pos[b+2]]},h=(w,x)=>Math.hypot(w[0]-x[0],w[1]-x[1],w[2]-x[2]),c=(w,x,b)=>{let M=0,A=0;if(b)for(let S=0;S<r;S++){const _=h(l(t.i0+S,t.j0+x),l(t.i0+S+1,t.j0+x));S<w&&(M+=_),A+=_}else for(let S=0;S<a;S++){const _=h(l(t.i0+w,t.j0+S),l(t.i0+w,t.j0+S+1));S<x&&(M+=_),A+=_}return[M,A]};let d=0,u=0;for(let w=0;w<=a;w++)d+=c(0,w,!0)[1]/(a+1);for(let w=0;w<=r;w++)u+=c(w,0,!1)[1]/(r+1);const v=[],p=[],g=[],f=[],m=[];for(let w=0;w<=r;w++)for(let x=0;x<=a;x++){const b=t.i0+w,M=o(t.j0+x),A=b*(i+1)+M;v.push(s.pos[A*3],s.pos[A*3+1],s.pos[A*3+2]);const S=e?-1:1;p.push(s.normal[A*3]*S,s.normal[A*3+1]*S,s.normal[A*3+2]*S);const[_,E]=c(w,x,!0),[T,F]=c(w,x,!1);g.push(_/Math.max(E,1e-6),T/Math.max(F,1e-6)),f.push(d,u,n?1:0,e?1:0)}for(let w=0;w<r;w++)for(let x=0;x<a;x++){const b=w*(a+1)+x,M=b+a+1;s.forwardX!==e?m.push(b,b+1,M,b+1,M+1,M):m.push(b,M,b+1,b+1,M,M+1)}const y=new oe;return y.setAttribute("position",new Mt(v,3)),y.setAttribute("normal",new Mt(p,3)),y.setAttribute("uv",new Mt(g,2)),y.setAttribute("aPane",new Mt(f,4)),y.setIndex(m),y}function h_(s,t,e,n,i,o,r,a=8){const l=m=>Math.max(Fa(Jn(s,m),t)-i,.02),h=[],c=[],d=[],u=[],v=[];for(let m=0;m<=7;m++){const y=Math.PI*1.5-m/7*Math.PI;v.push({x:e+Math.cos(y)*o,y:t-o+Math.sin(y)*o,nx:Math.cos(y),ny:Math.sin(y),v:m/7*.3})}for(let m=1;m<=a;m++)v.push({x:e+(n-e)*(m/a),y:t,nx:0,ny:1,v:.3+.7*(m/a)});const g=10;for(const m of v){const y=l(Math.max(m.x,e));for(let w=0;w<=g;w++){const x=-y+2*y*(w/g);h.push(m.x,m.y,x),c.push(m.nx,m.ny,0),d.push(r.u0+(r.u1-r.u0)*(w/g),r.v1+(r.v0-r.v1)*m.v)}}for(let m=0;m<v.length-1;m++)for(let y=0;y<g;y++){const w=m*(g+1)+y,x=w+g+1;u.push(w,w+1,x,w+1,x+1,x)}const f=new oe;return f.setAttribute("position",new Mt(h,3)),f.setAttribute("normal",new Mt(c,3)),f.setAttribute("uv",new Mt(d,2)),f.setIndex(u),f}function u_(s,t,e,n,i){const o=t.clone().sub(s).normalize(),r=i.clone().addScaledVector(o,-i.dot(o)).normalize(),a=new C().crossVectors(o,r).normalize(),l=new kt(e,s.distanceTo(t),n),h=new jt().makeBasis(a,o,r).setPosition(s.clone().add(t).multiplyScalar(.5));return l.applyMatrix4(h),l}function tc(s,t,e){const n=new Si(s,t),i=n.getAttribute("uv");for(let o=0;o<i.count;o++)i.setXY(o,e.u0+(e.u1-e.u0)*i.getX(o),e.v0+(e.v1-e.v0)*i.getY(o));return n}function d_(s,t,e,n,i,o=8){const r=Math.min(e,n),a=Math.max(e,n),l=[],h=[],c=[],d=v=>Math.max(Fa(Jn(s,v),t)-i,.02);for(let v=0;v<o;v++){const p=r+(a-r)*(v/o),g=r+(a-r)*((v+1)/o),f=d(p),m=d(g),y=[[p,-f],[g,m],[g,-m],[p,-f],[p,f],[g,m]];for(const[w,x]of y)l.push(w,t,x),h.push(0,1,0),c.push((w-r)/(a-r),x*.5+.5)}const u=new oe;return u.setAttribute("position",new Mt(l,3)),u.setAttribute("normal",new Mt(h,3)),u.setAttribute("uv",new Mt(c,2)),u}function f_(s,t,e,n=16,i=6){const o=s.length,r=n/2,a=n+i,l=[];for(let y=0;y<=r;y++)l.push(y/r);for(let y=1;y<=i;y++)l.push(1-2*(y/i));for(let y=1;y<=r;y++)l.push(-1+y/r);const h=y=>y<=r||y>=r+i,c=[],d=[],u=[];let v=0;for(let y=1;y<o;y++)v+=Math.abs(s[y].x-s[y-1].x);let p=0;for(let y=0;y<o;y++){const w=s[y];y>0&&(p+=Math.abs(w.x-s[y-1].x));for(let x=0;x<=a;x++){const b=l[x]*w.w;c.push(w.x,h(x)?t(w.x,b):e(w.x,b),b),d.push(p/Math.max(v,1e-6),x/a)}}for(let y=0;y<o-1;y++)for(let w=0;w<a;w++)Ah(u,y,w,a,!1,!1);const g=(y,w)=>{const x=c.length/3;let b=0;for(let M=0;M<a;M++)b+=c[(y*(a+1)+M)*3+1];c.push(s[y].x,b/a,0),d.push(y===0?0:1,.5);for(let M=0;M<=a;M++){const A=y*(a+1)+M;c.push(c[A*3],c[A*3+1],c[A*3+2]),d.push(d[A*2],d[A*2+1])}for(let M=0;M<a;M++)w>0?u.push(x,x+1+M,x+2+M):u.push(x,x+2+M,x+1+M)};g(0,1),g(o-1,-1);const f=new oe;f.setAttribute("position",new Mt(c,3)),f.setAttribute("uv",new Mt(d,2)),f.setIndex(u),f.computeVertexNormals();const m=f.getAttribute("normal");for(let y=0;y<o;y++){const w=y*(a+1),x=w+a,b=new C(m.getX(w)+m.getX(x),m.getY(w)+m.getY(x),m.getZ(w)+m.getZ(x)).normalize();m.setXYZ(w,b.x,b.y,b.z),m.setXYZ(x,b.x,b.y,b.z)}return f}const nf=.0035;function ka(s,t,e=nf){return 5*t*(.2969*Math.sqrt(s)-.126*s-.3516*s*s+.2843*s**3-.1036*s**4)+e*s}function Oa(s,t){return t*Math.sin(Math.PI*s)}function Xs(s,t){return s.rootChord+(s.tipChord-s.rootChord)*(t/s.span)}function Fo(s,t){return .3*Xs(s,t)+s.sweep*(t/s.span)}function ec(s,t){return Fo(s,t)-Xs(s,t)}function Ou(s,t,e){const n=Xs(s,e),i=mn.clamp((Fo(s,e)-t)/n,0,1);return Math.tan(s.dihedral)*e+(Oa(i,s.camber)-ka(i,s.thickness,s.te))*n}function p_(s,t,e){const n=Xs(s,e),i=mn.clamp((Fo(s,e)-t)/n,0,1);return Math.tan(s.dihedral)*e+(Oa(i,s.camber)+ka(i,s.thickness,s.te))*n}function Bu(s,t,e,n,i,o=nf){const r=u=>({x:u,y:Oa(u,n)+ka(u,e,o),u:.5-.5*u}),a=u=>({x:u,y:Oa(u,n)-ka(u,e,o),u:.5+.5*u}),l=[];if(s==="rear"){l.push(r(1));for(let u=1;u<i;u++)l.push(r(t+(1-t)*(1-u/i)));l.push(r(t),{...r(t),flat:!0}),l.push({...a(t),flat:!0},a(t));for(let u=1;u<i;u++)l.push(a(t+(1-t)*(u/i)));return l.push(a(1),{...r(1),u:1}),l}const h=u=>Math.pow(1-u/i,2),c=s==="front"?t:1;l.push(r(c)),s==="front"&&l.push(r(c));const d=[];for(let u=1;u<=i;u++)d.push(Math.min(h(u),c));for(const u of d)l.push(r(u));for(let u=d.length-2;u>=0;u--)l.push(a(d[u]));return l.push(a(c)),s==="front"&&l.push({...a(c),flat:!0}),l.push({...r(c),u:s==="front"?.5-.5*c:1,flat:s==="front"}),l}const nc=.22;function Rn(s,t){const e=s.camber??.02,n=t.n??12,i=[],o=[],r=[],a=[],l=[];for(let g=0;g<=t.segments;g++)l.push({z:t.z0+(t.z1-t.z0)*(g/t.segments),scale:1});if(t.tipRound&&t.tipRound>0)for(let f=1;f<=6;f++){const m=f/6*Math.PI/2;l.push({z:t.z1+t.tipRound*Math.sin(m),scale:Math.max(Math.cos(m),.02)})}const h=g=>{const f=Xs(s,g),m=Fo(s,g);return t.hingeX!==void 0?(m-t.hingeX)/f:.75};let c=0;const d=(g,f,m,y,w)=>{const x=Xs(s,m),b=Fo(s,m),M=s.twist*(m/s.span),A=.5+(g.x-.5)*y,S=g.y*y,_=(A-.3)*x,E=S*x,T=Math.cos(M),F=Math.sin(M),k=_*T+E*F,I=-_*F+E*T;w.push(-k+(b-.3*x),Math.tan(s.dihedral)*f+I,f)},u=t.vOf??(g=>Math.min(1,g/s.span));for(const g of l){const f=Math.min(g.z,t.z1),m=Xs(s,f),y=h(f),w=Bu(t.part,t.part==="rear"?y+(t.gap??.015)/m:y,s.thickness,e,n,s.te);c=w.length;for(const x of w){d(x,g.z,f,g.scale,i);const b=u(Math.min(g.z,t.z1));x.flat?(o.push(.02,b),a.push(nc,nc,nc)):(o.push(x.u,b),a.push(1,1,1))}}for(let g=0;g<l.length-1;g++)for(let f=0;f<c-1;f++){const m=g*c+f,y=m+c;r.push(m,y,m+1,m+1,y,y+1)}const v=(g,f,m)=>{const y=h(g),w=Bu(f,y,s.thickness,e,n,s.te),x=i.length/3,b=[];for(const _ of w)d(_,g,g,1,b);let M=0,A=0;const S=w.length-1;for(let _=0;_<S;_++)M+=b[_*3],A+=b[_*3+1];i.push(M/S,A/S,g),o.push(.5,u(g)),a.push(1,1,1);for(let _=0;_<S;_++)i.push(b[_*3],b[_*3+1],b[_*3+2]),o.push(w[_].u,u(g)),a.push(1,1,1);for(let _=0;_<S;_++){const E=x+1+_,T=x+1+(_+1)%S;m?r.push(x,T,E):r.push(x,E,T)}};t.capStart&&v(t.z0,t.capStart,!1),t.capEnd&&v(t.z1,t.capEnd,!0);const p=new oe;return p.setAttribute("position",new Mt(i,3)),p.setAttribute("uv",new Mt(o,2)),p.setAttribute("color",new Mt(a,3)),p.setIndex(r),p.computeVertexNormals(),p}function ic(s,t=1e-4){s.deleteAttribute("normal");const e=o_(s,t);return e.computeVertexNormals(),e}function m_(s,t,e){const o=[],r=[],a=[],l=t*1.35,h=g=>{const f=mn.smoothstep(g,0,.42);let m=t*.75+(l-t*.75)*f;return g>.42&&(m=l+(e-l)*((g-.42)/.58)),g>.82&&(m*=Math.sqrt(Math.max(1-Math.pow((g-.82)/.18,2),0))),Math.max(m,.012)};for(let g=0;g<=16;g++){const f=g/16,m=f<.7?f:.7+.3*(1-Math.pow(Math.max(0,1-(f-.7)/.3),1.6)),y=m*s,w=h(m),x=.075+.55*Math.pow(1-m,3.2),b=w*x,M=.95-.7*m,A=Math.cos(M),S=Math.sin(M);for(let _=0;_<12;_++){const E=_/12*Math.PI*2,T=-.5*Math.cos(E),F=Math.sin(E)>=0,k=.07*w*(1-4*T*T)*(1-Math.min(x,.5)*1.6),I=.5*b*Math.sqrt(Math.max(0,1-4*T*T))*Math.abs(Math.sin(E)),O=(T+.15)*w,U=k+(F?I:-I);o.push(O*A-U*S,y,O*S+U*A),a.push(_/12,m)}}for(let g=0;g<16;g++)for(let f=0;f<12;f++){const m=(f+1)%12,y=g*12+f,w=y+12,x=g*12+m,b=x+12;r.push(y,w,x,x,w,b)}const c=16*12,d=o.length/3;let u=0,v=0;for(let g=0;g<12;g++)u+=o[(c+g)*3],v+=o[(c+g)*3+2];o.push(u/12,s,v/12),a.push(.5,1);for(let g=0;g<12;g++)r.push(d,c+g,c+(g+1)%12);const p=new oe;return p.setAttribute("position",new Mt(o,3)),p.setAttribute("uv",new Mt(a,2)),p.setIndex(r),p.computeVertexNormals(),p}function g_(s,t,e=24){const n=[];for(let r=0;r<=14;r++){const a=r/14;n.push(new Rt(s*Math.pow(Math.max(1-Math.pow(a,1.7),0),.72),a*t))}const o=new $a(n,e);return o.rotateZ(-Math.PI/2),o}function v_(s,t=8,e=5){const i=[],o=[],r=[],a=[],l=[],h=y=>{a.length=0;const w=y.n??3,x=y.vee??1.15,b=[],M={x:y.x,yc:y.yc,w:y.w,top:y.top,bot:y.bot,n:w},A=[];th(M,0,.25,t,A);const S=[0,0];b.push({y:y.yc+y.top,z:0,v:0});for(let _=0;_<A.length;_++)qs(M,A[_],S),b.push({y:S[0],z:S[1],v:.22*((_+1)/t)});b.push({y:y.yc,z:y.w,v:.22});for(let _=1;_<=e;_++){const E=_/e,T=y.w*(1-E);b.push({y:y.yc-y.bot*(1-Math.pow(1-E,x)),z:T,v:.22+.28*E})}for(const _ of b)a.push(_);for(let _=b.length-1;_>=0;_--)a.push({y:b[_].y,z:-b[_].z,v:1-b[_].v});return a};let c=0;for(let y=1;y<s.length;y++)c+=Math.abs(s[y].x-s[y-1].x);let d=0;const u=(y,w)=>{const x=h(y),b=[];for(const M of x)b.push(i.length/3),i.push(y.x,M.y,M.z),o.push(w,M.v);l.push({pos:b,x:y.x})},v=[];for(let y=0;y<s.length;y++){const w=s[y];y>0&&(d+=Math.abs(w.x-s[y-1].x)),u(w,d/Math.max(c,1e-6)),w.split&&(v.push(l.length-1),u(w,d/Math.max(c,1e-6)))}const p=l[0].pos.length;for(let y=0;y<l.length-1;y++){if(v.includes(y))continue;const w=l[y].pos,x=l[y+1].pos;for(let b=0;b<p-1;b++)r.push(w[b],x[b],w[b+1],w[b+1],x[b],x[b+1])}const g=(y,w,x)=>{const b=i.length/3;let M=0;for(let A=0;A<p-1;A++)M+=i[y[A]*3+1];i.push(w,M/(p-1),0),o.push(x>0?0:1,.5);for(let A=0;A<p-1;A++)x>0?r.push(b,y[A],y[A+1]):r.push(b,y[A+1],y[A])};g(l[0].pos,l[0].x,1),g(l[l.length-1].pos,l[l.length-1].x,-1);const f=new oe;f.setAttribute("position",new Mt(i,3)),f.setAttribute("uv",new Mt(o,2)),f.setIndex(r),f.computeVertexNormals();const m=f.getAttribute("normal");for(const y of l){const w=y.pos[0],x=y.pos[p-1],b=new C(m.getX(w)+m.getX(x),m.getY(w)+m.getY(x),m.getZ(w)+m.getZ(x)).normalize();m.setXYZ(w,b.x,b.y,b.z),m.setXYZ(x,b.x,b.y,b.z)}return f}function sf(s,t){const e=new Xe().setFromUnitVectors(new C(0,1,0),t.clone().sub(s).normalize());return new jt().compose(s.clone().add(t).multiplyScalar(.5),e,new C(1,1,1))}function ai(s,t,e,n=8){const i=new be(e,e,s.distanceTo(t),n);return i.applyMatrix4(sf(s,t)),i}function fr(s,t,e,n){const i=new be(.5,.5,s.distanceTo(t),10);return i.scale(e,1,n),i.applyMatrix4(sf(s,t)),i}function x_(s,t,e){const n=s instanceof C?s:new C(...s??[0,0,0]),i=t instanceof Be?t:new Be(...t??[0,0,0]),o=typeof e=="number"?new C(e,e,e):e instanceof C?e:new C(...e??[1,1,1]);return new jt().compose(n,new Xe().setFromEuler(i),o)}function w_(s){const t=s.clone();if(t.index)return t;const e=t.getAttribute("position").count,n=new Uint32Array(e);for(let i=0;i<e;i++)n[i]=i;return t.setIndex(new fe(n,1)),t}function y_(s,t){const e=w_(s);if(!t)return e;if(e.applyMatrix4(t),t.determinant()<0){const n=e.index;for(let i=0;i<n.count;i+=3){const o=n.getX(i+1),r=n.getX(i+2);n.setX(i+1,r),n.setX(i+2,o)}}return e}function __(s,t){const e=s.getAttribute("position"),n=e.count,i=new Float32Array(n*3),o=new Float32Array(n*2),r=new Ht;let a=null;for(let l=0;l<n;l++){const h=typeof t=="function"?t(e.getX(l),e.getY(l),e.getZ(l)):t;h!==a&&(r.set(h.color),a=h),i[l*3]=r.r,i[l*3+1]=r.g,i[l*3+2]=r.b,o[l*2]=h.roughness,o[l*2+1]=h.metalness}return s.setAttribute("color",new fe(i,3)),s.setAttribute("aSurf",new fe(o,2)),s}function M_(){const s=new ce({color:16777215,roughness:1,metalness:1,vertexColors:!0});return s.onBeforeCompile=t=>{t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aSurf;
varying vec2 vSurf;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vSurf = aSurf;`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vSurf;`).replace("#include <roughnessmap_fragment>","float roughnessFactor = roughness * vSurf.x;").replace("#include <metalnessmap_fragment>","float metalnessFactor = metalness * vSurf.y;")},s.customProgramCacheKey=()=>"plane-parts-v1",s}class Sn{constructor(t){this.defaultSurf=t}parts=[];add(t,e,n=this.defaultSurf){const i=y_(t,e);return n&&__(i,n),this.parts.push(i),this}get size(){return this.parts.length}build(){if(this.parts.length===1)return this.parts[0];const t=wo(this.parts,!1);if(!t)throw new Error("Batch: parts have incompatible attributes");return t}}function xn(s,t){const e=document.createElement("canvas");return e.width=s,e.height=t,[e,e.getContext("2d")]}function zn(s,t,e=8){const n=new Ur(s);return n.flipY=!1,n.colorSpace=t?Dn:wi,n.wrapS=Po,n.wrapT=Po,n.anisotropy=e,n}function Th(s,t=2){const e=s.width,n=s.height,i=s.getContext("2d").getImageData(0,0,e,n).data,[o,r]=xn(e,n),a=r.createImageData(e,n),l=(h,c)=>i[((c+n)%n*e+(h+e)%e)*4]/255;for(let h=0;h<n;h++)for(let c=0;c<e;c++){const d=(l(c+1,h)-l(c-1,h))*t,u=(l(c,h+1)-l(c,h-1))*t,v=Math.hypot(d,u,1),p=(h*e+c)*4;a.data[p]=Math.round((-d/v*.5+.5)*255),a.data[p+1]=Math.round((-u/v*.5+.5)*255),a.data[p+2]=Math.round((1/v*.5+.5)*255),a.data[p+3]=255}return r.putImageData(a,0,0),o}function ko(s,t,e,n,i,o,r="40,35,30"){for(let a=0;a<i;a++){const l=t.range(0,e),h=t.range(0,n),c=t.range(8,60),d=s.createRadialGradient(l,h,0,l,h,c);d.addColorStop(0,`rgba(${r},${o*t.range(.4,1)})`),d.addColorStop(1,`rgba(${r},0)`),s.fillStyle=d,s.fillRect(l-c,h-c,c*2,c*2)}}function Ba(s,t,e,n,i,o,r,a={}){const l=a.y0??0,h=a.y1??n,c=a.strength??1,d=(u,v)=>{const p=Math.round(u+v*c);return`rgb(${p},${p},${p})`};s.strokeStyle=d(128,-38),s.lineWidth=2.2,t.strokeStyle=`rgba(30,30,35,${.22*c})`,t.lineWidth=1.5;for(const u of i){const v=u*e;s.beginPath(),s.moveTo(v,l),s.lineTo(v,h),s.stroke(),t.save(),t.strokeStyle=`rgba(40,38,34,${.07*c})`,t.lineWidth=9,t.beginPath(),t.moveTo(v,l),t.lineTo(v,h),t.stroke(),t.restore(),t.beginPath(),t.moveTo(v,l),t.lineTo(v,h),t.stroke();for(const p of[-7,7])for(let g=l+r/2;g<h;g+=r)s.fillStyle=d(128,56),s.beginPath(),s.arc(v+p,g,1.6,0,Math.PI*2),s.fill(),t.fillStyle=`rgba(255,255,255,${.1*c})`,t.beginPath(),t.arc(v+p,g,1.4,0,Math.PI*2),t.fill(),t.fillStyle=`rgba(0,0,0,${.1*c})`,t.beginPath(),t.arc(v+p,g+1.2,1.2,0,Math.PI*2),t.fill()}for(const u of o){const v=u*n;if(!(v<l||v>h)){s.strokeStyle=d(128,-22),s.lineWidth=1.4,s.beginPath(),s.moveTo(0,v),s.lineTo(e,v),s.stroke(),t.strokeStyle=`rgba(30,30,35,${.12*c})`,t.beginPath(),t.moveTo(0,v),t.lineTo(e,v),t.stroke();for(let p=r/2;p<e;p+=r)s.fillStyle=d(128,48),s.beginPath(),s.arc(p,v+5,1.5,0,Math.PI*2),s.fill(),t.fillStyle=`rgba(0,0,0,${.08*c})`,t.beginPath(),t.arc(p,v+6,1.2,0,Math.PI*2),t.fill()}}}const en={upper:"#f3f1ea",under:"#e3d9c2",lower:"#f5cc5a",cheat:"#1c2d5a",pin:"#d8322e",registration:"N726BV"},Ao={top:.03,bottom:.1,pin:.125};function Hu(s,t,e,n,i,o,r,a,l,h,c){const d=e/t.length,u=n/t.perimeter(o),v=t.vOf(o,r)??.25,p=a/.72*d;for(const g of[1,-1])s.save(),s.translate(t.uOf(o)*e,(g>0?v:1-v)*n),s.scale(g>0?-1:1,g*(u/d)),s.fillStyle=c,s.font=`${l} ${p.toFixed(1)}px ${h}`,s.textAlign="center",s.textBaseline="middle",s.fillText(i,0,0),s.restore()}function b_(s){const n=new $e("fuselage-paint"),[i,o]=xn(2048,1024),[r,a]=xn(2048,1024),[l,h]=xn(2048,1024);a.fillStyle="#808080",a.fillRect(0,0,2048,1024),o.fillStyle=en.upper,o.fillRect(0,0,2048,1024);const c=[],d=(S,_)=>s.vOf(S,_)??.5;for(let S=0;S<=2048;S+=8){const _=s.xOf(S/2048),E=s.sillY(_);c.push({px:S,cheatTop:d(_,E-Ao.top),cheatBot:d(_,E-Ao.bottom),pinBot:d(_,E-Ao.pin)})}const u=(S,_,E,T)=>{const F=k=>(T>0?k:1-k)*1024;o.beginPath(),o.moveTo(c[0].px,F(S(c[0])));for(const k of c)o.lineTo(k.px,F(S(k)));for(let k=c.length-1;k>=0;k--)o.lineTo(c[k].px,F(_(c[k])));o.closePath(),o.fillStyle=E,o.fill()};u(S=>S.pinBot,S=>1-S.pinBot,en.lower,1);for(const S of[1,-1])u(_=>_.cheatTop,_=>_.cheatBot,en.cheat,S),u(_=>_.cheatBot,_=>_.pinBot,en.pin,S);const v=[];for(let S=2.32;S<=3.7;S+=.1)v.push([s.uOf(S)*2048,s.topV(S,S>3.4?.45-(S-3.4)*.9:.45)*1024]);o.fillStyle="#2a2d31";for(const S of[1,-1]){const _=S>0?0:1024;o.beginPath(),o.moveTo(v[0][0],_);for(const[E,T]of v)o.lineTo(E,S>0?T:1024-T);o.lineTo(v[v.length-1][0],_),o.closePath(),o.fill()}const p=s.uOf(4.22)*2048;o.fillStyle="#2e3136",o.fillRect(0,0,p,1024),o.fillStyle="#9aa0a6",o.fillRect(p-6,0,6,1024),o.fillStyle="#1b1d20";for(let S=0;S<12;S++)o.fillRect(p*.45,S/12*1024+6,p*.15,1024/12-12);Hu(o,s,2048,1024,en.registration,-3.05,.47,.18,"bold",'"Helvetica Neue", Arial, sans-serif',en.cheat),Hu(o,s,2048,1024,"BAHÍA VISTA AIR TAXI",-.25,.1,.085,"bold italic",'Georgia, "Times New Roman", serif',en.cheat);const g=[3.9,3.2,2.32,1.85,0,-.9,-1.6,-2.6,-3.7,-4.7].map(S=>s.uOf(S));Ba(a,o,2048,1024,g,[.12,.2,.3,.42,.5,.58,.7,.8,.88],26),a.strokeStyle="#3a3a3a",a.lineWidth=3,o.strokeStyle="rgba(20,20,25,0.35)",o.lineWidth=2;const f=s.uOf(1.77)*2048,m=s.uOf(.95)*2048;for(const S of[1,-1]){const _=s.vOf(1.3,.4)??.2,E=s.vOf(1.3,-.42)??.4,T=(S>0?_:1-_)*1024,F=(S>0?E:1-E)*1024,k=Math.min(T,F),I=Math.abs(F-T);a.strokeRect(f,k,m-f,I),o.strokeRect(f,k,m-f,I);const O=s.vOf(1,.05)??.25;o.fillStyle="#8a8f94",o.fillRect(m-40,(S>0?O:1-O)*1024-4,22,8)}const y=s.uOf(2.75),w=d(2.75,-.5),x=s.uOf(-.9),b=(S,_,E)=>{const T=S.createLinearGradient(y*2048,0,x*2048,0);T.addColorStop(0,`rgba(${_},${E})`),T.addColorStop(.3,`rgba(${_},${E*.5})`),T.addColorStop(1,`rgba(${_},0)`),S.fillStyle=T,S.beginPath(),S.moveTo(y*2048,(w-.018)*1024),S.lineTo(x*2048,(w-.05)*1024),S.lineTo(x*2048,(w+.05)*1024),S.lineTo(y*2048,(w+.018)*1024),S.closePath(),S.fill()};b(o,"25,22,20",.5);for(let S=0;S<16;S++){const _=s.uOf(n.range(3,4))*2048,E=(.5+n.range(-.06,.06))*1024,T=n.range(40,150),F=o.createLinearGradient(_,0,_+T,0);F.addColorStop(0,`rgba(35,30,22,${n.range(.14,.32)})`),F.addColorStop(1,"rgba(35,30,22,0)"),o.fillStyle=F,o.fillRect(_,E-n.range(1,2),T,n.range(2,4))}ko(o,n,2048,1024,140,.08);for(let S=0;S<60;S++){const _=n.range(204.8,1843.2),E=n.range(1024*.42,1024*.58);o.strokeStyle=`rgba(40,35,30,${n.range(.05,.2)})`,o.lineWidth=n.range(1,3),o.beginPath(),o.moveTo(_,E),o.lineTo(_+n.range(30,160),E+n.range(-3,3)),o.stroke()}o.fillStyle="rgba(255,255,255,0.05)",o.fillRect(0,0,2048,1024*.12),o.fillRect(0,1024*.88,2048,1024*.12),h.fillStyle="#5a5a5a",h.fillRect(0,0,2048,1024),h.fillStyle="#7a7a7a",h.fillRect(0,0,p,1024),b(h,"170,170,170",.7),ko(h,n,2048,1024,160,.25,"150,150,150");for(let S=0;S<400;S++){h.strokeStyle=`rgba(120,120,120,${n.range(.2,.5)})`,h.lineWidth=1;const _=n.range(0,2048),E=n.range(0,1024);h.beginPath(),h.moveTo(_,E),h.lineTo(_+n.range(-40,40),E+n.range(-6,6)),h.stroke()}const[M,A]=xn(2048/4,1024/4);A.scale(.25,.25),A.fillStyle="rgb(0,34,0)",A.fillRect(0,0,2048,1024),A.fillStyle="rgb(0,16,0)",A.fillRect(0,0,s.uOf(3.15)*2048,1024),A.fillStyle="rgb(0,120,0)";for(const S of[1,-1]){const _=S>0?0:1024;A.beginPath(),A.moveTo(v[0][0],_);for(const[E,T]of v)A.lineTo(E,S>0?T:1024-T);A.lineTo(v[v.length-1][0],_),A.closePath(),A.fill()}return b(A,"0,110,0",.8),{map:zn(i,!0),roughnessMap:zn(l,!1),normalMap:zn(Th(r,2.4),!1),clearcoatRoughnessMap:zn(M,!1)}}const Hs={WING_V1:.78,TAIL_V0:.8,TAIL_SPAN:2.55},S_=(s,t)=>Math.min(1,Math.max(0,s/t))*Hs.WING_V1,sc=(s,t)=>.997-(.997-Hs.TAIL_V0)*Math.min(1,Math.max(0,(t-s)/Hs.TAIL_SPAN));function E_(){const e=new $e("wing-paint"),[n,i]=xn(1024,1024),[o,r]=xn(1024,1024),[a,l]=xn(1024,1024),h=Hs.WING_V1,c=Hs.TAIL_V0,d=y=>y*h*1024,u=y=>(1-(1-c)*(1-y/Hs.TAIL_SPAN))*1024;r.fillStyle="#808080",r.fillRect(0,0,1024,1024),i.fillStyle=en.upper,i.fillRect(0,0,1024,1024),i.fillStyle=en.under,i.fillRect(1024*.5,0,1024*.5,d(1)),i.fillStyle=en.lower,i.fillRect(0,d(.905),1024,d(1)-d(.905)),i.fillStyle=en.cheat,i.fillRect(0,d(.885),1024,d(.905)-d(.885)),i.fillStyle=en.pin,i.fillRect(0,d(.876),1024,d(.885)-d(.876)),i.fillStyle=en.lower,i.fillRect(1024*.475,0,1024*.0325,1024);const v=[];for(let y=.04;y<.87;y+=.075)v.push(y*h);Ba(r,i,1024,1024,[.14,.33,.5,.67,.86],v,22,{y1:d(1)}),i.fillStyle="#2a2d31",i.fillRect(1024*.3,d(.12),1024*.11,d(.2)-d(.12)),i.fillStyle="#6d7277",i.beginPath(),i.arc(1024*.4,d(.27),9,0,7),i.fill();const p=Hs.TAIL_SPAN-.26,g=p-.05,f=g-.025;i.fillStyle=en.lower,i.fillRect(0,u(p),1024,1024-u(p)),i.fillStyle=en.cheat,i.fillRect(0,u(g),1024,u(p)-u(g)),i.fillStyle=en.pin,i.fillRect(0,u(f),1024,u(g)-u(f));const m=[];for(let y=.12;y<f-.1;y+=.55)m.push(u(y)/1024);Ba(r,i,1024,1024,[.3,.7],m,36,{y0:c*1024,strength:.5});for(let y=0;y<90;y++)i.fillStyle=`rgba(90,90,95,${e.range(.3,.7)})`,i.fillRect(1024*.5+e.range(-8,8),e.range(0,1024),e.range(1,3),e.range(1,4));return ko(i,e,1024,1024,80,.06),l.fillStyle="#5a5a5a",l.fillRect(0,0,1024,1024),l.fillStyle="#909090",l.fillRect(1024*.3,d(.12),1024*.11,d(.2)-d(.12)),ko(l,e,1024,1024,90,.2,"150,150,150"),{map:zn(n,!0),roughnessMap:zn(a,!1),normalMap:zn(Th(o,2),!1)}}function A_(){const e=new $e("float-paint"),[n,i]=xn(1024,512),[o,r]=xn(1024,512),[a,l]=xn(1024,512);r.fillStyle="#808080",r.fillRect(0,0,1024,512),i.fillStyle="#cfd3d6",i.fillRect(0,0,1024,512);const h=.22,c=(d,u,v,p)=>{d.fillStyle=p,d.fillRect(0,u*512,1024,(v-u)*512),d.fillRect(0,(1-v)*512,1024,(v-u)*512)};c(i,h,.5,"#b9bec2"),c(i,.445,.5,en.lower),c(i,0,.105,"#c3c7ca"),c(i,0,.066,"#2b2e31"),c(i,.105,.118,"#9aa0a5");for(const d of[1,-1]){const u=p=>(d>0?p:1-p)*512,v=i.createLinearGradient(0,u(.165),0,u(.31));v.addColorStop(0,"rgba(60,72,70,0)"),v.addColorStop(.08,"rgba(60,72,70,0.55)"),v.addColorStop(.35,"rgba(70,84,80,0.42)"),v.addColorStop(1,"rgba(70,84,80,0)"),i.fillStyle=v,i.fillRect(0,Math.min(u(.165),u(.31)),1024,Math.abs(u(.31)-u(.165)))}c(i,h-.012,h+.012,en.cheat),Ba(r,i,1024,512,[.1,.2,.3,.4,.5,.58,.66,.76,.86,.94],[.118,.5],24,{strength:.8}),r.strokeStyle="#4a4a4a",r.lineWidth=2.5;for(const d of[h,1-h])r.beginPath(),r.moveTo(0,d*512),r.lineTo(1024,d*512),r.stroke();for(let d=0;d<140;d++){const u=e.next()<.5?1:-1,v=m=>(u>0?m:1-m)*512;i.strokeStyle=`rgba(62,80,72,${e.range(.08,.3)})`,i.lineWidth=e.range(1,3);const p=e.range(0,1024),g=v(e.range(.17,.2)),f=e.range(8,40)*u;i.beginPath(),i.moveTo(p,g),i.lineTo(p+e.range(-4,4),g+f),i.stroke()}return ko(i,e,1024,512,90,.08,"60,60,55"),l.fillStyle="#6a6a6a",l.fillRect(0,0,1024,512),c(l,0,.118,"#8a8a8a"),c(l,0,.066,"#c0c0c0"),c(l,.17,.3,"#9a9a9a"),ko(l,e,1024,512,100,.25,"160,160,160"),{map:zn(n,!0),roughnessMap:zn(a,!1),normalMap:zn(Th(o,2.2),!1)}}const sn={W:1.3,H:.4,PPM:1500,GRAIN:120,PLACARDS:90},Mi={w:Math.round(sn.W*sn.PPM),face:Math.round(sn.H*sn.PPM)},ks=Mi.face+sn.GRAIN+sn.PLACARDS,eh={asi:{x:-.435,y:.112,r:.042},adi:{x:-.335,y:.112,r:.042},alt:{x:-.235,y:.112,r:.042},tc:{x:-.435,y:.012,r:.042},hdg:{x:-.335,y:.012,r:.042},vsi:{x:-.235,y:.012,r:.042},clock:{x:-.565,y:.125,r:.03},suction:{x:-.565,y:.04,r:.026},rpm:{x:.375,y:.118,r:.036},map:{x:.47,y:.118,r:.036},oilp:{x:.34,y:.03,r:.024},oilt:{x:.405,y:.03,r:.024},fuell:{x:.47,y:.03,r:.024},fuelr:{x:.535,y:.03,r:.024},egt:{x:.36,y:-.04,r:.022},amp:{x:.42,y:-.04,r:.022},cht:{x:.48,y:-.04,r:.022}},xi={x:.085,y:.098,w:.2,h:.135};function Gu(s,t){if(s<=t[0][0])return t[0][1];for(let e=1;e<t.length;e++)if(s<=t[e][0]){const[n,i]=t[e-1],[o,r]=t[e];return i+(r-i)*((s-n)/(o-n))}return t[t.length-1][1]}const oc=s=>Math.min(1,Math.max(0,s)),ze={asi:s=>Gu(s,[[0,0],[40,30],[60,72],[80,117],[100,162],[120,207],[140,250],[160,287],[180,318],[200,342]]),alt100:s=>(s%1e3+1e3)%1e3*.36,alt1000:s=>(s%1e4+1e4)%1e4*.036,vsi:s=>270+Math.sign(s)*Gu(Math.abs(s),[[0,0],[500,52],[1e3,92],[1500,126],[2e3,158]]),rpm:s=>-135+oc(s/3e3)*270,map:s=>-135+oc((s-10)/25)*270,small:s=>-120+oc(s)*240},Re=s=>(s+sn.W/2)*sn.PPM,Se=s=>(sn.H/2-s)*sn.PPM,Fn=s=>s*sn.PPM,Zi=s=>(s-90)*Math.PI/180,ls=(s,t,e,n)=>({u0:s/Mi.w,v0:1-n/ks,u1:e/Mi.w,v1:1-t/ks}),Ha=Mi.face,Ke=Mi.face+sn.GRAIN,cs={face:ls(0,0,Mi.w,Mi.face),grain:ls(0,Ha+4,Mi.w,Ha+sn.GRAIN-4),exit:ls(4,Ke+6,224,Ke+84),belts:ls(234,Ke+6,494,Ke+84),compass:ls(504,Ke+6,664,Ke+84),yoke:ls(674,Ke+6,794,Ke+84),nameplate:ls(804,Ke+6,1164,Ke+84),domeLens:ls(1174,Ke+6,1254,Ke+84)};function Oi(s,t,e,n,i=!0){const o=s.createLinearGradient(t,e-n*1.18,t,e+n*1.18);o.addColorStop(0,"#6c7178"),o.addColorStop(.5,"#3a3e44"),o.addColorStop(1,"#22252a"),s.fillStyle=o,s.beginPath(),s.arc(t,e,n*1.18,0,7),s.fill(),s.fillStyle="#0c0d10",s.beginPath(),s.arc(t,e,n*1.03,0,7),s.fill();const r=s.createRadialGradient(t,e,n*.9,t,e,n*1.03);if(r.addColorStop(0,"rgba(0,0,0,0)"),r.addColorStop(1,"rgba(0,0,0,0.7)"),s.fillStyle=r,s.beginPath(),s.arc(t,e,n*1.03,0,7),s.fill(),s.fillStyle="#07080a",s.beginPath(),s.arc(t,e,n,0,7),s.fill(),i)for(const a of[45,135,225,315])_r(s,t+Math.cos(Zi(a))*n*1.11,e+Math.sin(Zi(a))*n*1.11,n*.055)}function _r(s,t,e,n){const i=s.createRadialGradient(t-n*.3,e-n*.3,0,t,e,n);i.addColorStop(0,"#c9ccd1"),i.addColorStop(1,"#5a5e64"),s.fillStyle=i,s.beginPath(),s.arc(t,e,n,0,7),s.fill(),s.strokeStyle="#2a2c30",s.lineWidth=Math.max(1,n*.3),s.beginPath(),s.moveTo(t-n*.7,e),s.lineTo(t+n*.7,e),s.moveTo(t,e-n*.7),s.lineTo(t,e+n*.7),s.stroke()}function Wn(s,t,e,n,i,o,r,a,l="#f2f2f2"){const h=Zi(i);s.strokeStyle=l,s.lineWidth=a,s.lineCap="butt",s.beginPath(),s.moveTo(t+Math.cos(h)*n*o,e+Math.sin(h)*n*o),s.lineTo(t+Math.cos(h)*n*r,e+Math.sin(h)*n*r),s.stroke()}function qe(s,t,e,n,i,o,r,a,l="#f2f2f2",h="bold"){const c=Zi(i);s.fillStyle=l,s.font=`${h} ${Math.round(n*a)}px Arial`,s.textAlign="center",s.textBaseline="middle",s.fillText(r,t+Math.cos(c)*n*o,e+Math.sin(c)*n*o)}function pr(s,t,e,n,i,o,r,a,l){s.strokeStyle=l,s.lineWidth=a,s.beginPath(),s.arc(t,e,n*r,Zi(i),Zi(o)),s.stroke()}function un(s,t,e,n,i,o="#e4e4e4",r="bold",a="center"){s.fillStyle=o,s.font=`${r} ${i}px Arial`,s.textAlign=a,s.textBaseline="middle",s.fillText(n,t,e)}function hs(s,t,e,n,i,o,r="#f0f0f0",a="#111214",l=0){s.fillStyle=a,s.fillRect(t,e,n,i),s.strokeStyle="rgba(255,255,255,0.35)",s.lineWidth=1.5,s.strokeRect(t+1,e+1,n-2,i-2);const h=l||Math.min(i/(o.length+.6),n/Math.max(...o.map(c=>c.length))*1.8);o.forEach((c,d)=>un(s,t+n/2,e+i*((d+1)/(o.length+1)),c,h,r,"bold"))}function T_(s,t,e,n,i){s.fillStyle="#3a3e44",s.fillRect(t-13,e-22,26,44),s.fillStyle="#0e0f11",s.fillRect(t-10,e-19,20,38);const o=s.createLinearGradient(0,e-18,0,e+18);o.addColorStop(0,n?"#eceff2":"#8d9198"),o.addColorStop(1,n?"#a7abb1":"#d7dadf"),s.fillStyle=o,s.fillRect(t-8,e-(n?17:0),16,17),un(s,t,e+32,i,9,"#e8e8e8")}function C_(){const s=Mi.w,t=Mi.face,e=new $e("panel-brush"),[n,i]=xn(s,ks);i.fillStyle="#25282c",i.fillRect(0,0,s,t);for(let p=0;p<9e3;p++)i.fillStyle=`rgba(${e.next()>.5?"255,255,255":"0,0,0"},${e.next()*.05})`,i.fillRect(e.next()*s,e.next()*t,2,2);const o=(p,g,f,m)=>{i.fillStyle="#2c2f34",i.fillRect(Re(p),Se(m),Re(f)-Re(p),Se(g)-Se(m)),i.strokeStyle="rgba(0,0,0,0.6)",i.lineWidth=3,i.strokeRect(Re(p),Se(m),Re(f)-Re(p),Se(g)-Se(m)),i.strokeStyle="rgba(255,255,255,0.12)",i.lineWidth=1.5,i.strokeRect(Re(p)+3,Se(m)+3,Re(f)-Re(p)-6,Se(g)-Se(m)-6);for(const[y,w]of[[p+.012,m-.012],[f-.012,m-.012],[p+.012,g+.012],[f-.012,g+.012]])_r(i,Re(y),Se(w),5)};o(-.6,-.045,-.175,.175),o(-.03,-.045,.2,.175),o(.29,-.075,.62,.175),o(-.63,-.19,.63,-.085);for(let p=-.62;p<=.63;p+=.125)_r(i,Re(p),Se(.188),5),_r(i,Re(p),Se(-.192),5);const r=eh,a=p=>[Re(p.x),Se(p.y),Fn(p.r)];{const[p,g,f]=a(r.asi);Oi(i,p,g,f),pr(i,p,g,f,ze.asi(48),ze.asi(95),.9,f*.07,"#f4f4f4"),pr(i,p,g,f,ze.asi(58),ze.asi(140),.8,f*.07,"#2fbf58"),pr(i,p,g,f,ze.asi(140),ze.asi(180),.8,f*.07,"#f2c230"),Wn(i,p,g,f,ze.asi(180),.72,.94,f*.06,"#e0322a");for(let m=40;m<=200;m+=10)Wn(i,p,g,f,ze.asi(m),m%20?.68:.62,.76,m%20?f*.025:f*.04);for(let m=40;m<=200;m+=20)qe(i,p,g,f,ze.asi(m),.47,String(m),.2);qe(i,p,g,f,180,.22,"KNOTS",.1,"#d0d0d0","normal"),qe(i,p,g,f,0,.28,"AIRSPEED",.1,"#d0d0d0","normal")}{const[p,g,f]=a(r.adi);Oi(i,p,g,f),i.fillStyle="#15171a",i.beginPath(),i.arc(p,g,f,0,7),i.fill()}{const[p,g,f]=a(r.alt);Oi(i,p,g,f);for(let m=0;m<50;m++)Wn(i,p,g,f,m*7.2,m%5?.8:.72,.9,m%5?f*.025:f*.05);for(let m=0;m<10;m++)qe(i,p,g,f,m*36,.58,String(m),.24);qe(i,p,g,f,180,.3,"ALT",.12,"#d0d0d0","normal"),qe(i,p,g,f,180,.42,"FEET",.09,"#d0d0d0","normal"),i.fillStyle="#0a0b0d",i.fillRect(p+f*.36,g-f*.1,f*.34,f*.2),un(i,p+f*.53,g,"29.92",f*.13,"#e8e8e8","normal")}{const[p,g,f]=a(r.tc);Oi(i,p,g,f);for(const m of[-90,-70,70,90])Wn(i,p,g,f,m,.74,.9,f*.05);qe(i,p,g,f,180,.25,"TURN COORDINATOR",.085,"#d0d0d0","normal"),qe(i,p,g,f,-70,.62,"L",.14),qe(i,p,g,f,70,.62,"R",.14),qe(i,p,g,f,180,.85,"2 MIN",.085,"#d0d0d0","normal"),i.strokeStyle="#d9dde3",i.lineWidth=f*.02,i.beginPath(),i.arc(p,g-f*.62,f*1.15,Math.PI*.36,Math.PI*.64),i.stroke(),i.strokeStyle="rgba(255,255,255,0.10)",i.lineWidth=f*.17,i.beginPath(),i.arc(p,g-f*.62,f*1.15,Math.PI*.36,Math.PI*.64),i.stroke(),i.strokeStyle="#e8e8e8",i.lineWidth=f*.025;for(const m of[-1,1])i.beginPath(),i.moveTo(p+m*f*.1,g+f*.44),i.lineTo(p+m*f*.1,g+f*.62),i.stroke()}{const[p,g,f]=a(r.hdg);Oi(i,p,g,f),i.fillStyle="#15171a",i.beginPath(),i.arc(p,g,f,0,7),i.fill();for(const m of[0,45,90,135,180,225,270,315])Wn(i,p,g,f,m,.93,1,f*.04,m===0?"#ff9a2e":"#e8e8e8")}{const[p,g,f]=a(r.vsi);Oi(i,p,g,f);for(const m of[-1,1])for(let y=0;y<=2e3;y+=100)Wn(i,p,g,f,ze.vsi(m*y),y%500?.78:.7,.88,y%500?f*.025:f*.05);for(const m of[-1,1])for(const y of[500,1e3,1500,2e3])qe(i,p,g,f,ze.vsi(m*y),.52,String(y/100),.2);qe(i,p,g,f,270,.52,"0",.2),qe(i,p,g,f,90,.3,"VERTICAL",.085,"#d0d0d0","normal"),qe(i,p,g,f,90,.44,"SPEED",.085,"#d0d0d0","normal"),qe(i,p,g,f,350,.22,"UP",.09,"#d0d0d0","normal"),qe(i,p,g,f,190,.22,"DOWN",.09,"#d0d0d0","normal")}{const[p,g,f]=a(r.clock);Oi(i,p,g,f);for(let m=0;m<60;m++)Wn(i,p,g,f,m*6,m%5?.84:.76,.92,m%5?f*.03:f*.06);for(let m=1;m<=12;m++)qe(i,p,g,f,m*30,.6,String(m),.22);Wn(i,p,g,f,315,0,.5,f*.07,"#f2f2f2"),Wn(i,p,g,f,60,0,.72,f*.05,"#f2f2f2"),i.fillStyle="#f2f2f2",i.beginPath(),i.arc(p,g,f*.07,0,7),i.fill()}{const[p,g,f]=a(r.suction);Oi(i,p,g,f);for(let m=0;m<=10;m++)Wn(i,p,g,f,ze.small(m/10),m%5?.8:.7,.9,m%5?f*.03:f*.06);pr(i,p,g,f,ze.small(.45),ze.small(.6),.62,f*.08,"#2fbf58"),qe(i,p,g,f,180,.45,"SUCTION",.12,"#d0d0d0","normal"),Wn(i,p,g,f,ze.small(.52),-.15,.7,f*.06,"#f2f2f2")}const l=(p,g,f,m,y,w,x,b,M=!1)=>{const[A,S,_]=a(p);Oi(i,A,S,_,M);const E=T=>M?-135+T*270:ze.small(T);pr(i,A,S,_,E(w),E(x),.82,_*.07,"#2fbf58"),y!==null&&Wn(i,A,S,_,E(y),.7,.92,_*.06,"#e0322a");for(let T=0;T<=m;T++)Wn(i,A,S,_,E(T/m),.72,.86,_*.045);for(let T=0;T<=m;T++)qe(i,A,S,_,E(T/m),.55,b(T),M?.17:.2);qe(i,A,S,_,180,.32,g,M?.12:.14,"#d0d0d0","normal"),f&&qe(i,A,S,_,180,.5,f,M?.09:.11,"#d0d0d0","normal")};l(r.rpm,"RPM","x100",6,2600/3e3,1800/3e3,2600/3e3,p=>String(p*5),!0),l(r.map,"MAN PRESS","IN HG",5,null,.4,.84,p=>String(10+p*5),!0),l(r.oilp,"OIL","PSI",4,.95,.5,.85,p=>String(p*25)),l(r.oilt,"OIL","TEMP",4,.92,.35,.8,p=>String(50+p*50)),l(r.fuell,"FUEL","L",4,null,.15,1,p=>["E","¼","½","¾","F"][p]),l(r.fuelr,"FUEL","R",4,null,.15,1,p=>["E","¼","½","¾","F"][p]),l(r.egt,"EGT","",4,null,.3,.8,p=>String(p*4)),l(r.amp,"AMP","",4,null,.45,.65,p=>String(-60+p*30)),l(r.cht,"CHT","",4,.9,.3,.75,p=>String(p*1));{const p=Re(xi.x-xi.w/2),g=Se(xi.y+xi.h/2),f=Fn(xi.w),m=Fn(xi.h);i.fillStyle="#34383e",i.fillRect(p-22,g-22,f+44,m+44),i.fillStyle="#0a0c0f",i.fillRect(p-4,g-4,f+8,m+8);for(let w=0;w<4;w++)i.fillStyle="#1b1d21",i.fillRect(p+10+w*(f/4),g+m+6,f/4-20,12);for(const[w,x]of[[p-11,g-11],[p+f+11,g-11],[p-11,g+m+11],[p+f+11,g+m+11]])_r(i,w,x,4);un(i,p+f/2,g-12,"GNS 530  ·  BAHÍA VISTA AIR TAXI",9,"#c8ccd2","normal");const y=(w,x,b,M)=>{const A=Re(-.02),S=Re(.19),_=Fn(.036);i.fillStyle="#34383e",i.fillRect(A,w,S-A,_),i.fillStyle="#0a0c0f",i.fillRect(A+6,w+6,S-A-12,_-12),i.fillStyle="#0b1d10",i.fillRect(A+16,w+12,(S-A)*.32,_-24),i.fillRect(A+(S-A)*.55,w+12,(S-A)*.32,_-24),un(i,A+16+(S-A)*.16,w+_/2,x,_*.42,"#ffb347","bold"),un(i,A+(S-A)*.71,w+_/2,b,_*.42,"#ffb347","bold");for(const E of[A+10,S-10])i.fillStyle="#5a5e64",i.beginPath(),i.arc(E,w+_/2,_*.28,0,7),i.fill(),i.fillStyle="#23262a",i.beginPath(),i.arc(E,w+_/2,_*.16,0,7),i.fill();un(i,(A+S)/2,w+_/2,M,_*.22,"#a8adb5","normal")};y(Se(.012),"121.90","118.30","COM"),y(Se(-.03),"110.50","4213","NAV / XPDR")}hs(i,Re(-.6)+4,Se(-.055),Fn(.11),Fn(.026),["N726BV"],"#f4f4f4","#111214",22),hs(i,Re(-.485),Se(-.055),Fn(.19),Fn(.026),["NO SMOKING  ·  FASTEN SEAT BELTS"],"#f4f4f4","#111214",12),hs(i,Re(-.29),Se(-.055),Fn(.11),Fn(.026),["Vfe 95 · Vne 180"],"#f4f4f4","#7a1a14",12),hs(i,Re(-.03),Se(-.078),Fn(.22),Fn(.02),["THIS AIRCRAFT MUST BE OPERATED IN ACCORDANCE WITH THE APPROVED FLIGHT MANUAL"],"#e8e8e8","#111214",7),hs(i,Re(.29)+4,Se(-.095),Fn(.32),Fn(.024),["DHC-2 TYPE FLOATPLANE  ·  MAX GROSS 2350 KG  ·  FUEL 100LL"],"#f4f4f4","#111214",10),["MASTER","ALT","AVIONICS","FUEL PUMP","PITOT HT","NAV","STROBE","BEACON","LDG","TAXI","PANEL","DOME"].forEach((p,g)=>T_(i,Re(-.56+g*.05),Se(-.13),g<3||g===5||g===7,p));{const p=Re(.06),g=Se(-.13);i.fillStyle="#3a3e44",i.beginPath(),i.arc(p,g,26,0,7),i.fill(),i.fillStyle="#0e0f11",i.beginPath(),i.arc(p,g,20,0,7),i.fill();for(const[f,m]of[[-70,"OFF"],[-35,"R"],[0,"L"],[35,"BOTH"],[70,"START"]])un(i,p+Math.cos(Zi(f))*36,g+Math.sin(Zi(f))*36,m,8,"#e8e8e8","normal");i.fillStyle="#c9ccd1",i.save(),i.translate(p,g),i.rotate(Zi(35)),i.fillRect(-3,-3,22,6),i.restore()}{const p=Re(.13),g=Se(-.13);i.fillStyle="#7a1a14",i.fillRect(p-24,g-28,48,56),i.fillStyle="#c0392b",i.fillRect(p-16,g-20,32,40),un(i,p,g-8,"FUEL",9,"#fff"),un(i,p,g+6,"CUT",9,"#fff"),un(i,p,g+18,"OFF",9,"#fff")}for(let p=0;p<16;p++){const g=Re(.22+p*.024),f=Se(-.125);i.fillStyle="#0f1013",i.beginPath(),i.arc(g,f,9,0,7),i.fill(),i.fillStyle="#d8dbe0",i.beginPath(),i.arc(g,f,6,0,7),i.fill()}un(i,Re(.4),Se(-.16),"CIRCUIT BREAKERS  ·  PULL OFF",9,"#c8ccd2","normal");for(const[p,g]of[[.61,"PANEL"],[.56,"RADIO"]])i.fillStyle="#5a5e64",i.beginPath(),i.arc(Re(p),Se(-.125),13,0,7),i.fill(),un(i,Re(p),Se(-.158),g,8,"#c8ccd2","normal");i.fillStyle="#1f2124",i.fillRect(0,Ha,s,sn.GRAIN);for(let p=0;p<26e3;p++){const g=e.next();i.fillStyle=g>.5?`rgba(255,255,255,${(g-.5)*.12})`:`rgba(0,0,0,${(.5-g)*.5})`,i.fillRect(e.next()*s,Ha+e.next()*sn.GRAIN,1+e.next()*2,1+e.next()*2)}i.fillStyle="#000",i.fillRect(0,Ke,s,sn.PLACARDS),hs(i,4,Ke+6,220,78,["EXIT","PULL HANDLE UP · PUSH DOOR"],"#111214","#e8b830",0),hs(i,234,Ke+6,260,78,["FASTEN SEAT BELT","WHILE SEATED"],"#f0f0f0","#111214",0);{const g=Ke+6;i.fillStyle="#0a0a0c",i.fillRect(504,g,160,78),i.fillStyle="#f2f2f2";for(let f=0;f<17;f++){const m=512+f*9;i.fillRect(m,g+40,2,f%4===0?20:10)}un(i,530,g+26,"33",18,"#f2f2f2"),un(i,584,g+26,"N",22,"#f2f2f2"),un(i,638,g+26,"3",18,"#f2f2f2"),i.fillStyle="#ffb347",i.fillRect(583,g+38,3,40)}hs(i,674,Ke+6,120,78,["GARZA 7","N726BV"],"#f0f0f0","#1a1c20",0);{const g=Ke+6,f=i.createLinearGradient(804,g,804,g+78);f.addColorStop(0,"#cfd4da"),f.addColorStop(1,"#8a9099"),i.fillStyle=f,i.fillRect(804,g,360,78),i.strokeStyle="#2a2c30",i.lineWidth=3,i.strokeRect(807,g+3,354,72),un(i,984,g+24,"BAHÍA VISTA AIR TAXI",22,"#1c2d5a","bold italic"),un(i,984,g+56,"GARZA 7 · FLOATPLANE · N726BV",14,"#1c2d5a","normal")}{const g=Ke+6,f=i.createRadialGradient(1214,g+39,4,1214,g+39,40);f.addColorStop(0,"#ffffff"),f.addColorStop(1,"#c8cbd0"),i.fillStyle=f,i.fillRect(1174,g,80,78)}const c=zn(n,!0,8);c.flipY=!0,c.wrapS=Qe,c.wrapT=Qe;const[d,u]=xn(s,ks);u.fillStyle="#000",u.fillRect(0,0,s,ks),u.drawImage(n,0,0),u.globalCompositeOperation="multiply",u.fillStyle="#5a5a60",u.fillRect(0,0,s,ks),u.globalCompositeOperation="source-over",u.fillStyle="#000",u.fillRect(0,Se(-.085),s,ks-Se(-.085)),u.fillStyle="rgba(0,0,0,0.6)",u.fillRect(0,0,s,t),u.fillStyle="#e8e6dc",u.fillRect(1174,Ke+6,80,78);const v=zn(d,!0,4);return v.flipY=!0,v.wrapS=Qe,v.wrapT=Qe,{map:c,emissive:v}}const Qn={size:512,ball:{x:0,y:0,s:256},card:{x:256,y:0,s:256},ballRadius:1.9,ballDegPerRadius:57,patches:{white:[16,300],black:[80,300],orange:[144,300],red:[208,300],bezel:[272,300],grey:[336,300],yellow:[400,300],glass:[464,300]}};function R_(){const s=Qn.size,[t,e]=xn(s,s);e.fillStyle="#000",e.fillRect(0,0,s,s);{const{x:r,y:a,s:l}=Qn.ball,h=r+l/2,c=a+l/2,d=l/2,u=d/Qn.ballDegPerRadius;e.save(),e.beginPath(),e.arc(h,c,d,0,7),e.clip();const v=e.createLinearGradient(0,c-d,0,c);v.addColorStop(0,"#2b7fd0"),v.addColorStop(1,"#4aa0e8"),e.fillStyle=v,e.fillRect(r,a,l,l/2);const p=e.createLinearGradient(0,c,0,c+d);p.addColorStop(0,"#9a6a3a"),p.addColorStop(1,"#6b4322"),e.fillStyle=p,e.fillRect(r,c,l,l/2),e.fillStyle="#f4f4f4",e.fillRect(r,c-1.5,l,3);for(let g=5;g<=35;g+=5){const f=g%10?d*.16:d*.34;for(const m of[-1,1]){const y=c-m*g*u;e.fillRect(h-f/2,y-1.2,f,2.4),g%10===0&&(e.font=`bold ${Math.round(d*.11)}px Arial`,e.textAlign="center",e.textBaseline="middle",e.fillText(String(g),h-f/2-d*.09,y),e.fillText(String(g),h+f/2+d*.09,y))}}e.restore()}{const{x:r,y:a,s:l}=Qn.card,h=r+l/2,c=a+l/2,d=l/2;e.fillStyle="#101214",e.beginPath(),e.arc(h,c,d,0,7),e.fill();for(let u=0;u<360;u+=5){const v=(u-90)*Math.PI/180,p=u%30?u%10?d*.06:d*.1:d*.14;e.fillStyle="#f2f2f2",e.save(),e.translate(h+Math.cos(v)*d*.98,c+Math.sin(v)*d*.98),e.rotate(v+Math.PI/2),e.fillRect(-1.2,0,2.4,p),e.restore()}for(let u=0;u<360;u+=30){const v=(u-90)*Math.PI/180,p=u===0?"N":u===90?"E":u===180?"S":u===270?"W":String(u/10);e.save(),e.translate(h+Math.cos(v)*d*.66,c+Math.sin(v)*d*.66),e.rotate(v+Math.PI/2),e.fillStyle=u===0?"#ff9a2e":"#f2f2f2",e.font=`bold ${Math.round(d*(u%90?.17:.22))}px Arial`,e.textAlign="center",e.textBaseline="middle",e.fillText(p,0,0),e.restore()}}const n=Qn.patches,i=(r,a)=>{const[l,h]=n[r];e.fillStyle=a,e.fillRect(l-16,h-16,32,32)};i("white","#f4f4f4"),i("black","#0b0c0e"),i("orange","#ff8a1f"),i("red","#d8322e"),i("bezel","#2e3136"),i("grey","#9a9ea4"),i("yellow","#f2c230"),i("glass","#0b0c0e");const o=zn(t,!0,8);return o.flipY=!0,o.wrapS=Qe,o.wrapT=Qe,o}class P_{texture;ctx;w=320;h=216;last="";constructor(){const[t,e]=xn(this.w,this.h);this.ctx=e,this.texture=zn(t,!0,4),this.texture.flipY=!0,this.texture.wrapS=Qe,this.texture.wrapT=Qe,this.draw(0,0,0,0)}draw(t,e,n,i){const o=Math.round(t),r=(Math.round(e)%360+360)%360,a=Math.round(n/10)*10,l=Math.round(i/50)*50,h=`${o}|${r}|${a}|${l}`;if(h===this.last)return!1;this.last=h;const c=this.ctx,d=this.w,u=this.h,v=206;return c.fillStyle="#071a2e",c.fillRect(0,0,d,u),c.save(),c.beginPath(),c.rect(0,0,v,u),c.clip(),c.translate(v/2,u*.62),c.rotate(-r*Math.PI/180),c.fillStyle="#12508a",c.fillRect(-400,-400,800,800),c.fillStyle="#5c9e4a",c.beginPath(),c.ellipse(40,-110,160,46,.35,0,7),c.fill(),c.fillStyle="#7fb56a",c.beginPath(),c.ellipse(-120,60,70,34,-.2,0,7),c.fill(),c.fillStyle="#d9c890",c.beginPath(),c.ellipse(120,-60,40,14,.5,0,7),c.fill(),c.strokeStyle="#e6e6e6",c.lineWidth=3,c.beginPath(),c.moveTo(-160,20),c.lineTo(60,-90),c.stroke(),c.strokeStyle="#ff5fb0",c.lineWidth=3,c.setLineDash([10,6]),c.beginPath(),c.moveTo(0,60),c.lineTo(0,-320),c.stroke(),c.setLineDash([]),c.restore(),c.strokeStyle="rgba(255,255,255,0.35)",c.lineWidth=1,c.beginPath(),c.arc(v/2,u*.62,62,0,7),c.stroke(),c.fillStyle="#ffffff",c.save(),c.translate(v/2,u*.62),c.beginPath(),c.moveTo(0,-12),c.lineTo(3,-2),c.lineTo(12,2),c.lineTo(12,5),c.lineTo(3,3),c.lineTo(3,9),c.lineTo(6,11),c.lineTo(-6,11),c.lineTo(-3,9),c.lineTo(-3,3),c.lineTo(-12,5),c.lineTo(-12,2),c.lineTo(-3,-2),c.closePath(),c.fill(),c.restore(),c.font="bold 10px monospace",c.textAlign="left",c.textBaseline="top",c.fillStyle="#dfe8f2",c.fillText("TRK UP  2NM",5,4),c.fillText("DTK 090  RWY09",5,u-15),c.fillStyle="#04101c",c.fillRect(v,0,d-v,u),c.fillStyle="#20364d",c.fillRect(v,0,1,u),[["GS",`${o}`,"kt"],["TRK",`${r.toString().padStart(3,"0")}`,"°"],["ALT",`${a}`,"ft"],["VS",`${l>0?"+":""}${l}`,"fpm"]].forEach(([g,f,m],y)=>{const w=y*(u/4);c.fillStyle="#20364d",y&&c.fillRect(v,w,d-v,1),c.font="bold 11px monospace",c.textAlign="left",c.textBaseline="top",c.fillStyle="#8fb3d9",c.fillText(g,v+6,w+4),c.textAlign="right",c.fillText(m,d-5,w+4),c.font="bold 30px monospace",c.textBaseline="bottom",c.fillStyle=y===1?"#ff5fb0":"#f4f4f4",c.fillText(f,d-5,w+u/4-2)}),this.texture.needsUpdate=!0,!0}}function L_(){const t=new $e("glass-dirt"),[e,n]=xn(256,256);n.fillStyle="#000",n.fillRect(0,0,256,256);for(let o=0;o<260;o++){const r=t.range(0,256),a=t.range(0,256),l=t.range(6,40),h=n.createRadialGradient(r,a,0,r,a,l),c=t.range(.03,.14);h.addColorStop(0,`rgba(255,255,255,${c})`),h.addColorStop(1,"rgba(255,255,255,0)"),n.fillStyle=h;for(const d of[-256,0,256])for(const u of[-256,0,256])n.fillRect(r-l+d,a-l+u,l*2,l*2)}for(let o=0;o<40;o++){n.strokeStyle=`rgba(255,255,255,${t.range(.03,.1)})`,n.lineWidth=t.range(.5,2);const r=t.range(0,256),a=t.range(0,256),l=t.range(20,90),h=t.range(-.4,.4);for(const c of[-256,0,256])for(const d of[-256,0,256])n.beginPath(),n.moveTo(r+c,a+d),n.lineTo(r+c+Math.cos(h)*l,a+d+Math.sin(h)*l),n.stroke()}return zn(e,!1,4)}function D_(){const[n,i]=xn(256,256),o=i.createRadialGradient(128,128,256*.07,128,128,256/2);o.addColorStop(0,"rgba(40,40,44,0.4)"),o.addColorStop(.35,"rgba(40,40,44,0.18)"),o.addColorStop(.9,"rgba(40,40,44,0.13)"),o.addColorStop(1,"rgba(40,40,44,0)"),i.fillStyle=o,i.fillRect(0,0,256,256);const r=1.3/(Math.PI*2);for(let l=0;l<3;l++){const h=i.createConicGradient(l/3*Math.PI*2,128,128);h.addColorStop(0,"rgba(18,18,22,0.2)"),h.addColorStop(r*.5,"rgba(18,18,22,0.08)"),h.addColorStop(r,"rgba(18,18,22,0)"),h.addColorStop(1,"rgba(18,18,22,0)"),i.fillStyle=h,i.beginPath(),i.arc(128,128,256*.49,0,Math.PI*2),i.fill()}i.strokeStyle="rgba(200,170,60,0.28)",i.lineWidth=7,i.beginPath(),i.arc(128,128,256*.46,0,Math.PI*2),i.stroke();const a=new Ur(n);return a.colorSpace=Dn,a}const mr=.05,rc=.4,zs=1.07,Vu=.78,gr=2.3,vr=-1.6,Xn=-.25,vo=2.05,xr=.3,Wu=1.66,I_=.52,qn=new C(.55,1.25,0),Jt={fixed:0,asi:1,adi:2,alt100:3,alt1000:4,tc:5,tcBall:6,hdg:7,vsi:8,rpm:9,map:10,oilp:11,oilt:12,egt:13,fuell:14,fuelr:15,adiBank:16},ba=17,Xu=1/15,Ct={metal:{color:9344154,roughness:.38,metalness:.9},darkMetal:{color:2895667,roughness:.45,metalness:.8},spinner:{color:12896462,roughness:.16,metalness:.95},exhaust:{color:5917244,roughness:.6,metalness:.9},rubber:{color:1118740,roughness:.92,metalness:0},headliner:{color:13223357,roughness:.92,metalness:0},bow:{color:14341838,roughness:.85,metalness:0},trim:{color:3027254,roughness:.82,metalness:.04},sidewall:{color:9078141,roughness:.88,metalness:0},doorTrim:{color:10328207,roughness:.86,metalness:0},plastic:{color:3816770,roughness:.7,metalness:0},lightPlastic:{color:12565684,roughness:.6,metalness:0},leather:{color:8017205,roughness:.55,metalness:0},carpet:{color:3485739,roughness:.95,metalness:0},belt:{color:3948356,roughness:.9,metalness:0},prop:{color:1974050,roughness:.5,metalness:.6},propTip:{color:15909424,roughness:.5,metalness:0},shirt:{color:3100527,roughness:.85,metalness:0},skin:{color:13145452,roughness:.7,metalness:0},headset:{color:1710620,roughness:.5,metalness:0},throttle:{color:1381912,roughness:.5,metalness:0},propKnob:{color:2777008,roughness:.5,metalness:0},mixture:{color:12597547,roughness:.6,metalness:0},flapKnob:{color:15263456,roughness:.5,metalness:0},extinguisher:{color:12597547,roughness:.4,metalness:.3}},mi={red:0,green:1,tail:2,beacon:3,strobe:4},cn=Math.PI/180;class z_{pos=[];nrm=[];uv=[];pivot=[];chan=[];clip=[];idx=[];vertex(t,e,n,i,o,r,a,l,h=0){return this.pos.push(n,i,o),this.nrm.push(0,0,1),this.uv.push(r,a),this.pivot.push(t,e,0),this.chan.push(l),this.clip.push(h),this.pos.length/3-1}tick(t,e,n,i,o,r,a,l){const h=(90-e)*cn,c=Math.cos(h),d=Math.sin(h),u=t.r*n,v=t.r*i,p=-d*o/2,g=c*o/2;this.poly(t,[[c*u-p,d*u-g],[c*u+p,d*u+g],[c*v+p,d*v+g],[c*v-p,d*v-g]],r,a,l)}patchUv(t){const[e,n]=Qn.patches[t];return[e/Qn.size,1-n/Qn.size]}poly(t,e,n,i,o){const[r,a]=this.patchUv(o),l=this.pos.length/3;for(const[h,c]of e)this.vertex(t.x,t.y,h,c,n,r,a,i);for(let h=1;h<e.length-1;h++)this.idx.push(l,l+h,l+h+1)}needle(t,e,n,i,o,r="white",a=.18){const l=t.r*e,h=t.r*a;this.poly(t,[[-n/2,-h],[n/2,-h],[n*.22,l],[-n*.22,l]],i,o,r)}cap(t,e,n,i,o="black"){this.disc(t,e,n,i,o,14)}disc(t,e,n,i,o,r=40,a,l=0){const h=Qn.size,[c,d]=this.patchUv(o),u=this.pos.length/3,v=(f,m)=>a?[(a.x+a.s/2+f/e*(a.s/2))/h,1-(a.y+a.s/2-m/e*(a.s/2))/h]:[c,d],[p,g]=v(0,0);this.vertex(t.x,t.y,0,0,n,p,g,i,l);for(let f=0;f<=r;f++){const m=f/r*Math.PI*2,y=Math.cos(m)*e,w=Math.sin(m)*e,[x,b]=v(y,w);this.vertex(t.x,t.y,y,w,n,x,b,i,l)}for(let f=0;f<r;f++)this.idx.push(u,u+1+f,u+2+f)}ring(t,e,n,i,o,r,a=40){const[l,h]=this.patchUv(r),c=this.pos.length/3;for(let d=0;d<=a;d++){const u=d/a*Math.PI*2,v=Math.cos(u),p=Math.sin(u);this.vertex(t.x,t.y,v*e,p*e,i,l,h,o),this.vertex(t.x,t.y,v*n,p*n,i,l,h,o)}for(let d=0;d<a;d++){const u=c+d*2;this.idx.push(u,u+1,u+2,u+1,u+3,u+2)}}bar(t,e,n,i,o,r,a,l){this.poly(t,[[e-i/2,n-o/2],[e+i/2,n-o/2],[e+i/2,n+o/2],[e-i/2,n+o/2]],r,a,l)}build(){const t=new oe;return t.setAttribute("position",new Mt(this.pos,3)),t.setAttribute("normal",new Mt(this.nrm,3)),t.setAttribute("uv",new Mt(this.uv,2)),t.setAttribute("aPivot",new Mt(this.pivot,3)),t.setAttribute("aChan",new Mt(this.chan,1)),t.setAttribute("aClip",new Mt(this.clip,1)),t.setIndex(this.idx),t}}class N_{root=new Ye;materials=[];glassMaterial;paintMaterial;propeller=new Ye;propDisc;propHub;propBlades;aileronL;aileronR;flapL;flapR;elevator;rudder;waterRudders=[];wheels;lights;lightPower={value:new Float32Array(5)};yokeL;yokeR;throttleLever;flapLever;pedalsL;pedalsR;instruments;gpsMesh;gps=new P_;instAngle={value:new Float32Array(ba)};instShift={value:new Float32Array(ba*2)};panelMat;instMat;gpsMat;canvasAcc=Xu;gaugeState={kt:0,ft:0,fpm:0,hdg:0,bankDeg:0,pitchDeg:0,rpm:0,map:0,turnRateDps:0,slip:0};exhaustPos=new C(2.6,-.55,.66);floatSternL=new C(-2.2,-2.15,-1.25);floatSternR=new C(-2.2,-2.15,1.25);floatBowL=new C(2.6,-2,-1.25);floatBowR=new C(2.6,-2,1.25);wingTipL=new C(-.04,1.4,-7.5);wingTipR=new C(-.04,1.4,7.5);cockpitEye=new C(1,1,-.3);exteriorMeshes=[];interiorMeshes=[];spanHalf=7.5;constructor(){const t=[{x:4.55,yc:.02,w:.3,top:.3,bot:.3,n:2},{x:4.35,yc:.02,w:.55,top:.55,bot:.55,n:2},{x:3.9,yc:.02,w:.72,top:.7,bot:.7,n:2.1},{x:3.2,yc:.03,w:.75,top:.72,bot:.7,n:2.3},{x:2.6,yc:.04,w:.77,top:.74,bot:.7,n:3,nBot:2.4},{x:2.3,yc:.05,w:.78,top:.76,bot:.7,n:6,nBot:2.4},{x:2.15,yc:.05,w:.79,top:.88,bot:.7,n:5.2,nBot:2.4},{x:2,yc:.05,w:.8,top:1.01,bot:.7,n:5.2,nBot:2.4},{x:1.85,yc:.05,w:.8,top:1.12,bot:.7,n:5.8,nBot:2.4},{x:1.73,yc:.05,w:.8,top:1.13,bot:.7,n:6.5,nBot:2.4},{x:.95,yc:.05,w:.8,top:1.13,bot:.7,n:6.5,nBot:2.4},{x:0,yc:.05,w:.8,top:1.13,bot:.68,n:6.5,nBot:2.4},{x:-.4,yc:.05,w:.79,top:1.12,bot:.66,n:5.8,nBot:2.4},{x:-.9,yc:.05,w:.76,top:1.08,bot:.62,n:4.4,nBot:2.4},{x:-1.25,yc:.055,w:.7,top:1,bot:.56,n:3.3,nBot:2.3},{x:-1.6,yc:.06,w:.62,top:.9,bot:.5,n:2.7,nBot:2.2},{x:-2.6,yc:.1,w:.44,top:.62,bot:.34,n:2.3,nBot:2.1},{x:-3.7,yc:.16,w:.28,top:.42,bot:.2,n:2.1},{x:-4.7,yc:.24,w:.15,top:.3,bot:.1,n:2},{x:-5.35,yc:.3,w:.06,top:.22,bot:.04,n:2}],e=[[1.77,.95,zs],[.85,-.42,zs],[-.52,-1.25,Vu]],n=l_(t,[gr,vr,...e.flatMap(([B,vt])=>[B,vt])]),i=B=>n.findIndex(vt=>Math.abs(vt.x-B)<1e-6),o=B=>B>=vr?rc:rc-(vr-B)/(5.35+vr)*.1,r=9,a=2,l=3,h=c_([{y:zs,segs:r,fallbackT:.1},{y:Vu,segs:a,fallbackT:.146},{y:B=>o(B.x),segs:l,fallbackT:.2125},{y:B=>o(B.x)-Ao.top,segs:1,fallbackT:.23},{y:B=>o(B.x)-Ao.bottom,segs:1,fallbackT:.26},{y:B=>o(B.x)-Ao.pin,segs:1,fallbackT:.27}],7),c=r,d=c+a,u=d+l,v=_a(n,h),p=v.R,g=ya(n,mr),f=_a(g,(B,vt)=>v.t[vt]),m=[];for(const[B,vt,_t]of e){const Xt=_t===zs?c:d;m.push({i0:i(B),i1:i(vt),j0:Xt,j1:u}),m.push({i0:i(B),i1:i(vt),j0:p-u,j1:p-Xt})}const y={i0:i(gr),i1:i(1.85),j0:p-d,j1:p+d};m.push(y);const w=(B,vt)=>m.some(_t=>Uu(_t,p,B,vt)),x=i(gr),b=i(vr),M=n[0].x,A=M-n[n.length-1].x,E=b_({length:A,uOf:B=>(M-B)/A,xOf:B=>M-B*A,vOf:(B,vt)=>{let _t=0;for(;_t<n.length-2&&n[_t+1].x>B;)_t++;const Xt=n[_t],De=n[_t+1],ke=mn.clamp((Xt.x-B)/Math.max(Xt.x-De.x,1e-6),0,1),Oe=bo(Xt,vt),Ae=bo(De,vt);return Oe===null&&Ae===null?null:Oe===null?Ae:Ae===null?Oe:Oe+(Ae-Oe)*ke},topV:(B,vt)=>{const _t=Jn(n,B),Xt=_t.n??2.2,De=Math.min(Math.abs(vt)/_t.w,.999);return bo(_t,_t.yc+_t.top*Math.pow(1-Math.pow(De,Xt),1/Xt)*.999)??0},perimeter:B=>r_(Jn(n,B)),sillY:o}),T=E_(),F=A_(),k=new sr({map:E.map,roughnessMap:E.roughnessMap,normalMap:E.normalMap,normalScale:new Rt(.55,.55),color:16777215,roughness:1,metalness:0,clearcoat:.7,clearcoatRoughness:1,clearcoatRoughnessMap:E.clearcoatRoughnessMap,envMapIntensity:1});k.shadowSide=nn;const I=new sr({map:T.map,roughnessMap:T.roughnessMap,normalMap:T.normalMap,normalScale:new Rt(.5,.5),color:16777215,roughness:1,metalness:0,clearcoat:.65,clearcoatRoughness:.14,envMapIntensity:1,vertexColors:!0}),O=new sr({map:F.map,roughnessMap:F.roughnessMap,normalMap:F.normalMap,normalScale:new Rt(.6,.6),color:16777215,roughness:1,metalness:.55,clearcoat:.2,clearcoatRoughness:.3,envMapIntensity:1}),U=new sr({color:10470354,transparent:!0,opacity:.1,roughness:.25,metalness:0,envMapIntensity:1,side:Ki,depthWrite:!1,specularIntensity:1,ior:1.52,premultipliedAlpha:!0}),P={uDirt:{value:L_()},uEnvGain:{value:3},uDirtAmount:{value:.35}};U.onBeforeCompile=B=>{Object.assign(B.uniforms,P),B.vertexShader=B.vertexShader.replace("#include <common>",`#include <common>
attribute vec4 aPane;
varying vec4 vPane;
varying vec2 vPaneUv;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vPane = aPane;
vPaneUv = uv;`),B.fragmentShader=B.fragmentShader.replace("#include <common>",`#include <common>
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
        `).replace("#include <premultiplied_alpha_fragment>","")},U.customProgramCacheKey=()=>"cockpit-glass-v7";const H=new sr({color:en.upper,roughness:.4,metalness:0,clearcoat:.6,clearcoatRoughness:.15}),G=M_(),N=C_(),Y=new ce({map:N.map,emissiveMap:N.emissive,emissive:16777215,emissiveIntensity:.12,roughness:.75,metalness:0}),V=R_(),Q=new ce({map:V,emissiveMap:V,emissive:16777215,emissiveIntensity:.15,roughness:.6,metalness:0});Q.onBeforeCompile=B=>{B.uniforms.uInstAngle=this.instAngle,B.uniforms.uInstShift=this.instShift,B.vertexShader=B.vertexShader.replace("#include <common>",`#include <common>
attribute vec3 aPivot;
attribute float aChan;
attribute float aClip;
varying vec2 vInstLocal;
varying float vInstClip;
uniform float uInstAngle[${ba}];
uniform vec2 uInstShift[${ba}];`).replace("#include <begin_vertex>",`
          int instCh = int(aChan + 0.5);
          float instC = cos(uInstAngle[instCh]), instS = sin(uInstAngle[instCh]);
          vec2 instQ = position.xy + uInstShift[instCh];
          vec3 transformed = vec3(aPivot.x + instC * instQ.x - instS * instQ.y, aPivot.y + instS * instQ.x + instC * instQ.y, aPivot.z + position.z);
          vInstLocal = transformed.xy - aPivot.xy;
          vInstClip = aClip;
        `),B.fragmentShader=B.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vInstLocal;
varying float vInstClip;`).replace("#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>
if (vInstClip > 0.0 && dot(vInstLocal, vInstLocal) > vInstClip * vInstClip) discard;`)},Q.customProgramCacheKey=()=>"cockpit-instruments-v2";const W=new ce({map:this.gps.texture,emissiveMap:this.gps.texture,emissive:16777215,emissiveIntensity:.55,roughness:.25,metalness:0});this.materials.push(k,I,O,U,H,G,Y,Q,W),this.glassMaterial=U,this.paintMaterial=k,this.panelMat=Y,this.instMat=Q,this.gpsMat=W;const q=(B,vt,_t={})=>{const Xt=new pe(B,vt);return Xt.castShadow=_t.cast??!0,Xt.receiveShadow=_t.receive??!0,(_t.parent??this.root).add(Xt),_t.exterior??!0?this.exteriorMeshes.push(Xt):this.interiorMeshes.push(Xt),Xt},X=x_;q(Ma(v,{quad:(B,vt)=>!w(B,vt),capStart:!0,capEnd:!0}),k);const it=new Sn,at=B=>{const vt=mn.smoothstep(B,zs,zs+.045);return{...Ct.headliner,color:new Ht(Ct.headliner.color).multiplyScalar(.78+.22*vt).getHex()}},ft=(B,vt)=>vt>=zs-.005?at(vt):vt>=rc-.005?Ct.trim:Ct.sidewall;it.add(Ma(f,{i0:x,i1:b,quad:(B,vt)=>!w(B,vt),flip:!0,capStart:!0,capEnd:!0}),void 0,ft);for(const B of m)it.add(Fu(v,f,B),void 0,Ct.trim);it.add(d_(g,Xn,-1.55,1.95,.01),void 0,Ct.carpet);const Z=wo([...m.map(B=>ku(v,B,!1,B===y)),...m.map(B=>ku(f,B,!0,B===y))]),ot=new C(2.05,1,0);Z.translate(-ot.x,-ot.y,-ot.z);const j=q(Z,U,{cast:!1,receive:!1});j.position.copy(ot),j.renderOrder=15;const et=new Sn,D=new C(gr,.81,0),J=new C(1.85,1.17,0),K=D.clone().add(J).multiplyScalar(.5);K.y-=mr*.5,et.add(new kt(D.distanceTo(J)+.04,.028,.026),X(K,[0,0,Math.atan2(J.y-D.y,J.x-D.x)]),Ct.trim);const rt=new Sn;for(const B of[-1,1])rt.add(new kt(.3,.04,.22),X([1.3,-.45,B*.72]),Ct.darkMetal);for(let B=0;B<2;B++)rt.add(new be(.05,.06,.28,10),X([2.75-B*.22,-.5,.62+B*.03],[.6,0,1.2]),Ct.exhaust);const dt=new Sn;dt.add(new kt(.5,.12,.28),X([3.7,.7,0]));for(let B=0;B<2;B++)dt.add(new kt(.28,.04,.22),X([3,-.62,(B===0?-1:1)*.35],[(B===0?-1:1)*.35,0,0]));this.propeller.position.set(4.62,.02,0),this.root.add(this.propeller);const xt=new Sn;xt.add(g_(.27,.58,28),X([0,0,0]),Ct.spinner),xt.add(new be(.27,.29,.18,28),X([-.09,0,0],[0,0,Math.PI/2]),Ct.darkMetal),this.propHub=q(xt.build(),G,{parent:this.propeller,receive:!1});const pt=new Sn,z=1.32,R=.16,nt=m_(z,.17,.1),ht=(B,vt,_t)=>Math.hypot(vt,_t)>R+z-.17?Ct.propTip:Ct.prop;for(let B=0;B<3;B++){const vt=new jt().makeRotationX(B/3*Math.PI*2);pt.add(nt,vt.clone().multiply(new jt().makeTranslation(0,R,0)),ht)}this.propBlades=q(pt.build(),G,{parent:this.propeller,receive:!1});const gt=new ce({map:D_(),transparent:!0,opacity:0,depthWrite:!1,side:nn,roughness:.6,color:8947848});this.materials.push(gt),this.propDisc=new pe(new ph(1.5,40),gt),this.propDisc.rotation.y=Math.PI/2,this.propDisc.position.x=.05,this.propDisc.renderOrder=15,this.propeller.add(this.propDisc);const ut={span:7.3,rootChord:1.95,tipChord:1.55,sweep:-.28,dihedral:.02,thickness:.11,twist:-.03,camber:.02},Nt=ec(ut,0),bt=Nt+.52,Dt=Nt+.46,ee=B=>S_(B,ut.span),yt=16,Ot=ic(wo([Rn(ut,{z0:0,z1:.85,segments:2,part:"full",hingeX:bt,capEnd:"rear",n:yt,vOf:ee}),Rn(ut,{z0:.85,z1:3.55,segments:5,part:"front",hingeX:bt,n:yt,vOf:ee}),Rn(ut,{z0:3.55,z1:3.65,segments:1,part:"full",hingeX:bt,capStart:"rear",capEnd:"rear",n:yt,vOf:ee}),Rn(ut,{z0:3.65,z1:6.9,segments:6,part:"front",hingeX:Dt,n:yt,vOf:ee}),Rn(ut,{z0:6.9,z1:7.3,segments:1,part:"full",hingeX:Dt,capStart:"rear",tipRound:.22,n:yt,vOf:ee})])),Yt=new Sn;for(const B of[1,-1])Yt.add(Ot,X(qn,void 0,[1,1,B]));const Ft=(B,vt)=>{const _t=Jn(n,B),Xt=_t.n??2.2;return _t.yc+_t.top*Math.pow(Math.max(1-Math.pow(Math.min(Math.abs(vt)/_t.w,1),Xt),0),1/Xt)},Lt=(B,vt=0)=>qn.y+Ou(ut,B-qn.x,vt),le=(B,vt=0)=>qn.y+p_(ut,B-qn.x,vt),te=(B,vt=0)=>{const _t=Lt(B,vt),Xt=le(B,vt);return _t+Math.min(.05,.5*(Xt-_t))},ve=qn.x+Fo(ut,0),$=qn.x+Nt,zt=.45,mt=.62,wt=.7,Et=B=>{const vt=B>ve?(B-ve)/zt:B<$?($-B)/mt:0,_t=1-Math.min(vt,1);return _t*_t*(3-2*_t)},At=B=>.3+(wt-.3)*Math.sqrt(Et(B)),ie=(B,vt)=>{const _t=Math.min(Math.abs(vt),wt);if(B<=ve&&B>=$)return te(B,_t)-Ft(B,vt);const Xt=B>ve?ve-.01:$+.01;return(te(Xt,_t)-Ft(Xt,vt))*Et(B)},Me=B=>1-mn.smoothstep(B,.68,1),Ve=[.45,.33,.22,.13,.06].map(B=>ve+B).concat([0,.03,.08,.15,.25,.4,.55,.7,.82,.91,.97,1].map(B=>ve-B*ut.rootChord)).concat([.07,.16,.27,.4,.52,.62].map(B=>$-B));dt.add(f_(Ve.map(B=>({x:B,w:At(B)})),(B,vt)=>Ft(B,vt)-.012+Math.max(ie(B,vt)+.012,0)*Me(Math.abs(vt)/At(B)),(B,vt)=>Ft(B,vt)-.03,24,6));const ue=(B,vt,_t,Xt)=>{const De=Rn({...ut,dihedral:0},{z0:B,z1:vt,segments:Xt,part:"rear",hingeX:_t,gap:.02,capStart:"rear",capEnd:"rear",n:yt,vOf:ee});De.translate(-_t,0,0);const ke=[];for(const Oe of[1,-1]){const Ae=new Ye;Ae.position.set(qn.x+_t,qn.y,0),Ae.rotation.x=-Oe*ut.dihedral,Ae.scale.z=Oe;const He=new Ye;q(De,I,{parent:He}),Ae.add(He),this.root.add(Ae),ke.push(He)}return[ke[0],ke[1]]};[this.flapR,this.flapL]=ue(.87,3.53,bt,5),[this.aileronR,this.aileronL]=ue(3.67,6.88,Dt,6),rt.add(new be(.015,.015,.45,6),X([qn.x+.45,Lt(qn.x+.25)-.06,-3.2],[0,0,Math.PI/2]),Ct.metal);const Fe=14,dn=.004,On={span:2.55,rootChord:1.05,tipChord:.8,sweep:-.175,dihedral:0,thickness:.12,twist:0,camber:0,te:dn},Ai=B=>sc(B,On.span),yn=ec(On,0)+.34,Xo=ic(wo([Rn(On,{z0:0,z1:.1,segments:1,part:"full",hingeX:yn,capEnd:"rear",n:Fe,vOf:Ai}),Rn(On,{z0:.1,z1:2.4,segments:4,part:"front",hingeX:yn,n:Fe,vOf:Ai}),Rn(On,{z0:2.4,z1:2.55,segments:1,part:"full",hingeX:yn,capStart:"rear",tipRound:.12,n:Fe,vOf:Ai})])),js=new C(-4.25,.42,0);for(const B of[-1,1])Yt.add(Xo,X(js,void 0,[1,1,B]));this.elevator=new Ye,this.elevator.position.set(js.x+yn,js.y,0),this.root.add(this.elevator);const qo=Rn(On,{z0:.12,z1:2.38,segments:4,part:"rear",hingeX:yn,gap:.015,capStart:"rear",capEnd:"rear",n:Fe,vOf:Ai});qo.translate(-yn,0,0);const gs=new Sn;for(const B of[-1,1])gs.add(qo,X(void 0,void 0,[1,1,B]));q(gs.build(),I,{parent:this.elevator});const Ti={span:1.55,rootChord:1.5,tipChord:.75,sweep:-.55,dihedral:0,thickness:.12,twist:0,camber:0,te:dn},Ci=B=>sc(B,Ti.span),Ri=ec(Ti,0)+.48,Vr=ic(wo([Rn(Ti,{z0:0,z1:.06,segments:1,part:"full",hingeX:Ri,capEnd:"rear",n:Fe,vOf:Ci}),Rn(Ti,{z0:.06,z1:1.45,segments:3,part:"front",hingeX:Ri,n:Fe,vOf:Ci}),Rn(Ti,{z0:1.45,z1:1.55,segments:1,part:"full",hingeX:Ri,capStart:"rear",tipRound:.1,n:Fe,vOf:Ci})])),Yo=new C(-4.35,.45,0);Yt.add(Vr,X(Yo,[-Math.PI/2,0,0]));const Za=Rn({span:.33,rootChord:1.3,tipChord:.25,sweep:-.885,dihedral:0,thickness:.1,twist:0,camber:0,te:dn},{z0:0,z1:.33,segments:3,part:"full",n:10,tipRound:.05,vOf:B=>sc(B,2)});Yt.add(Za,X([-2.94,.5,0],[-Math.PI/2,0,0])),q(Yt.build(),I),q(dt.build(),H),this.rudder=new Ye,this.rudder.position.set(Yo.x+Ri,Yo.y,0),this.root.add(this.rudder);const L=Rn(Ti,{z0:.08,z1:1.43,segments:3,part:"rear",hingeX:Ri,gap:.015,capStart:"rear",capEnd:"rear",n:Fe,vOf:Ci});L.translate(-Ri,0,0),q(new Sn().add(L,X(void 0,[-Math.PI/2,0,0])).build(),I,{parent:this.rudder}),rt.add(new be(.01,.01,.5,5),X([-2,.9,0],[0,0,.5]),Ct.metal);const tt=new ce({color:16777215,roughness:.2,metalness:0,vertexColors:!0});tt.onBeforeCompile=B=>{B.uniforms.uLightPower=this.lightPower,B.vertexShader=B.vertexShader.replace("#include <common>",`#include <common>
attribute float aLight;
varying float vLight;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vLight = aLight;`),B.fragmentShader=B.fragmentShader.replace("#include <common>",`#include <common>
uniform float uLightPower[5];
varying float vLight;`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
totalEmissiveRadiance = vColor * uLightPower[int(vLight + 0.5)];`)},tt.customProgramCacheKey=()=>"plane-lights-v1",this.materials.push(tt);const lt=(B,vt,_t)=>{const Xt=new hi(B,8,6),De=Xt.getAttribute("position").count,ke=new Ht(vt),Oe=new Float32Array(De*3),Ae=new Float32Array(De);for(let He=0;He<De;He++)Oe[He*3]=ke.r,Oe[He*3+1]=ke.g,Oe[He*3+2]=ke.b,Ae[He]=_t;return Xt.setAttribute("color",new fe(Oe,3)),Xt.setAttribute("aLight",new fe(Ae,1)),Xt},ct=new Sn;for(const[B,vt,_t]of[[this.wingTipL,14162972,mi.red],[this.wingTipR,1624136,mi.green]]){const Xt=Math.sign(B.z)*7.55;ct.add(lt(.06,vt,_t),X([B.x,B.y,Xt])),ct.add(lt(.035,15922431,mi.strobe),X([B.x-.12,B.y,Xt-Math.sign(B.z)*.02]))}ct.add(lt(.04,15922431,mi.tail),X([-5.37,.3,0])),ct.add(lt(.05,14162972,mi.beacon),X([-4.8,2.07,0])),this.lights=q(ct.build(),tt,{cast:!1,receive:!1});const st=[{x:2.95,yc:-1.86,w:.05,top:.07,bot:.05,n:2.4,vee:1.5},{x:2.6,yc:-1.9,w:.2,top:.15,bot:.18,n:2.6,vee:1.4},{x:1.9,yc:-1.95,w:.33,top:.18,bot:.28,n:3,vee:1.25},{x:.8,yc:-1.95,w:.37,top:.19,bot:.32,n:3.2,vee:1.15},{x:-.2,yc:-1.95,w:.37,top:.19,bot:.3,n:3.2,vee:1.12},{x:-.35,yc:-1.95,w:.365,top:.19,bot:.295,n:3.2,vee:1.12,split:!0},{x:-.35,yc:-1.95,w:.365,top:.19,bot:.215,n:3.2,vee:1.15,split:!0},{x:-1.3,yc:-1.92,w:.33,top:.18,bot:.2,n:3,vee:1.2},{x:-2.3,yc:-1.86,w:.25,top:.15,bot:.12,n:2.8,vee:1.3},{x:-2.75,yc:-1.8,w:.11,top:.09,bot:.05,n:2.4,vee:1.5}],Tt=v_(st,8,5),Pt=B=>{const vt=Jn(st.map(_t=>({x:_t.x,yc:_t.yc,w:_t.w,top:_t.top,bot:_t.bot,n:_t.n})),B);return vt.yc+vt.top},$t=new Sn,qt=2.9,re=B=>new C(qn.x+B,qn.y+Ou(ut,B,qt)+.03,0),Gt=(B,vt,_t)=>new C(B,vt,_t),Wt=(B,vt,_t)=>{rt.add(new kt(_t,.035,_t*.75),X(B.clone().addScaledVector(vt,.012)),Ct.darkMetal),rt.add(new be(.045,.05,.06,10),X(B.clone().addScaledVector(vt,.045)),Ct.darkMetal)},ge=Gt(0,1,0),Ee=Gt(0,-1,0),Te=-.62,We=1.6,me=-.9;for(const B of[-1,1]){$t.add(Tt,X([0,0,B*1.25])),rt.add(new hi(.085,10,8),X([2.97,-1.85,B*1.25]),Ct.rubber);const vt=Gt(We,Pt(We),B*1.25),_t=Gt(me,Pt(me),B*1.25),Xt=Gt(1.4,Te,B*.55),De=Gt(-.7,Te,B*.5);rt.add(fr(vt,Xt,.14,.05),void 0,Ct.metal),rt.add(fr(_t,De,.14,.05),void 0,Ct.metal),rt.add(ai(vt.clone().add(Gt(.05,.03,0)),De,.022),void 0,Ct.metal),rt.add(ai(_t.clone().add(Gt(-.05,.03,0)),Xt,.022),void 0,Ct.metal),Wt(vt,ge,.22),Wt(_t,ge,.22),Wt(Xt,Ee,.16),Wt(De,Ee,.16);const ke=Gt(1.25,Pt(1.25),B*1.36),Oe=Gt(-.3,Pt(-.3),B*1.36),Ae=re(.25).setZ(B*qt),He=re(-.85).setZ(B*qt);rt.add(fr(ke,Ae,.12,.045),void 0,Ct.metal),rt.add(fr(Oe,He,.12,.045),void 0,Ct.metal),rt.add(ai(Ae.clone().setY(Ae.y-.05),He.clone().setY(He.y-.05),.03),void 0,Ct.metal),Wt(ke,ge,.16),Wt(Oe,ge,.16);for(const Zo of[Ae,He])rt.add(new kt(.16,.03,.1),X(Zo.clone().setY(Zo.y-.02)),Ct.darkMetal);const di=new Ye;di.position.set(-2.72,-1.83,B*1.25),q(new Sn().add(new be(.014,.014,.16,8),X([0,.02,0]),Ct.metal).add(new kt(.2,.3,.022),X([-.06,-.19,0]),Ct.darkMetal).add(new kt(.1,.02,.02),X([-.05,.09,0]),Ct.metal).build(),G,{parent:di,cast:!1,receive:!1}),this.root.add(di),this.waterRudders.push(di);for(const Zo of[2,.4,-1.4])rt.add(new kt(.14,.05,.05),X([Zo,Pt(Zo)+.025,B*1.25+.2*B]),Ct.metal);rt.add(new kt(.05,.05,.12),X([2.55,Pt(2.55)+.025,B*1.25]),Ct.metal)}for(const B of[We,me]){const vt=Pt(B)+.05;rt.add(fr(Gt(B,vt,-1.25),Gt(B,vt,1.25),.1,.06),void 0,Ct.metal);for(const _t of[-1,1])rt.add(new kt(.18,.06,.16),X([B,Pt(B)+.03,_t*1.16]),Ct.darkMetal)}rt.add(ai(Gt(We,Pt(We)+.05,-1.1),Gt(me,Pt(me)+.05,1.1),.008),void 0,Ct.darkMetal),rt.add(ai(Gt(We,Pt(We)+.05,1.1),Gt(me,Pt(me)+.05,-1.1),.008),void 0,Ct.darkMetal),q($t.build(),O),q(rt.build(),G),this.wheels=new Ye,this.root.add(this.wheels);const Zt=new Ar(.2,.09,6,16),ni=new be(.12,.12,.12,12),xe=new Sn;for(const B of[-1,1])for(const[vt,_t]of[[-.9,1],[2.3,.7]])xe.add(Zt,X([vt,-2.28,B*1.25],void 0,_t),Ct.rubber),xe.add(ni,X([vt,-2.28,B*1.25],[Math.PI/2,0,0],_t),Ct.metal);q(xe.build(),G,{parent:this.wheels,receive:!1});const Pi=((B,vt)=>Fa(Jn(g,B),vt))(2.1,.74)-.03,fn=sn.H,Ji=Math.min(sn.W,Pi*2-.02),Ce=new C(Math.sin(xr),-Math.cos(xr),0),Bn=new C(Math.cos(xr),Math.sin(xr),0),Cn=new C(vo,.735,0).clone().addScaledVector(Ce,fn/2),Hn=new jt().makeBasis(new C(0,0,1),Ce.clone().negate(),Bn.clone().negate()).setPosition(Cn),ui=(B,vt,_t)=>new C(B,vt,_t).applyMatrix4(Hn);et.add(new kt(.16,fn+.02,Pi*2),X(Cn.clone().addScaledVector(Bn,.085),[0,0,xr]),Ct.plastic);const vs=[],$o={...cs.face},Ph=(1-Ji/sn.W)*.5*($o.u1-$o.u0);$o.u0+=Ph,$o.u1-=Ph;const Lh=tc(Ji,fn,$o);Lh.applyMatrix4(Hn),vs.push(Lh),vs.push(h_(g,.745,vo-.02,gr-.005,.005,.02,cs.grain));const Ks=(B,vt,_t,Xt,De,ke)=>{const Oe=tc(vt,_t,B),Ae=De.clone().normalize(),He=ke.clone().addScaledVector(Ae,-ke.dot(Ae)).normalize(),di=new C().crossVectors(He,Ae);Oe.applyMatrix4(new jt().makeBasis(di,He,Ae).setPosition(Xt)),vs.push(Oe)},jo=new C(0,1,0);Ks(cs.nameplate,.16,.035,new C(vo-.041,.725,.34),new C(-1,0,0),jo),et.add(new kt(.075,.055,.07),X([vo+.09,.8,0]),Ct.plastic),et.add(new kt(.02,.035,.024),X([vo+.09,.762,0]),Ct.darkMetal),Ks(cs.compass,.05,.024,new C(vo+.052,.8,0),new C(-1,0,0),jo),et.add(new kt(.12,.024,.1),X([.3,1.117,0]),Ct.lightPlastic),Ks(cs.domeLens,.075,.06,new C(.3,1.1045,0),new C(0,-1,0),new C(1,0,0));const we=new z_,It=eh,Dh=.0015,Ka=.0025,je=.0035,Qi=.0045;we.needle(It.asi,.86,.004,je,Jt.asi),we.cap(It.asi,.005,Qi,Jt.asi),we.disc(It.adi,It.adi.r*Qn.ballRadius,Dh,Jt.adi,"white",48,Qn.ball,It.adi.r*.995);for(const B of[-60,-30,-20,-10,10,20,30,60])we.tick(It.adi,B,Math.abs(B)%30?.9:.84,.98,.0022,Ka,Jt.fixed,"white");we.poly(It.adi,[[-.055*It.adi.r,.98*It.adi.r],[.055*It.adi.r,.98*It.adi.r],[0,.82*It.adi.r]],Ka,Jt.fixed,"white"),we.poly(It.adi,[[-.05*It.adi.r,.66*It.adi.r],[.05*It.adi.r,.66*It.adi.r],[0,.8*It.adi.r]],Ka,Jt.adiBank,"orange"),we.bar(It.adi,-.4*It.adi.r,0,.42*It.adi.r,.004,je,Jt.fixed,"orange"),we.bar(It.adi,.4*It.adi.r,0,.42*It.adi.r,.004,je,Jt.fixed,"orange"),we.bar(It.adi,-.19*It.adi.r,-.05*It.adi.r,.004,.1*It.adi.r,je,Jt.fixed,"orange"),we.bar(It.adi,.19*It.adi.r,-.05*It.adi.r,.004,.1*It.adi.r,je,Jt.fixed,"orange"),we.disc(It.adi,.003,je,Jt.fixed,"orange",10),we.needle(It.alt,.62,.007,je,Jt.alt1000,"white",.12),we.needle(It.alt,.86,.0035,je,Jt.alt100),we.cap(It.alt,.005,Qi,Jt.alt100),we.bar(It.tc,0,0,1.3*It.tc.r,.005,je,Jt.tc,"white"),we.bar(It.tc,0,.11*It.tc.r,.006,.26*It.tc.r,je,Jt.tc,"white"),we.bar(It.tc,0,-.02*It.tc.r,.24*It.tc.r,.008,Qi,Jt.tc,"white"),we.disc({x:It.tc.x,y:It.tc.y-.53*It.tc.r,r:It.tc.r},.0032,je,Jt.tcBall,"black",14),we.disc(It.hdg,It.hdg.r*.92,Dh,Jt.hdg,"white",48,Qn.card),we.bar(It.hdg,0,.05*It.hdg.r,.004,.5*It.hdg.r,je,Jt.fixed,"white"),we.bar(It.hdg,0,.05*It.hdg.r,.46*It.hdg.r,.004,je,Jt.fixed,"white"),we.bar(It.hdg,0,-.15*It.hdg.r,.18*It.hdg.r,.004,je,Jt.fixed,"white"),we.poly(It.hdg,[[-.04*It.hdg.r,.99*It.hdg.r],[.04*It.hdg.r,.99*It.hdg.r],[0,.82*It.hdg.r]],je,Jt.fixed,"orange"),we.needle(It.vsi,.84,.004,je,Jt.vsi),we.cap(It.vsi,.005,Qi,Jt.vsi),we.needle(It.rpm,.84,.0035,je,Jt.rpm),we.cap(It.rpm,.004,Qi,Jt.rpm),we.needle(It.map,.84,.0035,je,Jt.map),we.cap(It.map,.004,Qi,Jt.map);for(const[B,vt]of[[It.oilp,Jt.oilp],[It.oilt,Jt.oilt],[It.fuell,Jt.fuell],[It.fuelr,Jt.fuelr],[It.egt,Jt.egt]])we.needle(B,.8,.0028,je,vt),we.cap(B,.003,Qi,vt);for(const B of[It.amp,It.cht])we.needle(B,.8,.0028,je,Jt.fixed),we.cap(B,.003,Qi,Jt.fixed);this.instruments=q(we.build(),Q,{exterior:!1,cast:!1}),Hn.decompose(this.instruments.position,this.instruments.quaternion,this.instruments.scale);const Ja=tc(xi.w,xi.h,{u0:0,v0:0,u1:1,v1:1});Ja.translate(xi.x,xi.y,8e-4),Ja.applyMatrix4(Hn),this.gpsMesh=q(Ja,W,{exterior:!1,cast:!1}),et.add(new kt(.7,.32,.22),X([1.7,Xn+.16,0]),Ct.plastic),et.add(new kt(.22,.02,.16),X([1.62,Xn+.33,0]),Ct.darkMetal);const Qa=(B,vt,_t)=>new Sn().add(new be(.009,.011,_t,8),X([0,_t/2,0]),Ct.metal).add(vt,X([0,_t+.012,0]),B).build(),Ih=new hi(.022,12,8);this.throttleLever=q(Qa(Ct.throttle,Ih,.16),G,{exterior:!1,cast:!1,receive:!1}),this.throttleLever.position.set(1.62,Xn+.34,-.05);for(const[B,vt]of[[0,Ct.propKnob],[.05,Ct.mixture]])et.add(Qa(vt,Ih,.15),X([1.62,Xn+.34,B],[0,0,-.35]),vt);this.flapLever=q(Qa(Ct.flapKnob,new be(.014,.014,.05,10),.26),G,{exterior:!1,cast:!1,receive:!1}),this.flapLever.position.set(1.42,Xn+.3,.1);const zh=B=>{const vt=new Sn;for(const _t of[-.34,.34]){const Xt=_t+B;vt.add(new be(.011,.011,.2,8),X([.02,.1,Xt],[0,0,-.2]),Ct.metal),vt.add(new kt(.02,.15,.085),X([.06,.21,Xt],[0,0,-.35]),Ct.darkMetal),vt.add(new kt(.03,.03,.03),X([0,.015,Xt]),Ct.darkMetal)}return vt.build()};this.pedalsL=q(zh(-.12),G,{exterior:!1,cast:!1,receive:!1}),this.pedalsR=q(zh(.12),G,{exterior:!1,cast:!1,receive:!1});for(const B of[this.pedalsL,this.pedalsR])B.position.set(1.93,Xn,0);et.add(new be(.015,.015,1.2,8),X([1.93,Xn+.02,0],[Math.PI/2,0,0]),Ct.metal);const xs=Xn+.4,ws=new C(Wu,I_,0),of=ui(0,-.175,0).setZ(0),Nh=(B,vt)=>{const _t=new Ye,Xt=new Sn,De=of.clone().sub(ws).setZ(0),ke=De.clone().normalize();Xt.add(ai(new C(0,0,0),De.clone().addScaledVector(ke,.16),.018),void 0,Ct.darkMetal),Xt.add(new be(.03,.03,.04,12),X(De.clone().addScaledVector(ke,-.01),[0,0,Math.PI/2-Math.atan2(ke.y,ke.x)]),Ct.rubber),Xt.add(new kt(.05,.09,.075),void 0,Ct.plastic),Xt.add(new Ar(.15,.013,8,36,Math.PI*1.39),X(void 0,[0,Math.PI/2,Math.PI*.805]),Ct.plastic),Xt.add(new kt(.022,.15,.03),X([0,-.075,0]),Ct.plastic);for(const Ae of[-1,1]){Xt.add(new kt(.022,.03,.15),X([0,0,Ae*.075]),Ct.plastic);const He=new C(0,.15*Math.sin(Math.PI*.195),Ae*.15*Math.cos(Math.PI*.195)),di=He.clone().add(new C(0,.08,Ae*.03));Xt.add(ai(He,di,.017,10),void 0,Ct.rubber),vt&&(Xt.add(new fh(.03,.045,4,12),X(He.clone().lerp(di,.5).add(new C(-.012,0,0)),[0,0,Ae*.2]),Ct.skin),Xt.add(new be(.011,.011,.05,8),X(He.clone().lerp(di,.75).add(new C(.028,0,-Ae*.01)),[0,0,Math.PI/2]),Ct.skin))}const Oe=new pe(Xt.build(),G);return Oe.castShadow=!1,_t.add(Oe),_t.position.set(ws.x,ws.y,B),this.root.add(_t),this.interiorMeshes.push(_t),_t};this.yokeL=Nh(-.34,!0),this.yokeR=Nh(.34,!1);for(const B of[-.34,.34])Ks(cs.yoke,.036,.024,new C(ws.x-.026,ws.y+.015,B),new C(-1,0,0),jo);const rf=new kt(.46,.12,.46),af=new kt(.1,.55,.46),lf=new kt(.26,.34,.26),Uh=[[1,-.34],[1,.34],[-.2,-.34],[-.2,.34],[-1,0]];for(const[B,vt]of Uh)et.add(rf,X([B,xs,vt]),Ct.leather),et.add(af,X([B-.25,xs+.33,vt],[0,0,.15]),Ct.leather),et.add(lf,X([B,Xn+.17,vt]),Ct.darkMetal);const tl=xs+.06,ys=(B,vt,_t=[0,1,0])=>et.add(u_(Gt(...B),Gt(...vt),.045,.005,Gt(..._t)),void 0,Ct.belt),Fh=(B,vt=[0,0,0])=>et.add(new kt(.055,.016,.06),X(B,vt),Ct.metal);for(const[B,vt]of Uh.slice(1)){const _t=tl+.004;ys([B,_t,vt-.24],[B,_t,vt-.04]),ys([B,_t,vt+.24],[B,_t,vt+.04]),Fh([B,_t+.004,vt])}ys([.96,tl+.01,-.6],[1.07,.3,-.36],[.35,1,0]),ys([.96,tl+.01,-.08],[1.07,.3,-.32],[.35,1,0]),Fh([1.075,.3,-.34],[0,0,.35]),ys([1.1,.78,-.5],[1.09,.31,-.32],[1,.1,0]),ys([1,.8,-.5],[.52,.96,-.68],[0,1,-.3]),ys([.52,.96,.68],[.74,.7,.46],[0,1,.3]);for(const B of[-1,1])et.add(new kt(.05,.05,.02),X([.52,.96,B*.69]),Ct.darkMetal);const el=this.cockpitEye.y-.03;et.add(new kt(.28,.58,.42),X([.95,xs+.06+.29,-.34]),Ct.shirt),et.add(new hi(.11,12,10),X([.98,el,-.34]),Ct.skin),et.add(new Ar(.115,.018,6,16,Math.PI),X([.98,el+.03,-.34],[0,Math.PI/2,0]),Ct.headset);for(const B of[-1,1])et.add(new be(.045,.045,.03,10),X([.98,el,-.34+B*.12],[Math.PI/2,0,0]),Ct.headset);for(const B of[-1,1]){const vt=Gt(.98,.74,-.34+B*.2),_t=Gt(1.2,.52,-.34+B*.23),Xt=Gt(ws.x-.04,ws.y+.12,-.34+B*.165);et.add(ai(vt,_t,.045,8),void 0,Ct.shirt),et.add(ai(_t,Xt,.04,8),void 0,Ct.shirt),et.add(new hi(.045,8,6),X(_t),Ct.shirt)}for(const B of[-1,1])et.add(ai(Gt(1.05,xs+.1,-.34+B*.11),Gt(1.45,xs+.12,-.34+B*.12),.07,8),void 0,Ct.plastic),et.add(ai(Gt(1.45,xs+.12,-.34+B*.12),Gt(1.9,Xn+.06,-.34+B*.12),.055,8),void 0,Ct.plastic);const kh=ya(n,mr+.015),Oh=_a(kh,(B,vt)=>v.t[vt]),Bh=(()=>{const B=Jn(n,1.3),vt=bo(B,-.42)??.4,_t=v.t[i(1.77)];let Xt=u,De=1/0;for(let ke=u;ke<=p/2;ke++){const Oe=Math.abs(_t[ke]-vt);Oe<De&&(De=Oe,Xt=ke)}return Xt})(),cf=[{i0:i(1.77),i1:i(.95),j0:u,j1:Bh},{i0:i(1.77),i1:i(.95),j0:p-Bh,j1:p-u}];for(const B of cf)it.add(Ma(Oh,{i0:B.i0,i1:B.i1,quad:(vt,_t)=>Uu(B,p,vt,_t),flip:!0}),void 0,Ct.doorTrim),it.add(Fu(f,Oh,B),void 0,Ct.trim);const Js=(B,vt)=>Fa(Jn(kh,B),vt);for(const B of[-1,1])et.add(new kt(.34,.045,.07),X([1.32,.17,B*(Js(1.32,.17)-.035)]),Ct.plastic),et.add(new kt(.05,.05,.012),X([1.06,.06,B*(Js(1.06,.06)-.006)]),Ct.metal),et.add(new kt(.1,.018,.02),X([1.1,.05,B*(Js(1.06,.06)-.025)],[0,0,-.25]),Ct.metal),et.add(new kt(.3,.16,.02),X([1.3,-.16,B*(Js(1.3,-.16)-.012)]),Ct.trim),Ks(cs.exit,.1,.036,new C(1.15,.33,B*(Js(1.15,.33)-.002)),new C(0,0,-B),jo),Ks(cs.belts,.1,.03,new C(1.55,.33,B*(Js(1.55,.33)-.002)),new C(0,0,-B),jo);for(const B of[1.81,.9]){const vt=[Jn(ya(n,mr+.004),B+.012),Jn(ya(n,mr+.004),B-.012)],_t=_a(vt,Xt=>h(Xt));it.add(Ma(_t,{flip:!0,quad:(Xt,De)=>De<c||De>=p-c}),void 0,Ct.bow)}for(const B of[-1,1])et.add(new be(.028,.028,.024,12),X([1.6,1.092,B*.5]),Ct.lightPlastic),et.add(new be(.015,.015,.028,10),X([1.6,1.091,B*.5]),Ct.plastic);et.add(new be(.045,.045,.26,10),X([.55,Xn+.14,.62],[0,0,.1]),Ct.extinguisher),et.add(new kt(.06,.08,.04),X([.55,Xn+.06,.66]),Ct.darkMetal),q(it.build(),G,{exterior:!1,cast:!1}),q(et.build(),G,{exterior:!1});const Hh=wo(vs);if(!Hh)throw new Error("cockpit: textured parts have incompatible attributes");q(Hh,Y,{exterior:!1,cast:!1});for(const B of this.materials)B.isMeshStandardMaterial&&(B.envMapIntensity=1);this.setInstruments(null,0,0)}animate(t,e,n,i,o,r,a,l,h,c=null,d=o){this.aileronR.rotation.z=-e*.35,this.aileronL.rotation.z=e*.35,this.flapR.rotation.z=i*.6,this.flapL.rotation.z=i*.6,this.elevator.rotation.z=t*.4,this.rudder.rotation.y=-n*.45;for(const f of this.waterRudders)f.rotation.y=-n*.5;this.propeller.rotation.x+=o*2600*(Math.PI*2/60)*r;const u=this.propDisc.material;u.opacity=mn.clamp((o-.15)*1.6,0,.75),this.propBlades.visible=o<.55;const v=a%1.2<.06||(a+.15)%1.2<.06,p=Math.pow(l,.6),g=this.lightPower.value;g[mi.red]=g[mi.green]=7*p,g[mi.tail]=6*p,g[mi.beacon]=(2+12*Math.max(0,Math.sin(a*4.5)))*p,g[mi.strobe]=(v?30:0)*p,this.wheels.visible=h,this.wheels.position.y=h?0:.3;for(const f of[this.yokeL,this.yokeR])f.rotation.x=e*.9,f.position.x=Wu-t*.08;this.pedalsL.rotation.z=-n*.32,this.pedalsR.rotation.z=n*.32,this.throttleLever.rotation.z=(.5-mn.clamp(d,0,1))*.9,this.flapLever.rotation.z=-(1.75+mn.clamp(i,0,1)*1.05)+Math.PI/2,this.panelMat.emissiveIntensity=.1+1.3*p,this.instMat.emissiveIntensity=.15+1.4*p,this.gpsMat.emissiveIntensity=.55+1.2*p,this.canvasAcc+=r,this.setInstruments(c,o,d)}setInstruments(t,e,n){const i=this.instAngle.value,o=this.instShift.value,r=eh,a=this.gaugeState,l=t?t.airspeed*1.9438:0,h=t?t.altitude*3.2808:0,c=t?t.verticalSpeed*196.85:0,d=t?t.heading:0,u=t?t.bank:0,v=t?t.pitchAngle:0,p=t?t.beta:0,g=t?Math.max(t.airspeed,15):15,f=t&&!t.onWater&&!t.onGround?9.81*Math.tan(u)/g/cn:0,m=600+e*2e3,y=mn.clamp(11+19*n-(t?t.altitude:0)/300,10,35);a.kt=l,a.ft=h,a.fpm=c,a.hdg=d,a.bankDeg=u/cn,a.pitchDeg=v/cn,a.rpm=m,a.map=y,a.turnRateDps=f,a.slip=p,i[Jt.fixed]=0,i[Jt.asi]=-ze.asi(l)*cn,i[Jt.adi]=u,i[Jt.adiBank]=u,o[Jt.adi*2]=0,o[Jt.adi*2+1]=-mn.clamp(v/cn,-25,25)*(r.adi.r/30),i[Jt.alt100]=-ze.alt100(h)*cn,i[Jt.alt1000]=-ze.alt1000(h)*cn,i[Jt.tc]=-mn.clamp(f/3,-1.6,1.6)*20*cn;const w=mn.clamp(p*5,-1,1)*.36*r.tc.r;o[Jt.tcBall*2]=w,o[Jt.tcBall*2+1]=w*w/(2.3*r.tc.r),i[Jt.hdg]=d*cn,i[Jt.vsi]=-ze.vsi(c)*cn,i[Jt.rpm]=-ze.rpm(m)*cn,i[Jt.map]=-ze.map(y)*cn,i[Jt.oilp]=-ze.small(e>.05?.55+.25*e:0)*cn,i[Jt.oilt]=-ze.small(.35+.35*e)*cn,i[Jt.egt]=-ze.small(.15+.6*e)*cn,i[Jt.fuell]=-ze.small(.62)*cn,i[Jt.fuelr]=-ze.small(.57)*cn,this.canvasAcc>=Xu&&(this.canvasAcc=0,this.gps.draw(t?t.groundSpeed*1.9438:0,d,h,c))}debugGauges(){return{...this.gaugeState}}}const qu=9.81;class Ga{constructor(t){this.heightAt=t}position=new C(0,.3,0);quaternion=new Xe;velocity=new C;omega=new C;rpm=0;telemetry={airspeed:0,groundSpeed:0,altitude:0,agl:0,verticalSpeed:0,heading:0,alpha:0,beta:0,stalled:!1,onWater:!1,onGround:!1,rpm:0,gForce:1,gearDown:!0,shake:0,buffet:0,gustLevel:0,bank:0,pitchAngle:0,crashed:!1};mass=2350;wingArea=26;span=14.6;chord=1.65;maxThrust=7400;inertia=new C(5600,11600,7400);wind=new C;turbulence=.3;gearDown=!0;gust=new C;gustAmp=0;time=0;buffet=0;crashTimer=0;wreckedTimer=0;lastHeading=0;contactUp=0;tmpV=new C;tmpV2=new C;invQ=new Xe;stations=[{p:new C(2.6,-2.08,-1.25),kind:"bow"},{p:new C(2.6,-2.08,1.25),kind:"bow"},{p:new C(-.2,-2.25,-1.25),kind:"step"},{p:new C(-.2,-2.25,1.25),kind:"step"},{p:new C(-2.3,-1.98,-1.25),kind:"stern"},{p:new C(-2.3,-1.98,1.25),kind:"stern"},{p:new C(.7,-2.27,-1.25),kind:"plane"},{p:new C(.7,-2.27,1.25),kind:"plane"},{p:new C(-.9,-2.57,-1.25),kind:"wheel"},{p:new C(-.9,-2.57,1.25),kind:"wheel"},{p:new C(2.3,-2.48,-1.25),kind:"wheel"},{p:new C(2.3,-2.48,1.25),kind:"wheel"},{p:new C(3.6,-.5,0),kind:"structure"},{p:new C(-.04,1.4,-7.5),kind:"structure"},{p:new C(-.04,1.4,7.5),kind:"structure"},{p:new C(-4.9,2.1,0),kind:"structure"},{p:new C(-5.4,-.2,0),kind:"structure"},{p:new C(.6,1.75,0),kind:"structure"}];static FLOAT_REST_Y=1.96;static WHEEL_REST_Y=2.57;reset(t,e,n,i,o){this.position.set(t,e,n),this.quaternion.setFromEuler(new Be(0,i,0));const r=new C(1,0,0).applyQuaternion(this.quaternion);this.velocity.copy(r).multiplyScalar(o),this.omega.set(0,0,0),this.rpm=o>5?.7:.2,this.wreckedTimer=0}forward(t){return t.set(1,0,0).applyQuaternion(this.quaternion)}up(t){return t.set(0,1,0).applyQuaternion(this.quaternion)}step(t,e){if(e<=0){this.probeContacts(),this.updateTelemetry(t);return}const n=Math.max(1,Math.ceil(e/(1/120))),i=e/n;for(let o=0;o<n;o++)this.substep(t,i);this.updateTelemetry(t)}substep(t,e){this.time+=e,this.crashTimer=Math.max(0,this.crashTimer-e);const n=Qt(t.throttle,0,1);this.rpm+=(n*.92+.08-this.rpm)*Qt(e/.7,0,1);const i=this.time*.35,o=Vt(i,1.3)+.4*Vt(i*4,11.7),r=.7*Vt(i*1.7,7.1)+.35*Vt(i*5.1,3.3),a=Vt(i*1.3,3.7)+.4*Vt(i*4.3,6.9),l=this.turbulence*(1.5+2*(1-St(30,300,this.position.y)));this.gustAmp=l,this.gust.set(o,r,a).multiplyScalar(l),this.invQ.copy(this.quaternion).invert();const h=this.tmpV.copy(this.velocity).sub(this.wind).sub(this.gust),c=this.tmpV2.copy(h).applyQuaternion(this.invQ),d=Math.max(c.length(),.5),u=Math.atan2(-c.y,Math.max(c.x,.1)),v=Math.asin(Qt(c.z/d,-1,1)),p=1.2*Math.exp(-this.position.y/9e3),g=.5*p*d*d,f=this.wingArea,m=Qt(t.flaps,0,1),y=.27-m*.03;let w=.32+m*.55+5.4*u;const x=1.7+m*.5;let b=!1,M=0;u>y?(M=u-y,w=Math.max(x-M*6,.9*Math.sin(2*u)),b=!0):u<-.22&&(w=Math.max(w,-.9)),w=Math.min(w,x),this.buffet=se(this.buffet,b?1:St(y-.05,y,u)*.5,Qt(e*6,0,1));const A=.034+.048*w*w+m*.05+(this.gearDown?.012:0)+(b?.1+.6*M:0),S=-.45*v,_=g*f*w,E=g*f*A,T=g*f*S,F=c.clone().normalize(),k=new C(-F.y,F.x,0).normalize();k.lengthSq()<.5&&k.set(0,1,0);const I=new C;I.addScaledVector(F,-E),I.addScaledVector(k,_),I.z+=T;const O=this.maxThrust*Qt((this.rpm-.08)/.92,0,1)*Qt(1-d/120,.2,1)*(p/1.2);I.x+=O;const U=I.y,P=this.omega.x,H=this.omega.y,G=this.omega.z,N=this.span,Y=this.chord,V=2*Math.max(d,3),Q=P*N/V,W=H*N/V,q=G*Y/V,X=Qt(t.roll,-1,1),it=Qt(t.yaw,-1,1),at=Qt(Math.sqrt(614/Math.max(g,1)),.4,1),ft=Qt(t.pitch,-1,1)*at,Z=-.18*St(0,.035,M),ot=.04-1.3*u-36*q+.43*ft*(1-.15*m)-.06*m+Z,j=-.5*Q+.072*X-.08*v-.08*W,et=-.1*v-.16*W-.075*it+.008*X+.06*Qt(w,0,1.5)*Q,D=new C(g*f*N*j,g*f*N*et,g*f*Y*ot);D.z+=.25*O,b&&(D.x+=g*f*N*.02*Math.sin(this.time*17)*this.buffet,D.z-=g*f*Y*.03*this.buffet),D.x+=g*f*N*.0055*l*Vt(this.time*2.1,9.9),D.z+=g*f*Y*.004*l*Vt(this.time*1.9,4.4),D.y+=g*f*N*.002*l*Vt(this.time*1.7,12.4);let J=!1,K=!1,rt=!1,dt=0;const xt=new C,pt=new C,z=new C,nt=this.heightAt(this.position.x,this.position.z)>.05;this.gearDown=nt&&this.position.y<60;const ht=Math.hypot(this.velocity.x,this.velocity.z),gt=this.quaternion,ut=Math.asin(Qt(2*(gt.x*gt.y+gt.w*gt.z),-1,1));this.contactUp=0;for(const Ft of this.stations){const Lt=Ft.p;pt.copy(Lt).applyQuaternion(this.quaternion).add(this.position);const le=this.heightAt(pt.x,pt.z),te=le<=.05,$=(te?0:le)-pt.y;if($<=0)continue;const zt=Ft.kind==="wheel",mt=Ft.kind==="structure",wt=!zt&&!mt;if(te&&zt||!te&&wt&&this.gearDown)continue;rt=!0,z.copy(this.omega).applyQuaternion(this.quaternion).cross(this.tmpV.copy(pt).sub(this.position)).add(this.velocity);const Et=Math.hypot(z.x,z.z);let At,ie;if(mt)Et>12&&this.crash(),te?(J=!0,At=12e3*$-3e3*z.y,ie=-(250*Et+40*Et*Et)*Math.min($/.3,1)):(K=!0,At=8e4*Math.min($,.6)-8e3*z.y,ie=-.7*Math.max(At,0)*Math.min(Et,1));else if(te){J=!0;const Me=St(8,22,Et),Ve=Math.min($/.1,1);if(Ft.kind==="plane"){const ue=Qt(.5+3*ut,.25,1.3);At=(40*Et*Et*Math.min($/.35,1)*ue-250*Et*Ve*z.y)*Me,ie=0}else{dt++;const ue=Ft.kind==="bow",Fe=Ft.kind==="stern",dn=Fe?36e3:ue?24e3:56e3,On=Fe||ue?.15:.2,Ai=$<On?$*$/(2*On):$-On/2,yn=Fe?1-.9*Me:ue?1-.6*Me:1-.3*Me;At=dn*Math.min(Ai,.9)*yn+3e4*Math.max($-.45,0)**2,At-=5500*Ve*(1-.5*Me)*z.y,ie=-(4.5*Et*Et*(1-.85*Me)+30*Et)*Math.min($/.3,1)}}else{K=!0,At=52e3*Math.min($,.5)-6e3*z.y,ie=-(t.brake?.45:.03)*Math.max(At,0)*Math.min(Et,1);const ue=new C(0,0,1).applyQuaternion(this.quaternion);ue.y=0,ue.normalize();const Fe=z.dot(ue),dn=Qt(-Fe*900,-.9*Math.max(At,0),.9*Math.max(At,0));xt.copy(ue).multiplyScalar(dn),this.applyForce(xt,pt,e)}At=Math.max(At,0),xt.set(0,At,0),Et>.01&&xt.add(this.tmpV.set(z.x/Et,0,z.z/Et).multiplyScalar(ie)),this.applyForce(xt,pt,e)}if(dt>0){const Ft=ht;this.omega.y-=it*1500*Math.min(Ft/6,1)*(dt/6)*e/this.inertia.y}if(rt&&this.velocity.y<-15&&this.crash(),K&&ht>25){const Ft=this.heightAt(this.position.x+2,this.position.z)-this.heightAt(this.position.x-2,this.position.z),Lt=this.heightAt(this.position.x,this.position.z+2)-this.heightAt(this.position.x,this.position.z-2);Math.hypot(Ft,Lt)/4>.2&&this.crash()}const Nt=I.applyQuaternion(this.quaternion);Nt.y-=this.mass*qu,this.velocity.addScaledVector(Nt,e/this.mass),this.position.addScaledVector(this.velocity,e),this.omega.x+=D.x/this.inertia.x*e,this.omega.y+=D.y/this.inertia.y*e,this.omega.z+=D.z/this.inertia.z*e,(J||K)&&this.omega.multiplyScalar(1-.8*e);const bt=new Xe(this.omega.x*e*.5,this.omega.y*e*.5,this.omega.z*e*.5,1).normalize();this.quaternion.multiply(bt).normalize();const Dt=this.heightAt(this.position.x,this.position.z),ee=Math.max(Dt,0)+.8;this.position.y<ee&&(this.position.y=ee,this.velocity.y<0&&(this.velocity.y*=-.1),this.velocity.multiplyScalar(1-2.5*e));const yt=1-2*(this.quaternion.x*this.quaternion.x+this.quaternion.z*this.quaternion.z);(rt||this.position.y-Math.max(Dt,0)<3.5)&&yt<.35?(this.wreckedTimer+=e,this.wreckedTimer>2.9&&this.crash()):this.wreckedTimer=0;const Yt=this.forward(this.tmpV);Math.hypot(Yt.x,Yt.z)>.2&&(this.lastHeading=Math.atan2(Yt.x,-Yt.z)),this.telemetry.alpha=u,this.telemetry.beta=v,this.telemetry.stalled=b&&d>12,this.telemetry.onWater=J,this.telemetry.onGround=K,this.telemetry.gForce=(U+this.contactUp)/(this.mass*qu),this.telemetry.buffet=this.buffet,this.telemetry.gustLevel=Qt(this.gust.length()/2.5,0,1)*St(8,25,d),this.telemetry.shake=Qt(this.buffet*.7+this.telemetry.gustLevel*.5+St(60,100,d)*.25,0,1)}crash(){const t=this.heightAt(this.position.x,this.position.z),e=t>.05;this.position.y=e?t+Ga.WHEEL_REST_Y:Ga.FLOAT_REST_Y,this.quaternion.setFromEuler(new Be(0,this.headingToYaw(this.lastHeading),0)),this.velocity.set(0,0,0),this.omega.set(0,0,0),this.rpm=.08,this.buffet=0,this.wreckedTimer=0,this.crashTimer=5}headingToYaw(t){return Math.atan2(Math.cos(t),Math.sin(t))}applyForce(t,e,n){this.velocity.addScaledVector(t,n/this.mass);const i=this.quaternion;this.contactUp+=t.x*2*(i.x*i.y-i.w*i.z)+t.y*(1-2*(i.x*i.x+i.z*i.z))+t.z*2*(i.y*i.z+i.w*i.x);const r=this.tmpV.copy(e).sub(this.position).cross(t);r.applyQuaternion(this.invQ),this.omega.x+=r.x/this.inertia.x*n,this.omega.y+=r.y/this.inertia.y*n,this.omega.z+=r.z/this.inertia.z*n}probeContacts(){let t=!1,e=!1;for(const n of this.stations){if(n.kind==="structure")continue;this.tmpV.copy(n.p).applyQuaternion(this.quaternion).add(this.position);const i=this.heightAt(this.tmpV.x,this.tmpV.z),o=i<=.05;o&&n.kind==="wheel"||(o?0:i)-this.tmpV.y<=0||(o?t=!0:e=!0)}this.telemetry.onWater=t,this.telemetry.onGround=e}updateTelemetry(t){const e=this.telemetry,n=this.forward(this.tmpV);e.airspeed=this.tmpV2.copy(this.velocity).sub(this.wind).length(),e.groundSpeed=Math.hypot(this.velocity.x,this.velocity.z),e.altitude=this.position.y,e.agl=this.position.y-Math.max(0,this.heightAt(this.position.x,this.position.z)),e.verticalSpeed=this.velocity.y,e.heading=(Math.atan2(n.x,-n.z)*180/Math.PI+360)%360,e.rpm=this.rpm,e.gearDown=this.gearDown;const i=this.tmpV2.set(0,0,1).applyQuaternion(this.quaternion);e.bank=Math.asin(Qt(-i.y,-1,1)),e.pitchAngle=Math.asin(Qt(n.y,-1,1)),e.crashed=this.crashTimer>0}}function U_(){const s=document.createElement("canvas");s.width=s.height=64;const t=s.getContext("2d"),e=t.createRadialGradient(32,32,0,32,32,32);return e.addColorStop(0,"rgba(255,255,255,1)"),e.addColorStop(.4,"rgba(255,255,255,0.55)"),e.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=e,t.fillRect(0,0,64,64),new Ur(s)}class Yu{constructor(t,e,n,i,o){this.capacity=t,this.positions=new Float32Array(t*3),this.alphas=new Float32Array(t),this.sizes=new Float32Array(t),this.geo=new oe,this.geo.setAttribute("position",new fe(this.positions,3)),this.geo.setAttribute("aAlpha",new fe(this.alphas,1)),this.geo.setAttribute("aSize",new fe(this.sizes,1));const r=new Ge({uniforms:{uTex:{value:n},uColor:{value:e},uOpacity:{value:i},uScale:{value:1}},vertexShader:`
        attribute float aAlpha; attribute float aSize; varying float vAlpha;
        uniform float uScale;
        void main() { vAlpha = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / max(-mv.z, 0.5); }
      `,fragmentShader:`
        uniform sampler2D uTex; uniform vec3 uColor; uniform float uOpacity; varying float vAlpha;
        void main() { vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(uColor, t.a * vAlpha * uOpacity); }
      `,transparent:!0,depthWrite:!1,blending:o});this.points=new kx(this.geo,r),this.points.frustumCulled=!1,this.geo.setDrawRange(0,0)}points;particles=[];positions;alphas;sizes;geo;emit(t){this.particles.length>=this.capacity&&this.particles.shift(),this.particles.push(t)}clear(){this.particles.length=0,this.geo.setDrawRange(0,0)}update(t,e,n,i){this.points.material.uniforms.uScale.value=i;let o=0;for(let r=this.particles.length-1;r>=0;r--){const a=this.particles[r];if(a.age+=t,a.age>=a.life){this.particles.splice(r,1);continue}a.vy-=e*t;const l=Math.exp(-n*t);a.vx*=l,a.vy*=l,a.vz*=l,a.x+=a.vx*t,a.y+=a.vy*t,a.z+=a.vz*t,a.y<.05&&e>0&&(a.y=.05,a.vy=0);const h=a.age/a.life;this.positions[o*3]=a.x,this.positions[o*3+1]=a.y,this.positions[o*3+2]=a.z,this.alphas[o]=Math.sin(h*Math.PI)*(1-h*.5),this.sizes[o]=a.size*(.6+h*1.2),o++}this.geo.attributes.position.needsUpdate=!0,this.geo.attributes.aAlpha.needsUpdate=!0,this.geo.attributes.aSize.needsUpdate=!0,this.geo.setDrawRange(0,o)}}class F_{wakeL;wakeR;spray;exhaust;vortexL;vortexR;stampL;stampR;tmp=new C;tmp3=new C;rng=new $e("plane-effects");tmp2=new C;sprayAcc=0;exhaustAcc=0;constructor(t,e){this.wakeL=new Mo(70,1.6,14,1.2,t),this.wakeR=new Mo(70,1.6,14,1.2,t),this.stampL=new zr(5.6,.74,.9),this.stampR=new zr(5.6,.74,.9),e.add(this.stampL.mesh,this.stampR.mesh);const n=U_();this.spray=new Yu(400,new Ht(.95,.98,1),n,.75,Xi),this.exhaust=new Yu(120,new Ht(.25,.24,.23),n,.22,Xi),e.add(this.spray.points,this.exhaust.points),this.vortexL=new Mo(90,.5,2.2,.6,Kc),this.vortexR=new Mo(90,.5,2.2,.6,Kc),e.add(this.vortexL.mesh,this.vortexR.mesh)}reset(){this.wakeL.reset(),this.wakeR.reset(),this.vortexL.reset(),this.vortexR.reset(),this.spray.clear(),this.exhaust.clear(),this.stampL.mesh.visible=!1,this.stampR.mesh.visible=!1,this.sprayAcc=0,this.exhaustAcc=0,this.rng=new $e("plane-effects")}update(t,e,n,i,o){const r=t.telemetry,a=t.quaternion,l=r.groundSpeed,h=this.tmp.copy(e.floatSternL).applyQuaternion(a).add(t.position),c=this.tmp2.copy(e.floatSternR).applyQuaternion(a).add(t.position),d=r.onWater&&l>1.5;this.wakeL.update(h.x,h.z,i,d,l),this.wakeR.update(c.x,c.z,i,d,l);const u=t.forward(this.tmp3),v=Math.hypot(u.x,u.z)||1,p=.9*(1-St(6,18,l));for(const[y,w,x]of[[this.stampL,e.floatBowL,e.floatSternL],[this.stampR,e.floatBowR,e.floatSternR]]){const b=this.tmp.copy(w).add(x).multiplyScalar(.5).setX(.5*(w.x+x.x)-.1).applyQuaternion(a).add(t.position);y.update(b.x,b.z,u.x/v,u.z/v,r.onWater&&p>.02,p)}if(r.onWater&&l>4){const y=90*St(4,14,l)*(1-.5*St(25,40,l));this.sprayAcc+=y*n;const w=t.forward(new C);for(;this.sprayAcc>=1;){this.sprayAcc-=1;for(const x of[e.floatBowL,e.floatBowR]){const b=this.tmp.copy(x).applyQuaternion(a).add(t.position),M=x.z>0?1:-1,A=new C(0,0,1).applyQuaternion(a);this.spray.emit({x:b.x,y:.1,z:b.z,vx:w.x*l*.35+A.x*M*(2+this.rng.next()*3)+(this.rng.next()-.5)*2,vy:2.5+this.rng.next()*3.5+l*.08,vz:w.z*l*.35+A.z*M*(2+this.rng.next()*3)+(this.rng.next()-.5)*2,life:.7+this.rng.next()*.6,age:0,size:.6+this.rng.next()*.8})}}}if(this.spray.update(n,9.81,1.2,o*.9),r.rpm>.2){this.exhaustAcc+=(10+25*r.rpm)*n;const y=t.forward(new C);for(;this.exhaustAcc>=1;){this.exhaustAcc-=1;const w=this.tmp.copy(e.exhaustPos).applyQuaternion(a).add(t.position);this.exhaust.emit({x:w.x,y:w.y,z:w.z,vx:t.velocity.x-y.x*6+(this.rng.next()-.5),vy:t.velocity.y-1.5+this.rng.next()*1.5,vz:t.velocity.z-y.z*6+(this.rng.next()-.5),life:.35+this.rng.next()*.3,age:0,size:.35+this.rng.next()*.3})}}this.exhaust.update(n,-.3,2.5,o*.9);const g=Qt((r.alpha-.13)/.12,0,1)*St(35,55,r.airspeed),f=this.tmp.copy(e.wingTipL).applyQuaternion(a).add(t.position),m=this.tmp2.copy(e.wingTipR).applyQuaternion(a).add(t.position);this.vortexL.update(f.x,f.z,i,g>.05,r.airspeed),this.vortexR.update(m.x,m.z,i,g>.05,r.airspeed),this.vortexL.mesh.position.y=f.y,this.vortexL.mesh.updateMatrix(),this.vortexR.mesh.position.y=m.y,this.vortexR.mesh.updateMatrix(),this.vortexL.mesh.material.uniforms.uStrength.value=g*.7,this.vortexR.mesh.material.uniforms.uStrength.value=g*.7}}class k_{model=new N_;flight;effects;inputs={throttle:0,pitch:0,roll:0,yaw:0,flaps:0,brake:!1};constructor(t,e,n){this.flight=new Ga(t),this.effects=new F_(n,e),e.add(this.model.root)}place(t,e,n,i,o,r,a,l){this.flight.position.set(t,e,n);const h=Math.atan2(Math.cos(i),Math.sin(i)),c=new Be(0,0,0,"YZX");c.set(r,h,o,"YZX"),this.flight.quaternion.setFromEuler(c);const d=new C(1,0,0).applyQuaternion(this.flight.quaternion);this.flight.velocity.copy(d).multiplyScalar(a),this.flight.omega.set(0,0,0),this.flight.rpm=l,this.inputs.throttle=l,this.flight.step(this.inputs,0),this.syncModel(),this.effects.reset()}syncModel(){this.model.root.position.copy(this.flight.position),this.model.root.quaternion.copy(this.flight.quaternion)}update(t,e,n,i,o,r,a){this.flight.wind.copy(i),this.flight.turbulence=o,a&&this.flight.step(this.inputs,t),this.syncModel();const l=this.flight.telemetry;this.model.animate(this.inputs.pitch,this.inputs.roll,this.inputs.yaw,this.inputs.flaps,l.rpm,t,e,n,l.gearDown,l,this.inputs.throttle),this.effects.update(this.flight,this.model,t,e,r)}}class O_{constructor(t){this.camera=t}mode="chase";pos=new C;vel=new C;lookTarget=new C;tmp=new C;tmp2=new C;fwd=new C;lookLift=new C(0,1.2,0);orbitQ=new Xe;euler=new Be;q=new Xe;groundHeight=null;smoothQ=new Xe;time=0;initialised=!1;baseFov=50;shakeScale=.5;orbitYaw=0;orbitPitch=0;chaseDistance=25;chaseHeight=6.5;snap(){this.initialised=!1}update(t,e,n){this.time+=n;const i=this.camera,o=t.telemetry,r=o.gustLevel*this.shakeScale,a=o.buffet*this.shakeScale,l=0*this.shakeScale,h=Vt(this.time*2.3,.3)*.1*r+Vt(this.time*9.5,1.3)*.06*a+Vt(this.time*13,2.2)*.015*l,c=Vt(this.time*2.9,4.3)*.1*r+Vt(this.time*11,5.7)*.06*a+Vt(this.time*15,6.1)*.015*l,d=Vt(this.time*2.1,8.3)*.1*r+Vt(this.time*10.2,9.1)*.06*a+Vt(this.time*12,7.7)*.015*l;if(this.mode==="fixed")return;if(this.mode==="cockpit"){const _=this.tmp.copy(e.cockpitEye).applyQuaternion(t.quaternion).add(t.position);this.q.copy(t.quaternion),this.initialised||(this.smoothQ.copy(this.q),this.initialised=!0),this.smoothQ.slerp(this.q,1-Math.exp(-n*14));const E=new Xe().setFromEuler(new Be(0,-Math.PI/2,0));i.quaternion.copy(this.smoothQ).multiply(E);const T=new Xe().setFromEuler(new Be(-this.orbitPitch*.6,this.orbitYaw*1.2,0,"YXZ"));i.quaternion.multiply(T),_.x+=h*.15,_.y+=c*.15,_.z+=d*.15,i.position.copy(_),i.fov=this.baseFov+12,i.updateProjectionMatrix();return}const u=t.forward(this.fwd),v=Math.atan2(u.x,u.z),p=o.airspeed,g=this.chaseDistance+p*.08,f=this.chaseHeight+p*.012,m=this.orbitQ.setFromEuler(this.euler.set(this.orbitPitch,v+this.orbitYaw,0,"YXZ")),y=this.tmp2.set(0,f,-g).applyQuaternion(m).add(t.position);this.initialised||(this.pos.copy(y),this.vel.set(0,0,0),this.initialised=!0);const w=60,x=2*.9*Math.sqrt(60);y.addScaledVector(t.velocity,x/w);const b=this.tmp.copy(y).sub(this.pos).multiplyScalar(w).addScaledVector(this.vel,-x);this.vel.addScaledVector(b,n),this.pos.addScaledVector(this.vel,n);const M=Math.max(1.2,this.groundHeight?this.groundHeight(this.pos.x,this.pos.z)+2.5:1.2);this.pos.y<M&&(this.pos.y=M,this.vel.y<0&&(this.vel.y=0));const A=this.lookTarget.copy(t.position).addScaledVector(u,6).add(this.lookLift);i.position.copy(this.pos),i.position.x+=h,i.position.y+=c,i.position.z+=d,i.up.set(0,1,0),i.lookAt(A);const S=o.bank;i.rotateZ(-S*.18),i.fov=this.baseFov+St(30,90,p)*6,i.updateProjectionMatrix()}}class B_{constructor(t){this.renderer=t;const n=t.getContext().getExtension("EXT_disjoint_timer_query_webgl2");if(n&&(this.gpuExt=n),"PerformanceObserver"in window)try{new PerformanceObserver(o=>{this.longTasks+=o.getEntries().length}).observe({entryTypes:["longtask"]})}catch{}}times=[];lastStart=0;longTasks=0;gpuQuery=null;gpuExt=null;lastGpuMs=null;visibleObjects=0;beginFrame(){this.lastStart=performance.now();const t=this.renderer.getContext();this.gpuExt&&!this.gpuQuery&&(this.gpuQuery=t.createQuery(),t.beginQuery(this.gpuExt.TIME_ELAPSED_EXT,this.gpuQuery))}endFrame(){const t=performance.now()-this.lastStart;this.times.push(t),this.times.length>600&&this.times.shift();const e=this.renderer.getContext();if(this.gpuExt&&this.gpuQuery){e.endQuery(this.gpuExt.TIME_ELAPSED_EXT);const n=this.gpuQuery;setTimeout(()=>{const i=e.getQueryParameter(n,e.QUERY_RESULT_AVAILABLE),o=e.getParameter(this.gpuExt.GPU_DISJOINT_EXT);i&&!o&&(this.lastGpuMs=e.getQueryParameter(n,e.QUERY_RESULT)/1e6),e.deleteQuery(n)},0),this.gpuQuery=null}}reset(){this.times.length=0,this.longTasks=0}snapshot(){const t=this.times.slice().sort((h,c)=>h-c),e=t.length||1,n=t.reduce((h,c)=>h+c,0)/e,i=t[Math.min(t.length-1,Math.floor(t.length*.99))]??0,o=t.slice(Math.floor(t.length*.99)),r=o.length?o.reduce((h,c)=>h+c,0)/o.length:n,a=this.renderer.info,l=performance.memory;return{frames:t.length,avgMs:n,p99Ms:i,minFps:t.length?1e3/(t[t.length-1]||1):0,avgFps:n?1e3/n:0,onePercentLowFps:r?1e3/r:0,calls:a.render.calls,triangles:a.render.triangles,points:a.render.points,lines:a.render.lines,geometries:a.memory.geometries,textures:a.memory.textures,programs:a.programs?.length??0,jsHeapMB:l?l.usedJSHeapSize/1048576:null,gpuMs:this.lastGpuMs,longTasks:this.longTasks,visibleObjects:this.visibleObjects}}}const H_={low:{samples:0,shadowMapSize:1024,cascades:2,cloudSteps:10,skyScale:.35,shadowFar:1500,anisotropy:2,bloom:!0},medium:{samples:2,shadowMapSize:2048,cascades:3,cloudSteps:16,skyScale:.5,shadowFar:2500,anisotropy:4,bloom:!0},high:{samples:4,shadowMapSize:2048,cascades:3,cloudSteps:24,skyScale:.6,shadowFar:3500,anisotropy:8,bloom:!0},ultra:{samples:4,shadowMapSize:4096,cascades:4,cloudSteps:32,skyScale:1,shadowFar:5e3,anisotropy:16,bloom:!0}};class G_{constructor(t,e){this.canvas=t,this.params=e,this.quality=H_[e.quality],this.renderer=new Cx({canvas:t,antialias:!1,powerPreference:"high-performance",logarithmicDepthBuffer:!0,alpha:!1,stencil:!1,preserveDrawingBuffer:!0}),this.renderer.outputColorSpace=Ys,this.renderer.toneMapping=qi,this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=ju,this.renderer.shadowMap.autoUpdate=!1,this.renderer.autoClear=!0,this.renderer.info.autoReset=!1,this.camera=new kn(50,16/9,.4,6e4),Od(this.camera),this.camera.layers.enable(kd),this.atmos=new l2(e.seed),e.time!==null&&(this.atmos.hour=e.time),e.weather&&this.atmos.setWeather(e.weather),this.metrics=new B_(this.renderer)}renderer;scene=new zo;camera;atmos;quality;metrics;map;textures;terrain;water;sky;wakes;csm;cascades;post;reflection;roads;bridges;city;vegetation;props;traffic;aircraft;airframeCasters=[];flightCamera;cull=new Hd;shadowPassStats=ps;passStats={wake:{calls:0,triangles:0},sky:{calls:0,triangles:0},shadow:{calls:0,triangles:0},reflection:{calls:0,triangles:0},main:{calls:0,triangles:0},post:{calls:0,triangles:0}};width=1;height=1;time=0;envTimer=0;lastEnvHour=-1;lastEnvWeather="";litMaterials=new Set;windVec=new C;registerLit(t){if(this.litMaterials.has(t))return;this.litMaterials.add(t);const e=t.onBeforeCompile;this.csm.setupMaterial(t);const n=t.onBeforeCompile;t.onBeforeCompile=(i,o)=>{n.call(t,i,o),e?.call(t,i,o)},t.needsUpdate=!0}registerTree(t){t.traverse(e=>{const n=e.material;if(n)for(const i of Array.isArray(n)?n:[n])i.isMeshStandardMaterial&&this.registerLit(i)})}async tick(t,e,n){t(e,n),await new Promise(i=>setTimeout(i,0))}async init(t){await this.tick(t,"Surveying the coastline",.02),this.map=new S2,this.map.generate(f=>t("Shaping islands and bays",.02+f*.3)),await this.tick(t,"Uploading terrain",.33),this.textures=new V2(this.map,this.renderer);const e=this.quality;this.cascades=new bw(this.camera),this.csm=new n2({camera:this.camera,parent:this.scene,cascades:e.cascades,maxFar:e.shadowFar,mode:"custom",customSplitsCallback:this.cascades.splitsCallback,shadowMapSize:e.shadowMapSize,lightDirection:new C(.3,-1,.2).normalize(),lightIntensity:1,shadowBias:-2e-4,lightMargin:300}),this.cascades.attach(this.csm),this.csm.fade=!0,this.params.dbg.has("cascades")&&Mw(),B2(this.renderer,f=>this.csm.lights.indexOf(f)),this.sky=new N2(this.atmos,this.renderer,{cloudSteps:e.cloudSteps,scale:e.skyScale}),this.sky.dome.name="sky",this.scene.add(this.sky.dome),this.wakes=new fw(2048,3200),this.terrain=new K2(this.textures),this.registerLit(this.terrain.material),this.terrain.group.name="terrain",this.scene.add(this.terrain.group),this.water=new dw(this.textures,this.wakes.texture),this.registerLit(this.water.material),this.water.mesh.name="water",this.scene.add(this.water.mesh);const n=uf[this.params.quality];this.reflection=new iw(this.renderer,this.atmos,hf[this.params.quality],n),this.reflection.exclude(this.water.mesh,this.sky.dome),this.reflection.excludeChildrenWhen(this.terrain.group,f=>ew(f)>n*1.2),this.water.attachReflection(this.reflection.uniforms),await this.tick(t,"Laying out streets",.4);const i=Sw(this.map);this.roads=i.segments;const o=Cw();this.registerLit(o);const r=this.params.debugRoads?new ch({color:16719904}):o;for(const f of Tw(this.map,this.roads,r))f.name="roads",this.scene.add(f),this.reflection.exclude(f);await this.tick(t,"Raising bridges",.46);const a=new ce({color:12104874,roughness:.9}),l=new ce({color:14278114,roughness:.4,metalness:.6});this.registerLit(a),this.registerLit(l),this.bridges=jw(this.map,r,a,l),this.bridges.group.name="bridges",this.scene.add(this.bridges.group),this.reflection.excludeChildrenWhen(this.bridges.group,f=>f.isInstancedMesh===!0&&!f.castShadow),await this.tick(t,"Building the city",.52),this.city=py(this.map,i.blocksByDistrict,this.atmos.uniforms.uNight),this.registerLit(this.city.batches.material),this.city.batches.group.name="city",this.scene.add(this.city.batches.group);const h=(f,m)=>au(f,m)>n,c=this.city.batches;this.reflection.excludeChildrenWhen(c.group,(f,m)=>c.cameraMeshes.has(f)||!c.mirrorMeshes.has(f)&&h(f,m));for(const f of this.roads){const m=Math.hypot(f.b[0]-f.a[0],f.b[1]-f.a[1]),y=Math.max(1,Math.ceil(m/10));for(let w=0;w<=y;w++)this.city.markOccupied(f.a[0]+(f.b[0]-f.a[0])*(w/y),f.a[1]+(f.b[1]-f.a[1])*(w/y),f.width*.5+3)}await this.tick(t,"Dressing harbours and airports",.66),this.props=new Jy(this.map,this.roads,this.bridges.lampPositions,this.city.markOccupied);for(const f of this.props.materials)this.registerLit(f);this.props.group.name="props",this.scene.add(this.props.group);const d=this.props;this.reflection.excludeChildrenWhen(d.group,(f,m)=>d.cameraMeshes.has(f)||!d.mirrorMeshes.has(f)&&h(f,m)),await this.tick(t,"Planting palms and mangroves",.74),this.vegetation=new Rr(this.map,this.city.occupied);for(const f of this.vegetation.materials)this.registerLit(f);this.vegetation.group.name="vegetation",this.scene.add(this.vegetation.group);const u=this.vegetation;this.reflection.excludeChildrenWhen(u.group,(f,m)=>f===u.cameraCards||f!==u.mirrorCards&&(nw(f)>64||au(f,m)>ef)),await this.tick(t,"Launching boats and traffic",.86),this.traffic=new s_(this.map,this.roads,this.bridges.routes,this.wakes.batch,this.params.seed,this.props.mooredBoatPositions);for(const f of this.traffic.materials)this.registerLit(f);this.traffic.group.name="traffic",this.scene.add(this.traffic.group);for(const f of this.traffic.contrailMeshes)f.name="contrail",this.scene.add(f);await this.tick(t,"Pre-flighting the aircraft",.92),this.aircraft=new k_((f,m)=>this.map.heightAt(f,m),this.scene,this.wakes.batch),this.registerTree(this.aircraft.model.root),this.aircraft.model.root.traverse(f=>{f.isMesh&&f.castShadow&&this.airframeCasters.push(f)});const v=this.aircraft.effects;this.reflection.exclude(v.stampL.mesh,v.stampR.mesh,v.spray.points,v.exhaust.points,v.vortexL.mesh,v.vortexR.mesh,...this.traffic.contrailMeshes,...this.aircraft.model.interiorMeshes),this.flightCamera=new O_(this.camera),this.flightCamera.groundHeight=(f,m)=>Math.max(0,this.map.heightAt(f,m));const p=this.map.pois.find(f=>f.kind==="seaplane");this.aircraft.place(p.x+120,1.6,p.z+60,0,0,0,0,0),this.post=new ww(this.renderer,this.atmos,{samples:e.samples,bloom:e.bloom});const g=this.params.dbg;g.has("noterrain")&&(this.terrain.group.visible=!1),g.has("noshadow")&&(this.renderer.shadowMap.enabled=!1),g.has("noveg")&&(this.vegetation.group.visible=!1),g.has("nocity")&&(this.city.batches.group.visible=!1),g.has("nocloudshadow")&&(this.post.cloudShadowStrength=0,this.reflection.cloudShadowStrength=0),g.has("norefl")&&(this.reflection.enabled=!1),this.atmos.update(0),this.refreshEnvironment(),await this.tick(t,"Compiling shaders",.97),this.warmShaders(),t("Ready",1)}warmShaders(){const t=this.aircraft.flight,e={p:t.position.clone(),q:t.quaternion.clone(),v:t.velocity.clone(),w:t.omega.clone(),rpm:t.rpm,thr:this.aircraft.inputs.throttle},n=t.position.y;this.aircraft.place(t.position.x,n,t.position.z,Math.PI*.5,0,0,14,1),this.aircraft.inputs.throttle=1;const i=this.camera.position.clone(),o=this.camera.quaternion.clone();this.flightCamera.snap();for(let a=0;a<3;a++)this.update(1/30,!0),this.flightCamera.update(t,this.aircraft.model,1/30);this.render(),this.aircraft.place(t.position.x,60,t.position.z,Math.PI*.5,.05,.1,50,1),this.aircraft.inputs.throttle=1;for(let a=0;a<3;a++)this.update(1/30,!0),this.flightCamera.update(t,this.aircraft.model,1/30);this.render();const r=[];this.scene.traverse(a=>{a.visible||(a.visible=!0,r.push(a))});try{this.renderer.compile(this.scene,this.camera)}finally{for(const a of r)a.visible=!1}this.aircraft.place(e.p.x,e.p.y,e.p.z,Math.PI*.5,0,0,0,e.thr),t.quaternion.copy(e.q),t.velocity.copy(e.v),t.omega.copy(e.w),t.rpm=e.rpm,this.aircraft.syncModel(),this.camera.position.copy(i),this.camera.quaternion.copy(o),this.flightCamera.snap(),this.time=0}refreshEnvironment(){const t=this.sky.updateEnvironment();this.scene.environment=t,this.scene.environmentIntensity=this.atmos.state.ambientIntensity,this.lastEnvHour=this.atmos.hour,this.lastEnvWeather=this.atmos.weather}setSize(t,e,n=1){this.width=t,this.height=e,this.renderer.setPixelRatio(n),this.renderer.setSize(t,e,!1),this.camera.aspect=t/e,this.camera.updateProjectionMatrix(),this.post.setSize(Math.round(t*n),Math.round(e*n)),this.reflection.setSize(Math.round(t*n),Math.round(e*n)),this.csm.updateFrustums()}update(t,e=!0){this.time+=t,this.atmos.update(t);const n=this.atmos.state;this.csm.lightDirection.copy(n.sunDir).negate();const i=1-.45*St(.45,.95,this.atmos.preset.coverage);for(const r of this.csm.lights)r.intensity=n.sunIntensity,r.color.copy(n.sunColor),r.shadow.intensity=i;this.envTimer+=t,(Math.abs(this.atmos.hour-this.lastEnvHour)>.02||this.atmos.weather!==this.lastEnvWeather||this.envTimer>120)&&(this.envTimer=0,this.refreshEnvironment()),this.scene.environmentIntensity=n.ambientIntensity;const o=this.atmos.preset;this.windVec.set(this.atmos.windDir.x,0,this.atmos.windDir.y).multiplyScalar(o.windSpeed),this.vegetation.update(this.time,o.windSpeed),this.traffic.update(t,this.time,n.night),this.props.setNight(n.night),this.aircraft.update(t,this.time,n.night,this.windVec,o.turbulence,this.height,e)}render(){this.metrics.beginFrame(),this.renderer.info.reset();const t=this.camera;t.updateMatrixWorld();const e=t.position.x,n=t.position.z,i=Math.min(12e3,Math.max(this.quality.shadowFar,Math.round(t.position.y*9/250)*250)),o=this.aircraft.flight.position,r=Math.max(0,this.map.heightAt(e,n));this.cascades.updateSplits(i,o,9,r),this.cascades.fit(o.y+5),this.cull.update(t,this.csm.maxFar,this.atmos.state.sunDir),this.terrain.update(e,n,this.cull),this.city.batches.shadowDistance=this.csm.maxFar,this.vegetation.shadowDistance=Math.max(1800,Math.min(3e3,this.csm.maxFar*.4)),this.vegetation.updateLod(e,n,this.cull,t.position),this.city.batches.updateLod(e,n,this.cull,t.position,this.reflection.range),this.props.updateLod(e,n,this.cull,t.position,this.reflection.range),this.traffic.updateCulling(this.cull);const a=o.y-Math.max(0,this.map.heightAt(o.x,o.z))+5,l=$s("all",!0,this.cull.casterCascades(o,9,a));for(const g of this.airframeCasters)g.layers.mask=l;this.water.update(e,n,this.time,this.atmos.preset.windSpeed,this.atmos.windDir,this.atmos.state.sunDir,this.wakes.center,this.wakes.size);const h=this.renderer.info.render,c=this.passStats,d=this.markPass;this.passCalls0=h.calls,this.passTriangles0=h.triangles,this.wakes.render(this.renderer,e,n),d("wake"),this.sky.render(this.renderer,t,this.post.width,this.post.height),d("sky"),this.renderer.shadowMap.needsUpdate=!0,this.reflection.render(this.scene,t),d("reflection"),this.renderer.setRenderTarget(this.post.target),this.renderer.render(this.scene,t),d("main");let u=0,v=0;for(let g=0;g<ps.calls.length;g++)u+=ps.calls[g],v+=ps.triangles[g];c.shadow.calls=u,c.shadow.triangles=v;const p=this.reflection.uniforms.uReflParams.value.x>0?c.reflection:c.main;p.calls-=u,p.triangles-=v,this.post.finish(t,this.time),d("post"),this.params.dbg.has("reflview")&&this.reflection.debugBlit(),this.metrics.endFrame()}passCalls0=0;passTriangles0=0;markPass=t=>{const e=this.renderer.info.render,n=this.passStats[t];n.calls=e.calls-this.passCalls0,n.triangles=e.triangles-this.passTriangles0,this.passCalls0=e.calls,this.passTriangles0=e.triangles}}const V_=.22,W_=.15;function ac(s,t,e){const n=Math.abs(t)<Math.abs(s)-1e-6&&(t===0||Math.sign(t)===Math.sign(s)),i=e/(n?W_:V_),o=t-s;return Math.abs(o)<=i?t:s+Math.sign(o)*i}class X_{constructor(t){this.canvas=t,window.addEventListener("keydown",e=>{e.repeat||(this.keys.add(e.code),this.pressed.add(e.code),["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)&&e.preventDefault())}),window.addEventListener("keyup",e=>this.keys.delete(e.code)),window.addEventListener("blur",()=>this.keys.clear()),t.addEventListener("mousedown",e=>{this.dragging=!0,this.lastX=e.clientX,this.lastY=e.clientY}),window.addEventListener("mouseup",()=>{this.dragging=!1}),window.addEventListener("mousemove",e=>{this.dragging&&(this.orbitYaw-=(e.clientX-this.lastX)*.006,this.orbitPitch+=(e.clientY-this.lastY)*.005,this.orbitPitch=Math.max(-1.2,Math.min(1.2,this.orbitPitch)),this.lastX=e.clientX,this.lastY=e.clientY)}),t.addEventListener("wheel",e=>{this.flight.throttle=Math.max(0,Math.min(1,this.flight.throttle-Math.sign(e.deltaY)*.05)),e.preventDefault()},{passive:!1})}keys=new Set;flight={throttle:0,pitch:0,roll:0,yaw:0,flaps:0,brake:!1};targetPitch=0;targetRoll=0;targetYaw=0;cmdPitch=0;cmdRoll=0;cmdYaw=0;orbitYaw=0;orbitPitch=0;dragging=!1;lastX=0;lastY=0;pressed=new Set;enabled=!0;down(t){return this.keys.has(t)}consume(t){const e=this.pressed.has(t);return this.pressed.delete(t),e}update(t){if(!this.enabled){this.pressed.clear();return}const e=this.flight,n=(l,h)=>(this.down(l)?1:0)-(this.down(h)?1:0);this.targetPitch=n("KeyS","KeyW")+n("ArrowDown","ArrowUp"),this.targetRoll=n("KeyD","KeyA")+n("ArrowRight","ArrowLeft"),this.targetYaw=n("KeyE","KeyQ");const i=navigator.getGamepads?navigator.getGamepads():[],o=i&&i[0];if(o){const l=h=>Math.abs(h)<.08?0:h;this.targetRoll+=l(o.axes[0]??0),this.targetPitch+=l(o.axes[1]??0),this.targetYaw+=l(o.axes[2]??0),o.buttons[7]?.value&&(e.throttle=Math.min(1,e.throttle+o.buttons[7].value*t*.8)),o.buttons[6]?.value&&(e.throttle=Math.max(0,e.throttle-o.buttons[6].value*t*.8))}const r=l=>Math.max(-1,Math.min(1,l));this.cmdPitch=ac(this.cmdPitch,r(this.targetPitch),t),this.cmdRoll=ac(this.cmdRoll,r(this.targetRoll),t),this.cmdYaw=ac(this.cmdYaw,r(this.targetYaw),t);const a=1-Math.exp(-t*25);e.pitch+=(this.cmdPitch-e.pitch)*a,e.roll+=(this.cmdRoll-e.roll)*a,e.yaw+=(this.cmdYaw-e.yaw)*a,(this.down("ShiftLeft")||this.down("ShiftRight"))&&(e.throttle=Math.min(1,e.throttle+t*.55)),(this.down("ControlLeft")||this.down("ControlRight"))&&(e.throttle=Math.max(0,e.throttle-t*.55)),this.consume("KeyF")&&(e.flaps=e.flaps>.5?0:e.flaps>0?1:.5),e.brake=this.down("KeyB")||this.down("Space"),this.dragging||(this.orbitYaw*=Math.exp(-t*2.2),this.orbitPitch*=Math.exp(-t*2.2))}}const Yn=s=>document.getElementById(s);class q_{root=Yn("hud");speed=Yn("hud-speed-val");alt=Yn("hud-alt-val");vs=Yn("hud-vs-val");heading=Yn("hud-heading-val");card=Yn("hud-heading-card");thrFill=Yn("hud-throttle-fill");thrVal=Yn("hud-throttle-val");rpm=Yn("hud-rpm-val");stall=Yn("hud-stall");msg=Yn("hud-msg");cam=Yn("hud-cam");time=Yn("hud-time");visible=!0;msgTimer=0;wasCrashed=!1;show(t){this.visible=t,this.root.classList.toggle("hidden",!t)}toggle(){this.show(!this.visible)}flash(t,e=2.5){this.msg.textContent=t,this.msgTimer=e}update(t,e,n,i,o){if(!this.visible)return;this.speed.textContent=Math.round(t.airspeed*1.9438).toString(),this.alt.textContent=Math.round(t.altitude*3.2808).toString();const r=Math.round(t.verticalSpeed*196.85/50)*50;this.vs.textContent=(r>0?"+":"")+r.toString();const a=Math.round(t.heading)%360;this.heading.textContent=a.toString().padStart(3,"0");const l=["N","NE","E","SE","S","SW","W","NW"];this.card.textContent=l[Math.round(a/45)%8],this.thrFill.style.width=`${Math.round(e*100)}%`,this.thrVal.textContent=`${Math.round(e*100)}%`,this.rpm.textContent=Math.round(600+t.rpm*2e3).toString(),this.stall.classList.toggle("hidden",!t.stalled),t.crashed&&!this.wasCrashed&&this.flash("Crashed — aircraft reset upright on the surface. Throttle up to go again.",5),this.wasCrashed=t.crashed,this.cam.textContent=n.toUpperCase();const h=Math.floor(i)%24,c=Math.floor(i%1*60);this.time.textContent=`${h.toString().padStart(2,"0")}:${c.toString().padStart(2,"0")}`,this.msgTimer>0&&(this.msgTimer-=o,this.msgTimer<=0&&(this.msg.textContent=""))}}const Ch=[{id:"aerial-a",name:"Reference A — high aerial",description:"Reference-style wide aerial over Isla Garza looking north: causeway receding NNE, downtown skyline upper-left, boats with wakes below, aircraft lower right.",time:14.6,weather:"scattered",camera:{mode:"fixed",pos:[480,400,3720],headingDeg:-6,pitchDeg:-11,fov:42},plane:{fromCamera:{screenX:.76,screenY:.74,distance:50},headingDeg:200,pitchDeg:2,bankDeg:-24,speed:52,throttle:.75},presim:40,clipInputs:{pitch:.05,roll:-.05,yaw:0}},{id:"cockpit-city",name:"Cockpit approaching the city",description:"From the pilot seat, downtown ahead beyond the bay, instrument panel and windshield frame in view.",time:10.5,weather:"clear",camera:{mode:"cockpit",fov:50},plane:{pos:[-900,320,1400],headingDeg:342,pitchDeg:1,bankDeg:0,speed:58,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"bridge-low",name:"Low-altitude bridge flyover",description:"Chase view 45 m over the northern causeway arch, traffic on the deck, piers meeting the water.",time:15.5,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[-1950,52,-3740],headingDeg:96,pitchDeg:0,bankDeg:4,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:.05,yaw:0}},{id:"skyline-high",name:"High-altitude skyline",description:"Fixed camera 900 m up over the bay looking north-west at the downtown skyline hierarchy, port in the middle distance.",time:16.2,weather:"scattered",camera:{mode:"fixed",pos:[-300,900,-1200],headingDeg:-38,pitchDeg:-10,fov:45},plane:{fromCamera:{screenX:.72,screenY:.68,distance:70},headingDeg:-30,pitchDeg:0,bankDeg:12,speed:60,throttle:.7},presim:30,clipInputs:{pitch:0,roll:.1,yaw:0}},{id:"island-pass",name:"Coastal island pass",description:"Low along the barrier island ocean beach: hotels left, surf and shallows right, dunes and palms below.",time:11.5,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[3350,130,-2200],headingDeg:352,pitchDeg:0,bankDeg:-6,speed:52,throttle:.65},presim:30,clipInputs:{pitch:0,roll:-.05,yaw:0}},{id:"harbor",name:"Harbor and marina pass",description:"Over the port: container cranes, cruise terminal, ship channel and the downtown marina beyond.",time:9.5,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[-2100,160,-2500],headingDeg:52,pitchDeg:0,bankDeg:0,speed:50,throttle:.65},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"water-landing",name:"Seaplane water approach",description:"Final approach a few metres above the Garza channel, floats about to touch: foam, wake and spray.",time:13,weather:"clear",camera:{mode:"chase",fov:48},plane:{pos:[-500,5.5,3330],headingDeg:86,pitchDeg:4,bankDeg:0,speed:29,throttle:.25,flaps:1},presim:30,clipInputs:{pitch:.12,roll:0,yaw:0}},{id:"sunset",name:"Sunset flight",description:"Low sun in the west over the bay, downtown silhouetted, warm haze and long water reflections.",time:17.9,weather:"scattered",camera:{mode:"chase",fov:50},plane:{pos:[1400,280,600],headingDeg:262,pitchDeg:1,bankDeg:0,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"cloudy",name:"Cloudy-weather flight",description:"Heavy cumulus and grey haze over Isla Garza; softer light, cloud shadows moving across the water.",time:15,weather:"cloudy",camera:{mode:"chase",fov:50},plane:{pos:[700,300,3100],headingDeg:335,pitchDeg:0,bankDeg:0,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"night",name:"Night flight with city lights",description:"Over the bay at 22:00 looking toward downtown: lit windows, street lamps, headlights and navigation strobes.",time:22,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[-400,320,-900],headingDeg:318,pitchDeg:0,bankDeg:0,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}}];Ch.push({id:"plane-rear-quarter",name:"Aircraft rear three-quarter",description:"Fixed camera 14 m from the aircraft, rear-left-above, aircraft moored at the Garza marina in sunlight.",time:14,weather:"clear",camera:{mode:"fixed",pos:[425.9,4.25,1892.3],headingDeg:205,pitchDeg:-9,fov:40},plane:{pos:[420,1.96,1905],headingDeg:240,pitchDeg:0,bankDeg:0,speed:0,throttle:0},presim:10,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"plane-front-quarter",name:"Aircraft front three-quarter",description:"Fixed camera 13 m ahead-right of the moored aircraft, low, showing cowl, propeller, windshield and floats.",time:10,weather:"clear",camera:{mode:"fixed",pos:[415.6,2.65,1917.2],headingDeg:20,pitchDeg:-3,fov:40},plane:{pos:[420,1.96,1905],headingDeg:240,pitchDeg:0,bankDeg:0,speed:0,throttle:0},presim:10,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"glass-sun",name:"Cockpit glass in direct sun",description:"Close on the windshield and left side windows with the sun behind the camera; interior visible through the glass.",time:15.5,weather:"clear",camera:{mode:"fixed",pos:[418.3,3.05,1911.3],headingDeg:15,pitchDeg:-8,fov:32},plane:{pos:[420,1.96,1905],headingDeg:240,pitchDeg:0,bankDeg:0,speed:0,throttle:0},presim:10,clipInputs:{pitch:0,roll:0,yaw:0}});function Y_(s){return Ch.find(t=>t.id===s)}class $_{constructor(t){this.game=t}view=null;fixedDt=1/30;frame=0;flying=!1;list(){return Ch.map(t=>({id:t.id,name:t.name,description:t.description}))}setup(t){const e=Y_(t);if(!e)return!1;this.view=e;const n=this.game;n.atmos.hour=e.time,n.atmos.setWeather(e.weather),n.time=0,this.placePlane(e);for(let i=0;i<Math.round(e.presim/this.fixedDt);i++)n.update(this.fixedDt,!1);return this.placePlane(e),this.setupCamera(e),n.aircraft.inputs.throttle=e.plane.throttle,n.aircraft.inputs.flaps=e.plane.flaps??0,n.aircraft.inputs.pitch=e.clipInputs.pitch,n.aircraft.inputs.roll=e.clipInputs.roll,n.aircraft.inputs.yaw=e.clipInputs.yaw,n.update(this.fixedDt,!1),this.updateCamera(this.fixedDt),this.flying=!1,this.frame=0,n.metrics.reset(),!0}placePlane(t){const e=this.game,n=t.plane;let i;if(n.fromCamera&&t.camera.pos){const r=this.fixedCamera(t),a=n.fromCamera.screenX*2-1,l=1-n.fromCamera.screenY*2,h=new C(a,l,.5).unproject(r).sub(r.position).normalize(),c=r.position.clone().addScaledVector(h,n.fromCamera.distance);i=[c.x,c.y,c.z]}else i=n.pos;const o=r=>r*Math.PI/180;e.aircraft.place(i[0],i[1],i[2],o(n.headingDeg),o(n.pitchDeg),o(n.bankDeg),n.speed,n.throttle)}fixedCamera(t){const e=new kn(t.camera.fov,this.game.camera.aspect,.4,6e4),[n,i,o]=t.camera.pos;e.position.set(n,i,o);const r=(t.camera.headingDeg??0)*Math.PI/180,a=(t.camera.pitchDeg??0)*Math.PI/180;return e.rotation.set(0,0,0),e.rotation.order="YXZ",e.rotation.y=-r,e.rotation.x=a,e.updateMatrixWorld(),e.updateProjectionMatrix(),e}setupCamera(t){const e=this.game,n=e.flightCamera;if(n.baseFov=t.camera.fov,n.orbitPitch=0,n.orbitYaw=0,t.camera.mode==="fixed"){n.mode="fixed";const i=this.fixedCamera(t);e.camera.position.copy(i.position),e.camera.quaternion.copy(i.quaternion),e.camera.fov=t.camera.fov,e.camera.updateProjectionMatrix()}else{n.mode=t.camera.mode,n.snap();for(let i=0;i<120;i++)n.update(e.aircraft.flight,e.aircraft.model,this.fixedDt)}}updateCamera(t){this.game.flightCamera.update(this.game.aircraft.flight,this.game.aircraft.model,t)}onFrame=null;step(t=1){const e=this.game;for(let n=0;n<t;n++)e.update(this.fixedDt,!0),this.updateCamera(this.fixedDt),this.frame++;this.flying=!0,this.onFrame?.(),e.render()}render(){this.game.render()}renderSync(){const t=this.game.renderer.getContext(),e=performance.now();this.game.render(),t.finish();const n=new Uint8Array(4);return t.readPixels(0,0,1,1,t.RGBA,t.UNSIGNED_BYTE,n),performance.now()-e}profile(t=20){const e=[];for(let o=0;o<t;o++)this.game.update(this.fixedDt,!0),this.updateCamera(this.fixedDt),e.push(this.renderSync());const n=e.slice().sort((o,r)=>o-r),i=n.reduce((o,r)=>o+r,0)/n.length;return{frames:t,avgMs:i,minMs:n[0],maxMs:n[n.length-1],p95Ms:n[Math.floor(n.length*.95)],onePercentLowMs:n[n.length-1]}}metrics(){const t=this.game.metrics.snapshot(),e=this.game.aircraft.flight.telemetry,n=this.game,i={...n.passStats,cascades:n.shadowPassStats.calls.map((o,r)=>({calls:o,triangles:n.shadowPassStats.triangles[r]})),reflectionHidden:n.reflection.stats.hidden};return{...t,passes:i,frame:this.frame,flying:this.flying,telemetry:{airspeed:e.airspeed,altitude:e.altitude,heading:e.heading,alpha:e.alpha,stalled:e.stalled,onWater:e.onWater},build:window.__build,view:this.view?.id??null,camera:{pos:this.game.camera.position.toArray(),quat:this.game.camera.quaternion.toArray(),fov:this.game.camera.fov}}}project(t,e,n){const i=new C(t,e,n).project(this.game.camera);return i.z>1?null:[(i.x+1)/2,(1-i.y)/2]}landmarks(){const t=this.game,e=t.map.bridges.find(g=>g.id==="garza-bridge"),n=e.pts[0],i=e.pts[e.pts.length-1],o=t.aircraft.flight.position,r={planeCentroid:this.project(o.x,o.y,o.z),bridgeStart:this.project(n[0],7,n[1]),bridgeEnd:this.project(i[0],7,i[1])};for(const g of t.city.landmarkPositions)r[`landmark:${g.name}`]=this.project(g.x,g.h,g.z);const a=t.map.bridges.find(g=>g.id==="tortuga-bridge");a&&(r.bridge2End=this.project(a.pts[a.pts.length-1][0],7,a.pts[a.pts.length-1][1])),r.horizonCentre=this.project(t.camera.position.x+Math.sin(0)*5e4,0,t.camera.position.z-5e4);let l=1/0,h=1/0,c=-1/0,d=-1/0;const u=new C;t.aircraft.model.root.updateMatrixWorld(!0);for(const g of t.aircraft.model.exteriorMeshes){if(!g.visible)continue;const f=g.geometry.getAttribute("position");if(f)for(let m=0;m<f.count;m++){u.fromBufferAttribute(f,m).applyMatrix4(g.matrixWorld);const y=this.project(u.x,u.y,u.z);y&&(l=Math.min(l,y[0]),h=Math.min(h,y[1]),c=Math.max(c,y[0]),d=Math.max(d,y[1]))}}Number.isFinite(l)&&(r.planeBoxMin=[l,h],r.planeBoxMax=[c,d]);const v=new C(0,0,-1).applyQuaternion(t.camera.quaternion),p=new C(v.x,0,v.z).normalize().multiplyScalar(3e4).add(t.camera.position);return r.horizon=this.project(p.x,t.camera.position.y,p.z),r}}window.__build="6b3d3214497a-20260905T063622Z";async function j_(){const s=df(),t=document.getElementById("view"),e=document.getElementById("start-status"),n=document.getElementById("start-btn"),i=document.getElementById("start");n.disabled=!0;const o=new G_(t,s);window.__game=o;const r=(f,m)=>{e.textContent=`${f}… ${Math.round(m*100)}%`};await o.init(r);const a=()=>{const f=s.width??window.innerWidth,m=s.height??window.innerHeight;s.width&&(t.style.width=`${f}px`,t.style.height=`${m}px`),o.setSize(f,m,s.width?1:Math.min(window.devicePixelRatio,1.5))};window.addEventListener("resize",a),a();const l=new q_,h=new X_(t),c=new $_(o);if(window.__bench=c,e.textContent=`Build ${window.__build}`,n.disabled=!1,s.bench){if(i.classList.add("hidden"),l.show(!s.noHud),!c.setup(s.bench)){e.textContent=`Unknown bench view ${s.bench}`;return}const m=document.getElementById("benchtag");m.classList.remove("hidden"),m.textContent=`${s.bench} · seed ${s.seed} · ${window.__build}`,s.noHud&&m.classList.add("hidden");const y=()=>l.update(o.aircraft.flight.telemetry,o.aircraft.inputs.throttle,o.flightCamera.mode,o.atmos.hour,1/30);c.onFrame=y;const w=()=>{c.render(),y(),window.__ready=!0,window.__benchReady=!0,s.freeze||requestAnimationFrame(w)};w();return}let d=!1;const u=()=>{d||(d=!0,i.classList.add("hidden"),l.show(!0),h.flight.flaps=1,l.flash("Takeoff: hold Shift for full throttle, keep the nose straight with A/D, and at 50 KIAS hold S to lift off. F toggles flaps, V camera shake.",9),o.aircraft.inputs.throttle=0,o.flightCamera.mode="chase",o.flightCamera.snap())};n.addEventListener("click",u),window.addEventListener("keydown",f=>{f.code==="Enter"&&!d&&u()}),s.autostart&&u();let v=performance.now(),p=0;const g=()=>{const f=performance.now();let m=s.fixedDt??Math.min(.1,(f-v)/1e3);if(v=f,s.freeze&&(m=0),h.update(m),d){const x=h.flight,b=o.aircraft.inputs;if(b.throttle=x.throttle,b.pitch=x.pitch,b.roll=x.roll,b.yaw=x.yaw,b.flaps=x.flaps,b.brake=x.brake,h.consume("KeyC")&&(o.flightCamera.mode=o.flightCamera.mode==="chase"?"cockpit":"chase",o.flightCamera.snap()),h.consume("KeyV")){const M=o.flightCamera;M.shakeScale=M.shakeScale>.25?0:.5,l.flash(M.shakeScale>0?"Camera shake on":"Camera shake off")}if(h.consume("KeyH")&&l.toggle(),h.consume("KeyT")&&(o.atmos.hour=(o.atmos.hour+2)%24,l.flash(`Time ${Math.floor(o.atmos.hour)}:00`)),h.consume("KeyY")){const M=["clear","scattered","cloudy","storm"],A=(M.indexOf(o.atmos.weather)+1)%M.length;o.atmos.setWeather(M[A]),l.flash(`Weather: ${M[A]}`)}if(h.consume("KeyR")){const M=o.map.pois.find(A=>A.kind==="seaplane");o.aircraft.place(M.x+120,1.6,M.z+60,0,0,0,0,0),x.throttle=0,o.flightCamera.snap(),l.flash("Reset to the seaplane base")}h.consume("KeyG")&&(o.aircraft.place(o.aircraft.flight.position.x,350,o.aircraft.flight.position.z,Math.PI*.5,0,0,55,.7),x.throttle=.7,l.flash("Airborne at 350 m")),o.flightCamera.orbitYaw=h.orbitYaw,o.flightCamera.orbitPitch=h.orbitPitch}p+=m;const y=1/60;let w=0;for(;p>=y&&w<8;)o.update(y,d),p-=y,w++;w===8&&(p=0),o.flightCamera.update(o.aircraft.flight,o.aircraft.model,m),o.render(),l.update(o.aircraft.flight.telemetry,o.aircraft.inputs.throttle,o.flightCamera.mode,o.atmos.hour,m),window.__ready=!0,requestAnimationFrame(g)};o.update(0,!1),o.flightCamera.update(o.aircraft.flight,o.aircraft.model,1/60),g()}j_().catch(s=>{console.error(s);const t=document.getElementById("start-status");t&&(t.textContent=`Failed to start: ${s.message}`)});
