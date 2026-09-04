(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const r of o.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&n(r)}).observe(document,{childList:!0,subtree:!0});function e(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(i){if(i.ep)return;i.ep=!0;const o=e(i);fetch(i.href,o)}})();function mu(){const s=new URLSearchParams(window.location.search),t=n=>{const i=s.get(n);if(i===null||i==="")return null;if(i.includes("/")){const[r,a]=i.split("/").map(Number);return a?r/a:null}const o=Number(i);return Number.isFinite(o)?o:null},e=s.get("quality")??"high";return{bench:s.get("bench"),seed:t("seed")??20260904,time:t("time"),weather:s.get("weather")??null,quality:["low","medium","high","ultra"].includes(e)?e:"high",freeze:s.get("freeze")==="1",fixedDt:t("dt"),noHud:s.get("nohud")==="1",width:t("w"),height:t("h"),autostart:s.get("autostart")==="1"||s.get("bench")!==null,grid:s.get("grid")==="1",debug:s.get("debug")==="1",debugRoads:s.get("debugroads")==="1",dbg:new Set((s.get("dbg")??"").split(",").filter(Boolean))}}/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const oc="170",gu=0,Cc=1,vu=2,dh=1,fh=2,Wn=3,Jn=0,Je=1,Be=2,pi=0,$n=1,Rc=2,Pc=3,Lc=4,xu=5,Ci=100,_u=101,wu=102,yu=103,Mu=104,Su=200,bu=201,Eu=202,Tu=203,la=204,ha=205,Au=206,Cu=207,Ru=208,Pu=209,Lu=210,Du=211,Iu=212,zu=213,Uu=214,ua=0,da=1,fa=2,us=3,pa=4,ma=5,ga=6,va=7,ph=0,Nu=1,Fu=2,jn=0,Ou=1,ku=2,Bu=3,Hu=4,Gu=5,Vu=6,Wu=7,mh=300,ds=301,fs=302,xa=303,_a=304,rr=306,ps=1e3,yn=1001,wa=1002,rn=1003,Xu=1004,_o=1005,xe=1006,fr=1007,fi=1008,xn=1009,gh=1010,vh=1011,no=1012,rc=1013,Qn=1014,vn=1015,Rn=1016,ac=1017,cc=1018,ms=1020,xh=35902,_h=1021,wh=1022,Ke=1023,yh=1024,Mh=1025,as=1026,gs=1027,io=1028,ar=1029,Sh=1030,lc=1031,hc=1033,jo=33776,Zo=33777,Ko=33778,Jo=33779,ya=35840,Ma=35841,Sa=35842,ba=35843,Ea=36196,Ta=37492,Aa=37496,Ca=37808,Ra=37809,Pa=37810,La=37811,Da=37812,Ia=37813,za=37814,Ua=37815,Na=37816,Fa=37817,Oa=37818,ka=37819,Ba=37820,Ha=37821,Qo=36492,Ga=36494,Va=36495,bh=36283,Wa=36284,Xa=36285,qa=36286,qu=3200,Eh=3201,Th=0,Yu=1,zn="",on="srgb",Ni="srgb-linear",cr="linear",_e="srgb",Oi=7680,Dc=519,$u=512,ju=513,Zu=514,Ah=515,Ku=516,Ju=517,Qu=518,td=519,Ic=35044,zc=35048,Uc="300 es",Yn=2e3,nr=2001;class Ss{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){if(this._listeners===void 0)return!1;const n=this._listeners;return n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){if(this._listeners===void 0)return;const i=this._listeners[t];if(i!==void 0){const o=i.indexOf(e);o!==-1&&i.splice(o,1)}}dispatchEvent(t){if(this._listeners===void 0)return;const n=this._listeners[t.type];if(n!==void 0){t.target=this;const i=n.slice(0);for(let o=0,r=i.length;o<r;o++)i[o].call(this,t);t.target=null}}}const Ye=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Nc=1234567;const js=Math.PI/180,so=180/Math.PI;function bs(){const s=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ye[s&255]+Ye[s>>8&255]+Ye[s>>16&255]+Ye[s>>24&255]+"-"+Ye[t&255]+Ye[t>>8&255]+"-"+Ye[t>>16&15|64]+Ye[t>>24&255]+"-"+Ye[e&63|128]+Ye[e>>8&255]+"-"+Ye[e>>16&255]+Ye[e>>24&255]+Ye[n&255]+Ye[n>>8&255]+Ye[n>>16&255]+Ye[n>>24&255]).toLowerCase()}function Ue(s,t,e){return Math.max(t,Math.min(e,s))}function uc(s,t){return(s%t+t)%t}function ed(s,t,e,n,i){return n+(s-t)*(i-n)/(e-t)}function nd(s,t,e){return s!==t?(e-s)/(t-s):0}function Zs(s,t,e){return(1-e)*s+e*t}function id(s,t,e,n){return Zs(s,t,1-Math.exp(-e*n))}function sd(s,t=1){return t-Math.abs(uc(s,t*2)-t)}function od(s,t,e){return s<=t?0:s>=e?1:(s=(s-t)/(e-t),s*s*(3-2*s))}function rd(s,t,e){return s<=t?0:s>=e?1:(s=(s-t)/(e-t),s*s*s*(s*(s*6-15)+10))}function ad(s,t){return s+Math.floor(Math.random()*(t-s+1))}function cd(s,t){return s+Math.random()*(t-s)}function ld(s){return s*(.5-Math.random())}function hd(s){s!==void 0&&(Nc=s);let t=Nc+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function ud(s){return s*js}function dd(s){return s*so}function fd(s){return(s&s-1)===0&&s!==0}function pd(s){return Math.pow(2,Math.ceil(Math.log(s)/Math.LN2))}function md(s){return Math.pow(2,Math.floor(Math.log(s)/Math.LN2))}function gd(s,t,e,n,i){const o=Math.cos,r=Math.sin,a=o(e/2),c=r(e/2),l=o((t+n)/2),h=r((t+n)/2),d=o((t-n)/2),u=r((t-n)/2),f=o((n-t)/2),p=r((n-t)/2);switch(i){case"XYX":s.set(a*h,c*d,c*u,a*l);break;case"YZY":s.set(c*u,a*h,c*d,a*l);break;case"ZXZ":s.set(c*d,c*u,a*h,a*l);break;case"XZX":s.set(a*h,c*p,c*f,a*l);break;case"YXY":s.set(c*f,a*h,c*p,a*l);break;case"ZYZ":s.set(c*p,c*f,a*h,a*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+i)}}function ns(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("Invalid component type.")}}function nn(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("Invalid component type.")}}const Di={DEG2RAD:js,RAD2DEG:so,generateUUID:bs,clamp:Ue,euclideanModulo:uc,mapLinear:ed,inverseLerp:nd,lerp:Zs,damp:id,pingpong:sd,smoothstep:od,smootherstep:rd,randInt:ad,randFloat:cd,randFloatSpread:ld,seededRandom:hd,degToRad:ud,radToDeg:dd,isPowerOfTwo:fd,ceilPowerOfTwo:pd,floorPowerOfTwo:md,setQuaternionFromProperEuler:gd,normalize:nn,denormalize:ns};class Ft{constructor(t=0,e=0){Ft.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,n=this.y,i=t.elements;return this.x=i[0]*e+i[3]*n+i[6],this.y=i[1]*e+i[4]*n+i[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(Ue(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const n=Math.cos(e),i=Math.sin(e),o=this.x-t.x,r=this.y-t.y;return this.x=o*n-r*i+t.x,this.y=o*i+r*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class ue{constructor(t,e,n,i,o,r,a,c,l){ue.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,i,o,r,a,c,l)}set(t,e,n,i,o,r,a,c,l){const h=this.elements;return h[0]=t,h[1]=i,h[2]=a,h[3]=e,h[4]=o,h[5]=c,h[6]=n,h[7]=r,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,i=e.elements,o=this.elements,r=n[0],a=n[3],c=n[6],l=n[1],h=n[4],d=n[7],u=n[2],f=n[5],p=n[8],x=i[0],g=i[3],m=i[6],w=i[1],y=i[4],v=i[7],T=i[2],M=i[5],E=i[8];return o[0]=r*x+a*w+c*T,o[3]=r*g+a*y+c*M,o[6]=r*m+a*v+c*E,o[1]=l*x+h*w+d*T,o[4]=l*g+h*y+d*M,o[7]=l*m+h*v+d*E,o[2]=u*x+f*w+p*T,o[5]=u*g+f*y+p*M,o[8]=u*m+f*v+p*E,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[1],i=t[2],o=t[3],r=t[4],a=t[5],c=t[6],l=t[7],h=t[8];return e*r*h-e*a*l-n*o*h+n*a*c+i*o*l-i*r*c}invert(){const t=this.elements,e=t[0],n=t[1],i=t[2],o=t[3],r=t[4],a=t[5],c=t[6],l=t[7],h=t[8],d=h*r-a*l,u=a*c-h*o,f=l*o-r*c,p=e*d+n*u+i*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);const x=1/p;return t[0]=d*x,t[1]=(i*l-h*n)*x,t[2]=(a*n-i*r)*x,t[3]=u*x,t[4]=(h*e-i*c)*x,t[5]=(i*o-a*e)*x,t[6]=f*x,t[7]=(n*c-l*e)*x,t[8]=(r*e-n*o)*x,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,i,o,r,a){const c=Math.cos(o),l=Math.sin(o);return this.set(n*c,n*l,-n*(c*r+l*a)+r+t,-i*l,i*c,-i*(-l*r+c*a)+a+e,0,0,1),this}scale(t,e){return this.premultiply(pr.makeScale(t,e)),this}rotate(t){return this.premultiply(pr.makeRotation(-t)),this}translate(t,e){return this.premultiply(pr.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,n=t.elements;for(let i=0;i<9;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const pr=new ue;function Ch(s){for(let t=s.length-1;t>=0;--t)if(s[t]>=65535)return!0;return!1}function ir(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function vd(){const s=ir("canvas");return s.style.display="block",s}const Fc={};function Xs(s){s in Fc||(Fc[s]=!0,console.warn(s))}function xd(s,t,e){return new Promise(function(n,i){function o(){switch(s.clientWaitSync(t,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:i();break;case s.TIMEOUT_EXPIRED:setTimeout(o,e);break;default:n()}}setTimeout(o,e)})}function _d(s){const t=s.elements;t[2]=.5*t[2]+.5*t[3],t[6]=.5*t[6]+.5*t[7],t[10]=.5*t[10]+.5*t[11],t[14]=.5*t[14]+.5*t[15]}function wd(s){const t=s.elements;t[11]===-1?(t[10]=-t[10]-1,t[14]=-t[14]):(t[10]=-t[10],t[14]=-t[14]+1)}const ve={enabled:!0,workingColorSpace:Ni,spaces:{},convert:function(s,t,e){return this.enabled===!1||t===e||!t||!e||(this.spaces[t].transfer===_e&&(s.r=Zn(s.r),s.g=Zn(s.g),s.b=Zn(s.b)),this.spaces[t].primaries!==this.spaces[e].primaries&&(s.applyMatrix3(this.spaces[t].toXYZ),s.applyMatrix3(this.spaces[e].fromXYZ)),this.spaces[e].transfer===_e&&(s.r=cs(s.r),s.g=cs(s.g),s.b=cs(s.b))),s},fromWorkingColorSpace:function(s,t){return this.convert(s,this.workingColorSpace,t)},toWorkingColorSpace:function(s,t){return this.convert(s,t,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===zn?cr:this.spaces[s].transfer},getLuminanceCoefficients:function(s,t=this.workingColorSpace){return s.fromArray(this.spaces[t].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,t,e){return s.copy(this.spaces[t].toXYZ).multiply(this.spaces[e].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace}};function Zn(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function cs(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}const Oc=[.64,.33,.3,.6,.15,.06],kc=[.2126,.7152,.0722],Bc=[.3127,.329],Hc=new ue().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Gc=new ue().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);ve.define({[Ni]:{primaries:Oc,whitePoint:Bc,transfer:cr,toXYZ:Hc,fromXYZ:Gc,luminanceCoefficients:kc,workingColorSpaceConfig:{unpackColorSpace:on},outputColorSpaceConfig:{drawingBufferColorSpace:on}},[on]:{primaries:Oc,whitePoint:Bc,transfer:_e,toXYZ:Hc,fromXYZ:Gc,luminanceCoefficients:kc,outputColorSpaceConfig:{drawingBufferColorSpace:on}}});let ki;class yd{static getDataURL(t){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let e;if(t instanceof HTMLCanvasElement)e=t;else{ki===void 0&&(ki=ir("canvas")),ki.width=t.width,ki.height=t.height;const n=ki.getContext("2d");t instanceof ImageData?n.putImageData(t,0,0):n.drawImage(t,0,0,t.width,t.height),e=ki}return e.width>2048||e.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",t),e.toDataURL("image/jpeg",.6)):e.toDataURL("image/png")}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=ir("canvas");e.width=t.width,e.height=t.height;const n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);const i=n.getImageData(0,0,t.width,t.height),o=i.data;for(let r=0;r<o.length;r++)o[r]=Zn(o[r]/255)*255;return n.putImageData(i,0,0),e}else if(t.data){const e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Zn(e[n]/255)*255):e[n]=Zn(e[n]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let Md=0;class Rh{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Md++}),this.uuid=bs(),this.data=t,this.dataReady=!0,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let o;if(Array.isArray(i)){o=[];for(let r=0,a=i.length;r<a;r++)i[r].isDataTexture?o.push(mr(i[r].image)):o.push(mr(i[r]))}else o=mr(i);n.url=o}return e||(t.images[this.uuid]=n),n}}function mr(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?yd.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let Sd=0;class Qe extends Ss{constructor(t=Qe.DEFAULT_IMAGE,e=Qe.DEFAULT_MAPPING,n=yn,i=yn,o=xe,r=fi,a=Ke,c=xn,l=Qe.DEFAULT_ANISOTROPY,h=zn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Sd++}),this.uuid=bs(),this.name="",this.source=new Rh(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=o,this.minFilter=r,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=c,this.offset=new Ft(0,0),this.repeat=new Ft(1,1),this.center=new Ft(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new ue,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==mh)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case ps:t.x=t.x-Math.floor(t.x);break;case yn:t.x=t.x<0?0:1;break;case wa:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case ps:t.y=t.y-Math.floor(t.y);break;case yn:t.y=t.y<0?0:1;break;case wa:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}Qe.DEFAULT_IMAGE=null;Qe.DEFAULT_MAPPING=mh;Qe.DEFAULT_ANISOTROPY=1;class Ee{constructor(t=0,e=0,n=0,i=1){Ee.prototype.isVector4=!0,this.x=t,this.y=e,this.z=n,this.w=i}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,i){return this.x=t,this.y=e,this.z=n,this.w=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,n=this.y,i=this.z,o=this.w,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*i+r[12]*o,this.y=r[1]*e+r[5]*n+r[9]*i+r[13]*o,this.z=r[2]*e+r[6]*n+r[10]*i+r[14]*o,this.w=r[3]*e+r[7]*n+r[11]*i+r[15]*o,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,i,o;const c=t.elements,l=c[0],h=c[4],d=c[8],u=c[1],f=c[5],p=c[9],x=c[2],g=c[6],m=c[10];if(Math.abs(h-u)<.01&&Math.abs(d-x)<.01&&Math.abs(p-g)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+x)<.1&&Math.abs(p+g)<.1&&Math.abs(l+f+m-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const y=(l+1)/2,v=(f+1)/2,T=(m+1)/2,M=(h+u)/4,E=(d+x)/4,b=(p+g)/4;return y>v&&y>T?y<.01?(n=0,i=.707106781,o=.707106781):(n=Math.sqrt(y),i=M/n,o=E/n):v>T?v<.01?(n=.707106781,i=0,o=.707106781):(i=Math.sqrt(v),n=M/i,o=b/i):T<.01?(n=.707106781,i=.707106781,o=0):(o=Math.sqrt(T),n=E/o,i=b/o),this.set(n,i,o,e),this}let w=Math.sqrt((g-p)*(g-p)+(d-x)*(d-x)+(u-h)*(u-h));return Math.abs(w)<.001&&(w=1),this.x=(g-p)/w,this.y=(d-x)/w,this.z=(u-h)/w,this.w=Math.acos((l+f+m-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this.w=Math.max(t.w,Math.min(e.w,this.w)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this.w=Math.max(t,Math.min(e,this.w)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class bd extends Ss{constructor(t=1,e=1,n={}){super(),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=1,this.scissor=new Ee(0,0,t,e),this.scissorTest=!1,this.viewport=new Ee(0,0,t,e);const i={width:t,height:e,depth:1};n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:xe,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},n);const o=new Qe(i,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace);o.flipY=!1,o.generateMipmaps=n.generateMipmaps,o.internalFormat=n.internalFormat,this.textures=[];const r=n.count;for(let a=0;a<r;a++)this.textures[a]=o.clone(),this.textures[a].isRenderTargetTexture=!0;this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.depthTexture=n.depthTexture,this.samples=n.samples}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let i=0,o=this.textures.length;i<o;i++)this.textures[i].image.width=t,this.textures[i].image.height=e,this.textures[i].image.depth=n;this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let n=0,i=t.textures.length;n<i;n++)this.textures[n]=t.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0;const e=Object.assign({},t.texture.image);return this.texture.source=new Rh(e),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class ln extends bd{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}}class Ph extends Qe{constructor(t=null,e=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=rn,this.minFilter=rn,this.wrapR=yn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class Lh extends Qe{constructor(t=null,e=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=rn,this.minFilter=rn,this.wrapR=yn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Ae{constructor(t=0,e=0,n=0,i=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=i}static slerpFlat(t,e,n,i,o,r,a){let c=n[i+0],l=n[i+1],h=n[i+2],d=n[i+3];const u=o[r+0],f=o[r+1],p=o[r+2],x=o[r+3];if(a===0){t[e+0]=c,t[e+1]=l,t[e+2]=h,t[e+3]=d;return}if(a===1){t[e+0]=u,t[e+1]=f,t[e+2]=p,t[e+3]=x;return}if(d!==x||c!==u||l!==f||h!==p){let g=1-a;const m=c*u+l*f+h*p+d*x,w=m>=0?1:-1,y=1-m*m;if(y>Number.EPSILON){const T=Math.sqrt(y),M=Math.atan2(T,m*w);g=Math.sin(g*M)/T,a=Math.sin(a*M)/T}const v=a*w;if(c=c*g+u*v,l=l*g+f*v,h=h*g+p*v,d=d*g+x*v,g===1-a){const T=1/Math.sqrt(c*c+l*l+h*h+d*d);c*=T,l*=T,h*=T,d*=T}}t[e]=c,t[e+1]=l,t[e+2]=h,t[e+3]=d}static multiplyQuaternionsFlat(t,e,n,i,o,r){const a=n[i],c=n[i+1],l=n[i+2],h=n[i+3],d=o[r],u=o[r+1],f=o[r+2],p=o[r+3];return t[e]=a*p+h*d+c*f-l*u,t[e+1]=c*p+h*u+l*d-a*f,t[e+2]=l*p+h*f+a*u-c*d,t[e+3]=h*p-a*d-c*u-l*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,i){return this._x=t,this._y=e,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const n=t._x,i=t._y,o=t._z,r=t._order,a=Math.cos,c=Math.sin,l=a(n/2),h=a(i/2),d=a(o/2),u=c(n/2),f=c(i/2),p=c(o/2);switch(r){case"XYZ":this._x=u*h*d+l*f*p,this._y=l*f*d-u*h*p,this._z=l*h*p+u*f*d,this._w=l*h*d-u*f*p;break;case"YXZ":this._x=u*h*d+l*f*p,this._y=l*f*d-u*h*p,this._z=l*h*p-u*f*d,this._w=l*h*d+u*f*p;break;case"ZXY":this._x=u*h*d-l*f*p,this._y=l*f*d+u*h*p,this._z=l*h*p+u*f*d,this._w=l*h*d-u*f*p;break;case"ZYX":this._x=u*h*d-l*f*p,this._y=l*f*d+u*h*p,this._z=l*h*p-u*f*d,this._w=l*h*d+u*f*p;break;case"YZX":this._x=u*h*d+l*f*p,this._y=l*f*d+u*h*p,this._z=l*h*p-u*f*d,this._w=l*h*d-u*f*p;break;case"XZY":this._x=u*h*d-l*f*p,this._y=l*f*d-u*h*p,this._z=l*h*p+u*f*d,this._w=l*h*d+u*f*p;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+r)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const n=e/2,i=Math.sin(n);return this._x=t.x*i,this._y=t.y*i,this._z=t.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,n=e[0],i=e[4],o=e[8],r=e[1],a=e[5],c=e[9],l=e[2],h=e[6],d=e[10],u=n+a+d;if(u>0){const f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-c)*f,this._y=(o-l)*f,this._z=(r-i)*f}else if(n>a&&n>d){const f=2*Math.sqrt(1+n-a-d);this._w=(h-c)/f,this._x=.25*f,this._y=(i+r)/f,this._z=(o+l)/f}else if(a>d){const f=2*Math.sqrt(1+a-n-d);this._w=(o-l)/f,this._x=(i+r)/f,this._y=.25*f,this._z=(c+h)/f}else{const f=2*Math.sqrt(1+d-n-a);this._w=(r-i)/f,this._x=(o+l)/f,this._y=(c+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<Number.EPSILON?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Ue(this.dot(t),-1,1)))}rotateTowards(t,e){const n=this.angleTo(t);if(n===0)return this;const i=Math.min(1,e/n);return this.slerp(t,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const n=t._x,i=t._y,o=t._z,r=t._w,a=e._x,c=e._y,l=e._z,h=e._w;return this._x=n*h+r*a+i*l-o*c,this._y=i*h+r*c+o*a-n*l,this._z=o*h+r*l+n*c-i*a,this._w=r*h-n*a-i*c-o*l,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);const n=this._x,i=this._y,o=this._z,r=this._w;let a=r*t._w+n*t._x+i*t._y+o*t._z;if(a<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,a=-a):this.copy(t),a>=1)return this._w=r,this._x=n,this._y=i,this._z=o,this;const c=1-a*a;if(c<=Number.EPSILON){const f=1-e;return this._w=f*r+e*this._w,this._x=f*n+e*this._x,this._y=f*i+e*this._y,this._z=f*o+e*this._z,this.normalize(),this}const l=Math.sqrt(c),h=Math.atan2(l,a),d=Math.sin((1-e)*h)/l,u=Math.sin(e*h)/l;return this._w=r*d+this._w*u,this._x=n*d+this._x*u,this._y=i*d+this._y*u,this._z=o*d+this._z*u,this._onChangeCallback(),this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),o=Math.sqrt(n);return this.set(i*Math.sin(t),i*Math.cos(t),o*Math.sin(e),o*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class P{constructor(t=0,e=0,n=0){P.prototype.isVector3=!0,this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Vc.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Vc.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,n=this.y,i=this.z,o=t.elements;return this.x=o[0]*e+o[3]*n+o[6]*i,this.y=o[1]*e+o[4]*n+o[7]*i,this.z=o[2]*e+o[5]*n+o[8]*i,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,n=this.y,i=this.z,o=t.elements,r=1/(o[3]*e+o[7]*n+o[11]*i+o[15]);return this.x=(o[0]*e+o[4]*n+o[8]*i+o[12])*r,this.y=(o[1]*e+o[5]*n+o[9]*i+o[13])*r,this.z=(o[2]*e+o[6]*n+o[10]*i+o[14])*r,this}applyQuaternion(t){const e=this.x,n=this.y,i=this.z,o=t.x,r=t.y,a=t.z,c=t.w,l=2*(r*i-a*n),h=2*(a*e-o*i),d=2*(o*n-r*e);return this.x=e+c*l+r*d-a*h,this.y=n+c*h+a*l-o*d,this.z=i+c*d+o*h-r*l,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,n=this.y,i=this.z,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*i,this.y=o[1]*e+o[5]*n+o[9]*i,this.z=o[2]*e+o[6]*n+o[10]*i,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const n=t.x,i=t.y,o=t.z,r=e.x,a=e.y,c=e.z;return this.x=i*c-o*a,this.y=o*r-n*c,this.z=n*a-i*r,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return gr.copy(this).projectOnVector(t),this.sub(gr)}reflect(t){return this.sub(gr.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(Ue(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y,i=this.z-t.z;return e*e+n*n+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){const i=Math.sin(e)*t;return this.x=i*Math.sin(n),this.y=Math.cos(e)*t,this.z=i*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),i=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=i,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const gr=new P,Vc=new Ae;class He{constructor(t=new P(1/0,1/0,1/0),e=new P(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(En.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(En.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=En.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const n=t.geometry;if(n!==void 0){const o=n.getAttribute("position");if(e===!0&&o!==void 0&&t.isInstancedMesh!==!0)for(let r=0,a=o.count;r<a;r++)t.isMesh===!0?t.getVertexPosition(r,En):En.fromBufferAttribute(o,r),En.applyMatrix4(t.matrixWorld),this.expandByPoint(En);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),wo.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),wo.copy(n.boundingBox)),wo.applyMatrix4(t.matrixWorld),this.union(wo)}const i=t.children;for(let o=0,r=i.length;o<r;o++)this.expandByObject(i[o],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,En),En.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Ds),yo.subVectors(this.max,Ds),Bi.subVectors(t.a,Ds),Hi.subVectors(t.b,Ds),Gi.subVectors(t.c,Ds),oi.subVectors(Hi,Bi),ri.subVectors(Gi,Hi),gi.subVectors(Bi,Gi);let e=[0,-oi.z,oi.y,0,-ri.z,ri.y,0,-gi.z,gi.y,oi.z,0,-oi.x,ri.z,0,-ri.x,gi.z,0,-gi.x,-oi.y,oi.x,0,-ri.y,ri.x,0,-gi.y,gi.x,0];return!vr(e,Bi,Hi,Gi,yo)||(e=[1,0,0,0,1,0,0,0,1],!vr(e,Bi,Hi,Gi,yo))?!1:(Mo.crossVectors(oi,ri),e=[Mo.x,Mo.y,Mo.z],vr(e,Bi,Hi,Gi,yo))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,En).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(En).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Nn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Nn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Nn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Nn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Nn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Nn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Nn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Nn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Nn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}const Nn=[new P,new P,new P,new P,new P,new P,new P,new P],En=new P,wo=new He,Bi=new P,Hi=new P,Gi=new P,oi=new P,ri=new P,gi=new P,Ds=new P,yo=new P,Mo=new P,vi=new P;function vr(s,t,e,n,i){for(let o=0,r=s.length-3;o<=r;o+=3){vi.fromArray(s,o);const a=i.x*Math.abs(vi.x)+i.y*Math.abs(vi.y)+i.z*Math.abs(vi.z),c=t.dot(vi),l=e.dot(vi),h=n.dot(vi);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>a)return!1}return!0}const Ed=new He,Is=new P,xr=new P;class Ce{constructor(t=new P,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const n=this.center;e!==void 0?n.copy(e):Ed.setFromPoints(t).getCenter(n);let i=0;for(let o=0,r=t.length;o<r;o++)i=Math.max(i,n.distanceToSquared(t[o]));return this.radius=Math.sqrt(i),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Is.subVectors(t,this.center);const e=Is.lengthSq();if(e>this.radius*this.radius){const n=Math.sqrt(e),i=(n-this.radius)*.5;this.center.addScaledVector(Is,i/n),this.radius+=i}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(xr.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Is.copy(t.center).add(xr)),this.expandByPoint(Is.copy(t.center).sub(xr))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}}const Fn=new P,_r=new P,So=new P,ai=new P,wr=new P,bo=new P,yr=new P;class Dh{constructor(t=new P,e=new P(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Fn)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=Fn.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Fn.copy(this.origin).addScaledVector(this.direction,e),Fn.distanceToSquared(t))}distanceSqToSegment(t,e,n,i){_r.copy(t).add(e).multiplyScalar(.5),So.copy(e).sub(t).normalize(),ai.copy(this.origin).sub(_r);const o=t.distanceTo(e)*.5,r=-this.direction.dot(So),a=ai.dot(this.direction),c=-ai.dot(So),l=ai.lengthSq(),h=Math.abs(1-r*r);let d,u,f,p;if(h>0)if(d=r*c-a,u=r*a-c,p=o*h,d>=0)if(u>=-p)if(u<=p){const x=1/h;d*=x,u*=x,f=d*(d+r*u+2*a)+u*(r*d+u+2*c)+l}else u=o,d=Math.max(0,-(r*u+a)),f=-d*d+u*(u+2*c)+l;else u=-o,d=Math.max(0,-(r*u+a)),f=-d*d+u*(u+2*c)+l;else u<=-p?(d=Math.max(0,-(-r*o+a)),u=d>0?-o:Math.min(Math.max(-o,-c),o),f=-d*d+u*(u+2*c)+l):u<=p?(d=0,u=Math.min(Math.max(-o,-c),o),f=u*(u+2*c)+l):(d=Math.max(0,-(r*o+a)),u=d>0?o:Math.min(Math.max(-o,-c),o),f=-d*d+u*(u+2*c)+l);else u=r>0?-o:o,d=Math.max(0,-(r*u+a)),f=-d*d+u*(u+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,d),i&&i.copy(_r).addScaledVector(So,u),f}intersectSphere(t,e){Fn.subVectors(t.center,this.origin);const n=Fn.dot(this.direction),i=Fn.dot(Fn)-n*n,o=t.radius*t.radius;if(i>o)return null;const r=Math.sqrt(o-i),a=n-r,c=n+r;return c<0?null:a<0?this.at(c,e):this.at(a,e)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){const n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,i,o,r,a,c;const l=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return l>=0?(n=(t.min.x-u.x)*l,i=(t.max.x-u.x)*l):(n=(t.max.x-u.x)*l,i=(t.min.x-u.x)*l),h>=0?(o=(t.min.y-u.y)*h,r=(t.max.y-u.y)*h):(o=(t.max.y-u.y)*h,r=(t.min.y-u.y)*h),n>r||o>i||((o>n||isNaN(n))&&(n=o),(r<i||isNaN(i))&&(i=r),d>=0?(a=(t.min.z-u.z)*d,c=(t.max.z-u.z)*d):(a=(t.max.z-u.z)*d,c=(t.min.z-u.z)*d),n>c||a>i)||((a>n||n!==n)&&(n=a),(c<i||i!==i)&&(i=c),i<0)?null:this.at(n>=0?n:i,e)}intersectsBox(t){return this.intersectBox(t,Fn)!==null}intersectTriangle(t,e,n,i,o){wr.subVectors(e,t),bo.subVectors(n,t),yr.crossVectors(wr,bo);let r=this.direction.dot(yr),a;if(r>0){if(i)return null;a=1}else if(r<0)a=-1,r=-r;else return null;ai.subVectors(this.origin,t);const c=a*this.direction.dot(bo.crossVectors(ai,bo));if(c<0)return null;const l=a*this.direction.dot(wr.cross(ai));if(l<0||c+l>r)return null;const h=-a*ai.dot(yr);return h<0?null:this.at(h/r,o)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class $t{constructor(t,e,n,i,o,r,a,c,l,h,d,u,f,p,x,g){$t.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,i,o,r,a,c,l,h,d,u,f,p,x,g)}set(t,e,n,i,o,r,a,c,l,h,d,u,f,p,x,g){const m=this.elements;return m[0]=t,m[4]=e,m[8]=n,m[12]=i,m[1]=o,m[5]=r,m[9]=a,m[13]=c,m[2]=l,m[6]=h,m[10]=d,m[14]=u,m[3]=f,m[7]=p,m[11]=x,m[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new $t().fromArray(this.elements)}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){const e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,n=t.elements,i=1/Vi.setFromMatrixColumn(t,0).length(),o=1/Vi.setFromMatrixColumn(t,1).length(),r=1/Vi.setFromMatrixColumn(t,2).length();return e[0]=n[0]*i,e[1]=n[1]*i,e[2]=n[2]*i,e[3]=0,e[4]=n[4]*o,e[5]=n[5]*o,e[6]=n[6]*o,e[7]=0,e[8]=n[8]*r,e[9]=n[9]*r,e[10]=n[10]*r,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,n=t.x,i=t.y,o=t.z,r=Math.cos(n),a=Math.sin(n),c=Math.cos(i),l=Math.sin(i),h=Math.cos(o),d=Math.sin(o);if(t.order==="XYZ"){const u=r*h,f=r*d,p=a*h,x=a*d;e[0]=c*h,e[4]=-c*d,e[8]=l,e[1]=f+p*l,e[5]=u-x*l,e[9]=-a*c,e[2]=x-u*l,e[6]=p+f*l,e[10]=r*c}else if(t.order==="YXZ"){const u=c*h,f=c*d,p=l*h,x=l*d;e[0]=u+x*a,e[4]=p*a-f,e[8]=r*l,e[1]=r*d,e[5]=r*h,e[9]=-a,e[2]=f*a-p,e[6]=x+u*a,e[10]=r*c}else if(t.order==="ZXY"){const u=c*h,f=c*d,p=l*h,x=l*d;e[0]=u-x*a,e[4]=-r*d,e[8]=p+f*a,e[1]=f+p*a,e[5]=r*h,e[9]=x-u*a,e[2]=-r*l,e[6]=a,e[10]=r*c}else if(t.order==="ZYX"){const u=r*h,f=r*d,p=a*h,x=a*d;e[0]=c*h,e[4]=p*l-f,e[8]=u*l+x,e[1]=c*d,e[5]=x*l+u,e[9]=f*l-p,e[2]=-l,e[6]=a*c,e[10]=r*c}else if(t.order==="YZX"){const u=r*c,f=r*l,p=a*c,x=a*l;e[0]=c*h,e[4]=x-u*d,e[8]=p*d+f,e[1]=d,e[5]=r*h,e[9]=-a*h,e[2]=-l*h,e[6]=f*d+p,e[10]=u-x*d}else if(t.order==="XZY"){const u=r*c,f=r*l,p=a*c,x=a*l;e[0]=c*h,e[4]=-d,e[8]=l*h,e[1]=u*d+x,e[5]=r*h,e[9]=f*d-p,e[2]=p*d-f,e[6]=a*h,e[10]=x*d+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Td,t,Ad)}lookAt(t,e,n){const i=this.elements;return dn.subVectors(t,e),dn.lengthSq()===0&&(dn.z=1),dn.normalize(),ci.crossVectors(n,dn),ci.lengthSq()===0&&(Math.abs(n.z)===1?dn.x+=1e-4:dn.z+=1e-4,dn.normalize(),ci.crossVectors(n,dn)),ci.normalize(),Eo.crossVectors(dn,ci),i[0]=ci.x,i[4]=Eo.x,i[8]=dn.x,i[1]=ci.y,i[5]=Eo.y,i[9]=dn.y,i[2]=ci.z,i[6]=Eo.z,i[10]=dn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,i=e.elements,o=this.elements,r=n[0],a=n[4],c=n[8],l=n[12],h=n[1],d=n[5],u=n[9],f=n[13],p=n[2],x=n[6],g=n[10],m=n[14],w=n[3],y=n[7],v=n[11],T=n[15],M=i[0],E=i[4],b=i[8],_=i[12],S=i[1],R=i[5],F=i[9],z=i[13],A=i[2],U=i[6],N=i[10],D=i[14],O=i[3],k=i[7],B=i[11],G=i[15];return o[0]=r*M+a*S+c*A+l*O,o[4]=r*E+a*R+c*U+l*k,o[8]=r*b+a*F+c*N+l*B,o[12]=r*_+a*z+c*D+l*G,o[1]=h*M+d*S+u*A+f*O,o[5]=h*E+d*R+u*U+f*k,o[9]=h*b+d*F+u*N+f*B,o[13]=h*_+d*z+u*D+f*G,o[2]=p*M+x*S+g*A+m*O,o[6]=p*E+x*R+g*U+m*k,o[10]=p*b+x*F+g*N+m*B,o[14]=p*_+x*z+g*D+m*G,o[3]=w*M+y*S+v*A+T*O,o[7]=w*E+y*R+v*U+T*k,o[11]=w*b+y*F+v*N+T*B,o[15]=w*_+y*z+v*D+T*G,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[4],i=t[8],o=t[12],r=t[1],a=t[5],c=t[9],l=t[13],h=t[2],d=t[6],u=t[10],f=t[14],p=t[3],x=t[7],g=t[11],m=t[15];return p*(+o*c*d-i*l*d-o*a*u+n*l*u+i*a*f-n*c*f)+x*(+e*c*f-e*l*u+o*r*u-i*r*f+i*l*h-o*c*h)+g*(+e*l*d-e*a*f-o*r*d+n*r*f+o*a*h-n*l*h)+m*(-i*a*h-e*c*d+e*a*u+i*r*d-n*r*u+n*c*h)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){const i=this.elements;return t.isVector3?(i[12]=t.x,i[13]=t.y,i[14]=t.z):(i[12]=t,i[13]=e,i[14]=n),this}invert(){const t=this.elements,e=t[0],n=t[1],i=t[2],o=t[3],r=t[4],a=t[5],c=t[6],l=t[7],h=t[8],d=t[9],u=t[10],f=t[11],p=t[12],x=t[13],g=t[14],m=t[15],w=d*g*l-x*u*l+x*c*f-a*g*f-d*c*m+a*u*m,y=p*u*l-h*g*l-p*c*f+r*g*f+h*c*m-r*u*m,v=h*x*l-p*d*l+p*a*f-r*x*f-h*a*m+r*d*m,T=p*d*c-h*x*c-p*a*u+r*x*u+h*a*g-r*d*g,M=e*w+n*y+i*v+o*T;if(M===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const E=1/M;return t[0]=w*E,t[1]=(x*u*o-d*g*o-x*i*f+n*g*f+d*i*m-n*u*m)*E,t[2]=(a*g*o-x*c*o+x*i*l-n*g*l-a*i*m+n*c*m)*E,t[3]=(d*c*o-a*u*o-d*i*l+n*u*l+a*i*f-n*c*f)*E,t[4]=y*E,t[5]=(h*g*o-p*u*o+p*i*f-e*g*f-h*i*m+e*u*m)*E,t[6]=(p*c*o-r*g*o-p*i*l+e*g*l+r*i*m-e*c*m)*E,t[7]=(r*u*o-h*c*o+h*i*l-e*u*l-r*i*f+e*c*f)*E,t[8]=v*E,t[9]=(p*d*o-h*x*o-p*n*f+e*x*f+h*n*m-e*d*m)*E,t[10]=(r*x*o-p*a*o+p*n*l-e*x*l-r*n*m+e*a*m)*E,t[11]=(h*a*o-r*d*o-h*n*l+e*d*l+r*n*f-e*a*f)*E,t[12]=T*E,t[13]=(h*x*i-p*d*i+p*n*u-e*x*u-h*n*g+e*d*g)*E,t[14]=(p*a*i-r*x*i-p*n*c+e*x*c+r*n*g-e*a*g)*E,t[15]=(r*d*i-h*a*i+h*n*c-e*d*c-r*n*u+e*a*u)*E,this}scale(t){const e=this.elements,n=t.x,i=t.y,o=t.z;return e[0]*=n,e[4]*=i,e[8]*=o,e[1]*=n,e[5]*=i,e[9]*=o,e[2]*=n,e[6]*=i,e[10]*=o,e[3]*=n,e[7]*=i,e[11]*=o,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],i=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,i))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const n=Math.cos(e),i=Math.sin(e),o=1-n,r=t.x,a=t.y,c=t.z,l=o*r,h=o*a;return this.set(l*r+n,l*a-i*c,l*c+i*a,0,l*a+i*c,h*a+n,h*c-i*r,0,l*c-i*a,h*c+i*r,o*c*c+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,i,o,r){return this.set(1,n,o,0,t,1,r,0,e,i,1,0,0,0,0,1),this}compose(t,e,n){const i=this.elements,o=e._x,r=e._y,a=e._z,c=e._w,l=o+o,h=r+r,d=a+a,u=o*l,f=o*h,p=o*d,x=r*h,g=r*d,m=a*d,w=c*l,y=c*h,v=c*d,T=n.x,M=n.y,E=n.z;return i[0]=(1-(x+m))*T,i[1]=(f+v)*T,i[2]=(p-y)*T,i[3]=0,i[4]=(f-v)*M,i[5]=(1-(u+m))*M,i[6]=(g+w)*M,i[7]=0,i[8]=(p+y)*E,i[9]=(g-w)*E,i[10]=(1-(u+x))*E,i[11]=0,i[12]=t.x,i[13]=t.y,i[14]=t.z,i[15]=1,this}decompose(t,e,n){const i=this.elements;let o=Vi.set(i[0],i[1],i[2]).length();const r=Vi.set(i[4],i[5],i[6]).length(),a=Vi.set(i[8],i[9],i[10]).length();this.determinant()<0&&(o=-o),t.x=i[12],t.y=i[13],t.z=i[14],Tn.copy(this);const l=1/o,h=1/r,d=1/a;return Tn.elements[0]*=l,Tn.elements[1]*=l,Tn.elements[2]*=l,Tn.elements[4]*=h,Tn.elements[5]*=h,Tn.elements[6]*=h,Tn.elements[8]*=d,Tn.elements[9]*=d,Tn.elements[10]*=d,e.setFromRotationMatrix(Tn),n.x=o,n.y=r,n.z=a,this}makePerspective(t,e,n,i,o,r,a=Yn){const c=this.elements,l=2*o/(e-t),h=2*o/(n-i),d=(e+t)/(e-t),u=(n+i)/(n-i);let f,p;if(a===Yn)f=-(r+o)/(r-o),p=-2*r*o/(r-o);else if(a===nr)f=-r/(r-o),p=-r*o/(r-o);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=l,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=h,c[9]=u,c[13]=0,c[2]=0,c[6]=0,c[10]=f,c[14]=p,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,i,o,r,a=Yn){const c=this.elements,l=1/(e-t),h=1/(n-i),d=1/(r-o),u=(e+t)*l,f=(n+i)*h;let p,x;if(a===Yn)p=(r+o)*d,x=-2*d;else if(a===nr)p=o*d,x=-1*d;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=2*l,c[4]=0,c[8]=0,c[12]=-u,c[1]=0,c[5]=2*h,c[9]=0,c[13]=-f,c[2]=0,c[6]=0,c[10]=x,c[14]=-p,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){const e=this.elements,n=t.elements;for(let i=0;i<16;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}}const Vi=new P,Tn=new $t,Td=new P(0,0,0),Ad=new P(1,1,1),ci=new P,Eo=new P,dn=new P,Wc=new $t,Xc=new Ae;class be{constructor(t=0,e=0,n=0,i=be.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=i}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,i=this._order){return this._x=t,this._y=e,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){const i=t.elements,o=i[0],r=i[4],a=i[8],c=i[1],l=i[5],h=i[9],d=i[2],u=i[6],f=i[10];switch(e){case"XYZ":this._y=Math.asin(Ue(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-r,o)):(this._x=Math.atan2(u,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Ue(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-d,o),this._z=0);break;case"ZXY":this._x=Math.asin(Ue(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-r,l)):(this._y=0,this._z=Math.atan2(c,o));break;case"ZYX":this._y=Math.asin(-Ue(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(c,o)):(this._x=0,this._z=Math.atan2(-r,l));break;case"YZX":this._z=Math.asin(Ue(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-d,o)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-Ue(r,-1,1)),Math.abs(r)<.9999999?(this._x=Math.atan2(u,l),this._y=Math.atan2(a,o)):(this._x=Math.atan2(-h,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return Wc.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Wc,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Xc.setFromEuler(this),this.setFromQuaternion(Xc,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}be.DEFAULT_ORDER="XYZ";class Ih{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let Cd=0;const qc=new P,Wi=new Ae,On=new $t,To=new P,zs=new P,Rd=new P,Pd=new Ae,Yc=new P(1,0,0),$c=new P(0,1,0),jc=new P(0,0,1),Zc={type:"added"},Ld={type:"removed"},Xi={type:"childadded",child:null},Mr={type:"childremoved",child:null};class Xe extends Ss{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Cd++}),this.uuid=bs(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Xe.DEFAULT_UP.clone();const t=new P,e=new be,n=new Ae,i=new P(1,1,1);function o(){n.setFromEuler(e,!1)}function r(){e.setFromQuaternion(n,void 0,!1)}e._onChange(o),n._onChange(r),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new $t},normalMatrix:{value:new ue}}),this.matrix=new $t,this.matrixWorld=new $t,this.matrixAutoUpdate=Xe.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Xe.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Ih,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Wi.setFromAxisAngle(t,e),this.quaternion.multiply(Wi),this}rotateOnWorldAxis(t,e){return Wi.setFromAxisAngle(t,e),this.quaternion.premultiply(Wi),this}rotateX(t){return this.rotateOnAxis(Yc,t)}rotateY(t){return this.rotateOnAxis($c,t)}rotateZ(t){return this.rotateOnAxis(jc,t)}translateOnAxis(t,e){return qc.copy(t).applyQuaternion(this.quaternion),this.position.add(qc.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Yc,t)}translateY(t){return this.translateOnAxis($c,t)}translateZ(t){return this.translateOnAxis(jc,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(On.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?To.copy(t):To.set(t,e,n);const i=this.parent;this.updateWorldMatrix(!0,!1),zs.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?On.lookAt(zs,To,this.up):On.lookAt(To,zs,this.up),this.quaternion.setFromRotationMatrix(On),i&&(On.extractRotation(i.matrixWorld),Wi.setFromRotationMatrix(On),this.quaternion.premultiply(Wi.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Zc),Xi.child=t,this.dispatchEvent(Xi),Xi.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Ld),Mr.child=t,this.dispatchEvent(Mr),Mr.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),On.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),On.multiply(t.parent.matrixWorld)),t.applyMatrix4(On),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Zc),Xi.child=t,this.dispatchEvent(Xi),Xi.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,i=this.children.length;n<i;n++){const r=this.children[n].getObjectByProperty(t,e);if(r!==void 0)return r}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);const i=this.children;for(let o=0,r=i.length;o<r;o++)i[o].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(zs,t,Rd),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(zs,Pd,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e){const n=this.parent;if(t===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){const i=this.children;for(let o=0,r=i.length;o<r;o++)i[o].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.visibility=this._visibility,i.active=this._active,i.bounds=this._bounds.map(a=>({boxInitialized:a.boxInitialized,boxMin:a.box.min.toArray(),boxMax:a.box.max.toArray(),sphereInitialized:a.sphereInitialized,sphereRadius:a.sphere.radius,sphereCenter:a.sphere.center.toArray()})),i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.geometryCount=this._geometryCount,i.matricesTexture=this._matricesTexture.toJSON(t),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(i.boundingSphere={center:i.boundingSphere.center.toArray(),radius:i.boundingSphere.radius}),this.boundingBox!==null&&(i.boundingBox={min:i.boundingBox.min.toArray(),max:i.boundingBox.max.toArray()}));function o(a,c){return a[c.uuid]===void 0&&(a[c.uuid]=c.toJSON(t)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=o(t.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const c=a.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){const d=c[l];o(t.shapes,d)}else o(t.shapes,c)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(o(t.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let c=0,l=this.material.length;c<l;c++)a.push(o(t.materials,this.material[c]));i.material=a}else i.material=o(t.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){const c=this.animations[a];i.animations.push(o(t.animations,c))}}if(e){const a=r(t.geometries),c=r(t.materials),l=r(t.textures),h=r(t.images),d=r(t.shapes),u=r(t.skeletons),f=r(t.animations),p=r(t.nodes);a.length>0&&(n.geometries=a),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),f.length>0&&(n.animations=f),p.length>0&&(n.nodes=p)}return n.object=i,n;function r(a){const c=[];for(const l in a){const h=a[l];delete h.metadata,c.push(h)}return c}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){const i=t.children[n];this.add(i.clone())}return this}}Xe.DEFAULT_UP=new P(0,1,0);Xe.DEFAULT_MATRIX_AUTO_UPDATE=!0;Xe.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const An=new P,kn=new P,Sr=new P,Bn=new P,qi=new P,Yi=new P,Kc=new P,br=new P,Er=new P,Tr=new P,Ar=new Ee,Cr=new Ee,Rr=new Ee;class Cn{constructor(t=new P,e=new P,n=new P){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,i){i.subVectors(n,e),An.subVectors(t,e),i.cross(An);const o=i.lengthSq();return o>0?i.multiplyScalar(1/Math.sqrt(o)):i.set(0,0,0)}static getBarycoord(t,e,n,i,o){An.subVectors(i,e),kn.subVectors(n,e),Sr.subVectors(t,e);const r=An.dot(An),a=An.dot(kn),c=An.dot(Sr),l=kn.dot(kn),h=kn.dot(Sr),d=r*l-a*a;if(d===0)return o.set(0,0,0),null;const u=1/d,f=(l*c-a*h)*u,p=(r*h-a*c)*u;return o.set(1-f-p,p,f)}static containsPoint(t,e,n,i){return this.getBarycoord(t,e,n,i,Bn)===null?!1:Bn.x>=0&&Bn.y>=0&&Bn.x+Bn.y<=1}static getInterpolation(t,e,n,i,o,r,a,c){return this.getBarycoord(t,e,n,i,Bn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(o,Bn.x),c.addScaledVector(r,Bn.y),c.addScaledVector(a,Bn.z),c)}static getInterpolatedAttribute(t,e,n,i,o,r){return Ar.setScalar(0),Cr.setScalar(0),Rr.setScalar(0),Ar.fromBufferAttribute(t,e),Cr.fromBufferAttribute(t,n),Rr.fromBufferAttribute(t,i),r.setScalar(0),r.addScaledVector(Ar,o.x),r.addScaledVector(Cr,o.y),r.addScaledVector(Rr,o.z),r}static isFrontFacing(t,e,n,i){return An.subVectors(n,e),kn.subVectors(t,e),An.cross(kn).dot(i)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,i){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[i]),this}setFromAttributeAndIndices(t,e,n,i){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,i),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return An.subVectors(this.c,this.b),kn.subVectors(this.a,this.b),An.cross(kn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return Cn.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return Cn.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,i,o){return Cn.getInterpolation(t,this.a,this.b,this.c,e,n,i,o)}containsPoint(t){return Cn.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return Cn.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const n=this.a,i=this.b,o=this.c;let r,a;qi.subVectors(i,n),Yi.subVectors(o,n),br.subVectors(t,n);const c=qi.dot(br),l=Yi.dot(br);if(c<=0&&l<=0)return e.copy(n);Er.subVectors(t,i);const h=qi.dot(Er),d=Yi.dot(Er);if(h>=0&&d<=h)return e.copy(i);const u=c*d-h*l;if(u<=0&&c>=0&&h<=0)return r=c/(c-h),e.copy(n).addScaledVector(qi,r);Tr.subVectors(t,o);const f=qi.dot(Tr),p=Yi.dot(Tr);if(p>=0&&f<=p)return e.copy(o);const x=f*l-c*p;if(x<=0&&l>=0&&p<=0)return a=l/(l-p),e.copy(n).addScaledVector(Yi,a);const g=h*p-f*d;if(g<=0&&d-h>=0&&f-p>=0)return Kc.subVectors(o,i),a=(d-h)/(d-h+(f-p)),e.copy(i).addScaledVector(Kc,a);const m=1/(g+x+u);return r=x*m,a=u*m,e.copy(n).addScaledVector(qi,r).addScaledVector(Yi,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const zh={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},li={h:0,s:0,l:0},Ao={h:0,s:0,l:0};function Pr(s,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?s+(t-s)*6*e:e<1/2?t:e<2/3?s+(t-s)*6*(2/3-e):s}class Ot{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){const i=t;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=on){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,ve.toWorkingColorSpace(this,e),this}setRGB(t,e,n,i=ve.workingColorSpace){return this.r=t,this.g=e,this.b=n,ve.toWorkingColorSpace(this,i),this}setHSL(t,e,n,i=ve.workingColorSpace){if(t=uc(t,1),e=Ue(e,0,1),n=Ue(n,0,1),e===0)this.r=this.g=this.b=n;else{const o=n<=.5?n*(1+e):n+e-n*e,r=2*n-o;this.r=Pr(r,o,t+1/3),this.g=Pr(r,o,t),this.b=Pr(r,o,t-1/3)}return ve.toWorkingColorSpace(this,i),this}setStyle(t,e=on){function n(o){o!==void 0&&parseFloat(o)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(t)){let o;const r=i[1],a=i[2];switch(r){case"rgb":case"rgba":if(o=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(o[4]),this.setRGB(Math.min(255,parseInt(o[1],10))/255,Math.min(255,parseInt(o[2],10))/255,Math.min(255,parseInt(o[3],10))/255,e);if(o=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(o[4]),this.setRGB(Math.min(100,parseInt(o[1],10))/100,Math.min(100,parseInt(o[2],10))/100,Math.min(100,parseInt(o[3],10))/100,e);break;case"hsl":case"hsla":if(o=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(o[4]),this.setHSL(parseFloat(o[1])/360,parseFloat(o[2])/100,parseFloat(o[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(t)){const o=i[1],r=o.length;if(r===3)return this.setRGB(parseInt(o.charAt(0),16)/15,parseInt(o.charAt(1),16)/15,parseInt(o.charAt(2),16)/15,e);if(r===6)return this.setHex(parseInt(o,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=on){const n=zh[t.toLowerCase()];return n!==void 0?this.setHex(n,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Zn(t.r),this.g=Zn(t.g),this.b=Zn(t.b),this}copyLinearToSRGB(t){return this.r=cs(t.r),this.g=cs(t.g),this.b=cs(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=on){return ve.fromWorkingColorSpace($e.copy(this),t),Math.round(Ue($e.r*255,0,255))*65536+Math.round(Ue($e.g*255,0,255))*256+Math.round(Ue($e.b*255,0,255))}getHexString(t=on){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=ve.workingColorSpace){ve.fromWorkingColorSpace($e.copy(this),e);const n=$e.r,i=$e.g,o=$e.b,r=Math.max(n,i,o),a=Math.min(n,i,o);let c,l;const h=(a+r)/2;if(a===r)c=0,l=0;else{const d=r-a;switch(l=h<=.5?d/(r+a):d/(2-r-a),r){case n:c=(i-o)/d+(i<o?6:0);break;case i:c=(o-n)/d+2;break;case o:c=(n-i)/d+4;break}c/=6}return t.h=c,t.s=l,t.l=h,t}getRGB(t,e=ve.workingColorSpace){return ve.fromWorkingColorSpace($e.copy(this),e),t.r=$e.r,t.g=$e.g,t.b=$e.b,t}getStyle(t=on){ve.fromWorkingColorSpace($e.copy(this),t);const e=$e.r,n=$e.g,i=$e.b;return t!==on?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(t,e,n){return this.getHSL(li),this.setHSL(li.h+t,li.s+e,li.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(li),t.getHSL(Ao);const n=Zs(li.h,Ao.h,e),i=Zs(li.s,Ao.s,e),o=Zs(li.l,Ao.l,e);return this.setHSL(n,i,o),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,n=this.g,i=this.b,o=t.elements;return this.r=o[0]*e+o[3]*n+o[6]*i,this.g=o[1]*e+o[4]*n+o[7]*i,this.b=o[2]*e+o[5]*n+o[8]*i,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const $e=new Ot;Ot.NAMES=zh;let Dd=0;class Es extends Ss{static get type(){return"Material"}get type(){return this.constructor.type}set type(t){}constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Dd++}),this.uuid=bs(),this.name="",this.blending=$n,this.side=Jn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=la,this.blendDst=ha,this.blendEquation=Ci,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ot(0,0,0),this.blendAlpha=0,this.depthFunc=us,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Dc,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Oi,this.stencilZFail=Oi,this.stencilZPass=Oi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const n=t[e];if(n===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}const i=this[e];if(i===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==$n&&(n.blending=this.blending),this.side!==Jn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==la&&(n.blendSrc=this.blendSrc),this.blendDst!==ha&&(n.blendDst=this.blendDst),this.blendEquation!==Ci&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==us&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Dc&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Oi&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Oi&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Oi&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(o){const r=[];for(const a in o){const c=o[a];delete c.metadata,r.push(c)}return r}if(e){const o=i(t.textures),r=i(t.images);o.length>0&&(n.textures=o),r.length>0&&(n.images=r)}return n}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let n=null;if(e!==null){const i=e.length;n=new Array(i);for(let o=0;o!==i;++o)n[o]=e[o].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class dc extends Es{static get type(){return"MeshBasicMaterial"}constructor(t){super(),this.isMeshBasicMaterial=!0,this.color=new Ot(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new be,this.combine=ph,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const qn=Id();function Id(){const s=new ArrayBuffer(4),t=new Float32Array(s),e=new Uint32Array(s),n=new Uint32Array(512),i=new Uint32Array(512);for(let c=0;c<256;++c){const l=c-127;l<-27?(n[c]=0,n[c|256]=32768,i[c]=24,i[c|256]=24):l<-14?(n[c]=1024>>-l-14,n[c|256]=1024>>-l-14|32768,i[c]=-l-1,i[c|256]=-l-1):l<=15?(n[c]=l+15<<10,n[c|256]=l+15<<10|32768,i[c]=13,i[c|256]=13):l<128?(n[c]=31744,n[c|256]=64512,i[c]=24,i[c|256]=24):(n[c]=31744,n[c|256]=64512,i[c]=13,i[c|256]=13)}const o=new Uint32Array(2048),r=new Uint32Array(64),a=new Uint32Array(64);for(let c=1;c<1024;++c){let l=c<<13,h=0;for(;!(l&8388608);)l<<=1,h-=8388608;l&=-8388609,h+=947912704,o[c]=l|h}for(let c=1024;c<2048;++c)o[c]=939524096+(c-1024<<13);for(let c=1;c<31;++c)r[c]=c<<23;r[31]=1199570944,r[32]=2147483648;for(let c=33;c<63;++c)r[c]=2147483648+(c-32<<23);r[63]=3347054592;for(let c=1;c<64;++c)c!==32&&(a[c]=1024);return{floatView:t,uint32View:e,baseTable:n,shiftTable:i,mantissaTable:o,exponentTable:r,offsetTable:a}}function zd(s){Math.abs(s)>65504&&console.warn("THREE.DataUtils.toHalfFloat(): Value out of range."),s=Ue(s,-65504,65504),qn.floatView[0]=s;const t=qn.uint32View[0],e=t>>23&511;return qn.baseTable[e]+((t&8388607)>>qn.shiftTable[e])}function Ud(s){const t=s>>10;return qn.uint32View[0]=qn.mantissaTable[qn.offsetTable[t]+(s&1023)]+qn.exponentTable[t],qn.floatView[0]}const Nd={toHalfFloat:zd,fromHalfFloat:Ud},Le=new P,Co=new Ft;class ge{constructor(t,e,n=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=Ic,this.updateRanges=[],this.gpuType=vn,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let i=0,o=this.itemSize;i<o;i++)this.array[t+i]=e.array[n+i];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)Co.fromBufferAttribute(this,e),Co.applyMatrix3(t),this.setXY(e,Co.x,Co.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)Le.fromBufferAttribute(this,e),Le.applyMatrix3(t),this.setXYZ(e,Le.x,Le.y,Le.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)Le.fromBufferAttribute(this,e),Le.applyMatrix4(t),this.setXYZ(e,Le.x,Le.y,Le.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Le.fromBufferAttribute(this,e),Le.applyNormalMatrix(t),this.setXYZ(e,Le.x,Le.y,Le.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Le.fromBufferAttribute(this,e),Le.transformDirection(t),this.setXYZ(e,Le.x,Le.y,Le.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=ns(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=nn(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=ns(e,this.array)),e}setX(t,e){return this.normalized&&(e=nn(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=ns(e,this.array)),e}setY(t,e){return this.normalized&&(e=nn(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=ns(e,this.array)),e}setZ(t,e){return this.normalized&&(e=nn(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=ns(e,this.array)),e}setW(t,e){return this.normalized&&(e=nn(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=nn(e,this.array),n=nn(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,i){return t*=this.itemSize,this.normalized&&(e=nn(e,this.array),n=nn(n,this.array),i=nn(i,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this}setXYZW(t,e,n,i,o){return t*=this.itemSize,this.normalized&&(e=nn(e,this.array),n=nn(n,this.array),i=nn(i,this.array),o=nn(o,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this.array[t+3]=o,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==Ic&&(t.usage=this.usage),t}}class Uh extends ge{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class Nh extends ge{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class At extends ge{constructor(t,e,n){super(new Float32Array(t),e,n)}}let Fd=0;const wn=new $t,Lr=new Xe,$i=new P,fn=new He,Us=new He,Oe=new P;class re extends Ss{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Fd++}),this.uuid=bs(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Ch(t)?Nh:Uh)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const o=new ue().getNormalMatrix(t);n.applyNormalMatrix(o),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(t),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return wn.makeRotationFromQuaternion(t),this.applyMatrix4(wn),this}rotateX(t){return wn.makeRotationX(t),this.applyMatrix4(wn),this}rotateY(t){return wn.makeRotationY(t),this.applyMatrix4(wn),this}rotateZ(t){return wn.makeRotationZ(t),this.applyMatrix4(wn),this}translate(t,e,n){return wn.makeTranslation(t,e,n),this.applyMatrix4(wn),this}scale(t,e,n){return wn.makeScale(t,e,n),this.applyMatrix4(wn),this}lookAt(t){return Lr.lookAt(t),Lr.updateMatrix(),this.applyMatrix4(Lr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter($i).negate(),this.translate($i.x,$i.y,$i.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const n=[];for(let i=0,o=t.length;i<o;i++){const r=t[i];n.push(r.x,r.y,r.z||0)}this.setAttribute("position",new At(n,3))}else{for(let n=0,i=e.count;n<i;n++){const o=t[n];e.setXYZ(n,o.x,o.y,o.z||0)}t.length>e.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new He);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new P(-1/0,-1/0,-1/0),new P(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,i=e.length;n<i;n++){const o=e[n];fn.setFromBufferAttribute(o),this.morphTargetsRelative?(Oe.addVectors(this.boundingBox.min,fn.min),this.boundingBox.expandByPoint(Oe),Oe.addVectors(this.boundingBox.max,fn.max),this.boundingBox.expandByPoint(Oe)):(this.boundingBox.expandByPoint(fn.min),this.boundingBox.expandByPoint(fn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ce);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new P,1/0);return}if(t){const n=this.boundingSphere.center;if(fn.setFromBufferAttribute(t),e)for(let o=0,r=e.length;o<r;o++){const a=e[o];Us.setFromBufferAttribute(a),this.morphTargetsRelative?(Oe.addVectors(fn.min,Us.min),fn.expandByPoint(Oe),Oe.addVectors(fn.max,Us.max),fn.expandByPoint(Oe)):(fn.expandByPoint(Us.min),fn.expandByPoint(Us.max))}fn.getCenter(n);let i=0;for(let o=0,r=t.count;o<r;o++)Oe.fromBufferAttribute(t,o),i=Math.max(i,n.distanceToSquared(Oe));if(e)for(let o=0,r=e.length;o<r;o++){const a=e[o],c=this.morphTargetsRelative;for(let l=0,h=a.count;l<h;l++)Oe.fromBufferAttribute(a,l),c&&($i.fromBufferAttribute(t,l),Oe.add($i)),i=Math.max(i,n.distanceToSquared(Oe))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=e.position,i=e.normal,o=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new ge(new Float32Array(4*n.count),4));const r=this.getAttribute("tangent"),a=[],c=[];for(let b=0;b<n.count;b++)a[b]=new P,c[b]=new P;const l=new P,h=new P,d=new P,u=new Ft,f=new Ft,p=new Ft,x=new P,g=new P;function m(b,_,S){l.fromBufferAttribute(n,b),h.fromBufferAttribute(n,_),d.fromBufferAttribute(n,S),u.fromBufferAttribute(o,b),f.fromBufferAttribute(o,_),p.fromBufferAttribute(o,S),h.sub(l),d.sub(l),f.sub(u),p.sub(u);const R=1/(f.x*p.y-p.x*f.y);isFinite(R)&&(x.copy(h).multiplyScalar(p.y).addScaledVector(d,-f.y).multiplyScalar(R),g.copy(d).multiplyScalar(f.x).addScaledVector(h,-p.x).multiplyScalar(R),a[b].add(x),a[_].add(x),a[S].add(x),c[b].add(g),c[_].add(g),c[S].add(g))}let w=this.groups;w.length===0&&(w=[{start:0,count:t.count}]);for(let b=0,_=w.length;b<_;++b){const S=w[b],R=S.start,F=S.count;for(let z=R,A=R+F;z<A;z+=3)m(t.getX(z+0),t.getX(z+1),t.getX(z+2))}const y=new P,v=new P,T=new P,M=new P;function E(b){T.fromBufferAttribute(i,b),M.copy(T);const _=a[b];y.copy(_),y.sub(T.multiplyScalar(T.dot(_))).normalize(),v.crossVectors(M,_);const R=v.dot(c[b])<0?-1:1;r.setXYZW(b,y.x,y.y,y.z,R)}for(let b=0,_=w.length;b<_;++b){const S=w[b],R=S.start,F=S.count;for(let z=R,A=R+F;z<A;z+=3)E(t.getX(z+0)),E(t.getX(z+1)),E(t.getX(z+2))}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new ge(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,f=n.count;u<f;u++)n.setXYZ(u,0,0,0);const i=new P,o=new P,r=new P,a=new P,c=new P,l=new P,h=new P,d=new P;if(t)for(let u=0,f=t.count;u<f;u+=3){const p=t.getX(u+0),x=t.getX(u+1),g=t.getX(u+2);i.fromBufferAttribute(e,p),o.fromBufferAttribute(e,x),r.fromBufferAttribute(e,g),h.subVectors(r,o),d.subVectors(i,o),h.cross(d),a.fromBufferAttribute(n,p),c.fromBufferAttribute(n,x),l.fromBufferAttribute(n,g),a.add(h),c.add(h),l.add(h),n.setXYZ(p,a.x,a.y,a.z),n.setXYZ(x,c.x,c.y,c.z),n.setXYZ(g,l.x,l.y,l.z)}else for(let u=0,f=e.count;u<f;u+=3)i.fromBufferAttribute(e,u+0),o.fromBufferAttribute(e,u+1),r.fromBufferAttribute(e,u+2),h.subVectors(r,o),d.subVectors(i,o),h.cross(d),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)Oe.fromBufferAttribute(t,e),Oe.normalize(),t.setXYZ(e,Oe.x,Oe.y,Oe.z)}toNonIndexed(){function t(a,c){const l=a.array,h=a.itemSize,d=a.normalized,u=new l.constructor(c.length*h);let f=0,p=0;for(let x=0,g=c.length;x<g;x++){a.isInterleavedBufferAttribute?f=c[x]*a.data.stride+a.offset:f=c[x]*h;for(let m=0;m<h;m++)u[p++]=l[f++]}return new ge(u,h,d)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new re,n=this.index.array,i=this.attributes;for(const a in i){const c=i[a],l=t(c,n);e.setAttribute(a,l)}const o=this.morphAttributes;for(const a in o){const c=[],l=o[a];for(let h=0,d=l.length;h<d;h++){const u=l[h],f=t(u,n);c.push(f)}e.morphAttributes[a]=c}e.morphTargetsRelative=this.morphTargetsRelative;const r=this.groups;for(let a=0,c=r.length;a<c;a++){const l=r[a];e.addGroup(l.start,l.count,l.materialIndex)}return e}toJSON(){const t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(t[l]=c[l]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const n=this.attributes;for(const c in n){const l=n[c];t.data.attributes[c]=l.toJSON(t.data)}const i={};let o=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],h=[];for(let d=0,u=l.length;d<u;d++){const f=l[d];h.push(f.toJSON(t.data))}h.length>0&&(i[c]=h,o=!0)}o&&(t.data.morphAttributes=i,t.data.morphTargetsRelative=this.morphTargetsRelative);const r=this.groups;r.length>0&&(t.data.groups=JSON.parse(JSON.stringify(r)));const a=this.boundingSphere;return a!==null&&(t.data.boundingSphere={center:a.center.toArray(),radius:a.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const n=t.index;n!==null&&this.setIndex(n.clone(e));const i=t.attributes;for(const l in i){const h=i[l];this.setAttribute(l,h.clone(e))}const o=t.morphAttributes;for(const l in o){const h=[],d=o[l];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(e));this.morphAttributes[l]=h}this.morphTargetsRelative=t.morphTargetsRelative;const r=t.groups;for(let l=0,h=r.length;l<h;l++){const d=r[l];this.addGroup(d.start,d.count,d.materialIndex)}const a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());const c=t.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Jc=new $t,xi=new Dh,Ro=new Ce,Qc=new P,Po=new P,Lo=new P,Do=new P,Dr=new P,Io=new P,tl=new P,zo=new P;class pe extends Xe{constructor(t=new re,e=new dc){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let o=0,r=i.length;o<r;o++){const a=i[o].name||String(o);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=o}}}}getVertexPosition(t,e){const n=this.geometry,i=n.attributes.position,o=n.morphAttributes.position,r=n.morphTargetsRelative;e.fromBufferAttribute(i,t);const a=this.morphTargetInfluences;if(o&&a){Io.set(0,0,0);for(let c=0,l=o.length;c<l;c++){const h=a[c],d=o[c];h!==0&&(Dr.fromBufferAttribute(d,t),r?Io.addScaledVector(Dr,h):Io.addScaledVector(Dr.sub(e),h))}e.add(Io)}return e}raycast(t,e){const n=this.geometry,i=this.material,o=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Ro.copy(n.boundingSphere),Ro.applyMatrix4(o),xi.copy(t.ray).recast(t.near),!(Ro.containsPoint(xi.origin)===!1&&(xi.intersectSphere(Ro,Qc)===null||xi.origin.distanceToSquared(Qc)>(t.far-t.near)**2))&&(Jc.copy(o).invert(),xi.copy(t.ray).applyMatrix4(Jc),!(n.boundingBox!==null&&xi.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,xi)))}_computeIntersections(t,e,n){let i;const o=this.geometry,r=this.material,a=o.index,c=o.attributes.position,l=o.attributes.uv,h=o.attributes.uv1,d=o.attributes.normal,u=o.groups,f=o.drawRange;if(a!==null)if(Array.isArray(r))for(let p=0,x=u.length;p<x;p++){const g=u[p],m=r[g.materialIndex],w=Math.max(g.start,f.start),y=Math.min(a.count,Math.min(g.start+g.count,f.start+f.count));for(let v=w,T=y;v<T;v+=3){const M=a.getX(v),E=a.getX(v+1),b=a.getX(v+2);i=Uo(this,m,t,n,l,h,d,M,E,b),i&&(i.faceIndex=Math.floor(v/3),i.face.materialIndex=g.materialIndex,e.push(i))}}else{const p=Math.max(0,f.start),x=Math.min(a.count,f.start+f.count);for(let g=p,m=x;g<m;g+=3){const w=a.getX(g),y=a.getX(g+1),v=a.getX(g+2);i=Uo(this,r,t,n,l,h,d,w,y,v),i&&(i.faceIndex=Math.floor(g/3),e.push(i))}}else if(c!==void 0)if(Array.isArray(r))for(let p=0,x=u.length;p<x;p++){const g=u[p],m=r[g.materialIndex],w=Math.max(g.start,f.start),y=Math.min(c.count,Math.min(g.start+g.count,f.start+f.count));for(let v=w,T=y;v<T;v+=3){const M=v,E=v+1,b=v+2;i=Uo(this,m,t,n,l,h,d,M,E,b),i&&(i.faceIndex=Math.floor(v/3),i.face.materialIndex=g.materialIndex,e.push(i))}}else{const p=Math.max(0,f.start),x=Math.min(c.count,f.start+f.count);for(let g=p,m=x;g<m;g+=3){const w=g,y=g+1,v=g+2;i=Uo(this,r,t,n,l,h,d,w,y,v),i&&(i.faceIndex=Math.floor(g/3),e.push(i))}}}}function Od(s,t,e,n,i,o,r,a){let c;if(t.side===Je?c=n.intersectTriangle(r,o,i,!0,a):c=n.intersectTriangle(i,o,r,t.side===Jn,a),c===null)return null;zo.copy(a),zo.applyMatrix4(s.matrixWorld);const l=e.ray.origin.distanceTo(zo);return l<e.near||l>e.far?null:{distance:l,point:zo.clone(),object:s}}function Uo(s,t,e,n,i,o,r,a,c,l){s.getVertexPosition(a,Po),s.getVertexPosition(c,Lo),s.getVertexPosition(l,Do);const h=Od(s,t,e,n,Po,Lo,Do,tl);if(h){const d=new P;Cn.getBarycoord(tl,Po,Lo,Do,d),i&&(h.uv=Cn.getInterpolatedAttribute(i,a,c,l,d,new Ft)),o&&(h.uv1=Cn.getInterpolatedAttribute(o,a,c,l,d,new Ft)),r&&(h.normal=Cn.getInterpolatedAttribute(r,a,c,l,d,new P),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const u={a,b:c,c:l,normal:new P,materialIndex:0};Cn.getNormal(Po,Lo,Do,u.normal),h.face=u,h.barycoord=d}return h}class Xt extends re{constructor(t=1,e=1,n=1,i=1,o=1,r=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:i,heightSegments:o,depthSegments:r};const a=this;i=Math.floor(i),o=Math.floor(o),r=Math.floor(r);const c=[],l=[],h=[],d=[];let u=0,f=0;p("z","y","x",-1,-1,n,e,t,r,o,0),p("z","y","x",1,-1,n,e,-t,r,o,1),p("x","z","y",1,1,t,n,e,i,r,2),p("x","z","y",1,-1,t,n,-e,i,r,3),p("x","y","z",1,-1,t,e,n,i,o,4),p("x","y","z",-1,-1,t,e,-n,i,o,5),this.setIndex(c),this.setAttribute("position",new At(l,3)),this.setAttribute("normal",new At(h,3)),this.setAttribute("uv",new At(d,2));function p(x,g,m,w,y,v,T,M,E,b,_){const S=v/E,R=T/b,F=v/2,z=T/2,A=M/2,U=E+1,N=b+1;let D=0,O=0;const k=new P;for(let B=0;B<N;B++){const G=B*R-z;for(let K=0;K<U;K++){const nt=K*S-F;k[x]=nt*w,k[g]=G*y,k[m]=A,l.push(k.x,k.y,k.z),k[x]=0,k[g]=0,k[m]=M>0?1:-1,h.push(k.x,k.y,k.z),d.push(K/E),d.push(1-B/b),D+=1}}for(let B=0;B<b;B++)for(let G=0;G<E;G++){const K=u+G+U*B,nt=u+G+U*(B+1),q=u+(G+1)+U*(B+1),tt=u+(G+1)+U*B;c.push(K,nt,tt),c.push(nt,q,tt),O+=6}a.addGroup(f,O,_),f+=O,u+=D}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Xt(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function vs(s){const t={};for(const e in s){t[e]={};for(const n in s[e]){const i=s[e][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=i.clone():Array.isArray(i)?t[e][n]=i.slice():t[e][n]=i}}return t}function sn(s){const t={};for(let e=0;e<s.length;e++){const n=vs(s[e]);for(const i in n)t[i]=n[i]}return t}function kd(s){const t=[];for(let e=0;e<s.length;e++)t.push(s[e].clone());return t}function Fh(s){const t=s.getRenderTarget();return t===null?s.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:ve.workingColorSpace}const Bd={clone:vs,merge:sn};var Hd=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Gd=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Ie extends Es{static get type(){return"ShaderMaterial"}constructor(t){super(),this.isShaderMaterial=!0,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Hd,this.fragmentShader=Gd,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=vs(t.uniforms),this.uniformsGroups=kd(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const i in this.uniforms){const r=this.uniforms[i].value;r&&r.isTexture?e.uniforms[i]={type:"t",value:r.toJSON(t).uuid}:r&&r.isColor?e.uniforms[i]={type:"c",value:r.getHex()}:r&&r.isVector2?e.uniforms[i]={type:"v2",value:r.toArray()}:r&&r.isVector3?e.uniforms[i]={type:"v3",value:r.toArray()}:r&&r.isVector4?e.uniforms[i]={type:"v4",value:r.toArray()}:r&&r.isMatrix3?e.uniforms[i]={type:"m3",value:r.toArray()}:r&&r.isMatrix4?e.uniforms[i]={type:"m4",value:r.toArray()}:e.uniforms[i]={value:r}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}}class Oh extends Xe{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new $t,this.projectionMatrix=new $t,this.projectionMatrixInverse=new $t,this.coordinateSystem=Yn}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const hi=new P,el=new Ft,nl=new Ft;class gn extends Oh{constructor(t=50,e=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=so*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(js*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return so*2*Math.atan(Math.tan(js*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){hi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(hi.x,hi.y).multiplyScalar(-t/hi.z),hi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(hi.x,hi.y).multiplyScalar(-t/hi.z)}getViewSize(t,e){return this.getViewBounds(t,el,nl),e.subVectors(nl,el)}setViewOffset(t,e,n,i,o,r){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=o,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(js*.5*this.fov)/this.zoom,n=2*e,i=this.aspect*n,o=-.5*i;const r=this.view;if(this.view!==null&&this.view.enabled){const c=r.fullWidth,l=r.fullHeight;o+=r.offsetX*i/c,e-=r.offsetY*n/l,i*=r.width/c,n*=r.height/l}const a=this.filmOffset;a!==0&&(o+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(o,o+i,e,e-n,t,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const ji=-90,Zi=1;class Vd extends Xe{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new gn(ji,Zi,t,e);i.layers=this.layers,this.add(i);const o=new gn(ji,Zi,t,e);o.layers=this.layers,this.add(o);const r=new gn(ji,Zi,t,e);r.layers=this.layers,this.add(r);const a=new gn(ji,Zi,t,e);a.layers=this.layers,this.add(a);const c=new gn(ji,Zi,t,e);c.layers=this.layers,this.add(c);const l=new gn(ji,Zi,t,e);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[n,i,o,r,a,c]=e;for(const l of e)this.remove(l);if(t===Yn)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),o.up.set(0,0,-1),o.lookAt(0,1,0),r.up.set(0,0,1),r.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(t===nr)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),o.up.set(0,0,1),o.lookAt(0,1,0),r.up.set(0,0,-1),r.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const l of e)this.add(l),l.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[o,r,a,c,l,h]=this.children,d=t.getRenderTarget(),u=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),p=t.xr.enabled;t.xr.enabled=!1;const x=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,t.setRenderTarget(n,0,i),t.render(e,o),t.setRenderTarget(n,1,i),t.render(e,r),t.setRenderTarget(n,2,i),t.render(e,a),t.setRenderTarget(n,3,i),t.render(e,c),t.setRenderTarget(n,4,i),t.render(e,l),n.texture.generateMipmaps=x,t.setRenderTarget(n,5,i),t.render(e,h),t.setRenderTarget(d,u,f),t.xr.enabled=p,n.texture.needsPMREMUpdate=!0}}class kh extends Qe{constructor(t,e,n,i,o,r,a,c,l,h){t=t!==void 0?t:[],e=e!==void 0?e:ds,super(t,e,n,i,o,r,a,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class Wd extends ln{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const n={width:t,height:t,depth:1},i=[n,n,n,n,n,n];this.texture=new kh(i,e.mapping,e.wrapS,e.wrapT,e.magFilter,e.minFilter,e.format,e.type,e.anisotropy,e.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=e.generateMipmaps!==void 0?e.generateMipmaps:!1,this.texture.minFilter=e.minFilter!==void 0?e.minFilter:xe}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},i=new Xt(5,5,5),o=new Ie({name:"CubemapFromEquirect",uniforms:vs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Je,blending:pi});o.uniforms.tEquirect.value=e;const r=new pe(i,o),a=e.minFilter;return e.minFilter===fi&&(e.minFilter=xe),new Vd(1,10,this).update(t,r),e.minFilter=a,r.geometry.dispose(),r.material.dispose(),this}clear(t,e,n,i){const o=t.getRenderTarget();for(let r=0;r<6;r++)t.setRenderTarget(this,r),t.clear(e,n,i);t.setRenderTarget(o)}}const Ir=new P,Xd=new P,qd=new ue;class Ti{constructor(t=new P(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,i){return this.normal.set(t,e,n),this.constant=i,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){const i=Ir.subVectors(n,e).cross(Xd.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(i,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const n=t.delta(Ir),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const o=-(t.start.dot(this.normal)+this.constant)/i;return o<0||o>1?null:e.copy(t.start).addScaledVector(n,o)}intersectsLine(t){const e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const n=e||qd.getNormalMatrix(t),i=this.coplanarPoint(Ir).applyMatrix4(t),o=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(o),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const _i=new Ce,No=new P;class xs{constructor(t=new Ti,e=new Ti,n=new Ti,i=new Ti,o=new Ti,r=new Ti){this.planes=[t,e,n,i,o,r]}set(t,e,n,i,o,r){const a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(i),a[4].copy(o),a[5].copy(r),this}copy(t){const e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=Yn){const n=this.planes,i=t.elements,o=i[0],r=i[1],a=i[2],c=i[3],l=i[4],h=i[5],d=i[6],u=i[7],f=i[8],p=i[9],x=i[10],g=i[11],m=i[12],w=i[13],y=i[14],v=i[15];if(n[0].setComponents(c-o,u-l,g-f,v-m).normalize(),n[1].setComponents(c+o,u+l,g+f,v+m).normalize(),n[2].setComponents(c+r,u+h,g+p,v+w).normalize(),n[3].setComponents(c-r,u-h,g-p,v-w).normalize(),n[4].setComponents(c-a,u-d,g-x,v-y).normalize(),e===Yn)n[5].setComponents(c+a,u+d,g+x,v+y).normalize();else if(e===nr)n[5].setComponents(a,d,x,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),_i.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),_i.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(_i)}intersectsSprite(t){return _i.center.set(0,0,0),_i.radius=.7071067811865476,_i.applyMatrix4(t.matrixWorld),this.intersectsSphere(_i)}intersectsSphere(t){const e=this.planes,n=t.center,i=-t.radius;for(let o=0;o<6;o++)if(e[o].distanceToPoint(n)<i)return!1;return!0}intersectsBox(t){const e=this.planes;for(let n=0;n<6;n++){const i=e[n];if(No.x=i.normal.x>0?t.max.x:t.min.x,No.y=i.normal.y>0?t.max.y:t.min.y,No.z=i.normal.z>0?t.max.z:t.min.z,i.distanceToPoint(No)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function Bh(){let s=null,t=!1,e=null,n=null;function i(o,r){e(o,r),n=s.requestAnimationFrame(i)}return{start:function(){t!==!0&&e!==null&&(n=s.requestAnimationFrame(i),t=!0)},stop:function(){s.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(o){e=o},setContext:function(o){s=o}}}function Yd(s){const t=new WeakMap;function e(a,c){const l=a.array,h=a.usage,d=l.byteLength,u=s.createBuffer();s.bindBuffer(c,u),s.bufferData(c,l,h),a.onUploadCallback();let f;if(l instanceof Float32Array)f=s.FLOAT;else if(l instanceof Uint16Array)a.isFloat16BufferAttribute?f=s.HALF_FLOAT:f=s.UNSIGNED_SHORT;else if(l instanceof Int16Array)f=s.SHORT;else if(l instanceof Uint32Array)f=s.UNSIGNED_INT;else if(l instanceof Int32Array)f=s.INT;else if(l instanceof Int8Array)f=s.BYTE;else if(l instanceof Uint8Array)f=s.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)f=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:u,type:f,bytesPerElement:l.BYTES_PER_ELEMENT,version:a.version,size:d}}function n(a,c,l){const h=c.array,d=c.updateRanges;if(s.bindBuffer(l,a),d.length===0)s.bufferSubData(l,0,h);else{d.sort((f,p)=>f.start-p.start);let u=0;for(let f=1;f<d.length;f++){const p=d[u],x=d[f];x.start<=p.start+p.count+1?p.count=Math.max(p.count,x.start+x.count-p.start):(++u,d[u]=x)}d.length=u+1;for(let f=0,p=d.length;f<p;f++){const x=d[f];s.bufferSubData(l,x.start*h.BYTES_PER_ELEMENT,h,x.start,x.count)}c.clearUpdateRanges()}c.onUploadCallback()}function i(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function o(a){a.isInterleavedBufferAttribute&&(a=a.data);const c=t.get(a);c&&(s.deleteBuffer(c.buffer),t.delete(a))}function r(a,c){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const l=t.get(a);if(l===void 0)t.set(a,e(a,c));else if(l.version<a.version){if(l.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,a,c),l.version=a.version}}return{get:i,remove:o,update:r}}class ti extends re{constructor(t=1,e=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:i};const o=t/2,r=e/2,a=Math.floor(n),c=Math.floor(i),l=a+1,h=c+1,d=t/a,u=e/c,f=[],p=[],x=[],g=[];for(let m=0;m<h;m++){const w=m*u-r;for(let y=0;y<l;y++){const v=y*d-o;p.push(v,-w,0),x.push(0,0,1),g.push(y/a),g.push(1-m/c)}}for(let m=0;m<c;m++)for(let w=0;w<a;w++){const y=w+l*m,v=w+l*(m+1),T=w+1+l*(m+1),M=w+1+l*m;f.push(y,v,M),f.push(v,T,M)}this.setIndex(f),this.setAttribute("position",new At(p,3)),this.setAttribute("normal",new At(x,3)),this.setAttribute("uv",new At(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ti(t.width,t.height,t.widthSegments,t.heightSegments)}}var $d=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,jd=`#ifdef USE_ALPHAHASH
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
#endif`,Zd=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Kd=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Jd=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Qd=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,tf=`#ifdef USE_AOMAP
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
#endif`,ef=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,nf=`#ifdef USE_BATCHING
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
#endif`,sf=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,of=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,rf=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,af=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,cf=`#ifdef USE_IRIDESCENCE
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
#endif`,lf=`#ifdef USE_BUMPMAP
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
#endif`,hf=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,uf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,df=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,ff=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,pf=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,mf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,gf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,vf=`#if defined( USE_COLOR_ALPHA )
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
#endif`,xf=`#define PI 3.141592653589793
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
} // validated`,_f=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,wf=`vec3 transformedNormal = objectNormal;
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
#endif`,yf=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Mf=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Sf=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,bf=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Ef="gl_FragColor = linearToOutputTexel( gl_FragColor );",Tf=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Af=`#ifdef USE_ENVMAP
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
#endif`,Cf=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Rf=`#ifdef USE_ENVMAP
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
#endif`,Pf=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Lf=`#ifdef USE_ENVMAP
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
#endif`,Df=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,If=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,zf=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Uf=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Nf=`#ifdef USE_GRADIENTMAP
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
}`,Ff=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Of=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,kf=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Bf=`uniform bool receiveShadow;
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
#endif`,Hf=`#ifdef USE_ENVMAP
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
#endif`,Gf=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Vf=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Wf=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Xf=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,qf=`PhysicalMaterial material;
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
#endif`,Yf=`struct PhysicalMaterial {
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
}`,$f=`
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
#endif`,jf=`#if defined( RE_IndirectDiffuse )
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
#endif`,Zf=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Kf=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Jf=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Qf=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,t0=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,e0=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,n0=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,i0=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,s0=`#if defined( USE_POINTS_UV )
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
#endif`,o0=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,r0=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,a0=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,c0=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,l0=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,h0=`#ifdef USE_MORPHTARGETS
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
#endif`,u0=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,d0=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,f0=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,p0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,m0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,g0=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,v0=`#ifdef USE_NORMALMAP
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
#endif`,x0=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,_0=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,w0=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,y0=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,M0=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,S0=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,b0=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,E0=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,T0=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,A0=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,C0=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,R0=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,P0=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,L0=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,D0=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,I0=`float getShadowMask() {
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
}`,z0=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,U0=`#ifdef USE_SKINNING
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
#endif`,N0=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,F0=`#ifdef USE_SKINNING
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
#endif`,O0=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,k0=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,B0=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,H0=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,G0=`#ifdef USE_TRANSMISSION
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
#endif`,V0=`#ifdef USE_TRANSMISSION
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
#endif`,W0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,X0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,q0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Y0=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const $0=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,j0=`uniform sampler2D t2D;
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
}`,Z0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,K0=`#ifdef ENVMAP_TYPE_CUBE
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
}`,J0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Q0=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,tp=`#include <common>
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
}`,ep=`#if DEPTH_PACKING == 3200
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
}`,np=`#define DISTANCE
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
}`,ip=`#define DISTANCE
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
}`,sp=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,op=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,rp=`uniform float scale;
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
}`,ap=`uniform vec3 diffuse;
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
}`,cp=`#include <common>
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
}`,lp=`uniform vec3 diffuse;
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
}`,hp=`#define LAMBERT
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
}`,up=`#define LAMBERT
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
}`,dp=`#define MATCAP
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
}`,fp=`#define MATCAP
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
}`,pp=`#define NORMAL
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
}`,mp=`#define NORMAL
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
}`,gp=`#define PHONG
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
}`,vp=`#define PHONG
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
}`,xp=`#define STANDARD
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
}`,_p=`#define STANDARD
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
}`,wp=`#define TOON
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
}`,yp=`#define TOON
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
}`,Mp=`uniform float size;
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
}`,Sp=`uniform vec3 diffuse;
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
}`,bp=`#include <common>
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
}`,Ep=`uniform vec3 color;
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
}`,Tp=`uniform float rotation;
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
}`,Ap=`uniform vec3 diffuse;
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
}`,ce={alphahash_fragment:$d,alphahash_pars_fragment:jd,alphamap_fragment:Zd,alphamap_pars_fragment:Kd,alphatest_fragment:Jd,alphatest_pars_fragment:Qd,aomap_fragment:tf,aomap_pars_fragment:ef,batching_pars_vertex:nf,batching_vertex:sf,begin_vertex:of,beginnormal_vertex:rf,bsdfs:af,iridescence_fragment:cf,bumpmap_pars_fragment:lf,clipping_planes_fragment:hf,clipping_planes_pars_fragment:uf,clipping_planes_pars_vertex:df,clipping_planes_vertex:ff,color_fragment:pf,color_pars_fragment:mf,color_pars_vertex:gf,color_vertex:vf,common:xf,cube_uv_reflection_fragment:_f,defaultnormal_vertex:wf,displacementmap_pars_vertex:yf,displacementmap_vertex:Mf,emissivemap_fragment:Sf,emissivemap_pars_fragment:bf,colorspace_fragment:Ef,colorspace_pars_fragment:Tf,envmap_fragment:Af,envmap_common_pars_fragment:Cf,envmap_pars_fragment:Rf,envmap_pars_vertex:Pf,envmap_physical_pars_fragment:Hf,envmap_vertex:Lf,fog_vertex:Df,fog_pars_vertex:If,fog_fragment:zf,fog_pars_fragment:Uf,gradientmap_pars_fragment:Nf,lightmap_pars_fragment:Ff,lights_lambert_fragment:Of,lights_lambert_pars_fragment:kf,lights_pars_begin:Bf,lights_toon_fragment:Gf,lights_toon_pars_fragment:Vf,lights_phong_fragment:Wf,lights_phong_pars_fragment:Xf,lights_physical_fragment:qf,lights_physical_pars_fragment:Yf,lights_fragment_begin:$f,lights_fragment_maps:jf,lights_fragment_end:Zf,logdepthbuf_fragment:Kf,logdepthbuf_pars_fragment:Jf,logdepthbuf_pars_vertex:Qf,logdepthbuf_vertex:t0,map_fragment:e0,map_pars_fragment:n0,map_particle_fragment:i0,map_particle_pars_fragment:s0,metalnessmap_fragment:o0,metalnessmap_pars_fragment:r0,morphinstance_vertex:a0,morphcolor_vertex:c0,morphnormal_vertex:l0,morphtarget_pars_vertex:h0,morphtarget_vertex:u0,normal_fragment_begin:d0,normal_fragment_maps:f0,normal_pars_fragment:p0,normal_pars_vertex:m0,normal_vertex:g0,normalmap_pars_fragment:v0,clearcoat_normal_fragment_begin:x0,clearcoat_normal_fragment_maps:_0,clearcoat_pars_fragment:w0,iridescence_pars_fragment:y0,opaque_fragment:M0,packing:S0,premultiplied_alpha_fragment:b0,project_vertex:E0,dithering_fragment:T0,dithering_pars_fragment:A0,roughnessmap_fragment:C0,roughnessmap_pars_fragment:R0,shadowmap_pars_fragment:P0,shadowmap_pars_vertex:L0,shadowmap_vertex:D0,shadowmask_pars_fragment:I0,skinbase_vertex:z0,skinning_pars_vertex:U0,skinning_vertex:N0,skinnormal_vertex:F0,specularmap_fragment:O0,specularmap_pars_fragment:k0,tonemapping_fragment:B0,tonemapping_pars_fragment:H0,transmission_fragment:G0,transmission_pars_fragment:V0,uv_pars_fragment:W0,uv_pars_vertex:X0,uv_vertex:q0,worldpos_vertex:Y0,background_vert:$0,background_frag:j0,backgroundCube_vert:Z0,backgroundCube_frag:K0,cube_vert:J0,cube_frag:Q0,depth_vert:tp,depth_frag:ep,distanceRGBA_vert:np,distanceRGBA_frag:ip,equirect_vert:sp,equirect_frag:op,linedashed_vert:rp,linedashed_frag:ap,meshbasic_vert:cp,meshbasic_frag:lp,meshlambert_vert:hp,meshlambert_frag:up,meshmatcap_vert:dp,meshmatcap_frag:fp,meshnormal_vert:pp,meshnormal_frag:mp,meshphong_vert:gp,meshphong_frag:vp,meshphysical_vert:xp,meshphysical_frag:_p,meshtoon_vert:wp,meshtoon_frag:yp,points_vert:Mp,points_frag:Sp,shadow_vert:bp,shadow_frag:Ep,sprite_vert:Tp,sprite_frag:Ap},It={common:{diffuse:{value:new Ot(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new ue},alphaMap:{value:null},alphaMapTransform:{value:new ue},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new ue}},envmap:{envMap:{value:null},envMapRotation:{value:new ue},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new ue}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new ue}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new ue},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new ue},normalScale:{value:new Ft(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new ue},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new ue}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new ue}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new ue}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ot(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ot(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new ue},alphaTest:{value:0},uvTransform:{value:new ue}},sprite:{diffuse:{value:new Ot(16777215)},opacity:{value:1},center:{value:new Ft(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new ue},alphaMap:{value:null},alphaMapTransform:{value:new ue},alphaTest:{value:0}}},Dn={basic:{uniforms:sn([It.common,It.specularmap,It.envmap,It.aomap,It.lightmap,It.fog]),vertexShader:ce.meshbasic_vert,fragmentShader:ce.meshbasic_frag},lambert:{uniforms:sn([It.common,It.specularmap,It.envmap,It.aomap,It.lightmap,It.emissivemap,It.bumpmap,It.normalmap,It.displacementmap,It.fog,It.lights,{emissive:{value:new Ot(0)}}]),vertexShader:ce.meshlambert_vert,fragmentShader:ce.meshlambert_frag},phong:{uniforms:sn([It.common,It.specularmap,It.envmap,It.aomap,It.lightmap,It.emissivemap,It.bumpmap,It.normalmap,It.displacementmap,It.fog,It.lights,{emissive:{value:new Ot(0)},specular:{value:new Ot(1118481)},shininess:{value:30}}]),vertexShader:ce.meshphong_vert,fragmentShader:ce.meshphong_frag},standard:{uniforms:sn([It.common,It.envmap,It.aomap,It.lightmap,It.emissivemap,It.bumpmap,It.normalmap,It.displacementmap,It.roughnessmap,It.metalnessmap,It.fog,It.lights,{emissive:{value:new Ot(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:ce.meshphysical_vert,fragmentShader:ce.meshphysical_frag},toon:{uniforms:sn([It.common,It.aomap,It.lightmap,It.emissivemap,It.bumpmap,It.normalmap,It.displacementmap,It.gradientmap,It.fog,It.lights,{emissive:{value:new Ot(0)}}]),vertexShader:ce.meshtoon_vert,fragmentShader:ce.meshtoon_frag},matcap:{uniforms:sn([It.common,It.bumpmap,It.normalmap,It.displacementmap,It.fog,{matcap:{value:null}}]),vertexShader:ce.meshmatcap_vert,fragmentShader:ce.meshmatcap_frag},points:{uniforms:sn([It.points,It.fog]),vertexShader:ce.points_vert,fragmentShader:ce.points_frag},dashed:{uniforms:sn([It.common,It.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:ce.linedashed_vert,fragmentShader:ce.linedashed_frag},depth:{uniforms:sn([It.common,It.displacementmap]),vertexShader:ce.depth_vert,fragmentShader:ce.depth_frag},normal:{uniforms:sn([It.common,It.bumpmap,It.normalmap,It.displacementmap,{opacity:{value:1}}]),vertexShader:ce.meshnormal_vert,fragmentShader:ce.meshnormal_frag},sprite:{uniforms:sn([It.sprite,It.fog]),vertexShader:ce.sprite_vert,fragmentShader:ce.sprite_frag},background:{uniforms:{uvTransform:{value:new ue},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:ce.background_vert,fragmentShader:ce.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new ue}},vertexShader:ce.backgroundCube_vert,fragmentShader:ce.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:ce.cube_vert,fragmentShader:ce.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:ce.equirect_vert,fragmentShader:ce.equirect_frag},distanceRGBA:{uniforms:sn([It.common,It.displacementmap,{referencePosition:{value:new P},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:ce.distanceRGBA_vert,fragmentShader:ce.distanceRGBA_frag},shadow:{uniforms:sn([It.lights,It.fog,{color:{value:new Ot(0)},opacity:{value:1}}]),vertexShader:ce.shadow_vert,fragmentShader:ce.shadow_frag}};Dn.physical={uniforms:sn([Dn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new ue},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new ue},clearcoatNormalScale:{value:new Ft(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new ue},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new ue},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new ue},sheen:{value:0},sheenColor:{value:new Ot(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new ue},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new ue},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new ue},transmissionSamplerSize:{value:new Ft},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new ue},attenuationDistance:{value:0},attenuationColor:{value:new Ot(0)},specularColor:{value:new Ot(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new ue},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new ue},anisotropyVector:{value:new Ft},anisotropyMap:{value:null},anisotropyMapTransform:{value:new ue}}]),vertexShader:ce.meshphysical_vert,fragmentShader:ce.meshphysical_frag};const Fo={r:0,b:0,g:0},wi=new be,Cp=new $t;function Rp(s,t,e,n,i,o,r){const a=new Ot(0);let c=o===!0?0:1,l,h,d=null,u=0,f=null;function p(w){let y=w.isScene===!0?w.background:null;return y&&y.isTexture&&(y=(w.backgroundBlurriness>0?e:t).get(y)),y}function x(w){let y=!1;const v=p(w);v===null?m(a,c):v&&v.isColor&&(m(v,1),y=!0);const T=s.xr.getEnvironmentBlendMode();T==="additive"?n.buffers.color.setClear(0,0,0,1,r):T==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,r),(s.autoClear||y)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function g(w,y){const v=p(y);v&&(v.isCubeTexture||v.mapping===rr)?(h===void 0&&(h=new pe(new Xt(1,1,1),new Ie({name:"BackgroundCubeMaterial",uniforms:vs(Dn.backgroundCube.uniforms),vertexShader:Dn.backgroundCube.vertexShader,fragmentShader:Dn.backgroundCube.fragmentShader,side:Je,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(T,M,E){this.matrixWorld.copyPosition(E.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(h)),wi.copy(y.backgroundRotation),wi.x*=-1,wi.y*=-1,wi.z*=-1,v.isCubeTexture&&v.isRenderTargetTexture===!1&&(wi.y*=-1,wi.z*=-1),h.material.uniforms.envMap.value=v,h.material.uniforms.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=y.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(Cp.makeRotationFromEuler(wi)),h.material.toneMapped=ve.getTransfer(v.colorSpace)!==_e,(d!==v||u!==v.version||f!==s.toneMapping)&&(h.material.needsUpdate=!0,d=v,u=v.version,f=s.toneMapping),h.layers.enableAll(),w.unshift(h,h.geometry,h.material,0,0,null)):v&&v.isTexture&&(l===void 0&&(l=new pe(new ti(2,2),new Ie({name:"BackgroundMaterial",uniforms:vs(Dn.background.uniforms),vertexShader:Dn.background.vertexShader,fragmentShader:Dn.background.fragmentShader,side:Jn,depthTest:!1,depthWrite:!1,fog:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l)),l.material.uniforms.t2D.value=v,l.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,l.material.toneMapped=ve.getTransfer(v.colorSpace)!==_e,v.matrixAutoUpdate===!0&&v.updateMatrix(),l.material.uniforms.uvTransform.value.copy(v.matrix),(d!==v||u!==v.version||f!==s.toneMapping)&&(l.material.needsUpdate=!0,d=v,u=v.version,f=s.toneMapping),l.layers.enableAll(),w.unshift(l,l.geometry,l.material,0,0,null))}function m(w,y){w.getRGB(Fo,Fh(s)),n.buffers.color.setClear(Fo.r,Fo.g,Fo.b,y,r)}return{getClearColor:function(){return a},setClearColor:function(w,y=1){a.set(w),c=y,m(a,c)},getClearAlpha:function(){return c},setClearAlpha:function(w){c=w,m(a,c)},render:x,addToRenderList:g}}function Pp(s,t){const e=s.getParameter(s.MAX_VERTEX_ATTRIBS),n={},i=u(null);let o=i,r=!1;function a(S,R,F,z,A){let U=!1;const N=d(z,F,R);o!==N&&(o=N,l(o.object)),U=f(S,z,F,A),U&&p(S,z,F,A),A!==null&&t.update(A,s.ELEMENT_ARRAY_BUFFER),(U||r)&&(r=!1,v(S,R,F,z),A!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,t.get(A).buffer))}function c(){return s.createVertexArray()}function l(S){return s.bindVertexArray(S)}function h(S){return s.deleteVertexArray(S)}function d(S,R,F){const z=F.wireframe===!0;let A=n[S.id];A===void 0&&(A={},n[S.id]=A);let U=A[R.id];U===void 0&&(U={},A[R.id]=U);let N=U[z];return N===void 0&&(N=u(c()),U[z]=N),N}function u(S){const R=[],F=[],z=[];for(let A=0;A<e;A++)R[A]=0,F[A]=0,z[A]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:R,enabledAttributes:F,attributeDivisors:z,object:S,attributes:{},index:null}}function f(S,R,F,z){const A=o.attributes,U=R.attributes;let N=0;const D=F.getAttributes();for(const O in D)if(D[O].location>=0){const B=A[O];let G=U[O];if(G===void 0&&(O==="instanceMatrix"&&S.instanceMatrix&&(G=S.instanceMatrix),O==="instanceColor"&&S.instanceColor&&(G=S.instanceColor)),B===void 0||B.attribute!==G||G&&B.data!==G.data)return!0;N++}return o.attributesNum!==N||o.index!==z}function p(S,R,F,z){const A={},U=R.attributes;let N=0;const D=F.getAttributes();for(const O in D)if(D[O].location>=0){let B=U[O];B===void 0&&(O==="instanceMatrix"&&S.instanceMatrix&&(B=S.instanceMatrix),O==="instanceColor"&&S.instanceColor&&(B=S.instanceColor));const G={};G.attribute=B,B&&B.data&&(G.data=B.data),A[O]=G,N++}o.attributes=A,o.attributesNum=N,o.index=z}function x(){const S=o.newAttributes;for(let R=0,F=S.length;R<F;R++)S[R]=0}function g(S){m(S,0)}function m(S,R){const F=o.newAttributes,z=o.enabledAttributes,A=o.attributeDivisors;F[S]=1,z[S]===0&&(s.enableVertexAttribArray(S),z[S]=1),A[S]!==R&&(s.vertexAttribDivisor(S,R),A[S]=R)}function w(){const S=o.newAttributes,R=o.enabledAttributes;for(let F=0,z=R.length;F<z;F++)R[F]!==S[F]&&(s.disableVertexAttribArray(F),R[F]=0)}function y(S,R,F,z,A,U,N){N===!0?s.vertexAttribIPointer(S,R,F,A,U):s.vertexAttribPointer(S,R,F,z,A,U)}function v(S,R,F,z){x();const A=z.attributes,U=F.getAttributes(),N=R.defaultAttributeValues;for(const D in U){const O=U[D];if(O.location>=0){let k=A[D];if(k===void 0&&(D==="instanceMatrix"&&S.instanceMatrix&&(k=S.instanceMatrix),D==="instanceColor"&&S.instanceColor&&(k=S.instanceColor)),k!==void 0){const B=k.normalized,G=k.itemSize,K=t.get(k);if(K===void 0)continue;const nt=K.buffer,q=K.type,tt=K.bytesPerElement,ut=q===s.INT||q===s.UNSIGNED_INT||k.gpuType===rc;if(k.isInterleavedBufferAttribute){const J=k.data,et=J.stride,at=k.offset;if(J.isInstancedInterleavedBuffer){for(let gt=0;gt<O.locationSize;gt++)m(O.location+gt,J.meshPerAttribute);S.isInstancedMesh!==!0&&z._maxInstanceCount===void 0&&(z._maxInstanceCount=J.meshPerAttribute*J.count)}else for(let gt=0;gt<O.locationSize;gt++)g(O.location+gt);s.bindBuffer(s.ARRAY_BUFFER,nt);for(let gt=0;gt<O.locationSize;gt++)y(O.location+gt,G/O.locationSize,q,B,et*tt,(at+G/O.locationSize*gt)*tt,ut)}else{if(k.isInstancedBufferAttribute){for(let J=0;J<O.locationSize;J++)m(O.location+J,k.meshPerAttribute);S.isInstancedMesh!==!0&&z._maxInstanceCount===void 0&&(z._maxInstanceCount=k.meshPerAttribute*k.count)}else for(let J=0;J<O.locationSize;J++)g(O.location+J);s.bindBuffer(s.ARRAY_BUFFER,nt);for(let J=0;J<O.locationSize;J++)y(O.location+J,G/O.locationSize,q,B,G*tt,G/O.locationSize*J*tt,ut)}}else if(N!==void 0){const B=N[D];if(B!==void 0)switch(B.length){case 2:s.vertexAttrib2fv(O.location,B);break;case 3:s.vertexAttrib3fv(O.location,B);break;case 4:s.vertexAttrib4fv(O.location,B);break;default:s.vertexAttrib1fv(O.location,B)}}}}w()}function T(){b();for(const S in n){const R=n[S];for(const F in R){const z=R[F];for(const A in z)h(z[A].object),delete z[A];delete R[F]}delete n[S]}}function M(S){if(n[S.id]===void 0)return;const R=n[S.id];for(const F in R){const z=R[F];for(const A in z)h(z[A].object),delete z[A];delete R[F]}delete n[S.id]}function E(S){for(const R in n){const F=n[R];if(F[S.id]===void 0)continue;const z=F[S.id];for(const A in z)h(z[A].object),delete z[A];delete F[S.id]}}function b(){_(),r=!0,o!==i&&(o=i,l(o.object))}function _(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:a,reset:b,resetDefaultState:_,dispose:T,releaseStatesOfGeometry:M,releaseStatesOfProgram:E,initAttributes:x,enableAttribute:g,disableUnusedAttributes:w}}function Lp(s,t,e){let n;function i(l){n=l}function o(l,h){s.drawArrays(n,l,h),e.update(h,n,1)}function r(l,h,d){d!==0&&(s.drawArraysInstanced(n,l,h,d),e.update(h,n,d))}function a(l,h,d){if(d===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,h,0,d);let f=0;for(let p=0;p<d;p++)f+=h[p];e.update(f,n,1)}function c(l,h,d,u){if(d===0)return;const f=t.get("WEBGL_multi_draw");if(f===null)for(let p=0;p<l.length;p++)r(l[p],h[p],u[p]);else{f.multiDrawArraysInstancedWEBGL(n,l,0,h,0,u,0,d);let p=0;for(let x=0;x<d;x++)p+=h[x]*u[x];e.update(p,n,1)}}this.setMode=i,this.render=o,this.renderInstances=r,this.renderMultiDraw=a,this.renderMultiDrawInstances=c}function Dp(s,t,e,n){let i;function o(){if(i!==void 0)return i;if(t.has("EXT_texture_filter_anisotropic")===!0){const E=t.get("EXT_texture_filter_anisotropic");i=s.getParameter(E.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function r(E){return!(E!==Ke&&n.convert(E)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(E){const b=E===Rn&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(E!==xn&&n.convert(E)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE)&&E!==vn&&!b)}function c(E){if(E==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";E="mediump"}return E==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=e.precision!==void 0?e.precision:"highp";const h=c(l);h!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);const d=e.logarithmicDepthBuffer===!0,u=e.reverseDepthBuffer===!0&&t.has("EXT_clip_control"),f=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),p=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=s.getParameter(s.MAX_TEXTURE_SIZE),g=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),m=s.getParameter(s.MAX_VERTEX_ATTRIBS),w=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),y=s.getParameter(s.MAX_VARYING_VECTORS),v=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),T=p>0,M=s.getParameter(s.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:o,getMaxPrecision:c,textureFormatReadable:r,textureTypeReadable:a,precision:l,logarithmicDepthBuffer:d,reverseDepthBuffer:u,maxTextures:f,maxVertexTextures:p,maxTextureSize:x,maxCubemapSize:g,maxAttributes:m,maxVertexUniforms:w,maxVaryings:y,maxFragmentUniforms:v,vertexTextures:T,maxSamples:M}}function Ip(s){const t=this;let e=null,n=0,i=!1,o=!1;const r=new Ti,a=new ue,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){const f=d.length!==0||u||n!==0||i;return i=u,n=d.length,f},this.beginShadows=function(){o=!0,h(null)},this.endShadows=function(){o=!1},this.setGlobalState=function(d,u){e=h(d,u,0)},this.setState=function(d,u,f){const p=d.clippingPlanes,x=d.clipIntersection,g=d.clipShadows,m=s.get(d);if(!i||p===null||p.length===0||o&&!g)o?h(null):l();else{const w=o?0:n,y=w*4;let v=m.clippingState||null;c.value=v,v=h(p,u,y,f);for(let T=0;T!==y;++T)v[T]=e[T];m.clippingState=v,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=w}};function l(){c.value!==e&&(c.value=e,c.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(d,u,f,p){const x=d!==null?d.length:0;let g=null;if(x!==0){if(g=c.value,p!==!0||g===null){const m=f+x*4,w=u.matrixWorldInverse;a.getNormalMatrix(w),(g===null||g.length<m)&&(g=new Float32Array(m));for(let y=0,v=f;y!==x;++y,v+=4)r.copy(d[y]).applyMatrix4(w,a),r.normal.toArray(g,v),g[v+3]=r.constant}c.value=g,c.needsUpdate=!0}return t.numPlanes=x,t.numIntersection=0,g}}function zp(s){let t=new WeakMap;function e(r,a){return a===xa?r.mapping=ds:a===_a&&(r.mapping=fs),r}function n(r){if(r&&r.isTexture){const a=r.mapping;if(a===xa||a===_a)if(t.has(r)){const c=t.get(r).texture;return e(c,r.mapping)}else{const c=r.image;if(c&&c.height>0){const l=new Wd(c.height);return l.fromEquirectangularTexture(s,r),t.set(r,l),r.addEventListener("dispose",i),e(l.texture,r.mapping)}else return null}}return r}function i(r){const a=r.target;a.removeEventListener("dispose",i);const c=t.get(a);c!==void 0&&(t.delete(a),c.dispose())}function o(){t=new WeakMap}return{get:n,dispose:o}}class co extends Oh{constructor(t=-1,e=1,n=1,i=-1,o=.1,r=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=i,this.near=o,this.far=r,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,i,o,r){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=o,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let o=n-t,r=n+t,a=i+e,c=i-e;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;o+=l*this.view.offsetX,r=o+l*this.view.width,a-=h*this.view.offsetY,c=a-h*this.view.height}this.projectionMatrix.makeOrthographic(o,r,a,c,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}const is=4,il=[.125,.215,.35,.446,.526,.582],Ri=20,zr=new co,sl=new Ot;let Ur=null,Nr=0,Fr=0,Or=!1;const Ai=(1+Math.sqrt(5))/2,Ki=1/Ai,ol=[new P(-Ai,Ki,0),new P(Ai,Ki,0),new P(-Ki,0,Ai),new P(Ki,0,Ai),new P(0,Ai,-Ki),new P(0,Ai,Ki),new P(-1,1,-1),new P(1,1,-1),new P(-1,1,1),new P(1,1,1)];class Ya{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,n=.1,i=100){Ur=this._renderer.getRenderTarget(),Nr=this._renderer.getActiveCubeFace(),Fr=this._renderer.getActiveMipmapLevel(),Or=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const o=this._allocateTargets();return o.depthBuffer=!0,this._sceneToCubeUV(t,n,i,o),e>0&&this._blur(o,0,0,e),this._applyPMREM(o),this._cleanup(o),o}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=cl(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=al(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(Ur,Nr,Fr),this._renderer.xr.enabled=Or,t.scissorTest=!1,Oo(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===ds||t.mapping===fs?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Ur=this._renderer.getRenderTarget(),Nr=this._renderer.getActiveCubeFace(),Fr=this._renderer.getActiveMipmapLevel(),Or=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:xe,minFilter:xe,generateMipmaps:!1,type:Rn,format:Ke,colorSpace:Ni,depthBuffer:!1},i=rl(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=rl(t,e,n);const{_lodMax:o}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Up(o)),this._blurMaterial=Np(o,t,e)}return i}_compileMaterial(t){const e=new pe(this._lodPlanes[0],t);this._renderer.compile(e,zr)}_sceneToCubeUV(t,e,n,i){const a=new gn(90,1,e,n),c=[1,-1,1,1,1,1],l=[1,1,1,-1,-1,-1],h=this._renderer,d=h.autoClear,u=h.toneMapping;h.getClearColor(sl),h.toneMapping=jn,h.autoClear=!1;const f=new dc({name:"PMREM.Background",side:Je,depthWrite:!1,depthTest:!1}),p=new pe(new Xt,f);let x=!1;const g=t.background;g?g.isColor&&(f.color.copy(g),t.background=null,x=!0):(f.color.copy(sl),x=!0);for(let m=0;m<6;m++){const w=m%3;w===0?(a.up.set(0,c[m],0),a.lookAt(l[m],0,0)):w===1?(a.up.set(0,0,c[m]),a.lookAt(0,l[m],0)):(a.up.set(0,c[m],0),a.lookAt(0,0,l[m]));const y=this._cubeSize;Oo(i,w*y,m>2?y:0,y,y),h.setRenderTarget(i),x&&h.render(p,a),h.render(t,a)}p.geometry.dispose(),p.material.dispose(),h.toneMapping=u,h.autoClear=d,t.background=g}_textureToCubeUV(t,e){const n=this._renderer,i=t.mapping===ds||t.mapping===fs;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=cl()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=al());const o=i?this._cubemapMaterial:this._equirectMaterial,r=new pe(this._lodPlanes[0],o),a=o.uniforms;a.envMap.value=t;const c=this._cubeSize;Oo(e,0,0,3*c,2*c),n.setRenderTarget(e),n.render(r,zr)}_applyPMREM(t){const e=this._renderer,n=e.autoClear;e.autoClear=!1;const i=this._lodPlanes.length;for(let o=1;o<i;o++){const r=Math.sqrt(this._sigmas[o]*this._sigmas[o]-this._sigmas[o-1]*this._sigmas[o-1]),a=ol[(i-o-1)%ol.length];this._blur(t,o-1,o,r,a)}e.autoClear=n}_blur(t,e,n,i,o){const r=this._pingPongRenderTarget;this._halfBlur(t,r,e,n,i,"latitudinal",o),this._halfBlur(r,t,n,n,i,"longitudinal",o)}_halfBlur(t,e,n,i,o,r,a){const c=this._renderer,l=this._blurMaterial;r!=="latitudinal"&&r!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,d=new pe(this._lodPlanes[i],l),u=l.uniforms,f=this._sizeLods[n]-1,p=isFinite(o)?Math.PI/(2*f):2*Math.PI/(2*Ri-1),x=o/p,g=isFinite(o)?1+Math.floor(h*x):Ri;g>Ri&&console.warn(`sigmaRadians, ${o}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${Ri}`);const m=[];let w=0;for(let E=0;E<Ri;++E){const b=E/x,_=Math.exp(-b*b/2);m.push(_),E===0?w+=_:E<g&&(w+=2*_)}for(let E=0;E<m.length;E++)m[E]=m[E]/w;u.envMap.value=t.texture,u.samples.value=g,u.weights.value=m,u.latitudinal.value=r==="latitudinal",a&&(u.poleAxis.value=a);const{_lodMax:y}=this;u.dTheta.value=p,u.mipInt.value=y-n;const v=this._sizeLods[i],T=3*v*(i>y-is?i-y+is:0),M=4*(this._cubeSize-v);Oo(e,T,M,3*v,2*v),c.setRenderTarget(e),c.render(d,zr)}}function Up(s){const t=[],e=[],n=[];let i=s;const o=s-is+1+il.length;for(let r=0;r<o;r++){const a=Math.pow(2,i);e.push(a);let c=1/a;r>s-is?c=il[r-s+is-1]:r===0&&(c=0),n.push(c);const l=1/(a-2),h=-l,d=1+l,u=[h,h,d,h,d,d,h,h,d,d,h,d],f=6,p=6,x=3,g=2,m=1,w=new Float32Array(x*p*f),y=new Float32Array(g*p*f),v=new Float32Array(m*p*f);for(let M=0;M<f;M++){const E=M%3*2/3-1,b=M>2?0:-1,_=[E,b,0,E+2/3,b,0,E+2/3,b+1,0,E,b,0,E+2/3,b+1,0,E,b+1,0];w.set(_,x*p*M),y.set(u,g*p*M);const S=[M,M,M,M,M,M];v.set(S,m*p*M)}const T=new re;T.setAttribute("position",new ge(w,x)),T.setAttribute("uv",new ge(y,g)),T.setAttribute("faceIndex",new ge(v,m)),t.push(T),i>is&&i--}return{lodPlanes:t,sizeLods:e,sigmas:n}}function rl(s,t,e){const n=new ln(s,t,e);return n.texture.mapping=rr,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Oo(s,t,e,n,i){s.viewport.set(t,e,n,i),s.scissor.set(t,e,n,i)}function Np(s,t,e){const n=new Float32Array(Ri),i=new P(0,1,0);return new Ie({name:"SphericalGaussianBlur",defines:{n:Ri,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:fc(),fragmentShader:`

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
		`,blending:pi,depthTest:!1,depthWrite:!1})}function al(){return new Ie({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:fc(),fragmentShader:`

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
		`,blending:pi,depthTest:!1,depthWrite:!1})}function cl(){return new Ie({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:fc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:pi,depthTest:!1,depthWrite:!1})}function fc(){return`

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
	`}function Fp(s){let t=new WeakMap,e=null;function n(a){if(a&&a.isTexture){const c=a.mapping,l=c===xa||c===_a,h=c===ds||c===fs;if(l||h){let d=t.get(a);const u=d!==void 0?d.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==u)return e===null&&(e=new Ya(s)),d=l?e.fromEquirectangular(a,d):e.fromCubemap(a,d),d.texture.pmremVersion=a.pmremVersion,t.set(a,d),d.texture;if(d!==void 0)return d.texture;{const f=a.image;return l&&f&&f.height>0||h&&f&&i(f)?(e===null&&(e=new Ya(s)),d=l?e.fromEquirectangular(a):e.fromCubemap(a),d.texture.pmremVersion=a.pmremVersion,t.set(a,d),a.addEventListener("dispose",o),d.texture):null}}}return a}function i(a){let c=0;const l=6;for(let h=0;h<l;h++)a[h]!==void 0&&c++;return c===l}function o(a){const c=a.target;c.removeEventListener("dispose",o);const l=t.get(c);l!==void 0&&(t.delete(c),l.dispose())}function r(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:n,dispose:r}}function Op(s){const t={};function e(n){if(t[n]!==void 0)return t[n];let i;switch(n){case"WEBGL_depth_texture":i=s.getExtension("WEBGL_depth_texture")||s.getExtension("MOZ_WEBGL_depth_texture")||s.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":i=s.getExtension("EXT_texture_filter_anisotropic")||s.getExtension("MOZ_EXT_texture_filter_anisotropic")||s.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":i=s.getExtension("WEBGL_compressed_texture_s3tc")||s.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":i=s.getExtension("WEBGL_compressed_texture_pvrtc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:i=s.getExtension(n)}return t[n]=i,i}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){const i=e(n);return i===null&&Xs("THREE.WebGLRenderer: "+n+" extension not supported."),i}}}function kp(s,t,e,n){const i={},o=new WeakMap;function r(d){const u=d.target;u.index!==null&&t.remove(u.index);for(const p in u.attributes)t.remove(u.attributes[p]);for(const p in u.morphAttributes){const x=u.morphAttributes[p];for(let g=0,m=x.length;g<m;g++)t.remove(x[g])}u.removeEventListener("dispose",r),delete i[u.id];const f=o.get(u);f&&(t.remove(f),o.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function a(d,u){return i[u.id]===!0||(u.addEventListener("dispose",r),i[u.id]=!0,e.memory.geometries++),u}function c(d){const u=d.attributes;for(const p in u)t.update(u[p],s.ARRAY_BUFFER);const f=d.morphAttributes;for(const p in f){const x=f[p];for(let g=0,m=x.length;g<m;g++)t.update(x[g],s.ARRAY_BUFFER)}}function l(d){const u=[],f=d.index,p=d.attributes.position;let x=0;if(f!==null){const w=f.array;x=f.version;for(let y=0,v=w.length;y<v;y+=3){const T=w[y+0],M=w[y+1],E=w[y+2];u.push(T,M,M,E,E,T)}}else if(p!==void 0){const w=p.array;x=p.version;for(let y=0,v=w.length/3-1;y<v;y+=3){const T=y+0,M=y+1,E=y+2;u.push(T,M,M,E,E,T)}}else return;const g=new(Ch(u)?Nh:Uh)(u,1);g.version=x;const m=o.get(d);m&&t.remove(m),o.set(d,g)}function h(d){const u=o.get(d);if(u){const f=d.index;f!==null&&u.version<f.version&&l(d)}else l(d);return o.get(d)}return{get:a,update:c,getWireframeAttribute:h}}function Bp(s,t,e){let n;function i(u){n=u}let o,r;function a(u){o=u.type,r=u.bytesPerElement}function c(u,f){s.drawElements(n,f,o,u*r),e.update(f,n,1)}function l(u,f,p){p!==0&&(s.drawElementsInstanced(n,f,o,u*r,p),e.update(f,n,p))}function h(u,f,p){if(p===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,o,u,0,p);let g=0;for(let m=0;m<p;m++)g+=f[m];e.update(g,n,1)}function d(u,f,p,x){if(p===0)return;const g=t.get("WEBGL_multi_draw");if(g===null)for(let m=0;m<u.length;m++)l(u[m]/r,f[m],x[m]);else{g.multiDrawElementsInstancedWEBGL(n,f,0,o,u,0,x,0,p);let m=0;for(let w=0;w<p;w++)m+=f[w]*x[w];e.update(m,n,1)}}this.setMode=i,this.setIndex=a,this.render=c,this.renderInstances=l,this.renderMultiDraw=h,this.renderMultiDrawInstances=d}function Hp(s){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(o,r,a){switch(e.calls++,r){case s.TRIANGLES:e.triangles+=a*(o/3);break;case s.LINES:e.lines+=a*(o/2);break;case s.LINE_STRIP:e.lines+=a*(o-1);break;case s.LINE_LOOP:e.lines+=a*o;break;case s.POINTS:e.points+=a*o;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",r);break}}function i(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:i,update:n}}function Gp(s,t,e){const n=new WeakMap,i=new Ee;function o(r,a,c){const l=r.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,d=h!==void 0?h.length:0;let u=n.get(a);if(u===void 0||u.count!==d){let S=function(){b.dispose(),n.delete(a),a.removeEventListener("dispose",S)};var f=S;u!==void 0&&u.texture.dispose();const p=a.morphAttributes.position!==void 0,x=a.morphAttributes.normal!==void 0,g=a.morphAttributes.color!==void 0,m=a.morphAttributes.position||[],w=a.morphAttributes.normal||[],y=a.morphAttributes.color||[];let v=0;p===!0&&(v=1),x===!0&&(v=2),g===!0&&(v=3);let T=a.attributes.position.count*v,M=1;T>t.maxTextureSize&&(M=Math.ceil(T/t.maxTextureSize),T=t.maxTextureSize);const E=new Float32Array(T*M*4*d),b=new Ph(E,T,M,d);b.type=vn,b.needsUpdate=!0;const _=v*4;for(let R=0;R<d;R++){const F=m[R],z=w[R],A=y[R],U=T*M*4*R;for(let N=0;N<F.count;N++){const D=N*_;p===!0&&(i.fromBufferAttribute(F,N),E[U+D+0]=i.x,E[U+D+1]=i.y,E[U+D+2]=i.z,E[U+D+3]=0),x===!0&&(i.fromBufferAttribute(z,N),E[U+D+4]=i.x,E[U+D+5]=i.y,E[U+D+6]=i.z,E[U+D+7]=0),g===!0&&(i.fromBufferAttribute(A,N),E[U+D+8]=i.x,E[U+D+9]=i.y,E[U+D+10]=i.z,E[U+D+11]=A.itemSize===4?i.w:1)}}u={count:d,texture:b,size:new Ft(T,M)},n.set(a,u),a.addEventListener("dispose",S)}if(r.isInstancedMesh===!0&&r.morphTexture!==null)c.getUniforms().setValue(s,"morphTexture",r.morphTexture,e);else{let p=0;for(let g=0;g<l.length;g++)p+=l[g];const x=a.morphTargetsRelative?1:1-p;c.getUniforms().setValue(s,"morphTargetBaseInfluence",x),c.getUniforms().setValue(s,"morphTargetInfluences",l)}c.getUniforms().setValue(s,"morphTargetsTexture",u.texture,e),c.getUniforms().setValue(s,"morphTargetsTextureSize",u.size)}return{update:o}}function Vp(s,t,e,n){let i=new WeakMap;function o(c){const l=n.render.frame,h=c.geometry,d=t.get(c,h);if(i.get(d)!==l&&(t.update(d),i.set(d,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",a)===!1&&c.addEventListener("dispose",a),i.get(c)!==l&&(e.update(c.instanceMatrix,s.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,s.ARRAY_BUFFER),i.set(c,l))),c.isSkinnedMesh){const u=c.skeleton;i.get(u)!==l&&(u.update(),i.set(u,l))}return d}function r(){i=new WeakMap}function a(c){const l=c.target;l.removeEventListener("dispose",a),e.remove(l.instanceMatrix),l.instanceColor!==null&&e.remove(l.instanceColor)}return{update:o,dispose:r}}class pc extends Qe{constructor(t,e,n,i,o,r,a,c,l,h=as){if(h!==as&&h!==gs)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&h===as&&(n=Qn),n===void 0&&h===gs&&(n=ms),super(null,i,o,r,a,c,h,n,l),this.isDepthTexture=!0,this.image={width:t,height:e},this.magFilter=a!==void 0?a:rn,this.minFilter=c!==void 0?c:rn,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}const Hh=new Qe,ll=new pc(1,1),Gh=new Ph,Vh=new Lh,Wh=new kh,hl=[],ul=[],dl=new Float32Array(16),fl=new Float32Array(9),pl=new Float32Array(4);function Ts(s,t,e){const n=s[0];if(n<=0||n>0)return s;const i=t*e;let o=hl[i];if(o===void 0&&(o=new Float32Array(i),hl[i]=o),t!==0){n.toArray(o,0);for(let r=1,a=0;r!==t;++r)a+=e,s[r].toArray(o,a)}return o}function Ne(s,t){if(s.length!==t.length)return!1;for(let e=0,n=s.length;e<n;e++)if(s[e]!==t[e])return!1;return!0}function Fe(s,t){for(let e=0,n=t.length;e<n;e++)s[e]=t[e]}function lr(s,t){let e=ul[t];e===void 0&&(e=new Int32Array(t),ul[t]=e);for(let n=0;n!==t;++n)e[n]=s.allocateTextureUnit();return e}function Wp(s,t){const e=this.cache;e[0]!==t&&(s.uniform1f(this.addr,t),e[0]=t)}function Xp(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ne(e,t))return;s.uniform2fv(this.addr,t),Fe(e,t)}}function qp(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(s.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(Ne(e,t))return;s.uniform3fv(this.addr,t),Fe(e,t)}}function Yp(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ne(e,t))return;s.uniform4fv(this.addr,t),Fe(e,t)}}function $p(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(Ne(e,t))return;s.uniformMatrix2fv(this.addr,!1,t),Fe(e,t)}else{if(Ne(e,n))return;pl.set(n),s.uniformMatrix2fv(this.addr,!1,pl),Fe(e,n)}}function jp(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(Ne(e,t))return;s.uniformMatrix3fv(this.addr,!1,t),Fe(e,t)}else{if(Ne(e,n))return;fl.set(n),s.uniformMatrix3fv(this.addr,!1,fl),Fe(e,n)}}function Zp(s,t){const e=this.cache,n=t.elements;if(n===void 0){if(Ne(e,t))return;s.uniformMatrix4fv(this.addr,!1,t),Fe(e,t)}else{if(Ne(e,n))return;dl.set(n),s.uniformMatrix4fv(this.addr,!1,dl),Fe(e,n)}}function Kp(s,t){const e=this.cache;e[0]!==t&&(s.uniform1i(this.addr,t),e[0]=t)}function Jp(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ne(e,t))return;s.uniform2iv(this.addr,t),Fe(e,t)}}function Qp(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Ne(e,t))return;s.uniform3iv(this.addr,t),Fe(e,t)}}function tm(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ne(e,t))return;s.uniform4iv(this.addr,t),Fe(e,t)}}function em(s,t){const e=this.cache;e[0]!==t&&(s.uniform1ui(this.addr,t),e[0]=t)}function nm(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(s.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ne(e,t))return;s.uniform2uiv(this.addr,t),Fe(e,t)}}function im(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(s.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Ne(e,t))return;s.uniform3uiv(this.addr,t),Fe(e,t)}}function sm(s,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(s.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ne(e,t))return;s.uniform4uiv(this.addr,t),Fe(e,t)}}function om(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);let o;this.type===s.SAMPLER_2D_SHADOW?(ll.compareFunction=Ah,o=ll):o=Hh,e.setTexture2D(t||o,i)}function rm(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTexture3D(t||Vh,i)}function am(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTextureCube(t||Wh,i)}function cm(s,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),e.setTexture2DArray(t||Gh,i)}function lm(s){switch(s){case 5126:return Wp;case 35664:return Xp;case 35665:return qp;case 35666:return Yp;case 35674:return $p;case 35675:return jp;case 35676:return Zp;case 5124:case 35670:return Kp;case 35667:case 35671:return Jp;case 35668:case 35672:return Qp;case 35669:case 35673:return tm;case 5125:return em;case 36294:return nm;case 36295:return im;case 36296:return sm;case 35678:case 36198:case 36298:case 36306:case 35682:return om;case 35679:case 36299:case 36307:return rm;case 35680:case 36300:case 36308:case 36293:return am;case 36289:case 36303:case 36311:case 36292:return cm}}function hm(s,t){s.uniform1fv(this.addr,t)}function um(s,t){const e=Ts(t,this.size,2);s.uniform2fv(this.addr,e)}function dm(s,t){const e=Ts(t,this.size,3);s.uniform3fv(this.addr,e)}function fm(s,t){const e=Ts(t,this.size,4);s.uniform4fv(this.addr,e)}function pm(s,t){const e=Ts(t,this.size,4);s.uniformMatrix2fv(this.addr,!1,e)}function mm(s,t){const e=Ts(t,this.size,9);s.uniformMatrix3fv(this.addr,!1,e)}function gm(s,t){const e=Ts(t,this.size,16);s.uniformMatrix4fv(this.addr,!1,e)}function vm(s,t){s.uniform1iv(this.addr,t)}function xm(s,t){s.uniform2iv(this.addr,t)}function _m(s,t){s.uniform3iv(this.addr,t)}function wm(s,t){s.uniform4iv(this.addr,t)}function ym(s,t){s.uniform1uiv(this.addr,t)}function Mm(s,t){s.uniform2uiv(this.addr,t)}function Sm(s,t){s.uniform3uiv(this.addr,t)}function bm(s,t){s.uniform4uiv(this.addr,t)}function Em(s,t,e){const n=this.cache,i=t.length,o=lr(e,i);Ne(n,o)||(s.uniform1iv(this.addr,o),Fe(n,o));for(let r=0;r!==i;++r)e.setTexture2D(t[r]||Hh,o[r])}function Tm(s,t,e){const n=this.cache,i=t.length,o=lr(e,i);Ne(n,o)||(s.uniform1iv(this.addr,o),Fe(n,o));for(let r=0;r!==i;++r)e.setTexture3D(t[r]||Vh,o[r])}function Am(s,t,e){const n=this.cache,i=t.length,o=lr(e,i);Ne(n,o)||(s.uniform1iv(this.addr,o),Fe(n,o));for(let r=0;r!==i;++r)e.setTextureCube(t[r]||Wh,o[r])}function Cm(s,t,e){const n=this.cache,i=t.length,o=lr(e,i);Ne(n,o)||(s.uniform1iv(this.addr,o),Fe(n,o));for(let r=0;r!==i;++r)e.setTexture2DArray(t[r]||Gh,o[r])}function Rm(s){switch(s){case 5126:return hm;case 35664:return um;case 35665:return dm;case 35666:return fm;case 35674:return pm;case 35675:return mm;case 35676:return gm;case 5124:case 35670:return vm;case 35667:case 35671:return xm;case 35668:case 35672:return _m;case 35669:case 35673:return wm;case 5125:return ym;case 36294:return Mm;case 36295:return Sm;case 36296:return bm;case 35678:case 36198:case 36298:case 36306:case 35682:return Em;case 35679:case 36299:case 36307:return Tm;case 35680:case 36300:case 36308:case 36293:return Am;case 36289:case 36303:case 36311:case 36292:return Cm}}class Pm{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=lm(e.type)}}class Lm{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=Rm(e.type)}}class Dm{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){const i=this.seq;for(let o=0,r=i.length;o!==r;++o){const a=i[o];a.setValue(t,e[a.id],n)}}}const kr=/(\w+)(\])?(\[|\.)?/g;function ml(s,t){s.seq.push(t),s.map[t.id]=t}function Im(s,t,e){const n=s.name,i=n.length;for(kr.lastIndex=0;;){const o=kr.exec(n),r=kr.lastIndex;let a=o[1];const c=o[2]==="]",l=o[3];if(c&&(a=a|0),l===void 0||l==="["&&r+2===i){ml(e,l===void 0?new Pm(a,s,t):new Lm(a,s,t));break}else{let d=e.map[a];d===void 0&&(d=new Dm(a),ml(e,d)),e=d}}}class tr{constructor(t,e){this.seq=[],this.map={};const n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let i=0;i<n;++i){const o=t.getActiveUniform(e,i),r=t.getUniformLocation(e,o.name);Im(o,r,this)}}setValue(t,e,n,i){const o=this.map[e];o!==void 0&&o.setValue(t,n,i)}setOptional(t,e,n){const i=e[n];i!==void 0&&this.setValue(t,n,i)}static upload(t,e,n,i){for(let o=0,r=e.length;o!==r;++o){const a=e[o],c=n[a.id];c.needsUpdate!==!1&&a.setValue(t,c.value,i)}}static seqWithValue(t,e){const n=[];for(let i=0,o=t.length;i!==o;++i){const r=t[i];r.id in e&&n.push(r)}return n}}function gl(s,t,e){const n=s.createShader(t);return s.shaderSource(n,e),s.compileShader(n),n}const zm=37297;let Um=0;function Nm(s,t){const e=s.split(`
`),n=[],i=Math.max(t-6,0),o=Math.min(t+6,e.length);for(let r=i;r<o;r++){const a=r+1;n.push(`${a===t?">":" "} ${a}: ${e[r]}`)}return n.join(`
`)}const vl=new ue;function Fm(s){ve._getMatrix(vl,ve.workingColorSpace,s);const t=`mat3( ${vl.elements.map(e=>e.toFixed(4))} )`;switch(ve.getTransfer(s)){case cr:return[t,"LinearTransferOETF"];case _e:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",s),[t,"LinearTransferOETF"]}}function xl(s,t,e){const n=s.getShaderParameter(t,s.COMPILE_STATUS),i=s.getShaderInfoLog(t).trim();if(n&&i==="")return"";const o=/ERROR: 0:(\d+)/.exec(i);if(o){const r=parseInt(o[1]);return e.toUpperCase()+`

`+i+`

`+Nm(s.getShaderSource(t),r)}else return i}function Om(s,t){const e=Fm(t);return[`vec4 ${s}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}function km(s,t){let e;switch(t){case Ou:e="Linear";break;case ku:e="Reinhard";break;case Bu:e="Cineon";break;case Hu:e="ACESFilmic";break;case Vu:e="AgX";break;case Wu:e="Neutral";break;case Gu:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+s+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const ko=new P;function Bm(){ve.getLuminanceCoefficients(ko);const s=ko.x.toFixed(4),t=ko.y.toFixed(4),e=ko.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Hm(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(qs).join(`
`)}function Gm(s){const t=[];for(const e in s){const n=s[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function Vm(s,t){const e={},n=s.getProgramParameter(t,s.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const o=s.getActiveAttrib(t,i),r=o.name;let a=1;o.type===s.FLOAT_MAT2&&(a=2),o.type===s.FLOAT_MAT3&&(a=3),o.type===s.FLOAT_MAT4&&(a=4),e[r]={type:o.type,location:s.getAttribLocation(t,r),locationSize:a}}return e}function qs(s){return s!==""}function _l(s,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return s.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function wl(s,t){return s.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const Wm=/^[ \t]*#include +<([\w\d./]+)>/gm;function $a(s){return s.replace(Wm,qm)}const Xm=new Map;function qm(s,t){let e=ce[t];if(e===void 0){const n=Xm.get(t);if(n!==void 0)e=ce[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("Can not resolve #include <"+t+">")}return $a(e)}const Ym=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function yl(s){return s.replace(Ym,$m)}function $m(s,t,e,n){let i="";for(let o=parseInt(t);o<parseInt(e);o++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+o+" ]").replace(/UNROLLED_LOOP_INDEX/g,o);return i}function Ml(s){let t=`precision ${s.precision} float;
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
#define LOW_PRECISION`),t}function jm(s){let t="SHADOWMAP_TYPE_BASIC";return s.shadowMapType===dh?t="SHADOWMAP_TYPE_PCF":s.shadowMapType===fh?t="SHADOWMAP_TYPE_PCF_SOFT":s.shadowMapType===Wn&&(t="SHADOWMAP_TYPE_VSM"),t}function Zm(s){let t="ENVMAP_TYPE_CUBE";if(s.envMap)switch(s.envMapMode){case ds:case fs:t="ENVMAP_TYPE_CUBE";break;case rr:t="ENVMAP_TYPE_CUBE_UV";break}return t}function Km(s){let t="ENVMAP_MODE_REFLECTION";if(s.envMap)switch(s.envMapMode){case fs:t="ENVMAP_MODE_REFRACTION";break}return t}function Jm(s){let t="ENVMAP_BLENDING_NONE";if(s.envMap)switch(s.combine){case ph:t="ENVMAP_BLENDING_MULTIPLY";break;case Nu:t="ENVMAP_BLENDING_MIX";break;case Fu:t="ENVMAP_BLENDING_ADD";break}return t}function Qm(s){const t=s.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),7*16)),texelHeight:n,maxMip:e}}function tg(s,t,e,n){const i=s.getContext(),o=e.defines;let r=e.vertexShader,a=e.fragmentShader;const c=jm(e),l=Zm(e),h=Km(e),d=Jm(e),u=Qm(e),f=Hm(e),p=Gm(o),x=i.createProgram();let g,m,w=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(g=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p].filter(qs).join(`
`),g.length>0&&(g+=`
`),m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p].filter(qs).join(`
`),m.length>0&&(m+=`
`)):(g=[Ml(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(qs).join(`
`),m=[Ml(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,p,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+l:"",e.envMap?"#define "+h:"",e.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==jn?"#define TONE_MAPPING":"",e.toneMapping!==jn?ce.tonemapping_pars_fragment:"",e.toneMapping!==jn?km("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",ce.colorspace_pars_fragment,Om("linearToOutputTexel",e.outputColorSpace),Bm(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(qs).join(`
`)),r=$a(r),r=_l(r,e),r=wl(r,e),a=$a(a),a=_l(a,e),a=wl(a,e),r=yl(r),a=yl(a),e.isRawShaderMaterial!==!0&&(w=`#version 300 es
`,g=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,m=["#define varying in",e.glslVersion===Uc?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Uc?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);const y=w+g+r,v=w+m+a,T=gl(i,i.VERTEX_SHADER,y),M=gl(i,i.FRAGMENT_SHADER,v);i.attachShader(x,T),i.attachShader(x,M),e.index0AttributeName!==void 0?i.bindAttribLocation(x,0,e.index0AttributeName):e.morphTargets===!0&&i.bindAttribLocation(x,0,"position"),i.linkProgram(x);function E(R){if(s.debug.checkShaderErrors){const F=i.getProgramInfoLog(x).trim(),z=i.getShaderInfoLog(T).trim(),A=i.getShaderInfoLog(M).trim();let U=!0,N=!0;if(i.getProgramParameter(x,i.LINK_STATUS)===!1)if(U=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(i,x,T,M);else{const D=xl(i,T,"vertex"),O=xl(i,M,"fragment");console.error("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(x,i.VALIDATE_STATUS)+`

Material Name: `+R.name+`
Material Type: `+R.type+`

Program Info Log: `+F+`
`+D+`
`+O)}else F!==""?console.warn("THREE.WebGLProgram: Program Info Log:",F):(z===""||A==="")&&(N=!1);N&&(R.diagnostics={runnable:U,programLog:F,vertexShader:{log:z,prefix:g},fragmentShader:{log:A,prefix:m}})}i.deleteShader(T),i.deleteShader(M),b=new tr(i,x),_=Vm(i,x)}let b;this.getUniforms=function(){return b===void 0&&E(this),b};let _;this.getAttributes=function(){return _===void 0&&E(this),_};let S=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return S===!1&&(S=i.getProgramParameter(x,zm)),S},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(x),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=Um++,this.cacheKey=t,this.usedTimes=1,this.program=x,this.vertexShader=T,this.fragmentShader=M,this}let eg=0;class ng{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,n=t.fragmentShader,i=this._getShaderStage(e),o=this._getShaderStage(n),r=this._getShaderCacheForMaterial(t);return r.has(i)===!1&&(r.add(i),i.usedTimes++),r.has(o)===!1&&(r.add(o),o.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){const e=this.shaderCache;let n=e.get(t);return n===void 0&&(n=new ig(t),e.set(t,n)),n}}class ig{constructor(t){this.id=eg++,this.code=t,this.usedTimes=0}}function sg(s,t,e,n,i,o,r){const a=new Ih,c=new ng,l=new Set,h=[],d=i.logarithmicDepthBuffer,u=i.vertexTextures;let f=i.precision;const p={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(_){return l.add(_),_===0?"uv":`uv${_}`}function g(_,S,R,F,z){const A=F.fog,U=z.geometry,N=_.isMeshStandardMaterial?F.environment:null,D=(_.isMeshStandardMaterial?e:t).get(_.envMap||N),O=D&&D.mapping===rr?D.image.height:null,k=p[_.type];_.precision!==null&&(f=i.getMaxPrecision(_.precision),f!==_.precision&&console.warn("THREE.WebGLProgram.getParameters:",_.precision,"not supported, using",f,"instead."));const B=U.morphAttributes.position||U.morphAttributes.normal||U.morphAttributes.color,G=B!==void 0?B.length:0;let K=0;U.morphAttributes.position!==void 0&&(K=1),U.morphAttributes.normal!==void 0&&(K=2),U.morphAttributes.color!==void 0&&(K=3);let nt,q,tt,ut;if(k){const le=Dn[k];nt=le.vertexShader,q=le.fragmentShader}else nt=_.vertexShader,q=_.fragmentShader,c.update(_),tt=c.getVertexShaderID(_),ut=c.getFragmentShaderID(_);const J=s.getRenderTarget(),et=s.state.buffers.depth.getReversed(),at=z.isInstancedMesh===!0,gt=z.isBatchedMesh===!0,dt=!!_.map,st=!!_.matcap,lt=!!D,H=!!_.aoMap,Lt=!!_.lightMap,pt=!!_.bumpMap,Ct=!!_.normalMap,vt=!!_.displacementMap,kt=!!_.emissiveMap,wt=!!_.metalnessMap,I=!!_.roughnessMap,C=_.anisotropy>0,Z=_.clearcoat>0,Y=_.dispersion>0,V=_.iridescence>0,Q=_.sheen>0,mt=_.transmission>0,ct=C&&!!_.anisotropyMap,_t=Z&&!!_.clearcoatMap,Gt=Z&&!!_.clearcoatNormalMap,ht=Z&&!!_.clearcoatRoughnessMap,yt=V&&!!_.iridescenceMap,Pt=V&&!!_.iridescenceThicknessMap,zt=Q&&!!_.sheenColorMap,Mt=Q&&!!_.sheenRoughnessMap,Qt=!!_.specularMap,qt=!!_.specularColorMap,me=!!_.specularIntensityMap,W=mt&&!!_.transmissionMap,Tt=mt&&!!_.thicknessMap,rt=!!_.gradientMap,ft=!!_.alphaMap,St=_.alphaTest>0,Et=!!_.alphaHash,Zt=!!_.extensions;let fe=jn;_.toneMapped&&(J===null||J.isXRRenderTarget===!0)&&(fe=s.toneMapping);const we={shaderID:k,shaderType:_.type,shaderName:_.name,vertexShader:nt,fragmentShader:q,defines:_.defines,customVertexShaderID:tt,customFragmentShaderID:ut,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:f,batching:gt,batchingColor:gt&&z._colorsTexture!==null,instancing:at,instancingColor:at&&z.instanceColor!==null,instancingMorph:at&&z.morphTexture!==null,supportsVertexTextures:u,outputColorSpace:J===null?s.outputColorSpace:J.isXRRenderTarget===!0?J.texture.colorSpace:Ni,alphaToCoverage:!!_.alphaToCoverage,map:dt,matcap:st,envMap:lt,envMapMode:lt&&D.mapping,envMapCubeUVHeight:O,aoMap:H,lightMap:Lt,bumpMap:pt,normalMap:Ct,displacementMap:u&&vt,emissiveMap:kt,normalMapObjectSpace:Ct&&_.normalMapType===Yu,normalMapTangentSpace:Ct&&_.normalMapType===Th,metalnessMap:wt,roughnessMap:I,anisotropy:C,anisotropyMap:ct,clearcoat:Z,clearcoatMap:_t,clearcoatNormalMap:Gt,clearcoatRoughnessMap:ht,dispersion:Y,iridescence:V,iridescenceMap:yt,iridescenceThicknessMap:Pt,sheen:Q,sheenColorMap:zt,sheenRoughnessMap:Mt,specularMap:Qt,specularColorMap:qt,specularIntensityMap:me,transmission:mt,transmissionMap:W,thicknessMap:Tt,gradientMap:rt,opaque:_.transparent===!1&&_.blending===$n&&_.alphaToCoverage===!1,alphaMap:ft,alphaTest:St,alphaHash:Et,combine:_.combine,mapUv:dt&&x(_.map.channel),aoMapUv:H&&x(_.aoMap.channel),lightMapUv:Lt&&x(_.lightMap.channel),bumpMapUv:pt&&x(_.bumpMap.channel),normalMapUv:Ct&&x(_.normalMap.channel),displacementMapUv:vt&&x(_.displacementMap.channel),emissiveMapUv:kt&&x(_.emissiveMap.channel),metalnessMapUv:wt&&x(_.metalnessMap.channel),roughnessMapUv:I&&x(_.roughnessMap.channel),anisotropyMapUv:ct&&x(_.anisotropyMap.channel),clearcoatMapUv:_t&&x(_.clearcoatMap.channel),clearcoatNormalMapUv:Gt&&x(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ht&&x(_.clearcoatRoughnessMap.channel),iridescenceMapUv:yt&&x(_.iridescenceMap.channel),iridescenceThicknessMapUv:Pt&&x(_.iridescenceThicknessMap.channel),sheenColorMapUv:zt&&x(_.sheenColorMap.channel),sheenRoughnessMapUv:Mt&&x(_.sheenRoughnessMap.channel),specularMapUv:Qt&&x(_.specularMap.channel),specularColorMapUv:qt&&x(_.specularColorMap.channel),specularIntensityMapUv:me&&x(_.specularIntensityMap.channel),transmissionMapUv:W&&x(_.transmissionMap.channel),thicknessMapUv:Tt&&x(_.thicknessMap.channel),alphaMapUv:ft&&x(_.alphaMap.channel),vertexTangents:!!U.attributes.tangent&&(Ct||C),vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!U.attributes.color&&U.attributes.color.itemSize===4,pointsUvs:z.isPoints===!0&&!!U.attributes.uv&&(dt||ft),fog:!!A,useFog:_.fog===!0,fogExp2:!!A&&A.isFogExp2,flatShading:_.flatShading===!0,sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:d,reverseDepthBuffer:et,skinning:z.isSkinnedMesh===!0,morphTargets:U.morphAttributes.position!==void 0,morphNormals:U.morphAttributes.normal!==void 0,morphColors:U.morphAttributes.color!==void 0,morphTargetsCount:G,morphTextureStride:K,numDirLights:S.directional.length,numPointLights:S.point.length,numSpotLights:S.spot.length,numSpotLightMaps:S.spotLightMap.length,numRectAreaLights:S.rectArea.length,numHemiLights:S.hemi.length,numDirLightShadows:S.directionalShadowMap.length,numPointLightShadows:S.pointShadowMap.length,numSpotLightShadows:S.spotShadowMap.length,numSpotLightShadowsWithMaps:S.numSpotLightShadowsWithMaps,numLightProbes:S.numLightProbes,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:_.dithering,shadowMapEnabled:s.shadowMap.enabled&&R.length>0,shadowMapType:s.shadowMap.type,toneMapping:fe,decodeVideoTexture:dt&&_.map.isVideoTexture===!0&&ve.getTransfer(_.map.colorSpace)===_e,decodeVideoTextureEmissive:kt&&_.emissiveMap.isVideoTexture===!0&&ve.getTransfer(_.emissiveMap.colorSpace)===_e,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===Be,flipSided:_.side===Je,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:Zt&&_.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Zt&&_.extensions.multiDraw===!0||gt)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return we.vertexUv1s=l.has(1),we.vertexUv2s=l.has(2),we.vertexUv3s=l.has(3),l.clear(),we}function m(_){const S=[];if(_.shaderID?S.push(_.shaderID):(S.push(_.customVertexShaderID),S.push(_.customFragmentShaderID)),_.defines!==void 0)for(const R in _.defines)S.push(R),S.push(_.defines[R]);return _.isRawShaderMaterial===!1&&(w(S,_),y(S,_),S.push(s.outputColorSpace)),S.push(_.customProgramCacheKey),S.join()}function w(_,S){_.push(S.precision),_.push(S.outputColorSpace),_.push(S.envMapMode),_.push(S.envMapCubeUVHeight),_.push(S.mapUv),_.push(S.alphaMapUv),_.push(S.lightMapUv),_.push(S.aoMapUv),_.push(S.bumpMapUv),_.push(S.normalMapUv),_.push(S.displacementMapUv),_.push(S.emissiveMapUv),_.push(S.metalnessMapUv),_.push(S.roughnessMapUv),_.push(S.anisotropyMapUv),_.push(S.clearcoatMapUv),_.push(S.clearcoatNormalMapUv),_.push(S.clearcoatRoughnessMapUv),_.push(S.iridescenceMapUv),_.push(S.iridescenceThicknessMapUv),_.push(S.sheenColorMapUv),_.push(S.sheenRoughnessMapUv),_.push(S.specularMapUv),_.push(S.specularColorMapUv),_.push(S.specularIntensityMapUv),_.push(S.transmissionMapUv),_.push(S.thicknessMapUv),_.push(S.combine),_.push(S.fogExp2),_.push(S.sizeAttenuation),_.push(S.morphTargetsCount),_.push(S.morphAttributeCount),_.push(S.numDirLights),_.push(S.numPointLights),_.push(S.numSpotLights),_.push(S.numSpotLightMaps),_.push(S.numHemiLights),_.push(S.numRectAreaLights),_.push(S.numDirLightShadows),_.push(S.numPointLightShadows),_.push(S.numSpotLightShadows),_.push(S.numSpotLightShadowsWithMaps),_.push(S.numLightProbes),_.push(S.shadowMapType),_.push(S.toneMapping),_.push(S.numClippingPlanes),_.push(S.numClipIntersection),_.push(S.depthPacking)}function y(_,S){a.disableAll(),S.supportsVertexTextures&&a.enable(0),S.instancing&&a.enable(1),S.instancingColor&&a.enable(2),S.instancingMorph&&a.enable(3),S.matcap&&a.enable(4),S.envMap&&a.enable(5),S.normalMapObjectSpace&&a.enable(6),S.normalMapTangentSpace&&a.enable(7),S.clearcoat&&a.enable(8),S.iridescence&&a.enable(9),S.alphaTest&&a.enable(10),S.vertexColors&&a.enable(11),S.vertexAlphas&&a.enable(12),S.vertexUv1s&&a.enable(13),S.vertexUv2s&&a.enable(14),S.vertexUv3s&&a.enable(15),S.vertexTangents&&a.enable(16),S.anisotropy&&a.enable(17),S.alphaHash&&a.enable(18),S.batching&&a.enable(19),S.dispersion&&a.enable(20),S.batchingColor&&a.enable(21),_.push(a.mask),a.disableAll(),S.fog&&a.enable(0),S.useFog&&a.enable(1),S.flatShading&&a.enable(2),S.logarithmicDepthBuffer&&a.enable(3),S.reverseDepthBuffer&&a.enable(4),S.skinning&&a.enable(5),S.morphTargets&&a.enable(6),S.morphNormals&&a.enable(7),S.morphColors&&a.enable(8),S.premultipliedAlpha&&a.enable(9),S.shadowMapEnabled&&a.enable(10),S.doubleSided&&a.enable(11),S.flipSided&&a.enable(12),S.useDepthPacking&&a.enable(13),S.dithering&&a.enable(14),S.transmission&&a.enable(15),S.sheen&&a.enable(16),S.opaque&&a.enable(17),S.pointsUvs&&a.enable(18),S.decodeVideoTexture&&a.enable(19),S.decodeVideoTextureEmissive&&a.enable(20),S.alphaToCoverage&&a.enable(21),_.push(a.mask)}function v(_){const S=p[_.type];let R;if(S){const F=Dn[S];R=Bd.clone(F.uniforms)}else R=_.uniforms;return R}function T(_,S){let R;for(let F=0,z=h.length;F<z;F++){const A=h[F];if(A.cacheKey===S){R=A,++R.usedTimes;break}}return R===void 0&&(R=new tg(s,S,_,o),h.push(R)),R}function M(_){if(--_.usedTimes===0){const S=h.indexOf(_);h[S]=h[h.length-1],h.pop(),_.destroy()}}function E(_){c.remove(_)}function b(){c.dispose()}return{getParameters:g,getProgramCacheKey:m,getUniforms:v,acquireProgram:T,releaseProgram:M,releaseShaderCache:E,programs:h,dispose:b}}function og(){let s=new WeakMap;function t(r){return s.has(r)}function e(r){let a=s.get(r);return a===void 0&&(a={},s.set(r,a)),a}function n(r){s.delete(r)}function i(r,a,c){s.get(r)[a]=c}function o(){s=new WeakMap}return{has:t,get:e,remove:n,update:i,dispose:o}}function rg(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.material.id!==t.material.id?s.material.id-t.material.id:s.z!==t.z?s.z-t.z:s.id-t.id}function Sl(s,t){return s.groupOrder!==t.groupOrder?s.groupOrder-t.groupOrder:s.renderOrder!==t.renderOrder?s.renderOrder-t.renderOrder:s.z!==t.z?t.z-s.z:s.id-t.id}function bl(){const s=[];let t=0;const e=[],n=[],i=[];function o(){t=0,e.length=0,n.length=0,i.length=0}function r(d,u,f,p,x,g){let m=s[t];return m===void 0?(m={id:d.id,object:d,geometry:u,material:f,groupOrder:p,renderOrder:d.renderOrder,z:x,group:g},s[t]=m):(m.id=d.id,m.object=d,m.geometry=u,m.material=f,m.groupOrder=p,m.renderOrder=d.renderOrder,m.z=x,m.group=g),t++,m}function a(d,u,f,p,x,g){const m=r(d,u,f,p,x,g);f.transmission>0?n.push(m):f.transparent===!0?i.push(m):e.push(m)}function c(d,u,f,p,x,g){const m=r(d,u,f,p,x,g);f.transmission>0?n.unshift(m):f.transparent===!0?i.unshift(m):e.unshift(m)}function l(d,u){e.length>1&&e.sort(d||rg),n.length>1&&n.sort(u||Sl),i.length>1&&i.sort(u||Sl)}function h(){for(let d=t,u=s.length;d<u;d++){const f=s[d];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:e,transmissive:n,transparent:i,init:o,push:a,unshift:c,finish:h,sort:l}}function ag(){let s=new WeakMap;function t(n,i){const o=s.get(n);let r;return o===void 0?(r=new bl,s.set(n,[r])):i>=o.length?(r=new bl,o.push(r)):r=o[i],r}function e(){s=new WeakMap}return{get:t,dispose:e}}function cg(){const s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new P,color:new Ot};break;case"SpotLight":e={position:new P,direction:new P,color:new Ot,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new P,color:new Ot,distance:0,decay:0};break;case"HemisphereLight":e={direction:new P,skyColor:new Ot,groundColor:new Ot};break;case"RectAreaLight":e={color:new Ot,position:new P,halfWidth:new P,halfHeight:new P};break}return s[t.id]=e,e}}}function lg(){const s={};return{get:function(t){if(s[t.id]!==void 0)return s[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ft};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ft};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ft,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[t.id]=e,e}}}let hg=0;function ug(s,t){return(t.castShadow?2:0)-(s.castShadow?2:0)+(t.map?1:0)-(s.map?1:0)}function dg(s){const t=new cg,e=lg(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new P);const i=new P,o=new $t,r=new $t;function a(l){let h=0,d=0,u=0;for(let _=0;_<9;_++)n.probe[_].set(0,0,0);let f=0,p=0,x=0,g=0,m=0,w=0,y=0,v=0,T=0,M=0,E=0;l.sort(ug);for(let _=0,S=l.length;_<S;_++){const R=l[_],F=R.color,z=R.intensity,A=R.distance,U=R.shadow&&R.shadow.map?R.shadow.map.texture:null;if(R.isAmbientLight)h+=F.r*z,d+=F.g*z,u+=F.b*z;else if(R.isLightProbe){for(let N=0;N<9;N++)n.probe[N].addScaledVector(R.sh.coefficients[N],z);E++}else if(R.isDirectionalLight){const N=t.get(R);if(N.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){const D=R.shadow,O=e.get(R);O.shadowIntensity=D.intensity,O.shadowBias=D.bias,O.shadowNormalBias=D.normalBias,O.shadowRadius=D.radius,O.shadowMapSize=D.mapSize,n.directionalShadow[f]=O,n.directionalShadowMap[f]=U,n.directionalShadowMatrix[f]=R.shadow.matrix,w++}n.directional[f]=N,f++}else if(R.isSpotLight){const N=t.get(R);N.position.setFromMatrixPosition(R.matrixWorld),N.color.copy(F).multiplyScalar(z),N.distance=A,N.coneCos=Math.cos(R.angle),N.penumbraCos=Math.cos(R.angle*(1-R.penumbra)),N.decay=R.decay,n.spot[x]=N;const D=R.shadow;if(R.map&&(n.spotLightMap[T]=R.map,T++,D.updateMatrices(R),R.castShadow&&M++),n.spotLightMatrix[x]=D.matrix,R.castShadow){const O=e.get(R);O.shadowIntensity=D.intensity,O.shadowBias=D.bias,O.shadowNormalBias=D.normalBias,O.shadowRadius=D.radius,O.shadowMapSize=D.mapSize,n.spotShadow[x]=O,n.spotShadowMap[x]=U,v++}x++}else if(R.isRectAreaLight){const N=t.get(R);N.color.copy(F).multiplyScalar(z),N.halfWidth.set(R.width*.5,0,0),N.halfHeight.set(0,R.height*.5,0),n.rectArea[g]=N,g++}else if(R.isPointLight){const N=t.get(R);if(N.color.copy(R.color).multiplyScalar(R.intensity),N.distance=R.distance,N.decay=R.decay,R.castShadow){const D=R.shadow,O=e.get(R);O.shadowIntensity=D.intensity,O.shadowBias=D.bias,O.shadowNormalBias=D.normalBias,O.shadowRadius=D.radius,O.shadowMapSize=D.mapSize,O.shadowCameraNear=D.camera.near,O.shadowCameraFar=D.camera.far,n.pointShadow[p]=O,n.pointShadowMap[p]=U,n.pointShadowMatrix[p]=R.shadow.matrix,y++}n.point[p]=N,p++}else if(R.isHemisphereLight){const N=t.get(R);N.skyColor.copy(R.color).multiplyScalar(z),N.groundColor.copy(R.groundColor).multiplyScalar(z),n.hemi[m]=N,m++}}g>0&&(s.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=It.LTC_FLOAT_1,n.rectAreaLTC2=It.LTC_FLOAT_2):(n.rectAreaLTC1=It.LTC_HALF_1,n.rectAreaLTC2=It.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=d,n.ambient[2]=u;const b=n.hash;(b.directionalLength!==f||b.pointLength!==p||b.spotLength!==x||b.rectAreaLength!==g||b.hemiLength!==m||b.numDirectionalShadows!==w||b.numPointShadows!==y||b.numSpotShadows!==v||b.numSpotMaps!==T||b.numLightProbes!==E)&&(n.directional.length=f,n.spot.length=x,n.rectArea.length=g,n.point.length=p,n.hemi.length=m,n.directionalShadow.length=w,n.directionalShadowMap.length=w,n.pointShadow.length=y,n.pointShadowMap.length=y,n.spotShadow.length=v,n.spotShadowMap.length=v,n.directionalShadowMatrix.length=w,n.pointShadowMatrix.length=y,n.spotLightMatrix.length=v+T-M,n.spotLightMap.length=T,n.numSpotLightShadowsWithMaps=M,n.numLightProbes=E,b.directionalLength=f,b.pointLength=p,b.spotLength=x,b.rectAreaLength=g,b.hemiLength=m,b.numDirectionalShadows=w,b.numPointShadows=y,b.numSpotShadows=v,b.numSpotMaps=T,b.numLightProbes=E,n.version=hg++)}function c(l,h){let d=0,u=0,f=0,p=0,x=0;const g=h.matrixWorldInverse;for(let m=0,w=l.length;m<w;m++){const y=l[m];if(y.isDirectionalLight){const v=n.directional[d];v.direction.setFromMatrixPosition(y.matrixWorld),i.setFromMatrixPosition(y.target.matrixWorld),v.direction.sub(i),v.direction.transformDirection(g),d++}else if(y.isSpotLight){const v=n.spot[f];v.position.setFromMatrixPosition(y.matrixWorld),v.position.applyMatrix4(g),v.direction.setFromMatrixPosition(y.matrixWorld),i.setFromMatrixPosition(y.target.matrixWorld),v.direction.sub(i),v.direction.transformDirection(g),f++}else if(y.isRectAreaLight){const v=n.rectArea[p];v.position.setFromMatrixPosition(y.matrixWorld),v.position.applyMatrix4(g),r.identity(),o.copy(y.matrixWorld),o.premultiply(g),r.extractRotation(o),v.halfWidth.set(y.width*.5,0,0),v.halfHeight.set(0,y.height*.5,0),v.halfWidth.applyMatrix4(r),v.halfHeight.applyMatrix4(r),p++}else if(y.isPointLight){const v=n.point[u];v.position.setFromMatrixPosition(y.matrixWorld),v.position.applyMatrix4(g),u++}else if(y.isHemisphereLight){const v=n.hemi[x];v.direction.setFromMatrixPosition(y.matrixWorld),v.direction.transformDirection(g),x++}}}return{setup:a,setupView:c,state:n}}function El(s){const t=new dg(s),e=[],n=[];function i(h){l.camera=h,e.length=0,n.length=0}function o(h){e.push(h)}function r(h){n.push(h)}function a(){t.setup(e)}function c(h){t.setupView(e,h)}const l={lightsArray:e,shadowsArray:n,camera:null,lights:t,transmissionRenderTarget:{}};return{init:i,state:l,setupLights:a,setupLightsView:c,pushLight:o,pushShadow:r}}function fg(s){let t=new WeakMap;function e(i,o=0){const r=t.get(i);let a;return r===void 0?(a=new El(s),t.set(i,[a])):o>=r.length?(a=new El(s),r.push(a)):a=r[o],a}function n(){t=new WeakMap}return{get:e,dispose:n}}class Xh extends Es{static get type(){return"MeshDepthMaterial"}constructor(t){super(),this.isMeshDepthMaterial=!0,this.depthPacking=qu,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class pg extends Es{static get type(){return"MeshDistanceMaterial"}constructor(t){super(),this.isMeshDistanceMaterial=!0,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}const mg=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,gg=`uniform sampler2D shadow_pass;
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
}`;function vg(s,t,e){let n=new xs;const i=new Ft,o=new Ft,r=new Ee,a=new Xh({depthPacking:Eh}),c=new pg,l={},h=e.maxTextureSize,d={[Jn]:Je,[Je]:Jn,[Be]:Be},u=new Ie({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ft},radius:{value:4}},vertexShader:mg,fragmentShader:gg}),f=u.clone();f.defines.HORIZONTAL_PASS=1;const p=new re;p.setAttribute("position",new ge(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const x=new pe(p,u),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=dh;let m=this.type;this.render=function(M,E,b){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||M.length===0)return;const _=s.getRenderTarget(),S=s.getActiveCubeFace(),R=s.getActiveMipmapLevel(),F=s.state;F.setBlending(pi),F.buffers.color.setClear(1,1,1,1),F.buffers.depth.setTest(!0),F.setScissorTest(!1);const z=m!==Wn&&this.type===Wn,A=m===Wn&&this.type!==Wn;for(let U=0,N=M.length;U<N;U++){const D=M[U],O=D.shadow;if(O===void 0){console.warn("THREE.WebGLShadowMap:",D,"has no shadow.");continue}if(O.autoUpdate===!1&&O.needsUpdate===!1)continue;i.copy(O.mapSize);const k=O.getFrameExtents();if(i.multiply(k),o.copy(O.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(o.x=Math.floor(h/k.x),i.x=o.x*k.x,O.mapSize.x=o.x),i.y>h&&(o.y=Math.floor(h/k.y),i.y=o.y*k.y,O.mapSize.y=o.y)),O.map===null||z===!0||A===!0){const G=this.type!==Wn?{minFilter:rn,magFilter:rn}:{};O.map!==null&&O.map.dispose(),O.map=new ln(i.x,i.y,G),O.map.texture.name=D.name+".shadowMap",O.camera.updateProjectionMatrix()}s.setRenderTarget(O.map),s.clear();const B=O.getViewportCount();for(let G=0;G<B;G++){const K=O.getViewport(G);r.set(o.x*K.x,o.y*K.y,o.x*K.z,o.y*K.w),F.viewport(r),O.updateMatrices(D,G),n=O.getFrustum(),v(E,b,O.camera,D,this.type)}O.isPointLightShadow!==!0&&this.type===Wn&&w(O,b),O.needsUpdate=!1}m=this.type,g.needsUpdate=!1,s.setRenderTarget(_,S,R)};function w(M,E){const b=t.update(x);u.defines.VSM_SAMPLES!==M.blurSamples&&(u.defines.VSM_SAMPLES=M.blurSamples,f.defines.VSM_SAMPLES=M.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),M.mapPass===null&&(M.mapPass=new ln(i.x,i.y)),u.uniforms.shadow_pass.value=M.map.texture,u.uniforms.resolution.value=M.mapSize,u.uniforms.radius.value=M.radius,s.setRenderTarget(M.mapPass),s.clear(),s.renderBufferDirect(E,null,b,u,x,null),f.uniforms.shadow_pass.value=M.mapPass.texture,f.uniforms.resolution.value=M.mapSize,f.uniforms.radius.value=M.radius,s.setRenderTarget(M.map),s.clear(),s.renderBufferDirect(E,null,b,f,x,null)}function y(M,E,b,_){let S=null;const R=b.isPointLight===!0?M.customDistanceMaterial:M.customDepthMaterial;if(R!==void 0)S=R;else if(S=b.isPointLight===!0?c:a,s.localClippingEnabled&&E.clipShadows===!0&&Array.isArray(E.clippingPlanes)&&E.clippingPlanes.length!==0||E.displacementMap&&E.displacementScale!==0||E.alphaMap&&E.alphaTest>0||E.map&&E.alphaTest>0){const F=S.uuid,z=E.uuid;let A=l[F];A===void 0&&(A={},l[F]=A);let U=A[z];U===void 0&&(U=S.clone(),A[z]=U,E.addEventListener("dispose",T)),S=U}if(S.visible=E.visible,S.wireframe=E.wireframe,_===Wn?S.side=E.shadowSide!==null?E.shadowSide:E.side:S.side=E.shadowSide!==null?E.shadowSide:d[E.side],S.alphaMap=E.alphaMap,S.alphaTest=E.alphaTest,S.map=E.map,S.clipShadows=E.clipShadows,S.clippingPlanes=E.clippingPlanes,S.clipIntersection=E.clipIntersection,S.displacementMap=E.displacementMap,S.displacementScale=E.displacementScale,S.displacementBias=E.displacementBias,S.wireframeLinewidth=E.wireframeLinewidth,S.linewidth=E.linewidth,b.isPointLight===!0&&S.isMeshDistanceMaterial===!0){const F=s.properties.get(S);F.light=b}return S}function v(M,E,b,_,S){if(M.visible===!1)return;if(M.layers.test(E.layers)&&(M.isMesh||M.isLine||M.isPoints)&&(M.castShadow||M.receiveShadow&&S===Wn)&&(!M.frustumCulled||n.intersectsObject(M))){M.modelViewMatrix.multiplyMatrices(b.matrixWorldInverse,M.matrixWorld);const z=t.update(M),A=M.material;if(Array.isArray(A)){const U=z.groups;for(let N=0,D=U.length;N<D;N++){const O=U[N],k=A[O.materialIndex];if(k&&k.visible){const B=y(M,k,_,S);M.onBeforeShadow(s,M,E,b,z,B,O),s.renderBufferDirect(b,null,z,B,M,O),M.onAfterShadow(s,M,E,b,z,B,O)}}}else if(A.visible){const U=y(M,A,_,S);M.onBeforeShadow(s,M,E,b,z,U,null),s.renderBufferDirect(b,null,z,U,M,null),M.onAfterShadow(s,M,E,b,z,U,null)}}const F=M.children;for(let z=0,A=F.length;z<A;z++)v(F[z],E,b,_,S)}function T(M){M.target.removeEventListener("dispose",T);for(const b in l){const _=l[b],S=M.target.uuid;S in _&&(_[S].dispose(),delete _[S])}}}const xg={[ua]:da,[fa]:ga,[pa]:va,[us]:ma,[da]:ua,[ga]:fa,[va]:pa,[ma]:us};function _g(s,t){function e(){let W=!1;const Tt=new Ee;let rt=null;const ft=new Ee(0,0,0,0);return{setMask:function(St){rt!==St&&!W&&(s.colorMask(St,St,St,St),rt=St)},setLocked:function(St){W=St},setClear:function(St,Et,Zt,fe,we){we===!0&&(St*=fe,Et*=fe,Zt*=fe),Tt.set(St,Et,Zt,fe),ft.equals(Tt)===!1&&(s.clearColor(St,Et,Zt,fe),ft.copy(Tt))},reset:function(){W=!1,rt=null,ft.set(-1,0,0,0)}}}function n(){let W=!1,Tt=!1,rt=null,ft=null,St=null;return{setReversed:function(Et){if(Tt!==Et){const Zt=t.get("EXT_clip_control");Tt?Zt.clipControlEXT(Zt.LOWER_LEFT_EXT,Zt.ZERO_TO_ONE_EXT):Zt.clipControlEXT(Zt.LOWER_LEFT_EXT,Zt.NEGATIVE_ONE_TO_ONE_EXT);const fe=St;St=null,this.setClear(fe)}Tt=Et},getReversed:function(){return Tt},setTest:function(Et){Et?J(s.DEPTH_TEST):et(s.DEPTH_TEST)},setMask:function(Et){rt!==Et&&!W&&(s.depthMask(Et),rt=Et)},setFunc:function(Et){if(Tt&&(Et=xg[Et]),ft!==Et){switch(Et){case ua:s.depthFunc(s.NEVER);break;case da:s.depthFunc(s.ALWAYS);break;case fa:s.depthFunc(s.LESS);break;case us:s.depthFunc(s.LEQUAL);break;case pa:s.depthFunc(s.EQUAL);break;case ma:s.depthFunc(s.GEQUAL);break;case ga:s.depthFunc(s.GREATER);break;case va:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}ft=Et}},setLocked:function(Et){W=Et},setClear:function(Et){St!==Et&&(Tt&&(Et=1-Et),s.clearDepth(Et),St=Et)},reset:function(){W=!1,rt=null,ft=null,St=null,Tt=!1}}}function i(){let W=!1,Tt=null,rt=null,ft=null,St=null,Et=null,Zt=null,fe=null,we=null;return{setTest:function(le){W||(le?J(s.STENCIL_TEST):et(s.STENCIL_TEST))},setMask:function(le){Tt!==le&&!W&&(s.stencilMask(le),Tt=le)},setFunc:function(le,Re,qe){(rt!==le||ft!==Re||St!==qe)&&(s.stencilFunc(le,Re,qe),rt=le,ft=Re,St=qe)},setOp:function(le,Re,qe){(Et!==le||Zt!==Re||fe!==qe)&&(s.stencilOp(le,Re,qe),Et=le,Zt=Re,fe=qe)},setLocked:function(le){W=le},setClear:function(le){we!==le&&(s.clearStencil(le),we=le)},reset:function(){W=!1,Tt=null,rt=null,ft=null,St=null,Et=null,Zt=null,fe=null,we=null}}}const o=new e,r=new n,a=new i,c=new WeakMap,l=new WeakMap;let h={},d={},u=new WeakMap,f=[],p=null,x=!1,g=null,m=null,w=null,y=null,v=null,T=null,M=null,E=new Ot(0,0,0),b=0,_=!1,S=null,R=null,F=null,z=null,A=null;const U=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let N=!1,D=0;const O=s.getParameter(s.VERSION);O.indexOf("WebGL")!==-1?(D=parseFloat(/^WebGL (\d)/.exec(O)[1]),N=D>=1):O.indexOf("OpenGL ES")!==-1&&(D=parseFloat(/^OpenGL ES (\d)/.exec(O)[1]),N=D>=2);let k=null,B={};const G=s.getParameter(s.SCISSOR_BOX),K=s.getParameter(s.VIEWPORT),nt=new Ee().fromArray(G),q=new Ee().fromArray(K);function tt(W,Tt,rt,ft){const St=new Uint8Array(4),Et=s.createTexture();s.bindTexture(W,Et),s.texParameteri(W,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(W,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let Zt=0;Zt<rt;Zt++)W===s.TEXTURE_3D||W===s.TEXTURE_2D_ARRAY?s.texImage3D(Tt,0,s.RGBA,1,1,ft,0,s.RGBA,s.UNSIGNED_BYTE,St):s.texImage2D(Tt+Zt,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,St);return Et}const ut={};ut[s.TEXTURE_2D]=tt(s.TEXTURE_2D,s.TEXTURE_2D,1),ut[s.TEXTURE_CUBE_MAP]=tt(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),ut[s.TEXTURE_2D_ARRAY]=tt(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),ut[s.TEXTURE_3D]=tt(s.TEXTURE_3D,s.TEXTURE_3D,1,1),o.setClear(0,0,0,1),r.setClear(1),a.setClear(0),J(s.DEPTH_TEST),r.setFunc(us),pt(!1),Ct(Cc),J(s.CULL_FACE),H(pi);function J(W){h[W]!==!0&&(s.enable(W),h[W]=!0)}function et(W){h[W]!==!1&&(s.disable(W),h[W]=!1)}function at(W,Tt){return d[W]!==Tt?(s.bindFramebuffer(W,Tt),d[W]=Tt,W===s.DRAW_FRAMEBUFFER&&(d[s.FRAMEBUFFER]=Tt),W===s.FRAMEBUFFER&&(d[s.DRAW_FRAMEBUFFER]=Tt),!0):!1}function gt(W,Tt){let rt=f,ft=!1;if(W){rt=u.get(Tt),rt===void 0&&(rt=[],u.set(Tt,rt));const St=W.textures;if(rt.length!==St.length||rt[0]!==s.COLOR_ATTACHMENT0){for(let Et=0,Zt=St.length;Et<Zt;Et++)rt[Et]=s.COLOR_ATTACHMENT0+Et;rt.length=St.length,ft=!0}}else rt[0]!==s.BACK&&(rt[0]=s.BACK,ft=!0);ft&&s.drawBuffers(rt)}function dt(W){return p!==W?(s.useProgram(W),p=W,!0):!1}const st={[Ci]:s.FUNC_ADD,[_u]:s.FUNC_SUBTRACT,[wu]:s.FUNC_REVERSE_SUBTRACT};st[yu]=s.MIN,st[Mu]=s.MAX;const lt={[Su]:s.ZERO,[bu]:s.ONE,[Eu]:s.SRC_COLOR,[la]:s.SRC_ALPHA,[Lu]:s.SRC_ALPHA_SATURATE,[Ru]:s.DST_COLOR,[Au]:s.DST_ALPHA,[Tu]:s.ONE_MINUS_SRC_COLOR,[ha]:s.ONE_MINUS_SRC_ALPHA,[Pu]:s.ONE_MINUS_DST_COLOR,[Cu]:s.ONE_MINUS_DST_ALPHA,[Du]:s.CONSTANT_COLOR,[Iu]:s.ONE_MINUS_CONSTANT_COLOR,[zu]:s.CONSTANT_ALPHA,[Uu]:s.ONE_MINUS_CONSTANT_ALPHA};function H(W,Tt,rt,ft,St,Et,Zt,fe,we,le){if(W===pi){x===!0&&(et(s.BLEND),x=!1);return}if(x===!1&&(J(s.BLEND),x=!0),W!==xu){if(W!==g||le!==_){if((m!==Ci||v!==Ci)&&(s.blendEquation(s.FUNC_ADD),m=Ci,v=Ci),le)switch(W){case $n:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case Rc:s.blendFunc(s.ONE,s.ONE);break;case Pc:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case Lc:s.blendFuncSeparate(s.ZERO,s.SRC_COLOR,s.ZERO,s.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",W);break}else switch(W){case $n:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case Rc:s.blendFunc(s.SRC_ALPHA,s.ONE);break;case Pc:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case Lc:s.blendFunc(s.ZERO,s.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",W);break}w=null,y=null,T=null,M=null,E.set(0,0,0),b=0,g=W,_=le}return}St=St||Tt,Et=Et||rt,Zt=Zt||ft,(Tt!==m||St!==v)&&(s.blendEquationSeparate(st[Tt],st[St]),m=Tt,v=St),(rt!==w||ft!==y||Et!==T||Zt!==M)&&(s.blendFuncSeparate(lt[rt],lt[ft],lt[Et],lt[Zt]),w=rt,y=ft,T=Et,M=Zt),(fe.equals(E)===!1||we!==b)&&(s.blendColor(fe.r,fe.g,fe.b,we),E.copy(fe),b=we),g=W,_=!1}function Lt(W,Tt){W.side===Be?et(s.CULL_FACE):J(s.CULL_FACE);let rt=W.side===Je;Tt&&(rt=!rt),pt(rt),W.blending===$n&&W.transparent===!1?H(pi):H(W.blending,W.blendEquation,W.blendSrc,W.blendDst,W.blendEquationAlpha,W.blendSrcAlpha,W.blendDstAlpha,W.blendColor,W.blendAlpha,W.premultipliedAlpha),r.setFunc(W.depthFunc),r.setTest(W.depthTest),r.setMask(W.depthWrite),o.setMask(W.colorWrite);const ft=W.stencilWrite;a.setTest(ft),ft&&(a.setMask(W.stencilWriteMask),a.setFunc(W.stencilFunc,W.stencilRef,W.stencilFuncMask),a.setOp(W.stencilFail,W.stencilZFail,W.stencilZPass)),kt(W.polygonOffset,W.polygonOffsetFactor,W.polygonOffsetUnits),W.alphaToCoverage===!0?J(s.SAMPLE_ALPHA_TO_COVERAGE):et(s.SAMPLE_ALPHA_TO_COVERAGE)}function pt(W){S!==W&&(W?s.frontFace(s.CW):s.frontFace(s.CCW),S=W)}function Ct(W){W!==gu?(J(s.CULL_FACE),W!==R&&(W===Cc?s.cullFace(s.BACK):W===vu?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):et(s.CULL_FACE),R=W}function vt(W){W!==F&&(N&&s.lineWidth(W),F=W)}function kt(W,Tt,rt){W?(J(s.POLYGON_OFFSET_FILL),(z!==Tt||A!==rt)&&(s.polygonOffset(Tt,rt),z=Tt,A=rt)):et(s.POLYGON_OFFSET_FILL)}function wt(W){W?J(s.SCISSOR_TEST):et(s.SCISSOR_TEST)}function I(W){W===void 0&&(W=s.TEXTURE0+U-1),k!==W&&(s.activeTexture(W),k=W)}function C(W,Tt,rt){rt===void 0&&(k===null?rt=s.TEXTURE0+U-1:rt=k);let ft=B[rt];ft===void 0&&(ft={type:void 0,texture:void 0},B[rt]=ft),(ft.type!==W||ft.texture!==Tt)&&(k!==rt&&(s.activeTexture(rt),k=rt),s.bindTexture(W,Tt||ut[W]),ft.type=W,ft.texture=Tt)}function Z(){const W=B[k];W!==void 0&&W.type!==void 0&&(s.bindTexture(W.type,null),W.type=void 0,W.texture=void 0)}function Y(){try{s.compressedTexImage2D.apply(s,arguments)}catch(W){console.error("THREE.WebGLState:",W)}}function V(){try{s.compressedTexImage3D.apply(s,arguments)}catch(W){console.error("THREE.WebGLState:",W)}}function Q(){try{s.texSubImage2D.apply(s,arguments)}catch(W){console.error("THREE.WebGLState:",W)}}function mt(){try{s.texSubImage3D.apply(s,arguments)}catch(W){console.error("THREE.WebGLState:",W)}}function ct(){try{s.compressedTexSubImage2D.apply(s,arguments)}catch(W){console.error("THREE.WebGLState:",W)}}function _t(){try{s.compressedTexSubImage3D.apply(s,arguments)}catch(W){console.error("THREE.WebGLState:",W)}}function Gt(){try{s.texStorage2D.apply(s,arguments)}catch(W){console.error("THREE.WebGLState:",W)}}function ht(){try{s.texStorage3D.apply(s,arguments)}catch(W){console.error("THREE.WebGLState:",W)}}function yt(){try{s.texImage2D.apply(s,arguments)}catch(W){console.error("THREE.WebGLState:",W)}}function Pt(){try{s.texImage3D.apply(s,arguments)}catch(W){console.error("THREE.WebGLState:",W)}}function zt(W){nt.equals(W)===!1&&(s.scissor(W.x,W.y,W.z,W.w),nt.copy(W))}function Mt(W){q.equals(W)===!1&&(s.viewport(W.x,W.y,W.z,W.w),q.copy(W))}function Qt(W,Tt){let rt=l.get(Tt);rt===void 0&&(rt=new WeakMap,l.set(Tt,rt));let ft=rt.get(W);ft===void 0&&(ft=s.getUniformBlockIndex(Tt,W.name),rt.set(W,ft))}function qt(W,Tt){const ft=l.get(Tt).get(W);c.get(Tt)!==ft&&(s.uniformBlockBinding(Tt,ft,W.__bindingPointIndex),c.set(Tt,ft))}function me(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),r.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),h={},k=null,B={},d={},u=new WeakMap,f=[],p=null,x=!1,g=null,m=null,w=null,y=null,v=null,T=null,M=null,E=new Ot(0,0,0),b=0,_=!1,S=null,R=null,F=null,z=null,A=null,nt.set(0,0,s.canvas.width,s.canvas.height),q.set(0,0,s.canvas.width,s.canvas.height),o.reset(),r.reset(),a.reset()}return{buffers:{color:o,depth:r,stencil:a},enable:J,disable:et,bindFramebuffer:at,drawBuffers:gt,useProgram:dt,setBlending:H,setMaterial:Lt,setFlipSided:pt,setCullFace:Ct,setLineWidth:vt,setPolygonOffset:kt,setScissorTest:wt,activeTexture:I,bindTexture:C,unbindTexture:Z,compressedTexImage2D:Y,compressedTexImage3D:V,texImage2D:yt,texImage3D:Pt,updateUBOMapping:Qt,uniformBlockBinding:qt,texStorage2D:Gt,texStorage3D:ht,texSubImage2D:Q,texSubImage3D:mt,compressedTexSubImage2D:ct,compressedTexSubImage3D:_t,scissor:zt,viewport:Mt,reset:me}}function Tl(s,t,e,n){const i=wg(n);switch(e){case _h:return s*t;case yh:return s*t;case Mh:return s*t*2;case io:return s*t/i.components*i.byteLength;case ar:return s*t/i.components*i.byteLength;case Sh:return s*t*2/i.components*i.byteLength;case lc:return s*t*2/i.components*i.byteLength;case wh:return s*t*3/i.components*i.byteLength;case Ke:return s*t*4/i.components*i.byteLength;case hc:return s*t*4/i.components*i.byteLength;case jo:case Zo:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*8;case Ko:case Jo:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case Ma:case ba:return Math.max(s,16)*Math.max(t,8)/4;case ya:case Sa:return Math.max(s,8)*Math.max(t,8)/2;case Ea:case Ta:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*8;case Aa:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case Ca:return Math.floor((s+3)/4)*Math.floor((t+3)/4)*16;case Ra:return Math.floor((s+4)/5)*Math.floor((t+3)/4)*16;case Pa:return Math.floor((s+4)/5)*Math.floor((t+4)/5)*16;case La:return Math.floor((s+5)/6)*Math.floor((t+4)/5)*16;case Da:return Math.floor((s+5)/6)*Math.floor((t+5)/6)*16;case Ia:return Math.floor((s+7)/8)*Math.floor((t+4)/5)*16;case za:return Math.floor((s+7)/8)*Math.floor((t+5)/6)*16;case Ua:return Math.floor((s+7)/8)*Math.floor((t+7)/8)*16;case Na:return Math.floor((s+9)/10)*Math.floor((t+4)/5)*16;case Fa:return Math.floor((s+9)/10)*Math.floor((t+5)/6)*16;case Oa:return Math.floor((s+9)/10)*Math.floor((t+7)/8)*16;case ka:return Math.floor((s+9)/10)*Math.floor((t+9)/10)*16;case Ba:return Math.floor((s+11)/12)*Math.floor((t+9)/10)*16;case Ha:return Math.floor((s+11)/12)*Math.floor((t+11)/12)*16;case Qo:case Ga:case Va:return Math.ceil(s/4)*Math.ceil(t/4)*16;case bh:case Wa:return Math.ceil(s/4)*Math.ceil(t/4)*8;case Xa:case qa:return Math.ceil(s/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function wg(s){switch(s){case xn:case gh:return{byteLength:1,components:1};case no:case vh:case Rn:return{byteLength:2,components:1};case ac:case cc:return{byteLength:2,components:4};case Qn:case rc:case vn:return{byteLength:4,components:1};case xh:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${s}.`)}function yg(s,t,e,n,i,o,r){const a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new Ft,h=new WeakMap;let d;const u=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function p(I,C){return f?new OffscreenCanvas(I,C):ir("canvas")}function x(I,C,Z){let Y=1;const V=wt(I);if((V.width>Z||V.height>Z)&&(Y=Z/Math.max(V.width,V.height)),Y<1)if(typeof HTMLImageElement<"u"&&I instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&I instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&I instanceof ImageBitmap||typeof VideoFrame<"u"&&I instanceof VideoFrame){const Q=Math.floor(Y*V.width),mt=Math.floor(Y*V.height);d===void 0&&(d=p(Q,mt));const ct=C?p(Q,mt):d;return ct.width=Q,ct.height=mt,ct.getContext("2d").drawImage(I,0,0,Q,mt),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+V.width+"x"+V.height+") to ("+Q+"x"+mt+")."),ct}else return"data"in I&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+V.width+"x"+V.height+")."),I;return I}function g(I){return I.generateMipmaps}function m(I){s.generateMipmap(I)}function w(I){return I.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:I.isWebGL3DRenderTarget?s.TEXTURE_3D:I.isWebGLArrayRenderTarget||I.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function y(I,C,Z,Y,V=!1){if(I!==null){if(s[I]!==void 0)return s[I];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+I+"'")}let Q=C;if(C===s.RED&&(Z===s.FLOAT&&(Q=s.R32F),Z===s.HALF_FLOAT&&(Q=s.R16F),Z===s.UNSIGNED_BYTE&&(Q=s.R8)),C===s.RED_INTEGER&&(Z===s.UNSIGNED_BYTE&&(Q=s.R8UI),Z===s.UNSIGNED_SHORT&&(Q=s.R16UI),Z===s.UNSIGNED_INT&&(Q=s.R32UI),Z===s.BYTE&&(Q=s.R8I),Z===s.SHORT&&(Q=s.R16I),Z===s.INT&&(Q=s.R32I)),C===s.RG&&(Z===s.FLOAT&&(Q=s.RG32F),Z===s.HALF_FLOAT&&(Q=s.RG16F),Z===s.UNSIGNED_BYTE&&(Q=s.RG8)),C===s.RG_INTEGER&&(Z===s.UNSIGNED_BYTE&&(Q=s.RG8UI),Z===s.UNSIGNED_SHORT&&(Q=s.RG16UI),Z===s.UNSIGNED_INT&&(Q=s.RG32UI),Z===s.BYTE&&(Q=s.RG8I),Z===s.SHORT&&(Q=s.RG16I),Z===s.INT&&(Q=s.RG32I)),C===s.RGB_INTEGER&&(Z===s.UNSIGNED_BYTE&&(Q=s.RGB8UI),Z===s.UNSIGNED_SHORT&&(Q=s.RGB16UI),Z===s.UNSIGNED_INT&&(Q=s.RGB32UI),Z===s.BYTE&&(Q=s.RGB8I),Z===s.SHORT&&(Q=s.RGB16I),Z===s.INT&&(Q=s.RGB32I)),C===s.RGBA_INTEGER&&(Z===s.UNSIGNED_BYTE&&(Q=s.RGBA8UI),Z===s.UNSIGNED_SHORT&&(Q=s.RGBA16UI),Z===s.UNSIGNED_INT&&(Q=s.RGBA32UI),Z===s.BYTE&&(Q=s.RGBA8I),Z===s.SHORT&&(Q=s.RGBA16I),Z===s.INT&&(Q=s.RGBA32I)),C===s.RGB&&Z===s.UNSIGNED_INT_5_9_9_9_REV&&(Q=s.RGB9_E5),C===s.RGBA){const mt=V?cr:ve.getTransfer(Y);Z===s.FLOAT&&(Q=s.RGBA32F),Z===s.HALF_FLOAT&&(Q=s.RGBA16F),Z===s.UNSIGNED_BYTE&&(Q=mt===_e?s.SRGB8_ALPHA8:s.RGBA8),Z===s.UNSIGNED_SHORT_4_4_4_4&&(Q=s.RGBA4),Z===s.UNSIGNED_SHORT_5_5_5_1&&(Q=s.RGB5_A1)}return(Q===s.R16F||Q===s.R32F||Q===s.RG16F||Q===s.RG32F||Q===s.RGBA16F||Q===s.RGBA32F)&&t.get("EXT_color_buffer_float"),Q}function v(I,C){let Z;return I?C===null||C===Qn||C===ms?Z=s.DEPTH24_STENCIL8:C===vn?Z=s.DEPTH32F_STENCIL8:C===no&&(Z=s.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):C===null||C===Qn||C===ms?Z=s.DEPTH_COMPONENT24:C===vn?Z=s.DEPTH_COMPONENT32F:C===no&&(Z=s.DEPTH_COMPONENT16),Z}function T(I,C){return g(I)===!0||I.isFramebufferTexture&&I.minFilter!==rn&&I.minFilter!==xe?Math.log2(Math.max(C.width,C.height))+1:I.mipmaps!==void 0&&I.mipmaps.length>0?I.mipmaps.length:I.isCompressedTexture&&Array.isArray(I.image)?C.mipmaps.length:1}function M(I){const C=I.target;C.removeEventListener("dispose",M),b(C),C.isVideoTexture&&h.delete(C)}function E(I){const C=I.target;C.removeEventListener("dispose",E),S(C)}function b(I){const C=n.get(I);if(C.__webglInit===void 0)return;const Z=I.source,Y=u.get(Z);if(Y){const V=Y[C.__cacheKey];V.usedTimes--,V.usedTimes===0&&_(I),Object.keys(Y).length===0&&u.delete(Z)}n.remove(I)}function _(I){const C=n.get(I);s.deleteTexture(C.__webglTexture);const Z=I.source,Y=u.get(Z);delete Y[C.__cacheKey],r.memory.textures--}function S(I){const C=n.get(I);if(I.depthTexture&&(I.depthTexture.dispose(),n.remove(I.depthTexture)),I.isWebGLCubeRenderTarget)for(let Y=0;Y<6;Y++){if(Array.isArray(C.__webglFramebuffer[Y]))for(let V=0;V<C.__webglFramebuffer[Y].length;V++)s.deleteFramebuffer(C.__webglFramebuffer[Y][V]);else s.deleteFramebuffer(C.__webglFramebuffer[Y]);C.__webglDepthbuffer&&s.deleteRenderbuffer(C.__webglDepthbuffer[Y])}else{if(Array.isArray(C.__webglFramebuffer))for(let Y=0;Y<C.__webglFramebuffer.length;Y++)s.deleteFramebuffer(C.__webglFramebuffer[Y]);else s.deleteFramebuffer(C.__webglFramebuffer);if(C.__webglDepthbuffer&&s.deleteRenderbuffer(C.__webglDepthbuffer),C.__webglMultisampledFramebuffer&&s.deleteFramebuffer(C.__webglMultisampledFramebuffer),C.__webglColorRenderbuffer)for(let Y=0;Y<C.__webglColorRenderbuffer.length;Y++)C.__webglColorRenderbuffer[Y]&&s.deleteRenderbuffer(C.__webglColorRenderbuffer[Y]);C.__webglDepthRenderbuffer&&s.deleteRenderbuffer(C.__webglDepthRenderbuffer)}const Z=I.textures;for(let Y=0,V=Z.length;Y<V;Y++){const Q=n.get(Z[Y]);Q.__webglTexture&&(s.deleteTexture(Q.__webglTexture),r.memory.textures--),n.remove(Z[Y])}n.remove(I)}let R=0;function F(){R=0}function z(){const I=R;return I>=i.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+I+" texture units while this GPU supports only "+i.maxTextures),R+=1,I}function A(I){const C=[];return C.push(I.wrapS),C.push(I.wrapT),C.push(I.wrapR||0),C.push(I.magFilter),C.push(I.minFilter),C.push(I.anisotropy),C.push(I.internalFormat),C.push(I.format),C.push(I.type),C.push(I.generateMipmaps),C.push(I.premultiplyAlpha),C.push(I.flipY),C.push(I.unpackAlignment),C.push(I.colorSpace),C.join()}function U(I,C){const Z=n.get(I);if(I.isVideoTexture&&vt(I),I.isRenderTargetTexture===!1&&I.version>0&&Z.__version!==I.version){const Y=I.image;if(Y===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(Y.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{q(Z,I,C);return}}e.bindTexture(s.TEXTURE_2D,Z.__webglTexture,s.TEXTURE0+C)}function N(I,C){const Z=n.get(I);if(I.version>0&&Z.__version!==I.version){q(Z,I,C);return}e.bindTexture(s.TEXTURE_2D_ARRAY,Z.__webglTexture,s.TEXTURE0+C)}function D(I,C){const Z=n.get(I);if(I.version>0&&Z.__version!==I.version){q(Z,I,C);return}e.bindTexture(s.TEXTURE_3D,Z.__webglTexture,s.TEXTURE0+C)}function O(I,C){const Z=n.get(I);if(I.version>0&&Z.__version!==I.version){tt(Z,I,C);return}e.bindTexture(s.TEXTURE_CUBE_MAP,Z.__webglTexture,s.TEXTURE0+C)}const k={[ps]:s.REPEAT,[yn]:s.CLAMP_TO_EDGE,[wa]:s.MIRRORED_REPEAT},B={[rn]:s.NEAREST,[Xu]:s.NEAREST_MIPMAP_NEAREST,[_o]:s.NEAREST_MIPMAP_LINEAR,[xe]:s.LINEAR,[fr]:s.LINEAR_MIPMAP_NEAREST,[fi]:s.LINEAR_MIPMAP_LINEAR},G={[$u]:s.NEVER,[td]:s.ALWAYS,[ju]:s.LESS,[Ah]:s.LEQUAL,[Zu]:s.EQUAL,[Qu]:s.GEQUAL,[Ku]:s.GREATER,[Ju]:s.NOTEQUAL};function K(I,C){if(C.type===vn&&t.has("OES_texture_float_linear")===!1&&(C.magFilter===xe||C.magFilter===fr||C.magFilter===_o||C.magFilter===fi||C.minFilter===xe||C.minFilter===fr||C.minFilter===_o||C.minFilter===fi)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(I,s.TEXTURE_WRAP_S,k[C.wrapS]),s.texParameteri(I,s.TEXTURE_WRAP_T,k[C.wrapT]),(I===s.TEXTURE_3D||I===s.TEXTURE_2D_ARRAY)&&s.texParameteri(I,s.TEXTURE_WRAP_R,k[C.wrapR]),s.texParameteri(I,s.TEXTURE_MAG_FILTER,B[C.magFilter]),s.texParameteri(I,s.TEXTURE_MIN_FILTER,B[C.minFilter]),C.compareFunction&&(s.texParameteri(I,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(I,s.TEXTURE_COMPARE_FUNC,G[C.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(C.magFilter===rn||C.minFilter!==_o&&C.minFilter!==fi||C.type===vn&&t.has("OES_texture_float_linear")===!1)return;if(C.anisotropy>1||n.get(C).__currentAnisotropy){const Z=t.get("EXT_texture_filter_anisotropic");s.texParameterf(I,Z.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(C.anisotropy,i.getMaxAnisotropy())),n.get(C).__currentAnisotropy=C.anisotropy}}}function nt(I,C){let Z=!1;I.__webglInit===void 0&&(I.__webglInit=!0,C.addEventListener("dispose",M));const Y=C.source;let V=u.get(Y);V===void 0&&(V={},u.set(Y,V));const Q=A(C);if(Q!==I.__cacheKey){V[Q]===void 0&&(V[Q]={texture:s.createTexture(),usedTimes:0},r.memory.textures++,Z=!0),V[Q].usedTimes++;const mt=V[I.__cacheKey];mt!==void 0&&(V[I.__cacheKey].usedTimes--,mt.usedTimes===0&&_(C)),I.__cacheKey=Q,I.__webglTexture=V[Q].texture}return Z}function q(I,C,Z){let Y=s.TEXTURE_2D;(C.isDataArrayTexture||C.isCompressedArrayTexture)&&(Y=s.TEXTURE_2D_ARRAY),C.isData3DTexture&&(Y=s.TEXTURE_3D);const V=nt(I,C),Q=C.source;e.bindTexture(Y,I.__webglTexture,s.TEXTURE0+Z);const mt=n.get(Q);if(Q.version!==mt.__version||V===!0){e.activeTexture(s.TEXTURE0+Z);const ct=ve.getPrimaries(ve.workingColorSpace),_t=C.colorSpace===zn?null:ve.getPrimaries(C.colorSpace),Gt=C.colorSpace===zn||ct===_t?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,C.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,C.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,C.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,Gt);let ht=x(C.image,!1,i.maxTextureSize);ht=kt(C,ht);const yt=o.convert(C.format,C.colorSpace),Pt=o.convert(C.type);let zt=y(C.internalFormat,yt,Pt,C.colorSpace,C.isVideoTexture);K(Y,C);let Mt;const Qt=C.mipmaps,qt=C.isVideoTexture!==!0,me=mt.__version===void 0||V===!0,W=Q.dataReady,Tt=T(C,ht);if(C.isDepthTexture)zt=v(C.format===gs,C.type),me&&(qt?e.texStorage2D(s.TEXTURE_2D,1,zt,ht.width,ht.height):e.texImage2D(s.TEXTURE_2D,0,zt,ht.width,ht.height,0,yt,Pt,null));else if(C.isDataTexture)if(Qt.length>0){qt&&me&&e.texStorage2D(s.TEXTURE_2D,Tt,zt,Qt[0].width,Qt[0].height);for(let rt=0,ft=Qt.length;rt<ft;rt++)Mt=Qt[rt],qt?W&&e.texSubImage2D(s.TEXTURE_2D,rt,0,0,Mt.width,Mt.height,yt,Pt,Mt.data):e.texImage2D(s.TEXTURE_2D,rt,zt,Mt.width,Mt.height,0,yt,Pt,Mt.data);C.generateMipmaps=!1}else qt?(me&&e.texStorage2D(s.TEXTURE_2D,Tt,zt,ht.width,ht.height),W&&e.texSubImage2D(s.TEXTURE_2D,0,0,0,ht.width,ht.height,yt,Pt,ht.data)):e.texImage2D(s.TEXTURE_2D,0,zt,ht.width,ht.height,0,yt,Pt,ht.data);else if(C.isCompressedTexture)if(C.isCompressedArrayTexture){qt&&me&&e.texStorage3D(s.TEXTURE_2D_ARRAY,Tt,zt,Qt[0].width,Qt[0].height,ht.depth);for(let rt=0,ft=Qt.length;rt<ft;rt++)if(Mt=Qt[rt],C.format!==Ke)if(yt!==null)if(qt){if(W)if(C.layerUpdates.size>0){const St=Tl(Mt.width,Mt.height,C.format,C.type);for(const Et of C.layerUpdates){const Zt=Mt.data.subarray(Et*St/Mt.data.BYTES_PER_ELEMENT,(Et+1)*St/Mt.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,rt,0,0,Et,Mt.width,Mt.height,1,yt,Zt)}C.clearLayerUpdates()}else e.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,rt,0,0,0,Mt.width,Mt.height,ht.depth,yt,Mt.data)}else e.compressedTexImage3D(s.TEXTURE_2D_ARRAY,rt,zt,Mt.width,Mt.height,ht.depth,0,Mt.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else qt?W&&e.texSubImage3D(s.TEXTURE_2D_ARRAY,rt,0,0,0,Mt.width,Mt.height,ht.depth,yt,Pt,Mt.data):e.texImage3D(s.TEXTURE_2D_ARRAY,rt,zt,Mt.width,Mt.height,ht.depth,0,yt,Pt,Mt.data)}else{qt&&me&&e.texStorage2D(s.TEXTURE_2D,Tt,zt,Qt[0].width,Qt[0].height);for(let rt=0,ft=Qt.length;rt<ft;rt++)Mt=Qt[rt],C.format!==Ke?yt!==null?qt?W&&e.compressedTexSubImage2D(s.TEXTURE_2D,rt,0,0,Mt.width,Mt.height,yt,Mt.data):e.compressedTexImage2D(s.TEXTURE_2D,rt,zt,Mt.width,Mt.height,0,Mt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):qt?W&&e.texSubImage2D(s.TEXTURE_2D,rt,0,0,Mt.width,Mt.height,yt,Pt,Mt.data):e.texImage2D(s.TEXTURE_2D,rt,zt,Mt.width,Mt.height,0,yt,Pt,Mt.data)}else if(C.isDataArrayTexture)if(qt){if(me&&e.texStorage3D(s.TEXTURE_2D_ARRAY,Tt,zt,ht.width,ht.height,ht.depth),W)if(C.layerUpdates.size>0){const rt=Tl(ht.width,ht.height,C.format,C.type);for(const ft of C.layerUpdates){const St=ht.data.subarray(ft*rt/ht.data.BYTES_PER_ELEMENT,(ft+1)*rt/ht.data.BYTES_PER_ELEMENT);e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,ft,ht.width,ht.height,1,yt,Pt,St)}C.clearLayerUpdates()}else e.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,ht.width,ht.height,ht.depth,yt,Pt,ht.data)}else e.texImage3D(s.TEXTURE_2D_ARRAY,0,zt,ht.width,ht.height,ht.depth,0,yt,Pt,ht.data);else if(C.isData3DTexture)qt?(me&&e.texStorage3D(s.TEXTURE_3D,Tt,zt,ht.width,ht.height,ht.depth),W&&e.texSubImage3D(s.TEXTURE_3D,0,0,0,0,ht.width,ht.height,ht.depth,yt,Pt,ht.data)):e.texImage3D(s.TEXTURE_3D,0,zt,ht.width,ht.height,ht.depth,0,yt,Pt,ht.data);else if(C.isFramebufferTexture){if(me)if(qt)e.texStorage2D(s.TEXTURE_2D,Tt,zt,ht.width,ht.height);else{let rt=ht.width,ft=ht.height;for(let St=0;St<Tt;St++)e.texImage2D(s.TEXTURE_2D,St,zt,rt,ft,0,yt,Pt,null),rt>>=1,ft>>=1}}else if(Qt.length>0){if(qt&&me){const rt=wt(Qt[0]);e.texStorage2D(s.TEXTURE_2D,Tt,zt,rt.width,rt.height)}for(let rt=0,ft=Qt.length;rt<ft;rt++)Mt=Qt[rt],qt?W&&e.texSubImage2D(s.TEXTURE_2D,rt,0,0,yt,Pt,Mt):e.texImage2D(s.TEXTURE_2D,rt,zt,yt,Pt,Mt);C.generateMipmaps=!1}else if(qt){if(me){const rt=wt(ht);e.texStorage2D(s.TEXTURE_2D,Tt,zt,rt.width,rt.height)}W&&e.texSubImage2D(s.TEXTURE_2D,0,0,0,yt,Pt,ht)}else e.texImage2D(s.TEXTURE_2D,0,zt,yt,Pt,ht);g(C)&&m(Y),mt.__version=Q.version,C.onUpdate&&C.onUpdate(C)}I.__version=C.version}function tt(I,C,Z){if(C.image.length!==6)return;const Y=nt(I,C),V=C.source;e.bindTexture(s.TEXTURE_CUBE_MAP,I.__webglTexture,s.TEXTURE0+Z);const Q=n.get(V);if(V.version!==Q.__version||Y===!0){e.activeTexture(s.TEXTURE0+Z);const mt=ve.getPrimaries(ve.workingColorSpace),ct=C.colorSpace===zn?null:ve.getPrimaries(C.colorSpace),_t=C.colorSpace===zn||mt===ct?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,C.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,C.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,C.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,_t);const Gt=C.isCompressedTexture||C.image[0].isCompressedTexture,ht=C.image[0]&&C.image[0].isDataTexture,yt=[];for(let ft=0;ft<6;ft++)!Gt&&!ht?yt[ft]=x(C.image[ft],!0,i.maxCubemapSize):yt[ft]=ht?C.image[ft].image:C.image[ft],yt[ft]=kt(C,yt[ft]);const Pt=yt[0],zt=o.convert(C.format,C.colorSpace),Mt=o.convert(C.type),Qt=y(C.internalFormat,zt,Mt,C.colorSpace),qt=C.isVideoTexture!==!0,me=Q.__version===void 0||Y===!0,W=V.dataReady;let Tt=T(C,Pt);K(s.TEXTURE_CUBE_MAP,C);let rt;if(Gt){qt&&me&&e.texStorage2D(s.TEXTURE_CUBE_MAP,Tt,Qt,Pt.width,Pt.height);for(let ft=0;ft<6;ft++){rt=yt[ft].mipmaps;for(let St=0;St<rt.length;St++){const Et=rt[St];C.format!==Ke?zt!==null?qt?W&&e.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ft,St,0,0,Et.width,Et.height,zt,Et.data):e.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ft,St,Qt,Et.width,Et.height,0,Et.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):qt?W&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ft,St,0,0,Et.width,Et.height,zt,Mt,Et.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ft,St,Qt,Et.width,Et.height,0,zt,Mt,Et.data)}}}else{if(rt=C.mipmaps,qt&&me){rt.length>0&&Tt++;const ft=wt(yt[0]);e.texStorage2D(s.TEXTURE_CUBE_MAP,Tt,Qt,ft.width,ft.height)}for(let ft=0;ft<6;ft++)if(ht){qt?W&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ft,0,0,0,yt[ft].width,yt[ft].height,zt,Mt,yt[ft].data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ft,0,Qt,yt[ft].width,yt[ft].height,0,zt,Mt,yt[ft].data);for(let St=0;St<rt.length;St++){const Zt=rt[St].image[ft].image;qt?W&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ft,St+1,0,0,Zt.width,Zt.height,zt,Mt,Zt.data):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ft,St+1,Qt,Zt.width,Zt.height,0,zt,Mt,Zt.data)}}else{qt?W&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ft,0,0,0,zt,Mt,yt[ft]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ft,0,Qt,zt,Mt,yt[ft]);for(let St=0;St<rt.length;St++){const Et=rt[St];qt?W&&e.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ft,St+1,0,0,zt,Mt,Et.image[ft]):e.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ft,St+1,Qt,zt,Mt,Et.image[ft])}}}g(C)&&m(s.TEXTURE_CUBE_MAP),Q.__version=V.version,C.onUpdate&&C.onUpdate(C)}I.__version=C.version}function ut(I,C,Z,Y,V,Q){const mt=o.convert(Z.format,Z.colorSpace),ct=o.convert(Z.type),_t=y(Z.internalFormat,mt,ct,Z.colorSpace),Gt=n.get(C),ht=n.get(Z);if(ht.__renderTarget=C,!Gt.__hasExternalTextures){const yt=Math.max(1,C.width>>Q),Pt=Math.max(1,C.height>>Q);V===s.TEXTURE_3D||V===s.TEXTURE_2D_ARRAY?e.texImage3D(V,Q,_t,yt,Pt,C.depth,0,mt,ct,null):e.texImage2D(V,Q,_t,yt,Pt,0,mt,ct,null)}e.bindFramebuffer(s.FRAMEBUFFER,I),Ct(C)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,Y,V,ht.__webglTexture,0,pt(C)):(V===s.TEXTURE_2D||V>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&V<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,Y,V,ht.__webglTexture,Q),e.bindFramebuffer(s.FRAMEBUFFER,null)}function J(I,C,Z){if(s.bindRenderbuffer(s.RENDERBUFFER,I),C.depthBuffer){const Y=C.depthTexture,V=Y&&Y.isDepthTexture?Y.type:null,Q=v(C.stencilBuffer,V),mt=C.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,ct=pt(C);Ct(C)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,ct,Q,C.width,C.height):Z?s.renderbufferStorageMultisample(s.RENDERBUFFER,ct,Q,C.width,C.height):s.renderbufferStorage(s.RENDERBUFFER,Q,C.width,C.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,mt,s.RENDERBUFFER,I)}else{const Y=C.textures;for(let V=0;V<Y.length;V++){const Q=Y[V],mt=o.convert(Q.format,Q.colorSpace),ct=o.convert(Q.type),_t=y(Q.internalFormat,mt,ct,Q.colorSpace),Gt=pt(C);Z&&Ct(C)===!1?s.renderbufferStorageMultisample(s.RENDERBUFFER,Gt,_t,C.width,C.height):Ct(C)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,Gt,_t,C.width,C.height):s.renderbufferStorage(s.RENDERBUFFER,_t,C.width,C.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function et(I,C){if(C&&C.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(s.FRAMEBUFFER,I),!(C.depthTexture&&C.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const Y=n.get(C.depthTexture);Y.__renderTarget=C,(!Y.__webglTexture||C.depthTexture.image.width!==C.width||C.depthTexture.image.height!==C.height)&&(C.depthTexture.image.width=C.width,C.depthTexture.image.height=C.height,C.depthTexture.needsUpdate=!0),U(C.depthTexture,0);const V=Y.__webglTexture,Q=pt(C);if(C.depthTexture.format===as)Ct(C)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,V,0,Q):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,V,0);else if(C.depthTexture.format===gs)Ct(C)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,V,0,Q):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,V,0);else throw new Error("Unknown depthTexture format")}function at(I){const C=n.get(I),Z=I.isWebGLCubeRenderTarget===!0;if(C.__boundDepthTexture!==I.depthTexture){const Y=I.depthTexture;if(C.__depthDisposeCallback&&C.__depthDisposeCallback(),Y){const V=()=>{delete C.__boundDepthTexture,delete C.__depthDisposeCallback,Y.removeEventListener("dispose",V)};Y.addEventListener("dispose",V),C.__depthDisposeCallback=V}C.__boundDepthTexture=Y}if(I.depthTexture&&!C.__autoAllocateDepthBuffer){if(Z)throw new Error("target.depthTexture not supported in Cube render targets");et(C.__webglFramebuffer,I)}else if(Z){C.__webglDepthbuffer=[];for(let Y=0;Y<6;Y++)if(e.bindFramebuffer(s.FRAMEBUFFER,C.__webglFramebuffer[Y]),C.__webglDepthbuffer[Y]===void 0)C.__webglDepthbuffer[Y]=s.createRenderbuffer(),J(C.__webglDepthbuffer[Y],I,!1);else{const V=I.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,Q=C.__webglDepthbuffer[Y];s.bindRenderbuffer(s.RENDERBUFFER,Q),s.framebufferRenderbuffer(s.FRAMEBUFFER,V,s.RENDERBUFFER,Q)}}else if(e.bindFramebuffer(s.FRAMEBUFFER,C.__webglFramebuffer),C.__webglDepthbuffer===void 0)C.__webglDepthbuffer=s.createRenderbuffer(),J(C.__webglDepthbuffer,I,!1);else{const Y=I.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,V=C.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,V),s.framebufferRenderbuffer(s.FRAMEBUFFER,Y,s.RENDERBUFFER,V)}e.bindFramebuffer(s.FRAMEBUFFER,null)}function gt(I,C,Z){const Y=n.get(I);C!==void 0&&ut(Y.__webglFramebuffer,I,I.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),Z!==void 0&&at(I)}function dt(I){const C=I.texture,Z=n.get(I),Y=n.get(C);I.addEventListener("dispose",E);const V=I.textures,Q=I.isWebGLCubeRenderTarget===!0,mt=V.length>1;if(mt||(Y.__webglTexture===void 0&&(Y.__webglTexture=s.createTexture()),Y.__version=C.version,r.memory.textures++),Q){Z.__webglFramebuffer=[];for(let ct=0;ct<6;ct++)if(C.mipmaps&&C.mipmaps.length>0){Z.__webglFramebuffer[ct]=[];for(let _t=0;_t<C.mipmaps.length;_t++)Z.__webglFramebuffer[ct][_t]=s.createFramebuffer()}else Z.__webglFramebuffer[ct]=s.createFramebuffer()}else{if(C.mipmaps&&C.mipmaps.length>0){Z.__webglFramebuffer=[];for(let ct=0;ct<C.mipmaps.length;ct++)Z.__webglFramebuffer[ct]=s.createFramebuffer()}else Z.__webglFramebuffer=s.createFramebuffer();if(mt)for(let ct=0,_t=V.length;ct<_t;ct++){const Gt=n.get(V[ct]);Gt.__webglTexture===void 0&&(Gt.__webglTexture=s.createTexture(),r.memory.textures++)}if(I.samples>0&&Ct(I)===!1){Z.__webglMultisampledFramebuffer=s.createFramebuffer(),Z.__webglColorRenderbuffer=[],e.bindFramebuffer(s.FRAMEBUFFER,Z.__webglMultisampledFramebuffer);for(let ct=0;ct<V.length;ct++){const _t=V[ct];Z.__webglColorRenderbuffer[ct]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,Z.__webglColorRenderbuffer[ct]);const Gt=o.convert(_t.format,_t.colorSpace),ht=o.convert(_t.type),yt=y(_t.internalFormat,Gt,ht,_t.colorSpace,I.isXRRenderTarget===!0),Pt=pt(I);s.renderbufferStorageMultisample(s.RENDERBUFFER,Pt,yt,I.width,I.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+ct,s.RENDERBUFFER,Z.__webglColorRenderbuffer[ct])}s.bindRenderbuffer(s.RENDERBUFFER,null),I.depthBuffer&&(Z.__webglDepthRenderbuffer=s.createRenderbuffer(),J(Z.__webglDepthRenderbuffer,I,!0)),e.bindFramebuffer(s.FRAMEBUFFER,null)}}if(Q){e.bindTexture(s.TEXTURE_CUBE_MAP,Y.__webglTexture),K(s.TEXTURE_CUBE_MAP,C);for(let ct=0;ct<6;ct++)if(C.mipmaps&&C.mipmaps.length>0)for(let _t=0;_t<C.mipmaps.length;_t++)ut(Z.__webglFramebuffer[ct][_t],I,C,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+ct,_t);else ut(Z.__webglFramebuffer[ct],I,C,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+ct,0);g(C)&&m(s.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(mt){for(let ct=0,_t=V.length;ct<_t;ct++){const Gt=V[ct],ht=n.get(Gt);e.bindTexture(s.TEXTURE_2D,ht.__webglTexture),K(s.TEXTURE_2D,Gt),ut(Z.__webglFramebuffer,I,Gt,s.COLOR_ATTACHMENT0+ct,s.TEXTURE_2D,0),g(Gt)&&m(s.TEXTURE_2D)}e.unbindTexture()}else{let ct=s.TEXTURE_2D;if((I.isWebGL3DRenderTarget||I.isWebGLArrayRenderTarget)&&(ct=I.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),e.bindTexture(ct,Y.__webglTexture),K(ct,C),C.mipmaps&&C.mipmaps.length>0)for(let _t=0;_t<C.mipmaps.length;_t++)ut(Z.__webglFramebuffer[_t],I,C,s.COLOR_ATTACHMENT0,ct,_t);else ut(Z.__webglFramebuffer,I,C,s.COLOR_ATTACHMENT0,ct,0);g(C)&&m(ct),e.unbindTexture()}I.depthBuffer&&at(I)}function st(I){const C=I.textures;for(let Z=0,Y=C.length;Z<Y;Z++){const V=C[Z];if(g(V)){const Q=w(I),mt=n.get(V).__webglTexture;e.bindTexture(Q,mt),m(Q),e.unbindTexture()}}}const lt=[],H=[];function Lt(I){if(I.samples>0){if(Ct(I)===!1){const C=I.textures,Z=I.width,Y=I.height;let V=s.COLOR_BUFFER_BIT;const Q=I.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,mt=n.get(I),ct=C.length>1;if(ct)for(let _t=0;_t<C.length;_t++)e.bindFramebuffer(s.FRAMEBUFFER,mt.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+_t,s.RENDERBUFFER,null),e.bindFramebuffer(s.FRAMEBUFFER,mt.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+_t,s.TEXTURE_2D,null,0);e.bindFramebuffer(s.READ_FRAMEBUFFER,mt.__webglMultisampledFramebuffer),e.bindFramebuffer(s.DRAW_FRAMEBUFFER,mt.__webglFramebuffer);for(let _t=0;_t<C.length;_t++){if(I.resolveDepthBuffer&&(I.depthBuffer&&(V|=s.DEPTH_BUFFER_BIT),I.stencilBuffer&&I.resolveStencilBuffer&&(V|=s.STENCIL_BUFFER_BIT)),ct){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,mt.__webglColorRenderbuffer[_t]);const Gt=n.get(C[_t]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,Gt,0)}s.blitFramebuffer(0,0,Z,Y,0,0,Z,Y,V,s.NEAREST),c===!0&&(lt.length=0,H.length=0,lt.push(s.COLOR_ATTACHMENT0+_t),I.depthBuffer&&I.resolveDepthBuffer===!1&&(lt.push(Q),H.push(Q),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,H)),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,lt))}if(e.bindFramebuffer(s.READ_FRAMEBUFFER,null),e.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),ct)for(let _t=0;_t<C.length;_t++){e.bindFramebuffer(s.FRAMEBUFFER,mt.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+_t,s.RENDERBUFFER,mt.__webglColorRenderbuffer[_t]);const Gt=n.get(C[_t]).__webglTexture;e.bindFramebuffer(s.FRAMEBUFFER,mt.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+_t,s.TEXTURE_2D,Gt,0)}e.bindFramebuffer(s.DRAW_FRAMEBUFFER,mt.__webglMultisampledFramebuffer)}else if(I.depthBuffer&&I.resolveDepthBuffer===!1&&c){const C=I.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[C])}}}function pt(I){return Math.min(i.maxSamples,I.samples)}function Ct(I){const C=n.get(I);return I.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&C.__useRenderToTexture!==!1}function vt(I){const C=r.render.frame;h.get(I)!==C&&(h.set(I,C),I.update())}function kt(I,C){const Z=I.colorSpace,Y=I.format,V=I.type;return I.isCompressedTexture===!0||I.isVideoTexture===!0||Z!==Ni&&Z!==zn&&(ve.getTransfer(Z)===_e?(Y!==Ke||V!==xn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",Z)),C}function wt(I){return typeof HTMLImageElement<"u"&&I instanceof HTMLImageElement?(l.width=I.naturalWidth||I.width,l.height=I.naturalHeight||I.height):typeof VideoFrame<"u"&&I instanceof VideoFrame?(l.width=I.displayWidth,l.height=I.displayHeight):(l.width=I.width,l.height=I.height),l}this.allocateTextureUnit=z,this.resetTextureUnits=F,this.setTexture2D=U,this.setTexture2DArray=N,this.setTexture3D=D,this.setTextureCube=O,this.rebindTextures=gt,this.setupRenderTarget=dt,this.updateRenderTargetMipmap=st,this.updateMultisampleRenderTarget=Lt,this.setupDepthRenderbuffer=at,this.setupFrameBufferTexture=ut,this.useMultisampledRTT=Ct}function Mg(s,t){function e(n,i=zn){let o;const r=ve.getTransfer(i);if(n===xn)return s.UNSIGNED_BYTE;if(n===ac)return s.UNSIGNED_SHORT_4_4_4_4;if(n===cc)return s.UNSIGNED_SHORT_5_5_5_1;if(n===xh)return s.UNSIGNED_INT_5_9_9_9_REV;if(n===gh)return s.BYTE;if(n===vh)return s.SHORT;if(n===no)return s.UNSIGNED_SHORT;if(n===rc)return s.INT;if(n===Qn)return s.UNSIGNED_INT;if(n===vn)return s.FLOAT;if(n===Rn)return s.HALF_FLOAT;if(n===_h)return s.ALPHA;if(n===wh)return s.RGB;if(n===Ke)return s.RGBA;if(n===yh)return s.LUMINANCE;if(n===Mh)return s.LUMINANCE_ALPHA;if(n===as)return s.DEPTH_COMPONENT;if(n===gs)return s.DEPTH_STENCIL;if(n===io)return s.RED;if(n===ar)return s.RED_INTEGER;if(n===Sh)return s.RG;if(n===lc)return s.RG_INTEGER;if(n===hc)return s.RGBA_INTEGER;if(n===jo||n===Zo||n===Ko||n===Jo)if(r===_e)if(o=t.get("WEBGL_compressed_texture_s3tc_srgb"),o!==null){if(n===jo)return o.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Zo)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Ko)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Jo)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(o=t.get("WEBGL_compressed_texture_s3tc"),o!==null){if(n===jo)return o.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Zo)return o.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Ko)return o.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Jo)return o.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===ya||n===Ma||n===Sa||n===ba)if(o=t.get("WEBGL_compressed_texture_pvrtc"),o!==null){if(n===ya)return o.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Ma)return o.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Sa)return o.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===ba)return o.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Ea||n===Ta||n===Aa)if(o=t.get("WEBGL_compressed_texture_etc"),o!==null){if(n===Ea||n===Ta)return r===_e?o.COMPRESSED_SRGB8_ETC2:o.COMPRESSED_RGB8_ETC2;if(n===Aa)return r===_e?o.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:o.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===Ca||n===Ra||n===Pa||n===La||n===Da||n===Ia||n===za||n===Ua||n===Na||n===Fa||n===Oa||n===ka||n===Ba||n===Ha)if(o=t.get("WEBGL_compressed_texture_astc"),o!==null){if(n===Ca)return r===_e?o.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:o.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Ra)return r===_e?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:o.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Pa)return r===_e?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:o.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===La)return r===_e?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:o.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Da)return r===_e?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:o.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Ia)return r===_e?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:o.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===za)return r===_e?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:o.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Ua)return r===_e?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:o.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Na)return r===_e?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:o.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Fa)return r===_e?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:o.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Oa)return r===_e?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:o.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===ka)return r===_e?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:o.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Ba)return r===_e?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:o.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Ha)return r===_e?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:o.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Qo||n===Ga||n===Va)if(o=t.get("EXT_texture_compression_bptc"),o!==null){if(n===Qo)return r===_e?o.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:o.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Ga)return o.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Va)return o.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===bh||n===Wa||n===Xa||n===qa)if(o=t.get("EXT_texture_compression_rgtc"),o!==null){if(n===Qo)return o.COMPRESSED_RED_RGTC1_EXT;if(n===Wa)return o.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Xa)return o.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===qa)return o.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===ms?s.UNSIGNED_INT_24_8:s[n]!==void 0?s[n]:null}return{convert:e}}class Sg extends gn{constructor(t=[]){super(),this.isArrayCamera=!0,this.cameras=t}}class Pe extends Xe{constructor(){super(),this.isGroup=!0,this.type="Group"}}const bg={type:"move"};class Br{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Pe,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Pe,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new P,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new P),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Pe,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new P,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new P),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let i=null,o=null,r=null;const a=this._targetRay,c=this._grip,l=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(l&&t.hand){r=!0;for(const x of t.hand.values()){const g=e.getJointPose(x,n),m=this._getHandJoint(l,x);g!==null&&(m.matrix.fromArray(g.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=g.radius),m.visible=g!==null}const h=l.joints["index-finger-tip"],d=l.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,p=.005;l.inputState.pinching&&u>f+p?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!l.inputState.pinching&&u<=f-p&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else c!==null&&t.gripSpace&&(o=e.getPose(t.gripSpace,n),o!==null&&(c.matrix.fromArray(o.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,o.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(o.linearVelocity)):c.hasLinearVelocity=!1,o.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(o.angularVelocity)):c.hasAngularVelocity=!1));a!==null&&(i=e.getPose(t.targetRaySpace,n),i===null&&o!==null&&(i=o),i!==null&&(a.matrix.fromArray(i.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,i.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(i.linearVelocity)):a.hasLinearVelocity=!1,i.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(i.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(bg)))}return a!==null&&(a.visible=i!==null),c!==null&&(c.visible=o!==null),l!==null&&(l.visible=r!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const n=new Pe;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}}const Eg=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Tg=`
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

}`;class Ag{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e,n){if(this.texture===null){const i=new Qe,o=t.properties.get(i);o.__webglTexture=e.texture,(e.depthNear!=n.depthNear||e.depthFar!=n.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,n=new Ie({vertexShader:Eg,fragmentShader:Tg,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new pe(new ti(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Cg extends Ss{constructor(t,e){super();const n=this;let i=null,o=1,r=null,a="local-floor",c=1,l=null,h=null,d=null,u=null,f=null,p=null;const x=new Ag,g=e.getContextAttributes();let m=null,w=null;const y=[],v=[],T=new Ft;let M=null;const E=new gn;E.viewport=new Ee;const b=new gn;b.viewport=new Ee;const _=[E,b],S=new Sg;let R=null,F=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(q){let tt=y[q];return tt===void 0&&(tt=new Br,y[q]=tt),tt.getTargetRaySpace()},this.getControllerGrip=function(q){let tt=y[q];return tt===void 0&&(tt=new Br,y[q]=tt),tt.getGripSpace()},this.getHand=function(q){let tt=y[q];return tt===void 0&&(tt=new Br,y[q]=tt),tt.getHandSpace()};function z(q){const tt=v.indexOf(q.inputSource);if(tt===-1)return;const ut=y[tt];ut!==void 0&&(ut.update(q.inputSource,q.frame,l||r),ut.dispatchEvent({type:q.type,data:q.inputSource}))}function A(){i.removeEventListener("select",z),i.removeEventListener("selectstart",z),i.removeEventListener("selectend",z),i.removeEventListener("squeeze",z),i.removeEventListener("squeezestart",z),i.removeEventListener("squeezeend",z),i.removeEventListener("end",A),i.removeEventListener("inputsourceschange",U);for(let q=0;q<y.length;q++){const tt=v[q];tt!==null&&(v[q]=null,y[q].disconnect(tt))}R=null,F=null,x.reset(),t.setRenderTarget(m),f=null,u=null,d=null,i=null,w=null,nt.stop(),n.isPresenting=!1,t.setPixelRatio(M),t.setSize(T.width,T.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(q){o=q,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(q){a=q,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||r},this.setReferenceSpace=function(q){l=q},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return d},this.getFrame=function(){return p},this.getSession=function(){return i},this.setSession=async function(q){if(i=q,i!==null){if(m=t.getRenderTarget(),i.addEventListener("select",z),i.addEventListener("selectstart",z),i.addEventListener("selectend",z),i.addEventListener("squeeze",z),i.addEventListener("squeezestart",z),i.addEventListener("squeezeend",z),i.addEventListener("end",A),i.addEventListener("inputsourceschange",U),g.xrCompatible!==!0&&await e.makeXRCompatible(),M=t.getPixelRatio(),t.getSize(T),i.renderState.layers===void 0){const tt={antialias:g.antialias,alpha:!0,depth:g.depth,stencil:g.stencil,framebufferScaleFactor:o};f=new XRWebGLLayer(i,e,tt),i.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),w=new ln(f.framebufferWidth,f.framebufferHeight,{format:Ke,type:xn,colorSpace:t.outputColorSpace,stencilBuffer:g.stencil})}else{let tt=null,ut=null,J=null;g.depth&&(J=g.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,tt=g.stencil?gs:as,ut=g.stencil?ms:Qn);const et={colorFormat:e.RGBA8,depthFormat:J,scaleFactor:o};d=new XRWebGLBinding(i,e),u=d.createProjectionLayer(et),i.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),w=new ln(u.textureWidth,u.textureHeight,{format:Ke,type:xn,depthTexture:new pc(u.textureWidth,u.textureHeight,ut,void 0,void 0,void 0,void 0,void 0,void 0,tt),stencilBuffer:g.stencil,colorSpace:t.outputColorSpace,samples:g.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1})}w.isXRRenderTarget=!0,this.setFoveation(c),l=null,r=await i.requestReferenceSpace(a),nt.setContext(i),nt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return x.getDepthTexture()};function U(q){for(let tt=0;tt<q.removed.length;tt++){const ut=q.removed[tt],J=v.indexOf(ut);J>=0&&(v[J]=null,y[J].disconnect(ut))}for(let tt=0;tt<q.added.length;tt++){const ut=q.added[tt];let J=v.indexOf(ut);if(J===-1){for(let at=0;at<y.length;at++)if(at>=v.length){v.push(ut),J=at;break}else if(v[at]===null){v[at]=ut,J=at;break}if(J===-1)break}const et=y[J];et&&et.connect(ut)}}const N=new P,D=new P;function O(q,tt,ut){N.setFromMatrixPosition(tt.matrixWorld),D.setFromMatrixPosition(ut.matrixWorld);const J=N.distanceTo(D),et=tt.projectionMatrix.elements,at=ut.projectionMatrix.elements,gt=et[14]/(et[10]-1),dt=et[14]/(et[10]+1),st=(et[9]+1)/et[5],lt=(et[9]-1)/et[5],H=(et[8]-1)/et[0],Lt=(at[8]+1)/at[0],pt=gt*H,Ct=gt*Lt,vt=J/(-H+Lt),kt=vt*-H;if(tt.matrixWorld.decompose(q.position,q.quaternion,q.scale),q.translateX(kt),q.translateZ(vt),q.matrixWorld.compose(q.position,q.quaternion,q.scale),q.matrixWorldInverse.copy(q.matrixWorld).invert(),et[10]===-1)q.projectionMatrix.copy(tt.projectionMatrix),q.projectionMatrixInverse.copy(tt.projectionMatrixInverse);else{const wt=gt+vt,I=dt+vt,C=pt-kt,Z=Ct+(J-kt),Y=st*dt/I*wt,V=lt*dt/I*wt;q.projectionMatrix.makePerspective(C,Z,Y,V,wt,I),q.projectionMatrixInverse.copy(q.projectionMatrix).invert()}}function k(q,tt){tt===null?q.matrixWorld.copy(q.matrix):q.matrixWorld.multiplyMatrices(tt.matrixWorld,q.matrix),q.matrixWorldInverse.copy(q.matrixWorld).invert()}this.updateCamera=function(q){if(i===null)return;let tt=q.near,ut=q.far;x.texture!==null&&(x.depthNear>0&&(tt=x.depthNear),x.depthFar>0&&(ut=x.depthFar)),S.near=b.near=E.near=tt,S.far=b.far=E.far=ut,(R!==S.near||F!==S.far)&&(i.updateRenderState({depthNear:S.near,depthFar:S.far}),R=S.near,F=S.far),E.layers.mask=q.layers.mask|2,b.layers.mask=q.layers.mask|4,S.layers.mask=E.layers.mask|b.layers.mask;const J=q.parent,et=S.cameras;k(S,J);for(let at=0;at<et.length;at++)k(et[at],J);et.length===2?O(S,E,b):S.projectionMatrix.copy(E.projectionMatrix),B(q,S,J)};function B(q,tt,ut){ut===null?q.matrix.copy(tt.matrixWorld):(q.matrix.copy(ut.matrixWorld),q.matrix.invert(),q.matrix.multiply(tt.matrixWorld)),q.matrix.decompose(q.position,q.quaternion,q.scale),q.updateMatrixWorld(!0),q.projectionMatrix.copy(tt.projectionMatrix),q.projectionMatrixInverse.copy(tt.projectionMatrixInverse),q.isPerspectiveCamera&&(q.fov=so*2*Math.atan(1/q.projectionMatrix.elements[5]),q.zoom=1)}this.getCamera=function(){return S},this.getFoveation=function(){if(!(u===null&&f===null))return c},this.setFoveation=function(q){c=q,u!==null&&(u.fixedFoveation=q),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=q)},this.hasDepthSensing=function(){return x.texture!==null},this.getDepthSensingMesh=function(){return x.getMesh(S)};let G=null;function K(q,tt){if(h=tt.getViewerPose(l||r),p=tt,h!==null){const ut=h.views;f!==null&&(t.setRenderTargetFramebuffer(w,f.framebuffer),t.setRenderTarget(w));let J=!1;ut.length!==S.cameras.length&&(S.cameras.length=0,J=!0);for(let at=0;at<ut.length;at++){const gt=ut[at];let dt=null;if(f!==null)dt=f.getViewport(gt);else{const lt=d.getViewSubImage(u,gt);dt=lt.viewport,at===0&&(t.setRenderTargetTextures(w,lt.colorTexture,u.ignoreDepthValues?void 0:lt.depthStencilTexture),t.setRenderTarget(w))}let st=_[at];st===void 0&&(st=new gn,st.layers.enable(at),st.viewport=new Ee,_[at]=st),st.matrix.fromArray(gt.transform.matrix),st.matrix.decompose(st.position,st.quaternion,st.scale),st.projectionMatrix.fromArray(gt.projectionMatrix),st.projectionMatrixInverse.copy(st.projectionMatrix).invert(),st.viewport.set(dt.x,dt.y,dt.width,dt.height),at===0&&(S.matrix.copy(st.matrix),S.matrix.decompose(S.position,S.quaternion,S.scale)),J===!0&&S.cameras.push(st)}const et=i.enabledFeatures;if(et&&et.includes("depth-sensing")){const at=d.getDepthInformation(ut[0]);at&&at.isValid&&at.texture&&x.init(t,at,i.renderState)}}for(let ut=0;ut<y.length;ut++){const J=v[ut],et=y[ut];J!==null&&et!==void 0&&et.update(J,tt,l||r)}G&&G(q,tt),tt.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:tt}),p=null}const nt=new Bh;nt.setAnimationLoop(K),this.setAnimationLoop=function(q){G=q},this.dispose=function(){}}}const yi=new be,Rg=new $t;function Pg(s,t){function e(g,m){g.matrixAutoUpdate===!0&&g.updateMatrix(),m.value.copy(g.matrix)}function n(g,m){m.color.getRGB(g.fogColor.value,Fh(s)),m.isFog?(g.fogNear.value=m.near,g.fogFar.value=m.far):m.isFogExp2&&(g.fogDensity.value=m.density)}function i(g,m,w,y,v){m.isMeshBasicMaterial||m.isMeshLambertMaterial?o(g,m):m.isMeshToonMaterial?(o(g,m),d(g,m)):m.isMeshPhongMaterial?(o(g,m),h(g,m)):m.isMeshStandardMaterial?(o(g,m),u(g,m),m.isMeshPhysicalMaterial&&f(g,m,v)):m.isMeshMatcapMaterial?(o(g,m),p(g,m)):m.isMeshDepthMaterial?o(g,m):m.isMeshDistanceMaterial?(o(g,m),x(g,m)):m.isMeshNormalMaterial?o(g,m):m.isLineBasicMaterial?(r(g,m),m.isLineDashedMaterial&&a(g,m)):m.isPointsMaterial?c(g,m,w,y):m.isSpriteMaterial?l(g,m):m.isShadowMaterial?(g.color.value.copy(m.color),g.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function o(g,m){g.opacity.value=m.opacity,m.color&&g.diffuse.value.copy(m.color),m.emissive&&g.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(g.map.value=m.map,e(m.map,g.mapTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,e(m.alphaMap,g.alphaMapTransform)),m.bumpMap&&(g.bumpMap.value=m.bumpMap,e(m.bumpMap,g.bumpMapTransform),g.bumpScale.value=m.bumpScale,m.side===Je&&(g.bumpScale.value*=-1)),m.normalMap&&(g.normalMap.value=m.normalMap,e(m.normalMap,g.normalMapTransform),g.normalScale.value.copy(m.normalScale),m.side===Je&&g.normalScale.value.negate()),m.displacementMap&&(g.displacementMap.value=m.displacementMap,e(m.displacementMap,g.displacementMapTransform),g.displacementScale.value=m.displacementScale,g.displacementBias.value=m.displacementBias),m.emissiveMap&&(g.emissiveMap.value=m.emissiveMap,e(m.emissiveMap,g.emissiveMapTransform)),m.specularMap&&(g.specularMap.value=m.specularMap,e(m.specularMap,g.specularMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest);const w=t.get(m),y=w.envMap,v=w.envMapRotation;y&&(g.envMap.value=y,yi.copy(v),yi.x*=-1,yi.y*=-1,yi.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(yi.y*=-1,yi.z*=-1),g.envMapRotation.value.setFromMatrix4(Rg.makeRotationFromEuler(yi)),g.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,g.reflectivity.value=m.reflectivity,g.ior.value=m.ior,g.refractionRatio.value=m.refractionRatio),m.lightMap&&(g.lightMap.value=m.lightMap,g.lightMapIntensity.value=m.lightMapIntensity,e(m.lightMap,g.lightMapTransform)),m.aoMap&&(g.aoMap.value=m.aoMap,g.aoMapIntensity.value=m.aoMapIntensity,e(m.aoMap,g.aoMapTransform))}function r(g,m){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,m.map&&(g.map.value=m.map,e(m.map,g.mapTransform))}function a(g,m){g.dashSize.value=m.dashSize,g.totalSize.value=m.dashSize+m.gapSize,g.scale.value=m.scale}function c(g,m,w,y){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,g.size.value=m.size*w,g.scale.value=y*.5,m.map&&(g.map.value=m.map,e(m.map,g.uvTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,e(m.alphaMap,g.alphaMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest)}function l(g,m){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,g.rotation.value=m.rotation,m.map&&(g.map.value=m.map,e(m.map,g.mapTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,e(m.alphaMap,g.alphaMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest)}function h(g,m){g.specular.value.copy(m.specular),g.shininess.value=Math.max(m.shininess,1e-4)}function d(g,m){m.gradientMap&&(g.gradientMap.value=m.gradientMap)}function u(g,m){g.metalness.value=m.metalness,m.metalnessMap&&(g.metalnessMap.value=m.metalnessMap,e(m.metalnessMap,g.metalnessMapTransform)),g.roughness.value=m.roughness,m.roughnessMap&&(g.roughnessMap.value=m.roughnessMap,e(m.roughnessMap,g.roughnessMapTransform)),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)}function f(g,m,w){g.ior.value=m.ior,m.sheen>0&&(g.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),g.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(g.sheenColorMap.value=m.sheenColorMap,e(m.sheenColorMap,g.sheenColorMapTransform)),m.sheenRoughnessMap&&(g.sheenRoughnessMap.value=m.sheenRoughnessMap,e(m.sheenRoughnessMap,g.sheenRoughnessMapTransform))),m.clearcoat>0&&(g.clearcoat.value=m.clearcoat,g.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(g.clearcoatMap.value=m.clearcoatMap,e(m.clearcoatMap,g.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,e(m.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(g.clearcoatNormalMap.value=m.clearcoatNormalMap,e(m.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===Je&&g.clearcoatNormalScale.value.negate())),m.dispersion>0&&(g.dispersion.value=m.dispersion),m.iridescence>0&&(g.iridescence.value=m.iridescence,g.iridescenceIOR.value=m.iridescenceIOR,g.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(g.iridescenceMap.value=m.iridescenceMap,e(m.iridescenceMap,g.iridescenceMapTransform)),m.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=m.iridescenceThicknessMap,e(m.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),m.transmission>0&&(g.transmission.value=m.transmission,g.transmissionSamplerMap.value=w.texture,g.transmissionSamplerSize.value.set(w.width,w.height),m.transmissionMap&&(g.transmissionMap.value=m.transmissionMap,e(m.transmissionMap,g.transmissionMapTransform)),g.thickness.value=m.thickness,m.thicknessMap&&(g.thicknessMap.value=m.thicknessMap,e(m.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=m.attenuationDistance,g.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(g.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(g.anisotropyMap.value=m.anisotropyMap,e(m.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=m.specularIntensity,g.specularColor.value.copy(m.specularColor),m.specularColorMap&&(g.specularColorMap.value=m.specularColorMap,e(m.specularColorMap,g.specularColorMapTransform)),m.specularIntensityMap&&(g.specularIntensityMap.value=m.specularIntensityMap,e(m.specularIntensityMap,g.specularIntensityMapTransform))}function p(g,m){m.matcap&&(g.matcap.value=m.matcap)}function x(g,m){const w=t.get(m).light;g.referencePosition.value.setFromMatrixPosition(w.matrixWorld),g.nearDistance.value=w.shadow.camera.near,g.farDistance.value=w.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function Lg(s,t,e,n){let i={},o={},r=[];const a=s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS);function c(w,y){const v=y.program;n.uniformBlockBinding(w,v)}function l(w,y){let v=i[w.id];v===void 0&&(p(w),v=h(w),i[w.id]=v,w.addEventListener("dispose",g));const T=y.program;n.updateUBOMapping(w,T);const M=t.render.frame;o[w.id]!==M&&(u(w),o[w.id]=M)}function h(w){const y=d();w.__bindingPointIndex=y;const v=s.createBuffer(),T=w.__size,M=w.usage;return s.bindBuffer(s.UNIFORM_BUFFER,v),s.bufferData(s.UNIFORM_BUFFER,T,M),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,y,v),v}function d(){for(let w=0;w<a;w++)if(r.indexOf(w)===-1)return r.push(w),w;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(w){const y=i[w.id],v=w.uniforms,T=w.__cache;s.bindBuffer(s.UNIFORM_BUFFER,y);for(let M=0,E=v.length;M<E;M++){const b=Array.isArray(v[M])?v[M]:[v[M]];for(let _=0,S=b.length;_<S;_++){const R=b[_];if(f(R,M,_,T)===!0){const F=R.__offset,z=Array.isArray(R.value)?R.value:[R.value];let A=0;for(let U=0;U<z.length;U++){const N=z[U],D=x(N);typeof N=="number"||typeof N=="boolean"?(R.__data[0]=N,s.bufferSubData(s.UNIFORM_BUFFER,F+A,R.__data)):N.isMatrix3?(R.__data[0]=N.elements[0],R.__data[1]=N.elements[1],R.__data[2]=N.elements[2],R.__data[3]=0,R.__data[4]=N.elements[3],R.__data[5]=N.elements[4],R.__data[6]=N.elements[5],R.__data[7]=0,R.__data[8]=N.elements[6],R.__data[9]=N.elements[7],R.__data[10]=N.elements[8],R.__data[11]=0):(N.toArray(R.__data,A),A+=D.storage/Float32Array.BYTES_PER_ELEMENT)}s.bufferSubData(s.UNIFORM_BUFFER,F,R.__data)}}}s.bindBuffer(s.UNIFORM_BUFFER,null)}function f(w,y,v,T){const M=w.value,E=y+"_"+v;if(T[E]===void 0)return typeof M=="number"||typeof M=="boolean"?T[E]=M:T[E]=M.clone(),!0;{const b=T[E];if(typeof M=="number"||typeof M=="boolean"){if(b!==M)return T[E]=M,!0}else if(b.equals(M)===!1)return b.copy(M),!0}return!1}function p(w){const y=w.uniforms;let v=0;const T=16;for(let E=0,b=y.length;E<b;E++){const _=Array.isArray(y[E])?y[E]:[y[E]];for(let S=0,R=_.length;S<R;S++){const F=_[S],z=Array.isArray(F.value)?F.value:[F.value];for(let A=0,U=z.length;A<U;A++){const N=z[A],D=x(N),O=v%T,k=O%D.boundary,B=O+k;v+=k,B!==0&&T-B<D.storage&&(v+=T-B),F.__data=new Float32Array(D.storage/Float32Array.BYTES_PER_ELEMENT),F.__offset=v,v+=D.storage}}}const M=v%T;return M>0&&(v+=T-M),w.__size=v,w.__cache={},this}function x(w){const y={boundary:0,storage:0};return typeof w=="number"||typeof w=="boolean"?(y.boundary=4,y.storage=4):w.isVector2?(y.boundary=8,y.storage=8):w.isVector3||w.isColor?(y.boundary=16,y.storage=12):w.isVector4?(y.boundary=16,y.storage=16):w.isMatrix3?(y.boundary=48,y.storage=48):w.isMatrix4?(y.boundary=64,y.storage=64):w.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",w),y}function g(w){const y=w.target;y.removeEventListener("dispose",g);const v=r.indexOf(y.__bindingPointIndex);r.splice(v,1),s.deleteBuffer(i[y.id]),delete i[y.id],delete o[y.id]}function m(){for(const w in i)s.deleteBuffer(i[w]);r=[],i={},o={}}return{bind:c,update:l,dispose:m}}class Dg{constructor(t={}){const{canvas:e=vd(),context:n=null,depth:i=!0,stencil:o=!1,alpha:r=!1,antialias:a=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reverseDepthBuffer:u=!1}=t;this.isWebGLRenderer=!0;let f;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=n.getContextAttributes().alpha}else f=r;const p=new Uint32Array(4),x=new Int32Array(4);let g=null,m=null;const w=[],y=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=on,this.toneMapping=jn,this.toneMappingExposure=1;const v=this;let T=!1,M=0,E=0,b=null,_=-1,S=null;const R=new Ee,F=new Ee;let z=null;const A=new Ot(0);let U=0,N=e.width,D=e.height,O=1,k=null,B=null;const G=new Ee(0,0,N,D),K=new Ee(0,0,N,D);let nt=!1;const q=new xs;let tt=!1,ut=!1;const J=new $t,et=new $t,at=new P,gt=new Ee,dt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let st=!1;function lt(){return b===null?O:1}let H=n;function Lt(L,$){return e.getContext(L,$)}try{const L={alpha:!0,depth:i,stencil:o,antialias:a,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${oc}`),e.addEventListener("webglcontextlost",ft,!1),e.addEventListener("webglcontextrestored",St,!1),e.addEventListener("webglcontextcreationerror",Et,!1),H===null){const $="webgl2";if(H=Lt($,L),H===null)throw Lt($)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(L){throw console.error("THREE.WebGLRenderer: "+L.message),L}let pt,Ct,vt,kt,wt,I,C,Z,Y,V,Q,mt,ct,_t,Gt,ht,yt,Pt,zt,Mt,Qt,qt,me,W;function Tt(){pt=new Op(H),pt.init(),qt=new Mg(H,pt),Ct=new Dp(H,pt,t,qt),vt=new _g(H,pt),Ct.reverseDepthBuffer&&u&&vt.buffers.depth.setReversed(!0),kt=new Hp(H),wt=new og,I=new yg(H,pt,vt,wt,Ct,qt,kt),C=new zp(v),Z=new Fp(v),Y=new Yd(H),me=new Pp(H,Y),V=new kp(H,Y,kt,me),Q=new Vp(H,V,Y,kt),zt=new Gp(H,Ct,I),ht=new Ip(wt),mt=new sg(v,C,Z,pt,Ct,me,ht),ct=new Pg(v,wt),_t=new ag,Gt=new fg(pt),Pt=new Rp(v,C,Z,vt,Q,f,c),yt=new vg(v,Q,Ct),W=new Lg(H,kt,Ct,vt),Mt=new Lp(H,pt,kt),Qt=new Bp(H,pt,kt),kt.programs=mt.programs,v.capabilities=Ct,v.extensions=pt,v.properties=wt,v.renderLists=_t,v.shadowMap=yt,v.state=vt,v.info=kt}Tt();const rt=new Cg(v,H);this.xr=rt,this.getContext=function(){return H},this.getContextAttributes=function(){return H.getContextAttributes()},this.forceContextLoss=function(){const L=pt.get("WEBGL_lose_context");L&&L.loseContext()},this.forceContextRestore=function(){const L=pt.get("WEBGL_lose_context");L&&L.restoreContext()},this.getPixelRatio=function(){return O},this.setPixelRatio=function(L){L!==void 0&&(O=L,this.setSize(N,D,!1))},this.getSize=function(L){return L.set(N,D)},this.setSize=function(L,$,it=!0){if(rt.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}N=L,D=$,e.width=Math.floor(L*O),e.height=Math.floor($*O),it===!0&&(e.style.width=L+"px",e.style.height=$+"px"),this.setViewport(0,0,L,$)},this.getDrawingBufferSize=function(L){return L.set(N*O,D*O).floor()},this.setDrawingBufferSize=function(L,$,it){N=L,D=$,O=it,e.width=Math.floor(L*it),e.height=Math.floor($*it),this.setViewport(0,0,L,$)},this.getCurrentViewport=function(L){return L.copy(R)},this.getViewport=function(L){return L.copy(G)},this.setViewport=function(L,$,it,ot){L.isVector4?G.set(L.x,L.y,L.z,L.w):G.set(L,$,it,ot),vt.viewport(R.copy(G).multiplyScalar(O).round())},this.getScissor=function(L){return L.copy(K)},this.setScissor=function(L,$,it,ot){L.isVector4?K.set(L.x,L.y,L.z,L.w):K.set(L,$,it,ot),vt.scissor(F.copy(K).multiplyScalar(O).round())},this.getScissorTest=function(){return nt},this.setScissorTest=function(L){vt.setScissorTest(nt=L)},this.setOpaqueSort=function(L){k=L},this.setTransparentSort=function(L){B=L},this.getClearColor=function(L){return L.copy(Pt.getClearColor())},this.setClearColor=function(){Pt.setClearColor.apply(Pt,arguments)},this.getClearAlpha=function(){return Pt.getClearAlpha()},this.setClearAlpha=function(){Pt.setClearAlpha.apply(Pt,arguments)},this.clear=function(L=!0,$=!0,it=!0){let ot=0;if(L){let j=!1;if(b!==null){const bt=b.texture.format;j=bt===hc||bt===lc||bt===ar}if(j){const bt=b.texture.type,Dt=bt===xn||bt===Qn||bt===no||bt===ms||bt===ac||bt===cc,Ht=Pt.getClearColor(),Vt=Pt.getClearAlpha(),ee=Ht.r,ae=Ht.g,Bt=Ht.b;Dt?(p[0]=ee,p[1]=ae,p[2]=Bt,p[3]=Vt,H.clearBufferuiv(H.COLOR,0,p)):(x[0]=ee,x[1]=ae,x[2]=Bt,x[3]=Vt,H.clearBufferiv(H.COLOR,0,x))}else ot|=H.COLOR_BUFFER_BIT}$&&(ot|=H.DEPTH_BUFFER_BIT),it&&(ot|=H.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),H.clear(ot)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",ft,!1),e.removeEventListener("webglcontextrestored",St,!1),e.removeEventListener("webglcontextcreationerror",Et,!1),_t.dispose(),Gt.dispose(),wt.dispose(),C.dispose(),Z.dispose(),Q.dispose(),me.dispose(),W.dispose(),mt.dispose(),rt.dispose(),rt.removeEventListener("sessionstart",bn),rt.removeEventListener("sessionend",Un),tn.stop()};function ft(L){L.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),T=!0}function St(){console.log("THREE.WebGLRenderer: Context Restored."),T=!1;const L=kt.autoReset,$=yt.enabled,it=yt.autoUpdate,ot=yt.needsUpdate,j=yt.type;Tt(),kt.autoReset=L,yt.enabled=$,yt.autoUpdate=it,yt.needsUpdate=ot,yt.type=j}function Et(L){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",L.statusMessage)}function Zt(L){const $=L.target;$.removeEventListener("dispose",Zt),fe($)}function fe(L){we(L),wt.remove(L)}function we(L){const $=wt.get(L).programs;$!==void 0&&($.forEach(function(it){mt.releaseProgram(it)}),L.isShaderMaterial&&mt.releaseShaderCache(L))}this.renderBufferDirect=function(L,$,it,ot,j,bt){$===null&&($=dt);const Dt=j.isMesh&&j.matrixWorld.determinant()<0,Ht=Rs(L,$,it,ot,j);vt.setMaterial(ot,Dt);let Vt=it.index,ee=1;if(ot.wireframe===!0){if(Vt=V.getWireframeAttribute(it),Vt===void 0)return;ee=2}const ae=it.drawRange,Bt=it.attributes.position;let X=ae.start*ee,xt=(ae.start+ae.count)*ee;bt!==null&&(X=Math.max(X,bt.start*ee),xt=Math.min(xt,(bt.start+bt.count)*ee)),Vt!==null?(X=Math.max(X,0),xt=Math.min(xt,Vt.count)):Bt!=null&&(X=Math.max(X,0),xt=Math.min(xt,Bt.count));const Rt=xt-X;if(Rt<0||Rt===1/0)return;me.setup(j,ot,Ht,it,Vt);let Jt,ne=Mt;if(Vt!==null&&(Jt=Y.get(Vt),ne=Qt,ne.setIndex(Jt)),j.isMesh)ot.wireframe===!0?(vt.setLineWidth(ot.wireframeLinewidth*lt()),ne.setMode(H.LINES)):ne.setMode(H.TRIANGLES);else if(j.isLine){let Ut=ot.linewidth;Ut===void 0&&(Ut=1),vt.setLineWidth(Ut*lt()),j.isLineSegments?ne.setMode(H.LINES):j.isLineLoop?ne.setMode(H.LINE_LOOP):ne.setMode(H.LINE_STRIP)}else j.isPoints?ne.setMode(H.POINTS):j.isSprite&&ne.setMode(H.TRIANGLES);if(j.isBatchedMesh)if(j._multiDrawInstances!==null)ne.renderMultiDrawInstances(j._multiDrawStarts,j._multiDrawCounts,j._multiDrawCount,j._multiDrawInstances);else if(pt.get("WEBGL_multi_draw"))ne.renderMultiDraw(j._multiDrawStarts,j._multiDrawCounts,j._multiDrawCount);else{const Ut=j._multiDrawStarts,Me=j._multiDrawCounts,se=j._multiDrawCount,Te=Vt?Y.get(Vt).bytesPerElement:1,Fi=wt.get(ot).currentProgram.getUniforms();for(let un=0;un<se;un++)Fi.setValue(H,"_gl_DrawID",un),ne.render(Ut[un]/Te,Me[un])}else if(j.isInstancedMesh)ne.renderInstances(X,Rt,j.count);else if(it.isInstancedBufferGeometry){const Ut=it._maxInstanceCount!==void 0?it._maxInstanceCount:1/0,Me=Math.min(it.instanceCount,Ut);ne.renderInstances(X,Rt,Me)}else ne.render(X,Rt)};function le(L,$,it){L.transparent===!0&&L.side===Be&&L.forceSinglePass===!1?(L.side=Je,L.needsUpdate=!0,ze(L,$,it),L.side=Jn,L.needsUpdate=!0,ze(L,$,it),L.side=Be):ze(L,$,it)}this.compile=function(L,$,it=null){it===null&&(it=L),m=Gt.get(it),m.init($),y.push(m),it.traverseVisible(function(j){j.isLight&&j.layers.test($.layers)&&(m.pushLight(j),j.castShadow&&m.pushShadow(j))}),L!==it&&L.traverseVisible(function(j){j.isLight&&j.layers.test($.layers)&&(m.pushLight(j),j.castShadow&&m.pushShadow(j))}),m.setupLights();const ot=new Set;return L.traverse(function(j){if(!(j.isMesh||j.isPoints||j.isLine||j.isSprite))return;const bt=j.material;if(bt)if(Array.isArray(bt))for(let Dt=0;Dt<bt.length;Dt++){const Ht=bt[Dt];le(Ht,it,j),ot.add(Ht)}else le(bt,it,j),ot.add(bt)}),y.pop(),m=null,ot},this.compileAsync=function(L,$,it=null){const ot=this.compile(L,$,it);return new Promise(j=>{function bt(){if(ot.forEach(function(Dt){wt.get(Dt).currentProgram.isReady()&&ot.delete(Dt)}),ot.size===0){j(L);return}setTimeout(bt,10)}pt.get("KHR_parallel_shader_compile")!==null?bt():setTimeout(bt,10)})};let Re=null;function qe(L){Re&&Re(L)}function bn(){tn.stop()}function Un(){tn.start()}const tn=new Bh;tn.setAnimationLoop(qe),typeof self<"u"&&tn.setContext(self),this.setAnimationLoop=function(L){Re=L,rt.setAnimationLoop(L),L===null?tn.stop():tn.start()},rt.addEventListener("sessionstart",bn),rt.addEventListener("sessionend",Un),this.render=function(L,$){if($!==void 0&&$.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(T===!0)return;if(L.matrixWorldAutoUpdate===!0&&L.updateMatrixWorld(),$.parent===null&&$.matrixWorldAutoUpdate===!0&&$.updateMatrixWorld(),rt.enabled===!0&&rt.isPresenting===!0&&(rt.cameraAutoUpdate===!0&&rt.updateCamera($),$=rt.getCamera()),L.isScene===!0&&L.onBeforeRender(v,L,$,b),m=Gt.get(L,y.length),m.init($),y.push(m),et.multiplyMatrices($.projectionMatrix,$.matrixWorldInverse),q.setFromProjectionMatrix(et),ut=this.localClippingEnabled,tt=ht.init(this.clippingPlanes,ut),g=_t.get(L,w.length),g.init(),w.push(g),rt.enabled===!0&&rt.isPresenting===!0){const bt=v.xr.getDepthSensingMesh();bt!==null&&po(bt,$,-1/0,v.sortObjects)}po(L,$,0,v.sortObjects),g.finish(),v.sortObjects===!0&&g.sort(k,B),st=rt.enabled===!1||rt.isPresenting===!1||rt.hasDepthSensing()===!1,st&&Pt.addToRenderList(g,L),this.info.render.frame++,tt===!0&&ht.beginShadows();const it=m.state.shadowsArray;yt.render(it,L,$),tt===!0&&ht.endShadows(),this.info.autoReset===!0&&this.info.reset();const ot=g.opaque,j=g.transmissive;if(m.setupLights(),$.isArrayCamera){const bt=$.cameras;if(j.length>0)for(let Dt=0,Ht=bt.length;Dt<Ht;Dt++){const Vt=bt[Dt];As(ot,j,L,Vt)}st&&Pt.render(L);for(let Dt=0,Ht=bt.length;Dt<Ht;Dt++){const Vt=bt[Dt];mo(g,L,Vt,Vt.viewport)}}else j.length>0&&As(ot,j,L,$),st&&Pt.render(L),mo(g,L,$);b!==null&&(I.updateMultisampleRenderTarget(b),I.updateRenderTargetMipmap(b)),L.isScene===!0&&L.onAfterRender(v,L,$),me.resetDefaultState(),_=-1,S=null,y.pop(),y.length>0?(m=y[y.length-1],tt===!0&&ht.setGlobalState(v.clippingPlanes,m.state.camera)):m=null,w.pop(),w.length>0?g=w[w.length-1]:g=null};function po(L,$,it,ot){if(L.visible===!1)return;if(L.layers.test($.layers)){if(L.isGroup)it=L.renderOrder;else if(L.isLOD)L.autoUpdate===!0&&L.update($);else if(L.isLight)m.pushLight(L),L.castShadow&&m.pushShadow(L);else if(L.isSprite){if(!L.frustumCulled||q.intersectsSprite(L)){ot&&gt.setFromMatrixPosition(L.matrixWorld).applyMatrix4(et);const Dt=Q.update(L),Ht=L.material;Ht.visible&&g.push(L,Dt,Ht,it,gt.z,null)}}else if((L.isMesh||L.isLine||L.isPoints)&&(!L.frustumCulled||q.intersectsObject(L))){const Dt=Q.update(L),Ht=L.material;if(ot&&(L.boundingSphere!==void 0?(L.boundingSphere===null&&L.computeBoundingSphere(),gt.copy(L.boundingSphere.center)):(Dt.boundingSphere===null&&Dt.computeBoundingSphere(),gt.copy(Dt.boundingSphere.center)),gt.applyMatrix4(L.matrixWorld).applyMatrix4(et)),Array.isArray(Ht)){const Vt=Dt.groups;for(let ee=0,ae=Vt.length;ee<ae;ee++){const Bt=Vt[ee],X=Ht[Bt.materialIndex];X&&X.visible&&g.push(L,Dt,X,it,gt.z,Bt)}}else Ht.visible&&g.push(L,Dt,Ht,it,gt.z,null)}}const bt=L.children;for(let Dt=0,Ht=bt.length;Dt<Ht;Dt++)po(bt[Dt],$,it,ot)}function mo(L,$,it,ot){const j=L.opaque,bt=L.transmissive,Dt=L.transparent;m.setupLightsView(it),tt===!0&&ht.setGlobalState(v.clippingPlanes,it),ot&&vt.viewport(R.copy(ot)),j.length>0&&ni(j,$,it),bt.length>0&&ni(bt,$,it),Dt.length>0&&ni(Dt,$,it),vt.buffers.depth.setTest(!0),vt.buffers.depth.setMask(!0),vt.buffers.color.setMask(!0),vt.setPolygonOffset(!1)}function As(L,$,it,ot){if((it.isScene===!0?it.overrideMaterial:null)!==null)return;m.state.transmissionRenderTarget[ot.id]===void 0&&(m.state.transmissionRenderTarget[ot.id]=new ln(1,1,{generateMipmaps:!0,type:pt.has("EXT_color_buffer_half_float")||pt.has("EXT_color_buffer_float")?Rn:xn,minFilter:fi,samples:4,stencilBuffer:o,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:ve.workingColorSpace}));const bt=m.state.transmissionRenderTarget[ot.id],Dt=ot.viewport||R;bt.setSize(Dt.z,Dt.w);const Ht=v.getRenderTarget();v.setRenderTarget(bt),v.getClearColor(A),U=v.getClearAlpha(),U<1&&v.setClearColor(16777215,.5),v.clear(),st&&Pt.render(it);const Vt=v.toneMapping;v.toneMapping=jn;const ee=ot.viewport;if(ot.viewport!==void 0&&(ot.viewport=void 0),m.setupLightsView(ot),tt===!0&&ht.setGlobalState(v.clippingPlanes,ot),ni(L,it,ot),I.updateMultisampleRenderTarget(bt),I.updateRenderTargetMipmap(bt),pt.has("WEBGL_multisampled_render_to_texture")===!1){let ae=!1;for(let Bt=0,X=$.length;Bt<X;Bt++){const xt=$[Bt],Rt=xt.object,Jt=xt.geometry,ne=xt.material,Ut=xt.group;if(ne.side===Be&&Rt.layers.test(ot.layers)){const Me=ne.side;ne.side=Je,ne.needsUpdate=!0,Cs(Rt,it,ot,Jt,ne,Ut),ne.side=Me,ne.needsUpdate=!0,ae=!0}}ae===!0&&(I.updateMultisampleRenderTarget(bt),I.updateRenderTargetMipmap(bt))}v.setRenderTarget(Ht),v.setClearColor(A,U),ee!==void 0&&(ot.viewport=ee),v.toneMapping=Vt}function ni(L,$,it){const ot=$.isScene===!0?$.overrideMaterial:null;for(let j=0,bt=L.length;j<bt;j++){const Dt=L[j],Ht=Dt.object,Vt=Dt.geometry,ee=ot===null?Dt.material:ot,ae=Dt.group;Ht.layers.test(it.layers)&&Cs(Ht,$,it,Vt,ee,ae)}}function Cs(L,$,it,ot,j,bt){L.onBeforeRender(v,$,it,ot,j,bt),L.modelViewMatrix.multiplyMatrices(it.matrixWorldInverse,L.matrixWorld),L.normalMatrix.getNormalMatrix(L.modelViewMatrix),j.onBeforeRender(v,$,it,ot,L,bt),j.transparent===!0&&j.side===Be&&j.forceSinglePass===!1?(j.side=Je,j.needsUpdate=!0,v.renderBufferDirect(it,$,ot,j,L,bt),j.side=Jn,j.needsUpdate=!0,v.renderBufferDirect(it,$,ot,j,L,bt),j.side=Be):v.renderBufferDirect(it,$,ot,j,L,bt),L.onAfterRender(v,$,it,ot,j,bt)}function ze(L,$,it){$.isScene!==!0&&($=dt);const ot=wt.get(L),j=m.state.lights,bt=m.state.shadowsArray,Dt=j.state.version,Ht=mt.getParameters(L,j.state,bt,$,it),Vt=mt.getProgramCacheKey(Ht);let ee=ot.programs;ot.environment=L.isMeshStandardMaterial?$.environment:null,ot.fog=$.fog,ot.envMap=(L.isMeshStandardMaterial?Z:C).get(L.envMap||ot.environment),ot.envMapRotation=ot.environment!==null&&L.envMap===null?$.environmentRotation:L.envMapRotation,ee===void 0&&(L.addEventListener("dispose",Zt),ee=new Map,ot.programs=ee);let ae=ee.get(Vt);if(ae!==void 0){if(ot.currentProgram===ae&&ot.lightsStateVersion===Dt)return vo(L,Ht),ae}else Ht.uniforms=mt.getUniforms(L),L.onBeforeCompile(Ht,v),ae=mt.acquireProgram(Ht,Vt),ee.set(Vt,ae),ot.uniforms=Ht.uniforms;const Bt=ot.uniforms;return(!L.isShaderMaterial&&!L.isRawShaderMaterial||L.clipping===!0)&&(Bt.clippingPlanes=ht.uniform),vo(L,Ht),ot.needsLights=xo(L),ot.lightsStateVersion=Dt,ot.needsLights&&(Bt.ambientLightColor.value=j.state.ambient,Bt.lightProbe.value=j.state.probe,Bt.directionalLights.value=j.state.directional,Bt.directionalLightShadows.value=j.state.directionalShadow,Bt.spotLights.value=j.state.spot,Bt.spotLightShadows.value=j.state.spotShadow,Bt.rectAreaLights.value=j.state.rectArea,Bt.ltc_1.value=j.state.rectAreaLTC1,Bt.ltc_2.value=j.state.rectAreaLTC2,Bt.pointLights.value=j.state.point,Bt.pointLightShadows.value=j.state.pointShadow,Bt.hemisphereLights.value=j.state.hemi,Bt.directionalShadowMap.value=j.state.directionalShadowMap,Bt.directionalShadowMatrix.value=j.state.directionalShadowMatrix,Bt.spotShadowMap.value=j.state.spotShadowMap,Bt.spotLightMatrix.value=j.state.spotLightMatrix,Bt.spotLightMap.value=j.state.spotLightMap,Bt.pointShadowMap.value=j.state.pointShadowMap,Bt.pointShadowMatrix.value=j.state.pointShadowMatrix),ot.currentProgram=ae,ot.uniformsList=null,ae}function go(L){if(L.uniformsList===null){const $=L.currentProgram.getUniforms();L.uniformsList=tr.seqWithValue($.seq,L.uniforms)}return L.uniformsList}function vo(L,$){const it=wt.get(L);it.outputColorSpace=$.outputColorSpace,it.batching=$.batching,it.batchingColor=$.batchingColor,it.instancing=$.instancing,it.instancingColor=$.instancingColor,it.instancingMorph=$.instancingMorph,it.skinning=$.skinning,it.morphTargets=$.morphTargets,it.morphNormals=$.morphNormals,it.morphColors=$.morphColors,it.morphTargetsCount=$.morphTargetsCount,it.numClippingPlanes=$.numClippingPlanes,it.numIntersection=$.numClipIntersection,it.vertexAlphas=$.vertexAlphas,it.vertexTangents=$.vertexTangents,it.toneMapping=$.toneMapping}function Rs(L,$,it,ot,j){$.isScene!==!0&&($=dt),I.resetTextureUnits();const bt=$.fog,Dt=ot.isMeshStandardMaterial?$.environment:null,Ht=b===null?v.outputColorSpace:b.isXRRenderTarget===!0?b.texture.colorSpace:Ni,Vt=(ot.isMeshStandardMaterial?Z:C).get(ot.envMap||Dt),ee=ot.vertexColors===!0&&!!it.attributes.color&&it.attributes.color.itemSize===4,ae=!!it.attributes.tangent&&(!!ot.normalMap||ot.anisotropy>0),Bt=!!it.morphAttributes.position,X=!!it.morphAttributes.normal,xt=!!it.morphAttributes.color;let Rt=jn;ot.toneMapped&&(b===null||b.isXRRenderTarget===!0)&&(Rt=v.toneMapping);const Jt=it.morphAttributes.position||it.morphAttributes.normal||it.morphAttributes.color,ne=Jt!==void 0?Jt.length:0,Ut=wt.get(ot),Me=m.state.lights;if(tt===!0&&(ut===!0||L!==S)){const _n=L===S&&ot.id===_;ht.setState(ot,L,_n)}let se=!1;ot.version===Ut.__version?(Ut.needsLights&&Ut.lightsStateVersion!==Me.state.version||Ut.outputColorSpace!==Ht||j.isBatchedMesh&&Ut.batching===!1||!j.isBatchedMesh&&Ut.batching===!0||j.isBatchedMesh&&Ut.batchingColor===!0&&j.colorTexture===null||j.isBatchedMesh&&Ut.batchingColor===!1&&j.colorTexture!==null||j.isInstancedMesh&&Ut.instancing===!1||!j.isInstancedMesh&&Ut.instancing===!0||j.isSkinnedMesh&&Ut.skinning===!1||!j.isSkinnedMesh&&Ut.skinning===!0||j.isInstancedMesh&&Ut.instancingColor===!0&&j.instanceColor===null||j.isInstancedMesh&&Ut.instancingColor===!1&&j.instanceColor!==null||j.isInstancedMesh&&Ut.instancingMorph===!0&&j.morphTexture===null||j.isInstancedMesh&&Ut.instancingMorph===!1&&j.morphTexture!==null||Ut.envMap!==Vt||ot.fog===!0&&Ut.fog!==bt||Ut.numClippingPlanes!==void 0&&(Ut.numClippingPlanes!==ht.numPlanes||Ut.numIntersection!==ht.numIntersection)||Ut.vertexAlphas!==ee||Ut.vertexTangents!==ae||Ut.morphTargets!==Bt||Ut.morphNormals!==X||Ut.morphColors!==xt||Ut.toneMapping!==Rt||Ut.morphTargetsCount!==ne)&&(se=!0):(se=!0,Ut.__version=ot.version);let Te=Ut.currentProgram;se===!0&&(Te=ze(ot,$,j));let Fi=!1,un=!1,Ps=!1;const Se=Te.getUniforms(),Pn=Ut.uniforms;if(vt.useProgram(Te.program)&&(Fi=!0,un=!0,Ps=!0),ot.id!==_&&(_=ot.id,un=!0),Fi||S!==L){vt.buffers.depth.getReversed()?(J.copy(L.projectionMatrix),_d(J),wd(J),Se.setValue(H,"projectionMatrix",J)):Se.setValue(H,"projectionMatrix",L.projectionMatrix),Se.setValue(H,"viewMatrix",L.matrixWorldInverse);const ii=Se.map.cameraPosition;ii!==void 0&&ii.setValue(H,at.setFromMatrixPosition(L.matrixWorld)),Ct.logarithmicDepthBuffer&&Se.setValue(H,"logDepthBufFC",2/(Math.log(L.far+1)/Math.LN2)),(ot.isMeshPhongMaterial||ot.isMeshToonMaterial||ot.isMeshLambertMaterial||ot.isMeshBasicMaterial||ot.isMeshStandardMaterial||ot.isShaderMaterial)&&Se.setValue(H,"isOrthographic",L.isOrthographicCamera===!0),S!==L&&(S=L,un=!0,Ps=!0)}if(j.isSkinnedMesh){Se.setOptional(H,j,"bindMatrix"),Se.setOptional(H,j,"bindMatrixInverse");const _n=j.skeleton;_n&&(_n.boneTexture===null&&_n.computeBoneTexture(),Se.setValue(H,"boneTexture",_n.boneTexture,I))}j.isBatchedMesh&&(Se.setOptional(H,j,"batchingTexture"),Se.setValue(H,"batchingTexture",j._matricesTexture,I),Se.setOptional(H,j,"batchingIdTexture"),Se.setValue(H,"batchingIdTexture",j._indirectTexture,I),Se.setOptional(H,j,"batchingColorTexture"),j._colorsTexture!==null&&Se.setValue(H,"batchingColorTexture",j._colorsTexture,I));const Ls=it.morphAttributes;if((Ls.position!==void 0||Ls.normal!==void 0||Ls.color!==void 0)&&zt.update(j,it,Te),(un||Ut.receiveShadow!==j.receiveShadow)&&(Ut.receiveShadow=j.receiveShadow,Se.setValue(H,"receiveShadow",j.receiveShadow)),ot.isMeshGouraudMaterial&&ot.envMap!==null&&(Pn.envMap.value=Vt,Pn.flipEnvMap.value=Vt.isCubeTexture&&Vt.isRenderTargetTexture===!1?-1:1),ot.isMeshStandardMaterial&&ot.envMap===null&&$.environment!==null&&(Pn.envMapIntensity.value=$.environmentIntensity),un&&(Se.setValue(H,"toneMappingExposure",v.toneMappingExposure),Ut.needsLights&&Tc(Pn,Ps),bt&&ot.fog===!0&&ct.refreshFogUniforms(Pn,bt),ct.refreshMaterialUniforms(Pn,ot,O,D,m.state.transmissionRenderTarget[L.id]),tr.upload(H,go(Ut),Pn,I)),ot.isShaderMaterial&&ot.uniformsNeedUpdate===!0&&(tr.upload(H,go(Ut),Pn,I),ot.uniformsNeedUpdate=!1),ot.isSpriteMaterial&&Se.setValue(H,"center",j.center),Se.setValue(H,"modelViewMatrix",j.modelViewMatrix),Se.setValue(H,"normalMatrix",j.normalMatrix),Se.setValue(H,"modelMatrix",j.matrixWorld),ot.isShaderMaterial||ot.isRawShaderMaterial){const _n=ot.uniformsGroups;for(let ii=0,si=_n.length;ii<si;ii++){const Ac=_n[ii];W.update(Ac,Te),W.bind(Ac,Te)}}return Te}function Tc(L,$){L.ambientLightColor.needsUpdate=$,L.lightProbe.needsUpdate=$,L.directionalLights.needsUpdate=$,L.directionalLightShadows.needsUpdate=$,L.pointLights.needsUpdate=$,L.pointLightShadows.needsUpdate=$,L.spotLights.needsUpdate=$,L.spotLightShadows.needsUpdate=$,L.rectAreaLights.needsUpdate=$,L.hemisphereLights.needsUpdate=$}function xo(L){return L.isMeshLambertMaterial||L.isMeshToonMaterial||L.isMeshPhongMaterial||L.isMeshStandardMaterial||L.isShadowMaterial||L.isShaderMaterial&&L.lights===!0}this.getActiveCubeFace=function(){return M},this.getActiveMipmapLevel=function(){return E},this.getRenderTarget=function(){return b},this.setRenderTargetTextures=function(L,$,it){wt.get(L.texture).__webglTexture=$,wt.get(L.depthTexture).__webglTexture=it;const ot=wt.get(L);ot.__hasExternalTextures=!0,ot.__autoAllocateDepthBuffer=it===void 0,ot.__autoAllocateDepthBuffer||pt.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),ot.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(L,$){const it=wt.get(L);it.__webglFramebuffer=$,it.__useDefaultFramebuffer=$===void 0},this.setRenderTarget=function(L,$=0,it=0){b=L,M=$,E=it;let ot=!0,j=null,bt=!1,Dt=!1;if(L){const Vt=wt.get(L);if(Vt.__useDefaultFramebuffer!==void 0)vt.bindFramebuffer(H.FRAMEBUFFER,null),ot=!1;else if(Vt.__webglFramebuffer===void 0)I.setupRenderTarget(L);else if(Vt.__hasExternalTextures)I.rebindTextures(L,wt.get(L.texture).__webglTexture,wt.get(L.depthTexture).__webglTexture);else if(L.depthBuffer){const Bt=L.depthTexture;if(Vt.__boundDepthTexture!==Bt){if(Bt!==null&&wt.has(Bt)&&(L.width!==Bt.image.width||L.height!==Bt.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");I.setupDepthRenderbuffer(L)}}const ee=L.texture;(ee.isData3DTexture||ee.isDataArrayTexture||ee.isCompressedArrayTexture)&&(Dt=!0);const ae=wt.get(L).__webglFramebuffer;L.isWebGLCubeRenderTarget?(Array.isArray(ae[$])?j=ae[$][it]:j=ae[$],bt=!0):L.samples>0&&I.useMultisampledRTT(L)===!1?j=wt.get(L).__webglMultisampledFramebuffer:Array.isArray(ae)?j=ae[it]:j=ae,R.copy(L.viewport),F.copy(L.scissor),z=L.scissorTest}else R.copy(G).multiplyScalar(O).floor(),F.copy(K).multiplyScalar(O).floor(),z=nt;if(vt.bindFramebuffer(H.FRAMEBUFFER,j)&&ot&&vt.drawBuffers(L,j),vt.viewport(R),vt.scissor(F),vt.setScissorTest(z),bt){const Vt=wt.get(L.texture);H.framebufferTexture2D(H.FRAMEBUFFER,H.COLOR_ATTACHMENT0,H.TEXTURE_CUBE_MAP_POSITIVE_X+$,Vt.__webglTexture,it)}else if(Dt){const Vt=wt.get(L.texture),ee=$||0;H.framebufferTextureLayer(H.FRAMEBUFFER,H.COLOR_ATTACHMENT0,Vt.__webglTexture,it||0,ee)}_=-1},this.readRenderTargetPixels=function(L,$,it,ot,j,bt,Dt){if(!(L&&L.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ht=wt.get(L).__webglFramebuffer;if(L.isWebGLCubeRenderTarget&&Dt!==void 0&&(Ht=Ht[Dt]),Ht){vt.bindFramebuffer(H.FRAMEBUFFER,Ht);try{const Vt=L.texture,ee=Vt.format,ae=Vt.type;if(!Ct.textureFormatReadable(ee)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Ct.textureTypeReadable(ae)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}$>=0&&$<=L.width-ot&&it>=0&&it<=L.height-j&&H.readPixels($,it,ot,j,qt.convert(ee),qt.convert(ae),bt)}finally{const Vt=b!==null?wt.get(b).__webglFramebuffer:null;vt.bindFramebuffer(H.FRAMEBUFFER,Vt)}}},this.readRenderTargetPixelsAsync=async function(L,$,it,ot,j,bt,Dt){if(!(L&&L.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ht=wt.get(L).__webglFramebuffer;if(L.isWebGLCubeRenderTarget&&Dt!==void 0&&(Ht=Ht[Dt]),Ht){const Vt=L.texture,ee=Vt.format,ae=Vt.type;if(!Ct.textureFormatReadable(ee))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Ct.textureTypeReadable(ae))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if($>=0&&$<=L.width-ot&&it>=0&&it<=L.height-j){vt.bindFramebuffer(H.FRAMEBUFFER,Ht);const Bt=H.createBuffer();H.bindBuffer(H.PIXEL_PACK_BUFFER,Bt),H.bufferData(H.PIXEL_PACK_BUFFER,bt.byteLength,H.STREAM_READ),H.readPixels($,it,ot,j,qt.convert(ee),qt.convert(ae),0);const X=b!==null?wt.get(b).__webglFramebuffer:null;vt.bindFramebuffer(H.FRAMEBUFFER,X);const xt=H.fenceSync(H.SYNC_GPU_COMMANDS_COMPLETE,0);return H.flush(),await xd(H,xt,4),H.bindBuffer(H.PIXEL_PACK_BUFFER,Bt),H.getBufferSubData(H.PIXEL_PACK_BUFFER,0,bt),H.deleteBuffer(Bt),H.deleteSync(xt),bt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(L,$=null,it=0){L.isTexture!==!0&&(Xs("WebGLRenderer: copyFramebufferToTexture function signature has changed."),$=arguments[0]||null,L=arguments[1]);const ot=Math.pow(2,-it),j=Math.floor(L.image.width*ot),bt=Math.floor(L.image.height*ot),Dt=$!==null?$.x:0,Ht=$!==null?$.y:0;I.setTexture2D(L,0),H.copyTexSubImage2D(H.TEXTURE_2D,it,0,0,Dt,Ht,j,bt),vt.unbindTexture()},this.copyTextureToTexture=function(L,$,it=null,ot=null,j=0){L.isTexture!==!0&&(Xs("WebGLRenderer: copyTextureToTexture function signature has changed."),ot=arguments[0]||null,L=arguments[1],$=arguments[2],j=arguments[3]||0,it=null);let bt,Dt,Ht,Vt,ee,ae,Bt,X,xt;const Rt=L.isCompressedTexture?L.mipmaps[j]:L.image;it!==null?(bt=it.max.x-it.min.x,Dt=it.max.y-it.min.y,Ht=it.isBox3?it.max.z-it.min.z:1,Vt=it.min.x,ee=it.min.y,ae=it.isBox3?it.min.z:0):(bt=Rt.width,Dt=Rt.height,Ht=Rt.depth||1,Vt=0,ee=0,ae=0),ot!==null?(Bt=ot.x,X=ot.y,xt=ot.z):(Bt=0,X=0,xt=0);const Jt=qt.convert($.format),ne=qt.convert($.type);let Ut;$.isData3DTexture?(I.setTexture3D($,0),Ut=H.TEXTURE_3D):$.isDataArrayTexture||$.isCompressedArrayTexture?(I.setTexture2DArray($,0),Ut=H.TEXTURE_2D_ARRAY):(I.setTexture2D($,0),Ut=H.TEXTURE_2D),H.pixelStorei(H.UNPACK_FLIP_Y_WEBGL,$.flipY),H.pixelStorei(H.UNPACK_PREMULTIPLY_ALPHA_WEBGL,$.premultiplyAlpha),H.pixelStorei(H.UNPACK_ALIGNMENT,$.unpackAlignment);const Me=H.getParameter(H.UNPACK_ROW_LENGTH),se=H.getParameter(H.UNPACK_IMAGE_HEIGHT),Te=H.getParameter(H.UNPACK_SKIP_PIXELS),Fi=H.getParameter(H.UNPACK_SKIP_ROWS),un=H.getParameter(H.UNPACK_SKIP_IMAGES);H.pixelStorei(H.UNPACK_ROW_LENGTH,Rt.width),H.pixelStorei(H.UNPACK_IMAGE_HEIGHT,Rt.height),H.pixelStorei(H.UNPACK_SKIP_PIXELS,Vt),H.pixelStorei(H.UNPACK_SKIP_ROWS,ee),H.pixelStorei(H.UNPACK_SKIP_IMAGES,ae);const Ps=L.isDataArrayTexture||L.isData3DTexture,Se=$.isDataArrayTexture||$.isData3DTexture;if(L.isRenderTargetTexture||L.isDepthTexture){const Pn=wt.get(L),Ls=wt.get($),_n=wt.get(Pn.__renderTarget),ii=wt.get(Ls.__renderTarget);vt.bindFramebuffer(H.READ_FRAMEBUFFER,_n.__webglFramebuffer),vt.bindFramebuffer(H.DRAW_FRAMEBUFFER,ii.__webglFramebuffer);for(let si=0;si<Ht;si++)Ps&&H.framebufferTextureLayer(H.READ_FRAMEBUFFER,H.COLOR_ATTACHMENT0,wt.get(L).__webglTexture,j,ae+si),L.isDepthTexture?(Se&&H.framebufferTextureLayer(H.DRAW_FRAMEBUFFER,H.COLOR_ATTACHMENT0,wt.get($).__webglTexture,j,xt+si),H.blitFramebuffer(Vt,ee,bt,Dt,Bt,X,bt,Dt,H.DEPTH_BUFFER_BIT,H.NEAREST)):Se?H.copyTexSubImage3D(Ut,j,Bt,X,xt+si,Vt,ee,bt,Dt):H.copyTexSubImage2D(Ut,j,Bt,X,xt+si,Vt,ee,bt,Dt);vt.bindFramebuffer(H.READ_FRAMEBUFFER,null),vt.bindFramebuffer(H.DRAW_FRAMEBUFFER,null)}else Se?L.isDataTexture||L.isData3DTexture?H.texSubImage3D(Ut,j,Bt,X,xt,bt,Dt,Ht,Jt,ne,Rt.data):$.isCompressedArrayTexture?H.compressedTexSubImage3D(Ut,j,Bt,X,xt,bt,Dt,Ht,Jt,Rt.data):H.texSubImage3D(Ut,j,Bt,X,xt,bt,Dt,Ht,Jt,ne,Rt):L.isDataTexture?H.texSubImage2D(H.TEXTURE_2D,j,Bt,X,bt,Dt,Jt,ne,Rt.data):L.isCompressedTexture?H.compressedTexSubImage2D(H.TEXTURE_2D,j,Bt,X,Rt.width,Rt.height,Jt,Rt.data):H.texSubImage2D(H.TEXTURE_2D,j,Bt,X,bt,Dt,Jt,ne,Rt);H.pixelStorei(H.UNPACK_ROW_LENGTH,Me),H.pixelStorei(H.UNPACK_IMAGE_HEIGHT,se),H.pixelStorei(H.UNPACK_SKIP_PIXELS,Te),H.pixelStorei(H.UNPACK_SKIP_ROWS,Fi),H.pixelStorei(H.UNPACK_SKIP_IMAGES,un),j===0&&$.generateMipmaps&&H.generateMipmap(Ut),vt.unbindTexture()},this.copyTextureToTexture3D=function(L,$,it=null,ot=null,j=0){return L.isTexture!==!0&&(Xs("WebGLRenderer: copyTextureToTexture3D function signature has changed."),it=arguments[0]||null,ot=arguments[1]||null,L=arguments[2],$=arguments[3],j=arguments[4]||0),Xs('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(L,$,it,ot,j)},this.initRenderTarget=function(L){wt.get(L).__webglFramebuffer===void 0&&I.setupRenderTarget(L)},this.initTexture=function(L){L.isCubeTexture?I.setTextureCube(L,0):L.isData3DTexture?I.setTexture3D(L,0):L.isDataArrayTexture||L.isCompressedArrayTexture?I.setTexture2DArray(L,0):I.setTexture2D(L,0),vt.unbindTexture()},this.resetState=function(){M=0,E=0,b=null,vt.reset(),me.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Yn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorspace=ve._getDrawingBufferColorSpace(t),e.unpackColorSpace=ve._getUnpackColorSpace()}}class oo extends Xe{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new be,this.environmentIntensity=1,this.environmentRotation=new be,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}}class Ii extends Qe{constructor(t=null,e=1,n=1,i,o,r,a,c,l=rn,h=rn,d,u){super(null,r,a,c,l,h,i,o,d,u),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class mi extends ge{constructor(t,e,n,i=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=i}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){const t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}}const Ji=new $t,Al=new $t,Bo=[],Cl=new He,Ig=new $t,Ns=new pe,Fs=new Ce;class Ui extends pe{constructor(t,e,n){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new mi(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let i=0;i<n;i++)this.setMatrixAt(i,Ig)}computeBoundingBox(){const t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new He),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Ji),Cl.copy(t.boundingBox).applyMatrix4(Ji),this.boundingBox.union(Cl)}computeBoundingSphere(){const t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new Ce),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Ji),Fs.copy(t.boundingSphere).applyMatrix4(Ji),this.boundingSphere.union(Fs)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){const n=e.morphTargetInfluences,i=this.morphTexture.source.data.data,o=n.length+1,r=t*o+1;for(let a=0;a<n.length;a++)n[a]=i[r+a]}raycast(t,e){const n=this.matrixWorld,i=this.count;if(Ns.geometry=this.geometry,Ns.material=this.material,Ns.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Fs.copy(this.boundingSphere),Fs.applyMatrix4(n),t.ray.intersectsSphere(Fs)!==!1))for(let o=0;o<i;o++){this.getMatrixAt(o,Ji),Al.multiplyMatrices(n,Ji),Ns.matrixWorld=Al,Ns.raycast(t,Bo);for(let r=0,a=Bo.length;r<a;r++){const c=Bo[r];c.instanceId=o,c.object=this,e.push(c)}Bo.length=0}}setColorAt(t,e){this.instanceColor===null&&(this.instanceColor=new mi(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3)}setMatrixAt(t,e){e.toArray(this.instanceMatrix.array,t*16)}setMorphAt(t,e){const n=e.morphTargetInfluences,i=n.length+1;this.morphTexture===null&&(this.morphTexture=new Ii(new Float32Array(i*this.count),i,this.count,io,vn));const o=this.morphTexture.source.data.data;let r=0;for(let l=0;l<n.length;l++)r+=n[l];const a=this.geometry.morphTargetsRelative?1:1-r,c=i*t;o[c]=a,o.set(n,c+1)}updateMorphTargets(){}dispose(){return this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null),this}}function Hr(s,t){return s-t}function zg(s,t){return s.z-t.z}function Ug(s,t){return t.z-s.z}class Ng{constructor(){this.index=0,this.pool=[],this.list=[]}push(t,e,n,i){const o=this.pool,r=this.list;this.index>=o.length&&o.push({start:-1,count:-1,z:-1,index:-1});const a=o[this.index];r.push(a),this.index++,a.start=t,a.count=e,a.z=n,a.index=i}reset(){this.list.length=0,this.index=0}}const an=new $t,Fg=new Ot(1,1,1),Gr=new xs,Ho=new He,Mi=new Ce,Os=new P,Rl=new P,Og=new P,Vr=new Ng,je=new pe,Go=[];function kg(s,t,e=0){const n=t.itemSize;if(s.isInterleavedBufferAttribute||s.array.constructor!==t.array.constructor){const i=s.count;for(let o=0;o<i;o++)for(let r=0;r<n;r++)t.setComponent(o+e,r,s.getComponent(o,r))}else t.array.set(s.array,e*n);t.needsUpdate=!0}function Si(s,t){if(s.constructor!==t.constructor){const e=Math.min(s.length,t.length);for(let n=0;n<e;n++)t[n]=s[n]}else{const e=Math.min(s.length,t.length);t.set(new s.constructor(s.buffer,0,e))}}class Bg extends pe{get maxInstanceCount(){return this._maxInstanceCount}get instanceCount(){return this._instanceInfo.length-this._availableInstanceIds.length}get unusedVertexCount(){return this._maxVertexCount-this._nextVertexStart}get unusedIndexCount(){return this._maxIndexCount-this._nextIndexStart}constructor(t,e,n=e*2,i){super(new re,i),this.isBatchedMesh=!0,this.perObjectFrustumCulled=!0,this.sortObjects=!0,this.boundingBox=null,this.boundingSphere=null,this.customSort=null,this._instanceInfo=[],this._geometryInfo=[],this._availableInstanceIds=[],this._availableGeometryIds=[],this._nextIndexStart=0,this._nextVertexStart=0,this._geometryCount=0,this._visibilityChanged=!0,this._geometryInitialized=!1,this._maxInstanceCount=t,this._maxVertexCount=e,this._maxIndexCount=n,this._multiDrawCounts=new Int32Array(t),this._multiDrawStarts=new Int32Array(t),this._multiDrawCount=0,this._multiDrawInstances=null,this._matricesTexture=null,this._indirectTexture=null,this._colorsTexture=null,this._initMatricesTexture(),this._initIndirectTexture()}_initMatricesTexture(){let t=Math.sqrt(this._maxInstanceCount*4);t=Math.ceil(t/4)*4,t=Math.max(t,4);const e=new Float32Array(t*t*4),n=new Ii(e,t,t,Ke,vn);this._matricesTexture=n}_initIndirectTexture(){let t=Math.sqrt(this._maxInstanceCount);t=Math.ceil(t);const e=new Uint32Array(t*t),n=new Ii(e,t,t,ar,Qn);this._indirectTexture=n}_initColorsTexture(){let t=Math.sqrt(this._maxInstanceCount);t=Math.ceil(t);const e=new Float32Array(t*t*4).fill(1),n=new Ii(e,t,t,Ke,vn);n.colorSpace=ve.workingColorSpace,this._colorsTexture=n}_initializeGeometry(t){const e=this.geometry,n=this._maxVertexCount,i=this._maxIndexCount;if(this._geometryInitialized===!1){for(const o in t.attributes){const r=t.getAttribute(o),{array:a,itemSize:c,normalized:l}=r,h=new a.constructor(n*c),d=new ge(h,c,l);e.setAttribute(o,d)}if(t.getIndex()!==null){const o=n>65535?new Uint32Array(i):new Uint16Array(i);e.setIndex(new ge(o,1))}this._geometryInitialized=!0}}_validateGeometry(t){const e=this.geometry;if(!!t.getIndex()!=!!e.getIndex())throw new Error('BatchedMesh: All geometries must consistently have "index".');for(const n in e.attributes){if(!t.hasAttribute(n))throw new Error(`BatchedMesh: Added geometry missing "${n}". All geometries must have consistent attributes.`);const i=t.getAttribute(n),o=e.getAttribute(n);if(i.itemSize!==o.itemSize||i.normalized!==o.normalized)throw new Error("BatchedMesh: All attributes must have a consistent itemSize and normalized value.")}}setCustomSort(t){return this.customSort=t,this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new He);const t=this.boundingBox,e=this._instanceInfo;t.makeEmpty();for(let n=0,i=e.length;n<i;n++){if(e[n].active===!1)continue;const o=e[n].geometryIndex;this.getMatrixAt(n,an),this.getBoundingBoxAt(o,Ho).applyMatrix4(an),t.union(Ho)}}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ce);const t=this.boundingSphere,e=this._instanceInfo;t.makeEmpty();for(let n=0,i=e.length;n<i;n++){if(e[n].active===!1)continue;const o=e[n].geometryIndex;this.getMatrixAt(n,an),this.getBoundingSphereAt(o,Mi).applyMatrix4(an),t.union(Mi)}}addInstance(t){if(this._instanceInfo.length>=this.maxInstanceCount&&this._availableInstanceIds.length===0)throw new Error("BatchedMesh: Maximum item count reached.");const n={visible:!0,active:!0,geometryIndex:t};let i=null;this._availableInstanceIds.length>0?(this._availableInstanceIds.sort(Hr),i=this._availableInstanceIds.shift(),this._instanceInfo[i]=n):(i=this._instanceInfo.length,this._instanceInfo.push(n));const o=this._matricesTexture;an.identity().toArray(o.image.data,i*16),o.needsUpdate=!0;const r=this._colorsTexture;return r&&(Fg.toArray(r.image.data,i*4),r.needsUpdate=!0),this._visibilityChanged=!0,i}addGeometry(t,e=-1,n=-1){this._initializeGeometry(t),this._validateGeometry(t);const i={vertexStart:-1,vertexCount:-1,reservedVertexCount:-1,indexStart:-1,indexCount:-1,reservedIndexCount:-1,start:-1,count:-1,boundingBox:null,boundingSphere:null,active:!0},o=this._geometryInfo;i.vertexStart=this._nextVertexStart,i.reservedVertexCount=e===-1?t.getAttribute("position").count:e;const r=t.getIndex();if(r!==null&&(i.indexStart=this._nextIndexStart,i.reservedIndexCount=n===-1?r.count:n),i.indexStart!==-1&&i.indexStart+i.reservedIndexCount>this._maxIndexCount||i.vertexStart+i.reservedVertexCount>this._maxVertexCount)throw new Error("BatchedMesh: Reserved space request exceeds the maximum buffer size.");let c;return this._availableGeometryIds.length>0?(this._availableGeometryIds.sort(Hr),c=this._availableGeometryIds.shift(),o[c]=i):(c=this._geometryCount,this._geometryCount++,o.push(i)),this.setGeometryAt(c,t),this._nextIndexStart=i.indexStart+i.reservedIndexCount,this._nextVertexStart=i.vertexStart+i.reservedVertexCount,c}setGeometryAt(t,e){if(t>=this._geometryCount)throw new Error("BatchedMesh: Maximum geometry count reached.");this._validateGeometry(e);const n=this.geometry,i=n.getIndex()!==null,o=n.getIndex(),r=e.getIndex(),a=this._geometryInfo[t];if(i&&r.count>a.reservedIndexCount||e.attributes.position.count>a.reservedVertexCount)throw new Error("BatchedMesh: Reserved space not large enough for provided geometry.");const c=a.vertexStart,l=a.reservedVertexCount;a.vertexCount=e.getAttribute("position").count;for(const h in n.attributes){const d=e.getAttribute(h),u=n.getAttribute(h);kg(d,u,c);const f=d.itemSize;for(let p=d.count,x=l;p<x;p++){const g=c+p;for(let m=0;m<f;m++)u.setComponent(g,m,0)}u.needsUpdate=!0,u.addUpdateRange(c*f,l*f)}if(i){const h=a.indexStart,d=a.reservedIndexCount;a.indexCount=e.getIndex().count;for(let u=0;u<r.count;u++)o.setX(h+u,c+r.getX(u));for(let u=r.count,f=d;u<f;u++)o.setX(h+u,c);o.needsUpdate=!0,o.addUpdateRange(h,a.reservedIndexCount)}return a.start=i?a.indexStart:a.vertexStart,a.count=i?a.indexCount:a.vertexCount,a.boundingBox=null,e.boundingBox!==null&&(a.boundingBox=e.boundingBox.clone()),a.boundingSphere=null,e.boundingSphere!==null&&(a.boundingSphere=e.boundingSphere.clone()),this._visibilityChanged=!0,t}deleteGeometry(t){const e=this._geometryInfo;if(t>=e.length||e[t].active===!1)return this;const n=this._instanceInfo;for(let i=0,o=n.length;i<o;i++)n[i].geometryIndex===t&&this.deleteInstance(i);return e[t].active=!1,this._availableGeometryIds.push(t),this._visibilityChanged=!0,this}deleteInstance(t){const e=this._instanceInfo;return t>=e.length||e[t].active===!1?this:(e[t].active=!1,this._availableInstanceIds.push(t),this._visibilityChanged=!0,this)}optimize(){let t=0,e=0;const n=this._geometryInfo,i=n.map((r,a)=>a).sort((r,a)=>n[r].vertexStart-n[a].vertexStart),o=this.geometry;for(let r=0,a=n.length;r<a;r++){const c=i[r],l=n[c];if(l.active!==!1){if(o.index!==null){if(l.indexStart!==e){const{indexStart:h,vertexStart:d,reservedIndexCount:u}=l,f=o.index,p=f.array,x=t-d;for(let g=h;g<h+u;g++)p[g]=p[g]+x;f.array.copyWithin(e,h,h+u),f.addUpdateRange(e,u),l.indexStart=e}e+=l.reservedIndexCount}if(l.vertexStart!==t){const{vertexStart:h,reservedVertexCount:d}=l,u=o.attributes;for(const f in u){const p=u[f],{array:x,itemSize:g}=p;x.copyWithin(t*g,h*g,(h+d)*g),p.addUpdateRange(t*g,d*g)}l.vertexStart=t}t+=l.reservedVertexCount,l.start=o.index?l.indexStart:l.vertexStart,this._nextIndexStart=o.index?l.indexStart+l.reservedIndexCount:0,this._nextVertexStart=l.vertexStart+l.reservedVertexCount}}return this}getBoundingBoxAt(t,e){if(t>=this._geometryCount)return null;const n=this.geometry,i=this._geometryInfo[t];if(i.boundingBox===null){const o=new He,r=n.index,a=n.attributes.position;for(let c=i.start,l=i.start+i.count;c<l;c++){let h=c;r&&(h=r.getX(h)),o.expandByPoint(Os.fromBufferAttribute(a,h))}i.boundingBox=o}return e.copy(i.boundingBox),e}getBoundingSphereAt(t,e){if(t>=this._geometryCount)return null;const n=this.geometry,i=this._geometryInfo[t];if(i.boundingSphere===null){const o=new Ce;this.getBoundingBoxAt(t,Ho),Ho.getCenter(o.center);const r=n.index,a=n.attributes.position;let c=0;for(let l=i.start,h=i.start+i.count;l<h;l++){let d=l;r&&(d=r.getX(d)),Os.fromBufferAttribute(a,d),c=Math.max(c,o.center.distanceToSquared(Os))}o.radius=Math.sqrt(c),i.boundingSphere=o}return e.copy(i.boundingSphere),e}setMatrixAt(t,e){const n=this._instanceInfo,i=this._matricesTexture,o=this._matricesTexture.image.data;return t>=n.length||n[t].active===!1?this:(e.toArray(o,t*16),i.needsUpdate=!0,this)}getMatrixAt(t,e){const n=this._instanceInfo,i=this._matricesTexture.image.data;return t>=n.length||n[t].active===!1?null:e.fromArray(i,t*16)}setColorAt(t,e){this._colorsTexture===null&&this._initColorsTexture();const n=this._colorsTexture,i=this._colorsTexture.image.data,o=this._instanceInfo;return t>=o.length||o[t].active===!1?this:(e.toArray(i,t*4),n.needsUpdate=!0,this)}getColorAt(t,e){const n=this._colorsTexture.image.data,i=this._instanceInfo;return t>=i.length||i[t].active===!1?null:e.fromArray(n,t*4)}setVisibleAt(t,e){const n=this._instanceInfo;return t>=n.length||n[t].active===!1||n[t].visible===e?this:(n[t].visible=e,this._visibilityChanged=!0,this)}getVisibleAt(t){const e=this._instanceInfo;return t>=e.length||e[t].active===!1?!1:e[t].visible}setGeometryIdAt(t,e){const n=this._instanceInfo,i=this._geometryInfo;return t>=n.length||n[t].active===!1||e>=i.length||i[e].active===!1?null:(n[t].geometryIndex=e,this)}getGeometryIdAt(t){const e=this._instanceInfo;return t>=e.length||e[t].active===!1?-1:e[t].geometryIndex}getGeometryRangeAt(t,e={}){if(t<0||t>=this._geometryCount)return null;const n=this._geometryInfo[t];return e.vertexStart=n.vertexStart,e.vertexCount=n.vertexCount,e.reservedVertexCount=n.reservedVertexCount,e.indexStart=n.indexStart,e.indexCount=n.indexCount,e.reservedIndexCount=n.reservedIndexCount,e.start=n.start,e.count=n.count,e}setInstanceCount(t){const e=this._availableInstanceIds,n=this._instanceInfo;for(e.sort(Hr);e[e.length-1]===n.length;)n.pop(),e.pop();if(t<n.length)throw new Error(`BatchedMesh: Instance ids outside the range ${t} are being used. Cannot shrink instance count.`);const i=new Int32Array(t),o=new Int32Array(t);Si(this._multiDrawCounts,i),Si(this._multiDrawStarts,o),this._multiDrawCounts=i,this._multiDrawStarts=o,this._maxInstanceCount=t;const r=this._indirectTexture,a=this._matricesTexture,c=this._colorsTexture;r.dispose(),this._initIndirectTexture(),Si(r.image.data,this._indirectTexture.image.data),a.dispose(),this._initMatricesTexture(),Si(a.image.data,this._matricesTexture.image.data),c&&(c.dispose(),this._initColorsTexture(),Si(c.image.data,this._colorsTexture.image.data))}setGeometrySize(t,e){const n=[...this._geometryInfo].filter(a=>a.active);if(Math.max(...n.map(a=>a.vertexStart+a.reservedVertexCount))>t)throw new Error(`BatchedMesh: Geometry vertex values are being used outside the range ${e}. Cannot shrink further.`);if(this.geometry.index&&Math.max(...n.map(c=>c.indexStart+c.reservedIndexCount))>e)throw new Error(`BatchedMesh: Geometry index values are being used outside the range ${e}. Cannot shrink further.`);const o=this.geometry;o.dispose(),this._maxVertexCount=t,this._maxIndexCount=e,this._geometryInitialized&&(this._geometryInitialized=!1,this.geometry=new re,this._initializeGeometry(o));const r=this.geometry;o.index&&Si(o.index.array,r.index.array);for(const a in o.attributes)Si(o.attributes[a].array,r.attributes[a].array)}raycast(t,e){const n=this._instanceInfo,i=this._geometryInfo,o=this.matrixWorld,r=this.geometry;je.material=this.material,je.geometry.index=r.index,je.geometry.attributes=r.attributes,je.geometry.boundingBox===null&&(je.geometry.boundingBox=new He),je.geometry.boundingSphere===null&&(je.geometry.boundingSphere=new Ce);for(let a=0,c=n.length;a<c;a++){if(!n[a].visible||!n[a].active)continue;const l=n[a].geometryIndex,h=i[l];je.geometry.setDrawRange(h.start,h.count),this.getMatrixAt(a,je.matrixWorld).premultiply(o),this.getBoundingBoxAt(l,je.geometry.boundingBox),this.getBoundingSphereAt(l,je.geometry.boundingSphere),je.raycast(t,Go);for(let d=0,u=Go.length;d<u;d++){const f=Go[d];f.object=this,f.batchId=a,e.push(f)}Go.length=0}je.material=null,je.geometry.index=null,je.geometry.attributes={},je.geometry.setDrawRange(0,1/0)}copy(t){return super.copy(t),this.geometry=t.geometry.clone(),this.perObjectFrustumCulled=t.perObjectFrustumCulled,this.sortObjects=t.sortObjects,this.boundingBox=t.boundingBox!==null?t.boundingBox.clone():null,this.boundingSphere=t.boundingSphere!==null?t.boundingSphere.clone():null,this._geometryInfo=t._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox!==null?e.boundingBox.clone():null,boundingSphere:e.boundingSphere!==null?e.boundingSphere.clone():null})),this._instanceInfo=t._instanceInfo.map(e=>({...e})),this._maxInstanceCount=t._maxInstanceCount,this._maxVertexCount=t._maxVertexCount,this._maxIndexCount=t._maxIndexCount,this._geometryInitialized=t._geometryInitialized,this._geometryCount=t._geometryCount,this._multiDrawCounts=t._multiDrawCounts.slice(),this._multiDrawStarts=t._multiDrawStarts.slice(),this._matricesTexture=t._matricesTexture.clone(),this._matricesTexture.image.data=this._matricesTexture.image.data.slice(),this._colorsTexture!==null&&(this._colorsTexture=t._colorsTexture.clone(),this._colorsTexture.image.data=this._colorsTexture.image.data.slice()),this}dispose(){return this.geometry.dispose(),this._matricesTexture.dispose(),this._matricesTexture=null,this._indirectTexture.dispose(),this._indirectTexture=null,this._colorsTexture!==null&&(this._colorsTexture.dispose(),this._colorsTexture=null),this}onBeforeRender(t,e,n,i,o){if(!this._visibilityChanged&&!this.perObjectFrustumCulled&&!this.sortObjects)return;const r=i.getIndex(),a=r===null?1:r.array.BYTES_PER_ELEMENT,c=this._instanceInfo,l=this._multiDrawStarts,h=this._multiDrawCounts,d=this._geometryInfo,u=this.perObjectFrustumCulled,f=this._indirectTexture,p=f.image.data;u&&(an.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse).multiply(this.matrixWorld),Gr.setFromProjectionMatrix(an,t.coordinateSystem));let x=0;if(this.sortObjects){an.copy(this.matrixWorld).invert(),Os.setFromMatrixPosition(n.matrixWorld).applyMatrix4(an),Rl.set(0,0,-1).transformDirection(n.matrixWorld).transformDirection(an);for(let w=0,y=c.length;w<y;w++)if(c[w].visible&&c[w].active){const v=c[w].geometryIndex;this.getMatrixAt(w,an),this.getBoundingSphereAt(v,Mi).applyMatrix4(an);let T=!1;if(u&&(T=!Gr.intersectsSphere(Mi)),!T){const M=d[v],E=Og.subVectors(Mi.center,Os).dot(Rl);Vr.push(M.start,M.count,E,w)}}const g=Vr.list,m=this.customSort;m===null?g.sort(o.transparent?Ug:zg):m.call(this,g,n);for(let w=0,y=g.length;w<y;w++){const v=g[w];l[x]=v.start*a,h[x]=v.count,p[x]=v.index,x++}Vr.reset()}else for(let g=0,m=c.length;g<m;g++)if(c[g].visible&&c[g].active){const w=c[g].geometryIndex;let y=!1;if(u&&(this.getMatrixAt(g,an),this.getBoundingSphereAt(w,Mi).applyMatrix4(an),y=!Gr.intersectsSphere(Mi)),!y){const v=d[w];l[x]=v.start*a,h[x]=v.count,p[x]=g,x++}}f.needsUpdate=!0,this._multiDrawCount=x,this._visibilityChanged=!1}onBeforeShadow(t,e,n,i,o,r){this.onBeforeRender(t,null,i,o,r)}}class Hg extends Es{static get type(){return"PointsMaterial"}constructor(t){super(),this.isPointsMaterial=!0,this.color=new Ot(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}}const Pl=new $t,ja=new Dh,Vo=new Ce,Wo=new P;class Gg extends Xe{constructor(t=new re,e=new Hg){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}raycast(t,e){const n=this.geometry,i=this.matrixWorld,o=t.params.Points.threshold,r=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Vo.copy(n.boundingSphere),Vo.applyMatrix4(i),Vo.radius+=o,t.ray.intersectsSphere(Vo)===!1)return;Pl.copy(i).invert(),ja.copy(t.ray).applyMatrix4(Pl);const a=o/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=n.index,d=n.attributes.position;if(l!==null){const u=Math.max(0,r.start),f=Math.min(l.count,r.start+r.count);for(let p=u,x=f;p<x;p++){const g=l.getX(p);Wo.fromBufferAttribute(d,g),Ll(Wo,g,c,i,t,e,this)}}else{const u=Math.max(0,r.start),f=Math.min(d.count,r.start+r.count);for(let p=u,x=f;p<x;p++)Wo.fromBufferAttribute(d,p),Ll(Wo,p,c,i,t,e,this)}}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let o=0,r=i.length;o<r;o++){const a=i[o].name||String(o);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=o}}}}}function Ll(s,t,e,n,i,o,r){const a=ja.distanceSqToPoint(s);if(a<e){const c=new P;ja.closestPointToPoint(s,c),c.applyMatrix4(n);const l=i.ray.origin.distanceTo(c);if(l<i.near||l>i.far)return;o.push({distance:l,distanceToRay:Math.sqrt(a),point:c,index:t,face:null,faceIndex:null,barycoord:null,object:r})}}class lo extends Qe{constructor(t,e,n,i,o,r,a,c,l){super(t,e,n,i,o,r,a,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}}class ei{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(t,e){const n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){const t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const e=[];let n,i=this.getPoint(0),o=0;e.push(0);for(let r=1;r<=t;r++)n=this.getPoint(r/t),o+=n.distanceTo(i),e.push(o),i=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e){const n=this.getLengths();let i=0;const o=n.length;let r;e?r=e:r=t*n[o-1];let a=0,c=o-1,l;for(;a<=c;)if(i=Math.floor(a+(c-a)/2),l=n[i]-r,l<0)a=i+1;else if(l>0)c=i-1;else{c=i;break}if(i=c,n[i]===r)return i/(o-1);const h=n[i],u=n[i+1]-h,f=(r-h)/u;return(i+f)/(o-1)}getTangent(t,e){let i=t-1e-4,o=t+1e-4;i<0&&(i=0),o>1&&(o=1);const r=this.getPoint(i),a=this.getPoint(o),c=e||(r.isVector2?new Ft:new P);return c.copy(a).sub(r).normalize(),c}getTangentAt(t,e){const n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e){const n=new P,i=[],o=[],r=[],a=new P,c=new $t;for(let f=0;f<=t;f++){const p=f/t;i[f]=this.getTangentAt(p,new P)}o[0]=new P,r[0]=new P;let l=Number.MAX_VALUE;const h=Math.abs(i[0].x),d=Math.abs(i[0].y),u=Math.abs(i[0].z);h<=l&&(l=h,n.set(1,0,0)),d<=l&&(l=d,n.set(0,1,0)),u<=l&&n.set(0,0,1),a.crossVectors(i[0],n).normalize(),o[0].crossVectors(i[0],a),r[0].crossVectors(i[0],o[0]);for(let f=1;f<=t;f++){if(o[f]=o[f-1].clone(),r[f]=r[f-1].clone(),a.crossVectors(i[f-1],i[f]),a.length()>Number.EPSILON){a.normalize();const p=Math.acos(Ue(i[f-1].dot(i[f]),-1,1));o[f].applyMatrix4(c.makeRotationAxis(a,p))}r[f].crossVectors(i[f],o[f])}if(e===!0){let f=Math.acos(Ue(o[0].dot(o[t]),-1,1));f/=t,i[0].dot(a.crossVectors(o[0],o[t]))>0&&(f=-f);for(let p=1;p<=t;p++)o[p].applyMatrix4(c.makeRotationAxis(i[p],f*p)),r[p].crossVectors(i[p],o[p])}return{tangents:i,normals:o,binormals:r}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){const t={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}}class qh extends ei{constructor(t=0,e=0,n=1,i=1,o=0,r=Math.PI*2,a=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=i,this.aStartAngle=o,this.aEndAngle=r,this.aClockwise=a,this.aRotation=c}getPoint(t,e=new Ft){const n=e,i=Math.PI*2;let o=this.aEndAngle-this.aStartAngle;const r=Math.abs(o)<Number.EPSILON;for(;o<0;)o+=i;for(;o>i;)o-=i;o<Number.EPSILON&&(r?o=0:o=i),this.aClockwise===!0&&!r&&(o===i?o=-i:o=o-i);const a=this.aStartAngle+t*o;let c=this.aX+this.xRadius*Math.cos(a),l=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){const h=Math.cos(this.aRotation),d=Math.sin(this.aRotation),u=c-this.aX,f=l-this.aY;c=u*h-f*d+this.aX,l=u*d+f*h+this.aY}return n.set(c,l)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){const t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}}class Vg extends qh{constructor(t,e,n,i,o,r){super(t,e,n,n,i,o,r),this.isArcCurve=!0,this.type="ArcCurve"}}function mc(){let s=0,t=0,e=0,n=0;function i(o,r,a,c){s=o,t=a,e=-3*o+3*r-2*a-c,n=2*o-2*r+a+c}return{initCatmullRom:function(o,r,a,c,l){i(r,a,l*(a-o),l*(c-r))},initNonuniformCatmullRom:function(o,r,a,c,l,h,d){let u=(r-o)/l-(a-o)/(l+h)+(a-r)/h,f=(a-r)/h-(c-r)/(h+d)+(c-a)/d;u*=h,f*=h,i(r,a,u,f)},calc:function(o){const r=o*o,a=r*o;return s+t*o+e*r+n*a}}}const Xo=new P,Wr=new mc,Xr=new mc,qr=new mc;class Yh extends ei{constructor(t=[],e=!1,n="centripetal",i=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=i}getPoint(t,e=new P){const n=e,i=this.points,o=i.length,r=(o-(this.closed?0:1))*t;let a=Math.floor(r),c=r-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/o)+1)*o:c===0&&a===o-1&&(a=o-2,c=1);let l,h;this.closed||a>0?l=i[(a-1)%o]:(Xo.subVectors(i[0],i[1]).add(i[0]),l=Xo);const d=i[a%o],u=i[(a+1)%o];if(this.closed||a+2<o?h=i[(a+2)%o]:(Xo.subVectors(i[o-1],i[o-2]).add(i[o-1]),h=Xo),this.curveType==="centripetal"||this.curveType==="chordal"){const f=this.curveType==="chordal"?.5:.25;let p=Math.pow(l.distanceToSquared(d),f),x=Math.pow(d.distanceToSquared(u),f),g=Math.pow(u.distanceToSquared(h),f);x<1e-4&&(x=1),p<1e-4&&(p=x),g<1e-4&&(g=x),Wr.initNonuniformCatmullRom(l.x,d.x,u.x,h.x,p,x,g),Xr.initNonuniformCatmullRom(l.y,d.y,u.y,h.y,p,x,g),qr.initNonuniformCatmullRom(l.z,d.z,u.z,h.z,p,x,g)}else this.curveType==="catmullrom"&&(Wr.initCatmullRom(l.x,d.x,u.x,h.x,this.tension),Xr.initCatmullRom(l.y,d.y,u.y,h.y,this.tension),qr.initCatmullRom(l.z,d.z,u.z,h.z,this.tension));return n.set(Wr.calc(c),Xr.calc(c),qr.calc(c)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(i.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const i=this.points[e];t.points.push(i.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(new P().fromArray(i))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}}function Dl(s,t,e,n,i){const o=(n-t)*.5,r=(i-e)*.5,a=s*s,c=s*a;return(2*e-2*n+o+r)*c+(-3*e+3*n-2*o-r)*a+o*s+e}function Wg(s,t){const e=1-s;return e*e*t}function Xg(s,t){return 2*(1-s)*s*t}function qg(s,t){return s*s*t}function Ks(s,t,e,n){return Wg(s,t)+Xg(s,e)+qg(s,n)}function Yg(s,t){const e=1-s;return e*e*e*t}function $g(s,t){const e=1-s;return 3*e*e*s*t}function jg(s,t){return 3*(1-s)*s*s*t}function Zg(s,t){return s*s*s*t}function Js(s,t,e,n,i){return Yg(s,t)+$g(s,e)+jg(s,n)+Zg(s,i)}class Kg extends ei{constructor(t=new Ft,e=new Ft,n=new Ft,i=new Ft){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new Ft){const n=e,i=this.v0,o=this.v1,r=this.v2,a=this.v3;return n.set(Js(t,i.x,o.x,r.x,a.x),Js(t,i.y,o.y,r.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Jg extends ei{constructor(t=new P,e=new P,n=new P,i=new P){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new P){const n=e,i=this.v0,o=this.v1,r=this.v2,a=this.v3;return n.set(Js(t,i.x,o.x,r.x,a.x),Js(t,i.y,o.y,r.y,a.y),Js(t,i.z,o.z,r.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Qg extends ei{constructor(t=new Ft,e=new Ft){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new Ft){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new Ft){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class t1 extends ei{constructor(t=new P,e=new P){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new P){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new P){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class e1 extends ei{constructor(t=new Ft,e=new Ft,n=new Ft){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new Ft){const n=e,i=this.v0,o=this.v1,r=this.v2;return n.set(Ks(t,i.x,o.x,r.x),Ks(t,i.y,o.y,r.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class $h extends ei{constructor(t=new P,e=new P,n=new P){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new P){const n=e,i=this.v0,o=this.v1,r=this.v2;return n.set(Ks(t,i.x,o.x,r.x),Ks(t,i.y,o.y,r.y),Ks(t,i.z,o.z,r.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class n1 extends ei{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new Ft){const n=e,i=this.points,o=(i.length-1)*t,r=Math.floor(o),a=o-r,c=i[r===0?r:r-1],l=i[r],h=i[r>i.length-2?i.length-1:r+1],d=i[r>i.length-3?i.length-1:r+2];return n.set(Dl(a,c.x,l.x,h.x,d.x),Dl(a,c.y,l.y,h.y,d.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(i.clone())}return this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const i=this.points[e];t.points.push(i.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(new Ft().fromArray(i))}return this}}var i1=Object.freeze({__proto__:null,ArcCurve:Vg,CatmullRomCurve3:Yh,CubicBezierCurve:Kg,CubicBezierCurve3:Jg,EllipseCurve:qh,LineCurve:Qg,LineCurve3:t1,QuadraticBezierCurve:e1,QuadraticBezierCurve3:$h,SplineCurve:n1});class gc extends re{constructor(t=1,e=32,n=0,i=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:i},e=Math.max(3,e);const o=[],r=[],a=[],c=[],l=new P,h=new Ft;r.push(0,0,0),a.push(0,0,1),c.push(.5,.5);for(let d=0,u=3;d<=e;d++,u+=3){const f=n+d/e*i;l.x=t*Math.cos(f),l.y=t*Math.sin(f),r.push(l.x,l.y,l.z),a.push(0,0,1),h.x=(r[u]/t+1)/2,h.y=(r[u+1]/t+1)/2,c.push(h.x,h.y)}for(let d=1;d<=e;d++)o.push(d,d+1,0);this.setIndex(o),this.setAttribute("position",new At(r,3)),this.setAttribute("normal",new At(a,3)),this.setAttribute("uv",new At(c,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new gc(t.radius,t.segments,t.thetaStart,t.thetaLength)}}class ye extends re{constructor(t=1,e=1,n=1,i=32,o=1,r=!1,a=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:i,heightSegments:o,openEnded:r,thetaStart:a,thetaLength:c};const l=this;i=Math.floor(i),o=Math.floor(o);const h=[],d=[],u=[],f=[];let p=0;const x=[],g=n/2;let m=0;w(),r===!1&&(t>0&&y(!0),e>0&&y(!1)),this.setIndex(h),this.setAttribute("position",new At(d,3)),this.setAttribute("normal",new At(u,3)),this.setAttribute("uv",new At(f,2));function w(){const v=new P,T=new P;let M=0;const E=(e-t)/n;for(let b=0;b<=o;b++){const _=[],S=b/o,R=S*(e-t)+t;for(let F=0;F<=i;F++){const z=F/i,A=z*c+a,U=Math.sin(A),N=Math.cos(A);T.x=R*U,T.y=-S*n+g,T.z=R*N,d.push(T.x,T.y,T.z),v.set(U,E,N).normalize(),u.push(v.x,v.y,v.z),f.push(z,1-S),_.push(p++)}x.push(_)}for(let b=0;b<i;b++)for(let _=0;_<o;_++){const S=x[_][b],R=x[_+1][b],F=x[_+1][b+1],z=x[_][b+1];(t>0||_!==0)&&(h.push(S,R,z),M+=3),(e>0||_!==o-1)&&(h.push(R,F,z),M+=3)}l.addGroup(m,M,0),m+=M}function y(v){const T=p,M=new Ft,E=new P;let b=0;const _=v===!0?t:e,S=v===!0?1:-1;for(let F=1;F<=i;F++)d.push(0,g*S,0),u.push(0,S,0),f.push(.5,.5),p++;const R=p;for(let F=0;F<=i;F++){const A=F/i*c+a,U=Math.cos(A),N=Math.sin(A);E.x=_*N,E.y=g*S,E.z=_*U,d.push(E.x,E.y,E.z),u.push(0,S,0),M.x=U*.5+.5,M.y=N*.5*S+.5,f.push(M.x,M.y),p++}for(let F=0;F<i;F++){const z=T+F,A=R+F;v===!0?h.push(A,A+1,z):h.push(A+1,A,z),b+=3}l.addGroup(m,b,v===!0?1:2),m+=b}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ye(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class vc extends ye{constructor(t=1,e=1,n=32,i=1,o=!1,r=0,a=Math.PI*2){super(0,t,e,n,i,o,r,a),this.type="ConeGeometry",this.parameters={radius:t,height:e,radialSegments:n,heightSegments:i,openEnded:o,thetaStart:r,thetaLength:a}}static fromJSON(t){return new vc(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class xc extends re{constructor(t=[],e=[],n=1,i=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:n,detail:i};const o=[],r=[];a(i),l(n),h(),this.setAttribute("position",new At(o,3)),this.setAttribute("normal",new At(o.slice(),3)),this.setAttribute("uv",new At(r,2)),i===0?this.computeVertexNormals():this.normalizeNormals();function a(w){const y=new P,v=new P,T=new P;for(let M=0;M<e.length;M+=3)f(e[M+0],y),f(e[M+1],v),f(e[M+2],T),c(y,v,T,w)}function c(w,y,v,T){const M=T+1,E=[];for(let b=0;b<=M;b++){E[b]=[];const _=w.clone().lerp(v,b/M),S=y.clone().lerp(v,b/M),R=M-b;for(let F=0;F<=R;F++)F===0&&b===M?E[b][F]=_:E[b][F]=_.clone().lerp(S,F/R)}for(let b=0;b<M;b++)for(let _=0;_<2*(M-b)-1;_++){const S=Math.floor(_/2);_%2===0?(u(E[b][S+1]),u(E[b+1][S]),u(E[b][S])):(u(E[b][S+1]),u(E[b+1][S+1]),u(E[b+1][S]))}}function l(w){const y=new P;for(let v=0;v<o.length;v+=3)y.x=o[v+0],y.y=o[v+1],y.z=o[v+2],y.normalize().multiplyScalar(w),o[v+0]=y.x,o[v+1]=y.y,o[v+2]=y.z}function h(){const w=new P;for(let y=0;y<o.length;y+=3){w.x=o[y+0],w.y=o[y+1],w.z=o[y+2];const v=g(w)/2/Math.PI+.5,T=m(w)/Math.PI+.5;r.push(v,1-T)}p(),d()}function d(){for(let w=0;w<r.length;w+=6){const y=r[w+0],v=r[w+2],T=r[w+4],M=Math.max(y,v,T),E=Math.min(y,v,T);M>.9&&E<.1&&(y<.2&&(r[w+0]+=1),v<.2&&(r[w+2]+=1),T<.2&&(r[w+4]+=1))}}function u(w){o.push(w.x,w.y,w.z)}function f(w,y){const v=w*3;y.x=t[v+0],y.y=t[v+1],y.z=t[v+2]}function p(){const w=new P,y=new P,v=new P,T=new P,M=new Ft,E=new Ft,b=new Ft;for(let _=0,S=0;_<o.length;_+=9,S+=6){w.set(o[_+0],o[_+1],o[_+2]),y.set(o[_+3],o[_+4],o[_+5]),v.set(o[_+6],o[_+7],o[_+8]),M.set(r[S+0],r[S+1]),E.set(r[S+2],r[S+3]),b.set(r[S+4],r[S+5]),T.copy(w).add(y).add(v).divideScalar(3);const R=g(T);x(M,S+0,w,R),x(E,S+2,y,R),x(b,S+4,v,R)}}function x(w,y,v,T){T<0&&w.x===1&&(r[y]=w.x-1),v.x===0&&v.z===0&&(r[y]=T/2/Math.PI+.5)}function g(w){return Math.atan2(w.z,-w.x)}function m(w){return Math.atan2(-w.y,Math.sqrt(w.x*w.x+w.z*w.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new xc(t.vertices,t.indices,t.radius,t.details)}}class _c extends xc{constructor(t=1,e=0){const n=(1+Math.sqrt(5))/2,i=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],o=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(i,o,t,e),this.type="IcosahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new _c(t.radius,t.detail)}}class Kn extends re{constructor(t=1,e=32,n=16,i=0,o=Math.PI*2,r=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:i,phiLength:o,thetaStart:r,thetaLength:a},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));const c=Math.min(r+a,Math.PI);let l=0;const h=[],d=new P,u=new P,f=[],p=[],x=[],g=[];for(let m=0;m<=n;m++){const w=[],y=m/n;let v=0;m===0&&r===0?v=.5/e:m===n&&c===Math.PI&&(v=-.5/e);for(let T=0;T<=e;T++){const M=T/e;d.x=-t*Math.cos(i+M*o)*Math.sin(r+y*a),d.y=t*Math.cos(r+y*a),d.z=t*Math.sin(i+M*o)*Math.sin(r+y*a),p.push(d.x,d.y,d.z),u.copy(d).normalize(),x.push(u.x,u.y,u.z),g.push(M+v,1-y),w.push(l++)}h.push(w)}for(let m=0;m<n;m++)for(let w=0;w<e;w++){const y=h[m][w+1],v=h[m][w],T=h[m+1][w],M=h[m+1][w+1];(m!==0||r>0)&&f.push(y,v,M),(m!==n-1||c<Math.PI)&&f.push(v,T,M)}this.setIndex(f),this.setAttribute("position",new At(p,3)),this.setAttribute("normal",new At(x,3)),this.setAttribute("uv",new At(g,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Kn(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}class Qs extends re{constructor(t=1,e=.4,n=12,i=48,o=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:i,arc:o},n=Math.floor(n),i=Math.floor(i);const r=[],a=[],c=[],l=[],h=new P,d=new P,u=new P;for(let f=0;f<=n;f++)for(let p=0;p<=i;p++){const x=p/i*o,g=f/n*Math.PI*2;d.x=(t+e*Math.cos(g))*Math.cos(x),d.y=(t+e*Math.cos(g))*Math.sin(x),d.z=e*Math.sin(g),a.push(d.x,d.y,d.z),h.x=t*Math.cos(x),h.y=t*Math.sin(x),u.subVectors(d,h).normalize(),c.push(u.x,u.y,u.z),l.push(p/i),l.push(f/n)}for(let f=1;f<=n;f++)for(let p=1;p<=i;p++){const x=(i+1)*f+p-1,g=(i+1)*(f-1)+p-1,m=(i+1)*(f-1)+p,w=(i+1)*f+p;r.push(x,g,w),r.push(g,m,w)}this.setIndex(r),this.setAttribute("position",new At(a,3)),this.setAttribute("normal",new At(c,3)),this.setAttribute("uv",new At(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Qs(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}}class wc extends re{constructor(t=new $h(new P(-1,-1,0),new P(-1,1,0),new P(1,1,0)),e=64,n=1,i=8,o=!1){super(),this.type="TubeGeometry",this.parameters={path:t,tubularSegments:e,radius:n,radialSegments:i,closed:o};const r=t.computeFrenetFrames(e,o);this.tangents=r.tangents,this.normals=r.normals,this.binormals=r.binormals;const a=new P,c=new P,l=new Ft;let h=new P;const d=[],u=[],f=[],p=[];x(),this.setIndex(p),this.setAttribute("position",new At(d,3)),this.setAttribute("normal",new At(u,3)),this.setAttribute("uv",new At(f,2));function x(){for(let y=0;y<e;y++)g(y);g(o===!1?e:0),w(),m()}function g(y){h=t.getPointAt(y/e,h);const v=r.normals[y],T=r.binormals[y];for(let M=0;M<=i;M++){const E=M/i*Math.PI*2,b=Math.sin(E),_=-Math.cos(E);c.x=_*v.x+b*T.x,c.y=_*v.y+b*T.y,c.z=_*v.z+b*T.z,c.normalize(),u.push(c.x,c.y,c.z),a.x=h.x+n*c.x,a.y=h.y+n*c.y,a.z=h.z+n*c.z,d.push(a.x,a.y,a.z)}}function m(){for(let y=1;y<=e;y++)for(let v=1;v<=i;v++){const T=(i+1)*(y-1)+(v-1),M=(i+1)*y+(v-1),E=(i+1)*y+v,b=(i+1)*(y-1)+v;p.push(T,M,b),p.push(M,E,b)}}function w(){for(let y=0;y<=e;y++)for(let v=0;v<=i;v++)l.x=y/e,l.y=v/i,f.push(l.x,l.y)}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){const t=super.toJSON();return t.path=this.parameters.path.toJSON(),t}static fromJSON(t){return new wc(new i1[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}}class he extends Es{static get type(){return"MeshStandardMaterial"}constructor(t){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.color=new Ot(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ot(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Th,this.normalScale=new Ft(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new be,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class ks extends he{static get type(){return"MeshPhysicalMaterial"}constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new Ft(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Ue(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Ot(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Ot(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Ot(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){this._dispersion>0!=t>0&&this.version++,this._dispersion=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}}class s1 extends Xe{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Ot(t),this.intensity=e}dispose(){}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(e.object.target=this.target.uuid),e}}const Yr=new $t,Il=new P,zl=new P;class o1{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Ft(512,512),this.map=null,this.mapPass=null,this.matrix=new $t,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new xs,this._frameExtents=new Ft(1,1),this._viewportCount=1,this._viewports=[new Ee(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,n=this.matrix;Il.setFromMatrixPosition(t.matrixWorld),e.position.copy(Il),zl.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(zl),e.updateMatrixWorld(),Yr.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Yr),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Yr)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}class r1 extends o1{constructor(){super(new co(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class a1 extends s1{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Xe.DEFAULT_UP),this.updateMatrix(),this.target=new Xe,this.shadow=new r1}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:oc}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=oc);const $r=new $t;class hr{constructor(t){t=t||{},this.zNear=t.webGL===!0?-1:0,this.vertices={near:[new P,new P,new P,new P],far:[new P,new P,new P,new P]},t.projectionMatrix!==void 0&&this.setFromProjectionMatrix(t.projectionMatrix,t.maxFar||1e4)}setFromProjectionMatrix(t,e){const n=this.zNear,i=t.elements[2*4+3]===0;return $r.copy(t).invert(),this.vertices.near[0].set(1,1,n),this.vertices.near[1].set(1,-1,n),this.vertices.near[2].set(-1,-1,n),this.vertices.near[3].set(-1,1,n),this.vertices.near.forEach(function(o){o.applyMatrix4($r)}),this.vertices.far[0].set(1,1,1),this.vertices.far[1].set(1,-1,1),this.vertices.far[2].set(-1,-1,1),this.vertices.far[3].set(-1,1,1),this.vertices.far.forEach(function(o){o.applyMatrix4($r);const r=Math.abs(o.z);i?o.z*=Math.min(e/r,1):o.multiplyScalar(Math.min(e/r,1))}),this.vertices}split(t,e){for(;t.length>e.length;)e.push(new hr);e.length=t.length;for(let n=0;n<t.length;n++){const i=e[n];if(n===0)for(let o=0;o<4;o++)i.vertices.near[o].copy(this.vertices.near[o]);else for(let o=0;o<4;o++)i.vertices.near[o].lerpVectors(this.vertices.near[o],this.vertices.far[o],t[n-1]);if(n===t.length-1)for(let o=0;o<4;o++)i.vertices.far[o].copy(this.vertices.far[o]);else for(let o=0;o<4;o++)i.vertices.far[o].lerpVectors(this.vertices.near[o],this.vertices.far[o],t[n])}}toSpace(t,e){for(let n=0;n<4;n++)e.vertices.near[n].copy(this.vertices.near[n]).applyMatrix4(t),e.vertices.far[n].copy(this.vertices.far[n]).applyMatrix4(t)}}const Ul={lights_fragment_begin:`
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
	`+ce.lights_pars_begin},Nl=new $t,jr=new hr({webGL:!0}),Hn=new P,Bs=new He,Zr=[],Kr=[],Jr=new $t,Fl=new $t,c1=new P(0,1,0);class l1{constructor(t){this.camera=t.camera,this.parent=t.parent,this.cascades=t.cascades||3,this.maxFar=t.maxFar||1e5,this.mode=t.mode||"practical",this.shadowMapSize=t.shadowMapSize||2048,this.shadowBias=t.shadowBias||1e-6,this.lightDirection=t.lightDirection||new P(1,-1,1).normalize(),this.lightIntensity=t.lightIntensity||3,this.lightNear=t.lightNear||1,this.lightFar=t.lightFar||2e3,this.lightMargin=t.lightMargin||200,this.customSplitsCallback=t.customSplitsCallback,this.fade=!1,this.mainFrustum=new hr({webGL:!0}),this.frustums=[],this.breaks=[],this.lights=[],this.shaders=new Map,this.createLights(),this.updateFrustums(),this.injectInclude()}createLights(){for(let t=0;t<this.cascades;t++){const e=new a1(16777215,this.lightIntensity);e.castShadow=!0,e.shadow.mapSize.width=this.shadowMapSize,e.shadow.mapSize.height=this.shadowMapSize,e.shadow.camera.near=this.lightNear,e.shadow.camera.far=this.lightFar,e.shadow.bias=this.shadowBias,this.parent.add(e),this.parent.add(e.target),this.lights.push(e)}}initCascades(){const t=this.camera;t.updateProjectionMatrix(),this.mainFrustum.setFromProjectionMatrix(t.projectionMatrix,this.maxFar),this.mainFrustum.split(this.breaks,this.frustums)}updateShadowBounds(){const t=this.frustums;for(let e=0;e<t.length;e++){const i=this.lights[e].shadow.camera,o=this.frustums[e],r=o.vertices.near,a=o.vertices.far,c=a[0];let l;c.distanceTo(a[2])>c.distanceTo(r[2])?l=a[2]:l=r[2];let h=c.distanceTo(l);if(this.fade){const d=this.camera,u=Math.max(d.far,this.maxFar),f=o.vertices.far[0].z/(u-d.near),p=.25*Math.pow(f,2)*(u-d.near);h+=p}i.left=-h/2,i.right=h/2,i.top=h/2,i.bottom=-h/2,i.updateProjectionMatrix()}}getBreaks(){const t=this.camera,e=Math.min(t.far,this.maxFar);switch(this.breaks.length=0,this.mode){case"uniform":n(this.cascades,t.near,e,this.breaks);break;case"logarithmic":i(this.cascades,t.near,e,this.breaks);break;case"practical":o(this.cascades,t.near,e,.5,this.breaks);break;case"custom":this.customSplitsCallback===void 0&&console.error("CSM: Custom split scheme callback not defined."),this.customSplitsCallback(this.cascades,t.near,e,this.breaks);break}function n(r,a,c,l){for(let h=1;h<r;h++)l.push((a+(c-a)*h/r)/c);l.push(1)}function i(r,a,c,l){for(let h=1;h<r;h++)l.push(a*(c/a)**(h/r)/c);l.push(1)}function o(r,a,c,l,h){Zr.length=0,Kr.length=0,i(r,a,c,Kr),n(r,a,c,Zr);for(let d=1;d<r;d++)h.push(Di.lerp(Zr[d-1],Kr[d-1],l));h.push(1)}}update(){const t=this.camera,e=this.frustums;Jr.lookAt(new P,this.lightDirection,c1),Fl.copy(Jr).invert();for(let n=0;n<e.length;n++){const i=this.lights[n],o=i.shadow.camera,r=(o.right-o.left)/this.shadowMapSize,a=(o.top-o.bottom)/this.shadowMapSize;Nl.multiplyMatrices(Fl,t.matrixWorld),e[n].toSpace(Nl,jr);const c=jr.vertices.near,l=jr.vertices.far;Bs.makeEmpty();for(let h=0;h<4;h++)Bs.expandByPoint(c[h]),Bs.expandByPoint(l[h]);Bs.getCenter(Hn),Hn.z=Bs.max.z+this.lightMargin,Hn.x=Math.floor(Hn.x/r)*r,Hn.y=Math.floor(Hn.y/a)*a,Hn.applyMatrix4(Jr),i.position.copy(Hn),i.target.position.copy(Hn),i.target.position.x+=this.lightDirection.x,i.target.position.y+=this.lightDirection.y,i.target.position.z+=this.lightDirection.z}}injectInclude(){ce.lights_fragment_begin=Ul.lights_fragment_begin,ce.lights_pars_begin=Ul.lights_pars_begin}setupMaterial(t){t.defines=t.defines||{},t.defines.USE_CSM=1,t.defines.CSM_CASCADES=this.cascades,this.fade&&(t.defines.CSM_FADE="");const e=[],n=this,i=this.shaders;t.onBeforeCompile=function(o){const r=Math.min(n.camera.far,n.maxFar);n.getExtendedBreaks(e),o.uniforms.CSM_cascades={value:e},o.uniforms.cameraNear={value:n.camera.near},o.uniforms.shadowFar={value:r},i.set(t,o)},i.set(t,null)}updateUniforms(){const t=Math.min(this.camera.far,this.maxFar);this.shaders.forEach(function(n,i){if(n!==null){const o=n.uniforms;this.getExtendedBreaks(o.CSM_cascades.value),o.cameraNear.value=this.camera.near,o.shadowFar.value=t}!this.fade&&"CSM_FADE"in i.defines?(delete i.defines.CSM_FADE,i.needsUpdate=!0):this.fade&&!("CSM_FADE"in i.defines)&&(i.defines.CSM_FADE="",i.needsUpdate=!0)},this)}getExtendedBreaks(t){for(;t.length<this.breaks.length;)t.push(new Ft);t.length=this.breaks.length;for(let e=0;e<this.cascades;e++){const n=this.breaks[e],i=this.breaks[e-1]||0;t[e].x=i,t[e].y=n}}updateFrustums(){this.getBreaks(),this.initCascades(),this.updateShadowBounds(),this.updateUniforms()}remove(){for(let t=0;t<this.lights.length;t++)this.parent.remove(this.lights[t].target),this.parent.remove(this.lights[t])}dispose(){const t=this.shaders;t.forEach(function(e,n){delete n.onBeforeCompile,delete n.defines.USE_CSM,delete n.defines.CSM_CASCADES,delete n.defines.CSM_FADE,e!==null&&(delete e.uniforms.CSM_cascades,delete e.uniforms.cameraNear,delete e.uniforms.shadowFar),n.needsUpdate=!0}),t.clear()}}const Xn=new Uint8Array(512);{const s=new Uint8Array(256);for(let e=0;e<256;e++)s[e]=e;let t=625341585;for(let e=255;e>0;e--){t^=t<<13,t>>>=0,t^=t>>>17,t^=t<<5,t>>>=0;const n=t%(e+1),i=s[e];s[e]=s[n],s[n]=i}for(let e=0;e<512;e++)Xn[e]=s[e&255]}const Ol=[1,1,-1,1,1,-1,-1,-1,1,0,-1,0,0,1,0,-1];function kl(s){return s*s*s*(s*(s*6-15)+10)}function Kt(s,t){const e=Math.floor(s),n=Math.floor(t),i=s-e,o=t-n,r=e&255,a=n&255,c=kl(i),l=kl(o),h=(m,w,y)=>{const v=(m&7)*2;return Ol[v]*w+Ol[v+1]*y},d=Xn[Xn[r]+a],u=Xn[Xn[r]+a+1],f=Xn[Xn[r+1]+a],p=Xn[Xn[r+1]+a+1],x=h(d,i,o)+c*(h(f,i-1,o)-h(d,i,o)),g=h(u,i,o-1)+c*(h(p,i-1,o-1)-h(u,i,o-1));return(x+l*(g-x))*1.41}function De(s,t,e=5,n=2,i=.5){let o=.5,r=1,a=0,c=0;for(let l=0;l<e;l++)a+=o*Kt(s*r+l*17.13,t*r-l*9.71),c+=o,o*=i,r*=n;return a/c}function Hs(s,t,e=4){let n=.5,i=1,o=0;for(let r=0;r<e;r++){const a=1-Math.abs(Kt(s*i+r*3.3,t*i+r*7.7));o+=a*a*n,n*=.5,i*=2.1}return o}function Nt(s,t,e){const n=Math.min(1,Math.max(0,(e-s)/(t-s)));return n*n*(3-2*n)}function jt(s,t,e){return s<t?t:s>e?e:s}function de(s,t,e){return s+(t-s)*e}function Gn(s,t,e){const n=jt(.5+.5*(t-s)/e,0,1);return de(t,s,n)-e*n*(1-n)}const h1=6,u1=1,d1=new Ot(.26,.24,.2),ui=[{el:-18,sun:[.5,.6,.85],sunI:.12,zen:[.006,.01,.024],hor:[.018,.024,.042],haze:[.014,.018,.03],sunHaze:[.02,.022,.03],amb:.15},{el:-8,sun:[.5,.6,.85],sunI:.12,zen:[.006,.011,.028],hor:[.035,.035,.065],haze:[.024,.026,.045],sunHaze:[.06,.03,.03],amb:.16},{el:-2,sun:[.9,.35,.15],sunI:.06,zen:[.015,.035,.1],hor:[.42,.22,.2],haze:[.22,.16,.2],sunHaze:[.9,.35,.18],amb:.4},{el:4,sun:[1,.5,.22],sunI:.3,zen:[.035,.1,.3],hor:[.82,.48,.34],haze:[.5,.4,.4],sunHaze:[1,.55,.3],amb:.85},{el:14,sun:[1,.74,.46],sunI:.62,zen:[.03,.11,.34],hor:[.66,.58,.54],haze:[.54,.52,.54],sunHaze:[1,.75,.5],amb:1},{el:30,sun:[1,.94,.84],sunI:.938,zen:[.022,.12,.32],hor:[.17,.29,.4],haze:[.48,.54,.64],sunHaze:[1,.92,.8],amb:1},{el:90,sun:[1,.97,.93],sunI:1,zen:[.02,.12,.32],hor:[.16,.29,.4],haze:[.47,.54,.65],sunHaze:[.98,.93,.84],amb:1}];function f1(s){let t=ui[0],e=ui[ui.length-1];for(let o=0;o<ui.length-1;o++)if(s>=ui[o].el&&s<=ui[o+1].el){t=ui[o],e=ui[o+1];break}const n=Nt(t.el,e.el,jt(s,t.el,e.el)),i=(o,r)=>[de(o[0],r[0],n),de(o[1],r[1],n),de(o[2],r[2],n)];return{el:s,sun:i(t.sun,e.sun),sunI:de(t.sunI,e.sunI,n),zen:i(t.zen,e.zen),hor:i(t.hor,e.hor),haze:i(t.haze,e.haze),sunHaze:i(t.sunHaze,e.sunHaze),amb:de(t.amb,e.amb,n)}}const Bl={clear:{coverage:.24,hazeDensity:15e-6,hazeHeight:1400,windSpeed:5,turbulence:.25,cloudBase:1500,cloudTop:2400,rain:0,sunDim:1},scattered:{coverage:.34,hazeDensity:19e-6,hazeHeight:1300,windSpeed:7,turbulence:.4,cloudBase:1300,cloudTop:2500,rain:0,sunDim:.97},cloudy:{coverage:.66,hazeDensity:32e-6,hazeHeight:1100,windSpeed:10,turbulence:.7,cloudBase:900,cloudTop:1800,rain:0,sunDim:.72},storm:{coverage:.92,hazeDensity:55e-6,hazeHeight:900,windSpeed:15,turbulence:1,cloudBase:700,cloudTop:2600,rain:1,sunDim:.4}};function p1(s){const t=25.8*Math.PI/180,e=10*Math.PI/180,n=(s-12)*15*Math.PI/180,i=Math.sin(t)*Math.sin(e)+Math.cos(t)*Math.cos(e)*Math.cos(n),o=Math.asin(jt(i,-1,1)),r=(Math.sin(e)-Math.sin(o)*Math.sin(t))/(Math.cos(o)*Math.cos(t)||1e-6);let a=Math.acos(jt(r,-1,1));return n>0&&(a=2*Math.PI-a),{dir:new P(Math.cos(o)*Math.sin(a),Math.sin(o),-Math.cos(o)*Math.cos(a)).normalize(),elevation:o*180/Math.PI,azimuth:a*180/Math.PI}}class m1{hour=14.5;weather="clear";preset=Bl.clear;state={sunDir:new P(0,1,0),sunElevation:60,sunColor:new Ot,sunIntensity:3,zenith:new Ot,horizon:new Ot,haze:new Ot,sunHaze:new Ot,ground:new Ot,ambientIntensity:1,night:0};uniforms={uSunDir:{value:new P(0,1,0)},uSunColor:{value:new Ot(1,1,1)},uZenithColor:{value:new Ot},uHorizonColor:{value:new Ot},uHazeColor:{value:new Ot},uSunHazeColor:{value:new Ot},uGroundColor:{value:new Ot},uHazeDensity:{value:3e-5},uHazeHeight:{value:1300},uCloudCoverage:{value:.3},uCloudBase:{value:1500},uCloudTop:{value:2600},uCloudWind:{value:new Ft(0,0)},uCloudSeed:{value:0},uNight:{value:0},uTime:{value:0}};cloudOffset=new Ft;windDir=new Ft(1,.35).normalize();time=0;constructor(t){this.uniforms.uCloudSeed.value=t%1e3/1e3*37.7}setWeather(t){this.weather=t,this.preset=Bl[t]}update(t){this.time+=t;const e=this.preset;this.cloudOffset.addScaledVector(this.windDir,e.windSpeed*2.2*t);const{dir:n,elevation:i}=p1(this.hour),o=f1(i),r=this.state,a=new P(-n.x,Math.max(.25,-n.y*.8+.3),-n.z).normalize(),c=Nt(0,-4,i);r.sunDir.copy(n).lerp(a,c).normalize(),r.sunElevation=i,r.sunColor.setRGB(o.sun[0],o.sun[1],o.sun[2]);const l=o.sunI*e.sunDim;r.sunIntensity=l*de(h1,u1,c),r.zenith.setRGB(o.zen[0],o.zen[1],o.zen[2]),r.horizon.setRGB(o.hor[0],o.hor[1],o.hor[2]),r.haze.setRGB(o.haze[0],o.haze[1],o.haze[2]),r.sunHaze.setRGB(o.sunHaze[0],o.sunHaze[1],o.sunHaze[2]),r.ambientIntensity=o.amb,r.night=1-Nt(-12,-1,i);const h=Nt(.45,.95,e.coverage),d=r.horizon.r*.2126+r.horizon.g*.7152+r.horizon.b*.0722,u=new Ot(d,d,d).lerp(r.horizon,.3),f=r.zenith.clone().lerp(u,h*.8),p=r.horizon.clone().lerp(u,h*.7).multiplyScalar(de(1,.9,h)),x=r.haze.clone().lerp(new Ot(d,d,d),h*.6).multiplyScalar(de(1,.9,h)),g=r.zenith.clone().lerp(r.horizon,.3);r.ground.copy(r.sunColor).multiplyScalar(r.sunIntensity*Math.max(r.sunDir.y,0)/Math.PI).add(g).multiply(d1);const m=this.uniforms;m.uSunDir.value.copy(n),m.uSunColor.value.copy(r.sunColor).multiplyScalar(l),m.uZenithColor.value.copy(f),m.uHorizonColor.value.copy(p),m.uHazeColor.value.copy(x),m.uSunHazeColor.value.copy(r.sunHaze).multiplyScalar(de(1,.6,h)),m.uGroundColor.value.copy(r.ground),m.uHazeDensity.value=e.hazeDensity,m.uHazeHeight.value=e.hazeHeight,m.uCloudCoverage.value=e.coverage,m.uCloudBase.value=e.cloudBase,m.uCloudTop.value=e.cloudTop,m.uCloudWind.value.copy(this.cloudOffset),m.uNight.value=r.night,m.uTime.value=this.time}}function Hl(s){let t=2166136261;for(let e=0;e<s.length;e++)t^=s.charCodeAt(e),t=Math.imul(t,16777619)>>>0;return t>>>0}function Qr(s,t,e=0){let n=(s|0)*374761393+(t|0)*668265263+(e|0)*2147483647;return n=(n^n>>>13)*1274126177,n=n^n>>>16,(n>>>0)/4294967296}class We{a;b;c;d;constructor(t){const e=typeof t=="string"?Hl(t):t>>>0;this.a=e^2654435769,this.b=e*2246822507>>>0,this.c=e*3266489909>>>0,this.d=1;for(let n=0;n<12;n++)this.next()}next(){this.a>>>=0,this.b>>>=0,this.c>>>=0,this.d>>>=0;let t=this.a+this.b|0;return this.a=this.b^this.b>>>9,this.b=this.c+(this.c<<3)|0,this.c=this.c<<21|this.c>>>11,this.d=this.d+1|0,t=t+this.d|0,this.c=this.c+t|0,(t>>>0)/4294967296}range(t,e){return t+(e-t)*this.next()}int(t,e){return t+Math.floor(this.next()*(e-t+1))}pick(t){return t[Math.floor(this.next()*t.length)]}chance(t){return this.next()<t}gauss(){return(this.next()+this.next()+this.next()+this.next()-2)*1.7320508}fork(t){return new We(Hl(t)^Math.floor(this.next()*4294967295))}}const _s=2e4,oe=2048,Pi=_s/oe,Ge=_s/2;var ie=(s=>(s[s.OCEAN=0]="OCEAN",s[s.BAY=1]="BAY",s[s.BEACH=2]="BEACH",s[s.MANGROVE=3]="MANGROVE",s[s.PARK=4]="PARK",s[s.RES_LOW=5]="RES_LOW",s[s.RES_MID=6]="RES_MID",s[s.DOWNTOWN=7]="DOWNTOWN",s[s.HOTEL=8]="HOTEL",s[s.INDUSTRIAL=9]="INDUSTRIAL",s[s.AIRPORT=10]="AIRPORT",s[s.GOLF=11]="GOLF",s[s.ROCK=12]="ROCK",s[s.LOT=13]="LOT",s[s.CONSTRUCTION=14]="CONSTRUCTION",s[s.STADIUM=15]="STADIUM",s[s.MARINA=16]="MARINA",s[s.SANDBAR=17]="SANDBAR",s[s.ROAD=18]="ROAD",s[s.WETLAND_FLAT=19]="WETLAND_FLAT",s))(ie||{});const jh={cx:-1150,cz:-3050,hw:950,hh:300,rot:.04};function g1(s){let t=1/0,e=-1/0,n=1/0,i=-1/0;for(const[a,c]of s.pts)t=Math.min(t,a),e=Math.max(e,a),n=Math.min(n,c),i=Math.max(i,c);const o=(t+e)/2,r=(n+i)/2;return{...s,bx:o,bz:r,br:Math.max(e-t,i-n)/2+s.width+80}}function ss(s,t,e,n,i,o,r,a=0){const c=Math.cos(-r),l=Math.sin(-r),h=s-e,d=t-n,u=h*c-d*l,f=h*l+d*c,p=Math.abs(u)-i+a,x=Math.abs(f)-o+a,g=Math.max(p,0),m=Math.max(x,0);return Math.hypot(g,m)+Math.min(Math.max(p,x),0)-a}function ke(s,t,e,n,i,o,r,a,c=.18){const l=Math.cos(-r),h=Math.sin(-r),d=s-e,u=t-n,f=d*l-u*h,p=d*h+u*l,x=Math.atan2(p/o,f/i),g=De(Math.cos(x)*1.7+a*13.1,Math.sin(x)*1.7+a*7.3,4),m=Kt(Math.cos(x)*4.1+a,Math.sin(x)*4.1-a),w=1+c*g+c*.35*m;return(Math.hypot(f/(i*w),p/(o*w))-1)*Math.min(i,o)*w}function Li(s,t,e,n,i,o){const r=i-e,a=o-n,c=s-e,l=t-n,h=jt((c*r+l*a)/(r*r+a*a||1),0,1);return Math.hypot(c-r*h,l-a*h)}function Gl(s,t,e){let n=1/0;for(let i=0;i<e.length-1;i++)n=Math.min(n,Li(s,t,e[i][0],e[i][1],e[i+1][0],e[i+1][1]));return n}function Vl(s,t,e,n){let i=1/0;for(let o=0;o<e.length-1;o++){const[r,a]=e[o],[c,l]=e[o+1],h=c-r,d=l-a,u=s-r,f=t-a,p=jt((u*h+f*d)/(h*h+d*d||1),0,1),x=Math.hypot(u-h*p,f-d*p)-de(n[o],n[o+1],p);i=Math.min(i,x)}return i}const Gs={cx:195,cz:2520,rx:262,rz:380,rot:.05},Ve=[[55,2190],[-5,1790]],Zh=42;function Kh(s,t){return ke(s,t,200,2380,100,62,.5,15,.25)}function v1(s){let t=-2500+320*De(s/3400+3.1,.37,3)+110*De(s/800+9.2,1.1,3);return t+=520*Math.exp(-(((s+3800)/900)**2)),t+=220*Math.exp(-(((s+2500)/500)**2)),t-=250*Nt(1200,2400,s)*(1-Nt(3200,4200,s)),t}const di=[[-2100,-3050],[-2900,-2900],[-3700,-2650],[-4600,-2150],[-5500,-1500],[-6500,-700]],x1=[95,80,62,50,40,32];function _1(s){for(let t=0;t<di.length-1;t++){const[e,n]=di[t],[i,o]=di[t+1];if(s>=n&&s<=o)return de(e,i,(s-n)/(o-n))}return s<di[0][1]?di[0][0]:di[di.length-1][0]}function w1(s){return-9e3+320*De(s/2600+1.3,.8,3)}function Jh(){return[{id:"lake-north",cx:-5900,cz:-6600,rx:480,rz:330,rot:.3,seed:61},{id:"lake-west",cx:-7550,cz:550,rx:520,rz:300,rot:-.2,seed:62},{id:"lake-south",cx:-4300,cz:4300,rx:380,rz:260,rot:.5,seed:63}]}function y1(){const s=[],t=Jh();s.push({id:"mainland",bx:-6e3,bz:0,br:2e4,sd:(a,c)=>{let l=a-v1(c);const h=Vl(a,c,di,x1);l=Math.max(l,-h);for(const d of t)Math.abs(a-d.cx)>d.rx*1.6||Math.abs(c-d.cz)>d.rz*1.8||(l=Math.max(l,-ke(a,c,d.cx,d.cz,d.rx,d.rz,d.rot,d.seed,.22)));return l},beach:40,height:3.2,seabed:.02,shelf:3.2});const e=[[2750,-8200],[2700,-6800],[2640,-5400],[2600,-4e3],[2520,-2600],[2400,-1500],[2250,-900],[2050,-500]],n=[280,420,460,430,380,330,240,90];s.push({id:"barrier",bx:2500,bz:-4200,br:5200,sd:(a,c)=>{const l=Vl(a,c,e,n),h=60*De(a/700+1.2,c/700+4.4,3);return l+h},beach:62,height:2.6,seabed:.012,shelf:6}),s.push({id:"garza",bx:190,bz:2450,br:1e3,sd:(a,c)=>{let l=ke(a,c,Gs.cx,Gs.cz,Gs.rx,Gs.rz,Gs.rot,11,.14);return l=Gn(l,ke(a,c,260,2900,160,150,.1,12,.2),110),l=Gn(l,ke(a,c,-10,2740,115,120,.3,13,.25),100),l=Gn(l,ke(a,c,390,2500,100,150,0,17,.2),110),l=Gn(l,ke(a,c,375,2160,85,115,.2,14,.2),110),l=Gn(l,ke(a,c,130,2240,110,85,-.1,16,.2),100),l=Gn(l,Li(a,c,Ve[0][0],Ve[0][1],Ve[1][0],Ve[1][1])-Zh,60),l=Math.max(l,-Kh(a,c)*2.5+12),l},beach:70,height:2.4,seabed:.01,shelf:3.5,isle:!0}),s.push({id:"isla-b",bx:-1350,bz:2560,br:800,sd:(a,c)=>ke(a,c,-1350,2560,420,260,.05,21,.2),beach:50,height:2.3,seabed:.012,shelf:3.5,isle:!0}),s.push({id:"southkey",bx:1900,bz:5700,br:3200,sd:(a,c)=>{let l=ke(a,c,1900,5700,1500,1050,.25,31,.14);return l=Gn(l,ke(a,c,1e3,6400,700,500,-.3,32,.24),300),l=Gn(l,ke(a,c,2900,4900,500,700,.5,33,.18),260),l},beach:80,height:2.8,seabed:.014,shelf:6,rocky:!0,isle:!0}),s.push({id:"tortuga",bx:1180,bz:-830,br:900,sd:(a,c)=>Gn(ke(a,c,1180,-830,520,300,.35,51,.2),Li(a,c,985,-410,1150,-650)-56,60),beach:55,height:2.3,seabed:.012,shelf:3.5,isle:!0});const i=jh;s.push({id:"port",bx:i.cx,bz:i.cz,br:1300,sd:(a,c)=>ss(a,c,i.cx,i.cz,i.hw,i.hh,i.rot,30),beach:0,height:3,seabed:.06,shelf:6}),s.push({id:"isla-n1",bx:-450,bz:-3900,br:750,sd:(a,c)=>ke(a,c,-450,-3900,375,200,.1,41,.2),beach:45,height:2.3,seabed:.012,shelf:3.5,isle:!0}),s.push({id:"isla-n2",bx:700,bz:-4e3,br:800,sd:(a,c)=>ke(a,c,700,-4e3,400,210,-.15,42,.2),beach:45,height:2.3,seabed:.012,shelf:3.5,isle:!0}),s.push({id:"isla-n3",bx:1550,bz:-4100,br:650,sd:(a,c)=>ke(a,c,1550,-4100,315,170,.2,43,.22),beach:45,height:2.3,seabed:.012,shelf:3.5,isle:!0});for(let a=0;a<5;a++){const c=-3e3+a*330;s.push({id:`finger-${a}`,bx:1870-a*25,bz:c,br:520,sd:(l,h)=>ss(l,h,1870-a*25,c,300,95,.02,40),beach:25,height:2.4,seabed:.05,shelf:3.5})}const o=new We("mangrove-islets"),r=[[-1700,-1800,900,600,9],[-1500,1300,800,500,8],[-500,-6200,1800,900,12],[900,-6600,1200,700,8],[700,4300,700,450,6],[-1e3,4600,1100,600,7]];for(const[a,c,l,h,d]of r)for(let u=0;u<d;u++){const f=a+o.gauss()*l*.45,p=c+o.gauss()*h*.45,x=o.range(70,240),g=o.range(60,180),m=o.range(0,Math.PI),w=o.int(100,900);s.push({id:`mang-${a}-${u}`,bx:f,bz:p,br:Math.max(x,g)*1.6+60,sd:(y,v)=>ke(y,v,f,p,x,g,m,w,.35),beach:0,height:.55,seabed:.004,shelf:1.6,wet:!0})}return s}function M1(){const s=[],t=e=>s.push(e);return t({id:"downtown",zone:7,cx:-2650,cz:-3900,hw:750,hh:620,rot:.02,gridX:130,gridZ:110,density:.92,hMin:40,hMax:260}),t({id:"brickell",zone:6,cx:-2900,cz:-2350,hw:550,hh:420,rot:.02,gridX:120,gridZ:120,density:.85,hMin:25,hMax:120}),t({id:"midtown",zone:6,cx:-3500,cz:-5300,hw:900,hh:700,rot:0,gridX:120,gridZ:140,density:.8,hMin:12,hMax:60}),t({id:"construction-dt",zone:14,cx:-2250,cz:-4250,hw:70,hh:60,rot:.02,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"construction-dt2",zone:14,cx:-3150,cz:-3550,hw:65,hh:55,rot:.02,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"construction-hotel",zone:14,cx:2480,cz:-2450,hw:60,hh:60,rot:-.1,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"stadium-lot",zone:13,cx:-2900,cz:-2e3,hw:330,hh:260,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"bayfront-park",zone:4,cx:-2050,cz:-4300,hw:170,hh:380,rot:.02,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"industrial-river",zone:9,cx:-3300,cz:-3050,hw:700,hh:380,rot:-.1,gridX:170,gridZ:160,density:.6,hMin:6,hMax:16}),t({id:"industrial-port",zone:9,cx:-1150,cz:-3050,hw:950,hh:300,rot:.04,gridX:0,gridZ:0,density:.5,hMin:6,hMax:14}),t({id:"airport",zone:10,cx:-7800,cz:-1400,hw:1100,hh:900,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"airstrip",zone:10,cx:2500,cz:5750,hw:700,hh:130,rot:.55,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"inland-golf",zone:11,cx:-5200,cz:-3950,hw:480,hh:380,rot:.1,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"west-golf",zone:11,cx:-6300,cz:3600,hw:500,hh:400,rot:-.15,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"north-park",zone:4,cx:-4350,cz:-6650,hw:380,hh:300,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"south-park",zone:4,cx:-4950,cz:2150,hw:420,hh:280,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"garza-park",zone:4,cx:365,cz:2160,hw:120,hh:105,rot:.2,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"barrier-golf",zone:11,cx:2680,cz:-5300,hw:420,hh:520,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"southkey-golf",zone:11,cx:1300,cz:6300,hw:550,hh:420,rot:-.3,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"north-res",zone:5,cx:-5600,cz:-5400,hw:2100,hh:1800,rot:0,gridX:95,gridZ:140,density:.75,hMin:4,hMax:11}),t({id:"west-res",zone:5,cx:-5300,cz:-2700,hw:1500,hh:1150,rot:0,gridX:100,gridZ:130,density:.75,hMin:4,hMax:12}),t({id:"mid-res",zone:5,cx:-4900,cz:-900,hw:1400,hh:600,rot:0,gridX:105,gridZ:140,density:.55,hMin:4,hMax:10}),t({id:"south-res",zone:5,cx:-4200,cz:1300,hw:1700,hh:1500,rot:0,gridX:105,gridZ:135,density:.7,hMin:4,hMax:10}),t({id:"far-west-res",zone:5,cx:-7950,cz:-4200,hw:650,hh:3e3,rot:0,gridX:110,gridZ:150,density:.45,hMin:4,hMax:10}),t({id:"west-res-2",zone:5,cx:-7750,cz:900,hw:850,hh:2e3,rot:0,gridX:115,gridZ:150,density:.4,hMin:4,hMax:9}),t({id:"far-south-res",zone:5,cx:-6600,cz:4300,hw:2e3,hh:1400,rot:0,gridX:105,gridZ:140,density:.55,hMin:4,hMax:10}),t({id:"south-shore-res",zone:5,cx:-3900,cz:3900,hw:1400,hh:900,rot:0,gridX:105,gridZ:135,density:.6,hMin:4,hMax:10}),t({id:"far-south-res-2",zone:5,cx:-4800,cz:6500,hw:2e3,hh:1200,rot:0,gridX:110,gridZ:140,density:.5,hMin:4,hMax:9}),t({id:"far-south-res-4",zone:5,cx:-7700,cz:6700,hw:900,hh:1e3,rot:0,gridX:120,gridZ:150,density:.38,hMin:4,hMax:9}),t({id:"south-edge-res",zone:5,cx:-5500,cz:8800,hw:3100,hh:1100,rot:0,gridX:120,gridZ:150,density:.35,hMin:4,hMax:9}),t({id:"north-res-2",zone:5,cx:-4800,cz:-8e3,hw:2400,hh:800,rot:0,gridX:100,gridZ:140,density:.55,hMin:4,hMax:10}),t({id:"far-north-res",zone:5,cx:-7950,cz:-8e3,hw:650,hh:800,rot:0,gridX:120,gridZ:150,density:.4,hMin:4,hMax:9}),t({id:"north-edge-res",zone:5,cx:-5500,cz:-9400,hw:3100,hh:600,rot:0,gridX:120,gridZ:150,density:.35,hMin:4,hMax:9}),t({id:"south-bayfront",zone:6,cx:-3e3,cz:-900,hw:480,hh:650,rot:0,gridX:120,gridZ:130,density:.6,hMin:8,hMax:35}),t({id:"hotel-south",zone:8,cx:2330,cz:-1500,hw:330,hh:1250,rot:-.12,gridX:130,gridZ:110,density:.85,hMin:20,hMax:110}),t({id:"hotel-mid",zone:8,cx:2600,cz:-3800,hw:300,hh:1300,rot:-.03,gridX:130,gridZ:105,density:.85,hMin:25,hMax:130}),t({id:"barrier-res",zone:5,cx:2650,cz:-6900,hw:350,hh:1200,rot:0,gridX:90,gridZ:110,density:.7,hMin:4,hMax:12}),t({id:"finger-res",zone:5,cx:1820,cz:-2340,hw:330,hh:760,rot:.02,gridX:0,gridZ:0,density:.7,hMin:4,hMax:9}),t({id:"garza-res",zone:5,cx:40,cz:2770,hw:200,hh:170,rot:.1,gridX:0,gridZ:0,density:.55,hMin:4,hMax:9,track:[[-10,2600],[-60,2690],[-60,2780],[20,2800],[110,2830],[200,2800]]}),t({id:"tortuga-res",zone:5,cx:1180,cz:-830,hw:420,hh:230,rot:.35,gridX:0,gridZ:0,density:.55,hMin:4,hMax:10,track:[[1156,-656],[1031,-714],[886,-842],[891,-1e3],[1062,-1033],[1225,-952],[1340,-885]]}),t({id:"isla-b-res",zone:5,cx:-1350,cz:2560,hw:330,hh:190,rot:.05,gridX:0,gridZ:0,density:.5,hMin:4,hMax:9,track:[[-1500,2577],[-1480,2680],[-1320,2720],[-1180,2660],[-1140,2547]]}),t({id:"southkey-res",zone:5,cx:2200,cz:5300,hw:700,hh:500,rot:.25,gridX:130,gridZ:150,density:.6,hMin:4,hMax:10}),t({id:"isla-n-res",zone:5,cx:700,cz:-4e3,hw:300,hh:160,rot:-.15,gridX:0,gridZ:0,density:.5,hMin:4,hMax:9,track:[[700,-3990],[640,-4075],[760,-4125],[880,-4085],[1030,-4030]]}),t({id:"isla-n1-res",zone:5,cx:-450,cz:-3900,hw:270,hh:150,rot:.1,gridX:0,gridZ:0,density:.5,hMin:4,hMax:9,track:[[-450,-3880],[-520,-3975],[-400,-4030],[-270,-3985],[-150,-3900]]}),s}function S1(s){const t=new We("streets"),e=new Map;for(const n of s){if(n.gridX<=0||n.gridZ<=0)continue;const i=[];for(let r=-n.hw;r<=n.hw+1;r+=n.gridX*t.range(.9,1.15))i.push(Math.min(r,n.hw));const o=[];for(let r=-n.hh;r<=n.hh+1;r+=n.gridZ*t.range(.9,1.15))o.push(Math.min(r,n.hh));e.set(n.id,{xs:i,zs:o})}return e}function b1(s,t){const e=[],n=new We("canals"),i=s.find(c=>c.id==="south-res"),o=i&&t.get(i.id);if(i&&o){const c=[...o.xs.map(l=>i.cx+l),-3400];for(let l=3;l<o.zs.length-3;l+=2){const h=i.cz+(o.zs[l]+o.zs[l+1])/2,d=n.range(1100,1900),u=i.cx+i.hw;e.push({id:`canal-s-${l}`,a:[u+320,h],b:[u-d,h],width:24,depth:2.6,culverts:c,culvertHalf:9.5})}}const r=s.find(c=>c.id==="west-res"),a=r&&t.get(r.id);if(r&&a){const c=a.xs.map(l=>r.cx+l);for(let l=1;l<a.zs.length-1;l++){const h=r.cz+(a.zs[l]+a.zs[l+1])/2;if(h<-2650||h>-1650||l%2===0)continue;const d=_1(h),u=n.range(700,1200);d-u>r.cx-r.hw+120&&e.push({id:`canal-w-${l}`,a:[d+90,h],b:[d-u,h],width:20,depth:2.4,culverts:c,culvertHalf:8.5}),l%4===1&&d+500<r.cx+r.hw-150&&e.push({id:`canal-e-${l}`,a:[d-90,h],b:[Math.min(d+n.range(450,700),r.cx+r.hw-150),h],width:18,depth:2.4,culverts:c,culvertHalf:8.5})}}return e}function E1(){const s=[];return s.push({id:"south-hwy-mainland",cls:"highway",width:22,lanes:4,traffic:14,pts:[[-6900,2650],[-6e3,2650],[-4500,2700],[-3400,2700],[-2790,2690]]}),s.push({id:"garza-hwy",cls:"highway",width:22,lanes:4,traffic:14,pts:[[-1650,2590],[-1050,2540],[-990,2537]]}),s.push({id:"garza-hwy-2",cls:"highway",width:22,lanes:4,traffic:14,pts:[[-10,2600],[10,2450],[30,2300],[Ve[0][0],Ve[0][1]],[Ve[1][0],Ve[1][1]]]}),s.push({id:"garza-east",cls:"arterial",width:14,lanes:2,traffic:5,pts:[[30,2300],[150,2265],[280,2235],[355,2185],[385,2160],[400,2195],[370,2220],[335,2205],[355,2185]]}),s.push({id:"garza-marina-rd",cls:"street",width:9,lanes:2,traffic:2,pts:[[355,2185],[395,2125],[420,2075]]}),s.push({id:"tortuga-rd",cls:"highway",width:22,lanes:4,traffic:12,pts:[[980,-400],[1200,-720],[1415,-1015]]}),s.push({id:"dt-bayshore",cls:"arterial",width:16,lanes:4,traffic:10,pts:[[-3400,-5300],[-2900,-5150],[-2560,-4950],[-2420,-4700],[-2330,-4450],[-2260,-4200],[-2200,-3900],[-2100,-3700],[-2150,-3450],[-2200,-3300],[-2380,-3110]]}),s.push({id:"dt-bayshore-s",cls:"arterial",width:16,lanes:4,traffic:10,pts:[[-2470,-2870],[-2450,-2600],[-2550,-2200],[-2680,-1800],[-2760,-1500],[-3350,-1500]]}),s.push({id:"dt-avenue",cls:"arterial",width:16,lanes:4,traffic:9,pts:[[-3400,-9900],[-3400,-7300],[-3400,-6e3],[-3400,-4600],[-3350,-3500],[-3330,-2900]]}),s.push({id:"dt-avenue-s",cls:"arterial",width:16,lanes:4,traffic:9,pts:[[-3290,-2650],[-3350,-1500],[-3400,0],[-3400,1600],[-3400,2700]]}),s.push({id:"north-cw-approach",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-3400,-6e3],[-2900,-6350],[-2545,-6626]]}),s.push({id:"west-arterial",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-6800,-9900],[-6800,-7e3],[-6800,-4e3],[-6800,-300],[-6900,1500],[-6900,2650]]}),s.push({id:"north-arterial",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-9900,-5300],[-8500,-5300],[-6800,-5300],[-4400,-5300],[-3400,-5300]]}),s.push({id:"airport-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[-6800,-2050],[-7300,-2050],[-7800,-2050]]}),s.push({id:"mid-arterial",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-9900,-300],[-8500,-300],[-6800,-300],[-5500,-300],[-4400,-320],[-3400,-300]]}),s.push({id:"south-arterial",cls:"arterial",width:15,lanes:4,traffic:6,pts:[[-9900,1200],[-8500,1200],[-6900,1200],[-5e3,1250],[-3400,1300]]}),s.push({id:"barrier-spine",cls:"arterial",width:16,lanes:4,traffic:10,pts:[[2720,-8e3],[2680,-6600],[2620,-5200],[2600,-4e3],[2520,-2600],[2400,-1500],[2260,-800],[2050,-500]]}),s.push({id:"barrier-spine-loop",cls:"street",width:10,lanes:2,traffic:2,pts:[[2720,-8e3],[2775,-8060],[2760,-8135],[2695,-8145],[2660,-8080],[2720,-8e3]]}),s.push({id:"barrier-beach-rd",cls:"street",width:10,lanes:2,traffic:4,pts:[[2680,-6600],[2900,-6400],[2880,-5200],[2850,-4e3],[2790,-2700],[2650,-1500],[2400,-1500]]}),s.push({id:"southkey-rd",cls:"arterial",width:14,lanes:2,traffic:5,pts:[[1465,4695],[1600,5e3],[1900,5400],[2300,5700],[2700,6100],[2600,6350],[2200,6450],[1700,6250],[1500,5900],[1900,5400]]}),s.push({id:"southkey-rd-2",cls:"street",width:10,lanes:2,traffic:3,pts:[[1500,5900],[1250,6200]]}),s.push({id:"southkey-marina-rd",cls:"street",width:9,lanes:2,traffic:2,pts:[[1600,5e3],[1420,4880],[1260,4780]]}),s.push({id:"isla-n-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[-760,-3880],[-450,-3880],[-150,-3900]]}),s.push({id:"isla-n2-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[380,-3980],[700,-3990],[1030,-4030]]}),s.push({id:"isla-n3-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[1335,-4082],[1550,-4100],[1780,-4120]]}),s.push({id:"port-rd",cls:"arterial",width:14,lanes:2,traffic:5,pts:[[-2050,-3050],[-1600,-3050],[-1150,-3050],[-700,-3060],[-260,-3070]]}),s}function T1(){const s=[];return s.push({id:"garza-bridge",pts:[[Ve[1][0],Ve[1][1]],[330,1250],[700,300],[980,-400]],width:30,deck:8,archHeight:26,archT:.51,archLength:560,lanes:6,traffic:16}),s.push({id:"tortuga-bridge",pts:[[1415,-1015],[1800,-600],[2050,-500]],width:22,deck:7,archHeight:18,archT:.45,archLength:380,lanes:4,traffic:12}),s.push({id:"garza-west",pts:[[-990,2537],[-10,2600]],width:22,deck:6,archHeight:0,archT:.5,archLength:0,lanes:4,traffic:14}),s.push({id:"islab-west",pts:[[-2790,2690],[-2100,2650],[-1650,2590]],width:22,deck:7,archHeight:18,archT:.45,archLength:360,lanes:4,traffic:14}),s.push({id:"north-cw-1",pts:[[-2100,-3700],[-1500,-3780],[-760,-3880]],width:24,deck:8,archHeight:26,archT:.4,archLength:480,lanes:6,traffic:14}),s.push({id:"north-cw-2",pts:[[-150,-3900],[380,-3980]],width:24,deck:8,archHeight:0,archT:.5,archLength:0,lanes:6,traffic:14}),s.push({id:"north-cw-3",pts:[[1030,-4030],[1335,-4082]],width:24,deck:8,archHeight:0,archT:.5,archLength:0,lanes:6,traffic:14}),s.push({id:"north-cw-4",pts:[[1780,-4120],[2200,-4080],[2600,-4e3]],width:24,deck:8,archHeight:20,archT:.5,archLength:380,lanes:6,traffic:14}),s.push({id:"far-north-cw",pts:[[-2545,-6626],[-1e3,-6750],[500,-6800],[1800,-6850],[2650,-6900]],width:18,deck:7,archHeight:16,archT:.55,archLength:360,lanes:4,traffic:7}),s.push({id:"port-bridge",pts:[[-2200,-3300],[-2050,-3050]],width:14,deck:6,archHeight:0,archT:.5,archLength:0,lanes:2,traffic:5}),s.push({id:"bayshore-river",pts:[[-2380,-3110],[-2470,-2870]],width:16,deck:6,archHeight:0,archT:.5,archLength:0,lanes:4,traffic:10}),s.push({id:"avenue-river",pts:[[-3330,-2900],[-3290,-2650]],width:16,deck:6,archHeight:0,archT:.5,archLength:0,lanes:4,traffic:9}),s}function A1(){return[{id:"dt-marina",x:-2150,z:-4150,rot:Math.PI*.5,piers:7,pierLen:110},{id:"garza-marina",x:420,z:2035,rot:0,piers:5,pierLen:90},{id:"barrier-marina",x:2075,z:-1400,rot:-Math.PI*.5,piers:6,pierLen:100},{id:"south-marina",x:-2760,z:2950,rot:Math.PI*.5,piers:4,pierLen:80},{id:"southkey-marina",x:1238,z:4730,rot:.09,piers:4,pierLen:80},{id:"north-marina",x:-2535,z:-5600,rot:Math.PI*.5,piers:5,pierLen:90}]}function C1(){return[{id:"rwy-09",a:[-8800,-1350],b:[-6950,-1350],width:50},{id:"rwy-13",a:[-8500,-2150],b:[-7073,-896],width:42},{id:"strip-southkey",a:[1950,5450],b:[3100,6100],width:24}]}function R1(){return[{id:"ship-channel",pts:[[4200,2200],[3e3,1600],[2e3,600],[1e3,-1200],[200,-2600],[-450,-3350]],width:180,depth:14,boats:3,speed:5},{id:"intracoastal",pts:[[1800,-7600],[1900,-6200],[1950,-4500],[2e3,-3200],[1950,-1800],[1850,-800],[1700,200]],width:110,depth:6,boats:8,speed:9},{id:"garza-channel",pts:[[-1e3,3300],[200,3250],[1e3,3100],[1900,2400],[2600,1400],[3400,400]],width:90,depth:7,boats:9,speed:12},{id:"arch-channel",pts:[[-1200,1200],[-300,1e3],[500,750],[1400,300],[2400,-100]],width:100,depth:8,boats:6,speed:11},{id:"ref-boats",pts:[[-200,3550],[300,3250],[520,2950],[800,2600],[1200,2250]],width:40,depth:4,boats:3,speed:18},{id:"flats-route",pts:[[-2100,3400],[-1200,3500],[-300,3600],[700,3700],[1500,4100]],width:40,depth:3,boats:5,speed:10},{id:"bay-route",pts:[[-1900,-4300],[-1200,-2500],[-600,-600],[0,1200],[500,1900]],width:60,depth:4,boats:7,speed:9},{id:"north-route",pts:[[-1800,-5900],[-800,-5200],[200,-4600],[1200,-4600],[1900,-5200]],width:60,depth:4,boats:5,speed:8},{id:"ocean-route",pts:[[3800,-8e3],[3700,-5e3],[3600,-2e3],[3700,1e3],[3900,4e3],[4100,7e3]],width:300,depth:25,boats:4,speed:6}].map(g1)}function P1(){return[{id:"stadium",kind:"stadium",x:-2900,z:-2450,rot:.15,size:150},{id:"lighthouse",kind:"lighthouse",x:3250,z:5300,rot:0,size:30},{id:"terminal",kind:"terminal",x:-7800,z:-1900,rot:0,size:220},{id:"hangars",kind:"hangars",x:-7400,z:-2250,rot:0,size:120},{id:"cranes-port",kind:"cranes",x:-1150,z:-3330,rot:0,size:1600},{id:"cruise",kind:"cruise",x:-900,z:-2780,rot:0,size:300},{id:"tanks",kind:"tanks",x:-3600,z:-3100,rot:0,size:160},{id:"seaplane-base",kind:"seaplane",x:-2050,z:-4700,rot:Math.PI*.5,size:60},{id:"golf-club",kind:"clubhouse",x:1215,z:6250,rot:-.3,size:30}]}class L1{n=oe;height=new Float32Array(oe*oe);zone=new Uint8Array(oe*oe);veg=new Uint8Array(oe*oe);coast=new Float32Array(oe*oe);exposure=new Uint8Array(oe*oe);districts=M1();roads=E1();bridges=T1();marinas=A1();runways=C1();channels=R1();pois=P1();landmasses=y1();lakes=Jh();grids=S1(this.districts);canals=b1(this.districts,this.grids);toCell(t,e){return[(t+Ge)/_s*oe,(e+Ge)/_s*oe]}heightAt(t,e){const[n,i]=this.toCell(t,e),o=jt(Math.floor(n),0,oe-2),r=jt(Math.floor(i),0,oe-2),a=jt(n-o,0,1),c=jt(i-r,0,1),l=this.height,h=l[r*oe+o],d=l[r*oe+o+1],u=l[(r+1)*oe+o],f=l[(r+1)*oe+o+1];return de(de(h,d,a),de(u,f,a),c)}zoneAt(t,e){const[n,i]=this.toCell(t,e),o=jt(Math.round(n),0,oe-1),r=jt(Math.round(i),0,oe-1);return this.zone[r*oe+o]}coastAt(t,e){const[n,i]=this.toCell(t,e),o=jt(Math.round(n),0,oe-1),r=jt(Math.round(i),0,oe-1);return this.coast[r*oe+o]}vegAt(t,e){const[n,i]=this.toCell(t,e),o=jt(Math.round(n),0,oe-1),r=jt(Math.round(i),0,oe-1);return this.veg[r*oe+o]/255}exposureAt(t,e){const[n,i]=this.toCell(t,e),o=jt(Math.round(n),0,oe-1),r=jt(Math.round(i),0,oe-1);return this.exposure[r*oe+o]/255}isLand(t,e){return this.heightAt(t,e)>.05}districtAt(t,e){for(const n of this.districts)if(ss(t,e,n.cx,n.cz,n.hw,n.hh,n.rot)<0)return n;return null}regionalDepth(t,e){let n=3+2.6*(.5+.5*De(t/1100,e/1100,3))+1.2*De(t/350+4,e/350,2);n-=2.4*Nt(.12,.42,De(t/650+9,e/650+2,3)),n=Math.max(n,.7);const i=3050+320*De(e/4e3,.5,2)+110*De(e/800+3.1,2.2,3),o=t-i;o>0&&(n+=o*.006+5*Nt(200,1500,o)+15*Nt(1500,4500,o)+1.5*Hs(t/600+1,e/260,3)*Nt(0,900,o));const r=Nt(-400,1400,t+300*De(e/1200,3.3,2))*(1-Nt(.4,1.4,Math.hypot((t-2600)/2600,(e-1900)/2400)));n+=4.5*r;const a=Nt(7200,9400,e+400*De(t/3e3,1.7,2));n+=18*a;const c=Nt(8300,9800,-e+400*De(t/3e3,5.1,2));n+=10*c;const l=Hs(t/900+2,e/380+1,3);return n-=1.6*l*r,n}generate(t){const e=oe,n=this.landmasses,i=512,o=e/i,r=Pi*o,a=new Float32Array(i*i),c=new Int16Array(i*i),l=new Float32Array(i*i),h=new Float32Array(i*i),d=new Float32Array(i*i),u=new Float32Array(i*i),f=new Float32Array(i*i),p=new Float32Array(i*i);for(let z=0;z<i;z++){const A=-Ge+(z+.5)*r;for(let U=0;U<i;U++){const N=-Ge+(U+.5)*r;let D=1/0,O=-1;for(let B=0;B<n.length;B++){const G=n[B];if(Math.hypot(N-G.bx,A-G.bz)-G.br>D)continue;const nt=G.sd(N,A);nt<D&&(D=nt,O=B)}const k=z*i+U;if(a[k]=D,c[k]=O,u[k]=n[O].seabed,f[k]=n[O].shelf,l[k]=this.regionalDepth(N,A),h[k]=De(N/260,A/260,3),O===0&&D<0){const B=-D,G=2*De(N/1500+2,A/1500-1,3)+.9*De(N/420+7,A/420+3,3),K=2.2*Math.exp(-(((B-1500)/1e3)**2));d[k]=Nt(150,1100,B)*(1.6+G+K)}else d[k]=0}t&&!(z&31)&&t(z/i*.3)}{const N=[],D=[];for(let G=0;G<8;G++){const K=G/8*Math.PI*2+.2;N.push(Math.cos(K)),D.push(Math.sin(K))}const O=new Float32Array(8),k=(G,K)=>{const nt=Math.floor((G+Ge)/r),q=Math.floor((K+Ge)/r);return nt<0||q<0||nt>=i||q>=i?nt<0?-1e3:1e3:a[q*i+nt]},B=(G,K,nt)=>{const q=jt(Math.floor((G+Ge)/r),0,i-1),ut=jt(Math.floor((K+Ge)/r),0,i-1)*i+q;return Math.min(l[ut],.05+Math.max(nt,0)*u[ut]+(n[c[ut]].beach===0?f[ut]:0))};for(let G=0;G<i;G++){const K=-Ge+(G+.5)*r;for(let nt=0;nt<i;nt++){const q=G*i+nt,tt=a[q];if(tt<-450){p[q]=0;continue}const ut=-Ge+(nt+.5)*r;for(let dt=0;dt<8;dt++){let st=0,lt=tt>=0;for(let H=1;H<=40;H++){const Lt=ut+N[dt]*H*200,pt=K+D[dt]*H*200,Ct=k(Lt,pt);if(Ct<0){if(!lt){if(H*200>600)break;continue}break}lt=!0;const vt=Lt>Ge||pt>Ge||pt<-Ge?25:B(Lt,pt,Ct);st+=200*Nt(.5,12,vt)}O[dt]=st}let J=0,et=0,at=0;for(let dt=0;dt<8;dt++){const st=O[dt];st>J?(at=et,et=J,J=st):st>et?(at=et,et=st):st>at&&(at=st)}const gt=(J+et+at)/(3*40*200);p[q]=Nt(.04,.8,gt)}}t&&t(.35)}const x=(z,A,U,N,D)=>{const O=D*i+N;return de(de(z[O],z[O+1],A),de(z[O+i],z[O+i+1],A),U)};let g=0,m=0,w=0,y=0;const v=(z,A)=>{const U=jt(z/o-.5,0,i-1.001),N=jt(A/o-.5,0,i-1.001),D=Math.floor(U),O=Math.floor(N),k=U-D,B=N-O;g=k,m=B,w=D,y=O;const G=x(a,k,B,D,O),K=O*i+D,nt=K+1,q=K+i,tt=q+1;let ut=c[K],J=a[K];return a[nt]<J&&(J=a[nt],ut=c[nt]),a[q]<J&&(J=a[q],ut=c[q]),a[tt]<J&&(J=a[tt],ut=c[tt]),[G,ut]},T=this.channels,M=this.runways,E=this.districts,b=this.lakes,_=this.canals,S=_.map(z=>({minX:Math.min(z.a[0],z.b[0])-z.width,maxX:Math.max(z.a[0],z.b[0])+z.width,z:z.a[1]})),R=this.marinas,F=this.roads.filter(z=>z.cls==="highway"||z.cls==="arterial").map(z=>{let A=1/0,U=-1/0,N=1/0,D=-1/0;for(const[k,B]of z.pts)A=Math.min(A,k),U=Math.max(U,k),N=Math.min(N,B),D=Math.max(D,B);const O=z.width*.5+20;return{pts:z.pts,hw:z.width*.5,minX:A-O,maxX:U+O,minZ:N-O,maxZ:D+O}});for(let z=0;z<e;z++){const A=-Ge+(z+.5)*Pi,U=w1(A);for(let N=0;N<e;N++){const D=-Ge+(N+.5)*Pi,O=z*e+N;let[k,B]=v(N+.5,z+.5);const G=n[B],K=x(p,g,m,w,y);if(Math.abs(k)<90&&(G.beach>0||G.wet)){const et=9*Kt(D/60+3.3,A/60-1.7)+4*Kt(D/21+8.1,A/21+2.2);k+=et*(G.wet?1.8:1)}this.coast[O]=k,this.exposure[O]=Math.round(255*jt(K,0,1));const nt=x(h,g,m,w,y);let q=0;if(B===0&&k>-160)for(const et of b){if(Math.abs(D-et.cx)>et.rx*1.5+160||Math.abs(A-et.cz)>et.rz*1.6+160)continue;const at=ke(D,A,et.cx,et.cz,et.rx,et.rz,et.rot,et.seed,.22);q=Math.max(q,1-Nt(0,140,at))}let tt,ut,J=0;if(k<0){const et=-k;let at=null;for(const st of E)if(ss(D,A,st.cx,st.cz,st.hw,st.hh,st.rot)<0){at=st;break}const gt=at!==null&&(at.zone===7||at.zone===6||at.zone===9||at.zone===13||at.zone===14||at.zone===15||at.zone===16||at.zone===8&&K<.3);if(G.wet)tt=.15+G.height*Nt(0,60,et)+.15*Kt(D/30,A/30),ut=3,J=255;else if(G.beach===0)tt=G.height+.2*Kt(D/40,A/40),ut=9,J=10;else{const st=.75+.5*(.5+.5*Kt(D/240+1.7,A/240-4.1)),lt=gt?5:G.beach*(.45+1.4*K)*st*(q>0?1.6:1),H=Nt(0,lt,et);if(tt=.25+(G.height-.25)*H+.6*nt*H+.12*Kt(D/18,A/18),G.id==="barrier"||G.id==="southkey"){const Lt=Nt(30,70,et)*(1-Nt(90,160,et))*(.4+.6*K);tt+=2.2*Lt*(.6+.4*Hs(D/140,A/140,3))}if(ut=H<.45?2:5,J=H<.45?20:150,q>0&&ut===2&&(ut=4,J=120),et<60&&q===0){if(G.isle&&K<.24){const Lt=Kt(D/150+4.4,A/150-2.9);if(Lt>.12){const pt=18+22*(.5+.5*Lt);et<pt&&(ut=3,tt=Math.min(tt,.3+.5*Nt(0,pt,et))+.1*Kt(D/12,A/12),J=255)}}if(ut===2){const Lt=De(D/210+9,A/210-4,2);(G.rocky?D>2400&&Hs(D/90+5,A/90+5,3)>.62:Lt>.36&&K>.3)&&et<26&&(ut=12,tt=.3+1.1*Nt(0,22,et)+.9*Hs(D/14,A/14,2)*(1-Nt(20,26,et)),J=0)}}if(G.id==="garza"&&A<Ve[0][1]+60&&Li(D,A,Ve[0][0],Ve[0][1],Ve[1][0],Ve[1][1])<Zh+40){const Lt=Nt(Ve[0][1]+60,Ve[0][1]-40,A);Lt>.5&&(ut=2,J=15);const pt=de(.3,.8+.08*Kt(D/40,A/40),Nt(0,16,et));tt=de(tt,Math.max(tt,pt),Lt)}}if(B===0){const st=x(d,g,m,w,y)*(1-q);tt+=st+.25*Kt(D/95+2,A/95)*Nt(0,.5,st);const lt=Nt(U+160,U-160,D);if(lt>0){const H=Kt(D/70+1,A/70+5),Lt=H<-.32?-.25:.35+.4*(.5+.5*H)+.05*Kt(D/9,A/9);tt=de(tt,Lt,lt),lt>.5&&(ut=19);let pt=1/0;for(const Ct of F)D<Ct.minX||D>Ct.maxX||A<Ct.minZ||A>Ct.maxZ||(pt=Math.min(pt,Gl(D,A,Ct.pts)-Ct.hw));pt<16&&(tt=Math.max(tt,de(1.4+.1*Kt(D/30,A/30),tt,Nt(3,16,pt))),pt<6&&(J=Math.min(J,30)))}}let dt=!1;if(tt>1.4&&at!==null){const st=at;dt=!0,ut=st.zone,st.zone===7?(tt=Math.max(tt,3.6),J=30):st.zone===11?(tt+=2.5*De(D/180,A/180,3)+1.5,J=255):st.zone===4?J=120+Math.floor(100*Nt(-.1,.4,nt)):st.zone===10?(tt=de(tt,2.8+.05*Kt(D/50,A/50),Nt(0,-150,ss(D,A,st.cx,st.cz,st.hw,st.hh,st.rot))),J=35):st.zone===13||st.zone===14||st.zone===9?J=5:st.zone===8||st.zone===6?J=60:st.track?J=Math.floor((185+70*Nt(-.3,.4,nt))*(1-.6*Nt(.22,.5,Kt(D/95+5,A/95-2)))):J=70+Math.floor(115*Nt(-.25,.45,nt))}for(const st of M){const lt=Li(D,A,st.a[0],st.a[1],st.b[0],st.b[1]);lt<st.width*.5+60&&(tt=de(tt,2.9,Nt(st.width*.5+60,st.width*.5+10,lt)))}if(ut===5&&!dt){if(ut=4,J=Math.floor(150+105*Nt(-.35,.3,nt)),G.isle){const st=Kt(D/95+5,A/95-2);J=Math.floor(Math.min(255,J+45)*(1-.55*Nt(.22,.5,st))),st>.44&&tt>1.6&&(ut=2,J=15)}q>0&&(J=Math.min(J,160))}if(ut===19){const st=Nt(.5,.64,.5+.5*De(D/240+3,A/240+8,3));J=Math.floor(40+215*st),tt<0&&(J=0)}for(let st=0;st<_.length;st++){const lt=S[st];if(Math.abs(A-lt.z)>_[st].width||D<lt.minX||D>lt.maxX)continue;const H=_[st],Lt=Li(D,A,H.a[0],H.a[1],H.b[0],H.b[1]);if(Lt>=H.width*.5)continue;let pt=!1;for(const Ct of H.culverts)if(Math.abs(D-Ct)<H.culvertHalf){pt=!0;break}pt||(tt=-(.5+(H.depth-.5)*Nt(H.width*.5,H.width*.5-6,Lt)),ut=1,J=0)}}else{const et=x(l,g,m,w,y),at=x(u,g,m,w,y),gt=x(f,g,m,w,y);let dt;if(G.wet)dt=Math.min(et,.05+k*at);else if(G.beach===0)dt=Math.min(et,gt+k*at);else{const lt=.45+.95*K;if(dt=Math.min(et,.05+k*at*lt),K>.35&&k<320){const H=Math.max(0,Math.sin(k/42+2*Kt(D/160,A/160)));dt-=.35*H*H*Nt(.35,.7,K)*Nt(20,60,k)*(1-Nt(180,320,k)),dt=Math.max(dt,.12)}}if(Math.abs(D-190)<260&&Math.abs(A-2380)<220){const lt=Kh(D,A);lt<0&&(dt=Math.max(dt,.5+1.7*Nt(0,-45,lt)))}for(const lt of T){if(Math.abs(D-lt.bx)>lt.br||Math.abs(A-lt.bz)>lt.br)continue;const H=Gl(D,A,lt.pts)-lt.width*.5;H<60&&(dt=Math.max(dt,lt.depth*(1-Nt(-lt.width*.1,60,H))+dt*Nt(-lt.width*.1,60,H)))}for(const lt of R){if(Math.abs(D-lt.x)>420||Math.abs(A-lt.z)>420)continue;const H=Math.sin(lt.rot),Lt=-Math.cos(lt.rot),pt=lt.pierLen*.5+40,Ct=ss(D,A,lt.x+H*pt,lt.z+Lt*pt,lt.piers*14+40,pt+10,lt.rot);Ct<40&&(dt=Math.max(dt,2.6*(1-Nt(-5,40,Ct))))}const st=Math.max(1-Math.hypot((D+350)/520,(A-3250)/260),1-Math.hypot((D-2500)/700,(A-3300)/300),1-Math.hypot((D-1200)/600,(A-1500)/260));if(st>0){const lt=Nt(0,.5,st)*(.55+.45*De(D/130+7,A/130-3,3));dt=de(dt,-.15+.5*(1-lt),lt*.9)}for(let lt=0;lt<_.length;lt++){const H=S[lt];if(Math.abs(A-H.z)>_[lt].width||D<H.minX||D>H.maxX)continue;const Lt=_[lt],pt=Li(D,A,Lt.a[0],Lt.a[1],Lt.b[0],Lt.b[1]);pt<Lt.width*.5&&(dt=Math.max(dt,.5+(Lt.depth-.5)*Nt(Lt.width*.5,Lt.width*.5-6,pt)))}dt+=.08*Kt(D/45,A/45),tt=-dt,ut=tt>-.35?17:dt>9?0:1,tt>0&&(ut=17),J=0}this.height[O]=tt,this.zone[O]=ut,this.veg[O]=jt(J,0,255)}t&&!(z&63)&&t(.35+z/e*.65)}}}const Sn=`
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
`,ho=`
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
`,ur=`
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
`,dr=`
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
`,Qh=`
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
`;function D1(s=64){const t=s,e=new Uint8Array(t*t*t*4),n=(d,u,f,p)=>{let x=d*374761393+u*668265263+f*2147483647+p*1013904223|0;return x=Math.imul(x^x>>>13,1274126177),((x^x>>>16)>>>0)/4294967296},i=(d,u)=>(d%u+u)%u,o=(d,u,f,p,x)=>{const g=Math.floor(d),m=Math.floor(u),w=Math.floor(f),y=d-g,v=u-m,T=f-w,M=N=>N*N*N*(N*(N*6-15)+10),E=M(y),b=M(v),_=M(T),S=(N,D,O,k,B,G)=>{const nt=n(i(N,p),i(D,p),i(O,p),x)*6.2831853,q=n(i(N,p),i(D,p),i(O,p),x+7)*3.1415926,tt=Math.cos(nt)*Math.sin(q),ut=Math.sin(nt)*Math.sin(q),J=Math.cos(q);return tt*k+ut*B+J*G},R=(N,D,O)=>N+(D-N)*O,F=R(S(g,m,w,y,v,T),S(g+1,m,w,y-1,v,T),E),z=R(S(g,m+1,w,y,v-1,T),S(g+1,m+1,w,y-1,v-1,T),E),A=R(S(g,m,w+1,y,v,T-1),S(g+1,m,w+1,y-1,v,T-1),E),U=R(S(g,m+1,w+1,y,v-1,T-1),S(g+1,m+1,w+1,y-1,v-1,T-1),E);return R(R(F,z,b),R(A,U,b),_)},r=(d,u,f,p,x)=>{const g=Math.floor(d),m=Math.floor(u),w=Math.floor(f);let y=1e9;for(let v=-1;v<=1;v++)for(let T=-1;T<=1;T++)for(let M=-1;M<=1;M++){const E=g+M,b=m+T,_=w+v,S=E+n(i(E,p),i(b,p),i(_,p),x),R=b+n(i(E,p),i(b,p),i(_,p),x+3),F=_+n(i(E,p),i(b,p),i(_,p),x+5),z=(S-d)**2+(R-u)**2+(F-f)**2;z<y&&(y=z)}return 1-Math.min(1,Math.sqrt(y))},a=(d,u,f,p,x)=>p+(d-u)/(f-u)*(x-p),c=d=>Math.min(1,Math.max(0,d));let l=0;for(let d=0;d<t;d++)for(let u=0;u<t;u++)for(let f=0;f<t;f++){const p=f/t,x=u/t,g=d/t;let m=0,w=.5,y=0;for(let z=0;z<3;z++){const A=4<<z;m+=w*o(p*A,x*A,g*A,A,11+z),y+=w,w*=.5}m=m/y*.5+.5;const v=r(p*4,x*4,g*4,4,31),T=r(p*8,x*8,g*8,8,41),M=r(p*16,x*16,g*16,16,51),E=v*.625+T*.25+M*.125,b=a(m,0,1,E,1),_=r(p*4,x*4,g*4,4,61),S=r(p*8,x*8,g*8,8,71),R=_*.65+S*.35,F=(o(p*8,x*8,g*8,8,81)*.65+o(p*16,x*16,g*16,16,91)*.35)*.5+.5;e[l++]=Math.round(c(b)*255),e[l++]=Math.round(c(R)*255),e[l++]=Math.round(c(F)*255),e[l++]=Math.round(c(m)*255)}const h=new Lh(e,t,t,t);return h.format=Ke,h.type=xn,h.minFilter=xe,h.magFilter=xe,h.wrapS=h.wrapT=h.wrapR=ps,h.unpackAlignment=1,h.needsUpdate=!0,h}const Wl=1024,Xl=76e3,I1=42e3,z1=7e3,U1=`
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
`,N1=`
${ho}
${Sn}
${ur}
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
`,F1=`
precision highp sampler3D;
${ho}
${Sn}
${ur}
${dr}
${Qh}
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
`,ql=`
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,O1=`
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = vec4(p.xy, p.w * 0.999999, p.w);
}
`,k1=`
${ho}
${Sn}
${dr}
${U1}
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
`,B1=`
out vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`,H1=`
${ho}
${Sn}
${ur}
${dr}
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
`;class G1{constructor(t,e,n){this.atmos=t,this.noise=D1(64),this.scale=n.scale,this.covRT=new ln(Wl,Wl,{type:xn,format:Ke,depthBuffer:!1,generateMipmaps:!1,minFilter:xe,magFilter:xe,wrapS:yn,wrapT:yn}),this.covMat=new Ie({vertexShader:ql,fragmentShader:N1,uniforms:{...t.uniforms,uCovCenter:{value:this.covCenter},uCovExtent:{value:Xl}},depthTest:!1,depthWrite:!1}),this.cloudMat=new Ie({vertexShader:ql,fragmentShader:F1,uniforms:{...t.uniforms,uNoise3D:{value:this.noise},uCovTex:{value:this.covRT.texture},uCovCenter:{value:this.covCenter},uCovExtent:{value:Xl},uCamPos:{value:new P},uInvProj:{value:new $t},uInvView:{value:new $t},uCloudSteps:{value:n.cloudSteps},uMaxDist:{value:I1}},depthTest:!1,depthWrite:!1}),this.quad=new pe(new ti(2,2),this.cloudMat),this.quad.frustumCulled=!1,this.quadScene.add(this.quad),this.cloudRT=new ln(4,4,{type:Rn,depthBuffer:!1,minFilter:xe,magFilter:xe}),this.domeMat=new Ie({vertexShader:O1,fragmentShader:k1,uniforms:{...t.uniforms,uCloudTex:{value:this.cloudRT.texture},uCloudTexel:{value:new Ft(.25,.25)},uResolution:{value:new Ft(1,1)},uInvProj:{value:new $t},uInvView:{value:new $t}},side:Je,depthWrite:!1,depthTest:!0}),this.dome=new pe(new Kn(1,24,12),this.domeMat),this.dome.frustumCulled=!1,this.dome.renderOrder=-1e3,this.dome.isSky=!0,this.envMat=new Ie({vertexShader:B1,fragmentShader:H1,uniforms:{...t.uniforms},side:Je,depthWrite:!1});const i=new pe(new Kn(50,32,16),this.envMat);this.envScene.add(i),this.pmrem=new Ya(e),this.pmrem.compileEquirectangularShader()}dome;cloudMat;covMat;domeMat;quad;quadScene=new oo;quadCam=new co(-1,1,1,-1,0,1);cloudRT;covRT;covBaked=!1;covCenter=new Ft;scale;envScene=new oo;envMat;pmrem=null;envRT=null;envMap=null;noise;setCloudSteps(t){this.cloudMat.uniforms.uCloudSteps.value=t}updateEnvironment(){return this.envRT&&this.envRT.dispose(),this.envRT=this.pmrem.fromScene(this.envScene,0,.1,200),this.envMap=this.envRT.texture,this.envMap}updateCoverage(t,e){const n=this.atmos.uniforms.uCloudWind.value,i=e.position.x+n.x,o=e.position.z+n.y;if(this.covBaked&&Math.hypot(i-this.covCenter.x,o-this.covCenter.y)<z1)return;this.covCenter.set(i,o),this.covBaked=!0,this.quad.material=this.covMat;const r=t.getRenderTarget();t.setRenderTarget(this.covRT),t.render(this.quadScene,this.quadCam),t.setRenderTarget(r),this.quad.material=this.cloudMat}render(t,e,n,i){const o=Math.max(2,Math.round(n*this.scale)),r=Math.max(2,Math.round(i*this.scale));(this.cloudRT.width!==o||this.cloudRT.height!==r)&&this.cloudRT.setSize(o,r),this.updateCoverage(t,e);const a=this.cloudMat.uniforms;a.uCamPos.value.copy(e.position),a.uInvProj.value.copy(e.projectionMatrixInverse),a.uInvView.value.copy(e.matrixWorld);const c=this.domeMat.uniforms;c.uResolution.value.set(n,i),c.uCloudTexel.value.set(1/o,1/r),c.uInvProj.value.copy(e.projectionMatrixInverse),c.uInvView.value.copy(e.matrixWorld);const l=t.getRenderTarget();t.setRenderTarget(this.cloudRT),t.render(this.quadScene,this.quadCam),t.setRenderTarget(l),this.dome.position.copy(e.position),this.dome.scale.setScalar(e.far*.9)}}class V1{height;zone;constructor(t,e){if(e.capabilities.isWebGL2&&e.extensions.has("OES_texture_float_linear"))this.height=new Ii(t.height,oe,oe,io,vn);else{const o=new Uint16Array(t.height.length);for(let r=0;r<o.length;r++)o[r]=Nd.toHalfFloat(t.height[r]);this.height=new Ii(o,oe,oe,io,Rn)}this.height.minFilter=xe,this.height.magFilter=xe,this.height.wrapS=this.height.wrapT=yn,this.height.generateMipmaps=!1,this.height.needsUpdate=!0;const i=new Uint8Array(oe*oe*4);for(let o=0;o<oe*oe;o++){i[o*4]=t.zone[o],i[o*4+1]=t.veg[o];const r=t.coast[o];i[o*4+2]=Math.max(0,Math.min(255,Math.round(128+r*.5))),i[o*4+3]=t.exposure[o]}this.zone=new Ii(i,oe,oe,Ke,xn),this.zone.minFilter=rn,this.zone.magFilter=rn,this.zone.wrapS=this.zone.wrapT=yn,this.zone.generateMipmaps=!1,this.zone.needsUpdate=!0}}const W1=96,tu=8,eu=7;function X1(s,t){const e=tu*2**s,n=W1,i=n*e/2,o=n/4,r=3*n/4,a=[],c=[],l=[],h=new Int32Array((n+1)*(n+1)).fill(-1);let d=0;for(let f=0;f<=n;f++)for(let p=0;p<=n;p++){if(t&&p>o&&p<r&&f>o&&f<r)continue;h[f*(n+1)+p]=d++,a.push(-i+p*e,0,-i+f*e);let g=0,m=0;(p===0||p===n||f===0||f===n)&&s<eu-1&&((p===0||p===n)&&(f&1)===1?m=e:(f===0||f===n)&&(p&1)===1&&(g=e)),c.push(g,m)}for(let f=0;f<n;f++)for(let p=0;p<n;p++){const x=h[f*(n+1)+p],g=h[f*(n+1)+p+1],m=h[(f+1)*(n+1)+p],w=h[(f+1)*(n+1)+p+1];x<0||g<0||m<0||w<0||(p+f&1?l.push(x,w,g,x,m,w):l.push(x,m,g,g,m,w))}const u=new re;return u.setAttribute("position",new At(a,3)),u.setAttribute("aEdge",new At(c,2)),u.setIndex(l),u.computeBoundingSphere(),u.boundingSphere=new Ce(new P(0,0,0),i*1.5+200),u}const q1=`
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
`,Y1=`
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
`,$1=`
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
`,j1=`
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
`;class Z1{constructor(t){this.textures=t;const e=new he({color:16777215,roughness:.9,metalness:0}),n={uHeightTex:{value:t.height},uZoneTex:{value:t.zone},uRingOffset:this.offsetUniform,uWorldSize:{value:_s},uMapN:{value:oe}},i=e.onBeforeCompile;e.onBeforeCompile=(o,r)=>{i?.(o,r),Object.assign(o.uniforms,n),o.vertexShader=o.vertexShader.replace("#include <common>",`#include <common>
${q1}`).replace("#include <beginnormal_vertex>",`${Y1}
vec3 objectNormal = tnormal;
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif`).replace("#include <begin_vertex>","vec3 transformed = wp;"),o.fragmentShader=o.fragmentShader.replace("#include <common>",`#include <common>
${$1}`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
${j1}`)},e.customProgramCacheKey=()=>"terrain-v3",this.material=e;for(let o=0;o<eu;o++){const r=X1(o,o>0),a=new pe(r,e);a.frustumCulled=!1,a.receiveShadow=!0,a.castShadow=!1,a.matrixAutoUpdate=!1,this.rings.push(a),this.group.add(a)}}group=new Pe;material;rings=[];offsetUniform={value:new P};update(t,e){const n=tu*2,i=Math.round(t/n)*n,o=Math.round(e/n)*n;this.offsetUniform.value.set(i,0,o)}}const K1=0,J1=`
uniform vec3 uWaterOffset;
varying vec3 vWorldPos;
`,Q1=`
vec3 wp = position + uWaterOffset;
wp.y = 0.0;
vWorldPos = wp;
`,tv=`
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
`,ev=`
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
`,nv=`
#if defined( RE_IndirectDiffuse ) && defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
  iblIrradiance += getIBLIrradiance( geometryNormal );
#endif
`,iv=`
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
`;class sv{mesh;material;offset={value:new P};uniforms;constructor(t,e){const n=new he({color:16777215,roughness:.3,metalness:0});this.uniforms={uHeightTex:{value:t.height},uZoneTex:{value:t.zone},uWakeTex:{value:e},uWakeRegion:{value:new Ee(0,0,3e3,0)},uWaterOffset:this.offset,uWorldSize:{value:_s},uWaveTime:{value:0},uWindSpeed:{value:6},uWindDir:{value:new Ft(.94,.34)},uSunDirW:{value:new P(0,1,0)}};const i=this.uniforms,o=n.onBeforeCompile;n.onBeforeCompile=(c,l)=>{o?.(c,l),Object.assign(c.uniforms,i),c.vertexShader=c.vertexShader.replace("#include <common>",`#include <common>
${J1}`).replace("#include <begin_vertex>",`${Q1}
vec3 transformed = wp;`),c.fragmentShader=""+c.fragmentShader.replace("#include <common>",`#include <common>
${tv}`).replace("#include <normal_fragment_begin>",`#include <normal_fragment_begin>
${ev}`).replace("#include <lights_fragment_maps>",nv).replace("#include <opaque_fragment>",iv)},n.customProgramCacheKey=()=>`water-v2-${K1}`,this.material=n;const r=13e4,a=new ti(r,r,64,64);a.rotateX(-Math.PI/2),this.mesh=new pe(a,n),this.mesh.frustumCulled=!1,this.mesh.receiveShadow=!0,this.mesh.matrixAutoUpdate=!1,this.mesh.renderOrder=5}update(t,e,n,i,o,r,a,c){this.offset.value.set(Math.round(t/50)*50,0,Math.round(e/50)*50),this.uniforms.uWaveTime.value=n,this.uniforms.uWindSpeed.value=i,this.uniforms.uWindDir.value.copy(o),this.uniforms.uSunDirW.value.copy(r),this.uniforms.uWakeRegion.value.set(a.x,a.y,c,0)}}class ov{rt;scene=new oo;camera;center=new Ft;size;constructor(t=1024,e=3200){this.size=e,this.rt=new ln(t,t,{type:xn,depthBuffer:!1,minFilter:xe,magFilter:xe}),this.rt.texture.wrapS=this.rt.texture.wrapT=yn,this.camera=new co(-e/2,e/2,e/2,-e/2,1,400),this.camera.up.set(0,0,-1)}get texture(){return this.rt.texture}render(t,e,n){this.center.set(Math.round(e/8)*8,Math.round(n/8)*8),this.camera.position.set(this.center.x,200,this.center.y),this.camera.lookAt(this.center.x,0,this.center.y),this.camera.updateMatrixWorld();const i=t.getRenderTarget(),o=t.getClearColor(new Ot),r=t.getClearAlpha();t.setRenderTarget(this.rt),t.setClearColor(32896,0),t.clear(!0,!1,!1),t.render(this.scene,this.camera),t.setClearColor(o,r),t.setRenderTarget(i)}}const rv=new Ie({vertexShader:`
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
  `,uniforms:{uStrength:{value:1}},transparent:!0,depthTest:!1,depthWrite:!1,side:Be,blending:$n}),Za=new Ie({vertexShader:`
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
  `,uniforms:{uStrength:{value:.7}},transparent:!0,depthWrite:!1,side:Be}),av=new Ie({vertexShader:`
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
  `,uniforms:{uHull:{value:new Ft(.72,.28)},uStrength:{value:1}},transparent:!0,depthTest:!0,depthWrite:!1,side:Be});class ro{mesh;constructor(t,e,n=1){const i=t+2.6,o=e+2.2,r=av.clone();r.uniforms.uHull.value=new Ft(t/i,e/o),r.uniforms.uStrength.value=n,this.mesh=new pe(new ti(i,o),r),this.mesh.frustumCulled=!1,this.mesh.visible=!1,this.mesh.renderOrder=6}static flat=new Ae().setFromAxisAngle(new P(1,0,0),-Math.PI/2);spin=new Ae;static up=new P(0,1,0);update(t,e,n,i,o,r=1){this.mesh.visible=o,o&&(this.mesh.position.set(t,.07,e),this.spin.setFromAxisAngle(ro.up,Math.atan2(-i,n)),this.mesh.quaternion.copy(this.spin).multiply(ro.flat),this.mesh.material.uniforms.uStrength.value=r)}}class os{constructor(t,e,n,i=1,o=rv){this.width=e,this.lifetime=n,this.capacity=t,this.positions=new Float32Array(t*2*3),this.ages=new Float32Array(t*2),this.sides=new Float32Array(t*2);const r=[];for(let c=0;c<t-1;c++){const l=c*2,h=l+1,d=l+2,u=l+3;r.push(l,d,h,h,d,u)}this.geo=new re,this.geo.setAttribute("position",new ge(this.positions,3)),this.geo.setAttribute("aAge",new ge(this.ages,1)),this.geo.setAttribute("aSide",new ge(this.sides,1)),this.geo.setIndex(r),this.geo.setDrawRange(0,0);const a=o.clone();a.uniforms.uStrength.value=i,this.mesh=new pe(this.geo,a),this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1}mesh;capacity;positions;ages;sides;points=[];lastX=NaN;lastZ=NaN;geo;update(t,e,n,i,o){if(i&&(Number.isNaN(this.lastX)||Math.hypot(t-this.lastX,e-this.lastZ)>Math.max(2,o*.25))){const a=Number.isNaN(this.lastX)?1:t-this.lastX,c=Number.isNaN(this.lastZ)?0:e-this.lastZ,l=Math.hypot(a,c)||1;this.points.push({x:t,z:e,dx:a/l,dz:c/l,t:n}),this.points.length>this.capacity&&this.points.shift(),this.lastX=t,this.lastZ=e}for(;this.points.length&&n-this.points[0].t>this.lifetime;)this.points.shift();const r=this.points.length;for(let a=0;a<r;a++){const c=this.points[a],l=Math.min(1,(n-c.t)/this.lifetime),h=this.width*(.6+1.8*l),d=-c.dz*h,u=c.dx*h;this.positions[a*6]=c.x-d,this.positions[a*6+1]=.05,this.positions[a*6+2]=c.z-u,this.positions[a*6+3]=c.x+d,this.positions[a*6+4]=.05,this.positions[a*6+5]=c.z+u,this.ages[a*2]=l,this.ages[a*2+1]=l,this.sides[a*2]=-1,this.sides[a*2+1]=1}this.geo.attributes.position.needsUpdate=!0,this.geo.attributes.aAge.needsUpdate=!0,this.geo.attributes.aSide.needsUpdate=!0,this.geo.setDrawRange(0,Math.max(0,(r-1)*6))}reset(){this.points.length=0,this.lastX=NaN,this.lastZ=NaN,this.geo.setDrawRange(0,0)}}const qo=`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,cv=`
${ho}
${Sn}
${ur}
${dr}
${Qh}
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
`,lv=`
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
`,hv=`
uniform sampler2D tColor;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec3 s = texture2D(tColor, vUv).rgb * 0.227;
  s += (texture2D(tColor, vUv + uDir * 1.385).rgb + texture2D(tColor, vUv - uDir * 1.385).rgb) * 0.316;
  s += (texture2D(tColor, vUv + uDir * 3.231).rgb + texture2D(tColor, vUv - uDir * 3.231).rgb) * 0.070;
  gl_FragColor = vec4(s, 1.0);
}
`,uv=`
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
`;class dv{constructor(t,e,n){this.renderer=t,this.opts=n;const i=new pc(1,1,Qn);this.sceneRT=new ln(1,1,{type:Rn,samples:n.samples,depthTexture:i,depthBuffer:!0,minFilter:xe,magFilter:xe}),this.fogRT=new ln(1,1,{type:Rn,depthBuffer:!1,minFilter:xe,magFilter:xe});for(let o=0;o<3;o++)this.bloomRTs.push(new ln(1,1,{type:Rn,depthBuffer:!1,minFilter:xe,magFilter:xe})),this.bloomTmp.push(new ln(1,1,{type:Rn,depthBuffer:!1,minFilter:xe,magFilter:xe}));this.aerialMat=new Ie({vertexShader:qo,fragmentShader:cv,uniforms:{...e.uniforms,tColor:{value:null},tDepth:{value:null},uInvProj:{value:new $t},uInvView:{value:new $t},uCamPos:{value:new P},uLogDepthFC:{value:1},uCloudShadowStrength:{value:1}},depthTest:!1,depthWrite:!1}),this.brightMat=new Ie({vertexShader:qo,fragmentShader:lv,uniforms:{tColor:{value:null},uThreshold:{value:1.5}},depthTest:!1,depthWrite:!1}),this.blurMat=new Ie({vertexShader:qo,fragmentShader:hv,uniforms:{tColor:{value:null},uDir:{value:new Ft}},depthTest:!1,depthWrite:!1}),this.compositeMat=new Ie({vertexShader:qo,fragmentShader:uv,uniforms:{tColor:{value:null},tBloom0:{value:null},tBloom1:{value:null},tBloom2:{value:null},uBloom:{value:.2},uExposure:{value:.92},uSaturation:{value:1.16},uVignette:{value:.25},uLift:{value:new P(0,.002,.004)},uGain:{value:new P(1.03,1,.97)},uResolution:{value:new Ft(1,1)},uGrain:{value:.004},uTime:{value:0}},depthTest:!1,depthWrite:!1}),this.quad=new pe(new ti(2,2),this.aerialMat),this.quad.frustumCulled=!1,this.quadScene.add(this.quad)}sceneRT;fogRT;bloomRTs=[];bloomTmp=[];quad;quadScene=new oo;quadCam=new co(-1,1,1,-1,0,1);aerialMat;brightMat;blurMat;compositeMat;width=1;height=1;exposure=1;cloudShadowStrength=1;setSize(t,e){this.width=t,this.height=e,this.sceneRT.setSize(t,e),this.fogRT.setSize(t,e);for(let n=0;n<3;n++){const i=2**(n+1);this.bloomRTs[n].setSize(Math.max(1,Math.round(t/i)),Math.max(1,Math.round(e/i))),this.bloomTmp[n].setSize(Math.max(1,Math.round(t/i)),Math.max(1,Math.round(e/i)))}this.compositeMat.uniforms.uResolution.value.set(t,e)}get target(){return this.sceneRT}blit(t,e){this.quad.material=t,this.renderer.setRenderTarget(e),this.renderer.render(this.quadScene,this.quadCam)}finish(t,e){const n=this.renderer,i=this.aerialMat.uniforms;if(i.tColor.value=this.sceneRT.texture,i.tDepth.value=this.sceneRT.depthTexture,i.uInvProj.value.copy(t.projectionMatrixInverse),i.uInvView.value.copy(t.matrixWorld),i.uCamPos.value.copy(t.position),i.uLogDepthFC.value=2/(Math.log(t.far+1)/Math.LN2),i.uCloudShadowStrength.value=this.cloudShadowStrength,this.blit(this.aerialMat,this.fogRT),this.opts.bloom){this.brightMat.uniforms.tColor.value=this.fogRT.texture,this.blit(this.brightMat,this.bloomRTs[0]);for(let r=0;r<3;r++){const a=this.bloomRTs[r],c=this.bloomTmp[r],l=a.width,h=a.height;r>0&&(this.blurMat.uniforms.tColor.value=this.bloomRTs[r-1].texture,this.blurMat.uniforms.uDir.value.set(.5/l,.5/h),this.blit(this.blurMat,a)),this.blurMat.uniforms.tColor.value=a.texture,this.blurMat.uniforms.uDir.value.set(1/l,0),this.blit(this.blurMat,c),this.blurMat.uniforms.tColor.value=c.texture,this.blurMat.uniforms.uDir.value.set(0,1/h),this.blit(this.blurMat,a)}}const o=this.compositeMat.uniforms;o.tColor.value=this.fogRT.texture,o.tBloom0.value=this.bloomRTs[0].texture,o.tBloom1.value=this.bloomRTs[1].texture,o.tBloom2.value=this.bloomRTs[2].texture,o.uBloom.value=this.opts.bloom?.18:0,o.uExposure.value=this.exposure*(1+5*this.aerialMat.uniforms.uNight.value),o.uTime.value=e,this.blit(this.compositeMat,null),n.setRenderTarget(null)}}function Yl(s,t,e){const n=Math.hypot(e[0]-t[0],e[1]-t[1]),i=Math.max(2,Math.ceil(n/10));let o=-1,r=-1;for(let l=0;l<=i;l++){const h=l/i,d=t[0]+(e[0]-t[0])*h,u=t[1]+(e[1]-t[1])*h,f=s.heightAt(d,u)>=.8;f&&o<0&&(o=l),f&&(r=l)}if(o<0||r-o<3)return null;const a=o/i,c=r/i;return[[t[0]+(e[0]-t[0])*a,t[1]+(e[1]-t[1])*a],[t[0]+(e[0]-t[0])*c,t[1]+(e[1]-t[1])*c]]}function fv(s){const t=[],e=new Map,n=new Map;for(const r of s.roads)for(let a=0;a<r.pts.length-1;a++)t.push({a:r.pts[a],b:r.pts[a+1],width:r.width,cls:r.cls,lanes:r.lanes,traffic:r.traffic,lift:0});const i=new We("lots"),o=(r,a,c)=>s.districtAt(a,c)===r;for(const r of s.districts){const a=Math.cos(r.rot),c=Math.sin(r.rot),l=(y,v)=>[r.cx+y*a-v*c,r.cz+y*c+v*a],h=(y,v)=>{const T=y-r.cx,M=v-r.cz;return[T*a+M*c,-T*c+M*a]};if(r.track){const y=[],v=[];let T=1,M=0;for(let E=0;E<r.track.length-1;E++){const b=r.track[E],_=r.track[E+1],S=Yl(s,b,_);if(S){const D={a:S[0],b:S[1],width:7,cls:"lane",lanes:2,traffic:.6,lift:0};t.push(D),y.push(D)}const R=Math.hypot(_[0]-b[0],_[1]-b[1]),[F,z]=h(b[0],b[1]),[A,U]=h(_[0],_[1]),N=Math.abs(A-F)>=Math.abs(U-z);for(let D=M;D<R-12;D+=i.range(42,58)){const O=D/R,k=F+(A-F)*O,B=z+(U-z)*O;T=-T;const G=6,K=46,nt=20,q=N?{x0:k-nt,x1:k+nt,z0:Math.min(B+T*G,B+T*(G+K)),z1:Math.max(B+T*G,B+T*(G+K)),streetWidth:7}:{z0:B-nt,z1:B+nt,x0:Math.min(k+T*G,k+T*(G+K)),x1:Math.max(k+T*G,k+T*(G+K)),streetWidth:7},[tt,ut]=l((q.x0+q.x1)/2,(q.z0+q.z1)/2);s.heightAt(tt,ut)<1.2||!o(r,tt,ut)||(v.push(q),M=0)}}e.set(r.id,y),n.set(r.id,v);continue}const d=s.grids.get(r.id);if(!d)continue;const u=[],f=r.zone===ie.DOWNTOWN?14:r.zone===ie.RES_MID||r.zone===ie.HOTEL||r.zone===ie.INDUSTRIAL?12:9,p="street",{xs:x,zs:g}=d,m=(y,v)=>{const T=Yl(s,y,v);if(!T)return;const M=[(T[0][0]+T[1][0])/2,(T[0][1]+T[1][1])/2];if(!o(r,M[0],M[1]))return;const E={a:T[0],b:T[1],width:f,cls:p,lanes:2,traffic:r.zone===ie.DOWNTOWN?4:1.5,lift:0};t.push(E),u.push(E)};for(const y of x)for(let v=0;v<g.length-1;v++)m(l(y,g[v]),l(y,g[v+1]));for(const y of g)for(let v=0;v<x.length-1;v++)m(l(x[v],y),l(x[v+1],y));e.set(r.id,u);const w=[];for(let y=0;y<x.length-1;y++)for(let v=0;v<g.length-1;v++){const[T,M]=l((x[y]+x[y+1])/2,(g[v]+g[v+1])/2);o(r,T,M)&&w.push({x0:x[y],x1:x[y+1],z0:g[v],z1:g[v+1],streetWidth:f})}n.set(r.id,w)}for(const r of s.runways)t.push({a:r.a,b:r.b,width:r.width,cls:"runway",lanes:0,traffic:0,lift:0});return{segments:t,streetsByDistrict:e,blocksByDistrict:n}}const pv=`
varying vec2 vRoadUv;   // x across (-1..1), y along (metres)
varying vec3 vRoadInfo; // lanes, width, class
varying vec3 vWorldPosR;
${Sn}
`,mv=`
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
`;function gv(s,t,e){const n=[],i=[],o=[],r=[],a=[];let c=0;const l=f=>f==="highway"||f==="causeway"?3:f==="arterial"?2:f==="runway"?5:f==="taxiway"?6:f==="lane"?0:1,h=[];for(const f of t){if(Math.hypot(f.b[0]-f.a[0],f.b[1]-f.a[1])<1)continue;const p=h[h.length-1],x=p&&p[p.length-1];x&&x.cls===f.cls&&x.width===f.width&&x.lift===f.lift&&x.b[0]===f.a[0]&&x.b[1]===f.a[1]?p.push(f):h.push([f])}for(const f of h){const p=[f[0].a,...f.map(_=>_.b)],x=p.length,g=[];for(let _=0;_<x-1;_++){const S=p[_+1][0]-p[_][0],R=p[_+1][1]-p[_][1],F=Math.hypot(S,R);g.push([S/F,R/F])}const m=[];for(let _=0;_<x;_++){const S=g[Math.max(0,_-1)],R=g[Math.min(x-2,_)];let F=-(S[1]+R[1]),z=S[0]+R[0];const A=Math.hypot(F,z)||1;F/=A,z/=A;const U=Math.max(.5,F*-R[1]+z*R[0]);m.push([F/U,z/U])}const w=f[0].width,y=w*.5,v=l(f[0].cls),T=f[0].lanes,M=f[0].lift;let E=0,b=!0;for(let _=0;_<x-1;_++){const[S,R]=p[_],[F,z]=p[_+1],A=Math.hypot(F-S,z-R),U=Math.max(1,Math.ceil(A/15)),N=m[_],D=m[_+1];for(let O=b?0:1;O<=U;O++){const k=O/U,B=S+(F-S)*k,G=R+(z-R)*k,K=N[0]+(D[0]-N[0])*k,nt=N[1]+(D[1]-N[1])*k;for(const q of[-1,1]){const tt=B+K*y*q,ut=G+nt*y*q,J=s.heightAt(tt,ut)+.15+M;n.push(tt,J,ut),a.push(0,1,0),i.push(q,E+k*A),o.push(T,w,v)}c+=2,(!b||O>0)&&r.push(c-4,c-3,c-2,c-2,c-3,c-1),b=!1}E+=A}}const d=new re;d.setAttribute("position",new At(n,3)),d.setAttribute("normal",new At(a,3)),d.setAttribute("aRoadUv",new At(i,2)),d.setAttribute("aRoadInfo",new At(o,3)),d.setIndex(r),d.computeBoundingSphere();const u=new pe(d,e);return u.receiveShadow=!0,u.castShadow=!1,u.renderOrder=2,u.frustumCulled=!1,[u]}function vv(){const s=new he({color:16777215,roughness:.8,metalness:0,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2});return s.onBeforeCompile=t=>{t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aRoadUv; attribute vec3 aRoadInfo; varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vRoadUv = aRoadUv; vRoadInfo = aRoadInfo; vWorldPosR = (modelMatrix * vec4(position, 1.0)).xyz;`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
${pv}`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
${mv}`)},s.customProgramCacheKey=()=>"road-v3",s}function xv(s){let t=0;for(let e=0;e<s.length-1;e++)t+=Math.hypot(s[e+1][0]-s[e][0],s[e+1][1]-s[e][1]);return t}function _v(s,t){let e=0;for(let n=0;n<s.length-1;n++){const i=Math.hypot(s[n+1][0]-s[n][0],s[n+1][1]-s[n][1]);if(t<=e+i||n===s.length-2){const o=jt((t-e)/i,0,1),r=(s[n+1][0]-s[n][0])/i,a=(s[n+1][1]-s[n][1])/i;return{x:s[n][0]+r*i*o,z:s[n][1]+a*i*o,dx:r,dz:a}}e+=i}return{x:s[0][0],z:s[0][1],dx:1,dz:0}}function wv(s,t,e,n){const i=Math.min(160,n*.25),o=t.heightAt(s.pts[0][0],s.pts[0][1]),r=t.heightAt(s.pts[s.pts.length-1][0],s.pts[s.pts.length-1][1]),a=Nt(0,i,e),c=Nt(0,i,n-e);let l=de(Math.max(o,.5)+.3,s.deck,a);if(l=Math.min(l,de(Math.max(r,.5)+.3,s.deck,c)),s.archHeight>0){const h=s.archT*n,d=Math.abs(e-h)/(s.archLength*.5);if(d<1){const u=.5+.5*Math.cos(d*Math.PI);l+=(s.archHeight-s.deck)*u}}return l}const yv=`
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
`;function Mv(s){const t=new he({color:16777215,roughness:.82,metalness:0,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),e=s;return e.defines&&(t.defines={...e.defines}),t.onBeforeCompile=(n,i)=>{e.onBeforeCompile.call(e,n,i),n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aRoadUv; attribute vec3 aRoadInfo; varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vRoadUv = aRoadUv; vRoadInfo = aRoadInfo; vWorldPosR = (modelMatrix * vec4(position, 1.0)).xyz;`),n.fragmentShader=n.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;
${Sn}`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
${yv}`)},t.customProgramCacheKey=()=>"bridge-deck-v1",t}const Sv=2.4,bv=1.05;function $l(s,t,e){const n=new P,i=new P,o=new P,r=new P,a=new P;for(let c=0;c<t.length-1;c++){const[l,h]=t[c],[d,u]=t[c+1],f=d-l,p=u-h,x=Math.hypot(f,p)||1,g=p/x,m=-f/x,w=e.pos.length/3;for(let v=0;v<s.length;v++){const T=s[v];e.pos.push(T.x+T.rx*l,T.y+h,T.z+T.rz*l,T.x+T.rx*d,T.y+u,T.z+T.rz*d);const M=T.rx*g,E=m,b=T.rz*g;e.nrm.push(M,E,b,M,E,b)}let y=!1;s.length>1&&(n.fromArray(e.pos,w*3),i.fromArray(e.pos,(w+1)*3),o.fromArray(e.pos,(w+3)*3),r.subVectors(i,n).cross(o.clone().sub(n)),a.fromArray(e.nrm,w*3),y=r.dot(a)<0);for(let v=1;v<s.length;v++){const T=w+(v-1)*2,M=T+1,E=w+v*2,b=E+1;y?e.idx.push(T,b,M,T,E,b):e.idx.push(T,M,b,T,b,E)}}}function Ev(s,t,e,n){const i=new Pe,o=[],r=[],a=[],c=[],l=[],h=[],d=[];let u=0;const f={pos:[],nrm:[],idx:[]},p=[],x=[],g=[],m=[],w=[],y=new $t,v=new Ae,T=new P,M=new P,E=new be,b=new P(0,1,0),_=(D,O,k,B,G,K,nt,q,tt=0)=>{K<=.01||(M.set(O,k+K/2,B),v.setFromEuler(E.set(tt,q,0,"YXZ")),T.set(G,K,nt),D.push(y.compose(M,v,T).clone()))},S=(D,O,k,B,G,K)=>{K<=.01||(M.set(O,k+K/2,B),v.identity(),T.set(G,K,G),D.push(y.compose(M,v,T).clone()))},R=(D,O,k,B)=>{const G=k.clone().sub(O),K=G.length();K<.1||(G.divideScalar(K),M.copy(O).add(k).multiplyScalar(.5),v.setFromUnitVectors(b,G),T.set(B*2,K,B*2),D.push(y.compose(M,v,T).clone()))};for(const D of s.bridges){const O=xv(D.pts),k=D.width,B=k*.5,G=jt(D.lanes*3.3,8,k-4),K=G*.5,nt=Y=>{const V=_v(D.pts,Y);return{x:V.x,y:wv(D,s,Y,O),z:V.z,rx:-V.dz,rz:V.dx,dx:V.dx,dz:V.dz,s:Y}},q=Y=>Math.atan2(Y.dx,Y.dz),tt=D.archHeight>=20&&D.archLength>=350,ut=!tt&&D.archHeight>0&&D.archLength>=300,J=D.archT*O,et=tt?Math.min(D.archLength*.5,300):ut?D.archLength*.8:0,at=J-et/2,gt=J+et/2,dt=10,st=Math.ceil(O/dt),lt=[];for(let Y=0;Y<=st;Y++)lt.push(nt(Math.min(O,Y*dt)));const H=[];for(let Y=0;Y<=st;Y+=2)H.push(new P(lt[Y].x,lt[Y].y,lt[Y].z));(st&1)===1&&H.push(new P(lt[st].x,lt[st].y,lt[st].z));const Lt=D.lanes>=6?.3:0,pt=.15,Ct=[[-B,pt,0],[-K,pt,0],[-K,pt,1],[-K,.02,1],[-K,.02,0],[K,.02,0],[K,.02,-1],[K,pt,-1],[K,pt,0],[B,pt,0]],vt=Ct.length;lt.forEach((Y,V)=>{for(const[Q,mt,ct]of Ct)a.push(Y.x+Y.rx*Q,Y.y+mt,Y.z+Y.rz*Q),ct===0?d.push(0,1,0):d.push(Y.rx*ct,0,Y.rz*ct),c.push(Q/K,Y.s),l.push(D.lanes,G,Lt);if(V>0){const Q=u+(V-1)*vt,mt=u+V*vt;for(let ct=0;ct<vt;ct+=2)h.push(Q+ct,Q+ct+1,mt+ct,mt+ct,Q+ct+1,mt+ct+1)}}),u+=(st+1)*vt;const kt=Sv,wt=bv,I=[[-B,pt],[-B-.14,wt],[-B-.5,wt],[-B-.5,-.4],[-B-.22,-1.05],[-k*.31,-kt],[k*.31,-kt],[B+.22,-1.05],[B+.5,-.4],[B+.5,wt],[B+.14,wt],[B,pt]];if($l(lt,I,f),Lt>0){const Y=Lt;$l(lt,[[Y,.02],[Y,.3],[Y*.4,.9],[-Y*.4,.9],[-Y,.3],[-Y,.02]],f)}for(let Y=0;Y<lt.length;Y++){const V=lt[Y],Q=s.heightAt(V.x,V.z);if(Q<.3)continue;const mt=Q-.8,ct=V.y-kt+.15;ct-mt<.3||V.y-Q>16||_(p,V.x,mt,V.z,k+.8,ct-mt,dt+.4,q(V))}const C=k>=20?50:42,Z=[];for(let Y=C*.5;Y<O-C*.3;Y+=C)et>0&&Y>at-12&&Y<gt+12||Z.push(Y);ut&&Z.push(at,gt);for(const Y of Z){const V=nt(Y),Q=s.heightAt(V.x,V.z);if(V.y-Q<2.8)continue;const mt=q(V),ct=V.y-kt,_t=ut&&(Y===at||Y===gt),Gt=_t?2.2:1.6,ht=ct-Gt,yt=Math.min(Q,-.5)-2.5,Pt=Q<.2,zt=k+2.6;if(k>=20||_t){const Mt=_t?k*.7:k*.5,Qt=_t?3.2:2;_(p,V.x,yt,V.z,Mt,ht-yt,Qt,mt),_(p,V.x,ht,V.z,zt,Gt,Qt+.8,mt),Pt&&_(p,V.x,-1,V.z,Mt+2.4,1.6,Qt+2.4,mt)}else{for(const Mt of[-k*.3,k*.3])S(x,V.x+V.rx*Mt,yt,V.z+V.rz*Mt,2,ht-yt),Pt&&_(p,V.x+V.rx*Mt,-1,V.z+V.rz*Mt,3.6,1.6,3.6,mt);_(p,V.x,ht,V.z,zt,Gt,2.2,mt)}_(g,V.x,V.y+.03,V.z,G,.04,.3,mt)}for(let Y=1;Y<lt.length;Y++){const V=lt[Y-1],Q=lt[Y],mt=Math.hypot(Q.x-V.x,Q.y-V.y,Q.z-V.z),ct=Math.atan2(Q.x-V.x,Q.z-V.z),_t=-Math.asin(jt((Q.y-V.y)/mt,-1,1));for(const Gt of[-1,1]){const ht=(V.x+Q.x)/2+(V.rx+Q.rx)/2*(B+.32)*Gt,yt=(V.z+Q.z)/2+(V.rz+Q.rz)/2*(B+.32)*Gt;_(g,ht,(V.y+Q.y)/2+wt+.86,yt,.07,.07,mt+.1,ct,_t)}}for(let Y=2;Y<O;Y+=4){const V=nt(Y),Q=q(V);for(const mt of[-1,1])_(g,V.x+V.rx*(B+.32)*mt,V.y+wt,V.z+V.rz*(B+.32)*mt,.1,.86,.1,Q)}for(let Y=22,V=0;Y<O-20;Y+=45,V++){const Q=nt(Y),mt=V%2===0?-1:1;r.push(new P(Q.x+Q.rx*(B+.2)*mt,Q.y+.15,Q.z+Q.rz*(B+.2)*mt))}if(tt){const Y=.24*et+10,V=3.2,Q=4.8,mt=B+1.9,ct=et>=240?9:7,_t=(et/2-16)/ct;for(const Gt of[at,gt]){const ht=nt(Gt),yt=s.heightAt(ht.x,ht.z),Pt=q(ht),zt=Math.min(yt,-.5)-3;for(const Mt of[-1,1]){const Qt=ht.x+ht.rx*mt*Mt,qt=ht.z+ht.rz*mt*Mt;_(p,Qt,zt,qt,V,ht.y+Y-zt,Q,Pt),yt<.2&&_(p,Qt,-1.2,qt,V+3,1.9,Q+3,Pt)}_(p,ht.x,ht.y-kt-2.2,ht.z,2*mt+V,2.2,Q,Pt),_(p,ht.x,ht.y+Y-5,ht.z,2*mt+V,3.6,Q*.7,Pt);for(let Mt=1;Mt<=ct;Mt++)for(const Qt of[-1,1]){const qt=Gt+Qt*(Mt*_t+10);if(qt<4||qt>O-4)continue;const me=nt(qt),W=ht.y+Y-3-(ct-Mt)*(.45*Y/ct);for(const Tt of[-1,1]){const rt=new P(me.x+me.rx*(B+.36)*Tt,me.y+1.1,me.z+me.rz*(B+.36)*Tt),ft=new P(ht.x+ht.rx*(mt-V*.5+.1)*Tt,W,ht.z+ht.rz*(mt-V*.5+.1)*Tt);R(m,rt,ft,.11)}}}}else if(ut){const Y=D.archHeight*.95+4,V=B+1,Q=[[],[]],mt=28;for(let ct=0;ct<=mt;ct++){const _t=ct/mt,Gt=nt(at+et*_t),ht=Gt.y+Y*Math.sin(_t*Math.PI)+.8;for(const yt of[-1,1]){const Pt=new P(Gt.x+Gt.rx*V*yt,ht,Gt.z+Gt.rz*V*yt);Q[yt<0?0:1].push(Pt),ct%2===1&&ct>1&&ct<mt-1&&R(m,new P(Pt.x,Gt.y+wt+.2,Pt.z),Pt,.11)}(ct===8||ct===14||ct===20)&&_(g,Gt.x,ht-.7,Gt.z,2*V,1.2,1.2,q(Gt))}for(const ct of Q)w.push(new wc(new Yh(ct),56,1.15,8,!1))}o.push({id:D.id,pts:H,width:D.width,lanes:D.lanes,traffic:D.traffic})}const F=new re;F.setAttribute("position",new At(a,3)),F.setAttribute("normal",new At(d,3)),F.setAttribute("aRoadUv",new At(c,2)),F.setAttribute("aRoadInfo",new At(l,3)),F.setIndex(h),F.computeBoundingSphere();const z=new pe(F,Mv(e));z.receiveShadow=!0,z.renderOrder=3,i.add(z);const A=new re;A.setAttribute("position",new At(f.pos,3)),A.setAttribute("normal",new At(f.nrm,3)),A.setAttribute("uv",new ge(new Float32Array(f.pos.length/3*2),2)),A.setIndex(new ge(new Uint32Array(f.idx),1)),A.computeBoundingSphere();const U=new pe(A,e);U.castShadow=!0,U.receiveShadow=!0,i.add(U);const N=(D,O,k,B)=>{if(!k.length)return;const G=new Ui(D,O,k.length);k.forEach((K,nt)=>G.setMatrixAt(nt,K)),G.castShadow=B,G.receiveShadow=!0,i.add(G)};if(N(new Xt(1,1,1),e,p,!0),N(new ye(.5,.5,1,12),e,x,!0),N(new Xt(1,1,1),n,g,!1),N(new ye(.5,.5,1,6),n,m,!1),w.length){const D=new pe(Tv(w),n);D.castShadow=!0,D.receiveShadow=!0,i.add(D)}return{group:i,routes:o,deckGeometry:F,lampPositions:r}}function Tv(s){let t=0,e=0;const n=s.map(d=>{const u=d.getAttribute("position"),f=d.getIndex(),p=f?f.count:u.count;return t+=u.count,e+=p,{g:d,p:u,ind:f,nIdx:p}}),i=new Float32Array(t*3),o=new Float32Array(t*3),r=new Float32Array(t*2),a=t>65535?new Uint32Array(e):new Uint16Array(e);let c=0,l=0;for(const{g:d,p:u,ind:f,nIdx:p}of n){i.set(u.array,c*3);const x=d.getAttribute("normal");x&&o.set(x.array,c*3);const g=d.getAttribute("uv");if(g&&r.set(g.array,c*2),f)for(let m=0;m<p;m++)a[l+m]=f.getX(m)+c;else for(let m=0;m<p;m++)a[l+m]=m+c;c+=u.count,l+=p}const h=new re;h.setAttribute("position",new ge(i,3)),h.setAttribute("normal",new ge(o,3)),h.setAttribute("uv",new ge(r,2)),h.setIndex(new ge(a,1)),h.computeBoundingSphere();for(const d of s)d.dispose();return h}function Av(s){const t=new he({color:16777215,roughness:.7,metalness:0});return t.onBeforeCompile=e=>{e.uniforms.uNight=s,e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
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
}`)},t.customProgramCacheKey=()=>"facade-v2",t}const yc=0,er=1,Ka=2,nu=3,iu=4,In=s=>1<<s,jl={all:In(er)|In(Ka)|In(nu),mid:In(er)|In(Ka),near:In(er)};function uo(s,t){return t?s==="all"?In(yc):In(iu)|jl[s]:jl[s]}function Cv(s,t,e=!0){s.layers.mask=uo(t,e)}function Rv(s){s.layers.set(yc),s.layers.enable(iu)}function Pv(s,t){const e=s===0?er:s===t-1?nu:Ka;return In(yc)|In(e)}function Lv(s,t){const e=s.shadowMap,n=e.render.bind(e),i=[];e.render=(o,r,a)=>{if(!e.enabled||o.length===0||!e.autoUpdate&&!e.needsUpdate)return;const c=e.needsUpdate,l=a.layers.mask;let h=0;for(const d of o)t(d)>=0&&h++;for(const d of o){const u=t(d);a.layers.mask=u>=0?Pv(u,h):l,i[0]=d,e.needsUpdate=c,Ja=u,n(i,r,a)}Ja=-1,i.length=0,e.needsUpdate=!1,a.layers.mask=l}}let Ja=-1;function Dv(){return Ja}const Yo=new Ce,Zl=new $t,$o=new $t;class Iv{viewFrustum=new xs;shadowFrustum=new xs;shadowDir=new P(1,0,0);spread=1;tmp=new P;update(t,e,n){$o.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this.viewFrustum.setFromProjectionMatrix($o);const i=t.near,o=i*Math.tan(Di.DEG2RAD*.5*t.fov)/t.zoom,r=2*o,a=t.aspect*r;Zl.makePerspective(-a/2,a/2,o,o-r,i,Math.max(i+1,e),t.coordinateSystem),$o.multiplyMatrices(Zl,t.matrixWorldInverse),this.shadowFrustum.setFromProjectionMatrix($o);const c=Math.hypot(n.x,n.z);c>1e-5&&this.shadowDir.set(-n.x/c,0,-n.z/c),this.spread=Math.min(20,c/Math.max(n.y,.001))}boxInView(t){return this.viewFrustum.intersectsBox(t)}sphereInView(t,e){return Yo.set(t,e),this.viewFrustum.intersectsSphere(Yo)}casterInView(t,e,n){const i=Math.max(0,n)*this.spread;return this.tmp.copy(t).addScaledVector(this.shadowDir,i*.5),Yo.set(this.tmp,e+i*.5),this.shadowFrustum.intersectsSphere(Yo)}}function fo(s,t){const e=s.getAttribute("position"),n=new Float32Array(e.count);for(let i=0;i<e.count;i++)n[i]=t(e.getX(i),e.getY(i),e.getZ(i));return s.setAttribute("aPart",new ge(n,1)),s.getAttribute("uv")||s.setAttribute("uv",new ge(new Float32Array(e.count*2),2)),s}function zv(){const s=new Xt(1,1,1);return s.translate(0,.5,0),fo(s,()=>0)}function Kl(s,t){const e=new ye(.5,.5,1,s,1,!1,t);return e.translate(0,.5,0),fo(e,()=>0)}function Uv(s=.3){const t=new Xt(1,1,1),e=t.getAttribute("position");for(let n=0;n<e.count;n++)e.getY(n)>0&&(e.setX(n,e.getX(n)*s),e.setZ(n,e.getZ(n)*s));return t.translate(0,.5,0),t.computeVertexNormals(),fo(t,()=>0)}function Nv(){const s=new Xt(1,1,1),t=s.getAttribute("position");for(let e=0;e<t.count;e++)t.getY(e)>0&&(t.setX(e,t.getX(e)*.55+.22),t.setZ(e,t.getZ(e)*.8));return s.translate(0,.5,0),s.computeVertexNormals(),fo(s,()=>0)}function Fv(){const s=new Xt(1,1,1);s.translate(0,.5,0);const e=.5+.08,n=.66,i=[-e,n,-e],o=[e,n,-e],r=[e,n,e],a=[-e,n,e],c=[0,1,-e],l=[0,1,e],h=(p,x,g)=>[...p,...x,...g],d=new Float32Array([...h(i,c,l),...h(i,l,a),...h(o,r,l),...h(o,l,c),...h(i,o,c),...h(a,l,r)]),u=new re;u.setAttribute("position",new ge(d,3)),u.computeVertexNormals();const f=Ov([s,u]);return fo(f,(p,x,g)=>x>.99?Math.abs(p)<.01?3:1:x>.6&&x<.7&&Math.abs(p)>.55?2:0)}function Ov(s){const t=[],e=[];for(const i of s){const o=i.index?i.toNonIndexed():i,r=o.getAttribute("position"),a=o.getAttribute("normal");for(let c=0;c<r.count;c++)t.push(r.getX(c),r.getY(c),r.getZ(c)),e.push(a.getX(c),a.getY(c),a.getZ(c))}const n=new re;return n.setAttribute("position",new At(t,3)),n.setAttribute("normal",new At(e,3)),n.setAttribute("uv",new At(new Float32Array(t.length/3*2),2)),n}class kv{group=new Pe;lists=new Map;geos;material;count=0;tileSize=1500;tileOx=-3400;tileOz=-4520;tiles=[];shadowDistance=3200;constructor(t){this.material=Av(t),this.geos={box:zv(),cyl:Kl(16,0),oct:Kl(8,Math.PI/8),frustum:Uv(.3),shear:Nv(),house:Fv()}}add(t,e){const n=Math.floor((e.x-this.tileOx)/this.tileSize),i=Math.floor((e.z-this.tileOz)/this.tileSize),o=`${t}|${n}|${i}`;let r=this.lists.get(o);r||(r=[],this.lists.set(o,r)),r.push(e),this.count++}build(){const t=new $t,e=new Ae,n=new P,i=new P,o=new be;for(const[r,a]of this.lists){const c=r.split("|")[0],l=this.geos[c];l.boundingSphere===null&&l.computeBoundingSphere();const h=l.clone(),d=new Ui(h,this.material,a.length),u=new Float32Array(a.length*3),f=new Float32Array(a.length*4),p=new Float32Array(a.length*4),x=new He;a.forEach((w,y)=>{n.set(w.x,w.y,w.z),e.setFromEuler(o.set(0,w.rot,0)),i.set(w.w,w.h,w.d),d.setMatrixAt(y,t.compose(n,e,i)),d.setColorAt(y,w.color),u[y*3]=w.w,u[y*3+1]=w.h,u[y*3+2]=w.d,f[y*4]=w.style,f[y*4+1]=w.floorH,f[y*4+2]=w.seed,f[y*4+3]=w.roof,p[y*4]=w.lit,p[y*4+1]=w.warm,p[y*4+2]=w.variant,p[y*4+3]=w.form;const v=Math.hypot(w.w,w.d)*.6;x.expandByPoint(n.set(w.x-v,w.y,w.z-v)),x.expandByPoint(n.set(w.x+v,w.y+w.h,w.z+v))}),h.setAttribute("aDims",new mi(u,3)),h.setAttribute("aStyle",new mi(f,4)),h.setAttribute("aStyle2",new mi(p,4));const g=x.getBoundingSphere(new Ce);d.boundingSphere=g,d.castShadow=!0,d.receiveShadow=!0,d.instanceMatrix.needsUpdate=!0,d.instanceColor&&(d.instanceColor.needsUpdate=!0),this.group.add(d);const m=Math.hypot(x.max.x-x.min.x,x.max.z-x.min.z)/2;this.tiles.push({mesh:d,box:x,center:g.center,r:g.radius,height:x.max.y-x.min.y,lodR:m})}}updateLod(t,e,n){for(const i of this.tiles){const o=Math.max(0,Math.hypot(i.center.x-t,i.center.z-e)-i.lodR),r=n.boxInView(i.box),a=o<this.shadowDistance&&n.casterInView(i.center,i.r,i.height);i.mesh.castShadow=a,i.mesh.visible=r||a,i.mesh.layers.mask=uo("all",r)}}}const Wt={GLASS_BLUE:0,PUNCHED:1,BALCONY:2,DECO:3,INDUSTRIAL:4,HOUSE:5,CONCRETE:6,HOTEL:7,GLASS_GREEN:8,STONE:9,BRICK:10,GRID:11,POOL:12,HELIPAD:13},ls=["#f6f3ec","#f2efe6","#ffffff","#efe9dc","#f4f1ea","#e9e6df","#f8f6f1"],Qa=["#efe4cf","#f1e6cf","#e8dcc3","#f3ead6","#ecdfc4"],tc=["#f2c9a8","#f0bfa0","#efd1b3","#f4b8a0","#f7cdb6","#eeb497"],su=["#efc0c6","#f3cfd4","#e9b7c0","#f7d5dc","#e8a9b3"],ou=["#cfe6dc","#bfe0d2","#d8ece2","#b6dccf"],ru=["#f5e6b3","#f2dfa1","#f8ecc4","#efd68e"],au=["#cfe0ec","#dbe8f0","#c3d7e6","#b9d3e3"],Bv=["#3a3633","#4a4440","#2f2d2c","#5a504a","#40372f","#4d4a48"],Hv=["#b98f6a","#a87e5c","#c49a74","#9c6f52","#c8a680","#b07b5b","#8e5e46"],ec=["#b9b9b4","#a7a9a8","#c6c6c1","#9da3a6","#b5b8ba"],Gv=[...ls,...ls,...Qa,...tc,...su,...ou,...ru,...au,"#e6d2b8","#e8c9a0","#dfc7a6"],Yt={glassBlue:{style:Wt.GLASS_BLUE,floorH:3.9,tints:["#9fb6c8","#8fa9bd","#b0c4d2","#a7bccb","#8898a8","#c2d0da"],lit:[.25,.7],warm:[.15,.5]},glassGreen:{style:Wt.GLASS_GREEN,floorH:3.8,tints:["#f2f2ee","#e8ebe4","#ffffff","#dfe6e0","#e6e2d6","#d9dfd9"],lit:[.25,.65],warm:[.2,.5]},punched:{style:Wt.PUNCHED,floorH:3.3,tints:[...ls,...Qa],lit:[.2,.55],warm:[.6,.95]},balcony:{style:Wt.BALCONY,floorH:3.2,tints:[...Qa,...ls,"#efe0d3","#f0d9c2"],lit:[.2,.5],warm:[.7,.95]},deco:{style:Wt.DECO,floorH:3.4,tints:[...tc,...su,...ru,...ou],lit:[.15,.5],warm:[.6,.9]},stone:{style:Wt.STONE,floorH:3.8,tints:Bv,lit:[.3,.7],warm:[.3,.6]},brick:{style:Wt.BRICK,floorH:3.4,tints:Hv,lit:[.2,.5],warm:[.7,.95]},grid:{style:Wt.GRID,floorH:3.5,tints:["#f7f5f0","#f1eee6","#ffffff","#ece9e1"],lit:[.25,.6],warm:[.3,.7]},hotel:{style:Wt.HOTEL,floorH:3.2,tints:[...ls,...tc,...au],lit:[.3,.6],warm:[.6,.9]},concrete:{style:Wt.CONCRETE,floorH:3,tints:ec,lit:[0,0],warm:[.5,.5]},industrial:{tints:["#b8bcc0","#9aa3a8","#cfd3d6","#8e9aa0","#d8c9a8","#c4b89a","#a9b0b5"],lit:[.05,.2],warm:[.2,.4]},house:{tints:Gv,lit:[.2,.6],warm:[.8,1]}};function Vn(s,t){let e=0;for(const[,i]of t)e+=i;let n=s.next()*e;for(const[i,o]of t)if(n-=o,n<=0)return i;return t[t.length-1][0]}function Vv(s,t,e){const n=new kv(e),i=new We("city"),o=new Uint8Array(2e3*2e3),r=(v,T)=>{const M=Math.floor((v+1e4)/10),E=Math.floor((T+1e4)/10);return M<0||E<0||M>=2e3||E>=2e3?-1:E*2e3+M},a=(v,T,M)=>{const E=Math.ceil(M/10);for(let b=-E;b<=E;b++)for(let _=-E;_<=E;_++){const S=r(v+_*10,T+b*10);S>=0&&(o[S]=1)}},c=(v,T,M,E,b,_)=>{const S=M/2+_,R=E/2+_,F=Math.hypot(S,R)+8,z=Math.cos(b),A=Math.sin(b),U=Math.floor((v-F+1e4)/10),N=Math.floor((v+F+1e4)/10),D=Math.floor((T-F+1e4)/10),O=Math.floor((T+F+1e4)/10),k=(B,G)=>{const K=B*z+G*A,nt=-B*A+G*z;return Math.abs(K)<=S&&Math.abs(nt)<=R};for(let B=D;B<=O;B++)for(let G=U;G<=N;G++){if(G<0||B<0||G>=2e3||B>=2e3)continue;const K=G*10-1e4-v,nt=B*10-1e4-T;(k(K+5,nt+5)||k(K,nt)||k(K+10,nt)||k(K,nt+10)||k(K+10,nt+10))&&(o[B*2e3+G]=1)}},l=(v,T)=>{const M=r(v,T);return M>=0&&o[M]===1},h=[],d=(v,T,M,E,b)=>{const _=Math.cos(b),S=Math.sin(b),R=[];for(const[F,z]of[[-M/2,-E/2],[M/2,-E/2],[M/2,E/2],[-M/2,E/2],[0,0],[0,-E/2],[0,E/2],[-M/2,0],[M/2,0]])R.push([v+F*_-z*S,T+F*S+z*_]);return R},u=(v,T,M,E,b,_,S,R,F,z,A={})=>{let U=-1/0;for(const[O,k]of d(T,M,E,_,S))U=Math.max(U,s.heightAt(O,k));if(A.yBase!==void 0&&(U=A.yBase),U<.9)return null;const N=R instanceof Ot?R:new Ot(R);n.add(v,{x:T,y:U-.4,z:M,w:E,h:b+.4,d:_,rot:S,color:N,style:F,floorH:z,seed:i.range(0,1e3),roof:A.roof??5,lit:A.lit??.3,warm:A.warm??.7,variant:A.variant??.5,form:A.form??0});const D=A.margin??3;return D>=0&&c(T,M,E,_,S,D),U+b},f=(v,T,M,E,b)=>{for(const[_,S]of d(v,T,M,E,b))if(s.heightAt(_,S)<1.2)return!1;return!0},p=(v,T,M,E,b)=>{for(const[_,S]of d(v,T,M,E,b))if(l(_,S))return!1;return!0},x=(v,T)=>({tint:T.pick(v.tints),lit:T.range(v.lit[0],v.lit[1]),warm:T.range(v.warm[0],v.warm[1]),variant:T.next()}),g=(v,T,M,E,b,_,S,R,F)=>{const z=Math.cos(S),A=Math.sin(S),U=(k,B)=>[T+k*z-B*A,M+k*A+B*z],N=F.style===Wt.GLASS_BLUE||F.style===Wt.GLASS_GREEN||F.style===Wt.STONE,D=v.pick(ec);if(v.chance(.7)){const k=E*v.range(.25,.45),B=b*v.range(.3,.5),[G,K]=U(v.range(-E*.22,E*.22),v.range(-b*.2,b*.2));u("box",G,K,k,v.range(3,6),B,S,N?"#8d9296":D,Wt.CONCRETE,3,{yBase:_-.2,margin:-1})}const O=v.int(0,3);for(let k=0;k<O;k++){const[B,G]=U(v.range(-E*.35,E*.35),v.range(-b*.35,b*.35));u("box",B,G,v.range(2,4.5),v.range(1.5,3),v.range(2,4),S,D,Wt.CONCRETE,3,{yBase:_-.2,margin:-1})}if(R>40&&v.chance(.35)){const[k,B]=U(E*.25,-b*.25);u("cyl",k,B,3,3.5,3,S,"#c9c9c4",Wt.CONCRETE,3,{yBase:_-.2,margin:-1})}if(R>100&&v.chance(.22)){const k=Math.min(18,Math.min(E,b)*.5),[B,G]=U(-E*.18,b*.16);u("cyl",B,G,k,.5,k,S,"#444444",Wt.HELIPAD,3,{yBase:_,margin:-1})}if(R>120&&v.chance(.35)){const[k,B]=U(E*.3,b*.3);u("frustum",k,B,1.6,v.range(14,32),1.6,S,"#cfd8dc",Wt.CONCRETE,3,{yBase:_,margin:-1})}R>150&&v.chance(.3)&&u("frustum",T,M,4,v.range(25,50),4,S,"#e3e8ec",Wt.CONCRETE,3,{yBase:_,margin:-1})},m=(v,T,M,E,b,_,S,R,F,z=!0)=>{const A=x(R,v),U={lit:A.lit,warm:A.warm,variant:A.variant},N=Math.cos(E),D=Math.sin(E),O=(K,nt)=>[T+K*N-nt*D,M+K*D+nt*N];let k=null,B=b,G=_;switch(F){case 1:{const K=v.range(.72,.85),nt=v.range(.5,.65);u("box",T,M,b,S*v.range(.5,.62),_,E,A.tint,R.style,R.floorH,U),u("box",T,M,b*K,S*v.range(.78,.88),_*K,E,A.tint,R.style,R.floorH,U),k=u("box",T,M,b*nt,S,_*nt,E,A.tint,R.style,R.floorH,U),B=b*nt,G=_*nt;break}case 2:{B=Math.min(b,_)*.62,G=Math.max(b,_)*1.15,k=u("box",T,M,B,S,G,E,A.tint,R.style,R.floorH,U);break}case 3:{const K=O(-b*.2,0),nt=O(b*.15,-_*.22);u("box",K[0],K[1],b*.6,S,_,E,A.tint,R.style,R.floorH,U),k=u("box",nt[0],nt[1],b*.7,S*v.range(.6,1),_*.56,E,A.tint,R.style,R.floorH,U),B=b*.6,G=_;break}case 4:{const K=b*.18,nt=b*.41,q=O(-(nt+K)/2,0),tt=O((nt+K)/2,0);u("box",q[0],q[1],nt,S,_*.8,E,A.tint,R.style,R.floorH,U),k=u("box",tt[0],tt[1],nt,S*v.range(.85,1),_*.8,E,A.tint,R.style,R.floorH,U),u("box",T,M,K+2,4,_*.4,E,"#dfe4e8",Wt.CONCRETE,3,{yBase:(k??0)-S*.45,margin:-1}),B=nt,G=_*.8;break}case 5:{k=u("box",T,M,b,S*.88,_,E,A.tint,R.style,R.floorH,U);const K=x(Yt.glassBlue,v);k=u("box",T,M,b*.86,S,_*.86,E,K.tint,Wt.GLASS_BLUE,3.9,{lit:.7,warm:.3,variant:K.variant}),B=b*.86,G=_*.86;break}case 6:{const K=[[1,.55],[.86,.72],[.7,.88],[.5,1]];for(const[nt,q]of K)k=u("box",T,M,b*nt,S*q,_*nt,E,A.tint,R.style,R.floorH,U);k!==null&&u("frustum",T,M,3.5,S*.18,3.5,E,"#e8e4dc",Wt.CONCRETE,3,{yBase:k,margin:-1}),B=b*.5,G=_*.5;break}case 7:{const K=v.chance(.45)?"cyl":"oct";B=G=Math.min(b,_),k=u(K,T,M,B,S,G,E,A.tint,R.style,R.floorH,U);break}case 8:{k=u("box",T,M,b,S*.9,_,E,A.tint,R.style,R.floorH,U),k!==null&&(u("frustum",T,M,b,S*.1+6,_,E,A.tint,R.style,R.floorH,{...U,yBase:k-.1,margin:-1}),z=!1);break}default:k=u("box",T,M,b,S,_,E,A.tint,R.style,R.floorH,U)}if(k!==null&&z){const[K,nt]=F===3?O(-b*.2,0):F===4?O((b*.41+b*.18)/2,0):[T,M];g(v,K,nt,B,G,k,E,S,R)}return k},w=s.districts.find(v=>v.id==="downtown"),y=(v,T,M,E)=>{const b=Math.cos(w.rot),_=Math.sin(w.rot),S=w.cx+T*b-M*_,R=w.cz+T*_+M*b,F=s.heightAt(S,R);if(F<1)return;const z=E(S,R,F);h.push({x:S,z:R,h:z,name:v}),a(S,R,46)};y("Meridian Tower",120,-80,(v,T,M)=>{const E={lit:.6,warm:.3,variant:.2};return u("box",v,T,46,150,46,.1,"#9fb6c8",Wt.GLASS_BLUE,3.9,E),u("box",v,T,38,230,38,.1,"#9fb6c8",Wt.GLASS_BLUE,3.9,E),u("box",v,T,28,285,28,.1,"#b0c4d2",Wt.GLASS_BLUE,3.9,E),u("frustum",v,T,5,45,5,.1,"#e8eef2",Wt.CONCRETE,3,{yBase:M+285,margin:-1}),330}),y("Bahía One",-40,70,(v,T,M)=>{const E={lit:.65,warm:.25,variant:.8};return u("oct",v,T,46,262,46,.05,"#8898a8",Wt.GLASS_BLUE,3.9,E),u("box",v,T,16,8,14,.05,"#8d9296",Wt.CONCRETE,3,{yBase:M+262,margin:-1}),u("cyl",v+10,T+9,16,.5,16,0,"#444444",Wt.HELIPAD,3,{yBase:M+262,margin:-1}),u("frustum",v-8,T-6,1.8,30,1.8,0,"#cfd8dc",Wt.CONCRETE,3,{yBase:M+262,margin:-1}),292}),y("Faro Bahía",-180,40,(v,T,M)=>(u("cyl",v,T,40,240,40,0,"#e8ebe4",Wt.GLASS_GREEN,3.8,{lit:.55,warm:.4,variant:.6}),u("cyl",v,T,48,12,48,0,"#e8eef2",Wt.CONCRETE,3,{yBase:M+232,margin:-1}),u("cyl",v,T,20,4,20,0,"#dfe4e8",Wt.CONCRETE,3,{yBase:M+244,margin:-1}),248)),y("Twin Palms A",40,210,(v,T)=>(u("box",v,T,30,182,56,.05,"#efe4cf",Wt.BALCONY,3.3,{lit:.35,warm:.85,variant:.4}),182)),y("Twin Palms B",110,210,(v,T,M)=>(u("box",v,T,30,182,56,.05,"#efe4cf",Wt.BALCONY,3.3,{lit:.4,warm:.85,variant:.4}),u("box",v-35,T,44,6,12,.05,"#dfe4e8",Wt.CONCRETE,3.3,{yBase:M+118,margin:-1}),182)),y("The Sail",-60,-250,(v,T)=>(u("shear",v,T,60,205,44,.9,"#b0c4d2",Wt.GLASS_BLUE,3.9,{lit:.5,warm:.3,variant:.9}),205)),y("Terraces",260,120,(v,T)=>{for(let M=0;M<5;M++)u("box",v+M*6,T-M*4,60-M*8,45+M*28,40,0,"#f7f5f0",Wt.GRID,3.5,{lit:.4,warm:.5,variant:.3});return 160}),y("Crown Plaza",-300,-180,(v,T,M)=>{u("box",v,T,42,200,42,.2,"#3a3633",Wt.STONE,3.8,{lit:.6,warm:.4,variant:.5});for(let E=0;E<4;E++){const b=.2+E*Math.PI/2;u("box",v+Math.cos(b)*14,T+Math.sin(b)*14,3,30,14,b,"#e8eef2",Wt.CONCRETE,3,{yBase:M+198,margin:-1})}return 230}),y("Helix",330,-240,(v,T,M)=>{for(let E=0;E<12;E++)u("box",v,T,34,16.5,34,E*.1,"#e6e2d6",Wt.GLASS_GREEN,3.9,{yBase:M+E*16,lit:.5,warm:.3,variant:.2});return 198}),y("Aquamarine",-380,230,(v,T)=>{const M={lit:.55,warm:.2,variant:.6};return u("box",v,T,18,228,62,0,"#8fa9bd",Wt.GLASS_BLUE,3.9,M),u("box",v,T,62,228,18,0,"#8fa9bd",Wt.GLASS_BLUE,3.9,M),u("frustum",v,T,24,250,24,0,"#c2d0da",Wt.GLASS_BLUE,3.9,M),250});for(const v of s.districts){const T=t.get(v.id),M=Math.cos(v.rot),E=Math.sin(v.rot),b=(S,R)=>[v.cx+S*M-R*E,v.cz+S*E+R*M];if(!T)continue;const _=i.fork(v.id);for(const S of T){let R=function(){const at=1-Nt(.2,1,tt),gt=G>80&&K>70?2:1;for(let H=0;H<gt;H++){const Lt=_.range(22,Math.min(48,G*.55)),pt=_.range(22,Math.min(48,K*.6)),Ct=gt===1?(D+O)/2+_.range(-G*.1,G*.1):de(D+Lt/2+4,O-Lt/2-4,H),vt=(k+B)/2+_.range(-K*.15,K*.15),[kt,wt]=b(Ct,vt);if(!f(kt,wt,Lt,pt,v.rot)||!p(kt,wt,Lt+6,pt+6,v.rot))continue;const I=_.next();let C;I<.07+.22*at?C=_.range(120,205):I<.45+.2*at?C=_.range(70,120):C=_.range(36,72),C*=de(.6,1,at),C=Math.max(28,C);const Z=C>110?Vn(_,[[Yt.glassBlue,.34],[Yt.glassGreen,.16],[Yt.punched,.1],[Yt.balcony,.08],[Yt.deco,.08],[Yt.stone,.14],[Yt.grid,.1]]):C>60?Vn(_,[[Yt.glassBlue,.2],[Yt.glassGreen,.12],[Yt.punched,.16],[Yt.balcony,.14],[Yt.deco,.14],[Yt.stone,.1],[Yt.grid,.1],[Yt.brick,.04]]):Vn(_,[[Yt.glassBlue,.1],[Yt.glassGreen,.08],[Yt.punched,.2],[Yt.balcony,.12],[Yt.deco,.18],[Yt.stone,.06],[Yt.grid,.1],[Yt.brick,.16]]);if(C>55&&_.chance(.6)){const Q=Math.min(G*.92,Lt+_.range(14,36)),mt=Math.min(K*.92,pt+_.range(14,36)),ct=_.range(8,18);if(_.chance(.45))u("box",kt,wt,Q,ct,mt,v.rot,_.pick(ec),Wt.CONCRETE,3.4,{lit:.1,warm:.5});else{const _t=x(Z.style===Wt.STONE?Yt.punched:Z,_);u("box",kt,wt,Q,ct,mt,v.rot,_t.tint,Z.style===Wt.STONE?Wt.PUNCHED:Z.style,Z.floorH,{lit:_t.lit,warm:_t.warm,variant:_t.variant})}}let Y;const V=_.next();Z.style===Wt.DECO&&C>60?Y=V<.55?6:V<.8?1:0:C>110?Y=V<.28?1:V<.4?7:V<.52?5:V<.62?8:V<.72?4:V<.8?2:0:C>60?Y=V<.18?1:V<.3?7:V<.42?3:V<.5?2:V<.58?8:0:Y=V<.25?3:V<.35?2:0,m(_,kt,wt,v.rot,Lt,pt,C,Z,Y)}const dt=_.range(14,26),st=_.range(14,26),lt=[[D+dt/2,k+st/2],[O-dt/2,k+st/2],[O-dt/2,B-st/2],[D+dt/2,B-st/2]];for(const[H,Lt]of lt){if(_.next()>.6)continue;const[pt,Ct]=b(H,Lt);if(!f(pt,Ct,dt,st,v.rot)||!p(pt,Ct,dt+4,st+4,v.rot))continue;const vt=Vn(_,[[Yt.brick,.35],[Yt.punched,.3],[Yt.deco,.25],[Yt.concrete,.1]]),kt=x(vt,_);u("box",pt,Ct,dt,_.range(8,24),st,v.rot,kt.tint,vt.style,vt.floorH,{lit:kt.lit,warm:kt.warm,variant:kt.variant})}},F=function(){const at=Math.max(1,Math.round(G*K/1800));for(let gt=0,dt=0;gt<at*2&&dt<at;gt++){const st=_.range(16,Math.min(44,G*.75)),lt=_.range(16,Math.min(44,K*.75)),H=_.range(D+st/2,O-st/2),Lt=_.range(k+lt/2,B-lt/2),[pt,Ct]=b(H,Lt);if(!f(pt,Ct,st,lt,v.rot)||!p(pt,Ct,st+4,lt+4,v.rot))continue;dt++;let vt=de(v.hMin,v.hMax,Math.pow(_.next(),2))*de(.75,1.15,J);vt=jt(vt,v.hMin*.8,v.hMax);const kt=vt>50?Vn(_,[[Yt.balcony,.3],[Yt.punched,.2],[Yt.grid,.15],[Yt.deco,.1],[Yt.glassGreen,.15],[Yt.glassBlue,.1]]):Vn(_,[[Yt.brick,.28],[Yt.punched,.24],[Yt.deco,.16],[Yt.balcony,.16],[Yt.grid,.1],[Yt.concrete,.06]]),wt=_.next(),I=Math.max(G,K)>90&&Math.min(st,lt)>20,C=vt>45?wt<.25?1:wt<.35?7:wt<.5&&I?2:wt<.6?3:0:wt<.25?3:wt<.35&&I?2:0;m(_,pt,Ct,v.rot+_.range(-.03,.03),st,lt,vt,kt,C,vt>20)}},z=function(){const at=_.chance(.65),gt=at?_.range(18,30):_.range(24,40),dt=at?Math.min(K*.85,_.range(50,95)):_.range(24,40),[st,lt]=b((D+O)/2+_.range(-6,6),(k+B)/2);if(!f(st,lt,gt,dt,v.rot)||!p(st,lt,gt+4,dt+4,v.rot))return;const H=de(v.hMin,v.hMax,Math.pow(_.next(),1.5)),Lt=at?Vn(_,[[Yt.hotel,.55],[Yt.balcony,.25],[Yt.deco,.2]]):Vn(_,[[Yt.glassGreen,.3],[Yt.balcony,.25],[Yt.deco,.2],[Yt.glassBlue,.15],[Yt.punched,.1]]),pt=_.next(),Ct=at?0:pt<.3?7:pt<.5?1:pt<.6?8:0;m(_,st,lt,v.rot,gt,dt,H,Lt,Ct);const[vt,kt]=b((D+O)/2+gt*.5+12,(k+B)/2);if(f(vt,kt,18,dt*.7,v.rot)&&p(vt,kt,18,dt*.7,v.rot)){const wt=x(Yt.punched,_),I=u("box",vt,kt,18,_.range(4,9),dt*.7,v.rot,wt.tint,Wt.PUNCHED,3.2,{lit:wt.lit,warm:wt.warm});I!==null&&_.chance(.7)&&u("house",vt,kt,_.range(6,10),.4,Math.min(dt*.4,_.range(12,24)),v.rot,"#3fc4de",Wt.POOL,3,{yBase:I,form:2,margin:-1})}},A=function(){const at=_.range(16,24),gt=Math.min(30,K/2-2),dt=Vn(_,[[0,.3],[2,.14],[5,.16],[6,.14],[1,.12],[7,.1],[3,.04]]),st=K>=40?[[k+gt/2,0],[B-gt/2,Math.PI]]:[[(k+B)/2,0]];for(const[lt,H]of st){let Lt=D+at/2;for(;Lt<O-at/2;){const pt=_.range(8,14),Ct=_.range(9,17),vt=Math.max(at*_.range(.9,1.25),pt+6),kt=Lt;if(Lt+=vt,_.next()>(v.density+.15)*et)continue;const wt=H===0?1:-1,I=v.rot+H+_.range(-.12,.12),[C,Z]=b(kt+_.range(-1.5,1.5),lt-wt*_.range(-3,3));if(_.next()<.08*J){const yt=Math.min(22,vt-4),Pt=_.range(12,18);if(yt<12||!f(C,Z,yt,Pt,I)||l(C,Z))continue;const zt=_.chance(.5)?Yt.brick:Yt.punched,Mt=x(zt,_);u("house",C,Z,yt,_.range(7,11),Pt,I,Mt.tint,zt.style,3.1,{lit:Mt.lit,warm:Mt.warm,variant:Mt.variant,form:2,margin:1});continue}if(!f(C,Z,pt,Ct,I)||l(C,Z))continue;const Y=_.chance(.28)?2:1,V=_.next(),Q=V<.42?0:V<.78?1:2,mt=Q===2?Y*3.1+.6:Y*3.1/.68,ct=_.chance(.65)?dt:_.pick([0,1,2,3,4,5,6,7]),_t=x(Yt.house,_);u("house",C,Z,pt,mt,Ct,I,_t.tint,Wt.HOUSE,3,{roof:ct,form:Q,lit:_t.lit,warm:_t.warm,variant:_t.variant,margin:1});const Gt=Math.cos(I),ht=Math.sin(I);if(_.chance(.3)&&vt-pt>9){const yt=_.chance(.5)?1:-1,Pt=C+yt*(pt/2+3.2)*Gt,zt=Z+yt*(pt/2+3.2)*ht;f(Pt,zt,5.5,6,I)&&u("house",Pt,zt,5.5,2.9,6,I,_t.tint,Wt.HOUSE,3,{roof:ct,form:2,lit:0,margin:.5})}if(_.chance(.28)){const[yt,Pt]=b(kt,lt+wt*(Ct/2+6));f(yt,Pt,6,4,v.rot)&&u("house",yt,Pt,_.range(5,9),.4,_.range(3.5,5),v.rot,"#3fc4de",Wt.POOL,3,{form:2,margin:.5,yBase:s.heightAt(yt,Pt)})}}}},U=function(){const at=Math.max(1,Math.round(G*K/3600));for(let gt=0,dt=0;gt<at*3&&dt<at;gt++){const st=_.range(28,Math.min(80,G*.85)),lt=_.range(22,Math.min(60,K*.85)),H=_.range(D+st/2,O-st/2),Lt=_.range(k+lt/2,B-lt/2),[pt,Ct]=b(H,Lt);if(!f(pt,Ct,st,lt,v.rot)||!p(pt,Ct,st,lt,v.rot))continue;dt++;const vt=x(Yt.industrial,_),kt=_.range(8,15),wt=u("box",pt,Ct,st,kt,lt,v.rot,vt.tint,Wt.INDUSTRIAL,4,{lit:vt.lit,warm:vt.warm,variant:vt.variant});if(wt!==null){if(_.chance(.5)&&u("box",pt,Ct,st+.6,.5,lt+.6,v.rot,"#8f9599",Wt.CONCRETE,3,{yBase:wt-.05,margin:-1}),_.chance(.3)){const[I,C]=b(H-st/2+8,Lt+lt/2+8);f(I,C,14,10,v.rot)&&u("box",I,C,14,_.range(6,10),10,v.rot,_.pick(ls),Wt.PUNCHED,3.2,{lit:.3,warm:.6})}if(_.chance(.3)){const[I,C]=b(H+st/2+9,Lt-lt/2+8);f(I,C,12,12,v.rot)&&u("cyl",I,C,_.range(7,12),_.range(7,13),_.range(7,12),0,"#dcdcd4",Wt.CONCRETE,3)}}}};const N=S.streetWidth*.5+3,D=S.x0+N,O=S.x1-N,k=S.z0+N,B=S.z1-N,G=O-D,K=B-k;if(G<12||K<12)continue;const[nt,q]=b((D+O)/2,(k+B)/2),tt=Math.hypot(nt-v.cx,q-v.cz)/Math.max(v.hw,v.hh),ut=Math.hypot(nt-w.cx,q-w.cz),J=1-Nt(600,4e3,ut),et=1-.45*Nt(2500,8500,ut);if(!(_.next()>v.density*(v.zone===ie.RES_LOW?et:1)))switch(v.zone){case ie.DOWNTOWN:R();break;case ie.RES_MID:F();break;case ie.HOTEL:z();break;case ie.RES_LOW:A();break;case ie.INDUSTRIAL:U();break}}}return n.build(),{batches:n,landmarkPositions:h,occupied:l,markOccupied:a}}function Wv(s){const n=document.createElement("canvas");n.width=256,n.height=512;const i=n.getContext("2d");i.clearRect(0,0,256,512),i.fillStyle="#8a7458",i.fillRect(256/2,0,256/2,512);for(let a=0;a<512;a+=9)i.fillStyle=a%18===0?"#6e5a44":"#9a8466",i.fillRect(256/2,a,256/2,4);for(let a=0;a<140;a++)i.fillStyle=`rgba(40,30,20,${.1+s.next()*.2})`,i.fillRect(256/2+s.next()*256/2,s.next()*512,3+s.next()*6,2);i.save(),i.beginPath(),i.rect(0,0,256/2,512),i.clip(),i.strokeStyle="#6b7a3a",i.lineWidth=5,i.beginPath(),i.moveTo(256/4,512),i.lineTo(256/4,8),i.stroke();const o=256/2;for(let a=0;a<46;a++){const c=a/46,l=492-c*472,h=(o/2-4)*(.45+.55*Math.sin(Math.PI*Math.min(1,c*1.15))),d=60+Math.round(40*Math.sin(c*7+a));i.fillStyle=`rgb(${40+a%3*8}, ${110+d*.6}, ${40+a%5*5})`;for(const u of[-1,1])i.beginPath(),i.moveTo(o/2,l),i.quadraticCurveTo(o/2+u*h*.5,l-18,o/2+u*h,l-34+6*Math.sin(a)),i.quadraticCurveTo(o/2+u*h*.55,l-6,o/2,l+4),i.fill()}i.restore();const r=new lo(n);return r.colorSpace=on,r.anisotropy=4,r}const ao=6;function Xv(s){const e=128*ao,n=128,i=document.createElement("canvas");i.width=e,i.height=n;const o=i.getContext("2d"),r=o.createImageData(e,n),a=r.data,c=(p,x,g,m)=>{const w=(x*e+p)*4;m<=a[w+3]||(a[w]=a[w+1]=a[w+2]=Math.round(255*Math.min(1,Math.max(0,g))),a[w+3]=Math.round(255*Math.min(1,m)))},l=(p,x,g,m,w,y,v)=>{for(let T=0;T<128;T++)for(let M=0;M<128;M++){const E=(M+.5)/128,b=1-(T+.5)/128,_=E-x,S=b-g,R=Math.atan2(S,_),F=m*(1+.14*Kt(Math.cos(R)*2.1+v,Math.sin(R)*2.1+v*.7)+.06*Kt(E*30+v,b*30)),z=Math.hypot(_,S);if(z>F)continue;const A=z/F,U=.5+.5*(S/F),N=.5+.5*Kt(E*22+v*3,b*22-v),D=(y+(w-y)*U)*(.82+.36*N)*(1-.35*A*A);c(p*128+M,T,D,1)}},h=(p,x,g,m,w)=>{for(let y=0;y<128;y++)for(let v=0;v<128;v++){const T=(v+.5)/128,M=1-(y+.5)/128,E=T-x,b=M-g,_=Math.atan2(b,E),S=m*(1+.16*Kt(Math.cos(_)*2.3+w,Math.sin(_)*2.3-w)),R=Math.hypot(E,b);if(R>S)continue;const F=R/S,z=.5+.5*Kt(T*26+w,M*26+w*2),U=(.62+.5*(.5+.5*Kt(T*9-w,M*9+w)))*(.8+.4*z)*(1-.45*F*F);c(p*128+v,y,U,1)}},d=(p,x,g,m,w,y)=>{for(let v=0;v<128;v++)for(let T=0;T<128;T++){const M=(T+.5)/128,E=1-(v+.5)/128;E<g||E>m||Math.abs(M-x)>w*(1-.4*(E-g)/(m-g))||c(p*128+T,v,y*(.85+.3*Kt(M*40,E*40)),1)}},u=(p,x,g,m,w,y,v)=>{for(let T=0;T<w;T++){const M=T/w*Math.PI*2+.4*Kt(T*1.7+v,v);for(let E=0;E<=1;E+=.01){const b=m*(.75+.25*Kt(T*3.1,v+T)),_=x+Math.cos(M)*b*E,S=g+Math.sin(M)*b*E*(1-y)-y*m*E*E,R=.045*m*(1-.5*E)/.25;for(let F=-1;F<=1;F+=.25){const z=_-Math.sin(M)*R*F,A=S+Math.cos(M)*R*F,U=Math.floor(z*128),N=Math.floor((1-A)*128);U<0||N<0||U>=128||N>=128||c(p*128+U,N,.75+.35*E-.2*Math.abs(F),1)}}}};d(0,.5,0,.3,.035,.42),l(0,.5,.5,.385,1.15,.45,3+s.next()),l(0,.36,.42,.2,.95,.4,7+s.next()),l(0,.63,.44,.19,1,.42,11+s.next()),d(1,.5,0,.34,.03,.4),l(1,.47,.52,.34,1.1,.42,21+s.next()),l(1,.66,.6,.22,1.2,.5,25+s.next()),l(1,.3,.4,.17,.9,.38,29+s.next()),l(1,.56,.3,.16,.85,.35,33+s.next()),d(2,.5,0,.5,.022,.55),u(2,.5,.52,.24,9,.35,2+s.next()),h(3,.5,.5,.4,5+s.next()),h(4,.5,.5,.38,15+s.next()),h(4,.68,.6,.2,17+s.next()),u(5,.5,.5,.26,9,0,6+s.next());for(let p=0;p<128;p++)for(let x=0;x<128;x++){const g=(p*e+640+x)*4;a[g+3]===0&&Math.hypot((x+.5)/128-.5,(p+.5)/128-.5)<.05&&(a[g]=a[g+1]=a[g+2]=140,a[g+3]=255)}o.putImageData(r,0,0);const f=new lo(i);return f.colorSpace=zn,f.minFilter=fi,f.magFilter=xe,f.anisotropy=4,f.generateMipmaps=!0,f}function qv(s,t){const n=new _c(1,0).getAttribute("position"),i=[],o=[],r=[];for(let a=0;a<n.count;a++){const c=n.getX(a),l=n.getY(a),h=n.getZ(a),d=1+.3*Kt(c*2.1+s,l*2.1+h*1.7-s);i.push(c*d,l*d*(l<0?.65:1),h*d),o.push(c,l,h),r.push(t)}return{pos:i,nrm:o,part:r}}function Yv(){const s=[],t=[],e=[],n=[];for(let a=0;a<3;a++){const c=a/3*Math.PI*2,l=(a+1)/3*Math.PI*2,h=Math.cos(c)*.045,d=Math.sin(c)*.045,u=Math.cos(l)*.045,f=Math.sin(l)*.045,p=Math.cos((c+l)/2),x=Math.sin((c+l)/2),g=[[h,0,d],[u,0,f],[u,1,f],[h,0,d],[u,1,f],[h,1,d]];for(const[m,w,y]of g)s.push(m,w,y),t.push(p,0,x),e.push(0),n.push(0,w)}for(const[a,c]of[[3.1,1],[8.7,2],[14.3,3]]){const l=qv(a,c);s.push(...l.pos),t.push(...l.nrm),e.push(...l.part);for(let h=0;h<l.part.length;h++)n.push(0,0)}const r=new re;return r.setAttribute("position",new At(s,3)),r.setAttribute("normal",new At(t,3)),r.setAttribute("uv",new At(n,2)),r.setAttribute("aPart",new At(e,1)),r.boundingSphere=new Ce(new P(0,1.2,0),2.6),r}function $v(){const s=[],t=[],e=[],n=[],r=l=>{const h=.045*(1-.3*l),d=[];for(let u=0;u<=4;u++){const f=u/4*Math.PI*2+Math.PI/4;d.push([Math.cos(f)*h,l,Math.sin(f)*h])}return d};for(let l=0;l<3;l++){const h=r(l/3),d=r((l+1)/3);for(let u=0;u<4;u++){const f=(u+.5)/4*Math.PI*2+Math.PI/4,p=Math.cos(f),x=Math.sin(f),g=[h[u],h[u+1],d[u+1],h[u],d[u+1],d[u]],m=[.55+.4*(u/4),.55+.4*((u+1)/4),.55+.4*((u+1)/4),.55+.4*(u/4),.55+.4*((u+1)/4),.55+.4*(u/4)];g.forEach(([w,y,v],T)=>{s.push(w,y,v),t.push(p,0,x),e.push(m[T],y),n.push(0)})}}const a=7;for(let l=0;l<a;l++){const h=l/a*Math.PI*2,d=.56,u=.14,f=[];for(let x=0;x<=2;x++){const g=x/2,m=d*g,w=1+.16*Math.sin(g*Math.PI*.8)-.5*g*g,y=Math.cos(h)*m,v=Math.sin(h)*m,T=-Math.sin(h)*u*(1-g*.25),M=Math.cos(h)*u*(1-g*.25);f.push([y-T,w,v-M],[y+T,w,v+M])}const p=(x,g,m)=>{for(const w of[x,g,m]){s.push(f[w][0],f[w][1],f[w][2]),t.push(0,1,0),n.push(l+1);const y=Math.floor(w/2),v=w%2;e.push(v*.5,1-y/2)}};p(0,2,1),p(1,2,3),p(2,4,3),p(3,4,5)}const c=new re;return c.setAttribute("position",new At(s,3)),c.setAttribute("normal",new At(t,3)),c.setAttribute("uv",new At(e,2)),c.setAttribute("aPart",new At(n,1)),c.boundingSphere=new Ce(new P(0,.8,0),1.2),c}function jv(){const s=new re;return s.setAttribute("position",new At([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,-.5,0,.5,.5,0,-.5,.5,0],3)),s.setAttribute("normal",new At([0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0],3)),s.setAttribute("uv",new At([0,0,1,0,1,1,0,0,1,1,0,1],2)),s.boundingSphere=new Ce(new P(0,0,0),2),s}const cu=`
uniform float uTime;
uniform float uWind;
attribute float aPart;
attribute vec4 aVar; // archetype, seed, crown squash / frond droop, trunk length
varying float vPart;
varying vec3 vWP;
${Sn}
`,Zv=`
vec3 objectNormal = normal;
// foliage normals lean toward the sky so a crown shades as a lit mass of leaves, not a hard ball
if (aPart > 0.5) objectNormal = normalize(mix(normalize(objectNormal * vec3(1.0, 1.0 / max(aVar.z, 0.3), 1.0)), vec3(0.0, 1.0, 0.0), 0.35));
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif
`,Kv=`
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
`,Jv=`
varying float vPart;
varying vec3 vWP;
${Sn}
`,Qv=`
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
`,tx=`
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
`,ex=`
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
`,lu=`
attribute vec4 aVar; // archetype (0 crown, 1 palm), seed, card size (unit), crown centre height (unit)
varying vec2 vCardUv;
varying float vElev;
varying float vCol; // atlas column of the side view (top view is 3 columns further)
`,hu=`
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
`,uu=`
uniform sampler2D uAtlas;
varying vec2 vCardUv;
varying float vElev;
varying float vCol;
`,nx=`
{
  vec4 side = texture2D(uAtlas, vec2((vCardUv.x + vCol) / ${ao}.0, vCardUv.y));
  vec4 top = texture2D(uAtlas, vec2((vCardUv.x + vCol + 3.0) / ${ao}.0, vCardUv.y));
  diffuseColor.a = mix(side, top, vElev).a;
}
`,ix=`
#include <color_fragment>
{
  vec4 side = texture2D(uAtlas, vec2((vCardUv.x + vCol) / ${ao}.0, vCardUv.y));
  vec4 top = texture2D(uAtlas, vec2((vCardUv.x + vCol + 3.0) / ${ao}.0, vCardUv.y));
  vec4 t = mix(side, top, vElev);
  if (t.a < 0.5) discard;
  diffuseColor.rgb *= t.r * 1.05;
}
`;function sx(s,t){const e=new he({color:16777215,roughness:.88});return e.onBeforeCompile=n=>{n.uniforms.uTime=s,n.uniforms.uWind=t,n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
${cu}`).replace("#include <beginnormal_vertex>",Zv).replace("#include <begin_vertex>",Kv),n.fragmentShader=n.fragmentShader.replace("#include <common>",`#include <common>
${Jv}`).replace("#include <color_fragment>",Qv)},e.customProgramCacheKey=()=>"veg-crown-v4",e}function ox(s,t,e){const n=new he({map:s,alphaTest:.5,alphaToCoverage:!0,side:Be,roughness:.75,color:16777215});return n.onBeforeCompile=i=>{i.uniforms.uTime=t,i.uniforms.uWind=e,i.vertexShader=i.vertexShader.replace("#include <common>",`#include <common>
${cu}`).replace("#include <beginnormal_vertex>",tx).replace("#include <begin_vertex>",ex),i.fragmentShader=i.fragmentShader.replace("#include <common>",`#include <common>
varying float vPart; varying vec3 vWP;`)},n.customProgramCacheKey=()=>"veg-palm-v4",n}function rx(s){const t=new Xh({depthPacking:Eh,alphaTest:.5,side:Be});return t.onBeforeCompile=e=>{e.uniforms.uAtlas={value:s},e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
${lu}`).replace("#include <project_vertex>",hu),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
${uu}`).replace("#include <map_fragment>",nx)},t.customProgramCacheKey=()=>"veg-card-depth-v3",t}function ax(s){const t=new he({color:16777215,roughness:.9,alphaTest:.5,alphaToCoverage:!0,side:Be});return t.onBeforeCompile=e=>{e.uniforms.uAtlas={value:s},e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
${lu}`).replace("#include <project_vertex>",hu),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
${uu}`).replace("#include <color_fragment>",ix)},t.customProgramCacheKey=()=>"veg-card-v4",t}const Jl=900,cx=650,lx=6e4,hx={0:["#2c5a2a","#35662f","#244d22","#3d7034","#2f6136","#47783b","#223f1e","#3a6a2c","#6b7a3a","#33613a","#4f7f3a","#5a8a3e","#73913f","#3f7a3f","#5c7d2f"],1:["#1f4520","#2b5528","#365f2f","#254a25","#3b6a33","#4a7a3a"],2:["#2d4f26","#395b2c","#263f1f","#43663a","#334f2a","#4f6b33"],3:["#5d8a44","#6b9550","#4f7a3a","#7a9a48","#8a9a4a"],4:["#5e8a3a","#527f31","#6c9a42","#4a7229","#739c46","#5f8f3c"]};class ux{group=new Pe;materials=[];uTime={value:0};uWind={value:.5};counts={palms:0,trees:0,mangroves:0,shrubs:0};tiles=[];shadowDistance=1800;viewDistance=9e3;constructor(t,e){const n=new We("vegetation"),i=Wv(n.fork("fronds")),o=Xv(n.fork("atlas")),r=sx(this.uTime,this.uWind),a=ox(i,this.uTime,this.uWind),c=ax(o),l=rx(o);this.materials.push(r,a,c);const h=Yv(),d=$v(),u=jv(),f=[],p={0:[],1:[],2:[],3:[],4:[]};for(const A of[0,1,2,3,4])p[A]=hx[A].map(U=>new Ot(U));const x=(A,U,N,D,O,k)=>{const B=k.pick(p[A]).clone();B.offsetHSL(k.range(-.025,.025),k.range(-.08,.06),k.range(-.06,.04));const G=A===2?k.range(.5,.7):A===3?k.range(.6,.85):A===1?k.range(.95,1.25):k.range(.7,1),K=A===2?k.range(.15,.3):A===3?.02:A===1?k.range(.6,.95):k.range(.3,.55);f.push({x:U,y:D,z:N,s:O,rot:k.range(0,Math.PI*2),tint:B,arche:A,seed:k.next(),squash:G,trunk:K})},g=t.n,m=t.zone,w=t.veg,y=t.height;for(let A=0;A<g;A++)for(let U=0;U<g;U++){const N=A*g+U,D=m[N];if(D===ie.OCEAN||D===ie.BAY||D===ie.SANDBAR||D===ie.ROCK||D===ie.LOT||D===ie.CONSTRUCTION||D===ie.STADIUM||D===ie.ROAD||D===ie.MARINA||y[N]<.12)continue;const O=w[N]/255,k=-Ge+(U+.5)*Pi,B=-Ge+(A+.5)*Pi,G=Kt(k/150,B/150),K=Kt(k/420+9,B/420-3);let nt=0,q=1;switch(D){case ie.MANGROVE:nt=.95,q=3;break;case ie.BEACH:nt=.2;break;case ie.PARK:nt=.06+.94*Nt(.35,.95,O)+.08*G,q=O>.6?3:O>.3?2:1;break;case ie.RES_LOW:nt=.05+.75*Nt(.25,.95,O)+.05*G,q=O>.7?3:O>.42?2:1;break;case ie.GOLF:nt=.03+.22*Nt(.1,.6,G);break;case ie.WETLAND_FLAT:nt=.85*Nt(.55,.9,O),q=2;break;case ie.HOTEL:case ie.RES_MID:nt=.05;break;case ie.DOWNTOWN:nt=.02;break;case ie.AIRPORT:nt=.012;break;case ie.INDUSTRIAL:nt=.006;break;default:nt=0}if(!(nt<=0))for(let tt=0;tt<q;tt++){if(Qr(U,A,7+tt*3)>=nt)continue;const J=k+(Qr(U,A,8+tt*3)-.5)*Pi*1.1,et=B+(Qr(U,A,9+tt*3)-.5)*Pi*1.1,at=t.heightAt(J,et);if(at<.12)continue;const gt=new We(N*4+tt),dt=gt.next(),st=t.coastAt(J,et)>-110;if(D===ie.MANGROVE){if(e(J,et))continue;x(2,J,et,at-.2,gt.range(2.4,4.4),gt)}else if(D===ie.BEACH){if(e(J,et))continue;at>1.15&&dt<.45?x(4,J,et,at-.15,gt.range(6,10.5),gt):at>1&&dt<.62&&x(3,J,et,at-.15,gt.range(1.2,2.6),gt)}else if(D===ie.WETLAND_FLAT){if(at<.25||e(J,et))continue;x(dt<.35?1:0,J,et,at-.3,dt<.35?gt.range(7,10):gt.range(4,6.5),gt)}else{if(e(J,et))continue;const lt=O>.7;if(D===ie.PARK||D===ie.RES_LOW||D===ie.GOLF){const H=D===ie.GOLF?.4:D===ie.RES_LOW?lt?.14:.35:st?.22:.08,Lt=lt?.1+.16*Nt(.1,.5,K):.05,pt=lt?.08:.06;dt<H?x(4,J,et,at-.15,gt.range(6,11),gt):dt<H+Lt?x(1,J,et,at-.3,gt.range(7.5,11),gt):dt<H+Lt+pt?x(3,J,et,at-.1,gt.range(1.3,2.8),gt):x(0,J,et,at-.3,lt?gt.range(4.2,7.5):gt.range(3.8,6.5),gt)}else D===ie.INDUSTRIAL?x(dt<.5?3:0,J,et,at-.2,dt<.5?gt.range(1.3,2.4):gt.range(3.5,5.5),gt):D===ie.AIRPORT?x(0,J,et,at-.3,gt.range(3.2,5),gt):x(4,J,et,at-.15,gt.range(6,10),gt)}}}const v=new We("road-palms"),T=[];for(const A of t.roads)(A.cls==="highway"||A.cls==="arterial"||A.cls==="causeway"||A.cls==="street")&&T.push({pts:A.pts,width:A.width,spacing:A.cls==="street"?34:26});for(const A of t.districts)A.track&&T.push({pts:A.track,width:7,spacing:30});for(const A of T){let U=0;for(let N=0;N<A.pts.length-1;N++){const[D,O]=A.pts[N],[k,B]=A.pts[N+1],G=Math.hypot(k-D,B-O);if(G<1)continue;const K=(k-D)/G,nt=(B-O)/G;for(let q=14;q<G-8;q+=A.spacing*v.range(.8,1.25),U++){const tt=U&1?1:-1,ut=A.width*.5+v.range(5,8),J=D+K*q-nt*ut*tt,et=O+nt*q+K*ut*tt,at=t.heightAt(J,et);if(at<.9)continue;const gt=t.zoneAt(J,et);gt===ie.INDUSTRIAL||gt===ie.AIRPORT||gt===ie.WETLAND_FLAT||gt===ie.LOT||v.chance(.25)||x(4,J,et,at-.15,v.range(6.5,10.5),v)}}}for(const A of f)A.arche===4?this.counts.palms++:A.arche===2?this.counts.mangroves++:A.arche===3?this.counts.shrubs++:this.counts.trees++;const M=new Map;for(const A of f){const U=Math.floor(A.x/Jl),N=Math.floor(A.z/Jl),D=`${U}|${N}`;let O=M.get(D);O||(O={crown:[],palm:[],tx:U,tz:N},M.set(D,O)),(A.arche===4?O.palm:O.crown).push(A)}const E=new We("veg-shuffle"),b=new $t,_=new Ae,S=new P,R=new P,F=new be,z=(A,U,N)=>{for(let et=A.length-1;et>0;et--){const at=E.int(0,et),gt=A[et];A[et]=A[at],A[at]=gt}const D=A.length,O=new re;for(const et of["position","normal","uv","aPart"])O.setAttribute(et,U.getAttribute(et));O.boundingSphere=U.boundingSphere;const k=new re;for(const et of["position","normal","uv"])k.setAttribute(et,u.getAttribute(et));k.boundingSphere=u.boundingSphere;const B=new Float32Array(D*4),G=new Float32Array(D*4),K=new Ui(O,N,D),nt=new He;A.forEach((et,at)=>{S.set(et.x,et.y,et.z),F.set(et.arche===4?(et.seed-.5)*.16:0,et.rot,0),_.setFromEuler(F),R.set(et.s,et.s,et.s),K.setMatrixAt(at,b.compose(S,_,R)),K.setColorAt(at,et.tint),B[at*4]=et.arche,B[at*4+1]=et.seed,B[at*4+2]=et.arche===4?.35:et.squash,B[at*4+3]=et.trunk,et.arche===4?(G[at*4]=1,G[at*4+2]=2.45,G[at*4+3]=1):(G[at*4]=0,G[at*4+2]=3.1*et.squash+.3,G[at*4+3]=et.trunk+.9*et.squash),G[at*4+1]=et.seed,nt.expandByPoint(S)}),O.setAttribute("aVar",new mi(B,4)),k.setAttribute("aVar",new mi(G,4)),K.instanceMatrix.needsUpdate=!0,K.receiveShadow=!0,K.castShadow=!1,K.matrixAutoUpdate=!1;const q=new Ui(k,c,D);q.instanceMatrix=K.instanceMatrix,q.instanceColor=K.instanceColor,q.receiveShadow=!0,q.castShadow=!1,q.customDepthMaterial=l,q.matrixAutoUpdate=!1;const tt=A.reduce((et,at)=>Math.max(et,at.s),0),ut=nt.getBoundingSphere(new Ce);ut.radius+=tt*2.6,nt.min.x-=tt*2.6,nt.max.x+=tt*2.6,nt.min.z-=tt*2.6,nt.max.z+=tt*2.6,nt.min.y-=1,nt.max.y+=tt*3.7;const J=nt.getBoundingSphere(new Ce);K.boundingSphere=J,q.boundingSphere=J.clone(),q.visible=!1,this.group.add(K,q),this.tiles.push({near:K,far:q,box:nt,center:J.center,r:J.radius,height:nt.max.y-nt.min.y,lodCenter:ut.center,lodR:ut.radius,n:D,d:0})};for(const A of M.values())A.crown.length&&z(A.crown,h,r),A.palm.length&&z(A.palm,d,a)}update(t,e){this.uTime.value=t,this.uWind.value=e}updateLod(t,e,n){const i=this.tiles;for(const r of i)r.d=Math.max(0,Math.hypot(r.lodCenter.x-t,r.lodCenter.z-e)-r.lodR);for(let r=1;r<i.length;r++){const a=i[r];let c=r-1;for(;c>=0&&i[c].d>a.d;)i[c+1]=i[c],c--;i[c+1]=a}let o=lx;for(const r of i){const a=r.d<cx&&o>=r.n;a&&(o-=r.n);const c=n.boxInView(r.box),l=r.d<this.shadowDistance&&n.casterInView(r.center,r.r,r.height);r.near.visible=a&&c;const h=!a&&c&&r.d<this.viewDistance;r.far.visible=h||l,r.far.castShadow=l,r.far.layers.mask=uo("all",h);const d=a||r.d<3e3?1:r.d<5500?.5:.25;r.far.count=Math.max(1,Math.round(r.n*d))}}}function du(s,t,e){const n=new he({color:16777215,roughness:1,metalness:1,vertexColors:t,emissive:e??0}),i=e!==void 0;return n.onBeforeCompile=o=>{o.vertexShader=o.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aMatParams;
varying vec2 vMatParams;${i?`
attribute float aEmissive;
varying float vEmissive;`:""}`).replace("#include <begin_vertex>",`#include <begin_vertex>
vMatParams = aMatParams;${i?`
vEmissive = aEmissive;`:""}`),o.fragmentShader=o.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vMatParams;${i?`
varying float vEmissive;`:""}`).replace("#include <roughnessmap_fragment>","float roughnessFactor = vMatParams.x;").replace("#include <metalnessmap_fragment>","float metalnessFactor = vMatParams.y;"),i&&(o.fragmentShader=o.fragmentShader.replace("#include <emissivemap_fragment>","totalEmissiveRadiance *= vEmissive;"))},n.customProgramCacheKey=()=>s,n}function dx(s){const t=[],e=[],n=[],i=[],o=[];for(const a of s){const c=a.geometry.index?a.geometry.toNonIndexed():a.geometry,l=c.getAttribute("position"),h=c.getAttribute("normal"),{color:d,roughness:u,metalness:f}=a.material;for(let p=0;p<l.count;p++)t.push(l.getX(p),l.getY(p),l.getZ(p)),e.push(h.getX(p),h.getY(p),h.getZ(p)),n.push(d.r,d.g,d.b),i.push(u,f),o.push(a.emissive?1:0);c!==a.geometry&&c.dispose()}const r=new re;return r.setAttribute("position",new At(t,3)),r.setAttribute("normal",new At(e,3)),r.setAttribute("color",new At(n,3)),r.setAttribute("aMatParams",new At(i,2)),r.setAttribute("aEmissive",new At(o,1)),r.computeBoundingSphere(),r}function ta(s){const t=s.getAttribute("position").count;return s.setAttribute("color",new At(new Float32Array(t*3).fill(1),3)),s.setAttribute("aEmissive",new At(new Float32Array(t),1)),s}class fx{pos=[];nrm=[];col=[];par=[];box=new He;v=new P;get vertexCount(){return this.pos.length/3}add(t,e,n,i){const o=(t.index?t.toNonIndexed():t.clone()).applyMatrix4(e),r=o.getAttribute("position"),a=o.getAttribute("normal"),c=i??n.color,l=n.roughness,h=n.metalness,d=(u,f)=>{this.v.set(r.getX(u),r.getY(u),r.getZ(u)),this.pos.push(this.v.x,this.v.y,this.v.z),this.box.expandByPoint(this.v);const p=f?-1:1;this.nrm.push(p*a.getX(u),p*a.getY(u),p*a.getZ(u)),this.col.push(c.r,c.g,c.b),this.par.push(l,h)};for(let u=0;u<r.count;u++)d(u,!1);if(n.side===Be)for(let u=0;u<r.count;u+=3)d(u,!0),d(u+2,!0),d(u+1,!0);o.dispose()}build(){const t=new re;return t.setAttribute("position",new At(this.pos,3)),t.setAttribute("normal",new At(this.nrm,3)),t.setAttribute("color",new At(this.col,3)),t.setAttribute("aMatParams",new At(this.par,2)),t.boundingBox=this.box.clone(),t.boundingSphere=this.box.getBoundingSphere(new Ce),t}}function nc(s,t,e){const n=Math.floor((s+1e4)/e);return Math.floor((t+1e4)/e)*4096+n}function Ql(s,t,e){return s+t+e-Math.max(s,t,e)-Math.min(s,t,e)}const px=2500,mx=1,gx=350,vx=2500;class xx{constructor(t,e,n,i){this.map=t,this.markOccupied=i,this.mats={concrete:new he({color:12170926,roughness:.9}),dark:new he({color:3816768,roughness:.8}),white:new he({color:15921902,roughness:.6}),steel:new he({color:10134701,roughness:.45,metalness:.7}),red:new he({color:13123630,roughness:.6}),blue:new he({color:3103400,roughness:.6}),green:new he({color:3046735,roughness:.6}),orange:new he({color:14252074,roughness:.6}),wood:new he({color:9136968,roughness:.9}),tank:new he({color:14474452,roughness:.5,metalness:.3}),glass:new he({color:10470614,roughness:.15,metalness:.8}),grass:new he({color:4164142,roughness:.95}),yellow:new he({color:14725690,roughness:.6}),lampHead:new he({color:16777215})},this.material=du("props-v4",!0,16767392),this.materials.push(this.material);const o=new We("props");this.buildMarinas(o.fork("marinas")),this.buildPrivateDocks(o.fork("docks")),this.buildFishingPiers(o.fork("piers")),this.buildChannelMarkers(o.fork("markers")),this.buildLifeguardTowers(o.fork("lifeguards")),this.buildClubhouse(o.fork("clubhouse")),this.buildPort(o),this.buildAirport(o),this.buildStadium(),this.buildLighthouse(),this.buildConstruction(o),this.buildLamps(e,n),this.buildSeawalls(),this.flush()}group=new Pe;material;materials=[];lampPositions=[];mooredBoatPositions=[];m=new $t;q=new Ae;p=new P;s=new P;boxes=[];cyls=[];lamps=[];chunks=[];mats;counts={boxes:0,cylinders:0,lamps:0,chunks:0,meshes:0};shoreDistance(t,e,n,i,o=400){const r=a=>this.map.heightAt(t+n*a,e+i*a)<.15;if(!r(0)){for(let a=1;a<=o;a+=1)if(r(a))return a-.5;return o}for(let a=1;a<=o;a+=1)if(!r(-a))return-(a-.5);return-o}piling(t,e,n,i=.18,o="wood"){const r=Math.min(this.map.heightAt(t,e),.2);this.cyl(o,t,r-.3,e,i,n-r+.3)}moor(t,e,n,i){this.map.heightAt(t,e)<-.6&&this.mooredBoatPositions.push({x:t,z:e,rot:n,len:i})}box(t,e,n,i,o,r,a,c=0,l=0){this.p.set(e,n+r/2,i),this.q.setFromEuler(new be(l,c,0)),this.s.set(o,r,a),this.boxes.push({m:this.m.compose(this.p,this.q,this.s).clone(),mat:t,size:Ql(o,r,a)})}cyl(t,e,n,i,o,r,a=0,c=0){this.p.set(e,n+r/2,i),this.q.setFromEuler(new be(c,a,0)),this.s.set(o*2,r,o*2),this.cyls.push({m:this.m.compose(this.p,this.q,this.s).clone(),mat:t,size:Ql(o*2,r,o*2)})}lamp(t,e,n){this.lamps.push({m:new $t().makeTranslation(t,e,n),mat:"steel",size:.24})}lampGeometry(t){const e=new ye(.12,.12,9,t).translate(0,4.5,0),n=new Xt(.2,.2,2.4).translate(0,9.1,0),i=new Kn(.22,6,4).translate(0,9.05,0),o=dx([{geometry:e,material:this.mats.steel},{geometry:n,material:this.mats.steel},{geometry:i,material:this.mats.lampHead,emissive:!0}]);return e.dispose(),n.dispose(),i.dispose(),o}flush(){const t=ta(new Xt(1,1,1)),e=ta(new ye(.5,.5,1,14)),n=ta(new ye(.5,.5,1,6)),i=this.lampGeometry(14),o=this.lampGeometry(6);for(const u of[t,e,n,i,o])u.computeBoundingSphere();const r=new Map,a=u=>{this.p.setFromMatrixPosition(u.m);const f=nc(this.p.x,this.p.z,px);let p=r.get(f);return p||(p={boxes:[],cylLarge:[],cylSmall:[],lamps:[]},r.set(f,p)),p},c=u=>u.size>mx;for(const u of this.boxes)a(u).boxes.push(u);for(const u of this.cyls)(c(u)?a(u).cylLarge:a(u).cylSmall).push(u);for(const u of this.lamps)a(u).lamps.push(u);this.counts.boxes=this.boxes.length,this.counts.cylinders=this.cyls.length,this.counts.lamps=this.lamps.length;const l=new Ce,h=new P,d=new Ot(16777215);for(const u of r.values()){const f={meshes:[],box:new He,center:new P,r:0,height:0};u.boxes.sort((x,g)=>Number(c(g))-Number(c(x)));const p=(x,g,m,w)=>{if(!x.length)return;const y=g.clone(),v=w?null:new mi(new Float32Array(x.length*2),2);v&&y.setAttribute("aMatParams",v);const T=new Ui(y,this.material,x.length),M=new He;let E=0;x.forEach((S,R)=>{T.setMatrixAt(R,S.m);const F=this.mats[S.mat];T.setColorAt(R,w?d:F.color),v?.setXY(R,F.roughness,F.metalness),c(S)&&E++,l.copy(g.boundingSphere).applyMatrix4(S.m),M.expandByPoint(h.copy(l.center).addScalar(-l.radius)),M.expandByPoint(h.copy(l.center).addScalar(l.radius))}),T.boundingSphere=M.getBoundingSphere(new Ce),T.castShadow=!0,T.receiveShadow=!0;let b=null;m&&(b=m.clone(),v&&b.setAttribute("aMatParams",v));const _={mesh:T,large:E,total:x.length,mainCount:x.length,hi:y,lo:b};T.onBeforeShadow=()=>{T.count=Dv()<=0?_.total:_.large},T.onAfterShadow=()=>{T.count=_.mainCount},f.box.union(M),f.meshes.push(_),this.group.add(T)};p(u.boxes,t,null,!1),p(u.cylLarge,e,null,!1),p(u.cylSmall,e,n,!1),p(u.lamps,i,o,!0),f.box.getBoundingSphere(l),f.center.copy(l.center),f.r=l.radius,f.height=f.box.max.y-f.box.min.y,this.chunks.push(f),this.counts.meshes+=f.meshes.length}this.counts.chunks=this.chunks.length,this.boxes.length=0,this.cyls.length=0,this.lamps.length=0}setNight(t){this.material.emissiveIntensity=8*t}updateLod(t,e,n){for(const i of this.chunks){const o=Math.max(0,Math.hypot(i.center.x-t,i.center.z-e)-i.r),r=n.boxInView(i.box),a=n.casterInView(i.center,i.r,i.height),c=o>vx;for(const l of i.meshes){const h=c?l.large:l.total;l.mainCount=h,l.mesh.count=h;const d=r&&h>0;l.mesh.visible=d||a,l.mesh.castShadow=a,l.mesh.layers.mask=uo(l.large>0?"all":"near",d),l.lo&&(l.mesh.geometry=o>gx?l.lo:l.hi)}}}buildMarinas(t){for(const e of this.map.marinas){const n=t.fork(e.id),i=Math.sin(e.rot),o=-Math.cos(e.rot),r=-o,a=i,c=this.shoreDistance(e.x,e.z,i,o),l=e.x+i*c,h=e.z+o*c,d=e.piers*n.range(24,30)+24,u=.95,f=-e.rot,p=(M,E,b,_,S,R,F)=>this.box(M,E,b,_,S,R,F,f);p("concrete",l-i*.4,.3,h-o*.4,d,.9,1.2),p("wood",l-i*3.2,u-.3,h-o*3.2,d,.3,5.5);for(let M=-d/2+2;M<d/2;M+=n.range(5,8))this.piling(l+r*M+i*.4,h+a*M+o*.4,u+.55,.2);let x=-d/2+n.range(8,16);for(;x<d/2-8;){const M=l+r*x,E=h+a*x;let b=e.pierLen*n.range(.6,1.2);for(;b>30&&this.map.heightAt(M+i*b,E+o*b)>-1.2;)b-=6;if(b<=30){x+=n.range(22,34);continue}const _=M+i*b/2,S=E+o*b/2,R=n.chance(.3);p("wood",_,u-.3,S,R?3.2:2.2,.3,b);for(let z=n.range(2,6);z<b;z+=n.range(8,12))for(const A of[-1,1])this.piling(M+i*z+r*A*(R?1.7:1.3),E+o*z+a*A*(R?1.7:1.3),u+n.range(.4,.9),n.range(.15,.2));const F=n.range(10,14);for(let z=n.range(6,12);z<b-8;z+=F)for(const A of[-1,1]){if(n.chance(.18))continue;const U=n.range(6,9.5),N=M+i*z+r*A*(U/2+1),D=E+o*z+a*A*(U/2+1);if(p("wood",N,u-.4,D,U,.25,.9),this.piling(M+i*z+r*A*(U+.6),E+o*z+a*A*(U+.6),u+.4,.14),n.chance(.62)){const O=n.range(6.5,12.5),k=M+i*(z+F*.5)+r*A*(O*.45+1.2),B=E+o*(z+F*.5)+a*A*(O*.45+1.2);this.moor(k,B,e.rot+Math.PI/2,O)}}if(n.chance(.55)){const z=n.range(16,26),A=M+i*(b-1.2),U=E+o*(b-1.2);p("wood",A,u-.3,U,z,.3,2.4);for(const N of[-1,1])this.piling(A+r*N*z*.5,U+a*N*z*.5,u+.7,.2);for(const N of[-1,1])n.chance(.7)&&this.moor(A+i*4.5+r*N*z*.25,U+o*4.5+a*N*z*.25,e.rot+Math.PI/2,n.range(13,19))}x+=n.range(22,36)}const g=(n.chance(.5)?-1:1)*(d/2-6),m=l+r*g+i*7,w=h+a*g+o*7;p("wood",m,u-.3,w,9,.3,14);for(const M of[-1,1])this.piling(m+r*M*4+i*6,w+a*M*4+o*6,u+.6,.2);for(const M of[-1,1])this.cyl("steel",m+r*M*3,u,w+a*M*3,.16,4.4);p("white",m,u+4.4,w,10,.5,8),p("red",m,u,w,.9,1.3,.9),this.moor(m+i*12,w+o*12,e.rot+Math.PI/2,n.range(8,12));const y=l-i*22+r*n.range(-8,8),v=h-o*22+a*n.range(-8,8),T=this.map.heightAt(y,v);if(p("white",y,T,v,18,5.5,11),p("dark",y,T+5.5,v,19.5,.5,12.5),this.cyl("white",y+r*6,T+6,v+a*6,.9,5.5),this.markOccupied(y,v,22),n.chance(.7)){const M=l-i*26+r*(d/2-30)*(g>0?-1:1),E=h-o*26+a*(d/2-30)*(g>0?-1:1),b=this.map.heightAt(M,E);if(b>.9){p("steel",M,b+8.6,E,30,.4,10);for(const S of[-1,1])for(const R of[-1,1])this.cyl("steel",M+r*S*14+i*R*4.5,b,E+a*S*14+o*R*4.5,.2,8.6);const _=n.int(4,8);for(let S=0;S<_;S++)p(n.pick(["white","white","blue","red"]),M+r*n.range(-12,12)+i*n.range(-2,2),b+n.int(0,2)*2.8+.4,E+a*n.range(-12,12)+o*n.range(-2,2),2.4,1.4,7);this.markOccupied(M,E,20)}}if(n.chance(.6)){const M=n.chance(.5)?-1:1,E=l+r*M*(d/2+6),b=h+a*M*(d/2+6),_=n.range(40,90);for(let S=0;S<_;S+=n.range(3,4.5)){const R=E+i*S+r*n.range(-1.5,1.5),F=b+o*S+a*n.range(-1.5,1.5);if(this.map.heightAt(R,F)<-3)break;this.box("dark",R,-.8+n.range(0,.5),F,n.range(2.2,3.6),n.range(1.8,2.6),n.range(2.2,3.4),n.range(0,Math.PI),n.range(-.15,.15))}}}}buildPrivateDocks(t){const e=(n,i,o,r,a)=>{const c=this.shoreDistance(n,i,o,r,120);if(c<0||c>=120)return;const l=n+o*c,h=i+r*c,d=a.range(5,9);if(this.map.heightAt(l+o*(d+2),h+r*(d+2))>-.7)return;const f=-Math.atan2(o,-r),p=.75;this.box("wood",l+o*(d/2-1.5),p-.25,h+r*(d/2-1.5),1.8,.25,d+3,f);const x=-r,g=o;for(const m of[d-.6,d*.4])for(const w of[-1,1])this.piling(l+o*m+x*w*.8,h+r*m+g*w*.8,p+a.range(.3,.7),.13);if(a.chance(.55)){const m=a.chance(.5)?-1:1,w=a.range(5.5,10);this.moor(l+o*(d*.6)+x*m*2.4,h+r*(d*.6)+g*m*2.4,f,w)}else if(a.chance(.35)){const m=a.chance(.5)?-1:1;for(const w of[d*.25,d*.8])for(const y of[1.4,4.2])this.piling(l+o*w+x*m*y,h+r*w+g*m*y,p+2.6,.12,"steel");this.box("steel",l+o*(d*.52)+x*m*2.8,p+2.6,h+r*(d*.52)+g*m*2.8,3.4,.2,d*.6,f)}};for(let n=0;n<5;n++){const i=1870-n*25,o=-3e3+n*330,r=t.fork(`finger-${n}`);for(const a of[-1,1])for(let c=-280+r.range(0,30);c<280;c+=r.range(26,44))r.chance(.25)||e(i+c,o+a*60,0,a,r)}for(const n of this.map.canals){const i=t.fork(n.id),o=Math.min(n.a[0],n.b[0]),r=Math.max(n.a[0],n.b[0]);for(let a=o+i.range(15,40);a<r-15;a+=i.range(30,55)){if(n.culverts.some(l=>Math.abs(l-a)<n.culvertHalf+12)||i.chance(.35))continue;const c=i.chance(.5)?-1:1;e(a,n.a[1]-c*(n.width*.5+14),0,c,i)}}}buildFishingPiers(t){const e=[[2700,-4650,1,0,170],[2600,-2350,1,.05,150],[1800,6700,-.2,1,130]];for(const[n,i,o,r,a]of e){const c=t.fork(`${n}-${i}`),l=Math.hypot(o,r),h=o/l,d=r/l,u=this.shoreDistance(n,i,h,d,600);if(u<0||u>=600)continue;const f=n+h*(u-22),p=i+d*(u-22),x=-Math.atan2(h,-d),g=2.6,m=a+22;this.box("wood",f+h*m/2,g-.3,p+d*m/2,3.4,.3,m,x);const w=-d,y=h;for(let E=0;E<m;E+=c.range(7,10))for(const b of[-1,1])this.piling(f+h*E+w*b*1.5,p+d*E+y*b*1.5,g+1.1,.2);for(const E of[-1,1])this.box("wood",f+h*m/2+w*E*1.6,g+.9,p+d*m/2+y*E*1.6,.1,.1,m,x);const v=f+h*(m-2.5),T=p+d*(m-2.5),M=c.range(14,20);this.box("wood",v,g-.3,T,M,.3,5,x);for(const E of[-1,1])this.piling(v+w*E*M*.5,T+y*E*M*.5,g+1.2,.22);this.box(c.pick(["white","blue","orange"]),v+w*M*.22,g,T+y*M*.22,4.5,3,4,x),this.box("dark",v+w*M*.22,g+3,T+y*M*.22,5.2,.3,4.8,x);for(const E of[-1,1])this.cyl("steel",v-w*M*.3+h*E*1.6,g,T-y*M*.3+d*E*1.6,.08,3.2);this.box("white",v-w*M*.3,g+3.2,T-y*M*.3,5,.15,4,x),this.box("white",f-h*2+w*3.5,this.map.heightAt(f-h*2+w*3.5,p-d*2+y*3.5),p-d*2+y*3.5,4,3.2,4,x),this.markOccupied(f,p,12)}}buildChannelMarkers(t){for(const e of this.map.channels){if(e.width>=250||e.depth<3.5)continue;const n=t.fork(e.id);let i=n.range(60,200);for(let o=0;o<e.pts.length-1;o++){const[r,a]=e.pts[o],[c,l]=e.pts[o+1],h=Math.hypot(c-r,l-a),d=(c-r)/h,u=(l-a)/h;let f=i;for(;f<h;f+=n.range(260,420)){const p=r+d*f,x=a+u*f,g=e.width*.5+n.range(6,14);for(const m of[-1,1]){if(n.chance(.3))continue;const w=p-u*g*m+n.range(-3,3),y=x+d*g*m+n.range(-3,3);if(this.map.heightAt(w,y)>-1.2)continue;const v=n.range(3.2,4.2);this.piling(w,y,v,.24,"wood"),this.box(m>0?"red":"green",w,v-1.1,y,1.1,1.1,.25,Math.atan2(d,-u)),n.chance(.3)&&this.box("white",w,v+.1,y,.5,.5,.5)}}i=f-h}}}buildLifeguardTowers(t){const e=[[2600,-7600,1,0,0,1],[3e3,4900,1,.2,-.2,1]],n=["white","yellow","orange","blue","red"];for(const[i,o,r,a,c,l]of e){const h=t.fork(`${i}`),d=i>2900?1600:6e3;for(let u=h.range(120,300);u<d;u+=h.range(380,620)){const f=i+c*u,p=o+l*u,x=this.shoreDistance(f,p,r,a,900);if(x<=0||x>=900)continue;let g=x-14;for(;g>0&&this.map.heightAt(f+r*g,p+a*g)<1;)g-=3;const m=f+r*g,w=p+a*g,y=this.map.heightAt(m,w);if(y<.9||y>3.2||this.map.zoneAt(m,w)!==2)continue;const v=-Math.atan2(r,-a)+h.range(-.2,.2),T=Math.cos(v),M=Math.sin(v),E=h.pick(n);for(const[b,_]of[[-1.2,-1.2],[1.2,-1.2],[1.2,1.2],[-1.2,1.2]])this.cyl("wood",m+b*T-_*M,y,w+b*M+_*T,.12,3);this.box(E,m,y+3,w,3.2,2.4,3,v),this.box("white",m,y+5.4,w,3.9,.25,3.7,v),this.box("wood",m,y+2.9,w,3.6,.15,3.4,v);for(let b=0;b<4;b++)this.box("wood",m-r*(2.2+b*1.1),y+2.9-(b+1)*.7,w-a*(2.2+b*1.1),1,.12,1.2,v);this.markOccupied(m,w,6)}}}buildClubhouse(t){const e=this.map.pois.find(y=>y.kind==="clubhouse");if(!e)return;const n=this.map.heightAt(e.x,e.z);if(n<1)return;const i=Math.cos(e.rot),o=Math.sin(e.rot),r=(y,v)=>[e.x+y*i-v*o,e.z+y*o+v*i],[a,c]=r(0,0);this.box("white",a,n,c,34,5.5,18,e.rot),this.box("dark",a,n+5.5,c,37,.6,21,e.rot),this.box("white",a,n+6.1,c,12,2.4,8,e.rot),this.box("dark",a,n+8.5,c,13.5,.4,9.5,e.rot);const[l,h]=r(0,13);this.box("wood",l,n+.4,h,34,.3,8,e.rot),this.box("white",l,n+4.6,h,35,.35,9,e.rot);for(let y=-3;y<=3;y++){const[v,T]=r(y*5.5,16.5);this.cyl("white",v,n+.7,T,.22,3.9)}const[d,u]=r(24,-4);this.box("white",d,n,u,14,4,12,e.rot),this.box("dark",d,n+4,u,15.5,.5,13.5,e.rot);const[f,p]=r(-26,-8);this.box("concrete",f,n,p,16,3.4,14,e.rot),this.box("dark",f,n+3.4,p,17,.4,15,e.rot);for(let y=0;y<5;y++){const[v,T]=r(-30+y*3.2,3+t.range(-1,1));this.box("white",v,n,T,1.3,1.1,2.4,e.rot),this.box("dark",v,n+1.6,T,1.4,.1,2.2,e.rot)}const[x,g]=r(4,32);this.box("grass",x,n+.05,g,30,.2,20,e.rot),this.cyl("white",x+4,n+.25,g-3,.04,2.2),this.box("red",x+4.3,n+2,g-3,.6,.4,.05,e.rot);const[m,w]=r(-6,-22);this.box("dark",m,n-.05,w,48,.2,18,e.rot),this.markOccupied(e.x,e.z,60)}buildPort(t){const e=jh,n=Math.cos(e.rot),i=Math.sin(e.rot),o=(M,E)=>[e.cx+M*n-E*i,e.cz+M*i+E*n],r=-.04,a=(M,E,b,_,S,R,F)=>{const[z,A]=o(E,_);this.box(M,z,b,A,S,R,F,r)},c=(M,E,b,_,S,R)=>{const[F,z]=o(E,_);this.cyl(M,F,b,z,S,R,r)},l=(M,E)=>{const[b,_]=o(M,E);return this.map.heightAt(b,_)},h=(M,E,b)=>{const[_,S]=o(M,E);this.markOccupied(_,S,b)},d=["red","blue","green","orange","steel","white","blue","red"],u=-300,f=[];for(let M=-780;M<e.hw-150;M+=t.range(185,240))f.push(M);for(const M of f){const E=u+16,b=l(M,E);if(b<1)continue;const _=18,S=40+t.range(-3,5);for(const R of[-1,1])for(const F of[-1,1])a("steel",M+R*_/2,b,E+F*6,1.6,S,1.6);a("steel",M,b+S,E-4,_+4,3,3),a("steel",M,b+S,E+4,_+4,3,3),a("orange",M,b+S+3,E-26,3.2,3,58),a("steel",M,b+S+5,E+12,3,3,18),a("white",M,b+S-14,E-12,6,4,6)}for(const[M,E,b,_]of[[-420,190,30,9],[330,130,22,7]]){const S=u-b/2-3;a("dark",M,-2.5,S,E,_+2.5,b),a(t.pick(["red","blue"]),M,_,S,E-6,1.6,b-2),a("white",M+E*.36,_+1.6,S,E*.14,12,b-6);for(let R=0;R<4;R++)a("steel",M-E*.32+R*E*.18,_+1.6,S,3,6+R%2*3,2)}const p=u+70,x=40;for(let M=-860;M<e.hw-260;M+=175)for(let E=p;E<x-40;E+=58){if(t.chance(.12))continue;const b=l(M+60,E+20);if(b<1)continue;const _=6,S=10,R=t.range(1,4);for(let F=0;F<_;F++)for(let z=0;z<S;z++){if(t.chance(.28))continue;const A=Math.min(4,Math.max(1,Math.round(R+t.range(-1.5,1.5)))),U=M+z*13.4,N=E+F*6.1;for(let D=0;D<A;D++)a(t.pick(d),U,b+D*2.6,N,12.2,2.6,4.9)}h(M+60,E+15,80),t.chance(.5)&&c("steel",M-8,b,E-6,.3,30)}let g=-810;for(;g<e.hw-520;){const M=t.range(120,170),E=t.range(40,55),b=150+t.range(-10,10),_=l(g+M/2,b);if(_>=1){a(t.pick(["concrete","white","tank"]),g+M/2,_,b,M,11+t.range(0,3),E),a("dark",g+M/2,_+11+3,b,M+2,.6,E+2);for(let S=0;S<6;S++)a("steel",g+12+S*(M-24)/5,_,b+E/2+3,4,4.2,6);h(g+M/2,b,Math.max(M,E)*.6)}g+=M+t.range(30,60)}const m=e.hh,w=260,y=l(w,m-60);a("white",w,y,m-60,260,12,40),a("glass",w,y+12,m-60,240,4,36),a("white",w,y,m-20,120,7,30),h(w,m-55,150);const v=m+19;a("dark",w,-2.5,v,290,12.5,36),a("white",w,10,v,280,28,32);for(let M=0;M<6;M++)a("glass",w,13.5+M*3.5,v,276,1.2,33);a("white",w-30,38,v,90,8,22),c("dark",w-90,38,v,4,14);const T=this.map.pois.find(M=>M.kind==="tanks");for(let M=0;M<9;M++){const E=T.x+M%3*52-52,b=T.z+Math.floor(M/3)*52-52,_=this.map.heightAt(E,b);_<1||(this.cyl("tank",E,_,b,t.range(14,22),t.range(10,16)),this.markOccupied(E,b,26))}}buildAirport(t){const e=this.map.pois.find(l=>l.kind==="terminal"),n=this.map.heightAt(e.x,e.z);this.box("white",e.x,n,e.z,260,14,60),this.box("glass",e.x,n+3,e.z+30.5,250,7,1.2),this.box("steel",e.x,n+14,e.z,270,2,66);for(let l=-1;l<=1;l++)this.box("white",e.x+l*90,n,e.z+90,30,9,120),this.box("steel",e.x+l*90,n+9,e.z+90,32,1.2,122);this.box("dark",e.x,n-.1,e.z+130,520,.4,220),this.cyl("concrete",e.x+220,n,e.z-40,4,38),this.box("glass",e.x+220,n+38,e.z-40,14,5,14,.4),this.box("white",e.x+220,n+43,e.z-40,16,1.5,16,.4);const i=this.map.pois.find(l=>l.kind==="hangars");for(let l=0;l<4;l++){const h=i.x+l*80,d=i.z,u=this.map.heightAt(h,d);this.box("concrete",h,u,d,64,12,50),this.box("steel",h,u+12,d,60,5,40),this.box("steel",h,u+17,d,40,3,30),this.markOccupied(h,d,40)}for(let l=-1;l<=1;l++)for(const h of[-1,1]){const d=e.x+l*90+h*34,u=e.z+110;this.cyl("white",d,n+2.2,u,2.6,38,0,Math.PI/2),this.box("white",d,n+2.5,u+2,34,.8,5,0),this.box("white",d,n+3,u+17,12,.6,3),this.box("white",d,n+4,u+18,.6,9,3),this.cyl("steel",d-9,n+.8,u+4,1.4,4.5,0,Math.PI/2),this.cyl("steel",d+9,n+.8,u+4,1.4,4.5,0,Math.PI/2)}this.markOccupied(e.x,e.z+60,320);const o=this.map.runways.find(l=>l.id==="strip-southkey"),r=(o.a[0]+o.b[0])/2+40,a=(o.a[1]+o.b[1])/2-60,c=this.map.heightAt(r,a);c>1&&(this.box("concrete",r,c,a,26,7,20,.55),this.box("steel",r,c+7,a,24,2.5,16,.55),this.markOccupied(r,a,20))}buildStadium(){const t=this.map.pois.find(r=>r.kind==="stadium"),e=this.map.heightAt(t.x,t.z);if(e<1)return;const n=40,i=t.size,o=t.size*.8;for(let r=0;r<n;r++){const a=r/n*Math.PI*2+t.rot,c=Math.cos(a),l=Math.sin(a),h=t.x+c*i,d=t.z+l*o,u=2*Math.PI*(i+o)/2/n+2,f=Math.atan2(c*o,-l*i);this.box("concrete",h,e,d,u,14,22,f),this.box("concrete",h+c*10,e+14,d+l*10,u,12,16,f),this.box("white",h+c*12,e+26,d+l*12,u,1.5,34,f),this.box("steel",h+c*26,e,d+l*26,1.4,30,1.4)}this.box("grass",t.x,e+.05,t.z,i*1.2,.3,o*1.15,t.rot),this.markOccupied(t.x,t.z,i+40)}buildLighthouse(){const t=this.map.pois.find(n=>n.kind==="lighthouse"),e=this.map.heightAt(t.x,t.z);e<.5||(this.cyl("white",t.x,e,t.z,4.2,28),this.cyl("red",t.x,e+10,t.z,4.25,5),this.cyl("dark",t.x,e+28,t.z,2.4,3.5),this.cyl("white",t.x,e+31.5,t.z,1.6,1.4),this.box("white",t.x+12,e,t.z+6,12,5,9,.3),this.markOccupied(t.x,t.z,20))}buildConstruction(t){for(const e of this.map.districts)if(e.id.startsWith("construction")){const n=this.map.heightAt(e.cx,e.cz);if(n<1)continue;const i=t.int(5,12),o=e.hw*1.2,r=e.hh*1.2;for(let l=1;l<=i;l++)this.box("concrete",e.cx,n+l*3.6,e.cz,o,.4,r,e.rot);for(const[l,h]of[[-.4,-.4],[.4,-.4],[.4,.4],[-.4,.4],[0,0],[0,-.4],[0,.4],[-.4,0],[.4,0]]){const d=Math.cos(e.rot),u=Math.sin(e.rot),f=e.cx+l*o*d-h*r*u,p=e.cz+l*o*u+h*r*d;this.cyl("concrete",f,n,p,.45,i*3.6+.4)}this.box("concrete",e.cx+o*.15,n,e.cz,10,i*3.6+6,8,e.rot);const a=e.cx-o*.6,c=e.cz+r*.6;this.box("yellow",a,n,c,2.2,i*3.6+30,2.2),this.box("yellow",a+20,n+i*3.6+30,c,60,1.6,1.6,.4),this.box("yellow",a-8,n+i*3.6+30,c,14,1.6,1.6,.4);for(let l=0;l<5;l++)this.box(t.pick(["blue","white","orange"]),e.cx+t.range(-o,o)*.7,n,e.cz+r*.85,6,2.6,2.4,e.rot);this.markOccupied(e.cx,e.cz,Math.max(o,r))}}buildLamps(t,e){for(const n of t){if(n.cls!=="highway"&&n.cls!=="arterial"&&n.cls!=="causeway")continue;const i=n.b[0]-n.a[0],o=n.b[1]-n.a[1],r=Math.hypot(i,o),a=i/r,c=o/r;let l=0;for(let h=20;h<r;h+=45,l++){const d=l%2===0?-1:1,u=n.a[0]+a*h+-c*(n.width/2+1)*d,f=n.a[1]+c*h+a*(n.width/2+1)*d,p=this.map.heightAt(u,f);p<.8||this.lampPositions.push(new P(u,p,f))}}for(const n of e)this.lampPositions.push(n.clone());for(const n of this.lampPositions)this.lamp(n.x,n.y,n.z)}buildSeawalls(){const t=this.map.districts.find(i=>i.id==="industrial-port"),e=Math.cos(t.rot),n=Math.sin(t.rot);for(let i=-t.hw;i<=t.hw;i+=6)for(const o of[-1,1]){const r=t.cx+i*e-o*t.hh*n,a=t.cz+i*n+o*t.hh*e;this.box("concrete",r,1.4,a,6.2,2.2,2,t.rot)}}}function Qi(s,t,e){const n=s/2,i=t/2,o=[[-n,-e*.55,0],[n*.55,-e*.55,0],[-n,-e*.1,-i*.95],[-n,-e*.1,i*.95],[n*.35,-e*.15,-i],[n*.35,-e*.15,i],[n,.05,0],[-n,e*.45,-i],[-n,e*.45,i],[n*.4,e*.45,-i*.95],[n*.4,e*.45,i*.95],[n,e*.55,0]],r=[[0,2,4],[0,4,1],[0,1,5],[0,5,3],[1,4,6],[1,6,5],[2,7,9],[2,9,4],[4,9,11],[4,11,6],[3,5,10],[3,10,8],[5,6,11],[5,11,10],[0,3,8],[0,8,7],[0,7,2],[7,8,10],[7,10,9],[9,10,11]],a=[];for(const l of r)for(const h of l)a.push(o[h][0],o[h][1],o[h][2]);const c=new re;return c.setAttribute("position",new At(a,3)),c.computeVertexNormals(),c}class _x{mats={white:new he({color:16053488,roughness:.35,metalness:.05}),hullDark:new he({color:2042424,roughness:.5}),hullRed:new he({color:10104618,roughness:.55}),hullBlue:new he({color:2051978,roughness:.5}),teak:new he({color:11569754,roughness:.8}),glass:new he({color:2241348,roughness:.1,metalness:.9}),sail:new he({color:16316142,roughness:.9,side:Be}),steel:new he({color:9213084,roughness:.5,metalness:.6}),containerWhite:new he({color:16777215,roughness:.7})};get materials(){return[this.mats.white,this.mats.hullDark,this.mats.hullRed,this.mats.hullBlue,this.mats.teak,this.mats.glass,this.mats.sail,this.mats.steel,this.mats.containerWhite]}build(t,e){const n=new Pe,i=(r,a,c,l,h,d=0,u=0,f=0)=>{const p=new pe(r,a);return p.position.set(c,l,h),p.rotation.set(d,u,f),p.castShadow=!0,p.receiveShadow=!0,n.add(p),p},o=e.pick([this.mats.white,this.mats.white,this.mats.hullDark,this.mats.hullBlue,this.mats.hullRed]);switch(t){case"speed":{const r=e.range(7,10),a=r*.3;return i(Qi(r,a,1.4),o,0,.3,0),i(new Xt(r*.25,.5,a*.8),this.mats.glass,r*.05,1.05,0,0,0,-.35),i(new Xt(r*.35,.35,a*.75),this.mats.teak,-r*.2,.8,0),i(new Xt(.6,.6,.8),this.mats.steel,-r*.45,.6,0),{group:n,len:r,beam:a,draft:.5,wakeWidth:a*1.4}}case"console":{const r=e.range(6,8),a=r*.32;i(Qi(r,a,1.3),this.mats.white,0,.3,0),i(new Xt(1.2,1.4,1),this.mats.white,0,1.2,0),i(new Xt(1.6,.15,1.6),this.mats.hullDark,0,2.3,0);for(const c of[-1,1])i(new ye(.04,.04,1.6,6),this.mats.steel,.6*c,1.5,.7*c);return i(new Xt(.5,.7,.5),this.mats.hullDark,-r*.45,.7,0),{group:n,len:r,beam:a,draft:.45,wakeWidth:a*1.3}}case"yacht":{const r=e.range(18,32),a=r*.25;return i(Qi(r,a,r*.16),this.mats.white,0,r*.04,0),i(new Xt(r*.5,r*.09,a*.8),this.mats.white,-r*.05,r*.13,0),i(new Xt(r*.48,r*.04,a*.82),this.mats.glass,-r*.05,r*.135,0),i(new Xt(r*.28,r*.07,a*.6),this.mats.white,-r*.12,r*.21,0),i(new Xt(r*.26,r*.03,a*.62),this.mats.glass,-r*.12,r*.215,0),i(new Xt(r*.06,r*.09,a*.5),this.mats.white,-r*.2,r*.29,0,0,0,.3),i(new ye(.15,.15,1.2,8),this.mats.steel,-r*.2,r*.34,0),{group:n,len:r,beam:a,draft:r*.06,wakeWidth:a*1.5}}case"sail":{const r=e.range(9,14),a=r*.31;i(Qi(r,a,r*.14),o,0,r*.03,0),i(new Xt(r*.3,.7,a*.6),this.mats.white,-r*.05,r*.09+.3,0);const c=r*1.25;i(new ye(.06,.09,c,6),this.mats.steel,r*.05,c/2+r*.08,0);const l=new re;l.setAttribute("position",new At([0,0,0,0,c*.9,0,-r*.42,0,0],3)),l.computeVertexNormals(),i(l,this.mats.sail,r*.05,r*.13,0,0,0,0);const h=new re;return h.setAttribute("position",new At([0,0,0,0,c*.75,0,r*.4,0,0],3)),h.computeVertexNormals(),i(h,this.mats.sail,r*.05,r*.13,.05,0,0,0),n.rotation.z=.12,{group:n,len:r,beam:a,draft:1.5,wakeWidth:a*.9}}case"ferry":return i(Qi(42,12,5),this.mats.hullBlue,0,1.5,0),i(new Xt(42*.8,3.2,12*.9),this.mats.white,-1,4.9,0),i(new Xt(42*.78,1.2,12*.92),this.mats.glass,-1,5.2,0),i(new Xt(42*.4,2.8,12*.6),this.mats.white,-4,7.8,0),i(new ye(.6,.7,3,10),this.mats.hullDark,-12,10.5,0),{group:n,len:42,beam:12,draft:2.2,wakeWidth:12*1.3};case"cargo":{const r=e.range(120,180),a=r*.16,c=r*.075;i(Qi(r,a,c),this.mats.hullDark,0,c*.15,0),i(new Xt(r*.9,.8,a*.98),this.mats.hullRed,0,c*.6,0),i(new Xt(r*.09,c*1.6,a*.9),this.mats.white,-r*.38,c*.6+c*.8,0),i(new Xt(r*.1,2,a*.95),this.mats.glass,-r*.38,c*.6+c*1.55,0),i(new ye(1.2,1.5,c*.9,10),this.mats.hullDark,-r*.44,c*.6+c*1.9,0);const l=Math.floor(r*.6/6.4),h=Math.max(3,Math.floor(a/2.6)),d=[];for(let x=0;x<l;x++)for(let g=0;g<h;g++){const m=e.int(1,4);for(let w=0;w<m;w++)d.push({x:r*.3-x*6.4,y:c*.6+.8+1.3+w*2.6,z:(g-(h-1)/2)*2.5,c:e.int(0,5)})}const u=new Ui(new Xt(6.1,2.6,2.44),this.mats.containerWhite,d.length),f=new $t,p=[12597547,3049153,2600544,14059792,8227731,15528177].map(x=>new Ot(x));return d.forEach((x,g)=>{u.setMatrixAt(g,f.makeTranslation(x.x,x.y,x.z)),u.setColorAt(g,p[x.c])}),u.castShadow=!0,u.receiveShadow=!0,n.add(u),{group:n,len:r,beam:a,draft:c*.5,wakeWidth:a*1.4}}}}}function wx(s){let t=0;for(let e=0;e<s.length-1;e++)t+=Math.hypot(s[e+1][0]-s[e][0],s[e+1][1]-s[e][1]);return t}function yx(s,t,e){let n=0;for(let i=0;i<s.length-1;i++){const o=Math.hypot(s[i+1][0]-s[i][0],s[i+1][1]-s[i][1]);if(t<=n+o||i===s.length-2){const r=jt((t-n)/o,0,1);e.dx=(s[i+1][0]-s[i][0])/o,e.dz=(s[i+1][1]-s[i][1])/o,e.x=s[i][0]+e.dx*o*r,e.z=s[i][1]+e.dz*o*r;return}n+=o}}function ea(s){s.updateMatrixWorld(!0);const t=s.matrixWorld.clone().invert(),e=new fx,n=new $t,i=new $t,o=new Ot;return s.traverse(r=>{const a=r;if(!a.isMesh)return;n.multiplyMatrices(t,a.matrixWorld);const c=a.material,l=r;if(l.isInstancedMesh)for(let h=0;h<l.count;h++)l.getMatrixAt(h,i),l.instanceColor&&l.getColorAt(h,o),e.add(a.geometry,i.premultiply(n),c,l.instanceColor?o:void 0);else e.add(a.geometry,n,c);a.geometry.dispose()}),e.build()}const th=5e3,eh=3;function Mx(){const s=[[new Xt(4.4,1,1.9),0,0,.65,0],[new Xt(2.2,.75,1.7),1,-.2,1.5,0],[new Xt(.2,.25,1.6),2,2.2,.8,0]],t=[],e=[],n=[],i=[];for(const[r,a,c,l,h]of s){const d=r.translate(c,l,h).toNonIndexed(),u=d.getAttribute("position"),f=d.getAttribute("normal"),p=d.getAttribute("uv");for(let x=0;x<u.count;x++)t.push(u.getX(x),u.getY(x),u.getZ(x)),e.push(f.getX(x),f.getY(x),f.getZ(x)),n.push(p.getX(x),p.getY(x)),i.push(a);d.dispose(),r.dispose()}const o=new re;return o.setAttribute("position",new At(t,3)),o.setAttribute("normal",new At(e,3)),o.setAttribute("uv",new At(n,2)),o.setAttribute("aPart",new At(i,1)),o.computeBoundingSphere(),o}function Sx(){const s=new he({color:16777215,emissive:16773840,emissiveIntensity:0}),t=new Ot(1712684),e=n=>n.toFixed(6);return s.onBeforeCompile=n=>{n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
attribute float aPart;
varying float vPart;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vPart = aPart;`),n.fragmentShader=n.fragmentShader.replace("#include <common>",`#include <common>
varying float vPart;`).replace("#include <color_fragment>",`#include <color_fragment>
if (vPart > 1.5) diffuseColor.rgb = vec3(1.0);
else if (vPart > 0.5) diffuseColor.rgb = vec3(${e(t.r)}, ${e(t.g)}, ${e(t.b)});`).replace("#include <roughnessmap_fragment>","float roughnessFactor = vPart > 1.5 ? 1.0 : (vPart > 0.5 ? 0.15 : 0.35);").replace("#include <metalnessmap_fragment>","float metalnessFactor = vPart > 1.5 ? 0.0 : (vPart > 0.5 ? 0.8 : 0.4);").replace("#include <emissivemap_fragment>","totalEmissiveRadiance *= step(1.5, vPart);")},s.customProgramCacheKey=()=>"traffic-car-v1",s}class bx{constructor(t,e,n,i,o,r){this.map=t,this.wakeScene=i;const a=new We(`traffic-${o}`),c=new _x,l=[];for(const A of t.channels){const U=wx(A.pts);for(let N=0;N<A.boats;N++){const D=A.id==="ocean-route"||A.id==="ship-channel"?a.chance(.6)?"cargo":"ferry":a.pick(["speed","speed","console","yacht","sail","speed"]),O=c.build(D,a),k=D==="cargo"?a.range(4,6):D==="ferry"?7:D==="sail"?a.range(2.5,4):D==="yacht"?a.range(5,9):a.range(9,16),B=new os(D==="cargo"?90:80,O.wakeWidth,D==="cargo"?70:D==="sail"?20:42,D==="sail"?.45:1.5);i.add(B.mesh),l.push(ea(O.group)),this.boats.push({id:l.length-1,route:A.pts,routeLen:U,s:a.range(0,U),dir:a.chance(.5)?1:-1,speed:k,len:O.len,draft:O.draft,wake:B,phase:a.range(0,100)})}}const h=[];for(const A of r){const U=c.build(a.chance(.4)?"sail":a.chance(.5)?"speed":a.chance(.5)?"console":"yacht",a),N=jt(A.len/U.len,.6,1.4);U.group.scale.setScalar(N),U.group.position.set(A.x,.05,A.z),U.group.rotation.y=A.rot+(a.chance(.5)?Math.PI:0),l.push(ea(U.group)),h.push({idx:l.length-1,m:U.group.matrixWorld.clone()})}this.boatCount=this.boats.length+r.length;const d=new Map;for(const A of t.roads)d.set(A.id,A.pts.map(([U,N])=>new P(U,t.heightAt(U,N)+.25,N)));for(const[A,U]of d){const N=t.roads.find(D=>D.id===A);this.carRoutes.push({pts:U,length:this.len3(U),lanes:N.lanes,width:N.width})}for(const A of n)this.carRoutes.push({pts:A.pts.map(U=>U.clone().add(new P(0,.25,0))),length:this.len3(A.pts),lanes:A.lanes,width:A.width});for(const A of e){if(A.cls!=="street"||a.next()>.35)continue;const U=[new P(A.a[0],t.heightAt(A.a[0],A.a[1])+.25,A.a[1]),new P(A.b[0],t.heightAt(A.b[0],A.b[1])+.25,A.b[1])];this.carRoutes.push({pts:U,length:this.len3(U),lanes:2,width:A.width})}const u=["#e8e8e8","#d0d0d0","#1c1c1e","#8a8f94","#b8352e","#2b4c8c","#d9a441","#3d6b3a","#f2f2f2","#6c6f73","#c94f3d","#20242a"];for(let A=0;A<this.carRoutes.length;A++){const U=this.carRoutes[A],N=t.roads.find(k=>k.pts.length===U.pts.length&&k.pts[0][0]===U.pts[0].x),D=N?N.traffic:U.lanes>=4?10:1.2,O=Math.min(120,Math.round(U.length/1e3*D));for(let k=0;k<O;k++){const B=a.chance(.5)?1:-1;this.cars.push({route:A,s:a.range(0,U.length),dir:B,lane:a.int(0,Math.max(0,Math.floor(U.lanes/2)-1)),speed:a.range(11,26)*(U.lanes>=4?1.2:.8),color:new Ot(a.pick(u))})}}this.carCount=this.cars.length;const f=Mx();this.carMat=Sx(),this.materials.push(this.carMat);const p=new Map,x=new Array(this.carRoutes.length).fill(0);for(const A of this.cars)x[A.route]++;const g=new Set,m=new P;for(let A=0;A<this.carRoutes.length;A++){if(!x[A])continue;const U=this.carRoutes[A].pts;g.clear();for(let N=0;N<U.length-1;N++){const D=U[N],O=U[N+1],k=Math.max(1,Math.ceil(D.distanceTo(O)/40));for(let B=0;B<=k;B++){m.lerpVectors(D,O,B/k);const G=nc(m.x,m.z,th);g.has(G)||(g.add(G),p.set(G,(p.get(G)??0)+x[A]))}}}const w=(A,U)=>{const N=new Ui(f,this.carMat,A);return N.instanceMatrix.setUsage(zc),N.setColorAt(0,this.cars[0]?.color??new Ot(16777215)),N.instanceColor.setUsage(zc),N.castShadow=!0,N.count=0,N.visible=!1,Cv(N,"mid"),U?N.boundingSphere=new Ce:N.frustumCulled=!1,this.group.add(N),{mesh:N,capacity:A,n:0,center:new P,r:0,box:new He}};for(const[A,U]of p){const N=w(U,!0);this.carCells.set(A,N),this.carChunks.push(N)}this.carOverflow=w(Math.max(1,this.cars.length),!1),this.carChunks.push(this.carOverflow);const y=new he({color:16054008,roughness:.35,metalness:.2}),v=new he({color:2781119,roughness:.4}),T=A=>{const U=new Pe,N=new pe(new ye(1.9,1.9,38,12),y);N.rotation.z=Math.PI/2,U.add(N);const D=new pe(new Kn(1.9,12,8),y);D.position.x=19,D.scale.set(1.6,1,1),U.add(D);const O=new pe(new Xt(6,.5,34),y);O.position.set(1,-.8,0),O.rotation.y=0,U.add(O);const k=new pe(new Xt(5,.4,16),y);k.position.set(-3,-.8,12),k.rotation.y=-.45,U.add(k);const B=k.clone();B.position.z=-12,B.rotation.y=.45,U.add(B);const G=new pe(new Xt(5,8,.4),v);G.position.set(-16,4.5,0),G.rotation.z=-.4,U.add(G);const K=new pe(new Xt(4,.3,12),y);K.position.set(-17,1,0),U.add(K);for(const nt of[-1,1]){const q=new pe(new ye(1.1,1,4.5,10),y);q.rotation.z=Math.PI/2,q.position.set(3,-2.4,nt*7),U.add(q)}return U.scale.setScalar(A),l.push(ea(U)),l.length-1},M=t.runways[0],E=(A,U)=>{const N=de(4e3,M.a[0],A),D=de(M.a[1]+30,M.a[1],A),O=de(900,12,Math.pow(A,.9));return U.set(N,O,D)};this.aircraft.push({id:T(1),path:E,period:240,offset:0,contrail:null}),this.aircraft.push({id:T(.9),path:E,period:240,offset:.5,contrail:null});const b=(A,U)=>{const N=de(M.b[0],-9e3,A),D=M.b[1]-3500*A*A;return U.set(N,12+2200*Math.pow(A,.8),D)};this.aircraft.push({id:T(1),path:b,period:200,offset:.2,contrail:null});const _=(A,U)=>U.set(de(-14e3,14e3,A),9500,de(-9e3,6e3,A)),S=new os(180,25,90,.6,Za);this.aircraft.push({id:T(1),path:_,period:260,offset:.4,contrail:S});let R=0;for(const A of l)R+=A.getAttribute("position").count;const F=du("traffic-movers-v1",!0);this.materials.push(F),this.movers=new Bg(l.length,R,R,F);const z=l.map(A=>{const U=this.movers.addInstance(this.movers.addGeometry(A));return A.dispose(),U});for(const A of this.boats)A.id=z[A.id];for(const A of this.aircraft)A.id=z[A.id];for(const A of h)this.movers.setMatrixAt(z[A.idx],A.m);this.movers.frustumCulled=!1,this.movers.castShadow=!0,this.movers.receiveShadow=!0,this.group.add(this.movers)}group=new Pe;materials=[];boats=[];carRoutes=[];cars=[];carChunks=[];carCells=new Map;carOverflow;carMat;movers;aircraft=[];tmp={x:0,z:0,dx:1,dz:0};tmpM=new $t;tmpQ=new Ae;tmpP=new P;tmpS=new P(1,1,1);tmpE=new be(0,0,0,"YXZ");up=new P(0,1,0);pos=new P;dir=new P;side=new P;ahead=new P;boatCount=0;carCount=0;len3(t){let e=0;for(let n=0;n<t.length-1;n++)e+=t[n].distanceTo(t[n+1]);return e}point3(t,e,n,i){let o=0;for(let r=0;r<t.length-1;r++){const a=t[r].distanceTo(t[r+1]);if(e<=o+a||r===t.length-2){const c=jt((e-o)/a,0,1);i.subVectors(t[r+1],t[r]).divideScalar(a),n.copy(t[r]).addScaledVector(i,a*c);return}o+=a}}get contrailMeshes(){return this.aircraft.filter(t=>t.contrail).map(t=>t.contrail.mesh)}update(t,e,n){const{tmpM:i,tmpQ:o,tmpP:r,tmpS:a,tmpE:c,movers:l}=this;a.set(1,1,1);for(const p of this.boats){const x=p.routeLen;p.s+=p.speed*t*p.dir,p.s>x-5&&(p.s=x-5,p.dir=-1),p.s<5&&(p.s=5,p.dir=1),yx(p.route,p.s,this.tmp);const g=Math.atan2(this.tmp.dx*p.dir,this.tmp.dz*p.dir);r.set(this.tmp.x,-p.draft*.15+.12*Math.sin(e*1.3+p.phase)*(p.len<20?1:.2),this.tmp.z),c.set(.02*Math.sin(e*1.7+p.phase),g-Math.PI/2,.03*Math.sin(e*1.1+p.phase)+(p.speed>8?-.03:0),"XYZ"),l.setMatrixAt(p.id,i.compose(r,o.setFromEuler(c),a)),p.wake.update(this.tmp.x-this.tmp.dx*p.dir*p.len*.4,this.tmp.z-this.tmp.dz*p.dir*p.len*.4,e,!0,p.speed)}const{pos:h,dir:d,side:u,up:f}=this;for(const p of this.carChunks)p.n=0,p.box.makeEmpty();for(let p=0;p<this.cars.length;p++){const x=this.cars[p],g=this.carRoutes[x.route];x.s+=x.speed*t*x.dir,x.s>g.length&&(x.s=0),x.s<0&&(x.s=g.length),this.point3(g.pts,x.s,h,d),x.dir<0&&d.negate(),u.crossVectors(d,f).normalize();const m=(g.lanes>=4?1.5+x.lane*3.2:1.8)+0;h.addScaledVector(u,m);const w=Math.atan2(d.x,d.z)-Math.PI/2,y=-Math.asin(jt(d.y,-1,1));this.tmpQ.setFromEuler(this.tmpE.set(0,w,y,"YXZ")),this.tmpP.copy(h),this.tmpM.compose(this.tmpP,this.tmpQ,this.tmpS);let v=this.carCells.get(nc(h.x,h.z,th));(!v||v.n>=v.capacity)&&(v=this.carOverflow);const T=v.n++;v.mesh.setMatrixAt(T,this.tmpM),v.mesh.setColorAt(T,x.color),v.box.expandByPoint(h)}for(const p of this.carChunks){const x=p.mesh;if(x.count=p.n,!p.n){x.visible=!1;continue}x.visible=!0,x.instanceMatrix.clearUpdateRanges(),x.instanceMatrix.addUpdateRange(0,p.n*16),x.instanceMatrix.needsUpdate=!0,x.instanceColor.clearUpdateRanges(),x.instanceColor.addUpdateRange(0,p.n*3),x.instanceColor.needsUpdate=!0,p.box.min.addScalar(-eh),p.box.max.addScalar(eh),x.boundingSphere&&(p.box.getBoundingSphere(x.boundingSphere),p.center.copy(x.boundingSphere.center),p.r=x.boundingSphere.radius)}this.carMat.emissiveIntensity=6*n;for(const p of this.aircraft){const x=(e/p.period+p.offset)%1,g=p.path(x,this.pos),m=p.path(Math.min(1,x+.002),this.ahead).sub(g).normalize(),w=Math.atan2(m.x,m.z)-Math.PI/2,y=Math.asin(jt(m.y,-1,1));c.set(0,w,y*.6,"YXZ"),l.setMatrixAt(p.id,i.compose(g,o.setFromEuler(c),a)),p.contrail&&(p.contrail.update(g.x,g.z,e,!0,250),p.contrail.mesh.position.y=g.y-2,p.contrail.mesh.updateMatrix())}}updateCulling(t){for(const e of this.carChunks){if(!e.n||e===this.carOverflow)continue;const n=t.boxInView(e.box),i=t.casterInView(e.center,e.r,2.5);e.mesh.visible=n||i,e.mesh.castShadow=i,e.mesh.layers.mask=uo("mid",n)}}}function Ys(s,t=!1){const e=s[0].index!==null,n=new Set(Object.keys(s[0].attributes)),i=new Set(Object.keys(s[0].morphAttributes)),o={},r={},a=s[0].morphTargetsRelative,c=new re;let l=0;for(let h=0;h<s.length;++h){const d=s[h];let u=0;if(e!==(d.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const f in d.attributes){if(!n.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have compatible attributes; make sure "'+f+'" attribute exists among all geometries, or in none of them.'),null;o[f]===void 0&&(o[f]=[]),o[f].push(d.attributes[f]),u++}if(u!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of attributes."),null;if(a!==d.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const f in d.morphAttributes){if(!i.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+".  .morphAttributes must be consistent throughout all geometries."),null;r[f]===void 0&&(r[f]=[]),r[f].push(d.morphAttributes[f])}if(t){let f;if(e)f=d.index.count;else if(d.attributes.position!==void 0)f=d.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". The geometry must have either an index or a position attribute"),null;c.addGroup(l,f,h),l+=f}}if(e){let h=0;const d=[];for(let u=0;u<s.length;++u){const f=s[u].index;for(let p=0;p<f.count;++p)d.push(f.getX(p)+h);h+=s[u].attributes.position.count}c.setIndex(d)}for(const h in o){const d=nh(o[h]);if(!d)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" attribute."),null;c.setAttribute(h,d)}for(const h in r){const d=r[h][0].length;if(d===0)break;c.morphAttributes=c.morphAttributes||{},c.morphAttributes[h]=[];for(let u=0;u<d;++u){const f=[];for(let x=0;x<r[h].length;++x)f.push(r[h][x][u]);const p=nh(f);if(!p)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" morphAttribute."),null;c.morphAttributes[h].push(p)}}return c}function nh(s){let t,e,n,i=-1,o=0;for(let l=0;l<s.length;++l){const h=s[l];if(t===void 0&&(t=h.array.constructor),t!==h.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(e===void 0&&(e=h.itemSize),e!==h.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=h.normalized),n!==h.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(i===-1&&(i=h.gpuType),i!==h.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;o+=h.count*e}const r=new t(o),a=new ge(r,e,n);let c=0;for(let l=0;l<s.length;++l){const h=s[l];if(h.isInterleavedBufferAttribute){const d=c/e;for(let u=0,f=h.count;u<f;u++)for(let p=0;p<e;p++){const x=h.getComponent(u,p);a.setComponent(u+d,p,x)}}else r.set(h.array,c);c+=h.count*e}return i!==void 0&&(a.gpuType=i),a}const ic=Math.PI*2;function ws(s,t,e=[0,0]){const n=s.n??2.2,i=s.nBot??n,o=t*ic-Math.PI/2,r=Math.cos(o),a=Math.sin(o),c=a<=0,l=c?n:i;return e[1]=Math.sign(r)*Math.pow(Math.abs(r),2/l)*s.w,e[0]=s.yc-Math.sign(a)*Math.pow(Math.abs(a),2/l)*(c?s.top:s.bot),e}function to(s,t){const e=s.n??2.2,n=s.nBot??e,i=t-s.yc;return i>=0?i>=s.top?null:(Math.PI/2-Math.asin(Math.pow(i/s.top,e/2)))/ic:-i>=s.bot?null:(Math.PI/2+Math.asin(Math.pow(-i/s.bot,n/2)))/ic}function fu(s,t){const e=to(s,t);return e===null?0:Math.abs(ws(s,e)[1])}function Ex(s,t=64){let e=0;const n=ws(s,0),i=[0,0];for(let o=1;o<=t;o++)ws(s,o/t,i),e+=Math.hypot(i[0]-n[0],i[1]-n[1]),n[0]=i[0],n[1]=i[1];return e}function Tx(s,t,e,n){const i=(a,c)=>a+(c-a)*e,o=s.n??2.2,r=t.n??2.2;return{x:n,yc:i(s.yc,t.yc),w:i(s.w,t.w),top:i(s.top,t.top),bot:i(s.bot,t.bot),n:i(o,r),nBot:i(s.nBot??o,t.nBot??r)}}function rs(s,t){const e=s.length;for(let r=0;r<e-1;r++){const a=s[r],c=s[r+1],l=Math.min(a.x,c.x),h=Math.max(a.x,c.x);if(t>=l-1e-9&&t<=h+1e-9)return Tx(a,c,h===l?0:(t-a.x)/(c.x-a.x),t)}const n=s[0],i=s[e-1];return{...Math.abs(t-n.x)<Math.abs(t-i.x)?n:i,x:t}}function Ax(s,t){const e=s.slice(),n=s[0].x>s[s.length-1].x;for(const i of t)e.some(o=>Math.abs(o.x-i)<1e-6)||e.push(rs(s,i));return e.sort((i,o)=>n?o.x-i.x:i.x-o.x),e}function ih(s,t){return s.map(e=>({...e,w:Math.max(e.w-t,.01),top:Math.max(e.top-t,.01),bot:Math.max(e.bot-t,.01)}))}function Cx(s){const t=[];for(let e=0;e<=s;e++)t.push(e/s);return t}function sh(s,t,e,n,i){const r=[0],a=ws(s,t),c=[0,0];for(let d=1;d<=24;d++)ws(s,t+(e-t)*(d/24),c),r.push(r[d-1]+Math.hypot(c[0]-a[0],c[1]-a[1])),a[0]=c[0],a[1]=c[1];const l=r[24]||1e-9;let h=1;for(let d=1;d<n;d++){const u=l*(d/n);for(;h<24&&r[h]<u;)h++;const f=(u-r[h-1])/Math.max(r[h]-r[h-1],1e-9);i.push(t+(e-t)*((h-1+f)/24))}i.push(e)}function Rx(s,t){return e=>{const n=[];let i=0;const o=[0];for(const r of s){const a=typeof r.y=="function"?r.y(e):r.y;let c=e.yc+e.top*.97>a&&e.yc-e.bot*.97<a?to(e,a):r.fallbackT;c=Math.max(c,i+5e-4),sh(e,i,c,r.segs,o),i=c}sh(e,i,.5,t,o);for(const r of o)n.push(r);for(let r=o.length-2;r>=0;r--)n.push(1-o[r]);return n}}function Mc(s,t,e,n,i,o){const r=t*(n+1)+e,a=r+n+1;i!==o?s.push(r,r+1,a,r+1,a+1,a):s.push(r,a,r+1,r+1,a,a+1)}function sc(s,t){const e=s.length,n=s.map((x,g)=>t(x,g)),i=n[0].length-1;let o=0;const r=[0];for(let x=1;x<e;x++)o+=Math.abs(s[x].x-s[x-1].x),r.push(o);const a=r.map(x=>x/Math.max(o,1e-6)),c=new Float32Array(e*(i+1)*3),l=new Float32Array(e*(i+1)*2),h=[0,0];for(let x=0;x<e;x++)for(let g=0;g<=i;g++){ws(s[x],n[x][g],h);const m=x*(i+1)+g;c[m*3]=s[x].x,c[m*3+1]=h[0],c[m*3+2]=h[1],l[m*2]=a[x],l[m*2+1]=n[x][g]}const d=s[e-1].x>=s[0].x,u=new re;u.setAttribute("position",new ge(c,3));const f=[];for(let x=0;x<e-1;x++)for(let g=0;g<i;g++)Mc(f,x,g,i,d,!1);u.setIndex(f),u.computeVertexNormals();const p=u.getAttribute("normal").array;for(let x=0;x<e;x++){const g=x*(i+1),m=g+i;let w=p[g*3]+p[m*3],y=p[g*3+1]+p[m*3+1],v=p[g*3+2]+p[m*3+2];const T=Math.hypot(w,y,v)||1;w/=T,y/=T,v/=T,p[g*3]=w,p[g*3+1]=y,p[g*3+2]=v,p[m*3]=w,p[m*3+1]=y,p[m*3+2]=v}return{sections:s,R:i,t:n,u:a,pos:c,uv:l,normal:p,forwardX:d}}function $s(s,t={}){const e=s.sections.length,n=s.R,i=t.i0??0,o=t.i1??e-1,r=!!t.flip,a=Array.from(s.pos),c=Array.from(s.uv),l=Array.from(s.normal);if(r)for(let f=0;f<l.length;f++)l[f]=-l[f];const h=[];for(let f=i;f<o;f++)for(let p=0;p<n;p++)(!t.quad||t.quad(f,p))&&Mc(h,f,p,n,s.forwardX,r);const d=(f,p)=>{const x=s.sections[f],g=s.sections[p?Math.min(f+1,e-1):Math.max(f-1,0)];let m=Math.sign(x.x-g.x)||(p?-1:1);r&&(m=-m);const w=a.length/3;a.push(x.x,x.yc,0),l.push(m,0,0),c.push(s.u[f],.5);for(let y=0;y<=n;y++){const v=f*(n+1)+y;a.push(s.pos[v*3],s.pos[v*3+1],s.pos[v*3+2]),l.push(m,0,0),c.push(s.uv[v*2],s.uv[v*2+1])}for(let y=0;y<n;y++)m>0?h.push(w,w+1+y,w+2+y):h.push(w,w+2+y,w+1+y)};t.capStart&&d(i,!0),t.capEnd&&d(o,!1);const u=new re;return u.setAttribute("position",new At(a,3)),u.setAttribute("normal",new At(l,3)),u.setAttribute("uv",new At(c,2)),u.setIndex(h),u}function Px(s,t,e,n){return e<s.i0||e>=s.i1?!1:n>=s.j0&&n<s.j1||n+t>=s.j0&&n+t<s.j1}function Lx(s,t,e){const n=s.R,{i0:i,i1:o,j0:r,j1:a}=e,c=T=>T>n?T-n:T,l=[];for(let T=r;T<a;T++)l.push([i,c(T)]);for(let T=i;T<o;T++)l.push([T,c(a)]);for(let T=a;T>r;T--)l.push([o,c(T)]);for(let T=o;T>i;T--)l.push([T,c(r)]);const h=(T,M,E)=>{const b=(M*(n+1)+E)*3;return new P(T.pos[b],T.pos[b+1],T.pos[b+2])},d=new P;for(const[T,M]of l)d.add(h(s,T,M));d.multiplyScalar(1/l.length);const u=[],f=[],p=[],x=(T,M,E,b)=>{for(const _ of[T,M,E])u.push(_.x,_.y,_.z),f.push(b.x,b.y,b.z),p.push(0,0)},g=new P,m=new P,w=new P,y=new P;for(let T=0;T<l.length;T++){const[M,E]=l[T],[b,_]=l[(T+1)%l.length],S=h(s,M,E),R=h(s,b,_),F=h(t,M,E),z=h(t,b,_);g.subVectors(R,S),m.subVectors(F,S),w.crossVectors(g,m).normalize(),y.addVectors(S,R).multiplyScalar(.5).sub(d).negate(),w.dot(y)>=0?(x(S,R,F,w),x(R,z,F,w)):(w.negate(),x(S,F,R,w),x(R,F,z,w))}const v=new re;return v.setAttribute("position",new At(u,3)),v.setAttribute("normal",new At(f,3)),v.setAttribute("uv",new At(p,2)),v}function oh(s,t,e,n,i,o=8){const r=Math.min(e,n),a=Math.max(e,n),c=[],l=[],h=[],d=f=>Math.max(fu(rs(s,f),t)-i,.02);for(let f=0;f<o;f++){const p=r+(a-r)*(f/o),x=r+(a-r)*((f+1)/o),g=d(p),m=d(x),w=[[p,-g],[x,m],[x,-m],[p,-g],[p,g],[x,m]];for(const[y,v]of w)c.push(y,t,v),l.push(0,1,0),h.push((y-r)/(a-r),v*.5+.5)}const u=new re;return u.setAttribute("position",new At(c,3)),u.setAttribute("normal",new At(l,3)),u.setAttribute("uv",new At(h,2)),u}function Dx(s,t,e,n=16,i=6){const o=s.length,r=n/2,a=n+i,c=[];for(let w=0;w<=r;w++)c.push(w/r);for(let w=1;w<=i;w++)c.push(1-2*(w/i));for(let w=1;w<=r;w++)c.push(-1+w/r);const l=w=>w<=r||w>=r+i,h=[],d=[],u=[];let f=0;for(let w=1;w<o;w++)f+=Math.abs(s[w].x-s[w-1].x);let p=0;for(let w=0;w<o;w++){const y=s[w];w>0&&(p+=Math.abs(y.x-s[w-1].x));for(let v=0;v<=a;v++){const T=c[v]*y.w;h.push(y.x,l(v)?t(y.x,T):e(y.x,T),T),d.push(p/Math.max(f,1e-6),v/a)}}for(let w=0;w<o-1;w++)for(let y=0;y<a;y++)Mc(u,w,y,a,!1,!1);const x=(w,y)=>{const v=h.length/3;let T=0;for(let M=0;M<a;M++)T+=h[(w*(a+1)+M)*3+1];h.push(s[w].x,T/a,0),d.push(w===0?0:1,.5);for(let M=0;M<=a;M++){const E=w*(a+1)+M;h.push(h[E*3],h[E*3+1],h[E*3+2]),d.push(d[E*2],d[E*2+1])}for(let M=0;M<a;M++)y>0?u.push(v,v+1+M,v+2+M):u.push(v,v+2+M,v+1+M)};x(0,1),x(o-1,-1);const g=new re;g.setAttribute("position",new At(h,3)),g.setAttribute("uv",new At(d,2)),g.setIndex(u),g.computeVertexNormals();const m=g.getAttribute("normal");for(let w=0;w<o;w++){const y=w*(a+1),v=y+a,T=new P(m.getX(y)+m.getX(v),m.getY(y)+m.getY(v),m.getZ(y)+m.getZ(v)).normalize();m.setXYZ(y,T.x,T.y,T.z),m.setXYZ(v,T.x,T.y,T.z)}return g}function Ix(s,t=28,e=!0){const n=sc(s,()=>Cx(t));return $s(n,{capStart:e,capEnd:e})}function sr(s,t){return 5*t*(.2969*Math.sqrt(s)-.126*s-.3516*s*s+.2843*s**3-.1036*s**4)}function eo(s,t){return t*Math.sin(Math.PI*s)}function zi(s,t){return s.rootChord+(s.tipChord-s.rootChord)*(t/s.span)}function ys(s,t){return .3*zi(s,t)+s.sweep*(t/s.span)}function na(s,t){return ys(s,t)-zi(s,t)}function rh(s,t,e){const n=zi(s,e),i=Di.clamp((ys(s,e)-t)/n,0,1);return Math.tan(s.dihedral)*e+(eo(i,s.camber)-sr(i,s.thickness))*n}function zx(s,t,e){const n=zi(s,e),i=Di.clamp((ys(s,e)-t)/n,0,1);return Math.tan(s.dihedral)*e+(eo(i,s.camber)+sr(i,s.thickness))*n}function ah(s,t,e,n,i){const o=h=>({x:h,y:eo(h,n)+sr(h,e),u:.5-.5*h}),r=h=>({x:h,y:eo(h,n)-sr(h,e),u:.5+.5*h}),a=[];if(s==="rear"){const h={x:1,y:eo(1,n),u:0};a.push(h);for(let d=1;d<i;d++)a.push(o(t+(1-t)*(1-d/i)));a.push(o(t),{...o(t),flat:!0}),a.push({...r(t),flat:!0},r(t));for(let d=1;d<i;d++)a.push(r(t+(1-t)*(d/i)));return a.push({...h,u:1}),a}const c=s==="front"?t:1,l=h=>c*Math.pow(1-h/i,2);a.push(o(c)),s==="front"&&a.push(o(c));for(let h=1;h<=i;h++)a.push(o(l(h)));for(let h=i-1;h>=1;h--)a.push(r(l(h)));return a.push(r(c)),s==="front"&&a.push({...r(c),flat:!0}),a.push({...o(c),u:s==="front"?.5-.5*c:1,flat:s==="front"}),a}const ia=.22;function cn(s,t){const e=s.camber??.02,n=t.n??12,i=[],o=[],r=[],a=[],c=[];for(let p=0;p<=t.segments;p++)c.push({z:t.z0+(t.z1-t.z0)*(p/t.segments),scale:1});if(t.tipRound&&t.tipRound>0)for(let x=1;x<=6;x++){const g=x/6*Math.PI/2;c.push({z:t.z1+t.tipRound*Math.sin(g),scale:Math.max(Math.cos(g),.02)})}const l=p=>{const x=zi(s,p),g=ys(s,p);return t.hingeX!==void 0?(g-t.hingeX)/x:.75};let h=0;const d=(p,x,g,m,w)=>{const y=zi(s,g),v=ys(s,g),T=s.twist*(g/s.span),M=.5+(p.x-.5)*m,E=p.y*m,b=(M-.3)*y,_=E*y,S=Math.cos(T),R=Math.sin(T),F=b*S+_*R,z=-b*R+_*S;w.push(-F+(v-.3*y),Math.tan(s.dihedral)*x+z,x)};for(const p of c){const x=Math.min(p.z,t.z1),g=zi(s,x),m=l(x),w=ah(t.part,t.part==="rear"?m+(t.gap??.015)/g:m,s.thickness,e,n);h=w.length;for(const y of w){d(y,p.z,x,p.scale,i);const v=Math.min(1,p.z/s.span);y.flat?(o.push(.02,v),a.push(ia,ia,ia)):(o.push(y.u,v),a.push(1,1,1))}}for(let p=0;p<c.length-1;p++)for(let x=0;x<h-1;x++){const g=p*h+x,m=g+h;r.push(g,m,g+1,g+1,m,m+1)}const u=(p,x,g)=>{const m=l(p),w=ah(x,m,s.thickness,e,n),y=i.length/3,v=[];for(const b of w)d(b,p,p,1,v);let T=0,M=0;const E=w.length-1;for(let b=0;b<E;b++)T+=v[b*3],M+=v[b*3+1];i.push(T/E,M/E,p),o.push(.5,Math.min(1,p/s.span)),a.push(1,1,1);for(let b=0;b<E;b++)i.push(v[b*3],v[b*3+1],v[b*3+2]),o.push(w[b].u,Math.min(1,p/s.span)),a.push(1,1,1);for(let b=0;b<E;b++){const _=y+1+b,S=y+1+(b+1)%E;g?r.push(y,S,_):r.push(y,_,S)}};t.capStart&&u(t.z0,t.capStart,!1),t.capEnd&&u(t.z1,t.capEnd,!0);const f=new re;return f.setAttribute("position",new At(i,3)),f.setAttribute("uv",new At(o,2)),f.setAttribute("color",new At(a,3)),f.setIndex(r),f.computeVertexNormals(),f}function Ux(s,t,e){const o=[],r=[],a=[];for(let l=0;l<=10;l++){const h=l/10,d=h*s,u=t+(e-t)*Math.pow(h,1.4),f=u*(.16-.08*h),p=.95-.7*h,x=Math.cos(p),g=Math.sin(p);for(let m=0;m<8;m++){const w=m/8*Math.PI*2,y=-.5*Math.cos(w),v=Math.sin(w)>=0,T=.08*u*(1-4*y*y),M=.5*f*Math.sqrt(Math.max(0,1-4*y*y))*Math.abs(Math.sin(w)),E=y*u,b=T+(v?M:-M);o.push(E*x-b*g,d,E*g+b*x),a.push(m/8,h)}}for(let l=0;l<10;l++)for(let h=0;h<8;h++){const d=(h+1)%8,u=l*8+h,f=u+8,p=l*8+d,x=p+8;r.push(u,f,p,p,f,x)}const c=new re;return c.setAttribute("position",new At(o,3)),c.setAttribute("uv",new At(a,2)),c.setIndex(r),c.computeVertexNormals(),c}function pu(s,t){const e=new Ae().setFromUnitVectors(new P(0,1,0),t.clone().sub(s).normalize());return new $t().compose(s.clone().add(t).multiplyScalar(.5),e,new P(1,1,1))}function sa(s,t,e,n=8){const i=new ye(e,e,s.distanceTo(t),n);return i.applyMatrix4(pu(s,t)),i}function ts(s,t,e,n){const i=new ye(.5,.5,s.distanceTo(t),10);return i.scale(e,1,n),i.applyMatrix4(pu(s,t)),i}function Nx(s,t,e){const n=s instanceof P?s:new P(...s??[0,0,0]),i=t instanceof be?t:new be(...t??[0,0,0]),o=typeof e=="number"?new P(e,e,e):e instanceof P?e:new P(...e??[1,1,1]);return new $t().compose(n,new Ae().setFromEuler(i),o)}function Fx(s){const t=s.clone();if(t.index)return t;const e=t.getAttribute("position").count,n=new Uint32Array(e);for(let i=0;i<e;i++)n[i]=i;return t.setIndex(new ge(n,1)),t}function Ox(s,t){const e=Fx(s);if(!t)return e;if(e.applyMatrix4(t),t.determinant()<0){const n=e.index;for(let i=0;i<n.count;i+=3){const o=n.getX(i+1),r=n.getX(i+2);n.setX(i+1,r),n.setX(i+2,o)}}return e}function kx(s,t){const e=s.getAttribute("position"),n=e.count,i=new Float32Array(n*3),o=new Float32Array(n*2),r=new Ot;let a=null;for(let c=0;c<n;c++){const l=typeof t=="function"?t(e.getX(c),e.getY(c),e.getZ(c)):t;l!==a&&(r.set(l.color),a=l),i[c*3]=r.r,i[c*3+1]=r.g,i[c*3+2]=r.b,o[c*2]=l.roughness,o[c*2+1]=l.metalness}return s.setAttribute("color",new ge(i,3)),s.setAttribute("aSurf",new ge(o,2)),s}function Bx(){const s=new he({color:16777215,roughness:1,metalness:1,vertexColors:!0});return s.onBeforeCompile=t=>{t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aSurf;
varying vec2 vSurf;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vSurf = aSurf;`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
varying vec2 vSurf;`).replace("#include <roughnessmap_fragment>","float roughnessFactor = roughness * vSurf.x;").replace("#include <metalnessmap_fragment>","float metalnessFactor = metalness * vSurf.y;")},s.customProgramCacheKey=()=>"plane-parts-v1",s}class en{constructor(t){this.defaultSurf=t}parts=[];add(t,e,n=this.defaultSurf){const i=Ox(t,e);return n&&kx(i,n),this.parts.push(i),this}get size(){return this.parts.length}build(){if(this.parts.length===1)return this.parts[0];const t=Ys(this.parts,!1);if(!t)throw new Error("Batch: parts have incompatible attributes");return t}}function hn(s,t){const e=document.createElement("canvas");return e.width=s,e.height=t,[e,e.getContext("2d")]}function Mn(s,t,e=8){const n=new lo(s);return n.flipY=!1,n.colorSpace=t?on:zn,n.wrapS=ps,n.wrapT=ps,n.anisotropy=e,n}function Sc(s,t=2){const e=s.width,n=s.height,i=s.getContext("2d").getImageData(0,0,e,n).data,[o,r]=hn(e,n),a=r.createImageData(e,n),c=(l,h)=>i[((h+n)%n*e+(l+e)%e)*4]/255;for(let l=0;l<n;l++)for(let h=0;h<e;h++){const d=(c(h+1,l)-c(h-1,l))*t,u=(c(h,l+1)-c(h,l-1))*t,f=Math.hypot(d,u,1),p=(l*e+h)*4;a.data[p]=Math.round((-d/f*.5+.5)*255),a.data[p+1]=Math.round((-u/f*.5+.5)*255),a.data[p+2]=Math.round((1/f*.5+.5)*255),a.data[p+3]=255}return r.putImageData(a,0,0),o}function Ms(s,t,e,n,i,o,r="40,35,30"){for(let a=0;a<i;a++){const c=t.range(0,e),l=t.range(0,n),h=t.range(8,60),d=s.createRadialGradient(c,l,0,c,l,h);d.addColorStop(0,`rgba(${r},${o*t.range(.4,1)})`),d.addColorStop(1,`rgba(${r},0)`),s.fillStyle=d,s.fillRect(c-h,l-h,h*2,h*2)}}function bc(s,t,e,n,i,o,r){s.strokeStyle="#5a5a5a",s.lineWidth=2.2,t.strokeStyle="rgba(30,30,35,0.22)",t.lineWidth=1.5;for(const a of i){const c=a*e;s.beginPath(),s.moveTo(c,0),s.lineTo(c,n),s.stroke(),t.save(),t.strokeStyle="rgba(40,38,34,0.07)",t.lineWidth=9,t.beginPath(),t.moveTo(c,0),t.lineTo(c,n),t.stroke(),t.restore(),t.beginPath(),t.moveTo(c,0),t.lineTo(c,n),t.stroke();for(const l of[-7,7])for(let h=r/2;h<n;h+=r)s.fillStyle="#b8b8b8",s.beginPath(),s.arc(c+l,h,1.6,0,Math.PI*2),s.fill(),t.fillStyle="rgba(255,255,255,0.10)",t.beginPath(),t.arc(c+l,h,1.4,0,Math.PI*2),t.fill(),t.fillStyle="rgba(0,0,0,0.10)",t.beginPath(),t.arc(c+l,h+1.2,1.2,0,Math.PI*2),t.fill()}for(const a of o){const c=a*n;s.strokeStyle="#6a6a6a",s.lineWidth=1.4,s.beginPath(),s.moveTo(0,c),s.lineTo(e,c),s.stroke(),t.strokeStyle="rgba(30,30,35,0.12)",t.beginPath(),t.moveTo(0,c),t.lineTo(e,c),t.stroke();for(let l=r/2;l<e;l+=r)s.fillStyle="#b0b0b0",s.beginPath(),s.arc(l,c+5,1.5,0,Math.PI*2),s.fill(),t.fillStyle="rgba(0,0,0,0.08)",t.beginPath(),t.arc(l,c+6,1.2,0,Math.PI*2),t.fill()}}const Ze={upper:"#f3f1ea",under:"#e3d9c2",lower:"#f5cc5a",cheat:"#1c2d5a",pin:"#d8322e",registration:"N726BV"},hs={top:.03,bottom:.1,pin:.125};function ch(s,t,e,n,i,o,r,a,c,l,h){const d=e/t.length,u=n/t.perimeter(o),f=t.vOf(o,r)??.25,p=a/.72*d;for(const x of[1,-1])s.save(),s.translate(t.uOf(o)*e,(x>0?f:1-f)*n),s.scale(x>0?-1:1,x*(u/d)),s.fillStyle=h,s.font=`${c} ${p.toFixed(1)}px ${l}`,s.textAlign="center",s.textBaseline="middle",s.fillText(i,0,0),s.restore()}function Hx(s){const n=new We("fuselage-paint"),[i,o]=hn(2048,1024),[r,a]=hn(2048,1024),[c,l]=hn(2048,1024);a.fillStyle="#808080",a.fillRect(0,0,2048,1024),o.fillStyle=Ze.upper,o.fillRect(0,0,2048,1024);const h=[],d=(b,_)=>s.vOf(b,_)??.5;for(let b=0;b<=2048;b+=8){const _=s.xOf(b/2048),S=s.sillY(_);h.push({px:b,cheatTop:d(_,S-hs.top),cheatBot:d(_,S-hs.bottom),pinBot:d(_,S-hs.pin)})}const u=(b,_,S,R)=>{const F=z=>(R>0?z:1-z)*1024;o.beginPath(),o.moveTo(h[0].px,F(b(h[0])));for(const z of h)o.lineTo(z.px,F(b(z)));for(let z=h.length-1;z>=0;z--)o.lineTo(h[z].px,F(_(h[z])));o.closePath(),o.fillStyle=S,o.fill()};u(b=>b.pinBot,b=>1-b.pinBot,Ze.lower,1);for(const b of[1,-1])u(_=>_.cheatTop,_=>_.cheatBot,Ze.cheat,b),u(_=>_.cheatBot,_=>_.pinBot,Ze.pin,b);const f=[];for(let b=2.32;b<=3.7;b+=.1)f.push([s.uOf(b)*2048,s.topV(b,b>3.4?.45-(b-3.4)*.9:.45)*1024]);o.fillStyle="#2a2d31";for(const b of[1,-1]){const _=b>0?0:1024;o.beginPath(),o.moveTo(f[0][0],_);for(const[S,R]of f)o.lineTo(S,b>0?R:1024-R);o.lineTo(f[f.length-1][0],_),o.closePath(),o.fill()}const p=s.uOf(4.22)*2048;o.fillStyle="#2e3136",o.fillRect(0,0,p,1024),o.fillStyle="#9aa0a6",o.fillRect(p-6,0,6,1024),o.fillStyle="#1b1d20";for(let b=0;b<12;b++)o.fillRect(p*.45,b/12*1024+6,p*.15,1024/12-12);ch(o,s,2048,1024,Ze.registration,-3.05,.47,.18,"bold",'"Helvetica Neue", Arial, sans-serif',Ze.cheat),ch(o,s,2048,1024,"BAHÍA VISTA AIR TAXI",-.25,.1,.085,"bold italic",'Georgia, "Times New Roman", serif',Ze.cheat);const x=[3.9,3.2,2.32,1.85,0,-.9,-1.6,-2.6,-3.7,-4.7].map(b=>s.uOf(b));bc(a,o,2048,1024,x,[.12,.2,.3,.42,.5,.58,.7,.8,.88],26),a.strokeStyle="#3a3a3a",a.lineWidth=3,o.strokeStyle="rgba(20,20,25,0.35)",o.lineWidth=2;const g=s.uOf(1.77)*2048,m=s.uOf(.95)*2048;for(const b of[1,-1]){const _=s.vOf(1.3,.4)??.2,S=s.vOf(1.3,-.42)??.4,R=(b>0?_:1-_)*1024,F=(b>0?S:1-S)*1024,z=Math.min(R,F),A=Math.abs(F-R);a.strokeRect(g,z,m-g,A),o.strokeRect(g,z,m-g,A);const U=s.vOf(1,.05)??.25;o.fillStyle="#8a8f94",o.fillRect(m-40,(b>0?U:1-U)*1024-4,22,8)}const w=s.uOf(2.75),y=d(2.75,-.5),v=s.uOf(-.9),T=(b,_,S)=>{const R=b.createLinearGradient(w*2048,0,v*2048,0);R.addColorStop(0,`rgba(${_},${S})`),R.addColorStop(.3,`rgba(${_},${S*.5})`),R.addColorStop(1,`rgba(${_},0)`),b.fillStyle=R,b.beginPath(),b.moveTo(w*2048,(y-.018)*1024),b.lineTo(v*2048,(y-.05)*1024),b.lineTo(v*2048,(y+.05)*1024),b.lineTo(w*2048,(y+.018)*1024),b.closePath(),b.fill()};T(o,"25,22,20",.5);for(let b=0;b<16;b++){const _=s.uOf(n.range(3,4))*2048,S=(.5+n.range(-.06,.06))*1024,R=n.range(40,150),F=o.createLinearGradient(_,0,_+R,0);F.addColorStop(0,`rgba(35,30,22,${n.range(.14,.32)})`),F.addColorStop(1,"rgba(35,30,22,0)"),o.fillStyle=F,o.fillRect(_,S-n.range(1,2),R,n.range(2,4))}Ms(o,n,2048,1024,140,.08);for(let b=0;b<60;b++){const _=n.range(204.8,1843.2),S=n.range(1024*.42,1024*.58);o.strokeStyle=`rgba(40,35,30,${n.range(.05,.2)})`,o.lineWidth=n.range(1,3),o.beginPath(),o.moveTo(_,S),o.lineTo(_+n.range(30,160),S+n.range(-3,3)),o.stroke()}o.fillStyle="rgba(255,255,255,0.05)",o.fillRect(0,0,2048,1024*.12),o.fillRect(0,1024*.88,2048,1024*.12),l.fillStyle="#5a5a5a",l.fillRect(0,0,2048,1024),l.fillStyle="#7a7a7a",l.fillRect(0,0,p,1024),T(l,"170,170,170",.7),Ms(l,n,2048,1024,160,.25,"150,150,150");for(let b=0;b<400;b++){l.strokeStyle=`rgba(120,120,120,${n.range(.2,.5)})`,l.lineWidth=1;const _=n.range(0,2048),S=n.range(0,1024);l.beginPath(),l.moveTo(_,S),l.lineTo(_+n.range(-40,40),S+n.range(-6,6)),l.stroke()}const[M,E]=hn(2048/4,1024/4);E.scale(.25,.25),E.fillStyle="rgb(0,34,0)",E.fillRect(0,0,2048,1024),E.fillStyle="rgb(0,16,0)",E.fillRect(0,0,s.uOf(3.15)*2048,1024),E.fillStyle="rgb(0,120,0)";for(const b of[1,-1]){const _=b>0?0:1024;E.beginPath(),E.moveTo(f[0][0],_);for(const[S,R]of f)E.lineTo(S,b>0?R:1024-R);E.lineTo(f[f.length-1][0],_),E.closePath(),E.fill()}return T(E,"0,110,0",.8),{map:Mn(i,!0),roughnessMap:Mn(c,!1),normalMap:Mn(Sc(r,2.4),!1),clearcoatRoughnessMap:Mn(M,!1)}}function Gx(){const e=new We("wing-paint"),[n,i]=hn(1024,1024),[o,r]=hn(1024,1024),[a,c]=hn(1024,1024);r.fillStyle="#808080",r.fillRect(0,0,1024,1024),i.fillStyle=Ze.upper,i.fillRect(0,0,1024,1024),i.fillStyle=Ze.under,i.fillRect(1024*.5,0,1024*.5,1024),i.fillStyle=Ze.lower,i.fillRect(0,1024*.905,1024,1024*.095),i.fillStyle=Ze.cheat,i.fillRect(0,1024*.885,1024,1024*.02),i.fillStyle=Ze.pin,i.fillRect(0,1024*.876,1024,1024*.009),i.fillStyle=Ze.lower,i.fillRect(1024*.475,0,1024*.0325,1024);const l=[];for(let h=.04;h<.87;h+=.075)l.push(h);bc(r,i,1024,1024,[.14,.33,.5,.67,.86],l,22),i.fillStyle="#2a2d31",i.fillRect(1024*.3,1024*.12,1024*.11,1024*.08),i.fillStyle="#6d7277",i.beginPath(),i.arc(1024*.4,1024*.27,9,0,7),i.fill();for(let h=0;h<90;h++)i.fillStyle=`rgba(90,90,95,${e.range(.3,.7)})`,i.fillRect(1024*.5+e.range(-8,8),e.range(0,1024),e.range(1,3),e.range(1,4));return Ms(i,e,1024,1024,80,.06),c.fillStyle="#5a5a5a",c.fillRect(0,0,1024,1024),c.fillStyle="#909090",c.fillRect(1024*.3,1024*.12,1024*.11,1024*.08),Ms(c,e,1024,1024,90,.2,"150,150,150"),{map:Mn(n,!0),roughnessMap:Mn(a,!1),normalMap:Mn(Sc(o,2),!1)}}function Vx(){const e=new We("float-paint"),[n,i]=hn(1024,512),[o,r]=hn(1024,512),[a,c]=hn(1024,512);r.fillStyle="#808080",r.fillRect(0,0,1024,512),i.fillStyle="#cfd3d6",i.fillRect(0,0,1024,512),i.fillStyle="#2b2e31",i.fillRect(0,0,1024,512*.09),i.fillRect(0,512*.91,1024,512*.09),i.fillStyle=Ze.cheat,i.fillRect(0,512*.3,1024,512*.03),i.fillRect(0,512*.67,1024,512*.03),i.fillStyle=Ze.lower,i.fillRect(0,512*.42,1024,512*.16),bc(r,i,1024,512,[.12,.25,.38,.5,.55,.68,.82,.93],[.09,.3,.5,.7,.91],20);for(let l=0;l<120;l++){i.strokeStyle=`rgba(70,85,75,${e.range(.08,.28)})`,i.lineWidth=e.range(1,4);const h=e.range(0,1024),d=e.range(512*.28,512*.72);i.beginPath(),i.moveTo(h,d),i.lineTo(h+e.range(-10,10),d+e.range(10,60)*(d<512/2?1:-1)),i.stroke()}return Ms(i,e,1024,512,100,.1,"60,60,55"),c.fillStyle="#6a6a6a",c.fillRect(0,0,1024,512),c.fillStyle="#c0c0c0",c.fillRect(0,0,1024,512*.09),c.fillRect(0,512*.91,1024,512*.09),Ms(c,e,1024,512,100,.25,"160,160,160"),{map:Mn(n,!0),roughnessMap:Mn(a,!1),normalMap:Mn(Sc(o,2.2),!1)}}function Wx(){const e=new We("panel-brush"),[n,i]=hn(1024,384);i.fillStyle="#1c1e21",i.fillRect(0,0,1024,384);for(let h=0;h<1400;h++){i.strokeStyle=`rgba(255,255,255,${e.next()*.03})`,i.beginPath();const d=e.next()*384;i.moveTo(0,d),i.lineTo(1024,d+e.next()*2),i.stroke()}const o=(h,d,u,f,p,x="#e8e8e8")=>{i.fillStyle="#0b0c0e",i.beginPath(),i.arc(h,d,u,0,Math.PI*2),i.fill(),i.strokeStyle="#3d4146",i.lineWidth=4,i.stroke(),i.strokeStyle=x,i.lineWidth=2;for(let m=0;m<12;m++){const w=-Math.PI*.75+m/11*Math.PI*1.5;i.beginPath(),i.moveTo(h+Math.cos(w)*u*.78,d+Math.sin(w)*u*.78),i.lineTo(h+Math.cos(w)*u*.9,d+Math.sin(w)*u*.9),i.stroke()}i.fillStyle="#d8d8d8",i.font=`${Math.round(u*.26)}px Arial`,i.textAlign="center",i.fillText(f,h,d+u*.5);const g=-Math.PI*.75+p*Math.PI*1.5;i.strokeStyle="#ffffff",i.lineWidth=3,i.beginPath(),i.moveTo(h,d),i.lineTo(h+Math.cos(g)*u*.75,d+Math.sin(g)*u*.75),i.stroke(),i.fillStyle="#c9a227",i.beginPath(),i.arc(h,d,u*.08,0,7),i.fill()};o(110,100,62,"KIAS",.42),o(250,100,62,"ATT",.5,"#4aa3df"),o(390,100,62,"ALT",.3),o(110,250,62,"TURN",.5),o(250,250,62,"HDG",.6),o(390,250,62,"VSI",.5),i.fillStyle="#2f79c2",i.beginPath(),i.arc(250,100,50,Math.PI,0),i.fill(),i.fillStyle="#7a4b23",i.beginPath(),i.arc(250,100,50,0,Math.PI),i.fill(),i.fillStyle="#f5d142",i.fillRect(220,98,60,4),i.fillStyle="#06131c",i.fillRect(500,60,240,170),i.strokeStyle="#3a4a55",i.lineWidth=6,i.strokeRect(500,60,240,170),i.fillStyle="#1d6fa5",i.fillRect(506,66,228,158),i.fillStyle="#7bb661",i.beginPath(),i.ellipse(620,150,60,30,.3,0,7),i.fill(),i.fillStyle="#e6c47a",i.beginPath(),i.ellipse(560,120,26,16,-.2,0,7),i.fill(),i.strokeStyle="#ff77aa",i.lineWidth=3,i.beginPath(),i.moveTo(520,210),i.lineTo(600,150),i.lineTo(700,90),i.stroke(),i.fillStyle="#ffffff",i.font="bold 16px monospace",i.textAlign="left",i.fillText("GS 118  TRK 342  DIS 12.4",512,84),i.fillText("BAHÍA VISTA  RWY 09",512,216),o(830,90,48,"RPM",.62),o(940,90,48,"MAP",.55),o(830,200,40,"OIL",.5,"#7ad07a"),o(940,200,40,"FUEL",.7,"#7ad07a"),o(830,300,36,"AMP",.5),o(940,300,36,"EGT",.55);for(let h=0;h<14;h++){const d=60+h*34,u=330;i.fillStyle="#2b2f34",i.fillRect(d-8,u-14,16,28),i.fillStyle=h%3===0?"#c9a227":"#d8d8d8",i.fillRect(d-4,u-(h%2?10:0),8,10)}i.fillStyle="#c0392b",i.fillRect(560,250,40,40),i.fillStyle="#fff",i.font="11px Arial",i.textAlign="center",i.fillText("FUEL",580,300),i.fillText("CUTOFF",580,312),i.fillStyle="#e8e8e8",i.font="12px Arial",i.fillText("MASTER   AVIONICS   PITOT HEAT   NAV   STROBE   BEACON   LDG   TAXI   FUEL PUMP",300,372);const r=Mn(n,!0,4);r.flipY=!0;const[a,c]=hn(1024,384);c.fillStyle="#000",c.fillRect(0,0,1024,384),c.drawImage(n,0,0),c.globalCompositeOperation="multiply",c.fillStyle="#4c4c50",c.fillRect(0,0,1024,384),c.globalCompositeOperation="source-over",c.fillStyle="rgba(0,0,0,0.85)",c.fillRect(0,320,1024,64);const l=Mn(a,!0,4);return l.flipY=!0,{map:r,emissive:l}}function Xx(){const[n,i]=hn(256,256),o=i.createRadialGradient(128,128,256*.07,128,128,256/2);o.addColorStop(0,"rgba(40,40,44,0.4)"),o.addColorStop(.35,"rgba(40,40,44,0.18)"),o.addColorStop(.9,"rgba(40,40,44,0.13)"),o.addColorStop(1,"rgba(40,40,44,0)"),i.fillStyle=o,i.fillRect(0,0,256,256);const r=1.3/(Math.PI*2);for(let c=0;c<3;c++){const l=i.createConicGradient(c/3*Math.PI*2,128,128);l.addColorStop(0,"rgba(18,18,22,0.2)"),l.addColorStop(r*.5,"rgba(18,18,22,0.08)"),l.addColorStop(r,"rgba(18,18,22,0)"),l.addColorStop(1,"rgba(18,18,22,0)"),i.fillStyle=l,i.beginPath(),i.arc(128,128,256*.49,0,Math.PI*2),i.fill()}i.strokeStyle="rgba(200,170,60,0.28)",i.lineWidth=7,i.beginPath(),i.arc(128,128,256*.46,0,Math.PI*2),i.stroke();const a=new lo(n);return a.colorSpace=on,a}const oa=.05,ra=.4,bi=1.07,lh=.78,Vs=2.3,Ws=-1.6,Ei=-.25,aa=2.05,es=.3,pn=new P(.55,1.285,0),te={metal:{color:9344154,roughness:.38,metalness:.9},darkMetal:{color:2895667,roughness:.45,metalness:.8},spinner:{color:12896462,roughness:.16,metalness:.95},exhaust:{color:5917244,roughness:.6,metalness:.9},rubber:{color:1118740,roughness:.92,metalness:0},headliner:{color:13223357,roughness:.92,metalness:0},trim:{color:3027254,roughness:.82,metalness:.04},sidewall:{color:9078141,roughness:.88,metalness:0},glareShield:{color:2434858,roughness:.92,metalness:0},plastic:{color:3816770,roughness:.7,metalness:0},leather:{color:8017205,roughness:.55,metalness:0},carpet:{color:3485739,roughness:.95,metalness:0},prop:{color:1974050,roughness:.5,metalness:.6},propTip:{color:15909424,roughness:.5,metalness:0},shirt:{color:3100527,roughness:.85,metalness:0},skin:{color:13145452,roughness:.7,metalness:0},headset:{color:1710620,roughness:.5,metalness:0},throttle:{color:2236962,roughness:.6,metalness:0},mixture:{color:12597547,roughness:.6,metalness:0}},Ln={red:0,green:1,tail:2,beacon:3,strobe:4};class qx{root=new Pe;materials=[];glassMaterial;paintMaterial;propeller=new Pe;propDisc;propHub;propBlades;aileronL;aileronR;flapL;flapR;elevator;rudder;waterRudders=[];wheels;lights;lightPower={value:new Float32Array(5)};yokeL;yokeR;throttleLever;exhaustPos=new P(2.6,-.55,.66);floatSternL=new P(-2.2,-2.15,-1.25);floatSternR=new P(-2.2,-2.15,1.25);floatBowL=new P(2.6,-2,-1.25);floatBowR=new P(2.6,-2,1.25);wingTipL=new P(-.04,1.435,-7.5);wingTipR=new P(-.04,1.435,7.5);cockpitEye=new P(1,1,-.3);exteriorMeshes=[];interiorMeshes=[];spanHalf=7.5;constructor(){const t=[{x:4.55,yc:.02,w:.3,top:.3,bot:.3,n:2},{x:4.35,yc:.02,w:.55,top:.55,bot:.55,n:2},{x:3.9,yc:.02,w:.72,top:.7,bot:.7,n:2.1},{x:3.2,yc:.03,w:.75,top:.72,bot:.7,n:2.3},{x:2.6,yc:.04,w:.77,top:.74,bot:.7,n:3,nBot:2.4},{x:2.3,yc:.05,w:.78,top:.76,bot:.7,n:6,nBot:2.4},{x:2.15,yc:.05,w:.79,top:.88,bot:.7,n:5,nBot:2.4},{x:2,yc:.05,w:.8,top:1.01,bot:.7,n:4.7,nBot:2.4},{x:1.85,yc:.05,w:.8,top:1.12,bot:.7,n:4.5,nBot:2.4},{x:1.73,yc:.05,w:.8,top:1.13,bot:.7,n:4.5,nBot:2.4},{x:.95,yc:.05,w:.8,top:1.13,bot:.7,n:4.5,nBot:2.4},{x:0,yc:.05,w:.8,top:1.13,bot:.68,n:4.5,nBot:2.4},{x:-.4,yc:.05,w:.79,top:1.12,bot:.66,n:4.3,nBot:2.4},{x:-.9,yc:.05,w:.76,top:1.08,bot:.62,n:3.8,nBot:2.4},{x:-1.25,yc:.055,w:.7,top:1,bot:.56,n:3.3,nBot:2.3},{x:-1.6,yc:.06,w:.62,top:.9,bot:.5,n:2.7,nBot:2.2},{x:-2.6,yc:.1,w:.44,top:.62,bot:.34,n:2.3,nBot:2.1},{x:-3.7,yc:.16,w:.28,top:.42,bot:.2,n:2.1},{x:-4.7,yc:.24,w:.15,top:.3,bot:.1,n:2},{x:-5.35,yc:.3,w:.06,top:.22,bot:.04,n:2}],e=[[1.77,.95,bi],[.85,-.42,bi],[-.52,-1.25,lh]],n=Ax(t,[Vs,Ws,...e.flatMap(([X,xt])=>[X,xt])]),i=X=>n.findIndex(xt=>Math.abs(xt.x-X)<1e-6),o=X=>X>=Ws?ra:ra-(Ws-X)/(5.35+Ws)*.1,r=9,a=2,c=3,l=Rx([{y:bi,segs:r,fallbackT:.1},{y:lh,segs:a,fallbackT:.146},{y:X=>o(X.x),segs:c,fallbackT:.2125},{y:X=>o(X.x)-hs.top,segs:1,fallbackT:.23},{y:X=>o(X.x)-hs.bottom,segs:1,fallbackT:.26},{y:X=>o(X.x)-hs.pin,segs:1,fallbackT:.27}],7),h=r,d=h+a,u=d+c,f=sc(n,l),p=f.R,x=sc(ih(n,oa),(X,xt)=>f.t[xt]),g=[];for(const[X,xt,Rt]of e){const Jt=Rt===bi?h:d;g.push({i0:i(X),i1:i(xt),j0:Jt,j1:u}),g.push({i0:i(X),i1:i(xt),j0:p-u,j1:p-Jt})}g.push({i0:i(Vs),i1:i(1.85),j0:p-d,j1:p+d});const m=(X,xt)=>g.some(Rt=>Px(Rt,p,X,xt)),w=i(Vs),y=i(Ws),v=n[0].x,T=v-n[n.length-1].x,b=Hx({length:T,uOf:X=>(v-X)/T,xOf:X=>v-X*T,vOf:(X,xt)=>{let Rt=0;for(;Rt<n.length-2&&n[Rt+1].x>X;)Rt++;const Jt=n[Rt],ne=n[Rt+1],Ut=Di.clamp((Jt.x-X)/Math.max(Jt.x-ne.x,1e-6),0,1),Me=to(Jt,xt),se=to(ne,xt);return Me===null&&se===null?null:Me===null?se:se===null?Me:Me+(se-Me)*Ut},topV:(X,xt)=>{const Rt=rs(n,X),Jt=Rt.n??2.2,ne=Math.min(Math.abs(xt)/Rt.w,.999);return to(Rt,Rt.yc+Rt.top*Math.pow(1-Math.pow(ne,Jt),1/Jt)*.999)??0},perimeter:X=>Ex(rs(n,X)),sillY:o}),_=Gx(),S=Vx(),R=new ks({map:b.map,roughnessMap:b.roughnessMap,normalMap:b.normalMap,normalScale:new Ft(.55,.55),color:16777215,roughness:1,metalness:0,clearcoat:.7,clearcoatRoughness:1,clearcoatRoughnessMap:b.clearcoatRoughnessMap,envMapIntensity:1}),F=new ks({map:_.map,roughnessMap:_.roughnessMap,normalMap:_.normalMap,normalScale:new Ft(.5,.5),color:16777215,roughness:1,metalness:0,clearcoat:.65,clearcoatRoughness:.14,envMapIntensity:1,vertexColors:!0}),z=new ks({map:S.map,roughnessMap:S.roughnessMap,normalMap:S.normalMap,normalScale:new Ft(.6,.6),color:16777215,roughness:1,metalness:.55,clearcoat:.2,clearcoatRoughness:.3,envMapIntensity:1}),A=new ks({color:10470354,transparent:!0,opacity:.12,roughness:.04,metalness:0,envMapIntensity:1,side:Jn,depthWrite:!1,specularIntensity:1,ior:1.52,premultipliedAlpha:!0});A.onBeforeCompile=X=>{X.fragmentShader=X.fragmentShader.replace("#include <opaque_fragment>",`
          float glassNdv = saturate(dot(normalize(normal), normalize(vViewPosition)));
          float glassF = 0.04 + 0.96 * pow(1.0 - glassNdv, 5.0);
          float glassA = clamp(diffuseColor.a + glassF * 0.85, 0.0, 1.0);
          gl_FragColor = vec4(totalDiffuse * diffuseColor.a + totalSpecular, glassA);
        `).replace("#include <premultiplied_alpha_fragment>","")},A.customProgramCacheKey=()=>"cockpit-glass-v2";const U=new ks({color:Ze.upper,roughness:.4,metalness:0,clearcoat:.6,clearcoatRoughness:.15}),N=Bx(),D=Wx(),O=new he({map:D.map,emissiveMap:D.emissive,emissive:16777215,emissiveIntensity:.35,roughness:.7});this.materials.push(R,F,z,A,U,N,O),this.glassMaterial=A,this.paintMaterial=R;const k=(X,xt,Rt={})=>{const Jt=new pe(X,xt);return Jt.castShadow=Rt.cast??!0,Jt.receiveShadow=Rt.receive??!0,(Rt.parent??this.root).add(Jt),Rt.exterior??!0?this.exteriorMeshes.push(Jt):this.interiorMeshes.push(Jt),Jt},B=Nx;k($s(f,{quad:(X,xt)=>!m(X,xt),capStart:!0,capEnd:!0}),R);const G=new en,K=X=>{const xt=Di.smoothstep(X,bi,bi+.045);return{...te.headliner,color:new Ot(te.headliner.color).multiplyScalar(.78+.22*xt).getHex()}},nt=(X,xt)=>xt>=bi-.005?K(xt):xt>=ra-.005?te.trim:te.sidewall;G.add($s(x,{i0:w,i1:y,quad:(X,xt)=>!m(X,xt),flip:!0,capStart:!0,capEnd:!0}),void 0,nt);for(const X of g)G.add(Lx(f,x,X),void 0,te.trim);const q=ih(n,oa);G.add(oh(q,Ei,-1.55,1.95,.01),void 0,te.carpet),G.add(oh(q,.74,aa,Vs-.005,.005),void 0,te.glareShield);const tt=Ys([$s(f,{quad:m}),$s(x,{i0:w,i1:y,quad:m,flip:!0})]),ut=k(tt,A,{cast:!1,receive:!1});ut.renderOrder=20;const J=new en,et=new P(Vs,.81,0),at=new P(1.85,1.17,0),gt=et.clone().add(at).multiplyScalar(.5);gt.y-=oa*.5,J.add(new Xt(et.distanceTo(at)+.04,.028,.026),B(gt,[0,0,Math.atan2(at.y-et.y,at.x-et.x)]),te.trim);const dt=new en;for(const X of[-1,1])dt.add(new Xt(.3,.04,.22),B([1.3,-.45,X*.72]),te.darkMetal);for(let X=0;X<2;X++)dt.add(new ye(.05,.06,.28,10),B([2.75-X*.22,-.5,.62+X*.03],[.6,0,1.2]),te.exhaust);const st=new en;st.add(new Xt(.5,.12,.28),B([3.7,.7,0]));for(let X=0;X<2;X++)st.add(new Xt(.28,.04,.22),B([3,-.62,(X===0?-1:1)*.35],[(X===0?-1:1)*.35,0,0]));this.propeller.position.set(4.62,.02,0),this.root.add(this.propeller);const lt=new en;lt.add(new vc(.26,.55,20),B([.27,0,0],[0,0,-Math.PI/2]),te.spinner),lt.add(new ye(.27,.3,.16,20),B([-.02,0,0],[0,0,Math.PI/2]),te.darkMetal),this.propHub=k(lt.build(),N,{parent:this.propeller,receive:!1});const H=new en,Lt=Ux(1.32,.19,.11),pt=new Xt(.02,.14,.12);for(let X=0;X<3;X++){const xt=new $t().makeRotationX(X/3*Math.PI*2);H.add(Lt,xt.clone().multiply(new $t().makeTranslation(0,.16,0)),te.prop),H.add(pt,xt.clone().multiply(new $t().makeTranslation(0,1.4,0)),te.propTip)}this.propBlades=k(H.build(),N,{parent:this.propeller,receive:!1});const Ct=new he({map:Xx(),transparent:!0,opacity:0,depthWrite:!1,side:Be,roughness:.6,color:8947848});this.materials.push(Ct),this.propDisc=new pe(new gc(1.5,40),Ct),this.propDisc.rotation.y=Math.PI/2,this.propDisc.position.x=.05,this.propDisc.renderOrder=15,this.propeller.add(this.propDisc);const vt={span:7.3,rootChord:1.95,tipChord:1.55,sweep:-.28,dihedral:.02,thickness:.11,twist:-.03,camber:.02},kt=na(vt,0),wt=kt+.52,I=kt+.46,C=Ys([cn(vt,{z0:0,z1:.85,segments:2,part:"full",hingeX:wt,capEnd:"rear"}),cn(vt,{z0:.85,z1:3.55,segments:5,part:"front",hingeX:wt}),cn(vt,{z0:3.55,z1:3.65,segments:1,part:"full",hingeX:wt,capStart:"rear",capEnd:"rear"}),cn(vt,{z0:3.65,z1:6.9,segments:6,part:"front",hingeX:I}),cn(vt,{z0:6.9,z1:7.3,segments:1,part:"full",hingeX:I,capStart:"rear",tipRound:.22})]),Z=new en;for(const X of[1,-1])Z.add(C,B(pn,void 0,[1,1,X]));const Y=(X,xt)=>{const Rt=rs(n,X),Jt=Rt.n??2.2;return Rt.yc+Rt.top*Math.pow(Math.max(1-Math.pow(Math.min(Math.abs(xt)/Rt.w,1),Jt),0),1/Jt)},V=X=>pn.y+rh(vt,X-pn.x,0),Q=X=>pn.y+zx(vt,X-pn.x,0),mt=X=>{const xt=V(X),Rt=Q(X);return xt+Math.min(.05,.5*(Rt-xt))},ct=pn.x+ys(vt,0),_t=pn.x+kt,Gt=.45,ht=.62,yt=mt(ct-.01)-Y(ct,0),Pt=mt(_t+.01)-Y(_t,0),zt=X=>{const xt=X>ct?(X-ct)/Gt:X<_t?(_t-X)/ht:0,Rt=1-Math.min(xt,1);return Rt*Rt*(3-2*Rt)},Mt=X=>.28+.42*Math.sqrt(zt(X)),Qt=X=>X>ct?yt*zt(X):X<_t?Pt*zt(X):mt(X)-Y(X,0),qt=X=>Math.pow(Math.max(1-Math.pow(Math.min(X,1),4),0),1.6),me=[.45,.33,.22,.13,.06].map(X=>ct+X).concat([0,.03,.08,.15,.25,.4,.55,.7,.82,.91,.97,1].map(X=>ct-X*vt.rootChord)).concat([.07,.16,.27,.4,.52,.62].map(X=>_t-X));st.add(Dx(me.map(X=>({x:X,w:Mt(X)})),(X,xt)=>Y(X,xt)-.012+Qt(X)*qt(Math.abs(xt)/Mt(X)),(X,xt)=>Y(X,xt)-.03));const W=(X,xt,Rt,Jt)=>{const ne=cn({...vt,dihedral:0},{z0:X,z1:xt,segments:Jt,part:"rear",hingeX:Rt,gap:.02,capStart:"rear",capEnd:"rear"});ne.translate(-Rt,0,0);const Ut=[];for(const Me of[1,-1]){const se=new Pe;se.position.set(pn.x+Rt,pn.y,0),se.rotation.x=-Me*vt.dihedral,se.scale.z=Me;const Te=new Pe;k(ne,F,{parent:Te}),se.add(Te),this.root.add(se),Ut.push(Te)}return[Ut[0],Ut[1]]};[this.flapR,this.flapL]=W(.87,3.53,wt,5),[this.aileronR,this.aileronL]=W(3.67,6.88,I,6),dt.add(new ye(.015,.015,.45,6),B([pn.x+.45,V(pn.x+.25)-.06,-3.2],[0,0,Math.PI/2]),te.metal);const Tt={span:2.55,rootChord:1.05,tipChord:.8,sweep:-.175,dihedral:0,thickness:.09,twist:0,camber:0},rt=na(Tt,0)+.34,ft=Ys([cn(Tt,{z0:0,z1:.1,segments:1,part:"full",hingeX:rt,capEnd:"rear",n:9}),cn(Tt,{z0:.1,z1:2.4,segments:4,part:"front",hingeX:rt,n:9}),cn(Tt,{z0:2.4,z1:2.55,segments:1,part:"full",hingeX:rt,capStart:"rear",tipRound:.12,n:9})]),St=new P(-4.25,.42,0);for(const X of[-1,1])Z.add(ft,B(St,void 0,[1,1,X]));this.elevator=new Pe,this.elevator.position.set(St.x+rt,St.y,0),this.root.add(this.elevator);const Et=cn(Tt,{z0:.12,z1:2.38,segments:4,part:"rear",hingeX:rt,gap:.015,capStart:"rear",capEnd:"rear",n:9});Et.translate(-rt,0,0);const Zt=new en;for(const X of[-1,1])Zt.add(Et,B(void 0,void 0,[1,1,X]));k(Zt.build(),F,{parent:this.elevator});const fe={span:1.55,rootChord:1.5,tipChord:.75,sweep:-.55,dihedral:0,thickness:.09,twist:0,camber:0},we=na(fe,0)+.48,le=Ys([cn(fe,{z0:0,z1:.06,segments:1,part:"full",hingeX:we,capEnd:"rear",n:9}),cn(fe,{z0:.06,z1:1.45,segments:3,part:"front",hingeX:we,n:9}),cn(fe,{z0:1.45,z1:1.55,segments:1,part:"full",hingeX:we,capStart:"rear",tipRound:.1,n:9})]),Re=new P(-4.35,.45,0);Z.add(le,B(Re,[-Math.PI/2,0,0])),k(Z.build(),F),st.add(new Xt(1.4,.32,.08),B([-3.4,.55,0],[0,0,-.25])),k(st.build(),U),this.rudder=new Pe,this.rudder.position.set(Re.x+we,Re.y,0),this.root.add(this.rudder);const qe=cn(fe,{z0:.08,z1:1.43,segments:3,part:"rear",hingeX:we,gap:.015,capStart:"rear",capEnd:"rear",n:9});qe.translate(-we,0,0),k(new en().add(qe,B(void 0,[-Math.PI/2,0,0])).build(),F,{parent:this.rudder}),dt.add(new ye(.01,.01,.5,5),B([-2,.9,0],[0,0,.5]),te.metal);const bn=new he({color:16777215,roughness:.2,metalness:0,vertexColors:!0});bn.onBeforeCompile=X=>{X.uniforms.uLightPower=this.lightPower,X.vertexShader=X.vertexShader.replace("#include <common>",`#include <common>
attribute float aLight;
varying float vLight;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vLight = aLight;`),X.fragmentShader=X.fragmentShader.replace("#include <common>",`#include <common>
uniform float uLightPower[5];
varying float vLight;`).replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
totalEmissiveRadiance = vColor * uLightPower[int(vLight + 0.5)];`)},bn.customProgramCacheKey=()=>"plane-lights-v1",this.materials.push(bn);const Un=(X,xt,Rt)=>{const Jt=new Kn(X,8,6),ne=Jt.getAttribute("position").count,Ut=new Ot(xt),Me=new Float32Array(ne*3),se=new Float32Array(ne);for(let Te=0;Te<ne;Te++)Me[Te*3]=Ut.r,Me[Te*3+1]=Ut.g,Me[Te*3+2]=Ut.b,se[Te]=Rt;return Jt.setAttribute("color",new ge(Me,3)),Jt.setAttribute("aLight",new ge(se,1)),Jt},tn=new en;for(const[X,xt,Rt]of[[this.wingTipL,14162972,Ln.red],[this.wingTipR,1624136,Ln.green]]){const Jt=Math.sign(X.z)*7.55;tn.add(Un(.06,xt,Rt),B([X.x,X.y,Jt])),tn.add(Un(.035,15922431,Ln.strobe),B([X.x-.12,X.y,Jt-Math.sign(X.z)*.02]))}tn.add(Un(.04,15922431,Ln.tail),B([-5.37,.3,0])),tn.add(Un(.05,14162972,Ln.beacon),B([-4.8,2.07,0])),this.lights=k(tn.build(),bn,{cast:!1,receive:!1});const mo=Ix([{x:2.95,yc:-1.85,w:.06,top:.08,bot:.06,n:2},{x:2.6,yc:-1.9,w:.2,top:.15,bot:.18,n:2.2,nBot:1.5},{x:1.9,yc:-1.95,w:.33,top:.18,bot:.28,n:2.6,nBot:1.4},{x:.8,yc:-1.95,w:.37,top:.19,bot:.32,n:2.8,nBot:1.4},{x:-.2,yc:-1.95,w:.37,top:.19,bot:.3,n:2.8,nBot:1.4},{x:-.35,yc:-1.95,w:.36,top:.19,bot:.22,n:2.8,nBot:1.5},{x:-1.3,yc:-1.92,w:.33,top:.18,bot:.2,n:2.7,nBot:1.6},{x:-2.3,yc:-1.86,w:.25,top:.15,bot:.12,n:2.5,nBot:1.8},{x:-2.75,yc:-1.8,w:.12,top:.1,bot:.05,n:2.2}],20),As=new en,ni=2.9,Cs=X=>new P(pn.x+X,pn.y+rh(vt,X,ni)+.03,0),ze=(X,xt,Rt)=>new P(X,xt,Rt);for(const X of[-1,1]){As.add(mo,B([0,0,X*1.25])),dt.add(new Kn(.09,10,8),B([2.98,-1.85,X*1.25]),te.rubber);const xt=-1.76,Rt=-.62;dt.add(ts(ze(1.6,xt,X*1.25),ze(1.4,Rt,X*.55),.14,.05),void 0,te.metal),dt.add(ts(ze(-.9,xt,X*1.25),ze(-.7,Rt,X*.5),.14,.05),void 0,te.metal),dt.add(sa(ze(1.6,xt,X*1.25),ze(-.7,Rt,X*.5),.025),void 0,te.metal),dt.add(sa(ze(-.9,xt,X*1.25),ze(1.4,Rt,X*.55),.025),void 0,te.metal);const Jt=Cs(.25).setZ(X*ni),ne=Cs(-.85).setZ(X*ni);dt.add(ts(ze(1.3,xt+.1,X*1.3),Jt,.12,.045),void 0,te.metal),dt.add(ts(ze(-.2,xt+.1,X*1.3),ne,.12,.045),void 0,te.metal),dt.add(sa(Jt.clone().setY(Jt.y-.05),ne.clone().setY(ne.y-.05),.03),void 0,te.metal);const Ut=new Pe;Ut.position.set(-2.7,-1.85,X*1.25),k(new en().add(new Xt(.22,.32,.03),B([0,-.18,0]),te.darkMetal).build(),N,{parent:Ut,cast:!1,receive:!1}),this.root.add(Ut),this.waterRudders.push(Ut);for(const Me of[2,.4,-1.4])dt.add(new Xt(.14,.05,.05),B([Me,xt+.03,X*1.25+.2*X]),te.metal)}dt.add(ts(ze(1.6,-1.72,-1.25),ze(1.6,-1.72,1.25),.1,.06),void 0,te.metal),dt.add(ts(ze(-.9,-1.72,-1.25),ze(-.9,-1.72,1.25),.1,.06),void 0,te.metal),k(As.build(),z),k(dt.build(),N),this.wheels=new Pe,this.root.add(this.wheels);const go=new Qs(.2,.09,6,16),vo=new ye(.12,.12,.12,12),Rs=new en;for(const X of[-1,1])for(const[xt,Rt]of[[-.9,1],[2.3,.7]])Rs.add(go,B([xt,-2.28,X*1.25],void 0,Rt),te.rubber),Rs.add(vo,B([xt,-2.28,X*1.25],[Math.PI/2,0,0],Rt),te.metal);k(Rs.build(),N,{parent:this.wheels,receive:!1});const xo=((X,xt)=>fu(rs(q,X),xt))(2.1,.74)-.03,L=.4,$=new P(Math.sin(es),-Math.cos(es),0),it=new P(Math.cos(es),Math.sin(es),0),j=new P(aa,.735,0).clone().addScaledVector($,L/2);J.add(new Xt(.16,L+.02,xo*2),B(j.clone().addScaledVector(it,.085),[0,0,es]),te.plastic);const bt=k(new ti(xo*2-.02,L),O,{exterior:!1});bt.position.copy(j),bt.rotation.set(0,-Math.PI/2,es,"ZYX"),J.add(new Xt(.7,.32,.22),B([1.7,Ei+.16,0]),te.plastic),this.throttleLever=k(new en().add(new Xt(.04,.22,.03),void 0,te.throttle).build(),N,{exterior:!1}),this.throttleLever.position.set(1.75,Ei+.42,-.04),J.add(new Xt(.04,.2,.03),B([1.72,Ei+.42,.04]),te.mixture);const Dt=Ei+.4,Ht=X=>{const xt=new Pe,Rt=new en;Rt.add(new ye(.02,.02,.5,8),B([.25,0,0],[0,0,Math.PI/2]),te.darkMetal),Rt.add(new Qs(.15,.02,8,24,Math.PI*1.3),B(void 0,[Math.PI*.85,Math.PI/2,0]),te.plastic),Rt.add(new Xt(.03,.03,.26),void 0,te.plastic);const Jt=new pe(Rt.build(),N);return xt.add(Jt),xt.position.set(1.55,.42,X),this.root.add(xt),this.interiorMeshes.push(xt),xt};this.yokeL=Ht(-.35),this.yokeR=Ht(.35);const Vt=new Xt(.46,.12,.46),ee=new Xt(.1,.55,.46),ae=new Xt(.26,.34,.26);for(const[X,xt]of[[1,-.34],[1,.34],[-.2,-.34],[-.2,.34],[-1,0]])J.add(Vt,B([X,Dt,xt]),te.leather),J.add(ee,B([X-.25,Dt+.33,xt],[0,0,.15]),te.leather),J.add(ae,B([X,Ei+.17,xt]),te.darkMetal);const Bt=this.cockpitEye.y-.03;J.add(new Xt(.28,.58,.42),B([.95,Dt+.06+.29,-.34]),te.shirt),J.add(new Kn(.11,12,10),B([.98,Bt,-.34]),te.skin),J.add(new Qs(.115,.018,6,16,Math.PI),B([.98,Bt+.03,-.34],[0,Math.PI/2,0]),te.headset);for(const X of[-1,1])J.add(new ye(.045,.045,.03,10),B([.98,Bt,-.34+X*.12],[Math.PI/2,0,0]),te.headset);for(const X of[-1,1])J.add(new ye(.04,.045,.5,8),B([1.22,Dt+.42,-.34+X*.16],[0,0,Math.PI/2-.35]),te.shirt);for(const X of[-.5,-.2,.2,.5])J.add(new Xt(.12,.18,.08),B([1.9,Ei+.12,X],[0,0,.5]),te.darkMetal);J.add(new Xt(.08,.07,.09),B([aa+.1,.775,0]),te.plastic),k(G.build(),N,{exterior:!1,cast:!1}),k(J.build(),N,{exterior:!1});for(const X of this.materials)X.isMeshStandardMaterial&&(X.envMapIntensity=1)}animate(t,e,n,i,o,r,a,c,l){this.aileronR.rotation.z=-e*.35,this.aileronL.rotation.z=e*.35,this.flapR.rotation.z=i*.6,this.flapL.rotation.z=i*.6,this.elevator.rotation.z=t*.4,this.rudder.rotation.y=-n*.45;for(const p of this.waterRudders)p.rotation.y=-n*.5;this.propeller.rotation.x+=o*2600*(Math.PI*2/60)*r;const h=this.propDisc.material;h.opacity=Di.clamp((o-.15)*1.6,0,.75),this.propBlades.visible=o<.55;const d=a%1.2<.06||(a+.15)%1.2<.06,u=Math.pow(c,.6),f=this.lightPower.value;f[Ln.red]=f[Ln.green]=7*u,f[Ln.tail]=6*u,f[Ln.beacon]=(2+12*Math.max(0,Math.sin(a*4.5)))*u,f[Ln.strobe]=(d?30:0)*u,this.wheels.visible=l,this.wheels.position.y=l?0:.3,this.yokeL.rotation.x=e*.8,this.yokeR.rotation.x=e*.8,this.yokeL.position.x=1.55-t*.08,this.yokeR.position.x=1.55-t*.08}}const hh=9.81;class or{constructor(t){this.heightAt=t}position=new P(0,.3,0);quaternion=new Ae;velocity=new P;omega=new P;rpm=0;telemetry={airspeed:0,groundSpeed:0,altitude:0,agl:0,verticalSpeed:0,heading:0,alpha:0,beta:0,stalled:!1,onWater:!1,onGround:!1,rpm:0,gForce:1,gearDown:!0,shake:0,buffet:0,gustLevel:0,bank:0,pitchAngle:0,crashed:!1};mass=2350;wingArea=26;span=14.6;chord=1.65;maxThrust=7400;inertia=new P(5600,11600,7400);wind=new P;turbulence=.3;gearDown=!0;gust=new P;gustAmp=0;time=0;buffet=0;crashTimer=0;wreckedTimer=0;lastHeading=0;contactUp=0;tmpV=new P;tmpV2=new P;invQ=new Ae;stations=[{p:new P(2.6,-2.08,-1.25),kind:"bow"},{p:new P(2.6,-2.08,1.25),kind:"bow"},{p:new P(-.2,-2.25,-1.25),kind:"step"},{p:new P(-.2,-2.25,1.25),kind:"step"},{p:new P(-2.3,-1.98,-1.25),kind:"stern"},{p:new P(-2.3,-1.98,1.25),kind:"stern"},{p:new P(.7,-2.27,-1.25),kind:"plane"},{p:new P(.7,-2.27,1.25),kind:"plane"},{p:new P(-.9,-2.57,-1.25),kind:"wheel"},{p:new P(-.9,-2.57,1.25),kind:"wheel"},{p:new P(2.3,-2.48,-1.25),kind:"wheel"},{p:new P(2.3,-2.48,1.25),kind:"wheel"},{p:new P(3.6,-.5,0),kind:"structure"},{p:new P(-.04,1.43,-7.5),kind:"structure"},{p:new P(-.04,1.43,7.5),kind:"structure"},{p:new P(-4.9,2.1,0),kind:"structure"},{p:new P(-5.4,-.2,0),kind:"structure"},{p:new P(.6,1.75,0),kind:"structure"}];static FLOAT_REST_Y=1.96;static WHEEL_REST_Y=2.57;reset(t,e,n,i,o){this.position.set(t,e,n),this.quaternion.setFromEuler(new be(0,i,0));const r=new P(1,0,0).applyQuaternion(this.quaternion);this.velocity.copy(r).multiplyScalar(o),this.omega.set(0,0,0),this.rpm=o>5?.7:.2,this.wreckedTimer=0}forward(t){return t.set(1,0,0).applyQuaternion(this.quaternion)}up(t){return t.set(0,1,0).applyQuaternion(this.quaternion)}step(t,e){if(e<=0){this.probeContacts(),this.updateTelemetry(t);return}const n=Math.max(1,Math.ceil(e/(1/120))),i=e/n;for(let o=0;o<n;o++)this.substep(t,i);this.updateTelemetry(t)}substep(t,e){this.time+=e,this.crashTimer=Math.max(0,this.crashTimer-e);const n=jt(t.throttle,0,1);this.rpm+=(n*.92+.08-this.rpm)*jt(e/.7,0,1);const i=this.time*.35,o=Kt(i,1.3)+.4*Kt(i*4,11.7),r=.7*Kt(i*1.7,7.1)+.35*Kt(i*5.1,3.3),a=Kt(i*1.3,3.7)+.4*Kt(i*4.3,6.9),c=this.turbulence*(1.5+2*(1-Nt(30,300,this.position.y)));this.gustAmp=c,this.gust.set(o,r,a).multiplyScalar(c),this.invQ.copy(this.quaternion).invert();const l=this.tmpV.copy(this.velocity).sub(this.wind).sub(this.gust),h=this.tmpV2.copy(l).applyQuaternion(this.invQ),d=Math.max(h.length(),.5),u=Math.atan2(-h.y,Math.max(h.x,.1)),f=Math.asin(jt(h.z/d,-1,1)),p=1.2*Math.exp(-this.position.y/9e3),x=.5*p*d*d,g=this.wingArea,m=jt(t.flaps,0,1),w=.27-m*.03;let y=.32+m*.55+5.4*u;const v=1.7+m*.5;let T=!1,M=0;u>w?(M=u-w,y=Math.max(v-M*6,.9*Math.sin(2*u)),T=!0):u<-.22&&(y=Math.max(y,-.9)),y=Math.min(y,v),this.buffet=de(this.buffet,T?1:Nt(w-.05,w,u)*.5,jt(e*6,0,1));const E=.034+.048*y*y+m*.05+(this.gearDown?.012:0)+(T?.1+.6*M:0),b=-.45*f,_=x*g*y,S=x*g*E,R=x*g*b,F=h.clone().normalize(),z=new P(-F.y,F.x,0).normalize();z.lengthSq()<.5&&z.set(0,1,0);const A=new P;A.addScaledVector(F,-S),A.addScaledVector(z,_),A.z+=R;const U=this.maxThrust*jt((this.rpm-.08)/.92,0,1)*jt(1-d/120,.2,1)*(p/1.2);A.x+=U;const N=A.y,D=this.omega.x,O=this.omega.y,k=this.omega.z,B=this.span,G=this.chord,K=2*Math.max(d,3),nt=D*B/K,q=O*B/K,tt=k*G/K,ut=jt(t.roll,-1,1),J=jt(t.yaw,-1,1),et=jt(Math.sqrt(614/Math.max(x,1)),.4,1),at=jt(t.pitch,-1,1)*et,gt=-.18*Nt(0,.035,M),dt=.04-1.3*u-36*tt+.43*at*(1-.15*m)-.06*m+gt,st=-.5*nt+.072*ut-.08*f-.08*q,lt=-.1*f-.16*q-.075*J+.008*ut+.06*jt(y,0,1.5)*nt,H=new P(x*g*B*st,x*g*B*lt,x*g*G*dt);H.z+=.25*U,T&&(H.x+=x*g*B*.02*Math.sin(this.time*17)*this.buffet,H.z-=x*g*G*.03*this.buffet),H.x+=x*g*B*.0055*c*Kt(this.time*2.1,9.9),H.z+=x*g*G*.004*c*Kt(this.time*1.9,4.4),H.y+=x*g*B*.002*c*Kt(this.time*1.7,12.4);let Lt=!1,pt=!1,Ct=!1,vt=0;const kt=new P,wt=new P,I=new P,Z=this.heightAt(this.position.x,this.position.z)>.05;this.gearDown=Z&&this.position.y<60;const Y=Math.hypot(this.velocity.x,this.velocity.z),V=this.quaternion,Q=Math.asin(jt(2*(V.x*V.y+V.w*V.z),-1,1));this.contactUp=0;for(const zt of this.stations){const Mt=zt.p;wt.copy(Mt).applyQuaternion(this.quaternion).add(this.position);const Qt=this.heightAt(wt.x,wt.z),qt=Qt<=.05,W=(qt?0:Qt)-wt.y;if(W<=0)continue;const Tt=zt.kind==="wheel",rt=zt.kind==="structure",ft=!Tt&&!rt;if(qt&&Tt||!qt&&ft&&this.gearDown)continue;Ct=!0,I.copy(this.omega).applyQuaternion(this.quaternion).cross(this.tmpV.copy(wt).sub(this.position)).add(this.velocity);const St=Math.hypot(I.x,I.z);let Et,Zt;if(rt)St>12&&this.crash(),qt?(Lt=!0,Et=12e3*W-3e3*I.y,Zt=-(250*St+40*St*St)*Math.min(W/.3,1)):(pt=!0,Et=8e4*Math.min(W,.6)-8e3*I.y,Zt=-.7*Math.max(Et,0)*Math.min(St,1));else if(qt){Lt=!0;const fe=Nt(8,22,St),we=Math.min(W/.1,1);if(zt.kind==="plane"){const le=jt(.5+3*Q,.25,1.3);Et=(40*St*St*Math.min(W/.35,1)*le-250*St*we*I.y)*fe,Zt=0}else{vt++;const le=zt.kind==="bow",Re=zt.kind==="stern",qe=Re?36e3:le?24e3:56e3,bn=Re||le?.15:.2,Un=W<bn?W*W/(2*bn):W-bn/2,tn=Re?1-.9*fe:le?1-.6*fe:1-.3*fe;Et=qe*Math.min(Un,.9)*tn+3e4*Math.max(W-.45,0)**2,Et-=5500*we*(1-.5*fe)*I.y,Zt=-(4.5*St*St*(1-.85*fe)+30*St)*Math.min(W/.3,1)}}else{pt=!0,Et=52e3*Math.min(W,.5)-6e3*I.y,Zt=-(t.brake?.45:.03)*Math.max(Et,0)*Math.min(St,1);const le=new P(0,0,1).applyQuaternion(this.quaternion);le.y=0,le.normalize();const Re=I.dot(le),qe=jt(-Re*900,-.9*Math.max(Et,0),.9*Math.max(Et,0));kt.copy(le).multiplyScalar(qe),this.applyForce(kt,wt,e)}Et=Math.max(Et,0),kt.set(0,Et,0),St>.01&&kt.add(this.tmpV.set(I.x/St,0,I.z/St).multiplyScalar(Zt)),this.applyForce(kt,wt,e)}if(vt>0){const zt=Y;this.omega.y-=J*1500*Math.min(zt/6,1)*(vt/6)*e/this.inertia.y}if(Ct&&this.velocity.y<-15&&this.crash(),pt&&Y>25){const zt=this.heightAt(this.position.x+2,this.position.z)-this.heightAt(this.position.x-2,this.position.z),Mt=this.heightAt(this.position.x,this.position.z+2)-this.heightAt(this.position.x,this.position.z-2);Math.hypot(zt,Mt)/4>.2&&this.crash()}const mt=A.applyQuaternion(this.quaternion);mt.y-=this.mass*hh,this.velocity.addScaledVector(mt,e/this.mass),this.position.addScaledVector(this.velocity,e),this.omega.x+=H.x/this.inertia.x*e,this.omega.y+=H.y/this.inertia.y*e,this.omega.z+=H.z/this.inertia.z*e,(Lt||pt)&&this.omega.multiplyScalar(1-.8*e);const ct=new Ae(this.omega.x*e*.5,this.omega.y*e*.5,this.omega.z*e*.5,1).normalize();this.quaternion.multiply(ct).normalize();const _t=this.heightAt(this.position.x,this.position.z),Gt=Math.max(_t,0)+.8;this.position.y<Gt&&(this.position.y=Gt,this.velocity.y<0&&(this.velocity.y*=-.1),this.velocity.multiplyScalar(1-2.5*e));const ht=1-2*(this.quaternion.x*this.quaternion.x+this.quaternion.z*this.quaternion.z);(Ct||this.position.y-Math.max(_t,0)<3.5)&&ht<.35?(this.wreckedTimer+=e,this.wreckedTimer>2.9&&this.crash()):this.wreckedTimer=0;const Pt=this.forward(this.tmpV);Math.hypot(Pt.x,Pt.z)>.2&&(this.lastHeading=Math.atan2(Pt.x,-Pt.z)),this.telemetry.alpha=u,this.telemetry.beta=f,this.telemetry.stalled=T&&d>12,this.telemetry.onWater=Lt,this.telemetry.onGround=pt,this.telemetry.gForce=(N+this.contactUp)/(this.mass*hh),this.telemetry.buffet=this.buffet,this.telemetry.gustLevel=jt(this.gust.length()/2.5,0,1)*Nt(8,25,d),this.telemetry.shake=jt(this.buffet*.7+this.telemetry.gustLevel*.5+Nt(60,100,d)*.25,0,1)}crash(){const t=this.heightAt(this.position.x,this.position.z),e=t>.05;this.position.y=e?t+or.WHEEL_REST_Y:or.FLOAT_REST_Y,this.quaternion.setFromEuler(new be(0,this.headingToYaw(this.lastHeading),0)),this.velocity.set(0,0,0),this.omega.set(0,0,0),this.rpm=.08,this.buffet=0,this.wreckedTimer=0,this.crashTimer=5}headingToYaw(t){return Math.atan2(Math.cos(t),Math.sin(t))}applyForce(t,e,n){this.velocity.addScaledVector(t,n/this.mass);const i=this.quaternion;this.contactUp+=t.x*2*(i.x*i.y-i.w*i.z)+t.y*(1-2*(i.x*i.x+i.z*i.z))+t.z*2*(i.y*i.z+i.w*i.x);const r=this.tmpV.copy(e).sub(this.position).cross(t);r.applyQuaternion(this.invQ),this.omega.x+=r.x/this.inertia.x*n,this.omega.y+=r.y/this.inertia.y*n,this.omega.z+=r.z/this.inertia.z*n}probeContacts(){let t=!1,e=!1;for(const n of this.stations){if(n.kind==="structure")continue;this.tmpV.copy(n.p).applyQuaternion(this.quaternion).add(this.position);const i=this.heightAt(this.tmpV.x,this.tmpV.z),o=i<=.05;o&&n.kind==="wheel"||(o?0:i)-this.tmpV.y<=0||(o?t=!0:e=!0)}this.telemetry.onWater=t,this.telemetry.onGround=e}updateTelemetry(t){const e=this.telemetry,n=this.forward(this.tmpV);e.airspeed=this.tmpV2.copy(this.velocity).sub(this.wind).length(),e.groundSpeed=Math.hypot(this.velocity.x,this.velocity.z),e.altitude=this.position.y,e.agl=this.position.y-Math.max(0,this.heightAt(this.position.x,this.position.z)),e.verticalSpeed=this.velocity.y,e.heading=(Math.atan2(n.x,-n.z)*180/Math.PI+360)%360,e.rpm=this.rpm,e.gearDown=this.gearDown;const i=this.tmpV2.set(0,0,1).applyQuaternion(this.quaternion);e.bank=Math.asin(jt(-i.y,-1,1)),e.pitchAngle=Math.asin(jt(n.y,-1,1)),e.crashed=this.crashTimer>0}}function Yx(){const s=document.createElement("canvas");s.width=s.height=64;const t=s.getContext("2d"),e=t.createRadialGradient(32,32,0,32,32,32);return e.addColorStop(0,"rgba(255,255,255,1)"),e.addColorStop(.4,"rgba(255,255,255,0.55)"),e.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=e,t.fillRect(0,0,64,64),new lo(s)}class uh{constructor(t,e,n,i,o){this.capacity=t,this.positions=new Float32Array(t*3),this.alphas=new Float32Array(t),this.sizes=new Float32Array(t),this.geo=new re,this.geo.setAttribute("position",new ge(this.positions,3)),this.geo.setAttribute("aAlpha",new ge(this.alphas,1)),this.geo.setAttribute("aSize",new ge(this.sizes,1));const r=new Ie({uniforms:{uTex:{value:n},uColor:{value:e},uOpacity:{value:i},uScale:{value:1}},vertexShader:`
        attribute float aAlpha; attribute float aSize; varying float vAlpha;
        uniform float uScale;
        void main() { vAlpha = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / max(-mv.z, 0.5); }
      `,fragmentShader:`
        uniform sampler2D uTex; uniform vec3 uColor; uniform float uOpacity; varying float vAlpha;
        void main() { vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(uColor, t.a * vAlpha * uOpacity); }
      `,transparent:!0,depthWrite:!1,blending:o});this.points=new Gg(this.geo,r),this.points.frustumCulled=!1,this.geo.setDrawRange(0,0)}points;particles=[];positions;alphas;sizes;geo;emit(t){this.particles.length>=this.capacity&&this.particles.shift(),this.particles.push(t)}update(t,e,n,i){this.points.material.uniforms.uScale.value=i;let o=0;for(let r=this.particles.length-1;r>=0;r--){const a=this.particles[r];if(a.age+=t,a.age>=a.life){this.particles.splice(r,1);continue}a.vy-=e*t;const c=Math.exp(-n*t);a.vx*=c,a.vy*=c,a.vz*=c,a.x+=a.vx*t,a.y+=a.vy*t,a.z+=a.vz*t,a.y<.05&&e>0&&(a.y=.05,a.vy=0);const l=a.age/a.life;this.positions[o*3]=a.x,this.positions[o*3+1]=a.y,this.positions[o*3+2]=a.z,this.alphas[o]=Math.sin(l*Math.PI)*(1-l*.5),this.sizes[o]=a.size*(.6+l*1.2),o++}this.geo.attributes.position.needsUpdate=!0,this.geo.attributes.aAlpha.needsUpdate=!0,this.geo.attributes.aSize.needsUpdate=!0,this.geo.setDrawRange(0,o)}}class $x{wakeL;wakeR;spray;exhaust;vortexL;vortexR;stampL;stampR;tmp=new P;tmp3=new P;tmp2=new P;sprayAcc=0;exhaustAcc=0;constructor(t,e){this.wakeL=new os(70,1.6,14,1.2),this.wakeR=new os(70,1.6,14,1.2),t.add(this.wakeL.mesh,this.wakeR.mesh),this.stampL=new ro(4.8,.9,.9),this.stampR=new ro(4.8,.9,.9),e.add(this.stampL.mesh,this.stampR.mesh);const n=Yx();this.spray=new uh(400,new Ot(.95,.98,1),n,.75,$n),this.exhaust=new uh(120,new Ot(.25,.24,.23),n,.22,$n),e.add(this.spray.points,this.exhaust.points),this.vortexL=new os(90,.5,2.2,.6,Za),this.vortexR=new os(90,.5,2.2,.6,Za),e.add(this.vortexL.mesh,this.vortexR.mesh)}update(t,e,n,i,o){const r=t.telemetry,a=t.quaternion,c=r.groundSpeed,l=this.tmp.copy(e.floatSternL).applyQuaternion(a).add(t.position),h=this.tmp2.copy(e.floatSternR).applyQuaternion(a).add(t.position),d=r.onWater&&c>1.5;this.wakeL.update(l.x,l.z,i,d,c),this.wakeR.update(h.x,h.z,i,d,c);const u=t.forward(this.tmp3),f=Math.hypot(u.x,u.z)||1,p=.9*(1-Nt(6,18,c));for(const[w,y,v]of[[this.stampL,e.floatBowL,e.floatSternL],[this.stampR,e.floatBowR,e.floatSternR]]){const T=this.tmp.copy(y).add(v).multiplyScalar(.5).applyQuaternion(a).add(t.position);w.update(T.x,T.z,u.x/f,u.z/f,r.onWater&&p>.02,p)}if(r.onWater&&c>4){const w=90*Nt(4,14,c)*(1-.5*Nt(25,40,c));this.sprayAcc+=w*n;const y=t.forward(new P);for(;this.sprayAcc>=1;){this.sprayAcc-=1;for(const v of[e.floatBowL,e.floatBowR]){const T=this.tmp.copy(v).applyQuaternion(a).add(t.position),M=v.z>0?1:-1,E=new P(0,0,1).applyQuaternion(a);this.spray.emit({x:T.x,y:.1,z:T.z,vx:y.x*c*.35+E.x*M*(2+Math.random()*3)+(Math.random()-.5)*2,vy:2.5+Math.random()*3.5+c*.08,vz:y.z*c*.35+E.z*M*(2+Math.random()*3)+(Math.random()-.5)*2,life:.7+Math.random()*.6,age:0,size:.6+Math.random()*.8})}}}if(this.spray.update(n,9.81,1.2,o*.9),r.rpm>.2){this.exhaustAcc+=(10+25*r.rpm)*n;const w=t.forward(new P);for(;this.exhaustAcc>=1;){this.exhaustAcc-=1;const y=this.tmp.copy(e.exhaustPos).applyQuaternion(a).add(t.position);this.exhaust.emit({x:y.x,y:y.y,z:y.z,vx:t.velocity.x-w.x*6+(Math.random()-.5),vy:t.velocity.y-1.5+Math.random()*1.5,vz:t.velocity.z-w.z*6+(Math.random()-.5),life:.35+Math.random()*.3,age:0,size:.35+Math.random()*.3})}}this.exhaust.update(n,-.3,2.5,o*.9);const x=jt((r.alpha-.13)/.12,0,1)*Nt(35,55,r.airspeed),g=this.tmp.copy(e.wingTipL).applyQuaternion(a).add(t.position),m=this.tmp2.copy(e.wingTipR).applyQuaternion(a).add(t.position);this.vortexL.update(g.x,g.z,i,x>.05,r.airspeed),this.vortexR.update(m.x,m.z,i,x>.05,r.airspeed),this.vortexL.mesh.position.y=g.y,this.vortexL.mesh.updateMatrix(),this.vortexR.mesh.position.y=m.y,this.vortexR.mesh.updateMatrix(),this.vortexL.mesh.material.uniforms.uStrength.value=x*.7,this.vortexR.mesh.material.uniforms.uStrength.value=x*.7}}class jx{model=new qx;flight;effects;inputs={throttle:0,pitch:0,roll:0,yaw:0,flaps:0,brake:!1};constructor(t,e,n){this.flight=new or(t),this.effects=new $x(n,e),e.add(this.model.root)}place(t,e,n,i,o,r,a,c){this.flight.position.set(t,e,n);const l=Math.atan2(Math.cos(i),Math.sin(i)),h=new be(0,0,0,"YZX");h.set(r,l,o,"YZX"),this.flight.quaternion.setFromEuler(h);const d=new P(1,0,0).applyQuaternion(this.flight.quaternion);this.flight.velocity.copy(d).multiplyScalar(a),this.flight.omega.set(0,0,0),this.flight.rpm=c,this.inputs.throttle=c,this.flight.step(this.inputs,0),this.syncModel()}syncModel(){this.model.root.position.copy(this.flight.position),this.model.root.quaternion.copy(this.flight.quaternion)}update(t,e,n,i,o,r,a){this.flight.wind.copy(i),this.flight.turbulence=o,a&&this.flight.step(this.inputs,t),this.syncModel();const c=this.flight.telemetry;this.model.animate(this.inputs.pitch,this.inputs.roll,this.inputs.yaw,this.inputs.flaps,c.rpm,t,e,n,c.gearDown),this.effects.update(this.flight,this.model,t,e,r)}}class Zx{constructor(t){this.camera=t}mode="chase";pos=new P;vel=new P;lookTarget=new P;tmp=new P;tmp2=new P;fwd=new P;lookLift=new P(0,1.2,0);orbitQ=new Ae;euler=new be;q=new Ae;groundHeight=null;smoothQ=new Ae;time=0;initialised=!1;baseFov=50;shakeScale=1;orbitYaw=0;orbitPitch=0;chaseDistance=25;chaseHeight=6.5;snap(){this.initialised=!1}update(t,e,n){this.time+=n;const i=this.camera,o=t.telemetry,r=o.gustLevel*this.shakeScale,a=o.buffet*this.shakeScale,c=Nt(60,100,o.airspeed)*this.shakeScale,l=Kt(this.time*2.3,.3)*.1*r+Kt(this.time*9.5,1.3)*.06*a+Kt(this.time*13,2.2)*.015*c,h=Kt(this.time*2.9,4.3)*.1*r+Kt(this.time*11,5.7)*.06*a+Kt(this.time*15,6.1)*.015*c,d=Kt(this.time*2.1,8.3)*.1*r+Kt(this.time*10.2,9.1)*.06*a+Kt(this.time*12,7.7)*.015*c;if(this.mode==="fixed")return;if(this.mode==="cockpit"){const _=this.tmp.copy(e.cockpitEye).applyQuaternion(t.quaternion).add(t.position);this.q.copy(t.quaternion),this.initialised||(this.smoothQ.copy(this.q),this.initialised=!0),this.smoothQ.slerp(this.q,1-Math.exp(-n*14));const S=new Ae().setFromEuler(new be(0,-Math.PI/2,0));i.quaternion.copy(this.smoothQ).multiply(S);const R=new Ae().setFromEuler(new be(-this.orbitPitch*.6,this.orbitYaw*1.2,0,"YXZ"));i.quaternion.multiply(R),_.x+=l*.15,_.y+=h*.15,_.z+=d*.15,i.position.copy(_),i.fov=this.baseFov+12,i.updateProjectionMatrix();return}const u=t.forward(this.fwd),f=Math.atan2(u.x,u.z),p=o.airspeed,x=this.chaseDistance+p*.08,g=this.chaseHeight+p*.012,m=this.orbitQ.setFromEuler(this.euler.set(this.orbitPitch,f+this.orbitYaw,0,"YXZ")),w=this.tmp2.set(0,g,-x).applyQuaternion(m).add(t.position);this.initialised||(this.pos.copy(w),this.vel.set(0,0,0),this.initialised=!0);const y=60,v=2*.9*Math.sqrt(60);w.addScaledVector(t.velocity,v/y);const T=this.tmp.copy(w).sub(this.pos).multiplyScalar(y).addScaledVector(this.vel,-v);this.vel.addScaledVector(T,n),this.pos.addScaledVector(this.vel,n);const M=Math.max(1.2,this.groundHeight?this.groundHeight(this.pos.x,this.pos.z)+2.5:1.2);this.pos.y<M&&(this.pos.y=M,this.vel.y<0&&(this.vel.y=0));const E=this.lookTarget.copy(t.position).addScaledVector(u,6).add(this.lookLift);i.position.copy(this.pos),i.position.x+=l,i.position.y+=h,i.position.z+=d,i.up.set(0,1,0),i.lookAt(E);const b=o.bank;i.rotateZ(-b*.18),i.fov=this.baseFov+Nt(30,90,p)*6,i.updateProjectionMatrix()}}class Kx{constructor(t){this.renderer=t;const n=t.getContext().getExtension("EXT_disjoint_timer_query_webgl2");if(n&&(this.gpuExt=n),"PerformanceObserver"in window)try{new PerformanceObserver(o=>{this.longTasks+=o.getEntries().length}).observe({entryTypes:["longtask"]})}catch{}}times=[];lastStart=0;longTasks=0;gpuQuery=null;gpuExt=null;lastGpuMs=null;visibleObjects=0;beginFrame(){this.lastStart=performance.now();const t=this.renderer.getContext();this.gpuExt&&!this.gpuQuery&&(this.gpuQuery=t.createQuery(),t.beginQuery(this.gpuExt.TIME_ELAPSED_EXT,this.gpuQuery))}endFrame(){const t=performance.now()-this.lastStart;this.times.push(t),this.times.length>600&&this.times.shift();const e=this.renderer.getContext();if(this.gpuExt&&this.gpuQuery){e.endQuery(this.gpuExt.TIME_ELAPSED_EXT);const n=this.gpuQuery;setTimeout(()=>{const i=e.getQueryParameter(n,e.QUERY_RESULT_AVAILABLE),o=e.getParameter(this.gpuExt.GPU_DISJOINT_EXT);i&&!o&&(this.lastGpuMs=e.getQueryParameter(n,e.QUERY_RESULT)/1e6),e.deleteQuery(n)},0),this.gpuQuery=null}}reset(){this.times.length=0,this.longTasks=0}snapshot(){const t=this.times.slice().sort((l,h)=>l-h),e=t.length||1,n=t.reduce((l,h)=>l+h,0)/e,i=t[Math.min(t.length-1,Math.floor(t.length*.99))]??0,o=t.slice(Math.floor(t.length*.99)),r=o.length?o.reduce((l,h)=>l+h,0)/o.length:n,a=this.renderer.info,c=performance.memory;return{frames:t.length,avgMs:n,p99Ms:i,minFps:t.length?1e3/(t[t.length-1]||1):0,avgFps:n?1e3/n:0,onePercentLowFps:r?1e3/r:0,calls:a.render.calls,triangles:a.render.triangles,points:a.render.points,lines:a.render.lines,geometries:a.memory.geometries,textures:a.memory.textures,programs:a.programs?.length??0,jsHeapMB:c?c.usedJSHeapSize/1048576:null,gpuMs:this.lastGpuMs,longTasks:this.longTasks,visibleObjects:this.visibleObjects}}}const Jx={low:{samples:0,shadowMapSize:1024,cascades:2,cloudSteps:10,skyScale:.35,shadowFar:1500,anisotropy:2,bloom:!0},medium:{samples:2,shadowMapSize:2048,cascades:3,cloudSteps:16,skyScale:.5,shadowFar:2500,anisotropy:4,bloom:!0},high:{samples:4,shadowMapSize:2048,cascades:3,cloudSteps:24,skyScale:.6,shadowFar:3500,anisotropy:8,bloom:!0},ultra:{samples:4,shadowMapSize:4096,cascades:4,cloudSteps:32,skyScale:1,shadowFar:5e3,anisotropy:16,bloom:!0}};class Qx{constructor(t,e){this.canvas=t,this.params=e,this.quality=Jx[e.quality],this.renderer=new Dg({canvas:t,antialias:!1,powerPreference:"high-performance",logarithmicDepthBuffer:!0,alpha:!1,stencil:!1,preserveDrawingBuffer:!0}),this.renderer.outputColorSpace=Ni,this.renderer.toneMapping=jn,this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=fh,this.renderer.autoClear=!0,this.renderer.info.autoReset=!1,this.camera=new gn(50,16/9,.4,6e4),Rv(this.camera),this.atmos=new m1(e.seed),e.time!==null&&(this.atmos.hour=e.time),e.weather&&this.atmos.setWeather(e.weather),this.metrics=new Kx(this.renderer)}renderer;scene=new oo;camera;atmos;quality;metrics;map;textures;terrain;water;sky;wakes;csm;post;roads;bridges;city;vegetation;props;traffic;aircraft;flightCamera;cull=new Iv;width=1;height=1;time=0;envTimer=0;lastEnvHour=-1;litMaterials=new Set;windVec=new P;registerLit(t){if(this.litMaterials.has(t))return;this.litMaterials.add(t);const e=t.onBeforeCompile;this.csm.setupMaterial(t);const n=t.onBeforeCompile;t.onBeforeCompile=(i,o)=>{n.call(t,i,o),e?.call(t,i,o)},t.needsUpdate=!0}registerTree(t){t.traverse(e=>{const n=e.material;if(n)for(const i of Array.isArray(n)?n:[n])i.isMeshStandardMaterial&&this.registerLit(i)})}async tick(t,e,n){t(e,n),await new Promise(i=>setTimeout(i,0))}async init(t){await this.tick(t,"Surveying the coastline",.02),this.map=new L1,this.map.generate(h=>t("Shaping islands and bays",.02+h*.3)),await this.tick(t,"Uploading terrain",.33),this.textures=new V1(this.map,this.renderer);const e=this.quality;this.csm=new l1({camera:this.camera,parent:this.scene,cascades:e.cascades,maxFar:e.shadowFar,mode:"practical",shadowMapSize:e.shadowMapSize,lightDirection:new P(.3,-1,.2).normalize(),lightIntensity:1,shadowBias:-2e-4,lightMargin:300}),this.csm.fade=!0,Lv(this.renderer,h=>this.csm.lights.indexOf(h)),this.sky=new G1(this.atmos,this.renderer,{cloudSteps:e.cloudSteps,scale:e.skyScale}),this.sky.dome.name="sky",this.scene.add(this.sky.dome),this.wakes=new ov(2048,3200),this.terrain=new Z1(this.textures),this.registerLit(this.terrain.material),this.terrain.group.name="terrain",this.scene.add(this.terrain.group),this.water=new sv(this.textures,this.wakes.texture),this.registerLit(this.water.material),this.water.mesh.name="water",this.scene.add(this.water.mesh),await this.tick(t,"Laying out streets",.4);const n=fv(this.map);this.roads=n.segments;const i=vv();this.registerLit(i);const o=this.params.debugRoads?new dc({color:16719904}):i;for(const h of gv(this.map,this.roads,o))h.name="roads",this.scene.add(h);await this.tick(t,"Raising bridges",.46);const r=new he({color:12104874,roughness:.9}),a=new he({color:14278114,roughness:.4,metalness:.6});this.registerLit(r),this.registerLit(a),this.bridges=Ev(this.map,o,r,a),this.bridges.group.name="bridges",this.scene.add(this.bridges.group),await this.tick(t,"Building the city",.52),this.city=Vv(this.map,n.blocksByDistrict,this.atmos.uniforms.uNight),this.registerLit(this.city.batches.material),this.city.batches.group.name="city",this.scene.add(this.city.batches.group);for(const h of this.roads){const d=Math.hypot(h.b[0]-h.a[0],h.b[1]-h.a[1]),u=Math.max(1,Math.ceil(d/10));for(let f=0;f<=u;f++)this.city.markOccupied(h.a[0]+(h.b[0]-h.a[0])*(f/u),h.a[1]+(h.b[1]-h.a[1])*(f/u),h.width*.5+3)}await this.tick(t,"Dressing harbours and airports",.66),this.props=new xx(this.map,this.roads,this.bridges.lampPositions,this.city.markOccupied);for(const h of this.props.materials)this.registerLit(h);this.props.group.name="props",this.scene.add(this.props.group),await this.tick(t,"Planting palms and mangroves",.74),this.vegetation=new ux(this.map,this.city.occupied);for(const h of this.vegetation.materials)this.registerLit(h);this.vegetation.group.name="vegetation",this.scene.add(this.vegetation.group),await this.tick(t,"Launching boats and traffic",.86),this.traffic=new bx(this.map,this.roads,this.bridges.routes,this.wakes.scene,this.params.seed,this.props.mooredBoatPositions);for(const h of this.traffic.materials)this.registerLit(h);this.traffic.group.name="traffic",this.scene.add(this.traffic.group);for(const h of this.traffic.contrailMeshes)h.name="contrail",this.scene.add(h);await this.tick(t,"Pre-flighting the aircraft",.92),this.aircraft=new jx((h,d)=>this.map.heightAt(h,d),this.scene,this.wakes.scene),this.registerTree(this.aircraft.model.root),this.flightCamera=new Zx(this.camera),this.flightCamera.groundHeight=(h,d)=>Math.max(0,this.map.heightAt(h,d));const c=this.map.pois.find(h=>h.kind==="seaplane");this.aircraft.place(c.x+120,1.6,c.z+60,Math.PI*.5,0,0,0,0),this.post=new dv(this.renderer,this.atmos,{samples:e.samples,bloom:e.bloom});const l=this.params.dbg;l.has("noterrain")&&(this.terrain.group.visible=!1),l.has("noshadow")&&(this.renderer.shadowMap.enabled=!1),l.has("noveg")&&(this.vegetation.group.visible=!1),l.has("nocity")&&(this.city.batches.group.visible=!1),l.has("nocloudshadow")&&(this.post.cloudShadowStrength=0),this.atmos.update(0),this.refreshEnvironment(),t("Ready",1)}refreshEnvironment(){const t=this.sky.updateEnvironment();this.scene.environment=t,this.scene.environmentIntensity=this.atmos.state.ambientIntensity,this.lastEnvHour=this.atmos.hour}setSize(t,e,n=1){this.width=t,this.height=e,this.renderer.setPixelRatio(n),this.renderer.setSize(t,e,!1),this.camera.aspect=t/e,this.camera.updateProjectionMatrix(),this.post.setSize(Math.round(t*n),Math.round(e*n)),this.csm.updateFrustums()}update(t,e=!0){this.time+=t,this.atmos.update(t);const n=this.atmos.state;this.csm.lightDirection.copy(n.sunDir).negate();for(const o of this.csm.lights)o.intensity=n.sunIntensity,o.color.copy(n.sunColor);this.envTimer+=t,(Math.abs(this.atmos.hour-this.lastEnvHour)>.02||this.envTimer>5)&&(this.envTimer=0,this.refreshEnvironment()),this.scene.environmentIntensity=n.ambientIntensity;const i=this.atmos.preset;this.windVec.set(this.atmos.windDir.x,0,this.atmos.windDir.y).multiplyScalar(i.windSpeed),this.vegetation.update(this.time,i.windSpeed),this.traffic.update(t,this.time,n.night),this.props.setNight(n.night),this.aircraft.update(t,this.time,n.night,this.windVec,i.turbulence,this.height,e)}render(){this.metrics.beginFrame(),this.renderer.info.reset();const t=this.camera;t.updateMatrixWorld();const e=t.position.x,n=t.position.z,i=Math.min(12e3,Math.max(this.quality.shadowFar,t.position.y*9));Math.abs(i-this.csm.maxFar)>200&&(this.csm.maxFar=i,this.csm.updateFrustums()),this.cull.update(t,this.csm.maxFar,this.atmos.state.sunDir),this.terrain.update(e,n),this.vegetation.updateLod(e,n,this.cull),this.city.batches.updateLod(e,n,this.cull),this.props.updateLod(e,n,this.cull),this.traffic.updateCulling(this.cull),this.water.update(e,n,this.time,this.atmos.preset.windSpeed,this.atmos.windDir,this.atmos.state.sunDir,this.wakes.center,this.wakes.size),this.wakes.render(this.renderer,e,n),this.csm.update();for(const o of this.csm.lights){const r=o.shadow.camera,a=(r.right-r.left)/o.shadow.mapSize.width;o.shadow.normalBias=a*1.5,o.shadow.bias=-2e-4}this.sky.render(this.renderer,t,this.post.width,this.post.height),this.renderer.setRenderTarget(this.post.target),this.renderer.render(this.scene,t),this.post.finish(t,this.time),this.metrics.endFrame()}}const t_=.22,e_=.15;function ca(s,t,e){const n=Math.abs(t)<Math.abs(s)-1e-6&&(t===0||Math.sign(t)===Math.sign(s)),i=e/(n?e_:t_),o=t-s;return Math.abs(o)<=i?t:s+Math.sign(o)*i}class n_{constructor(t){this.canvas=t,window.addEventListener("keydown",e=>{e.repeat||(this.keys.add(e.code),this.pressed.add(e.code),["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)&&e.preventDefault())}),window.addEventListener("keyup",e=>this.keys.delete(e.code)),window.addEventListener("blur",()=>this.keys.clear()),t.addEventListener("mousedown",e=>{this.dragging=!0,this.lastX=e.clientX,this.lastY=e.clientY}),window.addEventListener("mouseup",()=>{this.dragging=!1}),window.addEventListener("mousemove",e=>{this.dragging&&(this.orbitYaw-=(e.clientX-this.lastX)*.006,this.orbitPitch+=(e.clientY-this.lastY)*.005,this.orbitPitch=Math.max(-1.2,Math.min(1.2,this.orbitPitch)),this.lastX=e.clientX,this.lastY=e.clientY)}),t.addEventListener("wheel",e=>{this.flight.throttle=Math.max(0,Math.min(1,this.flight.throttle-Math.sign(e.deltaY)*.05)),e.preventDefault()},{passive:!1})}keys=new Set;flight={throttle:0,pitch:0,roll:0,yaw:0,flaps:0,brake:!1};targetPitch=0;targetRoll=0;targetYaw=0;cmdPitch=0;cmdRoll=0;cmdYaw=0;orbitYaw=0;orbitPitch=0;dragging=!1;lastX=0;lastY=0;pressed=new Set;enabled=!0;down(t){return this.keys.has(t)}consume(t){const e=this.pressed.has(t);return this.pressed.delete(t),e}update(t){if(!this.enabled){this.pressed.clear();return}const e=this.flight,n=(c,l)=>(this.down(c)?1:0)-(this.down(l)?1:0);this.targetPitch=n("KeyS","KeyW")+n("ArrowDown","ArrowUp"),this.targetRoll=n("KeyD","KeyA")+n("ArrowRight","ArrowLeft"),this.targetYaw=n("KeyE","KeyQ");const i=navigator.getGamepads?navigator.getGamepads():[],o=i&&i[0];if(o){const c=l=>Math.abs(l)<.08?0:l;this.targetRoll+=c(o.axes[0]??0),this.targetPitch+=c(o.axes[1]??0),this.targetYaw+=c(o.axes[2]??0),o.buttons[7]?.value&&(e.throttle=Math.min(1,e.throttle+o.buttons[7].value*t*.8)),o.buttons[6]?.value&&(e.throttle=Math.max(0,e.throttle-o.buttons[6].value*t*.8))}const r=c=>Math.max(-1,Math.min(1,c));this.cmdPitch=ca(this.cmdPitch,r(this.targetPitch),t),this.cmdRoll=ca(this.cmdRoll,r(this.targetRoll),t),this.cmdYaw=ca(this.cmdYaw,r(this.targetYaw),t);const a=1-Math.exp(-t*25);e.pitch+=(this.cmdPitch-e.pitch)*a,e.roll+=(this.cmdRoll-e.roll)*a,e.yaw+=(this.cmdYaw-e.yaw)*a,(this.down("ShiftLeft")||this.down("ShiftRight"))&&(e.throttle=Math.min(1,e.throttle+t*.55)),(this.down("ControlLeft")||this.down("ControlRight"))&&(e.throttle=Math.max(0,e.throttle-t*.55)),this.consume("KeyF")&&(e.flaps=e.flaps>.5?0:e.flaps>0?1:.5),e.brake=this.down("KeyB")||this.down("Space"),this.dragging||(this.orbitYaw*=Math.exp(-t*2.2),this.orbitPitch*=Math.exp(-t*2.2))}}const mn=s=>document.getElementById(s);class i_{root=mn("hud");speed=mn("hud-speed-val");alt=mn("hud-alt-val");vs=mn("hud-vs-val");heading=mn("hud-heading-val");card=mn("hud-heading-card");thrFill=mn("hud-throttle-fill");thrVal=mn("hud-throttle-val");rpm=mn("hud-rpm-val");stall=mn("hud-stall");msg=mn("hud-msg");cam=mn("hud-cam");time=mn("hud-time");visible=!0;msgTimer=0;wasCrashed=!1;show(t){this.visible=t,this.root.classList.toggle("hidden",!t)}toggle(){this.show(!this.visible)}flash(t,e=2.5){this.msg.textContent=t,this.msgTimer=e}update(t,e,n,i,o){if(!this.visible)return;this.speed.textContent=Math.round(t.airspeed*1.9438).toString(),this.alt.textContent=Math.round(t.altitude*3.2808).toString();const r=Math.round(t.verticalSpeed*196.85/50)*50;this.vs.textContent=(r>0?"+":"")+r.toString();const a=Math.round(t.heading)%360;this.heading.textContent=a.toString().padStart(3,"0");const c=["N","NE","E","SE","S","SW","W","NW"];this.card.textContent=c[Math.round(a/45)%8],this.thrFill.style.width=`${Math.round(e*100)}%`,this.thrVal.textContent=`${Math.round(e*100)}%`,this.rpm.textContent=Math.round(600+t.rpm*2e3).toString(),this.stall.classList.toggle("hidden",!t.stalled),t.crashed&&!this.wasCrashed&&this.flash("Crashed — aircraft reset upright on the surface. Throttle up to go again.",5),this.wasCrashed=t.crashed,this.cam.textContent=n.toUpperCase();const l=Math.floor(i)%24,h=Math.floor(i%1*60);this.time.textContent=`${l.toString().padStart(2,"0")}:${h.toString().padStart(2,"0")}`,this.msgTimer>0&&(this.msgTimer-=o,this.msgTimer<=0&&(this.msg.textContent=""))}}const Ec=[{id:"aerial-a",name:"Reference A — high aerial",description:"Reference-style wide aerial over Isla Garza looking north: causeway receding NNE, downtown skyline upper-left, boats with wakes below, aircraft lower right.",time:14.6,weather:"scattered",camera:{mode:"fixed",pos:[480,400,3720],headingDeg:-6,pitchDeg:-11,fov:42},plane:{fromCamera:{screenX:.77,screenY:.73,distance:44},headingDeg:200,pitchDeg:2,bankDeg:-14,speed:52,throttle:.75},presim:40,clipInputs:{pitch:.05,roll:-.05,yaw:0}},{id:"cockpit-city",name:"Cockpit approaching the city",description:"From the pilot seat, downtown ahead beyond the bay, instrument panel and windshield frame in view.",time:10.5,weather:"clear",camera:{mode:"cockpit",fov:50},plane:{pos:[-900,320,1400],headingDeg:342,pitchDeg:1,bankDeg:0,speed:58,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"bridge-low",name:"Low-altitude bridge flyover",description:"Chase view 45 m over the northern causeway arch, traffic on the deck, piers meeting the water.",time:15.5,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[-1950,52,-3740],headingDeg:96,pitchDeg:0,bankDeg:4,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:.05,yaw:0}},{id:"skyline-high",name:"High-altitude skyline",description:"Fixed camera 900 m up over the bay looking north-west at the downtown skyline hierarchy, port in the middle distance.",time:16.2,weather:"scattered",camera:{mode:"fixed",pos:[-300,900,-1200],headingDeg:-38,pitchDeg:-10,fov:45},plane:{fromCamera:{screenX:.72,screenY:.68,distance:70},headingDeg:-30,pitchDeg:0,bankDeg:12,speed:60,throttle:.7},presim:30,clipInputs:{pitch:0,roll:.1,yaw:0}},{id:"island-pass",name:"Coastal island pass",description:"Low along the barrier island ocean beach: hotels left, surf and shallows right, dunes and palms below.",time:11.5,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[3350,130,-2200],headingDeg:352,pitchDeg:0,bankDeg:-6,speed:52,throttle:.65},presim:30,clipInputs:{pitch:0,roll:-.05,yaw:0}},{id:"harbor",name:"Harbor and marina pass",description:"Over the port: container cranes, cruise terminal, ship channel and the downtown marina beyond.",time:9.5,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[-2100,160,-2500],headingDeg:52,pitchDeg:0,bankDeg:0,speed:50,throttle:.65},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"water-landing",name:"Seaplane water approach",description:"Final approach a few metres above the Garza channel, floats about to touch: foam, wake and spray.",time:13,weather:"clear",camera:{mode:"chase",fov:48},plane:{pos:[-500,5.5,3330],headingDeg:86,pitchDeg:4,bankDeg:0,speed:29,throttle:.25,flaps:1},presim:30,clipInputs:{pitch:.12,roll:0,yaw:0}},{id:"sunset",name:"Sunset flight",description:"Low sun in the west over the bay, downtown silhouetted, warm haze and long water reflections.",time:17.9,weather:"scattered",camera:{mode:"chase",fov:50},plane:{pos:[1400,280,600],headingDeg:262,pitchDeg:1,bankDeg:0,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"cloudy",name:"Cloudy-weather flight",description:"Heavy cumulus and grey haze over Isla Garza; softer light, cloud shadows moving across the water.",time:15,weather:"cloudy",camera:{mode:"chase",fov:50},plane:{pos:[700,300,3100],headingDeg:335,pitchDeg:0,bankDeg:0,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"night",name:"Night flight with city lights",description:"Over the bay at 22:00 looking toward downtown: lit windows, street lamps, headlights and navigation strobes.",time:22,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[-400,320,-900],headingDeg:318,pitchDeg:0,bankDeg:0,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}}];Ec.push({id:"plane-rear-quarter",name:"Aircraft rear three-quarter",description:"Fixed camera 14 m from the aircraft, rear-left-above, aircraft moored at the Garza marina in sunlight.",time:14,weather:"clear",camera:{mode:"fixed",pos:[425.9,4.25,1892.3],headingDeg:205,pitchDeg:-9,fov:40},plane:{pos:[420,1.96,1905],headingDeg:240,pitchDeg:0,bankDeg:0,speed:0,throttle:0},presim:10,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"plane-front-quarter",name:"Aircraft front three-quarter",description:"Fixed camera 13 m ahead-right of the moored aircraft, low, showing cowl, propeller, windshield and floats.",time:10,weather:"clear",camera:{mode:"fixed",pos:[415.6,2.65,1917.2],headingDeg:20,pitchDeg:-3,fov:40},plane:{pos:[420,1.96,1905],headingDeg:240,pitchDeg:0,bankDeg:0,speed:0,throttle:0},presim:10,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"glass-sun",name:"Cockpit glass in direct sun",description:"Close on the windshield and left side windows with the sun behind the camera; interior visible through the glass.",time:15.5,weather:"clear",camera:{mode:"fixed",pos:[418.3,3.05,1911.3],headingDeg:15,pitchDeg:-8,fov:32},plane:{pos:[420,1.96,1905],headingDeg:240,pitchDeg:0,bankDeg:0,speed:0,throttle:0},presim:10,clipInputs:{pitch:0,roll:0,yaw:0}});function s_(s){return Ec.find(t=>t.id===s)}class o_{constructor(t){this.game=t}view=null;fixedDt=1/30;frame=0;flying=!1;list(){return Ec.map(t=>({id:t.id,name:t.name,description:t.description}))}setup(t){const e=s_(t);if(!e)return!1;this.view=e;const n=this.game;n.atmos.hour=e.time,n.atmos.setWeather(e.weather),n.time=0,this.placePlane(e);for(let i=0;i<Math.round(e.presim/this.fixedDt);i++)n.update(this.fixedDt,!1);return this.placePlane(e),this.setupCamera(e),n.aircraft.inputs.throttle=e.plane.throttle,n.aircraft.inputs.flaps=e.plane.flaps??0,n.aircraft.inputs.pitch=e.clipInputs.pitch,n.aircraft.inputs.roll=e.clipInputs.roll,n.aircraft.inputs.yaw=e.clipInputs.yaw,n.update(this.fixedDt,!1),this.updateCamera(this.fixedDt),this.flying=!1,this.frame=0,n.metrics.reset(),!0}placePlane(t){const e=this.game,n=t.plane;let i;if(n.fromCamera&&t.camera.pos){const r=this.fixedCamera(t),a=n.fromCamera.screenX*2-1,c=1-n.fromCamera.screenY*2,l=new P(a,c,.5).unproject(r).sub(r.position).normalize(),h=r.position.clone().addScaledVector(l,n.fromCamera.distance);i=[h.x,h.y,h.z]}else i=n.pos;const o=r=>r*Math.PI/180;e.aircraft.place(i[0],i[1],i[2],o(n.headingDeg),o(n.pitchDeg),o(n.bankDeg),n.speed,n.throttle)}fixedCamera(t){const e=new gn(t.camera.fov,this.game.camera.aspect,.4,6e4),[n,i,o]=t.camera.pos;e.position.set(n,i,o);const r=(t.camera.headingDeg??0)*Math.PI/180,a=(t.camera.pitchDeg??0)*Math.PI/180;return e.rotation.set(0,0,0),e.rotation.order="YXZ",e.rotation.y=-r,e.rotation.x=a,e.updateMatrixWorld(),e.updateProjectionMatrix(),e}setupCamera(t){const e=this.game,n=e.flightCamera;if(n.baseFov=t.camera.fov,n.orbitPitch=0,n.orbitYaw=0,t.camera.mode==="fixed"){n.mode="fixed";const i=this.fixedCamera(t);e.camera.position.copy(i.position),e.camera.quaternion.copy(i.quaternion),e.camera.fov=t.camera.fov,e.camera.updateProjectionMatrix()}else{n.mode=t.camera.mode,n.snap();for(let i=0;i<120;i++)n.update(e.aircraft.flight,e.aircraft.model,this.fixedDt)}}updateCamera(t){this.game.flightCamera.update(this.game.aircraft.flight,this.game.aircraft.model,t)}step(t=1){const e=this.game;for(let n=0;n<t;n++)e.update(this.fixedDt,!0),this.updateCamera(this.fixedDt),this.frame++;this.flying=!0,e.render()}render(){this.game.render()}renderSync(){const t=this.game.renderer.getContext(),e=performance.now();this.game.render(),t.finish();const n=new Uint8Array(4);return t.readPixels(0,0,1,1,t.RGBA,t.UNSIGNED_BYTE,n),performance.now()-e}profile(t=20){const e=[];for(let o=0;o<t;o++)this.game.update(this.fixedDt,!0),this.updateCamera(this.fixedDt),e.push(this.renderSync());const n=e.slice().sort((o,r)=>o-r),i=n.reduce((o,r)=>o+r,0)/n.length;return{frames:t,avgMs:i,minMs:n[0],maxMs:n[n.length-1],p95Ms:n[Math.floor(n.length*.95)],onePercentLowMs:n[n.length-1]}}metrics(){const t=this.game.metrics.snapshot(),e=this.game.aircraft.flight.telemetry;return{...t,frame:this.frame,flying:this.flying,telemetry:{airspeed:e.airspeed,altitude:e.altitude,heading:e.heading,alpha:e.alpha,stalled:e.stalled,onWater:e.onWater},build:window.__build,view:this.view?.id??null,camera:{pos:this.game.camera.position.toArray(),quat:this.game.camera.quaternion.toArray(),fov:this.game.camera.fov}}}project(t,e,n){const i=new P(t,e,n).project(this.game.camera);return i.z>1?null:[(i.x+1)/2,(1-i.y)/2]}landmarks(){const t=this.game,e=t.map.bridges.find(c=>c.id==="garza-bridge"),n=e.pts[0],i=e.pts[e.pts.length-1],o=t.aircraft.flight.position,r={planeCentroid:this.project(o.x,o.y,o.z),bridgeStart:this.project(n[0],7,n[1]),bridgeEnd:this.project(i[0],7,i[1])};for(const c of t.city.landmarkPositions)r[`landmark:${c.name}`]=this.project(c.x,c.h,c.z);const a=t.map.bridges.find(c=>c.id==="tortuga-bridge");return a&&(r.bridge2End=this.project(a.pts[a.pts.length-1][0],7,a.pts[a.pts.length-1][1])),r.horizonCentre=this.project(t.camera.position.x+Math.sin(0)*5e4,0,t.camera.position.z-5e4),r}}window.__build="a73e7fb62028-20260904T202825Z";async function r_(){const s=mu(),t=document.getElementById("view"),e=document.getElementById("start-status"),n=document.getElementById("start-btn"),i=document.getElementById("start");n.disabled=!0;const o=new Qx(t,s);window.__game=o;const r=(g,m)=>{e.textContent=`${g}… ${Math.round(m*100)}%`};await o.init(r);const a=()=>{const g=s.width??window.innerWidth,m=s.height??window.innerHeight;s.width&&(t.style.width=`${g}px`,t.style.height=`${m}px`),o.setSize(g,m,s.width?1:Math.min(window.devicePixelRatio,1.5))};window.addEventListener("resize",a),a();const c=new i_,l=new n_(t),h=new o_(o);if(window.__bench=h,e.textContent=`Build ${window.__build}`,n.disabled=!1,s.bench){if(i.classList.add("hidden"),c.show(!s.noHud),!h.setup(s.bench)){e.textContent=`Unknown bench view ${s.bench}`;return}const m=document.getElementById("benchtag");m.classList.remove("hidden"),m.textContent=`${s.bench} · seed ${s.seed} · ${window.__build}`,s.noHud&&m.classList.add("hidden");const w=()=>{h.render();const y=o.aircraft.flight.telemetry;c.update(y,o.aircraft.inputs.throttle,o.flightCamera.mode,o.atmos.hour,0),window.__ready=!0,window.__benchReady=!0,s.freeze||requestAnimationFrame(w)};w();return}let d=!1;const u=()=>{d||(d=!0,i.classList.add("hidden"),c.show(!0),c.flash("Full throttle (Shift) to take off. S pulls the nose up once above 55 KIAS.",6),o.aircraft.inputs.throttle=0,o.flightCamera.mode="chase",o.flightCamera.snap())};n.addEventListener("click",u),window.addEventListener("keydown",g=>{g.code==="Enter"&&!d&&u()}),s.autostart&&u();let f=performance.now(),p=0;const x=()=>{const g=performance.now();let m=s.fixedDt??Math.min(.1,(g-f)/1e3);if(f=g,s.freeze&&(m=0),l.update(m),d){const v=l.flight,T=o.aircraft.inputs;if(T.throttle=v.throttle,T.pitch=v.pitch,T.roll=v.roll,T.yaw=v.yaw,T.flaps=v.flaps,T.brake=v.brake,l.consume("KeyC")&&(o.flightCamera.mode=o.flightCamera.mode==="chase"?"cockpit":"chase",o.flightCamera.snap()),l.consume("KeyV")&&(o.flightCamera.mode="cockpit",o.flightCamera.snap()),l.consume("KeyH")&&c.toggle(),l.consume("KeyT")&&(o.atmos.hour=(o.atmos.hour+2)%24,c.flash(`Time ${Math.floor(o.atmos.hour)}:00`)),l.consume("KeyY")){const M=["clear","scattered","cloudy","storm"],E=(M.indexOf(o.atmos.weather)+1)%M.length;o.atmos.setWeather(M[E]),c.flash(`Weather: ${M[E]}`)}if(l.consume("KeyR")){const M=o.map.pois.find(E=>E.kind==="seaplane");o.aircraft.place(M.x+120,1.6,M.z+60,Math.PI*.5,0,0,0,0),v.throttle=0,o.flightCamera.snap(),c.flash("Reset to the seaplane base")}l.consume("KeyG")&&(o.aircraft.place(o.aircraft.flight.position.x,350,o.aircraft.flight.position.z,Math.PI*.5,0,0,55,.7),v.throttle=.7,c.flash("Airborne at 350 m")),o.flightCamera.orbitYaw=l.orbitYaw,o.flightCamera.orbitPitch=l.orbitPitch}p+=m;const w=1/60;let y=0;for(;p>=w&&y<8;)o.update(w,d),p-=w,y++;y===8&&(p=0),o.flightCamera.update(o.aircraft.flight,o.aircraft.model,m),o.render(),c.update(o.aircraft.flight.telemetry,o.aircraft.inputs.throttle,o.flightCamera.mode,o.atmos.hour,m),window.__ready=!0,requestAnimationFrame(x)};o.update(0,!1),o.flightCamera.update(o.aircraft.flight,o.aircraft.model,1/60),x()}r_().catch(s=>{console.error(s);const t=document.getElementById("start-status");t&&(t.textContent=`Failed to start: ${s.message}`)});
