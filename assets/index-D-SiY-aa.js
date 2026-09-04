(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function e(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(i){if(i.ep)return;i.ep=!0;const r=e(i);fetch(i.href,r)}})();function fu(){const s=new URLSearchParams(window.location.search),t=n=>{const i=s.get(n);if(i===null||i==="")return null;if(i.includes("/")){const[o,a]=i.split("/").map(Number);return a?o/a:null}const r=Number(i);return Number.isFinite(r)?r:null},e=s.get("quality")??"high";return{bench:s.get("bench"),seed:t("seed")??20260904,time:t("time"),weather:s.get("weather")??null,quality:["low","medium","high","ultra"].includes(e)?e:"high",freeze:s.get("freeze")==="1",fixedDt:t("dt"),noHud:s.get("nohud")==="1",width:t("w"),height:t("h"),autostart:s.get("autostart")==="1"||s.get("bench")!==null,grid:s.get("grid")==="1",debug:s.get("debug")==="1",debugRoads:s.get("debugroads")==="1",dbg:new Set((s.get("dbg")??"").split(",").filter(Boolean))}}/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const ic="170",pu=0,Tc=1,mu=2,hh=1,uh=2,Gn=3,Zn=0,Ze=1,Be=2,di=0,qn=1,Ac=2,Cc=3,Rc=4,gu=5,Ci=100,vu=101,xu=102,_u=103,yu=104,wu=200,Mu=201,Su=202,bu=203,aa=204,ca=205,Eu=206,Tu=207,Au=208,Cu=209,Ru=210,Pu=211,Lu=212,Du=213,Iu=214,la=0,ha=1,ua=2,us=3,da=4,fa=5,pa=6,ma=7,dh=0,zu=1,Uu=2,Yn=0,Nu=1,Fu=2,Ou=3,Bu=4,ku=5,Hu=6,Gu=7,fh=300,ds=301,fs=302,ga=303,va=304,so=306,ps=1e3,wn=1001,xa=1002,sn=1003,Vu=1004,xr=1005,ve=1006,uo=1007,ui=1008,vn=1009,ph=1010,mh=1011,nr=1012,sc=1013,Kn=1014,gn=1015,Cn=1016,rc=1017,oc=1018,ms=1020,gh=35902,vh=1021,xh=1022,je=1023,_h=1024,yh=1025,as=1026,gs=1027,ir=1028,ro=1029,wh=1030,ac=1031,cc=1033,$r=33776,jr=33777,Zr=33778,Kr=33779,_a=35840,ya=35841,wa=35842,Ma=35843,Sa=36196,ba=37492,Ea=37496,Ta=37808,Aa=37809,Ca=37810,Ra=37811,Pa=37812,La=37813,Da=37814,Ia=37815,za=37816,Ua=37817,Na=37818,Fa=37819,Oa=37820,Ba=37821,Jr=36492,ka=36494,Ha=36495,Mh=36283,Ga=36284,Va=36285,Wa=36286,Wu=3200,Sh=3201,bh=0,Xu=1,In="",nn="srgb",Ni="srgb-linear",oo="linear",_e="srgb",Oi=7680,Pc=519,qu=512,Yu=513,$u=514,Eh=515,ju=516,Zu=517,Ku=518,Ju=519,Lc=35044,Dc=35048,Ic="300 es",Xn=2e3,eo=2001;class Ss{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){if(this._listeners===void 0)return!1;const n=this._listeners;return n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){if(this._listeners===void 0)return;const i=this._listeners[t];if(i!==void 0){const r=i.indexOf(e);r!==-1&&i.splice(r,1)}}dispatchEvent(t){if(this._listeners===void 0)return;const n=this._listeners[t.type];if(n!==void 0){t.target=this;const i=n.slice(0);for(let r=0,o=i.length;r<o;r++)i[r].call(this,t);t.target=null}}}const Xe=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let zc=1234567;const js=Math.PI/180,sr=180/Math.PI;function bs(){const s=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Xe[s&255]+Xe[s>>8&255]+Xe[s>>16&255]+Xe[s>>24&255]+"-"+Xe[t&255]+Xe[t>>8&255]+"-"+Xe[t>>16&15|64]+Xe[t>>24&255]+"-"+Xe[e&63|128]+Xe[e>>8&255]+"-"+Xe[e>>16&255]+Xe[e>>24&255]+Xe[n&255]+Xe[n>>8&255]+Xe[n>>16&255]+Xe[n>>24&255]).toLowerCase()}function ze(s,t,e){return Math.max(t,Math.min(e,s))}function lc(s,t){return(s%t+t)%t}function Qu(s,t,e,n,i){return n+(s-t)*(i-n)/(e-t)}function td(s,t,e){return s!==t?(e-s)/(t-s):0}function Zs(s,t,e){return(1-e)*s+e*t}function ed(s,t,e,n){return Zs(s,t,1-Math.exp(-e*n))}function nd(s,t=1){return t-Math.abs(lc(s,t*2)-t)}function id(s,t,e){return s<=t?0:s>=e?1:(s=(s-t)/(e-t),s*s*(3-2*s))}function sd(s,t,e){return s<=t?0:s>=e?1:(s=(s-t)/(e-t),s*s*s*(s*(s*6-15)+10))}function rd(s,t){return s+Math.floor(Math.random()*(t-s+1))}function od(s,t){return s+Math.random()*(t-s)}function ad(s){return s*(.5-Math.random())}function cd(s){s!==void 0&&(zc=s);let t=zc+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function ld(s){return s*js}function hd(s){return s*sr}function ud(s){return(s&s-1)===0&&s!==0}function dd(s){return Math.pow(2,Math.ceil(Math.log(s)/Math.LN2))}function fd(s){return Math.pow(2,Math.floor(Math.log(s)/Math.LN2))}function pd(s,t,e,n,i){const r=Math.cos,o=Math.sin,a=r(e/2),c=o(e/2),l=r((t+n)/2),h=o((t+n)/2),d=r((t-n)/2),u=o((t-n)/2),f=r((n-t)/2),p=o((n-t)/2);switch(i){case"XYX":s.set(a*h,c*d,c*u,a*l);break;case"YZY":s.set(c*u,a*h,c*d,a*l);break;case"ZXZ":s.set(c*d,c*u,a*h,a*l);break;case"XZX":s.set(a*h,c*p,c*f,a*l);break;case"YXY":s.set(c*f,a*h,c*p,a*l);break;case"ZYZ":s.set(c*p,c*f,a*h,a*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+i)}}function ns(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("Invalid component type.")}}function tn(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("Invalid component type.")}}const Di={DEG2RAD:js,RAD2DEG:sr,generateUUID:bs,clamp:ze,euclideanModulo:lc,mapLinear:Qu,inverseLerp:td,lerp:Zs,damp:ed,pingpong:nd,smoothstep:id,smootherstep:sd,randInt:rd,randFloat:od,randFloatSpread:ad,seededRandom:cd,degToRad:ld,radToDeg:hd,isPowerOfTwo:ud,ceilPowerOfTwo:dd,floorPowerOfTwo:fd,setQuaternionFromProperEuler:pd,normalize:tn,denormalize:ns};class Ut{constructor(t=0,e=0){Ut.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,n=this.y,i=t.elements;return this.x=i[0]*e+i[3]*n+i[6],this.y=i[1]*e+i[4]*n+i[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(ze(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const n=Math.cos(e),i=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*n-o*i+t.x,this.y=r*i+o*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class he{constructor(t,e,n,i,r,o,a,c,l){he.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,i,r,o,a,c,l)}set(t,e,n,i,r,o,a,c,l){const h=this.elements;return h[0]=t,h[1]=i,h[2]=a,h[3]=e,h[4]=r,h[5]=c,h[6]=n,h[7]=o,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,i=e.elements,r=this.elements,o=n[0],a=n[3],c=n[6],l=n[1],h=n[4],d=n[7],u=n[2],f=n[5],p=n[8],x=i[0],g=i[3],m=i[6],y=i[1],w=i[4],v=i[7],T=i[2],M=i[5],E=i[8];return r[0]=o*x+a*y+c*T,r[3]=o*g+a*w+c*M,r[6]=o*m+a*v+c*E,r[1]=l*x+h*y+d*T,r[4]=l*g+h*w+d*M,r[7]=l*m+h*v+d*E,r[2]=u*x+f*y+p*T,r[5]=u*g+f*w+p*M,r[8]=u*m+f*v+p*E,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[1],i=t[2],r=t[3],o=t[4],a=t[5],c=t[6],l=t[7],h=t[8];return e*o*h-e*a*l-n*r*h+n*a*c+i*r*l-i*o*c}invert(){const t=this.elements,e=t[0],n=t[1],i=t[2],r=t[3],o=t[4],a=t[5],c=t[6],l=t[7],h=t[8],d=h*o-a*l,u=a*c-h*r,f=l*r-o*c,p=e*d+n*u+i*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);const x=1/p;return t[0]=d*x,t[1]=(i*l-h*n)*x,t[2]=(a*n-i*o)*x,t[3]=u*x,t[4]=(h*e-i*c)*x,t[5]=(i*r-a*e)*x,t[6]=f*x,t[7]=(n*c-l*e)*x,t[8]=(o*e-n*r)*x,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,i,r,o,a){const c=Math.cos(r),l=Math.sin(r);return this.set(n*c,n*l,-n*(c*o+l*a)+o+t,-i*l,i*c,-i*(-l*o+c*a)+a+e,0,0,1),this}scale(t,e){return this.premultiply(fo.makeScale(t,e)),this}rotate(t){return this.premultiply(fo.makeRotation(-t)),this}translate(t,e){return this.premultiply(fo.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,n=t.elements;for(let i=0;i<9;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const fo=new he;function Th(s){for(let t=s.length-1;t>=0;--t)if(s[t]>=65535)return!0;return!1}function no(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function md(){const s=no("canvas");return s.style.display="block",s}const Uc={};function Xs(s){s in Uc||(Uc[s]=!0,console.warn(s))}function gd(s,t,e){return new Promise(function(n,i){function r(){switch(s.clientWaitSync(t,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:i();break;case s.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}function vd(s){const t=s.elements;t[2]=.5*t[2]+.5*t[3],t[6]=.5*t[6]+.5*t[7],t[10]=.5*t[10]+.5*t[11],t[14]=.5*t[14]+.5*t[15]}function xd(s){const t=s.elements;t[11]===-1?(t[10]=-t[10]-1,t[14]=-t[14]):(t[10]=-t[10],t[14]=-t[14]+1)}const me={enabled:!0,workingColorSpace:Ni,spaces:{},convert:function(s,t,e){return this.enabled===!1||t===e||!t||!e||(this.spaces[t].transfer===_e&&(s.r=$n(s.r),s.g=$n(s.g),s.b=$n(s.b)),this.spaces[t].primaries!==this.spaces[e].primaries&&(s.applyMatrix3(this.spaces[t].toXYZ),s.applyMatrix3(this.spaces[e].fromXYZ)),this.spaces[e].transfer===_e&&(s.r=cs(s.r),s.g=cs(s.g),s.b=cs(s.b))),s},fromWorkingColorSpace:function(s,t){return this.convert(s,this.workingColorSpace,t)},toWorkingColorSpace:function(s,t){return this.convert(s,t,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===In?oo:this.spaces[s].transfer},getLuminanceCoefficients:function(s,t=this.workingColorSpace){return s.fromArray(this.spaces[t].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,t,e){return s.copy(this.spaces[t].toXYZ).multiply(this.spaces[e].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace}};function $n(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function cs(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}const Nc=[.64,.33,.3,.6,.15,.06],Fc=[.2126,.7152,.0722],Oc=[.3127,.329],Bc=new he().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),kc=new he().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);me.define({[Ni]:{primaries:Nc,whitePoint:Oc,transfer:oo,toXYZ:Bc,fromXYZ:kc,luminanceCoefficients:Fc,workingColorSpaceConfig:{unpackColorSpace:nn},outputColorSpaceConfig:{drawingBufferColorSpace:nn}},[nn]:{primaries:Nc,whitePoint:Oc,transfer:_e,toXYZ:Bc,fromXYZ:kc,luminanceCoefficients:Fc,outputColorSpaceConfig:{drawingBufferColorSpace:nn}}});let Bi;class _d{static getDataURL(t){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let e;if(t instanceof HTMLCanvasElement)e=t;else{Bi===void 0&&(Bi=no("canvas")),Bi.width=t.width,Bi.height=t.height;const n=Bi.getContext("2d");t instanceof ImageData?n.putImageData(t,0,0):n.drawImage(t,0,0,t.width,t.height),e=Bi}return e.width>2048||e.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",t),e.toDataURL("image/jpeg",.6)):e.toDataURL("image/png")}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=no("canvas");e.width=t.width,e.height=t.height;const n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);const i=n.getImageData(0,0,t.width,t.height),r=i.data;for(let o=0;o<r.length;o++)r[o]=$n(r[o]/255)*255;return n.putImageData(i,0,0),e}else if(t.data){const e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor($n(e[n]/255)*255):e[n]=$n(e[n]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let yd=0;class Ah{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:yd++}),this.uuid=bs(),this.data=t,this.dataReady=!0,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let r;if(Array.isArray(i)){r=[];for(let o=0,a=i.length;o<a;o++)i[o].isDataTexture?r.push(po(i[o].image)):r.push(po(i[o]))}else r=po(i);n.url=r}return e||(t.images[this.uuid]=n),n}}function po(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?_d.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let wd=0;class Ke extends Ss{constructor(t=Ke.DEFAULT_IMAGE,e=Ke.DEFAULT_MAPPING,n=wn,i=wn,r=ve,o=ui,a=je,c=vn,l=Ke.DEFAULT_ANISOTROPY,h=In){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:wd++}),this.uuid=bs(),this.name="",this.source=new Ah(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=r,this.minFilter=o,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=c,this.offset=new Ut(0,0),this.repeat=new Ut(1,1),this.center=new Ut(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new he,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==fh)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case ps:t.x=t.x-Math.floor(t.x);break;case wn:t.x=t.x<0?0:1;break;case xa:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case ps:t.y=t.y-Math.floor(t.y);break;case wn:t.y=t.y<0?0:1;break;case xa:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}Ke.DEFAULT_IMAGE=null;Ke.DEFAULT_MAPPING=fh;Ke.DEFAULT_ANISOTROPY=1;class be{constructor(t=0,e=0,n=0,i=1){be.prototype.isVector4=!0,this.x=t,this.y=e,this.z=n,this.w=i}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,i){return this.x=t,this.y=e,this.z=n,this.w=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,n=this.y,i=this.z,r=this.w,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*i+o[12]*r,this.y=o[1]*e+o[5]*n+o[9]*i+o[13]*r,this.z=o[2]*e+o[6]*n+o[10]*i+o[14]*r,this.w=o[3]*e+o[7]*n+o[11]*i+o[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,i,r;const c=t.elements,l=c[0],h=c[4],d=c[8],u=c[1],f=c[5],p=c[9],x=c[2],g=c[6],m=c[10];if(Math.abs(h-u)<.01&&Math.abs(d-x)<.01&&Math.abs(p-g)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+x)<.1&&Math.abs(p+g)<.1&&Math.abs(l+f+m-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const w=(l+1)/2,v=(f+1)/2,T=(m+1)/2,M=(h+u)/4,E=(d+x)/4,b=(p+g)/4;return w>v&&w>T?w<.01?(n=0,i=.707106781,r=.707106781):(n=Math.sqrt(w),i=M/n,r=E/n):v>T?v<.01?(n=.707106781,i=0,r=.707106781):(i=Math.sqrt(v),n=M/i,r=b/i):T<.01?(n=.707106781,i=.707106781,r=0):(r=Math.sqrt(T),n=E/r,i=b/r),this.set(n,i,r,e),this}let y=Math.sqrt((g-p)*(g-p)+(d-x)*(d-x)+(u-h)*(u-h));return Math.abs(y)<.001&&(y=1),this.x=(g-p)/y,this.y=(d-x)/y,this.z=(u-h)/y,this.w=Math.acos((l+f+m-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this.w=Math.max(t.w,Math.min(e.w,this.w)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this.w=Math.max(t,Math.min(e,this.w)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Md extends Ss{constructor(t=1,e=1,n={}){super(),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=1,this.scissor=new be(0,0,t,e),this.scissorTest=!1,this.viewport=new be(0,0,t,e);const i={width:t,height:e,depth:1};n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:ve,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},n);const r=new Ke(i,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace);r.flipY=!1,r.generateMipmaps=n.generateMipmaps,r.internalFormat=n.internalFormat,this.textures=[];const o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0;this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.depthTexture=n.depthTexture,this.samples=n.samples}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let i=0,r=this.textures.length;i<r;i++)this.textures[i].image.width=t,this.textures[i].image.height=e,this.textures[i].image.depth=n;this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let n=0,i=t.textures.length;n<i;n++)this.textures[n]=t.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0;const e=Object.assign({},t.texture.image);return this.texture.source=new Ah(e),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class an extends Md{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}}class Ch extends Ke{constructor(t=null,e=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=sn,this.minFilter=sn,this.wrapR=wn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class Rh extends Ke{constructor(t=null,e=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=sn,this.minFilter=sn,this.wrapR=wn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Ae{constructor(t=0,e=0,n=0,i=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=i}static slerpFlat(t,e,n,i,r,o,a){let c=n[i+0],l=n[i+1],h=n[i+2],d=n[i+3];const u=r[o+0],f=r[o+1],p=r[o+2],x=r[o+3];if(a===0){t[e+0]=c,t[e+1]=l,t[e+2]=h,t[e+3]=d;return}if(a===1){t[e+0]=u,t[e+1]=f,t[e+2]=p,t[e+3]=x;return}if(d!==x||c!==u||l!==f||h!==p){let g=1-a;const m=c*u+l*f+h*p+d*x,y=m>=0?1:-1,w=1-m*m;if(w>Number.EPSILON){const T=Math.sqrt(w),M=Math.atan2(T,m*y);g=Math.sin(g*M)/T,a=Math.sin(a*M)/T}const v=a*y;if(c=c*g+u*v,l=l*g+f*v,h=h*g+p*v,d=d*g+x*v,g===1-a){const T=1/Math.sqrt(c*c+l*l+h*h+d*d);c*=T,l*=T,h*=T,d*=T}}t[e]=c,t[e+1]=l,t[e+2]=h,t[e+3]=d}static multiplyQuaternionsFlat(t,e,n,i,r,o){const a=n[i],c=n[i+1],l=n[i+2],h=n[i+3],d=r[o],u=r[o+1],f=r[o+2],p=r[o+3];return t[e]=a*p+h*d+c*f-l*u,t[e+1]=c*p+h*u+l*d-a*f,t[e+2]=l*p+h*f+a*u-c*d,t[e+3]=h*p-a*d-c*u-l*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,i){return this._x=t,this._y=e,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const n=t._x,i=t._y,r=t._z,o=t._order,a=Math.cos,c=Math.sin,l=a(n/2),h=a(i/2),d=a(r/2),u=c(n/2),f=c(i/2),p=c(r/2);switch(o){case"XYZ":this._x=u*h*d+l*f*p,this._y=l*f*d-u*h*p,this._z=l*h*p+u*f*d,this._w=l*h*d-u*f*p;break;case"YXZ":this._x=u*h*d+l*f*p,this._y=l*f*d-u*h*p,this._z=l*h*p-u*f*d,this._w=l*h*d+u*f*p;break;case"ZXY":this._x=u*h*d-l*f*p,this._y=l*f*d+u*h*p,this._z=l*h*p+u*f*d,this._w=l*h*d-u*f*p;break;case"ZYX":this._x=u*h*d-l*f*p,this._y=l*f*d+u*h*p,this._z=l*h*p-u*f*d,this._w=l*h*d+u*f*p;break;case"YZX":this._x=u*h*d+l*f*p,this._y=l*f*d+u*h*p,this._z=l*h*p-u*f*d,this._w=l*h*d-u*f*p;break;case"XZY":this._x=u*h*d-l*f*p,this._y=l*f*d-u*h*p,this._z=l*h*p+u*f*d,this._w=l*h*d+u*f*p;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const n=e/2,i=Math.sin(n);return this._x=t.x*i,this._y=t.y*i,this._z=t.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,n=e[0],i=e[4],r=e[8],o=e[1],a=e[5],c=e[9],l=e[2],h=e[6],d=e[10],u=n+a+d;if(u>0){const f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-c)*f,this._y=(r-l)*f,this._z=(o-i)*f}else if(n>a&&n>d){const f=2*Math.sqrt(1+n-a-d);this._w=(h-c)/f,this._x=.25*f,this._y=(i+o)/f,this._z=(r+l)/f}else if(a>d){const f=2*Math.sqrt(1+a-n-d);this._w=(r-l)/f,this._x=(i+o)/f,this._y=.25*f,this._z=(c+h)/f}else{const f=2*Math.sqrt(1+d-n-a);this._w=(o-i)/f,this._x=(r+l)/f,this._y=(c+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<Number.EPSILON?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(ze(this.dot(t),-1,1)))}rotateTowards(t,e){const n=this.angleTo(t);if(n===0)return this;const i=Math.min(1,e/n);return this.slerp(t,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const n=t._x,i=t._y,r=t._z,o=t._w,a=e._x,c=e._y,l=e._z,h=e._w;return this._x=n*h+o*a+i*l-r*c,this._y=i*h+o*c+r*a-n*l,this._z=r*h+o*l+n*c-i*a,this._w=o*h-n*a-i*c-r*l,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);const n=this._x,i=this._y,r=this._z,o=this._w;let a=o*t._w+n*t._x+i*t._y+r*t._z;if(a<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,a=-a):this.copy(t),a>=1)return this._w=o,this._x=n,this._y=i,this._z=r,this;const c=1-a*a;if(c<=Number.EPSILON){const f=1-e;return this._w=f*o+e*this._w,this._x=f*n+e*this._x,this._y=f*i+e*this._y,this._z=f*r+e*this._z,this.normalize(),this}const l=Math.sqrt(c),h=Math.atan2(l,a),d=Math.sin((1-e)*h)/l,u=Math.sin(e*h)/l;return this._w=o*d+this._w*u,this._x=n*d+this._x*u,this._y=i*d+this._y*u,this._z=r*d+this._z*u,this._onChangeCallback(),this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(i*Math.sin(t),i*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class P{constructor(t=0,e=0,n=0){P.prototype.isVector3=!0,this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Hc.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Hc.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,n=this.y,i=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*i,this.y=r[1]*e+r[4]*n+r[7]*i,this.z=r[2]*e+r[5]*n+r[8]*i,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,n=this.y,i=this.z,r=t.elements,o=1/(r[3]*e+r[7]*n+r[11]*i+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*i+r[12])*o,this.y=(r[1]*e+r[5]*n+r[9]*i+r[13])*o,this.z=(r[2]*e+r[6]*n+r[10]*i+r[14])*o,this}applyQuaternion(t){const e=this.x,n=this.y,i=this.z,r=t.x,o=t.y,a=t.z,c=t.w,l=2*(o*i-a*n),h=2*(a*e-r*i),d=2*(r*n-o*e);return this.x=e+c*l+o*d-a*h,this.y=n+c*h+a*l-r*d,this.z=i+c*d+r*h-o*l,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,n=this.y,i=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*i,this.y=r[1]*e+r[5]*n+r[9]*i,this.z=r[2]*e+r[6]*n+r[10]*i,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const n=t.x,i=t.y,r=t.z,o=e.x,a=e.y,c=e.z;return this.x=i*c-r*a,this.y=r*o-n*c,this.z=n*a-i*o,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return mo.copy(this).projectOnVector(t),this.sub(mo)}reflect(t){return this.sub(mo.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(ze(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y,i=this.z-t.z;return e*e+n*n+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){const i=Math.sin(e)*t;return this.x=i*Math.sin(n),this.y=Math.cos(e)*t,this.z=i*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),i=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=i,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const mo=new P,Hc=new Ae;class ke{constructor(t=new P(1/0,1/0,1/0),e=new P(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(bn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(bn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=bn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const n=t.geometry;if(n!==void 0){const r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,bn):bn.fromBufferAttribute(r,o),bn.applyMatrix4(t.matrixWorld),this.expandByPoint(bn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),_r.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),_r.copy(n.boundingBox)),_r.applyMatrix4(t.matrixWorld),this.union(_r)}const i=t.children;for(let r=0,o=i.length;r<o;r++)this.expandByObject(i[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,bn),bn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Ds),yr.subVectors(this.max,Ds),ki.subVectors(t.a,Ds),Hi.subVectors(t.b,Ds),Gi.subVectors(t.c,Ds),ii.subVectors(Hi,ki),si.subVectors(Gi,Hi),gi.subVectors(ki,Gi);let e=[0,-ii.z,ii.y,0,-si.z,si.y,0,-gi.z,gi.y,ii.z,0,-ii.x,si.z,0,-si.x,gi.z,0,-gi.x,-ii.y,ii.x,0,-si.y,si.x,0,-gi.y,gi.x,0];return!go(e,ki,Hi,Gi,yr)||(e=[1,0,0,0,1,0,0,0,1],!go(e,ki,Hi,Gi,yr))?!1:(wr.crossVectors(ii,si),e=[wr.x,wr.y,wr.z],go(e,ki,Hi,Gi,yr))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,bn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(bn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(zn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),zn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),zn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),zn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),zn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),zn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),zn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),zn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(zn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}const zn=[new P,new P,new P,new P,new P,new P,new P,new P],bn=new P,_r=new ke,ki=new P,Hi=new P,Gi=new P,ii=new P,si=new P,gi=new P,Ds=new P,yr=new P,wr=new P,vi=new P;function go(s,t,e,n,i){for(let r=0,o=s.length-3;r<=o;r+=3){vi.fromArray(s,r);const a=i.x*Math.abs(vi.x)+i.y*Math.abs(vi.y)+i.z*Math.abs(vi.z),c=t.dot(vi),l=e.dot(vi),h=n.dot(vi);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>a)return!1}return!0}const Sd=new ke,Is=new P,vo=new P;class Ce{constructor(t=new P,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const n=this.center;e!==void 0?n.copy(e):Sd.setFromPoints(t).getCenter(n);let i=0;for(let r=0,o=t.length;r<o;r++)i=Math.max(i,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(i),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Is.subVectors(t,this.center);const e=Is.lengthSq();if(e>this.radius*this.radius){const n=Math.sqrt(e),i=(n-this.radius)*.5;this.center.addScaledVector(Is,i/n),this.radius+=i}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(vo.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Is.copy(t.center).add(vo)),this.expandByPoint(Is.copy(t.center).sub(vo))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}}const Un=new P,xo=new P,Mr=new P,ri=new P,_o=new P,Sr=new P,yo=new P;class Ph{constructor(t=new P,e=new P(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Un)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=Un.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Un.copy(this.origin).addScaledVector(this.direction,e),Un.distanceToSquared(t))}distanceSqToSegment(t,e,n,i){xo.copy(t).add(e).multiplyScalar(.5),Mr.copy(e).sub(t).normalize(),ri.copy(this.origin).sub(xo);const r=t.distanceTo(e)*.5,o=-this.direction.dot(Mr),a=ri.dot(this.direction),c=-ri.dot(Mr),l=ri.lengthSq(),h=Math.abs(1-o*o);let d,u,f,p;if(h>0)if(d=o*c-a,u=o*a-c,p=r*h,d>=0)if(u>=-p)if(u<=p){const x=1/h;d*=x,u*=x,f=d*(d+o*u+2*a)+u*(o*d+u+2*c)+l}else u=r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*c)+l;else u=-r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*c)+l;else u<=-p?(d=Math.max(0,-(-o*r+a)),u=d>0?-r:Math.min(Math.max(-r,-c),r),f=-d*d+u*(u+2*c)+l):u<=p?(d=0,u=Math.min(Math.max(-r,-c),r),f=u*(u+2*c)+l):(d=Math.max(0,-(o*r+a)),u=d>0?r:Math.min(Math.max(-r,-c),r),f=-d*d+u*(u+2*c)+l);else u=o>0?-r:r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,d),i&&i.copy(xo).addScaledVector(Mr,u),f}intersectSphere(t,e){Un.subVectors(t.center,this.origin);const n=Un.dot(this.direction),i=Un.dot(Un)-n*n,r=t.radius*t.radius;if(i>r)return null;const o=Math.sqrt(r-i),a=n-o,c=n+o;return c<0?null:a<0?this.at(c,e):this.at(a,e)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){const n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,i,r,o,a,c;const l=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return l>=0?(n=(t.min.x-u.x)*l,i=(t.max.x-u.x)*l):(n=(t.max.x-u.x)*l,i=(t.min.x-u.x)*l),h>=0?(r=(t.min.y-u.y)*h,o=(t.max.y-u.y)*h):(r=(t.max.y-u.y)*h,o=(t.min.y-u.y)*h),n>o||r>i||((r>n||isNaN(n))&&(n=r),(o<i||isNaN(i))&&(i=o),d>=0?(a=(t.min.z-u.z)*d,c=(t.max.z-u.z)*d):(a=(t.max.z-u.z)*d,c=(t.min.z-u.z)*d),n>c||a>i)||((a>n||n!==n)&&(n=a),(c<i||i!==i)&&(i=c),i<0)?null:this.at(n>=0?n:i,e)}intersectsBox(t){return this.intersectBox(t,Un)!==null}intersectTriangle(t,e,n,i,r){_o.subVectors(e,t),Sr.subVectors(n,t),yo.crossVectors(_o,Sr);let o=this.direction.dot(yo),a;if(o>0){if(i)return null;a=1}else if(o<0)a=-1,o=-o;else return null;ri.subVectors(this.origin,t);const c=a*this.direction.dot(Sr.crossVectors(ri,Sr));if(c<0)return null;const l=a*this.direction.dot(_o.cross(ri));if(l<0||c+l>o)return null;const h=-a*ri.dot(yo);return h<0?null:this.at(h/o,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Yt{constructor(t,e,n,i,r,o,a,c,l,h,d,u,f,p,x,g){Yt.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,i,r,o,a,c,l,h,d,u,f,p,x,g)}set(t,e,n,i,r,o,a,c,l,h,d,u,f,p,x,g){const m=this.elements;return m[0]=t,m[4]=e,m[8]=n,m[12]=i,m[1]=r,m[5]=o,m[9]=a,m[13]=c,m[2]=l,m[6]=h,m[10]=d,m[14]=u,m[3]=f,m[7]=p,m[11]=x,m[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Yt().fromArray(this.elements)}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){const e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,n=t.elements,i=1/Vi.setFromMatrixColumn(t,0).length(),r=1/Vi.setFromMatrixColumn(t,1).length(),o=1/Vi.setFromMatrixColumn(t,2).length();return e[0]=n[0]*i,e[1]=n[1]*i,e[2]=n[2]*i,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*o,e[9]=n[9]*o,e[10]=n[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,n=t.x,i=t.y,r=t.z,o=Math.cos(n),a=Math.sin(n),c=Math.cos(i),l=Math.sin(i),h=Math.cos(r),d=Math.sin(r);if(t.order==="XYZ"){const u=o*h,f=o*d,p=a*h,x=a*d;e[0]=c*h,e[4]=-c*d,e[8]=l,e[1]=f+p*l,e[5]=u-x*l,e[9]=-a*c,e[2]=x-u*l,e[6]=p+f*l,e[10]=o*c}else if(t.order==="YXZ"){const u=c*h,f=c*d,p=l*h,x=l*d;e[0]=u+x*a,e[4]=p*a-f,e[8]=o*l,e[1]=o*d,e[5]=o*h,e[9]=-a,e[2]=f*a-p,e[6]=x+u*a,e[10]=o*c}else if(t.order==="ZXY"){const u=c*h,f=c*d,p=l*h,x=l*d;e[0]=u-x*a,e[4]=-o*d,e[8]=p+f*a,e[1]=f+p*a,e[5]=o*h,e[9]=x-u*a,e[2]=-o*l,e[6]=a,e[10]=o*c}else if(t.order==="ZYX"){const u=o*h,f=o*d,p=a*h,x=a*d;e[0]=c*h,e[4]=p*l-f,e[8]=u*l+x,e[1]=c*d,e[5]=x*l+u,e[9]=f*l-p,e[2]=-l,e[6]=a*c,e[10]=o*c}else if(t.order==="YZX"){const u=o*c,f=o*l,p=a*c,x=a*l;e[0]=c*h,e[4]=x-u*d,e[8]=p*d+f,e[1]=d,e[5]=o*h,e[9]=-a*h,e[2]=-l*h,e[6]=f*d+p,e[10]=u-x*d}else if(t.order==="XZY"){const u=o*c,f=o*l,p=a*c,x=a*l;e[0]=c*h,e[4]=-d,e[8]=l*h,e[1]=u*d+x,e[5]=o*h,e[9]=f*d-p,e[2]=p*d-f,e[6]=a*h,e[10]=x*d+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(bd,t,Ed)}lookAt(t,e,n){const i=this.elements;return un.subVectors(t,e),un.lengthSq()===0&&(un.z=1),un.normalize(),oi.crossVectors(n,un),oi.lengthSq()===0&&(Math.abs(n.z)===1?un.x+=1e-4:un.z+=1e-4,un.normalize(),oi.crossVectors(n,un)),oi.normalize(),br.crossVectors(un,oi),i[0]=oi.x,i[4]=br.x,i[8]=un.x,i[1]=oi.y,i[5]=br.y,i[9]=un.y,i[2]=oi.z,i[6]=br.z,i[10]=un.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,i=e.elements,r=this.elements,o=n[0],a=n[4],c=n[8],l=n[12],h=n[1],d=n[5],u=n[9],f=n[13],p=n[2],x=n[6],g=n[10],m=n[14],y=n[3],w=n[7],v=n[11],T=n[15],M=i[0],E=i[4],b=i[8],_=i[12],S=i[1],R=i[5],O=i[9],I=i[13],A=i[2],U=i[6],F=i[10],D=i[14],N=i[3],B=i[7],k=i[11],V=i[15];return r[0]=o*M+a*S+c*A+l*N,r[4]=o*E+a*R+c*U+l*B,r[8]=o*b+a*O+c*F+l*k,r[12]=o*_+a*I+c*D+l*V,r[1]=h*M+d*S+u*A+f*N,r[5]=h*E+d*R+u*U+f*B,r[9]=h*b+d*O+u*F+f*k,r[13]=h*_+d*I+u*D+f*V,r[2]=p*M+x*S+g*A+m*N,r[6]=p*E+x*R+g*U+m*B,r[10]=p*b+x*O+g*F+m*k,r[14]=p*_+x*I+g*D+m*V,r[3]=y*M+w*S+v*A+T*N,r[7]=y*E+w*R+v*U+T*B,r[11]=y*b+w*O+v*F+T*k,r[15]=y*_+w*I+v*D+T*V,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[4],i=t[8],r=t[12],o=t[1],a=t[5],c=t[9],l=t[13],h=t[2],d=t[6],u=t[10],f=t[14],p=t[3],x=t[7],g=t[11],m=t[15];return p*(+r*c*d-i*l*d-r*a*u+n*l*u+i*a*f-n*c*f)+x*(+e*c*f-e*l*u+r*o*u-i*o*f+i*l*h-r*c*h)+g*(+e*l*d-e*a*f-r*o*d+n*o*f+r*a*h-n*l*h)+m*(-i*a*h-e*c*d+e*a*u+i*o*d-n*o*u+n*c*h)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){const i=this.elements;return t.isVector3?(i[12]=t.x,i[13]=t.y,i[14]=t.z):(i[12]=t,i[13]=e,i[14]=n),this}invert(){const t=this.elements,e=t[0],n=t[1],i=t[2],r=t[3],o=t[4],a=t[5],c=t[6],l=t[7],h=t[8],d=t[9],u=t[10],f=t[11],p=t[12],x=t[13],g=t[14],m=t[15],y=d*g*l-x*u*l+x*c*f-a*g*f-d*c*m+a*u*m,w=p*u*l-h*g*l-p*c*f+o*g*f+h*c*m-o*u*m,v=h*x*l-p*d*l+p*a*f-o*x*f-h*a*m+o*d*m,T=p*d*c-h*x*c-p*a*u+o*x*u+h*a*g-o*d*g,M=e*y+n*w+i*v+r*T;if(M===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const E=1/M;return t[0]=y*E,t[1]=(x*u*r-d*g*r-x*i*f+n*g*f+d*i*m-n*u*m)*E,t[2]=(a*g*r-x*c*r+x*i*l-n*g*l-a*i*m+n*c*m)*E,t[3]=(d*c*r-a*u*r-d*i*l+n*u*l+a*i*f-n*c*f)*E,t[4]=w*E,t[5]=(h*g*r-p*u*r+p*i*f-e*g*f-h*i*m+e*u*m)*E,t[6]=(p*c*r-o*g*r-p*i*l+e*g*l+o*i*m-e*c*m)*E,t[7]=(o*u*r-h*c*r+h*i*l-e*u*l-o*i*f+e*c*f)*E,t[8]=v*E,t[9]=(p*d*r-h*x*r-p*n*f+e*x*f+h*n*m-e*d*m)*E,t[10]=(o*x*r-p*a*r+p*n*l-e*x*l-o*n*m+e*a*m)*E,t[11]=(h*a*r-o*d*r-h*n*l+e*d*l+o*n*f-e*a*f)*E,t[12]=T*E,t[13]=(h*x*i-p*d*i+p*n*u-e*x*u-h*n*g+e*d*g)*E,t[14]=(p*a*i-o*x*i-p*n*c+e*x*c+o*n*g-e*a*g)*E,t[15]=(o*d*i-h*a*i+h*n*c-e*d*c-o*n*u+e*a*u)*E,this}scale(t){const e=this.elements,n=t.x,i=t.y,r=t.z;return e[0]*=n,e[4]*=i,e[8]*=r,e[1]*=n,e[5]*=i,e[9]*=r,e[2]*=n,e[6]*=i,e[10]*=r,e[3]*=n,e[7]*=i,e[11]*=r,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],i=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,i))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const n=Math.cos(e),i=Math.sin(e),r=1-n,o=t.x,a=t.y,c=t.z,l=r*o,h=r*a;return this.set(l*o+n,l*a-i*c,l*c+i*a,0,l*a+i*c,h*a+n,h*c-i*o,0,l*c-i*a,h*c+i*o,r*c*c+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,i,r,o){return this.set(1,n,r,0,t,1,o,0,e,i,1,0,0,0,0,1),this}compose(t,e,n){const i=this.elements,r=e._x,o=e._y,a=e._z,c=e._w,l=r+r,h=o+o,d=a+a,u=r*l,f=r*h,p=r*d,x=o*h,g=o*d,m=a*d,y=c*l,w=c*h,v=c*d,T=n.x,M=n.y,E=n.z;return i[0]=(1-(x+m))*T,i[1]=(f+v)*T,i[2]=(p-w)*T,i[3]=0,i[4]=(f-v)*M,i[5]=(1-(u+m))*M,i[6]=(g+y)*M,i[7]=0,i[8]=(p+w)*E,i[9]=(g-y)*E,i[10]=(1-(u+x))*E,i[11]=0,i[12]=t.x,i[13]=t.y,i[14]=t.z,i[15]=1,this}decompose(t,e,n){const i=this.elements;let r=Vi.set(i[0],i[1],i[2]).length();const o=Vi.set(i[4],i[5],i[6]).length(),a=Vi.set(i[8],i[9],i[10]).length();this.determinant()<0&&(r=-r),t.x=i[12],t.y=i[13],t.z=i[14],En.copy(this);const l=1/r,h=1/o,d=1/a;return En.elements[0]*=l,En.elements[1]*=l,En.elements[2]*=l,En.elements[4]*=h,En.elements[5]*=h,En.elements[6]*=h,En.elements[8]*=d,En.elements[9]*=d,En.elements[10]*=d,e.setFromRotationMatrix(En),n.x=r,n.y=o,n.z=a,this}makePerspective(t,e,n,i,r,o,a=Xn){const c=this.elements,l=2*r/(e-t),h=2*r/(n-i),d=(e+t)/(e-t),u=(n+i)/(n-i);let f,p;if(a===Xn)f=-(o+r)/(o-r),p=-2*o*r/(o-r);else if(a===eo)f=-o/(o-r),p=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=l,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=h,c[9]=u,c[13]=0,c[2]=0,c[6]=0,c[10]=f,c[14]=p,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,i,r,o,a=Xn){const c=this.elements,l=1/(e-t),h=1/(n-i),d=1/(o-r),u=(e+t)*l,f=(n+i)*h;let p,x;if(a===Xn)p=(o+r)*d,x=-2*d;else if(a===eo)p=r*d,x=-1*d;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=2*l,c[4]=0,c[8]=0,c[12]=-u,c[1]=0,c[5]=2*h,c[9]=0,c[13]=-f,c[2]=0,c[6]=0,c[10]=x,c[14]=-p,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){const e=this.elements,n=t.elements;for(let i=0;i<16;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}}const Vi=new P,En=new Yt,bd=new P(0,0,0),Ed=new P(1,1,1),oi=new P,br=new P,un=new P,Gc=new Yt,Vc=new Ae;class Ee{constructor(t=0,e=0,n=0,i=Ee.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=i}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,i=this._order){return this._x=t,this._y=e,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){const i=t.elements,r=i[0],o=i[4],a=i[8],c=i[1],l=i[5],h=i[9],d=i[2],u=i[6],f=i[10];switch(e){case"XYZ":this._y=Math.asin(ze(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(u,l),this._z=0);break;case"YXZ":this._x=Math.asin(-ze(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-d,r),this._z=0);break;case"ZXY":this._x=Math.asin(ze(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-o,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-ze(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-o,l));break;case"YZX":this._z=Math.asin(ze(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-d,r)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-ze(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(u,l),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return Gc.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Gc,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Vc.setFromEuler(this),this.setFromQuaternion(Vc,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Ee.DEFAULT_ORDER="XYZ";class Lh{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let Td=0;const Wc=new P,Wi=new Ae,Nn=new Yt,Er=new P,zs=new P,Ad=new P,Cd=new Ae,Xc=new P(1,0,0),qc=new P(0,1,0),Yc=new P(0,0,1),$c={type:"added"},Rd={type:"removed"},Xi={type:"childadded",child:null},wo={type:"childremoved",child:null};class We extends Ss{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Td++}),this.uuid=bs(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=We.DEFAULT_UP.clone();const t=new P,e=new Ee,n=new Ae,i=new P(1,1,1);function r(){n.setFromEuler(e,!1)}function o(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new Yt},normalMatrix:{value:new he}}),this.matrix=new Yt,this.matrixWorld=new Yt,this.matrixAutoUpdate=We.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=We.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Lh,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Wi.setFromAxisAngle(t,e),this.quaternion.multiply(Wi),this}rotateOnWorldAxis(t,e){return Wi.setFromAxisAngle(t,e),this.quaternion.premultiply(Wi),this}rotateX(t){return this.rotateOnAxis(Xc,t)}rotateY(t){return this.rotateOnAxis(qc,t)}rotateZ(t){return this.rotateOnAxis(Yc,t)}translateOnAxis(t,e){return Wc.copy(t).applyQuaternion(this.quaternion),this.position.add(Wc.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Xc,t)}translateY(t){return this.translateOnAxis(qc,t)}translateZ(t){return this.translateOnAxis(Yc,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Nn.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?Er.copy(t):Er.set(t,e,n);const i=this.parent;this.updateWorldMatrix(!0,!1),zs.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Nn.lookAt(zs,Er,this.up):Nn.lookAt(Er,zs,this.up),this.quaternion.setFromRotationMatrix(Nn),i&&(Nn.extractRotation(i.matrixWorld),Wi.setFromRotationMatrix(Nn),this.quaternion.premultiply(Wi.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent($c),Xi.child=t,this.dispatchEvent(Xi),Xi.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Rd),wo.child=t,this.dispatchEvent(wo),wo.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Nn.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Nn.multiply(t.parent.matrixWorld)),t.applyMatrix4(Nn),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent($c),Xi.child=t,this.dispatchEvent(Xi),Xi.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,i=this.children.length;n<i;n++){const o=this.children[n].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);const i=this.children;for(let r=0,o=i.length;r<o;r++)i[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(zs,t,Ad),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(zs,Cd,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e){const n=this.parent;if(t===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){const i=this.children;for(let r=0,o=i.length;r<o;r++)i[r].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.visibility=this._visibility,i.active=this._active,i.bounds=this._bounds.map(a=>({boxInitialized:a.boxInitialized,boxMin:a.box.min.toArray(),boxMax:a.box.max.toArray(),sphereInitialized:a.sphereInitialized,sphereRadius:a.sphere.radius,sphereCenter:a.sphere.center.toArray()})),i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.geometryCount=this._geometryCount,i.matricesTexture=this._matricesTexture.toJSON(t),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(i.boundingSphere={center:i.boundingSphere.center.toArray(),radius:i.boundingSphere.radius}),this.boundingBox!==null&&(i.boundingBox={min:i.boundingBox.min.toArray(),max:i.boundingBox.max.toArray()}));function r(a,c){return a[c.uuid]===void 0&&(a[c.uuid]=c.toJSON(t)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=r(t.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const c=a.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){const d=c[l];r(t.shapes,d)}else r(t.shapes,c)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let c=0,l=this.material.length;c<l;c++)a.push(r(t.materials,this.material[c]));i.material=a}else i.material=r(t.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){const c=this.animations[a];i.animations.push(r(t.animations,c))}}if(e){const a=o(t.geometries),c=o(t.materials),l=o(t.textures),h=o(t.images),d=o(t.shapes),u=o(t.skeletons),f=o(t.animations),p=o(t.nodes);a.length>0&&(n.geometries=a),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),f.length>0&&(n.animations=f),p.length>0&&(n.nodes=p)}return n.object=i,n;function o(a){const c=[];for(const l in a){const h=a[l];delete h.metadata,c.push(h)}return c}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){const i=t.children[n];this.add(i.clone())}return this}}We.DEFAULT_UP=new P(0,1,0);We.DEFAULT_MATRIX_AUTO_UPDATE=!0;We.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Tn=new P,Fn=new P,Mo=new P,On=new P,qi=new P,Yi=new P,jc=new P,So=new P,bo=new P,Eo=new P,To=new be,Ao=new be,Co=new be;class An{constructor(t=new P,e=new P,n=new P){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,i){i.subVectors(n,e),Tn.subVectors(t,e),i.cross(Tn);const r=i.lengthSq();return r>0?i.multiplyScalar(1/Math.sqrt(r)):i.set(0,0,0)}static getBarycoord(t,e,n,i,r){Tn.subVectors(i,e),Fn.subVectors(n,e),Mo.subVectors(t,e);const o=Tn.dot(Tn),a=Tn.dot(Fn),c=Tn.dot(Mo),l=Fn.dot(Fn),h=Fn.dot(Mo),d=o*l-a*a;if(d===0)return r.set(0,0,0),null;const u=1/d,f=(l*c-a*h)*u,p=(o*h-a*c)*u;return r.set(1-f-p,p,f)}static containsPoint(t,e,n,i){return this.getBarycoord(t,e,n,i,On)===null?!1:On.x>=0&&On.y>=0&&On.x+On.y<=1}static getInterpolation(t,e,n,i,r,o,a,c){return this.getBarycoord(t,e,n,i,On)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,On.x),c.addScaledVector(o,On.y),c.addScaledVector(a,On.z),c)}static getInterpolatedAttribute(t,e,n,i,r,o){return To.setScalar(0),Ao.setScalar(0),Co.setScalar(0),To.fromBufferAttribute(t,e),Ao.fromBufferAttribute(t,n),Co.fromBufferAttribute(t,i),o.setScalar(0),o.addScaledVector(To,r.x),o.addScaledVector(Ao,r.y),o.addScaledVector(Co,r.z),o}static isFrontFacing(t,e,n,i){return Tn.subVectors(n,e),Fn.subVectors(t,e),Tn.cross(Fn).dot(i)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,i){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[i]),this}setFromAttributeAndIndices(t,e,n,i){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,i),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return Tn.subVectors(this.c,this.b),Fn.subVectors(this.a,this.b),Tn.cross(Fn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return An.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return An.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,i,r){return An.getInterpolation(t,this.a,this.b,this.c,e,n,i,r)}containsPoint(t){return An.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return An.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const n=this.a,i=this.b,r=this.c;let o,a;qi.subVectors(i,n),Yi.subVectors(r,n),So.subVectors(t,n);const c=qi.dot(So),l=Yi.dot(So);if(c<=0&&l<=0)return e.copy(n);bo.subVectors(t,i);const h=qi.dot(bo),d=Yi.dot(bo);if(h>=0&&d<=h)return e.copy(i);const u=c*d-h*l;if(u<=0&&c>=0&&h<=0)return o=c/(c-h),e.copy(n).addScaledVector(qi,o);Eo.subVectors(t,r);const f=qi.dot(Eo),p=Yi.dot(Eo);if(p>=0&&f<=p)return e.copy(r);const x=f*l-c*p;if(x<=0&&l>=0&&p<=0)return a=l/(l-p),e.copy(n).addScaledVector(Yi,a);const g=h*p-f*d;if(g<=0&&d-h>=0&&f-p>=0)return jc.subVectors(r,i),a=(d-h)/(d-h+(f-p)),e.copy(i).addScaledVector(jc,a);const m=1/(g+x+u);return o=x*m,a=u*m,e.copy(n).addScaledVector(qi,o).addScaledVector(Yi,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const Dh={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ai={h:0,s:0,l:0},Tr={h:0,s:0,l:0};function Ro(s,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?s+(t-s)*6*e:e<1/2?t:e<2/3?s+(t-s)*6*(2/3-e):s}class Ft{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){const i=t;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=nn){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,me.toWorkingColorSpace(this,e),this}setRGB(t,e,n,i=me.workingColorSpace){return this.r=t,this.g=e,this.b=n,me.toWorkingColorSpace(this,i),this}setHSL(t,e,n,i=me.workingColorSpace){if(t=lc(t,1),e=ze(e,0,1),n=ze(n,0,1),e===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+e):n+e-n*e,o=2*n-r;this.r=Ro(o,r,t+1/3),this.g=Ro(o,r,t),this.b=Ro(o,r,t-1/3)}return me.toWorkingColorSpace(this,i),this}setStyle(t,e=nn){function n(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(t)){let r;const o=i[1],a=i[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(t)){const r=i[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=nn){const n=Dh[t.toLowerCase()];return n!==void 0?this.setHex(n,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=$n(t.r),this.g=$n(t.g),this.b=$n(t.b),this}copyLinearToSRGB(t){return this.r=cs(t.r),this.g=cs(t.g),this.b=cs(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=nn){return me.fromWorkingColorSpace(qe.copy(this),t),Math.round(ze(qe.r*255,0,255))*65536+Math.round(ze(qe.g*255,0,255))*256+Math.round(ze(qe.b*255,0,255))}getHexString(t=nn){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=me.workingColorSpace){me.fromWorkingColorSpace(qe.copy(this),e);const n=qe.r,i=qe.g,r=qe.b,o=Math.max(n,i,r),a=Math.min(n,i,r);let c,l;const h=(a+o)/2;if(a===o)c=0,l=0;else{const d=o-a;switch(l=h<=.5?d/(o+a):d/(2-o-a),o){case n:c=(i-r)/d+(i<r?6:0);break;case i:c=(r-n)/d+2;break;case r:c=(n-i)/d+4;break}c/=6}return t.h=c,t.s=l,t.l=h,t}getRGB(t,e=me.workingColorSpace){return me.fromWorkingColorSpace(qe.copy(this),e),t.r=qe.r,t.g=qe.g,t.b=qe.b,t}getStyle(t=nn){me.fromWorkingColorSpace(qe.copy(this),t);const e=qe.r,n=qe.g,i=qe.b;return t!==nn?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(t,e,n){return this.getHSL(ai),this.setHSL(ai.h+t,ai.s+e,ai.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(ai),t.getHSL(Tr);const n=Zs(ai.h,Tr.h,e),i=Zs(ai.s,Tr.s,e),r=Zs(ai.l,Tr.l,e);return this.setHSL(n,i,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,n=this.g,i=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*i,this.g=r[1]*e+r[4]*n+r[7]*i,this.b=r[2]*e+r[5]*n+r[8]*i,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const qe=new Ft;Ft.NAMES=Dh;let Pd=0;class Es extends Ss{static get type(){return"Material"}get type(){return this.constructor.type}set type(t){}constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Pd++}),this.uuid=bs(),this.name="",this.blending=qn,this.side=Zn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=aa,this.blendDst=ca,this.blendEquation=Ci,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ft(0,0,0),this.blendAlpha=0,this.depthFunc=us,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Pc,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Oi,this.stencilZFail=Oi,this.stencilZPass=Oi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const n=t[e];if(n===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}const i=this[e];if(i===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==qn&&(n.blending=this.blending),this.side!==Zn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==aa&&(n.blendSrc=this.blendSrc),this.blendDst!==ca&&(n.blendDst=this.blendDst),this.blendEquation!==Ci&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==us&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Pc&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Oi&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Oi&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Oi&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(r){const o=[];for(const a in r){const c=r[a];delete c.metadata,o.push(c)}return o}if(e){const r=i(t.textures),o=i(t.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let n=null;if(e!==null){const i=e.length;n=new Array(i);for(let r=0;r!==i;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class hc extends Es{static get type(){return"MeshBasicMaterial"}constructor(t){super(),this.isMeshBasicMaterial=!0,this.color=new Ft(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Ee,this.combine=dh,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const Wn=Ld();function Ld(){const s=new ArrayBuffer(4),t=new Float32Array(s),e=new Uint32Array(s),n=new Uint32Array(512),i=new Uint32Array(512);for(let c=0;c<256;++c){const l=c-127;l<-27?(n[c]=0,n[c|256]=32768,i[c]=24,i[c|256]=24):l<-14?(n[c]=1024>>-l-14,n[c|256]=1024>>-l-14|32768,i[c]=-l-1,i[c|256]=-l-1):l<=15?(n[c]=l+15<<10,n[c|256]=l+15<<10|32768,i[c]=13,i[c|256]=13):l<128?(n[c]=31744,n[c|256]=64512,i[c]=24,i[c|256]=24):(n[c]=31744,n[c|256]=64512,i[c]=13,i[c|256]=13)}const r=new Uint32Array(2048),o=new Uint32Array(64),a=new Uint32Array(64);for(let c=1;c<1024;++c){let l=c<<13,h=0;for(;!(l&8388608);)l<<=1,h-=8388608;l&=-8388609,h+=947912704,r[c]=l|h}for(let c=1024;c<2048;++c)r[c]=939524096+(c-1024<<13);for(let c=1;c<31;++c)o[c]=c<<23;o[31]=1199570944,o[32]=2147483648;for(let c=33;c<63;++c)o[c]=2147483648+(c-32<<23);o[63]=3347054592;for(let c=1;c<64;++c)c!==32&&(a[c]=1024);return{floatView:t,uint32View:e,baseTable:n,shiftTable:i,mantissaTable:r,exponentTable:o,offsetTable:a}}function Dd(s){Math.abs(s)>65504&&console.warn("THREE.DataUtils.toHalfFloat(): Value out of range."),s=ze(s,-65504,65504),Wn.floatView[0]=s;const t=Wn.uint32View[0],e=t>>23&511;return Wn.baseTable[e]+((t&8388607)>>Wn.shiftTable[e])}function Id(s){const t=s>>10;return Wn.uint32View[0]=Wn.mantissaTable[Wn.offsetTable[t]+(s&1023)]+Wn.exponentTable[t],Wn.floatView[0]}const zd={toHalfFloat:Dd,fromHalfFloat:Id},Pe=new P,Ar=new Ut;class fe{constructor(t,e,n=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=Lc,this.updateRanges=[],this.gpuType=gn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let i=0,r=this.itemSize;i<r;i++)this.array[t+i]=e.array[n+i];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)Ar.fromBufferAttribute(this,e),Ar.applyMatrix3(t),this.setXY(e,Ar.x,Ar.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)Pe.fromBufferAttribute(this,e),Pe.applyMatrix3(t),this.setXYZ(e,Pe.x,Pe.y,Pe.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)Pe.fromBufferAttribute(this,e),Pe.applyMatrix4(t),this.setXYZ(e,Pe.x,Pe.y,Pe.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Pe.fromBufferAttribute(this,e),Pe.applyNormalMatrix(t),this.setXYZ(e,Pe.x,Pe.y,Pe.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Pe.fromBufferAttribute(this,e),Pe.transformDirection(t),this.setXYZ(e,Pe.x,Pe.y,Pe.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=ns(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=tn(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=ns(e,this.array)),e}setX(t,e){return this.normalized&&(e=tn(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=ns(e,this.array)),e}setY(t,e){return this.normalized&&(e=tn(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=ns(e,this.array)),e}setZ(t,e){return this.normalized&&(e=tn(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=ns(e,this.array)),e}setW(t,e){return this.normalized&&(e=tn(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=tn(e,this.array),n=tn(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,i){return t*=this.itemSize,this.normalized&&(e=tn(e,this.array),n=tn(n,this.array),i=tn(i,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this}setXYZW(t,e,n,i,r){return t*=this.itemSize,this.normalized&&(e=tn(e,this.array),n=tn(n,this.array),i=tn(i,this.array),r=tn(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==Lc&&(t.usage=this.usage),t}}class Ih extends fe{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class zh extends fe{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class bt extends fe{constructor(t,e,n){super(new Float32Array(t),e,n)}}let Ud=0;const yn=new Yt,Po=new We,$i=new P,dn=new ke,Us=new ke,Fe=new P;class oe extends Ss{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Ud++}),this.uuid=bs(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Th(t)?zh:Ih)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new he().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(t),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return yn.makeRotationFromQuaternion(t),this.applyMatrix4(yn),this}rotateX(t){return yn.makeRotationX(t),this.applyMatrix4(yn),this}rotateY(t){return yn.makeRotationY(t),this.applyMatrix4(yn),this}rotateZ(t){return yn.makeRotationZ(t),this.applyMatrix4(yn),this}translate(t,e,n){return yn.makeTranslation(t,e,n),this.applyMatrix4(yn),this}scale(t,e,n){return yn.makeScale(t,e,n),this.applyMatrix4(yn),this}lookAt(t){return Po.lookAt(t),Po.updateMatrix(),this.applyMatrix4(Po.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter($i).negate(),this.translate($i.x,$i.y,$i.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const n=[];for(let i=0,r=t.length;i<r;i++){const o=t[i];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new bt(n,3))}else{for(let n=0,i=e.count;n<i;n++){const r=t[n];e.setXYZ(n,r.x,r.y,r.z||0)}t.length>e.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ke);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new P(-1/0,-1/0,-1/0),new P(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,i=e.length;n<i;n++){const r=e[n];dn.setFromBufferAttribute(r),this.morphTargetsRelative?(Fe.addVectors(this.boundingBox.min,dn.min),this.boundingBox.expandByPoint(Fe),Fe.addVectors(this.boundingBox.max,dn.max),this.boundingBox.expandByPoint(Fe)):(this.boundingBox.expandByPoint(dn.min),this.boundingBox.expandByPoint(dn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ce);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new P,1/0);return}if(t){const n=this.boundingSphere.center;if(dn.setFromBufferAttribute(t),e)for(let r=0,o=e.length;r<o;r++){const a=e[r];Us.setFromBufferAttribute(a),this.morphTargetsRelative?(Fe.addVectors(dn.min,Us.min),dn.expandByPoint(Fe),Fe.addVectors(dn.max,Us.max),dn.expandByPoint(Fe)):(dn.expandByPoint(Us.min),dn.expandByPoint(Us.max))}dn.getCenter(n);let i=0;for(let r=0,o=t.count;r<o;r++)Fe.fromBufferAttribute(t,r),i=Math.max(i,n.distanceToSquared(Fe));if(e)for(let r=0,o=e.length;r<o;r++){const a=e[r],c=this.morphTargetsRelative;for(let l=0,h=a.count;l<h;l++)Fe.fromBufferAttribute(a,l),c&&($i.fromBufferAttribute(t,l),Fe.add($i)),i=Math.max(i,n.distanceToSquared(Fe))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=e.position,i=e.normal,r=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new fe(new Float32Array(4*n.count),4));const o=this.getAttribute("tangent"),a=[],c=[];for(let b=0;b<n.count;b++)a[b]=new P,c[b]=new P;const l=new P,h=new P,d=new P,u=new Ut,f=new Ut,p=new Ut,x=new P,g=new P;function m(b,_,S){l.fromBufferAttribute(n,b),h.fromBufferAttribute(n,_),d.fromBufferAttribute(n,S),u.fromBufferAttribute(r,b),f.fromBufferAttribute(r,_),p.fromBufferAttribute(r,S),h.sub(l),d.sub(l),f.sub(u),p.sub(u);const R=1/(f.x*p.y-p.x*f.y);isFinite(R)&&(x.copy(h).multiplyScalar(p.y).addScaledVector(d,-f.y).multiplyScalar(R),g.copy(d).multiplyScalar(f.x).addScaledVector(h,-p.x).multiplyScalar(R),a[b].add(x),a[_].add(x),a[S].add(x),c[b].add(g),c[_].add(g),c[S].add(g))}let y=this.groups;y.length===0&&(y=[{start:0,count:t.count}]);for(let b=0,_=y.length;b<_;++b){const S=y[b],R=S.start,O=S.count;for(let I=R,A=R+O;I<A;I+=3)m(t.getX(I+0),t.getX(I+1),t.getX(I+2))}const w=new P,v=new P,T=new P,M=new P;function E(b){T.fromBufferAttribute(i,b),M.copy(T);const _=a[b];w.copy(_),w.sub(T.multiplyScalar(T.dot(_))).normalize(),v.crossVectors(M,_);const R=v.dot(c[b])<0?-1:1;o.setXYZW(b,w.x,w.y,w.z,R)}for(let b=0,_=y.length;b<_;++b){const S=y[b],R=S.start,O=S.count;for(let I=R,A=R+O;I<A;I+=3)E(t.getX(I+0)),E(t.getX(I+1)),E(t.getX(I+2))}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new fe(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,f=n.count;u<f;u++)n.setXYZ(u,0,0,0);const i=new P,r=new P,o=new P,a=new P,c=new P,l=new P,h=new P,d=new P;if(t)for(let u=0,f=t.count;u<f;u+=3){const p=t.getX(u+0),x=t.getX(u+1),g=t.getX(u+2);i.fromBufferAttribute(e,p),r.fromBufferAttribute(e,x),o.fromBufferAttribute(e,g),h.subVectors(o,r),d.subVectors(i,r),h.cross(d),a.fromBufferAttribute(n,p),c.fromBufferAttribute(n,x),l.fromBufferAttribute(n,g),a.add(h),c.add(h),l.add(h),n.setXYZ(p,a.x,a.y,a.z),n.setXYZ(x,c.x,c.y,c.z),n.setXYZ(g,l.x,l.y,l.z)}else for(let u=0,f=e.count;u<f;u+=3)i.fromBufferAttribute(e,u+0),r.fromBufferAttribute(e,u+1),o.fromBufferAttribute(e,u+2),h.subVectors(o,r),d.subVectors(i,r),h.cross(d),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)Fe.fromBufferAttribute(t,e),Fe.normalize(),t.setXYZ(e,Fe.x,Fe.y,Fe.z)}toNonIndexed(){function t(a,c){const l=a.array,h=a.itemSize,d=a.normalized,u=new l.constructor(c.length*h);let f=0,p=0;for(let x=0,g=c.length;x<g;x++){a.isInterleavedBufferAttribute?f=c[x]*a.data.stride+a.offset:f=c[x]*h;for(let m=0;m<h;m++)u[p++]=l[f++]}return new fe(u,h,d)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new oe,n=this.index.array,i=this.attributes;for(const a in i){const c=i[a],l=t(c,n);e.setAttribute(a,l)}const r=this.morphAttributes;for(const a in r){const c=[],l=r[a];for(let h=0,d=l.length;h<d;h++){const u=l[h],f=t(u,n);c.push(f)}e.morphAttributes[a]=c}e.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,c=o.length;a<c;a++){const l=o[a];e.addGroup(l.start,l.count,l.materialIndex)}return e}toJSON(){const t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(t[l]=c[l]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const n=this.attributes;for(const c in n){const l=n[c];t.data.attributes[c]=l.toJSON(t.data)}const i={};let r=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],h=[];for(let d=0,u=l.length;d<u;d++){const f=l[d];h.push(f.toJSON(t.data))}h.length>0&&(i[c]=h,r=!0)}r&&(t.data.morphAttributes=i,t.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(t.data.boundingSphere={center:a.center.toArray(),radius:a.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const n=t.index;n!==null&&this.setIndex(n.clone(e));const i=t.attributes;for(const l in i){const h=i[l];this.setAttribute(l,h.clone(e))}const r=t.morphAttributes;for(const l in r){const h=[],d=r[l];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(e));this.morphAttributes[l]=h}this.morphTargetsRelative=t.morphTargetsRelative;const o=t.groups;for(let l=0,h=o.length;l<h;l++){const d=o[l];this.addGroup(d.start,d.count,d.materialIndex)}const a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());const c=t.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Zc=new Yt,xi=new Ph,Cr=new Ce,Kc=new P,Rr=new P,Pr=new P,Lr=new P,Lo=new P,Dr=new P,Jc=new P,Ir=new P;class de extends We{constructor(t=new oe,e=new hc){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){const a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(t,e){const n=this.geometry,i=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;e.fromBufferAttribute(i,t);const a=this.morphTargetInfluences;if(r&&a){Dr.set(0,0,0);for(let c=0,l=r.length;c<l;c++){const h=a[c],d=r[c];h!==0&&(Lo.fromBufferAttribute(d,t),o?Dr.addScaledVector(Lo,h):Dr.addScaledVector(Lo.sub(e),h))}e.add(Dr)}return e}raycast(t,e){const n=this.geometry,i=this.material,r=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Cr.copy(n.boundingSphere),Cr.applyMatrix4(r),xi.copy(t.ray).recast(t.near),!(Cr.containsPoint(xi.origin)===!1&&(xi.intersectSphere(Cr,Kc)===null||xi.origin.distanceToSquared(Kc)>(t.far-t.near)**2))&&(Zc.copy(r).invert(),xi.copy(t.ray).applyMatrix4(Zc),!(n.boundingBox!==null&&xi.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,xi)))}_computeIntersections(t,e,n){let i;const r=this.geometry,o=this.material,a=r.index,c=r.attributes.position,l=r.attributes.uv,h=r.attributes.uv1,d=r.attributes.normal,u=r.groups,f=r.drawRange;if(a!==null)if(Array.isArray(o))for(let p=0,x=u.length;p<x;p++){const g=u[p],m=o[g.materialIndex],y=Math.max(g.start,f.start),w=Math.min(a.count,Math.min(g.start+g.count,f.start+f.count));for(let v=y,T=w;v<T;v+=3){const M=a.getX(v),E=a.getX(v+1),b=a.getX(v+2);i=zr(this,m,t,n,l,h,d,M,E,b),i&&(i.faceIndex=Math.floor(v/3),i.face.materialIndex=g.materialIndex,e.push(i))}}else{const p=Math.max(0,f.start),x=Math.min(a.count,f.start+f.count);for(let g=p,m=x;g<m;g+=3){const y=a.getX(g),w=a.getX(g+1),v=a.getX(g+2);i=zr(this,o,t,n,l,h,d,y,w,v),i&&(i.faceIndex=Math.floor(g/3),e.push(i))}}else if(c!==void 0)if(Array.isArray(o))for(let p=0,x=u.length;p<x;p++){const g=u[p],m=o[g.materialIndex],y=Math.max(g.start,f.start),w=Math.min(c.count,Math.min(g.start+g.count,f.start+f.count));for(let v=y,T=w;v<T;v+=3){const M=v,E=v+1,b=v+2;i=zr(this,m,t,n,l,h,d,M,E,b),i&&(i.faceIndex=Math.floor(v/3),i.face.materialIndex=g.materialIndex,e.push(i))}}else{const p=Math.max(0,f.start),x=Math.min(c.count,f.start+f.count);for(let g=p,m=x;g<m;g+=3){const y=g,w=g+1,v=g+2;i=zr(this,o,t,n,l,h,d,y,w,v),i&&(i.faceIndex=Math.floor(g/3),e.push(i))}}}}function Nd(s,t,e,n,i,r,o,a){let c;if(t.side===Ze?c=n.intersectTriangle(o,r,i,!0,a):c=n.intersectTriangle(i,r,o,t.side===Zn,a),c===null)return null;Ir.copy(a),Ir.applyMatrix4(s.matrixWorld);const l=e.ray.origin.distanceTo(Ir);return l<e.near||l>e.far?null:{distance:l,point:Ir.clone(),object:s}}function zr(s,t,e,n,i,r,o,a,c,l){s.getVertexPosition(a,Rr),s.getVertexPosition(c,Pr),s.getVertexPosition(l,Lr);const h=Nd(s,t,e,n,Rr,Pr,Lr,Jc);if(h){const d=new P;An.getBarycoord(Jc,Rr,Pr,Lr,d),i&&(h.uv=An.getInterpolatedAttribute(i,a,c,l,d,new Ut)),r&&(h.uv1=An.getInterpolatedAttribute(r,a,c,l,d,new Ut)),o&&(h.normal=An.getInterpolatedAttribute(o,a,c,l,d,new P),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const u={a,b:c,c:l,normal:new P,materialIndex:0};An.getNormal(Rr,Pr,Lr,u.normal),h.face=u,h.barycoord=d}return h}class Xt extends oe{constructor(t=1,e=1,n=1,i=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:i,heightSegments:r,depthSegments:o};const a=this;i=Math.floor(i),r=Math.floor(r),o=Math.floor(o);const c=[],l=[],h=[],d=[];let u=0,f=0;p("z","y","x",-1,-1,n,e,t,o,r,0),p("z","y","x",1,-1,n,e,-t,o,r,1),p("x","z","y",1,1,t,n,e,i,o,2),p("x","z","y",1,-1,t,n,-e,i,o,3),p("x","y","z",1,-1,t,e,n,i,r,4),p("x","y","z",-1,-1,t,e,-n,i,r,5),this.setIndex(c),this.setAttribute("position",new bt(l,3)),this.setAttribute("normal",new bt(h,3)),this.setAttribute("uv",new bt(d,2));function p(x,g,m,y,w,v,T,M,E,b,_){const S=v/E,R=T/b,O=v/2,I=T/2,A=M/2,U=E+1,F=b+1;let D=0,N=0;const B=new P;for(let k=0;k<F;k++){const V=k*R-I;for(let J=0;J<U;J++){const it=J*S-O;B[x]=it*y,B[g]=V*w,B[m]=A,l.push(B.x,B.y,B.z),B[x]=0,B[g]=0,B[m]=M>0?1:-1,h.push(B.x,B.y,B.z),d.push(J/E),d.push(1-k/b),D+=1}}for(let k=0;k<b;k++)for(let V=0;V<E;V++){const J=u+V+U*k,it=u+V+U*(k+1),X=u+(V+1)+U*(k+1),tt=u+(V+1)+U*k;c.push(J,it,tt),c.push(it,X,tt),N+=6}a.addGroup(f,N,_),f+=N,u+=D}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Xt(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function vs(s){const t={};for(const e in s){t[e]={};for(const n in s[e]){const i=s[e][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=i.clone():Array.isArray(i)?t[e][n]=i.slice():t[e][n]=i}}return t}function en(s){const t={};for(let e=0;e<s.length;e++){const n=vs(s[e]);for(const i in n)t[i]=n[i]}return t}function Fd(s){const t=[];for(let e=0;e<s.length;e++)t.push(s[e].clone());return t}function Uh(s){const t=s.getRenderTarget();return t===null?s.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:me.workingColorSpace}const Od={clone:vs,merge:en};var Bd=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,kd=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class De extends Es{static get type(){return"ShaderMaterial"}constructor(t){super(),this.isShaderMaterial=!0,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Bd,this.fragmentShader=kd,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=vs(t.uniforms),this.uniformsGroups=Fd(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const i in this.uniforms){const o=this.uniforms[i].value;o&&o.isTexture?e.uniforms[i]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[i]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[i]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[i]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[i]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[i]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[i]={type:"m4",value:o.toArray()}:e.uniforms[i]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}}class Nh extends We{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Yt,this.projectionMatrix=new Yt,this.projectionMatrixInverse=new Yt,this.coordinateSystem=Xn}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const ci=new P,Qc=new Ut,tl=new Ut;class mn extends Nh{constructor(t=50,e=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=sr*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(js*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return sr*2*Math.atan(Math.tan(js*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){ci.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(ci.x,ci.y).multiplyScalar(-t/ci.z),ci.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(ci.x,ci.y).multiplyScalar(-t/ci.z)}getViewSize(t,e){return this.getViewBounds(t,Qc,tl),e.subVectors(tl,Qc)}setViewOffset(t,e,n,i,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(js*.5*this.fov)/this.zoom,n=2*e,i=this.aspect*n,r=-.5*i;const o=this.view;if(this.view!==null&&this.view.enabled){const c=o.fullWidth,l=o.fullHeight;r+=o.offsetX*i/c,e-=o.offsetY*n/l,i*=o.width/c,n*=o.height/l}const a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+i,e,e-n,t,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const ji=-90,Zi=1;class Hd extends We{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new mn(ji,Zi,t,e);i.layers=this.layers,this.add(i);const r=new mn(ji,Zi,t,e);r.layers=this.layers,this.add(r);const o=new mn(ji,Zi,t,e);o.layers=this.layers,this.add(o);const a=new mn(ji,Zi,t,e);a.layers=this.layers,this.add(a);const c=new mn(ji,Zi,t,e);c.layers=this.layers,this.add(c);const l=new mn(ji,Zi,t,e);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[n,i,r,o,a,c]=e;for(const l of e)this.remove(l);if(t===Xn)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(t===eo)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const l of e)this.add(l),l.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,c,l,h]=this.children,d=t.getRenderTarget(),u=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),p=t.xr.enabled;t.xr.enabled=!1;const x=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,t.setRenderTarget(n,0,i),t.render(e,r),t.setRenderTarget(n,1,i),t.render(e,o),t.setRenderTarget(n,2,i),t.render(e,a),t.setRenderTarget(n,3,i),t.render(e,c),t.setRenderTarget(n,4,i),t.render(e,l),n.texture.generateMipmaps=x,t.setRenderTarget(n,5,i),t.render(e,h),t.setRenderTarget(d,u,f),t.xr.enabled=p,n.texture.needsPMREMUpdate=!0}}class Fh extends Ke{constructor(t,e,n,i,r,o,a,c,l,h){t=t!==void 0?t:[],e=e!==void 0?e:ds,super(t,e,n,i,r,o,a,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class Gd extends an{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const n={width:t,height:t,depth:1},i=[n,n,n,n,n,n];this.texture=new Fh(i,e.mapping,e.wrapS,e.wrapT,e.magFilter,e.minFilter,e.format,e.type,e.anisotropy,e.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=e.generateMipmaps!==void 0?e.generateMipmaps:!1,this.texture.minFilter=e.minFilter!==void 0?e.minFilter:ve}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},i=new Xt(5,5,5),r=new De({name:"CubemapFromEquirect",uniforms:vs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Ze,blending:di});r.uniforms.tEquirect.value=e;const o=new de(i,r),a=e.minFilter;return e.minFilter===ui&&(e.minFilter=ve),new Hd(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e,n,i){const r=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,n,i);t.setRenderTarget(r)}}const Do=new P,Vd=new P,Wd=new he;class Ti{constructor(t=new P(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,i){return this.normal.set(t,e,n),this.constant=i,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){const i=Do.subVectors(n,e).cross(Vd.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(i,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const n=t.delta(Do),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const r=-(t.start.dot(this.normal)+this.constant)/i;return r<0||r>1?null:e.copy(t.start).addScaledVector(n,r)}intersectsLine(t){const e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const n=e||Wd.getNormalMatrix(t),i=this.coplanarPoint(Do).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const _i=new Ce,Ur=new P;class xs{constructor(t=new Ti,e=new Ti,n=new Ti,i=new Ti,r=new Ti,o=new Ti){this.planes=[t,e,n,i,r,o]}set(t,e,n,i,r,o){const a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(i),a[4].copy(r),a[5].copy(o),this}copy(t){const e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=Xn){const n=this.planes,i=t.elements,r=i[0],o=i[1],a=i[2],c=i[3],l=i[4],h=i[5],d=i[6],u=i[7],f=i[8],p=i[9],x=i[10],g=i[11],m=i[12],y=i[13],w=i[14],v=i[15];if(n[0].setComponents(c-r,u-l,g-f,v-m).normalize(),n[1].setComponents(c+r,u+l,g+f,v+m).normalize(),n[2].setComponents(c+o,u+h,g+p,v+y).normalize(),n[3].setComponents(c-o,u-h,g-p,v-y).normalize(),n[4].setComponents(c-a,u-d,g-x,v-w).normalize(),e===Xn)n[5].setComponents(c+a,u+d,g+x,v+w).normalize();else if(e===eo)n[5].setComponents(a,d,x,w).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),_i.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),_i.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(_i)}intersectsSprite(t){return _i.center.set(0,0,0),_i.radius=.7071067811865476,_i.applyMatrix4(t.matrixWorld),this.intersectsSphere(_i)}intersectsSphere(t){const e=this.planes,n=t.center,i=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<i)return!1;return!0}intersectsBox(t){const e=this.planes;for(let n=0;n<6;n++){const i=e[n];if(Ur.x=i.normal.x>0?t.max.x:t.min.x,Ur.y=i.normal.y>0?t.max.y:t.min.y,Ur.z=i.normal.z>0?t.max.z:t.min.z,i.distanceToPoint(Ur)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function Oh(){let s=null,t=!1,e=null,n=null;function i(r,o){e(r,o),n=s.requestAnimationFrame(i)}return{start:function(){t!==!0&&e!==null&&(n=s.requestAnimationFrame(i),t=!0)},stop:function(){s.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){s=r}}}function Xd(s){const t=new WeakMap;function e(a,c){const l=a.array,h=a.usage,d=l.byteLength,u=s.createBuffer();s.bindBuffer(c,u),s.bufferData(c,l,h),a.onUploadCallback();let f;if(l instanceof Float32Array)f=s.FLOAT;else if(l instanceof Uint16Array)a.isFloat16BufferAttribute?f=s.HALF_FLOAT:f=s.UNSIGNED_SHORT;else if(l instanceof Int16Array)f=s.SHORT;else if(l instanceof Uint32Array)f=s.UNSIGNED_INT;else if(l instanceof Int32Array)f=s.INT;else if(l instanceof Int8Array)f=s.BYTE;else if(l instanceof Uint8Array)f=s.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)f=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:u,type:f,bytesPerElement:l.BYTES_PER_ELEMENT,version:a.version,size:d}}function n(a,c,l){const h=c.array,d=c.updateRanges;if(s.bindBuffer(l,a),d.length===0)s.bufferSubData(l,0,h);else{d.sort((f,p)=>f.start-p.start);let u=0;for(let f=1;f<d.length;f++){const p=d[u],x=d[f];x.start<=p.start+p.count+1?p.count=Math.max(p.count,x.start+x.count-p.start):(++u,d[u]=x)}d.length=u+1;for(let f=0,p=d.length;f<p;f++){const x=d[f];s.bufferSubData(l,x.start*h.BYTES_PER_ELEMENT,h,x.start,x.count)}c.clearUpdateRanges()}c.onUploadCallback()}function i(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const c=t.get(a);c&&(s.deleteBuffer(c.buffer),t.delete(a))}function o(a,c){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const l=t.get(a);if(l===void 0)t.set(a,e(a,c));else if(l.version<a.version){if(l.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,a,c),l.version=a.version}}return{get:i,remove:r,update:o}}class Jn extends oe{constructor(t=1,e=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:i};const r=t/2,o=e/2,a=Math.floor(n),c=Math.floor(i),l=a+1,h=c+1,d=t/a,u=e/c,f=[],p=[],x=[],g=[];for(let m=0;m<h;m++){const y=m*u-o;for(let w=0;w<l;w++){const v=w*d-r;p.push(v,-y,0),x.push(0,0,1),g.push(w/a),g.push(1-m/c)}}for(let m=0;m<c;m++)for(let y=0;y<a;y++){const w=y+l*m,v=y+l*(m+1),T=y+1+l*(m+1),M=y+1+l*m;f.push(w,v,M),f.push(v,T,M)}this.setIndex(f),this.setAttribute("position",new bt(p,3)),this.setAttribute("normal",new bt(x,3)),this.setAttribute("uv",new bt(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Jn(t.width,t.height,t.widthSegments,t.heightSegments)}}var qd=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Yd=`#ifdef USE_ALPHAHASH
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
#endif`,$d=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,jd=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Zd=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Kd=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Jd=`#ifdef USE_AOMAP
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
#endif`,Qd=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,tf=`#ifdef USE_BATCHING
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
#endif`,ef=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,nf=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,sf=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,rf=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,of=`#ifdef USE_IRIDESCENCE
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
#endif`,af=`#ifdef USE_BUMPMAP
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
#endif`,cf=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,lf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,hf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,uf=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,df=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,ff=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,pf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,mf=`#if defined( USE_COLOR_ALPHA )
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
#endif`,gf=`#define PI 3.141592653589793
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
} // validated`,vf=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,xf=`vec3 transformedNormal = objectNormal;
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
#endif`,_f=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,yf=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,wf=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Mf=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Sf="gl_FragColor = linearToOutputTexel( gl_FragColor );",bf=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Ef=`#ifdef USE_ENVMAP
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
#endif`,Tf=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Af=`#ifdef USE_ENVMAP
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
#endif`,Cf=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Rf=`#ifdef USE_ENVMAP
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
#endif`,Pf=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Lf=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Df=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,If=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,zf=`#ifdef USE_GRADIENTMAP
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
}`,Uf=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Nf=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Ff=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Of=`uniform bool receiveShadow;
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
#endif`,Bf=`#ifdef USE_ENVMAP
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
#endif`,kf=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Hf=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Gf=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Vf=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Wf=`PhysicalMaterial material;
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
#endif`,Xf=`struct PhysicalMaterial {
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
}`,qf=`
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
#endif`,Yf=`#if defined( RE_IndirectDiffuse )
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
#endif`,$f=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,jf=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Zf=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Kf=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Jf=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Qf=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,t0=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,e0=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,n0=`#if defined( USE_POINTS_UV )
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
#endif`,i0=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,s0=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,r0=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,o0=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,a0=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,c0=`#ifdef USE_MORPHTARGETS
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
#endif`,l0=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,h0=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,u0=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,d0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,f0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,p0=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,m0=`#ifdef USE_NORMALMAP
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
#endif`,g0=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,v0=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,x0=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,_0=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,y0=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,w0=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,M0=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,S0=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,b0=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,E0=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,T0=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,A0=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,C0=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,R0=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,P0=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,L0=`float getShadowMask() {
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
}`,D0=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,I0=`#ifdef USE_SKINNING
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
#endif`,z0=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,U0=`#ifdef USE_SKINNING
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
#endif`,N0=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,F0=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,O0=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,B0=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,k0=`#ifdef USE_TRANSMISSION
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
#endif`,H0=`#ifdef USE_TRANSMISSION
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
#endif`,G0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,V0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,W0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,X0=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const q0=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Y0=`uniform sampler2D t2D;
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
}`,$0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,j0=`#ifdef ENVMAP_TYPE_CUBE
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
}`,Z0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,K0=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,J0=`#include <common>
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
}`,Q0=`#if DEPTH_PACKING == 3200
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
}`,tp=`#define DISTANCE
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
}`,ep=`#define DISTANCE
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
}`,np=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,ip=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,sp=`uniform float scale;
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
}`,rp=`uniform vec3 diffuse;
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
}`,op=`#include <common>
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
}`,ap=`uniform vec3 diffuse;
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
}`,cp=`#define LAMBERT
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
}`,lp=`#define LAMBERT
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
}`,hp=`#define MATCAP
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
}`,up=`#define MATCAP
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
}`,dp=`#define NORMAL
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
}`,fp=`#define NORMAL
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
}`,pp=`#define PHONG
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
}`,mp=`#define PHONG
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
}`,gp=`#define STANDARD
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
}`,vp=`#define STANDARD
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
}`,xp=`#define TOON
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
}`,_p=`#define TOON
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
}`,yp=`uniform float size;
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
}`,wp=`uniform vec3 diffuse;
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
}`,Mp=`#include <common>
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
}`,Sp=`uniform vec3 color;
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
}`,bp=`uniform float rotation;
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
}`,Ep=`uniform vec3 diffuse;
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
}`,ce={alphahash_fragment:qd,alphahash_pars_fragment:Yd,alphamap_fragment:$d,alphamap_pars_fragment:jd,alphatest_fragment:Zd,alphatest_pars_fragment:Kd,aomap_fragment:Jd,aomap_pars_fragment:Qd,batching_pars_vertex:tf,batching_vertex:ef,begin_vertex:nf,beginnormal_vertex:sf,bsdfs:rf,iridescence_fragment:of,bumpmap_pars_fragment:af,clipping_planes_fragment:cf,clipping_planes_pars_fragment:lf,clipping_planes_pars_vertex:hf,clipping_planes_vertex:uf,color_fragment:df,color_pars_fragment:ff,color_pars_vertex:pf,color_vertex:mf,common:gf,cube_uv_reflection_fragment:vf,defaultnormal_vertex:xf,displacementmap_pars_vertex:_f,displacementmap_vertex:yf,emissivemap_fragment:wf,emissivemap_pars_fragment:Mf,colorspace_fragment:Sf,colorspace_pars_fragment:bf,envmap_fragment:Ef,envmap_common_pars_fragment:Tf,envmap_pars_fragment:Af,envmap_pars_vertex:Cf,envmap_physical_pars_fragment:Bf,envmap_vertex:Rf,fog_vertex:Pf,fog_pars_vertex:Lf,fog_fragment:Df,fog_pars_fragment:If,gradientmap_pars_fragment:zf,lightmap_pars_fragment:Uf,lights_lambert_fragment:Nf,lights_lambert_pars_fragment:Ff,lights_pars_begin:Of,lights_toon_fragment:kf,lights_toon_pars_fragment:Hf,lights_phong_fragment:Gf,lights_phong_pars_fragment:Vf,lights_physical_fragment:Wf,lights_physical_pars_fragment:Xf,lights_fragment_begin:qf,lights_fragment_maps:Yf,lights_fragment_end:$f,logdepthbuf_fragment:jf,logdepthbuf_pars_fragment:Zf,logdepthbuf_pars_vertex:Kf,logdepthbuf_vertex:Jf,map_fragment:Qf,map_pars_fragment:t0,map_particle_fragment:e0,map_particle_pars_fragment:n0,metalnessmap_fragment:i0,metalnessmap_pars_fragment:s0,morphinstance_vertex:r0,morphcolor_vertex:o0,morphnormal_vertex:a0,morphtarget_pars_vertex:c0,morphtarget_vertex:l0,normal_fragment_begin:h0,normal_fragment_maps:u0,normal_pars_fragment:d0,normal_pars_vertex:f0,normal_vertex:p0,normalmap_pars_fragment:m0,clearcoat_normal_fragment_begin:g0,clearcoat_normal_fragment_maps:v0,clearcoat_pars_fragment:x0,iridescence_pars_fragment:_0,opaque_fragment:y0,packing:w0,premultiplied_alpha_fragment:M0,project_vertex:S0,dithering_fragment:b0,dithering_pars_fragment:E0,roughnessmap_fragment:T0,roughnessmap_pars_fragment:A0,shadowmap_pars_fragment:C0,shadowmap_pars_vertex:R0,shadowmap_vertex:P0,shadowmask_pars_fragment:L0,skinbase_vertex:D0,skinning_pars_vertex:I0,skinning_vertex:z0,skinnormal_vertex:U0,specularmap_fragment:N0,specularmap_pars_fragment:F0,tonemapping_fragment:O0,tonemapping_pars_fragment:B0,transmission_fragment:k0,transmission_pars_fragment:H0,uv_pars_fragment:G0,uv_pars_vertex:V0,uv_vertex:W0,worldpos_vertex:X0,background_vert:q0,background_frag:Y0,backgroundCube_vert:$0,backgroundCube_frag:j0,cube_vert:Z0,cube_frag:K0,depth_vert:J0,depth_frag:Q0,distanceRGBA_vert:tp,distanceRGBA_frag:ep,equirect_vert:np,equirect_frag:ip,linedashed_vert:sp,linedashed_frag:rp,meshbasic_vert:op,meshbasic_frag:ap,meshlambert_vert:cp,meshlambert_frag:lp,meshmatcap_vert:hp,meshmatcap_frag:up,meshnormal_vert:dp,meshnormal_frag:fp,meshphong_vert:pp,meshphong_frag:mp,meshphysical_vert:gp,meshphysical_frag:vp,meshtoon_vert:xp,meshtoon_frag:_p,points_vert:yp,points_frag:wp,shadow_vert:Mp,shadow_frag:Sp,sprite_vert:bp,sprite_frag:Ep},Rt={common:{diffuse:{value:new Ft(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new he},alphaMap:{value:null},alphaMapTransform:{value:new he},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new he}},envmap:{envMap:{value:null},envMapRotation:{value:new he},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new he}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new he}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new he},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new he},normalScale:{value:new Ut(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new he},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new he}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new he}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new he}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ft(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ft(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new he},alphaTest:{value:0},uvTransform:{value:new he}},sprite:{diffuse:{value:new Ft(16777215)},opacity:{value:1},center:{value:new Ut(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new he},alphaMap:{value:null},alphaMapTransform:{value:new he},alphaTest:{value:0}}},Ln={basic:{uniforms:en([Rt.common,Rt.specularmap,Rt.envmap,Rt.aomap,Rt.lightmap,Rt.fog]),vertexShader:ce.meshbasic_vert,fragmentShader:ce.meshbasic_frag},lambert:{uniforms:en([Rt.common,Rt.specularmap,Rt.envmap,Rt.aomap,Rt.lightmap,Rt.emissivemap,Rt.bumpmap,Rt.normalmap,Rt.displacementmap,Rt.fog,Rt.lights,{emissive:{value:new Ft(0)}}]),vertexShader:ce.meshlambert_vert,fragmentShader:ce.meshlambert_frag},phong:{uniforms:en([Rt.common,Rt.specularmap,Rt.envmap,Rt.aomap,Rt.lightmap,Rt.emissivemap,Rt.bumpmap,Rt.normalmap,Rt.displacementmap,Rt.fog,Rt.lights,{emissive:{value:new Ft(0)},specular:{value:new Ft(1118481)},shininess:{value:30}}]),vertexShader:ce.meshphong_vert,fragmentShader:ce.meshphong_frag},standard:{uniforms:en([Rt.common,Rt.envmap,Rt.aomap,Rt.lightmap,Rt.emissivemap,Rt.bumpmap,Rt.normalmap,Rt.displacementmap,Rt.roughnessmap,Rt.metalnessmap,Rt.fog,Rt.lights,{emissive:{value:new Ft(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:ce.meshphysical_vert,fragmentShader:ce.meshphysical_frag},toon:{uniforms:en([Rt.common,Rt.aomap,Rt.lightmap,Rt.emissivemap,Rt.bumpmap,Rt.normalmap,Rt.displacementmap,Rt.gradientmap,Rt.fog,Rt.lights,{emissive:{value:new Ft(0)}}]),vertexShader:ce.meshtoon_vert,fragmentShader:ce.meshtoon_frag},matcap:{uniforms:en([Rt.common,Rt.bumpmap,Rt.normalmap,Rt.displacementmap,Rt.fog,{matcap:{value:null}}]),vertexShader:ce.meshmatcap_vert,fragmentShader:ce.meshmatcap_frag},points:{uniforms:en([Rt.points,Rt.fog]),vertexShader:ce.points_vert,fragmentShader:ce.points_frag},dashed:{uniforms:en([Rt.common,Rt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:ce.linedashed_vert,fragmentShader:ce.linedashed_frag},depth:{uniforms:en([Rt.common,Rt.displacementmap]),vertexShader:ce.depth_vert,fragmentShader:ce.depth_frag},normal:{uniforms:en([Rt.common,Rt.bumpmap,Rt.normalmap,Rt.displacementmap,{opacity:{value:1}}]),vertexShader:ce.meshnormal_vert,fragmentShader:ce.meshnormal_frag},sprite:{uniforms:en([Rt.sprite,Rt.fog]),vertexShader:ce.sprite_vert,fragmentShader:ce.sprite_frag},background:{uniforms:{uvTransform:{value:new he},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:ce.background_vert,fragmentShader:ce.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new he}},vertexShader:ce.backgroundCube_vert,fragmentShader:ce.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:ce.cube_vert,fragmentShader:ce.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:ce.equirect_vert,fragmentShader:ce.equirect_frag},distanceRGBA:{uniforms:en([Rt.common,Rt.displacementmap,{referencePosition:{value:new P},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:ce.distanceRGBA_vert,fragmentShader:ce.distanceRGBA_frag},shadow:{uniforms:en([Rt.lights,Rt.fog,{color:{value:new Ft(0)},opacity:{value:1}}]),vertexShader:ce.shadow_vert,fragmentShader:ce.shadow_frag}};Ln.physical={uniforms:en([Ln.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new he},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new he},clearcoatNormalScale:{value:new Ut(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new he},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new he},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new he},sheen:{value:0},sheenColor:{value:new Ft(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new he},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new he},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new he},transmissionSamplerSize:{value:new Ut},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new he},attenuationDistance:{value:0},attenuationColor:{value:new Ft(0)},specularColor:{value:new Ft(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new he},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new he},anisotropyVector:{value:new Ut},anisotropyMap:{value:null},anisotropyMapTransform:{value:new he}}]),vertexShader:ce.meshphysical_vert,fragmentShader:ce.meshphysical_frag};const Nr={r:0,b:0,g:0},yi=new Ee,Tp=new Yt;function Ap(s,t,e,n,i,r,o){const a=new Ft(0);let c=r===!0?0:1,l,h,d=null,u=0,f=null;function p(y){let w=y.isScene===!0?y.background:null;return w&&w.isTexture&&(w=(y.backgroundBlurriness>0?e:t).get(w)),w}function x(y){let w=!1;const v=p(y);v===null?m(a,c):v&&v.isColor&&(m(v,1),w=!0);const T=s.xr.getEnvironmentBlendMode();T==="additive"?n.buffers.color.setClear(0,0,0,1,o):T==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,o),(s.autoClear||w)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function g(y,w){const v=p(w);v&&(v.isCubeTexture||v.mapping===so)?(h===void 0&&(h=new de(new Xt(1,1,1),new De({name:"BackgroundCubeMaterial",uniforms:vs(Ln.backgroundCube.uniforms),vertexShader:Ln.backgroundCube.vertexShader,fragmentShader:Ln.backgroundCube.fragmentShader,side:Ze,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(T,M,E){this.matrixWorld.copyPosition(E.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(h)),yi.copy(w.backgroundRotation),yi.x*=-1,yi.y*=-1,yi.z*=-1,v.isCubeTexture&&v.isRenderTargetTexture===!1&&(yi.y*=-1,yi.z*=-1),h.material.uniforms.envMap.value=v,h.material.uniforms.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=w.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=w.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(Tp.makeRotationFromEuler(yi)),h.material.toneMapped=me.getTransfer(v.colorSpace)!==_e,(d!==v||u!==v.version||f!==s.toneMapping)&&(h.material.needsUpdate=!0,d=v,u=v.version,f=s.toneMapping),h.layers.enableAll(),y.unshift(h,h.geometry,h.material,0,0,null)):v&&v.isTexture&&(l===void 0&&(l=new de(new Jn(2,2),new De({name:"BackgroundMaterial",uniforms:vs(Ln.background.uniforms),vertexShader:Ln.background.vertexShader,fragmentShader:Ln.background.fragmentShader,side:Zn,depthTest:!1,depthWrite:!1,fog:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l)),l.material.uniforms.t2D.value=v,l.material.uniforms.backgroundIntensity.value=w.backgroundIntensity,l.material.toneMapped=me.getTransfer(v.colorSpace)!==_e,v.matrixAutoUpdate===!0&&v.updateMatrix(),l.material.uniforms.uvTransform.value.copy(v.matrix),(d!==v||u!==v.version||f!==s.toneMapping)&&(l.material.needsUpdate=!0,d=v,u=v.version,f=s.toneMapping),l.layers.enableAll(),y.unshift(l,l.geometry,l.material,0,0,null))}function m(y,w){y.getRGB(Nr,Uh(s)),n.buffers.color.setClear(Nr.r,Nr.g,Nr.b,w,o)}return{getClearColor:function(){return a},setClearColor:function(y,w=1){a.set(y),c=w,m(a,c)},getClearAlpha:function(){return c},setClearAlpha:function(y){c=y,m(a,c)},render:x,addToRenderList:g}}function Cp(s,t){const e=s.getParameter(s.MAX_VERTEX_ATTRIBS),n={},i=u(null);let r=i,o=!1;function a(S,R,O,I,A){let U=!1;const F=d(I,O,R);r!==F&&(r=F,l(r.object)),U=f(S,I,O,A),U&&p(S,I,O,A),A!==null&&t.update(A,s.ELEMENT_ARRAY_BUFFER),(U||o)&&(o=!1,v(S,R,O,I),A!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,t.get(A).buffer))}function c(){return s.createVertexArray()}function l(S){return s.bindVertexArray(S)}function h(S){return s.deleteVertexArray(S)}function d(S,R,O){const I=O.wireframe===!0;let A=n[S.id];A===void 0&&(A={},n[S.id]=A);let U=A[R.id];U===void 0&&(U={},A[R.id]=U);let F=U[I];return F===void 0&&(F=u(c()),U[I]=F),F}function u(S){const R=[],O=[],I=[];for(let A=0;A<e;A++)R[A]=0,O[A]=0,I[A]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:R,enabledAttributes:O,attributeDivisors:I,object:S,attributes:{},index:null}}function f(S,R,O,I){const A=r.attributes,U=R.attributes;let F=0;const D=O.getAttributes();for(const N in D)if(D[N].location>=0){const k=A[N];let V=U[N];if(V===void 0&&(N==="instanceMatrix"&&S.instanceMatrix&&(V=S.instanceMatrix),N==="instanceColor"&&S.instanceColor&&(V=S.instanceColor)),k===void 0||k.attribute!==V||V&&k.data!==V.data)return!0;F++}return r.attributesNum!==F||r.index!==I}function p(S,R,O,I){const A={},U=R.attributes;let F=0;const D=O.getAttributes();for(const N in D)if(D[N].location>=0){let k=U[N];k===void 0&&(N==="instanceMatrix"&&S.instanceMatrix&&(k=S.instanceMatrix),N==="instanceColor"&&S.instanceColor&&(k=S.instanceColor));const V={};V.attribute=k,k&&k.data&&(V.data=k.data),A[N]=V,F++}r.attributes=A,r.attributesNum=F,r.index=I}function x(){const S=r.newAttributes;for(let R=0,O=S.length;R<O;R++)S[R]=0}function g(S){m(S,0)}function m(S,R){const O=r.newAttributes,I=r.enabledAttributes,A=r.attributeDivisors;O[S]=1,I[S]===0&&(s.enableVertexAttribArray(S),I[S]=1),A[S]!==R&&(s.vertexAttribDivisor(S,R),A[S]=R)}function y(){const S=r.newAttributes,R=r.enabledAttributes;for(let O=0,I=R.length;O<I;O++)R[O]!==S[O]&&(s.disableVertexAttribArray(O),R[O]=0)}function w(S,R,O,I,A,U,F){F===!0?s.vertexAttribIPointer(S,R,O,A,U):s.vertexAttribPointer(S,R,O,I,A,U)}function v(S,R,O,I){x();const A=I.attributes,U=O.getAttributes(),F=R.defaultAttributeValues;for(const D in U){const N=U[D];if(N.location>=0){let B=A[D];if(B===void 0&&(D==="instanceMatrix"&&S.instanceMatrix&&(B=S.instanceMatrix),D==="instanceColor"&&S.instanceColor&&(B=S.instanceColor)),B!==void 0){const k=B.normalized,V=B.itemSize,J=t.get(B);if(J===void 0)continue;const it=J.buffer,X=J.type,tt=J.bytesPerElement,dt=X===s.INT||X===s.UNSIGNED_INT||B.gpuType===sc;if(B.isInterleavedBufferAttribute){const K=B.data,et=K.stride,ot=B.offset;if(K.isInstancedInterleavedBuffer){for(let mt=0;mt<N.locationSize;mt++)m(N.location+mt,K.meshPerAttribute);S.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=K.meshPerAttribute*K.count)}else for(let mt=0;mt<N.locationSize;mt++)g(N.location+mt);s.bindBuffer(s.ARRAY_BUFFER,it);for(let mt=0;mt<N.locationSize;mt++)w(N.location+mt,V/N.locationSize,X,k,et*tt,(ot+V/N.locationSize*mt)*tt,dt)}else{if(B.isInstancedBufferAttribute){for(let K=0;K<N.locationSize;K++)m(N.location+K,B.meshPerAttribute);S.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=B.meshPerAttribute*B.count)}else for(let K=0;K<N.locationSize;K++)g(N.location+K);s.bindBuffer(s.ARRAY_BUFFER,it);for(let K=0;K<N.locationSize;K++)w(N.location+K,V/N.locationSize,X,k,V*tt,V/N.locationSize*K*tt,dt)}}else if(F!==void 0){const k=F[D];if(k!==void 0)switch(k.length){case 2:s.vertexAttrib2fv(N.location,k);break;case 3:s.vertexAttrib3fv(N.location,k);break;case 4:s.vertexAttrib4fv(N.location,k);break;default:s.vertexAttrib1fv(N.location,k)}}}}y()}function T(){b();for(const S in n){const R=n[S];for(const O in R){const I=R[O];for(const A in I)h(I[A].object),delete I[A];delete R[O]}delete n[S]}}function M(S){if(n[S.id]===void 0)return;const R=n[S.id];for(const O in R){const I=R[O];for(const A in I)h(I[A].object),delete I[A];delete R[O]}delete n[S.id]}function E(S){for(const R in n){const O=n[R];if(O[S.id]===void 0)continue;const I=O[S.id];for(const A in I)h(I[A].object),delete I[A];delete O[S.id]}}function b(){_(),o=!0,r!==i&&(r=i,l(r.object))}function _(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:a,reset:b,resetDefaultState:_,dispose:T,releaseStatesOfGeometry:M,releaseStatesOfProgram:E,initAttributes:x,enableAttribute:g,disableUnusedAttributes:y}}function Rp(s,t,e){let n;function i(l){n=l}function r(l,h){s.drawArrays(n,l,h),e.update(h,n,1)}function o(l,h,d){d!==0&&(s.drawArraysInstanced(n,l,h,d),e.update(h,n,d))}function a(l,h,d){if(d===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,h,0,d);let f=0;for(let p=0;p<d;p++)f+=h[p];e.update(f,n,1)}function c(l,h,d,u){if(d===0)return;const f=t.get("WEBGL_multi_draw");if(f===null)for(let p=0;p<l.length;p++)o(l[p],h[p],u[p]);else{f.multiDrawArraysInstancedWEBGL(n,l,0,h,0,u,0,d);let p=0;for(let x=0;x<d;x++)p+=h[x]*u[x];e.update(p,n,1)}}this.setMode=i,this.render=r,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=c}function Pp(s,t,e,n){let i;function r(){if(i!==void 0)return i;if(t.has("EXT_texture_filter_anisotropic")===!0){const E=t.get("EXT_texture_filter_anisotropic");i=s.getParameter(E.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(E){return!(E!==je&&n.convert(E)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(E){const b=E===Cn&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(E!==vn&&n.convert(E)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE)&&E!==gn&&!b)}function c(E){if(E==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";E="mediump"}return E==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=e.precision!==void 0?e.precision:"highp";const h=c(l);h!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);const d=e.logarithmicDepthBuffer===!0,u=e.reverseDepthBuffer===!0&&t.has("EXT_clip_control"),f=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),p=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=s.getParameter(s.MAX_TEXTURE_SIZE),g=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),m=s.getParameter(s.MAX_VERTEX_ATTRIBS),y=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),w=s.getParameter(s.MAX_VARYING_VECTORS),v=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),T=p>0,M=s.getParameter(s.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:a,precision:l,logarithmicDepthBuffer:d,reverseDepthBuffer:u,maxTextures:f,maxVertexTextures:p,maxTextureSize:x,maxCubemapSize:g,maxAttributes:m,maxVertexUniforms:y,maxVaryings:w,maxFragmentUniforms:v,vertexTextures:T,maxSamples:M}}function Lp(s){const t=this;let e=null,n=0,i=!1,r=!1;const o=new Ti,a=new he,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){const f=d.length!==0||u||n!==0||i;return i=u,n=d.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(d,u){e=h(d,u,0)},this.setState=function(d,u,f){const p=d.clippingPlanes,x=d.clipIntersection,g=d.clipShadows,m=s.get(d);if(!i||p===null||p.length===0||r&&!g)r?h(null):l();else{const y=r?0:n,w=y*4;let v=m.clippingState||null;c.value=v,v=h(p,u,w,f);for(let T=0;T!==w;++T)v[T]=e[T];m.clippingState=v,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=y}};function l(){c.value!==e&&(c.value=e,c.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(d,u,f,p){const x=d!==null?d.length:0;let g=null;if(x!==0){if(g=c.value,p!==!0||g===null){const m=f+x*4,y=u.matrixWorldInverse;a.getNormalMatrix(y),(g===null||g.length<m)&&(g=new Float32Array(m));for(let w=0,v=f;w!==x;++w,v+=4)o.copy(d[w]).applyMatrix4(y,a),o.normal.toArray(g,v),g[v+3]=o.constant}c.value=g,c.needsUpdate=!0}return t.numPlanes=x,t.numIntersection=0,g}}function Dp(s){let t=new WeakMap;function e(o,a){return a===ga?o.mapping=ds:a===va&&(o.mapping=fs),o}function n(o){if(o&&o.isTexture){const a=o.mapping;if(a===ga||a===va)if(t.has(o)){const c=t.get(o).texture;return e(c,o.mapping)}else{const c=o.image;if(c&&c.height>0){const l=new Gd(c.height);return l.fromEquirectangularTexture(s,o),t.set(o,l),o.addEventListener("dispose",i),e(l.texture,o.mapping)}else return null}}return o}function i(o){const a=o.target;a.removeEventListener("dispose",i);const c=t.get(a);c!==void 0&&(t.delete(a),c.dispose())}function r(){t=new WeakMap}return{get:n,dispose:r}}class cr extends Nh{constructor(t=-1,e=1,n=1,i=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=i,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,i,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let r=n-t,o=n+t,a=i+e,c=i-e;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,o=r+l*this.view.width,a-=h*this.view.offsetY,c=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,c,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}const is=4,el=[.125,.215,.35,.446,.526,.582],Ri=20,Io=new cr,nl=new Ft;let zo=null,Uo=0,No=0,Fo=!1;const Ai=(1+Math.sqrt(5))/2,Ki=1/Ai,il=[new P(-Ai,Ki,0),new P(Ai,Ki,0),new P(-Ki,0,Ai),new P(Ki,0,Ai),new P(0,Ai,-Ki),new P(0,Ai,Ki),new P(-1,1,-1),new P(1,1,-1),new P(-1,1,1),new P(1,1,1)];class Xa{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,n=.1,i=100){zo=this._renderer.getRenderTarget(),Uo=this._renderer.getActiveCubeFace(),No=this._renderer.getActiveMipmapLevel(),Fo=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const r=this._allocateTargets();return r.depthBuffer=!0,this._sceneToCubeUV(t,n,i,r),e>0&&this._blur(r,0,0,e),this._applyPMREM(r),this._cleanup(r),r}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=ol(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=rl(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(zo,Uo,No),this._renderer.xr.enabled=Fo,t.scissorTest=!1,Fr(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===ds||t.mapping===fs?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),zo=this._renderer.getRenderTarget(),Uo=this._renderer.getActiveCubeFace(),No=this._renderer.getActiveMipmapLevel(),Fo=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:ve,minFilter:ve,generateMipmaps:!1,type:Cn,format:je,colorSpace:Ni,depthBuffer:!1},i=sl(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=sl(t,e,n);const{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Ip(r)),this._blurMaterial=zp(r,t,e)}return i}_compileMaterial(t){const e=new de(this._lodPlanes[0],t);this._renderer.compile(e,Io)}_sceneToCubeUV(t,e,n,i){const a=new mn(90,1,e,n),c=[1,-1,1,1,1,1],l=[1,1,1,-1,-1,-1],h=this._renderer,d=h.autoClear,u=h.toneMapping;h.getClearColor(nl),h.toneMapping=Yn,h.autoClear=!1;const f=new hc({name:"PMREM.Background",side:Ze,depthWrite:!1,depthTest:!1}),p=new de(new Xt,f);let x=!1;const g=t.background;g?g.isColor&&(f.color.copy(g),t.background=null,x=!0):(f.color.copy(nl),x=!0);for(let m=0;m<6;m++){const y=m%3;y===0?(a.up.set(0,c[m],0),a.lookAt(l[m],0,0)):y===1?(a.up.set(0,0,c[m]),a.lookAt(0,l[m],0)):(a.up.set(0,c[m],0),a.lookAt(0,0,l[m]));const w=this._cubeSize;Fr(i,y*w,m>2?w:0,w,w),h.setRenderTarget(i),x&&h.render(p,a),h.render(t,a)}p.geometry.dispose(),p.material.dispose(),h.toneMapping=u,h.autoClear=d,t.background=g}_textureToCubeUV(t,e){const n=this._renderer,i=t.mapping===ds||t.mapping===fs;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=ol()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=rl());const r=i?this._cubemapMaterial:this._equirectMaterial,o=new de(this._lodPlanes[0],r),a=r.uniforms;a.envMap.value=t;const c=this._cubeSize;Fr(e,0,0,3*c,2*c),n.setRenderTarget(e),n.render(o,Io)}_applyPMREM(t){const e=this._renderer,n=e.autoClear;e.autoClear=!1;const i=this._lodPlanes.length;for(let r=1;r<i;r++){const o=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),a=il[(i-r-1)%il.length];this._blur(t,r-1,r,o,a)}e.autoClear=n}_blur(t,e,n,i,r){const o=this._pingPongRenderTarget;this._halfBlur(t,o,e,n,i,"latitudinal",r),this._halfBlur(o,t,n,n,i,"longitudinal",r)}_halfBlur(t,e,n,i,r,o,a){const c=this._renderer,l=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,d=new de(this._lodPlanes[i],l),u=l.uniforms,f=this._sizeLods[n]-1,p=isFinite(r)?Math.PI/(2*f):2*Math.PI/(2*Ri-1),x=r/p,g=isFinite(r)?1+Math.floor(h*x):Ri;g>Ri&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${Ri}`);const m=[];let y=0;for(let E=0;E<Ri;++E){const b=E/x,_=Math.exp(-b*b/2);m.push(_),E===0?y+=_:E<g&&(y+=2*_)}for(let E=0;E<m.length;E++)m[E]=m[E]/y;u.envMap.value=t.texture,u.samples.value=g,u.weights.value=m,u.latitudinal.value=o==="latitudinal",a&&(u.poleAxis.value=a);const{_lodMax:w}=this;u.dTheta.value=p,u.mipInt.value=w-n;const v=this._sizeLods[i],T=3*v*(i>w-is?i-w+is:0),M=4*(this._cubeSize-v);Fr(e,T,M,3*v,2*v),c.setRenderTarget(e),c.render(d,Io)}}function Ip(s){const t=[],e=[],n=[];let i=s;const r=s-is+1+el.length;for(let o=0;o<r;o++){const a=Math.pow(2,i);e.push(a);let c=1/a;o>s-is?c=el[o-s+is-1]:o===0&&(c=0),n.push(c);const l=1/(a-2),h=-l,d=1+l,u=[h,h,d,h,d,d,h,h,d,d,h,d],f=6,p=6,x=3,g=2,m=1,y=new Float32Array(x*p*f),w=new Float32Array(g*p*f),v=new Float32Array(m*p*f);for(let M=0;M<f;M++){const E=M%3*2/3-1,b=M>2?0:-1,_=[E,b,0,E+2/3,b,0,E+2/3,b+1,0,E,b,0,E+2/3,b+1,0,E,b+1,0];y.set(_,x*p*M),w.set(u,g*p*M);const S=[M,M,M,M,M,M];v.set(S,m*p*M)}const T=new oe;T.setAttribute("position",new fe(y,x)),T.setAttribute("uv",new fe(w,g)),T.setAttribute("faceIndex",new fe(v,m)),t.push(T),i>is&&i--}return{lodPlanes:t,sizeLods:e,sigmas:n}}function sl(s,t,e){const n=new an(s,t,e);return n.texture.mapping=so,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Fr(s,t,e,n,i){s.viewport.set(t,e,n,i),s.scissor.set(t,e,n,i)}function zp(s,t,e){const n=new Float32Array(Ri),i=new P(0,1,0);return new De({name:"SphericalGaussianBlur",defines:{n:Ri,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:uc(),fragmentShader:`

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
		`,blending:di,depthTest:!1,depthWrite:!1})}function rl(){return new De({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:uc(),fragmentShader:`

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
		`,blending:di,depthTest:!1,depthWrite:!1})}function ol(){return new De({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:uc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:di,depthTest:!1,depthWrite:!1})}function uc(){return`

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
	`}function Up(s){let t=new WeakMap,e=null;function n(a){if(a&&a.isTexture){const c=a.mapping,l=c===ga||c===va,h=c===ds||c===fs;if(l||h){let d=t.get(a);const u=d!==void 0?d.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==u)return e===null&&(e=new Xa(s)),d=l?e.fromEquirectangular(a,d):e.fromCubemap(a,d),d.texture.pmremVersion=a.pmremVersion,t.set(a,d),d.texture;if(d!==void 0)return d.texture;{const f=a.image;return l&&f&&f.height>0||h&&f&&i(f)?(e===null&&(e=new Xa(s)),d=l?e.fromEquirectangular(a):e.fromCubemap(a),d.texture.pmremVersion=a.pmremVersion,t.set(a,d),a.addEventListener("dispose",r),d.texture):null}}}return a}function i(a){let c=0;const l=6;for(let h=0;h<l;h++)a[h]!==void 0&&c++;return c===l}function r(a){const c=a.target;c.removeEventListener("dispose",r);const l=t.get(c);l!==void 0&&(t.delete(c),l.dispose())}function o(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:n,dispose:o}}function Np(s){const t={};function e(n){if(t[n]!==void 0)return t[n];let i;switch(n){case"WEBGL_depth_texture":i=s.getExtension("WEBGL_depth_texture")||s.getExtension("MOZ_WEBGL_depth_texture")||s.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":i=s.getExtension("EXT_texture_filter_anisotropic")||s.getExtension("MOZ_EXT_texture_filter_anisotropic")||s.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":i=s.getExtension("WEBGL_compressed_texture_s3tc")||s.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":i=s.getExtension("WEBGL_compressed_texture_pvrtc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:i=s.getExtension(n)}return t[n]=i,i}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){const i=e(n);return i===null&&Xs("THREE.WebGLRenderer: "+n+" extension not supported."),i}}}function Fp(s,t,e,n){const i={},r=new WeakMap;function o(d){const u=d.target;u.index!==null&&t.remove(u.index);for(const p in u.attributes)t.remove(u.attributes[p]);for(const p in u.morphAttributes){const x=u.morphAttributes[p];for(let g=0,m=x.length;g<m;g++)t.remove(x[g])}u.removeEventListener("dispose",o),delete i[u.id];const f=r.get(u);f&&(t.remove(f),r.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function a(d,u){return i[u.id]===!0||(u.addEventListener("dispose",o),i[u.id]=!0,e.memory.geometries++),u}function c(d){const u=d.attributes;for(const p in u)t.update(u[p],s.ARRAY_BUFFER);const f=d.morphAttributes;for(const p in f){const x=f[p];for(let g=0,m=x.length;g<m;g++)t.update(x[g],s.ARRAY_BUFFER)}}function l(d){const u=[],f=d.index,p=d.attributes.position;let x=0;if(f!==null){const y=f.array;x=f.version;for(let w=0,v=y.length;w<v;w+=3){const T=y[w+0],M=y[w+1],E=y[w+2];u.push(T,M,M,E,E,T)}}else if(p!==void 0){const y=p.array;x=p.version;for(let w=0,v=y.length/3-1;w<v;w+=3){const T=w+0,M=w+1,E=w+2;u.push(T,M,M,E,E,T)}}else return;const g=new(Th(u)?zh:Ih)(u,1);g.version=x;const m=r.get(d);m&&t.remove(m),r.set(d,g)}function h(d){const u=r.get(d);if(u){const f=d.index;f!==null&&u.version<f.version&&l(d)}else l(d);return r.get(d)}return{get:a,update:c,getWireframeAttribute:h}}function Op(s,t,e){let n;function i(u){n=u}let r,o;function a(u){r=u.type,o=u.bytesPerElement}function c(u,f){s.drawElements(n,f,r,u*o),e.update(f,n,1)}function l(u,f,p){p!==0&&(s.drawElementsInstanced(n,f,r,u*o,p),e.update(f,n,p))}function h(u,f,p){if(p===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,r,u,0,p);let g=0;for(let m=0;m<p;m++)g+=f[m];e.update(g,n,1)}function d(u,f,p,x){if(p===0)return;const g=t.get("WEBGL_multi_draw");if(g===null)for(let m=0;m<u.length;m++)l(u[m]/o,f[m],x[m]);else{g.multiDrawElementsInstancedWEBGL(n,f,0,r,u,0,x,0,p);let m=0;for(let y=0;y<p;y++)m+=f[y]*x[y];e.update(m,n,1)}}this.setMode=i,this.setIndex=a,this.render=c,this.renderInstances=l,this.renderMultiDraw=h,this.renderMultiDrawInstances=d}function Bp(s){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(e.calls++,o){case s.TRIANGLES:e.triangles+=a*(r/3);break;case s.LINES:e.lines+=a*(r/2);break;case s.LINE_STRIP:e.lines+=a*(r-1);break;case s.LINE_LOOP:e.lines+=a*r;break;case s.POINTS:e.points+=a*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function i(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:i,update:n}}function kp(s,t,e){const n=new WeakMap,i=new be;function r(o,a,c){const l=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,d=h!==void 0?h.length:0;let u=n.get(a);if(u===void 0||u.count!==d){let S=function(){b.dispose(),n.delete(a),a.removeEventListener("dispose",S)};var f=S;u!==void 0&&u.texture.dispose();const p=a.morphAttributes.position!==void 0,x=a.morphAttributes.normal!==void 0,g=a.morphAttributes.color!==void 0,m=a.morphAttributes.position||[],y=a.morphAttributes.normal||[],w=a.morphAttributes.color||[];let v=0;p===!0&&(v=1),x===!0&&(v=2),g===!0&&(v=3);let T=a.attributes.position.count*v,M=1;T>t.maxTextureSize&&(M=Math.ceil(T/t.maxTextureSize),T=t.maxTextureSize);const E=new Float32Array(T*M*4*d),b=new Ch(E,T,M,d);b.type=gn,b.needsUpdate=!0;const _=v*4;for(let R=0;R<d;R++){const O=m[R],I=y[R],A=w[R],U=T*M*4*R;for(let F=0;F<O.count;F++){const D=F*_;p===!0&&(i.fromBufferAttribute(O,F),E[U+D+0]=i.x,E[U+D+1]=i.y,E[U+D+2]=i.z,E[U+D+3]=0),x===!0&&(i.fromBufferAttribute(I,F),E[U+D+4]=i.x,E[U+D+5]=i.y,E[U+D+6]=i.z,E[U+D+7]=0),g===!0&&(i.fromBufferAttribute(A,F),E[U+D+8]=i.x,E[U+D+9]=i.y,E[U+D+10]=i.z,E[U+D+11]=A.itemSize===4?i.w:1)}}u={count:d,texture:b,size:new Ut(T,M)},n.set(a,u),a.addEventListener("dispose",S)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)c.getUniforms().setValue(s,"morphTexture",o.morphTexture,e);else{let p=0;for(let g=0;g<l.length;g++)p+=l[g];const x=a.morphTargetsRelative?1:1-p;c.getUniforms().setValue(s,"morphTargetBaseInfluence",x),c.getUniforms().setValue(s,"morphTargetInfluences",l)}c.getUniforms().setValue(s,"morphTargetsTexture",u.texture,e),c.getUniforms().setValue(s,"morphTargetsTextureSize",u.size)}return{update:r}}function Hp(s,t,e,n){let i=new WeakMap;function r(c){const l=n.render.frame,h=c.geometry,d=t.get(c,h);if(i.get(d)!==l&&(t.update(d),i.set(d,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",a)===!1&&c.addEventListener("dispose",a),i.get(c)!==l&&(e.update(c.instanceMatrix,s.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,s.ARRAY_BUFFER),i.set(c,l))),c.isSkinnedMesh){const u=c.skeleton;i.get(u)!==l&&(u.update(),i.set(u,l))}return d}function o(){i=new WeakMap}function a(c){const l=c.target;l.removeEventListener("dispose",a),e.remove(l.instanceMatrix),l.instanceColor!==null&&e.remove(l.instanceColor)}return{update:r,dispose:o}}class dc extends Ke{constructor(t,e,n,i,r,o,a,c,l,h=as){if(h!==as&&h!==gs)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&h===as&&(n=Kn),n===void 0&&h===gs&&(n=ms),super(null,i,r,o,a,c,h,n,l),this.isDepthTexture=!0,this.image={width:t,height:e},this.magFilter=a!==void 0?a:sn,this.minFilter=c!==void 0?c:sn,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}const Bh=new Ke,al=new dc(1,1),kh=new Ch,Hh=new Rh,Gh=new Fh,cl=[],ll=[],hl=new Float32Array(16),ul=new Float32Array(9),dl=new Float32Array(4);function Ts(s,t,e){const n=s[0];if(n<=0||n>0)return s;const i=t*e;let r=cl[i];if(r===void 0&&(r=new Float32Array(i),cl[i]=r),t!==0){n.toArray(r,0);for(let o=1,a=0;o!==t;++o)a+=e,s[o].toArray(r,a)}return r}function Ue(s,t){if(s.length!==t.length)return!1;for(let e=0,n=s.length;e<n;e++)if(s[e]!==t[e])return!1;return!0}function Ne(s,t){for(let e=0,n=t.length;e<n;e++)s[e]=t[e]}function ao(s,t){let e=ll[t];e===void 0&&(e=new Int32Array(t),ll[t]=e);for(let n=0;n!==t;++n)e[n]=s.allocateTextureUnit();return e}function Gp(s,t){const e=this.cache;e[0]!==t&&(s.uniform1f(this.addr,t),e[0]=t)}function Vp(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ue(e,t))return;s.uniform2fv(this.addr,t),Ne(e,t)}}function Wp(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(s.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(Ue(e,t))return;s.uniform3fv(this.addr,t),Ne(e,t)}}function Xp(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ue(e,t))return;s.uniform4fv(this.addr,t),Ne(e,t)}}function qp(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(Ue(e,t))return;s.uniformMatrix2fv(this.addr,!1,t),Ne(e,t)}else{if(Ue(e,n))return;dl.set(n),s.uniformMatrix2fv(this.addr,!1,dl),Ne(e,n)}}function Yp(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(Ue(e,t))return;s.uniformMatrix3fv(this.addr,!1,t),Ne(e,t)}else{if(Ue(e,n))return;ul.set(n),s.uniformMatrix3fv(this.addr,!1,ul),Ne(e,n)}}function $p(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(Ue(e,t))return;s.uniformMatrix4fv(this.addr,!1,t),Ne(e,t)}else{if(Ue(e,n))return;hl.set(n),s.uniformMatrix4fv(this.addr,!1,hl),Ne(e,n)}}function jp(s,t){const e=this.cache;e[0]!==t&&(s.uniform1i(this.addr,t),e[0]=t)}function Zp(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ue(e,t))return;s.uniform2iv(this.addr,t),Ne(e,t)}}function Kp(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Ue(e,t))return;s.uniform3iv(this.addr,t),Ne(e,t)}}function Jp(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ue(e,t))return;s.uniform4iv(this.addr,t),Ne(e,t)}}function Qp(s,t){const e=this.cache;e[0]!==t&&(s.uniform1ui(this.addr,t),e[0]=t)}function tm(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ue(e,t))return;s.uniform2uiv(this.addr,t),Ne(e,t)}}function em(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Ue(e,t))return;s.uniform3uiv(this.addr,t),Ne(e,t)}}function nm(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ue(e,t))return;s.uniform4uiv(this.addr,t),Ne(e,t)}}function im(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);let r;this.type===s.SAMPLER_2D_SHADOW?(al.compareFunction=Eh,r=al):r=Bh,e.setTexture2D(t||r,i)}function sm(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTexture3D(t||Hh,i)}function rm(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTextureCube(t||Gh,i)}function om(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTexture2DArray(t||kh,i)}function am(s){switch(s){case 5126:return Gp;case 35664:return Vp;case 35665:return Wp;case 35666:return Xp;case 35674:return qp;case 35675:return Yp;case 35676:return $p;case 5124:case 35670:return jp;case 35667:case 35671:return Zp;case 35668:case 35672:return Kp;case 35669:case 35673:return Jp;case 5125:return Qp;case 36294:return tm;case 36295:return em;case 36296:return nm;case 35678:case 36198:case 36298:case 36306:case 35682:return im;case 35679:case 36299:case 36307:return sm;case 35680:case 36300:case 36308:case 36293:return rm;case 36289:case 36303:case 36311:case 36292:return om}}function cm(s,t){s.uniform1fv(this.addr,t)}function lm(s,t){const e=Ts(t,this.size,2);s.uniform2fv(this.addr,e)}function hm(s,t){const e=Ts(t,this.size,3);s.uniform3fv(this.addr,e)}function um(s,t){const e=Ts(t,this.size,4);s.uniform4fv(this.addr,e)}function dm(s,t){const e=Ts(t,this.size,4);s.uniformMatrix2fv(this.addr,!1,e)}function fm(s,t){const e=Ts(t,this.size,9);s.uniformMatrix3fv(this.addr,!1,e)}function pm(s,t){const e=Ts(t,this.size,16);s.uniformMatrix4fv(this.addr,!1,e)}function mm(s,t){s.uniform1iv(this.addr,t)}function gm(s,t){s.uniform2iv(this.addr,t)}function vm(s,t){s.uniform3iv(this.addr,t)}function xm(s,t){s.uniform4iv(this.addr,t)}function _m(s,t){s.uniform1uiv(this.addr,t)}function ym(s,t){s.uniform2uiv(this.addr,t)}function wm(s,t){s.uniform3uiv(this.addr,t)}function Mm(s,t){s.uniform4uiv(this.addr,t)}function Sm(s,t,e){const n=this.cache,i=t.length,r=ao(e,i);Ue(n,r)||(s.uniform1iv(this.addr,r),Ne(n,r));for(let o=0;o!==i;++o)e.setTexture2D(t[o]||Bh,r[o])}function bm(s,t,e){const n=this.cache,i=t.length,r=ao(e,i);Ue(n,r)||(s.uniform1iv(this.addr,r),Ne(n,r));for(let o=0;o!==i;++o)e.setTexture3D(t[o]||Hh,r[o])}function Em(s,t,e){const n=this.cache,i=t.length,r=ao(e,i);Ue(n,r)||(s.uniform1iv(this.addr,r),Ne(n,r));for(let o=0;o!==i;++o)e.setTextureCube(t[o]||Gh,r[o])}function Tm(s,t,e){const n=this.cache,i=t.length,r=ao(e,i);Ue(n,r)||(s.uniform1iv(this.addr,r),Ne(n,r));for(let o=0;o!==i;++o)e.setTexture2DArray(t[o]||kh,r[o])}function Am(s){switch(s){case 5126:return cm;case 35664:return lm;case 35665:return hm;case 35666:return um;case 35674:return dm;case 35675:return fm;case 35676:return pm;case 5124:case 35670:return mm;case 35667:case 35671:return gm;case 35668:case 35672:return vm;case 35669:case 35673:return xm;case 5125:return _m;case 36294:return ym;case 36295:return wm;case 36296:return Mm;case 35678:case 36198:case 36298:case 36306:case 35682:return Sm;case 35679:case 36299:case 36307:return bm;case 35680:case 36300:case 36308:case 36293:return Em;case 36289:case 36303:case 36311:case 36292:return Tm}}class Cm{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=am(e.type)}}class Rm{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=Am(e.type)}}class Pm{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){const i=this.seq;for(let r=0,o=i.length;r!==o;++r){const a=i[r];a.setValue(t,e[a.id],n)}}}const Oo=/(\w+)(\])?(\[|\.)?/g;function fl(s,t){s.seq.push(t),s.map[t.id]=t}function Lm(s,t,e){const n=s.name,i=n.length;for(Oo.lastIndex=0;;){const r=Oo.exec(n),o=Oo.lastIndex;let a=r[1];const c=r[2]==="]",l=r[3];if(c&&(a=a|0),l===void 0||l==="["&&o+2===i){fl(e,l===void 0?new Cm(a,s,t):new Rm(a,s,t));break}else{let d=e.map[a];d===void 0&&(d=new Pm(a),fl(e,d)),e=d}}}class Qr{constructor(t,e){this.seq=[],this.map={};const n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let i=0;i<n;++i){const r=t.getActiveUniform(e,i),o=t.getUniformLocation(e,r.name);Lm(r,o,this)}}setValue(t,e,n,i){const r=this.map[e];r!==void 0&&r.setValue(t,n,i)}setOptional(t,e,n){const i=e[n];i!==void 0&&this.setValue(t,n,i)}static upload(t,e,n,i){for(let r=0,o=e.length;r!==o;++r){const a=e[r],c=n[a.id];c.needsUpdate!==!1&&a.setValue(t,c.value,i)}}static seqWithValue(t,e){const n=[];for(let i=0,r=t.length;i!==r;++i){const o=t[i];o.id in e&&n.push(o)}return n}}function pl(s,t,e){const n=s.createShader(t);return s.shaderSource(n,e),s.compileShader(n),n}const Dm=37297;let Im=0;function zm(s,t){const e=s.split(`
`),n=[],i=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let o=i;o<r;o++){const a=o+1;n.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return n.join(`
`)}const ml=new he;function Um(s){me._getMatrix(ml,me.workingColorSpace,s);const t=`mat3( ${ml.elements.map(e=>e.toFixed(4))} )`;switch(me.getTransfer(s)){case oo:return[t,"LinearTransferOETF"];case _e:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",s),[t,"LinearTransferOETF"]}}function gl(s,t,e){const n=s.getShaderParameter(t,s.COMPILE_STATUS),i=s.getShaderInfoLog(t).trim();if(n&&i==="")return"";const r=/ERROR: 0:(\d+)/.exec(i);if(r){const o=parseInt(r[1]);return e.toUpperCase()+`

`+i+`

`+zm(s.getShaderSource(t),o)}else return i}function Nm(s,t){const e=Um(t);return[`vec4 ${s}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}function Fm(s,t){let e;switch(t){case Nu:e="Linear";break;case Fu:e="Reinhard";break;case Ou:e="Cineon";break;case Bu:e="ACESFilmic";break;case Hu:e="AgX";break;case Gu:e="Neutral";break;case ku:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+s+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const Or=new P;function Om(){me.getLuminanceCoefficients(Or);const s=Or.x.toFixed(4),t=Or.y.toFixed(4),e=Or.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Bm(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(qs).join(`
`)}function km(s){const t=[];for(const e in s){const n=s[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function Hm(s,t){const e={},n=s.getProgramParameter(t,s.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const r=s.getActiveAttrib(t,i),o=r.name;let a=1;r.type===s.FLOAT_MAT2&&(a=2),r.type===s.FLOAT_MAT3&&(a=3),r.type===s.FLOAT_MAT4&&(a=4),e[o]={type:r.type,location:s.getAttribLocation(t,o),locationSize:a}}return e}function qs(s){return s!==""}function vl(s,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return s.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function xl(s,t){return s.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const Gm=/^[ \t]*#include +<([\w\d./]+)>/gm;function qa(s){return s.replace(Gm,Wm)}const Vm=new Map;function Wm(s,t){let e=ce[t];if(e===void 0){const n=Vm.get(t);if(n!==void 0)e=ce[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("Can not resolve #include <"+t+">")}return qa(e)}const Xm=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function _l(s){return s.replace(Xm,qm)}function qm(s,t,e,n){let i="";for(let r=parseInt(t);r<parseInt(e);r++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return i}function yl(s){let t=`precision ${s.precision} float;
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
#define LOW_PRECISION`),t}function Ym(s){let t="SHADOWMAP_TYPE_BASIC";return s.shadowMapType===hh?t="SHADOWMAP_TYPE_PCF":s.shadowMapType===uh?t="SHADOWMAP_TYPE_PCF_SOFT":s.shadowMapType===Gn&&(t="SHADOWMAP_TYPE_VSM"),t}function $m(s){let t="ENVMAP_TYPE_CUBE";if(s.envMap)switch(s.envMapMode){case ds:case fs:t="ENVMAP_TYPE_CUBE";break;case so:t="ENVMAP_TYPE_CUBE_UV";break}return t}function jm(s){let t="ENVMAP_MODE_REFLECTION";if(s.envMap)switch(s.envMapMode){case fs:t="ENVMAP_MODE_REFRACTION";break}return t}function Zm(s){let t="ENVMAP_BLENDING_NONE";if(s.envMap)switch(s.combine){case dh:t="ENVMAP_BLENDING_MULTIPLY";break;case zu:t="ENVMAP_BLENDING_MIX";break;case Uu:t="ENVMAP_BLENDING_ADD";break}return t}function Km(s){const t=s.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),7*16)),texelHeight:n,maxMip:e}}function Jm(s,t,e,n){const i=s.getContext(),r=e.defines;let o=e.vertexShader,a=e.fragmentShader;const c=Ym(e),l=$m(e),h=jm(e),d=Zm(e),u=Km(e),f=Bm(e),p=km(r),x=i.createProgram();let g,m,y=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(g=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p].filter(qs).join(`
`),g.length>0&&(g+=`
`),m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p].filter(qs).join(`
`),m.length>0&&(m+=`
`)):(g=[yl(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(qs).join(`
`),m=[yl(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+l:"",e.envMap?"#define "+h:"",e.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Yn?"#define TONE_MAPPING":"",e.toneMapping!==Yn?ce.tonemapping_pars_fragment:"",e.toneMapping!==Yn?Fm("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",ce.colorspace_pars_fragment,Nm("linearToOutputTexel",e.outputColorSpace),Om(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(qs).join(`
`)),o=qa(o),o=vl(o,e),o=xl(o,e),a=qa(a),a=vl(a,e),a=xl(a,e),o=_l(o),a=_l(a),e.isRawShaderMaterial!==!0&&(y=`#version 300 es
`,g=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,m=["#define varying in",e.glslVersion===Ic?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Ic?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);const w=y+g+o,v=y+m+a,T=pl(i,i.VERTEX_SHADER,w),M=pl(i,i.FRAGMENT_SHADER,v);i.attachShader(x,T),i.attachShader(x,M),e.index0AttributeName!==void 0?i.bindAttribLocation(x,0,e.index0AttributeName):e.morphTargets===!0&&i.bindAttribLocation(x,0,"position"),i.linkProgram(x);function E(R){if(s.debug.checkShaderErrors){const O=i.getProgramInfoLog(x).trim(),I=i.getShaderInfoLog(T).trim(),A=i.getShaderInfoLog(M).trim();let U=!0,F=!0;if(i.getProgramParameter(x,i.LINK_STATUS)===!1)if(U=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(i,x,T,M);else{const D=gl(i,T,"vertex"),N=gl(i,M,"fragment");console.error("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(x,i.VALIDATE_STATUS)+`

Material Name: `+R.name+`
Material Type: `+R.type+`

Program Info Log: `+O+`
`+D+`
`+N)}else O!==""?console.warn("THREE.WebGLProgram: Program Info Log:",O):(I===""||A==="")&&(F=!1);F&&(R.diagnostics={runnable:U,programLog:O,vertexShader:{log:I,prefix:g},fragmentShader:{log:A,prefix:m}})}i.deleteShader(T),i.deleteShader(M),b=new Qr(i,x),_=Hm(i,x)}let b;this.getUniforms=function(){return b===void 0&&E(this),b};let _;this.getAttributes=function(){return _===void 0&&E(this),_};let S=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return S===!1&&(S=i.getProgramParameter(x,Dm)),S},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(x),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=Im++,this.cacheKey=t,this.usedTimes=1,this.program=x,this.vertexShader=T,this.fragmentShader=M,this}let Qm=0;class tg{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,n=t.fragmentShader,i=this._getShaderStage(e),r=this._getShaderStage(n),o=this._getShaderCacheForMaterial(t);return o.has(i)===!1&&(o.add(i),i.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){const e=this.shaderCache;let n=e.get(t);return n===void 0&&(n=new eg(t),e.set(t,n)),n}}class eg{constructor(t){this.id=Qm++,this.code=t,this.usedTimes=0}}function ng(s,t,e,n,i,r,o){const a=new Lh,c=new tg,l=new Set,h=[],d=i.logarithmicDepthBuffer,u=i.vertexTextures;let f=i.precision;const p={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(_){return l.add(_),_===0?"uv":`uv${_}`}function g(_,S,R,O,I){const A=O.fog,U=I.geometry,F=_.isMeshStandardMaterial?O.environment:null,D=(_.isMeshStandardMaterial?e:t).get(_.envMap||F),N=D&&D.mapping===so?D.image.height:null,B=p[_.type];_.precision!==null&&(f=i.getMaxPrecision(_.precision),f!==_.precision&&console.warn("THREE.WebGLProgram.getParameters:",_.precision,"not supported, using",f,"instead."));const k=U.morphAttributes.position||U.morphAttributes.normal||U.morphAttributes.color,V=k!==void 0?k.length:0;let J=0;U.morphAttributes.position!==void 0&&(J=1),U.morphAttributes.normal!==void 0&&(J=2),U.morphAttributes.color!==void 0&&(J=3);let it,X,tt,dt;if(B){const ge=Ln[B];it=ge.vertexShader,X=ge.fragmentShader}else it=_.vertexShader,X=_.fragmentShader,c.update(_),tt=c.getVertexShaderID(_),dt=c.getFragmentShaderID(_);const K=s.getRenderTarget(),et=s.state.buffers.depth.getReversed(),ot=I.isInstancedMesh===!0,mt=I.isBatchedMesh===!0,ut=!!_.map,nt=!!_.matcap,lt=!!D,H=!!_.aoMap,Pt=!!_.lightMap,gt=!!_.bumpMap,At=!!_.normalMap,vt=!!_.displacementMap,kt=!!_.emissiveMap,yt=!!_.metalnessMap,z=!!_.roughnessMap,C=_.anisotropy>0,$=_.clearcoat>0,q=_.dispersion>0,G=_.iridescence>0,Q=_.sheen>0,ft=_.transmission>0,ct=C&&!!_.anisotropyMap,_t=$&&!!_.clearcoatMap,Ot=$&&!!_.clearcoatNormalMap,ht=$&&!!_.clearcoatRoughnessMap,wt=G&&!!_.iridescenceMap,Lt=G&&!!_.iridescenceThicknessMap,Ht=Q&&!!_.sheenColorMap,St=Q&&!!_.sheenRoughnessMap,ee=!!_.specularMap,jt=!!_.specularColorMap,pe=!!_.specularIntensityMap,Y=ft&&!!_.transmissionMap,Et=ft&&!!_.thicknessMap,at=!!_.gradientMap,pt=!!_.alphaMap,Dt=_.alphaTest>0,It=!!_.alphaHash,ne=!!_.extensions;let xe=Yn;_.toneMapped&&(K===null||K.isXRRenderTarget===!0)&&(xe=s.toneMapping);const Se={shaderID:B,shaderType:_.type,shaderName:_.name,vertexShader:it,fragmentShader:X,defines:_.defines,customVertexShaderID:tt,customFragmentShaderID:dt,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:f,batching:mt,batchingColor:mt&&I._colorsTexture!==null,instancing:ot,instancingColor:ot&&I.instanceColor!==null,instancingMorph:ot&&I.morphTexture!==null,supportsVertexTextures:u,outputColorSpace:K===null?s.outputColorSpace:K.isXRRenderTarget===!0?K.texture.colorSpace:Ni,alphaToCoverage:!!_.alphaToCoverage,map:ut,matcap:nt,envMap:lt,envMapMode:lt&&D.mapping,envMapCubeUVHeight:N,aoMap:H,lightMap:Pt,bumpMap:gt,normalMap:At,displacementMap:u&&vt,emissiveMap:kt,normalMapObjectSpace:At&&_.normalMapType===Xu,normalMapTangentSpace:At&&_.normalMapType===bh,metalnessMap:yt,roughnessMap:z,anisotropy:C,anisotropyMap:ct,clearcoat:$,clearcoatMap:_t,clearcoatNormalMap:Ot,clearcoatRoughnessMap:ht,dispersion:q,iridescence:G,iridescenceMap:wt,iridescenceThicknessMap:Lt,sheen:Q,sheenColorMap:Ht,sheenRoughnessMap:St,specularMap:ee,specularColorMap:jt,specularIntensityMap:pe,transmission:ft,transmissionMap:Y,thicknessMap:Et,gradientMap:at,opaque:_.transparent===!1&&_.blending===qn&&_.alphaToCoverage===!1,alphaMap:pt,alphaTest:Dt,alphaHash:It,combine:_.combine,mapUv:ut&&x(_.map.channel),aoMapUv:H&&x(_.aoMap.channel),lightMapUv:Pt&&x(_.lightMap.channel),bumpMapUv:gt&&x(_.bumpMap.channel),normalMapUv:At&&x(_.normalMap.channel),displacementMapUv:vt&&x(_.displacementMap.channel),emissiveMapUv:kt&&x(_.emissiveMap.channel),metalnessMapUv:yt&&x(_.metalnessMap.channel),roughnessMapUv:z&&x(_.roughnessMap.channel),anisotropyMapUv:ct&&x(_.anisotropyMap.channel),clearcoatMapUv:_t&&x(_.clearcoatMap.channel),clearcoatNormalMapUv:Ot&&x(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ht&&x(_.clearcoatRoughnessMap.channel),iridescenceMapUv:wt&&x(_.iridescenceMap.channel),iridescenceThicknessMapUv:Lt&&x(_.iridescenceThicknessMap.channel),sheenColorMapUv:Ht&&x(_.sheenColorMap.channel),sheenRoughnessMapUv:St&&x(_.sheenRoughnessMap.channel),specularMapUv:ee&&x(_.specularMap.channel),specularColorMapUv:jt&&x(_.specularColorMap.channel),specularIntensityMapUv:pe&&x(_.specularIntensityMap.channel),transmissionMapUv:Y&&x(_.transmissionMap.channel),thicknessMapUv:Et&&x(_.thicknessMap.channel),alphaMapUv:pt&&x(_.alphaMap.channel),vertexTangents:!!U.attributes.tangent&&(At||C),vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!U.attributes.color&&U.attributes.color.itemSize===4,pointsUvs:I.isPoints===!0&&!!U.attributes.uv&&(ut||pt),fog:!!A,useFog:_.fog===!0,fogExp2:!!A&&A.isFogExp2,flatShading:_.flatShading===!0,sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:d,reverseDepthBuffer:et,skinning:I.isSkinnedMesh===!0,morphTargets:U.morphAttributes.position!==void 0,morphNormals:U.morphAttributes.normal!==void 0,morphColors:U.morphAttributes.color!==void 0,morphTargetsCount:V,morphTextureStride:J,numDirLights:S.directional.length,numPointLights:S.point.length,numSpotLights:S.spot.length,numSpotLightMaps:S.spotLightMap.length,numRectAreaLights:S.rectArea.length,numHemiLights:S.hemi.length,numDirLightShadows:S.directionalShadowMap.length,numPointLightShadows:S.pointShadowMap.length,numSpotLightShadows:S.spotShadowMap.length,numSpotLightShadowsWithMaps:S.numSpotLightShadowsWithMaps,numLightProbes:S.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:_.dithering,shadowMapEnabled:s.shadowMap.enabled&&R.length>0,shadowMapType:s.shadowMap.type,toneMapping:xe,decodeVideoTexture:ut&&_.map.isVideoTexture===!0&&me.getTransfer(_.map.colorSpace)===_e,decodeVideoTextureEmissive:kt&&_.emissiveMap.isVideoTexture===!0&&me.getTransfer(_.emissiveMap.colorSpace)===_e,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===Be,flipSided:_.side===Ze,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:ne&&_.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ne&&_.extensions.multiDraw===!0||mt)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return Se.vertexUv1s=l.has(1),Se.vertexUv2s=l.has(2),Se.vertexUv3s=l.has(3),l.clear(),Se}function m(_){const S=[];if(_.shaderID?S.push(_.shaderID):(S.push(_.customVertexShaderID),S.push(_.customFragmentShaderID)),_.defines!==void 0)for(const R in _.defines)S.push(R),S.push(_.defines[R]);return _.isRawShaderMaterial===!1&&(y(S,_),w(S,_),S.push(s.outputColorSpace)),S.push(_.customProgramCacheKey),S.join()}function y(_,S){_.push(S.precision),_.push(S.outputColorSpace),_.push(S.envMapMode),_.push(S.envMapCubeUVHeight),_.push(S.mapUv),_.push(S.alphaMapUv),_.push(S.lightMapUv),_.push(S.aoMapUv),_.push(S.bumpMapUv),_.push(S.normalMapUv),_.push(S.displacementMapUv),_.push(S.emissiveMapUv),_.push(S.metalnessMapUv),_.push(S.roughnessMapUv),_.push(S.anisotropyMapUv),_.push(S.clearcoatMapUv),_.push(S.clearcoatNormalMapUv),_.push(S.clearcoatRoughnessMapUv),_.push(S.iridescenceMapUv),_.push(S.iridescenceThicknessMapUv),_.push(S.sheenColorMapUv),_.push(S.sheenRoughnessMapUv),_.push(S.specularMapUv),_.push(S.specularColorMapUv),_.push(S.specularIntensityMapUv),_.push(S.transmissionMapUv),_.push(S.thicknessMapUv),_.push(S.combine),_.push(S.fogExp2),_.push(S.sizeAttenuation),_.push(S.morphTargetsCount),_.push(S.morphAttributeCount),_.push(S.numDirLights),_.push(S.numPointLights),_.push(S.numSpotLights),_.push(S.numSpotLightMaps),_.push(S.numHemiLights),_.push(S.numRectAreaLights),_.push(S.numDirLightShadows),_.push(S.numPointLightShadows),_.push(S.numSpotLightShadows),_.push(S.numSpotLightShadowsWithMaps),_.push(S.numLightProbes),_.push(S.shadowMapType),_.push(S.toneMapping),_.push(S.numClippingPlanes),_.push(S.numClipIntersection),_.push(S.depthPacking)}function w(_,S){a.disableAll(),S.supportsVertexTextures&&a.enable(0),S.instancing&&a.enable(1),S.instancingColor&&a.enable(2),S.instancingMorph&&a.enable(3),S.matcap&&a.enable(4),S.envMap&&a.enable(5),S.normalMapObjectSpace&&a.enable(6),S.normalMapTangentSpace&&a.enable(7),S.clearcoat&&a.enable(8),S.iridescence&&a.enable(9),S.alphaTest&&a.enable(10),S.vertexColors&&a.enable(11),S.vertexAlphas&&a.enable(12),S.vertexUv1s&&a.enable(13),S.vertexUv2s&&a.enable(14),S.vertexUv3s&&a.enable(15),S.vertexTangents&&a.enable(16),S.anisotropy&&a.enable(17),S.alphaHash&&a.enable(18),S.batching&&a.enable(19),S.dispersion&&a.enable(20),S.batchingColor&&a.enable(21),_.push(a.mask),a.disableAll(),S.fog&&a.enable(0),S.useFog&&a.enable(1),S.flatShading&&a.enable(2),S.logarithmicDepthBuffer&&a.enable(3),S.reverseDepthBuffer&&a.enable(4),S.skinning&&a.enable(5),S.morphTargets&&a.enable(6),S.morphNormals&&a.enable(7),S.morphColors&&a.enable(8),S.premultipliedAlpha&&a.enable(9),S.shadowMapEnabled&&a.enable(10),S.doubleSided&&a.enable(11),S.flipSided&&a.enable(12),S.useDepthPacking&&a.enable(13),S.dithering&&a.enable(14),S.transmission&&a.enable(15),S.sheen&&a.enable(16),S.opaque&&a.enable(17),S.pointsUvs&&a.enable(18),S.decodeVideoTexture&&a.enable(19),S.decodeVideoTextureEmissive&&a.enable(20),S.alphaToCoverage&&a.enable(21),_.push(a.mask)}function v(_){const S=p[_.type];let R;if(S){const O=Ln[S];R=Od.clone(O.uniforms)}else R=_.uniforms;return R}function T(_,S){let R;for(let O=0,I=h.length;O<I;O++){const A=h[O];if(A.cacheKey===S){R=A,++R.usedTimes;break}}return R===void 0&&(R=new Jm(s,S,_,r),h.push(R)),R}function M(_){if(--_.usedTimes===0){const S=h.indexOf(_);h[S]=h[h.length-1],h.pop(),_.destroy()}}function E(_){c.remove(_)}function b(){c.dispose()}return{getParameters:g,getProgramCacheKey:m,getUniforms:v,acquireProgram:T,releaseProgram:M,releaseShaderCache:E,programs:h,dispose:b}}function ig(){let s=new WeakMap;function t(o){return s.has(o)}function e(o){let a=s.get(o);return a===void 0&&(a={},s.set(o,a)),a}function n(o){s.delete(o)}function i(o,a,c){s.get(o)[a]=c}function r(){s=new WeakMap}return{has:t,get:e,remove:n,update:i,dispose:r}}function sg(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.material.id!==t.material.id?s.material.id-t.material.id:s.z!==t.z?s.z-t.z:s.id-t.id}function wl(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.z!==t.z?t.z-s.z:s.id-t.id}function Ml(){const s=[];let t=0;const e=[],n=[],i=[];function r(){t=0,e.length=0,n.length=0,i.length=0}function o(d,u,f,p,x,g){let m=s[t];return m===void 0?(m={id:d.id,object:d,geometry:u,material:f,groupOrder:p,renderOrder:d.renderOrder,z:x,group:g},s[t]=m):(m.id=d.id,m.object=d,m.geometry=u,m.material=f,m.groupOrder=p,m.renderOrder=d.renderOrder,m.z=x,m.group=g),t++,m}function a(d,u,f,p,x,g){const m=o(d,u,f,p,x,g);f.transmission>0?n.push(m):f.transparent===!0?i.push(m):e.push(m)}function c(d,u,f,p,x,g){const m=o(d,u,f,p,x,g);f.transmission>0?n.unshift(m):f.transparent===!0?i.unshift(m):e.unshift(m)}function l(d,u){e.length>1&&e.sort(d||sg),n.length>1&&n.sort(u||wl),i.length>1&&i.sort(u||wl)}function h(){for(let d=t,u=s.length;d<u;d++){const f=s[d];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:e,transmissive:n,transparent:i,init:r,push:a,unshift:c,finish:h,sort:l}}function rg(){let s=new WeakMap;function t(n,i){const r=s.get(n);let o;return r===void 0?(o=new Ml,s.set(n,[o])):i>=r.length?(o=new Ml,r.push(o)):o=r[i],o}function e(){s=new WeakMap}return{get:t,dispose:e}}function og(){const s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new P,color:new Ft};break;case"SpotLight":e={position:new P,direction:new P,color:new Ft,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new P,color:new Ft,distance:0,decay:0};break;case"HemisphereLight":e={direction:new P,skyColor:new Ft,groundColor:new Ft};break;case"RectAreaLight":e={color:new Ft,position:new P,halfWidth:new P,halfHeight:new P};break}return s[t.id]=e,e}}}function ag(){const s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ut};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ut};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ut,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[t.id]=e,e}}}let cg=0;function lg(s,t){return(t.castShadow?2:0)-(s.castShadow?2:0)+(t.map?1:0)-(s.map?1:0)}function hg(s){const t=new og,e=ag(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new P);const i=new P,r=new Yt,o=new Yt;function a(l){let h=0,d=0,u=0;for(let _=0;_<9;_++)n.probe[_].set(0,0,0);let f=0,p=0,x=0,g=0,m=0,y=0,w=0,v=0,T=0,M=0,E=0;l.sort(lg);for(let _=0,S=l.length;_<S;_++){const R=l[_],O=R.color,I=R.intensity,A=R.distance,U=R.shadow&&R.shadow.map?R.shadow.map.texture:null;if(R.isAmbientLight)h+=O.r*I,d+=O.g*I,u+=O.b*I;else if(R.isLightProbe){for(let F=0;F<9;F++)n.probe[F].addScaledVector(R.sh.coefficients[F],I);E++}else if(R.isDirectionalLight){const F=t.get(R);if(F.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){const D=R.shadow,N=e.get(R);N.shadowIntensity=D.intensity,N.shadowBias=D.bias,N.shadowNormalBias=D.normalBias,N.shadowRadius=D.radius,N.shadowMapSize=D.mapSize,n.directionalShadow[f]=N,n.directionalShadowMap[f]=U,n.directionalShadowMatrix[f]=R.shadow.matrix,y++}n.directional[f]=F,f++}else if(R.isSpotLight){const F=t.get(R);F.position.setFromMatrixPosition(R.matrixWorld),F.color.copy(O).multiplyScalar(I),F.distance=A,F.coneCos=Math.cos(R.angle),F.penumbraCos=Math.cos(R.angle*(1-R.penumbra)),F.decay=R.decay,n.spot[x]=F;const D=R.shadow;if(R.map&&(n.spotLightMap[T]=R.map,T++,D.updateMatrices(R),R.castShadow&&M++),n.spotLightMatrix[x]=D.matrix,R.castShadow){const N=e.get(R);N.shadowIntensity=D.intensity,N.shadowBias=D.bias,N.shadowNormalBias=D.normalBias,N.shadowRadius=D.radius,N.shadowMapSize=D.mapSize,n.spotShadow[x]=N,n.spotShadowMap[x]=U,v++}x++}else if(R.isRectAreaLight){const F=t.get(R);F.color.copy(O).multiplyScalar(I),F.halfWidth.set(R.width*.5,0,0),F.halfHeight.set(0,R.height*.5,0),n.rectArea[g]=F,g++}else if(R.isPointLight){const F=t.get(R);if(F.color.copy(R.color).multiplyScalar(R.intensity),F.distance=R.distance,F.decay=R.decay,R.castShadow){const D=R.shadow,N=e.get(R);N.shadowIntensity=D.intensity,N.shadowBias=D.bias,N.shadowNormalBias=D.normalBias,N.shadowRadius=D.radius,N.shadowMapSize=D.mapSize,N.shadowCameraNear=D.camera.near,N.shadowCameraFar=D.camera.far,n.pointShadow[p]=N,n.pointShadowMap[p]=U,n.pointShadowMatrix[p]=R.shadow.matrix,w++}n.point[p]=F,p++}else if(R.isHemisphereLight){const F=t.get(R);F.skyColor.copy(R.color).multiplyScalar(I),F.groundColor.copy(R.groundColor).multiplyScalar(I),n.hemi[m]=F,m++}}g>0&&(s.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Rt.LTC_FLOAT_1,n.rectAreaLTC2=Rt.LTC_FLOAT_2):(n.rectAreaLTC1=Rt.LTC_HALF_1,n.rectAreaLTC2=Rt.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=d,n.ambient[2]=u;const b=n.hash;(b.directionalLength!==f||b.pointLength!==p||b.spotLength!==x||b.rectAreaLength!==g||b.hemiLength!==m||b.numDirectionalShadows!==y||b.numPointShadows!==w||b.numSpotShadows!==v||b.numSpotMaps!==T||b.numLightProbes!==E)&&(n.directional.length=f,n.spot.length=x,n.rectArea.length=g,n.point.length=p,n.hemi.length=m,n.directionalShadow.length=y,n.directionalShadowMap.length=y,n.pointShadow.length=w,n.pointShadowMap.length=w,n.spotShadow.length=v,n.spotShadowMap.length=v,n.directionalShadowMatrix.length=y,n.pointShadowMatrix.length=w,n.spotLightMatrix.length=v+T-M,n.spotLightMap.length=T,n.numSpotLightShadowsWithMaps=M,n.numLightProbes=E,b.directionalLength=f,b.pointLength=p,b.spotLength=x,b.rectAreaLength=g,b.hemiLength=m,b.numDirectionalShadows=y,b.numPointShadows=w,b.numSpotShadows=v,b.numSpotMaps=T,b.numLightProbes=E,n.version=cg++)}function c(l,h){let d=0,u=0,f=0,p=0,x=0;const g=h.matrixWorldInverse;for(let m=0,y=l.length;m<y;m++){const w=l[m];if(w.isDirectionalLight){const v=n.directional[d];v.direction.setFromMatrixPosition(w.matrixWorld),i.setFromMatrixPosition(w.target.matrixWorld),v.direction.sub(i),v.direction.transformDirection(g),d++}else if(w.isSpotLight){const v=n.spot[f];v.position.setFromMatrixPosition(w.matrixWorld),v.position.applyMatrix4(g),v.direction.setFromMatrixPosition(w.matrixWorld),i.setFromMatrixPosition(w.target.matrixWorld),v.direction.sub(i),v.direction.transformDirection(g),f++}else if(w.isRectAreaLight){const v=n.rectArea[p];v.position.setFromMatrixPosition(w.matrixWorld),v.position.applyMatrix4(g),o.identity(),r.copy(w.matrixWorld),r.premultiply(g),o.extractRotation(r),v.halfWidth.set(w.width*.5,0,0),v.halfHeight.set(0,w.height*.5,0),v.halfWidth.applyMatrix4(o),v.halfHeight.applyMatrix4(o),p++}else if(w.isPointLight){const v=n.point[u];v.position.setFromMatrixPosition(w.matrixWorld),v.position.applyMatrix4(g),u++}else if(w.isHemisphereLight){const v=n.hemi[x];v.direction.setFromMatrixPosition(w.matrixWorld),v.direction.transformDirection(g),x++}}}return{setup:a,setupView:c,state:n}}function Sl(s){const t=new hg(s),e=[],n=[];function i(h){l.camera=h,e.length=0,n.length=0}function r(h){e.push(h)}function o(h){n.push(h)}function a(){t.setup(e)}function c(h){t.setupView(e,h)}const l={lightsArray:e,shadowsArray:n,camera:null,lights:t,transmissionRenderTarget:{}};return{init:i,state:l,setupLights:a,setupLightsView:c,pushLight:r,pushShadow:o}}function ug(s){let t=new WeakMap;function e(i,r=0){const o=t.get(i);let a;return o===void 0?(a=new Sl(s),t.set(i,[a])):r>=o.length?(a=new Sl(s),o.push(a)):a=o[r],a}function n(){t=new WeakMap}return{get:e,dispose:n}}class Vh extends Es{static get type(){return"MeshDepthMaterial"}constructor(t){super(),this.isMeshDepthMaterial=!0,this.depthPacking=Wu,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class dg extends Es{static get type(){return"MeshDistanceMaterial"}constructor(t){super(),this.isMeshDistanceMaterial=!0,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}const fg=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,pg=`uniform sampler2D shadow_pass;
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
}`;function mg(s,t,e){let n=new xs;const i=new Ut,r=new Ut,o=new be,a=new Vh({depthPacking:Sh}),c=new dg,l={},h=e.maxTextureSize,d={[Zn]:Ze,[Ze]:Zn,[Be]:Be},u=new De({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ut},radius:{value:4}},vertexShader:fg,fragmentShader:pg}),f=u.clone();f.defines.HORIZONTAL_PASS=1;const p=new oe;p.setAttribute("position",new fe(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const x=new de(p,u),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=hh;let m=this.type;this.render=function(M,E,b){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||M.length===0)return;const _=s.getRenderTarget(),S=s.getActiveCubeFace(),R=s.getActiveMipmapLevel(),O=s.state;O.setBlending(di),O.buffers.color.setClear(1,1,1,1),O.buffers.depth.setTest(!0),O.setScissorTest(!1);const I=m!==Gn&&this.type===Gn,A=m===Gn&&this.type!==Gn;for(let U=0,F=M.length;U<F;U++){const D=M[U],N=D.shadow;if(N===void 0){console.warn("THREE.WebGLShadowMap:",D,"has no shadow.");continue}if(N.autoUpdate===!1&&N.needsUpdate===!1)continue;i.copy(N.mapSize);const B=N.getFrameExtents();if(i.multiply(B),r.copy(N.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(r.x=Math.floor(h/B.x),i.x=r.x*B.x,N.mapSize.x=r.x),i.y>h&&(r.y=Math.floor(h/B.y),i.y=r.y*B.y,N.mapSize.y=r.y)),N.map===null||I===!0||A===!0){const V=this.type!==Gn?{minFilter:sn,magFilter:sn}:{};N.map!==null&&N.map.dispose(),N.map=new an(i.x,i.y,V),N.map.texture.name=D.name+".shadowMap",N.camera.updateProjectionMatrix()}s.setRenderTarget(N.map),s.clear();const k=N.getViewportCount();for(let V=0;V<k;V++){const J=N.getViewport(V);o.set(r.x*J.x,r.y*J.y,r.x*J.z,r.y*J.w),O.viewport(o),N.updateMatrices(D,V),n=N.getFrustum(),v(E,b,N.camera,D,this.type)}N.isPointLightShadow!==!0&&this.type===Gn&&y(N,b),N.needsUpdate=!1}m=this.type,g.needsUpdate=!1,s.setRenderTarget(_,S,R)};function y(M,E){const b=t.update(x);u.defines.VSM_SAMPLES!==M.blurSamples&&(u.defines.VSM_SAMPLES=M.blurSamples,f.defines.VSM_SAMPLES=M.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),M.mapPass===null&&(M.mapPass=new an(i.x,i.y)),u.uniforms.shadow_pass.value=M.map.texture,u.uniforms.resolution.value=M.mapSize,u.uniforms.radius.value=M.radius,s.setRenderTarget(M.mapPass),s.clear(),s.renderBufferDirect(E,null,b,u,x,null),f.uniforms.shadow_pass.value=M.mapPass.texture,f.uniforms.resolution.value=M.mapSize,f.uniforms.radius.value=M.radius,s.setRenderTarget(M.map),s.clear(),s.renderBufferDirect(E,null,b,f,x,null)}function w(M,E,b,_){let S=null;const R=b.isPointLight===!0?M.customDistanceMaterial:M.customDepthMaterial;if(R!==void 0)S=R;else if(S=b.isPointLight===!0?c:a,s.localClippingEnabled&&E.clipShadows===!0&&Array.isArray(E.clippingPlanes)&&E.clippingPlanes.length!==0||E.displacementMap&&E.displacementScale!==0||E.alphaMap&&E.alphaTest>0||E.map&&E.alphaTest>0){const O=S.uuid,I=E.uuid;let A=l[O];A===void 0&&(A={},l[O]=A);let U=A[I];U===void 0&&(U=S.clone(),A[I]=U,E.addEventListener("dispose",T)),S=U}if(S.visible=E.visible,S.wireframe=E.wireframe,_===Gn?S.side=E.shadowSide!==null?E.shadowSide:E.side:S.side=E.shadowSide!==null?E.shadowSide:d[E.side],S.alphaMap=E.alphaMap,S.alphaTest=E.alphaTest,S.map=E.map,S.clipShadows=E.clipShadows,S.clippingPlanes=E.clippingPlanes,S.clipIntersection=E.clipIntersection,S.displacementMap=E.displacementMap,S.displacementScale=E.displacementScale,S.displacementBias=E.displacementBias,S.wireframeLinewidth=E.wireframeLinewidth,S.linewidth=E.linewidth,b.isPointLight===!0&&S.isMeshDistanceMaterial===!0){const O=s.properties.get(S);O.light=b}return S}function v(M,E,b,_,S){if(M.visible===!1)return;if(M.layers.test(E.layers)&&(M.isMesh||M.isLine||M.isPoints)&&(M.castShadow||M.receiveShadow&&S===Gn)&&(!M.frustumCulled||n.intersectsObject(M))){M.modelViewMatrix.multiplyMatrices(b.matrixWorldInverse,M.matrixWorld);const I=t.update(M),A=M.material;if(Array.isArray(A)){const U=I.groups;for(let F=0,D=U.length;F<D;F++){const N=U[F],B=A[N.materialIndex];if(B&&B.visible){const k=w(M,B,_,S);M.onBeforeShadow(s,M,E,b,I,k,N),s.renderBufferDirect(b,null,I,k,M,N),M.onAfterShadow(s,M,E,b,I,k,N)}}}else if(A.visible){const U=w(M,A,_,S);M.onBeforeShadow(s,M,E,b,I,U,null),s.renderBufferDirect(b,null,I,U,M,null),M.onAfterShadow(s,M,E,b,I,U,null)}}const O=M.children;for(let I=0,A=O.length;I<A;I++)v(O[I],E,b,_,S)}function T(M){M.target.removeEventListener("dispose",T);for(const b in l){const _=l[b],S=M.target.uuid;S in _&&(_[S].dispose(),delete _[S])}}}const gg={[la]:ha,[ua]:pa,[da]:ma,[us]:fa,[ha]:la,[pa]:ua,[ma]:da,[fa]:us};function vg(s,t){function e(){let Y=!1;const Et=new be;let at=null;const pt=new be(0,0,0,0);return{setMask:function(Dt){at!==Dt&&!Y&&(s.colorMask(Dt,Dt,Dt,Dt),at=Dt)},setLocked:function(Dt){Y=Dt},setClear:function(Dt,It,ne,xe,Se){Se===!0&&(Dt*=xe,It*=xe,ne*=xe),Et.set(Dt,It,ne,xe),pt.equals(Et)===!1&&(s.clearColor(Dt,It,ne,xe),pt.copy(Et))},reset:function(){Y=!1,at=null,pt.set(-1,0,0,0)}}}function n(){let Y=!1,Et=!1,at=null,pt=null,Dt=null;return{setReversed:function(It){if(Et!==It){const ne=t.get("EXT_clip_control");Et?ne.clipControlEXT(ne.LOWER_LEFT_EXT,ne.ZERO_TO_ONE_EXT):ne.clipControlEXT(ne.LOWER_LEFT_EXT,ne.NEGATIVE_ONE_TO_ONE_EXT);const xe=Dt;Dt=null,this.setClear(xe)}Et=It},getReversed:function(){return Et},setTest:function(It){It?K(s.DEPTH_TEST):et(s.DEPTH_TEST)},setMask:function(It){at!==It&&!Y&&(s.depthMask(It),at=It)},setFunc:function(It){if(Et&&(It=gg[It]),pt!==It){switch(It){case la:s.depthFunc(s.NEVER);break;case ha:s.depthFunc(s.ALWAYS);break;case ua:s.depthFunc(s.LESS);break;case us:s.depthFunc(s.LEQUAL);break;case da:s.depthFunc(s.EQUAL);break;case fa:s.depthFunc(s.GEQUAL);break;case pa:s.depthFunc(s.GREATER);break;case ma:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}pt=It}},setLocked:function(It){Y=It},setClear:function(It){Dt!==It&&(Et&&(It=1-It),s.clearDepth(It),Dt=It)},reset:function(){Y=!1,at=null,pt=null,Dt=null,Et=!1}}}function i(){let Y=!1,Et=null,at=null,pt=null,Dt=null,It=null,ne=null,xe=null,Se=null;return{setTest:function(ge){Y||(ge?K(s.STENCIL_TEST):et(s.STENCIL_TEST))},setMask:function(ge){Et!==ge&&!Y&&(s.stencilMask(ge),Et=ge)},setFunc:function(ge,Je,xn){(at!==ge||pt!==Je||Dt!==xn)&&(s.stencilFunc(ge,Je,xn),at=ge,pt=Je,Dt=xn)},setOp:function(ge,Je,xn){(It!==ge||ne!==Je||xe!==xn)&&(s.stencilOp(ge,Je,xn),It=ge,ne=Je,xe=xn)},setLocked:function(ge){Y=ge},setClear:function(ge){Se!==ge&&(s.clearStencil(ge),Se=ge)},reset:function(){Y=!1,Et=null,at=null,pt=null,Dt=null,It=null,ne=null,xe=null,Se=null}}}const r=new e,o=new n,a=new i,c=new WeakMap,l=new WeakMap;let h={},d={},u=new WeakMap,f=[],p=null,x=!1,g=null,m=null,y=null,w=null,v=null,T=null,M=null,E=new Ft(0,0,0),b=0,_=!1,S=null,R=null,O=null,I=null,A=null;const U=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let F=!1,D=0;const N=s.getParameter(s.VERSION);N.indexOf("WebGL")!==-1?(D=parseFloat(/^WebGL (\d)/.exec(N)[1]),F=D>=1):N.indexOf("OpenGL ES")!==-1&&(D=parseFloat(/^OpenGL ES (\d)/.exec(N)[1]),F=D>=2);let B=null,k={};const V=s.getParameter(s.SCISSOR_BOX),J=s.getParameter(s.VIEWPORT),it=new be().fromArray(V),X=new be().fromArray(J);function tt(Y,Et,at,pt){const Dt=new Uint8Array(4),It=s.createTexture();s.bindTexture(Y,It),s.texParameteri(Y,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(Y,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let ne=0;ne<at;ne++)Y===s.TEXTURE_3D||Y===s.TEXTURE_2D_ARRAY?s.texImage3D(Et,0,s.RGBA,1,1,pt,0,s.RGBA,s.UNSIGNED_BYTE,Dt):s.texImage2D(Et+ne,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,Dt);return It}const dt={};dt[s.TEXTURE_2D]=tt(s.TEXTURE_2D,s.TEXTURE_2D,1),dt[s.TEXTURE_CUBE_MAP]=tt(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),dt[s.TEXTURE_2D_ARRAY]=tt(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),dt[s.TEXTURE_3D]=tt(s.TEXTURE_3D,s.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),K(s.DEPTH_TEST),o.setFunc(us),gt(!1),At(Tc),K(s.CULL_FACE),H(di);function K(Y){h[Y]!==!0&&(s.enable(Y),h[Y]=!0)}function et(Y){h[Y]!==!1&&(s.disable(Y),h[Y]=!1)}function ot(Y,Et){return d[Y]!==Et?(s.bindFramebuffer(Y,Et),d[Y]=Et,Y===s.DRAW_FRAMEBUFFER&&(d[s.FRAMEBUFFER]=Et),Y===s.FRAMEBUFFER&&(d[s.DRAW_FRAMEBUFFER]=Et),!0):!1}function mt(Y,Et){let at=f,pt=!1;if(Y){at=u.get(Et),at===void 0&&(at=[],u.set(Et,at));const Dt=Y.textures;if(at.length!==Dt.length||at[0]!==s.COLOR_ATTACHMENT0){for(let It=0,ne=Dt.length;It<ne;It++)at[It]=s.COLOR_ATTACHMENT0+It;at.length=Dt.length,pt=!0}}else at[0]!==s.BACK&&(at[0]=s.BACK,pt=!0);pt&&s.drawBuffers(at)}function ut(Y){return p!==Y?(s.useProgram(Y),p=Y,!0):!1}const nt={[Ci]:s.FUNC_ADD,[vu]:s.FUNC_SUBTRACT,[xu]:s.FUNC_REVERSE_SUBTRACT};nt[_u]=s.MIN,nt[yu]=s.MAX;const lt={[wu]:s.ZERO,[Mu]:s.ONE,[Su]:s.SRC_COLOR,[aa]:s.SRC_ALPHA,[Ru]:s.SRC_ALPHA_SATURATE,[Au]:s.DST_COLOR,[Eu]:s.DST_ALPHA,[bu]:s.ONE_MINUS_SRC_COLOR,[ca]:s.ONE_MINUS_SRC_ALPHA,[Cu]:s.ONE_MINUS_DST_COLOR,[Tu]:s.ONE_MINUS_DST_ALPHA,[Pu]:s.CONSTANT_COLOR,[Lu]:s.ONE_MINUS_CONSTANT_COLOR,[Du]:s.CONSTANT_ALPHA,[Iu]:s.ONE_MINUS_CONSTANT_ALPHA};function H(Y,Et,at,pt,Dt,It,ne,xe,Se,ge){if(Y===di){x===!0&&(et(s.BLEND),x=!1);return}if(x===!1&&(K(s.BLEND),x=!0),Y!==gu){if(Y!==g||ge!==_){if((m!==Ci||v!==Ci)&&(s.blendEquation(s.FUNC_ADD),m=Ci,v=Ci),ge)switch(Y){case qn:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case Ac:s.blendFunc(s.ONE,s.ONE);break;case Cc:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case Rc:s.blendFuncSeparate(s.ZERO,s.SRC_COLOR,s.ZERO,s.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",Y);break}else switch(Y){case qn:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case Ac:s.blendFunc(s.SRC_ALPHA,s.ONE);break;case Cc:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case Rc:s.blendFunc(s.ZERO,s.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",Y);break}y=null,w=null,T=null,M=null,E.set(0,0,0),b=0,g=Y,_=ge}return}Dt=Dt||Et,It=It||at,ne=ne||pt,(Et!==m||Dt!==v)&&(s.blendEquationSeparate(nt[Et],nt[Dt]),m=Et,v=Dt),(at!==y||pt!==w||It!==T||ne!==M)&&(s.blendFuncSeparate(lt[at],lt[pt],lt[It],lt[ne]),y=at,w=pt,T=It,M=ne),(xe.equals(E)===!1||Se!==b)&&(s.blendColor(xe.r,xe.g,xe.b,Se),E.copy(xe),b=Se),g=Y,_=!1}function Pt(Y,Et){Y.side===Be?et(s.CULL_FACE):K(s.CULL_FACE);let at=Y.side===Ze;Et&&(at=!at),gt(at),Y.blending===qn&&Y.transparent===!1?H(di):H(Y.blending,Y.blendEquation,Y.blendSrc,Y.blendDst,Y.blendEquationAlpha,Y.blendSrcAlpha,Y.blendDstAlpha,Y.blendColor,Y.blendAlpha,Y.premultipliedAlpha),o.setFunc(Y.depthFunc),o.setTest(Y.depthTest),o.setMask(Y.depthWrite),r.setMask(Y.colorWrite);const pt=Y.stencilWrite;a.setTest(pt),pt&&(a.setMask(Y.stencilWriteMask),a.setFunc(Y.stencilFunc,Y.stencilRef,Y.stencilFuncMask),a.setOp(Y.stencilFail,Y.stencilZFail,Y.stencilZPass)),kt(Y.polygonOffset,Y.polygonOffsetFactor,Y.polygonOffsetUnits),Y.alphaToCoverage===!0?K(s.SAMPLE_ALPHA_TO_COVERAGE):et(s.SAMPLE_ALPHA_TO_COVERAGE)}function gt(Y){S!==Y&&(Y?s.frontFace(s.CW):s.frontFace(s.CCW),S=Y)}function At(Y){Y!==pu?(K(s.CULL_FACE),Y!==R&&(Y===Tc?s.cullFace(s.BACK):Y===mu?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):et(s.CULL_FACE),R=Y}function vt(Y){Y!==O&&(F&&s.lineWidth(Y),O=Y)}function kt(Y,Et,at){Y?(K(s.POLYGON_OFFSET_FILL),(I!==Et||A!==at)&&(s.polygonOffset(Et,at),I=Et,A=at)):et(s.POLYGON_OFFSET_FILL)}function yt(Y){Y?K(s.SCISSOR_TEST):et(s.SCISSOR_TEST)}function z(Y){Y===void 0&&(Y=s.TEXTURE0+U-1),B!==Y&&(s.activeTexture(Y),B=Y)}function C(Y,Et,at){at===void 0&&(B===null?at=s.TEXTURE0+U-1:at=B);let pt=k[at];pt===void 0&&(pt={type:void 0,texture:void 0},k[at]=pt),(pt.type!==Y||pt.texture!==Et)&&(B!==at&&(s.activeTexture(at),B=at),s.bindTexture(Y,Et||dt[Y]),pt.type=Y,pt.texture=Et)}function $(){const Y=k[B];Y!==void 0&&Y.type!==void 0&&(s.bindTexture(Y.type,null),Y.type=void 0,Y.texture=void 0)}function q(){try{s.compressedTexImage2D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function G(){try{s.compressedTexImage3D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function Q(){try{s.texSubImage2D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function ft(){try{s.texSubImage3D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function ct(){try{s.compressedTexSubImage2D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function _t(){try{s.compressedTexSubImage3D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function Ot(){try{s.texStorage2D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function ht(){try{s.texStorage3D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function wt(){try{s.texImage2D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function Lt(){try{s.texImage3D.apply(s,arguments)}catch(Y){console.error("THREE.WebGLState:",Y)}}function Ht(Y){it.equals(Y)===!1&&(s.scissor(Y.x,Y.y,Y.z,Y.w),it.copy(Y))}function St(Y){X.equals(Y)===!1&&(s.viewport(Y.x,Y.y,Y.z,Y.w),X.copy(Y))}function ee(Y,Et){let at=l.get(Et);at===void 0&&(at=new WeakMap,l.set(Et,at));let pt=at.get(Y);pt===void 0&&(pt=s.getUniformBlockIndex(Et,Y.name),at.set(Y,pt))}function jt(Y,Et){const pt=l.get(Et).get(Y);c.get(Et)!==pt&&(s.uniformBlockBinding(Et,pt,Y.__bindingPointIndex),c.set(Et,pt))}function pe(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),o.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),h={},B=null,k={},d={},u=new WeakMap,f=[],p=null,x=!1,g=null,m=null,y=null,w=null,v=null,T=null,M=null,E=new Ft(0,0,0),b=0,_=!1,S=null,R=null,O=null,I=null,A=null,it.set(0,0,s.canvas.width,s.canvas.height),X.set(0,0,s.canvas.width,s.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:K,disable:et,bindFramebuffer:ot,drawBuffers:mt,useProgram:ut,setBlending:H,setMaterial:Pt,setFlipSided:gt,setCullFace:At,setLineWidth:vt,setPolygonOffset:kt,setScissorTest:yt,activeTexture:z,bindTexture:C,unbindTexture:$,compressedTexImage2D:q,compressedTexImage3D:G,texImage2D:wt,texImage3D:Lt,updateUBOMapping:ee,uniformBlockBinding:jt,texStorage2D:Ot,texStorage3D:ht,texSubImage2D:Q,texSubImage3D:ft,compressedTexSubImage2D:ct,compressedTexSubImage3D:_t,scissor:Ht,viewport:St,reset:pe}}function bl(s,t,e,n){const i=xg(n);switch(e){case vh:return s*t;case _h:return s*t;case yh:return s*t*2;case ir:return s*t/i.components*i.byteLength;case ro:return s*t/i.components*i.byteLength;case wh:return s*t*2/i.components*i.byteLength;case ac:return s*t*2/i.components*i.byteLength;case xh:return s*t*3/i.components*i.byteLength;case je:return s*t*4/i.components*i.byteLength;case cc:return s*t*4/i.components*i.byteLength;case $r:case jr:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*8;case Zr:case Kr:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case ya:case Ma:return Math.max(s,16)*Math.max(t,8)/4;case _a:case wa:return Math.max(s,8)*Math.max(t,8)/2;case Sa:case ba:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*8;case Ea:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case Ta:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case Aa:return Math.floor((s+4)/5)*Math.floor((t+3)/4)*16;case Ca:return Math.floor((s+4)/5)*Math.floor((t+4)/5)*16;case Ra:return Math.floor((s+5)/6)*Math.floor((t+4)/5)*16;case Pa:return Math.floor((s+5)/6)*Math.floor((t+5)/6)*16;case La:return Math.floor((s+7)/8)*Math.floor((t+4)/5)*16;case Da:return Math.floor((s+7)/8)*Math.floor((t+5)/6)*16;case Ia:return Math.floor((s+7)/8)*Math.floor((t+7)/8)*16;case za:return Math.floor((s+9)/10)*Math.floor((t+4)/5)*16;case Ua:return Math.floor((s+9)/10)*Math.floor((t+5)/6)*16;case Na:return Math.floor((s+9)/10)*Math.floor((t+7)/8)*16;case Fa:return Math.floor((s+9)/10)*Math.floor((t+9)/10)*16;case Oa:return Math.floor((s+11)/12)*Math.floor((t+9)/10)*16;case Ba:return Math.floor((s+11)/12)*Math.floor((t+11)/12)*16;case Jr:case ka:case Ha:return Math.ceil(s/4)*Math.ceil(t/4)*16;case Mh:case Ga:return Math.ceil(s/4)*Math.ceil(t/4)*8;case Va:case Wa:return Math.ceil(s/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function xg(s){switch(s){case vn:case ph:return{byteLength:1,components:1};case nr:case mh:case Cn:return{byteLength:2,components:1};case rc:case oc:return{byteLength:2,components:4};case Kn:case sc:case gn:return{byteLength:4,components:1};case gh:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${s}.`)}function _g(s,t,e,n,i,r,o){const a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new Ut,h=new WeakMap;let d;const u=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function p(z,C){return f?new OffscreenCanvas(z,C):no("canvas")}function x(z,C,$){let q=1;const G=yt(z);if((G.width>$||G.height>$)&&(q=$/Math.max(G.width,G.height)),q<1)if(typeof HTMLImageElement<"u"&&z instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&z instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&z instanceof ImageBitmap||typeof VideoFrame<"u"&&z instanceof VideoFrame){const Q=Math.floor(q*G.width),ft=Math.floor(q*G.height);d===void 0&&(d=p(Q,ft));const ct=C?p(Q,ft):d;return ct.width=Q,ct.height=ft,ct.getContext("2d").drawImage(z,0,0,Q,ft),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+G.width+"x"+G.height+") to ("+Q+"x"+ft+")."),ct}else return"data"in z&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+G.width+"x"+G.height+")."),z;return z}function g(z){return z.generateMipmaps}function m(z){s.generateMipmap(z)}function y(z){return z.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:z.isWebGL3DRenderTarget?s.TEXTURE_3D:z.isWebGLArrayRenderTarget||z.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function w(z,C,$,q,G=!1){if(z!==null){if(s[z]!==void 0)return s[z];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+z+"'")}let Q=C;if(C===s.RED&&($===s.FLOAT&&(Q=s.R32F),$===s.HALF_FLOAT&&(Q=s.R16F),$===s.UNSIGNED_BYTE&&(Q=s.R8)),C===s.RED_INTEGER&&($===s.UNSIGNED_BYTE&&(Q=s.R8UI),$===s.UNSIGNED_SHORT&&(Q=s.R16UI),$===s.UNSIGNED_INT&&(Q=s.R32UI),$===s.BYTE&&(Q=s.R8I),$===s.SHORT&&(Q=s.R16I),$===s.INT&&(Q=s.R32I)),C===s.RG&&($===s.FLOAT&&(Q=s.RG32F),$===s.HALF_FLOAT&&(Q=s.RG16F),$===s.UNSIGNED_BYTE&&(Q=s.RG8)),C===s.RG_INTEGER&&($===s.UNSIGNED_BYTE&&(Q=s.RG8UI),$===s.UNSIGNED_SHORT&&(Q=s.RG16UI),$===s.UNSIGNED_INT&&(Q=s.RG32UI),$===s.BYTE&&(Q=s.RG8I),$===s.SHORT&&(Q=s.RG16I),$===s.INT&&(Q=s.RG32I)),C===s.RGB_INTEGER&&($===s.UNSIGNED_BYTE&&(Q=s.RGB8UI),$===s.UNSIGNED_SHORT&&(Q=s.RGB16UI),$===s.UNSIGNED_INT&&(Q=s.RGB32UI),$===s.BYTE&&(Q=s.RGB8I),$===s.SHORT&&(Q=s.RGB16I),$===s.INT&&(Q=s.RGB32I)),C===s.RGBA_INTEGER&&($===s.UNSIGNED_BYTE&&(Q=s.RGBA8UI),$===s.UNSIGNED_SHORT&&(Q=s.RGBA16UI),$===s.UNSIGNED_INT&&(Q=s.RGBA32UI),$===s.BYTE&&(Q=s.RGBA8I),$===s.SHORT&&(Q=s.RGBA16I),$===s.INT&&(Q=s.RGBA32I)),C===s.RGB&&$===s.UNSIGNED_INT_5_9_9_9_REV&&(Q=s.RGB9_E5),C===s.RGBA){const ft=G?oo:me.getTransfer(q);$===s.FLOAT&&(Q=s.RGBA32F),$===s.HALF_FLOAT&&(Q=s.RGBA16F),$===s.UNSIGNED_BYTE&&(Q=ft===_e?s.SRGB8_ALPHA8:s.RGBA8),$===s.UNSIGNED_SHORT_4_4_4_4&&(Q=s.RGBA4),$===s.UNSIGNED_SHORT_5_5_5_1&&(Q=s.RGB5_A1)}return(Q===s.R16F||Q===s.R32F||Q===s.RG16F||Q===s.RG32F||Q===s.RGBA16F||Q===s.RGBA32F)&&t.get("EXT_color_buffer_float"),Q}function v(z,C){let $;return z?C===null||C===Kn||C===ms?$=s.DEPTH24_STENCIL8:C===gn?$=s.DEPTH32F_STENCIL8:C===nr&&($=s.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):C===null||C===Kn||C===ms?$=s.DEPTH_COMPONENT24:C===gn?$=s.DEPTH_COMPONENT32F:C===nr&&($=s.DEPTH_COMPONENT16),$}function T(z,C){return g(z)===!0||z.isFramebufferTexture&&z.minFilter!==sn&&z.minFilter!==ve?Math.log2(Math.max(C.width,C.height))+1:z.mipmaps!==void 0&&z.mipmaps.length>0?z.mipmaps.length:z.isCompressedTexture&&Array.isArray(z.image)?C.mipmaps.length:1}function M(z){const C=z.target;C.removeEventListener("dispose",M),b(C),C.isVideoTexture&&h.delete(C)}function E(z){const C=z.target;C.removeEventListener("dispose",E),S(C)}function b(z){const C=n.get(z);if(C.__webglInit===void 0)return;const $=z.source,q=u.get($);if(q){const G=q[C.__cacheKey];G.usedTimes--,G.usedTimes===0&&_(z),Object.keys(q).length===0&&u.delete($)}n.remove(z)}function _(z){const C=n.get(z);s.deleteTexture(C.__webglTexture);const $=z.source,q=u.get($);delete q[C.__cacheKey],o.memory.textures--}function S(z){const C=n.get(z);if(z.depthTexture&&(z.depthTexture.dispose(),n.remove(z.depthTexture)),z.isWebGLCubeRenderTarget)for(let q=0;q<6;q++){if(Array.isArray(C.__webglFramebuffer[q]))for(let G=0;G<C.__webglFramebuffer[q].length;G++)s.deleteFramebuffer(C.__webglFramebuffer[q][G]);else s.deleteFramebuffer(C.__webglFramebuffer[q]);C.__webglDepthbuffer&&s.deleteRenderbuffer(C.__webglDepthbuffer[q])}else{if(Array.isArray(C.__webglFramebuffer))for(let q=0;q<C.__webglFramebuffer.length;q++)s.deleteFramebuffer(C.__webglFramebuffer[q]);else s.deleteFramebuffer(C.__webglFramebuffer);if(C.__webglDepthbuffer&&s.deleteRenderbuffer(C.__webglDepthbuffer),C.__webglMultisampledFramebuffer&&s.deleteFramebuffer(C.__webglMultisampledFramebuffer),C.__webglColorRenderbuffer)for(let q=0;q<C.__webglColorRenderbuffer.length;q++)C.__webglColorRenderbuffer[q]&&s.deleteRenderbuffer(C.__webglColorRenderbuffer[q]);C.__webglDepthRenderbuffer&&s.deleteRenderbuffer(C.__webglDepthRenderbuffer)}const $=z.textures;for(let q=0,G=$.length;q<G;q++){const Q=n.get($[q]);Q.__webglTexture&&(s.deleteTexture(Q.__webglTexture),o.memory.textures--),n.remove($[q])}n.remove(z)}let R=0;function O(){R=0}function I(){const z=R;return z>=i.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+z+" texture units while this GPU supports only "+i.maxTextures),R+=1,z}function A(z){const C=[];return C.push(z.wrapS),C.push(z.wrapT),C.push(z.wrapR||0),C.push(z.magFilter),C.push(z.minFilter),C.push(z.anisotropy),C.push(z.internalFormat),C.push(z.format),C.push(z.type),C.push(z.generateMipmaps),C.push(z.premultiplyAlpha),C.push(z.flipY),C.push(z.unpackAlignment),C.push(z.colorSpace),C.join()}function U(z,C){const $=n.get(z);if(z.isVideoTexture&&vt(z),z.isRenderTargetTexture===!1&&z.version>0&&$.__version!==z.version){const q=z.image;if(q===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(q.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{X($,z,C);return}}e.bindTexture(s.TEXTURE_2D,$.__webglTexture,s.TEXTURE0+C)}function F(z,C){const $=n.get(z);if(z.version>0&&$.__version!==z.version){X($,z,C);return}e.bindTexture(s.TEXTURE_2D_ARRAY,$.__webglTexture,s.TEXTURE0+C)}function D(z,C){const $=n.get(z);if(z.version>0&&$.__version!==z.version){X($,z,C);return}e.bindTexture(s.TEXTURE_3D,$.__webglTexture,s.TEXTURE0+C)}function N(z,C){const $=n.get(z);if(z.version>0&&$.__version!==z.version){tt($,z,C);return}e.bindTexture(s.TEXTURE_CUBE_MAP,$.__webglTexture,s.TEXTURE0+C)}const B={[ps]:s.REPEAT,[wn]:s.CLAMP_TO_EDGE,[xa]:s.MIRRORED_REPEAT},k={[sn]:s.NEAREST,[Vu]:s.NEAREST_MIPMAP_NEAREST,[xr]:s.NEAREST_MIPMAP_LINEAR,[ve]:s.LINEAR,[uo]:s.LINEAR_MIPMAP_NEAREST,[ui]:s.LINEAR_MIPMAP_LINEAR},V={[qu]:s.NEVER,[Ju]:s.ALWAYS,[Yu]:s.LESS,[Eh]:s.LEQUAL,[$u]:s.EQUAL,[Ku]:s.GEQUAL,[ju]:s.GREATER,[Zu]:s.NOTEQUAL};function J(z,C){if(C.type===gn&&t.has("OES_texture_float_linear")===!1&&(C.magFilter===ve||C.magFilter===uo||C.magFilter===xr||C.magFilter===ui||C.minFilter===ve||C.minFilter===uo||C.minFilter===xr||C.minFilter===ui)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(z,s.TEXTURE_WRAP_S,B[C.wrapS]),s.texParameteri(z,s.TEXTURE_WRAP_T,B[C.wrapT]),(z===s.TEXTURE_3D||z===s.TEXTURE_2D_ARRAY)&&s.texParameteri(z,s.TEXTURE_WRAP_R,B[C.wrapR]),s.texParameteri(z,s.TEXTURE_MAG_FILTER,k[C.magFilter]),s.texParameteri(z,s.TEXTURE_MIN_FILTER,k[C.minFilter]),C.compareFunction&&(s.texParameteri(z,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(z,s.TEXTURE_COMPARE_FUNC,V[C.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(C.magFilter===sn||C.minFilter!==xr&&C.minFilter!==ui||C.type===gn&&t.has("OES_texture_float_linear")===!1)return;if(C.anisotropy>1||n.get(C).__currentAnisotropy){const $=t.get("EXT_texture_filter_anisotropic");s.texParameterf(z,$.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(C.anisotropy,i.getMaxAnisotropy())),n.get(C).__currentAnisotropy=C.anisotropy}}}function it(z,C){let $=!1;z.__webglInit===void 0&&(z.__webglInit=!0,C.addEventListener("dispose",M));const q=C.source;let G=u.get(q);G===void 0&&(G={},u.set(q,G));const Q=A(C);if(Q!==z.__cacheKey){G[Q]===void 0&&(G[Q]={texture:s.createTexture(),usedTimes:0},o.memory.textures++,$=!0),G[Q].usedTimes++;const ft=G[z.__cacheKey];ft!==void 0&&(G[z.__cacheKey].usedTimes--,ft.usedTimes===0&&_(C)),z.__cacheKey=Q,z.__webglTexture=G[Q].texture}return $}function X(z,C,$){let q=s.TEXTURE_2D;(C.isDataArrayTexture||C.isCompressedArrayTexture)&&(q=s.TEXTURE_2D_ARRAY),C.isData3DTexture&&(q=s.TEXTURE_3D);const G=it(z,C),Q=C.source;e.bindTexture(q,z.__webglTexture,s.TEXTURE0+$);const ft=n.get(Q);if(Q.version!==ft.__version||G===!0){e.activeTexture(s.TEXTURE0+$);const ct=me.getPrimaries(me.workingColorSpace),_t=C.colorSpace===In?null:me.getPrimaries(C.colorSpace),Ot=C.colorSpace===In||ct===_t?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,C.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,C.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,C.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ot);let ht=x(C.image,!1,i.maxTextureSize);ht=kt(C,ht);const wt=r.convert(C.format,C.colorSpace),Lt=r.convert(C.type);let Ht=w(C.internalFormat,wt,Lt,C.colorSpace,C.isVideoTexture);J(q,C);let St;const ee=C.mipmaps,jt=C.isVideoTexture!==!0,pe=ft.__version===void 0||G===!0,Y=Q.dataReady,Et=T(C,ht);if(C.isDepthTexture)Ht=v(C.format===gs,C.type),pe&&(jt?e.texStorage2D(s.TEXTURE_2D,1,Ht,ht.width,ht.height):e.texImage2D(s.TEXTURE_2D,0,Ht,ht.width,ht.height,0,wt,Lt,null));else if(C.isDataTexture)if(ee.length>0){jt&&pe&&e.texStorage2D(s.TEXTURE_2D,Et,Ht,ee[0].width,ee[0].height);for(let at=0,pt=ee.length;at<pt;at++)St=ee[at],jt?Y&&e.texSubImage2D(s.TEXTURE_2D,at,0,0,St.width,St.height,wt,Lt,St.data):e.texImage2D(s.TEXTURE_2D,at,Ht,St.width,St.height,0,wt,Lt,St.data);C.generateMipmaps=!1}else jt?(pe&&e.texStorage2D(s.TEXTURE_2D,Et,Ht,ht.width,ht.height),Y&&e.texSubImage2D(s.TEXTURE_2D,0,0,0,ht.width,ht.height,wt,Lt,ht.data)):e.texImage2D(s.TEXTURE_2D,0,Ht,ht.width,ht.height,0,wt,Lt,ht.data);else if(C.isCompressedTexture)if(C.isCompressedArrayTexture){jt&&pe&&e.texStorage3D(s.TEXTURE_2D_ARRAY,Et,Ht,ee[0].width,ee[0].height,ht.depth);for(let at=0,pt=ee.length;at<pt;at++)if(St=ee[at],C.format!==je)if(wt!==null)if(jt){if(Y)if(C.layerUpdates.size>0){const Dt=bl(St.width,St.height,C.format,C.type);for(const It of C.layerUpdates){const ne=St.data.subarray(It*Dt/St.data.BYTES_PER_ELEMENT,(It+1)*Dt/St.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,at,0,0,It,St.width,St.height,1,wt,ne)}C.clearLayerUpdates()}else e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,at,0,0,0,St.width,St.height,ht.depth,wt,St.data)}else e.compressedTexImage3D(s.TEXTURE_2D_ARRAY,at,Ht,St.width,St.height,ht.depth,0,St.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else jt?Y&&e.texSubImage3D(s.TEXTURE_2D_ARRAY,at,0,0,0,St.width,St.height,ht.depth,wt,Lt,St.data):e.texImage3D(s.TEXTURE_2D_ARRAY,at,Ht,St.width,St.height,ht.depth,0,wt,Lt,St.data)}else{jt&&pe&&e.texStorage2D(s.TEXTURE_2D,Et,Ht,ee[0].width,ee[0].height);for(let at=0,pt=ee.length;at<pt;at++)St=ee[at],C.format!==je?wt!==null?jt?Y&&e.compressedTexSubImage2D(s.TEXTURE_2D,at,0,0,St.width,St.height,wt,St.data):e.compressedTexImage2D(s.TEXTURE_2D,at,Ht,St.width,St.height,0,St.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):jt?Y&&e.texSubImage2D(s.TEXTURE_2D,at,0,0,St.width,St.height,wt,Lt,St.data):e.texImage2D(s.TEXTURE_2D,at,Ht,St.width,St.height,0,wt,Lt,St.data)}else if(C.isDataArrayTexture)if(jt){if(pe&&e.texStorage3D(s.TEXTURE_2D_ARRAY,Et,Ht,ht.width,ht.height,ht.depth),Y)if(C.layerUpdates.size>0){const at=bl(ht.width,ht.height,C.format,C.type);for(const pt of C.layerUpdates){const Dt=ht.data.subarray(pt*at/ht.data.BYTES_PER_ELEMENT,(pt+1)*at/ht.data.BYTES_PER_ELEMENT);e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,pt,ht.width,ht.height,1,wt,Lt,Dt)}C.clearLayerUpdates()}else e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,ht.width,ht.height,ht.depth,wt,Lt,ht.data)}else e.texImage3D(s.TEXTURE_2D_ARRAY,0,Ht,ht.width,ht.height,ht.depth,0,wt,Lt,ht.data);else if(C.isData3DTexture)jt?(pe&&e.texStorage3D(s.TEXTURE_3D,Et,Ht,ht.width,ht.height,ht.depth),Y&&e.texSubImage3D(s.TEXTURE_3D,0,0,0,0,ht.width,ht.height,ht.depth,wt,Lt,ht.data)):e.texImage3D(s.TEXTURE_3D,0,Ht,ht.width,ht.height,ht.depth,0,wt,Lt,ht.data);else if(C.isFramebufferTexture){if(pe)if(jt)e.texStorage2D(s.TEXTURE_2D,Et,Ht,ht.width,ht.height);else{let at=ht.width,pt=ht.height;for(let Dt=0;Dt<Et;Dt++)e.texImage2D(s.TEXTURE_2D,Dt,Ht,at,pt,0,wt,Lt,null),at>>=1,pt>>=1}}else if(ee.length>0){if(jt&&pe){const at=yt(ee[0]);e.texStorage2D(s.TEXTURE_2D,Et,Ht,at.width,at.height)}for(let at=0,pt=ee.length;at<pt;at++)St=ee[at],jt?Y&&e.texSubImage2D(s.TEXTURE_2D,at,0,0,wt,Lt,St):e.texImage2D(s.TEXTURE_2D,at,Ht,wt,Lt,St);C.generateMipmaps=!1}else if(jt){if(pe){const at=yt(ht);e.texStorage2D(s.TEXTURE_2D,Et,Ht,at.width,at.height)}Y&&e.texSubImage2D(s.TEXTURE_2D,0,0,0,wt,Lt,ht)}else e.texImage2D(s.TEXTURE_2D,0,Ht,wt,Lt,ht);g(C)&&m(q),ft.__version=Q.version,C.onUpdate&&C.onUpdate(C)}z.__version=C.version}function tt(z,C,$){if(C.image.length!==6)return;const q=it(z,C),G=C.source;e.bindTexture(s.TEXTURE_CUBE_MAP,z.__webglTexture,s.TEXTURE0+$);const Q=n.get(G);if(G.version!==Q.__version||q===!0){e.activeTexture(s.TEXTURE0+$);const ft=me.getPrimaries(me.workingColorSpace),ct=C.colorSpace===In?null:me.getPrimaries(C.colorSpace),_t=C.colorSpace===In||ft===ct?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,C.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,C.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,C.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,_t);const Ot=C.isCompressedTexture||C.image[0].isCompressedTexture,ht=C.image[0]&&C.image[0].isDataTexture,wt=[];for(let pt=0;pt<6;pt++)!Ot&&!ht?wt[pt]=x(C.image[pt],!0,i.maxCubemapSize):wt[pt]=ht?C.image[pt].image:C.image[pt],wt[pt]=kt(C,wt[pt]);const Lt=wt[0],Ht=r.convert(C.format,C.colorSpace),St=r.convert(C.type),ee=w(C.internalFormat,Ht,St,C.colorSpace),jt=C.isVideoTexture!==!0,pe=Q.__version===void 0||q===!0,Y=G.dataReady;let Et=T(C,Lt);J(s.TEXTURE_CUBE_MAP,C);let at;if(Ot){jt&&pe&&e.texStorage2D(s.TEXTURE_CUBE_MAP,Et,ee,Lt.width,Lt.height);for(let pt=0;pt<6;pt++){at=wt[pt].mipmaps;for(let Dt=0;Dt<at.length;Dt++){const It=at[Dt];C.format!==je?Ht!==null?jt?Y&&e.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+pt,Dt,0,0,It.width,It.height,Ht,It.data):e.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+pt,Dt,ee,It.width,It.height,0,It.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):jt?Y&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+pt,Dt,0,0,It.width,It.height,Ht,St,It.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+pt,Dt,ee,It.width,It.height,0,Ht,St,It.data)}}}else{if(at=C.mipmaps,jt&&pe){at.length>0&&Et++;const pt=yt(wt[0]);e.texStorage2D(s.TEXTURE_CUBE_MAP,Et,ee,pt.width,pt.height)}for(let pt=0;pt<6;pt++)if(ht){jt?Y&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+pt,0,0,0,wt[pt].width,wt[pt].height,Ht,St,wt[pt].data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+pt,0,ee,wt[pt].width,wt[pt].height,0,Ht,St,wt[pt].data);for(let Dt=0;Dt<at.length;Dt++){const ne=at[Dt].image[pt].image;jt?Y&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+pt,Dt+1,0,0,ne.width,ne.height,Ht,St,ne.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+pt,Dt+1,ee,ne.width,ne.height,0,Ht,St,ne.data)}}else{jt?Y&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+pt,0,0,0,Ht,St,wt[pt]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+pt,0,ee,Ht,St,wt[pt]);for(let Dt=0;Dt<at.length;Dt++){const It=at[Dt];jt?Y&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+pt,Dt+1,0,0,Ht,St,It.image[pt]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+pt,Dt+1,ee,Ht,St,It.image[pt])}}}g(C)&&m(s.TEXTURE_CUBE_MAP),Q.__version=G.version,C.onUpdate&&C.onUpdate(C)}z.__version=C.version}function dt(z,C,$,q,G,Q){const ft=r.convert($.format,$.colorSpace),ct=r.convert($.type),_t=w($.internalFormat,ft,ct,$.colorSpace),Ot=n.get(C),ht=n.get($);if(ht.__renderTarget=C,!Ot.__hasExternalTextures){const wt=Math.max(1,C.width>>Q),Lt=Math.max(1,C.height>>Q);G===s.TEXTURE_3D||G===s.TEXTURE_2D_ARRAY?e.texImage3D(G,Q,_t,wt,Lt,C.depth,0,ft,ct,null):e.texImage2D(G,Q,_t,wt,Lt,0,ft,ct,null)}e.bindFramebuffer(s.FRAMEBUFFER,z),At(C)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,q,G,ht.__webglTexture,0,gt(C)):(G===s.TEXTURE_2D||G>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&G<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,q,G,ht.__webglTexture,Q),e.bindFramebuffer(s.FRAMEBUFFER,null)}function K(z,C,$){if(s.bindRenderbuffer(s.RENDERBUFFER,z),C.depthBuffer){const q=C.depthTexture,G=q&&q.isDepthTexture?q.type:null,Q=v(C.stencilBuffer,G),ft=C.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,ct=gt(C);At(C)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,ct,Q,C.width,C.height):$?s.renderbufferStorageMultisample(s.RENDERBUFFER,ct,Q,C.width,C.height):s.renderbufferStorage(s.RENDERBUFFER,Q,C.width,C.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,ft,s.RENDERBUFFER,z)}else{const q=C.textures;for(let G=0;G<q.length;G++){const Q=q[G],ft=r.convert(Q.format,Q.colorSpace),ct=r.convert(Q.type),_t=w(Q.internalFormat,ft,ct,Q.colorSpace),Ot=gt(C);$&&At(C)===!1?s.renderbufferStorageMultisample(s.RENDERBUFFER,Ot,_t,C.width,C.height):At(C)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,Ot,_t,C.width,C.height):s.renderbufferStorage(s.RENDERBUFFER,_t,C.width,C.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function et(z,C){if(C&&C.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(s.FRAMEBUFFER,z),!(C.depthTexture&&C.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const q=n.get(C.depthTexture);q.__renderTarget=C,(!q.__webglTexture||C.depthTexture.image.width!==C.width||C.depthTexture.image.height!==C.height)&&(C.depthTexture.image.width=C.width,C.depthTexture.image.height=C.height,C.depthTexture.needsUpdate=!0),U(C.depthTexture,0);const G=q.__webglTexture,Q=gt(C);if(C.depthTexture.format===as)At(C)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,G,0,Q):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,G,0);else if(C.depthTexture.format===gs)At(C)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,G,0,Q):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,G,0);else throw new Error("Unknown depthTexture format")}function ot(z){const C=n.get(z),$=z.isWebGLCubeRenderTarget===!0;if(C.__boundDepthTexture!==z.depthTexture){const q=z.depthTexture;if(C.__depthDisposeCallback&&C.__depthDisposeCallback(),q){const G=()=>{delete C.__boundDepthTexture,delete C.__depthDisposeCallback,q.removeEventListener("dispose",G)};q.addEventListener("dispose",G),C.__depthDisposeCallback=G}C.__boundDepthTexture=q}if(z.depthTexture&&!C.__autoAllocateDepthBuffer){if($)throw new Error("target.depthTexture not supported in Cube render targets");et(C.__webglFramebuffer,z)}else if($){C.__webglDepthbuffer=[];for(let q=0;q<6;q++)if(e.bindFramebuffer(s.FRAMEBUFFER,C.__webglFramebuffer[q]),C.__webglDepthbuffer[q]===void 0)C.__webglDepthbuffer[q]=s.createRenderbuffer(),K(C.__webglDepthbuffer[q],z,!1);else{const G=z.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,Q=C.__webglDepthbuffer[q];s.bindRenderbuffer(s.RENDERBUFFER,Q),s.framebufferRenderbuffer(s.FRAMEBUFFER,G,s.RENDERBUFFER,Q)}}else if(e.bindFramebuffer(s.FRAMEBUFFER,C.__webglFramebuffer),C.__webglDepthbuffer===void 0)C.__webglDepthbuffer=s.createRenderbuffer(),K(C.__webglDepthbuffer,z,!1);else{const q=z.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,G=C.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,G),s.framebufferRenderbuffer(s.FRAMEBUFFER,q,s.RENDERBUFFER,G)}e.bindFramebuffer(s.FRAMEBUFFER,null)}function mt(z,C,$){const q=n.get(z);C!==void 0&&dt(q.__webglFramebuffer,z,z.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),$!==void 0&&ot(z)}function ut(z){const C=z.texture,$=n.get(z),q=n.get(C);z.addEventListener("dispose",E);const G=z.textures,Q=z.isWebGLCubeRenderTarget===!0,ft=G.length>1;if(ft||(q.__webglTexture===void 0&&(q.__webglTexture=s.createTexture()),q.__version=C.version,o.memory.textures++),Q){$.__webglFramebuffer=[];for(let ct=0;ct<6;ct++)if(C.mipmaps&&C.mipmaps.length>0){$.__webglFramebuffer[ct]=[];for(let _t=0;_t<C.mipmaps.length;_t++)$.__webglFramebuffer[ct][_t]=s.createFramebuffer()}else $.__webglFramebuffer[ct]=s.createFramebuffer()}else{if(C.mipmaps&&C.mipmaps.length>0){$.__webglFramebuffer=[];for(let ct=0;ct<C.mipmaps.length;ct++)$.__webglFramebuffer[ct]=s.createFramebuffer()}else $.__webglFramebuffer=s.createFramebuffer();if(ft)for(let ct=0,_t=G.length;ct<_t;ct++){const Ot=n.get(G[ct]);Ot.__webglTexture===void 0&&(Ot.__webglTexture=s.createTexture(),o.memory.textures++)}if(z.samples>0&&At(z)===!1){$.__webglMultisampledFramebuffer=s.createFramebuffer(),$.__webglColorRenderbuffer=[],e.bindFramebuffer(s.FRAMEBUFFER,$.__webglMultisampledFramebuffer);for(let ct=0;ct<G.length;ct++){const _t=G[ct];$.__webglColorRenderbuffer[ct]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,$.__webglColorRenderbuffer[ct]);const Ot=r.convert(_t.format,_t.colorSpace),ht=r.convert(_t.type),wt=w(_t.internalFormat,Ot,ht,_t.colorSpace,z.isXRRenderTarget===!0),Lt=gt(z);s.renderbufferStorageMultisample(s.RENDERBUFFER,Lt,wt,z.width,z.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+ct,s.RENDERBUFFER,$.__webglColorRenderbuffer[ct])}s.bindRenderbuffer(s.RENDERBUFFER,null),z.depthBuffer&&($.__webglDepthRenderbuffer=s.createRenderbuffer(),K($.__webglDepthRenderbuffer,z,!0)),e.bindFramebuffer(s.FRAMEBUFFER,null)}}if(Q){e.bindTexture(s.TEXTURE_CUBE_MAP,q.__webglTexture),J(s.TEXTURE_CUBE_MAP,C);for(let ct=0;ct<6;ct++)if(C.mipmaps&&C.mipmaps.length>0)for(let _t=0;_t<C.mipmaps.length;_t++)dt($.__webglFramebuffer[ct][_t],z,C,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+ct,_t);else dt($.__webglFramebuffer[ct],z,C,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+ct,0);g(C)&&m(s.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(ft){for(let ct=0,_t=G.length;ct<_t;ct++){const Ot=G[ct],ht=n.get(Ot);e.bindTexture(s.TEXTURE_2D,ht.__webglTexture),J(s.TEXTURE_2D,Ot),dt($.__webglFramebuffer,z,Ot,s.COLOR_ATTACHMENT0+ct,s.TEXTURE_2D,0),g(Ot)&&m(s.TEXTURE_2D)}e.unbindTexture()}else{let ct=s.TEXTURE_2D;if((z.isWebGL3DRenderTarget||z.isWebGLArrayRenderTarget)&&(ct=z.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),e.bindTexture(ct,q.__webglTexture),J(ct,C),C.mipmaps&&C.mipmaps.length>0)for(let _t=0;_t<C.mipmaps.length;_t++)dt($.__webglFramebuffer[_t],z,C,s.COLOR_ATTACHMENT0,ct,_t);else dt($.__webglFramebuffer,z,C,s.COLOR_ATTACHMENT0,ct,0);g(C)&&m(ct),e.unbindTexture()}z.depthBuffer&&ot(z)}function nt(z){const C=z.textures;for(let $=0,q=C.length;$<q;$++){const G=C[$];if(g(G)){const Q=y(z),ft=n.get(G).__webglTexture;e.bindTexture(Q,ft),m(Q),e.unbindTexture()}}}const lt=[],H=[];function Pt(z){if(z.samples>0){if(At(z)===!1){const C=z.textures,$=z.width,q=z.height;let G=s.COLOR_BUFFER_BIT;const Q=z.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,ft=n.get(z),ct=C.length>1;if(ct)for(let _t=0;_t<C.length;_t++)e.bindFramebuffer(s.FRAMEBUFFER,ft.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+_t,s.RENDERBUFFER,null),e.bindFramebuffer(s.FRAMEBUFFER,ft.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+_t,s.TEXTURE_2D,null,0);e.bindFramebuffer(s.READ_FRAMEBUFFER,ft.__webglMultisampledFramebuffer),e.bindFramebuffer(s.DRAW_FRAMEBUFFER,ft.__webglFramebuffer);for(let _t=0;_t<C.length;_t++){if(z.resolveDepthBuffer&&(z.depthBuffer&&(G|=s.DEPTH_BUFFER_BIT),z.stencilBuffer&&z.resolveStencilBuffer&&(G|=s.STENCIL_BUFFER_BIT)),ct){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,ft.__webglColorRenderbuffer[_t]);const Ot=n.get(C[_t]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,Ot,0)}s.blitFramebuffer(0,0,$,q,0,0,$,q,G,s.NEAREST),c===!0&&(lt.length=0,H.length=0,lt.push(s.COLOR_ATTACHMENT0+_t),z.depthBuffer&&z.resolveDepthBuffer===!1&&(lt.push(Q),H.push(Q),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,H)),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,lt))}if(e.bindFramebuffer(s.READ_FRAMEBUFFER,null),e.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),ct)for(let _t=0;_t<C.length;_t++){e.bindFramebuffer(s.FRAMEBUFFER,ft.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+_t,s.RENDERBUFFER,ft.__webglColorRenderbuffer[_t]);const Ot=n.get(C[_t]).__webglTexture;e.bindFramebuffer(s.FRAMEBUFFER,ft.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+_t,s.TEXTURE_2D,Ot,0)}e.bindFramebuffer(s.DRAW_FRAMEBUFFER,ft.__webglMultisampledFramebuffer)}else if(z.depthBuffer&&z.resolveDepthBuffer===!1&&c){const C=z.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[C])}}}function gt(z){return Math.min(i.maxSamples,z.samples)}function At(z){const C=n.get(z);return z.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&C.__useRenderToTexture!==!1}function vt(z){const C=o.render.frame;h.get(z)!==C&&(h.set(z,C),z.update())}function kt(z,C){const $=z.colorSpace,q=z.format,G=z.type;return z.isCompressedTexture===!0||z.isVideoTexture===!0||$!==Ni&&$!==In&&(me.getTransfer($)===_e?(q!==je||G!==vn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",$)),C}function yt(z){return typeof HTMLImageElement<"u"&&z instanceof HTMLImageElement?(l.width=z.naturalWidth||z.width,l.height=z.naturalHeight||z.height):typeof VideoFrame<"u"&&z instanceof VideoFrame?(l.width=z.displayWidth,l.height=z.displayHeight):(l.width=z.width,l.height=z.height),l}this.allocateTextureUnit=I,this.resetTextureUnits=O,this.setTexture2D=U,this.setTexture2DArray=F,this.setTexture3D=D,this.setTextureCube=N,this.rebindTextures=mt,this.setupRenderTarget=ut,this.updateRenderTargetMipmap=nt,this.updateMultisampleRenderTarget=Pt,this.setupDepthRenderbuffer=ot,this.setupFrameBufferTexture=dt,this.useMultisampledRTT=At}function yg(s,t){function e(n,i=In){let r;const o=me.getTransfer(i);if(n===vn)return s.UNSIGNED_BYTE;if(n===rc)return s.UNSIGNED_SHORT_4_4_4_4;if(n===oc)return s.UNSIGNED_SHORT_5_5_5_1;if(n===gh)return s.UNSIGNED_INT_5_9_9_9_REV;if(n===ph)return s.BYTE;if(n===mh)return s.SHORT;if(n===nr)return s.UNSIGNED_SHORT;if(n===sc)return s.INT;if(n===Kn)return s.UNSIGNED_INT;if(n===gn)return s.FLOAT;if(n===Cn)return s.HALF_FLOAT;if(n===vh)return s.ALPHA;if(n===xh)return s.RGB;if(n===je)return s.RGBA;if(n===_h)return s.LUMINANCE;if(n===yh)return s.LUMINANCE_ALPHA;if(n===as)return s.DEPTH_COMPONENT;if(n===gs)return s.DEPTH_STENCIL;if(n===ir)return s.RED;if(n===ro)return s.RED_INTEGER;if(n===wh)return s.RG;if(n===ac)return s.RG_INTEGER;if(n===cc)return s.RGBA_INTEGER;if(n===$r||n===jr||n===Zr||n===Kr)if(o===_e)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===$r)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===jr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Zr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Kr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===$r)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===jr)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Zr)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Kr)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===_a||n===ya||n===wa||n===Ma)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===_a)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===ya)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===wa)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Ma)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Sa||n===ba||n===Ea)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===Sa||n===ba)return o===_e?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Ea)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===Ta||n===Aa||n===Ca||n===Ra||n===Pa||n===La||n===Da||n===Ia||n===za||n===Ua||n===Na||n===Fa||n===Oa||n===Ba)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Ta)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Aa)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Ca)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Ra)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Pa)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===La)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Da)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Ia)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===za)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Ua)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Na)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Fa)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Oa)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Ba)return o===_e?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Jr||n===ka||n===Ha)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===Jr)return o===_e?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===ka)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Ha)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Mh||n===Ga||n===Va||n===Wa)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===Jr)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Ga)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Va)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Wa)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===ms?s.UNSIGNED_INT_24_8:s[n]!==void 0?s[n]:null}return{convert:e}}class wg extends mn{constructor(t=[]){super(),this.isArrayCamera=!0,this.cameras=t}}class Re extends We{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Mg={type:"move"};class Bo{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Re,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Re,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new P,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new P),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Re,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new P,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new P),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let i=null,r=null,o=null;const a=this._targetRay,c=this._grip,l=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(l&&t.hand){o=!0;for(const x of t.hand.values()){const g=e.getJointPose(x,n),m=this._getHandJoint(l,x);g!==null&&(m.matrix.fromArray(g.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=g.radius),m.visible=g!==null}const h=l.joints["index-finger-tip"],d=l.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,p=.005;l.inputState.pinching&&u>f+p?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!l.inputState.pinching&&u<=f-p&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else c!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1));a!==null&&(i=e.getPose(t.targetRaySpace,n),i===null&&r!==null&&(i=r),i!==null&&(a.matrix.fromArray(i.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,i.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(i.linearVelocity)):a.hasLinearVelocity=!1,i.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(i.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Mg)))}return a!==null&&(a.visible=i!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const n=new Re;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}}const Sg=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,bg=`
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

}`;class Eg{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e,n){if(this.texture===null){const i=new Ke,r=t.properties.get(i);r.__webglTexture=e.texture,(e.depthNear!=n.depthNear||e.depthFar!=n.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,n=new De({vertexShader:Sg,fragmentShader:bg,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new de(new Jn(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Tg extends Ss{constructor(t,e){super();const n=this;let i=null,r=1,o=null,a="local-floor",c=1,l=null,h=null,d=null,u=null,f=null,p=null;const x=new Eg,g=e.getContextAttributes();let m=null,y=null;const w=[],v=[],T=new Ut;let M=null;const E=new mn;E.viewport=new be;const b=new mn;b.viewport=new be;const _=[E,b],S=new wg;let R=null,O=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(X){let tt=w[X];return tt===void 0&&(tt=new Bo,w[X]=tt),tt.getTargetRaySpace()},this.getControllerGrip=function(X){let tt=w[X];return tt===void 0&&(tt=new Bo,w[X]=tt),tt.getGripSpace()},this.getHand=function(X){let tt=w[X];return tt===void 0&&(tt=new Bo,w[X]=tt),tt.getHandSpace()};function I(X){const tt=v.indexOf(X.inputSource);if(tt===-1)return;const dt=w[tt];dt!==void 0&&(dt.update(X.inputSource,X.frame,l||o),dt.dispatchEvent({type:X.type,data:X.inputSource}))}function A(){i.removeEventListener("select",I),i.removeEventListener("selectstart",I),i.removeEventListener("selectend",I),i.removeEventListener("squeeze",I),i.removeEventListener("squeezestart",I),i.removeEventListener("squeezeend",I),i.removeEventListener("end",A),i.removeEventListener("inputsourceschange",U);for(let X=0;X<w.length;X++){const tt=v[X];tt!==null&&(v[X]=null,w[X].disconnect(tt))}R=null,O=null,x.reset(),t.setRenderTarget(m),f=null,u=null,d=null,i=null,y=null,it.stop(),n.isPresenting=!1,t.setPixelRatio(M),t.setSize(T.width,T.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(X){r=X,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(X){a=X,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function(X){l=X},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return d},this.getFrame=function(){return p},this.getSession=function(){return i},this.setSession=async function(X){if(i=X,i!==null){if(m=t.getRenderTarget(),i.addEventListener("select",I),i.addEventListener("selectstart",I),i.addEventListener("selectend",I),i.addEventListener("squeeze",I),i.addEventListener("squeezestart",I),i.addEventListener("squeezeend",I),i.addEventListener("end",A),i.addEventListener("inputsourceschange",U),g.xrCompatible!==!0&&await e.makeXRCompatible(),M=t.getPixelRatio(),t.getSize(T),i.renderState.layers===void 0){const tt={antialias:g.antialias,alpha:!0,depth:g.depth,stencil:g.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(i,e,tt),i.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),y=new an(f.framebufferWidth,f.framebufferHeight,{format:je,type:vn,colorSpace:t.outputColorSpace,stencilBuffer:g.stencil})}else{let tt=null,dt=null,K=null;g.depth&&(K=g.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,tt=g.stencil?gs:as,dt=g.stencil?ms:Kn);const et={colorFormat:e.RGBA8,depthFormat:K,scaleFactor:r};d=new XRWebGLBinding(i,e),u=d.createProjectionLayer(et),i.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),y=new an(u.textureWidth,u.textureHeight,{format:je,type:vn,depthTexture:new dc(u.textureWidth,u.textureHeight,dt,void 0,void 0,void 0,void 0,void 0,void 0,tt),stencilBuffer:g.stencil,colorSpace:t.outputColorSpace,samples:g.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(c),l=null,o=await i.requestReferenceSpace(a),it.setContext(i),it.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return x.getDepthTexture()};function U(X){for(let tt=0;tt<X.removed.length;tt++){const dt=X.removed[tt],K=v.indexOf(dt);K>=0&&(v[K]=null,w[K].disconnect(dt))}for(let tt=0;tt<X.added.length;tt++){const dt=X.added[tt];let K=v.indexOf(dt);if(K===-1){for(let ot=0;ot<w.length;ot++)if(ot>=v.length){v.push(dt),K=ot;break}else if(v[ot]===null){v[ot]=dt,K=ot;break}if(K===-1)break}const et=w[K];et&&et.connect(dt)}}const F=new P,D=new P;function N(X,tt,dt){F.setFromMatrixPosition(tt.matrixWorld),D.setFromMatrixPosition(dt.matrixWorld);const K=F.distanceTo(D),et=tt.projectionMatrix.elements,ot=dt.projectionMatrix.elements,mt=et[14]/(et[10]-1),ut=et[14]/(et[10]+1),nt=(et[9]+1)/et[5],lt=(et[9]-1)/et[5],H=(et[8]-1)/et[0],Pt=(ot[8]+1)/ot[0],gt=mt*H,At=mt*Pt,vt=K/(-H+Pt),kt=vt*-H;if(tt.matrixWorld.decompose(X.position,X.quaternion,X.scale),X.translateX(kt),X.translateZ(vt),X.matrixWorld.compose(X.position,X.quaternion,X.scale),X.matrixWorldInverse.copy(X.matrixWorld).invert(),et[10]===-1)X.projectionMatrix.copy(tt.projectionMatrix),X.projectionMatrixInverse.copy(tt.projectionMatrixInverse);else{const yt=mt+vt,z=ut+vt,C=gt-kt,$=At+(K-kt),q=nt*ut/z*yt,G=lt*ut/z*yt;X.projectionMatrix.makePerspective(C,$,q,G,yt,z),X.projectionMatrixInverse.copy(X.projectionMatrix).invert()}}function B(X,tt){tt===null?X.matrixWorld.copy(X.matrix):X.matrixWorld.multiplyMatrices(tt.matrixWorld,X.matrix),X.matrixWorldInverse.copy(X.matrixWorld).invert()}this.updateCamera=function(X){if(i===null)return;let tt=X.near,dt=X.far;x.texture!==null&&(x.depthNear>0&&(tt=x.depthNear),x.depthFar>0&&(dt=x.depthFar)),S.near=b.near=E.near=tt,S.far=b.far=E.far=dt,(R!==S.near||O!==S.far)&&(i.updateRenderState({depthNear:S.near,depthFar:S.far}),R=S.near,O=S.far),E.layers.mask=X.layers.mask|2,b.layers.mask=X.layers.mask|4,S.layers.mask=E.layers.mask|b.layers.mask;const K=X.parent,et=S.cameras;B(S,K);for(let ot=0;ot<et.length;ot++)B(et[ot],K);et.length===2?N(S,E,b):S.projectionMatrix.copy(E.projectionMatrix),k(X,S,K)};function k(X,tt,dt){dt===null?X.matrix.copy(tt.matrixWorld):(X.matrix.copy(dt.matrixWorld),X.matrix.invert(),X.matrix.multiply(tt.matrixWorld)),X.matrix.decompose(X.position,X.quaternion,X.scale),X.updateMatrixWorld(!0),X.projectionMatrix.copy(tt.projectionMatrix),X.projectionMatrixInverse.copy(tt.projectionMatrixInverse),X.isPerspectiveCamera&&(X.fov=sr*2*Math.atan(1/X.projectionMatrix.elements[5]),X.zoom=1)}this.getCamera=function(){return S},this.getFoveation=function(){if(!(u===null&&f===null))return c},this.setFoveation=function(X){c=X,u!==null&&(u.fixedFoveation=X),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=X)},this.hasDepthSensing=function(){return x.texture!==null},this.getDepthSensingMesh=function(){return x.getMesh(S)};let V=null;function J(X,tt){if(h=tt.getViewerPose(l||o),p=tt,h!==null){const dt=h.views;f!==null&&(t.setRenderTargetFramebuffer(y,f.framebuffer),t.setRenderTarget(y));let K=!1;dt.length!==S.cameras.length&&(S.cameras.length=0,K=!0);for(let ot=0;ot<dt.length;ot++){const mt=dt[ot];let ut=null;if(f!==null)ut=f.getViewport(mt);else{const lt=d.getViewSubImage(u,mt);ut=lt.viewport,ot===0&&(t.setRenderTargetTextures(y,lt.colorTexture,u.ignoreDepthValues?void 0:lt.depthStencilTexture),t.setRenderTarget(y))}let nt=_[ot];nt===void 0&&(nt=new mn,nt.layers.enable(ot),nt.viewport=new be,_[ot]=nt),nt.matrix.fromArray(mt.transform.matrix),nt.matrix.decompose(nt.position,nt.quaternion,nt.scale),nt.projectionMatrix.fromArray(mt.projectionMatrix),nt.projectionMatrixInverse.copy(nt.projectionMatrix).invert(),nt.viewport.set(ut.x,ut.y,ut.width,ut.height),ot===0&&(S.matrix.copy(nt.matrix),S.matrix.decompose(S.position,S.quaternion,S.scale)),K===!0&&S.cameras.push(nt)}const et=i.enabledFeatures;if(et&&et.includes("depth-sensing")){const ot=d.getDepthInformation(dt[0]);ot&&ot.isValid&&ot.texture&&x.init(t,ot,i.renderState)}}for(let dt=0;dt<w.length;dt++){const K=v[dt],et=w[dt];K!==null&&et!==void 0&&et.update(K,tt,l||o)}V&&V(X,tt),tt.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:tt}),p=null}const it=new Oh;it.setAnimationLoop(J),this.setAnimationLoop=function(X){V=X},this.dispose=function(){}}}const wi=new Ee,Ag=new Yt;function Cg(s,t){function e(g,m){g.matrixAutoUpdate===!0&&g.updateMatrix(),m.value.copy(g.matrix)}function n(g,m){m.color.getRGB(g.fogColor.value,Uh(s)),m.isFog?(g.fogNear.value=m.near,g.fogFar.value=m.far):m.isFogExp2&&(g.fogDensity.value=m.density)}function i(g,m,y,w,v){m.isMeshBasicMaterial||m.isMeshLambertMaterial?r(g,m):m.isMeshToonMaterial?(r(g,m),d(g,m)):m.isMeshPhongMaterial?(r(g,m),h(g,m)):m.isMeshStandardMaterial?(r(g,m),u(g,m),m.isMeshPhysicalMaterial&&f(g,m,v)):m.isMeshMatcapMaterial?(r(g,m),p(g,m)):m.isMeshDepthMaterial?r(g,m):m.isMeshDistanceMaterial?(r(g,m),x(g,m)):m.isMeshNormalMaterial?r(g,m):m.isLineBasicMaterial?(o(g,m),m.isLineDashedMaterial&&a(g,m)):m.isPointsMaterial?c(g,m,y,w):m.isSpriteMaterial?l(g,m):m.isShadowMaterial?(g.color.value.copy(m.color),g.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function r(g,m){g.opacity.value=m.opacity,m.color&&g.diffuse.value.copy(m.color),m.emissive&&g.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(g.map.value=m.map,e(m.map,g.mapTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,e(m.alphaMap,g.alphaMapTransform)),m.bumpMap&&(g.bumpMap.value=m.bumpMap,e(m.bumpMap,g.bumpMapTransform),g.bumpScale.value=m.bumpScale,m.side===Ze&&(g.bumpScale.value*=-1)),m.normalMap&&(g.normalMap.value=m.normalMap,e(m.normalMap,g.normalMapTransform),g.normalScale.value.copy(m.normalScale),m.side===Ze&&g.normalScale.value.negate()),m.displacementMap&&(g.displacementMap.value=m.displacementMap,e(m.displacementMap,g.displacementMapTransform),g.displacementScale.value=m.displacementScale,g.displacementBias.value=m.displacementBias),m.emissiveMap&&(g.emissiveMap.value=m.emissiveMap,e(m.emissiveMap,g.emissiveMapTransform)),m.specularMap&&(g.specularMap.value=m.specularMap,e(m.specularMap,g.specularMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest);const y=t.get(m),w=y.envMap,v=y.envMapRotation;w&&(g.envMap.value=w,wi.copy(v),wi.x*=-1,wi.y*=-1,wi.z*=-1,w.isCubeTexture&&w.isRenderTargetTexture===!1&&(wi.y*=-1,wi.z*=-1),g.envMapRotation.value.setFromMatrix4(Ag.makeRotationFromEuler(wi)),g.flipEnvMap.value=w.isCubeTexture&&w.isRenderTargetTexture===!1?-1:1,g.reflectivity.value=m.reflectivity,g.ior.value=m.ior,g.refractionRatio.value=m.refractionRatio),m.lightMap&&(g.lightMap.value=m.lightMap,g.lightMapIntensity.value=m.lightMapIntensity,e(m.lightMap,g.lightMapTransform)),m.aoMap&&(g.aoMap.value=m.aoMap,g.aoMapIntensity.value=m.aoMapIntensity,e(m.aoMap,g.aoMapTransform))}function o(g,m){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,m.map&&(g.map.value=m.map,e(m.map,g.mapTransform))}function a(g,m){g.dashSize.value=m.dashSize,g.totalSize.value=m.dashSize+m.gapSize,g.scale.value=m.scale}function c(g,m,y,w){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,g.size.value=m.size*y,g.scale.value=w*.5,m.map&&(g.map.value=m.map,e(m.map,g.uvTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,e(m.alphaMap,g.alphaMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest)}function l(g,m){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,g.rotation.value=m.rotation,m.map&&(g.map.value=m.map,e(m.map,g.mapTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,e(m.alphaMap,g.alphaMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest)}function h(g,m){g.specular.value.copy(m.specular),g.shininess.value=Math.max(m.shininess,1e-4)}function d(g,m){m.gradientMap&&(g.gradientMap.value=m.gradientMap)}function u(g,m){g.metalness.value=m.metalness,m.metalnessMap&&(g.metalnessMap.value=m.metalnessMap,e(m.metalnessMap,g.metalnessMapTransform)),g.roughness.value=m.roughness,m.roughnessMap&&(g.roughnessMap.value=m.roughnessMap,e(m.roughnessMap,g.roughnessMapTransform)),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)}function f(g,m,y){g.ior.value=m.ior,m.sheen>0&&(g.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),g.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(g.sheenColorMap.value=m.sheenColorMap,e(m.sheenColorMap,g.sheenColorMapTransform)),m.sheenRoughnessMap&&(g.sheenRoughnessMap.value=m.sheenRoughnessMap,e(m.sheenRoughnessMap,g.sheenRoughnessMapTransform))),m.clearcoat>0&&(g.clearcoat.value=m.clearcoat,g.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(g.clearcoatMap.value=m.clearcoatMap,e(m.clearcoatMap,g.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,e(m.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(g.clearcoatNormalMap.value=m.clearcoatNormalMap,e(m.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===Ze&&g.clearcoatNormalScale.value.negate())),m.dispersion>0&&(g.dispersion.value=m.dispersion),m.iridescence>0&&(g.iridescence.value=m.iridescence,g.iridescenceIOR.value=m.iridescenceIOR,g.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(g.iridescenceMap.value=m.iridescenceMap,e(m.iridescenceMap,g.iridescenceMapTransform)),m.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=m.iridescenceThicknessMap,e(m.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),m.transmission>0&&(g.transmission.value=m.transmission,g.transmissionSamplerMap.value=y.texture,g.transmissionSamplerSize.value.set(y.width,y.height),m.transmissionMap&&(g.transmissionMap.value=m.transmissionMap,e(m.transmissionMap,g.transmissionMapTransform)),g.thickness.value=m.thickness,m.thicknessMap&&(g.thicknessMap.value=m.thicknessMap,e(m.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=m.attenuationDistance,g.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(g.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(g.anisotropyMap.value=m.anisotropyMap,e(m.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=m.specularIntensity,g.specularColor.value.copy(m.specularColor),m.specularColorMap&&(g.specularColorMap.value=m.specularColorMap,e(m.specularColorMap,g.specularColorMapTransform)),m.specularIntensityMap&&(g.specularIntensityMap.value=m.specularIntensityMap,e(m.specularIntensityMap,g.specularIntensityMapTransform))}function p(g,m){m.matcap&&(g.matcap.value=m.matcap)}function x(g,m){const y=t.get(m).light;g.referencePosition.value.setFromMatrixPosition(y.matrixWorld),g.nearDistance.value=y.shadow.camera.near,g.farDistance.value=y.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function Rg(s,t,e,n){let i={},r={},o=[];const a=s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS);function c(y,w){const v=w.program;n.uniformBlockBinding(y,v)}function l(y,w){let v=i[y.id];v===void 0&&(p(y),v=h(y),i[y.id]=v,y.addEventListener("dispose",g));const T=w.program;n.updateUBOMapping(y,T);const M=t.render.frame;r[y.id]!==M&&(u(y),r[y.id]=M)}function h(y){const w=d();y.__bindingPointIndex=w;const v=s.createBuffer(),T=y.__size,M=y.usage;return s.bindBuffer(s.UNIFORM_BUFFER,v),s.bufferData(s.UNIFORM_BUFFER,T,M),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,w,v),v}function d(){for(let y=0;y<a;y++)if(o.indexOf(y)===-1)return o.push(y),y;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(y){const w=i[y.id],v=y.uniforms,T=y.__cache;s.bindBuffer(s.UNIFORM_BUFFER,w);for(let M=0,E=v.length;M<E;M++){const b=Array.isArray(v[M])?v[M]:[v[M]];for(let _=0,S=b.length;_<S;_++){const R=b[_];if(f(R,M,_,T)===!0){const O=R.__offset,I=Array.isArray(R.value)?R.value:[R.value];let A=0;for(let U=0;U<I.length;U++){const F=I[U],D=x(F);typeof F=="number"||typeof F=="boolean"?(R.__data[0]=F,s.bufferSubData(s.UNIFORM_BUFFER,O+A,R.__data)):F.isMatrix3?(R.__data[0]=F.elements[0],R.__data[1]=F.elements[1],R.__data[2]=F.elements[2],R.__data[3]=0,R.__data[4]=F.elements[3],R.__data[5]=F.elements[4],R.__data[6]=F.elements[5],R.__data[7]=0,R.__data[8]=F.elements[6],R.__data[9]=F.elements[7],R.__data[10]=F.elements[8],R.__data[11]=0):(F.toArray(R.__data,A),A+=D.storage/Float32Array.BYTES_PER_ELEMENT)}s.bufferSubData(s.UNIFORM_BUFFER,O,R.__data)}}}s.bindBuffer(s.UNIFORM_BUFFER,null)}function f(y,w,v,T){const M=y.value,E=w+"_"+v;if(T[E]===void 0)return typeof M=="number"||typeof M=="boolean"?T[E]=M:T[E]=M.clone(),!0;{const b=T[E];if(typeof M=="number"||typeof M=="boolean"){if(b!==M)return T[E]=M,!0}else if(b.equals(M)===!1)return b.copy(M),!0}return!1}function p(y){const w=y.uniforms;let v=0;const T=16;for(let E=0,b=w.length;E<b;E++){const _=Array.isArray(w[E])?w[E]:[w[E]];for(let S=0,R=_.length;S<R;S++){const O=_[S],I=Array.isArray(O.value)?O.value:[O.value];for(let A=0,U=I.length;A<U;A++){const F=I[A],D=x(F),N=v%T,B=N%D.boundary,k=N+B;v+=B,k!==0&&T-k<D.storage&&(v+=T-k),O.__data=new Float32Array(D.storage/Float32Array.BYTES_PER_ELEMENT),O.__offset=v,v+=D.storage}}}const M=v%T;return M>0&&(v+=T-M),y.__size=v,y.__cache={},this}function x(y){const w={boundary:0,storage:0};return typeof y=="number"||typeof y=="boolean"?(w.boundary=4,w.storage=4):y.isVector2?(w.boundary=8,w.storage=8):y.isVector3||y.isColor?(w.boundary=16,w.storage=12):y.isVector4?(w.boundary=16,w.storage=16):y.isMatrix3?(w.boundary=48,w.storage=48):y.isMatrix4?(w.boundary=64,w.storage=64):y.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",y),w}function g(y){const w=y.target;w.removeEventListener("dispose",g);const v=o.indexOf(w.__bindingPointIndex);o.splice(v,1),s.deleteBuffer(i[w.id]),delete i[w.id],delete r[w.id]}function m(){for(const y in i)s.deleteBuffer(i[y]);o=[],i={},r={}}return{bind:c,update:l,dispose:m}}class Pg{constructor(t={}){const{canvas:e=md(),context:n=null,depth:i=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reverseDepthBuffer:u=!1}=t;this.isWebGLRenderer=!0;let f;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=n.getContextAttributes().alpha}else f=o;const p=new Uint32Array(4),x=new Int32Array(4);let g=null,m=null;const y=[],w=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=nn,this.toneMapping=Yn,this.toneMappingExposure=1;const v=this;let T=!1,M=0,E=0,b=null,_=-1,S=null;const R=new be,O=new be;let I=null;const A=new Ft(0);let U=0,F=e.width,D=e.height,N=1,B=null,k=null;const V=new be(0,0,F,D),J=new be(0,0,F,D);let it=!1;const X=new xs;let tt=!1,dt=!1;const K=new Yt,et=new Yt,ot=new P,mt=new be,ut={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let nt=!1;function lt(){return b===null?N:1}let H=n;function Pt(L,j){return e.getContext(L,j)}try{const L={alpha:!0,depth:i,stencil:r,antialias:a,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${ic}`),e.addEventListener("webglcontextlost",pt,!1),e.addEventListener("webglcontextrestored",Dt,!1),e.addEventListener("webglcontextcreationerror",It,!1),H===null){const j="webgl2";if(H=Pt(j,L),H===null)throw Pt(j)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(L){throw console.error("THREE.WebGLRenderer: "+L.message),L}let gt,At,vt,kt,yt,z,C,$,q,G,Q,ft,ct,_t,Ot,ht,wt,Lt,Ht,St,ee,jt,pe,Y;function Et(){gt=new Np(H),gt.init(),jt=new yg(H,gt),At=new Pp(H,gt,t,jt),vt=new vg(H,gt),At.reverseDepthBuffer&&u&&vt.buffers.depth.setReversed(!0),kt=new Bp(H),yt=new ig,z=new _g(H,gt,vt,yt,At,jt,kt),C=new Dp(v),$=new Up(v),q=new Xd(H),pe=new Cp(H,q),G=new Fp(H,q,kt,pe),Q=new Hp(H,G,q,kt),Ht=new kp(H,At,z),ht=new Lp(yt),ft=new ng(v,C,$,gt,At,pe,ht),ct=new Cg(v,yt),_t=new rg,Ot=new ug(gt),Lt=new Ap(v,C,$,vt,Q,f,c),wt=new mg(v,Q,At),Y=new Rg(H,kt,At,vt),St=new Rp(H,gt,kt),ee=new Op(H,gt,kt),kt.programs=ft.programs,v.capabilities=At,v.extensions=gt,v.properties=yt,v.renderLists=_t,v.shadowMap=wt,v.state=vt,v.info=kt}Et();const at=new Tg(v,H);this.xr=at,this.getContext=function(){return H},this.getContextAttributes=function(){return H.getContextAttributes()},this.forceContextLoss=function(){const L=gt.get("WEBGL_lose_context");L&&L.loseContext()},this.forceContextRestore=function(){const L=gt.get("WEBGL_lose_context");L&&L.restoreContext()},this.getPixelRatio=function(){return N},this.setPixelRatio=function(L){L!==void 0&&(N=L,this.setSize(F,D,!1))},this.getSize=function(L){return L.set(F,D)},this.setSize=function(L,j,st=!0){if(at.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}F=L,D=j,e.width=Math.floor(L*N),e.height=Math.floor(j*N),st===!0&&(e.style.width=L+"px",e.style.height=j+"px"),this.setViewport(0,0,L,j)},this.getDrawingBufferSize=function(L){return L.set(F*N,D*N).floor()},this.setDrawingBufferSize=function(L,j,st){F=L,D=j,N=st,e.width=Math.floor(L*st),e.height=Math.floor(j*st),this.setViewport(0,0,L,j)},this.getCurrentViewport=function(L){return L.copy(R)},this.getViewport=function(L){return L.copy(V)},this.setViewport=function(L,j,st,rt){L.isVector4?V.set(L.x,L.y,L.z,L.w):V.set(L,j,st,rt),vt.viewport(R.copy(V).multiplyScalar(N).round())},this.getScissor=function(L){return L.copy(J)},this.setScissor=function(L,j,st,rt){L.isVector4?J.set(L.x,L.y,L.z,L.w):J.set(L,j,st,rt),vt.scissor(O.copy(J).multiplyScalar(N).round())},this.getScissorTest=function(){return it},this.setScissorTest=function(L){vt.setScissorTest(it=L)},this.setOpaqueSort=function(L){B=L},this.setTransparentSort=function(L){k=L},this.getClearColor=function(L){return L.copy(Lt.getClearColor())},this.setClearColor=function(){Lt.setClearColor.apply(Lt,arguments)},this.getClearAlpha=function(){return Lt.getClearAlpha()},this.setClearAlpha=function(){Lt.setClearAlpha.apply(Lt,arguments)},this.clear=function(L=!0,j=!0,st=!0){let rt=0;if(L){let Z=!1;if(b!==null){const Mt=b.texture.format;Z=Mt===cc||Mt===ac||Mt===ro}if(Z){const Mt=b.texture.type,Ct=Mt===vn||Mt===Kn||Mt===nr||Mt===ms||Mt===rc||Mt===oc,Gt=Lt.getClearColor(),Vt=Lt.getClearAlpha(),Jt=Gt.r,ae=Gt.g,Bt=Gt.b;Ct?(p[0]=Jt,p[1]=ae,p[2]=Bt,p[3]=Vt,H.clearBufferuiv(H.COLOR,0,p)):(x[0]=Jt,x[1]=ae,x[2]=Bt,x[3]=Vt,H.clearBufferiv(H.COLOR,0,x))}else rt|=H.COLOR_BUFFER_BIT}j&&(rt|=H.DEPTH_BUFFER_BIT),st&&(rt|=H.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),H.clear(rt)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",pt,!1),e.removeEventListener("webglcontextrestored",Dt,!1),e.removeEventListener("webglcontextcreationerror",It,!1),_t.dispose(),Ot.dispose(),yt.dispose(),C.dispose(),$.dispose(),Q.dispose(),pe.dispose(),Y.dispose(),ft.dispose(),at.dispose(),at.removeEventListener("sessionstart",pi),at.removeEventListener("sessionend",mi),ln.stop()};function pt(L){L.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),T=!0}function Dt(){console.log("THREE.WebGLRenderer: Context Restored."),T=!1;const L=kt.autoReset,j=wt.enabled,st=wt.autoUpdate,rt=wt.needsUpdate,Z=wt.type;Et(),kt.autoReset=L,wt.enabled=j,wt.autoUpdate=st,wt.needsUpdate=rt,wt.type=Z}function It(L){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",L.statusMessage)}function ne(L){const j=L.target;j.removeEventListener("dispose",ne),xe(j)}function xe(L){Se(L),yt.remove(L)}function Se(L){const j=yt.get(L).programs;j!==void 0&&(j.forEach(function(st){ft.releaseProgram(st)}),L.isShaderMaterial&&ft.releaseShaderCache(L))}this.renderBufferDirect=function(L,j,st,rt,Z,Mt){j===null&&(j=ut);const Ct=Z.isMesh&&Z.matrixWorld.determinant()<0,Gt=Rs(L,j,st,rt,Z);vt.setMaterial(rt,Ct);let Vt=st.index,Jt=1;if(rt.wireframe===!0){if(Vt=G.getWireframeAttribute(st),Vt===void 0)return;Jt=2}const ae=st.drawRange,Bt=st.attributes.position;let W=ae.start*Jt,xt=(ae.start+ae.count)*Jt;Mt!==null&&(W=Math.max(W,Mt.start*Jt),xt=Math.min(xt,(Mt.start+Mt.count)*Jt)),Vt!==null?(W=Math.max(W,0),xt=Math.min(xt,Vt.count)):Bt!=null&&(W=Math.max(W,0),xt=Math.min(xt,Bt.count));const Tt=xt-W;if(Tt<0||Tt===1/0)return;pe.setup(Z,rt,Gt,st,Vt);let $t,Qt=St;if(Vt!==null&&($t=q.get(Vt),Qt=ee,Qt.setIndex($t)),Z.isMesh)rt.wireframe===!0?(vt.setLineWidth(rt.wireframeLinewidth*lt()),Qt.setMode(H.LINES)):Qt.setMode(H.TRIANGLES);else if(Z.isLine){let zt=rt.linewidth;zt===void 0&&(zt=1),vt.setLineWidth(zt*lt()),Z.isLineSegments?Qt.setMode(H.LINES):Z.isLineLoop?Qt.setMode(H.LINE_LOOP):Qt.setMode(H.LINE_STRIP)}else Z.isPoints?Qt.setMode(H.POINTS):Z.isSprite&&Qt.setMode(H.TRIANGLES);if(Z.isBatchedMesh)if(Z._multiDrawInstances!==null)Qt.renderMultiDrawInstances(Z._multiDrawStarts,Z._multiDrawCounts,Z._multiDrawCount,Z._multiDrawInstances);else if(gt.get("WEBGL_multi_draw"))Qt.renderMultiDraw(Z._multiDrawStarts,Z._multiDrawCounts,Z._multiDrawCount);else{const zt=Z._multiDrawStarts,we=Z._multiDrawCounts,ie=Z._multiDrawCount,Te=Vt?q.get(Vt).bytesPerElement:1,Fi=yt.get(rt).currentProgram.getUniforms();for(let hn=0;hn<ie;hn++)Fi.setValue(H,"_gl_DrawID",hn),Qt.render(zt[hn]/Te,we[hn])}else if(Z.isInstancedMesh)Qt.renderInstances(W,Tt,Z.count);else if(st.isInstancedBufferGeometry){const zt=st._maxInstanceCount!==void 0?st._maxInstanceCount:1/0,we=Math.min(st.instanceCount,zt);Qt.renderInstances(W,Tt,we)}else Qt.render(W,Tt)};function ge(L,j,st){L.transparent===!0&&L.side===Be&&L.forceSinglePass===!1?(L.side=Ze,L.needsUpdate=!0,Ie(L,j,st),L.side=Zn,L.needsUpdate=!0,Ie(L,j,st),L.side=Be):Ie(L,j,st)}this.compile=function(L,j,st=null){st===null&&(st=L),m=Ot.get(st),m.init(j),w.push(m),st.traverseVisible(function(Z){Z.isLight&&Z.layers.test(j.layers)&&(m.pushLight(Z),Z.castShadow&&m.pushShadow(Z))}),L!==st&&L.traverseVisible(function(Z){Z.isLight&&Z.layers.test(j.layers)&&(m.pushLight(Z),Z.castShadow&&m.pushShadow(Z))}),m.setupLights();const rt=new Set;return L.traverse(function(Z){if(!(Z.isMesh||Z.isPoints||Z.isLine||Z.isSprite))return;const Mt=Z.material;if(Mt)if(Array.isArray(Mt))for(let Ct=0;Ct<Mt.length;Ct++){const Gt=Mt[Ct];ge(Gt,st,Z),rt.add(Gt)}else ge(Mt,st,Z),rt.add(Mt)}),w.pop(),m=null,rt},this.compileAsync=function(L,j,st=null){const rt=this.compile(L,j,st);return new Promise(Z=>{function Mt(){if(rt.forEach(function(Ct){yt.get(Ct).currentProgram.isReady()&&rt.delete(Ct)}),rt.size===0){Z(L);return}setTimeout(Mt,10)}gt.get("KHR_parallel_shader_compile")!==null?Mt():setTimeout(Mt,10)})};let Je=null;function xn(L){Je&&Je(L)}function pi(){ln.stop()}function mi(){ln.start()}const ln=new Oh;ln.setAnimationLoop(xn),typeof self<"u"&&ln.setContext(self),this.setAnimationLoop=function(L){Je=L,at.setAnimationLoop(L),L===null?ln.stop():ln.start()},at.addEventListener("sessionstart",pi),at.addEventListener("sessionend",mi),this.render=function(L,j){if(j!==void 0&&j.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(T===!0)return;if(L.matrixWorldAutoUpdate===!0&&L.updateMatrixWorld(),j.parent===null&&j.matrixWorldAutoUpdate===!0&&j.updateMatrixWorld(),at.enabled===!0&&at.isPresenting===!0&&(at.cameraAutoUpdate===!0&&at.updateCamera(j),j=at.getCamera()),L.isScene===!0&&L.onBeforeRender(v,L,j,b),m=Ot.get(L,w.length),m.init(j),w.push(m),et.multiplyMatrices(j.projectionMatrix,j.matrixWorldInverse),X.setFromProjectionMatrix(et),dt=this.localClippingEnabled,tt=ht.init(this.clippingPlanes,dt),g=_t.get(L,y.length),g.init(),y.push(g),at.enabled===!0&&at.isPresenting===!0){const Mt=v.xr.getDepthSensingMesh();Mt!==null&&fr(Mt,j,-1/0,v.sortObjects)}fr(L,j,0,v.sortObjects),g.finish(),v.sortObjects===!0&&g.sort(B,k),nt=at.enabled===!1||at.isPresenting===!1||at.hasDepthSensing()===!1,nt&&Lt.addToRenderList(g,L),this.info.render.frame++,tt===!0&&ht.beginShadows();const st=m.state.shadowsArray;wt.render(st,L,j),tt===!0&&ht.endShadows(),this.info.autoReset===!0&&this.info.reset();const rt=g.opaque,Z=g.transmissive;if(m.setupLights(),j.isArrayCamera){const Mt=j.cameras;if(Z.length>0)for(let Ct=0,Gt=Mt.length;Ct<Gt;Ct++){const Vt=Mt[Ct];As(rt,Z,L,Vt)}nt&&Lt.render(L);for(let Ct=0,Gt=Mt.length;Ct<Gt;Ct++){const Vt=Mt[Ct];pr(g,L,Vt,Vt.viewport)}}else Z.length>0&&As(rt,Z,L,j),nt&&Lt.render(L),pr(g,L,j);b!==null&&(z.updateMultisampleRenderTarget(b),z.updateRenderTargetMipmap(b)),L.isScene===!0&&L.onAfterRender(v,L,j),pe.resetDefaultState(),_=-1,S=null,w.pop(),w.length>0?(m=w[w.length-1],tt===!0&&ht.setGlobalState(v.clippingPlanes,m.state.camera)):m=null,y.pop(),y.length>0?g=y[y.length-1]:g=null};function fr(L,j,st,rt){if(L.visible===!1)return;if(L.layers.test(j.layers)){if(L.isGroup)st=L.renderOrder;else if(L.isLOD)L.autoUpdate===!0&&L.update(j);else if(L.isLight)m.pushLight(L),L.castShadow&&m.pushShadow(L);else if(L.isSprite){if(!L.frustumCulled||X.intersectsSprite(L)){rt&&mt.setFromMatrixPosition(L.matrixWorld).applyMatrix4(et);const Ct=Q.update(L),Gt=L.material;Gt.visible&&g.push(L,Ct,Gt,st,mt.z,null)}}else if((L.isMesh||L.isLine||L.isPoints)&&(!L.frustumCulled||X.intersectsObject(L))){const Ct=Q.update(L),Gt=L.material;if(rt&&(L.boundingSphere!==void 0?(L.boundingSphere===null&&L.computeBoundingSphere(),mt.copy(L.boundingSphere.center)):(Ct.boundingSphere===null&&Ct.computeBoundingSphere(),mt.copy(Ct.boundingSphere.center)),mt.applyMatrix4(L.matrixWorld).applyMatrix4(et)),Array.isArray(Gt)){const Vt=Ct.groups;for(let Jt=0,ae=Vt.length;Jt<ae;Jt++){const Bt=Vt[Jt],W=Gt[Bt.materialIndex];W&&W.visible&&g.push(L,Ct,W,st,mt.z,Bt)}}else Gt.visible&&g.push(L,Ct,Gt,st,mt.z,null)}}const Mt=L.children;for(let Ct=0,Gt=Mt.length;Ct<Gt;Ct++)fr(Mt[Ct],j,st,rt)}function pr(L,j,st,rt){const Z=L.opaque,Mt=L.transmissive,Ct=L.transparent;m.setupLightsView(st),tt===!0&&ht.setGlobalState(v.clippingPlanes,st),rt&&vt.viewport(R.copy(rt)),Z.length>0&&ti(Z,j,st),Mt.length>0&&ti(Mt,j,st),Ct.length>0&&ti(Ct,j,st),vt.buffers.depth.setTest(!0),vt.buffers.depth.setMask(!0),vt.buffers.color.setMask(!0),vt.setPolygonOffset(!1)}function As(L,j,st,rt){if((st.isScene===!0?st.overrideMaterial:null)!==null)return;m.state.transmissionRenderTarget[rt.id]===void 0&&(m.state.transmissionRenderTarget[rt.id]=new an(1,1,{generateMipmaps:!0,type:gt.has("EXT_color_buffer_half_float")||gt.has("EXT_color_buffer_float")?Cn:vn,minFilter:ui,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:me.workingColorSpace}));const Mt=m.state.transmissionRenderTarget[rt.id],Ct=rt.viewport||R;Mt.setSize(Ct.z,Ct.w);const Gt=v.getRenderTarget();v.setRenderTarget(Mt),v.getClearColor(A),U=v.getClearAlpha(),U<1&&v.setClearColor(16777215,.5),v.clear(),nt&&Lt.render(st);const Vt=v.toneMapping;v.toneMapping=Yn;const Jt=rt.viewport;if(rt.viewport!==void 0&&(rt.viewport=void 0),m.setupLightsView(rt),tt===!0&&ht.setGlobalState(v.clippingPlanes,rt),ti(L,st,rt),z.updateMultisampleRenderTarget(Mt),z.updateRenderTargetMipmap(Mt),gt.has("WEBGL_multisampled_render_to_texture")===!1){let ae=!1;for(let Bt=0,W=j.length;Bt<W;Bt++){const xt=j[Bt],Tt=xt.object,$t=xt.geometry,Qt=xt.material,zt=xt.group;if(Qt.side===Be&&Tt.layers.test(rt.layers)){const we=Qt.side;Qt.side=Ze,Qt.needsUpdate=!0,Cs(Tt,st,rt,$t,Qt,zt),Qt.side=we,Qt.needsUpdate=!0,ae=!0}}ae===!0&&(z.updateMultisampleRenderTarget(Mt),z.updateRenderTargetMipmap(Mt))}v.setRenderTarget(Gt),v.setClearColor(A,U),Jt!==void 0&&(rt.viewport=Jt),v.toneMapping=Vt}function ti(L,j,st){const rt=j.isScene===!0?j.overrideMaterial:null;for(let Z=0,Mt=L.length;Z<Mt;Z++){const Ct=L[Z],Gt=Ct.object,Vt=Ct.geometry,Jt=rt===null?Ct.material:rt,ae=Ct.group;Gt.layers.test(st.layers)&&Cs(Gt,j,st,Vt,Jt,ae)}}function Cs(L,j,st,rt,Z,Mt){L.onBeforeRender(v,j,st,rt,Z,Mt),L.modelViewMatrix.multiplyMatrices(st.matrixWorldInverse,L.matrixWorld),L.normalMatrix.getNormalMatrix(L.modelViewMatrix),Z.onBeforeRender(v,j,st,rt,L,Mt),Z.transparent===!0&&Z.side===Be&&Z.forceSinglePass===!1?(Z.side=Ze,Z.needsUpdate=!0,v.renderBufferDirect(st,j,rt,Z,L,Mt),Z.side=Zn,Z.needsUpdate=!0,v.renderBufferDirect(st,j,rt,Z,L,Mt),Z.side=Be):v.renderBufferDirect(st,j,rt,Z,L,Mt),L.onAfterRender(v,j,st,rt,Z,Mt)}function Ie(L,j,st){j.isScene!==!0&&(j=ut);const rt=yt.get(L),Z=m.state.lights,Mt=m.state.shadowsArray,Ct=Z.state.version,Gt=ft.getParameters(L,Z.state,Mt,j,st),Vt=ft.getProgramCacheKey(Gt);let Jt=rt.programs;rt.environment=L.isMeshStandardMaterial?j.environment:null,rt.fog=j.fog,rt.envMap=(L.isMeshStandardMaterial?$:C).get(L.envMap||rt.environment),rt.envMapRotation=rt.environment!==null&&L.envMap===null?j.environmentRotation:L.envMapRotation,Jt===void 0&&(L.addEventListener("dispose",ne),Jt=new Map,rt.programs=Jt);let ae=Jt.get(Vt);if(ae!==void 0){if(rt.currentProgram===ae&&rt.lightsStateVersion===Ct)return gr(L,Gt),ae}else Gt.uniforms=ft.getUniforms(L),L.onBeforeCompile(Gt,v),ae=ft.acquireProgram(Gt,Vt),Jt.set(Vt,ae),rt.uniforms=Gt.uniforms;const Bt=rt.uniforms;return(!L.isShaderMaterial&&!L.isRawShaderMaterial||L.clipping===!0)&&(Bt.clippingPlanes=ht.uniform),gr(L,Gt),rt.needsLights=vr(L),rt.lightsStateVersion=Ct,rt.needsLights&&(Bt.ambientLightColor.value=Z.state.ambient,Bt.lightProbe.value=Z.state.probe,Bt.directionalLights.value=Z.state.directional,Bt.directionalLightShadows.value=Z.state.directionalShadow,Bt.spotLights.value=Z.state.spot,Bt.spotLightShadows.value=Z.state.spotShadow,Bt.rectAreaLights.value=Z.state.rectArea,Bt.ltc_1.value=Z.state.rectAreaLTC1,Bt.ltc_2.value=Z.state.rectAreaLTC2,Bt.pointLights.value=Z.state.point,Bt.pointLightShadows.value=Z.state.pointShadow,Bt.hemisphereLights.value=Z.state.hemi,Bt.directionalShadowMap.value=Z.state.directionalShadowMap,Bt.directionalShadowMatrix.value=Z.state.directionalShadowMatrix,Bt.spotShadowMap.value=Z.state.spotShadowMap,Bt.spotLightMatrix.value=Z.state.spotLightMatrix,Bt.spotLightMap.value=Z.state.spotLightMap,Bt.pointShadowMap.value=Z.state.pointShadowMap,Bt.pointShadowMatrix.value=Z.state.pointShadowMatrix),rt.currentProgram=ae,rt.uniformsList=null,ae}function mr(L){if(L.uniformsList===null){const j=L.currentProgram.getUniforms();L.uniformsList=Qr.seqWithValue(j.seq,L.uniforms)}return L.uniformsList}function gr(L,j){const st=yt.get(L);st.outputColorSpace=j.outputColorSpace,st.batching=j.batching,st.batchingColor=j.batchingColor,st.instancing=j.instancing,st.instancingColor=j.instancingColor,st.instancingMorph=j.instancingMorph,st.skinning=j.skinning,st.morphTargets=j.morphTargets,st.morphNormals=j.morphNormals,st.morphColors=j.morphColors,st.morphTargetsCount=j.morphTargetsCount,st.numClippingPlanes=j.numClippingPlanes,st.numIntersection=j.numClipIntersection,st.vertexAlphas=j.vertexAlphas,st.vertexTangents=j.vertexTangents,st.toneMapping=j.toneMapping}function Rs(L,j,st,rt,Z){j.isScene!==!0&&(j=ut),z.resetTextureUnits();const Mt=j.fog,Ct=rt.isMeshStandardMaterial?j.environment:null,Gt=b===null?v.outputColorSpace:b.isXRRenderTarget===!0?b.texture.colorSpace:Ni,Vt=(rt.isMeshStandardMaterial?$:C).get(rt.envMap||Ct),Jt=rt.vertexColors===!0&&!!st.attributes.color&&st.attributes.color.itemSize===4,ae=!!st.attributes.tangent&&(!!rt.normalMap||rt.anisotropy>0),Bt=!!st.morphAttributes.position,W=!!st.morphAttributes.normal,xt=!!st.morphAttributes.color;let Tt=Yn;rt.toneMapped&&(b===null||b.isXRRenderTarget===!0)&&(Tt=v.toneMapping);const $t=st.morphAttributes.position||st.morphAttributes.normal||st.morphAttributes.color,Qt=$t!==void 0?$t.length:0,zt=yt.get(rt),we=m.state.lights;if(tt===!0&&(dt===!0||L!==S)){const _n=L===S&&rt.id===_;ht.setState(rt,L,_n)}let ie=!1;rt.version===zt.__version?(zt.needsLights&&zt.lightsStateVersion!==we.state.version||zt.outputColorSpace!==Gt||Z.isBatchedMesh&&zt.batching===!1||!Z.isBatchedMesh&&zt.batching===!0||Z.isBatchedMesh&&zt.batchingColor===!0&&Z.colorTexture===null||Z.isBatchedMesh&&zt.batchingColor===!1&&Z.colorTexture!==null||Z.isInstancedMesh&&zt.instancing===!1||!Z.isInstancedMesh&&zt.instancing===!0||Z.isSkinnedMesh&&zt.skinning===!1||!Z.isSkinnedMesh&&zt.skinning===!0||Z.isInstancedMesh&&zt.instancingColor===!0&&Z.instanceColor===null||Z.isInstancedMesh&&zt.instancingColor===!1&&Z.instanceColor!==null||Z.isInstancedMesh&&zt.instancingMorph===!0&&Z.morphTexture===null||Z.isInstancedMesh&&zt.instancingMorph===!1&&Z.morphTexture!==null||zt.envMap!==Vt||rt.fog===!0&&zt.fog!==Mt||zt.numClippingPlanes!==void 0&&(zt.numClippingPlanes!==ht.numPlanes||zt.numIntersection!==ht.numIntersection)||zt.vertexAlphas!==Jt||zt.vertexTangents!==ae||zt.morphTargets!==Bt||zt.morphNormals!==W||zt.morphColors!==xt||zt.toneMapping!==Tt||zt.morphTargetsCount!==Qt)&&(ie=!0):(ie=!0,zt.__version=rt.version);let Te=zt.currentProgram;ie===!0&&(Te=Ie(rt,j,Z));let Fi=!1,hn=!1,Ps=!1;const Me=Te.getUniforms(),Rn=zt.uniforms;if(vt.useProgram(Te.program)&&(Fi=!0,hn=!0,Ps=!0),rt.id!==_&&(_=rt.id,hn=!0),Fi||S!==L){vt.buffers.depth.getReversed()?(K.copy(L.projectionMatrix),vd(K),xd(K),Me.setValue(H,"projectionMatrix",K)):Me.setValue(H,"projectionMatrix",L.projectionMatrix),Me.setValue(H,"viewMatrix",L.matrixWorldInverse);const ei=Me.map.cameraPosition;ei!==void 0&&ei.setValue(H,ot.setFromMatrixPosition(L.matrixWorld)),At.logarithmicDepthBuffer&&Me.setValue(H,"logDepthBufFC",2/(Math.log(L.far+1)/Math.LN2)),(rt.isMeshPhongMaterial||rt.isMeshToonMaterial||rt.isMeshLambertMaterial||rt.isMeshBasicMaterial||rt.isMeshStandardMaterial||rt.isShaderMaterial)&&Me.setValue(H,"isOrthographic",L.isOrthographicCamera===!0),S!==L&&(S=L,hn=!0,Ps=!0)}if(Z.isSkinnedMesh){Me.setOptional(H,Z,"bindMatrix"),Me.setOptional(H,Z,"bindMatrixInverse");const _n=Z.skeleton;_n&&(_n.boneTexture===null&&_n.computeBoneTexture(),Me.setValue(H,"boneTexture",_n.boneTexture,z))}Z.isBatchedMesh&&(Me.setOptional(H,Z,"batchingTexture"),Me.setValue(H,"batchingTexture",Z._matricesTexture,z),Me.setOptional(H,Z,"batchingIdTexture"),Me.setValue(H,"batchingIdTexture",Z._indirectTexture,z),Me.setOptional(H,Z,"batchingColorTexture"),Z._colorsTexture!==null&&Me.setValue(H,"batchingColorTexture",Z._colorsTexture,z));const Ls=st.morphAttributes;if((Ls.position!==void 0||Ls.normal!==void 0||Ls.color!==void 0)&&Ht.update(Z,st,Te),(hn||zt.receiveShadow!==Z.receiveShadow)&&(zt.receiveShadow=Z.receiveShadow,Me.setValue(H,"receiveShadow",Z.receiveShadow)),rt.isMeshGouraudMaterial&&rt.envMap!==null&&(Rn.envMap.value=Vt,Rn.flipEnvMap.value=Vt.isCubeTexture&&Vt.isRenderTargetTexture===!1?-1:1),rt.isMeshStandardMaterial&&rt.envMap===null&&j.environment!==null&&(Rn.envMapIntensity.value=j.environmentIntensity),hn&&(Me.setValue(H,"toneMappingExposure",v.toneMappingExposure),zt.needsLights&&bc(Rn,Ps),Mt&&rt.fog===!0&&ct.refreshFogUniforms(Rn,Mt),ct.refreshMaterialUniforms(Rn,rt,N,D,m.state.transmissionRenderTarget[L.id]),Qr.upload(H,mr(zt),Rn,z)),rt.isShaderMaterial&&rt.uniformsNeedUpdate===!0&&(Qr.upload(H,mr(zt),Rn,z),rt.uniformsNeedUpdate=!1),rt.isSpriteMaterial&&Me.setValue(H,"center",Z.center),Me.setValue(H,"modelViewMatrix",Z.modelViewMatrix),Me.setValue(H,"normalMatrix",Z.normalMatrix),Me.setValue(H,"modelMatrix",Z.matrixWorld),rt.isShaderMaterial||rt.isRawShaderMaterial){const _n=rt.uniformsGroups;for(let ei=0,ni=_n.length;ei<ni;ei++){const Ec=_n[ei];Y.update(Ec,Te),Y.bind(Ec,Te)}}return Te}function bc(L,j){L.ambientLightColor.needsUpdate=j,L.lightProbe.needsUpdate=j,L.directionalLights.needsUpdate=j,L.directionalLightShadows.needsUpdate=j,L.pointLights.needsUpdate=j,L.pointLightShadows.needsUpdate=j,L.spotLights.needsUpdate=j,L.spotLightShadows.needsUpdate=j,L.rectAreaLights.needsUpdate=j,L.hemisphereLights.needsUpdate=j}function vr(L){return L.isMeshLambertMaterial||L.isMeshToonMaterial||L.isMeshPhongMaterial||L.isMeshStandardMaterial||L.isShadowMaterial||L.isShaderMaterial&&L.lights===!0}this.getActiveCubeFace=function(){return M},this.getActiveMipmapLevel=function(){return E},this.getRenderTarget=function(){return b},this.setRenderTargetTextures=function(L,j,st){yt.get(L.texture).__webglTexture=j,yt.get(L.depthTexture).__webglTexture=st;const rt=yt.get(L);rt.__hasExternalTextures=!0,rt.__autoAllocateDepthBuffer=st===void 0,rt.__autoAllocateDepthBuffer||gt.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),rt.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(L,j){const st=yt.get(L);st.__webglFramebuffer=j,st.__useDefaultFramebuffer=j===void 0},this.setRenderTarget=function(L,j=0,st=0){b=L,M=j,E=st;let rt=!0,Z=null,Mt=!1,Ct=!1;if(L){const Vt=yt.get(L);if(Vt.__useDefaultFramebuffer!==void 0)vt.bindFramebuffer(H.FRAMEBUFFER,null),rt=!1;else if(Vt.__webglFramebuffer===void 0)z.setupRenderTarget(L);else if(Vt.__hasExternalTextures)z.rebindTextures(L,yt.get(L.texture).__webglTexture,yt.get(L.depthTexture).__webglTexture);else if(L.depthBuffer){const Bt=L.depthTexture;if(Vt.__boundDepthTexture!==Bt){if(Bt!==null&&yt.has(Bt)&&(L.width!==Bt.image.width||L.height!==Bt.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");z.setupDepthRenderbuffer(L)}}const Jt=L.texture;(Jt.isData3DTexture||Jt.isDataArrayTexture||Jt.isCompressedArrayTexture)&&(Ct=!0);const ae=yt.get(L).__webglFramebuffer;L.isWebGLCubeRenderTarget?(Array.isArray(ae[j])?Z=ae[j][st]:Z=ae[j],Mt=!0):L.samples>0&&z.useMultisampledRTT(L)===!1?Z=yt.get(L).__webglMultisampledFramebuffer:Array.isArray(ae)?Z=ae[st]:Z=ae,R.copy(L.viewport),O.copy(L.scissor),I=L.scissorTest}else R.copy(V).multiplyScalar(N).floor(),O.copy(J).multiplyScalar(N).floor(),I=it;if(vt.bindFramebuffer(H.FRAMEBUFFER,Z)&&rt&&vt.drawBuffers(L,Z),vt.viewport(R),vt.scissor(O),vt.setScissorTest(I),Mt){const Vt=yt.get(L.texture);H.framebufferTexture2D(H.FRAMEBUFFER,H.COLOR_ATTACHMENT0,H.TEXTURE_CUBE_MAP_POSITIVE_X+j,Vt.__webglTexture,st)}else if(Ct){const Vt=yt.get(L.texture),Jt=j||0;H.framebufferTextureLayer(H.FRAMEBUFFER,H.COLOR_ATTACHMENT0,Vt.__webglTexture,st||0,Jt)}_=-1},this.readRenderTargetPixels=function(L,j,st,rt,Z,Mt,Ct){if(!(L&&L.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Gt=yt.get(L).__webglFramebuffer;if(L.isWebGLCubeRenderTarget&&Ct!==void 0&&(Gt=Gt[Ct]),Gt){vt.bindFramebuffer(H.FRAMEBUFFER,Gt);try{const Vt=L.texture,Jt=Vt.format,ae=Vt.type;if(!At.textureFormatReadable(Jt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!At.textureTypeReadable(ae)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}j>=0&&j<=L.width-rt&&st>=0&&st<=L.height-Z&&H.readPixels(j,st,rt,Z,jt.convert(Jt),jt.convert(ae),Mt)}finally{const Vt=b!==null?yt.get(b).__webglFramebuffer:null;vt.bindFramebuffer(H.FRAMEBUFFER,Vt)}}},this.readRenderTargetPixelsAsync=async function(L,j,st,rt,Z,Mt,Ct){if(!(L&&L.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Gt=yt.get(L).__webglFramebuffer;if(L.isWebGLCubeRenderTarget&&Ct!==void 0&&(Gt=Gt[Ct]),Gt){const Vt=L.texture,Jt=Vt.format,ae=Vt.type;if(!At.textureFormatReadable(Jt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!At.textureTypeReadable(ae))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(j>=0&&j<=L.width-rt&&st>=0&&st<=L.height-Z){vt.bindFramebuffer(H.FRAMEBUFFER,Gt);const Bt=H.createBuffer();H.bindBuffer(H.PIXEL_PACK_BUFFER,Bt),H.bufferData(H.PIXEL_PACK_BUFFER,Mt.byteLength,H.STREAM_READ),H.readPixels(j,st,rt,Z,jt.convert(Jt),jt.convert(ae),0);const W=b!==null?yt.get(b).__webglFramebuffer:null;vt.bindFramebuffer(H.FRAMEBUFFER,W);const xt=H.fenceSync(H.SYNC_GPU_COMMANDS_COMPLETE,0);return H.flush(),await gd(H,xt,4),H.bindBuffer(H.PIXEL_PACK_BUFFER,Bt),H.getBufferSubData(H.PIXEL_PACK_BUFFER,0,Mt),H.deleteBuffer(Bt),H.deleteSync(xt),Mt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(L,j=null,st=0){L.isTexture!==!0&&(Xs("WebGLRenderer: copyFramebufferToTexture function signature has changed."),j=arguments[0]||null,L=arguments[1]);const rt=Math.pow(2,-st),Z=Math.floor(L.image.width*rt),Mt=Math.floor(L.image.height*rt),Ct=j!==null?j.x:0,Gt=j!==null?j.y:0;z.setTexture2D(L,0),H.copyTexSubImage2D(H.TEXTURE_2D,st,0,0,Ct,Gt,Z,Mt),vt.unbindTexture()},this.copyTextureToTexture=function(L,j,st=null,rt=null,Z=0){L.isTexture!==!0&&(Xs("WebGLRenderer: copyTextureToTexture function signature has changed."),rt=arguments[0]||null,L=arguments[1],j=arguments[2],Z=arguments[3]||0,st=null);let Mt,Ct,Gt,Vt,Jt,ae,Bt,W,xt;const Tt=L.isCompressedTexture?L.mipmaps[Z]:L.image;st!==null?(Mt=st.max.x-st.min.x,Ct=st.max.y-st.min.y,Gt=st.isBox3?st.max.z-st.min.z:1,Vt=st.min.x,Jt=st.min.y,ae=st.isBox3?st.min.z:0):(Mt=Tt.width,Ct=Tt.height,Gt=Tt.depth||1,Vt=0,Jt=0,ae=0),rt!==null?(Bt=rt.x,W=rt.y,xt=rt.z):(Bt=0,W=0,xt=0);const $t=jt.convert(j.format),Qt=jt.convert(j.type);let zt;j.isData3DTexture?(z.setTexture3D(j,0),zt=H.TEXTURE_3D):j.isDataArrayTexture||j.isCompressedArrayTexture?(z.setTexture2DArray(j,0),zt=H.TEXTURE_2D_ARRAY):(z.setTexture2D(j,0),zt=H.TEXTURE_2D),H.pixelStorei(H.UNPACK_FLIP_Y_WEBGL,j.flipY),H.pixelStorei(H.UNPACK_PREMULTIPLY_ALPHA_WEBGL,j.premultiplyAlpha),H.pixelStorei(H.UNPACK_ALIGNMENT,j.unpackAlignment);const we=H.getParameter(H.UNPACK_ROW_LENGTH),ie=H.getParameter(H.UNPACK_IMAGE_HEIGHT),Te=H.getParameter(H.UNPACK_SKIP_PIXELS),Fi=H.getParameter(H.UNPACK_SKIP_ROWS),hn=H.getParameter(H.UNPACK_SKIP_IMAGES);H.pixelStorei(H.UNPACK_ROW_LENGTH,Tt.width),H.pixelStorei(H.UNPACK_IMAGE_HEIGHT,Tt.height),H.pixelStorei(H.UNPACK_SKIP_PIXELS,Vt),H.pixelStorei(H.UNPACK_SKIP_ROWS,Jt),H.pixelStorei(H.UNPACK_SKIP_IMAGES,ae);const Ps=L.isDataArrayTexture||L.isData3DTexture,Me=j.isDataArrayTexture||j.isData3DTexture;if(L.isRenderTargetTexture||L.isDepthTexture){const Rn=yt.get(L),Ls=yt.get(j),_n=yt.get(Rn.__renderTarget),ei=yt.get(Ls.__renderTarget);vt.bindFramebuffer(H.READ_FRAMEBUFFER,_n.__webglFramebuffer),vt.bindFramebuffer(H.DRAW_FRAMEBUFFER,ei.__webglFramebuffer);for(let ni=0;ni<Gt;ni++)Ps&&H.framebufferTextureLayer(H.READ_FRAMEBUFFER,H.COLOR_ATTACHMENT0,yt.get(L).__webglTexture,Z,ae+ni),L.isDepthTexture?(Me&&H.framebufferTextureLayer(H.DRAW_FRAMEBUFFER,H.COLOR_ATTACHMENT0,yt.get(j).__webglTexture,Z,xt+ni),H.blitFramebuffer(Vt,Jt,Mt,Ct,Bt,W,Mt,Ct,H.DEPTH_BUFFER_BIT,H.NEAREST)):Me?H.copyTexSubImage3D(zt,Z,Bt,W,xt+ni,Vt,Jt,Mt,Ct):H.copyTexSubImage2D(zt,Z,Bt,W,xt+ni,Vt,Jt,Mt,Ct);vt.bindFramebuffer(H.READ_FRAMEBUFFER,null),vt.bindFramebuffer(H.DRAW_FRAMEBUFFER,null)}else Me?L.isDataTexture||L.isData3DTexture?H.texSubImage3D(zt,Z,Bt,W,xt,Mt,Ct,Gt,$t,Qt,Tt.data):j.isCompressedArrayTexture?H.compressedTexSubImage3D(zt,Z,Bt,W,xt,Mt,Ct,Gt,$t,Tt.data):H.texSubImage3D(zt,Z,Bt,W,xt,Mt,Ct,Gt,$t,Qt,Tt):L.isDataTexture?H.texSubImage2D(H.TEXTURE_2D,Z,Bt,W,Mt,Ct,$t,Qt,Tt.data):L.isCompressedTexture?H.compressedTexSubImage2D(H.TEXTURE_2D,Z,Bt,W,Tt.width,Tt.height,$t,Tt.data):H.texSubImage2D(H.TEXTURE_2D,Z,Bt,W,Mt,Ct,$t,Qt,Tt);H.pixelStorei(H.UNPACK_ROW_LENGTH,we),H.pixelStorei(H.UNPACK_IMAGE_HEIGHT,ie),H.pixelStorei(H.UNPACK_SKIP_PIXELS,Te),H.pixelStorei(H.UNPACK_SKIP_ROWS,Fi),H.pixelStorei(H.UNPACK_SKIP_IMAGES,hn),Z===0&&j.generateMipmaps&&H.generateMipmap(zt),vt.unbindTexture()},this.copyTextureToTexture3D=function(L,j,st=null,rt=null,Z=0){return L.isTexture!==!0&&(Xs("WebGLRenderer: copyTextureToTexture3D function signature has changed."),st=arguments[0]||null,rt=arguments[1]||null,L=arguments[2],j=arguments[3],Z=arguments[4]||0),Xs('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(L,j,st,rt,Z)},this.initRenderTarget=function(L){yt.get(L).__webglFramebuffer===void 0&&z.setupRenderTarget(L)},this.initTexture=function(L){L.isCubeTexture?z.setTextureCube(L,0):L.isData3DTexture?z.setTexture3D(L,0):L.isDataArrayTexture||L.isCompressedArrayTexture?z.setTexture2DArray(L,0):z.setTexture2D(L,0),vt.unbindTexture()},this.resetState=function(){M=0,E=0,b=null,vt.reset(),pe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Xn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorspace=me._getDrawingBufferColorSpace(t),e.unpackColorSpace=me._getUnpackColorSpace()}}class rr extends We{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Ee,this.environmentIntensity=1,this.environmentRotation=new Ee,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}}class Ii extends Ke{constructor(t=null,e=1,n=1,i,r,o,a,c,l=sn,h=sn,d,u){super(null,o,a,c,l,h,i,r,d,u),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class fi extends fe{constructor(t,e,n,i=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=i}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){const t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}}const Ji=new Yt,El=new Yt,Br=[],Tl=new ke,Lg=new Yt,Ns=new de,Fs=new Ce;class Ui extends de{constructor(t,e,n){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new fi(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let i=0;i<n;i++)this.setMatrixAt(i,Lg)}computeBoundingBox(){const t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new ke),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Ji),Tl.copy(t.boundingBox).applyMatrix4(Ji),this.boundingBox.union(Tl)}computeBoundingSphere(){const t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new Ce),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Ji),Fs.copy(t.boundingSphere).applyMatrix4(Ji),this.boundingSphere.union(Fs)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){const n=e.morphTargetInfluences,i=this.morphTexture.source.data.data,r=n.length+1,o=t*r+1;for(let a=0;a<n.length;a++)n[a]=i[o+a]}raycast(t,e){const n=this.matrixWorld,i=this.count;if(Ns.geometry=this.geometry,Ns.material=this.material,Ns.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Fs.copy(this.boundingSphere),Fs.applyMatrix4(n),t.ray.intersectsSphere(Fs)!==!1))for(let r=0;r<i;r++){this.getMatrixAt(r,Ji),El.multiplyMatrices(n,Ji),Ns.matrixWorld=El,Ns.raycast(t,Br);for(let o=0,a=Br.length;o<a;o++){const c=Br[o];c.instanceId=r,c.object=this,e.push(c)}Br.length=0}}setColorAt(t,e){this.instanceColor===null&&(this.instanceColor=new fi(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3)}setMatrixAt(t,e){e.toArray(this.instanceMatrix.array,t*16)}setMorphAt(t,e){const n=e.morphTargetInfluences,i=n.length+1;this.morphTexture===null&&(this.morphTexture=new Ii(new Float32Array(i*this.count),i,this.count,ir,gn));const r=this.morphTexture.source.data.data;let o=0;for(let l=0;l<n.length;l++)o+=n[l];const a=this.geometry.morphTargetsRelative?1:1-o,c=i*t;r[c]=a,r.set(n,c+1)}updateMorphTargets(){}dispose(){return this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null),this}}function ko(s,t){return s-t}function Dg(s,t){return s.z-t.z}function Ig(s,t){return t.z-s.z}class zg{constructor(){this.index=0,this.pool=[],this.list=[]}push(t,e,n,i){const r=this.pool,o=this.list;this.index>=r.length&&r.push({start:-1,count:-1,z:-1,index:-1});const a=r[this.index];o.push(a),this.index++,a.start=t,a.count=e,a.z=n,a.index=i}reset(){this.list.length=0,this.index=0}}const rn=new Yt,Ug=new Ft(1,1,1),Ho=new xs,kr=new ke,Mi=new Ce,Os=new P,Al=new P,Ng=new P,Go=new zg,Ye=new de,Hr=[];function Fg(s,t,e=0){const n=t.itemSize;if(s.isInterleavedBufferAttribute||s.array.constructor!==t.array.constructor){const i=s.count;for(let r=0;r<i;r++)for(let o=0;o<n;o++)t.setComponent(r+e,o,s.getComponent(r,o))}else t.array.set(s.array,e*n);t.needsUpdate=!0}function Si(s,t){if(s.constructor!==t.constructor){const e=Math.min(s.length,t.length);for(let n=0;n<e;n++)t[n]=s[n]}else{const e=Math.min(s.length,t.length);t.set(new s.constructor(s.buffer,0,e))}}class Og extends de{get maxInstanceCount(){return this._maxInstanceCount}get instanceCount(){return this._instanceInfo.length-this._availableInstanceIds.length}get unusedVertexCount(){return this._maxVertexCount-this._nextVertexStart}get unusedIndexCount(){return this._maxIndexCount-this._nextIndexStart}constructor(t,e,n=e*2,i){super(new oe,i),this.isBatchedMesh=!0,this.perObjectFrustumCulled=!0,this.sortObjects=!0,this.boundingBox=null,this.boundingSphere=null,this.customSort=null,this._instanceInfo=[],this._geometryInfo=[],this._availableInstanceIds=[],this._availableGeometryIds=[],this._nextIndexStart=0,this._nextVertexStart=0,this._geometryCount=0,this._visibilityChanged=!0,this._geometryInitialized=!1,this._maxInstanceCount=t,this._maxVertexCount=e,this._maxIndexCount=n,this._multiDrawCounts=new Int32Array(t),this._multiDrawStarts=new Int32Array(t),this._multiDrawCount=0,this._multiDrawInstances=null,this._matricesTexture=null,this._indirectTexture=null,this._colorsTexture=null,this._initMatricesTexture(),this._initIndirectTexture()}_initMatricesTexture(){let t=Math.sqrt(this._maxInstanceCount*4);t=Math.ceil(t/4)*4,t=Math.max(t,4);const e=new Float32Array(t*t*4),n=new Ii(e,t,t,je,gn);this._matricesTexture=n}_initIndirectTexture(){let t=Math.sqrt(this._maxInstanceCount);t=Math.ceil(t);const e=new Uint32Array(t*t),n=new Ii(e,t,t,ro,Kn);this._indirectTexture=n}_initColorsTexture(){let t=Math.sqrt(this._maxInstanceCount);t=Math.ceil(t);const e=new Float32Array(t*t*4).fill(1),n=new Ii(e,t,t,je,gn);n.colorSpace=me.workingColorSpace,this._colorsTexture=n}_initializeGeometry(t){const e=this.geometry,n=this._maxVertexCount,i=this._maxIndexCount;if(this._geometryInitialized===!1){for(const r in t.attributes){const o=t.getAttribute(r),{array:a,itemSize:c,normalized:l}=o,h=new a.constructor(n*c),d=new fe(h,c,l);e.setAttribute(r,d)}if(t.getIndex()!==null){const r=n>65535?new Uint32Array(i):new Uint16Array(i);e.setIndex(new fe(r,1))}this._geometryInitialized=!0}}_validateGeometry(t){const e=this.geometry;if(!!t.getIndex()!=!!e.getIndex())throw new Error('BatchedMesh: All geometries must consistently have "index".');for(const n in e.attributes){if(!t.hasAttribute(n))throw new Error(`BatchedMesh: Added geometry missing "${n}". All geometries must have consistent attributes.`);const i=t.getAttribute(n),r=e.getAttribute(n);if(i.itemSize!==r.itemSize||i.normalized!==r.normalized)throw new Error("BatchedMesh: All attributes must have a consistent itemSize and normalized value.")}}setCustomSort(t){return this.customSort=t,this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ke);const t=this.boundingBox,e=this._instanceInfo;t.makeEmpty();for(let n=0,i=e.length;n<i;n++){if(e[n].active===!1)continue;const r=e[n].geometryIndex;this.getMatrixAt(n,rn),this.getBoundingBoxAt(r,kr).applyMatrix4(rn),t.union(kr)}}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ce);const t=this.boundingSphere,e=this._instanceInfo;t.makeEmpty();for(let n=0,i=e.length;n<i;n++){if(e[n].active===!1)continue;const r=e[n].geometryIndex;this.getMatrixAt(n,rn),this.getBoundingSphereAt(r,Mi).applyMatrix4(rn),t.union(Mi)}}addInstance(t){if(this._instanceInfo.length>=this.maxInstanceCount&&this._availableInstanceIds.length===0)throw new Error("BatchedMesh: Maximum item count reached.");const n={visible:!0,active:!0,geometryIndex:t};let i=null;this._availableInstanceIds.length>0?(this._availableInstanceIds.sort(ko),i=this._availableInstanceIds.shift(),this._instanceInfo[i]=n):(i=this._instanceInfo.length,this._instanceInfo.push(n));const r=this._matricesTexture;rn.identity().toArray(r.image.data,i*16),r.needsUpdate=!0;const o=this._colorsTexture;return o&&(Ug.toArray(o.image.data,i*4),o.needsUpdate=!0),this._visibilityChanged=!0,i}addGeometry(t,e=-1,n=-1){this._initializeGeometry(t),this._validateGeometry(t);const i={vertexStart:-1,vertexCount:-1,reservedVertexCount:-1,indexStart:-1,indexCount:-1,reservedIndexCount:-1,start:-1,count:-1,boundingBox:null,boundingSphere:null,active:!0},r=this._geometryInfo;i.vertexStart=this._nextVertexStart,i.reservedVertexCount=e===-1?t.getAttribute("position").count:e;const o=t.getIndex();if(o!==null&&(i.indexStart=this._nextIndexStart,i.reservedIndexCount=n===-1?o.count:n),i.indexStart!==-1&&i.indexStart+i.reservedIndexCount>this._maxIndexCount||i.vertexStart+i.reservedVertexCount>this._maxVertexCount)throw new Error("BatchedMesh: Reserved space request exceeds the maximum buffer size.");let c;return this._availableGeometryIds.length>0?(this._availableGeometryIds.sort(ko),c=this._availableGeometryIds.shift(),r[c]=i):(c=this._geometryCount,this._geometryCount++,r.push(i)),this.setGeometryAt(c,t),this._nextIndexStart=i.indexStart+i.reservedIndexCount,this._nextVertexStart=i.vertexStart+i.reservedVertexCount,c}setGeometryAt(t,e){if(t>=this._geometryCount)throw new Error("BatchedMesh: Maximum geometry count reached.");this._validateGeometry(e);const n=this.geometry,i=n.getIndex()!==null,r=n.getIndex(),o=e.getIndex(),a=this._geometryInfo[t];if(i&&o.count>a.reservedIndexCount||e.attributes.position.count>a.reservedVertexCount)throw new Error("BatchedMesh: Reserved space not large enough for provided geometry.");const c=a.vertexStart,l=a.reservedVertexCount;a.vertexCount=e.getAttribute("position").count;for(const h in n.attributes){const d=e.getAttribute(h),u=n.getAttribute(h);Fg(d,u,c);const f=d.itemSize;for(let p=d.count,x=l;p<x;p++){const g=c+p;for(let m=0;m<f;m++)u.setComponent(g,m,0)}u.needsUpdate=!0,u.addUpdateRange(c*f,l*f)}if(i){const h=a.indexStart,d=a.reservedIndexCount;a.indexCount=e.getIndex().count;for(let u=0;u<o.count;u++)r.setX(h+u,c+o.getX(u));for(let u=o.count,f=d;u<f;u++)r.setX(h+u,c);r.needsUpdate=!0,r.addUpdateRange(h,a.reservedIndexCount)}return a.start=i?a.indexStart:a.vertexStart,a.count=i?a.indexCount:a.vertexCount,a.boundingBox=null,e.boundingBox!==null&&(a.boundingBox=e.boundingBox.clone()),a.boundingSphere=null,e.boundingSphere!==null&&(a.boundingSphere=e.boundingSphere.clone()),this._visibilityChanged=!0,t}deleteGeometry(t){const e=this._geometryInfo;if(t>=e.length||e[t].active===!1)return this;const n=this._instanceInfo;for(let i=0,r=n.length;i<r;i++)n[i].geometryIndex===t&&this.deleteInstance(i);return e[t].active=!1,this._availableGeometryIds.push(t),this._visibilityChanged=!0,this}deleteInstance(t){const e=this._instanceInfo;return t>=e.length||e[t].active===!1?this:(e[t].active=!1,this._availableInstanceIds.push(t),this._visibilityChanged=!0,this)}optimize(){let t=0,e=0;const n=this._geometryInfo,i=n.map((o,a)=>a).sort((o,a)=>n[o].vertexStart-n[a].vertexStart),r=this.geometry;for(let o=0,a=n.length;o<a;o++){const c=i[o],l=n[c];if(l.active!==!1){if(r.index!==null){if(l.indexStart!==e){const{indexStart:h,vertexStart:d,reservedIndexCount:u}=l,f=r.index,p=f.array,x=t-d;for(let g=h;g<h+u;g++)p[g]=p[g]+x;f.array.copyWithin(e,h,h+u),f.addUpdateRange(e,u),l.indexStart=e}e+=l.reservedIndexCount}if(l.vertexStart!==t){const{vertexStart:h,reservedVertexCount:d}=l,u=r.attributes;for(const f in u){const p=u[f],{array:x,itemSize:g}=p;x.copyWithin(t*g,h*g,(h+d)*g),p.addUpdateRange(t*g,d*g)}l.vertexStart=t}t+=l.reservedVertexCount,l.start=r.index?l.indexStart:l.vertexStart,this._nextIndexStart=r.index?l.indexStart+l.reservedIndexCount:0,this._nextVertexStart=l.vertexStart+l.reservedVertexCount}}return this}getBoundingBoxAt(t,e){if(t>=this._geometryCount)return null;const n=this.geometry,i=this._geometryInfo[t];if(i.boundingBox===null){const r=new ke,o=n.index,a=n.attributes.position;for(let c=i.start,l=i.start+i.count;c<l;c++){let h=c;o&&(h=o.getX(h)),r.expandByPoint(Os.fromBufferAttribute(a,h))}i.boundingBox=r}return e.copy(i.boundingBox),e}getBoundingSphereAt(t,e){if(t>=this._geometryCount)return null;const n=this.geometry,i=this._geometryInfo[t];if(i.boundingSphere===null){const r=new Ce;this.getBoundingBoxAt(t,kr),kr.getCenter(r.center);const o=n.index,a=n.attributes.position;let c=0;for(let l=i.start,h=i.start+i.count;l<h;l++){let d=l;o&&(d=o.getX(d)),Os.fromBufferAttribute(a,d),c=Math.max(c,r.center.distanceToSquared(Os))}r.radius=Math.sqrt(c),i.boundingSphere=r}return e.copy(i.boundingSphere),e}setMatrixAt(t,e){const n=this._instanceInfo,i=this._matricesTexture,r=this._matricesTexture.image.data;return t>=n.length||n[t].active===!1?this:(e.toArray(r,t*16),i.needsUpdate=!0,this)}getMatrixAt(t,e){const n=this._instanceInfo,i=this._matricesTexture.image.data;return t>=n.length||n[t].active===!1?null:e.fromArray(i,t*16)}setColorAt(t,e){this._colorsTexture===null&&this._initColorsTexture();const n=this._colorsTexture,i=this._colorsTexture.image.data,r=this._instanceInfo;return t>=r.length||r[t].active===!1?this:(e.toArray(i,t*4),n.needsUpdate=!0,this)}getColorAt(t,e){const n=this._colorsTexture.image.data,i=this._instanceInfo;return t>=i.length||i[t].active===!1?null:e.fromArray(n,t*4)}setVisibleAt(t,e){const n=this._instanceInfo;return t>=n.length||n[t].active===!1||n[t].visible===e?this:(n[t].visible=e,this._visibilityChanged=!0,this)}getVisibleAt(t){const e=this._instanceInfo;return t>=e.length||e[t].active===!1?!1:e[t].visible}setGeometryIdAt(t,e){const n=this._instanceInfo,i=this._geometryInfo;return t>=n.length||n[t].active===!1||e>=i.length||i[e].active===!1?null:(n[t].geometryIndex=e,this)}getGeometryIdAt(t){const e=this._instanceInfo;return t>=e.length||e[t].active===!1?-1:e[t].geometryIndex}getGeometryRangeAt(t,e={}){if(t<0||t>=this._geometryCount)return null;const n=this._geometryInfo[t];return e.vertexStart=n.vertexStart,e.vertexCount=n.vertexCount,e.reservedVertexCount=n.reservedVertexCount,e.indexStart=n.indexStart,e.indexCount=n.indexCount,e.reservedIndexCount=n.reservedIndexCount,e.start=n.start,e.count=n.count,e}setInstanceCount(t){const e=this._availableInstanceIds,n=this._instanceInfo;for(e.sort(ko);e[e.length-1]===n.length;)n.pop(),e.pop();if(t<n.length)throw new Error(`BatchedMesh: Instance ids outside the range ${t} are being used. Cannot shrink instance count.`);const i=new Int32Array(t),r=new Int32Array(t);Si(this._multiDrawCounts,i),Si(this._multiDrawStarts,r),this._multiDrawCounts=i,this._multiDrawStarts=r,this._maxInstanceCount=t;const o=this._indirectTexture,a=this._matricesTexture,c=this._colorsTexture;o.dispose(),this._initIndirectTexture(),Si(o.image.data,this._indirectTexture.image.data),a.dispose(),this._initMatricesTexture(),Si(a.image.data,this._matricesTexture.image.data),c&&(c.dispose(),this._initColorsTexture(),Si(c.image.data,this._colorsTexture.image.data))}setGeometrySize(t,e){const n=[...this._geometryInfo].filter(a=>a.active);if(Math.max(...n.map(a=>a.vertexStart+a.reservedVertexCount))>t)throw new Error(`BatchedMesh: Geometry vertex values are being used outside the range ${e}. Cannot shrink further.`);if(this.geometry.index&&Math.max(...n.map(c=>c.indexStart+c.reservedIndexCount))>e)throw new Error(`BatchedMesh: Geometry index values are being used outside the range ${e}. Cannot shrink further.`);const r=this.geometry;r.dispose(),this._maxVertexCount=t,this._maxIndexCount=e,this._geometryInitialized&&(this._geometryInitialized=!1,this.geometry=new oe,this._initializeGeometry(r));const o=this.geometry;r.index&&Si(r.index.array,o.index.array);for(const a in r.attributes)Si(r.attributes[a].array,o.attributes[a].array)}raycast(t,e){const n=this._instanceInfo,i=this._geometryInfo,r=this.matrixWorld,o=this.geometry;Ye.material=this.material,Ye.geometry.index=o.index,Ye.geometry.attributes=o.attributes,Ye.geometry.boundingBox===null&&(Ye.geometry.boundingBox=new ke),Ye.geometry.boundingSphere===null&&(Ye.geometry.boundingSphere=new Ce);for(let a=0,c=n.length;a<c;a++){if(!n[a].visible||!n[a].active)continue;const l=n[a].geometryIndex,h=i[l];Ye.geometry.setDrawRange(h.start,h.count),this.getMatrixAt(a,Ye.matrixWorld).premultiply(r),this.getBoundingBoxAt(l,Ye.geometry.boundingBox),this.getBoundingSphereAt(l,Ye.geometry.boundingSphere),Ye.raycast(t,Hr);for(let d=0,u=Hr.length;d<u;d++){const f=Hr[d];f.object=this,f.batchId=a,e.push(f)}Hr.length=0}Ye.material=null,Ye.geometry.index=null,Ye.geometry.attributes={},Ye.geometry.setDrawRange(0,1/0)}copy(t){return super.copy(t),this.geometry=t.geometry.clone(),this.perObjectFrustumCulled=t.perObjectFrustumCulled,this.sortObjects=t.sortObjects,this.boundingBox=t.boundingBox!==null?t.boundingBox.clone():null,this.boundingSphere=t.boundingSphere!==null?t.boundingSphere.clone():null,this._geometryInfo=t._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox!==null?e.boundingBox.clone():null,boundingSphere:e.boundingSphere!==null?e.boundingSphere.clone():null})),this._instanceInfo=t._instanceInfo.map(e=>({...e})),this._maxInstanceCount=t._maxInstanceCount,this._maxVertexCount=t._maxVertexCount,this._maxIndexCount=t._maxIndexCount,this._geometryInitialized=t._geometryInitialized,this._geometryCount=t._geometryCount,this._multiDrawCounts=t._multiDrawCounts.slice(),this._multiDrawStarts=t._multiDrawStarts.slice(),this._matricesTexture=t._matricesTexture.clone(),this._matricesTexture.image.data=this._matricesTexture.image.data.slice(),this._colorsTexture!==null&&(this._colorsTexture=t._colorsTexture.clone(),this._colorsTexture.image.data=this._colorsTexture.image.data.slice()),this}dispose(){return this.geometry.dispose(),this._matricesTexture.dispose(),this._matricesTexture=null,this._indirectTexture.dispose(),this._indirectTexture=null,this._colorsTexture!==null&&(this._colorsTexture.dispose(),this._colorsTexture=null),this}onBeforeRender(t,e,n,i,r){if(!this._visibilityChanged&&!this.perObjectFrustumCulled&&!this.sortObjects)return;const o=i.getIndex(),a=o===null?1:o.array.BYTES_PER_ELEMENT,c=this._instanceInfo,l=this._multiDrawStarts,h=this._multiDrawCounts,d=this._geometryInfo,u=this.perObjectFrustumCulled,f=this._indirectTexture,p=f.image.data;u&&(rn.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse).multiply(this.matrixWorld),Ho.setFromProjectionMatrix(rn,t.coordinateSystem));let x=0;if(this.sortObjects){rn.copy(this.matrixWorld).invert(),Os.setFromMatrixPosition(n.matrixWorld).applyMatrix4(rn),Al.set(0,0,-1).transformDirection(n.matrixWorld).transformDirection(rn);for(let y=0,w=c.length;y<w;y++)if(c[y].visible&&c[y].active){const v=c[y].geometryIndex;this.getMatrixAt(y,rn),this.getBoundingSphereAt(v,Mi).applyMatrix4(rn);let T=!1;if(u&&(T=!Ho.intersectsSphere(Mi)),!T){const M=d[v],E=Ng.subVectors(Mi.center,Os).dot(Al);Go.push(M.start,M.count,E,y)}}const g=Go.list,m=this.customSort;m===null?g.sort(r.transparent?Ig:Dg):m.call(this,g,n);for(let y=0,w=g.length;y<w;y++){const v=g[y];l[x]=v.start*a,h[x]=v.count,p[x]=v.index,x++}Go.reset()}else for(let g=0,m=c.length;g<m;g++)if(c[g].visible&&c[g].active){const y=c[g].geometryIndex;let w=!1;if(u&&(this.getMatrixAt(g,rn),this.getBoundingSphereAt(y,Mi).applyMatrix4(rn),w=!Ho.intersectsSphere(Mi)),!w){const v=d[y];l[x]=v.start*a,h[x]=v.count,p[x]=g,x++}}f.needsUpdate=!0,this._multiDrawCount=x,this._visibilityChanged=!1}onBeforeShadow(t,e,n,i,r,o){this.onBeforeRender(t,null,i,r,o)}}class Bg extends Es{static get type(){return"PointsMaterial"}constructor(t){super(),this.isPointsMaterial=!0,this.color=new Ft(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}}const Cl=new Yt,Ya=new Ph,Gr=new Ce,Vr=new P;class kg extends We{constructor(t=new oe,e=new Bg){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}raycast(t,e){const n=this.geometry,i=this.matrixWorld,r=t.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Gr.copy(n.boundingSphere),Gr.applyMatrix4(i),Gr.radius+=r,t.ray.intersectsSphere(Gr)===!1)return;Cl.copy(i).invert(),Ya.copy(t.ray).applyMatrix4(Cl);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=n.index,d=n.attributes.position;if(l!==null){const u=Math.max(0,o.start),f=Math.min(l.count,o.start+o.count);for(let p=u,x=f;p<x;p++){const g=l.getX(p);Vr.fromBufferAttribute(d,g),Rl(Vr,g,c,i,t,e,this)}}else{const u=Math.max(0,o.start),f=Math.min(d.count,o.start+o.count);for(let p=u,x=f;p<x;p++)Vr.fromBufferAttribute(d,p),Rl(Vr,p,c,i,t,e,this)}}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){const a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function Rl(s,t,e,n,i,r,o){const a=Ya.distanceSqToPoint(s);if(a<e){const c=new P;Ya.closestPointToPoint(s,c),c.applyMatrix4(n);const l=i.ray.origin.distanceTo(c);if(l<i.near||l>i.far)return;r.push({distance:l,distanceToRay:Math.sqrt(a),point:c,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}class lr extends Ke{constructor(t,e,n,i,r,o,a,c,l){super(t,e,n,i,r,o,a,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}}class Qn{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(t,e){const n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){const t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const e=[];let n,i=this.getPoint(0),r=0;e.push(0);for(let o=1;o<=t;o++)n=this.getPoint(o/t),r+=n.distanceTo(i),e.push(r),i=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e){const n=this.getLengths();let i=0;const r=n.length;let o;e?o=e:o=t*n[r-1];let a=0,c=r-1,l;for(;a<=c;)if(i=Math.floor(a+(c-a)/2),l=n[i]-o,l<0)a=i+1;else if(l>0)c=i-1;else{c=i;break}if(i=c,n[i]===o)return i/(r-1);const h=n[i],u=n[i+1]-h,f=(o-h)/u;return(i+f)/(r-1)}getTangent(t,e){let i=t-1e-4,r=t+1e-4;i<0&&(i=0),r>1&&(r=1);const o=this.getPoint(i),a=this.getPoint(r),c=e||(o.isVector2?new Ut:new P);return c.copy(a).sub(o).normalize(),c}getTangentAt(t,e){const n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e){const n=new P,i=[],r=[],o=[],a=new P,c=new Yt;for(let f=0;f<=t;f++){const p=f/t;i[f]=this.getTangentAt(p,new P)}r[0]=new P,o[0]=new P;let l=Number.MAX_VALUE;const h=Math.abs(i[0].x),d=Math.abs(i[0].y),u=Math.abs(i[0].z);h<=l&&(l=h,n.set(1,0,0)),d<=l&&(l=d,n.set(0,1,0)),u<=l&&n.set(0,0,1),a.crossVectors(i[0],n).normalize(),r[0].crossVectors(i[0],a),o[0].crossVectors(i[0],r[0]);for(let f=1;f<=t;f++){if(r[f]=r[f-1].clone(),o[f]=o[f-1].clone(),a.crossVectors(i[f-1],i[f]),a.length()>Number.EPSILON){a.normalize();const p=Math.acos(ze(i[f-1].dot(i[f]),-1,1));r[f].applyMatrix4(c.makeRotationAxis(a,p))}o[f].crossVectors(i[f],r[f])}if(e===!0){let f=Math.acos(ze(r[0].dot(r[t]),-1,1));f/=t,i[0].dot(a.crossVectors(r[0],r[t]))>0&&(f=-f);for(let p=1;p<=t;p++)r[p].applyMatrix4(c.makeRotationAxis(i[p],f*p)),o[p].crossVectors(i[p],r[p])}return{tangents:i,normals:r,binormals:o}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){const t={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}}class Wh extends Qn{constructor(t=0,e=0,n=1,i=1,r=0,o=Math.PI*2,a=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=i,this.aStartAngle=r,this.aEndAngle=o,this.aClockwise=a,this.aRotation=c}getPoint(t,e=new Ut){const n=e,i=Math.PI*2;let r=this.aEndAngle-this.aStartAngle;const o=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=i;for(;r>i;)r-=i;r<Number.EPSILON&&(o?r=0:r=i),this.aClockwise===!0&&!o&&(r===i?r=-i:r=r-i);const a=this.aStartAngle+t*r;let c=this.aX+this.xRadius*Math.cos(a),l=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){const h=Math.cos(this.aRotation),d=Math.sin(this.aRotation),u=c-this.aX,f=l-this.aY;c=u*h-f*d+this.aX,l=u*d+f*h+this.aY}return n.set(c,l)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){const t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}}class Hg extends Wh{constructor(t,e,n,i,r,o){super(t,e,n,n,i,r,o),this.isArcCurve=!0,this.type="ArcCurve"}}function fc(){let s=0,t=0,e=0,n=0;function i(r,o,a,c){s=r,t=a,e=-3*r+3*o-2*a-c,n=2*r-2*o+a+c}return{initCatmullRom:function(r,o,a,c,l){i(o,a,l*(a-r),l*(c-o))},initNonuniformCatmullRom:function(r,o,a,c,l,h,d){let u=(o-r)/l-(a-r)/(l+h)+(a-o)/h,f=(a-o)/h-(c-o)/(h+d)+(c-a)/d;u*=h,f*=h,i(o,a,u,f)},calc:function(r){const o=r*r,a=o*r;return s+t*r+e*o+n*a}}}const Wr=new P,Vo=new fc,Wo=new fc,Xo=new fc;class Xh extends Qn{constructor(t=[],e=!1,n="centripetal",i=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=i}getPoint(t,e=new P){const n=e,i=this.points,r=i.length,o=(r-(this.closed?0:1))*t;let a=Math.floor(o),c=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/r)+1)*r:c===0&&a===r-1&&(a=r-2,c=1);let l,h;this.closed||a>0?l=i[(a-1)%r]:(Wr.subVectors(i[0],i[1]).add(i[0]),l=Wr);const d=i[a%r],u=i[(a+1)%r];if(this.closed||a+2<r?h=i[(a+2)%r]:(Wr.subVectors(i[r-1],i[r-2]).add(i[r-1]),h=Wr),this.curveType==="centripetal"||this.curveType==="chordal"){const f=this.curveType==="chordal"?.5:.25;let p=Math.pow(l.distanceToSquared(d),f),x=Math.pow(d.distanceToSquared(u),f),g=Math.pow(u.distanceToSquared(h),f);x<1e-4&&(x=1),p<1e-4&&(p=x),g<1e-4&&(g=x),Vo.initNonuniformCatmullRom(l.x,d.x,u.x,h.x,p,x,g),Wo.initNonuniformCatmullRom(l.y,d.y,u.y,h.y,p,x,g),Xo.initNonuniformCatmullRom(l.z,d.z,u.z,h.z,p,x,g)}else this.curveType==="catmullrom"&&(Vo.initCatmullRom(l.x,d.x,u.x,h.x,this.tension),Wo.initCatmullRom(l.y,d.y,u.y,h.y,this.tension),Xo.initCatmullRom(l.z,d.z,u.z,h.z,this.tension));return n.set(Vo.calc(c),Wo.calc(c),Xo.calc(c)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(i.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const i=this.points[e];t.points.push(i.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(new P().fromArray(i))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}}function Pl(s,t,e,n,i){const r=(n-t)*.5,o=(i-e)*.5,a=s*s,c=s*a;return(2*e-2*n+r+o)*c+(-3*e+3*n-2*r-o)*a+r*s+e}function Gg(s,t){const e=1-s;return e*e*t}function Vg(s,t){return 2*(1-s)*s*t}function Wg(s,t){return s*s*t}function Ks(s,t,e,n){return Gg(s,t)+Vg(s,e)+Wg(s,n)}function Xg(s,t){const e=1-s;return e*e*e*t}function qg(s,t){const e=1-s;return 3*e*e*s*t}function Yg(s,t){return 3*(1-s)*s*s*t}function $g(s,t){return s*s*s*t}function Js(s,t,e,n,i){return Xg(s,t)+qg(s,e)+Yg(s,n)+$g(s,i)}class jg extends Qn{constructor(t=new Ut,e=new Ut,n=new Ut,i=new Ut){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new Ut){const n=e,i=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Js(t,i.x,r.x,o.x,a.x),Js(t,i.y,r.y,o.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Zg extends Qn{constructor(t=new P,e=new P,n=new P,i=new P){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new P){const n=e,i=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Js(t,i.x,r.x,o.x,a.x),Js(t,i.y,r.y,o.y,a.y),Js(t,i.z,r.z,o.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Kg extends Qn{constructor(t=new Ut,e=new Ut){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new Ut){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new Ut){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Jg extends Qn{constructor(t=new P,e=new P){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new P){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new P){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Qg extends Qn{constructor(t=new Ut,e=new Ut,n=new Ut){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new Ut){const n=e,i=this.v0,r=this.v1,o=this.v2;return n.set(Ks(t,i.x,r.x,o.x),Ks(t,i.y,r.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class qh extends Qn{constructor(t=new P,e=new P,n=new P){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new P){const n=e,i=this.v0,r=this.v1,o=this.v2;return n.set(Ks(t,i.x,r.x,o.x),Ks(t,i.y,r.y,o.y),Ks(t,i.z,r.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class t1 extends Qn{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new Ut){const n=e,i=this.points,r=(i.length-1)*t,o=Math.floor(r),a=r-o,c=i[o===0?o:o-1],l=i[o],h=i[o>i.length-2?i.length-1:o+1],d=i[o>i.length-3?i.length-1:o+2];return n.set(Pl(a,c.x,l.x,h.x,d.x),Pl(a,c.y,l.y,h.y,d.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(i.clone())}return this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const i=this.points[e];t.points.push(i.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(new Ut().fromArray(i))}return this}}var e1=Object.freeze({__proto__:null,ArcCurve:Hg,CatmullRomCurve3:Xh,CubicBezierCurve:jg,CubicBezierCurve3:Zg,EllipseCurve:Wh,LineCurve:Kg,LineCurve3:Jg,QuadraticBezierCurve:Qg,QuadraticBezierCurve3:qh,SplineCurve:t1});class pc extends oe{constructor(t=1,e=32,n=0,i=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:i},e=Math.max(3,e);const r=[],o=[],a=[],c=[],l=new P,h=new Ut;o.push(0,0,0),a.push(0,0,1),c.push(.5,.5);for(let d=0,u=3;d<=e;d++,u+=3){const f=n+d/e*i;l.x=t*Math.cos(f),l.y=t*Math.sin(f),o.push(l.x,l.y,l.z),a.push(0,0,1),h.x=(o[u]/t+1)/2,h.y=(o[u+1]/t+1)/2,c.push(h.x,h.y)}for(let d=1;d<=e;d++)r.push(d,d+1,0);this.setIndex(r),this.setAttribute("position",new bt(o,3)),this.setAttribute("normal",new bt(a,3)),this.setAttribute("uv",new bt(c,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new pc(t.radius,t.segments,t.thetaStart,t.thetaLength)}}class ye extends oe{constructor(t=1,e=1,n=1,i=32,r=1,o=!1,a=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:i,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:c};const l=this;i=Math.floor(i),r=Math.floor(r);const h=[],d=[],u=[],f=[];let p=0;const x=[],g=n/2;let m=0;y(),o===!1&&(t>0&&w(!0),e>0&&w(!1)),this.setIndex(h),this.setAttribute("position",new bt(d,3)),this.setAttribute("normal",new bt(u,3)),this.setAttribute("uv",new bt(f,2));function y(){const v=new P,T=new P;let M=0;const E=(e-t)/n;for(let b=0;b<=r;b++){const _=[],S=b/r,R=S*(e-t)+t;for(let O=0;O<=i;O++){const I=O/i,A=I*c+a,U=Math.sin(A),F=Math.cos(A);T.x=R*U,T.y=-S*n+g,T.z=R*F,d.push(T.x,T.y,T.z),v.set(U,E,F).normalize(),u.push(v.x,v.y,v.z),f.push(I,1-S),_.push(p++)}x.push(_)}for(let b=0;b<i;b++)for(let _=0;_<r;_++){const S=x[_][b],R=x[_+1][b],O=x[_+1][b+1],I=x[_][b+1];(t>0||_!==0)&&(h.push(S,R,I),M+=3),(e>0||_!==r-1)&&(h.push(R,O,I),M+=3)}l.addGroup(m,M,0),m+=M}function w(v){const T=p,M=new Ut,E=new P;let b=0;const _=v===!0?t:e,S=v===!0?1:-1;for(let O=1;O<=i;O++)d.push(0,g*S,0),u.push(0,S,0),f.push(.5,.5),p++;const R=p;for(let O=0;O<=i;O++){const A=O/i*c+a,U=Math.cos(A),F=Math.sin(A);E.x=_*F,E.y=g*S,E.z=_*U,d.push(E.x,E.y,E.z),u.push(0,S,0),M.x=U*.5+.5,M.y=F*.5*S+.5,f.push(M.x,M.y),p++}for(let O=0;O<i;O++){const I=T+O,A=R+O;v===!0?h.push(A,A+1,I):h.push(A+1,A,I),b+=3}l.addGroup(m,b,v===!0?1:2),m+=b}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ye(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class mc extends ye{constructor(t=1,e=1,n=32,i=1,r=!1,o=0,a=Math.PI*2){super(0,t,e,n,i,r,o,a),this.type="ConeGeometry",this.parameters={radius:t,height:e,radialSegments:n,heightSegments:i,openEnded:r,thetaStart:o,thetaLength:a}}static fromJSON(t){return new mc(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class gc extends oe{constructor(t=[],e=[],n=1,i=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:n,detail:i};const r=[],o=[];a(i),l(n),h(),this.setAttribute("position",new bt(r,3)),this.setAttribute("normal",new bt(r.slice(),3)),this.setAttribute("uv",new bt(o,2)),i===0?this.computeVertexNormals():this.normalizeNormals();function a(y){const w=new P,v=new P,T=new P;for(let M=0;M<e.length;M+=3)f(e[M+0],w),f(e[M+1],v),f(e[M+2],T),c(w,v,T,y)}function c(y,w,v,T){const M=T+1,E=[];for(let b=0;b<=M;b++){E[b]=[];const _=y.clone().lerp(v,b/M),S=w.clone().lerp(v,b/M),R=M-b;for(let O=0;O<=R;O++)O===0&&b===M?E[b][O]=_:E[b][O]=_.clone().lerp(S,O/R)}for(let b=0;b<M;b++)for(let _=0;_<2*(M-b)-1;_++){const S=Math.floor(_/2);_%2===0?(u(E[b][S+1]),u(E[b+1][S]),u(E[b][S])):(u(E[b][S+1]),u(E[b+1][S+1]),u(E[b+1][S]))}}function l(y){const w=new P;for(let v=0;v<r.length;v+=3)w.x=r[v+0],w.y=r[v+1],w.z=r[v+2],w.normalize().multiplyScalar(y),r[v+0]=w.x,r[v+1]=w.y,r[v+2]=w.z}function h(){const y=new P;for(let w=0;w<r.length;w+=3){y.x=r[w+0],y.y=r[w+1],y.z=r[w+2];const v=g(y)/2/Math.PI+.5,T=m(y)/Math.PI+.5;o.push(v,1-T)}p(),d()}function d(){for(let y=0;y<o.length;y+=6){const w=o[y+0],v=o[y+2],T=o[y+4],M=Math.max(w,v,T),E=Math.min(w,v,T);M>.9&&E<.1&&(w<.2&&(o[y+0]+=1),v<.2&&(o[y+2]+=1),T<.2&&(o[y+4]+=1))}}function u(y){r.push(y.x,y.y,y.z)}function f(y,w){const v=y*3;w.x=t[v+0],w.y=t[v+1],w.z=t[v+2]}function p(){const y=new P,w=new P,v=new P,T=new P,M=new Ut,E=new Ut,b=new Ut;for(let _=0,S=0;_<r.length;_+=9,S+=6){y.set(r[_+0],r[_+1],r[_+2]),w.set(r[_+3],r[_+4],r[_+5]),v.set(r[_+6],r[_+7],r[_+8]),M.set(o[S+0],o[S+1]),E.set(o[S+2],o[S+3]),b.set(o[S+4],o[S+5]),T.copy(y).add(w).add(v).divideScalar(3);const R=g(T);x(M,S+0,y,R),x(E,S+2,w,R),x(b,S+4,v,R)}}function x(y,w,v,T){T<0&&y.x===1&&(o[w]=y.x-1),v.x===0&&v.z===0&&(o[w]=T/2/Math.PI+.5)}function g(y){return Math.atan2(y.z,-y.x)}function m(y){return Math.atan2(-y.y,Math.sqrt(y.x*y.x+y.z*y.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new gc(t.vertices,t.indices,t.radius,t.details)}}class vc extends gc{constructor(t=1,e=0){const n=(1+Math.sqrt(5))/2,i=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],r=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(i,r,t,e),this.type="IcosahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new vc(t.radius,t.detail)}}class jn extends oe{constructor(t=1,e=32,n=16,i=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:i,phiLength:r,thetaStart:o,thetaLength:a},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));const c=Math.min(o+a,Math.PI);let l=0;const h=[],d=new P,u=new P,f=[],p=[],x=[],g=[];for(let m=0;m<=n;m++){const y=[],w=m/n;let v=0;m===0&&o===0?v=.5/e:m===n&&c===Math.PI&&(v=-.5/e);for(let T=0;T<=e;T++){const M=T/e;d.x=-t*Math.cos(i+M*r)*Math.sin(o+w*a),d.y=t*Math.cos(o+w*a),d.z=t*Math.sin(i+M*r)*Math.sin(o+w*a),p.push(d.x,d.y,d.z),u.copy(d).normalize(),x.push(u.x,u.y,u.z),g.push(M+v,1-w),y.push(l++)}h.push(y)}for(let m=0;m<n;m++)for(let y=0;y<e;y++){const w=h[m][y+1],v=h[m][y],T=h[m+1][y],M=h[m+1][y+1];(m!==0||o>0)&&f.push(w,v,M),(m!==n-1||c<Math.PI)&&f.push(v,T,M)}this.setIndex(f),this.setAttribute("position",new bt(p,3)),this.setAttribute("normal",new bt(x,3)),this.setAttribute("uv",new bt(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new jn(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}class Qs extends oe{constructor(t=1,e=.4,n=12,i=48,r=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:i,arc:r},n=Math.floor(n),i=Math.floor(i);const o=[],a=[],c=[],l=[],h=new P,d=new P,u=new P;for(let f=0;f<=n;f++)for(let p=0;p<=i;p++){const x=p/i*r,g=f/n*Math.PI*2;d.x=(t+e*Math.cos(g))*Math.cos(x),d.y=(t+e*Math.cos(g))*Math.sin(x),d.z=e*Math.sin(g),a.push(d.x,d.y,d.z),h.x=t*Math.cos(x),h.y=t*Math.sin(x),u.subVectors(d,h).normalize(),c.push(u.x,u.y,u.z),l.push(p/i),l.push(f/n)}for(let f=1;f<=n;f++)for(let p=1;p<=i;p++){const x=(i+1)*f+p-1,g=(i+1)*(f-1)+p-1,m=(i+1)*(f-1)+p,y=(i+1)*f+p;o.push(x,g,y),o.push(g,m,y)}this.setIndex(o),this.setAttribute("position",new bt(a,3)),this.setAttribute("normal",new bt(c,3)),this.setAttribute("uv",new bt(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Qs(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}}class xc extends oe{constructor(t=new qh(new P(-1,-1,0),new P(-1,1,0),new P(1,1,0)),e=64,n=1,i=8,r=!1){super(),this.type="TubeGeometry",this.parameters={path:t,tubularSegments:e,radius:n,radialSegments:i,closed:r};const o=t.computeFrenetFrames(e,r);this.tangents=o.tangents,this.normals=o.normals,this.binormals=o.binormals;const a=new P,c=new P,l=new Ut;let h=new P;const d=[],u=[],f=[],p=[];x(),this.setIndex(p),this.setAttribute("position",new bt(d,3)),this.setAttribute("normal",new bt(u,3)),this.setAttribute("uv",new bt(f,2));function x(){for(let w=0;w<e;w++)g(w);g(r===!1?e:0),y(),m()}function g(w){h=t.getPointAt(w/e,h);const v=o.normals[w],T=o.binormals[w];for(let M=0;M<=i;M++){const E=M/i*Math.PI*2,b=Math.sin(E),_=-Math.cos(E);c.x=_*v.x+b*T.x,c.y=_*v.y+b*T.y,c.z=_*v.z+b*T.z,c.normalize(),u.push(c.x,c.y,c.z),a.x=h.x+n*c.x,a.y=h.y+n*c.y,a.z=h.z+n*c.z,d.push(a.x,a.y,a.z)}}function m(){for(let w=1;w<=e;w++)for(let v=1;v<=i;v++){const T=(i+1)*(w-1)+(v-1),M=(i+1)*w+(v-1),E=(i+1)*w+v,b=(i+1)*(w-1)+v;p.push(T,M,b),p.push(M,E,b)}}function y(){for(let w=0;w<=e;w++)for(let v=0;v<=i;v++)l.x=w/e,l.y=v/i,f.push(l.x,l.y)}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){const t=super.toJSON();return t.path=this.parameters.path.toJSON(),t}static fromJSON(t){return new xc(new e1[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}}class le extends Es{static get type(){return"MeshStandardMaterial"}constructor(t){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.color=new Ft(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ft(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=bh,this.normalScale=new Ut(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Ee,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class Bs extends le{static get type(){return"MeshPhysicalMaterial"}constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new Ut(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return ze(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Ft(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Ft(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Ft(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){this._dispersion>0!=t>0&&this.version++,this._dispersion=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}}class n1 extends We{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Ft(t),this.intensity=e}dispose(){}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(e.object.target=this.target.uuid),e}}const qo=new Yt,Ll=new P,Dl=new P;class i1{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Ut(512,512),this.map=null,this.mapPass=null,this.matrix=new Yt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new xs,this._frameExtents=new Ut(1,1),this._viewportCount=1,this._viewports=[new be(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,n=this.matrix;Ll.setFromMatrixPosition(t.matrixWorld),e.position.copy(Ll),Dl.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Dl),e.updateMatrixWorld(),qo.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(qo),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(qo)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}class s1 extends i1{constructor(){super(new cr(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class r1 extends n1{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(We.DEFAULT_UP),this.updateMatrix(),this.target=new We,this.shadow=new s1}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:ic}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=ic);const Yo=new Yt;class co{constructor(t){t=t||{},this.zNear=t.webGL===!0?-1:0,this.vertices={near:[new P,new P,new P,new P],far:[new P,new P,new P,new P]},t.projectionMatrix!==void 0&&this.setFromProjectionMatrix(t.projectionMatrix,t.maxFar||1e4)}setFromProjectionMatrix(t,e){const n=this.zNear,i=t.elements[2*4+3]===0;return Yo.copy(t).invert(),this.vertices.near[0].set(1,1,n),this.vertices.near[1].set(1,-1,n),this.vertices.near[2].set(-1,-1,n),this.vertices.near[3].set(-1,1,n),this.vertices.near.forEach(function(r){r.applyMatrix4(Yo)}),this.vertices.far[0].set(1,1,1),this.vertices.far[1].set(1,-1,1),this.vertices.far[2].set(-1,-1,1),this.vertices.far[3].set(-1,1,1),this.vertices.far.forEach(function(r){r.applyMatrix4(Yo);const o=Math.abs(r.z);i?r.z*=Math.min(e/o,1):r.multiplyScalar(Math.min(e/o,1))}),this.vertices}split(t,e){for(;t.length>e.length;)e.push(new co);e.length=t.length;for(let n=0;n<t.length;n++){const i=e[n];if(n===0)for(let r=0;r<4;r++)i.vertices.near[r].copy(this.vertices.near[r]);else for(let r=0;r<4;r++)i.vertices.near[r].lerpVectors(this.vertices.near[r],this.vertices.far[r],t[n-1]);if(n===t.length-1)for(let r=0;r<4;r++)i.vertices.far[r].copy(this.vertices.far[r]);else for(let r=0;r<4;r++)i.vertices.far[r].lerpVectors(this.vertices.near[r],this.vertices.far[r],t[n])}}toSpace(t,e){for(let n=0;n<4;n++)e.vertices.near[n].copy(this.vertices.near[n]).applyMatrix4(t),e.vertices.far[n].copy(this.vertices.far[n]).applyMatrix4(t)}}const Il={lights_fragment_begin:`
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
	`+ce.lights_pars_begin},zl=new Yt,$o=new co({webGL:!0}),Bn=new P,ks=new ke,jo=[],Zo=[],Ko=new Yt,Ul=new Yt,o1=new P(0,1,0);class a1{constructor(t){this.camera=t.camera,this.parent=t.parent,this.cascades=t.cascades||3,this.maxFar=t.maxFar||1e5,this.mode=t.mode||"practical",this.shadowMapSize=t.shadowMapSize||2048,this.shadowBias=t.shadowBias||1e-6,this.lightDirection=t.lightDirection||new P(1,-1,1).normalize(),this.lightIntensity=t.lightIntensity||3,this.lightNear=t.lightNear||1,this.lightFar=t.lightFar||2e3,this.lightMargin=t.lightMargin||200,this.customSplitsCallback=t.customSplitsCallback,this.fade=!1,this.mainFrustum=new co({webGL:!0}),this.frustums=[],this.breaks=[],this.lights=[],this.shaders=new Map,this.createLights(),this.updateFrustums(),this.injectInclude()}createLights(){for(let t=0;t<this.cascades;t++){const e=new r1(16777215,this.lightIntensity);e.castShadow=!0,e.shadow.mapSize.width=this.shadowMapSize,e.shadow.mapSize.height=this.shadowMapSize,e.shadow.camera.near=this.lightNear,e.shadow.camera.far=this.lightFar,e.shadow.bias=this.shadowBias,this.parent.add(e),this.parent.add(e.target),this.lights.push(e)}}initCascades(){const t=this.camera;t.updateProjectionMatrix(),this.mainFrustum.setFromProjectionMatrix(t.projectionMatrix,this.maxFar),this.mainFrustum.split(this.breaks,this.frustums)}updateShadowBounds(){const t=this.frustums;for(let e=0;e<t.length;e++){const i=this.lights[e].shadow.camera,r=this.frustums[e],o=r.vertices.near,a=r.vertices.far,c=a[0];let l;c.distanceTo(a[2])>c.distanceTo(o[2])?l=a[2]:l=o[2];let h=c.distanceTo(l);if(this.fade){const d=this.camera,u=Math.max(d.far,this.maxFar),f=r.vertices.far[0].z/(u-d.near),p=.25*Math.pow(f,2)*(u-d.near);h+=p}i.left=-h/2,i.right=h/2,i.top=h/2,i.bottom=-h/2,i.updateProjectionMatrix()}}getBreaks(){const t=this.camera,e=Math.min(t.far,this.maxFar);switch(this.breaks.length=0,this.mode){case"uniform":n(this.cascades,t.near,e,this.breaks);break;case"logarithmic":i(this.cascades,t.near,e,this.breaks);break;case"practical":r(this.cascades,t.near,e,.5,this.breaks);break;case"custom":this.customSplitsCallback===void 0&&console.error("CSM: Custom split scheme callback not defined."),this.customSplitsCallback(this.cascades,t.near,e,this.breaks);break}function n(o,a,c,l){for(let h=1;h<o;h++)l.push((a+(c-a)*h/o)/c);l.push(1)}function i(o,a,c,l){for(let h=1;h<o;h++)l.push(a*(c/a)**(h/o)/c);l.push(1)}function r(o,a,c,l,h){jo.length=0,Zo.length=0,i(o,a,c,Zo),n(o,a,c,jo);for(let d=1;d<o;d++)h.push(Di.lerp(jo[d-1],Zo[d-1],l));h.push(1)}}update(){const t=this.camera,e=this.frustums;Ko.lookAt(new P,this.lightDirection,o1),Ul.copy(Ko).invert();for(let n=0;n<e.length;n++){const i=this.lights[n],r=i.shadow.camera,o=(r.right-r.left)/this.shadowMapSize,a=(r.top-r.bottom)/this.shadowMapSize;zl.multiplyMatrices(Ul,t.matrixWorld),e[n].toSpace(zl,$o);const c=$o.vertices.near,l=$o.vertices.far;ks.makeEmpty();for(let h=0;h<4;h++)ks.expandByPoint(c[h]),ks.expandByPoint(l[h]);ks.getCenter(Bn),Bn.z=ks.max.z+this.lightMargin,Bn.x=Math.floor(Bn.x/o)*o,Bn.y=Math.floor(Bn.y/a)*a,Bn.applyMatrix4(Ko),i.position.copy(Bn),i.target.position.copy(Bn),i.target.position.x+=this.lightDirection.x,i.target.position.y+=this.lightDirection.y,i.target.position.z+=this.lightDirection.z}}injectInclude(){ce.lights_fragment_begin=Il.lights_fragment_begin,ce.lights_pars_begin=Il.lights_pars_begin}setupMaterial(t){t.defines=t.defines||{},t.defines.USE_CSM=1,t.defines.CSM_CASCADES=this.cascades,this.fade&&(t.defines.CSM_FADE="");const e=[],n=this,i=this.shaders;t.onBeforeCompile=function(r){const o=Math.min(n.camera.far,n.maxFar);n.getExtendedBreaks(e),r.uniforms.CSM_cascades={value:e},r.uniforms.cameraNear={value:n.camera.near},r.uniforms.shadowFar={value:o},i.set(t,r)},i.set(t,null)}updateUniforms(){const t=Math.min(this.camera.far,this.maxFar);this.shaders.forEach(function(n,i){if(n!==null){const r=n.uniforms;this.getExtendedBreaks(r.CSM_cascades.value),r.cameraNear.value=this.camera.near,r.shadowFar.value=t}!this.fade&&"CSM_FADE"in i.defines?(delete i.defines.CSM_FADE,i.needsUpdate=!0):this.fade&&!("CSM_FADE"in i.defines)&&(i.defines.CSM_FADE="",i.needsUpdate=!0)},this)}getExtendedBreaks(t){for(;t.length<this.breaks.length;)t.push(new Ut);t.length=this.breaks.length;for(let e=0;e<this.cascades;e++){const n=this.breaks[e],i=this.breaks[e-1]||0;t[e].x=i,t[e].y=n}}updateFrustums(){this.getBreaks(),this.initCascades(),this.updateShadowBounds(),this.updateUniforms()}remove(){for(let t=0;t<this.lights.length;t++)this.parent.remove(this.lights[t].target),this.parent.remove(this.lights[t])}dispose(){const t=this.shaders;t.forEach(function(e,n){delete n.onBeforeCompile,delete n.defines.USE_CSM,delete n.defines.CSM_CASCADES,delete n.defines.CSM_FADE,e!==null&&(delete e.uniforms.CSM_cascades,delete e.uniforms.cameraNear,delete e.uniforms.shadowFar),n.needsUpdate=!0}),t.clear()}}const Vn=new Uint8Array(512);{const s=new Uint8Array(256);for(let e=0;e<256;e++)s[e]=e;let t=625341585;for(let e=255;e>0;e--){t^=t<<13,t>>>=0,t^=t>>>17,t^=t<<5,t>>>=0;const n=t%(e+1),i=s[e];s[e]=s[n],s[n]=i}for(let e=0;e<512;e++)Vn[e]=s[e&255]}const Nl=[1,1,-1,1,1,-1,-1,-1,1,0,-1,0,0,1,0,-1];function Fl(s){return s*s*s*(s*(s*6-15)+10)}function re(s,t){const e=Math.floor(s),n=Math.floor(t),i=s-e,r=t-n,o=e&255,a=n&255,c=Fl(i),l=Fl(r),h=(m,y,w)=>{const v=(m&7)*2;return Nl[v]*y+Nl[v+1]*w},d=Vn[Vn[o]+a],u=Vn[Vn[o]+a+1],f=Vn[Vn[o+1]+a],p=Vn[Vn[o+1]+a+1],x=h(d,i,r)+c*(h(f,i-1,r)-h(d,i,r)),g=h(u,i,r-1)+c*(h(p,i-1,r-1)-h(u,i,r-1));return(x+l*(g-x))*1.41}function Le(s,t,e=5,n=2,i=.5){let r=.5,o=1,a=0,c=0;for(let l=0;l<e;l++)a+=r*re(s*o+l*17.13,t*o-l*9.71),c+=r,r*=i,o*=n;return a/c}function Hs(s,t,e=4){let n=.5,i=1,r=0;for(let o=0;o<e;o++){const a=1-Math.abs(re(s*i+o*3.3,t*i+o*7.7));r+=a*a*n,n*=.5,i*=2.1}return r}function Nt(s,t,e){const n=Math.min(1,Math.max(0,(e-s)/(t-s)));return n*n*(3-2*n)}function Kt(s,t,e){return s<t?t:s>e?e:s}function ue(s,t,e){return s+(t-s)*e}function kn(s,t,e){const n=Kt(.5+.5*(t-s)/e,0,1);return ue(t,s,n)-e*n*(1-n)}const c1=6,l1=1,h1=new Ft(.26,.24,.2),li=[{el:-18,sun:[.5,.6,.85],sunI:.12,zen:[.006,.01,.024],hor:[.018,.024,.042],haze:[.014,.018,.03],sunHaze:[.02,.022,.03],amb:.15},{el:-8,sun:[.5,.6,.85],sunI:.12,zen:[.006,.011,.028],hor:[.035,.035,.065],haze:[.024,.026,.045],sunHaze:[.06,.03,.03],amb:.16},{el:-2,sun:[.9,.35,.15],sunI:.06,zen:[.015,.035,.1],hor:[.42,.22,.2],haze:[.22,.16,.2],sunHaze:[.9,.35,.18],amb:.4},{el:4,sun:[1,.5,.22],sunI:.3,zen:[.035,.1,.3],hor:[.82,.48,.34],haze:[.5,.4,.4],sunHaze:[1,.55,.3],amb:.85},{el:14,sun:[1,.74,.46],sunI:.62,zen:[.03,.11,.34],hor:[.66,.58,.54],haze:[.54,.52,.54],sunHaze:[1,.75,.5],amb:1},{el:30,sun:[1,.94,.84],sunI:.938,zen:[.02,.095,.325],hor:[.38,.47,.6],haze:[.48,.54,.64],sunHaze:[1,.92,.8],amb:1},{el:90,sun:[1,.97,.93],sunI:1,zen:[.018,.09,.32],hor:[.36,.46,.6],haze:[.47,.54,.65],sunHaze:[.98,.93,.84],amb:1}];function u1(s){let t=li[0],e=li[li.length-1];for(let r=0;r<li.length-1;r++)if(s>=li[r].el&&s<=li[r+1].el){t=li[r],e=li[r+1];break}const n=Nt(t.el,e.el,Kt(s,t.el,e.el)),i=(r,o)=>[ue(r[0],o[0],n),ue(r[1],o[1],n),ue(r[2],o[2],n)];return{el:s,sun:i(t.sun,e.sun),sunI:ue(t.sunI,e.sunI,n),zen:i(t.zen,e.zen),hor:i(t.hor,e.hor),haze:i(t.haze,e.haze),sunHaze:i(t.sunHaze,e.sunHaze),amb:ue(t.amb,e.amb,n)}}const Ol={clear:{coverage:.2,hazeDensity:15e-6,hazeHeight:1400,windSpeed:5,turbulence:.25,cloudBase:1500,cloudTop:2500,rain:0,sunDim:1},scattered:{coverage:.36,hazeDensity:19e-6,hazeHeight:1300,windSpeed:7,turbulence:.4,cloudBase:1200,cloudTop:2900,rain:0,sunDim:.97},cloudy:{coverage:.66,hazeDensity:32e-6,hazeHeight:1100,windSpeed:10,turbulence:.7,cloudBase:900,cloudTop:2600,rain:0,sunDim:.72},storm:{coverage:.92,hazeDensity:55e-6,hazeHeight:900,windSpeed:15,turbulence:1,cloudBase:700,cloudTop:2600,rain:1,sunDim:.4}};function d1(s){const t=25.8*Math.PI/180,e=10*Math.PI/180,n=(s-12)*15*Math.PI/180,i=Math.sin(t)*Math.sin(e)+Math.cos(t)*Math.cos(e)*Math.cos(n),r=Math.asin(Kt(i,-1,1)),o=(Math.sin(e)-Math.sin(r)*Math.sin(t))/(Math.cos(r)*Math.cos(t)||1e-6);let a=Math.acos(Kt(o,-1,1));return n>0&&(a=2*Math.PI-a),{dir:new P(Math.cos(r)*Math.sin(a),Math.sin(r),-Math.cos(r)*Math.cos(a)).normalize(),elevation:r*180/Math.PI,azimuth:a*180/Math.PI}}class f1{hour=14.5;weather="clear";preset=Ol.clear;state={sunDir:new P(0,1,0),sunElevation:60,sunColor:new Ft,sunIntensity:3,zenith:new Ft,horizon:new Ft,haze:new Ft,sunHaze:new Ft,ground:new Ft,ambientIntensity:1,night:0};uniforms={uSunDir:{value:new P(0,1,0)},uSunColor:{value:new Ft(1,1,1)},uZenithColor:{value:new Ft},uHorizonColor:{value:new Ft},uHazeColor:{value:new Ft},uSunHazeColor:{value:new Ft},uGroundColor:{value:new Ft},uHazeDensity:{value:3e-5},uHazeHeight:{value:1300},uCloudCoverage:{value:.3},uCloudBase:{value:1500},uCloudTop:{value:2600},uCloudWind:{value:new Ut(0,0)},uCloudSeed:{value:0},uNight:{value:0},uTime:{value:0}};cloudOffset=new Ut;windDir=new Ut(1,.35).normalize();time=0;constructor(t){this.uniforms.uCloudSeed.value=t%1e3/1e3*37.7}setWeather(t){this.weather=t,this.preset=Ol[t]}update(t){this.time+=t;const e=this.preset;this.cloudOffset.addScaledVector(this.windDir,e.windSpeed*2.2*t);const{dir:n,elevation:i}=d1(this.hour),r=u1(i),o=this.state,a=new P(-n.x,Math.max(.25,-n.y*.8+.3),-n.z).normalize(),c=Nt(0,-4,i);o.sunDir.copy(n).lerp(a,c).normalize(),o.sunElevation=i,o.sunColor.setRGB(r.sun[0],r.sun[1],r.sun[2]);const l=r.sunI*e.sunDim;o.sunIntensity=l*ue(c1,l1,c),o.zenith.setRGB(r.zen[0],r.zen[1],r.zen[2]),o.horizon.setRGB(r.hor[0],r.hor[1],r.hor[2]),o.haze.setRGB(r.haze[0],r.haze[1],r.haze[2]),o.sunHaze.setRGB(r.sunHaze[0],r.sunHaze[1],r.sunHaze[2]),o.ambientIntensity=r.amb,o.night=1-Nt(-12,-1,i);const h=Nt(.45,.95,e.coverage),d=o.horizon.r*.2126+o.horizon.g*.7152+o.horizon.b*.0722,u=new Ft(d,d,d).lerp(o.horizon,.3),f=o.zenith.clone().lerp(u,h*.8),p=o.horizon.clone().lerp(u,h*.7).multiplyScalar(ue(1,.9,h)),x=o.haze.clone().lerp(new Ft(d,d,d),h*.6).multiplyScalar(ue(1,.9,h)),g=o.zenith.clone().lerp(o.horizon,.3);o.ground.copy(o.sunColor).multiplyScalar(o.sunIntensity*Math.max(o.sunDir.y,0)/Math.PI).add(g).multiply(h1);const m=this.uniforms;m.uSunDir.value.copy(n),m.uSunColor.value.copy(o.sunColor).multiplyScalar(l),m.uZenithColor.value.copy(f),m.uHorizonColor.value.copy(p),m.uHazeColor.value.copy(x),m.uSunHazeColor.value.copy(o.sunHaze).multiplyScalar(ue(1,.6,h)),m.uGroundColor.value.copy(o.ground),m.uHazeDensity.value=e.hazeDensity,m.uHazeHeight.value=e.hazeHeight,m.uCloudCoverage.value=e.coverage,m.uCloudBase.value=e.cloudBase,m.uCloudTop.value=e.cloudTop,m.uCloudWind.value.copy(this.cloudOffset),m.uNight.value=o.night,m.uTime.value=this.time}}function Bl(s){let t=2166136261;for(let e=0;e<s.length;e++)t^=s.charCodeAt(e),t=Math.imul(t,16777619)>>>0;return t>>>0}function Jo(s,t,e=0){let n=(s|0)*374761393+(t|0)*668265263+(e|0)*2147483647;return n=(n^n>>>13)*1274126177,n=n^n>>>16,(n>>>0)/4294967296}class Ve{a;b;c;d;constructor(t){const e=typeof t=="string"?Bl(t):t>>>0;this.a=e^2654435769,this.b=e*2246822507>>>0,this.c=e*3266489909>>>0,this.d=1;for(let n=0;n<12;n++)this.next()}next(){this.a>>>=0,this.b>>>=0,this.c>>>=0,this.d>>>=0;let t=this.a+this.b|0;return this.a=this.b^this.b>>>9,this.b=this.c+(this.c<<3)|0,this.c=this.c<<21|this.c>>>11,this.d=this.d+1|0,t=t+this.d|0,this.c=this.c+t|0,(t>>>0)/4294967296}range(t,e){return t+(e-t)*this.next()}int(t,e){return t+Math.floor(this.next()*(e-t+1))}pick(t){return t[Math.floor(this.next()*t.length)]}chance(t){return this.next()<t}gauss(){return(this.next()+this.next()+this.next()+this.next()-2)*1.7320508}fork(t){return new Ve(Bl(t)^Math.floor(this.next()*4294967295))}}const _s=2e4,se=2048,Pi=_s/se,He=_s/2;var te=(s=>(s[s.OCEAN=0]="OCEAN",s[s.BAY=1]="BAY",s[s.BEACH=2]="BEACH",s[s.MANGROVE=3]="MANGROVE",s[s.PARK=4]="PARK",s[s.RES_LOW=5]="RES_LOW",s[s.RES_MID=6]="RES_MID",s[s.DOWNTOWN=7]="DOWNTOWN",s[s.HOTEL=8]="HOTEL",s[s.INDUSTRIAL=9]="INDUSTRIAL",s[s.AIRPORT=10]="AIRPORT",s[s.GOLF=11]="GOLF",s[s.ROCK=12]="ROCK",s[s.LOT=13]="LOT",s[s.CONSTRUCTION=14]="CONSTRUCTION",s[s.STADIUM=15]="STADIUM",s[s.MARINA=16]="MARINA",s[s.SANDBAR=17]="SANDBAR",s[s.ROAD=18]="ROAD",s[s.WETLAND_FLAT=19]="WETLAND_FLAT",s))(te||{});const Yh={cx:-1150,cz:-3050,hw:950,hh:300,rot:.04};function p1(s){let t=1/0,e=-1/0,n=1/0,i=-1/0;for(const[a,c]of s.pts)t=Math.min(t,a),e=Math.max(e,a),n=Math.min(n,c),i=Math.max(i,c);const r=(t+e)/2,o=(n+i)/2;return{...s,bx:r,bz:o,br:Math.max(e-t,i-n)/2+s.width+80}}function ss(s,t,e,n,i,r,o,a=0){const c=Math.cos(-o),l=Math.sin(-o),h=s-e,d=t-n,u=h*c-d*l,f=h*l+d*c,p=Math.abs(u)-i+a,x=Math.abs(f)-r+a,g=Math.max(p,0),m=Math.max(x,0);return Math.hypot(g,m)+Math.min(Math.max(p,x),0)-a}function Oe(s,t,e,n,i,r,o,a,c=.18){const l=Math.cos(-o),h=Math.sin(-o),d=s-e,u=t-n,f=d*l-u*h,p=d*h+u*l,x=Math.atan2(p/r,f/i),g=Le(Math.cos(x)*1.7+a*13.1,Math.sin(x)*1.7+a*7.3,4),m=re(Math.cos(x)*4.1+a,Math.sin(x)*4.1-a),y=1+c*g+c*.35*m;return(Math.hypot(f/(i*y),p/(r*y))-1)*Math.min(i,r)*y}function Li(s,t,e,n,i,r){const o=i-e,a=r-n,c=s-e,l=t-n,h=Kt((c*o+l*a)/(o*o+a*a||1),0,1);return Math.hypot(c-o*h,l-a*h)}function kl(s,t,e){let n=1/0;for(let i=0;i<e.length-1;i++)n=Math.min(n,Li(s,t,e[i][0],e[i][1],e[i+1][0],e[i+1][1]));return n}function Hl(s,t,e,n){let i=1/0;for(let r=0;r<e.length-1;r++){const[o,a]=e[r],[c,l]=e[r+1],h=c-o,d=l-a,u=s-o,f=t-a,p=Kt((u*h+f*d)/(h*h+d*d||1),0,1),x=Math.hypot(u-h*p,f-d*p)-ue(n[r],n[r+1],p);i=Math.min(i,x)}return i}const Gs={cx:195,cz:2520,rx:262,rz:380,rot:.05},Ge=[[55,2190],[-5,1790]],$h=42;function jh(s,t){return Oe(s,t,200,2380,100,62,.5,15,.25)}function m1(s){let t=-2500+320*Le(s/3400+3.1,.37,3)+110*Le(s/800+9.2,1.1,3);return t+=520*Math.exp(-(((s+3800)/900)**2)),t+=220*Math.exp(-(((s+2500)/500)**2)),t-=250*Nt(1200,2400,s)*(1-Nt(3200,4200,s)),t}const hi=[[-2100,-3050],[-2900,-2900],[-3700,-2650],[-4600,-2150],[-5500,-1500],[-6500,-700]],g1=[95,80,62,50,40,32];function v1(s){for(let t=0;t<hi.length-1;t++){const[e,n]=hi[t],[i,r]=hi[t+1];if(s>=n&&s<=r)return ue(e,i,(s-n)/(r-n))}return s<hi[0][1]?hi[0][0]:hi[hi.length-1][0]}function x1(s){return-9e3+320*Le(s/2600+1.3,.8,3)}function Zh(){return[{id:"lake-north",cx:-5900,cz:-6600,rx:480,rz:330,rot:.3,seed:61},{id:"lake-west",cx:-7550,cz:550,rx:520,rz:300,rot:-.2,seed:62},{id:"lake-south",cx:-4300,cz:4300,rx:380,rz:260,rot:.5,seed:63}]}function _1(){const s=[],t=Zh();s.push({id:"mainland",bx:-6e3,bz:0,br:2e4,sd:(a,c)=>{let l=a-m1(c);const h=Hl(a,c,hi,g1);l=Math.max(l,-h);for(const d of t)Math.abs(a-d.cx)>d.rx*1.6||Math.abs(c-d.cz)>d.rz*1.8||(l=Math.max(l,-Oe(a,c,d.cx,d.cz,d.rx,d.rz,d.rot,d.seed,.22)));return l},beach:40,height:3.2,seabed:.02,shelf:3.2});const e=[[2750,-8200],[2700,-6800],[2640,-5400],[2600,-4e3],[2520,-2600],[2400,-1500],[2250,-900],[2050,-500]],n=[280,420,460,430,380,330,240,90];s.push({id:"barrier",bx:2500,bz:-4200,br:5200,sd:(a,c)=>{const l=Hl(a,c,e,n),h=60*Le(a/700+1.2,c/700+4.4,3);return l+h},beach:62,height:2.6,seabed:.012,shelf:6}),s.push({id:"garza",bx:190,bz:2450,br:1e3,sd:(a,c)=>{let l=Oe(a,c,Gs.cx,Gs.cz,Gs.rx,Gs.rz,Gs.rot,11,.14);return l=kn(l,Oe(a,c,260,2900,160,150,.1,12,.2),110),l=kn(l,Oe(a,c,-10,2740,115,120,.3,13,.25),100),l=kn(l,Oe(a,c,390,2500,100,150,0,17,.2),110),l=kn(l,Oe(a,c,375,2160,85,115,.2,14,.2),110),l=kn(l,Oe(a,c,130,2240,110,85,-.1,16,.2),100),l=kn(l,Li(a,c,Ge[0][0],Ge[0][1],Ge[1][0],Ge[1][1])-$h,60),l=Math.max(l,-jh(a,c)*2.5+12),l},beach:70,height:2.4,seabed:.01,shelf:3.5,isle:!0}),s.push({id:"isla-b",bx:-1350,bz:2560,br:800,sd:(a,c)=>Oe(a,c,-1350,2560,420,260,.05,21,.2),beach:50,height:2.3,seabed:.012,shelf:3.5,isle:!0}),s.push({id:"southkey",bx:1900,bz:5700,br:3200,sd:(a,c)=>{let l=Oe(a,c,1900,5700,1500,1050,.25,31,.14);return l=kn(l,Oe(a,c,1e3,6400,700,500,-.3,32,.24),300),l=kn(l,Oe(a,c,2900,4900,500,700,.5,33,.18),260),l},beach:80,height:2.8,seabed:.014,shelf:6,rocky:!0,isle:!0}),s.push({id:"tortuga",bx:1180,bz:-830,br:900,sd:(a,c)=>kn(Oe(a,c,1180,-830,520,300,.35,51,.2),Li(a,c,985,-410,1150,-650)-56,60),beach:55,height:2.3,seabed:.012,shelf:3.5,isle:!0});const i=Yh;s.push({id:"port",bx:i.cx,bz:i.cz,br:1300,sd:(a,c)=>ss(a,c,i.cx,i.cz,i.hw,i.hh,i.rot,30),beach:0,height:3,seabed:.06,shelf:6}),s.push({id:"isla-n1",bx:-450,bz:-3900,br:750,sd:(a,c)=>Oe(a,c,-450,-3900,375,200,.1,41,.2),beach:45,height:2.3,seabed:.012,shelf:3.5,isle:!0}),s.push({id:"isla-n2",bx:700,bz:-4e3,br:800,sd:(a,c)=>Oe(a,c,700,-4e3,400,210,-.15,42,.2),beach:45,height:2.3,seabed:.012,shelf:3.5,isle:!0}),s.push({id:"isla-n3",bx:1550,bz:-4100,br:650,sd:(a,c)=>Oe(a,c,1550,-4100,315,170,.2,43,.22),beach:45,height:2.3,seabed:.012,shelf:3.5,isle:!0});for(let a=0;a<5;a++){const c=-3e3+a*330;s.push({id:`finger-${a}`,bx:1870-a*25,bz:c,br:520,sd:(l,h)=>ss(l,h,1870-a*25,c,300,95,.02,40),beach:25,height:2.4,seabed:.05,shelf:3.5})}const r=new Ve("mangrove-islets"),o=[[-1700,-1800,900,600,9],[-1500,1300,800,500,8],[-500,-6200,1800,900,12],[900,-6600,1200,700,8],[700,4300,700,450,6],[-1e3,4600,1100,600,7]];for(const[a,c,l,h,d]of o)for(let u=0;u<d;u++){const f=a+r.gauss()*l*.45,p=c+r.gauss()*h*.45,x=r.range(70,240),g=r.range(60,180),m=r.range(0,Math.PI),y=r.int(100,900);s.push({id:`mang-${a}-${u}`,bx:f,bz:p,br:Math.max(x,g)*1.6+60,sd:(w,v)=>Oe(w,v,f,p,x,g,m,y,.35),beach:0,height:.55,seabed:.004,shelf:1.6,wet:!0})}return s}function y1(){const s=[],t=e=>s.push(e);return t({id:"downtown",zone:7,cx:-2650,cz:-3900,hw:750,hh:620,rot:.02,gridX:130,gridZ:110,density:.92,hMin:40,hMax:260}),t({id:"brickell",zone:6,cx:-2900,cz:-2350,hw:550,hh:420,rot:.02,gridX:120,gridZ:120,density:.85,hMin:25,hMax:120}),t({id:"midtown",zone:6,cx:-3500,cz:-5300,hw:900,hh:700,rot:0,gridX:120,gridZ:140,density:.8,hMin:12,hMax:60}),t({id:"construction-dt",zone:14,cx:-2250,cz:-4250,hw:70,hh:60,rot:.02,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"construction-dt2",zone:14,cx:-3150,cz:-3550,hw:65,hh:55,rot:.02,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"construction-hotel",zone:14,cx:2480,cz:-2450,hw:60,hh:60,rot:-.1,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"stadium-lot",zone:13,cx:-2900,cz:-2e3,hw:330,hh:260,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"bayfront-park",zone:4,cx:-2050,cz:-4300,hw:170,hh:380,rot:.02,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"industrial-river",zone:9,cx:-3300,cz:-3050,hw:700,hh:380,rot:-.1,gridX:170,gridZ:160,density:.6,hMin:6,hMax:16}),t({id:"industrial-port",zone:9,cx:-1150,cz:-3050,hw:950,hh:300,rot:.04,gridX:0,gridZ:0,density:.5,hMin:6,hMax:14}),t({id:"airport",zone:10,cx:-7800,cz:-1400,hw:1100,hh:900,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"airstrip",zone:10,cx:2500,cz:5750,hw:700,hh:130,rot:.55,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"inland-golf",zone:11,cx:-5200,cz:-3950,hw:480,hh:380,rot:.1,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"west-golf",zone:11,cx:-6300,cz:3600,hw:500,hh:400,rot:-.15,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"north-park",zone:4,cx:-4350,cz:-6650,hw:380,hh:300,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"south-park",zone:4,cx:-4950,cz:2150,hw:420,hh:280,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"garza-park",zone:4,cx:365,cz:2160,hw:120,hh:105,rot:.2,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"barrier-golf",zone:11,cx:2680,cz:-5300,hw:420,hh:520,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"southkey-golf",zone:11,cx:1300,cz:6300,hw:550,hh:420,rot:-.3,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"north-res",zone:5,cx:-5600,cz:-5400,hw:2100,hh:1800,rot:0,gridX:95,gridZ:140,density:.75,hMin:4,hMax:11}),t({id:"west-res",zone:5,cx:-5300,cz:-2700,hw:1500,hh:1150,rot:0,gridX:100,gridZ:130,density:.75,hMin:4,hMax:12}),t({id:"mid-res",zone:5,cx:-4900,cz:-900,hw:1400,hh:600,rot:0,gridX:105,gridZ:140,density:.55,hMin:4,hMax:10}),t({id:"south-res",zone:5,cx:-4200,cz:1300,hw:1700,hh:1500,rot:0,gridX:105,gridZ:135,density:.7,hMin:4,hMax:10}),t({id:"far-west-res",zone:5,cx:-7950,cz:-4200,hw:650,hh:3e3,rot:0,gridX:110,gridZ:150,density:.45,hMin:4,hMax:10}),t({id:"west-res-2",zone:5,cx:-7750,cz:900,hw:850,hh:2e3,rot:0,gridX:115,gridZ:150,density:.4,hMin:4,hMax:9}),t({id:"far-south-res",zone:5,cx:-6600,cz:4300,hw:2e3,hh:1400,rot:0,gridX:105,gridZ:140,density:.55,hMin:4,hMax:10}),t({id:"south-shore-res",zone:5,cx:-3900,cz:3900,hw:1400,hh:900,rot:0,gridX:105,gridZ:135,density:.6,hMin:4,hMax:10}),t({id:"far-south-res-2",zone:5,cx:-4800,cz:6500,hw:2e3,hh:1200,rot:0,gridX:110,gridZ:140,density:.5,hMin:4,hMax:9}),t({id:"far-south-res-4",zone:5,cx:-7700,cz:6700,hw:900,hh:1e3,rot:0,gridX:120,gridZ:150,density:.38,hMin:4,hMax:9}),t({id:"south-edge-res",zone:5,cx:-5500,cz:8800,hw:3100,hh:1100,rot:0,gridX:120,gridZ:150,density:.35,hMin:4,hMax:9}),t({id:"north-res-2",zone:5,cx:-4800,cz:-8e3,hw:2400,hh:800,rot:0,gridX:100,gridZ:140,density:.55,hMin:4,hMax:10}),t({id:"far-north-res",zone:5,cx:-7950,cz:-8e3,hw:650,hh:800,rot:0,gridX:120,gridZ:150,density:.4,hMin:4,hMax:9}),t({id:"north-edge-res",zone:5,cx:-5500,cz:-9400,hw:3100,hh:600,rot:0,gridX:120,gridZ:150,density:.35,hMin:4,hMax:9}),t({id:"south-bayfront",zone:6,cx:-3e3,cz:-900,hw:480,hh:650,rot:0,gridX:120,gridZ:130,density:.6,hMin:8,hMax:35}),t({id:"hotel-south",zone:8,cx:2330,cz:-1500,hw:330,hh:1250,rot:-.12,gridX:130,gridZ:110,density:.85,hMin:20,hMax:110}),t({id:"hotel-mid",zone:8,cx:2600,cz:-3800,hw:300,hh:1300,rot:-.03,gridX:130,gridZ:105,density:.85,hMin:25,hMax:130}),t({id:"barrier-res",zone:5,cx:2650,cz:-6900,hw:350,hh:1200,rot:0,gridX:90,gridZ:110,density:.7,hMin:4,hMax:12}),t({id:"finger-res",zone:5,cx:1820,cz:-2340,hw:330,hh:760,rot:.02,gridX:0,gridZ:0,density:.7,hMin:4,hMax:9}),t({id:"garza-res",zone:5,cx:40,cz:2770,hw:200,hh:170,rot:.1,gridX:0,gridZ:0,density:.55,hMin:4,hMax:9,track:[[-10,2600],[-60,2690],[-60,2780],[20,2800],[110,2830],[200,2800]]}),t({id:"tortuga-res",zone:5,cx:1180,cz:-830,hw:420,hh:230,rot:.35,gridX:0,gridZ:0,density:.55,hMin:4,hMax:10,track:[[1156,-656],[1031,-714],[886,-842],[891,-1e3],[1062,-1033],[1225,-952],[1340,-885]]}),t({id:"isla-b-res",zone:5,cx:-1350,cz:2560,hw:330,hh:190,rot:.05,gridX:0,gridZ:0,density:.5,hMin:4,hMax:9,track:[[-1500,2577],[-1480,2680],[-1320,2720],[-1180,2660],[-1140,2547]]}),t({id:"southkey-res",zone:5,cx:2200,cz:5300,hw:700,hh:500,rot:.25,gridX:130,gridZ:150,density:.6,hMin:4,hMax:10}),t({id:"isla-n-res",zone:5,cx:700,cz:-4e3,hw:300,hh:160,rot:-.15,gridX:0,gridZ:0,density:.5,hMin:4,hMax:9,track:[[700,-3990],[640,-4075],[760,-4125],[880,-4085],[1030,-4030]]}),t({id:"isla-n1-res",zone:5,cx:-450,cz:-3900,hw:270,hh:150,rot:.1,gridX:0,gridZ:0,density:.5,hMin:4,hMax:9,track:[[-450,-3880],[-520,-3975],[-400,-4030],[-270,-3985],[-150,-3900]]}),s}function w1(s){const t=new Ve("streets"),e=new Map;for(const n of s){if(n.gridX<=0||n.gridZ<=0)continue;const i=[];for(let o=-n.hw;o<=n.hw+1;o+=n.gridX*t.range(.9,1.15))i.push(Math.min(o,n.hw));const r=[];for(let o=-n.hh;o<=n.hh+1;o+=n.gridZ*t.range(.9,1.15))r.push(Math.min(o,n.hh));e.set(n.id,{xs:i,zs:r})}return e}function M1(s,t){const e=[],n=new Ve("canals"),i=s.find(c=>c.id==="south-res"),r=i&&t.get(i.id);if(i&&r){const c=[...r.xs.map(l=>i.cx+l),-3400];for(let l=3;l<r.zs.length-3;l+=2){const h=i.cz+(r.zs[l]+r.zs[l+1])/2,d=n.range(1100,1900),u=i.cx+i.hw;e.push({id:`canal-s-${l}`,a:[u+320,h],b:[u-d,h],width:24,depth:2.6,culverts:c,culvertHalf:9.5})}}const o=s.find(c=>c.id==="west-res"),a=o&&t.get(o.id);if(o&&a){const c=a.xs.map(l=>o.cx+l);for(let l=1;l<a.zs.length-1;l++){const h=o.cz+(a.zs[l]+a.zs[l+1])/2;if(h<-2650||h>-1650||l%2===0)continue;const d=v1(h),u=n.range(700,1200);d-u>o.cx-o.hw+120&&e.push({id:`canal-w-${l}`,a:[d+90,h],b:[d-u,h],width:20,depth:2.4,culverts:c,culvertHalf:8.5}),l%4===1&&d+500<o.cx+o.hw-150&&e.push({id:`canal-e-${l}`,a:[d-90,h],b:[Math.min(d+n.range(450,700),o.cx+o.hw-150),h],width:18,depth:2.4,culverts:c,culvertHalf:8.5})}}return e}function S1(){const s=[];return s.push({id:"south-hwy-mainland",cls:"highway",width:22,lanes:4,traffic:14,pts:[[-6900,2650],[-6e3,2650],[-4500,2700],[-3400,2700],[-2790,2690]]}),s.push({id:"garza-hwy",cls:"highway",width:22,lanes:4,traffic:14,pts:[[-1650,2590],[-1050,2540],[-990,2537]]}),s.push({id:"garza-hwy-2",cls:"highway",width:22,lanes:4,traffic:14,pts:[[-10,2600],[10,2450],[30,2300],[Ge[0][0],Ge[0][1]],[Ge[1][0],Ge[1][1]]]}),s.push({id:"garza-east",cls:"arterial",width:14,lanes:2,traffic:5,pts:[[30,2300],[150,2265],[280,2235],[355,2185],[385,2160],[400,2195],[370,2220],[335,2205],[355,2185]]}),s.push({id:"garza-marina-rd",cls:"street",width:9,lanes:2,traffic:2,pts:[[355,2185],[395,2125],[420,2075]]}),s.push({id:"tortuga-rd",cls:"highway",width:22,lanes:4,traffic:12,pts:[[980,-400],[1200,-720],[1415,-1015]]}),s.push({id:"dt-bayshore",cls:"arterial",width:16,lanes:4,traffic:10,pts:[[-3400,-5300],[-2900,-5150],[-2560,-4950],[-2420,-4700],[-2330,-4450],[-2260,-4200],[-2200,-3900],[-2100,-3700],[-2150,-3450],[-2200,-3300],[-2380,-3110]]}),s.push({id:"dt-bayshore-s",cls:"arterial",width:16,lanes:4,traffic:10,pts:[[-2470,-2870],[-2450,-2600],[-2550,-2200],[-2680,-1800],[-2760,-1500],[-3350,-1500]]}),s.push({id:"dt-avenue",cls:"arterial",width:16,lanes:4,traffic:9,pts:[[-3400,-9900],[-3400,-7300],[-3400,-6e3],[-3400,-4600],[-3350,-3500],[-3330,-2900]]}),s.push({id:"dt-avenue-s",cls:"arterial",width:16,lanes:4,traffic:9,pts:[[-3290,-2650],[-3350,-1500],[-3400,0],[-3400,1600],[-3400,2700]]}),s.push({id:"north-cw-approach",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-3400,-6e3],[-2900,-6350],[-2545,-6626]]}),s.push({id:"west-arterial",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-6800,-9900],[-6800,-7e3],[-6800,-4e3],[-6800,-300],[-6900,1500],[-6900,2650]]}),s.push({id:"north-arterial",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-9900,-5300],[-8500,-5300],[-6800,-5300],[-4400,-5300],[-3400,-5300]]}),s.push({id:"airport-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[-6800,-2050],[-7300,-2050],[-7800,-2050]]}),s.push({id:"mid-arterial",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-9900,-300],[-8500,-300],[-6800,-300],[-5500,-300],[-4400,-320],[-3400,-300]]}),s.push({id:"south-arterial",cls:"arterial",width:15,lanes:4,traffic:6,pts:[[-9900,1200],[-8500,1200],[-6900,1200],[-5e3,1250],[-3400,1300]]}),s.push({id:"barrier-spine",cls:"arterial",width:16,lanes:4,traffic:10,pts:[[2720,-8e3],[2680,-6600],[2620,-5200],[2600,-4e3],[2520,-2600],[2400,-1500],[2260,-800],[2050,-500]]}),s.push({id:"barrier-spine-loop",cls:"street",width:10,lanes:2,traffic:2,pts:[[2720,-8e3],[2775,-8060],[2760,-8135],[2695,-8145],[2660,-8080],[2720,-8e3]]}),s.push({id:"barrier-beach-rd",cls:"street",width:10,lanes:2,traffic:4,pts:[[2680,-6600],[2900,-6400],[2880,-5200],[2850,-4e3],[2790,-2700],[2650,-1500],[2400,-1500]]}),s.push({id:"southkey-rd",cls:"arterial",width:14,lanes:2,traffic:5,pts:[[1465,4695],[1600,5e3],[1900,5400],[2300,5700],[2700,6100],[2600,6350],[2200,6450],[1700,6250],[1500,5900],[1900,5400]]}),s.push({id:"southkey-rd-2",cls:"street",width:10,lanes:2,traffic:3,pts:[[1500,5900],[1250,6200]]}),s.push({id:"southkey-marina-rd",cls:"street",width:9,lanes:2,traffic:2,pts:[[1600,5e3],[1420,4880],[1260,4780]]}),s.push({id:"isla-n-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[-760,-3880],[-450,-3880],[-150,-3900]]}),s.push({id:"isla-n2-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[380,-3980],[700,-3990],[1030,-4030]]}),s.push({id:"isla-n3-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[1335,-4082],[1550,-4100],[1780,-4120]]}),s.push({id:"port-rd",cls:"arterial",width:14,lanes:2,traffic:5,pts:[[-2050,-3050],[-1600,-3050],[-1150,-3050],[-700,-3060],[-260,-3070]]}),s}function b1(){const s=[];return s.push({id:"garza-bridge",pts:[[Ge[1][0],Ge[1][1]],[330,1250],[700,300],[980,-400]],width:30,deck:8,archHeight:26,archT:.51,archLength:560,lanes:6,traffic:16}),s.push({id:"tortuga-bridge",pts:[[1415,-1015],[1800,-600],[2050,-500]],width:22,deck:7,archHeight:18,archT:.45,archLength:380,lanes:4,traffic:12}),s.push({id:"garza-west",pts:[[-990,2537],[-10,2600]],width:22,deck:6,archHeight:0,archT:.5,archLength:0,lanes:4,traffic:14}),s.push({id:"islab-west",pts:[[-2790,2690],[-2100,2650],[-1650,2590]],width:22,deck:7,archHeight:18,archT:.45,archLength:360,lanes:4,traffic:14}),s.push({id:"north-cw-1",pts:[[-2100,-3700],[-1500,-3780],[-760,-3880]],width:24,deck:8,archHeight:26,archT:.4,archLength:480,lanes:6,traffic:14}),s.push({id:"north-cw-2",pts:[[-150,-3900],[380,-3980]],width:24,deck:8,archHeight:0,archT:.5,archLength:0,lanes:6,traffic:14}),s.push({id:"north-cw-3",pts:[[1030,-4030],[1335,-4082]],width:24,deck:8,archHeight:0,archT:.5,archLength:0,lanes:6,traffic:14}),s.push({id:"north-cw-4",pts:[[1780,-4120],[2200,-4080],[2600,-4e3]],width:24,deck:8,archHeight:20,archT:.5,archLength:380,lanes:6,traffic:14}),s.push({id:"far-north-cw",pts:[[-2545,-6626],[-1e3,-6750],[500,-6800],[1800,-6850],[2650,-6900]],width:18,deck:7,archHeight:16,archT:.55,archLength:360,lanes:4,traffic:7}),s.push({id:"port-bridge",pts:[[-2200,-3300],[-2050,-3050]],width:14,deck:6,archHeight:0,archT:.5,archLength:0,lanes:2,traffic:5}),s.push({id:"bayshore-river",pts:[[-2380,-3110],[-2470,-2870]],width:16,deck:6,archHeight:0,archT:.5,archLength:0,lanes:4,traffic:10}),s.push({id:"avenue-river",pts:[[-3330,-2900],[-3290,-2650]],width:16,deck:6,archHeight:0,archT:.5,archLength:0,lanes:4,traffic:9}),s}function E1(){return[{id:"dt-marina",x:-2150,z:-4150,rot:Math.PI*.5,piers:7,pierLen:110},{id:"garza-marina",x:420,z:2035,rot:0,piers:5,pierLen:90},{id:"barrier-marina",x:2075,z:-1400,rot:-Math.PI*.5,piers:6,pierLen:100},{id:"south-marina",x:-2760,z:2950,rot:Math.PI*.5,piers:4,pierLen:80},{id:"southkey-marina",x:1238,z:4730,rot:.09,piers:4,pierLen:80},{id:"north-marina",x:-2535,z:-5600,rot:Math.PI*.5,piers:5,pierLen:90}]}function T1(){return[{id:"rwy-09",a:[-8800,-1350],b:[-6950,-1350],width:50},{id:"rwy-13",a:[-8500,-2150],b:[-7073,-896],width:42},{id:"strip-southkey",a:[1950,5450],b:[3100,6100],width:24}]}function A1(){return[{id:"ship-channel",pts:[[4200,2200],[3e3,1600],[2e3,600],[1e3,-1200],[200,-2600],[-450,-3350]],width:180,depth:14,boats:3,speed:5},{id:"intracoastal",pts:[[1800,-7600],[1900,-6200],[1950,-4500],[2e3,-3200],[1950,-1800],[1850,-800],[1700,200]],width:110,depth:6,boats:8,speed:9},{id:"garza-channel",pts:[[-1e3,3300],[200,3250],[1e3,3100],[1900,2400],[2600,1400],[3400,400]],width:90,depth:7,boats:9,speed:12},{id:"arch-channel",pts:[[-1200,1200],[-300,1e3],[500,750],[1400,300],[2400,-100]],width:100,depth:8,boats:6,speed:11},{id:"ref-boats",pts:[[-200,3550],[300,3250],[520,2950],[800,2600],[1200,2250]],width:40,depth:4,boats:3,speed:18},{id:"flats-route",pts:[[-2100,3400],[-1200,3500],[-300,3600],[700,3700],[1500,4100]],width:40,depth:3,boats:5,speed:10},{id:"bay-route",pts:[[-1900,-4300],[-1200,-2500],[-600,-600],[0,1200],[500,1900]],width:60,depth:4,boats:7,speed:9},{id:"north-route",pts:[[-1800,-5900],[-800,-5200],[200,-4600],[1200,-4600],[1900,-5200]],width:60,depth:4,boats:5,speed:8},{id:"ocean-route",pts:[[3800,-8e3],[3700,-5e3],[3600,-2e3],[3700,1e3],[3900,4e3],[4100,7e3]],width:300,depth:25,boats:4,speed:6}].map(p1)}function C1(){return[{id:"stadium",kind:"stadium",x:-2900,z:-2450,rot:.15,size:150},{id:"lighthouse",kind:"lighthouse",x:3250,z:5300,rot:0,size:30},{id:"terminal",kind:"terminal",x:-7800,z:-1900,rot:0,size:220},{id:"hangars",kind:"hangars",x:-7400,z:-2250,rot:0,size:120},{id:"cranes-port",kind:"cranes",x:-1150,z:-3330,rot:0,size:1600},{id:"cruise",kind:"cruise",x:-900,z:-2780,rot:0,size:300},{id:"tanks",kind:"tanks",x:-3600,z:-3100,rot:0,size:160},{id:"seaplane-base",kind:"seaplane",x:-2050,z:-4700,rot:Math.PI*.5,size:60},{id:"golf-club",kind:"clubhouse",x:1215,z:6250,rot:-.3,size:30}]}class R1{n=se;height=new Float32Array(se*se);zone=new Uint8Array(se*se);veg=new Uint8Array(se*se);coast=new Float32Array(se*se);exposure=new Uint8Array(se*se);districts=y1();roads=S1();bridges=b1();marinas=E1();runways=T1();channels=A1();pois=C1();landmasses=_1();lakes=Zh();grids=w1(this.districts);canals=M1(this.districts,this.grids);toCell(t,e){return[(t+He)/_s*se,(e+He)/_s*se]}heightAt(t,e){const[n,i]=this.toCell(t,e),r=Kt(Math.floor(n),0,se-2),o=Kt(Math.floor(i),0,se-2),a=Kt(n-r,0,1),c=Kt(i-o,0,1),l=this.height,h=l[o*se+r],d=l[o*se+r+1],u=l[(o+1)*se+r],f=l[(o+1)*se+r+1];return ue(ue(h,d,a),ue(u,f,a),c)}zoneAt(t,e){const[n,i]=this.toCell(t,e),r=Kt(Math.round(n),0,se-1),o=Kt(Math.round(i),0,se-1);return this.zone[o*se+r]}coastAt(t,e){const[n,i]=this.toCell(t,e),r=Kt(Math.round(n),0,se-1),o=Kt(Math.round(i),0,se-1);return this.coast[o*se+r]}vegAt(t,e){const[n,i]=this.toCell(t,e),r=Kt(Math.round(n),0,se-1),o=Kt(Math.round(i),0,se-1);return this.veg[o*se+r]/255}exposureAt(t,e){const[n,i]=this.toCell(t,e),r=Kt(Math.round(n),0,se-1),o=Kt(Math.round(i),0,se-1);return this.exposure[o*se+r]/255}isLand(t,e){return this.heightAt(t,e)>.05}districtAt(t,e){for(const n of this.districts)if(ss(t,e,n.cx,n.cz,n.hw,n.hh,n.rot)<0)return n;return null}regionalDepth(t,e){let n=3+2.6*(.5+.5*Le(t/1100,e/1100,3))+1.2*Le(t/350+4,e/350,2);n-=2.4*Nt(.12,.42,Le(t/650+9,e/650+2,3)),n=Math.max(n,.7);const i=3050+320*Le(e/4e3,.5,2)+110*Le(e/800+3.1,2.2,3),r=t-i;r>0&&(n+=r*.006+5*Nt(200,1500,r)+15*Nt(1500,4500,r)+1.5*Hs(t/600+1,e/260,3)*Nt(0,900,r));const o=Nt(-400,1400,t+300*Le(e/1200,3.3,2))*(1-Nt(.4,1.4,Math.hypot((t-2600)/2600,(e-1900)/2400)));n+=4.5*o;const a=Nt(7200,9400,e+400*Le(t/3e3,1.7,2));n+=18*a;const c=Nt(8300,9800,-e+400*Le(t/3e3,5.1,2));n+=10*c;const l=Hs(t/900+2,e/380+1,3);return n-=1.6*l*o,n}generate(t){const e=se,n=this.landmasses,i=512,r=e/i,o=Pi*r,a=new Float32Array(i*i),c=new Int16Array(i*i),l=new Float32Array(i*i),h=new Float32Array(i*i),d=new Float32Array(i*i),u=new Float32Array(i*i),f=new Float32Array(i*i),p=new Float32Array(i*i);for(let I=0;I<i;I++){const A=-He+(I+.5)*o;for(let U=0;U<i;U++){const F=-He+(U+.5)*o;let D=1/0,N=-1;for(let k=0;k<n.length;k++){const V=n[k];if(Math.hypot(F-V.bx,A-V.bz)-V.br>D)continue;const it=V.sd(F,A);it<D&&(D=it,N=k)}const B=I*i+U;if(a[B]=D,c[B]=N,u[B]=n[N].seabed,f[B]=n[N].shelf,l[B]=this.regionalDepth(F,A),h[B]=Le(F/260,A/260,3),N===0&&D<0){const k=-D,V=2*Le(F/1500+2,A/1500-1,3)+.9*Le(F/420+7,A/420+3,3),J=2.2*Math.exp(-(((k-1500)/1e3)**2));d[B]=Nt(150,1100,k)*(1.6+V+J)}else d[B]=0}t&&!(I&31)&&t(I/i*.3)}{const F=[],D=[];for(let V=0;V<8;V++){const J=V/8*Math.PI*2+.2;F.push(Math.cos(J)),D.push(Math.sin(J))}const N=new Float32Array(8),B=(V,J)=>{const it=Math.floor((V+He)/o),X=Math.floor((J+He)/o);return it<0||X<0||it>=i||X>=i?it<0?-1e3:1e3:a[X*i+it]},k=(V,J,it)=>{const X=Kt(Math.floor((V+He)/o),0,i-1),dt=Kt(Math.floor((J+He)/o),0,i-1)*i+X;return Math.min(l[dt],.05+Math.max(it,0)*u[dt]+(n[c[dt]].beach===0?f[dt]:0))};for(let V=0;V<i;V++){const J=-He+(V+.5)*o;for(let it=0;it<i;it++){const X=V*i+it,tt=a[X];if(tt<-450){p[X]=0;continue}const dt=-He+(it+.5)*o;for(let ut=0;ut<8;ut++){let nt=0,lt=tt>=0;for(let H=1;H<=40;H++){const Pt=dt+F[ut]*H*200,gt=J+D[ut]*H*200,At=B(Pt,gt);if(At<0){if(!lt){if(H*200>600)break;continue}break}lt=!0;const vt=Pt>He||gt>He||gt<-He?25:k(Pt,gt,At);nt+=200*Nt(.5,12,vt)}N[ut]=nt}let K=0,et=0,ot=0;for(let ut=0;ut<8;ut++){const nt=N[ut];nt>K?(ot=et,et=K,K=nt):nt>et?(ot=et,et=nt):nt>ot&&(ot=nt)}const mt=(K+et+ot)/(3*40*200);p[X]=Nt(.04,.8,mt)}}t&&t(.35)}const x=(I,A,U,F,D)=>{const N=D*i+F;return ue(ue(I[N],I[N+1],A),ue(I[N+i],I[N+i+1],A),U)};let g=0,m=0,y=0,w=0;const v=(I,A)=>{const U=Kt(I/r-.5,0,i-1.001),F=Kt(A/r-.5,0,i-1.001),D=Math.floor(U),N=Math.floor(F),B=U-D,k=F-N;g=B,m=k,y=D,w=N;const V=x(a,B,k,D,N),J=N*i+D,it=J+1,X=J+i,tt=X+1;let dt=c[J],K=a[J];return a[it]<K&&(K=a[it],dt=c[it]),a[X]<K&&(K=a[X],dt=c[X]),a[tt]<K&&(K=a[tt],dt=c[tt]),[V,dt]},T=this.channels,M=this.runways,E=this.districts,b=this.lakes,_=this.canals,S=_.map(I=>({minX:Math.min(I.a[0],I.b[0])-I.width,maxX:Math.max(I.a[0],I.b[0])+I.width,z:I.a[1]})),R=this.marinas,O=this.roads.filter(I=>I.cls==="highway"||I.cls==="arterial").map(I=>{let A=1/0,U=-1/0,F=1/0,D=-1/0;for(const[B,k]of I.pts)A=Math.min(A,B),U=Math.max(U,B),F=Math.min(F,k),D=Math.max(D,k);const N=I.width*.5+20;return{pts:I.pts,hw:I.width*.5,minX:A-N,maxX:U+N,minZ:F-N,maxZ:D+N}});for(let I=0;I<e;I++){const A=-He+(I+.5)*Pi,U=x1(A);for(let F=0;F<e;F++){const D=-He+(F+.5)*Pi,N=I*e+F;let[B,k]=v(F+.5,I+.5);const V=n[k],J=x(p,g,m,y,w);if(Math.abs(B)<90&&(V.beach>0||V.wet)){const et=9*re(D/60+3.3,A/60-1.7)+4*re(D/21+8.1,A/21+2.2);B+=et*(V.wet?1.8:1)}this.coast[N]=B,this.exposure[N]=Math.round(255*Kt(J,0,1));const it=x(h,g,m,y,w);let X=0;if(k===0&&B>-160)for(const et of b){if(Math.abs(D-et.cx)>et.rx*1.5+160||Math.abs(A-et.cz)>et.rz*1.6+160)continue;const ot=Oe(D,A,et.cx,et.cz,et.rx,et.rz,et.rot,et.seed,.22);X=Math.max(X,1-Nt(0,140,ot))}let tt,dt,K=0;if(B<0){const et=-B;let ot=null;for(const nt of E)if(ss(D,A,nt.cx,nt.cz,nt.hw,nt.hh,nt.rot)<0){ot=nt;break}const mt=ot!==null&&(ot.zone===7||ot.zone===6||ot.zone===9||ot.zone===13||ot.zone===14||ot.zone===15||ot.zone===16||ot.zone===8&&J<.3);if(V.wet)tt=.15+V.height*Nt(0,60,et)+.15*re(D/30,A/30),dt=3,K=255;else if(V.beach===0)tt=V.height+.2*re(D/40,A/40),dt=9,K=10;else{const nt=.75+.5*(.5+.5*re(D/240+1.7,A/240-4.1)),lt=mt?5:V.beach*(.45+1.4*J)*nt*(X>0?1.6:1),H=Nt(0,lt,et);if(tt=.25+(V.height-.25)*H+.6*it*H+.12*re(D/18,A/18),V.id==="barrier"||V.id==="southkey"){const Pt=Nt(30,70,et)*(1-Nt(90,160,et))*(.4+.6*J);tt+=2.2*Pt*(.6+.4*Hs(D/140,A/140,3))}if(dt=H<.45?2:5,K=H<.45?20:150,X>0&&dt===2&&(dt=4,K=120),et<60&&X===0){if(V.isle&&J<.24){const Pt=re(D/150+4.4,A/150-2.9);if(Pt>.12){const gt=18+22*(.5+.5*Pt);et<gt&&(dt=3,tt=Math.min(tt,.3+.5*Nt(0,gt,et))+.1*re(D/12,A/12),K=255)}}if(dt===2){const Pt=Le(D/210+9,A/210-4,2);(V.rocky?D>2400&&Hs(D/90+5,A/90+5,3)>.62:Pt>.36&&J>.3)&&et<26&&(dt=12,tt=.3+1.1*Nt(0,22,et)+.9*Hs(D/14,A/14,2)*(1-Nt(20,26,et)),K=0)}}if(V.id==="garza"&&A<Ge[0][1]+60&&Li(D,A,Ge[0][0],Ge[0][1],Ge[1][0],Ge[1][1])<$h+40){const Pt=Nt(Ge[0][1]+60,Ge[0][1]-40,A);Pt>.5&&(dt=2,K=15);const gt=ue(.3,.8+.08*re(D/40,A/40),Nt(0,16,et));tt=ue(tt,Math.max(tt,gt),Pt)}}if(k===0){const nt=x(d,g,m,y,w)*(1-X);tt+=nt+.25*re(D/95+2,A/95)*Nt(0,.5,nt);const lt=Nt(U+160,U-160,D);if(lt>0){const H=re(D/70+1,A/70+5),Pt=H<-.32?-.25:.35+.4*(.5+.5*H)+.05*re(D/9,A/9);tt=ue(tt,Pt,lt),lt>.5&&(dt=19);let gt=1/0;for(const At of O)D<At.minX||D>At.maxX||A<At.minZ||A>At.maxZ||(gt=Math.min(gt,kl(D,A,At.pts)-At.hw));gt<16&&(tt=Math.max(tt,ue(1.4+.1*re(D/30,A/30),tt,Nt(3,16,gt))),gt<6&&(K=Math.min(K,30)))}}let ut=!1;if(tt>1.4&&ot!==null){const nt=ot;ut=!0,dt=nt.zone,nt.zone===7?(tt=Math.max(tt,3.6),K=30):nt.zone===11?(tt+=2.5*Le(D/180,A/180,3)+1.5,K=255):nt.zone===4?K=120+Math.floor(100*Nt(-.1,.4,it)):nt.zone===10?(tt=ue(tt,2.8+.05*re(D/50,A/50),Nt(0,-150,ss(D,A,nt.cx,nt.cz,nt.hw,nt.hh,nt.rot))),K=35):nt.zone===13||nt.zone===14||nt.zone===9?K=5:nt.zone===8||nt.zone===6?K=60:nt.track?K=Math.floor((185+70*Nt(-.3,.4,it))*(1-.6*Nt(.22,.5,re(D/95+5,A/95-2)))):K=70+Math.floor(115*Nt(-.25,.45,it))}for(const nt of M){const lt=Li(D,A,nt.a[0],nt.a[1],nt.b[0],nt.b[1]);lt<nt.width*.5+60&&(tt=ue(tt,2.9,Nt(nt.width*.5+60,nt.width*.5+10,lt)))}if(dt===5&&!ut){if(dt=4,K=Math.floor(150+105*Nt(-.35,.3,it)),V.isle){const nt=re(D/95+5,A/95-2);K=Math.floor(Math.min(255,K+45)*(1-.55*Nt(.22,.5,nt))),nt>.44&&tt>1.6&&(dt=2,K=15)}X>0&&(K=Math.min(K,160))}if(dt===19){const nt=Nt(.5,.64,.5+.5*Le(D/240+3,A/240+8,3));K=Math.floor(40+215*nt),tt<0&&(K=0)}for(let nt=0;nt<_.length;nt++){const lt=S[nt];if(Math.abs(A-lt.z)>_[nt].width||D<lt.minX||D>lt.maxX)continue;const H=_[nt],Pt=Li(D,A,H.a[0],H.a[1],H.b[0],H.b[1]);if(Pt>=H.width*.5)continue;let gt=!1;for(const At of H.culverts)if(Math.abs(D-At)<H.culvertHalf){gt=!0;break}gt||(tt=-(.5+(H.depth-.5)*Nt(H.width*.5,H.width*.5-6,Pt)),dt=1,K=0)}}else{const et=x(l,g,m,y,w),ot=x(u,g,m,y,w),mt=x(f,g,m,y,w);let ut;if(V.wet)ut=Math.min(et,.05+B*ot);else if(V.beach===0)ut=Math.min(et,mt+B*ot);else{const lt=.45+.95*J;if(ut=Math.min(et,.05+B*ot*lt),J>.35&&B<320){const H=Math.max(0,Math.sin(B/42+2*re(D/160,A/160)));ut-=.35*H*H*Nt(.35,.7,J)*Nt(20,60,B)*(1-Nt(180,320,B)),ut=Math.max(ut,.12)}}if(Math.abs(D-190)<260&&Math.abs(A-2380)<220){const lt=jh(D,A);lt<0&&(ut=Math.max(ut,.5+1.7*Nt(0,-45,lt)))}for(const lt of T){if(Math.abs(D-lt.bx)>lt.br||Math.abs(A-lt.bz)>lt.br)continue;const H=kl(D,A,lt.pts)-lt.width*.5;H<60&&(ut=Math.max(ut,lt.depth*(1-Nt(-lt.width*.1,60,H))+ut*Nt(-lt.width*.1,60,H)))}for(const lt of R){if(Math.abs(D-lt.x)>420||Math.abs(A-lt.z)>420)continue;const H=Math.sin(lt.rot),Pt=-Math.cos(lt.rot),gt=lt.pierLen*.5+40,At=ss(D,A,lt.x+H*gt,lt.z+Pt*gt,lt.piers*14+40,gt+10,lt.rot);At<40&&(ut=Math.max(ut,2.6*(1-Nt(-5,40,At))))}const nt=Math.max(1-Math.hypot((D+350)/520,(A-3250)/260),1-Math.hypot((D-2500)/700,(A-3300)/300),1-Math.hypot((D-1200)/600,(A-1500)/260));if(nt>0){const lt=Nt(0,.5,nt)*(.55+.45*Le(D/130+7,A/130-3,3));ut=ue(ut,-.15+.5*(1-lt),lt*.9)}for(let lt=0;lt<_.length;lt++){const H=S[lt];if(Math.abs(A-H.z)>_[lt].width||D<H.minX||D>H.maxX)continue;const Pt=_[lt],gt=Li(D,A,Pt.a[0],Pt.a[1],Pt.b[0],Pt.b[1]);gt<Pt.width*.5&&(ut=Math.max(ut,.5+(Pt.depth-.5)*Nt(Pt.width*.5,Pt.width*.5-6,gt)))}ut+=.08*re(D/45,A/45),tt=-ut,dt=tt>-.35?17:ut>9?0:1,tt>0&&(dt=17),K=0}this.height[N]=tt,this.zone[N]=dt,this.veg[N]=Kt(K,0,255)}t&&!(I&63)&&t(.35+I/e*.65)}}}const Sn=`
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
`,lo=`
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
 *  mass; drives vertical development so large cells tower while small ones stay flat). */
vec2 cloudFieldCS(vec2 cs) {
  vec2 p = cs * 0.00015 + uCloudSeed;
  float f = fbm(p) * 0.62 + fbm3(p * 3.1 + 7.7) * 0.38;
  // cellular term breaks the fbm into separate cumulus masses (~2.6 km cells)
  float cells = 1.0 - worley2(cs * (1.0 / 2600.0) + uCloudSeed * 0.37);
  f = f * 0.76 + cells * 0.24;
  float thr = 0.64 - uCloudCoverage * 0.44;
  float cov = smoothstep(thr, thr + 0.2, f);
  float interior = smoothstep(thr + 0.04, thr + 0.3, f);
  return vec2(cov, interior);
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
`,ho=`
vec3 skyRadiance(vec3 dir) {
  float y = clamp(dir.y, -1.0, 1.0);
  float up = max(y, 0.0);
  float horizonMix = pow(1.0 - up, 14.0);
  float midMix = pow(1.0 - up, 3.5) * 0.22;
  vec3 col = mix(uZenithColor, uHorizonColor, clamp(horizonMix + midMix, 0.0, 1.0));
  // bright, slightly warm haze band in the last few degrees above the horizon (sunlit humid air)
  float hband = pow(1.0 - up, 30.0);
  vec3 hazeWhite = mix(uHorizonColor, uSunHazeColor, 0.4) * 1.12;
  col = mix(col, hazeWhite, hband * 0.55 * smoothstep(-0.05, 0.12, uSunDir.y));
  // slight brightening of the sky toward the sun (mie forward scatter), strongest near horizon
  float cosSun = dot(dir, uSunDir);
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
`,Kh=`
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
`;function P1(s=64){const t=s,e=new Uint8Array(t*t*t*4),n=(d,u,f,p)=>{let x=d*374761393+u*668265263+f*2147483647+p*1013904223|0;return x=Math.imul(x^x>>>13,1274126177),((x^x>>>16)>>>0)/4294967296},i=(d,u)=>(d%u+u)%u,r=(d,u,f,p,x)=>{const g=Math.floor(d),m=Math.floor(u),y=Math.floor(f),w=d-g,v=u-m,T=f-y,M=F=>F*F*F*(F*(F*6-15)+10),E=M(w),b=M(v),_=M(T),S=(F,D,N,B,k,V)=>{const it=n(i(F,p),i(D,p),i(N,p),x)*6.2831853,X=n(i(F,p),i(D,p),i(N,p),x+7)*3.1415926,tt=Math.cos(it)*Math.sin(X),dt=Math.sin(it)*Math.sin(X),K=Math.cos(X);return tt*B+dt*k+K*V},R=(F,D,N)=>F+(D-F)*N,O=R(S(g,m,y,w,v,T),S(g+1,m,y,w-1,v,T),E),I=R(S(g,m+1,y,w,v-1,T),S(g+1,m+1,y,w-1,v-1,T),E),A=R(S(g,m,y+1,w,v,T-1),S(g+1,m,y+1,w-1,v,T-1),E),U=R(S(g,m+1,y+1,w,v-1,T-1),S(g+1,m+1,y+1,w-1,v-1,T-1),E);return R(R(O,I,b),R(A,U,b),_)},o=(d,u,f,p,x)=>{const g=Math.floor(d),m=Math.floor(u),y=Math.floor(f);let w=1e9;for(let v=-1;v<=1;v++)for(let T=-1;T<=1;T++)for(let M=-1;M<=1;M++){const E=g+M,b=m+T,_=y+v,S=E+n(i(E,p),i(b,p),i(_,p),x),R=b+n(i(E,p),i(b,p),i(_,p),x+3),O=_+n(i(E,p),i(b,p),i(_,p),x+5),I=(S-d)**2+(R-u)**2+(O-f)**2;I<w&&(w=I)}return 1-Math.min(1,Math.sqrt(w))},a=(d,u,f,p,x)=>p+(d-u)/(f-u)*(x-p),c=d=>Math.min(1,Math.max(0,d));let l=0;for(let d=0;d<t;d++)for(let u=0;u<t;u++)for(let f=0;f<t;f++){const p=f/t,x=u/t,g=d/t;let m=0,y=.5,w=0;for(let I=0;I<3;I++){const A=4<<I;m+=y*r(p*A,x*A,g*A,A,11+I),w+=y,y*=.5}m=m/w*.5+.5;const v=o(p*4,x*4,g*4,4,31),T=o(p*8,x*8,g*8,8,41),M=o(p*16,x*16,g*16,16,51),E=v*.625+T*.25+M*.125,b=a(m,0,1,E,1),_=o(p*4,x*4,g*4,4,61),S=o(p*8,x*8,g*8,8,71),R=_*.65+S*.35,O=(r(p*8,x*8,g*8,8,81)*.65+r(p*16,x*16,g*16,16,91)*.35)*.5+.5;e[l++]=Math.round(c(b)*255),e[l++]=Math.round(c(R)*255),e[l++]=Math.round(c(O)*255),e[l++]=Math.round(c(m)*255)}const h=new Rh(e,t,t,t);return h.format=je,h.type=vn,h.minFilter=ve,h.magFilter=ve,h.wrapS=h.wrapT=h.wrapR=ps,h.unpackAlignment=1,h.needsUpdate=!0,h}const Gl=1024,Vl=76e3,L1=3e4,D1=7e3,I1=`
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
`,z1=`
${hr}
${Sn}
${lo}
uniform vec2 uCovCenter;
uniform float uCovExtent;
in vec2 vUv;
void main() {
  vec2 cs = uCovCenter + (vUv - 0.5) * uCovExtent;
  vec2 f = cloudFieldCS(cs);
  vec2 p = cs * 0.00015 + uCloudSeed;
  // slow field: which masses develop vertically (0 flat .. 1 towering)
  float tower = clamp((fbm3(p * 0.7 + 3.1) - 0.22) / 0.46, 0.0, 1.0);
  // slight variation of the base altitude between cells
  float baseVar = clamp((fbm3(p * 2.2 + 5.5) - 0.2) / 0.5, 0.0, 1.0);
  gl_FragColor = vec4(f.x, mix(f.y, tower, 0.5), baseVar, f.y);
}
`,U1=`
precision highp sampler3D;
${hr}
${Sn}
${lo}
${ho}
${Kh}
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

/** Macro field at a world xz position: x coverage, y vertical development, z base variation, w interior. */
vec4 macroField(vec2 wp) {
  vec2 uv = (wp + uCloudWind - uCovCenter) / uCovExtent + 0.5;
  return texture(uCovTex, uv);
}

/** Vertical envelope of the layer (before noise): flat base at a common altitude, column height driven by
 *  the macro field. Returns coverage * vertical profile; hf = height fraction in the slab, hn = fraction of
 *  this column's own height, H = column height fraction. */
float envelope(vec3 p, vec4 f, out float hf, out float hn, out float H) {
  float thick = uCloudTop - uCloudBase;
  float base = uCloudBase + (f.z - 0.5) * 0.06 * thick;
  hf = (p.y - base) / thick;
  H = mix(0.22, 1.0, smoothstep(0.05, 0.75, f.y));
  hn = hf / H;
  float v = smoothstep(0.0, 0.05, hf) * (1.0 - smoothstep(0.55, 1.0, hn));
  return f.x * v;
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

/** Full density with detail erosion of the edges. */
float densityFull(vec3 p, float e, float hn) {
  vec3 q = noiseCoord(p);
  vec4 n = texture(uNoise3D, q);
  float d = shapeDensity(e, hn, n);
  if (d <= 0.0) return 0.0;
  // low-frequency worley erosion, billowy at the base and wispier toward the top
  float det = texture(uNoise3D, q * 3.0 + vec3(0.37, 0.11, 0.73)).g;
  float wisp = texture(uNoise3D, q * 5.0 + vec3(0.61, 0.29, 0.17)).b;
  float er = mix(det, wisp, smoothstep(0.35, 0.95, hn));
  // remap (rather than subtract) so eroded edges keep a steep density gradient: crisp cauliflower lobes
  float k = 0.38 * (1.0 - er);
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
float beer(float od) { return 0.48 * exp(-od) + 0.3 * exp(-0.25 * od) + 0.22 * exp(-0.06 * od); }
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
  vec3 lightCol = uSunColor * 2.7 * mix(1.0, 0.5, nightMix);

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
    vec3 skyAmb = mix(uHorizonColor, uZenithColor, 0.4) * 0.9;
    vec3 gndAmb = uHazeColor * 0.55;
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
      float dens = densityFull(p, e, hn);
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
      // (thin cells of an overcast deck stay bright underneath, thick cells go dark)
      float above = max(H - hf, 0.0) * (uCloudTop - uCloudBase) * e;
      float ao = mix(0.16, 1.0, exp(-above * 0.0015));
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
    // distant clouds sink into the horizon haze (long low-angle paths through humid air)
    float fade = exp(-meanDist * 1.5e-5) * (1.0 - smoothstep(0.62 * uMaxDist, uMaxDist, meanDist));
    alpha *= fade;
    col = c * alpha;
  } else {
    alpha = 0.0;
    col = vec3(0.0);
  }
  gl_FragColor = vec4(col, 1.0 - alpha);
}
`,Wl=`
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,N1=`
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = vec4(p.xy, p.w * 0.999999, p.w);
}
`,F1=`
${hr}
${Sn}
${ho}
${I1}
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
`,O1=`
out vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`,B1=`
${hr}
${Sn}
${lo}
${ho}
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
`;class k1{constructor(t,e,n){this.atmos=t,this.noise=P1(64),this.scale=n.scale,this.covRT=new an(Gl,Gl,{type:vn,format:je,depthBuffer:!1,generateMipmaps:!1,minFilter:ve,magFilter:ve,wrapS:wn,wrapT:wn}),this.covMat=new De({vertexShader:Wl,fragmentShader:z1,uniforms:{...t.uniforms,uCovCenter:{value:this.covCenter},uCovExtent:{value:Vl}},depthTest:!1,depthWrite:!1}),this.cloudMat=new De({vertexShader:Wl,fragmentShader:U1,uniforms:{...t.uniforms,uNoise3D:{value:this.noise},uCovTex:{value:this.covRT.texture},uCovCenter:{value:this.covCenter},uCovExtent:{value:Vl},uCamPos:{value:new P},uInvProj:{value:new Yt},uInvView:{value:new Yt},uCloudSteps:{value:n.cloudSteps},uMaxDist:{value:L1}},depthTest:!1,depthWrite:!1}),this.quad=new de(new Jn(2,2),this.cloudMat),this.quad.frustumCulled=!1,this.quadScene.add(this.quad),this.cloudRT=new an(4,4,{type:Cn,depthBuffer:!1,minFilter:ve,magFilter:ve}),this.domeMat=new De({vertexShader:N1,fragmentShader:F1,uniforms:{...t.uniforms,uCloudTex:{value:this.cloudRT.texture},uCloudTexel:{value:new Ut(.25,.25)},uResolution:{value:new Ut(1,1)},uInvProj:{value:new Yt},uInvView:{value:new Yt}},side:Ze,depthWrite:!1,depthTest:!0}),this.dome=new de(new jn(1,24,12),this.domeMat),this.dome.frustumCulled=!1,this.dome.renderOrder=-1e3,this.dome.isSky=!0,this.envMat=new De({vertexShader:O1,fragmentShader:B1,uniforms:{...t.uniforms},side:Ze,depthWrite:!1});const i=new de(new jn(50,32,16),this.envMat);this.envScene.add(i),this.pmrem=new Xa(e),this.pmrem.compileEquirectangularShader()}dome;cloudMat;covMat;domeMat;quad;quadScene=new rr;quadCam=new cr(-1,1,1,-1,0,1);cloudRT;covRT;covBaked=!1;covCenter=new Ut;scale;envScene=new rr;envMat;pmrem=null;envRT=null;envMap=null;noise;setCloudSteps(t){this.cloudMat.uniforms.uCloudSteps.value=t}updateEnvironment(){return this.envRT&&this.envRT.dispose(),this.envRT=this.pmrem.fromScene(this.envScene,0,.1,200),this.envMap=this.envRT.texture,this.envMap}updateCoverage(t,e){const n=this.atmos.uniforms.uCloudWind.value,i=e.position.x+n.x,r=e.position.z+n.y;if(this.covBaked&&Math.hypot(i-this.covCenter.x,r-this.covCenter.y)<D1)return;this.covCenter.set(i,r),this.covBaked=!0,this.quad.material=this.covMat;const o=t.getRenderTarget();t.setRenderTarget(this.covRT),t.render(this.quadScene,this.quadCam),t.setRenderTarget(o),this.quad.material=this.cloudMat}render(t,e,n,i){const r=Math.max(2,Math.round(n*this.scale)),o=Math.max(2,Math.round(i*this.scale));(this.cloudRT.width!==r||this.cloudRT.height!==o)&&this.cloudRT.setSize(r,o),this.updateCoverage(t,e);const a=this.cloudMat.uniforms;a.uCamPos.value.copy(e.position),a.uInvProj.value.copy(e.projectionMatrixInverse),a.uInvView.value.copy(e.matrixWorld);const c=this.domeMat.uniforms;c.uResolution.value.set(n,i),c.uCloudTexel.value.set(1/r,1/o),c.uInvProj.value.copy(e.projectionMatrixInverse),c.uInvView.value.copy(e.matrixWorld);const l=t.getRenderTarget();t.setRenderTarget(this.cloudRT),t.render(this.quadScene,this.quadCam),t.setRenderTarget(l),this.dome.position.copy(e.position),this.dome.scale.setScalar(e.far*.9)}}class H1{height;zone;constructor(t,e){if(e.capabilities.isWebGL2&&e.extensions.has("OES_texture_float_linear"))this.height=new Ii(t.height,se,se,ir,gn);else{const r=new Uint16Array(t.height.length);for(let o=0;o<r.length;o++)r[o]=zd.toHalfFloat(t.height[o]);this.height=new Ii(r,se,se,ir,Cn)}this.height.minFilter=ve,this.height.magFilter=ve,this.height.wrapS=this.height.wrapT=wn,this.height.generateMipmaps=!1,this.height.needsUpdate=!0;const i=new Uint8Array(se*se*4);for(let r=0;r<se*se;r++){i[r*4]=t.zone[r],i[r*4+1]=t.veg[r];const o=t.coast[r];i[r*4+2]=Math.max(0,Math.min(255,Math.round(128+o*.5))),i[r*4+3]=t.exposure[r]}this.zone=new Ii(i,se,se,je,vn),this.zone.minFilter=sn,this.zone.magFilter=sn,this.zone.wrapS=this.zone.wrapT=wn,this.zone.generateMipmaps=!1,this.zone.needsUpdate=!0}}const G1=96,Jh=8,Qh=7;function V1(s,t){const e=Jh*2**s,n=G1,i=n*e/2,r=n/4,o=3*n/4,a=[],c=[],l=[],h=new Int32Array((n+1)*(n+1)).fill(-1);let d=0;for(let f=0;f<=n;f++)for(let p=0;p<=n;p++){if(t&&p>r&&p<o&&f>r&&f<o)continue;h[f*(n+1)+p]=d++,a.push(-i+p*e,0,-i+f*e);let g=0,m=0;(p===0||p===n||f===0||f===n)&&s<Qh-1&&((p===0||p===n)&&(f&1)===1?m=e:(f===0||f===n)&&(p&1)===1&&(g=e)),c.push(g,m)}for(let f=0;f<n;f++)for(let p=0;p<n;p++){const x=h[f*(n+1)+p],g=h[f*(n+1)+p+1],m=h[(f+1)*(n+1)+p],y=h[(f+1)*(n+1)+p+1];x<0||g<0||m<0||y<0||(p+f&1?l.push(x,y,g,x,m,y):l.push(x,m,g,g,m,y))}const u=new oe;return u.setAttribute("position",new bt(a,3)),u.setAttribute("aEdge",new bt(c,2)),u.setIndex(l),u.computeBoundingSphere(),u.boundingSphere=new Ce(new P(0,0,0),i*1.5+200),u}const W1=`
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
`,X1=`
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
`,q1=`
uniform sampler2D uZoneTex;
uniform sampler2D uHeightTex;
uniform float uWorldSize;
uniform float uMapN;
varying vec3 vWorldPos;
varying float vHeight;
${Sn}
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
    vec3 wet = vec3(0.40, 0.33, 0.23);
    // swash zone widens with wave exposure; a darker saturated band sits right at the waterline
    float swash = 0.35 + 0.45 * expo;
    float wetness = 1.0 - smoothstep(0.18, swash + 0.35, h);
    c = mix(dry, wet, wetness) * (0.92 + 0.16 * n2) * (0.95 + 0.1 * n1);
    c = mix(c, vec3(0.28, 0.25, 0.20), (1.0 - smoothstep(0.05, 0.3, h)) * 0.6);
    // tide marks: thin wrack lines that wander along the beach
    float tide1 = 1.0 - smoothstep(0.0, 0.045, abs(h - (swash + 0.12 + 0.06 * n2)));
    float tide2 = 1.0 - smoothstep(0.0, 0.03, abs(h - (swash + 0.28 + 0.05 * n1)));
    c *= 1.0 - 0.18 * tide1 * (0.5 + 0.5 * n1) - 0.1 * tide2;
    // sea oats and dune scrub clumps on the upper beach
    float dune = smoothstep(1.15, 1.7, h) * smoothstep(0.52, 0.7, vnoise(wp * 0.22 + 4.0));
    c = mix(c, vec3(0.34, 0.36, 0.17) * (0.85 + 0.3 * n1), dune * 0.7);
    rough = mix(0.95, 0.72, wetness);
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
`,Y1=`
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
`;class $1{constructor(t){this.textures=t;const e=new le({color:16777215,roughness:.9,metalness:0}),n={uHeightTex:{value:t.height},uZoneTex:{value:t.zone},uRingOffset:this.offsetUniform,uWorldSize:{value:_s},uMapN:{value:se}},i=e.onBeforeCompile;e.onBeforeCompile=(r,o)=>{i?.(r,o),Object.assign(r.uniforms,n),r.vertexShader=r.vertexShader.replace("#include <common>",`#include <common>
${W1}`).replace("#include <beginnormal_vertex>",`${X1}
vec3 objectNormal = tnormal;
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif`).replace("#include <begin_vertex>","vec3 transformed = wp;"),r.fragmentShader=r.fragmentShader.replace("#include <common>",`#include <common>
${q1}`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
${Y1}`)},e.customProgramCacheKey=()=>"terrain-v3",this.material=e;for(let r=0;r<Qh;r++){const o=V1(r,r>0),a=new de(o,e);a.frustumCulled=!1,a.receiveShadow=!0,a.castShadow=!1,a.matrixAutoUpdate=!1,this.rings.push(a),this.group.add(a)}}group=new Re;material;rings=[];offsetUniform={value:new P};update(t,e){const n=Jh*2,i=Math.round(t/n)*n,r=Math.round(e/n)*n;this.offsetUniform.value.set(i,0,r)}}const j1=`
uniform vec3 uWaterOffset;
varying vec3 vWorldPos;
`,Z1=`
vec3 wp = position + uWaterOffset;
wp.y = 0.0;
vWorldPos = wp;
`,K1=`
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
${Sn}
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
// Sun glitter: Cox-Munk style anisotropic slope distribution of the unresolved waves around the
// resolved normal, elongated along the view azimuth so the highlight forms a streak toward the sun.
float sunGlitter(vec3 N, vec3 V, vec3 L, float mss) {
  float NdotL = dot(N, L);
  float NdotV = dot(N, V);
  if (NdotL <= 0.002 || NdotV <= 0.002) return 0.0;
  vec3 H = normalize(L + V);
  float NdotH = max(dot(N, H), 1e-3);
  vec2 sh = -H.xz / max(H.y, 0.05) + N.xz / max(N.y, 0.05);
  vec2 va = V.xz;
  float vl = length(va);
  va = vl > 1e-4 ? va / vl : vec2(1.0, 0.0);
  float st = 1.0 + 0.8 * (1.0 - clamp(V.y, 0.0, 1.0));
  float along = dot(sh, va), across = dot(sh, vec2(-va.y, va.x));
  float P = exp(-(along * along / (mss * st) + across * across * st / mss)) / (PI * mss);
  float D = P / (NdotH * NdotH * NdotH * NdotH);
  float alpha = sqrt(mss);
  float G = smithBeckmann(NdotV, alpha) * smithBeckmann(NdotL, alpha);
  float LdotH = clamp(dot(L, H), 0.0, 1.0);
  float F = 0.02 + 0.98 * pow(1.0 - LdotH, 5.0);
  return D * F * G / (4.0 * NdotV);
}
`,J1=`
vec3 wN; vec3 wV; float wFoam; float wMss; vec3 wBodyR;
{
  vec2 wp = vWorldPos.xz;
  float foot = length(fwidth(wp)); // metres of water per pixel
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
  float chopF = mix(0.22, 1.0, open) * smoothstep(0.0, 1.2, depth);
  float s4 = 1.0 - smoothstep(-4.0, 0.5, terrainHeightW(wp + wd * 1100.0));
  float s5 = 1.0 - smoothstep(-4.0, 0.5, terrainHeightW(wp + wd * 2400.0));
  float swellF = min(open, min(s4, s5)) * smoothstep(4.0, 9.0, depth);

  // ---- wave field: every layer fades out when its wavelength approaches the pixel footprint; the
  //      slope variance that is filtered away goes into the microfacet roughness instead
  vec2 g = vec2(0.0);
  float mss = 0.0;
  float val0 = 0.5, valDummy;
  float wSw = 1.0 - smoothstep(4.0, 22.0, foot);
  if (swellF > 0.001 && wSw > 0.001) {
    vec2 gs = swellSlope(wp, rot2(wd, -0.22), 76.0, 0.55, t, 0.0)
            + swellSlope(wp, rot2(wd, 0.10), 54.0, 0.40, t, 2.1)
            + swellSlope(wp, rot2(wd, 0.36), 41.0, 0.27, t, 4.4);
    g += gs * swellF * wSw;
  }
  mss += 0.0035 * swellF * (1.0 - wSw * wSw);
  float w0 = 1.0 - smoothstep(1.4, 6.0, foot);
  float a0 = 0.03 * wind * chopF;
  if (w0 > 0.001) g += chopSlope(wp, rot2(wd, 0.15), 14.0, 2.0, 4.5, t, 1.3, a0, val0) * w0;
  mss += a0 * a0 * (1.0 - w0 * w0);
  // wind sea: short-crested directional waves whose height follows the wave groups of the layer above
  float wWs = 1.0 - smoothstep(1.0, 5.0, foot);
  if (wWs > 0.001 && chopF > 0.001) {
    float grp = (0.55 + 0.9 * val0) * chopF * wind;
    vec2 gw = swellSlope(wp, rot2(wd, -0.30), 11.0, 0.050, t, 1.0)
            + swellSlope(wp, rot2(wd, 0.18), 7.5, 0.045, t, 3.3)
            + swellSlope(wp, rot2(wd, 0.02), 5.5, 0.028, t, 5.9);
    g += gw * grp * wWs;
  }
  mss += 0.0015 * chopF * wind * (1.0 - wWs * wWs);
  float w1 = 1.0 - smoothstep(0.5, 2.2, foot);
  float a1 = 0.07 * wind * chopF;
  if (w1 > 0.001) g += chopSlope(wp, rot2(wd, -0.2), 5.0, 1.8, 2.7, t, 3.7, a1, valDummy) * w1;
  mss += a1 * a1 * (1.0 - w1 * w1);
  float w2 = 1.0 - smoothstep(0.17, 0.75, foot);
  float a2 = 0.08 * wind * chopF;
  if (w2 > 0.001) g += chopSlope(wp, rot2(wd, 0.3), 1.7, 1.4, 1.6, t, 7.1, a2, valDummy) * w2;
  mss += a2 * a2 * (1.0 - w2 * w2);
  float w3 = 1.0 - smoothstep(0.05, 0.22, foot);
  float a3 = 0.07 * wind * mix(0.4, 1.0, open) * smoothstep(0.0, 0.4, depth);
  if (w3 > 0.001) g += chopSlope(wp, rot2(wd, -0.05), 0.5, 1.2, 0.9, t, 11.3, a3, valDummy) * w3;
  mss += a3 * a3 * (1.0 - w3 * w3);
  // capillary ripples are never resolved
  mss += 0.0025 + 0.004 * wind * mix(0.3, 1.0, open);

  // ---- wakes: r = foam, gb = normal perturbation, a = coverage
  // the wake map is rendered top-down with screen-up = north (-Z), so v grows toward -Z
  vec2 wuv = vec2(wp.x - uWakeRegion.x, uWakeRegion.y - wp.y) / uWakeRegion.z + 0.5;
  vec4 wake = vec4(0.0);
  if (all(greaterThan(wuv, vec2(0.0))) && all(lessThan(wuv, vec2(1.0)))) wake = texture2D(uWakeTex, wuv);
  g += (wake.gb - 0.5) * 2.0 * wake.a * 0.4;
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));

  // ---- body colour: bed albedo seen through the water column plus in-water scattering
  float cosV = clamp(dot(N, V), 0.0, 1.0);
  float sin2r = (1.0 - cosV * cosV) / 1.77;
  float cosR = sqrt(max(1.0 - sin2r, 0.0));
  float path = depth * (1.0 + 1.0 / max(cosR, 0.2));
  // coastal water: dissolved organics absorb blue almost as strongly as green, hence the teal cast
  vec3 K = vec3(0.36, 0.11, 0.10);
  vec3 T = exp(-K * path);
  vec3 refr = refract(-V, N, 0.75);
  vec2 bedP = wp + refr.xz / max(-refr.y, 0.25) * depth;
  float grainFade = 1.0 - smoothstep(3.0, 10.0, foot);
  float grain = mix(0.5, fbm2o(bedP * 0.045), grainFade);
  // bed albedo is physical (neutral sun+sky irradiance since the lighting rebalance): coral sand
  vec3 sand = vec3(0.56, 0.51, 0.41) * (0.88 + 0.24 * grain);
  float sgN = fbm3(bedP * 0.012 + 3.0);
  float sg = smoothstep(0.54, 0.68, sgN + 0.12 * (grain - 0.5)) * smoothstep(0.5, 1.6, depth) * (1.0 - smoothstep(5.0, 9.0, depth));
  vec3 bed = mix(sand, vec3(0.07, 0.11, 0.05), sg);
  // wet sand at the waterline (mirrors the terrain's wet band above it)
  bed *= mix(0.72, 1.0, smoothstep(0.0, 0.45, depth));
  // deep-water reflectance under neutral irradiance: turbid teal bay water; clearer, bluer ocean beyond
  // the shelf (irradiance-reflectance of coastal water is a few percent, peaking in the green/cyan)
  vec3 Rinf = mix(vec3(0.015, 0.046, 0.070), vec3(0.006, 0.026, 0.062), smoothstep(8.0, 22.0, depth));
  vec3 R = bed * T + Rinf * (1.0 - T);
  // suspended sediment: milky, pale turquoise over the flats and along the shore
  float milkN = fbm2o(wp * 0.004 + 9.0);
  float milk = (1.0 - smoothstep(0.3, 2.5, depth)) * (0.35 + 0.65 * smoothstep(0.35, 0.8, milkN));
  R += vec3(0.045, 0.062, 0.078) * milk * (1.0 - exp(-path * 0.9));

  // ---- foam: shore wash driven by exposure to the incoming waves, surf lines, whitecaps, wakes
  float foam = 0.0;
  if (depth < 4.0) {
    // only a real coastline makes wash and surf; submerged sandbars and flats stay foam-free
    float coastD = (texture2D(uZoneTex, (wp + vec2(uWorldSize * 0.5)) / uWorldSize).b * 255.0 - 128.0) * 2.0;
    float coastGate = 1.0 - smoothstep(150.0, 230.0, coastD);
    float e = 12.0;
    float hx = terrainHeightW(wp + vec2(e, 0.0)) - terrainHeightW(wp - vec2(e, 0.0));
    float hz = terrainHeightW(wp + vec2(0.0, e)) - terrainHeightW(wp - vec2(0.0, e));
    vec2 gd = vec2(-hx, -hz) / (2.0 * e); // gradient of depth: points offshore
    float slope = length(gd);
    vec2 off = gd / max(slope, 1e-4);
    vec2 alongShore = vec2(-off.y, off.x);
    float shoreDist = min(depth / max(slope, 0.003), 300.0); // metres to the waterline along the bed
    float exposure = (0.5 + 0.5 * dot(off, wd)) * mix(0.4, 1.0, open);
    float fineFade = 1.0 - smoothstep(2.0, 6.0, foot);
    float pa = vnoise(wp * 0.03 + vec2(t * 0.03, -t * 0.02));
    float patches = mix(pa, 0.5 * (pa + vnoise(wp * 0.09 + 7.0 - t * 0.05)), fineFade);
    float streaks = mix(0.5, vnoise(vec2(dot(wp, off) * 0.45 - t * 0.35, dot(wp, alongShore) * 0.05 + 3.0)), 1.0 - smoothstep(0.5, 2.0, foot));
    // swash: a few metres of broken wash at the waterline, wider and denser on exposed beaches
    float swashW = 4.0 + 10.0 * exposure + 3.0 * sin(t * 0.9 + dot(wp, alongShore) * 0.02 + patches * 4.0);
    float wash = 1.0 - smoothstep(swashW * 0.3, swashW, shoreDist);
    float thr = 0.74 - 0.30 * exposure;
    float shore = wash * coastGate * smoothstep(thr, thr + 0.2, 0.55 * patches + 0.45 * streaks);
    // surf: wind waves break in knee-deep water on exposed shores as broken lines running shoreward
    float crest = sin(shoreDist * 0.3 - t * 1.2 + patches * 5.0);
    float surf = smoothstep(0.55, 1.0, crest) * smoothstep(0.55, 0.9, exposure) * smoothstep(0.45, 0.7, patches) * coastGate
               * smoothstep(0.3, 0.5, depth) * (1.0 - smoothstep(0.8, 1.3, depth)) * smoothstep(2.5, 6.0, uWindSpeed);
    foam = shore + surf * 0.5;
    // silt stirred up over very gentle muddy bottoms (mangrove shores)
    float mud = (1.0 - smoothstep(0.004, 0.012, slope)) * (1.0 - smoothstep(0.3, 2.0, depth)) * coastGate;
    R = mix(R, vec3(0.055, 0.062, 0.070), mud * 0.4 * (1.0 - exp(-path)));
  }
  float whitecap = smoothstep(0.74, 0.86, val0) * smoothstep(7.0, 14.0, uWindSpeed) * smoothstep(2.0, 6.0, depth) * open * w0;
  foam = clamp(foam + wake.r * 1.2 + whitecap, 0.0, 1.0);

  wN = N; wV = V; wFoam = foam; wMss = mss;
  wBodyR = R;
  normal = normalize((viewMatrix * vec4(N, 0.0)).xyz);
  nonPerturbedNormal = normal;
  // the lighting pipeline is used to gather shadowed irradiance (diffuse = 1) which we scale ourselves
  diffuseColor.rgb = vec3(1.0);
  roughnessFactor = clamp(pow(mss, 0.25), 0.05, 1.0);
  metalnessFactor = 0.0;
}
`,Q1=`
#if defined( RE_IndirectDiffuse ) && defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
  iblIrradiance += getIBLIrradiance( geometryNormal );
#endif
`,tv=`
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
  vec3 sky;
  #if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
    sky = textureCubeUV(envMap, Rdir, rSky).rgb;
  #else
    sky = vec3(0.45, 0.6, 0.8);
  #endif
  float cosV = clamp(dot(wN, wV), 0.0, 1.0);
  float Fg = 1.0 - 0.5 * rSky * rSky; // rougher water reflects less of the horizon
  float F = 0.02 + (Fg - 0.02) * pow(1.0 - cosV, 5.0);
  vec3 body = wBodyR * Ediff;
  // the CSM sun now carries physical irradiance (x6); the glitter BRDF was tuned for the old scale
  vec3 glitter = sunCol * 0.25 * shadow * sunGlitter(wN, wV, uSunDirW, wMss);
  vec3 col = mix(body, sky, F) + glitter * (1.0 - wFoam);
  vec3 foamCol = vec3(0.86, 0.88, 0.88) * Ediff;
  col = mix(col, foamCol, wFoam);
  outgoingLight = col;
}
gl_FragColor = vec4( outgoingLight, 1.0 );
`;class ev{mesh;material;offset={value:new P};uniforms;constructor(t,e){const n=new le({color:16777215,roughness:.3,metalness:0});this.uniforms={uHeightTex:{value:t.height},uZoneTex:{value:t.zone},uWakeTex:{value:e},uWakeRegion:{value:new be(0,0,3e3,0)},uWaterOffset:this.offset,uWorldSize:{value:_s},uWaveTime:{value:0},uWindSpeed:{value:6},uWindDir:{value:new Ut(.94,.34)},uSunDirW:{value:new P(0,1,0)}};const i=this.uniforms,r=n.onBeforeCompile;n.onBeforeCompile=(c,l)=>{r?.(c,l),Object.assign(c.uniforms,i),c.vertexShader=c.vertexShader.replace("#include <common>",`#include <common>
${j1}`).replace("#include <begin_vertex>",`${Z1}
vec3 transformed = wp;`),c.fragmentShader=c.fragmentShader.replace("#include <common>",`#include <common>
${K1}`).replace("#include <normal_fragment_begin>",`#include <normal_fragment_begin>
${J1}`).replace("#include <lights_fragment_maps>",Q1).replace("#include <opaque_fragment>",tv)},n.customProgramCacheKey=()=>"water-v2",this.material=n;const o=13e4,a=new Jn(o,o,64,64);a.rotateX(-Math.PI/2),this.mesh=new de(a,n),this.mesh.frustumCulled=!1,this.mesh.receiveShadow=!0,this.mesh.matrixAutoUpdate=!1,this.mesh.renderOrder=5}update(t,e,n,i,r,o,a,c){this.offset.value.set(Math.round(t/50)*50,0,Math.round(e/50)*50),this.uniforms.uWaveTime.value=n,this.uniforms.uWindSpeed.value=i,this.uniforms.uWindDir.value.copy(r),this.uniforms.uSunDirW.value.copy(o),this.uniforms.uWakeRegion.value.set(a.x,a.y,c,0)}}class nv{rt;scene=new rr;camera;center=new Ut;size;constructor(t=1024,e=3200){this.size=e,this.rt=new an(t,t,{type:vn,depthBuffer:!1,minFilter:ve,magFilter:ve}),this.rt.texture.wrapS=this.rt.texture.wrapT=wn,this.camera=new cr(-e/2,e/2,e/2,-e/2,1,400),this.camera.up.set(0,0,-1)}get texture(){return this.rt.texture}render(t,e,n){this.center.set(Math.round(e/8)*8,Math.round(n/8)*8),this.camera.position.set(this.center.x,200,this.center.y),this.camera.lookAt(this.center.x,0,this.center.y),this.camera.updateMatrixWorld();const i=t.getRenderTarget(),r=t.getClearColor(new Ft),o=t.getClearAlpha();t.setRenderTarget(this.rt),t.setClearColor(32896,0),t.clear(!0,!1,!1),t.render(this.scene,this.camera),t.setClearColor(r,o),t.setRenderTarget(i)}}const iv=new De({vertexShader:`
    attribute float aAge;     // 0 fresh .. 1 old
    attribute float aSide;    // -1 .. 1 across the ribbon
    varying float vAge; varying float vSide;
    void main() { vAge = aAge; vSide = aSide; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,fragmentShader:`
    varying float vAge; varying float vSide;
    uniform float uStrength;
    void main() {
      float edge = 1.0 - smoothstep(0.55, 1.0, abs(vSide));
      float life = 1.0 - vAge;
      // turbulent white core right behind the hull, fading and thinning with age, plus fainter V arms;
      // kept wide enough to survive the wake map's ~1.6 m texels (the old thin twin lines aliased into dots)
      float core = (1.0 - smoothstep(0.0, 0.9, abs(vSide))) * (0.55 + 0.45 * (1.0 - smoothstep(0.0, 0.5, vAge)));
      float arms = smoothstep(0.45, 0.8, abs(vSide)) * (1.0 - smoothstep(0.85, 1.0, abs(vSide))) * 0.5;
      float foam = (core + arms) * life * life * edge * uStrength;
      vec2 n = vec2(sign(vSide) * 0.35 * life * edge, 0.0);
      gl_FragColor = vec4(foam, 0.5 + n.x, 0.5 + n.y, edge * life);
    }
  `,uniforms:{uStrength:{value:1}},transparent:!0,depthTest:!1,depthWrite:!1,side:Be,blending:qn}),$a=new De({vertexShader:`
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
  `,uniforms:{uStrength:{value:.7}},transparent:!0,depthWrite:!1,side:Be}),sv=new De({vertexShader:`
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
  `,uniforms:{uHull:{value:new Ut(.72,.28)},uStrength:{value:1}},transparent:!0,depthTest:!0,depthWrite:!1,side:Be});class or{mesh;constructor(t,e,n=1){const i=t+2.6,r=e+2.2,o=sv.clone();o.uniforms.uHull.value=new Ut(t/i,e/r),o.uniforms.uStrength.value=n,this.mesh=new de(new Jn(i,r),o),this.mesh.frustumCulled=!1,this.mesh.visible=!1,this.mesh.renderOrder=6}static flat=new Ae().setFromAxisAngle(new P(1,0,0),-Math.PI/2);spin=new Ae;static up=new P(0,1,0);update(t,e,n,i,r,o=1){this.mesh.visible=r,r&&(this.mesh.position.set(t,.07,e),this.spin.setFromAxisAngle(or.up,Math.atan2(-i,n)),this.mesh.quaternion.copy(this.spin).multiply(or.flat),this.mesh.material.uniforms.uStrength.value=o)}}class rs{constructor(t,e,n,i=1,r=iv){this.width=e,this.lifetime=n,this.capacity=t,this.positions=new Float32Array(t*2*3),this.ages=new Float32Array(t*2),this.sides=new Float32Array(t*2);const o=[];for(let c=0;c<t-1;c++){const l=c*2,h=l+1,d=l+2,u=l+3;o.push(l,d,h,h,d,u)}this.geo=new oe,this.geo.setAttribute("position",new fe(this.positions,3)),this.geo.setAttribute("aAge",new fe(this.ages,1)),this.geo.setAttribute("aSide",new fe(this.sides,1)),this.geo.setIndex(o),this.geo.setDrawRange(0,0);const a=r.clone();a.uniforms.uStrength.value=i,this.mesh=new de(this.geo,a),this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1}mesh;capacity;positions;ages;sides;points=[];lastX=NaN;lastZ=NaN;geo;update(t,e,n,i,r){if(i&&(Number.isNaN(this.lastX)||Math.hypot(t-this.lastX,e-this.lastZ)>Math.max(2,r*.25))){const a=Number.isNaN(this.lastX)?1:t-this.lastX,c=Number.isNaN(this.lastZ)?0:e-this.lastZ,l=Math.hypot(a,c)||1;this.points.push({x:t,z:e,dx:a/l,dz:c/l,t:n}),this.points.length>this.capacity&&this.points.shift(),this.lastX=t,this.lastZ=e}for(;this.points.length&&n-this.points[0].t>this.lifetime;)this.points.shift();const o=this.points.length;for(let a=0;a<o;a++){const c=this.points[a],l=Math.min(1,(n-c.t)/this.lifetime),h=this.width*(.6+1.8*l),d=-c.dz*h,u=c.dx*h;this.positions[a*6]=c.x-d,this.positions[a*6+1]=.05,this.positions[a*6+2]=c.z-u,this.positions[a*6+3]=c.x+d,this.positions[a*6+4]=.05,this.positions[a*6+5]=c.z+u,this.ages[a*2]=l,this.ages[a*2+1]=l,this.sides[a*2]=-1,this.sides[a*2+1]=1}this.geo.attributes.position.needsUpdate=!0,this.geo.attributes.aAge.needsUpdate=!0,this.geo.attributes.aSide.needsUpdate=!0,this.geo.setDrawRange(0,Math.max(0,(o-1)*6))}reset(){this.points.length=0,this.lastX=NaN,this.lastZ=NaN,this.geo.setDrawRange(0,0)}}const Xr=`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,rv=`
${hr}
${Sn}
${lo}
${ho}
${Kh}
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
`,ov=`
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
`,av=`
uniform sampler2D tColor;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec3 s = texture2D(tColor, vUv).rgb * 0.227;
  s += (texture2D(tColor, vUv + uDir * 1.385).rgb + texture2D(tColor, vUv - uDir * 1.385).rgb) * 0.316;
  s += (texture2D(tColor, vUv + uDir * 3.231).rgb + texture2D(tColor, vUv - uDir * 3.231).rgb) * 0.070;
  gl_FragColor = vec4(s, 1.0);
}
`,cv=`
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
`;class lv{constructor(t,e,n){this.renderer=t,this.opts=n;const i=new dc(1,1,Kn);this.sceneRT=new an(1,1,{type:Cn,samples:n.samples,depthTexture:i,depthBuffer:!0,minFilter:ve,magFilter:ve}),this.fogRT=new an(1,1,{type:Cn,depthBuffer:!1,minFilter:ve,magFilter:ve});for(let r=0;r<3;r++)this.bloomRTs.push(new an(1,1,{type:Cn,depthBuffer:!1,minFilter:ve,magFilter:ve})),this.bloomTmp.push(new an(1,1,{type:Cn,depthBuffer:!1,minFilter:ve,magFilter:ve}));this.aerialMat=new De({vertexShader:Xr,fragmentShader:rv,uniforms:{...e.uniforms,tColor:{value:null},tDepth:{value:null},uInvProj:{value:new Yt},uInvView:{value:new Yt},uCamPos:{value:new P},uLogDepthFC:{value:1},uCloudShadowStrength:{value:1}},depthTest:!1,depthWrite:!1}),this.brightMat=new De({vertexShader:Xr,fragmentShader:ov,uniforms:{tColor:{value:null},uThreshold:{value:1.5}},depthTest:!1,depthWrite:!1}),this.blurMat=new De({vertexShader:Xr,fragmentShader:av,uniforms:{tColor:{value:null},uDir:{value:new Ut}},depthTest:!1,depthWrite:!1}),this.compositeMat=new De({vertexShader:Xr,fragmentShader:cv,uniforms:{tColor:{value:null},tBloom0:{value:null},tBloom1:{value:null},tBloom2:{value:null},uBloom:{value:.2},uExposure:{value:.92},uSaturation:{value:1.16},uVignette:{value:.25},uLift:{value:new P(0,.002,.004)},uGain:{value:new P(1.03,1,.97)},uResolution:{value:new Ut(1,1)},uGrain:{value:.004},uTime:{value:0}},depthTest:!1,depthWrite:!1}),this.quad=new de(new Jn(2,2),this.aerialMat),this.quad.frustumCulled=!1,this.quadScene.add(this.quad)}sceneRT;fogRT;bloomRTs=[];bloomTmp=[];quad;quadScene=new rr;quadCam=new cr(-1,1,1,-1,0,1);aerialMat;brightMat;blurMat;compositeMat;width=1;height=1;exposure=1;cloudShadowStrength=1;setSize(t,e){this.width=t,this.height=e,this.sceneRT.setSize(t,e),this.fogRT.setSize(t,e);for(let n=0;n<3;n++){const i=2**(n+1);this.bloomRTs[n].setSize(Math.max(1,Math.round(t/i)),Math.max(1,Math.round(e/i))),this.bloomTmp[n].setSize(Math.max(1,Math.round(t/i)),Math.max(1,Math.round(e/i)))}this.compositeMat.uniforms.uResolution.value.set(t,e)}get target(){return this.sceneRT}blit(t,e){this.quad.material=t,this.renderer.setRenderTarget(e),this.renderer.render(this.quadScene,this.quadCam)}finish(t,e){const n=this.renderer,i=this.aerialMat.uniforms;if(i.tColor.value=this.sceneRT.texture,i.tDepth.value=this.sceneRT.depthTexture,i.uInvProj.value.copy(t.projectionMatrixInverse),i.uInvView.value.copy(t.matrixWorld),i.uCamPos.value.copy(t.position),i.uLogDepthFC.value=2/(Math.log(t.far+1)/Math.LN2),i.uCloudShadowStrength.value=this.cloudShadowStrength,this.blit(this.aerialMat,this.fogRT),this.opts.bloom){this.brightMat.uniforms.tColor.value=this.fogRT.texture,this.blit(this.brightMat,this.bloomRTs[0]);for(let o=0;o<3;o++){const a=this.bloomRTs[o],c=this.bloomTmp[o],l=a.width,h=a.height;o>0&&(this.blurMat.uniforms.tColor.value=this.bloomRTs[o-1].texture,this.blurMat.uniforms.uDir.value.set(.5/l,.5/h),this.blit(this.blurMat,a)),this.blurMat.uniforms.tColor.value=a.texture,this.blurMat.uniforms.uDir.value.set(1/l,0),this.blit(this.blurMat,c),this.blurMat.uniforms.tColor.value=c.texture,this.blurMat.uniforms.uDir.value.set(0,1/h),this.blit(this.blurMat,a)}}const r=this.compositeMat.uniforms;r.tColor.value=this.fogRT.texture,r.tBloom0.value=this.bloomRTs[0].texture,r.tBloom1.value=this.bloomRTs[1].texture,r.tBloom2.value=this.bloomRTs[2].texture,r.uBloom.value=this.opts.bloom?.18:0,r.uExposure.value=this.exposure*(1+5*this.aerialMat.uniforms.uNight.value),r.uTime.value=e,this.blit(this.compositeMat,null),n.setRenderTarget(null)}}function Xl(s,t,e){const n=Math.hypot(e[0]-t[0],e[1]-t[1]),i=Math.max(2,Math.ceil(n/10));let r=-1,o=-1;for(let l=0;l<=i;l++){const h=l/i,d=t[0]+(e[0]-t[0])*h,u=t[1]+(e[1]-t[1])*h,f=s.heightAt(d,u)>=.8;f&&r<0&&(r=l),f&&(o=l)}if(r<0||o-r<3)return null;const a=r/i,c=o/i;return[[t[0]+(e[0]-t[0])*a,t[1]+(e[1]-t[1])*a],[t[0]+(e[0]-t[0])*c,t[1]+(e[1]-t[1])*c]]}function hv(s){const t=[],e=new Map,n=new Map;for(const o of s.roads)for(let a=0;a<o.pts.length-1;a++)t.push({a:o.pts[a],b:o.pts[a+1],width:o.width,cls:o.cls,lanes:o.lanes,traffic:o.traffic,lift:0});const i=new Ve("lots"),r=(o,a,c)=>s.districtAt(a,c)===o;for(const o of s.districts){const a=Math.cos(o.rot),c=Math.sin(o.rot),l=(w,v)=>[o.cx+w*a-v*c,o.cz+w*c+v*a],h=(w,v)=>{const T=w-o.cx,M=v-o.cz;return[T*a+M*c,-T*c+M*a]};if(o.track){const w=[],v=[];let T=1,M=0;for(let E=0;E<o.track.length-1;E++){const b=o.track[E],_=o.track[E+1],S=Xl(s,b,_);if(S){const D={a:S[0],b:S[1],width:7,cls:"lane",lanes:2,traffic:.6,lift:0};t.push(D),w.push(D)}const R=Math.hypot(_[0]-b[0],_[1]-b[1]),[O,I]=h(b[0],b[1]),[A,U]=h(_[0],_[1]),F=Math.abs(A-O)>=Math.abs(U-I);for(let D=M;D<R-12;D+=i.range(42,58)){const N=D/R,B=O+(A-O)*N,k=I+(U-I)*N;T=-T;const V=6,J=46,it=20,X=F?{x0:B-it,x1:B+it,z0:Math.min(k+T*V,k+T*(V+J)),z1:Math.max(k+T*V,k+T*(V+J)),streetWidth:7}:{z0:k-it,z1:k+it,x0:Math.min(B+T*V,B+T*(V+J)),x1:Math.max(B+T*V,B+T*(V+J)),streetWidth:7},[tt,dt]=l((X.x0+X.x1)/2,(X.z0+X.z1)/2);s.heightAt(tt,dt)<1.2||!r(o,tt,dt)||(v.push(X),M=0)}}e.set(o.id,w),n.set(o.id,v);continue}const d=s.grids.get(o.id);if(!d)continue;const u=[],f=o.zone===te.DOWNTOWN?14:o.zone===te.RES_MID||o.zone===te.HOTEL||o.zone===te.INDUSTRIAL?12:9,p="street",{xs:x,zs:g}=d,m=(w,v)=>{const T=Xl(s,w,v);if(!T)return;const M=[(T[0][0]+T[1][0])/2,(T[0][1]+T[1][1])/2];if(!r(o,M[0],M[1]))return;const E={a:T[0],b:T[1],width:f,cls:p,lanes:2,traffic:o.zone===te.DOWNTOWN?4:1.5,lift:0};t.push(E),u.push(E)};for(const w of x)for(let v=0;v<g.length-1;v++)m(l(w,g[v]),l(w,g[v+1]));for(const w of g)for(let v=0;v<x.length-1;v++)m(l(x[v],w),l(x[v+1],w));e.set(o.id,u);const y=[];for(let w=0;w<x.length-1;w++)for(let v=0;v<g.length-1;v++){const[T,M]=l((x[w]+x[w+1])/2,(g[v]+g[v+1])/2);r(o,T,M)&&y.push({x0:x[w],x1:x[w+1],z0:g[v],z1:g[v+1],streetWidth:f})}n.set(o.id,y)}for(const o of s.runways)t.push({a:o.a,b:o.b,width:o.width,cls:"runway",lanes:0,traffic:0,lift:0});return{segments:t,streetsByDistrict:e,blocksByDistrict:n}}const uv=`
varying vec2 vRoadUv;   // x across (-1..1), y along (metres)
varying vec3 vRoadInfo; // lanes, width, class
varying vec3 vWorldPosR;
${Sn}
`,dv=`
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
`;function fv(s,t,e){const n=[],i=[],r=[],o=[],a=[];let c=0;const l=f=>f==="highway"||f==="causeway"?3:f==="arterial"?2:f==="runway"?5:f==="taxiway"?6:f==="lane"?0:1,h=[];for(const f of t){if(Math.hypot(f.b[0]-f.a[0],f.b[1]-f.a[1])<1)continue;const p=h[h.length-1],x=p&&p[p.length-1];x&&x.cls===f.cls&&x.width===f.width&&x.lift===f.lift&&x.b[0]===f.a[0]&&x.b[1]===f.a[1]?p.push(f):h.push([f])}for(const f of h){const p=[f[0].a,...f.map(_=>_.b)],x=p.length,g=[];for(let _=0;_<x-1;_++){const S=p[_+1][0]-p[_][0],R=p[_+1][1]-p[_][1],O=Math.hypot(S,R);g.push([S/O,R/O])}const m=[];for(let _=0;_<x;_++){const S=g[Math.max(0,_-1)],R=g[Math.min(x-2,_)];let O=-(S[1]+R[1]),I=S[0]+R[0];const A=Math.hypot(O,I)||1;O/=A,I/=A;const U=Math.max(.5,O*-R[1]+I*R[0]);m.push([O/U,I/U])}const y=f[0].width,w=y*.5,v=l(f[0].cls),T=f[0].lanes,M=f[0].lift;let E=0,b=!0;for(let _=0;_<x-1;_++){const[S,R]=p[_],[O,I]=p[_+1],A=Math.hypot(O-S,I-R),U=Math.max(1,Math.ceil(A/15)),F=m[_],D=m[_+1];for(let N=b?0:1;N<=U;N++){const B=N/U,k=S+(O-S)*B,V=R+(I-R)*B,J=F[0]+(D[0]-F[0])*B,it=F[1]+(D[1]-F[1])*B;for(const X of[-1,1]){const tt=k+J*w*X,dt=V+it*w*X,K=s.heightAt(tt,dt)+.15+M;n.push(tt,K,dt),a.push(0,1,0),i.push(X,E+B*A),r.push(T,y,v)}c+=2,(!b||N>0)&&o.push(c-4,c-3,c-2,c-2,c-3,c-1),b=!1}E+=A}}const d=new oe;d.setAttribute("position",new bt(n,3)),d.setAttribute("normal",new bt(a,3)),d.setAttribute("aRoadUv",new bt(i,2)),d.setAttribute("aRoadInfo",new bt(r,3)),d.setIndex(o),d.computeBoundingSphere();const u=new de(d,e);return u.receiveShadow=!0,u.castShadow=!1,u.renderOrder=2,u.frustumCulled=!1,[u]}function pv(){const s=new le({color:16777215,roughness:.8,metalness:0,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2});return s.onBeforeCompile=t=>{t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aRoadUv; attribute vec3 aRoadInfo; varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vRoadUv = aRoadUv; vRoadInfo = aRoadInfo; vWorldPosR = (modelMatrix * vec4(position, 1.0)).xyz;`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
${uv}`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
${dv}`)},s.customProgramCacheKey=()=>"road-v3",s}function mv(s){let t=0;for(let e=0;e<s.length-1;e++)t+=Math.hypot(s[e+1][0]-s[e][0],s[e+1][1]-s[e][1]);return t}function gv(s,t){let e=0;for(let n=0;n<s.length-1;n++){const i=Math.hypot(s[n+1][0]-s[n][0],s[n+1][1]-s[n][1]);if(t<=e+i||n===s.length-2){const r=Kt((t-e)/i,0,1),o=(s[n+1][0]-s[n][0])/i,a=(s[n+1][1]-s[n][1])/i;return{x:s[n][0]+o*i*r,z:s[n][1]+a*i*r,dx:o,dz:a}}e+=i}return{x:s[0][0],z:s[0][1],dx:1,dz:0}}function vv(s,t,e,n){const i=Math.min(160,n*.25),r=t.heightAt(s.pts[0][0],s.pts[0][1]),o=t.heightAt(s.pts[s.pts.length-1][0],s.pts[s.pts.length-1][1]),a=Nt(0,i,e),c=Nt(0,i,n-e);let l=ue(Math.max(r,.5)+.3,s.deck,a);if(l=Math.min(l,ue(Math.max(o,.5)+.3,s.deck,c)),s.archHeight>0){const h=s.archT*n,d=Math.abs(e-h)/(s.archLength*.5);if(d<1){const u=.5+.5*Math.cos(d*Math.PI);l+=(s.archHeight-s.deck)*u}}return l}const xv=`
{
  float lanes = vRoadInfo.x;
  float width = vRoadInfo.y;
  float median = vRoadInfo.z;
  float xm = vRoadUv.x * width * 0.5;
  float along = vRoadUv.y;
  float n = fbm3(vWorldPosR.xz * 0.11);
  float n2 = vnoise(vWorldPosR.xz * 2.3);
  // sun-bleached concrete pavement; the shoulders outside the carriageway are a shade paler
  float onShoulder = step(width * 0.5 + 0.005, abs(xm));
  vec3 conc = mix(vec3(0.60, 0.60, 0.57), vec3(0.72, 0.71, 0.68), n) * (0.95 + 0.10 * n2);
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
  // markings: white edge lines, dashed white lane lines, yellow centre (double line or beside the median barrier)
  float laneEdge = smoothstep(0.14, 0.05, edgeDist) * step(0.5, k) * step(k, lanes - 1.5) * step(0.6, abs(xm));
  float dashes = laneEdge * step(fract(along / 12.0), 0.5);
  float edgeLine = smoothstep(0.14, 0.05, abs(abs(xm) - (width * 0.5 - 0.4)));
  float centre = 0.0;
  if (lanes < 3.5) centre = smoothstep(0.12, 0.04, abs(xm)) * step(fract(along / 9.0), 0.45);
  else if (median > 0.0) centre = smoothstep(0.14, 0.05, abs(abs(xm) - (median + 0.35)));
  else centre = smoothstep(0.12, 0.04, abs(abs(xm) - 0.2));
  diffuseColor.rgb = mix(conc, vec3(0.82), max(edgeLine, dashes) * 0.85);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.85, 0.66, 0.16), centre * 0.9);
  roughnessFactor = 0.82;
}
`;function _v(s){const t=new le({color:16777215,roughness:.82,metalness:0,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),e=s;return e.defines&&(t.defines={...e.defines}),t.onBeforeCompile=(n,i)=>{e.onBeforeCompile.call(e,n,i),n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aRoadUv; attribute vec3 aRoadInfo; varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vRoadUv = aRoadUv; vRoadInfo = aRoadInfo; vWorldPosR = (modelMatrix * vec4(position, 1.0)).xyz;`),n.fragmentShader=n.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;
${Sn}`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
${xv}`)},t.customProgramCacheKey=()=>"bridge-deck-v1",t}const yv=2.4,wv=1.05;function ql(s,t,e){const n=new P,i=new P,r=new P,o=new P,a=new P;for(let c=0;c<t.length-1;c++){const[l,h]=t[c],[d,u]=t[c+1],f=d-l,p=u-h,x=Math.hypot(f,p)||1,g=p/x,m=-f/x,y=e.pos.length/3;for(let v=0;v<s.length;v++){const T=s[v];e.pos.push(T.x+T.rx*l,T.y+h,T.z+T.rz*l,T.x+T.rx*d,T.y+u,T.z+T.rz*d);const M=T.rx*g,E=m,b=T.rz*g;e.nrm.push(M,E,b,M,E,b)}let w=!1;s.length>1&&(n.fromArray(e.pos,y*3),i.fromArray(e.pos,(y+1)*3),r.fromArray(e.pos,(y+3)*3),o.subVectors(i,n).cross(r.clone().sub(n)),a.fromArray(e.nrm,y*3),w=o.dot(a)<0);for(let v=1;v<s.length;v++){const T=y+(v-1)*2,M=T+1,E=y+v*2,b=E+1;w?e.idx.push(T,b,M,T,E,b):e.idx.push(T,M,b,T,b,E)}}}function Mv(s,t,e,n){const i=new Re,r=[],o=[],a=[],c=[],l=[],h=[],d=[];let u=0;const f={pos:[],nrm:[],idx:[]},p=[],x=[],g=[],m=[],y=[],w=new Yt,v=new Ae,T=new P,M=new P,E=new Ee,b=new P(0,1,0),_=(D,N,B,k,V,J,it,X,tt=0)=>{J<=.01||(M.set(N,B+J/2,k),v.setFromEuler(E.set(tt,X,0,"YXZ")),T.set(V,J,it),D.push(w.compose(M,v,T).clone()))},S=(D,N,B,k,V,J)=>{J<=.01||(M.set(N,B+J/2,k),v.identity(),T.set(V,J,V),D.push(w.compose(M,v,T).clone()))},R=(D,N,B,k)=>{const V=B.clone().sub(N),J=V.length();J<.1||(V.divideScalar(J),M.copy(N).add(B).multiplyScalar(.5),v.setFromUnitVectors(b,V),T.set(k*2,J,k*2),D.push(w.compose(M,v,T).clone()))};for(const D of s.bridges){const N=mv(D.pts),B=D.width,k=B*.5,V=Kt(D.lanes*3.3,8,B-4),J=V*.5,it=q=>{const G=gv(D.pts,q);return{x:G.x,y:vv(D,s,q,N),z:G.z,rx:-G.dz,rz:G.dx,dx:G.dx,dz:G.dz,s:q}},X=q=>Math.atan2(q.dx,q.dz),tt=D.archHeight>=20&&D.archLength>=350,dt=!tt&&D.archHeight>0&&D.archLength>=300,K=D.archT*N,et=tt?Math.min(D.archLength*.5,300):dt?D.archLength*.8:0,ot=K-et/2,mt=K+et/2,ut=10,nt=Math.ceil(N/ut),lt=[];for(let q=0;q<=nt;q++)lt.push(it(Math.min(N,q*ut)));const H=[];for(let q=0;q<=nt;q+=2)H.push(new P(lt[q].x,lt[q].y,lt[q].z));(nt&1)===1&&H.push(new P(lt[nt].x,lt[nt].y,lt[nt].z));const Pt=D.lanes>=6?.3:0,gt=.15,At=[[-k,gt,0],[-J,gt,0],[-J,gt,1],[-J,.02,1],[-J,.02,0],[J,.02,0],[J,.02,-1],[J,gt,-1],[J,gt,0],[k,gt,0]],vt=At.length;lt.forEach((q,G)=>{for(const[Q,ft,ct]of At)a.push(q.x+q.rx*Q,q.y+ft,q.z+q.rz*Q),ct===0?d.push(0,1,0):d.push(q.rx*ct,0,q.rz*ct),c.push(Q/J,q.s),l.push(D.lanes,V,Pt);if(G>0){const Q=u+(G-1)*vt,ft=u+G*vt;for(let ct=0;ct<vt;ct+=2)h.push(Q+ct,Q+ct+1,ft+ct,ft+ct,Q+ct+1,ft+ct+1)}}),u+=(nt+1)*vt;const kt=yv,yt=wv,z=[[-k,gt],[-k-.14,yt],[-k-.5,yt],[-k-.5,-.4],[-k-.22,-1.05],[-B*.31,-kt],[B*.31,-kt],[k+.22,-1.05],[k+.5,-.4],[k+.5,yt],[k+.14,yt],[k,gt]];if(ql(lt,z,f),Pt>0){const q=Pt;ql(lt,[[q,.02],[q,.3],[q*.4,.9],[-q*.4,.9],[-q,.3],[-q,.02]],f)}for(let q=0;q<lt.length;q++){const G=lt[q],Q=s.heightAt(G.x,G.z);if(Q<.3)continue;const ft=Q-.8,ct=G.y-kt+.15;ct-ft<.3||G.y-Q>16||_(p,G.x,ft,G.z,B+.8,ct-ft,ut+.4,X(G))}const C=B>=20?50:42,$=[];for(let q=C*.5;q<N-C*.3;q+=C)et>0&&q>ot-12&&q<mt+12||$.push(q);dt&&$.push(ot,mt);for(const q of $){const G=it(q),Q=s.heightAt(G.x,G.z);if(G.y-Q<2.8)continue;const ft=X(G),ct=G.y-kt,_t=dt&&(q===ot||q===mt),Ot=_t?2.2:1.6,ht=ct-Ot,wt=Math.min(Q,-.5)-2.5,Lt=Q<.2,Ht=B+2.6;if(B>=20||_t){const St=_t?B*.7:B*.5,ee=_t?3.2:2;_(p,G.x,wt,G.z,St,ht-wt,ee,ft),_(p,G.x,ht,G.z,Ht,Ot,ee+.8,ft),Lt&&_(p,G.x,-1,G.z,St+2.4,1.6,ee+2.4,ft)}else{for(const St of[-B*.3,B*.3])S(x,G.x+G.rx*St,wt,G.z+G.rz*St,2,ht-wt),Lt&&_(p,G.x+G.rx*St,-1,G.z+G.rz*St,3.6,1.6,3.6,ft);_(p,G.x,ht,G.z,Ht,Ot,2.2,ft)}_(g,G.x,G.y+.03,G.z,V,.04,.3,ft)}for(let q=1;q<lt.length;q++){const G=lt[q-1],Q=lt[q],ft=Math.hypot(Q.x-G.x,Q.y-G.y,Q.z-G.z),ct=Math.atan2(Q.x-G.x,Q.z-G.z),_t=-Math.asin(Kt((Q.y-G.y)/ft,-1,1));for(const Ot of[-1,1]){const ht=(G.x+Q.x)/2+(G.rx+Q.rx)/2*(k+.32)*Ot,wt=(G.z+Q.z)/2+(G.rz+Q.rz)/2*(k+.32)*Ot;_(g,ht,(G.y+Q.y)/2+yt+.86,wt,.07,.07,ft+.1,ct,_t)}}for(let q=2;q<N;q+=4){const G=it(q),Q=X(G);for(const ft of[-1,1])_(g,G.x+G.rx*(k+.32)*ft,G.y+yt,G.z+G.rz*(k+.32)*ft,.1,.86,.1,Q)}for(let q=22,G=0;q<N-20;q+=45,G++){const Q=it(q),ft=G%2===0?-1:1;o.push(new P(Q.x+Q.rx*(k+.2)*ft,Q.y+.15,Q.z+Q.rz*(k+.2)*ft))}if(tt){const q=.24*et+10,G=3.2,Q=4.8,ft=k+1.9,ct=et>=240?9:7,_t=(et/2-16)/ct;for(const Ot of[ot,mt]){const ht=it(Ot),wt=s.heightAt(ht.x,ht.z),Lt=X(ht),Ht=Math.min(wt,-.5)-3;for(const St of[-1,1]){const ee=ht.x+ht.rx*ft*St,jt=ht.z+ht.rz*ft*St;_(p,ee,Ht,jt,G,ht.y+q-Ht,Q,Lt),wt<.2&&_(p,ee,-1.2,jt,G+3,1.9,Q+3,Lt)}_(p,ht.x,ht.y-kt-2.2,ht.z,2*ft+G,2.2,Q,Lt),_(p,ht.x,ht.y+q-5,ht.z,2*ft+G,3.6,Q*.7,Lt);for(let St=1;St<=ct;St++)for(const ee of[-1,1]){const jt=Ot+ee*(St*_t+10);if(jt<4||jt>N-4)continue;const pe=it(jt),Y=ht.y+q-3-(ct-St)*(.45*q/ct);for(const Et of[-1,1]){const at=new P(pe.x+pe.rx*(k+.36)*Et,pe.y+1.1,pe.z+pe.rz*(k+.36)*Et),pt=new P(ht.x+ht.rx*(ft-G*.5+.1)*Et,Y,ht.z+ht.rz*(ft-G*.5+.1)*Et);R(m,at,pt,.11)}}}}else if(dt){const q=D.archHeight*.95+4,G=k+1,Q=[[],[]],ft=28;for(let ct=0;ct<=ft;ct++){const _t=ct/ft,Ot=it(ot+et*_t),ht=Ot.y+q*Math.sin(_t*Math.PI)+.8;for(const wt of[-1,1]){const Lt=new P(Ot.x+Ot.rx*G*wt,ht,Ot.z+Ot.rz*G*wt);Q[wt<0?0:1].push(Lt),ct%2===1&&ct>1&&ct<ft-1&&R(m,new P(Lt.x,Ot.y+yt+.2,Lt.z),Lt,.11)}(ct===8||ct===14||ct===20)&&_(g,Ot.x,ht-.7,Ot.z,2*G,1.2,1.2,X(Ot))}for(const ct of Q)y.push(new xc(new Xh(ct),56,1.15,8,!1))}r.push({id:D.id,pts:H,width:D.width,lanes:D.lanes,traffic:D.traffic})}const O=new oe;O.setAttribute("position",new bt(a,3)),O.setAttribute("normal",new bt(d,3)),O.setAttribute("aRoadUv",new bt(c,2)),O.setAttribute("aRoadInfo",new bt(l,3)),O.setIndex(h),O.computeBoundingSphere();const I=new de(O,_v(e));I.receiveShadow=!0,I.renderOrder=3,i.add(I);const A=new oe;A.setAttribute("position",new bt(f.pos,3)),A.setAttribute("normal",new bt(f.nrm,3)),A.setAttribute("uv",new fe(new Float32Array(f.pos.length/3*2),2)),A.setIndex(new fe(new Uint32Array(f.idx),1)),A.computeBoundingSphere();const U=new de(A,e);U.castShadow=!0,U.receiveShadow=!0,i.add(U);const F=(D,N,B,k)=>{if(!B.length)return;const V=new Ui(D,N,B.length);B.forEach((J,it)=>V.setMatrixAt(it,J)),V.castShadow=k,V.receiveShadow=!0,i.add(V)};if(F(new Xt(1,1,1),e,p,!0),F(new ye(.5,.5,1,12),e,x,!0),F(new Xt(1,1,1),n,g,!1),F(new ye(.5,.5,1,6),n,m,!1),y.length){const D=new de(Sv(y),n);D.castShadow=!0,D.receiveShadow=!0,i.add(D)}return{group:i,routes:r,deckGeometry:O,lampPositions:o}}function Sv(s){let t=0,e=0;const n=s.map(d=>{const u=d.getAttribute("position"),f=d.getIndex(),p=f?f.count:u.count;return t+=u.count,e+=p,{g:d,p:u,ind:f,nIdx:p}}),i=new Float32Array(t*3),r=new Float32Array(t*3),o=new Float32Array(t*2),a=t>65535?new Uint32Array(e):new Uint16Array(e);let c=0,l=0;for(const{g:d,p:u,ind:f,nIdx:p}of n){i.set(u.array,c*3);const x=d.getAttribute("normal");x&&r.set(x.array,c*3);const g=d.getAttribute("uv");if(g&&o.set(g.array,c*2),f)for(let m=0;m<p;m++)a[l+m]=f.getX(m)+c;else for(let m=0;m<p;m++)a[l+m]=m+c;c+=u.count,l+=p}const h=new oe;h.setAttribute("position",new fe(i,3)),h.setAttribute("normal",new fe(r,3)),h.setAttribute("uv",new fe(o,2)),h.setIndex(new fe(a,1)),h.computeBoundingSphere();for(const d of s)d.dispose();return h}function bv(s){const t=new le({color:16777215,roughness:.7,metalness:0});return t.onBeforeCompile=e=>{e.uniforms.uNight=s,e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
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
${Sn}
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
      // tapered crowns: glass on glass towers, painted metal elsewhere
      col = style < 0.5 ? vec3(0.08, 0.16, 0.25) : style == 8.0 ? vec3(0.10, 0.25, 0.24) : wall * 0.8;
      rough = glassy ? 0.15 : 0.5;
      metal = glassy ? 0.8 : 0.2;
      emis = vec3(1.0, 0.85, 0.6) * (glassy ? 0.5 : 0.0) * uNight;
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
    if (style < 0.5) {
      // blue curtain wall: glass with thin mullions and a spandrel band per floor
      float mull = step(fx, 0.05) + step(0.95, fx) + step(fy, 0.05);
      float spandrel = step(fy, 0.16 + 0.12 * variant);
      float glass = 1.0 - clamp(mull + spandrel, 0.0, 1.0);
      vec3 tint = mix(vec3(0.08, 0.17, 0.27), vec3(0.05, 0.10, 0.19), variant);
      vec3 spandrelCol = mix(wall * 0.55, tint * 0.7, step(0.5, hash11(seed * 5.3)));
      col = mix(mix(spandrelCol, wall * 0.35, clamp(mull, 0.0, 1.0)), tint, glass);
      col = mix(col, mix(spandrelCol, tint, 0.75), lod);
      rough = mix(0.5, 0.08, glass);
      metal = glass * 0.9 * (1.0 - 0.3 * lod);
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
      vec3 tint = mix(vec3(0.10, 0.26, 0.24), vec3(0.14, 0.30, 0.30), variant);
      col = mix(wall, tint, glass);
      col = mix(col, mix(wall, tint, 0.68), lod);
      rough = mix(0.6, 0.1, glass);
      metal = glass * 0.85 * (1.0 - 0.3 * lod);
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
    // crown lighting on tall towers at night: a lit band just below the roof line
    if (vDims.y > 110.0) {
      float crown = smoothstep(vDims.y - 6.0, vDims.y - 4.5, v) * (1.0 - smoothstep(vDims.y - 1.0, vDims.y, v));
      vec3 crownCol = mix(vec3(1.0, 0.85, 0.6), vec3(0.4, 0.8, 1.0), step(0.5, hash11(seed * 2.7)));
      emis += crownCol * crown * 6.0 * uNight;
    }
  }
  diffuseColor.rgb = col;
  roughnessFactor = rough;
  metalnessFactor = metal;
  totalEmissiveRadiance += emis;
}`)},t.customProgramCacheKey=()=>"facade-v2",t}const _c=0,to=1,ja=2,tu=3,eu=4,Dn=s=>1<<s,Yl={all:Dn(to)|Dn(ja)|Dn(tu),mid:Dn(to)|Dn(ja),near:Dn(to)};function ur(s,t){return t?s==="all"?Dn(_c):Dn(eu)|Yl[s]:Yl[s]}function Ev(s,t,e=!0){s.layers.mask=ur(t,e)}function Tv(s){s.layers.set(_c),s.layers.enable(eu)}function Av(s,t){const e=s===0?to:s===t-1?tu:ja;return Dn(_c)|Dn(e)}function Cv(s,t){const e=s.shadowMap,n=e.render.bind(e),i=[];e.render=(r,o,a)=>{if(!e.enabled||r.length===0||!e.autoUpdate&&!e.needsUpdate)return;const c=e.needsUpdate,l=a.layers.mask;let h=0;for(const d of r)t(d)>=0&&h++;for(const d of r){const u=t(d);a.layers.mask=u>=0?Av(u,h):l,i[0]=d,e.needsUpdate=c,Za=u,n(i,o,a)}Za=-1,i.length=0,e.needsUpdate=!1,a.layers.mask=l}}let Za=-1;function Rv(){return Za}const qr=new Ce,$l=new Yt,Yr=new Yt;class Pv{viewFrustum=new xs;shadowFrustum=new xs;shadowDir=new P(1,0,0);spread=1;tmp=new P;update(t,e,n){Yr.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this.viewFrustum.setFromProjectionMatrix(Yr);const i=t.near,r=i*Math.tan(Di.DEG2RAD*.5*t.fov)/t.zoom,o=2*r,a=t.aspect*o;$l.makePerspective(-a/2,a/2,r,r-o,i,Math.max(i+1,e),t.coordinateSystem),Yr.multiplyMatrices($l,t.matrixWorldInverse),this.shadowFrustum.setFromProjectionMatrix(Yr);const c=Math.hypot(n.x,n.z);c>1e-5&&this.shadowDir.set(-n.x/c,0,-n.z/c),this.spread=Math.min(20,c/Math.max(n.y,.001))}boxInView(t){return this.viewFrustum.intersectsBox(t)}sphereInView(t,e){return qr.set(t,e),this.viewFrustum.intersectsSphere(qr)}casterInView(t,e,n){const i=Math.max(0,n)*this.spread;return this.tmp.copy(t).addScaledVector(this.shadowDir,i*.5),qr.set(this.tmp,e+i*.5),this.shadowFrustum.intersectsSphere(qr)}}function dr(s,t){const e=s.getAttribute("position"),n=new Float32Array(e.count);for(let i=0;i<e.count;i++)n[i]=t(e.getX(i),e.getY(i),e.getZ(i));return s.setAttribute("aPart",new fe(n,1)),s.getAttribute("uv")||s.setAttribute("uv",new fe(new Float32Array(e.count*2),2)),s}function Lv(){const s=new Xt(1,1,1);return s.translate(0,.5,0),dr(s,()=>0)}function jl(s,t){const e=new ye(.5,.5,1,s,1,!1,t);return e.translate(0,.5,0),dr(e,()=>0)}function Dv(s=.3){const t=new Xt(1,1,1),e=t.getAttribute("position");for(let n=0;n<e.count;n++)e.getY(n)>0&&(e.setX(n,e.getX(n)*s),e.setZ(n,e.getZ(n)*s));return t.translate(0,.5,0),t.computeVertexNormals(),dr(t,()=>0)}function Iv(){const s=new Xt(1,1,1),t=s.getAttribute("position");for(let e=0;e<t.count;e++)t.getY(e)>0&&(t.setX(e,t.getX(e)*.55+.22),t.setZ(e,t.getZ(e)*.8));return s.translate(0,.5,0),s.computeVertexNormals(),dr(s,()=>0)}function zv(){const s=new Xt(1,1,1);s.translate(0,.5,0);const e=.5+.08,n=.66,i=[-e,n,-e],r=[e,n,-e],o=[e,n,e],a=[-e,n,e],c=[0,1,-e],l=[0,1,e],h=(p,x,g)=>[...p,...x,...g],d=new Float32Array([...h(i,c,l),...h(i,l,a),...h(r,o,l),...h(r,l,c),...h(i,r,c),...h(a,l,o)]),u=new oe;u.setAttribute("position",new fe(d,3)),u.computeVertexNormals();const f=Uv([s,u]);return dr(f,(p,x,g)=>x>.99?Math.abs(p)<.01?3:1:x>.6&&x<.7&&Math.abs(p)>.55?2:0)}function Uv(s){const t=[],e=[];for(const i of s){const r=i.index?i.toNonIndexed():i,o=r.getAttribute("position"),a=r.getAttribute("normal");for(let c=0;c<o.count;c++)t.push(o.getX(c),o.getY(c),o.getZ(c)),e.push(a.getX(c),a.getY(c),a.getZ(c))}const n=new oe;return n.setAttribute("position",new bt(t,3)),n.setAttribute("normal",new bt(e,3)),n.setAttribute("uv",new bt(new Float32Array(t.length/3*2),2)),n}class Nv{group=new Re;lists=new Map;geos;material;count=0;tileSize=1500;tileOx=-3400;tileOz=-4520;tiles=[];shadowDistance=3200;constructor(t){this.material=bv(t),this.geos={box:Lv(),cyl:jl(16,0),oct:jl(8,Math.PI/8),frustum:Dv(.3),shear:Iv(),house:zv()}}add(t,e){const n=Math.floor((e.x-this.tileOx)/this.tileSize),i=Math.floor((e.z-this.tileOz)/this.tileSize),r=`${t}|${n}|${i}`;let o=this.lists.get(r);o||(o=[],this.lists.set(r,o)),o.push(e),this.count++}build(){const t=new Yt,e=new Ae,n=new P,i=new P,r=new Ee;for(const[o,a]of this.lists){const c=o.split("|")[0],l=this.geos[c];l.boundingSphere===null&&l.computeBoundingSphere();const h=l.clone(),d=new Ui(h,this.material,a.length),u=new Float32Array(a.length*3),f=new Float32Array(a.length*4),p=new Float32Array(a.length*4),x=new ke;a.forEach((y,w)=>{n.set(y.x,y.y,y.z),e.setFromEuler(r.set(0,y.rot,0)),i.set(y.w,y.h,y.d),d.setMatrixAt(w,t.compose(n,e,i)),d.setColorAt(w,y.color),u[w*3]=y.w,u[w*3+1]=y.h,u[w*3+2]=y.d,f[w*4]=y.style,f[w*4+1]=y.floorH,f[w*4+2]=y.seed,f[w*4+3]=y.roof,p[w*4]=y.lit,p[w*4+1]=y.warm,p[w*4+2]=y.variant,p[w*4+3]=y.form;const v=Math.hypot(y.w,y.d)*.6;x.expandByPoint(n.set(y.x-v,y.y,y.z-v)),x.expandByPoint(n.set(y.x+v,y.y+y.h,y.z+v))}),h.setAttribute("aDims",new fi(u,3)),h.setAttribute("aStyle",new fi(f,4)),h.setAttribute("aStyle2",new fi(p,4));const g=x.getBoundingSphere(new Ce);d.boundingSphere=g,d.castShadow=!0,d.receiveShadow=!0,d.instanceMatrix.needsUpdate=!0,d.instanceColor&&(d.instanceColor.needsUpdate=!0),this.group.add(d);const m=Math.hypot(x.max.x-x.min.x,x.max.z-x.min.z)/2;this.tiles.push({mesh:d,box:x,center:g.center,r:g.radius,height:x.max.y-x.min.y,lodR:m})}}updateLod(t,e,n){for(const i of this.tiles){const r=Math.max(0,Math.hypot(i.center.x-t,i.center.z-e)-i.lodR),o=n.boxInView(i.box),a=r<this.shadowDistance&&n.casterInView(i.center,i.r,i.height);i.mesh.castShadow=a,i.mesh.visible=o||a,i.mesh.layers.mask=ur("all",o)}}}const Wt={GLASS_BLUE:0,PUNCHED:1,BALCONY:2,DECO:3,INDUSTRIAL:4,HOUSE:5,CONCRETE:6,HOTEL:7,GLASS_GREEN:8,STONE:9,BRICK:10,GRID:11,POOL:12,HELIPAD:13},ls=["#f6f3ec","#f2efe6","#ffffff","#efe9dc","#f4f1ea","#e9e6df","#f8f6f1"],Ka=["#efe4cf","#f1e6cf","#e8dcc3","#f3ead6","#ecdfc4"],Ja=["#f2c9a8","#f0bfa0","#efd1b3","#f4b8a0","#f7cdb6","#eeb497"],nu=["#efc0c6","#f3cfd4","#e9b7c0","#f7d5dc","#e8a9b3"],iu=["#cfe6dc","#bfe0d2","#d8ece2","#b6dccf"],su=["#f5e6b3","#f2dfa1","#f8ecc4","#efd68e"],ru=["#cfe0ec","#dbe8f0","#c3d7e6","#b9d3e3"],Fv=["#3a3633","#4a4440","#2f2d2c","#5a504a","#40372f","#4d4a48"],Ov=["#b98f6a","#a87e5c","#c49a74","#9c6f52","#c8a680","#b07b5b","#8e5e46"],Qa=["#b9b9b4","#a7a9a8","#c6c6c1","#9da3a6","#b5b8ba"],Bv=[...ls,...ls,...Ka,...Ja,...nu,...iu,...su,...ru,"#e6d2b8","#e8c9a0","#dfc7a6"],qt={glassBlue:{style:Wt.GLASS_BLUE,floorH:3.9,tints:["#9fb6c8","#8fa9bd","#b0c4d2","#a7bccb","#8898a8","#c2d0da"],lit:[.25,.7],warm:[.15,.5]},glassGreen:{style:Wt.GLASS_GREEN,floorH:3.8,tints:["#f2f2ee","#e8ebe4","#ffffff","#dfe6e0","#e6e2d6","#d9dfd9"],lit:[.25,.65],warm:[.2,.5]},punched:{style:Wt.PUNCHED,floorH:3.3,tints:[...ls,...Ka],lit:[.2,.55],warm:[.6,.95]},balcony:{style:Wt.BALCONY,floorH:3.2,tints:[...Ka,...ls,"#efe0d3","#f0d9c2"],lit:[.2,.5],warm:[.7,.95]},deco:{style:Wt.DECO,floorH:3.4,tints:[...Ja,...nu,...su,...iu],lit:[.15,.5],warm:[.6,.9]},stone:{style:Wt.STONE,floorH:3.8,tints:Fv,lit:[.3,.7],warm:[.3,.6]},brick:{style:Wt.BRICK,floorH:3.4,tints:Ov,lit:[.2,.5],warm:[.7,.95]},grid:{style:Wt.GRID,floorH:3.5,tints:["#f7f5f0","#f1eee6","#ffffff","#ece9e1"],lit:[.25,.6],warm:[.3,.7]},hotel:{style:Wt.HOTEL,floorH:3.2,tints:[...ls,...Ja,...ru],lit:[.3,.6],warm:[.6,.9]},concrete:{style:Wt.CONCRETE,floorH:3,tints:Qa,lit:[0,0],warm:[.5,.5]},industrial:{tints:["#b8bcc0","#9aa3a8","#cfd3d6","#8e9aa0","#d8c9a8","#c4b89a","#a9b0b5"],lit:[.05,.2],warm:[.2,.4]},house:{tints:Bv,lit:[.2,.6],warm:[.8,1]}};function Hn(s,t){let e=0;for(const[,i]of t)e+=i;let n=s.next()*e;for(const[i,r]of t)if(n-=r,n<=0)return i;return t[t.length-1][0]}function kv(s,t,e){const n=new Nv(e),i=new Ve("city"),r=new Uint8Array(2e3*2e3),o=(v,T)=>{const M=Math.floor((v+1e4)/10),E=Math.floor((T+1e4)/10);return M<0||E<0||M>=2e3||E>=2e3?-1:E*2e3+M},a=(v,T,M)=>{const E=Math.ceil(M/10);for(let b=-E;b<=E;b++)for(let _=-E;_<=E;_++){const S=o(v+_*10,T+b*10);S>=0&&(r[S]=1)}},c=(v,T,M,E,b,_)=>{const S=M/2+_,R=E/2+_,O=Math.hypot(S,R)+8,I=Math.cos(b),A=Math.sin(b),U=Math.floor((v-O+1e4)/10),F=Math.floor((v+O+1e4)/10),D=Math.floor((T-O+1e4)/10),N=Math.floor((T+O+1e4)/10),B=(k,V)=>{const J=k*I+V*A,it=-k*A+V*I;return Math.abs(J)<=S&&Math.abs(it)<=R};for(let k=D;k<=N;k++)for(let V=U;V<=F;V++){if(V<0||k<0||V>=2e3||k>=2e3)continue;const J=V*10-1e4-v,it=k*10-1e4-T;(B(J+5,it+5)||B(J,it)||B(J+10,it)||B(J,it+10)||B(J+10,it+10))&&(r[k*2e3+V]=1)}},l=(v,T)=>{const M=o(v,T);return M>=0&&r[M]===1},h=[],d=(v,T,M,E,b)=>{const _=Math.cos(b),S=Math.sin(b),R=[];for(const[O,I]of[[-M/2,-E/2],[M/2,-E/2],[M/2,E/2],[-M/2,E/2],[0,0],[0,-E/2],[0,E/2],[-M/2,0],[M/2,0]])R.push([v+O*_-I*S,T+O*S+I*_]);return R},u=(v,T,M,E,b,_,S,R,O,I,A={})=>{let U=-1/0;for(const[N,B]of d(T,M,E,_,S))U=Math.max(U,s.heightAt(N,B));if(A.yBase!==void 0&&(U=A.yBase),U<.9)return null;const F=R instanceof Ft?R:new Ft(R);n.add(v,{x:T,y:U-.4,z:M,w:E,h:b+.4,d:_,rot:S,color:F,style:O,floorH:I,seed:i.range(0,1e3),roof:A.roof??5,lit:A.lit??.3,warm:A.warm??.7,variant:A.variant??.5,form:A.form??0});const D=A.margin??3;return D>=0&&c(T,M,E,_,S,D),U+b},f=(v,T,M,E,b)=>{for(const[_,S]of d(v,T,M,E,b))if(s.heightAt(_,S)<1.2)return!1;return!0},p=(v,T,M,E,b)=>{for(const[_,S]of d(v,T,M,E,b))if(l(_,S))return!1;return!0},x=(v,T)=>({tint:T.pick(v.tints),lit:T.range(v.lit[0],v.lit[1]),warm:T.range(v.warm[0],v.warm[1]),variant:T.next()}),g=(v,T,M,E,b,_,S,R,O)=>{const I=Math.cos(S),A=Math.sin(S),U=(B,k)=>[T+B*I-k*A,M+B*A+k*I],F=O.style===Wt.GLASS_BLUE||O.style===Wt.GLASS_GREEN||O.style===Wt.STONE,D=v.pick(Qa);if(v.chance(.7)){const B=E*v.range(.25,.45),k=b*v.range(.3,.5),[V,J]=U(v.range(-E*.22,E*.22),v.range(-b*.2,b*.2));u("box",V,J,B,v.range(3,6),k,S,F?"#8d9296":D,Wt.CONCRETE,3,{yBase:_-.2,margin:-1})}const N=v.int(0,3);for(let B=0;B<N;B++){const[k,V]=U(v.range(-E*.35,E*.35),v.range(-b*.35,b*.35));u("box",k,V,v.range(2,4.5),v.range(1.5,3),v.range(2,4),S,D,Wt.CONCRETE,3,{yBase:_-.2,margin:-1})}if(R>40&&v.chance(.35)){const[B,k]=U(E*.25,-b*.25);u("cyl",B,k,3,3.5,3,S,"#c9c9c4",Wt.CONCRETE,3,{yBase:_-.2,margin:-1})}if(R>100&&v.chance(.22)){const B=Math.min(18,Math.min(E,b)*.5),[k,V]=U(-E*.18,b*.16);u("cyl",k,V,B,.5,B,S,"#444444",Wt.HELIPAD,3,{yBase:_,margin:-1})}if(R>120&&v.chance(.35)){const[B,k]=U(E*.3,b*.3);u("frustum",B,k,1.6,v.range(14,32),1.6,S,"#cfd8dc",Wt.CONCRETE,3,{yBase:_,margin:-1})}R>150&&v.chance(.3)&&u("frustum",T,M,4,v.range(25,50),4,S,"#e3e8ec",Wt.CONCRETE,3,{yBase:_,margin:-1})},m=(v,T,M,E,b,_,S,R,O,I=!0)=>{const A=x(R,v),U={lit:A.lit,warm:A.warm,variant:A.variant},F=Math.cos(E),D=Math.sin(E),N=(J,it)=>[T+J*F-it*D,M+J*D+it*F];let B=null,k=b,V=_;switch(O){case 1:{const J=v.range(.72,.85),it=v.range(.5,.65);u("box",T,M,b,S*v.range(.5,.62),_,E,A.tint,R.style,R.floorH,U),u("box",T,M,b*J,S*v.range(.78,.88),_*J,E,A.tint,R.style,R.floorH,U),B=u("box",T,M,b*it,S,_*it,E,A.tint,R.style,R.floorH,U),k=b*it,V=_*it;break}case 2:{k=Math.min(b,_)*.62,V=Math.max(b,_)*1.15,B=u("box",T,M,k,S,V,E,A.tint,R.style,R.floorH,U);break}case 3:{const J=N(-b*.2,0),it=N(b*.15,-_*.22);u("box",J[0],J[1],b*.6,S,_,E,A.tint,R.style,R.floorH,U),B=u("box",it[0],it[1],b*.7,S*v.range(.6,1),_*.56,E,A.tint,R.style,R.floorH,U),k=b*.6,V=_;break}case 4:{const J=b*.18,it=b*.41,X=N(-(it+J)/2,0),tt=N((it+J)/2,0);u("box",X[0],X[1],it,S,_*.8,E,A.tint,R.style,R.floorH,U),B=u("box",tt[0],tt[1],it,S*v.range(.85,1),_*.8,E,A.tint,R.style,R.floorH,U),u("box",T,M,J+2,4,_*.4,E,"#dfe4e8",Wt.CONCRETE,3,{yBase:(B??0)-S*.45,margin:-1}),k=it,V=_*.8;break}case 5:{B=u("box",T,M,b,S*.88,_,E,A.tint,R.style,R.floorH,U);const J=x(qt.glassBlue,v);B=u("box",T,M,b*.86,S,_*.86,E,J.tint,Wt.GLASS_BLUE,3.9,{lit:.7,warm:.3,variant:J.variant}),k=b*.86,V=_*.86;break}case 6:{const J=[[1,.55],[.86,.72],[.7,.88],[.5,1]];for(const[it,X]of J)B=u("box",T,M,b*it,S*X,_*it,E,A.tint,R.style,R.floorH,U);B!==null&&u("frustum",T,M,3.5,S*.18,3.5,E,"#e8e4dc",Wt.CONCRETE,3,{yBase:B,margin:-1}),k=b*.5,V=_*.5;break}case 7:{const J=v.chance(.45)?"cyl":"oct";k=V=Math.min(b,_),B=u(J,T,M,k,S,V,E,A.tint,R.style,R.floorH,U);break}case 8:{B=u("box",T,M,b,S*.9,_,E,A.tint,R.style,R.floorH,U),B!==null&&(u("frustum",T,M,b,S*.1+6,_,E,A.tint,R.style,R.floorH,{...U,yBase:B-.1,margin:-1}),I=!1);break}default:B=u("box",T,M,b,S,_,E,A.tint,R.style,R.floorH,U)}if(B!==null&&I){const[J,it]=O===3?N(-b*.2,0):O===4?N((b*.41+b*.18)/2,0):[T,M];g(v,J,it,k,V,B,E,S,R)}return B},y=s.districts.find(v=>v.id==="downtown"),w=(v,T,M,E)=>{const b=Math.cos(y.rot),_=Math.sin(y.rot),S=y.cx+T*b-M*_,R=y.cz+T*_+M*b,O=s.heightAt(S,R);if(O<1)return;const I=E(S,R,O);h.push({x:S,z:R,h:I,name:v}),a(S,R,46)};w("Meridian Tower",120,-80,(v,T,M)=>{const E={lit:.6,warm:.3,variant:.2};return u("box",v,T,46,150,46,.1,"#9fb6c8",Wt.GLASS_BLUE,3.9,E),u("box",v,T,38,230,38,.1,"#9fb6c8",Wt.GLASS_BLUE,3.9,E),u("box",v,T,28,285,28,.1,"#b0c4d2",Wt.GLASS_BLUE,3.9,E),u("frustum",v,T,5,45,5,.1,"#e8eef2",Wt.CONCRETE,3,{yBase:M+285,margin:-1}),330}),w("Bahía One",-40,70,(v,T,M)=>{const E={lit:.65,warm:.25,variant:.8};return u("oct",v,T,46,262,46,.05,"#8898a8",Wt.GLASS_BLUE,3.9,E),u("box",v,T,16,8,14,.05,"#8d9296",Wt.CONCRETE,3,{yBase:M+262,margin:-1}),u("cyl",v+10,T+9,16,.5,16,0,"#444444",Wt.HELIPAD,3,{yBase:M+262,margin:-1}),u("frustum",v-8,T-6,1.8,30,1.8,0,"#cfd8dc",Wt.CONCRETE,3,{yBase:M+262,margin:-1}),292}),w("Faro Bahía",-180,40,(v,T,M)=>(u("cyl",v,T,40,240,40,0,"#e8ebe4",Wt.GLASS_GREEN,3.8,{lit:.55,warm:.4,variant:.6}),u("cyl",v,T,48,12,48,0,"#e8eef2",Wt.CONCRETE,3,{yBase:M+232,margin:-1}),u("cyl",v,T,20,4,20,0,"#dfe4e8",Wt.CONCRETE,3,{yBase:M+244,margin:-1}),248)),w("Twin Palms A",40,210,(v,T)=>(u("box",v,T,30,182,56,.05,"#efe4cf",Wt.BALCONY,3.3,{lit:.35,warm:.85,variant:.4}),182)),w("Twin Palms B",110,210,(v,T,M)=>(u("box",v,T,30,182,56,.05,"#efe4cf",Wt.BALCONY,3.3,{lit:.4,warm:.85,variant:.4}),u("box",v-35,T,44,6,12,.05,"#dfe4e8",Wt.CONCRETE,3.3,{yBase:M+118,margin:-1}),182)),w("The Sail",-60,-250,(v,T)=>(u("shear",v,T,60,205,44,.9,"#b0c4d2",Wt.GLASS_BLUE,3.9,{lit:.5,warm:.3,variant:.9}),205)),w("Terraces",260,120,(v,T)=>{for(let M=0;M<5;M++)u("box",v+M*6,T-M*4,60-M*8,45+M*28,40,0,"#f7f5f0",Wt.GRID,3.5,{lit:.4,warm:.5,variant:.3});return 160}),w("Crown Plaza",-300,-180,(v,T,M)=>{u("box",v,T,42,200,42,.2,"#3a3633",Wt.STONE,3.8,{lit:.6,warm:.4,variant:.5});for(let E=0;E<4;E++){const b=.2+E*Math.PI/2;u("box",v+Math.cos(b)*14,T+Math.sin(b)*14,3,30,14,b,"#e8eef2",Wt.CONCRETE,3,{yBase:M+198,margin:-1})}return 230}),w("Helix",330,-240,(v,T,M)=>{for(let E=0;E<12;E++)u("box",v,T,34,16.5,34,E*.1,"#e6e2d6",Wt.GLASS_GREEN,3.9,{yBase:M+E*16,lit:.5,warm:.3,variant:.2});return 198}),w("Aquamarine",-380,230,(v,T)=>{const M={lit:.55,warm:.2,variant:.6};return u("box",v,T,18,228,62,0,"#8fa9bd",Wt.GLASS_BLUE,3.9,M),u("box",v,T,62,228,18,0,"#8fa9bd",Wt.GLASS_BLUE,3.9,M),u("frustum",v,T,24,250,24,0,"#c2d0da",Wt.GLASS_BLUE,3.9,M),250});for(const v of s.districts){const T=t.get(v.id),M=Math.cos(v.rot),E=Math.sin(v.rot),b=(S,R)=>[v.cx+S*M-R*E,v.cz+S*E+R*M];if(!T)continue;const _=i.fork(v.id);for(const S of T){let R=function(){const ot=1-Nt(.2,1,tt),mt=V>80&&J>70?2:1;for(let H=0;H<mt;H++){const Pt=_.range(22,Math.min(48,V*.55)),gt=_.range(22,Math.min(48,J*.6)),At=mt===1?(D+N)/2+_.range(-V*.1,V*.1):ue(D+Pt/2+4,N-Pt/2-4,H),vt=(B+k)/2+_.range(-J*.15,J*.15),[kt,yt]=b(At,vt);if(!f(kt,yt,Pt,gt,v.rot)||!p(kt,yt,Pt+6,gt+6,v.rot))continue;const z=_.next();let C;z<.07+.22*ot?C=_.range(120,205):z<.45+.2*ot?C=_.range(70,120):C=_.range(36,72),C*=ue(.6,1,ot),C=Math.max(28,C);const $=C>110?Hn(_,[[qt.glassBlue,.34],[qt.glassGreen,.16],[qt.punched,.1],[qt.balcony,.08],[qt.deco,.08],[qt.stone,.14],[qt.grid,.1]]):C>60?Hn(_,[[qt.glassBlue,.2],[qt.glassGreen,.12],[qt.punched,.16],[qt.balcony,.14],[qt.deco,.14],[qt.stone,.1],[qt.grid,.1],[qt.brick,.04]]):Hn(_,[[qt.glassBlue,.1],[qt.glassGreen,.08],[qt.punched,.2],[qt.balcony,.12],[qt.deco,.18],[qt.stone,.06],[qt.grid,.1],[qt.brick,.16]]);if(C>55&&_.chance(.6)){const Q=Math.min(V*.92,Pt+_.range(14,36)),ft=Math.min(J*.92,gt+_.range(14,36)),ct=_.range(8,18);if(_.chance(.45))u("box",kt,yt,Q,ct,ft,v.rot,_.pick(Qa),Wt.CONCRETE,3.4,{lit:.1,warm:.5});else{const _t=x($.style===Wt.STONE?qt.punched:$,_);u("box",kt,yt,Q,ct,ft,v.rot,_t.tint,$.style===Wt.STONE?Wt.PUNCHED:$.style,$.floorH,{lit:_t.lit,warm:_t.warm,variant:_t.variant})}}let q;const G=_.next();$.style===Wt.DECO&&C>60?q=G<.55?6:G<.8?1:0:C>110?q=G<.28?1:G<.4?7:G<.52?5:G<.62?8:G<.72?4:G<.8?2:0:C>60?q=G<.18?1:G<.3?7:G<.42?3:G<.5?2:G<.58?8:0:q=G<.25?3:G<.35?2:0,m(_,kt,yt,v.rot,Pt,gt,C,$,q)}const ut=_.range(14,26),nt=_.range(14,26),lt=[[D+ut/2,B+nt/2],[N-ut/2,B+nt/2],[N-ut/2,k-nt/2],[D+ut/2,k-nt/2]];for(const[H,Pt]of lt){if(_.next()>.6)continue;const[gt,At]=b(H,Pt);if(!f(gt,At,ut,nt,v.rot)||!p(gt,At,ut+4,nt+4,v.rot))continue;const vt=Hn(_,[[qt.brick,.35],[qt.punched,.3],[qt.deco,.25],[qt.concrete,.1]]),kt=x(vt,_);u("box",gt,At,ut,_.range(8,24),nt,v.rot,kt.tint,vt.style,vt.floorH,{lit:kt.lit,warm:kt.warm,variant:kt.variant})}},O=function(){const ot=Math.max(1,Math.round(V*J/1800));for(let mt=0,ut=0;mt<ot*2&&ut<ot;mt++){const nt=_.range(16,Math.min(44,V*.75)),lt=_.range(16,Math.min(44,J*.75)),H=_.range(D+nt/2,N-nt/2),Pt=_.range(B+lt/2,k-lt/2),[gt,At]=b(H,Pt);if(!f(gt,At,nt,lt,v.rot)||!p(gt,At,nt+4,lt+4,v.rot))continue;ut++;let vt=ue(v.hMin,v.hMax,Math.pow(_.next(),2))*ue(.75,1.15,K);vt=Kt(vt,v.hMin*.8,v.hMax);const kt=vt>50?Hn(_,[[qt.balcony,.3],[qt.punched,.2],[qt.grid,.15],[qt.deco,.1],[qt.glassGreen,.15],[qt.glassBlue,.1]]):Hn(_,[[qt.brick,.28],[qt.punched,.24],[qt.deco,.16],[qt.balcony,.16],[qt.grid,.1],[qt.concrete,.06]]),yt=_.next(),z=Math.max(V,J)>90&&Math.min(nt,lt)>20,C=vt>45?yt<.25?1:yt<.35?7:yt<.5&&z?2:yt<.6?3:0:yt<.25?3:yt<.35&&z?2:0;m(_,gt,At,v.rot+_.range(-.03,.03),nt,lt,vt,kt,C,vt>20)}},I=function(){const ot=_.chance(.65),mt=ot?_.range(18,30):_.range(24,40),ut=ot?Math.min(J*.85,_.range(50,95)):_.range(24,40),[nt,lt]=b((D+N)/2+_.range(-6,6),(B+k)/2);if(!f(nt,lt,mt,ut,v.rot)||!p(nt,lt,mt+4,ut+4,v.rot))return;const H=ue(v.hMin,v.hMax,Math.pow(_.next(),1.5)),Pt=ot?Hn(_,[[qt.hotel,.55],[qt.balcony,.25],[qt.deco,.2]]):Hn(_,[[qt.glassGreen,.3],[qt.balcony,.25],[qt.deco,.2],[qt.glassBlue,.15],[qt.punched,.1]]),gt=_.next(),At=ot?0:gt<.3?7:gt<.5?1:gt<.6?8:0;m(_,nt,lt,v.rot,mt,ut,H,Pt,At);const[vt,kt]=b((D+N)/2+mt*.5+12,(B+k)/2);if(f(vt,kt,18,ut*.7,v.rot)&&p(vt,kt,18,ut*.7,v.rot)){const yt=x(qt.punched,_),z=u("box",vt,kt,18,_.range(4,9),ut*.7,v.rot,yt.tint,Wt.PUNCHED,3.2,{lit:yt.lit,warm:yt.warm});z!==null&&_.chance(.7)&&u("house",vt,kt,_.range(6,10),.4,Math.min(ut*.4,_.range(12,24)),v.rot,"#3fc4de",Wt.POOL,3,{yBase:z,form:2,margin:-1})}},A=function(){const ot=_.range(16,24),mt=Math.min(30,J/2-2),ut=Hn(_,[[0,.3],[2,.14],[5,.16],[6,.14],[1,.12],[7,.1],[3,.04]]),nt=J>=40?[[B+mt/2,0],[k-mt/2,Math.PI]]:[[(B+k)/2,0]];for(const[lt,H]of nt){let Pt=D+ot/2;for(;Pt<N-ot/2;){const gt=_.range(8,14),At=_.range(9,17),vt=Math.max(ot*_.range(.9,1.25),gt+6),kt=Pt;if(Pt+=vt,_.next()>(v.density+.15)*et)continue;const yt=H===0?1:-1,z=v.rot+H+_.range(-.12,.12),[C,$]=b(kt+_.range(-1.5,1.5),lt-yt*_.range(-3,3));if(_.next()<.08*K){const wt=Math.min(22,vt-4),Lt=_.range(12,18);if(wt<12||!f(C,$,wt,Lt,z)||l(C,$))continue;const Ht=_.chance(.5)?qt.brick:qt.punched,St=x(Ht,_);u("house",C,$,wt,_.range(7,11),Lt,z,St.tint,Ht.style,3.1,{lit:St.lit,warm:St.warm,variant:St.variant,form:2,margin:1});continue}if(!f(C,$,gt,At,z)||l(C,$))continue;const q=_.chance(.28)?2:1,G=_.next(),Q=G<.42?0:G<.78?1:2,ft=Q===2?q*3.1+.6:q*3.1/.68,ct=_.chance(.65)?ut:_.pick([0,1,2,3,4,5,6,7]),_t=x(qt.house,_);u("house",C,$,gt,ft,At,z,_t.tint,Wt.HOUSE,3,{roof:ct,form:Q,lit:_t.lit,warm:_t.warm,variant:_t.variant,margin:1});const Ot=Math.cos(z),ht=Math.sin(z);if(_.chance(.3)&&vt-gt>9){const wt=_.chance(.5)?1:-1,Lt=C+wt*(gt/2+3.2)*Ot,Ht=$+wt*(gt/2+3.2)*ht;f(Lt,Ht,5.5,6,z)&&u("house",Lt,Ht,5.5,2.9,6,z,_t.tint,Wt.HOUSE,3,{roof:ct,form:2,lit:0,margin:.5})}if(_.chance(.28)){const[wt,Lt]=b(kt,lt+yt*(At/2+6));f(wt,Lt,6,4,v.rot)&&u("house",wt,Lt,_.range(5,9),.4,_.range(3.5,5),v.rot,"#3fc4de",Wt.POOL,3,{form:2,margin:.5,yBase:s.heightAt(wt,Lt)})}}}},U=function(){const ot=Math.max(1,Math.round(V*J/3600));for(let mt=0,ut=0;mt<ot*3&&ut<ot;mt++){const nt=_.range(28,Math.min(80,V*.85)),lt=_.range(22,Math.min(60,J*.85)),H=_.range(D+nt/2,N-nt/2),Pt=_.range(B+lt/2,k-lt/2),[gt,At]=b(H,Pt);if(!f(gt,At,nt,lt,v.rot)||!p(gt,At,nt,lt,v.rot))continue;ut++;const vt=x(qt.industrial,_),kt=_.range(8,15),yt=u("box",gt,At,nt,kt,lt,v.rot,vt.tint,Wt.INDUSTRIAL,4,{lit:vt.lit,warm:vt.warm,variant:vt.variant});if(yt!==null){if(_.chance(.5)&&u("box",gt,At,nt+.6,.5,lt+.6,v.rot,"#8f9599",Wt.CONCRETE,3,{yBase:yt-.05,margin:-1}),_.chance(.3)){const[z,C]=b(H-nt/2+8,Pt+lt/2+8);f(z,C,14,10,v.rot)&&u("box",z,C,14,_.range(6,10),10,v.rot,_.pick(ls),Wt.PUNCHED,3.2,{lit:.3,warm:.6})}if(_.chance(.3)){const[z,C]=b(H+nt/2+9,Pt-lt/2+8);f(z,C,12,12,v.rot)&&u("cyl",z,C,_.range(7,12),_.range(7,13),_.range(7,12),0,"#dcdcd4",Wt.CONCRETE,3)}}}};const F=S.streetWidth*.5+3,D=S.x0+F,N=S.x1-F,B=S.z0+F,k=S.z1-F,V=N-D,J=k-B;if(V<12||J<12)continue;const[it,X]=b((D+N)/2,(B+k)/2),tt=Math.hypot(it-v.cx,X-v.cz)/Math.max(v.hw,v.hh),dt=Math.hypot(it-y.cx,X-y.cz),K=1-Nt(600,4e3,dt),et=1-.45*Nt(2500,8500,dt);if(!(_.next()>v.density*(v.zone===te.RES_LOW?et:1)))switch(v.zone){case te.DOWNTOWN:R();break;case te.RES_MID:O();break;case te.HOTEL:I();break;case te.RES_LOW:A();break;case te.INDUSTRIAL:U();break}}}return n.build(),{batches:n,landmarkPositions:h,occupied:l,markOccupied:a}}function Hv(s){const n=document.createElement("canvas");n.width=256,n.height=512;const i=n.getContext("2d");i.clearRect(0,0,256,512),i.fillStyle="#8a7458",i.fillRect(256/2,0,256/2,512);for(let a=0;a<512;a+=9)i.fillStyle=a%18===0?"#6e5a44":"#9a8466",i.fillRect(256/2,a,256/2,4);for(let a=0;a<140;a++)i.fillStyle=`rgba(40,30,20,${.1+s.next()*.2})`,i.fillRect(256/2+s.next()*256/2,s.next()*512,3+s.next()*6,2);i.save(),i.beginPath(),i.rect(0,0,256/2,512),i.clip(),i.strokeStyle="#6b7a3a",i.lineWidth=5,i.beginPath(),i.moveTo(256/4,512),i.lineTo(256/4,8),i.stroke();const r=256/2;for(let a=0;a<46;a++){const c=a/46,l=492-c*472,h=(r/2-4)*(.45+.55*Math.sin(Math.PI*Math.min(1,c*1.15))),d=60+Math.round(40*Math.sin(c*7+a));i.fillStyle=`rgb(${40+a%3*8}, ${110+d*.6}, ${40+a%5*5})`;for(const u of[-1,1])i.beginPath(),i.moveTo(r/2,l),i.quadraticCurveTo(r/2+u*h*.5,l-18,r/2+u*h,l-34+6*Math.sin(a)),i.quadraticCurveTo(r/2+u*h*.55,l-6,r/2,l+4),i.fill()}i.restore();const o=new lr(n);return o.colorSpace=nn,o.anisotropy=4,o}const ar=6;function Gv(s){const e=128*ar,n=128,i=document.createElement("canvas");i.width=e,i.height=n;const r=i.getContext("2d"),o=r.createImageData(e,n),a=o.data,c=(p,x,g,m)=>{const y=(x*e+p)*4;m<=a[y+3]||(a[y]=a[y+1]=a[y+2]=Math.round(255*Math.min(1,Math.max(0,g))),a[y+3]=Math.round(255*Math.min(1,m)))},l=(p,x,g,m,y,w,v)=>{for(let T=0;T<128;T++)for(let M=0;M<128;M++){const E=(M+.5)/128,b=1-(T+.5)/128,_=E-x,S=b-g,R=Math.atan2(S,_),O=m*(1+.14*re(Math.cos(R)*2.1+v,Math.sin(R)*2.1+v*.7)+.06*re(E*30+v,b*30)),I=Math.hypot(_,S);if(I>O)continue;const A=I/O,U=.5+.5*(S/O),F=.5+.5*re(E*22+v*3,b*22-v),D=(w+(y-w)*U)*(.82+.36*F)*(1-.35*A*A);c(p*128+M,T,D,1)}},h=(p,x,g,m,y)=>{for(let w=0;w<128;w++)for(let v=0;v<128;v++){const T=(v+.5)/128,M=1-(w+.5)/128,E=T-x,b=M-g,_=Math.atan2(b,E),S=m*(1+.16*re(Math.cos(_)*2.3+y,Math.sin(_)*2.3-y)),R=Math.hypot(E,b);if(R>S)continue;const O=R/S,I=.5+.5*re(T*26+y,M*26+y*2),U=(.62+.5*(.5+.5*re(T*9-y,M*9+y)))*(.8+.4*I)*(1-.45*O*O);c(p*128+v,w,U,1)}},d=(p,x,g,m,y,w)=>{for(let v=0;v<128;v++)for(let T=0;T<128;T++){const M=(T+.5)/128,E=1-(v+.5)/128;E<g||E>m||Math.abs(M-x)>y*(1-.4*(E-g)/(m-g))||c(p*128+T,v,w*(.85+.3*re(M*40,E*40)),1)}},u=(p,x,g,m,y,w,v)=>{for(let T=0;T<y;T++){const M=T/y*Math.PI*2+.4*re(T*1.7+v,v);for(let E=0;E<=1;E+=.01){const b=m*(.75+.25*re(T*3.1,v+T)),_=x+Math.cos(M)*b*E,S=g+Math.sin(M)*b*E*(1-w)-w*m*E*E,R=.045*m*(1-.5*E)/.25;for(let O=-1;O<=1;O+=.25){const I=_-Math.sin(M)*R*O,A=S+Math.cos(M)*R*O,U=Math.floor(I*128),F=Math.floor((1-A)*128);U<0||F<0||U>=128||F>=128||c(p*128+U,F,.75+.35*E-.2*Math.abs(O),1)}}}};d(0,.5,0,.3,.035,.42),l(0,.5,.5,.385,1.15,.45,3+s.next()),l(0,.36,.42,.2,.95,.4,7+s.next()),l(0,.63,.44,.19,1,.42,11+s.next()),d(1,.5,0,.34,.03,.4),l(1,.47,.52,.34,1.1,.42,21+s.next()),l(1,.66,.6,.22,1.2,.5,25+s.next()),l(1,.3,.4,.17,.9,.38,29+s.next()),l(1,.56,.3,.16,.85,.35,33+s.next()),d(2,.5,0,.5,.022,.55),u(2,.5,.52,.24,9,.35,2+s.next()),h(3,.5,.5,.4,5+s.next()),h(4,.5,.5,.38,15+s.next()),h(4,.68,.6,.2,17+s.next()),u(5,.5,.5,.26,9,0,6+s.next());for(let p=0;p<128;p++)for(let x=0;x<128;x++){const g=(p*e+640+x)*4;a[g+3]===0&&Math.hypot((x+.5)/128-.5,(p+.5)/128-.5)<.05&&(a[g]=a[g+1]=a[g+2]=140,a[g+3]=255)}r.putImageData(o,0,0);const f=new lr(i);return f.colorSpace=In,f.minFilter=ui,f.magFilter=ve,f.anisotropy=4,f.generateMipmaps=!0,f}function Vv(s,t){const n=new vc(1,0).getAttribute("position"),i=[],r=[],o=[];for(let a=0;a<n.count;a++){const c=n.getX(a),l=n.getY(a),h=n.getZ(a),d=1+.3*re(c*2.1+s,l*2.1+h*1.7-s);i.push(c*d,l*d*(l<0?.65:1),h*d),r.push(c,l,h),o.push(t)}return{pos:i,nrm:r,part:o}}function Wv(){const s=[],t=[],e=[],n=[];for(let a=0;a<3;a++){const c=a/3*Math.PI*2,l=(a+1)/3*Math.PI*2,h=Math.cos(c)*.045,d=Math.sin(c)*.045,u=Math.cos(l)*.045,f=Math.sin(l)*.045,p=Math.cos((c+l)/2),x=Math.sin((c+l)/2),g=[[h,0,d],[u,0,f],[u,1,f],[h,0,d],[u,1,f],[h,1,d]];for(const[m,y,w]of g)s.push(m,y,w),t.push(p,0,x),e.push(0),n.push(0,y)}for(const[a,c]of[[3.1,1],[8.7,2],[14.3,3]]){const l=Vv(a,c);s.push(...l.pos),t.push(...l.nrm),e.push(...l.part);for(let h=0;h<l.part.length;h++)n.push(0,0)}const o=new oe;return o.setAttribute("position",new bt(s,3)),o.setAttribute("normal",new bt(t,3)),o.setAttribute("uv",new bt(n,2)),o.setAttribute("aPart",new bt(e,1)),o.boundingSphere=new Ce(new P(0,1.2,0),2.6),o}function Xv(){const s=[],t=[],e=[],n=[],o=l=>{const h=.045*(1-.3*l),d=[];for(let u=0;u<=4;u++){const f=u/4*Math.PI*2+Math.PI/4;d.push([Math.cos(f)*h,l,Math.sin(f)*h])}return d};for(let l=0;l<3;l++){const h=o(l/3),d=o((l+1)/3);for(let u=0;u<4;u++){const f=(u+.5)/4*Math.PI*2+Math.PI/4,p=Math.cos(f),x=Math.sin(f),g=[h[u],h[u+1],d[u+1],h[u],d[u+1],d[u]],m=[.55+.4*(u/4),.55+.4*((u+1)/4),.55+.4*((u+1)/4),.55+.4*(u/4),.55+.4*((u+1)/4),.55+.4*(u/4)];g.forEach(([y,w,v],T)=>{s.push(y,w,v),t.push(p,0,x),e.push(m[T],w),n.push(0)})}}const a=7;for(let l=0;l<a;l++){const h=l/a*Math.PI*2,d=.56,u=.14,f=[];for(let x=0;x<=2;x++){const g=x/2,m=d*g,y=1+.16*Math.sin(g*Math.PI*.8)-.5*g*g,w=Math.cos(h)*m,v=Math.sin(h)*m,T=-Math.sin(h)*u*(1-g*.25),M=Math.cos(h)*u*(1-g*.25);f.push([w-T,y,v-M],[w+T,y,v+M])}const p=(x,g,m)=>{for(const y of[x,g,m]){s.push(f[y][0],f[y][1],f[y][2]),t.push(0,1,0),n.push(l+1);const w=Math.floor(y/2),v=y%2;e.push(v*.5,1-w/2)}};p(0,2,1),p(1,2,3),p(2,4,3),p(3,4,5)}const c=new oe;return c.setAttribute("position",new bt(s,3)),c.setAttribute("normal",new bt(t,3)),c.setAttribute("uv",new bt(e,2)),c.setAttribute("aPart",new bt(n,1)),c.boundingSphere=new Ce(new P(0,.8,0),1.2),c}function qv(){const s=new oe;return s.setAttribute("position",new bt([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,-.5,0,.5,.5,0,-.5,.5,0],3)),s.setAttribute("normal",new bt([0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0],3)),s.setAttribute("uv",new bt([0,0,1,0,1,1,0,0,1,1,0,1],2)),s.boundingSphere=new Ce(new P(0,0,0),2),s}const ou=`
uniform float uTime;
uniform float uWind;
attribute float aPart;
attribute vec4 aVar; // archetype, seed, crown squash / frond droop, trunk length
varying float vPart;
varying vec3 vWP;
${Sn}
`,Yv=`
vec3 objectNormal = normal;
// foliage normals lean toward the sky so a crown shades as a lit mass of leaves, not a hard ball
if (aPart > 0.5) objectNormal = normalize(mix(normalize(objectNormal * vec3(1.0, 1.0 / max(aVar.z, 0.3), 1.0)), vec3(0.0, 1.0, 0.0), 0.35));
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif
`,$v=`
vec3 transformed = position;
{
  float seed = aVar.y;
  float squash = aVar.z;
  float trunkLen = aVar.w;
  if (aPart < 0.5) {
    transformed.y *= trunkLen + 0.25 * squash;
    transformed.xz *= 0.8 + 0.5 * step(0.5, aVar.x) * step(aVar.x, 1.5);
  } else {
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
`,jv=`
varying float vPart;
varying vec3 vWP;
${Sn}
`,Zv=`
#include <color_fragment>
{
  if (vPart < 0.5) {
    diffuseColor.rgb = vec3(0.30, 0.23, 0.16) * (0.8 + 0.4 * vnoise(vWP.xz * 3.0 + vWP.y * 2.0));
  } else {
    // leaf clusters: fine value noise breaks the smooth shading of the puffs
    float leaf = vnoise(vWP.xz * 1.7 + vWP.y * 1.3);
    diffuseColor.rgb *= 0.78 + 0.44 * leaf;
  }
}
`,Kv=`
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
`,Jv=`
vec3 transformed = position;
{
  float seed = aVar.y;
  float lean = 0.03 + 0.12 * hash11(seed * 5.1);
  float leanDir = hash11(seed * 9.3) * 6.2831;
  if (aPart > 0.5) {
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
`,au=`
attribute vec4 aVar; // archetype (0 crown, 1 palm), seed, card size (unit), crown centre height (unit)
varying vec2 vCardUv;
varying float vElev;
varying float vCol; // atlas column of the side view (top view is 3 columns further)
`,cu=`
vec4 mvPosition;
{
  vec4 centre = instanceMatrix * vec4(0.0, aVar.w, 0.0, 1.0);
  vec3 wc = (modelMatrix * centre).xyz;
  float s = length(instanceMatrix[0].xyz);
  vec3 toCam = cameraPosition - wc;
  vElev = smoothstep(0.3, 0.85, abs(toCam.y) / max(length(toCam), 1.0));
  vec4 mvCentre = modelViewMatrix * centre;
  // mirror every other card so the same atlas tile reads as two silhouettes
  float flip = step(0.5, fract(aVar.y * 37.0)) * 2.0 - 1.0;
  mvPosition = mvCentre + vec4(position.xy * aVar.z * s, 0.0, 0.0);
  gl_Position = projectionMatrix * mvPosition;
  vCardUv = vec2(flip > 0.0 ? uv.x : 1.0 - uv.x, uv.y);
  vCol = aVar.x > 0.5 ? 2.0 : step(0.5, fract(aVar.y * 11.0));
}
`,lu=`
uniform sampler2D uAtlas;
varying vec2 vCardUv;
varying float vElev;
varying float vCol;
`,Qv=`
{
  vec4 side = texture2D(uAtlas, vec2((vCardUv.x + vCol) / ${ar}.0, vCardUv.y));
  vec4 top = texture2D(uAtlas, vec2((vCardUv.x + vCol + 3.0) / ${ar}.0, vCardUv.y));
  diffuseColor.a = mix(side, top, vElev).a;
}
`,tx=`
#include <color_fragment>
{
  vec4 side = texture2D(uAtlas, vec2((vCardUv.x + vCol) / ${ar}.0, vCardUv.y));
  vec4 top = texture2D(uAtlas, vec2((vCardUv.x + vCol + 3.0) / ${ar}.0, vCardUv.y));
  vec4 t = mix(side, top, vElev);
  if (t.a < 0.5) discard;
  diffuseColor.rgb *= t.r * 1.05;
}
`;function ex(s,t){const e=new le({color:16777215,roughness:.88});return e.onBeforeCompile=n=>{n.uniforms.uTime=s,n.uniforms.uWind=t,n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
${ou}`).replace("#include <beginnormal_vertex>",Yv).replace("#include <begin_vertex>",$v),n.fragmentShader=n.fragmentShader.replace("#include <common>",`#include <common>
${jv}`).replace("#include <color_fragment>",Zv)},e.customProgramCacheKey=()=>"veg-crown-v4",e}function nx(s,t,e){const n=new le({map:s,alphaTest:.5,alphaToCoverage:!0,side:Be,roughness:.75,color:16777215});return n.onBeforeCompile=i=>{i.uniforms.uTime=t,i.uniforms.uWind=e,i.vertexShader=i.vertexShader.replace("#include <common>",`#include <common>
${ou}`).replace("#include <beginnormal_vertex>",Kv).replace("#include <begin_vertex>",Jv),i.fragmentShader=i.fragmentShader.replace("#include <common>",`#include <common>
varying float vPart; varying vec3 vWP;`)},n.customProgramCacheKey=()=>"veg-palm-v4",n}function ix(s){const t=new Vh({depthPacking:Sh,alphaTest:.5,side:Be});return t.onBeforeCompile=e=>{e.uniforms.uAtlas={value:s},e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
${au}`).replace("#include <project_vertex>",cu),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
${lu}`).replace("#include <map_fragment>",Qv)},t.customProgramCacheKey=()=>"veg-card-depth-v3",t}function sx(s){const t=new le({color:16777215,roughness:.9,alphaTest:.5,alphaToCoverage:!0,side:Be});return t.onBeforeCompile=e=>{e.uniforms.uAtlas={value:s},e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
${au}`).replace("#include <project_vertex>",cu),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
${lu}`).replace("#include <color_fragment>",tx)},t.customProgramCacheKey=()=>"veg-card-v4",t}const Zl=900,rx=650,ox=6e4,ax={0:["#2c5a2a","#35662f","#244d22","#3d7034","#2f6136","#47783b","#223f1e","#3a6a2c","#6b7a3a","#33613a","#4f7f3a","#5a8a3e","#73913f","#3f7a3f","#5c7d2f"],1:["#1f4520","#2b5528","#365f2f","#254a25","#3b6a33","#4a7a3a"],2:["#2d4f26","#395b2c","#263f1f","#43663a","#334f2a","#4f6b33"],3:["#5d8a44","#6b9550","#4f7a3a","#7a9a48","#8a9a4a"],4:["#5e8a3a","#527f31","#6c9a42","#4a7229","#739c46","#5f8f3c"]};class cx{group=new Re;materials=[];uTime={value:0};uWind={value:.5};counts={palms:0,trees:0,mangroves:0,shrubs:0};tiles=[];shadowDistance=1800;viewDistance=9e3;constructor(t,e){const n=new Ve("vegetation"),i=Hv(n.fork("fronds")),r=Gv(n.fork("atlas")),o=ex(this.uTime,this.uWind),a=nx(i,this.uTime,this.uWind),c=sx(r),l=ix(r);this.materials.push(o,a,c);const h=Wv(),d=Xv(),u=qv(),f=[],p={0:[],1:[],2:[],3:[],4:[]};for(const A of[0,1,2,3,4])p[A]=ax[A].map(U=>new Ft(U));const x=(A,U,F,D,N,B)=>{const k=B.pick(p[A]).clone();k.offsetHSL(B.range(-.025,.025),B.range(-.08,.06),B.range(-.06,.04));const V=A===2?B.range(.5,.7):A===3?B.range(.6,.85):A===1?B.range(.95,1.25):B.range(.7,1),J=A===2?B.range(.15,.3):A===3?.02:A===1?B.range(.6,.95):B.range(.3,.55);f.push({x:U,y:D,z:F,s:N,rot:B.range(0,Math.PI*2),tint:k,arche:A,seed:B.next(),squash:V,trunk:J})},g=t.n,m=t.zone,y=t.veg,w=t.height;for(let A=0;A<g;A++)for(let U=0;U<g;U++){const F=A*g+U,D=m[F];if(D===te.OCEAN||D===te.BAY||D===te.SANDBAR||D===te.ROCK||D===te.LOT||D===te.CONSTRUCTION||D===te.STADIUM||D===te.ROAD||D===te.MARINA||w[F]<.12)continue;const N=y[F]/255,B=-He+(U+.5)*Pi,k=-He+(A+.5)*Pi,V=re(B/150,k/150),J=re(B/420+9,k/420-3);let it=0,X=1;switch(D){case te.MANGROVE:it=.95,X=3;break;case te.BEACH:it=.2;break;case te.PARK:it=.06+.94*Nt(.35,.95,N)+.08*V,X=N>.6?3:N>.3?2:1;break;case te.RES_LOW:it=.05+.75*Nt(.25,.95,N)+.05*V,X=N>.7?3:N>.42?2:1;break;case te.GOLF:it=.03+.22*Nt(.1,.6,V);break;case te.WETLAND_FLAT:it=.85*Nt(.55,.9,N),X=2;break;case te.HOTEL:case te.RES_MID:it=.05;break;case te.DOWNTOWN:it=.02;break;case te.AIRPORT:it=.012;break;case te.INDUSTRIAL:it=.006;break;default:it=0}if(!(it<=0))for(let tt=0;tt<X;tt++){if(Jo(U,A,7+tt*3)>=it)continue;const K=B+(Jo(U,A,8+tt*3)-.5)*Pi*1.1,et=k+(Jo(U,A,9+tt*3)-.5)*Pi*1.1,ot=t.heightAt(K,et);if(ot<.12)continue;const mt=new Ve(F*4+tt),ut=mt.next(),nt=t.coastAt(K,et)>-110;if(D===te.MANGROVE){if(e(K,et))continue;x(2,K,et,ot-.2,mt.range(2.4,4.4),mt)}else if(D===te.BEACH){if(e(K,et))continue;ot>1.15&&ut<.45?x(4,K,et,ot-.15,mt.range(6,10.5),mt):ot>1&&ut<.62&&x(3,K,et,ot-.15,mt.range(1.2,2.6),mt)}else if(D===te.WETLAND_FLAT){if(ot<.25||e(K,et))continue;x(ut<.35?1:0,K,et,ot-.3,ut<.35?mt.range(7,10):mt.range(4,6.5),mt)}else{if(e(K,et))continue;const lt=N>.7;if(D===te.PARK||D===te.RES_LOW||D===te.GOLF){const H=D===te.GOLF?.4:D===te.RES_LOW?lt?.14:.35:nt?.22:.08,Pt=lt?.1+.16*Nt(.1,.5,J):.05,gt=lt?.08:.06;ut<H?x(4,K,et,ot-.15,mt.range(6,11),mt):ut<H+Pt?x(1,K,et,ot-.3,mt.range(7.5,11),mt):ut<H+Pt+gt?x(3,K,et,ot-.1,mt.range(1.3,2.8),mt):x(0,K,et,ot-.3,lt?mt.range(4.2,7.5):mt.range(3.8,6.5),mt)}else D===te.INDUSTRIAL?x(ut<.5?3:0,K,et,ot-.2,ut<.5?mt.range(1.3,2.4):mt.range(3.5,5.5),mt):D===te.AIRPORT?x(0,K,et,ot-.3,mt.range(3.2,5),mt):x(4,K,et,ot-.15,mt.range(6,10),mt)}}}const v=new Ve("road-palms"),T=[];for(const A of t.roads)(A.cls==="highway"||A.cls==="arterial"||A.cls==="causeway"||A.cls==="street")&&T.push({pts:A.pts,width:A.width,spacing:A.cls==="street"?34:26});for(const A of t.districts)A.track&&T.push({pts:A.track,width:7,spacing:30});for(const A of T){let U=0;for(let F=0;F<A.pts.length-1;F++){const[D,N]=A.pts[F],[B,k]=A.pts[F+1],V=Math.hypot(B-D,k-N);if(V<1)continue;const J=(B-D)/V,it=(k-N)/V;for(let X=14;X<V-8;X+=A.spacing*v.range(.8,1.25),U++){const tt=U&1?1:-1,dt=A.width*.5+v.range(5,8),K=D+J*X-it*dt*tt,et=N+it*X+J*dt*tt,ot=t.heightAt(K,et);if(ot<.9)continue;const mt=t.zoneAt(K,et);mt===te.INDUSTRIAL||mt===te.AIRPORT||mt===te.WETLAND_FLAT||mt===te.LOT||v.chance(.25)||x(4,K,et,ot-.15,v.range(6.5,10.5),v)}}}for(const A of f)A.arche===4?this.counts.palms++:A.arche===2?this.counts.mangroves++:A.arche===3?this.counts.shrubs++:this.counts.trees++;const M=new Map;for(const A of f){const U=Math.floor(A.x/Zl),F=Math.floor(A.z/Zl),D=`${U}|${F}`;let N=M.get(D);N||(N={crown:[],palm:[],tx:U,tz:F},M.set(D,N)),(A.arche===4?N.palm:N.crown).push(A)}const E=new Ve("veg-shuffle"),b=new Yt,_=new Ae,S=new P,R=new P,O=new Ee,I=(A,U,F)=>{for(let et=A.length-1;et>0;et--){const ot=E.int(0,et),mt=A[et];A[et]=A[ot],A[ot]=mt}const D=A.length,N=new oe;for(const et of["position","normal","uv","aPart"])N.setAttribute(et,U.getAttribute(et));N.boundingSphere=U.boundingSphere;const B=new oe;for(const et of["position","normal","uv"])B.setAttribute(et,u.getAttribute(et));B.boundingSphere=u.boundingSphere;const k=new Float32Array(D*4),V=new Float32Array(D*4),J=new Ui(N,F,D),it=new ke;A.forEach((et,ot)=>{S.set(et.x,et.y,et.z),O.set(et.arche===4?(et.seed-.5)*.16:0,et.rot,0),_.setFromEuler(O),R.set(et.s,et.s,et.s),J.setMatrixAt(ot,b.compose(S,_,R)),J.setColorAt(ot,et.tint),k[ot*4]=et.arche,k[ot*4+1]=et.seed,k[ot*4+2]=et.arche===4?.35:et.squash,k[ot*4+3]=et.trunk,et.arche===4?(V[ot*4]=1,V[ot*4+2]=2.45,V[ot*4+3]=1):(V[ot*4]=0,V[ot*4+2]=3.1*et.squash+.3,V[ot*4+3]=et.trunk+.9*et.squash),V[ot*4+1]=et.seed,it.expandByPoint(S)}),N.setAttribute("aVar",new fi(k,4)),B.setAttribute("aVar",new fi(V,4)),J.instanceMatrix.needsUpdate=!0,J.receiveShadow=!0,J.castShadow=!1,J.matrixAutoUpdate=!1;const X=new Ui(B,c,D);X.instanceMatrix=J.instanceMatrix,X.instanceColor=J.instanceColor,X.receiveShadow=!0,X.castShadow=!1,X.customDepthMaterial=l,X.matrixAutoUpdate=!1;const tt=A.reduce((et,ot)=>Math.max(et,ot.s),0),dt=it.getBoundingSphere(new Ce);dt.radius+=tt*2.6,it.min.x-=tt*2.6,it.max.x+=tt*2.6,it.min.z-=tt*2.6,it.max.z+=tt*2.6,it.min.y-=1,it.max.y+=tt*3.7;const K=it.getBoundingSphere(new Ce);J.boundingSphere=K,X.boundingSphere=K.clone(),X.visible=!1,this.group.add(J,X),this.tiles.push({near:J,far:X,box:it,center:K.center,r:K.radius,height:it.max.y-it.min.y,lodCenter:dt.center,lodR:dt.radius,n:D,d:0})};for(const A of M.values())A.crown.length&&I(A.crown,h,o),A.palm.length&&I(A.palm,d,a)}update(t,e){this.uTime.value=t,this.uWind.value=e}updateLod(t,e,n){const i=this.tiles;for(const o of i)o.d=Math.max(0,Math.hypot(o.lodCenter.x-t,o.lodCenter.z-e)-o.lodR);for(let o=1;o<i.length;o++){const a=i[o];let c=o-1;for(;c>=0&&i[c].d>a.d;)i[c+1]=i[c],c--;i[c+1]=a}let r=ox;for(const o of i){const a=o.d<rx&&r>=o.n;a&&(r-=o.n);const c=n.boxInView(o.box),l=o.d<this.shadowDistance&&n.casterInView(o.center,o.r,o.height);o.near.visible=a&&c;const h=!a&&c&&o.d<this.viewDistance;o.far.visible=h||l,o.far.castShadow=l,o.far.layers.mask=ur("all",h);const d=a||o.d<3e3?1:o.d<5500?.5:.25;o.far.count=Math.max(1,Math.round(o.n*d))}}}function hu(s,t,e){const n=new le({color:16777215,roughness:1,metalness:1,vertexColors:t,emissive:e??0}),i=e!==void 0;return n.onBeforeCompile=r=>{r.vertexShader=r.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aMatParams;
varying vec2 vMatParams;${i?`
attribute float aEmissive;
varying float vEmissive;`:""}`).replace("#include <begin_vertex>",`#include <begin_vertex>
vMatParams = aMatParams;${i?`
vEmissive = aEmissive;`:""}`),r.fragmentShader=r.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vMatParams;${i?`
varying float vEmissive;`:""}`).replace("#include <roughnessmap_fragment>","float roughnessFactor = vMatParams.x;").replace("#include <metalnessmap_fragment>","float metalnessFactor = vMatParams.y;"),i&&(r.fragmentShader=r.fragmentShader.replace("#include <emissivemap_fragment>","totalEmissiveRadiance *= vEmissive;"))},n.customProgramCacheKey=()=>s,n}function lx(s){const t=[],e=[],n=[],i=[],r=[];for(const a of s){const c=a.geometry.index?a.geometry.toNonIndexed():a.geometry,l=c.getAttribute("position"),h=c.getAttribute("normal"),{color:d,roughness:u,metalness:f}=a.material;for(let p=0;p<l.count;p++)t.push(l.getX(p),l.getY(p),l.getZ(p)),e.push(h.getX(p),h.getY(p),h.getZ(p)),n.push(d.r,d.g,d.b),i.push(u,f),r.push(a.emissive?1:0);c!==a.geometry&&c.dispose()}const o=new oe;return o.setAttribute("position",new bt(t,3)),o.setAttribute("normal",new bt(e,3)),o.setAttribute("color",new bt(n,3)),o.setAttribute("aMatParams",new bt(i,2)),o.setAttribute("aEmissive",new bt(r,1)),o.computeBoundingSphere(),o}function Qo(s){const t=s.getAttribute("position").count;return s.setAttribute("color",new bt(new Float32Array(t*3).fill(1),3)),s.setAttribute("aEmissive",new bt(new Float32Array(t),1)),s}class hx{pos=[];nrm=[];col=[];par=[];box=new ke;v=new P;get vertexCount(){return this.pos.length/3}add(t,e,n,i){const r=(t.index?t.toNonIndexed():t.clone()).applyMatrix4(e),o=r.getAttribute("position"),a=r.getAttribute("normal"),c=i??n.color,l=n.roughness,h=n.metalness,d=(u,f)=>{this.v.set(o.getX(u),o.getY(u),o.getZ(u)),this.pos.push(this.v.x,this.v.y,this.v.z),this.box.expandByPoint(this.v);const p=f?-1:1;this.nrm.push(p*a.getX(u),p*a.getY(u),p*a.getZ(u)),this.col.push(c.r,c.g,c.b),this.par.push(l,h)};for(let u=0;u<o.count;u++)d(u,!1);if(n.side===Be)for(let u=0;u<o.count;u+=3)d(u,!0),d(u+2,!0),d(u+1,!0);r.dispose()}build(){const t=new oe;return t.setAttribute("position",new bt(this.pos,3)),t.setAttribute("normal",new bt(this.nrm,3)),t.setAttribute("color",new bt(this.col,3)),t.setAttribute("aMatParams",new bt(this.par,2)),t.boundingBox=this.box.clone(),t.boundingSphere=this.box.getBoundingSphere(new Ce),t}}function tc(s,t,e){const n=Math.floor((s+1e4)/e);return Math.floor((t+1e4)/e)*4096+n}function Kl(s,t,e){return s+t+e-Math.max(s,t,e)-Math.min(s,t,e)}const ux=2500,dx=1,fx=350,px=2500;class mx{constructor(t,e,n,i){this.map=t,this.markOccupied=i,this.mats={concrete:new le({color:12170926,roughness:.9}),dark:new le({color:3816768,roughness:.8}),white:new le({color:15921902,roughness:.6}),steel:new le({color:10134701,roughness:.45,metalness:.7}),red:new le({color:13123630,roughness:.6}),blue:new le({color:3103400,roughness:.6}),green:new le({color:3046735,roughness:.6}),orange:new le({color:14252074,roughness:.6}),wood:new le({color:9136968,roughness:.9}),tank:new le({color:14474452,roughness:.5,metalness:.3}),glass:new le({color:10470614,roughness:.15,metalness:.8}),grass:new le({color:4164142,roughness:.95}),yellow:new le({color:14725690,roughness:.6}),lampHead:new le({color:16777215})},this.material=hu("props-v4",!0,16767392),this.materials.push(this.material);const r=new Ve("props");this.buildMarinas(r.fork("marinas")),this.buildPrivateDocks(r.fork("docks")),this.buildFishingPiers(r.fork("piers")),this.buildChannelMarkers(r.fork("markers")),this.buildLifeguardTowers(r.fork("lifeguards")),this.buildClubhouse(r.fork("clubhouse")),this.buildPort(r),this.buildAirport(r),this.buildStadium(),this.buildLighthouse(),this.buildConstruction(r),this.buildLamps(e,n),this.buildSeawalls(),this.flush()}group=new Re;material;materials=[];lampPositions=[];mooredBoatPositions=[];m=new Yt;q=new Ae;p=new P;s=new P;boxes=[];cyls=[];lamps=[];chunks=[];mats;counts={boxes:0,cylinders:0,lamps:0,chunks:0,meshes:0};shoreDistance(t,e,n,i,r=400){const o=a=>this.map.heightAt(t+n*a,e+i*a)<.15;if(!o(0)){for(let a=1;a<=r;a+=1)if(o(a))return a-.5;return r}for(let a=1;a<=r;a+=1)if(!o(-a))return-(a-.5);return-r}piling(t,e,n,i=.18,r="wood"){const o=Math.min(this.map.heightAt(t,e),.2);this.cyl(r,t,o-.3,e,i,n-o+.3)}moor(t,e,n,i){this.map.heightAt(t,e)<-.6&&this.mooredBoatPositions.push({x:t,z:e,rot:n,len:i})}box(t,e,n,i,r,o,a,c=0,l=0){this.p.set(e,n+o/2,i),this.q.setFromEuler(new Ee(l,c,0)),this.s.set(r,o,a),this.boxes.push({m:this.m.compose(this.p,this.q,this.s).clone(),mat:t,size:Kl(r,o,a)})}cyl(t,e,n,i,r,o,a=0,c=0){this.p.set(e,n+o/2,i),this.q.setFromEuler(new Ee(c,a,0)),this.s.set(r*2,o,r*2),this.cyls.push({m:this.m.compose(this.p,this.q,this.s).clone(),mat:t,size:Kl(r*2,o,r*2)})}lamp(t,e,n){this.lamps.push({m:new Yt().makeTranslation(t,e,n),mat:"steel",size:.24})}lampGeometry(t){const e=new ye(.12,.12,9,t).translate(0,4.5,0),n=new Xt(.2,.2,2.4).translate(0,9.1,0),i=new jn(.22,6,4).translate(0,9.05,0),r=lx([{geometry:e,material:this.mats.steel},{geometry:n,material:this.mats.steel},{geometry:i,material:this.mats.lampHead,emissive:!0}]);return e.dispose(),n.dispose(),i.dispose(),r}flush(){const t=Qo(new Xt(1,1,1)),e=Qo(new ye(.5,.5,1,14)),n=Qo(new ye(.5,.5,1,6)),i=this.lampGeometry(14),r=this.lampGeometry(6);for(const u of[t,e,n,i,r])u.computeBoundingSphere();const o=new Map,a=u=>{this.p.setFromMatrixPosition(u.m);const f=tc(this.p.x,this.p.z,ux);let p=o.get(f);return p||(p={boxes:[],cylLarge:[],cylSmall:[],lamps:[]},o.set(f,p)),p},c=u=>u.size>dx;for(const u of this.boxes)a(u).boxes.push(u);for(const u of this.cyls)(c(u)?a(u).cylLarge:a(u).cylSmall).push(u);for(const u of this.lamps)a(u).lamps.push(u);this.counts.boxes=this.boxes.length,this.counts.cylinders=this.cyls.length,this.counts.lamps=this.lamps.length;const l=new Ce,h=new P,d=new Ft(16777215);for(const u of o.values()){const f={meshes:[],box:new ke,center:new P,r:0,height:0};u.boxes.sort((x,g)=>Number(c(g))-Number(c(x)));const p=(x,g,m,y)=>{if(!x.length)return;const w=g.clone(),v=y?null:new fi(new Float32Array(x.length*2),2);v&&w.setAttribute("aMatParams",v);const T=new Ui(w,this.material,x.length),M=new ke;let E=0;x.forEach((S,R)=>{T.setMatrixAt(R,S.m);const O=this.mats[S.mat];T.setColorAt(R,y?d:O.color),v?.setXY(R,O.roughness,O.metalness),c(S)&&E++,l.copy(g.boundingSphere).applyMatrix4(S.m),M.expandByPoint(h.copy(l.center).addScalar(-l.radius)),M.expandByPoint(h.copy(l.center).addScalar(l.radius))}),T.boundingSphere=M.getBoundingSphere(new Ce),T.castShadow=!0,T.receiveShadow=!0;let b=null;m&&(b=m.clone(),v&&b.setAttribute("aMatParams",v));const _={mesh:T,large:E,total:x.length,mainCount:x.length,hi:w,lo:b};T.onBeforeShadow=()=>{T.count=Rv()<=0?_.total:_.large},T.onAfterShadow=()=>{T.count=_.mainCount},f.box.union(M),f.meshes.push(_),this.group.add(T)};p(u.boxes,t,null,!1),p(u.cylLarge,e,null,!1),p(u.cylSmall,e,n,!1),p(u.lamps,i,r,!0),f.box.getBoundingSphere(l),f.center.copy(l.center),f.r=l.radius,f.height=f.box.max.y-f.box.min.y,this.chunks.push(f),this.counts.meshes+=f.meshes.length}this.counts.chunks=this.chunks.length,this.boxes.length=0,this.cyls.length=0,this.lamps.length=0}setNight(t){this.material.emissiveIntensity=8*t}updateLod(t,e,n){for(const i of this.chunks){const r=Math.max(0,Math.hypot(i.center.x-t,i.center.z-e)-i.r),o=n.boxInView(i.box),a=n.casterInView(i.center,i.r,i.height),c=r>px;for(const l of i.meshes){const h=c?l.large:l.total;l.mainCount=h,l.mesh.count=h;const d=o&&h>0;l.mesh.visible=d||a,l.mesh.castShadow=a,l.mesh.layers.mask=ur(l.large>0?"all":"near",d),l.lo&&(l.mesh.geometry=r>fx?l.lo:l.hi)}}}buildMarinas(t){for(const e of this.map.marinas){const n=t.fork(e.id),i=Math.sin(e.rot),r=-Math.cos(e.rot),o=-r,a=i,c=this.shoreDistance(e.x,e.z,i,r),l=e.x+i*c,h=e.z+r*c,d=e.piers*n.range(24,30)+24,u=.95,f=-e.rot,p=(M,E,b,_,S,R,O)=>this.box(M,E,b,_,S,R,O,f);p("concrete",l-i*.4,.3,h-r*.4,d,.9,1.2),p("wood",l-i*3.2,u-.3,h-r*3.2,d,.3,5.5);for(let M=-d/2+2;M<d/2;M+=n.range(5,8))this.piling(l+o*M+i*.4,h+a*M+r*.4,u+.55,.2);let x=-d/2+n.range(8,16);for(;x<d/2-8;){const M=l+o*x,E=h+a*x;let b=e.pierLen*n.range(.6,1.2);for(;b>30&&this.map.heightAt(M+i*b,E+r*b)>-1.2;)b-=6;if(b<=30){x+=n.range(22,34);continue}const _=M+i*b/2,S=E+r*b/2,R=n.chance(.3);p("wood",_,u-.3,S,R?3.2:2.2,.3,b);for(let I=n.range(2,6);I<b;I+=n.range(8,12))for(const A of[-1,1])this.piling(M+i*I+o*A*(R?1.7:1.3),E+r*I+a*A*(R?1.7:1.3),u+n.range(.4,.9),n.range(.15,.2));const O=n.range(10,14);for(let I=n.range(6,12);I<b-8;I+=O)for(const A of[-1,1]){if(n.chance(.18))continue;const U=n.range(6,9.5),F=M+i*I+o*A*(U/2+1),D=E+r*I+a*A*(U/2+1);if(p("wood",F,u-.4,D,U,.25,.9),this.piling(M+i*I+o*A*(U+.6),E+r*I+a*A*(U+.6),u+.4,.14),n.chance(.62)){const N=n.range(6.5,12.5),B=M+i*(I+O*.5)+o*A*(N*.45+1.2),k=E+r*(I+O*.5)+a*A*(N*.45+1.2);this.moor(B,k,e.rot+Math.PI/2,N)}}if(n.chance(.55)){const I=n.range(16,26),A=M+i*(b-1.2),U=E+r*(b-1.2);p("wood",A,u-.3,U,I,.3,2.4);for(const F of[-1,1])this.piling(A+o*F*I*.5,U+a*F*I*.5,u+.7,.2);for(const F of[-1,1])n.chance(.7)&&this.moor(A+i*4.5+o*F*I*.25,U+r*4.5+a*F*I*.25,e.rot+Math.PI/2,n.range(13,19))}x+=n.range(22,36)}const g=(n.chance(.5)?-1:1)*(d/2-6),m=l+o*g+i*7,y=h+a*g+r*7;p("wood",m,u-.3,y,9,.3,14);for(const M of[-1,1])this.piling(m+o*M*4+i*6,y+a*M*4+r*6,u+.6,.2);for(const M of[-1,1])this.cyl("steel",m+o*M*3,u,y+a*M*3,.16,4.4);p("white",m,u+4.4,y,10,.5,8),p("red",m,u,y,.9,1.3,.9),this.moor(m+i*12,y+r*12,e.rot+Math.PI/2,n.range(8,12));const w=l-i*22+o*n.range(-8,8),v=h-r*22+a*n.range(-8,8),T=this.map.heightAt(w,v);if(p("white",w,T,v,18,5.5,11),p("dark",w,T+5.5,v,19.5,.5,12.5),this.cyl("white",w+o*6,T+6,v+a*6,.9,5.5),this.markOccupied(w,v,22),n.chance(.7)){const M=l-i*26+o*(d/2-30)*(g>0?-1:1),E=h-r*26+a*(d/2-30)*(g>0?-1:1),b=this.map.heightAt(M,E);if(b>.9){p("steel",M,b+8.6,E,30,.4,10);for(const S of[-1,1])for(const R of[-1,1])this.cyl("steel",M+o*S*14+i*R*4.5,b,E+a*S*14+r*R*4.5,.2,8.6);const _=n.int(4,8);for(let S=0;S<_;S++)p(n.pick(["white","white","blue","red"]),M+o*n.range(-12,12)+i*n.range(-2,2),b+n.int(0,2)*2.8+.4,E+a*n.range(-12,12)+r*n.range(-2,2),2.4,1.4,7);this.markOccupied(M,E,20)}}if(n.chance(.6)){const M=n.chance(.5)?-1:1,E=l+o*M*(d/2+6),b=h+a*M*(d/2+6),_=n.range(40,90);for(let S=0;S<_;S+=n.range(3,4.5)){const R=E+i*S+o*n.range(-1.5,1.5),O=b+r*S+a*n.range(-1.5,1.5);if(this.map.heightAt(R,O)<-3)break;this.box("dark",R,-.8+n.range(0,.5),O,n.range(2.2,3.6),n.range(1.8,2.6),n.range(2.2,3.4),n.range(0,Math.PI),n.range(-.15,.15))}}}}buildPrivateDocks(t){const e=(n,i,r,o,a)=>{const c=this.shoreDistance(n,i,r,o,120);if(c<0||c>=120)return;const l=n+r*c,h=i+o*c,d=a.range(5,9);if(this.map.heightAt(l+r*(d+2),h+o*(d+2))>-.7)return;const f=-Math.atan2(r,-o),p=.75;this.box("wood",l+r*(d/2-1.5),p-.25,h+o*(d/2-1.5),1.8,.25,d+3,f);const x=-o,g=r;for(const m of[d-.6,d*.4])for(const y of[-1,1])this.piling(l+r*m+x*y*.8,h+o*m+g*y*.8,p+a.range(.3,.7),.13);if(a.chance(.55)){const m=a.chance(.5)?-1:1,y=a.range(5.5,10);this.moor(l+r*(d*.6)+x*m*2.4,h+o*(d*.6)+g*m*2.4,f,y)}else if(a.chance(.35)){const m=a.chance(.5)?-1:1;for(const y of[d*.25,d*.8])for(const w of[1.4,4.2])this.piling(l+r*y+x*m*w,h+o*y+g*m*w,p+2.6,.12,"steel");this.box("steel",l+r*(d*.52)+x*m*2.8,p+2.6,h+o*(d*.52)+g*m*2.8,3.4,.2,d*.6,f)}};for(let n=0;n<5;n++){const i=1870-n*25,r=-3e3+n*330,o=t.fork(`finger-${n}`);for(const a of[-1,1])for(let c=-280+o.range(0,30);c<280;c+=o.range(26,44))o.chance(.25)||e(i+c,r+a*60,0,a,o)}for(const n of this.map.canals){const i=t.fork(n.id),r=Math.min(n.a[0],n.b[0]),o=Math.max(n.a[0],n.b[0]);for(let a=r+i.range(15,40);a<o-15;a+=i.range(30,55)){if(n.culverts.some(l=>Math.abs(l-a)<n.culvertHalf+12)||i.chance(.35))continue;const c=i.chance(.5)?-1:1;e(a,n.a[1]-c*(n.width*.5+14),0,c,i)}}}buildFishingPiers(t){const e=[[2700,-4650,1,0,170],[2600,-2350,1,.05,150],[1800,6700,-.2,1,130]];for(const[n,i,r,o,a]of e){const c=t.fork(`${n}-${i}`),l=Math.hypot(r,o),h=r/l,d=o/l,u=this.shoreDistance(n,i,h,d,600);if(u<0||u>=600)continue;const f=n+h*(u-22),p=i+d*(u-22),x=-Math.atan2(h,-d),g=2.6,m=a+22;this.box("wood",f+h*m/2,g-.3,p+d*m/2,3.4,.3,m,x);const y=-d,w=h;for(let E=0;E<m;E+=c.range(7,10))for(const b of[-1,1])this.piling(f+h*E+y*b*1.5,p+d*E+w*b*1.5,g+1.1,.2);for(const E of[-1,1])this.box("wood",f+h*m/2+y*E*1.6,g+.9,p+d*m/2+w*E*1.6,.1,.1,m,x);const v=f+h*(m-2.5),T=p+d*(m-2.5),M=c.range(14,20);this.box("wood",v,g-.3,T,M,.3,5,x);for(const E of[-1,1])this.piling(v+y*E*M*.5,T+w*E*M*.5,g+1.2,.22);this.box(c.pick(["white","blue","orange"]),v+y*M*.22,g,T+w*M*.22,4.5,3,4,x),this.box("dark",v+y*M*.22,g+3,T+w*M*.22,5.2,.3,4.8,x);for(const E of[-1,1])this.cyl("steel",v-y*M*.3+h*E*1.6,g,T-w*M*.3+d*E*1.6,.08,3.2);this.box("white",v-y*M*.3,g+3.2,T-w*M*.3,5,.15,4,x),this.box("white",f-h*2+y*3.5,this.map.heightAt(f-h*2+y*3.5,p-d*2+w*3.5),p-d*2+w*3.5,4,3.2,4,x),this.markOccupied(f,p,12)}}buildChannelMarkers(t){for(const e of this.map.channels){if(e.width>=250||e.depth<3.5)continue;const n=t.fork(e.id);let i=n.range(60,200);for(let r=0;r<e.pts.length-1;r++){const[o,a]=e.pts[r],[c,l]=e.pts[r+1],h=Math.hypot(c-o,l-a),d=(c-o)/h,u=(l-a)/h;let f=i;for(;f<h;f+=n.range(260,420)){const p=o+d*f,x=a+u*f,g=e.width*.5+n.range(6,14);for(const m of[-1,1]){if(n.chance(.3))continue;const y=p-u*g*m+n.range(-3,3),w=x+d*g*m+n.range(-3,3);if(this.map.heightAt(y,w)>-1.2)continue;const v=n.range(3.2,4.2);this.piling(y,w,v,.24,"wood"),this.box(m>0?"red":"green",y,v-1.1,w,1.1,1.1,.25,Math.atan2(d,-u)),n.chance(.3)&&this.box("white",y,v+.1,w,.5,.5,.5)}}i=f-h}}}buildLifeguardTowers(t){const e=[[2600,-7600,1,0,0,1],[3e3,4900,1,.2,-.2,1]],n=["white","yellow","orange","blue","red"];for(const[i,r,o,a,c,l]of e){const h=t.fork(`${i}`),d=i>2900?1600:6e3;for(let u=h.range(120,300);u<d;u+=h.range(380,620)){const f=i+c*u,p=r+l*u,x=this.shoreDistance(f,p,o,a,900);if(x<=0||x>=900)continue;let g=x-14;for(;g>0&&this.map.heightAt(f+o*g,p+a*g)<1;)g-=3;const m=f+o*g,y=p+a*g,w=this.map.heightAt(m,y);if(w<.9||w>3.2||this.map.zoneAt(m,y)!==2)continue;const v=-Math.atan2(o,-a)+h.range(-.2,.2),T=Math.cos(v),M=Math.sin(v),E=h.pick(n);for(const[b,_]of[[-1.2,-1.2],[1.2,-1.2],[1.2,1.2],[-1.2,1.2]])this.cyl("wood",m+b*T-_*M,w,y+b*M+_*T,.12,3);this.box(E,m,w+3,y,3.2,2.4,3,v),this.box("white",m,w+5.4,y,3.9,.25,3.7,v),this.box("wood",m,w+2.9,y,3.6,.15,3.4,v);for(let b=0;b<4;b++)this.box("wood",m-o*(2.2+b*1.1),w+2.9-(b+1)*.7,y-a*(2.2+b*1.1),1,.12,1.2,v);this.markOccupied(m,y,6)}}}buildClubhouse(t){const e=this.map.pois.find(w=>w.kind==="clubhouse");if(!e)return;const n=this.map.heightAt(e.x,e.z);if(n<1)return;const i=Math.cos(e.rot),r=Math.sin(e.rot),o=(w,v)=>[e.x+w*i-v*r,e.z+w*r+v*i],[a,c]=o(0,0);this.box("white",a,n,c,34,5.5,18,e.rot),this.box("dark",a,n+5.5,c,37,.6,21,e.rot),this.box("white",a,n+6.1,c,12,2.4,8,e.rot),this.box("dark",a,n+8.5,c,13.5,.4,9.5,e.rot);const[l,h]=o(0,13);this.box("wood",l,n+.4,h,34,.3,8,e.rot),this.box("white",l,n+4.6,h,35,.35,9,e.rot);for(let w=-3;w<=3;w++){const[v,T]=o(w*5.5,16.5);this.cyl("white",v,n+.7,T,.22,3.9)}const[d,u]=o(24,-4);this.box("white",d,n,u,14,4,12,e.rot),this.box("dark",d,n+4,u,15.5,.5,13.5,e.rot);const[f,p]=o(-26,-8);this.box("concrete",f,n,p,16,3.4,14,e.rot),this.box("dark",f,n+3.4,p,17,.4,15,e.rot);for(let w=0;w<5;w++){const[v,T]=o(-30+w*3.2,3+t.range(-1,1));this.box("white",v,n,T,1.3,1.1,2.4,e.rot),this.box("dark",v,n+1.6,T,1.4,.1,2.2,e.rot)}const[x,g]=o(4,32);this.box("grass",x,n+.05,g,30,.2,20,e.rot),this.cyl("white",x+4,n+.25,g-3,.04,2.2),this.box("red",x+4.3,n+2,g-3,.6,.4,.05,e.rot);const[m,y]=o(-6,-22);this.box("dark",m,n-.05,y,48,.2,18,e.rot),this.markOccupied(e.x,e.z,60)}buildPort(t){const e=Yh,n=Math.cos(e.rot),i=Math.sin(e.rot),r=(M,E)=>[e.cx+M*n-E*i,e.cz+M*i+E*n],o=-.04,a=(M,E,b,_,S,R,O)=>{const[I,A]=r(E,_);this.box(M,I,b,A,S,R,O,o)},c=(M,E,b,_,S,R)=>{const[O,I]=r(E,_);this.cyl(M,O,b,I,S,R,o)},l=(M,E)=>{const[b,_]=r(M,E);return this.map.heightAt(b,_)},h=(M,E,b)=>{const[_,S]=r(M,E);this.markOccupied(_,S,b)},d=["red","blue","green","orange","steel","white","blue","red"],u=-300,f=[];for(let M=-780;M<e.hw-150;M+=t.range(185,240))f.push(M);for(const M of f){const E=u+16,b=l(M,E);if(b<1)continue;const _=18,S=40+t.range(-3,5);for(const R of[-1,1])for(const O of[-1,1])a("steel",M+R*_/2,b,E+O*6,1.6,S,1.6);a("steel",M,b+S,E-4,_+4,3,3),a("steel",M,b+S,E+4,_+4,3,3),a("orange",M,b+S+3,E-26,3.2,3,58),a("steel",M,b+S+5,E+12,3,3,18),a("white",M,b+S-14,E-12,6,4,6)}for(const[M,E,b,_]of[[-420,190,30,9],[330,130,22,7]]){const S=u-b/2-3;a("dark",M,-2.5,S,E,_+2.5,b),a(t.pick(["red","blue"]),M,_,S,E-6,1.6,b-2),a("white",M+E*.36,_+1.6,S,E*.14,12,b-6);for(let R=0;R<4;R++)a("steel",M-E*.32+R*E*.18,_+1.6,S,3,6+R%2*3,2)}const p=u+70,x=40;for(let M=-860;M<e.hw-260;M+=175)for(let E=p;E<x-40;E+=58){if(t.chance(.12))continue;const b=l(M+60,E+20);if(b<1)continue;const _=6,S=10,R=t.range(1,4);for(let O=0;O<_;O++)for(let I=0;I<S;I++){if(t.chance(.28))continue;const A=Math.min(4,Math.max(1,Math.round(R+t.range(-1.5,1.5)))),U=M+I*13.4,F=E+O*6.1;for(let D=0;D<A;D++)a(t.pick(d),U,b+D*2.6,F,12.2,2.6,4.9)}h(M+60,E+15,80),t.chance(.5)&&c("steel",M-8,b,E-6,.3,30)}let g=-810;for(;g<e.hw-520;){const M=t.range(120,170),E=t.range(40,55),b=150+t.range(-10,10),_=l(g+M/2,b);if(_>=1){a(t.pick(["concrete","white","tank"]),g+M/2,_,b,M,11+t.range(0,3),E),a("dark",g+M/2,_+11+3,b,M+2,.6,E+2);for(let S=0;S<6;S++)a("steel",g+12+S*(M-24)/5,_,b+E/2+3,4,4.2,6);h(g+M/2,b,Math.max(M,E)*.6)}g+=M+t.range(30,60)}const m=e.hh,y=260,w=l(y,m-60);a("white",y,w,m-60,260,12,40),a("glass",y,w+12,m-60,240,4,36),a("white",y,w,m-20,120,7,30),h(y,m-55,150);const v=m+19;a("dark",y,-2.5,v,290,12.5,36),a("white",y,10,v,280,28,32);for(let M=0;M<6;M++)a("glass",y,13.5+M*3.5,v,276,1.2,33);a("white",y-30,38,v,90,8,22),c("dark",y-90,38,v,4,14);const T=this.map.pois.find(M=>M.kind==="tanks");for(let M=0;M<9;M++){const E=T.x+M%3*52-52,b=T.z+Math.floor(M/3)*52-52,_=this.map.heightAt(E,b);_<1||(this.cyl("tank",E,_,b,t.range(14,22),t.range(10,16)),this.markOccupied(E,b,26))}}buildAirport(t){const e=this.map.pois.find(l=>l.kind==="terminal"),n=this.map.heightAt(e.x,e.z);this.box("white",e.x,n,e.z,260,14,60),this.box("glass",e.x,n+3,e.z+30.5,250,7,1.2),this.box("steel",e.x,n+14,e.z,270,2,66);for(let l=-1;l<=1;l++)this.box("white",e.x+l*90,n,e.z+90,30,9,120),this.box("steel",e.x+l*90,n+9,e.z+90,32,1.2,122);this.box("dark",e.x,n-.1,e.z+130,520,.4,220),this.cyl("concrete",e.x+220,n,e.z-40,4,38),this.box("glass",e.x+220,n+38,e.z-40,14,5,14,.4),this.box("white",e.x+220,n+43,e.z-40,16,1.5,16,.4);const i=this.map.pois.find(l=>l.kind==="hangars");for(let l=0;l<4;l++){const h=i.x+l*80,d=i.z,u=this.map.heightAt(h,d);this.box("concrete",h,u,d,64,12,50),this.box("steel",h,u+12,d,60,5,40),this.box("steel",h,u+17,d,40,3,30),this.markOccupied(h,d,40)}for(let l=-1;l<=1;l++)for(const h of[-1,1]){const d=e.x+l*90+h*34,u=e.z+110;this.cyl("white",d,n+2.2,u,2.6,38,0,Math.PI/2),this.box("white",d,n+2.5,u+2,34,.8,5,0),this.box("white",d,n+3,u+17,12,.6,3),this.box("white",d,n+4,u+18,.6,9,3),this.cyl("steel",d-9,n+.8,u+4,1.4,4.5,0,Math.PI/2),this.cyl("steel",d+9,n+.8,u+4,1.4,4.5,0,Math.PI/2)}this.markOccupied(e.x,e.z+60,320);const r=this.map.runways.find(l=>l.id==="strip-southkey"),o=(r.a[0]+r.b[0])/2+40,a=(r.a[1]+r.b[1])/2-60,c=this.map.heightAt(o,a);c>1&&(this.box("concrete",o,c,a,26,7,20,.55),this.box("steel",o,c+7,a,24,2.5,16,.55),this.markOccupied(o,a,20))}buildStadium(){const t=this.map.pois.find(o=>o.kind==="stadium"),e=this.map.heightAt(t.x,t.z);if(e<1)return;const n=40,i=t.size,r=t.size*.8;for(let o=0;o<n;o++){const a=o/n*Math.PI*2+t.rot,c=Math.cos(a),l=Math.sin(a),h=t.x+c*i,d=t.z+l*r,u=2*Math.PI*(i+r)/2/n+2,f=Math.atan2(c*r,-l*i);this.box("concrete",h,e,d,u,14,22,f),this.box("concrete",h+c*10,e+14,d+l*10,u,12,16,f),this.box("white",h+c*12,e+26,d+l*12,u,1.5,34,f),this.box("steel",h+c*26,e,d+l*26,1.4,30,1.4)}this.box("grass",t.x,e+.05,t.z,i*1.2,.3,r*1.15,t.rot),this.markOccupied(t.x,t.z,i+40)}buildLighthouse(){const t=this.map.pois.find(n=>n.kind==="lighthouse"),e=this.map.heightAt(t.x,t.z);e<.5||(this.cyl("white",t.x,e,t.z,4.2,28),this.cyl("red",t.x,e+10,t.z,4.25,5),this.cyl("dark",t.x,e+28,t.z,2.4,3.5),this.cyl("white",t.x,e+31.5,t.z,1.6,1.4),this.box("white",t.x+12,e,t.z+6,12,5,9,.3),this.markOccupied(t.x,t.z,20))}buildConstruction(t){for(const e of this.map.districts)if(e.id.startsWith("construction")){const n=this.map.heightAt(e.cx,e.cz);if(n<1)continue;const i=t.int(5,12),r=e.hw*1.2,o=e.hh*1.2;for(let l=1;l<=i;l++)this.box("concrete",e.cx,n+l*3.6,e.cz,r,.4,o,e.rot);for(const[l,h]of[[-.4,-.4],[.4,-.4],[.4,.4],[-.4,.4],[0,0],[0,-.4],[0,.4],[-.4,0],[.4,0]]){const d=Math.cos(e.rot),u=Math.sin(e.rot),f=e.cx+l*r*d-h*o*u,p=e.cz+l*r*u+h*o*d;this.cyl("concrete",f,n,p,.45,i*3.6+.4)}this.box("concrete",e.cx+r*.15,n,e.cz,10,i*3.6+6,8,e.rot);const a=e.cx-r*.6,c=e.cz+o*.6;this.box("yellow",a,n,c,2.2,i*3.6+30,2.2),this.box("yellow",a+20,n+i*3.6+30,c,60,1.6,1.6,.4),this.box("yellow",a-8,n+i*3.6+30,c,14,1.6,1.6,.4);for(let l=0;l<5;l++)this.box(t.pick(["blue","white","orange"]),e.cx+t.range(-r,r)*.7,n,e.cz+o*.85,6,2.6,2.4,e.rot);this.markOccupied(e.cx,e.cz,Math.max(r,o))}}buildLamps(t,e){for(const n of t){if(n.cls!=="highway"&&n.cls!=="arterial"&&n.cls!=="causeway")continue;const i=n.b[0]-n.a[0],r=n.b[1]-n.a[1],o=Math.hypot(i,r),a=i/o,c=r/o;let l=0;for(let h=20;h<o;h+=45,l++){const d=l%2===0?-1:1,u=n.a[0]+a*h+-c*(n.width/2+1)*d,f=n.a[1]+c*h+a*(n.width/2+1)*d,p=this.map.heightAt(u,f);p<.8||this.lampPositions.push(new P(u,p,f))}}for(const n of e)this.lampPositions.push(n.clone());for(const n of this.lampPositions)this.lamp(n.x,n.y,n.z)}buildSeawalls(){const t=this.map.districts.find(i=>i.id==="industrial-port"),e=Math.cos(t.rot),n=Math.sin(t.rot);for(let i=-t.hw;i<=t.hw;i+=6)for(const r of[-1,1]){const o=t.cx+i*e-r*t.hh*n,a=t.cz+i*n+r*t.hh*e;this.box("concrete",o,1.4,a,6.2,2.2,2,t.rot)}}}function Qi(s,t,e){const n=s/2,i=t/2,r=[[-n,-e*.55,0],[n*.55,-e*.55,0],[-n,-e*.1,-i*.95],[-n,-e*.1,i*.95],[n*.35,-e*.15,-i],[n*.35,-e*.15,i],[n,.05,0],[-n,e*.45,-i],[-n,e*.45,i],[n*.4,e*.45,-i*.95],[n*.4,e*.45,i*.95],[n,e*.55,0]],o=[[0,2,4],[0,4,1],[0,1,5],[0,5,3],[1,4,6],[1,6,5],[2,7,9],[2,9,4],[4,9,11],[4,11,6],[3,5,10],[3,10,8],[5,6,11],[5,11,10],[0,3,8],[0,8,7],[0,7,2],[7,8,10],[7,10,9],[9,10,11]],a=[];for(const l of o)for(const h of l)a.push(r[h][0],r[h][1],r[h][2]);const c=new oe;return c.setAttribute("position",new bt(a,3)),c.computeVertexNormals(),c}class gx{mats={white:new le({color:16053488,roughness:.35,metalness:.05}),hullDark:new le({color:2042424,roughness:.5}),hullRed:new le({color:10104618,roughness:.55}),hullBlue:new le({color:2051978,roughness:.5}),teak:new le({color:11569754,roughness:.8}),glass:new le({color:2241348,roughness:.1,metalness:.9}),sail:new le({color:16316142,roughness:.9,side:Be}),steel:new le({color:9213084,roughness:.5,metalness:.6}),containerWhite:new le({color:16777215,roughness:.7})};get materials(){return[this.mats.white,this.mats.hullDark,this.mats.hullRed,this.mats.hullBlue,this.mats.teak,this.mats.glass,this.mats.sail,this.mats.steel,this.mats.containerWhite]}build(t,e){const n=new Re,i=(o,a,c,l,h,d=0,u=0,f=0)=>{const p=new de(o,a);return p.position.set(c,l,h),p.rotation.set(d,u,f),p.castShadow=!0,p.receiveShadow=!0,n.add(p),p},r=e.pick([this.mats.white,this.mats.white,this.mats.hullDark,this.mats.hullBlue,this.mats.hullRed]);switch(t){case"speed":{const o=e.range(7,10),a=o*.3;return i(Qi(o,a,1.4),r,0,.3,0),i(new Xt(o*.25,.5,a*.8),this.mats.glass,o*.05,1.05,0,0,0,-.35),i(new Xt(o*.35,.35,a*.75),this.mats.teak,-o*.2,.8,0),i(new Xt(.6,.6,.8),this.mats.steel,-o*.45,.6,0),{group:n,len:o,beam:a,draft:.5,wakeWidth:a*1.4}}case"console":{const o=e.range(6,8),a=o*.32;i(Qi(o,a,1.3),this.mats.white,0,.3,0),i(new Xt(1.2,1.4,1),this.mats.white,0,1.2,0),i(new Xt(1.6,.15,1.6),this.mats.hullDark,0,2.3,0);for(const c of[-1,1])i(new ye(.04,.04,1.6,6),this.mats.steel,.6*c,1.5,.7*c);return i(new Xt(.5,.7,.5),this.mats.hullDark,-o*.45,.7,0),{group:n,len:o,beam:a,draft:.45,wakeWidth:a*1.3}}case"yacht":{const o=e.range(18,32),a=o*.25;return i(Qi(o,a,o*.16),this.mats.white,0,o*.04,0),i(new Xt(o*.5,o*.09,a*.8),this.mats.white,-o*.05,o*.13,0),i(new Xt(o*.48,o*.04,a*.82),this.mats.glass,-o*.05,o*.135,0),i(new Xt(o*.28,o*.07,a*.6),this.mats.white,-o*.12,o*.21,0),i(new Xt(o*.26,o*.03,a*.62),this.mats.glass,-o*.12,o*.215,0),i(new Xt(o*.06,o*.09,a*.5),this.mats.white,-o*.2,o*.29,0,0,0,.3),i(new ye(.15,.15,1.2,8),this.mats.steel,-o*.2,o*.34,0),{group:n,len:o,beam:a,draft:o*.06,wakeWidth:a*1.5}}case"sail":{const o=e.range(9,14),a=o*.31;i(Qi(o,a,o*.14),r,0,o*.03,0),i(new Xt(o*.3,.7,a*.6),this.mats.white,-o*.05,o*.09+.3,0);const c=o*1.25;i(new ye(.06,.09,c,6),this.mats.steel,o*.05,c/2+o*.08,0);const l=new oe;l.setAttribute("position",new bt([0,0,0,0,c*.9,0,-o*.42,0,0],3)),l.computeVertexNormals(),i(l,this.mats.sail,o*.05,o*.13,0,0,0,0);const h=new oe;return h.setAttribute("position",new bt([0,0,0,0,c*.75,0,o*.4,0,0],3)),h.computeVertexNormals(),i(h,this.mats.sail,o*.05,o*.13,.05,0,0,0),n.rotation.z=.12,{group:n,len:o,beam:a,draft:1.5,wakeWidth:a*.9}}case"ferry":return i(Qi(42,12,5),this.mats.hullBlue,0,1.5,0),i(new Xt(42*.8,3.2,12*.9),this.mats.white,-1,4.9,0),i(new Xt(42*.78,1.2,12*.92),this.mats.glass,-1,5.2,0),i(new Xt(42*.4,2.8,12*.6),this.mats.white,-4,7.8,0),i(new ye(.6,.7,3,10),this.mats.hullDark,-12,10.5,0),{group:n,len:42,beam:12,draft:2.2,wakeWidth:12*1.3};case"cargo":{const o=e.range(120,180),a=o*.16,c=o*.075;i(Qi(o,a,c),this.mats.hullDark,0,c*.15,0),i(new Xt(o*.9,.8,a*.98),this.mats.hullRed,0,c*.6,0),i(new Xt(o*.09,c*1.6,a*.9),this.mats.white,-o*.38,c*.6+c*.8,0),i(new Xt(o*.1,2,a*.95),this.mats.glass,-o*.38,c*.6+c*1.55,0),i(new ye(1.2,1.5,c*.9,10),this.mats.hullDark,-o*.44,c*.6+c*1.9,0);const l=Math.floor(o*.6/6.4),h=Math.max(3,Math.floor(a/2.6)),d=[];for(let x=0;x<l;x++)for(let g=0;g<h;g++){const m=e.int(1,4);for(let y=0;y<m;y++)d.push({x:o*.3-x*6.4,y:c*.6+.8+1.3+y*2.6,z:(g-(h-1)/2)*2.5,c:e.int(0,5)})}const u=new Ui(new Xt(6.1,2.6,2.44),this.mats.containerWhite,d.length),f=new Yt,p=[12597547,3049153,2600544,14059792,8227731,15528177].map(x=>new Ft(x));return d.forEach((x,g)=>{u.setMatrixAt(g,f.makeTranslation(x.x,x.y,x.z)),u.setColorAt(g,p[x.c])}),u.castShadow=!0,u.receiveShadow=!0,n.add(u),{group:n,len:o,beam:a,draft:c*.5,wakeWidth:a*1.4}}}}}function vx(s){let t=0;for(let e=0;e<s.length-1;e++)t+=Math.hypot(s[e+1][0]-s[e][0],s[e+1][1]-s[e][1]);return t}function xx(s,t,e){let n=0;for(let i=0;i<s.length-1;i++){const r=Math.hypot(s[i+1][0]-s[i][0],s[i+1][1]-s[i][1]);if(t<=n+r||i===s.length-2){const o=Kt((t-n)/r,0,1);e.dx=(s[i+1][0]-s[i][0])/r,e.dz=(s[i+1][1]-s[i][1])/r,e.x=s[i][0]+e.dx*r*o,e.z=s[i][1]+e.dz*r*o;return}n+=r}}function ta(s){s.updateMatrixWorld(!0);const t=s.matrixWorld.clone().invert(),e=new hx,n=new Yt,i=new Yt,r=new Ft;return s.traverse(o=>{const a=o;if(!a.isMesh)return;n.multiplyMatrices(t,a.matrixWorld);const c=a.material,l=o;if(l.isInstancedMesh)for(let h=0;h<l.count;h++)l.getMatrixAt(h,i),l.instanceColor&&l.getColorAt(h,r),e.add(a.geometry,i.premultiply(n),c,l.instanceColor?r:void 0);else e.add(a.geometry,n,c);a.geometry.dispose()}),e.build()}const Jl=5e3,Ql=3;function _x(){const s=[[new Xt(4.4,1,1.9),0,0,.65,0],[new Xt(2.2,.75,1.7),1,-.2,1.5,0],[new Xt(.2,.25,1.6),2,2.2,.8,0]],t=[],e=[],n=[],i=[];for(const[o,a,c,l,h]of s){const d=o.translate(c,l,h).toNonIndexed(),u=d.getAttribute("position"),f=d.getAttribute("normal"),p=d.getAttribute("uv");for(let x=0;x<u.count;x++)t.push(u.getX(x),u.getY(x),u.getZ(x)),e.push(f.getX(x),f.getY(x),f.getZ(x)),n.push(p.getX(x),p.getY(x)),i.push(a);d.dispose(),o.dispose()}const r=new oe;return r.setAttribute("position",new bt(t,3)),r.setAttribute("normal",new bt(e,3)),r.setAttribute("uv",new bt(n,2)),r.setAttribute("aPart",new bt(i,1)),r.computeBoundingSphere(),r}function yx(){const s=new le({color:16777215,emissive:16773840,emissiveIntensity:0}),t=new Ft(1712684),e=n=>n.toFixed(6);return s.onBeforeCompile=n=>{n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
attribute float aPart;
varying float vPart;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vPart = aPart;`),n.fragmentShader=n.fragmentShader.replace("#include <common>",`#include <common>
varying float vPart;`).replace("#include <color_fragment>",`#include <color_fragment>
if (vPart > 1.5) diffuseColor.rgb = vec3(1.0);
else if (vPart > 0.5) diffuseColor.rgb = vec3(${e(t.r)}, ${e(t.g)}, ${e(t.b)});`).replace("#include <roughnessmap_fragment>","float roughnessFactor = vPart > 1.5 ? 1.0 : (vPart > 0.5 ? 0.15 : 0.35);").replace("#include <metalnessmap_fragment>","float metalnessFactor = vPart > 1.5 ? 0.0 : (vPart > 0.5 ? 0.8 : 0.4);").replace("#include <emissivemap_fragment>","totalEmissiveRadiance *= step(1.5, vPart);")},s.customProgramCacheKey=()=>"traffic-car-v1",s}class wx{constructor(t,e,n,i,r,o){this.map=t,this.wakeScene=i;const a=new Ve(`traffic-${r}`),c=new gx,l=[];for(const A of t.channels){const U=vx(A.pts);for(let F=0;F<A.boats;F++){const D=A.id==="ocean-route"||A.id==="ship-channel"?a.chance(.6)?"cargo":"ferry":a.pick(["speed","speed","console","yacht","sail","speed"]),N=c.build(D,a),B=D==="cargo"?a.range(4,6):D==="ferry"?7:D==="sail"?a.range(2.5,4):D==="yacht"?a.range(5,9):a.range(9,16),k=new rs(D==="cargo"?90:80,N.wakeWidth,D==="cargo"?70:D==="sail"?20:42,D==="sail"?.45:1.5);i.add(k.mesh),l.push(ta(N.group)),this.boats.push({id:l.length-1,route:A.pts,routeLen:U,s:a.range(0,U),dir:a.chance(.5)?1:-1,speed:B,len:N.len,draft:N.draft,wake:k,phase:a.range(0,100)})}}const h=[];for(const A of o){const U=c.build(a.chance(.4)?"sail":a.chance(.5)?"speed":a.chance(.5)?"console":"yacht",a),F=Kt(A.len/U.len,.6,1.4);U.group.scale.setScalar(F),U.group.position.set(A.x,.05,A.z),U.group.rotation.y=A.rot+(a.chance(.5)?Math.PI:0),l.push(ta(U.group)),h.push({idx:l.length-1,m:U.group.matrixWorld.clone()})}this.boatCount=this.boats.length+o.length;const d=new Map;for(const A of t.roads)d.set(A.id,A.pts.map(([U,F])=>new P(U,t.heightAt(U,F)+.25,F)));for(const[A,U]of d){const F=t.roads.find(D=>D.id===A);this.carRoutes.push({pts:U,length:this.len3(U),lanes:F.lanes,width:F.width})}for(const A of n)this.carRoutes.push({pts:A.pts.map(U=>U.clone().add(new P(0,.25,0))),length:this.len3(A.pts),lanes:A.lanes,width:A.width});for(const A of e){if(A.cls!=="street"||a.next()>.35)continue;const U=[new P(A.a[0],t.heightAt(A.a[0],A.a[1])+.25,A.a[1]),new P(A.b[0],t.heightAt(A.b[0],A.b[1])+.25,A.b[1])];this.carRoutes.push({pts:U,length:this.len3(U),lanes:2,width:A.width})}const u=["#e8e8e8","#d0d0d0","#1c1c1e","#8a8f94","#b8352e","#2b4c8c","#d9a441","#3d6b3a","#f2f2f2","#6c6f73","#c94f3d","#20242a"];for(let A=0;A<this.carRoutes.length;A++){const U=this.carRoutes[A],F=t.roads.find(B=>B.pts.length===U.pts.length&&B.pts[0][0]===U.pts[0].x),D=F?F.traffic:U.lanes>=4?10:1.2,N=Math.min(120,Math.round(U.length/1e3*D));for(let B=0;B<N;B++){const k=a.chance(.5)?1:-1;this.cars.push({route:A,s:a.range(0,U.length),dir:k,lane:a.int(0,Math.max(0,Math.floor(U.lanes/2)-1)),speed:a.range(11,26)*(U.lanes>=4?1.2:.8),color:new Ft(a.pick(u))})}}this.carCount=this.cars.length;const f=_x();this.carMat=yx(),this.materials.push(this.carMat);const p=new Map,x=new Array(this.carRoutes.length).fill(0);for(const A of this.cars)x[A.route]++;const g=new Set,m=new P;for(let A=0;A<this.carRoutes.length;A++){if(!x[A])continue;const U=this.carRoutes[A].pts;g.clear();for(let F=0;F<U.length-1;F++){const D=U[F],N=U[F+1],B=Math.max(1,Math.ceil(D.distanceTo(N)/40));for(let k=0;k<=B;k++){m.lerpVectors(D,N,k/B);const V=tc(m.x,m.z,Jl);g.has(V)||(g.add(V),p.set(V,(p.get(V)??0)+x[A]))}}}const y=(A,U)=>{const F=new Ui(f,this.carMat,A);return F.instanceMatrix.setUsage(Dc),F.setColorAt(0,this.cars[0]?.color??new Ft(16777215)),F.instanceColor.setUsage(Dc),F.castShadow=!0,F.count=0,F.visible=!1,Ev(F,"mid"),U?F.boundingSphere=new Ce:F.frustumCulled=!1,this.group.add(F),{mesh:F,capacity:A,n:0,center:new P,r:0,box:new ke}};for(const[A,U]of p){const F=y(U,!0);this.carCells.set(A,F),this.carChunks.push(F)}this.carOverflow=y(Math.max(1,this.cars.length),!1),this.carChunks.push(this.carOverflow);const w=new le({color:16054008,roughness:.35,metalness:.2}),v=new le({color:2781119,roughness:.4}),T=A=>{const U=new Re,F=new de(new ye(1.9,1.9,38,12),w);F.rotation.z=Math.PI/2,U.add(F);const D=new de(new jn(1.9,12,8),w);D.position.x=19,D.scale.set(1.6,1,1),U.add(D);const N=new de(new Xt(6,.5,34),w);N.position.set(1,-.8,0),N.rotation.y=0,U.add(N);const B=new de(new Xt(5,.4,16),w);B.position.set(-3,-.8,12),B.rotation.y=-.45,U.add(B);const k=B.clone();k.position.z=-12,k.rotation.y=.45,U.add(k);const V=new de(new Xt(5,8,.4),v);V.position.set(-16,4.5,0),V.rotation.z=-.4,U.add(V);const J=new de(new Xt(4,.3,12),w);J.position.set(-17,1,0),U.add(J);for(const it of[-1,1]){const X=new de(new ye(1.1,1,4.5,10),w);X.rotation.z=Math.PI/2,X.position.set(3,-2.4,it*7),U.add(X)}return U.scale.setScalar(A),l.push(ta(U)),l.length-1},M=t.runways[0],E=(A,U)=>{const F=ue(4e3,M.a[0],A),D=ue(M.a[1]+30,M.a[1],A),N=ue(900,12,Math.pow(A,.9));return U.set(F,N,D)};this.aircraft.push({id:T(1),path:E,period:240,offset:0,contrail:null}),this.aircraft.push({id:T(.9),path:E,period:240,offset:.5,contrail:null});const b=(A,U)=>{const F=ue(M.b[0],-9e3,A),D=M.b[1]-3500*A*A;return U.set(F,12+2200*Math.pow(A,.8),D)};this.aircraft.push({id:T(1),path:b,period:200,offset:.2,contrail:null});const _=(A,U)=>U.set(ue(-14e3,14e3,A),9500,ue(-9e3,6e3,A)),S=new rs(180,25,90,.6,$a);this.aircraft.push({id:T(1),path:_,period:260,offset:.4,contrail:S});let R=0;for(const A of l)R+=A.getAttribute("position").count;const O=hu("traffic-movers-v1",!0);this.materials.push(O),this.movers=new Og(l.length,R,R,O);const I=l.map(A=>{const U=this.movers.addInstance(this.movers.addGeometry(A));return A.dispose(),U});for(const A of this.boats)A.id=I[A.id];for(const A of this.aircraft)A.id=I[A.id];for(const A of h)this.movers.setMatrixAt(I[A.idx],A.m);this.movers.frustumCulled=!1,this.movers.castShadow=!0,this.movers.receiveShadow=!0,this.group.add(this.movers)}group=new Re;materials=[];boats=[];carRoutes=[];cars=[];carChunks=[];carCells=new Map;carOverflow;carMat;movers;aircraft=[];tmp={x:0,z:0,dx:1,dz:0};tmpM=new Yt;tmpQ=new Ae;tmpP=new P;tmpS=new P(1,1,1);tmpE=new Ee(0,0,0,"YXZ");up=new P(0,1,0);pos=new P;dir=new P;side=new P;ahead=new P;boatCount=0;carCount=0;len3(t){let e=0;for(let n=0;n<t.length-1;n++)e+=t[n].distanceTo(t[n+1]);return e}point3(t,e,n,i){let r=0;for(let o=0;o<t.length-1;o++){const a=t[o].distanceTo(t[o+1]);if(e<=r+a||o===t.length-2){const c=Kt((e-r)/a,0,1);i.subVectors(t[o+1],t[o]).divideScalar(a),n.copy(t[o]).addScaledVector(i,a*c);return}r+=a}}get contrailMeshes(){return this.aircraft.filter(t=>t.contrail).map(t=>t.contrail.mesh)}update(t,e,n){const{tmpM:i,tmpQ:r,tmpP:o,tmpS:a,tmpE:c,movers:l}=this;a.set(1,1,1);for(const p of this.boats){const x=p.routeLen;p.s+=p.speed*t*p.dir,p.s>x-5&&(p.s=x-5,p.dir=-1),p.s<5&&(p.s=5,p.dir=1),xx(p.route,p.s,this.tmp);const g=Math.atan2(this.tmp.dx*p.dir,this.tmp.dz*p.dir);o.set(this.tmp.x,-p.draft*.15+.12*Math.sin(e*1.3+p.phase)*(p.len<20?1:.2),this.tmp.z),c.set(.02*Math.sin(e*1.7+p.phase),g-Math.PI/2,.03*Math.sin(e*1.1+p.phase)+(p.speed>8?-.03:0),"XYZ"),l.setMatrixAt(p.id,i.compose(o,r.setFromEuler(c),a)),p.wake.update(this.tmp.x-this.tmp.dx*p.dir*p.len*.4,this.tmp.z-this.tmp.dz*p.dir*p.len*.4,e,!0,p.speed)}const{pos:h,dir:d,side:u,up:f}=this;for(const p of this.carChunks)p.n=0,p.box.makeEmpty();for(let p=0;p<this.cars.length;p++){const x=this.cars[p],g=this.carRoutes[x.route];x.s+=x.speed*t*x.dir,x.s>g.length&&(x.s=0),x.s<0&&(x.s=g.length),this.point3(g.pts,x.s,h,d),x.dir<0&&d.negate(),u.crossVectors(d,f).normalize();const m=(g.lanes>=4?1.5+x.lane*3.2:1.8)+0;h.addScaledVector(u,m);const y=Math.atan2(d.x,d.z)-Math.PI/2,w=-Math.asin(Kt(d.y,-1,1));this.tmpQ.setFromEuler(this.tmpE.set(0,y,w,"YXZ")),this.tmpP.copy(h),this.tmpM.compose(this.tmpP,this.tmpQ,this.tmpS);let v=this.carCells.get(tc(h.x,h.z,Jl));(!v||v.n>=v.capacity)&&(v=this.carOverflow);const T=v.n++;v.mesh.setMatrixAt(T,this.tmpM),v.mesh.setColorAt(T,x.color),v.box.expandByPoint(h)}for(const p of this.carChunks){const x=p.mesh;if(x.count=p.n,!p.n){x.visible=!1;continue}x.visible=!0,x.instanceMatrix.clearUpdateRanges(),x.instanceMatrix.addUpdateRange(0,p.n*16),x.instanceMatrix.needsUpdate=!0,x.instanceColor.clearUpdateRanges(),x.instanceColor.addUpdateRange(0,p.n*3),x.instanceColor.needsUpdate=!0,p.box.min.addScalar(-Ql),p.box.max.addScalar(Ql),x.boundingSphere&&(p.box.getBoundingSphere(x.boundingSphere),p.center.copy(x.boundingSphere.center),p.r=x.boundingSphere.radius)}this.carMat.emissiveIntensity=6*n;for(const p of this.aircraft){const x=(e/p.period+p.offset)%1,g=p.path(x,this.pos),m=p.path(Math.min(1,x+.002),this.ahead).sub(g).normalize(),y=Math.atan2(m.x,m.z)-Math.PI/2,w=Math.asin(Kt(m.y,-1,1));c.set(0,y,w*.6,"YXZ"),l.setMatrixAt(p.id,i.compose(g,r.setFromEuler(c),a)),p.contrail&&(p.contrail.update(g.x,g.z,e,!0,250),p.contrail.mesh.position.y=g.y-2,p.contrail.mesh.updateMatrix())}}updateCulling(t){for(const e of this.carChunks){if(!e.n||e===this.carOverflow)continue;const n=t.boxInView(e.box),i=t.casterInView(e.center,e.r,2.5);e.mesh.visible=n||i,e.mesh.castShadow=i,e.mesh.layers.mask=ur("mid",n)}}}function Ys(s,t=!1){const e=s[0].index!==null,n=new Set(Object.keys(s[0].attributes)),i=new Set(Object.keys(s[0].morphAttributes)),r={},o={},a=s[0].morphTargetsRelative,c=new oe;let l=0;for(let h=0;h<s.length;++h){const d=s[h];let u=0;if(e!==(d.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const f in d.attributes){if(!n.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have compatible attributes; make sure "'+f+'" attribute exists among all geometries, or in none of them.'),null;r[f]===void 0&&(r[f]=[]),r[f].push(d.attributes[f]),u++}if(u!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of attributes."),null;if(a!==d.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const f in d.morphAttributes){if(!i.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+".  .morphAttributes must be consistent throughout all geometries."),null;o[f]===void 0&&(o[f]=[]),o[f].push(d.morphAttributes[f])}if(t){let f;if(e)f=d.index.count;else if(d.attributes.position!==void 0)f=d.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". The geometry must have either an index or a position attribute"),null;c.addGroup(l,f,h),l+=f}}if(e){let h=0;const d=[];for(let u=0;u<s.length;++u){const f=s[u].index;for(let p=0;p<f.count;++p)d.push(f.getX(p)+h);h+=s[u].attributes.position.count}c.setIndex(d)}for(const h in r){const d=th(r[h]);if(!d)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" attribute."),null;c.setAttribute(h,d)}for(const h in o){const d=o[h][0].length;if(d===0)break;c.morphAttributes=c.morphAttributes||{},c.morphAttributes[h]=[];for(let u=0;u<d;++u){const f=[];for(let x=0;x<o[h].length;++x)f.push(o[h][x][u]);const p=th(f);if(!p)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" morphAttribute."),null;c.morphAttributes[h].push(p)}}return c}function th(s){let t,e,n,i=-1,r=0;for(let l=0;l<s.length;++l){const h=s[l];if(t===void 0&&(t=h.array.constructor),t!==h.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(e===void 0&&(e=h.itemSize),e!==h.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=h.normalized),n!==h.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(i===-1&&(i=h.gpuType),i!==h.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;r+=h.count*e}const o=new t(r),a=new fe(o,e,n);let c=0;for(let l=0;l<s.length;++l){const h=s[l];if(h.isInterleavedBufferAttribute){const d=c/e;for(let u=0,f=h.count;u<f;u++)for(let p=0;p<e;p++){const x=h.getComponent(u,p);a.setComponent(u+d,p,x)}}else o.set(h.array,c);c+=h.count*e}return i!==void 0&&(a.gpuType=i),a}const ec=Math.PI*2;function ys(s,t,e=[0,0]){const n=s.n??2.2,i=s.nBot??n,r=t*ec-Math.PI/2,o=Math.cos(r),a=Math.sin(r),c=a<=0,l=c?n:i;return e[1]=Math.sign(o)*Math.pow(Math.abs(o),2/l)*s.w,e[0]=s.yc-Math.sign(a)*Math.pow(Math.abs(a),2/l)*(c?s.top:s.bot),e}function tr(s,t){const e=s.n??2.2,n=s.nBot??e,i=t-s.yc;return i>=0?i>=s.top?null:(Math.PI/2-Math.asin(Math.pow(i/s.top,e/2)))/ec:-i>=s.bot?null:(Math.PI/2+Math.asin(Math.pow(-i/s.bot,n/2)))/ec}function uu(s,t){const e=tr(s,t);return e===null?0:Math.abs(ys(s,e)[1])}function Mx(s,t=64){let e=0;const n=ys(s,0),i=[0,0];for(let r=1;r<=t;r++)ys(s,r/t,i),e+=Math.hypot(i[0]-n[0],i[1]-n[1]),n[0]=i[0],n[1]=i[1];return e}function Sx(s,t,e,n){const i=(a,c)=>a+(c-a)*e,r=s.n??2.2,o=t.n??2.2;return{x:n,yc:i(s.yc,t.yc),w:i(s.w,t.w),top:i(s.top,t.top),bot:i(s.bot,t.bot),n:i(r,o),nBot:i(s.nBot??r,t.nBot??o)}}function os(s,t){const e=s.length;for(let o=0;o<e-1;o++){const a=s[o],c=s[o+1],l=Math.min(a.x,c.x),h=Math.max(a.x,c.x);if(t>=l-1e-9&&t<=h+1e-9)return Sx(a,c,h===l?0:(t-a.x)/(c.x-a.x),t)}const n=s[0],i=s[e-1];return{...Math.abs(t-n.x)<Math.abs(t-i.x)?n:i,x:t}}function bx(s,t){const e=s.slice(),n=s[0].x>s[s.length-1].x;for(const i of t)e.some(r=>Math.abs(r.x-i)<1e-6)||e.push(os(s,i));return e.sort((i,r)=>n?r.x-i.x:i.x-r.x),e}function eh(s,t){return s.map(e=>({...e,w:Math.max(e.w-t,.01),top:Math.max(e.top-t,.01),bot:Math.max(e.bot-t,.01)}))}function Ex(s){const t=[];for(let e=0;e<=s;e++)t.push(e/s);return t}function nh(s,t,e,n,i){const o=[0],a=ys(s,t),c=[0,0];for(let d=1;d<=24;d++)ys(s,t+(e-t)*(d/24),c),o.push(o[d-1]+Math.hypot(c[0]-a[0],c[1]-a[1])),a[0]=c[0],a[1]=c[1];const l=o[24]||1e-9;let h=1;for(let d=1;d<n;d++){const u=l*(d/n);for(;h<24&&o[h]<u;)h++;const f=(u-o[h-1])/Math.max(o[h]-o[h-1],1e-9);i.push(t+(e-t)*((h-1+f)/24))}i.push(e)}function Tx(s,t){return e=>{const n=[];let i=0;const r=[0];for(const o of s){const a=typeof o.y=="function"?o.y(e):o.y;let c=e.yc+e.top*.97>a&&e.yc-e.bot*.97<a?tr(e,a):o.fallbackT;c=Math.max(c,i+5e-4),nh(e,i,c,o.segs,r),i=c}nh(e,i,.5,t,r);for(const o of r)n.push(o);for(let o=r.length-2;o>=0;o--)n.push(1-r[o]);return n}}function yc(s,t,e,n,i,r){const o=t*(n+1)+e,a=o+n+1;i!==r?s.push(o,o+1,a,o+1,a+1,a):s.push(o,a,o+1,o+1,a,a+1)}function nc(s,t){const e=s.length,n=s.map((x,g)=>t(x,g)),i=n[0].length-1;let r=0;const o=[0];for(let x=1;x<e;x++)r+=Math.abs(s[x].x-s[x-1].x),o.push(r);const a=o.map(x=>x/Math.max(r,1e-6)),c=new Float32Array(e*(i+1)*3),l=new Float32Array(e*(i+1)*2),h=[0,0];for(let x=0;x<e;x++)for(let g=0;g<=i;g++){ys(s[x],n[x][g],h);const m=x*(i+1)+g;c[m*3]=s[x].x,c[m*3+1]=h[0],c[m*3+2]=h[1],l[m*2]=a[x],l[m*2+1]=n[x][g]}const d=s[e-1].x>=s[0].x,u=new oe;u.setAttribute("position",new fe(c,3));const f=[];for(let x=0;x<e-1;x++)for(let g=0;g<i;g++)yc(f,x,g,i,d,!1);u.setIndex(f),u.computeVertexNormals();const p=u.getAttribute("normal").array;for(let x=0;x<e;x++){const g=x*(i+1),m=g+i;let y=p[g*3]+p[m*3],w=p[g*3+1]+p[m*3+1],v=p[g*3+2]+p[m*3+2];const T=Math.hypot(y,w,v)||1;y/=T,w/=T,v/=T,p[g*3]=y,p[g*3+1]=w,p[g*3+2]=v,p[m*3]=y,p[m*3+1]=w,p[m*3+2]=v}return{sections:s,R:i,t:n,u:a,pos:c,uv:l,normal:p,forwardX:d}}function $s(s,t={}){const e=s.sections.length,n=s.R,i=t.i0??0,r=t.i1??e-1,o=!!t.flip,a=Array.from(s.pos),c=Array.from(s.uv),l=Array.from(s.normal);if(o)for(let f=0;f<l.length;f++)l[f]=-l[f];const h=[];for(let f=i;f<r;f++)for(let p=0;p<n;p++)(!t.quad||t.quad(f,p))&&yc(h,f,p,n,s.forwardX,o);const d=(f,p)=>{const x=s.sections[f],g=s.sections[p?Math.min(f+1,e-1):Math.max(f-1,0)];let m=Math.sign(x.x-g.x)||(p?-1:1);o&&(m=-m);const y=a.length/3;a.push(x.x,x.yc,0),l.push(m,0,0),c.push(s.u[f],.5);for(let w=0;w<=n;w++){const v=f*(n+1)+w;a.push(s.pos[v*3],s.pos[v*3+1],s.pos[v*3+2]),l.push(m,0,0),c.push(s.uv[v*2],s.uv[v*2+1])}for(let w=0;w<n;w++)m>0?h.push(y,y+1+w,y+2+w):h.push(y,y+2+w,y+1+w)};t.capStart&&d(i,!0),t.capEnd&&d(r,!1);const u=new oe;return u.setAttribute("position",new bt(a,3)),u.setAttribute("normal",new bt(l,3)),u.setAttribute("uv",new bt(c,2)),u.setIndex(h),u}function Ax(s,t,e,n){return e<s.i0||e>=s.i1?!1:n>=s.j0&&n<s.j1||n+t>=s.j0&&n+t<s.j1}function Cx(s,t,e){const n=s.R,{i0:i,i1:r,j0:o,j1:a}=e,c=T=>T>n?T-n:T,l=[];for(let T=o;T<a;T++)l.push([i,c(T)]);for(let T=i;T<r;T++)l.push([T,c(a)]);for(let T=a;T>o;T--)l.push([r,c(T)]);for(let T=r;T>i;T--)l.push([T,c(o)]);const h=(T,M,E)=>{const b=(M*(n+1)+E)*3;return new P(T.pos[b],T.pos[b+1],T.pos[b+2])},d=new P;for(const[T,M]of l)d.add(h(s,T,M));d.multiplyScalar(1/l.length);const u=[],f=[],p=[],x=(T,M,E,b)=>{for(const _ of[T,M,E])u.push(_.x,_.y,_.z),f.push(b.x,b.y,b.z),p.push(0,0)},g=new P,m=new P,y=new P,w=new P;for(let T=0;T<l.length;T++){const[M,E]=l[T],[b,_]=l[(T+1)%l.length],S=h(s,M,E),R=h(s,b,_),O=h(t,M,E),I=h(t,b,_);g.subVectors(R,S),m.subVectors(O,S),y.crossVectors(g,m).normalize(),w.addVectors(S,R).multiplyScalar(.5).sub(d).negate(),y.dot(w)>=0?(x(S,R,O,y),x(R,I,O,y)):(y.negate(),x(S,O,R,y),x(R,O,I,y))}const v=new oe;return v.setAttribute("position",new bt(u,3)),v.setAttribute("normal",new bt(f,3)),v.setAttribute("uv",new bt(p,2)),v}function ih(s,t,e,n,i,r=8){const o=Math.min(e,n),a=Math.max(e,n),c=[],l=[],h=[],d=f=>Math.max(uu(os(s,f),t)-i,.02);for(let f=0;f<r;f++){const p=o+(a-o)*(f/r),x=o+(a-o)*((f+1)/r),g=d(p),m=d(x),y=[[p,-g],[x,m],[x,-m],[p,-g],[p,g],[x,m]];for(const[w,v]of y)c.push(w,t,v),l.push(0,1,0),h.push((w-o)/(a-o),v*.5+.5)}const u=new oe;return u.setAttribute("position",new bt(c,3)),u.setAttribute("normal",new bt(l,3)),u.setAttribute("uv",new bt(h,2)),u}function Rx(s,t,e,n=16,i=6){const r=s.length,o=n/2,a=n+i,c=[];for(let y=0;y<=o;y++)c.push(y/o);for(let y=1;y<=i;y++)c.push(1-2*(y/i));for(let y=1;y<=o;y++)c.push(-1+y/o);const l=y=>y<=o||y>=o+i,h=[],d=[],u=[];let f=0;for(let y=1;y<r;y++)f+=Math.abs(s[y].x-s[y-1].x);let p=0;for(let y=0;y<r;y++){const w=s[y];y>0&&(p+=Math.abs(w.x-s[y-1].x));for(let v=0;v<=a;v++){const T=c[v]*w.w;h.push(w.x,l(v)?t(w.x,T):e(w.x,T),T),d.push(p/Math.max(f,1e-6),v/a)}}for(let y=0;y<r-1;y++)for(let w=0;w<a;w++)yc(u,y,w,a,!1,!1);const x=(y,w)=>{const v=h.length/3;let T=0;for(let M=0;M<a;M++)T+=h[(y*(a+1)+M)*3+1];h.push(s[y].x,T/a,0),d.push(y===0?0:1,.5);for(let M=0;M<=a;M++){const E=y*(a+1)+M;h.push(h[E*3],h[E*3+1],h[E*3+2]),d.push(d[E*2],d[E*2+1])}for(let M=0;M<a;M++)w>0?u.push(v,v+1+M,v+2+M):u.push(v,v+2+M,v+1+M)};x(0,1),x(r-1,-1);const g=new oe;g.setAttribute("position",new bt(h,3)),g.setAttribute("uv",new bt(d,2)),g.setIndex(u),g.computeVertexNormals();const m=g.getAttribute("normal");for(let y=0;y<r;y++){const w=y*(a+1),v=w+a,T=new P(m.getX(w)+m.getX(v),m.getY(w)+m.getY(v),m.getZ(w)+m.getZ(v)).normalize();m.setXYZ(w,T.x,T.y,T.z),m.setXYZ(v,T.x,T.y,T.z)}return g}function Px(s,t=28,e=!0){const n=nc(s,()=>Ex(t));return $s(n,{capStart:e,capEnd:e})}function io(s,t){return 5*t*(.2969*Math.sqrt(s)-.126*s-.3516*s*s+.2843*s**3-.1036*s**4)}function er(s,t){return t*Math.sin(Math.PI*s)}function zi(s,t){return s.rootChord+(s.tipChord-s.rootChord)*(t/s.span)}function ws(s,t){return .3*zi(s,t)+s.sweep*(t/s.span)}function ea(s,t){return ws(s,t)-zi(s,t)}function sh(s,t,e){const n=zi(s,e),i=Di.clamp((ws(s,e)-t)/n,0,1);return Math.tan(s.dihedral)*e+(er(i,s.camber)-io(i,s.thickness))*n}function Lx(s,t,e){const n=zi(s,e),i=Di.clamp((ws(s,e)-t)/n,0,1);return Math.tan(s.dihedral)*e+(er(i,s.camber)+io(i,s.thickness))*n}function rh(s,t,e,n,i){const r=h=>({x:h,y:er(h,n)+io(h,e),u:.5-.5*h}),o=h=>({x:h,y:er(h,n)-io(h,e),u:.5+.5*h}),a=[];if(s==="rear"){const h={x:1,y:er(1,n),u:0};a.push(h);for(let d=1;d<i;d++)a.push(r(t+(1-t)*(1-d/i)));a.push(r(t),{...r(t),flat:!0}),a.push({...o(t),flat:!0},o(t));for(let d=1;d<i;d++)a.push(o(t+(1-t)*(d/i)));return a.push({...h,u:1}),a}const c=s==="front"?t:1,l=h=>c*Math.pow(1-h/i,2);a.push(r(c)),s==="front"&&a.push(r(c));for(let h=1;h<=i;h++)a.push(r(l(h)));for(let h=i-1;h>=1;h--)a.push(o(l(h)));return a.push(o(c)),s==="front"&&a.push({...o(c),flat:!0}),a.push({...r(c),u:s==="front"?.5-.5*c:1,flat:s==="front"}),a}const na=.22;function on(s,t){const e=s.camber??.02,n=t.n??12,i=[],r=[],o=[],a=[],c=[];for(let p=0;p<=t.segments;p++)c.push({z:t.z0+(t.z1-t.z0)*(p/t.segments),scale:1});if(t.tipRound&&t.tipRound>0)for(let x=1;x<=6;x++){const g=x/6*Math.PI/2;c.push({z:t.z1+t.tipRound*Math.sin(g),scale:Math.max(Math.cos(g),.02)})}const l=p=>{const x=zi(s,p),g=ws(s,p);return t.hingeX!==void 0?(g-t.hingeX)/x:.75};let h=0;const d=(p,x,g,m,y)=>{const w=zi(s,g),v=ws(s,g),T=s.twist*(g/s.span),M=.5+(p.x-.5)*m,E=p.y*m,b=(M-.3)*w,_=E*w,S=Math.cos(T),R=Math.sin(T),O=b*S+_*R,I=-b*R+_*S;y.push(-O+(v-.3*w),Math.tan(s.dihedral)*x+I,x)};for(const p of c){const x=Math.min(p.z,t.z1),g=zi(s,x),m=l(x),y=rh(t.part,t.part==="rear"?m+(t.gap??.015)/g:m,s.thickness,e,n);h=y.length;for(const w of y){d(w,p.z,x,p.scale,i);const v=Math.min(1,p.z/s.span);w.flat?(r.push(.02,v),a.push(na,na,na)):(r.push(w.u,v),a.push(1,1,1))}}for(let p=0;p<c.length-1;p++)for(let x=0;x<h-1;x++){const g=p*h+x,m=g+h;o.push(g,m,g+1,g+1,m,m+1)}const u=(p,x,g)=>{const m=l(p),y=rh(x,m,s.thickness,e,n),w=i.length/3,v=[];for(const b of y)d(b,p,p,1,v);let T=0,M=0;const E=y.length-1;for(let b=0;b<E;b++)T+=v[b*3],M+=v[b*3+1];i.push(T/E,M/E,p),r.push(.5,Math.min(1,p/s.span)),a.push(1,1,1);for(let b=0;b<E;b++)i.push(v[b*3],v[b*3+1],v[b*3+2]),r.push(y[b].u,Math.min(1,p/s.span)),a.push(1,1,1);for(let b=0;b<E;b++){const _=w+1+b,S=w+1+(b+1)%E;g?o.push(w,S,_):o.push(w,_,S)}};t.capStart&&u(t.z0,t.capStart,!1),t.capEnd&&u(t.z1,t.capEnd,!0);const f=new oe;return f.setAttribute("position",new bt(i,3)),f.setAttribute("uv",new bt(r,2)),f.setAttribute("color",new bt(a,3)),f.setIndex(o),f.computeVertexNormals(),f}function Dx(s,t,e){const r=[],o=[],a=[];for(let l=0;l<=10;l++){const h=l/10,d=h*s,u=t+(e-t)*Math.pow(h,1.4),f=u*(.16-.08*h),p=.95-.7*h,x=Math.cos(p),g=Math.sin(p);for(let m=0;m<8;m++){const y=m/8*Math.PI*2,w=-.5*Math.cos(y),v=Math.sin(y)>=0,T=.08*u*(1-4*w*w),M=.5*f*Math.sqrt(Math.max(0,1-4*w*w))*Math.abs(Math.sin(y)),E=w*u,b=T+(v?M:-M);r.push(E*x-b*g,d,E*g+b*x),a.push(m/8,h)}}for(let l=0;l<10;l++)for(let h=0;h<8;h++){const d=(h+1)%8,u=l*8+h,f=u+8,p=l*8+d,x=p+8;o.push(u,f,p,p,f,x)}const c=new oe;return c.setAttribute("position",new bt(r,3)),c.setAttribute("uv",new bt(a,2)),c.setIndex(o),c.computeVertexNormals(),c}function du(s,t){const e=new Ae().setFromUnitVectors(new P(0,1,0),t.clone().sub(s).normalize());return new Yt().compose(s.clone().add(t).multiplyScalar(.5),e,new P(1,1,1))}function ia(s,t,e,n=8){const i=new ye(e,e,s.distanceTo(t),n);return i.applyMatrix4(du(s,t)),i}function ts(s,t,e,n){const i=new ye(.5,.5,s.distanceTo(t),10);return i.scale(e,1,n),i.applyMatrix4(du(s,t)),i}function Ix(s,t,e){const n=s instanceof P?s:new P(...s??[0,0,0]),i=t instanceof Ee?t:new Ee(...t??[0,0,0]),r=typeof e=="number"?new P(e,e,e):e instanceof P?e:new P(...e??[1,1,1]);return new Yt().compose(n,new Ae().setFromEuler(i),r)}function zx(s){const t=s.clone();if(t.index)return t;const e=t.getAttribute("position").count,n=new Uint32Array(e);for(let i=0;i<e;i++)n[i]=i;return t.setIndex(new fe(n,1)),t}function Ux(s,t){const e=zx(s);if(!t)return e;if(e.applyMatrix4(t),t.determinant()<0){const n=e.index;for(let i=0;i<n.count;i+=3){const r=n.getX(i+1),o=n.getX(i+2);n.setX(i+1,o),n.setX(i+2,r)}}return e}function Nx(s,t){const e=s.getAttribute("position"),n=e.count,i=new Float32Array(n*3),r=new Float32Array(n*2),o=new Ft;let a=null;for(let c=0;c<n;c++){const l=typeof t=="function"?t(e.getX(c),e.getY(c),e.getZ(c)):t;l!==a&&(o.set(l.color),a=l),i[c*3]=o.r,i[c*3+1]=o.g,i[c*3+2]=o.b,r[c*2]=l.roughness,r[c*2+1]=l.metalness}return s.setAttribute("color",new fe(i,3)),s.setAttribute("aSurf",new fe(r,2)),s}function Fx(){const s=new le({color:16777215,roughness:1,metalness:1,vertexColors:!0});return s.onBeforeCompile=t=>{t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aSurf;
varying vec2 vSurf;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vSurf = aSurf;`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vSurf;`).replace("#include <roughnessmap_fragment>","float roughnessFactor = roughness * vSurf.x;").replace("#include <metalnessmap_fragment>","float metalnessFactor = metalness * vSurf.y;")},s.customProgramCacheKey=()=>"plane-parts-v1",s}class Qe{constructor(t){this.defaultSurf=t}parts=[];add(t,e,n=this.defaultSurf){const i=Ux(t,e);return n&&Nx(i,n),this.parts.push(i),this}get size(){return this.parts.length}build(){if(this.parts.length===1)return this.parts[0];const t=Ys(this.parts,!1);if(!t)throw new Error("Batch: parts have incompatible attributes");return t}}function cn(s,t){const e=document.createElement("canvas");return e.width=s,e.height=t,[e,e.getContext("2d")]}function Mn(s,t,e=8){const n=new lr(s);return n.flipY=!1,n.colorSpace=t?nn:In,n.wrapS=ps,n.wrapT=ps,n.anisotropy=e,n}function wc(s,t=2){const e=s.width,n=s.height,i=s.getContext("2d").getImageData(0,0,e,n).data,[r,o]=cn(e,n),a=o.createImageData(e,n),c=(l,h)=>i[((h+n)%n*e+(l+e)%e)*4]/255;for(let l=0;l<n;l++)for(let h=0;h<e;h++){const d=(c(h+1,l)-c(h-1,l))*t,u=(c(h,l+1)-c(h,l-1))*t,f=Math.hypot(d,u,1),p=(l*e+h)*4;a.data[p]=Math.round((-d/f*.5+.5)*255),a.data[p+1]=Math.round((-u/f*.5+.5)*255),a.data[p+2]=Math.round((1/f*.5+.5)*255),a.data[p+3]=255}return o.putImageData(a,0,0),r}function Ms(s,t,e,n,i,r,o="40,35,30"){for(let a=0;a<i;a++){const c=t.range(0,e),l=t.range(0,n),h=t.range(8,60),d=s.createRadialGradient(c,l,0,c,l,h);d.addColorStop(0,`rgba(${o},${r*t.range(.4,1)})`),d.addColorStop(1,`rgba(${o},0)`),s.fillStyle=d,s.fillRect(c-h,l-h,h*2,h*2)}}function Mc(s,t,e,n,i,r,o){s.strokeStyle="#5a5a5a",s.lineWidth=2.2,t.strokeStyle="rgba(30,30,35,0.22)",t.lineWidth=1.5;for(const a of i){const c=a*e;s.beginPath(),s.moveTo(c,0),s.lineTo(c,n),s.stroke(),t.save(),t.strokeStyle="rgba(40,38,34,0.07)",t.lineWidth=9,t.beginPath(),t.moveTo(c,0),t.lineTo(c,n),t.stroke(),t.restore(),t.beginPath(),t.moveTo(c,0),t.lineTo(c,n),t.stroke();for(const l of[-7,7])for(let h=o/2;h<n;h+=o)s.fillStyle="#b8b8b8",s.beginPath(),s.arc(c+l,h,1.6,0,Math.PI*2),s.fill(),t.fillStyle="rgba(255,255,255,0.10)",t.beginPath(),t.arc(c+l,h,1.4,0,Math.PI*2),t.fill(),t.fillStyle="rgba(0,0,0,0.10)",t.beginPath(),t.arc(c+l,h+1.2,1.2,0,Math.PI*2),t.fill()}for(const a of r){const c=a*n;s.strokeStyle="#6a6a6a",s.lineWidth=1.4,s.beginPath(),s.moveTo(0,c),s.lineTo(e,c),s.stroke(),t.strokeStyle="rgba(30,30,35,0.12)",t.beginPath(),t.moveTo(0,c),t.lineTo(e,c),t.stroke();for(let l=o/2;l<e;l+=o)s.fillStyle="#b0b0b0",s.beginPath(),s.arc(l,c+5,1.5,0,Math.PI*2),s.fill(),t.fillStyle="rgba(0,0,0,0.08)",t.beginPath(),t.arc(l,c+6,1.2,0,Math.PI*2),t.fill()}}const $e={upper:"#f3f1ea",under:"#e3d9c2",lower:"#f6c230",cheat:"#1c2d5a",pin:"#d8322e",registration:"N726BV"},hs={top:.03,bottom:.1,pin:.125};function oh(s,t,e,n,i,r,o,a,c,l,h){const d=e/t.length,u=n/t.perimeter(r),f=t.vOf(r,o)??.25,p=a/.72*d;for(const x of[1,-1])s.save(),s.translate(t.uOf(r)*e,(x>0?f:1-f)*n),s.scale(x>0?-1:1,x*(u/d)),s.fillStyle=h,s.font=`${c} ${p.toFixed(1)}px ${l}`,s.textAlign="center",s.textBaseline="middle",s.fillText(i,0,0),s.restore()}function Ox(s){const n=new Ve("fuselage-paint"),[i,r]=cn(2048,1024),[o,a]=cn(2048,1024),[c,l]=cn(2048,1024);a.fillStyle="#808080",a.fillRect(0,0,2048,1024),r.fillStyle=$e.upper,r.fillRect(0,0,2048,1024);const h=[],d=(b,_)=>s.vOf(b,_)??.5;for(let b=0;b<=2048;b+=8){const _=s.xOf(b/2048),S=s.sillY(_);h.push({px:b,cheatTop:d(_,S-hs.top),cheatBot:d(_,S-hs.bottom),pinBot:d(_,S-hs.pin)})}const u=(b,_,S,R)=>{const O=I=>(R>0?I:1-I)*1024;r.beginPath(),r.moveTo(h[0].px,O(b(h[0])));for(const I of h)r.lineTo(I.px,O(b(I)));for(let I=h.length-1;I>=0;I--)r.lineTo(h[I].px,O(_(h[I])));r.closePath(),r.fillStyle=S,r.fill()};u(b=>b.pinBot,b=>1-b.pinBot,$e.lower,1);for(const b of[1,-1])u(_=>_.cheatTop,_=>_.cheatBot,$e.cheat,b),u(_=>_.cheatBot,_=>_.pinBot,$e.pin,b);const f=[];for(let b=2.32;b<=3.7;b+=.1)f.push([s.uOf(b)*2048,s.topV(b,b>3.4?.45-(b-3.4)*.9:.45)*1024]);r.fillStyle="#2a2d31";for(const b of[1,-1]){const _=b>0?0:1024;r.beginPath(),r.moveTo(f[0][0],_);for(const[S,R]of f)r.lineTo(S,b>0?R:1024-R);r.lineTo(f[f.length-1][0],_),r.closePath(),r.fill()}const p=s.uOf(4.22)*2048;r.fillStyle="#2e3136",r.fillRect(0,0,p,1024),r.fillStyle="#9aa0a6",r.fillRect(p-6,0,6,1024),r.fillStyle="#1b1d20";for(let b=0;b<12;b++)r.fillRect(p*.45,b/12*1024+6,p*.15,1024/12-12);oh(r,s,2048,1024,$e.registration,-3.05,.47,.18,"bold",'"Helvetica Neue", Arial, sans-serif',$e.cheat),oh(r,s,2048,1024,"BAHÍA VISTA AIR TAXI",-.25,.1,.085,"bold italic",'Georgia, "Times New Roman", serif',$e.cheat);const x=[3.9,3.2,2.32,1.85,0,-.9,-1.6,-2.6,-3.7,-4.7].map(b=>s.uOf(b));Mc(a,r,2048,1024,x,[.12,.2,.3,.42,.5,.58,.7,.8,.88],26),a.strokeStyle="#3a3a3a",a.lineWidth=3,r.strokeStyle="rgba(20,20,25,0.35)",r.lineWidth=2;const g=s.uOf(1.77)*2048,m=s.uOf(.95)*2048;for(const b of[1,-1]){const _=s.vOf(1.3,.4)??.2,S=s.vOf(1.3,-.42)??.4,R=(b>0?_:1-_)*1024,O=(b>0?S:1-S)*1024,I=Math.min(R,O),A=Math.abs(O-R);a.strokeRect(g,I,m-g,A),r.strokeRect(g,I,m-g,A);const U=s.vOf(1,.05)??.25;r.fillStyle="#8a8f94",r.fillRect(m-40,(b>0?U:1-U)*1024-4,22,8)}const y=s.uOf(2.75),w=d(2.75,-.5),v=s.uOf(-.9),T=(b,_,S)=>{const R=b.createLinearGradient(y*2048,0,v*2048,0);R.addColorStop(0,`rgba(${_},${S})`),R.addColorStop(.3,`rgba(${_},${S*.5})`),R.addColorStop(1,`rgba(${_},0)`),b.fillStyle=R,b.beginPath(),b.moveTo(y*2048,(w-.018)*1024),b.lineTo(v*2048,(w-.05)*1024),b.lineTo(v*2048,(w+.05)*1024),b.lineTo(y*2048,(w+.018)*1024),b.closePath(),b.fill()};T(r,"25,22,20",.5);for(let b=0;b<16;b++){const _=s.uOf(n.range(3,4))*2048,S=(.5+n.range(-.06,.06))*1024,R=n.range(40,150),O=r.createLinearGradient(_,0,_+R,0);O.addColorStop(0,`rgba(35,30,22,${n.range(.14,.32)})`),O.addColorStop(1,"rgba(35,30,22,0)"),r.fillStyle=O,r.fillRect(_,S-n.range(1,2),R,n.range(2,4))}Ms(r,n,2048,1024,140,.08);for(let b=0;b<60;b++){const _=n.range(204.8,1843.2),S=n.range(1024*.42,1024*.58);r.strokeStyle=`rgba(40,35,30,${n.range(.05,.2)})`,r.lineWidth=n.range(1,3),r.beginPath(),r.moveTo(_,S),r.lineTo(_+n.range(30,160),S+n.range(-3,3)),r.stroke()}r.fillStyle="rgba(255,255,255,0.05)",r.fillRect(0,0,2048,1024*.12),r.fillRect(0,1024*.88,2048,1024*.12),l.fillStyle="#5a5a5a",l.fillRect(0,0,2048,1024),l.fillStyle="#7a7a7a",l.fillRect(0,0,p,1024),T(l,"170,170,170",.7),Ms(l,n,2048,1024,160,.25,"150,150,150");for(let b=0;b<400;b++){l.strokeStyle=`rgba(120,120,120,${n.range(.2,.5)})`,l.lineWidth=1;const _=n.range(0,2048),S=n.range(0,1024);l.beginPath(),l.moveTo(_,S),l.lineTo(_+n.range(-40,40),S+n.range(-6,6)),l.stroke()}const[M,E]=cn(2048/4,1024/4);E.scale(.25,.25),E.fillStyle="rgb(0,34,0)",E.fillRect(0,0,2048,1024),E.fillStyle="rgb(0,16,0)",E.fillRect(0,0,s.uOf(3.15)*2048,1024),E.fillStyle="rgb(0,120,0)";for(const b of[1,-1]){const _=b>0?0:1024;E.beginPath(),E.moveTo(f[0][0],_);for(const[S,R]of f)E.lineTo(S,b>0?R:1024-R);E.lineTo(f[f.length-1][0],_),E.closePath(),E.fill()}return T(E,"0,110,0",.8),{map:Mn(i,!0),roughnessMap:Mn(c,!1),normalMap:Mn(wc(o,2.4),!1),clearcoatRoughnessMap:Mn(M,!1)}}function Bx(){const e=new Ve("wing-paint"),[n,i]=cn(1024,1024),[r,o]=cn(1024,1024),[a,c]=cn(1024,1024);o.fillStyle="#808080",o.fillRect(0,0,1024,1024),i.fillStyle=$e.upper,i.fillRect(0,0,1024,1024),i.fillStyle=$e.under,i.fillRect(1024*.5,0,1024*.5,1024),i.fillStyle=$e.lower,i.fillRect(0,1024*.905,1024,1024*.095),i.fillStyle=$e.cheat,i.fillRect(0,1024*.885,1024,1024*.02),i.fillStyle=$e.pin,i.fillRect(0,1024*.876,1024,1024*.009),i.fillStyle=$e.lower,i.fillRect(1024*.475,0,1024*.0325,1024);const l=[];for(let h=.04;h<.87;h+=.075)l.push(h);Mc(o,i,1024,1024,[.14,.33,.5,.67,.86],l,22),i.fillStyle="#2a2d31",i.fillRect(1024*.3,1024*.12,1024*.11,1024*.08),i.fillStyle="#6d7277",i.beginPath(),i.arc(1024*.4,1024*.27,9,0,7),i.fill();for(let h=0;h<90;h++)i.fillStyle=`rgba(90,90,95,${e.range(.3,.7)})`,i.fillRect(1024*.5+e.range(-8,8),e.range(0,1024),e.range(1,3),e.range(1,4));return Ms(i,e,1024,1024,80,.06),c.fillStyle="#5a5a5a",c.fillRect(0,0,1024,1024),c.fillStyle="#909090",c.fillRect(1024*.3,1024*.12,1024*.11,1024*.08),Ms(c,e,1024,1024,90,.2,"150,150,150"),{map:Mn(n,!0),roughnessMap:Mn(a,!1),normalMap:Mn(wc(r,2),!1)}}function kx(){const e=new Ve("float-paint"),[n,i]=cn(1024,512),[r,o]=cn(1024,512),[a,c]=cn(1024,512);o.fillStyle="#808080",o.fillRect(0,0,1024,512),i.fillStyle="#cfd3d6",i.fillRect(0,0,1024,512),i.fillStyle="#2b2e31",i.fillRect(0,0,1024,512*.09),i.fillRect(0,512*.91,1024,512*.09),i.fillStyle=$e.cheat,i.fillRect(0,512*.3,1024,512*.03),i.fillRect(0,512*.67,1024,512*.03),i.fillStyle=$e.lower,i.fillRect(0,512*.42,1024,512*.16),Mc(o,i,1024,512,[.12,.25,.38,.5,.55,.68,.82,.93],[.09,.3,.5,.7,.91],20);for(let l=0;l<120;l++){i.strokeStyle=`rgba(70,85,75,${e.range(.08,.28)})`,i.lineWidth=e.range(1,4);const h=e.range(0,1024),d=e.range(512*.28,512*.72);i.beginPath(),i.moveTo(h,d),i.lineTo(h+e.range(-10,10),d+e.range(10,60)*(d<512/2?1:-1)),i.stroke()}return Ms(i,e,1024,512,100,.1,"60,60,55"),c.fillStyle="#6a6a6a",c.fillRect(0,0,1024,512),c.fillStyle="#c0c0c0",c.fillRect(0,0,1024,512*.09),c.fillRect(0,512*.91,1024,512*.09),Ms(c,e,1024,512,100,.25,"160,160,160"),{map:Mn(n,!0),roughnessMap:Mn(a,!1),normalMap:Mn(wc(r,2.2),!1)}}function Hx(){const e=new Ve("panel-brush"),[n,i]=cn(1024,384);i.fillStyle="#1c1e21",i.fillRect(0,0,1024,384);for(let h=0;h<1400;h++){i.strokeStyle=`rgba(255,255,255,${e.next()*.03})`,i.beginPath();const d=e.next()*384;i.moveTo(0,d),i.lineTo(1024,d+e.next()*2),i.stroke()}const r=(h,d,u,f,p,x="#e8e8e8")=>{i.fillStyle="#0b0c0e",i.beginPath(),i.arc(h,d,u,0,Math.PI*2),i.fill(),i.strokeStyle="#3d4146",i.lineWidth=4,i.stroke(),i.strokeStyle=x,i.lineWidth=2;for(let m=0;m<12;m++){const y=-Math.PI*.75+m/11*Math.PI*1.5;i.beginPath(),i.moveTo(h+Math.cos(y)*u*.78,d+Math.sin(y)*u*.78),i.lineTo(h+Math.cos(y)*u*.9,d+Math.sin(y)*u*.9),i.stroke()}i.fillStyle="#d8d8d8",i.font=`${Math.round(u*.26)}px Arial`,i.textAlign="center",i.fillText(f,h,d+u*.5);const g=-Math.PI*.75+p*Math.PI*1.5;i.strokeStyle="#ffffff",i.lineWidth=3,i.beginPath(),i.moveTo(h,d),i.lineTo(h+Math.cos(g)*u*.75,d+Math.sin(g)*u*.75),i.stroke(),i.fillStyle="#c9a227",i.beginPath(),i.arc(h,d,u*.08,0,7),i.fill()};r(110,100,62,"KIAS",.42),r(250,100,62,"ATT",.5,"#4aa3df"),r(390,100,62,"ALT",.3),r(110,250,62,"TURN",.5),r(250,250,62,"HDG",.6),r(390,250,62,"VSI",.5),i.fillStyle="#2f79c2",i.beginPath(),i.arc(250,100,50,Math.PI,0),i.fill(),i.fillStyle="#7a4b23",i.beginPath(),i.arc(250,100,50,0,Math.PI),i.fill(),i.fillStyle="#f5d142",i.fillRect(220,98,60,4),i.fillStyle="#06131c",i.fillRect(500,60,240,170),i.strokeStyle="#3a4a55",i.lineWidth=6,i.strokeRect(500,60,240,170),i.fillStyle="#1d6fa5",i.fillRect(506,66,228,158),i.fillStyle="#7bb661",i.beginPath(),i.ellipse(620,150,60,30,.3,0,7),i.fill(),i.fillStyle="#e6c47a",i.beginPath(),i.ellipse(560,120,26,16,-.2,0,7),i.fill(),i.strokeStyle="#ff77aa",i.lineWidth=3,i.beginPath(),i.moveTo(520,210),i.lineTo(600,150),i.lineTo(700,90),i.stroke(),i.fillStyle="#ffffff",i.font="bold 16px monospace",i.textAlign="left",i.fillText("GS 118  TRK 342  DIS 12.4",512,84),i.fillText("BAHÍA VISTA  RWY 09",512,216),r(830,90,48,"RPM",.62),r(940,90,48,"MAP",.55),r(830,200,40,"OIL",.5,"#7ad07a"),r(940,200,40,"FUEL",.7,"#7ad07a"),r(830,300,36,"AMP",.5),r(940,300,36,"EGT",.55);for(let h=0;h<14;h++){const d=60+h*34,u=330;i.fillStyle="#2b2f34",i.fillRect(d-8,u-14,16,28),i.fillStyle=h%3===0?"#c9a227":"#d8d8d8",i.fillRect(d-4,u-(h%2?10:0),8,10)}i.fillStyle="#c0392b",i.fillRect(560,250,40,40),i.fillStyle="#fff",i.font="11px Arial",i.textAlign="center",i.fillText("FUEL",580,300),i.fillText("CUTOFF",580,312),i.fillStyle="#e8e8e8",i.font="12px Arial",i.fillText("MASTER   AVIONICS   PITOT HEAT   NAV   STROBE   BEACON   LDG   TAXI   FUEL PUMP",300,372);const o=Mn(n,!0,4);o.flipY=!0;const[a,c]=cn(1024,384);c.fillStyle="#000",c.fillRect(0,0,1024,384),c.drawImage(n,0,0),c.globalCompositeOperation="multiply",c.fillStyle="#4c4c50",c.fillRect(0,0,1024,384),c.globalCompositeOperation="source-over",c.fillStyle="rgba(0,0,0,0.85)",c.fillRect(0,320,1024,64);const l=Mn(a,!0,4);return l.flipY=!0,{map:o,emissive:l}}function Gx(){const[n,i]=cn(256,256),r=i.createRadialGradient(128,128,256*.07,128,128,256/2);r.addColorStop(0,"rgba(40,40,44,0.4)"),r.addColorStop(.35,"rgba(40,40,44,0.18)"),r.addColorStop(.9,"rgba(40,40,44,0.13)"),r.addColorStop(1,"rgba(40,40,44,0)"),i.fillStyle=r,i.fillRect(0,0,256,256);const o=1.3/(Math.PI*2);for(let c=0;c<3;c++){const l=i.createConicGradient(c/3*Math.PI*2,128,128);l.addColorStop(0,"rgba(18,18,22,0.2)"),l.addColorStop(o*.5,"rgba(18,18,22,0.08)"),l.addColorStop(o,"rgba(18,18,22,0)"),l.addColorStop(1,"rgba(18,18,22,0)"),i.fillStyle=l,i.beginPath(),i.arc(128,128,256*.49,0,Math.PI*2),i.fill()}i.strokeStyle="rgba(200,170,60,0.28)",i.lineWidth=7,i.beginPath(),i.arc(128,128,256*.46,0,Math.PI*2),i.stroke();const a=new lr(n);return a.colorSpace=nn,a}const sa=.05,ra=.4,bi=1.07,ah=.78,Vs=2.3,Ws=-1.6,Ei=-.25,oa=2.05,es=.3,fn=new P(.55,1.285,0),Zt={metal:{color:9344154,roughness:.38,metalness:.9},darkMetal:{color:2895667,roughness:.45,metalness:.8},spinner:{color:12896462,roughness:.16,metalness:.95},exhaust:{color:5917244,roughness:.6,metalness:.9},rubber:{color:1118740,roughness:.92,metalness:0},headliner:{color:13223357,roughness:.92,metalness:0},trim:{color:3027254,roughness:.82,metalness:.04},sidewall:{color:9078141,roughness:.88,metalness:0},glareShield:{color:2434858,roughness:.92,metalness:0},plastic:{color:3816770,roughness:.7,metalness:0},leather:{color:8017205,roughness:.55,metalness:0},carpet:{color:3485739,roughness:.95,metalness:0},prop:{color:1974050,roughness:.5,metalness:.6},propTip:{color:15909424,roughness:.5,metalness:0},shirt:{color:3100527,roughness:.85,metalness:0},skin:{color:13145452,roughness:.7,metalness:0},headset:{color:1710620,roughness:.5,metalness:0},throttle:{color:2236962,roughness:.6,metalness:0},mixture:{color:12597547,roughness:.6,metalness:0}},Pn={red:0,green:1,tail:2,beacon:3,strobe:4};class Vx{root=new Re;materials=[];glassMaterial;paintMaterial;propeller=new Re;propDisc;propHub;propBlades;aileronL;aileronR;flapL;flapR;elevator;rudder;waterRudders=[];wheels;lights;lightPower={value:new Float32Array(5)};yokeL;yokeR;throttleLever;exhaustPos=new P(2.6,-.55,.66);floatSternL=new P(-2.2,-2.15,-1.25);floatSternR=new P(-2.2,-2.15,1.25);floatBowL=new P(2.6,-2,-1.25);floatBowR=new P(2.6,-2,1.25);wingTipL=new P(-.04,1.435,-7.5);wingTipR=new P(-.04,1.435,7.5);cockpitEye=new P(1,1,-.3);exteriorMeshes=[];interiorMeshes=[];spanHalf=7.5;constructor(){const t=[{x:4.55,yc:.02,w:.3,top:.3,bot:.3,n:2},{x:4.35,yc:.02,w:.55,top:.55,bot:.55,n:2},{x:3.9,yc:.02,w:.72,top:.7,bot:.7,n:2.1},{x:3.2,yc:.03,w:.75,top:.72,bot:.7,n:2.3},{x:2.6,yc:.04,w:.77,top:.74,bot:.7,n:3,nBot:2.4},{x:2.3,yc:.05,w:.78,top:.76,bot:.7,n:6,nBot:2.4},{x:2.15,yc:.05,w:.79,top:.88,bot:.7,n:5,nBot:2.4},{x:2,yc:.05,w:.8,top:1.01,bot:.7,n:4.7,nBot:2.4},{x:1.85,yc:.05,w:.8,top:1.12,bot:.7,n:4.5,nBot:2.4},{x:1.73,yc:.05,w:.8,top:1.13,bot:.7,n:4.5,nBot:2.4},{x:.95,yc:.05,w:.8,top:1.13,bot:.7,n:4.5,nBot:2.4},{x:0,yc:.05,w:.8,top:1.13,bot:.68,n:4.5,nBot:2.4},{x:-.4,yc:.05,w:.79,top:1.12,bot:.66,n:4.3,nBot:2.4},{x:-.9,yc:.05,w:.76,top:1.08,bot:.62,n:3.8,nBot:2.4},{x:-1.25,yc:.055,w:.7,top:1,bot:.56,n:3.3,nBot:2.3},{x:-1.6,yc:.06,w:.62,top:.9,bot:.5,n:2.7,nBot:2.2},{x:-2.6,yc:.1,w:.44,top:.62,bot:.34,n:2.3,nBot:2.1},{x:-3.7,yc:.16,w:.28,top:.42,bot:.2,n:2.1},{x:-4.7,yc:.24,w:.15,top:.3,bot:.1,n:2},{x:-5.35,yc:.3,w:.06,top:.22,bot:.04,n:2}],e=[[1.77,.95,bi],[.85,-.42,bi],[-.52,-1.25,ah]],n=bx(t,[Vs,Ws,...e.flatMap(([W,xt])=>[W,xt])]),i=W=>n.findIndex(xt=>Math.abs(xt.x-W)<1e-6),r=W=>W>=Ws?ra:ra-(Ws-W)/(5.35+Ws)*.1,o=9,a=2,c=3,l=Tx([{y:bi,segs:o,fallbackT:.1},{y:ah,segs:a,fallbackT:.146},{y:W=>r(W.x),segs:c,fallbackT:.2125},{y:W=>r(W.x)-hs.top,segs:1,fallbackT:.23},{y:W=>r(W.x)-hs.bottom,segs:1,fallbackT:.26},{y:W=>r(W.x)-hs.pin,segs:1,fallbackT:.27}],7),h=o,d=h+a,u=d+c,f=nc(n,l),p=f.R,x=nc(eh(n,sa),(W,xt)=>f.t[xt]),g=[];for(const[W,xt,Tt]of e){const $t=Tt===bi?h:d;g.push({i0:i(W),i1:i(xt),j0:$t,j1:u}),g.push({i0:i(W),i1:i(xt),j0:p-u,j1:p-$t})}g.push({i0:i(Vs),i1:i(1.85),j0:p-d,j1:p+d});const m=(W,xt)=>g.some(Tt=>Ax(Tt,p,W,xt)),y=i(Vs),w=i(Ws),v=n[0].x,T=v-n[n.length-1].x,b=Ox({length:T,uOf:W=>(v-W)/T,xOf:W=>v-W*T,vOf:(W,xt)=>{let Tt=0;for(;Tt<n.length-2&&n[Tt+1].x>W;)Tt++;const $t=n[Tt],Qt=n[Tt+1],zt=Di.clamp(($t.x-W)/Math.max($t.x-Qt.x,1e-6),0,1),we=tr($t,xt),ie=tr(Qt,xt);return we===null&&ie===null?null:we===null?ie:ie===null?we:we+(ie-we)*zt},topV:(W,xt)=>{const Tt=os(n,W),$t=Tt.n??2.2,Qt=Math.min(Math.abs(xt)/Tt.w,.999);return tr(Tt,Tt.yc+Tt.top*Math.pow(1-Math.pow(Qt,$t),1/$t)*.999)??0},perimeter:W=>Mx(os(n,W)),sillY:r}),_=Bx(),S=kx(),R=new Bs({map:b.map,roughnessMap:b.roughnessMap,normalMap:b.normalMap,normalScale:new Ut(.55,.55),color:16777215,roughness:1,metalness:0,clearcoat:.7,clearcoatRoughness:1,clearcoatRoughnessMap:b.clearcoatRoughnessMap,envMapIntensity:1}),O=new Bs({map:_.map,roughnessMap:_.roughnessMap,normalMap:_.normalMap,normalScale:new Ut(.5,.5),color:16777215,roughness:1,metalness:0,clearcoat:.65,clearcoatRoughness:.14,envMapIntensity:1,vertexColors:!0}),I=new Bs({map:S.map,roughnessMap:S.roughnessMap,normalMap:S.normalMap,normalScale:new Ut(.6,.6),color:16777215,roughness:1,metalness:.55,clearcoat:.2,clearcoatRoughness:.3,envMapIntensity:1}),A=new Bs({color:10470354,transparent:!0,opacity:.12,roughness:.04,metalness:0,envMapIntensity:1,side:Zn,depthWrite:!1,specularIntensity:1,ior:1.52,premultipliedAlpha:!0});A.onBeforeCompile=W=>{W.fragmentShader=W.fragmentShader.replace("#include <opaque_fragment>",`
          float glassNdv = saturate(dot(normalize(normal), normalize(vViewPosition)));
          float glassF = 0.04 + 0.96 * pow(1.0 - glassNdv, 5.0);
          float glassA = clamp(diffuseColor.a + glassF * 0.85, 0.0, 1.0);
          gl_FragColor = vec4(totalDiffuse * diffuseColor.a + totalSpecular, glassA);
        `).replace("#include <premultiplied_alpha_fragment>","")},A.customProgramCacheKey=()=>"cockpit-glass-v2";const U=new Bs({color:$e.upper,roughness:.4,metalness:0,clearcoat:.6,clearcoatRoughness:.15}),F=Fx(),D=Hx(),N=new le({map:D.map,emissiveMap:D.emissive,emissive:16777215,emissiveIntensity:.35,roughness:.7});this.materials.push(R,O,I,A,U,F,N),this.glassMaterial=A,this.paintMaterial=R;const B=(W,xt,Tt={})=>{const $t=new de(W,xt);return $t.castShadow=Tt.cast??!0,$t.receiveShadow=Tt.receive??!0,(Tt.parent??this.root).add($t),Tt.exterior??!0?this.exteriorMeshes.push($t):this.interiorMeshes.push($t),$t},k=Ix;B($s(f,{quad:(W,xt)=>!m(W,xt),capStart:!0,capEnd:!0}),R);const V=new Qe,J=W=>{const xt=Di.smoothstep(W,bi,bi+.045);return{...Zt.headliner,color:new Ft(Zt.headliner.color).multiplyScalar(.78+.22*xt).getHex()}},it=(W,xt)=>xt>=bi-.005?J(xt):xt>=ra-.005?Zt.trim:Zt.sidewall;V.add($s(x,{i0:y,i1:w,quad:(W,xt)=>!m(W,xt),flip:!0,capStart:!0,capEnd:!0}),void 0,it);for(const W of g)V.add(Cx(f,x,W),void 0,Zt.trim);const X=eh(n,sa);V.add(ih(X,Ei,-1.55,1.95,.01),void 0,Zt.carpet),V.add(ih(X,.74,oa,Vs-.005,.005),void 0,Zt.glareShield);const tt=Ys([$s(f,{quad:m}),$s(x,{i0:y,i1:w,quad:m,flip:!0})]),dt=B(tt,A,{cast:!1,receive:!1});dt.renderOrder=20;const K=new Qe,et=new P(Vs,.81,0),ot=new P(1.85,1.17,0),mt=et.clone().add(ot).multiplyScalar(.5);mt.y-=sa*.5,K.add(new Xt(et.distanceTo(ot)+.04,.028,.026),k(mt,[0,0,Math.atan2(ot.y-et.y,ot.x-et.x)]),Zt.trim);const ut=new Qe;for(const W of[-1,1])ut.add(new Xt(.3,.04,.22),k([1.3,-.45,W*.72]),Zt.darkMetal);for(let W=0;W<2;W++)ut.add(new ye(.05,.06,.28,10),k([2.75-W*.22,-.5,.62+W*.03],[.6,0,1.2]),Zt.exhaust);const nt=new Qe;nt.add(new Xt(.5,.12,.28),k([3.7,.7,0]));for(let W=0;W<2;W++)nt.add(new Xt(.28,.04,.22),k([3,-.62,(W===0?-1:1)*.35],[(W===0?-1:1)*.35,0,0]));this.propeller.position.set(4.62,.02,0),this.root.add(this.propeller);const lt=new Qe;lt.add(new mc(.26,.55,20),k([.27,0,0],[0,0,-Math.PI/2]),Zt.spinner),lt.add(new ye(.27,.3,.16,20),k([-.02,0,0],[0,0,Math.PI/2]),Zt.darkMetal),this.propHub=B(lt.build(),F,{parent:this.propeller,receive:!1});const H=new Qe,Pt=Dx(1.32,.19,.11),gt=new Xt(.02,.14,.12);for(let W=0;W<3;W++){const xt=new Yt().makeRotationX(W/3*Math.PI*2);H.add(Pt,xt.clone().multiply(new Yt().makeTranslation(0,.16,0)),Zt.prop),H.add(gt,xt.clone().multiply(new Yt().makeTranslation(0,1.4,0)),Zt.propTip)}this.propBlades=B(H.build(),F,{parent:this.propeller,receive:!1});const At=new le({map:Gx(),transparent:!0,opacity:0,depthWrite:!1,side:Be,roughness:.6,color:8947848});this.materials.push(At),this.propDisc=new de(new pc(1.5,40),At),this.propDisc.rotation.y=Math.PI/2,this.propDisc.position.x=.05,this.propDisc.renderOrder=15,this.propeller.add(this.propDisc);const vt={span:7.3,rootChord:1.95,tipChord:1.55,sweep:-.28,dihedral:.02,thickness:.11,twist:-.03,camber:.02},kt=ea(vt,0),yt=kt+.52,z=kt+.46,C=Ys([on(vt,{z0:0,z1:.85,segments:2,part:"full",hingeX:yt,capEnd:"rear"}),on(vt,{z0:.85,z1:3.55,segments:5,part:"front",hingeX:yt}),on(vt,{z0:3.55,z1:3.65,segments:1,part:"full",hingeX:yt,capStart:"rear",capEnd:"rear"}),on(vt,{z0:3.65,z1:6.9,segments:6,part:"front",hingeX:z}),on(vt,{z0:6.9,z1:7.3,segments:1,part:"full",hingeX:z,capStart:"rear",tipRound:.22})]),$=new Qe;for(const W of[1,-1])$.add(C,k(fn,void 0,[1,1,W]));const q=(W,xt)=>{const Tt=os(n,W),$t=Tt.n??2.2;return Tt.yc+Tt.top*Math.pow(Math.max(1-Math.pow(Math.min(Math.abs(xt)/Tt.w,1),$t),0),1/$t)},G=W=>fn.y+sh(vt,W-fn.x,0),Q=W=>fn.y+Lx(vt,W-fn.x,0),ft=W=>{const xt=G(W),Tt=Q(W);return xt+Math.min(.05,.5*(Tt-xt))},ct=fn.x+ws(vt,0),_t=fn.x+kt,Ot=.45,ht=.62,wt=ft(ct-.01)-q(ct,0),Lt=ft(_t+.01)-q(_t,0),Ht=W=>{const xt=W>ct?(W-ct)/Ot:W<_t?(_t-W)/ht:0,Tt=1-Math.min(xt,1);return Tt*Tt*(3-2*Tt)},St=W=>.28+.42*Math.sqrt(Ht(W)),ee=W=>W>ct?wt*Ht(W):W<_t?Lt*Ht(W):ft(W)-q(W,0),jt=W=>Math.pow(Math.max(1-Math.pow(Math.min(W,1),4),0),1.6),pe=[.45,.33,.22,.13,.06].map(W=>ct+W).concat([0,.03,.08,.15,.25,.4,.55,.7,.82,.91,.97,1].map(W=>ct-W*vt.rootChord)).concat([.07,.16,.27,.4,.52,.62].map(W=>_t-W));nt.add(Rx(pe.map(W=>({x:W,w:St(W)})),(W,xt)=>q(W,xt)-.012+ee(W)*jt(Math.abs(xt)/St(W)),(W,xt)=>q(W,xt)-.03));const Y=(W,xt,Tt,$t)=>{const Qt=on({...vt,dihedral:0},{z0:W,z1:xt,segments:$t,part:"rear",hingeX:Tt,gap:.02,capStart:"rear",capEnd:"rear"});Qt.translate(-Tt,0,0);const zt=[];for(const we of[1,-1]){const ie=new Re;ie.position.set(fn.x+Tt,fn.y,0),ie.rotation.x=-we*vt.dihedral,ie.scale.z=we;const Te=new Re;B(Qt,O,{parent:Te}),ie.add(Te),this.root.add(ie),zt.push(Te)}return[zt[0],zt[1]]};[this.flapR,this.flapL]=Y(.87,3.53,yt,5),[this.aileronR,this.aileronL]=Y(3.67,6.88,z,6),ut.add(new ye(.015,.015,.45,6),k([fn.x+.45,G(fn.x+.25)-.06,-3.2],[0,0,Math.PI/2]),Zt.metal);const Et={span:2.55,rootChord:1.05,tipChord:.8,sweep:-.175,dihedral:0,thickness:.09,twist:0,camber:0},at=ea(Et,0)+.34,pt=Ys([on(Et,{z0:0,z1:.1,segments:1,part:"full",hingeX:at,capEnd:"rear",n:9}),on(Et,{z0:.1,z1:2.4,segments:4,part:"front",hingeX:at,n:9}),on(Et,{z0:2.4,z1:2.55,segments:1,part:"full",hingeX:at,capStart:"rear",tipRound:.12,n:9})]),Dt=new P(-4.25,.42,0);for(const W of[-1,1])$.add(pt,k(Dt,void 0,[1,1,W]));this.elevator=new Re,this.elevator.position.set(Dt.x+at,Dt.y,0),this.root.add(this.elevator);const It=on(Et,{z0:.12,z1:2.38,segments:4,part:"rear",hingeX:at,gap:.015,capStart:"rear",capEnd:"rear",n:9});It.translate(-at,0,0);const ne=new Qe;for(const W of[-1,1])ne.add(It,k(void 0,void 0,[1,1,W]));B(ne.build(),O,{parent:this.elevator});const xe={span:1.55,rootChord:1.5,tipChord:.75,sweep:-.55,dihedral:0,thickness:.09,twist:0,camber:0},Se=ea(xe,0)+.48,ge=Ys([on(xe,{z0:0,z1:.06,segments:1,part:"full",hingeX:Se,capEnd:"rear",n:9}),on(xe,{z0:.06,z1:1.45,segments:3,part:"front",hingeX:Se,n:9}),on(xe,{z0:1.45,z1:1.55,segments:1,part:"full",hingeX:Se,capStart:"rear",tipRound:.1,n:9})]),Je=new P(-4.35,.45,0);$.add(ge,k(Je,[-Math.PI/2,0,0])),B($.build(),O),nt.add(new Xt(1.4,.32,.08),k([-3.4,.55,0],[0,0,-.25])),B(nt.build(),U),this.rudder=new Re,this.rudder.position.set(Je.x+Se,Je.y,0),this.root.add(this.rudder);const xn=on(xe,{z0:.08,z1:1.43,segments:3,part:"rear",hingeX:Se,gap:.015,capStart:"rear",capEnd:"rear",n:9});xn.translate(-Se,0,0),B(new Qe().add(xn,k(void 0,[-Math.PI/2,0,0])).build(),O,{parent:this.rudder}),ut.add(new ye(.01,.01,.5,5),k([-2,.9,0],[0,0,.5]),Zt.metal);const pi=new le({color:16777215,roughness:.2,metalness:0,vertexColors:!0});pi.onBeforeCompile=W=>{W.uniforms.uLightPower=this.lightPower,W.vertexShader=W.vertexShader.replace("#include <common>",`#include <common>
attribute float aLight;
varying float vLight;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vLight = aLight;`),W.fragmentShader=W.fragmentShader.replace("#include <common>",`#include <common>
uniform float uLightPower[5];
varying float vLight;`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
totalEmissiveRadiance = vColor * uLightPower[int(vLight + 0.5)];`)},pi.customProgramCacheKey=()=>"plane-lights-v1",this.materials.push(pi);const mi=(W,xt,Tt)=>{const $t=new jn(W,8,6),Qt=$t.getAttribute("position").count,zt=new Ft(xt),we=new Float32Array(Qt*3),ie=new Float32Array(Qt);for(let Te=0;Te<Qt;Te++)we[Te*3]=zt.r,we[Te*3+1]=zt.g,we[Te*3+2]=zt.b,ie[Te]=Tt;return $t.setAttribute("color",new fe(we,3)),$t.setAttribute("aLight",new fe(ie,1)),$t},ln=new Qe;for(const[W,xt,Tt]of[[this.wingTipL,14162972,Pn.red],[this.wingTipR,1624136,Pn.green]]){const $t=Math.sign(W.z)*7.55;ln.add(mi(.06,xt,Tt),k([W.x,W.y,$t])),ln.add(mi(.035,15922431,Pn.strobe),k([W.x-.12,W.y,$t-Math.sign(W.z)*.02]))}ln.add(mi(.04,15922431,Pn.tail),k([-5.37,.3,0])),ln.add(mi(.05,14162972,Pn.beacon),k([-4.8,2.07,0])),this.lights=B(ln.build(),pi,{cast:!1,receive:!1});const pr=Px([{x:2.95,yc:-1.85,w:.06,top:.08,bot:.06,n:2},{x:2.6,yc:-1.9,w:.2,top:.15,bot:.18,n:2.2,nBot:1.5},{x:1.9,yc:-1.95,w:.33,top:.18,bot:.28,n:2.6,nBot:1.4},{x:.8,yc:-1.95,w:.37,top:.19,bot:.32,n:2.8,nBot:1.4},{x:-.2,yc:-1.95,w:.37,top:.19,bot:.3,n:2.8,nBot:1.4},{x:-.35,yc:-1.95,w:.36,top:.19,bot:.22,n:2.8,nBot:1.5},{x:-1.3,yc:-1.92,w:.33,top:.18,bot:.2,n:2.7,nBot:1.6},{x:-2.3,yc:-1.86,w:.25,top:.15,bot:.12,n:2.5,nBot:1.8},{x:-2.75,yc:-1.8,w:.12,top:.1,bot:.05,n:2.2}],20),As=new Qe,ti=2.9,Cs=W=>new P(fn.x+W,fn.y+sh(vt,W,ti)+.03,0),Ie=(W,xt,Tt)=>new P(W,xt,Tt);for(const W of[-1,1]){As.add(pr,k([0,0,W*1.25])),ut.add(new jn(.09,10,8),k([2.98,-1.85,W*1.25]),Zt.rubber);const xt=-1.76,Tt=-.62;ut.add(ts(Ie(1.6,xt,W*1.25),Ie(1.4,Tt,W*.55),.14,.05),void 0,Zt.metal),ut.add(ts(Ie(-.9,xt,W*1.25),Ie(-.7,Tt,W*.5),.14,.05),void 0,Zt.metal),ut.add(ia(Ie(1.6,xt,W*1.25),Ie(-.7,Tt,W*.5),.025),void 0,Zt.metal),ut.add(ia(Ie(-.9,xt,W*1.25),Ie(1.4,Tt,W*.55),.025),void 0,Zt.metal);const $t=Cs(.25).setZ(W*ti),Qt=Cs(-.85).setZ(W*ti);ut.add(ts(Ie(1.3,xt+.1,W*1.3),$t,.12,.045),void 0,Zt.metal),ut.add(ts(Ie(-.2,xt+.1,W*1.3),Qt,.12,.045),void 0,Zt.metal),ut.add(ia($t.clone().setY($t.y-.05),Qt.clone().setY(Qt.y-.05),.03),void 0,Zt.metal);const zt=new Re;zt.position.set(-2.7,-1.85,W*1.25),B(new Qe().add(new Xt(.22,.32,.03),k([0,-.18,0]),Zt.darkMetal).build(),F,{parent:zt,cast:!1,receive:!1}),this.root.add(zt),this.waterRudders.push(zt);for(const we of[2,.4,-1.4])ut.add(new Xt(.14,.05,.05),k([we,xt+.03,W*1.25+.2*W]),Zt.metal)}ut.add(ts(Ie(1.6,-1.72,-1.25),Ie(1.6,-1.72,1.25),.1,.06),void 0,Zt.metal),ut.add(ts(Ie(-.9,-1.72,-1.25),Ie(-.9,-1.72,1.25),.1,.06),void 0,Zt.metal),B(As.build(),I),B(ut.build(),F),this.wheels=new Re,this.root.add(this.wheels);const mr=new Qs(.2,.09,6,16),gr=new ye(.12,.12,.12,12),Rs=new Qe;for(const W of[-1,1])for(const[xt,Tt]of[[-.9,1],[2.3,.7]])Rs.add(mr,k([xt,-2.28,W*1.25],void 0,Tt),Zt.rubber),Rs.add(gr,k([xt,-2.28,W*1.25],[Math.PI/2,0,0],Tt),Zt.metal);B(Rs.build(),F,{parent:this.wheels,receive:!1});const vr=((W,xt)=>uu(os(X,W),xt))(2.1,.74)-.03,L=.4,j=new P(Math.sin(es),-Math.cos(es),0),st=new P(Math.cos(es),Math.sin(es),0),Z=new P(oa,.735,0).clone().addScaledVector(j,L/2);K.add(new Xt(.16,L+.02,vr*2),k(Z.clone().addScaledVector(st,.085),[0,0,es]),Zt.plastic);const Mt=B(new Jn(vr*2-.02,L),N,{exterior:!1});Mt.position.copy(Z),Mt.rotation.set(0,-Math.PI/2,es,"ZYX"),K.add(new Xt(.7,.32,.22),k([1.7,Ei+.16,0]),Zt.plastic),this.throttleLever=B(new Qe().add(new Xt(.04,.22,.03),void 0,Zt.throttle).build(),F,{exterior:!1}),this.throttleLever.position.set(1.75,Ei+.42,-.04),K.add(new Xt(.04,.2,.03),k([1.72,Ei+.42,.04]),Zt.mixture);const Ct=Ei+.4,Gt=W=>{const xt=new Re,Tt=new Qe;Tt.add(new ye(.02,.02,.5,8),k([.25,0,0],[0,0,Math.PI/2]),Zt.darkMetal),Tt.add(new Qs(.15,.02,8,24,Math.PI*1.3),k(void 0,[Math.PI*.85,Math.PI/2,0]),Zt.plastic),Tt.add(new Xt(.03,.03,.26),void 0,Zt.plastic);const $t=new de(Tt.build(),F);return xt.add($t),xt.position.set(1.55,.42,W),this.root.add(xt),this.interiorMeshes.push(xt),xt};this.yokeL=Gt(-.35),this.yokeR=Gt(.35);const Vt=new Xt(.46,.12,.46),Jt=new Xt(.1,.55,.46),ae=new Xt(.26,.34,.26);for(const[W,xt]of[[1,-.34],[1,.34],[-.2,-.34],[-.2,.34],[-1,0]])K.add(Vt,k([W,Ct,xt]),Zt.leather),K.add(Jt,k([W-.25,Ct+.33,xt],[0,0,.15]),Zt.leather),K.add(ae,k([W,Ei+.17,xt]),Zt.darkMetal);const Bt=this.cockpitEye.y-.03;K.add(new Xt(.28,.58,.42),k([.95,Ct+.06+.29,-.34]),Zt.shirt),K.add(new jn(.11,12,10),k([.98,Bt,-.34]),Zt.skin),K.add(new Qs(.115,.018,6,16,Math.PI),k([.98,Bt+.03,-.34],[0,Math.PI/2,0]),Zt.headset);for(const W of[-1,1])K.add(new ye(.045,.045,.03,10),k([.98,Bt,-.34+W*.12],[Math.PI/2,0,0]),Zt.headset);for(const W of[-1,1])K.add(new ye(.04,.045,.5,8),k([1.22,Ct+.42,-.34+W*.16],[0,0,Math.PI/2-.35]),Zt.shirt);for(const W of[-.5,-.2,.2,.5])K.add(new Xt(.12,.18,.08),k([1.9,Ei+.12,W],[0,0,.5]),Zt.darkMetal);K.add(new Xt(.08,.07,.09),k([oa+.1,.775,0]),Zt.plastic),B(V.build(),F,{exterior:!1,cast:!1}),B(K.build(),F,{exterior:!1});for(const W of this.materials)W.isMeshStandardMaterial&&(W.envMapIntensity=1)}animate(t,e,n,i,r,o,a,c,l){this.aileronR.rotation.z=-e*.35,this.aileronL.rotation.z=e*.35,this.flapR.rotation.z=i*.6,this.flapL.rotation.z=i*.6,this.elevator.rotation.z=t*.4,this.rudder.rotation.y=-n*.45;for(const p of this.waterRudders)p.rotation.y=-n*.5;this.propeller.rotation.x+=r*2600*(Math.PI*2/60)*o;const h=this.propDisc.material;h.opacity=Di.clamp((r-.15)*1.6,0,.75),this.propBlades.visible=r<.55;const d=a%1.2<.06||(a+.15)%1.2<.06,u=Math.pow(c,.6),f=this.lightPower.value;f[Pn.red]=f[Pn.green]=7*u,f[Pn.tail]=6*u,f[Pn.beacon]=(2+12*Math.max(0,Math.sin(a*4.5)))*u,f[Pn.strobe]=(d?30:0)*u,this.wheels.visible=l,this.wheels.position.y=l?0:.3,this.yokeL.rotation.x=e*.8,this.yokeR.rotation.x=e*.8,this.yokeL.position.x=1.55-t*.08,this.yokeR.position.x=1.55-t*.08}}const ch=9.81;class Wx{constructor(t){this.heightAt=t}position=new P(0,.3,0);quaternion=new Ae;velocity=new P;omega=new P;rpm=0;telemetry={airspeed:0,groundSpeed:0,altitude:0,agl:0,verticalSpeed:0,heading:0,alpha:0,beta:0,stalled:!1,onWater:!1,onGround:!1,rpm:0,gForce:1,gearDown:!0,shake:0,bank:0,pitchAngle:0};mass=2350;wingArea=26;span=14.6;chord=1.65;maxThrust=7400;inertia=new P(3200,7400,5600);wind=new P;turbulence=.3;gearDown=!0;gust=new P;time=0;buffet=0;tmpV=new P;tmpV2=new P;invQ=new Ae;contactPoints=[new P(2.6,-2.2,-1.25),new P(2.6,-2.2,1.25),new P(-.35,-2.24,-1.25),new P(-.35,-2.24,1.25),new P(-2.3,-2.15,-1.25),new P(-2.3,-2.15,1.25),new P(-.9,-2.35,-1.25),new P(-.9,-2.35,1.25)];reset(t,e,n,i,r){this.position.set(t,e,n),this.quaternion.setFromEuler(new Ee(0,i,0));const o=new P(1,0,0).applyQuaternion(this.quaternion);this.velocity.copy(o).multiplyScalar(r),this.omega.set(0,0,0),this.rpm=r>5?.7:.2}forward(t){return t.set(1,0,0).applyQuaternion(this.quaternion)}up(t){return t.set(0,1,0).applyQuaternion(this.quaternion)}step(t,e){if(e<=0){this.probeContacts(),this.updateTelemetry(t);return}const n=Math.max(1,Math.ceil(e/(1/120))),i=e/n;for(let r=0;r<n;r++)this.substep(t,i);this.updateTelemetry(t)}substep(t,e){this.time+=e;const n=Kt(t.throttle,0,1);this.rpm+=(n*.92+.08-this.rpm)*Kt(e/.7,0,1);const i=this.time*.35,r=re(i,1.3)*1,o=re(i*1.7,7.1)*.6,a=re(i*1.3,3.7)*1,c=this.turbulence*(1+2.5*(1-Nt(20,220,this.position.y)))*2.4;this.gust.set(r,o,a).multiplyScalar(c),this.invQ.copy(this.quaternion).invert();const l=this.tmpV.copy(this.velocity).sub(this.wind).sub(this.gust),h=this.tmpV2.copy(l).applyQuaternion(this.invQ),d=Math.max(h.length(),.5),u=Math.atan2(-h.y,Math.max(h.x,.1)),f=Math.asin(Kt(h.z/d,-1,1)),p=1.2*Math.exp(-this.position.y/9e3),x=.5*p*d*d,g=this.wingArea,m=Kt(t.flaps,0,1),y=.27-m*.03;let w=.32+m*.55+5.4*u;const v=1.7+m*.5;let T=!1;if(u>y){const vt=u-y;w=v-vt*3.5+Math.max(0,vt-.25)*2,w=Math.max(w,.55),T=!0}else u<-.22&&(w=Math.max(w,-.9));w=Math.min(w,v),this.buffet=ue(this.buffet,T?1:Nt(y-.05,y,u)*.5,Kt(e*6,0,1));const M=.034+.048*w*w+m*.05+(this.gearDown?.012:0)+(T?.12:0),E=-.9*f,b=x*g*w,_=x*g*M,S=x*g*E,R=h.clone().normalize(),O=new P(-R.y,R.x,0).normalize();O.lengthSq()<.5&&O.set(0,1,0);const I=new P;I.addScaledVector(R,-_),I.addScaledVector(O,b),I.z+=S;const A=this.maxThrust*Kt((this.rpm-.08)/.92,0,1)*Kt(1-d/120,.2,1)*(p/1.2);I.x+=A;const U=this.omega.x,F=this.omega.y,D=this.omega.z,N=this.span,B=this.chord,k=2*Math.max(d,3),V=Kt(t.pitch,-1,1),J=Kt(t.roll,-1,1),it=Kt(t.yaw,-1,1),X=.04-1.3*u-18*(D*B/k)+.8*V*(1-.3*m)-.08*m,tt=-.45*(U*N/k)+.14*J-.08*f-.08*(F*N/k),dt=-.1*f-.16*(F*N/k)-.075*it+.012*J-.02*(U*N/k),K=new P(x*g*N*tt,x*g*N*dt,x*g*B*X);T&&(K.x+=x*g*N*.02*Math.sin(this.time*17)*this.buffet,K.z-=x*g*B*.03*this.buffet),K.x+=400*c*re(this.time*2.1,9.9),K.z+=300*c*re(this.time*1.9,4.4);let et=!1,ot=!1;const mt=new P,ut=new P,nt=new P,lt=this.heightAt(this.position.x,this.position.z)>.05;this.gearDown=lt&&this.position.y<60||this.position.y<8&&lt;for(const vt of this.contactPoints){ut.copy(vt).applyQuaternion(this.quaternion).add(this.position);const kt=this.heightAt(ut.x,ut.z),yt=kt<=.05,z=yt?0:kt,C=vt.y<-2.3;if(yt&&C||!yt&&!C&&this.gearDown)continue;const $=z-ut.y;if($<=0)continue;nt.copy(this.omega).applyQuaternion(this.quaternion).cross(this.tmpV.copy(ut).sub(this.position)).add(this.velocity);let q,G;if(yt){et=!0;const ft=Math.hypot(nt.x,nt.z),ct=Nt(6,20,ft),_t=vt.x>1,Ot=vt.x<-1;q=(Ot?16e3:_t?12e3:18e3)*(Ot?1-.9*ct:_t?1-.7*ct:1-.3*ct)*Math.min($,.9)+4e4*Math.max($-.35,0)**2-1800*nt.y*(1-.5*ct),G=-(22*ft*ft*(1-ct*.9)+90*ft)*Math.min($/.3,1)/6,Ot||(q+=2600*ct*Math.min($/.3,1))}else{ot=!0,q=52e3*Math.min($,.5)-2600*nt.y;const ct=Math.hypot(nt.x,nt.z);G=-(t.brake?.45:.03)*Math.max(q,0)*Math.sign(ct)*Math.min(ct,1);const Ot=new P(0,0,1).applyQuaternion(this.quaternion),ht=nt.dot(Ot);mt.copy(Ot).multiplyScalar(-ht*900),this.applyForce(mt,ut,e)}q=Math.max(q,0),mt.set(0,q,0);const Q=Math.hypot(nt.x,nt.z);if(Q>.01&&mt.add(this.tmpV.set(nt.x/Q,0,nt.z/Q).multiplyScalar(G)),this.applyForce(mt,ut,e),yt){const ft=new P(0,-it*260*Math.min(Q/6,1),0);this.omega.add(ft.multiplyScalar(e/this.inertia.y))}}const H=I.applyQuaternion(this.quaternion);H.y-=this.mass*ch,this.velocity.addScaledVector(H,e/this.mass),this.position.addScaledVector(this.velocity,e),this.omega.x+=K.x/this.inertia.x*e,this.omega.y+=K.y/this.inertia.y*e,this.omega.z+=K.z/this.inertia.z*e,(et||ot)&&this.omega.multiplyScalar(1-1.6*e);const Pt=new Ae(this.omega.x*e*.5,this.omega.y*e*.5,this.omega.z*e*.5,1).normalize();this.quaternion.multiply(Pt).normalize();const gt=this.heightAt(this.position.x,this.position.z),At=Math.max(gt,0)+1.55;this.position.y<At&&(this.position.y=At,this.velocity.y<0&&(this.velocity.y*=-.1),this.velocity.multiplyScalar(1-2.5*e)),this.telemetry.alpha=u,this.telemetry.beta=f,this.telemetry.stalled=T&&d>12,this.telemetry.onWater=et,this.telemetry.onGround=ot,this.telemetry.shake=Kt(this.buffet*.6+c*.08+Nt(55,95,d)*.35,0,1)}applyForce(t,e,n){this.velocity.addScaledVector(t,n/this.mass);const r=this.tmpV.copy(e).sub(this.position).cross(t);r.applyQuaternion(this.invQ),this.omega.x+=r.x/this.inertia.x*n,this.omega.y+=r.y/this.inertia.y*n,this.omega.z+=r.z/this.inertia.z*n}probeContacts(){let t=!1,e=!1;for(const n of this.contactPoints){this.tmpV.copy(n).applyQuaternion(this.quaternion).add(this.position);const i=this.heightAt(this.tmpV.x,this.tmpV.z),r=i<=.05;(r?0:i)-this.tmpV.y<=0||(r?t=!0:e=!0)}this.telemetry.onWater=t,this.telemetry.onGround=e}updateTelemetry(t){const e=this.telemetry,n=this.forward(this.tmpV);e.airspeed=this.tmpV2.copy(this.velocity).sub(this.wind).length(),e.groundSpeed=Math.hypot(this.velocity.x,this.velocity.z),e.altitude=this.position.y,e.agl=this.position.y-Math.max(0,this.heightAt(this.position.x,this.position.z)),e.verticalSpeed=this.velocity.y,e.heading=(Math.atan2(n.x,-n.z)*180/Math.PI+360)%360,e.rpm=this.rpm,e.gearDown=this.gearDown;const i=this.up(this.tmpV2);e.bank=Math.atan2(-i.dot(new P(1,0,0).crossVectors(new P(0,1,0),n).normalize()),i.y);const r=new P(0,0,1).applyQuaternion(this.quaternion);e.bank=Math.asin(Kt(-r.y,-1,1)),e.pitchAngle=Math.asin(Kt(n.y,-1,1)),e.gForce=1+this.omega.z*e.airspeed/ch*.5}}function Xx(){const s=document.createElement("canvas");s.width=s.height=64;const t=s.getContext("2d"),e=t.createRadialGradient(32,32,0,32,32,32);return e.addColorStop(0,"rgba(255,255,255,1)"),e.addColorStop(.4,"rgba(255,255,255,0.55)"),e.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=e,t.fillRect(0,0,64,64),new lr(s)}class lh{constructor(t,e,n,i,r){this.capacity=t,this.positions=new Float32Array(t*3),this.alphas=new Float32Array(t),this.sizes=new Float32Array(t),this.geo=new oe,this.geo.setAttribute("position",new fe(this.positions,3)),this.geo.setAttribute("aAlpha",new fe(this.alphas,1)),this.geo.setAttribute("aSize",new fe(this.sizes,1));const o=new De({uniforms:{uTex:{value:n},uColor:{value:e},uOpacity:{value:i},uScale:{value:1}},vertexShader:`
        attribute float aAlpha; attribute float aSize; varying float vAlpha;
        uniform float uScale;
        void main() { vAlpha = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / max(-mv.z, 0.5); }
      `,fragmentShader:`
        uniform sampler2D uTex; uniform vec3 uColor; uniform float uOpacity; varying float vAlpha;
        void main() { vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(uColor, t.a * vAlpha * uOpacity); }
      `,transparent:!0,depthWrite:!1,blending:r});this.points=new kg(this.geo,o),this.points.frustumCulled=!1,this.geo.setDrawRange(0,0)}points;particles=[];positions;alphas;sizes;geo;emit(t){this.particles.length>=this.capacity&&this.particles.shift(),this.particles.push(t)}update(t,e,n,i){this.points.material.uniforms.uScale.value=i;let r=0;for(let o=this.particles.length-1;o>=0;o--){const a=this.particles[o];if(a.age+=t,a.age>=a.life){this.particles.splice(o,1);continue}a.vy-=e*t;const c=Math.exp(-n*t);a.vx*=c,a.vy*=c,a.vz*=c,a.x+=a.vx*t,a.y+=a.vy*t,a.z+=a.vz*t,a.y<.05&&e>0&&(a.y=.05,a.vy=0);const l=a.age/a.life;this.positions[r*3]=a.x,this.positions[r*3+1]=a.y,this.positions[r*3+2]=a.z,this.alphas[r]=Math.sin(l*Math.PI)*(1-l*.5),this.sizes[r]=a.size*(.6+l*1.2),r++}this.geo.attributes.position.needsUpdate=!0,this.geo.attributes.aAlpha.needsUpdate=!0,this.geo.attributes.aSize.needsUpdate=!0,this.geo.setDrawRange(0,r)}}class qx{wakeL;wakeR;spray;exhaust;vortexL;vortexR;stampL;stampR;tmp=new P;tmp3=new P;tmp2=new P;sprayAcc=0;exhaustAcc=0;constructor(t,e){this.wakeL=new rs(70,1.6,14,1.2),this.wakeR=new rs(70,1.6,14,1.2),t.add(this.wakeL.mesh,this.wakeR.mesh),this.stampL=new or(4.8,.9,.9),this.stampR=new or(4.8,.9,.9),e.add(this.stampL.mesh,this.stampR.mesh);const n=Xx();this.spray=new lh(400,new Ft(.95,.98,1),n,.75,qn),this.exhaust=new lh(120,new Ft(.25,.24,.23),n,.22,qn),e.add(this.spray.points,this.exhaust.points),this.vortexL=new rs(90,.5,2.2,.6,$a),this.vortexR=new rs(90,.5,2.2,.6,$a),e.add(this.vortexL.mesh,this.vortexR.mesh)}update(t,e,n,i,r){const o=t.telemetry,a=t.quaternion,c=o.groundSpeed,l=this.tmp.copy(e.floatSternL).applyQuaternion(a).add(t.position),h=this.tmp2.copy(e.floatSternR).applyQuaternion(a).add(t.position),d=o.onWater&&c>1.5;this.wakeL.update(l.x,l.z,i,d,c),this.wakeR.update(h.x,h.z,i,d,c);const u=t.forward(this.tmp3),f=Math.hypot(u.x,u.z)||1,p=.9*(1-Nt(6,18,c));for(const[y,w,v]of[[this.stampL,e.floatBowL,e.floatSternL],[this.stampR,e.floatBowR,e.floatSternR]]){const T=this.tmp.copy(w).add(v).multiplyScalar(.5).applyQuaternion(a).add(t.position);y.update(T.x,T.z,u.x/f,u.z/f,o.onWater&&p>.02,p)}if(o.onWater&&c>4){const y=90*Nt(4,14,c)*(1-.5*Nt(25,40,c));this.sprayAcc+=y*n;const w=t.forward(new P);for(;this.sprayAcc>=1;){this.sprayAcc-=1;for(const v of[e.floatBowL,e.floatBowR]){const T=this.tmp.copy(v).applyQuaternion(a).add(t.position),M=v.z>0?1:-1,E=new P(0,0,1).applyQuaternion(a);this.spray.emit({x:T.x,y:.1,z:T.z,vx:w.x*c*.35+E.x*M*(2+Math.random()*3)+(Math.random()-.5)*2,vy:2.5+Math.random()*3.5+c*.08,vz:w.z*c*.35+E.z*M*(2+Math.random()*3)+(Math.random()-.5)*2,life:.7+Math.random()*.6,age:0,size:.6+Math.random()*.8})}}}if(this.spray.update(n,9.81,1.2,r*.9),o.rpm>.2){this.exhaustAcc+=(10+25*o.rpm)*n;const y=t.forward(new P);for(;this.exhaustAcc>=1;){this.exhaustAcc-=1;const w=this.tmp.copy(e.exhaustPos).applyQuaternion(a).add(t.position);this.exhaust.emit({x:w.x,y:w.y,z:w.z,vx:t.velocity.x-y.x*6+(Math.random()-.5),vy:t.velocity.y-1.5+Math.random()*1.5,vz:t.velocity.z-y.z*6+(Math.random()-.5),life:.35+Math.random()*.3,age:0,size:.35+Math.random()*.3})}}this.exhaust.update(n,-.3,2.5,r*.9);const x=Kt((o.alpha-.13)/.12,0,1)*Nt(35,55,o.airspeed),g=this.tmp.copy(e.wingTipL).applyQuaternion(a).add(t.position),m=this.tmp2.copy(e.wingTipR).applyQuaternion(a).add(t.position);this.vortexL.update(g.x,g.z,i,x>.05,o.airspeed),this.vortexR.update(m.x,m.z,i,x>.05,o.airspeed),this.vortexL.mesh.position.y=g.y,this.vortexL.mesh.updateMatrix(),this.vortexR.mesh.position.y=m.y,this.vortexR.mesh.updateMatrix(),this.vortexL.mesh.material.uniforms.uStrength.value=x*.7,this.vortexR.mesh.material.uniforms.uStrength.value=x*.7}}class Yx{model=new Vx;flight;effects;inputs={throttle:0,pitch:0,roll:0,yaw:0,flaps:0,brake:!1};constructor(t,e,n){this.flight=new Wx(t),this.effects=new qx(n,e),e.add(this.model.root)}place(t,e,n,i,r,o,a,c){this.flight.position.set(t,e,n);const l=Math.atan2(Math.cos(i),Math.sin(i)),h=new Ee(0,0,0,"YZX");h.set(o,l,r,"YZX"),this.flight.quaternion.setFromEuler(h);const d=new P(1,0,0).applyQuaternion(this.flight.quaternion);this.flight.velocity.copy(d).multiplyScalar(a),this.flight.omega.set(0,0,0),this.flight.rpm=c,this.inputs.throttle=c,this.flight.step(this.inputs,0),this.syncModel()}syncModel(){this.model.root.position.copy(this.flight.position),this.model.root.quaternion.copy(this.flight.quaternion)}update(t,e,n,i,r,o,a){this.flight.wind.copy(i),this.flight.turbulence=r,a&&this.flight.step(this.inputs,t),this.syncModel();const c=this.flight.telemetry;this.model.animate(this.inputs.pitch,this.inputs.roll,this.inputs.yaw,this.inputs.flaps,c.rpm,t,e,n,c.gearDown),this.effects.update(this.flight,this.model,t,e,o)}}class $x{constructor(t){this.camera=t}mode="chase";pos=new P;vel=new P;lookTarget=new P;tmp=new P;tmp2=new P;fwd=new P;lookLift=new P(0,1.2,0);orbitQ=new Ae;euler=new Ee;q=new Ae;groundHeight=null;smoothQ=new Ae;time=0;initialised=!1;baseFov=50;shakeScale=1;orbitYaw=0;orbitPitch=0;chaseDistance=25;chaseHeight=6.5;snap(){this.initialised=!1}update(t,e,n){this.time+=n;const i=this.camera,r=t.telemetry,o=r.shake*this.shakeScale;if(this.mode==="fixed")return;if(this.mode==="cockpit"){const T=this.tmp.copy(e.cockpitEye).applyQuaternion(t.quaternion).add(t.position);this.q.copy(t.quaternion),this.initialised||(this.smoothQ.copy(this.q),this.initialised=!0),this.smoothQ.slerp(this.q,1-Math.exp(-n*14));const M=new Ae().setFromEuler(new Ee(0,-Math.PI/2,0));i.quaternion.copy(this.smoothQ).multiply(M);const E=new Ae().setFromEuler(new Ee(-this.orbitPitch*.6,this.orbitYaw*1.2,0,"YXZ"));i.quaternion.multiply(E);const b=o*.012;T.x+=re(this.time*9.1,1.1)*b,T.y+=re(this.time*11.3,2.7)*b,T.z+=re(this.time*8.7,5.3)*b,i.position.copy(T),i.fov=this.baseFov+12,i.updateProjectionMatrix();return}const a=t.forward(this.fwd),c=Math.atan2(a.x,a.z),l=r.airspeed,h=this.chaseDistance+l*.08,d=this.chaseHeight+l*.012,u=this.orbitQ.setFromEuler(this.euler.set(this.orbitPitch,c+this.orbitYaw,0,"YXZ")),f=this.tmp2.set(0,d,-h).applyQuaternion(u).add(t.position);this.initialised||(this.pos.copy(f),this.vel.set(0,0,0),this.initialised=!0);const p=60,x=2*.9*Math.sqrt(60);f.addScaledVector(t.velocity,x/p);const g=this.tmp.copy(f).sub(this.pos).multiplyScalar(p).addScaledVector(this.vel,-x);this.vel.addScaledVector(g,n),this.pos.addScaledVector(this.vel,n);const m=Math.max(1.2,this.groundHeight?this.groundHeight(this.pos.x,this.pos.z)+2.5:1.2);this.pos.y<m&&(this.pos.y=m,this.vel.y<0&&(this.vel.y=0));const y=this.lookTarget.copy(t.position).addScaledVector(a,6).add(this.lookLift);i.position.copy(this.pos);const w=o*.35;i.position.x+=re(this.time*13,.3)*w,i.position.y+=re(this.time*15,4.3)*w,i.position.z+=re(this.time*12,8.3)*w,i.up.set(0,1,0),i.lookAt(y);const v=r.bank;i.rotateZ(-v*.18),i.fov=this.baseFov+Nt(30,90,l)*6,i.updateProjectionMatrix()}}class jx{constructor(t){this.renderer=t;const n=t.getContext().getExtension("EXT_disjoint_timer_query_webgl2");if(n&&(this.gpuExt=n),"PerformanceObserver"in window)try{new PerformanceObserver(r=>{this.longTasks+=r.getEntries().length}).observe({entryTypes:["longtask"]})}catch{}}times=[];lastStart=0;longTasks=0;gpuQuery=null;gpuExt=null;lastGpuMs=null;visibleObjects=0;beginFrame(){this.lastStart=performance.now();const t=this.renderer.getContext();this.gpuExt&&!this.gpuQuery&&(this.gpuQuery=t.createQuery(),t.beginQuery(this.gpuExt.TIME_ELAPSED_EXT,this.gpuQuery))}endFrame(){const t=performance.now()-this.lastStart;this.times.push(t),this.times.length>600&&this.times.shift();const e=this.renderer.getContext();if(this.gpuExt&&this.gpuQuery){e.endQuery(this.gpuExt.TIME_ELAPSED_EXT);const n=this.gpuQuery;setTimeout(()=>{const i=e.getQueryParameter(n,e.QUERY_RESULT_AVAILABLE),r=e.getParameter(this.gpuExt.GPU_DISJOINT_EXT);i&&!r&&(this.lastGpuMs=e.getQueryParameter(n,e.QUERY_RESULT)/1e6),e.deleteQuery(n)},0),this.gpuQuery=null}}reset(){this.times.length=0,this.longTasks=0}snapshot(){const t=this.times.slice().sort((l,h)=>l-h),e=t.length||1,n=t.reduce((l,h)=>l+h,0)/e,i=t[Math.min(t.length-1,Math.floor(t.length*.99))]??0,r=t.slice(Math.floor(t.length*.99)),o=r.length?r.reduce((l,h)=>l+h,0)/r.length:n,a=this.renderer.info,c=performance.memory;return{frames:t.length,avgMs:n,p99Ms:i,minFps:t.length?1e3/(t[t.length-1]||1):0,avgFps:n?1e3/n:0,onePercentLowFps:o?1e3/o:0,calls:a.render.calls,triangles:a.render.triangles,points:a.render.points,lines:a.render.lines,geometries:a.memory.geometries,textures:a.memory.textures,programs:a.programs?.length??0,jsHeapMB:c?c.usedJSHeapSize/1048576:null,gpuMs:this.lastGpuMs,longTasks:this.longTasks,visibleObjects:this.visibleObjects}}}const Zx={low:{samples:0,shadowMapSize:1024,cascades:2,cloudSteps:10,skyScale:.35,shadowFar:1500,anisotropy:2,bloom:!0},medium:{samples:2,shadowMapSize:2048,cascades:3,cloudSteps:16,skyScale:.5,shadowFar:2500,anisotropy:4,bloom:!0},high:{samples:4,shadowMapSize:2048,cascades:3,cloudSteps:24,skyScale:.6,shadowFar:3500,anisotropy:8,bloom:!0},ultra:{samples:4,shadowMapSize:4096,cascades:4,cloudSteps:32,skyScale:1,shadowFar:5e3,anisotropy:16,bloom:!0}};class Kx{constructor(t,e){this.canvas=t,this.params=e,this.quality=Zx[e.quality],this.renderer=new Pg({canvas:t,antialias:!1,powerPreference:"high-performance",logarithmicDepthBuffer:!0,alpha:!1,stencil:!1,preserveDrawingBuffer:!0}),this.renderer.outputColorSpace=Ni,this.renderer.toneMapping=Yn,this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=uh,this.renderer.autoClear=!0,this.renderer.info.autoReset=!1,this.camera=new mn(50,16/9,.4,6e4),Tv(this.camera),this.atmos=new f1(e.seed),e.time!==null&&(this.atmos.hour=e.time),e.weather&&this.atmos.setWeather(e.weather),this.metrics=new jx(this.renderer)}renderer;scene=new rr;camera;atmos;quality;metrics;map;textures;terrain;water;sky;wakes;csm;post;roads;bridges;city;vegetation;props;traffic;aircraft;flightCamera;cull=new Pv;width=1;height=1;time=0;envTimer=0;lastEnvHour=-1;litMaterials=new Set;windVec=new P;registerLit(t){if(this.litMaterials.has(t))return;this.litMaterials.add(t);const e=t.onBeforeCompile;this.csm.setupMaterial(t);const n=t.onBeforeCompile;t.onBeforeCompile=(i,r)=>{n.call(t,i,r),e?.call(t,i,r)},t.needsUpdate=!0}registerTree(t){t.traverse(e=>{const n=e.material;if(n)for(const i of Array.isArray(n)?n:[n])i.isMeshStandardMaterial&&this.registerLit(i)})}async tick(t,e,n){t(e,n),await new Promise(i=>setTimeout(i,0))}async init(t){await this.tick(t,"Surveying the coastline",.02),this.map=new R1,this.map.generate(h=>t("Shaping islands and bays",.02+h*.3)),await this.tick(t,"Uploading terrain",.33),this.textures=new H1(this.map,this.renderer);const e=this.quality;this.csm=new a1({camera:this.camera,parent:this.scene,cascades:e.cascades,maxFar:e.shadowFar,mode:"practical",shadowMapSize:e.shadowMapSize,lightDirection:new P(.3,-1,.2).normalize(),lightIntensity:1,shadowBias:-2e-4,lightMargin:300}),this.csm.fade=!0,Cv(this.renderer,h=>this.csm.lights.indexOf(h)),this.sky=new k1(this.atmos,this.renderer,{cloudSteps:e.cloudSteps,scale:e.skyScale}),this.sky.dome.name="sky",this.scene.add(this.sky.dome),this.wakes=new nv(2048,3200),this.terrain=new $1(this.textures),this.registerLit(this.terrain.material),this.terrain.group.name="terrain",this.scene.add(this.terrain.group),this.water=new ev(this.textures,this.wakes.texture),this.registerLit(this.water.material),this.water.mesh.name="water",this.scene.add(this.water.mesh),await this.tick(t,"Laying out streets",.4);const n=hv(this.map);this.roads=n.segments;const i=pv();this.registerLit(i);const r=this.params.debugRoads?new hc({color:16719904}):i;for(const h of fv(this.map,this.roads,r))h.name="roads",this.scene.add(h);await this.tick(t,"Raising bridges",.46);const o=new le({color:12104874,roughness:.9}),a=new le({color:14278114,roughness:.4,metalness:.6});this.registerLit(o),this.registerLit(a),this.bridges=Mv(this.map,r,o,a),this.bridges.group.name="bridges",this.scene.add(this.bridges.group),await this.tick(t,"Building the city",.52),this.city=kv(this.map,n.blocksByDistrict,this.atmos.uniforms.uNight),this.registerLit(this.city.batches.material),this.city.batches.group.name="city",this.scene.add(this.city.batches.group);for(const h of this.roads){const d=Math.hypot(h.b[0]-h.a[0],h.b[1]-h.a[1]),u=Math.max(1,Math.ceil(d/10));for(let f=0;f<=u;f++)this.city.markOccupied(h.a[0]+(h.b[0]-h.a[0])*(f/u),h.a[1]+(h.b[1]-h.a[1])*(f/u),h.width*.5+3)}await this.tick(t,"Dressing harbours and airports",.66),this.props=new mx(this.map,this.roads,this.bridges.lampPositions,this.city.markOccupied);for(const h of this.props.materials)this.registerLit(h);this.props.group.name="props",this.scene.add(this.props.group),await this.tick(t,"Planting palms and mangroves",.74),this.vegetation=new cx(this.map,this.city.occupied);for(const h of this.vegetation.materials)this.registerLit(h);this.vegetation.group.name="vegetation",this.scene.add(this.vegetation.group),await this.tick(t,"Launching boats and traffic",.86),this.traffic=new wx(this.map,this.roads,this.bridges.routes,this.wakes.scene,this.params.seed,this.props.mooredBoatPositions);for(const h of this.traffic.materials)this.registerLit(h);this.traffic.group.name="traffic",this.scene.add(this.traffic.group);for(const h of this.traffic.contrailMeshes)h.name="contrail",this.scene.add(h);await this.tick(t,"Pre-flighting the aircraft",.92),this.aircraft=new Yx((h,d)=>this.map.heightAt(h,d),this.scene,this.wakes.scene),this.registerTree(this.aircraft.model.root),this.flightCamera=new $x(this.camera),this.flightCamera.groundHeight=(h,d)=>Math.max(0,this.map.heightAt(h,d));const c=this.map.pois.find(h=>h.kind==="seaplane");this.aircraft.place(c.x+120,1.6,c.z+60,Math.PI*.5,0,0,0,0),this.post=new lv(this.renderer,this.atmos,{samples:e.samples,bloom:e.bloom});const l=this.params.dbg;l.has("noterrain")&&(this.terrain.group.visible=!1),l.has("noshadow")&&(this.renderer.shadowMap.enabled=!1),l.has("noveg")&&(this.vegetation.group.visible=!1),l.has("nocity")&&(this.city.batches.group.visible=!1),l.has("nocloudshadow")&&(this.post.cloudShadowStrength=0),this.atmos.update(0),this.refreshEnvironment(),t("Ready",1)}refreshEnvironment(){const t=this.sky.updateEnvironment();this.scene.environment=t,this.scene.environmentIntensity=this.atmos.state.ambientIntensity,this.lastEnvHour=this.atmos.hour}setSize(t,e,n=1){this.width=t,this.height=e,this.renderer.setPixelRatio(n),this.renderer.setSize(t,e,!1),this.camera.aspect=t/e,this.camera.updateProjectionMatrix(),this.post.setSize(Math.round(t*n),Math.round(e*n)),this.csm.updateFrustums()}update(t,e=!0){this.time+=t,this.atmos.update(t);const n=this.atmos.state;this.csm.lightDirection.copy(n.sunDir).negate();for(const r of this.csm.lights)r.intensity=n.sunIntensity,r.color.copy(n.sunColor);this.envTimer+=t,(Math.abs(this.atmos.hour-this.lastEnvHour)>.02||this.envTimer>5)&&(this.envTimer=0,this.refreshEnvironment()),this.scene.environmentIntensity=n.ambientIntensity;const i=this.atmos.preset;this.windVec.set(this.atmos.windDir.x,0,this.atmos.windDir.y).multiplyScalar(i.windSpeed),this.vegetation.update(this.time,i.windSpeed),this.traffic.update(t,this.time,n.night),this.props.setNight(n.night),this.aircraft.update(t,this.time,n.night,this.windVec,i.turbulence,this.height,e)}render(){this.metrics.beginFrame(),this.renderer.info.reset();const t=this.camera;t.updateMatrixWorld();const e=t.position.x,n=t.position.z,i=Math.min(12e3,Math.max(this.quality.shadowFar,t.position.y*9));Math.abs(i-this.csm.maxFar)>200&&(this.csm.maxFar=i,this.csm.updateFrustums()),this.cull.update(t,this.csm.maxFar,this.atmos.state.sunDir),this.terrain.update(e,n),this.vegetation.updateLod(e,n,this.cull),this.city.batches.updateLod(e,n,this.cull),this.props.updateLod(e,n,this.cull),this.traffic.updateCulling(this.cull),this.water.update(e,n,this.time,this.atmos.preset.windSpeed,this.atmos.windDir,this.atmos.state.sunDir,this.wakes.center,this.wakes.size),this.wakes.render(this.renderer,e,n),this.csm.update();for(const r of this.csm.lights){const o=r.shadow.camera,a=(o.right-o.left)/r.shadow.mapSize.width;r.shadow.normalBias=a*1.5,r.shadow.bias=-2e-4}this.sky.render(this.renderer,t,this.post.width,this.post.height),this.renderer.setRenderTarget(this.post.target),this.renderer.render(this.scene,t),this.post.finish(t,this.time),this.metrics.endFrame()}}class Jx{constructor(t){this.canvas=t,window.addEventListener("keydown",e=>{e.repeat||(this.keys.add(e.code),this.pressed.add(e.code),["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)&&e.preventDefault())}),window.addEventListener("keyup",e=>this.keys.delete(e.code)),window.addEventListener("blur",()=>this.keys.clear()),t.addEventListener("mousedown",e=>{this.dragging=!0,this.lastX=e.clientX,this.lastY=e.clientY}),window.addEventListener("mouseup",()=>{this.dragging=!1}),window.addEventListener("mousemove",e=>{this.dragging&&(this.orbitYaw-=(e.clientX-this.lastX)*.006,this.orbitPitch+=(e.clientY-this.lastY)*.005,this.orbitPitch=Math.max(-1.2,Math.min(1.2,this.orbitPitch)),this.lastX=e.clientX,this.lastY=e.clientY)}),t.addEventListener("wheel",e=>{this.flight.throttle=Math.max(0,Math.min(1,this.flight.throttle-Math.sign(e.deltaY)*.05)),e.preventDefault()},{passive:!1})}keys=new Set;flight={throttle:0,pitch:0,roll:0,yaw:0,flaps:0,brake:!1};targetPitch=0;targetRoll=0;targetYaw=0;orbitYaw=0;orbitPitch=0;dragging=!1;lastX=0;lastY=0;pressed=new Set;enabled=!0;down(t){return this.keys.has(t)}consume(t){const e=this.pressed.has(t);return this.pressed.delete(t),e}update(t){if(!this.enabled){this.pressed.clear();return}const e=this.flight,n=(c,l)=>(this.down(c)?1:0)-(this.down(l)?1:0);this.targetPitch=n("KeyS","KeyW")+n("ArrowDown","ArrowUp"),this.targetRoll=n("KeyD","KeyA")+n("ArrowRight","ArrowLeft"),this.targetYaw=n("KeyE","KeyQ");const i=navigator.getGamepads?navigator.getGamepads():[],r=i&&i[0];if(r){const c=l=>Math.abs(l)<.08?0:l;this.targetRoll+=c(r.axes[0]??0),this.targetPitch+=c(r.axes[1]??0),this.targetYaw+=c(r.axes[2]??0),r.buttons[7]?.value&&(e.throttle=Math.min(1,e.throttle+r.buttons[7].value*t*.8)),r.buttons[6]?.value&&(e.throttle=Math.max(0,e.throttle-r.buttons[6].value*t*.8))}const o=c=>Math.max(-1,Math.min(1,c)),a=1-Math.exp(-t*9);e.pitch+=(o(this.targetPitch)-e.pitch)*a,e.roll+=(o(this.targetRoll)-e.roll)*a,e.yaw+=(o(this.targetYaw)-e.yaw)*a,(this.down("ShiftLeft")||this.down("ShiftRight"))&&(e.throttle=Math.min(1,e.throttle+t*.55)),(this.down("ControlLeft")||this.down("ControlRight"))&&(e.throttle=Math.max(0,e.throttle-t*.55)),this.consume("KeyF")&&(e.flaps=e.flaps>.5?0:e.flaps>0?1:.5),e.brake=this.down("KeyB")||this.down("Space"),this.dragging||(this.orbitYaw*=Math.exp(-t*2.2),this.orbitPitch*=Math.exp(-t*2.2))}}const pn=s=>document.getElementById(s);class Qx{root=pn("hud");speed=pn("hud-speed-val");alt=pn("hud-alt-val");vs=pn("hud-vs-val");heading=pn("hud-heading-val");card=pn("hud-heading-card");thrFill=pn("hud-throttle-fill");thrVal=pn("hud-throttle-val");rpm=pn("hud-rpm-val");stall=pn("hud-stall");msg=pn("hud-msg");cam=pn("hud-cam");time=pn("hud-time");visible=!0;msgTimer=0;show(t){this.visible=t,this.root.classList.toggle("hidden",!t)}toggle(){this.show(!this.visible)}flash(t,e=2.5){this.msg.textContent=t,this.msgTimer=e}update(t,e,n,i,r){if(!this.visible)return;this.speed.textContent=Math.round(t.airspeed*1.9438).toString(),this.alt.textContent=Math.round(t.altitude*3.2808).toString();const o=Math.round(t.verticalSpeed*196.85/50)*50;this.vs.textContent=(o>0?"+":"")+o.toString();const a=Math.round(t.heading)%360;this.heading.textContent=a.toString().padStart(3,"0");const c=["N","NE","E","SE","S","SW","W","NW"];this.card.textContent=c[Math.round(a/45)%8],this.thrFill.style.width=`${Math.round(e*100)}%`,this.thrVal.textContent=`${Math.round(e*100)}%`,this.rpm.textContent=Math.round(600+t.rpm*2e3).toString(),this.stall.classList.toggle("hidden",!t.stalled),this.cam.textContent=n.toUpperCase();const l=Math.floor(i)%24,h=Math.floor(i%1*60);this.time.textContent=`${l.toString().padStart(2,"0")}:${h.toString().padStart(2,"0")}`,this.msgTimer>0&&(this.msgTimer-=r,this.msgTimer<=0&&(this.msg.textContent=""))}}const Sc=[{id:"aerial-a",name:"Reference A — high aerial",description:"Reference-style wide aerial over Isla Garza looking north: causeway receding NNE, downtown skyline upper-left, boats with wakes below, aircraft lower right.",time:14.6,weather:"scattered",camera:{mode:"fixed",pos:[480,400,3720],headingDeg:-6,pitchDeg:-11,fov:42},plane:{fromCamera:{screenX:.79,screenY:.74,distance:44},headingDeg:34,pitchDeg:2,bankDeg:-12,speed:52,throttle:.75},presim:40,clipInputs:{pitch:.05,roll:-.05,yaw:0}},{id:"cockpit-city",name:"Cockpit approaching the city",description:"From the pilot seat, downtown ahead beyond the bay, instrument panel and windshield frame in view.",time:10.5,weather:"clear",camera:{mode:"cockpit",fov:50},plane:{pos:[-900,320,1400],headingDeg:342,pitchDeg:1,bankDeg:0,speed:58,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"bridge-low",name:"Low-altitude bridge flyover",description:"Chase view 45 m over the northern causeway arch, traffic on the deck, piers meeting the water.",time:15.5,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[-1950,52,-3740],headingDeg:96,pitchDeg:0,bankDeg:4,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:.05,yaw:0}},{id:"skyline-high",name:"High-altitude skyline",description:"Fixed camera 900 m up over the bay looking north-west at the downtown skyline hierarchy, port in the middle distance.",time:16.2,weather:"scattered",camera:{mode:"fixed",pos:[-300,900,-1200],headingDeg:-38,pitchDeg:-10,fov:45},plane:{fromCamera:{screenX:.72,screenY:.68,distance:70},headingDeg:-30,pitchDeg:0,bankDeg:12,speed:60,throttle:.7},presim:30,clipInputs:{pitch:0,roll:.1,yaw:0}},{id:"island-pass",name:"Coastal island pass",description:"Low along the barrier island ocean beach: hotels left, surf and shallows right, dunes and palms below.",time:11.5,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[3350,130,-2200],headingDeg:352,pitchDeg:0,bankDeg:-6,speed:52,throttle:.65},presim:30,clipInputs:{pitch:0,roll:-.05,yaw:0}},{id:"harbor",name:"Harbor and marina pass",description:"Over the port: container cranes, cruise terminal, ship channel and the downtown marina beyond.",time:9.5,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[-2100,160,-2500],headingDeg:52,pitchDeg:0,bankDeg:0,speed:50,throttle:.65},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"water-landing",name:"Seaplane water approach",description:"Final approach a few metres above the Garza channel, floats about to touch: foam, wake and spray.",time:13,weather:"clear",camera:{mode:"chase",fov:48},plane:{pos:[-500,5.5,3330],headingDeg:86,pitchDeg:4,bankDeg:0,speed:29,throttle:.25,flaps:1},presim:30,clipInputs:{pitch:.12,roll:0,yaw:0}},{id:"sunset",name:"Sunset flight",description:"Low sun in the west over the bay, downtown silhouetted, warm haze and long water reflections.",time:17.9,weather:"scattered",camera:{mode:"chase",fov:50},plane:{pos:[1400,280,600],headingDeg:262,pitchDeg:1,bankDeg:0,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"cloudy",name:"Cloudy-weather flight",description:"Heavy cumulus and grey haze over Isla Garza; softer light, cloud shadows moving across the water.",time:15,weather:"cloudy",camera:{mode:"chase",fov:50},plane:{pos:[700,300,3100],headingDeg:335,pitchDeg:0,bankDeg:0,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"night",name:"Night flight with city lights",description:"Over the bay at 22:00 looking toward downtown: lit windows, street lamps, headlights and navigation strobes.",time:22,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[-400,320,-900],headingDeg:318,pitchDeg:0,bankDeg:0,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}}];Sc.push({id:"plane-rear-quarter",name:"Aircraft rear three-quarter",description:"Fixed camera 14 m from the aircraft, rear-left-above, aircraft moored at the Garza marina in sunlight.",time:14,weather:"clear",camera:{mode:"fixed",pos:[425.9,4.25,1892.3],headingDeg:205,pitchDeg:-9,fov:40},plane:{pos:[420,1.96,1905],headingDeg:240,pitchDeg:0,bankDeg:0,speed:0,throttle:0},presim:10,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"plane-front-quarter",name:"Aircraft front three-quarter",description:"Fixed camera 13 m ahead-right of the moored aircraft, low, showing cowl, propeller, windshield and floats.",time:10,weather:"clear",camera:{mode:"fixed",pos:[415.6,2.65,1917.2],headingDeg:20,pitchDeg:-3,fov:40},plane:{pos:[420,1.96,1905],headingDeg:240,pitchDeg:0,bankDeg:0,speed:0,throttle:0},presim:10,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"glass-sun",name:"Cockpit glass in direct sun",description:"Close on the windshield and left side windows with the sun behind the camera; interior visible through the glass.",time:15.5,weather:"clear",camera:{mode:"fixed",pos:[418.3,3.05,1911.3],headingDeg:15,pitchDeg:-8,fov:32},plane:{pos:[420,1.96,1905],headingDeg:240,pitchDeg:0,bankDeg:0,speed:0,throttle:0},presim:10,clipInputs:{pitch:0,roll:0,yaw:0}});function t_(s){return Sc.find(t=>t.id===s)}class e_{constructor(t){this.game=t}view=null;fixedDt=1/30;frame=0;flying=!1;list(){return Sc.map(t=>({id:t.id,name:t.name,description:t.description}))}setup(t){const e=t_(t);if(!e)return!1;this.view=e;const n=this.game;n.atmos.hour=e.time,n.atmos.setWeather(e.weather),n.time=0,this.placePlane(e);for(let i=0;i<Math.round(e.presim/this.fixedDt);i++)n.update(this.fixedDt,!1);return this.placePlane(e),this.setupCamera(e),n.aircraft.inputs.throttle=e.plane.throttle,n.aircraft.inputs.flaps=e.plane.flaps??0,n.aircraft.inputs.pitch=e.clipInputs.pitch,n.aircraft.inputs.roll=e.clipInputs.roll,n.aircraft.inputs.yaw=e.clipInputs.yaw,n.update(this.fixedDt,!1),this.updateCamera(this.fixedDt),this.flying=!1,this.frame=0,n.metrics.reset(),!0}placePlane(t){const e=this.game,n=t.plane;let i;if(n.fromCamera&&t.camera.pos){const o=this.fixedCamera(t),a=n.fromCamera.screenX*2-1,c=1-n.fromCamera.screenY*2,l=new P(a,c,.5).unproject(o).sub(o.position).normalize(),h=o.position.clone().addScaledVector(l,n.fromCamera.distance);i=[h.x,h.y,h.z]}else i=n.pos;const r=o=>o*Math.PI/180;e.aircraft.place(i[0],i[1],i[2],r(n.headingDeg),r(n.pitchDeg),r(n.bankDeg),n.speed,n.throttle)}fixedCamera(t){const e=new mn(t.camera.fov,this.game.camera.aspect,.4,6e4),[n,i,r]=t.camera.pos;e.position.set(n,i,r);const o=(t.camera.headingDeg??0)*Math.PI/180,a=(t.camera.pitchDeg??0)*Math.PI/180;return e.rotation.set(0,0,0),e.rotation.order="YXZ",e.rotation.y=-o,e.rotation.x=a,e.updateMatrixWorld(),e.updateProjectionMatrix(),e}setupCamera(t){const e=this.game,n=e.flightCamera;if(n.baseFov=t.camera.fov,n.orbitPitch=0,n.orbitYaw=0,t.camera.mode==="fixed"){n.mode="fixed";const i=this.fixedCamera(t);e.camera.position.copy(i.position),e.camera.quaternion.copy(i.quaternion),e.camera.fov=t.camera.fov,e.camera.updateProjectionMatrix()}else{n.mode=t.camera.mode,n.snap();for(let i=0;i<120;i++)n.update(e.aircraft.flight,e.aircraft.model,this.fixedDt)}}updateCamera(t){this.game.flightCamera.update(this.game.aircraft.flight,this.game.aircraft.model,t)}step(t=1){const e=this.game;for(let n=0;n<t;n++)e.update(this.fixedDt,!0),this.updateCamera(this.fixedDt),this.frame++;this.flying=!0,e.render()}render(){this.game.render()}renderSync(){const t=this.game.renderer.getContext(),e=performance.now();this.game.render(),t.finish();const n=new Uint8Array(4);return t.readPixels(0,0,1,1,t.RGBA,t.UNSIGNED_BYTE,n),performance.now()-e}profile(t=20){const e=[];for(let r=0;r<t;r++)this.game.update(this.fixedDt,!0),this.updateCamera(this.fixedDt),e.push(this.renderSync());const n=e.slice().sort((r,o)=>r-o),i=n.reduce((r,o)=>r+o,0)/n.length;return{frames:t,avgMs:i,minMs:n[0],maxMs:n[n.length-1],p95Ms:n[Math.floor(n.length*.95)],onePercentLowMs:n[n.length-1]}}metrics(){const t=this.game.metrics.snapshot(),e=this.game.aircraft.flight.telemetry;return{...t,frame:this.frame,flying:this.flying,telemetry:{airspeed:e.airspeed,altitude:e.altitude,heading:e.heading,alpha:e.alpha,stalled:e.stalled,onWater:e.onWater},build:window.__build,view:this.view?.id??null,camera:{pos:this.game.camera.position.toArray(),quat:this.game.camera.quaternion.toArray(),fov:this.game.camera.fov}}}project(t,e,n){const i=new P(t,e,n).project(this.game.camera);return i.z>1?null:[(i.x+1)/2,(1-i.y)/2]}landmarks(){const t=this.game,e=t.map.bridges.find(c=>c.id==="garza-bridge"),n=e.pts[0],i=e.pts[e.pts.length-1],r=t.aircraft.flight.position,o={planeCentroid:this.project(r.x,r.y,r.z),bridgeStart:this.project(n[0],7,n[1]),bridgeEnd:this.project(i[0],7,i[1])};for(const c of t.city.landmarkPositions)o[`landmark:${c.name}`]=this.project(c.x,c.h,c.z);const a=t.map.bridges.find(c=>c.id==="tortuga-bridge");return a&&(o.bridge2End=this.project(a.pts[a.pts.length-1][0],7,a.pts[a.pts.length-1][1])),o.horizonCentre=this.project(t.camera.position.x+Math.sin(0)*5e4,0,t.camera.position.z-5e4),o}}window.__build="32aab3d85421-20260904T180514Z";async function n_(){const s=fu(),t=document.getElementById("view"),e=document.getElementById("start-status"),n=document.getElementById("start-btn"),i=document.getElementById("start");n.disabled=!0;const r=new Kx(t,s);window.__game=r;const o=(g,m)=>{e.textContent=`${g}… ${Math.round(m*100)}%`};await r.init(o);const a=()=>{const g=s.width??window.innerWidth,m=s.height??window.innerHeight;s.width&&(t.style.width=`${g}px`,t.style.height=`${m}px`),r.setSize(g,m,s.width?1:Math.min(window.devicePixelRatio,1.5))};window.addEventListener("resize",a),a();const c=new Qx,l=new Jx(t),h=new e_(r);if(window.__bench=h,e.textContent=`Build ${window.__build}`,n.disabled=!1,s.bench){if(i.classList.add("hidden"),c.show(!s.noHud),!h.setup(s.bench)){e.textContent=`Unknown bench view ${s.bench}`;return}const m=document.getElementById("benchtag");m.classList.remove("hidden"),m.textContent=`${s.bench} · seed ${s.seed} · ${window.__build}`,s.noHud&&m.classList.add("hidden");const y=()=>{h.render();const w=r.aircraft.flight.telemetry;c.update(w,r.aircraft.inputs.throttle,r.flightCamera.mode,r.atmos.hour,0),window.__ready=!0,window.__benchReady=!0,s.freeze||requestAnimationFrame(y)};y();return}let d=!1;const u=()=>{d||(d=!0,i.classList.add("hidden"),c.show(!0),c.flash("Full throttle (Shift) to take off. S pulls the nose up once above 55 KIAS.",6),r.aircraft.inputs.throttle=0,r.flightCamera.mode="chase",r.flightCamera.snap())};n.addEventListener("click",u),window.addEventListener("keydown",g=>{g.code==="Enter"&&!d&&u()}),s.autostart&&u();let f=performance.now(),p=0;const x=()=>{const g=performance.now();let m=s.fixedDt??Math.min(.1,(g-f)/1e3);if(f=g,s.freeze&&(m=0),l.update(m),d){const v=l.flight,T=r.aircraft.inputs;if(T.throttle=v.throttle,T.pitch=v.pitch,T.roll=v.roll,T.yaw=v.yaw,T.flaps=v.flaps,T.brake=v.brake,l.consume("KeyC")&&(r.flightCamera.mode=r.flightCamera.mode==="chase"?"cockpit":"chase",r.flightCamera.snap()),l.consume("KeyV")&&(r.flightCamera.mode="cockpit",r.flightCamera.snap()),l.consume("KeyH")&&c.toggle(),l.consume("KeyT")&&(r.atmos.hour=(r.atmos.hour+2)%24,c.flash(`Time ${Math.floor(r.atmos.hour)}:00`)),l.consume("KeyY")){const M=["clear","scattered","cloudy","storm"],E=(M.indexOf(r.atmos.weather)+1)%M.length;r.atmos.setWeather(M[E]),c.flash(`Weather: ${M[E]}`)}if(l.consume("KeyR")){const M=r.map.pois.find(E=>E.kind==="seaplane");r.aircraft.place(M.x+120,1.6,M.z+60,Math.PI*.5,0,0,0,0),v.throttle=0,r.flightCamera.snap(),c.flash("Reset to the seaplane base")}l.consume("KeyG")&&(r.aircraft.place(r.aircraft.flight.position.x,350,r.aircraft.flight.position.z,Math.PI*.5,0,0,55,.7),v.throttle=.7,c.flash("Airborne at 350 m")),r.flightCamera.orbitYaw=l.orbitYaw,r.flightCamera.orbitPitch=l.orbitPitch}p+=m;const y=1/60;let w=0;for(;p>=y&&w<8;)r.update(y,d),p-=y,w++;w===8&&(p=0),r.flightCamera.update(r.aircraft.flight,r.aircraft.model,m),r.render(),c.update(r.aircraft.flight.telemetry,r.aircraft.inputs.throttle,r.flightCamera.mode,r.atmos.hour,m),window.__ready=!0,requestAnimationFrame(x)};r.update(0,!1),r.flightCamera.update(r.aircraft.flight,r.aircraft.model,1/60),x()}n_().catch(s=>{console.error(s);const t=document.getElementById("start-status");t&&(t.textContent=`Failed to start: ${s.message}`)});
