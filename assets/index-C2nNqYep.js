(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const r of o.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&n(r)}).observe(document,{childList:!0,subtree:!0});function e(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(i){if(i.ep)return;i.ep=!0;const o=e(i);fetch(i.href,o)}})();function nd(){const s=new URLSearchParams(window.location.search),t=n=>{const i=s.get(n);if(i===null||i==="")return null;if(i.includes("/")){const[r,a]=i.split("/").map(Number);return a?r/a:null}const o=Number(i);return Number.isFinite(o)?o:null},e=s.get("quality")??"high";return{bench:s.get("bench"),seed:t("seed")??20260904,time:t("time"),weather:s.get("weather")??null,quality:["low","medium","high","ultra"].includes(e)?e:"high",freeze:s.get("freeze")==="1",fixedDt:t("dt"),noHud:s.get("nohud")==="1",width:t("w"),height:t("h"),autostart:s.get("autostart")==="1"||s.get("bench")!==null,grid:s.get("grid")==="1",debug:s.get("debug")==="1",debugRoads:s.get("debugroads")==="1",dbg:new Set((s.get("dbg")??"").split(",").filter(Boolean))}}/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const dc="170",id=0,$c=1,sd=2,q0=1,Y0=2,Pi=3,Oi=0,An=1,hn=2,ts=0,zi=1,jc=2,Zc=3,Kc=4,od=5,_s=100,rd=101,ad=102,ld=103,cd=104,hd=200,ud=201,dd=202,fd=203,xl=204,_l=205,pd=206,md=207,gd=208,vd=209,xd=210,_d=211,wd=212,yd=213,Md=214,wl=0,yl=1,Ml=2,oo=3,Sl=4,bl=5,El=6,Al=7,$0=0,Sd=1,bd=2,Ni=0,Ed=1,Ad=2,Td=3,Cd=4,Rd=5,Pd=6,Ld=7,j0=300,ro=301,ao=302,Tl=303,Cl=304,ha=306,lo=1e3,Ze=1001,Rl=1002,Dn=1003,Dd=1004,mr=1005,Ae=1006,wa=1007,Qi=1008,qn=1009,Z0=1010,K0=1011,nr=1012,fc=1013,ki=1014,Xn=1015,si=1016,pc=1017,mc=1018,co=1020,J0=35902,Q0=1021,tu=1022,En=1023,eu=1024,nu=1025,no=1026,ho=1027,ir=1028,ua=1029,iu=1030,gc=1031,vc=1033,$r=33776,jr=33777,Zr=33778,Kr=33779,Pl=35840,Ll=35841,Dl=35842,Il=35843,zl=36196,Nl=37492,Ul=37496,Fl=37808,Ol=37809,kl=37810,Bl=37811,Hl=37812,Gl=37813,Vl=37814,Wl=37815,Xl=37816,ql=37817,Yl=37818,$l=37819,jl=37820,Zl=37821,Jr=36492,Kl=36494,Jl=36495,su=36283,Ql=36284,tc=36285,ec=36286,Id=3200,ou=3201,ru=0,zd=1,fi="",Pn="srgb",Cs="srgb-linear",da="linear",Re="srgb",Ls=7680,Jc=519,Nd=512,Ud=513,Fd=514,au=515,Od=516,kd=517,Bd=518,Hd=519,Qc=35044,th=35048,eh="300 es",Ii=2e3,na=2001;class xo{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){if(this._listeners===void 0)return!1;const n=this._listeners;return n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){if(this._listeners===void 0)return;const i=this._listeners[t];if(i!==void 0){const o=i.indexOf(e);o!==-1&&i.splice(o,1)}}dispatchEvent(t){if(this._listeners===void 0)return;const n=this._listeners[t.type];if(n!==void 0){t.target=this;const i=n.slice(0);for(let o=0,r=i.length;o<r;o++)i[o].call(this,t);t.target=null}}}const wn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let nh=1234567;const Zo=Math.PI/180,sr=180/Math.PI;function _o(){const s=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(wn[s&255]+wn[s>>8&255]+wn[s>>16&255]+wn[s>>24&255]+"-"+wn[t&255]+wn[t>>8&255]+"-"+wn[t>>16&15|64]+wn[t>>24&255]+"-"+wn[e&63|128]+wn[e>>8&255]+"-"+wn[e>>16&255]+wn[e>>24&255]+wn[n&255]+wn[n>>8&255]+wn[n>>16&255]+wn[n>>24&255]).toLowerCase()}function je(s,t,e){return Math.max(t,Math.min(e,s))}function xc(s,t){return(s%t+t)%t}function Gd(s,t,e,n,i){return n+(s-t)*(i-n)/(e-t)}function Vd(s,t,e){return s!==t?(e-s)/(t-s):0}function Ko(s,t,e){return(1-e)*s+e*t}function Wd(s,t,e,n){return Ko(s,t,1-Math.exp(-e*n))}function Xd(s,t=1){return t-Math.abs(xc(s,t*2)-t)}function qd(s,t,e){return s<=t?0:s>=e?1:(s=(s-t)/(e-t),s*s*(3-2*s))}function Yd(s,t,e){return s<=t?0:s>=e?1:(s=(s-t)/(e-t),s*s*s*(s*(s*6-15)+10))}function $d(s,t){return s+Math.floor(Math.random()*(t-s+1))}function jd(s,t){return s+Math.random()*(t-s)}function Zd(s){return s*(.5-Math.random())}function Kd(s){s!==void 0&&(nh=s);let t=nh+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function Jd(s){return s*Zo}function Qd(s){return s*sr}function tf(s){return(s&s-1)===0&&s!==0}function ef(s){return Math.pow(2,Math.ceil(Math.log(s)/Math.LN2))}function nf(s){return Math.pow(2,Math.floor(Math.log(s)/Math.LN2))}function sf(s,t,e,n,i){const o=Math.cos,r=Math.sin,a=o(e/2),l=r(e/2),c=o((t+n)/2),h=r((t+n)/2),d=o((t-n)/2),u=r((t-n)/2),g=o((n-t)/2),f=r((n-t)/2);switch(i){case"XYX":s.set(a*h,l*d,l*u,a*c);break;case"YZY":s.set(l*u,a*h,l*d,a*c);break;case"ZXZ":s.set(l*d,l*u,a*h,a*c);break;case"XZX":s.set(a*h,l*f,l*g,a*c);break;case"YXY":s.set(l*g,a*h,l*f,a*c);break;case"ZYZ":s.set(l*f,l*g,a*h,a*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+i)}}function Zs(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("Invalid component type.")}}function Cn(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("Invalid component type.")}}const Vn={DEG2RAD:Zo,RAD2DEG:sr,generateUUID:_o,clamp:je,euclideanModulo:xc,mapLinear:Gd,inverseLerp:Vd,lerp:Ko,damp:Wd,pingpong:Xd,smoothstep:qd,smootherstep:Yd,randInt:$d,randFloat:jd,randFloatSpread:Zd,seededRandom:Kd,degToRad:Jd,radToDeg:Qd,isPowerOfTwo:tf,ceilPowerOfTwo:ef,floorPowerOfTwo:nf,setQuaternionFromProperEuler:sf,normalize:Cn,denormalize:Zs};class Pt{constructor(t=0,e=0){Pt.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,n=this.y,i=t.elements;return this.x=i[0]*e+i[3]*n+i[6],this.y=i[1]*e+i[4]*n+i[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(je(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const n=Math.cos(e),i=Math.sin(e),o=this.x-t.x,r=this.y-t.y;return this.x=o*n-r*i+t.x,this.y=o*i+r*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class pe{constructor(t,e,n,i,o,r,a,l,c){pe.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,i,o,r,a,l,c)}set(t,e,n,i,o,r,a,l,c){const h=this.elements;return h[0]=t,h[1]=i,h[2]=a,h[3]=e,h[4]=o,h[5]=l,h[6]=n,h[7]=r,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,i=e.elements,o=this.elements,r=n[0],a=n[3],l=n[6],c=n[1],h=n[4],d=n[7],u=n[2],g=n[5],f=n[8],v=i[0],p=i[3],m=i[6],_=i[1],w=i[4],x=i[7],A=i[2],M=i[5],S=i[8];return o[0]=r*v+a*_+l*A,o[3]=r*p+a*w+l*M,o[6]=r*m+a*x+l*S,o[1]=c*v+h*_+d*A,o[4]=c*p+h*w+d*M,o[7]=c*m+h*x+d*S,o[2]=u*v+g*_+f*A,o[5]=u*p+g*w+f*M,o[8]=u*m+g*x+f*S,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[1],i=t[2],o=t[3],r=t[4],a=t[5],l=t[6],c=t[7],h=t[8];return e*r*h-e*a*c-n*o*h+n*a*l+i*o*c-i*r*l}invert(){const t=this.elements,e=t[0],n=t[1],i=t[2],o=t[3],r=t[4],a=t[5],l=t[6],c=t[7],h=t[8],d=h*r-a*c,u=a*l-h*o,g=c*o-r*l,f=e*d+n*u+i*g;if(f===0)return this.set(0,0,0,0,0,0,0,0,0);const v=1/f;return t[0]=d*v,t[1]=(i*c-h*n)*v,t[2]=(a*n-i*r)*v,t[3]=u*v,t[4]=(h*e-i*l)*v,t[5]=(i*o-a*e)*v,t[6]=g*v,t[7]=(n*l-c*e)*v,t[8]=(r*e-n*o)*v,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,i,o,r,a){const l=Math.cos(o),c=Math.sin(o);return this.set(n*l,n*c,-n*(l*r+c*a)+r+t,-i*c,i*l,-i*(-c*r+l*a)+a+e,0,0,1),this}scale(t,e){return this.premultiply(ya.makeScale(t,e)),this}rotate(t){return this.premultiply(ya.makeRotation(-t)),this}translate(t,e){return this.premultiply(ya.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,n=t.elements;for(let i=0;i<9;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const ya=new pe;function lu(s){for(let t=s.length-1;t>=0;--t)if(s[t]>=65535)return!0;return!1}function ia(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function of(){const s=ia("canvas");return s.style.display="block",s}const ih={};function Xo(s){s in ih||(ih[s]=!0,console.warn(s))}function rf(s,t,e){return new Promise(function(n,i){function o(){switch(s.clientWaitSync(t,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:i();break;case s.TIMEOUT_EXPIRED:setTimeout(o,e);break;default:n()}}setTimeout(o,e)})}function af(s){const t=s.elements;t[2]=.5*t[2]+.5*t[3],t[6]=.5*t[6]+.5*t[7],t[10]=.5*t[10]+.5*t[11],t[14]=.5*t[14]+.5*t[15]}function lf(s){const t=s.elements;t[11]===-1?(t[10]=-t[10]-1,t[14]=-t[14]):(t[10]=-t[10],t[14]=-t[14]+1)}const _e={enabled:!0,workingColorSpace:Cs,spaces:{},convert:function(s,t,e){return this.enabled===!1||t===e||!t||!e||(this.spaces[t].transfer===Re&&(s.r=Ui(s.r),s.g=Ui(s.g),s.b=Ui(s.b)),this.spaces[t].primaries!==this.spaces[e].primaries&&(s.applyMatrix3(this.spaces[t].toXYZ),s.applyMatrix3(this.spaces[e].fromXYZ)),this.spaces[e].transfer===Re&&(s.r=io(s.r),s.g=io(s.g),s.b=io(s.b))),s},fromWorkingColorSpace:function(s,t){return this.convert(s,this.workingColorSpace,t)},toWorkingColorSpace:function(s,t){return this.convert(s,t,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===fi?da:this.spaces[s].transfer},getLuminanceCoefficients:function(s,t=this.workingColorSpace){return s.fromArray(this.spaces[t].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,t,e){return s.copy(this.spaces[t].toXYZ).multiply(this.spaces[e].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace}};function Ui(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function io(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}const sh=[.64,.33,.3,.6,.15,.06],oh=[.2126,.7152,.0722],rh=[.3127,.329],ah=new pe().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),lh=new pe().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);_e.define({[Cs]:{primaries:sh,whitePoint:rh,transfer:da,toXYZ:ah,fromXYZ:lh,luminanceCoefficients:oh,workingColorSpaceConfig:{unpackColorSpace:Pn},outputColorSpaceConfig:{drawingBufferColorSpace:Pn}},[Pn]:{primaries:sh,whitePoint:rh,transfer:Re,toXYZ:ah,fromXYZ:lh,luminanceCoefficients:oh,outputColorSpaceConfig:{drawingBufferColorSpace:Pn}}});let Ds;class cf{static getDataURL(t){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let e;if(t instanceof HTMLCanvasElement)e=t;else{Ds===void 0&&(Ds=ia("canvas")),Ds.width=t.width,Ds.height=t.height;const n=Ds.getContext("2d");t instanceof ImageData?n.putImageData(t,0,0):n.drawImage(t,0,0,t.width,t.height),e=Ds}return e.width>2048||e.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",t),e.toDataURL("image/jpeg",.6)):e.toDataURL("image/png")}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=ia("canvas");e.width=t.width,e.height=t.height;const n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);const i=n.getImageData(0,0,t.width,t.height),o=i.data;for(let r=0;r<o.length;r++)o[r]=Ui(o[r]/255)*255;return n.putImageData(i,0,0),e}else if(t.data){const e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Ui(e[n]/255)*255):e[n]=Ui(e[n]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let hf=0;class cu{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:hf++}),this.uuid=_o(),this.data=t,this.dataReady=!0,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let o;if(Array.isArray(i)){o=[];for(let r=0,a=i.length;r<a;r++)i[r].isDataTexture?o.push(Ma(i[r].image)):o.push(Ma(i[r]))}else o=Ma(i);n.url=o}return e||(t.images[this.uuid]=n),n}}function Ma(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?cf.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let uf=0;class Tn extends xo{constructor(t=Tn.DEFAULT_IMAGE,e=Tn.DEFAULT_MAPPING,n=Ze,i=Ze,o=Ae,r=Qi,a=En,l=qn,c=Tn.DEFAULT_ANISOTROPY,h=fi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:uf++}),this.uuid=_o(),this.name="",this.source=new cu(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=o,this.minFilter=r,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new Pt(0,0),this.repeat=new Pt(1,1),this.center=new Pt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new pe,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==j0)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case lo:t.x=t.x-Math.floor(t.x);break;case Ze:t.x=t.x<0?0:1;break;case Rl:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case lo:t.y=t.y-Math.floor(t.y);break;case Ze:t.y=t.y<0?0:1;break;case Rl:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}Tn.DEFAULT_IMAGE=null;Tn.DEFAULT_MAPPING=j0;Tn.DEFAULT_ANISOTROPY=1;class ke{constructor(t=0,e=0,n=0,i=1){ke.prototype.isVector4=!0,this.x=t,this.y=e,this.z=n,this.w=i}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,i){return this.x=t,this.y=e,this.z=n,this.w=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,n=this.y,i=this.z,o=this.w,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*i+r[12]*o,this.y=r[1]*e+r[5]*n+r[9]*i+r[13]*o,this.z=r[2]*e+r[6]*n+r[10]*i+r[14]*o,this.w=r[3]*e+r[7]*n+r[11]*i+r[15]*o,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,i,o;const l=t.elements,c=l[0],h=l[4],d=l[8],u=l[1],g=l[5],f=l[9],v=l[2],p=l[6],m=l[10];if(Math.abs(h-u)<.01&&Math.abs(d-v)<.01&&Math.abs(f-p)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+v)<.1&&Math.abs(f+p)<.1&&Math.abs(c+g+m-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const w=(c+1)/2,x=(g+1)/2,A=(m+1)/2,M=(h+u)/4,S=(d+v)/4,E=(f+p)/4;return w>x&&w>A?w<.01?(n=0,i=.707106781,o=.707106781):(n=Math.sqrt(w),i=M/n,o=S/n):x>A?x<.01?(n=.707106781,i=0,o=.707106781):(i=Math.sqrt(x),n=M/i,o=E/i):A<.01?(n=.707106781,i=.707106781,o=0):(o=Math.sqrt(A),n=S/o,i=E/o),this.set(n,i,o,e),this}let _=Math.sqrt((p-f)*(p-f)+(d-v)*(d-v)+(u-h)*(u-h));return Math.abs(_)<.001&&(_=1),this.x=(p-f)/_,this.y=(d-v)/_,this.z=(u-h)/_,this.w=Math.acos((c+g+m-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this.w=Math.max(t.w,Math.min(e.w,this.w)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this.w=Math.max(t,Math.min(e,this.w)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class df extends xo{constructor(t=1,e=1,n={}){super(),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=1,this.scissor=new ke(0,0,t,e),this.scissorTest=!1,this.viewport=new ke(0,0,t,e);const i={width:t,height:e,depth:1};n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Ae,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},n);const o=new Tn(i,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace);o.flipY=!1,o.generateMipmaps=n.generateMipmaps,o.internalFormat=n.internalFormat,this.textures=[];const r=n.count;for(let a=0;a<r;a++)this.textures[a]=o.clone(),this.textures[a].isRenderTargetTexture=!0;this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.depthTexture=n.depthTexture,this.samples=n.samples}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let i=0,o=this.textures.length;i<o;i++)this.textures[i].image.width=t,this.textures[i].image.height=e,this.textures[i].image.depth=n;this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let n=0,i=t.textures.length;n<i;n++)this.textures[n]=t.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0;const e=Object.assign({},t.texture.image);return this.texture.source=new cu(e),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Un extends df{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}}class hu extends Tn{constructor(t=null,e=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=Dn,this.minFilter=Dn,this.wrapR=Ze,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class uu extends Tn{constructor(t=null,e=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=Dn,this.minFilter=Dn,this.wrapR=Ze,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Be{constructor(t=0,e=0,n=0,i=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=i}static slerpFlat(t,e,n,i,o,r,a){let l=n[i+0],c=n[i+1],h=n[i+2],d=n[i+3];const u=o[r+0],g=o[r+1],f=o[r+2],v=o[r+3];if(a===0){t[e+0]=l,t[e+1]=c,t[e+2]=h,t[e+3]=d;return}if(a===1){t[e+0]=u,t[e+1]=g,t[e+2]=f,t[e+3]=v;return}if(d!==v||l!==u||c!==g||h!==f){let p=1-a;const m=l*u+c*g+h*f+d*v,_=m>=0?1:-1,w=1-m*m;if(w>Number.EPSILON){const A=Math.sqrt(w),M=Math.atan2(A,m*_);p=Math.sin(p*M)/A,a=Math.sin(a*M)/A}const x=a*_;if(l=l*p+u*x,c=c*p+g*x,h=h*p+f*x,d=d*p+v*x,p===1-a){const A=1/Math.sqrt(l*l+c*c+h*h+d*d);l*=A,c*=A,h*=A,d*=A}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=d}static multiplyQuaternionsFlat(t,e,n,i,o,r){const a=n[i],l=n[i+1],c=n[i+2],h=n[i+3],d=o[r],u=o[r+1],g=o[r+2],f=o[r+3];return t[e]=a*f+h*d+l*g-c*u,t[e+1]=l*f+h*u+c*d-a*g,t[e+2]=c*f+h*g+a*u-l*d,t[e+3]=h*f-a*d-l*u-c*g,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,i){return this._x=t,this._y=e,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const n=t._x,i=t._y,o=t._z,r=t._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(i/2),d=a(o/2),u=l(n/2),g=l(i/2),f=l(o/2);switch(r){case"XYZ":this._x=u*h*d+c*g*f,this._y=c*g*d-u*h*f,this._z=c*h*f+u*g*d,this._w=c*h*d-u*g*f;break;case"YXZ":this._x=u*h*d+c*g*f,this._y=c*g*d-u*h*f,this._z=c*h*f-u*g*d,this._w=c*h*d+u*g*f;break;case"ZXY":this._x=u*h*d-c*g*f,this._y=c*g*d+u*h*f,this._z=c*h*f+u*g*d,this._w=c*h*d-u*g*f;break;case"ZYX":this._x=u*h*d-c*g*f,this._y=c*g*d+u*h*f,this._z=c*h*f-u*g*d,this._w=c*h*d+u*g*f;break;case"YZX":this._x=u*h*d+c*g*f,this._y=c*g*d+u*h*f,this._z=c*h*f-u*g*d,this._w=c*h*d-u*g*f;break;case"XZY":this._x=u*h*d-c*g*f,this._y=c*g*d-u*h*f,this._z=c*h*f+u*g*d,this._w=c*h*d+u*g*f;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+r)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const n=e/2,i=Math.sin(n);return this._x=t.x*i,this._y=t.y*i,this._z=t.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,n=e[0],i=e[4],o=e[8],r=e[1],a=e[5],l=e[9],c=e[2],h=e[6],d=e[10],u=n+a+d;if(u>0){const g=.5/Math.sqrt(u+1);this._w=.25/g,this._x=(h-l)*g,this._y=(o-c)*g,this._z=(r-i)*g}else if(n>a&&n>d){const g=2*Math.sqrt(1+n-a-d);this._w=(h-l)/g,this._x=.25*g,this._y=(i+r)/g,this._z=(o+c)/g}else if(a>d){const g=2*Math.sqrt(1+a-n-d);this._w=(o-c)/g,this._x=(i+r)/g,this._y=.25*g,this._z=(l+h)/g}else{const g=2*Math.sqrt(1+d-n-a);this._w=(r-i)/g,this._x=(o+c)/g,this._y=(l+h)/g,this._z=.25*g}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<Number.EPSILON?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(je(this.dot(t),-1,1)))}rotateTowards(t,e){const n=this.angleTo(t);if(n===0)return this;const i=Math.min(1,e/n);return this.slerp(t,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const n=t._x,i=t._y,o=t._z,r=t._w,a=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+r*a+i*c-o*l,this._y=i*h+r*l+o*a-n*c,this._z=o*h+r*c+n*l-i*a,this._w=r*h-n*a-i*l-o*c,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);const n=this._x,i=this._y,o=this._z,r=this._w;let a=r*t._w+n*t._x+i*t._y+o*t._z;if(a<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,a=-a):this.copy(t),a>=1)return this._w=r,this._x=n,this._y=i,this._z=o,this;const l=1-a*a;if(l<=Number.EPSILON){const g=1-e;return this._w=g*r+e*this._w,this._x=g*n+e*this._x,this._y=g*i+e*this._y,this._z=g*o+e*this._z,this.normalize(),this}const c=Math.sqrt(l),h=Math.atan2(c,a),d=Math.sin((1-e)*h)/c,u=Math.sin(e*h)/c;return this._w=r*d+this._w*u,this._x=n*d+this._x*u,this._y=i*d+this._y*u,this._z=o*d+this._z*u,this._onChangeCallback(),this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),o=Math.sqrt(n);return this.set(i*Math.sin(t),i*Math.cos(t),o*Math.sin(e),o*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class C{constructor(t=0,e=0,n=0){C.prototype.isVector3=!0,this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(ch.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(ch.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,n=this.y,i=this.z,o=t.elements;return this.x=o[0]*e+o[3]*n+o[6]*i,this.y=o[1]*e+o[4]*n+o[7]*i,this.z=o[2]*e+o[5]*n+o[8]*i,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,n=this.y,i=this.z,o=t.elements,r=1/(o[3]*e+o[7]*n+o[11]*i+o[15]);return this.x=(o[0]*e+o[4]*n+o[8]*i+o[12])*r,this.y=(o[1]*e+o[5]*n+o[9]*i+o[13])*r,this.z=(o[2]*e+o[6]*n+o[10]*i+o[14])*r,this}applyQuaternion(t){const e=this.x,n=this.y,i=this.z,o=t.x,r=t.y,a=t.z,l=t.w,c=2*(r*i-a*n),h=2*(a*e-o*i),d=2*(o*n-r*e);return this.x=e+l*c+r*d-a*h,this.y=n+l*h+a*c-o*d,this.z=i+l*d+o*h-r*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,n=this.y,i=this.z,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*i,this.y=o[1]*e+o[5]*n+o[9]*i,this.z=o[2]*e+o[6]*n+o[10]*i,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const n=t.x,i=t.y,o=t.z,r=e.x,a=e.y,l=e.z;return this.x=i*l-o*a,this.y=o*r-n*l,this.z=n*a-i*r,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return Sa.copy(this).projectOnVector(t),this.sub(Sa)}reflect(t){return this.sub(Sa.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(je(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y,i=this.z-t.z;return e*e+n*n+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){const i=Math.sin(e)*t;return this.x=i*Math.sin(n),this.y=Math.cos(e)*t,this.z=i*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),i=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=i,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Sa=new C,ch=new Be;class Xe{constructor(t=new C(1/0,1/0,1/0),e=new C(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(Jn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(Jn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=Jn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const n=t.geometry;if(n!==void 0){const o=n.getAttribute("position");if(e===!0&&o!==void 0&&t.isInstancedMesh!==!0)for(let r=0,a=o.count;r<a;r++)t.isMesh===!0?t.getVertexPosition(r,Jn):Jn.fromBufferAttribute(o,r),Jn.applyMatrix4(t.matrixWorld),this.expandByPoint(Jn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),gr.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),gr.copy(n.boundingBox)),gr.applyMatrix4(t.matrixWorld),this.union(gr)}const i=t.children;for(let o=0,r=i.length;o<r;o++)this.expandByObject(i[o],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Jn),Jn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(To),vr.subVectors(this.max,To),Is.subVectors(t.a,To),zs.subVectors(t.b,To),Ns.subVectors(t.c,To),Hi.subVectors(zs,Is),Gi.subVectors(Ns,zs),os.subVectors(Is,Ns);let e=[0,-Hi.z,Hi.y,0,-Gi.z,Gi.y,0,-os.z,os.y,Hi.z,0,-Hi.x,Gi.z,0,-Gi.x,os.z,0,-os.x,-Hi.y,Hi.x,0,-Gi.y,Gi.x,0,-os.y,os.x,0];return!ba(e,Is,zs,Ns,vr)||(e=[1,0,0,0,1,0,0,0,1],!ba(e,Is,zs,Ns,vr))?!1:(xr.crossVectors(Hi,Gi),e=[xr.x,xr.y,xr.z],ba(e,Is,zs,Ns,vr))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Jn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Jn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(wi[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),wi[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),wi[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),wi[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),wi[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),wi[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),wi[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),wi[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(wi),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}const wi=[new C,new C,new C,new C,new C,new C,new C,new C],Jn=new C,gr=new Xe,Is=new C,zs=new C,Ns=new C,Hi=new C,Gi=new C,os=new C,To=new C,vr=new C,xr=new C,rs=new C;function ba(s,t,e,n,i){for(let o=0,r=s.length-3;o<=r;o+=3){rs.fromArray(s,o);const a=i.x*Math.abs(rs.x)+i.y*Math.abs(rs.y)+i.z*Math.abs(rs.z),l=t.dot(rs),c=e.dot(rs),h=n.dot(rs);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}const ff=new Xe,Co=new C,Ea=new C;class Fe{constructor(t=new C,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const n=this.center;e!==void 0?n.copy(e):ff.setFromPoints(t).getCenter(n);let i=0;for(let o=0,r=t.length;o<r;o++)i=Math.max(i,n.distanceToSquared(t[o]));return this.radius=Math.sqrt(i),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Co.subVectors(t,this.center);const e=Co.lengthSq();if(e>this.radius*this.radius){const n=Math.sqrt(e),i=(n-this.radius)*.5;this.center.addScaledVector(Co,i/n),this.radius+=i}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Ea.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Co.copy(t.center).add(Ea)),this.expandByPoint(Co.copy(t.center).sub(Ea))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}}const yi=new C,Aa=new C,_r=new C,Vi=new C,Ta=new C,wr=new C,Ca=new C;class du{constructor(t=new C,e=new C(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,yi)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=yi.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(yi.copy(this.origin).addScaledVector(this.direction,e),yi.distanceToSquared(t))}distanceSqToSegment(t,e,n,i){Aa.copy(t).add(e).multiplyScalar(.5),_r.copy(e).sub(t).normalize(),Vi.copy(this.origin).sub(Aa);const o=t.distanceTo(e)*.5,r=-this.direction.dot(_r),a=Vi.dot(this.direction),l=-Vi.dot(_r),c=Vi.lengthSq(),h=Math.abs(1-r*r);let d,u,g,f;if(h>0)if(d=r*l-a,u=r*a-l,f=o*h,d>=0)if(u>=-f)if(u<=f){const v=1/h;d*=v,u*=v,g=d*(d+r*u+2*a)+u*(r*d+u+2*l)+c}else u=o,d=Math.max(0,-(r*u+a)),g=-d*d+u*(u+2*l)+c;else u=-o,d=Math.max(0,-(r*u+a)),g=-d*d+u*(u+2*l)+c;else u<=-f?(d=Math.max(0,-(-r*o+a)),u=d>0?-o:Math.min(Math.max(-o,-l),o),g=-d*d+u*(u+2*l)+c):u<=f?(d=0,u=Math.min(Math.max(-o,-l),o),g=u*(u+2*l)+c):(d=Math.max(0,-(r*o+a)),u=d>0?o:Math.min(Math.max(-o,-l),o),g=-d*d+u*(u+2*l)+c);else u=r>0?-o:o,d=Math.max(0,-(r*u+a)),g=-d*d+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,d),i&&i.copy(Aa).addScaledVector(_r,u),g}intersectSphere(t,e){yi.subVectors(t.center,this.origin);const n=yi.dot(this.direction),i=yi.dot(yi)-n*n,o=t.radius*t.radius;if(i>o)return null;const r=Math.sqrt(o-i),a=n-r,l=n+r;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){const n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,i,o,r,a,l;const c=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return c>=0?(n=(t.min.x-u.x)*c,i=(t.max.x-u.x)*c):(n=(t.max.x-u.x)*c,i=(t.min.x-u.x)*c),h>=0?(o=(t.min.y-u.y)*h,r=(t.max.y-u.y)*h):(o=(t.max.y-u.y)*h,r=(t.min.y-u.y)*h),n>r||o>i||((o>n||isNaN(n))&&(n=o),(r<i||isNaN(i))&&(i=r),d>=0?(a=(t.min.z-u.z)*d,l=(t.max.z-u.z)*d):(a=(t.max.z-u.z)*d,l=(t.min.z-u.z)*d),n>l||a>i)||((a>n||n!==n)&&(n=a),(l<i||i!==i)&&(i=l),i<0)?null:this.at(n>=0?n:i,e)}intersectsBox(t){return this.intersectBox(t,yi)!==null}intersectTriangle(t,e,n,i,o){Ta.subVectors(e,t),wr.subVectors(n,t),Ca.crossVectors(Ta,wr);let r=this.direction.dot(Ca),a;if(r>0){if(i)return null;a=1}else if(r<0)a=-1,r=-r;else return null;Vi.subVectors(this.origin,t);const l=a*this.direction.dot(wr.crossVectors(Vi,wr));if(l<0)return null;const c=a*this.direction.dot(Ta.cross(Vi));if(c<0||l+c>r)return null;const h=-a*Vi.dot(Ca);return h<0?null:this.at(h/r,o)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class jt{constructor(t,e,n,i,o,r,a,l,c,h,d,u,g,f,v,p){jt.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,i,o,r,a,l,c,h,d,u,g,f,v,p)}set(t,e,n,i,o,r,a,l,c,h,d,u,g,f,v,p){const m=this.elements;return m[0]=t,m[4]=e,m[8]=n,m[12]=i,m[1]=o,m[5]=r,m[9]=a,m[13]=l,m[2]=c,m[6]=h,m[10]=d,m[14]=u,m[3]=g,m[7]=f,m[11]=v,m[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new jt().fromArray(this.elements)}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){const e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,n=t.elements,i=1/Us.setFromMatrixColumn(t,0).length(),o=1/Us.setFromMatrixColumn(t,1).length(),r=1/Us.setFromMatrixColumn(t,2).length();return e[0]=n[0]*i,e[1]=n[1]*i,e[2]=n[2]*i,e[3]=0,e[4]=n[4]*o,e[5]=n[5]*o,e[6]=n[6]*o,e[7]=0,e[8]=n[8]*r,e[9]=n[9]*r,e[10]=n[10]*r,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,n=t.x,i=t.y,o=t.z,r=Math.cos(n),a=Math.sin(n),l=Math.cos(i),c=Math.sin(i),h=Math.cos(o),d=Math.sin(o);if(t.order==="XYZ"){const u=r*h,g=r*d,f=a*h,v=a*d;e[0]=l*h,e[4]=-l*d,e[8]=c,e[1]=g+f*c,e[5]=u-v*c,e[9]=-a*l,e[2]=v-u*c,e[6]=f+g*c,e[10]=r*l}else if(t.order==="YXZ"){const u=l*h,g=l*d,f=c*h,v=c*d;e[0]=u+v*a,e[4]=f*a-g,e[8]=r*c,e[1]=r*d,e[5]=r*h,e[9]=-a,e[2]=g*a-f,e[6]=v+u*a,e[10]=r*l}else if(t.order==="ZXY"){const u=l*h,g=l*d,f=c*h,v=c*d;e[0]=u-v*a,e[4]=-r*d,e[8]=f+g*a,e[1]=g+f*a,e[5]=r*h,e[9]=v-u*a,e[2]=-r*c,e[6]=a,e[10]=r*l}else if(t.order==="ZYX"){const u=r*h,g=r*d,f=a*h,v=a*d;e[0]=l*h,e[4]=f*c-g,e[8]=u*c+v,e[1]=l*d,e[5]=v*c+u,e[9]=g*c-f,e[2]=-c,e[6]=a*l,e[10]=r*l}else if(t.order==="YZX"){const u=r*l,g=r*c,f=a*l,v=a*c;e[0]=l*h,e[4]=v-u*d,e[8]=f*d+g,e[1]=d,e[5]=r*h,e[9]=-a*h,e[2]=-c*h,e[6]=g*d+f,e[10]=u-v*d}else if(t.order==="XZY"){const u=r*l,g=r*c,f=a*l,v=a*c;e[0]=l*h,e[4]=-d,e[8]=c*h,e[1]=u*d+v,e[5]=r*h,e[9]=g*d-f,e[2]=f*d-g,e[6]=a*h,e[10]=v*d+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(pf,t,mf)}lookAt(t,e,n){const i=this.elements;return Fn.subVectors(t,e),Fn.lengthSq()===0&&(Fn.z=1),Fn.normalize(),Wi.crossVectors(n,Fn),Wi.lengthSq()===0&&(Math.abs(n.z)===1?Fn.x+=1e-4:Fn.z+=1e-4,Fn.normalize(),Wi.crossVectors(n,Fn)),Wi.normalize(),yr.crossVectors(Fn,Wi),i[0]=Wi.x,i[4]=yr.x,i[8]=Fn.x,i[1]=Wi.y,i[5]=yr.y,i[9]=Fn.y,i[2]=Wi.z,i[6]=yr.z,i[10]=Fn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,i=e.elements,o=this.elements,r=n[0],a=n[4],l=n[8],c=n[12],h=n[1],d=n[5],u=n[9],g=n[13],f=n[2],v=n[6],p=n[10],m=n[14],_=n[3],w=n[7],x=n[11],A=n[15],M=i[0],S=i[4],E=i[8],y=i[12],b=i[1],T=i[5],U=i[9],O=i[13],z=i[2],B=i[6],F=i[10],L=i[14],H=i[3],G=i[7],N=i[11],$=i[15];return o[0]=r*M+a*b+l*z+c*H,o[4]=r*S+a*T+l*B+c*G,o[8]=r*E+a*U+l*F+c*N,o[12]=r*y+a*O+l*L+c*$,o[1]=h*M+d*b+u*z+g*H,o[5]=h*S+d*T+u*B+g*G,o[9]=h*E+d*U+u*F+g*N,o[13]=h*y+d*O+u*L+g*$,o[2]=f*M+v*b+p*z+m*H,o[6]=f*S+v*T+p*B+m*G,o[10]=f*E+v*U+p*F+m*N,o[14]=f*y+v*O+p*L+m*$,o[3]=_*M+w*b+x*z+A*H,o[7]=_*S+w*T+x*B+A*G,o[11]=_*E+w*U+x*F+A*N,o[15]=_*y+w*O+x*L+A*$,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[4],i=t[8],o=t[12],r=t[1],a=t[5],l=t[9],c=t[13],h=t[2],d=t[6],u=t[10],g=t[14],f=t[3],v=t[7],p=t[11],m=t[15];return f*(+o*l*d-i*c*d-o*a*u+n*c*u+i*a*g-n*l*g)+v*(+e*l*g-e*c*u+o*r*u-i*r*g+i*c*h-o*l*h)+p*(+e*c*d-e*a*g-o*r*d+n*r*g+o*a*h-n*c*h)+m*(-i*a*h-e*l*d+e*a*u+i*r*d-n*r*u+n*l*h)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){const i=this.elements;return t.isVector3?(i[12]=t.x,i[13]=t.y,i[14]=t.z):(i[12]=t,i[13]=e,i[14]=n),this}invert(){const t=this.elements,e=t[0],n=t[1],i=t[2],o=t[3],r=t[4],a=t[5],l=t[6],c=t[7],h=t[8],d=t[9],u=t[10],g=t[11],f=t[12],v=t[13],p=t[14],m=t[15],_=d*p*c-v*u*c+v*l*g-a*p*g-d*l*m+a*u*m,w=f*u*c-h*p*c-f*l*g+r*p*g+h*l*m-r*u*m,x=h*v*c-f*d*c+f*a*g-r*v*g-h*a*m+r*d*m,A=f*d*l-h*v*l-f*a*u+r*v*u+h*a*p-r*d*p,M=e*_+n*w+i*x+o*A;if(M===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const S=1/M;return t[0]=_*S,t[1]=(v*u*o-d*p*o-v*i*g+n*p*g+d*i*m-n*u*m)*S,t[2]=(a*p*o-v*l*o+v*i*c-n*p*c-a*i*m+n*l*m)*S,t[3]=(d*l*o-a*u*o-d*i*c+n*u*c+a*i*g-n*l*g)*S,t[4]=w*S,t[5]=(h*p*o-f*u*o+f*i*g-e*p*g-h*i*m+e*u*m)*S,t[6]=(f*l*o-r*p*o-f*i*c+e*p*c+r*i*m-e*l*m)*S,t[7]=(r*u*o-h*l*o+h*i*c-e*u*c-r*i*g+e*l*g)*S,t[8]=x*S,t[9]=(f*d*o-h*v*o-f*n*g+e*v*g+h*n*m-e*d*m)*S,t[10]=(r*v*o-f*a*o+f*n*c-e*v*c-r*n*m+e*a*m)*S,t[11]=(h*a*o-r*d*o-h*n*c+e*d*c+r*n*g-e*a*g)*S,t[12]=A*S,t[13]=(h*v*i-f*d*i+f*n*u-e*v*u-h*n*p+e*d*p)*S,t[14]=(f*a*i-r*v*i-f*n*l+e*v*l+r*n*p-e*a*p)*S,t[15]=(r*d*i-h*a*i+h*n*l-e*d*l-r*n*u+e*a*u)*S,this}scale(t){const e=this.elements,n=t.x,i=t.y,o=t.z;return e[0]*=n,e[4]*=i,e[8]*=o,e[1]*=n,e[5]*=i,e[9]*=o,e[2]*=n,e[6]*=i,e[10]*=o,e[3]*=n,e[7]*=i,e[11]*=o,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],i=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,i))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const n=Math.cos(e),i=Math.sin(e),o=1-n,r=t.x,a=t.y,l=t.z,c=o*r,h=o*a;return this.set(c*r+n,c*a-i*l,c*l+i*a,0,c*a+i*l,h*a+n,h*l-i*r,0,c*l-i*a,h*l+i*r,o*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,i,o,r){return this.set(1,n,o,0,t,1,r,0,e,i,1,0,0,0,0,1),this}compose(t,e,n){const i=this.elements,o=e._x,r=e._y,a=e._z,l=e._w,c=o+o,h=r+r,d=a+a,u=o*c,g=o*h,f=o*d,v=r*h,p=r*d,m=a*d,_=l*c,w=l*h,x=l*d,A=n.x,M=n.y,S=n.z;return i[0]=(1-(v+m))*A,i[1]=(g+x)*A,i[2]=(f-w)*A,i[3]=0,i[4]=(g-x)*M,i[5]=(1-(u+m))*M,i[6]=(p+_)*M,i[7]=0,i[8]=(f+w)*S,i[9]=(p-_)*S,i[10]=(1-(u+v))*S,i[11]=0,i[12]=t.x,i[13]=t.y,i[14]=t.z,i[15]=1,this}decompose(t,e,n){const i=this.elements;let o=Us.set(i[0],i[1],i[2]).length();const r=Us.set(i[4],i[5],i[6]).length(),a=Us.set(i[8],i[9],i[10]).length();this.determinant()<0&&(o=-o),t.x=i[12],t.y=i[13],t.z=i[14],Qn.copy(this);const c=1/o,h=1/r,d=1/a;return Qn.elements[0]*=c,Qn.elements[1]*=c,Qn.elements[2]*=c,Qn.elements[4]*=h,Qn.elements[5]*=h,Qn.elements[6]*=h,Qn.elements[8]*=d,Qn.elements[9]*=d,Qn.elements[10]*=d,e.setFromRotationMatrix(Qn),n.x=o,n.y=r,n.z=a,this}makePerspective(t,e,n,i,o,r,a=Ii){const l=this.elements,c=2*o/(e-t),h=2*o/(n-i),d=(e+t)/(e-t),u=(n+i)/(n-i);let g,f;if(a===Ii)g=-(r+o)/(r-o),f=-2*r*o/(r-o);else if(a===na)g=-r/(r-o),f=-r*o/(r-o);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=c,l[4]=0,l[8]=d,l[12]=0,l[1]=0,l[5]=h,l[9]=u,l[13]=0,l[2]=0,l[6]=0,l[10]=g,l[14]=f,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,n,i,o,r,a=Ii){const l=this.elements,c=1/(e-t),h=1/(n-i),d=1/(r-o),u=(e+t)*c,g=(n+i)*h;let f,v;if(a===Ii)f=(r+o)*d,v=-2*d;else if(a===na)f=o*d,v=-1*d;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-u,l[1]=0,l[5]=2*h,l[9]=0,l[13]=-g,l[2]=0,l[6]=0,l[10]=v,l[14]=-f,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){const e=this.elements,n=t.elements;for(let i=0;i<16;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}}const Us=new C,Qn=new jt,pf=new C(0,0,0),mf=new C(1,1,1),Wi=new C,yr=new C,Fn=new C,hh=new jt,uh=new Be;class Oe{constructor(t=0,e=0,n=0,i=Oe.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=i}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,i=this._order){return this._x=t,this._y=e,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){const i=t.elements,o=i[0],r=i[4],a=i[8],l=i[1],c=i[5],h=i[9],d=i[2],u=i[6],g=i[10];switch(e){case"XYZ":this._y=Math.asin(je(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,g),this._z=Math.atan2(-r,o)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-je(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,g),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,o),this._z=0);break;case"ZXY":this._x=Math.asin(je(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,g),this._z=Math.atan2(-r,c)):(this._y=0,this._z=Math.atan2(l,o));break;case"ZYX":this._y=Math.asin(-je(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,g),this._z=Math.atan2(l,o)):(this._x=0,this._z=Math.atan2(-r,c));break;case"YZX":this._z=Math.asin(je(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-d,o)):(this._x=0,this._y=Math.atan2(a,g));break;case"XZY":this._z=Math.asin(-je(r,-1,1)),Math.abs(r)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(a,o)):(this._x=Math.atan2(-h,g),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return hh.makeRotationFromQuaternion(t),this.setFromRotationMatrix(hh,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return uh.setFromEuler(this),this.setFromQuaternion(uh,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Oe.DEFAULT_ORDER="XYZ";class fu{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let gf=0;const dh=new C,Fs=new Be,Mi=new jt,Mr=new C,Ro=new C,vf=new C,xf=new Be,fh=new C(1,0,0),ph=new C(0,1,0),mh=new C(0,0,1),gh={type:"added"},_f={type:"removed"},Os={type:"childadded",child:null},Ra={type:"childremoved",child:null};class pn extends xo{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:gf++}),this.uuid=_o(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=pn.DEFAULT_UP.clone();const t=new C,e=new Oe,n=new Be,i=new C(1,1,1);function o(){n.setFromEuler(e,!1)}function r(){e.setFromQuaternion(n,void 0,!1)}e._onChange(o),n._onChange(r),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new jt},normalMatrix:{value:new pe}}),this.matrix=new jt,this.matrixWorld=new jt,this.matrixAutoUpdate=pn.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=pn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new fu,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Fs.setFromAxisAngle(t,e),this.quaternion.multiply(Fs),this}rotateOnWorldAxis(t,e){return Fs.setFromAxisAngle(t,e),this.quaternion.premultiply(Fs),this}rotateX(t){return this.rotateOnAxis(fh,t)}rotateY(t){return this.rotateOnAxis(ph,t)}rotateZ(t){return this.rotateOnAxis(mh,t)}translateOnAxis(t,e){return dh.copy(t).applyQuaternion(this.quaternion),this.position.add(dh.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(fh,t)}translateY(t){return this.translateOnAxis(ph,t)}translateZ(t){return this.translateOnAxis(mh,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Mi.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?Mr.copy(t):Mr.set(t,e,n);const i=this.parent;this.updateWorldMatrix(!0,!1),Ro.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Mi.lookAt(Ro,Mr,this.up):Mi.lookAt(Mr,Ro,this.up),this.quaternion.setFromRotationMatrix(Mi),i&&(Mi.extractRotation(i.matrixWorld),Fs.setFromRotationMatrix(Mi),this.quaternion.premultiply(Fs.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(gh),Os.child=t,this.dispatchEvent(Os),Os.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(_f),Ra.child=t,this.dispatchEvent(Ra),Ra.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Mi.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Mi.multiply(t.parent.matrixWorld)),t.applyMatrix4(Mi),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(gh),Os.child=t,this.dispatchEvent(Os),Os.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,i=this.children.length;n<i;n++){const r=this.children[n].getObjectByProperty(t,e);if(r!==void 0)return r}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);const i=this.children;for(let o=0,r=i.length;o<r;o++)i[o].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ro,t,vf),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ro,xf,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e){const n=this.parent;if(t===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){const i=this.children;for(let o=0,r=i.length;o<r;o++)i[o].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.visibility=this._visibility,i.active=this._active,i.bounds=this._bounds.map(a=>({boxInitialized:a.boxInitialized,boxMin:a.box.min.toArray(),boxMax:a.box.max.toArray(),sphereInitialized:a.sphereInitialized,sphereRadius:a.sphere.radius,sphereCenter:a.sphere.center.toArray()})),i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.geometryCount=this._geometryCount,i.matricesTexture=this._matricesTexture.toJSON(t),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(i.boundingSphere={center:i.boundingSphere.center.toArray(),radius:i.boundingSphere.radius}),this.boundingBox!==null&&(i.boundingBox={min:i.boundingBox.min.toArray(),max:i.boundingBox.max.toArray()}));function o(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=o(t.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const d=l[c];o(t.shapes,d)}else o(t.shapes,l)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(o(t.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(o(t.materials,this.material[l]));i.material=a}else i.material=o(t.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];i.animations.push(o(t.animations,l))}}if(e){const a=r(t.geometries),l=r(t.materials),c=r(t.textures),h=r(t.images),d=r(t.shapes),u=r(t.skeletons),g=r(t.animations),f=r(t.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),g.length>0&&(n.animations=g),f.length>0&&(n.nodes=f)}return n.object=i,n;function r(a){const l=[];for(const c in a){const h=a[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){const i=t.children[n];this.add(i.clone())}return this}}pn.DEFAULT_UP=new C(0,1,0);pn.DEFAULT_MATRIX_AUTO_UPDATE=!0;pn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const ti=new C,Si=new C,Pa=new C,bi=new C,ks=new C,Bs=new C,vh=new C,La=new C,Da=new C,Ia=new C,za=new ke,Na=new ke,Ua=new ke;class ni{constructor(t=new C,e=new C,n=new C){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,i){i.subVectors(n,e),ti.subVectors(t,e),i.cross(ti);const o=i.lengthSq();return o>0?i.multiplyScalar(1/Math.sqrt(o)):i.set(0,0,0)}static getBarycoord(t,e,n,i,o){ti.subVectors(i,e),Si.subVectors(n,e),Pa.subVectors(t,e);const r=ti.dot(ti),a=ti.dot(Si),l=ti.dot(Pa),c=Si.dot(Si),h=Si.dot(Pa),d=r*c-a*a;if(d===0)return o.set(0,0,0),null;const u=1/d,g=(c*l-a*h)*u,f=(r*h-a*l)*u;return o.set(1-g-f,f,g)}static containsPoint(t,e,n,i){return this.getBarycoord(t,e,n,i,bi)===null?!1:bi.x>=0&&bi.y>=0&&bi.x+bi.y<=1}static getInterpolation(t,e,n,i,o,r,a,l){return this.getBarycoord(t,e,n,i,bi)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(o,bi.x),l.addScaledVector(r,bi.y),l.addScaledVector(a,bi.z),l)}static getInterpolatedAttribute(t,e,n,i,o,r){return za.setScalar(0),Na.setScalar(0),Ua.setScalar(0),za.fromBufferAttribute(t,e),Na.fromBufferAttribute(t,n),Ua.fromBufferAttribute(t,i),r.setScalar(0),r.addScaledVector(za,o.x),r.addScaledVector(Na,o.y),r.addScaledVector(Ua,o.z),r}static isFrontFacing(t,e,n,i){return ti.subVectors(n,e),Si.subVectors(t,e),ti.cross(Si).dot(i)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,i){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[i]),this}setFromAttributeAndIndices(t,e,n,i){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,i),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return ti.subVectors(this.c,this.b),Si.subVectors(this.a,this.b),ti.cross(Si).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return ni.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return ni.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,i,o){return ni.getInterpolation(t,this.a,this.b,this.c,e,n,i,o)}containsPoint(t){return ni.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return ni.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const n=this.a,i=this.b,o=this.c;let r,a;ks.subVectors(i,n),Bs.subVectors(o,n),La.subVectors(t,n);const l=ks.dot(La),c=Bs.dot(La);if(l<=0&&c<=0)return e.copy(n);Da.subVectors(t,i);const h=ks.dot(Da),d=Bs.dot(Da);if(h>=0&&d<=h)return e.copy(i);const u=l*d-h*c;if(u<=0&&l>=0&&h<=0)return r=l/(l-h),e.copy(n).addScaledVector(ks,r);Ia.subVectors(t,o);const g=ks.dot(Ia),f=Bs.dot(Ia);if(f>=0&&g<=f)return e.copy(o);const v=g*c-l*f;if(v<=0&&c>=0&&f<=0)return a=c/(c-f),e.copy(n).addScaledVector(Bs,a);const p=h*f-g*d;if(p<=0&&d-h>=0&&g-f>=0)return vh.subVectors(o,i),a=(d-h)/(d-h+(g-f)),e.copy(i).addScaledVector(vh,a);const m=1/(p+v+u);return r=v*m,a=u*m,e.copy(n).addScaledVector(ks,r).addScaledVector(Bs,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const pu={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Xi={h:0,s:0,l:0},Sr={h:0,s:0,l:0};function Fa(s,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?s+(t-s)*6*e:e<1/2?t:e<2/3?s+(t-s)*6*(2/3-e):s}class Gt{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){const i=t;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Pn){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,_e.toWorkingColorSpace(this,e),this}setRGB(t,e,n,i=_e.workingColorSpace){return this.r=t,this.g=e,this.b=n,_e.toWorkingColorSpace(this,i),this}setHSL(t,e,n,i=_e.workingColorSpace){if(t=xc(t,1),e=je(e,0,1),n=je(n,0,1),e===0)this.r=this.g=this.b=n;else{const o=n<=.5?n*(1+e):n+e-n*e,r=2*n-o;this.r=Fa(r,o,t+1/3),this.g=Fa(r,o,t),this.b=Fa(r,o,t-1/3)}return _e.toWorkingColorSpace(this,i),this}setStyle(t,e=Pn){function n(o){o!==void 0&&parseFloat(o)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(t)){let o;const r=i[1],a=i[2];switch(r){case"rgb":case"rgba":if(o=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(o[4]),this.setRGB(Math.min(255,parseInt(o[1],10))/255,Math.min(255,parseInt(o[2],10))/255,Math.min(255,parseInt(o[3],10))/255,e);if(o=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(o[4]),this.setRGB(Math.min(100,parseInt(o[1],10))/100,Math.min(100,parseInt(o[2],10))/100,Math.min(100,parseInt(o[3],10))/100,e);break;case"hsl":case"hsla":if(o=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(o[4]),this.setHSL(parseFloat(o[1])/360,parseFloat(o[2])/100,parseFloat(o[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(t)){const o=i[1],r=o.length;if(r===3)return this.setRGB(parseInt(o.charAt(0),16)/15,parseInt(o.charAt(1),16)/15,parseInt(o.charAt(2),16)/15,e);if(r===6)return this.setHex(parseInt(o,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Pn){const n=pu[t.toLowerCase()];return n!==void 0?this.setHex(n,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Ui(t.r),this.g=Ui(t.g),this.b=Ui(t.b),this}copyLinearToSRGB(t){return this.r=io(t.r),this.g=io(t.g),this.b=io(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Pn){return _e.fromWorkingColorSpace(yn.copy(this),t),Math.round(je(yn.r*255,0,255))*65536+Math.round(je(yn.g*255,0,255))*256+Math.round(je(yn.b*255,0,255))}getHexString(t=Pn){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=_e.workingColorSpace){_e.fromWorkingColorSpace(yn.copy(this),e);const n=yn.r,i=yn.g,o=yn.b,r=Math.max(n,i,o),a=Math.min(n,i,o);let l,c;const h=(a+r)/2;if(a===r)l=0,c=0;else{const d=r-a;switch(c=h<=.5?d/(r+a):d/(2-r-a),r){case n:l=(i-o)/d+(i<o?6:0);break;case i:l=(o-n)/d+2;break;case o:l=(n-i)/d+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=_e.workingColorSpace){return _e.fromWorkingColorSpace(yn.copy(this),e),t.r=yn.r,t.g=yn.g,t.b=yn.b,t}getStyle(t=Pn){_e.fromWorkingColorSpace(yn.copy(this),t);const e=yn.r,n=yn.g,i=yn.b;return t!==Pn?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(t,e,n){return this.getHSL(Xi),this.setHSL(Xi.h+t,Xi.s+e,Xi.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Xi),t.getHSL(Sr);const n=Ko(Xi.h,Sr.h,e),i=Ko(Xi.s,Sr.s,e),o=Ko(Xi.l,Sr.l,e);return this.setHSL(n,i,o),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,n=this.g,i=this.b,o=t.elements;return this.r=o[0]*e+o[3]*n+o[6]*i,this.g=o[1]*e+o[4]*n+o[7]*i,this.b=o[2]*e+o[5]*n+o[8]*i,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const yn=new Gt;Gt.NAMES=pu;let wf=0;class wo extends xo{static get type(){return"Material"}get type(){return this.constructor.type}set type(t){}constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:wf++}),this.uuid=_o(),this.name="",this.blending=zi,this.side=Oi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=xl,this.blendDst=_l,this.blendEquation=_s,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Gt(0,0,0),this.blendAlpha=0,this.depthFunc=oo,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Jc,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ls,this.stencilZFail=Ls,this.stencilZPass=Ls,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const n=t[e];if(n===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}const i=this[e];if(i===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==zi&&(n.blending=this.blending),this.side!==Oi&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==xl&&(n.blendSrc=this.blendSrc),this.blendDst!==_l&&(n.blendDst=this.blendDst),this.blendEquation!==_s&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==oo&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Jc&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Ls&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Ls&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Ls&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(o){const r=[];for(const a in o){const l=o[a];delete l.metadata,r.push(l)}return r}if(e){const o=i(t.textures),r=i(t.images);o.length>0&&(n.textures=o),r.length>0&&(n.images=r)}return n}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let n=null;if(e!==null){const i=e.length;n=new Array(i);for(let o=0;o!==i;++o)n[o]=e[o].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class _c extends wo{static get type(){return"MeshBasicMaterial"}constructor(t){super(),this.isMeshBasicMaterial=!0,this.color=new Gt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Oe,this.combine=$0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const Di=yf();function yf(){const s=new ArrayBuffer(4),t=new Float32Array(s),e=new Uint32Array(s),n=new Uint32Array(512),i=new Uint32Array(512);for(let l=0;l<256;++l){const c=l-127;c<-27?(n[l]=0,n[l|256]=32768,i[l]=24,i[l|256]=24):c<-14?(n[l]=1024>>-c-14,n[l|256]=1024>>-c-14|32768,i[l]=-c-1,i[l|256]=-c-1):c<=15?(n[l]=c+15<<10,n[l|256]=c+15<<10|32768,i[l]=13,i[l|256]=13):c<128?(n[l]=31744,n[l|256]=64512,i[l]=24,i[l|256]=24):(n[l]=31744,n[l|256]=64512,i[l]=13,i[l|256]=13)}const o=new Uint32Array(2048),r=new Uint32Array(64),a=new Uint32Array(64);for(let l=1;l<1024;++l){let c=l<<13,h=0;for(;!(c&8388608);)c<<=1,h-=8388608;c&=-8388609,h+=947912704,o[l]=c|h}for(let l=1024;l<2048;++l)o[l]=939524096+(l-1024<<13);for(let l=1;l<31;++l)r[l]=l<<23;r[31]=1199570944,r[32]=2147483648;for(let l=33;l<63;++l)r[l]=2147483648+(l-32<<23);r[63]=3347054592;for(let l=1;l<64;++l)l!==32&&(a[l]=1024);return{floatView:t,uint32View:e,baseTable:n,shiftTable:i,mantissaTable:o,exponentTable:r,offsetTable:a}}function Mf(s){Math.abs(s)>65504&&console.warn("THREE.DataUtils.toHalfFloat(): Value out of range."),s=je(s,-65504,65504),Di.floatView[0]=s;const t=Di.uint32View[0],e=t>>23&511;return Di.baseTable[e]+((t&8388607)>>Di.shiftTable[e])}function Sf(s){const t=s>>10;return Di.uint32View[0]=Di.mantissaTable[Di.offsetTable[t]+(s&1023)]+Di.exponentTable[t],Di.floatView[0]}const bf={toHalfFloat:Mf,fromHalfFloat:Sf},Ye=new C,br=new Pt;class ye{constructor(t,e,n=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=Qc,this.updateRanges=[],this.gpuType=Xn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let i=0,o=this.itemSize;i<o;i++)this.array[t+i]=e.array[n+i];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)br.fromBufferAttribute(this,e),br.applyMatrix3(t),this.setXY(e,br.x,br.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)Ye.fromBufferAttribute(this,e),Ye.applyMatrix3(t),this.setXYZ(e,Ye.x,Ye.y,Ye.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)Ye.fromBufferAttribute(this,e),Ye.applyMatrix4(t),this.setXYZ(e,Ye.x,Ye.y,Ye.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Ye.fromBufferAttribute(this,e),Ye.applyNormalMatrix(t),this.setXYZ(e,Ye.x,Ye.y,Ye.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Ye.fromBufferAttribute(this,e),Ye.transformDirection(t),this.setXYZ(e,Ye.x,Ye.y,Ye.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=Zs(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=Cn(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Zs(e,this.array)),e}setX(t,e){return this.normalized&&(e=Cn(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Zs(e,this.array)),e}setY(t,e){return this.normalized&&(e=Cn(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Zs(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Cn(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Zs(e,this.array)),e}setW(t,e){return this.normalized&&(e=Cn(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=Cn(e,this.array),n=Cn(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,i){return t*=this.itemSize,this.normalized&&(e=Cn(e,this.array),n=Cn(n,this.array),i=Cn(i,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this}setXYZW(t,e,n,i,o){return t*=this.itemSize,this.normalized&&(e=Cn(e,this.array),n=Cn(n,this.array),i=Cn(i,this.array),o=Cn(o,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this.array[t+3]=o,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==Qc&&(t.usage=this.usage),t}}class mu extends ye{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class gu extends ye{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class yt extends ye{constructor(t,e,n){super(new Float32Array(t),e,n)}}let Ef=0;const Yn=new jt,Oa=new pn,Hs=new C,On=new Xe,Po=new Xe,on=new C;class oe extends xo{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Ef++}),this.uuid=_o(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(lu(t)?gu:mu)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const o=new pe().getNormalMatrix(t);n.applyNormalMatrix(o),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(t),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return Yn.makeRotationFromQuaternion(t),this.applyMatrix4(Yn),this}rotateX(t){return Yn.makeRotationX(t),this.applyMatrix4(Yn),this}rotateY(t){return Yn.makeRotationY(t),this.applyMatrix4(Yn),this}rotateZ(t){return Yn.makeRotationZ(t),this.applyMatrix4(Yn),this}translate(t,e,n){return Yn.makeTranslation(t,e,n),this.applyMatrix4(Yn),this}scale(t,e,n){return Yn.makeScale(t,e,n),this.applyMatrix4(Yn),this}lookAt(t){return Oa.lookAt(t),Oa.updateMatrix(),this.applyMatrix4(Oa.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Hs).negate(),this.translate(Hs.x,Hs.y,Hs.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const n=[];for(let i=0,o=t.length;i<o;i++){const r=t[i];n.push(r.x,r.y,r.z||0)}this.setAttribute("position",new yt(n,3))}else{for(let n=0,i=e.count;n<i;n++){const o=t[n];e.setXYZ(n,o.x,o.y,o.z||0)}t.length>e.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Xe);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new C(-1/0,-1/0,-1/0),new C(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,i=e.length;n<i;n++){const o=e[n];On.setFromBufferAttribute(o),this.morphTargetsRelative?(on.addVectors(this.boundingBox.min,On.min),this.boundingBox.expandByPoint(on),on.addVectors(this.boundingBox.max,On.max),this.boundingBox.expandByPoint(on)):(this.boundingBox.expandByPoint(On.min),this.boundingBox.expandByPoint(On.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Fe);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new C,1/0);return}if(t){const n=this.boundingSphere.center;if(On.setFromBufferAttribute(t),e)for(let o=0,r=e.length;o<r;o++){const a=e[o];Po.setFromBufferAttribute(a),this.morphTargetsRelative?(on.addVectors(On.min,Po.min),On.expandByPoint(on),on.addVectors(On.max,Po.max),On.expandByPoint(on)):(On.expandByPoint(Po.min),On.expandByPoint(Po.max))}On.getCenter(n);let i=0;for(let o=0,r=t.count;o<r;o++)on.fromBufferAttribute(t,o),i=Math.max(i,n.distanceToSquared(on));if(e)for(let o=0,r=e.length;o<r;o++){const a=e[o],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)on.fromBufferAttribute(a,c),l&&(Hs.fromBufferAttribute(t,c),on.add(Hs)),i=Math.max(i,n.distanceToSquared(on))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=e.position,i=e.normal,o=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new ye(new Float32Array(4*n.count),4));const r=this.getAttribute("tangent"),a=[],l=[];for(let E=0;E<n.count;E++)a[E]=new C,l[E]=new C;const c=new C,h=new C,d=new C,u=new Pt,g=new Pt,f=new Pt,v=new C,p=new C;function m(E,y,b){c.fromBufferAttribute(n,E),h.fromBufferAttribute(n,y),d.fromBufferAttribute(n,b),u.fromBufferAttribute(o,E),g.fromBufferAttribute(o,y),f.fromBufferAttribute(o,b),h.sub(c),d.sub(c),g.sub(u),f.sub(u);const T=1/(g.x*f.y-f.x*g.y);isFinite(T)&&(v.copy(h).multiplyScalar(f.y).addScaledVector(d,-g.y).multiplyScalar(T),p.copy(d).multiplyScalar(g.x).addScaledVector(h,-f.x).multiplyScalar(T),a[E].add(v),a[y].add(v),a[b].add(v),l[E].add(p),l[y].add(p),l[b].add(p))}let _=this.groups;_.length===0&&(_=[{start:0,count:t.count}]);for(let E=0,y=_.length;E<y;++E){const b=_[E],T=b.start,U=b.count;for(let O=T,z=T+U;O<z;O+=3)m(t.getX(O+0),t.getX(O+1),t.getX(O+2))}const w=new C,x=new C,A=new C,M=new C;function S(E){A.fromBufferAttribute(i,E),M.copy(A);const y=a[E];w.copy(y),w.sub(A.multiplyScalar(A.dot(y))).normalize(),x.crossVectors(M,y);const T=x.dot(l[E])<0?-1:1;r.setXYZW(E,w.x,w.y,w.z,T)}for(let E=0,y=_.length;E<y;++E){const b=_[E],T=b.start,U=b.count;for(let O=T,z=T+U;O<z;O+=3)S(t.getX(O+0)),S(t.getX(O+1)),S(t.getX(O+2))}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new ye(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,g=n.count;u<g;u++)n.setXYZ(u,0,0,0);const i=new C,o=new C,r=new C,a=new C,l=new C,c=new C,h=new C,d=new C;if(t)for(let u=0,g=t.count;u<g;u+=3){const f=t.getX(u+0),v=t.getX(u+1),p=t.getX(u+2);i.fromBufferAttribute(e,f),o.fromBufferAttribute(e,v),r.fromBufferAttribute(e,p),h.subVectors(r,o),d.subVectors(i,o),h.cross(d),a.fromBufferAttribute(n,f),l.fromBufferAttribute(n,v),c.fromBufferAttribute(n,p),a.add(h),l.add(h),c.add(h),n.setXYZ(f,a.x,a.y,a.z),n.setXYZ(v,l.x,l.y,l.z),n.setXYZ(p,c.x,c.y,c.z)}else for(let u=0,g=e.count;u<g;u+=3)i.fromBufferAttribute(e,u+0),o.fromBufferAttribute(e,u+1),r.fromBufferAttribute(e,u+2),h.subVectors(r,o),d.subVectors(i,o),h.cross(d),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)on.fromBufferAttribute(t,e),on.normalize(),t.setXYZ(e,on.x,on.y,on.z)}toNonIndexed(){function t(a,l){const c=a.array,h=a.itemSize,d=a.normalized,u=new c.constructor(l.length*h);let g=0,f=0;for(let v=0,p=l.length;v<p;v++){a.isInterleavedBufferAttribute?g=l[v]*a.data.stride+a.offset:g=l[v]*h;for(let m=0;m<h;m++)u[f++]=c[g++]}return new ye(u,h,d)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new oe,n=this.index.array,i=this.attributes;for(const a in i){const l=i[a],c=t(l,n);e.setAttribute(a,c)}const o=this.morphAttributes;for(const a in o){const l=[],c=o[a];for(let h=0,d=c.length;h<d;h++){const u=c[h],g=t(u,n);l.push(g)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;const r=this.groups;for(let a=0,l=r.length;a<l;a++){const c=r[a];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){const t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const n=this.attributes;for(const l in n){const c=n[l];t.data.attributes[l]=c.toJSON(t.data)}const i={};let o=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let d=0,u=c.length;d<u;d++){const g=c[d];h.push(g.toJSON(t.data))}h.length>0&&(i[l]=h,o=!0)}o&&(t.data.morphAttributes=i,t.data.morphTargetsRelative=this.morphTargetsRelative);const r=this.groups;r.length>0&&(t.data.groups=JSON.parse(JSON.stringify(r)));const a=this.boundingSphere;return a!==null&&(t.data.boundingSphere={center:a.center.toArray(),radius:a.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const n=t.index;n!==null&&this.setIndex(n.clone(e));const i=t.attributes;for(const c in i){const h=i[c];this.setAttribute(c,h.clone(e))}const o=t.morphAttributes;for(const c in o){const h=[],d=o[c];for(let u=0,g=d.length;u<g;u++)h.push(d[u].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;const r=t.groups;for(let c=0,h=r.length;c<h;c++){const d=r[c];this.addGroup(d.start,d.count,d.materialIndex)}const a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const xh=new jt,as=new du,Er=new Fe,_h=new C,Ar=new C,Tr=new C,Cr=new C,ka=new C,Rr=new C,wh=new C,Pr=new C;class ge extends pn{constructor(t=new oe,e=new _c){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let o=0,r=i.length;o<r;o++){const a=i[o].name||String(o);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=o}}}}getVertexPosition(t,e){const n=this.geometry,i=n.attributes.position,o=n.morphAttributes.position,r=n.morphTargetsRelative;e.fromBufferAttribute(i,t);const a=this.morphTargetInfluences;if(o&&a){Rr.set(0,0,0);for(let l=0,c=o.length;l<c;l++){const h=a[l],d=o[l];h!==0&&(ka.fromBufferAttribute(d,t),r?Rr.addScaledVector(ka,h):Rr.addScaledVector(ka.sub(e),h))}e.add(Rr)}return e}raycast(t,e){const n=this.geometry,i=this.material,o=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Er.copy(n.boundingSphere),Er.applyMatrix4(o),as.copy(t.ray).recast(t.near),!(Er.containsPoint(as.origin)===!1&&(as.intersectSphere(Er,_h)===null||as.origin.distanceToSquared(_h)>(t.far-t.near)**2))&&(xh.copy(o).invert(),as.copy(t.ray).applyMatrix4(xh),!(n.boundingBox!==null&&as.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,as)))}_computeIntersections(t,e,n){let i;const o=this.geometry,r=this.material,a=o.index,l=o.attributes.position,c=o.attributes.uv,h=o.attributes.uv1,d=o.attributes.normal,u=o.groups,g=o.drawRange;if(a!==null)if(Array.isArray(r))for(let f=0,v=u.length;f<v;f++){const p=u[f],m=r[p.materialIndex],_=Math.max(p.start,g.start),w=Math.min(a.count,Math.min(p.start+p.count,g.start+g.count));for(let x=_,A=w;x<A;x+=3){const M=a.getX(x),S=a.getX(x+1),E=a.getX(x+2);i=Lr(this,m,t,n,c,h,d,M,S,E),i&&(i.faceIndex=Math.floor(x/3),i.face.materialIndex=p.materialIndex,e.push(i))}}else{const f=Math.max(0,g.start),v=Math.min(a.count,g.start+g.count);for(let p=f,m=v;p<m;p+=3){const _=a.getX(p),w=a.getX(p+1),x=a.getX(p+2);i=Lr(this,r,t,n,c,h,d,_,w,x),i&&(i.faceIndex=Math.floor(p/3),e.push(i))}}else if(l!==void 0)if(Array.isArray(r))for(let f=0,v=u.length;f<v;f++){const p=u[f],m=r[p.materialIndex],_=Math.max(p.start,g.start),w=Math.min(l.count,Math.min(p.start+p.count,g.start+g.count));for(let x=_,A=w;x<A;x+=3){const M=x,S=x+1,E=x+2;i=Lr(this,m,t,n,c,h,d,M,S,E),i&&(i.faceIndex=Math.floor(x/3),i.face.materialIndex=p.materialIndex,e.push(i))}}else{const f=Math.max(0,g.start),v=Math.min(l.count,g.start+g.count);for(let p=f,m=v;p<m;p+=3){const _=p,w=p+1,x=p+2;i=Lr(this,r,t,n,c,h,d,_,w,x),i&&(i.faceIndex=Math.floor(p/3),e.push(i))}}}}function Af(s,t,e,n,i,o,r,a){let l;if(t.side===An?l=n.intersectTriangle(r,o,i,!0,a):l=n.intersectTriangle(i,o,r,t.side===Oi,a),l===null)return null;Pr.copy(a),Pr.applyMatrix4(s.matrixWorld);const c=e.ray.origin.distanceTo(Pr);return c<e.near||c>e.far?null:{distance:c,point:Pr.clone(),object:s}}function Lr(s,t,e,n,i,o,r,a,l,c){s.getVertexPosition(a,Ar),s.getVertexPosition(l,Tr),s.getVertexPosition(c,Cr);const h=Af(s,t,e,n,Ar,Tr,Cr,wh);if(h){const d=new C;ni.getBarycoord(wh,Ar,Tr,Cr,d),i&&(h.uv=ni.getInterpolatedAttribute(i,a,l,c,d,new Pt)),o&&(h.uv1=ni.getInterpolatedAttribute(o,a,l,c,d,new Pt)),r&&(h.normal=ni.getInterpolatedAttribute(r,a,l,c,d,new C),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const u={a,b:l,c,normal:new C,materialIndex:0};ni.getNormal(Ar,Tr,Cr,u.normal),h.face=u,h.barycoord=d}return h}class Ht extends oe{constructor(t=1,e=1,n=1,i=1,o=1,r=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:i,heightSegments:o,depthSegments:r};const a=this;i=Math.floor(i),o=Math.floor(o),r=Math.floor(r);const l=[],c=[],h=[],d=[];let u=0,g=0;f("z","y","x",-1,-1,n,e,t,r,o,0),f("z","y","x",1,-1,n,e,-t,r,o,1),f("x","z","y",1,1,t,n,e,i,r,2),f("x","z","y",1,-1,t,n,-e,i,r,3),f("x","y","z",1,-1,t,e,n,i,o,4),f("x","y","z",-1,-1,t,e,-n,i,o,5),this.setIndex(l),this.setAttribute("position",new yt(c,3)),this.setAttribute("normal",new yt(h,3)),this.setAttribute("uv",new yt(d,2));function f(v,p,m,_,w,x,A,M,S,E,y){const b=x/S,T=A/E,U=x/2,O=A/2,z=M/2,B=S+1,F=E+1;let L=0,H=0;const G=new C;for(let N=0;N<F;N++){const $=N*T-O;for(let V=0;V<B;V++){const tt=V*b-U;G[v]=tt*_,G[p]=$*w,G[m]=z,c.push(G.x,G.y,G.z),G[v]=0,G[p]=0,G[m]=M>0?1:-1,h.push(G.x,G.y,G.z),d.push(V/S),d.push(1-N/E),L+=1}}for(let N=0;N<E;N++)for(let $=0;$<S;$++){const V=u+$+B*N,tt=u+$+B*(N+1),W=u+($+1)+B*(N+1),q=u+($+1)+B*N;l.push(V,tt,q),l.push(tt,W,q),H+=6}a.addGroup(g,H,y),g+=H,u+=L}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ht(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function uo(s){const t={};for(const e in s){t[e]={};for(const n in s[e]){const i=s[e][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=i.clone():Array.isArray(i)?t[e][n]=i.slice():t[e][n]=i}}return t}function Rn(s){const t={};for(let e=0;e<s.length;e++){const n=uo(s[e]);for(const i in n)t[i]=n[i]}return t}function Tf(s){const t=[];for(let e=0;e<s.length;e++)t.push(s[e].clone());return t}function vu(s){const t=s.getRenderTarget();return t===null?s.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:_e.workingColorSpace}const Cf={clone:uo,merge:Rn};var Rf=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Pf=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Ke extends wo{static get type(){return"ShaderMaterial"}constructor(t){super(),this.isShaderMaterial=!0,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Rf,this.fragmentShader=Pf,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=uo(t.uniforms),this.uniformsGroups=Tf(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const i in this.uniforms){const r=this.uniforms[i].value;r&&r.isTexture?e.uniforms[i]={type:"t",value:r.toJSON(t).uuid}:r&&r.isColor?e.uniforms[i]={type:"c",value:r.getHex()}:r&&r.isVector2?e.uniforms[i]={type:"v2",value:r.toArray()}:r&&r.isVector3?e.uniforms[i]={type:"v3",value:r.toArray()}:r&&r.isVector4?e.uniforms[i]={type:"v4",value:r.toArray()}:r&&r.isMatrix3?e.uniforms[i]={type:"m3",value:r.toArray()}:r&&r.isMatrix4?e.uniforms[i]={type:"m4",value:r.toArray()}:e.uniforms[i]={value:r}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}}class xu extends pn{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new jt,this.projectionMatrix=new jt,this.projectionMatrixInverse=new jt,this.coordinateSystem=Ii}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const qi=new C,yh=new Pt,Mh=new Pt;class Wn extends xu{constructor(t=50,e=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=sr*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(Zo*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return sr*2*Math.atan(Math.tan(Zo*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){qi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(qi.x,qi.y).multiplyScalar(-t/qi.z),qi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(qi.x,qi.y).multiplyScalar(-t/qi.z)}getViewSize(t,e){return this.getViewBounds(t,yh,Mh),e.subVectors(Mh,yh)}setViewOffset(t,e,n,i,o,r){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=o,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(Zo*.5*this.fov)/this.zoom,n=2*e,i=this.aspect*n,o=-.5*i;const r=this.view;if(this.view!==null&&this.view.enabled){const l=r.fullWidth,c=r.fullHeight;o+=r.offsetX*i/l,e-=r.offsetY*n/c,i*=r.width/l,n*=r.height/c}const a=this.filmOffset;a!==0&&(o+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(o,o+i,e,e-n,t,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const Gs=-90,Vs=1;class Lf extends pn{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new Wn(Gs,Vs,t,e);i.layers=this.layers,this.add(i);const o=new Wn(Gs,Vs,t,e);o.layers=this.layers,this.add(o);const r=new Wn(Gs,Vs,t,e);r.layers=this.layers,this.add(r);const a=new Wn(Gs,Vs,t,e);a.layers=this.layers,this.add(a);const l=new Wn(Gs,Vs,t,e);l.layers=this.layers,this.add(l);const c=new Wn(Gs,Vs,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[n,i,o,r,a,l]=e;for(const c of e)this.remove(c);if(t===Ii)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),o.up.set(0,0,-1),o.lookAt(0,1,0),r.up.set(0,0,1),r.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===na)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),o.up.set(0,0,1),o.lookAt(0,1,0),r.up.set(0,0,-1),r.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[o,r,a,l,c,h]=this.children,d=t.getRenderTarget(),u=t.getActiveCubeFace(),g=t.getActiveMipmapLevel(),f=t.xr.enabled;t.xr.enabled=!1;const v=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,t.setRenderTarget(n,0,i),t.render(e,o),t.setRenderTarget(n,1,i),t.render(e,r),t.setRenderTarget(n,2,i),t.render(e,a),t.setRenderTarget(n,3,i),t.render(e,l),t.setRenderTarget(n,4,i),t.render(e,c),n.texture.generateMipmaps=v,t.setRenderTarget(n,5,i),t.render(e,h),t.setRenderTarget(d,u,g),t.xr.enabled=f,n.texture.needsPMREMUpdate=!0}}class _u extends Tn{constructor(t,e,n,i,o,r,a,l,c,h){t=t!==void 0?t:[],e=e!==void 0?e:ro,super(t,e,n,i,o,r,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class Df extends Un{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const n={width:t,height:t,depth:1},i=[n,n,n,n,n,n];this.texture=new _u(i,e.mapping,e.wrapS,e.wrapT,e.magFilter,e.minFilter,e.format,e.type,e.anisotropy,e.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=e.generateMipmaps!==void 0?e.generateMipmaps:!1,this.texture.minFilter=e.minFilter!==void 0?e.minFilter:Ae}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},i=new Ht(5,5,5),o=new Ke({name:"CubemapFromEquirect",uniforms:uo(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:An,blending:ts});o.uniforms.tEquirect.value=e;const r=new ge(i,o),a=e.minFilter;return e.minFilter===Qi&&(e.minFilter=Ae),new Lf(1,10,this).update(t,r),e.minFilter=a,r.geometry.dispose(),r.material.dispose(),this}clear(t,e,n,i){const o=t.getRenderTarget();for(let r=0;r<6;r++)t.setRenderTarget(this,r),t.clear(e,n,i);t.setRenderTarget(o)}}const Ba=new C,If=new C,zf=new pe;class vs{constructor(t=new C(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,i){return this.normal.set(t,e,n),this.constant=i,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){const i=Ba.subVectors(n,e).cross(If.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(i,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const n=t.delta(Ba),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const o=-(t.start.dot(this.normal)+this.constant)/i;return o<0||o>1?null:e.copy(t.start).addScaledVector(n,o)}intersectsLine(t){const e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const n=e||zf.getNormalMatrix(t),i=this.coplanarPoint(Ba).applyMatrix4(t),o=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(o),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const ls=new Fe,Dr=new C;class fo{constructor(t=new vs,e=new vs,n=new vs,i=new vs,o=new vs,r=new vs){this.planes=[t,e,n,i,o,r]}set(t,e,n,i,o,r){const a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(i),a[4].copy(o),a[5].copy(r),this}copy(t){const e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=Ii){const n=this.planes,i=t.elements,o=i[0],r=i[1],a=i[2],l=i[3],c=i[4],h=i[5],d=i[6],u=i[7],g=i[8],f=i[9],v=i[10],p=i[11],m=i[12],_=i[13],w=i[14],x=i[15];if(n[0].setComponents(l-o,u-c,p-g,x-m).normalize(),n[1].setComponents(l+o,u+c,p+g,x+m).normalize(),n[2].setComponents(l+r,u+h,p+f,x+_).normalize(),n[3].setComponents(l-r,u-h,p-f,x-_).normalize(),n[4].setComponents(l-a,u-d,p-v,x-w).normalize(),e===Ii)n[5].setComponents(l+a,u+d,p+v,x+w).normalize();else if(e===na)n[5].setComponents(a,d,v,w).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),ls.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),ls.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(ls)}intersectsSprite(t){return ls.center.set(0,0,0),ls.radius=.7071067811865476,ls.applyMatrix4(t.matrixWorld),this.intersectsSphere(ls)}intersectsSphere(t){const e=this.planes,n=t.center,i=-t.radius;for(let o=0;o<6;o++)if(e[o].distanceToPoint(n)<i)return!1;return!0}intersectsBox(t){const e=this.planes;for(let n=0;n<6;n++){const i=e[n];if(Dr.x=i.normal.x>0?t.max.x:t.min.x,Dr.y=i.normal.y>0?t.max.y:t.min.y,Dr.z=i.normal.z>0?t.max.z:t.min.z,i.distanceToPoint(Dr)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function wu(){let s=null,t=!1,e=null,n=null;function i(o,r){e(o,r),n=s.requestAnimationFrame(i)}return{start:function(){t!==!0&&e!==null&&(n=s.requestAnimationFrame(i),t=!0)},stop:function(){s.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(o){e=o},setContext:function(o){s=o}}}function Nf(s){const t=new WeakMap;function e(a,l){const c=a.array,h=a.usage,d=c.byteLength,u=s.createBuffer();s.bindBuffer(l,u),s.bufferData(l,c,h),a.onUploadCallback();let g;if(c instanceof Float32Array)g=s.FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?g=s.HALF_FLOAT:g=s.UNSIGNED_SHORT;else if(c instanceof Int16Array)g=s.SHORT;else if(c instanceof Uint32Array)g=s.UNSIGNED_INT;else if(c instanceof Int32Array)g=s.INT;else if(c instanceof Int8Array)g=s.BYTE;else if(c instanceof Uint8Array)g=s.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)g=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:g,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:d}}function n(a,l,c){const h=l.array,d=l.updateRanges;if(s.bindBuffer(c,a),d.length===0)s.bufferSubData(c,0,h);else{d.sort((g,f)=>g.start-f.start);let u=0;for(let g=1;g<d.length;g++){const f=d[u],v=d[g];v.start<=f.start+f.count+1?f.count=Math.max(f.count,v.start+v.count-f.start):(++u,d[u]=v)}d.length=u+1;for(let g=0,f=d.length;g<f;g++){const v=d[g];s.bufferSubData(c,v.start*h.BYTES_PER_ELEMENT,h,v.start,v.count)}l.clearUpdateRanges()}l.onUploadCallback()}function i(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function o(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=t.get(a);l&&(s.deleteBuffer(l.buffer),t.delete(a))}function r(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=t.get(a);if(c===void 0)t.set(a,e(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:i,remove:o,update:r}}class Bi extends oe{constructor(t=1,e=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:i};const o=t/2,r=e/2,a=Math.floor(n),l=Math.floor(i),c=a+1,h=l+1,d=t/a,u=e/l,g=[],f=[],v=[],p=[];for(let m=0;m<h;m++){const _=m*u-r;for(let w=0;w<c;w++){const x=w*d-o;f.push(x,-_,0),v.push(0,0,1),p.push(w/a),p.push(1-m/l)}}for(let m=0;m<l;m++)for(let _=0;_<a;_++){const w=_+c*m,x=_+c*(m+1),A=_+1+c*(m+1),M=_+1+c*m;g.push(w,x,M),g.push(x,A,M)}this.setIndex(g),this.setAttribute("position",new yt(f,3)),this.setAttribute("normal",new yt(v,3)),this.setAttribute("uv",new yt(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Bi(t.width,t.height,t.widthSegments,t.heightSegments)}}var Uf=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Ff=`#ifdef USE_ALPHAHASH
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
#endif`,Of=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,kf=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Bf=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Hf=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Gf=`#ifdef USE_AOMAP
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
#endif`,Vf=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Wf=`#ifdef USE_BATCHING
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
#endif`,Xf=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,qf=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Yf=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,$f=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,jf=`#ifdef USE_IRIDESCENCE
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
#endif`,Zf=`#ifdef USE_BUMPMAP
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
#endif`,Kf=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,Jf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Qf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,tp=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,ep=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,np=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,ip=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,sp=`#if defined( USE_COLOR_ALPHA )
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
#endif`,op=`#define PI 3.141592653589793
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
} // validated`,rp=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,ap=`vec3 transformedNormal = objectNormal;
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
#endif`,lp=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,cp=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,hp=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,up=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,dp="gl_FragColor = linearToOutputTexel( gl_FragColor );",fp=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,pp=`#ifdef USE_ENVMAP
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
#endif`,mp=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,gp=`#ifdef USE_ENVMAP
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
#endif`,vp=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,xp=`#ifdef USE_ENVMAP
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
#endif`,_p=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,wp=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,yp=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Mp=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Sp=`#ifdef USE_GRADIENTMAP
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
}`,bp=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Ep=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Ap=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Tp=`uniform bool receiveShadow;
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
#endif`,Cp=`#ifdef USE_ENVMAP
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
#endif`,Rp=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Pp=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Lp=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Dp=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Ip=`PhysicalMaterial material;
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
#endif`,zp=`struct PhysicalMaterial {
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
}`,Np=`
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
#endif`,Up=`#if defined( RE_IndirectDiffuse )
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
#endif`,Fp=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Op=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,kp=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Bp=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Hp=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Gp=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Vp=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Wp=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Xp=`#if defined( USE_POINTS_UV )
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
#endif`,qp=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Yp=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,$p=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,jp=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Zp=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Kp=`#ifdef USE_MORPHTARGETS
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
#endif`,Jp=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Qp=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,tm=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,em=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,nm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,im=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,sm=`#ifdef USE_NORMALMAP
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
#endif`,om=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,rm=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,am=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,lm=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,cm=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,hm=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,um=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,dm=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,fm=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,pm=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,mm=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,gm=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,vm=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,xm=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,_m=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,wm=`float getShadowMask() {
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
}`,ym=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Mm=`#ifdef USE_SKINNING
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
#endif`,Sm=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,bm=`#ifdef USE_SKINNING
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
#endif`,Em=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Am=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Tm=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Cm=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,Rm=`#ifdef USE_TRANSMISSION
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
#endif`,Pm=`#ifdef USE_TRANSMISSION
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
#endif`,Lm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Dm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Im=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,zm=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Nm=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Um=`uniform sampler2D t2D;
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
}`,Fm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Om=`#ifdef ENVMAP_TYPE_CUBE
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
}`,km=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Bm=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Hm=`#include <common>
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
}`,Gm=`#if DEPTH_PACKING == 3200
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
}`,Vm=`#define DISTANCE
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
}`,Wm=`#define DISTANCE
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
}`,Xm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,qm=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Ym=`uniform float scale;
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
}`,$m=`uniform vec3 diffuse;
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
}`,jm=`#include <common>
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
}`,Zm=`uniform vec3 diffuse;
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
}`,Km=`#define LAMBERT
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
}`,Jm=`#define LAMBERT
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
}`,Qm=`#define MATCAP
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
}`,tg=`#define MATCAP
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
}`,eg=`#define NORMAL
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
}`,ng=`#define NORMAL
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
}`,ig=`#define PHONG
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
}`,sg=`#define PHONG
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
}`,og=`#define STANDARD
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
}`,rg=`#define STANDARD
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
}`,ag=`#define TOON
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
}`,lg=`#define TOON
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
}`,cg=`uniform float size;
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
}`,hg=`uniform vec3 diffuse;
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
}`,ug=`#include <common>
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
}`,dg=`uniform vec3 color;
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
}`,fg=`uniform float rotation;
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
}`,pg=`uniform vec3 diffuse;
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
}`,he={alphahash_fragment:Uf,alphahash_pars_fragment:Ff,alphamap_fragment:Of,alphamap_pars_fragment:kf,alphatest_fragment:Bf,alphatest_pars_fragment:Hf,aomap_fragment:Gf,aomap_pars_fragment:Vf,batching_pars_vertex:Wf,batching_vertex:Xf,begin_vertex:qf,beginnormal_vertex:Yf,bsdfs:$f,iridescence_fragment:jf,bumpmap_pars_fragment:Zf,clipping_planes_fragment:Kf,clipping_planes_pars_fragment:Jf,clipping_planes_pars_vertex:Qf,clipping_planes_vertex:tp,color_fragment:ep,color_pars_fragment:np,color_pars_vertex:ip,color_vertex:sp,common:op,cube_uv_reflection_fragment:rp,defaultnormal_vertex:ap,displacementmap_pars_vertex:lp,displacementmap_vertex:cp,emissivemap_fragment:hp,emissivemap_pars_fragment:up,colorspace_fragment:dp,colorspace_pars_fragment:fp,envmap_fragment:pp,envmap_common_pars_fragment:mp,envmap_pars_fragment:gp,envmap_pars_vertex:vp,envmap_physical_pars_fragment:Cp,envmap_vertex:xp,fog_vertex:_p,fog_pars_vertex:wp,fog_fragment:yp,fog_pars_fragment:Mp,gradientmap_pars_fragment:Sp,lightmap_pars_fragment:bp,lights_lambert_fragment:Ep,lights_lambert_pars_fragment:Ap,lights_pars_begin:Tp,lights_toon_fragment:Rp,lights_toon_pars_fragment:Pp,lights_phong_fragment:Lp,lights_phong_pars_fragment:Dp,lights_physical_fragment:Ip,lights_physical_pars_fragment:zp,lights_fragment_begin:Np,lights_fragment_maps:Up,lights_fragment_end:Fp,logdepthbuf_fragment:Op,logdepthbuf_pars_fragment:kp,logdepthbuf_pars_vertex:Bp,logdepthbuf_vertex:Hp,map_fragment:Gp,map_pars_fragment:Vp,map_particle_fragment:Wp,map_particle_pars_fragment:Xp,metalnessmap_fragment:qp,metalnessmap_pars_fragment:Yp,morphinstance_vertex:$p,morphcolor_vertex:jp,morphnormal_vertex:Zp,morphtarget_pars_vertex:Kp,morphtarget_vertex:Jp,normal_fragment_begin:Qp,normal_fragment_maps:tm,normal_pars_fragment:em,normal_pars_vertex:nm,normal_vertex:im,normalmap_pars_fragment:sm,clearcoat_normal_fragment_begin:om,clearcoat_normal_fragment_maps:rm,clearcoat_pars_fragment:am,iridescence_pars_fragment:lm,opaque_fragment:cm,packing:hm,premultiplied_alpha_fragment:um,project_vertex:dm,dithering_fragment:fm,dithering_pars_fragment:pm,roughnessmap_fragment:mm,roughnessmap_pars_fragment:gm,shadowmap_pars_fragment:vm,shadowmap_pars_vertex:xm,shadowmap_vertex:_m,shadowmask_pars_fragment:wm,skinbase_vertex:ym,skinning_pars_vertex:Mm,skinning_vertex:Sm,skinnormal_vertex:bm,specularmap_fragment:Em,specularmap_pars_fragment:Am,tonemapping_fragment:Tm,tonemapping_pars_fragment:Cm,transmission_fragment:Rm,transmission_pars_fragment:Pm,uv_pars_fragment:Lm,uv_pars_vertex:Dm,uv_vertex:Im,worldpos_vertex:zm,background_vert:Nm,background_frag:Um,backgroundCube_vert:Fm,backgroundCube_frag:Om,cube_vert:km,cube_frag:Bm,depth_vert:Hm,depth_frag:Gm,distanceRGBA_vert:Vm,distanceRGBA_frag:Wm,equirect_vert:Xm,equirect_frag:qm,linedashed_vert:Ym,linedashed_frag:$m,meshbasic_vert:jm,meshbasic_frag:Zm,meshlambert_vert:Km,meshlambert_frag:Jm,meshmatcap_vert:Qm,meshmatcap_frag:tg,meshnormal_vert:eg,meshnormal_frag:ng,meshphong_vert:ig,meshphong_frag:sg,meshphysical_vert:og,meshphysical_frag:rg,meshtoon_vert:ag,meshtoon_frag:lg,points_vert:cg,points_frag:hg,shadow_vert:ug,shadow_frag:dg,sprite_vert:fg,sprite_frag:pg},Ut={common:{diffuse:{value:new Gt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new pe},alphaMap:{value:null},alphaMapTransform:{value:new pe},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new pe}},envmap:{envMap:{value:null},envMapRotation:{value:new pe},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new pe}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new pe}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new pe},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new pe},normalScale:{value:new Pt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new pe},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new pe}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new pe}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new pe}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Gt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Gt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new pe},alphaTest:{value:0},uvTransform:{value:new pe}},sprite:{diffuse:{value:new Gt(16777215)},opacity:{value:1},center:{value:new Pt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new pe},alphaMap:{value:null},alphaMapTransform:{value:new pe},alphaTest:{value:0}}},hi={basic:{uniforms:Rn([Ut.common,Ut.specularmap,Ut.envmap,Ut.aomap,Ut.lightmap,Ut.fog]),vertexShader:he.meshbasic_vert,fragmentShader:he.meshbasic_frag},lambert:{uniforms:Rn([Ut.common,Ut.specularmap,Ut.envmap,Ut.aomap,Ut.lightmap,Ut.emissivemap,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.fog,Ut.lights,{emissive:{value:new Gt(0)}}]),vertexShader:he.meshlambert_vert,fragmentShader:he.meshlambert_frag},phong:{uniforms:Rn([Ut.common,Ut.specularmap,Ut.envmap,Ut.aomap,Ut.lightmap,Ut.emissivemap,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.fog,Ut.lights,{emissive:{value:new Gt(0)},specular:{value:new Gt(1118481)},shininess:{value:30}}]),vertexShader:he.meshphong_vert,fragmentShader:he.meshphong_frag},standard:{uniforms:Rn([Ut.common,Ut.envmap,Ut.aomap,Ut.lightmap,Ut.emissivemap,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.roughnessmap,Ut.metalnessmap,Ut.fog,Ut.lights,{emissive:{value:new Gt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:he.meshphysical_vert,fragmentShader:he.meshphysical_frag},toon:{uniforms:Rn([Ut.common,Ut.aomap,Ut.lightmap,Ut.emissivemap,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.gradientmap,Ut.fog,Ut.lights,{emissive:{value:new Gt(0)}}]),vertexShader:he.meshtoon_vert,fragmentShader:he.meshtoon_frag},matcap:{uniforms:Rn([Ut.common,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,Ut.fog,{matcap:{value:null}}]),vertexShader:he.meshmatcap_vert,fragmentShader:he.meshmatcap_frag},points:{uniforms:Rn([Ut.points,Ut.fog]),vertexShader:he.points_vert,fragmentShader:he.points_frag},dashed:{uniforms:Rn([Ut.common,Ut.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:he.linedashed_vert,fragmentShader:he.linedashed_frag},depth:{uniforms:Rn([Ut.common,Ut.displacementmap]),vertexShader:he.depth_vert,fragmentShader:he.depth_frag},normal:{uniforms:Rn([Ut.common,Ut.bumpmap,Ut.normalmap,Ut.displacementmap,{opacity:{value:1}}]),vertexShader:he.meshnormal_vert,fragmentShader:he.meshnormal_frag},sprite:{uniforms:Rn([Ut.sprite,Ut.fog]),vertexShader:he.sprite_vert,fragmentShader:he.sprite_frag},background:{uniforms:{uvTransform:{value:new pe},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:he.background_vert,fragmentShader:he.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new pe}},vertexShader:he.backgroundCube_vert,fragmentShader:he.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:he.cube_vert,fragmentShader:he.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:he.equirect_vert,fragmentShader:he.equirect_frag},distanceRGBA:{uniforms:Rn([Ut.common,Ut.displacementmap,{referencePosition:{value:new C},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:he.distanceRGBA_vert,fragmentShader:he.distanceRGBA_frag},shadow:{uniforms:Rn([Ut.lights,Ut.fog,{color:{value:new Gt(0)},opacity:{value:1}}]),vertexShader:he.shadow_vert,fragmentShader:he.shadow_frag}};hi.physical={uniforms:Rn([hi.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new pe},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new pe},clearcoatNormalScale:{value:new Pt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new pe},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new pe},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new pe},sheen:{value:0},sheenColor:{value:new Gt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new pe},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new pe},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new pe},transmissionSamplerSize:{value:new Pt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new pe},attenuationDistance:{value:0},attenuationColor:{value:new Gt(0)},specularColor:{value:new Gt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new pe},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new pe},anisotropyVector:{value:new Pt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new pe}}]),vertexShader:he.meshphysical_vert,fragmentShader:he.meshphysical_frag};const Ir={r:0,b:0,g:0},cs=new Oe,mg=new jt;function gg(s,t,e,n,i,o,r){const a=new Gt(0);let l=o===!0?0:1,c,h,d=null,u=0,g=null;function f(_){let w=_.isScene===!0?_.background:null;return w&&w.isTexture&&(w=(_.backgroundBlurriness>0?e:t).get(w)),w}function v(_){let w=!1;const x=f(_);x===null?m(a,l):x&&x.isColor&&(m(x,1),w=!0);const A=s.xr.getEnvironmentBlendMode();A==="additive"?n.buffers.color.setClear(0,0,0,1,r):A==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,r),(s.autoClear||w)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function p(_,w){const x=f(w);x&&(x.isCubeTexture||x.mapping===ha)?(h===void 0&&(h=new ge(new Ht(1,1,1),new Ke({name:"BackgroundCubeMaterial",uniforms:uo(hi.backgroundCube.uniforms),vertexShader:hi.backgroundCube.vertexShader,fragmentShader:hi.backgroundCube.fragmentShader,side:An,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(A,M,S){this.matrixWorld.copyPosition(S.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(h)),cs.copy(w.backgroundRotation),cs.x*=-1,cs.y*=-1,cs.z*=-1,x.isCubeTexture&&x.isRenderTargetTexture===!1&&(cs.y*=-1,cs.z*=-1),h.material.uniforms.envMap.value=x,h.material.uniforms.flipEnvMap.value=x.isCubeTexture&&x.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=w.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=w.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(mg.makeRotationFromEuler(cs)),h.material.toneMapped=_e.getTransfer(x.colorSpace)!==Re,(d!==x||u!==x.version||g!==s.toneMapping)&&(h.material.needsUpdate=!0,d=x,u=x.version,g=s.toneMapping),h.layers.enableAll(),_.unshift(h,h.geometry,h.material,0,0,null)):x&&x.isTexture&&(c===void 0&&(c=new ge(new Bi(2,2),new Ke({name:"BackgroundMaterial",uniforms:uo(hi.background.uniforms),vertexShader:hi.background.vertexShader,fragmentShader:hi.background.fragmentShader,side:Oi,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(c)),c.material.uniforms.t2D.value=x,c.material.uniforms.backgroundIntensity.value=w.backgroundIntensity,c.material.toneMapped=_e.getTransfer(x.colorSpace)!==Re,x.matrixAutoUpdate===!0&&x.updateMatrix(),c.material.uniforms.uvTransform.value.copy(x.matrix),(d!==x||u!==x.version||g!==s.toneMapping)&&(c.material.needsUpdate=!0,d=x,u=x.version,g=s.toneMapping),c.layers.enableAll(),_.unshift(c,c.geometry,c.material,0,0,null))}function m(_,w){_.getRGB(Ir,vu(s)),n.buffers.color.setClear(Ir.r,Ir.g,Ir.b,w,r)}return{getClearColor:function(){return a},setClearColor:function(_,w=1){a.set(_),l=w,m(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(_){l=_,m(a,l)},render:v,addToRenderList:p}}function vg(s,t){const e=s.getParameter(s.MAX_VERTEX_ATTRIBS),n={},i=u(null);let o=i,r=!1;function a(b,T,U,O,z){let B=!1;const F=d(O,U,T);o!==F&&(o=F,c(o.object)),B=g(b,O,U,z),B&&f(b,O,U,z),z!==null&&t.update(z,s.ELEMENT_ARRAY_BUFFER),(B||r)&&(r=!1,x(b,T,U,O),z!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,t.get(z).buffer))}function l(){return s.createVertexArray()}function c(b){return s.bindVertexArray(b)}function h(b){return s.deleteVertexArray(b)}function d(b,T,U){const O=U.wireframe===!0;let z=n[b.id];z===void 0&&(z={},n[b.id]=z);let B=z[T.id];B===void 0&&(B={},z[T.id]=B);let F=B[O];return F===void 0&&(F=u(l()),B[O]=F),F}function u(b){const T=[],U=[],O=[];for(let z=0;z<e;z++)T[z]=0,U[z]=0,O[z]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:T,enabledAttributes:U,attributeDivisors:O,object:b,attributes:{},index:null}}function g(b,T,U,O){const z=o.attributes,B=T.attributes;let F=0;const L=U.getAttributes();for(const H in L)if(L[H].location>=0){const N=z[H];let $=B[H];if($===void 0&&(H==="instanceMatrix"&&b.instanceMatrix&&($=b.instanceMatrix),H==="instanceColor"&&b.instanceColor&&($=b.instanceColor)),N===void 0||N.attribute!==$||$&&N.data!==$.data)return!0;F++}return o.attributesNum!==F||o.index!==O}function f(b,T,U,O){const z={},B=T.attributes;let F=0;const L=U.getAttributes();for(const H in L)if(L[H].location>=0){let N=B[H];N===void 0&&(H==="instanceMatrix"&&b.instanceMatrix&&(N=b.instanceMatrix),H==="instanceColor"&&b.instanceColor&&(N=b.instanceColor));const $={};$.attribute=N,N&&N.data&&($.data=N.data),z[H]=$,F++}o.attributes=z,o.attributesNum=F,o.index=O}function v(){const b=o.newAttributes;for(let T=0,U=b.length;T<U;T++)b[T]=0}function p(b){m(b,0)}function m(b,T){const U=o.newAttributes,O=o.enabledAttributes,z=o.attributeDivisors;U[b]=1,O[b]===0&&(s.enableVertexAttribArray(b),O[b]=1),z[b]!==T&&(s.vertexAttribDivisor(b,T),z[b]=T)}function _(){const b=o.newAttributes,T=o.enabledAttributes;for(let U=0,O=T.length;U<O;U++)T[U]!==b[U]&&(s.disableVertexAttribArray(U),T[U]=0)}function w(b,T,U,O,z,B,F){F===!0?s.vertexAttribIPointer(b,T,U,z,B):s.vertexAttribPointer(b,T,U,O,z,B)}function x(b,T,U,O){v();const z=O.attributes,B=U.getAttributes(),F=T.defaultAttributeValues;for(const L in B){const H=B[L];if(H.location>=0){let G=z[L];if(G===void 0&&(L==="instanceMatrix"&&b.instanceMatrix&&(G=b.instanceMatrix),L==="instanceColor"&&b.instanceColor&&(G=b.instanceColor)),G!==void 0){const N=G.normalized,$=G.itemSize,V=t.get(G);if(V===void 0)continue;const tt=V.buffer,W=V.type,q=V.bytesPerElement,X=W===s.INT||W===s.UNSIGNED_INT||G.gpuType===fc;if(G.isInterleavedBufferAttribute){const it=G.data,lt=it.stride,ft=G.offset;if(it.isInstancedInterleavedBuffer){for(let K=0;K<H.locationSize;K++)m(H.location+K,it.meshPerAttribute);b.isInstancedMesh!==!0&&O._maxInstanceCount===void 0&&(O._maxInstanceCount=it.meshPerAttribute*it.count)}else for(let K=0;K<H.locationSize;K++)p(H.location+K);s.bindBuffer(s.ARRAY_BUFFER,tt);for(let K=0;K<H.locationSize;K++)w(H.location+K,$/H.locationSize,W,N,lt*q,(ft+$/H.locationSize*K)*q,X)}else{if(G.isInstancedBufferAttribute){for(let it=0;it<H.locationSize;it++)m(H.location+it,G.meshPerAttribute);b.isInstancedMesh!==!0&&O._maxInstanceCount===void 0&&(O._maxInstanceCount=G.meshPerAttribute*G.count)}else for(let it=0;it<H.locationSize;it++)p(H.location+it);s.bindBuffer(s.ARRAY_BUFFER,tt);for(let it=0;it<H.locationSize;it++)w(H.location+it,$/H.locationSize,W,N,$*q,$/H.locationSize*it*q,X)}}else if(F!==void 0){const N=F[L];if(N!==void 0)switch(N.length){case 2:s.vertexAttrib2fv(H.location,N);break;case 3:s.vertexAttrib3fv(H.location,N);break;case 4:s.vertexAttrib4fv(H.location,N);break;default:s.vertexAttrib1fv(H.location,N)}}}}_()}function A(){E();for(const b in n){const T=n[b];for(const U in T){const O=T[U];for(const z in O)h(O[z].object),delete O[z];delete T[U]}delete n[b]}}function M(b){if(n[b.id]===void 0)return;const T=n[b.id];for(const U in T){const O=T[U];for(const z in O)h(O[z].object),delete O[z];delete T[U]}delete n[b.id]}function S(b){for(const T in n){const U=n[T];if(U[b.id]===void 0)continue;const O=U[b.id];for(const z in O)h(O[z].object),delete O[z];delete U[b.id]}}function E(){y(),r=!0,o!==i&&(o=i,c(o.object))}function y(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:a,reset:E,resetDefaultState:y,dispose:A,releaseStatesOfGeometry:M,releaseStatesOfProgram:S,initAttributes:v,enableAttribute:p,disableUnusedAttributes:_}}function xg(s,t,e){let n;function i(c){n=c}function o(c,h){s.drawArrays(n,c,h),e.update(h,n,1)}function r(c,h,d){d!==0&&(s.drawArraysInstanced(n,c,h,d),e.update(h,n,d))}function a(c,h,d){if(d===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,h,0,d);let g=0;for(let f=0;f<d;f++)g+=h[f];e.update(g,n,1)}function l(c,h,d,u){if(d===0)return;const g=t.get("WEBGL_multi_draw");if(g===null)for(let f=0;f<c.length;f++)r(c[f],h[f],u[f]);else{g.multiDrawArraysInstancedWEBGL(n,c,0,h,0,u,0,d);let f=0;for(let v=0;v<d;v++)f+=h[v]*u[v];e.update(f,n,1)}}this.setMode=i,this.render=o,this.renderInstances=r,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function _g(s,t,e,n){let i;function o(){if(i!==void 0)return i;if(t.has("EXT_texture_filter_anisotropic")===!0){const S=t.get("EXT_texture_filter_anisotropic");i=s.getParameter(S.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function r(S){return!(S!==En&&n.convert(S)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(S){const E=S===si&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(S!==qn&&n.convert(S)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE)&&S!==Xn&&!E)}function l(S){if(S==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";S="mediump"}return S==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp";const h=l(c);h!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const d=e.logarithmicDepthBuffer===!0,u=e.reverseDepthBuffer===!0&&t.has("EXT_clip_control"),g=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),f=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),v=s.getParameter(s.MAX_TEXTURE_SIZE),p=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),m=s.getParameter(s.MAX_VERTEX_ATTRIBS),_=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),w=s.getParameter(s.MAX_VARYING_VECTORS),x=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),A=f>0,M=s.getParameter(s.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:o,getMaxPrecision:l,textureFormatReadable:r,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:d,reverseDepthBuffer:u,maxTextures:g,maxVertexTextures:f,maxTextureSize:v,maxCubemapSize:p,maxAttributes:m,maxVertexUniforms:_,maxVaryings:w,maxFragmentUniforms:x,vertexTextures:A,maxSamples:M}}function wg(s){const t=this;let e=null,n=0,i=!1,o=!1;const r=new vs,a=new pe,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){const g=d.length!==0||u||n!==0||i;return i=u,n=d.length,g},this.beginShadows=function(){o=!0,h(null)},this.endShadows=function(){o=!1},this.setGlobalState=function(d,u){e=h(d,u,0)},this.setState=function(d,u,g){const f=d.clippingPlanes,v=d.clipIntersection,p=d.clipShadows,m=s.get(d);if(!i||f===null||f.length===0||o&&!p)o?h(null):c();else{const _=o?0:n,w=_*4;let x=m.clippingState||null;l.value=x,x=h(f,u,w,g);for(let A=0;A!==w;++A)x[A]=e[A];m.clippingState=x,this.numIntersection=v?this.numPlanes:0,this.numPlanes+=_}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(d,u,g,f){const v=d!==null?d.length:0;let p=null;if(v!==0){if(p=l.value,f!==!0||p===null){const m=g+v*4,_=u.matrixWorldInverse;a.getNormalMatrix(_),(p===null||p.length<m)&&(p=new Float32Array(m));for(let w=0,x=g;w!==v;++w,x+=4)r.copy(d[w]).applyMatrix4(_,a),r.normal.toArray(p,x),p[x+3]=r.constant}l.value=p,l.needsUpdate=!0}return t.numPlanes=v,t.numIntersection=0,p}}function yg(s){let t=new WeakMap;function e(r,a){return a===Tl?r.mapping=ro:a===Cl&&(r.mapping=ao),r}function n(r){if(r&&r.isTexture){const a=r.mapping;if(a===Tl||a===Cl)if(t.has(r)){const l=t.get(r).texture;return e(l,r.mapping)}else{const l=r.image;if(l&&l.height>0){const c=new Df(l.height);return c.fromEquirectangularTexture(s,r),t.set(r,c),r.addEventListener("dispose",i),e(c.texture,r.mapping)}else return null}}return r}function i(r){const a=r.target;a.removeEventListener("dispose",i);const l=t.get(a);l!==void 0&&(t.delete(a),l.dispose())}function o(){t=new WeakMap}return{get:n,dispose:o}}class lr extends xu{constructor(t=-1,e=1,n=1,i=-1,o=.1,r=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=i,this.near=o,this.far=r,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,i,o,r){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=o,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let o=n-t,r=n+t,a=i+e,l=i-e;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;o+=c*this.view.offsetX,r=o+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(o,r,a,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}const Js=4,Sh=[.125,.215,.35,.446,.526,.582],ws=20,Ha=new lr,bh=new Gt;let Ga=null,Va=0,Wa=0,Xa=!1;const xs=(1+Math.sqrt(5))/2,Ws=1/xs,Eh=[new C(-xs,Ws,0),new C(xs,Ws,0),new C(-Ws,0,xs),new C(Ws,0,xs),new C(0,xs,-Ws),new C(0,xs,Ws),new C(-1,1,-1),new C(1,1,-1),new C(-1,1,1),new C(1,1,1)];class nc{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,n=.1,i=100){Ga=this._renderer.getRenderTarget(),Va=this._renderer.getActiveCubeFace(),Wa=this._renderer.getActiveMipmapLevel(),Xa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const o=this._allocateTargets();return o.depthBuffer=!0,this._sceneToCubeUV(t,n,i,o),e>0&&this._blur(o,0,0,e),this._applyPMREM(o),this._cleanup(o),o}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Ch(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Th(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(Ga,Va,Wa),this._renderer.xr.enabled=Xa,t.scissorTest=!1,zr(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===ro||t.mapping===ao?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Ga=this._renderer.getRenderTarget(),Va=this._renderer.getActiveCubeFace(),Wa=this._renderer.getActiveMipmapLevel(),Xa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:Ae,minFilter:Ae,generateMipmaps:!1,type:si,format:En,colorSpace:Cs,depthBuffer:!1},i=Ah(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Ah(t,e,n);const{_lodMax:o}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Mg(o)),this._blurMaterial=Sg(o,t,e)}return i}_compileMaterial(t){const e=new ge(this._lodPlanes[0],t);this._renderer.compile(e,Ha)}_sceneToCubeUV(t,e,n,i){const a=new Wn(90,1,e,n),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],h=this._renderer,d=h.autoClear,u=h.toneMapping;h.getClearColor(bh),h.toneMapping=Ni,h.autoClear=!1;const g=new _c({name:"PMREM.Background",side:An,depthWrite:!1,depthTest:!1}),f=new ge(new Ht,g);let v=!1;const p=t.background;p?p.isColor&&(g.color.copy(p),t.background=null,v=!0):(g.color.copy(bh),v=!0);for(let m=0;m<6;m++){const _=m%3;_===0?(a.up.set(0,l[m],0),a.lookAt(c[m],0,0)):_===1?(a.up.set(0,0,l[m]),a.lookAt(0,c[m],0)):(a.up.set(0,l[m],0),a.lookAt(0,0,c[m]));const w=this._cubeSize;zr(i,_*w,m>2?w:0,w,w),h.setRenderTarget(i),v&&h.render(f,a),h.render(t,a)}f.geometry.dispose(),f.material.dispose(),h.toneMapping=u,h.autoClear=d,t.background=p}_textureToCubeUV(t,e){const n=this._renderer,i=t.mapping===ro||t.mapping===ao;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=Ch()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Th());const o=i?this._cubemapMaterial:this._equirectMaterial,r=new ge(this._lodPlanes[0],o),a=o.uniforms;a.envMap.value=t;const l=this._cubeSize;zr(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(r,Ha)}_applyPMREM(t){const e=this._renderer,n=e.autoClear;e.autoClear=!1;const i=this._lodPlanes.length;for(let o=1;o<i;o++){const r=Math.sqrt(this._sigmas[o]*this._sigmas[o]-this._sigmas[o-1]*this._sigmas[o-1]),a=Eh[(i-o-1)%Eh.length];this._blur(t,o-1,o,r,a)}e.autoClear=n}_blur(t,e,n,i,o){const r=this._pingPongRenderTarget;this._halfBlur(t,r,e,n,i,"latitudinal",o),this._halfBlur(r,t,n,n,i,"longitudinal",o)}_halfBlur(t,e,n,i,o,r,a){const l=this._renderer,c=this._blurMaterial;r!=="latitudinal"&&r!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,d=new ge(this._lodPlanes[i],c),u=c.uniforms,g=this._sizeLods[n]-1,f=isFinite(o)?Math.PI/(2*g):2*Math.PI/(2*ws-1),v=o/f,p=isFinite(o)?1+Math.floor(h*v):ws;p>ws&&console.warn(`sigmaRadians, ${o}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${ws}`);const m=[];let _=0;for(let S=0;S<ws;++S){const E=S/v,y=Math.exp(-E*E/2);m.push(y),S===0?_+=y:S<p&&(_+=2*y)}for(let S=0;S<m.length;S++)m[S]=m[S]/_;u.envMap.value=t.texture,u.samples.value=p,u.weights.value=m,u.latitudinal.value=r==="latitudinal",a&&(u.poleAxis.value=a);const{_lodMax:w}=this;u.dTheta.value=f,u.mipInt.value=w-n;const x=this._sizeLods[i],A=3*x*(i>w-Js?i-w+Js:0),M=4*(this._cubeSize-x);zr(e,A,M,3*x,2*x),l.setRenderTarget(e),l.render(d,Ha)}}function Mg(s){const t=[],e=[],n=[];let i=s;const o=s-Js+1+Sh.length;for(let r=0;r<o;r++){const a=Math.pow(2,i);e.push(a);let l=1/a;r>s-Js?l=Sh[r-s+Js-1]:r===0&&(l=0),n.push(l);const c=1/(a-2),h=-c,d=1+c,u=[h,h,d,h,d,d,h,h,d,d,h,d],g=6,f=6,v=3,p=2,m=1,_=new Float32Array(v*f*g),w=new Float32Array(p*f*g),x=new Float32Array(m*f*g);for(let M=0;M<g;M++){const S=M%3*2/3-1,E=M>2?0:-1,y=[S,E,0,S+2/3,E,0,S+2/3,E+1,0,S,E,0,S+2/3,E+1,0,S,E+1,0];_.set(y,v*f*M),w.set(u,p*f*M);const b=[M,M,M,M,M,M];x.set(b,m*f*M)}const A=new oe;A.setAttribute("position",new ye(_,v)),A.setAttribute("uv",new ye(w,p)),A.setAttribute("faceIndex",new ye(x,m)),t.push(A),i>Js&&i--}return{lodPlanes:t,sizeLods:e,sigmas:n}}function Ah(s,t,e){const n=new Un(s,t,e);return n.texture.mapping=ha,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function zr(s,t,e,n,i){s.viewport.set(t,e,n,i),s.scissor.set(t,e,n,i)}function Sg(s,t,e){const n=new Float32Array(ws),i=new C(0,1,0);return new Ke({name:"SphericalGaussianBlur",defines:{n:ws,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:wc(),fragmentShader:`

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
		`,blending:ts,depthTest:!1,depthWrite:!1})}function Th(){return new Ke({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:wc(),fragmentShader:`

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
		`,blending:ts,depthTest:!1,depthWrite:!1})}function Ch(){return new Ke({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:wc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:ts,depthTest:!1,depthWrite:!1})}function wc(){return`

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
	`}function bg(s){let t=new WeakMap,e=null;function n(a){if(a&&a.isTexture){const l=a.mapping,c=l===Tl||l===Cl,h=l===ro||l===ao;if(c||h){let d=t.get(a);const u=d!==void 0?d.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==u)return e===null&&(e=new nc(s)),d=c?e.fromEquirectangular(a,d):e.fromCubemap(a,d),d.texture.pmremVersion=a.pmremVersion,t.set(a,d),d.texture;if(d!==void 0)return d.texture;{const g=a.image;return c&&g&&g.height>0||h&&g&&i(g)?(e===null&&(e=new nc(s)),d=c?e.fromEquirectangular(a):e.fromCubemap(a),d.texture.pmremVersion=a.pmremVersion,t.set(a,d),a.addEventListener("dispose",o),d.texture):null}}}return a}function i(a){let l=0;const c=6;for(let h=0;h<c;h++)a[h]!==void 0&&l++;return l===c}function o(a){const l=a.target;l.removeEventListener("dispose",o);const c=t.get(l);c!==void 0&&(t.delete(l),c.dispose())}function r(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:n,dispose:r}}function Eg(s){const t={};function e(n){if(t[n]!==void 0)return t[n];let i;switch(n){case"WEBGL_depth_texture":i=s.getExtension("WEBGL_depth_texture")||s.getExtension("MOZ_WEBGL_depth_texture")||s.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":i=s.getExtension("EXT_texture_filter_anisotropic")||s.getExtension("MOZ_EXT_texture_filter_anisotropic")||s.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":i=s.getExtension("WEBGL_compressed_texture_s3tc")||s.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":i=s.getExtension("WEBGL_compressed_texture_pvrtc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:i=s.getExtension(n)}return t[n]=i,i}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){const i=e(n);return i===null&&Xo("THREE.WebGLRenderer: "+n+" extension not supported."),i}}}function Ag(s,t,e,n){const i={},o=new WeakMap;function r(d){const u=d.target;u.index!==null&&t.remove(u.index);for(const f in u.attributes)t.remove(u.attributes[f]);for(const f in u.morphAttributes){const v=u.morphAttributes[f];for(let p=0,m=v.length;p<m;p++)t.remove(v[p])}u.removeEventListener("dispose",r),delete i[u.id];const g=o.get(u);g&&(t.remove(g),o.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function a(d,u){return i[u.id]===!0||(u.addEventListener("dispose",r),i[u.id]=!0,e.memory.geometries++),u}function l(d){const u=d.attributes;for(const f in u)t.update(u[f],s.ARRAY_BUFFER);const g=d.morphAttributes;for(const f in g){const v=g[f];for(let p=0,m=v.length;p<m;p++)t.update(v[p],s.ARRAY_BUFFER)}}function c(d){const u=[],g=d.index,f=d.attributes.position;let v=0;if(g!==null){const _=g.array;v=g.version;for(let w=0,x=_.length;w<x;w+=3){const A=_[w+0],M=_[w+1],S=_[w+2];u.push(A,M,M,S,S,A)}}else if(f!==void 0){const _=f.array;v=f.version;for(let w=0,x=_.length/3-1;w<x;w+=3){const A=w+0,M=w+1,S=w+2;u.push(A,M,M,S,S,A)}}else return;const p=new(lu(u)?gu:mu)(u,1);p.version=v;const m=o.get(d);m&&t.remove(m),o.set(d,p)}function h(d){const u=o.get(d);if(u){const g=d.index;g!==null&&u.version<g.version&&c(d)}else c(d);return o.get(d)}return{get:a,update:l,getWireframeAttribute:h}}function Tg(s,t,e){let n;function i(u){n=u}let o,r;function a(u){o=u.type,r=u.bytesPerElement}function l(u,g){s.drawElements(n,g,o,u*r),e.update(g,n,1)}function c(u,g,f){f!==0&&(s.drawElementsInstanced(n,g,o,u*r,f),e.update(g,n,f))}function h(u,g,f){if(f===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,g,0,o,u,0,f);let p=0;for(let m=0;m<f;m++)p+=g[m];e.update(p,n,1)}function d(u,g,f,v){if(f===0)return;const p=t.get("WEBGL_multi_draw");if(p===null)for(let m=0;m<u.length;m++)c(u[m]/r,g[m],v[m]);else{p.multiDrawElementsInstancedWEBGL(n,g,0,o,u,0,v,0,f);let m=0;for(let _=0;_<f;_++)m+=g[_]*v[_];e.update(m,n,1)}}this.setMode=i,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h,this.renderMultiDrawInstances=d}function Cg(s){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(o,r,a){switch(e.calls++,r){case s.TRIANGLES:e.triangles+=a*(o/3);break;case s.LINES:e.lines+=a*(o/2);break;case s.LINE_STRIP:e.lines+=a*(o-1);break;case s.LINE_LOOP:e.lines+=a*o;break;case s.POINTS:e.points+=a*o;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",r);break}}function i(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:i,update:n}}function Rg(s,t,e){const n=new WeakMap,i=new ke;function o(r,a,l){const c=r.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,d=h!==void 0?h.length:0;let u=n.get(a);if(u===void 0||u.count!==d){let b=function(){E.dispose(),n.delete(a),a.removeEventListener("dispose",b)};var g=b;u!==void 0&&u.texture.dispose();const f=a.morphAttributes.position!==void 0,v=a.morphAttributes.normal!==void 0,p=a.morphAttributes.color!==void 0,m=a.morphAttributes.position||[],_=a.morphAttributes.normal||[],w=a.morphAttributes.color||[];let x=0;f===!0&&(x=1),v===!0&&(x=2),p===!0&&(x=3);let A=a.attributes.position.count*x,M=1;A>t.maxTextureSize&&(M=Math.ceil(A/t.maxTextureSize),A=t.maxTextureSize);const S=new Float32Array(A*M*4*d),E=new hu(S,A,M,d);E.type=Xn,E.needsUpdate=!0;const y=x*4;for(let T=0;T<d;T++){const U=m[T],O=_[T],z=w[T],B=A*M*4*T;for(let F=0;F<U.count;F++){const L=F*y;f===!0&&(i.fromBufferAttribute(U,F),S[B+L+0]=i.x,S[B+L+1]=i.y,S[B+L+2]=i.z,S[B+L+3]=0),v===!0&&(i.fromBufferAttribute(O,F),S[B+L+4]=i.x,S[B+L+5]=i.y,S[B+L+6]=i.z,S[B+L+7]=0),p===!0&&(i.fromBufferAttribute(z,F),S[B+L+8]=i.x,S[B+L+9]=i.y,S[B+L+10]=i.z,S[B+L+11]=z.itemSize===4?i.w:1)}}u={count:d,texture:E,size:new Pt(A,M)},n.set(a,u),a.addEventListener("dispose",b)}if(r.isInstancedMesh===!0&&r.morphTexture!==null)l.getUniforms().setValue(s,"morphTexture",r.morphTexture,e);else{let f=0;for(let p=0;p<c.length;p++)f+=c[p];const v=a.morphTargetsRelative?1:1-f;l.getUniforms().setValue(s,"morphTargetBaseInfluence",v),l.getUniforms().setValue(s,"morphTargetInfluences",c)}l.getUniforms().setValue(s,"morphTargetsTexture",u.texture,e),l.getUniforms().setValue(s,"morphTargetsTextureSize",u.size)}return{update:o}}function Pg(s,t,e,n){let i=new WeakMap;function o(l){const c=n.render.frame,h=l.geometry,d=t.get(l,h);if(i.get(d)!==c&&(t.update(d),i.set(d,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),i.get(l)!==c&&(e.update(l.instanceMatrix,s.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,s.ARRAY_BUFFER),i.set(l,c))),l.isSkinnedMesh){const u=l.skeleton;i.get(u)!==c&&(u.update(),i.set(u,c))}return d}function r(){i=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),e.remove(c.instanceMatrix),c.instanceColor!==null&&e.remove(c.instanceColor)}return{update:o,dispose:r}}class yc extends Tn{constructor(t,e,n,i,o,r,a,l,c,h=no){if(h!==no&&h!==ho)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&h===no&&(n=ki),n===void 0&&h===ho&&(n=co),super(null,i,o,r,a,l,h,n,c),this.isDepthTexture=!0,this.image={width:t,height:e},this.magFilter=a!==void 0?a:Dn,this.minFilter=l!==void 0?l:Dn,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}const yu=new Tn,Rh=new yc(1,1),Mu=new hu,Su=new uu,bu=new _u,Ph=[],Lh=[],Dh=new Float32Array(16),Ih=new Float32Array(9),zh=new Float32Array(4);function yo(s,t,e){const n=s[0];if(n<=0||n>0)return s;const i=t*e;let o=Ph[i];if(o===void 0&&(o=new Float32Array(i),Ph[i]=o),t!==0){n.toArray(o,0);for(let r=1,a=0;r!==t;++r)a+=e,s[r].toArray(o,a)}return o}function en(s,t){if(s.length!==t.length)return!1;for(let e=0,n=s.length;e<n;e++)if(s[e]!==t[e])return!1;return!0}function nn(s,t){for(let e=0,n=t.length;e<n;e++)s[e]=t[e]}function fa(s,t){let e=Lh[t];e===void 0&&(e=new Int32Array(t),Lh[t]=e);for(let n=0;n!==t;++n)e[n]=s.allocateTextureUnit();return e}function Lg(s,t){const e=this.cache;e[0]!==t&&(s.uniform1f(this.addr,t),e[0]=t)}function Dg(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(en(e,t))return;s.uniform2fv(this.addr,t),nn(e,t)}}function Ig(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(s.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(en(e,t))return;s.uniform3fv(this.addr,t),nn(e,t)}}function zg(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(en(e,t))return;s.uniform4fv(this.addr,t),nn(e,t)}}function Ng(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(en(e,t))return;s.uniformMatrix2fv(this.addr,!1,t),nn(e,t)}else{if(en(e,n))return;zh.set(n),s.uniformMatrix2fv(this.addr,!1,zh),nn(e,n)}}function Ug(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(en(e,t))return;s.uniformMatrix3fv(this.addr,!1,t),nn(e,t)}else{if(en(e,n))return;Ih.set(n),s.uniformMatrix3fv(this.addr,!1,Ih),nn(e,n)}}function Fg(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(en(e,t))return;s.uniformMatrix4fv(this.addr,!1,t),nn(e,t)}else{if(en(e,n))return;Dh.set(n),s.uniformMatrix4fv(this.addr,!1,Dh),nn(e,n)}}function Og(s,t){const e=this.cache;e[0]!==t&&(s.uniform1i(this.addr,t),e[0]=t)}function kg(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(en(e,t))return;s.uniform2iv(this.addr,t),nn(e,t)}}function Bg(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(en(e,t))return;s.uniform3iv(this.addr,t),nn(e,t)}}function Hg(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(en(e,t))return;s.uniform4iv(this.addr,t),nn(e,t)}}function Gg(s,t){const e=this.cache;e[0]!==t&&(s.uniform1ui(this.addr,t),e[0]=t)}function Vg(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(en(e,t))return;s.uniform2uiv(this.addr,t),nn(e,t)}}function Wg(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(en(e,t))return;s.uniform3uiv(this.addr,t),nn(e,t)}}function Xg(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(en(e,t))return;s.uniform4uiv(this.addr,t),nn(e,t)}}function qg(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);let o;this.type===s.SAMPLER_2D_SHADOW?(Rh.compareFunction=au,o=Rh):o=yu,e.setTexture2D(t||o,i)}function Yg(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTexture3D(t||Su,i)}function $g(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTextureCube(t||bu,i)}function jg(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTexture2DArray(t||Mu,i)}function Zg(s){switch(s){case 5126:return Lg;case 35664:return Dg;case 35665:return Ig;case 35666:return zg;case 35674:return Ng;case 35675:return Ug;case 35676:return Fg;case 5124:case 35670:return Og;case 35667:case 35671:return kg;case 35668:case 35672:return Bg;case 35669:case 35673:return Hg;case 5125:return Gg;case 36294:return Vg;case 36295:return Wg;case 36296:return Xg;case 35678:case 36198:case 36298:case 36306:case 35682:return qg;case 35679:case 36299:case 36307:return Yg;case 35680:case 36300:case 36308:case 36293:return $g;case 36289:case 36303:case 36311:case 36292:return jg}}function Kg(s,t){s.uniform1fv(this.addr,t)}function Jg(s,t){const e=yo(t,this.size,2);s.uniform2fv(this.addr,e)}function Qg(s,t){const e=yo(t,this.size,3);s.uniform3fv(this.addr,e)}function t1(s,t){const e=yo(t,this.size,4);s.uniform4fv(this.addr,e)}function e1(s,t){const e=yo(t,this.size,4);s.uniformMatrix2fv(this.addr,!1,e)}function n1(s,t){const e=yo(t,this.size,9);s.uniformMatrix3fv(this.addr,!1,e)}function i1(s,t){const e=yo(t,this.size,16);s.uniformMatrix4fv(this.addr,!1,e)}function s1(s,t){s.uniform1iv(this.addr,t)}function o1(s,t){s.uniform2iv(this.addr,t)}function r1(s,t){s.uniform3iv(this.addr,t)}function a1(s,t){s.uniform4iv(this.addr,t)}function l1(s,t){s.uniform1uiv(this.addr,t)}function c1(s,t){s.uniform2uiv(this.addr,t)}function h1(s,t){s.uniform3uiv(this.addr,t)}function u1(s,t){s.uniform4uiv(this.addr,t)}function d1(s,t,e){const n=this.cache,i=t.length,o=fa(e,i);en(n,o)||(s.uniform1iv(this.addr,o),nn(n,o));for(let r=0;r!==i;++r)e.setTexture2D(t[r]||yu,o[r])}function f1(s,t,e){const n=this.cache,i=t.length,o=fa(e,i);en(n,o)||(s.uniform1iv(this.addr,o),nn(n,o));for(let r=0;r!==i;++r)e.setTexture3D(t[r]||Su,o[r])}function p1(s,t,e){const n=this.cache,i=t.length,o=fa(e,i);en(n,o)||(s.uniform1iv(this.addr,o),nn(n,o));for(let r=0;r!==i;++r)e.setTextureCube(t[r]||bu,o[r])}function m1(s,t,e){const n=this.cache,i=t.length,o=fa(e,i);en(n,o)||(s.uniform1iv(this.addr,o),nn(n,o));for(let r=0;r!==i;++r)e.setTexture2DArray(t[r]||Mu,o[r])}function g1(s){switch(s){case 5126:return Kg;case 35664:return Jg;case 35665:return Qg;case 35666:return t1;case 35674:return e1;case 35675:return n1;case 35676:return i1;case 5124:case 35670:return s1;case 35667:case 35671:return o1;case 35668:case 35672:return r1;case 35669:case 35673:return a1;case 5125:return l1;case 36294:return c1;case 36295:return h1;case 36296:return u1;case 35678:case 36198:case 36298:case 36306:case 35682:return d1;case 35679:case 36299:case 36307:return f1;case 35680:case 36300:case 36308:case 36293:return p1;case 36289:case 36303:case 36311:case 36292:return m1}}class v1{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=Zg(e.type)}}class x1{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=g1(e.type)}}class _1{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){const i=this.seq;for(let o=0,r=i.length;o!==r;++o){const a=i[o];a.setValue(t,e[a.id],n)}}}const qa=/(\w+)(\])?(\[|\.)?/g;function Nh(s,t){s.seq.push(t),s.map[t.id]=t}function w1(s,t,e){const n=s.name,i=n.length;for(qa.lastIndex=0;;){const o=qa.exec(n),r=qa.lastIndex;let a=o[1];const l=o[2]==="]",c=o[3];if(l&&(a=a|0),c===void 0||c==="["&&r+2===i){Nh(e,c===void 0?new v1(a,s,t):new x1(a,s,t));break}else{let d=e.map[a];d===void 0&&(d=new _1(a),Nh(e,d)),e=d}}}class Qr{constructor(t,e){this.seq=[],this.map={};const n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let i=0;i<n;++i){const o=t.getActiveUniform(e,i),r=t.getUniformLocation(e,o.name);w1(o,r,this)}}setValue(t,e,n,i){const o=this.map[e];o!==void 0&&o.setValue(t,n,i)}setOptional(t,e,n){const i=e[n];i!==void 0&&this.setValue(t,n,i)}static upload(t,e,n,i){for(let o=0,r=e.length;o!==r;++o){const a=e[o],l=n[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,i)}}static seqWithValue(t,e){const n=[];for(let i=0,o=t.length;i!==o;++i){const r=t[i];r.id in e&&n.push(r)}return n}}function Uh(s,t,e){const n=s.createShader(t);return s.shaderSource(n,e),s.compileShader(n),n}const y1=37297;let M1=0;function S1(s,t){const e=s.split(`
`),n=[],i=Math.max(t-6,0),o=Math.min(t+6,e.length);for(let r=i;r<o;r++){const a=r+1;n.push(`${a===t?">":" "} ${a}: ${e[r]}`)}return n.join(`
`)}const Fh=new pe;function b1(s){_e._getMatrix(Fh,_e.workingColorSpace,s);const t=`mat3( ${Fh.elements.map(e=>e.toFixed(4))} )`;switch(_e.getTransfer(s)){case da:return[t,"LinearTransferOETF"];case Re:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",s),[t,"LinearTransferOETF"]}}function Oh(s,t,e){const n=s.getShaderParameter(t,s.COMPILE_STATUS),i=s.getShaderInfoLog(t).trim();if(n&&i==="")return"";const o=/ERROR: 0:(\d+)/.exec(i);if(o){const r=parseInt(o[1]);return e.toUpperCase()+`

`+i+`

`+S1(s.getShaderSource(t),r)}else return i}function E1(s,t){const e=b1(t);return[`vec4 ${s}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}function A1(s,t){let e;switch(t){case Ed:e="Linear";break;case Ad:e="Reinhard";break;case Td:e="Cineon";break;case Cd:e="ACESFilmic";break;case Pd:e="AgX";break;case Ld:e="Neutral";break;case Rd:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+s+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const Nr=new C;function T1(){_e.getLuminanceCoefficients(Nr);const s=Nr.x.toFixed(4),t=Nr.y.toFixed(4),e=Nr.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function C1(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(qo).join(`
`)}function R1(s){const t=[];for(const e in s){const n=s[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function P1(s,t){const e={},n=s.getProgramParameter(t,s.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const o=s.getActiveAttrib(t,i),r=o.name;let a=1;o.type===s.FLOAT_MAT2&&(a=2),o.type===s.FLOAT_MAT3&&(a=3),o.type===s.FLOAT_MAT4&&(a=4),e[r]={type:o.type,location:s.getAttribLocation(t,r),locationSize:a}}return e}function qo(s){return s!==""}function kh(s,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return s.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function Bh(s,t){return s.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const L1=/^[ \t]*#include +<([\w\d./]+)>/gm;function ic(s){return s.replace(L1,I1)}const D1=new Map;function I1(s,t){let e=he[t];if(e===void 0){const n=D1.get(t);if(n!==void 0)e=he[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("Can not resolve #include <"+t+">")}return ic(e)}const z1=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Hh(s){return s.replace(z1,N1)}function N1(s,t,e,n){let i="";for(let o=parseInt(t);o<parseInt(e);o++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+o+" ]").replace(/UNROLLED_LOOP_INDEX/g,o);return i}function Gh(s){let t=`precision ${s.precision} float;
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
#define LOW_PRECISION`),t}function U1(s){let t="SHADOWMAP_TYPE_BASIC";return s.shadowMapType===q0?t="SHADOWMAP_TYPE_PCF":s.shadowMapType===Y0?t="SHADOWMAP_TYPE_PCF_SOFT":s.shadowMapType===Pi&&(t="SHADOWMAP_TYPE_VSM"),t}function F1(s){let t="ENVMAP_TYPE_CUBE";if(s.envMap)switch(s.envMapMode){case ro:case ao:t="ENVMAP_TYPE_CUBE";break;case ha:t="ENVMAP_TYPE_CUBE_UV";break}return t}function O1(s){let t="ENVMAP_MODE_REFLECTION";if(s.envMap)switch(s.envMapMode){case ao:t="ENVMAP_MODE_REFRACTION";break}return t}function k1(s){let t="ENVMAP_BLENDING_NONE";if(s.envMap)switch(s.combine){case $0:t="ENVMAP_BLENDING_MULTIPLY";break;case Sd:t="ENVMAP_BLENDING_MIX";break;case bd:t="ENVMAP_BLENDING_ADD";break}return t}function B1(s){const t=s.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),7*16)),texelHeight:n,maxMip:e}}function H1(s,t,e,n){const i=s.getContext(),o=e.defines;let r=e.vertexShader,a=e.fragmentShader;const l=U1(e),c=F1(e),h=O1(e),d=k1(e),u=B1(e),g=C1(e),f=R1(o),v=i.createProgram();let p,m,_=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,f].filter(qo).join(`
`),p.length>0&&(p+=`
`),m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,f].filter(qo).join(`
`),m.length>0&&(m+=`
`)):(p=[Gh(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,f,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(qo).join(`
`),m=[Gh(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,f,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Ni?"#define TONE_MAPPING":"",e.toneMapping!==Ni?he.tonemapping_pars_fragment:"",e.toneMapping!==Ni?A1("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",he.colorspace_pars_fragment,E1("linearToOutputTexel",e.outputColorSpace),T1(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(qo).join(`
`)),r=ic(r),r=kh(r,e),r=Bh(r,e),a=ic(a),a=kh(a,e),a=Bh(a,e),r=Hh(r),a=Hh(a),e.isRawShaderMaterial!==!0&&(_=`#version 300 es
`,p=[g,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,m=["#define varying in",e.glslVersion===eh?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===eh?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);const w=_+p+r,x=_+m+a,A=Uh(i,i.VERTEX_SHADER,w),M=Uh(i,i.FRAGMENT_SHADER,x);i.attachShader(v,A),i.attachShader(v,M),e.index0AttributeName!==void 0?i.bindAttribLocation(v,0,e.index0AttributeName):e.morphTargets===!0&&i.bindAttribLocation(v,0,"position"),i.linkProgram(v);function S(T){if(s.debug.checkShaderErrors){const U=i.getProgramInfoLog(v).trim(),O=i.getShaderInfoLog(A).trim(),z=i.getShaderInfoLog(M).trim();let B=!0,F=!0;if(i.getProgramParameter(v,i.LINK_STATUS)===!1)if(B=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(i,v,A,M);else{const L=Oh(i,A,"vertex"),H=Oh(i,M,"fragment");console.error("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(v,i.VALIDATE_STATUS)+`

Material Name: `+T.name+`
Material Type: `+T.type+`

Program Info Log: `+U+`
`+L+`
`+H)}else U!==""?console.warn("THREE.WebGLProgram: Program Info Log:",U):(O===""||z==="")&&(F=!1);F&&(T.diagnostics={runnable:B,programLog:U,vertexShader:{log:O,prefix:p},fragmentShader:{log:z,prefix:m}})}i.deleteShader(A),i.deleteShader(M),E=new Qr(i,v),y=P1(i,v)}let E;this.getUniforms=function(){return E===void 0&&S(this),E};let y;this.getAttributes=function(){return y===void 0&&S(this),y};let b=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return b===!1&&(b=i.getProgramParameter(v,y1)),b},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(v),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=M1++,this.cacheKey=t,this.usedTimes=1,this.program=v,this.vertexShader=A,this.fragmentShader=M,this}let G1=0;class V1{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,n=t.fragmentShader,i=this._getShaderStage(e),o=this._getShaderStage(n),r=this._getShaderCacheForMaterial(t);return r.has(i)===!1&&(r.add(i),i.usedTimes++),r.has(o)===!1&&(r.add(o),o.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){const e=this.shaderCache;let n=e.get(t);return n===void 0&&(n=new W1(t),e.set(t,n)),n}}class W1{constructor(t){this.id=G1++,this.code=t,this.usedTimes=0}}function X1(s,t,e,n,i,o,r){const a=new fu,l=new V1,c=new Set,h=[],d=i.logarithmicDepthBuffer,u=i.vertexTextures;let g=i.precision;const f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function v(y){return c.add(y),y===0?"uv":`uv${y}`}function p(y,b,T,U,O){const z=U.fog,B=O.geometry,F=y.isMeshStandardMaterial?U.environment:null,L=(y.isMeshStandardMaterial?e:t).get(y.envMap||F),H=L&&L.mapping===ha?L.image.height:null,G=f[y.type];y.precision!==null&&(g=i.getMaxPrecision(y.precision),g!==y.precision&&console.warn("THREE.WebGLProgram.getParameters:",y.precision,"not supported, using",g,"instead."));const N=B.morphAttributes.position||B.morphAttributes.normal||B.morphAttributes.color,$=N!==void 0?N.length:0;let V=0;B.morphAttributes.position!==void 0&&(V=1),B.morphAttributes.normal!==void 0&&(V=2),B.morphAttributes.color!==void 0&&(V=3);let tt,W,q,X;if(G){const de=hi[G];tt=de.vertexShader,W=de.fragmentShader}else tt=y.vertexShader,W=y.fragmentShader,l.update(y),q=l.getVertexShaderID(y),X=l.getFragmentShaderID(y);const it=s.getRenderTarget(),lt=s.state.buffers.depth.getReversed(),ft=O.isInstancedMesh===!0,K=O.isBatchedMesh===!0,ot=!!y.map,j=!!y.matcap,et=!!L,D=!!y.aoMap,J=!!y.lightMap,Z=!!y.bumpMap,at=!!y.normalMap,ut=!!y.displacementMap,vt=!!y.emissiveMap,dt=!!y.metalnessMap,I=!!y.roughnessMap,R=y.anisotropy>0,Q=y.clearcoat>0,rt=y.dispersion>0,gt=y.iridescence>0,pt=y.sheen>0,zt=y.transmission>0,Mt=R&&!!y.anisotropyMap,Lt=Q&&!!y.clearcoatMap,te=Q&&!!y.clearcoatNormalMap,wt=Q&&!!y.clearcoatRoughnessMap,Ot=gt&&!!y.iridescenceMap,qt=gt&&!!y.iridescenceThicknessMap,Nt=pt&&!!y.sheenColorMap,Ct=pt&&!!y.sheenRoughnessMap,le=!!y.specularMap,Qt=!!y.specularColorMap,Ee=!!y.specularIntensityMap,Y=zt&&!!y.transmissionMap,Dt=zt&&!!y.thicknessMap,mt=!!y.gradientMap,xt=!!y.alphaMap,bt=y.alphaTest>0,At=!!y.alphaHash,ee=!!y.extensions;let ve=Ni;y.toneMapped&&(it===null||it.isXRRenderTarget===!0)&&(ve=s.toneMapping);const Pe={shaderID:G,shaderType:y.type,shaderName:y.name,vertexShader:tt,fragmentShader:W,defines:y.defines,customVertexShaderID:q,customFragmentShaderID:X,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:g,batching:K,batchingColor:K&&O._colorsTexture!==null,instancing:ft,instancingColor:ft&&O.instanceColor!==null,instancingMorph:ft&&O.morphTexture!==null,supportsVertexTextures:u,outputColorSpace:it===null?s.outputColorSpace:it.isXRRenderTarget===!0?it.texture.colorSpace:Cs,alphaToCoverage:!!y.alphaToCoverage,map:ot,matcap:j,envMap:et,envMapMode:et&&L.mapping,envMapCubeUVHeight:H,aoMap:D,lightMap:J,bumpMap:Z,normalMap:at,displacementMap:u&&ut,emissiveMap:vt,normalMapObjectSpace:at&&y.normalMapType===zd,normalMapTangentSpace:at&&y.normalMapType===ru,metalnessMap:dt,roughnessMap:I,anisotropy:R,anisotropyMap:Mt,clearcoat:Q,clearcoatMap:Lt,clearcoatNormalMap:te,clearcoatRoughnessMap:wt,dispersion:rt,iridescence:gt,iridescenceMap:Ot,iridescenceThicknessMap:qt,sheen:pt,sheenColorMap:Nt,sheenRoughnessMap:Ct,specularMap:le,specularColorMap:Qt,specularIntensityMap:Ee,transmission:zt,transmissionMap:Y,thicknessMap:Dt,gradientMap:mt,opaque:y.transparent===!1&&y.blending===zi&&y.alphaToCoverage===!1,alphaMap:xt,alphaTest:bt,alphaHash:At,combine:y.combine,mapUv:ot&&v(y.map.channel),aoMapUv:D&&v(y.aoMap.channel),lightMapUv:J&&v(y.lightMap.channel),bumpMapUv:Z&&v(y.bumpMap.channel),normalMapUv:at&&v(y.normalMap.channel),displacementMapUv:ut&&v(y.displacementMap.channel),emissiveMapUv:vt&&v(y.emissiveMap.channel),metalnessMapUv:dt&&v(y.metalnessMap.channel),roughnessMapUv:I&&v(y.roughnessMap.channel),anisotropyMapUv:Mt&&v(y.anisotropyMap.channel),clearcoatMapUv:Lt&&v(y.clearcoatMap.channel),clearcoatNormalMapUv:te&&v(y.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:wt&&v(y.clearcoatRoughnessMap.channel),iridescenceMapUv:Ot&&v(y.iridescenceMap.channel),iridescenceThicknessMapUv:qt&&v(y.iridescenceThicknessMap.channel),sheenColorMapUv:Nt&&v(y.sheenColorMap.channel),sheenRoughnessMapUv:Ct&&v(y.sheenRoughnessMap.channel),specularMapUv:le&&v(y.specularMap.channel),specularColorMapUv:Qt&&v(y.specularColorMap.channel),specularIntensityMapUv:Ee&&v(y.specularIntensityMap.channel),transmissionMapUv:Y&&v(y.transmissionMap.channel),thicknessMapUv:Dt&&v(y.thicknessMap.channel),alphaMapUv:xt&&v(y.alphaMap.channel),vertexTangents:!!B.attributes.tangent&&(at||R),vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&!!B.attributes.color&&B.attributes.color.itemSize===4,pointsUvs:O.isPoints===!0&&!!B.attributes.uv&&(ot||xt),fog:!!z,useFog:y.fog===!0,fogExp2:!!z&&z.isFogExp2,flatShading:y.flatShading===!0,sizeAttenuation:y.sizeAttenuation===!0,logarithmicDepthBuffer:d,reverseDepthBuffer:lt,skinning:O.isSkinnedMesh===!0,morphTargets:B.morphAttributes.position!==void 0,morphNormals:B.morphAttributes.normal!==void 0,morphColors:B.morphAttributes.color!==void 0,morphTargetsCount:$,morphTextureStride:V,numDirLights:b.directional.length,numPointLights:b.point.length,numSpotLights:b.spot.length,numSpotLightMaps:b.spotLightMap.length,numRectAreaLights:b.rectArea.length,numHemiLights:b.hemi.length,numDirLightShadows:b.directionalShadowMap.length,numPointLightShadows:b.pointShadowMap.length,numSpotLightShadows:b.spotShadowMap.length,numSpotLightShadowsWithMaps:b.numSpotLightShadowsWithMaps,numLightProbes:b.numLightProbes,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:y.dithering,shadowMapEnabled:s.shadowMap.enabled&&T.length>0,shadowMapType:s.shadowMap.type,toneMapping:ve,decodeVideoTexture:ot&&y.map.isVideoTexture===!0&&_e.getTransfer(y.map.colorSpace)===Re,decodeVideoTextureEmissive:vt&&y.emissiveMap.isVideoTexture===!0&&_e.getTransfer(y.emissiveMap.colorSpace)===Re,premultipliedAlpha:y.premultipliedAlpha,doubleSided:y.side===hn,flipSided:y.side===An,useDepthPacking:y.depthPacking>=0,depthPacking:y.depthPacking||0,index0AttributeName:y.index0AttributeName,extensionClipCullDistance:ee&&y.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ee&&y.extensions.multiDraw===!0||K)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:y.customProgramCacheKey()};return Pe.vertexUv1s=c.has(1),Pe.vertexUv2s=c.has(2),Pe.vertexUv3s=c.has(3),c.clear(),Pe}function m(y){const b=[];if(y.shaderID?b.push(y.shaderID):(b.push(y.customVertexShaderID),b.push(y.customFragmentShaderID)),y.defines!==void 0)for(const T in y.defines)b.push(T),b.push(y.defines[T]);return y.isRawShaderMaterial===!1&&(_(b,y),w(b,y),b.push(s.outputColorSpace)),b.push(y.customProgramCacheKey),b.join()}function _(y,b){y.push(b.precision),y.push(b.outputColorSpace),y.push(b.envMapMode),y.push(b.envMapCubeUVHeight),y.push(b.mapUv),y.push(b.alphaMapUv),y.push(b.lightMapUv),y.push(b.aoMapUv),y.push(b.bumpMapUv),y.push(b.normalMapUv),y.push(b.displacementMapUv),y.push(b.emissiveMapUv),y.push(b.metalnessMapUv),y.push(b.roughnessMapUv),y.push(b.anisotropyMapUv),y.push(b.clearcoatMapUv),y.push(b.clearcoatNormalMapUv),y.push(b.clearcoatRoughnessMapUv),y.push(b.iridescenceMapUv),y.push(b.iridescenceThicknessMapUv),y.push(b.sheenColorMapUv),y.push(b.sheenRoughnessMapUv),y.push(b.specularMapUv),y.push(b.specularColorMapUv),y.push(b.specularIntensityMapUv),y.push(b.transmissionMapUv),y.push(b.thicknessMapUv),y.push(b.combine),y.push(b.fogExp2),y.push(b.sizeAttenuation),y.push(b.morphTargetsCount),y.push(b.morphAttributeCount),y.push(b.numDirLights),y.push(b.numPointLights),y.push(b.numSpotLights),y.push(b.numSpotLightMaps),y.push(b.numHemiLights),y.push(b.numRectAreaLights),y.push(b.numDirLightShadows),y.push(b.numPointLightShadows),y.push(b.numSpotLightShadows),y.push(b.numSpotLightShadowsWithMaps),y.push(b.numLightProbes),y.push(b.shadowMapType),y.push(b.toneMapping),y.push(b.numClippingPlanes),y.push(b.numClipIntersection),y.push(b.depthPacking)}function w(y,b){a.disableAll(),b.supportsVertexTextures&&a.enable(0),b.instancing&&a.enable(1),b.instancingColor&&a.enable(2),b.instancingMorph&&a.enable(3),b.matcap&&a.enable(4),b.envMap&&a.enable(5),b.normalMapObjectSpace&&a.enable(6),b.normalMapTangentSpace&&a.enable(7),b.clearcoat&&a.enable(8),b.iridescence&&a.enable(9),b.alphaTest&&a.enable(10),b.vertexColors&&a.enable(11),b.vertexAlphas&&a.enable(12),b.vertexUv1s&&a.enable(13),b.vertexUv2s&&a.enable(14),b.vertexUv3s&&a.enable(15),b.vertexTangents&&a.enable(16),b.anisotropy&&a.enable(17),b.alphaHash&&a.enable(18),b.batching&&a.enable(19),b.dispersion&&a.enable(20),b.batchingColor&&a.enable(21),y.push(a.mask),a.disableAll(),b.fog&&a.enable(0),b.useFog&&a.enable(1),b.flatShading&&a.enable(2),b.logarithmicDepthBuffer&&a.enable(3),b.reverseDepthBuffer&&a.enable(4),b.skinning&&a.enable(5),b.morphTargets&&a.enable(6),b.morphNormals&&a.enable(7),b.morphColors&&a.enable(8),b.premultipliedAlpha&&a.enable(9),b.shadowMapEnabled&&a.enable(10),b.doubleSided&&a.enable(11),b.flipSided&&a.enable(12),b.useDepthPacking&&a.enable(13),b.dithering&&a.enable(14),b.transmission&&a.enable(15),b.sheen&&a.enable(16),b.opaque&&a.enable(17),b.pointsUvs&&a.enable(18),b.decodeVideoTexture&&a.enable(19),b.decodeVideoTextureEmissive&&a.enable(20),b.alphaToCoverage&&a.enable(21),y.push(a.mask)}function x(y){const b=f[y.type];let T;if(b){const U=hi[b];T=Cf.clone(U.uniforms)}else T=y.uniforms;return T}function A(y,b){let T;for(let U=0,O=h.length;U<O;U++){const z=h[U];if(z.cacheKey===b){T=z,++T.usedTimes;break}}return T===void 0&&(T=new H1(s,b,y,o),h.push(T)),T}function M(y){if(--y.usedTimes===0){const b=h.indexOf(y);h[b]=h[h.length-1],h.pop(),y.destroy()}}function S(y){l.remove(y)}function E(){l.dispose()}return{getParameters:p,getProgramCacheKey:m,getUniforms:x,acquireProgram:A,releaseProgram:M,releaseShaderCache:S,programs:h,dispose:E}}function q1(){let s=new WeakMap;function t(r){return s.has(r)}function e(r){let a=s.get(r);return a===void 0&&(a={},s.set(r,a)),a}function n(r){s.delete(r)}function i(r,a,l){s.get(r)[a]=l}function o(){s=new WeakMap}return{has:t,get:e,remove:n,update:i,dispose:o}}function Y1(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.material.id!==t.material.id?s.material.id-t.material.id:s.z!==t.z?s.z-t.z:s.id-t.id}function Vh(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.z!==t.z?t.z-s.z:s.id-t.id}function Wh(){const s=[];let t=0;const e=[],n=[],i=[];function o(){t=0,e.length=0,n.length=0,i.length=0}function r(d,u,g,f,v,p){let m=s[t];return m===void 0?(m={id:d.id,object:d,geometry:u,material:g,groupOrder:f,renderOrder:d.renderOrder,z:v,group:p},s[t]=m):(m.id=d.id,m.object=d,m.geometry=u,m.material=g,m.groupOrder=f,m.renderOrder=d.renderOrder,m.z=v,m.group=p),t++,m}function a(d,u,g,f,v,p){const m=r(d,u,g,f,v,p);g.transmission>0?n.push(m):g.transparent===!0?i.push(m):e.push(m)}function l(d,u,g,f,v,p){const m=r(d,u,g,f,v,p);g.transmission>0?n.unshift(m):g.transparent===!0?i.unshift(m):e.unshift(m)}function c(d,u){e.length>1&&e.sort(d||Y1),n.length>1&&n.sort(u||Vh),i.length>1&&i.sort(u||Vh)}function h(){for(let d=t,u=s.length;d<u;d++){const g=s[d];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:e,transmissive:n,transparent:i,init:o,push:a,unshift:l,finish:h,sort:c}}function $1(){let s=new WeakMap;function t(n,i){const o=s.get(n);let r;return o===void 0?(r=new Wh,s.set(n,[r])):i>=o.length?(r=new Wh,o.push(r)):r=o[i],r}function e(){s=new WeakMap}return{get:t,dispose:e}}function j1(){const s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new C,color:new Gt};break;case"SpotLight":e={position:new C,direction:new C,color:new Gt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new C,color:new Gt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new C,skyColor:new Gt,groundColor:new Gt};break;case"RectAreaLight":e={color:new Gt,position:new C,halfWidth:new C,halfHeight:new C};break}return s[t.id]=e,e}}}function Z1(){const s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Pt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Pt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Pt,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[t.id]=e,e}}}let K1=0;function J1(s,t){return(t.castShadow?2:0)-(s.castShadow?2:0)+(t.map?1:0)-(s.map?1:0)}function Q1(s){const t=new j1,e=Z1(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new C);const i=new C,o=new jt,r=new jt;function a(c){let h=0,d=0,u=0;for(let y=0;y<9;y++)n.probe[y].set(0,0,0);let g=0,f=0,v=0,p=0,m=0,_=0,w=0,x=0,A=0,M=0,S=0;c.sort(J1);for(let y=0,b=c.length;y<b;y++){const T=c[y],U=T.color,O=T.intensity,z=T.distance,B=T.shadow&&T.shadow.map?T.shadow.map.texture:null;if(T.isAmbientLight)h+=U.r*O,d+=U.g*O,u+=U.b*O;else if(T.isLightProbe){for(let F=0;F<9;F++)n.probe[F].addScaledVector(T.sh.coefficients[F],O);S++}else if(T.isDirectionalLight){const F=t.get(T);if(F.color.copy(T.color).multiplyScalar(T.intensity),T.castShadow){const L=T.shadow,H=e.get(T);H.shadowIntensity=L.intensity,H.shadowBias=L.bias,H.shadowNormalBias=L.normalBias,H.shadowRadius=L.radius,H.shadowMapSize=L.mapSize,n.directionalShadow[g]=H,n.directionalShadowMap[g]=B,n.directionalShadowMatrix[g]=T.shadow.matrix,_++}n.directional[g]=F,g++}else if(T.isSpotLight){const F=t.get(T);F.position.setFromMatrixPosition(T.matrixWorld),F.color.copy(U).multiplyScalar(O),F.distance=z,F.coneCos=Math.cos(T.angle),F.penumbraCos=Math.cos(T.angle*(1-T.penumbra)),F.decay=T.decay,n.spot[v]=F;const L=T.shadow;if(T.map&&(n.spotLightMap[A]=T.map,A++,L.updateMatrices(T),T.castShadow&&M++),n.spotLightMatrix[v]=L.matrix,T.castShadow){const H=e.get(T);H.shadowIntensity=L.intensity,H.shadowBias=L.bias,H.shadowNormalBias=L.normalBias,H.shadowRadius=L.radius,H.shadowMapSize=L.mapSize,n.spotShadow[v]=H,n.spotShadowMap[v]=B,x++}v++}else if(T.isRectAreaLight){const F=t.get(T);F.color.copy(U).multiplyScalar(O),F.halfWidth.set(T.width*.5,0,0),F.halfHeight.set(0,T.height*.5,0),n.rectArea[p]=F,p++}else if(T.isPointLight){const F=t.get(T);if(F.color.copy(T.color).multiplyScalar(T.intensity),F.distance=T.distance,F.decay=T.decay,T.castShadow){const L=T.shadow,H=e.get(T);H.shadowIntensity=L.intensity,H.shadowBias=L.bias,H.shadowNormalBias=L.normalBias,H.shadowRadius=L.radius,H.shadowMapSize=L.mapSize,H.shadowCameraNear=L.camera.near,H.shadowCameraFar=L.camera.far,n.pointShadow[f]=H,n.pointShadowMap[f]=B,n.pointShadowMatrix[f]=T.shadow.matrix,w++}n.point[f]=F,f++}else if(T.isHemisphereLight){const F=t.get(T);F.skyColor.copy(T.color).multiplyScalar(O),F.groundColor.copy(T.groundColor).multiplyScalar(O),n.hemi[m]=F,m++}}p>0&&(s.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Ut.LTC_FLOAT_1,n.rectAreaLTC2=Ut.LTC_FLOAT_2):(n.rectAreaLTC1=Ut.LTC_HALF_1,n.rectAreaLTC2=Ut.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=d,n.ambient[2]=u;const E=n.hash;(E.directionalLength!==g||E.pointLength!==f||E.spotLength!==v||E.rectAreaLength!==p||E.hemiLength!==m||E.numDirectionalShadows!==_||E.numPointShadows!==w||E.numSpotShadows!==x||E.numSpotMaps!==A||E.numLightProbes!==S)&&(n.directional.length=g,n.spot.length=v,n.rectArea.length=p,n.point.length=f,n.hemi.length=m,n.directionalShadow.length=_,n.directionalShadowMap.length=_,n.pointShadow.length=w,n.pointShadowMap.length=w,n.spotShadow.length=x,n.spotShadowMap.length=x,n.directionalShadowMatrix.length=_,n.pointShadowMatrix.length=w,n.spotLightMatrix.length=x+A-M,n.spotLightMap.length=A,n.numSpotLightShadowsWithMaps=M,n.numLightProbes=S,E.directionalLength=g,E.pointLength=f,E.spotLength=v,E.rectAreaLength=p,E.hemiLength=m,E.numDirectionalShadows=_,E.numPointShadows=w,E.numSpotShadows=x,E.numSpotMaps=A,E.numLightProbes=S,n.version=K1++)}function l(c,h){let d=0,u=0,g=0,f=0,v=0;const p=h.matrixWorldInverse;for(let m=0,_=c.length;m<_;m++){const w=c[m];if(w.isDirectionalLight){const x=n.directional[d];x.direction.setFromMatrixPosition(w.matrixWorld),i.setFromMatrixPosition(w.target.matrixWorld),x.direction.sub(i),x.direction.transformDirection(p),d++}else if(w.isSpotLight){const x=n.spot[g];x.position.setFromMatrixPosition(w.matrixWorld),x.position.applyMatrix4(p),x.direction.setFromMatrixPosition(w.matrixWorld),i.setFromMatrixPosition(w.target.matrixWorld),x.direction.sub(i),x.direction.transformDirection(p),g++}else if(w.isRectAreaLight){const x=n.rectArea[f];x.position.setFromMatrixPosition(w.matrixWorld),x.position.applyMatrix4(p),r.identity(),o.copy(w.matrixWorld),o.premultiply(p),r.extractRotation(o),x.halfWidth.set(w.width*.5,0,0),x.halfHeight.set(0,w.height*.5,0),x.halfWidth.applyMatrix4(r),x.halfHeight.applyMatrix4(r),f++}else if(w.isPointLight){const x=n.point[u];x.position.setFromMatrixPosition(w.matrixWorld),x.position.applyMatrix4(p),u++}else if(w.isHemisphereLight){const x=n.hemi[v];x.direction.setFromMatrixPosition(w.matrixWorld),x.direction.transformDirection(p),v++}}}return{setup:a,setupView:l,state:n}}function Xh(s){const t=new Q1(s),e=[],n=[];function i(h){c.camera=h,e.length=0,n.length=0}function o(h){e.push(h)}function r(h){n.push(h)}function a(){t.setup(e)}function l(h){t.setupView(e,h)}const c={lightsArray:e,shadowsArray:n,camera:null,lights:t,transmissionRenderTarget:{}};return{init:i,state:c,setupLights:a,setupLightsView:l,pushLight:o,pushShadow:r}}function tv(s){let t=new WeakMap;function e(i,o=0){const r=t.get(i);let a;return r===void 0?(a=new Xh(s),t.set(i,[a])):o>=r.length?(a=new Xh(s),r.push(a)):a=r[o],a}function n(){t=new WeakMap}return{get:e,dispose:n}}class Eu extends wo{static get type(){return"MeshDepthMaterial"}constructor(t){super(),this.isMeshDepthMaterial=!0,this.depthPacking=Id,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class ev extends wo{static get type(){return"MeshDistanceMaterial"}constructor(t){super(),this.isMeshDistanceMaterial=!0,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}const nv=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,iv=`uniform sampler2D shadow_pass;
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
}`;function sv(s,t,e){let n=new fo;const i=new Pt,o=new Pt,r=new ke,a=new Eu({depthPacking:ou}),l=new ev,c={},h=e.maxTextureSize,d={[Oi]:An,[An]:Oi,[hn]:hn},u=new Ke({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Pt},radius:{value:4}},vertexShader:nv,fragmentShader:iv}),g=u.clone();g.defines.HORIZONTAL_PASS=1;const f=new oe;f.setAttribute("position",new ye(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const v=new ge(f,u),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=q0;let m=this.type;this.render=function(M,S,E){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||M.length===0)return;const y=s.getRenderTarget(),b=s.getActiveCubeFace(),T=s.getActiveMipmapLevel(),U=s.state;U.setBlending(ts),U.buffers.color.setClear(1,1,1,1),U.buffers.depth.setTest(!0),U.setScissorTest(!1);const O=m!==Pi&&this.type===Pi,z=m===Pi&&this.type!==Pi;for(let B=0,F=M.length;B<F;B++){const L=M[B],H=L.shadow;if(H===void 0){console.warn("THREE.WebGLShadowMap:",L,"has no shadow.");continue}if(H.autoUpdate===!1&&H.needsUpdate===!1)continue;i.copy(H.mapSize);const G=H.getFrameExtents();if(i.multiply(G),o.copy(H.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(o.x=Math.floor(h/G.x),i.x=o.x*G.x,H.mapSize.x=o.x),i.y>h&&(o.y=Math.floor(h/G.y),i.y=o.y*G.y,H.mapSize.y=o.y)),H.map===null||O===!0||z===!0){const $=this.type!==Pi?{minFilter:Dn,magFilter:Dn}:{};H.map!==null&&H.map.dispose(),H.map=new Un(i.x,i.y,$),H.map.texture.name=L.name+".shadowMap",H.camera.updateProjectionMatrix()}s.setRenderTarget(H.map),s.clear();const N=H.getViewportCount();for(let $=0;$<N;$++){const V=H.getViewport($);r.set(o.x*V.x,o.y*V.y,o.x*V.z,o.y*V.w),U.viewport(r),H.updateMatrices(L,$),n=H.getFrustum(),x(S,E,H.camera,L,this.type)}H.isPointLightShadow!==!0&&this.type===Pi&&_(H,E),H.needsUpdate=!1}m=this.type,p.needsUpdate=!1,s.setRenderTarget(y,b,T)};function _(M,S){const E=t.update(v);u.defines.VSM_SAMPLES!==M.blurSamples&&(u.defines.VSM_SAMPLES=M.blurSamples,g.defines.VSM_SAMPLES=M.blurSamples,u.needsUpdate=!0,g.needsUpdate=!0),M.mapPass===null&&(M.mapPass=new Un(i.x,i.y)),u.uniforms.shadow_pass.value=M.map.texture,u.uniforms.resolution.value=M.mapSize,u.uniforms.radius.value=M.radius,s.setRenderTarget(M.mapPass),s.clear(),s.renderBufferDirect(S,null,E,u,v,null),g.uniforms.shadow_pass.value=M.mapPass.texture,g.uniforms.resolution.value=M.mapSize,g.uniforms.radius.value=M.radius,s.setRenderTarget(M.map),s.clear(),s.renderBufferDirect(S,null,E,g,v,null)}function w(M,S,E,y){let b=null;const T=E.isPointLight===!0?M.customDistanceMaterial:M.customDepthMaterial;if(T!==void 0)b=T;else if(b=E.isPointLight===!0?l:a,s.localClippingEnabled&&S.clipShadows===!0&&Array.isArray(S.clippingPlanes)&&S.clippingPlanes.length!==0||S.displacementMap&&S.displacementScale!==0||S.alphaMap&&S.alphaTest>0||S.map&&S.alphaTest>0){const U=b.uuid,O=S.uuid;let z=c[U];z===void 0&&(z={},c[U]=z);let B=z[O];B===void 0&&(B=b.clone(),z[O]=B,S.addEventListener("dispose",A)),b=B}if(b.visible=S.visible,b.wireframe=S.wireframe,y===Pi?b.side=S.shadowSide!==null?S.shadowSide:S.side:b.side=S.shadowSide!==null?S.shadowSide:d[S.side],b.alphaMap=S.alphaMap,b.alphaTest=S.alphaTest,b.map=S.map,b.clipShadows=S.clipShadows,b.clippingPlanes=S.clippingPlanes,b.clipIntersection=S.clipIntersection,b.displacementMap=S.displacementMap,b.displacementScale=S.displacementScale,b.displacementBias=S.displacementBias,b.wireframeLinewidth=S.wireframeLinewidth,b.linewidth=S.linewidth,E.isPointLight===!0&&b.isMeshDistanceMaterial===!0){const U=s.properties.get(b);U.light=E}return b}function x(M,S,E,y,b){if(M.visible===!1)return;if(M.layers.test(S.layers)&&(M.isMesh||M.isLine||M.isPoints)&&(M.castShadow||M.receiveShadow&&b===Pi)&&(!M.frustumCulled||n.intersectsObject(M))){M.modelViewMatrix.multiplyMatrices(E.matrixWorldInverse,M.matrixWorld);const O=t.update(M),z=M.material;if(Array.isArray(z)){const B=O.groups;for(let F=0,L=B.length;F<L;F++){const H=B[F],G=z[H.materialIndex];if(G&&G.visible){const N=w(M,G,y,b);M.onBeforeShadow(s,M,S,E,O,N,H),s.renderBufferDirect(E,null,O,N,M,H),M.onAfterShadow(s,M,S,E,O,N,H)}}}else if(z.visible){const B=w(M,z,y,b);M.onBeforeShadow(s,M,S,E,O,B,null),s.renderBufferDirect(E,null,O,B,M,null),M.onAfterShadow(s,M,S,E,O,B,null)}}const U=M.children;for(let O=0,z=U.length;O<z;O++)x(U[O],S,E,y,b)}function A(M){M.target.removeEventListener("dispose",A);for(const E in c){const y=c[E],b=M.target.uuid;b in y&&(y[b].dispose(),delete y[b])}}}const ov={[wl]:yl,[Ml]:El,[Sl]:Al,[oo]:bl,[yl]:wl,[El]:Ml,[Al]:Sl,[bl]:oo};function rv(s,t){function e(){let Y=!1;const Dt=new ke;let mt=null;const xt=new ke(0,0,0,0);return{setMask:function(bt){mt!==bt&&!Y&&(s.colorMask(bt,bt,bt,bt),mt=bt)},setLocked:function(bt){Y=bt},setClear:function(bt,At,ee,ve,Pe){Pe===!0&&(bt*=ve,At*=ve,ee*=ve),Dt.set(bt,At,ee,ve),xt.equals(Dt)===!1&&(s.clearColor(bt,At,ee,ve),xt.copy(Dt))},reset:function(){Y=!1,mt=null,xt.set(-1,0,0,0)}}}function n(){let Y=!1,Dt=!1,mt=null,xt=null,bt=null;return{setReversed:function(At){if(Dt!==At){const ee=t.get("EXT_clip_control");Dt?ee.clipControlEXT(ee.LOWER_LEFT_EXT,ee.ZERO_TO_ONE_EXT):ee.clipControlEXT(ee.LOWER_LEFT_EXT,ee.NEGATIVE_ONE_TO_ONE_EXT);const ve=bt;bt=null,this.setClear(ve)}Dt=At},getReversed:function(){return Dt},setTest:function(At){At?it(s.DEPTH_TEST):lt(s.DEPTH_TEST)},setMask:function(At){mt!==At&&!Y&&(s.depthMask(At),mt=At)},setFunc:function(At){if(Dt&&(At=ov[At]),xt!==At){switch(At){case wl:s.depthFunc(s.NEVER);break;case yl:s.depthFunc(s.ALWAYS);break;case Ml:s.depthFunc(s.LESS);break;case oo:s.depthFunc(s.LEQUAL);break;case Sl:s.depthFunc(s.EQUAL);break;case bl:s.depthFunc(s.GEQUAL);break;case El:s.depthFunc(s.GREATER);break;case Al:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}xt=At}},setLocked:function(At){Y=At},setClear:function(At){bt!==At&&(Dt&&(At=1-At),s.clearDepth(At),bt=At)},reset:function(){Y=!1,mt=null,xt=null,bt=null,Dt=!1}}}function i(){let Y=!1,Dt=null,mt=null,xt=null,bt=null,At=null,ee=null,ve=null,Pe=null;return{setTest:function(de){Y||(de?it(s.STENCIL_TEST):lt(s.STENCIL_TEST))},setMask:function(de){Dt!==de&&!Y&&(s.stencilMask(de),Dt=de)},setFunc:function(de,He,mn){(mt!==de||xt!==He||bt!==mn)&&(s.stencilFunc(de,He,mn),mt=de,xt=He,bt=mn)},setOp:function(de,He,mn){(At!==de||ee!==He||ve!==mn)&&(s.stencilOp(de,He,mn),At=de,ee=He,ve=mn)},setLocked:function(de){Y=de},setClear:function(de){Pe!==de&&(s.clearStencil(de),Pe=de)},reset:function(){Y=!1,Dt=null,mt=null,xt=null,bt=null,At=null,ee=null,ve=null,Pe=null}}}const o=new e,r=new n,a=new i,l=new WeakMap,c=new WeakMap;let h={},d={},u=new WeakMap,g=[],f=null,v=!1,p=null,m=null,_=null,w=null,x=null,A=null,M=null,S=new Gt(0,0,0),E=0,y=!1,b=null,T=null,U=null,O=null,z=null;const B=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let F=!1,L=0;const H=s.getParameter(s.VERSION);H.indexOf("WebGL")!==-1?(L=parseFloat(/^WebGL (\d)/.exec(H)[1]),F=L>=1):H.indexOf("OpenGL ES")!==-1&&(L=parseFloat(/^OpenGL ES (\d)/.exec(H)[1]),F=L>=2);let G=null,N={};const $=s.getParameter(s.SCISSOR_BOX),V=s.getParameter(s.VIEWPORT),tt=new ke().fromArray($),W=new ke().fromArray(V);function q(Y,Dt,mt,xt){const bt=new Uint8Array(4),At=s.createTexture();s.bindTexture(Y,At),s.texParameteri(Y,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(Y,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let ee=0;ee<mt;ee++)Y===s.TEXTURE_3D||Y===s.TEXTURE_2D_ARRAY?s.texImage3D(Dt,0,s.RGBA,1,1,xt,0,s.RGBA,s.UNSIGNED_BYTE,bt):s.texImage2D(Dt+ee,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,bt);return At}const X={};X[s.TEXTURE_2D]=q(s.TEXTURE_2D,s.TEXTURE_2D,1),X[s.TEXTURE_CUBE_MAP]=q(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),X[s.TEXTURE_2D_ARRAY]=q(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),X[s.TEXTURE_3D]=q(s.TEXTURE_3D,s.TEXTURE_3D,1,1),o.setClear(0,0,0,1),r.setClear(1),a.setClear(0),it(s.DEPTH_TEST),r.setFunc(oo),Z(!1),at($c),it(s.CULL_FACE),D(ts);function it(Y){h[Y]!==!0&&(s.enable(Y),h[Y]=!0)}function lt(Y){h[Y]!==!1&&(s.disable(Y),h[Y]=!1)}function ft(Y,Dt){return d[Y]!==Dt?(s.bindFramebuffer(Y,Dt),d[Y]=Dt,Y===s.DRAW_FRAMEBUFFER&&(d[s.FRAMEBUFFER]=Dt),Y===s.FRAMEBUFFER&&(d[s.DRAW_FRAMEBUFFER]=Dt),!0):!1}function K(Y,Dt){let mt=g,xt=!1;if(Y){mt=u.get(Dt),mt===void 0&&(mt=[],u.set(Dt,mt));const bt=Y.textures;if(mt.length!==bt.length||mt[0]!==s.COLOR_ATTACHMENT0){for(let At=0,ee=bt.length;At<ee;At++)mt[At]=s.COLOR_ATTACHMENT0+At;mt.length=bt.length,xt=!0}}else mt[0]!==s.BACK&&(mt[0]=s.BACK,xt=!0);xt&&s.drawBuffers(mt)}function ot(Y){return f!==Y?(s.useProgram(Y),f=Y,!0):!1}const j={[_s]:s.FUNC_ADD,[rd]:s.FUNC_SUBTRACT,[ad]:s.FUNC_REVERSE_SUBTRACT};j[ld]=s.MIN,j[cd]=s.MAX;const et={[hd]:s.ZERO,[ud]:s.ONE,[dd]:s.SRC_COLOR,[xl]:s.SRC_ALPHA,[xd]:s.SRC_ALPHA_SATURATE,[gd]:s.DST_COLOR,[pd]:s.DST_ALPHA,[fd]:s.ONE_MINUS_SRC_COLOR,[_l]:s.ONE_MINUS_SRC_ALPHA,[vd]:s.ONE_MINUS_DST_COLOR,[md]:s.ONE_MINUS_DST_ALPHA,[_d]:s.CONSTANT_COLOR,[wd]:s.ONE_MINUS_CONSTANT_COLOR,[yd]:s.CONSTANT_ALPHA,[Md]:s.ONE_MINUS_CONSTANT_ALPHA};function D(Y,Dt,mt,xt,bt,At,ee,ve,Pe,de){if(Y===ts){v===!0&&(lt(s.BLEND),v=!1);return}if(v===!1&&(it(s.BLEND),v=!0),Y!==od){if(Y!==p||de!==y){if((m!==_s||x!==_s)&&(s.blendEquation(s.FUNC_ADD),m=_s,x=_s),de)switch(Y){case zi:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case jc:s.blendFunc(s.ONE,s.ONE);break;case Zc:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case Kc:s.blendFuncSeparate(s.ZERO,s.SRC_COLOR,s.ZERO,s.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",Y);break}else switch(Y){case zi:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case jc:s.blendFunc(s.SRC_ALPHA,s.ONE);break;case Zc:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case Kc:s.blendFunc(s.ZERO,s.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",Y);break}_=null,w=null,A=null,M=null,S.set(0,0,0),E=0,p=Y,y=de}return}bt=bt||Dt,At=At||mt,ee=ee||xt,(Dt!==m||bt!==x)&&(s.blendEquationSeparate(j[Dt],j[bt]),m=Dt,x=bt),(mt!==_||xt!==w||At!==A||ee!==M)&&(s.blendFuncSeparate(et[mt],et[xt],et[At],et[ee]),_=mt,w=xt,A=At,M=ee),(ve.equals(S)===!1||Pe!==E)&&(s.blendColor(ve.r,ve.g,ve.b,Pe),S.copy(ve),E=Pe),p=Y,y=!1}function J(Y,Dt){Y.side===hn?lt(s.CULL_FACE):it(s.CULL_FACE);let mt=Y.side===An;Dt&&(mt=!mt),Z(mt),Y.blending===zi&&Y.transparent===!1?D(ts):D(Y.blending,Y.blendEquation,Y.blendSrc,Y.blendDst,Y.blendEquationAlpha,Y.blendSrcAlpha,Y.blendDstAlpha,Y.blendColor,Y.blendAlpha,Y.premultipliedAlpha),r.setFunc(Y.depthFunc),r.setTest(Y.depthTest),r.setMask(Y.depthWrite),o.setMask(Y.colorWrite);const xt=Y.stencilWrite;a.setTest(xt),xt&&(a.setMask(Y.stencilWriteMask),a.setFunc(Y.stencilFunc,Y.stencilRef,Y.stencilFuncMask),a.setOp(Y.stencilFail,Y.stencilZFail,Y.stencilZPass)),vt(Y.polygonOffset,Y.polygonOffsetFactor,Y.polygonOffsetUnits),Y.alphaToCoverage===!0?it(s.SAMPLE_ALPHA_TO_COVERAGE):lt(s.SAMPLE_ALPHA_TO_COVERAGE)}function Z(Y){b!==Y&&(Y?s.frontFace(s.CW):s.frontFace(s.CCW),b=Y)}function at(Y){Y!==id?(it(s.CULL_FACE),Y!==T&&(Y===$c?s.cullFace(s.BACK):Y===sd?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):lt(s.CULL_FACE),T=Y}function ut(Y){Y!==U&&(F&&s.lineWidth(Y),U=Y)}function vt(Y,Dt,mt){Y?(it(s.POLYGON_OFFSET_FILL),(O!==Dt||z!==mt)&&(s.polygonOffset(Dt,mt),O=Dt,z=mt)):lt(s.POLYGON_OFFSET_FILL)}function dt(Y){Y?it(s.SCISSOR_TEST):lt(s.SCISSOR_TEST)}function I(Y){Y===void 0&&(Y=s.TEXTURE0+B-1),G!==Y&&(s.activeTexture(Y),G=Y)}function R(Y,Dt,mt){mt===void 0&&(G===null?mt=s.TEXTURE0+B-1:mt=G);let xt=N[mt];xt===void 0&&(xt={type:void 0,texture:void 0},N[mt]=xt),(xt.type!==Y||xt.texture!==Dt)&&(G!==mt&&(s.activeTexture(mt),G=mt),s.bindTexture(Y,Dt||X[Y]),xt.type=Y,xt.texture=Dt)}function Q(){const Y=N[G];Y!==void 0&&Y.type!==void 0&&(s.bindTexture(Y.type,null),Y.type=void 0,Y.texture=void 0)}function rt(){try{s.compressedTexImage2D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function gt(){try{s.compressedTexImage3D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function pt(){try{s.texSubImage2D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function zt(){try{s.texSubImage3D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function Mt(){try{s.compressedTexSubImage2D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function Lt(){try{s.compressedTexSubImage3D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function te(){try{s.texStorage2D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function wt(){try{s.texStorage3D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function Ot(){try{s.texImage2D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function qt(){try{s.texImage3D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function Nt(Y){tt.equals(Y)===!1&&(s.scissor(Y.x,Y.y,Y.z,Y.w),tt.copy(Y))}function Ct(Y){W.equals(Y)===!1&&(s.viewport(Y.x,Y.y,Y.z,Y.w),W.copy(Y))}function le(Y,Dt){let mt=c.get(Dt);mt===void 0&&(mt=new WeakMap,c.set(Dt,mt));let xt=mt.get(Y);xt===void 0&&(xt=s.getUniformBlockIndex(Dt,Y.name),mt.set(Y,xt))}function Qt(Y,Dt){const xt=c.get(Dt).get(Y);l.get(Dt)!==xt&&(s.uniformBlockBinding(Dt,xt,Y.__bindingPointIndex),l.set(Dt,xt))}function Ee(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),r.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),h={},G=null,N={},d={},u=new WeakMap,g=[],f=null,v=!1,p=null,m=null,_=null,w=null,x=null,A=null,M=null,S=new Gt(0,0,0),E=0,y=!1,b=null,T=null,U=null,O=null,z=null,tt.set(0,0,s.canvas.width,s.canvas.height),W.set(0,0,s.canvas.width,s.canvas.height),o.reset(),r.reset(),a.reset()}return{buffers:{color:o,depth:r,stencil:a},enable:it,disable:lt,bindFramebuffer:ft,drawBuffers:K,useProgram:ot,setBlending:D,setMaterial:J,setFlipSided:Z,setCullFace:at,setLineWidth:ut,setPolygonOffset:vt,setScissorTest:dt,activeTexture:I,bindTexture:R,unbindTexture:Q,compressedTexImage2D:rt,compressedTexImage3D:gt,texImage2D:Ot,texImage3D:qt,updateUBOMapping:le,uniformBlockBinding:Qt,texStorage2D:te,texStorage3D:wt,texSubImage2D:pt,texSubImage3D:zt,compressedTexSubImage2D:Mt,compressedTexSubImage3D:Lt,scissor:Nt,viewport:Ct,reset:Ee}}function qh(s,t,e,n){const i=av(n);switch(e){case Q0:return s*t;case eu:return s*t;case nu:return s*t*2;case ir:return s*t/i.components*i.byteLength;case ua:return s*t/i.components*i.byteLength;case iu:return s*t*2/i.components*i.byteLength;case gc:return s*t*2/i.components*i.byteLength;case tu:return s*t*3/i.components*i.byteLength;case En:return s*t*4/i.components*i.byteLength;case vc:return s*t*4/i.components*i.byteLength;case $r:case jr:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*8;case Zr:case Kr:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case Ll:case Il:return Math.max(s,16)*Math.max(t,8)/4;case Pl:case Dl:return Math.max(s,8)*Math.max(t,8)/2;case zl:case Nl:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*8;case Ul:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case Fl:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case Ol:return Math.floor((s+4)/5)*Math.floor((t+3)/4)*16;case kl:return Math.floor((s+4)/5)*Math.floor((t+4)/5)*16;case Bl:return Math.floor((s+5)/6)*Math.floor((t+4)/5)*16;case Hl:return Math.floor((s+5)/6)*Math.floor((t+5)/6)*16;case Gl:return Math.floor((s+7)/8)*Math.floor((t+4)/5)*16;case Vl:return Math.floor((s+7)/8)*Math.floor((t+5)/6)*16;case Wl:return Math.floor((s+7)/8)*Math.floor((t+7)/8)*16;case Xl:return Math.floor((s+9)/10)*Math.floor((t+4)/5)*16;case ql:return Math.floor((s+9)/10)*Math.floor((t+5)/6)*16;case Yl:return Math.floor((s+9)/10)*Math.floor((t+7)/8)*16;case $l:return Math.floor((s+9)/10)*Math.floor((t+9)/10)*16;case jl:return Math.floor((s+11)/12)*Math.floor((t+9)/10)*16;case Zl:return Math.floor((s+11)/12)*Math.floor((t+11)/12)*16;case Jr:case Kl:case Jl:return Math.ceil(s/4)*Math.ceil(t/4)*16;case su:case Ql:return Math.ceil(s/4)*Math.ceil(t/4)*8;case tc:case ec:return Math.ceil(s/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function av(s){switch(s){case qn:case Z0:return{byteLength:1,components:1};case nr:case K0:case si:return{byteLength:2,components:1};case pc:case mc:return{byteLength:2,components:4};case ki:case fc:case Xn:return{byteLength:4,components:1};case J0:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${s}.`)}function lv(s,t,e,n,i,o,r){const a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Pt,h=new WeakMap;let d;const u=new WeakMap;let g=!1;try{g=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function f(I,R){return g?new OffscreenCanvas(I,R):ia("canvas")}function v(I,R,Q){let rt=1;const gt=dt(I);if((gt.width>Q||gt.height>Q)&&(rt=Q/Math.max(gt.width,gt.height)),rt<1)if(typeof HTMLImageElement<"u"&&I instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&I instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&I instanceof ImageBitmap||typeof VideoFrame<"u"&&I instanceof VideoFrame){const pt=Math.floor(rt*gt.width),zt=Math.floor(rt*gt.height);d===void 0&&(d=f(pt,zt));const Mt=R?f(pt,zt):d;return Mt.width=pt,Mt.height=zt,Mt.getContext("2d").drawImage(I,0,0,pt,zt),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+gt.width+"x"+gt.height+") to ("+pt+"x"+zt+")."),Mt}else return"data"in I&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+gt.width+"x"+gt.height+")."),I;return I}function p(I){return I.generateMipmaps}function m(I){s.generateMipmap(I)}function _(I){return I.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:I.isWebGL3DRenderTarget?s.TEXTURE_3D:I.isWebGLArrayRenderTarget||I.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function w(I,R,Q,rt,gt=!1){if(I!==null){if(s[I]!==void 0)return s[I];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+I+"'")}let pt=R;if(R===s.RED&&(Q===s.FLOAT&&(pt=s.R32F),Q===s.HALF_FLOAT&&(pt=s.R16F),Q===s.UNSIGNED_BYTE&&(pt=s.R8)),R===s.RED_INTEGER&&(Q===s.UNSIGNED_BYTE&&(pt=s.R8UI),Q===s.UNSIGNED_SHORT&&(pt=s.R16UI),Q===s.UNSIGNED_INT&&(pt=s.R32UI),Q===s.BYTE&&(pt=s.R8I),Q===s.SHORT&&(pt=s.R16I),Q===s.INT&&(pt=s.R32I)),R===s.RG&&(Q===s.FLOAT&&(pt=s.RG32F),Q===s.HALF_FLOAT&&(pt=s.RG16F),Q===s.UNSIGNED_BYTE&&(pt=s.RG8)),R===s.RG_INTEGER&&(Q===s.UNSIGNED_BYTE&&(pt=s.RG8UI),Q===s.UNSIGNED_SHORT&&(pt=s.RG16UI),Q===s.UNSIGNED_INT&&(pt=s.RG32UI),Q===s.BYTE&&(pt=s.RG8I),Q===s.SHORT&&(pt=s.RG16I),Q===s.INT&&(pt=s.RG32I)),R===s.RGB_INTEGER&&(Q===s.UNSIGNED_BYTE&&(pt=s.RGB8UI),Q===s.UNSIGNED_SHORT&&(pt=s.RGB16UI),Q===s.UNSIGNED_INT&&(pt=s.RGB32UI),Q===s.BYTE&&(pt=s.RGB8I),Q===s.SHORT&&(pt=s.RGB16I),Q===s.INT&&(pt=s.RGB32I)),R===s.RGBA_INTEGER&&(Q===s.UNSIGNED_BYTE&&(pt=s.RGBA8UI),Q===s.UNSIGNED_SHORT&&(pt=s.RGBA16UI),Q===s.UNSIGNED_INT&&(pt=s.RGBA32UI),Q===s.BYTE&&(pt=s.RGBA8I),Q===s.SHORT&&(pt=s.RGBA16I),Q===s.INT&&(pt=s.RGBA32I)),R===s.RGB&&Q===s.UNSIGNED_INT_5_9_9_9_REV&&(pt=s.RGB9_E5),R===s.RGBA){const zt=gt?da:_e.getTransfer(rt);Q===s.FLOAT&&(pt=s.RGBA32F),Q===s.HALF_FLOAT&&(pt=s.RGBA16F),Q===s.UNSIGNED_BYTE&&(pt=zt===Re?s.SRGB8_ALPHA8:s.RGBA8),Q===s.UNSIGNED_SHORT_4_4_4_4&&(pt=s.RGBA4),Q===s.UNSIGNED_SHORT_5_5_5_1&&(pt=s.RGB5_A1)}return(pt===s.R16F||pt===s.R32F||pt===s.RG16F||pt===s.RG32F||pt===s.RGBA16F||pt===s.RGBA32F)&&t.get("EXT_color_buffer_float"),pt}function x(I,R){let Q;return I?R===null||R===ki||R===co?Q=s.DEPTH24_STENCIL8:R===Xn?Q=s.DEPTH32F_STENCIL8:R===nr&&(Q=s.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):R===null||R===ki||R===co?Q=s.DEPTH_COMPONENT24:R===Xn?Q=s.DEPTH_COMPONENT32F:R===nr&&(Q=s.DEPTH_COMPONENT16),Q}function A(I,R){return p(I)===!0||I.isFramebufferTexture&&I.minFilter!==Dn&&I.minFilter!==Ae?Math.log2(Math.max(R.width,R.height))+1:I.mipmaps!==void 0&&I.mipmaps.length>0?I.mipmaps.length:I.isCompressedTexture&&Array.isArray(I.image)?R.mipmaps.length:1}function M(I){const R=I.target;R.removeEventListener("dispose",M),E(R),R.isVideoTexture&&h.delete(R)}function S(I){const R=I.target;R.removeEventListener("dispose",S),b(R)}function E(I){const R=n.get(I);if(R.__webglInit===void 0)return;const Q=I.source,rt=u.get(Q);if(rt){const gt=rt[R.__cacheKey];gt.usedTimes--,gt.usedTimes===0&&y(I),Object.keys(rt).length===0&&u.delete(Q)}n.remove(I)}function y(I){const R=n.get(I);s.deleteTexture(R.__webglTexture);const Q=I.source,rt=u.get(Q);delete rt[R.__cacheKey],r.memory.textures--}function b(I){const R=n.get(I);if(I.depthTexture&&(I.depthTexture.dispose(),n.remove(I.depthTexture)),I.isWebGLCubeRenderTarget)for(let rt=0;rt<6;rt++){if(Array.isArray(R.__webglFramebuffer[rt]))for(let gt=0;gt<R.__webglFramebuffer[rt].length;gt++)s.deleteFramebuffer(R.__webglFramebuffer[rt][gt]);else s.deleteFramebuffer(R.__webglFramebuffer[rt]);R.__webglDepthbuffer&&s.deleteRenderbuffer(R.__webglDepthbuffer[rt])}else{if(Array.isArray(R.__webglFramebuffer))for(let rt=0;rt<R.__webglFramebuffer.length;rt++)s.deleteFramebuffer(R.__webglFramebuffer[rt]);else s.deleteFramebuffer(R.__webglFramebuffer);if(R.__webglDepthbuffer&&s.deleteRenderbuffer(R.__webglDepthbuffer),R.__webglMultisampledFramebuffer&&s.deleteFramebuffer(R.__webglMultisampledFramebuffer),R.__webglColorRenderbuffer)for(let rt=0;rt<R.__webglColorRenderbuffer.length;rt++)R.__webglColorRenderbuffer[rt]&&s.deleteRenderbuffer(R.__webglColorRenderbuffer[rt]);R.__webglDepthRenderbuffer&&s.deleteRenderbuffer(R.__webglDepthRenderbuffer)}const Q=I.textures;for(let rt=0,gt=Q.length;rt<gt;rt++){const pt=n.get(Q[rt]);pt.__webglTexture&&(s.deleteTexture(pt.__webglTexture),r.memory.textures--),n.remove(Q[rt])}n.remove(I)}let T=0;function U(){T=0}function O(){const I=T;return I>=i.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+I+" texture units while this GPU supports only "+i.maxTextures),T+=1,I}function z(I){const R=[];return R.push(I.wrapS),R.push(I.wrapT),R.push(I.wrapR||0),R.push(I.magFilter),R.push(I.minFilter),R.push(I.anisotropy),R.push(I.internalFormat),R.push(I.format),R.push(I.type),R.push(I.generateMipmaps),R.push(I.premultiplyAlpha),R.push(I.flipY),R.push(I.unpackAlignment),R.push(I.colorSpace),R.join()}function B(I,R){const Q=n.get(I);if(I.isVideoTexture&&ut(I),I.isRenderTargetTexture===!1&&I.version>0&&Q.__version!==I.version){const rt=I.image;if(rt===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(rt.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{W(Q,I,R);return}}e.bindTexture(s.TEXTURE_2D,Q.__webglTexture,s.TEXTURE0+R)}function F(I,R){const Q=n.get(I);if(I.version>0&&Q.__version!==I.version){W(Q,I,R);return}e.bindTexture(s.TEXTURE_2D_ARRAY,Q.__webglTexture,s.TEXTURE0+R)}function L(I,R){const Q=n.get(I);if(I.version>0&&Q.__version!==I.version){W(Q,I,R);return}e.bindTexture(s.TEXTURE_3D,Q.__webglTexture,s.TEXTURE0+R)}function H(I,R){const Q=n.get(I);if(I.version>0&&Q.__version!==I.version){q(Q,I,R);return}e.bindTexture(s.TEXTURE_CUBE_MAP,Q.__webglTexture,s.TEXTURE0+R)}const G={[lo]:s.REPEAT,[Ze]:s.CLAMP_TO_EDGE,[Rl]:s.MIRRORED_REPEAT},N={[Dn]:s.NEAREST,[Dd]:s.NEAREST_MIPMAP_NEAREST,[mr]:s.NEAREST_MIPMAP_LINEAR,[Ae]:s.LINEAR,[wa]:s.LINEAR_MIPMAP_NEAREST,[Qi]:s.LINEAR_MIPMAP_LINEAR},$={[Nd]:s.NEVER,[Hd]:s.ALWAYS,[Ud]:s.LESS,[au]:s.LEQUAL,[Fd]:s.EQUAL,[Bd]:s.GEQUAL,[Od]:s.GREATER,[kd]:s.NOTEQUAL};function V(I,R){if(R.type===Xn&&t.has("OES_texture_float_linear")===!1&&(R.magFilter===Ae||R.magFilter===wa||R.magFilter===mr||R.magFilter===Qi||R.minFilter===Ae||R.minFilter===wa||R.minFilter===mr||R.minFilter===Qi)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(I,s.TEXTURE_WRAP_S,G[R.wrapS]),s.texParameteri(I,s.TEXTURE_WRAP_T,G[R.wrapT]),(I===s.TEXTURE_3D||I===s.TEXTURE_2D_ARRAY)&&s.texParameteri(I,s.TEXTURE_WRAP_R,G[R.wrapR]),s.texParameteri(I,s.TEXTURE_MAG_FILTER,N[R.magFilter]),s.texParameteri(I,s.TEXTURE_MIN_FILTER,N[R.minFilter]),R.compareFunction&&(s.texParameteri(I,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(I,s.TEXTURE_COMPARE_FUNC,$[R.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(R.magFilter===Dn||R.minFilter!==mr&&R.minFilter!==Qi||R.type===Xn&&t.has("OES_texture_float_linear")===!1)return;if(R.anisotropy>1||n.get(R).__currentAnisotropy){const Q=t.get("EXT_texture_filter_anisotropic");s.texParameterf(I,Q.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(R.anisotropy,i.getMaxAnisotropy())),n.get(R).__currentAnisotropy=R.anisotropy}}}function tt(I,R){let Q=!1;I.__webglInit===void 0&&(I.__webglInit=!0,R.addEventListener("dispose",M));const rt=R.source;let gt=u.get(rt);gt===void 0&&(gt={},u.set(rt,gt));const pt=z(R);if(pt!==I.__cacheKey){gt[pt]===void 0&&(gt[pt]={texture:s.createTexture(),usedTimes:0},r.memory.textures++,Q=!0),gt[pt].usedTimes++;const zt=gt[I.__cacheKey];zt!==void 0&&(gt[I.__cacheKey].usedTimes--,zt.usedTimes===0&&y(R)),I.__cacheKey=pt,I.__webglTexture=gt[pt].texture}return Q}function W(I,R,Q){let rt=s.TEXTURE_2D;(R.isDataArrayTexture||R.isCompressedArrayTexture)&&(rt=s.TEXTURE_2D_ARRAY),R.isData3DTexture&&(rt=s.TEXTURE_3D);const gt=tt(I,R),pt=R.source;e.bindTexture(rt,I.__webglTexture,s.TEXTURE0+Q);const zt=n.get(pt);if(pt.version!==zt.__version||gt===!0){e.activeTexture(s.TEXTURE0+Q);const Mt=_e.getPrimaries(_e.workingColorSpace),Lt=R.colorSpace===fi?null:_e.getPrimaries(R.colorSpace),te=R.colorSpace===fi||Mt===Lt?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,R.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,R.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,R.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,te);let wt=v(R.image,!1,i.maxTextureSize);wt=vt(R,wt);const Ot=o.convert(R.format,R.colorSpace),qt=o.convert(R.type);let Nt=w(R.internalFormat,Ot,qt,R.colorSpace,R.isVideoTexture);V(rt,R);let Ct;const le=R.mipmaps,Qt=R.isVideoTexture!==!0,Ee=zt.__version===void 0||gt===!0,Y=pt.dataReady,Dt=A(R,wt);if(R.isDepthTexture)Nt=x(R.format===ho,R.type),Ee&&(Qt?e.texStorage2D(s.TEXTURE_2D,1,Nt,wt.width,wt.height):e.texImage2D(s.TEXTURE_2D,0,Nt,wt.width,wt.height,0,Ot,qt,null));else if(R.isDataTexture)if(le.length>0){Qt&&Ee&&e.texStorage2D(s.TEXTURE_2D,Dt,Nt,le[0].width,le[0].height);for(let mt=0,xt=le.length;mt<xt;mt++)Ct=le[mt],Qt?Y&&e.texSubImage2D(s.TEXTURE_2D,mt,0,0,Ct.width,Ct.height,Ot,qt,Ct.data):e.texImage2D(s.TEXTURE_2D,mt,Nt,Ct.width,Ct.height,0,Ot,qt,Ct.data);R.generateMipmaps=!1}else Qt?(Ee&&e.texStorage2D(s.TEXTURE_2D,Dt,Nt,wt.width,wt.height),Y&&e.texSubImage2D(s.TEXTURE_2D,0,0,0,wt.width,wt.height,Ot,qt,wt.data)):e.texImage2D(s.TEXTURE_2D,0,Nt,wt.width,wt.height,0,Ot,qt,wt.data);else if(R.isCompressedTexture)if(R.isCompressedArrayTexture){Qt&&Ee&&e.texStorage3D(s.TEXTURE_2D_ARRAY,Dt,Nt,le[0].width,le[0].height,wt.depth);for(let mt=0,xt=le.length;mt<xt;mt++)if(Ct=le[mt],R.format!==En)if(Ot!==null)if(Qt){if(Y)if(R.layerUpdates.size>0){const bt=qh(Ct.width,Ct.height,R.format,R.type);for(const At of R.layerUpdates){const ee=Ct.data.subarray(At*bt/Ct.data.BYTES_PER_ELEMENT,(At+1)*bt/Ct.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,mt,0,0,At,Ct.width,Ct.height,1,Ot,ee)}R.clearLayerUpdates()}else e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,mt,0,0,0,Ct.width,Ct.height,wt.depth,Ot,Ct.data)}else e.compressedTexImage3D(s.TEXTURE_2D_ARRAY,mt,Nt,Ct.width,Ct.height,wt.depth,0,Ct.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Qt?Y&&e.texSubImage3D(s.TEXTURE_2D_ARRAY,mt,0,0,0,Ct.width,Ct.height,wt.depth,Ot,qt,Ct.data):e.texImage3D(s.TEXTURE_2D_ARRAY,mt,Nt,Ct.width,Ct.height,wt.depth,0,Ot,qt,Ct.data)}else{Qt&&Ee&&e.texStorage2D(s.TEXTURE_2D,Dt,Nt,le[0].width,le[0].height);for(let mt=0,xt=le.length;mt<xt;mt++)Ct=le[mt],R.format!==En?Ot!==null?Qt?Y&&e.compressedTexSubImage2D(s.TEXTURE_2D,mt,0,0,Ct.width,Ct.height,Ot,Ct.data):e.compressedTexImage2D(s.TEXTURE_2D,mt,Nt,Ct.width,Ct.height,0,Ct.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Qt?Y&&e.texSubImage2D(s.TEXTURE_2D,mt,0,0,Ct.width,Ct.height,Ot,qt,Ct.data):e.texImage2D(s.TEXTURE_2D,mt,Nt,Ct.width,Ct.height,0,Ot,qt,Ct.data)}else if(R.isDataArrayTexture)if(Qt){if(Ee&&e.texStorage3D(s.TEXTURE_2D_ARRAY,Dt,Nt,wt.width,wt.height,wt.depth),Y)if(R.layerUpdates.size>0){const mt=qh(wt.width,wt.height,R.format,R.type);for(const xt of R.layerUpdates){const bt=wt.data.subarray(xt*mt/wt.data.BYTES_PER_ELEMENT,(xt+1)*mt/wt.data.BYTES_PER_ELEMENT);e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,xt,wt.width,wt.height,1,Ot,qt,bt)}R.clearLayerUpdates()}else e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,wt.width,wt.height,wt.depth,Ot,qt,wt.data)}else e.texImage3D(s.TEXTURE_2D_ARRAY,0,Nt,wt.width,wt.height,wt.depth,0,Ot,qt,wt.data);else if(R.isData3DTexture)Qt?(Ee&&e.texStorage3D(s.TEXTURE_3D,Dt,Nt,wt.width,wt.height,wt.depth),Y&&e.texSubImage3D(s.TEXTURE_3D,0,0,0,0,wt.width,wt.height,wt.depth,Ot,qt,wt.data)):e.texImage3D(s.TEXTURE_3D,0,Nt,wt.width,wt.height,wt.depth,0,Ot,qt,wt.data);else if(R.isFramebufferTexture){if(Ee)if(Qt)e.texStorage2D(s.TEXTURE_2D,Dt,Nt,wt.width,wt.height);else{let mt=wt.width,xt=wt.height;for(let bt=0;bt<Dt;bt++)e.texImage2D(s.TEXTURE_2D,bt,Nt,mt,xt,0,Ot,qt,null),mt>>=1,xt>>=1}}else if(le.length>0){if(Qt&&Ee){const mt=dt(le[0]);e.texStorage2D(s.TEXTURE_2D,Dt,Nt,mt.width,mt.height)}for(let mt=0,xt=le.length;mt<xt;mt++)Ct=le[mt],Qt?Y&&e.texSubImage2D(s.TEXTURE_2D,mt,0,0,Ot,qt,Ct):e.texImage2D(s.TEXTURE_2D,mt,Nt,Ot,qt,Ct);R.generateMipmaps=!1}else if(Qt){if(Ee){const mt=dt(wt);e.texStorage2D(s.TEXTURE_2D,Dt,Nt,mt.width,mt.height)}Y&&e.texSubImage2D(s.TEXTURE_2D,0,0,0,Ot,qt,wt)}else e.texImage2D(s.TEXTURE_2D,0,Nt,Ot,qt,wt);p(R)&&m(rt),zt.__version=pt.version,R.onUpdate&&R.onUpdate(R)}I.__version=R.version}function q(I,R,Q){if(R.image.length!==6)return;const rt=tt(I,R),gt=R.source;e.bindTexture(s.TEXTURE_CUBE_MAP,I.__webglTexture,s.TEXTURE0+Q);const pt=n.get(gt);if(gt.version!==pt.__version||rt===!0){e.activeTexture(s.TEXTURE0+Q);const zt=_e.getPrimaries(_e.workingColorSpace),Mt=R.colorSpace===fi?null:_e.getPrimaries(R.colorSpace),Lt=R.colorSpace===fi||zt===Mt?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,R.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,R.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,R.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,Lt);const te=R.isCompressedTexture||R.image[0].isCompressedTexture,wt=R.image[0]&&R.image[0].isDataTexture,Ot=[];for(let xt=0;xt<6;xt++)!te&&!wt?Ot[xt]=v(R.image[xt],!0,i.maxCubemapSize):Ot[xt]=wt?R.image[xt].image:R.image[xt],Ot[xt]=vt(R,Ot[xt]);const qt=Ot[0],Nt=o.convert(R.format,R.colorSpace),Ct=o.convert(R.type),le=w(R.internalFormat,Nt,Ct,R.colorSpace),Qt=R.isVideoTexture!==!0,Ee=pt.__version===void 0||rt===!0,Y=gt.dataReady;let Dt=A(R,qt);V(s.TEXTURE_CUBE_MAP,R);let mt;if(te){Qt&&Ee&&e.texStorage2D(s.TEXTURE_CUBE_MAP,Dt,le,qt.width,qt.height);for(let xt=0;xt<6;xt++){mt=Ot[xt].mipmaps;for(let bt=0;bt<mt.length;bt++){const At=mt[bt];R.format!==En?Nt!==null?Qt?Y&&e.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+xt,bt,0,0,At.width,At.height,Nt,At.data):e.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+xt,bt,le,At.width,At.height,0,At.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Qt?Y&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+xt,bt,0,0,At.width,At.height,Nt,Ct,At.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+xt,bt,le,At.width,At.height,0,Nt,Ct,At.data)}}}else{if(mt=R.mipmaps,Qt&&Ee){mt.length>0&&Dt++;const xt=dt(Ot[0]);e.texStorage2D(s.TEXTURE_CUBE_MAP,Dt,le,xt.width,xt.height)}for(let xt=0;xt<6;xt++)if(wt){Qt?Y&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+xt,0,0,0,Ot[xt].width,Ot[xt].height,Nt,Ct,Ot[xt].data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+xt,0,le,Ot[xt].width,Ot[xt].height,0,Nt,Ct,Ot[xt].data);for(let bt=0;bt<mt.length;bt++){const ee=mt[bt].image[xt].image;Qt?Y&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+xt,bt+1,0,0,ee.width,ee.height,Nt,Ct,ee.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+xt,bt+1,le,ee.width,ee.height,0,Nt,Ct,ee.data)}}else{Qt?Y&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+xt,0,0,0,Nt,Ct,Ot[xt]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+xt,0,le,Nt,Ct,Ot[xt]);for(let bt=0;bt<mt.length;bt++){const At=mt[bt];Qt?Y&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+xt,bt+1,0,0,Nt,Ct,At.image[xt]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+xt,bt+1,le,Nt,Ct,At.image[xt])}}}p(R)&&m(s.TEXTURE_CUBE_MAP),pt.__version=gt.version,R.onUpdate&&R.onUpdate(R)}I.__version=R.version}function X(I,R,Q,rt,gt,pt){const zt=o.convert(Q.format,Q.colorSpace),Mt=o.convert(Q.type),Lt=w(Q.internalFormat,zt,Mt,Q.colorSpace),te=n.get(R),wt=n.get(Q);if(wt.__renderTarget=R,!te.__hasExternalTextures){const Ot=Math.max(1,R.width>>pt),qt=Math.max(1,R.height>>pt);gt===s.TEXTURE_3D||gt===s.TEXTURE_2D_ARRAY?e.texImage3D(gt,pt,Lt,Ot,qt,R.depth,0,zt,Mt,null):e.texImage2D(gt,pt,Lt,Ot,qt,0,zt,Mt,null)}e.bindFramebuffer(s.FRAMEBUFFER,I),at(R)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,rt,gt,wt.__webglTexture,0,Z(R)):(gt===s.TEXTURE_2D||gt>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&gt<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,rt,gt,wt.__webglTexture,pt),e.bindFramebuffer(s.FRAMEBUFFER,null)}function it(I,R,Q){if(s.bindRenderbuffer(s.RENDERBUFFER,I),R.depthBuffer){const rt=R.depthTexture,gt=rt&&rt.isDepthTexture?rt.type:null,pt=x(R.stencilBuffer,gt),zt=R.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,Mt=Z(R);at(R)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,Mt,pt,R.width,R.height):Q?s.renderbufferStorageMultisample(s.RENDERBUFFER,Mt,pt,R.width,R.height):s.renderbufferStorage(s.RENDERBUFFER,pt,R.width,R.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,zt,s.RENDERBUFFER,I)}else{const rt=R.textures;for(let gt=0;gt<rt.length;gt++){const pt=rt[gt],zt=o.convert(pt.format,pt.colorSpace),Mt=o.convert(pt.type),Lt=w(pt.internalFormat,zt,Mt,pt.colorSpace),te=Z(R);Q&&at(R)===!1?s.renderbufferStorageMultisample(s.RENDERBUFFER,te,Lt,R.width,R.height):at(R)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,te,Lt,R.width,R.height):s.renderbufferStorage(s.RENDERBUFFER,Lt,R.width,R.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function lt(I,R){if(R&&R.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(s.FRAMEBUFFER,I),!(R.depthTexture&&R.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const rt=n.get(R.depthTexture);rt.__renderTarget=R,(!rt.__webglTexture||R.depthTexture.image.width!==R.width||R.depthTexture.image.height!==R.height)&&(R.depthTexture.image.width=R.width,R.depthTexture.image.height=R.height,R.depthTexture.needsUpdate=!0),B(R.depthTexture,0);const gt=rt.__webglTexture,pt=Z(R);if(R.depthTexture.format===no)at(R)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,gt,0,pt):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,gt,0);else if(R.depthTexture.format===ho)at(R)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,gt,0,pt):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,gt,0);else throw new Error("Unknown depthTexture format")}function ft(I){const R=n.get(I),Q=I.isWebGLCubeRenderTarget===!0;if(R.__boundDepthTexture!==I.depthTexture){const rt=I.depthTexture;if(R.__depthDisposeCallback&&R.__depthDisposeCallback(),rt){const gt=()=>{delete R.__boundDepthTexture,delete R.__depthDisposeCallback,rt.removeEventListener("dispose",gt)};rt.addEventListener("dispose",gt),R.__depthDisposeCallback=gt}R.__boundDepthTexture=rt}if(I.depthTexture&&!R.__autoAllocateDepthBuffer){if(Q)throw new Error("target.depthTexture not supported in Cube render targets");lt(R.__webglFramebuffer,I)}else if(Q){R.__webglDepthbuffer=[];for(let rt=0;rt<6;rt++)if(e.bindFramebuffer(s.FRAMEBUFFER,R.__webglFramebuffer[rt]),R.__webglDepthbuffer[rt]===void 0)R.__webglDepthbuffer[rt]=s.createRenderbuffer(),it(R.__webglDepthbuffer[rt],I,!1);else{const gt=I.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,pt=R.__webglDepthbuffer[rt];s.bindRenderbuffer(s.RENDERBUFFER,pt),s.framebufferRenderbuffer(s.FRAMEBUFFER,gt,s.RENDERBUFFER,pt)}}else if(e.bindFramebuffer(s.FRAMEBUFFER,R.__webglFramebuffer),R.__webglDepthbuffer===void 0)R.__webglDepthbuffer=s.createRenderbuffer(),it(R.__webglDepthbuffer,I,!1);else{const rt=I.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,gt=R.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,gt),s.framebufferRenderbuffer(s.FRAMEBUFFER,rt,s.RENDERBUFFER,gt)}e.bindFramebuffer(s.FRAMEBUFFER,null)}function K(I,R,Q){const rt=n.get(I);R!==void 0&&X(rt.__webglFramebuffer,I,I.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),Q!==void 0&&ft(I)}function ot(I){const R=I.texture,Q=n.get(I),rt=n.get(R);I.addEventListener("dispose",S);const gt=I.textures,pt=I.isWebGLCubeRenderTarget===!0,zt=gt.length>1;if(zt||(rt.__webglTexture===void 0&&(rt.__webglTexture=s.createTexture()),rt.__version=R.version,r.memory.textures++),pt){Q.__webglFramebuffer=[];for(let Mt=0;Mt<6;Mt++)if(R.mipmaps&&R.mipmaps.length>0){Q.__webglFramebuffer[Mt]=[];for(let Lt=0;Lt<R.mipmaps.length;Lt++)Q.__webglFramebuffer[Mt][Lt]=s.createFramebuffer()}else Q.__webglFramebuffer[Mt]=s.createFramebuffer()}else{if(R.mipmaps&&R.mipmaps.length>0){Q.__webglFramebuffer=[];for(let Mt=0;Mt<R.mipmaps.length;Mt++)Q.__webglFramebuffer[Mt]=s.createFramebuffer()}else Q.__webglFramebuffer=s.createFramebuffer();if(zt)for(let Mt=0,Lt=gt.length;Mt<Lt;Mt++){const te=n.get(gt[Mt]);te.__webglTexture===void 0&&(te.__webglTexture=s.createTexture(),r.memory.textures++)}if(I.samples>0&&at(I)===!1){Q.__webglMultisampledFramebuffer=s.createFramebuffer(),Q.__webglColorRenderbuffer=[],e.bindFramebuffer(s.FRAMEBUFFER,Q.__webglMultisampledFramebuffer);for(let Mt=0;Mt<gt.length;Mt++){const Lt=gt[Mt];Q.__webglColorRenderbuffer[Mt]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,Q.__webglColorRenderbuffer[Mt]);const te=o.convert(Lt.format,Lt.colorSpace),wt=o.convert(Lt.type),Ot=w(Lt.internalFormat,te,wt,Lt.colorSpace,I.isXRRenderTarget===!0),qt=Z(I);s.renderbufferStorageMultisample(s.RENDERBUFFER,qt,Ot,I.width,I.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+Mt,s.RENDERBUFFER,Q.__webglColorRenderbuffer[Mt])}s.bindRenderbuffer(s.RENDERBUFFER,null),I.depthBuffer&&(Q.__webglDepthRenderbuffer=s.createRenderbuffer(),it(Q.__webglDepthRenderbuffer,I,!0)),e.bindFramebuffer(s.FRAMEBUFFER,null)}}if(pt){e.bindTexture(s.TEXTURE_CUBE_MAP,rt.__webglTexture),V(s.TEXTURE_CUBE_MAP,R);for(let Mt=0;Mt<6;Mt++)if(R.mipmaps&&R.mipmaps.length>0)for(let Lt=0;Lt<R.mipmaps.length;Lt++)X(Q.__webglFramebuffer[Mt][Lt],I,R,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+Mt,Lt);else X(Q.__webglFramebuffer[Mt],I,R,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+Mt,0);p(R)&&m(s.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(zt){for(let Mt=0,Lt=gt.length;Mt<Lt;Mt++){const te=gt[Mt],wt=n.get(te);e.bindTexture(s.TEXTURE_2D,wt.__webglTexture),V(s.TEXTURE_2D,te),X(Q.__webglFramebuffer,I,te,s.COLOR_ATTACHMENT0+Mt,s.TEXTURE_2D,0),p(te)&&m(s.TEXTURE_2D)}e.unbindTexture()}else{let Mt=s.TEXTURE_2D;if((I.isWebGL3DRenderTarget||I.isWebGLArrayRenderTarget)&&(Mt=I.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),e.bindTexture(Mt,rt.__webglTexture),V(Mt,R),R.mipmaps&&R.mipmaps.length>0)for(let Lt=0;Lt<R.mipmaps.length;Lt++)X(Q.__webglFramebuffer[Lt],I,R,s.COLOR_ATTACHMENT0,Mt,Lt);else X(Q.__webglFramebuffer,I,R,s.COLOR_ATTACHMENT0,Mt,0);p(R)&&m(Mt),e.unbindTexture()}I.depthBuffer&&ft(I)}function j(I){const R=I.textures;for(let Q=0,rt=R.length;Q<rt;Q++){const gt=R[Q];if(p(gt)){const pt=_(I),zt=n.get(gt).__webglTexture;e.bindTexture(pt,zt),m(pt),e.unbindTexture()}}}const et=[],D=[];function J(I){if(I.samples>0){if(at(I)===!1){const R=I.textures,Q=I.width,rt=I.height;let gt=s.COLOR_BUFFER_BIT;const pt=I.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,zt=n.get(I),Mt=R.length>1;if(Mt)for(let Lt=0;Lt<R.length;Lt++)e.bindFramebuffer(s.FRAMEBUFFER,zt.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+Lt,s.RENDERBUFFER,null),e.bindFramebuffer(s.FRAMEBUFFER,zt.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+Lt,s.TEXTURE_2D,null,0);e.bindFramebuffer(s.READ_FRAMEBUFFER,zt.__webglMultisampledFramebuffer),e.bindFramebuffer(s.DRAW_FRAMEBUFFER,zt.__webglFramebuffer);for(let Lt=0;Lt<R.length;Lt++){if(I.resolveDepthBuffer&&(I.depthBuffer&&(gt|=s.DEPTH_BUFFER_BIT),I.stencilBuffer&&I.resolveStencilBuffer&&(gt|=s.STENCIL_BUFFER_BIT)),Mt){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,zt.__webglColorRenderbuffer[Lt]);const te=n.get(R[Lt]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,te,0)}s.blitFramebuffer(0,0,Q,rt,0,0,Q,rt,gt,s.NEAREST),l===!0&&(et.length=0,D.length=0,et.push(s.COLOR_ATTACHMENT0+Lt),I.depthBuffer&&I.resolveDepthBuffer===!1&&(et.push(pt),D.push(pt),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,D)),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,et))}if(e.bindFramebuffer(s.READ_FRAMEBUFFER,null),e.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),Mt)for(let Lt=0;Lt<R.length;Lt++){e.bindFramebuffer(s.FRAMEBUFFER,zt.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+Lt,s.RENDERBUFFER,zt.__webglColorRenderbuffer[Lt]);const te=n.get(R[Lt]).__webglTexture;e.bindFramebuffer(s.FRAMEBUFFER,zt.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+Lt,s.TEXTURE_2D,te,0)}e.bindFramebuffer(s.DRAW_FRAMEBUFFER,zt.__webglMultisampledFramebuffer)}else if(I.depthBuffer&&I.resolveDepthBuffer===!1&&l){const R=I.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[R])}}}function Z(I){return Math.min(i.maxSamples,I.samples)}function at(I){const R=n.get(I);return I.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&R.__useRenderToTexture!==!1}function ut(I){const R=r.render.frame;h.get(I)!==R&&(h.set(I,R),I.update())}function vt(I,R){const Q=I.colorSpace,rt=I.format,gt=I.type;return I.isCompressedTexture===!0||I.isVideoTexture===!0||Q!==Cs&&Q!==fi&&(_e.getTransfer(Q)===Re?(rt!==En||gt!==qn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",Q)),R}function dt(I){return typeof HTMLImageElement<"u"&&I instanceof HTMLImageElement?(c.width=I.naturalWidth||I.width,c.height=I.naturalHeight||I.height):typeof VideoFrame<"u"&&I instanceof VideoFrame?(c.width=I.displayWidth,c.height=I.displayHeight):(c.width=I.width,c.height=I.height),c}this.allocateTextureUnit=O,this.resetTextureUnits=U,this.setTexture2D=B,this.setTexture2DArray=F,this.setTexture3D=L,this.setTextureCube=H,this.rebindTextures=K,this.setupRenderTarget=ot,this.updateRenderTargetMipmap=j,this.updateMultisampleRenderTarget=J,this.setupDepthRenderbuffer=ft,this.setupFrameBufferTexture=X,this.useMultisampledRTT=at}function cv(s,t){function e(n,i=fi){let o;const r=_e.getTransfer(i);if(n===qn)return s.UNSIGNED_BYTE;if(n===pc)return s.UNSIGNED_SHORT_4_4_4_4;if(n===mc)return s.UNSIGNED_SHORT_5_5_5_1;if(n===J0)return s.UNSIGNED_INT_5_9_9_9_REV;if(n===Z0)return s.BYTE;if(n===K0)return s.SHORT;if(n===nr)return s.UNSIGNED_SHORT;if(n===fc)return s.INT;if(n===ki)return s.UNSIGNED_INT;if(n===Xn)return s.FLOAT;if(n===si)return s.HALF_FLOAT;if(n===Q0)return s.ALPHA;if(n===tu)return s.RGB;if(n===En)return s.RGBA;if(n===eu)return s.LUMINANCE;if(n===nu)return s.LUMINANCE_ALPHA;if(n===no)return s.DEPTH_COMPONENT;if(n===ho)return s.DEPTH_STENCIL;if(n===ir)return s.RED;if(n===ua)return s.RED_INTEGER;if(n===iu)return s.RG;if(n===gc)return s.RG_INTEGER;if(n===vc)return s.RGBA_INTEGER;if(n===$r||n===jr||n===Zr||n===Kr)if(r===Re)if(o=t.get("WEBGL_compressed_texture_s3tc_srgb"),o!==null){if(n===$r)return o.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===jr)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Zr)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Kr)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(o=t.get("WEBGL_compressed_texture_s3tc"),o!==null){if(n===$r)return o.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===jr)return o.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Zr)return o.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Kr)return o.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Pl||n===Ll||n===Dl||n===Il)if(o=t.get("WEBGL_compressed_texture_pvrtc"),o!==null){if(n===Pl)return o.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Ll)return o.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Dl)return o.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Il)return o.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===zl||n===Nl||n===Ul)if(o=t.get("WEBGL_compressed_texture_etc"),o!==null){if(n===zl||n===Nl)return r===Re?o.COMPRESSED_SRGB8_ETC2:o.COMPRESSED_RGB8_ETC2;if(n===Ul)return r===Re?o.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:o.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===Fl||n===Ol||n===kl||n===Bl||n===Hl||n===Gl||n===Vl||n===Wl||n===Xl||n===ql||n===Yl||n===$l||n===jl||n===Zl)if(o=t.get("WEBGL_compressed_texture_astc"),o!==null){if(n===Fl)return r===Re?o.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:o.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Ol)return r===Re?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:o.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===kl)return r===Re?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:o.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Bl)return r===Re?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:o.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Hl)return r===Re?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:o.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Gl)return r===Re?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:o.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Vl)return r===Re?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:o.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Wl)return r===Re?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:o.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Xl)return r===Re?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:o.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===ql)return r===Re?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:o.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Yl)return r===Re?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:o.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===$l)return r===Re?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:o.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===jl)return r===Re?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:o.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Zl)return r===Re?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:o.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Jr||n===Kl||n===Jl)if(o=t.get("EXT_texture_compression_bptc"),o!==null){if(n===Jr)return r===Re?o.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:o.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Kl)return o.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Jl)return o.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===su||n===Ql||n===tc||n===ec)if(o=t.get("EXT_texture_compression_rgtc"),o!==null){if(n===Jr)return o.COMPRESSED_RED_RGTC1_EXT;if(n===Ql)return o.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===tc)return o.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===ec)return o.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===co?s.UNSIGNED_INT_24_8:s[n]!==void 0?s[n]:null}return{convert:e}}class hv extends Wn{constructor(t=[]){super(),this.isArrayCamera=!0,this.cameras=t}}class Ve extends pn{constructor(){super(),this.isGroup=!0,this.type="Group"}}const uv={type:"move"};class Ya{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ve,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ve,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new C,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new C),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ve,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new C,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new C),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let i=null,o=null,r=null;const a=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){r=!0;for(const v of t.hand.values()){const p=e.getJointPose(v,n),m=this._getHandJoint(c,v);p!==null&&(m.matrix.fromArray(p.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=p.radius),m.visible=p!==null}const h=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],u=h.position.distanceTo(d.position),g=.02,f=.005;c.inputState.pinching&&u>g+f?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&u<=g-f&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(o=e.getPose(t.gripSpace,n),o!==null&&(l.matrix.fromArray(o.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,o.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(o.linearVelocity)):l.hasLinearVelocity=!1,o.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(o.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(i=e.getPose(t.targetRaySpace,n),i===null&&o!==null&&(i=o),i!==null&&(a.matrix.fromArray(i.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,i.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(i.linearVelocity)):a.hasLinearVelocity=!1,i.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(i.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(uv)))}return a!==null&&(a.visible=i!==null),l!==null&&(l.visible=o!==null),c!==null&&(c.visible=r!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const n=new Ve;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}}const dv=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,fv=`
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

}`;class pv{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e,n){if(this.texture===null){const i=new Tn,o=t.properties.get(i);o.__webglTexture=e.texture,(e.depthNear!=n.depthNear||e.depthFar!=n.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,n=new Ke({vertexShader:dv,fragmentShader:fv,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new ge(new Bi(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class mv extends xo{constructor(t,e){super();const n=this;let i=null,o=1,r=null,a="local-floor",l=1,c=null,h=null,d=null,u=null,g=null,f=null;const v=new pv,p=e.getContextAttributes();let m=null,_=null;const w=[],x=[],A=new Pt;let M=null;const S=new Wn;S.viewport=new ke;const E=new Wn;E.viewport=new ke;const y=[S,E],b=new hv;let T=null,U=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(W){let q=w[W];return q===void 0&&(q=new Ya,w[W]=q),q.getTargetRaySpace()},this.getControllerGrip=function(W){let q=w[W];return q===void 0&&(q=new Ya,w[W]=q),q.getGripSpace()},this.getHand=function(W){let q=w[W];return q===void 0&&(q=new Ya,w[W]=q),q.getHandSpace()};function O(W){const q=x.indexOf(W.inputSource);if(q===-1)return;const X=w[q];X!==void 0&&(X.update(W.inputSource,W.frame,c||r),X.dispatchEvent({type:W.type,data:W.inputSource}))}function z(){i.removeEventListener("select",O),i.removeEventListener("selectstart",O),i.removeEventListener("selectend",O),i.removeEventListener("squeeze",O),i.removeEventListener("squeezestart",O),i.removeEventListener("squeezeend",O),i.removeEventListener("end",z),i.removeEventListener("inputsourceschange",B);for(let W=0;W<w.length;W++){const q=x[W];q!==null&&(x[W]=null,w[W].disconnect(q))}T=null,U=null,v.reset(),t.setRenderTarget(m),g=null,u=null,d=null,i=null,_=null,tt.stop(),n.isPresenting=!1,t.setPixelRatio(M),t.setSize(A.width,A.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(W){o=W,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(W){a=W,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||r},this.setReferenceSpace=function(W){c=W},this.getBaseLayer=function(){return u!==null?u:g},this.getBinding=function(){return d},this.getFrame=function(){return f},this.getSession=function(){return i},this.setSession=async function(W){if(i=W,i!==null){if(m=t.getRenderTarget(),i.addEventListener("select",O),i.addEventListener("selectstart",O),i.addEventListener("selectend",O),i.addEventListener("squeeze",O),i.addEventListener("squeezestart",O),i.addEventListener("squeezeend",O),i.addEventListener("end",z),i.addEventListener("inputsourceschange",B),p.xrCompatible!==!0&&await e.makeXRCompatible(),M=t.getPixelRatio(),t.getSize(A),i.renderState.layers===void 0){const q={antialias:p.antialias,alpha:!0,depth:p.depth,stencil:p.stencil,framebufferScaleFactor:o};g=new XRWebGLLayer(i,e,q),i.updateRenderState({baseLayer:g}),t.setPixelRatio(1),t.setSize(g.framebufferWidth,g.framebufferHeight,!1),_=new Un(g.framebufferWidth,g.framebufferHeight,{format:En,type:qn,colorSpace:t.outputColorSpace,stencilBuffer:p.stencil})}else{let q=null,X=null,it=null;p.depth&&(it=p.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,q=p.stencil?ho:no,X=p.stencil?co:ki);const lt={colorFormat:e.RGBA8,depthFormat:it,scaleFactor:o};d=new XRWebGLBinding(i,e),u=d.createProjectionLayer(lt),i.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),_=new Un(u.textureWidth,u.textureHeight,{format:En,type:qn,depthTexture:new yc(u.textureWidth,u.textureHeight,X,void 0,void 0,void 0,void 0,void 0,void 0,q),stencilBuffer:p.stencil,colorSpace:t.outputColorSpace,samples:p.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1})}_.isXRRenderTarget=!0,this.setFoveation(l),c=null,r=await i.requestReferenceSpace(a),tt.setContext(i),tt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return v.getDepthTexture()};function B(W){for(let q=0;q<W.removed.length;q++){const X=W.removed[q],it=x.indexOf(X);it>=0&&(x[it]=null,w[it].disconnect(X))}for(let q=0;q<W.added.length;q++){const X=W.added[q];let it=x.indexOf(X);if(it===-1){for(let ft=0;ft<w.length;ft++)if(ft>=x.length){x.push(X),it=ft;break}else if(x[ft]===null){x[ft]=X,it=ft;break}if(it===-1)break}const lt=w[it];lt&&lt.connect(X)}}const F=new C,L=new C;function H(W,q,X){F.setFromMatrixPosition(q.matrixWorld),L.setFromMatrixPosition(X.matrixWorld);const it=F.distanceTo(L),lt=q.projectionMatrix.elements,ft=X.projectionMatrix.elements,K=lt[14]/(lt[10]-1),ot=lt[14]/(lt[10]+1),j=(lt[9]+1)/lt[5],et=(lt[9]-1)/lt[5],D=(lt[8]-1)/lt[0],J=(ft[8]+1)/ft[0],Z=K*D,at=K*J,ut=it/(-D+J),vt=ut*-D;if(q.matrixWorld.decompose(W.position,W.quaternion,W.scale),W.translateX(vt),W.translateZ(ut),W.matrixWorld.compose(W.position,W.quaternion,W.scale),W.matrixWorldInverse.copy(W.matrixWorld).invert(),lt[10]===-1)W.projectionMatrix.copy(q.projectionMatrix),W.projectionMatrixInverse.copy(q.projectionMatrixInverse);else{const dt=K+ut,I=ot+ut,R=Z-vt,Q=at+(it-vt),rt=j*ot/I*dt,gt=et*ot/I*dt;W.projectionMatrix.makePerspective(R,Q,rt,gt,dt,I),W.projectionMatrixInverse.copy(W.projectionMatrix).invert()}}function G(W,q){q===null?W.matrixWorld.copy(W.matrix):W.matrixWorld.multiplyMatrices(q.matrixWorld,W.matrix),W.matrixWorldInverse.copy(W.matrixWorld).invert()}this.updateCamera=function(W){if(i===null)return;let q=W.near,X=W.far;v.texture!==null&&(v.depthNear>0&&(q=v.depthNear),v.depthFar>0&&(X=v.depthFar)),b.near=E.near=S.near=q,b.far=E.far=S.far=X,(T!==b.near||U!==b.far)&&(i.updateRenderState({depthNear:b.near,depthFar:b.far}),T=b.near,U=b.far),S.layers.mask=W.layers.mask|2,E.layers.mask=W.layers.mask|4,b.layers.mask=S.layers.mask|E.layers.mask;const it=W.parent,lt=b.cameras;G(b,it);for(let ft=0;ft<lt.length;ft++)G(lt[ft],it);lt.length===2?H(b,S,E):b.projectionMatrix.copy(S.projectionMatrix),N(W,b,it)};function N(W,q,X){X===null?W.matrix.copy(q.matrixWorld):(W.matrix.copy(X.matrixWorld),W.matrix.invert(),W.matrix.multiply(q.matrixWorld)),W.matrix.decompose(W.position,W.quaternion,W.scale),W.updateMatrixWorld(!0),W.projectionMatrix.copy(q.projectionMatrix),W.projectionMatrixInverse.copy(q.projectionMatrixInverse),W.isPerspectiveCamera&&(W.fov=sr*2*Math.atan(1/W.projectionMatrix.elements[5]),W.zoom=1)}this.getCamera=function(){return b},this.getFoveation=function(){if(!(u===null&&g===null))return l},this.setFoveation=function(W){l=W,u!==null&&(u.fixedFoveation=W),g!==null&&g.fixedFoveation!==void 0&&(g.fixedFoveation=W)},this.hasDepthSensing=function(){return v.texture!==null},this.getDepthSensingMesh=function(){return v.getMesh(b)};let $=null;function V(W,q){if(h=q.getViewerPose(c||r),f=q,h!==null){const X=h.views;g!==null&&(t.setRenderTargetFramebuffer(_,g.framebuffer),t.setRenderTarget(_));let it=!1;X.length!==b.cameras.length&&(b.cameras.length=0,it=!0);for(let ft=0;ft<X.length;ft++){const K=X[ft];let ot=null;if(g!==null)ot=g.getViewport(K);else{const et=d.getViewSubImage(u,K);ot=et.viewport,ft===0&&(t.setRenderTargetTextures(_,et.colorTexture,u.ignoreDepthValues?void 0:et.depthStencilTexture),t.setRenderTarget(_))}let j=y[ft];j===void 0&&(j=new Wn,j.layers.enable(ft),j.viewport=new ke,y[ft]=j),j.matrix.fromArray(K.transform.matrix),j.matrix.decompose(j.position,j.quaternion,j.scale),j.projectionMatrix.fromArray(K.projectionMatrix),j.projectionMatrixInverse.copy(j.projectionMatrix).invert(),j.viewport.set(ot.x,ot.y,ot.width,ot.height),ft===0&&(b.matrix.copy(j.matrix),b.matrix.decompose(b.position,b.quaternion,b.scale)),it===!0&&b.cameras.push(j)}const lt=i.enabledFeatures;if(lt&&lt.includes("depth-sensing")){const ft=d.getDepthInformation(X[0]);ft&&ft.isValid&&ft.texture&&v.init(t,ft,i.renderState)}}for(let X=0;X<w.length;X++){const it=x[X],lt=w[X];it!==null&&lt!==void 0&&lt.update(it,q,c||r)}$&&$(W,q),q.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:q}),f=null}const tt=new wu;tt.setAnimationLoop(V),this.setAnimationLoop=function(W){$=W},this.dispose=function(){}}}const hs=new Oe,gv=new jt;function vv(s,t){function e(p,m){p.matrixAutoUpdate===!0&&p.updateMatrix(),m.value.copy(p.matrix)}function n(p,m){m.color.getRGB(p.fogColor.value,vu(s)),m.isFog?(p.fogNear.value=m.near,p.fogFar.value=m.far):m.isFogExp2&&(p.fogDensity.value=m.density)}function i(p,m,_,w,x){m.isMeshBasicMaterial||m.isMeshLambertMaterial?o(p,m):m.isMeshToonMaterial?(o(p,m),d(p,m)):m.isMeshPhongMaterial?(o(p,m),h(p,m)):m.isMeshStandardMaterial?(o(p,m),u(p,m),m.isMeshPhysicalMaterial&&g(p,m,x)):m.isMeshMatcapMaterial?(o(p,m),f(p,m)):m.isMeshDepthMaterial?o(p,m):m.isMeshDistanceMaterial?(o(p,m),v(p,m)):m.isMeshNormalMaterial?o(p,m):m.isLineBasicMaterial?(r(p,m),m.isLineDashedMaterial&&a(p,m)):m.isPointsMaterial?l(p,m,_,w):m.isSpriteMaterial?c(p,m):m.isShadowMaterial?(p.color.value.copy(m.color),p.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function o(p,m){p.opacity.value=m.opacity,m.color&&p.diffuse.value.copy(m.color),m.emissive&&p.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(p.map.value=m.map,e(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,e(m.alphaMap,p.alphaMapTransform)),m.bumpMap&&(p.bumpMap.value=m.bumpMap,e(m.bumpMap,p.bumpMapTransform),p.bumpScale.value=m.bumpScale,m.side===An&&(p.bumpScale.value*=-1)),m.normalMap&&(p.normalMap.value=m.normalMap,e(m.normalMap,p.normalMapTransform),p.normalScale.value.copy(m.normalScale),m.side===An&&p.normalScale.value.negate()),m.displacementMap&&(p.displacementMap.value=m.displacementMap,e(m.displacementMap,p.displacementMapTransform),p.displacementScale.value=m.displacementScale,p.displacementBias.value=m.displacementBias),m.emissiveMap&&(p.emissiveMap.value=m.emissiveMap,e(m.emissiveMap,p.emissiveMapTransform)),m.specularMap&&(p.specularMap.value=m.specularMap,e(m.specularMap,p.specularMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest);const _=t.get(m),w=_.envMap,x=_.envMapRotation;w&&(p.envMap.value=w,hs.copy(x),hs.x*=-1,hs.y*=-1,hs.z*=-1,w.isCubeTexture&&w.isRenderTargetTexture===!1&&(hs.y*=-1,hs.z*=-1),p.envMapRotation.value.setFromMatrix4(gv.makeRotationFromEuler(hs)),p.flipEnvMap.value=w.isCubeTexture&&w.isRenderTargetTexture===!1?-1:1,p.reflectivity.value=m.reflectivity,p.ior.value=m.ior,p.refractionRatio.value=m.refractionRatio),m.lightMap&&(p.lightMap.value=m.lightMap,p.lightMapIntensity.value=m.lightMapIntensity,e(m.lightMap,p.lightMapTransform)),m.aoMap&&(p.aoMap.value=m.aoMap,p.aoMapIntensity.value=m.aoMapIntensity,e(m.aoMap,p.aoMapTransform))}function r(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,m.map&&(p.map.value=m.map,e(m.map,p.mapTransform))}function a(p,m){p.dashSize.value=m.dashSize,p.totalSize.value=m.dashSize+m.gapSize,p.scale.value=m.scale}function l(p,m,_,w){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.size.value=m.size*_,p.scale.value=w*.5,m.map&&(p.map.value=m.map,e(m.map,p.uvTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,e(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function c(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.rotation.value=m.rotation,m.map&&(p.map.value=m.map,e(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,e(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function h(p,m){p.specular.value.copy(m.specular),p.shininess.value=Math.max(m.shininess,1e-4)}function d(p,m){m.gradientMap&&(p.gradientMap.value=m.gradientMap)}function u(p,m){p.metalness.value=m.metalness,m.metalnessMap&&(p.metalnessMap.value=m.metalnessMap,e(m.metalnessMap,p.metalnessMapTransform)),p.roughness.value=m.roughness,m.roughnessMap&&(p.roughnessMap.value=m.roughnessMap,e(m.roughnessMap,p.roughnessMapTransform)),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)}function g(p,m,_){p.ior.value=m.ior,m.sheen>0&&(p.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),p.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(p.sheenColorMap.value=m.sheenColorMap,e(m.sheenColorMap,p.sheenColorMapTransform)),m.sheenRoughnessMap&&(p.sheenRoughnessMap.value=m.sheenRoughnessMap,e(m.sheenRoughnessMap,p.sheenRoughnessMapTransform))),m.clearcoat>0&&(p.clearcoat.value=m.clearcoat,p.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(p.clearcoatMap.value=m.clearcoatMap,e(m.clearcoatMap,p.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,e(m.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(p.clearcoatNormalMap.value=m.clearcoatNormalMap,e(m.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===An&&p.clearcoatNormalScale.value.negate())),m.dispersion>0&&(p.dispersion.value=m.dispersion),m.iridescence>0&&(p.iridescence.value=m.iridescence,p.iridescenceIOR.value=m.iridescenceIOR,p.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(p.iridescenceMap.value=m.iridescenceMap,e(m.iridescenceMap,p.iridescenceMapTransform)),m.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=m.iridescenceThicknessMap,e(m.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),m.transmission>0&&(p.transmission.value=m.transmission,p.transmissionSamplerMap.value=_.texture,p.transmissionSamplerSize.value.set(_.width,_.height),m.transmissionMap&&(p.transmissionMap.value=m.transmissionMap,e(m.transmissionMap,p.transmissionMapTransform)),p.thickness.value=m.thickness,m.thicknessMap&&(p.thicknessMap.value=m.thicknessMap,e(m.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=m.attenuationDistance,p.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(p.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(p.anisotropyMap.value=m.anisotropyMap,e(m.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=m.specularIntensity,p.specularColor.value.copy(m.specularColor),m.specularColorMap&&(p.specularColorMap.value=m.specularColorMap,e(m.specularColorMap,p.specularColorMapTransform)),m.specularIntensityMap&&(p.specularIntensityMap.value=m.specularIntensityMap,e(m.specularIntensityMap,p.specularIntensityMapTransform))}function f(p,m){m.matcap&&(p.matcap.value=m.matcap)}function v(p,m){const _=t.get(m).light;p.referencePosition.value.setFromMatrixPosition(_.matrixWorld),p.nearDistance.value=_.shadow.camera.near,p.farDistance.value=_.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function xv(s,t,e,n){let i={},o={},r=[];const a=s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS);function l(_,w){const x=w.program;n.uniformBlockBinding(_,x)}function c(_,w){let x=i[_.id];x===void 0&&(f(_),x=h(_),i[_.id]=x,_.addEventListener("dispose",p));const A=w.program;n.updateUBOMapping(_,A);const M=t.render.frame;o[_.id]!==M&&(u(_),o[_.id]=M)}function h(_){const w=d();_.__bindingPointIndex=w;const x=s.createBuffer(),A=_.__size,M=_.usage;return s.bindBuffer(s.UNIFORM_BUFFER,x),s.bufferData(s.UNIFORM_BUFFER,A,M),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,w,x),x}function d(){for(let _=0;_<a;_++)if(r.indexOf(_)===-1)return r.push(_),_;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(_){const w=i[_.id],x=_.uniforms,A=_.__cache;s.bindBuffer(s.UNIFORM_BUFFER,w);for(let M=0,S=x.length;M<S;M++){const E=Array.isArray(x[M])?x[M]:[x[M]];for(let y=0,b=E.length;y<b;y++){const T=E[y];if(g(T,M,y,A)===!0){const U=T.__offset,O=Array.isArray(T.value)?T.value:[T.value];let z=0;for(let B=0;B<O.length;B++){const F=O[B],L=v(F);typeof F=="number"||typeof F=="boolean"?(T.__data[0]=F,s.bufferSubData(s.UNIFORM_BUFFER,U+z,T.__data)):F.isMatrix3?(T.__data[0]=F.elements[0],T.__data[1]=F.elements[1],T.__data[2]=F.elements[2],T.__data[3]=0,T.__data[4]=F.elements[3],T.__data[5]=F.elements[4],T.__data[6]=F.elements[5],T.__data[7]=0,T.__data[8]=F.elements[6],T.__data[9]=F.elements[7],T.__data[10]=F.elements[8],T.__data[11]=0):(F.toArray(T.__data,z),z+=L.storage/Float32Array.BYTES_PER_ELEMENT)}s.bufferSubData(s.UNIFORM_BUFFER,U,T.__data)}}}s.bindBuffer(s.UNIFORM_BUFFER,null)}function g(_,w,x,A){const M=_.value,S=w+"_"+x;if(A[S]===void 0)return typeof M=="number"||typeof M=="boolean"?A[S]=M:A[S]=M.clone(),!0;{const E=A[S];if(typeof M=="number"||typeof M=="boolean"){if(E!==M)return A[S]=M,!0}else if(E.equals(M)===!1)return E.copy(M),!0}return!1}function f(_){const w=_.uniforms;let x=0;const A=16;for(let S=0,E=w.length;S<E;S++){const y=Array.isArray(w[S])?w[S]:[w[S]];for(let b=0,T=y.length;b<T;b++){const U=y[b],O=Array.isArray(U.value)?U.value:[U.value];for(let z=0,B=O.length;z<B;z++){const F=O[z],L=v(F),H=x%A,G=H%L.boundary,N=H+G;x+=G,N!==0&&A-N<L.storage&&(x+=A-N),U.__data=new Float32Array(L.storage/Float32Array.BYTES_PER_ELEMENT),U.__offset=x,x+=L.storage}}}const M=x%A;return M>0&&(x+=A-M),_.__size=x,_.__cache={},this}function v(_){const w={boundary:0,storage:0};return typeof _=="number"||typeof _=="boolean"?(w.boundary=4,w.storage=4):_.isVector2?(w.boundary=8,w.storage=8):_.isVector3||_.isColor?(w.boundary=16,w.storage=12):_.isVector4?(w.boundary=16,w.storage=16):_.isMatrix3?(w.boundary=48,w.storage=48):_.isMatrix4?(w.boundary=64,w.storage=64):_.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",_),w}function p(_){const w=_.target;w.removeEventListener("dispose",p);const x=r.indexOf(w.__bindingPointIndex);r.splice(x,1),s.deleteBuffer(i[w.id]),delete i[w.id],delete o[w.id]}function m(){for(const _ in i)s.deleteBuffer(i[_]);r=[],i={},o={}}return{bind:l,update:c,dispose:m}}class _v{constructor(t={}){const{canvas:e=of(),context:n=null,depth:i=!0,stencil:o=!1,alpha:r=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reverseDepthBuffer:u=!1}=t;this.isWebGLRenderer=!0;let g;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=n.getContextAttributes().alpha}else g=r;const f=new Uint32Array(4),v=new Int32Array(4);let p=null,m=null;const _=[],w=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=Pn,this.toneMapping=Ni,this.toneMappingExposure=1;const x=this;let A=!1,M=0,S=0,E=null,y=-1,b=null;const T=new ke,U=new ke;let O=null;const z=new Gt(0);let B=0,F=e.width,L=e.height,H=1,G=null,N=null;const $=new ke(0,0,F,L),V=new ke(0,0,F,L);let tt=!1;const W=new fo;let q=!1,X=!1;const it=new jt,lt=new jt,ft=new C,K=new ke,ot={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let j=!1;function et(){return E===null?H:1}let D=n;function J(P,nt){return e.getContext(P,nt)}try{const P={alpha:!0,depth:i,stencil:o,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${dc}`),e.addEventListener("webglcontextlost",xt,!1),e.addEventListener("webglcontextrestored",bt,!1),e.addEventListener("webglcontextcreationerror",At,!1),D===null){const nt="webgl2";if(D=J(nt,P),D===null)throw J(nt)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(P){throw console.error("THREE.WebGLRenderer: "+P.message),P}let Z,at,ut,vt,dt,I,R,Q,rt,gt,pt,zt,Mt,Lt,te,wt,Ot,qt,Nt,Ct,le,Qt,Ee,Y;function Dt(){Z=new Eg(D),Z.init(),Qt=new cv(D,Z),at=new _g(D,Z,t,Qt),ut=new rv(D,Z),at.reverseDepthBuffer&&u&&ut.buffers.depth.setReversed(!0),vt=new Cg(D),dt=new q1,I=new lv(D,Z,ut,dt,at,Qt,vt),R=new yg(x),Q=new bg(x),rt=new Nf(D),Ee=new vg(D,rt),gt=new Ag(D,rt,vt,Ee),pt=new Pg(D,gt,rt,vt),Nt=new Rg(D,at,I),wt=new wg(dt),zt=new X1(x,R,Q,Z,at,Ee,wt),Mt=new vv(x,dt),Lt=new $1,te=new tv(Z),qt=new gg(x,R,Q,ut,pt,g,l),Ot=new sv(x,pt,at),Y=new xv(D,vt,at,ut),Ct=new xg(D,Z,vt),le=new Tg(D,Z,vt),vt.programs=zt.programs,x.capabilities=at,x.extensions=Z,x.properties=dt,x.renderLists=Lt,x.shadowMap=Ot,x.state=ut,x.info=vt}Dt();const mt=new mv(x,D);this.xr=mt,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){const P=Z.get("WEBGL_lose_context");P&&P.loseContext()},this.forceContextRestore=function(){const P=Z.get("WEBGL_lose_context");P&&P.restoreContext()},this.getPixelRatio=function(){return H},this.setPixelRatio=function(P){P!==void 0&&(H=P,this.setSize(F,L,!1))},this.getSize=function(P){return P.set(F,L)},this.setSize=function(P,nt,ht=!0){if(mt.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}F=P,L=nt,e.width=Math.floor(P*H),e.height=Math.floor(nt*H),ht===!0&&(e.style.width=P+"px",e.style.height=nt+"px"),this.setViewport(0,0,P,nt)},this.getDrawingBufferSize=function(P){return P.set(F*H,L*H).floor()},this.setDrawingBufferSize=function(P,nt,ht){F=P,L=nt,H=ht,e.width=Math.floor(P*ht),e.height=Math.floor(nt*ht),this.setViewport(0,0,P,nt)},this.getCurrentViewport=function(P){return P.copy(T)},this.getViewport=function(P){return P.copy($)},this.setViewport=function(P,nt,ht,ct){P.isVector4?$.set(P.x,P.y,P.z,P.w):$.set(P,nt,ht,ct),ut.viewport(T.copy($).multiplyScalar(H).round())},this.getScissor=function(P){return P.copy(V)},this.setScissor=function(P,nt,ht,ct){P.isVector4?V.set(P.x,P.y,P.z,P.w):V.set(P,nt,ht,ct),ut.scissor(U.copy(V).multiplyScalar(H).round())},this.getScissorTest=function(){return tt},this.setScissorTest=function(P){ut.setScissorTest(tt=P)},this.setOpaqueSort=function(P){G=P},this.setTransparentSort=function(P){N=P},this.getClearColor=function(P){return P.copy(qt.getClearColor())},this.setClearColor=function(){qt.setClearColor.apply(qt,arguments)},this.getClearAlpha=function(){return qt.getClearAlpha()},this.setClearAlpha=function(){qt.setClearAlpha.apply(qt,arguments)},this.clear=function(P=!0,nt=!0,ht=!0){let ct=0;if(P){let st=!1;if(E!==null){const Et=E.texture.format;st=Et===vc||Et===gc||Et===ua}if(st){const Et=E.texture.type,Ft=Et===qn||Et===ki||Et===nr||Et===co||Et===pc||Et===mc,Vt=qt.getClearColor(),Wt=qt.getClearAlpha(),se=Vt.r,fe=Vt.g,Xt=Vt.b;Ft?(f[0]=se,f[1]=fe,f[2]=Xt,f[3]=Wt,D.clearBufferuiv(D.COLOR,0,f)):(v[0]=se,v[1]=fe,v[2]=Xt,v[3]=Wt,D.clearBufferiv(D.COLOR,0,v))}else ct|=D.COLOR_BUFFER_BIT}nt&&(ct|=D.DEPTH_BUFFER_BIT),ht&&(ct|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),D.clear(ct)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",xt,!1),e.removeEventListener("webglcontextrestored",bt,!1),e.removeEventListener("webglcontextcreationerror",At,!1),Lt.dispose(),te.dispose(),dt.dispose(),R.dispose(),Q.dispose(),pt.dispose(),Ee.dispose(),Y.dispose(),zt.dispose(),mt.dispose(),mt.removeEventListener("sessionstart",gi),mt.removeEventListener("sessionend",oi),gn.stop()};function xt(P){P.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),A=!0}function bt(){console.log("THREE.WebGLRenderer: Context Restored."),A=!1;const P=vt.autoReset,nt=Ot.enabled,ht=Ot.autoUpdate,ct=Ot.needsUpdate,st=Ot.type;Dt(),vt.autoReset=P,Ot.enabled=nt,Ot.autoUpdate=ht,Ot.needsUpdate=ct,Ot.type=st}function At(P){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",P.statusMessage)}function ee(P){const nt=P.target;nt.removeEventListener("dispose",ee),ve(nt)}function ve(P){Pe(P),dt.remove(P)}function Pe(P){const nt=dt.get(P).programs;nt!==void 0&&(nt.forEach(function(ht){zt.releaseProgram(ht)}),P.isShaderMaterial&&zt.releaseShaderCache(P))}this.renderBufferDirect=function(P,nt,ht,ct,st,Et){nt===null&&(nt=ot);const Ft=st.isMesh&&st.matrixWorld.determinant()<0,Vt=fr(P,nt,ht,ct,st);ut.setMaterial(ct,Ft);let Wt=ht.index,se=1;if(ct.wireframe===!0){if(Wt=gt.getWireframeAttribute(ht),Wt===void 0)return;se=2}const fe=ht.drawRange,Xt=ht.attributes.position;let me=fe.start*se,Te=(fe.start+fe.count)*se;Et!==null&&(me=Math.max(me,Et.start*se),Te=Math.min(Te,(Et.start+Et.count)*se)),Wt!==null?(me=Math.max(me,0),Te=Math.min(Te,Wt.count)):Xt!=null&&(me=Math.max(me,0),Te=Math.min(Te,Xt.count));const Se=Te-me;if(Se<0||Se===1/0)return;Ee.setup(st,ct,Vt,ht,Wt);let qe,we=Ct;if(Wt!==null&&(qe=rt.get(Wt),we=le,we.setIndex(qe)),st.isMesh)ct.wireframe===!0?(ut.setLineWidth(ct.wireframeLinewidth*et()),we.setMode(D.LINES)):we.setMode(D.TRIANGLES);else if(st.isLine){let Yt=ct.linewidth;Yt===void 0&&(Yt=1),ut.setLineWidth(Yt*et()),st.isLineSegments?we.setMode(D.LINES):st.isLineLoop?we.setMode(D.LINE_LOOP):we.setMode(D.LINE_STRIP)}else st.isPoints?we.setMode(D.POINTS):st.isSprite&&we.setMode(D.TRIANGLES);if(st.isBatchedMesh)if(st._multiDrawInstances!==null)we.renderMultiDrawInstances(st._multiDrawStarts,st._multiDrawCounts,st._multiDrawCount,st._multiDrawInstances);else if(Z.get("WEBGL_multi_draw"))we.renderMultiDraw(st._multiDrawStarts,st._multiDrawCounts,st._multiDrawCount);else{const Yt=st._multiDrawStarts,vn=st._multiDrawCounts,xe=st._multiDrawCount,re=Wt?rt.get(Wt).bytesPerElement:1,Tt=dt.get(ct).currentProgram.getUniforms();for(let xn=0;xn<xe;xn++)Tt.setValue(D,"_gl_DrawID",xn),we.render(Yt[xn]/re,vn[xn])}else if(st.isInstancedMesh)we.renderInstances(me,Se,st.count);else if(ht.isInstancedBufferGeometry){const Yt=ht._maxInstanceCount!==void 0?ht._maxInstanceCount:1/0,vn=Math.min(ht.instanceCount,Yt);we.renderInstances(me,Se,vn)}else we.render(me,Se)};function de(P,nt,ht){P.transparent===!0&&P.side===hn&&P.forceSinglePass===!1?(P.side=An,P.needsUpdate=!0,ri(P,nt,ht),P.side=Oi,P.needsUpdate=!0,ri(P,nt,ht),P.side=hn):ri(P,nt,ht)}this.compile=function(P,nt,ht=null){ht===null&&(ht=P),m=te.get(ht),m.init(nt),w.push(m),ht.traverseVisible(function(st){st.isLight&&st.layers.test(nt.layers)&&(m.pushLight(st),st.castShadow&&m.pushShadow(st))}),P!==ht&&P.traverseVisible(function(st){st.isLight&&st.layers.test(nt.layers)&&(m.pushLight(st),st.castShadow&&m.pushShadow(st))}),m.setupLights();const ct=new Set;return P.traverse(function(st){if(!(st.isMesh||st.isPoints||st.isLine||st.isSprite))return;const Et=st.material;if(Et)if(Array.isArray(Et))for(let Ft=0;Ft<Et.length;Ft++){const Vt=Et[Ft];de(Vt,ht,st),ct.add(Vt)}else de(Et,ht,st),ct.add(Et)}),w.pop(),m=null,ct},this.compileAsync=function(P,nt,ht=null){const ct=this.compile(P,nt,ht);return new Promise(st=>{function Et(){if(ct.forEach(function(Ft){dt.get(Ft).currentProgram.isReady()&&ct.delete(Ft)}),ct.size===0){st(P);return}setTimeout(Et,10)}Z.get("KHR_parallel_shader_compile")!==null?Et():setTimeout(Et,10)})};let He=null;function mn(P){He&&He(P)}function gi(){gn.stop()}function oi(){gn.start()}const gn=new wu;gn.setAnimationLoop(mn),typeof self<"u"&&gn.setContext(self),this.setAnimationLoop=function(P){He=P,mt.setAnimationLoop(P),P===null?gn.stop():gn.start()},mt.addEventListener("sessionstart",gi),mt.addEventListener("sessionend",oi),this.render=function(P,nt){if(nt!==void 0&&nt.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(A===!0)return;if(P.matrixWorldAutoUpdate===!0&&P.updateMatrixWorld(),nt.parent===null&&nt.matrixWorldAutoUpdate===!0&&nt.updateMatrixWorld(),mt.enabled===!0&&mt.isPresenting===!0&&(mt.cameraAutoUpdate===!0&&mt.updateCamera(nt),nt=mt.getCamera()),P.isScene===!0&&P.onBeforeRender(x,P,nt,E),m=te.get(P,w.length),m.init(nt),w.push(m),lt.multiplyMatrices(nt.projectionMatrix,nt.matrixWorldInverse),W.setFromProjectionMatrix(lt),X=this.localClippingEnabled,q=wt.init(this.clippingPlanes,X),p=Lt.get(P,_.length),p.init(),_.push(p),mt.enabled===!0&&mt.isPresenting===!0){const Et=x.xr.getDepthSensingMesh();Et!==null&&So(Et,nt,-1/0,x.sortObjects)}So(P,nt,0,x.sortObjects),p.finish(),x.sortObjects===!0&&p.sort(G,N),j=mt.enabled===!1||mt.isPresenting===!1||mt.hasDepthSensing()===!1,j&&qt.addToRenderList(p,P),this.info.render.frame++,q===!0&&wt.beginShadows();const ht=m.state.shadowsArray;Ot.render(ht,P,nt),q===!0&&wt.endShadows(),this.info.autoReset===!0&&this.info.reset();const ct=p.opaque,st=p.transmissive;if(m.setupLights(),nt.isArrayCamera){const Et=nt.cameras;if(st.length>0)for(let Ft=0,Vt=Et.length;Ft<Vt;Ft++){const Wt=Et[Ft];bo(ct,st,P,Wt)}j&&qt.render(P);for(let Ft=0,Vt=Et.length;Ft<Vt;Ft++){const Wt=Et[Ft];Rs(p,P,Wt,Wt.viewport)}}else st.length>0&&bo(ct,st,P,nt),j&&qt.render(P),Rs(p,P,nt);E!==null&&(I.updateMultisampleRenderTarget(E),I.updateRenderTargetMipmap(E)),P.isScene===!0&&P.onAfterRender(x,P,nt),Ee.resetDefaultState(),y=-1,b=null,w.pop(),w.length>0?(m=w[w.length-1],q===!0&&wt.setGlobalState(x.clippingPlanes,m.state.camera)):m=null,_.pop(),_.length>0?p=_[_.length-1]:p=null};function So(P,nt,ht,ct){if(P.visible===!1)return;if(P.layers.test(nt.layers)){if(P.isGroup)ht=P.renderOrder;else if(P.isLOD)P.autoUpdate===!0&&P.update(nt);else if(P.isLight)m.pushLight(P),P.castShadow&&m.pushShadow(P);else if(P.isSprite){if(!P.frustumCulled||W.intersectsSprite(P)){ct&&K.setFromMatrixPosition(P.matrixWorld).applyMatrix4(lt);const Ft=pt.update(P),Vt=P.material;Vt.visible&&p.push(P,Ft,Vt,ht,K.z,null)}}else if((P.isMesh||P.isLine||P.isPoints)&&(!P.frustumCulled||W.intersectsObject(P))){const Ft=pt.update(P),Vt=P.material;if(ct&&(P.boundingSphere!==void 0?(P.boundingSphere===null&&P.computeBoundingSphere(),K.copy(P.boundingSphere.center)):(Ft.boundingSphere===null&&Ft.computeBoundingSphere(),K.copy(Ft.boundingSphere.center)),K.applyMatrix4(P.matrixWorld).applyMatrix4(lt)),Array.isArray(Vt)){const Wt=Ft.groups;for(let se=0,fe=Wt.length;se<fe;se++){const Xt=Wt[se],me=Vt[Xt.materialIndex];me&&me.visible&&p.push(P,Ft,me,ht,K.z,Xt)}}else Vt.visible&&p.push(P,Ft,Vt,ht,K.z,null)}}const Et=P.children;for(let Ft=0,Vt=Et.length;Ft<Vt;Ft++)So(Et[Ft],nt,ht,ct)}function Rs(P,nt,ht,ct){const st=P.opaque,Et=P.transmissive,Ft=P.transparent;m.setupLightsView(ht),q===!0&&wt.setGlobalState(x.clippingPlanes,ht),ct&&ut.viewport(T.copy(ct)),st.length>0&&vi(st,nt,ht),Et.length>0&&vi(Et,nt,ht),Ft.length>0&&vi(Ft,nt,ht),ut.buffers.depth.setTest(!0),ut.buffers.depth.setMask(!0),ut.buffers.color.setMask(!0),ut.setPolygonOffset(!1)}function bo(P,nt,ht,ct){if((ht.isScene===!0?ht.overrideMaterial:null)!==null)return;m.state.transmissionRenderTarget[ct.id]===void 0&&(m.state.transmissionRenderTarget[ct.id]=new Un(1,1,{generateMipmaps:!0,type:Z.has("EXT_color_buffer_half_float")||Z.has("EXT_color_buffer_float")?si:qn,minFilter:Qi,samples:4,stencilBuffer:o,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:_e.workingColorSpace}));const Et=m.state.transmissionRenderTarget[ct.id],Ft=ct.viewport||T;Et.setSize(Ft.z,Ft.w);const Vt=x.getRenderTarget();x.setRenderTarget(Et),x.getClearColor(z),B=x.getClearAlpha(),B<1&&x.setClearColor(16777215,.5),x.clear(),j&&qt.render(ht);const Wt=x.toneMapping;x.toneMapping=Ni;const se=ct.viewport;if(ct.viewport!==void 0&&(ct.viewport=void 0),m.setupLightsView(ct),q===!0&&wt.setGlobalState(x.clippingPlanes,ct),vi(P,ht,ct),I.updateMultisampleRenderTarget(Et),I.updateRenderTargetMipmap(Et),Z.has("WEBGL_multisampled_render_to_texture")===!1){let fe=!1;for(let Xt=0,me=nt.length;Xt<me;Xt++){const Te=nt[Xt],Se=Te.object,qe=Te.geometry,we=Te.material,Yt=Te.group;if(we.side===hn&&Se.layers.test(ct.layers)){const vn=we.side;we.side=An,we.needsUpdate=!0,ns(Se,ht,ct,qe,we,Yt),we.side=vn,we.needsUpdate=!0,fe=!0}}fe===!0&&(I.updateMultisampleRenderTarget(Et),I.updateRenderTargetMipmap(Et))}x.setRenderTarget(Vt),x.setClearColor(z,B),se!==void 0&&(ct.viewport=se),x.toneMapping=Wt}function vi(P,nt,ht){const ct=nt.isScene===!0?nt.overrideMaterial:null;for(let st=0,Et=P.length;st<Et;st++){const Ft=P[st],Vt=Ft.object,Wt=Ft.geometry,se=ct===null?Ft.material:ct,fe=Ft.group;Vt.layers.test(ht.layers)&&ns(Vt,nt,ht,Wt,se,fe)}}function ns(P,nt,ht,ct,st,Et){P.onBeforeRender(x,nt,ht,ct,st,Et),P.modelViewMatrix.multiplyMatrices(ht.matrixWorldInverse,P.matrixWorld),P.normalMatrix.getNormalMatrix(P.modelViewMatrix),st.onBeforeRender(x,nt,ht,ct,P,Et),st.transparent===!0&&st.side===hn&&st.forceSinglePass===!1?(st.side=An,st.needsUpdate=!0,x.renderBufferDirect(ht,nt,ct,st,P,Et),st.side=Oi,st.needsUpdate=!0,x.renderBufferDirect(ht,nt,ct,st,P,Et),st.side=hn):x.renderBufferDirect(ht,nt,ct,st,P,Et),P.onAfterRender(x,nt,ht,ct,st,Et)}function ri(P,nt,ht){nt.isScene!==!0&&(nt=ot);const ct=dt.get(P),st=m.state.lights,Et=m.state.shadowsArray,Ft=st.state.version,Vt=zt.getParameters(P,st.state,Et,nt,ht),Wt=zt.getProgramCacheKey(Vt);let se=ct.programs;ct.environment=P.isMeshStandardMaterial?nt.environment:null,ct.fog=nt.fog,ct.envMap=(P.isMeshStandardMaterial?Q:R).get(P.envMap||ct.environment),ct.envMapRotation=ct.environment!==null&&P.envMap===null?nt.environmentRotation:P.envMapRotation,se===void 0&&(P.addEventListener("dispose",ee),se=new Map,ct.programs=se);let fe=se.get(Wt);if(fe!==void 0){if(ct.currentProgram===fe&&ct.lightsStateVersion===Ft)return dr(P,Vt),fe}else Vt.uniforms=zt.getUniforms(P),P.onBeforeCompile(Vt,x),fe=zt.acquireProgram(Vt,Wt),se.set(Wt,fe),ct.uniforms=Vt.uniforms;const Xt=ct.uniforms;return(!P.isShaderMaterial&&!P.isRawShaderMaterial||P.clipping===!0)&&(Xt.clippingPlanes=wt.uniform),dr(P,Vt),ct.needsLights=pr(P),ct.lightsStateVersion=Ft,ct.needsLights&&(Xt.ambientLightColor.value=st.state.ambient,Xt.lightProbe.value=st.state.probe,Xt.directionalLights.value=st.state.directional,Xt.directionalLightShadows.value=st.state.directionalShadow,Xt.spotLights.value=st.state.spot,Xt.spotLightShadows.value=st.state.spotShadow,Xt.rectAreaLights.value=st.state.rectArea,Xt.ltc_1.value=st.state.rectAreaLTC1,Xt.ltc_2.value=st.state.rectAreaLTC2,Xt.pointLights.value=st.state.point,Xt.pointLightShadows.value=st.state.pointShadow,Xt.hemisphereLights.value=st.state.hemi,Xt.directionalShadowMap.value=st.state.directionalShadowMap,Xt.directionalShadowMatrix.value=st.state.directionalShadowMatrix,Xt.spotShadowMap.value=st.state.spotShadowMap,Xt.spotLightMatrix.value=st.state.spotLightMatrix,Xt.spotLightMap.value=st.state.spotLightMap,Xt.pointShadowMap.value=st.state.pointShadowMap,Xt.pointShadowMatrix.value=st.state.pointShadowMatrix),ct.currentProgram=fe,ct.uniformsList=null,fe}function va(P){if(P.uniformsList===null){const nt=P.currentProgram.getUniforms();P.uniformsList=Qr.seqWithValue(nt.seq,P.uniforms)}return P.uniformsList}function dr(P,nt){const ht=dt.get(P);ht.outputColorSpace=nt.outputColorSpace,ht.batching=nt.batching,ht.batchingColor=nt.batchingColor,ht.instancing=nt.instancing,ht.instancingColor=nt.instancingColor,ht.instancingMorph=nt.instancingMorph,ht.skinning=nt.skinning,ht.morphTargets=nt.morphTargets,ht.morphNormals=nt.morphNormals,ht.morphColors=nt.morphColors,ht.morphTargetsCount=nt.morphTargetsCount,ht.numClippingPlanes=nt.numClippingPlanes,ht.numIntersection=nt.numClipIntersection,ht.vertexAlphas=nt.vertexAlphas,ht.vertexTangents=nt.vertexTangents,ht.toneMapping=nt.toneMapping}function fr(P,nt,ht,ct,st){nt.isScene!==!0&&(nt=ot),I.resetTextureUnits();const Et=nt.fog,Ft=ct.isMeshStandardMaterial?nt.environment:null,Vt=E===null?x.outputColorSpace:E.isXRRenderTarget===!0?E.texture.colorSpace:Cs,Wt=(ct.isMeshStandardMaterial?Q:R).get(ct.envMap||Ft),se=ct.vertexColors===!0&&!!ht.attributes.color&&ht.attributes.color.itemSize===4,fe=!!ht.attributes.tangent&&(!!ct.normalMap||ct.anisotropy>0),Xt=!!ht.morphAttributes.position,me=!!ht.morphAttributes.normal,Te=!!ht.morphAttributes.color;let Se=Ni;ct.toneMapped&&(E===null||E.isXRRenderTarget===!0)&&(Se=x.toneMapping);const qe=ht.morphAttributes.position||ht.morphAttributes.normal||ht.morphAttributes.color,we=qe!==void 0?qe.length:0,Yt=dt.get(ct),vn=m.state.lights;if(q===!0&&(X===!0||P!==b)){const _n=P===b&&ct.id===y;wt.setState(ct,P,_n)}let xe=!1;ct.version===Yt.__version?(Yt.needsLights&&Yt.lightsStateVersion!==vn.state.version||Yt.outputColorSpace!==Vt||st.isBatchedMesh&&Yt.batching===!1||!st.isBatchedMesh&&Yt.batching===!0||st.isBatchedMesh&&Yt.batchingColor===!0&&st.colorTexture===null||st.isBatchedMesh&&Yt.batchingColor===!1&&st.colorTexture!==null||st.isInstancedMesh&&Yt.instancing===!1||!st.isInstancedMesh&&Yt.instancing===!0||st.isSkinnedMesh&&Yt.skinning===!1||!st.isSkinnedMesh&&Yt.skinning===!0||st.isInstancedMesh&&Yt.instancingColor===!0&&st.instanceColor===null||st.isInstancedMesh&&Yt.instancingColor===!1&&st.instanceColor!==null||st.isInstancedMesh&&Yt.instancingMorph===!0&&st.morphTexture===null||st.isInstancedMesh&&Yt.instancingMorph===!1&&st.morphTexture!==null||Yt.envMap!==Wt||ct.fog===!0&&Yt.fog!==Et||Yt.numClippingPlanes!==void 0&&(Yt.numClippingPlanes!==wt.numPlanes||Yt.numIntersection!==wt.numIntersection)||Yt.vertexAlphas!==se||Yt.vertexTangents!==fe||Yt.morphTargets!==Xt||Yt.morphNormals!==me||Yt.morphColors!==Te||Yt.toneMapping!==Se||Yt.morphTargetsCount!==we)&&(xe=!0):(xe=!0,Yt.__version=ct.version);let re=Yt.currentProgram;xe===!0&&(re=ri(ct,nt,st));let Tt=!1,xn=!1,xi=!1;const ae=re.getUniforms(),Je=Yt.uniforms;if(ut.useProgram(re.program)&&(Tt=!0,xn=!0,xi=!0),ct.id!==y&&(y=ct.id,xn=!0),Tt||b!==P){ut.buffers.depth.getReversed()?(it.copy(P.projectionMatrix),af(it),lf(it),ae.setValue(D,"projectionMatrix",it)):ae.setValue(D,"projectionMatrix",P.projectionMatrix),ae.setValue(D,"viewMatrix",P.matrixWorldInverse);const Zn=ae.map.cameraPosition;Zn!==void 0&&Zn.setValue(D,ft.setFromMatrixPosition(P.matrixWorld)),at.logarithmicDepthBuffer&&ae.setValue(D,"logDepthBufFC",2/(Math.log(P.far+1)/Math.LN2)),(ct.isMeshPhongMaterial||ct.isMeshToonMaterial||ct.isMeshLambertMaterial||ct.isMeshBasicMaterial||ct.isMeshStandardMaterial||ct.isShaderMaterial)&&ae.setValue(D,"isOrthographic",P.isOrthographicCamera===!0),b!==P&&(b=P,xn=!0,xi=!0)}if(st.isSkinnedMesh){ae.setOptional(D,st,"bindMatrix"),ae.setOptional(D,st,"bindMatrixInverse");const _n=st.skeleton;_n&&(_n.boneTexture===null&&_n.computeBoneTexture(),ae.setValue(D,"boneTexture",_n.boneTexture,I))}st.isBatchedMesh&&(ae.setOptional(D,st,"batchingTexture"),ae.setValue(D,"batchingTexture",st._matricesTexture,I),ae.setOptional(D,st,"batchingIdTexture"),ae.setValue(D,"batchingIdTexture",st._indirectTexture,I),ae.setOptional(D,st,"batchingColorTexture"),st._colorsTexture!==null&&ae.setValue(D,"batchingColorTexture",st._colorsTexture,I));const _i=ht.morphAttributes;if((_i.position!==void 0||_i.normal!==void 0||_i.color!==void 0)&&Nt.update(st,ht,re),(xn||Yt.receiveShadow!==st.receiveShadow)&&(Yt.receiveShadow=st.receiveShadow,ae.setValue(D,"receiveShadow",st.receiveShadow)),ct.isMeshGouraudMaterial&&ct.envMap!==null&&(Je.envMap.value=Wt,Je.flipEnvMap.value=Wt.isCubeTexture&&Wt.isRenderTargetTexture===!1?-1:1),ct.isMeshStandardMaterial&&ct.envMap===null&&nt.environment!==null&&(Je.envMapIntensity.value=nt.environmentIntensity),xn&&(ae.setValue(D,"toneMappingExposure",x.toneMappingExposure),Yt.needsLights&&Eo(Je,xi),Et&&ct.fog===!0&&Mt.refreshFogUniforms(Je,Et),Mt.refreshMaterialUniforms(Je,ct,H,L,m.state.transmissionRenderTarget[P.id]),Qr.upload(D,va(Yt),Je,I)),ct.isShaderMaterial&&ct.uniformsNeedUpdate===!0&&(Qr.upload(D,va(Yt),Je,I),ct.uniformsNeedUpdate=!1),ct.isSpriteMaterial&&ae.setValue(D,"center",st.center),ae.setValue(D,"modelViewMatrix",st.modelViewMatrix),ae.setValue(D,"normalMatrix",st.normalMatrix),ae.setValue(D,"modelMatrix",st.matrixWorld),ct.isShaderMaterial||ct.isRawShaderMaterial){const _n=ct.uniformsGroups;for(let Zn=0,Kn=_n.length;Zn<Kn;Zn++){const ai=_n[Zn];Y.update(ai,re),Y.bind(ai,re)}}return re}function Eo(P,nt){P.ambientLightColor.needsUpdate=nt,P.lightProbe.needsUpdate=nt,P.directionalLights.needsUpdate=nt,P.directionalLightShadows.needsUpdate=nt,P.pointLights.needsUpdate=nt,P.pointLightShadows.needsUpdate=nt,P.spotLights.needsUpdate=nt,P.spotLightShadows.needsUpdate=nt,P.rectAreaLights.needsUpdate=nt,P.hemisphereLights.needsUpdate=nt}function pr(P){return P.isMeshLambertMaterial||P.isMeshToonMaterial||P.isMeshPhongMaterial||P.isMeshStandardMaterial||P.isShadowMaterial||P.isShaderMaterial&&P.lights===!0}this.getActiveCubeFace=function(){return M},this.getActiveMipmapLevel=function(){return S},this.getRenderTarget=function(){return E},this.setRenderTargetTextures=function(P,nt,ht){dt.get(P.texture).__webglTexture=nt,dt.get(P.depthTexture).__webglTexture=ht;const ct=dt.get(P);ct.__hasExternalTextures=!0,ct.__autoAllocateDepthBuffer=ht===void 0,ct.__autoAllocateDepthBuffer||Z.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),ct.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(P,nt){const ht=dt.get(P);ht.__webglFramebuffer=nt,ht.__useDefaultFramebuffer=nt===void 0},this.setRenderTarget=function(P,nt=0,ht=0){E=P,M=nt,S=ht;let ct=!0,st=null,Et=!1,Ft=!1;if(P){const Wt=dt.get(P);if(Wt.__useDefaultFramebuffer!==void 0)ut.bindFramebuffer(D.FRAMEBUFFER,null),ct=!1;else if(Wt.__webglFramebuffer===void 0)I.setupRenderTarget(P);else if(Wt.__hasExternalTextures)I.rebindTextures(P,dt.get(P.texture).__webglTexture,dt.get(P.depthTexture).__webglTexture);else if(P.depthBuffer){const Xt=P.depthTexture;if(Wt.__boundDepthTexture!==Xt){if(Xt!==null&&dt.has(Xt)&&(P.width!==Xt.image.width||P.height!==Xt.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");I.setupDepthRenderbuffer(P)}}const se=P.texture;(se.isData3DTexture||se.isDataArrayTexture||se.isCompressedArrayTexture)&&(Ft=!0);const fe=dt.get(P).__webglFramebuffer;P.isWebGLCubeRenderTarget?(Array.isArray(fe[nt])?st=fe[nt][ht]:st=fe[nt],Et=!0):P.samples>0&&I.useMultisampledRTT(P)===!1?st=dt.get(P).__webglMultisampledFramebuffer:Array.isArray(fe)?st=fe[ht]:st=fe,T.copy(P.viewport),U.copy(P.scissor),O=P.scissorTest}else T.copy($).multiplyScalar(H).floor(),U.copy(V).multiplyScalar(H).floor(),O=tt;if(ut.bindFramebuffer(D.FRAMEBUFFER,st)&&ct&&ut.drawBuffers(P,st),ut.viewport(T),ut.scissor(U),ut.setScissorTest(O),Et){const Wt=dt.get(P.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+nt,Wt.__webglTexture,ht)}else if(Ft){const Wt=dt.get(P.texture),se=nt||0;D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,Wt.__webglTexture,ht||0,se)}y=-1},this.readRenderTargetPixels=function(P,nt,ht,ct,st,Et,Ft){if(!(P&&P.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Vt=dt.get(P).__webglFramebuffer;if(P.isWebGLCubeRenderTarget&&Ft!==void 0&&(Vt=Vt[Ft]),Vt){ut.bindFramebuffer(D.FRAMEBUFFER,Vt);try{const Wt=P.texture,se=Wt.format,fe=Wt.type;if(!at.textureFormatReadable(se)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!at.textureTypeReadable(fe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}nt>=0&&nt<=P.width-ct&&ht>=0&&ht<=P.height-st&&D.readPixels(nt,ht,ct,st,Qt.convert(se),Qt.convert(fe),Et)}finally{const Wt=E!==null?dt.get(E).__webglFramebuffer:null;ut.bindFramebuffer(D.FRAMEBUFFER,Wt)}}},this.readRenderTargetPixelsAsync=async function(P,nt,ht,ct,st,Et,Ft){if(!(P&&P.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Vt=dt.get(P).__webglFramebuffer;if(P.isWebGLCubeRenderTarget&&Ft!==void 0&&(Vt=Vt[Ft]),Vt){const Wt=P.texture,se=Wt.format,fe=Wt.type;if(!at.textureFormatReadable(se))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!at.textureTypeReadable(fe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(nt>=0&&nt<=P.width-ct&&ht>=0&&ht<=P.height-st){ut.bindFramebuffer(D.FRAMEBUFFER,Vt);const Xt=D.createBuffer();D.bindBuffer(D.PIXEL_PACK_BUFFER,Xt),D.bufferData(D.PIXEL_PACK_BUFFER,Et.byteLength,D.STREAM_READ),D.readPixels(nt,ht,ct,st,Qt.convert(se),Qt.convert(fe),0);const me=E!==null?dt.get(E).__webglFramebuffer:null;ut.bindFramebuffer(D.FRAMEBUFFER,me);const Te=D.fenceSync(D.SYNC_GPU_COMMANDS_COMPLETE,0);return D.flush(),await rf(D,Te,4),D.bindBuffer(D.PIXEL_PACK_BUFFER,Xt),D.getBufferSubData(D.PIXEL_PACK_BUFFER,0,Et),D.deleteBuffer(Xt),D.deleteSync(Te),Et}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(P,nt=null,ht=0){P.isTexture!==!0&&(Xo("WebGLRenderer: copyFramebufferToTexture function signature has changed."),nt=arguments[0]||null,P=arguments[1]);const ct=Math.pow(2,-ht),st=Math.floor(P.image.width*ct),Et=Math.floor(P.image.height*ct),Ft=nt!==null?nt.x:0,Vt=nt!==null?nt.y:0;I.setTexture2D(P,0),D.copyTexSubImage2D(D.TEXTURE_2D,ht,0,0,Ft,Vt,st,Et),ut.unbindTexture()},this.copyTextureToTexture=function(P,nt,ht=null,ct=null,st=0){P.isTexture!==!0&&(Xo("WebGLRenderer: copyTextureToTexture function signature has changed."),ct=arguments[0]||null,P=arguments[1],nt=arguments[2],st=arguments[3]||0,ht=null);let Et,Ft,Vt,Wt,se,fe,Xt,me,Te;const Se=P.isCompressedTexture?P.mipmaps[st]:P.image;ht!==null?(Et=ht.max.x-ht.min.x,Ft=ht.max.y-ht.min.y,Vt=ht.isBox3?ht.max.z-ht.min.z:1,Wt=ht.min.x,se=ht.min.y,fe=ht.isBox3?ht.min.z:0):(Et=Se.width,Ft=Se.height,Vt=Se.depth||1,Wt=0,se=0,fe=0),ct!==null?(Xt=ct.x,me=ct.y,Te=ct.z):(Xt=0,me=0,Te=0);const qe=Qt.convert(nt.format),we=Qt.convert(nt.type);let Yt;nt.isData3DTexture?(I.setTexture3D(nt,0),Yt=D.TEXTURE_3D):nt.isDataArrayTexture||nt.isCompressedArrayTexture?(I.setTexture2DArray(nt,0),Yt=D.TEXTURE_2D_ARRAY):(I.setTexture2D(nt,0),Yt=D.TEXTURE_2D),D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,nt.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,nt.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,nt.unpackAlignment);const vn=D.getParameter(D.UNPACK_ROW_LENGTH),xe=D.getParameter(D.UNPACK_IMAGE_HEIGHT),re=D.getParameter(D.UNPACK_SKIP_PIXELS),Tt=D.getParameter(D.UNPACK_SKIP_ROWS),xn=D.getParameter(D.UNPACK_SKIP_IMAGES);D.pixelStorei(D.UNPACK_ROW_LENGTH,Se.width),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,Se.height),D.pixelStorei(D.UNPACK_SKIP_PIXELS,Wt),D.pixelStorei(D.UNPACK_SKIP_ROWS,se),D.pixelStorei(D.UNPACK_SKIP_IMAGES,fe);const xi=P.isDataArrayTexture||P.isData3DTexture,ae=nt.isDataArrayTexture||nt.isData3DTexture;if(P.isRenderTargetTexture||P.isDepthTexture){const Je=dt.get(P),_i=dt.get(nt),_n=dt.get(Je.__renderTarget),Zn=dt.get(_i.__renderTarget);ut.bindFramebuffer(D.READ_FRAMEBUFFER,_n.__webglFramebuffer),ut.bindFramebuffer(D.DRAW_FRAMEBUFFER,Zn.__webglFramebuffer);for(let Kn=0;Kn<Vt;Kn++)xi&&D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,dt.get(P).__webglTexture,st,fe+Kn),P.isDepthTexture?(ae&&D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,dt.get(nt).__webglTexture,st,Te+Kn),D.blitFramebuffer(Wt,se,Et,Ft,Xt,me,Et,Ft,D.DEPTH_BUFFER_BIT,D.NEAREST)):ae?D.copyTexSubImage3D(Yt,st,Xt,me,Te+Kn,Wt,se,Et,Ft):D.copyTexSubImage2D(Yt,st,Xt,me,Te+Kn,Wt,se,Et,Ft);ut.bindFramebuffer(D.READ_FRAMEBUFFER,null),ut.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else ae?P.isDataTexture||P.isData3DTexture?D.texSubImage3D(Yt,st,Xt,me,Te,Et,Ft,Vt,qe,we,Se.data):nt.isCompressedArrayTexture?D.compressedTexSubImage3D(Yt,st,Xt,me,Te,Et,Ft,Vt,qe,Se.data):D.texSubImage3D(Yt,st,Xt,me,Te,Et,Ft,Vt,qe,we,Se):P.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,st,Xt,me,Et,Ft,qe,we,Se.data):P.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,st,Xt,me,Se.width,Se.height,qe,Se.data):D.texSubImage2D(D.TEXTURE_2D,st,Xt,me,Et,Ft,qe,we,Se);D.pixelStorei(D.UNPACK_ROW_LENGTH,vn),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,xe),D.pixelStorei(D.UNPACK_SKIP_PIXELS,re),D.pixelStorei(D.UNPACK_SKIP_ROWS,Tt),D.pixelStorei(D.UNPACK_SKIP_IMAGES,xn),st===0&&nt.generateMipmaps&&D.generateMipmap(Yt),ut.unbindTexture()},this.copyTextureToTexture3D=function(P,nt,ht=null,ct=null,st=0){return P.isTexture!==!0&&(Xo("WebGLRenderer: copyTextureToTexture3D function signature has changed."),ht=arguments[0]||null,ct=arguments[1]||null,P=arguments[2],nt=arguments[3],st=arguments[4]||0),Xo('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(P,nt,ht,ct,st)},this.initRenderTarget=function(P){dt.get(P).__webglFramebuffer===void 0&&I.setupRenderTarget(P)},this.initTexture=function(P){P.isCubeTexture?I.setTextureCube(P,0):P.isData3DTexture?I.setTexture3D(P,0):P.isDataArrayTexture||P.isCompressedArrayTexture?I.setTexture2DArray(P,0):I.setTexture2D(P,0),ut.unbindTexture()},this.resetState=function(){M=0,S=0,E=null,ut.reset(),Ee.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Ii}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorspace=_e._getDrawingBufferColorSpace(t),e.unpackColorSpace=_e._getUnpackColorSpace()}}class or extends pn{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Oe,this.environmentIntensity=1,this.environmentRotation=new Oe,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}}class bs extends Tn{constructor(t=null,e=1,n=1,i,o,r,a,l,c=Dn,h=Dn,d,u){super(null,r,a,l,c,h,i,o,d,u),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class es extends ye{constructor(t,e,n,i=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=i}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){const t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}}const Xs=new jt,Yh=new jt,Ur=[],$h=new Xe,wv=new jt,Lo=new ge,Do=new Fe;class Es extends ge{constructor(t,e,n){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new es(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let i=0;i<n;i++)this.setMatrixAt(i,wv)}computeBoundingBox(){const t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new Xe),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Xs),$h.copy(t.boundingBox).applyMatrix4(Xs),this.boundingBox.union($h)}computeBoundingSphere(){const t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new Fe),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Xs),Do.copy(t.boundingSphere).applyMatrix4(Xs),this.boundingSphere.union(Do)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){const n=e.morphTargetInfluences,i=this.morphTexture.source.data.data,o=n.length+1,r=t*o+1;for(let a=0;a<n.length;a++)n[a]=i[r+a]}raycast(t,e){const n=this.matrixWorld,i=this.count;if(Lo.geometry=this.geometry,Lo.material=this.material,Lo.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Do.copy(this.boundingSphere),Do.applyMatrix4(n),t.ray.intersectsSphere(Do)!==!1))for(let o=0;o<i;o++){this.getMatrixAt(o,Xs),Yh.multiplyMatrices(n,Xs),Lo.matrixWorld=Yh,Lo.raycast(t,Ur);for(let r=0,a=Ur.length;r<a;r++){const l=Ur[r];l.instanceId=o,l.object=this,e.push(l)}Ur.length=0}}setColorAt(t,e){this.instanceColor===null&&(this.instanceColor=new es(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3)}setMatrixAt(t,e){e.toArray(this.instanceMatrix.array,t*16)}setMorphAt(t,e){const n=e.morphTargetInfluences,i=n.length+1;this.morphTexture===null&&(this.morphTexture=new bs(new Float32Array(i*this.count),i,this.count,ir,Xn));const o=this.morphTexture.source.data.data;let r=0;for(let c=0;c<n.length;c++)r+=n[c];const a=this.geometry.morphTargetsRelative?1:1-r,l=i*t;o[l]=a,o.set(n,l+1)}updateMorphTargets(){}dispose(){return this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null),this}}function $a(s,t){return s-t}function yv(s,t){return s.z-t.z}function Mv(s,t){return t.z-s.z}class Sv{constructor(){this.index=0,this.pool=[],this.list=[]}push(t,e,n,i){const o=this.pool,r=this.list;this.index>=o.length&&o.push({start:-1,count:-1,z:-1,index:-1});const a=o[this.index];r.push(a),this.index++,a.start=t,a.count=e,a.z=n,a.index=i}reset(){this.list.length=0,this.index=0}}const In=new jt,bv=new Gt(1,1,1),ja=new fo,Fr=new Xe,us=new Fe,Io=new C,jh=new C,Ev=new C,Za=new Sv,Mn=new ge,Or=[];function Av(s,t,e=0){const n=t.itemSize;if(s.isInterleavedBufferAttribute||s.array.constructor!==t.array.constructor){const i=s.count;for(let o=0;o<i;o++)for(let r=0;r<n;r++)t.setComponent(o+e,r,s.getComponent(o,r))}else t.array.set(s.array,e*n);t.needsUpdate=!0}function ds(s,t){if(s.constructor!==t.constructor){const e=Math.min(s.length,t.length);for(let n=0;n<e;n++)t[n]=s[n]}else{const e=Math.min(s.length,t.length);t.set(new s.constructor(s.buffer,0,e))}}class Tv extends ge{get maxInstanceCount(){return this._maxInstanceCount}get instanceCount(){return this._instanceInfo.length-this._availableInstanceIds.length}get unusedVertexCount(){return this._maxVertexCount-this._nextVertexStart}get unusedIndexCount(){return this._maxIndexCount-this._nextIndexStart}constructor(t,e,n=e*2,i){super(new oe,i),this.isBatchedMesh=!0,this.perObjectFrustumCulled=!0,this.sortObjects=!0,this.boundingBox=null,this.boundingSphere=null,this.customSort=null,this._instanceInfo=[],this._geometryInfo=[],this._availableInstanceIds=[],this._availableGeometryIds=[],this._nextIndexStart=0,this._nextVertexStart=0,this._geometryCount=0,this._visibilityChanged=!0,this._geometryInitialized=!1,this._maxInstanceCount=t,this._maxVertexCount=e,this._maxIndexCount=n,this._multiDrawCounts=new Int32Array(t),this._multiDrawStarts=new Int32Array(t),this._multiDrawCount=0,this._multiDrawInstances=null,this._matricesTexture=null,this._indirectTexture=null,this._colorsTexture=null,this._initMatricesTexture(),this._initIndirectTexture()}_initMatricesTexture(){let t=Math.sqrt(this._maxInstanceCount*4);t=Math.ceil(t/4)*4,t=Math.max(t,4);const e=new Float32Array(t*t*4),n=new bs(e,t,t,En,Xn);this._matricesTexture=n}_initIndirectTexture(){let t=Math.sqrt(this._maxInstanceCount);t=Math.ceil(t);const e=new Uint32Array(t*t),n=new bs(e,t,t,ua,ki);this._indirectTexture=n}_initColorsTexture(){let t=Math.sqrt(this._maxInstanceCount);t=Math.ceil(t);const e=new Float32Array(t*t*4).fill(1),n=new bs(e,t,t,En,Xn);n.colorSpace=_e.workingColorSpace,this._colorsTexture=n}_initializeGeometry(t){const e=this.geometry,n=this._maxVertexCount,i=this._maxIndexCount;if(this._geometryInitialized===!1){for(const o in t.attributes){const r=t.getAttribute(o),{array:a,itemSize:l,normalized:c}=r,h=new a.constructor(n*l),d=new ye(h,l,c);e.setAttribute(o,d)}if(t.getIndex()!==null){const o=n>65535?new Uint32Array(i):new Uint16Array(i);e.setIndex(new ye(o,1))}this._geometryInitialized=!0}}_validateGeometry(t){const e=this.geometry;if(!!t.getIndex()!=!!e.getIndex())throw new Error('BatchedMesh: All geometries must consistently have "index".');for(const n in e.attributes){if(!t.hasAttribute(n))throw new Error(`BatchedMesh: Added geometry missing "${n}". All geometries must have consistent attributes.`);const i=t.getAttribute(n),o=e.getAttribute(n);if(i.itemSize!==o.itemSize||i.normalized!==o.normalized)throw new Error("BatchedMesh: All attributes must have a consistent itemSize and normalized value.")}}setCustomSort(t){return this.customSort=t,this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Xe);const t=this.boundingBox,e=this._instanceInfo;t.makeEmpty();for(let n=0,i=e.length;n<i;n++){if(e[n].active===!1)continue;const o=e[n].geometryIndex;this.getMatrixAt(n,In),this.getBoundingBoxAt(o,Fr).applyMatrix4(In),t.union(Fr)}}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Fe);const t=this.boundingSphere,e=this._instanceInfo;t.makeEmpty();for(let n=0,i=e.length;n<i;n++){if(e[n].active===!1)continue;const o=e[n].geometryIndex;this.getMatrixAt(n,In),this.getBoundingSphereAt(o,us).applyMatrix4(In),t.union(us)}}addInstance(t){if(this._instanceInfo.length>=this.maxInstanceCount&&this._availableInstanceIds.length===0)throw new Error("BatchedMesh: Maximum item count reached.");const n={visible:!0,active:!0,geometryIndex:t};let i=null;this._availableInstanceIds.length>0?(this._availableInstanceIds.sort($a),i=this._availableInstanceIds.shift(),this._instanceInfo[i]=n):(i=this._instanceInfo.length,this._instanceInfo.push(n));const o=this._matricesTexture;In.identity().toArray(o.image.data,i*16),o.needsUpdate=!0;const r=this._colorsTexture;return r&&(bv.toArray(r.image.data,i*4),r.needsUpdate=!0),this._visibilityChanged=!0,i}addGeometry(t,e=-1,n=-1){this._initializeGeometry(t),this._validateGeometry(t);const i={vertexStart:-1,vertexCount:-1,reservedVertexCount:-1,indexStart:-1,indexCount:-1,reservedIndexCount:-1,start:-1,count:-1,boundingBox:null,boundingSphere:null,active:!0},o=this._geometryInfo;i.vertexStart=this._nextVertexStart,i.reservedVertexCount=e===-1?t.getAttribute("position").count:e;const r=t.getIndex();if(r!==null&&(i.indexStart=this._nextIndexStart,i.reservedIndexCount=n===-1?r.count:n),i.indexStart!==-1&&i.indexStart+i.reservedIndexCount>this._maxIndexCount||i.vertexStart+i.reservedVertexCount>this._maxVertexCount)throw new Error("BatchedMesh: Reserved space request exceeds the maximum buffer size.");let l;return this._availableGeometryIds.length>0?(this._availableGeometryIds.sort($a),l=this._availableGeometryIds.shift(),o[l]=i):(l=this._geometryCount,this._geometryCount++,o.push(i)),this.setGeometryAt(l,t),this._nextIndexStart=i.indexStart+i.reservedIndexCount,this._nextVertexStart=i.vertexStart+i.reservedVertexCount,l}setGeometryAt(t,e){if(t>=this._geometryCount)throw new Error("BatchedMesh: Maximum geometry count reached.");this._validateGeometry(e);const n=this.geometry,i=n.getIndex()!==null,o=n.getIndex(),r=e.getIndex(),a=this._geometryInfo[t];if(i&&r.count>a.reservedIndexCount||e.attributes.position.count>a.reservedVertexCount)throw new Error("BatchedMesh: Reserved space not large enough for provided geometry.");const l=a.vertexStart,c=a.reservedVertexCount;a.vertexCount=e.getAttribute("position").count;for(const h in n.attributes){const d=e.getAttribute(h),u=n.getAttribute(h);Av(d,u,l);const g=d.itemSize;for(let f=d.count,v=c;f<v;f++){const p=l+f;for(let m=0;m<g;m++)u.setComponent(p,m,0)}u.needsUpdate=!0,u.addUpdateRange(l*g,c*g)}if(i){const h=a.indexStart,d=a.reservedIndexCount;a.indexCount=e.getIndex().count;for(let u=0;u<r.count;u++)o.setX(h+u,l+r.getX(u));for(let u=r.count,g=d;u<g;u++)o.setX(h+u,l);o.needsUpdate=!0,o.addUpdateRange(h,a.reservedIndexCount)}return a.start=i?a.indexStart:a.vertexStart,a.count=i?a.indexCount:a.vertexCount,a.boundingBox=null,e.boundingBox!==null&&(a.boundingBox=e.boundingBox.clone()),a.boundingSphere=null,e.boundingSphere!==null&&(a.boundingSphere=e.boundingSphere.clone()),this._visibilityChanged=!0,t}deleteGeometry(t){const e=this._geometryInfo;if(t>=e.length||e[t].active===!1)return this;const n=this._instanceInfo;for(let i=0,o=n.length;i<o;i++)n[i].geometryIndex===t&&this.deleteInstance(i);return e[t].active=!1,this._availableGeometryIds.push(t),this._visibilityChanged=!0,this}deleteInstance(t){const e=this._instanceInfo;return t>=e.length||e[t].active===!1?this:(e[t].active=!1,this._availableInstanceIds.push(t),this._visibilityChanged=!0,this)}optimize(){let t=0,e=0;const n=this._geometryInfo,i=n.map((r,a)=>a).sort((r,a)=>n[r].vertexStart-n[a].vertexStart),o=this.geometry;for(let r=0,a=n.length;r<a;r++){const l=i[r],c=n[l];if(c.active!==!1){if(o.index!==null){if(c.indexStart!==e){const{indexStart:h,vertexStart:d,reservedIndexCount:u}=c,g=o.index,f=g.array,v=t-d;for(let p=h;p<h+u;p++)f[p]=f[p]+v;g.array.copyWithin(e,h,h+u),g.addUpdateRange(e,u),c.indexStart=e}e+=c.reservedIndexCount}if(c.vertexStart!==t){const{vertexStart:h,reservedVertexCount:d}=c,u=o.attributes;for(const g in u){const f=u[g],{array:v,itemSize:p}=f;v.copyWithin(t*p,h*p,(h+d)*p),f.addUpdateRange(t*p,d*p)}c.vertexStart=t}t+=c.reservedVertexCount,c.start=o.index?c.indexStart:c.vertexStart,this._nextIndexStart=o.index?c.indexStart+c.reservedIndexCount:0,this._nextVertexStart=c.vertexStart+c.reservedVertexCount}}return this}getBoundingBoxAt(t,e){if(t>=this._geometryCount)return null;const n=this.geometry,i=this._geometryInfo[t];if(i.boundingBox===null){const o=new Xe,r=n.index,a=n.attributes.position;for(let l=i.start,c=i.start+i.count;l<c;l++){let h=l;r&&(h=r.getX(h)),o.expandByPoint(Io.fromBufferAttribute(a,h))}i.boundingBox=o}return e.copy(i.boundingBox),e}getBoundingSphereAt(t,e){if(t>=this._geometryCount)return null;const n=this.geometry,i=this._geometryInfo[t];if(i.boundingSphere===null){const o=new Fe;this.getBoundingBoxAt(t,Fr),Fr.getCenter(o.center);const r=n.index,a=n.attributes.position;let l=0;for(let c=i.start,h=i.start+i.count;c<h;c++){let d=c;r&&(d=r.getX(d)),Io.fromBufferAttribute(a,d),l=Math.max(l,o.center.distanceToSquared(Io))}o.radius=Math.sqrt(l),i.boundingSphere=o}return e.copy(i.boundingSphere),e}setMatrixAt(t,e){const n=this._instanceInfo,i=this._matricesTexture,o=this._matricesTexture.image.data;return t>=n.length||n[t].active===!1?this:(e.toArray(o,t*16),i.needsUpdate=!0,this)}getMatrixAt(t,e){const n=this._instanceInfo,i=this._matricesTexture.image.data;return t>=n.length||n[t].active===!1?null:e.fromArray(i,t*16)}setColorAt(t,e){this._colorsTexture===null&&this._initColorsTexture();const n=this._colorsTexture,i=this._colorsTexture.image.data,o=this._instanceInfo;return t>=o.length||o[t].active===!1?this:(e.toArray(i,t*4),n.needsUpdate=!0,this)}getColorAt(t,e){const n=this._colorsTexture.image.data,i=this._instanceInfo;return t>=i.length||i[t].active===!1?null:e.fromArray(n,t*4)}setVisibleAt(t,e){const n=this._instanceInfo;return t>=n.length||n[t].active===!1||n[t].visible===e?this:(n[t].visible=e,this._visibilityChanged=!0,this)}getVisibleAt(t){const e=this._instanceInfo;return t>=e.length||e[t].active===!1?!1:e[t].visible}setGeometryIdAt(t,e){const n=this._instanceInfo,i=this._geometryInfo;return t>=n.length||n[t].active===!1||e>=i.length||i[e].active===!1?null:(n[t].geometryIndex=e,this)}getGeometryIdAt(t){const e=this._instanceInfo;return t>=e.length||e[t].active===!1?-1:e[t].geometryIndex}getGeometryRangeAt(t,e={}){if(t<0||t>=this._geometryCount)return null;const n=this._geometryInfo[t];return e.vertexStart=n.vertexStart,e.vertexCount=n.vertexCount,e.reservedVertexCount=n.reservedVertexCount,e.indexStart=n.indexStart,e.indexCount=n.indexCount,e.reservedIndexCount=n.reservedIndexCount,e.start=n.start,e.count=n.count,e}setInstanceCount(t){const e=this._availableInstanceIds,n=this._instanceInfo;for(e.sort($a);e[e.length-1]===n.length;)n.pop(),e.pop();if(t<n.length)throw new Error(`BatchedMesh: Instance ids outside the range ${t} are being used. Cannot shrink instance count.`);const i=new Int32Array(t),o=new Int32Array(t);ds(this._multiDrawCounts,i),ds(this._multiDrawStarts,o),this._multiDrawCounts=i,this._multiDrawStarts=o,this._maxInstanceCount=t;const r=this._indirectTexture,a=this._matricesTexture,l=this._colorsTexture;r.dispose(),this._initIndirectTexture(),ds(r.image.data,this._indirectTexture.image.data),a.dispose(),this._initMatricesTexture(),ds(a.image.data,this._matricesTexture.image.data),l&&(l.dispose(),this._initColorsTexture(),ds(l.image.data,this._colorsTexture.image.data))}setGeometrySize(t,e){const n=[...this._geometryInfo].filter(a=>a.active);if(Math.max(...n.map(a=>a.vertexStart+a.reservedVertexCount))>t)throw new Error(`BatchedMesh: Geometry vertex values are being used outside the range ${e}. Cannot shrink further.`);if(this.geometry.index&&Math.max(...n.map(l=>l.indexStart+l.reservedIndexCount))>e)throw new Error(`BatchedMesh: Geometry index values are being used outside the range ${e}. Cannot shrink further.`);const o=this.geometry;o.dispose(),this._maxVertexCount=t,this._maxIndexCount=e,this._geometryInitialized&&(this._geometryInitialized=!1,this.geometry=new oe,this._initializeGeometry(o));const r=this.geometry;o.index&&ds(o.index.array,r.index.array);for(const a in o.attributes)ds(o.attributes[a].array,r.attributes[a].array)}raycast(t,e){const n=this._instanceInfo,i=this._geometryInfo,o=this.matrixWorld,r=this.geometry;Mn.material=this.material,Mn.geometry.index=r.index,Mn.geometry.attributes=r.attributes,Mn.geometry.boundingBox===null&&(Mn.geometry.boundingBox=new Xe),Mn.geometry.boundingSphere===null&&(Mn.geometry.boundingSphere=new Fe);for(let a=0,l=n.length;a<l;a++){if(!n[a].visible||!n[a].active)continue;const c=n[a].geometryIndex,h=i[c];Mn.geometry.setDrawRange(h.start,h.count),this.getMatrixAt(a,Mn.matrixWorld).premultiply(o),this.getBoundingBoxAt(c,Mn.geometry.boundingBox),this.getBoundingSphereAt(c,Mn.geometry.boundingSphere),Mn.raycast(t,Or);for(let d=0,u=Or.length;d<u;d++){const g=Or[d];g.object=this,g.batchId=a,e.push(g)}Or.length=0}Mn.material=null,Mn.geometry.index=null,Mn.geometry.attributes={},Mn.geometry.setDrawRange(0,1/0)}copy(t){return super.copy(t),this.geometry=t.geometry.clone(),this.perObjectFrustumCulled=t.perObjectFrustumCulled,this.sortObjects=t.sortObjects,this.boundingBox=t.boundingBox!==null?t.boundingBox.clone():null,this.boundingSphere=t.boundingSphere!==null?t.boundingSphere.clone():null,this._geometryInfo=t._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox!==null?e.boundingBox.clone():null,boundingSphere:e.boundingSphere!==null?e.boundingSphere.clone():null})),this._instanceInfo=t._instanceInfo.map(e=>({...e})),this._maxInstanceCount=t._maxInstanceCount,this._maxVertexCount=t._maxVertexCount,this._maxIndexCount=t._maxIndexCount,this._geometryInitialized=t._geometryInitialized,this._geometryCount=t._geometryCount,this._multiDrawCounts=t._multiDrawCounts.slice(),this._multiDrawStarts=t._multiDrawStarts.slice(),this._matricesTexture=t._matricesTexture.clone(),this._matricesTexture.image.data=this._matricesTexture.image.data.slice(),this._colorsTexture!==null&&(this._colorsTexture=t._colorsTexture.clone(),this._colorsTexture.image.data=this._colorsTexture.image.data.slice()),this}dispose(){return this.geometry.dispose(),this._matricesTexture.dispose(),this._matricesTexture=null,this._indirectTexture.dispose(),this._indirectTexture=null,this._colorsTexture!==null&&(this._colorsTexture.dispose(),this._colorsTexture=null),this}onBeforeRender(t,e,n,i,o){if(!this._visibilityChanged&&!this.perObjectFrustumCulled&&!this.sortObjects)return;const r=i.getIndex(),a=r===null?1:r.array.BYTES_PER_ELEMENT,l=this._instanceInfo,c=this._multiDrawStarts,h=this._multiDrawCounts,d=this._geometryInfo,u=this.perObjectFrustumCulled,g=this._indirectTexture,f=g.image.data;u&&(In.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse).multiply(this.matrixWorld),ja.setFromProjectionMatrix(In,t.coordinateSystem));let v=0;if(this.sortObjects){In.copy(this.matrixWorld).invert(),Io.setFromMatrixPosition(n.matrixWorld).applyMatrix4(In),jh.set(0,0,-1).transformDirection(n.matrixWorld).transformDirection(In);for(let _=0,w=l.length;_<w;_++)if(l[_].visible&&l[_].active){const x=l[_].geometryIndex;this.getMatrixAt(_,In),this.getBoundingSphereAt(x,us).applyMatrix4(In);let A=!1;if(u&&(A=!ja.intersectsSphere(us)),!A){const M=d[x],S=Ev.subVectors(us.center,Io).dot(jh);Za.push(M.start,M.count,S,_)}}const p=Za.list,m=this.customSort;m===null?p.sort(o.transparent?Mv:yv):m.call(this,p,n);for(let _=0,w=p.length;_<w;_++){const x=p[_];c[v]=x.start*a,h[v]=x.count,f[v]=x.index,v++}Za.reset()}else for(let p=0,m=l.length;p<m;p++)if(l[p].visible&&l[p].active){const _=l[p].geometryIndex;let w=!1;if(u&&(this.getMatrixAt(p,In),this.getBoundingSphereAt(_,us).applyMatrix4(In),w=!ja.intersectsSphere(us)),!w){const x=d[_];c[v]=x.start*a,h[v]=x.count,f[v]=p,v++}}g.needsUpdate=!0,this._multiDrawCount=v,this._visibilityChanged=!1}onBeforeShadow(t,e,n,i,o,r){this.onBeforeRender(t,null,i,o,r)}}class Cv extends wo{static get type(){return"PointsMaterial"}constructor(t){super(),this.isPointsMaterial=!0,this.color=new Gt(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}}const Zh=new jt,sc=new du,kr=new Fe,Br=new C;class Rv extends pn{constructor(t=new oe,e=new Cv){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}raycast(t,e){const n=this.geometry,i=this.matrixWorld,o=t.params.Points.threshold,r=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),kr.copy(n.boundingSphere),kr.applyMatrix4(i),kr.radius+=o,t.ray.intersectsSphere(kr)===!1)return;Zh.copy(i).invert(),sc.copy(t.ray).applyMatrix4(Zh);const a=o/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=n.index,d=n.attributes.position;if(c!==null){const u=Math.max(0,r.start),g=Math.min(c.count,r.start+r.count);for(let f=u,v=g;f<v;f++){const p=c.getX(f);Br.fromBufferAttribute(d,p),Kh(Br,p,l,i,t,e,this)}}else{const u=Math.max(0,r.start),g=Math.min(d.count,r.start+r.count);for(let f=u,v=g;f<v;f++)Br.fromBufferAttribute(d,f),Kh(Br,f,l,i,t,e,this)}}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let o=0,r=i.length;o<r;o++){const a=i[o].name||String(o);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=o}}}}}function Kh(s,t,e,n,i,o,r){const a=sc.distanceSqToPoint(s);if(a<e){const l=new C;sc.closestPointToPoint(s,l),l.applyMatrix4(n);const c=i.ray.origin.distanceTo(l);if(c<i.near||c>i.far)return;o.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:t,face:null,faceIndex:null,barycoord:null,object:r})}}class cr extends Tn{constructor(t,e,n,i,o,r,a,l,c){super(t,e,n,i,o,r,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class mi{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(t,e){const n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){const t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const e=[];let n,i=this.getPoint(0),o=0;e.push(0);for(let r=1;r<=t;r++)n=this.getPoint(r/t),o+=n.distanceTo(i),e.push(o),i=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e){const n=this.getLengths();let i=0;const o=n.length;let r;e?r=e:r=t*n[o-1];let a=0,l=o-1,c;for(;a<=l;)if(i=Math.floor(a+(l-a)/2),c=n[i]-r,c<0)a=i+1;else if(c>0)l=i-1;else{l=i;break}if(i=l,n[i]===r)return i/(o-1);const h=n[i],u=n[i+1]-h,g=(r-h)/u;return(i+g)/(o-1)}getTangent(t,e){let i=t-1e-4,o=t+1e-4;i<0&&(i=0),o>1&&(o=1);const r=this.getPoint(i),a=this.getPoint(o),l=e||(r.isVector2?new Pt:new C);return l.copy(a).sub(r).normalize(),l}getTangentAt(t,e){const n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e){const n=new C,i=[],o=[],r=[],a=new C,l=new jt;for(let g=0;g<=t;g++){const f=g/t;i[g]=this.getTangentAt(f,new C)}o[0]=new C,r[0]=new C;let c=Number.MAX_VALUE;const h=Math.abs(i[0].x),d=Math.abs(i[0].y),u=Math.abs(i[0].z);h<=c&&(c=h,n.set(1,0,0)),d<=c&&(c=d,n.set(0,1,0)),u<=c&&n.set(0,0,1),a.crossVectors(i[0],n).normalize(),o[0].crossVectors(i[0],a),r[0].crossVectors(i[0],o[0]);for(let g=1;g<=t;g++){if(o[g]=o[g-1].clone(),r[g]=r[g-1].clone(),a.crossVectors(i[g-1],i[g]),a.length()>Number.EPSILON){a.normalize();const f=Math.acos(je(i[g-1].dot(i[g]),-1,1));o[g].applyMatrix4(l.makeRotationAxis(a,f))}r[g].crossVectors(i[g],o[g])}if(e===!0){let g=Math.acos(je(o[0].dot(o[t]),-1,1));g/=t,i[0].dot(a.crossVectors(o[0],o[t]))>0&&(g=-g);for(let f=1;f<=t;f++)o[f].applyMatrix4(l.makeRotationAxis(i[f],g*f)),r[f].crossVectors(i[f],o[f])}return{tangents:i,normals:o,binormals:r}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){const t={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}}class Mc extends mi{constructor(t=0,e=0,n=1,i=1,o=0,r=Math.PI*2,a=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=i,this.aStartAngle=o,this.aEndAngle=r,this.aClockwise=a,this.aRotation=l}getPoint(t,e=new Pt){const n=e,i=Math.PI*2;let o=this.aEndAngle-this.aStartAngle;const r=Math.abs(o)<Number.EPSILON;for(;o<0;)o+=i;for(;o>i;)o-=i;o<Number.EPSILON&&(r?o=0:o=i),this.aClockwise===!0&&!r&&(o===i?o=-i:o=o-i);const a=this.aStartAngle+t*o;let l=this.aX+this.xRadius*Math.cos(a),c=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){const h=Math.cos(this.aRotation),d=Math.sin(this.aRotation),u=l-this.aX,g=c-this.aY;l=u*h-g*d+this.aX,c=u*d+g*h+this.aY}return n.set(l,c)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){const t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}}class Pv extends Mc{constructor(t,e,n,i,o,r){super(t,e,n,n,i,o,r),this.isArcCurve=!0,this.type="ArcCurve"}}function Sc(){let s=0,t=0,e=0,n=0;function i(o,r,a,l){s=o,t=a,e=-3*o+3*r-2*a-l,n=2*o-2*r+a+l}return{initCatmullRom:function(o,r,a,l,c){i(r,a,c*(a-o),c*(l-r))},initNonuniformCatmullRom:function(o,r,a,l,c,h,d){let u=(r-o)/c-(a-o)/(c+h)+(a-r)/h,g=(a-r)/h-(l-r)/(h+d)+(l-a)/d;u*=h,g*=h,i(r,a,u,g)},calc:function(o){const r=o*o,a=r*o;return s+t*o+e*r+n*a}}}const Hr=new C,Ka=new Sc,Ja=new Sc,Qa=new Sc;class Au extends mi{constructor(t=[],e=!1,n="centripetal",i=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=i}getPoint(t,e=new C){const n=e,i=this.points,o=i.length,r=(o-(this.closed?0:1))*t;let a=Math.floor(r),l=r-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/o)+1)*o:l===0&&a===o-1&&(a=o-2,l=1);let c,h;this.closed||a>0?c=i[(a-1)%o]:(Hr.subVectors(i[0],i[1]).add(i[0]),c=Hr);const d=i[a%o],u=i[(a+1)%o];if(this.closed||a+2<o?h=i[(a+2)%o]:(Hr.subVectors(i[o-1],i[o-2]).add(i[o-1]),h=Hr),this.curveType==="centripetal"||this.curveType==="chordal"){const g=this.curveType==="chordal"?.5:.25;let f=Math.pow(c.distanceToSquared(d),g),v=Math.pow(d.distanceToSquared(u),g),p=Math.pow(u.distanceToSquared(h),g);v<1e-4&&(v=1),f<1e-4&&(f=v),p<1e-4&&(p=v),Ka.initNonuniformCatmullRom(c.x,d.x,u.x,h.x,f,v,p),Ja.initNonuniformCatmullRom(c.y,d.y,u.y,h.y,f,v,p),Qa.initNonuniformCatmullRom(c.z,d.z,u.z,h.z,f,v,p)}else this.curveType==="catmullrom"&&(Ka.initCatmullRom(c.x,d.x,u.x,h.x,this.tension),Ja.initCatmullRom(c.y,d.y,u.y,h.y,this.tension),Qa.initCatmullRom(c.z,d.z,u.z,h.z,this.tension));return n.set(Ka.calc(l),Ja.calc(l),Qa.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(i.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const i=this.points[e];t.points.push(i.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(new C().fromArray(i))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}}function Jh(s,t,e,n,i){const o=(n-t)*.5,r=(i-e)*.5,a=s*s,l=s*a;return(2*e-2*n+o+r)*l+(-3*e+3*n-2*o-r)*a+o*s+e}function Lv(s,t){const e=1-s;return e*e*t}function Dv(s,t){return 2*(1-s)*s*t}function Iv(s,t){return s*s*t}function Jo(s,t,e,n){return Lv(s,t)+Dv(s,e)+Iv(s,n)}function zv(s,t){const e=1-s;return e*e*e*t}function Nv(s,t){const e=1-s;return 3*e*e*s*t}function Uv(s,t){return 3*(1-s)*s*s*t}function Fv(s,t){return s*s*s*t}function Qo(s,t,e,n,i){return zv(s,t)+Nv(s,e)+Uv(s,n)+Fv(s,i)}class Tu extends mi{constructor(t=new Pt,e=new Pt,n=new Pt,i=new Pt){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new Pt){const n=e,i=this.v0,o=this.v1,r=this.v2,a=this.v3;return n.set(Qo(t,i.x,o.x,r.x,a.x),Qo(t,i.y,o.y,r.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Ov extends mi{constructor(t=new C,e=new C,n=new C,i=new C){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new C){const n=e,i=this.v0,o=this.v1,r=this.v2,a=this.v3;return n.set(Qo(t,i.x,o.x,r.x,a.x),Qo(t,i.y,o.y,r.y,a.y),Qo(t,i.z,o.z,r.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Cu extends mi{constructor(t=new Pt,e=new Pt){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new Pt){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new Pt){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class kv extends mi{constructor(t=new C,e=new C){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new C){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new C){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Ru extends mi{constructor(t=new Pt,e=new Pt,n=new Pt){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new Pt){const n=e,i=this.v0,o=this.v1,r=this.v2;return n.set(Jo(t,i.x,o.x,r.x),Jo(t,i.y,o.y,r.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Pu extends mi{constructor(t=new C,e=new C,n=new C){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new C){const n=e,i=this.v0,o=this.v1,r=this.v2;return n.set(Jo(t,i.x,o.x,r.x),Jo(t,i.y,o.y,r.y),Jo(t,i.z,o.z,r.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Lu extends mi{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new Pt){const n=e,i=this.points,o=(i.length-1)*t,r=Math.floor(o),a=o-r,l=i[r===0?r:r-1],c=i[r],h=i[r>i.length-2?i.length-1:r+1],d=i[r>i.length-3?i.length-1:r+2];return n.set(Jh(a,l.x,c.x,h.x,d.x),Jh(a,l.y,c.y,h.y,d.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(i.clone())}return this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const i=this.points[e];t.points.push(i.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(new Pt().fromArray(i))}return this}}var oc=Object.freeze({__proto__:null,ArcCurve:Pv,CatmullRomCurve3:Au,CubicBezierCurve:Tu,CubicBezierCurve3:Ov,EllipseCurve:Mc,LineCurve:Cu,LineCurve3:kv,QuadraticBezierCurve:Ru,QuadraticBezierCurve3:Pu,SplineCurve:Lu});class Bv extends mi{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){const t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){const n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new oc[n](e,t))}return this}getPoint(t,e){const n=t*this.getLength(),i=this.getCurveLengths();let o=0;for(;o<i.length;){if(i[o]>=n){const r=i[o]-n,a=this.curves[o],l=a.getLength(),c=l===0?0:1-r/l;return a.getPointAt(c,e)}o++}return null}getLength(){const t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const t=[];let e=0;for(let n=0,i=this.curves.length;n<i;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){const e=[];let n;for(let i=0,o=this.curves;i<o.length;i++){const r=o[i],a=r.isEllipseCurve?t*2:r.isLineCurve||r.isLineCurve3?1:r.isSplineCurve?t*r.points.length:t,l=r.getPoints(a);for(let c=0;c<l.length;c++){const h=l[c];n&&n.equals(h)||(e.push(h),n=h)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const i=t.curves[e];this.curves.push(i.clone())}return this.autoClose=t.autoClose,this}toJSON(){const t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){const i=this.curves[e];t.curves.push(i.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const i=t.curves[e];this.curves.push(new oc[i.type]().fromJSON(i))}return this}}class Hv extends Bv{constructor(t){super(),this.type="Path",this.currentPoint=new Pt,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){const n=new Cu(this.currentPoint.clone(),new Pt(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,i){const o=new Ru(this.currentPoint.clone(),new Pt(t,e),new Pt(n,i));return this.curves.push(o),this.currentPoint.set(n,i),this}bezierCurveTo(t,e,n,i,o,r){const a=new Tu(this.currentPoint.clone(),new Pt(t,e),new Pt(n,i),new Pt(o,r));return this.curves.push(a),this.currentPoint.set(o,r),this}splineThru(t){const e=[this.currentPoint.clone()].concat(t),n=new Lu(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,i,o,r){const a=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+a,e+l,n,i,o,r),this}absarc(t,e,n,i,o,r){return this.absellipse(t,e,n,n,i,o,r),this}ellipse(t,e,n,i,o,r,a,l){const c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(t+c,e+h,n,i,o,r,a,l),this}absellipse(t,e,n,i,o,r,a,l){const c=new Mc(t,e,n,i,o,r,a,l);if(this.curves.length>0){const d=c.getPoint(0);d.equals(this.currentPoint)||this.lineTo(d.x,d.y)}this.curves.push(c);const h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){const t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}}class bc extends oe{constructor(t=[new Pt(0,-.5),new Pt(.5,0),new Pt(0,.5)],e=12,n=0,i=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:t,segments:e,phiStart:n,phiLength:i},e=Math.floor(e),i=je(i,0,Math.PI*2);const o=[],r=[],a=[],l=[],c=[],h=1/e,d=new C,u=new Pt,g=new C,f=new C,v=new C;let p=0,m=0;for(let _=0;_<=t.length-1;_++)switch(_){case 0:p=t[_+1].x-t[_].x,m=t[_+1].y-t[_].y,g.x=m*1,g.y=-p,g.z=m*0,v.copy(g),g.normalize(),l.push(g.x,g.y,g.z);break;case t.length-1:l.push(v.x,v.y,v.z);break;default:p=t[_+1].x-t[_].x,m=t[_+1].y-t[_].y,g.x=m*1,g.y=-p,g.z=m*0,f.copy(g),g.x+=v.x,g.y+=v.y,g.z+=v.z,g.normalize(),l.push(g.x,g.y,g.z),v.copy(f)}for(let _=0;_<=e;_++){const w=n+_*h*i,x=Math.sin(w),A=Math.cos(w);for(let M=0;M<=t.length-1;M++){d.x=t[M].x*x,d.y=t[M].y,d.z=t[M].x*A,r.push(d.x,d.y,d.z),u.x=_/e,u.y=M/(t.length-1),a.push(u.x,u.y);const S=l[3*M+0]*x,E=l[3*M+1],y=l[3*M+0]*A;c.push(S,E,y)}}for(let _=0;_<e;_++)for(let w=0;w<t.length-1;w++){const x=w+_*t.length,A=x,M=x+t.length,S=x+t.length+1,E=x+1;o.push(A,M,E),o.push(S,E,M)}this.setIndex(o),this.setAttribute("position",new yt(r,3)),this.setAttribute("uv",new yt(a,2)),this.setAttribute("normal",new yt(c,3))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new bc(t.points,t.segments,t.phiStart,t.phiLength)}}class Ec extends bc{constructor(t=1,e=1,n=4,i=8){const o=new Hv;o.absarc(0,-e/2,t,Math.PI*1.5,0),o.absarc(0,e/2,t,0,Math.PI*.5),super(o.getPoints(n),i),this.type="CapsuleGeometry",this.parameters={radius:t,length:e,capSegments:n,radialSegments:i}}static fromJSON(t){return new Ec(t.radius,t.length,t.capSegments,t.radialSegments)}}class Ac extends oe{constructor(t=1,e=32,n=0,i=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:i},e=Math.max(3,e);const o=[],r=[],a=[],l=[],c=new C,h=new Pt;r.push(0,0,0),a.push(0,0,1),l.push(.5,.5);for(let d=0,u=3;d<=e;d++,u+=3){const g=n+d/e*i;c.x=t*Math.cos(g),c.y=t*Math.sin(g),r.push(c.x,c.y,c.z),a.push(0,0,1),h.x=(r[u]/t+1)/2,h.y=(r[u+1]/t+1)/2,l.push(h.x,h.y)}for(let d=1;d<=e;d++)o.push(d,d+1,0);this.setIndex(o),this.setAttribute("position",new yt(r,3)),this.setAttribute("normal",new yt(a,3)),this.setAttribute("uv",new yt(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ac(t.radius,t.segments,t.thetaStart,t.thetaLength)}}class Me extends oe{constructor(t=1,e=1,n=1,i=32,o=1,r=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:i,heightSegments:o,openEnded:r,thetaStart:a,thetaLength:l};const c=this;i=Math.floor(i),o=Math.floor(o);const h=[],d=[],u=[],g=[];let f=0;const v=[],p=n/2;let m=0;_(),r===!1&&(t>0&&w(!0),e>0&&w(!1)),this.setIndex(h),this.setAttribute("position",new yt(d,3)),this.setAttribute("normal",new yt(u,3)),this.setAttribute("uv",new yt(g,2));function _(){const x=new C,A=new C;let M=0;const S=(e-t)/n;for(let E=0;E<=o;E++){const y=[],b=E/o,T=b*(e-t)+t;for(let U=0;U<=i;U++){const O=U/i,z=O*l+a,B=Math.sin(z),F=Math.cos(z);A.x=T*B,A.y=-b*n+p,A.z=T*F,d.push(A.x,A.y,A.z),x.set(B,S,F).normalize(),u.push(x.x,x.y,x.z),g.push(O,1-b),y.push(f++)}v.push(y)}for(let E=0;E<i;E++)for(let y=0;y<o;y++){const b=v[y][E],T=v[y+1][E],U=v[y+1][E+1],O=v[y][E+1];(t>0||y!==0)&&(h.push(b,T,O),M+=3),(e>0||y!==o-1)&&(h.push(T,U,O),M+=3)}c.addGroup(m,M,0),m+=M}function w(x){const A=f,M=new Pt,S=new C;let E=0;const y=x===!0?t:e,b=x===!0?1:-1;for(let U=1;U<=i;U++)d.push(0,p*b,0),u.push(0,b,0),g.push(.5,.5),f++;const T=f;for(let U=0;U<=i;U++){const z=U/i*l+a,B=Math.cos(z),F=Math.sin(z);S.x=y*F,S.y=p*b,S.z=y*B,d.push(S.x,S.y,S.z),u.push(0,b,0),M.x=B*.5+.5,M.y=F*.5*b+.5,g.push(M.x,M.y),f++}for(let U=0;U<i;U++){const O=A+U,z=T+U;x===!0?h.push(z,z+1,O):h.push(z+1,z,O),E+=3}c.addGroup(m,E,x===!0?1:2),m+=E}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Me(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class Tc extends Me{constructor(t=1,e=1,n=32,i=1,o=!1,r=0,a=Math.PI*2){super(0,t,e,n,i,o,r,a),this.type="ConeGeometry",this.parameters={radius:t,height:e,radialSegments:n,heightSegments:i,openEnded:o,thetaStart:r,thetaLength:a}}static fromJSON(t){return new Tc(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class Cc extends oe{constructor(t=[],e=[],n=1,i=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:n,detail:i};const o=[],r=[];a(i),c(n),h(),this.setAttribute("position",new yt(o,3)),this.setAttribute("normal",new yt(o.slice(),3)),this.setAttribute("uv",new yt(r,2)),i===0?this.computeVertexNormals():this.normalizeNormals();function a(_){const w=new C,x=new C,A=new C;for(let M=0;M<e.length;M+=3)g(e[M+0],w),g(e[M+1],x),g(e[M+2],A),l(w,x,A,_)}function l(_,w,x,A){const M=A+1,S=[];for(let E=0;E<=M;E++){S[E]=[];const y=_.clone().lerp(x,E/M),b=w.clone().lerp(x,E/M),T=M-E;for(let U=0;U<=T;U++)U===0&&E===M?S[E][U]=y:S[E][U]=y.clone().lerp(b,U/T)}for(let E=0;E<M;E++)for(let y=0;y<2*(M-E)-1;y++){const b=Math.floor(y/2);y%2===0?(u(S[E][b+1]),u(S[E+1][b]),u(S[E][b])):(u(S[E][b+1]),u(S[E+1][b+1]),u(S[E+1][b]))}}function c(_){const w=new C;for(let x=0;x<o.length;x+=3)w.x=o[x+0],w.y=o[x+1],w.z=o[x+2],w.normalize().multiplyScalar(_),o[x+0]=w.x,o[x+1]=w.y,o[x+2]=w.z}function h(){const _=new C;for(let w=0;w<o.length;w+=3){_.x=o[w+0],_.y=o[w+1],_.z=o[w+2];const x=p(_)/2/Math.PI+.5,A=m(_)/Math.PI+.5;r.push(x,1-A)}f(),d()}function d(){for(let _=0;_<r.length;_+=6){const w=r[_+0],x=r[_+2],A=r[_+4],M=Math.max(w,x,A),S=Math.min(w,x,A);M>.9&&S<.1&&(w<.2&&(r[_+0]+=1),x<.2&&(r[_+2]+=1),A<.2&&(r[_+4]+=1))}}function u(_){o.push(_.x,_.y,_.z)}function g(_,w){const x=_*3;w.x=t[x+0],w.y=t[x+1],w.z=t[x+2]}function f(){const _=new C,w=new C,x=new C,A=new C,M=new Pt,S=new Pt,E=new Pt;for(let y=0,b=0;y<o.length;y+=9,b+=6){_.set(o[y+0],o[y+1],o[y+2]),w.set(o[y+3],o[y+4],o[y+5]),x.set(o[y+6],o[y+7],o[y+8]),M.set(r[b+0],r[b+1]),S.set(r[b+2],r[b+3]),E.set(r[b+4],r[b+5]),A.copy(_).add(w).add(x).divideScalar(3);const T=p(A);v(M,b+0,_,T),v(S,b+2,w,T),v(E,b+4,x,T)}}function v(_,w,x,A){A<0&&_.x===1&&(r[w]=_.x-1),x.x===0&&x.z===0&&(r[w]=A/2/Math.PI+.5)}function p(_){return Math.atan2(_.z,-_.x)}function m(_){return Math.atan2(-_.y,Math.sqrt(_.x*_.x+_.z*_.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Cc(t.vertices,t.indices,t.radius,t.details)}}class Rc extends Cc{constructor(t=1,e=0){const n=(1+Math.sqrt(5))/2,i=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],o=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(i,o,t,e),this.type="IcosahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new Rc(t.radius,t.detail)}}class ii extends oe{constructor(t=1,e=32,n=16,i=0,o=Math.PI*2,r=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:i,phiLength:o,thetaStart:r,thetaLength:a},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));const l=Math.min(r+a,Math.PI);let c=0;const h=[],d=new C,u=new C,g=[],f=[],v=[],p=[];for(let m=0;m<=n;m++){const _=[],w=m/n;let x=0;m===0&&r===0?x=.5/e:m===n&&l===Math.PI&&(x=-.5/e);for(let A=0;A<=e;A++){const M=A/e;d.x=-t*Math.cos(i+M*o)*Math.sin(r+w*a),d.y=t*Math.cos(r+w*a),d.z=t*Math.sin(i+M*o)*Math.sin(r+w*a),f.push(d.x,d.y,d.z),u.copy(d).normalize(),v.push(u.x,u.y,u.z),p.push(M+x,1-w),_.push(c++)}h.push(_)}for(let m=0;m<n;m++)for(let _=0;_<e;_++){const w=h[m][_+1],x=h[m][_],A=h[m+1][_],M=h[m+1][_+1];(m!==0||r>0)&&g.push(w,x,M),(m!==n-1||l<Math.PI)&&g.push(x,A,M)}this.setIndex(g),this.setAttribute("position",new yt(f,3)),this.setAttribute("normal",new yt(v,3)),this.setAttribute("uv",new yt(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ii(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}class tr extends oe{constructor(t=1,e=.4,n=12,i=48,o=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:i,arc:o},n=Math.floor(n),i=Math.floor(i);const r=[],a=[],l=[],c=[],h=new C,d=new C,u=new C;for(let g=0;g<=n;g++)for(let f=0;f<=i;f++){const v=f/i*o,p=g/n*Math.PI*2;d.x=(t+e*Math.cos(p))*Math.cos(v),d.y=(t+e*Math.cos(p))*Math.sin(v),d.z=e*Math.sin(p),a.push(d.x,d.y,d.z),h.x=t*Math.cos(v),h.y=t*Math.sin(v),u.subVectors(d,h).normalize(),l.push(u.x,u.y,u.z),c.push(f/i),c.push(g/n)}for(let g=1;g<=n;g++)for(let f=1;f<=i;f++){const v=(i+1)*g+f-1,p=(i+1)*(g-1)+f-1,m=(i+1)*(g-1)+f,_=(i+1)*g+f;r.push(v,p,_),r.push(p,m,_)}this.setIndex(r),this.setAttribute("position",new yt(a,3)),this.setAttribute("normal",new yt(l,3)),this.setAttribute("uv",new yt(c,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new tr(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}}class Pc extends oe{constructor(t=new Pu(new C(-1,-1,0),new C(-1,1,0),new C(1,1,0)),e=64,n=1,i=8,o=!1){super(),this.type="TubeGeometry",this.parameters={path:t,tubularSegments:e,radius:n,radialSegments:i,closed:o};const r=t.computeFrenetFrames(e,o);this.tangents=r.tangents,this.normals=r.normals,this.binormals=r.binormals;const a=new C,l=new C,c=new Pt;let h=new C;const d=[],u=[],g=[],f=[];v(),this.setIndex(f),this.setAttribute("position",new yt(d,3)),this.setAttribute("normal",new yt(u,3)),this.setAttribute("uv",new yt(g,2));function v(){for(let w=0;w<e;w++)p(w);p(o===!1?e:0),_(),m()}function p(w){h=t.getPointAt(w/e,h);const x=r.normals[w],A=r.binormals[w];for(let M=0;M<=i;M++){const S=M/i*Math.PI*2,E=Math.sin(S),y=-Math.cos(S);l.x=y*x.x+E*A.x,l.y=y*x.y+E*A.y,l.z=y*x.z+E*A.z,l.normalize(),u.push(l.x,l.y,l.z),a.x=h.x+n*l.x,a.y=h.y+n*l.y,a.z=h.z+n*l.z,d.push(a.x,a.y,a.z)}}function m(){for(let w=1;w<=e;w++)for(let x=1;x<=i;x++){const A=(i+1)*(w-1)+(x-1),M=(i+1)*w+(x-1),S=(i+1)*w+x,E=(i+1)*(w-1)+x;f.push(A,M,E),f.push(M,S,E)}}function _(){for(let w=0;w<=e;w++)for(let x=0;x<=i;x++)c.x=w/e,c.y=x/i,g.push(c.x,c.y)}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){const t=super.toJSON();return t.path=this.parameters.path.toJSON(),t}static fromJSON(t){return new Pc(new oc[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}}class ce extends wo{static get type(){return"MeshStandardMaterial"}constructor(t){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.color=new Gt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Gt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ru,this.normalScale=new Pt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Oe,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class zo extends ce{static get type(){return"MeshPhysicalMaterial"}constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new Pt(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return je(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Gt(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Gt(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Gt(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){this._dispersion>0!=t>0&&this.version++,this._dispersion=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}}class Gv extends pn{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Gt(t),this.intensity=e}dispose(){}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(e.object.target=this.target.uuid),e}}const tl=new jt,Qh=new C,t0=new C;class Vv{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Pt(512,512),this.map=null,this.mapPass=null,this.matrix=new jt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new fo,this._frameExtents=new Pt(1,1),this._viewportCount=1,this._viewports=[new ke(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,n=this.matrix;Qh.setFromMatrixPosition(t.matrixWorld),e.position.copy(Qh),t0.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(t0),e.updateMatrixWorld(),tl.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(tl),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(tl)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}class Wv extends Vv{constructor(){super(new lr(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Xv extends Gv{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(pn.DEFAULT_UP),this.updateMatrix(),this.target=new pn,this.shadow=new Wv}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:dc}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=dc);const el=new jt;class pa{constructor(t){t=t||{},this.zNear=t.webGL===!0?-1:0,this.vertices={near:[new C,new C,new C,new C],far:[new C,new C,new C,new C]},t.projectionMatrix!==void 0&&this.setFromProjectionMatrix(t.projectionMatrix,t.maxFar||1e4)}setFromProjectionMatrix(t,e){const n=this.zNear,i=t.elements[2*4+3]===0;return el.copy(t).invert(),this.vertices.near[0].set(1,1,n),this.vertices.near[1].set(1,-1,n),this.vertices.near[2].set(-1,-1,n),this.vertices.near[3].set(-1,1,n),this.vertices.near.forEach(function(o){o.applyMatrix4(el)}),this.vertices.far[0].set(1,1,1),this.vertices.far[1].set(1,-1,1),this.vertices.far[2].set(-1,-1,1),this.vertices.far[3].set(-1,1,1),this.vertices.far.forEach(function(o){o.applyMatrix4(el);const r=Math.abs(o.z);i?o.z*=Math.min(e/r,1):o.multiplyScalar(Math.min(e/r,1))}),this.vertices}split(t,e){for(;t.length>e.length;)e.push(new pa);e.length=t.length;for(let n=0;n<t.length;n++){const i=e[n];if(n===0)for(let o=0;o<4;o++)i.vertices.near[o].copy(this.vertices.near[o]);else for(let o=0;o<4;o++)i.vertices.near[o].lerpVectors(this.vertices.near[o],this.vertices.far[o],t[n-1]);if(n===t.length-1)for(let o=0;o<4;o++)i.vertices.far[o].copy(this.vertices.far[o]);else for(let o=0;o<4;o++)i.vertices.far[o].lerpVectors(this.vertices.near[o],this.vertices.far[o],t[n])}}toSpace(t,e){for(let n=0;n<4;n++)e.vertices.near[n].copy(this.vertices.near[n]).applyMatrix4(t),e.vertices.far[n].copy(this.vertices.far[n]).applyMatrix4(t)}}const e0={lights_fragment_begin:`
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
	`+he.lights_pars_begin},n0=new jt,nl=new pa({webGL:!0}),Ei=new C,No=new Xe,il=[],sl=[],ol=new jt,i0=new jt,qv=new C(0,1,0);class Yv{constructor(t){this.camera=t.camera,this.parent=t.parent,this.cascades=t.cascades||3,this.maxFar=t.maxFar||1e5,this.mode=t.mode||"practical",this.shadowMapSize=t.shadowMapSize||2048,this.shadowBias=t.shadowBias||1e-6,this.lightDirection=t.lightDirection||new C(1,-1,1).normalize(),this.lightIntensity=t.lightIntensity||3,this.lightNear=t.lightNear||1,this.lightFar=t.lightFar||2e3,this.lightMargin=t.lightMargin||200,this.customSplitsCallback=t.customSplitsCallback,this.fade=!1,this.mainFrustum=new pa({webGL:!0}),this.frustums=[],this.breaks=[],this.lights=[],this.shaders=new Map,this.createLights(),this.updateFrustums(),this.injectInclude()}createLights(){for(let t=0;t<this.cascades;t++){const e=new Xv(16777215,this.lightIntensity);e.castShadow=!0,e.shadow.mapSize.width=this.shadowMapSize,e.shadow.mapSize.height=this.shadowMapSize,e.shadow.camera.near=this.lightNear,e.shadow.camera.far=this.lightFar,e.shadow.bias=this.shadowBias,this.parent.add(e),this.parent.add(e.target),this.lights.push(e)}}initCascades(){const t=this.camera;t.updateProjectionMatrix(),this.mainFrustum.setFromProjectionMatrix(t.projectionMatrix,this.maxFar),this.mainFrustum.split(this.breaks,this.frustums)}updateShadowBounds(){const t=this.frustums;for(let e=0;e<t.length;e++){const i=this.lights[e].shadow.camera,o=this.frustums[e],r=o.vertices.near,a=o.vertices.far,l=a[0];let c;l.distanceTo(a[2])>l.distanceTo(r[2])?c=a[2]:c=r[2];let h=l.distanceTo(c);if(this.fade){const d=this.camera,u=Math.max(d.far,this.maxFar),g=o.vertices.far[0].z/(u-d.near),f=.25*Math.pow(g,2)*(u-d.near);h+=f}i.left=-h/2,i.right=h/2,i.top=h/2,i.bottom=-h/2,i.updateProjectionMatrix()}}getBreaks(){const t=this.camera,e=Math.min(t.far,this.maxFar);switch(this.breaks.length=0,this.mode){case"uniform":n(this.cascades,t.near,e,this.breaks);break;case"logarithmic":i(this.cascades,t.near,e,this.breaks);break;case"practical":o(this.cascades,t.near,e,.5,this.breaks);break;case"custom":this.customSplitsCallback===void 0&&console.error("CSM: Custom split scheme callback not defined."),this.customSplitsCallback(this.cascades,t.near,e,this.breaks);break}function n(r,a,l,c){for(let h=1;h<r;h++)c.push((a+(l-a)*h/r)/l);c.push(1)}function i(r,a,l,c){for(let h=1;h<r;h++)c.push(a*(l/a)**(h/r)/l);c.push(1)}function o(r,a,l,c,h){il.length=0,sl.length=0,i(r,a,l,sl),n(r,a,l,il);for(let d=1;d<r;d++)h.push(Vn.lerp(il[d-1],sl[d-1],c));h.push(1)}}update(){const t=this.camera,e=this.frustums;ol.lookAt(new C,this.lightDirection,qv),i0.copy(ol).invert();for(let n=0;n<e.length;n++){const i=this.lights[n],o=i.shadow.camera,r=(o.right-o.left)/this.shadowMapSize,a=(o.top-o.bottom)/this.shadowMapSize;n0.multiplyMatrices(i0,t.matrixWorld),e[n].toSpace(n0,nl);const l=nl.vertices.near,c=nl.vertices.far;No.makeEmpty();for(let h=0;h<4;h++)No.expandByPoint(l[h]),No.expandByPoint(c[h]);No.getCenter(Ei),Ei.z=No.max.z+this.lightMargin,Ei.x=Math.floor(Ei.x/r)*r,Ei.y=Math.floor(Ei.y/a)*a,Ei.applyMatrix4(ol),i.position.copy(Ei),i.target.position.copy(Ei),i.target.position.x+=this.lightDirection.x,i.target.position.y+=this.lightDirection.y,i.target.position.z+=this.lightDirection.z}}injectInclude(){he.lights_fragment_begin=e0.lights_fragment_begin,he.lights_pars_begin=e0.lights_pars_begin}setupMaterial(t){t.defines=t.defines||{},t.defines.USE_CSM=1,t.defines.CSM_CASCADES=this.cascades,this.fade&&(t.defines.CSM_FADE="");const e=[],n=this,i=this.shaders;t.onBeforeCompile=function(o){const r=Math.min(n.camera.far,n.maxFar);n.getExtendedBreaks(e),o.uniforms.CSM_cascades={value:e},o.uniforms.cameraNear={value:n.camera.near},o.uniforms.shadowFar={value:r},i.set(t,o)},i.set(t,null)}updateUniforms(){const t=Math.min(this.camera.far,this.maxFar);this.shaders.forEach(function(n,i){if(n!==null){const o=n.uniforms;this.getExtendedBreaks(o.CSM_cascades.value),o.cameraNear.value=this.camera.near,o.shadowFar.value=t}!this.fade&&"CSM_FADE"in i.defines?(delete i.defines.CSM_FADE,i.needsUpdate=!0):this.fade&&!("CSM_FADE"in i.defines)&&(i.defines.CSM_FADE="",i.needsUpdate=!0)},this)}getExtendedBreaks(t){for(;t.length<this.breaks.length;)t.push(new Pt);t.length=this.breaks.length;for(let e=0;e<this.cascades;e++){const n=this.breaks[e],i=this.breaks[e-1]||0;t[e].x=i,t[e].y=n}}updateFrustums(){this.getBreaks(),this.initCascades(),this.updateShadowBounds(),this.updateUniforms()}remove(){for(let t=0;t<this.lights.length;t++)this.parent.remove(this.lights[t].target),this.parent.remove(this.lights[t])}dispose(){const t=this.shaders;t.forEach(function(e,n){delete n.onBeforeCompile,delete n.defines.USE_CSM,delete n.defines.CSM_CASCADES,delete n.defines.CSM_FADE,e!==null&&(delete e.uniforms.CSM_cascades,delete e.uniforms.cameraNear,delete e.uniforms.shadowFar),n.needsUpdate=!0}),t.clear()}}const Li=new Uint8Array(512);{const s=new Uint8Array(256);for(let e=0;e<256;e++)s[e]=e;let t=625341585;for(let e=255;e>0;e--){t^=t<<13,t>>>=0,t^=t>>>17,t^=t<<5,t>>>=0;const n=t%(e+1),i=s[e];s[e]=s[n],s[n]=i}for(let e=0;e<512;e++)Li[e]=s[e&255]}const s0=[1,1,-1,1,1,-1,-1,-1,1,0,-1,0,0,1,0,-1];function o0(s){return s*s*s*(s*(s*6-15)+10)}function Bt(s,t){const e=Math.floor(s),n=Math.floor(t),i=s-e,o=t-n,r=e&255,a=n&255,l=o0(i),c=o0(o),h=(m,_,w)=>{const x=(m&7)*2;return s0[x]*_+s0[x+1]*w},d=Li[Li[r]+a],u=Li[Li[r]+a+1],g=Li[Li[r+1]+a],f=Li[Li[r+1]+a+1],v=h(d,i,o)+l*(h(g,i-1,o)-h(d,i,o)),p=h(u,i,o-1)+l*(h(f,i-1,o-1)-h(u,i,o-1));return(v+c*(p-v))*1.41}function Ie(s,t,e=5,n=2,i=.5){let o=.5,r=1,a=0,l=0;for(let c=0;c<e;c++)a+=o*Bt(s*r+c*17.13,t*r-c*9.71),l+=o,o*=i,r*=n;return a/l}function Uo(s,t,e=4){let n=.5,i=1,o=0;for(let r=0;r<e;r++){const a=1-Math.abs(Bt(s*i+r*3.3,t*i+r*7.7));o+=a*a*n,n*=.5,i*=2.1}return o}function St(s,t,e){const n=Math.min(1,Math.max(0,(e-s)/(t-s)));return n*n*(3-2*n)}function Jt(s,t,e){return s<t?t:s>e?e:s}function ie(s,t,e){return s+(t-s)*e}function ci(s,t,e){const n=Jt(.5+.5*(t-s)/e,0,1);return ie(t,s,n)-e*n*(1-n)}const $v=6,jv=1,Zv=new Gt(.26,.24,.2),Yi=[{el:-18,sun:[.5,.6,.85],sunI:.12,zen:[.006,.01,.024],hor:[.018,.024,.042],haze:[.014,.018,.03],sunHaze:[.02,.022,.03],amb:.15},{el:-8,sun:[.5,.6,.85],sunI:.12,zen:[.006,.011,.028],hor:[.035,.035,.065],haze:[.024,.026,.045],sunHaze:[.06,.03,.03],amb:.16},{el:-2,sun:[.9,.35,.15],sunI:.06,zen:[.015,.035,.1],hor:[.42,.22,.2],haze:[.22,.16,.2],sunHaze:[.9,.35,.18],amb:.4},{el:4,sun:[1,.5,.22],sunI:.3,zen:[.035,.1,.3],hor:[.82,.48,.34],haze:[.5,.4,.4],sunHaze:[1,.55,.3],amb:.85},{el:14,sun:[1,.74,.46],sunI:.62,zen:[.03,.11,.34],hor:[.66,.58,.54],haze:[.54,.52,.54],sunHaze:[1,.75,.5],amb:1},{el:30,sun:[1,.94,.84],sunI:.938,zen:[.022,.12,.32],hor:[.17,.29,.4],haze:[.48,.54,.64],sunHaze:[1,.92,.8],amb:1},{el:90,sun:[1,.97,.93],sunI:1,zen:[.02,.12,.32],hor:[.16,.29,.4],haze:[.47,.54,.65],sunHaze:[.98,.93,.84],amb:1}];function Kv(s){let t=Yi[0],e=Yi[Yi.length-1];for(let o=0;o<Yi.length-1;o++)if(s>=Yi[o].el&&s<=Yi[o+1].el){t=Yi[o],e=Yi[o+1];break}const n=St(t.el,e.el,Jt(s,t.el,e.el)),i=(o,r)=>[ie(o[0],r[0],n),ie(o[1],r[1],n),ie(o[2],r[2],n)];return{el:s,sun:i(t.sun,e.sun),sunI:ie(t.sunI,e.sunI,n),zen:i(t.zen,e.zen),hor:i(t.hor,e.hor),haze:i(t.haze,e.haze),sunHaze:i(t.sunHaze,e.sunHaze),amb:ie(t.amb,e.amb,n)}}const r0={clear:{coverage:.24,hazeDensity:15e-6,hazeHeight:1400,windSpeed:3.5,turbulence:.2,cloudBase:1500,cloudTop:2400,rain:0,sunDim:1},scattered:{coverage:.34,hazeDensity:19e-6,hazeHeight:1300,windSpeed:7,turbulence:.4,cloudBase:1300,cloudTop:2500,rain:0,sunDim:.97},cloudy:{coverage:.66,hazeDensity:32e-6,hazeHeight:1100,windSpeed:10,turbulence:.7,cloudBase:900,cloudTop:1800,rain:0,sunDim:.72},storm:{coverage:.92,hazeDensity:55e-6,hazeHeight:900,windSpeed:15,turbulence:1,cloudBase:700,cloudTop:2600,rain:1,sunDim:.4}};function Jv(s){const t=25.8*Math.PI/180,e=10*Math.PI/180,n=(s-12)*15*Math.PI/180,i=Math.sin(t)*Math.sin(e)+Math.cos(t)*Math.cos(e)*Math.cos(n),o=Math.asin(Jt(i,-1,1)),r=(Math.sin(e)-Math.sin(o)*Math.sin(t))/(Math.cos(o)*Math.cos(t)||1e-6);let a=Math.acos(Jt(r,-1,1));return n>0&&(a=2*Math.PI-a),{dir:new C(Math.cos(o)*Math.sin(a),Math.sin(o),-Math.cos(o)*Math.cos(a)).normalize(),elevation:o*180/Math.PI,azimuth:a*180/Math.PI}}class Qv{hour=14.5;weather="clear";preset=r0.clear;state={sunDir:new C(0,1,0),sunElevation:60,sunColor:new Gt,sunIntensity:3,zenith:new Gt,horizon:new Gt,haze:new Gt,sunHaze:new Gt,ground:new Gt,ambientIntensity:1,night:0};uniforms={uSunDir:{value:new C(0,1,0)},uSunColor:{value:new Gt(1,1,1)},uZenithColor:{value:new Gt},uHorizonColor:{value:new Gt},uHazeColor:{value:new Gt},uSunHazeColor:{value:new Gt},uGroundColor:{value:new Gt},uHazeDensity:{value:3e-5},uHazeHeight:{value:1300},uCloudCoverage:{value:.3},uCloudBase:{value:1500},uCloudTop:{value:2600},uCloudWind:{value:new Pt(0,0)},uCloudSeed:{value:0},uNight:{value:0},uTime:{value:0}};cloudOffset=new Pt;windDir=new Pt(1,.35).normalize();time=0;constructor(t){this.uniforms.uCloudSeed.value=t%1e3/1e3*37.7}setWeather(t){this.weather=t,this.preset=r0[t]}update(t){this.time+=t;const e=this.preset;this.cloudOffset.addScaledVector(this.windDir,e.windSpeed*2.2*t);const{dir:n,elevation:i}=Jv(this.hour),o=Kv(i),r=this.state,a=new C(-n.x,Math.max(.25,-n.y*.8+.3),-n.z).normalize(),l=St(0,-4,i);r.sunDir.copy(n).lerp(a,l).normalize(),r.sunElevation=i,r.sunColor.setRGB(o.sun[0],o.sun[1],o.sun[2]);const c=o.sunI*e.sunDim;r.sunIntensity=c*ie($v,jv,l),r.zenith.setRGB(o.zen[0],o.zen[1],o.zen[2]),r.horizon.setRGB(o.hor[0],o.hor[1],o.hor[2]),r.haze.setRGB(o.haze[0],o.haze[1],o.haze[2]),r.sunHaze.setRGB(o.sunHaze[0],o.sunHaze[1],o.sunHaze[2]),r.ambientIntensity=o.amb,r.night=1-St(-12,-1,i);const h=St(.45,.95,e.coverage),d=r.horizon.r*.2126+r.horizon.g*.7152+r.horizon.b*.0722,u=new Gt(d,d,d).lerp(r.horizon,.3),g=r.zenith.clone().lerp(u,h*.8),f=r.horizon.clone().lerp(u,h*.7).multiplyScalar(ie(1,.9,h)),v=r.haze.clone().lerp(new Gt(d,d,d),h*.6).multiplyScalar(ie(1,.9,h)),p=r.zenith.clone().lerp(r.horizon,.3);r.ground.copy(r.sunColor).multiplyScalar(r.sunIntensity*Math.max(r.sunDir.y,0)/Math.PI).add(p).multiply(Zv);const m=this.uniforms;m.uSunDir.value.copy(n),m.uSunColor.value.copy(r.sunColor).multiplyScalar(c),m.uZenithColor.value.copy(g),m.uHorizonColor.value.copy(f),m.uHazeColor.value.copy(v),m.uSunHazeColor.value.copy(r.sunHaze).multiplyScalar(ie(1,.6,h)),m.uGroundColor.value.copy(r.ground),m.uHazeDensity.value=e.hazeDensity,m.uHazeHeight.value=e.hazeHeight,m.uCloudCoverage.value=e.coverage,m.uCloudBase.value=e.cloudBase,m.uCloudTop.value=e.cloudTop,m.uCloudWind.value.copy(this.cloudOffset),m.uNight.value=r.night,m.uTime.value=this.time}}function a0(s){let t=2166136261;for(let e=0;e<s.length;e++)t^=s.charCodeAt(e),t=Math.imul(t,16777619)>>>0;return t>>>0}function rl(s,t,e=0){let n=(s|0)*374761393+(t|0)*668265263+(e|0)*2147483647;return n=(n^n>>>13)*1274126177,n=n^n>>>16,(n>>>0)/4294967296}class We{a;b;c;d;constructor(t){const e=typeof t=="string"?a0(t):t>>>0;this.a=e^2654435769,this.b=e*2246822507>>>0,this.c=e*3266489909>>>0,this.d=1;for(let n=0;n<12;n++)this.next()}next(){this.a>>>=0,this.b>>>=0,this.c>>>=0,this.d>>>=0;let t=this.a+this.b|0;return this.a=this.b^this.b>>>9,this.b=this.c+(this.c<<3)|0,this.c=this.c<<21|this.c>>>11,this.d=this.d+1|0,t=t+this.d|0,this.c=this.c+t|0,(t>>>0)/4294967296}range(t,e){return t+(e-t)*this.next()}int(t,e){return t+Math.floor(this.next()*(e-t+1))}pick(t){return t[Math.floor(this.next()*t.length)]}chance(t){return this.next()<t}gauss(){return(this.next()+this.next()+this.next()+this.next()-2)*1.7320508}fork(t){return new We(a0(t)^Math.floor(this.next()*4294967295))}}const po=2e4,ue=2048,Ms=po/ue,un=po/2;var ne=(s=>(s[s.OCEAN=0]="OCEAN",s[s.BAY=1]="BAY",s[s.BEACH=2]="BEACH",s[s.MANGROVE=3]="MANGROVE",s[s.PARK=4]="PARK",s[s.RES_LOW=5]="RES_LOW",s[s.RES_MID=6]="RES_MID",s[s.DOWNTOWN=7]="DOWNTOWN",s[s.HOTEL=8]="HOTEL",s[s.INDUSTRIAL=9]="INDUSTRIAL",s[s.AIRPORT=10]="AIRPORT",s[s.GOLF=11]="GOLF",s[s.ROCK=12]="ROCK",s[s.LOT=13]="LOT",s[s.CONSTRUCTION=14]="CONSTRUCTION",s[s.STADIUM=15]="STADIUM",s[s.MARINA=16]="MARINA",s[s.SANDBAR=17]="SANDBAR",s[s.ROAD=18]="ROAD",s[s.WETLAND_FLAT=19]="WETLAND_FLAT",s))(ne||{});const Du={cx:-1150,cz:-3050,hw:950,hh:300,rot:.04};function tx(s){let t=1/0,e=-1/0,n=1/0,i=-1/0;for(const[a,l]of s.pts)t=Math.min(t,a),e=Math.max(e,a),n=Math.min(n,l),i=Math.max(i,l);const o=(t+e)/2,r=(n+i)/2;return{...s,bx:o,bz:r,br:Math.max(e-t,i-n)/2+s.width+80}}function Qs(s,t,e,n,i,o,r,a=0){const l=Math.cos(-r),c=Math.sin(-r),h=s-e,d=t-n,u=h*l-d*c,g=h*c+d*l,f=Math.abs(u)-i+a,v=Math.abs(g)-o+a,p=Math.max(f,0),m=Math.max(v,0);return Math.hypot(p,m)+Math.min(Math.max(f,v),0)-a}function ln(s,t,e,n,i,o,r,a,l=.18){const c=Math.cos(-r),h=Math.sin(-r),d=s-e,u=t-n,g=d*c-u*h,f=d*h+u*c,v=Math.atan2(f/o,g/i),p=Ie(Math.cos(v)*1.7+a*13.1,Math.sin(v)*1.7+a*7.3,4),m=Bt(Math.cos(v)*4.1+a,Math.sin(v)*4.1-a),_=1+l*p+l*.35*m;return(Math.hypot(g/(i*_),f/(o*_))-1)*Math.min(i,o)*_}function Ss(s,t,e,n,i,o){const r=i-e,a=o-n,l=s-e,c=t-n,h=Jt((l*r+c*a)/(r*r+a*a||1),0,1);return Math.hypot(l-r*h,c-a*h)}function l0(s,t,e){let n=1/0;for(let i=0;i<e.length-1;i++)n=Math.min(n,Ss(s,t,e[i][0],e[i][1],e[i+1][0],e[i+1][1]));return n}function c0(s,t,e,n){let i=1/0;for(let o=0;o<e.length-1;o++){const[r,a]=e[o],[l,c]=e[o+1],h=l-r,d=c-a,u=s-r,g=t-a,f=Jt((u*h+g*d)/(h*h+d*d||1),0,1),v=Math.hypot(u-h*f,g-d*f)-ie(n[o],n[o+1],f);i=Math.min(i,v)}return i}const Fo={cx:195,cz:2520,rx:262,rz:380,rot:.05},dn=[[55,2190],[-5,1790]],Iu=42;function zu(s,t){return ln(s,t,200,2380,100,62,.5,15,.25)}function ex(s){let t=-2500+320*Ie(s/3400+3.1,.37,3)+110*Ie(s/800+9.2,1.1,3);return t+=520*Math.exp(-(((s+3800)/900)**2)),t+=220*Math.exp(-(((s+2500)/500)**2)),t-=250*St(1200,2400,s)*(1-St(3200,4200,s)),t}const Ji=[[-2100,-3050],[-2900,-2900],[-3700,-2650],[-4600,-2150],[-5500,-1500],[-6500,-700]],nx=[95,80,62,50,40,32];function ix(s){for(let t=0;t<Ji.length-1;t++){const[e,n]=Ji[t],[i,o]=Ji[t+1];if(s>=n&&s<=o)return ie(e,i,(s-n)/(o-n))}return s<Ji[0][1]?Ji[0][0]:Ji[Ji.length-1][0]}function sx(s){return-9e3+320*Ie(s/2600+1.3,.8,3)}function Nu(){return[{id:"lake-north",cx:-5900,cz:-6600,rx:480,rz:330,rot:.3,seed:61},{id:"lake-west",cx:-7550,cz:550,rx:520,rz:300,rot:-.2,seed:62},{id:"lake-south",cx:-4300,cz:4300,rx:380,rz:260,rot:.5,seed:63}]}function ox(){const s=[],t=Nu();s.push({id:"mainland",bx:-6e3,bz:0,br:2e4,sd:(a,l)=>{let c=a-ex(l);const h=c0(a,l,Ji,nx);c=Math.max(c,-h);for(const d of t)Math.abs(a-d.cx)>d.rx*1.6||Math.abs(l-d.cz)>d.rz*1.8||(c=Math.max(c,-ln(a,l,d.cx,d.cz,d.rx,d.rz,d.rot,d.seed,.22)));return c},beach:40,height:3.2,seabed:.02,shelf:3.2});const e=[[2750,-8200],[2700,-6800],[2640,-5400],[2600,-4e3],[2520,-2600],[2400,-1500],[2250,-900],[2050,-500]],n=[280,420,460,430,380,330,240,90];s.push({id:"barrier",bx:2500,bz:-4200,br:5200,sd:(a,l)=>{const c=c0(a,l,e,n),h=60*Ie(a/700+1.2,l/700+4.4,3);return c+h},beach:62,height:2.6,seabed:.012,shelf:6}),s.push({id:"garza",bx:190,bz:2450,br:1e3,sd:(a,l)=>{let c=ln(a,l,Fo.cx,Fo.cz,Fo.rx,Fo.rz,Fo.rot,11,.14);return c=ci(c,ln(a,l,260,2900,160,150,.1,12,.2),110),c=ci(c,ln(a,l,-10,2740,115,120,.3,13,.25),100),c=ci(c,ln(a,l,390,2500,100,150,0,17,.2),110),c=ci(c,ln(a,l,375,2160,85,115,.2,14,.2),110),c=ci(c,ln(a,l,130,2240,110,85,-.1,16,.2),100),c=ci(c,Ss(a,l,dn[0][0],dn[0][1],dn[1][0],dn[1][1])-Iu,60),c=Math.max(c,-zu(a,l)*2.5+12),c},beach:70,height:2.4,seabed:.01,shelf:3.5,isle:!0}),s.push({id:"isla-b",bx:-1350,bz:2560,br:800,sd:(a,l)=>ln(a,l,-1350,2560,420,260,.05,21,.2),beach:50,height:2.3,seabed:.012,shelf:3.5,isle:!0}),s.push({id:"southkey",bx:1900,bz:5700,br:3200,sd:(a,l)=>{let c=ln(a,l,1900,5700,1500,1050,.25,31,.14);return c=ci(c,ln(a,l,1e3,6400,700,500,-.3,32,.24),300),c=ci(c,ln(a,l,2900,4900,500,700,.5,33,.18),260),c},beach:80,height:2.8,seabed:.014,shelf:6,rocky:!0,isle:!0}),s.push({id:"tortuga",bx:1180,bz:-830,br:900,sd:(a,l)=>ci(ln(a,l,1180,-830,520,300,.35,51,.2),Ss(a,l,985,-410,1150,-650)-56,60),beach:55,height:2.3,seabed:.012,shelf:3.5,isle:!0});const i=Du;s.push({id:"port",bx:i.cx,bz:i.cz,br:1300,sd:(a,l)=>Qs(a,l,i.cx,i.cz,i.hw,i.hh,i.rot,30),beach:0,height:3,seabed:.06,shelf:6}),s.push({id:"isla-n1",bx:-450,bz:-3900,br:750,sd:(a,l)=>ln(a,l,-450,-3900,375,200,.1,41,.2),beach:45,height:2.3,seabed:.012,shelf:3.5,isle:!0}),s.push({id:"isla-n2",bx:700,bz:-4e3,br:800,sd:(a,l)=>ln(a,l,700,-4e3,400,210,-.15,42,.2),beach:45,height:2.3,seabed:.012,shelf:3.5,isle:!0}),s.push({id:"isla-n3",bx:1550,bz:-4100,br:650,sd:(a,l)=>ln(a,l,1550,-4100,315,170,.2,43,.22),beach:45,height:2.3,seabed:.012,shelf:3.5,isle:!0});for(let a=0;a<5;a++){const l=-3e3+a*330;s.push({id:`finger-${a}`,bx:1870-a*25,bz:l,br:520,sd:(c,h)=>Qs(c,h,1870-a*25,l,300,95,.02,40),beach:25,height:2.4,seabed:.05,shelf:3.5})}const o=new We("mangrove-islets"),r=[[-1700,-1800,900,600,9],[-1500,1300,800,500,8],[-500,-6200,1800,900,12],[900,-6600,1200,700,8],[700,4300,700,450,6],[-1e3,4600,1100,600,7]];for(const[a,l,c,h,d]of r)for(let u=0;u<d;u++){const g=a+o.gauss()*c*.45,f=l+o.gauss()*h*.45,v=o.range(70,240),p=o.range(60,180),m=o.range(0,Math.PI),_=o.int(100,900);s.push({id:`mang-${a}-${u}`,bx:g,bz:f,br:Math.max(v,p)*1.6+60,sd:(w,x)=>ln(w,x,g,f,v,p,m,_,.35),beach:0,height:.55,seabed:.004,shelf:1.6,wet:!0})}return s}function rx(){const s=[],t=e=>s.push(e);return t({id:"downtown",zone:7,cx:-2650,cz:-3900,hw:750,hh:620,rot:.02,gridX:130,gridZ:110,density:.92,hMin:40,hMax:260}),t({id:"brickell",zone:6,cx:-2900,cz:-2350,hw:550,hh:420,rot:.02,gridX:120,gridZ:120,density:.85,hMin:25,hMax:120}),t({id:"midtown",zone:6,cx:-3500,cz:-5300,hw:900,hh:700,rot:0,gridX:120,gridZ:140,density:.8,hMin:12,hMax:60}),t({id:"construction-dt",zone:14,cx:-2250,cz:-4250,hw:70,hh:60,rot:.02,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"construction-dt2",zone:14,cx:-3150,cz:-3550,hw:65,hh:55,rot:.02,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"construction-hotel",zone:14,cx:2480,cz:-2450,hw:60,hh:60,rot:-.1,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"stadium-lot",zone:13,cx:-2900,cz:-2e3,hw:330,hh:260,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"bayfront-park",zone:4,cx:-2050,cz:-4300,hw:170,hh:380,rot:.02,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"industrial-river",zone:9,cx:-3300,cz:-3050,hw:700,hh:380,rot:-.1,gridX:170,gridZ:160,density:.6,hMin:6,hMax:16}),t({id:"industrial-port",zone:9,cx:-1150,cz:-3050,hw:950,hh:300,rot:.04,gridX:0,gridZ:0,density:.5,hMin:6,hMax:14}),t({id:"airport",zone:10,cx:-7800,cz:-1400,hw:1100,hh:900,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"airstrip",zone:10,cx:2500,cz:5750,hw:700,hh:130,rot:.55,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"inland-golf",zone:11,cx:-5200,cz:-3950,hw:480,hh:380,rot:.1,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"west-golf",zone:11,cx:-6300,cz:3600,hw:500,hh:400,rot:-.15,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"north-park",zone:4,cx:-4350,cz:-6650,hw:380,hh:300,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"south-park",zone:4,cx:-4950,cz:2150,hw:420,hh:280,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"garza-park",zone:4,cx:365,cz:2160,hw:120,hh:105,rot:.2,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"barrier-golf",zone:11,cx:2680,cz:-5300,hw:420,hh:520,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"southkey-golf",zone:11,cx:1300,cz:6300,hw:550,hh:420,rot:-.3,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"north-res",zone:5,cx:-5600,cz:-5400,hw:2100,hh:1800,rot:0,gridX:95,gridZ:140,density:.75,hMin:4,hMax:11}),t({id:"west-res",zone:5,cx:-5300,cz:-2700,hw:1500,hh:1150,rot:0,gridX:100,gridZ:130,density:.75,hMin:4,hMax:12}),t({id:"mid-res",zone:5,cx:-4900,cz:-900,hw:1400,hh:600,rot:0,gridX:105,gridZ:140,density:.55,hMin:4,hMax:10}),t({id:"south-res",zone:5,cx:-4200,cz:1300,hw:1700,hh:1500,rot:0,gridX:105,gridZ:135,density:.7,hMin:4,hMax:10}),t({id:"far-west-res",zone:5,cx:-7950,cz:-4200,hw:650,hh:3e3,rot:0,gridX:110,gridZ:150,density:.45,hMin:4,hMax:10}),t({id:"west-res-2",zone:5,cx:-7750,cz:900,hw:850,hh:2e3,rot:0,gridX:115,gridZ:150,density:.4,hMin:4,hMax:9}),t({id:"far-south-res",zone:5,cx:-6600,cz:4300,hw:2e3,hh:1400,rot:0,gridX:105,gridZ:140,density:.55,hMin:4,hMax:10}),t({id:"south-shore-res",zone:5,cx:-3900,cz:3900,hw:1400,hh:900,rot:0,gridX:105,gridZ:135,density:.6,hMin:4,hMax:10}),t({id:"far-south-res-2",zone:5,cx:-4800,cz:6500,hw:2e3,hh:1200,rot:0,gridX:110,gridZ:140,density:.5,hMin:4,hMax:9}),t({id:"far-south-res-4",zone:5,cx:-7700,cz:6700,hw:900,hh:1e3,rot:0,gridX:120,gridZ:150,density:.38,hMin:4,hMax:9}),t({id:"south-edge-res",zone:5,cx:-5500,cz:8800,hw:3100,hh:1100,rot:0,gridX:120,gridZ:150,density:.35,hMin:4,hMax:9}),t({id:"north-res-2",zone:5,cx:-4800,cz:-8e3,hw:2400,hh:800,rot:0,gridX:100,gridZ:140,density:.55,hMin:4,hMax:10}),t({id:"far-north-res",zone:5,cx:-7950,cz:-8e3,hw:650,hh:800,rot:0,gridX:120,gridZ:150,density:.4,hMin:4,hMax:9}),t({id:"north-edge-res",zone:5,cx:-5500,cz:-9400,hw:3100,hh:600,rot:0,gridX:120,gridZ:150,density:.35,hMin:4,hMax:9}),t({id:"south-bayfront",zone:6,cx:-3e3,cz:-900,hw:480,hh:650,rot:0,gridX:120,gridZ:130,density:.6,hMin:8,hMax:35}),t({id:"hotel-south",zone:8,cx:2330,cz:-1500,hw:330,hh:1250,rot:-.12,gridX:130,gridZ:110,density:.85,hMin:20,hMax:110}),t({id:"hotel-mid",zone:8,cx:2600,cz:-3800,hw:300,hh:1300,rot:-.03,gridX:130,gridZ:105,density:.85,hMin:25,hMax:130}),t({id:"barrier-res",zone:5,cx:2650,cz:-6900,hw:350,hh:1200,rot:0,gridX:90,gridZ:110,density:.7,hMin:4,hMax:12}),t({id:"finger-res",zone:5,cx:1820,cz:-2340,hw:330,hh:760,rot:.02,gridX:0,gridZ:0,density:.7,hMin:4,hMax:9}),t({id:"garza-res",zone:5,cx:40,cz:2770,hw:200,hh:170,rot:.1,gridX:0,gridZ:0,density:.55,hMin:4,hMax:9,track:[[-10,2600],[-60,2690],[-60,2780],[20,2800],[110,2830],[200,2800]]}),t({id:"tortuga-res",zone:5,cx:1180,cz:-830,hw:420,hh:230,rot:.35,gridX:0,gridZ:0,density:.55,hMin:4,hMax:10,track:[[1156,-656],[1031,-714],[886,-842],[891,-1e3],[1062,-1033],[1225,-952],[1340,-885]]}),t({id:"isla-b-res",zone:5,cx:-1350,cz:2560,hw:330,hh:190,rot:.05,gridX:0,gridZ:0,density:.5,hMin:4,hMax:9,track:[[-1500,2577],[-1480,2680],[-1320,2720],[-1180,2660],[-1140,2547]]}),t({id:"southkey-res",zone:5,cx:2200,cz:5300,hw:700,hh:500,rot:.25,gridX:130,gridZ:150,density:.6,hMin:4,hMax:10}),t({id:"isla-n-res",zone:5,cx:700,cz:-4e3,hw:300,hh:160,rot:-.15,gridX:0,gridZ:0,density:.5,hMin:4,hMax:9,track:[[700,-3990],[640,-4075],[760,-4125],[880,-4085],[1030,-4030]]}),t({id:"isla-n1-res",zone:5,cx:-450,cz:-3900,hw:270,hh:150,rot:.1,gridX:0,gridZ:0,density:.5,hMin:4,hMax:9,track:[[-450,-3880],[-520,-3975],[-400,-4030],[-270,-3985],[-150,-3900]]}),s}function ax(s){const t=new We("streets"),e=new Map;for(const n of s){if(n.gridX<=0||n.gridZ<=0)continue;const i=[];for(let r=-n.hw;r<=n.hw+1;r+=n.gridX*t.range(.9,1.15))i.push(Math.min(r,n.hw));const o=[];for(let r=-n.hh;r<=n.hh+1;r+=n.gridZ*t.range(.9,1.15))o.push(Math.min(r,n.hh));e.set(n.id,{xs:i,zs:o})}return e}function lx(s,t){const e=[],n=new We("canals"),i=s.find(l=>l.id==="south-res"),o=i&&t.get(i.id);if(i&&o){const l=[...o.xs.map(c=>i.cx+c),-3400];for(let c=3;c<o.zs.length-3;c+=2){const h=i.cz+(o.zs[c]+o.zs[c+1])/2,d=n.range(1100,1900),u=i.cx+i.hw;e.push({id:`canal-s-${c}`,a:[u+320,h],b:[u-d,h],width:24,depth:2.6,culverts:l,culvertHalf:9.5})}}const r=s.find(l=>l.id==="west-res"),a=r&&t.get(r.id);if(r&&a){const l=a.xs.map(c=>r.cx+c);for(let c=1;c<a.zs.length-1;c++){const h=r.cz+(a.zs[c]+a.zs[c+1])/2;if(h<-2650||h>-1650||c%2===0)continue;const d=ix(h),u=n.range(700,1200);d-u>r.cx-r.hw+120&&e.push({id:`canal-w-${c}`,a:[d+90,h],b:[d-u,h],width:20,depth:2.4,culverts:l,culvertHalf:8.5}),c%4===1&&d+500<r.cx+r.hw-150&&e.push({id:`canal-e-${c}`,a:[d-90,h],b:[Math.min(d+n.range(450,700),r.cx+r.hw-150),h],width:18,depth:2.4,culverts:l,culvertHalf:8.5})}}return e}function cx(){const s=[];return s.push({id:"south-hwy-mainland",cls:"highway",width:22,lanes:4,traffic:14,pts:[[-6900,2650],[-6e3,2650],[-4500,2700],[-3400,2700],[-2790,2690]]}),s.push({id:"garza-hwy",cls:"highway",width:22,lanes:4,traffic:14,pts:[[-1650,2590],[-1050,2540],[-990,2537]]}),s.push({id:"garza-hwy-2",cls:"highway",width:22,lanes:4,traffic:14,pts:[[-10,2600],[10,2450],[30,2300],[dn[0][0],dn[0][1]],[dn[1][0],dn[1][1]]]}),s.push({id:"garza-east",cls:"arterial",width:14,lanes:2,traffic:5,pts:[[30,2300],[150,2265],[280,2235],[355,2185],[385,2160],[400,2195],[370,2220],[335,2205],[355,2185]]}),s.push({id:"garza-marina-rd",cls:"street",width:9,lanes:2,traffic:2,pts:[[355,2185],[395,2125],[420,2075]]}),s.push({id:"tortuga-rd",cls:"highway",width:22,lanes:4,traffic:12,pts:[[980,-400],[1200,-720],[1415,-1015]]}),s.push({id:"dt-bayshore",cls:"arterial",width:16,lanes:4,traffic:10,pts:[[-3400,-5300],[-2900,-5150],[-2560,-4950],[-2420,-4700],[-2330,-4450],[-2260,-4200],[-2200,-3900],[-2100,-3700],[-2150,-3450],[-2200,-3300],[-2380,-3110]]}),s.push({id:"dt-bayshore-s",cls:"arterial",width:16,lanes:4,traffic:10,pts:[[-2470,-2870],[-2450,-2600],[-2550,-2200],[-2680,-1800],[-2760,-1500],[-3350,-1500]]}),s.push({id:"dt-avenue",cls:"arterial",width:16,lanes:4,traffic:9,pts:[[-3400,-9900],[-3400,-7300],[-3400,-6e3],[-3400,-4600],[-3350,-3500],[-3330,-2900]]}),s.push({id:"dt-avenue-s",cls:"arterial",width:16,lanes:4,traffic:9,pts:[[-3290,-2650],[-3350,-1500],[-3400,0],[-3400,1600],[-3400,2700]]}),s.push({id:"north-cw-approach",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-3400,-6e3],[-2900,-6350],[-2545,-6626]]}),s.push({id:"west-arterial",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-6800,-9900],[-6800,-7e3],[-6800,-4e3],[-6800,-300],[-6900,1500],[-6900,2650]]}),s.push({id:"north-arterial",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-9900,-5300],[-8500,-5300],[-6800,-5300],[-4400,-5300],[-3400,-5300]]}),s.push({id:"airport-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[-6800,-2050],[-7300,-2050],[-7800,-2050]]}),s.push({id:"mid-arterial",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-9900,-300],[-8500,-300],[-6800,-300],[-5500,-300],[-4400,-320],[-3400,-300]]}),s.push({id:"south-arterial",cls:"arterial",width:15,lanes:4,traffic:6,pts:[[-9900,1200],[-8500,1200],[-6900,1200],[-5e3,1250],[-3400,1300]]}),s.push({id:"barrier-spine",cls:"arterial",width:16,lanes:4,traffic:10,pts:[[2720,-8e3],[2680,-6600],[2620,-5200],[2600,-4e3],[2520,-2600],[2400,-1500],[2260,-800],[2050,-500]]}),s.push({id:"barrier-spine-loop",cls:"street",width:10,lanes:2,traffic:2,pts:[[2720,-8e3],[2775,-8060],[2760,-8135],[2695,-8145],[2660,-8080],[2720,-8e3]]}),s.push({id:"barrier-beach-rd",cls:"street",width:10,lanes:2,traffic:4,pts:[[2680,-6600],[2900,-6400],[2880,-5200],[2850,-4e3],[2790,-2700],[2650,-1500],[2400,-1500]]}),s.push({id:"southkey-rd",cls:"arterial",width:14,lanes:2,traffic:5,pts:[[1465,4695],[1600,5e3],[1900,5400],[2300,5700],[2700,6100],[2600,6350],[2200,6450],[1700,6250],[1500,5900],[1900,5400]]}),s.push({id:"southkey-rd-2",cls:"street",width:10,lanes:2,traffic:3,pts:[[1500,5900],[1250,6200]]}),s.push({id:"southkey-marina-rd",cls:"street",width:9,lanes:2,traffic:2,pts:[[1600,5e3],[1420,4880],[1260,4780]]}),s.push({id:"isla-n-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[-760,-3880],[-450,-3880],[-150,-3900]]}),s.push({id:"isla-n2-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[380,-3980],[700,-3990],[1030,-4030]]}),s.push({id:"isla-n3-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[1335,-4082],[1550,-4100],[1780,-4120]]}),s.push({id:"port-rd",cls:"arterial",width:14,lanes:2,traffic:5,pts:[[-2050,-3050],[-1600,-3050],[-1150,-3050],[-700,-3060],[-260,-3070]]}),s}function hx(){const s=[];return s.push({id:"garza-bridge",pts:[[dn[1][0],dn[1][1]],[330,1250],[700,300],[980,-400]],width:30,deck:8,archHeight:26,archT:.51,archLength:560,lanes:6,traffic:16}),s.push({id:"tortuga-bridge",pts:[[1415,-1015],[1800,-600],[2050,-500]],width:22,deck:7,archHeight:18,archT:.45,archLength:380,lanes:4,traffic:12}),s.push({id:"garza-west",pts:[[-990,2537],[-10,2600]],width:22,deck:6,archHeight:0,archT:.5,archLength:0,lanes:4,traffic:14}),s.push({id:"islab-west",pts:[[-2790,2690],[-2100,2650],[-1650,2590]],width:22,deck:7,archHeight:18,archT:.45,archLength:360,lanes:4,traffic:14}),s.push({id:"north-cw-1",pts:[[-2100,-3700],[-1500,-3780],[-760,-3880]],width:24,deck:8,archHeight:26,archT:.4,archLength:480,lanes:6,traffic:14}),s.push({id:"north-cw-2",pts:[[-150,-3900],[380,-3980]],width:24,deck:8,archHeight:0,archT:.5,archLength:0,lanes:6,traffic:14}),s.push({id:"north-cw-3",pts:[[1030,-4030],[1335,-4082]],width:24,deck:8,archHeight:0,archT:.5,archLength:0,lanes:6,traffic:14}),s.push({id:"north-cw-4",pts:[[1780,-4120],[2200,-4080],[2600,-4e3]],width:24,deck:8,archHeight:20,archT:.5,archLength:380,lanes:6,traffic:14}),s.push({id:"far-north-cw",pts:[[-2545,-6626],[-1e3,-6750],[500,-6800],[1800,-6850],[2650,-6900]],width:18,deck:7,archHeight:16,archT:.55,archLength:360,lanes:4,traffic:7}),s.push({id:"port-bridge",pts:[[-2200,-3300],[-2050,-3050]],width:14,deck:6,archHeight:0,archT:.5,archLength:0,lanes:2,traffic:5}),s.push({id:"bayshore-river",pts:[[-2380,-3110],[-2470,-2870]],width:16,deck:6,archHeight:0,archT:.5,archLength:0,lanes:4,traffic:10}),s.push({id:"avenue-river",pts:[[-3330,-2900],[-3290,-2650]],width:16,deck:6,archHeight:0,archT:.5,archLength:0,lanes:4,traffic:9}),s}function ux(){return[{id:"dt-marina",x:-2150,z:-4150,rot:Math.PI*.5,piers:7,pierLen:110},{id:"garza-marina",x:420,z:2035,rot:0,piers:5,pierLen:90},{id:"barrier-marina",x:2075,z:-1400,rot:-Math.PI*.5,piers:6,pierLen:100},{id:"south-marina",x:-2760,z:2950,rot:Math.PI*.5,piers:4,pierLen:80},{id:"southkey-marina",x:1238,z:4730,rot:.09,piers:4,pierLen:80},{id:"north-marina",x:-2535,z:-5600,rot:Math.PI*.5,piers:5,pierLen:90}]}function dx(){return[{id:"rwy-09",a:[-8800,-1350],b:[-6950,-1350],width:50},{id:"rwy-13",a:[-8500,-2150],b:[-7073,-896],width:42},{id:"strip-southkey",a:[1950,5450],b:[3100,6100],width:24}]}function fx(){return[{id:"ship-channel",pts:[[4200,2200],[3e3,1600],[2e3,600],[1e3,-1200],[200,-2600],[-450,-3350]],width:180,depth:14,boats:3,speed:5},{id:"intracoastal",pts:[[1800,-7600],[1900,-6200],[1950,-4500],[2e3,-3200],[1950,-1800],[1850,-800],[1700,200]],width:110,depth:6,boats:8,speed:9},{id:"garza-channel",pts:[[-1e3,3300],[200,3250],[1e3,3100],[1900,2400],[2600,1400],[3400,400]],width:90,depth:7,boats:9,speed:12},{id:"arch-channel",pts:[[-1200,1200],[-300,1e3],[500,750],[1400,300],[2400,-100]],width:100,depth:8,boats:6,speed:11},{id:"ref-boats",pts:[[-200,3550],[300,3250],[520,2950],[800,2600],[1200,2250]],width:40,depth:4,boats:3,speed:18},{id:"flats-route",pts:[[-2100,3400],[-1200,3500],[-300,3600],[700,3700],[1500,4100]],width:40,depth:3,boats:5,speed:10},{id:"bay-route",pts:[[-1900,-4300],[-1200,-2500],[-600,-600],[0,1200],[500,1900]],width:60,depth:4,boats:7,speed:9},{id:"north-route",pts:[[-1800,-5900],[-800,-5200],[200,-4600],[1200,-4600],[1900,-5200]],width:60,depth:4,boats:5,speed:8},{id:"ocean-route",pts:[[3800,-8e3],[3700,-5e3],[3600,-2e3],[3700,1e3],[3900,4e3],[4100,7e3]],width:300,depth:25,boats:4,speed:6}].map(tx)}function px(){return[{id:"stadium",kind:"stadium",x:-2900,z:-2450,rot:.15,size:150},{id:"lighthouse",kind:"lighthouse",x:3250,z:5300,rot:0,size:30},{id:"terminal",kind:"terminal",x:-7800,z:-1900,rot:0,size:220},{id:"hangars",kind:"hangars",x:-7400,z:-2250,rot:0,size:120},{id:"cranes-port",kind:"cranes",x:-1150,z:-3330,rot:0,size:1600},{id:"cruise",kind:"cruise",x:-900,z:-2780,rot:0,size:300},{id:"tanks",kind:"tanks",x:-3600,z:-3100,rot:0,size:160},{id:"seaplane-base",kind:"seaplane",x:-2050,z:-4700,rot:Math.PI*.5,size:60},{id:"golf-club",kind:"clubhouse",x:1215,z:6250,rot:-.3,size:30}]}class mx{n=ue;height=new Float32Array(ue*ue);zone=new Uint8Array(ue*ue);veg=new Uint8Array(ue*ue);coast=new Float32Array(ue*ue);exposure=new Uint8Array(ue*ue);districts=rx();roads=cx();bridges=hx();marinas=ux();runways=dx();channels=fx();pois=px();landmasses=ox();lakes=Nu();grids=ax(this.districts);canals=lx(this.districts,this.grids);toCell(t,e){return[(t+un)/po*ue,(e+un)/po*ue]}heightAt(t,e){const[n,i]=this.toCell(t,e),o=Jt(Math.floor(n),0,ue-2),r=Jt(Math.floor(i),0,ue-2),a=Jt(n-o,0,1),l=Jt(i-r,0,1),c=this.height,h=c[r*ue+o],d=c[r*ue+o+1],u=c[(r+1)*ue+o],g=c[(r+1)*ue+o+1];return ie(ie(h,d,a),ie(u,g,a),l)}zoneAt(t,e){const[n,i]=this.toCell(t,e),o=Jt(Math.round(n),0,ue-1),r=Jt(Math.round(i),0,ue-1);return this.zone[r*ue+o]}coastAt(t,e){const[n,i]=this.toCell(t,e),o=Jt(Math.round(n),0,ue-1),r=Jt(Math.round(i),0,ue-1);return this.coast[r*ue+o]}vegAt(t,e){const[n,i]=this.toCell(t,e),o=Jt(Math.round(n),0,ue-1),r=Jt(Math.round(i),0,ue-1);return this.veg[r*ue+o]/255}exposureAt(t,e){const[n,i]=this.toCell(t,e),o=Jt(Math.round(n),0,ue-1),r=Jt(Math.round(i),0,ue-1);return this.exposure[r*ue+o]/255}isLand(t,e){return this.heightAt(t,e)>.05}districtAt(t,e){for(const n of this.districts)if(Qs(t,e,n.cx,n.cz,n.hw,n.hh,n.rot)<0)return n;return null}regionalDepth(t,e){let n=3+2.6*(.5+.5*Ie(t/1100,e/1100,3))+1.2*Ie(t/350+4,e/350,2);n-=2.4*St(.12,.42,Ie(t/650+9,e/650+2,3)),n+=.8*Ie(t/190+8.8,e/190-4.4,3),n-=2.3*St(.22,.58,Ie(t/330+2,e/330-7,3)+.25*Bt(t/120-5,e/120+2))*St(2.6,4.2,n),n=Math.max(n,.7);const i=3380+380*Ie(e/3e3,.5,2)+170*Ie(e/1100+3.1,2.2,3),o=t-i+420*Ie(t/1300+4.4,e/1e3-6.6,3)+130*Bt(t/330+1.1,e/330-3.3);o>0&&(n+=o*.004+2.5*St(0,1300,o)+3*St(500,2300,o)+15*St(1400,4500,o)+1.5*Uo(t/600+1,e/260,3)*St(0,900,o));const r=St(-400,1400,t+300*Ie(e/1200,3.3,2))*(1-St(.4,1.4,Math.hypot((t-2600)/2600,(e-1900)/2400)));n+=4.5*r;const a=St(7200,9400,e+400*Ie(t/3e3,1.7,2));n+=18*a;const l=St(8300,9800,-e+400*Ie(t/3e3,5.1,2));n+=10*l;const c=Uo(t/900+2,e/380+1,3);return n-=1.6*c*r,n}generate(t){const e=ue,n=this.landmasses,i=512,o=e/i,r=Ms*o,a=new Float32Array(i*i),l=new Int16Array(i*i),c=new Float32Array(i*i),h=new Float32Array(i*i),d=new Float32Array(i*i),u=new Float32Array(i*i),g=new Float32Array(i*i),f=new Float32Array(i*i);for(let F=0;F<i;F++){const L=-un+(F+.5)*r;for(let H=0;H<i;H++){const G=-un+(H+.5)*r;let N=1/0,$=-1;for(let tt=0;tt<n.length;tt++){const W=n[tt];if(Math.hypot(G-W.bx,L-W.bz)-W.br>N)continue;const X=W.sd(G,L);X<N&&(N=X,$=tt)}const V=F*i+H;if(a[V]=N,l[V]=$,u[V]=n[$].seabed,g[V]=n[$].shelf,c[V]=this.regionalDepth(G,L),h[V]=Ie(G/260,L/260,3),$===0&&N<0){const tt=-N,W=2*Ie(G/1500+2,L/1500-1,3)+.9*Ie(G/420+7,L/420+3,3),q=2.2*Math.exp(-(((tt-1500)/1e3)**2));d[V]=St(150,1100,tt)*(1.6+W+q)}else d[V]=0}t&&!(F&31)&&t(F/i*.3)}{const G=[],N=[];for(let W=0;W<8;W++){const q=W/8*Math.PI*2+.2;G.push(Math.cos(q)),N.push(Math.sin(q))}const $=new Float32Array(8),V=(W,q)=>{const X=Math.floor((W+un)/r),it=Math.floor((q+un)/r);return X<0||it<0||X>=i||it>=i?X<0?-1e3:1e3:a[it*i+X]},tt=(W,q,X)=>{const it=Jt(Math.floor((W+un)/r),0,i-1),ft=Jt(Math.floor((q+un)/r),0,i-1)*i+it;return Math.min(c[ft],.05+Math.max(X,0)*u[ft]+(n[l[ft]].beach===0?g[ft]:0))};for(let W=0;W<i;W++){const q=-un+(W+.5)*r;for(let X=0;X<i;X++){const it=W*i+X,lt=a[it];if(lt<-450){f[it]=0;continue}const ft=-un+(X+.5)*r;for(let D=0;D<8;D++){let J=0,Z=lt>=0;for(let at=1;at<=40;at++){const ut=ft+G[D]*at*200,vt=q+N[D]*at*200,dt=V(ut,vt);if(dt<0){if(!Z){if(at*200>600)break;continue}break}Z=!0;const I=ut>un||vt>un||vt<-un?25:tt(ut,vt,dt);J+=200*St(.5,12,I)}$[D]=J}let K=0,ot=0,j=0;for(let D=0;D<8;D++){const J=$[D];J>K?(j=ot,ot=K,K=J):J>ot?(j=ot,ot=J):J>j&&(j=J)}const et=(K+ot+j)/(3*40*200);f[it]=St(.04,.8,et)}}t&&t(.35)}const v=(F,L,H,G,N)=>{const $=N*i+G;return ie(ie(F[$],F[$+1],L),ie(F[$+i],F[$+i+1],L),H)};let p=0,m=0,_=0,w=0;const x=(F,L)=>{const H=Jt(F/o-.5,0,i-1.001),G=Jt(L/o-.5,0,i-1.001),N=Math.floor(H),$=Math.floor(G),V=H-N,tt=G-$;p=V,m=tt,_=N,w=$;const W=v(a,V,tt,N,$),q=$*i+N,X=q+1,it=q+i,lt=it+1;let ft=l[q],K=a[q];return a[X]<K&&(K=a[X],ft=l[X]),a[it]<K&&(K=a[it],ft=l[it]),a[lt]<K&&(K=a[lt],ft=l[lt]),[W,ft]};let A=0,M=1;const S=()=>{const F=w*i+_,L=F+1,H=F+i,G=H+1,N=ie(a[L]-a[F],a[G]-a[H],m),$=ie(a[H]-a[F],a[G]-a[L],p),V=Math.hypot(N,$);V>1e-6?(A=N/V,M=$/V):(A=0,M=1)},E=this.channels,y=this.runways,b=this.districts,T=this.lakes,U=this.canals,O=U.map(F=>({minX:Math.min(F.a[0],F.b[0])-F.width,maxX:Math.max(F.a[0],F.b[0])+F.width,z:F.a[1]})),z=this.marinas,B=this.roads.filter(F=>F.cls==="highway"||F.cls==="arterial").map(F=>{let L=1/0,H=-1/0,G=1/0,N=-1/0;for(const[V,tt]of F.pts)L=Math.min(L,V),H=Math.max(H,V),G=Math.min(G,tt),N=Math.max(N,tt);const $=F.width*.5+20;return{pts:F.pts,hw:F.width*.5,minX:L-$,maxX:H+$,minZ:G-$,maxZ:N+$}});for(let F=0;F<e;F++){const L=-un+(F+.5)*Ms,H=sx(L);for(let G=0;G<e;G++){const N=-un+(G+.5)*Ms,$=F*e+G;let[V,tt]=x(G+.5,F+.5);const W=n[tt],q=v(f,p,m,_,w);if(Math.abs(V)<90&&(W.beach>0||W.wet)){const ot=9*Bt(N/60+3.3,L/60-1.7)+4*Bt(N/21+8.1,L/21+2.2);V+=ot*(W.wet?1.8:1)}this.coast[$]=V,this.exposure[$]=Math.round(255*Jt(q,0,1));const X=v(h,p,m,_,w);let it=0;if(tt===0&&V>-160)for(const ot of T){if(Math.abs(N-ot.cx)>ot.rx*1.5+160||Math.abs(L-ot.cz)>ot.rz*1.6+160)continue;const j=ln(N,L,ot.cx,ot.cz,ot.rx,ot.rz,ot.rot,ot.seed,.22);it=Math.max(it,1-St(0,140,j))}let lt,ft,K=0;if(V<0){const ot=-V;let j=null;for(const J of b)if(Qs(N,L,J.cx,J.cz,J.hw,J.hh,J.rot)<0){j=J;break}const et=j!==null&&(j.zone===7||j.zone===6||j.zone===9||j.zone===13||j.zone===14||j.zone===15||j.zone===16||j.zone===8&&q<.3);if(W.wet)lt=.15+W.height*St(0,60,ot)+.15*Bt(N/30,L/30),ft=3,K=255;else if(W.beach===0)lt=W.height+.2*Bt(N/40,L/40),ft=9,K=10;else{const J=Math.max(.25+.4*q,.45+.9*(.5+.5*Bt(N/600+5.2,L/600-1.3))+.35*Bt(N/240+1.7,L/240-4.1)+.15*Bt(N/90+6.3,L/90+2.4)),Z=et?5:W.beach*(.45+1.4*q)*J*(it>0?1.6:1),at=ot+5*Bt(N/42+7.7,L/42-3.3)*St(3,12,ot),ut=St(0,Z,at);if(lt=.25+(W.height-.25)*ut+.6*X*ut+.12*Bt(N/18,L/18),lt+=.18*q*St(.3,.55,ut)*(1-St(.6,.85,ut))*(.5+.5*Bt(N/60+3,L/60-5)),W.id==="barrier"||W.id==="southkey"){const vt=St(30,70,ot)*(1-St(90,160,ot))*(.4+.6*q);lt+=2.2*vt*(.6+.4*Uo(N/140,L/140,3))}if(ft=ut<.45?2:5,K=ut<.45?20:150,it>0&&ft===2&&(ft=4,K=120),ot<60&&it===0){if(W.isle&&q<.24){const vt=Bt(N/150+4.4,L/150-2.9);if(vt>.12){const dt=18+22*(.5+.5*vt);ot<dt&&(ft=3,lt=Math.min(lt,.3+.5*St(0,dt,ot))+.1*Bt(N/12,L/12),K=255)}}if(ft===2){const vt=Ie(N/210+9,L/210-4,2);(W.rocky?N>2400&&Uo(N/90+5,L/90+5,3)>.62:vt>.36&&q>.3)&&ot<26&&(ft=12,lt=.3+1.1*St(0,22,ot)+.9*Uo(N/14,L/14,2)*(1-St(20,26,ot)),K=0)}}if(W.id==="garza"&&L<dn[0][1]+60&&Ss(N,L,dn[0][0],dn[0][1],dn[1][0],dn[1][1])<Iu+40){const vt=St(dn[0][1]+60,dn[0][1]-40,L);vt>.5&&(ft=2,K=15);const dt=ie(.3,.8+.08*Bt(N/40,L/40),St(0,16,ot));lt=ie(lt,Math.max(lt,dt),vt)}}if(tt===0){const J=v(d,p,m,_,w)*(1-it);lt+=J+.25*Bt(N/95+2,L/95)*St(0,.5,J);const Z=St(H+160,H-160,N);if(Z>0){const at=Bt(N/70+1,L/70+5),ut=at<-.32?-.25:.35+.4*(.5+.5*at)+.05*Bt(N/9,L/9);lt=ie(lt,ut,Z),Z>.5&&(ft=19);let vt=1/0;for(const dt of B)N<dt.minX||N>dt.maxX||L<dt.minZ||L>dt.maxZ||(vt=Math.min(vt,l0(N,L,dt.pts)-dt.hw));vt<16&&(lt=Math.max(lt,ie(1.4+.1*Bt(N/30,L/30),lt,St(3,16,vt))),vt<6&&(K=Math.min(K,30)))}}let D=!1;if(lt>1.4&&j!==null){const J=j;D=!0,ft=J.zone,J.zone===7?(lt=Math.max(lt,3.6),K=30):J.zone===11?(lt+=2.5*Ie(N/180,L/180,3)+1.5,K=255):J.zone===4?K=120+Math.floor(100*St(-.1,.4,X)):J.zone===10?(lt=ie(lt,2.8+.05*Bt(N/50,L/50),St(0,-150,Qs(N,L,J.cx,J.cz,J.hw,J.hh,J.rot))),K=35):J.zone===13||J.zone===14||J.zone===9?K=5:J.zone===8||J.zone===6?K=60:J.track?K=Math.floor((185+70*St(-.3,.4,X))*(1-.6*St(.22,.5,Bt(N/95+5,L/95-2)))):K=70+Math.floor(115*St(-.25,.45,X))}for(const J of y){const Z=Ss(N,L,J.a[0],J.a[1],J.b[0],J.b[1]);Z<J.width*.5+60&&(lt=ie(lt,2.9,St(J.width*.5+60,J.width*.5+10,Z)))}if(ft===5&&!D){if(ft=4,K=Math.floor(150+105*St(-.35,.3,X)),W.isle){const J=Bt(N/95+5,L/95-2);K=Math.floor(Math.min(255,K+45)*(1-.55*St(.22,.5,J))),J>.44&&lt>1.6&&(ft=2,K=15)}it>0&&(K=Math.min(K,160))}if(ft===19){const J=St(.5,.64,.5+.5*Ie(N/240+3,L/240+8,3));K=Math.floor(40+215*J),lt<0&&(K=0)}for(let J=0;J<U.length;J++){const Z=O[J];if(Math.abs(L-Z.z)>U[J].width||N<Z.minX||N>Z.maxX)continue;const at=U[J],ut=Ss(N,L,at.a[0],at.a[1],at.b[0],at.b[1]);if(ut>=at.width*.5)continue;let vt=!1;for(const dt of at.culverts)if(Math.abs(N-dt)<at.culvertHalf){vt=!0;break}vt||(lt=-(.5+(at.depth-.5)*St(at.width*.5,at.width*.5-6,ut)),ft=1,K=0)}}else{const ot=v(c,p,m,_,w),j=v(u,p,m,_,w),et=v(g,p,m,_,w);let D;if(W.wet)D=Math.min(ot,.05+V*j);else if(W.beach===0)D=Math.min(ot,et+V*j);else{const Z=.45+.95*q,at=.05+V*j*Z;S();const ut=1.9+.5*Bt(N/330+2,L/330-7)+V*.0012,vt=ci(at,ut,.7);let dt=vt;const I=St(50,160,V),R=.6*Ie(N/150+5.5,L/150+1.5,3)+.4*Bt(N/70-3.3,L/70+8.8);dt+=(.7*R+1.1*St(-.45,-.8,R)-.5*St(.45,.8,R))*I;const Q=Jt(400+130*Ie(N/520+3.7,L/520-2.1,3)+210*Ie(N/1700+1,L/1700+8,2),200,620),rt=170+110*(.5+.5*Bt(N/300-1,L/300+6)),gt=N-A*(V-Q),pt=L-M*(V-Q),zt=.5*Bt(gt/150+2.2,pt/150-9.9)+.3*Bt(N/95-4.4,L/95+1.7)+.2*Bt(N/260+7.7,L/260-3.1),Mt=St(Q-rt,Q+rt,V+200*zt);if(dt+=1.4*St(.3,.7,-zt)*St(Q-320,Q-60,V),q>.35&&V<300){const Lt=N-A*V,te=L-M*V,wt=Math.max(0,Math.sin(V/38+1.6*Bt(Lt/120+4,te/120-1))),Ot=St(-.25,.3,Bt(Lt/260+5.5,te/260+2.5));dt-=.35*wt*wt*Ot*St(.35,.7,q)*St(20,60,V)*(1-St(160,300,V))}dt=Math.max(dt,Math.min(vt,.45)),D=ie(Math.min(dt,ot),ot,Mt)}if(Math.abs(N-190)<260&&Math.abs(L-2380)<220){const Z=zu(N,L);Z<0&&(D=Math.max(D,.5+1.7*St(0,-45,Z)))}const J=Math.max(1-Math.hypot((N+350)/520,(L-3250)/260),1-Math.hypot((N-2500)/700,(L-3300)/300),1-Math.hypot((N-1200)/600,(L-1500)/260));if(J>0){const Z=St(0,.45,J)*(.6+.4*Ie(N/130+7,L/130-3,3));D=ie(D,-.12+.6*(1-Z),Z*.94)}for(const Z of E){if(Math.abs(N-Z.bx)>Z.br||Math.abs(L-Z.bz)>Z.br)continue;const at=Z.width>=200;let ut=l0(N,L,Z.pts)-Z.width*.5;at&&(ut+=(80*Ie(N/380+1.5,L/380-2.5,2)+130*Bt(N/1100+3.3,L/1100-6.1))*St(-Z.width*.3,0,ut));const vt=at?220:60;if(ut<vt){let dt=St(-Z.width*.1,vt,ut);at&&(dt=1-(1-dt)*(1-dt)),D=Math.max(D,Z.depth*(1-dt)+D*dt)}}for(const Z of z){if(Math.abs(N-Z.x)>420||Math.abs(L-Z.z)>420)continue;const at=Math.sin(Z.rot),ut=-Math.cos(Z.rot),vt=Z.pierLen*.5+40,dt=Qs(N,L,Z.x+at*vt,Z.z+ut*vt,Z.piers*14+40,vt+10,Z.rot);dt<40&&(D=Math.max(D,2.6*(1-St(-5,40,dt))))}for(let Z=0;Z<U.length;Z++){const at=O[Z];if(Math.abs(L-at.z)>U[Z].width||N<at.minX||N>at.maxX)continue;const ut=U[Z],vt=Ss(N,L,ut.a[0],ut.a[1],ut.b[0],ut.b[1]);vt<ut.width*.5&&(D=Math.max(D,.5+(ut.depth-.5)*St(ut.width*.5,ut.width*.5-6,vt)))}D+=.08*Bt(N/45,L/45),lt=-D,ft=lt>-.35?17:D>9?0:1,lt>0&&(ft=17),K=0}this.height[$]=lt,this.zone[$]=ft,this.veg[$]=Jt(K,0,255)}t&&!(F&63)&&t(.35+F/e*.65)}}}const jn=`
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
`,hr=`
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
`,ma=`
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
vec3 cloudFieldCS(vec2 cs) {
  vec2 p = cs * 0.00015 + uCloudSeed;
  vec2 warp = (vec2(fbm3(p * 1.3), fbm3(p * 1.3 + 4.2)) - 0.5) * 0.35;
  float macro = fbm3(p * 0.4 + 9.0);
  float cellsA = 1.0 - worley2(cs * (1.0 / 6000.0) + warp + uCloudSeed * 0.37);
  float cellsB = 1.0 - worley2(cs * (1.0 / 3000.0) + warp * 1.5 + uCloudSeed * 0.61 + 2.3);
  float f = (cellsA * 0.65 + cellsB * 0.35) * 0.55 + macro * 0.45;
  float thr = 0.72 - uCloudCoverage * 0.40;
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
`,ga=`
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
`,Uu=`
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
`;function gx(s=64){const t=s,e=new Uint8Array(t*t*t*4),n=(d,u,g,f)=>{let v=d*374761393+u*668265263+g*2147483647+f*1013904223|0;return v=Math.imul(v^v>>>13,1274126177),((v^v>>>16)>>>0)/4294967296},i=(d,u)=>(d%u+u)%u,o=(d,u,g,f,v)=>{const p=Math.floor(d),m=Math.floor(u),_=Math.floor(g),w=d-p,x=u-m,A=g-_,M=F=>F*F*F*(F*(F*6-15)+10),S=M(w),E=M(x),y=M(A),b=(F,L,H,G,N,$)=>{const tt=n(i(F,f),i(L,f),i(H,f),v)*6.2831853,W=n(i(F,f),i(L,f),i(H,f),v+7)*3.1415926,q=Math.cos(tt)*Math.sin(W),X=Math.sin(tt)*Math.sin(W),it=Math.cos(W);return q*G+X*N+it*$},T=(F,L,H)=>F+(L-F)*H,U=T(b(p,m,_,w,x,A),b(p+1,m,_,w-1,x,A),S),O=T(b(p,m+1,_,w,x-1,A),b(p+1,m+1,_,w-1,x-1,A),S),z=T(b(p,m,_+1,w,x,A-1),b(p+1,m,_+1,w-1,x,A-1),S),B=T(b(p,m+1,_+1,w,x-1,A-1),b(p+1,m+1,_+1,w-1,x-1,A-1),S);return T(T(U,O,E),T(z,B,E),y)},r=(d,u,g,f,v)=>{const p=Math.floor(d),m=Math.floor(u),_=Math.floor(g);let w=1e9;for(let x=-1;x<=1;x++)for(let A=-1;A<=1;A++)for(let M=-1;M<=1;M++){const S=p+M,E=m+A,y=_+x,b=S+n(i(S,f),i(E,f),i(y,f),v),T=E+n(i(S,f),i(E,f),i(y,f),v+3),U=y+n(i(S,f),i(E,f),i(y,f),v+5),O=(b-d)**2+(T-u)**2+(U-g)**2;O<w&&(w=O)}return 1-Math.min(1,Math.sqrt(w))},a=(d,u,g,f,v)=>f+(d-u)/(g-u)*(v-f),l=d=>Math.min(1,Math.max(0,d));let c=0;for(let d=0;d<t;d++)for(let u=0;u<t;u++)for(let g=0;g<t;g++){const f=g/t,v=u/t,p=d/t;let m=0,_=.5,w=0;for(let O=0;O<3;O++){const z=4<<O;m+=_*o(f*z,v*z,p*z,z,11+O),w+=_,_*=.5}m=m/w*.5+.5;const x=r(f*4,v*4,p*4,4,31),A=r(f*8,v*8,p*8,8,41),M=r(f*16,v*16,p*16,16,51),S=x*.625+A*.25+M*.125,E=a(m,0,1,S,1),y=r(f*4,v*4,p*4,4,61),b=r(f*8,v*8,p*8,8,71),T=y*.65+b*.35,U=(o(f*8,v*8,p*8,8,81)*.65+o(f*16,v*16,p*16,16,91)*.35)*.5+.5;e[c++]=Math.round(l(E)*255),e[c++]=Math.round(l(T)*255),e[c++]=Math.round(l(U)*255),e[c++]=Math.round(l(m)*255)}const h=new uu(e,t,t,t);return h.format=En,h.type=qn,h.minFilter=Ae,h.magFilter=Ae,h.wrapS=h.wrapT=h.wrapR=lo,h.unpackAlignment=1,h.needsUpdate=!0,h}const h0=1024,u0=76e3,vx=42e3,xx=7e3,_x=`
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
vec3 skyBackground(vec3 dir) {
  vec3 sky = skyRadiance(dir);
  sky += sunDisc(dir);
  vec3 moonDir = moonDirection();
  float cm = dot(dir, moonDir);
  float moon = smoothstep(0.99975, 0.99992, cm) * 1.6 + pow(max(cm, 0.0), 700.0) * 0.08;
  sky += vec3(0.75, 0.8, 0.95) * moon * uNight;
  sky += stars(dir) * uNight * 0.7;
  return sky;
}
`,wx=`
${hr}
${jn}
${ma}
uniform vec2 uCovCenter;
uniform float uCovExtent;
in vec2 vUv;
void main() {
  vec2 cs = uCovCenter + (vUv - 0.5) * uCovExtent;
  vec3 f = cloudFieldCS(cs);
  vec2 p = cs * 0.00015 + uCloudSeed;
  // slow field: which masses develop vertically (0 flat .. 1 towering)
  float tower = clamp((fbm3(p * 0.7 + 3.1) - 0.22) / 0.46, 0.0, 1.0);
  // slight variation of the base altitude between cells
  float baseVar = clamp((fbm3(p * 2.2 + 5.5) - 0.2) / 0.5, 0.0, 1.0);
  gl_FragColor = vec4(f.x, mix(f.y, tower, 0.5), baseVar, f.z);
}
`,yx=`
precision highp sampler3D;
${hr}
${jn}
${ma}
${ga}
${Uu}
uniform sampler3D uNoise3D;
uniform sampler2D uCovTex;
uniform vec2 uCovCenter;
uniform float uCovExtent;
uniform vec3 uCamPos;
uniform mat4 uInvProj;
uniform mat4 uInvView;
uniform float uCloudSteps;
uniform float uMaxDist;
in vec2 vUv;

const float SIGMA = 0.03;         // extinction per metre at unit density (dense cumulus)
const float NOISE_SCALE = 1.0 / 1600.0;

// interleaved gradient noise: a pure function of the pixel position, so frames are reproducible
float ign(vec2 px) { return fract(52.9829189 * fract(0.06711056 * px.x + 0.00583715 * px.y)); }

/** Macro field at a world xz position: x coverage, y vertical development, z base variation, w column thickness. */
vec4 macroField(vec2 wp) {
  vec2 uv = (wp + uCloudWind - uCovCenter) / uCovExtent + 0.5;
  return texture(uCovTex, uv);
}

/** Vertical envelope of the layer (before noise): flat base at a common altitude, column height driven by
 *  the macro field. Returns coverage * vertical profile; hf = height fraction in the slab, hn = fraction of
 *  this column's own height, H = column height fraction. */
float envelope(vec3 p, vec4 f, out float hf, out float hn, out float H) {
  float thick = uCloudTop - uCloudBase;
  float base = uCloudBase + (f.z - 0.5) * 0.12 * thick;
  hf = (p.y - base) / thick;
  H = mix(0.3, 1.0, smoothstep(0.05, 0.75, f.y));
  hn = hf / H;
  // cumulus keep a sharp flat base; a closed deck (high coverage) gets a soft one that the shape noise
  // carves into hanging lumps, which is what gives stratocumulus its cellular underside
  float baseRamp = mix(0.05, 0.22, smoothstep(0.45, 0.7, uCloudCoverage));
  float v = smoothstep(0.0, baseRamp, hf) * (1.0 - smoothstep(0.55, 1.0, hn));
  // thin columns (cell edges, the gaps of a deck) are less dense: light gets through, the underside of an
  // overcast reads as cells instead of an even grey
  return f.x * v * mix(0.8, 1.2, f.w);
}

vec3 noiseCoord(vec3 p) { return (p + vec3(uCloudWind.x, 0.0, uCloudWind.y)) * NOISE_SCALE; }

/** Shape-eroded density: solid interiors, cauliflower lobes where the envelope thins (top and edges). */
float shapeDensity(float e, float hn, vec4 n) {
  float shape = clamp((n.r * 0.6 + n.g * 0.25 + n.a * 0.15 - 0.3) / 0.7, 0.0, 1.0);
  // interiors stay noise-modulated (mottled bases, uneven light march) instead of saturating
  float erosion = mix(0.5, 1.0, clamp(hn, 0.0, 1.0));
  return e * 1.15 - (1.0 - shape) * erosion;
}

/** Density without edge detail (used by the light march). */
float densityBase(vec3 p, vec4 f) {
  float hf, hn, H;
  float e = envelope(p, f, hf, hn, H);
  if (e <= 0.002) return 0.0;
  vec4 n = texture(uNoise3D, noiseCoord(p));
  return clamp(shapeDensity(e, hn, n), 0.0, 1.0);
}

/** Full density with detail erosion of the edges; mott returns the low-frequency shape noise so the
 *  lighting can mottle the undersides without another fetch. */
float densityFull(vec3 p, float e, float hn, out float mott) {
  vec3 q = noiseCoord(p);
  vec4 n = texture(uNoise3D, q);
  mott = n.a;
  float d = shapeDensity(e, hn, n);
  if (d <= 0.0) return 0.0;
  // low-frequency worley erosion, billowy at the base and wispier toward the top
  float det = texture(uNoise3D, q * 3.0 + vec3(0.37, 0.11, 0.73)).g;
  float wisp = texture(uNoise3D, q * 5.0 + vec3(0.61, 0.29, 0.17)).b;
  float er = mix(det, wisp, smoothstep(0.35, 0.95, hn));
  // remap (rather than subtract) so eroded edges keep a steep density gradient: crisp cauliflower lobes
  float k = 0.46 * (1.0 - er);
  d = (d - k) / (1.0 - k);
  return clamp(d * 2.0, 0.0, 1.0);
}

/** Optical depth toward the light through the layer (4 growing steps). */
float lightOD(vec3 p, vec3 L) {
  float thick = uCloudTop - uCloudBase;
  float od = 0.0;
  float t = 0.0;
  float s = thick * 0.06;
  for (int i = 0; i < 4; i++) {
    vec3 q = p + L * (t + s * 0.5);
    if (q.y > uCloudTop + 1.0 || q.y < uCloudBase - 200.0) break;
    od += densityBase(q, macroField(q.xz)) * s;
    t += s;
    s *= 2.0;
  }
  // shadowing uses a reduced extinction: multiple scattering carries light deeper than Beer-Lambert alone
  return od * SIGMA * 0.6;
}

// Beer-Lambert with a cheap multiple-scattering approximation (3 octaves of attenuated extinction)
float beer(float od) { return 0.5 * exp(-od) + 0.32 * exp(-0.25 * od) + 0.18 * exp(-0.06 * od); }
// Henyey-Greenstein phase normalised so that isotropic = 1
float hgN(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * c, 1.5); }

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 vpos = uInvProj * vec4(ndc, 1.0, 1.0);
  vpos /= vpos.w;
  vec3 dir = normalize((uInvView * vec4(vpos.xyz, 0.0)).xyz);

  // light: the sun, handing over to the moon once the sun is below the horizon
  float nightMix = smoothstep(0.02, -0.08, uSunDir.y);
  vec3 moonDir = normalize(vec3(-uSunDir.x, max(0.25, -uSunDir.y * 0.8 + 0.3), -uSunDir.z));
  vec3 L = normalize(mix(uSunDir, moonDir, nightMix));
  // moonlight is dimmer relative to the (exposure-boosted) night sky than the key colours alone suggest
  vec3 lightCol = uSunColor * 2.9 * mix(1.0, 0.5, nightMix);

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
    // dual-lobe phase: forward lobe gives the silver lining near the sun, back lobe keeps bases readable
    float phase = mix(hgN(cosSun, 0.72), hgN(cosSun, -0.18), 0.45);
    float forward = smoothstep(0.3, 0.95, cosSun);
    // sky light on the tops: hemisphere average of the dome (deep blue) whitened by aerosol scatter
    vec3 skyAmb = mix(uZenithColor, uHazeColor, 0.5) * 0.95;
    vec3 gndAmb = uHazeColor * 0.45;
    // low sun: grazing light reaches the undersides (warm sunset bases)
    float lowSun = (1.0 - smoothstep(0.04, 0.3, L.y)) * (1.0 - nightMix);

    int level = 0;          // 0 coarse, 1 fine, 2 surface
    int empty = 0;
    int sinceLight = 9;
    float lt = 1.0;
    float wsum = 0.0;
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
      float dens = densityFull(p, e, hn, mott);
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
      // the light march varies slowly along the ray: reuse it for the next surface sample
      if (level == 1 || sinceLight >= 1) {
        lt = beer(lightOD(p, L));
        // grazing sunset light on the undersides, attenuated by the local cloud thickness
        lt = max(lt, lowSun * (1.0 - smoothstep(0.0, 0.35, hn)) * exp(-e * 2.5) * 0.6);
        sinceLight = 0;
      } else sinceLight++;
      float powder = 1.0 - exp(-dens * 5.0);
      float sunTerm = lt * phase * mix(mix(0.55, 1.0, powder), 1.0, forward);
      // ambient: sky from above, sea/haze bounce from below, occluded by the cloud thickness overhead
      // (thin cells of an overcast deck stay bright underneath, thick cells go dark). The overhead
      // thickness is modulated by the low-frequency shape noise so the flat bases read as mottled
      // (hollows between the lobes let more sky light through) instead of a uniform grey.
      float above = max(H - hf, 0.0) * (uCloudTop - uCloudBase) * e * mix(1.6, 0.55, mott) * mix(0.45, 1.3, f.w);
      float ao = mix(0.14, 1.0, exp(-above * 0.0015)) * mix(0.82, 1.12, mott);
      vec3 amb = mix(gndAmb, skyAmb, clamp(hf * 1.3, 0.0, 1.0)) * ao;
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
`,d0=`
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,Mx=`
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = vec4(p.xy, p.w * 0.999999, p.w);
}
`,Sx=`
${hr}
${jn}
${ga}
${_x}
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
  vec3 sky = skyBackground(dir);
  // tent-filtered upsample of the reduced-resolution cloud layer (4 bilinear taps = 3x3 tent)
  vec2 o = uCloudTexel * 0.35;
  vec4 c = texture(uCloudTex, uv + vec2(-o.x, -o.y)) + texture(uCloudTex, uv + vec2(o.x, -o.y))
         + texture(uCloudTex, uv + vec2(-o.x, o.y)) + texture(uCloudTex, uv + vec2(o.x, o.y));
  c *= 0.25;
  gl_FragColor = vec4(sky * c.a + c.rgb, 1.0);
}
`,bx=`
out vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`,Ex=`
${hr}
${jn}
${ma}
${ga}
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
`;class Ax{constructor(t,e,n){this.atmos=t,this.noise=gx(64),this.scale=n.scale,this.covRT=new Un(h0,h0,{type:qn,format:En,depthBuffer:!1,generateMipmaps:!1,minFilter:Ae,magFilter:Ae,wrapS:Ze,wrapT:Ze}),this.covMat=new Ke({vertexShader:d0,fragmentShader:wx,uniforms:{...t.uniforms,uCovCenter:{value:this.covCenter},uCovExtent:{value:u0}},depthTest:!1,depthWrite:!1}),this.cloudMat=new Ke({vertexShader:d0,fragmentShader:yx,uniforms:{...t.uniforms,uNoise3D:{value:this.noise},uCovTex:{value:this.covRT.texture},uCovCenter:{value:this.covCenter},uCovExtent:{value:u0},uCamPos:{value:new C},uInvProj:{value:new jt},uInvView:{value:new jt},uCloudSteps:{value:n.cloudSteps},uMaxDist:{value:vx}},depthTest:!1,depthWrite:!1}),this.quad=new ge(new Bi(2,2),this.cloudMat),this.quad.frustumCulled=!1,this.quadScene.add(this.quad),this.cloudRT=new Un(4,4,{type:si,depthBuffer:!1,minFilter:Ae,magFilter:Ae}),this.domeMat=new Ke({vertexShader:Mx,fragmentShader:Sx,uniforms:{...t.uniforms,uCloudTex:{value:this.cloudRT.texture},uCloudTexel:{value:new Pt(.25,.25)},uResolution:{value:new Pt(1,1)},uInvProj:{value:new jt},uInvView:{value:new jt}},side:An,depthWrite:!1,depthTest:!0}),this.dome=new ge(new ii(1,24,12),this.domeMat),this.dome.frustumCulled=!1,this.dome.renderOrder=-1e3,this.dome.isSky=!0,this.envMat=new Ke({vertexShader:bx,fragmentShader:Ex,uniforms:{...t.uniforms},side:An,depthWrite:!1});const i=new ge(new ii(50,32,16),this.envMat);this.envScene.add(i),this.pmrem=new nc(e),this.pmrem.compileEquirectangularShader()}dome;cloudMat;covMat;domeMat;quad;quadScene=new or;quadCam=new lr(-1,1,1,-1,0,1);cloudRT;covRT;covBaked=!1;covCenter=new Pt;scale;envScene=new or;envMat;pmrem=null;envRT=null;envMap=null;noise;setCloudSteps(t){this.cloudMat.uniforms.uCloudSteps.value=t}updateEnvironment(){return this.envRT&&this.envRT.dispose(),this.envRT=this.pmrem.fromScene(this.envScene,0,.1,200),this.envMap=this.envRT.texture,this.envMap}updateCoverage(t,e){const n=this.atmos.uniforms.uCloudWind.value,i=e.position.x+n.x,o=e.position.z+n.y;if(this.covBaked&&Math.hypot(i-this.covCenter.x,o-this.covCenter.y)<xx)return;this.covCenter.set(i,o),this.covBaked=!0,this.quad.material=this.covMat;const r=t.getRenderTarget();t.setRenderTarget(this.covRT),t.render(this.quadScene,this.quadCam),t.setRenderTarget(r),this.quad.material=this.cloudMat}render(t,e,n,i){const o=Math.max(2,Math.round(n*this.scale)),r=Math.max(2,Math.round(i*this.scale));(this.cloudRT.width!==o||this.cloudRT.height!==r)&&this.cloudRT.setSize(o,r),this.updateCoverage(t,e);const a=this.cloudMat.uniforms;a.uCamPos.value.copy(e.position),a.uInvProj.value.copy(e.projectionMatrixInverse),a.uInvView.value.copy(e.matrixWorld);const l=this.domeMat.uniforms;l.uResolution.value.set(n,i),l.uCloudTexel.value.set(1/o,1/r),l.uInvProj.value.copy(e.projectionMatrixInverse),l.uInvView.value.copy(e.matrixWorld);const c=t.getRenderTarget();t.setRenderTarget(this.cloudRT),t.render(this.quadScene,this.quadCam),t.setRenderTarget(c),this.dome.position.copy(e.position),this.dome.scale.setScalar(e.far*.9)}}class Tx{height;zone;constructor(t,e){if(e.capabilities.isWebGL2&&e.extensions.has("OES_texture_float_linear"))this.height=new bs(t.height,ue,ue,ir,Xn);else{const o=new Uint16Array(t.height.length);for(let r=0;r<o.length;r++)o[r]=bf.toHalfFloat(t.height[r]);this.height=new bs(o,ue,ue,ir,si)}this.height.minFilter=Ae,this.height.magFilter=Ae,this.height.wrapS=this.height.wrapT=Ze,this.height.generateMipmaps=!1,this.height.needsUpdate=!0;const i=new Uint8Array(ue*ue*4);for(let o=0;o<ue*ue;o++){i[o*4]=t.zone[o],i[o*4+1]=t.veg[o];const r=t.coast[o];i[o*4+2]=Math.max(0,Math.min(255,Math.round(128+r*.5))),i[o*4+3]=t.exposure[o]}this.zone=new bs(i,ue,ue,En,qn),this.zone.minFilter=Dn,this.zone.magFilter=Dn,this.zone.wrapS=this.zone.wrapT=Ze,this.zone.generateMipmaps=!1,this.zone.needsUpdate=!0}}const Cx=96,Fu=8,Ou=7;function Rx(s,t){const e=Fu*2**s,n=Cx,i=n*e/2,o=n/4,r=3*n/4,a=[],l=[],c=[],h=new Int32Array((n+1)*(n+1)).fill(-1);let d=0;for(let g=0;g<=n;g++)for(let f=0;f<=n;f++){if(t&&f>o&&f<r&&g>o&&g<r)continue;h[g*(n+1)+f]=d++,a.push(-i+f*e,0,-i+g*e);let p=0,m=0;(f===0||f===n||g===0||g===n)&&s<Ou-1&&((f===0||f===n)&&(g&1)===1?m=e:(g===0||g===n)&&(f&1)===1&&(p=e)),l.push(p,m)}for(let g=0;g<n;g++)for(let f=0;f<n;f++){const v=h[g*(n+1)+f],p=h[g*(n+1)+f+1],m=h[(g+1)*(n+1)+f],_=h[(g+1)*(n+1)+f+1];v<0||p<0||m<0||_<0||(f+g&1?c.push(v,_,p,v,m,_):c.push(v,m,p,p,m,_))}const u=new oe;return u.setAttribute("position",new yt(a,3)),u.setAttribute("aEdge",new yt(l,2)),u.setIndex(c),u.computeBoundingSphere(),u.boundingSphere=new Fe(new C(0,0,0),i*1.5+200),u}const Px=`
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
`,Lx=`
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
`,Dx=`
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
`,Ix=`
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
`;class zx{constructor(t){this.textures=t;const e=new ce({color:16777215,roughness:.9,metalness:0}),n={uHeightTex:{value:t.height},uZoneTex:{value:t.zone},uRingOffset:this.offsetUniform,uWorldSize:{value:po},uMapN:{value:ue}},i=e.onBeforeCompile;e.onBeforeCompile=(o,r)=>{i?.(o,r),Object.assign(o.uniforms,n),o.vertexShader=o.vertexShader.replace("#include <common>",`#include <common>
${Px}`).replace("#include <beginnormal_vertex>",`${Lx}
vec3 objectNormal = tnormal;
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif`).replace("#include <begin_vertex>","vec3 transformed = wp;"),o.fragmentShader=o.fragmentShader.replace("#include <common>",`#include <common>
${Dx}`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
${Ix}`)},e.customProgramCacheKey=()=>"terrain-v4",this.material=e;for(let o=0;o<Ou;o++){const r=Rx(o,o>0),a=new ge(r,e);a.frustumCulled=!1,a.receiveShadow=!0,a.castShadow=!1,a.matrixAutoUpdate=!1,this.rings.push(a),this.group.add(a)}}group=new Ve;material;rings=[];offsetUniform={value:new C};update(t,e){const n=Fu*2,i=Math.round(t/n)*n,o=Math.round(e/n)*n;this.offsetUniform.value.set(i,0,o)}}const Nx=0,Ux=`
uniform vec3 uWaterOffset;
varying vec3 vWorldPos;
`,Fx=`
vec3 wp = position + uWaterOffset;
wp.y = 0.0;
vWorldPos = wp;
`,Ox=`
uniform sampler2D uHeightTex;
uniform sampler2D uZoneTex; // r: zone id, g: vegetation, b: 128 + 0.5 * signed distance to the coastline (m)
uniform sampler2D uWakeTex;
uniform vec4 uWakeRegion; // center.xy, size, unused
uniform float uWorldSize;
uniform float uWaveTime;
uniform float uWindSpeed;
uniform vec2 uWindDir;
uniform vec3 uSunDirW;
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
`,kx=`
vec3 wN; vec3 wV; float wFoam; float wMss; vec3 wBodyR; vec2 wDx; vec2 wDy; vec3 wDbg;
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
  foam = clamp(foam + wake.r * 1.3 + whitecap, 0.0, 1.0);

  wN = N; wV = V; wFoam = foam; wMss = mss; wDx = dxw; wDy = dyw;
  wBodyR = R;
  wDbg = vec3(depth, milk, open);
  normal = normalize((viewMatrix * vec4(N, 0.0)).xyz);
  nonPerturbedNormal = normal;
  // the lighting pipeline is used to gather shadowed irradiance (diffuse = 1) which we scale ourselves
  diffuseColor.rgb = vec3(1.0);
  roughnessFactor = clamp(pow(mss, 0.25), 0.05, 1.0);
  metalnessFactor = 0.0;
}
`,Bx=`
#if defined( RE_IndirectDiffuse ) && defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
  iblIrradiance += getIBLIrradiance( geometryNormal );
#endif
`,Hx=`
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
`;class Gx{mesh;material;offset={value:new C};uniforms;constructor(t,e){const n=new ce({color:16777215,roughness:.3,metalness:0});this.uniforms={uHeightTex:{value:t.height},uZoneTex:{value:t.zone},uWakeTex:{value:e},uWakeRegion:{value:new ke(0,0,3e3,0)},uWaterOffset:this.offset,uWorldSize:{value:po},uWaveTime:{value:0},uWindSpeed:{value:6},uWindDir:{value:new Pt(.94,.34)},uSunDirW:{value:new C(0,1,0)}};const i=this.uniforms,o=n.onBeforeCompile;n.onBeforeCompile=(l,c)=>{o?.(l,c),Object.assign(l.uniforms,i),l.vertexShader=l.vertexShader.replace("#include <common>",`#include <common>
${Ux}`).replace("#include <begin_vertex>",`${Fx}
vec3 transformed = wp;`),l.fragmentShader=""+l.fragmentShader.replace("#include <common>",`#include <common>
${Ox}`).replace("#include <normal_fragment_begin>",`#include <normal_fragment_begin>
${kx}`).replace("#include <lights_fragment_maps>",Bx).replace("#include <opaque_fragment>",Hx)},n.customProgramCacheKey=()=>`water-v2-${Nx}`,this.material=n;const r=13e4,a=new Bi(r,r,64,64);a.rotateX(-Math.PI/2),this.mesh=new ge(a,n),this.mesh.frustumCulled=!1,this.mesh.receiveShadow=!0,this.mesh.matrixAutoUpdate=!1,this.mesh.renderOrder=5}update(t,e,n,i,o,r,a,l){this.offset.value.set(Math.round(t/50)*50,0,Math.round(e/50)*50),this.uniforms.uWaveTime.value=n,this.uniforms.uWindSpeed.value=i,this.uniforms.uWindDir.value.copy(o),this.uniforms.uSunDirW.value.copy(r),this.uniforms.uWakeRegion.value.set(a.x,a.y,l,0)}}class Vx{rt;scene=new or;camera;center=new Pt;size;constructor(t=1024,e=3200){this.size=e,this.rt=new Un(t,t,{type:qn,depthBuffer:!1,minFilter:Ae,magFilter:Ae}),this.rt.texture.wrapS=this.rt.texture.wrapT=Ze,this.camera=new lr(-e/2,e/2,e/2,-e/2,1,400),this.camera.up.set(0,0,-1)}get texture(){return this.rt.texture}render(t,e,n){this.center.set(Math.round(e/8)*8,Math.round(n/8)*8),this.camera.position.set(this.center.x,200,this.center.y),this.camera.lookAt(this.center.x,0,this.center.y),this.camera.updateMatrixWorld();const i=t.getRenderTarget(),o=t.getClearColor(new Gt),r=t.getClearAlpha();t.setRenderTarget(this.rt),t.setClearColor(32896,0),t.clear(!0,!1,!1),t.render(this.scene,this.camera),t.setClearColor(o,r),t.setRenderTarget(i)}}const Wx=new Ke({vertexShader:`
    attribute float aAge;     // 0 fresh .. 1 old
    attribute float aSide;    // -1 .. 1 across the ribbon
    varying float vAge; varying float vSide; varying vec2 vWp;
    void main() { vAge = aAge; vSide = aSide; vWp = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,fragmentShader:`
    varying float vAge; varying float vSide; varying vec2 vWp;
    uniform float uStrength;
    float h21(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 q) { vec2 i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
    void main() {
      float edge = 1.0 - smoothstep(0.55, 1.0, abs(vSide));
      float life = 1.0 - vAge;
      // turbulent white core right behind the hull, fading and thinning with age, plus fainter V arms;
      // kept wide enough to survive the wake map's ~1.6 m texels (the old thin twin lines aliased into dots)
      float core = (1.0 - smoothstep(0.0, 0.9, abs(vSide))) * (0.55 + 0.45 * (1.0 - smoothstep(0.0, 0.5, vAge)));
      float arms = smoothstep(0.45, 0.8, abs(vSide)) * (1.0 - smoothstep(0.85, 1.0, abs(vSide))) * 0.5;
      // world-anchored breakup so a long wake reads as churned foam patches, not a chalk line
      float breakup = 0.55 + 0.45 * vn(vWp * 0.35) * (0.7 + 0.6 * vn(vWp * 1.3 + 4.0));
      float foam = (core + arms) * life * life * edge * uStrength * breakup;
      vec2 n = vec2(sign(vSide) * 0.35 * life * edge, 0.0);
      gl_FragColor = vec4(foam, 0.5 + n.x, 0.5 + n.y, edge * life);
    }
  `,uniforms:{uStrength:{value:1}},transparent:!0,depthTest:!1,depthWrite:!1,side:hn,blending:zi}),rc=new Ke({vertexShader:`
    #include <common>
    #include <logdepthbuf_pars_vertex>
    attribute float aAge; attribute float aSide;
    varying float vAge; varying float vSide;
    void main() {
      vAge = aAge; vSide = aSide;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }
  `,fragmentShader:`
    #include <common>
    #include <logdepthbuf_pars_fragment>
    varying float vAge; varying float vSide;
    uniform float uStrength;
    void main() {
      #include <logdepthbuf_fragment>
      float edge = 1.0 - smoothstep(0.2, 1.0, abs(vSide));
      float life = (1.0 - vAge);
      float a = edge * life * life * uStrength * smoothstep(0.0, 0.05, vAge);
      gl_FragColor = vec4(vec3(0.95, 0.97, 1.0), a);
    }
  `,uniforms:{uStrength:{value:.7}},transparent:!0,depthWrite:!1,side:hn}),Xx=new Ke({vertexShader:`
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
      vec2 p = (vUv - 0.5) * 2.0;
      // signed distance to the rounded hull outline, in quad units
      vec2 d = abs(p) / uHull;
      float r = length(max(d - 0.6, 0.0)) + min(max(d.x - 0.6, d.y - 0.6), 0.0);
      float outside = max(r - 0.4, 0.0);              // 0 at the hull edge, grows outward
      float ring = exp(-outside * outside * 40.0);     // thin foam meniscus hugging the hull
      float halo = exp(-outside * outside * 6.0) * 0.18; // faint disturbed-water patch
      // break the ring up with two octaves of value noise so it reads as foam, not a glow
      vec2 np = p * vec2(9.0, 4.0);
      float nz = 0.5 * vnoise(np) + 0.5 * vnoise(np * 2.3 + 7.1);
      float foam = (ring * (0.55 + 0.6 * nz) + halo * (0.6 + 0.4 * nz)) * uStrength * smoothstep(1.0, 0.85, max(abs(p.x), abs(p.y)));
      // drawn as a decal in the main scene (the shared wake map is ~3 m/px, far too coarse for a hull ring):
      // sky-lit foam, slightly translucent so the water colour shows through the halo
      gl_FragColor = vec4(vec3(0.90, 0.94, 0.97), clamp(foam, 0.0, 0.85));
    }
  `,uniforms:{uHull:{value:new Pt(.72,.28)},uStrength:{value:1}},transparent:!0,depthTest:!0,depthWrite:!1,side:hn});class rr{mesh;constructor(t,e,n=1){const i=t+2.6,o=e+2.2,r=Xx.clone();r.uniforms.uHull.value=new Pt(t/i,e/o),r.uniforms.uStrength.value=n,this.mesh=new ge(new Bi(i,o),r),this.mesh.frustumCulled=!1,this.mesh.visible=!1,this.mesh.renderOrder=6}static flat=new Be().setFromAxisAngle(new C(1,0,0),-Math.PI/2);spin=new Be;static up=new C(0,1,0);update(t,e,n,i,o,r=1){this.mesh.visible=o,o&&(this.mesh.position.set(t,.07,e),this.spin.setFromAxisAngle(rr.up,Math.atan2(-i,n)),this.mesh.quaternion.copy(this.spin).multiply(rr.flat),this.mesh.material.uniforms.uStrength.value=r)}}class to{constructor(t,e,n,i=1,o=Wx){this.width=e,this.lifetime=n,this.capacity=t,this.positions=new Float32Array(t*2*3),this.ages=new Float32Array(t*2),this.sides=new Float32Array(t*2);const r=[];for(let l=0;l<t-1;l++){const c=l*2,h=c+1,d=c+2,u=c+3;r.push(c,d,h,h,d,u)}this.geo=new oe,this.geo.setAttribute("position",new ye(this.positions,3)),this.geo.setAttribute("aAge",new ye(this.ages,1)),this.geo.setAttribute("aSide",new ye(this.sides,1)),this.geo.setIndex(r),this.geo.setDrawRange(0,0);const a=o.clone();a.uniforms.uStrength.value=i,this.mesh=new ge(this.geo,a),this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1}mesh;capacity;positions;ages;sides;points=[];lastX=NaN;lastZ=NaN;geo;update(t,e,n,i,o){if(i&&(Number.isNaN(this.lastX)||Math.hypot(t-this.lastX,e-this.lastZ)>Math.max(2,o*.25))){const a=Number.isNaN(this.lastX)?1:t-this.lastX,l=Number.isNaN(this.lastZ)?0:e-this.lastZ,c=Math.hypot(a,l)||1;this.points.push({x:t,z:e,dx:a/c,dz:l/c,t:n}),this.points.length>this.capacity&&this.points.shift(),this.lastX=t,this.lastZ=e}for(;this.points.length&&n-this.points[0].t>this.lifetime;)this.points.shift();const r=this.points.length;for(let a=0;a<r;a++){const l=this.points[a],c=Math.min(1,(n-l.t)/this.lifetime),h=this.width*(.6+1.8*c),d=-l.dz*h,u=l.dx*h;this.positions[a*6]=l.x-d,this.positions[a*6+1]=.05,this.positions[a*6+2]=l.z-u,this.positions[a*6+3]=l.x+d,this.positions[a*6+4]=.05,this.positions[a*6+5]=l.z+u,this.ages[a*2]=c,this.ages[a*2+1]=c,this.sides[a*2]=-1,this.sides[a*2+1]=1}this.geo.attributes.position.needsUpdate=!0,this.geo.attributes.aAge.needsUpdate=!0,this.geo.attributes.aSide.needsUpdate=!0,this.geo.setDrawRange(0,Math.max(0,(r-1)*6))}reset(){this.points.length=0,this.lastX=NaN,this.lastZ=NaN,this.geo.setDrawRange(0,0)}}const Gr=`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,qx=`
${hr}
${jn}
${ma}
${ga}
${Uu}
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
`,Yx=`
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
`,$x=`
uniform sampler2D tColor;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec3 s = texture2D(tColor, vUv).rgb * 0.227;
  s += (texture2D(tColor, vUv + uDir * 1.385).rgb + texture2D(tColor, vUv - uDir * 1.385).rgb) * 0.316;
  s += (texture2D(tColor, vUv + uDir * 3.231).rgb + texture2D(tColor, vUv - uDir * 3.231).rgb) * 0.070;
  gl_FragColor = vec4(s, 1.0);
}
`,jx=`
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
`;class Zx{constructor(t,e,n){this.renderer=t,this.opts=n;const i=new yc(1,1,ki);this.sceneRT=new Un(1,1,{type:si,samples:n.samples,depthTexture:i,depthBuffer:!0,minFilter:Ae,magFilter:Ae}),this.fogRT=new Un(1,1,{type:si,depthBuffer:!1,minFilter:Ae,magFilter:Ae});for(let o=0;o<3;o++)this.bloomRTs.push(new Un(1,1,{type:si,depthBuffer:!1,minFilter:Ae,magFilter:Ae})),this.bloomTmp.push(new Un(1,1,{type:si,depthBuffer:!1,minFilter:Ae,magFilter:Ae}));this.aerialMat=new Ke({vertexShader:Gr,fragmentShader:qx,uniforms:{...e.uniforms,tColor:{value:null},tDepth:{value:null},uInvProj:{value:new jt},uInvView:{value:new jt},uCamPos:{value:new C},uLogDepthFC:{value:1},uCloudShadowStrength:{value:1}},depthTest:!1,depthWrite:!1}),this.brightMat=new Ke({vertexShader:Gr,fragmentShader:Yx,uniforms:{tColor:{value:null},uThreshold:{value:1.5}},depthTest:!1,depthWrite:!1}),this.blurMat=new Ke({vertexShader:Gr,fragmentShader:$x,uniforms:{tColor:{value:null},uDir:{value:new Pt}},depthTest:!1,depthWrite:!1}),this.compositeMat=new Ke({vertexShader:Gr,fragmentShader:jx,uniforms:{tColor:{value:null},tBloom0:{value:null},tBloom1:{value:null},tBloom2:{value:null},uBloom:{value:.2},uExposure:{value:.92},uSaturation:{value:1.16},uVignette:{value:.25},uLift:{value:new C(0,.002,.004)},uGain:{value:new C(1.03,1,.97)},uResolution:{value:new Pt(1,1)},uGrain:{value:.004},uTime:{value:0}},depthTest:!1,depthWrite:!1}),this.quad=new ge(new Bi(2,2),this.aerialMat),this.quad.frustumCulled=!1,this.quadScene.add(this.quad)}sceneRT;fogRT;bloomRTs=[];bloomTmp=[];quad;quadScene=new or;quadCam=new lr(-1,1,1,-1,0,1);aerialMat;brightMat;blurMat;compositeMat;width=1;height=1;exposure=1;cloudShadowStrength=1;setSize(t,e){this.width=t,this.height=e,this.sceneRT.setSize(t,e),this.fogRT.setSize(t,e);for(let n=0;n<3;n++){const i=2**(n+1);this.bloomRTs[n].setSize(Math.max(1,Math.round(t/i)),Math.max(1,Math.round(e/i))),this.bloomTmp[n].setSize(Math.max(1,Math.round(t/i)),Math.max(1,Math.round(e/i)))}this.compositeMat.uniforms.uResolution.value.set(t,e)}get target(){return this.sceneRT}blit(t,e){this.quad.material=t,this.renderer.setRenderTarget(e),this.renderer.render(this.quadScene,this.quadCam)}finish(t,e){const n=this.renderer,i=this.aerialMat.uniforms;if(i.tColor.value=this.sceneRT.texture,i.tDepth.value=this.sceneRT.depthTexture,i.uInvProj.value.copy(t.projectionMatrixInverse),i.uInvView.value.copy(t.matrixWorld),i.uCamPos.value.copy(t.position),i.uLogDepthFC.value=2/(Math.log(t.far+1)/Math.LN2),i.uCloudShadowStrength.value=this.cloudShadowStrength,this.blit(this.aerialMat,this.fogRT),this.opts.bloom){this.brightMat.uniforms.tColor.value=this.fogRT.texture,this.blit(this.brightMat,this.bloomRTs[0]);for(let r=0;r<3;r++){const a=this.bloomRTs[r],l=this.bloomTmp[r],c=a.width,h=a.height;r>0&&(this.blurMat.uniforms.tColor.value=this.bloomRTs[r-1].texture,this.blurMat.uniforms.uDir.value.set(.5/c,.5/h),this.blit(this.blurMat,a)),this.blurMat.uniforms.tColor.value=a.texture,this.blurMat.uniforms.uDir.value.set(1/c,0),this.blit(this.blurMat,l),this.blurMat.uniforms.tColor.value=l.texture,this.blurMat.uniforms.uDir.value.set(0,1/h),this.blit(this.blurMat,a)}}const o=this.compositeMat.uniforms;o.tColor.value=this.fogRT.texture,o.tBloom0.value=this.bloomRTs[0].texture,o.tBloom1.value=this.bloomRTs[1].texture,o.tBloom2.value=this.bloomRTs[2].texture,o.uBloom.value=this.opts.bloom?.18:0,o.uExposure.value=this.exposure*(1+2.5*this.aerialMat.uniforms.uNight.value),o.uTime.value=e,this.blit(this.compositeMat,null),n.setRenderTarget(null)}}function f0(s,t,e){const n=Math.hypot(e[0]-t[0],e[1]-t[1]),i=Math.max(2,Math.ceil(n/10));let o=-1,r=-1;for(let c=0;c<=i;c++){const h=c/i,d=t[0]+(e[0]-t[0])*h,u=t[1]+(e[1]-t[1])*h,g=s.heightAt(d,u)>=.8;g&&o<0&&(o=c),g&&(r=c)}if(o<0||r-o<3)return null;const a=o/i,l=r/i;return[[t[0]+(e[0]-t[0])*a,t[1]+(e[1]-t[1])*a],[t[0]+(e[0]-t[0])*l,t[1]+(e[1]-t[1])*l]]}function Kx(s){const t=[],e=new Map,n=new Map;for(const r of s.roads)for(let a=0;a<r.pts.length-1;a++)t.push({a:r.pts[a],b:r.pts[a+1],width:r.width,cls:r.cls,lanes:r.lanes,traffic:r.traffic,lift:0});const i=new We("lots"),o=(r,a,l)=>s.districtAt(a,l)===r;for(const r of s.districts){const a=Math.cos(r.rot),l=Math.sin(r.rot),c=(w,x)=>[r.cx+w*a-x*l,r.cz+w*l+x*a],h=(w,x)=>{const A=w-r.cx,M=x-r.cz;return[A*a+M*l,-A*l+M*a]};if(r.track){const w=[],x=[];let A=1,M=0;for(let S=0;S<r.track.length-1;S++){const E=r.track[S],y=r.track[S+1],b=f0(s,E,y);if(b){const L={a:b[0],b:b[1],width:7,cls:"lane",lanes:2,traffic:.6,lift:0};t.push(L),w.push(L)}const T=Math.hypot(y[0]-E[0],y[1]-E[1]),[U,O]=h(E[0],E[1]),[z,B]=h(y[0],y[1]),F=Math.abs(z-U)>=Math.abs(B-O);for(let L=M;L<T-12;L+=i.range(42,58)){const H=L/T,G=U+(z-U)*H,N=O+(B-O)*H;A=-A;const $=6,V=46,tt=20,W=F?{x0:G-tt,x1:G+tt,z0:Math.min(N+A*$,N+A*($+V)),z1:Math.max(N+A*$,N+A*($+V)),streetWidth:7}:{z0:N-tt,z1:N+tt,x0:Math.min(G+A*$,G+A*($+V)),x1:Math.max(G+A*$,G+A*($+V)),streetWidth:7},[q,X]=c((W.x0+W.x1)/2,(W.z0+W.z1)/2);s.heightAt(q,X)<1.2||!o(r,q,X)||(x.push(W),M=0)}}e.set(r.id,w),n.set(r.id,x);continue}const d=s.grids.get(r.id);if(!d)continue;const u=[],g=r.zone===ne.DOWNTOWN?14:r.zone===ne.RES_MID||r.zone===ne.HOTEL||r.zone===ne.INDUSTRIAL?12:9,f="street",{xs:v,zs:p}=d,m=(w,x)=>{const A=f0(s,w,x);if(!A)return;const M=[(A[0][0]+A[1][0])/2,(A[0][1]+A[1][1])/2];if(!o(r,M[0],M[1]))return;const S={a:A[0],b:A[1],width:g,cls:f,lanes:2,traffic:r.zone===ne.DOWNTOWN?4:1.5,lift:0};t.push(S),u.push(S)};for(const w of v)for(let x=0;x<p.length-1;x++)m(c(w,p[x]),c(w,p[x+1]));for(const w of p)for(let x=0;x<v.length-1;x++)m(c(v[x],w),c(v[x+1],w));e.set(r.id,u);const _=[];for(let w=0;w<v.length-1;w++)for(let x=0;x<p.length-1;x++){const[A,M]=c((v[w]+v[w+1])/2,(p[x]+p[x+1])/2);o(r,A,M)&&_.push({x0:v[w],x1:v[w+1],z0:p[x],z1:p[x+1],streetWidth:g})}n.set(r.id,_)}for(const r of s.runways)t.push({a:r.a,b:r.b,width:r.width,cls:"runway",lanes:0,traffic:0,lift:0});return{segments:t,streetsByDistrict:e,blocksByDistrict:n}}const Jx=`
varying vec2 vRoadUv;   // x across (-1..1), y along (metres)
varying vec3 vRoadInfo; // lanes, width, class
varying vec3 vWorldPosR;
${jn}
`,Qx=`
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
`;function t2(s,t,e){const n=[],i=[],o=[],r=[],a=[];let l=0;const c=g=>g==="highway"||g==="causeway"?3:g==="arterial"?2:g==="runway"?5:g==="taxiway"?6:g==="lane"?0:1,h=[];for(const g of t){if(Math.hypot(g.b[0]-g.a[0],g.b[1]-g.a[1])<1)continue;const f=h[h.length-1],v=f&&f[f.length-1];v&&v.cls===g.cls&&v.width===g.width&&v.lift===g.lift&&v.b[0]===g.a[0]&&v.b[1]===g.a[1]?f.push(g):h.push([g])}for(const g of h){const f=[g[0].a,...g.map(y=>y.b)],v=f.length,p=[];for(let y=0;y<v-1;y++){const b=f[y+1][0]-f[y][0],T=f[y+1][1]-f[y][1],U=Math.hypot(b,T);p.push([b/U,T/U])}const m=[];for(let y=0;y<v;y++){const b=p[Math.max(0,y-1)],T=p[Math.min(v-2,y)];let U=-(b[1]+T[1]),O=b[0]+T[0];const z=Math.hypot(U,O)||1;U/=z,O/=z;const B=Math.max(.5,U*-T[1]+O*T[0]);m.push([U/B,O/B])}const _=g[0].width,w=_*.5,x=c(g[0].cls),A=g[0].lanes,M=g[0].lift;let S=0,E=!0;for(let y=0;y<v-1;y++){const[b,T]=f[y],[U,O]=f[y+1],z=Math.hypot(U-b,O-T),B=Math.max(1,Math.ceil(z/15)),F=m[y],L=m[y+1];for(let H=E?0:1;H<=B;H++){const G=H/B,N=b+(U-b)*G,$=T+(O-T)*G,V=F[0]+(L[0]-F[0])*G,tt=F[1]+(L[1]-F[1])*G;for(const W of[-1,1]){const q=N+V*w*W,X=$+tt*w*W,it=s.heightAt(q,X)+.15+M;n.push(q,it,X),a.push(0,1,0),i.push(W,S+G*z),o.push(A,_,x)}l+=2,(!E||H>0)&&r.push(l-4,l-3,l-2,l-2,l-3,l-1),E=!1}S+=z}}const d=new oe;d.setAttribute("position",new yt(n,3)),d.setAttribute("normal",new yt(a,3)),d.setAttribute("aRoadUv",new yt(i,2)),d.setAttribute("aRoadInfo",new yt(o,3)),d.setIndex(r),d.computeBoundingSphere();const u=new ge(d,e);return u.receiveShadow=!0,u.castShadow=!1,u.renderOrder=2,u.frustumCulled=!1,[u]}function e2(){const s=new ce({color:16777215,roughness:.8,metalness:0,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2});return s.onBeforeCompile=t=>{t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aRoadUv; attribute vec3 aRoadInfo; varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vRoadUv = aRoadUv; vRoadInfo = aRoadInfo; vWorldPosR = (modelMatrix * vec4(position, 1.0)).xyz;`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
${Jx}`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
${Qx}`)},s.customProgramCacheKey=()=>"road-v3",s}const Lc=0,ta=1,ac=2,ku=3,Bu=4,ui=s=>1<<s,p0={all:ui(ta)|ui(ac)|ui(ku),mid:ui(ta)|ui(ac),near:ui(ta)};function Mo(s,t){return t?s==="all"?ui(Lc):ui(Bu)|p0[s]:p0[s]}function n2(s,t,e=!0){s.layers.mask=Mo(t,e)}function i2(s){s.layers.set(Lc),s.layers.enable(Bu)}function s2(s,t){const e=s===0?ta:s===t-1?ku:ac;return ui(Lc)|ui(e)}function o2(s,t){const e=s.shadowMap,n=e.render.bind(e),i=[];e.render=(o,r,a)=>{if(!e.enabled||o.length===0||!e.autoUpdate&&!e.needsUpdate)return;const l=e.needsUpdate,c=a.layers.mask;let h=0;for(const d of o)t(d)>=0&&h++;for(const d of o){const u=t(d);a.layers.mask=u>=0?s2(u,h):c,i[0]=d,e.needsUpdate=l,lc=u,n(i,r,a)}lc=-1,i.length=0,e.needsUpdate=!1,a.layers.mask=c}}let lc=-1;function r2(){return lc}const Vr=new Fe,m0=new jt,Wr=new jt;class Hu{viewFrustum=new fo;shadowFrustum=new fo;shadowDir=new C(1,0,0);spread=1;tmp=new C;update(t,e,n){Wr.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this.viewFrustum.setFromProjectionMatrix(Wr);const i=t.near,o=i*Math.tan(Vn.DEG2RAD*.5*t.fov)/t.zoom,r=2*o,a=t.aspect*r;m0.makePerspective(-a/2,a/2,o,o-r,i,Math.max(i+1,e),t.coordinateSystem),Wr.multiplyMatrices(m0,t.matrixWorldInverse),this.shadowFrustum.setFromProjectionMatrix(Wr);const l=Math.hypot(n.x,n.z);l>1e-5&&this.shadowDir.set(-n.x/l,0,-n.z/l),this.spread=Math.min(20,l/Math.max(n.y,.001))}boxInView(t){return this.viewFrustum.intersectsBox(t)}sphereInView(t,e){return Vr.set(t,e),this.viewFrustum.intersectsSphere(Vr)}casterInView(t,e,n){const i=Math.max(0,n)*this.spread;return this.tmp.copy(t).addScaledVector(this.shadowDir,i*.5),Vr.set(this.tmp,e+i*.5),this.shadowFrustum.intersectsSphere(Vr)}}function a2(s){let t=0;for(let e=0;e<s.length-1;e++)t+=Math.hypot(s[e+1][0]-s[e][0],s[e+1][1]-s[e][1]);return t}function l2(s,t){let e=0;for(let n=0;n<s.length-1;n++){const i=Math.hypot(s[n+1][0]-s[n][0],s[n+1][1]-s[n][1]);if(t<=e+i||n===s.length-2){const o=Jt((t-e)/i,0,1),r=(s[n+1][0]-s[n][0])/i,a=(s[n+1][1]-s[n][1])/i;return{x:s[n][0]+r*i*o,z:s[n][1]+a*i*o,dx:r,dz:a}}e+=i}return{x:s[0][0],z:s[0][1],dx:1,dz:0}}function c2(s,t,e,n){const i=Math.min(160,n*.25),o=t.heightAt(s.pts[0][0],s.pts[0][1]),r=t.heightAt(s.pts[s.pts.length-1][0],s.pts[s.pts.length-1][1]),a=St(0,i,e),l=St(0,i,n-e);let c=ie(Math.max(o,.5)+.3,s.deck,a);if(c=Math.min(c,ie(Math.max(r,.5)+.3,s.deck,l)),s.archHeight>0){const h=s.archT*n,d=Math.abs(e-h)/(s.archLength*.5);if(d<1){const u=.5+.5*Math.cos(d*Math.PI);c+=(s.archHeight-s.deck)*u}}return c}const h2=1e3,u2=3200,d2=2500,f2=5e3,p2=6,m2=2.4,g2=1.05,$i=.15,Oo=10,v2=`
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
`;function x2(s){const t=s,e=new ce({color:t.color.clone(),roughness:t.roughness,metalness:0,vertexColors:!0});return t.defines&&(e.defines={...t.defines}),e.onBeforeCompile=(n,i)=>{t.onBeforeCompile.call(t,n,i),n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aRoadUv; attribute vec3 aRoadInfo; varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vRoadUv = aRoadUv; vRoadInfo = aRoadInfo; vWorldPosR = (modelMatrix * vec4(position, 1.0)).xyz;`),n.fragmentShader=n.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;
${jn}`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
${v2}`)},e.customProgramCacheKey=()=>"bridge-concrete-v2",e}function _2(s){const t=s,e=new ce({color:t.color.clone(),roughness:t.roughness,metalness:t.metalness,vertexColors:!0,emissive:new Gt(1,.8,.52),emissiveIntensity:0});return t.defines&&(e.defines={...t.defines}),e.onBeforeCompile=(n,i)=>{t.onBeforeCompile.call(t,n,i),n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
attribute float aGlow; varying float vGlow;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vGlow = aGlow;`),n.fragmentShader=n.fragmentShader.replace("#include <common>",`#include <common>
varying float vGlow;`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
totalEmissiveRadiance *= vGlow;`)},e.customProgramCacheKey=()=>"bridge-steel-v1",e}class fs{constructor(t){this.extraSize=t}pos=[];nrm=[];col=[];extra=[];idx=[];bounds=new Xe;get vertexCount(){return this.pos.length/3}get triangleCount(){return this.idx.length/3}vertex(t,e,n,i,o,r,a,l){if(this.pos.push(t,e,n),this.nrm.push(i,o,r),this.col.push(a[0],a[1],a[2]),this.extraSize)if(l)for(let h=0;h<this.extraSize;h++)this.extra.push(l[h]);else for(let h=0;h<this.extraSize;h++)this.extra.push(0);const c=this.bounds;return t<c.min.x&&(c.min.x=t),t>c.max.x&&(c.max.x=t),e<c.min.y&&(c.min.y=e),e>c.max.y&&(c.max.y=e),n<c.min.z&&(c.min.z=n),n>c.max.z&&(c.max.z=n),this.vertexCount-1}append(t){const e=this.vertexCount;for(const n of t.pos)this.pos.push(n);for(const n of t.nrm)this.nrm.push(n);for(const n of t.col)this.col.push(n);for(const n of t.extra)this.extra.push(n);for(const n of t.idx)this.idx.push(n+e);this.bounds.union(t.bounds)}addGeometry(t,e,n){const i=t.getAttribute("position"),o=t.getAttribute("normal"),r=this.vertexCount;for(let l=0;l<i.count;l++)this.vertex(i.getX(l),i.getY(l),i.getZ(l),o.getX(l),o.getY(l),o.getZ(l),e,n);const a=t.getIndex();if(a)for(let l=0;l<a.count;l++)this.idx.push(r+a.getX(l));else for(let l=0;l<i.count;l++)this.idx.push(r+l)}box(t,e,n,i,o,r,a,l,c,h=!1,d){if(!(o<=.005)){ko.setFromEuler(y2.set(l,a,0,"YXZ")),g0.compose(ps.set(t,e+o/2,n),ko,M2.set(i,o,r));for(const u of w2){if(h&&u.n[1]!==0)continue;Qe.set(u.n[0],u.n[1],u.n[2]).applyQuaternion(ko);const g=this.vertexCount;for(const f of u.v)ps.set(f[0],f[1],f[2]).applyMatrix4(g0),this.vertex(ps.x,ps.y,ps.z,Qe.x,Qe.y,Qe.z,c,d);this.idx.push(g,g+1,g+2,g,g+2,g+3)}}}cylinder(t,e,n,i,o,r,a,l=!0,c){if(o<=.005)return;const h=i/2,d=this.vertexCount;for(let u=0;u<=r;u++){const g=u/r*Math.PI*2,f=Math.cos(g),v=Math.sin(g);this.vertex(t+f*h,e,n+v*h,f,0,v,a,c),this.vertex(t+f*h,e+o,n+v*h,f,0,v,a,c)}for(let u=0;u<r;u++){const g=d+u*2,f=g+1,v=g+2,p=g+3;this.idx.push(g,f,v,f,p,v)}if(l){const u=this.vertex(t,e+o,n,0,1,0,a,c),g=this.vertexCount;for(let f=0;f<=r;f++){const v=f/r*Math.PI*2;this.vertex(t+Math.cos(v)*h,e+o,n+Math.sin(v)*h,0,1,0,a,c)}for(let f=0;f<r;f++)this.idx.push(u,g+f+1,g+f)}}disc(t,e,n,i,o,r,a,l){const c=this.vertex(t,e,n,0,1,0,a,l),h=this.vertexCount;for(let d=0;d<=r;d++){const u=d/r*Math.PI*2;this.vertex(t+Math.cos(u)*i,e,n+Math.sin(u)*o,0,1,0,a,l)}for(let d=0;d<r;d++)this.idx.push(c,h+d+1,h+d)}loft(t,e,n,i){for(let o=0;o<e.length-1;o++){const[r,a]=e[o],[l,c]=e[o+1],h=l-r,d=c-a,u=Math.hypot(h,d)||1,g=d/u,f=-h/u,v=Array.isArray(n[0])?n[Math.min(o,n.length-1)]:n,p=this.vertexCount;for(const _ of t){const w=_.rx*g,x=f,A=_.rz*g;this.vertex(_.x+_.rx*r,_.y+a,_.z+_.rz*r,w,x,A,v,i),this.vertex(_.x+_.rx*l,_.y+c,_.z+_.rz*l,w,x,A,v,i)}let m=!1;t.length>1&&(al.fromArray(this.pos,p*3),v0.fromArray(this.pos,(p+1)*3),x0.fromArray(this.pos,(p+3)*3),Qe.subVectors(v0,al).cross(x0.sub(al)),ps.fromArray(this.nrm,p*3),m=Qe.dot(ps)<0);for(let _=1;_<t.length;_++){const w=p+(_-1)*2,x=w+1,A=p+_*2,M=A+1;m?this.idx.push(w,M,x,w,A,M):this.idx.push(w,x,M,w,M,A)}}}strut(t,e,n,i,o){Xr.subVectors(e,t);const r=Xr.length();if(r<.1)return;Xr.divideScalar(r),ko.setFromUnitVectors(S2,Xr);const a=this.vertexCount;for(let l=0;l<=6;l++){const c=l/6*Math.PI*2;Qe.set(Math.cos(c),0,Math.sin(c)).applyQuaternion(ko),this.vertex(t.x+Qe.x*n,t.y+Qe.y*n,t.z+Qe.z*n,Qe.x,Qe.y,Qe.z,i,o),this.vertex(e.x+Qe.x*n,e.y+Qe.y*n,e.z+Qe.z*n,Qe.x,Qe.y,Qe.z,i,o)}for(let l=0;l<6;l++){const c=a+l*2,h=c+1,d=c+2,u=c+3;this.idx.push(c,h,d,h,u,d)}}build(t){const e=new oe;e.setAttribute("position",new yt(this.pos,3)),e.setAttribute("normal",new yt(this.nrm,3)),e.setAttribute("color",new yt(this.col,3)),e.setAttribute("uv",new ye(new Float32Array(this.vertexCount*2),2));let n=0;for(const[i,o]of t){const r=new Float32Array(this.vertexCount*o);for(let a=0;a<this.vertexCount;a++)for(let l=0;l<o;l++)r[a*o+l]=this.extra[a*this.extraSize+n+l];e.setAttribute(i,new ye(r,o)),n+=o}return e.setIndex(this.vertexCount>65535?new ye(new Uint32Array(this.idx),1):new ye(new Uint16Array(this.idx),1)),e.boundingBox=this.bounds.clone(),e.boundingSphere=this.bounds.getBoundingSphere(new Fe),e}}const w2=[{n:[1,0,0],v:[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]]},{n:[-1,0,0],v:[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]]},{n:[0,1,0],v:[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]]},{n:[0,-1,0],v:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]},{n:[0,0,1],v:[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]},{n:[0,0,-1],v:[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]}],g0=new jt,ko=new Be,y2=new Oe,ps=new C,M2=new C,Qe=new C,Xr=new C,al=new C,v0=new C,x0=new C,S2=new C(0,1,0);class b2{constructor(t){this.steel=t}chunks=[];sun=null;cull=new Hu;sunDir=new C(0,1,0);seen=new Set;cameras=[];observe(t){t.isPerspectiveCamera&&this.seen.add(t)}update(t){!this.sun&&t&&(this.sun=t.children.find(o=>o.isDirectionalLight&&o.castShadow)??null);let e=10;this.sun&&(this.sunDir.subVectors(this.sun.position,this.sun.target.position),this.sunDir.lengthSq()>1e-6?this.sunDir.normalize():this.sunDir.set(0,1,0),e=this.sun.intensity);const n=Math.asin(Jt(this.sunDir.y,-1,1))*180/Math.PI,i=Math.max(1-St(2,10,n),1-St(.15,.6,e));if(this.steel.emissiveIntensity=p2*i,this.seen.size&&(this.cameras=[...this.seen],this.seen.clear()),!!this.cameras.length){for(const o of this.chunks){o.dist=1/0;for(const r of o.meshes)r.inView=!1,r.cast=!1}for(const o of this.cameras){const r=o.position.x,a=o.position.z;this.cull.update(o,Jt(o.position.y*9,5e3,12e3),this.sunDir);for(const l of this.chunks){const c=Math.max(0,Math.hypot(l.center.x-r,l.center.z-a)-l.r);l.dist=Math.min(l.dist,c);for(const h of l.meshes)!h.inView&&this.cull.boxInView(h.box)&&(h.inView=!0),!h.cast&&c<u2&&this.casterInView(h)&&(h.cast=!0)}}for(const o of this.chunks){for(const r of o.meshes)r.mesh.castShadow=r.cast,r.mesh.visible=r.inView||r.cast,r.mesh.layers.mask=Mo(r.cls,r.inView);o.steel&&(o.steel.geometry.setDrawRange(0,o.dist>d2?o.headIndices:1/0),o.dist>f2&&(o.steel.visible=!1))}}}casterInView(t){const e=t.height*this.cull.spread,n=this.cull.shadowDir;return qs.copy(t.box),n.x>0?qs.max.x+=n.x*e:qs.min.x+=n.x*e,n.z>0?qs.max.z+=n.z*e:qs.min.z+=n.z*e,this.cull.shadowFrustum.intersectsBox(qs)}}const qs=new Xe;class E2 extends Ve{constructor(t){super(),this.culler=t}updateMatrixWorld(t){this.culler.update(this.parent),super.updateMatrixWorld(t)}}const rn=[1,1,1],ms=[1.08,1.08,1.07],_0=[.86,.86,.86],ll=[.78,.78,.79],w0=[.5,.5,.52],y0=[.74,.75,.76],M0=[1.85,1.9,1.92],S0=[1,1,1],Ai=[1,1,1],A2=[.3,.3,.32],T2=[.92,.9,.84];function C2(s,t,e,n){const i=x2(e),o=_2(n),r=new b2(o),a=new E2(r),l=[],c=new fs(5),h=[0,0,0,0,0],d=m2,u=g2;for(const f of s.bridges){const v=a2(f.pts),p=f.width,m=p*.5,_=Jt(f.lanes*3.3,8,p-4),w=_*.5,x=V=>{const tt=l2(f.pts,V);return{x:tt.x,y:c2(f,s,V,v),z:tt.z,rx:-tt.dz,rz:tt.dx,dx:tt.dx,dz:tt.dz,s:V}},A=V=>Math.atan2(V.dx,V.dz),M=f.archHeight>=20&&f.archLength>=350,S=!M&&f.archHeight>0&&f.archLength>=300,E=f.archT*v,y=M?Math.min(f.archLength*.5,300):S?f.archLength*.8:0,b=E-y/2,T=E+y/2,U=Math.max(1,Math.round(v/h2)),O=v/U,z=V=>Math.min(U-1,Math.max(0,Math.floor(V/O))),B=Array.from({length:U},()=>({struct:new fs(5),deck:new fs(5),steel:new fs(1),heads:new fs(1),tall:new fs(5),arch:new fs(1)})),F=Math.ceil(v/Oo),L=[];for(let V=0;V<=F;V+=2){const tt=x(Math.min(v,V*Oo));L.push(new C(tt.x,tt.y,tt.z))}if((F&1)===1){const V=x(v);L.push(new C(V.x,V.y,V.z))}l.push({id:f.id,pts:L,width:f.width,lanes:f.lanes,traffic:f.traffic});const H=f.lanes>=6?.3:0,G=[0,0,f.lanes,_,H];for(let V=0;V<U;V++){const tt=V*O,W=Math.min(v,(V+1)*O),q=[x(tt)];for(let j=(Math.floor(tt/Oo)+1)*Oo;j<W-.01;j+=Oo)q.push(x(j));q.push(x(W));const X=B[V],it=[[-m,$i,0],[-w,$i,0],[-w,$i,1],[-w,.02,1],[-w,.02,0],[w,.02,0],[w,.02,-1],[w,$i,-1],[w,$i,0],[m,$i,0]],lt=it.length,ft=X.deck.vertexCount;q.forEach((j,et)=>{for(const[D,J,Z]of it)G[0]=D/w,G[1]=j.s,Z===0?X.deck.vertex(j.x+j.rx*D,j.y+J,j.z+j.rz*D,0,1,0,S0,G):X.deck.vertex(j.x+j.rx*D,j.y+J,j.z+j.rz*D,j.rx*Z,0,j.rz*Z,S0,G);if(et>0){const D=ft+(et-1)*lt,J=ft+et*lt;for(let Z=0;Z<lt;Z+=2)X.deck.idx.push(D+Z,D+Z+1,J+Z,J+Z,D+Z+1,J+Z+1)}});const K=[[-m,$i],[-m-.1,u-.24],[-m-.24,u],[-m-.42,u],[-m-.56,u-.24],[-m-.56,-.4],[-m-.24,-1.05],[-p*.31,-d],[p*.31,-d],[m+.24,-1.05],[m+.56,-.4],[m+.56,u-.24],[m+.42,u],[m+.24,u],[m+.1,u-.24],[m,$i]],ot=[rn,ms,ms,ms,rn,_0,ll,ll,ll,_0,rn,ms,ms,ms,rn];if(X.struct.loft(q,K,ot,h),H>0){const j=H;X.struct.loft(q,[[j,.02],[j,.3],[j*.4,.9],[-j*.4,.9],[-j,.3],[-j,.02]],[rn,rn,ms,rn,rn],h)}for(let j=0;j<q.length-1;j++){const et=q[j],D=s.heightAt(et.x,et.z);if(D<.3)continue;const J=D-.8,Z=et.y-d+.15;Z-J<.3||et.y-D>16||X.struct.box(et.x,J,et.z,p+.8,Z-J,q[j+1].s-et.s+.4,A(et),0,rn,!1,h)}for(let j=1;j<q.length;j++){const et=q[j-1],D=q[j],J=Math.hypot(D.x-et.x,D.y-et.y,D.z-et.z),Z=Math.atan2(D.x-et.x,D.z-et.z),at=-Math.asin(Jt((D.y-et.y)/J,-1,1));for(const ut of[-1,1]){const vt=(et.x+D.x)/2+(et.rx+D.rx)/2*(m+.33)*ut,dt=(et.z+D.z)/2+(et.rz+D.rz)/2*(m+.33)*ut;X.steel.box(vt,(et.y+D.y)/2+u+.86,dt,.08,.08,J+.1,Z,at,Ai,!0),X.steel.box(vt,(et.y+D.y)/2+u+.44,dt,.06,.06,J+.1,Z,at,Ai,!0)}}for(let j=Math.ceil(tt/4)*4;j<W;j+=4){const et=x(j),D=A(et);for(const J of[-1,1])X.steel.box(et.x+et.rx*(m+.33)*J,et.y+u,et.z+et.rz*(m+.33)*J,.12,.9,.12,D,0,Ai,!0)}for(let j=22,et=0;j<v-20;j+=45,et++){if(z(j)!==V)continue;const D=x(j),J=et%2===0?-1:1,Z=A(D),at=D.x+D.rx*(m+.33)*J,ut=D.z+D.rz*(m+.33)*J;X.steel.cylinder(at,D.y+u,ut,.2,9,6,Ai,!1);const vt=D.x+D.rx*(m+.33-1.25)*J,dt=D.z+D.rz*(m+.33-1.25)*J;X.steel.box(vt,D.y+u+8.85,dt,2.5,.16,.16,Z,0,Ai,!0);const I=D.x+D.rx*(m+.33-2.35)*J,R=D.z+D.rz*(m+.33-2.35)*J;X.heads.box(I,D.y+u+8.62,R,.8,.26,.5,Z,0,T2,!1,[1])}}const N=p>=20?50:42,$=[];for(let V=N*.5;V<v-N*.3;V+=N)y>0&&V>b-12&&V<T+12||$.push(V);S&&$.push(b,T);for(const V of $){const tt=x(V),W=s.heightAt(tt.x,tt.z);if(tt.y-W<2.8)continue;const q=B[z(V)],X=A(tt),it=tt.y-d,lt=S&&(V===b||V===T),ft=lt?2.4:2,K=it-ft,ot=Math.min(W,-.5)-2.5,j=W<.2,et=p+6.4,D=(J,Z,at,ut,vt,dt)=>{if(j){q.struct.box(J,-1,Z,at+2.4,1.6,ut+2.4,X,0,y0,!1,h),q.struct.disc(J,.05,Z,(at+2.4)*.5+.9,(ut+2.4)*.5+.9,12,M0,h);const I=Math.min(vt,1.7);dt?q.struct.cylinder(J,.55,Z,at,I-.55,12,w0,!1,h):q.struct.box(J,.55,Z,at,I-.55,ut,X,0,w0,!0,h),dt?q.struct.cylinder(J,I,Z,at,vt-I,12,rn,!1,h):q.struct.box(J,I,Z,at,vt-I,ut,X,0,rn,!0,h)}else dt?q.struct.cylinder(J,ot,Z,at,vt-ot,12,rn,!1,h):q.struct.box(J,ot,Z,at,vt-ot,ut,X,0,rn,!0,h)};if(p>=20||lt){const J=lt?p*.7:p*.5,Z=lt?3.2:2.2;D(tt.x,tt.z,J,Z,K,!1),q.struct.box(tt.x,K,tt.z,et,ft,Z+1,X,0,rn,!1,h)}else{for(const J of[-p*.3,p*.3])D(tt.x+tt.rx*J,tt.z+tt.rz*J,2.4,2.4,K,!0);q.struct.box(tt.x,K,tt.z,p+5.6,ft,2.6,X,0,rn,!1,h)}q.steel.box(tt.x,tt.y+.03,tt.z,_,.04,.3,X,0,A2,!1)}if(M){const V=.24*y+10,tt=3.2,W=4.8,q=m+1.9,X=y>=240?9:7,it=(y/2-16)/X;for(const lt of[b,T]){const ft=B[z(lt)],K=x(lt),ot=s.heightAt(K.x,K.z),j=A(K),et=Math.min(ot,-.5)-3;for(const D of[-1,1]){const J=K.x+K.rx*q*D,Z=K.z+K.rz*q*D;ft.tall.box(J,et,Z,tt,K.y+V-et,W,j,0,rn,!1,h),ot<.2&&(ft.struct.box(J,-1.2,Z,tt+3,1.9,W+3,j,0,y0,!1,h),ft.struct.disc(J,.05,Z,(tt+3)*.5+1,(W+3)*.5+1,12,M0,h))}ft.struct.box(K.x,K.y-d-2.2,K.z,2*q+tt,2.2,W,j,0,rn,!1,h),ft.tall.box(K.x,K.y+V-5,K.z,2*q+tt,3.6,W*.7,j,0,rn,!1,h);for(let D=1;D<=X;D++)for(const J of[-1,1]){const Z=lt+J*(D*it+10);if(Z<4||Z>v-4)continue;const at=x(Z),ut=K.y+V-3-(X-D)*(.45*V/X);for(const vt of[-1,1]){const dt=new C(at.x+at.rx*(m+.36)*vt,at.y+1.1,at.z+at.rz*(m+.36)*vt),I=new C(K.x+K.rx*(q-tt*.5+.1)*vt,ut,K.z+K.rz*(q-tt*.5+.1)*vt);ft.arch.strut(dt,I,.11,Ai)}}}}else if(S){const V=B[z(E)],tt=f.archHeight*.95+4,W=m+1,q=[[],[]],X=28;for(let it=0;it<=X;it++){const lt=it/X,ft=x(b+y*lt),K=ft.y+tt*Math.sin(lt*Math.PI)+.8;for(const ot of[-1,1]){const j=new C(ft.x+ft.rx*W*ot,K,ft.z+ft.rz*W*ot);q[ot<0?0:1].push(j),it%2===1&&it>1&&it<X-1&&V.arch.strut(new C(j.x,ft.y+u+.2,j.z),j,.11,Ai)}(it===8||it===14||it===20)&&V.arch.box(ft.x,K-.7,ft.z,2*W,1.2,1.2,A(ft),0,Ai,!1)}for(const it of q){const lt=new Pc(new Au(it),56,1.15,8,!1);V.arch.addGeometry(lt,Ai),lt.dispose()}}for(let V=0;V<U;V++){const tt=B[V];c.append(tt.deck);const W={meshes:[],steel:null,headIndices:0,center:new C,r:0,dist:1/0},q=new Xe,X=(K,ot)=>{K.name=`${f.id}#${V}`,K.castShadow=!0,K.receiveShadow=!0,K.onBeforeRender=(et,D,J)=>{r.observe(J)};const j=K.geometry.boundingBox;W.meshes.push({mesh:K,cls:ot,box:j,height:j.max.y-j.min.y,inView:!0,cast:!0}),q.union(j),a.add(K)},it=tt.struct.idx.length;tt.struct.append(tt.deck);const lt=new ge(tt.struct.build([["aRoadUv",2],["aRoadInfo",3]]),i);if(lt.onBeforeShadow=(K,ot,j)=>{r.observe(j),lt.geometry.setDrawRange(0,it)},lt.onAfterShadow=()=>{lt.geometry.setDrawRange(0,1/0)},X(lt,"all"),tt.heads.idx.length||tt.steel.idx.length){const K=tt.heads.idx.length;tt.heads.append(tt.steel);const ot=new ge(tt.heads.build([["aGlow",1]]),o);X(ot,"near"),W.steel=ot,W.headIndices=K}tt.tall.idx.length&&X(new ge(tt.tall.build([["aRoadUv",2],["aRoadInfo",3]]),i),"all"),tt.arch.idx.length&&X(new ge(tt.arch.build([["aGlow",1]]),o),M?"near":"all");const ft=q.getBoundingSphere(new Fe);W.center.copy(ft.center),W.r=ft.radius,r.chunks.push(W)}}const g=c.build([["aRoadUv",2],["aRoadInfo",3]]);return{group:a,routes:l,deckGeometry:g,lampPositions:[]}}function R2(s){const t=new ce({color:16777215,roughness:.7,metalness:0});return t.onBeforeCompile=e=>{e.uniforms.uNight=s,e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
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
}`)},t.customProgramCacheKey=()=>"facade-v3",t}function ur(s,t){const e=s.getAttribute("position"),n=new Float32Array(e.count);for(let i=0;i<e.count;i++)n[i]=t(e.getX(i),e.getY(i),e.getZ(i));return s.setAttribute("aPart",new ye(n,1)),s.getAttribute("uv")||s.setAttribute("uv",new ye(new Float32Array(e.count*2),2)),s}function P2(){const s=new Ht(1,1,1);return s.translate(0,.5,0),ur(s,()=>0)}function b0(s,t){const e=new Me(.5,.5,1,s,1,!1,t);return e.translate(0,.5,0),ur(e,()=>0)}function L2(s=.3){const t=new Ht(1,1,1),e=t.getAttribute("position");for(let n=0;n<e.count;n++)e.getY(n)>0&&(e.setX(n,e.getX(n)*s),e.setZ(n,e.getZ(n)*s));return t.translate(0,.5,0),t.computeVertexNormals(),ur(t,()=>0)}function D2(){const s=new Ht(1,1,1),t=s.getAttribute("position");for(let e=0;e<t.count;e++)t.getY(e)>0&&(t.setX(e,t.getX(e)*.55+.22),t.setZ(e,t.getZ(e)*.8));return s.translate(0,.5,0),s.computeVertexNormals(),ur(s,()=>0)}function I2(){const s=new Ht(1,1,1);s.translate(0,.5,0);const e=.5+.08,n=.66,i=[-e,n,-e],o=[e,n,-e],r=[e,n,e],a=[-e,n,e],l=[0,1,-e],c=[0,1,e],h=(f,v,p)=>[...f,...v,...p],d=new Float32Array([...h(i,l,c),...h(i,c,a),...h(o,r,c),...h(o,c,l),...h(i,o,l),...h(a,c,r)]),u=new oe;u.setAttribute("position",new ye(d,3)),u.computeVertexNormals();const g=z2([s,u]);return ur(g,(f,v,p)=>v>.99?Math.abs(f)<.01?3:1:v>.6&&v<.7&&Math.abs(f)>.55?2:0)}function z2(s){const t=[],e=[];for(const i of s){const o=i.index?i.toNonIndexed():i,r=o.getAttribute("position"),a=o.getAttribute("normal");for(let l=0;l<r.count;l++)t.push(r.getX(l),r.getY(l),r.getZ(l)),e.push(a.getX(l),a.getY(l),a.getZ(l))}const n=new oe;return n.setAttribute("position",new yt(t,3)),n.setAttribute("normal",new yt(e,3)),n.setAttribute("uv",new yt(new Float32Array(t.length/3*2),2)),n}class N2{group=new Ve;lists=new Map;geos;material;count=0;tileSize=1500;tileOx=-3400;tileOz=-4520;tiles=[];shadowDistance=3200;constructor(t){this.material=R2(t),this.geos={box:P2(),cyl:b0(16,0),oct:b0(8,Math.PI/8),frustum:L2(.3),shear:D2(),house:I2()}}add(t,e){const n=Math.floor((e.x-this.tileOx)/this.tileSize),i=Math.floor((e.z-this.tileOz)/this.tileSize),o=`${t}|${n}|${i}`;let r=this.lists.get(o);r||(r=[],this.lists.set(o,r)),r.push(e),this.count++}build(){const t=new jt,e=new Be,n=new C,i=new C,o=new Oe;for(const[r,a]of this.lists){const l=r.split("|")[0],c=this.geos[l];c.boundingSphere===null&&c.computeBoundingSphere();const h=c.clone(),d=new Es(h,this.material,a.length),u=new Float32Array(a.length*3),g=new Float32Array(a.length*4),f=new Float32Array(a.length*4),v=new Xe;a.forEach((_,w)=>{n.set(_.x,_.y,_.z),e.setFromEuler(o.set(0,_.rot,0)),i.set(_.w,_.h,_.d),d.setMatrixAt(w,t.compose(n,e,i)),d.setColorAt(w,_.color),u[w*3]=_.w,u[w*3+1]=_.h,u[w*3+2]=_.d,g[w*4]=_.style,g[w*4+1]=_.floorH,g[w*4+2]=_.seed,g[w*4+3]=_.roof,f[w*4]=_.lit,f[w*4+1]=_.warm,f[w*4+2]=_.variant,f[w*4+3]=_.form;const x=Math.hypot(_.w,_.d)*.6;v.expandByPoint(n.set(_.x-x,_.y,_.z-x)),v.expandByPoint(n.set(_.x+x,_.y+_.h,_.z+x))}),h.setAttribute("aDims",new es(u,3)),h.setAttribute("aStyle",new es(g,4)),h.setAttribute("aStyle2",new es(f,4));const p=v.getBoundingSphere(new Fe);d.boundingSphere=p,d.castShadow=!0,d.receiveShadow=!0,d.instanceMatrix.needsUpdate=!0,d.instanceColor&&(d.instanceColor.needsUpdate=!0),this.group.add(d);const m=Math.hypot(v.max.x-v.min.x,v.max.z-v.min.z)/2;this.tiles.push({mesh:d,box:v,center:p.center,r:p.radius,height:v.max.y-v.min.y,lodR:m})}}updateLod(t,e,n){for(const i of this.tiles){const o=Math.max(0,Math.hypot(i.center.x-t,i.center.z-e)-i.lodR),r=n.boxInView(i.box),a=o<this.shadowDistance&&n.casterInView(i.center,i.r,i.height);i.mesh.castShadow=a,i.mesh.visible=r||a,i.mesh.layers.mask=Mo("all",r)}}}const kt={GLASS_BLUE:0,PUNCHED:1,BALCONY:2,DECO:3,INDUSTRIAL:4,HOUSE:5,CONCRETE:6,HOTEL:7,GLASS_GREEN:8,STONE:9,BRICK:10,GRID:11,POOL:12,HELIPAD:13},As=["#f6f3ec","#f2efe6","#ffffff","#efe9dc","#f4f1ea","#e9e6df","#f8f6f1"],sa=["#efe4cf","#f1e6cf","#e8dcc3","#f3ead6","#ecdfc4"],oa=["#f2c9a8","#f0bfa0","#efd1b3","#f4b8a0","#f7cdb6","#eeb497"],Gu=["#efc0c6","#f3cfd4","#e9b7c0","#f7d5dc","#e8a9b3"],Dc=["#cfe6dc","#bfe0d2","#d8ece2","#b6dccf"],Ic=["#f5e6b3","#f2dfa1","#f8ecc4","#efd68e"],Vu=["#cfe0ec","#dbe8f0","#c3d7e6","#b9d3e3"],U2=["#4a4541","#57504a","#3f3b38","#6a605a","#4d443c","#5d5955"],F2=["#b98f6a","#a87e5c","#c49a74","#9c6f52","#c8a680","#b07b5b","#8e5e46"],ea=["#b9b9b4","#a7a9a8","#c6c6c1","#9da3a6","#b5b8ba"],Wu=[...As,...As,...sa,...oa,...Gu,...Dc,...Ic,...Vu,"#e6d2b8","#e8c9a0","#dfc7a6"],O2=[...As.slice(0,3),...sa,...oa,...Ic,...Dc,"#e6d2b8","#e8c9a0","#dfc7a6","#d9b98f","#c9a97c","#b9b28a","#cdbfa3","#d6c2a2","#a9b59a"],Zt={glassBlue:{style:kt.GLASS_BLUE,floorH:3.9,tints:["#9fb6c8","#8fa9bd","#b0c4d2","#a7bccb","#8898a8","#c2d0da"],lit:[.18,.62],warm:[.15,.5]},glassGreen:{style:kt.GLASS_GREEN,floorH:3.8,tints:["#f2f2ee","#e8ebe4","#ffffff","#dfe6e0","#e6e2d6","#d9dfd9"],lit:[.18,.58],warm:[.2,.5]},punched:{style:kt.PUNCHED,floorH:3.3,tints:[...As,...sa],lit:[.2,.55],warm:[.6,.95]},balcony:{style:kt.BALCONY,floorH:3.2,tints:[...sa,...As,"#efe0d3","#f0d9c2"],lit:[.2,.5],warm:[.7,.95]},deco:{style:kt.DECO,floorH:3.4,tints:[...oa,...Gu,...Ic,...Dc],lit:[.15,.5],warm:[.6,.9]},stone:{style:kt.STONE,floorH:3.8,tints:U2,lit:[.3,.7],warm:[.3,.6]},brick:{style:kt.BRICK,floorH:3.4,tints:F2,lit:[.2,.5],warm:[.7,.95]},grid:{style:kt.GRID,floorH:3.5,tints:["#f7f5f0","#f1eee6","#ffffff","#ece9e1"],lit:[.25,.6],warm:[.3,.7]},hotel:{style:kt.HOTEL,floorH:3.2,tints:[...As,...oa,...Vu],lit:[.3,.6],warm:[.6,.9]},concrete:{style:kt.CONCRETE,floorH:3,tints:ea,lit:[0,0],warm:[.5,.5]},industrial:{tints:["#b8bcc0","#9aa3a8","#cfd3d6","#8e9aa0","#d8c9a8","#c4b89a","#a9b0b5"],lit:[.05,.2],warm:[.2,.4]},house:{tints:Wu,lit:[.2,.6],warm:[.8,1]}};function Ti(s,t){let e=0;for(const[,i]of t)e+=i;let n=s.next()*e;for(const[i,o]of t)if(n-=o,n<=0)return i;return t[t.length-1][0]}function k2(s,t,e){const n=new N2(e),i=new We("city"),o=new Uint8Array(2e3*2e3),r=(x,A)=>{const M=Math.floor((x+1e4)/10),S=Math.floor((A+1e4)/10);return M<0||S<0||M>=2e3||S>=2e3?-1:S*2e3+M},a=(x,A,M)=>{const S=Math.ceil(M/10);for(let E=-S;E<=S;E++)for(let y=-S;y<=S;y++){const b=r(x+y*10,A+E*10);b>=0&&(o[b]=1)}},l=(x,A,M,S,E,y)=>{const b=M/2+y,T=S/2+y,U=Math.hypot(b,T)+8,O=Math.cos(E),z=Math.sin(E),B=Math.floor((x-U+1e4)/10),F=Math.floor((x+U+1e4)/10),L=Math.floor((A-U+1e4)/10),H=Math.floor((A+U+1e4)/10),G=(N,$)=>{const V=N*O+$*z,tt=-N*z+$*O;return Math.abs(V)<=b&&Math.abs(tt)<=T};for(let N=L;N<=H;N++)for(let $=B;$<=F;$++){if($<0||N<0||$>=2e3||N>=2e3)continue;const V=$*10-1e4-x,tt=N*10-1e4-A;(G(V+5,tt+5)||G(V,tt)||G(V+10,tt)||G(V,tt+10)||G(V+10,tt+10))&&(o[N*2e3+$]=1)}},c=(x,A)=>{const M=r(x,A);return M>=0&&o[M]===1},h=[],d=(x,A,M,S,E)=>{const y=Math.cos(E),b=Math.sin(E),T=[];for(const[U,O]of[[-M/2,-S/2],[M/2,-S/2],[M/2,S/2],[-M/2,S/2],[0,0],[0,-S/2],[0,S/2],[-M/2,0],[M/2,0]])T.push([x+U*y-O*b,A+U*b+O*y]);return T},u=(x,A,M,S,E,y,b,T,U,O,z={})=>{let B=-1/0;for(const[H,G]of d(A,M,S,y,b))B=Math.max(B,s.heightAt(H,G));if(z.yBase!==void 0&&(B=z.yBase),B<.9)return null;const F=T instanceof Gt?T:new Gt(T);n.add(x,{x:A,y:B-.4,z:M,w:S,h:E+.4,d:y,rot:b,color:F,style:U,floorH:O,seed:i.range(0,1e3),roof:z.roof??5,lit:z.lit??.3,warm:z.warm??.7,variant:z.variant??.5,form:z.form??0});const L=z.margin??3;return L>=0&&l(A,M,S,y,b,L),B+E},g=(x,A,M,S,E)=>{for(const[y,b]of d(x,A,M,S,E))if(s.heightAt(y,b)<1.2)return!1;return!0},f=(x,A,M,S,E)=>{for(const[y,b]of d(x,A,M,S,E))if(c(y,b))return!1;return!0},v=(x,A)=>{const S=A.next()<.16?A.range(0,.04):ie(x.lit[0],x.lit[1],Math.pow(A.next(),1.6));return{tint:A.pick(x.tints),lit:S,warm:A.range(x.warm[0],x.warm[1]),variant:A.next()}},p=(x,A,M,S,E,y,b,T,U)=>{const O=Math.cos(b),z=Math.sin(b),B=(G,N)=>[A+G*O-N*z,M+G*z+N*O],F=U.style===kt.GLASS_BLUE||U.style===kt.GLASS_GREEN||U.style===kt.STONE,L=x.pick(ea);if(x.chance(.7)){const G=S*x.range(.25,.45),N=E*x.range(.3,.5),[$,V]=B(x.range(-S*.22,S*.22),x.range(-E*.2,E*.2));u("box",$,V,G,x.range(3,6),N,b,F?"#8d9296":L,kt.CONCRETE,3,{yBase:y-.2,margin:-1})}const H=x.int(0,3);for(let G=0;G<H;G++){const[N,$]=B(x.range(-S*.35,S*.35),x.range(-E*.35,E*.35));u("box",N,$,x.range(2,4.5),x.range(1.5,3),x.range(2,4),b,L,kt.CONCRETE,3,{yBase:y-.2,margin:-1})}if(T>40&&x.chance(.35)){const[G,N]=B(S*.25,-E*.25);u("cyl",G,N,3,3.5,3,b,"#c9c9c4",kt.CONCRETE,3,{yBase:y-.2,margin:-1})}if(T>100&&x.chance(.22)){const G=Math.min(18,Math.min(S,E)*.5),[N,$]=B(-S*.18,E*.16);u("cyl",N,$,G,.5,G,b,"#444444",kt.HELIPAD,3,{yBase:y,margin:-1})}if(T>120&&x.chance(.35)){const[G,N]=B(S*.3,E*.3);u("frustum",G,N,1.6,x.range(14,32),1.6,b,"#cfd8dc",kt.CONCRETE,3,{yBase:y,margin:-1})}T>150&&x.chance(.3)&&u("frustum",A,M,4,x.range(25,50),4,b,"#e3e8ec",kt.CONCRETE,3,{yBase:y,margin:-1})},m=(x,A,M,S,E,y,b,T,U,O=!0)=>{const z=v(T,x),B={lit:z.lit,warm:z.warm,variant:z.variant},F=Math.cos(S),L=Math.sin(S),H=(V,tt)=>[A+V*F-tt*L,M+V*L+tt*F];let G=null,N=E,$=y;switch(U){case 1:{const V=x.range(.72,.85),tt=x.range(.5,.65);u("box",A,M,E,b*x.range(.5,.62),y,S,z.tint,T.style,T.floorH,B),u("box",A,M,E*V,b*x.range(.78,.88),y*V,S,z.tint,T.style,T.floorH,B),G=u("box",A,M,E*tt,b,y*tt,S,z.tint,T.style,T.floorH,B),N=E*tt,$=y*tt;break}case 2:{N=Math.min(E,y)*.62,$=Math.max(E,y)*1.15,G=u("box",A,M,N,b,$,S,z.tint,T.style,T.floorH,B);break}case 3:{const V=H(-E*.2,0),tt=H(E*.15,-y*.22);u("box",V[0],V[1],E*.6,b,y,S,z.tint,T.style,T.floorH,B),G=u("box",tt[0],tt[1],E*.7,b*x.range(.6,1),y*.56,S,z.tint,T.style,T.floorH,B),N=E*.6,$=y;break}case 4:{const V=E*.18,tt=E*.41,W=H(-(tt+V)/2,0),q=H((tt+V)/2,0);u("box",W[0],W[1],tt,b,y*.8,S,z.tint,T.style,T.floorH,B),G=u("box",q[0],q[1],tt,b*x.range(.85,1),y*.8,S,z.tint,T.style,T.floorH,B),u("box",A,M,V+2,4,y*.4,S,"#dfe4e8",kt.CONCRETE,3,{yBase:(G??0)-b*.45,margin:-1}),N=tt,$=y*.8;break}case 5:{G=u("box",A,M,E,b*.88,y,S,z.tint,T.style,T.floorH,B);const V=v(Zt.glassBlue,x);G=u("box",A,M,E*.86,b,y*.86,S,V.tint,kt.GLASS_BLUE,3.9,{lit:.7,warm:.3,variant:V.variant}),N=E*.86,$=y*.86;break}case 6:{const V=[[1,.55],[.86,.72],[.7,.88],[.5,1]];for(const[tt,W]of V)G=u("box",A,M,E*tt,b*W,y*tt,S,z.tint,T.style,T.floorH,B);G!==null&&u("frustum",A,M,3.5,b*.18,3.5,S,"#e8e4dc",kt.CONCRETE,3,{yBase:G,margin:-1}),N=E*.5,$=y*.5;break}case 7:{const V=x.chance(.45)?"cyl":"oct";N=$=Math.min(E,y),G=u(V,A,M,N,b,$,S,z.tint,T.style,T.floorH,B);break}case 8:{G=u("box",A,M,E,b*.9,y,S,z.tint,T.style,T.floorH,B),G!==null&&(u("frustum",A,M,E,b*.1+6,y,S,z.tint,T.style,T.floorH,{...B,yBase:G-.1,margin:-1}),O=!1);break}default:G=u("box",A,M,E,b,y,S,z.tint,T.style,T.floorH,B)}if(G!==null&&O){const[V,tt]=U===3?H(-E*.2,0):U===4?H((E*.41+E*.18)/2,0):[A,M];p(x,V,tt,N,$,G,S,b,T)}return G},_=s.districts.find(x=>x.id==="downtown"),w=(x,A,M,S)=>{const E=Math.cos(_.rot),y=Math.sin(_.rot),b=_.cx+A*E-M*y,T=_.cz+A*y+M*E,U=s.heightAt(b,T);if(U<1)return;const O=S(b,T,U);h.push({x:b,z:T,h:O,name:x}),a(b,T,46)};w("Meridian Tower",120,-80,(x,A,M)=>{const S={lit:.5,warm:.3,variant:.2};return u("box",x,A,46,150,46,.1,"#9fb6c8",kt.GLASS_BLUE,3.9,S),u("box",x,A,38,230,38,.1,"#9fb6c8",kt.GLASS_BLUE,3.9,S),u("box",x,A,28,285,28,.1,"#b0c4d2",kt.GLASS_BLUE,3.9,S),u("box",x,A,18,12,18,.1,"#c2d0da",kt.GLASS_BLUE,3.9,{yBase:M+285,lit:.9,warm:.2,variant:.5,margin:-1}),u("frustum",x,A,9,64,9,.1,"#e8eef2",kt.CONCRETE,3,{yBase:M+297,margin:-1}),361}),w("Bahía One",-40,70,(x,A,M)=>{const S={lit:.55,warm:.25,variant:.8};return u("oct",x,A,46,262,46,.05,"#8898a8",kt.GLASS_BLUE,3.9,S),u("frustum",x,A,42,36,42,.05,"#8898a8",kt.GLASS_BLUE,3.9,{...S,yBase:M+262,margin:-1}),u("frustum",x,A,4,38,4,.05,"#cfd8dc",kt.CONCRETE,3,{yBase:M+297,margin:-1}),335}),w("Faro Bahía",-180,40,(x,A,M)=>(u("cyl",x,A,40,240,40,0,"#e8ebe4",kt.GLASS_GREEN,3.8,{lit:.45,warm:.4,variant:.6}),u("cyl",x,A,50,10,50,0,"#e8eef2",kt.CONCRETE,3,{yBase:M+232,margin:-1}),u("cyl",x,A,24,16,24,0,"#cfe0ec",kt.GLASS_BLUE,3.9,{yBase:M+242,lit:.95,warm:.3,variant:.4,margin:-1}),u("frustum",x,A,28,18,28,.4,"#dfe4e8",kt.CONCRETE,3,{yBase:M+258,margin:-1}),u("frustum",x,A,3,30,3,0,"#cfd8dc",kt.CONCRETE,3,{yBase:M+275,margin:-1}),305)),w("Twin Palms A",40,210,(x,A)=>(u("box",x,A,30,182,56,.05,"#efe4cf",kt.BALCONY,3.3,{lit:.3,warm:.85,variant:.4}),182)),w("Twin Palms B",110,210,(x,A,M)=>(u("box",x,A,30,182,56,.05,"#efe4cf",kt.BALCONY,3.3,{lit:.35,warm:.85,variant:.4}),u("box",x-35,A,44,6,12,.05,"#dfe4e8",kt.CONCRETE,3.3,{yBase:M+118,margin:-1}),182)),w("The Sail",-60,-250,(x,A,M)=>(u("shear",x,A,60,205,44,.9,"#b0c4d2",kt.GLASS_BLUE,3.9,{lit:.45,warm:.3,variant:.9}),u("box",x,A,3.5,42,24,.9,"#e8eef2",kt.CONCRETE,3,{yBase:M+204,margin:-1}),247)),w("Terraces",260,120,(x,A)=>{for(let M=0;M<5;M++)u("box",x+M*6,A-M*4,60-M*8,45+M*28,40,0,"#f7f5f0",kt.GRID,3.5,{lit:.35,warm:.5,variant:.3});return 160}),w("Crown Plaza",-300,-180,(x,A,M)=>{u("box",x,A,42,200,42,.2,"#3a3633",kt.STONE,3.8,{lit:.55,warm:.4,variant:.5}),u("box",x,A,20,10,20,.2,"#c2d0da",kt.GLASS_BLUE,3.9,{yBase:M+200,lit:.9,warm:.6,variant:.5,margin:-1});for(let S=0;S<4;S++){const E=.2+S*Math.PI/2;u("box",x+Math.cos(E)*14,A+Math.sin(E)*14,3,44,14,E,"#e8eef2",kt.CONCRETE,3,{yBase:M+198,margin:-1})}return 244}),w("The Needle",210,-380,(x,A,M)=>(u("box",x,A,22,212,22,.1,"#dfe6e0",kt.GLASS_GREEN,3.8,{lit:.4,warm:.5,variant:.3}),u("frustum",x,A,16,14,16,.1,"#dfe6e0",kt.GLASS_GREEN,3.8,{yBase:M+212,lit:.9,warm:.5,variant:.3,margin:-1}),u("frustum",x,A,5,70,5,.1,"#e8eef2",kt.CONCRETE,3,{yBase:M+224,margin:-1}),294)),w("Gateway",-230,-430,(x,A,M)=>{const S={lit:.45,warm:.8,variant:.6};return u("box",x-26,A,22,156,44,.02,"#f2efe6",kt.PUNCHED,3.3,S),u("box",x+26,A,22,156,44,.02,"#f2efe6",kt.PUNCHED,3.3,S),u("box",x,A,76,14,40,.02,"#e9e6df",kt.GRID,3.5,{yBase:M+156,lit:.6,warm:.5,variant:.6,margin:-1}),170}),w("Helix",330,-240,(x,A,M)=>{for(let S=0;S<12;S++)u("box",x,A,34,16.5,34,S*.1,"#e6e2d6",kt.GLASS_GREEN,3.9,{yBase:M+S*16,lit:.5,warm:.3,variant:.2});return 198}),w("Aquamarine",-380,230,(x,A)=>{const M={lit:.55,warm:.2,variant:.6};return u("box",x,A,18,228,62,0,"#8fa9bd",kt.GLASS_BLUE,3.9,M),u("box",x,A,62,228,18,0,"#8fa9bd",kt.GLASS_BLUE,3.9,M),u("frustum",x,A,24,250,24,0,"#c2d0da",kt.GLASS_BLUE,3.9,M),250});for(const x of s.districts){const A=t.get(x.id),M=Math.cos(x.rot),S=Math.sin(x.rot),E=(b,T)=>[x.cx+b*M-T*S,x.cz+b*S+T*M];if(!A)continue;const y=i.fork(x.id);for(const b of A){let T=function(){const ft=1-St(.2,1,q),K=$>80&&V>70?2:1;for(let j=0;j<K;j++){const et=y.next();let D;et<.07+.22*ft?D=y.range(120,205):et<.45+.2*ft?D=y.range(70,120):D=y.range(36,72),D*=ie(.6,1,ft),D=Math.max(28,D);const J=y.next();let Z,at;J<(D>110?.34:.22)?(Z=y.range(16,24),at=y.range(18,30)):J<.82?(Z=y.range(24,Math.min(46,$*.55)),at=y.range(22,Math.min(46,V*.6))):(Z=y.range(Math.min(44,$*.5),Math.min(74,$*.75)),at=y.range(18,Math.min(30,V*.4)),D>150&&(D*=.7));const ut=K===1?(L+H)/2+y.range(-$*.1,$*.1):ie(L+Z/2+4,H-Z/2-4,j),vt=(G+N)/2+y.range(-V*.15,V*.15),[dt,I]=E(ut,vt);if(!g(dt,I,Z,at,x.rot)||!f(dt,I,Z+6,at+6,x.rot))continue;const R=D>110?Ti(y,[[Zt.glassBlue,.34],[Zt.glassGreen,.16],[Zt.punched,.1],[Zt.balcony,.08],[Zt.deco,.08],[Zt.stone,.14],[Zt.grid,.1]]):D>60?Ti(y,[[Zt.glassBlue,.2],[Zt.glassGreen,.12],[Zt.punched,.16],[Zt.balcony,.14],[Zt.deco,.14],[Zt.stone,.1],[Zt.grid,.1],[Zt.brick,.04]]):Ti(y,[[Zt.glassBlue,.1],[Zt.glassGreen,.08],[Zt.punched,.2],[Zt.balcony,.12],[Zt.deco,.18],[Zt.stone,.06],[Zt.grid,.1],[Zt.brick,.16]]);if(D>55&&y.chance(.6)){const gt=Math.min($*.92,Z+y.range(14,36)),pt=Math.min(V*.92,at+y.range(14,36)),zt=y.range(8,18);if(y.chance(.45))u("box",dt,I,gt,zt,pt,x.rot,y.pick(ea),kt.CONCRETE,3.4,{lit:.1,warm:.5});else{const Mt=v(R.style===kt.STONE?Zt.punched:R,y);u("box",dt,I,gt,zt,pt,x.rot,Mt.tint,R.style===kt.STONE?kt.PUNCHED:R.style,R.floorH,{lit:Mt.lit,warm:Mt.warm,variant:Mt.variant})}}let Q;const rt=y.next();R.style===kt.DECO&&D>60?Q=rt<.55?6:rt<.8?1:0:D>110?Q=rt<.28?1:rt<.4?7:rt<.52?5:rt<.62?8:rt<.72?4:rt<.8?2:0:D>60?Q=rt<.18?1:rt<.3?7:rt<.42?3:rt<.5?2:rt<.58?8:0:Q=rt<.25?3:rt<.35?2:0,m(y,dt,I,x.rot,Z,at,D,R,Q)}const ot=(j,et,D,J)=>{let Z=D;for(;Z<J-10;){const at=y.range(14,30),ut=Math.min(y.range(12,22),(j==="x"?V:$)*.4);if(Z+at>J)break;const vt=Z+at/2;if(Z+=at+y.range(0,3),y.next()>.55+.35*ft)continue;const dt=et===(j==="x"?G:L)?1:-1,I=j==="x"?vt:et+dt*ut/2,R=j==="x"?et+dt*ut/2:vt,Q=j==="x"?at:ut,rt=j==="x"?ut:at,[gt,pt]=E(I,R);if(!g(gt,pt,Q,rt,x.rot)||!f(gt,pt,Q+3,rt+3,x.rot))continue;const zt=Ti(y,[[Zt.brick,.24],[Zt.punched,.28],[Zt.deco,.2],[Zt.balcony,.12],[Zt.grid,.06],[Zt.concrete,.1]]),Mt=v(zt,y),Lt=y.range(12,40)*ie(.7,1.1,ft),te=u("box",gt,pt,Q,Lt,rt,x.rot,Mt.tint,zt.style,zt.floorH,{lit:Mt.lit,warm:Mt.warm,variant:Mt.variant});te!==null&&Lt>20&&y.chance(.4)&&u("box",gt,pt,Q*.4,y.range(2.5,4),rt*.45,x.rot,y.pick(ea),kt.CONCRETE,3,{yBase:te-.2,margin:-1})}};ot("x",G,L,H),ot("x",N,L,H),ot("z",L,G,N),ot("z",H,G,N)},U=function(){const ft=Math.max(1,Math.round($*V/1800));for(let K=0,ot=0;K<ft*2&&ot<ft;K++){const j=y.range(16,Math.min(44,$*.75)),et=y.range(16,Math.min(44,V*.75)),D=y.range(L+j/2,H-j/2),J=y.range(G+et/2,N-et/2),[Z,at]=E(D,J);if(!g(Z,at,j,et,x.rot)||!f(Z,at,j+4,et+4,x.rot))continue;ot++;let ut=ie(x.hMin,x.hMax,Math.pow(y.next(),2))*ie(.75,1.15,it);ut=Jt(ut,x.hMin*.8,x.hMax);const vt=ut>50?Ti(y,[[Zt.balcony,.3],[Zt.punched,.2],[Zt.grid,.15],[Zt.deco,.1],[Zt.glassGreen,.15],[Zt.glassBlue,.1]]):Ti(y,[[Zt.brick,.28],[Zt.punched,.24],[Zt.deco,.16],[Zt.balcony,.16],[Zt.grid,.1],[Zt.concrete,.06]]),dt=y.next(),I=Math.max($,V)>90&&Math.min(j,et)>20,R=ut>45?dt<.25?1:dt<.35?7:dt<.5&&I?2:dt<.6?3:0:dt<.25?3:dt<.35&&I?2:0;m(y,Z,at,x.rot+y.range(-.03,.03),j,et,ut,vt,R,ut>20)}},O=function(){const ft=y.chance(.65),K=ft?y.range(18,30):y.range(24,40),ot=ft?Math.min(V*.85,y.range(50,95)):y.range(24,40),[j,et]=E((L+H)/2+y.range(-6,6),(G+N)/2);if(!g(j,et,K,ot,x.rot)||!f(j,et,K+4,ot+4,x.rot))return;const D=ie(x.hMin,x.hMax,Math.pow(y.next(),1.5)),J=ft?Ti(y,[[Zt.hotel,.55],[Zt.balcony,.25],[Zt.deco,.2]]):Ti(y,[[Zt.glassGreen,.3],[Zt.balcony,.25],[Zt.deco,.2],[Zt.glassBlue,.15],[Zt.punched,.1]]),Z=y.next(),at=ft?0:Z<.3?7:Z<.5?1:Z<.6?8:0;m(y,j,et,x.rot,K,ot,D,J,at);const[ut,vt]=E((L+H)/2+K*.5+12,(G+N)/2);if(g(ut,vt,18,ot*.7,x.rot)&&f(ut,vt,18,ot*.7,x.rot)){const dt=v(Zt.punched,y),I=u("box",ut,vt,18,y.range(4,9),ot*.7,x.rot,dt.tint,kt.PUNCHED,3.2,{lit:dt.lit,warm:dt.warm});I!==null&&y.chance(.7)&&u("house",ut,vt,y.range(6,10),.4,Math.min(ot*.4,y.range(12,24)),x.rot,"#3fc4de",kt.POOL,3,{yBase:I,form:2,margin:-1})}},z=function(){const ft=y.range(16,24),K=Math.min(30,V/2-2),ot=St(2200,5500,X),j=Ti(y,[[0,.3],[2,ie(.14,.03,ot)],[5,ie(.16,.05,ot)],[6,.13],[1,ie(.12,.17,ot)],[7,ie(.1,.17,ot)],[3,ie(.04,.1,ot)],[4,ie(.01,.05,ot)]]),et=ot>.5?O2:Wu,D=V>=40?[[G+K/2,0],[N-K/2,Math.PI]]:[[(G+N)/2,0]];for(const[J,Z]of D){let at=L+ft/2;for(;at<H-ft/2;){const ut=y.range(8,14),vt=y.range(9,17),dt=Math.max(ft*y.range(.9,1.25),ut+6),I=at;if(at+=dt,y.next()>(x.density+.15)*lt)continue;const R=Z===0?1:-1,Q=x.rot+Z+y.range(-.12,.12),[rt,gt]=E(I+y.range(-1.5,1.5),J-R*y.range(-3,3));if(y.next()<.08*it){const Nt=Math.min(22,dt-4),Ct=y.range(12,18);if(Nt<12||!g(rt,gt,Nt,Ct,Q)||c(rt,gt))continue;const le=y.chance(.5)?Zt.brick:Zt.punched,Qt=v(le,y);u("house",rt,gt,Nt,y.range(7,11),Ct,Q,Qt.tint,le.style,3.1,{lit:Qt.lit,warm:Qt.warm,variant:Qt.variant,form:2,margin:1});continue}if(!g(rt,gt,ut,vt,Q)||c(rt,gt))continue;const pt=y.chance(.28)?2:1,zt=y.next(),Mt=zt<.42?0:zt<.78?1:2,Lt=Mt===2?pt*3.1+.6:pt*3.1/.68,te=y.chance(.65)?j:y.pick(ot>.5?[0,1,3,4,6,7,7,1]:[0,1,2,3,4,5,6,7]),wt=v(Zt.house,y);wt.tint=y.pick(et),u("house",rt,gt,ut,Lt,vt,Q,wt.tint,kt.HOUSE,3,{roof:te,form:Mt,lit:wt.lit,warm:wt.warm,variant:wt.variant,margin:1});const Ot=Math.cos(Q),qt=Math.sin(Q);if(y.chance(.3)&&dt-ut>9){const Nt=y.chance(.5)?1:-1,Ct=rt+Nt*(ut/2+3.2)*Ot,le=gt+Nt*(ut/2+3.2)*qt;g(Ct,le,5.5,6,Q)&&u("house",Ct,le,5.5,2.9,6,Q,wt.tint,kt.HOUSE,3,{roof:te,form:2,lit:0,margin:.5})}if(y.chance(.28)){const[Nt,Ct]=E(I,J+R*(vt/2+6));g(Nt,Ct,6,4,x.rot)&&u("house",Nt,Ct,y.range(5,9),.4,y.range(3.5,5),x.rot,"#3fc4de",kt.POOL,3,{form:2,margin:.5,yBase:s.heightAt(Nt,Ct)})}}}},B=function(){const ft=Math.max(1,Math.round($*V/3600));for(let K=0,ot=0;K<ft*3&&ot<ft;K++){const j=y.range(28,Math.min(80,$*.85)),et=y.range(22,Math.min(60,V*.85)),D=y.range(L+j/2,H-j/2),J=y.range(G+et/2,N-et/2),[Z,at]=E(D,J);if(!g(Z,at,j,et,x.rot)||!f(Z,at,j,et,x.rot))continue;ot++;const ut=v(Zt.industrial,y),vt=y.range(8,15),dt=u("box",Z,at,j,vt,et,x.rot,ut.tint,kt.INDUSTRIAL,4,{lit:ut.lit,warm:ut.warm,variant:ut.variant});if(dt!==null){if(y.chance(.5)&&u("box",Z,at,j+.6,.5,et+.6,x.rot,"#8f9599",kt.CONCRETE,3,{yBase:dt-.05,margin:-1}),y.chance(.3)){const[I,R]=E(D-j/2+8,J+et/2+8);g(I,R,14,10,x.rot)&&u("box",I,R,14,y.range(6,10),10,x.rot,y.pick(As),kt.PUNCHED,3.2,{lit:.3,warm:.6})}if(y.chance(.3)){const[I,R]=E(D+j/2+9,J-et/2+8);g(I,R,12,12,x.rot)&&u("cyl",I,R,y.range(7,12),y.range(7,13),y.range(7,12),0,"#dcdcd4",kt.CONCRETE,3)}}}};const F=b.streetWidth*.5+3,L=b.x0+F,H=b.x1-F,G=b.z0+F,N=b.z1-F,$=H-L,V=N-G;if($<12||V<12)continue;const[tt,W]=E((L+H)/2,(G+N)/2),q=Math.hypot(tt-x.cx,W-x.cz)/Math.max(x.hw,x.hh),X=Math.hypot(tt-_.cx,W-_.cz),it=1-St(600,4e3,X),lt=1-.45*St(2500,8500,X);if(!(y.next()>x.density*(x.zone===ne.RES_LOW?lt:1)))switch(x.zone){case ne.DOWNTOWN:T();break;case ne.RES_MID:U();break;case ne.HOTEL:O();break;case ne.RES_LOW:z();break;case ne.INDUSTRIAL:B();break}}}return n.build(),{batches:n,landmarkPositions:h,occupied:c,markOccupied:a}}function B2(s){const n=document.createElement("canvas");n.width=256,n.height=512;const i=n.getContext("2d");i.clearRect(0,0,256,512),i.fillStyle="#8a7458",i.fillRect(256/2,0,256/2,512);for(let a=0;a<512;a+=9)i.fillStyle=a%18===0?"#6e5a44":"#9a8466",i.fillRect(256/2,a,256/2,4);for(let a=0;a<140;a++)i.fillStyle=`rgba(40,30,20,${.1+s.next()*.2})`,i.fillRect(256/2+s.next()*256/2,s.next()*512,3+s.next()*6,2);i.save(),i.beginPath(),i.rect(0,0,256/2,512),i.clip(),i.strokeStyle="#6b7a3a",i.lineWidth=5,i.beginPath(),i.moveTo(256/4,512),i.lineTo(256/4,8),i.stroke();const o=256/2;for(let a=0;a<46;a++){const l=a/46,c=492-l*472,h=(o/2-4)*(.45+.55*Math.sin(Math.PI*Math.min(1,l*1.15))),d=60+Math.round(40*Math.sin(l*7+a));i.fillStyle=`rgb(${40+a%3*8}, ${110+d*.6}, ${40+a%5*5})`;for(const u of[-1,1])i.beginPath(),i.moveTo(o/2,c),i.quadraticCurveTo(o/2+u*h*.5,c-18,o/2+u*h,c-34+6*Math.sin(a)),i.quadraticCurveTo(o/2+u*h*.55,c-6,o/2,c+4),i.fill()}i.restore();const r=new cr(n);return r.colorSpace=Pn,r.anisotropy=4,r}const ar=6;function H2(s){const e=128*ar,n=128,i=document.createElement("canvas");i.width=e,i.height=n;const o=i.getContext("2d"),r=o.createImageData(e,n),a=r.data,l=(f,v,p,m)=>{const _=(v*e+f)*4;m<=a[_+3]||(a[_]=a[_+1]=a[_+2]=Math.round(255*Math.min(1,Math.max(0,p))),a[_+3]=Math.round(255*Math.min(1,m)))},c=(f,v,p,m,_,w,x)=>{for(let A=0;A<128;A++)for(let M=0;M<128;M++){const S=(M+.5)/128,E=1-(A+.5)/128,y=S-v,b=E-p,T=Math.atan2(b,y),U=m*(1+.14*Bt(Math.cos(T)*2.1+x,Math.sin(T)*2.1+x*.7)+.06*Bt(S*30+x,E*30)),O=Math.hypot(y,b);if(O>U)continue;const z=O/U,B=Math.pow(.5+.5*(b/U),.6),F=.5+.5*Bt(S*22+x*3,E*22-x),L=(w+(_-w)*B)*(.8+.4*F)*(1-.3*z*z)*(1-.3*St(-.55,-1,b/U));l(f*128+M,A,L,1)}},h=(f,v,p,m,_)=>{for(let w=0;w<128;w++)for(let x=0;x<128;x++){const A=(x+.5)/128,M=1-(w+.5)/128,S=A-v,E=M-p,y=Math.atan2(E,S),b=m*(1+.16*Bt(Math.cos(y)*2.3+_,Math.sin(y)*2.3-_)),T=Math.hypot(S,E);if(T>b)continue;const U=T/b,O=.5+.5*Bt(A*26+_,M*26+_*2),B=(.62+.5*(.5+.5*Bt(A*9-_,M*9+_)))*(.8+.4*O)*(1-.45*U*U);l(f*128+x,w,B,1)}},d=(f,v,p,m,_,w)=>{for(let x=0;x<128;x++)for(let A=0;A<128;A++){const M=(A+.5)/128,S=1-(x+.5)/128;S<p||S>m||Math.abs(M-v)>_*(1-.4*(S-p)/(m-p))||l(f*128+A,x,w*(.85+.3*Bt(M*40,S*40)),1)}},u=(f,v,p,m,_,w,x)=>{for(let A=0;A<_;A++){const M=A/_*Math.PI*2+.4*Bt(A*1.7+x,x);for(let S=0;S<=1;S+=.01){const E=m*(.75+.25*Bt(A*3.1,x+A)),y=v+Math.cos(M)*E*S,b=p+Math.sin(M)*E*S*(1-w)-w*m*S*S,T=.045*m*(1-.5*S)/.25;for(let U=-1;U<=1;U+=.25){const O=y-Math.sin(M)*T*U,z=b+Math.cos(M)*T*U,B=Math.floor(O*128),F=Math.floor((1-z)*128);B<0||F<0||B>=128||F>=128||l(f*128+B,F,.75+.35*S-.2*Math.abs(U),1)}}}};d(0,.5,0,.3,.035,.42),c(0,.5,.5,.385,1.15,.58,3+s.next()),c(0,.36,.42,.2,.95,.52,7+s.next()),c(0,.63,.44,.19,1,.54,11+s.next()),d(1,.5,0,.34,.03,.4),c(1,.47,.52,.34,1.1,.55,21+s.next()),c(1,.66,.6,.22,1.2,.6,25+s.next()),c(1,.3,.4,.17,.9,.5,29+s.next()),c(1,.56,.3,.16,.85,.48,33+s.next()),d(2,.5,0,.5,.022,.55),u(2,.5,.52,.24,9,.35,2+s.next()),h(3,.5,.5,.4,5+s.next()),h(4,.5,.5,.38,15+s.next()),h(4,.68,.6,.2,17+s.next()),u(5,.5,.5,.26,9,0,6+s.next());for(let f=0;f<128;f++)for(let v=0;v<128;v++){const p=(f*e+640+v)*4;a[p+3]===0&&Math.hypot((v+.5)/128-.5,(f+.5)/128-.5)<.05&&(a[p]=a[p+1]=a[p+2]=140,a[p+3]=255)}o.putImageData(r,0,0);const g=new cr(i);return g.colorSpace=fi,g.minFilter=Qi,g.magFilter=Ae,g.anisotropy=4,g.generateMipmaps=!0,g}function G2(s,t,e=0){const i=new Rc(1,e).getAttribute("position"),o=[],r=[],a=[];for(let l=0;l<i.count;l++){const c=i.getX(l),h=i.getY(l),d=i.getZ(l),u=1+.18*Bt(c*2.1+s,h*2.1+d*1.7-s);o.push(c*u,h*u*(h<0?.65:1),d*u),r.push(c,h,d),a.push(t)}return{pos:o,nrm:r,part:a}}function E0(s=!1){const t=[],e=[],n=[],i=[];for(let l=0;l<3;l++){const c=l/3*Math.PI*2,h=(l+1)/3*Math.PI*2,d=Math.cos(c)*.045,u=Math.sin(c)*.045,g=Math.cos(h)*.045,f=Math.sin(h)*.045,v=Math.cos((c+h)/2),p=Math.sin((c+h)/2),m=[[d,0,u],[g,0,f],[g,1,f],[d,0,u],[g,1,f],[d,1,u]];for(const[_,w,x]of m)t.push(_,w,x),e.push(v,0,p),n.push(0),i.push(0,w)}for(const[l,c]of[[3.1,1],[8.7,2],[14.3,3]]){const h=G2(l,c,s&&c===1?1:0);t.push(...h.pos),e.push(...h.nrm),n.push(...h.part);for(let d=0;d<h.part.length;d++)i.push(0,0)}const a=new oe;return a.setAttribute("position",new yt(t,3)),a.setAttribute("normal",new yt(e,3)),a.setAttribute("uv",new yt(i,2)),a.setAttribute("aPart",new yt(n,1)),a.boundingSphere=new Fe(new C(0,1.2,0),2.6),a}function V2(){const s=[],t=[],e=[],n=[],r=c=>{const h=.045*(1-.3*c),d=[];for(let u=0;u<=4;u++){const g=u/4*Math.PI*2+Math.PI/4;d.push([Math.cos(g)*h,c,Math.sin(g)*h])}return d};for(let c=0;c<3;c++){const h=r(c/3),d=r((c+1)/3);for(let u=0;u<4;u++){const g=(u+.5)/4*Math.PI*2+Math.PI/4,f=Math.cos(g),v=Math.sin(g),p=[h[u],h[u+1],d[u+1],h[u],d[u+1],d[u]],m=[.55+.4*(u/4),.55+.4*((u+1)/4),.55+.4*((u+1)/4),.55+.4*(u/4),.55+.4*((u+1)/4),.55+.4*(u/4)];p.forEach(([_,w,x],A)=>{s.push(_,w,x),t.push(f,0,v),e.push(m[A],w),n.push(0)})}}const a=7;for(let c=0;c<a;c++){const h=c/a*Math.PI*2,d=.56,u=.14,g=[];for(let v=0;v<=2;v++){const p=v/2,m=d*p,_=1+.16*Math.sin(p*Math.PI*.8)-.5*p*p,w=Math.cos(h)*m,x=Math.sin(h)*m,A=-Math.sin(h)*u*(1-p*.25),M=Math.cos(h)*u*(1-p*.25);g.push([w-A,_,x-M],[w+A,_,x+M])}const f=(v,p,m)=>{for(const _ of[v,p,m]){s.push(g[_][0],g[_][1],g[_][2]),t.push(0,1,0),n.push(c+1);const w=Math.floor(_/2),x=_%2;e.push(x*.5,1-w/2)}};f(0,2,1),f(1,2,3),f(2,4,3),f(3,4,5)}const l=new oe;return l.setAttribute("position",new yt(s,3)),l.setAttribute("normal",new yt(t,3)),l.setAttribute("uv",new yt(e,2)),l.setAttribute("aPart",new yt(n,1)),l.boundingSphere=new Fe(new C(0,.8,0),1.2),l}function W2(){const s=new oe;return s.setAttribute("position",new yt([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,-.5,0,.5,.5,0,-.5,.5,0],3)),s.setAttribute("normal",new yt([0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0],3)),s.setAttribute("uv",new yt([0,0,1,0,1,1,0,0,1,1,0,1],2)),s.boundingSphere=new Fe(new C(0,0,0),2),s}const Xu=`
uniform float uTime;
uniform float uWind;
attribute float aPart;
attribute vec4 aVar; // archetype, seed, crown squash / frond droop, trunk length
varying float vPart;
varying vec3 vWP;
varying vec3 vCrownN; // world-space direction from the puff centre (the undisplaced sphere normal)
varying float vSeed;
${jn}
`,X2=`
vec3 objectNormal = normal;
// foliage normals lean toward the sky so a crown shades as a lit mass of leaves, not a hard ball
if (aPart > 0.5) objectNormal = normalize(mix(normalize(objectNormal * vec3(1.0, 1.0 / max(aVar.z, 0.3), 1.0)), vec3(0.0, 1.0, 0.0), 0.3));
vCrownN = normalize((modelMatrix * instanceMatrix * vec4(normal, 0.0)).xyz);
vSeed = aVar.y;
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif
`,zc=`
vec3 vegShadowC = vec3(0.0);
float vegShadowR = 0.0;
`,q2=`
vec3 transformed = position;
${zc}
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
`,Y2=`
varying float vPart;
varying vec3 vWP;
varying vec3 vCrownN;
varying float vSeed;
float vegNear; // 1 within ~200 m of the camera, 0 beyond 320 m: gates the close-range leaf detail
${jn}
`,$2=`
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
`,j2=`
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
`,Z2=`
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
`,K2=`
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
`,J2=`
vec3 transformed = position;
${zc}
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
`,Nc=`
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
vec3 vegL = normalize(vec3(directionalShadowMatrix[ 0 ][0][2], directionalShadowMatrix[ 0 ][1][2], directionalShadowMatrix[ 0 ][2][2]));
vec4 vegShadowPos = vegShadowR > 0.0 ? vec4(vegShadowC - vegL * vegShadowR, 1.0) : worldPosition;
#else
#define vegShadowPos worldPosition
#endif
${he.shadowmap_vertex.replace(/worldPosition/g,"vegShadowPos")}
`,Q2=`
#include <shadowmap_pars_fragment>
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
float vegShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
  return mix( 0.34, 1.0, getShadow( shadowMap, shadowMapSize, shadowIntensity, shadowBias, shadowRadius, shadowCoord ) );
}
#endif
`;function Uc(s){return s.replace(/\bgetShadow\(/g,"vegShadow(").replace("#include <shadowmap_pars_fragment>",Q2)}const qu=`
attribute vec4 aVar; // archetype (0 crown, 1 palm), seed, card size (unit), crown centre height (unit)
varying vec2 vCardUv;
varying float vElev;
varying float vCol; // atlas column of the side view (top view is 3 columns further)
`,Yu=`
vec4 mvPosition;
${zc}
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
`,$u=`
uniform sampler2D uAtlas;
varying vec2 vCardUv;
varying float vElev;
varying float vCol;
`,t_=`
{
  vec4 side = texture2D(uAtlas, vec2((vCardUv.x + vCol) / ${ar}.0, vCardUv.y));
  vec4 top = texture2D(uAtlas, vec2((vCardUv.x + vCol + 3.0) / ${ar}.0, vCardUv.y));
  diffuseColor.a = mix(side, top, vElev).a;
}
`,e_=`
#include <color_fragment>
{
  vec4 side = texture2D(uAtlas, vec2((vCardUv.x + vCol) / ${ar}.0, vCardUv.y));
  vec4 top = texture2D(uAtlas, vec2((vCardUv.x + vCol + 3.0) / ${ar}.0, vCardUv.y));
  vec4 t = mix(side, top, vElev);
  if (t.a < 0.5) discard;
  // lit leaf mass yellows, shaded parts cool off: matches the 3D crowns' wrap lighting
  diffuseColor.rgb *= t.r * 1.02 * mix(vec3(0.72, 0.82, 0.9), vec3(1.12, 1.04, 0.82), smoothstep(0.35, 1.05, t.r));
}
`;function n_(s,t){const e=new ce({color:16777215,roughness:.88});return e.onBeforeCompile=n=>{n.uniforms.uTime=s,n.uniforms.uWind=t,n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
${Xu}`).replace("#include <beginnormal_vertex>",X2).replace("#include <begin_vertex>",q2).replace("#include <shadowmap_vertex>",Nc),n.fragmentShader=Uc(n.fragmentShader).replace("#include <common>",`#include <common>
${Y2}`).replace("#include <color_fragment>",$2).replace("#include <normal_fragment_begin>",j2).replace("#include <emissivemap_fragment>",Z2)},e.customProgramCacheKey=()=>"veg-crown-v7",e}function i_(s,t,e){const n=new ce({map:s,alphaTest:.5,alphaToCoverage:!0,side:hn,roughness:.75,color:16777215});return n.onBeforeCompile=i=>{i.uniforms.uTime=t,i.uniforms.uWind=e,i.vertexShader=i.vertexShader.replace("#include <common>",`#include <common>
${Xu}`).replace("#include <beginnormal_vertex>",K2).replace("#include <begin_vertex>",J2).replace("#include <shadowmap_vertex>",Nc),i.fragmentShader=Uc(i.fragmentShader).replace("#include <common>",`#include <common>
varying float vPart; varying vec3 vWP;`)},n.customProgramCacheKey=()=>"veg-palm-v6",n}function s_(s){const t=new Eu({depthPacking:ou,alphaTest:.5,side:hn});return t.onBeforeCompile=e=>{e.uniforms.uAtlas={value:s},e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
${qu}`).replace("#include <project_vertex>",Yu),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
${$u}`).replace("#include <map_fragment>",t_)},t.customProgramCacheKey=()=>"veg-card-depth-v3",t}function o_(s){const t=new ce({color:16777215,roughness:.9,alphaTest:.5,alphaToCoverage:!0,side:hn});return t.onBeforeCompile=e=>{e.uniforms.uAtlas={value:s},e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
${qu}`).replace("#include <project_vertex>",Yu).replace("#include <shadowmap_vertex>",Nc),e.fragmentShader=Uc(e.fragmentShader).replace("#include <common>",`#include <common>
${$u}`).replace("#include <color_fragment>",e_)},t.customProgramCacheKey=()=>"veg-card-v7",t}const A0=900,r_=420,a_=200,l_=6e4,cl=new C,T0=new C,C0=new C,c_=new C;function h_(s,t,e,n){const i=s.planes[0],o=s.planes[2],r=s.planes[3];cl.crossVectors(o.normal,r.normal);const a=i.normal.dot(cl);return Math.abs(a)<1e-9?t.set(e,0,n):(T0.crossVectors(r.normal,i.normal),C0.crossVectors(i.normal,o.normal),t.set(0,0,0).addScaledVector(cl,-i.constant).addScaledVector(T0,-o.constant).addScaledVector(C0,-r.constant).divideScalar(a))}const u_={0:["#6d7639","#70763e","#627137","#777941","#6e7239","#4a6832","#536a3a","#3d5c2e","#586e37","#4f602d","#344c29","#35502a","#304426","#3d562f","#364f39"],1:["#335528","#3c5c2d","#436832","#2e4c25","#4f6c37","#254021"],2:["#365126","#415a2b","#2f4821","#4a6134","#3a522a","#273c1f"],3:["#61753e","#6e7c44","#536835","#79793f","#817b42","#6c7534"],4:["#5d7534","#526c2d","#697e3a","#486228","#73823f","#5e7435"],5:["#8f7d4b","#9a7f52","#877b4b","#7d7541","#9e8359"]};class d_{group=new Ve;materials=[];uTime={value:0};uWind={value:.5};counts={palms:0,trees:0,mangroves:0,shrubs:0};tiles=[];shadowDistance=1800;viewDistance=9e3;constructor(t,e){const n=new We("vegetation"),i=B2(n.fork("fronds")),o=H2(n.fork("atlas")),r=n_(this.uTime,this.uWind),a=i_(i,this.uTime,this.uWind),l=o_(o),c=s_(o);this.materials.push(r,a,l);const h=E0(),d=E0(!0),u=V2(),g=W2(),f=[],v={0:[],1:[],2:[],3:[],4:[],5:[]};for(const L of[0,1,2,3,4,5])v[L]=u_[L].map(H=>new Gt(H));const p=(L,H,G,N,$,V,tt=0)=>{const W=V.pick(v[L]).clone();W.offsetHSL(V.range(-.035,.035),V.range(-.1,.08),V.range(-.09,.08));const q=L===2?V.range(.5,.7):L===3?V.range(.6,.85):L===5?V.range(.32,.45):L===1?V.range(.95,1.25):V.range(.7,1),X=L===2?V.range(.15,.3):L===3||L===5?.02:L===1?V.range(.6,.95):V.range(.3,.55),it=V.next();f.push({x:H,y:N,z:G,s:$,rot:V.range(0,Math.PI*2),lean:L===4?(it-.5)*.16+tt:0,tint:W,arche:L,seed:it,squash:q,trunk:X})},m=(L,H,G,N,$=5.5,V=11)=>p(4,L,H,G-.15,N.range($,V),N,N.range(-.14,.14)),_=t.n,w=t.zone,x=t.veg,A=t.height;for(let L=0;L<_;L++)for(let H=0;H<_;H++){const G=L*_+H,N=w[G];if(N===ne.OCEAN||N===ne.BAY||N===ne.SANDBAR||N===ne.ROCK||N===ne.LOT||N===ne.CONSTRUCTION||N===ne.STADIUM||N===ne.ROAD||N===ne.MARINA||A[G]<.12)continue;const $=x[G]/255,V=-un+(H+.5)*Ms,tt=-un+(L+.5)*Ms,W=Bt(V/150,tt/150),q=Bt(V/420+9,tt/420-3);let X=0,it=1;switch(N){case ne.MANGROVE:X=.95,it=3;break;case ne.BEACH:X=.6,it=2;break;case ne.PARK:X=.06+.94*St(.35,.95,$)+.08*W,it=$>.6?3:$>.3?2:1;break;case ne.RES_LOW:X=.05+.75*St(.25,.95,$)+.05*W,it=$>.7?3:$>.42?2:1;break;case ne.GOLF:X=.03+.22*St(.1,.6,W);break;case ne.WETLAND_FLAT:X=.85*St(.55,.9,$),it=2;break;case ne.HOTEL:case ne.RES_MID:X=.05;break;case ne.DOWNTOWN:X=.02;break;case ne.AIRPORT:X=.012;break;case ne.INDUSTRIAL:X=.006;break;default:X=0}if(!(X<=0))for(let lt=0;lt<it;lt++){if(rl(H,L,7+lt*3)>=X)continue;const K=V+(rl(H,L,8+lt*3)-.5)*Ms*1.1,ot=tt+(rl(H,L,9+lt*3)-.5)*Ms*1.1,j=t.heightAt(K,ot);if(j<.12)continue;const et=new We(G*4+lt),D=et.next(),J=t.coastAt(K,ot),Z=J>-110;if(N===ne.MANGROVE){if(e(K,ot))continue;p(2,K,ot,j-.2,et.range(2.4,4.4),et)}else if(N===ne.BEACH){if(e(K,ot))continue;const at=St(.65,1.15,j),ut=.5+.5*Bt(K/75+3.3,ot/75-6.1),vt=.5+.5*Bt(K/28+8.8,ot/28+1.2),dt=at*(.1+.6*St(.35,.75,ut));D<dt?m(K,ot,j,et):j>.6&&vt>.6&&et.chance(.75)?p(3,K,ot,j-.15,et.range(1.2,2.8),et):j>.45&&j<1.35&&t.exposureAt(K,ot)>.45&&et.chance(.22*St(.42,.6,.5+.5*Bt(K/40-2.2,ot/40+9.4)))&&p(5,K,ot,j-.1,et.range(1.6,3),et)}else if(N===ne.WETLAND_FLAT){if(j<.25||e(K,ot))continue;p(D<.35?1:0,K,ot,j-.3,D<.35?et.range(7,10):et.range(4,6.5),et)}else{if(e(K,ot))continue;const at=$>.7;if(N===ne.PARK||N===ne.RES_LOW||N===ne.GOLF){const ut=J>-45?.55:Z?.3:0,vt=N===ne.GOLF?.4:N===ne.RES_LOW?Math.max(at?.14:.35,ut):Math.max(ut,.08),dt=at?.1+.16*St(.1,.5,q):.05,I=at?.08:.06;D<vt?m(K,ot,j,et,6,11):D<vt+dt?p(1,K,ot,j-.3,et.range(7.5,11),et):D<vt+dt+I?p(3,K,ot,j-.1,et.range(1.3,2.8),et):p(0,K,ot,j-.3,at?et.range(4.2,7.5):et.range(3.8,6.5),et)}else N===ne.INDUSTRIAL?p(D<.5?3:0,K,ot,j-.2,D<.5?et.range(1.3,2.4):et.range(3.5,5.5),et):N===ne.AIRPORT?p(0,K,ot,j-.3,et.range(3.2,5),et):p(4,K,ot,j-.15,et.range(6,10),et)}}}const M=new We("road-palms"),S=[];for(const L of t.roads)(L.cls==="highway"||L.cls==="arterial"||L.cls==="causeway"||L.cls==="street")&&S.push({pts:L.pts,width:L.width,spacing:L.cls==="street"?24:19});for(const L of t.districts)L.track&&S.push({pts:L.track,width:7,spacing:22});for(const L of S){let H=0;for(let G=0;G<L.pts.length-1;G++){const[N,$]=L.pts[G],[V,tt]=L.pts[G+1],W=Math.hypot(V-N,tt-$);if(W<1)continue;const q=(V-N)/W,X=(tt-$)/W;for(let it=14;it<W-8;it+=L.spacing*M.range(.75,1.3),H++){const lt=H&1?1:-1,ft=L.width*.5+M.range(4.5,8),K=N+q*it-X*ft*lt,ot=$+X*it+q*ft*lt,j=t.heightAt(K,ot);if(j<.9)continue;const et=t.zoneAt(K,ot);et===ne.INDUSTRIAL||et===ne.AIRPORT||et===ne.WETLAND_FLAT||et===ne.LOT||M.chance(.18)||e(K,ot)||m(K,ot,j,M,6.5,11)}}}const E=new We("marina-palms");for(const L of t.marinas){const H=Math.sin(L.rot),G=-Math.cos(L.rot),N=-G,$=H;let V=0;if(t.heightAt(L.x,L.z)<0){for(let it=0;it>=-200;it-=2)if(t.heightAt(L.x+H*it,L.z+G*it)>=0){V=it;break}}else for(let it=0;it<=200;it+=2)if(t.heightAt(L.x+H*it,L.z+G*it)<0){V=it;break}const tt=L.x+H*V,W=L.z+G*V,q=L.piers*14+30,X=Math.round(q*.28);for(let it=0;it<X;it++){const lt=E.range(-q,q),ft=E.range(10,44),K=tt+N*lt-H*ft,ot=W+$*lt-G*ft,j=t.heightAt(K,ot);if(j<.9||e(K,ot))continue;const et=t.zoneAt(K,ot);et===ne.ROAD||et===ne.INDUSTRIAL||et===ne.LOT||et===ne.DOWNTOWN||et===ne.RES_MID||m(K,ot,j,E,6,10.5)}}for(const L of f)L.arche===4?this.counts.palms++:L.arche===2?this.counts.mangroves++:L.arche===3||L.arche===5?this.counts.shrubs++:this.counts.trees++;const y=new Map;for(const L of f){const H=Math.floor(L.x/A0),G=Math.floor(L.z/A0),N=`${H}|${G}`;let $=y.get(N);$||($={crown:[],palm:[],tx:H,tz:G},y.set(N,$)),(L.arche===4?$.palm:$.crown).push(L)}const b=new We("veg-shuffle"),T=new jt,U=new Be,O=new C,z=new C,B=new Oe(0,0,0,"YXZ"),F=(L,H,G,N)=>{for(let J=L.length-1;J>0;J--){const Z=b.int(0,J),at=L[J];L[J]=L[Z],L[Z]=at}const $=L.length,V=new oe;for(const J of["position","normal","uv","aPart"])V.setAttribute(J,H.getAttribute(J));V.boundingSphere=H.boundingSphere;let tt=null;if(N){tt=new oe;for(const J of["position","normal","uv","aPart"])tt.setAttribute(J,N.getAttribute(J));tt.boundingSphere=N.boundingSphere}const W=new oe;for(const J of["position","normal","uv"])W.setAttribute(J,g.getAttribute(J));W.boundingSphere=g.boundingSphere;const q=new Float32Array($*4),X=new Float32Array($*4),it=new Es(V,G,$),lt=new Xe;L.forEach((J,Z)=>{O.set(J.x,J.y,J.z),B.set(J.lean,J.rot,0),U.setFromEuler(B),z.set(J.s,J.s,J.s),it.setMatrixAt(Z,T.compose(O,U,z)),it.setColorAt(Z,J.tint),q[Z*4]=J.arche,q[Z*4+1]=J.seed,q[Z*4+2]=J.arche===4?.35:J.squash,q[Z*4+3]=J.trunk,J.arche===4?(X[Z*4]=1,X[Z*4+2]=2.45,X[Z*4+3]=1):(X[Z*4]=0,X[Z*4+2]=3.1*J.squash+.3,X[Z*4+3]=J.trunk+.9*J.squash),X[Z*4+1]=J.seed,lt.expandByPoint(O)});const ft=new es(q,4);V.setAttribute("aVar",ft),W.setAttribute("aVar",new es(X,4)),it.instanceMatrix.needsUpdate=!0,it.receiveShadow=!0,it.castShadow=!1,it.matrixAutoUpdate=!1;let K=null;tt&&(tt.setAttribute("aVar",ft),K=new Es(tt,G,$),K.instanceMatrix=it.instanceMatrix,K.instanceColor=it.instanceColor,K.receiveShadow=!0,K.castShadow=!1,K.matrixAutoUpdate=!1,K.visible=!1);const ot=new Es(W,l,$);ot.instanceMatrix=it.instanceMatrix,ot.instanceColor=it.instanceColor,ot.receiveShadow=!0,ot.castShadow=!1,ot.customDepthMaterial=c,ot.matrixAutoUpdate=!1;const j=L.reduce((J,Z)=>Math.max(J,Z.s),0),et=lt.getBoundingSphere(new Fe);et.radius+=j*2.6,lt.min.x-=j*2.6,lt.max.x+=j*2.6,lt.min.z-=j*2.6,lt.max.z+=j*2.6,lt.min.y-=1,lt.max.y+=j*3.7;const D=lt.getBoundingSphere(new Fe);it.boundingSphere=D,ot.boundingSphere=D.clone(),ot.visible=!1,this.group.add(it,ot),K&&(K.boundingSphere=D.clone(),this.group.add(K)),this.tiles.push({near:it,hi:K,far:ot,box:lt,center:D.center,r:D.radius,height:lt.max.y-lt.min.y,lodCenter:et.center,lodR:et.radius,n:$,d:0})};for(const L of y.values())L.crown.length&&F(L.crown,h,r,d),L.palm.length&&F(L.palm,u,a,null)}update(t,e){this.uTime.value=t,this.uWind.value=e}updateLod(t,e,n){const i=this.tiles,o=h_(n.viewFrustum,c_,t,e).y;for(const a of i)a.d=Math.max(0,Math.sqrt((a.lodCenter.x-t)**2+(a.lodCenter.z-e)**2+(a.lodCenter.y-o)**2)-a.lodR);for(let a=1;a<i.length;a++){const l=i[a];let c=a-1;for(;c>=0&&i[c].d>l.d;)i[c+1]=i[c],c--;i[c+1]=l}let r=l_;for(const a of i){const l=a.d<r_&&r>=a.n;l&&(r-=a.n);const c=n.boxInView(a.box),h=a.d<this.shadowDistance&&n.casterInView(a.center,a.r,a.height),d=a.hi!==null&&a.d<a_;a.near.visible=l&&c&&!d,a.hi&&(a.hi.visible=l&&c&&d);const u=!l&&c&&a.d<this.viewDistance;a.far.visible=u||h,a.far.castShadow=h,a.far.layers.mask=Mo("all",u);const g=l||a.d<3e3?1:a.d<5500?.5:.25;a.far.count=Math.max(1,Math.round(a.n*g))}}}function ju(s,t,e){const n=new ce({color:16777215,roughness:1,metalness:1,vertexColors:t,emissive:e??0}),i=e!==void 0;return n.onBeforeCompile=o=>{o.vertexShader=o.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aMatParams;
varying vec2 vMatParams;${i?`
attribute float aEmissive;
varying float vEmissive;`:""}`).replace("#include <begin_vertex>",`#include <begin_vertex>
vMatParams = aMatParams;${i?`
vEmissive = aEmissive;`:""}`),o.fragmentShader=o.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vMatParams;${i?`
varying float vEmissive;`:""}`).replace("#include <roughnessmap_fragment>","float roughnessFactor = vMatParams.x;").replace("#include <metalnessmap_fragment>","float metalnessFactor = vMatParams.y;"),i&&(o.fragmentShader=o.fragmentShader.replace("#include <emissivemap_fragment>","totalEmissiveRadiance *= vEmissive;"))},n.customProgramCacheKey=()=>s,n}function f_(s){const t=[],e=[],n=[],i=[],o=[];for(const a of s){const l=a.geometry.index?a.geometry.toNonIndexed():a.geometry,c=l.getAttribute("position"),h=l.getAttribute("normal"),{color:d,roughness:u,metalness:g}=a.material;for(let f=0;f<c.count;f++)t.push(c.getX(f),c.getY(f),c.getZ(f)),e.push(h.getX(f),h.getY(f),h.getZ(f)),n.push(d.r,d.g,d.b),i.push(u,g),o.push(a.emissive?1:0);l!==a.geometry&&l.dispose()}const r=new oe;return r.setAttribute("position",new yt(t,3)),r.setAttribute("normal",new yt(e,3)),r.setAttribute("color",new yt(n,3)),r.setAttribute("aMatParams",new yt(i,2)),r.setAttribute("aEmissive",new yt(o,1)),r.computeBoundingSphere(),r}function hl(s){const t=s.getAttribute("position").count;return s.setAttribute("color",new yt(new Float32Array(t*3).fill(1),3)),s.setAttribute("aEmissive",new yt(new Float32Array(t),1)),s}class p_{pos=[];nrm=[];col=[];par=[];box=new Xe;v=new C;get vertexCount(){return this.pos.length/3}add(t,e,n,i){const o=(t.index?t.toNonIndexed():t.clone()).applyMatrix4(e),r=o.getAttribute("position"),a=o.getAttribute("normal"),l=i??n.color,c=n.roughness,h=n.metalness,d=(u,g)=>{this.v.set(r.getX(u),r.getY(u),r.getZ(u)),this.pos.push(this.v.x,this.v.y,this.v.z),this.box.expandByPoint(this.v);const f=g?-1:1;this.nrm.push(f*a.getX(u),f*a.getY(u),f*a.getZ(u)),this.col.push(l.r,l.g,l.b),this.par.push(c,h)};for(let u=0;u<r.count;u++)d(u,!1);if(n.side===hn)for(let u=0;u<r.count;u+=3)d(u,!0),d(u+2,!0),d(u+1,!0);o.dispose()}build(){const t=new oe;return t.setAttribute("position",new yt(this.pos,3)),t.setAttribute("normal",new yt(this.nrm,3)),t.setAttribute("color",new yt(this.col,3)),t.setAttribute("aMatParams",new yt(this.par,2)),t.boundingBox=this.box.clone(),t.boundingSphere=this.box.getBoundingSphere(new Fe),t}}function cc(s,t,e){const n=Math.floor((s+1e4)/e);return Math.floor((t+1e4)/e)*4096+n}function R0(s,t,e){return s+t+e-Math.max(s,t,e)-Math.min(s,t,e)}const m_=2500,g_=1,v_=350,x_=2500;class __{constructor(t,e,n,i){this.map=t,this.markOccupied=i,this.mats={concrete:new ce({color:12170926,roughness:.9}),dark:new ce({color:3816768,roughness:.8}),white:new ce({color:15921902,roughness:.6}),steel:new ce({color:10134701,roughness:.45,metalness:.7}),red:new ce({color:13123630,roughness:.6}),blue:new ce({color:3103400,roughness:.6}),green:new ce({color:3046735,roughness:.6}),orange:new ce({color:14252074,roughness:.6}),wood:new ce({color:9136968,roughness:.9}),tank:new ce({color:14474452,roughness:.5,metalness:.3}),glass:new ce({color:10470614,roughness:.15,metalness:.8}),grass:new ce({color:4164142,roughness:.95}),yellow:new ce({color:14725690,roughness:.6}),lampHead:new ce({color:16777215})},this.material=ju("props-v4",!0,16767392),this.materials.push(this.material);const o=new We("props");this.buildMarinas(o.fork("marinas")),this.buildPrivateDocks(o.fork("docks")),this.buildFishingPiers(o.fork("piers")),this.buildChannelMarkers(o.fork("markers")),this.buildLifeguardTowers(o.fork("lifeguards")),this.buildClubhouse(o.fork("clubhouse")),this.buildPort(o),this.buildAirport(o),this.buildStadium(),this.buildLighthouse(),this.buildConstruction(o),this.buildLamps(e,n),this.buildSeawalls(),this.flush()}group=new Ve;material;materials=[];lampPositions=[];mooredBoatPositions=[];m=new jt;q=new Be;p=new C;s=new C;boxes=[];cyls=[];lamps=[];chunks=[];mats;counts={boxes:0,cylinders:0,lamps:0,chunks:0,meshes:0};shoreDistance(t,e,n,i,o=400){const r=a=>this.map.heightAt(t+n*a,e+i*a)<.15;if(!r(0)){for(let a=1;a<=o;a+=1)if(r(a))return a-.5;return o}for(let a=1;a<=o;a+=1)if(!r(-a))return-(a-.5);return-o}piling(t,e,n,i=.18,o="wood"){const r=Math.min(this.map.heightAt(t,e),.2);this.cyl(o,t,r-.3,e,i,n-r+.3)}moor(t,e,n,i){this.map.heightAt(t,e)<-.6&&this.mooredBoatPositions.push({x:t,z:e,rot:n,len:i})}box(t,e,n,i,o,r,a,l=0,c=0){this.p.set(e,n+r/2,i),this.q.setFromEuler(new Oe(c,l,0)),this.s.set(o,r,a),this.boxes.push({m:this.m.compose(this.p,this.q,this.s).clone(),mat:t,size:R0(o,r,a)})}cyl(t,e,n,i,o,r,a=0,l=0){this.p.set(e,n+r/2,i),this.q.setFromEuler(new Oe(l,a,0)),this.s.set(o*2,r,o*2),this.cyls.push({m:this.m.compose(this.p,this.q,this.s).clone(),mat:t,size:R0(o*2,r,o*2)})}lamp(t,e,n){this.lamps.push({m:new jt().makeTranslation(t,e,n),mat:"steel",size:.24})}lampGeometry(t){const e=new Me(.12,.12,9,t).translate(0,4.5,0),n=new Ht(.2,.2,2.4).translate(0,9.1,0),i=new ii(.22,6,4).translate(0,9.05,0),o=f_([{geometry:e,material:this.mats.steel},{geometry:n,material:this.mats.steel},{geometry:i,material:this.mats.lampHead,emissive:!0}]);return e.dispose(),n.dispose(),i.dispose(),o}flush(){const t=hl(new Ht(1,1,1)),e=hl(new Me(.5,.5,1,14)),n=hl(new Me(.5,.5,1,6)),i=this.lampGeometry(14),o=this.lampGeometry(6);for(const u of[t,e,n,i,o])u.computeBoundingSphere();const r=new Map,a=u=>{this.p.setFromMatrixPosition(u.m);const g=cc(this.p.x,this.p.z,m_);let f=r.get(g);return f||(f={boxes:[],cylLarge:[],cylSmall:[],lamps:[]},r.set(g,f)),f},l=u=>u.size>g_;for(const u of this.boxes)a(u).boxes.push(u);for(const u of this.cyls)(l(u)?a(u).cylLarge:a(u).cylSmall).push(u);for(const u of this.lamps)a(u).lamps.push(u);this.counts.boxes=this.boxes.length,this.counts.cylinders=this.cyls.length,this.counts.lamps=this.lamps.length;const c=new Fe,h=new C,d=new Gt(16777215);for(const u of r.values()){const g={meshes:[],box:new Xe,center:new C,r:0,height:0};u.boxes.sort((v,p)=>Number(l(p))-Number(l(v)));const f=(v,p,m,_)=>{if(!v.length)return;const w=p.clone(),x=_?null:new es(new Float32Array(v.length*2),2);x&&w.setAttribute("aMatParams",x);const A=new Es(w,this.material,v.length),M=new Xe;let S=0;v.forEach((b,T)=>{A.setMatrixAt(T,b.m);const U=this.mats[b.mat];A.setColorAt(T,_?d:U.color),x?.setXY(T,U.roughness,U.metalness),l(b)&&S++,c.copy(p.boundingSphere).applyMatrix4(b.m),M.expandByPoint(h.copy(c.center).addScalar(-c.radius)),M.expandByPoint(h.copy(c.center).addScalar(c.radius))}),A.boundingSphere=M.getBoundingSphere(new Fe),A.castShadow=!0,A.receiveShadow=!0;let E=null;m&&(E=m.clone(),x&&E.setAttribute("aMatParams",x));const y={mesh:A,large:S,total:v.length,mainCount:v.length,hi:w,lo:E};A.onBeforeShadow=()=>{A.count=r2()<=0?y.total:y.large},A.onAfterShadow=()=>{A.count=y.mainCount},g.box.union(M),g.meshes.push(y),this.group.add(A)};f(u.boxes,t,null,!1),f(u.cylLarge,e,null,!1),f(u.cylSmall,e,n,!1),f(u.lamps,i,o,!0),g.box.getBoundingSphere(c),g.center.copy(c.center),g.r=c.radius,g.height=g.box.max.y-g.box.min.y,this.chunks.push(g),this.counts.meshes+=g.meshes.length}this.counts.chunks=this.chunks.length,this.boxes.length=0,this.cyls.length=0,this.lamps.length=0}setNight(t){this.material.emissiveIntensity=8*t}updateLod(t,e,n){for(const i of this.chunks){const o=Math.max(0,Math.hypot(i.center.x-t,i.center.z-e)-i.r),r=n.boxInView(i.box),a=n.casterInView(i.center,i.r,i.height),l=o>x_;for(const c of i.meshes){const h=l?c.large:c.total;c.mainCount=h,c.mesh.count=h;const d=r&&h>0;c.mesh.visible=d||a,c.mesh.castShadow=a,c.mesh.layers.mask=Mo(c.large>0?"all":"near",d),c.lo&&(c.mesh.geometry=o>v_?c.lo:c.hi)}}}buildMarinas(t){for(const e of this.map.marinas){const n=t.fork(e.id),i=Math.sin(e.rot),o=-Math.cos(e.rot),r=-o,a=i,l=this.shoreDistance(e.x,e.z,i,o),c=e.x+i*l,h=e.z+o*l,d=e.piers*n.range(24,30)+24,u=.95,g=-e.rot,f=(M,S,E,y,b,T,U)=>this.box(M,S,E,y,b,T,U,g);f("concrete",c-i*.4,.3,h-o*.4,d,.9,1.2),f("wood",c-i*3.2,u-.3,h-o*3.2,d,.3,5.5);for(let M=-d/2+2;M<d/2;M+=n.range(5,8))this.piling(c+r*M+i*.4,h+a*M+o*.4,u+.55,.2);let v=-d/2+n.range(8,16);for(;v<d/2-8;){const M=c+r*v,S=h+a*v;let E=e.pierLen*n.range(.6,1.2);for(;E>30&&this.map.heightAt(M+i*E,S+o*E)>-1.2;)E-=6;if(E<=30){v+=n.range(22,34);continue}const y=M+i*E/2,b=S+o*E/2,T=n.chance(.3);f("wood",y,u-.3,b,T?3.2:2.2,.3,E);for(let O=n.range(2,6);O<E;O+=n.range(8,12))for(const z of[-1,1])this.piling(M+i*O+r*z*(T?1.7:1.3),S+o*O+a*z*(T?1.7:1.3),u+n.range(.4,.9),n.range(.15,.2));const U=n.range(10,14);for(let O=n.range(6,12);O<E-8;O+=U)for(const z of[-1,1]){if(n.chance(.18))continue;const B=n.range(6,9.5),F=M+i*O+r*z*(B/2+1),L=S+o*O+a*z*(B/2+1);if(f("wood",F,u-.4,L,B,.25,.9),this.piling(M+i*O+r*z*(B+.6),S+o*O+a*z*(B+.6),u+.4,.14),n.chance(.62)){const H=n.range(6.5,12.5),G=M+i*(O+U*.5)+r*z*(H*.45+1.2),N=S+o*(O+U*.5)+a*z*(H*.45+1.2);this.moor(G,N,e.rot+Math.PI/2,H)}}if(n.chance(.55)){const O=n.range(16,26),z=M+i*(E-1.2),B=S+o*(E-1.2);f("wood",z,u-.3,B,O,.3,2.4);for(const F of[-1,1])this.piling(z+r*F*O*.5,B+a*F*O*.5,u+.7,.2);for(const F of[-1,1])n.chance(.7)&&this.moor(z+i*4.5+r*F*O*.25,B+o*4.5+a*F*O*.25,e.rot+Math.PI/2,n.range(13,19))}v+=n.range(22,36)}const p=(n.chance(.5)?-1:1)*(d/2-6),m=c+r*p+i*7,_=h+a*p+o*7;f("wood",m,u-.3,_,9,.3,14);for(const M of[-1,1])this.piling(m+r*M*4+i*6,_+a*M*4+o*6,u+.6,.2);for(const M of[-1,1])this.cyl("steel",m+r*M*3,u,_+a*M*3,.16,4.4);f("white",m,u+4.4,_,10,.5,8),f("red",m,u,_,.9,1.3,.9),this.moor(m+i*12,_+o*12,e.rot+Math.PI/2,n.range(8,12));const w=c-i*22+r*n.range(-8,8),x=h-o*22+a*n.range(-8,8),A=this.map.heightAt(w,x);if(f("white",w,A,x,18,5.5,11),f("dark",w,A+5.5,x,19.5,.5,12.5),this.cyl("white",w+r*6,A+6,x+a*6,.9,5.5),this.markOccupied(w,x,22),n.chance(.7)){const M=c-i*26+r*(d/2-30)*(p>0?-1:1),S=h-o*26+a*(d/2-30)*(p>0?-1:1),E=this.map.heightAt(M,S);if(E>.9){f("steel",M,E+8.6,S,30,.4,10);for(const b of[-1,1])for(const T of[-1,1])this.cyl("steel",M+r*b*14+i*T*4.5,E,S+a*b*14+o*T*4.5,.2,8.6);const y=n.int(4,8);for(let b=0;b<y;b++)f(n.pick(["white","white","blue","red"]),M+r*n.range(-12,12)+i*n.range(-2,2),E+n.int(0,2)*2.8+.4,S+a*n.range(-12,12)+o*n.range(-2,2),2.4,1.4,7);this.markOccupied(M,S,20)}}if(n.chance(.6)){const M=n.chance(.5)?-1:1,S=c+r*M*(d/2+6),E=h+a*M*(d/2+6),y=n.range(40,90);for(let b=0;b<y;b+=n.range(3,4.5)){const T=S+i*b+r*n.range(-1.5,1.5),U=E+o*b+a*n.range(-1.5,1.5);if(this.map.heightAt(T,U)<-3)break;this.box("dark",T,-.8+n.range(0,.5),U,n.range(2.2,3.6),n.range(1.8,2.6),n.range(2.2,3.4),n.range(0,Math.PI),n.range(-.15,.15))}}}}buildPrivateDocks(t){const e=(n,i,o,r,a)=>{const l=this.shoreDistance(n,i,o,r,120);if(l<0||l>=120)return;const c=n+o*l,h=i+r*l,d=a.range(5,9);if(this.map.heightAt(c+o*(d+2),h+r*(d+2))>-.7)return;const g=-Math.atan2(o,-r),f=.75;this.box("wood",c+o*(d/2-1.5),f-.25,h+r*(d/2-1.5),1.8,.25,d+3,g);const v=-r,p=o;for(const m of[d-.6,d*.4])for(const _ of[-1,1])this.piling(c+o*m+v*_*.8,h+r*m+p*_*.8,f+a.range(.3,.7),.13);if(a.chance(.55)){const m=a.chance(.5)?-1:1,_=a.range(5.5,10);this.moor(c+o*(d*.6)+v*m*2.4,h+r*(d*.6)+p*m*2.4,g,_)}else if(a.chance(.35)){const m=a.chance(.5)?-1:1;for(const _ of[d*.25,d*.8])for(const w of[1.4,4.2])this.piling(c+o*_+v*m*w,h+r*_+p*m*w,f+2.6,.12,"steel");this.box("steel",c+o*(d*.52)+v*m*2.8,f+2.6,h+r*(d*.52)+p*m*2.8,3.4,.2,d*.6,g)}};for(let n=0;n<5;n++){const i=1870-n*25,o=-3e3+n*330,r=t.fork(`finger-${n}`);for(const a of[-1,1])for(let l=-280+r.range(0,30);l<280;l+=r.range(26,44))r.chance(.25)||e(i+l,o+a*60,0,a,r)}for(const n of this.map.canals){const i=t.fork(n.id),o=Math.min(n.a[0],n.b[0]),r=Math.max(n.a[0],n.b[0]);for(let a=o+i.range(15,40);a<r-15;a+=i.range(30,55)){if(n.culverts.some(c=>Math.abs(c-a)<n.culvertHalf+12)||i.chance(.35))continue;const l=i.chance(.5)?-1:1;e(a,n.a[1]-l*(n.width*.5+14),0,l,i)}}}buildFishingPiers(t){const e=[[2700,-4650,1,0,170],[2600,-2350,1,.05,150],[1800,6700,-.2,1,130]];for(const[n,i,o,r,a]of e){const l=t.fork(`${n}-${i}`),c=Math.hypot(o,r),h=o/c,d=r/c,u=this.shoreDistance(n,i,h,d,600);if(u<0||u>=600)continue;const g=n+h*(u-22),f=i+d*(u-22),v=-Math.atan2(h,-d),p=2.6,m=a+22;this.box("wood",g+h*m/2,p-.3,f+d*m/2,3.4,.3,m,v);const _=-d,w=h;for(let S=0;S<m;S+=l.range(7,10))for(const E of[-1,1])this.piling(g+h*S+_*E*1.5,f+d*S+w*E*1.5,p+1.1,.2);for(const S of[-1,1])this.box("wood",g+h*m/2+_*S*1.6,p+.9,f+d*m/2+w*S*1.6,.1,.1,m,v);const x=g+h*(m-2.5),A=f+d*(m-2.5),M=l.range(14,20);this.box("wood",x,p-.3,A,M,.3,5,v);for(const S of[-1,1])this.piling(x+_*S*M*.5,A+w*S*M*.5,p+1.2,.22);this.box(l.pick(["white","blue","orange"]),x+_*M*.22,p,A+w*M*.22,4.5,3,4,v),this.box("dark",x+_*M*.22,p+3,A+w*M*.22,5.2,.3,4.8,v);for(const S of[-1,1])this.cyl("steel",x-_*M*.3+h*S*1.6,p,A-w*M*.3+d*S*1.6,.08,3.2);this.box("white",x-_*M*.3,p+3.2,A-w*M*.3,5,.15,4,v),this.box("white",g-h*2+_*3.5,this.map.heightAt(g-h*2+_*3.5,f-d*2+w*3.5),f-d*2+w*3.5,4,3.2,4,v),this.markOccupied(g,f,12)}}buildChannelMarkers(t){for(const e of this.map.channels){if(e.width>=250||e.depth<3.5)continue;const n=t.fork(e.id);let i=n.range(60,200);for(let o=0;o<e.pts.length-1;o++){const[r,a]=e.pts[o],[l,c]=e.pts[o+1],h=Math.hypot(l-r,c-a),d=(l-r)/h,u=(c-a)/h;let g=i;for(;g<h;g+=n.range(260,420)){const f=r+d*g,v=a+u*g,p=e.width*.5+n.range(6,14);for(const m of[-1,1]){if(n.chance(.3))continue;const _=f-u*p*m+n.range(-3,3),w=v+d*p*m+n.range(-3,3);if(this.map.heightAt(_,w)>-1.2)continue;const x=n.range(3.2,4.2);this.piling(_,w,x,.24,"wood"),this.box(m>0?"red":"green",_,x-1.1,w,1.1,1.1,.25,Math.atan2(d,-u)),n.chance(.3)&&this.box("white",_,x+.1,w,.5,.5,.5)}}i=g-h}}}buildLifeguardTowers(t){const e=[[2600,-7600,1,0,0,1],[3e3,4900,1,.2,-.2,1]],n=["white","yellow","orange","blue","red"];for(const[i,o,r,a,l,c]of e){const h=t.fork(`${i}`),d=i>2900?1600:6e3;for(let u=h.range(120,300);u<d;u+=h.range(380,620)){const g=i+l*u,f=o+c*u,v=this.shoreDistance(g,f,r,a,900);if(v<=0||v>=900)continue;let p=v-14;for(;p>0&&this.map.heightAt(g+r*p,f+a*p)<1;)p-=3;const m=g+r*p,_=f+a*p,w=this.map.heightAt(m,_);if(w<.9||w>3.2||this.map.zoneAt(m,_)!==2)continue;const x=-Math.atan2(r,-a)+h.range(-.2,.2),A=Math.cos(x),M=Math.sin(x),S=h.pick(n);for(const[E,y]of[[-1.2,-1.2],[1.2,-1.2],[1.2,1.2],[-1.2,1.2]])this.cyl("wood",m+E*A-y*M,w,_+E*M+y*A,.12,3);this.box(S,m,w+3,_,3.2,2.4,3,x),this.box("white",m,w+5.4,_,3.9,.25,3.7,x),this.box("wood",m,w+2.9,_,3.6,.15,3.4,x);for(let E=0;E<4;E++)this.box("wood",m-r*(2.2+E*1.1),w+2.9-(E+1)*.7,_-a*(2.2+E*1.1),1,.12,1.2,x);this.markOccupied(m,_,6)}}}buildClubhouse(t){const e=this.map.pois.find(w=>w.kind==="clubhouse");if(!e)return;const n=this.map.heightAt(e.x,e.z);if(n<1)return;const i=Math.cos(e.rot),o=Math.sin(e.rot),r=(w,x)=>[e.x+w*i-x*o,e.z+w*o+x*i],[a,l]=r(0,0);this.box("white",a,n,l,34,5.5,18,e.rot),this.box("dark",a,n+5.5,l,37,.6,21,e.rot),this.box("white",a,n+6.1,l,12,2.4,8,e.rot),this.box("dark",a,n+8.5,l,13.5,.4,9.5,e.rot);const[c,h]=r(0,13);this.box("wood",c,n+.4,h,34,.3,8,e.rot),this.box("white",c,n+4.6,h,35,.35,9,e.rot);for(let w=-3;w<=3;w++){const[x,A]=r(w*5.5,16.5);this.cyl("white",x,n+.7,A,.22,3.9)}const[d,u]=r(24,-4);this.box("white",d,n,u,14,4,12,e.rot),this.box("dark",d,n+4,u,15.5,.5,13.5,e.rot);const[g,f]=r(-26,-8);this.box("concrete",g,n,f,16,3.4,14,e.rot),this.box("dark",g,n+3.4,f,17,.4,15,e.rot);for(let w=0;w<5;w++){const[x,A]=r(-30+w*3.2,3+t.range(-1,1));this.box("white",x,n,A,1.3,1.1,2.4,e.rot),this.box("dark",x,n+1.6,A,1.4,.1,2.2,e.rot)}const[v,p]=r(4,32);this.box("grass",v,n+.05,p,30,.2,20,e.rot),this.cyl("white",v+4,n+.25,p-3,.04,2.2),this.box("red",v+4.3,n+2,p-3,.6,.4,.05,e.rot);const[m,_]=r(-6,-22);this.box("dark",m,n-.05,_,48,.2,18,e.rot),this.markOccupied(e.x,e.z,60)}buildPort(t){const e=Du,n=Math.cos(e.rot),i=Math.sin(e.rot),o=(M,S)=>[e.cx+M*n-S*i,e.cz+M*i+S*n],r=-.04,a=(M,S,E,y,b,T,U)=>{const[O,z]=o(S,y);this.box(M,O,E,z,b,T,U,r)},l=(M,S,E,y,b,T)=>{const[U,O]=o(S,y);this.cyl(M,U,E,O,b,T,r)},c=(M,S)=>{const[E,y]=o(M,S);return this.map.heightAt(E,y)},h=(M,S,E)=>{const[y,b]=o(M,S);this.markOccupied(y,b,E)},d=["red","blue","green","orange","steel","white","blue","red"],u=-300,g=[];for(let M=-780;M<e.hw-150;M+=t.range(185,240))g.push(M);for(const M of g){const S=u+16,E=c(M,S);if(E<1)continue;const y=18,b=40+t.range(-3,5);for(const T of[-1,1])for(const U of[-1,1])a("steel",M+T*y/2,E,S+U*6,1.6,b,1.6);a("steel",M,E+b,S-4,y+4,3,3),a("steel",M,E+b,S+4,y+4,3,3),a("orange",M,E+b+3,S-26,3.2,3,58),a("steel",M,E+b+5,S+12,3,3,18),a("white",M,E+b-14,S-12,6,4,6)}for(const[M,S,E,y]of[[-420,190,30,9],[330,130,22,7]]){const b=u-E/2-3;a("dark",M,-2.5,b,S,y+2.5,E),a(t.pick(["red","blue"]),M,y,b,S-6,1.6,E-2),a("white",M+S*.36,y+1.6,b,S*.14,12,E-6);for(let T=0;T<4;T++)a("steel",M-S*.32+T*S*.18,y+1.6,b,3,6+T%2*3,2)}const f=u+70,v=40;for(let M=-860;M<e.hw-260;M+=175)for(let S=f;S<v-40;S+=58){if(t.chance(.12))continue;const E=c(M+60,S+20);if(E<1)continue;const y=6,b=10,T=t.range(1,4);for(let U=0;U<y;U++)for(let O=0;O<b;O++){if(t.chance(.28))continue;const z=Math.min(4,Math.max(1,Math.round(T+t.range(-1.5,1.5)))),B=M+O*13.4,F=S+U*6.1;for(let L=0;L<z;L++)a(t.pick(d),B,E+L*2.6,F,12.2,2.6,4.9)}h(M+60,S+15,80),t.chance(.5)&&l("steel",M-8,E,S-6,.3,30)}let p=-810;for(;p<e.hw-520;){const M=t.range(120,170),S=t.range(40,55),E=150+t.range(-10,10),y=c(p+M/2,E);if(y>=1){a(t.pick(["concrete","white","tank"]),p+M/2,y,E,M,11+t.range(0,3),S),a("dark",p+M/2,y+11+3,E,M+2,.6,S+2);for(let b=0;b<6;b++)a("steel",p+12+b*(M-24)/5,y,E+S/2+3,4,4.2,6);h(p+M/2,E,Math.max(M,S)*.6)}p+=M+t.range(30,60)}const m=e.hh,_=260,w=c(_,m-60);a("white",_,w,m-60,260,12,40),a("glass",_,w+12,m-60,240,4,36),a("white",_,w,m-20,120,7,30),h(_,m-55,150);const x=m+19;a("dark",_,-2.5,x,290,12.5,36),a("white",_,10,x,280,28,32);for(let M=0;M<6;M++)a("glass",_,13.5+M*3.5,x,276,1.2,33);a("white",_-30,38,x,90,8,22),l("dark",_-90,38,x,4,14);const A=this.map.pois.find(M=>M.kind==="tanks");for(let M=0;M<9;M++){const S=A.x+M%3*52-52,E=A.z+Math.floor(M/3)*52-52,y=this.map.heightAt(S,E);y<1||(this.cyl("tank",S,y,E,t.range(14,22),t.range(10,16)),this.markOccupied(S,E,26))}}buildAirport(t){const e=this.map.pois.find(c=>c.kind==="terminal"),n=this.map.heightAt(e.x,e.z);this.box("white",e.x,n,e.z,260,14,60),this.box("glass",e.x,n+3,e.z+30.5,250,7,1.2),this.box("steel",e.x,n+14,e.z,270,2,66);for(let c=-1;c<=1;c++)this.box("white",e.x+c*90,n,e.z+90,30,9,120),this.box("steel",e.x+c*90,n+9,e.z+90,32,1.2,122);this.box("dark",e.x,n-.1,e.z+130,520,.4,220),this.cyl("concrete",e.x+220,n,e.z-40,4,38),this.box("glass",e.x+220,n+38,e.z-40,14,5,14,.4),this.box("white",e.x+220,n+43,e.z-40,16,1.5,16,.4);const i=this.map.pois.find(c=>c.kind==="hangars");for(let c=0;c<4;c++){const h=i.x+c*80,d=i.z,u=this.map.heightAt(h,d);this.box("concrete",h,u,d,64,12,50),this.box("steel",h,u+12,d,60,5,40),this.box("steel",h,u+17,d,40,3,30),this.markOccupied(h,d,40)}for(let c=-1;c<=1;c++)for(const h of[-1,1]){const d=e.x+c*90+h*34,u=e.z+110;this.cyl("white",d,n+2.2,u,2.6,38,0,Math.PI/2),this.box("white",d,n+2.5,u+2,34,.8,5,0),this.box("white",d,n+3,u+17,12,.6,3),this.box("white",d,n+4,u+18,.6,9,3),this.cyl("steel",d-9,n+.8,u+4,1.4,4.5,0,Math.PI/2),this.cyl("steel",d+9,n+.8,u+4,1.4,4.5,0,Math.PI/2)}this.markOccupied(e.x,e.z+60,320);const o=this.map.runways.find(c=>c.id==="strip-southkey"),r=(o.a[0]+o.b[0])/2+40,a=(o.a[1]+o.b[1])/2-60,l=this.map.heightAt(r,a);l>1&&(this.box("concrete",r,l,a,26,7,20,.55),this.box("steel",r,l+7,a,24,2.5,16,.55),this.markOccupied(r,a,20))}buildStadium(){const t=this.map.pois.find(r=>r.kind==="stadium"),e=this.map.heightAt(t.x,t.z);if(e<1)return;const n=40,i=t.size,o=t.size*.8;for(let r=0;r<n;r++){const a=r/n*Math.PI*2+t.rot,l=Math.cos(a),c=Math.sin(a),h=t.x+l*i,d=t.z+c*o,u=2*Math.PI*(i+o)/2/n+2,g=Math.atan2(l*o,-c*i);this.box("concrete",h,e,d,u,14,22,g),this.box("concrete",h+l*10,e+14,d+c*10,u,12,16,g),this.box("white",h+l*12,e+26,d+c*12,u,1.5,34,g),this.box("steel",h+l*26,e,d+c*26,1.4,30,1.4)}this.box("grass",t.x,e+.05,t.z,i*1.2,.3,o*1.15,t.rot),this.markOccupied(t.x,t.z,i+40)}buildLighthouse(){const t=this.map.pois.find(n=>n.kind==="lighthouse"),e=this.map.heightAt(t.x,t.z);e<.5||(this.cyl("white",t.x,e,t.z,4.2,28),this.cyl("red",t.x,e+10,t.z,4.25,5),this.cyl("dark",t.x,e+28,t.z,2.4,3.5),this.cyl("white",t.x,e+31.5,t.z,1.6,1.4),this.box("white",t.x+12,e,t.z+6,12,5,9,.3),this.markOccupied(t.x,t.z,20))}buildConstruction(t){for(const e of this.map.districts)if(e.id.startsWith("construction")){const n=this.map.heightAt(e.cx,e.cz);if(n<1)continue;const i=t.int(5,12),o=e.hw*1.2,r=e.hh*1.2;for(let c=1;c<=i;c++)this.box("concrete",e.cx,n+c*3.6,e.cz,o,.4,r,e.rot);for(const[c,h]of[[-.4,-.4],[.4,-.4],[.4,.4],[-.4,.4],[0,0],[0,-.4],[0,.4],[-.4,0],[.4,0]]){const d=Math.cos(e.rot),u=Math.sin(e.rot),g=e.cx+c*o*d-h*r*u,f=e.cz+c*o*u+h*r*d;this.cyl("concrete",g,n,f,.45,i*3.6+.4)}this.box("concrete",e.cx+o*.15,n,e.cz,10,i*3.6+6,8,e.rot);const a=e.cx-o*.6,l=e.cz+r*.6;this.box("yellow",a,n,l,2.2,i*3.6+30,2.2),this.box("yellow",a+20,n+i*3.6+30,l,60,1.6,1.6,.4),this.box("yellow",a-8,n+i*3.6+30,l,14,1.6,1.6,.4);for(let c=0;c<5;c++)this.box(t.pick(["blue","white","orange"]),e.cx+t.range(-o,o)*.7,n,e.cz+r*.85,6,2.6,2.4,e.rot);this.markOccupied(e.cx,e.cz,Math.max(o,r))}}buildLamps(t,e){for(const n of t){if(n.cls!=="highway"&&n.cls!=="arterial"&&n.cls!=="causeway")continue;const i=n.b[0]-n.a[0],o=n.b[1]-n.a[1],r=Math.hypot(i,o),a=i/r,l=o/r;let c=0;for(let h=20;h<r;h+=45,c++){const d=c%2===0?-1:1,u=n.a[0]+a*h+-l*(n.width/2+1)*d,g=n.a[1]+l*h+a*(n.width/2+1)*d,f=this.map.heightAt(u,g);f<.8||this.lampPositions.push(new C(u,f,g))}}for(const n of e)this.lampPositions.push(n.clone());for(const n of this.lampPositions)this.lamp(n.x,n.y,n.z)}buildSeawalls(){const t=this.map.districts.find(i=>i.id==="industrial-port"),e=Math.cos(t.rot),n=Math.sin(t.rot);for(let i=-t.hw;i<=t.hw;i+=6)for(const o of[-1,1]){const r=t.cx+i*e-o*t.hh*n,a=t.cz+i*n+o*t.hh*e;this.box("concrete",r,1.4,a,6.2,2.2,2,t.rot)}}}function Ys(s,t,e){const n=s/2,i=t/2,o=[[-n,-e*.55,0],[n*.55,-e*.55,0],[-n,-e*.1,-i*.95],[-n,-e*.1,i*.95],[n*.35,-e*.15,-i],[n*.35,-e*.15,i],[n,.05,0],[-n,e*.45,-i],[-n,e*.45,i],[n*.4,e*.45,-i*.95],[n*.4,e*.45,i*.95],[n,e*.55,0]],r=[[0,2,4],[0,4,1],[0,1,5],[0,5,3],[1,4,6],[1,6,5],[2,7,9],[2,9,4],[4,9,11],[4,11,6],[3,5,10],[3,10,8],[5,6,11],[5,11,10],[0,3,8],[0,8,7],[0,7,2],[7,8,10],[7,10,9],[9,10,11]],a=[];for(const c of r)for(const h of c)a.push(o[h][0],o[h][1],o[h][2]);const l=new oe;return l.setAttribute("position",new yt(a,3)),l.computeVertexNormals(),l}class w_{mats={white:new ce({color:16053488,roughness:.35,metalness:.05}),hullDark:new ce({color:2042424,roughness:.5}),hullRed:new ce({color:10104618,roughness:.55}),hullBlue:new ce({color:2051978,roughness:.5}),teak:new ce({color:11569754,roughness:.8}),glass:new ce({color:2241348,roughness:.1,metalness:.9}),sail:new ce({color:16316142,roughness:.9,side:hn}),steel:new ce({color:9213084,roughness:.5,metalness:.6}),containerWhite:new ce({color:16777215,roughness:.7})};get materials(){return[this.mats.white,this.mats.hullDark,this.mats.hullRed,this.mats.hullBlue,this.mats.teak,this.mats.glass,this.mats.sail,this.mats.steel,this.mats.containerWhite]}build(t,e){const n=new Ve,i=(r,a,l,c,h,d=0,u=0,g=0)=>{const f=new ge(r,a);return f.position.set(l,c,h),f.rotation.set(d,u,g),f.castShadow=!0,f.receiveShadow=!0,n.add(f),f},o=e.pick([this.mats.white,this.mats.white,this.mats.hullDark,this.mats.hullBlue,this.mats.hullRed]);switch(t){case"speed":{const r=e.range(7,10),a=r*.3;return i(Ys(r,a,1.4),o,0,.3,0),i(new Ht(r*.25,.5,a*.8),this.mats.glass,r*.05,1.05,0,0,0,-.35),i(new Ht(r*.35,.35,a*.75),this.mats.teak,-r*.2,.8,0),i(new Ht(.6,.6,.8),this.mats.steel,-r*.45,.6,0),{group:n,len:r,beam:a,draft:.5,wakeWidth:a*1.4}}case"console":{const r=e.range(6,8),a=r*.32;i(Ys(r,a,1.3),this.mats.white,0,.3,0),i(new Ht(1.2,1.4,1),this.mats.white,0,1.2,0),i(new Ht(1.6,.15,1.6),this.mats.hullDark,0,2.3,0);for(const l of[-1,1])i(new Me(.04,.04,1.6,6),this.mats.steel,.6*l,1.5,.7*l);return i(new Ht(.5,.7,.5),this.mats.hullDark,-r*.45,.7,0),{group:n,len:r,beam:a,draft:.45,wakeWidth:a*1.3}}case"yacht":{const r=e.range(18,32),a=r*.25;return i(Ys(r,a,r*.16),this.mats.white,0,r*.04,0),i(new Ht(r*.5,r*.09,a*.8),this.mats.white,-r*.05,r*.13,0),i(new Ht(r*.48,r*.04,a*.82),this.mats.glass,-r*.05,r*.135,0),i(new Ht(r*.28,r*.07,a*.6),this.mats.white,-r*.12,r*.21,0),i(new Ht(r*.26,r*.03,a*.62),this.mats.glass,-r*.12,r*.215,0),i(new Ht(r*.06,r*.09,a*.5),this.mats.white,-r*.2,r*.29,0,0,0,.3),i(new Me(.15,.15,1.2,8),this.mats.steel,-r*.2,r*.34,0),{group:n,len:r,beam:a,draft:r*.06,wakeWidth:a*1.5}}case"sail":{const r=e.range(9,14),a=r*.31;i(Ys(r,a,r*.14),o,0,r*.03,0),i(new Ht(r*.3,.7,a*.6),this.mats.white,-r*.05,r*.09+.3,0);const l=r*1.25;i(new Me(.06,.09,l,6),this.mats.steel,r*.05,l/2+r*.08,0);const c=new oe;c.setAttribute("position",new yt([0,0,0,0,l*.9,0,-r*.42,0,0],3)),c.computeVertexNormals(),i(c,this.mats.sail,r*.05,r*.13,0,0,0,0);const h=new oe;return h.setAttribute("position",new yt([0,0,0,0,l*.75,0,r*.4,0,0],3)),h.computeVertexNormals(),i(h,this.mats.sail,r*.05,r*.13,.05,0,0,0),n.rotation.z=.12,{group:n,len:r,beam:a,draft:1.5,wakeWidth:a*.9}}case"ferry":return i(Ys(42,12,5),this.mats.hullBlue,0,1.5,0),i(new Ht(42*.8,3.2,12*.9),this.mats.white,-1,4.9,0),i(new Ht(42*.78,1.2,12*.92),this.mats.glass,-1,5.2,0),i(new Ht(42*.4,2.8,12*.6),this.mats.white,-4,7.8,0),i(new Me(.6,.7,3,10),this.mats.hullDark,-12,10.5,0),{group:n,len:42,beam:12,draft:2.2,wakeWidth:12*1.3};case"cargo":{const r=e.range(120,180),a=r*.16,l=r*.075;i(Ys(r,a,l),this.mats.hullDark,0,l*.15,0),i(new Ht(r*.9,.8,a*.98),this.mats.hullRed,0,l*.6,0),i(new Ht(r*.09,l*1.6,a*.9),this.mats.white,-r*.38,l*.6+l*.8,0),i(new Ht(r*.1,2,a*.95),this.mats.glass,-r*.38,l*.6+l*1.55,0),i(new Me(1.2,1.5,l*.9,10),this.mats.hullDark,-r*.44,l*.6+l*1.9,0);const c=Math.floor(r*.6/6.4),h=Math.max(3,Math.floor(a/2.6)),d=[];for(let v=0;v<c;v++)for(let p=0;p<h;p++){const m=e.int(1,4);for(let _=0;_<m;_++)d.push({x:r*.3-v*6.4,y:l*.6+.8+1.3+_*2.6,z:(p-(h-1)/2)*2.5,c:e.int(0,5)})}const u=new Es(new Ht(6.1,2.6,2.44),this.mats.containerWhite,d.length),g=new jt,f=[12597547,3049153,2600544,14059792,8227731,15528177].map(v=>new Gt(v));return d.forEach((v,p)=>{u.setMatrixAt(p,g.makeTranslation(v.x,v.y,v.z)),u.setColorAt(p,f[v.c])}),u.castShadow=!0,u.receiveShadow=!0,n.add(u),{group:n,len:r,beam:a,draft:l*.5,wakeWidth:a*1.4}}}}}function y_(s){let t=0;for(let e=0;e<s.length-1;e++)t+=Math.hypot(s[e+1][0]-s[e][0],s[e+1][1]-s[e][1]);return t}function M_(s,t,e){let n=0;for(let i=0;i<s.length-1;i++){const o=Math.hypot(s[i+1][0]-s[i][0],s[i+1][1]-s[i][1]);if(t<=n+o||i===s.length-2){const r=Jt((t-n)/o,0,1);e.dx=(s[i+1][0]-s[i][0])/o,e.dz=(s[i+1][1]-s[i][1])/o,e.x=s[i][0]+e.dx*o*r,e.z=s[i][1]+e.dz*o*r;return}n+=o}}function ul(s){s.updateMatrixWorld(!0);const t=s.matrixWorld.clone().invert(),e=new p_,n=new jt,i=new jt,o=new Gt;return s.traverse(r=>{const a=r;if(!a.isMesh)return;n.multiplyMatrices(t,a.matrixWorld);const l=a.material,c=r;if(c.isInstancedMesh)for(let h=0;h<c.count;h++)c.getMatrixAt(h,i),c.instanceColor&&c.getColorAt(h,o),e.add(a.geometry,i.premultiply(n),l,c.instanceColor?o:void 0);else e.add(a.geometry,n,l);a.geometry.dispose()}),e.build()}const P0=5e3,L0=3;function S_(){const s=[[new Ht(4.4,1,1.9),0,0,.65,0],[new Ht(2.2,.75,1.7),1,-.2,1.5,0],[new Ht(.2,.25,1.6),2,2.2,.8,0]],t=[],e=[],n=[],i=[];for(const[r,a,l,c,h]of s){const d=r.translate(l,c,h).toNonIndexed(),u=d.getAttribute("position"),g=d.getAttribute("normal"),f=d.getAttribute("uv");for(let v=0;v<u.count;v++)t.push(u.getX(v),u.getY(v),u.getZ(v)),e.push(g.getX(v),g.getY(v),g.getZ(v)),n.push(f.getX(v),f.getY(v)),i.push(a);d.dispose(),r.dispose()}const o=new oe;return o.setAttribute("position",new yt(t,3)),o.setAttribute("normal",new yt(e,3)),o.setAttribute("uv",new yt(n,2)),o.setAttribute("aPart",new yt(i,1)),o.computeBoundingSphere(),o}function b_(){const s=new ce({color:16777215,emissive:16773840,emissiveIntensity:0}),t=new Gt(1712684),e=n=>n.toFixed(6);return s.onBeforeCompile=n=>{n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
attribute float aPart;
varying float vPart;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vPart = aPart;`),n.fragmentShader=n.fragmentShader.replace("#include <common>",`#include <common>
varying float vPart;`).replace("#include <color_fragment>",`#include <color_fragment>
if (vPart > 1.5) diffuseColor.rgb = vec3(1.0);
else if (vPart > 0.5) diffuseColor.rgb = vec3(${e(t.r)}, ${e(t.g)}, ${e(t.b)});`).replace("#include <roughnessmap_fragment>","float roughnessFactor = vPart > 1.5 ? 1.0 : (vPart > 0.5 ? 0.15 : 0.35);").replace("#include <metalnessmap_fragment>","float metalnessFactor = vPart > 1.5 ? 0.0 : (vPart > 0.5 ? 0.8 : 0.4);").replace("#include <emissivemap_fragment>","totalEmissiveRadiance *= step(1.5, vPart);")},s.customProgramCacheKey=()=>"traffic-car-v1",s}class E_{constructor(t,e,n,i,o,r){this.map=t,this.wakeScene=i;const a=new We(`traffic-${o}`),l=new w_,c=[];for(const z of t.channels){const B=y_(z.pts);for(let F=0;F<z.boats;F++){const L=z.id==="ocean-route"||z.id==="ship-channel"?a.chance(.6)?"cargo":"ferry":a.pick(["speed","speed","console","yacht","sail","speed"]),H=l.build(L,a),G=L==="cargo"?a.range(4,6):L==="ferry"?7:L==="sail"?a.range(2.5,4):L==="yacht"?a.range(5,9):a.range(9,16),N=new to(L==="cargo"?90:80,H.wakeWidth,L==="cargo"?70:L==="sail"?20:42,L==="sail"?.45:1.5);i.add(N.mesh),c.push(ul(H.group)),this.boats.push({id:c.length-1,route:z.pts,routeLen:B,s:a.range(0,B),dir:a.chance(.5)?1:-1,speed:G,len:H.len,draft:H.draft,wake:N,phase:a.range(0,100)})}}const h=[];for(const z of r){const B=l.build(a.chance(.4)?"sail":a.chance(.5)?"speed":a.chance(.5)?"console":"yacht",a),F=Jt(z.len/B.len,.6,1.4);B.group.scale.setScalar(F),B.group.position.set(z.x,.05,z.z),B.group.rotation.y=z.rot+(a.chance(.5)?Math.PI:0),c.push(ul(B.group)),h.push({idx:c.length-1,m:B.group.matrixWorld.clone()})}this.boatCount=this.boats.length+r.length;const d=new Map;for(const z of t.roads)d.set(z.id,z.pts.map(([B,F])=>new C(B,t.heightAt(B,F)+.25,F)));for(const[z,B]of d){const F=t.roads.find(L=>L.id===z);this.carRoutes.push({pts:B,length:this.len3(B),lanes:F.lanes,width:F.width})}for(const z of n)this.carRoutes.push({pts:z.pts.map(B=>B.clone().add(new C(0,.25,0))),length:this.len3(z.pts),lanes:z.lanes,width:z.width});for(const z of e){if(z.cls!=="street"||a.next()>.35)continue;const B=[new C(z.a[0],t.heightAt(z.a[0],z.a[1])+.25,z.a[1]),new C(z.b[0],t.heightAt(z.b[0],z.b[1])+.25,z.b[1])];this.carRoutes.push({pts:B,length:this.len3(B),lanes:2,width:z.width})}const u=["#e8e8e8","#d0d0d0","#1c1c1e","#8a8f94","#b8352e","#2b4c8c","#d9a441","#3d6b3a","#f2f2f2","#6c6f73","#c94f3d","#20242a"];for(let z=0;z<this.carRoutes.length;z++){const B=this.carRoutes[z],F=t.roads.find(G=>G.pts.length===B.pts.length&&G.pts[0][0]===B.pts[0].x),L=F?F.traffic:B.lanes>=4?10:1.2,H=Math.min(120,Math.round(B.length/1e3*L));for(let G=0;G<H;G++){const N=a.chance(.5)?1:-1;this.cars.push({route:z,s:a.range(0,B.length),dir:N,lane:a.int(0,Math.max(0,Math.floor(B.lanes/2)-1)),speed:a.range(11,26)*(B.lanes>=4?1.2:.8),color:new Gt(a.pick(u))})}}this.carCount=this.cars.length;const g=S_();this.carMat=b_(),this.materials.push(this.carMat);const f=new Map,v=new Array(this.carRoutes.length).fill(0);for(const z of this.cars)v[z.route]++;const p=new Set,m=new C;for(let z=0;z<this.carRoutes.length;z++){if(!v[z])continue;const B=this.carRoutes[z].pts;p.clear();for(let F=0;F<B.length-1;F++){const L=B[F],H=B[F+1],G=Math.max(1,Math.ceil(L.distanceTo(H)/40));for(let N=0;N<=G;N++){m.lerpVectors(L,H,N/G);const $=cc(m.x,m.z,P0);p.has($)||(p.add($),f.set($,(f.get($)??0)+v[z]))}}}const _=(z,B)=>{const F=new Es(g,this.carMat,z);return F.instanceMatrix.setUsage(th),F.setColorAt(0,this.cars[0]?.color??new Gt(16777215)),F.instanceColor.setUsage(th),F.castShadow=!0,F.count=0,F.visible=!1,n2(F,"mid"),B?F.boundingSphere=new Fe:F.frustumCulled=!1,this.group.add(F),{mesh:F,capacity:z,n:0,center:new C,r:0,box:new Xe}};for(const[z,B]of f){const F=_(B,!0);this.carCells.set(z,F),this.carChunks.push(F)}this.carOverflow=_(Math.max(1,this.cars.length),!1),this.carChunks.push(this.carOverflow);const w=new ce({color:16054008,roughness:.35,metalness:.2}),x=new ce({color:2781119,roughness:.4}),A=z=>{const B=new Ve,F=new ge(new Me(1.9,1.9,38,12),w);F.rotation.z=Math.PI/2,B.add(F);const L=new ge(new ii(1.9,12,8),w);L.position.x=19,L.scale.set(1.6,1,1),B.add(L);const H=new ge(new Ht(6,.5,34),w);H.position.set(1,-.8,0),H.rotation.y=0,B.add(H);const G=new ge(new Ht(5,.4,16),w);G.position.set(-3,-.8,12),G.rotation.y=-.45,B.add(G);const N=G.clone();N.position.z=-12,N.rotation.y=.45,B.add(N);const $=new ge(new Ht(5,8,.4),x);$.position.set(-16,4.5,0),$.rotation.z=-.4,B.add($);const V=new ge(new Ht(4,.3,12),w);V.position.set(-17,1,0),B.add(V);for(const tt of[-1,1]){const W=new ge(new Me(1.1,1,4.5,10),w);W.rotation.z=Math.PI/2,W.position.set(3,-2.4,tt*7),B.add(W)}return B.scale.setScalar(z),c.push(ul(B)),c.length-1},M=t.runways[0],S=(z,B)=>{const F=ie(4e3,M.a[0],z),L=ie(M.a[1]+30,M.a[1],z),H=ie(900,12,Math.pow(z,.9));return B.set(F,H,L)};this.aircraft.push({id:A(1),path:S,period:240,offset:0,contrail:null}),this.aircraft.push({id:A(.9),path:S,period:240,offset:.5,contrail:null});const E=(z,B)=>{const F=ie(M.b[0],-9e3,z),L=M.b[1]-3500*z*z;return B.set(F,12+2200*Math.pow(z,.8),L)};this.aircraft.push({id:A(1),path:E,period:200,offset:.2,contrail:null});const y=(z,B)=>B.set(ie(-14e3,14e3,z),9500,ie(-9e3,6e3,z)),b=new to(180,25,90,.6,rc);this.aircraft.push({id:A(1),path:y,period:260,offset:.4,contrail:b});let T=0;for(const z of c)T+=z.getAttribute("position").count;const U=ju("traffic-movers-v1",!0);this.materials.push(U),this.movers=new Tv(c.length,T,T,U);const O=c.map(z=>{const B=this.movers.addInstance(this.movers.addGeometry(z));return z.dispose(),B});for(const z of this.boats)z.id=O[z.id];for(const z of this.aircraft)z.id=O[z.id];for(const z of h)this.movers.setMatrixAt(O[z.idx],z.m);this.movers.frustumCulled=!1,this.movers.castShadow=!0,this.movers.receiveShadow=!0,this.group.add(this.movers)}group=new Ve;materials=[];boats=[];carRoutes=[];cars=[];carChunks=[];carCells=new Map;carOverflow;carMat;movers;aircraft=[];tmp={x:0,z:0,dx:1,dz:0};tmpM=new jt;tmpQ=new Be;tmpP=new C;tmpS=new C(1,1,1);tmpE=new Oe(0,0,0,"YXZ");up=new C(0,1,0);pos=new C;dir=new C;side=new C;ahead=new C;boatCount=0;carCount=0;len3(t){let e=0;for(let n=0;n<t.length-1;n++)e+=t[n].distanceTo(t[n+1]);return e}point3(t,e,n,i){let o=0;for(let r=0;r<t.length-1;r++){const a=t[r].distanceTo(t[r+1]);if(e<=o+a||r===t.length-2){const l=Jt((e-o)/a,0,1);i.subVectors(t[r+1],t[r]).divideScalar(a),n.copy(t[r]).addScaledVector(i,a*l);return}o+=a}}get contrailMeshes(){return this.aircraft.filter(t=>t.contrail).map(t=>t.contrail.mesh)}update(t,e,n){const{tmpM:i,tmpQ:o,tmpP:r,tmpS:a,tmpE:l,movers:c}=this;a.set(1,1,1);for(const f of this.boats){const v=f.routeLen;f.s+=f.speed*t*f.dir,f.s>v-5&&(f.s=v-5,f.dir=-1),f.s<5&&(f.s=5,f.dir=1),M_(f.route,f.s,this.tmp);const p=Math.atan2(this.tmp.dx*f.dir,this.tmp.dz*f.dir);r.set(this.tmp.x,-f.draft*.15+.12*Math.sin(e*1.3+f.phase)*(f.len<20?1:.2),this.tmp.z),l.set(.02*Math.sin(e*1.7+f.phase),p-Math.PI/2,.03*Math.sin(e*1.1+f.phase)+(f.speed>8?-.03:0),"XYZ"),c.setMatrixAt(f.id,i.compose(r,o.setFromEuler(l),a)),f.wake.update(this.tmp.x-this.tmp.dx*f.dir*f.len*.4,this.tmp.z-this.tmp.dz*f.dir*f.len*.4,e,!0,f.speed)}const{pos:h,dir:d,side:u,up:g}=this;for(const f of this.carChunks)f.n=0,f.box.makeEmpty();for(let f=0;f<this.cars.length;f++){const v=this.cars[f],p=this.carRoutes[v.route];v.s+=v.speed*t*v.dir,v.s>p.length&&(v.s=0),v.s<0&&(v.s=p.length),this.point3(p.pts,v.s,h,d),v.dir<0&&d.negate(),u.crossVectors(d,g).normalize();const m=(p.lanes>=4?1.5+v.lane*3.2:1.8)+0;h.addScaledVector(u,m);const _=Math.atan2(d.x,d.z)-Math.PI/2,w=-Math.asin(Jt(d.y,-1,1));this.tmpQ.setFromEuler(this.tmpE.set(0,_,w,"YXZ")),this.tmpP.copy(h),this.tmpM.compose(this.tmpP,this.tmpQ,this.tmpS);let x=this.carCells.get(cc(h.x,h.z,P0));(!x||x.n>=x.capacity)&&(x=this.carOverflow);const A=x.n++;x.mesh.setMatrixAt(A,this.tmpM),x.mesh.setColorAt(A,v.color),x.box.expandByPoint(h)}for(const f of this.carChunks){const v=f.mesh;if(v.count=f.n,!f.n){v.visible=!1;continue}v.visible=!0,v.instanceMatrix.clearUpdateRanges(),v.instanceMatrix.addUpdateRange(0,f.n*16),v.instanceMatrix.needsUpdate=!0,v.instanceColor.clearUpdateRanges(),v.instanceColor.addUpdateRange(0,f.n*3),v.instanceColor.needsUpdate=!0,f.box.min.addScalar(-L0),f.box.max.addScalar(L0),v.boundingSphere&&(f.box.getBoundingSphere(v.boundingSphere),f.center.copy(v.boundingSphere.center),f.r=v.boundingSphere.radius)}this.carMat.emissiveIntensity=6*n;for(const f of this.aircraft){const v=(e/f.period+f.offset)%1,p=f.path(v,this.pos),m=f.path(Math.min(1,v+.002),this.ahead).sub(p).normalize(),_=Math.atan2(m.x,m.z)-Math.PI/2,w=Math.asin(Jt(m.y,-1,1));l.set(0,_,w*.6,"YXZ"),c.setMatrixAt(f.id,i.compose(p,o.setFromEuler(l),a)),f.contrail&&(f.contrail.update(p.x,p.z,e,!0,250),f.contrail.mesh.position.y=p.y-2,f.contrail.mesh.updateMatrix())}}updateCulling(t){for(const e of this.carChunks){if(!e.n||e===this.carOverflow)continue;const n=t.boxInView(e.box),i=t.casterInView(e.center,e.r,2.5);e.mesh.visible=n||i,e.mesh.castShadow=i,e.mesh.layers.mask=Mo("mid",n)}}}function Ks(s,t=!1){const e=s[0].index!==null,n=new Set(Object.keys(s[0].attributes)),i=new Set(Object.keys(s[0].morphAttributes)),o={},r={},a=s[0].morphTargetsRelative,l=new oe;let c=0;for(let h=0;h<s.length;++h){const d=s[h];let u=0;if(e!==(d.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const g in d.attributes){if(!n.has(g))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have compatible attributes; make sure "'+g+'" attribute exists among all geometries, or in none of them.'),null;o[g]===void 0&&(o[g]=[]),o[g].push(d.attributes[g]),u++}if(u!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of attributes."),null;if(a!==d.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const g in d.morphAttributes){if(!i.has(g))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+".  .morphAttributes must be consistent throughout all geometries."),null;r[g]===void 0&&(r[g]=[]),r[g].push(d.morphAttributes[g])}if(t){let g;if(e)g=d.index.count;else if(d.attributes.position!==void 0)g=d.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". The geometry must have either an index or a position attribute"),null;l.addGroup(c,g,h),c+=g}}if(e){let h=0;const d=[];for(let u=0;u<s.length;++u){const g=s[u].index;for(let f=0;f<g.count;++f)d.push(g.getX(f)+h);h+=s[u].attributes.position.count}l.setIndex(d)}for(const h in o){const d=D0(o[h]);if(!d)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" attribute."),null;l.setAttribute(h,d)}for(const h in r){const d=r[h][0].length;if(d===0)break;l.morphAttributes=l.morphAttributes||{},l.morphAttributes[h]=[];for(let u=0;u<d;++u){const g=[];for(let v=0;v<r[h].length;++v)g.push(r[h][v][u]);const f=D0(g);if(!f)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" morphAttribute."),null;l.morphAttributes[h].push(f)}}return l}function D0(s){let t,e,n,i=-1,o=0;for(let c=0;c<s.length;++c){const h=s[c];if(t===void 0&&(t=h.array.constructor),t!==h.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(e===void 0&&(e=h.itemSize),e!==h.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=h.normalized),n!==h.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(i===-1&&(i=h.gpuType),i!==h.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;o+=h.count*e}const r=new t(o),a=new ye(r,e,n);let l=0;for(let c=0;c<s.length;++c){const h=s[c];if(h.isInterleavedBufferAttribute){const d=l/e;for(let u=0,g=h.count;u<g;u++)for(let f=0;f<e;f++){const v=h.getComponent(u,f);a.setComponent(u+d,f,v)}}else r.set(h.array,l);l+=h.count*e}return i!==void 0&&(a.gpuType=i),a}const hc=Math.PI*2;function mo(s,t,e=[0,0]){const n=s.n??2.2,i=s.nBot??n,o=t*hc-Math.PI/2,r=Math.cos(o),a=Math.sin(o),l=a<=0,c=l?n:i;return e[1]=Math.sign(r)*Math.pow(Math.abs(r),2/c)*s.w,e[0]=s.yc-Math.sign(a)*Math.pow(Math.abs(a),2/c)*(l?s.top:s.bot),e}function eo(s,t){const e=s.n??2.2,n=s.nBot??e,i=t-s.yc;return i>=0?i>=s.top?null:(Math.PI/2-Math.asin(Math.pow(i/s.top,e/2)))/hc:-i>=s.bot?null:(Math.PI/2+Math.asin(Math.pow(-i/s.bot,n/2)))/hc}function ra(s,t){const e=eo(s,t);return e===null?0:Math.abs(mo(s,e)[1])}function A_(s,t=64){let e=0;const n=mo(s,0),i=[0,0];for(let o=1;o<=t;o++)mo(s,o/t,i),e+=Math.hypot(i[0]-n[0],i[1]-n[1]),n[0]=i[0],n[1]=i[1];return e}function T_(s,t,e,n){const i=(a,l)=>a+(l-a)*e,o=s.n??2.2,r=t.n??2.2;return{x:n,yc:i(s.yc,t.yc),w:i(s.w,t.w),top:i(s.top,t.top),bot:i(s.bot,t.bot),n:i(o,r),nBot:i(s.nBot??o,t.nBot??r)}}function ei(s,t){const e=s.length;for(let r=0;r<e-1;r++){const a=s[r],l=s[r+1],c=Math.min(a.x,l.x),h=Math.max(a.x,l.x);if(t>=c-1e-9&&t<=h+1e-9)return T_(a,l,h===c?0:(t-a.x)/(l.x-a.x),t)}const n=s[0],i=s[e-1];return{...Math.abs(t-n.x)<Math.abs(t-i.x)?n:i,x:t}}function C_(s,t){const e=s.slice(),n=s[0].x>s[s.length-1].x;for(const i of t)e.some(o=>Math.abs(o.x-i)<1e-6)||e.push(ei(s,i));return e.sort((i,o)=>n?o.x-i.x:i.x-o.x),e}function qr(s,t){return s.map(e=>({...e,w:Math.max(e.w-t,.01),top:Math.max(e.top-t,.01),bot:Math.max(e.bot-t,.01)}))}function R_(s){const t=[];for(let e=0;e<=s;e++)t.push(e/s);return t}function I0(s,t,e,n,i){const r=[0],a=mo(s,t),l=[0,0];for(let d=1;d<=24;d++)mo(s,t+(e-t)*(d/24),l),r.push(r[d-1]+Math.hypot(l[0]-a[0],l[1]-a[1])),a[0]=l[0],a[1]=l[1];const c=r[24]||1e-9;let h=1;for(let d=1;d<n;d++){const u=c*(d/n);for(;h<24&&r[h]<u;)h++;const g=(u-r[h-1])/Math.max(r[h]-r[h-1],1e-9);i.push(t+(e-t)*((h-1+g)/24))}i.push(e)}function P_(s,t){return e=>{const n=[];let i=0;const o=[0];for(const r of s){const a=typeof r.y=="function"?r.y(e):r.y;let l=e.yc+e.top*.97>a&&e.yc-e.bot*.97<a?eo(e,a):r.fallbackT;l=Math.max(l,i+5e-4),I0(e,i,l,r.segs,o),i=l}I0(e,i,.5,t,o);for(const r of o)n.push(r);for(let r=o.length-2;r>=0;r--)n.push(1-o[r]);return n}}function Fc(s,t,e,n,i,o){const r=t*(n+1)+e,a=r+n+1;i!==o?s.push(r,r+1,a,r+1,a+1,a):s.push(r,a,r+1,r+1,a,a+1)}function Yo(s,t){const e=s.length,n=s.map((v,p)=>t(v,p)),i=n[0].length-1;let o=0;const r=[0];for(let v=1;v<e;v++)o+=Math.abs(s[v].x-s[v-1].x),r.push(o);const a=r.map(v=>v/Math.max(o,1e-6)),l=new Float32Array(e*(i+1)*3),c=new Float32Array(e*(i+1)*2),h=[0,0];for(let v=0;v<e;v++)for(let p=0;p<=i;p++){mo(s[v],n[v][p],h);const m=v*(i+1)+p;l[m*3]=s[v].x,l[m*3+1]=h[0],l[m*3+2]=h[1],c[m*2]=a[v],c[m*2+1]=n[v][p]}const d=s[e-1].x>=s[0].x,u=new oe;u.setAttribute("position",new ye(l,3));const g=[];for(let v=0;v<e-1;v++)for(let p=0;p<i;p++)Fc(g,v,p,i,d,!1);u.setIndex(g),u.computeVertexNormals();const f=u.getAttribute("normal").array;for(let v=0;v<e;v++){const p=v*(i+1),m=p+i;let _=f[p*3]+f[m*3],w=f[p*3+1]+f[m*3+1],x=f[p*3+2]+f[m*3+2];const A=Math.hypot(_,w,x)||1;_/=A,w/=A,x/=A,f[p*3]=_,f[p*3+1]=w,f[p*3+2]=x,f[m*3]=_,f[m*3+1]=w,f[m*3+2]=x}return{sections:s,R:i,t:n,u:a,pos:l,uv:c,normal:f,forwardX:d}}function $o(s,t={}){const e=s.sections.length,n=s.R,i=t.i0??0,o=t.i1??e-1,r=!!t.flip,a=Array.from(s.pos),l=Array.from(s.uv),c=Array.from(s.normal);if(r)for(let g=0;g<c.length;g++)c[g]=-c[g];const h=[];for(let g=i;g<o;g++)for(let f=0;f<n;f++)(!t.quad||t.quad(g,f))&&Fc(h,g,f,n,s.forwardX,r);const d=(g,f)=>{const v=s.sections[g],p=s.sections[f?Math.min(g+1,e-1):Math.max(g-1,0)];let m=Math.sign(v.x-p.x)||(f?-1:1);r&&(m=-m);const _=a.length/3;a.push(v.x,v.yc,0),c.push(m,0,0),l.push(s.u[g],.5);for(let w=0;w<=n;w++){const x=g*(n+1)+w;a.push(s.pos[x*3],s.pos[x*3+1],s.pos[x*3+2]),c.push(m,0,0),l.push(s.uv[x*2],s.uv[x*2+1])}for(let w=0;w<n;w++)m>0?h.push(_,_+1+w,_+2+w):h.push(_,_+2+w,_+1+w)};t.capStart&&d(i,!0),t.capEnd&&d(o,!1);const u=new oe;return u.setAttribute("position",new yt(a,3)),u.setAttribute("normal",new yt(c,3)),u.setAttribute("uv",new yt(l,2)),u.setIndex(h),u}function z0(s,t,e,n){return e<s.i0||e>=s.i1?!1:n>=s.j0&&n<s.j1||n+t>=s.j0&&n+t<s.j1}function N0(s,t,e){const n=s.R,{i0:i,i1:o,j0:r,j1:a}=e,l=A=>A>n?A-n:A,c=[];for(let A=r;A<a;A++)c.push([i,l(A)]);for(let A=i;A<o;A++)c.push([A,l(a)]);for(let A=a;A>r;A--)c.push([o,l(A)]);for(let A=o;A>i;A--)c.push([A,l(r)]);const h=(A,M,S)=>{const E=(M*(n+1)+S)*3;return new C(A.pos[E],A.pos[E+1],A.pos[E+2])},d=new C;for(const[A,M]of c)d.add(h(s,A,M));d.multiplyScalar(1/c.length);const u=[],g=[],f=[],v=(A,M,S,E)=>{for(const y of[A,M,S])u.push(y.x,y.y,y.z),g.push(E.x,E.y,E.z),f.push(0,0)},p=new C,m=new C,_=new C,w=new C;for(let A=0;A<c.length;A++){const[M,S]=c[A],[E,y]=c[(A+1)%c.length],b=h(s,M,S),T=h(s,E,y),U=h(t,M,S),O=h(t,E,y);p.subVectors(T,b),m.subVectors(U,b),_.crossVectors(p,m).normalize(),w.addVectors(b,T).multiplyScalar(.5).sub(d).negate(),_.dot(w)>=0?(v(b,T,U,_),v(T,O,U,_)):(_.negate(),v(b,U,T,_),v(T,U,O,_))}const x=new oe;return x.setAttribute("position",new yt(u,3)),x.setAttribute("normal",new yt(g,3)),x.setAttribute("uv",new yt(f,2)),x}function U0(s,t,e,n=!1){const i=s.R,o=w=>w>i?w-i:w,r=t.i1-t.i0,a=t.j1-t.j0,l=(w,x)=>{const A=(w*(i+1)+o(x))*3;return[s.pos[A],s.pos[A+1],s.pos[A+2]]},c=(w,x)=>Math.hypot(w[0]-x[0],w[1]-x[1],w[2]-x[2]),h=(w,x,A)=>{let M=0,S=0;if(A)for(let E=0;E<r;E++){const y=c(l(t.i0+E,t.j0+x),l(t.i0+E+1,t.j0+x));E<w&&(M+=y),S+=y}else for(let E=0;E<a;E++){const y=c(l(t.i0+w,t.j0+E),l(t.i0+w,t.j0+E+1));E<x&&(M+=y),S+=y}return[M,S]};let d=0,u=0;for(let w=0;w<=a;w++)d+=h(0,w,!0)[1]/(a+1);for(let w=0;w<=r;w++)u+=h(w,0,!1)[1]/(r+1);const g=[],f=[],v=[],p=[],m=[];for(let w=0;w<=r;w++)for(let x=0;x<=a;x++){const A=t.i0+w,M=o(t.j0+x),S=A*(i+1)+M;g.push(s.pos[S*3],s.pos[S*3+1],s.pos[S*3+2]);const E=e?-1:1;f.push(s.normal[S*3]*E,s.normal[S*3+1]*E,s.normal[S*3+2]*E);const[y,b]=h(w,x,!0),[T,U]=h(w,x,!1);v.push(y/Math.max(b,1e-6),T/Math.max(U,1e-6)),p.push(d,u,n?1:0,e?1:0)}for(let w=0;w<r;w++)for(let x=0;x<a;x++){const A=w*(a+1)+x,M=A+a+1;s.forwardX!==e?m.push(A,A+1,M,A+1,M+1,M):m.push(A,M,A+1,A+1,M,M+1)}const _=new oe;return _.setAttribute("position",new yt(g,3)),_.setAttribute("normal",new yt(f,3)),_.setAttribute("uv",new yt(v,2)),_.setAttribute("aPane",new yt(p,4)),_.setIndex(m),_}function L_(s,t,e,n,i,o,r,a=8){const l=m=>Math.max(ra(ei(s,m),t)-i,.02),c=[],h=[],d=[],u=[],g=[];for(let m=0;m<=7;m++){const _=Math.PI*1.5-m/7*Math.PI;g.push({x:e+Math.cos(_)*o,y:t-o+Math.sin(_)*o,nx:Math.cos(_),ny:Math.sin(_),v:m/7*.3})}for(let m=1;m<=a;m++)g.push({x:e+(n-e)*(m/a),y:t,nx:0,ny:1,v:.3+.7*(m/a)});const v=10;for(const m of g){const _=l(Math.max(m.x,e));for(let w=0;w<=v;w++){const x=-_+2*_*(w/v);c.push(m.x,m.y,x),h.push(m.nx,m.ny,0),d.push(r.u0+(r.u1-r.u0)*(w/v),r.v1+(r.v0-r.v1)*m.v)}}for(let m=0;m<g.length-1;m++)for(let _=0;_<v;_++){const w=m*(v+1)+_,x=w+v+1;u.push(w,w+1,x,w+1,x+1,x)}const p=new oe;return p.setAttribute("position",new yt(c,3)),p.setAttribute("normal",new yt(h,3)),p.setAttribute("uv",new yt(d,2)),p.setIndex(u),p}function D_(s,t,e,n,i){const o=t.clone().sub(s).normalize(),r=i.clone().addScaledVector(o,-i.dot(o)).normalize(),a=new C().crossVectors(o,r).normalize(),l=new Ht(e,s.distanceTo(t),n),c=new jt().makeBasis(a,o,r).setPosition(s.clone().add(t).multiplyScalar(.5));return l.applyMatrix4(c),l}function dl(s,t,e){const n=new Bi(s,t),i=n.getAttribute("uv");for(let o=0;o<i.count;o++)i.setXY(o,e.u0+(e.u1-e.u0)*i.getX(o),e.v0+(e.v1-e.v0)*i.getY(o));return n}function I_(s,t,e,n,i,o=8){const r=Math.min(e,n),a=Math.max(e,n),l=[],c=[],h=[],d=g=>Math.max(ra(ei(s,g),t)-i,.02);for(let g=0;g<o;g++){const f=r+(a-r)*(g/o),v=r+(a-r)*((g+1)/o),p=d(f),m=d(v),_=[[f,-p],[v,m],[v,-m],[f,-p],[f,p],[v,m]];for(const[w,x]of _)l.push(w,t,x),c.push(0,1,0),h.push((w-r)/(a-r),x*.5+.5)}const u=new oe;return u.setAttribute("position",new yt(l,3)),u.setAttribute("normal",new yt(c,3)),u.setAttribute("uv",new yt(h,2)),u}function z_(s,t,e,n=16,i=6){const o=s.length,r=n/2,a=n+i,l=[];for(let _=0;_<=r;_++)l.push(_/r);for(let _=1;_<=i;_++)l.push(1-2*(_/i));for(let _=1;_<=r;_++)l.push(-1+_/r);const c=_=>_<=r||_>=r+i,h=[],d=[],u=[];let g=0;for(let _=1;_<o;_++)g+=Math.abs(s[_].x-s[_-1].x);let f=0;for(let _=0;_<o;_++){const w=s[_];_>0&&(f+=Math.abs(w.x-s[_-1].x));for(let x=0;x<=a;x++){const A=l[x]*w.w;h.push(w.x,c(x)?t(w.x,A):e(w.x,A),A),d.push(f/Math.max(g,1e-6),x/a)}}for(let _=0;_<o-1;_++)for(let w=0;w<a;w++)Fc(u,_,w,a,!1,!1);const v=(_,w)=>{const x=h.length/3;let A=0;for(let M=0;M<a;M++)A+=h[(_*(a+1)+M)*3+1];h.push(s[_].x,A/a,0),d.push(_===0?0:1,.5);for(let M=0;M<=a;M++){const S=_*(a+1)+M;h.push(h[S*3],h[S*3+1],h[S*3+2]),d.push(d[S*2],d[S*2+1])}for(let M=0;M<a;M++)w>0?u.push(x,x+1+M,x+2+M):u.push(x,x+2+M,x+1+M)};v(0,1),v(o-1,-1);const p=new oe;p.setAttribute("position",new yt(h,3)),p.setAttribute("uv",new yt(d,2)),p.setIndex(u),p.computeVertexNormals();const m=p.getAttribute("normal");for(let _=0;_<o;_++){const w=_*(a+1),x=w+a,A=new C(m.getX(w)+m.getX(x),m.getY(w)+m.getY(x),m.getZ(w)+m.getZ(x)).normalize();m.setXYZ(w,A.x,A.y,A.z),m.setXYZ(x,A.x,A.y,A.z)}return p}function N_(s,t=28,e=!0){const n=Yo(s,()=>R_(t));return $o(n,{capStart:e,capEnd:e})}function aa(s,t){return 5*t*(.2969*Math.sqrt(s)-.126*s-.3516*s*s+.2843*s**3-.1036*s**4)}function er(s,t){return t*Math.sin(Math.PI*s)}function Ts(s,t){return s.rootChord+(s.tipChord-s.rootChord)*(t/s.span)}function go(s,t){return .3*Ts(s,t)+s.sweep*(t/s.span)}function fl(s,t){return go(s,t)-Ts(s,t)}function F0(s,t,e){const n=Ts(s,e),i=Vn.clamp((go(s,e)-t)/n,0,1);return Math.tan(s.dihedral)*e+(er(i,s.camber)-aa(i,s.thickness))*n}function U_(s,t,e){const n=Ts(s,e),i=Vn.clamp((go(s,e)-t)/n,0,1);return Math.tan(s.dihedral)*e+(er(i,s.camber)+aa(i,s.thickness))*n}function O0(s,t,e,n,i){const o=h=>({x:h,y:er(h,n)+aa(h,e),u:.5-.5*h}),r=h=>({x:h,y:er(h,n)-aa(h,e),u:.5+.5*h}),a=[];if(s==="rear"){const h={x:1,y:er(1,n),u:0};a.push(h);for(let d=1;d<i;d++)a.push(o(t+(1-t)*(1-d/i)));a.push(o(t),{...o(t),flat:!0}),a.push({...r(t),flat:!0},r(t));for(let d=1;d<i;d++)a.push(r(t+(1-t)*(d/i)));return a.push({...h,u:1}),a}const l=s==="front"?t:1,c=h=>l*Math.pow(1-h/i,2);a.push(o(l)),s==="front"&&a.push(o(l));for(let h=1;h<=i;h++)a.push(o(c(h)));for(let h=i-1;h>=1;h--)a.push(r(c(h)));return a.push(r(l)),s==="front"&&a.push({...r(l),flat:!0}),a.push({...o(l),u:s==="front"?.5-.5*l:1,flat:s==="front"}),a}const pl=.22;function zn(s,t){const e=s.camber??.02,n=t.n??12,i=[],o=[],r=[],a=[],l=[];for(let f=0;f<=t.segments;f++)l.push({z:t.z0+(t.z1-t.z0)*(f/t.segments),scale:1});if(t.tipRound&&t.tipRound>0)for(let v=1;v<=6;v++){const p=v/6*Math.PI/2;l.push({z:t.z1+t.tipRound*Math.sin(p),scale:Math.max(Math.cos(p),.02)})}const c=f=>{const v=Ts(s,f),p=go(s,f);return t.hingeX!==void 0?(p-t.hingeX)/v:.75};let h=0;const d=(f,v,p,m,_)=>{const w=Ts(s,p),x=go(s,p),A=s.twist*(p/s.span),M=.5+(f.x-.5)*m,S=f.y*m,E=(M-.3)*w,y=S*w,b=Math.cos(A),T=Math.sin(A),U=E*b+y*T,O=-E*T+y*b;_.push(-U+(x-.3*w),Math.tan(s.dihedral)*v+O,v)};for(const f of l){const v=Math.min(f.z,t.z1),p=Ts(s,v),m=c(v),_=O0(t.part,t.part==="rear"?m+(t.gap??.015)/p:m,s.thickness,e,n);h=_.length;for(const w of _){d(w,f.z,v,f.scale,i);const x=Math.min(1,f.z/s.span);w.flat?(o.push(.02,x),a.push(pl,pl,pl)):(o.push(w.u,x),a.push(1,1,1))}}for(let f=0;f<l.length-1;f++)for(let v=0;v<h-1;v++){const p=f*h+v,m=p+h;r.push(p,m,p+1,p+1,m,m+1)}const u=(f,v,p)=>{const m=c(f),_=O0(v,m,s.thickness,e,n),w=i.length/3,x=[];for(const E of _)d(E,f,f,1,x);let A=0,M=0;const S=_.length-1;for(let E=0;E<S;E++)A+=x[E*3],M+=x[E*3+1];i.push(A/S,M/S,f),o.push(.5,Math.min(1,f/s.span)),a.push(1,1,1);for(let E=0;E<S;E++)i.push(x[E*3],x[E*3+1],x[E*3+2]),o.push(_[E].u,Math.min(1,f/s.span)),a.push(1,1,1);for(let E=0;E<S;E++){const y=w+1+E,b=w+1+(E+1)%S;p?r.push(w,b,y):r.push(w,y,b)}};t.capStart&&u(t.z0,t.capStart,!1),t.capEnd&&u(t.z1,t.capEnd,!0);const g=new oe;return g.setAttribute("position",new yt(i,3)),g.setAttribute("uv",new yt(o,2)),g.setAttribute("color",new yt(a,3)),g.setIndex(r),g.computeVertexNormals(),g}function F_(s,t,e){const o=[],r=[],a=[];for(let c=0;c<=10;c++){const h=c/10,d=h*s,u=t+(e-t)*Math.pow(h,1.4),g=u*(.16-.08*h),f=.95-.7*h,v=Math.cos(f),p=Math.sin(f);for(let m=0;m<8;m++){const _=m/8*Math.PI*2,w=-.5*Math.cos(_),x=Math.sin(_)>=0,A=.08*u*(1-4*w*w),M=.5*g*Math.sqrt(Math.max(0,1-4*w*w))*Math.abs(Math.sin(_)),S=w*u,E=A+(x?M:-M);o.push(S*v-E*p,d,S*p+E*v),a.push(m/8,h)}}for(let c=0;c<10;c++)for(let h=0;h<8;h++){const d=(h+1)%8,u=c*8+h,g=u+8,f=c*8+d,v=f+8;r.push(u,g,f,f,g,v)}const l=new oe;return l.setAttribute("position",new yt(o,3)),l.setAttribute("uv",new yt(a,2)),l.setIndex(r),l.computeVertexNormals(),l}function Zu(s,t){const e=new Be().setFromUnitVectors(new C(0,1,0),t.clone().sub(s).normalize());return new jt().compose(s.clone().add(t).multiplyScalar(.5),e,new C(1,1,1))}function Ci(s,t,e,n=8){const i=new Me(e,e,s.distanceTo(t),n);return i.applyMatrix4(Zu(s,t)),i}function $s(s,t,e,n){const i=new Me(.5,.5,s.distanceTo(t),10);return i.scale(e,1,n),i.applyMatrix4(Zu(s,t)),i}function O_(s,t,e){const n=s instanceof C?s:new C(...s??[0,0,0]),i=t instanceof Oe?t:new Oe(...t??[0,0,0]),o=typeof e=="number"?new C(e,e,e):e instanceof C?e:new C(...e??[1,1,1]);return new jt().compose(n,new Be().setFromEuler(i),o)}function k_(s){const t=s.clone();if(t.index)return t;const e=t.getAttribute("position").count,n=new Uint32Array(e);for(let i=0;i<e;i++)n[i]=i;return t.setIndex(new ye(n,1)),t}function B_(s,t){const e=k_(s);if(!t)return e;if(e.applyMatrix4(t),t.determinant()<0){const n=e.index;for(let i=0;i<n.count;i+=3){const o=n.getX(i+1),r=n.getX(i+2);n.setX(i+1,r),n.setX(i+2,o)}}return e}function H_(s,t){const e=s.getAttribute("position"),n=e.count,i=new Float32Array(n*3),o=new Float32Array(n*2),r=new Gt;let a=null;for(let l=0;l<n;l++){const c=typeof t=="function"?t(e.getX(l),e.getY(l),e.getZ(l)):t;c!==a&&(r.set(c.color),a=c),i[l*3]=r.r,i[l*3+1]=r.g,i[l*3+2]=r.b,o[l*2]=c.roughness,o[l*2+1]=c.metalness}return s.setAttribute("color",new ye(i,3)),s.setAttribute("aSurf",new ye(o,2)),s}function G_(){const s=new ce({color:16777215,roughness:1,metalness:1,vertexColors:!0});return s.onBeforeCompile=t=>{t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aSurf;
varying vec2 vSurf;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vSurf = aSurf;`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vSurf;`).replace("#include <roughnessmap_fragment>","float roughnessFactor = roughness * vSurf.x;").replace("#include <metalnessmap_fragment>","float metalnessFactor = metalness * vSurf.y;")},s.customProgramCacheKey=()=>"plane-parts-v1",s}class Sn{constructor(t){this.defaultSurf=t}parts=[];add(t,e,n=this.defaultSurf){const i=B_(t,e);return n&&H_(i,n),this.parts.push(i),this}get size(){return this.parts.length}build(){if(this.parts.length===1)return this.parts[0];const t=Ks(this.parts,!1);if(!t)throw new Error("Batch: parts have incompatible attributes");return t}}function fn(s,t){const e=document.createElement("canvas");return e.width=s,e.height=t,[e,e.getContext("2d")]}function Ln(s,t,e=8){const n=new cr(s);return n.flipY=!1,n.colorSpace=t?Pn:fi,n.wrapS=lo,n.wrapT=lo,n.anisotropy=e,n}function Oc(s,t=2){const e=s.width,n=s.height,i=s.getContext("2d").getImageData(0,0,e,n).data,[o,r]=fn(e,n),a=r.createImageData(e,n),l=(c,h)=>i[((h+n)%n*e+(c+e)%e)*4]/255;for(let c=0;c<n;c++)for(let h=0;h<e;h++){const d=(l(h+1,c)-l(h-1,c))*t,u=(l(h,c+1)-l(h,c-1))*t,g=Math.hypot(d,u,1),f=(c*e+h)*4;a.data[f]=Math.round((-d/g*.5+.5)*255),a.data[f+1]=Math.round((-u/g*.5+.5)*255),a.data[f+2]=Math.round((1/g*.5+.5)*255),a.data[f+3]=255}return r.putImageData(a,0,0),o}function vo(s,t,e,n,i,o,r="40,35,30"){for(let a=0;a<i;a++){const l=t.range(0,e),c=t.range(0,n),h=t.range(8,60),d=s.createRadialGradient(l,c,0,l,c,h);d.addColorStop(0,`rgba(${r},${o*t.range(.4,1)})`),d.addColorStop(1,`rgba(${r},0)`),s.fillStyle=d,s.fillRect(l-h,c-h,h*2,h*2)}}function kc(s,t,e,n,i,o,r){s.strokeStyle="#5a5a5a",s.lineWidth=2.2,t.strokeStyle="rgba(30,30,35,0.22)",t.lineWidth=1.5;for(const a of i){const l=a*e;s.beginPath(),s.moveTo(l,0),s.lineTo(l,n),s.stroke(),t.save(),t.strokeStyle="rgba(40,38,34,0.07)",t.lineWidth=9,t.beginPath(),t.moveTo(l,0),t.lineTo(l,n),t.stroke(),t.restore(),t.beginPath(),t.moveTo(l,0),t.lineTo(l,n),t.stroke();for(const c of[-7,7])for(let h=r/2;h<n;h+=r)s.fillStyle="#b8b8b8",s.beginPath(),s.arc(l+c,h,1.6,0,Math.PI*2),s.fill(),t.fillStyle="rgba(255,255,255,0.10)",t.beginPath(),t.arc(l+c,h,1.4,0,Math.PI*2),t.fill(),t.fillStyle="rgba(0,0,0,0.10)",t.beginPath(),t.arc(l+c,h+1.2,1.2,0,Math.PI*2),t.fill()}for(const a of o){const l=a*n;s.strokeStyle="#6a6a6a",s.lineWidth=1.4,s.beginPath(),s.moveTo(0,l),s.lineTo(e,l),s.stroke(),t.strokeStyle="rgba(30,30,35,0.12)",t.beginPath(),t.moveTo(0,l),t.lineTo(e,l),t.stroke();for(let c=r/2;c<e;c+=r)s.fillStyle="#b0b0b0",s.beginPath(),s.arc(c,l+5,1.5,0,Math.PI*2),s.fill(),t.fillStyle="rgba(0,0,0,0.08)",t.beginPath(),t.arc(c,l+6,1.2,0,Math.PI*2),t.fill()}}const bn={upper:"#f3f1ea",under:"#e3d9c2",lower:"#f5cc5a",cheat:"#1c2d5a",pin:"#d8322e",registration:"N726BV"},so={top:.03,bottom:.1,pin:.125};function k0(s,t,e,n,i,o,r,a,l,c,h){const d=e/t.length,u=n/t.perimeter(o),g=t.vOf(o,r)??.25,f=a/.72*d;for(const v of[1,-1])s.save(),s.translate(t.uOf(o)*e,(v>0?g:1-g)*n),s.scale(v>0?-1:1,v*(u/d)),s.fillStyle=h,s.font=`${l} ${f.toFixed(1)}px ${c}`,s.textAlign="center",s.textBaseline="middle",s.fillText(i,0,0),s.restore()}function V_(s){const n=new We("fuselage-paint"),[i,o]=fn(2048,1024),[r,a]=fn(2048,1024),[l,c]=fn(2048,1024);a.fillStyle="#808080",a.fillRect(0,0,2048,1024),o.fillStyle=bn.upper,o.fillRect(0,0,2048,1024);const h=[],d=(E,y)=>s.vOf(E,y)??.5;for(let E=0;E<=2048;E+=8){const y=s.xOf(E/2048),b=s.sillY(y);h.push({px:E,cheatTop:d(y,b-so.top),cheatBot:d(y,b-so.bottom),pinBot:d(y,b-so.pin)})}const u=(E,y,b,T)=>{const U=O=>(T>0?O:1-O)*1024;o.beginPath(),o.moveTo(h[0].px,U(E(h[0])));for(const O of h)o.lineTo(O.px,U(E(O)));for(let O=h.length-1;O>=0;O--)o.lineTo(h[O].px,U(y(h[O])));o.closePath(),o.fillStyle=b,o.fill()};u(E=>E.pinBot,E=>1-E.pinBot,bn.lower,1);for(const E of[1,-1])u(y=>y.cheatTop,y=>y.cheatBot,bn.cheat,E),u(y=>y.cheatBot,y=>y.pinBot,bn.pin,E);const g=[];for(let E=2.32;E<=3.7;E+=.1)g.push([s.uOf(E)*2048,s.topV(E,E>3.4?.45-(E-3.4)*.9:.45)*1024]);o.fillStyle="#2a2d31";for(const E of[1,-1]){const y=E>0?0:1024;o.beginPath(),o.moveTo(g[0][0],y);for(const[b,T]of g)o.lineTo(b,E>0?T:1024-T);o.lineTo(g[g.length-1][0],y),o.closePath(),o.fill()}const f=s.uOf(4.22)*2048;o.fillStyle="#2e3136",o.fillRect(0,0,f,1024),o.fillStyle="#9aa0a6",o.fillRect(f-6,0,6,1024),o.fillStyle="#1b1d20";for(let E=0;E<12;E++)o.fillRect(f*.45,E/12*1024+6,f*.15,1024/12-12);k0(o,s,2048,1024,bn.registration,-3.05,.47,.18,"bold",'"Helvetica Neue", Arial, sans-serif',bn.cheat),k0(o,s,2048,1024,"BAHÍA VISTA AIR TAXI",-.25,.1,.085,"bold italic",'Georgia, "Times New Roman", serif',bn.cheat);const v=[3.9,3.2,2.32,1.85,0,-.9,-1.6,-2.6,-3.7,-4.7].map(E=>s.uOf(E));kc(a,o,2048,1024,v,[.12,.2,.3,.42,.5,.58,.7,.8,.88],26),a.strokeStyle="#3a3a3a",a.lineWidth=3,o.strokeStyle="rgba(20,20,25,0.35)",o.lineWidth=2;const p=s.uOf(1.77)*2048,m=s.uOf(.95)*2048;for(const E of[1,-1]){const y=s.vOf(1.3,.4)??.2,b=s.vOf(1.3,-.42)??.4,T=(E>0?y:1-y)*1024,U=(E>0?b:1-b)*1024,O=Math.min(T,U),z=Math.abs(U-T);a.strokeRect(p,O,m-p,z),o.strokeRect(p,O,m-p,z);const B=s.vOf(1,.05)??.25;o.fillStyle="#8a8f94",o.fillRect(m-40,(E>0?B:1-B)*1024-4,22,8)}const _=s.uOf(2.75),w=d(2.75,-.5),x=s.uOf(-.9),A=(E,y,b)=>{const T=E.createLinearGradient(_*2048,0,x*2048,0);T.addColorStop(0,`rgba(${y},${b})`),T.addColorStop(.3,`rgba(${y},${b*.5})`),T.addColorStop(1,`rgba(${y},0)`),E.fillStyle=T,E.beginPath(),E.moveTo(_*2048,(w-.018)*1024),E.lineTo(x*2048,(w-.05)*1024),E.lineTo(x*2048,(w+.05)*1024),E.lineTo(_*2048,(w+.018)*1024),E.closePath(),E.fill()};A(o,"25,22,20",.5);for(let E=0;E<16;E++){const y=s.uOf(n.range(3,4))*2048,b=(.5+n.range(-.06,.06))*1024,T=n.range(40,150),U=o.createLinearGradient(y,0,y+T,0);U.addColorStop(0,`rgba(35,30,22,${n.range(.14,.32)})`),U.addColorStop(1,"rgba(35,30,22,0)"),o.fillStyle=U,o.fillRect(y,b-n.range(1,2),T,n.range(2,4))}vo(o,n,2048,1024,140,.08);for(let E=0;E<60;E++){const y=n.range(204.8,1843.2),b=n.range(1024*.42,1024*.58);o.strokeStyle=`rgba(40,35,30,${n.range(.05,.2)})`,o.lineWidth=n.range(1,3),o.beginPath(),o.moveTo(y,b),o.lineTo(y+n.range(30,160),b+n.range(-3,3)),o.stroke()}o.fillStyle="rgba(255,255,255,0.05)",o.fillRect(0,0,2048,1024*.12),o.fillRect(0,1024*.88,2048,1024*.12),c.fillStyle="#5a5a5a",c.fillRect(0,0,2048,1024),c.fillStyle="#7a7a7a",c.fillRect(0,0,f,1024),A(c,"170,170,170",.7),vo(c,n,2048,1024,160,.25,"150,150,150");for(let E=0;E<400;E++){c.strokeStyle=`rgba(120,120,120,${n.range(.2,.5)})`,c.lineWidth=1;const y=n.range(0,2048),b=n.range(0,1024);c.beginPath(),c.moveTo(y,b),c.lineTo(y+n.range(-40,40),b+n.range(-6,6)),c.stroke()}const[M,S]=fn(2048/4,1024/4);S.scale(.25,.25),S.fillStyle="rgb(0,34,0)",S.fillRect(0,0,2048,1024),S.fillStyle="rgb(0,16,0)",S.fillRect(0,0,s.uOf(3.15)*2048,1024),S.fillStyle="rgb(0,120,0)";for(const E of[1,-1]){const y=E>0?0:1024;S.beginPath(),S.moveTo(g[0][0],y);for(const[b,T]of g)S.lineTo(b,E>0?T:1024-T);S.lineTo(g[g.length-1][0],y),S.closePath(),S.fill()}return A(S,"0,110,0",.8),{map:Ln(i,!0),roughnessMap:Ln(l,!1),normalMap:Ln(Oc(r,2.4),!1),clearcoatRoughnessMap:Ln(M,!1)}}function W_(){const e=new We("wing-paint"),[n,i]=fn(1024,1024),[o,r]=fn(1024,1024),[a,l]=fn(1024,1024);r.fillStyle="#808080",r.fillRect(0,0,1024,1024),i.fillStyle=bn.upper,i.fillRect(0,0,1024,1024),i.fillStyle=bn.under,i.fillRect(1024*.5,0,1024*.5,1024),i.fillStyle=bn.lower,i.fillRect(0,1024*.905,1024,1024*.095),i.fillStyle=bn.cheat,i.fillRect(0,1024*.885,1024,1024*.02),i.fillStyle=bn.pin,i.fillRect(0,1024*.876,1024,1024*.009),i.fillStyle=bn.lower,i.fillRect(1024*.475,0,1024*.0325,1024);const c=[];for(let h=.04;h<.87;h+=.075)c.push(h);kc(r,i,1024,1024,[.14,.33,.5,.67,.86],c,22),i.fillStyle="#2a2d31",i.fillRect(1024*.3,1024*.12,1024*.11,1024*.08),i.fillStyle="#6d7277",i.beginPath(),i.arc(1024*.4,1024*.27,9,0,7),i.fill();for(let h=0;h<90;h++)i.fillStyle=`rgba(90,90,95,${e.range(.3,.7)})`,i.fillRect(1024*.5+e.range(-8,8),e.range(0,1024),e.range(1,3),e.range(1,4));return vo(i,e,1024,1024,80,.06),l.fillStyle="#5a5a5a",l.fillRect(0,0,1024,1024),l.fillStyle="#909090",l.fillRect(1024*.3,1024*.12,1024*.11,1024*.08),vo(l,e,1024,1024,90,.2,"150,150,150"),{map:Ln(n,!0),roughnessMap:Ln(a,!1),normalMap:Ln(Oc(o,2),!1)}}function X_(){const e=new We("float-paint"),[n,i]=fn(1024,512),[o,r]=fn(1024,512),[a,l]=fn(1024,512);r.fillStyle="#808080",r.fillRect(0,0,1024,512),i.fillStyle="#cfd3d6",i.fillRect(0,0,1024,512),i.fillStyle="#2b2e31",i.fillRect(0,0,1024,512*.09),i.fillRect(0,512*.91,1024,512*.09),i.fillStyle=bn.cheat,i.fillRect(0,512*.3,1024,512*.03),i.fillRect(0,512*.67,1024,512*.03),i.fillStyle=bn.lower,i.fillRect(0,512*.42,1024,512*.16),kc(r,i,1024,512,[.12,.25,.38,.5,.55,.68,.82,.93],[.09,.3,.5,.7,.91],20);for(let c=0;c<120;c++){i.strokeStyle=`rgba(70,85,75,${e.range(.08,.28)})`,i.lineWidth=e.range(1,4);const h=e.range(0,1024),d=e.range(512*.28,512*.72);i.beginPath(),i.moveTo(h,d),i.lineTo(h+e.range(-10,10),d+e.range(10,60)*(d<512/2?1:-1)),i.stroke()}return vo(i,e,1024,512,100,.1,"60,60,55"),l.fillStyle="#6a6a6a",l.fillRect(0,0,1024,512),l.fillStyle="#c0c0c0",l.fillRect(0,0,1024,512*.09),l.fillRect(0,512*.91,1024,512*.09),vo(l,e,1024,512,100,.25,"160,160,160"),{map:Ln(n,!0),roughnessMap:Ln(a,!1),normalMap:Ln(Oc(o,2.2),!1)}}const tn={W:1.3,H:.4,PPM:1500,GRAIN:120,PLACARDS:90},pi={w:Math.round(tn.W*tn.PPM),face:Math.round(tn.H*tn.PPM)},ys=pi.face+tn.GRAIN+tn.PLACARDS,uc={asi:{x:-.435,y:.112,r:.042},adi:{x:-.335,y:.112,r:.042},alt:{x:-.235,y:.112,r:.042},tc:{x:-.435,y:.012,r:.042},hdg:{x:-.335,y:.012,r:.042},vsi:{x:-.235,y:.012,r:.042},clock:{x:-.565,y:.125,r:.03},suction:{x:-.565,y:.04,r:.026},rpm:{x:.375,y:.118,r:.036},map:{x:.47,y:.118,r:.036},oilp:{x:.34,y:.03,r:.024},oilt:{x:.405,y:.03,r:.024},fuell:{x:.47,y:.03,r:.024},fuelr:{x:.535,y:.03,r:.024},egt:{x:.36,y:-.04,r:.022},amp:{x:.42,y:-.04,r:.022},cht:{x:.48,y:-.04,r:.022}},di={x:.085,y:.098,w:.2,h:.135};function B0(s,t){if(s<=t[0][0])return t[0][1];for(let e=1;e<t.length;e++)if(s<=t[e][0]){const[n,i]=t[e-1],[o,r]=t[e];return i+(r-i)*((s-n)/(o-n))}return t[t.length-1][1]}const ml=s=>Math.min(1,Math.max(0,s)),ze={asi:s=>B0(s,[[0,0],[40,30],[60,72],[80,117],[100,162],[120,207],[140,250],[160,287],[180,318],[200,342]]),alt100:s=>(s%1e3+1e3)%1e3*.36,alt1000:s=>(s%1e4+1e4)%1e4*.036,vsi:s=>270+Math.sign(s)*B0(Math.abs(s),[[0,0],[500,52],[1e3,92],[1500,126],[2e3,158]]),rpm:s=>-135+ml(s/3e3)*270,map:s=>-135+ml((s-10)/25)*270,small:s=>-120+ml(s)*240},Ce=s=>(s+tn.W/2)*tn.PPM,be=s=>(tn.H/2-s)*tn.PPM,Nn=s=>s*tn.PPM,Fi=s=>(s-90)*Math.PI/180,ji=(s,t,e,n)=>({u0:s/pi.w,v0:1-n/ys,u1:e/pi.w,v1:1-t/ys}),la=pi.face,$e=pi.face+tn.GRAIN,Zi={face:ji(0,0,pi.w,pi.face),grain:ji(0,la+4,pi.w,la+tn.GRAIN-4),exit:ji(4,$e+6,224,$e+84),belts:ji(234,$e+6,494,$e+84),compass:ji(504,$e+6,664,$e+84),yoke:ji(674,$e+6,794,$e+84),nameplate:ji(804,$e+6,1164,$e+84),domeLens:ji(1174,$e+6,1254,$e+84)};function Ri(s,t,e,n,i=!0){const o=s.createLinearGradient(t,e-n*1.18,t,e+n*1.18);o.addColorStop(0,"#6c7178"),o.addColorStop(.5,"#3a3e44"),o.addColorStop(1,"#22252a"),s.fillStyle=o,s.beginPath(),s.arc(t,e,n*1.18,0,7),s.fill(),s.fillStyle="#0c0d10",s.beginPath(),s.arc(t,e,n*1.03,0,7),s.fill();const r=s.createRadialGradient(t,e,n*.9,t,e,n*1.03);if(r.addColorStop(0,"rgba(0,0,0,0)"),r.addColorStop(1,"rgba(0,0,0,0.7)"),s.fillStyle=r,s.beginPath(),s.arc(t,e,n*1.03,0,7),s.fill(),s.fillStyle="#07080a",s.beginPath(),s.arc(t,e,n,0,7),s.fill(),i)for(const a of[45,135,225,315])jo(s,t+Math.cos(Fi(a))*n*1.11,e+Math.sin(Fi(a))*n*1.11,n*.055)}function jo(s,t,e,n){const i=s.createRadialGradient(t-n*.3,e-n*.3,0,t,e,n);i.addColorStop(0,"#c9ccd1"),i.addColorStop(1,"#5a5e64"),s.fillStyle=i,s.beginPath(),s.arc(t,e,n,0,7),s.fill(),s.strokeStyle="#2a2c30",s.lineWidth=Math.max(1,n*.3),s.beginPath(),s.moveTo(t-n*.7,e),s.lineTo(t+n*.7,e),s.moveTo(t,e-n*.7),s.lineTo(t,e+n*.7),s.stroke()}function kn(s,t,e,n,i,o,r,a,l="#f2f2f2"){const c=Fi(i);s.strokeStyle=l,s.lineWidth=a,s.lineCap="butt",s.beginPath(),s.moveTo(t+Math.cos(c)*n*o,e+Math.sin(c)*n*o),s.lineTo(t+Math.cos(c)*n*r,e+Math.sin(c)*n*r),s.stroke()}function Ge(s,t,e,n,i,o,r,a,l="#f2f2f2",c="bold"){const h=Fi(i);s.fillStyle=l,s.font=`${c} ${Math.round(n*a)}px Arial`,s.textAlign="center",s.textBaseline="middle",s.fillText(r,t+Math.cos(h)*n*o,e+Math.sin(h)*n*o)}function Bo(s,t,e,n,i,o,r,a,l){s.strokeStyle=l,s.lineWidth=a,s.beginPath(),s.arc(t,e,n*r,Fi(i),Fi(o)),s.stroke()}function cn(s,t,e,n,i,o="#e4e4e4",r="bold",a="center"){s.fillStyle=o,s.font=`${r} ${i}px Arial`,s.textAlign=a,s.textBaseline="middle",s.fillText(n,t,e)}function Ki(s,t,e,n,i,o,r="#f0f0f0",a="#111214",l=0){s.fillStyle=a,s.fillRect(t,e,n,i),s.strokeStyle="rgba(255,255,255,0.35)",s.lineWidth=1.5,s.strokeRect(t+1,e+1,n-2,i-2);const c=l||Math.min(i/(o.length+.6),n/Math.max(...o.map(h=>h.length))*1.8);o.forEach((h,d)=>cn(s,t+n/2,e+i*((d+1)/(o.length+1)),h,c,r,"bold"))}function q_(s,t,e,n,i){s.fillStyle="#3a3e44",s.fillRect(t-13,e-22,26,44),s.fillStyle="#0e0f11",s.fillRect(t-10,e-19,20,38);const o=s.createLinearGradient(0,e-18,0,e+18);o.addColorStop(0,n?"#eceff2":"#8d9198"),o.addColorStop(1,n?"#a7abb1":"#d7dadf"),s.fillStyle=o,s.fillRect(t-8,e-(n?17:0),16,17),cn(s,t,e+32,i,9,"#e8e8e8")}function Y_(){const s=pi.w,t=pi.face,e=new We("panel-brush"),[n,i]=fn(s,ys);i.fillStyle="#25282c",i.fillRect(0,0,s,t);for(let f=0;f<9e3;f++)i.fillStyle=`rgba(${e.next()>.5?"255,255,255":"0,0,0"},${e.next()*.05})`,i.fillRect(e.next()*s,e.next()*t,2,2);const o=(f,v,p,m)=>{i.fillStyle="#2c2f34",i.fillRect(Ce(f),be(m),Ce(p)-Ce(f),be(v)-be(m)),i.strokeStyle="rgba(0,0,0,0.6)",i.lineWidth=3,i.strokeRect(Ce(f),be(m),Ce(p)-Ce(f),be(v)-be(m)),i.strokeStyle="rgba(255,255,255,0.12)",i.lineWidth=1.5,i.strokeRect(Ce(f)+3,be(m)+3,Ce(p)-Ce(f)-6,be(v)-be(m)-6);for(const[_,w]of[[f+.012,m-.012],[p-.012,m-.012],[f+.012,v+.012],[p-.012,v+.012]])jo(i,Ce(_),be(w),5)};o(-.6,-.045,-.175,.175),o(-.03,-.045,.2,.175),o(.29,-.075,.62,.175),o(-.63,-.19,.63,-.085);for(let f=-.62;f<=.63;f+=.125)jo(i,Ce(f),be(.188),5),jo(i,Ce(f),be(-.192),5);const r=uc,a=f=>[Ce(f.x),be(f.y),Nn(f.r)];{const[f,v,p]=a(r.asi);Ri(i,f,v,p),Bo(i,f,v,p,ze.asi(48),ze.asi(95),.9,p*.07,"#f4f4f4"),Bo(i,f,v,p,ze.asi(58),ze.asi(140),.8,p*.07,"#2fbf58"),Bo(i,f,v,p,ze.asi(140),ze.asi(180),.8,p*.07,"#f2c230"),kn(i,f,v,p,ze.asi(180),.72,.94,p*.06,"#e0322a");for(let m=40;m<=200;m+=10)kn(i,f,v,p,ze.asi(m),m%20?.68:.62,.76,m%20?p*.025:p*.04);for(let m=40;m<=200;m+=20)Ge(i,f,v,p,ze.asi(m),.47,String(m),.2);Ge(i,f,v,p,180,.22,"KNOTS",.1,"#d0d0d0","normal"),Ge(i,f,v,p,0,.28,"AIRSPEED",.1,"#d0d0d0","normal")}{const[f,v,p]=a(r.adi);Ri(i,f,v,p),i.fillStyle="#15171a",i.beginPath(),i.arc(f,v,p,0,7),i.fill()}{const[f,v,p]=a(r.alt);Ri(i,f,v,p);for(let m=0;m<50;m++)kn(i,f,v,p,m*7.2,m%5?.8:.72,.9,m%5?p*.025:p*.05);for(let m=0;m<10;m++)Ge(i,f,v,p,m*36,.58,String(m),.24);Ge(i,f,v,p,180,.3,"ALT",.12,"#d0d0d0","normal"),Ge(i,f,v,p,180,.42,"FEET",.09,"#d0d0d0","normal"),i.fillStyle="#0a0b0d",i.fillRect(f+p*.36,v-p*.1,p*.34,p*.2),cn(i,f+p*.53,v,"29.92",p*.13,"#e8e8e8","normal")}{const[f,v,p]=a(r.tc);Ri(i,f,v,p);for(const m of[-90,-70,70,90])kn(i,f,v,p,m,.74,.9,p*.05);Ge(i,f,v,p,180,.25,"TURN COORDINATOR",.085,"#d0d0d0","normal"),Ge(i,f,v,p,-70,.62,"L",.14),Ge(i,f,v,p,70,.62,"R",.14),Ge(i,f,v,p,180,.85,"2 MIN",.085,"#d0d0d0","normal"),i.strokeStyle="#d9dde3",i.lineWidth=p*.02,i.beginPath(),i.arc(f,v-p*.62,p*1.15,Math.PI*.36,Math.PI*.64),i.stroke(),i.strokeStyle="rgba(255,255,255,0.10)",i.lineWidth=p*.17,i.beginPath(),i.arc(f,v-p*.62,p*1.15,Math.PI*.36,Math.PI*.64),i.stroke(),i.strokeStyle="#e8e8e8",i.lineWidth=p*.025;for(const m of[-1,1])i.beginPath(),i.moveTo(f+m*p*.1,v+p*.44),i.lineTo(f+m*p*.1,v+p*.62),i.stroke()}{const[f,v,p]=a(r.hdg);Ri(i,f,v,p),i.fillStyle="#15171a",i.beginPath(),i.arc(f,v,p,0,7),i.fill();for(const m of[0,45,90,135,180,225,270,315])kn(i,f,v,p,m,.93,1,p*.04,m===0?"#ff9a2e":"#e8e8e8")}{const[f,v,p]=a(r.vsi);Ri(i,f,v,p);for(const m of[-1,1])for(let _=0;_<=2e3;_+=100)kn(i,f,v,p,ze.vsi(m*_),_%500?.78:.7,.88,_%500?p*.025:p*.05);for(const m of[-1,1])for(const _ of[500,1e3,1500,2e3])Ge(i,f,v,p,ze.vsi(m*_),.52,String(_/100),.2);Ge(i,f,v,p,270,.52,"0",.2),Ge(i,f,v,p,90,.3,"VERTICAL",.085,"#d0d0d0","normal"),Ge(i,f,v,p,90,.44,"SPEED",.085,"#d0d0d0","normal"),Ge(i,f,v,p,350,.22,"UP",.09,"#d0d0d0","normal"),Ge(i,f,v,p,190,.22,"DOWN",.09,"#d0d0d0","normal")}{const[f,v,p]=a(r.clock);Ri(i,f,v,p);for(let m=0;m<60;m++)kn(i,f,v,p,m*6,m%5?.84:.76,.92,m%5?p*.03:p*.06);for(let m=1;m<=12;m++)Ge(i,f,v,p,m*30,.6,String(m),.22);kn(i,f,v,p,315,0,.5,p*.07,"#f2f2f2"),kn(i,f,v,p,60,0,.72,p*.05,"#f2f2f2"),i.fillStyle="#f2f2f2",i.beginPath(),i.arc(f,v,p*.07,0,7),i.fill()}{const[f,v,p]=a(r.suction);Ri(i,f,v,p);for(let m=0;m<=10;m++)kn(i,f,v,p,ze.small(m/10),m%5?.8:.7,.9,m%5?p*.03:p*.06);Bo(i,f,v,p,ze.small(.45),ze.small(.6),.62,p*.08,"#2fbf58"),Ge(i,f,v,p,180,.45,"SUCTION",.12,"#d0d0d0","normal"),kn(i,f,v,p,ze.small(.52),-.15,.7,p*.06,"#f2f2f2")}const l=(f,v,p,m,_,w,x,A,M=!1)=>{const[S,E,y]=a(f);Ri(i,S,E,y,M);const b=T=>M?-135+T*270:ze.small(T);Bo(i,S,E,y,b(w),b(x),.82,y*.07,"#2fbf58"),_!==null&&kn(i,S,E,y,b(_),.7,.92,y*.06,"#e0322a");for(let T=0;T<=m;T++)kn(i,S,E,y,b(T/m),.72,.86,y*.045);for(let T=0;T<=m;T++)Ge(i,S,E,y,b(T/m),.55,A(T),M?.17:.2);Ge(i,S,E,y,180,.32,v,M?.12:.14,"#d0d0d0","normal"),p&&Ge(i,S,E,y,180,.5,p,M?.09:.11,"#d0d0d0","normal")};l(r.rpm,"RPM","x100",6,2600/3e3,1800/3e3,2600/3e3,f=>String(f*5),!0),l(r.map,"MAN PRESS","IN HG",5,null,.4,.84,f=>String(10+f*5),!0),l(r.oilp,"OIL","PSI",4,.95,.5,.85,f=>String(f*25)),l(r.oilt,"OIL","TEMP",4,.92,.35,.8,f=>String(50+f*50)),l(r.fuell,"FUEL","L",4,null,.15,1,f=>["E","¼","½","¾","F"][f]),l(r.fuelr,"FUEL","R",4,null,.15,1,f=>["E","¼","½","¾","F"][f]),l(r.egt,"EGT","",4,null,.3,.8,f=>String(f*4)),l(r.amp,"AMP","",4,null,.45,.65,f=>String(-60+f*30)),l(r.cht,"CHT","",4,.9,.3,.75,f=>String(f*1));{const f=Ce(di.x-di.w/2),v=be(di.y+di.h/2),p=Nn(di.w),m=Nn(di.h);i.fillStyle="#34383e",i.fillRect(f-22,v-22,p+44,m+44),i.fillStyle="#0a0c0f",i.fillRect(f-4,v-4,p+8,m+8);for(let w=0;w<4;w++)i.fillStyle="#1b1d21",i.fillRect(f+10+w*(p/4),v+m+6,p/4-20,12);for(const[w,x]of[[f-11,v-11],[f+p+11,v-11],[f-11,v+m+11],[f+p+11,v+m+11]])jo(i,w,x,4);cn(i,f+p/2,v-12,"GNS 530  ·  BAHÍA VISTA AIR TAXI",9,"#c8ccd2","normal");const _=(w,x,A,M)=>{const S=Ce(-.02),E=Ce(.19),y=Nn(.036);i.fillStyle="#34383e",i.fillRect(S,w,E-S,y),i.fillStyle="#0a0c0f",i.fillRect(S+6,w+6,E-S-12,y-12),i.fillStyle="#0b1d10",i.fillRect(S+16,w+12,(E-S)*.32,y-24),i.fillRect(S+(E-S)*.55,w+12,(E-S)*.32,y-24),cn(i,S+16+(E-S)*.16,w+y/2,x,y*.42,"#ffb347","bold"),cn(i,S+(E-S)*.71,w+y/2,A,y*.42,"#ffb347","bold");for(const b of[S+10,E-10])i.fillStyle="#5a5e64",i.beginPath(),i.arc(b,w+y/2,y*.28,0,7),i.fill(),i.fillStyle="#23262a",i.beginPath(),i.arc(b,w+y/2,y*.16,0,7),i.fill();cn(i,(S+E)/2,w+y/2,M,y*.22,"#a8adb5","normal")};_(be(.012),"121.90","118.30","COM"),_(be(-.03),"110.50","4213","NAV / XPDR")}Ki(i,Ce(-.6)+4,be(-.055),Nn(.11),Nn(.026),["N726BV"],"#f4f4f4","#111214",22),Ki(i,Ce(-.485),be(-.055),Nn(.19),Nn(.026),["NO SMOKING  ·  FASTEN SEAT BELTS"],"#f4f4f4","#111214",12),Ki(i,Ce(-.29),be(-.055),Nn(.11),Nn(.026),["Vfe 95 · Vne 180"],"#f4f4f4","#7a1a14",12),Ki(i,Ce(-.03),be(-.078),Nn(.22),Nn(.02),["THIS AIRCRAFT MUST BE OPERATED IN ACCORDANCE WITH THE APPROVED FLIGHT MANUAL"],"#e8e8e8","#111214",7),Ki(i,Ce(.29)+4,be(-.095),Nn(.32),Nn(.024),["DHC-2 TYPE FLOATPLANE  ·  MAX GROSS 2350 KG  ·  FUEL 100LL"],"#f4f4f4","#111214",10),["MASTER","ALT","AVIONICS","FUEL PUMP","PITOT HT","NAV","STROBE","BEACON","LDG","TAXI","PANEL","DOME"].forEach((f,v)=>q_(i,Ce(-.56+v*.05),be(-.13),v<3||v===5||v===7,f));{const f=Ce(.06),v=be(-.13);i.fillStyle="#3a3e44",i.beginPath(),i.arc(f,v,26,0,7),i.fill(),i.fillStyle="#0e0f11",i.beginPath(),i.arc(f,v,20,0,7),i.fill();for(const[p,m]of[[-70,"OFF"],[-35,"R"],[0,"L"],[35,"BOTH"],[70,"START"]])cn(i,f+Math.cos(Fi(p))*36,v+Math.sin(Fi(p))*36,m,8,"#e8e8e8","normal");i.fillStyle="#c9ccd1",i.save(),i.translate(f,v),i.rotate(Fi(35)),i.fillRect(-3,-3,22,6),i.restore()}{const f=Ce(.13),v=be(-.13);i.fillStyle="#7a1a14",i.fillRect(f-24,v-28,48,56),i.fillStyle="#c0392b",i.fillRect(f-16,v-20,32,40),cn(i,f,v-8,"FUEL",9,"#fff"),cn(i,f,v+6,"CUT",9,"#fff"),cn(i,f,v+18,"OFF",9,"#fff")}for(let f=0;f<16;f++){const v=Ce(.22+f*.024),p=be(-.125);i.fillStyle="#0f1013",i.beginPath(),i.arc(v,p,9,0,7),i.fill(),i.fillStyle="#d8dbe0",i.beginPath(),i.arc(v,p,6,0,7),i.fill()}cn(i,Ce(.4),be(-.16),"CIRCUIT BREAKERS  ·  PULL OFF",9,"#c8ccd2","normal");for(const[f,v]of[[.61,"PANEL"],[.56,"RADIO"]])i.fillStyle="#5a5e64",i.beginPath(),i.arc(Ce(f),be(-.125),13,0,7),i.fill(),cn(i,Ce(f),be(-.158),v,8,"#c8ccd2","normal");i.fillStyle="#1f2124",i.fillRect(0,la,s,tn.GRAIN);for(let f=0;f<26e3;f++){const v=e.next();i.fillStyle=v>.5?`rgba(255,255,255,${(v-.5)*.12})`:`rgba(0,0,0,${(.5-v)*.5})`,i.fillRect(e.next()*s,la+e.next()*tn.GRAIN,1+e.next()*2,1+e.next()*2)}i.fillStyle="#000",i.fillRect(0,$e,s,tn.PLACARDS),Ki(i,4,$e+6,220,78,["EXIT","PULL HANDLE UP · PUSH DOOR"],"#111214","#e8b830",0),Ki(i,234,$e+6,260,78,["FASTEN SEAT BELT","WHILE SEATED"],"#f0f0f0","#111214",0);{const v=$e+6;i.fillStyle="#0a0a0c",i.fillRect(504,v,160,78),i.fillStyle="#f2f2f2";for(let p=0;p<17;p++){const m=512+p*9;i.fillRect(m,v+40,2,p%4===0?20:10)}cn(i,530,v+26,"33",18,"#f2f2f2"),cn(i,584,v+26,"N",22,"#f2f2f2"),cn(i,638,v+26,"3",18,"#f2f2f2"),i.fillStyle="#ffb347",i.fillRect(583,v+38,3,40)}Ki(i,674,$e+6,120,78,["GARZA 7","N726BV"],"#f0f0f0","#1a1c20",0);{const v=$e+6,p=i.createLinearGradient(804,v,804,v+78);p.addColorStop(0,"#cfd4da"),p.addColorStop(1,"#8a9099"),i.fillStyle=p,i.fillRect(804,v,360,78),i.strokeStyle="#2a2c30",i.lineWidth=3,i.strokeRect(807,v+3,354,72),cn(i,984,v+24,"BAHÍA VISTA AIR TAXI",22,"#1c2d5a","bold italic"),cn(i,984,v+56,"GARZA 7 · FLOATPLANE · N726BV",14,"#1c2d5a","normal")}{const v=$e+6,p=i.createRadialGradient(1214,v+39,4,1214,v+39,40);p.addColorStop(0,"#ffffff"),p.addColorStop(1,"#c8cbd0"),i.fillStyle=p,i.fillRect(1174,v,80,78)}const h=Ln(n,!0,8);h.flipY=!0,h.wrapS=Ze,h.wrapT=Ze;const[d,u]=fn(s,ys);u.fillStyle="#000",u.fillRect(0,0,s,ys),u.drawImage(n,0,0),u.globalCompositeOperation="multiply",u.fillStyle="#5a5a60",u.fillRect(0,0,s,ys),u.globalCompositeOperation="source-over",u.fillStyle="#000",u.fillRect(0,be(-.085),s,ys-be(-.085)),u.fillStyle="rgba(0,0,0,0.6)",u.fillRect(0,0,s,t),u.fillStyle="#e8e6dc",u.fillRect(1174,$e+6,80,78);const g=Ln(d,!0,4);return g.flipY=!0,g.wrapS=Ze,g.wrapT=Ze,{map:h,emissive:g}}const $n={size:512,ball:{x:0,y:0,s:256},card:{x:256,y:0,s:256},ballRadius:1.9,ballDegPerRadius:57,patches:{white:[16,300],black:[80,300],orange:[144,300],red:[208,300],bezel:[272,300],grey:[336,300],yellow:[400,300],glass:[464,300]}};function $_(){const s=$n.size,[t,e]=fn(s,s);e.fillStyle="#000",e.fillRect(0,0,s,s);{const{x:r,y:a,s:l}=$n.ball,c=r+l/2,h=a+l/2,d=l/2,u=d/$n.ballDegPerRadius;e.save(),e.beginPath(),e.arc(c,h,d,0,7),e.clip();const g=e.createLinearGradient(0,h-d,0,h);g.addColorStop(0,"#2b7fd0"),g.addColorStop(1,"#4aa0e8"),e.fillStyle=g,e.fillRect(r,a,l,l/2);const f=e.createLinearGradient(0,h,0,h+d);f.addColorStop(0,"#9a6a3a"),f.addColorStop(1,"#6b4322"),e.fillStyle=f,e.fillRect(r,h,l,l/2),e.fillStyle="#f4f4f4",e.fillRect(r,h-1.5,l,3);for(let v=5;v<=35;v+=5){const p=v%10?d*.16:d*.34;for(const m of[-1,1]){const _=h-m*v*u;e.fillRect(c-p/2,_-1.2,p,2.4),v%10===0&&(e.font=`bold ${Math.round(d*.11)}px Arial`,e.textAlign="center",e.textBaseline="middle",e.fillText(String(v),c-p/2-d*.09,_),e.fillText(String(v),c+p/2+d*.09,_))}}e.restore()}{const{x:r,y:a,s:l}=$n.card,c=r+l/2,h=a+l/2,d=l/2;e.fillStyle="#101214",e.beginPath(),e.arc(c,h,d,0,7),e.fill();for(let u=0;u<360;u+=5){const g=(u-90)*Math.PI/180,f=u%30?u%10?d*.06:d*.1:d*.14;e.fillStyle="#f2f2f2",e.save(),e.translate(c+Math.cos(g)*d*.98,h+Math.sin(g)*d*.98),e.rotate(g+Math.PI/2),e.fillRect(-1.2,0,2.4,f),e.restore()}for(let u=0;u<360;u+=30){const g=(u-90)*Math.PI/180,f=u===0?"N":u===90?"E":u===180?"S":u===270?"W":String(u/10);e.save(),e.translate(c+Math.cos(g)*d*.66,h+Math.sin(g)*d*.66),e.rotate(g+Math.PI/2),e.fillStyle=u===0?"#ff9a2e":"#f2f2f2",e.font=`bold ${Math.round(d*(u%90?.17:.22))}px Arial`,e.textAlign="center",e.textBaseline="middle",e.fillText(f,0,0),e.restore()}}const n=$n.patches,i=(r,a)=>{const[l,c]=n[r];e.fillStyle=a,e.fillRect(l-16,c-16,32,32)};i("white","#f4f4f4"),i("black","#0b0c0e"),i("orange","#ff8a1f"),i("red","#d8322e"),i("bezel","#2e3136"),i("grey","#9a9ea4"),i("yellow","#f2c230"),i("glass","#0b0c0e");const o=Ln(t,!0,8);return o.flipY=!0,o.wrapS=Ze,o.wrapT=Ze,o}class j_{texture;ctx;w=320;h=216;last="";constructor(){const[t,e]=fn(this.w,this.h);this.ctx=e,this.texture=Ln(t,!0,4),this.texture.flipY=!0,this.texture.wrapS=Ze,this.texture.wrapT=Ze,this.draw(0,0,0,0)}draw(t,e,n,i){const o=Math.round(t),r=(Math.round(e)%360+360)%360,a=Math.round(n/10)*10,l=Math.round(i/50)*50,c=`${o}|${r}|${a}|${l}`;if(c===this.last)return!1;this.last=c;const h=this.ctx,d=this.w,u=this.h,g=206;return h.fillStyle="#071a2e",h.fillRect(0,0,d,u),h.save(),h.beginPath(),h.rect(0,0,g,u),h.clip(),h.translate(g/2,u*.62),h.rotate(-r*Math.PI/180),h.fillStyle="#12508a",h.fillRect(-400,-400,800,800),h.fillStyle="#5c9e4a",h.beginPath(),h.ellipse(40,-110,160,46,.35,0,7),h.fill(),h.fillStyle="#7fb56a",h.beginPath(),h.ellipse(-120,60,70,34,-.2,0,7),h.fill(),h.fillStyle="#d9c890",h.beginPath(),h.ellipse(120,-60,40,14,.5,0,7),h.fill(),h.strokeStyle="#e6e6e6",h.lineWidth=3,h.beginPath(),h.moveTo(-160,20),h.lineTo(60,-90),h.stroke(),h.strokeStyle="#ff5fb0",h.lineWidth=3,h.setLineDash([10,6]),h.beginPath(),h.moveTo(0,60),h.lineTo(0,-320),h.stroke(),h.setLineDash([]),h.restore(),h.strokeStyle="rgba(255,255,255,0.35)",h.lineWidth=1,h.beginPath(),h.arc(g/2,u*.62,62,0,7),h.stroke(),h.fillStyle="#ffffff",h.save(),h.translate(g/2,u*.62),h.beginPath(),h.moveTo(0,-12),h.lineTo(3,-2),h.lineTo(12,2),h.lineTo(12,5),h.lineTo(3,3),h.lineTo(3,9),h.lineTo(6,11),h.lineTo(-6,11),h.lineTo(-3,9),h.lineTo(-3,3),h.lineTo(-12,5),h.lineTo(-12,2),h.lineTo(-3,-2),h.closePath(),h.fill(),h.restore(),h.font="bold 10px monospace",h.textAlign="left",h.textBaseline="top",h.fillStyle="#dfe8f2",h.fillText("TRK UP  2NM",5,4),h.fillText("DTK 090  RWY09",5,u-15),h.fillStyle="#04101c",h.fillRect(g,0,d-g,u),h.fillStyle="#20364d",h.fillRect(g,0,1,u),[["GS",`${o}`,"kt"],["TRK",`${r.toString().padStart(3,"0")}`,"°"],["ALT",`${a}`,"ft"],["VS",`${l>0?"+":""}${l}`,"fpm"]].forEach(([v,p,m],_)=>{const w=_*(u/4);h.fillStyle="#20364d",_&&h.fillRect(g,w,d-g,1),h.font="bold 11px monospace",h.textAlign="left",h.textBaseline="top",h.fillStyle="#8fb3d9",h.fillText(v,g+6,w+4),h.textAlign="right",h.fillText(m,d-5,w+4),h.font="bold 30px monospace",h.textBaseline="bottom",h.fillStyle=_===1?"#ff5fb0":"#f4f4f4",h.fillText(p,d-5,w+u/4-2)}),this.texture.needsUpdate=!0,!0}}function Z_(){const t=new We("glass-dirt"),[e,n]=fn(256,256);n.fillStyle="#000",n.fillRect(0,0,256,256);for(let o=0;o<260;o++){const r=t.range(0,256),a=t.range(0,256),l=t.range(6,40),c=n.createRadialGradient(r,a,0,r,a,l),h=t.range(.03,.14);c.addColorStop(0,`rgba(255,255,255,${h})`),c.addColorStop(1,"rgba(255,255,255,0)"),n.fillStyle=c;for(const d of[-256,0,256])for(const u of[-256,0,256])n.fillRect(r-l+d,a-l+u,l*2,l*2)}for(let o=0;o<40;o++){n.strokeStyle=`rgba(255,255,255,${t.range(.03,.1)})`,n.lineWidth=t.range(.5,2);const r=t.range(0,256),a=t.range(0,256),l=t.range(20,90),c=t.range(-.4,.4);for(const h of[-256,0,256])for(const d of[-256,0,256])n.beginPath(),n.moveTo(r+h,a+d),n.lineTo(r+h+Math.cos(c)*l,a+d+Math.sin(c)*l),n.stroke()}return Ln(e,!1,4)}function K_(){const[n,i]=fn(256,256),o=i.createRadialGradient(128,128,256*.07,128,128,256/2);o.addColorStop(0,"rgba(40,40,44,0.4)"),o.addColorStop(.35,"rgba(40,40,44,0.18)"),o.addColorStop(.9,"rgba(40,40,44,0.13)"),o.addColorStop(1,"rgba(40,40,44,0)"),i.fillStyle=o,i.fillRect(0,0,256,256);const r=1.3/(Math.PI*2);for(let l=0;l<3;l++){const c=i.createConicGradient(l/3*Math.PI*2,128,128);c.addColorStop(0,"rgba(18,18,22,0.2)"),c.addColorStop(r*.5,"rgba(18,18,22,0.08)"),c.addColorStop(r,"rgba(18,18,22,0)"),c.addColorStop(1,"rgba(18,18,22,0)"),i.fillStyle=c,i.beginPath(),i.arc(128,128,256*.49,0,Math.PI*2),i.fill()}i.strokeStyle="rgba(200,170,60,0.28)",i.lineWidth=7,i.beginPath(),i.arc(128,128,256*.46,0,Math.PI*2),i.stroke();const a=new cr(n);return a.colorSpace=Pn,a}const Ho=.05,gl=.4,gs=1.07,H0=.78,Go=2.3,Vo=-1.6,Bn=-.25,js=2.05,Wo=.3,G0=1.66,J_=.52,Hn=new C(.55,1.285,0),Kt={fixed:0,asi:1,adi:2,alt100:3,alt1000:4,tc:5,tcBall:6,hdg:7,vsi:8,rpm:9,map:10,oilp:11,oilt:12,egt:13,fuell:14,fuelr:15,adiBank:16},Yr=17,V0=1/15,It={metal:{color:9344154,roughness:.38,metalness:.9},darkMetal:{color:2895667,roughness:.45,metalness:.8},spinner:{color:12896462,roughness:.16,metalness:.95},exhaust:{color:5917244,roughness:.6,metalness:.9},rubber:{color:1118740,roughness:.92,metalness:0},headliner:{color:13223357,roughness:.92,metalness:0},bow:{color:14341838,roughness:.85,metalness:0},trim:{color:3027254,roughness:.82,metalness:.04},sidewall:{color:9078141,roughness:.88,metalness:0},doorTrim:{color:10328207,roughness:.86,metalness:0},plastic:{color:3816770,roughness:.7,metalness:0},lightPlastic:{color:12565684,roughness:.6,metalness:0},leather:{color:8017205,roughness:.55,metalness:0},carpet:{color:3485739,roughness:.95,metalness:0},belt:{color:3948356,roughness:.9,metalness:0},prop:{color:1974050,roughness:.5,metalness:.6},propTip:{color:15909424,roughness:.5,metalness:0},shirt:{color:3100527,roughness:.85,metalness:0},skin:{color:13145452,roughness:.7,metalness:0},headset:{color:1710620,roughness:.5,metalness:0},throttle:{color:1381912,roughness:.5,metalness:0},propKnob:{color:2777008,roughness:.5,metalness:0},mixture:{color:12597547,roughness:.6,metalness:0},flapKnob:{color:15263456,roughness:.5,metalness:0},extinguisher:{color:12597547,roughness:.4,metalness:.3}},li={red:0,green:1,tail:2,beacon:3,strobe:4},an=Math.PI/180;class Q_{pos=[];nrm=[];uv=[];pivot=[];chan=[];clip=[];idx=[];vertex(t,e,n,i,o,r,a,l,c=0){return this.pos.push(n,i,o),this.nrm.push(0,0,1),this.uv.push(r,a),this.pivot.push(t,e,0),this.chan.push(l),this.clip.push(c),this.pos.length/3-1}tick(t,e,n,i,o,r,a,l){const c=(90-e)*an,h=Math.cos(c),d=Math.sin(c),u=t.r*n,g=t.r*i,f=-d*o/2,v=h*o/2;this.poly(t,[[h*u-f,d*u-v],[h*u+f,d*u+v],[h*g+f,d*g+v],[h*g-f,d*g-v]],r,a,l)}patchUv(t){const[e,n]=$n.patches[t];return[e/$n.size,1-n/$n.size]}poly(t,e,n,i,o){const[r,a]=this.patchUv(o),l=this.pos.length/3;for(const[c,h]of e)this.vertex(t.x,t.y,c,h,n,r,a,i);for(let c=1;c<e.length-1;c++)this.idx.push(l,l+c,l+c+1)}needle(t,e,n,i,o,r="white",a=.18){const l=t.r*e,c=t.r*a;this.poly(t,[[-n/2,-c],[n/2,-c],[n*.22,l],[-n*.22,l]],i,o,r)}cap(t,e,n,i,o="black"){this.disc(t,e,n,i,o,14)}disc(t,e,n,i,o,r=40,a,l=0){const c=$n.size,[h,d]=this.patchUv(o),u=this.pos.length/3,g=(p,m)=>a?[(a.x+a.s/2+p/e*(a.s/2))/c,1-(a.y+a.s/2-m/e*(a.s/2))/c]:[h,d],[f,v]=g(0,0);this.vertex(t.x,t.y,0,0,n,f,v,i,l);for(let p=0;p<=r;p++){const m=p/r*Math.PI*2,_=Math.cos(m)*e,w=Math.sin(m)*e,[x,A]=g(_,w);this.vertex(t.x,t.y,_,w,n,x,A,i,l)}for(let p=0;p<r;p++)this.idx.push(u,u+1+p,u+2+p)}ring(t,e,n,i,o,r,a=40){const[l,c]=this.patchUv(r),h=this.pos.length/3;for(let d=0;d<=a;d++){const u=d/a*Math.PI*2,g=Math.cos(u),f=Math.sin(u);this.vertex(t.x,t.y,g*e,f*e,i,l,c,o),this.vertex(t.x,t.y,g*n,f*n,i,l,c,o)}for(let d=0;d<a;d++){const u=h+d*2;this.idx.push(u,u+1,u+2,u+1,u+3,u+2)}}bar(t,e,n,i,o,r,a,l){this.poly(t,[[e-i/2,n-o/2],[e+i/2,n-o/2],[e+i/2,n+o/2],[e-i/2,n+o/2]],r,a,l)}build(){const t=new oe;return t.setAttribute("position",new yt(this.pos,3)),t.setAttribute("normal",new yt(this.nrm,3)),t.setAttribute("uv",new yt(this.uv,2)),t.setAttribute("aPivot",new yt(this.pivot,3)),t.setAttribute("aChan",new yt(this.chan,1)),t.setAttribute("aClip",new yt(this.clip,1)),t.setIndex(this.idx),t}}class tw{root=new Ve;materials=[];glassMaterial;paintMaterial;propeller=new Ve;propDisc;propHub;propBlades;aileronL;aileronR;flapL;flapR;elevator;rudder;waterRudders=[];wheels;lights;lightPower={value:new Float32Array(5)};yokeL;yokeR;throttleLever;flapLever;pedalsL;pedalsR;instruments;gpsMesh;gps=new j_;instAngle={value:new Float32Array(Yr)};instShift={value:new Float32Array(Yr*2)};panelMat;instMat;gpsMat;canvasAcc=V0;gaugeState={kt:0,ft:0,fpm:0,hdg:0,bankDeg:0,pitchDeg:0,rpm:0,map:0,turnRateDps:0,slip:0};exhaustPos=new C(2.6,-.55,.66);floatSternL=new C(-2.2,-2.15,-1.25);floatSternR=new C(-2.2,-2.15,1.25);floatBowL=new C(2.6,-2,-1.25);floatBowR=new C(2.6,-2,1.25);wingTipL=new C(-.04,1.435,-7.5);wingTipR=new C(-.04,1.435,7.5);cockpitEye=new C(1,1,-.3);exteriorMeshes=[];interiorMeshes=[];spanHalf=7.5;constructor(){const t=[{x:4.55,yc:.02,w:.3,top:.3,bot:.3,n:2},{x:4.35,yc:.02,w:.55,top:.55,bot:.55,n:2},{x:3.9,yc:.02,w:.72,top:.7,bot:.7,n:2.1},{x:3.2,yc:.03,w:.75,top:.72,bot:.7,n:2.3},{x:2.6,yc:.04,w:.77,top:.74,bot:.7,n:3,nBot:2.4},{x:2.3,yc:.05,w:.78,top:.76,bot:.7,n:6,nBot:2.4},{x:2.15,yc:.05,w:.79,top:.88,bot:.7,n:5,nBot:2.4},{x:2,yc:.05,w:.8,top:1.01,bot:.7,n:4.7,nBot:2.4},{x:1.85,yc:.05,w:.8,top:1.12,bot:.7,n:4.5,nBot:2.4},{x:1.73,yc:.05,w:.8,top:1.13,bot:.7,n:4.5,nBot:2.4},{x:.95,yc:.05,w:.8,top:1.13,bot:.7,n:4.5,nBot:2.4},{x:0,yc:.05,w:.8,top:1.13,bot:.68,n:4.5,nBot:2.4},{x:-.4,yc:.05,w:.79,top:1.12,bot:.66,n:4.3,nBot:2.4},{x:-.9,yc:.05,w:.76,top:1.08,bot:.62,n:3.8,nBot:2.4},{x:-1.25,yc:.055,w:.7,top:1,bot:.56,n:3.3,nBot:2.3},{x:-1.6,yc:.06,w:.62,top:.9,bot:.5,n:2.7,nBot:2.2},{x:-2.6,yc:.1,w:.44,top:.62,bot:.34,n:2.3,nBot:2.1},{x:-3.7,yc:.16,w:.28,top:.42,bot:.2,n:2.1},{x:-4.7,yc:.24,w:.15,top:.3,bot:.1,n:2},{x:-5.35,yc:.3,w:.06,top:.22,bot:.04,n:2}],e=[[1.77,.95,gs],[.85,-.42,gs],[-.52,-1.25,H0]],n=C_(t,[Go,Vo,...e.flatMap(([k,_t])=>[k,_t])]),i=k=>n.findIndex(_t=>Math.abs(_t.x-k)<1e-6),o=k=>k>=Vo?gl:gl-(Vo-k)/(5.35+Vo)*.1,r=9,a=2,l=3,c=P_([{y:gs,segs:r,fallbackT:.1},{y:H0,segs:a,fallbackT:.146},{y:k=>o(k.x),segs:l,fallbackT:.2125},{y:k=>o(k.x)-so.top,segs:1,fallbackT:.23},{y:k=>o(k.x)-so.bottom,segs:1,fallbackT:.26},{y:k=>o(k.x)-so.pin,segs:1,fallbackT:.27}],7),h=r,d=h+a,u=d+l,g=Yo(n,c),f=g.R,v=qr(n,Ho),p=Yo(v,(k,_t)=>g.t[_t]),m=[];for(const[k,_t,Rt]of e){const $t=Rt===gs?h:d;m.push({i0:i(k),i1:i(_t),j0:$t,j1:u}),m.push({i0:i(k),i1:i(_t),j0:f-u,j1:f-$t})}const _={i0:i(Go),i1:i(1.85),j0:f-d,j1:f+d};m.push(_);const w=(k,_t)=>m.some(Rt=>z0(Rt,f,k,_t)),x=i(Go),A=i(Vo),M=n[0].x,S=M-n[n.length-1].x,b=V_({length:S,uOf:k=>(M-k)/S,xOf:k=>M-k*S,vOf:(k,_t)=>{let Rt=0;for(;Rt<n.length-2&&n[Rt+1].x>k;)Rt++;const $t=n[Rt],Le=n[Rt+1],De=Vn.clamp(($t.x-k)/Math.max($t.x-Le.x,1e-6),0,1),Ne=eo($t,_t),Ue=eo(Le,_t);return Ne===null&&Ue===null?null:Ne===null?Ue:Ue===null?Ne:Ne+(Ue-Ne)*De},topV:(k,_t)=>{const Rt=ei(n,k),$t=Rt.n??2.2,Le=Math.min(Math.abs(_t)/Rt.w,.999);return eo(Rt,Rt.yc+Rt.top*Math.pow(1-Math.pow(Le,$t),1/$t)*.999)??0},perimeter:k=>A_(ei(n,k)),sillY:o}),T=W_(),U=X_(),O=new zo({map:b.map,roughnessMap:b.roughnessMap,normalMap:b.normalMap,normalScale:new Pt(.55,.55),color:16777215,roughness:1,metalness:0,clearcoat:.7,clearcoatRoughness:1,clearcoatRoughnessMap:b.clearcoatRoughnessMap,envMapIntensity:1}),z=new zo({map:T.map,roughnessMap:T.roughnessMap,normalMap:T.normalMap,normalScale:new Pt(.5,.5),color:16777215,roughness:1,metalness:0,clearcoat:.65,clearcoatRoughness:.14,envMapIntensity:1,vertexColors:!0}),B=new zo({map:U.map,roughnessMap:U.roughnessMap,normalMap:U.normalMap,normalScale:new Pt(.6,.6),color:16777215,roughness:1,metalness:.55,clearcoat:.2,clearcoatRoughness:.3,envMapIntensity:1}),F=new zo({color:10470354,transparent:!0,opacity:.1,roughness:.25,metalness:0,envMapIntensity:1,side:Oi,depthWrite:!1,specularIntensity:1,ior:1.52,premultipliedAlpha:!0}),L={uDirt:{value:Z_()},uEnvGain:{value:3},uDirtAmount:{value:.35}};F.onBeforeCompile=k=>{Object.assign(k.uniforms,L),k.vertexShader=k.vertexShader.replace("#include <common>",`#include <common>
attribute vec4 aPane;
varying vec4 vPane;
varying vec2 vPaneUv;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vPane = aPane;
vPaneUv = uv;`),k.fragmentShader=k.fragmentShader.replace("#include <common>",`#include <common>
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
        `).replace("#include <premultiplied_alpha_fragment>","")},F.customProgramCacheKey=()=>"cockpit-glass-v7";const H=new zo({color:bn.upper,roughness:.4,metalness:0,clearcoat:.6,clearcoatRoughness:.15}),G=G_(),N=Y_(),$=new ce({map:N.map,emissiveMap:N.emissive,emissive:16777215,emissiveIntensity:.12,roughness:.75,metalness:0}),V=$_(),tt=new ce({map:V,emissiveMap:V,emissive:16777215,emissiveIntensity:.15,roughness:.6,metalness:0});tt.onBeforeCompile=k=>{k.uniforms.uInstAngle=this.instAngle,k.uniforms.uInstShift=this.instShift,k.vertexShader=k.vertexShader.replace("#include <common>",`#include <common>
attribute vec3 aPivot;
attribute float aChan;
attribute float aClip;
varying vec2 vInstLocal;
varying float vInstClip;
uniform float uInstAngle[${Yr}];
uniform vec2 uInstShift[${Yr}];`).replace("#include <begin_vertex>",`
          int instCh = int(aChan + 0.5);
          float instC = cos(uInstAngle[instCh]), instS = sin(uInstAngle[instCh]);
          vec2 instQ = position.xy + uInstShift[instCh];
          vec3 transformed = vec3(aPivot.x + instC * instQ.x - instS * instQ.y, aPivot.y + instS * instQ.x + instC * instQ.y, aPivot.z + position.z);
          vInstLocal = transformed.xy - aPivot.xy;
          vInstClip = aClip;
        `),k.fragmentShader=k.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vInstLocal;
varying float vInstClip;`).replace("#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>
if (vInstClip > 0.0 && dot(vInstLocal, vInstLocal) > vInstClip * vInstClip) discard;`)},tt.customProgramCacheKey=()=>"cockpit-instruments-v2";const W=new ce({map:this.gps.texture,emissiveMap:this.gps.texture,emissive:16777215,emissiveIntensity:.55,roughness:.25,metalness:0});this.materials.push(O,z,B,F,H,G,$,tt,W),this.glassMaterial=F,this.paintMaterial=O,this.panelMat=$,this.instMat=tt,this.gpsMat=W;const q=(k,_t,Rt={})=>{const $t=new ge(k,_t);return $t.castShadow=Rt.cast??!0,$t.receiveShadow=Rt.receive??!0,(Rt.parent??this.root).add($t),Rt.exterior??!0?this.exteriorMeshes.push($t):this.interiorMeshes.push($t),$t},X=O_;q($o(g,{quad:(k,_t)=>!w(k,_t),capStart:!0,capEnd:!0}),O);const it=new Sn,lt=k=>{const _t=Vn.smoothstep(k,gs,gs+.045);return{...It.headliner,color:new Gt(It.headliner.color).multiplyScalar(.78+.22*_t).getHex()}},ft=(k,_t)=>_t>=gs-.005?lt(_t):_t>=gl-.005?It.trim:It.sidewall;it.add($o(p,{i0:x,i1:A,quad:(k,_t)=>!w(k,_t),flip:!0,capStart:!0,capEnd:!0}),void 0,ft);for(const k of m)it.add(N0(g,p,k),void 0,It.trim);it.add(I_(v,Bn,-1.55,1.95,.01),void 0,It.carpet);const K=Ks([...m.map(k=>U0(g,k,!1,k===_)),...m.map(k=>U0(p,k,!0,k===_))]),ot=new C(2.05,1,0);K.translate(-ot.x,-ot.y,-ot.z);const j=q(K,F,{cast:!1,receive:!1});j.position.copy(ot),j.renderOrder=15;const et=new Sn,D=new C(Go,.81,0),J=new C(1.85,1.17,0),Z=D.clone().add(J).multiplyScalar(.5);Z.y-=Ho*.5,et.add(new Ht(D.distanceTo(J)+.04,.028,.026),X(Z,[0,0,Math.atan2(J.y-D.y,J.x-D.x)]),It.trim);const at=new Sn;for(const k of[-1,1])at.add(new Ht(.3,.04,.22),X([1.3,-.45,k*.72]),It.darkMetal);for(let k=0;k<2;k++)at.add(new Me(.05,.06,.28,10),X([2.75-k*.22,-.5,.62+k*.03],[.6,0,1.2]),It.exhaust);const ut=new Sn;ut.add(new Ht(.5,.12,.28),X([3.7,.7,0]));for(let k=0;k<2;k++)ut.add(new Ht(.28,.04,.22),X([3,-.62,(k===0?-1:1)*.35],[(k===0?-1:1)*.35,0,0]));this.propeller.position.set(4.62,.02,0),this.root.add(this.propeller);const vt=new Sn;vt.add(new Tc(.26,.55,20),X([.27,0,0],[0,0,-Math.PI/2]),It.spinner),vt.add(new Me(.27,.3,.16,20),X([-.02,0,0],[0,0,Math.PI/2]),It.darkMetal),this.propHub=q(vt.build(),G,{parent:this.propeller,receive:!1});const dt=new Sn,I=F_(1.32,.19,.11),R=new Ht(.02,.14,.12);for(let k=0;k<3;k++){const _t=new jt().makeRotationX(k/3*Math.PI*2);dt.add(I,_t.clone().multiply(new jt().makeTranslation(0,.16,0)),It.prop),dt.add(R,_t.clone().multiply(new jt().makeTranslation(0,1.4,0)),It.propTip)}this.propBlades=q(dt.build(),G,{parent:this.propeller,receive:!1});const Q=new ce({map:K_(),transparent:!0,opacity:0,depthWrite:!1,side:hn,roughness:.6,color:8947848});this.materials.push(Q),this.propDisc=new ge(new Ac(1.5,40),Q),this.propDisc.rotation.y=Math.PI/2,this.propDisc.position.x=.05,this.propDisc.renderOrder=15,this.propeller.add(this.propDisc);const rt={span:7.3,rootChord:1.95,tipChord:1.55,sweep:-.28,dihedral:.02,thickness:.11,twist:-.03,camber:.02},gt=fl(rt,0),pt=gt+.52,zt=gt+.46,Mt=Ks([zn(rt,{z0:0,z1:.85,segments:2,part:"full",hingeX:pt,capEnd:"rear"}),zn(rt,{z0:.85,z1:3.55,segments:5,part:"front",hingeX:pt}),zn(rt,{z0:3.55,z1:3.65,segments:1,part:"full",hingeX:pt,capStart:"rear",capEnd:"rear"}),zn(rt,{z0:3.65,z1:6.9,segments:6,part:"front",hingeX:zt}),zn(rt,{z0:6.9,z1:7.3,segments:1,part:"full",hingeX:zt,capStart:"rear",tipRound:.22})]),Lt=new Sn;for(const k of[1,-1])Lt.add(Mt,X(Hn,void 0,[1,1,k]));const te=(k,_t)=>{const Rt=ei(n,k),$t=Rt.n??2.2;return Rt.yc+Rt.top*Math.pow(Math.max(1-Math.pow(Math.min(Math.abs(_t)/Rt.w,1),$t),0),1/$t)},wt=k=>Hn.y+F0(rt,k-Hn.x,0),Ot=k=>Hn.y+U_(rt,k-Hn.x,0),qt=k=>{const _t=wt(k),Rt=Ot(k);return _t+Math.min(.05,.5*(Rt-_t))},Nt=Hn.x+go(rt,0),Ct=Hn.x+gt,le=.45,Qt=.62,Ee=qt(Nt-.01)-te(Nt,0),Y=qt(Ct+.01)-te(Ct,0),Dt=k=>{const _t=k>Nt?(k-Nt)/le:k<Ct?(Ct-k)/Qt:0,Rt=1-Math.min(_t,1);return Rt*Rt*(3-2*Rt)},mt=k=>.28+.42*Math.sqrt(Dt(k)),xt=k=>k>Nt?Ee*Dt(k):k<Ct?Y*Dt(k):qt(k)-te(k,0),bt=k=>Math.pow(Math.max(1-Math.pow(Math.min(k,1),4),0),1.6),At=[.45,.33,.22,.13,.06].map(k=>Nt+k).concat([0,.03,.08,.15,.25,.4,.55,.7,.82,.91,.97,1].map(k=>Nt-k*rt.rootChord)).concat([.07,.16,.27,.4,.52,.62].map(k=>Ct-k));ut.add(z_(At.map(k=>({x:k,w:mt(k)})),(k,_t)=>te(k,_t)-.012+xt(k)*bt(Math.abs(_t)/mt(k)),(k,_t)=>te(k,_t)-.03));const ee=(k,_t,Rt,$t)=>{const Le=zn({...rt,dihedral:0},{z0:k,z1:_t,segments:$t,part:"rear",hingeX:Rt,gap:.02,capStart:"rear",capEnd:"rear"});Le.translate(-Rt,0,0);const De=[];for(const Ne of[1,-1]){const Ue=new Ve;Ue.position.set(Hn.x+Rt,Hn.y,0),Ue.rotation.x=-Ne*rt.dihedral,Ue.scale.z=Ne;const sn=new Ve;q(Le,z,{parent:sn}),Ue.add(sn),this.root.add(Ue),De.push(sn)}return[De[0],De[1]]};[this.flapR,this.flapL]=ee(.87,3.53,pt,5),[this.aileronR,this.aileronL]=ee(3.67,6.88,zt,6),at.add(new Me(.015,.015,.45,6),X([Hn.x+.45,wt(Hn.x+.25)-.06,-3.2],[0,0,Math.PI/2]),It.metal);const ve={span:2.55,rootChord:1.05,tipChord:.8,sweep:-.175,dihedral:0,thickness:.09,twist:0,camber:0},Pe=fl(ve,0)+.34,de=Ks([zn(ve,{z0:0,z1:.1,segments:1,part:"full",hingeX:Pe,capEnd:"rear",n:9}),zn(ve,{z0:.1,z1:2.4,segments:4,part:"front",hingeX:Pe,n:9}),zn(ve,{z0:2.4,z1:2.55,segments:1,part:"full",hingeX:Pe,capStart:"rear",tipRound:.12,n:9})]),He=new C(-4.25,.42,0);for(const k of[-1,1])Lt.add(de,X(He,void 0,[1,1,k]));this.elevator=new Ve,this.elevator.position.set(He.x+Pe,He.y,0),this.root.add(this.elevator);const mn=zn(ve,{z0:.12,z1:2.38,segments:4,part:"rear",hingeX:Pe,gap:.015,capStart:"rear",capEnd:"rear",n:9});mn.translate(-Pe,0,0);const gi=new Sn;for(const k of[-1,1])gi.add(mn,X(void 0,void 0,[1,1,k]));q(gi.build(),z,{parent:this.elevator});const oi={span:1.55,rootChord:1.5,tipChord:.75,sweep:-.55,dihedral:0,thickness:.09,twist:0,camber:0},gn=fl(oi,0)+.48,So=Ks([zn(oi,{z0:0,z1:.06,segments:1,part:"full",hingeX:gn,capEnd:"rear",n:9}),zn(oi,{z0:.06,z1:1.45,segments:3,part:"front",hingeX:gn,n:9}),zn(oi,{z0:1.45,z1:1.55,segments:1,part:"full",hingeX:gn,capStart:"rear",tipRound:.1,n:9})]),Rs=new C(-4.35,.45,0);Lt.add(So,X(Rs,[-Math.PI/2,0,0])),q(Lt.build(),z),ut.add(new Ht(1.4,.32,.08),X([-3.4,.55,0],[0,0,-.25])),q(ut.build(),H),this.rudder=new Ve,this.rudder.position.set(Rs.x+gn,Rs.y,0),this.root.add(this.rudder);const bo=zn(oi,{z0:.08,z1:1.43,segments:3,part:"rear",hingeX:gn,gap:.015,capStart:"rear",capEnd:"rear",n:9});bo.translate(-gn,0,0),q(new Sn().add(bo,X(void 0,[-Math.PI/2,0,0])).build(),z,{parent:this.rudder}),at.add(new Me(.01,.01,.5,5),X([-2,.9,0],[0,0,.5]),It.metal);const vi=new ce({color:16777215,roughness:.2,metalness:0,vertexColors:!0});vi.onBeforeCompile=k=>{k.uniforms.uLightPower=this.lightPower,k.vertexShader=k.vertexShader.replace("#include <common>",`#include <common>
attribute float aLight;
varying float vLight;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vLight = aLight;`),k.fragmentShader=k.fragmentShader.replace("#include <common>",`#include <common>
uniform float uLightPower[5];
varying float vLight;`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
totalEmissiveRadiance = vColor * uLightPower[int(vLight + 0.5)];`)},vi.customProgramCacheKey=()=>"plane-lights-v1",this.materials.push(vi);const ns=(k,_t,Rt)=>{const $t=new ii(k,8,6),Le=$t.getAttribute("position").count,De=new Gt(_t),Ne=new Float32Array(Le*3),Ue=new Float32Array(Le);for(let sn=0;sn<Le;sn++)Ne[sn*3]=De.r,Ne[sn*3+1]=De.g,Ne[sn*3+2]=De.b,Ue[sn]=Rt;return $t.setAttribute("color",new ye(Ne,3)),$t.setAttribute("aLight",new ye(Ue,1)),$t},ri=new Sn;for(const[k,_t,Rt]of[[this.wingTipL,14162972,li.red],[this.wingTipR,1624136,li.green]]){const $t=Math.sign(k.z)*7.55;ri.add(ns(.06,_t,Rt),X([k.x,k.y,$t])),ri.add(ns(.035,15922431,li.strobe),X([k.x-.12,k.y,$t-Math.sign(k.z)*.02]))}ri.add(ns(.04,15922431,li.tail),X([-5.37,.3,0])),ri.add(ns(.05,14162972,li.beacon),X([-4.8,2.07,0])),this.lights=q(ri.build(),vi,{cast:!1,receive:!1});const dr=N_([{x:2.95,yc:-1.85,w:.06,top:.08,bot:.06,n:2},{x:2.6,yc:-1.9,w:.2,top:.15,bot:.18,n:2.2,nBot:1.5},{x:1.9,yc:-1.95,w:.33,top:.18,bot:.28,n:2.6,nBot:1.4},{x:.8,yc:-1.95,w:.37,top:.19,bot:.32,n:2.8,nBot:1.4},{x:-.2,yc:-1.95,w:.37,top:.19,bot:.3,n:2.8,nBot:1.4},{x:-.35,yc:-1.95,w:.36,top:.19,bot:.22,n:2.8,nBot:1.5},{x:-1.3,yc:-1.92,w:.33,top:.18,bot:.2,n:2.7,nBot:1.6},{x:-2.3,yc:-1.86,w:.25,top:.15,bot:.12,n:2.5,nBot:1.8},{x:-2.75,yc:-1.8,w:.12,top:.1,bot:.05,n:2.2}],20),fr=new Sn,Eo=2.9,pr=k=>new C(Hn.x+k,Hn.y+F0(rt,k,Eo)+.03,0),P=(k,_t,Rt)=>new C(k,_t,Rt);for(const k of[-1,1]){fr.add(dr,X([0,0,k*1.25])),at.add(new ii(.09,10,8),X([2.98,-1.85,k*1.25]),It.rubber);const _t=-1.76,Rt=-.62;at.add($s(P(1.6,_t,k*1.25),P(1.4,Rt,k*.55),.14,.05),void 0,It.metal),at.add($s(P(-.9,_t,k*1.25),P(-.7,Rt,k*.5),.14,.05),void 0,It.metal),at.add(Ci(P(1.6,_t,k*1.25),P(-.7,Rt,k*.5),.025),void 0,It.metal),at.add(Ci(P(-.9,_t,k*1.25),P(1.4,Rt,k*.55),.025),void 0,It.metal);const $t=pr(.25).setZ(k*Eo),Le=pr(-.85).setZ(k*Eo);at.add($s(P(1.3,_t+.1,k*1.3),$t,.12,.045),void 0,It.metal),at.add($s(P(-.2,_t+.1,k*1.3),Le,.12,.045),void 0,It.metal),at.add(Ci($t.clone().setY($t.y-.05),Le.clone().setY(Le.y-.05),.03),void 0,It.metal);const De=new Ve;De.position.set(-2.7,-1.85,k*1.25),q(new Sn().add(new Ht(.22,.32,.03),X([0,-.18,0]),It.darkMetal).build(),G,{parent:De,cast:!1,receive:!1}),this.root.add(De),this.waterRudders.push(De);for(const Ne of[2,.4,-1.4])at.add(new Ht(.14,.05,.05),X([Ne,_t+.03,k*1.25+.2*k]),It.metal)}at.add($s(P(1.6,-1.72,-1.25),P(1.6,-1.72,1.25),.1,.06),void 0,It.metal),at.add($s(P(-.9,-1.72,-1.25),P(-.9,-1.72,1.25),.1,.06),void 0,It.metal),q(fr.build(),B),q(at.build(),G),this.wheels=new Ve,this.root.add(this.wheels);const nt=new tr(.2,.09,6,16),ht=new Me(.12,.12,.12,12),ct=new Sn;for(const k of[-1,1])for(const[_t,Rt]of[[-.9,1],[2.3,.7]])ct.add(nt,X([_t,-2.28,k*1.25],void 0,Rt),It.rubber),ct.add(ht,X([_t,-2.28,k*1.25],[Math.PI/2,0,0],Rt),It.metal);q(ct.build(),G,{parent:this.wheels,receive:!1});const Et=((k,_t)=>ra(ei(v,k),_t))(2.1,.74)-.03,Ft=tn.H,Vt=Math.min(tn.W,Et*2-.02),Wt=new C(Math.sin(Wo),-Math.cos(Wo),0),se=new C(Math.cos(Wo),Math.sin(Wo),0),Xt=new C(js,.735,0).clone().addScaledVector(Wt,Ft/2),me=new jt().makeBasis(new C(0,0,1),Wt.clone().negate(),se.clone().negate()).setPosition(Xt),Te=(k,_t,Rt)=>new C(k,_t,Rt).applyMatrix4(me);et.add(new Ht(.16,Ft+.02,Et*2),X(Xt.clone().addScaledVector(se,.085),[0,0,Wo]),It.plastic);const Se=[],qe={...Zi.face},we=(1-Vt/tn.W)*.5*(qe.u1-qe.u0);qe.u0+=we,qe.u1-=we;const Yt=dl(Vt,Ft,qe);Yt.applyMatrix4(me),Se.push(Yt),Se.push(L_(v,.745,js-.02,Go-.005,.005,.02,Zi.grain));const vn=(k,_t,Rt,$t,Le,De)=>{const Ne=dl(_t,Rt,k),Ue=Le.clone().normalize(),sn=De.clone().addScaledVector(Ue,-De.dot(Ue)).normalize(),Ao=new C().crossVectors(sn,Ue);Ne.applyMatrix4(new jt().makeBasis(Ao,sn,Ue).setPosition($t)),Se.push(Ne)},xe=new C(0,1,0);vn(Zi.nameplate,.16,.035,new C(js-.041,.725,.34),new C(-1,0,0),xe),et.add(new Ht(.075,.055,.07),X([js+.09,.8,0]),It.plastic),et.add(new Ht(.02,.035,.024),X([js+.09,.762,0]),It.darkMetal),vn(Zi.compass,.05,.024,new C(js+.052,.8,0),new C(-1,0,0),xe),et.add(new Ht(.12,.024,.1),X([.3,1.117,0]),It.lightPlastic),vn(Zi.domeLens,.075,.06,new C(.3,1.1045,0),new C(0,-1,0),new C(1,0,0));const re=new Q_,Tt=uc,xn=.0015,xi=.0025,ae=.0035,Je=.0045;re.needle(Tt.asi,.86,.004,ae,Kt.asi),re.cap(Tt.asi,.005,Je,Kt.asi),re.disc(Tt.adi,Tt.adi.r*$n.ballRadius,xn,Kt.adi,"white",48,$n.ball,Tt.adi.r*.995);for(const k of[-60,-30,-20,-10,10,20,30,60])re.tick(Tt.adi,k,Math.abs(k)%30?.9:.84,.98,.0022,xi,Kt.fixed,"white");re.poly(Tt.adi,[[-.055*Tt.adi.r,.98*Tt.adi.r],[.055*Tt.adi.r,.98*Tt.adi.r],[0,.82*Tt.adi.r]],xi,Kt.fixed,"white"),re.poly(Tt.adi,[[-.05*Tt.adi.r,.66*Tt.adi.r],[.05*Tt.adi.r,.66*Tt.adi.r],[0,.8*Tt.adi.r]],xi,Kt.adiBank,"orange"),re.bar(Tt.adi,-.4*Tt.adi.r,0,.42*Tt.adi.r,.004,ae,Kt.fixed,"orange"),re.bar(Tt.adi,.4*Tt.adi.r,0,.42*Tt.adi.r,.004,ae,Kt.fixed,"orange"),re.bar(Tt.adi,-.19*Tt.adi.r,-.05*Tt.adi.r,.004,.1*Tt.adi.r,ae,Kt.fixed,"orange"),re.bar(Tt.adi,.19*Tt.adi.r,-.05*Tt.adi.r,.004,.1*Tt.adi.r,ae,Kt.fixed,"orange"),re.disc(Tt.adi,.003,ae,Kt.fixed,"orange",10),re.needle(Tt.alt,.62,.007,ae,Kt.alt1000,"white",.12),re.needle(Tt.alt,.86,.0035,ae,Kt.alt100),re.cap(Tt.alt,.005,Je,Kt.alt100),re.bar(Tt.tc,0,0,1.3*Tt.tc.r,.005,ae,Kt.tc,"white"),re.bar(Tt.tc,0,.11*Tt.tc.r,.006,.26*Tt.tc.r,ae,Kt.tc,"white"),re.bar(Tt.tc,0,-.02*Tt.tc.r,.24*Tt.tc.r,.008,Je,Kt.tc,"white"),re.disc({x:Tt.tc.x,y:Tt.tc.y-.53*Tt.tc.r,r:Tt.tc.r},.0032,ae,Kt.tcBall,"black",14),re.disc(Tt.hdg,Tt.hdg.r*.92,xn,Kt.hdg,"white",48,$n.card),re.bar(Tt.hdg,0,.05*Tt.hdg.r,.004,.5*Tt.hdg.r,ae,Kt.fixed,"white"),re.bar(Tt.hdg,0,.05*Tt.hdg.r,.46*Tt.hdg.r,.004,ae,Kt.fixed,"white"),re.bar(Tt.hdg,0,-.15*Tt.hdg.r,.18*Tt.hdg.r,.004,ae,Kt.fixed,"white"),re.poly(Tt.hdg,[[-.04*Tt.hdg.r,.99*Tt.hdg.r],[.04*Tt.hdg.r,.99*Tt.hdg.r],[0,.82*Tt.hdg.r]],ae,Kt.fixed,"orange"),re.needle(Tt.vsi,.84,.004,ae,Kt.vsi),re.cap(Tt.vsi,.005,Je,Kt.vsi),re.needle(Tt.rpm,.84,.0035,ae,Kt.rpm),re.cap(Tt.rpm,.004,Je,Kt.rpm),re.needle(Tt.map,.84,.0035,ae,Kt.map),re.cap(Tt.map,.004,Je,Kt.map);for(const[k,_t]of[[Tt.oilp,Kt.oilp],[Tt.oilt,Kt.oilt],[Tt.fuell,Kt.fuell],[Tt.fuelr,Kt.fuelr],[Tt.egt,Kt.egt]])re.needle(k,.8,.0028,ae,_t),re.cap(k,.003,Je,_t);for(const k of[Tt.amp,Tt.cht])re.needle(k,.8,.0028,ae,Kt.fixed),re.cap(k,.003,Je,Kt.fixed);this.instruments=q(re.build(),tt,{exterior:!1,cast:!1}),me.decompose(this.instruments.position,this.instruments.quaternion,this.instruments.scale);const _i=dl(di.w,di.h,{u0:0,v0:0,u1:1,v1:1});_i.translate(di.x,di.y,8e-4),_i.applyMatrix4(me),this.gpsMesh=q(_i,W,{exterior:!1,cast:!1}),et.add(new Ht(.7,.32,.22),X([1.7,Bn+.16,0]),It.plastic),et.add(new Ht(.22,.02,.16),X([1.62,Bn+.33,0]),It.darkMetal);const _n=(k,_t,Rt)=>new Sn().add(new Me(.009,.011,Rt,8),X([0,Rt/2,0]),It.metal).add(_t,X([0,Rt+.012,0]),k).build(),Zn=new ii(.022,12,8);this.throttleLever=q(_n(It.throttle,Zn,.16),G,{exterior:!1,cast:!1,receive:!1}),this.throttleLever.position.set(1.62,Bn+.34,-.05);for(const[k,_t]of[[0,It.propKnob],[.05,It.mixture]])et.add(_n(_t,Zn,.15),X([1.62,Bn+.34,k],[0,0,-.35]),_t);this.flapLever=q(_n(It.flapKnob,new Me(.014,.014,.05,10),.26),G,{exterior:!1,cast:!1,receive:!1}),this.flapLever.position.set(1.42,Bn+.3,.1);const Kn=k=>{const _t=new Sn;for(const Rt of[-.34,.34]){const $t=Rt+k;_t.add(new Me(.011,.011,.2,8),X([.02,.1,$t],[0,0,-.2]),It.metal),_t.add(new Ht(.02,.15,.085),X([.06,.21,$t],[0,0,-.35]),It.darkMetal),_t.add(new Ht(.03,.03,.03),X([0,.015,$t]),It.darkMetal)}return _t.build()};this.pedalsL=q(Kn(-.12),G,{exterior:!1,cast:!1,receive:!1}),this.pedalsR=q(Kn(.12),G,{exterior:!1,cast:!1,receive:!1});for(const k of[this.pedalsL,this.pedalsR])k.position.set(1.93,Bn,0);et.add(new Me(.015,.015,1.2,8),X([1.93,Bn+.02,0],[Math.PI/2,0,0]),It.metal);const ai=Bn+.4,is=new C(G0,J_,0),Ku=Te(0,-.175,0).setZ(0),Hc=(k,_t)=>{const Rt=new Ve,$t=new Sn,Le=Ku.clone().sub(is).setZ(0),De=Le.clone().normalize();$t.add(Ci(new C(0,0,0),Le.clone().addScaledVector(De,.16),.018),void 0,It.darkMetal),$t.add(new Me(.03,.03,.04,12),X(Le.clone().addScaledVector(De,-.01),[0,0,Math.PI/2-Math.atan2(De.y,De.x)]),It.rubber),$t.add(new Ht(.05,.09,.075),void 0,It.plastic),$t.add(new tr(.15,.013,8,36,Math.PI*1.39),X(void 0,[0,Math.PI/2,Math.PI*.805]),It.plastic),$t.add(new Ht(.022,.15,.03),X([0,-.075,0]),It.plastic);for(const Ue of[-1,1]){$t.add(new Ht(.022,.03,.15),X([0,0,Ue*.075]),It.plastic);const sn=new C(0,.15*Math.sin(Math.PI*.195),Ue*.15*Math.cos(Math.PI*.195)),Ao=sn.clone().add(new C(0,.08,Ue*.03));$t.add(Ci(sn,Ao,.017,10),void 0,It.rubber),_t&&($t.add(new Ec(.03,.045,4,12),X(sn.clone().lerp(Ao,.5).add(new C(-.012,0,0)),[0,0,Ue*.2]),It.skin),$t.add(new Me(.011,.011,.05,8),X(sn.clone().lerp(Ao,.75).add(new C(.028,0,-Ue*.01)),[0,0,Math.PI/2]),It.skin))}const Ne=new ge($t.build(),G);return Ne.castShadow=!1,Rt.add(Ne),Rt.position.set(is.x,is.y,k),this.root.add(Rt),this.interiorMeshes.push(Rt),Rt};this.yokeL=Hc(-.34,!0),this.yokeR=Hc(.34,!1);for(const k of[-.34,.34])vn(Zi.yoke,.036,.024,new C(is.x-.026,is.y+.015,k),new C(-1,0,0),xe);const Ju=new Ht(.46,.12,.46),Qu=new Ht(.1,.55,.46),td=new Ht(.26,.34,.26),Gc=[[1,-.34],[1,.34],[-.2,-.34],[-.2,.34],[-1,0]];for(const[k,_t]of Gc)et.add(Ju,X([k,ai,_t]),It.leather),et.add(Qu,X([k-.25,ai+.33,_t],[0,0,.15]),It.leather),et.add(td,X([k,Bn+.17,_t]),It.darkMetal);const xa=ai+.06,ss=(k,_t,Rt=[0,1,0])=>et.add(D_(P(...k),P(..._t),.045,.005,P(...Rt)),void 0,It.belt),Vc=(k,_t=[0,0,0])=>et.add(new Ht(.055,.016,.06),X(k,_t),It.metal);for(const[k,_t]of Gc.slice(1)){const Rt=xa+.004;ss([k,Rt,_t-.24],[k,Rt,_t-.04]),ss([k,Rt,_t+.24],[k,Rt,_t+.04]),Vc([k,Rt+.004,_t])}ss([.96,xa+.01,-.6],[1.07,.3,-.36],[.35,1,0]),ss([.96,xa+.01,-.08],[1.07,.3,-.32],[.35,1,0]),Vc([1.075,.3,-.34],[0,0,.35]),ss([1.1,.78,-.5],[1.09,.31,-.32],[1,.1,0]),ss([1,.8,-.5],[.52,.96,-.68],[0,1,-.3]),ss([.52,.96,.68],[.74,.7,.46],[0,1,.3]);for(const k of[-1,1])et.add(new Ht(.05,.05,.02),X([.52,.96,k*.69]),It.darkMetal);const _a=this.cockpitEye.y-.03;et.add(new Ht(.28,.58,.42),X([.95,ai+.06+.29,-.34]),It.shirt),et.add(new ii(.11,12,10),X([.98,_a,-.34]),It.skin),et.add(new tr(.115,.018,6,16,Math.PI),X([.98,_a+.03,-.34],[0,Math.PI/2,0]),It.headset);for(const k of[-1,1])et.add(new Me(.045,.045,.03,10),X([.98,_a,-.34+k*.12],[Math.PI/2,0,0]),It.headset);for(const k of[-1,1]){const _t=P(.98,.74,-.34+k*.2),Rt=P(1.2,.52,-.34+k*.23),$t=P(is.x-.04,is.y+.12,-.34+k*.165);et.add(Ci(_t,Rt,.045,8),void 0,It.shirt),et.add(Ci(Rt,$t,.04,8),void 0,It.shirt),et.add(new ii(.045,8,6),X(Rt),It.shirt)}for(const k of[-1,1])et.add(Ci(P(1.05,ai+.1,-.34+k*.11),P(1.45,ai+.12,-.34+k*.12),.07,8),void 0,It.plastic),et.add(Ci(P(1.45,ai+.12,-.34+k*.12),P(1.9,Bn+.06,-.34+k*.12),.055,8),void 0,It.plastic);const Wc=qr(n,Ho+.015),Xc=Yo(Wc,(k,_t)=>g.t[_t]),qc=(()=>{const k=ei(n,1.3),_t=eo(k,-.42)??.4,Rt=g.t[i(1.77)];let $t=u,Le=1/0;for(let De=u;De<=f/2;De++){const Ne=Math.abs(Rt[De]-_t);Ne<Le&&(Le=Ne,$t=De)}return $t})(),ed=[{i0:i(1.77),i1:i(.95),j0:u,j1:qc},{i0:i(1.77),i1:i(.95),j0:f-qc,j1:f-u}];for(const k of ed)it.add($o(Xc,{i0:k.i0,i1:k.i1,quad:(_t,Rt)=>z0(k,f,_t,Rt),flip:!0}),void 0,It.doorTrim),it.add(N0(p,Xc,k),void 0,It.trim);const Ps=(k,_t)=>ra(ei(Wc,k),_t);for(const k of[-1,1])et.add(new Ht(.34,.045,.07),X([1.32,.17,k*(Ps(1.32,.17)-.035)]),It.plastic),et.add(new Ht(.05,.05,.012),X([1.06,.06,k*(Ps(1.06,.06)-.006)]),It.metal),et.add(new Ht(.1,.018,.02),X([1.1,.05,k*(Ps(1.06,.06)-.025)],[0,0,-.25]),It.metal),et.add(new Ht(.3,.16,.02),X([1.3,-.16,k*(Ps(1.3,-.16)-.012)]),It.trim),vn(Zi.exit,.1,.036,new C(1.15,.33,k*(Ps(1.15,.33)-.002)),new C(0,0,-k),xe),vn(Zi.belts,.1,.03,new C(1.55,.33,k*(Ps(1.55,.33)-.002)),new C(0,0,-k),xe);for(const k of[1.81,.9]){const _t=[ei(qr(n,Ho+.004),k+.012),ei(qr(n,Ho+.004),k-.012)],Rt=Yo(_t,$t=>c($t));it.add($o(Rt,{flip:!0,quad:($t,Le)=>Le<h||Le>=f-h}),void 0,It.bow)}for(const k of[-1,1])et.add(new Me(.028,.028,.024,12),X([1.6,1.092,k*.5]),It.lightPlastic),et.add(new Me(.015,.015,.028,10),X([1.6,1.091,k*.5]),It.plastic);et.add(new Me(.045,.045,.26,10),X([.55,Bn+.14,.62],[0,0,.1]),It.extinguisher),et.add(new Ht(.06,.08,.04),X([.55,Bn+.06,.66]),It.darkMetal),q(it.build(),G,{exterior:!1,cast:!1}),q(et.build(),G,{exterior:!1});const Yc=Ks(Se);if(!Yc)throw new Error("cockpit: textured parts have incompatible attributes");q(Yc,$,{exterior:!1,cast:!1});for(const k of this.materials)k.isMeshStandardMaterial&&(k.envMapIntensity=1);this.setInstruments(null,0,0)}animate(t,e,n,i,o,r,a,l,c,h=null,d=o){this.aileronR.rotation.z=-e*.35,this.aileronL.rotation.z=e*.35,this.flapR.rotation.z=i*.6,this.flapL.rotation.z=i*.6,this.elevator.rotation.z=t*.4,this.rudder.rotation.y=-n*.45;for(const p of this.waterRudders)p.rotation.y=-n*.5;this.propeller.rotation.x+=o*2600*(Math.PI*2/60)*r;const u=this.propDisc.material;u.opacity=Vn.clamp((o-.15)*1.6,0,.75),this.propBlades.visible=o<.55;const g=a%1.2<.06||(a+.15)%1.2<.06,f=Math.pow(l,.6),v=this.lightPower.value;v[li.red]=v[li.green]=7*f,v[li.tail]=6*f,v[li.beacon]=(2+12*Math.max(0,Math.sin(a*4.5)))*f,v[li.strobe]=(g?30:0)*f,this.wheels.visible=c,this.wheels.position.y=c?0:.3;for(const p of[this.yokeL,this.yokeR])p.rotation.x=e*.9,p.position.x=G0-t*.08;this.pedalsL.rotation.z=-n*.32,this.pedalsR.rotation.z=n*.32,this.throttleLever.rotation.z=(.5-Vn.clamp(d,0,1))*.9,this.flapLever.rotation.z=-(1.75+Vn.clamp(i,0,1)*1.05)+Math.PI/2,this.panelMat.emissiveIntensity=.1+1.3*f,this.instMat.emissiveIntensity=.15+1.4*f,this.gpsMat.emissiveIntensity=.55+1.2*f,this.canvasAcc+=r,this.setInstruments(h,o,d)}setInstruments(t,e,n){const i=this.instAngle.value,o=this.instShift.value,r=uc,a=this.gaugeState,l=t?t.airspeed*1.9438:0,c=t?t.altitude*3.2808:0,h=t?t.verticalSpeed*196.85:0,d=t?t.heading:0,u=t?t.bank:0,g=t?t.pitchAngle:0,f=t?t.beta:0,v=t?Math.max(t.airspeed,15):15,p=t&&!t.onWater&&!t.onGround?9.81*Math.tan(u)/v/an:0,m=600+e*2e3,_=Vn.clamp(11+19*n-(t?t.altitude:0)/300,10,35);a.kt=l,a.ft=c,a.fpm=h,a.hdg=d,a.bankDeg=u/an,a.pitchDeg=g/an,a.rpm=m,a.map=_,a.turnRateDps=p,a.slip=f,i[Kt.fixed]=0,i[Kt.asi]=-ze.asi(l)*an,i[Kt.adi]=u,i[Kt.adiBank]=u,o[Kt.adi*2]=0,o[Kt.adi*2+1]=-Vn.clamp(g/an,-25,25)*(r.adi.r/30),i[Kt.alt100]=-ze.alt100(c)*an,i[Kt.alt1000]=-ze.alt1000(c)*an,i[Kt.tc]=-Vn.clamp(p/3,-1.6,1.6)*20*an;const w=Vn.clamp(f*5,-1,1)*.36*r.tc.r;o[Kt.tcBall*2]=w,o[Kt.tcBall*2+1]=w*w/(2.3*r.tc.r),i[Kt.hdg]=d*an,i[Kt.vsi]=-ze.vsi(h)*an,i[Kt.rpm]=-ze.rpm(m)*an,i[Kt.map]=-ze.map(_)*an,i[Kt.oilp]=-ze.small(e>.05?.55+.25*e:0)*an,i[Kt.oilt]=-ze.small(.35+.35*e)*an,i[Kt.egt]=-ze.small(.15+.6*e)*an,i[Kt.fuell]=-ze.small(.62)*an,i[Kt.fuelr]=-ze.small(.57)*an,this.canvasAcc>=V0&&(this.canvasAcc=0,this.gps.draw(t?t.groundSpeed*1.9438:0,d,c,h))}debugGauges(){return{...this.gaugeState}}}const W0=9.81;class ca{constructor(t){this.heightAt=t}position=new C(0,.3,0);quaternion=new Be;velocity=new C;omega=new C;rpm=0;telemetry={airspeed:0,groundSpeed:0,altitude:0,agl:0,verticalSpeed:0,heading:0,alpha:0,beta:0,stalled:!1,onWater:!1,onGround:!1,rpm:0,gForce:1,gearDown:!0,shake:0,buffet:0,gustLevel:0,bank:0,pitchAngle:0,crashed:!1};mass=2350;wingArea=26;span=14.6;chord=1.65;maxThrust=7400;inertia=new C(5600,11600,7400);wind=new C;turbulence=.3;gearDown=!0;gust=new C;gustAmp=0;time=0;buffet=0;crashTimer=0;wreckedTimer=0;lastHeading=0;contactUp=0;tmpV=new C;tmpV2=new C;invQ=new Be;stations=[{p:new C(2.6,-2.08,-1.25),kind:"bow"},{p:new C(2.6,-2.08,1.25),kind:"bow"},{p:new C(-.2,-2.25,-1.25),kind:"step"},{p:new C(-.2,-2.25,1.25),kind:"step"},{p:new C(-2.3,-1.98,-1.25),kind:"stern"},{p:new C(-2.3,-1.98,1.25),kind:"stern"},{p:new C(.7,-2.27,-1.25),kind:"plane"},{p:new C(.7,-2.27,1.25),kind:"plane"},{p:new C(-.9,-2.57,-1.25),kind:"wheel"},{p:new C(-.9,-2.57,1.25),kind:"wheel"},{p:new C(2.3,-2.48,-1.25),kind:"wheel"},{p:new C(2.3,-2.48,1.25),kind:"wheel"},{p:new C(3.6,-.5,0),kind:"structure"},{p:new C(-.04,1.43,-7.5),kind:"structure"},{p:new C(-.04,1.43,7.5),kind:"structure"},{p:new C(-4.9,2.1,0),kind:"structure"},{p:new C(-5.4,-.2,0),kind:"structure"},{p:new C(.6,1.75,0),kind:"structure"}];static FLOAT_REST_Y=1.96;static WHEEL_REST_Y=2.57;reset(t,e,n,i,o){this.position.set(t,e,n),this.quaternion.setFromEuler(new Oe(0,i,0));const r=new C(1,0,0).applyQuaternion(this.quaternion);this.velocity.copy(r).multiplyScalar(o),this.omega.set(0,0,0),this.rpm=o>5?.7:.2,this.wreckedTimer=0}forward(t){return t.set(1,0,0).applyQuaternion(this.quaternion)}up(t){return t.set(0,1,0).applyQuaternion(this.quaternion)}step(t,e){if(e<=0){this.probeContacts(),this.updateTelemetry(t);return}const n=Math.max(1,Math.ceil(e/(1/120))),i=e/n;for(let o=0;o<n;o++)this.substep(t,i);this.updateTelemetry(t)}substep(t,e){this.time+=e,this.crashTimer=Math.max(0,this.crashTimer-e);const n=Jt(t.throttle,0,1);this.rpm+=(n*.92+.08-this.rpm)*Jt(e/.7,0,1);const i=this.time*.35,o=Bt(i,1.3)+.4*Bt(i*4,11.7),r=.7*Bt(i*1.7,7.1)+.35*Bt(i*5.1,3.3),a=Bt(i*1.3,3.7)+.4*Bt(i*4.3,6.9),l=this.turbulence*(1.5+2*(1-St(30,300,this.position.y)));this.gustAmp=l,this.gust.set(o,r,a).multiplyScalar(l),this.invQ.copy(this.quaternion).invert();const c=this.tmpV.copy(this.velocity).sub(this.wind).sub(this.gust),h=this.tmpV2.copy(c).applyQuaternion(this.invQ),d=Math.max(h.length(),.5),u=Math.atan2(-h.y,Math.max(h.x,.1)),g=Math.asin(Jt(h.z/d,-1,1)),f=1.2*Math.exp(-this.position.y/9e3),v=.5*f*d*d,p=this.wingArea,m=Jt(t.flaps,0,1),_=.27-m*.03;let w=.32+m*.55+5.4*u;const x=1.7+m*.5;let A=!1,M=0;u>_?(M=u-_,w=Math.max(x-M*6,.9*Math.sin(2*u)),A=!0):u<-.22&&(w=Math.max(w,-.9)),w=Math.min(w,x),this.buffet=ie(this.buffet,A?1:St(_-.05,_,u)*.5,Jt(e*6,0,1));const S=.034+.048*w*w+m*.05+(this.gearDown?.012:0)+(A?.1+.6*M:0),E=-.45*g,y=v*p*w,b=v*p*S,T=v*p*E,U=h.clone().normalize(),O=new C(-U.y,U.x,0).normalize();O.lengthSq()<.5&&O.set(0,1,0);const z=new C;z.addScaledVector(U,-b),z.addScaledVector(O,y),z.z+=T;const B=this.maxThrust*Jt((this.rpm-.08)/.92,0,1)*Jt(1-d/120,.2,1)*(f/1.2);z.x+=B;const F=z.y,L=this.omega.x,H=this.omega.y,G=this.omega.z,N=this.span,$=this.chord,V=2*Math.max(d,3),tt=L*N/V,W=H*N/V,q=G*$/V,X=Jt(t.roll,-1,1),it=Jt(t.yaw,-1,1),lt=Jt(Math.sqrt(614/Math.max(v,1)),.4,1),ft=Jt(t.pitch,-1,1)*lt,K=-.18*St(0,.035,M),ot=.04-1.3*u-36*q+.43*ft*(1-.15*m)-.06*m+K,j=-.5*tt+.072*X-.08*g-.08*W,et=-.1*g-.16*W-.075*it+.008*X+.06*Jt(w,0,1.5)*tt,D=new C(v*p*N*j,v*p*N*et,v*p*$*ot);D.z+=.25*B,A&&(D.x+=v*p*N*.02*Math.sin(this.time*17)*this.buffet,D.z-=v*p*$*.03*this.buffet),D.x+=v*p*N*.0055*l*Bt(this.time*2.1,9.9),D.z+=v*p*$*.004*l*Bt(this.time*1.9,4.4),D.y+=v*p*N*.002*l*Bt(this.time*1.7,12.4);let J=!1,Z=!1,at=!1,ut=0;const vt=new C,dt=new C,I=new C,Q=this.heightAt(this.position.x,this.position.z)>.05;this.gearDown=Q&&this.position.y<60;const rt=Math.hypot(this.velocity.x,this.velocity.z),gt=this.quaternion,pt=Math.asin(Jt(2*(gt.x*gt.y+gt.w*gt.z),-1,1));this.contactUp=0;for(const Nt of this.stations){const Ct=Nt.p;dt.copy(Ct).applyQuaternion(this.quaternion).add(this.position);const le=this.heightAt(dt.x,dt.z),Qt=le<=.05,Y=(Qt?0:le)-dt.y;if(Y<=0)continue;const Dt=Nt.kind==="wheel",mt=Nt.kind==="structure",xt=!Dt&&!mt;if(Qt&&Dt||!Qt&&xt&&this.gearDown)continue;at=!0,I.copy(this.omega).applyQuaternion(this.quaternion).cross(this.tmpV.copy(dt).sub(this.position)).add(this.velocity);const bt=Math.hypot(I.x,I.z);let At,ee;if(mt)bt>12&&this.crash(),Qt?(J=!0,At=12e3*Y-3e3*I.y,ee=-(250*bt+40*bt*bt)*Math.min(Y/.3,1)):(Z=!0,At=8e4*Math.min(Y,.6)-8e3*I.y,ee=-.7*Math.max(At,0)*Math.min(bt,1));else if(Qt){J=!0;const ve=St(8,22,bt),Pe=Math.min(Y/.1,1);if(Nt.kind==="plane"){const de=Jt(.5+3*pt,.25,1.3);At=(40*bt*bt*Math.min(Y/.35,1)*de-250*bt*Pe*I.y)*ve,ee=0}else{ut++;const de=Nt.kind==="bow",He=Nt.kind==="stern",mn=He?36e3:de?24e3:56e3,gi=He||de?.15:.2,oi=Y<gi?Y*Y/(2*gi):Y-gi/2,gn=He?1-.9*ve:de?1-.6*ve:1-.3*ve;At=mn*Math.min(oi,.9)*gn+3e4*Math.max(Y-.45,0)**2,At-=5500*Pe*(1-.5*ve)*I.y,ee=-(4.5*bt*bt*(1-.85*ve)+30*bt)*Math.min(Y/.3,1)}}else{Z=!0,At=52e3*Math.min(Y,.5)-6e3*I.y,ee=-(t.brake?.45:.03)*Math.max(At,0)*Math.min(bt,1);const de=new C(0,0,1).applyQuaternion(this.quaternion);de.y=0,de.normalize();const He=I.dot(de),mn=Jt(-He*900,-.9*Math.max(At,0),.9*Math.max(At,0));vt.copy(de).multiplyScalar(mn),this.applyForce(vt,dt,e)}At=Math.max(At,0),vt.set(0,At,0),bt>.01&&vt.add(this.tmpV.set(I.x/bt,0,I.z/bt).multiplyScalar(ee)),this.applyForce(vt,dt,e)}if(ut>0){const Nt=rt;this.omega.y-=it*1500*Math.min(Nt/6,1)*(ut/6)*e/this.inertia.y}if(at&&this.velocity.y<-15&&this.crash(),Z&&rt>25){const Nt=this.heightAt(this.position.x+2,this.position.z)-this.heightAt(this.position.x-2,this.position.z),Ct=this.heightAt(this.position.x,this.position.z+2)-this.heightAt(this.position.x,this.position.z-2);Math.hypot(Nt,Ct)/4>.2&&this.crash()}const zt=z.applyQuaternion(this.quaternion);zt.y-=this.mass*W0,this.velocity.addScaledVector(zt,e/this.mass),this.position.addScaledVector(this.velocity,e),this.omega.x+=D.x/this.inertia.x*e,this.omega.y+=D.y/this.inertia.y*e,this.omega.z+=D.z/this.inertia.z*e,(J||Z)&&this.omega.multiplyScalar(1-.8*e);const Mt=new Be(this.omega.x*e*.5,this.omega.y*e*.5,this.omega.z*e*.5,1).normalize();this.quaternion.multiply(Mt).normalize();const Lt=this.heightAt(this.position.x,this.position.z),te=Math.max(Lt,0)+.8;this.position.y<te&&(this.position.y=te,this.velocity.y<0&&(this.velocity.y*=-.1),this.velocity.multiplyScalar(1-2.5*e));const wt=1-2*(this.quaternion.x*this.quaternion.x+this.quaternion.z*this.quaternion.z);(at||this.position.y-Math.max(Lt,0)<3.5)&&wt<.35?(this.wreckedTimer+=e,this.wreckedTimer>2.9&&this.crash()):this.wreckedTimer=0;const qt=this.forward(this.tmpV);Math.hypot(qt.x,qt.z)>.2&&(this.lastHeading=Math.atan2(qt.x,-qt.z)),this.telemetry.alpha=u,this.telemetry.beta=g,this.telemetry.stalled=A&&d>12,this.telemetry.onWater=J,this.telemetry.onGround=Z,this.telemetry.gForce=(F+this.contactUp)/(this.mass*W0),this.telemetry.buffet=this.buffet,this.telemetry.gustLevel=Jt(this.gust.length()/2.5,0,1)*St(8,25,d),this.telemetry.shake=Jt(this.buffet*.7+this.telemetry.gustLevel*.5+St(60,100,d)*.25,0,1)}crash(){const t=this.heightAt(this.position.x,this.position.z),e=t>.05;this.position.y=e?t+ca.WHEEL_REST_Y:ca.FLOAT_REST_Y,this.quaternion.setFromEuler(new Oe(0,this.headingToYaw(this.lastHeading),0)),this.velocity.set(0,0,0),this.omega.set(0,0,0),this.rpm=.08,this.buffet=0,this.wreckedTimer=0,this.crashTimer=5}headingToYaw(t){return Math.atan2(Math.cos(t),Math.sin(t))}applyForce(t,e,n){this.velocity.addScaledVector(t,n/this.mass);const i=this.quaternion;this.contactUp+=t.x*2*(i.x*i.y-i.w*i.z)+t.y*(1-2*(i.x*i.x+i.z*i.z))+t.z*2*(i.y*i.z+i.w*i.x);const r=this.tmpV.copy(e).sub(this.position).cross(t);r.applyQuaternion(this.invQ),this.omega.x+=r.x/this.inertia.x*n,this.omega.y+=r.y/this.inertia.y*n,this.omega.z+=r.z/this.inertia.z*n}probeContacts(){let t=!1,e=!1;for(const n of this.stations){if(n.kind==="structure")continue;this.tmpV.copy(n.p).applyQuaternion(this.quaternion).add(this.position);const i=this.heightAt(this.tmpV.x,this.tmpV.z),o=i<=.05;o&&n.kind==="wheel"||(o?0:i)-this.tmpV.y<=0||(o?t=!0:e=!0)}this.telemetry.onWater=t,this.telemetry.onGround=e}updateTelemetry(t){const e=this.telemetry,n=this.forward(this.tmpV);e.airspeed=this.tmpV2.copy(this.velocity).sub(this.wind).length(),e.groundSpeed=Math.hypot(this.velocity.x,this.velocity.z),e.altitude=this.position.y,e.agl=this.position.y-Math.max(0,this.heightAt(this.position.x,this.position.z)),e.verticalSpeed=this.velocity.y,e.heading=(Math.atan2(n.x,-n.z)*180/Math.PI+360)%360,e.rpm=this.rpm,e.gearDown=this.gearDown;const i=this.tmpV2.set(0,0,1).applyQuaternion(this.quaternion);e.bank=Math.asin(Jt(-i.y,-1,1)),e.pitchAngle=Math.asin(Jt(n.y,-1,1)),e.crashed=this.crashTimer>0}}function ew(){const s=document.createElement("canvas");s.width=s.height=64;const t=s.getContext("2d"),e=t.createRadialGradient(32,32,0,32,32,32);return e.addColorStop(0,"rgba(255,255,255,1)"),e.addColorStop(.4,"rgba(255,255,255,0.55)"),e.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=e,t.fillRect(0,0,64,64),new cr(s)}class X0{constructor(t,e,n,i,o){this.capacity=t,this.positions=new Float32Array(t*3),this.alphas=new Float32Array(t),this.sizes=new Float32Array(t),this.geo=new oe,this.geo.setAttribute("position",new ye(this.positions,3)),this.geo.setAttribute("aAlpha",new ye(this.alphas,1)),this.geo.setAttribute("aSize",new ye(this.sizes,1));const r=new Ke({uniforms:{uTex:{value:n},uColor:{value:e},uOpacity:{value:i},uScale:{value:1}},vertexShader:`
        attribute float aAlpha; attribute float aSize; varying float vAlpha;
        uniform float uScale;
        void main() { vAlpha = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / max(-mv.z, 0.5); }
      `,fragmentShader:`
        uniform sampler2D uTex; uniform vec3 uColor; uniform float uOpacity; varying float vAlpha;
        void main() { vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(uColor, t.a * vAlpha * uOpacity); }
      `,transparent:!0,depthWrite:!1,blending:o});this.points=new Rv(this.geo,r),this.points.frustumCulled=!1,this.geo.setDrawRange(0,0)}points;particles=[];positions;alphas;sizes;geo;emit(t){this.particles.length>=this.capacity&&this.particles.shift(),this.particles.push(t)}clear(){this.particles.length=0,this.geo.setDrawRange(0,0)}update(t,e,n,i){this.points.material.uniforms.uScale.value=i;let o=0;for(let r=this.particles.length-1;r>=0;r--){const a=this.particles[r];if(a.age+=t,a.age>=a.life){this.particles.splice(r,1);continue}a.vy-=e*t;const l=Math.exp(-n*t);a.vx*=l,a.vy*=l,a.vz*=l,a.x+=a.vx*t,a.y+=a.vy*t,a.z+=a.vz*t,a.y<.05&&e>0&&(a.y=.05,a.vy=0);const c=a.age/a.life;this.positions[o*3]=a.x,this.positions[o*3+1]=a.y,this.positions[o*3+2]=a.z,this.alphas[o]=Math.sin(c*Math.PI)*(1-c*.5),this.sizes[o]=a.size*(.6+c*1.2),o++}this.geo.attributes.position.needsUpdate=!0,this.geo.attributes.aAlpha.needsUpdate=!0,this.geo.attributes.aSize.needsUpdate=!0,this.geo.setDrawRange(0,o)}}class nw{wakeL;wakeR;spray;exhaust;vortexL;vortexR;stampL;stampR;tmp=new C;tmp3=new C;rng=new We("plane-effects");tmp2=new C;sprayAcc=0;exhaustAcc=0;constructor(t,e){this.wakeL=new to(70,1.6,14,1.2),this.wakeR=new to(70,1.6,14,1.2),t.add(this.wakeL.mesh,this.wakeR.mesh),this.stampL=new rr(4.8,.9,.9),this.stampR=new rr(4.8,.9,.9),e.add(this.stampL.mesh,this.stampR.mesh);const n=ew();this.spray=new X0(400,new Gt(.95,.98,1),n,.75,zi),this.exhaust=new X0(120,new Gt(.25,.24,.23),n,.22,zi),e.add(this.spray.points,this.exhaust.points),this.vortexL=new to(90,.5,2.2,.6,rc),this.vortexR=new to(90,.5,2.2,.6,rc),e.add(this.vortexL.mesh,this.vortexR.mesh)}reset(){this.wakeL.reset(),this.wakeR.reset(),this.vortexL.reset(),this.vortexR.reset(),this.spray.clear(),this.exhaust.clear(),this.stampL.mesh.visible=!1,this.stampR.mesh.visible=!1,this.sprayAcc=0,this.exhaustAcc=0,this.rng=new We("plane-effects")}update(t,e,n,i,o){const r=t.telemetry,a=t.quaternion,l=r.groundSpeed,c=this.tmp.copy(e.floatSternL).applyQuaternion(a).add(t.position),h=this.tmp2.copy(e.floatSternR).applyQuaternion(a).add(t.position),d=r.onWater&&l>1.5;this.wakeL.update(c.x,c.z,i,d,l),this.wakeR.update(h.x,h.z,i,d,l);const u=t.forward(this.tmp3),g=Math.hypot(u.x,u.z)||1,f=.9*(1-St(6,18,l));for(const[_,w,x]of[[this.stampL,e.floatBowL,e.floatSternL],[this.stampR,e.floatBowR,e.floatSternR]]){const A=this.tmp.copy(w).add(x).multiplyScalar(.5).applyQuaternion(a).add(t.position);_.update(A.x,A.z,u.x/g,u.z/g,r.onWater&&f>.02,f)}if(r.onWater&&l>4){const _=90*St(4,14,l)*(1-.5*St(25,40,l));this.sprayAcc+=_*n;const w=t.forward(new C);for(;this.sprayAcc>=1;){this.sprayAcc-=1;for(const x of[e.floatBowL,e.floatBowR]){const A=this.tmp.copy(x).applyQuaternion(a).add(t.position),M=x.z>0?1:-1,S=new C(0,0,1).applyQuaternion(a);this.spray.emit({x:A.x,y:.1,z:A.z,vx:w.x*l*.35+S.x*M*(2+this.rng.next()*3)+(this.rng.next()-.5)*2,vy:2.5+this.rng.next()*3.5+l*.08,vz:w.z*l*.35+S.z*M*(2+this.rng.next()*3)+(this.rng.next()-.5)*2,life:.7+this.rng.next()*.6,age:0,size:.6+this.rng.next()*.8})}}}if(this.spray.update(n,9.81,1.2,o*.9),r.rpm>.2){this.exhaustAcc+=(10+25*r.rpm)*n;const _=t.forward(new C);for(;this.exhaustAcc>=1;){this.exhaustAcc-=1;const w=this.tmp.copy(e.exhaustPos).applyQuaternion(a).add(t.position);this.exhaust.emit({x:w.x,y:w.y,z:w.z,vx:t.velocity.x-_.x*6+(this.rng.next()-.5),vy:t.velocity.y-1.5+this.rng.next()*1.5,vz:t.velocity.z-_.z*6+(this.rng.next()-.5),life:.35+this.rng.next()*.3,age:0,size:.35+this.rng.next()*.3})}}this.exhaust.update(n,-.3,2.5,o*.9);const v=Jt((r.alpha-.13)/.12,0,1)*St(35,55,r.airspeed),p=this.tmp.copy(e.wingTipL).applyQuaternion(a).add(t.position),m=this.tmp2.copy(e.wingTipR).applyQuaternion(a).add(t.position);this.vortexL.update(p.x,p.z,i,v>.05,r.airspeed),this.vortexR.update(m.x,m.z,i,v>.05,r.airspeed),this.vortexL.mesh.position.y=p.y,this.vortexL.mesh.updateMatrix(),this.vortexR.mesh.position.y=m.y,this.vortexR.mesh.updateMatrix(),this.vortexL.mesh.material.uniforms.uStrength.value=v*.7,this.vortexR.mesh.material.uniforms.uStrength.value=v*.7}}class iw{model=new tw;flight;effects;inputs={throttle:0,pitch:0,roll:0,yaw:0,flaps:0,brake:!1};constructor(t,e,n){this.flight=new ca(t),this.effects=new nw(n,e),e.add(this.model.root)}place(t,e,n,i,o,r,a,l){this.flight.position.set(t,e,n);const c=Math.atan2(Math.cos(i),Math.sin(i)),h=new Oe(0,0,0,"YZX");h.set(r,c,o,"YZX"),this.flight.quaternion.setFromEuler(h);const d=new C(1,0,0).applyQuaternion(this.flight.quaternion);this.flight.velocity.copy(d).multiplyScalar(a),this.flight.omega.set(0,0,0),this.flight.rpm=l,this.inputs.throttle=l,this.flight.step(this.inputs,0),this.syncModel(),this.effects.reset()}syncModel(){this.model.root.position.copy(this.flight.position),this.model.root.quaternion.copy(this.flight.quaternion)}update(t,e,n,i,o,r,a){this.flight.wind.copy(i),this.flight.turbulence=o,a&&this.flight.step(this.inputs,t),this.syncModel();const l=this.flight.telemetry;this.model.animate(this.inputs.pitch,this.inputs.roll,this.inputs.yaw,this.inputs.flaps,l.rpm,t,e,n,l.gearDown,l,this.inputs.throttle),this.effects.update(this.flight,this.model,t,e,r)}}class sw{constructor(t){this.camera=t}mode="chase";pos=new C;vel=new C;lookTarget=new C;tmp=new C;tmp2=new C;fwd=new C;lookLift=new C(0,1.2,0);orbitQ=new Be;euler=new Oe;q=new Be;groundHeight=null;smoothQ=new Be;time=0;initialised=!1;baseFov=50;shakeScale=.5;orbitYaw=0;orbitPitch=0;chaseDistance=25;chaseHeight=6.5;snap(){this.initialised=!1}update(t,e,n){this.time+=n;const i=this.camera,o=t.telemetry,r=o.gustLevel*this.shakeScale,a=o.buffet*this.shakeScale,l=0*this.shakeScale,c=Bt(this.time*2.3,.3)*.1*r+Bt(this.time*9.5,1.3)*.06*a+Bt(this.time*13,2.2)*.015*l,h=Bt(this.time*2.9,4.3)*.1*r+Bt(this.time*11,5.7)*.06*a+Bt(this.time*15,6.1)*.015*l,d=Bt(this.time*2.1,8.3)*.1*r+Bt(this.time*10.2,9.1)*.06*a+Bt(this.time*12,7.7)*.015*l;if(this.mode==="fixed")return;if(this.mode==="cockpit"){const y=this.tmp.copy(e.cockpitEye).applyQuaternion(t.quaternion).add(t.position);this.q.copy(t.quaternion),this.initialised||(this.smoothQ.copy(this.q),this.initialised=!0),this.smoothQ.slerp(this.q,1-Math.exp(-n*14));const b=new Be().setFromEuler(new Oe(0,-Math.PI/2,0));i.quaternion.copy(this.smoothQ).multiply(b);const T=new Be().setFromEuler(new Oe(-this.orbitPitch*.6,this.orbitYaw*1.2,0,"YXZ"));i.quaternion.multiply(T),y.x+=c*.15,y.y+=h*.15,y.z+=d*.15,i.position.copy(y),i.fov=this.baseFov+12,i.updateProjectionMatrix();return}const u=t.forward(this.fwd),g=Math.atan2(u.x,u.z),f=o.airspeed,v=this.chaseDistance+f*.08,p=this.chaseHeight+f*.012,m=this.orbitQ.setFromEuler(this.euler.set(this.orbitPitch,g+this.orbitYaw,0,"YXZ")),_=this.tmp2.set(0,p,-v).applyQuaternion(m).add(t.position);this.initialised||(this.pos.copy(_),this.vel.set(0,0,0),this.initialised=!0);const w=60,x=2*.9*Math.sqrt(60);_.addScaledVector(t.velocity,x/w);const A=this.tmp.copy(_).sub(this.pos).multiplyScalar(w).addScaledVector(this.vel,-x);this.vel.addScaledVector(A,n),this.pos.addScaledVector(this.vel,n);const M=Math.max(1.2,this.groundHeight?this.groundHeight(this.pos.x,this.pos.z)+2.5:1.2);this.pos.y<M&&(this.pos.y=M,this.vel.y<0&&(this.vel.y=0));const S=this.lookTarget.copy(t.position).addScaledVector(u,6).add(this.lookLift);i.position.copy(this.pos),i.position.x+=c,i.position.y+=h,i.position.z+=d,i.up.set(0,1,0),i.lookAt(S);const E=o.bank;i.rotateZ(-E*.18),i.fov=this.baseFov+St(30,90,f)*6,i.updateProjectionMatrix()}}class ow{constructor(t){this.renderer=t;const n=t.getContext().getExtension("EXT_disjoint_timer_query_webgl2");if(n&&(this.gpuExt=n),"PerformanceObserver"in window)try{new PerformanceObserver(o=>{this.longTasks+=o.getEntries().length}).observe({entryTypes:["longtask"]})}catch{}}times=[];lastStart=0;longTasks=0;gpuQuery=null;gpuExt=null;lastGpuMs=null;visibleObjects=0;beginFrame(){this.lastStart=performance.now();const t=this.renderer.getContext();this.gpuExt&&!this.gpuQuery&&(this.gpuQuery=t.createQuery(),t.beginQuery(this.gpuExt.TIME_ELAPSED_EXT,this.gpuQuery))}endFrame(){const t=performance.now()-this.lastStart;this.times.push(t),this.times.length>600&&this.times.shift();const e=this.renderer.getContext();if(this.gpuExt&&this.gpuQuery){e.endQuery(this.gpuExt.TIME_ELAPSED_EXT);const n=this.gpuQuery;setTimeout(()=>{const i=e.getQueryParameter(n,e.QUERY_RESULT_AVAILABLE),o=e.getParameter(this.gpuExt.GPU_DISJOINT_EXT);i&&!o&&(this.lastGpuMs=e.getQueryParameter(n,e.QUERY_RESULT)/1e6),e.deleteQuery(n)},0),this.gpuQuery=null}}reset(){this.times.length=0,this.longTasks=0}snapshot(){const t=this.times.slice().sort((c,h)=>c-h),e=t.length||1,n=t.reduce((c,h)=>c+h,0)/e,i=t[Math.min(t.length-1,Math.floor(t.length*.99))]??0,o=t.slice(Math.floor(t.length*.99)),r=o.length?o.reduce((c,h)=>c+h,0)/o.length:n,a=this.renderer.info,l=performance.memory;return{frames:t.length,avgMs:n,p99Ms:i,minFps:t.length?1e3/(t[t.length-1]||1):0,avgFps:n?1e3/n:0,onePercentLowFps:r?1e3/r:0,calls:a.render.calls,triangles:a.render.triangles,points:a.render.points,lines:a.render.lines,geometries:a.memory.geometries,textures:a.memory.textures,programs:a.programs?.length??0,jsHeapMB:l?l.usedJSHeapSize/1048576:null,gpuMs:this.lastGpuMs,longTasks:this.longTasks,visibleObjects:this.visibleObjects}}}const rw={low:{samples:0,shadowMapSize:1024,cascades:2,cloudSteps:10,skyScale:.35,shadowFar:1500,anisotropy:2,bloom:!0},medium:{samples:2,shadowMapSize:2048,cascades:3,cloudSteps:16,skyScale:.5,shadowFar:2500,anisotropy:4,bloom:!0},high:{samples:4,shadowMapSize:2048,cascades:3,cloudSteps:24,skyScale:.6,shadowFar:3500,anisotropy:8,bloom:!0},ultra:{samples:4,shadowMapSize:4096,cascades:4,cloudSteps:32,skyScale:1,shadowFar:5e3,anisotropy:16,bloom:!0}};class aw{constructor(t,e){this.canvas=t,this.params=e,this.quality=rw[e.quality],this.renderer=new _v({canvas:t,antialias:!1,powerPreference:"high-performance",logarithmicDepthBuffer:!0,alpha:!1,stencil:!1,preserveDrawingBuffer:!0}),this.renderer.outputColorSpace=Cs,this.renderer.toneMapping=Ni,this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=Y0,this.renderer.autoClear=!0,this.renderer.info.autoReset=!1,this.camera=new Wn(50,16/9,.4,6e4),i2(this.camera),this.atmos=new Qv(e.seed),e.time!==null&&(this.atmos.hour=e.time),e.weather&&this.atmos.setWeather(e.weather),this.metrics=new ow(this.renderer)}renderer;scene=new or;camera;atmos;quality;metrics;map;textures;terrain;water;sky;wakes;csm;post;roads;bridges;city;vegetation;props;traffic;aircraft;flightCamera;cull=new Hu;width=1;height=1;time=0;envTimer=0;lastEnvHour=-1;lastEnvWeather="";litMaterials=new Set;windVec=new C;registerLit(t){if(this.litMaterials.has(t))return;this.litMaterials.add(t);const e=t.onBeforeCompile;this.csm.setupMaterial(t);const n=t.onBeforeCompile;t.onBeforeCompile=(i,o)=>{n.call(t,i,o),e?.call(t,i,o)},t.needsUpdate=!0}registerTree(t){t.traverse(e=>{const n=e.material;if(n)for(const i of Array.isArray(n)?n:[n])i.isMeshStandardMaterial&&this.registerLit(i)})}async tick(t,e,n){t(e,n),await new Promise(i=>setTimeout(i,0))}async init(t){await this.tick(t,"Surveying the coastline",.02),this.map=new mx,this.map.generate(h=>t("Shaping islands and bays",.02+h*.3)),await this.tick(t,"Uploading terrain",.33),this.textures=new Tx(this.map,this.renderer);const e=this.quality;this.csm=new Yv({camera:this.camera,parent:this.scene,cascades:e.cascades,maxFar:e.shadowFar,mode:"practical",shadowMapSize:e.shadowMapSize,lightDirection:new C(.3,-1,.2).normalize(),lightIntensity:1,shadowBias:-2e-4,lightMargin:300}),this.csm.fade=!0,o2(this.renderer,h=>this.csm.lights.indexOf(h)),this.sky=new Ax(this.atmos,this.renderer,{cloudSteps:e.cloudSteps,scale:e.skyScale}),this.sky.dome.name="sky",this.scene.add(this.sky.dome),this.wakes=new Vx(2048,3200),this.terrain=new zx(this.textures),this.registerLit(this.terrain.material),this.terrain.group.name="terrain",this.scene.add(this.terrain.group),this.water=new Gx(this.textures,this.wakes.texture),this.registerLit(this.water.material),this.water.mesh.name="water",this.scene.add(this.water.mesh),await this.tick(t,"Laying out streets",.4);const n=Kx(this.map);this.roads=n.segments;const i=e2();this.registerLit(i);const o=this.params.debugRoads?new _c({color:16719904}):i;for(const h of t2(this.map,this.roads,o))h.name="roads",this.scene.add(h);await this.tick(t,"Raising bridges",.46);const r=new ce({color:12104874,roughness:.9}),a=new ce({color:14278114,roughness:.4,metalness:.6});this.registerLit(r),this.registerLit(a),this.bridges=C2(this.map,o,r,a),this.bridges.group.name="bridges",this.scene.add(this.bridges.group),await this.tick(t,"Building the city",.52),this.city=k2(this.map,n.blocksByDistrict,this.atmos.uniforms.uNight),this.registerLit(this.city.batches.material),this.city.batches.group.name="city",this.scene.add(this.city.batches.group);for(const h of this.roads){const d=Math.hypot(h.b[0]-h.a[0],h.b[1]-h.a[1]),u=Math.max(1,Math.ceil(d/10));for(let g=0;g<=u;g++)this.city.markOccupied(h.a[0]+(h.b[0]-h.a[0])*(g/u),h.a[1]+(h.b[1]-h.a[1])*(g/u),h.width*.5+3)}await this.tick(t,"Dressing harbours and airports",.66),this.props=new __(this.map,this.roads,this.bridges.lampPositions,this.city.markOccupied);for(const h of this.props.materials)this.registerLit(h);this.props.group.name="props",this.scene.add(this.props.group),await this.tick(t,"Planting palms and mangroves",.74),this.vegetation=new d_(this.map,this.city.occupied);for(const h of this.vegetation.materials)this.registerLit(h);this.vegetation.group.name="vegetation",this.scene.add(this.vegetation.group),await this.tick(t,"Launching boats and traffic",.86),this.traffic=new E_(this.map,this.roads,this.bridges.routes,this.wakes.scene,this.params.seed,this.props.mooredBoatPositions);for(const h of this.traffic.materials)this.registerLit(h);this.traffic.group.name="traffic",this.scene.add(this.traffic.group);for(const h of this.traffic.contrailMeshes)h.name="contrail",this.scene.add(h);await this.tick(t,"Pre-flighting the aircraft",.92),this.aircraft=new iw((h,d)=>this.map.heightAt(h,d),this.scene,this.wakes.scene),this.registerTree(this.aircraft.model.root),this.flightCamera=new sw(this.camera),this.flightCamera.groundHeight=(h,d)=>Math.max(0,this.map.heightAt(h,d));const l=this.map.pois.find(h=>h.kind==="seaplane");this.aircraft.place(l.x+120,1.6,l.z+60,0,0,0,0,0),this.post=new Zx(this.renderer,this.atmos,{samples:e.samples,bloom:e.bloom});const c=this.params.dbg;c.has("noterrain")&&(this.terrain.group.visible=!1),c.has("noshadow")&&(this.renderer.shadowMap.enabled=!1),c.has("noveg")&&(this.vegetation.group.visible=!1),c.has("nocity")&&(this.city.batches.group.visible=!1),c.has("nocloudshadow")&&(this.post.cloudShadowStrength=0),this.atmos.update(0),this.refreshEnvironment(),await this.tick(t,"Compiling shaders",.97),this.warmShaders(),t("Ready",1)}warmShaders(){const t=this.aircraft.flight,e={p:t.position.clone(),q:t.quaternion.clone(),v:t.velocity.clone(),w:t.omega.clone(),rpm:t.rpm,thr:this.aircraft.inputs.throttle},n=t.position.y;this.aircraft.place(t.position.x,n,t.position.z,Math.PI*.5,0,0,14,1),this.aircraft.inputs.throttle=1;const i=this.camera.position.clone(),o=this.camera.quaternion.clone();this.flightCamera.snap();for(let a=0;a<3;a++)this.update(1/30,!0),this.flightCamera.update(t,this.aircraft.model,1/30);this.render(),this.aircraft.place(t.position.x,60,t.position.z,Math.PI*.5,.05,.1,50,1),this.aircraft.inputs.throttle=1;for(let a=0;a<3;a++)this.update(1/30,!0),this.flightCamera.update(t,this.aircraft.model,1/30);this.render();const r=[];this.scene.traverse(a=>{a.visible||(a.visible=!0,r.push(a))});try{this.renderer.compile(this.scene,this.camera)}finally{for(const a of r)a.visible=!1}this.aircraft.place(e.p.x,e.p.y,e.p.z,Math.PI*.5,0,0,0,e.thr),t.quaternion.copy(e.q),t.velocity.copy(e.v),t.omega.copy(e.w),t.rpm=e.rpm,this.aircraft.syncModel(),this.camera.position.copy(i),this.camera.quaternion.copy(o),this.flightCamera.snap(),this.time=0}refreshEnvironment(){const t=this.sky.updateEnvironment();this.scene.environment=t,this.scene.environmentIntensity=this.atmos.state.ambientIntensity,this.lastEnvHour=this.atmos.hour,this.lastEnvWeather=this.atmos.weather}setSize(t,e,n=1){this.width=t,this.height=e,this.renderer.setPixelRatio(n),this.renderer.setSize(t,e,!1),this.camera.aspect=t/e,this.camera.updateProjectionMatrix(),this.post.setSize(Math.round(t*n),Math.round(e*n)),this.csm.updateFrustums()}update(t,e=!0){this.time+=t,this.atmos.update(t);const n=this.atmos.state;this.csm.lightDirection.copy(n.sunDir).negate();for(const o of this.csm.lights)o.intensity=n.sunIntensity,o.color.copy(n.sunColor);this.envTimer+=t,(Math.abs(this.atmos.hour-this.lastEnvHour)>.02||this.atmos.weather!==this.lastEnvWeather||this.envTimer>120)&&(this.envTimer=0,this.refreshEnvironment()),this.scene.environmentIntensity=n.ambientIntensity;const i=this.atmos.preset;this.windVec.set(this.atmos.windDir.x,0,this.atmos.windDir.y).multiplyScalar(i.windSpeed),this.vegetation.update(this.time,i.windSpeed),this.traffic.update(t,this.time,n.night),this.props.setNight(n.night),this.aircraft.update(t,this.time,n.night,this.windVec,i.turbulence,this.height,e)}render(){this.metrics.beginFrame(),this.renderer.info.reset();const t=this.camera;t.updateMatrixWorld();const e=t.position.x,n=t.position.z,i=Math.min(12e3,Math.max(this.quality.shadowFar,t.position.y*9));Math.abs(i-this.csm.maxFar)>200&&(this.csm.maxFar=i,this.csm.updateFrustums()),this.cull.update(t,this.csm.maxFar,this.atmos.state.sunDir),this.terrain.update(e,n),this.vegetation.updateLod(e,n,this.cull),this.city.batches.updateLod(e,n,this.cull),this.props.updateLod(e,n,this.cull),this.traffic.updateCulling(this.cull),this.water.update(e,n,this.time,this.atmos.preset.windSpeed,this.atmos.windDir,this.atmos.state.sunDir,this.wakes.center,this.wakes.size),this.wakes.render(this.renderer,e,n),this.csm.update();for(const o of this.csm.lights){const r=o.shadow.camera,a=(r.right-r.left)/o.shadow.mapSize.width;o.shadow.normalBias=a*.6,o.shadow.bias=-3e-4}this.sky.render(this.renderer,t,this.post.width,this.post.height),this.renderer.setRenderTarget(this.post.target),this.renderer.render(this.scene,t),this.post.finish(t,this.time),this.metrics.endFrame()}}const lw=.22,cw=.15;function vl(s,t,e){const n=Math.abs(t)<Math.abs(s)-1e-6&&(t===0||Math.sign(t)===Math.sign(s)),i=e/(n?cw:lw),o=t-s;return Math.abs(o)<=i?t:s+Math.sign(o)*i}class hw{constructor(t){this.canvas=t,window.addEventListener("keydown",e=>{e.repeat||(this.keys.add(e.code),this.pressed.add(e.code),["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)&&e.preventDefault())}),window.addEventListener("keyup",e=>this.keys.delete(e.code)),window.addEventListener("blur",()=>this.keys.clear()),t.addEventListener("mousedown",e=>{this.dragging=!0,this.lastX=e.clientX,this.lastY=e.clientY}),window.addEventListener("mouseup",()=>{this.dragging=!1}),window.addEventListener("mousemove",e=>{this.dragging&&(this.orbitYaw-=(e.clientX-this.lastX)*.006,this.orbitPitch+=(e.clientY-this.lastY)*.005,this.orbitPitch=Math.max(-1.2,Math.min(1.2,this.orbitPitch)),this.lastX=e.clientX,this.lastY=e.clientY)}),t.addEventListener("wheel",e=>{this.flight.throttle=Math.max(0,Math.min(1,this.flight.throttle-Math.sign(e.deltaY)*.05)),e.preventDefault()},{passive:!1})}keys=new Set;flight={throttle:0,pitch:0,roll:0,yaw:0,flaps:0,brake:!1};targetPitch=0;targetRoll=0;targetYaw=0;cmdPitch=0;cmdRoll=0;cmdYaw=0;orbitYaw=0;orbitPitch=0;dragging=!1;lastX=0;lastY=0;pressed=new Set;enabled=!0;down(t){return this.keys.has(t)}consume(t){const e=this.pressed.has(t);return this.pressed.delete(t),e}update(t){if(!this.enabled){this.pressed.clear();return}const e=this.flight,n=(l,c)=>(this.down(l)?1:0)-(this.down(c)?1:0);this.targetPitch=n("KeyS","KeyW")+n("ArrowDown","ArrowUp"),this.targetRoll=n("KeyD","KeyA")+n("ArrowRight","ArrowLeft"),this.targetYaw=n("KeyE","KeyQ");const i=navigator.getGamepads?navigator.getGamepads():[],o=i&&i[0];if(o){const l=c=>Math.abs(c)<.08?0:c;this.targetRoll+=l(o.axes[0]??0),this.targetPitch+=l(o.axes[1]??0),this.targetYaw+=l(o.axes[2]??0),o.buttons[7]?.value&&(e.throttle=Math.min(1,e.throttle+o.buttons[7].value*t*.8)),o.buttons[6]?.value&&(e.throttle=Math.max(0,e.throttle-o.buttons[6].value*t*.8))}const r=l=>Math.max(-1,Math.min(1,l));this.cmdPitch=vl(this.cmdPitch,r(this.targetPitch),t),this.cmdRoll=vl(this.cmdRoll,r(this.targetRoll),t),this.cmdYaw=vl(this.cmdYaw,r(this.targetYaw),t);const a=1-Math.exp(-t*25);e.pitch+=(this.cmdPitch-e.pitch)*a,e.roll+=(this.cmdRoll-e.roll)*a,e.yaw+=(this.cmdYaw-e.yaw)*a,(this.down("ShiftLeft")||this.down("ShiftRight"))&&(e.throttle=Math.min(1,e.throttle+t*.55)),(this.down("ControlLeft")||this.down("ControlRight"))&&(e.throttle=Math.max(0,e.throttle-t*.55)),this.consume("KeyF")&&(e.flaps=e.flaps>.5?0:e.flaps>0?1:.5),e.brake=this.down("KeyB")||this.down("Space"),this.dragging||(this.orbitYaw*=Math.exp(-t*2.2),this.orbitPitch*=Math.exp(-t*2.2))}}const Gn=s=>document.getElementById(s);class uw{root=Gn("hud");speed=Gn("hud-speed-val");alt=Gn("hud-alt-val");vs=Gn("hud-vs-val");heading=Gn("hud-heading-val");card=Gn("hud-heading-card");thrFill=Gn("hud-throttle-fill");thrVal=Gn("hud-throttle-val");rpm=Gn("hud-rpm-val");stall=Gn("hud-stall");msg=Gn("hud-msg");cam=Gn("hud-cam");time=Gn("hud-time");visible=!0;msgTimer=0;wasCrashed=!1;show(t){this.visible=t,this.root.classList.toggle("hidden",!t)}toggle(){this.show(!this.visible)}flash(t,e=2.5){this.msg.textContent=t,this.msgTimer=e}update(t,e,n,i,o){if(!this.visible)return;this.speed.textContent=Math.round(t.airspeed*1.9438).toString(),this.alt.textContent=Math.round(t.altitude*3.2808).toString();const r=Math.round(t.verticalSpeed*196.85/50)*50;this.vs.textContent=(r>0?"+":"")+r.toString();const a=Math.round(t.heading)%360;this.heading.textContent=a.toString().padStart(3,"0");const l=["N","NE","E","SE","S","SW","W","NW"];this.card.textContent=l[Math.round(a/45)%8],this.thrFill.style.width=`${Math.round(e*100)}%`,this.thrVal.textContent=`${Math.round(e*100)}%`,this.rpm.textContent=Math.round(600+t.rpm*2e3).toString(),this.stall.classList.toggle("hidden",!t.stalled),t.crashed&&!this.wasCrashed&&this.flash("Crashed — aircraft reset upright on the surface. Throttle up to go again.",5),this.wasCrashed=t.crashed,this.cam.textContent=n.toUpperCase();const c=Math.floor(i)%24,h=Math.floor(i%1*60);this.time.textContent=`${c.toString().padStart(2,"0")}:${h.toString().padStart(2,"0")}`,this.msgTimer>0&&(this.msgTimer-=o,this.msgTimer<=0&&(this.msg.textContent=""))}}const Bc=[{id:"aerial-a",name:"Reference A — high aerial",description:"Reference-style wide aerial over Isla Garza looking north: causeway receding NNE, downtown skyline upper-left, boats with wakes below, aircraft lower right.",time:14.6,weather:"scattered",camera:{mode:"fixed",pos:[480,400,3720],headingDeg:-6,pitchDeg:-11,fov:42},plane:{fromCamera:{screenX:.76,screenY:.74,distance:50},headingDeg:200,pitchDeg:2,bankDeg:-24,speed:52,throttle:.75},presim:40,clipInputs:{pitch:.05,roll:-.05,yaw:0}},{id:"cockpit-city",name:"Cockpit approaching the city",description:"From the pilot seat, downtown ahead beyond the bay, instrument panel and windshield frame in view.",time:10.5,weather:"clear",camera:{mode:"cockpit",fov:50},plane:{pos:[-900,320,1400],headingDeg:342,pitchDeg:1,bankDeg:0,speed:58,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"bridge-low",name:"Low-altitude bridge flyover",description:"Chase view 45 m over the northern causeway arch, traffic on the deck, piers meeting the water.",time:15.5,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[-1950,52,-3740],headingDeg:96,pitchDeg:0,bankDeg:4,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:.05,yaw:0}},{id:"skyline-high",name:"High-altitude skyline",description:"Fixed camera 900 m up over the bay looking north-west at the downtown skyline hierarchy, port in the middle distance.",time:16.2,weather:"scattered",camera:{mode:"fixed",pos:[-300,900,-1200],headingDeg:-38,pitchDeg:-10,fov:45},plane:{fromCamera:{screenX:.72,screenY:.68,distance:70},headingDeg:-30,pitchDeg:0,bankDeg:12,speed:60,throttle:.7},presim:30,clipInputs:{pitch:0,roll:.1,yaw:0}},{id:"island-pass",name:"Coastal island pass",description:"Low along the barrier island ocean beach: hotels left, surf and shallows right, dunes and palms below.",time:11.5,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[3350,130,-2200],headingDeg:352,pitchDeg:0,bankDeg:-6,speed:52,throttle:.65},presim:30,clipInputs:{pitch:0,roll:-.05,yaw:0}},{id:"harbor",name:"Harbor and marina pass",description:"Over the port: container cranes, cruise terminal, ship channel and the downtown marina beyond.",time:9.5,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[-2100,160,-2500],headingDeg:52,pitchDeg:0,bankDeg:0,speed:50,throttle:.65},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"water-landing",name:"Seaplane water approach",description:"Final approach a few metres above the Garza channel, floats about to touch: foam, wake and spray.",time:13,weather:"clear",camera:{mode:"chase",fov:48},plane:{pos:[-500,5.5,3330],headingDeg:86,pitchDeg:4,bankDeg:0,speed:29,throttle:.25,flaps:1},presim:30,clipInputs:{pitch:.12,roll:0,yaw:0}},{id:"sunset",name:"Sunset flight",description:"Low sun in the west over the bay, downtown silhouetted, warm haze and long water reflections.",time:17.9,weather:"scattered",camera:{mode:"chase",fov:50},plane:{pos:[1400,280,600],headingDeg:262,pitchDeg:1,bankDeg:0,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"cloudy",name:"Cloudy-weather flight",description:"Heavy cumulus and grey haze over Isla Garza; softer light, cloud shadows moving across the water.",time:15,weather:"cloudy",camera:{mode:"chase",fov:50},plane:{pos:[700,300,3100],headingDeg:335,pitchDeg:0,bankDeg:0,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"night",name:"Night flight with city lights",description:"Over the bay at 22:00 looking toward downtown: lit windows, street lamps, headlights and navigation strobes.",time:22,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[-400,320,-900],headingDeg:318,pitchDeg:0,bankDeg:0,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}}];Bc.push({id:"plane-rear-quarter",name:"Aircraft rear three-quarter",description:"Fixed camera 14 m from the aircraft, rear-left-above, aircraft moored at the Garza marina in sunlight.",time:14,weather:"clear",camera:{mode:"fixed",pos:[425.9,4.25,1892.3],headingDeg:205,pitchDeg:-9,fov:40},plane:{pos:[420,1.96,1905],headingDeg:240,pitchDeg:0,bankDeg:0,speed:0,throttle:0},presim:10,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"plane-front-quarter",name:"Aircraft front three-quarter",description:"Fixed camera 13 m ahead-right of the moored aircraft, low, showing cowl, propeller, windshield and floats.",time:10,weather:"clear",camera:{mode:"fixed",pos:[415.6,2.65,1917.2],headingDeg:20,pitchDeg:-3,fov:40},plane:{pos:[420,1.96,1905],headingDeg:240,pitchDeg:0,bankDeg:0,speed:0,throttle:0},presim:10,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"glass-sun",name:"Cockpit glass in direct sun",description:"Close on the windshield and left side windows with the sun behind the camera; interior visible through the glass.",time:15.5,weather:"clear",camera:{mode:"fixed",pos:[418.3,3.05,1911.3],headingDeg:15,pitchDeg:-8,fov:32},plane:{pos:[420,1.96,1905],headingDeg:240,pitchDeg:0,bankDeg:0,speed:0,throttle:0},presim:10,clipInputs:{pitch:0,roll:0,yaw:0}});function dw(s){return Bc.find(t=>t.id===s)}class fw{constructor(t){this.game=t}view=null;fixedDt=1/30;frame=0;flying=!1;list(){return Bc.map(t=>({id:t.id,name:t.name,description:t.description}))}setup(t){const e=dw(t);if(!e)return!1;this.view=e;const n=this.game;n.atmos.hour=e.time,n.atmos.setWeather(e.weather),n.time=0,this.placePlane(e);for(let i=0;i<Math.round(e.presim/this.fixedDt);i++)n.update(this.fixedDt,!1);return this.placePlane(e),this.setupCamera(e),n.aircraft.inputs.throttle=e.plane.throttle,n.aircraft.inputs.flaps=e.plane.flaps??0,n.aircraft.inputs.pitch=e.clipInputs.pitch,n.aircraft.inputs.roll=e.clipInputs.roll,n.aircraft.inputs.yaw=e.clipInputs.yaw,n.update(this.fixedDt,!1),this.updateCamera(this.fixedDt),this.flying=!1,this.frame=0,n.metrics.reset(),!0}placePlane(t){const e=this.game,n=t.plane;let i;if(n.fromCamera&&t.camera.pos){const r=this.fixedCamera(t),a=n.fromCamera.screenX*2-1,l=1-n.fromCamera.screenY*2,c=new C(a,l,.5).unproject(r).sub(r.position).normalize(),h=r.position.clone().addScaledVector(c,n.fromCamera.distance);i=[h.x,h.y,h.z]}else i=n.pos;const o=r=>r*Math.PI/180;e.aircraft.place(i[0],i[1],i[2],o(n.headingDeg),o(n.pitchDeg),o(n.bankDeg),n.speed,n.throttle)}fixedCamera(t){const e=new Wn(t.camera.fov,this.game.camera.aspect,.4,6e4),[n,i,o]=t.camera.pos;e.position.set(n,i,o);const r=(t.camera.headingDeg??0)*Math.PI/180,a=(t.camera.pitchDeg??0)*Math.PI/180;return e.rotation.set(0,0,0),e.rotation.order="YXZ",e.rotation.y=-r,e.rotation.x=a,e.updateMatrixWorld(),e.updateProjectionMatrix(),e}setupCamera(t){const e=this.game,n=e.flightCamera;if(n.baseFov=t.camera.fov,n.orbitPitch=0,n.orbitYaw=0,t.camera.mode==="fixed"){n.mode="fixed";const i=this.fixedCamera(t);e.camera.position.copy(i.position),e.camera.quaternion.copy(i.quaternion),e.camera.fov=t.camera.fov,e.camera.updateProjectionMatrix()}else{n.mode=t.camera.mode,n.snap();for(let i=0;i<120;i++)n.update(e.aircraft.flight,e.aircraft.model,this.fixedDt)}}updateCamera(t){this.game.flightCamera.update(this.game.aircraft.flight,this.game.aircraft.model,t)}onFrame=null;step(t=1){const e=this.game;for(let n=0;n<t;n++)e.update(this.fixedDt,!0),this.updateCamera(this.fixedDt),this.frame++;this.flying=!0,this.onFrame?.(),e.render()}render(){this.game.render()}renderSync(){const t=this.game.renderer.getContext(),e=performance.now();this.game.render(),t.finish();const n=new Uint8Array(4);return t.readPixels(0,0,1,1,t.RGBA,t.UNSIGNED_BYTE,n),performance.now()-e}profile(t=20){const e=[];for(let o=0;o<t;o++)this.game.update(this.fixedDt,!0),this.updateCamera(this.fixedDt),e.push(this.renderSync());const n=e.slice().sort((o,r)=>o-r),i=n.reduce((o,r)=>o+r,0)/n.length;return{frames:t,avgMs:i,minMs:n[0],maxMs:n[n.length-1],p95Ms:n[Math.floor(n.length*.95)],onePercentLowMs:n[n.length-1]}}metrics(){const t=this.game.metrics.snapshot(),e=this.game.aircraft.flight.telemetry;return{...t,frame:this.frame,flying:this.flying,telemetry:{airspeed:e.airspeed,altitude:e.altitude,heading:e.heading,alpha:e.alpha,stalled:e.stalled,onWater:e.onWater},build:window.__build,view:this.view?.id??null,camera:{pos:this.game.camera.position.toArray(),quat:this.game.camera.quaternion.toArray(),fov:this.game.camera.fov}}}project(t,e,n){const i=new C(t,e,n).project(this.game.camera);return i.z>1?null:[(i.x+1)/2,(1-i.y)/2]}landmarks(){const t=this.game,e=t.map.bridges.find(v=>v.id==="garza-bridge"),n=e.pts[0],i=e.pts[e.pts.length-1],o=t.aircraft.flight.position,r={planeCentroid:this.project(o.x,o.y,o.z),bridgeStart:this.project(n[0],7,n[1]),bridgeEnd:this.project(i[0],7,i[1])};for(const v of t.city.landmarkPositions)r[`landmark:${v.name}`]=this.project(v.x,v.h,v.z);const a=t.map.bridges.find(v=>v.id==="tortuga-bridge");a&&(r.bridge2End=this.project(a.pts[a.pts.length-1][0],7,a.pts[a.pts.length-1][1])),r.horizonCentre=this.project(t.camera.position.x+Math.sin(0)*5e4,0,t.camera.position.z-5e4);let l=1/0,c=1/0,h=-1/0,d=-1/0;const u=new C;t.aircraft.model.root.updateMatrixWorld(!0);for(const v of t.aircraft.model.exteriorMeshes){if(!v.visible)continue;const p=v.geometry.getAttribute("position");if(p)for(let m=0;m<p.count;m++){u.fromBufferAttribute(p,m).applyMatrix4(v.matrixWorld);const _=this.project(u.x,u.y,u.z);_&&(l=Math.min(l,_[0]),c=Math.min(c,_[1]),h=Math.max(h,_[0]),d=Math.max(d,_[1]))}}Number.isFinite(l)&&(r.planeBoxMin=[l,c],r.planeBoxMax=[h,d]);const g=new C(0,0,-1).applyQuaternion(t.camera.quaternion),f=new C(g.x,0,g.z).normalize().multiplyScalar(3e4).add(t.camera.position);return r.horizon=this.project(f.x,t.camera.position.y,f.z),r}}window.__build="4642d4630c87-20260904T235001Z";async function pw(){const s=nd(),t=document.getElementById("view"),e=document.getElementById("start-status"),n=document.getElementById("start-btn"),i=document.getElementById("start");n.disabled=!0;const o=new aw(t,s);window.__game=o;const r=(p,m)=>{e.textContent=`${p}… ${Math.round(m*100)}%`};await o.init(r);const a=()=>{const p=s.width??window.innerWidth,m=s.height??window.innerHeight;s.width&&(t.style.width=`${p}px`,t.style.height=`${m}px`),o.setSize(p,m,s.width?1:Math.min(window.devicePixelRatio,1.5))};window.addEventListener("resize",a),a();const l=new uw,c=new hw(t),h=new fw(o);if(window.__bench=h,e.textContent=`Build ${window.__build}`,n.disabled=!1,s.bench){if(i.classList.add("hidden"),l.show(!s.noHud),!h.setup(s.bench)){e.textContent=`Unknown bench view ${s.bench}`;return}const m=document.getElementById("benchtag");m.classList.remove("hidden"),m.textContent=`${s.bench} · seed ${s.seed} · ${window.__build}`,s.noHud&&m.classList.add("hidden");const _=()=>l.update(o.aircraft.flight.telemetry,o.aircraft.inputs.throttle,o.flightCamera.mode,o.atmos.hour,1/30);h.onFrame=_;const w=()=>{h.render(),_(),window.__ready=!0,window.__benchReady=!0,s.freeze||requestAnimationFrame(w)};w();return}let d=!1;const u=()=>{d||(d=!0,i.classList.add("hidden"),l.show(!0),c.flight.flaps=1,l.flash("Takeoff: hold Shift for full throttle, keep the nose straight with A/D, and at 50 KIAS hold S to lift off. F toggles flaps, V camera shake.",9),o.aircraft.inputs.throttle=0,o.flightCamera.mode="chase",o.flightCamera.snap())};n.addEventListener("click",u),window.addEventListener("keydown",p=>{p.code==="Enter"&&!d&&u()}),s.autostart&&u();let g=performance.now(),f=0;const v=()=>{const p=performance.now();let m=s.fixedDt??Math.min(.1,(p-g)/1e3);if(g=p,s.freeze&&(m=0),c.update(m),d){const x=c.flight,A=o.aircraft.inputs;if(A.throttle=x.throttle,A.pitch=x.pitch,A.roll=x.roll,A.yaw=x.yaw,A.flaps=x.flaps,A.brake=x.brake,c.consume("KeyC")&&(o.flightCamera.mode=o.flightCamera.mode==="chase"?"cockpit":"chase",o.flightCamera.snap()),c.consume("KeyV")){const M=o.flightCamera;M.shakeScale=M.shakeScale>.25?0:.5,l.flash(M.shakeScale>0?"Camera shake on":"Camera shake off")}if(c.consume("KeyH")&&l.toggle(),c.consume("KeyT")&&(o.atmos.hour=(o.atmos.hour+2)%24,l.flash(`Time ${Math.floor(o.atmos.hour)}:00`)),c.consume("KeyY")){const M=["clear","scattered","cloudy","storm"],S=(M.indexOf(o.atmos.weather)+1)%M.length;o.atmos.setWeather(M[S]),l.flash(`Weather: ${M[S]}`)}if(c.consume("KeyR")){const M=o.map.pois.find(S=>S.kind==="seaplane");o.aircraft.place(M.x+120,1.6,M.z+60,0,0,0,0,0),x.throttle=0,o.flightCamera.snap(),l.flash("Reset to the seaplane base")}c.consume("KeyG")&&(o.aircraft.place(o.aircraft.flight.position.x,350,o.aircraft.flight.position.z,Math.PI*.5,0,0,55,.7),x.throttle=.7,l.flash("Airborne at 350 m")),o.flightCamera.orbitYaw=c.orbitYaw,o.flightCamera.orbitPitch=c.orbitPitch}f+=m;const _=1/60;let w=0;for(;f>=_&&w<8;)o.update(_,d),f-=_,w++;w===8&&(f=0),o.flightCamera.update(o.aircraft.flight,o.aircraft.model,m),o.render(),l.update(o.aircraft.flight.telemetry,o.aircraft.inputs.throttle,o.flightCamera.mode,o.atmos.hour,m),window.__ready=!0,requestAnimationFrame(v)};o.update(0,!1),o.flightCamera.update(o.aircraft.flight,o.aircraft.model,1/60),v()}pw().catch(s=>{console.error(s);const t=document.getElementById("start-status");t&&(t.textContent=`Failed to start: ${s.message}`)});
