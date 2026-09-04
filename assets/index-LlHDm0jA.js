(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function e(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(s){if(s.ep)return;s.ep=!0;const r=e(s);fetch(s.href,r)}})();function Dl(){const i=new URLSearchParams(window.location.search),t=n=>{const s=i.get(n);if(s===null||s==="")return null;if(s.includes("/")){const[o,a]=s.split("/").map(Number);return a?o/a:null}const r=Number(s);return Number.isFinite(r)?r:null},e=i.get("quality")??"high";return{bench:i.get("bench"),seed:t("seed")??20260904,time:t("time"),weather:i.get("weather")??null,quality:["low","medium","high","ultra"].includes(e)?e:"high",freeze:i.get("freeze")==="1",fixedDt:t("dt"),noHud:i.get("nohud")==="1",width:t("w"),height:t("h"),autostart:i.get("autostart")==="1"||i.get("bench")!==null,grid:i.get("grid")==="1",debug:i.get("debug")==="1",debugRoads:i.get("debugroads")==="1",dbg:new Set((i.get("dbg")??"").split(",").filter(Boolean))}}/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Go="170",Il=0,ya=1,Ul=2,kc=1,Hc=2,En=3,Xn=0,De=1,Fe=2,Wn=0,Pn=1,wa=2,Sa=3,ba=4,Nl=5,ii=100,zl=101,Fl=102,Ol=103,Bl=104,kl=200,Hl=201,Vl=202,Gl=203,to=204,eo=205,Wl=206,Xl=207,ql=208,Yl=209,$l=210,Zl=211,Kl=212,jl=213,Jl=214,no=0,io=1,so=2,Ui=3,ro=4,oo=5,ao=6,co=7,Vc=0,Ql=1,th=2,Ln=0,eh=1,nh=2,ih=3,sh=4,rh=5,oh=6,ah=7,Gc=300,Ni=301,zi=302,lo=303,ho=304,or=306,Fi=1e3,mn=1001,uo=1002,Oe=1003,ch=1004,vs=1005,ue=1006,fr=1007,ri=1008,en=1009,Wc=1010,Xc=1011,hs=1012,Wo=1013,qn=1014,ln=1015,hn=1016,Xo=1017,qo=1018,Oi=1020,qc=35902,Yc=1021,$c=1022,$e=1023,Zc=1024,Kc=1025,Di=1026,Bi=1027,us=1028,Yo=1029,jc=1030,$o=1031,Zo=1033,Ks=33776,js=33777,Js=33778,Qs=33779,fo=35840,po=35841,mo=35842,go=35843,vo=36196,_o=37492,xo=37496,Mo=37808,yo=37809,wo=37810,So=37811,bo=37812,Eo=37813,To=37814,Ao=37815,Co=37816,Ro=37817,Po=37818,Lo=37819,Do=37820,Io=37821,tr=36492,Uo=36494,No=36495,Jc=36283,zo=36284,Fo=36285,Oo=36286,lh=3200,hh=3201,Qc=0,uh=1,An="",ze="srgb",oi="srgb-linear",ar="linear",ce="srgb",li=7680,Ea=519,dh=512,fh=513,ph=514,tl=515,mh=516,gh=517,vh=518,_h=519,Ta=35044,Aa="300 es",Rn=2e3,ir=2001;class Gi{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){if(this._listeners===void 0)return!1;const n=this._listeners;return n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){if(this._listeners===void 0)return;const s=this._listeners[t];if(s!==void 0){const r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){if(this._listeners===void 0)return;const n=this._listeners[t.type];if(n!==void 0){t.target=this;const s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,t);t.target=null}}}const Pe=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Ca=1234567;const rs=Math.PI/180,ds=180/Math.PI;function Wi(){const i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Pe[i&255]+Pe[i>>8&255]+Pe[i>>16&255]+Pe[i>>24&255]+"-"+Pe[t&255]+Pe[t>>8&255]+"-"+Pe[t>>16&15|64]+Pe[t>>24&255]+"-"+Pe[e&63|128]+Pe[e>>8&255]+"-"+Pe[e>>16&255]+Pe[e>>24&255]+Pe[n&255]+Pe[n>>8&255]+Pe[n>>16&255]+Pe[n>>24&255]).toLowerCase()}function we(i,t,e){return Math.max(t,Math.min(e,i))}function Ko(i,t){return(i%t+t)%t}function xh(i,t,e,n,s){return n+(i-t)*(s-n)/(e-t)}function Mh(i,t,e){return i!==t?(e-i)/(t-i):0}function os(i,t,e){return(1-e)*i+e*t}function yh(i,t,e,n){return os(i,t,1-Math.exp(-e*n))}function wh(i,t=1){return t-Math.abs(Ko(i,t*2)-t)}function Sh(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*(3-2*i))}function bh(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*i*(i*(i*6-15)+10))}function Eh(i,t){return i+Math.floor(Math.random()*(t-i+1))}function Th(i,t){return i+Math.random()*(t-i)}function Ah(i){return i*(.5-Math.random())}function Ch(i){i!==void 0&&(Ca=i);let t=Ca+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function Rh(i){return i*rs}function Ph(i){return i*ds}function Lh(i){return(i&i-1)===0&&i!==0}function Dh(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Ih(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function Uh(i,t,e,n,s){const r=Math.cos,o=Math.sin,a=r(e/2),c=o(e/2),l=r((t+n)/2),h=o((t+n)/2),d=r((t-n)/2),u=o((t-n)/2),f=r((n-t)/2),g=o((n-t)/2);switch(s){case"XYX":i.set(a*h,c*d,c*u,a*l);break;case"YZY":i.set(c*u,a*h,c*d,a*l);break;case"ZXZ":i.set(c*d,c*u,a*h,a*l);break;case"XZX":i.set(a*h,c*g,c*f,a*l);break;case"YXY":i.set(c*f,a*h,c*g,a*l);break;case"ZYZ":i.set(c*g,c*f,a*h,a*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function Ci(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function Ue(i,t){switch(t.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const el={DEG2RAD:rs,RAD2DEG:ds,generateUUID:Wi,clamp:we,euclideanModulo:Ko,mapLinear:xh,inverseLerp:Mh,lerp:os,damp:yh,pingpong:wh,smoothstep:Sh,smootherstep:bh,randInt:Eh,randFloat:Th,randFloatSpread:Ah,seededRandom:Ch,degToRad:Rh,radToDeg:Ph,isPowerOfTwo:Lh,ceilPowerOfTwo:Dh,floorPowerOfTwo:Ih,setQuaternionFromProperEuler:Uh,normalize:Ue,denormalize:Ci};class wt{constructor(t=0,e=0){wt.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(we(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*n-o*s+t.x,this.y=r*s+o*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Zt{constructor(t,e,n,s,r,o,a,c,l){Zt.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,c,l)}set(t,e,n,s,r,o,a,c,l){const h=this.elements;return h[0]=t,h[1]=s,h[2]=a,h[3]=e,h[4]=r,h[5]=c,h[6]=n,h[7]=o,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[3],c=n[6],l=n[1],h=n[4],d=n[7],u=n[2],f=n[5],g=n[8],v=s[0],m=s[3],p=s[6],y=s[1],_=s[4],x=s[7],E=s[2],b=s[5],C=s[8];return r[0]=o*v+a*y+c*E,r[3]=o*m+a*_+c*b,r[6]=o*p+a*x+c*C,r[1]=l*v+h*y+d*E,r[4]=l*m+h*_+d*b,r[7]=l*p+h*x+d*C,r[2]=u*v+f*y+g*E,r[5]=u*m+f*_+g*b,r[8]=u*p+f*x+g*C,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],c=t[6],l=t[7],h=t[8];return e*o*h-e*a*l-n*r*h+n*a*c+s*r*l-s*o*c}invert(){const t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],c=t[6],l=t[7],h=t[8],d=h*o-a*l,u=a*c-h*r,f=l*r-o*c,g=e*d+n*u+s*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const v=1/g;return t[0]=d*v,t[1]=(s*l-h*n)*v,t[2]=(a*n-s*o)*v,t[3]=u*v,t[4]=(h*e-s*c)*v,t[5]=(s*r-a*e)*v,t[6]=f*v,t[7]=(n*c-l*e)*v,t[8]=(o*e-n*r)*v,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,o,a){const c=Math.cos(r),l=Math.sin(r);return this.set(n*c,n*l,-n*(c*o+l*a)+o+t,-s*l,s*c,-s*(-l*o+c*a)+a+e,0,0,1),this}scale(t,e){return this.premultiply(pr.makeScale(t,e)),this}rotate(t){return this.premultiply(pr.makeRotation(-t)),this}translate(t,e){return this.premultiply(pr.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const pr=new Zt;function nl(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function sr(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Nh(){const i=sr("canvas");return i.style.display="block",i}const Ra={};function is(i){i in Ra||(Ra[i]=!0,console.warn(i))}function zh(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}function Fh(i){const t=i.elements;t[2]=.5*t[2]+.5*t[3],t[6]=.5*t[6]+.5*t[7],t[10]=.5*t[10]+.5*t[11],t[14]=.5*t[14]+.5*t[15]}function Oh(i){const t=i.elements;t[11]===-1?(t[10]=-t[10]-1,t[14]=-t[14]):(t[10]=-t[10],t[14]=-t[14]+1)}const te={enabled:!0,workingColorSpace:oi,spaces:{},convert:function(i,t,e){return this.enabled===!1||t===e||!t||!e||(this.spaces[t].transfer===ce&&(i.r=Dn(i.r),i.g=Dn(i.g),i.b=Dn(i.b)),this.spaces[t].primaries!==this.spaces[e].primaries&&(i.applyMatrix3(this.spaces[t].toXYZ),i.applyMatrix3(this.spaces[e].fromXYZ)),this.spaces[e].transfer===ce&&(i.r=Ii(i.r),i.g=Ii(i.g),i.b=Ii(i.b))),i},fromWorkingColorSpace:function(i,t){return this.convert(i,this.workingColorSpace,t)},toWorkingColorSpace:function(i,t){return this.convert(i,t,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===An?ar:this.spaces[i].transfer},getLuminanceCoefficients:function(i,t=this.workingColorSpace){return i.fromArray(this.spaces[t].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,t,e){return i.copy(this.spaces[t].toXYZ).multiply(this.spaces[e].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace}};function Dn(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Ii(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}const Pa=[.64,.33,.3,.6,.15,.06],La=[.2126,.7152,.0722],Da=[.3127,.329],Ia=new Zt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Ua=new Zt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);te.define({[oi]:{primaries:Pa,whitePoint:Da,transfer:ar,toXYZ:Ia,fromXYZ:Ua,luminanceCoefficients:La,workingColorSpaceConfig:{unpackColorSpace:ze},outputColorSpaceConfig:{drawingBufferColorSpace:ze}},[ze]:{primaries:Pa,whitePoint:Da,transfer:ce,toXYZ:Ia,fromXYZ:Ua,luminanceCoefficients:La,outputColorSpaceConfig:{drawingBufferColorSpace:ze}}});let hi;class Bh{static getDataURL(t){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let e;if(t instanceof HTMLCanvasElement)e=t;else{hi===void 0&&(hi=sr("canvas")),hi.width=t.width,hi.height=t.height;const n=hi.getContext("2d");t instanceof ImageData?n.putImageData(t,0,0):n.drawImage(t,0,0,t.width,t.height),e=hi}return e.width>2048||e.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",t),e.toDataURL("image/jpeg",.6)):e.toDataURL("image/png")}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=sr("canvas");e.width=t.width,e.height=t.height;const n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);const s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=Dn(r[o]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){const e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Dn(e[n]/255)*255):e[n]=Dn(e[n]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let kh=0;class il{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:kh++}),this.uuid=Wi(),this.data=t,this.dataReady=!0,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(mr(s[o].image)):r.push(mr(s[o]))}else r=mr(s);n.url=r}return e||(t.images[this.uuid]=n),n}}function mr(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Bh.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let Hh=0;class Ie extends Gi{constructor(t=Ie.DEFAULT_IMAGE,e=Ie.DEFAULT_MAPPING,n=mn,s=mn,r=ue,o=ri,a=$e,c=en,l=Ie.DEFAULT_ANISOTROPY,h=An){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Hh++}),this.uuid=Wi(),this.name="",this.source=new il(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=c,this.offset=new wt(0,0),this.repeat=new wt(1,1),this.center=new wt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Zt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Gc)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case Fi:t.x=t.x-Math.floor(t.x);break;case mn:t.x=t.x<0?0:1;break;case uo:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case Fi:t.y=t.y-Math.floor(t.y);break;case mn:t.y=t.y<0?0:1;break;case uo:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}Ie.DEFAULT_IMAGE=null;Ie.DEFAULT_MAPPING=Gc;Ie.DEFAULT_ANISOTROPY=1;class ge{constructor(t=0,e=0,n=0,s=1){ge.prototype.isVector4=!0,this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,n=this.y,s=this.z,r=this.w,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*e+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*e+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*e+o[7]*n+o[11]*s+o[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r;const c=t.elements,l=c[0],h=c[4],d=c[8],u=c[1],f=c[5],g=c[9],v=c[2],m=c[6],p=c[10];if(Math.abs(h-u)<.01&&Math.abs(d-v)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+v)<.1&&Math.abs(g+m)<.1&&Math.abs(l+f+p-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const _=(l+1)/2,x=(f+1)/2,E=(p+1)/2,b=(h+u)/4,C=(d+v)/4,R=(g+m)/4;return _>x&&_>E?_<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(_),s=b/n,r=C/n):x>E?x<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(x),n=b/s,r=R/s):E<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(E),n=C/r,s=R/r),this.set(n,s,r,e),this}let y=Math.sqrt((m-g)*(m-g)+(d-v)*(d-v)+(u-h)*(u-h));return Math.abs(y)<.001&&(y=1),this.x=(m-g)/y,this.y=(d-v)/y,this.z=(u-h)/y,this.w=Math.acos((l+f+p-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this.w=Math.max(t.w,Math.min(e.w,this.w)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this.w=Math.max(t,Math.min(e,this.w)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Vh extends Gi{constructor(t=1,e=1,n={}){super(),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=1,this.scissor=new ge(0,0,t,e),this.scissorTest=!1,this.viewport=new ge(0,0,t,e);const s={width:t,height:e,depth:1};n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:ue,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},n);const r=new Ie(s,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace);r.flipY=!1,r.generateMipmaps=n.generateMipmaps,r.internalFormat=n.internalFormat,this.textures=[];const o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0;this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.depthTexture=n.depthTexture,this.samples=n.samples}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n;this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let n=0,s=t.textures.length;n<s;n++)this.textures[n]=t.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0;const e=Object.assign({},t.texture.image);return this.texture.source=new il(e),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Ze extends Vh{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}}class sl extends Ie{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=Oe,this.minFilter=Oe,this.wrapR=mn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class rl extends Ie{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=Oe,this.minFilter=Oe,this.wrapR=mn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Se{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,o,a){let c=n[s+0],l=n[s+1],h=n[s+2],d=n[s+3];const u=r[o+0],f=r[o+1],g=r[o+2],v=r[o+3];if(a===0){t[e+0]=c,t[e+1]=l,t[e+2]=h,t[e+3]=d;return}if(a===1){t[e+0]=u,t[e+1]=f,t[e+2]=g,t[e+3]=v;return}if(d!==v||c!==u||l!==f||h!==g){let m=1-a;const p=c*u+l*f+h*g+d*v,y=p>=0?1:-1,_=1-p*p;if(_>Number.EPSILON){const E=Math.sqrt(_),b=Math.atan2(E,p*y);m=Math.sin(m*b)/E,a=Math.sin(a*b)/E}const x=a*y;if(c=c*m+u*x,l=l*m+f*x,h=h*m+g*x,d=d*m+v*x,m===1-a){const E=1/Math.sqrt(c*c+l*l+h*h+d*d);c*=E,l*=E,h*=E,d*=E}}t[e]=c,t[e+1]=l,t[e+2]=h,t[e+3]=d}static multiplyQuaternionsFlat(t,e,n,s,r,o){const a=n[s],c=n[s+1],l=n[s+2],h=n[s+3],d=r[o],u=r[o+1],f=r[o+2],g=r[o+3];return t[e]=a*g+h*d+c*f-l*u,t[e+1]=c*g+h*u+l*d-a*f,t[e+2]=l*g+h*f+a*u-c*d,t[e+3]=h*g-a*d-c*u-l*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const n=t._x,s=t._y,r=t._z,o=t._order,a=Math.cos,c=Math.sin,l=a(n/2),h=a(s/2),d=a(r/2),u=c(n/2),f=c(s/2),g=c(r/2);switch(o){case"XYZ":this._x=u*h*d+l*f*g,this._y=l*f*d-u*h*g,this._z=l*h*g+u*f*d,this._w=l*h*d-u*f*g;break;case"YXZ":this._x=u*h*d+l*f*g,this._y=l*f*d-u*h*g,this._z=l*h*g-u*f*d,this._w=l*h*d+u*f*g;break;case"ZXY":this._x=u*h*d-l*f*g,this._y=l*f*d+u*h*g,this._z=l*h*g+u*f*d,this._w=l*h*d-u*f*g;break;case"ZYX":this._x=u*h*d-l*f*g,this._y=l*f*d+u*h*g,this._z=l*h*g-u*f*d,this._w=l*h*d+u*f*g;break;case"YZX":this._x=u*h*d+l*f*g,this._y=l*f*d+u*h*g,this._z=l*h*g-u*f*d,this._w=l*h*d-u*f*g;break;case"XZY":this._x=u*h*d-l*f*g,this._y=l*f*d-u*h*g,this._z=l*h*g+u*f*d,this._w=l*h*d+u*f*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,n=e[0],s=e[4],r=e[8],o=e[1],a=e[5],c=e[9],l=e[2],h=e[6],d=e[10],u=n+a+d;if(u>0){const f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-c)*f,this._y=(r-l)*f,this._z=(o-s)*f}else if(n>a&&n>d){const f=2*Math.sqrt(1+n-a-d);this._w=(h-c)/f,this._x=.25*f,this._y=(s+o)/f,this._z=(r+l)/f}else if(a>d){const f=2*Math.sqrt(1+a-n-d);this._w=(r-l)/f,this._x=(s+o)/f,this._y=.25*f,this._z=(c+h)/f}else{const f=2*Math.sqrt(1+d-n-a);this._w=(o-s)/f,this._x=(r+l)/f,this._y=(c+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<Number.EPSILON?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(we(this.dot(t),-1,1)))}rotateTowards(t,e){const n=this.angleTo(t);if(n===0)return this;const s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const n=t._x,s=t._y,r=t._z,o=t._w,a=e._x,c=e._y,l=e._z,h=e._w;return this._x=n*h+o*a+s*l-r*c,this._y=s*h+o*c+r*a-n*l,this._z=r*h+o*l+n*c-s*a,this._w=o*h-n*a-s*c-r*l,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);const n=this._x,s=this._y,r=this._z,o=this._w;let a=o*t._w+n*t._x+s*t._y+r*t._z;if(a<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,a=-a):this.copy(t),a>=1)return this._w=o,this._x=n,this._y=s,this._z=r,this;const c=1-a*a;if(c<=Number.EPSILON){const f=1-e;return this._w=f*o+e*this._w,this._x=f*n+e*this._x,this._y=f*s+e*this._y,this._z=f*r+e*this._z,this.normalize(),this}const l=Math.sqrt(c),h=Math.atan2(l,a),d=Math.sin((1-e)*h)/l,u=Math.sin(e*h)/l;return this._w=o*d+this._w*u,this._x=n*d+this._x*u,this._y=s*d+this._y*u,this._z=r*d+this._z*u,this._onChangeCallback(),this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class A{constructor(t=0,e=0,n=0){A.prototype.isVector3=!0,this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Na.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Na.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,n=this.y,s=this.z,r=t.elements,o=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(t){const e=this.x,n=this.y,s=this.z,r=t.x,o=t.y,a=t.z,c=t.w,l=2*(o*s-a*n),h=2*(a*e-r*s),d=2*(r*n-o*e);return this.x=e+c*l+o*d-a*h,this.y=n+c*h+a*l-r*d,this.z=s+c*d+r*h-o*l,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const n=t.x,s=t.y,r=t.z,o=e.x,a=e.y,c=e.z;return this.x=s*c-r*a,this.y=r*o-n*c,this.z=n*a-s*o,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return gr.copy(this).projectOnVector(t),this.sub(gr)}reflect(t){return this.sub(gr.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(we(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){const s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const gr=new A,Na=new Se;class gn{constructor(t=new A(1/0,1/0,1/0),e=new A(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(rn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(rn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=rn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const n=t.geometry;if(n!==void 0){const r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,rn):rn.fromBufferAttribute(r,o),rn.applyMatrix4(t.matrixWorld),this.expandByPoint(rn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),_s.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),_s.copy(n.boundingBox)),_s.applyMatrix4(t.matrixWorld),this.union(_s)}const s=t.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,rn),rn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Zi),xs.subVectors(this.max,Zi),ui.subVectors(t.a,Zi),di.subVectors(t.b,Zi),fi.subVectors(t.c,Zi),Fn.subVectors(di,ui),On.subVectors(fi,di),Zn.subVectors(ui,fi);let e=[0,-Fn.z,Fn.y,0,-On.z,On.y,0,-Zn.z,Zn.y,Fn.z,0,-Fn.x,On.z,0,-On.x,Zn.z,0,-Zn.x,-Fn.y,Fn.x,0,-On.y,On.x,0,-Zn.y,Zn.x,0];return!vr(e,ui,di,fi,xs)||(e=[1,0,0,0,1,0,0,0,1],!vr(e,ui,di,fi,xs))?!1:(Ms.crossVectors(Fn,On),e=[Ms.x,Ms.y,Ms.z],vr(e,ui,di,fi,xs))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,rn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(rn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(xn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),xn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),xn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),xn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),xn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),xn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),xn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),xn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(xn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}const xn=[new A,new A,new A,new A,new A,new A,new A,new A],rn=new A,_s=new gn,ui=new A,di=new A,fi=new A,Fn=new A,On=new A,Zn=new A,Zi=new A,xs=new A,Ms=new A,Kn=new A;function vr(i,t,e,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){Kn.fromArray(i,r);const a=s.x*Math.abs(Kn.x)+s.y*Math.abs(Kn.y)+s.z*Math.abs(Kn.z),c=t.dot(Kn),l=e.dot(Kn),h=n.dot(Kn);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>a)return!1}return!0}const Gh=new gn,Ki=new A,_r=new A;class In{constructor(t=new A,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const n=this.center;e!==void 0?n.copy(e):Gh.setFromPoints(t).getCenter(n);let s=0;for(let r=0,o=t.length;r<o;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Ki.subVectors(t,this.center);const e=Ki.lengthSq();if(e>this.radius*this.radius){const n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(Ki,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(_r.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Ki.copy(t.center).add(_r)),this.expandByPoint(Ki.copy(t.center).sub(_r))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}}const Mn=new A,xr=new A,ys=new A,Bn=new A,Mr=new A,ws=new A,yr=new A;class ol{constructor(t=new A,e=new A(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Mn)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=Mn.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Mn.copy(this.origin).addScaledVector(this.direction,e),Mn.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){xr.copy(t).add(e).multiplyScalar(.5),ys.copy(e).sub(t).normalize(),Bn.copy(this.origin).sub(xr);const r=t.distanceTo(e)*.5,o=-this.direction.dot(ys),a=Bn.dot(this.direction),c=-Bn.dot(ys),l=Bn.lengthSq(),h=Math.abs(1-o*o);let d,u,f,g;if(h>0)if(d=o*c-a,u=o*a-c,g=r*h,d>=0)if(u>=-g)if(u<=g){const v=1/h;d*=v,u*=v,f=d*(d+o*u+2*a)+u*(o*d+u+2*c)+l}else u=r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*c)+l;else u=-r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*c)+l;else u<=-g?(d=Math.max(0,-(-o*r+a)),u=d>0?-r:Math.min(Math.max(-r,-c),r),f=-d*d+u*(u+2*c)+l):u<=g?(d=0,u=Math.min(Math.max(-r,-c),r),f=u*(u+2*c)+l):(d=Math.max(0,-(o*r+a)),u=d>0?r:Math.min(Math.max(-r,-c),r),f=-d*d+u*(u+2*c)+l);else u=o>0?-r:r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,d),s&&s.copy(xr).addScaledVector(ys,u),f}intersectSphere(t,e){Mn.subVectors(t.center,this.origin);const n=Mn.dot(this.direction),s=Mn.dot(Mn)-n*n,r=t.radius*t.radius;if(s>r)return null;const o=Math.sqrt(r-s),a=n-o,c=n+o;return c<0?null:a<0?this.at(c,e):this.at(a,e)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){const n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,o,a,c;const l=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return l>=0?(n=(t.min.x-u.x)*l,s=(t.max.x-u.x)*l):(n=(t.max.x-u.x)*l,s=(t.min.x-u.x)*l),h>=0?(r=(t.min.y-u.y)*h,o=(t.max.y-u.y)*h):(r=(t.max.y-u.y)*h,o=(t.min.y-u.y)*h),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),d>=0?(a=(t.min.z-u.z)*d,c=(t.max.z-u.z)*d):(a=(t.max.z-u.z)*d,c=(t.min.z-u.z)*d),n>c||a>s)||((a>n||n!==n)&&(n=a),(c<s||s!==s)&&(s=c),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,Mn)!==null}intersectTriangle(t,e,n,s,r){Mr.subVectors(e,t),ws.subVectors(n,t),yr.crossVectors(Mr,ws);let o=this.direction.dot(yr),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Bn.subVectors(this.origin,t);const c=a*this.direction.dot(ws.crossVectors(Bn,ws));if(c<0)return null;const l=a*this.direction.dot(Mr.cross(Bn));if(l<0||c+l>o)return null;const h=-a*Bn.dot(yr);return h<0?null:this.at(h/o,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Xt{constructor(t,e,n,s,r,o,a,c,l,h,d,u,f,g,v,m){Xt.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,c,l,h,d,u,f,g,v,m)}set(t,e,n,s,r,o,a,c,l,h,d,u,f,g,v,m){const p=this.elements;return p[0]=t,p[4]=e,p[8]=n,p[12]=s,p[1]=r,p[5]=o,p[9]=a,p[13]=c,p[2]=l,p[6]=h,p[10]=d,p[14]=u,p[3]=f,p[7]=g,p[11]=v,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Xt().fromArray(this.elements)}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){const e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,n=t.elements,s=1/pi.setFromMatrixColumn(t,0).length(),r=1/pi.setFromMatrixColumn(t,1).length(),o=1/pi.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*o,e[9]=n[9]*o,e[10]=n[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,n=t.x,s=t.y,r=t.z,o=Math.cos(n),a=Math.sin(n),c=Math.cos(s),l=Math.sin(s),h=Math.cos(r),d=Math.sin(r);if(t.order==="XYZ"){const u=o*h,f=o*d,g=a*h,v=a*d;e[0]=c*h,e[4]=-c*d,e[8]=l,e[1]=f+g*l,e[5]=u-v*l,e[9]=-a*c,e[2]=v-u*l,e[6]=g+f*l,e[10]=o*c}else if(t.order==="YXZ"){const u=c*h,f=c*d,g=l*h,v=l*d;e[0]=u+v*a,e[4]=g*a-f,e[8]=o*l,e[1]=o*d,e[5]=o*h,e[9]=-a,e[2]=f*a-g,e[6]=v+u*a,e[10]=o*c}else if(t.order==="ZXY"){const u=c*h,f=c*d,g=l*h,v=l*d;e[0]=u-v*a,e[4]=-o*d,e[8]=g+f*a,e[1]=f+g*a,e[5]=o*h,e[9]=v-u*a,e[2]=-o*l,e[6]=a,e[10]=o*c}else if(t.order==="ZYX"){const u=o*h,f=o*d,g=a*h,v=a*d;e[0]=c*h,e[4]=g*l-f,e[8]=u*l+v,e[1]=c*d,e[5]=v*l+u,e[9]=f*l-g,e[2]=-l,e[6]=a*c,e[10]=o*c}else if(t.order==="YZX"){const u=o*c,f=o*l,g=a*c,v=a*l;e[0]=c*h,e[4]=v-u*d,e[8]=g*d+f,e[1]=d,e[5]=o*h,e[9]=-a*h,e[2]=-l*h,e[6]=f*d+g,e[10]=u-v*d}else if(t.order==="XZY"){const u=o*c,f=o*l,g=a*c,v=a*l;e[0]=c*h,e[4]=-d,e[8]=l*h,e[1]=u*d+v,e[5]=o*h,e[9]=f*d-g,e[2]=g*d-f,e[6]=a*h,e[10]=v*d+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Wh,t,Xh)}lookAt(t,e,n){const s=this.elements;return Ve.subVectors(t,e),Ve.lengthSq()===0&&(Ve.z=1),Ve.normalize(),kn.crossVectors(n,Ve),kn.lengthSq()===0&&(Math.abs(n.z)===1?Ve.x+=1e-4:Ve.z+=1e-4,Ve.normalize(),kn.crossVectors(n,Ve)),kn.normalize(),Ss.crossVectors(Ve,kn),s[0]=kn.x,s[4]=Ss.x,s[8]=Ve.x,s[1]=kn.y,s[5]=Ss.y,s[9]=Ve.y,s[2]=kn.z,s[6]=Ss.z,s[10]=Ve.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[4],c=n[8],l=n[12],h=n[1],d=n[5],u=n[9],f=n[13],g=n[2],v=n[6],m=n[10],p=n[14],y=n[3],_=n[7],x=n[11],E=n[15],b=s[0],C=s[4],R=s[8],w=s[12],M=s[1],L=s[5],I=s[9],U=s[13],D=s[2],N=s[6],F=s[10],G=s[14],O=s[3],W=s[7],q=s[11],nt=s[15];return r[0]=o*b+a*M+c*D+l*O,r[4]=o*C+a*L+c*N+l*W,r[8]=o*R+a*I+c*F+l*q,r[12]=o*w+a*U+c*G+l*nt,r[1]=h*b+d*M+u*D+f*O,r[5]=h*C+d*L+u*N+f*W,r[9]=h*R+d*I+u*F+f*q,r[13]=h*w+d*U+u*G+f*nt,r[2]=g*b+v*M+m*D+p*O,r[6]=g*C+v*L+m*N+p*W,r[10]=g*R+v*I+m*F+p*q,r[14]=g*w+v*U+m*G+p*nt,r[3]=y*b+_*M+x*D+E*O,r[7]=y*C+_*L+x*N+E*W,r[11]=y*R+_*I+x*F+E*q,r[15]=y*w+_*U+x*G+E*nt,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],o=t[1],a=t[5],c=t[9],l=t[13],h=t[2],d=t[6],u=t[10],f=t[14],g=t[3],v=t[7],m=t[11],p=t[15];return g*(+r*c*d-s*l*d-r*a*u+n*l*u+s*a*f-n*c*f)+v*(+e*c*f-e*l*u+r*o*u-s*o*f+s*l*h-r*c*h)+m*(+e*l*d-e*a*f-r*o*d+n*o*f+r*a*h-n*l*h)+p*(-s*a*h-e*c*d+e*a*u+s*o*d-n*o*u+n*c*h)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){const s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){const t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],c=t[6],l=t[7],h=t[8],d=t[9],u=t[10],f=t[11],g=t[12],v=t[13],m=t[14],p=t[15],y=d*m*l-v*u*l+v*c*f-a*m*f-d*c*p+a*u*p,_=g*u*l-h*m*l-g*c*f+o*m*f+h*c*p-o*u*p,x=h*v*l-g*d*l+g*a*f-o*v*f-h*a*p+o*d*p,E=g*d*c-h*v*c-g*a*u+o*v*u+h*a*m-o*d*m,b=e*y+n*_+s*x+r*E;if(b===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const C=1/b;return t[0]=y*C,t[1]=(v*u*r-d*m*r-v*s*f+n*m*f+d*s*p-n*u*p)*C,t[2]=(a*m*r-v*c*r+v*s*l-n*m*l-a*s*p+n*c*p)*C,t[3]=(d*c*r-a*u*r-d*s*l+n*u*l+a*s*f-n*c*f)*C,t[4]=_*C,t[5]=(h*m*r-g*u*r+g*s*f-e*m*f-h*s*p+e*u*p)*C,t[6]=(g*c*r-o*m*r-g*s*l+e*m*l+o*s*p-e*c*p)*C,t[7]=(o*u*r-h*c*r+h*s*l-e*u*l-o*s*f+e*c*f)*C,t[8]=x*C,t[9]=(g*d*r-h*v*r-g*n*f+e*v*f+h*n*p-e*d*p)*C,t[10]=(o*v*r-g*a*r+g*n*l-e*v*l-o*n*p+e*a*p)*C,t[11]=(h*a*r-o*d*r-h*n*l+e*d*l+o*n*f-e*a*f)*C,t[12]=E*C,t[13]=(h*v*s-g*d*s+g*n*u-e*v*u-h*n*m+e*d*m)*C,t[14]=(g*a*s-o*v*s-g*n*c+e*v*c+o*n*m-e*a*m)*C,t[15]=(o*d*s-h*a*s+h*n*c-e*d*c-o*n*u+e*a*u)*C,this}scale(t){const e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const n=Math.cos(e),s=Math.sin(e),r=1-n,o=t.x,a=t.y,c=t.z,l=r*o,h=r*a;return this.set(l*o+n,l*a-s*c,l*c+s*a,0,l*a+s*c,h*a+n,h*c-s*o,0,l*c-s*a,h*c+s*o,r*c*c+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,o){return this.set(1,n,r,0,t,1,o,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){const s=this.elements,r=e._x,o=e._y,a=e._z,c=e._w,l=r+r,h=o+o,d=a+a,u=r*l,f=r*h,g=r*d,v=o*h,m=o*d,p=a*d,y=c*l,_=c*h,x=c*d,E=n.x,b=n.y,C=n.z;return s[0]=(1-(v+p))*E,s[1]=(f+x)*E,s[2]=(g-_)*E,s[3]=0,s[4]=(f-x)*b,s[5]=(1-(u+p))*b,s[6]=(m+y)*b,s[7]=0,s[8]=(g+_)*C,s[9]=(m-y)*C,s[10]=(1-(u+v))*C,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){const s=this.elements;let r=pi.set(s[0],s[1],s[2]).length();const o=pi.set(s[4],s[5],s[6]).length(),a=pi.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),t.x=s[12],t.y=s[13],t.z=s[14],on.copy(this);const l=1/r,h=1/o,d=1/a;return on.elements[0]*=l,on.elements[1]*=l,on.elements[2]*=l,on.elements[4]*=h,on.elements[5]*=h,on.elements[6]*=h,on.elements[8]*=d,on.elements[9]*=d,on.elements[10]*=d,e.setFromRotationMatrix(on),n.x=r,n.y=o,n.z=a,this}makePerspective(t,e,n,s,r,o,a=Rn){const c=this.elements,l=2*r/(e-t),h=2*r/(n-s),d=(e+t)/(e-t),u=(n+s)/(n-s);let f,g;if(a===Rn)f=-(o+r)/(o-r),g=-2*o*r/(o-r);else if(a===ir)f=-o/(o-r),g=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=l,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=h,c[9]=u,c[13]=0,c[2]=0,c[6]=0,c[10]=f,c[14]=g,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,s,r,o,a=Rn){const c=this.elements,l=1/(e-t),h=1/(n-s),d=1/(o-r),u=(e+t)*l,f=(n+s)*h;let g,v;if(a===Rn)g=(o+r)*d,v=-2*d;else if(a===ir)g=r*d,v=-1*d;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=2*l,c[4]=0,c[8]=0,c[12]=-u,c[1]=0,c[5]=2*h,c[9]=0,c[13]=-f,c[2]=0,c[6]=0,c[10]=v,c[14]=-g,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){const e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}}const pi=new A,on=new Xt,Wh=new A(0,0,0),Xh=new A(1,1,1),kn=new A,Ss=new A,Ve=new A,za=new Xt,Fa=new Se;class ve{constructor(t=0,e=0,n=0,s=ve.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){const s=t.elements,r=s[0],o=s[4],a=s[8],c=s[1],l=s[5],h=s[9],d=s[2],u=s[6],f=s[10];switch(e){case"XYZ":this._y=Math.asin(we(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(u,l),this._z=0);break;case"YXZ":this._x=Math.asin(-we(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-d,r),this._z=0);break;case"ZXY":this._x=Math.asin(we(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-o,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-we(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-o,l));break;case"YZX":this._z=Math.asin(we(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-d,r)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-we(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(u,l),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return za.makeRotationFromQuaternion(t),this.setFromRotationMatrix(za,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Fa.setFromEuler(this),this.setFromQuaternion(Fa,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}ve.DEFAULT_ORDER="XYZ";class al{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let qh=0;const Oa=new A,mi=new Se,yn=new Xt,bs=new A,ji=new A,Yh=new A,$h=new Se,Ba=new A(1,0,0),ka=new A(0,1,0),Ha=new A(0,0,1),Va={type:"added"},Zh={type:"removed"},gi={type:"childadded",child:null},wr={type:"childremoved",child:null};class Ce extends Gi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:qh++}),this.uuid=Wi(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Ce.DEFAULT_UP.clone();const t=new A,e=new ve,n=new Se,s=new A(1,1,1);function r(){n.setFromEuler(e,!1)}function o(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new Xt},normalMatrix:{value:new Zt}}),this.matrix=new Xt,this.matrixWorld=new Xt,this.matrixAutoUpdate=Ce.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Ce.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new al,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return mi.setFromAxisAngle(t,e),this.quaternion.multiply(mi),this}rotateOnWorldAxis(t,e){return mi.setFromAxisAngle(t,e),this.quaternion.premultiply(mi),this}rotateX(t){return this.rotateOnAxis(Ba,t)}rotateY(t){return this.rotateOnAxis(ka,t)}rotateZ(t){return this.rotateOnAxis(Ha,t)}translateOnAxis(t,e){return Oa.copy(t).applyQuaternion(this.quaternion),this.position.add(Oa.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Ba,t)}translateY(t){return this.translateOnAxis(ka,t)}translateZ(t){return this.translateOnAxis(Ha,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(yn.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?bs.copy(t):bs.set(t,e,n);const s=this.parent;this.updateWorldMatrix(!0,!1),ji.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?yn.lookAt(ji,bs,this.up):yn.lookAt(bs,ji,this.up),this.quaternion.setFromRotationMatrix(yn),s&&(yn.extractRotation(s.matrixWorld),mi.setFromRotationMatrix(yn),this.quaternion.premultiply(mi.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Va),gi.child=t,this.dispatchEvent(gi),gi.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Zh),wr.child=t,this.dispatchEvent(wr),wr.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),yn.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),yn.multiply(t.parent.matrixWorld)),t.applyMatrix4(yn),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Va),gi.child=t,this.dispatchEvent(gi),gi.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){const o=this.children[n].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ji,t,Yh),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ji,$h,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e){const n=this.parent;if(t===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.visibility=this._visibility,s.active=this._active,s.bounds=this._bounds.map(a=>({boxInitialized:a.boxInitialized,boxMin:a.box.min.toArray(),boxMax:a.box.max.toArray(),sphereInitialized:a.sphereInitialized,sphereRadius:a.sphere.radius,sphereCenter:a.sphere.center.toArray()})),s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.geometryCount=this._geometryCount,s.matricesTexture=this._matricesTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere={center:s.boundingSphere.center.toArray(),radius:s.boundingSphere.radius}),this.boundingBox!==null&&(s.boundingBox={min:s.boundingBox.min.toArray(),max:s.boundingBox.max.toArray()}));function r(a,c){return a[c.uuid]===void 0&&(a[c.uuid]=c.toJSON(t)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const c=a.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){const d=c[l];r(t.shapes,d)}else r(t.shapes,c)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let c=0,l=this.material.length;c<l;c++)a.push(r(t.materials,this.material[c]));s.material=a}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){const c=this.animations[a];s.animations.push(r(t.animations,c))}}if(e){const a=o(t.geometries),c=o(t.materials),l=o(t.textures),h=o(t.images),d=o(t.shapes),u=o(t.skeletons),f=o(t.animations),g=o(t.nodes);a.length>0&&(n.geometries=a),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),f.length>0&&(n.animations=f),g.length>0&&(n.nodes=g)}return n.object=s,n;function o(a){const c=[];for(const l in a){const h=a[l];delete h.metadata,c.push(h)}return c}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){const s=t.children[n];this.add(s.clone())}return this}}Ce.DEFAULT_UP=new A(0,1,0);Ce.DEFAULT_MATRIX_AUTO_UPDATE=!0;Ce.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const an=new A,wn=new A,Sr=new A,Sn=new A,vi=new A,_i=new A,Ga=new A,br=new A,Er=new A,Tr=new A,Ar=new ge,Cr=new ge,Rr=new ge;class cn{constructor(t=new A,e=new A,n=new A){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),an.subVectors(t,e),s.cross(an);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){an.subVectors(s,e),wn.subVectors(n,e),Sr.subVectors(t,e);const o=an.dot(an),a=an.dot(wn),c=an.dot(Sr),l=wn.dot(wn),h=wn.dot(Sr),d=o*l-a*a;if(d===0)return r.set(0,0,0),null;const u=1/d,f=(l*c-a*h)*u,g=(o*h-a*c)*u;return r.set(1-f-g,g,f)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,Sn)===null?!1:Sn.x>=0&&Sn.y>=0&&Sn.x+Sn.y<=1}static getInterpolation(t,e,n,s,r,o,a,c){return this.getBarycoord(t,e,n,s,Sn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,Sn.x),c.addScaledVector(o,Sn.y),c.addScaledVector(a,Sn.z),c)}static getInterpolatedAttribute(t,e,n,s,r,o){return Ar.setScalar(0),Cr.setScalar(0),Rr.setScalar(0),Ar.fromBufferAttribute(t,e),Cr.fromBufferAttribute(t,n),Rr.fromBufferAttribute(t,s),o.setScalar(0),o.addScaledVector(Ar,r.x),o.addScaledVector(Cr,r.y),o.addScaledVector(Rr,r.z),o}static isFrontFacing(t,e,n,s){return an.subVectors(n,e),wn.subVectors(t,e),an.cross(wn).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return an.subVectors(this.c,this.b),wn.subVectors(this.a,this.b),an.cross(wn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return cn.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return cn.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return cn.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return cn.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return cn.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const n=this.a,s=this.b,r=this.c;let o,a;vi.subVectors(s,n),_i.subVectors(r,n),br.subVectors(t,n);const c=vi.dot(br),l=_i.dot(br);if(c<=0&&l<=0)return e.copy(n);Er.subVectors(t,s);const h=vi.dot(Er),d=_i.dot(Er);if(h>=0&&d<=h)return e.copy(s);const u=c*d-h*l;if(u<=0&&c>=0&&h<=0)return o=c/(c-h),e.copy(n).addScaledVector(vi,o);Tr.subVectors(t,r);const f=vi.dot(Tr),g=_i.dot(Tr);if(g>=0&&f<=g)return e.copy(r);const v=f*l-c*g;if(v<=0&&l>=0&&g<=0)return a=l/(l-g),e.copy(n).addScaledVector(_i,a);const m=h*g-f*d;if(m<=0&&d-h>=0&&f-g>=0)return Ga.subVectors(r,s),a=(d-h)/(d-h+(f-g)),e.copy(s).addScaledVector(Ga,a);const p=1/(m+v+u);return o=v*p,a=u*p,e.copy(n).addScaledVector(vi,o).addScaledVector(_i,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const cl={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Hn={h:0,s:0,l:0},Es={h:0,s:0,l:0};function Pr(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}class Et{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){const s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=ze){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,te.toWorkingColorSpace(this,e),this}setRGB(t,e,n,s=te.workingColorSpace){return this.r=t,this.g=e,this.b=n,te.toWorkingColorSpace(this,s),this}setHSL(t,e,n,s=te.workingColorSpace){if(t=Ko(t,1),e=we(e,0,1),n=we(n,0,1),e===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+e):n+e-n*e,o=2*n-r;this.r=Pr(o,r,t+1/3),this.g=Pr(o,r,t),this.b=Pr(o,r,t-1/3)}return te.toWorkingColorSpace(this,s),this}setStyle(t,e=ze){function n(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r;const o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){const r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=ze){const n=cl[t.toLowerCase()];return n!==void 0?this.setHex(n,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Dn(t.r),this.g=Dn(t.g),this.b=Dn(t.b),this}copyLinearToSRGB(t){return this.r=Ii(t.r),this.g=Ii(t.g),this.b=Ii(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=ze){return te.fromWorkingColorSpace(Le.copy(this),t),Math.round(we(Le.r*255,0,255))*65536+Math.round(we(Le.g*255,0,255))*256+Math.round(we(Le.b*255,0,255))}getHexString(t=ze){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=te.workingColorSpace){te.fromWorkingColorSpace(Le.copy(this),e);const n=Le.r,s=Le.g,r=Le.b,o=Math.max(n,s,r),a=Math.min(n,s,r);let c,l;const h=(a+o)/2;if(a===o)c=0,l=0;else{const d=o-a;switch(l=h<=.5?d/(o+a):d/(2-o-a),o){case n:c=(s-r)/d+(s<r?6:0);break;case s:c=(r-n)/d+2;break;case r:c=(n-s)/d+4;break}c/=6}return t.h=c,t.s=l,t.l=h,t}getRGB(t,e=te.workingColorSpace){return te.fromWorkingColorSpace(Le.copy(this),e),t.r=Le.r,t.g=Le.g,t.b=Le.b,t}getStyle(t=ze){te.fromWorkingColorSpace(Le.copy(this),t);const e=Le.r,n=Le.g,s=Le.b;return t!==ze?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(Hn),this.setHSL(Hn.h+t,Hn.s+e,Hn.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Hn),t.getHSL(Es);const n=os(Hn.h,Es.h,e),s=os(Hn.s,Es.s,e),r=os(Hn.l,Es.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Le=new Et;Et.NAMES=cl;let Kh=0;class Xi extends Gi{static get type(){return"Material"}get type(){return this.constructor.type}set type(t){}constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Kh++}),this.uuid=Wi(),this.name="",this.blending=Pn,this.side=Xn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=to,this.blendDst=eo,this.blendEquation=ii,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Et(0,0,0),this.blendAlpha=0,this.depthFunc=Ui,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Ea,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=li,this.stencilZFail=li,this.stencilZPass=li,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const n=t[e];if(n===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}const s=this[e];if(s===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Pn&&(n.blending=this.blending),this.side!==Xn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==to&&(n.blendSrc=this.blendSrc),this.blendDst!==eo&&(n.blendDst=this.blendDst),this.blendEquation!==ii&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==Ui&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Ea&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==li&&(n.stencilFail=this.stencilFail),this.stencilZFail!==li&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==li&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){const o=[];for(const a in r){const c=r[a];delete c.metadata,o.push(c)}return o}if(e){const r=s(t.textures),o=s(t.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let n=null;if(e!==null){const s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class jo extends Xi{static get type(){return"MeshBasicMaterial"}constructor(t){super(),this.isMeshBasicMaterial=!0,this.color=new Et(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new ve,this.combine=Vc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const Cn=jh();function jh(){const i=new ArrayBuffer(4),t=new Float32Array(i),e=new Uint32Array(i),n=new Uint32Array(512),s=new Uint32Array(512);for(let c=0;c<256;++c){const l=c-127;l<-27?(n[c]=0,n[c|256]=32768,s[c]=24,s[c|256]=24):l<-14?(n[c]=1024>>-l-14,n[c|256]=1024>>-l-14|32768,s[c]=-l-1,s[c|256]=-l-1):l<=15?(n[c]=l+15<<10,n[c|256]=l+15<<10|32768,s[c]=13,s[c|256]=13):l<128?(n[c]=31744,n[c|256]=64512,s[c]=24,s[c|256]=24):(n[c]=31744,n[c|256]=64512,s[c]=13,s[c|256]=13)}const r=new Uint32Array(2048),o=new Uint32Array(64),a=new Uint32Array(64);for(let c=1;c<1024;++c){let l=c<<13,h=0;for(;!(l&8388608);)l<<=1,h-=8388608;l&=-8388609,h+=947912704,r[c]=l|h}for(let c=1024;c<2048;++c)r[c]=939524096+(c-1024<<13);for(let c=1;c<31;++c)o[c]=c<<23;o[31]=1199570944,o[32]=2147483648;for(let c=33;c<63;++c)o[c]=2147483648+(c-32<<23);o[63]=3347054592;for(let c=1;c<64;++c)c!==32&&(a[c]=1024);return{floatView:t,uint32View:e,baseTable:n,shiftTable:s,mantissaTable:r,exponentTable:o,offsetTable:a}}function Jh(i){Math.abs(i)>65504&&console.warn("THREE.DataUtils.toHalfFloat(): Value out of range."),i=we(i,-65504,65504),Cn.floatView[0]=i;const t=Cn.uint32View[0],e=t>>23&511;return Cn.baseTable[e]+((t&8388607)>>Cn.shiftTable[e])}function Qh(i){const t=i>>10;return Cn.uint32View[0]=Cn.mantissaTable[Cn.offsetTable[t]+(i&1023)]+Cn.exponentTable[t],Cn.floatView[0]}const tu={toHalfFloat:Jh,fromHalfFloat:Qh},ye=new A,Ts=new wt;class de{constructor(t,e,n=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=Ta,this.updateRanges=[],this.gpuType=ln,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)Ts.fromBufferAttribute(this,e),Ts.applyMatrix3(t),this.setXY(e,Ts.x,Ts.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)ye.fromBufferAttribute(this,e),ye.applyMatrix3(t),this.setXYZ(e,ye.x,ye.y,ye.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)ye.fromBufferAttribute(this,e),ye.applyMatrix4(t),this.setXYZ(e,ye.x,ye.y,ye.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)ye.fromBufferAttribute(this,e),ye.applyNormalMatrix(t),this.setXYZ(e,ye.x,ye.y,ye.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)ye.fromBufferAttribute(this,e),ye.transformDirection(t),this.setXYZ(e,ye.x,ye.y,ye.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=Ci(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=Ue(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Ci(e,this.array)),e}setX(t,e){return this.normalized&&(e=Ue(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Ci(e,this.array)),e}setY(t,e){return this.normalized&&(e=Ue(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Ci(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Ue(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Ci(e,this.array)),e}setW(t,e){return this.normalized&&(e=Ue(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=Ue(e,this.array),n=Ue(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=Ue(e,this.array),n=Ue(n,this.array),s=Ue(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=Ue(e,this.array),n=Ue(n,this.array),s=Ue(s,this.array),r=Ue(r,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==Ta&&(t.usage=this.usage),t}}class ll extends de{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class hl extends de{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class At extends de{constructor(t,e,n){super(new Float32Array(t),e,n)}}let eu=0;const Je=new Xt,Lr=new Ce,xi=new A,Ge=new gn,Ji=new gn,Te=new A;class Jt extends Gi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:eu++}),this.uuid=Wi(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(nl(t)?hl:ll)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new Zt().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return Je.makeRotationFromQuaternion(t),this.applyMatrix4(Je),this}rotateX(t){return Je.makeRotationX(t),this.applyMatrix4(Je),this}rotateY(t){return Je.makeRotationY(t),this.applyMatrix4(Je),this}rotateZ(t){return Je.makeRotationZ(t),this.applyMatrix4(Je),this}translate(t,e,n){return Je.makeTranslation(t,e,n),this.applyMatrix4(Je),this}scale(t,e,n){return Je.makeScale(t,e,n),this.applyMatrix4(Je),this}lookAt(t){return Lr.lookAt(t),Lr.updateMatrix(),this.applyMatrix4(Lr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(xi).negate(),this.translate(xi.x,xi.y,xi.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const n=[];for(let s=0,r=t.length;s<r;s++){const o=t[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new At(n,3))}else{for(let n=0,s=e.count;n<s;n++){const r=t[n];e.setXYZ(n,r.x,r.y,r.z||0)}t.length>e.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new gn);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new A(-1/0,-1/0,-1/0),new A(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){const r=e[n];Ge.setFromBufferAttribute(r),this.morphTargetsRelative?(Te.addVectors(this.boundingBox.min,Ge.min),this.boundingBox.expandByPoint(Te),Te.addVectors(this.boundingBox.max,Ge.max),this.boundingBox.expandByPoint(Te)):(this.boundingBox.expandByPoint(Ge.min),this.boundingBox.expandByPoint(Ge.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new In);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new A,1/0);return}if(t){const n=this.boundingSphere.center;if(Ge.setFromBufferAttribute(t),e)for(let r=0,o=e.length;r<o;r++){const a=e[r];Ji.setFromBufferAttribute(a),this.morphTargetsRelative?(Te.addVectors(Ge.min,Ji.min),Ge.expandByPoint(Te),Te.addVectors(Ge.max,Ji.max),Ge.expandByPoint(Te)):(Ge.expandByPoint(Ji.min),Ge.expandByPoint(Ji.max))}Ge.getCenter(n);let s=0;for(let r=0,o=t.count;r<o;r++)Te.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(Te));if(e)for(let r=0,o=e.length;r<o;r++){const a=e[r],c=this.morphTargetsRelative;for(let l=0,h=a.count;l<h;l++)Te.fromBufferAttribute(a,l),c&&(xi.fromBufferAttribute(t,l),Te.add(xi)),s=Math.max(s,n.distanceToSquared(Te))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=e.position,s=e.normal,r=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new de(new Float32Array(4*n.count),4));const o=this.getAttribute("tangent"),a=[],c=[];for(let R=0;R<n.count;R++)a[R]=new A,c[R]=new A;const l=new A,h=new A,d=new A,u=new wt,f=new wt,g=new wt,v=new A,m=new A;function p(R,w,M){l.fromBufferAttribute(n,R),h.fromBufferAttribute(n,w),d.fromBufferAttribute(n,M),u.fromBufferAttribute(r,R),f.fromBufferAttribute(r,w),g.fromBufferAttribute(r,M),h.sub(l),d.sub(l),f.sub(u),g.sub(u);const L=1/(f.x*g.y-g.x*f.y);isFinite(L)&&(v.copy(h).multiplyScalar(g.y).addScaledVector(d,-f.y).multiplyScalar(L),m.copy(d).multiplyScalar(f.x).addScaledVector(h,-g.x).multiplyScalar(L),a[R].add(v),a[w].add(v),a[M].add(v),c[R].add(m),c[w].add(m),c[M].add(m))}let y=this.groups;y.length===0&&(y=[{start:0,count:t.count}]);for(let R=0,w=y.length;R<w;++R){const M=y[R],L=M.start,I=M.count;for(let U=L,D=L+I;U<D;U+=3)p(t.getX(U+0),t.getX(U+1),t.getX(U+2))}const _=new A,x=new A,E=new A,b=new A;function C(R){E.fromBufferAttribute(s,R),b.copy(E);const w=a[R];_.copy(w),_.sub(E.multiplyScalar(E.dot(w))).normalize(),x.crossVectors(b,w);const L=x.dot(c[R])<0?-1:1;o.setXYZW(R,_.x,_.y,_.z,L)}for(let R=0,w=y.length;R<w;++R){const M=y[R],L=M.start,I=M.count;for(let U=L,D=L+I;U<D;U+=3)C(t.getX(U+0)),C(t.getX(U+1)),C(t.getX(U+2))}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new de(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,f=n.count;u<f;u++)n.setXYZ(u,0,0,0);const s=new A,r=new A,o=new A,a=new A,c=new A,l=new A,h=new A,d=new A;if(t)for(let u=0,f=t.count;u<f;u+=3){const g=t.getX(u+0),v=t.getX(u+1),m=t.getX(u+2);s.fromBufferAttribute(e,g),r.fromBufferAttribute(e,v),o.fromBufferAttribute(e,m),h.subVectors(o,r),d.subVectors(s,r),h.cross(d),a.fromBufferAttribute(n,g),c.fromBufferAttribute(n,v),l.fromBufferAttribute(n,m),a.add(h),c.add(h),l.add(h),n.setXYZ(g,a.x,a.y,a.z),n.setXYZ(v,c.x,c.y,c.z),n.setXYZ(m,l.x,l.y,l.z)}else for(let u=0,f=e.count;u<f;u+=3)s.fromBufferAttribute(e,u+0),r.fromBufferAttribute(e,u+1),o.fromBufferAttribute(e,u+2),h.subVectors(o,r),d.subVectors(s,r),h.cross(d),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)Te.fromBufferAttribute(t,e),Te.normalize(),t.setXYZ(e,Te.x,Te.y,Te.z)}toNonIndexed(){function t(a,c){const l=a.array,h=a.itemSize,d=a.normalized,u=new l.constructor(c.length*h);let f=0,g=0;for(let v=0,m=c.length;v<m;v++){a.isInterleavedBufferAttribute?f=c[v]*a.data.stride+a.offset:f=c[v]*h;for(let p=0;p<h;p++)u[g++]=l[f++]}return new de(u,h,d)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new Jt,n=this.index.array,s=this.attributes;for(const a in s){const c=s[a],l=t(c,n);e.setAttribute(a,l)}const r=this.morphAttributes;for(const a in r){const c=[],l=r[a];for(let h=0,d=l.length;h<d;h++){const u=l[h],f=t(u,n);c.push(f)}e.morphAttributes[a]=c}e.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,c=o.length;a<c;a++){const l=o[a];e.addGroup(l.start,l.count,l.materialIndex)}return e}toJSON(){const t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(t[l]=c[l]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const n=this.attributes;for(const c in n){const l=n[c];t.data.attributes[c]=l.toJSON(t.data)}const s={};let r=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],h=[];for(let d=0,u=l.length;d<u;d++){const f=l[d];h.push(f.toJSON(t.data))}h.length>0&&(s[c]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(t.data.boundingSphere={center:a.center.toArray(),radius:a.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const n=t.index;n!==null&&this.setIndex(n.clone(e));const s=t.attributes;for(const l in s){const h=s[l];this.setAttribute(l,h.clone(e))}const r=t.morphAttributes;for(const l in r){const h=[],d=r[l];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(e));this.morphAttributes[l]=h}this.morphTargetsRelative=t.morphTargetsRelative;const o=t.groups;for(let l=0,h=o.length;l<h;l++){const d=o[l];this.addGroup(d.start,d.count,d.materialIndex)}const a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());const c=t.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Wa=new Xt,jn=new ol,As=new In,Xa=new A,Cs=new A,Rs=new A,Ps=new A,Dr=new A,Ls=new A,qa=new A,Ds=new A;class zt extends Ce{constructor(t=new Jt,e=new jo){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(t,e){const n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;e.fromBufferAttribute(s,t);const a=this.morphTargetInfluences;if(r&&a){Ls.set(0,0,0);for(let c=0,l=r.length;c<l;c++){const h=a[c],d=r[c];h!==0&&(Dr.fromBufferAttribute(d,t),o?Ls.addScaledVector(Dr,h):Ls.addScaledVector(Dr.sub(e),h))}e.add(Ls)}return e}raycast(t,e){const n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),As.copy(n.boundingSphere),As.applyMatrix4(r),jn.copy(t.ray).recast(t.near),!(As.containsPoint(jn.origin)===!1&&(jn.intersectSphere(As,Xa)===null||jn.origin.distanceToSquared(Xa)>(t.far-t.near)**2))&&(Wa.copy(r).invert(),jn.copy(t.ray).applyMatrix4(Wa),!(n.boundingBox!==null&&jn.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,jn)))}_computeIntersections(t,e,n){let s;const r=this.geometry,o=this.material,a=r.index,c=r.attributes.position,l=r.attributes.uv,h=r.attributes.uv1,d=r.attributes.normal,u=r.groups,f=r.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,v=u.length;g<v;g++){const m=u[g],p=o[m.materialIndex],y=Math.max(m.start,f.start),_=Math.min(a.count,Math.min(m.start+m.count,f.start+f.count));for(let x=y,E=_;x<E;x+=3){const b=a.getX(x),C=a.getX(x+1),R=a.getX(x+2);s=Is(this,p,t,n,l,h,d,b,C,R),s&&(s.faceIndex=Math.floor(x/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{const g=Math.max(0,f.start),v=Math.min(a.count,f.start+f.count);for(let m=g,p=v;m<p;m+=3){const y=a.getX(m),_=a.getX(m+1),x=a.getX(m+2);s=Is(this,o,t,n,l,h,d,y,_,x),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}else if(c!==void 0)if(Array.isArray(o))for(let g=0,v=u.length;g<v;g++){const m=u[g],p=o[m.materialIndex],y=Math.max(m.start,f.start),_=Math.min(c.count,Math.min(m.start+m.count,f.start+f.count));for(let x=y,E=_;x<E;x+=3){const b=x,C=x+1,R=x+2;s=Is(this,p,t,n,l,h,d,b,C,R),s&&(s.faceIndex=Math.floor(x/3),s.face.materialIndex=m.materialIndex,e.push(s))}}else{const g=Math.max(0,f.start),v=Math.min(c.count,f.start+f.count);for(let m=g,p=v;m<p;m+=3){const y=m,_=m+1,x=m+2;s=Is(this,o,t,n,l,h,d,y,_,x),s&&(s.faceIndex=Math.floor(m/3),e.push(s))}}}}function nu(i,t,e,n,s,r,o,a){let c;if(t.side===De?c=n.intersectTriangle(o,r,s,!0,a):c=n.intersectTriangle(s,r,o,t.side===Xn,a),c===null)return null;Ds.copy(a),Ds.applyMatrix4(i.matrixWorld);const l=e.ray.origin.distanceTo(Ds);return l<e.near||l>e.far?null:{distance:l,point:Ds.clone(),object:i}}function Is(i,t,e,n,s,r,o,a,c,l){i.getVertexPosition(a,Cs),i.getVertexPosition(c,Rs),i.getVertexPosition(l,Ps);const h=nu(i,t,e,n,Cs,Rs,Ps,qa);if(h){const d=new A;cn.getBarycoord(qa,Cs,Rs,Ps,d),s&&(h.uv=cn.getInterpolatedAttribute(s,a,c,l,d,new wt)),r&&(h.uv1=cn.getInterpolatedAttribute(r,a,c,l,d,new wt)),o&&(h.normal=cn.getInterpolatedAttribute(o,a,c,l,d,new A),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const u={a,b:c,c:l,normal:new A,materialIndex:0};cn.getNormal(Cs,Rs,Ps,u.normal),h.face=u,h.barycoord=d}return h}class mt extends Jt{constructor(t=1,e=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};const a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);const c=[],l=[],h=[],d=[];let u=0,f=0;g("z","y","x",-1,-1,n,e,t,o,r,0),g("z","y","x",1,-1,n,e,-t,o,r,1),g("x","z","y",1,1,t,n,e,s,o,2),g("x","z","y",1,-1,t,n,-e,s,o,3),g("x","y","z",1,-1,t,e,n,s,r,4),g("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(c),this.setAttribute("position",new At(l,3)),this.setAttribute("normal",new At(h,3)),this.setAttribute("uv",new At(d,2));function g(v,m,p,y,_,x,E,b,C,R,w){const M=x/C,L=E/R,I=x/2,U=E/2,D=b/2,N=C+1,F=R+1;let G=0,O=0;const W=new A;for(let q=0;q<F;q++){const nt=q*L-U;for(let ot=0;ot<N;ot++){const lt=ot*M-I;W[v]=lt*y,W[m]=nt*_,W[p]=D,l.push(W.x,W.y,W.z),W[v]=0,W[m]=0,W[p]=b>0?1:-1,h.push(W.x,W.y,W.z),d.push(ot/C),d.push(1-q/R),G+=1}}for(let q=0;q<R;q++)for(let nt=0;nt<C;nt++){const ot=u+nt+N*q,lt=u+nt+N*(q+1),V=u+(nt+1)+N*(q+1),K=u+(nt+1)+N*q;c.push(ot,lt,K),c.push(lt,V,K),O+=6}a.addGroup(f,O,w),f+=O,u+=G}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new mt(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function ki(i){const t={};for(const e in i){t[e]={};for(const n in i[e]){const s=i[e][n];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone():Array.isArray(s)?t[e][n]=s.slice():t[e][n]=s}}return t}function Ne(i){const t={};for(let e=0;e<i.length;e++){const n=ki(i[e]);for(const s in n)t[s]=n[s]}return t}function iu(i){const t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function ul(i){const t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:te.workingColorSpace}const su={clone:ki,merge:Ne};var ru=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,ou=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Ae extends Xi{static get type(){return"ShaderMaterial"}constructor(t){super(),this.isShaderMaterial=!0,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=ru,this.fragmentShader=ou,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=ki(t.uniforms),this.uniformsGroups=iu(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const s in this.uniforms){const o=this.uniforms[s].value;o&&o.isTexture?e.uniforms[s]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[s]={type:"m4",value:o.toArray()}:e.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const n={};for(const s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}}class dl extends Ce{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Xt,this.projectionMatrix=new Xt,this.projectionMatrixInverse=new Xt,this.coordinateSystem=Rn}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Vn=new A,Ya=new wt,$a=new wt;class Ye extends dl{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=ds*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(rs*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return ds*2*Math.atan(Math.tan(rs*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){Vn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(Vn.x,Vn.y).multiplyScalar(-t/Vn.z),Vn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Vn.x,Vn.y).multiplyScalar(-t/Vn.z)}getViewSize(t,e){return this.getViewBounds(t,Ya,$a),e.subVectors($a,Ya)}setViewOffset(t,e,n,s,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(rs*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s;const o=this.view;if(this.view!==null&&this.view.enabled){const c=o.fullWidth,l=o.fullHeight;r+=o.offsetX*s/c,e-=o.offsetY*n/l,s*=o.width/c,n*=o.height/l}const a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const Mi=-90,yi=1;class au extends Ce{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new Ye(Mi,yi,t,e);s.layers=this.layers,this.add(s);const r=new Ye(Mi,yi,t,e);r.layers=this.layers,this.add(r);const o=new Ye(Mi,yi,t,e);o.layers=this.layers,this.add(o);const a=new Ye(Mi,yi,t,e);a.layers=this.layers,this.add(a);const c=new Ye(Mi,yi,t,e);c.layers=this.layers,this.add(c);const l=new Ye(Mi,yi,t,e);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[n,s,r,o,a,c]=e;for(const l of e)this.remove(l);if(t===Rn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(t===ir)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const l of e)this.add(l),l.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,c,l,h]=this.children,d=t.getRenderTarget(),u=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;const v=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,t.setRenderTarget(n,0,s),t.render(e,r),t.setRenderTarget(n,1,s),t.render(e,o),t.setRenderTarget(n,2,s),t.render(e,a),t.setRenderTarget(n,3,s),t.render(e,c),t.setRenderTarget(n,4,s),t.render(e,l),n.texture.generateMipmaps=v,t.setRenderTarget(n,5,s),t.render(e,h),t.setRenderTarget(d,u,f),t.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class fl extends Ie{constructor(t,e,n,s,r,o,a,c,l,h){t=t!==void 0?t:[],e=e!==void 0?e:Ni,super(t,e,n,s,r,o,a,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class cu extends Ze{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new fl(s,e.mapping,e.wrapS,e.wrapT,e.magFilter,e.minFilter,e.format,e.type,e.anisotropy,e.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=e.generateMipmaps!==void 0?e.generateMipmaps:!1,this.texture.minFilter=e.minFilter!==void 0?e.minFilter:ue}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new mt(5,5,5),r=new Ae({name:"CubemapFromEquirect",uniforms:ki(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:De,blending:Wn});r.uniforms.tEquirect.value=e;const o=new zt(s,r),a=e.minFilter;return e.minFilter===ri&&(e.minFilter=ue),new au(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e,n,s){const r=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,n,s);t.setRenderTarget(r)}}const Ir=new A,lu=new A,hu=new Zt;class ei{constructor(t=new A(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){const s=Ir.subVectors(n,e).cross(lu.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const n=t.delta(Ir),s=this.normal.dot(n);if(s===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const r=-(t.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:e.copy(t.start).addScaledVector(n,r)}intersectsLine(t){const e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const n=e||hu.getNormalMatrix(t),s=this.coplanarPoint(Ir).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Jn=new In,Us=new A;class Jo{constructor(t=new ei,e=new ei,n=new ei,s=new ei,r=new ei,o=new ei){this.planes=[t,e,n,s,r,o]}set(t,e,n,s,r,o){const a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(t){const e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=Rn){const n=this.planes,s=t.elements,r=s[0],o=s[1],a=s[2],c=s[3],l=s[4],h=s[5],d=s[6],u=s[7],f=s[8],g=s[9],v=s[10],m=s[11],p=s[12],y=s[13],_=s[14],x=s[15];if(n[0].setComponents(c-r,u-l,m-f,x-p).normalize(),n[1].setComponents(c+r,u+l,m+f,x+p).normalize(),n[2].setComponents(c+o,u+h,m+g,x+y).normalize(),n[3].setComponents(c-o,u-h,m-g,x-y).normalize(),n[4].setComponents(c-a,u-d,m-v,x-_).normalize(),e===Rn)n[5].setComponents(c+a,u+d,m+v,x+_).normalize();else if(e===ir)n[5].setComponents(a,d,v,_).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Jn.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Jn.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Jn)}intersectsSprite(t){return Jn.center.set(0,0,0),Jn.radius=.7071067811865476,Jn.applyMatrix4(t.matrixWorld),this.intersectsSphere(Jn)}intersectsSphere(t){const e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){const e=this.planes;for(let n=0;n<6;n++){const s=e[n];if(Us.x=s.normal.x>0?t.max.x:t.min.x,Us.y=s.normal.y>0?t.max.y:t.min.y,Us.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(Us)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function pl(){let i=null,t=!1,e=null,n=null;function s(r,o){e(r,o),n=i.requestAnimationFrame(s)}return{start:function(){t!==!0&&e!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function uu(i){const t=new WeakMap;function e(a,c){const l=a.array,h=a.usage,d=l.byteLength,u=i.createBuffer();i.bindBuffer(c,u),i.bufferData(c,l,h),a.onUploadCallback();let f;if(l instanceof Float32Array)f=i.FLOAT;else if(l instanceof Uint16Array)a.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(l instanceof Int16Array)f=i.SHORT;else if(l instanceof Uint32Array)f=i.UNSIGNED_INT;else if(l instanceof Int32Array)f=i.INT;else if(l instanceof Int8Array)f=i.BYTE;else if(l instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:u,type:f,bytesPerElement:l.BYTES_PER_ELEMENT,version:a.version,size:d}}function n(a,c,l){const h=c.array,d=c.updateRanges;if(i.bindBuffer(l,a),d.length===0)i.bufferSubData(l,0,h);else{d.sort((f,g)=>f.start-g.start);let u=0;for(let f=1;f<d.length;f++){const g=d[u],v=d[f];v.start<=g.start+g.count+1?g.count=Math.max(g.count,v.start+v.count-g.start):(++u,d[u]=v)}d.length=u+1;for(let f=0,g=d.length;f<g;f++){const v=d[f];i.bufferSubData(l,v.start*h.BYTES_PER_ELEMENT,h,v.start,v.count)}c.clearUpdateRanges()}c.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const c=t.get(a);c&&(i.deleteBuffer(c.buffer),t.delete(a))}function o(a,c){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const l=t.get(a);if(l===void 0)t.set(a,e(a,c));else if(l.version<a.version){if(l.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,a,c),l.version=a.version}}return{get:s,remove:r,update:o}}class Yn extends Jt{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};const r=t/2,o=e/2,a=Math.floor(n),c=Math.floor(s),l=a+1,h=c+1,d=t/a,u=e/c,f=[],g=[],v=[],m=[];for(let p=0;p<h;p++){const y=p*u-o;for(let _=0;_<l;_++){const x=_*d-r;g.push(x,-y,0),v.push(0,0,1),m.push(_/a),m.push(1-p/c)}}for(let p=0;p<c;p++)for(let y=0;y<a;y++){const _=y+l*p,x=y+l*(p+1),E=y+1+l*(p+1),b=y+1+l*p;f.push(_,x,b),f.push(x,E,b)}this.setIndex(f),this.setAttribute("position",new At(g,3)),this.setAttribute("normal",new At(v,3)),this.setAttribute("uv",new At(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Yn(t.width,t.height,t.widthSegments,t.heightSegments)}}var du=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,fu=`#ifdef USE_ALPHAHASH
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
#endif`,pu=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,mu=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,gu=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,vu=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,_u=`#ifdef USE_AOMAP
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
#endif`,xu=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Mu=`#ifdef USE_BATCHING
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
#endif`,yu=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,wu=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Su=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bu=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,Eu=`#ifdef USE_IRIDESCENCE
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
#endif`,Tu=`#ifdef USE_BUMPMAP
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
#endif`,Au=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,Cu=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Ru=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Pu=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Lu=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Du=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Iu=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Uu=`#if defined( USE_COLOR_ALPHA )
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
#endif`,Nu=`#define PI 3.141592653589793
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
} // validated`,zu=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,Fu=`vec3 transformedNormal = objectNormal;
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
#endif`,Ou=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Bu=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,ku=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Hu=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Vu="gl_FragColor = linearToOutputTexel( gl_FragColor );",Gu=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Wu=`#ifdef USE_ENVMAP
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
#endif`,Xu=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,qu=`#ifdef USE_ENVMAP
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
#endif`,Yu=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,$u=`#ifdef USE_ENVMAP
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
#endif`,Zu=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Ku=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,ju=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Ju=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Qu=`#ifdef USE_GRADIENTMAP
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
}`,td=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,ed=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,nd=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,id=`uniform bool receiveShadow;
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
#endif`,sd=`#ifdef USE_ENVMAP
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
#endif`,rd=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,od=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,ad=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,cd=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,ld=`PhysicalMaterial material;
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
#endif`,hd=`struct PhysicalMaterial {
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
}`,ud=`
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
#endif`,dd=`#if defined( RE_IndirectDiffuse )
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
#endif`,fd=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,pd=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,md=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,gd=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,vd=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,_d=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,xd=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Md=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,yd=`#if defined( USE_POINTS_UV )
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
#endif`,wd=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Sd=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,bd=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Ed=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Td=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ad=`#ifdef USE_MORPHTARGETS
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
#endif`,Cd=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Rd=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,Pd=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,Ld=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Dd=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Id=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Ud=`#ifdef USE_NORMALMAP
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
#endif`,Nd=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,zd=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Fd=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Od=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Bd=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,kd=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,Hd=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Vd=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Gd=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Wd=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Xd=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,qd=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Yd=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,$d=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Zd=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,Kd=`float getShadowMask() {
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
}`,jd=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Jd=`#ifdef USE_SKINNING
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
#endif`,Qd=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,tf=`#ifdef USE_SKINNING
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
#endif`,ef=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,nf=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,sf=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,rf=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,of=`#ifdef USE_TRANSMISSION
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
#endif`,af=`#ifdef USE_TRANSMISSION
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
#endif`,cf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,lf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,hf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,uf=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const df=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,ff=`uniform sampler2D t2D;
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
}`,pf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,mf=`#ifdef ENVMAP_TYPE_CUBE
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
}`,gf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,vf=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,_f=`#include <common>
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
}`,xf=`#if DEPTH_PACKING == 3200
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
}`,Mf=`#define DISTANCE
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
}`,yf=`#define DISTANCE
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
}`,wf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Sf=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,bf=`uniform float scale;
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
}`,Ef=`uniform vec3 diffuse;
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
}`,Tf=`#include <common>
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
}`,Af=`uniform vec3 diffuse;
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
}`,Cf=`#define LAMBERT
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
}`,Rf=`#define LAMBERT
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
}`,Pf=`#define MATCAP
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
}`,Lf=`#define MATCAP
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
}`,Df=`#define NORMAL
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
}`,If=`#define NORMAL
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
}`,Uf=`#define PHONG
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
}`,Nf=`#define PHONG
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
}`,zf=`#define STANDARD
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
}`,Ff=`#define STANDARD
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
}`,Of=`#define TOON
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
}`,Bf=`#define TOON
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
}`,kf=`uniform float size;
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
}`,Hf=`uniform vec3 diffuse;
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
}`,Vf=`#include <common>
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
}`,Gf=`uniform vec3 color;
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
}`,Wf=`uniform float rotation;
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
}`,Xf=`uniform vec3 diffuse;
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
}`,Wt={alphahash_fragment:du,alphahash_pars_fragment:fu,alphamap_fragment:pu,alphamap_pars_fragment:mu,alphatest_fragment:gu,alphatest_pars_fragment:vu,aomap_fragment:_u,aomap_pars_fragment:xu,batching_pars_vertex:Mu,batching_vertex:yu,begin_vertex:wu,beginnormal_vertex:Su,bsdfs:bu,iridescence_fragment:Eu,bumpmap_pars_fragment:Tu,clipping_planes_fragment:Au,clipping_planes_pars_fragment:Cu,clipping_planes_pars_vertex:Ru,clipping_planes_vertex:Pu,color_fragment:Lu,color_pars_fragment:Du,color_pars_vertex:Iu,color_vertex:Uu,common:Nu,cube_uv_reflection_fragment:zu,defaultnormal_vertex:Fu,displacementmap_pars_vertex:Ou,displacementmap_vertex:Bu,emissivemap_fragment:ku,emissivemap_pars_fragment:Hu,colorspace_fragment:Vu,colorspace_pars_fragment:Gu,envmap_fragment:Wu,envmap_common_pars_fragment:Xu,envmap_pars_fragment:qu,envmap_pars_vertex:Yu,envmap_physical_pars_fragment:sd,envmap_vertex:$u,fog_vertex:Zu,fog_pars_vertex:Ku,fog_fragment:ju,fog_pars_fragment:Ju,gradientmap_pars_fragment:Qu,lightmap_pars_fragment:td,lights_lambert_fragment:ed,lights_lambert_pars_fragment:nd,lights_pars_begin:id,lights_toon_fragment:rd,lights_toon_pars_fragment:od,lights_phong_fragment:ad,lights_phong_pars_fragment:cd,lights_physical_fragment:ld,lights_physical_pars_fragment:hd,lights_fragment_begin:ud,lights_fragment_maps:dd,lights_fragment_end:fd,logdepthbuf_fragment:pd,logdepthbuf_pars_fragment:md,logdepthbuf_pars_vertex:gd,logdepthbuf_vertex:vd,map_fragment:_d,map_pars_fragment:xd,map_particle_fragment:Md,map_particle_pars_fragment:yd,metalnessmap_fragment:wd,metalnessmap_pars_fragment:Sd,morphinstance_vertex:bd,morphcolor_vertex:Ed,morphnormal_vertex:Td,morphtarget_pars_vertex:Ad,morphtarget_vertex:Cd,normal_fragment_begin:Rd,normal_fragment_maps:Pd,normal_pars_fragment:Ld,normal_pars_vertex:Dd,normal_vertex:Id,normalmap_pars_fragment:Ud,clearcoat_normal_fragment_begin:Nd,clearcoat_normal_fragment_maps:zd,clearcoat_pars_fragment:Fd,iridescence_pars_fragment:Od,opaque_fragment:Bd,packing:kd,premultiplied_alpha_fragment:Hd,project_vertex:Vd,dithering_fragment:Gd,dithering_pars_fragment:Wd,roughnessmap_fragment:Xd,roughnessmap_pars_fragment:qd,shadowmap_pars_fragment:Yd,shadowmap_pars_vertex:$d,shadowmap_vertex:Zd,shadowmask_pars_fragment:Kd,skinbase_vertex:jd,skinning_pars_vertex:Jd,skinning_vertex:Qd,skinnormal_vertex:tf,specularmap_fragment:ef,specularmap_pars_fragment:nf,tonemapping_fragment:sf,tonemapping_pars_fragment:rf,transmission_fragment:of,transmission_pars_fragment:af,uv_pars_fragment:cf,uv_pars_vertex:lf,uv_vertex:hf,worldpos_vertex:uf,background_vert:df,background_frag:ff,backgroundCube_vert:pf,backgroundCube_frag:mf,cube_vert:gf,cube_frag:vf,depth_vert:_f,depth_frag:xf,distanceRGBA_vert:Mf,distanceRGBA_frag:yf,equirect_vert:wf,equirect_frag:Sf,linedashed_vert:bf,linedashed_frag:Ef,meshbasic_vert:Tf,meshbasic_frag:Af,meshlambert_vert:Cf,meshlambert_frag:Rf,meshmatcap_vert:Pf,meshmatcap_frag:Lf,meshnormal_vert:Df,meshnormal_frag:If,meshphong_vert:Uf,meshphong_frag:Nf,meshphysical_vert:zf,meshphysical_frag:Ff,meshtoon_vert:Of,meshtoon_frag:Bf,points_vert:kf,points_frag:Hf,shadow_vert:Vf,shadow_frag:Gf,sprite_vert:Wf,sprite_frag:Xf},gt={common:{diffuse:{value:new Et(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Zt},alphaMap:{value:null},alphaMapTransform:{value:new Zt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Zt}},envmap:{envMap:{value:null},envMapRotation:{value:new Zt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Zt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Zt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Zt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Zt},normalScale:{value:new wt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Zt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Zt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Zt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Zt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Et(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Et(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Zt},alphaTest:{value:0},uvTransform:{value:new Zt}},sprite:{diffuse:{value:new Et(16777215)},opacity:{value:1},center:{value:new wt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Zt},alphaMap:{value:null},alphaMapTransform:{value:new Zt},alphaTest:{value:0}}},pn={basic:{uniforms:Ne([gt.common,gt.specularmap,gt.envmap,gt.aomap,gt.lightmap,gt.fog]),vertexShader:Wt.meshbasic_vert,fragmentShader:Wt.meshbasic_frag},lambert:{uniforms:Ne([gt.common,gt.specularmap,gt.envmap,gt.aomap,gt.lightmap,gt.emissivemap,gt.bumpmap,gt.normalmap,gt.displacementmap,gt.fog,gt.lights,{emissive:{value:new Et(0)}}]),vertexShader:Wt.meshlambert_vert,fragmentShader:Wt.meshlambert_frag},phong:{uniforms:Ne([gt.common,gt.specularmap,gt.envmap,gt.aomap,gt.lightmap,gt.emissivemap,gt.bumpmap,gt.normalmap,gt.displacementmap,gt.fog,gt.lights,{emissive:{value:new Et(0)},specular:{value:new Et(1118481)},shininess:{value:30}}]),vertexShader:Wt.meshphong_vert,fragmentShader:Wt.meshphong_frag},standard:{uniforms:Ne([gt.common,gt.envmap,gt.aomap,gt.lightmap,gt.emissivemap,gt.bumpmap,gt.normalmap,gt.displacementmap,gt.roughnessmap,gt.metalnessmap,gt.fog,gt.lights,{emissive:{value:new Et(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Wt.meshphysical_vert,fragmentShader:Wt.meshphysical_frag},toon:{uniforms:Ne([gt.common,gt.aomap,gt.lightmap,gt.emissivemap,gt.bumpmap,gt.normalmap,gt.displacementmap,gt.gradientmap,gt.fog,gt.lights,{emissive:{value:new Et(0)}}]),vertexShader:Wt.meshtoon_vert,fragmentShader:Wt.meshtoon_frag},matcap:{uniforms:Ne([gt.common,gt.bumpmap,gt.normalmap,gt.displacementmap,gt.fog,{matcap:{value:null}}]),vertexShader:Wt.meshmatcap_vert,fragmentShader:Wt.meshmatcap_frag},points:{uniforms:Ne([gt.points,gt.fog]),vertexShader:Wt.points_vert,fragmentShader:Wt.points_frag},dashed:{uniforms:Ne([gt.common,gt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Wt.linedashed_vert,fragmentShader:Wt.linedashed_frag},depth:{uniforms:Ne([gt.common,gt.displacementmap]),vertexShader:Wt.depth_vert,fragmentShader:Wt.depth_frag},normal:{uniforms:Ne([gt.common,gt.bumpmap,gt.normalmap,gt.displacementmap,{opacity:{value:1}}]),vertexShader:Wt.meshnormal_vert,fragmentShader:Wt.meshnormal_frag},sprite:{uniforms:Ne([gt.sprite,gt.fog]),vertexShader:Wt.sprite_vert,fragmentShader:Wt.sprite_frag},background:{uniforms:{uvTransform:{value:new Zt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Wt.background_vert,fragmentShader:Wt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Zt}},vertexShader:Wt.backgroundCube_vert,fragmentShader:Wt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Wt.cube_vert,fragmentShader:Wt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Wt.equirect_vert,fragmentShader:Wt.equirect_frag},distanceRGBA:{uniforms:Ne([gt.common,gt.displacementmap,{referencePosition:{value:new A},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Wt.distanceRGBA_vert,fragmentShader:Wt.distanceRGBA_frag},shadow:{uniforms:Ne([gt.lights,gt.fog,{color:{value:new Et(0)},opacity:{value:1}}]),vertexShader:Wt.shadow_vert,fragmentShader:Wt.shadow_frag}};pn.physical={uniforms:Ne([pn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Zt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Zt},clearcoatNormalScale:{value:new wt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Zt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Zt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Zt},sheen:{value:0},sheenColor:{value:new Et(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Zt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Zt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Zt},transmissionSamplerSize:{value:new wt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Zt},attenuationDistance:{value:0},attenuationColor:{value:new Et(0)},specularColor:{value:new Et(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Zt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Zt},anisotropyVector:{value:new wt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Zt}}]),vertexShader:Wt.meshphysical_vert,fragmentShader:Wt.meshphysical_frag};const Ns={r:0,b:0,g:0},Qn=new ve,qf=new Xt;function Yf(i,t,e,n,s,r,o){const a=new Et(0);let c=r===!0?0:1,l,h,d=null,u=0,f=null;function g(y){let _=y.isScene===!0?y.background:null;return _&&_.isTexture&&(_=(y.backgroundBlurriness>0?e:t).get(_)),_}function v(y){let _=!1;const x=g(y);x===null?p(a,c):x&&x.isColor&&(p(x,1),_=!0);const E=i.xr.getEnvironmentBlendMode();E==="additive"?n.buffers.color.setClear(0,0,0,1,o):E==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,o),(i.autoClear||_)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function m(y,_){const x=g(_);x&&(x.isCubeTexture||x.mapping===or)?(h===void 0&&(h=new zt(new mt(1,1,1),new Ae({name:"BackgroundCubeMaterial",uniforms:ki(pn.backgroundCube.uniforms),vertexShader:pn.backgroundCube.vertexShader,fragmentShader:pn.backgroundCube.fragmentShader,side:De,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(E,b,C){this.matrixWorld.copyPosition(C.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(h)),Qn.copy(_.backgroundRotation),Qn.x*=-1,Qn.y*=-1,Qn.z*=-1,x.isCubeTexture&&x.isRenderTargetTexture===!1&&(Qn.y*=-1,Qn.z*=-1),h.material.uniforms.envMap.value=x,h.material.uniforms.flipEnvMap.value=x.isCubeTexture&&x.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=_.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=_.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(qf.makeRotationFromEuler(Qn)),h.material.toneMapped=te.getTransfer(x.colorSpace)!==ce,(d!==x||u!==x.version||f!==i.toneMapping)&&(h.material.needsUpdate=!0,d=x,u=x.version,f=i.toneMapping),h.layers.enableAll(),y.unshift(h,h.geometry,h.material,0,0,null)):x&&x.isTexture&&(l===void 0&&(l=new zt(new Yn(2,2),new Ae({name:"BackgroundMaterial",uniforms:ki(pn.background.uniforms),vertexShader:pn.background.vertexShader,fragmentShader:pn.background.fragmentShader,side:Xn,depthTest:!1,depthWrite:!1,fog:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(l)),l.material.uniforms.t2D.value=x,l.material.uniforms.backgroundIntensity.value=_.backgroundIntensity,l.material.toneMapped=te.getTransfer(x.colorSpace)!==ce,x.matrixAutoUpdate===!0&&x.updateMatrix(),l.material.uniforms.uvTransform.value.copy(x.matrix),(d!==x||u!==x.version||f!==i.toneMapping)&&(l.material.needsUpdate=!0,d=x,u=x.version,f=i.toneMapping),l.layers.enableAll(),y.unshift(l,l.geometry,l.material,0,0,null))}function p(y,_){y.getRGB(Ns,ul(i)),n.buffers.color.setClear(Ns.r,Ns.g,Ns.b,_,o)}return{getClearColor:function(){return a},setClearColor:function(y,_=1){a.set(y),c=_,p(a,c)},getClearAlpha:function(){return c},setClearAlpha:function(y){c=y,p(a,c)},render:v,addToRenderList:m}}function $f(i,t){const e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=u(null);let r=s,o=!1;function a(M,L,I,U,D){let N=!1;const F=d(U,I,L);r!==F&&(r=F,l(r.object)),N=f(M,U,I,D),N&&g(M,U,I,D),D!==null&&t.update(D,i.ELEMENT_ARRAY_BUFFER),(N||o)&&(o=!1,x(M,L,I,U),D!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(D).buffer))}function c(){return i.createVertexArray()}function l(M){return i.bindVertexArray(M)}function h(M){return i.deleteVertexArray(M)}function d(M,L,I){const U=I.wireframe===!0;let D=n[M.id];D===void 0&&(D={},n[M.id]=D);let N=D[L.id];N===void 0&&(N={},D[L.id]=N);let F=N[U];return F===void 0&&(F=u(c()),N[U]=F),F}function u(M){const L=[],I=[],U=[];for(let D=0;D<e;D++)L[D]=0,I[D]=0,U[D]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:L,enabledAttributes:I,attributeDivisors:U,object:M,attributes:{},index:null}}function f(M,L,I,U){const D=r.attributes,N=L.attributes;let F=0;const G=I.getAttributes();for(const O in G)if(G[O].location>=0){const q=D[O];let nt=N[O];if(nt===void 0&&(O==="instanceMatrix"&&M.instanceMatrix&&(nt=M.instanceMatrix),O==="instanceColor"&&M.instanceColor&&(nt=M.instanceColor)),q===void 0||q.attribute!==nt||nt&&q.data!==nt.data)return!0;F++}return r.attributesNum!==F||r.index!==U}function g(M,L,I,U){const D={},N=L.attributes;let F=0;const G=I.getAttributes();for(const O in G)if(G[O].location>=0){let q=N[O];q===void 0&&(O==="instanceMatrix"&&M.instanceMatrix&&(q=M.instanceMatrix),O==="instanceColor"&&M.instanceColor&&(q=M.instanceColor));const nt={};nt.attribute=q,q&&q.data&&(nt.data=q.data),D[O]=nt,F++}r.attributes=D,r.attributesNum=F,r.index=U}function v(){const M=r.newAttributes;for(let L=0,I=M.length;L<I;L++)M[L]=0}function m(M){p(M,0)}function p(M,L){const I=r.newAttributes,U=r.enabledAttributes,D=r.attributeDivisors;I[M]=1,U[M]===0&&(i.enableVertexAttribArray(M),U[M]=1),D[M]!==L&&(i.vertexAttribDivisor(M,L),D[M]=L)}function y(){const M=r.newAttributes,L=r.enabledAttributes;for(let I=0,U=L.length;I<U;I++)L[I]!==M[I]&&(i.disableVertexAttribArray(I),L[I]=0)}function _(M,L,I,U,D,N,F){F===!0?i.vertexAttribIPointer(M,L,I,D,N):i.vertexAttribPointer(M,L,I,U,D,N)}function x(M,L,I,U){v();const D=U.attributes,N=I.getAttributes(),F=L.defaultAttributeValues;for(const G in N){const O=N[G];if(O.location>=0){let W=D[G];if(W===void 0&&(G==="instanceMatrix"&&M.instanceMatrix&&(W=M.instanceMatrix),G==="instanceColor"&&M.instanceColor&&(W=M.instanceColor)),W!==void 0){const q=W.normalized,nt=W.itemSize,ot=t.get(W);if(ot===void 0)continue;const lt=ot.buffer,V=ot.type,K=ot.bytesPerElement,et=V===i.INT||V===i.UNSIGNED_INT||W.gpuType===Wo;if(W.isInterleavedBufferAttribute){const it=W.data,at=it.stride,ht=W.offset;if(it.isInstancedInterleavedBuffer){for(let ft=0;ft<O.locationSize;ft++)p(O.location+ft,it.meshPerAttribute);M.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=it.meshPerAttribute*it.count)}else for(let ft=0;ft<O.locationSize;ft++)m(O.location+ft);i.bindBuffer(i.ARRAY_BUFFER,lt);for(let ft=0;ft<O.locationSize;ft++)_(O.location+ft,nt/O.locationSize,V,q,at*K,(ht+nt/O.locationSize*ft)*K,et)}else{if(W.isInstancedBufferAttribute){for(let it=0;it<O.locationSize;it++)p(O.location+it,W.meshPerAttribute);M.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=W.meshPerAttribute*W.count)}else for(let it=0;it<O.locationSize;it++)m(O.location+it);i.bindBuffer(i.ARRAY_BUFFER,lt);for(let it=0;it<O.locationSize;it++)_(O.location+it,nt/O.locationSize,V,q,nt*K,nt/O.locationSize*it*K,et)}}else if(F!==void 0){const q=F[G];if(q!==void 0)switch(q.length){case 2:i.vertexAttrib2fv(O.location,q);break;case 3:i.vertexAttrib3fv(O.location,q);break;case 4:i.vertexAttrib4fv(O.location,q);break;default:i.vertexAttrib1fv(O.location,q)}}}}y()}function E(){R();for(const M in n){const L=n[M];for(const I in L){const U=L[I];for(const D in U)h(U[D].object),delete U[D];delete L[I]}delete n[M]}}function b(M){if(n[M.id]===void 0)return;const L=n[M.id];for(const I in L){const U=L[I];for(const D in U)h(U[D].object),delete U[D];delete L[I]}delete n[M.id]}function C(M){for(const L in n){const I=n[L];if(I[M.id]===void 0)continue;const U=I[M.id];for(const D in U)h(U[D].object),delete U[D];delete I[M.id]}}function R(){w(),o=!0,r!==s&&(r=s,l(r.object))}function w(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:R,resetDefaultState:w,dispose:E,releaseStatesOfGeometry:b,releaseStatesOfProgram:C,initAttributes:v,enableAttribute:m,disableUnusedAttributes:y}}function Zf(i,t,e){let n;function s(l){n=l}function r(l,h){i.drawArrays(n,l,h),e.update(h,n,1)}function o(l,h,d){d!==0&&(i.drawArraysInstanced(n,l,h,d),e.update(h,n,d))}function a(l,h,d){if(d===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,h,0,d);let f=0;for(let g=0;g<d;g++)f+=h[g];e.update(f,n,1)}function c(l,h,d,u){if(d===0)return;const f=t.get("WEBGL_multi_draw");if(f===null)for(let g=0;g<l.length;g++)o(l[g],h[g],u[g]);else{f.multiDrawArraysInstancedWEBGL(n,l,0,h,0,u,0,d);let g=0;for(let v=0;v<d;v++)g+=h[v]*u[v];e.update(g,n,1)}}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=c}function Kf(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){const C=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(C.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(C){return!(C!==$e&&n.convert(C)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(C){const R=C===hn&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(C!==en&&n.convert(C)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&C!==ln&&!R)}function c(C){if(C==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";C="mediump"}return C==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=e.precision!==void 0?e.precision:"highp";const h=c(l);h!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);const d=e.logarithmicDepthBuffer===!0,u=e.reverseDepthBuffer===!0&&t.has("EXT_clip_control"),f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),v=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),y=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),_=i.getParameter(i.MAX_VARYING_VECTORS),x=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),E=g>0,b=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:a,precision:l,logarithmicDepthBuffer:d,reverseDepthBuffer:u,maxTextures:f,maxVertexTextures:g,maxTextureSize:v,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:y,maxVaryings:_,maxFragmentUniforms:x,vertexTextures:E,maxSamples:b}}function jf(i){const t=this;let e=null,n=0,s=!1,r=!1;const o=new ei,a=new Zt,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){const f=d.length!==0||u||n!==0||s;return s=u,n=d.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(d,u){e=h(d,u,0)},this.setState=function(d,u,f){const g=d.clippingPlanes,v=d.clipIntersection,m=d.clipShadows,p=i.get(d);if(!s||g===null||g.length===0||r&&!m)r?h(null):l();else{const y=r?0:n,_=y*4;let x=p.clippingState||null;c.value=x,x=h(g,u,_,f);for(let E=0;E!==_;++E)x[E]=e[E];p.clippingState=x,this.numIntersection=v?this.numPlanes:0,this.numPlanes+=y}};function l(){c.value!==e&&(c.value=e,c.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(d,u,f,g){const v=d!==null?d.length:0;let m=null;if(v!==0){if(m=c.value,g!==!0||m===null){const p=f+v*4,y=u.matrixWorldInverse;a.getNormalMatrix(y),(m===null||m.length<p)&&(m=new Float32Array(p));for(let _=0,x=f;_!==v;++_,x+=4)o.copy(d[_]).applyMatrix4(y,a),o.normal.toArray(m,x),m[x+3]=o.constant}c.value=m,c.needsUpdate=!0}return t.numPlanes=v,t.numIntersection=0,m}}function Jf(i){let t=new WeakMap;function e(o,a){return a===lo?o.mapping=Ni:a===ho&&(o.mapping=zi),o}function n(o){if(o&&o.isTexture){const a=o.mapping;if(a===lo||a===ho)if(t.has(o)){const c=t.get(o).texture;return e(c,o.mapping)}else{const c=o.image;if(c&&c.height>0){const l=new cu(c.height);return l.fromEquirectangularTexture(i,o),t.set(o,l),o.addEventListener("dispose",s),e(l.texture,o.mapping)}else return null}}return o}function s(o){const a=o.target;a.removeEventListener("dispose",s);const c=t.get(a);c!==void 0&&(t.delete(a),c.dispose())}function r(){t=new WeakMap}return{get:n,dispose:r}}class ps extends dl{constructor(t=-1,e=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=n-t,o=n+t,a=s+e,c=s-e;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,o=r+l*this.view.width,a-=h*this.view.offsetY,c=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,c,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}const Ri=4,Za=[.125,.215,.35,.446,.526,.582],si=20,Ur=new ps,Ka=new Et;let Nr=null,zr=0,Fr=0,Or=!1;const ni=(1+Math.sqrt(5))/2,wi=1/ni,ja=[new A(-ni,wi,0),new A(ni,wi,0),new A(-wi,0,ni),new A(wi,0,ni),new A(0,ni,-wi),new A(0,ni,wi),new A(-1,1,-1),new A(1,1,-1),new A(-1,1,1),new A(1,1,1)];class Bo{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,n=.1,s=100){Nr=this._renderer.getRenderTarget(),zr=this._renderer.getActiveCubeFace(),Fr=this._renderer.getActiveMipmapLevel(),Or=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const r=this._allocateTargets();return r.depthBuffer=!0,this._sceneToCubeUV(t,n,s,r),e>0&&this._blur(r,0,0,e),this._applyPMREM(r),this._cleanup(r),r}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=tc(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Qa(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(Nr,zr,Fr),this._renderer.xr.enabled=Or,t.scissorTest=!1,zs(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Ni||t.mapping===zi?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Nr=this._renderer.getRenderTarget(),zr=this._renderer.getActiveCubeFace(),Fr=this._renderer.getActiveMipmapLevel(),Or=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:ue,minFilter:ue,generateMipmaps:!1,type:hn,format:$e,colorSpace:oi,depthBuffer:!1},s=Ja(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Ja(t,e,n);const{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Qf(r)),this._blurMaterial=t0(r,t,e)}return s}_compileMaterial(t){const e=new zt(this._lodPlanes[0],t);this._renderer.compile(e,Ur)}_sceneToCubeUV(t,e,n,s){const a=new Ye(90,1,e,n),c=[1,-1,1,1,1,1],l=[1,1,1,-1,-1,-1],h=this._renderer,d=h.autoClear,u=h.toneMapping;h.getClearColor(Ka),h.toneMapping=Ln,h.autoClear=!1;const f=new jo({name:"PMREM.Background",side:De,depthWrite:!1,depthTest:!1}),g=new zt(new mt,f);let v=!1;const m=t.background;m?m.isColor&&(f.color.copy(m),t.background=null,v=!0):(f.color.copy(Ka),v=!0);for(let p=0;p<6;p++){const y=p%3;y===0?(a.up.set(0,c[p],0),a.lookAt(l[p],0,0)):y===1?(a.up.set(0,0,c[p]),a.lookAt(0,l[p],0)):(a.up.set(0,c[p],0),a.lookAt(0,0,l[p]));const _=this._cubeSize;zs(s,y*_,p>2?_:0,_,_),h.setRenderTarget(s),v&&h.render(g,a),h.render(t,a)}g.geometry.dispose(),g.material.dispose(),h.toneMapping=u,h.autoClear=d,t.background=m}_textureToCubeUV(t,e){const n=this._renderer,s=t.mapping===Ni||t.mapping===zi;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=tc()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Qa());const r=s?this._cubemapMaterial:this._equirectMaterial,o=new zt(this._lodPlanes[0],r),a=r.uniforms;a.envMap.value=t;const c=this._cubeSize;zs(e,0,0,3*c,2*c),n.setRenderTarget(e),n.render(o,Ur)}_applyPMREM(t){const e=this._renderer,n=e.autoClear;e.autoClear=!1;const s=this._lodPlanes.length;for(let r=1;r<s;r++){const o=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),a=ja[(s-r-1)%ja.length];this._blur(t,r-1,r,o,a)}e.autoClear=n}_blur(t,e,n,s,r){const o=this._pingPongRenderTarget;this._halfBlur(t,o,e,n,s,"latitudinal",r),this._halfBlur(o,t,n,n,s,"longitudinal",r)}_halfBlur(t,e,n,s,r,o,a){const c=this._renderer,l=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,d=new zt(this._lodPlanes[s],l),u=l.uniforms,f=this._sizeLods[n]-1,g=isFinite(r)?Math.PI/(2*f):2*Math.PI/(2*si-1),v=r/g,m=isFinite(r)?1+Math.floor(h*v):si;m>si&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${si}`);const p=[];let y=0;for(let C=0;C<si;++C){const R=C/v,w=Math.exp(-R*R/2);p.push(w),C===0?y+=w:C<m&&(y+=2*w)}for(let C=0;C<p.length;C++)p[C]=p[C]/y;u.envMap.value=t.texture,u.samples.value=m,u.weights.value=p,u.latitudinal.value=o==="latitudinal",a&&(u.poleAxis.value=a);const{_lodMax:_}=this;u.dTheta.value=g,u.mipInt.value=_-n;const x=this._sizeLods[s],E=3*x*(s>_-Ri?s-_+Ri:0),b=4*(this._cubeSize-x);zs(e,E,b,3*x,2*x),c.setRenderTarget(e),c.render(d,Ur)}}function Qf(i){const t=[],e=[],n=[];let s=i;const r=i-Ri+1+Za.length;for(let o=0;o<r;o++){const a=Math.pow(2,s);e.push(a);let c=1/a;o>i-Ri?c=Za[o-i+Ri-1]:o===0&&(c=0),n.push(c);const l=1/(a-2),h=-l,d=1+l,u=[h,h,d,h,d,d,h,h,d,d,h,d],f=6,g=6,v=3,m=2,p=1,y=new Float32Array(v*g*f),_=new Float32Array(m*g*f),x=new Float32Array(p*g*f);for(let b=0;b<f;b++){const C=b%3*2/3-1,R=b>2?0:-1,w=[C,R,0,C+2/3,R,0,C+2/3,R+1,0,C,R,0,C+2/3,R+1,0,C,R+1,0];y.set(w,v*g*b),_.set(u,m*g*b);const M=[b,b,b,b,b,b];x.set(M,p*g*b)}const E=new Jt;E.setAttribute("position",new de(y,v)),E.setAttribute("uv",new de(_,m)),E.setAttribute("faceIndex",new de(x,p)),t.push(E),s>Ri&&s--}return{lodPlanes:t,sizeLods:e,sigmas:n}}function Ja(i,t,e){const n=new Ze(i,t,e);return n.texture.mapping=or,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function zs(i,t,e,n,s){i.viewport.set(t,e,n,s),i.scissor.set(t,e,n,s)}function t0(i,t,e){const n=new Float32Array(si),s=new A(0,1,0);return new Ae({name:"SphericalGaussianBlur",defines:{n:si,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Qo(),fragmentShader:`

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
		`,blending:Wn,depthTest:!1,depthWrite:!1})}function Qa(){return new Ae({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Qo(),fragmentShader:`

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
		`,blending:Wn,depthTest:!1,depthWrite:!1})}function tc(){return new Ae({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Qo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Wn,depthTest:!1,depthWrite:!1})}function Qo(){return`

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
	`}function e0(i){let t=new WeakMap,e=null;function n(a){if(a&&a.isTexture){const c=a.mapping,l=c===lo||c===ho,h=c===Ni||c===zi;if(l||h){let d=t.get(a);const u=d!==void 0?d.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==u)return e===null&&(e=new Bo(i)),d=l?e.fromEquirectangular(a,d):e.fromCubemap(a,d),d.texture.pmremVersion=a.pmremVersion,t.set(a,d),d.texture;if(d!==void 0)return d.texture;{const f=a.image;return l&&f&&f.height>0||h&&f&&s(f)?(e===null&&(e=new Bo(i)),d=l?e.fromEquirectangular(a):e.fromCubemap(a),d.texture.pmremVersion=a.pmremVersion,t.set(a,d),a.addEventListener("dispose",r),d.texture):null}}}return a}function s(a){let c=0;const l=6;for(let h=0;h<l;h++)a[h]!==void 0&&c++;return c===l}function r(a){const c=a.target;c.removeEventListener("dispose",r);const l=t.get(c);l!==void 0&&(t.delete(c),l.dispose())}function o(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:n,dispose:o}}function n0(i){const t={};function e(n){if(t[n]!==void 0)return t[n];let s;switch(n){case"WEBGL_depth_texture":s=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=i.getExtension(n)}return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){const s=e(n);return s===null&&is("THREE.WebGLRenderer: "+n+" extension not supported."),s}}}function i0(i,t,e,n){const s={},r=new WeakMap;function o(d){const u=d.target;u.index!==null&&t.remove(u.index);for(const g in u.attributes)t.remove(u.attributes[g]);for(const g in u.morphAttributes){const v=u.morphAttributes[g];for(let m=0,p=v.length;m<p;m++)t.remove(v[m])}u.removeEventListener("dispose",o),delete s[u.id];const f=r.get(u);f&&(t.remove(f),r.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function a(d,u){return s[u.id]===!0||(u.addEventListener("dispose",o),s[u.id]=!0,e.memory.geometries++),u}function c(d){const u=d.attributes;for(const g in u)t.update(u[g],i.ARRAY_BUFFER);const f=d.morphAttributes;for(const g in f){const v=f[g];for(let m=0,p=v.length;m<p;m++)t.update(v[m],i.ARRAY_BUFFER)}}function l(d){const u=[],f=d.index,g=d.attributes.position;let v=0;if(f!==null){const y=f.array;v=f.version;for(let _=0,x=y.length;_<x;_+=3){const E=y[_+0],b=y[_+1],C=y[_+2];u.push(E,b,b,C,C,E)}}else if(g!==void 0){const y=g.array;v=g.version;for(let _=0,x=y.length/3-1;_<x;_+=3){const E=_+0,b=_+1,C=_+2;u.push(E,b,b,C,C,E)}}else return;const m=new(nl(u)?hl:ll)(u,1);m.version=v;const p=r.get(d);p&&t.remove(p),r.set(d,m)}function h(d){const u=r.get(d);if(u){const f=d.index;f!==null&&u.version<f.version&&l(d)}else l(d);return r.get(d)}return{get:a,update:c,getWireframeAttribute:h}}function s0(i,t,e){let n;function s(u){n=u}let r,o;function a(u){r=u.type,o=u.bytesPerElement}function c(u,f){i.drawElements(n,f,r,u*o),e.update(f,n,1)}function l(u,f,g){g!==0&&(i.drawElementsInstanced(n,f,r,u*o,g),e.update(f,n,g))}function h(u,f,g){if(g===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,r,u,0,g);let m=0;for(let p=0;p<g;p++)m+=f[p];e.update(m,n,1)}function d(u,f,g,v){if(g===0)return;const m=t.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<u.length;p++)l(u[p]/o,f[p],v[p]);else{m.multiDrawElementsInstancedWEBGL(n,f,0,r,u,0,v,0,g);let p=0;for(let y=0;y<g;y++)p+=f[y]*v[y];e.update(p,n,1)}}this.setMode=s,this.setIndex=a,this.render=c,this.renderInstances=l,this.renderMultiDraw=h,this.renderMultiDrawInstances=d}function r0(i){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(e.calls++,o){case i.TRIANGLES:e.triangles+=a*(r/3);break;case i.LINES:e.lines+=a*(r/2);break;case i.LINE_STRIP:e.lines+=a*(r-1);break;case i.LINE_LOOP:e.lines+=a*r;break;case i.POINTS:e.points+=a*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function o0(i,t,e){const n=new WeakMap,s=new ge;function r(o,a,c){const l=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,d=h!==void 0?h.length:0;let u=n.get(a);if(u===void 0||u.count!==d){let M=function(){R.dispose(),n.delete(a),a.removeEventListener("dispose",M)};var f=M;u!==void 0&&u.texture.dispose();const g=a.morphAttributes.position!==void 0,v=a.morphAttributes.normal!==void 0,m=a.morphAttributes.color!==void 0,p=a.morphAttributes.position||[],y=a.morphAttributes.normal||[],_=a.morphAttributes.color||[];let x=0;g===!0&&(x=1),v===!0&&(x=2),m===!0&&(x=3);let E=a.attributes.position.count*x,b=1;E>t.maxTextureSize&&(b=Math.ceil(E/t.maxTextureSize),E=t.maxTextureSize);const C=new Float32Array(E*b*4*d),R=new sl(C,E,b,d);R.type=ln,R.needsUpdate=!0;const w=x*4;for(let L=0;L<d;L++){const I=p[L],U=y[L],D=_[L],N=E*b*4*L;for(let F=0;F<I.count;F++){const G=F*w;g===!0&&(s.fromBufferAttribute(I,F),C[N+G+0]=s.x,C[N+G+1]=s.y,C[N+G+2]=s.z,C[N+G+3]=0),v===!0&&(s.fromBufferAttribute(U,F),C[N+G+4]=s.x,C[N+G+5]=s.y,C[N+G+6]=s.z,C[N+G+7]=0),m===!0&&(s.fromBufferAttribute(D,F),C[N+G+8]=s.x,C[N+G+9]=s.y,C[N+G+10]=s.z,C[N+G+11]=D.itemSize===4?s.w:1)}}u={count:d,texture:R,size:new wt(E,b)},n.set(a,u),a.addEventListener("dispose",M)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)c.getUniforms().setValue(i,"morphTexture",o.morphTexture,e);else{let g=0;for(let m=0;m<l.length;m++)g+=l[m];const v=a.morphTargetsRelative?1:1-g;c.getUniforms().setValue(i,"morphTargetBaseInfluence",v),c.getUniforms().setValue(i,"morphTargetInfluences",l)}c.getUniforms().setValue(i,"morphTargetsTexture",u.texture,e),c.getUniforms().setValue(i,"morphTargetsTextureSize",u.size)}return{update:r}}function a0(i,t,e,n){let s=new WeakMap;function r(c){const l=n.render.frame,h=c.geometry,d=t.get(c,h);if(s.get(d)!==l&&(t.update(d),s.set(d,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",a)===!1&&c.addEventListener("dispose",a),s.get(c)!==l&&(e.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,i.ARRAY_BUFFER),s.set(c,l))),c.isSkinnedMesh){const u=c.skeleton;s.get(u)!==l&&(u.update(),s.set(u,l))}return d}function o(){s=new WeakMap}function a(c){const l=c.target;l.removeEventListener("dispose",a),e.remove(l.instanceMatrix),l.instanceColor!==null&&e.remove(l.instanceColor)}return{update:r,dispose:o}}class ta extends Ie{constructor(t,e,n,s,r,o,a,c,l,h=Di){if(h!==Di&&h!==Bi)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&h===Di&&(n=qn),n===void 0&&h===Bi&&(n=Oi),super(null,s,r,o,a,c,h,n,l),this.isDepthTexture=!0,this.image={width:t,height:e},this.magFilter=a!==void 0?a:Oe,this.minFilter=c!==void 0?c:Oe,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}const ml=new Ie,ec=new ta(1,1),gl=new sl,vl=new rl,_l=new fl,nc=[],ic=[],sc=new Float32Array(16),rc=new Float32Array(9),oc=new Float32Array(4);function qi(i,t,e){const n=i[0];if(n<=0||n>0)return i;const s=t*e;let r=nc[s];if(r===void 0&&(r=new Float32Array(s),nc[s]=r),t!==0){n.toArray(r,0);for(let o=1,a=0;o!==t;++o)a+=e,i[o].toArray(r,a)}return r}function be(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function Ee(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function cr(i,t){let e=ic[t];e===void 0&&(e=new Int32Array(t),ic[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function c0(i,t){const e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function l0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(be(e,t))return;i.uniform2fv(this.addr,t),Ee(e,t)}}function h0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(be(e,t))return;i.uniform3fv(this.addr,t),Ee(e,t)}}function u0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(be(e,t))return;i.uniform4fv(this.addr,t),Ee(e,t)}}function d0(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(be(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),Ee(e,t)}else{if(be(e,n))return;oc.set(n),i.uniformMatrix2fv(this.addr,!1,oc),Ee(e,n)}}function f0(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(be(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),Ee(e,t)}else{if(be(e,n))return;rc.set(n),i.uniformMatrix3fv(this.addr,!1,rc),Ee(e,n)}}function p0(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(be(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),Ee(e,t)}else{if(be(e,n))return;sc.set(n),i.uniformMatrix4fv(this.addr,!1,sc),Ee(e,n)}}function m0(i,t){const e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function g0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(be(e,t))return;i.uniform2iv(this.addr,t),Ee(e,t)}}function v0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(be(e,t))return;i.uniform3iv(this.addr,t),Ee(e,t)}}function _0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(be(e,t))return;i.uniform4iv(this.addr,t),Ee(e,t)}}function x0(i,t){const e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function M0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(be(e,t))return;i.uniform2uiv(this.addr,t),Ee(e,t)}}function y0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(be(e,t))return;i.uniform3uiv(this.addr,t),Ee(e,t)}}function w0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(be(e,t))return;i.uniform4uiv(this.addr,t),Ee(e,t)}}function S0(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(ec.compareFunction=tl,r=ec):r=ml,e.setTexture2D(t||r,s)}function b0(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||vl,s)}function E0(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTextureCube(t||_l,s)}function T0(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||gl,s)}function A0(i){switch(i){case 5126:return c0;case 35664:return l0;case 35665:return h0;case 35666:return u0;case 35674:return d0;case 35675:return f0;case 35676:return p0;case 5124:case 35670:return m0;case 35667:case 35671:return g0;case 35668:case 35672:return v0;case 35669:case 35673:return _0;case 5125:return x0;case 36294:return M0;case 36295:return y0;case 36296:return w0;case 35678:case 36198:case 36298:case 36306:case 35682:return S0;case 35679:case 36299:case 36307:return b0;case 35680:case 36300:case 36308:case 36293:return E0;case 36289:case 36303:case 36311:case 36292:return T0}}function C0(i,t){i.uniform1fv(this.addr,t)}function R0(i,t){const e=qi(t,this.size,2);i.uniform2fv(this.addr,e)}function P0(i,t){const e=qi(t,this.size,3);i.uniform3fv(this.addr,e)}function L0(i,t){const e=qi(t,this.size,4);i.uniform4fv(this.addr,e)}function D0(i,t){const e=qi(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function I0(i,t){const e=qi(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function U0(i,t){const e=qi(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function N0(i,t){i.uniform1iv(this.addr,t)}function z0(i,t){i.uniform2iv(this.addr,t)}function F0(i,t){i.uniform3iv(this.addr,t)}function O0(i,t){i.uniform4iv(this.addr,t)}function B0(i,t){i.uniform1uiv(this.addr,t)}function k0(i,t){i.uniform2uiv(this.addr,t)}function H0(i,t){i.uniform3uiv(this.addr,t)}function V0(i,t){i.uniform4uiv(this.addr,t)}function G0(i,t,e){const n=this.cache,s=t.length,r=cr(e,s);be(n,r)||(i.uniform1iv(this.addr,r),Ee(n,r));for(let o=0;o!==s;++o)e.setTexture2D(t[o]||ml,r[o])}function W0(i,t,e){const n=this.cache,s=t.length,r=cr(e,s);be(n,r)||(i.uniform1iv(this.addr,r),Ee(n,r));for(let o=0;o!==s;++o)e.setTexture3D(t[o]||vl,r[o])}function X0(i,t,e){const n=this.cache,s=t.length,r=cr(e,s);be(n,r)||(i.uniform1iv(this.addr,r),Ee(n,r));for(let o=0;o!==s;++o)e.setTextureCube(t[o]||_l,r[o])}function q0(i,t,e){const n=this.cache,s=t.length,r=cr(e,s);be(n,r)||(i.uniform1iv(this.addr,r),Ee(n,r));for(let o=0;o!==s;++o)e.setTexture2DArray(t[o]||gl,r[o])}function Y0(i){switch(i){case 5126:return C0;case 35664:return R0;case 35665:return P0;case 35666:return L0;case 35674:return D0;case 35675:return I0;case 35676:return U0;case 5124:case 35670:return N0;case 35667:case 35671:return z0;case 35668:case 35672:return F0;case 35669:case 35673:return O0;case 5125:return B0;case 36294:return k0;case 36295:return H0;case 36296:return V0;case 35678:case 36198:case 36298:case 36306:case 35682:return G0;case 35679:case 36299:case 36307:return W0;case 35680:case 36300:case 36308:case 36293:return X0;case 36289:case 36303:case 36311:case 36292:return q0}}class $0{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=A0(e.type)}}class Z0{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=Y0(e.type)}}class K0{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){const s=this.seq;for(let r=0,o=s.length;r!==o;++r){const a=s[r];a.setValue(t,e[a.id],n)}}}const Br=/(\w+)(\])?(\[|\.)?/g;function ac(i,t){i.seq.push(t),i.map[t.id]=t}function j0(i,t,e){const n=i.name,s=n.length;for(Br.lastIndex=0;;){const r=Br.exec(n),o=Br.lastIndex;let a=r[1];const c=r[2]==="]",l=r[3];if(c&&(a=a|0),l===void 0||l==="["&&o+2===s){ac(e,l===void 0?new $0(a,i,t):new Z0(a,i,t));break}else{let d=e.map[a];d===void 0&&(d=new K0(a),ac(e,d)),e=d}}}class er{constructor(t,e){this.seq=[],this.map={};const n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let s=0;s<n;++s){const r=t.getActiveUniform(e,s),o=t.getUniformLocation(e,r.name);j0(r,o,this)}}setValue(t,e,n,s){const r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){const s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,o=e.length;r!==o;++r){const a=e[r],c=n[a.id];c.needsUpdate!==!1&&a.setValue(t,c.value,s)}}static seqWithValue(t,e){const n=[];for(let s=0,r=t.length;s!==r;++s){const o=t[s];o.id in e&&n.push(o)}return n}}function cc(i,t,e){const n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}const J0=37297;let Q0=0;function tp(i,t){const e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let o=s;o<r;o++){const a=o+1;n.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return n.join(`
`)}const lc=new Zt;function ep(i){te._getMatrix(lc,te.workingColorSpace,i);const t=`mat3( ${lc.elements.map(e=>e.toFixed(4))} )`;switch(te.getTransfer(i)){case ar:return[t,"LinearTransferOETF"];case ce:return[t,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function hc(i,t,e){const n=i.getShaderParameter(t,i.COMPILE_STATUS),s=i.getShaderInfoLog(t).trim();if(n&&s==="")return"";const r=/ERROR: 0:(\d+)/.exec(s);if(r){const o=parseInt(r[1]);return e.toUpperCase()+`

`+s+`

`+tp(i.getShaderSource(t),o)}else return s}function np(i,t){const e=ep(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}function ip(i,t){let e;switch(t){case eh:e="Linear";break;case nh:e="Reinhard";break;case ih:e="Cineon";break;case sh:e="ACESFilmic";break;case oh:e="AgX";break;case ah:e="Neutral";break;case rh:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const Fs=new A;function sp(){te.getLuminanceCoefficients(Fs);const i=Fs.x.toFixed(4),t=Fs.y.toFixed(4),e=Fs.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function rp(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(ss).join(`
`)}function op(i){const t=[];for(const e in i){const n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function ap(i,t){const e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){const r=i.getActiveAttrib(t,s),o=r.name;let a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),e[o]={type:r.type,location:i.getAttribLocation(t,o),locationSize:a}}return e}function ss(i){return i!==""}function uc(i,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function dc(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const cp=/^[ \t]*#include +<([\w\d./]+)>/gm;function ko(i){return i.replace(cp,hp)}const lp=new Map;function hp(i,t){let e=Wt[t];if(e===void 0){const n=lp.get(t);if(n!==void 0)e=Wt[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("Can not resolve #include <"+t+">")}return ko(e)}const up=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function fc(i){return i.replace(up,dp)}function dp(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function pc(i){let t=`precision ${i.precision} float;
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
	`;return i.precision==="highp"?t+=`
#define HIGH_PRECISION`:i.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function fp(i){let t="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===kc?t="SHADOWMAP_TYPE_PCF":i.shadowMapType===Hc?t="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===En&&(t="SHADOWMAP_TYPE_VSM"),t}function pp(i){let t="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case Ni:case zi:t="ENVMAP_TYPE_CUBE";break;case or:t="ENVMAP_TYPE_CUBE_UV";break}return t}function mp(i){let t="ENVMAP_MODE_REFLECTION";if(i.envMap)switch(i.envMapMode){case zi:t="ENVMAP_MODE_REFRACTION";break}return t}function gp(i){let t="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case Vc:t="ENVMAP_BLENDING_MULTIPLY";break;case Ql:t="ENVMAP_BLENDING_MIX";break;case th:t="ENVMAP_BLENDING_ADD";break}return t}function vp(i){const t=i.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),7*16)),texelHeight:n,maxMip:e}}function _p(i,t,e,n){const s=i.getContext(),r=e.defines;let o=e.vertexShader,a=e.fragmentShader;const c=fp(e),l=pp(e),h=mp(e),d=gp(e),u=vp(e),f=rp(e),g=op(r),v=s.createProgram();let m,p,y=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(m=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(ss).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(ss).join(`
`),p.length>0&&(p+=`
`)):(m=[pc(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(ss).join(`
`),p=[pc(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+l:"",e.envMap?"#define "+h:"",e.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+c:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Ln?"#define TONE_MAPPING":"",e.toneMapping!==Ln?Wt.tonemapping_pars_fragment:"",e.toneMapping!==Ln?ip("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Wt.colorspace_pars_fragment,np("linearToOutputTexel",e.outputColorSpace),sp(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(ss).join(`
`)),o=ko(o),o=uc(o,e),o=dc(o,e),a=ko(a),a=uc(a,e),a=dc(a,e),o=fc(o),a=fc(a),e.isRawShaderMaterial!==!0&&(y=`#version 300 es
`,m=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",e.glslVersion===Aa?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Aa?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const _=y+m+o,x=y+p+a,E=cc(s,s.VERTEX_SHADER,_),b=cc(s,s.FRAGMENT_SHADER,x);s.attachShader(v,E),s.attachShader(v,b),e.index0AttributeName!==void 0?s.bindAttribLocation(v,0,e.index0AttributeName):e.morphTargets===!0&&s.bindAttribLocation(v,0,"position"),s.linkProgram(v);function C(L){if(i.debug.checkShaderErrors){const I=s.getProgramInfoLog(v).trim(),U=s.getShaderInfoLog(E).trim(),D=s.getShaderInfoLog(b).trim();let N=!0,F=!0;if(s.getProgramParameter(v,s.LINK_STATUS)===!1)if(N=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,v,E,b);else{const G=hc(s,E,"vertex"),O=hc(s,b,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(v,s.VALIDATE_STATUS)+`

Material Name: `+L.name+`
Material Type: `+L.type+`

Program Info Log: `+I+`
`+G+`
`+O)}else I!==""?console.warn("THREE.WebGLProgram: Program Info Log:",I):(U===""||D==="")&&(F=!1);F&&(L.diagnostics={runnable:N,programLog:I,vertexShader:{log:U,prefix:m},fragmentShader:{log:D,prefix:p}})}s.deleteShader(E),s.deleteShader(b),R=new er(s,v),w=ap(s,v)}let R;this.getUniforms=function(){return R===void 0&&C(this),R};let w;this.getAttributes=function(){return w===void 0&&C(this),w};let M=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return M===!1&&(M=s.getProgramParameter(v,J0)),M},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(v),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=Q0++,this.cacheKey=t,this.usedTimes=1,this.program=v,this.vertexShader=E,this.fragmentShader=b,this}let xp=0;class Mp{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,n=t.fragmentShader,s=this._getShaderStage(e),r=this._getShaderStage(n),o=this._getShaderCacheForMaterial(t);return o.has(s)===!1&&(o.add(s),s.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){const e=this.shaderCache;let n=e.get(t);return n===void 0&&(n=new yp(t),e.set(t,n)),n}}class yp{constructor(t){this.id=xp++,this.code=t,this.usedTimes=0}}function wp(i,t,e,n,s,r,o){const a=new al,c=new Mp,l=new Set,h=[],d=s.logarithmicDepthBuffer,u=s.vertexTextures;let f=s.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function v(w){return l.add(w),w===0?"uv":`uv${w}`}function m(w,M,L,I,U){const D=I.fog,N=U.geometry,F=w.isMeshStandardMaterial?I.environment:null,G=(w.isMeshStandardMaterial?e:t).get(w.envMap||F),O=G&&G.mapping===or?G.image.height:null,W=g[w.type];w.precision!==null&&(f=s.getMaxPrecision(w.precision),f!==w.precision&&console.warn("THREE.WebGLProgram.getParameters:",w.precision,"not supported, using",f,"instead."));const q=N.morphAttributes.position||N.morphAttributes.normal||N.morphAttributes.color,nt=q!==void 0?q.length:0;let ot=0;N.morphAttributes.position!==void 0&&(ot=1),N.morphAttributes.normal!==void 0&&(ot=2),N.morphAttributes.color!==void 0&&(ot=3);let lt,V,K,et;if(W){const oe=pn[W];lt=oe.vertexShader,V=oe.fragmentShader}else lt=w.vertexShader,V=w.fragmentShader,c.update(w),K=c.getVertexShaderID(w),et=c.getFragmentShaderID(w);const it=i.getRenderTarget(),at=i.state.buffers.depth.getReversed(),ht=U.isInstancedMesh===!0,ft=U.isBatchedMesh===!0,Ot=!!w.map,xt=!!w.matcap,Vt=!!G,z=!!w.aoMap,ae=!!w.lightMap,Ft=!!w.bumpMap,Bt=!!w.normalMap,Rt=!!w.displacementMap,ie=!!w.emissiveMap,It=!!w.metalnessMap,P=!!w.roughnessMap,S=w.anisotropy>0,X=w.clearcoat>0,tt=w.dispersion>0,rt=w.iridescence>0,j=w.sheen>0,bt=w.transmission>0,ut=S&&!!w.anisotropyMap,Mt=X&&!!w.clearcoatMap,qt=X&&!!w.clearcoatNormalMap,ct=X&&!!w.clearcoatRoughnessMap,Tt=rt&&!!w.iridescenceMap,Ht=rt&&!!w.iridescenceThicknessMap,Q=j&&!!w.sheenColorMap,J=j&&!!w.sheenRoughnessMap,Ut=!!w.specularMap,St=!!w.specularColorMap,kt=!!w.specularIntensityMap,B=bt&&!!w.transmissionMap,pt=bt&&!!w.thicknessMap,Z=!!w.gradientMap,st=!!w.alphaMap,yt=w.alphaTest>0,vt=!!w.alphaHash,Yt=!!w.extensions;let _e=Ln;w.toneMapped&&(it===null||it.isXRRenderTarget===!0)&&(_e=i.toneMapping);const Re={shaderID:W,shaderType:w.type,shaderName:w.name,vertexShader:lt,fragmentShader:V,defines:w.defines,customVertexShaderID:K,customFragmentShaderID:et,isRawShaderMaterial:w.isRawShaderMaterial===!0,glslVersion:w.glslVersion,precision:f,batching:ft,batchingColor:ft&&U._colorsTexture!==null,instancing:ht,instancingColor:ht&&U.instanceColor!==null,instancingMorph:ht&&U.morphTexture!==null,supportsVertexTextures:u,outputColorSpace:it===null?i.outputColorSpace:it.isXRRenderTarget===!0?it.texture.colorSpace:oi,alphaToCoverage:!!w.alphaToCoverage,map:Ot,matcap:xt,envMap:Vt,envMapMode:Vt&&G.mapping,envMapCubeUVHeight:O,aoMap:z,lightMap:ae,bumpMap:Ft,normalMap:Bt,displacementMap:u&&Rt,emissiveMap:ie,normalMapObjectSpace:Bt&&w.normalMapType===uh,normalMapTangentSpace:Bt&&w.normalMapType===Qc,metalnessMap:It,roughnessMap:P,anisotropy:S,anisotropyMap:ut,clearcoat:X,clearcoatMap:Mt,clearcoatNormalMap:qt,clearcoatRoughnessMap:ct,dispersion:tt,iridescence:rt,iridescenceMap:Tt,iridescenceThicknessMap:Ht,sheen:j,sheenColorMap:Q,sheenRoughnessMap:J,specularMap:Ut,specularColorMap:St,specularIntensityMap:kt,transmission:bt,transmissionMap:B,thicknessMap:pt,gradientMap:Z,opaque:w.transparent===!1&&w.blending===Pn&&w.alphaToCoverage===!1,alphaMap:st,alphaTest:yt,alphaHash:vt,combine:w.combine,mapUv:Ot&&v(w.map.channel),aoMapUv:z&&v(w.aoMap.channel),lightMapUv:ae&&v(w.lightMap.channel),bumpMapUv:Ft&&v(w.bumpMap.channel),normalMapUv:Bt&&v(w.normalMap.channel),displacementMapUv:Rt&&v(w.displacementMap.channel),emissiveMapUv:ie&&v(w.emissiveMap.channel),metalnessMapUv:It&&v(w.metalnessMap.channel),roughnessMapUv:P&&v(w.roughnessMap.channel),anisotropyMapUv:ut&&v(w.anisotropyMap.channel),clearcoatMapUv:Mt&&v(w.clearcoatMap.channel),clearcoatNormalMapUv:qt&&v(w.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ct&&v(w.clearcoatRoughnessMap.channel),iridescenceMapUv:Tt&&v(w.iridescenceMap.channel),iridescenceThicknessMapUv:Ht&&v(w.iridescenceThicknessMap.channel),sheenColorMapUv:Q&&v(w.sheenColorMap.channel),sheenRoughnessMapUv:J&&v(w.sheenRoughnessMap.channel),specularMapUv:Ut&&v(w.specularMap.channel),specularColorMapUv:St&&v(w.specularColorMap.channel),specularIntensityMapUv:kt&&v(w.specularIntensityMap.channel),transmissionMapUv:B&&v(w.transmissionMap.channel),thicknessMapUv:pt&&v(w.thicknessMap.channel),alphaMapUv:st&&v(w.alphaMap.channel),vertexTangents:!!N.attributes.tangent&&(Bt||S),vertexColors:w.vertexColors,vertexAlphas:w.vertexColors===!0&&!!N.attributes.color&&N.attributes.color.itemSize===4,pointsUvs:U.isPoints===!0&&!!N.attributes.uv&&(Ot||st),fog:!!D,useFog:w.fog===!0,fogExp2:!!D&&D.isFogExp2,flatShading:w.flatShading===!0,sizeAttenuation:w.sizeAttenuation===!0,logarithmicDepthBuffer:d,reverseDepthBuffer:at,skinning:U.isSkinnedMesh===!0,morphTargets:N.morphAttributes.position!==void 0,morphNormals:N.morphAttributes.normal!==void 0,morphColors:N.morphAttributes.color!==void 0,morphTargetsCount:nt,morphTextureStride:ot,numDirLights:M.directional.length,numPointLights:M.point.length,numSpotLights:M.spot.length,numSpotLightMaps:M.spotLightMap.length,numRectAreaLights:M.rectArea.length,numHemiLights:M.hemi.length,numDirLightShadows:M.directionalShadowMap.length,numPointLightShadows:M.pointShadowMap.length,numSpotLightShadows:M.spotShadowMap.length,numSpotLightShadowsWithMaps:M.numSpotLightShadowsWithMaps,numLightProbes:M.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:w.dithering,shadowMapEnabled:i.shadowMap.enabled&&L.length>0,shadowMapType:i.shadowMap.type,toneMapping:_e,decodeVideoTexture:Ot&&w.map.isVideoTexture===!0&&te.getTransfer(w.map.colorSpace)===ce,decodeVideoTextureEmissive:ie&&w.emissiveMap.isVideoTexture===!0&&te.getTransfer(w.emissiveMap.colorSpace)===ce,premultipliedAlpha:w.premultipliedAlpha,doubleSided:w.side===Fe,flipSided:w.side===De,useDepthPacking:w.depthPacking>=0,depthPacking:w.depthPacking||0,index0AttributeName:w.index0AttributeName,extensionClipCullDistance:Yt&&w.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Yt&&w.extensions.multiDraw===!0||ft)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:w.customProgramCacheKey()};return Re.vertexUv1s=l.has(1),Re.vertexUv2s=l.has(2),Re.vertexUv3s=l.has(3),l.clear(),Re}function p(w){const M=[];if(w.shaderID?M.push(w.shaderID):(M.push(w.customVertexShaderID),M.push(w.customFragmentShaderID)),w.defines!==void 0)for(const L in w.defines)M.push(L),M.push(w.defines[L]);return w.isRawShaderMaterial===!1&&(y(M,w),_(M,w),M.push(i.outputColorSpace)),M.push(w.customProgramCacheKey),M.join()}function y(w,M){w.push(M.precision),w.push(M.outputColorSpace),w.push(M.envMapMode),w.push(M.envMapCubeUVHeight),w.push(M.mapUv),w.push(M.alphaMapUv),w.push(M.lightMapUv),w.push(M.aoMapUv),w.push(M.bumpMapUv),w.push(M.normalMapUv),w.push(M.displacementMapUv),w.push(M.emissiveMapUv),w.push(M.metalnessMapUv),w.push(M.roughnessMapUv),w.push(M.anisotropyMapUv),w.push(M.clearcoatMapUv),w.push(M.clearcoatNormalMapUv),w.push(M.clearcoatRoughnessMapUv),w.push(M.iridescenceMapUv),w.push(M.iridescenceThicknessMapUv),w.push(M.sheenColorMapUv),w.push(M.sheenRoughnessMapUv),w.push(M.specularMapUv),w.push(M.specularColorMapUv),w.push(M.specularIntensityMapUv),w.push(M.transmissionMapUv),w.push(M.thicknessMapUv),w.push(M.combine),w.push(M.fogExp2),w.push(M.sizeAttenuation),w.push(M.morphTargetsCount),w.push(M.morphAttributeCount),w.push(M.numDirLights),w.push(M.numPointLights),w.push(M.numSpotLights),w.push(M.numSpotLightMaps),w.push(M.numHemiLights),w.push(M.numRectAreaLights),w.push(M.numDirLightShadows),w.push(M.numPointLightShadows),w.push(M.numSpotLightShadows),w.push(M.numSpotLightShadowsWithMaps),w.push(M.numLightProbes),w.push(M.shadowMapType),w.push(M.toneMapping),w.push(M.numClippingPlanes),w.push(M.numClipIntersection),w.push(M.depthPacking)}function _(w,M){a.disableAll(),M.supportsVertexTextures&&a.enable(0),M.instancing&&a.enable(1),M.instancingColor&&a.enable(2),M.instancingMorph&&a.enable(3),M.matcap&&a.enable(4),M.envMap&&a.enable(5),M.normalMapObjectSpace&&a.enable(6),M.normalMapTangentSpace&&a.enable(7),M.clearcoat&&a.enable(8),M.iridescence&&a.enable(9),M.alphaTest&&a.enable(10),M.vertexColors&&a.enable(11),M.vertexAlphas&&a.enable(12),M.vertexUv1s&&a.enable(13),M.vertexUv2s&&a.enable(14),M.vertexUv3s&&a.enable(15),M.vertexTangents&&a.enable(16),M.anisotropy&&a.enable(17),M.alphaHash&&a.enable(18),M.batching&&a.enable(19),M.dispersion&&a.enable(20),M.batchingColor&&a.enable(21),w.push(a.mask),a.disableAll(),M.fog&&a.enable(0),M.useFog&&a.enable(1),M.flatShading&&a.enable(2),M.logarithmicDepthBuffer&&a.enable(3),M.reverseDepthBuffer&&a.enable(4),M.skinning&&a.enable(5),M.morphTargets&&a.enable(6),M.morphNormals&&a.enable(7),M.morphColors&&a.enable(8),M.premultipliedAlpha&&a.enable(9),M.shadowMapEnabled&&a.enable(10),M.doubleSided&&a.enable(11),M.flipSided&&a.enable(12),M.useDepthPacking&&a.enable(13),M.dithering&&a.enable(14),M.transmission&&a.enable(15),M.sheen&&a.enable(16),M.opaque&&a.enable(17),M.pointsUvs&&a.enable(18),M.decodeVideoTexture&&a.enable(19),M.decodeVideoTextureEmissive&&a.enable(20),M.alphaToCoverage&&a.enable(21),w.push(a.mask)}function x(w){const M=g[w.type];let L;if(M){const I=pn[M];L=su.clone(I.uniforms)}else L=w.uniforms;return L}function E(w,M){let L;for(let I=0,U=h.length;I<U;I++){const D=h[I];if(D.cacheKey===M){L=D,++L.usedTimes;break}}return L===void 0&&(L=new _p(i,M,w,r),h.push(L)),L}function b(w){if(--w.usedTimes===0){const M=h.indexOf(w);h[M]=h[h.length-1],h.pop(),w.destroy()}}function C(w){c.remove(w)}function R(){c.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:x,acquireProgram:E,releaseProgram:b,releaseShaderCache:C,programs:h,dispose:R}}function Sp(){let i=new WeakMap;function t(o){return i.has(o)}function e(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function s(o,a,c){i.get(o)[a]=c}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function bp(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.z!==t.z?i.z-t.z:i.id-t.id}function mc(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function gc(){const i=[];let t=0;const e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function o(d,u,f,g,v,m){let p=i[t];return p===void 0?(p={id:d.id,object:d,geometry:u,material:f,groupOrder:g,renderOrder:d.renderOrder,z:v,group:m},i[t]=p):(p.id=d.id,p.object=d,p.geometry=u,p.material=f,p.groupOrder=g,p.renderOrder=d.renderOrder,p.z=v,p.group=m),t++,p}function a(d,u,f,g,v,m){const p=o(d,u,f,g,v,m);f.transmission>0?n.push(p):f.transparent===!0?s.push(p):e.push(p)}function c(d,u,f,g,v,m){const p=o(d,u,f,g,v,m);f.transmission>0?n.unshift(p):f.transparent===!0?s.unshift(p):e.unshift(p)}function l(d,u){e.length>1&&e.sort(d||bp),n.length>1&&n.sort(u||mc),s.length>1&&s.sort(u||mc)}function h(){for(let d=t,u=i.length;d<u;d++){const f=i[d];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:a,unshift:c,finish:h,sort:l}}function Ep(){let i=new WeakMap;function t(n,s){const r=i.get(n);let o;return r===void 0?(o=new gc,i.set(n,[o])):s>=r.length?(o=new gc,r.push(o)):o=r[s],o}function e(){i=new WeakMap}return{get:t,dispose:e}}function Tp(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new A,color:new Et};break;case"SpotLight":e={position:new A,direction:new A,color:new Et,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new A,color:new Et,distance:0,decay:0};break;case"HemisphereLight":e={direction:new A,skyColor:new Et,groundColor:new Et};break;case"RectAreaLight":e={color:new Et,position:new A,halfWidth:new A,halfHeight:new A};break}return i[t.id]=e,e}}}function Ap(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new wt};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new wt};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new wt,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}let Cp=0;function Rp(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function Pp(i){const t=new Tp,e=Ap(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new A);const s=new A,r=new Xt,o=new Xt;function a(l){let h=0,d=0,u=0;for(let w=0;w<9;w++)n.probe[w].set(0,0,0);let f=0,g=0,v=0,m=0,p=0,y=0,_=0,x=0,E=0,b=0,C=0;l.sort(Rp);for(let w=0,M=l.length;w<M;w++){const L=l[w],I=L.color,U=L.intensity,D=L.distance,N=L.shadow&&L.shadow.map?L.shadow.map.texture:null;if(L.isAmbientLight)h+=I.r*U,d+=I.g*U,u+=I.b*U;else if(L.isLightProbe){for(let F=0;F<9;F++)n.probe[F].addScaledVector(L.sh.coefficients[F],U);C++}else if(L.isDirectionalLight){const F=t.get(L);if(F.color.copy(L.color).multiplyScalar(L.intensity),L.castShadow){const G=L.shadow,O=e.get(L);O.shadowIntensity=G.intensity,O.shadowBias=G.bias,O.shadowNormalBias=G.normalBias,O.shadowRadius=G.radius,O.shadowMapSize=G.mapSize,n.directionalShadow[f]=O,n.directionalShadowMap[f]=N,n.directionalShadowMatrix[f]=L.shadow.matrix,y++}n.directional[f]=F,f++}else if(L.isSpotLight){const F=t.get(L);F.position.setFromMatrixPosition(L.matrixWorld),F.color.copy(I).multiplyScalar(U),F.distance=D,F.coneCos=Math.cos(L.angle),F.penumbraCos=Math.cos(L.angle*(1-L.penumbra)),F.decay=L.decay,n.spot[v]=F;const G=L.shadow;if(L.map&&(n.spotLightMap[E]=L.map,E++,G.updateMatrices(L),L.castShadow&&b++),n.spotLightMatrix[v]=G.matrix,L.castShadow){const O=e.get(L);O.shadowIntensity=G.intensity,O.shadowBias=G.bias,O.shadowNormalBias=G.normalBias,O.shadowRadius=G.radius,O.shadowMapSize=G.mapSize,n.spotShadow[v]=O,n.spotShadowMap[v]=N,x++}v++}else if(L.isRectAreaLight){const F=t.get(L);F.color.copy(I).multiplyScalar(U),F.halfWidth.set(L.width*.5,0,0),F.halfHeight.set(0,L.height*.5,0),n.rectArea[m]=F,m++}else if(L.isPointLight){const F=t.get(L);if(F.color.copy(L.color).multiplyScalar(L.intensity),F.distance=L.distance,F.decay=L.decay,L.castShadow){const G=L.shadow,O=e.get(L);O.shadowIntensity=G.intensity,O.shadowBias=G.bias,O.shadowNormalBias=G.normalBias,O.shadowRadius=G.radius,O.shadowMapSize=G.mapSize,O.shadowCameraNear=G.camera.near,O.shadowCameraFar=G.camera.far,n.pointShadow[g]=O,n.pointShadowMap[g]=N,n.pointShadowMatrix[g]=L.shadow.matrix,_++}n.point[g]=F,g++}else if(L.isHemisphereLight){const F=t.get(L);F.skyColor.copy(L.color).multiplyScalar(U),F.groundColor.copy(L.groundColor).multiplyScalar(U),n.hemi[p]=F,p++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=gt.LTC_FLOAT_1,n.rectAreaLTC2=gt.LTC_FLOAT_2):(n.rectAreaLTC1=gt.LTC_HALF_1,n.rectAreaLTC2=gt.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=d,n.ambient[2]=u;const R=n.hash;(R.directionalLength!==f||R.pointLength!==g||R.spotLength!==v||R.rectAreaLength!==m||R.hemiLength!==p||R.numDirectionalShadows!==y||R.numPointShadows!==_||R.numSpotShadows!==x||R.numSpotMaps!==E||R.numLightProbes!==C)&&(n.directional.length=f,n.spot.length=v,n.rectArea.length=m,n.point.length=g,n.hemi.length=p,n.directionalShadow.length=y,n.directionalShadowMap.length=y,n.pointShadow.length=_,n.pointShadowMap.length=_,n.spotShadow.length=x,n.spotShadowMap.length=x,n.directionalShadowMatrix.length=y,n.pointShadowMatrix.length=_,n.spotLightMatrix.length=x+E-b,n.spotLightMap.length=E,n.numSpotLightShadowsWithMaps=b,n.numLightProbes=C,R.directionalLength=f,R.pointLength=g,R.spotLength=v,R.rectAreaLength=m,R.hemiLength=p,R.numDirectionalShadows=y,R.numPointShadows=_,R.numSpotShadows=x,R.numSpotMaps=E,R.numLightProbes=C,n.version=Cp++)}function c(l,h){let d=0,u=0,f=0,g=0,v=0;const m=h.matrixWorldInverse;for(let p=0,y=l.length;p<y;p++){const _=l[p];if(_.isDirectionalLight){const x=n.directional[d];x.direction.setFromMatrixPosition(_.matrixWorld),s.setFromMatrixPosition(_.target.matrixWorld),x.direction.sub(s),x.direction.transformDirection(m),d++}else if(_.isSpotLight){const x=n.spot[f];x.position.setFromMatrixPosition(_.matrixWorld),x.position.applyMatrix4(m),x.direction.setFromMatrixPosition(_.matrixWorld),s.setFromMatrixPosition(_.target.matrixWorld),x.direction.sub(s),x.direction.transformDirection(m),f++}else if(_.isRectAreaLight){const x=n.rectArea[g];x.position.setFromMatrixPosition(_.matrixWorld),x.position.applyMatrix4(m),o.identity(),r.copy(_.matrixWorld),r.premultiply(m),o.extractRotation(r),x.halfWidth.set(_.width*.5,0,0),x.halfHeight.set(0,_.height*.5,0),x.halfWidth.applyMatrix4(o),x.halfHeight.applyMatrix4(o),g++}else if(_.isPointLight){const x=n.point[u];x.position.setFromMatrixPosition(_.matrixWorld),x.position.applyMatrix4(m),u++}else if(_.isHemisphereLight){const x=n.hemi[v];x.direction.setFromMatrixPosition(_.matrixWorld),x.direction.transformDirection(m),v++}}}return{setup:a,setupView:c,state:n}}function vc(i){const t=new Pp(i),e=[],n=[];function s(h){l.camera=h,e.length=0,n.length=0}function r(h){e.push(h)}function o(h){n.push(h)}function a(){t.setup(e)}function c(h){t.setupView(e,h)}const l={lightsArray:e,shadowsArray:n,camera:null,lights:t,transmissionRenderTarget:{}};return{init:s,state:l,setupLights:a,setupLightsView:c,pushLight:r,pushShadow:o}}function Lp(i){let t=new WeakMap;function e(s,r=0){const o=t.get(s);let a;return o===void 0?(a=new vc(i),t.set(s,[a])):r>=o.length?(a=new vc(i),o.push(a)):a=o[r],a}function n(){t=new WeakMap}return{get:e,dispose:n}}class Dp extends Xi{static get type(){return"MeshDepthMaterial"}constructor(t){super(),this.isMeshDepthMaterial=!0,this.depthPacking=lh,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class Ip extends Xi{static get type(){return"MeshDistanceMaterial"}constructor(t){super(),this.isMeshDistanceMaterial=!0,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}const Up=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Np=`uniform sampler2D shadow_pass;
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
}`;function zp(i,t,e){let n=new Jo;const s=new wt,r=new wt,o=new ge,a=new Dp({depthPacking:hh}),c=new Ip,l={},h=e.maxTextureSize,d={[Xn]:De,[De]:Xn,[Fe]:Fe},u=new Ae({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new wt},radius:{value:4}},vertexShader:Up,fragmentShader:Np}),f=u.clone();f.defines.HORIZONTAL_PASS=1;const g=new Jt;g.setAttribute("position",new de(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const v=new zt(g,u),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=kc;let p=this.type;this.render=function(b,C,R){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||b.length===0)return;const w=i.getRenderTarget(),M=i.getActiveCubeFace(),L=i.getActiveMipmapLevel(),I=i.state;I.setBlending(Wn),I.buffers.color.setClear(1,1,1,1),I.buffers.depth.setTest(!0),I.setScissorTest(!1);const U=p!==En&&this.type===En,D=p===En&&this.type!==En;for(let N=0,F=b.length;N<F;N++){const G=b[N],O=G.shadow;if(O===void 0){console.warn("THREE.WebGLShadowMap:",G,"has no shadow.");continue}if(O.autoUpdate===!1&&O.needsUpdate===!1)continue;s.copy(O.mapSize);const W=O.getFrameExtents();if(s.multiply(W),r.copy(O.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/W.x),s.x=r.x*W.x,O.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/W.y),s.y=r.y*W.y,O.mapSize.y=r.y)),O.map===null||U===!0||D===!0){const nt=this.type!==En?{minFilter:Oe,magFilter:Oe}:{};O.map!==null&&O.map.dispose(),O.map=new Ze(s.x,s.y,nt),O.map.texture.name=G.name+".shadowMap",O.camera.updateProjectionMatrix()}i.setRenderTarget(O.map),i.clear();const q=O.getViewportCount();for(let nt=0;nt<q;nt++){const ot=O.getViewport(nt);o.set(r.x*ot.x,r.y*ot.y,r.x*ot.z,r.y*ot.w),I.viewport(o),O.updateMatrices(G,nt),n=O.getFrustum(),x(C,R,O.camera,G,this.type)}O.isPointLightShadow!==!0&&this.type===En&&y(O,R),O.needsUpdate=!1}p=this.type,m.needsUpdate=!1,i.setRenderTarget(w,M,L)};function y(b,C){const R=t.update(v);u.defines.VSM_SAMPLES!==b.blurSamples&&(u.defines.VSM_SAMPLES=b.blurSamples,f.defines.VSM_SAMPLES=b.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),b.mapPass===null&&(b.mapPass=new Ze(s.x,s.y)),u.uniforms.shadow_pass.value=b.map.texture,u.uniforms.resolution.value=b.mapSize,u.uniforms.radius.value=b.radius,i.setRenderTarget(b.mapPass),i.clear(),i.renderBufferDirect(C,null,R,u,v,null),f.uniforms.shadow_pass.value=b.mapPass.texture,f.uniforms.resolution.value=b.mapSize,f.uniforms.radius.value=b.radius,i.setRenderTarget(b.map),i.clear(),i.renderBufferDirect(C,null,R,f,v,null)}function _(b,C,R,w){let M=null;const L=R.isPointLight===!0?b.customDistanceMaterial:b.customDepthMaterial;if(L!==void 0)M=L;else if(M=R.isPointLight===!0?c:a,i.localClippingEnabled&&C.clipShadows===!0&&Array.isArray(C.clippingPlanes)&&C.clippingPlanes.length!==0||C.displacementMap&&C.displacementScale!==0||C.alphaMap&&C.alphaTest>0||C.map&&C.alphaTest>0){const I=M.uuid,U=C.uuid;let D=l[I];D===void 0&&(D={},l[I]=D);let N=D[U];N===void 0&&(N=M.clone(),D[U]=N,C.addEventListener("dispose",E)),M=N}if(M.visible=C.visible,M.wireframe=C.wireframe,w===En?M.side=C.shadowSide!==null?C.shadowSide:C.side:M.side=C.shadowSide!==null?C.shadowSide:d[C.side],M.alphaMap=C.alphaMap,M.alphaTest=C.alphaTest,M.map=C.map,M.clipShadows=C.clipShadows,M.clippingPlanes=C.clippingPlanes,M.clipIntersection=C.clipIntersection,M.displacementMap=C.displacementMap,M.displacementScale=C.displacementScale,M.displacementBias=C.displacementBias,M.wireframeLinewidth=C.wireframeLinewidth,M.linewidth=C.linewidth,R.isPointLight===!0&&M.isMeshDistanceMaterial===!0){const I=i.properties.get(M);I.light=R}return M}function x(b,C,R,w,M){if(b.visible===!1)return;if(b.layers.test(C.layers)&&(b.isMesh||b.isLine||b.isPoints)&&(b.castShadow||b.receiveShadow&&M===En)&&(!b.frustumCulled||n.intersectsObject(b))){b.modelViewMatrix.multiplyMatrices(R.matrixWorldInverse,b.matrixWorld);const U=t.update(b),D=b.material;if(Array.isArray(D)){const N=U.groups;for(let F=0,G=N.length;F<G;F++){const O=N[F],W=D[O.materialIndex];if(W&&W.visible){const q=_(b,W,w,M);b.onBeforeShadow(i,b,C,R,U,q,O),i.renderBufferDirect(R,null,U,q,b,O),b.onAfterShadow(i,b,C,R,U,q,O)}}}else if(D.visible){const N=_(b,D,w,M);b.onBeforeShadow(i,b,C,R,U,N,null),i.renderBufferDirect(R,null,U,N,b,null),b.onAfterShadow(i,b,C,R,U,N,null)}}const I=b.children;for(let U=0,D=I.length;U<D;U++)x(I[U],C,R,w,M)}function E(b){b.target.removeEventListener("dispose",E);for(const R in l){const w=l[R],M=b.target.uuid;M in w&&(w[M].dispose(),delete w[M])}}}const Fp={[no]:io,[so]:ao,[ro]:co,[Ui]:oo,[io]:no,[ao]:so,[co]:ro,[oo]:Ui};function Op(i,t){function e(){let B=!1;const pt=new ge;let Z=null;const st=new ge(0,0,0,0);return{setMask:function(yt){Z!==yt&&!B&&(i.colorMask(yt,yt,yt,yt),Z=yt)},setLocked:function(yt){B=yt},setClear:function(yt,vt,Yt,_e,Re){Re===!0&&(yt*=_e,vt*=_e,Yt*=_e),pt.set(yt,vt,Yt,_e),st.equals(pt)===!1&&(i.clearColor(yt,vt,Yt,_e),st.copy(pt))},reset:function(){B=!1,Z=null,st.set(-1,0,0,0)}}}function n(){let B=!1,pt=!1,Z=null,st=null,yt=null;return{setReversed:function(vt){if(pt!==vt){const Yt=t.get("EXT_clip_control");pt?Yt.clipControlEXT(Yt.LOWER_LEFT_EXT,Yt.ZERO_TO_ONE_EXT):Yt.clipControlEXT(Yt.LOWER_LEFT_EXT,Yt.NEGATIVE_ONE_TO_ONE_EXT);const _e=yt;yt=null,this.setClear(_e)}pt=vt},getReversed:function(){return pt},setTest:function(vt){vt?it(i.DEPTH_TEST):at(i.DEPTH_TEST)},setMask:function(vt){Z!==vt&&!B&&(i.depthMask(vt),Z=vt)},setFunc:function(vt){if(pt&&(vt=Fp[vt]),st!==vt){switch(vt){case no:i.depthFunc(i.NEVER);break;case io:i.depthFunc(i.ALWAYS);break;case so:i.depthFunc(i.LESS);break;case Ui:i.depthFunc(i.LEQUAL);break;case ro:i.depthFunc(i.EQUAL);break;case oo:i.depthFunc(i.GEQUAL);break;case ao:i.depthFunc(i.GREATER);break;case co:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}st=vt}},setLocked:function(vt){B=vt},setClear:function(vt){yt!==vt&&(pt&&(vt=1-vt),i.clearDepth(vt),yt=vt)},reset:function(){B=!1,Z=null,st=null,yt=null,pt=!1}}}function s(){let B=!1,pt=null,Z=null,st=null,yt=null,vt=null,Yt=null,_e=null,Re=null;return{setTest:function(oe){B||(oe?it(i.STENCIL_TEST):at(i.STENCIL_TEST))},setMask:function(oe){pt!==oe&&!B&&(i.stencilMask(oe),pt=oe)},setFunc:function(oe,nn,vn){(Z!==oe||st!==nn||yt!==vn)&&(i.stencilFunc(oe,nn,vn),Z=oe,st=nn,yt=vn)},setOp:function(oe,nn,vn){(vt!==oe||Yt!==nn||_e!==vn)&&(i.stencilOp(oe,nn,vn),vt=oe,Yt=nn,_e=vn)},setLocked:function(oe){B=oe},setClear:function(oe){Re!==oe&&(i.clearStencil(oe),Re=oe)},reset:function(){B=!1,pt=null,Z=null,st=null,yt=null,vt=null,Yt=null,_e=null,Re=null}}}const r=new e,o=new n,a=new s,c=new WeakMap,l=new WeakMap;let h={},d={},u=new WeakMap,f=[],g=null,v=!1,m=null,p=null,y=null,_=null,x=null,E=null,b=null,C=new Et(0,0,0),R=0,w=!1,M=null,L=null,I=null,U=null,D=null;const N=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let F=!1,G=0;const O=i.getParameter(i.VERSION);O.indexOf("WebGL")!==-1?(G=parseFloat(/^WebGL (\d)/.exec(O)[1]),F=G>=1):O.indexOf("OpenGL ES")!==-1&&(G=parseFloat(/^OpenGL ES (\d)/.exec(O)[1]),F=G>=2);let W=null,q={};const nt=i.getParameter(i.SCISSOR_BOX),ot=i.getParameter(i.VIEWPORT),lt=new ge().fromArray(nt),V=new ge().fromArray(ot);function K(B,pt,Z,st){const yt=new Uint8Array(4),vt=i.createTexture();i.bindTexture(B,vt),i.texParameteri(B,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(B,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Yt=0;Yt<Z;Yt++)B===i.TEXTURE_3D||B===i.TEXTURE_2D_ARRAY?i.texImage3D(pt,0,i.RGBA,1,1,st,0,i.RGBA,i.UNSIGNED_BYTE,yt):i.texImage2D(pt+Yt,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,yt);return vt}const et={};et[i.TEXTURE_2D]=K(i.TEXTURE_2D,i.TEXTURE_2D,1),et[i.TEXTURE_CUBE_MAP]=K(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),et[i.TEXTURE_2D_ARRAY]=K(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),et[i.TEXTURE_3D]=K(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),it(i.DEPTH_TEST),o.setFunc(Ui),Ft(!1),Bt(ya),it(i.CULL_FACE),z(Wn);function it(B){h[B]!==!0&&(i.enable(B),h[B]=!0)}function at(B){h[B]!==!1&&(i.disable(B),h[B]=!1)}function ht(B,pt){return d[B]!==pt?(i.bindFramebuffer(B,pt),d[B]=pt,B===i.DRAW_FRAMEBUFFER&&(d[i.FRAMEBUFFER]=pt),B===i.FRAMEBUFFER&&(d[i.DRAW_FRAMEBUFFER]=pt),!0):!1}function ft(B,pt){let Z=f,st=!1;if(B){Z=u.get(pt),Z===void 0&&(Z=[],u.set(pt,Z));const yt=B.textures;if(Z.length!==yt.length||Z[0]!==i.COLOR_ATTACHMENT0){for(let vt=0,Yt=yt.length;vt<Yt;vt++)Z[vt]=i.COLOR_ATTACHMENT0+vt;Z.length=yt.length,st=!0}}else Z[0]!==i.BACK&&(Z[0]=i.BACK,st=!0);st&&i.drawBuffers(Z)}function Ot(B){return g!==B?(i.useProgram(B),g=B,!0):!1}const xt={[ii]:i.FUNC_ADD,[zl]:i.FUNC_SUBTRACT,[Fl]:i.FUNC_REVERSE_SUBTRACT};xt[Ol]=i.MIN,xt[Bl]=i.MAX;const Vt={[kl]:i.ZERO,[Hl]:i.ONE,[Vl]:i.SRC_COLOR,[to]:i.SRC_ALPHA,[$l]:i.SRC_ALPHA_SATURATE,[ql]:i.DST_COLOR,[Wl]:i.DST_ALPHA,[Gl]:i.ONE_MINUS_SRC_COLOR,[eo]:i.ONE_MINUS_SRC_ALPHA,[Yl]:i.ONE_MINUS_DST_COLOR,[Xl]:i.ONE_MINUS_DST_ALPHA,[Zl]:i.CONSTANT_COLOR,[Kl]:i.ONE_MINUS_CONSTANT_COLOR,[jl]:i.CONSTANT_ALPHA,[Jl]:i.ONE_MINUS_CONSTANT_ALPHA};function z(B,pt,Z,st,yt,vt,Yt,_e,Re,oe){if(B===Wn){v===!0&&(at(i.BLEND),v=!1);return}if(v===!1&&(it(i.BLEND),v=!0),B!==Nl){if(B!==m||oe!==w){if((p!==ii||x!==ii)&&(i.blendEquation(i.FUNC_ADD),p=ii,x=ii),oe)switch(B){case Pn:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case wa:i.blendFunc(i.ONE,i.ONE);break;case Sa:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case ba:i.blendFuncSeparate(i.ZERO,i.SRC_COLOR,i.ZERO,i.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",B);break}else switch(B){case Pn:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case wa:i.blendFunc(i.SRC_ALPHA,i.ONE);break;case Sa:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case ba:i.blendFunc(i.ZERO,i.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",B);break}y=null,_=null,E=null,b=null,C.set(0,0,0),R=0,m=B,w=oe}return}yt=yt||pt,vt=vt||Z,Yt=Yt||st,(pt!==p||yt!==x)&&(i.blendEquationSeparate(xt[pt],xt[yt]),p=pt,x=yt),(Z!==y||st!==_||vt!==E||Yt!==b)&&(i.blendFuncSeparate(Vt[Z],Vt[st],Vt[vt],Vt[Yt]),y=Z,_=st,E=vt,b=Yt),(_e.equals(C)===!1||Re!==R)&&(i.blendColor(_e.r,_e.g,_e.b,Re),C.copy(_e),R=Re),m=B,w=!1}function ae(B,pt){B.side===Fe?at(i.CULL_FACE):it(i.CULL_FACE);let Z=B.side===De;pt&&(Z=!Z),Ft(Z),B.blending===Pn&&B.transparent===!1?z(Wn):z(B.blending,B.blendEquation,B.blendSrc,B.blendDst,B.blendEquationAlpha,B.blendSrcAlpha,B.blendDstAlpha,B.blendColor,B.blendAlpha,B.premultipliedAlpha),o.setFunc(B.depthFunc),o.setTest(B.depthTest),o.setMask(B.depthWrite),r.setMask(B.colorWrite);const st=B.stencilWrite;a.setTest(st),st&&(a.setMask(B.stencilWriteMask),a.setFunc(B.stencilFunc,B.stencilRef,B.stencilFuncMask),a.setOp(B.stencilFail,B.stencilZFail,B.stencilZPass)),ie(B.polygonOffset,B.polygonOffsetFactor,B.polygonOffsetUnits),B.alphaToCoverage===!0?it(i.SAMPLE_ALPHA_TO_COVERAGE):at(i.SAMPLE_ALPHA_TO_COVERAGE)}function Ft(B){M!==B&&(B?i.frontFace(i.CW):i.frontFace(i.CCW),M=B)}function Bt(B){B!==Il?(it(i.CULL_FACE),B!==L&&(B===ya?i.cullFace(i.BACK):B===Ul?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):at(i.CULL_FACE),L=B}function Rt(B){B!==I&&(F&&i.lineWidth(B),I=B)}function ie(B,pt,Z){B?(it(i.POLYGON_OFFSET_FILL),(U!==pt||D!==Z)&&(i.polygonOffset(pt,Z),U=pt,D=Z)):at(i.POLYGON_OFFSET_FILL)}function It(B){B?it(i.SCISSOR_TEST):at(i.SCISSOR_TEST)}function P(B){B===void 0&&(B=i.TEXTURE0+N-1),W!==B&&(i.activeTexture(B),W=B)}function S(B,pt,Z){Z===void 0&&(W===null?Z=i.TEXTURE0+N-1:Z=W);let st=q[Z];st===void 0&&(st={type:void 0,texture:void 0},q[Z]=st),(st.type!==B||st.texture!==pt)&&(W!==Z&&(i.activeTexture(Z),W=Z),i.bindTexture(B,pt||et[B]),st.type=B,st.texture=pt)}function X(){const B=q[W];B!==void 0&&B.type!==void 0&&(i.bindTexture(B.type,null),B.type=void 0,B.texture=void 0)}function tt(){try{i.compressedTexImage2D.apply(i,arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function rt(){try{i.compressedTexImage3D.apply(i,arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function j(){try{i.texSubImage2D.apply(i,arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function bt(){try{i.texSubImage3D.apply(i,arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function ut(){try{i.compressedTexSubImage2D.apply(i,arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function Mt(){try{i.compressedTexSubImage3D.apply(i,arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function qt(){try{i.texStorage2D.apply(i,arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function ct(){try{i.texStorage3D.apply(i,arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function Tt(){try{i.texImage2D.apply(i,arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function Ht(){try{i.texImage3D.apply(i,arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function Q(B){lt.equals(B)===!1&&(i.scissor(B.x,B.y,B.z,B.w),lt.copy(B))}function J(B){V.equals(B)===!1&&(i.viewport(B.x,B.y,B.z,B.w),V.copy(B))}function Ut(B,pt){let Z=l.get(pt);Z===void 0&&(Z=new WeakMap,l.set(pt,Z));let st=Z.get(B);st===void 0&&(st=i.getUniformBlockIndex(pt,B.name),Z.set(B,st))}function St(B,pt){const st=l.get(pt).get(B);c.get(pt)!==st&&(i.uniformBlockBinding(pt,st,B.__bindingPointIndex),c.set(pt,st))}function kt(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),h={},W=null,q={},d={},u=new WeakMap,f=[],g=null,v=!1,m=null,p=null,y=null,_=null,x=null,E=null,b=null,C=new Et(0,0,0),R=0,w=!1,M=null,L=null,I=null,U=null,D=null,lt.set(0,0,i.canvas.width,i.canvas.height),V.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:it,disable:at,bindFramebuffer:ht,drawBuffers:ft,useProgram:Ot,setBlending:z,setMaterial:ae,setFlipSided:Ft,setCullFace:Bt,setLineWidth:Rt,setPolygonOffset:ie,setScissorTest:It,activeTexture:P,bindTexture:S,unbindTexture:X,compressedTexImage2D:tt,compressedTexImage3D:rt,texImage2D:Tt,texImage3D:Ht,updateUBOMapping:Ut,uniformBlockBinding:St,texStorage2D:qt,texStorage3D:ct,texSubImage2D:j,texSubImage3D:bt,compressedTexSubImage2D:ut,compressedTexSubImage3D:Mt,scissor:Q,viewport:J,reset:kt}}function _c(i,t,e,n){const s=Bp(n);switch(e){case Yc:return i*t;case Zc:return i*t;case Kc:return i*t*2;case us:return i*t/s.components*s.byteLength;case Yo:return i*t/s.components*s.byteLength;case jc:return i*t*2/s.components*s.byteLength;case $o:return i*t*2/s.components*s.byteLength;case $c:return i*t*3/s.components*s.byteLength;case $e:return i*t*4/s.components*s.byteLength;case Zo:return i*t*4/s.components*s.byteLength;case Ks:case js:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Js:case Qs:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case po:case go:return Math.max(i,16)*Math.max(t,8)/4;case fo:case mo:return Math.max(i,8)*Math.max(t,8)/2;case vo:case _o:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case xo:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Mo:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case yo:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case wo:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case So:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case bo:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case Eo:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case To:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case Ao:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case Co:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case Ro:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case Po:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case Lo:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case Do:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case Io:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case tr:case Uo:case No:return Math.ceil(i/4)*Math.ceil(t/4)*16;case Jc:case zo:return Math.ceil(i/4)*Math.ceil(t/4)*8;case Fo:case Oo:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function Bp(i){switch(i){case en:case Wc:return{byteLength:1,components:1};case hs:case Xc:case hn:return{byteLength:2,components:1};case Xo:case qo:return{byteLength:2,components:4};case qn:case Wo:case ln:return{byteLength:4,components:1};case qc:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}function kp(i,t,e,n,s,r,o){const a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new wt,h=new WeakMap;let d;const u=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(P,S){return f?new OffscreenCanvas(P,S):sr("canvas")}function v(P,S,X){let tt=1;const rt=It(P);if((rt.width>X||rt.height>X)&&(tt=X/Math.max(rt.width,rt.height)),tt<1)if(typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&P instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&P instanceof ImageBitmap||typeof VideoFrame<"u"&&P instanceof VideoFrame){const j=Math.floor(tt*rt.width),bt=Math.floor(tt*rt.height);d===void 0&&(d=g(j,bt));const ut=S?g(j,bt):d;return ut.width=j,ut.height=bt,ut.getContext("2d").drawImage(P,0,0,j,bt),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+rt.width+"x"+rt.height+") to ("+j+"x"+bt+")."),ut}else return"data"in P&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+rt.width+"x"+rt.height+")."),P;return P}function m(P){return P.generateMipmaps}function p(P){i.generateMipmap(P)}function y(P){return P.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:P.isWebGL3DRenderTarget?i.TEXTURE_3D:P.isWebGLArrayRenderTarget||P.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function _(P,S,X,tt,rt=!1){if(P!==null){if(i[P]!==void 0)return i[P];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+P+"'")}let j=S;if(S===i.RED&&(X===i.FLOAT&&(j=i.R32F),X===i.HALF_FLOAT&&(j=i.R16F),X===i.UNSIGNED_BYTE&&(j=i.R8)),S===i.RED_INTEGER&&(X===i.UNSIGNED_BYTE&&(j=i.R8UI),X===i.UNSIGNED_SHORT&&(j=i.R16UI),X===i.UNSIGNED_INT&&(j=i.R32UI),X===i.BYTE&&(j=i.R8I),X===i.SHORT&&(j=i.R16I),X===i.INT&&(j=i.R32I)),S===i.RG&&(X===i.FLOAT&&(j=i.RG32F),X===i.HALF_FLOAT&&(j=i.RG16F),X===i.UNSIGNED_BYTE&&(j=i.RG8)),S===i.RG_INTEGER&&(X===i.UNSIGNED_BYTE&&(j=i.RG8UI),X===i.UNSIGNED_SHORT&&(j=i.RG16UI),X===i.UNSIGNED_INT&&(j=i.RG32UI),X===i.BYTE&&(j=i.RG8I),X===i.SHORT&&(j=i.RG16I),X===i.INT&&(j=i.RG32I)),S===i.RGB_INTEGER&&(X===i.UNSIGNED_BYTE&&(j=i.RGB8UI),X===i.UNSIGNED_SHORT&&(j=i.RGB16UI),X===i.UNSIGNED_INT&&(j=i.RGB32UI),X===i.BYTE&&(j=i.RGB8I),X===i.SHORT&&(j=i.RGB16I),X===i.INT&&(j=i.RGB32I)),S===i.RGBA_INTEGER&&(X===i.UNSIGNED_BYTE&&(j=i.RGBA8UI),X===i.UNSIGNED_SHORT&&(j=i.RGBA16UI),X===i.UNSIGNED_INT&&(j=i.RGBA32UI),X===i.BYTE&&(j=i.RGBA8I),X===i.SHORT&&(j=i.RGBA16I),X===i.INT&&(j=i.RGBA32I)),S===i.RGB&&X===i.UNSIGNED_INT_5_9_9_9_REV&&(j=i.RGB9_E5),S===i.RGBA){const bt=rt?ar:te.getTransfer(tt);X===i.FLOAT&&(j=i.RGBA32F),X===i.HALF_FLOAT&&(j=i.RGBA16F),X===i.UNSIGNED_BYTE&&(j=bt===ce?i.SRGB8_ALPHA8:i.RGBA8),X===i.UNSIGNED_SHORT_4_4_4_4&&(j=i.RGBA4),X===i.UNSIGNED_SHORT_5_5_5_1&&(j=i.RGB5_A1)}return(j===i.R16F||j===i.R32F||j===i.RG16F||j===i.RG32F||j===i.RGBA16F||j===i.RGBA32F)&&t.get("EXT_color_buffer_float"),j}function x(P,S){let X;return P?S===null||S===qn||S===Oi?X=i.DEPTH24_STENCIL8:S===ln?X=i.DEPTH32F_STENCIL8:S===hs&&(X=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):S===null||S===qn||S===Oi?X=i.DEPTH_COMPONENT24:S===ln?X=i.DEPTH_COMPONENT32F:S===hs&&(X=i.DEPTH_COMPONENT16),X}function E(P,S){return m(P)===!0||P.isFramebufferTexture&&P.minFilter!==Oe&&P.minFilter!==ue?Math.log2(Math.max(S.width,S.height))+1:P.mipmaps!==void 0&&P.mipmaps.length>0?P.mipmaps.length:P.isCompressedTexture&&Array.isArray(P.image)?S.mipmaps.length:1}function b(P){const S=P.target;S.removeEventListener("dispose",b),R(S),S.isVideoTexture&&h.delete(S)}function C(P){const S=P.target;S.removeEventListener("dispose",C),M(S)}function R(P){const S=n.get(P);if(S.__webglInit===void 0)return;const X=P.source,tt=u.get(X);if(tt){const rt=tt[S.__cacheKey];rt.usedTimes--,rt.usedTimes===0&&w(P),Object.keys(tt).length===0&&u.delete(X)}n.remove(P)}function w(P){const S=n.get(P);i.deleteTexture(S.__webglTexture);const X=P.source,tt=u.get(X);delete tt[S.__cacheKey],o.memory.textures--}function M(P){const S=n.get(P);if(P.depthTexture&&(P.depthTexture.dispose(),n.remove(P.depthTexture)),P.isWebGLCubeRenderTarget)for(let tt=0;tt<6;tt++){if(Array.isArray(S.__webglFramebuffer[tt]))for(let rt=0;rt<S.__webglFramebuffer[tt].length;rt++)i.deleteFramebuffer(S.__webglFramebuffer[tt][rt]);else i.deleteFramebuffer(S.__webglFramebuffer[tt]);S.__webglDepthbuffer&&i.deleteRenderbuffer(S.__webglDepthbuffer[tt])}else{if(Array.isArray(S.__webglFramebuffer))for(let tt=0;tt<S.__webglFramebuffer.length;tt++)i.deleteFramebuffer(S.__webglFramebuffer[tt]);else i.deleteFramebuffer(S.__webglFramebuffer);if(S.__webglDepthbuffer&&i.deleteRenderbuffer(S.__webglDepthbuffer),S.__webglMultisampledFramebuffer&&i.deleteFramebuffer(S.__webglMultisampledFramebuffer),S.__webglColorRenderbuffer)for(let tt=0;tt<S.__webglColorRenderbuffer.length;tt++)S.__webglColorRenderbuffer[tt]&&i.deleteRenderbuffer(S.__webglColorRenderbuffer[tt]);S.__webglDepthRenderbuffer&&i.deleteRenderbuffer(S.__webglDepthRenderbuffer)}const X=P.textures;for(let tt=0,rt=X.length;tt<rt;tt++){const j=n.get(X[tt]);j.__webglTexture&&(i.deleteTexture(j.__webglTexture),o.memory.textures--),n.remove(X[tt])}n.remove(P)}let L=0;function I(){L=0}function U(){const P=L;return P>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+P+" texture units while this GPU supports only "+s.maxTextures),L+=1,P}function D(P){const S=[];return S.push(P.wrapS),S.push(P.wrapT),S.push(P.wrapR||0),S.push(P.magFilter),S.push(P.minFilter),S.push(P.anisotropy),S.push(P.internalFormat),S.push(P.format),S.push(P.type),S.push(P.generateMipmaps),S.push(P.premultiplyAlpha),S.push(P.flipY),S.push(P.unpackAlignment),S.push(P.colorSpace),S.join()}function N(P,S){const X=n.get(P);if(P.isVideoTexture&&Rt(P),P.isRenderTargetTexture===!1&&P.version>0&&X.__version!==P.version){const tt=P.image;if(tt===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(tt.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{V(X,P,S);return}}e.bindTexture(i.TEXTURE_2D,X.__webglTexture,i.TEXTURE0+S)}function F(P,S){const X=n.get(P);if(P.version>0&&X.__version!==P.version){V(X,P,S);return}e.bindTexture(i.TEXTURE_2D_ARRAY,X.__webglTexture,i.TEXTURE0+S)}function G(P,S){const X=n.get(P);if(P.version>0&&X.__version!==P.version){V(X,P,S);return}e.bindTexture(i.TEXTURE_3D,X.__webglTexture,i.TEXTURE0+S)}function O(P,S){const X=n.get(P);if(P.version>0&&X.__version!==P.version){K(X,P,S);return}e.bindTexture(i.TEXTURE_CUBE_MAP,X.__webglTexture,i.TEXTURE0+S)}const W={[Fi]:i.REPEAT,[mn]:i.CLAMP_TO_EDGE,[uo]:i.MIRRORED_REPEAT},q={[Oe]:i.NEAREST,[ch]:i.NEAREST_MIPMAP_NEAREST,[vs]:i.NEAREST_MIPMAP_LINEAR,[ue]:i.LINEAR,[fr]:i.LINEAR_MIPMAP_NEAREST,[ri]:i.LINEAR_MIPMAP_LINEAR},nt={[dh]:i.NEVER,[_h]:i.ALWAYS,[fh]:i.LESS,[tl]:i.LEQUAL,[ph]:i.EQUAL,[vh]:i.GEQUAL,[mh]:i.GREATER,[gh]:i.NOTEQUAL};function ot(P,S){if(S.type===ln&&t.has("OES_texture_float_linear")===!1&&(S.magFilter===ue||S.magFilter===fr||S.magFilter===vs||S.magFilter===ri||S.minFilter===ue||S.minFilter===fr||S.minFilter===vs||S.minFilter===ri)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(P,i.TEXTURE_WRAP_S,W[S.wrapS]),i.texParameteri(P,i.TEXTURE_WRAP_T,W[S.wrapT]),(P===i.TEXTURE_3D||P===i.TEXTURE_2D_ARRAY)&&i.texParameteri(P,i.TEXTURE_WRAP_R,W[S.wrapR]),i.texParameteri(P,i.TEXTURE_MAG_FILTER,q[S.magFilter]),i.texParameteri(P,i.TEXTURE_MIN_FILTER,q[S.minFilter]),S.compareFunction&&(i.texParameteri(P,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(P,i.TEXTURE_COMPARE_FUNC,nt[S.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(S.magFilter===Oe||S.minFilter!==vs&&S.minFilter!==ri||S.type===ln&&t.has("OES_texture_float_linear")===!1)return;if(S.anisotropy>1||n.get(S).__currentAnisotropy){const X=t.get("EXT_texture_filter_anisotropic");i.texParameterf(P,X.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(S.anisotropy,s.getMaxAnisotropy())),n.get(S).__currentAnisotropy=S.anisotropy}}}function lt(P,S){let X=!1;P.__webglInit===void 0&&(P.__webglInit=!0,S.addEventListener("dispose",b));const tt=S.source;let rt=u.get(tt);rt===void 0&&(rt={},u.set(tt,rt));const j=D(S);if(j!==P.__cacheKey){rt[j]===void 0&&(rt[j]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,X=!0),rt[j].usedTimes++;const bt=rt[P.__cacheKey];bt!==void 0&&(rt[P.__cacheKey].usedTimes--,bt.usedTimes===0&&w(S)),P.__cacheKey=j,P.__webglTexture=rt[j].texture}return X}function V(P,S,X){let tt=i.TEXTURE_2D;(S.isDataArrayTexture||S.isCompressedArrayTexture)&&(tt=i.TEXTURE_2D_ARRAY),S.isData3DTexture&&(tt=i.TEXTURE_3D);const rt=lt(P,S),j=S.source;e.bindTexture(tt,P.__webglTexture,i.TEXTURE0+X);const bt=n.get(j);if(j.version!==bt.__version||rt===!0){e.activeTexture(i.TEXTURE0+X);const ut=te.getPrimaries(te.workingColorSpace),Mt=S.colorSpace===An?null:te.getPrimaries(S.colorSpace),qt=S.colorSpace===An||ut===Mt?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,S.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,S.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,qt);let ct=v(S.image,!1,s.maxTextureSize);ct=ie(S,ct);const Tt=r.convert(S.format,S.colorSpace),Ht=r.convert(S.type);let Q=_(S.internalFormat,Tt,Ht,S.colorSpace,S.isVideoTexture);ot(tt,S);let J;const Ut=S.mipmaps,St=S.isVideoTexture!==!0,kt=bt.__version===void 0||rt===!0,B=j.dataReady,pt=E(S,ct);if(S.isDepthTexture)Q=x(S.format===Bi,S.type),kt&&(St?e.texStorage2D(i.TEXTURE_2D,1,Q,ct.width,ct.height):e.texImage2D(i.TEXTURE_2D,0,Q,ct.width,ct.height,0,Tt,Ht,null));else if(S.isDataTexture)if(Ut.length>0){St&&kt&&e.texStorage2D(i.TEXTURE_2D,pt,Q,Ut[0].width,Ut[0].height);for(let Z=0,st=Ut.length;Z<st;Z++)J=Ut[Z],St?B&&e.texSubImage2D(i.TEXTURE_2D,Z,0,0,J.width,J.height,Tt,Ht,J.data):e.texImage2D(i.TEXTURE_2D,Z,Q,J.width,J.height,0,Tt,Ht,J.data);S.generateMipmaps=!1}else St?(kt&&e.texStorage2D(i.TEXTURE_2D,pt,Q,ct.width,ct.height),B&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,ct.width,ct.height,Tt,Ht,ct.data)):e.texImage2D(i.TEXTURE_2D,0,Q,ct.width,ct.height,0,Tt,Ht,ct.data);else if(S.isCompressedTexture)if(S.isCompressedArrayTexture){St&&kt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,pt,Q,Ut[0].width,Ut[0].height,ct.depth);for(let Z=0,st=Ut.length;Z<st;Z++)if(J=Ut[Z],S.format!==$e)if(Tt!==null)if(St){if(B)if(S.layerUpdates.size>0){const yt=_c(J.width,J.height,S.format,S.type);for(const vt of S.layerUpdates){const Yt=J.data.subarray(vt*yt/J.data.BYTES_PER_ELEMENT,(vt+1)*yt/J.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,Z,0,0,vt,J.width,J.height,1,Tt,Yt)}S.clearLayerUpdates()}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,Z,0,0,0,J.width,J.height,ct.depth,Tt,J.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,Z,Q,J.width,J.height,ct.depth,0,J.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else St?B&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,Z,0,0,0,J.width,J.height,ct.depth,Tt,Ht,J.data):e.texImage3D(i.TEXTURE_2D_ARRAY,Z,Q,J.width,J.height,ct.depth,0,Tt,Ht,J.data)}else{St&&kt&&e.texStorage2D(i.TEXTURE_2D,pt,Q,Ut[0].width,Ut[0].height);for(let Z=0,st=Ut.length;Z<st;Z++)J=Ut[Z],S.format!==$e?Tt!==null?St?B&&e.compressedTexSubImage2D(i.TEXTURE_2D,Z,0,0,J.width,J.height,Tt,J.data):e.compressedTexImage2D(i.TEXTURE_2D,Z,Q,J.width,J.height,0,J.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):St?B&&e.texSubImage2D(i.TEXTURE_2D,Z,0,0,J.width,J.height,Tt,Ht,J.data):e.texImage2D(i.TEXTURE_2D,Z,Q,J.width,J.height,0,Tt,Ht,J.data)}else if(S.isDataArrayTexture)if(St){if(kt&&e.texStorage3D(i.TEXTURE_2D_ARRAY,pt,Q,ct.width,ct.height,ct.depth),B)if(S.layerUpdates.size>0){const Z=_c(ct.width,ct.height,S.format,S.type);for(const st of S.layerUpdates){const yt=ct.data.subarray(st*Z/ct.data.BYTES_PER_ELEMENT,(st+1)*Z/ct.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,st,ct.width,ct.height,1,Tt,Ht,yt)}S.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ct.width,ct.height,ct.depth,Tt,Ht,ct.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,Q,ct.width,ct.height,ct.depth,0,Tt,Ht,ct.data);else if(S.isData3DTexture)St?(kt&&e.texStorage3D(i.TEXTURE_3D,pt,Q,ct.width,ct.height,ct.depth),B&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ct.width,ct.height,ct.depth,Tt,Ht,ct.data)):e.texImage3D(i.TEXTURE_3D,0,Q,ct.width,ct.height,ct.depth,0,Tt,Ht,ct.data);else if(S.isFramebufferTexture){if(kt)if(St)e.texStorage2D(i.TEXTURE_2D,pt,Q,ct.width,ct.height);else{let Z=ct.width,st=ct.height;for(let yt=0;yt<pt;yt++)e.texImage2D(i.TEXTURE_2D,yt,Q,Z,st,0,Tt,Ht,null),Z>>=1,st>>=1}}else if(Ut.length>0){if(St&&kt){const Z=It(Ut[0]);e.texStorage2D(i.TEXTURE_2D,pt,Q,Z.width,Z.height)}for(let Z=0,st=Ut.length;Z<st;Z++)J=Ut[Z],St?B&&e.texSubImage2D(i.TEXTURE_2D,Z,0,0,Tt,Ht,J):e.texImage2D(i.TEXTURE_2D,Z,Q,Tt,Ht,J);S.generateMipmaps=!1}else if(St){if(kt){const Z=It(ct);e.texStorage2D(i.TEXTURE_2D,pt,Q,Z.width,Z.height)}B&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,Tt,Ht,ct)}else e.texImage2D(i.TEXTURE_2D,0,Q,Tt,Ht,ct);m(S)&&p(tt),bt.__version=j.version,S.onUpdate&&S.onUpdate(S)}P.__version=S.version}function K(P,S,X){if(S.image.length!==6)return;const tt=lt(P,S),rt=S.source;e.bindTexture(i.TEXTURE_CUBE_MAP,P.__webglTexture,i.TEXTURE0+X);const j=n.get(rt);if(rt.version!==j.__version||tt===!0){e.activeTexture(i.TEXTURE0+X);const bt=te.getPrimaries(te.workingColorSpace),ut=S.colorSpace===An?null:te.getPrimaries(S.colorSpace),Mt=S.colorSpace===An||bt===ut?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,S.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,S.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Mt);const qt=S.isCompressedTexture||S.image[0].isCompressedTexture,ct=S.image[0]&&S.image[0].isDataTexture,Tt=[];for(let st=0;st<6;st++)!qt&&!ct?Tt[st]=v(S.image[st],!0,s.maxCubemapSize):Tt[st]=ct?S.image[st].image:S.image[st],Tt[st]=ie(S,Tt[st]);const Ht=Tt[0],Q=r.convert(S.format,S.colorSpace),J=r.convert(S.type),Ut=_(S.internalFormat,Q,J,S.colorSpace),St=S.isVideoTexture!==!0,kt=j.__version===void 0||tt===!0,B=rt.dataReady;let pt=E(S,Ht);ot(i.TEXTURE_CUBE_MAP,S);let Z;if(qt){St&&kt&&e.texStorage2D(i.TEXTURE_CUBE_MAP,pt,Ut,Ht.width,Ht.height);for(let st=0;st<6;st++){Z=Tt[st].mipmaps;for(let yt=0;yt<Z.length;yt++){const vt=Z[yt];S.format!==$e?Q!==null?St?B&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,yt,0,0,vt.width,vt.height,Q,vt.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,yt,Ut,vt.width,vt.height,0,vt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):St?B&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,yt,0,0,vt.width,vt.height,Q,J,vt.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,yt,Ut,vt.width,vt.height,0,Q,J,vt.data)}}}else{if(Z=S.mipmaps,St&&kt){Z.length>0&&pt++;const st=It(Tt[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,pt,Ut,st.width,st.height)}for(let st=0;st<6;st++)if(ct){St?B&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,0,0,0,Tt[st].width,Tt[st].height,Q,J,Tt[st].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,0,Ut,Tt[st].width,Tt[st].height,0,Q,J,Tt[st].data);for(let yt=0;yt<Z.length;yt++){const Yt=Z[yt].image[st].image;St?B&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,yt+1,0,0,Yt.width,Yt.height,Q,J,Yt.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,yt+1,Ut,Yt.width,Yt.height,0,Q,J,Yt.data)}}else{St?B&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,0,0,0,Q,J,Tt[st]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,0,Ut,Q,J,Tt[st]);for(let yt=0;yt<Z.length;yt++){const vt=Z[yt];St?B&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,yt+1,0,0,Q,J,vt.image[st]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+st,yt+1,Ut,Q,J,vt.image[st])}}}m(S)&&p(i.TEXTURE_CUBE_MAP),j.__version=rt.version,S.onUpdate&&S.onUpdate(S)}P.__version=S.version}function et(P,S,X,tt,rt,j){const bt=r.convert(X.format,X.colorSpace),ut=r.convert(X.type),Mt=_(X.internalFormat,bt,ut,X.colorSpace),qt=n.get(S),ct=n.get(X);if(ct.__renderTarget=S,!qt.__hasExternalTextures){const Tt=Math.max(1,S.width>>j),Ht=Math.max(1,S.height>>j);rt===i.TEXTURE_3D||rt===i.TEXTURE_2D_ARRAY?e.texImage3D(rt,j,Mt,Tt,Ht,S.depth,0,bt,ut,null):e.texImage2D(rt,j,Mt,Tt,Ht,0,bt,ut,null)}e.bindFramebuffer(i.FRAMEBUFFER,P),Bt(S)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,tt,rt,ct.__webglTexture,0,Ft(S)):(rt===i.TEXTURE_2D||rt>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&rt<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,tt,rt,ct.__webglTexture,j),e.bindFramebuffer(i.FRAMEBUFFER,null)}function it(P,S,X){if(i.bindRenderbuffer(i.RENDERBUFFER,P),S.depthBuffer){const tt=S.depthTexture,rt=tt&&tt.isDepthTexture?tt.type:null,j=x(S.stencilBuffer,rt),bt=S.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ut=Ft(S);Bt(S)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,ut,j,S.width,S.height):X?i.renderbufferStorageMultisample(i.RENDERBUFFER,ut,j,S.width,S.height):i.renderbufferStorage(i.RENDERBUFFER,j,S.width,S.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,bt,i.RENDERBUFFER,P)}else{const tt=S.textures;for(let rt=0;rt<tt.length;rt++){const j=tt[rt],bt=r.convert(j.format,j.colorSpace),ut=r.convert(j.type),Mt=_(j.internalFormat,bt,ut,j.colorSpace),qt=Ft(S);X&&Bt(S)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,qt,Mt,S.width,S.height):Bt(S)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,qt,Mt,S.width,S.height):i.renderbufferStorage(i.RENDERBUFFER,Mt,S.width,S.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function at(P,S){if(S&&S.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(i.FRAMEBUFFER,P),!(S.depthTexture&&S.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const tt=n.get(S.depthTexture);tt.__renderTarget=S,(!tt.__webglTexture||S.depthTexture.image.width!==S.width||S.depthTexture.image.height!==S.height)&&(S.depthTexture.image.width=S.width,S.depthTexture.image.height=S.height,S.depthTexture.needsUpdate=!0),N(S.depthTexture,0);const rt=tt.__webglTexture,j=Ft(S);if(S.depthTexture.format===Di)Bt(S)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,rt,0,j):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,rt,0);else if(S.depthTexture.format===Bi)Bt(S)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,rt,0,j):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,rt,0);else throw new Error("Unknown depthTexture format")}function ht(P){const S=n.get(P),X=P.isWebGLCubeRenderTarget===!0;if(S.__boundDepthTexture!==P.depthTexture){const tt=P.depthTexture;if(S.__depthDisposeCallback&&S.__depthDisposeCallback(),tt){const rt=()=>{delete S.__boundDepthTexture,delete S.__depthDisposeCallback,tt.removeEventListener("dispose",rt)};tt.addEventListener("dispose",rt),S.__depthDisposeCallback=rt}S.__boundDepthTexture=tt}if(P.depthTexture&&!S.__autoAllocateDepthBuffer){if(X)throw new Error("target.depthTexture not supported in Cube render targets");at(S.__webglFramebuffer,P)}else if(X){S.__webglDepthbuffer=[];for(let tt=0;tt<6;tt++)if(e.bindFramebuffer(i.FRAMEBUFFER,S.__webglFramebuffer[tt]),S.__webglDepthbuffer[tt]===void 0)S.__webglDepthbuffer[tt]=i.createRenderbuffer(),it(S.__webglDepthbuffer[tt],P,!1);else{const rt=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,j=S.__webglDepthbuffer[tt];i.bindRenderbuffer(i.RENDERBUFFER,j),i.framebufferRenderbuffer(i.FRAMEBUFFER,rt,i.RENDERBUFFER,j)}}else if(e.bindFramebuffer(i.FRAMEBUFFER,S.__webglFramebuffer),S.__webglDepthbuffer===void 0)S.__webglDepthbuffer=i.createRenderbuffer(),it(S.__webglDepthbuffer,P,!1);else{const tt=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,rt=S.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,rt),i.framebufferRenderbuffer(i.FRAMEBUFFER,tt,i.RENDERBUFFER,rt)}e.bindFramebuffer(i.FRAMEBUFFER,null)}function ft(P,S,X){const tt=n.get(P);S!==void 0&&et(tt.__webglFramebuffer,P,P.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),X!==void 0&&ht(P)}function Ot(P){const S=P.texture,X=n.get(P),tt=n.get(S);P.addEventListener("dispose",C);const rt=P.textures,j=P.isWebGLCubeRenderTarget===!0,bt=rt.length>1;if(bt||(tt.__webglTexture===void 0&&(tt.__webglTexture=i.createTexture()),tt.__version=S.version,o.memory.textures++),j){X.__webglFramebuffer=[];for(let ut=0;ut<6;ut++)if(S.mipmaps&&S.mipmaps.length>0){X.__webglFramebuffer[ut]=[];for(let Mt=0;Mt<S.mipmaps.length;Mt++)X.__webglFramebuffer[ut][Mt]=i.createFramebuffer()}else X.__webglFramebuffer[ut]=i.createFramebuffer()}else{if(S.mipmaps&&S.mipmaps.length>0){X.__webglFramebuffer=[];for(let ut=0;ut<S.mipmaps.length;ut++)X.__webglFramebuffer[ut]=i.createFramebuffer()}else X.__webglFramebuffer=i.createFramebuffer();if(bt)for(let ut=0,Mt=rt.length;ut<Mt;ut++){const qt=n.get(rt[ut]);qt.__webglTexture===void 0&&(qt.__webglTexture=i.createTexture(),o.memory.textures++)}if(P.samples>0&&Bt(P)===!1){X.__webglMultisampledFramebuffer=i.createFramebuffer(),X.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,X.__webglMultisampledFramebuffer);for(let ut=0;ut<rt.length;ut++){const Mt=rt[ut];X.__webglColorRenderbuffer[ut]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,X.__webglColorRenderbuffer[ut]);const qt=r.convert(Mt.format,Mt.colorSpace),ct=r.convert(Mt.type),Tt=_(Mt.internalFormat,qt,ct,Mt.colorSpace,P.isXRRenderTarget===!0),Ht=Ft(P);i.renderbufferStorageMultisample(i.RENDERBUFFER,Ht,Tt,P.width,P.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ut,i.RENDERBUFFER,X.__webglColorRenderbuffer[ut])}i.bindRenderbuffer(i.RENDERBUFFER,null),P.depthBuffer&&(X.__webglDepthRenderbuffer=i.createRenderbuffer(),it(X.__webglDepthRenderbuffer,P,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(j){e.bindTexture(i.TEXTURE_CUBE_MAP,tt.__webglTexture),ot(i.TEXTURE_CUBE_MAP,S);for(let ut=0;ut<6;ut++)if(S.mipmaps&&S.mipmaps.length>0)for(let Mt=0;Mt<S.mipmaps.length;Mt++)et(X.__webglFramebuffer[ut][Mt],P,S,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ut,Mt);else et(X.__webglFramebuffer[ut],P,S,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ut,0);m(S)&&p(i.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(bt){for(let ut=0,Mt=rt.length;ut<Mt;ut++){const qt=rt[ut],ct=n.get(qt);e.bindTexture(i.TEXTURE_2D,ct.__webglTexture),ot(i.TEXTURE_2D,qt),et(X.__webglFramebuffer,P,qt,i.COLOR_ATTACHMENT0+ut,i.TEXTURE_2D,0),m(qt)&&p(i.TEXTURE_2D)}e.unbindTexture()}else{let ut=i.TEXTURE_2D;if((P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(ut=P.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(ut,tt.__webglTexture),ot(ut,S),S.mipmaps&&S.mipmaps.length>0)for(let Mt=0;Mt<S.mipmaps.length;Mt++)et(X.__webglFramebuffer[Mt],P,S,i.COLOR_ATTACHMENT0,ut,Mt);else et(X.__webglFramebuffer,P,S,i.COLOR_ATTACHMENT0,ut,0);m(S)&&p(ut),e.unbindTexture()}P.depthBuffer&&ht(P)}function xt(P){const S=P.textures;for(let X=0,tt=S.length;X<tt;X++){const rt=S[X];if(m(rt)){const j=y(P),bt=n.get(rt).__webglTexture;e.bindTexture(j,bt),p(j),e.unbindTexture()}}}const Vt=[],z=[];function ae(P){if(P.samples>0){if(Bt(P)===!1){const S=P.textures,X=P.width,tt=P.height;let rt=i.COLOR_BUFFER_BIT;const j=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,bt=n.get(P),ut=S.length>1;if(ut)for(let Mt=0;Mt<S.length;Mt++)e.bindFramebuffer(i.FRAMEBUFFER,bt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Mt,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,bt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Mt,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,bt.__webglMultisampledFramebuffer),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,bt.__webglFramebuffer);for(let Mt=0;Mt<S.length;Mt++){if(P.resolveDepthBuffer&&(P.depthBuffer&&(rt|=i.DEPTH_BUFFER_BIT),P.stencilBuffer&&P.resolveStencilBuffer&&(rt|=i.STENCIL_BUFFER_BIT)),ut){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,bt.__webglColorRenderbuffer[Mt]);const qt=n.get(S[Mt]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,qt,0)}i.blitFramebuffer(0,0,X,tt,0,0,X,tt,rt,i.NEAREST),c===!0&&(Vt.length=0,z.length=0,Vt.push(i.COLOR_ATTACHMENT0+Mt),P.depthBuffer&&P.resolveDepthBuffer===!1&&(Vt.push(j),z.push(j),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,z)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Vt))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),ut)for(let Mt=0;Mt<S.length;Mt++){e.bindFramebuffer(i.FRAMEBUFFER,bt.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Mt,i.RENDERBUFFER,bt.__webglColorRenderbuffer[Mt]);const qt=n.get(S[Mt]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,bt.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Mt,i.TEXTURE_2D,qt,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,bt.__webglMultisampledFramebuffer)}else if(P.depthBuffer&&P.resolveDepthBuffer===!1&&c){const S=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[S])}}}function Ft(P){return Math.min(s.maxSamples,P.samples)}function Bt(P){const S=n.get(P);return P.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&S.__useRenderToTexture!==!1}function Rt(P){const S=o.render.frame;h.get(P)!==S&&(h.set(P,S),P.update())}function ie(P,S){const X=P.colorSpace,tt=P.format,rt=P.type;return P.isCompressedTexture===!0||P.isVideoTexture===!0||X!==oi&&X!==An&&(te.getTransfer(X)===ce?(tt!==$e||rt!==en)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",X)),S}function It(P){return typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement?(l.width=P.naturalWidth||P.width,l.height=P.naturalHeight||P.height):typeof VideoFrame<"u"&&P instanceof VideoFrame?(l.width=P.displayWidth,l.height=P.displayHeight):(l.width=P.width,l.height=P.height),l}this.allocateTextureUnit=U,this.resetTextureUnits=I,this.setTexture2D=N,this.setTexture2DArray=F,this.setTexture3D=G,this.setTextureCube=O,this.rebindTextures=ft,this.setupRenderTarget=Ot,this.updateRenderTargetMipmap=xt,this.updateMultisampleRenderTarget=ae,this.setupDepthRenderbuffer=ht,this.setupFrameBufferTexture=et,this.useMultisampledRTT=Bt}function Hp(i,t){function e(n,s=An){let r;const o=te.getTransfer(s);if(n===en)return i.UNSIGNED_BYTE;if(n===Xo)return i.UNSIGNED_SHORT_4_4_4_4;if(n===qo)return i.UNSIGNED_SHORT_5_5_5_1;if(n===qc)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Wc)return i.BYTE;if(n===Xc)return i.SHORT;if(n===hs)return i.UNSIGNED_SHORT;if(n===Wo)return i.INT;if(n===qn)return i.UNSIGNED_INT;if(n===ln)return i.FLOAT;if(n===hn)return i.HALF_FLOAT;if(n===Yc)return i.ALPHA;if(n===$c)return i.RGB;if(n===$e)return i.RGBA;if(n===Zc)return i.LUMINANCE;if(n===Kc)return i.LUMINANCE_ALPHA;if(n===Di)return i.DEPTH_COMPONENT;if(n===Bi)return i.DEPTH_STENCIL;if(n===us)return i.RED;if(n===Yo)return i.RED_INTEGER;if(n===jc)return i.RG;if(n===$o)return i.RG_INTEGER;if(n===Zo)return i.RGBA_INTEGER;if(n===Ks||n===js||n===Js||n===Qs)if(o===ce)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Ks)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===js)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Js)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Qs)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Ks)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===js)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Js)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Qs)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===fo||n===po||n===mo||n===go)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===fo)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===po)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===mo)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===go)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===vo||n===_o||n===xo)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===vo||n===_o)return o===ce?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===xo)return o===ce?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===Mo||n===yo||n===wo||n===So||n===bo||n===Eo||n===To||n===Ao||n===Co||n===Ro||n===Po||n===Lo||n===Do||n===Io)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Mo)return o===ce?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===yo)return o===ce?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===wo)return o===ce?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===So)return o===ce?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===bo)return o===ce?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Eo)return o===ce?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===To)return o===ce?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Ao)return o===ce?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Co)return o===ce?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Ro)return o===ce?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Po)return o===ce?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Lo)return o===ce?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Do)return o===ce?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Io)return o===ce?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===tr||n===Uo||n===No)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===tr)return o===ce?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Uo)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===No)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Jc||n===zo||n===Fo||n===Oo)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===tr)return r.COMPRESSED_RED_RGTC1_EXT;if(n===zo)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Fo)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Oo)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Oi?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}class Vp extends Ye{constructor(t=[]){super(),this.isArrayCamera=!0,this.cameras=t}}class Me extends Ce{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Gp={type:"move"};class kr{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Me,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Me,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new A,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new A),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Me,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new A,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new A),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,o=null;const a=this._targetRay,c=this._grip,l=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(l&&t.hand){o=!0;for(const v of t.hand.values()){const m=e.getJointPose(v,n),p=this._getHandJoint(l,v);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const h=l.joints["index-finger-tip"],d=l.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,g=.005;l.inputState.pinching&&u>f+g?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!l.inputState.pinching&&u<=f-g&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else c!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1));a!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Gp)))}return a!==null&&(a.visible=s!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const n=new Me;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}}const Wp=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Xp=`
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

}`;class qp{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e,n){if(this.texture===null){const s=new Ie,r=t.properties.get(s);r.__webglTexture=e.texture,(e.depthNear!=n.depthNear||e.depthFar!=n.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=s}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,n=new Ae({vertexShader:Wp,fragmentShader:Xp,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new zt(new Yn(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Yp extends Gi{constructor(t,e){super();const n=this;let s=null,r=1,o=null,a="local-floor",c=1,l=null,h=null,d=null,u=null,f=null,g=null;const v=new qp,m=e.getContextAttributes();let p=null,y=null;const _=[],x=[],E=new wt;let b=null;const C=new Ye;C.viewport=new ge;const R=new Ye;R.viewport=new ge;const w=[C,R],M=new Vp;let L=null,I=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(V){let K=_[V];return K===void 0&&(K=new kr,_[V]=K),K.getTargetRaySpace()},this.getControllerGrip=function(V){let K=_[V];return K===void 0&&(K=new kr,_[V]=K),K.getGripSpace()},this.getHand=function(V){let K=_[V];return K===void 0&&(K=new kr,_[V]=K),K.getHandSpace()};function U(V){const K=x.indexOf(V.inputSource);if(K===-1)return;const et=_[K];et!==void 0&&(et.update(V.inputSource,V.frame,l||o),et.dispatchEvent({type:V.type,data:V.inputSource}))}function D(){s.removeEventListener("select",U),s.removeEventListener("selectstart",U),s.removeEventListener("selectend",U),s.removeEventListener("squeeze",U),s.removeEventListener("squeezestart",U),s.removeEventListener("squeezeend",U),s.removeEventListener("end",D),s.removeEventListener("inputsourceschange",N);for(let V=0;V<_.length;V++){const K=x[V];K!==null&&(x[V]=null,_[V].disconnect(K))}L=null,I=null,v.reset(),t.setRenderTarget(p),f=null,u=null,d=null,s=null,y=null,lt.stop(),n.isPresenting=!1,t.setPixelRatio(b),t.setSize(E.width,E.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(V){r=V,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(V){a=V,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function(V){l=V},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return d},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(V){if(s=V,s!==null){if(p=t.getRenderTarget(),s.addEventListener("select",U),s.addEventListener("selectstart",U),s.addEventListener("selectend",U),s.addEventListener("squeeze",U),s.addEventListener("squeezestart",U),s.addEventListener("squeezeend",U),s.addEventListener("end",D),s.addEventListener("inputsourceschange",N),m.xrCompatible!==!0&&await e.makeXRCompatible(),b=t.getPixelRatio(),t.getSize(E),s.renderState.layers===void 0){const K={antialias:m.antialias,alpha:!0,depth:m.depth,stencil:m.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,e,K),s.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),y=new Ze(f.framebufferWidth,f.framebufferHeight,{format:$e,type:en,colorSpace:t.outputColorSpace,stencilBuffer:m.stencil})}else{let K=null,et=null,it=null;m.depth&&(it=m.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,K=m.stencil?Bi:Di,et=m.stencil?Oi:qn);const at={colorFormat:e.RGBA8,depthFormat:it,scaleFactor:r};d=new XRWebGLBinding(s,e),u=d.createProjectionLayer(at),s.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),y=new Ze(u.textureWidth,u.textureHeight,{format:$e,type:en,depthTexture:new ta(u.textureWidth,u.textureHeight,et,void 0,void 0,void 0,void 0,void 0,void 0,K),stencilBuffer:m.stencil,colorSpace:t.outputColorSpace,samples:m.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(c),l=null,o=await s.requestReferenceSpace(a),lt.setContext(s),lt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return v.getDepthTexture()};function N(V){for(let K=0;K<V.removed.length;K++){const et=V.removed[K],it=x.indexOf(et);it>=0&&(x[it]=null,_[it].disconnect(et))}for(let K=0;K<V.added.length;K++){const et=V.added[K];let it=x.indexOf(et);if(it===-1){for(let ht=0;ht<_.length;ht++)if(ht>=x.length){x.push(et),it=ht;break}else if(x[ht]===null){x[ht]=et,it=ht;break}if(it===-1)break}const at=_[it];at&&at.connect(et)}}const F=new A,G=new A;function O(V,K,et){F.setFromMatrixPosition(K.matrixWorld),G.setFromMatrixPosition(et.matrixWorld);const it=F.distanceTo(G),at=K.projectionMatrix.elements,ht=et.projectionMatrix.elements,ft=at[14]/(at[10]-1),Ot=at[14]/(at[10]+1),xt=(at[9]+1)/at[5],Vt=(at[9]-1)/at[5],z=(at[8]-1)/at[0],ae=(ht[8]+1)/ht[0],Ft=ft*z,Bt=ft*ae,Rt=it/(-z+ae),ie=Rt*-z;if(K.matrixWorld.decompose(V.position,V.quaternion,V.scale),V.translateX(ie),V.translateZ(Rt),V.matrixWorld.compose(V.position,V.quaternion,V.scale),V.matrixWorldInverse.copy(V.matrixWorld).invert(),at[10]===-1)V.projectionMatrix.copy(K.projectionMatrix),V.projectionMatrixInverse.copy(K.projectionMatrixInverse);else{const It=ft+Rt,P=Ot+Rt,S=Ft-ie,X=Bt+(it-ie),tt=xt*Ot/P*It,rt=Vt*Ot/P*It;V.projectionMatrix.makePerspective(S,X,tt,rt,It,P),V.projectionMatrixInverse.copy(V.projectionMatrix).invert()}}function W(V,K){K===null?V.matrixWorld.copy(V.matrix):V.matrixWorld.multiplyMatrices(K.matrixWorld,V.matrix),V.matrixWorldInverse.copy(V.matrixWorld).invert()}this.updateCamera=function(V){if(s===null)return;let K=V.near,et=V.far;v.texture!==null&&(v.depthNear>0&&(K=v.depthNear),v.depthFar>0&&(et=v.depthFar)),M.near=R.near=C.near=K,M.far=R.far=C.far=et,(L!==M.near||I!==M.far)&&(s.updateRenderState({depthNear:M.near,depthFar:M.far}),L=M.near,I=M.far),C.layers.mask=V.layers.mask|2,R.layers.mask=V.layers.mask|4,M.layers.mask=C.layers.mask|R.layers.mask;const it=V.parent,at=M.cameras;W(M,it);for(let ht=0;ht<at.length;ht++)W(at[ht],it);at.length===2?O(M,C,R):M.projectionMatrix.copy(C.projectionMatrix),q(V,M,it)};function q(V,K,et){et===null?V.matrix.copy(K.matrixWorld):(V.matrix.copy(et.matrixWorld),V.matrix.invert(),V.matrix.multiply(K.matrixWorld)),V.matrix.decompose(V.position,V.quaternion,V.scale),V.updateMatrixWorld(!0),V.projectionMatrix.copy(K.projectionMatrix),V.projectionMatrixInverse.copy(K.projectionMatrixInverse),V.isPerspectiveCamera&&(V.fov=ds*2*Math.atan(1/V.projectionMatrix.elements[5]),V.zoom=1)}this.getCamera=function(){return M},this.getFoveation=function(){if(!(u===null&&f===null))return c},this.setFoveation=function(V){c=V,u!==null&&(u.fixedFoveation=V),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=V)},this.hasDepthSensing=function(){return v.texture!==null},this.getDepthSensingMesh=function(){return v.getMesh(M)};let nt=null;function ot(V,K){if(h=K.getViewerPose(l||o),g=K,h!==null){const et=h.views;f!==null&&(t.setRenderTargetFramebuffer(y,f.framebuffer),t.setRenderTarget(y));let it=!1;et.length!==M.cameras.length&&(M.cameras.length=0,it=!0);for(let ht=0;ht<et.length;ht++){const ft=et[ht];let Ot=null;if(f!==null)Ot=f.getViewport(ft);else{const Vt=d.getViewSubImage(u,ft);Ot=Vt.viewport,ht===0&&(t.setRenderTargetTextures(y,Vt.colorTexture,u.ignoreDepthValues?void 0:Vt.depthStencilTexture),t.setRenderTarget(y))}let xt=w[ht];xt===void 0&&(xt=new Ye,xt.layers.enable(ht),xt.viewport=new ge,w[ht]=xt),xt.matrix.fromArray(ft.transform.matrix),xt.matrix.decompose(xt.position,xt.quaternion,xt.scale),xt.projectionMatrix.fromArray(ft.projectionMatrix),xt.projectionMatrixInverse.copy(xt.projectionMatrix).invert(),xt.viewport.set(Ot.x,Ot.y,Ot.width,Ot.height),ht===0&&(M.matrix.copy(xt.matrix),M.matrix.decompose(M.position,M.quaternion,M.scale)),it===!0&&M.cameras.push(xt)}const at=s.enabledFeatures;if(at&&at.includes("depth-sensing")){const ht=d.getDepthInformation(et[0]);ht&&ht.isValid&&ht.texture&&v.init(t,ht,s.renderState)}}for(let et=0;et<_.length;et++){const it=x[et],at=_[et];it!==null&&at!==void 0&&at.update(it,K,l||o)}nt&&nt(V,K),K.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:K}),g=null}const lt=new pl;lt.setAnimationLoop(ot),this.setAnimationLoop=function(V){nt=V},this.dispose=function(){}}}const ti=new ve,$p=new Xt;function Zp(i,t){function e(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,ul(i)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function s(m,p,y,_,x){p.isMeshBasicMaterial||p.isMeshLambertMaterial?r(m,p):p.isMeshToonMaterial?(r(m,p),d(m,p)):p.isMeshPhongMaterial?(r(m,p),h(m,p)):p.isMeshStandardMaterial?(r(m,p),u(m,p),p.isMeshPhysicalMaterial&&f(m,p,x)):p.isMeshMatcapMaterial?(r(m,p),g(m,p)):p.isMeshDepthMaterial?r(m,p):p.isMeshDistanceMaterial?(r(m,p),v(m,p)):p.isMeshNormalMaterial?r(m,p):p.isLineBasicMaterial?(o(m,p),p.isLineDashedMaterial&&a(m,p)):p.isPointsMaterial?c(m,p,y,_):p.isSpriteMaterial?l(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,e(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===De&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,e(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===De&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,e(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,e(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,e(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const y=t.get(p),_=y.envMap,x=y.envMapRotation;_&&(m.envMap.value=_,ti.copy(x),ti.x*=-1,ti.y*=-1,ti.z*=-1,_.isCubeTexture&&_.isRenderTargetTexture===!1&&(ti.y*=-1,ti.z*=-1),m.envMapRotation.value.setFromMatrix4($p.makeRotationFromEuler(ti)),m.flipEnvMap.value=_.isCubeTexture&&_.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,e(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,e(p.aoMap,m.aoMapTransform))}function o(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform))}function a(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function c(m,p,y,_){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*y,m.scale.value=_*.5,p.map&&(m.map.value=p.map,e(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function l(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function d(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function u(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,e(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,e(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function f(m,p,y){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,e(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,e(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,e(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,e(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,e(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===De&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,e(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,e(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=y.texture,m.transmissionSamplerSize.value.set(y.width,y.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,e(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,e(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,e(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,e(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,e(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function v(m,p){const y=t.get(p).light;m.referencePosition.value.setFromMatrixPosition(y.matrixWorld),m.nearDistance.value=y.shadow.camera.near,m.farDistance.value=y.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function Kp(i,t,e,n){let s={},r={},o=[];const a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function c(y,_){const x=_.program;n.uniformBlockBinding(y,x)}function l(y,_){let x=s[y.id];x===void 0&&(g(y),x=h(y),s[y.id]=x,y.addEventListener("dispose",m));const E=_.program;n.updateUBOMapping(y,E);const b=t.render.frame;r[y.id]!==b&&(u(y),r[y.id]=b)}function h(y){const _=d();y.__bindingPointIndex=_;const x=i.createBuffer(),E=y.__size,b=y.usage;return i.bindBuffer(i.UNIFORM_BUFFER,x),i.bufferData(i.UNIFORM_BUFFER,E,b),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,_,x),x}function d(){for(let y=0;y<a;y++)if(o.indexOf(y)===-1)return o.push(y),y;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(y){const _=s[y.id],x=y.uniforms,E=y.__cache;i.bindBuffer(i.UNIFORM_BUFFER,_);for(let b=0,C=x.length;b<C;b++){const R=Array.isArray(x[b])?x[b]:[x[b]];for(let w=0,M=R.length;w<M;w++){const L=R[w];if(f(L,b,w,E)===!0){const I=L.__offset,U=Array.isArray(L.value)?L.value:[L.value];let D=0;for(let N=0;N<U.length;N++){const F=U[N],G=v(F);typeof F=="number"||typeof F=="boolean"?(L.__data[0]=F,i.bufferSubData(i.UNIFORM_BUFFER,I+D,L.__data)):F.isMatrix3?(L.__data[0]=F.elements[0],L.__data[1]=F.elements[1],L.__data[2]=F.elements[2],L.__data[3]=0,L.__data[4]=F.elements[3],L.__data[5]=F.elements[4],L.__data[6]=F.elements[5],L.__data[7]=0,L.__data[8]=F.elements[6],L.__data[9]=F.elements[7],L.__data[10]=F.elements[8],L.__data[11]=0):(F.toArray(L.__data,D),D+=G.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,I,L.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(y,_,x,E){const b=y.value,C=_+"_"+x;if(E[C]===void 0)return typeof b=="number"||typeof b=="boolean"?E[C]=b:E[C]=b.clone(),!0;{const R=E[C];if(typeof b=="number"||typeof b=="boolean"){if(R!==b)return E[C]=b,!0}else if(R.equals(b)===!1)return R.copy(b),!0}return!1}function g(y){const _=y.uniforms;let x=0;const E=16;for(let C=0,R=_.length;C<R;C++){const w=Array.isArray(_[C])?_[C]:[_[C]];for(let M=0,L=w.length;M<L;M++){const I=w[M],U=Array.isArray(I.value)?I.value:[I.value];for(let D=0,N=U.length;D<N;D++){const F=U[D],G=v(F),O=x%E,W=O%G.boundary,q=O+W;x+=W,q!==0&&E-q<G.storage&&(x+=E-q),I.__data=new Float32Array(G.storage/Float32Array.BYTES_PER_ELEMENT),I.__offset=x,x+=G.storage}}}const b=x%E;return b>0&&(x+=E-b),y.__size=x,y.__cache={},this}function v(y){const _={boundary:0,storage:0};return typeof y=="number"||typeof y=="boolean"?(_.boundary=4,_.storage=4):y.isVector2?(_.boundary=8,_.storage=8):y.isVector3||y.isColor?(_.boundary=16,_.storage=12):y.isVector4?(_.boundary=16,_.storage=16):y.isMatrix3?(_.boundary=48,_.storage=48):y.isMatrix4?(_.boundary=64,_.storage=64):y.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",y),_}function m(y){const _=y.target;_.removeEventListener("dispose",m);const x=o.indexOf(_.__bindingPointIndex);o.splice(x,1),i.deleteBuffer(s[_.id]),delete s[_.id],delete r[_.id]}function p(){for(const y in s)i.deleteBuffer(s[y]);o=[],s={},r={}}return{bind:c,update:l,dispose:p}}class jp{constructor(t={}){const{canvas:e=Nh(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reverseDepthBuffer:u=!1}=t;this.isWebGLRenderer=!0;let f;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=n.getContextAttributes().alpha}else f=o;const g=new Uint32Array(4),v=new Int32Array(4);let m=null,p=null;const y=[],_=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=ze,this.toneMapping=Ln,this.toneMappingExposure=1;const x=this;let E=!1,b=0,C=0,R=null,w=-1,M=null;const L=new ge,I=new ge;let U=null;const D=new Et(0);let N=0,F=e.width,G=e.height,O=1,W=null,q=null;const nt=new ge(0,0,F,G),ot=new ge(0,0,F,G);let lt=!1;const V=new Jo;let K=!1,et=!1;const it=new Xt,at=new Xt,ht=new A,ft=new ge,Ot={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let xt=!1;function Vt(){return R===null?O:1}let z=n;function ae(T,k){return e.getContext(T,k)}try{const T={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${Go}`),e.addEventListener("webglcontextlost",st,!1),e.addEventListener("webglcontextrestored",yt,!1),e.addEventListener("webglcontextcreationerror",vt,!1),z===null){const k="webgl2";if(z=ae(k,T),z===null)throw ae(k)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(T){throw console.error("THREE.WebGLRenderer: "+T.message),T}let Ft,Bt,Rt,ie,It,P,S,X,tt,rt,j,bt,ut,Mt,qt,ct,Tt,Ht,Q,J,Ut,St,kt,B;function pt(){Ft=new n0(z),Ft.init(),St=new Hp(z,Ft),Bt=new Kf(z,Ft,t,St),Rt=new Op(z,Ft),Bt.reverseDepthBuffer&&u&&Rt.buffers.depth.setReversed(!0),ie=new r0(z),It=new Sp,P=new kp(z,Ft,Rt,It,Bt,St,ie),S=new Jf(x),X=new e0(x),tt=new uu(z),kt=new $f(z,tt),rt=new i0(z,tt,ie,kt),j=new a0(z,rt,tt,ie),Q=new o0(z,Bt,P),ct=new jf(It),bt=new wp(x,S,X,Ft,Bt,kt,ct),ut=new Zp(x,It),Mt=new Ep,qt=new Lp(Ft),Ht=new Yf(x,S,X,Rt,j,f,c),Tt=new zp(x,j,Bt),B=new Kp(z,ie,Bt,Rt),J=new Zf(z,Ft,ie),Ut=new s0(z,Ft,ie),ie.programs=bt.programs,x.capabilities=Bt,x.extensions=Ft,x.properties=It,x.renderLists=Mt,x.shadowMap=Tt,x.state=Rt,x.info=ie}pt();const Z=new Yp(x,z);this.xr=Z,this.getContext=function(){return z},this.getContextAttributes=function(){return z.getContextAttributes()},this.forceContextLoss=function(){const T=Ft.get("WEBGL_lose_context");T&&T.loseContext()},this.forceContextRestore=function(){const T=Ft.get("WEBGL_lose_context");T&&T.restoreContext()},this.getPixelRatio=function(){return O},this.setPixelRatio=function(T){T!==void 0&&(O=T,this.setSize(F,G,!1))},this.getSize=function(T){return T.set(F,G)},this.setSize=function(T,k,Y=!0){if(Z.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}F=T,G=k,e.width=Math.floor(T*O),e.height=Math.floor(k*O),Y===!0&&(e.style.width=T+"px",e.style.height=k+"px"),this.setViewport(0,0,T,k)},this.getDrawingBufferSize=function(T){return T.set(F*O,G*O).floor()},this.setDrawingBufferSize=function(T,k,Y){F=T,G=k,O=Y,e.width=Math.floor(T*Y),e.height=Math.floor(k*Y),this.setViewport(0,0,T,k)},this.getCurrentViewport=function(T){return T.copy(L)},this.getViewport=function(T){return T.copy(nt)},this.setViewport=function(T,k,Y,$){T.isVector4?nt.set(T.x,T.y,T.z,T.w):nt.set(T,k,Y,$),Rt.viewport(L.copy(nt).multiplyScalar(O).round())},this.getScissor=function(T){return T.copy(ot)},this.setScissor=function(T,k,Y,$){T.isVector4?ot.set(T.x,T.y,T.z,T.w):ot.set(T,k,Y,$),Rt.scissor(I.copy(ot).multiplyScalar(O).round())},this.getScissorTest=function(){return lt},this.setScissorTest=function(T){Rt.setScissorTest(lt=T)},this.setOpaqueSort=function(T){W=T},this.setTransparentSort=function(T){q=T},this.getClearColor=function(T){return T.copy(Ht.getClearColor())},this.setClearColor=function(){Ht.setClearColor.apply(Ht,arguments)},this.getClearAlpha=function(){return Ht.getClearAlpha()},this.setClearAlpha=function(){Ht.setClearAlpha.apply(Ht,arguments)},this.clear=function(T=!0,k=!0,Y=!0){let $=0;if(T){let H=!1;if(R!==null){const dt=R.texture.format;H=dt===Zo||dt===$o||dt===Yo}if(H){const dt=R.texture.type,_t=dt===en||dt===qn||dt===hs||dt===Oi||dt===Xo||dt===qo,Pt=Ht.getClearColor(),Lt=Ht.getClearAlpha(),Gt=Pt.r,$t=Pt.g,Dt=Pt.b;_t?(g[0]=Gt,g[1]=$t,g[2]=Dt,g[3]=Lt,z.clearBufferuiv(z.COLOR,0,g)):(v[0]=Gt,v[1]=$t,v[2]=Dt,v[3]=Lt,z.clearBufferiv(z.COLOR,0,v))}else $|=z.COLOR_BUFFER_BIT}k&&($|=z.DEPTH_BUFFER_BIT),Y&&($|=z.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),z.clear($)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",st,!1),e.removeEventListener("webglcontextrestored",yt,!1),e.removeEventListener("webglcontextcreationerror",vt,!1),Mt.dispose(),qt.dispose(),It.dispose(),S.dispose(),X.dispose(),j.dispose(),kt.dispose(),B.dispose(),bt.dispose(),Z.dispose(),Z.removeEventListener("sessionstart",fa),Z.removeEventListener("sessionend",pa),$n.stop()};function st(T){T.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),E=!0}function yt(){console.log("THREE.WebGLRenderer: Context Restored."),E=!1;const T=ie.autoReset,k=Tt.enabled,Y=Tt.autoUpdate,$=Tt.needsUpdate,H=Tt.type;pt(),ie.autoReset=T,Tt.enabled=k,Tt.autoUpdate=Y,Tt.needsUpdate=$,Tt.type=H}function vt(T){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",T.statusMessage)}function Yt(T){const k=T.target;k.removeEventListener("dispose",Yt),_e(k)}function _e(T){Re(T),It.remove(T)}function Re(T){const k=It.get(T).programs;k!==void 0&&(k.forEach(function(Y){bt.releaseProgram(Y)}),T.isShaderMaterial&&bt.releaseShaderCache(T))}this.renderBufferDirect=function(T,k,Y,$,H,dt){k===null&&(k=Ot);const _t=H.isMesh&&H.matrixWorld.determinant()<0,Pt=Rl(T,k,Y,$,H);Rt.setMaterial($,_t);let Lt=Y.index,Gt=1;if($.wireframe===!0){if(Lt=rt.getWireframeAttribute(Y),Lt===void 0)return;Gt=2}const $t=Y.drawRange,Dt=Y.attributes.position;let ne=$t.start*Gt,he=($t.start+$t.count)*Gt;dt!==null&&(ne=Math.max(ne,dt.start*Gt),he=Math.min(he,(dt.start+dt.count)*Gt)),Lt!==null?(ne=Math.max(ne,0),he=Math.min(he,Lt.count)):Dt!=null&&(ne=Math.max(ne,0),he=Math.min(he,Dt.count));const fe=he-ne;if(fe<0||fe===1/0)return;kt.setup(H,$,Pt,Y,Lt);let Be,se=J;if(Lt!==null&&(Be=tt.get(Lt),se=Ut,se.setIndex(Be)),H.isMesh)$.wireframe===!0?(Rt.setLineWidth($.wireframeLinewidth*Vt()),se.setMode(z.LINES)):se.setMode(z.TRIANGLES);else if(H.isLine){let Nt=$.linewidth;Nt===void 0&&(Nt=1),Rt.setLineWidth(Nt*Vt()),H.isLineSegments?se.setMode(z.LINES):H.isLineLoop?se.setMode(z.LINE_LOOP):se.setMode(z.LINE_STRIP)}else H.isPoints?se.setMode(z.POINTS):H.isSprite&&se.setMode(z.TRIANGLES);if(H.isBatchedMesh)if(H._multiDrawInstances!==null)se.renderMultiDrawInstances(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount,H._multiDrawInstances);else if(Ft.get("WEBGL_multi_draw"))se.renderMultiDraw(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount);else{const Nt=H._multiDrawStarts,_n=H._multiDrawCounts,re=H._multiDrawCount,sn=Lt?tt.get(Lt).bytesPerElement:1,ci=It.get($).currentProgram.getUniforms();for(let He=0;He<re;He++)ci.setValue(z,"_gl_DrawID",He),se.render(Nt[He]/sn,_n[He])}else if(H.isInstancedMesh)se.renderInstances(ne,fe,H.count);else if(Y.isInstancedBufferGeometry){const Nt=Y._maxInstanceCount!==void 0?Y._maxInstanceCount:1/0,_n=Math.min(Y.instanceCount,Nt);se.renderInstances(ne,fe,_n)}else se.render(ne,fe)};function oe(T,k,Y){T.transparent===!0&&T.side===Fe&&T.forceSinglePass===!1?(T.side=De,T.needsUpdate=!0,gs(T,k,Y),T.side=Xn,T.needsUpdate=!0,gs(T,k,Y),T.side=Fe):gs(T,k,Y)}this.compile=function(T,k,Y=null){Y===null&&(Y=T),p=qt.get(Y),p.init(k),_.push(p),Y.traverseVisible(function(H){H.isLight&&H.layers.test(k.layers)&&(p.pushLight(H),H.castShadow&&p.pushShadow(H))}),T!==Y&&T.traverseVisible(function(H){H.isLight&&H.layers.test(k.layers)&&(p.pushLight(H),H.castShadow&&p.pushShadow(H))}),p.setupLights();const $=new Set;return T.traverse(function(H){if(!(H.isMesh||H.isPoints||H.isLine||H.isSprite))return;const dt=H.material;if(dt)if(Array.isArray(dt))for(let _t=0;_t<dt.length;_t++){const Pt=dt[_t];oe(Pt,Y,H),$.add(Pt)}else oe(dt,Y,H),$.add(dt)}),_.pop(),p=null,$},this.compileAsync=function(T,k,Y=null){const $=this.compile(T,k,Y);return new Promise(H=>{function dt(){if($.forEach(function(_t){It.get(_t).currentProgram.isReady()&&$.delete(_t)}),$.size===0){H(T);return}setTimeout(dt,10)}Ft.get("KHR_parallel_shader_compile")!==null?dt():setTimeout(dt,10)})};let nn=null;function vn(T){nn&&nn(T)}function fa(){$n.stop()}function pa(){$n.start()}const $n=new pl;$n.setAnimationLoop(vn),typeof self<"u"&&$n.setContext(self),this.setAnimationLoop=function(T){nn=T,Z.setAnimationLoop(T),T===null?$n.stop():$n.start()},Z.addEventListener("sessionstart",fa),Z.addEventListener("sessionend",pa),this.render=function(T,k){if(k!==void 0&&k.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(E===!0)return;if(T.matrixWorldAutoUpdate===!0&&T.updateMatrixWorld(),k.parent===null&&k.matrixWorldAutoUpdate===!0&&k.updateMatrixWorld(),Z.enabled===!0&&Z.isPresenting===!0&&(Z.cameraAutoUpdate===!0&&Z.updateCamera(k),k=Z.getCamera()),T.isScene===!0&&T.onBeforeRender(x,T,k,R),p=qt.get(T,_.length),p.init(k),_.push(p),at.multiplyMatrices(k.projectionMatrix,k.matrixWorldInverse),V.setFromProjectionMatrix(at),et=this.localClippingEnabled,K=ct.init(this.clippingPlanes,et),m=Mt.get(T,y.length),m.init(),y.push(m),Z.enabled===!0&&Z.isPresenting===!0){const dt=x.xr.getDepthSensingMesh();dt!==null&&dr(dt,k,-1/0,x.sortObjects)}dr(T,k,0,x.sortObjects),m.finish(),x.sortObjects===!0&&m.sort(W,q),xt=Z.enabled===!1||Z.isPresenting===!1||Z.hasDepthSensing()===!1,xt&&Ht.addToRenderList(m,T),this.info.render.frame++,K===!0&&ct.beginShadows();const Y=p.state.shadowsArray;Tt.render(Y,T,k),K===!0&&ct.endShadows(),this.info.autoReset===!0&&this.info.reset();const $=m.opaque,H=m.transmissive;if(p.setupLights(),k.isArrayCamera){const dt=k.cameras;if(H.length>0)for(let _t=0,Pt=dt.length;_t<Pt;_t++){const Lt=dt[_t];ga($,H,T,Lt)}xt&&Ht.render(T);for(let _t=0,Pt=dt.length;_t<Pt;_t++){const Lt=dt[_t];ma(m,T,Lt,Lt.viewport)}}else H.length>0&&ga($,H,T,k),xt&&Ht.render(T),ma(m,T,k);R!==null&&(P.updateMultisampleRenderTarget(R),P.updateRenderTargetMipmap(R)),T.isScene===!0&&T.onAfterRender(x,T,k),kt.resetDefaultState(),w=-1,M=null,_.pop(),_.length>0?(p=_[_.length-1],K===!0&&ct.setGlobalState(x.clippingPlanes,p.state.camera)):p=null,y.pop(),y.length>0?m=y[y.length-1]:m=null};function dr(T,k,Y,$){if(T.visible===!1)return;if(T.layers.test(k.layers)){if(T.isGroup)Y=T.renderOrder;else if(T.isLOD)T.autoUpdate===!0&&T.update(k);else if(T.isLight)p.pushLight(T),T.castShadow&&p.pushShadow(T);else if(T.isSprite){if(!T.frustumCulled||V.intersectsSprite(T)){$&&ft.setFromMatrixPosition(T.matrixWorld).applyMatrix4(at);const _t=j.update(T),Pt=T.material;Pt.visible&&m.push(T,_t,Pt,Y,ft.z,null)}}else if((T.isMesh||T.isLine||T.isPoints)&&(!T.frustumCulled||V.intersectsObject(T))){const _t=j.update(T),Pt=T.material;if($&&(T.boundingSphere!==void 0?(T.boundingSphere===null&&T.computeBoundingSphere(),ft.copy(T.boundingSphere.center)):(_t.boundingSphere===null&&_t.computeBoundingSphere(),ft.copy(_t.boundingSphere.center)),ft.applyMatrix4(T.matrixWorld).applyMatrix4(at)),Array.isArray(Pt)){const Lt=_t.groups;for(let Gt=0,$t=Lt.length;Gt<$t;Gt++){const Dt=Lt[Gt],ne=Pt[Dt.materialIndex];ne&&ne.visible&&m.push(T,_t,ne,Y,ft.z,Dt)}}else Pt.visible&&m.push(T,_t,Pt,Y,ft.z,null)}}const dt=T.children;for(let _t=0,Pt=dt.length;_t<Pt;_t++)dr(dt[_t],k,Y,$)}function ma(T,k,Y,$){const H=T.opaque,dt=T.transmissive,_t=T.transparent;p.setupLightsView(Y),K===!0&&ct.setGlobalState(x.clippingPlanes,Y),$&&Rt.viewport(L.copy($)),H.length>0&&ms(H,k,Y),dt.length>0&&ms(dt,k,Y),_t.length>0&&ms(_t,k,Y),Rt.buffers.depth.setTest(!0),Rt.buffers.depth.setMask(!0),Rt.buffers.color.setMask(!0),Rt.setPolygonOffset(!1)}function ga(T,k,Y,$){if((Y.isScene===!0?Y.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[$.id]===void 0&&(p.state.transmissionRenderTarget[$.id]=new Ze(1,1,{generateMipmaps:!0,type:Ft.has("EXT_color_buffer_half_float")||Ft.has("EXT_color_buffer_float")?hn:en,minFilter:ri,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:te.workingColorSpace}));const dt=p.state.transmissionRenderTarget[$.id],_t=$.viewport||L;dt.setSize(_t.z,_t.w);const Pt=x.getRenderTarget();x.setRenderTarget(dt),x.getClearColor(D),N=x.getClearAlpha(),N<1&&x.setClearColor(16777215,.5),x.clear(),xt&&Ht.render(Y);const Lt=x.toneMapping;x.toneMapping=Ln;const Gt=$.viewport;if($.viewport!==void 0&&($.viewport=void 0),p.setupLightsView($),K===!0&&ct.setGlobalState(x.clippingPlanes,$),ms(T,Y,$),P.updateMultisampleRenderTarget(dt),P.updateRenderTargetMipmap(dt),Ft.has("WEBGL_multisampled_render_to_texture")===!1){let $t=!1;for(let Dt=0,ne=k.length;Dt<ne;Dt++){const he=k[Dt],fe=he.object,Be=he.geometry,se=he.material,Nt=he.group;if(se.side===Fe&&fe.layers.test($.layers)){const _n=se.side;se.side=De,se.needsUpdate=!0,va(fe,Y,$,Be,se,Nt),se.side=_n,se.needsUpdate=!0,$t=!0}}$t===!0&&(P.updateMultisampleRenderTarget(dt),P.updateRenderTargetMipmap(dt))}x.setRenderTarget(Pt),x.setClearColor(D,N),Gt!==void 0&&($.viewport=Gt),x.toneMapping=Lt}function ms(T,k,Y){const $=k.isScene===!0?k.overrideMaterial:null;for(let H=0,dt=T.length;H<dt;H++){const _t=T[H],Pt=_t.object,Lt=_t.geometry,Gt=$===null?_t.material:$,$t=_t.group;Pt.layers.test(Y.layers)&&va(Pt,k,Y,Lt,Gt,$t)}}function va(T,k,Y,$,H,dt){T.onBeforeRender(x,k,Y,$,H,dt),T.modelViewMatrix.multiplyMatrices(Y.matrixWorldInverse,T.matrixWorld),T.normalMatrix.getNormalMatrix(T.modelViewMatrix),H.onBeforeRender(x,k,Y,$,T,dt),H.transparent===!0&&H.side===Fe&&H.forceSinglePass===!1?(H.side=De,H.needsUpdate=!0,x.renderBufferDirect(Y,k,$,H,T,dt),H.side=Xn,H.needsUpdate=!0,x.renderBufferDirect(Y,k,$,H,T,dt),H.side=Fe):x.renderBufferDirect(Y,k,$,H,T,dt),T.onAfterRender(x,k,Y,$,H,dt)}function gs(T,k,Y){k.isScene!==!0&&(k=Ot);const $=It.get(T),H=p.state.lights,dt=p.state.shadowsArray,_t=H.state.version,Pt=bt.getParameters(T,H.state,dt,k,Y),Lt=bt.getProgramCacheKey(Pt);let Gt=$.programs;$.environment=T.isMeshStandardMaterial?k.environment:null,$.fog=k.fog,$.envMap=(T.isMeshStandardMaterial?X:S).get(T.envMap||$.environment),$.envMapRotation=$.environment!==null&&T.envMap===null?k.environmentRotation:T.envMapRotation,Gt===void 0&&(T.addEventListener("dispose",Yt),Gt=new Map,$.programs=Gt);let $t=Gt.get(Lt);if($t!==void 0){if($.currentProgram===$t&&$.lightsStateVersion===_t)return xa(T,Pt),$t}else Pt.uniforms=bt.getUniforms(T),T.onBeforeCompile(Pt,x),$t=bt.acquireProgram(Pt,Lt),Gt.set(Lt,$t),$.uniforms=Pt.uniforms;const Dt=$.uniforms;return(!T.isShaderMaterial&&!T.isRawShaderMaterial||T.clipping===!0)&&(Dt.clippingPlanes=ct.uniform),xa(T,Pt),$.needsLights=Ll(T),$.lightsStateVersion=_t,$.needsLights&&(Dt.ambientLightColor.value=H.state.ambient,Dt.lightProbe.value=H.state.probe,Dt.directionalLights.value=H.state.directional,Dt.directionalLightShadows.value=H.state.directionalShadow,Dt.spotLights.value=H.state.spot,Dt.spotLightShadows.value=H.state.spotShadow,Dt.rectAreaLights.value=H.state.rectArea,Dt.ltc_1.value=H.state.rectAreaLTC1,Dt.ltc_2.value=H.state.rectAreaLTC2,Dt.pointLights.value=H.state.point,Dt.pointLightShadows.value=H.state.pointShadow,Dt.hemisphereLights.value=H.state.hemi,Dt.directionalShadowMap.value=H.state.directionalShadowMap,Dt.directionalShadowMatrix.value=H.state.directionalShadowMatrix,Dt.spotShadowMap.value=H.state.spotShadowMap,Dt.spotLightMatrix.value=H.state.spotLightMatrix,Dt.spotLightMap.value=H.state.spotLightMap,Dt.pointShadowMap.value=H.state.pointShadowMap,Dt.pointShadowMatrix.value=H.state.pointShadowMatrix),$.currentProgram=$t,$.uniformsList=null,$t}function _a(T){if(T.uniformsList===null){const k=T.currentProgram.getUniforms();T.uniformsList=er.seqWithValue(k.seq,T.uniforms)}return T.uniformsList}function xa(T,k){const Y=It.get(T);Y.outputColorSpace=k.outputColorSpace,Y.batching=k.batching,Y.batchingColor=k.batchingColor,Y.instancing=k.instancing,Y.instancingColor=k.instancingColor,Y.instancingMorph=k.instancingMorph,Y.skinning=k.skinning,Y.morphTargets=k.morphTargets,Y.morphNormals=k.morphNormals,Y.morphColors=k.morphColors,Y.morphTargetsCount=k.morphTargetsCount,Y.numClippingPlanes=k.numClippingPlanes,Y.numIntersection=k.numClipIntersection,Y.vertexAlphas=k.vertexAlphas,Y.vertexTangents=k.vertexTangents,Y.toneMapping=k.toneMapping}function Rl(T,k,Y,$,H){k.isScene!==!0&&(k=Ot),P.resetTextureUnits();const dt=k.fog,_t=$.isMeshStandardMaterial?k.environment:null,Pt=R===null?x.outputColorSpace:R.isXRRenderTarget===!0?R.texture.colorSpace:oi,Lt=($.isMeshStandardMaterial?X:S).get($.envMap||_t),Gt=$.vertexColors===!0&&!!Y.attributes.color&&Y.attributes.color.itemSize===4,$t=!!Y.attributes.tangent&&(!!$.normalMap||$.anisotropy>0),Dt=!!Y.morphAttributes.position,ne=!!Y.morphAttributes.normal,he=!!Y.morphAttributes.color;let fe=Ln;$.toneMapped&&(R===null||R.isXRRenderTarget===!0)&&(fe=x.toneMapping);const Be=Y.morphAttributes.position||Y.morphAttributes.normal||Y.morphAttributes.color,se=Be!==void 0?Be.length:0,Nt=It.get($),_n=p.state.lights;if(K===!0&&(et===!0||T!==M)){const je=T===M&&$.id===w;ct.setState($,T,je)}let re=!1;$.version===Nt.__version?(Nt.needsLights&&Nt.lightsStateVersion!==_n.state.version||Nt.outputColorSpace!==Pt||H.isBatchedMesh&&Nt.batching===!1||!H.isBatchedMesh&&Nt.batching===!0||H.isBatchedMesh&&Nt.batchingColor===!0&&H.colorTexture===null||H.isBatchedMesh&&Nt.batchingColor===!1&&H.colorTexture!==null||H.isInstancedMesh&&Nt.instancing===!1||!H.isInstancedMesh&&Nt.instancing===!0||H.isSkinnedMesh&&Nt.skinning===!1||!H.isSkinnedMesh&&Nt.skinning===!0||H.isInstancedMesh&&Nt.instancingColor===!0&&H.instanceColor===null||H.isInstancedMesh&&Nt.instancingColor===!1&&H.instanceColor!==null||H.isInstancedMesh&&Nt.instancingMorph===!0&&H.morphTexture===null||H.isInstancedMesh&&Nt.instancingMorph===!1&&H.morphTexture!==null||Nt.envMap!==Lt||$.fog===!0&&Nt.fog!==dt||Nt.numClippingPlanes!==void 0&&(Nt.numClippingPlanes!==ct.numPlanes||Nt.numIntersection!==ct.numIntersection)||Nt.vertexAlphas!==Gt||Nt.vertexTangents!==$t||Nt.morphTargets!==Dt||Nt.morphNormals!==ne||Nt.morphColors!==he||Nt.toneMapping!==fe||Nt.morphTargetsCount!==se)&&(re=!0):(re=!0,Nt.__version=$.version);let sn=Nt.currentProgram;re===!0&&(sn=gs($,k,H));let ci=!1,He=!1,Yi=!1;const pe=sn.getUniforms(),fn=Nt.uniforms;if(Rt.useProgram(sn.program)&&(ci=!0,He=!0,Yi=!0),$.id!==w&&(w=$.id,He=!0),ci||M!==T){Rt.buffers.depth.getReversed()?(it.copy(T.projectionMatrix),Fh(it),Oh(it),pe.setValue(z,"projectionMatrix",it)):pe.setValue(z,"projectionMatrix",T.projectionMatrix),pe.setValue(z,"viewMatrix",T.matrixWorldInverse);const Nn=pe.map.cameraPosition;Nn!==void 0&&Nn.setValue(z,ht.setFromMatrixPosition(T.matrixWorld)),Bt.logarithmicDepthBuffer&&pe.setValue(z,"logDepthBufFC",2/(Math.log(T.far+1)/Math.LN2)),($.isMeshPhongMaterial||$.isMeshToonMaterial||$.isMeshLambertMaterial||$.isMeshBasicMaterial||$.isMeshStandardMaterial||$.isShaderMaterial)&&pe.setValue(z,"isOrthographic",T.isOrthographicCamera===!0),M!==T&&(M=T,He=!0,Yi=!0)}if(H.isSkinnedMesh){pe.setOptional(z,H,"bindMatrix"),pe.setOptional(z,H,"bindMatrixInverse");const je=H.skeleton;je&&(je.boneTexture===null&&je.computeBoneTexture(),pe.setValue(z,"boneTexture",je.boneTexture,P))}H.isBatchedMesh&&(pe.setOptional(z,H,"batchingTexture"),pe.setValue(z,"batchingTexture",H._matricesTexture,P),pe.setOptional(z,H,"batchingIdTexture"),pe.setValue(z,"batchingIdTexture",H._indirectTexture,P),pe.setOptional(z,H,"batchingColorTexture"),H._colorsTexture!==null&&pe.setValue(z,"batchingColorTexture",H._colorsTexture,P));const $i=Y.morphAttributes;if(($i.position!==void 0||$i.normal!==void 0||$i.color!==void 0)&&Q.update(H,Y,sn),(He||Nt.receiveShadow!==H.receiveShadow)&&(Nt.receiveShadow=H.receiveShadow,pe.setValue(z,"receiveShadow",H.receiveShadow)),$.isMeshGouraudMaterial&&$.envMap!==null&&(fn.envMap.value=Lt,fn.flipEnvMap.value=Lt.isCubeTexture&&Lt.isRenderTargetTexture===!1?-1:1),$.isMeshStandardMaterial&&$.envMap===null&&k.environment!==null&&(fn.envMapIntensity.value=k.environmentIntensity),He&&(pe.setValue(z,"toneMappingExposure",x.toneMappingExposure),Nt.needsLights&&Pl(fn,Yi),dt&&$.fog===!0&&ut.refreshFogUniforms(fn,dt),ut.refreshMaterialUniforms(fn,$,O,G,p.state.transmissionRenderTarget[T.id]),er.upload(z,_a(Nt),fn,P)),$.isShaderMaterial&&$.uniformsNeedUpdate===!0&&(er.upload(z,_a(Nt),fn,P),$.uniformsNeedUpdate=!1),$.isSpriteMaterial&&pe.setValue(z,"center",H.center),pe.setValue(z,"modelViewMatrix",H.modelViewMatrix),pe.setValue(z,"normalMatrix",H.normalMatrix),pe.setValue(z,"modelMatrix",H.matrixWorld),$.isShaderMaterial||$.isRawShaderMaterial){const je=$.uniformsGroups;for(let Nn=0,zn=je.length;Nn<zn;Nn++){const Ma=je[Nn];B.update(Ma,sn),B.bind(Ma,sn)}}return sn}function Pl(T,k){T.ambientLightColor.needsUpdate=k,T.lightProbe.needsUpdate=k,T.directionalLights.needsUpdate=k,T.directionalLightShadows.needsUpdate=k,T.pointLights.needsUpdate=k,T.pointLightShadows.needsUpdate=k,T.spotLights.needsUpdate=k,T.spotLightShadows.needsUpdate=k,T.rectAreaLights.needsUpdate=k,T.hemisphereLights.needsUpdate=k}function Ll(T){return T.isMeshLambertMaterial||T.isMeshToonMaterial||T.isMeshPhongMaterial||T.isMeshStandardMaterial||T.isShadowMaterial||T.isShaderMaterial&&T.lights===!0}this.getActiveCubeFace=function(){return b},this.getActiveMipmapLevel=function(){return C},this.getRenderTarget=function(){return R},this.setRenderTargetTextures=function(T,k,Y){It.get(T.texture).__webglTexture=k,It.get(T.depthTexture).__webglTexture=Y;const $=It.get(T);$.__hasExternalTextures=!0,$.__autoAllocateDepthBuffer=Y===void 0,$.__autoAllocateDepthBuffer||Ft.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),$.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(T,k){const Y=It.get(T);Y.__webglFramebuffer=k,Y.__useDefaultFramebuffer=k===void 0},this.setRenderTarget=function(T,k=0,Y=0){R=T,b=k,C=Y;let $=!0,H=null,dt=!1,_t=!1;if(T){const Lt=It.get(T);if(Lt.__useDefaultFramebuffer!==void 0)Rt.bindFramebuffer(z.FRAMEBUFFER,null),$=!1;else if(Lt.__webglFramebuffer===void 0)P.setupRenderTarget(T);else if(Lt.__hasExternalTextures)P.rebindTextures(T,It.get(T.texture).__webglTexture,It.get(T.depthTexture).__webglTexture);else if(T.depthBuffer){const Dt=T.depthTexture;if(Lt.__boundDepthTexture!==Dt){if(Dt!==null&&It.has(Dt)&&(T.width!==Dt.image.width||T.height!==Dt.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");P.setupDepthRenderbuffer(T)}}const Gt=T.texture;(Gt.isData3DTexture||Gt.isDataArrayTexture||Gt.isCompressedArrayTexture)&&(_t=!0);const $t=It.get(T).__webglFramebuffer;T.isWebGLCubeRenderTarget?(Array.isArray($t[k])?H=$t[k][Y]:H=$t[k],dt=!0):T.samples>0&&P.useMultisampledRTT(T)===!1?H=It.get(T).__webglMultisampledFramebuffer:Array.isArray($t)?H=$t[Y]:H=$t,L.copy(T.viewport),I.copy(T.scissor),U=T.scissorTest}else L.copy(nt).multiplyScalar(O).floor(),I.copy(ot).multiplyScalar(O).floor(),U=lt;if(Rt.bindFramebuffer(z.FRAMEBUFFER,H)&&$&&Rt.drawBuffers(T,H),Rt.viewport(L),Rt.scissor(I),Rt.setScissorTest(U),dt){const Lt=It.get(T.texture);z.framebufferTexture2D(z.FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_CUBE_MAP_POSITIVE_X+k,Lt.__webglTexture,Y)}else if(_t){const Lt=It.get(T.texture),Gt=k||0;z.framebufferTextureLayer(z.FRAMEBUFFER,z.COLOR_ATTACHMENT0,Lt.__webglTexture,Y||0,Gt)}w=-1},this.readRenderTargetPixels=function(T,k,Y,$,H,dt,_t){if(!(T&&T.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Pt=It.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&_t!==void 0&&(Pt=Pt[_t]),Pt){Rt.bindFramebuffer(z.FRAMEBUFFER,Pt);try{const Lt=T.texture,Gt=Lt.format,$t=Lt.type;if(!Bt.textureFormatReadable(Gt)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Bt.textureTypeReadable($t)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}k>=0&&k<=T.width-$&&Y>=0&&Y<=T.height-H&&z.readPixels(k,Y,$,H,St.convert(Gt),St.convert($t),dt)}finally{const Lt=R!==null?It.get(R).__webglFramebuffer:null;Rt.bindFramebuffer(z.FRAMEBUFFER,Lt)}}},this.readRenderTargetPixelsAsync=async function(T,k,Y,$,H,dt,_t){if(!(T&&T.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Pt=It.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&_t!==void 0&&(Pt=Pt[_t]),Pt){const Lt=T.texture,Gt=Lt.format,$t=Lt.type;if(!Bt.textureFormatReadable(Gt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Bt.textureTypeReadable($t))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(k>=0&&k<=T.width-$&&Y>=0&&Y<=T.height-H){Rt.bindFramebuffer(z.FRAMEBUFFER,Pt);const Dt=z.createBuffer();z.bindBuffer(z.PIXEL_PACK_BUFFER,Dt),z.bufferData(z.PIXEL_PACK_BUFFER,dt.byteLength,z.STREAM_READ),z.readPixels(k,Y,$,H,St.convert(Gt),St.convert($t),0);const ne=R!==null?It.get(R).__webglFramebuffer:null;Rt.bindFramebuffer(z.FRAMEBUFFER,ne);const he=z.fenceSync(z.SYNC_GPU_COMMANDS_COMPLETE,0);return z.flush(),await zh(z,he,4),z.bindBuffer(z.PIXEL_PACK_BUFFER,Dt),z.getBufferSubData(z.PIXEL_PACK_BUFFER,0,dt),z.deleteBuffer(Dt),z.deleteSync(he),dt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(T,k=null,Y=0){T.isTexture!==!0&&(is("WebGLRenderer: copyFramebufferToTexture function signature has changed."),k=arguments[0]||null,T=arguments[1]);const $=Math.pow(2,-Y),H=Math.floor(T.image.width*$),dt=Math.floor(T.image.height*$),_t=k!==null?k.x:0,Pt=k!==null?k.y:0;P.setTexture2D(T,0),z.copyTexSubImage2D(z.TEXTURE_2D,Y,0,0,_t,Pt,H,dt),Rt.unbindTexture()},this.copyTextureToTexture=function(T,k,Y=null,$=null,H=0){T.isTexture!==!0&&(is("WebGLRenderer: copyTextureToTexture function signature has changed."),$=arguments[0]||null,T=arguments[1],k=arguments[2],H=arguments[3]||0,Y=null);let dt,_t,Pt,Lt,Gt,$t,Dt,ne,he;const fe=T.isCompressedTexture?T.mipmaps[H]:T.image;Y!==null?(dt=Y.max.x-Y.min.x,_t=Y.max.y-Y.min.y,Pt=Y.isBox3?Y.max.z-Y.min.z:1,Lt=Y.min.x,Gt=Y.min.y,$t=Y.isBox3?Y.min.z:0):(dt=fe.width,_t=fe.height,Pt=fe.depth||1,Lt=0,Gt=0,$t=0),$!==null?(Dt=$.x,ne=$.y,he=$.z):(Dt=0,ne=0,he=0);const Be=St.convert(k.format),se=St.convert(k.type);let Nt;k.isData3DTexture?(P.setTexture3D(k,0),Nt=z.TEXTURE_3D):k.isDataArrayTexture||k.isCompressedArrayTexture?(P.setTexture2DArray(k,0),Nt=z.TEXTURE_2D_ARRAY):(P.setTexture2D(k,0),Nt=z.TEXTURE_2D),z.pixelStorei(z.UNPACK_FLIP_Y_WEBGL,k.flipY),z.pixelStorei(z.UNPACK_PREMULTIPLY_ALPHA_WEBGL,k.premultiplyAlpha),z.pixelStorei(z.UNPACK_ALIGNMENT,k.unpackAlignment);const _n=z.getParameter(z.UNPACK_ROW_LENGTH),re=z.getParameter(z.UNPACK_IMAGE_HEIGHT),sn=z.getParameter(z.UNPACK_SKIP_PIXELS),ci=z.getParameter(z.UNPACK_SKIP_ROWS),He=z.getParameter(z.UNPACK_SKIP_IMAGES);z.pixelStorei(z.UNPACK_ROW_LENGTH,fe.width),z.pixelStorei(z.UNPACK_IMAGE_HEIGHT,fe.height),z.pixelStorei(z.UNPACK_SKIP_PIXELS,Lt),z.pixelStorei(z.UNPACK_SKIP_ROWS,Gt),z.pixelStorei(z.UNPACK_SKIP_IMAGES,$t);const Yi=T.isDataArrayTexture||T.isData3DTexture,pe=k.isDataArrayTexture||k.isData3DTexture;if(T.isRenderTargetTexture||T.isDepthTexture){const fn=It.get(T),$i=It.get(k),je=It.get(fn.__renderTarget),Nn=It.get($i.__renderTarget);Rt.bindFramebuffer(z.READ_FRAMEBUFFER,je.__webglFramebuffer),Rt.bindFramebuffer(z.DRAW_FRAMEBUFFER,Nn.__webglFramebuffer);for(let zn=0;zn<Pt;zn++)Yi&&z.framebufferTextureLayer(z.READ_FRAMEBUFFER,z.COLOR_ATTACHMENT0,It.get(T).__webglTexture,H,$t+zn),T.isDepthTexture?(pe&&z.framebufferTextureLayer(z.DRAW_FRAMEBUFFER,z.COLOR_ATTACHMENT0,It.get(k).__webglTexture,H,he+zn),z.blitFramebuffer(Lt,Gt,dt,_t,Dt,ne,dt,_t,z.DEPTH_BUFFER_BIT,z.NEAREST)):pe?z.copyTexSubImage3D(Nt,H,Dt,ne,he+zn,Lt,Gt,dt,_t):z.copyTexSubImage2D(Nt,H,Dt,ne,he+zn,Lt,Gt,dt,_t);Rt.bindFramebuffer(z.READ_FRAMEBUFFER,null),Rt.bindFramebuffer(z.DRAW_FRAMEBUFFER,null)}else pe?T.isDataTexture||T.isData3DTexture?z.texSubImage3D(Nt,H,Dt,ne,he,dt,_t,Pt,Be,se,fe.data):k.isCompressedArrayTexture?z.compressedTexSubImage3D(Nt,H,Dt,ne,he,dt,_t,Pt,Be,fe.data):z.texSubImage3D(Nt,H,Dt,ne,he,dt,_t,Pt,Be,se,fe):T.isDataTexture?z.texSubImage2D(z.TEXTURE_2D,H,Dt,ne,dt,_t,Be,se,fe.data):T.isCompressedTexture?z.compressedTexSubImage2D(z.TEXTURE_2D,H,Dt,ne,fe.width,fe.height,Be,fe.data):z.texSubImage2D(z.TEXTURE_2D,H,Dt,ne,dt,_t,Be,se,fe);z.pixelStorei(z.UNPACK_ROW_LENGTH,_n),z.pixelStorei(z.UNPACK_IMAGE_HEIGHT,re),z.pixelStorei(z.UNPACK_SKIP_PIXELS,sn),z.pixelStorei(z.UNPACK_SKIP_ROWS,ci),z.pixelStorei(z.UNPACK_SKIP_IMAGES,He),H===0&&k.generateMipmaps&&z.generateMipmap(Nt),Rt.unbindTexture()},this.copyTextureToTexture3D=function(T,k,Y=null,$=null,H=0){return T.isTexture!==!0&&(is("WebGLRenderer: copyTextureToTexture3D function signature has changed."),Y=arguments[0]||null,$=arguments[1]||null,T=arguments[2],k=arguments[3],H=arguments[4]||0),is('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(T,k,Y,$,H)},this.initRenderTarget=function(T){It.get(T).__webglFramebuffer===void 0&&P.setupRenderTarget(T)},this.initTexture=function(T){T.isCubeTexture?P.setTextureCube(T,0):T.isData3DTexture?P.setTexture3D(T,0):T.isDataArrayTexture||T.isCompressedArrayTexture?P.setTexture2DArray(T,0):P.setTexture2D(T,0),Rt.unbindTexture()},this.resetState=function(){b=0,C=0,R=null,Rt.reset(),kt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Rn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorspace=te._getDrawingBufferColorSpace(t),e.unpackColorSpace=te._getUnpackColorSpace()}}class fs extends Ce{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new ve,this.environmentIntensity=1,this.environmentRotation=new ve,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}}class nr extends Ie{constructor(t=null,e=1,n=1,s,r,o,a,c,l=Oe,h=Oe,d,u){super(null,o,a,c,l,h,s,r,d,u),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Pi extends de{constructor(t,e,n,s=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){const t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}}const Si=new Xt,xc=new Xt,Os=[],Mc=new gn,Jp=new Xt,Qi=new zt,ts=new In;class tn extends zt{constructor(t,e,n){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new Pi(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,Jp)}computeBoundingBox(){const t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new gn),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Si),Mc.copy(t.boundingBox).applyMatrix4(Si),this.boundingBox.union(Mc)}computeBoundingSphere(){const t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new In),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Si),ts.copy(t.boundingSphere).applyMatrix4(Si),this.boundingSphere.union(ts)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){const n=e.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,o=t*r+1;for(let a=0;a<n.length;a++)n[a]=s[o+a]}raycast(t,e){const n=this.matrixWorld,s=this.count;if(Qi.geometry=this.geometry,Qi.material=this.material,Qi.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),ts.copy(this.boundingSphere),ts.applyMatrix4(n),t.ray.intersectsSphere(ts)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,Si),xc.multiplyMatrices(n,Si),Qi.matrixWorld=xc,Qi.raycast(t,Os);for(let o=0,a=Os.length;o<a;o++){const c=Os[o];c.instanceId=r,c.object=this,e.push(c)}Os.length=0}}setColorAt(t,e){this.instanceColor===null&&(this.instanceColor=new Pi(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3)}setMatrixAt(t,e){e.toArray(this.instanceMatrix.array,t*16)}setMorphAt(t,e){const n=e.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new nr(new Float32Array(s*this.count),s,this.count,us,ln));const r=this.morphTexture.source.data.data;let o=0;for(let l=0;l<n.length;l++)o+=n[l];const a=this.geometry.morphTargetsRelative?1:1-o,c=s*t;r[c]=a,r.set(n,c+1)}updateMorphTargets(){}dispose(){return this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null),this}}class Qp extends Xi{static get type(){return"PointsMaterial"}constructor(t){super(),this.isPointsMaterial=!0,this.color=new Et(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}}const yc=new Xt,Ho=new ol,Bs=new In,ks=new A;class tm extends Ce{constructor(t=new Jt,e=new Qp){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}raycast(t,e){const n=this.geometry,s=this.matrixWorld,r=t.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Bs.copy(n.boundingSphere),Bs.applyMatrix4(s),Bs.radius+=r,t.ray.intersectsSphere(Bs)===!1)return;yc.copy(s).invert(),Ho.copy(t.ray).applyMatrix4(yc);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=n.index,d=n.attributes.position;if(l!==null){const u=Math.max(0,o.start),f=Math.min(l.count,o.start+o.count);for(let g=u,v=f;g<v;g++){const m=l.getX(g);ks.fromBufferAttribute(d,m),wc(ks,m,c,s,t,e,this)}}else{const u=Math.max(0,o.start),f=Math.min(d.count,o.start+o.count);for(let g=u,v=f;g<v;g++)ks.fromBufferAttribute(d,g),wc(ks,g,c,s,t,e,this)}}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function wc(i,t,e,n,s,r,o){const a=Ho.distanceSqToPoint(i);if(a<e){const c=new A;Ho.closestPointToPoint(i,c),c.applyMatrix4(n);const l=s.ray.origin.distanceTo(c);if(l<s.near||l>s.far)return;r.push({distance:l,distanceToRay:Math.sqrt(a),point:c,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}class lr extends Ie{constructor(t,e,n,s,r,o,a,c,l){super(t,e,n,s,r,o,a,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}}class Un{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(t,e){const n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){const t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const e=[];let n,s=this.getPoint(0),r=0;e.push(0);for(let o=1;o<=t;o++)n=this.getPoint(o/t),r+=n.distanceTo(s),e.push(r),s=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e){const n=this.getLengths();let s=0;const r=n.length;let o;e?o=e:o=t*n[r-1];let a=0,c=r-1,l;for(;a<=c;)if(s=Math.floor(a+(c-a)/2),l=n[s]-o,l<0)a=s+1;else if(l>0)c=s-1;else{c=s;break}if(s=c,n[s]===o)return s/(r-1);const h=n[s],u=n[s+1]-h,f=(o-h)/u;return(s+f)/(r-1)}getTangent(t,e){let s=t-1e-4,r=t+1e-4;s<0&&(s=0),r>1&&(r=1);const o=this.getPoint(s),a=this.getPoint(r),c=e||(o.isVector2?new wt:new A);return c.copy(a).sub(o).normalize(),c}getTangentAt(t,e){const n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e){const n=new A,s=[],r=[],o=[],a=new A,c=new Xt;for(let f=0;f<=t;f++){const g=f/t;s[f]=this.getTangentAt(g,new A)}r[0]=new A,o[0]=new A;let l=Number.MAX_VALUE;const h=Math.abs(s[0].x),d=Math.abs(s[0].y),u=Math.abs(s[0].z);h<=l&&(l=h,n.set(1,0,0)),d<=l&&(l=d,n.set(0,1,0)),u<=l&&n.set(0,0,1),a.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],a),o[0].crossVectors(s[0],r[0]);for(let f=1;f<=t;f++){if(r[f]=r[f-1].clone(),o[f]=o[f-1].clone(),a.crossVectors(s[f-1],s[f]),a.length()>Number.EPSILON){a.normalize();const g=Math.acos(we(s[f-1].dot(s[f]),-1,1));r[f].applyMatrix4(c.makeRotationAxis(a,g))}o[f].crossVectors(s[f],r[f])}if(e===!0){let f=Math.acos(we(r[0].dot(r[t]),-1,1));f/=t,s[0].dot(a.crossVectors(r[0],r[t]))>0&&(f=-f);for(let g=1;g<=t;g++)r[g].applyMatrix4(c.makeRotationAxis(s[g],f*g)),o[g].crossVectors(s[g],r[g])}return{tangents:s,normals:r,binormals:o}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){const t={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}}class xl extends Un{constructor(t=0,e=0,n=1,s=1,r=0,o=Math.PI*2,a=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=o,this.aClockwise=a,this.aRotation=c}getPoint(t,e=new wt){const n=e,s=Math.PI*2;let r=this.aEndAngle-this.aStartAngle;const o=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(o?r=0:r=s),this.aClockwise===!0&&!o&&(r===s?r=-s:r=r-s);const a=this.aStartAngle+t*r;let c=this.aX+this.xRadius*Math.cos(a),l=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){const h=Math.cos(this.aRotation),d=Math.sin(this.aRotation),u=c-this.aX,f=l-this.aY;c=u*h-f*d+this.aX,l=u*d+f*h+this.aY}return n.set(c,l)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){const t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}}class em extends xl{constructor(t,e,n,s,r,o){super(t,e,n,n,s,r,o),this.isArcCurve=!0,this.type="ArcCurve"}}function ea(){let i=0,t=0,e=0,n=0;function s(r,o,a,c){i=r,t=a,e=-3*r+3*o-2*a-c,n=2*r-2*o+a+c}return{initCatmullRom:function(r,o,a,c,l){s(o,a,l*(a-r),l*(c-o))},initNonuniformCatmullRom:function(r,o,a,c,l,h,d){let u=(o-r)/l-(a-r)/(l+h)+(a-o)/h,f=(a-o)/h-(c-o)/(h+d)+(c-a)/d;u*=h,f*=h,s(o,a,u,f)},calc:function(r){const o=r*r,a=o*r;return i+t*r+e*o+n*a}}}const Hs=new A,Hr=new ea,Vr=new ea,Gr=new ea;class Ml extends Un{constructor(t=[],e=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=s}getPoint(t,e=new A){const n=e,s=this.points,r=s.length,o=(r-(this.closed?0:1))*t;let a=Math.floor(o),c=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/r)+1)*r:c===0&&a===r-1&&(a=r-2,c=1);let l,h;this.closed||a>0?l=s[(a-1)%r]:(Hs.subVectors(s[0],s[1]).add(s[0]),l=Hs);const d=s[a%r],u=s[(a+1)%r];if(this.closed||a+2<r?h=s[(a+2)%r]:(Hs.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=Hs),this.curveType==="centripetal"||this.curveType==="chordal"){const f=this.curveType==="chordal"?.5:.25;let g=Math.pow(l.distanceToSquared(d),f),v=Math.pow(d.distanceToSquared(u),f),m=Math.pow(u.distanceToSquared(h),f);v<1e-4&&(v=1),g<1e-4&&(g=v),m<1e-4&&(m=v),Hr.initNonuniformCatmullRom(l.x,d.x,u.x,h.x,g,v,m),Vr.initNonuniformCatmullRom(l.y,d.y,u.y,h.y,g,v,m),Gr.initNonuniformCatmullRom(l.z,d.z,u.z,h.z,g,v,m)}else this.curveType==="catmullrom"&&(Hr.initCatmullRom(l.x,d.x,u.x,h.x,this.tension),Vr.initCatmullRom(l.y,d.y,u.y,h.y,this.tension),Gr.initCatmullRom(l.z,d.z,u.z,h.z,this.tension));return n.set(Hr.calc(c),Vr.calc(c),Gr.calc(c)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(s.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const s=this.points[e];t.points.push(s.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(new A().fromArray(s))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}}function Sc(i,t,e,n,s){const r=(n-t)*.5,o=(s-e)*.5,a=i*i,c=i*a;return(2*e-2*n+r+o)*c+(-3*e+3*n-2*r-o)*a+r*i+e}function nm(i,t){const e=1-i;return e*e*t}function im(i,t){return 2*(1-i)*i*t}function sm(i,t){return i*i*t}function as(i,t,e,n){return nm(i,t)+im(i,e)+sm(i,n)}function rm(i,t){const e=1-i;return e*e*e*t}function om(i,t){const e=1-i;return 3*e*e*i*t}function am(i,t){return 3*(1-i)*i*i*t}function cm(i,t){return i*i*i*t}function cs(i,t,e,n,s){return rm(i,t)+om(i,e)+am(i,n)+cm(i,s)}class lm extends Un{constructor(t=new wt,e=new wt,n=new wt,s=new wt){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new wt){const n=e,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(cs(t,s.x,r.x,o.x,a.x),cs(t,s.y,r.y,o.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class hm extends Un{constructor(t=new A,e=new A,n=new A,s=new A){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new A){const n=e,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(cs(t,s.x,r.x,o.x,a.x),cs(t,s.y,r.y,o.y,a.y),cs(t,s.z,r.z,o.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class um extends Un{constructor(t=new wt,e=new wt){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new wt){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new wt){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class dm extends Un{constructor(t=new A,e=new A){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new A){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new A){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class fm extends Un{constructor(t=new wt,e=new wt,n=new wt){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new wt){const n=e,s=this.v0,r=this.v1,o=this.v2;return n.set(as(t,s.x,r.x,o.x),as(t,s.y,r.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class yl extends Un{constructor(t=new A,e=new A,n=new A){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new A){const n=e,s=this.v0,r=this.v1,o=this.v2;return n.set(as(t,s.x,r.x,o.x),as(t,s.y,r.y,o.y),as(t,s.z,r.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class pm extends Un{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new wt){const n=e,s=this.points,r=(s.length-1)*t,o=Math.floor(r),a=r-o,c=s[o===0?o:o-1],l=s[o],h=s[o>s.length-2?s.length-1:o+1],d=s[o>s.length-3?s.length-1:o+2];return n.set(Sc(a,c.x,l.x,h.x,d.x),Sc(a,c.y,l.y,h.y,d.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(s.clone())}return this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const s=this.points[e];t.points.push(s.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(new wt().fromArray(s))}return this}}var mm=Object.freeze({__proto__:null,ArcCurve:em,CatmullRomCurve3:Ml,CubicBezierCurve:lm,CubicBezierCurve3:hm,EllipseCurve:xl,LineCurve:um,LineCurve3:dm,QuadraticBezierCurve:fm,QuadraticBezierCurve3:yl,SplineCurve:pm});class na extends Jt{constructor(t=1,e=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:s},e=Math.max(3,e);const r=[],o=[],a=[],c=[],l=new A,h=new wt;o.push(0,0,0),a.push(0,0,1),c.push(.5,.5);for(let d=0,u=3;d<=e;d++,u+=3){const f=n+d/e*s;l.x=t*Math.cos(f),l.y=t*Math.sin(f),o.push(l.x,l.y,l.z),a.push(0,0,1),h.x=(o[u]/t+1)/2,h.y=(o[u+1]/t+1)/2,c.push(h.x,h.y)}for(let d=1;d<=e;d++)r.push(d,d+1,0);this.setIndex(r),this.setAttribute("position",new At(o,3)),this.setAttribute("normal",new At(a,3)),this.setAttribute("uv",new At(c,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new na(t.radius,t.segments,t.thetaStart,t.thetaLength)}}class le extends Jt{constructor(t=1,e=1,n=1,s=32,r=1,o=!1,a=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:s,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:c};const l=this;s=Math.floor(s),r=Math.floor(r);const h=[],d=[],u=[],f=[];let g=0;const v=[],m=n/2;let p=0;y(),o===!1&&(t>0&&_(!0),e>0&&_(!1)),this.setIndex(h),this.setAttribute("position",new At(d,3)),this.setAttribute("normal",new At(u,3)),this.setAttribute("uv",new At(f,2));function y(){const x=new A,E=new A;let b=0;const C=(e-t)/n;for(let R=0;R<=r;R++){const w=[],M=R/r,L=M*(e-t)+t;for(let I=0;I<=s;I++){const U=I/s,D=U*c+a,N=Math.sin(D),F=Math.cos(D);E.x=L*N,E.y=-M*n+m,E.z=L*F,d.push(E.x,E.y,E.z),x.set(N,C,F).normalize(),u.push(x.x,x.y,x.z),f.push(U,1-M),w.push(g++)}v.push(w)}for(let R=0;R<s;R++)for(let w=0;w<r;w++){const M=v[w][R],L=v[w+1][R],I=v[w+1][R+1],U=v[w][R+1];(t>0||w!==0)&&(h.push(M,L,U),b+=3),(e>0||w!==r-1)&&(h.push(L,I,U),b+=3)}l.addGroup(p,b,0),p+=b}function _(x){const E=g,b=new wt,C=new A;let R=0;const w=x===!0?t:e,M=x===!0?1:-1;for(let I=1;I<=s;I++)d.push(0,m*M,0),u.push(0,M,0),f.push(.5,.5),g++;const L=g;for(let I=0;I<=s;I++){const D=I/s*c+a,N=Math.cos(D),F=Math.sin(D);C.x=w*F,C.y=m*M,C.z=w*N,d.push(C.x,C.y,C.z),u.push(0,M,0),b.x=N*.5+.5,b.y=F*.5*M+.5,f.push(b.x,b.y),g++}for(let I=0;I<s;I++){const U=E+I,D=L+I;x===!0?h.push(D,D+1,U):h.push(D+1,D,U),R+=3}l.addGroup(p,R,x===!0?1:2),p+=R}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new le(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class ia extends le{constructor(t=1,e=1,n=32,s=1,r=!1,o=0,a=Math.PI*2){super(0,t,e,n,s,r,o,a),this.type="ConeGeometry",this.parameters={radius:t,height:e,radialSegments:n,heightSegments:s,openEnded:r,thetaStart:o,thetaLength:a}}static fromJSON(t){return new ia(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class sa extends Jt{constructor(t=[],e=[],n=1,s=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:n,detail:s};const r=[],o=[];a(s),l(n),h(),this.setAttribute("position",new At(r,3)),this.setAttribute("normal",new At(r.slice(),3)),this.setAttribute("uv",new At(o,2)),s===0?this.computeVertexNormals():this.normalizeNormals();function a(y){const _=new A,x=new A,E=new A;for(let b=0;b<e.length;b+=3)f(e[b+0],_),f(e[b+1],x),f(e[b+2],E),c(_,x,E,y)}function c(y,_,x,E){const b=E+1,C=[];for(let R=0;R<=b;R++){C[R]=[];const w=y.clone().lerp(x,R/b),M=_.clone().lerp(x,R/b),L=b-R;for(let I=0;I<=L;I++)I===0&&R===b?C[R][I]=w:C[R][I]=w.clone().lerp(M,I/L)}for(let R=0;R<b;R++)for(let w=0;w<2*(b-R)-1;w++){const M=Math.floor(w/2);w%2===0?(u(C[R][M+1]),u(C[R+1][M]),u(C[R][M])):(u(C[R][M+1]),u(C[R+1][M+1]),u(C[R+1][M]))}}function l(y){const _=new A;for(let x=0;x<r.length;x+=3)_.x=r[x+0],_.y=r[x+1],_.z=r[x+2],_.normalize().multiplyScalar(y),r[x+0]=_.x,r[x+1]=_.y,r[x+2]=_.z}function h(){const y=new A;for(let _=0;_<r.length;_+=3){y.x=r[_+0],y.y=r[_+1],y.z=r[_+2];const x=m(y)/2/Math.PI+.5,E=p(y)/Math.PI+.5;o.push(x,1-E)}g(),d()}function d(){for(let y=0;y<o.length;y+=6){const _=o[y+0],x=o[y+2],E=o[y+4],b=Math.max(_,x,E),C=Math.min(_,x,E);b>.9&&C<.1&&(_<.2&&(o[y+0]+=1),x<.2&&(o[y+2]+=1),E<.2&&(o[y+4]+=1))}}function u(y){r.push(y.x,y.y,y.z)}function f(y,_){const x=y*3;_.x=t[x+0],_.y=t[x+1],_.z=t[x+2]}function g(){const y=new A,_=new A,x=new A,E=new A,b=new wt,C=new wt,R=new wt;for(let w=0,M=0;w<r.length;w+=9,M+=6){y.set(r[w+0],r[w+1],r[w+2]),_.set(r[w+3],r[w+4],r[w+5]),x.set(r[w+6],r[w+7],r[w+8]),b.set(o[M+0],o[M+1]),C.set(o[M+2],o[M+3]),R.set(o[M+4],o[M+5]),E.copy(y).add(_).add(x).divideScalar(3);const L=m(E);v(b,M+0,y,L),v(C,M+2,_,L),v(R,M+4,x,L)}}function v(y,_,x,E){E<0&&y.x===1&&(o[_]=y.x-1),x.x===0&&x.z===0&&(o[_]=E/2/Math.PI+.5)}function m(y){return Math.atan2(y.z,-y.x)}function p(y){return Math.atan2(-y.y,Math.sqrt(y.x*y.x+y.z*y.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new sa(t.vertices,t.indices,t.radius,t.details)}}class ra extends sa{constructor(t=1,e=0){const n=(1+Math.sqrt(5))/2,s=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],r=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(s,r,t,e),this.type="IcosahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new ra(t.radius,t.detail)}}class Qe extends Jt{constructor(t=1,e=32,n=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));const c=Math.min(o+a,Math.PI);let l=0;const h=[],d=new A,u=new A,f=[],g=[],v=[],m=[];for(let p=0;p<=n;p++){const y=[],_=p/n;let x=0;p===0&&o===0?x=.5/e:p===n&&c===Math.PI&&(x=-.5/e);for(let E=0;E<=e;E++){const b=E/e;d.x=-t*Math.cos(s+b*r)*Math.sin(o+_*a),d.y=t*Math.cos(o+_*a),d.z=t*Math.sin(s+b*r)*Math.sin(o+_*a),g.push(d.x,d.y,d.z),u.copy(d).normalize(),v.push(u.x,u.y,u.z),m.push(b+x,1-_),y.push(l++)}h.push(y)}for(let p=0;p<n;p++)for(let y=0;y<e;y++){const _=h[p][y+1],x=h[p][y],E=h[p+1][y],b=h[p+1][y+1];(p!==0||o>0)&&f.push(_,x,b),(p!==n-1||c<Math.PI)&&f.push(x,E,b)}this.setIndex(f),this.setAttribute("position",new At(g,3)),this.setAttribute("normal",new At(v,3)),this.setAttribute("uv",new At(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Qe(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}class ls extends Jt{constructor(t=1,e=.4,n=12,s=48,r=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:s,arc:r},n=Math.floor(n),s=Math.floor(s);const o=[],a=[],c=[],l=[],h=new A,d=new A,u=new A;for(let f=0;f<=n;f++)for(let g=0;g<=s;g++){const v=g/s*r,m=f/n*Math.PI*2;d.x=(t+e*Math.cos(m))*Math.cos(v),d.y=(t+e*Math.cos(m))*Math.sin(v),d.z=e*Math.sin(m),a.push(d.x,d.y,d.z),h.x=t*Math.cos(v),h.y=t*Math.sin(v),u.subVectors(d,h).normalize(),c.push(u.x,u.y,u.z),l.push(g/s),l.push(f/n)}for(let f=1;f<=n;f++)for(let g=1;g<=s;g++){const v=(s+1)*f+g-1,m=(s+1)*(f-1)+g-1,p=(s+1)*(f-1)+g,y=(s+1)*f+g;o.push(v,m,y),o.push(m,p,y)}this.setIndex(o),this.setAttribute("position",new At(a,3)),this.setAttribute("normal",new At(c,3)),this.setAttribute("uv",new At(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ls(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}}class oa extends Jt{constructor(t=new yl(new A(-1,-1,0),new A(-1,1,0),new A(1,1,0)),e=64,n=1,s=8,r=!1){super(),this.type="TubeGeometry",this.parameters={path:t,tubularSegments:e,radius:n,radialSegments:s,closed:r};const o=t.computeFrenetFrames(e,r);this.tangents=o.tangents,this.normals=o.normals,this.binormals=o.binormals;const a=new A,c=new A,l=new wt;let h=new A;const d=[],u=[],f=[],g=[];v(),this.setIndex(g),this.setAttribute("position",new At(d,3)),this.setAttribute("normal",new At(u,3)),this.setAttribute("uv",new At(f,2));function v(){for(let _=0;_<e;_++)m(_);m(r===!1?e:0),y(),p()}function m(_){h=t.getPointAt(_/e,h);const x=o.normals[_],E=o.binormals[_];for(let b=0;b<=s;b++){const C=b/s*Math.PI*2,R=Math.sin(C),w=-Math.cos(C);c.x=w*x.x+R*E.x,c.y=w*x.y+R*E.y,c.z=w*x.z+R*E.z,c.normalize(),u.push(c.x,c.y,c.z),a.x=h.x+n*c.x,a.y=h.y+n*c.y,a.z=h.z+n*c.z,d.push(a.x,a.y,a.z)}}function p(){for(let _=1;_<=e;_++)for(let x=1;x<=s;x++){const E=(s+1)*(_-1)+(x-1),b=(s+1)*_+(x-1),C=(s+1)*_+x,R=(s+1)*(_-1)+x;g.push(E,b,R),g.push(b,C,R)}}function y(){for(let _=0;_<=e;_++)for(let x=0;x<=s;x++)l.x=_/e,l.y=x/s,f.push(l.x,l.y)}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){const t=super.toJSON();return t.path=this.parameters.path.toJSON(),t}static fromJSON(t){return new oa(new mm[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}}class Ct extends Xi{static get type(){return"MeshStandardMaterial"}constructor(t){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.color=new Et(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Et(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Qc,this.normalScale=new wt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new ve,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class es extends Ct{static get type(){return"MeshPhysicalMaterial"}constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new wt(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return we(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Et(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Et(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Et(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get dispersion(){return this._dispersion}set dispersion(t){this._dispersion>0!=t>0&&this.version++,this._dispersion=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.dispersion=t.dispersion,this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}}class gm extends Ce{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new Et(t),this.intensity=e}dispose(){}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(e.object.target=this.target.uuid),e}}const Wr=new Xt,bc=new A,Ec=new A;class vm{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new wt(512,512),this.map=null,this.mapPass=null,this.matrix=new Xt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Jo,this._frameExtents=new wt(1,1),this._viewportCount=1,this._viewports=[new ge(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,n=this.matrix;bc.setFromMatrixPosition(t.matrixWorld),e.position.copy(bc),Ec.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Ec),e.updateMatrixWorld(),Wr.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Wr),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Wr)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}class _m extends vm{constructor(){super(new ps(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class xm extends gm{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Ce.DEFAULT_UP),this.updateMatrix(),this.target=new Ce,this.shadow=new _m}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Go}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Go);const Xr=new Xt;class hr{constructor(t){t=t||{},this.zNear=t.webGL===!0?-1:0,this.vertices={near:[new A,new A,new A,new A],far:[new A,new A,new A,new A]},t.projectionMatrix!==void 0&&this.setFromProjectionMatrix(t.projectionMatrix,t.maxFar||1e4)}setFromProjectionMatrix(t,e){const n=this.zNear,s=t.elements[2*4+3]===0;return Xr.copy(t).invert(),this.vertices.near[0].set(1,1,n),this.vertices.near[1].set(1,-1,n),this.vertices.near[2].set(-1,-1,n),this.vertices.near[3].set(-1,1,n),this.vertices.near.forEach(function(r){r.applyMatrix4(Xr)}),this.vertices.far[0].set(1,1,1),this.vertices.far[1].set(1,-1,1),this.vertices.far[2].set(-1,-1,1),this.vertices.far[3].set(-1,1,1),this.vertices.far.forEach(function(r){r.applyMatrix4(Xr);const o=Math.abs(r.z);s?r.z*=Math.min(e/o,1):r.multiplyScalar(Math.min(e/o,1))}),this.vertices}split(t,e){for(;t.length>e.length;)e.push(new hr);e.length=t.length;for(let n=0;n<t.length;n++){const s=e[n];if(n===0)for(let r=0;r<4;r++)s.vertices.near[r].copy(this.vertices.near[r]);else for(let r=0;r<4;r++)s.vertices.near[r].lerpVectors(this.vertices.near[r],this.vertices.far[r],t[n-1]);if(n===t.length-1)for(let r=0;r<4;r++)s.vertices.far[r].copy(this.vertices.far[r]);else for(let r=0;r<4;r++)s.vertices.far[r].lerpVectors(this.vertices.near[r],this.vertices.far[r],t[n])}}toSpace(t,e){for(let n=0;n<4;n++)e.vertices.near[n].copy(this.vertices.near[n]).applyMatrix4(t),e.vertices.far[n].copy(this.vertices.far[n]).applyMatrix4(t)}}const Tc={lights_fragment_begin:`
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
	`+Wt.lights_pars_begin},Ac=new Xt,qr=new hr({webGL:!0}),bn=new A,ns=new gn,Yr=[],$r=[],Zr=new Xt,Cc=new Xt,Mm=new A(0,1,0);class ym{constructor(t){this.camera=t.camera,this.parent=t.parent,this.cascades=t.cascades||3,this.maxFar=t.maxFar||1e5,this.mode=t.mode||"practical",this.shadowMapSize=t.shadowMapSize||2048,this.shadowBias=t.shadowBias||1e-6,this.lightDirection=t.lightDirection||new A(1,-1,1).normalize(),this.lightIntensity=t.lightIntensity||3,this.lightNear=t.lightNear||1,this.lightFar=t.lightFar||2e3,this.lightMargin=t.lightMargin||200,this.customSplitsCallback=t.customSplitsCallback,this.fade=!1,this.mainFrustum=new hr({webGL:!0}),this.frustums=[],this.breaks=[],this.lights=[],this.shaders=new Map,this.createLights(),this.updateFrustums(),this.injectInclude()}createLights(){for(let t=0;t<this.cascades;t++){const e=new xm(16777215,this.lightIntensity);e.castShadow=!0,e.shadow.mapSize.width=this.shadowMapSize,e.shadow.mapSize.height=this.shadowMapSize,e.shadow.camera.near=this.lightNear,e.shadow.camera.far=this.lightFar,e.shadow.bias=this.shadowBias,this.parent.add(e),this.parent.add(e.target),this.lights.push(e)}}initCascades(){const t=this.camera;t.updateProjectionMatrix(),this.mainFrustum.setFromProjectionMatrix(t.projectionMatrix,this.maxFar),this.mainFrustum.split(this.breaks,this.frustums)}updateShadowBounds(){const t=this.frustums;for(let e=0;e<t.length;e++){const s=this.lights[e].shadow.camera,r=this.frustums[e],o=r.vertices.near,a=r.vertices.far,c=a[0];let l;c.distanceTo(a[2])>c.distanceTo(o[2])?l=a[2]:l=o[2];let h=c.distanceTo(l);if(this.fade){const d=this.camera,u=Math.max(d.far,this.maxFar),f=r.vertices.far[0].z/(u-d.near),g=.25*Math.pow(f,2)*(u-d.near);h+=g}s.left=-h/2,s.right=h/2,s.top=h/2,s.bottom=-h/2,s.updateProjectionMatrix()}}getBreaks(){const t=this.camera,e=Math.min(t.far,this.maxFar);switch(this.breaks.length=0,this.mode){case"uniform":n(this.cascades,t.near,e,this.breaks);break;case"logarithmic":s(this.cascades,t.near,e,this.breaks);break;case"practical":r(this.cascades,t.near,e,.5,this.breaks);break;case"custom":this.customSplitsCallback===void 0&&console.error("CSM: Custom split scheme callback not defined."),this.customSplitsCallback(this.cascades,t.near,e,this.breaks);break}function n(o,a,c,l){for(let h=1;h<o;h++)l.push((a+(c-a)*h/o)/c);l.push(1)}function s(o,a,c,l){for(let h=1;h<o;h++)l.push(a*(c/a)**(h/o)/c);l.push(1)}function r(o,a,c,l,h){Yr.length=0,$r.length=0,s(o,a,c,$r),n(o,a,c,Yr);for(let d=1;d<o;d++)h.push(el.lerp(Yr[d-1],$r[d-1],l));h.push(1)}}update(){const t=this.camera,e=this.frustums;Zr.lookAt(new A,this.lightDirection,Mm),Cc.copy(Zr).invert();for(let n=0;n<e.length;n++){const s=this.lights[n],r=s.shadow.camera,o=(r.right-r.left)/this.shadowMapSize,a=(r.top-r.bottom)/this.shadowMapSize;Ac.multiplyMatrices(Cc,t.matrixWorld),e[n].toSpace(Ac,qr);const c=qr.vertices.near,l=qr.vertices.far;ns.makeEmpty();for(let h=0;h<4;h++)ns.expandByPoint(c[h]),ns.expandByPoint(l[h]);ns.getCenter(bn),bn.z=ns.max.z+this.lightMargin,bn.x=Math.floor(bn.x/o)*o,bn.y=Math.floor(bn.y/a)*a,bn.applyMatrix4(Zr),s.position.copy(bn),s.target.position.copy(bn),s.target.position.x+=this.lightDirection.x,s.target.position.y+=this.lightDirection.y,s.target.position.z+=this.lightDirection.z}}injectInclude(){Wt.lights_fragment_begin=Tc.lights_fragment_begin,Wt.lights_pars_begin=Tc.lights_pars_begin}setupMaterial(t){t.defines=t.defines||{},t.defines.USE_CSM=1,t.defines.CSM_CASCADES=this.cascades,this.fade&&(t.defines.CSM_FADE="");const e=[],n=this,s=this.shaders;t.onBeforeCompile=function(r){const o=Math.min(n.camera.far,n.maxFar);n.getExtendedBreaks(e),r.uniforms.CSM_cascades={value:e},r.uniforms.cameraNear={value:n.camera.near},r.uniforms.shadowFar={value:o},s.set(t,r)},s.set(t,null)}updateUniforms(){const t=Math.min(this.camera.far,this.maxFar);this.shaders.forEach(function(n,s){if(n!==null){const r=n.uniforms;this.getExtendedBreaks(r.CSM_cascades.value),r.cameraNear.value=this.camera.near,r.shadowFar.value=t}!this.fade&&"CSM_FADE"in s.defines?(delete s.defines.CSM_FADE,s.needsUpdate=!0):this.fade&&!("CSM_FADE"in s.defines)&&(s.defines.CSM_FADE="",s.needsUpdate=!0)},this)}getExtendedBreaks(t){for(;t.length<this.breaks.length;)t.push(new wt);t.length=this.breaks.length;for(let e=0;e<this.cascades;e++){const n=this.breaks[e],s=this.breaks[e-1]||0;t[e].x=s,t[e].y=n}}updateFrustums(){this.getBreaks(),this.initCascades(),this.updateShadowBounds(),this.updateUniforms()}remove(){for(let t=0;t<this.lights.length;t++)this.parent.remove(this.lights[t].target),this.parent.remove(this.lights[t])}dispose(){const t=this.shaders;t.forEach(function(e,n){delete n.onBeforeCompile,delete n.defines.USE_CSM,delete n.defines.CSM_CASCADES,delete n.defines.CSM_FADE,e!==null&&(delete e.uniforms.CSM_cascades,delete e.uniforms.cameraNear,delete e.uniforms.shadowFar),n.needsUpdate=!0}),t.clear()}}const Tn=new Uint8Array(512);{const i=new Uint8Array(256);for(let e=0;e<256;e++)i[e]=e;let t=625341585;for(let e=255;e>0;e--){t^=t<<13,t>>>=0,t^=t>>>17,t^=t<<5,t>>>=0;const n=t%(e+1),s=i[e];i[e]=i[n],i[n]=s}for(let e=0;e<512;e++)Tn[e]=i[e&255]}const Rc=[1,1,-1,1,1,-1,-1,-1,1,0,-1,0,0,1,0,-1];function Pc(i){return i*i*i*(i*(i*6-15)+10)}function me(i,t){const e=Math.floor(i),n=Math.floor(t),s=i-e,r=t-n,o=e&255,a=n&255,c=Pc(s),l=Pc(r),h=(p,y,_)=>{const x=(p&7)*2;return Rc[x]*y+Rc[x+1]*_},d=Tn[Tn[o]+a],u=Tn[Tn[o]+a+1],f=Tn[Tn[o+1]+a],g=Tn[Tn[o+1]+a+1],v=h(d,s,r)+c*(h(f,s-1,r)-h(d,s,r)),m=h(u,s,r-1)+c*(h(g,s-1,r-1)-h(u,s,r-1));return(v+l*(m-v))*1.41}function ke(i,t,e=5,n=2,s=.5){let r=.5,o=1,a=0,c=0;for(let l=0;l<e;l++)a+=r*me(i*o+l*17.13,t*o-l*9.71),c+=r,r*=s,o*=n;return a/c}function Vs(i,t,e=4){let n=.5,s=1,r=0;for(let o=0;o<e;o++){const a=1-Math.abs(me(i*s+o*3.3,t*s+o*7.7));r+=a*a*n,n*=.5,s*=2.1}return r}function Qt(i,t,e){const n=Math.min(1,Math.max(0,(e-i)/(t-i)));return n*n*(3-2*n)}function Kt(i,t,e){return i<t?t:i>e?e:i}function ee(i,t,e){return i+(t-i)*e}function Gs(i,t,e){const n=Kt(.5+.5*(t-i)/e,0,1);return ee(t,i,n)-e*n*(1-n)}const Gn=[{el:-18,sun:[.5,.6,.85],sunI:.12,zen:[.006,.01,.024],hor:[.018,.024,.042],haze:[.014,.018,.03],sunHaze:[.02,.022,.03],amb:.12},{el:-8,sun:[.5,.6,.85],sunI:.12,zen:[.006,.011,.028],hor:[.035,.035,.065],haze:[.024,.026,.045],sunHaze:[.06,.03,.03],amb:.14},{el:-2,sun:[.9,.35,.15],sunI:.06,zen:[.02,.04,.11],hor:[.42,.22,.2],haze:[.22,.16,.2],sunHaze:[.9,.35,.18],amb:.25},{el:4,sun:[1,.5,.22],sunI:.437,zen:[.08,.17,.42],hor:[.9,.5,.35],haze:[.55,.42,.42],sunHaze:[1,.55,.3],amb:.5},{el:14,sun:[1,.74,.46],sunI:.75,zen:[.1,.24,.62],hor:[.8,.66,.58],haze:[.58,.56,.6],sunHaze:[1,.75,.5],amb:.75},{el:30,sun:[1,.94,.84],sunI:.938,zen:[.06,.2,.58],hor:[.5,.66,.86],haze:[.5,.64,.84],sunHaze:[.95,.9,.82],amb:.95},{el:90,sun:[1,.97,.93],sunI:1,zen:[.05,.18,.56],hor:[.48,.65,.86],haze:[.48,.63,.84],sunHaze:[.9,.9,.88],amb:1}];function wm(i){let t=Gn[0],e=Gn[Gn.length-1];for(let r=0;r<Gn.length-1;r++)if(i>=Gn[r].el&&i<=Gn[r+1].el){t=Gn[r],e=Gn[r+1];break}const n=Qt(t.el,e.el,Kt(i,t.el,e.el)),s=(r,o)=>[ee(r[0],o[0],n),ee(r[1],o[1],n),ee(r[2],o[2],n)];return{el:i,sun:s(t.sun,e.sun),sunI:ee(t.sunI,e.sunI,n),zen:s(t.zen,e.zen),hor:s(t.hor,e.hor),haze:s(t.haze,e.haze),sunHaze:s(t.sunHaze,e.sunHaze),amb:ee(t.amb,e.amb,n)}}const Lc={clear:{coverage:.2,hazeDensity:15e-6,hazeHeight:1400,windSpeed:5,turbulence:.25,cloudBase:1500,cloudTop:2500,rain:0,sunDim:1},scattered:{coverage:.36,hazeDensity:19e-6,hazeHeight:1300,windSpeed:7,turbulence:.4,cloudBase:1200,cloudTop:2900,rain:0,sunDim:.97},cloudy:{coverage:.66,hazeDensity:32e-6,hazeHeight:1100,windSpeed:10,turbulence:.7,cloudBase:900,cloudTop:2600,rain:0,sunDim:.72},storm:{coverage:.92,hazeDensity:55e-6,hazeHeight:900,windSpeed:15,turbulence:1,cloudBase:700,cloudTop:2600,rain:1,sunDim:.4}};function Sm(i){const t=25.8*Math.PI/180,e=10*Math.PI/180,n=(i-12)*15*Math.PI/180,s=Math.sin(t)*Math.sin(e)+Math.cos(t)*Math.cos(e)*Math.cos(n),r=Math.asin(Kt(s,-1,1)),o=(Math.sin(e)-Math.sin(r)*Math.sin(t))/(Math.cos(r)*Math.cos(t)||1e-6);let a=Math.acos(Kt(o,-1,1));return n>0&&(a=2*Math.PI-a),{dir:new A(Math.cos(r)*Math.sin(a),Math.sin(r),-Math.cos(r)*Math.cos(a)).normalize(),elevation:r*180/Math.PI,azimuth:a*180/Math.PI}}class bm{hour=14.5;weather="clear";preset=Lc.clear;state={sunDir:new A(0,1,0),sunElevation:60,sunColor:new Et,sunIntensity:3,zenith:new Et,horizon:new Et,haze:new Et,sunHaze:new Et,ambientIntensity:1,night:0};uniforms={uSunDir:{value:new A(0,1,0)},uSunColor:{value:new Et(1,1,1)},uZenithColor:{value:new Et},uHorizonColor:{value:new Et},uHazeColor:{value:new Et},uSunHazeColor:{value:new Et},uHazeDensity:{value:3e-5},uHazeHeight:{value:1300},uCloudCoverage:{value:.3},uCloudBase:{value:1500},uCloudTop:{value:2600},uCloudWind:{value:new wt(0,0)},uCloudSeed:{value:0},uNight:{value:0},uTime:{value:0}};cloudOffset=new wt;windDir=new wt(1,.35).normalize();time=0;constructor(t){this.uniforms.uCloudSeed.value=t%1e3/1e3*37.7}setWeather(t){this.weather=t,this.preset=Lc[t]}update(t){this.time+=t;const e=this.preset;this.cloudOffset.addScaledVector(this.windDir,e.windSpeed*2.2*t);const{dir:n,elevation:s}=Sm(this.hour),r=wm(s),o=this.state,a=new A(-n.x,Math.max(.25,-n.y*.8+.3),-n.z).normalize(),c=Qt(0,-4,s);o.sunDir.copy(n).lerp(a,c).normalize(),o.sunElevation=s,o.sunColor.setRGB(r.sun[0],r.sun[1],r.sun[2]),o.sunIntensity=r.sunI*e.sunDim,o.zenith.setRGB(r.zen[0],r.zen[1],r.zen[2]),o.horizon.setRGB(r.hor[0],r.hor[1],r.hor[2]),o.haze.setRGB(r.haze[0],r.haze[1],r.haze[2]),o.sunHaze.setRGB(r.sunHaze[0],r.sunHaze[1],r.sunHaze[2]),o.ambientIntensity=r.amb*ee(1,.75,e.coverage),o.night=1-Qt(-12,-1,s);const l=Qt(.45,.95,e.coverage),h=o.zenith.clone().lerp(o.horizon,l*.6).multiplyScalar(ee(1,.7,l)),d=o.horizon.clone().multiplyScalar(ee(1,.8,l)),u=this.uniforms;u.uSunDir.value.copy(n),u.uSunColor.value.copy(o.sunColor).multiplyScalar(o.sunIntensity),u.uZenithColor.value.copy(h),u.uHorizonColor.value.copy(d),u.uHazeColor.value.copy(o.haze).multiplyScalar(ee(1,.85,l)),u.uSunHazeColor.value.copy(o.sunHaze).multiplyScalar(ee(1,.6,l)),u.uHazeDensity.value=e.hazeDensity,u.uHazeHeight.value=e.hazeHeight,u.uCloudCoverage.value=e.coverage,u.uCloudBase.value=e.cloudBase,u.uCloudTop.value=e.cloudTop,u.uCloudWind.value.copy(this.cloudOffset),u.uNight.value=o.night,u.uTime.value=this.time}}function Dc(i){let t=2166136261;for(let e=0;e<i.length;e++)t^=i.charCodeAt(e),t=Math.imul(t,16777619)>>>0;return t>>>0}function Kr(i,t,e=0){let n=(i|0)*374761393+(t|0)*668265263+(e|0)*2147483647;return n=(n^n>>>13)*1274126177,n=n^n>>>16,(n>>>0)/4294967296}class dn{a;b;c;d;constructor(t){const e=typeof t=="string"?Dc(t):t>>>0;this.a=e^2654435769,this.b=e*2246822507>>>0,this.c=e*3266489909>>>0,this.d=1;for(let n=0;n<12;n++)this.next()}next(){this.a>>>=0,this.b>>>=0,this.c>>>=0,this.d>>>=0;let t=this.a+this.b|0;return this.a=this.b^this.b>>>9,this.b=this.c+(this.c<<3)|0,this.c=this.c<<21|this.c>>>11,this.d=this.d+1|0,t=t+this.d|0,this.c=this.c+t|0,(t>>>0)/4294967296}range(t,e){return t+(e-t)*this.next()}int(t,e){return t+Math.floor(this.next()*(e-t+1))}pick(t){return t[Math.floor(this.next()*t.length)]}chance(t){return this.next()<t}gauss(){return(this.next()+this.next()+this.next()+this.next()-2)*1.7320508}fork(t){return new dn(Dc(t)^Math.floor(this.next()*4294967295))}}const Hi=2e4,jt=2048,Ws=Hi/jt,bi=Hi/2;var xe=(i=>(i[i.OCEAN=0]="OCEAN",i[i.BAY=1]="BAY",i[i.BEACH=2]="BEACH",i[i.MANGROVE=3]="MANGROVE",i[i.PARK=4]="PARK",i[i.RES_LOW=5]="RES_LOW",i[i.RES_MID=6]="RES_MID",i[i.DOWNTOWN=7]="DOWNTOWN",i[i.HOTEL=8]="HOTEL",i[i.INDUSTRIAL=9]="INDUSTRIAL",i[i.AIRPORT=10]="AIRPORT",i[i.GOLF=11]="GOLF",i[i.ROCK=12]="ROCK",i[i.LOT=13]="LOT",i[i.CONSTRUCTION=14]="CONSTRUCTION",i[i.STADIUM=15]="STADIUM",i[i.MARINA=16]="MARINA",i[i.SANDBAR=17]="SANDBAR",i[i.ROAD=18]="ROAD",i[i.WETLAND_FLAT=19]="WETLAND_FLAT",i))(xe||{});function Em(i){let t=1/0,e=-1/0,n=1/0,s=-1/0;for(const[a,c]of i.pts)t=Math.min(t,a),e=Math.max(e,a),n=Math.min(n,c),s=Math.max(s,c);const r=(t+e)/2,o=(n+s)/2;return{...i,bx:r,bz:o,br:Math.max(e-t,s-n)/2+i.width+80}}function rr(i,t,e,n,s,r,o,a=0){const c=Math.cos(-o),l=Math.sin(-o),h=i-e,d=t-n,u=h*c-d*l,f=h*l+d*c,g=Math.abs(u)-s+a,v=Math.abs(f)-r+a,m=Math.max(g,0),p=Math.max(v,0);return Math.hypot(m,p)+Math.min(Math.max(g,v),0)-a}function We(i,t,e,n,s,r,o,a,c=.18){const l=Math.cos(-o),h=Math.sin(-o),d=i-e,u=t-n,f=d*l-u*h,g=d*h+u*l,v=Math.atan2(g/r,f/s),m=ke(Math.cos(v)*1.7+a*13.1,Math.sin(v)*1.7+a*7.3,4),p=me(Math.cos(v)*4.1+a,Math.sin(v)*4.1-a),y=1+c*m+c*.35*p;return(Math.hypot(f/(s*y),g/(r*y))-1)*Math.min(s,r)*y}function wl(i,t,e,n,s,r){const o=s-e,a=r-n,c=i-e,l=t-n,h=Kt((c*o+l*a)/(o*o+a*a||1),0,1);return Math.hypot(c-o*h,l-a*h)}function Tm(i,t,e){let n=1/0;for(let s=0;s<e.length-1;s++)n=Math.min(n,wl(i,t,e[s][0],e[s][1],e[s+1][0],e[s+1][1]));return n}function Ic(i,t,e,n){let s=1/0;for(let r=0;r<e.length-1;r++){const[o,a]=e[r],[c,l]=e[r+1],h=c-o,d=l-a,u=i-o,f=t-a,g=Kt((u*h+f*d)/(h*h+d*d||1),0,1),v=Math.hypot(u-h*g,f-d*g)-ee(n[r],n[r+1],g);s=Math.min(s,v)}return s}function Am(i){let t=-2500+320*ke(i/3400+3.1,.37,3)+110*ke(i/800+9.2,1.1,3);return t+=520*Math.exp(-(((i+3800)/900)**2)),t+=220*Math.exp(-(((i+2500)/500)**2)),t-=250*Qt(1200,2400,i)*(1-Qt(3200,4200,i)),t}const Cm=[[-2100,-3050],[-2900,-2900],[-3700,-2650],[-4600,-2150],[-5500,-1500],[-6500,-700]],Rm=[95,80,62,50,40,32];function Pm(){const i=[];i.push({id:"mainland",bx:-6e3,bz:0,br:2e4,sd:(r,o)=>{let a=r-Am(o);const c=Ic(r,o,Cm,Rm);return a=Math.max(a,-c),a},beach:40,height:3.2,seabed:.02,shelf:3.2});const t=[[2750,-8200],[2700,-6800],[2640,-5400],[2600,-4e3],[2520,-2600],[2400,-1500],[2250,-900],[2050,-500]],e=[280,420,460,430,380,330,240,90];i.push({id:"barrier",bx:2500,bz:-4200,br:5200,sd:(r,o)=>{const a=Ic(r,o,t,e),c=60*ke(r/700+1.2,o/700+4.4,3);return a+c},beach:62,height:2.6,seabed:.012,shelf:6}),i.push({id:"garza",bx:300,bz:2400,br:1500,sd:(r,o)=>{let a=We(r,o,300,2400,780,360,.08,11,.16);a=Gs(a,We(r,o,-350,2520,320,210,-.2,12,.22),120),a=Gs(a,We(r,o,980,2330,300,230,.3,13,.25),140);const c=We(r,o,470,2380,150,95,.4,14,.3);return a=Math.max(a,-c+15),a},beach:70,height:2.4,seabed:.01,shelf:3.5}),i.push({id:"isla-b",bx:-1350,bz:2560,br:800,sd:(r,o)=>We(r,o,-1350,2560,420,260,.05,21,.2),beach:50,height:2.3,seabed:.012,shelf:3.5}),i.push({id:"southkey",bx:1900,bz:5700,br:3200,sd:(r,o)=>{let a=We(r,o,1900,5700,1500,1050,.25,31,.14);return a=Gs(a,We(r,o,1e3,6400,700,500,-.3,32,.24),300),a=Gs(a,We(r,o,2900,4900,500,700,.5,33,.18),260),a},beach:80,height:2.8,seabed:.014,shelf:6,rocky:!0}),i.push({id:"tortuga",bx:1180,bz:-830,br:900,sd:(r,o)=>We(r,o,1180,-830,520,300,.35,51,.2),beach:55,height:2.3,seabed:.012,shelf:3.5}),i.push({id:"port",bx:-1150,bz:-3050,br:1300,sd:(r,o)=>rr(r,o,-1150,-3050,950,300,.04,30),beach:0,height:3,seabed:.06,shelf:6}),i.push({id:"isla-n1",bx:-450,bz:-3900,br:700,sd:(r,o)=>We(r,o,-450,-3900,330,200,.1,41,.2),beach:45,height:2.3,seabed:.012,shelf:3.5}),i.push({id:"isla-n2",bx:700,bz:-4e3,br:750,sd:(r,o)=>We(r,o,700,-4e3,360,210,-.15,42,.2),beach:45,height:2.3,seabed:.012,shelf:3.5}),i.push({id:"isla-n3",bx:1550,bz:-4100,br:600,sd:(r,o)=>We(r,o,1550,-4100,260,170,.2,43,.22),beach:45,height:2.3,seabed:.012,shelf:3.5});for(let r=0;r<5;r++){const o=-3e3+r*330;i.push({id:`finger-${r}`,bx:1870-r*25,bz:o,br:520,sd:(a,c)=>rr(a,c,1870-r*25,o,300,95,.02,40),beach:25,height:2.4,seabed:.05,shelf:3.5})}const n=new dn("mangrove-islets"),s=[[-1700,-1800,900,600,9],[-1500,1300,800,500,8],[-500,-6200,1800,900,12],[900,-6600,1200,700,8],[700,4300,700,450,6],[-1e3,4600,1100,600,7]];for(const[r,o,a,c,l]of s)for(let h=0;h<l;h++){const d=r+n.gauss()*a*.45,u=o+n.gauss()*c*.45,f=n.range(70,240),g=n.range(60,180),v=n.range(0,Math.PI),m=n.int(100,900);i.push({id:`mang-${r}-${h}`,bx:d,bz:u,br:Math.max(f,g)*1.6+60,sd:(p,y)=>We(p,y,d,u,f,g,v,m,.35),beach:0,height:.55,seabed:.004,shelf:1.6,wet:!0})}return i}function Lm(){const i=[],t=e=>i.push(e);return t({id:"downtown",zone:7,cx:-2650,cz:-3900,hw:750,hh:620,rot:.02,gridX:130,gridZ:110,density:.92,hMin:40,hMax:260}),t({id:"brickell",zone:6,cx:-2900,cz:-2350,hw:550,hh:420,rot:.02,gridX:120,gridZ:120,density:.85,hMin:25,hMax:120}),t({id:"midtown",zone:6,cx:-3500,cz:-5300,hw:900,hh:700,rot:0,gridX:120,gridZ:140,density:.8,hMin:12,hMax:60}),t({id:"north-res",zone:5,cx:-5600,cz:-5400,hw:2100,hh:1800,rot:0,gridX:95,gridZ:140,density:.75,hMin:4,hMax:11}),t({id:"west-res",zone:5,cx:-5300,cz:-2700,hw:1500,hh:1150,rot:0,gridX:100,gridZ:130,density:.75,hMin:4,hMax:12}),t({id:"south-res",zone:5,cx:-4200,cz:1300,hw:1700,hh:1500,rot:0,gridX:105,gridZ:135,density:.7,hMin:4,hMax:10}),t({id:"far-west-res",zone:5,cx:-8600,cz:-4200,hw:1300,hh:3e3,rot:0,gridX:100,gridZ:140,density:.65,hMin:4,hMax:10}),t({id:"far-south-res",zone:5,cx:-7200,cz:4300,hw:2600,hh:1400,rot:0,gridX:105,gridZ:140,density:.6,hMin:4,hMax:10}),t({id:"south-shore-res",zone:5,cx:-3900,cz:3900,hw:1400,hh:900,rot:0,gridX:105,gridZ:135,density:.6,hMin:4,hMax:10}),t({id:"far-south-res-2",zone:5,cx:-4800,cz:6500,hw:2e3,hh:1200,rot:0,gridX:110,gridZ:140,density:.5,hMin:4,hMax:9}),t({id:"north-res-2",zone:5,cx:-4800,cz:-8e3,hw:2400,hh:800,rot:0,gridX:100,gridZ:140,density:.55,hMin:4,hMax:10}),t({id:"south-bayfront",zone:6,cx:-3e3,cz:-900,hw:480,hh:650,rot:0,gridX:120,gridZ:130,density:.6,hMin:8,hMax:35}),t({id:"industrial-river",zone:9,cx:-3300,cz:-3050,hw:700,hh:380,rot:-.1,gridX:170,gridZ:160,density:.6,hMin:6,hMax:16}),t({id:"industrial-port",zone:9,cx:-1150,cz:-3050,hw:950,hh:300,rot:.04,gridX:0,gridZ:0,density:.5,hMin:6,hMax:14}),t({id:"hotel-south",zone:8,cx:2330,cz:-1500,hw:330,hh:1250,rot:-.12,gridX:130,gridZ:110,density:.85,hMin:20,hMax:110}),t({id:"hotel-mid",zone:8,cx:2600,cz:-3800,hw:300,hh:1300,rot:-.03,gridX:130,gridZ:105,density:.85,hMin:25,hMax:130}),t({id:"barrier-res",zone:5,cx:2650,cz:-6900,hw:350,hh:1200,rot:0,gridX:90,gridZ:110,density:.7,hMin:4,hMax:12}),t({id:"barrier-golf",zone:11,cx:2680,cz:-5300,hw:420,hh:520,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"garza-res",zone:5,cx:-120,cz:2420,hw:260,hh:180,rot:.08,gridX:110,gridZ:120,density:.5,hMin:4,hMax:9}),t({id:"garza-park",zone:4,cx:1e3,cz:2330,hw:300,hh:240,rot:.3,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"southkey-res",zone:5,cx:2200,cz:5300,hw:700,hh:500,rot:.25,gridX:100,gridZ:120,density:.6,hMin:4,hMax:10}),t({id:"southkey-golf",zone:11,cx:1300,cz:6300,hw:550,hh:420,rot:-.3,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"airport",zone:10,cx:-7100,cz:-1400,hw:1600,hh:900,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"airstrip",zone:10,cx:2500,cz:5750,hw:700,hh:130,rot:.55,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"stadium-lot",zone:13,cx:-2900,cz:-2e3,hw:330,hh:260,rot:0,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"bayfront-park",zone:4,cx:-2050,cz:-4300,hw:170,hh:380,rot:.02,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"finger-res",zone:5,cx:1820,cz:-2340,hw:330,hh:760,rot:.02,gridX:0,gridZ:0,density:.7,hMin:4,hMax:9}),t({id:"tortuga-res",zone:5,cx:1180,cz:-830,hw:420,hh:230,rot:.35,gridX:100,gridZ:110,density:.55,hMin:4,hMax:10}),t({id:"isla-b-res",zone:5,cx:-1350,cz:2560,hw:330,hh:190,rot:.05,gridX:100,gridZ:100,density:.5,hMin:4,hMax:9}),t({id:"isla-n-res",zone:5,cx:700,cz:-4e3,hw:300,hh:160,rot:-.15,gridX:100,gridZ:100,density:.5,hMin:4,hMax:9}),t({id:"isla-n1-res",zone:5,cx:-450,cz:-3900,hw:270,hh:150,rot:.1,gridX:100,gridZ:100,density:.5,hMin:4,hMax:9}),t({id:"construction-dt",zone:14,cx:-2250,cz:-4250,hw:70,hh:60,rot:.02,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"construction-dt2",zone:14,cx:-3150,cz:-3550,hw:65,hh:55,rot:.02,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),t({id:"construction-hotel",zone:14,cx:2480,cz:-2450,hw:60,hh:60,rot:-.1,gridX:0,gridZ:0,density:0,hMin:0,hMax:0}),i}function Dm(){const i=[];return i.push({id:"south-hwy-mainland",cls:"highway",width:22,lanes:4,traffic:14,pts:[[-6e3,2650],[-4500,2700],[-3400,2720],[-2500,2680]]}),i.push({id:"garza-hwy",cls:"highway",width:22,lanes:4,traffic:14,pts:[[-1650,2590],[-1050,2540],[-620,2520]]}),i.push({id:"garza-hwy-2",cls:"highway",width:22,lanes:4,traffic:14,pts:[[-420,2500],[-200,2350],[-40,2060]]}),i.push({id:"garza-east",cls:"arterial",width:14,lanes:2,traffic:5,pts:[[-200,2350],[200,2470],[600,2420],[1e3,2200]]}),i.push({id:"tortuga-rd",cls:"highway",width:22,lanes:4,traffic:12,pts:[[980,-400],[1200,-720],[1480,-1050]]}),i.push({id:"dt-bayshore",cls:"arterial",width:16,lanes:4,traffic:10,pts:[[-2200,-4600],[-2150,-4200],[-2100,-3700],[-2200,-3300],[-2500,-2900],[-2650,-2400],[-2700,-1800],[-2650,-1200]]}),i.push({id:"dt-avenue",cls:"arterial",width:16,lanes:4,traffic:9,pts:[[-3400,-6e3],[-3400,-4600],[-3350,-3500],[-3300,-2600],[-3350,-1500],[-3400,0],[-3400,1600],[-3400,2700]]}),i.push({id:"west-arterial",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-6800,-7e3],[-6800,-4e3],[-6800,-300],[-6900,1500],[-6900,2650]]}),i.push({id:"north-arterial",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-8500,-5300],[-6800,-5300],[-4400,-5300],[-3400,-5300]]}),i.push({id:"airport-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[-6800,-300],[-6500,-400],[-6200,-500],[-5700,-420]]}),i.push({id:"mid-arterial",cls:"arterial",width:15,lanes:4,traffic:7,pts:[[-8500,-300],[-6800,-300],[-5500,-300],[-4400,-320],[-3400,-300]]}),i.push({id:"south-arterial",cls:"arterial",width:15,lanes:4,traffic:6,pts:[[-8500,1200],[-6900,1200],[-5e3,1250],[-3400,1300]]}),i.push({id:"barrier-spine",cls:"arterial",width:16,lanes:4,traffic:10,pts:[[2720,-8e3],[2680,-6600],[2620,-5200],[2600,-4e3],[2520,-2600],[2400,-1500],[2260,-800],[2050,-420]]}),i.push({id:"barrier-beach-rd",cls:"street",width:10,lanes:2,traffic:4,pts:[[2900,-6500],[2880,-5200],[2850,-4e3],[2790,-2700],[2650,-1500],[2480,-900]]}),i.push({id:"southkey-rd",cls:"arterial",width:14,lanes:2,traffic:5,pts:[[1400,4550],[1600,5e3],[1900,5400],[2300,5700],[2700,6100],[3e3,6500]]}),i.push({id:"southkey-rd-2",cls:"street",width:10,lanes:2,traffic:3,pts:[[1900,5400],[1500,5900],[1100,6400]]}),i.push({id:"isla-n-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[-780,-3880],[-450,-3880],[-130,-3900]]}),i.push({id:"isla-n2-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[360,-3980],[700,-3990],[1050,-4030]]}),i.push({id:"isla-n3-rd",cls:"arterial",width:14,lanes:2,traffic:6,pts:[[1300,-4080],[1550,-4100],[1800,-4120]]}),i.push({id:"port-rd",cls:"arterial",width:14,lanes:2,traffic:5,pts:[[-2050,-3050],[-1600,-3050],[-1150,-3050],[-700,-3060],[-260,-3070]]}),i}function Im(){const i=[];return i.push({id:"garza-bridge",pts:[[-40,2060],[330,1250],[700,300],[980,-400]],width:22,deck:7,archHeight:24,archT:.55,archLength:520,lanes:4,traffic:12}),i.push({id:"tortuga-bridge",pts:[[1480,-1050],[1800,-600],[2050,-500]],width:22,deck:7,archHeight:18,archT:.45,archLength:380,lanes:4,traffic:12}),i.push({id:"garza-west",pts:[[-620,2520],[-420,2500]],width:22,deck:6,archHeight:0,archT:.5,archLength:0,lanes:4,traffic:14}),i.push({id:"islab-west",pts:[[-2500,2680],[-2100,2650],[-1650,2590]],width:22,deck:7,archHeight:18,archT:.45,archLength:360,lanes:4,traffic:14}),i.push({id:"southkey-bridge",pts:[[1e3,2200],[1150,3e3],[1300,3800],[1400,4550]],width:16,deck:8,archHeight:22,archT:.35,archLength:420,lanes:2,traffic:5}),i.push({id:"north-cw-1",pts:[[-2100,-3700],[-1500,-3780],[-780,-3880]],width:24,deck:8,archHeight:26,archT:.4,archLength:480,lanes:6,traffic:14}),i.push({id:"north-cw-2",pts:[[-130,-3900],[360,-3980]],width:24,deck:8,archHeight:0,archT:.5,archLength:0,lanes:6,traffic:14}),i.push({id:"north-cw-3",pts:[[1050,-4030],[1300,-4080]],width:24,deck:8,archHeight:0,archT:.5,archLength:0,lanes:6,traffic:14}),i.push({id:"north-cw-4",pts:[[1800,-4120],[2200,-4080],[2600,-4e3]],width:24,deck:8,archHeight:20,archT:.5,archLength:380,lanes:6,traffic:14}),i.push({id:"far-north-cw",pts:[[-2300,-6700],[-1e3,-6750],[500,-6800],[1800,-6850],[2650,-6900]],width:18,deck:7,archHeight:16,archT:.55,archLength:360,lanes:4,traffic:7}),i.push({id:"port-bridge",pts:[[-2200,-3300],[-2050,-3050]],width:14,deck:6,archHeight:0,archT:.5,archLength:0,lanes:2,traffic:5}),i}function Um(){return[{id:"dt-marina",x:-2e3,z:-4150,rot:Math.PI*.5,piers:7,pierLen:110},{id:"garza-marina",x:420,z:2035,rot:0,piers:5,pierLen:90},{id:"barrier-marina",x:2080,z:-1400,rot:Math.PI*.5,piers:6,pierLen:100},{id:"south-marina",x:-2350,z:2950,rot:Math.PI,piers:4,pierLen:80},{id:"southkey-marina",x:1200,z:5150,rot:-.9,piers:4,pierLen:80},{id:"north-marina",x:-2050,z:-5600,rot:Math.PI*.5,piers:5,pierLen:90}]}function Nm(){return[{id:"rwy-09",a:[-8450,-1350],b:[-5750,-1350],width:50},{id:"rwy-13",a:[-7900,-2150],b:[-6250,-700],width:42},{id:"strip-southkey",a:[1950,5450],b:[3100,6100],width:24}]}function zm(){return[{id:"ship-channel",pts:[[4200,2200],[3e3,1600],[2e3,600],[1e3,-1200],[200,-2600],[-450,-3350]],width:180,depth:14,boats:3,speed:5},{id:"intracoastal",pts:[[1800,-7600],[1900,-6200],[1950,-4500],[2e3,-3200],[1950,-1800],[1850,-800],[1700,200]],width:110,depth:6,boats:8,speed:9},{id:"garza-channel",pts:[[-1e3,3300],[200,3250],[1e3,3100],[1900,2400],[2600,1400],[3400,400]],width:90,depth:7,boats:9,speed:12},{id:"arch-channel",pts:[[-1200,1200],[-300,1e3],[500,750],[1400,300],[2400,-100]],width:100,depth:8,boats:6,speed:11},{id:"ref-boats",pts:[[-500,3650],[200,3450],[900,3150],[1600,2750]],width:40,depth:4,boats:3,speed:15},{id:"flats-route",pts:[[-2100,3400],[-1200,3500],[-300,3600],[700,3700],[1500,4100]],width:40,depth:3,boats:5,speed:10},{id:"bay-route",pts:[[-1900,-4300],[-1200,-2500],[-600,-600],[0,1200],[500,1900]],width:60,depth:4,boats:7,speed:9},{id:"north-route",pts:[[-1800,-5900],[-800,-5200],[200,-4600],[1200,-4600],[1900,-5200]],width:60,depth:4,boats:5,speed:8},{id:"ocean-route",pts:[[3800,-8e3],[3700,-5e3],[3600,-2e3],[3700,1e3],[3900,4e3],[4100,7e3]],width:300,depth:25,boats:4,speed:6}].map(Em)}function Fm(){return[{id:"stadium",kind:"stadium",x:-2900,z:-2450,rot:.15,size:150},{id:"lighthouse",kind:"lighthouse",x:3250,z:5300,rot:0,size:30},{id:"terminal",kind:"terminal",x:-7100,z:-1900,rot:0,size:220},{id:"hangars",kind:"hangars",x:-6300,z:-2e3,rot:0,size:120},{id:"cranes-port",kind:"cranes",x:-1150,z:-3330,rot:0,size:1600},{id:"cruise",kind:"cruise",x:-900,z:-2780,rot:0,size:300},{id:"tanks",kind:"tanks",x:-3600,z:-3100,rot:0,size:160},{id:"seaplane-base",kind:"seaplane",x:-2050,z:-4700,rot:Math.PI*.5,size:60}]}class Om{n=jt;height=new Float32Array(jt*jt);zone=new Uint8Array(jt*jt);veg=new Uint8Array(jt*jt);coast=new Float32Array(jt*jt);districts=Lm();roads=Dm();bridges=Im();marinas=Um();runways=Nm();channels=zm();pois=Fm();landmasses=Pm();toCell(t,e){return[(t+bi)/Hi*jt,(e+bi)/Hi*jt]}heightAt(t,e){const[n,s]=this.toCell(t,e),r=Kt(Math.floor(n),0,jt-2),o=Kt(Math.floor(s),0,jt-2),a=Kt(n-r,0,1),c=Kt(s-o,0,1),l=this.height,h=l[o*jt+r],d=l[o*jt+r+1],u=l[(o+1)*jt+r],f=l[(o+1)*jt+r+1];return ee(ee(h,d,a),ee(u,f,a),c)}zoneAt(t,e){const[n,s]=this.toCell(t,e),r=Kt(Math.round(n),0,jt-1),o=Kt(Math.round(s),0,jt-1);return this.zone[o*jt+r]}coastAt(t,e){const[n,s]=this.toCell(t,e),r=Kt(Math.round(n),0,jt-1),o=Kt(Math.round(s),0,jt-1);return this.coast[o*jt+r]}isLand(t,e){return this.heightAt(t,e)>.05}districtAt(t,e){for(const n of this.districts)if(rr(t,e,n.cx,n.cz,n.hw,n.hh,n.rot)<0)return n;return null}regionalDepth(t,e){let n=3+2.6*(.5+.5*ke(t/1100,e/1100,3))+1.2*ke(t/350+4,e/350,2);const s=3050+320*ke(e/4e3,.5,2)+110*ke(e/800+3.1,2.2,3),r=t-s;r>0&&(n+=r*.006+5*Qt(200,1500,r)+15*Qt(1500,4500,r)+1.5*Vs(t/600+1,e/260,3)*Qt(0,900,r));const o=Qt(-400,1400,t+300*ke(e/1200,3.3,2))*(1-Qt(.4,1.4,Math.hypot((t-2600)/2600,(e-1900)/2400)));n+=4.5*o;const a=Qt(7200,9400,e+400*ke(t/3e3,1.7,2));n+=18*a;const c=Qt(8300,9800,-e+400*ke(t/3e3,5.1,2));n+=10*c;const l=Vs(t/900+2,e/380+1,3);return n-=1.6*l*o,n}generate(t){const e=jt,n=this.landmasses,s=512,r=e/s,o=new Float32Array(s*s),a=new Int16Array(s*s),c=new Float32Array(s*s),l=new Float32Array(s*s),h=new Float32Array(s*s),d=new Float32Array(s*s);for(let E=0;E<s;E++){const b=-bi+(E+.5)*Ws*r;for(let C=0;C<s;C++){const R=-bi+(C+.5)*Ws*r;let w=1/0,M=-1;for(let L=0;L<n.length;L++){const I=n[L];if(Math.hypot(R-I.bx,b-I.bz)-I.br>w)continue;const D=I.sd(R,b);D<w&&(w=D,M=L)}o[E*s+C]=w,a[E*s+C]=M,h[E*s+C]=n[M].seabed,d[E*s+C]=n[M].shelf,c[E*s+C]=this.regionalDepth(R,b),l[E*s+C]=ke(R/260,b/260,3)}t&&!(E&31)&&t(E/s*.35)}const u=(E,b,C,R,w)=>{const M=w*s+R;return ee(ee(E[M],E[M+1],b),ee(E[M+s],E[M+s+1],b),C)};let f=0,g=0,v=0,m=0;const p=(E,b)=>{const C=Kt(E/r-.5,0,s-1.001),R=Kt(b/r-.5,0,s-1.001),w=Math.floor(C),M=Math.floor(R),L=C-w,I=R-M;f=L,g=I,v=w,m=M;const U=u(o,L,I,w,M),D=M*s+w,N=D+1,F=D+s,G=F+1;let O=a[D],W=o[D];return o[N]<W&&(W=o[N],O=a[N]),o[F]<W&&(W=o[F],O=a[F]),o[G]<W&&(W=o[G],O=a[G]),[U,O]},y=this.channels,_=this.runways,x=this.districts;for(let E=0;E<e;E++){const b=-bi+(E+.5)*Ws;for(let C=0;C<e;C++){const R=-bi+(C+.5)*Ws,w=E*e+C;let[M,L]=p(C+.5,E+.5);const I=n[L];if(Math.abs(M)<90&&(I.beach>0||I.wet)){const G=9*me(R/60+3.3,b/60-1.7)+4*me(R/21+8.1,b/21+2.2);M+=G*(I.wet?1.8:1)}this.coast[w]=M;const U=u(l,f,g,v,m);let D,N,F=0;if(M<0){const G=-M;if(I.wet)D=.15+I.height*Qt(0,60,G)+.15*me(R/30,b/30),N=3,F=200;else if(I.beach===0)D=I.height+.2*me(R/40,b/40),N=9,F=10;else{const W=I.beach*(.55+.9*(.5+.5*me(R/240+1.7,b/240-4.1))),q=Qt(0,W,G);if(D=.25+(I.height-.25)*q+.6*U*q+.12*me(R/18,b/18),I.id==="barrier"||I.id==="southkey"){const nt=Qt(30,70,G)*(1-Qt(90,160,G));D+=2.2*nt*(.6+.4*Vs(R/140,b/140,3))}if(N=q<.45?2:5,F=q<.45?20:150,I.rocky&&q<.5){const nt=Vs(R/90+5,b/90+5,3);nt>.62&&R>2400&&(N=12,D+=1.4*(nt-.6)*4,F=0)}}let O=!1;if(D>1.4){for(const W of x)if(rr(R,b,W.cx,W.cz,W.hw,W.hh,W.rot)<0){O=!0,N=W.zone,W.zone===7?(D=Math.max(D,3.6),F=30):W.zone===11?(D+=2.5*ke(R/180,b/180,3)+1.5,F=255):W.zone===4?F=230:W.zone===10?(D=2.8+.05*me(R/50,b/50),F=120):W.zone===13||W.zone===14||W.zone===9?F=5:W.zone===8?F=60:W.zone===6?F=70:F=150;break}}for(const W of _){const q=wl(R,b,W.a[0],W.a[1],W.b[0],W.b[1]);q<W.width*.5+60&&(D=ee(D,2.9,Qt(W.width*.5+60,W.width*.5+10,q)))}N===5&&!O&&(N=4,F=200+Math.floor(40*me(R/120,b/120)))}else{const G=u(c,f,g,v,m),O=u(h,f,g,v,m),W=u(d,f,g,v,m);let q;I.wet?q=Math.min(G,.05+M*O):I.beach===0?q=Math.min(G,W+M*O):q=Math.min(G,.05+M*O);for(const ot of y){if(Math.abs(R-ot.bx)>ot.br||Math.abs(b-ot.bz)>ot.br)continue;const lt=Tm(R,b,ot.pts)-ot.width*.5;lt<60&&(q=Math.max(q,ot.depth*(1-Qt(-ot.width*.1,60,lt))+q*Qt(-ot.width*.1,60,lt)))}const nt=Math.max(1-Math.hypot((R+350)/520,(b-3250)/260),1-Math.hypot((R-2500)/700,(b-3300)/300),1-Math.hypot((R-1200)/600,(b-1500)/260));if(nt>0){const ot=Qt(0,.5,nt)*(.55+.45*ke(R/130+7,b/130-3,3));q=ee(q,-.15+.5*(1-ot),ot*.9)}q+=.08*me(R/45,b/45),D=-q,N=D>-.35?17:q>9?0:1,D>0&&(N=17),F=0}this.height[w]=D,this.zone[w]=N,this.veg[w]=Kt(F,0,255)}t&&!(E&63)&&t(.35+E/e*.65)}}}const ai=`
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
`,aa=`
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
`,ca=`
float cloudCoverage2D(vec2 wp) {
  vec2 p = (wp + uCloudWind) * 0.00016 + uCloudSeed;
  float c = fbm(p);
  float c2 = fbm(p * 3.1 + 7.7);
  float f = c * 0.78 + c2 * 0.22;
  // coverage remaps the field so that low coverage leaves discrete cumulus masses
  float thr = 0.7 - uCloudCoverage * 0.42;
  return smoothstep(thr, thr + 0.2, f);
}
/** Cloud shadow factor (1 = lit, ~0.35 = under a dense cloud) at a world position. */
float cloudShadow(vec3 wp) {
  // project along the sun direction up to the cloud base
  float k = (uCloudBase - wp.y) / max(uSunDir.y, 0.15);
  vec2 sp = wp.xz + uSunDir.xz * k;
  float c = cloudCoverage2D(sp);
  return 1.0 - 0.72 * c * smoothstep(0.0, 0.25, uSunDir.y);
}
`,la=`
vec3 skyRadiance(vec3 dir) {
  float y = clamp(dir.y, -1.0, 1.0);
  float up = max(y, 0.0);
  float horizonMix = pow(1.0 - up, 14.0);
  float midMix = pow(1.0 - up, 3.5) * 0.22;
  vec3 col = mix(uZenithColor, uHorizonColor, clamp(horizonMix + midMix, 0.0, 1.0));
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
`,Sl=`
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
`;function Bm(i=64){const t=i,e=new Uint8Array(t*t*t*4),n=(h,d,u,f)=>{let g=h*374761393+d*668265263+u*2147483647+f*1013904223|0;return g=Math.imul(g^g>>>13,1274126177),((g^g>>>16)>>>0)/4294967296},s=(h,d)=>(h%d+d)%d,r=(h,d,u,f,g)=>{const v=Math.floor(h),m=Math.floor(d),p=Math.floor(u),y=h-v,_=d-m,x=u-p,E=N=>N*N*N*(N*(N*6-15)+10),b=E(y),C=E(_),R=E(x),w=(N,F,G,O,W,q)=>{const ot=n(s(N,f),s(F,f),s(G,f),g)*6.2831853,lt=n(s(N,f),s(F,f),s(G,f),g+7)*3.1415926,V=Math.cos(ot)*Math.sin(lt),K=Math.sin(ot)*Math.sin(lt),et=Math.cos(lt);return V*O+K*W+et*q},M=(N,F,G)=>N+(F-N)*G,L=M(w(v,m,p,y,_,x),w(v+1,m,p,y-1,_,x),b),I=M(w(v,m+1,p,y,_-1,x),w(v+1,m+1,p,y-1,_-1,x),b),U=M(w(v,m,p+1,y,_,x-1),w(v+1,m,p+1,y-1,_,x-1),b),D=M(w(v,m+1,p+1,y,_-1,x-1),w(v+1,m+1,p+1,y-1,_-1,x-1),b);return M(M(L,I,C),M(U,D,C),R)},o=(h,d,u,f,g)=>{const v=Math.floor(h),m=Math.floor(d),p=Math.floor(u);let y=1e9;for(let _=-1;_<=1;_++)for(let x=-1;x<=1;x++)for(let E=-1;E<=1;E++){const b=v+E,C=m+x,R=p+_,w=b+n(s(b,f),s(C,f),s(R,f),g),M=C+n(s(b,f),s(C,f),s(R,f),g+3),L=R+n(s(b,f),s(C,f),s(R,f),g+5),I=(w-h)**2+(M-d)**2+(L-u)**2;I<y&&(y=I)}return 1-Math.min(1,Math.sqrt(y))},a=(h,d,u,f,g)=>f+(h-d)/(u-d)*(g-f);let c=0;for(let h=0;h<t;h++)for(let d=0;d<t;d++)for(let u=0;u<t;u++){const f=u/t,g=d/t,v=h/t;let m=0,p=.5,y=0;for(let R=0;R<3;R++){const w=4<<R;m+=p*r(f*w,g*w,v*w,w,11+R),y+=p,p*=.5}m=m/y*.5+.5;const _=o(f*4,g*4,v*4,4,31),x=o(f*8,g*8,v*8,8,41),E=o(f*16,g*16,v*16,16,51),b=_*.625+x*.25+E*.125,C=a(m,0,1,b,1);e[c++]=Math.round(Math.min(1,Math.max(0,C))*255),e[c++]=Math.round(Math.min(1,Math.max(0,b))*255),e[c++]=Math.round(Math.min(1,Math.max(0,x*.6+E*.4))*255),e[c++]=Math.round(Math.min(1,Math.max(0,m))*255)}const l=new rl(e,t,t,t);return l.format=$e,l.type=en,l.minFilter=ue,l.magFilter=ue,l.wrapS=l.wrapT=l.wrapR=Fi,l.unpackAlignment=1,l.needsUpdate=!0,l}const km=`
precision highp sampler3D;
${aa}
${ai}
${ca}
${la}
${Sl}
uniform sampler3D uNoise3D;
uniform vec3 uCamPos;
uniform mat4 uInvProj;
uniform mat4 uInvView;
uniform vec2 uResolution;
uniform float uCloudSteps;
uniform float uMoonPhase;
in vec2 vUv;

float cloudDensity(vec3 p, float cov) {
  float hf = (p.y - uCloudBase) / (uCloudTop - uCloudBase);
  float top = 0.45 + cov * 0.5;
  float vert = smoothstep(0.0, 0.08, hf) * (1.0 - smoothstep(top * 0.55, top, hf));
  if (vert <= 0.0) return 0.0;
  vec3 q = (p + vec3(uCloudWind.x, 0.0, uCloudWind.y)) * (1.0 / 1650.0);
  vec4 n = texture(uNoise3D, q);
  float shape = n.r;
  float d = cov * 1.35 * vert - 0.28;
  d -= (1.0 - shape) * 0.62;
  if (d <= 0.0) return 0.0;
  float detail = texture(uNoise3D, q * 4.7 + vec3(0.13, 0.31, 0.71)).g;
  d -= detail * 0.22 * (1.0 - smoothstep(0.0, 0.35, d));
  // wispier tops
  d *= 1.0 - 0.35 * smoothstep(0.6, 1.0, hf);
  return max(d, 0.0);
}

float lightMarch(vec3 p, float cov) {
  float stepLen = (uCloudTop - uCloudBase) * 0.22;
  float od = 0.0;
  for (int i = 0; i < 4; i++) {
    p += uSunDir * stepLen;
    if (p.y > uCloudTop) break;
    od += cloudDensity(p, cloudCoverage2D(p.xz)) * stepLen;
  }
  return exp(-od * 0.0075) * 0.9 + 0.1 * exp(-od * 0.0006);
}

float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / (4.0 * 3.14159 * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }

vec3 stars(vec3 dir) {
  vec3 d = dir * 220.0;
  vec3 c = floor(d);
  float h = hash12(c.xy + c.z * 17.0);
  float star = smoothstep(0.985, 1.0, h) * step(0.15, dir.y);
  vec3 f = fract(d) - 0.5;
  star *= smoothstep(0.35, 0.0, length(f));
  return vec3(star) * (0.6 + 0.4 * hash12(c.zx));
}

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 clip = vec4(ndc, 1.0, 1.0);
  vec4 vpos = uInvProj * clip;
  vpos /= vpos.w;
  vec3 dir = normalize((uInvView * vec4(vpos.xyz, 0.0)).xyz);

  vec3 sky = skyRadiance(dir);
  sky += sunDisc(dir);
  // moon (opposite the sun-ish)
  vec3 moonDir = normalize(vec3(-uSunDir.x, max(0.25, -uSunDir.y * 0.8 + 0.3), -uSunDir.z));
  float cm = dot(dir, moonDir);
  float moon = smoothstep(0.99975, 0.99992, cm) * 1.6 + pow(max(cm, 0.0), 700.0) * 0.08;
  sky += vec3(0.75, 0.8, 0.95) * moon * uNight;
  sky += stars(dir) * uNight * 0.7;

  // ---- volumetric cloud layer
  float transmittance = 1.0;
  vec3 cloudCol = vec3(0.0);
  float ro_y = uCamPos.y;
  float t0 = -1.0, t1 = -1.0;
  float tb = (uCloudBase - ro_y) / dir.y;
  float tt = (uCloudTop - ro_y) / dir.y;
  if (ro_y < uCloudBase) { if (dir.y > 0.012) { t0 = tb; t1 = tt; } }
  else if (ro_y > uCloudTop) { if (dir.y < -0.012) { t0 = tt; t1 = tb; } }
  else { t0 = 0.0; t1 = dir.y > 0.0 ? tt : tb; }
  float maxDist = 42000.0;
  float meanDist = t0;
  if (t0 >= 0.0) {
    t1 = min(t1, maxDist);
    if (t1 > t0) {
      float steps = uCloudSteps;
      float dt = (t1 - t0) / steps;
      // static per-pixel jitter (never animated => temporally stable)
      float jitter = hash12(gl_FragCoord.xy) * dt;
      float t = t0 + jitter;
      float cosSun = dot(dir, uSunDir);
      float phase = hg(cosSun, 0.5) * 0.9 + hg(cosSun, -0.2) * 0.3 + 0.12;
      vec3 ambient = mix(uHorizonColor, uZenithColor, 0.45) * 1.05;
      vec3 sunLight = uSunColor * 2.6;
      float sigma = 0.011;
      float wsum = 0.0;
      meanDist = 0.0;
      for (int i = 0; i < 40; i++) {
        if (float(i) >= steps || transmittance < 0.015) break;
        vec3 p = uCamPos + dir * t;
        float cov = cloudCoverage2D(p.xz);
        if (cov > 0.001) {
          float dens = cloudDensity(p, cov);
          if (dens > 0.001) {
            float hf = clamp((p.y - uCloudBase) / (uCloudTop - uCloudBase), 0.0, 1.0);
            float lt = lightMarch(p, cov);
            float powder = 1.0 - exp(-dens * 6.0);
            vec3 amb = ambient * mix(0.42, 1.0, hf);
            vec3 scat = sunLight * lt * phase * mix(0.5, 1.0, powder) + amb * mix(0.55, 1.0, lt);
            float a = 1.0 - exp(-dens * sigma * dt);
            cloudCol += transmittance * a * scat;
            meanDist += transmittance * a * t;
            wsum += transmittance * a;
            transmittance *= 1.0 - a;
          }
        }
        t += dt;
      }
      if (wsum > 0.0) meanDist /= wsum; else meanDist = t0;
      // aerial perspective on the cloud colour
      float alpha = 1.0 - transmittance;
      if (alpha > 0.001) {
        vec3 far = uCamPos + dir * meanDist;
        vec3 hazed = applyAerial(cloudCol / alpha, uCamPos, far);
        cloudCol = hazed * alpha;
      }
      // very distant clouds fade fully into the horizon haze
      float horizonFade = smoothstep(0.012, 0.06, dir.y);
      transmittance = mix(1.0, transmittance, horizonFade);
      cloudCol *= horizonFade;
    }
  }
  vec3 col = sky * transmittance + cloudCol;
  gl_FragColor = vec4(col, 1.0);
}
`,Hm=`
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,Vm=`
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = vec4(p.xy, p.w * 0.999999, p.w);
}
`,Gm=`
uniform sampler2D uSkyTex;
uniform vec2 uResolution;
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  gl_FragColor = vec4(texture(uSkyTex, uv).rgb, 1.0);
}
`,Wm=`
out vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`,Xm=`
${aa}
${ai}
${ca}
${la}
in vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  vec3 col = skyRadiance(dir);
  // clouds as a soft brightening band so reflections pick up overcast light
  float cov = uCloudCoverage;
  col = mix(col, mix(uHorizonColor, uZenithColor, 0.4) * 1.1, cov * 0.35 * smoothstep(0.0, 0.3, dir.y));
  vec3 sun = sunDisc(dir);
  col += min(sun, vec3(12.0));
  // sea below the horizon for reflections
  col = mix(col, uHazeColor * 0.55, smoothstep(0.0, -0.05, dir.y));
  gl_FragColor = vec4(col, 1.0);
}
`;class qm{constructor(t,e,n){this.atmos=t,this.noise=Bm(64),this.scale=n.scale,this.skyMat=new Ae({vertexShader:Hm,fragmentShader:km,uniforms:{...t.uniforms,uNoise3D:{value:this.noise},uCamPos:{value:new A},uInvProj:{value:new Xt},uInvView:{value:new Xt},uResolution:{value:new wt(1,1)},uCloudSteps:{value:n.cloudSteps},uMoonPhase:{value:.5}},depthTest:!1,depthWrite:!1}),this.quad=new zt(new Yn(2,2),this.skyMat),this.quad.frustumCulled=!1,this.quadScene.add(this.quad),this.rt=new Ze(4,4,{type:hn,depthBuffer:!1,minFilter:ue,magFilter:ue});const s=new Ae({vertexShader:Vm,fragmentShader:Gm,uniforms:{uSkyTex:{value:this.rt.texture},uResolution:{value:new wt(1,1)}},side:De,depthWrite:!1,depthTest:!0});this.dome=new zt(new Qe(1,24,12),s),this.dome.frustumCulled=!1,this.dome.renderOrder=-1e3,this.dome.isSky=!0,this.envMat=new Ae({vertexShader:Wm,fragmentShader:Xm,uniforms:{...t.uniforms},side:De,depthWrite:!1});const r=new zt(new Qe(50,32,16),this.envMat);this.envScene.add(r),this.pmrem=new Bo(e),this.pmrem.compileEquirectangularShader()}dome;skyMat;quad;quadScene=new fs;quadCam=new ps(-1,1,1,-1,0,1);rt;scale;envScene=new fs;envMat;pmrem=null;envMap=null;noise;setCloudSteps(t){this.skyMat.uniforms.uCloudSteps.value=t}updateEnvironment(){this.envMap&&this.envMap.dispose();const t=this.pmrem.fromScene(this.envScene,0,.1,200);return this.envMap=t.texture,this.envMap}render(t,e,n,s){const r=Math.max(2,Math.round(n*this.scale)),o=Math.max(2,Math.round(s*this.scale));(this.rt.width!==r||this.rt.height!==o)&&this.rt.setSize(r,o);const a=this.skyMat.uniforms;a.uCamPos.value.copy(e.position),a.uInvProj.value.copy(e.projectionMatrixInverse),a.uInvView.value.copy(e.matrixWorld),a.uResolution.value.set(r,o),this.dome.material.uniforms.uResolution.value.set(n,s);const c=t.getRenderTarget();t.setRenderTarget(this.rt),t.render(this.quadScene,this.quadCam),t.setRenderTarget(c),this.dome.position.copy(e.position),this.dome.scale.setScalar(e.far*.9)}}class Ym{height;zone;constructor(t,e){if(e.capabilities.isWebGL2&&e.extensions.has("OES_texture_float_linear"))this.height=new nr(t.height,jt,jt,us,ln);else{const r=new Uint16Array(t.height.length);for(let o=0;o<r.length;o++)r[o]=tu.toHalfFloat(t.height[o]);this.height=new nr(r,jt,jt,us,hn)}this.height.minFilter=ue,this.height.magFilter=ue,this.height.wrapS=this.height.wrapT=mn,this.height.generateMipmaps=!1,this.height.needsUpdate=!0;const s=new Uint8Array(jt*jt*4);for(let r=0;r<jt*jt;r++){s[r*4]=t.zone[r],s[r*4+1]=t.veg[r];const o=t.coast[r];s[r*4+2]=Math.max(0,Math.min(255,Math.round(128+o*.5))),s[r*4+3]=255}this.zone=new nr(s,jt,jt,$e,en),this.zone.minFilter=Oe,this.zone.magFilter=Oe,this.zone.wrapS=this.zone.wrapT=mn,this.zone.generateMipmaps=!1,this.zone.needsUpdate=!0}}const $m=96,bl=8,El=7;function Zm(i,t){const e=bl*2**i,n=$m,s=n*e/2,r=n/4,o=3*n/4,a=[],c=[],l=[],h=new Int32Array((n+1)*(n+1)).fill(-1);let d=0;for(let f=0;f<=n;f++)for(let g=0;g<=n;g++){if(t&&g>r&&g<o&&f>r&&f<o)continue;h[f*(n+1)+g]=d++,a.push(-s+g*e,0,-s+f*e);let m=0,p=0;(g===0||g===n||f===0||f===n)&&i<El-1&&((g===0||g===n)&&(f&1)===1?p=e:(f===0||f===n)&&(g&1)===1&&(m=e)),c.push(m,p)}for(let f=0;f<n;f++)for(let g=0;g<n;g++){const v=h[f*(n+1)+g],m=h[f*(n+1)+g+1],p=h[(f+1)*(n+1)+g],y=h[(f+1)*(n+1)+g+1];v<0||m<0||p<0||y<0||(g+f&1?l.push(v,y,m,v,p,y):l.push(v,p,m,m,p,y))}const u=new Jt;return u.setAttribute("position",new At(a,3)),u.setAttribute("aEdge",new At(c,2)),u.setIndex(l),u.computeBoundingSphere(),u.boundingSphere=new In(new A(0,0,0),s*1.5+200),u}const Km=`
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
`,jm=`
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
`,Jm=`
uniform sampler2D uZoneTex;
uniform sampler2D uHeightTex;
uniform float uWorldSize;
uniform float uMapN;
varying vec3 vWorldPos;
varying float vHeight;
${ai}
vec4 zoneSample(vec2 wp) {
  vec2 uv = (wp + vec2(uWorldSize * 0.5)) / uWorldSize;
  return texture2D(uZoneTex, uv);
}
vec3 zoneAlbedo(int zone, vec2 wp, float h, float veg, float coast, out float rough) {
  float n1 = vnoise(wp * 0.35);
  float n2 = fbm3(wp * 0.045);
  float n3 = vnoise(wp * 0.008);
  rough = 0.9;
  vec3 c;
  if (zone == 0 || zone == 1) {
    // seabed: sand with seagrass patches in the shallows
    vec3 sand = vec3(0.72, 0.66, 0.50);
    vec3 grass = vec3(0.16, 0.24, 0.13);
    float depth = -h;
    float sg = smoothstep(0.55, 0.75, fbm3(wp * 0.012 + 3.0)) * smoothstep(0.6, 1.6, depth) * (1.0 - smoothstep(5.0, 9.0, depth));
    c = mix(sand, grass, sg) * (0.9 + 0.2 * n2);
    c = mix(c, vec3(0.28, 0.32, 0.30), smoothstep(12.0, 30.0, depth));
  } else if (zone == 17) {
    c = vec3(0.86, 0.82, 0.68) * (0.92 + 0.16 * n2);
  } else if (zone == 2) {
    vec3 dry = vec3(0.74, 0.69, 0.60);
    vec3 wet = vec3(0.50, 0.46, 0.40);
    float wetness = 1.0 - smoothstep(0.25, 0.9, h);
    c = mix(dry, wet, wetness) * (0.92 + 0.16 * n2) * (0.95 + 0.1 * n1);
    // tide lines
    c *= 1.0 - 0.08 * smoothstep(0.35, 0.4, h) * (1.0 - smoothstep(0.4, 0.5, h));
    rough = mix(0.95, 0.55, wetness);
  } else if (zone == 3) {
    vec3 mud = vec3(0.30, 0.26, 0.18);
    vec3 canopy = vec3(0.10, 0.20, 0.09);
    c = mix(mud, canopy, smoothstep(0.35, 0.65, n2 + 0.15 * n1)) * (0.9 + 0.2 * n1);
  } else if (zone == 4) {
    c = mix(vec3(0.16, 0.30, 0.10), vec3(0.27, 0.37, 0.15), n2) * (0.9 + 0.2 * n1);
    c = mix(c, vec3(0.42, 0.38, 0.26), smoothstep(0.62, 0.72, n3) * 0.6);
  } else if (zone == 11) {
    c = mix(vec3(0.22, 0.48, 0.12), vec3(0.32, 0.56, 0.16), n2) * (0.92 + 0.16 * n1);
    // bunkers
    float bunker = smoothstep(0.66, 0.72, fbm3(wp * 0.02 + 9.0));
    c = mix(c, vec3(0.9, 0.86, 0.7), bunker);
    // fairway stripes
    c *= 1.0 + 0.05 * sin(wp.x * 0.35 + wp.y * 0.12);
  } else if (zone == 5) {
    vec3 lawn = mix(vec3(0.20, 0.36, 0.12), vec3(0.34, 0.40, 0.18), n2);
    vec3 lot = vec3(0.50, 0.47, 0.42);
    c = mix(lawn, lot, smoothstep(0.55, 0.7, fbm3(wp * 0.03 + 5.0))) * (0.9 + 0.2 * n1);
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
    c = mix(vec3(0.42, 0.38, 0.33), vec3(0.22, 0.2, 0.18), smoothstep(0.4, 0.7, n2)) * (0.85 + 0.3 * n1);
    rough = 0.85;
  } else if (zone == 18) {
    c = vec3(0.16, 0.16, 0.16) * (0.9 + 0.2 * n1);
    rough = 0.7;
  } else {
    c = vec3(0.3, 0.35, 0.2);
  }
  return c;
}
`,Qm=`
{
  // jittered zone lookup hides the cell grid of the zone map
  float cellSize = uWorldSize / uMapN;
  vec2 jitter = (hash22(floor(vWorldPos.xz * 0.5)) - 0.5) * cellSize * 1.35;
  vec4 zs = zoneSample(vWorldPos.xz + jitter);
  int zone = int(zs.r * 255.0 + 0.5);
  float veg = zs.g;
  float coast = (zs.b - 0.5) * 512.0;
  float rough;
  vec3 alb = zoneAlbedo(zone, vWorldPos.xz, vHeight, veg, coast, rough);
  // wet band right at the waterline for every land zone
  if (zone != 0 && zone != 1) {
    float wetBand = 1.0 - smoothstep(0.05, 0.45, vHeight);
    alb = mix(alb, alb * 0.62, wetBand);
    rough = mix(rough, 0.45, wetBand);
  }
  diffuseColor.rgb *= alb;
  roughnessFactor = rough;
}
`;class tg{constructor(t){this.textures=t;const e=new Ct({color:16777215,roughness:.9,metalness:0}),n={uHeightTex:{value:t.height},uZoneTex:{value:t.zone},uRingOffset:this.offsetUniform,uWorldSize:{value:Hi},uMapN:{value:jt}},s=e.onBeforeCompile;e.onBeforeCompile=(r,o)=>{s?.(r,o),Object.assign(r.uniforms,n),r.vertexShader=r.vertexShader.replace("#include <common>",`#include <common>
${Km}`).replace("#include <beginnormal_vertex>",`${jm}
vec3 objectNormal = tnormal;
#ifdef USE_TANGENT
vec3 objectTangent = vec3( tangent.xyz );
#endif`).replace("#include <begin_vertex>","vec3 transformed = wp;"),r.fragmentShader=r.fragmentShader.replace("#include <common>",`#include <common>
${Jm}`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
${Qm}`)},e.customProgramCacheKey=()=>"terrain-v1",this.material=e;for(let r=0;r<El;r++){const o=Zm(r,r>0),a=new zt(o,e);a.frustumCulled=!1,a.receiveShadow=!0,a.castShadow=!1,a.matrixAutoUpdate=!1,this.rings.push(a),this.group.add(a)}}group=new Me;material;rings=[];offsetUniform={value:new A};update(t,e){const n=bl*2,s=Math.round(t/n)*n,r=Math.round(e/n)*n;this.offsetUniform.value.set(s,0,r)}}const eg=`
uniform vec3 uWaterOffset;
varying vec3 vWorldPos;
`,ng=`
vec3 wp = position + uWaterOffset;
wp.y = 0.0;
vWorldPos = wp;
`,ig=`
uniform sampler2D uHeightTex;
uniform sampler2D uZoneTex;
uniform sampler2D uWakeTex;
uniform vec4 uWakeRegion; // center.xy, size, unused
uniform float uWorldSize;
uniform float uWaveTime;
uniform float uWindSpeed;
uniform vec2 uWindDir;
uniform vec3 uSunDirW;
varying vec3 vWorldPos;
${ai}
float terrainHeightW(vec2 wp) {
  vec2 uv = (wp + vec2(uWorldSize * 0.5)) / uWorldSize;
  return texture2D(uHeightTex, uv).r;
}
// analytic-derivative value noise for wave normals
vec3 noised(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  float a = hash12(i), b = hash12(i + vec2(1.0, 0.0)), c = hash12(i + vec2(0.0, 1.0)), d = hash12(i + vec2(1.0, 1.0));
  float k0 = a, k1 = b - a, k2 = c - a, k3 = a - b - c + d;
  return vec3(k0 + k1 * u.x + k2 * u.y + k3 * u.x * u.y, du * vec2(k1 + k3 * u.y, k2 + k3 * u.x));
}
vec3 waveNormal(vec2 wp, float depth, float dist) {
  float t = uWaveTime;
  vec2 wd = uWindDir;
  vec2 wp2 = vec2(wd.y, -wd.x);
  float shallow = smoothstep(0.3, 4.0, depth);
  float sea = smoothstep(4.0, 12.0, depth);
  // distance fades the fine layers to avoid shimmering far away
  float f1 = 1.0 - smoothstep(600.0, 3000.0, dist);
  float f2 = 1.0 - smoothstep(150.0, 900.0, dist);
  float f3 = 1.0 - smoothstep(40.0, 300.0, dist);
  vec2 g = vec2(0.0);
  // each layer contributes a slope (dimensionless); noised() derivatives are O(1) per cell
  vec3 n0 = noised(wp * 0.018 + wd * t * 0.35);
  g += n0.yz * 0.05 * sea;
  vec3 n1 = noised(wp * 0.075 + wd * t * 0.7 + 3.1);
  g += n1.yz * 0.12 * (0.4 + 0.6 * shallow) * f1;
  vec3 n2 = noised(wp * 0.21 - wp2 * t * 0.4 + wd * t * 0.9 + 7.7);
  g += n2.yz * 0.10 * (0.5 + 0.5 * shallow) * f2;
  vec3 n3 = noised(wp * 0.7 + wd * t * 1.6 + 11.3);
  g += n3.yz * 0.07 * f3;
  float wind = 0.5 + 0.5 * clamp(uWindSpeed / 12.0, 0.0, 1.5);
  g *= wind;
  return normalize(vec3(-g.x, 1.0, -g.y));
}
vec3 seabedAlbedo(vec2 wp, float depth) {
  vec2 uv = (wp + vec2(uWorldSize * 0.5)) / uWorldSize;
  float n2 = fbm3(wp * 0.045);
  vec3 sand = mix(vec3(0.72, 0.66, 0.50), vec3(0.86, 0.82, 0.68), 1.0 - smoothstep(0.2, 1.4, depth));
  vec3 grass = vec3(0.16, 0.24, 0.13);
  float sg = smoothstep(0.55, 0.75, fbm3(wp * 0.012 + 3.0)) * smoothstep(0.6, 1.6, depth) * (1.0 - smoothstep(5.0, 9.0, depth));
  vec3 c = mix(sand, grass, sg) * (0.9 + 0.2 * n2);
  return c;
}
`,sg=`
{
  float terrainH = terrainHeightW(vWorldPos.xz);
  float depth = -terrainH;
  if (depth < -0.05) discard;
  depth = max(depth, 0.0);
  vec3 toCam = cameraPosition - vWorldPos;
  float dist = length(toCam);
  vec3 V = toCam / max(dist, 1e-3);

  vec3 wn = waveNormal(vWorldPos.xz, depth, dist);
  // wakes: r = foam, gb = normal perturbation
  vec2 wuv = (vWorldPos.xz - uWakeRegion.xy) / uWakeRegion.z + 0.5;
  vec4 wake = vec4(0.0);
  if (all(greaterThan(wuv, vec2(0.0))) && all(lessThan(wuv, vec2(1.0)))) wake = texture2D(uWakeTex, wuv);
  wn = normalize(wn + vec3(wake.g - 0.5, 0.0, wake.b - 0.5) * 2.0 * wake.a * 0.9);
  // flatten toward the horizon to keep reflections stable
  wn = normalize(mix(wn, vec3(0.0, 1.0, 0.0), smoothstep(2500.0, 9000.0, dist)));
  normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
  nonPerturbedNormal = normal;

  // --- body colour: sunlight transmitted to the seabed and back plus in-water scattering
  vec3 absorb = vec3(0.42, 0.11, 0.055);
  float pathLen = depth * (1.0 + 1.0 / max(V.y, 0.25));
  vec3 T = exp(-absorb * pathLen);
  vec3 seabed = seabedAlbedo(vWorldPos.xz, depth);
  vec3 scatterCol = vec3(0.02, 0.24, 0.30);
  vec3 deepCol = vec3(0.004, 0.035, 0.085);
  float sAmt = 1.0 - exp(-depth * 0.22);
  vec3 body = seabed * T * (1.0 - sAmt * 0.6) + mix(scatterCol, deepCol, smoothstep(3.0, 18.0, depth)) * sAmt * 1.6;
  // turbidity near mangroves / flats
  float turbid = smoothstep(1.2, 0.0, depth) * 0.25;
  body = mix(body, vec3(0.35, 0.36, 0.25), turbid * (1.0 - smoothstep(0.0, 0.3, depth)) * 0.5);

  // --- foam: shoreline, surf lines, whitecaps and wakes
  float foamNoise = fbm3(vWorldPos.xz * 0.35 + vec2(uWaveTime * 0.25, -uWaveTime * 0.15));
  float shoreFoam = (1.0 - smoothstep(0.0, 0.55, depth)) * smoothstep(0.5, 0.8, foamNoise + 0.2 * sin(uWaveTime * 1.4 + depth * 6.0) + 0.15 * fbm3(vWorldPos.xz * 0.02));
  float surf = smoothstep(0.9, 1.0, sin(depth * 2.4 - uWaveTime * 1.3 + fbm3(vWorldPos.xz * 0.02) * 4.0)) * smoothstep(3.0, 1.2, depth) * smoothstep(0.6, 1.4, depth) * smoothstep(0.5, 0.65, foamNoise) * smoothstep(3.0, 6.0, uWindSpeed);
  float whitecap = smoothstep(0.78, 0.9, vnoise(vWorldPos.xz * 0.05 + uWindDir * uWaveTime * 0.8)) * smoothstep(6.0, 14.0, uWindSpeed) * smoothstep(3.0, 8.0, depth) * (1.0 - smoothstep(800.0, 3000.0, dist));
  float foam = clamp(shoreFoam + surf * 0.8 + whitecap * 0.6 + wake.r, 0.0, 1.0);
  vec3 foamCol = vec3(0.86, 0.9, 0.9);
  float waveShade = 0.85 + 0.3 * clamp(dot(wn, normalize(uSunDirW + vec3(0.0, 0.6, 0.0))), 0.0, 1.0);
  body *= waveShade;
  diffuseColor.rgb = mix(body, foamCol, foam);
  // roughness: mirror-like water, rough foam, rougher with distance to suppress sparkle aliasing
  roughnessFactor = mix(mix(0.045, 0.16, smoothstep(300.0, 6000.0, dist)), 0.85, foam);
  metalnessFactor = 0.0;
}
`;class rg{mesh;material;offset={value:new A};uniforms;constructor(t,e){const n=new Ct({color:16777215,roughness:.08,metalness:0});n.envMapIntensity=1.35,this.uniforms={uHeightTex:{value:t.height},uZoneTex:{value:t.zone},uWakeTex:{value:e},uWakeRegion:{value:new ge(0,0,3e3,0)},uWaterOffset:this.offset,uWorldSize:{value:Hi},uWaveTime:{value:0},uWindSpeed:{value:6},uWindDir:{value:new wt(.94,.34)},uSunDirW:{value:new A(0,1,0)}};const s=this.uniforms,r=n.onBeforeCompile;n.onBeforeCompile=(c,l)=>{r?.(c,l),Object.assign(c.uniforms,s),c.vertexShader=c.vertexShader.replace("#include <common>",`#include <common>
${eg}`).replace("#include <begin_vertex>",`${ng}
vec3 transformed = wp;`),c.fragmentShader=c.fragmentShader.replace("#include <common>",`#include <common>
${ig}`).replace("#include <normal_fragment_begin>",`#include <normal_fragment_begin>
${sg}`)},n.customProgramCacheKey=()=>"water-v1",this.material=n;const o=7e4,a=new Yn(o,o,48,48);a.rotateX(-Math.PI/2),this.mesh=new zt(a,n),this.mesh.frustumCulled=!1,this.mesh.receiveShadow=!0,this.mesh.matrixAutoUpdate=!1,this.mesh.renderOrder=5}update(t,e,n,s,r,o,a,c){this.offset.value.set(Math.round(t/50)*50,0,Math.round(e/50)*50),this.uniforms.uWaveTime.value=n,this.uniforms.uWindSpeed.value=s,this.uniforms.uWindDir.value.copy(r),this.uniforms.uSunDirW.value.copy(o),this.uniforms.uWakeRegion.value.set(a.x,a.y,c,0)}}class og{rt;scene=new fs;camera;center=new wt;size;constructor(t=1024,e=3200){this.size=e,this.rt=new Ze(t,t,{type:en,depthBuffer:!1,minFilter:ue,magFilter:ue}),this.rt.texture.wrapS=this.rt.texture.wrapT=mn,this.camera=new ps(-e/2,e/2,e/2,-e/2,1,400),this.camera.up.set(0,0,-1)}get texture(){return this.rt.texture}render(t,e,n){this.center.set(Math.round(e/8)*8,Math.round(n/8)*8),this.camera.position.set(this.center.x,200,this.center.y),this.camera.lookAt(this.center.x,0,this.center.y),this.camera.updateMatrixWorld();const s=t.getRenderTarget(),r=t.getClearColor(new Et),o=t.getClearAlpha();t.setRenderTarget(this.rt),t.setClearColor(32896,0),t.clear(!0,!1,!1),t.render(this.scene,this.camera),t.setClearColor(r,o),t.setRenderTarget(s)}}const ag=new Ae({vertexShader:`
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
      // foam is strongest along the two arms of the V and right behind the hull
      float arms = smoothstep(0.35, 0.75, abs(vSide)) * 0.9 + (1.0 - smoothstep(0.0, 0.3, abs(vSide))) * 0.7 * (1.0 - smoothstep(0.0, 0.35, vAge));
      float foam = arms * life * life * edge * uStrength;
      vec2 n = vec2(sign(vSide) * 0.35 * life * edge, 0.0);
      gl_FragColor = vec4(foam, 0.5 + n.x, 0.5 + n.y, edge * life);
    }
  `,uniforms:{uStrength:{value:1}},transparent:!0,depthTest:!1,depthWrite:!1,side:Fe,blending:Pn}),Vo=new Ae({vertexShader:`
    attribute float aAge; attribute float aSide;
    varying float vAge; varying float vSide;
    void main() { vAge = aAge; vSide = aSide; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,fragmentShader:`
    varying float vAge; varying float vSide;
    uniform float uStrength;
    void main() {
      float edge = 1.0 - smoothstep(0.2, 1.0, abs(vSide));
      float life = (1.0 - vAge);
      float a = edge * life * life * uStrength * smoothstep(0.0, 0.05, vAge);
      gl_FragColor = vec4(vec3(0.95, 0.97, 1.0), a);
    }
  `,uniforms:{uStrength:{value:.7}},transparent:!0,depthWrite:!1,side:Fe});class Li{constructor(t,e,n,s=1,r=ag){this.width=e,this.lifetime=n,this.capacity=t,this.positions=new Float32Array(t*2*3),this.ages=new Float32Array(t*2),this.sides=new Float32Array(t*2);const o=[];for(let c=0;c<t-1;c++){const l=c*2,h=l+1,d=l+2,u=l+3;o.push(l,d,h,h,d,u)}this.geo=new Jt,this.geo.setAttribute("position",new de(this.positions,3)),this.geo.setAttribute("aAge",new de(this.ages,1)),this.geo.setAttribute("aSide",new de(this.sides,1)),this.geo.setIndex(o),this.geo.setDrawRange(0,0);const a=r.clone();a.uniforms.uStrength.value=s,this.mesh=new zt(this.geo,a),this.mesh.frustumCulled=!1,this.mesh.matrixAutoUpdate=!1}mesh;capacity;positions;ages;sides;points=[];lastX=NaN;lastZ=NaN;geo;update(t,e,n,s,r){if(s&&(Number.isNaN(this.lastX)||Math.hypot(t-this.lastX,e-this.lastZ)>Math.max(2,r*.25))){const a=Number.isNaN(this.lastX)?1:t-this.lastX,c=Number.isNaN(this.lastZ)?0:e-this.lastZ,l=Math.hypot(a,c)||1;this.points.push({x:t,z:e,dx:a/l,dz:c/l,t:n}),this.points.length>this.capacity&&this.points.shift(),this.lastX=t,this.lastZ=e}for(;this.points.length&&n-this.points[0].t>this.lifetime;)this.points.shift();const o=this.points.length;for(let a=0;a<o;a++){const c=this.points[a],l=Math.min(1,(n-c.t)/this.lifetime),h=this.width*(.35+1.3*l),d=-c.dz*h,u=c.dx*h;this.positions[a*6]=c.x-d,this.positions[a*6+1]=.05,this.positions[a*6+2]=c.z-u,this.positions[a*6+3]=c.x+d,this.positions[a*6+4]=.05,this.positions[a*6+5]=c.z+u,this.ages[a*2]=l,this.ages[a*2+1]=l,this.sides[a*2]=-1,this.sides[a*2+1]=1}this.geo.attributes.position.needsUpdate=!0,this.geo.attributes.aAge.needsUpdate=!0,this.geo.attributes.aSide.needsUpdate=!0,this.geo.setDrawRange(0,Math.max(0,(o-1)*6))}reset(){this.points.length=0,this.lastX=NaN,this.lastZ=NaN,this.geo.setDrawRange(0,0)}}const Xs=`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,cg=`
${aa}
${ai}
${ca}
${la}
${Sl}
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
`,lg=`
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
`,hg=`
uniform sampler2D tColor;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec3 s = texture2D(tColor, vUv).rgb * 0.227;
  s += (texture2D(tColor, vUv + uDir * 1.385).rgb + texture2D(tColor, vUv - uDir * 1.385).rgb) * 0.316;
  s += (texture2D(tColor, vUv + uDir * 3.231).rgb + texture2D(tColor, vUv - uDir * 3.231).rgb) * 0.070;
  gl_FragColor = vec4(s, 1.0);
}
`,ug=`
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
`;class dg{constructor(t,e,n){this.renderer=t,this.opts=n;const s=new ta(1,1,qn);this.sceneRT=new Ze(1,1,{type:hn,samples:n.samples,depthTexture:s,depthBuffer:!0,minFilter:ue,magFilter:ue}),this.fogRT=new Ze(1,1,{type:hn,depthBuffer:!1,minFilter:ue,magFilter:ue});for(let r=0;r<3;r++)this.bloomRTs.push(new Ze(1,1,{type:hn,depthBuffer:!1,minFilter:ue,magFilter:ue})),this.bloomTmp.push(new Ze(1,1,{type:hn,depthBuffer:!1,minFilter:ue,magFilter:ue}));this.aerialMat=new Ae({vertexShader:Xs,fragmentShader:cg,uniforms:{...e.uniforms,tColor:{value:null},tDepth:{value:null},uInvProj:{value:new Xt},uInvView:{value:new Xt},uCamPos:{value:new A},uLogDepthFC:{value:1},uCloudShadowStrength:{value:1}},depthTest:!1,depthWrite:!1}),this.brightMat=new Ae({vertexShader:Xs,fragmentShader:lg,uniforms:{tColor:{value:null},uThreshold:{value:1.15}},depthTest:!1,depthWrite:!1}),this.blurMat=new Ae({vertexShader:Xs,fragmentShader:hg,uniforms:{tColor:{value:null},uDir:{value:new wt}},depthTest:!1,depthWrite:!1}),this.compositeMat=new Ae({vertexShader:Xs,fragmentShader:ug,uniforms:{tColor:{value:null},tBloom0:{value:null},tBloom1:{value:null},tBloom2:{value:null},uBloom:{value:.2},uExposure:{value:.92},uSaturation:{value:1.16},uVignette:{value:.25},uLift:{value:new A(0,.006,.012)},uGain:{value:new A(1.03,1,.97)},uResolution:{value:new wt(1,1)},uGrain:{value:.004},uTime:{value:0}},depthTest:!1,depthWrite:!1}),this.quad=new zt(new Yn(2,2),this.aerialMat),this.quad.frustumCulled=!1,this.quadScene.add(this.quad)}sceneRT;fogRT;bloomRTs=[];bloomTmp=[];quad;quadScene=new fs;quadCam=new ps(-1,1,1,-1,0,1);aerialMat;brightMat;blurMat;compositeMat;width=1;height=1;exposure=1;cloudShadowStrength=1;setSize(t,e){this.width=t,this.height=e,this.sceneRT.setSize(t,e),this.fogRT.setSize(t,e);for(let n=0;n<3;n++){const s=2**(n+1);this.bloomRTs[n].setSize(Math.max(1,Math.round(t/s)),Math.max(1,Math.round(e/s))),this.bloomTmp[n].setSize(Math.max(1,Math.round(t/s)),Math.max(1,Math.round(e/s)))}this.compositeMat.uniforms.uResolution.value.set(t,e)}get target(){return this.sceneRT}blit(t,e){this.quad.material=t,this.renderer.setRenderTarget(e),this.renderer.render(this.quadScene,this.quadCam)}finish(t,e){const n=this.renderer,s=this.aerialMat.uniforms;if(s.tColor.value=this.sceneRT.texture,s.tDepth.value=this.sceneRT.depthTexture,s.uInvProj.value.copy(t.projectionMatrixInverse),s.uInvView.value.copy(t.matrixWorld),s.uCamPos.value.copy(t.position),s.uLogDepthFC.value=2/(Math.log(t.far+1)/Math.LN2),s.uCloudShadowStrength.value=this.cloudShadowStrength,this.blit(this.aerialMat,this.fogRT),this.opts.bloom){this.brightMat.uniforms.tColor.value=this.fogRT.texture,this.blit(this.brightMat,this.bloomRTs[0]);for(let o=0;o<3;o++){const a=this.bloomRTs[o],c=this.bloomTmp[o],l=a.width,h=a.height;o>0&&(this.blurMat.uniforms.tColor.value=this.bloomRTs[o-1].texture,this.blurMat.uniforms.uDir.value.set(.5/l,.5/h),this.blit(this.blurMat,a)),this.blurMat.uniforms.tColor.value=a.texture,this.blurMat.uniforms.uDir.value.set(1/l,0),this.blit(this.blurMat,c),this.blurMat.uniforms.tColor.value=c.texture,this.blurMat.uniforms.uDir.value.set(0,1/h),this.blit(this.blurMat,a)}}const r=this.compositeMat.uniforms;r.tColor.value=this.fogRT.texture,r.tBloom0.value=this.bloomRTs[0].texture,r.tBloom1.value=this.bloomRTs[1].texture,r.tBloom2.value=this.bloomRTs[2].texture,r.uBloom.value=this.opts.bloom?.22:0,r.uExposure.value=this.exposure*(1+5*this.aerialMat.uniforms.uNight.value),r.uTime.value=e,this.blit(this.compositeMat,null),n.setRenderTarget(null)}}function Uc(i,t,e){const n=Math.hypot(e[0]-t[0],e[1]-t[1]),s=Math.max(2,Math.ceil(n/10));let r=-1,o=-1;for(let l=0;l<=s;l++){const h=l/s,d=t[0]+(e[0]-t[0])*h,u=t[1]+(e[1]-t[1])*h,f=i.heightAt(d,u)>=.8;f&&r<0&&(r=l),f&&(o=l)}if(r<0||o-r<3)return null;const a=r/s,c=o/s;return[[t[0]+(e[0]-t[0])*a,t[1]+(e[1]-t[1])*a],[t[0]+(e[0]-t[0])*c,t[1]+(e[1]-t[1])*c]]}function fg(i){const t=[],e=new Map,n=new Map;for(const r of i.roads)for(let o=0;o<r.pts.length-1;o++)t.push({a:r.pts[o],b:r.pts[o+1],width:r.width,cls:r.cls,lanes:r.lanes,traffic:r.traffic,lift:0});const s=new dn("streets");for(const r of i.districts){if(r.gridX<=0||r.gridZ<=0)continue;const o=[],a=Math.cos(r.rot),c=Math.sin(r.rot),l=(v,m)=>[r.cx+v*a-m*c,r.cz+v*c+m*a],h=r.zone===xe.DOWNTOWN?14:r.zone===xe.RES_MID||r.zone===xe.HOTEL||r.zone===xe.INDUSTRIAL?12:9,d=(r.zone===xe.RES_LOW,"street"),u=[];for(let v=-r.hw;v<=r.hw+1;v+=r.gridX*s.range(.9,1.15))u.push(Math.min(v,r.hw));const f=[];for(let v=-r.hh;v<=r.hh+1;v+=r.gridZ*s.range(.9,1.15))f.push(Math.min(v,r.hh));for(const v of u)for(let m=0;m<f.length-1;m++){const p=l(v,f[m]),y=l(v,f[m+1]),_=Uc(i,p,y);if(!_)continue;const x={a:_[0],b:_[1],width:h,cls:d,lanes:2,traffic:r.zone===xe.DOWNTOWN?4:1.5,lift:0};t.push(x),o.push(x)}for(const v of f)for(let m=0;m<u.length-1;m++){const p=l(u[m],v),y=l(u[m+1],v),_=Uc(i,p,y);if(!_)continue;const x={a:_[0],b:_[1],width:h,cls:d,lanes:2,traffic:r.zone===xe.DOWNTOWN?4:1.5,lift:0};t.push(x),o.push(x)}e.set(r.id,o);const g=[];for(let v=0;v<u.length-1;v++)for(let m=0;m<f.length-1;m++)g.push({x0:u[v],x1:u[v+1],z0:f[m],z1:f[m+1],streetWidth:h});n.set(r.id,g)}for(const r of i.runways)t.push({a:r.a,b:r.b,width:r.width,cls:"runway",lanes:0,traffic:0,lift:0});return{segments:t,streetsByDistrict:e,blocksByDistrict:n}}const pg=`
varying vec2 vRoadUv;   // x across (-1..1), y along (metres)
varying vec3 vRoadInfo; // lanes, width, class
varying vec3 vWorldPosR;
${ai}
`,mg=`
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
  if (cls > 4.5) {
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
`;function gg(i,t,e){const n=[],s=[],r=[],o=[],a=[];let c=0;const l=u=>u==="highway"||u==="causeway"?3:u==="arterial"?2:u==="runway"?5:u==="taxiway"?6:1;for(const u of t){const f=u.b[0]-u.a[0],g=u.b[1]-u.a[1],v=Math.hypot(f,g);if(v<1)continue;const m=f/v,y=-(g/v),_=m,x=u.width*.5,E=Math.max(1,Math.ceil(v/25)),b=u.lanes,C=l(u.cls);for(let R=0;R<=E;R++){const w=R/E,M=u.a[0]+f*w,L=u.a[1]+g*w;for(const I of[-1,1]){const U=M+y*x*I,D=L+_*x*I,N=i.heightAt(U,D)+.12+u.lift;n.push(U,N,D),a.push(0,1,0),s.push(I,w*v),r.push(b,u.width,C)}if(R>0){const I=c+R*2;o.push(I-2,I-1,I,I,I-1,I+1)}}c+=(E+1)*2}const h=new Jt;h.setAttribute("position",new At(n,3)),h.setAttribute("normal",new At(a,3)),h.setAttribute("aRoadUv",new At(s,2)),h.setAttribute("aRoadInfo",new At(r,3)),h.setIndex(o),h.computeBoundingSphere();const d=new zt(h,e);return d.receiveShadow=!0,d.castShadow=!1,d.renderOrder=2,d.frustumCulled=!1,[d]}function vg(){const i=new Ct({color:16777215,roughness:.8,metalness:0,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2});return i.onBeforeCompile=t=>{t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
attribute vec2 aRoadUv; attribute vec3 aRoadInfo; varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vRoadUv = aRoadUv; vRoadInfo = aRoadInfo; vWorldPosR = (modelMatrix * vec4(position, 1.0)).xyz;`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
${pg}`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
${mg}`)},i.customProgramCacheKey=()=>"road-v1",i}function _g(i){let t=0;for(let e=0;e<i.length-1;e++)t+=Math.hypot(i[e+1][0]-i[e][0],i[e+1][1]-i[e][1]);return t}function qs(i,t){let e=0;for(let n=0;n<i.length-1;n++){const s=Math.hypot(i[n+1][0]-i[n][0],i[n+1][1]-i[n][1]);if(t<=e+s||n===i.length-2){const r=Kt((t-e)/s,0,1),o=(i[n+1][0]-i[n][0])/s,a=(i[n+1][1]-i[n][1])/s;return{x:i[n][0]+o*s*r,z:i[n][1]+a*s*r,dx:o,dz:a}}e+=s}return{x:i[0][0],z:i[0][1],dx:1,dz:0}}function Ys(i,t,e,n){const s=Math.min(160,n*.25),r=t.heightAt(i.pts[0][0],i.pts[0][1]),o=t.heightAt(i.pts[i.pts.length-1][0],i.pts[i.pts.length-1][1]),a=Qt(0,s,e),c=Qt(0,s,n-e);let l=ee(Math.max(r,.5)+.3,i.deck,a);if(l=Math.min(l,ee(Math.max(o,.5)+.3,i.deck,c)),i.archHeight>0){const h=i.archT*n,d=Math.abs(e-h)/(i.archLength*.5);if(d<1){const u=.5+.5*Math.cos(d*Math.PI);l+=(i.archHeight-i.deck)*u}}return l}function xg(i,t,e,n){const s=new Me,r=[],o=[],a=[],c=[],l=[],h=[],d=[];let u=0;const f=[],g=[],v=[],m=[],p=[],y=new Xt,_=new Se,x=new A,E=new A;for(const U of i.bridges){const D=_g(U.pts),N=20,F=Math.ceil(D/N),G=[],O=U.width*.5;for(let q=0;q<=F;q++){const nt=Math.min(D,q*N),ot=qs(U.pts,nt),lt=Ys(U,i,nt,D);G.push(new A(ot.x,lt,ot.z));const V=-ot.dz,K=ot.dx;for(const et of[-1,1])a.push(ot.x+V*O*et,lt+.02,ot.z+K*O*et),d.push(0,1,0),c.push(et,nt),l.push(U.lanes,U.width,3);if(q>0){const et=u+q*2;h.push(et-2,et-1,et,et,et-1,et+1)}if(q>0){const et=G[q-1],it=G[q],at=et.clone().add(it).multiplyScalar(.5),ht=it.clone().sub(et),ft=ht.length();ht.normalize();const Ot=Math.atan2(ht.x,ht.z),xt=-Math.asin(Kt(ht.y,-1,1)),Vt=new Se().setFromEuler(new ve(xt,Ot,0,"YXZ")),z=new mt(U.width+1,1.6,ft+.4);z.applyQuaternion(Vt),z.translate(at.x,at.y-.8,at.z),f.push(z);for(const ae of[-1,1]){const Ft=new mt(.35,1.15,ft+.4);Ft.translate(ae*(O+.25),.55,0),Ft.applyQuaternion(Vt),Ft.translate(at.x,at.y,at.z),f.push(Ft);const Bt=new mt(.5,.35,ft+.4);Bt.translate(ae*(O+.25),1.2,0),Bt.applyQuaternion(Vt),Bt.translate(at.x,at.y,at.z),f.push(Bt)}}}let W=30;for(;W<D-30;){const q=qs(U.pts,W),nt=Ys(U,i,W,D),ot=i.heightAt(q.x,q.z),lt=U.archHeight>0&&Math.abs(W-U.archT*D)<U.archLength*.5,V=lt?70:38;if(nt-ot>1.2){const K=-q.dz,et=q.dx,it=nt-1.6,at=Math.min(ot,-.5)-2,ht=it-at,ft=U.width>18?[-O*.55,O*.55]:[-O*.45,O*.45];for(const Ot of ft)E.set(q.x+K*Ot,at+ht/2,q.z+et*Ot),_.setFromEuler(new ve(0,Math.atan2(q.dx,q.dz),0)),x.set(lt?2.4:1.7,ht,lt?2.4:1.7),g.push(y.compose(E,_,x).clone());E.set(q.x,it-.6,q.z),_.setFromEuler(new ve(0,Math.atan2(q.dx,q.dz),0)),x.set(U.width+.6,1.4,2.2),v.push(y.compose(E,_,x).clone())}W+=V}for(let q=22,nt=0;q<D-20;q+=45,nt++){const ot=qs(U.pts,q),lt=Ys(U,i,q,D),V=nt%2===0?-1:1;o.push(new A(ot.x+-ot.dz*(O+.2)*V,lt,ot.z+ot.dx*(O+.2)*V))}if(U.archHeight>=20&&U.archLength>=350){const q=U.archT*D,nt=U.archLength*.9,ot=U.archHeight*1.1;for(const lt of[-1,1]){const V=[];for(let et=0;et<=24;et++){const it=et/24,at=q-nt/2+nt*it,ht=qs(U.pts,at),ft=Ys(U,i,at,D),Ot=ft+ot*Math.sin(it*Math.PI)+1,xt=-ht.dz,Vt=ht.dx;if(V.push(new A(ht.x+xt*(O+.9)*lt,Ot,ht.z+Vt*(O+.9)*lt)),et%2===1&&et>1&&et<23){const z=V[V.length-1],ae=new A(z.x,ft+1.2,z.z),Ft=z.clone().add(ae).multiplyScalar(.5);E.copy(Ft),_.identity(),x.set(.16,z.y-ae.y,.16),p.push(y.compose(E,_,x).clone())}}const K=new oa(new Ml(V),48,1.1,8,!1);m.push(K)}}u+=(F+1)*2,r.push({id:U.id,pts:G,width:U.width,lanes:U.lanes,traffic:U.traffic})}const b=new Jt;b.setAttribute("position",new At(a,3)),b.setAttribute("normal",new At(d,3)),b.setAttribute("aRoadUv",new At(c,2)),b.setAttribute("aRoadInfo",new At(l,3)),b.setIndex(h),b.computeBoundingSphere();const C=new zt(b,t);C.receiveShadow=!0,C.renderOrder=3,s.add(C);const R=Nc(f),w=new zt(R,e);w.castShadow=!0,w.receiveShadow=!0,s.add(w);const M=new le(.5,.5,1,12),L=new tn(M,e,g.length);g.forEach((U,D)=>L.setMatrixAt(D,U)),L.castShadow=!0,L.receiveShadow=!0,L.frustumCulled=!1,s.add(L);const I=new tn(new mt(1,1,1),e,v.length);if(v.forEach((U,D)=>I.setMatrixAt(D,U)),I.castShadow=!0,I.receiveShadow=!0,I.frustumCulled=!1,s.add(I),m.length){const U=new zt(Nc(m),n);U.castShadow=!0,U.receiveShadow=!0,s.add(U)}if(p.length){const U=new tn(new le(.5,.5,1,6),n,p.length);p.forEach((D,N)=>U.setMatrixAt(N,D)),U.frustumCulled=!1,s.add(U)}return{group:s,routes:r,deckGeometry:b,lampPositions:o}}function Nc(i){let t=0,e=0;const n=i.map(d=>{const u=d.getAttribute("position"),f=d.getIndex(),g=f?f.count:u.count;return t+=u.count,e+=g,{g:d,p:u,ind:f,nIdx:g}}),s=new Float32Array(t*3),r=new Float32Array(t*3),o=new Float32Array(t*2),a=t>65535?new Uint32Array(e):new Uint16Array(e);let c=0,l=0;for(const{g:d,p:u,ind:f,nIdx:g}of n){s.set(u.array,c*3);const v=d.getAttribute("normal");v&&r.set(v.array,c*3);const m=d.getAttribute("uv");if(m&&o.set(m.array,c*2),f)for(let p=0;p<g;p++)a[l+p]=f.getX(p)+c;else for(let p=0;p<g;p++)a[l+p]=p+c;c+=u.count,l+=g}const h=new Jt;h.setAttribute("position",new de(s,3)),h.setAttribute("normal",new de(r,3)),h.setAttribute("uv",new de(o,2)),h.setIndex(new de(a,1)),h.computeBoundingSphere();for(const d of i)d.dispose();return h}function Mg(i){const t=new Ct({color:16777215,roughness:.7,metalness:0});return t.onBeforeCompile=e=>{e.uniforms.uNight=i,e.vertexShader=e.vertexShader.replace("#include <common>",`#include <common>
attribute vec3 aDims;
attribute vec4 aStyle;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec3 vDims;
varying vec4 vStyle;
varying vec3 vWorldPosF;`).replace("#include <begin_vertex>",`#include <begin_vertex>
vLocal = position;
vLocalN = normal;
vDims = aDims;
vStyle = aStyle;
vWorldPosF = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;`),e.fragmentShader=e.fragmentShader.replace("#include <common>",`#include <common>
uniform float uNight;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec3 vDims;
varying vec4 vStyle;
varying vec3 vWorldPosF;
${ai}
vec3 roofPalette(float k) {
  if (k < 0.5) return vec3(0.62, 0.34, 0.22);      // terracotta
  if (k < 1.5) return vec3(0.34, 0.34, 0.35);      // grey shingle
  if (k < 2.5) return vec3(0.86, 0.86, 0.84);      // white membrane
  if (k < 3.5) return vec3(0.42, 0.31, 0.24);      // brown
  if (k < 4.5) return vec3(0.22, 0.42, 0.40);      // teal metal
  return vec3(0.55, 0.55, 0.56);                   // gravel
}
`).replace("#include <metalnessmap_fragment>",`#include <metalnessmap_fragment>
{
  float style = vStyle.x;
  float floorH = max(vStyle.y, 2.6);
  float seed = vStyle.z;
  vec3 wall = diffuseColor.rgb; // instance colour
  vec3 meters = vec3((vLocal.x + 0.5) * vDims.x, vLocal.y * vDims.y, (vLocal.z + 0.5) * vDims.z);
  bool isTop = vLocalN.y > 0.6;
  bool isRoofSlope = vLocalN.y > 0.25 && vLocalN.y <= 0.6;
  float sideX = abs(vLocalN.x);
  float u = sideX > 0.5 ? meters.z : meters.x;
  float v = meters.y;
  float facadeSeed = seed + floor(sideX + 0.5) * 3.7 + step(0.0, vLocalN.x + vLocalN.z) * 11.1;
  vec3 col = wall;
  float rough = 0.75;
  float metal = 0.0;
  vec3 emis = vec3(0.0);
  float grime = fbm3(vWorldPosF.xz * 0.11 + vWorldPosF.y * 0.07);
  if (isTop) {
    // roofs
    if (style < 4.5 && style != 5.0) {
      vec3 base = mix(vec3(0.42, 0.42, 0.43), vec3(0.72, 0.72, 0.70), step(0.5, hash11(seed * 3.1)));
      col = base * (0.85 + 0.3 * vnoise(vWorldPosF.xz * 0.6));
      // parapet edge and mechanical pad
      float edgeD = min(min(meters.x, vDims.x - meters.x), min(meters.z, vDims.z - meters.z));
      col = mix(col * 0.7, col, smoothstep(0.6, 1.4, edgeD));
      col = mix(col, col * 0.55, step(0.62, hash12(floor(vWorldPosF.xz / 6.0) + seed)) * 0.3);
      rough = 0.9;
    } else if (style == 5.0) {
      col = roofPalette(vStyle.w) * (0.9 + 0.2 * vnoise(vWorldPosF.xz * 1.5));
      rough = 0.85;
    } else {
      col = vec3(0.52, 0.53, 0.54) * (0.9 + 0.2 * vnoise(vWorldPosF.xz * 0.4));
      // skylight strips on warehouses
      float sky = step(0.8, fract(meters.z / 12.0)) * step(2.0, meters.x) * step(meters.x, vDims.x - 2.0);
      col = mix(col, vec3(0.75, 0.8, 0.85), sky * 0.7);
      rough = 0.7;
    }
  } else if (isRoofSlope) {
    col = roofPalette(vStyle.w) * (0.88 + 0.24 * vnoise(vWorldPosF.xz * 2.0 + vWorldPosF.y));
    // tile rows
    col *= 0.92 + 0.08 * step(0.5, fract(v / 0.35));
    rough = 0.85;
  } else if (vLocalN.y < -0.5) {
    col = wall * 0.5;
  } else {
    float floorIdx = floor(v / floorH);
    float fy = fract(v / floorH);
    // window pattern LOD: fade to the average when the pattern is sub-pixel
    float winW = style < 0.5 ? 1.6 : style < 1.5 ? 3.2 : style < 2.5 ? 3.6 : style < 3.5 ? 3.0 : style < 4.5 ? 8.0 : style < 5.5 ? 3.4 : style < 6.5 ? 9.0 : 3.9;
    float fx = fract(u / winW);
    float colIdx = floor(u / winW);
    float px = fwidth(u / winW) + fwidth(v / floorH);
    float lod = clamp(px * 1.6, 0.0, 1.0);
    float litHash = hash12(vec2(colIdx * 1.31 + facadeSeed, floorIdx * 0.77 + seed));
    float lit = step(0.72 - 0.25 * uNight, litHash) * uNight;
    vec3 glassCol = vec3(0.07, 0.10, 0.13);
    vec3 warm = mix(vec3(1.0, 0.82, 0.55), vec3(0.75, 0.85, 1.0), step(0.75, hash11(litHash * 17.0)));
    if (style < 0.5) {
      // curtain wall: nearly all glass, thin mullions, spandrel every floor
      float mullion = step(fx, 0.06) + step(0.94, fx);
      float spandrel = step(fy, 0.16);
      float glass = 1.0 - max(min(mullion, 1.0), spandrel);
      vec3 tint = mix(vec3(0.07, 0.15, 0.20), vec3(0.05, 0.09, 0.15), hash11(seed * 5.3));
      vec3 spandrelCol = wall * 0.55;
      col = mix(spandrelCol, tint, glass);
      col = mix(col, mix(spandrelCol, tint, 0.8), lod);
      rough = mix(0.55, 0.12, glass);
      metal = mix(0.0, 0.85, glass) * (1.0 - lod * 0.3);
      emis = warm * lit * glass * 1.4;
    } else if (style < 1.5 || style > 6.5) {
      // punched windows on plaster / hotel slab
      float wx = step(0.22, fx) * step(fx, 0.78);
      float wy = step(0.25, fy) * step(fy, 0.82);
      float glass = wx * wy;
      if (style > 6.5) { glass = step(0.1, fx) * step(fx, 0.9) * step(0.2, fy) * step(fy, 0.9); }
      col = mix(wall, glassCol, glass);
      col = mix(col, mix(wall, glassCol, 0.4), lod);
      rough = mix(0.8, 0.2, glass);
      metal = glass * 0.7 * (1.0 - lod);
      emis = warm * lit * glass * 1.6;
      // balcony slabs on hotel slabs
      if (style > 6.5) { float slab = step(fy, 0.12); col = mix(col, vec3(0.9, 0.9, 0.88), slab * (1.0 - lod)); rough = mix(rough, 0.8, slab); }
    } else if (style < 2.5) {
      // balcony bands: light slab edge, dark recessed glass, railing line
      float slab = step(fy, 0.14);
      float rail = step(0.14, fy) * step(fy, 0.42) * step(0.08, fx) * step(fx, 0.92);
      float glass = step(0.42, fy) * step(fy, 0.95) * step(0.08, fx) * step(fx, 0.92);
      col = mix(wall * 0.9, vec3(0.92, 0.92, 0.9), slab);
      col = mix(col, glassCol * 1.2, glass);
      col = mix(col, wall * 0.75, rail * 0.6);
      col = mix(col, mix(wall, glassCol, 0.45), lod);
      rough = mix(0.8, 0.25, glass);
      metal = glass * 0.6 * (1.0 - lod);
      emis = warm * lit * glass * 1.3;
    } else if (style < 3.5) {
      // art deco: pastel wall, vertical fins, smaller windows, horizontal accent every 3 floors
      float fin = step(fx, 0.08);
      float wx = step(0.3, fx) * step(fx, 0.72);
      float wy = step(0.3, fy) * step(fy, 0.8);
      float glass = wx * wy;
      float accent = step(fract(floorIdx / 3.0), 0.05) * step(fy, 0.1);
      col = mix(wall, wall * 1.12, fin);
      col = mix(col, glassCol, glass);
      col = mix(col, vec3(0.95, 0.95, 0.9), accent);
      col = mix(col, mix(wall, glassCol, 0.3), lod);
      rough = mix(0.85, 0.25, glass);
      metal = glass * 0.6 * (1.0 - lod);
      emis = warm * lit * glass * 1.5;
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
      col = mix(col, glassCol, glass);
      col = mix(col, wall, lod);
      rough = mix(0.85, 0.3, glass);
      metal = glass * 0.5 * (1.0 - lod);
      emis = warm * lit * glass * 1.2;
    } else {
      // plain concrete (parking / utility)
      col = wall * (0.9 + 0.2 * vnoise(vWorldPosF.xz * 0.5 + v * 0.3));
      float slot = step(0.55, fy) * step(fy, 0.9);
      col = mix(col, col * 0.4, slot * 0.8);
      rough = 0.85;
    }
    // ground floor: darker plinth / shopfronts, streaks of grime under sills
    col *= 1.0 - 0.18 * smoothstep(0.55, 0.85, grime) * (1.0 - smoothstep(2.0, 12.0, v));
    col = mix(col, col * 0.8, step(v, 0.8));
  }
  diffuseColor.rgb = col;
  roughnessFactor = rough;
  metalnessFactor = metal;
  totalEmissiveRadiance += emis;
}`)},t.customProgramCacheKey=()=>"facade-v1",t}function yg(){const i=new mt(1,1,1);return i.translate(0,.5,0),i}function wg(i=20){const t=new le(.5,.5,1,i);return t.translate(0,.5,0),t}function Sg(i=.6){const t=new mt(1,1,1),e=t.getAttribute("position");for(let n=0;n<e.count;n++)e.getY(n)>0&&(e.setX(n,e.getX(n)*i),e.setZ(n,e.getZ(n)*i));return t.translate(0,.5,0),t.computeVertexNormals(),t}function bg(){const i=new mt(1,1,1),t=i.getAttribute("position");for(let e=0;e<t.count;e++)t.getY(e)>0&&(t.setX(e,t.getX(e)*.55+.22),t.setZ(e,t.getZ(e)*.8));return i.translate(0,.5,0),i.computeVertexNormals(),i}function Eg(){const i=new mt(1,.68,1);i.translate(0,.34,0);const t=new Jt,e=.08,n=new Float32Array([-.5-e,.66,-.5-e,0,1,-.5-e,0,1,.5+e,-.5-e,.66,-.5-e,0,1,.5+e,-.5-e,.66,.5+e,.5+e,.66,-.5-e,0,1,.5+e,0,1,-.5-e,.5+e,.66,-.5-e,.5+e,.66,.5+e,0,1,.5+e,-.5,.68,-.5,.5,.68,-.5,0,1,-.5,-.5,.68,.5,0,1,.5,.5,.68,.5]);return t.setAttribute("position",new de(n,3)),t.computeVertexNormals(),ur([i,t])}function Tg(){const i=new mt(1,.68,1);i.translate(0,.34,0);const t=.08,e=[-.5-t,.66,-.5-t],n=[.5+t,.66,-.5-t],s=[.5+t,.66,.5+t],r=[-.5-t,.66,.5+t],o=[-.2,1,0],a=[.2,1,0],c=(d,u,f)=>[...d,...u,...f],l=new Float32Array([...c(e,o,n),...c(n,o,a),...c(n,a,s),...c(s,a,r),...c(r,a,o),...c(r,o,e)]),h=new Jt;return h.setAttribute("position",new de(l,3)),h.computeVertexNormals(),ur([i,h])}function Ag(){const i=new mt(1,1,1);i.translate(0,.5,0);const t=new mt(.5,.65,.6);return t.translate(.55,.325,.25),ur([i,t])}function Cg(){const i=new mt(1,.9,1);i.translate(0,.45,0);const t=new mt(1.02,.1,1.02);return t.translate(0,.95,0),ur([i,t])}function ur(i){const t=[],e=[];for(const s of i){const r=s.index?s.toNonIndexed():s,o=r.getAttribute("position"),a=r.getAttribute("normal");for(let c=0;c<o.count;c++)t.push(o.getX(c),o.getY(c),o.getZ(c)),e.push(a.getX(c),a.getY(c),a.getZ(c))}const n=new Jt;return n.setAttribute("position",new At(t,3)),n.setAttribute("normal",new At(e,3)),n.setAttribute("uv",new At(new Float32Array(t.length/3*2),2)),n}class Rg{group=new Me;lists=new Map;geos;material;count=0;tileSize=1500;tiles=[];shadowDistance=2600;constructor(t){this.material=Mg(t),this.geos={box:yg(),cyl:wg(),frustum:Sg(),shear:bg(),gable:Eg(),hip:Tg(),flat:Ag(),warehouse:Cg(),spire:(()=>{const e=new le(.1,.5,1,6);return e.translate(0,.5,0),e})()}}add(t,e){const n=Math.floor(e.x/this.tileSize),s=Math.floor(e.z/this.tileSize),r=`${t}|${n}|${s}`;let o=this.lists.get(r);o||(o=[],this.lists.set(r,o)),o.push(e),this.count++}build(){const t=new Xt,e=new Se,n=new A,s=new A;for(const[r,o]of this.lists){const a=r.split("|")[0],c=this.geos[a],l=new tn(c,this.material,o.length),h=new Float32Array(o.length*3),d=new Float32Array(o.length*4),u=new gn;o.forEach((v,m)=>{n.set(v.x,v.y,v.z),e.setFromEuler(new ve(0,v.rot,0)),s.set(v.w,v.h,v.d),l.setMatrixAt(m,t.compose(n,e,s)),l.setColorAt(m,v.color),h[m*3]=v.w,h[m*3+1]=v.h,h[m*3+2]=v.d,d[m*4]=v.style,d[m*4+1]=v.floorH,d[m*4+2]=v.seed,d[m*4+3]=v.roof;const p=Math.hypot(v.w,v.d)*.6;u.expandByPoint(new A(v.x-p,v.y,v.z-p)),u.expandByPoint(new A(v.x+p,v.y+v.h,v.z+p))}),c.setAttribute("aDims",new Pi(h,3)),c.setAttribute("aStyle",new Pi(d,4));const f=c.clone();f.setAttribute("aDims",new Pi(h,3)),f.setAttribute("aStyle",new Pi(d,4)),l.geometry=f,f.boundingSphere=u.getBoundingSphere(new In),f.boundingBox=u,l.castShadow=!0,l.receiveShadow=!0,l.instanceMatrix.needsUpdate=!0,l.instanceColor&&(l.instanceColor.needsUpdate=!0),this.group.add(l);const g=u.getCenter(new A);this.tiles.push({mesh:l,cx:g.x,cz:g.z,r:Math.hypot(u.max.x-u.min.x,u.max.z-u.min.z)/2})}}updateLod(t,e){for(const n of this.tiles){const s=Math.max(0,Math.hypot(n.cx-t,n.cz-e)-n.r);n.mesh.castShadow=s<this.shadowDistance}}}const Ei=["#f4efe6","#f7f3ea","#efe4d2","#efe0d3","#f0dccb","#dfe9e6","#d9e6ea","#f3e9c9","#e9e0ea","#ecd6d8","#e2eadb","#ffffff","#e8e8e4","#d6d3cc","#f2f2ef","#e6e2da"],jr=["#dfe6ea","#cfd8dc","#e8e0d4","#f2f2f0","#b9c6cf","#d8cfc2","#c9d6d9","#efe9df"];function Pg(i,t,e){const n=new Rg(e),s=new dn("city"),r=new Uint8Array(2e3*2e3),o=(g,v)=>{const m=Math.floor((g+1e4)/10),p=Math.floor((v+1e4)/10);return m<0||p<0||m>=2e3||p>=2e3?-1:p*2e3+m},a=(g,v,m)=>{const p=Math.ceil(m/10);for(let y=-p;y<=p;y++)for(let _=-p;_<=p;_++){const x=o(g+_*10,v+y*10);x>=0&&(r[x]=1)}},c=(g,v)=>{const m=o(g,v);return m>=0&&r[m]===1},l=[],h=(g,v,m,p,y,_,x,E,b,C,R=5,w)=>{const M=Math.cos(x),L=Math.sin(x);let I=-1/0;for(const[D,N]of[[-p/2,-_/2],[p/2,-_/2],[p/2,_/2],[-p/2,_/2],[0,0]]){const F=v+D*M-N*L,G=m+D*L+N*M;I=Math.max(I,i.heightAt(F,G))}if(w!==void 0&&(I=w),I<.9)return!1;const U=E instanceof Et?E:new Et(E);return n.add(g,{x:v,y:I-.4,z:m,w:p,h:y+.4,d:_,rot:x,color:U,style:b,floorH:C,seed:s.range(0,1e3),roof:R}),a(v,m,Math.max(p,_)*.5+4),!0},d=(g,v,m,p,y)=>{const _=Math.cos(y),x=Math.sin(y);for(const[E,b]of[[-m/2,-p/2],[m/2,-p/2],[m/2,p/2],[-m/2,p/2],[0,0]]){const C=g+E*_-b*x,R=v+E*x+b*_;if(i.heightAt(C,R)<1.2)return!1}return!0};for(const g of i.districts){const v=t.get(g.id),m=Math.cos(g.rot),p=Math.sin(g.rot),y=(x,E)=>[g.cx+x*m-E*p,g.cz+x*p+E*m];if(!v)continue;const _=s.fork(g.id);for(const x of v){let E=function(){const nt=1-Qt(.25,1,q),ot=F>70&&G>70?2:1;for(let lt=0;lt<ot;lt++){const V=_.range(24,Math.min(46,F*.6)),K=_.range(24,Math.min(46,G*.6)),et=ot===1?(I+U)/2:ee(I+V/2,U-V/2,lt),it=(D+N)/2+_.range(-G*.2,G*.2),[at,ht]=y(et,it),ft=ee(g.hMin,g.hMax,Math.pow(_.next(),1.6)*(.35+.65*nt))*(.6+.6*nt);if(!d(at,ht,V,K,g.rot))continue;const Ot=_.next(),xt=Ot<.5?0:Ot<.8?1:3,Vt=xt===0?_.pick(jr):_.pick(Ei),z=xt===0?3.9:3.4;if(ft>60&&_.chance(.7)){const Ft=Math.min(F*.9,V+_.range(10,30)),Bt=Math.min(G*.9,K+_.range(10,30));h("box",at,ht,Ft,_.range(9,18),Bt,g.rot,_.pick(jr),1,3.6)}const ae=_.next();ae<.3&&ft>100?(h("box",at,ht,V,ft*.6,K,g.rot,Vt,xt,z),h("box",at,ht,V*.8,ft*.85,K*.8,g.rot,Vt,xt,z),h("box",at,ht,V*.6,ft,K*.6,g.rot,Vt,xt,z)):ae<.5&&ft>90?(h("box",at,ht,V,ft,K,g.rot,Vt,xt,z),h("frustum",at,ht,V*1.02,ft+_.range(10,25),K*1.02,g.rot,Vt,6,z)):ae<.62&&ft>80?h("cyl",at,ht,Math.min(V,K),ft,Math.min(V,K),g.rot,Vt,xt,z):h("box",at,ht,V,ft,K,g.rot,Vt,xt,z),ft>120&&_.chance(.5)&&h("spire",at,ht,3,_.range(15,40),3,g.rot,"#cfd8dc",6,3,5,i.heightAt(at,ht)+ft),M(at,ht,V,K,ft,g.rot)}if(F>50){const lt=_.range(14,24),V=_.range(14,24),[K,et]=y(I+lt/2,N-V/2);d(K,et,lt,V,g.rot)&&!c(K,et)&&h("box",K,et,lt,_.range(8,20),V,g.rot,_.pick(Ei),1,3.3)}},b=function(){const nt=Math.max(1,Math.round(F*G/1600));for(let ot=0;ot<nt;ot++){const lt=_.range(18,Math.min(42,F*.8)),V=_.range(18,Math.min(42,G*.8)),K=_.range(I+lt/2,U-lt/2),et=_.range(D+V/2,N-V/2),[it,at]=y(K,et);if(!d(it,at,lt,V,g.rot)||c(it,at))continue;const ht=ee(g.hMin,g.hMax,Math.pow(_.next(),2.2)),ft=_.next(),Ot=ft<.35?2:ft<.7?1:ft<.85?3:0;h("box",it,at,lt,ht,V,g.rot+_.range(-.02,.02),_.pick(Ei),Ot,3.3),ht>20&&M(it,at,lt,V,ht,g.rot)}},C=function(){const nt=_.chance(.7),ot=nt?_.range(18,30):_.range(24,40),lt=nt?Math.min(G*.85,_.range(50,95)):_.range(24,40),[V,K]=y((I+U)/2+_.range(-6,6),(D+N)/2);if(!d(V,K,ot,lt,g.rot))return;const et=ee(g.hMin,g.hMax,Math.pow(_.next(),1.5)),it=_.chance(.55)?7:_.chance(.5)?2:0,at=it===0?_.pick(jr):_.pick(Ei);h("box",V,K,ot,et,lt,g.rot,at,it,3.2);const[ht,ft]=y((I+U)/2+ot*.5+12,(D+N)/2);d(ht,ft,18,lt*.7,g.rot)&&h("box",ht,ft,18,_.range(4,9),lt*.7,g.rot,_.pick(Ei),1,3.2),M(V,K,ot,lt,et,g.rot)},R=function(){const nt=_.range(17,24),ot=Math.min(30,G/2-2),lt=[[D+ot/2,0],[N-ot/2,Math.PI]];for(const[V,K]of lt)for(let et=I+nt/2;et<U-nt/2;et+=nt*_.range(.95,1.2)){if(_.next()>g.density+.15)continue;const it=_.range(9,13),at=_.range(10,16),[ht,ft]=y(et,V+(K===0?-1:1)*_.range(-3,3));if(!d(ht,ft,it,at,g.rot))continue;const xt=(_.chance(.35)?2:1)*3.3+1.6,Vt=_.next(),z=Vt<.45?"gable":Vt<.8?"hip":"flat",ae=z==="flat"?2:_.pick([0,0,1,3,4,1]);if(h(z,ht,ft,it,xt,at,g.rot+K+_.range(-.06,.06),_.pick(Ei),5,3,ae),_.chance(.3)){const[Ft,Bt]=y(et,V+(K===0?1:-1)*(at/2+6));d(Ft,Bt,6,4,g.rot)&&n.add("box",{x:Ft,y:i.heightAt(Ft,Bt)-.3,z:Bt,w:_.range(5,9),h:.35,d:_.range(3.5,5),rot:g.rot,color:new Et("#33b9d6"),style:6,floorH:3,seed:_.range(0,100),roof:5})}}},w=function(){const nt=Math.max(1,Math.round(F*G/3600));for(let ot=0;ot<nt;ot++){const lt=_.range(28,Math.min(80,F*.85)),V=_.range(22,Math.min(60,G*.85)),K=_.range(I+lt/2,U-lt/2),et=_.range(D+V/2,N-V/2),[it,at]=y(K,et);!d(it,at,lt,V,g.rot)||c(it,at)||h("warehouse",it,at,lt,_.range(8,15),V,g.rot,_.pick(["#b8bcc0","#9aa3a8","#cfd3d6","#8e9aa0","#d8c9a8"]),4,4)}},M=function(nt,ot,lt,V,K,et){const it=i.heightAt(nt,ot)+K,at=_.int(1,3);for(let ht=0;ht<at;ht++){const ft=_.range(-lt*.3,lt*.3),Ot=_.range(-V*.3,V*.3),xt=Math.cos(et),Vt=Math.sin(et);n.add("box",{x:nt+ft*xt-Ot*Vt,y:it-.2,z:ot+ft*Vt+Ot*xt,w:_.range(2.5,5),h:_.range(1.8,3.2),d:_.range(2.5,4),rot:et,color:new Et("#9da3a6"),style:6,floorH:3,seed:_.range(0,100),roof:5})}K>40&&_.chance(.4)&&n.add("cyl",{x:nt+lt*.25,y:it-.2,z:ot-V*.25,w:3,h:3.5,d:3,rot:et,color:new Et("#c9c9c4"),style:6,floorH:3,seed:_.range(0,100),roof:5})};const L=x.streetWidth*.5+3,I=x.x0+L,U=x.x1-L,D=x.z0+L,N=x.z1-L,F=U-I,G=N-D;if(F<12||G<12||_.next()>g.density)continue;const[O,W]=y((I+U)/2,(D+N)/2),q=Math.hypot(O-g.cx,W-g.cz)/Math.max(g.hw,g.hh);switch(g.zone){case xe.DOWNTOWN:E();break;case xe.RES_MID:b();break;case xe.HOTEL:C();break;case xe.RES_LOW:R();break;case xe.INDUSTRIAL:w();break}}}const u=i.districts.find(g=>g.id==="downtown"),f=(g,v,m,p)=>{const y=Math.cos(u.rot),_=Math.sin(u.rot),x=u.cx+v*y-m*_,E=u.cz+v*_+m*y,b=i.heightAt(x,E);if(b<1)return;const C=p(x,E,b);l.push({x,z:E,h:C,name:g}),a(x,E,40)};return s.fork("landmarks"),f("Meridian Tower",120,-80,(g,v)=>(h("box",g,v,46,150,46,.1,"#d9e2e8",0,3.9),h("box",g,v,38,230,38,.1,"#d9e2e8",0,3.9),h("box",g,v,28,285,28,.1,"#e3eaee",0,3.9),h("spire",g,v,4,45,4,.1,"#e8eef2",6,3,5,i.heightAt(g,v)+285),330)),f("Faro Bahía",-180,40,(g,v)=>(h("cyl",g,v,40,240,40,0,"#cfe0e6",0,3.8),h("cyl",g,v,48,12,48,0,"#e8eef2",6,3,5,i.heightAt(g,v)+232),244)),f("Twin Palms A",40,210,(g,v)=>(h("box",g,v,30,182,56,.05,"#e8e0d4",2,3.3),182)),f("Twin Palms B",110,210,(g,v)=>(h("box",g,v,30,182,56,.05,"#e8e0d4",2,3.3),h("box",g-35,v,44,6,12,.05,"#d9e2e8",0,3.3,5,i.heightAt(g,v)+118),182)),f("The Sail",-60,-250,(g,v)=>(h("shear",g,v,60,205,44,.9,"#bcd3dc",0,3.9),205)),f("Terraces",260,120,(g,v)=>{for(let m=0;m<5;m++)h("box",g+m*6,v-m*4,60-m*8,45+m*28,40,0,"#f2ede4",2,3.3);return 160}),f("Crown Plaza",-300,-180,(g,v)=>{h("box",g,v,42,200,42,.2,"#c9d6d9",0,3.9);for(let m=0;m<4;m++){const p=.2+m*Math.PI/2;h("box",g+Math.cos(p)*14,v+Math.sin(p)*14,3,30,14,p,"#e8eef2",6,3,5,i.heightAt(g,v)+198)}return 230}),f("Helix",330,-240,(g,v)=>{for(let m=0;m<12;m++)h("box",g,v,34,16.5,34,m*.1,"#dbe6ea",0,3.9,5,i.heightAt(g,v)+m*16);return 198}),f("Aquamarine",-380,230,(g,v)=>(h("box",g,v,18,228,62,0,"#b9d6d9",0,3.9),h("box",g,v,62,228,18,0,"#b9d6d9",0,3.9),h("frustum",g,v,24,250,24,0,"#d0e4e6",6,3.9),250)),n.build(),{batches:n,landmarkPositions:l,occupied:c,markOccupied:a}}function Lg(){const e=document.createElement("canvas");e.width=256,e.height=512;const n=e.getContext("2d");n.clearRect(0,0,256,512),n.fillStyle="#8a7458",n.fillRect(256/2,0,256/2,512);for(let o=0;o<512;o+=9)n.fillStyle=o%18===0?"#6e5a44":"#9a8466",n.fillRect(256/2,o,256/2,4);for(let o=0;o<140;o++)n.fillStyle=`rgba(40,30,20,${.1+Math.random()*.2})`,n.fillRect(256/2+Math.random()*256/2,Math.random()*512,3+Math.random()*6,2);n.save(),n.beginPath(),n.rect(0,0,256/2,512),n.clip(),n.translate(0,0),n.strokeStyle="#6b7a3a",n.lineWidth=5,n.beginPath(),n.moveTo(256/4,512),n.lineTo(256/4,8),n.stroke();const s=256/2;for(let o=0;o<46;o++){const a=o/46,c=492-a*472,l=(s/2-4)*(.45+.55*Math.sin(Math.PI*Math.min(1,a*1.15))),h=60+Math.round(40*Math.sin(a*7+o));n.fillStyle=`rgb(${40+o%3*8}, ${110+h*.6}, ${40+o%5*5})`;for(const d of[-1,1])n.beginPath(),n.moveTo(s/2,c),n.quadraticCurveTo(s/2+d*l*.5,c-18,s/2+d*l,c-34+6*Math.sin(o)),n.quadraticCurveTo(s/2+d*l*.55,c-6,s/2,c+4),n.fill()}n.restore();const r=new lr(e);return r.colorSpace=ze,r.anisotropy=4,r}function Dg(i){const n=[],s=[],r=[],o=[],a=i.range(.02,.12),c=i.range(0,Math.PI*2);for(let y=0;y<=4;y++){const _=y/4,x=_,E=a*_*_,b=Math.cos(c)*E,C=Math.sin(c)*E,R=.045*(1-.35*_)*(1+.15*Math.sin(_*20));for(let w=0;w<=5;w++){const M=w/5*Math.PI*2;n.push(b+Math.cos(M)*R,x,C+Math.sin(M)*R),s.push(Math.cos(M),0,Math.sin(M)),r.push(.55+.4*(w/5),_)}}for(let y=0;y<4;y++)for(let _=0;_<5;_++){const x=y*6+_,E=x+5+1;o.push(x,E,x+1,x+1,E,E+1)}const l=new Jt;l.setAttribute("position",new At(n,3)),l.setAttribute("normal",new At(s,3)),l.setAttribute("uv",new At(r,2)),l.setIndex(o);const h=new A(Math.cos(c)*a,1,Math.sin(c)*a),d=[],u=[],f=[],g=[],v=i.int(7,9);let m=0;for(let y=0;y<v;y++){const _=y/v*Math.PI*2+i.range(-.2,.2),x=i.range(.35,.7),E=i.range(.42,.58),b=.13,C=3;for(let R=0;R<=C;R++){const w=R/C,M=E*w,L=h.y+.18*Math.sin(w*Math.PI*.8)-x*w*w,I=h.x+Math.cos(_)*M,U=h.z+Math.sin(_)*M,D=-Math.sin(_)*b*(1-w*.2),N=Math.cos(_)*b*(1-w*.2);if(d.push(I-D,L,U-N,I+D,L,U+N),u.push(0,1,0,0,1,0),f.push(0,1-w,.5,1-w),R>0){const F=m+R*2;g.push(F-2,F,F-1,F-1,F,F+1)}}m+=(C+1)*2}const p=new Jt;return p.setAttribute("position",new At(d,3)),p.setAttribute("normal",new At(u,3)),p.setAttribute("uv",new At(f,2)),p.setIndex(g),Tl([l,p])}function Tl(i){const t=[],e=[],n=[],s=[];for(const o of i){const a=o.index?o.toNonIndexed():o,c=a.getAttribute("position"),l=a.getAttribute("normal"),h=a.getAttribute("uv"),d=a.getAttribute("color");for(let u=0;u<c.count;u++)t.push(c.getX(u),c.getY(u),c.getZ(u)),e.push(l.getX(u),l.getY(u),l.getZ(u)),n.push(h?h.getX(u):0,h?h.getY(u):0),d?s.push(d.getX(u),d.getY(u),d.getZ(u)):s.push(1,1,1)}const r=new Jt;return r.setAttribute("position",new At(t,3)),r.setAttribute("normal",new At(e,3)),r.setAttribute("uv",new At(n,2)),r.setAttribute("color",new At(s,3)),r}function Al(i,t,e,n=1){const s=[];for(let o=0;o<t;o++){const a=new ra(1,n),c=a.getAttribute("position"),l=i.range(0,100);for(let f=0;f<c.count;f++){const g=c.getX(f),v=c.getY(f),m=c.getZ(f),p=1+.22*me(g*2.1+l,v*2.1+m*1.7);c.setXYZ(f,g*p,v*p*e,m*p)}const h=o===0?1:i.range(.55,.85);a.scale(h,h,h);const d=i.range(0,Math.PI*2),u=o===0?0:i.range(.35,.7);a.translate(Math.cos(d)*u,i.range(-.15,.25)*(o===0?0:1),Math.sin(d)*u),a.computeVertexNormals(),s.push(a)}return Cl(s)}function Cl(i){const t=[],e=[];for(const s of i){const r=s.index?s.toNonIndexed():s,o=r.getAttribute("position"),a=r.getAttribute("normal");for(let c=0;c<o.count;c++)t.push(o.getX(c),o.getY(c),o.getZ(c)),e.push(a.getX(c),a.getY(c),a.getZ(c))}const n=new Jt;return n.setAttribute("position",new At(t,3)),n.setAttribute("normal",new At(e,3)),n.setAttribute("uv",new At(new Float32Array(t.length/3*2),2)),n}function Ig(i){const t=new le(.05,.09,.45,5);t.translate(0,.225,0);const e=new Float32Array(t.getAttribute("position").count*3);for(let s=0;s<e.length;s+=3)e[s]=.36,e[s+1]=.27,e[s+2]=.2;t.setAttribute("color",new de(e,3));const n=Al(i,i.int(3,4),i.range(.7,.9),0);return n.scale(.62,.42,.62),n.translate(0,.66,0),Tl([t,n])}function Ug(i){const t=Al(i,2,.45,0);t.scale(.6,.6,.6),t.translate(0,.6,0);const e=[t];for(let n=0;n<3;n++){const s=new le(.02,.03,.5,3),r=n/4*Math.PI*2+i.range(0,.5);s.rotateZ(i.range(-.4,.4)),s.translate(Math.cos(r)*.25,.25,Math.sin(r)*.25),e.push(s)}return Cl(e)}const Ng=`
uniform float uTime;
uniform float uWind;
`,zg=`
{
  // sway grows with height; phase from the instance position so no two plants move together
  vec3 iw = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float phase = iw.x * 0.13 + iw.z * 0.17;
  float sway = sin(uTime * 1.3 + phase) * 0.6 + sin(uTime * 2.7 + phase * 1.9) * 0.4;
  float k = transformed.y * transformed.y * uWind * 0.06;
  transformed.x += sway * k;
  transformed.z += cos(uTime * 1.1 + phase) * k * 0.6;
}
`;function $s(i,t,e){return i.onBeforeCompile=n=>{n.uniforms.uTime=t,n.uniforms.uWind=e,n.vertexShader=n.vertexShader.replace("#include <common>",`#include <common>
${Ng}`).replace("#include <begin_vertex>",`#include <begin_vertex>
${zg}`)},i.customProgramCacheKey=()=>`wind-${i.uuid}`,i}class Fg{group=new Me;materials=[];uTime={value:0};uWind={value:.5};counts={palms:0,trees:0,mangroves:0,shrubs:0};tiles=[];shadowDistance=1800;viewDistance=9e3;constructor(t,e){const n=new dn("vegetation"),s=Lg();$s(new Ct({color:9073752,roughness:.9}),this.uTime,this.uWind);const r=$s(new Ct({map:s,alphaTest:.5,side:Fe,roughness:.75,color:16777215}),this.uTime,this.uWind),o=$s(new Ct({color:16777215,roughness:.85,vertexColors:!0}),this.uTime,this.uWind),a=$s(new Ct({color:16777215,roughness:.9}),this.uTime,this.uWind);new Ct({color:5916210,roughness:.95}),this.materials.push(r,o,a);const c=[0,1,2].map(()=>Dg(n)),l=[0,1,2].map(()=>Ig(n)),h=[0,1,2].map(()=>Ug(n)),d=[],u=[],f=[],g=[],v=["#5e8a3a","#527f31","#6c9a42","#4a7229","#739c46"],m=["#2f5427","#38652b","#274a20","#41702f","#3d6a2e","#2b5224","#4a7434","#30542a"],p=["#284d22","#2f5a27","#23451e","#35602b"],y=11;for(let b=-9500;b<9500;b+=y)for(let C=-9500;C<9500;C+=y){const R=Kr(Math.round(C/y),Math.round(b/y),7),w=C+(Kr(Math.round(C/y),Math.round(b/y),8)-.5)*y,M=b+(Kr(Math.round(C/y),Math.round(b/y),9)-.5)*y,L=t.heightAt(w,M);if(L<.15)continue;const I=t.zoneAt(w,M);if(I===xe.MANGROVE){L>.1&&R<.42&&f.push({x:w,y:L-.1,z:M,s:n.range(6,11),rot:n.range(0,6.28),tint:new Et(n.pick(p)),variant:n.int(0,2)});continue}if(e(w,M))continue;const U=me(w/140,M/140);if(I===xe.BEACH)L>1.2&&R<.09+.08*U&&d.push({x:w,y:L,z:M,s:n.range(7,13),rot:n.range(0,6.28),tint:new Et(n.pick(v)),variant:n.int(0,2)});else if(I===xe.PARK){const D=Math.hypot((w-300)/900,(M-2400)/500)<1?2.6:1,N=(.09+.14*U)*D;R<N*.75?u.push({x:w,y:L,z:M,s:n.range(9,17),rot:n.range(0,6.28),tint:new Et(n.pick(m)),variant:n.int(0,2)}):R<N?d.push({x:w,y:L,z:M,s:n.range(8,14),rot:n.range(0,6.28),tint:new Et(n.pick(v)),variant:n.int(0,2)}):R<N+.02&&g.push({x:w,y:L,z:M,s:n.range(2,4),rot:n.range(0,6.28),tint:new Et(n.pick(m)),variant:n.int(0,2)})}else if(I===xe.RES_LOW){const D=.07+.05*U;R<D*.5?u.push({x:w,y:L,z:M,s:n.range(8,14),rot:n.range(0,6.28),tint:new Et(n.pick(m)),variant:n.int(0,2)}):R<D&&d.push({x:w,y:L,z:M,s:n.range(7,12),rot:n.range(0,6.28),tint:new Et(n.pick(v)),variant:n.int(0,2)})}else if(I===xe.GOLF){const D=.1+.25*Qt(.1,.6,U);R<D*.7?u.push({x:w,y:L,z:M,s:n.range(9,16),rot:n.range(0,6.28),tint:new Et(n.pick(m)),variant:n.int(0,2)}):R<D&&d.push({x:w,y:L,z:M,s:n.range(8,13),rot:n.range(0,6.28),tint:new Et(n.pick(v)),variant:n.int(0,2)})}else I===xe.HOTEL||I===xe.RES_MID?R<.05&&d.push({x:w,y:L,z:M,s:n.range(8,13),rot:n.range(0,6.28),tint:new Et(n.pick(v)),variant:n.int(0,2)}):I===xe.DOWNTOWN?R<.02&&d.push({x:w,y:L,z:M,s:n.range(7,11),rot:n.range(0,6.28),tint:new Et(n.pick(v)),variant:n.int(0,2)}):I===xe.AIRPORT&&R<.01&&u.push({x:w,y:L,z:M,s:n.range(6,10),rot:n.range(0,6.28),tint:new Et(n.pick(m)),variant:n.int(0,2)})}this.counts={palms:d.length,trees:u.length,mangroves:f.length,shrubs:g.length};const _=4e3,x=b=>{const C=new Map;for(const R of b){const w=`${Math.floor(R.x/_)}|${Math.floor(R.z/_)}|${R.variant}`;let M=C.get(w);M||(M=[],C.set(w,M)),M.push(R)}return C},E=(b,C,R=0)=>{for(const[w,M]of x(b)){const L=Number(w.split("|")[2]);for(const I of C){const U=new tn(I.geo(L),I.mat,M.length),D=new Xt,N=new Se,F=new A,G=new A,O=new gn;M.forEach((W,q)=>{F.set(W.x,W.y+R,W.z),N.setFromEuler(new ve(0,W.rot,0)),G.set(W.s,W.s,W.s),U.setMatrixAt(q,D.compose(F,N,G)),I.tint&&U.setColorAt(q,W.tint),O.expandByPoint(new A(W.x-W.s,W.y,W.z-W.s)),O.expandByPoint(new A(W.x+W.s,W.y+W.s*1.3,W.z+W.s))}),U.geometry.boundingSphere=O.getBoundingSphere(new In),U.castShadow=!0,U.receiveShadow=!0,U.instanceMatrix.needsUpdate=!0,this.group.add(U),this.tiles.push({mesh:U,cx:(O.min.x+O.max.x)/2,cz:(O.min.z+O.max.z)/2,r:Math.hypot(O.max.x-O.min.x,O.max.z-O.min.z)/2})}}};E(d,[{geo:b=>c[b],mat:r,tint:!0}]),E(u,[{geo:b=>l[b],mat:o,tint:!0}]),E(f,[{geo:b=>h[b],mat:a,tint:!0}]),E(g,[{geo:b=>l[b],mat:o,tint:!0}],-.3)}update(t,e){this.uTime.value=t,this.uWind.value=e}updateLod(t,e){for(const n of this.tiles){const s=Math.max(0,Math.hypot(n.cx-t,n.cz-e)-n.r);n.mesh.castShadow=s<this.shadowDistance,n.mesh.visible=s<this.viewDistance}}}class Og{constructor(t,e,n,s){this.map=t,this.markOccupied=s,this.mats={concrete:new Ct({color:12170926,roughness:.9}),dark:new Ct({color:3816768,roughness:.8}),white:new Ct({color:15921902,roughness:.6}),steel:new Ct({color:10134701,roughness:.45,metalness:.7}),red:new Ct({color:13123630,roughness:.6}),blue:new Ct({color:3103400,roughness:.6}),green:new Ct({color:3046735,roughness:.6}),orange:new Ct({color:14252074,roughness:.6}),wood:new Ct({color:9136968,roughness:.9}),tank:new Ct({color:14474452,roughness:.5,metalness:.3}),glass:new Ct({color:10470614,roughness:.15,metalness:.8}),grass:new Ct({color:4164142,roughness:.95}),yellow:new Ct({color:14725690,roughness:.6})};for(const o in this.mats)this.materials.push(this.mats[o]);const r=new dn("props");this.buildMarinas(r),this.buildPort(r),this.buildAirport(r),this.buildStadium(),this.buildLighthouse(),this.buildConstruction(r),this.buildLamps(e,n),this.buildSeawalls(),this.flush()}group=new Me;materials=[];lampPositions=[];mooredBoatPositions=[];m=new Xt;q=new Se;p=new A;s=new A;boxes=new Map;cyls=new Map;mats;box(t,e,n,s,r,o,a,c=0,l=0){this.p.set(e,n+o/2,s),this.q.setFromEuler(new ve(l,c,0)),this.s.set(r,o,a);let h=this.boxes.get(t);h||(h=[],this.boxes.set(t,h)),h.push(this.m.compose(this.p,this.q,this.s).clone())}cyl(t,e,n,s,r,o,a=0,c=0){this.p.set(e,n+o/2,s),this.q.setFromEuler(new ve(c,a,0)),this.s.set(r*2,o,r*2);let l=this.cyls.get(t);l||(l=[],this.cyls.set(t,l)),l.push(this.m.compose(this.p,this.q,this.s).clone())}flush(){const t=new mt(1,1,1),e=new le(.5,.5,1,14);for(const[n,s]of this.boxes){const r=new tn(t,this.mats[n],s.length);s.forEach((o,a)=>r.setMatrixAt(a,o)),r.castShadow=!0,r.receiveShadow=!0,r.frustumCulled=!1,this.group.add(r)}for(const[n,s]of this.cyls){const r=new tn(e,this.mats[n],s.length);s.forEach((o,a)=>r.setMatrixAt(a,o)),r.castShadow=!0,r.receiveShadow=!0,r.frustumCulled=!1,this.group.add(r)}}buildMarinas(t){for(const e of this.map.marinas){const n=Math.sin(e.rot),s=-Math.cos(e.rot),r=-s,o=n,a=24,c=(e.piers-1)*a+20;this.box("wood",e.x,.6,e.z,Math.abs(r)*c+Math.abs(n)*3+1,.4,Math.abs(o)*c+Math.abs(s)*3+1,0);for(let l=0;l<e.piers;l++){const h=(l-(e.piers-1)/2)*a,d=e.x+r*h,u=e.z+o*h,f=e.pierLen*t.range(.8,1.1),g=d+n*f/2,v=u+s*f/2;this.box("wood",g,.6,v,2.2,.35,f,e.rot);for(let m=0;m<f;m+=12)for(const p of[-1,1])this.cyl("wood",d+n*m+r*p*1.3,-1.5,u+s*m+o*p*1.3,.18,3.2);for(let m=8;m<f-6;m+=11)for(const p of[-1,1]){const y=d+n*m+r*p*5,_=u+s*m+o*p*5;if(this.box("wood",y,.55,_,Math.abs(r)*8+Math.abs(n)*1+.3,.3,Math.abs(o)*8+Math.abs(s)*1+.3,0),t.chance(.7)){const x=t.range(7,14),E=d+n*(m+5.5)+r*p*6,b=u+s*(m+5.5)+o*p*6;this.mooredBoatPositions.push({x:E,z:b,rot:e.rot+Math.PI/2,len:x})}}}this.box("white",e.x-n*18,this.map.heightAt(e.x-n*18,e.z-s*18),e.z-s*18,14,5,10,e.rot),this.markOccupied(e.x-n*18,e.z-s*18,20)}}buildPort(t){const e=this.map.pois.find(a=>a.kind==="cranes");for(let a=0;a<7;a++){const c=e.x-e.size/2+120+a*210+t.range(-20,20),l=e.z,h=this.map.heightAt(c,l);if(h<1)continue;const d=18,u=42;for(const f of[-1,1])for(const g of[-1,1])this.box("steel",c+f*d/2,h,l+g*6,1.6,u,1.6);this.box("steel",c,h+u,l-4,d+4,3,3),this.box("steel",c,h+u,l+4,d+4,3,3),this.box("orange",c,h+u+3,l+28,3.2,3,62,0,0),this.box("steel",c,h+u+5,l-14,3,3,20),this.box("white",c,h+u-14,l+14,6,4,6);for(let f=0;f<4;f++)for(let g=0;g<6;g++){if(t.chance(.35))continue;const v=c-60+g*14,m=l-60-f*18,p=t.int(1,4);for(let y=0;y<p;y++)this.box(t.pick(["red","blue","green","orange","steel","white"]),v,h+y*2.6,m,12.2,2.6,2.44*2,0)}this.markOccupied(c,l-60,90)}const n=this.map.pois.find(a=>a.kind==="cruise"),s=this.map.heightAt(n.x,n.z);this.box("white",n.x,s,n.z+40,260,12,40),this.box("glass",n.x,s+12,n.z+40,240,4,36),this.markOccupied(n.x,n.z+40,140);const r=n.z-40;this.box("dark",n.x,-1.5,r,290,10,36),this.box("white",n.x,8.5,r,280,28,32);for(let a=0;a<6;a++)this.box("glass",n.x,12+a*3.5,r,276,1.2,33);this.box("white",n.x-30,36,r,90,8,22),this.cyl("dark",n.x-90,36,r,4,14);const o=this.map.pois.find(a=>a.kind==="tanks");for(let a=0;a<9;a++){const c=o.x+a%3*52-52,l=o.z+Math.floor(a/3)*52-52,h=this.map.heightAt(c,l);h<1||(this.cyl("tank",c,h,l,t.range(14,22),t.range(10,16)),this.markOccupied(c,l,26))}}buildAirport(t){const e=this.map.pois.find(l=>l.kind==="terminal"),n=this.map.heightAt(e.x,e.z);this.box("white",e.x,n,e.z,260,14,60),this.box("glass",e.x,n+3,e.z+30.5,250,7,1.2),this.box("steel",e.x,n+14,e.z,270,2,66);for(let l=-1;l<=1;l++)this.box("white",e.x+l*90,n,e.z+90,30,9,120),this.box("steel",e.x+l*90,n+9,e.z+90,32,1.2,122);this.box("dark",e.x,n-.1,e.z+130,520,.4,220),this.cyl("concrete",e.x+220,n,e.z-40,4,38),this.box("glass",e.x+220,n+38,e.z-40,14,5,14,.4),this.box("white",e.x+220,n+43,e.z-40,16,1.5,16,.4);const s=this.map.pois.find(l=>l.kind==="hangars");for(let l=0;l<4;l++){const h=s.x+l*80,d=s.z,u=this.map.heightAt(h,d);this.box("concrete",h,u,d,64,12,50),this.box("steel",h,u+12,d,60,5,40),this.box("steel",h,u+17,d,40,3,30),this.markOccupied(h,d,40)}for(let l=-1;l<=1;l++)for(const h of[-1,1]){const d=e.x+l*90+h*34,u=e.z+110;this.cyl("white",d,n+2.2,u,2.6,38,0,Math.PI/2),this.box("white",d,n+2.5,u+2,34,.8,5,0),this.box("white",d,n+3,u+17,12,.6,3),this.box("white",d,n+4,u+18,.6,9,3),this.cyl("steel",d-9,n+.8,u+4,1.4,4.5,0,Math.PI/2),this.cyl("steel",d+9,n+.8,u+4,1.4,4.5,0,Math.PI/2)}this.markOccupied(e.x,e.z+60,320);const r=this.map.runways.find(l=>l.id==="strip-southkey"),o=(r.a[0]+r.b[0])/2+40,a=(r.a[1]+r.b[1])/2-60,c=this.map.heightAt(o,a);c>1&&(this.box("concrete",o,c,a,26,7,20,.55),this.box("steel",o,c+7,a,24,2.5,16,.55),this.markOccupied(o,a,20))}buildStadium(){const t=this.map.pois.find(o=>o.kind==="stadium"),e=this.map.heightAt(t.x,t.z);if(e<1)return;const n=40,s=t.size,r=t.size*.8;for(let o=0;o<n;o++){const a=o/n*Math.PI*2+t.rot,c=Math.cos(a),l=Math.sin(a),h=t.x+c*s,d=t.z+l*r,u=2*Math.PI*(s+r)/2/n+2,f=Math.atan2(c*r,-l*s);this.box("concrete",h,e,d,u,14,22,f),this.box("concrete",h+c*10,e+14,d+l*10,u,12,16,f),this.box("white",h+c*12,e+26,d+l*12,u,1.5,34,f),this.box("steel",h+c*26,e,d+l*26,1.4,30,1.4)}this.box("grass",t.x,e+.05,t.z,s*1.2,.3,r*1.15,t.rot),this.markOccupied(t.x,t.z,s+40)}buildLighthouse(){const t=this.map.pois.find(n=>n.kind==="lighthouse"),e=this.map.heightAt(t.x,t.z);e<.5||(this.cyl("white",t.x,e,t.z,4.2,28),this.cyl("red",t.x,e+10,t.z,4.25,5),this.cyl("dark",t.x,e+28,t.z,2.4,3.5),this.cyl("white",t.x,e+31.5,t.z,1.6,1.4),this.box("white",t.x+12,e,t.z+6,12,5,9,.3),this.markOccupied(t.x,t.z,20))}buildConstruction(t){for(const e of this.map.districts)if(e.id.startsWith("construction")){const n=this.map.heightAt(e.cx,e.cz);if(n<1)continue;const s=t.int(5,12),r=e.hw*1.2,o=e.hh*1.2;for(let l=1;l<=s;l++)this.box("concrete",e.cx,n+l*3.6,e.cz,r,.4,o,e.rot);for(const[l,h]of[[-.4,-.4],[.4,-.4],[.4,.4],[-.4,.4],[0,0],[0,-.4],[0,.4],[-.4,0],[.4,0]]){const d=Math.cos(e.rot),u=Math.sin(e.rot),f=e.cx+l*r*d-h*o*u,g=e.cz+l*r*u+h*o*d;this.cyl("concrete",f,n,g,.45,s*3.6+.4)}this.box("concrete",e.cx+r*.15,n,e.cz,10,s*3.6+6,8,e.rot);const a=e.cx-r*.6,c=e.cz+o*.6;this.box("yellow",a,n,c,2.2,s*3.6+30,2.2),this.box("yellow",a+20,n+s*3.6+30,c,60,1.6,1.6,.4),this.box("yellow",a-8,n+s*3.6+30,c,14,1.6,1.6,.4);for(let l=0;l<5;l++)this.box(t.pick(["blue","white","orange"]),e.cx+t.range(-r,r)*.7,n,e.cz+o*.85,6,2.6,2.4,e.rot);this.markOccupied(e.cx,e.cz,Math.max(r,o))}}buildLamps(t,e){for(const n of t){if(n.cls!=="highway"&&n.cls!=="arterial"&&n.cls!=="causeway")continue;const s=n.b[0]-n.a[0],r=n.b[1]-n.a[1],o=Math.hypot(s,r),a=s/o,c=r/o;let l=0;for(let h=20;h<o;h+=45,l++){const d=l%2===0?-1:1,u=n.a[0]+a*h+-c*(n.width/2+1)*d,f=n.a[1]+c*h+a*(n.width/2+1)*d,g=this.map.heightAt(u,f);g<.8||this.lampPositions.push(new A(u,g,f))}}for(const n of e)this.lampPositions.push(n.clone());for(const n of this.lampPositions)this.cyl("steel",n.x,n.y,n.z,.12,9),this.box("steel",n.x,n.y+9,n.z,.2,.2,2.4)}buildSeawalls(){const t=this.map.districts.find(s=>s.id==="industrial-port"),e=Math.cos(t.rot),n=Math.sin(t.rot);for(let s=-t.hw;s<=t.hw;s+=6)for(const r of[-1,1]){const o=t.cx+s*e-r*t.hh*n,a=t.cz+s*n+r*t.hh*e;this.box("concrete",o,1.4,a,6.2,2.2,2,t.rot)}}}function Ti(i,t,e){const n=i/2,s=t/2,r=[[-n,-e*.55,0],[n*.55,-e*.55,0],[-n,-e*.1,-s*.95],[-n,-e*.1,s*.95],[n*.35,-e*.15,-s],[n*.35,-e*.15,s],[n,.05,0],[-n,e*.45,-s],[-n,e*.45,s],[n*.4,e*.45,-s*.95],[n*.4,e*.45,s*.95],[n,e*.55,0]],o=[[0,2,4],[0,4,1],[0,1,5],[0,5,3],[1,4,6],[1,6,5],[2,7,9],[2,9,4],[4,9,11],[4,11,6],[3,5,10],[3,10,8],[5,6,11],[5,11,10],[0,3,8],[0,8,7],[0,7,2],[7,8,10],[7,10,9],[9,10,11]],a=[];for(const l of o)for(const h of l)a.push(r[h][0],r[h][1],r[h][2]);const c=new Jt;return c.setAttribute("position",new At(a,3)),c.computeVertexNormals(),c}class Bg{mats={white:new Ct({color:16053488,roughness:.35,metalness:.05}),hullDark:new Ct({color:2042424,roughness:.5}),hullRed:new Ct({color:10104618,roughness:.55}),hullBlue:new Ct({color:2051978,roughness:.5}),teak:new Ct({color:11569754,roughness:.8}),glass:new Ct({color:2241348,roughness:.1,metalness:.9}),sail:new Ct({color:16316142,roughness:.9,side:Fe}),steel:new Ct({color:9213084,roughness:.5,metalness:.6}),containerWhite:new Ct({color:16777215,roughness:.7})};get materials(){return[this.mats.white,this.mats.hullDark,this.mats.hullRed,this.mats.hullBlue,this.mats.teak,this.mats.glass,this.mats.sail,this.mats.steel,this.mats.containerWhite]}build(t,e){const n=new Me,s=(o,a,c,l,h,d=0,u=0,f=0)=>{const g=new zt(o,a);return g.position.set(c,l,h),g.rotation.set(d,u,f),g.castShadow=!0,g.receiveShadow=!0,n.add(g),g},r=e.pick([this.mats.white,this.mats.white,this.mats.hullDark,this.mats.hullBlue,this.mats.hullRed]);switch(t){case"speed":{const o=e.range(7,10),a=o*.3;return s(Ti(o,a,1.4),r,0,.3,0),s(new mt(o*.25,.5,a*.8),this.mats.glass,o*.05,1.05,0,0,0,-.35),s(new mt(o*.35,.35,a*.75),this.mats.teak,-o*.2,.8,0),s(new mt(.6,.6,.8),this.mats.steel,-o*.45,.6,0),{group:n,len:o,beam:a,draft:.5,wakeWidth:a*1.4}}case"console":{const o=e.range(6,8),a=o*.32;s(Ti(o,a,1.3),this.mats.white,0,.3,0),s(new mt(1.2,1.4,1),this.mats.white,0,1.2,0),s(new mt(1.6,.15,1.6),this.mats.hullDark,0,2.3,0);for(const c of[-1,1])s(new le(.04,.04,1.6,6),this.mats.steel,.6*c,1.5,.7*c);return s(new mt(.5,.7,.5),this.mats.hullDark,-o*.45,.7,0),{group:n,len:o,beam:a,draft:.45,wakeWidth:a*1.3}}case"yacht":{const o=e.range(18,32),a=o*.25;return s(Ti(o,a,o*.16),this.mats.white,0,o*.04,0),s(new mt(o*.5,o*.09,a*.8),this.mats.white,-o*.05,o*.13,0),s(new mt(o*.48,o*.04,a*.82),this.mats.glass,-o*.05,o*.135,0),s(new mt(o*.28,o*.07,a*.6),this.mats.white,-o*.12,o*.21,0),s(new mt(o*.26,o*.03,a*.62),this.mats.glass,-o*.12,o*.215,0),s(new mt(o*.06,o*.09,a*.5),this.mats.white,-o*.2,o*.29,0,0,0,.3),s(new le(.15,.15,1.2,8),this.mats.steel,-o*.2,o*.34,0),{group:n,len:o,beam:a,draft:o*.06,wakeWidth:a*1.5}}case"sail":{const o=e.range(9,14),a=o*.31;s(Ti(o,a,o*.14),r,0,o*.03,0),s(new mt(o*.3,.7,a*.6),this.mats.white,-o*.05,o*.09+.3,0);const c=o*1.25;s(new le(.06,.09,c,6),this.mats.steel,o*.05,c/2+o*.08,0);const l=new Jt;l.setAttribute("position",new At([0,0,0,0,c*.9,0,-o*.42,0,0],3)),l.computeVertexNormals(),s(l,this.mats.sail,o*.05,o*.13,0,0,0,0);const h=new Jt;return h.setAttribute("position",new At([0,0,0,0,c*.75,0,o*.4,0,0],3)),h.computeVertexNormals(),s(h,this.mats.sail,o*.05,o*.13,.05,0,0,0),n.rotation.z=.12,{group:n,len:o,beam:a,draft:1.5,wakeWidth:a*.9}}case"ferry":return s(Ti(42,12,5),this.mats.hullBlue,0,1.5,0),s(new mt(42*.8,3.2,12*.9),this.mats.white,-1,4.9,0),s(new mt(42*.78,1.2,12*.92),this.mats.glass,-1,5.2,0),s(new mt(42*.4,2.8,12*.6),this.mats.white,-4,7.8,0),s(new le(.6,.7,3,10),this.mats.hullDark,-12,10.5,0),{group:n,len:42,beam:12,draft:2.2,wakeWidth:12*1.3};case"cargo":{const o=e.range(120,180),a=o*.16,c=o*.075;s(Ti(o,a,c),this.mats.hullDark,0,c*.15,0),s(new mt(o*.9,.8,a*.98),this.mats.hullRed,0,c*.6,0),s(new mt(o*.09,c*1.6,a*.9),this.mats.white,-o*.38,c*.6+c*.8,0),s(new mt(o*.1,2,a*.95),this.mats.glass,-o*.38,c*.6+c*1.55,0),s(new le(1.2,1.5,c*.9,10),this.mats.hullDark,-o*.44,c*.6+c*1.9,0);const l=Math.floor(o*.6/6.4),h=Math.max(3,Math.floor(a/2.6)),d=[];for(let v=0;v<l;v++)for(let m=0;m<h;m++){const p=e.int(1,4);for(let y=0;y<p;y++)d.push({x:o*.3-v*6.4,y:c*.6+.8+1.3+y*2.6,z:(m-(h-1)/2)*2.5,c:e.int(0,5)})}const u=new tn(new mt(6.1,2.6,2.44),this.mats.containerWhite,d.length),f=new Xt,g=[12597547,3049153,2600544,14059792,8227731,15528177].map(v=>new Et(v));return d.forEach((v,m)=>{u.setMatrixAt(m,f.makeTranslation(v.x,v.y,v.z)),u.setColorAt(m,g[v.c])}),u.castShadow=!0,u.receiveShadow=!0,n.add(u),{group:n,len:o,beam:a,draft:c*.5,wakeWidth:a*1.4}}}}}function zc(i){let t=0;for(let e=0;e<i.length-1;e++)t+=Math.hypot(i[e+1][0]-i[e][0],i[e+1][1]-i[e][1]);return t}function kg(i,t,e){let n=0;for(let s=0;s<i.length-1;s++){const r=Math.hypot(i[s+1][0]-i[s][0],i[s+1][1]-i[s][1]);if(t<=n+r||s===i.length-2){const o=Kt((t-n)/r,0,1);e.dx=(i[s+1][0]-i[s][0])/r,e.dz=(i[s+1][1]-i[s][1])/r,e.x=i[s][0]+e.dx*r*o,e.z=i[s][1]+e.dz*r*o;return}n+=r}}function Hg(i){let t=0;for(const o of i)t+=o.getAttribute("position").count;const e=new Float32Array(t*3),n=new Float32Array(t*3);let s=0;for(const o of i){const a=o.getAttribute("position"),c=o.getAttribute("normal");e.set(a.array,s*3),c&&n.set(c.array,s*3),s+=a.count,o.dispose()}const r=new Jt;return r.setAttribute("position",new de(e,3)),r.setAttribute("normal",new de(n,3)),r.computeBoundingSphere(),r}class Vg{constructor(t,e,n,s,r,o){this.map=t,this.wakeScene=s;const a=new dn(`traffic-${r}`),c=new Bg;this.materials.push(...c.materials);for(const D of t.channels){const N=zc(D.pts);for(let F=0;F<D.boats;F++){const G=D.id==="ocean-route"||D.id==="ship-channel"?a.chance(.6)?"cargo":"ferry":a.pick(["speed","speed","console","yacht","sail","speed"]),O=c.build(G,a),W=G==="cargo"?a.range(4,6):G==="ferry"?7:G==="sail"?a.range(2.5,4):G==="yacht"?a.range(5,9):a.range(9,16),q=new Li(G==="cargo"?90:60,O.wakeWidth,G==="cargo"?60:G==="sail"?18:28,G==="sail"?.4:1);s.add(q.mesh),O.group.traverse(nt=>{nt.isMesh&&(nt.castShadow=!0,nt.receiveShadow=!0)}),this.group.add(O.group),this.boats.push({group:O.group,route:D.pts,s:a.range(0,N),dir:a.chance(.5)?1:-1,speed:W,len:O.len,draft:O.draft,wake:q,phase:a.range(0,100)})}}const l=new Map;for(const D of o){const N=c.build(a.chance(.4)?"sail":a.chance(.5)?"speed":a.chance(.5)?"console":"yacht",a),F=Kt(D.len/N.len,.6,1.4);N.group.scale.setScalar(F),N.group.position.set(D.x,.05,D.z),N.group.rotation.y=D.rot+(a.chance(.5)?Math.PI:0),N.group.updateMatrixWorld(!0),N.group.traverse(G=>{const O=G;if(!O.isMesh)return;const W=O.geometry.clone().applyMatrix4(O.matrixWorld),q=O.material;let nt=l.get(q);nt||(nt=[],l.set(q,nt)),nt.push(W.index?W.toNonIndexed():W)})}for(const[D,N]of l){const F=Hg(N),G=new zt(F,D);G.castShadow=!0,G.receiveShadow=!0,this.group.add(G)}this.boatCount=this.boats.length+o.length;const h=new Map;for(const D of t.roads)h.set(D.id,D.pts.map(([N,F])=>new A(N,t.heightAt(N,F)+.25,F)));for(const[D,N]of h){const F=t.roads.find(G=>G.id===D);this.carRoutes.push({pts:N,length:this.len3(N),lanes:F.lanes,width:F.width})}for(const D of n)this.carRoutes.push({pts:D.pts.map(N=>N.clone().add(new A(0,.25,0))),length:this.len3(D.pts),lanes:D.lanes,width:D.width});for(const D of e){if(D.cls!=="street"||a.next()>.35)continue;const N=[new A(D.a[0],t.heightAt(D.a[0],D.a[1])+.25,D.a[1]),new A(D.b[0],t.heightAt(D.b[0],D.b[1])+.25,D.b[1])];this.carRoutes.push({pts:N,length:this.len3(N),lanes:2,width:D.width})}const d=["#e8e8e8","#d0d0d0","#1c1c1e","#8a8f94","#b8352e","#2b4c8c","#d9a441","#3d6b3a","#f2f2f2","#6c6f73","#c94f3d","#20242a"];for(let D=0;D<this.carRoutes.length;D++){const N=this.carRoutes[D],F=t.roads.find(W=>W.pts.length===N.pts.length&&W.pts[0][0]===N.pts[0].x),G=F?F.traffic:N.lanes>=4?10:1.2,O=Math.min(120,Math.round(N.length/1e3*G));for(let W=0;W<O;W++){const q=a.chance(.5)?1:-1;this.cars.push({route:D,s:a.range(0,N.length),dir:q,lane:a.int(0,Math.max(0,Math.floor(N.lanes/2)-1)),speed:a.range(11,26)*(N.lanes>=4?1.2:.8),color:new Et(a.pick(d))})}}this.carCount=this.cars.length;const u=new mt(4.4,1,1.9);u.translate(0,.65,0);const f=new mt(2.2,.75,1.7);f.translate(-.2,1.5,0);const g=new mt(.2,.25,1.6);g.translate(2.2,.8,0);const v=new Ct({color:16777215,roughness:.35,metalness:.4}),m=new Ct({color:1712684,roughness:.15,metalness:.8}),p=new Ct({color:16777215,emissive:16773840,emissiveIntensity:0});this.materials.push(v,m,p),this.carBodies=new tn(u,v,this.cars.length),this.carCabins=new tn(f,m,this.cars.length),this.carLights=new tn(g,p,this.cars.length);for(const D of[this.carBodies,this.carCabins,this.carLights])D.frustumCulled=!1,D.castShadow=!0;this.cars.forEach((D,N)=>this.carBodies.setColorAt(N,D.color)),this.group.add(this.carBodies,this.carCabins,this.carLights);const y=new Ct({color:16054008,roughness:.35,metalness:.2}),_=new Ct({color:2781119,roughness:.4});this.materials.push(y,_);const x=D=>{const N=new Me,F=new zt(new le(1.9,1.9,38,12),y);F.rotation.z=Math.PI/2,N.add(F);const G=new zt(new Qe(1.9,12,8),y);G.position.x=19,G.scale.set(1.6,1,1),N.add(G);const O=new zt(new mt(6,.5,34),y);O.position.set(1,-.8,0),O.rotation.y=0,N.add(O);const W=new zt(new mt(5,.4,16),y);W.position.set(-3,-.8,12),W.rotation.y=-.45,N.add(W);const q=W.clone();q.position.z=-12,q.rotation.y=.45,N.add(q);const nt=new zt(new mt(5,8,.4),_);nt.position.set(-16,4.5,0),nt.rotation.z=-.4,N.add(nt);const ot=new zt(new mt(4,.3,12),y);ot.position.set(-17,1,0),N.add(ot);for(const lt of[-1,1]){const V=new zt(new le(1.1,1,4.5,10),y);V.rotation.z=Math.PI/2,V.position.set(3,-2.4,lt*7),N.add(V)}return N.scale.setScalar(D),N.traverse(lt=>{lt.isMesh&&(lt.castShadow=!0)}),N},E=t.runways[0],b=D=>{const N=ee(4e3,E.a[0],D),F=ee(E.a[1]+30,E.a[1],D),G=ee(900,12,Math.pow(D,.9));return new A(N,G,F)},C=x(1);this.group.add(C),this.aircraft.push({group:C,path:b,period:240,offset:0,contrail:null});const R=x(.9);this.group.add(R),this.aircraft.push({group:R,path:b,period:240,offset:.5,contrail:null});const w=D=>{const N=ee(E.b[0],-9e3,D),F=E.b[1]-3500*D*D;return new A(N,12+2200*Math.pow(D,.8),F)},M=x(1);this.group.add(M),this.aircraft.push({group:M,path:w,period:200,offset:.2,contrail:null});const L=D=>new A(ee(-14e3,14e3,D),9500,ee(-9e3,6e3,D)),I=x(1);this.group.add(I);const U=new Li(180,25,90,.6,Vo);this.aircraft.push({group:I,path:L,period:260,offset:.4,contrail:U})}group=new Me;materials=[];boats=[];carRoutes=[];cars=[];carBodies;carCabins;carLights;aircraft=[];tmp={x:0,z:0,dx:1,dz:0};tmpM=new Xt;tmpQ=new Se;tmpP=new A;tmpS=new A;boatCount=0;carCount=0;len3(t){let e=0;for(let n=0;n<t.length-1;n++)e+=t[n].distanceTo(t[n+1]);return e}point3(t,e,n,s){let r=0;for(let o=0;o<t.length-1;o++){const a=t[o].distanceTo(t[o+1]);if(e<=r+a||o===t.length-2){const c=Kt((e-r)/a,0,1);s.subVectors(t[o+1],t[o]).divideScalar(a),n.copy(t[o]).addScaledVector(s,a*c);return}r+=a}}get contrailMeshes(){return this.aircraft.filter(t=>t.contrail).map(t=>t.contrail.mesh)}update(t,e,n){for(const c of this.boats){const l=zc(c.route);c.s+=c.speed*t*c.dir,c.s>l-5&&(c.s=l-5,c.dir=-1),c.s<5&&(c.s=5,c.dir=1),kg(c.route,c.s,this.tmp);const h=Math.atan2(this.tmp.dx*c.dir,this.tmp.dz*c.dir);c.group.position.set(this.tmp.x,-c.draft*.15+.12*Math.sin(e*1.3+c.phase)*(c.len<20?1:.2),this.tmp.z),c.group.rotation.set(.02*Math.sin(e*1.7+c.phase),h-Math.PI/2,.03*Math.sin(e*1.1+c.phase)+(c.speed>8?-.03:0)),c.speed>9&&(c.group.rotation.x+=0),c.wake.update(this.tmp.x-this.tmp.dx*c.dir*c.len*.4,this.tmp.z-this.tmp.dz*c.dir*c.len*.4,e,!0,c.speed)}const s=new A(0,1,0),r=new A,o=new A,a=new A;for(let c=0;c<this.cars.length;c++){const l=this.cars[c],h=this.carRoutes[l.route];l.s+=l.speed*t*l.dir,l.s>h.length&&(l.s=0),l.s<0&&(l.s=h.length),this.point3(h.pts,l.s,r,o),l.dir<0&&o.negate(),a.crossVectors(o,s).normalize();const d=(h.lanes>=4?1.5+l.lane*3.2:1.8)+0;r.addScaledVector(a,d);const u=Math.atan2(o.x,o.z)-Math.PI/2,f=-Math.asin(Kt(o.y,-1,1));this.tmpQ.setFromEuler(new ve(0,u,f,"YXZ")),this.tmpP.copy(r),this.tmpS.set(1,1,1),this.tmpM.compose(this.tmpP,this.tmpQ,this.tmpS),this.carBodies.setMatrixAt(c,this.tmpM),this.carCabins.setMatrixAt(c,this.tmpM),this.carLights.setMatrixAt(c,this.tmpM)}this.carBodies.instanceMatrix.needsUpdate=!0,this.carCabins.instanceMatrix.needsUpdate=!0,this.carLights.instanceMatrix.needsUpdate=!0,this.carLights.material.emissiveIntensity=6*n,this.carBodies.instanceColor&&(this.carBodies.instanceColor.needsUpdate=!0);for(const c of this.aircraft){const l=(e/c.period+c.offset)%1,h=c.path(l),d=c.path(Math.min(1,l+.002));c.group.position.copy(h);const u=d.clone().sub(h).normalize(),f=Math.atan2(u.x,u.z)-Math.PI/2,g=Math.asin(Kt(u.y,-1,1));c.group.rotation.set(0,f,g*.6,"YXZ"),c.contrail&&(c.contrail.update(h.x,h.z,e,!0,250),c.contrail.mesh.position.y=h.y-2,c.contrail.mesh.updateMatrix())}}}function Fc(i,t=28,e=!0){const n=[],s=[],r=[],o=i.length;let a=0;const c=[0];for(let u=1;u<o;u++)a+=Math.abs(i[u].x-i[u-1].x),c.push(a);for(let u=0;u<o;u++){const f=i[u],g=f.n??2.2,v=f.nBot??g;for(let m=0;m<=t;m++){const p=m/t,y=p*Math.PI*2-Math.PI/2,_=Math.cos(y),x=Math.sin(y),E=x<=0,b=E?g:v,C=Math.sign(_)*Math.pow(Math.abs(_),2/b)*f.w,R=-Math.sign(x)*Math.pow(Math.abs(x),2/b)*(E?f.top:f.bot);n.push(f.x,f.yc+R,C),s.push(c[u]/Math.max(a,1e-6),p)}}const l=i[o-1].x>=i[0].x;for(let u=0;u<o-1;u++)for(let f=0;f<t;f++){const g=u*(t+1)+f,v=g+t+1;l?r.push(g,g+1,v,g+1,v+1,v):r.push(g,v,g+1,g+1,v,v+1)}const h=new Jt;h.setAttribute("position",new At(n,3)),h.setAttribute("uv",new At(s,2)),h.setIndex(r),h.computeVertexNormals();const d=h.getAttribute("normal");for(let u=0;u<o;u++){const f=u*(t+1),g=f+t,v=(d.getX(f)+d.getX(g))/2,m=(d.getY(f)+d.getY(g))/2,p=(d.getZ(f)+d.getZ(g))/2;d.setXYZ(f,v,m,p),d.setXYZ(g,v,m,p)}if(e){for(const u of[0,o-1]){const f=i[u],g=n.length/3;n.push(f.x,f.yc+(f.top-f.bot)*0,0),s.push(u===0?0:1,.5);const v=u*(t+1);for(let m=0;m<t;m++)u===0===l?r.push(g,v+m+1,v+m):r.push(g,v+m,v+m+1)}h.setAttribute("position",new At(n,3)),h.setAttribute("uv",new At(s,2)),h.setIndex(r),h.computeVertexNormals()}return h}function Gg(i=.14,t=.03,e=14){const n=[],s=o=>5*i*(.2969*Math.sqrt(o)-.126*o-.3516*o*o+.2843*o**3-.1036*o**4),r=o=>t*Math.sin(Math.PI*o)*1;for(let o=0;o<=e;o++){const a=1-o/e;n.push(new wt(a,r(a)+s(a)))}for(let o=1;o<e;o++){const a=o/e;n.push(new wt(a,r(a)-s(a)))}return n}function Zs(i,t=8){const e=Gg(i.thickness,.025,12),n=[],s=[],r=[],o=e.length;for(let c=0;c<=t;c++){const l=c/t,h=Math.pow(l,1),d=i.rootChord+(i.tipChord-i.rootChord)*h,u=i.span*l,f=Math.tan(i.dihedral)*u,g=i.sweep*h,v=i.twist*l;for(let m=0;m<=o;m++){const p=e[m%o];let y=(p.x-.3)*d,_=p.y*d;const x=Math.cos(v),E=Math.sin(v),b=y*x-_*E,C=y*E+_*x;y=b,_=C,n.push(-y+g,f+_,u),s.push(m/o,l)}}for(let c=0;c<t;c++)for(let l=0;l<o;l++){const h=c*(o+1)+l,d=h+o+1;r.push(h,d,h+1,h+1,d,d+1)}const a=new Jt;return a.setAttribute("position",new At(n,3)),a.setAttribute("uv",new At(s,2)),a.setIndex(r),a.computeVertexNormals(),a}function Jr(i,t,e,n){const s=new mt(1,1,1),r=s.getAttribute("position");for(let o=0;o<r.count;o++){const a=r.getX(o),c=r.getY(o),l=r.getZ(o),h=l+.5,d=t+(e-t)*h,u=1-.8*(.5-a);r.setXYZ(o,(a-.5)*d,c*n*u,l*i)}return s.computeVertexNormals(),s}function Wg(i,t,e){const s=[],r=[],o=[];for(let c=0;c<=10;c++){const l=c/10,h=l*i,d=t+(e-t)*Math.pow(l,1.4),u=.95-.7*l,f=Math.cos(u),g=Math.sin(u);for(let v=0;v<=4;v++){const m=v/4-.5,p=.08*d*(1-4*m*m),y=m*d,_=p;s.push(y*f-_*g,h,y*g+_*f),o.push(v/4,l)}}for(let c=0;c<10;c++)for(let l=0;l<4;l++){const h=c*5+l,d=h+5;r.push(h,d,h+1,h+1,d,d+1)}const a=new Jt;return a.setAttribute("position",new At(s,3)),a.setAttribute("uv",new At(o,2)),a.setIndex(r),a.computeVertexNormals(),a}function Qr(i,t,e,n,s=8){const r=i.distanceTo(t),o=new le(e,e,r,s),a=new zt(o,n);return a.position.copy(i).add(t).multiplyScalar(.5),a.quaternion.setFromUnitVectors(new A(0,1,0),t.clone().sub(i).normalize()),a.castShadow=!0,a}function Ai(i,t,e,n,s){const r=i.distanceTo(t),o=new le(.5,.5,r,10);o.scale(e,1,n);const a=new zt(o,s);return a.position.copy(i).add(t).multiplyScalar(.5),a.quaternion.setFromUnitVectors(new A(0,1,0),t.clone().sub(i).normalize()),a.castShadow=!0,a}function Ke(i,t){const e=document.createElement("canvas");return e.width=i,e.height=t,[e,e.getContext("2d")]}function un(i,t,e=8){const n=new lr(i);return n.flipY=!1,n.colorSpace=t?ze:An,n.wrapS=Fi,n.wrapT=Fi,n.anisotropy=e,n}function ha(i,t=2){const e=i.width,n=i.height,s=i.getContext("2d").getImageData(0,0,e,n).data,[r,o]=Ke(e,n),a=o.createImageData(e,n),c=(l,h)=>s[((h+n)%n*e+(l+e)%e)*4]/255;for(let l=0;l<n;l++)for(let h=0;h<e;h++){const d=(c(h+1,l)-c(h-1,l))*t,u=(c(h,l+1)-c(h,l-1))*t,f=Math.hypot(d,u,1),g=(l*e+h)*4;a.data[g]=Math.round((-d/f*.5+.5)*255),a.data[g+1]=Math.round((-u/f*.5+.5)*255),a.data[g+2]=Math.round((1/f*.5+.5)*255),a.data[g+3]=255}return o.putImageData(a,0,0),r}function Vi(i,t,e,n,s,r,o="40,35,30"){for(let a=0;a<s;a++){const c=t.range(0,e),l=t.range(0,n),h=t.range(8,60),d=i.createRadialGradient(c,l,0,c,l,h);d.addColorStop(0,`rgba(${o},${r*t.range(.4,1)})`),d.addColorStop(1,`rgba(${o},0)`),i.fillStyle=d,i.fillRect(c-h,l-h,h*2,h*2)}}function ua(i,t,e,n,s,r,o){i.strokeStyle="#5a5a5a",i.lineWidth=2.2,t.strokeStyle="rgba(30,30,35,0.22)",t.lineWidth=1.5;for(const a of s){const c=a*e;i.beginPath(),i.moveTo(c,0),i.lineTo(c,n),i.stroke(),t.beginPath(),t.moveTo(c,0),t.lineTo(c,n),t.stroke();for(const l of[-7,7])for(let h=o/2;h<n;h+=o)i.fillStyle="#b8b8b8",i.beginPath(),i.arc(c+l,h,1.6,0,Math.PI*2),i.fill(),t.fillStyle="rgba(255,255,255,0.10)",t.beginPath(),t.arc(c+l,h,1.4,0,Math.PI*2),t.fill(),t.fillStyle="rgba(0,0,0,0.10)",t.beginPath(),t.arc(c+l,h+1.2,1.2,0,Math.PI*2),t.fill()}for(const a of r){const c=a*n;i.strokeStyle="#6a6a6a",i.lineWidth=1.4,i.beginPath(),i.moveTo(0,c),i.lineTo(e,c),i.stroke(),t.strokeStyle="rgba(30,30,35,0.12)",t.beginPath(),t.moveTo(0,c),t.lineTo(e,c),t.stroke();for(let l=o/2;l<e;l+=o)i.fillStyle="#b0b0b0",i.beginPath(),i.arc(l,c+5,1.5,0,Math.PI*2),i.fill(),t.fillStyle="rgba(0,0,0,0.08)",t.beginPath(),t.arc(l,c+6,1.2,0,Math.PI*2),t.fill()}}const qe={upper:"#f4f0e6",lower:"#f6c236",cheat:"#0f5c6e",pin:"#ff6f61",registration:"N726BV"};function Xg(){const e=new dn("fuselage-paint"),[n,s]=Ke(2048,1024),[r,o]=Ke(2048,1024),[a,c]=Ke(2048,1024);o.fillStyle="#808080",o.fillRect(0,0,2048,1024),s.fillStyle=qe.upper,s.fillRect(0,0,2048,1024);const l=.345;((u,f)=>{s.fillStyle=qe.lower,s.fillRect(0,u*1024,2048,(f-u)*1024)})(l,1-l);for(const u of[0,1]){const f=u===0?l:1-l,g=u===0?-1:1;s.save(),s.beginPath(),s.moveTo(0,f*1024);for(let v=0;v<=2048;v+=32){const m=v/2048,p=Math.max(0,(m-.55)/.45)**2*.09*g;s.lineTo(v,(f+p)*1024)}s.lineTo(2048,(f+.09*g+(u===0?-.05:.05))*1024),s.lineTo(2048,(f+(u===0?-.05:.05))*1024),s.lineTo(0,(f+(u===0?-.045:.045))*1024),s.closePath(),s.fillStyle=qe.cheat,s.fill(),s.lineWidth=6,s.strokeStyle=qe.pin,s.stroke(),s.restore()}s.fillStyle="#2e3136",s.fillRect(0,0,2048*.085,1024),s.fillStyle="#1b1d20";for(let u=0;u<12;u++)s.fillRect(2048*.052,u/12*1024+6,2048*.012,1024/12-12);s.fillStyle=qe.cheat,s.font='bold 118px "Helvetica Neue", Arial, sans-serif',s.textAlign="center",s.save(),s.translate(2048*.72,1024*.235),s.fillText(qe.registration,0,0),s.restore(),s.save(),s.translate(2048*.72,1024*.81),s.scale(-1,1),s.fillText(qe.registration,0,0),s.restore(),s.font="bold 34px Arial",s.fillStyle="#22333a",s.fillText("BAHÍA VISTA AIR TAXI",2048*.62,1024*.31),s.save(),s.translate(2048*.62,1024*.705),s.scale(-1,1),s.fillText("BAHÍA VISTA AIR TAXI",0,0),s.restore(),ua(o,s,2048,1024,[.085,.13,.19,.26,.33,.41,.5,.58,.66,.74,.82,.9],[.12,.2,.3,.42,.5,.58,.7,.8,.88],26),o.strokeStyle="#3a3a3a",o.lineWidth=3,s.strokeStyle="rgba(20,20,25,0.35)",s.lineWidth=2;for(const u of[.19,.66])o.strokeRect(2048*.31,u*1024,2048*.1,.15*1024),s.strokeRect(2048*.31,u*1024,2048*.1,.15*1024),s.fillStyle="#8a8f94",s.fillRect(2048*.395,(u+.09)*1024,22,8);const d=s.createLinearGradient(2048*.09,0,2048*.45,0);d.addColorStop(0,"rgba(25,22,20,0.55)"),d.addColorStop(1,"rgba(25,22,20,0)"),s.fillStyle=d,s.fillRect(2048*.09,1024*.36,2048*.36,1024*.12),Vi(s,e,2048,1024,140,.08);for(let u=0;u<60;u++){const f=e.range(204.8,1843.2),g=e.range(1024*.42,1024*.58);s.strokeStyle=`rgba(40,35,30,${e.range(.05,.2)})`,s.lineWidth=e.range(1,3),s.beginPath(),s.moveTo(f,g),s.lineTo(f+e.range(30,160),g+e.range(-3,3)),s.stroke()}s.fillStyle="rgba(255,255,255,0.05)",s.fillRect(0,0,2048,1024*.12),s.fillRect(0,1024*.88,2048,1024*.12),c.fillStyle="#5a5a5a",c.fillRect(0,0,2048,1024),c.fillStyle="#7a7a7a",c.fillRect(0,0,2048*.085,1024),c.fillStyle="rgba(160,160,160,0.6)",c.fillRect(2048*.09,1024*.36,2048*.3,1024*.12),Vi(c,e,2048,1024,160,.25,"150,150,150");for(let u=0;u<400;u++){c.strokeStyle=`rgba(120,120,120,${e.range(.2,.5)})`,c.lineWidth=1;const f=e.range(0,2048),g=e.range(0,1024);c.beginPath(),c.moveTo(f,g),c.lineTo(f+e.range(-40,40),g+e.range(-6,6)),c.stroke()}return{map:un(n,!0),roughnessMap:un(a,!1),normalMap:un(ha(r,2.4),!1)}}function qg(){const e=new dn("wing-paint"),[n,s]=Ke(1024,1024),[r,o]=Ke(1024,1024),[a,c]=Ke(1024,1024);o.fillStyle="#808080",o.fillRect(0,0,1024,1024),s.fillStyle=qe.upper,s.fillRect(0,0,1024,1024),s.fillStyle=qe.cheat,s.fillRect(0,1024*.9,1024,1024*.1),s.fillStyle=qe.pin,s.fillRect(0,1024*.885,1024,1024*.012),s.fillStyle=qe.lower,s.fillRect(1024*.46,0,1024*.08,1024);const l=[];for(let h=.04;h<1;h+=.075)l.push(h);ua(o,s,1024,1024,[.2,.33,.5,.67,.8],l,22),s.fillStyle="#2a2d31",s.fillRect(1024*.25,1024*.02,1024*.12,1024*.06),s.fillStyle="#6d7277",s.beginPath(),s.arc(1024*.62,1024*.18,9,0,7),s.fill();for(let h=0;h<90;h++)s.fillStyle=`rgba(90,90,95,${e.range(.3,.7)})`,s.fillRect(1024*.48+e.range(-8,8),e.range(0,1024),e.range(1,3),e.range(1,4));return Vi(s,e,1024,1024,80,.06),c.fillStyle="#5a5a5a",c.fillRect(0,0,1024,1024),c.fillStyle="#909090",c.fillRect(1024*.25,1024*.02,1024*.12,1024*.06),Vi(c,e,1024,1024,90,.2,"150,150,150"),{map:un(n,!0),roughnessMap:un(a,!1),normalMap:un(ha(r,2),!1)}}function Yg(){const e=new dn("float-paint"),[n,s]=Ke(1024,512),[r,o]=Ke(1024,512),[a,c]=Ke(1024,512);o.fillStyle="#808080",o.fillRect(0,0,1024,512),s.fillStyle="#cfd3d6",s.fillRect(0,0,1024,512),s.fillStyle="#2b2e31",s.fillRect(0,0,1024,512*.09),s.fillRect(0,512*.91,1024,512*.09),s.fillStyle=qe.cheat,s.fillRect(0,512*.3,1024,512*.03),s.fillRect(0,512*.67,1024,512*.03),s.fillStyle=qe.lower,s.fillRect(0,512*.42,1024,512*.16),ua(o,s,1024,512,[.12,.25,.38,.5,.55,.68,.82,.93],[.09,.3,.5,.7,.91],20);for(let l=0;l<120;l++){s.strokeStyle=`rgba(70,85,75,${e.range(.08,.28)})`,s.lineWidth=e.range(1,4);const h=e.range(0,1024),d=e.range(512*.28,512*.72);s.beginPath(),s.moveTo(h,d),s.lineTo(h+e.range(-10,10),d+e.range(10,60)*(d<512/2?1:-1)),s.stroke()}return Vi(s,e,1024,512,100,.1,"60,60,55"),c.fillStyle="#6a6a6a",c.fillRect(0,0,1024,512),c.fillStyle="#c0c0c0",c.fillRect(0,0,1024,512*.09),c.fillRect(0,512*.91,1024,512*.09),Vi(c,e,1024,512,100,.25,"160,160,160"),{map:un(n,!0),roughnessMap:un(a,!1),normalMap:un(ha(r,2.2),!1)}}function $g(){const[e,n]=Ke(1024,384);n.fillStyle="#1c1e21",n.fillRect(0,0,1024,384);for(let l=0;l<1400;l++){n.strokeStyle=`rgba(255,255,255,${Math.random()*.03})`,n.beginPath();const h=Math.random()*384;n.moveTo(0,h),n.lineTo(1024,h+Math.random()*2),n.stroke()}const s=(l,h,d,u,f,g="#e8e8e8")=>{n.fillStyle="#0b0c0e",n.beginPath(),n.arc(l,h,d,0,Math.PI*2),n.fill(),n.strokeStyle="#3d4146",n.lineWidth=4,n.stroke(),n.strokeStyle=g,n.lineWidth=2;for(let m=0;m<12;m++){const p=-Math.PI*.75+m/11*Math.PI*1.5;n.beginPath(),n.moveTo(l+Math.cos(p)*d*.78,h+Math.sin(p)*d*.78),n.lineTo(l+Math.cos(p)*d*.9,h+Math.sin(p)*d*.9),n.stroke()}n.fillStyle="#d8d8d8",n.font=`${Math.round(d*.26)}px Arial`,n.textAlign="center",n.fillText(u,l,h+d*.5);const v=-Math.PI*.75+f*Math.PI*1.5;n.strokeStyle="#ffffff",n.lineWidth=3,n.beginPath(),n.moveTo(l,h),n.lineTo(l+Math.cos(v)*d*.75,h+Math.sin(v)*d*.75),n.stroke(),n.fillStyle="#c9a227",n.beginPath(),n.arc(l,h,d*.08,0,7),n.fill()};s(110,100,62,"KIAS",.42),s(250,100,62,"ATT",.5,"#4aa3df"),s(390,100,62,"ALT",.3),s(110,250,62,"TURN",.5),s(250,250,62,"HDG",.6),s(390,250,62,"VSI",.5),n.fillStyle="#2f79c2",n.beginPath(),n.arc(250,100,50,Math.PI,0),n.fill(),n.fillStyle="#7a4b23",n.beginPath(),n.arc(250,100,50,0,Math.PI),n.fill(),n.fillStyle="#f5d142",n.fillRect(220,98,60,4),n.fillStyle="#06131c",n.fillRect(500,60,240,170),n.strokeStyle="#3a4a55",n.lineWidth=6,n.strokeRect(500,60,240,170),n.fillStyle="#1d6fa5",n.fillRect(506,66,228,158),n.fillStyle="#7bb661",n.beginPath(),n.ellipse(620,150,60,30,.3,0,7),n.fill(),n.fillStyle="#e6c47a",n.beginPath(),n.ellipse(560,120,26,16,-.2,0,7),n.fill(),n.strokeStyle="#ff77aa",n.lineWidth=3,n.beginPath(),n.moveTo(520,210),n.lineTo(600,150),n.lineTo(700,90),n.stroke(),n.fillStyle="#ffffff",n.font="bold 16px monospace",n.textAlign="left",n.fillText("GS 118  TRK 342  DIS 12.4",512,84),n.fillText("BAHÍA VISTA  RWY 09",512,216),s(830,90,48,"RPM",.62),s(940,90,48,"MAP",.55),s(830,200,40,"OIL",.5,"#7ad07a"),s(940,200,40,"FUEL",.7,"#7ad07a"),s(830,300,36,"AMP",.5),s(940,300,36,"EGT",.55);for(let l=0;l<14;l++){const h=60+l*34,d=330;n.fillStyle="#2b2f34",n.fillRect(h-8,d-14,16,28),n.fillStyle=l%3===0?"#c9a227":"#d8d8d8",n.fillRect(h-4,d-(l%2?10:0),8,10)}n.fillStyle="#c0392b",n.fillRect(560,250,40,40),n.fillStyle="#fff",n.font="11px Arial",n.textAlign="center",n.fillText("FUEL",580,300),n.fillText("CUTOFF",580,312),n.fillStyle="#e8e8e8",n.font="12px Arial",n.fillText("MASTER   AVIONICS   PITOT HEAT   NAV   STROBE   BEACON   LDG   TAXI   FUEL PUMP",300,372);const r=un(e,!0,4);r.flipY=!0;const[o,a]=Ke(1024,384);a.fillStyle="#000",a.fillRect(0,0,1024,384),a.drawImage(e,0,0),a.globalCompositeOperation="multiply",a.fillStyle="#4c4c50",a.fillRect(0,0,1024,384),a.globalCompositeOperation="source-over",a.fillStyle="rgba(0,0,0,0.85)",a.fillRect(0,320,1024,64);const c=un(o,!0,4);return c.flipY=!0,{map:r,emissive:c}}function Zg(){const[t,e]=Ke(256,256),n=e.createRadialGradient(256/2,256/2,256*.08,256/2,256/2,256/2);n.addColorStop(0,"rgba(40,40,44,0.55)"),n.addColorStop(.5,"rgba(40,40,44,0.22)"),n.addColorStop(.92,"rgba(170,150,60,0.22)"),n.addColorStop(1,"rgba(170,150,60,0)"),e.fillStyle=n,e.fillRect(0,0,256,256);const s=new lr(t);return s.colorSpace=ze,s}class Kg{root=new Me;materials=[];glassMaterial;paintMaterial;propeller=new Me;propDisc;aileronL;aileronR;flapL;flapR;elevator;rudder;waterRudders=[];wheels;navRed;navGreen;strobe;beacon;yokeL;yokeR;throttleLever;exhaustPos=new A(2.65,-.45,.42);floatSternL=new A(-2.2,-2.15,-1.25);floatSternR=new A(-2.2,-2.15,1.25);floatBowL=new A(2.6,-2,-1.25);floatBowR=new A(2.6,-2,1.25);wingTipL=new A(.2,1.35,-7.3);wingTipR=new A(.2,1.35,7.3);cockpitEye=new A(1.05,.86,-.36);exteriorMeshes=[];interiorMeshes=[];spanHalf=7.3;constructor(){const t=Xg(),e=qg(),n=Yg(),s=new es({map:t.map,roughnessMap:t.roughnessMap,normalMap:t.normalMap,normalScale:new wt(.55,.55),color:16777215,roughness:1,metalness:0,clearcoat:.7,clearcoatRoughness:.12,envMapIntensity:1}),r=new es({map:e.map,roughnessMap:e.roughnessMap,normalMap:e.normalMap,normalScale:new wt(.5,.5),color:16777215,roughness:1,metalness:0,clearcoat:.65,clearcoatRoughness:.14,envMapIntensity:1}),o=new es({map:n.map,roughnessMap:n.roughnessMap,normalMap:n.normalMap,normalScale:new wt(.6,.6),color:16777215,roughness:1,metalness:.55,clearcoat:.2,clearcoatRoughness:.3,envMapIntensity:1}),a=new es({color:10468816,transparent:!0,opacity:.32,roughness:.03,metalness:0,envMapIntensity:1.4,side:Fe,depthWrite:!1,specularIntensity:1,ior:1.5,clearcoat:1,clearcoatRoughness:.02}),c=new es({color:16052454,roughness:.4,metalness:0,clearcoat:.6,clearcoatRoughness:.15}),l=new Ct({color:9344154,roughness:.38,metalness:.9}),h=new Ct({color:2895667,roughness:.45,metalness:.8}),d=new Ct({color:5917244,roughness:.6,metalness:.9}),u=new Ct({color:1118740,roughness:.92,metalness:0}),f=new Ct({color:9079952,roughness:.85,metalness:0,envMapIntensity:2}),g=new Ct({color:3816770,roughness:.7,envMapIntensity:2}),v=new Ct({color:8017205,roughness:.55}),m=new Ct({color:3485739,roughness:.95}),p=$g(),y=new Ct({map:p.map,emissiveMap:p.emissive,emissive:16777215,emissiveIntensity:.35,roughness:.7}),_=new Ct({color:1974050,roughness:.5,metalness:.6}),x=new Ct({color:15909424,roughness:.5});this.materials.push(s,r,o,a,c,l,h,d,u,f,g,v,m,y,_,x),this.glassMaterial=a,this.paintMaterial=s;const E=(Q,J,Ut=this.root,St=!0)=>{const kt=new zt(Q,J);return kt.castShadow=!0,kt.receiveShadow=!0,Ut.add(kt),St?this.exteriorMeshes.push(kt):this.interiorMeshes.push(kt),kt},C=Fc([{x:4.55,yc:.02,w:.3,top:.3,bot:.3,n:2},{x:4.35,yc:.02,w:.55,top:.55,bot:.55,n:2},{x:3.9,yc:.02,w:.72,top:.72,bot:.7,n:2.1},{x:3.2,yc:.03,w:.75,top:.74,bot:.7,n:2.2},{x:2.6,yc:.04,w:.76,top:.8,bot:.7,n:2.3},{x:2.15,yc:.05,w:.78,top:1.02,bot:.7,n:2.4},{x:1.75,yc:.05,w:.8,top:1.12,bot:.7,n:2.5},{x:.9,yc:.05,w:.8,top:1.13,bot:.7,n:2.5},{x:0,yc:.05,w:.8,top:1.12,bot:.68,n:2.5},{x:-.9,yc:.05,w:.74,top:1.06,bot:.62,n:2.4},{x:-1.6,yc:.06,w:.62,top:.92,bot:.52,n:2.3},{x:-2.6,yc:.1,w:.44,top:.62,bot:.34,n:2.2},{x:-3.7,yc:.16,w:.28,top:.42,bot:.2,n:2.1},{x:-4.7,yc:.24,w:.15,top:.3,bot:.1,n:2},{x:-5.35,yc:.3,w:.06,top:.22,bot:.04,n:2}],36),{body:R,glass:w}=jg(C,(Q,J,Ut)=>{if(Q>1.72&&Q<2.6&&J>.68)return!0;if(Q>-1.45&&Q<=1.72&&J>.36&&J<1&&Math.abs(Ut)>.42){for(const B of[1.72,.85,-.45])if(Math.abs(Q-B)<.05)return!1;return!0}return!1});E(R,s);const M=E(w,a);M.renderOrder=20,M.castShadow=!1,E(new mt(3.6,.06,1.5),m,this.root,!1).position.set(.35,-.55,0);const I=f;for(const Q of[-1,1])E(new mt(3.5,1,.05),I,this.root,!1).position.set(.3,-.12,Q*.77),E(new mt(3.3,.1,.05),I,this.root,!1).position.set(.15,1.02,Q*.72);E(new mt(3.3,.05,1.5),I,this.root,!1).position.set(.15,1.08,0),E(new mt(.06,1.3,1.6),I,this.root,!1).position.set(2.12,.03,0),E(new mt(.06,1.55,1.5),I,this.root,!1).position.set(-1.5,.28,0),E(new mt(.5,.05,1.5),g,this.root,!1).position.set(2.4,.66,0);for(const Q of[1.72,.85,-.45,-1.45])for(const J of[-1,1])E(new mt(.06,.66,.05),g).position.set(Q,.7,J*.74);const G=E(new mt(.94,.035,.035),g);G.position.set(2.17,.92,0),G.rotation.z=-.44;for(const Q of[-1,1])E(new mt(.35,.04,.25),h).position.set(1.2,-.85,Q*.85);for(let Q=0;Q<2;Q++){const J=E(new le(.05,.06,.28,10),d);J.position.set(2.75-Q*.22,-.45,.42+Q*.05),J.rotation.set(.6,0,1.2)}E(new mt(.5,.12,.28),c).position.set(3.7,.72,0);for(let Q=0;Q<2;Q++){const J=E(new mt(.28,.04,.22),c);J.position.set(3,-.62,(Q===0?-1:1)*.35),J.rotation.x=(Q===0?-1:1)*.35}this.propeller.position.set(4.62,.02,0),this.root.add(this.propeller);const W=new zt(new ia(.26,.55,20),l);W.rotation.z=-Math.PI/2,W.position.x=.27,W.castShadow=!0,this.propeller.add(W),this.exteriorMeshes.push(W);const q=new zt(new le(.27,.3,.16,20),h);q.rotation.z=Math.PI/2,q.position.x=-.02,this.propeller.add(q),this.exteriorMeshes.push(q);for(let Q=0;Q<3;Q++){const J=new zt(Wg(1.32,.19,.11),_);J.castShadow=!0;const Ut=new Me;Ut.rotation.x=Q/3*Math.PI*2,J.position.y=.16,Ut.add(J);const St=new zt(new mt(.02,.14,.12),x);St.position.set(0,1.4,0),Ut.add(St),this.propeller.add(Ut),this.exteriorMeshes.push(J)}const nt=new Ct({map:Zg(),transparent:!0,opacity:0,depthWrite:!1,side:Fe,roughness:.6,color:8947848});this.materials.push(nt),this.propDisc=new zt(new na(1.5,40),nt),this.propDisc.rotation.y=Math.PI/2,this.propDisc.position.x=.05,this.propDisc.renderOrder=15,this.propeller.add(this.propDisc);const ot={span:7.3,rootChord:1.95,tipChord:1.35,sweep:-.05,dihedral:.02,thickness:.15,twist:-.03};E(Zs(ot,9),r).position.set(.55,1.22,0);const V=E(Zs(ot,9),r);V.position.set(.55,1.22,0),V.scale.z=-1,E(new mt(2,.22,1.7),c).position.set(.55,1.2,0);const et=(Q,J,Ut,St,kt,B)=>{const pt=new Me,Z=new zt(Jr(Q,J,Ut,.11),B);return Z.castShadow=!0,pt.add(Z),this.exteriorMeshes.push(Z),pt.position.set(.55-.7*1.9+.02,1.22+.02,kt*St),pt.scale.z=kt,this.root.add(pt),pt};this.flapR=et(2.6,.55,.5,.9,1,r),this.flapL=et(2.6,.55,.5,.9,-1,r),this.aileronR=et(3.2,.48,.38,3.6,1,r),this.aileronL=et(3.2,.48,.38,3.6,-1,r),this.navRed=new zt(new Qe(.06,10,8),new Ct({color:16720418,emissive:16718362,emissiveIntensity:3})),this.navRed.position.copy(this.wingTipL),this.root.add(this.navRed),this.navGreen=new zt(new Qe(.06,10,8),new Ct({color:2293572,emissive:1769284,emissiveIntensity:3})),this.navGreen.position.copy(this.wingTipR),this.root.add(this.navGreen),this.materials.push(this.navRed.material,this.navGreen.material);const it=E(new le(.015,.015,.45,6),l);it.rotation.z=Math.PI/2,it.position.set(1.5,1.05,-3.2);const at={span:2.55,rootChord:1.05,tipChord:.7,sweep:-.12,dihedral:0,thickness:.09,twist:0};for(const Q of[-1,1]){const J=E(Zs(at,5),r);J.position.set(-4.25,.42,0),J.scale.z=Q}this.elevator=new Me,this.elevator.position.set(-4.25-.7*1,.44,0),this.root.add(this.elevator);for(const Q of[-1,1]){const J=new zt(Jr(2.5,.42,.3,.09),r);J.scale.z=Q,J.castShadow=!0,this.elevator.add(J),this.exteriorMeshes.push(J)}const ft=E(Zs({span:1.55,rootChord:1.5,tipChord:.75,sweep:-.55,dihedral:0,thickness:.09,twist:0},5),r);ft.position.set(-4.35,.45,0),ft.rotation.x=-Math.PI/2;const Ot=E(new mt(1.4,.32,.08),r);Ot.position.set(-3.4,.55,0),Ot.rotation.z=-.25,this.rudder=new Me,this.rudder.position.set(-4.35-.7*1.5+.05,.45,0),this.root.add(this.rudder);const xt=new zt(Jr(1.5,.6,.4,.1),r);xt.rotation.x=-Math.PI/2,xt.castShadow=!0,this.rudder.add(xt),this.exteriorMeshes.push(xt),this.strobe=new zt(new Qe(.05,8,6),new Ct({color:16777215,emissive:16777215,emissiveIntensity:0})),this.strobe.position.set(-5,2,0),this.root.add(this.strobe),this.beacon=new zt(new Qe(.06,8,6),new Ct({color:16724787,emissive:16720384,emissiveIntensity:0})),this.beacon.position.set(-1,1.36,0),this.root.add(this.beacon),this.materials.push(this.strobe.material,this.beacon.material);const Vt=E(new le(.01,.01,.5,5),l);Vt.position.set(-2,.9,0),Vt.rotation.z=.5;const ae=Fc([{x:2.95,yc:-1.85,w:.06,top:.08,bot:.06,n:2},{x:2.6,yc:-1.9,w:.2,top:.15,bot:.18,n:2.2,nBot:1.5},{x:1.9,yc:-1.95,w:.33,top:.18,bot:.28,n:2.6,nBot:1.4},{x:.8,yc:-1.95,w:.37,top:.19,bot:.32,n:2.8,nBot:1.4},{x:-.2,yc:-1.95,w:.37,top:.19,bot:.3,n:2.8,nBot:1.4},{x:-.35,yc:-1.95,w:.36,top:.19,bot:.22,n:2.8,nBot:1.5},{x:-1.3,yc:-1.92,w:.33,top:.18,bot:.2,n:2.7,nBot:1.6},{x:-2.3,yc:-1.86,w:.25,top:.15,bot:.12,n:2.5,nBot:1.8},{x:-2.75,yc:-1.8,w:.12,top:.1,bot:.05,n:2.2}],20);for(const Q of[-1,1]){const J=E(ae.clone(),o);J.position.z=Q*1.25,E(new Qe(.09,10,8),u).position.set(2.98,-1.85,Q*1.25);const St=-1.76,kt=-.62;this.root.add(Ai(new A(1.6,St,Q*1.25),new A(1.4,kt,Q*.55),.14,.05,l)),this.root.add(Ai(new A(-.9,St,Q*1.25),new A(-.7,kt,Q*.5),.14,.05,l)),this.root.add(Qr(new A(1.6,St,Q*1.25),new A(-.7,kt,Q*.5),.025,l)),this.root.add(Qr(new A(-.9,St,Q*1.25),new A(1.4,kt,Q*.55),.025,l)),this.root.add(Ai(new A(1.3,St+.1,Q*1.3),new A(1.05,1.1,Q*2.9),.12,.045,l)),this.root.add(Ai(new A(-.2,St+.1,Q*1.3),new A(-.05,1.1,Q*2.9),.12,.045,l)),this.root.add(Qr(new A(1.05,1.08,Q*2.9),new A(-.05,1.08,Q*2.9),.03,l));const B=new Me;B.position.set(-2.7,-1.85,Q*1.25);const pt=new zt(new mt(.22,.32,.03),h);pt.position.y=-.18,B.add(pt),this.exteriorMeshes.push(pt),this.root.add(B),this.waterRudders.push(B);for(const Z of[2,.4,-1.4])E(new mt(.14,.05,.05),l).position.set(Z,St+.03,Q*1.25+.2*Q)}this.root.add(Ai(new A(1.6,-1.72,-1.25),new A(1.6,-1.72,1.25),.1,.06,l)),this.root.add(Ai(new A(-.9,-1.72,-1.25),new A(-.9,-1.72,1.25),.1,.06,l)),this.wheels=new Me,this.root.add(this.wheels);const Ft=new ls(.2,.09,8,16),Bt=new le(.12,.12,.12,12);for(const Q of[-1,1])for(const[J,Ut]of[[-.9,1],[2.3,.7]]){const St=new zt(Ft,u);St.scale.setScalar(Ut),St.position.set(J,-2.28,Q*1.25),St.castShadow=!0,this.wheels.add(St);const kt=new zt(Bt,l);kt.scale.setScalar(Ut),kt.rotation.x=Math.PI/2,kt.position.copy(St.position),this.wheels.add(kt)}E(new mt(.16,.42,1.36),g,this.root,!1).position.set(2,.55,0);const ie=E(new Yn(1.34,.4),y,this.root,!1);ie.position.set(1.915,.56,0),ie.rotation.y=-Math.PI/2,E(new mt(.5,.04,1.4),g,this.root,!1).position.set(2.15,.78,0),E(new mt(.7,.32,.22),g,this.root,!1).position.set(1.7,-.36,0),this.throttleLever=E(new mt(.04,.22,.03),new Ct({color:2236962,roughness:.6}),this.root,!1),this.throttleLever.position.set(1.75,-.1,-.04),E(new mt(.04,.2,.03),new Ct({color:12597547,roughness:.6}),this.root,!1).position.set(1.72,-.1,.04);const X=Q=>{const J=new Me,Ut=new zt(new le(.02,.02,.5,8),h);Ut.rotation.z=Math.PI/2,Ut.position.x=.25,J.add(Ut);const St=new zt(new ls(.15,.02,8,24,Math.PI*1.3),g);St.rotation.set(Math.PI*.85,Math.PI/2,0),J.add(St);const kt=new zt(new mt(.03,.03,.26),g);return J.add(kt),J.position.set(1.55,.25,Q),this.root.add(J),this.interiorMeshes.push(J),J};this.yokeL=X(-.35),this.yokeR=X(.35);const tt=new mt(.5,.12,.5),rt=new mt(.1,.55,.5);for(const[Q,J]of[[1,-.36],[1,.36],[-.2,-.36],[-.2,.36],[-1,0]]){E(tt,v,this.root,!1).position.set(Q,-.2,J);const St=E(rt,v,this.root,!1);St.position.set(Q-.25,.12,J),St.rotation.z=.15,E(new mt(.4,.3,.4),h,this.root,!1).position.set(Q,-.42,J)}const j=new Ct({color:3100527,roughness:.85}),bt=new Ct({color:13145452,roughness:.7}),ut=new Ct({color:1710620,roughness:.5});this.materials.push(j,bt,ut),E(new mt(.28,.5,.42),j,this.root,!1).position.set(.95,.12,-.36),E(new Qe(.11,12,10),bt,this.root,!1).position.set(.98,.5,-.36);const ct=E(new ls(.115,.018,6,16,Math.PI),ut,this.root,!1);ct.position.set(.98,.53,-.36),ct.rotation.set(0,Math.PI/2,0);for(const Q of[-1,1]){const J=E(new le(.045,.045,.03,10),ut,this.root,!1);J.position.set(.98,.5,-.36+Q*.12),J.rotation.x=Math.PI/2}for(const Q of[-1,1]){const J=E(new le(.04,.045,.5,8),j,this.root,!1);J.position.set(1.25,.2,-.36+Q*.16),J.rotation.z=Math.PI/2-.35}for(const Q of[-.5,-.2,.2,.5]){const J=E(new mt(.12,.18,.08),h,this.root,!1);J.position.set(1.9,-.36,Q),J.rotation.z=.5}E(new mt(.6,.05,.4),g,this.root,!1).position.set(1.3,1.1,0),E(new mt(.08,.07,.09),g,this.root,!1).position.set(2.05,.82,0);for(const Q of this.materials)Q.isMeshStandardMaterial&&(Q.envMapIntensity=1)}animate(t,e,n,s,r,o,a,c,l){this.aileronR.rotation.z=-e*.35,this.aileronL.rotation.z=e*.35,this.flapR.rotation.z=s*.6,this.flapL.rotation.z=s*.6,this.elevator.rotation.z=t*.4,this.rudder.rotation.y=-n*.45;for(const u of this.waterRudders)u.rotation.y=-n*.5;this.propeller.rotation.x+=r*2600*(Math.PI*2/60)*o;const h=this.propDisc.material;h.opacity=el.clamp((r-.15)*1.6,0,.75);for(const u of this.propeller.children)u!==this.propDisc&&(u.visible=r<.55);const d=a%1.2<.06||(a+.15)%1.2<.06;this.strobe.material.emissiveIntensity=d?30:0,this.beacon.material.emissiveIntensity=2+12*Math.max(0,Math.sin(a*4.5)),this.navRed.material.emissiveIntensity=2+6*c,this.navGreen.material.emissiveIntensity=2+6*c,this.wheels.visible=l,this.wheels.position.y=l?0:.3,this.yokeL.rotation.x=e*.8,this.yokeR.rotation.x=e*.8,this.yokeL.position.x=1.55-t*.08,this.yokeR.position.x=1.55-t*.08}}function jg(i,t){const e=i.getAttribute("position"),n=i.getAttribute("normal"),s=i.getAttribute("uv"),r=i.getIndex(),o=[],a=[];for(let l=0;l<r.count;l+=3){const h=r.getX(l),d=r.getX(l+1),u=r.getX(l+2),f=(e.getX(h)+e.getX(d)+e.getX(u))/3,g=(e.getY(h)+e.getY(d)+e.getY(u))/3,v=(e.getZ(h)+e.getZ(d)+e.getZ(u))/3;(t(f,g,v)?a:o).push(h,d,u)}const c=l=>{const h=new Jt;return h.setAttribute("position",e.clone()),h.setAttribute("normal",n.clone()),h.setAttribute("uv",s.clone()),h.setIndex(l),h};return{body:c(o),glass:c(a)}}const Oc=9.81;class Jg{constructor(t){this.heightAt=t}position=new A(0,.3,0);quaternion=new Se;velocity=new A;omega=new A;rpm=0;telemetry={airspeed:0,groundSpeed:0,altitude:0,agl:0,verticalSpeed:0,heading:0,alpha:0,beta:0,stalled:!1,onWater:!1,onGround:!1,rpm:0,gForce:1,gearDown:!0,shake:0,bank:0,pitchAngle:0};mass=2350;wingArea=26;span=14.6;chord=1.65;maxThrust=7400;inertia=new A(3200,7400,5600);wind=new A;turbulence=.3;gearDown=!0;gust=new A;time=0;buffet=0;tmpV=new A;tmpV2=new A;invQ=new Se;contactPoints=[new A(2.6,-2.2,-1.25),new A(2.6,-2.2,1.25),new A(-.35,-2.24,-1.25),new A(-.35,-2.24,1.25),new A(-2.3,-2.15,-1.25),new A(-2.3,-2.15,1.25),new A(-.9,-2.35,-1.25),new A(-.9,-2.35,1.25)];reset(t,e,n,s,r){this.position.set(t,e,n),this.quaternion.setFromEuler(new ve(0,s,0));const o=new A(1,0,0).applyQuaternion(this.quaternion);this.velocity.copy(o).multiplyScalar(r),this.omega.set(0,0,0),this.rpm=r>5?.7:.2}forward(t){return t.set(1,0,0).applyQuaternion(this.quaternion)}up(t){return t.set(0,1,0).applyQuaternion(this.quaternion)}step(t,e){if(e<=0){this.updateTelemetry(t);return}const n=Math.max(1,Math.ceil(e/(1/120))),s=e/n;for(let r=0;r<n;r++)this.substep(t,s);this.updateTelemetry(t)}substep(t,e){this.time+=e;const n=Kt(t.throttle,0,1);this.rpm+=(n*.92+.08-this.rpm)*Kt(e/.7,0,1);const s=this.time*.35,r=me(s,1.3)*1,o=me(s*1.7,7.1)*.6,a=me(s*1.3,3.7)*1,c=this.turbulence*(1+2.5*(1-Qt(20,220,this.position.y)))*2.4;this.gust.set(r,o,a).multiplyScalar(c),this.invQ.copy(this.quaternion).invert();const l=this.tmpV.copy(this.velocity).sub(this.wind).sub(this.gust),h=this.tmpV2.copy(l).applyQuaternion(this.invQ),d=Math.max(h.length(),.5),u=Math.atan2(-h.y,Math.max(h.x,.1)),f=Math.asin(Kt(h.z/d,-1,1)),g=1.2*Math.exp(-this.position.y/9e3),v=.5*g*d*d,m=this.wingArea,p=Kt(t.flaps,0,1),y=.27-p*.03;let _=.32+p*.55+5.4*u;const x=1.7+p*.5;let E=!1;if(u>y){const Rt=u-y;_=x-Rt*3.5+Math.max(0,Rt-.25)*2,_=Math.max(_,.55),E=!0}else u<-.22&&(_=Math.max(_,-.9));_=Math.min(_,x),this.buffet=ee(this.buffet,E?1:Qt(y-.05,y,u)*.5,Kt(e*6,0,1));const b=.034+.048*_*_+p*.05+(this.gearDown?.012:0)+(E?.12:0),C=-.9*f,R=v*m*_,w=v*m*b,M=v*m*C,L=h.clone().normalize(),I=new A(-L.y,L.x,0).normalize();I.lengthSq()<.5&&I.set(0,1,0);const U=new A;U.addScaledVector(L,-w),U.addScaledVector(I,R),U.z+=M;const D=this.maxThrust*Kt((this.rpm-.08)/.92,0,1)*Kt(1-d/120,.2,1)*(g/1.2);U.x+=D;const N=this.omega.x,F=this.omega.y,G=this.omega.z,O=this.span,W=this.chord,q=2*Math.max(d,3),nt=Kt(t.pitch,-1,1),ot=Kt(t.roll,-1,1),lt=Kt(t.yaw,-1,1),V=.04-1.3*u-18*(G*W/q)+.8*nt*(1-.3*p)-.08*p,K=-.45*(N*O/q)+.14*ot-.08*f-.08*(F*O/q),et=-.1*f-.16*(F*O/q)-.075*lt+.012*ot-.02*(N*O/q),it=new A(v*m*O*K,v*m*O*et,v*m*W*V);E&&(it.x+=v*m*O*.02*Math.sin(this.time*17)*this.buffet,it.z-=v*m*W*.03*this.buffet),it.x+=400*c*me(this.time*2.1,9.9),it.z+=300*c*me(this.time*1.9,4.4);let at=!1,ht=!1;const ft=new A,Ot=new A,xt=new A,Vt=this.heightAt(this.position.x,this.position.z)>.05;this.gearDown=Vt&&this.position.y<60||this.position.y<8&&Vt;for(const Rt of this.contactPoints){Ot.copy(Rt).applyQuaternion(this.quaternion).add(this.position);const ie=this.heightAt(Ot.x,Ot.z),It=ie<=.05,P=It?0:ie,S=Rt.y<-2.3;if(It&&S||!It&&!S&&this.gearDown)continue;const X=P-Ot.y;if(X<=0)continue;xt.copy(this.omega).applyQuaternion(this.quaternion).cross(this.tmpV.copy(Ot).sub(this.position)).add(this.velocity);let tt,rt;if(It){at=!0;const bt=Math.hypot(xt.x,xt.z),ut=Qt(6,20,bt),Mt=Rt.x>1,qt=Rt.x<-1;tt=(qt?16e3:Mt?12e3:18e3)*(qt?1-.9*ut:Mt?1-.7*ut:1-.3*ut)*Math.min(X,.9)+4e4*Math.max(X-.35,0)**2-1800*xt.y*(1-.5*ut),rt=-(22*bt*bt*(1-ut*.9)+90*bt)*Math.min(X/.3,1)/6,qt||(tt+=2600*ut*Math.min(X/.3,1))}else{ht=!0,tt=52e3*Math.min(X,.5)-2600*xt.y;const ut=Math.hypot(xt.x,xt.z);rt=-(t.brake?.45:.03)*Math.max(tt,0)*Math.sign(ut)*Math.min(ut,1);const qt=new A(0,0,1).applyQuaternion(this.quaternion),ct=xt.dot(qt);ft.copy(qt).multiplyScalar(-ct*900),this.applyForce(ft,Ot,e)}tt=Math.max(tt,0),ft.set(0,tt,0);const j=Math.hypot(xt.x,xt.z);if(j>.01&&ft.add(this.tmpV.set(xt.x/j,0,xt.z/j).multiplyScalar(rt)),this.applyForce(ft,Ot,e),It){const bt=new A(0,-lt*260*Math.min(j/6,1),0);this.omega.add(bt.multiplyScalar(e/this.inertia.y))}}const z=U.applyQuaternion(this.quaternion);z.y-=this.mass*Oc,this.velocity.addScaledVector(z,e/this.mass),this.position.addScaledVector(this.velocity,e),this.omega.x+=it.x/this.inertia.x*e,this.omega.y+=it.y/this.inertia.y*e,this.omega.z+=it.z/this.inertia.z*e,(at||ht)&&this.omega.multiplyScalar(1-1.6*e);const ae=new Se(this.omega.x*e*.5,this.omega.y*e*.5,this.omega.z*e*.5,1).normalize();this.quaternion.multiply(ae).normalize();const Ft=this.heightAt(this.position.x,this.position.z),Bt=Math.max(Ft,0)+1.55;this.position.y<Bt&&(this.position.y=Bt,this.velocity.y<0&&(this.velocity.y*=-.1),this.velocity.multiplyScalar(1-2.5*e)),this.telemetry.alpha=u,this.telemetry.beta=f,this.telemetry.stalled=E&&d>12,this.telemetry.onWater=at,this.telemetry.onGround=ht,this.telemetry.shake=Kt(this.buffet*.6+c*.08+Qt(55,95,d)*.35,0,1)}applyForce(t,e,n){this.velocity.addScaledVector(t,n/this.mass);const r=this.tmpV.copy(e).sub(this.position).cross(t);r.applyQuaternion(this.invQ),this.omega.x+=r.x/this.inertia.x*n,this.omega.y+=r.y/this.inertia.y*n,this.omega.z+=r.z/this.inertia.z*n}updateTelemetry(t){const e=this.telemetry,n=this.forward(this.tmpV);e.airspeed=this.tmpV2.copy(this.velocity).sub(this.wind).length(),e.groundSpeed=Math.hypot(this.velocity.x,this.velocity.z),e.altitude=this.position.y,e.agl=this.position.y-Math.max(0,this.heightAt(this.position.x,this.position.z)),e.verticalSpeed=this.velocity.y,e.heading=(Math.atan2(n.x,-n.z)*180/Math.PI+360)%360,e.rpm=this.rpm,e.gearDown=this.gearDown;const s=this.up(this.tmpV2);e.bank=Math.atan2(-s.dot(new A(1,0,0).crossVectors(new A(0,1,0),n).normalize()),s.y);const r=new A(0,0,1).applyQuaternion(this.quaternion);e.bank=Math.asin(Kt(-r.y,-1,1)),e.pitchAngle=Math.asin(Kt(n.y,-1,1)),e.gForce=1+this.omega.z*e.airspeed/Oc*.5}}function Qg(){const i=document.createElement("canvas");i.width=i.height=64;const t=i.getContext("2d"),e=t.createRadialGradient(32,32,0,32,32,32);return e.addColorStop(0,"rgba(255,255,255,1)"),e.addColorStop(.4,"rgba(255,255,255,0.55)"),e.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=e,t.fillRect(0,0,64,64),new lr(i)}class Bc{constructor(t,e,n,s,r){this.capacity=t,this.positions=new Float32Array(t*3),this.alphas=new Float32Array(t),this.sizes=new Float32Array(t),this.geo=new Jt,this.geo.setAttribute("position",new de(this.positions,3)),this.geo.setAttribute("aAlpha",new de(this.alphas,1)),this.geo.setAttribute("aSize",new de(this.sizes,1));const o=new Ae({uniforms:{uTex:{value:n},uColor:{value:e},uOpacity:{value:s},uScale:{value:1}},vertexShader:`
        attribute float aAlpha; attribute float aSize; varying float vAlpha;
        uniform float uScale;
        void main() { vAlpha = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / max(-mv.z, 0.5); }
      `,fragmentShader:`
        uniform sampler2D uTex; uniform vec3 uColor; uniform float uOpacity; varying float vAlpha;
        void main() { vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(uColor, t.a * vAlpha * uOpacity); }
      `,transparent:!0,depthWrite:!1,blending:r});this.points=new tm(this.geo,o),this.points.frustumCulled=!1,this.geo.setDrawRange(0,0)}points;particles=[];positions;alphas;sizes;geo;emit(t){this.particles.length>=this.capacity&&this.particles.shift(),this.particles.push(t)}update(t,e,n,s){this.points.material.uniforms.uScale.value=s;let r=0;for(let o=this.particles.length-1;o>=0;o--){const a=this.particles[o];if(a.age+=t,a.age>=a.life){this.particles.splice(o,1);continue}a.vy-=e*t;const c=Math.exp(-n*t);a.vx*=c,a.vy*=c,a.vz*=c,a.x+=a.vx*t,a.y+=a.vy*t,a.z+=a.vz*t,a.y<.05&&e>0&&(a.y=.05,a.vy=0);const l=a.age/a.life;this.positions[r*3]=a.x,this.positions[r*3+1]=a.y,this.positions[r*3+2]=a.z,this.alphas[r]=Math.sin(l*Math.PI)*(1-l*.5),this.sizes[r]=a.size*(.6+l*1.2),r++}this.geo.attributes.position.needsUpdate=!0,this.geo.attributes.aAlpha.needsUpdate=!0,this.geo.attributes.aSize.needsUpdate=!0,this.geo.setDrawRange(0,r)}}class tv{wakeL;wakeR;spray;exhaust;vortexL;vortexR;tmp=new A;tmp2=new A;sprayAcc=0;exhaustAcc=0;constructor(t,e){this.wakeL=new Li(70,1.6,14,1.2),this.wakeR=new Li(70,1.6,14,1.2),t.add(this.wakeL.mesh,this.wakeR.mesh);const n=Qg();this.spray=new Bc(400,new Et(.95,.98,1),n,.75,Pn),this.exhaust=new Bc(120,new Et(.25,.24,.23),n,.22,Pn),e.add(this.spray.points,this.exhaust.points),this.vortexL=new Li(90,.5,2.2,.6,Vo),this.vortexR=new Li(90,.5,2.2,.6,Vo),e.add(this.vortexL.mesh,this.vortexR.mesh)}update(t,e,n,s,r){const o=t.telemetry,a=t.quaternion,c=o.groundSpeed,l=this.tmp.copy(e.floatSternL).applyQuaternion(a).add(t.position),h=this.tmp2.copy(e.floatSternR).applyQuaternion(a).add(t.position),d=o.onWater&&c>1.5;if(this.wakeL.update(l.x,l.z,s,d,c),this.wakeR.update(h.x,h.z,s,d,c),o.onWater&&c>4){const v=90*Qt(4,14,c)*(1-.5*Qt(25,40,c));this.sprayAcc+=v*n;const m=t.forward(new A);for(;this.sprayAcc>=1;){this.sprayAcc-=1;for(const p of[e.floatBowL,e.floatBowR]){const y=this.tmp.copy(p).applyQuaternion(a).add(t.position),_=p.z>0?1:-1,x=new A(0,0,1).applyQuaternion(a);this.spray.emit({x:y.x,y:.1,z:y.z,vx:m.x*c*.35+x.x*_*(2+Math.random()*3)+(Math.random()-.5)*2,vy:2.5+Math.random()*3.5+c*.08,vz:m.z*c*.35+x.z*_*(2+Math.random()*3)+(Math.random()-.5)*2,life:.7+Math.random()*.6,age:0,size:.6+Math.random()*.8})}}}if(this.spray.update(n,9.81,1.2,r*.9),o.rpm>.2){this.exhaustAcc+=(10+25*o.rpm)*n;const v=t.forward(new A);for(;this.exhaustAcc>=1;){this.exhaustAcc-=1;const m=this.tmp.copy(e.exhaustPos).applyQuaternion(a).add(t.position);this.exhaust.emit({x:m.x,y:m.y,z:m.z,vx:t.velocity.x-v.x*6+(Math.random()-.5),vy:t.velocity.y-1.5+Math.random()*1.5,vz:t.velocity.z-v.z*6+(Math.random()-.5),life:.35+Math.random()*.3,age:0,size:.35+Math.random()*.3})}}this.exhaust.update(n,-.3,2.5,r*.9);const u=Kt((o.alpha-.13)/.12,0,1)*Qt(35,55,o.airspeed),f=this.tmp.copy(e.wingTipL).applyQuaternion(a).add(t.position),g=this.tmp2.copy(e.wingTipR).applyQuaternion(a).add(t.position);this.vortexL.update(f.x,f.z,s,u>.05,o.airspeed),this.vortexR.update(g.x,g.z,s,u>.05,o.airspeed),this.vortexL.mesh.position.y=f.y,this.vortexL.mesh.updateMatrix(),this.vortexR.mesh.position.y=g.y,this.vortexR.mesh.updateMatrix(),this.vortexL.mesh.material.uniforms.uStrength.value=u*.7,this.vortexR.mesh.material.uniforms.uStrength.value=u*.7}}class ev{model=new Kg;flight;effects;inputs={throttle:0,pitch:0,roll:0,yaw:0,flaps:0,brake:!1};constructor(t,e,n){this.flight=new Jg(t),this.effects=new tv(n,e),e.add(this.model.root)}place(t,e,n,s,r,o,a,c){this.flight.position.set(t,e,n);const l=Math.atan2(Math.cos(s),Math.sin(s)),h=new ve(0,0,0,"YZX");h.set(o,l,r,"YZX"),this.flight.quaternion.setFromEuler(h);const d=new A(1,0,0).applyQuaternion(this.flight.quaternion);this.flight.velocity.copy(d).multiplyScalar(a),this.flight.omega.set(0,0,0),this.flight.rpm=c,this.inputs.throttle=c,this.flight.step(this.inputs,0),this.syncModel()}syncModel(){this.model.root.position.copy(this.flight.position),this.model.root.quaternion.copy(this.flight.quaternion)}update(t,e,n,s,r,o,a){this.flight.wind.copy(s),this.flight.turbulence=r,a&&this.flight.step(this.inputs,t),this.syncModel();const c=this.flight.telemetry;this.model.animate(this.inputs.pitch,this.inputs.roll,this.inputs.yaw,this.inputs.flaps,c.rpm,t,e,n,c.gearDown),this.effects.update(this.flight,this.model,t,e,o)}}class nv{constructor(t){this.camera=t}mode="chase";pos=new A;vel=new A;lookTarget=new A;tmp=new A;tmp2=new A;q=new Se;smoothQ=new Se;time=0;initialised=!1;baseFov=50;shakeScale=1;orbitYaw=0;orbitPitch=0;chaseDistance=25;chaseHeight=6.5;snap(){this.initialised=!1}update(t,e,n){this.time+=n;const s=this.camera,r=t.telemetry,o=r.shake*this.shakeScale;if(this.mode==="fixed")return;if(this.mode==="cockpit"){const x=this.tmp.copy(e.cockpitEye).applyQuaternion(t.quaternion).add(t.position);this.q.copy(t.quaternion),this.initialised||(this.smoothQ.copy(this.q),this.initialised=!0),this.smoothQ.slerp(this.q,1-Math.exp(-n*14));const E=new Se().setFromEuler(new ve(0,-Math.PI/2,0));s.quaternion.copy(this.smoothQ).multiply(E);const b=new Se().setFromEuler(new ve(-this.orbitPitch*.6,this.orbitYaw*1.2,0,"YXZ"));s.quaternion.multiply(b);const C=o*.012;x.x+=me(this.time*9.1,1.1)*C,x.y+=me(this.time*11.3,2.7)*C,x.z+=me(this.time*8.7,5.3)*C,s.position.copy(x),s.fov=this.baseFov+12,s.updateProjectionMatrix();return}const a=t.forward(this.tmp),c=Math.atan2(a.x,a.z),l=r.airspeed,h=this.chaseDistance+l*.08,d=this.chaseHeight+l*.012,u=new Se().setFromEuler(new ve(this.orbitPitch,c+this.orbitYaw,0,"YXZ")),f=this.tmp2.set(0,d,-h).applyQuaternion(u).add(t.position);this.initialised||(this.pos.copy(f),this.vel.set(0,0,0),this.initialised=!0);const g=60,v=2*.9*Math.sqrt(60);f.addScaledVector(t.velocity,v/g);const m=this.tmp.copy(f).sub(this.pos).multiplyScalar(g).addScaledVector(this.vel,-v);this.vel.addScaledVector(m,n),this.pos.addScaledVector(this.vel,n),this.pos.y<1.2&&(this.pos.y=1.2);const p=this.lookTarget.copy(t.position).addScaledVector(a,6).add(new A(0,1.2,0));s.position.copy(this.pos);const y=o*.35;s.position.x+=me(this.time*13,.3)*y,s.position.y+=me(this.time*15,4.3)*y,s.position.z+=me(this.time*12,8.3)*y,s.up.set(0,1,0),s.lookAt(p);const _=r.bank;s.rotateZ(-_*.18),s.fov=this.baseFov+Qt(30,90,l)*6,s.updateProjectionMatrix()}}class iv{constructor(t){this.renderer=t;const n=t.getContext().getExtension("EXT_disjoint_timer_query_webgl2");if(n&&(this.gpuExt=n),"PerformanceObserver"in window)try{new PerformanceObserver(r=>{this.longTasks+=r.getEntries().length}).observe({entryTypes:["longtask"]})}catch{}}times=[];lastStart=0;longTasks=0;gpuQuery=null;gpuExt=null;lastGpuMs=null;visibleObjects=0;beginFrame(){this.lastStart=performance.now();const t=this.renderer.getContext();this.gpuExt&&!this.gpuQuery&&(this.gpuQuery=t.createQuery(),t.beginQuery(this.gpuExt.TIME_ELAPSED_EXT,this.gpuQuery))}endFrame(){const t=performance.now()-this.lastStart;this.times.push(t),this.times.length>600&&this.times.shift();const e=this.renderer.getContext();if(this.gpuExt&&this.gpuQuery){e.endQuery(this.gpuExt.TIME_ELAPSED_EXT);const n=this.gpuQuery;setTimeout(()=>{const s=e.getQueryParameter(n,e.QUERY_RESULT_AVAILABLE),r=e.getParameter(this.gpuExt.GPU_DISJOINT_EXT);s&&!r&&(this.lastGpuMs=e.getQueryParameter(n,e.QUERY_RESULT)/1e6),e.deleteQuery(n)},0),this.gpuQuery=null}}reset(){this.times.length=0,this.longTasks=0}snapshot(){const t=this.times.slice().sort((l,h)=>l-h),e=t.length||1,n=t.reduce((l,h)=>l+h,0)/e,s=t[Math.min(t.length-1,Math.floor(t.length*.99))]??0,r=t.slice(Math.floor(t.length*.99)),o=r.length?r.reduce((l,h)=>l+h,0)/r.length:n,a=this.renderer.info,c=performance.memory;return{frames:t.length,avgMs:n,p99Ms:s,minFps:t.length?1e3/(t[t.length-1]||1):0,avgFps:n?1e3/n:0,onePercentLowFps:o?1e3/o:0,calls:a.render.calls,triangles:a.render.triangles,points:a.render.points,lines:a.render.lines,geometries:a.memory.geometries,textures:a.memory.textures,programs:a.programs?.length??0,jsHeapMB:c?c.usedJSHeapSize/1048576:null,gpuMs:this.lastGpuMs,longTasks:this.longTasks,visibleObjects:this.visibleObjects}}}const sv={low:{samples:0,shadowMapSize:1024,cascades:2,cloudSteps:10,skyScale:.35,shadowFar:1500,anisotropy:2,bloom:!0},medium:{samples:2,shadowMapSize:2048,cascades:3,cloudSteps:16,skyScale:.5,shadowFar:2500,anisotropy:4,bloom:!0},high:{samples:4,shadowMapSize:2048,cascades:3,cloudSteps:24,skyScale:.6,shadowFar:3500,anisotropy:8,bloom:!0},ultra:{samples:4,shadowMapSize:4096,cascades:4,cloudSteps:32,skyScale:1,shadowFar:5e3,anisotropy:16,bloom:!0}};class rv{constructor(t,e){this.canvas=t,this.params=e,this.quality=sv[e.quality],this.renderer=new jp({canvas:t,antialias:!1,powerPreference:"high-performance",logarithmicDepthBuffer:!0,alpha:!1,stencil:!1,preserveDrawingBuffer:!0}),this.renderer.outputColorSpace=oi,this.renderer.toneMapping=Ln,this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=Hc,this.renderer.autoClear=!0,this.renderer.info.autoReset=!1,this.camera=new Ye(50,16/9,.4,6e4),this.atmos=new bm(e.seed),e.time!==null&&(this.atmos.hour=e.time),e.weather&&this.atmos.setWeather(e.weather),this.metrics=new iv(this.renderer)}renderer;scene=new fs;camera;atmos;quality;metrics;map;textures;terrain;water;sky;wakes;csm;post;roads;bridges;city;vegetation;props;traffic;aircraft;flightCamera;lampMesh;width=1;height=1;time=0;envTimer=0;lastEnvHour=-1;litMaterials=new Set;windVec=new A;registerLit(t){if(this.litMaterials.has(t))return;this.litMaterials.add(t);const e=t.onBeforeCompile;this.csm.setupMaterial(t);const n=t.onBeforeCompile;t.onBeforeCompile=(s,r)=>{n.call(t,s,r),e?.call(t,s,r)},t.needsUpdate=!0}registerTree(t){t.traverse(e=>{const n=e.material;if(n)for(const s of Array.isArray(n)?n:[n])s.isMeshStandardMaterial&&this.registerLit(s)})}async tick(t,e,n){t(e,n),await new Promise(s=>setTimeout(s,0))}async init(t){await this.tick(t,"Surveying the coastline",.02),this.map=new Om,this.map.generate(f=>t("Shaping islands and bays",.02+f*.3)),await this.tick(t,"Uploading terrain",.33),this.textures=new Ym(this.map,this.renderer);const e=this.quality;this.csm=new ym({camera:this.camera,parent:this.scene,cascades:e.cascades,maxFar:e.shadowFar,mode:"practical",shadowMapSize:e.shadowMapSize,lightDirection:new A(.3,-1,.2).normalize(),lightIntensity:1,shadowBias:-2e-4,lightMargin:300}),this.csm.fade=!0,this.sky=new qm(this.atmos,this.renderer,{cloudSteps:e.cloudSteps,scale:e.skyScale}),this.scene.add(this.sky.dome),this.wakes=new og(1024,3200),this.terrain=new tg(this.textures),this.registerLit(this.terrain.material),this.scene.add(this.terrain.group),this.water=new rg(this.textures,this.wakes.texture),this.registerLit(this.water.material),this.scene.add(this.water.mesh),await this.tick(t,"Laying out streets",.4);const n=fg(this.map);this.roads=n.segments;const s=vg();this.registerLit(s);const r=this.params.debugRoads?new jo({color:16719904}):s;for(const f of gg(this.map,this.roads,r))this.scene.add(f);await this.tick(t,"Raising bridges",.46);const o=new Ct({color:12104874,roughness:.9}),a=new Ct({color:14278114,roughness:.4,metalness:.6});this.registerLit(o),this.registerLit(a),this.bridges=xg(this.map,r,o,a),this.scene.add(this.bridges.group),await this.tick(t,"Building the city",.52),this.city=Pg(this.map,n.blocksByDistrict,this.atmos.uniforms.uNight),this.registerLit(this.city.batches.material),this.scene.add(this.city.batches.group);for(const f of this.roads){const g=Math.hypot(f.b[0]-f.a[0],f.b[1]-f.a[1]),v=Math.max(1,Math.ceil(g/10));for(let m=0;m<=v;m++)this.city.markOccupied(f.a[0]+(f.b[0]-f.a[0])*(m/v),f.a[1]+(f.b[1]-f.a[1])*(m/v),f.width*.5+3)}await this.tick(t,"Dressing harbours and airports",.66),this.props=new Og(this.map,this.roads,this.bridges.lampPositions,this.city.markOccupied);for(const f of this.props.materials)this.registerLit(f);this.scene.add(this.props.group);const c=new Qe(.22,8,6),l=new Ct({color:16777215,emissive:16767392,emissiveIntensity:0});this.lampMesh=new tn(c,l,this.props.lampPositions.length);const h=new Xt;this.props.lampPositions.forEach((f,g)=>this.lampMesh.setMatrixAt(g,h.makeTranslation(f.x,f.y+9.05,f.z))),this.lampMesh.frustumCulled=!1,this.scene.add(this.lampMesh),await this.tick(t,"Planting palms and mangroves",.74),this.vegetation=new Fg(this.map,this.city.occupied);for(const f of this.vegetation.materials)this.registerLit(f);this.scene.add(this.vegetation.group),await this.tick(t,"Launching boats and traffic",.86),this.traffic=new Vg(this.map,this.roads,this.bridges.routes,this.wakes.scene,this.params.seed,this.props.mooredBoatPositions);for(const f of this.traffic.materials)this.registerLit(f);this.scene.add(this.traffic.group);for(const f of this.traffic.contrailMeshes)this.scene.add(f);await this.tick(t,"Pre-flighting the aircraft",.92),this.aircraft=new ev((f,g)=>this.map.heightAt(f,g),this.scene,this.wakes.scene),this.registerTree(this.aircraft.model.root),this.flightCamera=new nv(this.camera);const d=this.map.pois.find(f=>f.kind==="seaplane");this.aircraft.place(d.x+120,1.6,d.z+60,Math.PI*.5,0,0,0,0),this.post=new dg(this.renderer,this.atmos,{samples:e.samples,bloom:e.bloom});const u=this.params.dbg;u.has("noterrain")&&(this.terrain.group.visible=!1),u.has("noshadow")&&(this.renderer.shadowMap.enabled=!1),u.has("noveg")&&(this.vegetation.group.visible=!1),u.has("nocity")&&(this.city.batches.group.visible=!1),u.has("nocloudshadow")&&(this.post.cloudShadowStrength=0),this.atmos.update(0),this.refreshEnvironment(),t("Ready",1)}refreshEnvironment(){const t=this.sky.updateEnvironment();this.scene.environment=t,this.scene.environmentIntensity=this.atmos.state.ambientIntensity,this.lastEnvHour=this.atmos.hour}setSize(t,e,n=1){this.width=t,this.height=e,this.renderer.setPixelRatio(n),this.renderer.setSize(t,e,!1),this.camera.aspect=t/e,this.camera.updateProjectionMatrix(),this.post.setSize(Math.round(t*n),Math.round(e*n)),this.csm.updateFrustums()}update(t,e=!0){this.time+=t,this.atmos.update(t);const n=this.atmos.state;this.csm.lightDirection.copy(n.sunDir).negate();for(const r of this.csm.lights)r.intensity=n.sunIntensity,r.color.copy(n.sunColor);this.envTimer+=t,(Math.abs(this.atmos.hour-this.lastEnvHour)>.02||this.envTimer>5)&&(this.envTimer=0,this.refreshEnvironment()),this.scene.environmentIntensity=n.ambientIntensity;const s=this.atmos.preset;this.windVec.set(this.atmos.windDir.x,0,this.atmos.windDir.y).multiplyScalar(s.windSpeed),this.vegetation.update(this.time,s.windSpeed),this.traffic.update(t,this.time,n.night),this.lampMesh.material.emissiveIntensity=8*n.night,this.aircraft.update(t,this.time,n.night,this.windVec,s.turbulence,this.height,e)}render(){this.metrics.beginFrame(),this.renderer.info.reset();const t=this.camera;t.updateMatrixWorld();const e=t.position.x,n=t.position.z;this.terrain.update(e,n),this.vegetation.updateLod(e,n),this.city.batches.updateLod(e,n),this.water.update(e,n,this.time,this.atmos.preset.windSpeed,this.atmos.windDir,this.atmos.state.sunDir,this.wakes.center,this.wakes.size),this.wakes.render(this.renderer,e,n);const s=Math.min(12e3,Math.max(this.quality.shadowFar,t.position.y*9));Math.abs(s-this.csm.maxFar)>200&&(this.csm.maxFar=s,this.csm.updateFrustums()),this.csm.update();for(const r of this.csm.lights){const o=r.shadow.camera,a=(o.right-o.left)/r.shadow.mapSize.width;r.shadow.normalBias=a*1.5,r.shadow.bias=-2e-4}this.sky.render(this.renderer,t,this.post.width,this.post.height),this.renderer.setRenderTarget(this.post.target),this.renderer.render(this.scene,t),this.post.finish(t,this.time),this.metrics.endFrame()}}class ov{constructor(t){this.canvas=t,window.addEventListener("keydown",e=>{e.repeat||(this.keys.add(e.code),this.pressed.add(e.code),["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)&&e.preventDefault())}),window.addEventListener("keyup",e=>this.keys.delete(e.code)),window.addEventListener("blur",()=>this.keys.clear()),t.addEventListener("mousedown",e=>{this.dragging=!0,this.lastX=e.clientX,this.lastY=e.clientY}),window.addEventListener("mouseup",()=>{this.dragging=!1}),window.addEventListener("mousemove",e=>{this.dragging&&(this.orbitYaw-=(e.clientX-this.lastX)*.006,this.orbitPitch+=(e.clientY-this.lastY)*.005,this.orbitPitch=Math.max(-1.2,Math.min(1.2,this.orbitPitch)),this.lastX=e.clientX,this.lastY=e.clientY)}),t.addEventListener("wheel",e=>{this.flight.throttle=Math.max(0,Math.min(1,this.flight.throttle-Math.sign(e.deltaY)*.05)),e.preventDefault()},{passive:!1})}keys=new Set;flight={throttle:0,pitch:0,roll:0,yaw:0,flaps:0,brake:!1};targetPitch=0;targetRoll=0;targetYaw=0;orbitYaw=0;orbitPitch=0;dragging=!1;lastX=0;lastY=0;pressed=new Set;enabled=!0;down(t){return this.keys.has(t)}consume(t){const e=this.pressed.has(t);return this.pressed.delete(t),e}update(t){if(!this.enabled){this.pressed.clear();return}const e=this.flight,n=(c,l)=>(this.down(c)?1:0)-(this.down(l)?1:0);this.targetPitch=n("KeyS","KeyW")+n("ArrowDown","ArrowUp"),this.targetRoll=n("KeyD","KeyA")+n("ArrowRight","ArrowLeft"),this.targetYaw=n("KeyE","KeyQ");const s=navigator.getGamepads?navigator.getGamepads():[],r=s&&s[0];if(r){const c=l=>Math.abs(l)<.08?0:l;this.targetRoll+=c(r.axes[0]??0),this.targetPitch+=c(r.axes[1]??0),this.targetYaw+=c(r.axes[2]??0),r.buttons[7]?.value&&(e.throttle=Math.min(1,e.throttle+r.buttons[7].value*t*.8)),r.buttons[6]?.value&&(e.throttle=Math.max(0,e.throttle-r.buttons[6].value*t*.8))}const o=c=>Math.max(-1,Math.min(1,c)),a=1-Math.exp(-t*9);e.pitch+=(o(this.targetPitch)-e.pitch)*a,e.roll+=(o(this.targetRoll)-e.roll)*a,e.yaw+=(o(this.targetYaw)-e.yaw)*a,(this.down("ShiftLeft")||this.down("ShiftRight"))&&(e.throttle=Math.min(1,e.throttle+t*.55)),(this.down("ControlLeft")||this.down("ControlRight"))&&(e.throttle=Math.max(0,e.throttle-t*.55)),this.consume("KeyF")&&(e.flaps=e.flaps>.5?0:e.flaps>0?1:.5),e.brake=this.down("KeyB")||this.down("Space"),this.dragging||(this.orbitYaw*=Math.exp(-t*2.2),this.orbitPitch*=Math.exp(-t*2.2))}}const Xe=i=>document.getElementById(i);class av{root=Xe("hud");speed=Xe("hud-speed-val");alt=Xe("hud-alt-val");vs=Xe("hud-vs-val");heading=Xe("hud-heading-val");card=Xe("hud-heading-card");thrFill=Xe("hud-throttle-fill");thrVal=Xe("hud-throttle-val");rpm=Xe("hud-rpm-val");stall=Xe("hud-stall");msg=Xe("hud-msg");cam=Xe("hud-cam");time=Xe("hud-time");visible=!0;msgTimer=0;show(t){this.visible=t,this.root.classList.toggle("hidden",!t)}toggle(){this.show(!this.visible)}flash(t,e=2.5){this.msg.textContent=t,this.msgTimer=e}update(t,e,n,s,r){if(!this.visible)return;this.speed.textContent=Math.round(t.airspeed*1.9438).toString(),this.alt.textContent=Math.round(t.altitude*3.2808).toString();const o=Math.round(t.verticalSpeed*196.85/50)*50;this.vs.textContent=(o>0?"+":"")+o.toString();const a=Math.round(t.heading)%360;this.heading.textContent=a.toString().padStart(3,"0");const c=["N","NE","E","SE","S","SW","W","NW"];this.card.textContent=c[Math.round(a/45)%8],this.thrFill.style.width=`${Math.round(e*100)}%`,this.thrVal.textContent=`${Math.round(e*100)}%`,this.rpm.textContent=Math.round(600+t.rpm*2e3).toString(),this.stall.classList.toggle("hidden",!t.stalled),this.cam.textContent=n.toUpperCase();const l=Math.floor(s)%24,h=Math.floor(s%1*60);this.time.textContent=`${l.toString().padStart(2,"0")}:${h.toString().padStart(2,"0")}`,this.msgTimer>0&&(this.msgTimer-=r,this.msgTimer<=0&&(this.msg.textContent=""))}}const da=[{id:"aerial-a",name:"Reference A — high aerial",description:"Reference-style wide aerial over Isla Garza looking north: causeway receding NNE, downtown skyline upper-left, boats with wakes below, aircraft lower right.",time:14.6,weather:"scattered",camera:{mode:"fixed",pos:[380,470,3950],headingDeg:-6,pitchDeg:-13,fov:42},plane:{fromCamera:{screenX:.8,screenY:.76,distance:78},headingDeg:-34,pitchDeg:3,bankDeg:-10,speed:52,throttle:.75},presim:40,clipInputs:{pitch:.05,roll:-.05,yaw:0}},{id:"cockpit-city",name:"Cockpit approaching the city",description:"From the pilot seat, downtown ahead beyond the bay, instrument panel and windshield frame in view.",time:10.5,weather:"clear",camera:{mode:"cockpit",fov:50},plane:{pos:[-900,320,1400],headingDeg:342,pitchDeg:1,bankDeg:0,speed:58,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"bridge-low",name:"Low-altitude bridge flyover",description:"Chase view 45 m over the northern causeway arch, traffic on the deck, piers meeting the water.",time:15.5,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[-1950,52,-3740],headingDeg:96,pitchDeg:0,bankDeg:4,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:.05,yaw:0}},{id:"skyline-high",name:"High-altitude skyline",description:"Fixed camera 900 m up over the bay looking north-west at the downtown skyline hierarchy, port in the middle distance.",time:16.2,weather:"scattered",camera:{mode:"fixed",pos:[-300,900,-1200],headingDeg:-38,pitchDeg:-10,fov:45},plane:{fromCamera:{screenX:.72,screenY:.68,distance:70},headingDeg:-30,pitchDeg:0,bankDeg:12,speed:60,throttle:.7},presim:30,clipInputs:{pitch:0,roll:.1,yaw:0}},{id:"island-pass",name:"Coastal island pass",description:"Low along the barrier island ocean beach: hotels left, surf and shallows right, dunes and palms below.",time:11.5,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[3350,130,-2200],headingDeg:352,pitchDeg:0,bankDeg:-6,speed:52,throttle:.65},presim:30,clipInputs:{pitch:0,roll:-.05,yaw:0}},{id:"harbor",name:"Harbor and marina pass",description:"Over the port: container cranes, cruise terminal, ship channel and the downtown marina beyond.",time:9.5,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[-2100,160,-2500],headingDeg:52,pitchDeg:0,bankDeg:0,speed:50,throttle:.65},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"water-landing",name:"Seaplane water approach",description:"Final approach a few metres above the Garza channel, floats about to touch: foam, wake and spray.",time:13,weather:"clear",camera:{mode:"chase",fov:48},plane:{pos:[-500,5.5,3330],headingDeg:86,pitchDeg:4,bankDeg:0,speed:29,throttle:.25,flaps:1},presim:30,clipInputs:{pitch:.12,roll:0,yaw:0}},{id:"sunset",name:"Sunset flight",description:"Low sun in the west over the bay, downtown silhouetted, warm haze and long water reflections.",time:17.9,weather:"scattered",camera:{mode:"chase",fov:50},plane:{pos:[1400,280,600],headingDeg:262,pitchDeg:1,bankDeg:0,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"cloudy",name:"Cloudy-weather flight",description:"Heavy cumulus and grey haze over Isla Garza; softer light, cloud shadows moving across the water.",time:15,weather:"cloudy",camera:{mode:"chase",fov:50},plane:{pos:[700,300,3100],headingDeg:335,pitchDeg:0,bankDeg:0,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"night",name:"Night flight with city lights",description:"Over the bay at 22:00 looking toward downtown: lit windows, street lamps, headlights and navigation strobes.",time:22,weather:"clear",camera:{mode:"chase",fov:50},plane:{pos:[-400,320,-900],headingDeg:318,pitchDeg:0,bankDeg:0,speed:55,throttle:.7},presim:30,clipInputs:{pitch:0,roll:0,yaw:0}}];da.push({id:"plane-rear-quarter",name:"Aircraft rear three-quarter",description:"Fixed camera 14 m from the aircraft, rear-left-above, aircraft moored at the Garza marina in sunlight.",time:14,weather:"clear",camera:{mode:"fixed",pos:[425.9,4.25,1892.3],headingDeg:205,pitchDeg:-9,fov:40},plane:{pos:[420,2.02,1905],headingDeg:240,pitchDeg:0,bankDeg:0,speed:0,throttle:0},presim:10,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"plane-front-quarter",name:"Aircraft front three-quarter",description:"Fixed camera 13 m ahead-right of the moored aircraft, low, showing cowl, propeller, windshield and floats.",time:10,weather:"clear",camera:{mode:"fixed",pos:[415.6,2.65,1917.2],headingDeg:20,pitchDeg:-3,fov:40},plane:{pos:[420,2.02,1905],headingDeg:240,pitchDeg:0,bankDeg:0,speed:0,throttle:0},presim:10,clipInputs:{pitch:0,roll:0,yaw:0}},{id:"glass-sun",name:"Cockpit glass in direct sun",description:"Close on the windshield and left side windows with the sun behind the camera; interior visible through the glass.",time:15.5,weather:"clear",camera:{mode:"fixed",pos:[418.3,3.05,1911.3],headingDeg:15,pitchDeg:-8,fov:32},plane:{pos:[420,2.02,1905],headingDeg:240,pitchDeg:0,bankDeg:0,speed:0,throttle:0},presim:10,clipInputs:{pitch:0,roll:0,yaw:0}});function cv(i){return da.find(t=>t.id===i)}class lv{constructor(t){this.game=t}view=null;fixedDt=1/30;frame=0;flying=!1;list(){return da.map(t=>({id:t.id,name:t.name,description:t.description}))}setup(t){const e=cv(t);if(!e)return!1;this.view=e;const n=this.game;n.atmos.hour=e.time,n.atmos.setWeather(e.weather),n.time=0,this.placePlane(e);for(let s=0;s<Math.round(e.presim/this.fixedDt);s++)n.update(this.fixedDt,!1);return this.placePlane(e),this.setupCamera(e),n.aircraft.inputs.throttle=e.plane.throttle,n.aircraft.inputs.flaps=e.plane.flaps??0,n.aircraft.inputs.pitch=e.clipInputs.pitch,n.aircraft.inputs.roll=e.clipInputs.roll,n.aircraft.inputs.yaw=e.clipInputs.yaw,n.update(this.fixedDt,!1),this.updateCamera(this.fixedDt),this.flying=!1,this.frame=0,n.metrics.reset(),!0}placePlane(t){const e=this.game,n=t.plane;let s;if(n.fromCamera&&t.camera.pos){const o=this.fixedCamera(t),a=n.fromCamera.screenX*2-1,c=1-n.fromCamera.screenY*2,l=new A(a,c,.5).unproject(o).sub(o.position).normalize(),h=o.position.clone().addScaledVector(l,n.fromCamera.distance);s=[h.x,h.y,h.z]}else s=n.pos;const r=o=>o*Math.PI/180;e.aircraft.place(s[0],s[1],s[2],r(n.headingDeg),r(n.pitchDeg),r(n.bankDeg),n.speed,n.throttle)}fixedCamera(t){const e=new Ye(t.camera.fov,this.game.camera.aspect,.4,6e4),[n,s,r]=t.camera.pos;e.position.set(n,s,r);const o=(t.camera.headingDeg??0)*Math.PI/180,a=(t.camera.pitchDeg??0)*Math.PI/180;return e.rotation.set(0,0,0),e.rotation.order="YXZ",e.rotation.y=-o,e.rotation.x=a,e.updateMatrixWorld(),e.updateProjectionMatrix(),e}setupCamera(t){const e=this.game,n=e.flightCamera;if(n.baseFov=t.camera.fov,n.orbitPitch=0,n.orbitYaw=0,t.camera.mode==="fixed"){n.mode="fixed";const s=this.fixedCamera(t);e.camera.position.copy(s.position),e.camera.quaternion.copy(s.quaternion),e.camera.fov=t.camera.fov,e.camera.updateProjectionMatrix()}else{n.mode=t.camera.mode,n.snap();for(let s=0;s<120;s++)n.update(e.aircraft.flight,e.aircraft.model,this.fixedDt)}}updateCamera(t){this.game.flightCamera.update(this.game.aircraft.flight,this.game.aircraft.model,t)}step(t=1){const e=this.game;for(let n=0;n<t;n++)e.update(this.fixedDt,!0),this.updateCamera(this.fixedDt),this.frame++;this.flying=!0,e.render()}render(){this.game.render()}metrics(){const t=this.game.metrics.snapshot(),e=this.game.aircraft.flight.telemetry;return{...t,frame:this.frame,flying:this.flying,telemetry:{airspeed:e.airspeed,altitude:e.altitude,heading:e.heading,alpha:e.alpha,stalled:e.stalled,onWater:e.onWater},build:window.__build,view:this.view?.id??null,camera:{pos:this.game.camera.position.toArray(),quat:this.game.camera.quaternion.toArray(),fov:this.game.camera.fov}}}project(t,e,n){const s=new A(t,e,n).project(this.game.camera);return s.z>1?null:[(s.x+1)/2,(1-s.y)/2]}landmarks(){const t=this.game,e=t.map.bridges.find(c=>c.id==="garza-bridge"),n=e.pts[0],s=e.pts[e.pts.length-1],r=t.aircraft.flight.position,o={planeCentroid:this.project(r.x,r.y,r.z),bridgeStart:this.project(n[0],7,n[1]),bridgeEnd:this.project(s[0],7,s[1])};for(const c of t.city.landmarkPositions)o[`landmark:${c.name}`]=this.project(c.x,c.h,c.z);const a=t.map.bridges.find(c=>c.id==="tortuga-bridge");return a&&(o.bridge2End=this.project(a.pts[a.pts.length-1][0],7,a.pts[a.pts.length-1][1])),o.horizonCentre=this.project(t.camera.position.x+Math.sin(0)*5e4,0,t.camera.position.z-5e4),o}}window.__build="03aacefc4377-20260904T101257Z";async function hv(){const i=Dl(),t=document.getElementById("view"),e=document.getElementById("start-status"),n=document.getElementById("start-btn"),s=document.getElementById("start");n.disabled=!0;const r=new rv(t,i);window.__game=r;const o=(m,p)=>{e.textContent=`${m}… ${Math.round(p*100)}%`};await r.init(o);const a=()=>{const m=i.width??window.innerWidth,p=i.height??window.innerHeight;i.width&&(t.style.width=`${m}px`,t.style.height=`${p}px`),r.setSize(m,p,i.width?1:Math.min(window.devicePixelRatio,1.5))};window.addEventListener("resize",a),a();const c=new av,l=new ov(t),h=new lv(r);if(window.__bench=h,e.textContent=`Build ${window.__build}`,n.disabled=!1,i.bench){if(s.classList.add("hidden"),c.show(!i.noHud),!h.setup(i.bench)){e.textContent=`Unknown bench view ${i.bench}`;return}const p=document.getElementById("benchtag");p.classList.remove("hidden"),p.textContent=`${i.bench} · seed ${i.seed} · ${window.__build}`,i.noHud&&p.classList.add("hidden");const y=()=>{h.render();const _=r.aircraft.flight.telemetry;c.update(_,r.aircraft.inputs.throttle,r.flightCamera.mode,r.atmos.hour,0),window.__ready=!0,window.__benchReady=!0,i.freeze||requestAnimationFrame(y)};y();return}let d=!1;const u=()=>{d||(d=!0,s.classList.add("hidden"),c.show(!0),c.flash("Full throttle (Shift) to take off. S pulls the nose up once above 55 KIAS.",6),r.aircraft.inputs.throttle=0,r.flightCamera.mode="chase",r.flightCamera.snap())};n.addEventListener("click",u),window.addEventListener("keydown",m=>{m.code==="Enter"&&!d&&u()}),i.autostart&&u();let f=performance.now(),g=0;const v=()=>{const m=performance.now();let p=i.fixedDt??Math.min(.1,(m-f)/1e3);if(f=m,i.freeze&&(p=0),l.update(p),d){const x=l.flight,E=r.aircraft.inputs;if(E.throttle=x.throttle,E.pitch=x.pitch,E.roll=x.roll,E.yaw=x.yaw,E.flaps=x.flaps,E.brake=x.brake,l.consume("KeyC")&&(r.flightCamera.mode=r.flightCamera.mode==="chase"?"cockpit":"chase",r.flightCamera.snap()),l.consume("KeyV")&&(r.flightCamera.mode="cockpit",r.flightCamera.snap()),l.consume("KeyH")&&c.toggle(),l.consume("KeyT")&&(r.atmos.hour=(r.atmos.hour+2)%24,c.flash(`Time ${Math.floor(r.atmos.hour)}:00`)),l.consume("KeyY")){const b=["clear","scattered","cloudy","storm"],C=(b.indexOf(r.atmos.weather)+1)%b.length;r.atmos.setWeather(b[C]),c.flash(`Weather: ${b[C]}`)}if(l.consume("KeyR")){const b=r.map.pois.find(C=>C.kind==="seaplane");r.aircraft.place(b.x+120,1.6,b.z+60,Math.PI*.5,0,0,0,0),x.throttle=0,r.flightCamera.snap(),c.flash("Reset to the seaplane base")}l.consume("KeyG")&&(r.aircraft.place(r.aircraft.flight.position.x,350,r.aircraft.flight.position.z,Math.PI*.5,0,0,55,.7),x.throttle=.7,c.flash("Airborne at 350 m")),r.flightCamera.orbitYaw=l.orbitYaw,r.flightCamera.orbitPitch=l.orbitPitch}g+=p;const y=1/60;let _=0;for(;g>=y&&_<8;)r.update(y,d),g-=y,_++;_===8&&(g=0),r.flightCamera.update(r.aircraft.flight,r.aircraft.model,p),r.render(),c.update(r.aircraft.flight.telemetry,r.aircraft.inputs.throttle,r.flightCamera.mode,r.atmos.hour,p),window.__ready=!0,requestAnimationFrame(v)};r.update(0,!1),r.flightCamera.update(r.aircraft.flight,r.aircraft.model,1/60),v()}hv().catch(i=>{console.error(i);const t=document.getElementById("start-status");t&&(t.textContent=`Failed to start: ${i.message}`)});
