(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function t(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(s){if(s.ep)return;s.ep=!0;const r=t(s);fetch(s.href,r)}})();const za="180",ah=0,El=1,lh=2,ch=0,Zc=1,uh=2,Dn=3,Kn=0,Xt=1,ln=2,Dt=0,Hi=1,Ps=2,Tl=3,bl=4,Kc=5,cn=100,hh=101,dh=102,fh=103,ph=104,Ts=200,mh=201,gh=202,_h=203,ko=204,Vo=205,Ho=206,vh=207,Go=208,xh=209,Mh=210,Sh=211,yh=212,Eh=213,Th=214,Wo=0,Xo=1,qo=2,Wi=3,Yo=4,Zo=5,Ko=6,Jo=7,Jc=0,bh=1,wh=2,Yn=0,jc=1,$c=2,Qc=3,ka=4,eu=5,tu=6,nu=7,iu=300,Xi=301,qi=302,jo=303,$o=304,Br=306,Un=1e3,di=1001,Qo=1002,kt=1003,Ah=1004,Zs=1005,hn=1006,Kr=1007,qn=1008,pn=1009,su=1010,ru=1011,Ds=1012,Va=1013,mi=1014,Mn=1015,fn=1016,Ha=1017,Ga=1018,Yi=1020,ou=35902,au=35899,lu=1021,cu=1022,tn=1023,Is=1026,Zi=1027,Wa=1028,Xa=1029,uu=1030,qa=1031,Ya=1033,Cr=33776,Rr=33777,Pr=33778,Dr=33779,ea=35840,ta=35841,na=35842,ia=35843,sa=36196,ra=37492,oa=37496,aa=37808,la=37809,ca=37810,ua=37811,ha=37812,da=37813,fa=37814,pa=37815,ma=37816,ga=37817,_a=37818,va=37819,xa=37820,Ma=37821,Sa=36492,ya=36494,Ea=36495,Ta=36283,ba=36284,wa=36285,Aa=36286,Ch=3200,Rh=3201,Za=0,Ph=1,Wn="",Rt="srgb",Ki="srgb-linear",Lr="linear",ot="srgb",yi=7680,wl=519,Dh=512,Ih=513,Lh=514,hu=515,Uh=516,Nh=517,Fh=518,Oh=519,Al=35044,Cl="300 es",Sn=2e3,Ur=2001;class rs{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const s=n[e];if(s!==void 0){const r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,e);e.target=null}}}const It=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Jr=Math.PI/180,Nr=180/Math.PI;function os(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(It[i&255]+It[i>>8&255]+It[i>>16&255]+It[i>>24&255]+"-"+It[e&255]+It[e>>8&255]+"-"+It[e>>16&15|64]+It[e>>24&255]+"-"+It[t&63|128]+It[t>>8&255]+"-"+It[t>>16&255]+It[t>>24&255]+It[n&255]+It[n>>8&255]+It[n>>16&255]+It[n>>24&255]).toLowerCase()}function Qe(i,e,t){return Math.max(e,Math.min(t,i))}function Bh(i,e){return(i%e+e)%e}function jr(i,e,t){return(1-t)*i+t*e}function ps(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function Gt(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}class oe{constructor(e=0,t=0){oe.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6],this.y=s[1]*t+s[4]*n+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Qe(this.x,e.x,t.x),this.y=Qe(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Qe(this.x,e,t),this.y=Qe(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Qe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Qe(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),s=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*n-o*s+e.x,this.y=r*s+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Vs{constructor(e=0,t=0,n=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=s}static slerpFlat(e,t,n,s,r,o,a){let c=n[s+0],l=n[s+1],u=n[s+2],h=n[s+3];const d=r[o+0],f=r[o+1],g=r[o+2],_=r[o+3];if(a===0){e[t+0]=c,e[t+1]=l,e[t+2]=u,e[t+3]=h;return}if(a===1){e[t+0]=d,e[t+1]=f,e[t+2]=g,e[t+3]=_;return}if(h!==_||c!==d||l!==f||u!==g){let m=1-a;const p=c*d+l*f+u*g+h*_,S=p>=0?1:-1,T=1-p*p;if(T>Number.EPSILON){const P=Math.sqrt(T),w=Math.atan2(P,p*S);m=Math.sin(m*w)/P,a=Math.sin(a*w)/P}const x=a*S;if(c=c*m+d*x,l=l*m+f*x,u=u*m+g*x,h=h*m+_*x,m===1-a){const P=1/Math.sqrt(c*c+l*l+u*u+h*h);c*=P,l*=P,u*=P,h*=P}}e[t]=c,e[t+1]=l,e[t+2]=u,e[t+3]=h}static multiplyQuaternionsFlat(e,t,n,s,r,o){const a=n[s],c=n[s+1],l=n[s+2],u=n[s+3],h=r[o],d=r[o+1],f=r[o+2],g=r[o+3];return e[t]=a*g+u*h+c*f-l*d,e[t+1]=c*g+u*d+l*h-a*f,e[t+2]=l*g+u*f+a*d-c*h,e[t+3]=u*g-a*h-c*d-l*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,s){return this._x=e,this._y=t,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,s=e._y,r=e._z,o=e._order,a=Math.cos,c=Math.sin,l=a(n/2),u=a(s/2),h=a(r/2),d=c(n/2),f=c(s/2),g=c(r/2);switch(o){case"XYZ":this._x=d*u*h+l*f*g,this._y=l*f*h-d*u*g,this._z=l*u*g+d*f*h,this._w=l*u*h-d*f*g;break;case"YXZ":this._x=d*u*h+l*f*g,this._y=l*f*h-d*u*g,this._z=l*u*g-d*f*h,this._w=l*u*h+d*f*g;break;case"ZXY":this._x=d*u*h-l*f*g,this._y=l*f*h+d*u*g,this._z=l*u*g+d*f*h,this._w=l*u*h-d*f*g;break;case"ZYX":this._x=d*u*h-l*f*g,this._y=l*f*h+d*u*g,this._z=l*u*g-d*f*h,this._w=l*u*h+d*f*g;break;case"YZX":this._x=d*u*h+l*f*g,this._y=l*f*h+d*u*g,this._z=l*u*g-d*f*h,this._w=l*u*h-d*f*g;break;case"XZY":this._x=d*u*h-l*f*g,this._y=l*f*h-d*u*g,this._z=l*u*g+d*f*h,this._w=l*u*h+d*f*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,s=Math.sin(n);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],s=t[4],r=t[8],o=t[1],a=t[5],c=t[9],l=t[2],u=t[6],h=t[10],d=n+a+h;if(d>0){const f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(u-c)*f,this._y=(r-l)*f,this._z=(o-s)*f}else if(n>a&&n>h){const f=2*Math.sqrt(1+n-a-h);this._w=(u-c)/f,this._x=.25*f,this._y=(s+o)/f,this._z=(r+l)/f}else if(a>h){const f=2*Math.sqrt(1+a-n-h);this._w=(r-l)/f,this._x=(s+o)/f,this._y=.25*f,this._z=(c+u)/f}else{const f=2*Math.sqrt(1+h-n-a);this._w=(o-s)/f,this._x=(r+l)/f,this._y=(c+u)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Qe(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const s=Math.min(1,t/n);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,s=e._y,r=e._z,o=e._w,a=t._x,c=t._y,l=t._z,u=t._w;return this._x=n*u+o*a+s*l-r*c,this._y=s*u+o*c+r*a-n*l,this._z=r*u+o*l+n*c-s*a,this._w=o*u-n*a-s*c-r*l,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const n=this._x,s=this._y,r=this._z,o=this._w;let a=o*e._w+n*e._x+s*e._y+r*e._z;if(a<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,a=-a):this.copy(e),a>=1)return this._w=o,this._x=n,this._y=s,this._z=r,this;const c=1-a*a;if(c<=Number.EPSILON){const f=1-t;return this._w=f*o+t*this._w,this._x=f*n+t*this._x,this._y=f*s+t*this._y,this._z=f*r+t*this._z,this.normalize(),this}const l=Math.sqrt(c),u=Math.atan2(l,a),h=Math.sin((1-t)*u)/l,d=Math.sin(t*u)/l;return this._w=o*h+this._w*d,this._x=n*h+this._x*d,this._y=s*h+this._y*d,this._z=r*h+this._z*d,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class D{constructor(e=0,t=0,n=0){D.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Rl.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Rl.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*s,this.y=r[1]*t+r[4]*n+r[7]*s,this.z=r[2]*t+r[5]*n+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,s=this.z,r=e.elements,o=1/(r[3]*t+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*t+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*t+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(e){const t=this.x,n=this.y,s=this.z,r=e.x,o=e.y,a=e.z,c=e.w,l=2*(o*s-a*n),u=2*(a*t-r*s),h=2*(r*n-o*t);return this.x=t+c*l+o*h-a*u,this.y=n+c*u+a*l-r*h,this.z=s+c*h+r*u-o*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*s,this.y=r[1]*t+r[5]*n+r[9]*s,this.z=r[2]*t+r[6]*n+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Qe(this.x,e.x,t.x),this.y=Qe(this.y,e.y,t.y),this.z=Qe(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Qe(this.x,e,t),this.y=Qe(this.y,e,t),this.z=Qe(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Qe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,s=e.y,r=e.z,o=t.x,a=t.y,c=t.z;return this.x=s*c-r*a,this.y=r*o-n*c,this.z=n*a-s*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return $r.copy(this).projectOnVector(e),this.sub($r)}reflect(e){return this.sub($r.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Qe(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,s=this.z-e.z;return t*t+n*n+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const s=Math.sin(t)*e;return this.x=s*Math.sin(n),this.y=Math.cos(t)*e,this.z=s*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const $r=new D,Rl=new Vs;class je{constructor(e,t,n,s,r,o,a,c,l){je.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,c,l)}set(e,t,n,s,r,o,a,c,l){const u=this.elements;return u[0]=e,u[1]=s,u[2]=a,u[3]=t,u[4]=r,u[5]=c,u[6]=n,u[7]=o,u[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[3],c=n[6],l=n[1],u=n[4],h=n[7],d=n[2],f=n[5],g=n[8],_=s[0],m=s[3],p=s[6],S=s[1],T=s[4],x=s[7],P=s[2],w=s[5],R=s[8];return r[0]=o*_+a*S+c*P,r[3]=o*m+a*T+c*w,r[6]=o*p+a*x+c*R,r[1]=l*_+u*S+h*P,r[4]=l*m+u*T+h*w,r[7]=l*p+u*x+h*R,r[2]=d*_+f*S+g*P,r[5]=d*m+f*T+g*w,r[8]=d*p+f*x+g*R,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],c=e[6],l=e[7],u=e[8];return t*o*u-t*a*l-n*r*u+n*a*c+s*r*l-s*o*c}invert(){const e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],c=e[6],l=e[7],u=e[8],h=u*o-a*l,d=a*c-u*r,f=l*r-o*c,g=t*h+n*d+s*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const _=1/g;return e[0]=h*_,e[1]=(s*l-u*n)*_,e[2]=(a*n-s*o)*_,e[3]=d*_,e[4]=(u*t-s*c)*_,e[5]=(s*r-a*t)*_,e[6]=f*_,e[7]=(n*c-l*t)*_,e[8]=(o*t-n*r)*_,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,s,r,o,a){const c=Math.cos(r),l=Math.sin(r);return this.set(n*c,n*l,-n*(c*o+l*a)+o+e,-s*l,s*c,-s*(-l*o+c*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(Qr.makeScale(e,t)),this}rotate(e){return this.premultiply(Qr.makeRotation(-e)),this}translate(e,t){return this.premultiply(Qr.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let s=0;s<9;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Qr=new je;function du(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Fr(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function zh(){const i=Fr("canvas");return i.style.display="block",i}const Pl={};function Ls(i){i in Pl||(Pl[i]=!0,console.warn(i))}function kh(i,e,t){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}const Dl=new je().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Il=new je().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Vh(){const i={enabled:!0,workingColorSpace:Ki,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===ot&&(s.r=Ln(s.r),s.g=Ln(s.g),s.b=Ln(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===ot&&(s.r=Gi(s.r),s.g=Gi(s.g),s.b=Gi(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===Wn?Lr:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return Ls("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return Ls("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[Ki]:{primaries:e,whitePoint:n,transfer:Lr,toXYZ:Dl,fromXYZ:Il,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Rt},outputColorSpaceConfig:{drawingBufferColorSpace:Rt}},[Rt]:{primaries:e,whitePoint:n,transfer:ot,toXYZ:Dl,fromXYZ:Il,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Rt}}}),i}const tt=Vh();function Ln(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Gi(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Ei;class Hh{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Ei===void 0&&(Ei=Fr("canvas")),Ei.width=e.width,Ei.height=e.height;const s=Ei.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),n=Ei}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Fr("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const s=n.getImageData(0,0,e.width,e.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=Ln(r[o]/255)*255;return n.putImageData(s,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(Ln(t[n]/255)*255):t[n]=Ln(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let Gh=0;class Ka{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Gh++}),this.uuid=os(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(eo(s[o].image)):r.push(eo(s[o]))}else r=eo(s);n.url=r}return t||(e.images[this.uuid]=n),n}}function eo(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Hh.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let Wh=0;const to=new D;class Ft extends rs{constructor(e=Ft.DEFAULT_IMAGE,t=Ft.DEFAULT_MAPPING,n=di,s=di,r=hn,o=qn,a=tn,c=pn,l=Ft.DEFAULT_ANISOTROPY,u=Wn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Wh++}),this.uuid=os(),this.name="",this.source=new Ka(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=c,this.offset=new oe(0,0),this.repeat=new oe(1,1),this.center=new oe(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new je,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(to).x}get height(){return this.source.getSize(to).y}get depth(){return this.source.getSize(to).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){console.warn(`THREE.Texture.setValues(): property '${t}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==iu)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Un:e.x=e.x-Math.floor(e.x);break;case di:e.x=e.x<0?0:1;break;case Qo:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Un:e.y=e.y-Math.floor(e.y);break;case di:e.y=e.y<0?0:1;break;case Qo:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Ft.DEFAULT_IMAGE=null;Ft.DEFAULT_MAPPING=iu;Ft.DEFAULT_ANISOTROPY=1;class lt{constructor(e=0,t=0,n=0,s=1){lt.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,s){return this.x=e,this.y=t,this.z=n,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,s=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*t+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*t+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*t+o[7]*n+o[11]*s+o[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,s,r;const c=e.elements,l=c[0],u=c[4],h=c[8],d=c[1],f=c[5],g=c[9],_=c[2],m=c[6],p=c[10];if(Math.abs(u-d)<.01&&Math.abs(h-_)<.01&&Math.abs(g-m)<.01){if(Math.abs(u+d)<.1&&Math.abs(h+_)<.1&&Math.abs(g+m)<.1&&Math.abs(l+f+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const T=(l+1)/2,x=(f+1)/2,P=(p+1)/2,w=(u+d)/4,R=(h+_)/4,I=(g+m)/4;return T>x&&T>P?T<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(T),s=w/n,r=R/n):x>P?x<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(x),n=w/s,r=I/s):P<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(P),n=R/r,s=I/r),this.set(n,s,r,t),this}let S=Math.sqrt((m-g)*(m-g)+(h-_)*(h-_)+(d-u)*(d-u));return Math.abs(S)<.001&&(S=1),this.x=(m-g)/S,this.y=(h-_)/S,this.z=(d-u)/S,this.w=Math.acos((l+f+p-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Qe(this.x,e.x,t.x),this.y=Qe(this.y,e.y,t.y),this.z=Qe(this.z,e.z,t.z),this.w=Qe(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Qe(this.x,e,t),this.y=Qe(this.y,e,t),this.z=Qe(this.z,e,t),this.w=Qe(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Qe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Xh extends rs{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:hn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new lt(0,0,e,t),this.scissorTest=!1,this.viewport=new lt(0,0,e,t);const s={width:e,height:t,depth:n.depth},r=new Ft(s);this.textures=[];const o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:hn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=n,this.textures[s].isArrayTexture=this.textures[s].image.depth>1;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const s=Object.assign({},e.textures[t].image);this.textures[t].source=new Ka(s)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Jt extends Xh{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class fu extends Ft{constructor(e=null,t=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=kt,this.minFilter=kt,this.wrapR=di,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class qh extends Ft{constructor(e=null,t=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=kt,this.minFilter=kt,this.wrapR=di,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Jn{constructor(e=new D(1/0,1/0,1/0),t=new D(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(sn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(sn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=sn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,sn):sn.fromBufferAttribute(r,o),sn.applyMatrix4(e.matrixWorld),this.expandByPoint(sn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Ks.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Ks.copy(n.boundingBox)),Ks.applyMatrix4(e.matrixWorld),this.union(Ks)}const s=e.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,sn),sn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(ms),Js.subVectors(this.max,ms),Ti.subVectors(e.a,ms),bi.subVectors(e.b,ms),wi.subVectors(e.c,ms),Nn.subVectors(bi,Ti),Fn.subVectors(wi,bi),ni.subVectors(Ti,wi);let t=[0,-Nn.z,Nn.y,0,-Fn.z,Fn.y,0,-ni.z,ni.y,Nn.z,0,-Nn.x,Fn.z,0,-Fn.x,ni.z,0,-ni.x,-Nn.y,Nn.x,0,-Fn.y,Fn.x,0,-ni.y,ni.x,0];return!no(t,Ti,bi,wi,Js)||(t=[1,0,0,0,1,0,0,0,1],!no(t,Ti,bi,wi,Js))?!1:(js.crossVectors(Nn,Fn),t=[js.x,js.y,js.z],no(t,Ti,bi,wi,Js))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,sn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(sn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(bn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),bn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),bn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),bn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),bn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),bn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),bn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),bn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(bn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const bn=[new D,new D,new D,new D,new D,new D,new D,new D],sn=new D,Ks=new Jn,Ti=new D,bi=new D,wi=new D,Nn=new D,Fn=new D,ni=new D,ms=new D,Js=new D,js=new D,ii=new D;function no(i,e,t,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){ii.fromArray(i,r);const a=s.x*Math.abs(ii.x)+s.y*Math.abs(ii.y)+s.z*Math.abs(ii.z),c=e.dot(ii),l=t.dot(ii),u=n.dot(ii);if(Math.max(-Math.max(c,l,u),Math.min(c,l,u))>a)return!1}return!0}const Yh=new Jn,gs=new D,io=new D;class as{constructor(e=new D,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):Yh.setFromPoints(e).getCenter(n);let s=0;for(let r=0,o=e.length;r<o;r++)s=Math.max(s,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;gs.subVectors(e,this.center);const t=gs.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),s=(n-this.radius)*.5;this.center.addScaledVector(gs,s/n),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(io.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(gs.copy(e.center).add(io)),this.expandByPoint(gs.copy(e.center).sub(io))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const wn=new D,so=new D,$s=new D,On=new D,ro=new D,Qs=new D,oo=new D;class Ja{constructor(e=new D,t=new D(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,wn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=wn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(wn.copy(this.origin).addScaledVector(this.direction,t),wn.distanceToSquared(e))}distanceSqToSegment(e,t,n,s){so.copy(e).add(t).multiplyScalar(.5),$s.copy(t).sub(e).normalize(),On.copy(this.origin).sub(so);const r=e.distanceTo(t)*.5,o=-this.direction.dot($s),a=On.dot(this.direction),c=-On.dot($s),l=On.lengthSq(),u=Math.abs(1-o*o);let h,d,f,g;if(u>0)if(h=o*c-a,d=o*a-c,g=r*u,h>=0)if(d>=-g)if(d<=g){const _=1/u;h*=_,d*=_,f=h*(h+o*d+2*a)+d*(o*h+d+2*c)+l}else d=r,h=Math.max(0,-(o*d+a)),f=-h*h+d*(d+2*c)+l;else d=-r,h=Math.max(0,-(o*d+a)),f=-h*h+d*(d+2*c)+l;else d<=-g?(h=Math.max(0,-(-o*r+a)),d=h>0?-r:Math.min(Math.max(-r,-c),r),f=-h*h+d*(d+2*c)+l):d<=g?(h=0,d=Math.min(Math.max(-r,-c),r),f=d*(d+2*c)+l):(h=Math.max(0,-(o*r+a)),d=h>0?r:Math.min(Math.max(-r,-c),r),f=-h*h+d*(d+2*c)+l);else d=o>0?-r:r,h=Math.max(0,-(o*d+a)),f=-h*h+d*(d+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,h),s&&s.copy(so).addScaledVector($s,d),f}intersectSphere(e,t){wn.subVectors(e.center,this.origin);const n=wn.dot(this.direction),s=wn.dot(wn)-n*n,r=e.radius*e.radius;if(s>r)return null;const o=Math.sqrt(r-s),a=n-o,c=n+o;return c<0?null:a<0?this.at(c,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,s,r,o,a,c;const l=1/this.direction.x,u=1/this.direction.y,h=1/this.direction.z,d=this.origin;return l>=0?(n=(e.min.x-d.x)*l,s=(e.max.x-d.x)*l):(n=(e.max.x-d.x)*l,s=(e.min.x-d.x)*l),u>=0?(r=(e.min.y-d.y)*u,o=(e.max.y-d.y)*u):(r=(e.max.y-d.y)*u,o=(e.min.y-d.y)*u),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),h>=0?(a=(e.min.z-d.z)*h,c=(e.max.z-d.z)*h):(a=(e.max.z-d.z)*h,c=(e.min.z-d.z)*h),n>c||a>s)||((a>n||n!==n)&&(n=a),(c<s||s!==s)&&(s=c),s<0)?null:this.at(n>=0?n:s,t)}intersectsBox(e){return this.intersectBox(e,wn)!==null}intersectTriangle(e,t,n,s,r){ro.subVectors(t,e),Qs.subVectors(n,e),oo.crossVectors(ro,Qs);let o=this.direction.dot(oo),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;On.subVectors(this.origin,e);const c=a*this.direction.dot(Qs.crossVectors(On,Qs));if(c<0)return null;const l=a*this.direction.dot(ro.cross(On));if(l<0||c+l>o)return null;const u=-a*On.dot(oo);return u<0?null:this.at(u/o,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class nt{constructor(e,t,n,s,r,o,a,c,l,u,h,d,f,g,_,m){nt.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,c,l,u,h,d,f,g,_,m)}set(e,t,n,s,r,o,a,c,l,u,h,d,f,g,_,m){const p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=s,p[1]=r,p[5]=o,p[9]=a,p[13]=c,p[2]=l,p[6]=u,p[10]=h,p[14]=d,p[3]=f,p[7]=g,p[11]=_,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new nt().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,s=1/Ai.setFromMatrixColumn(e,0).length(),r=1/Ai.setFromMatrixColumn(e,1).length(),o=1/Ai.setFromMatrixColumn(e,2).length();return t[0]=n[0]*s,t[1]=n[1]*s,t[2]=n[2]*s,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,s=e.y,r=e.z,o=Math.cos(n),a=Math.sin(n),c=Math.cos(s),l=Math.sin(s),u=Math.cos(r),h=Math.sin(r);if(e.order==="XYZ"){const d=o*u,f=o*h,g=a*u,_=a*h;t[0]=c*u,t[4]=-c*h,t[8]=l,t[1]=f+g*l,t[5]=d-_*l,t[9]=-a*c,t[2]=_-d*l,t[6]=g+f*l,t[10]=o*c}else if(e.order==="YXZ"){const d=c*u,f=c*h,g=l*u,_=l*h;t[0]=d+_*a,t[4]=g*a-f,t[8]=o*l,t[1]=o*h,t[5]=o*u,t[9]=-a,t[2]=f*a-g,t[6]=_+d*a,t[10]=o*c}else if(e.order==="ZXY"){const d=c*u,f=c*h,g=l*u,_=l*h;t[0]=d-_*a,t[4]=-o*h,t[8]=g+f*a,t[1]=f+g*a,t[5]=o*u,t[9]=_-d*a,t[2]=-o*l,t[6]=a,t[10]=o*c}else if(e.order==="ZYX"){const d=o*u,f=o*h,g=a*u,_=a*h;t[0]=c*u,t[4]=g*l-f,t[8]=d*l+_,t[1]=c*h,t[5]=_*l+d,t[9]=f*l-g,t[2]=-l,t[6]=a*c,t[10]=o*c}else if(e.order==="YZX"){const d=o*c,f=o*l,g=a*c,_=a*l;t[0]=c*u,t[4]=_-d*h,t[8]=g*h+f,t[1]=h,t[5]=o*u,t[9]=-a*u,t[2]=-l*u,t[6]=f*h+g,t[10]=d-_*h}else if(e.order==="XZY"){const d=o*c,f=o*l,g=a*c,_=a*l;t[0]=c*u,t[4]=-h,t[8]=l*u,t[1]=d*h+_,t[5]=o*u,t[9]=f*h-g,t[2]=g*h-f,t[6]=a*u,t[10]=_*h+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Zh,e,Kh)}lookAt(e,t,n){const s=this.elements;return Zt.subVectors(e,t),Zt.lengthSq()===0&&(Zt.z=1),Zt.normalize(),Bn.crossVectors(n,Zt),Bn.lengthSq()===0&&(Math.abs(n.z)===1?Zt.x+=1e-4:Zt.z+=1e-4,Zt.normalize(),Bn.crossVectors(n,Zt)),Bn.normalize(),er.crossVectors(Zt,Bn),s[0]=Bn.x,s[4]=er.x,s[8]=Zt.x,s[1]=Bn.y,s[5]=er.y,s[9]=Zt.y,s[2]=Bn.z,s[6]=er.z,s[10]=Zt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[4],c=n[8],l=n[12],u=n[1],h=n[5],d=n[9],f=n[13],g=n[2],_=n[6],m=n[10],p=n[14],S=n[3],T=n[7],x=n[11],P=n[15],w=s[0],R=s[4],I=s[8],y=s[12],M=s[1],C=s[5],F=s[9],H=s[13],X=s[2],L=s[6],U=s[10],V=s[14],G=s[3],J=s[7],se=s[11],de=s[15];return r[0]=o*w+a*M+c*X+l*G,r[4]=o*R+a*C+c*L+l*J,r[8]=o*I+a*F+c*U+l*se,r[12]=o*y+a*H+c*V+l*de,r[1]=u*w+h*M+d*X+f*G,r[5]=u*R+h*C+d*L+f*J,r[9]=u*I+h*F+d*U+f*se,r[13]=u*y+h*H+d*V+f*de,r[2]=g*w+_*M+m*X+p*G,r[6]=g*R+_*C+m*L+p*J,r[10]=g*I+_*F+m*U+p*se,r[14]=g*y+_*H+m*V+p*de,r[3]=S*w+T*M+x*X+P*G,r[7]=S*R+T*C+x*L+P*J,r[11]=S*I+T*F+x*U+P*se,r[15]=S*y+T*H+x*V+P*de,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],s=e[8],r=e[12],o=e[1],a=e[5],c=e[9],l=e[13],u=e[2],h=e[6],d=e[10],f=e[14],g=e[3],_=e[7],m=e[11],p=e[15];return g*(+r*c*h-s*l*h-r*a*d+n*l*d+s*a*f-n*c*f)+_*(+t*c*f-t*l*d+r*o*d-s*o*f+s*l*u-r*c*u)+m*(+t*l*h-t*a*f-r*o*h+n*o*f+r*a*u-n*l*u)+p*(-s*a*u-t*c*h+t*a*d+s*o*h-n*o*d+n*c*u)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],c=e[6],l=e[7],u=e[8],h=e[9],d=e[10],f=e[11],g=e[12],_=e[13],m=e[14],p=e[15],S=h*m*l-_*d*l+_*c*f-a*m*f-h*c*p+a*d*p,T=g*d*l-u*m*l-g*c*f+o*m*f+u*c*p-o*d*p,x=u*_*l-g*h*l+g*a*f-o*_*f-u*a*p+o*h*p,P=g*h*c-u*_*c-g*a*d+o*_*d+u*a*m-o*h*m,w=t*S+n*T+s*x+r*P;if(w===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const R=1/w;return e[0]=S*R,e[1]=(_*d*r-h*m*r-_*s*f+n*m*f+h*s*p-n*d*p)*R,e[2]=(a*m*r-_*c*r+_*s*l-n*m*l-a*s*p+n*c*p)*R,e[3]=(h*c*r-a*d*r-h*s*l+n*d*l+a*s*f-n*c*f)*R,e[4]=T*R,e[5]=(u*m*r-g*d*r+g*s*f-t*m*f-u*s*p+t*d*p)*R,e[6]=(g*c*r-o*m*r-g*s*l+t*m*l+o*s*p-t*c*p)*R,e[7]=(o*d*r-u*c*r+u*s*l-t*d*l-o*s*f+t*c*f)*R,e[8]=x*R,e[9]=(g*h*r-u*_*r-g*n*f+t*_*f+u*n*p-t*h*p)*R,e[10]=(o*_*r-g*a*r+g*n*l-t*_*l-o*n*p+t*a*p)*R,e[11]=(u*a*r-o*h*r-u*n*l+t*h*l+o*n*f-t*a*f)*R,e[12]=P*R,e[13]=(u*_*s-g*h*s+g*n*d-t*_*d-u*n*m+t*h*m)*R,e[14]=(g*a*s-o*_*s-g*n*c+t*_*c+o*n*m-t*a*m)*R,e[15]=(o*h*s-u*a*s+u*n*c-t*h*c-o*n*d+t*a*d)*R,this}scale(e){const t=this.elements,n=e.x,s=e.y,r=e.z;return t[0]*=n,t[4]*=s,t[8]*=r,t[1]*=n,t[5]*=s,t[9]*=r,t[2]*=n,t[6]*=s,t[10]*=r,t[3]*=n,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,s))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),s=Math.sin(t),r=1-n,o=e.x,a=e.y,c=e.z,l=r*o,u=r*a;return this.set(l*o+n,l*a-s*c,l*c+s*a,0,l*a+s*c,u*a+n,u*c-s*o,0,l*c-s*a,u*c+s*o,r*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,s,r,o){return this.set(1,n,r,0,e,1,o,0,t,s,1,0,0,0,0,1),this}compose(e,t,n){const s=this.elements,r=t._x,o=t._y,a=t._z,c=t._w,l=r+r,u=o+o,h=a+a,d=r*l,f=r*u,g=r*h,_=o*u,m=o*h,p=a*h,S=c*l,T=c*u,x=c*h,P=n.x,w=n.y,R=n.z;return s[0]=(1-(_+p))*P,s[1]=(f+x)*P,s[2]=(g-T)*P,s[3]=0,s[4]=(f-x)*w,s[5]=(1-(d+p))*w,s[6]=(m+S)*w,s[7]=0,s[8]=(g+T)*R,s[9]=(m-S)*R,s[10]=(1-(d+_))*R,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,n){const s=this.elements;let r=Ai.set(s[0],s[1],s[2]).length();const o=Ai.set(s[4],s[5],s[6]).length(),a=Ai.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),e.x=s[12],e.y=s[13],e.z=s[14],rn.copy(this);const l=1/r,u=1/o,h=1/a;return rn.elements[0]*=l,rn.elements[1]*=l,rn.elements[2]*=l,rn.elements[4]*=u,rn.elements[5]*=u,rn.elements[6]*=u,rn.elements[8]*=h,rn.elements[9]*=h,rn.elements[10]*=h,t.setFromRotationMatrix(rn),n.x=r,n.y=o,n.z=a,this}makePerspective(e,t,n,s,r,o,a=Sn,c=!1){const l=this.elements,u=2*r/(t-e),h=2*r/(n-s),d=(t+e)/(t-e),f=(n+s)/(n-s);let g,_;if(c)g=r/(o-r),_=o*r/(o-r);else if(a===Sn)g=-(o+r)/(o-r),_=-2*o*r/(o-r);else if(a===Ur)g=-o/(o-r),_=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=u,l[4]=0,l[8]=d,l[12]=0,l[1]=0,l[5]=h,l[9]=f,l[13]=0,l[2]=0,l[6]=0,l[10]=g,l[14]=_,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,s,r,o,a=Sn,c=!1){const l=this.elements,u=2/(t-e),h=2/(n-s),d=-(t+e)/(t-e),f=-(n+s)/(n-s);let g,_;if(c)g=1/(o-r),_=o/(o-r);else if(a===Sn)g=-2/(o-r),_=-(o+r)/(o-r);else if(a===Ur)g=-1/(o-r),_=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=u,l[4]=0,l[8]=0,l[12]=d,l[1]=0,l[5]=h,l[9]=0,l[13]=f,l[2]=0,l[6]=0,l[10]=g,l[14]=_,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let s=0;s<16;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const Ai=new D,rn=new nt,Zh=new D(0,0,0),Kh=new D(1,1,1),Bn=new D,er=new D,Zt=new D,Ll=new nt,Ul=new Vs;class mn{constructor(e=0,t=0,n=0,s=mn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,s=this._order){return this._x=e,this._y=t,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const s=e.elements,r=s[0],o=s[4],a=s[8],c=s[1],l=s[5],u=s[9],h=s[2],d=s[6],f=s[10];switch(t){case"XYZ":this._y=Math.asin(Qe(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-u,f),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(d,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Qe(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-h,r),this._z=0);break;case"ZXY":this._x=Math.asin(Qe(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-h,f),this._z=Math.atan2(-o,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-Qe(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-o,l));break;case"YZX":this._z=Math.asin(Qe(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-u,l),this._y=Math.atan2(-h,r)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-Qe(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,l),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-u,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Ll.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Ll,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Ul.setFromEuler(this),this.setFromQuaternion(Ul,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}mn.DEFAULT_ORDER="XYZ";class ja{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Jh=0;const Nl=new D,Ci=new Vs,An=new nt,tr=new D,_s=new D,jh=new D,$h=new Vs,Fl=new D(1,0,0),Ol=new D(0,1,0),Bl=new D(0,0,1),zl={type:"added"},Qh={type:"removed"},Ri={type:"childadded",child:null},ao={type:"childremoved",child:null};class Et extends rs{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Jh++}),this.uuid=os(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Et.DEFAULT_UP.clone();const e=new D,t=new mn,n=new Vs,s=new D(1,1,1);function r(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new nt},normalMatrix:{value:new je}}),this.matrix=new nt,this.matrixWorld=new nt,this.matrixAutoUpdate=Et.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Et.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new ja,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Ci.setFromAxisAngle(e,t),this.quaternion.multiply(Ci),this}rotateOnWorldAxis(e,t){return Ci.setFromAxisAngle(e,t),this.quaternion.premultiply(Ci),this}rotateX(e){return this.rotateOnAxis(Fl,e)}rotateY(e){return this.rotateOnAxis(Ol,e)}rotateZ(e){return this.rotateOnAxis(Bl,e)}translateOnAxis(e,t){return Nl.copy(e).applyQuaternion(this.quaternion),this.position.add(Nl.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Fl,e)}translateY(e){return this.translateOnAxis(Ol,e)}translateZ(e){return this.translateOnAxis(Bl,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(An.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?tr.copy(e):tr.set(e,t,n);const s=this.parent;this.updateWorldMatrix(!0,!1),_s.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?An.lookAt(_s,tr,this.up):An.lookAt(tr,_s,this.up),this.quaternion.setFromRotationMatrix(An),s&&(An.extractRotation(s.matrixWorld),Ci.setFromRotationMatrix(An),this.quaternion.premultiply(Ci.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(zl),Ri.child=e,this.dispatchEvent(Ri),Ri.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Qh),ao.child=e,this.dispatchEvent(ao),ao.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),An.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),An.multiply(e.parent.matrixWorld)),e.applyMatrix4(An),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(zl),Ri.child=e,this.dispatchEvent(Ri),Ri.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,s=this.children.length;n<s;n++){const o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(_s,e,jh),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(_s,$h,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,c){return a[c.uuid]===void 0&&(a[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const c=a.shapes;if(Array.isArray(c))for(let l=0,u=c.length;l<u;l++){const h=c[l];r(e.shapes,h)}else r(e.shapes,c)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let c=0,l=this.material.length;c<l;c++)a.push(r(e.materials,this.material[c]));s.material=a}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){const c=this.animations[a];s.animations.push(r(e.animations,c))}}if(t){const a=o(e.geometries),c=o(e.materials),l=o(e.textures),u=o(e.images),h=o(e.shapes),d=o(e.skeletons),f=o(e.animations),g=o(e.nodes);a.length>0&&(n.geometries=a),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),u.length>0&&(n.images=u),h.length>0&&(n.shapes=h),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),g.length>0&&(n.nodes=g)}return n.object=s,n;function o(a){const c=[];for(const l in a){const u=a[l];delete u.metadata,c.push(u)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const s=e.children[n];this.add(s.clone())}return this}}Et.DEFAULT_UP=new D(0,1,0);Et.DEFAULT_MATRIX_AUTO_UPDATE=!0;Et.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const on=new D,Cn=new D,lo=new D,Rn=new D,Pi=new D,Di=new D,kl=new D,co=new D,uo=new D,ho=new D,fo=new lt,po=new lt,mo=new lt;class un{constructor(e=new D,t=new D,n=new D){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,s){s.subVectors(n,t),on.subVectors(e,t),s.cross(on);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,n,s,r){on.subVectors(s,t),Cn.subVectors(n,t),lo.subVectors(e,t);const o=on.dot(on),a=on.dot(Cn),c=on.dot(lo),l=Cn.dot(Cn),u=Cn.dot(lo),h=o*l-a*a;if(h===0)return r.set(0,0,0),null;const d=1/h,f=(l*c-a*u)*d,g=(o*u-a*c)*d;return r.set(1-f-g,g,f)}static containsPoint(e,t,n,s){return this.getBarycoord(e,t,n,s,Rn)===null?!1:Rn.x>=0&&Rn.y>=0&&Rn.x+Rn.y<=1}static getInterpolation(e,t,n,s,r,o,a,c){return this.getBarycoord(e,t,n,s,Rn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,Rn.x),c.addScaledVector(o,Rn.y),c.addScaledVector(a,Rn.z),c)}static getInterpolatedAttribute(e,t,n,s,r,o){return fo.setScalar(0),po.setScalar(0),mo.setScalar(0),fo.fromBufferAttribute(e,t),po.fromBufferAttribute(e,n),mo.fromBufferAttribute(e,s),o.setScalar(0),o.addScaledVector(fo,r.x),o.addScaledVector(po,r.y),o.addScaledVector(mo,r.z),o}static isFrontFacing(e,t,n,s){return on.subVectors(n,t),Cn.subVectors(e,t),on.cross(Cn).dot(s)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,s){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,n,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return on.subVectors(this.c,this.b),Cn.subVectors(this.a,this.b),on.cross(Cn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return un.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return un.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,s,r){return un.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}containsPoint(e){return un.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return un.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,s=this.b,r=this.c;let o,a;Pi.subVectors(s,n),Di.subVectors(r,n),co.subVectors(e,n);const c=Pi.dot(co),l=Di.dot(co);if(c<=0&&l<=0)return t.copy(n);uo.subVectors(e,s);const u=Pi.dot(uo),h=Di.dot(uo);if(u>=0&&h<=u)return t.copy(s);const d=c*h-u*l;if(d<=0&&c>=0&&u<=0)return o=c/(c-u),t.copy(n).addScaledVector(Pi,o);ho.subVectors(e,r);const f=Pi.dot(ho),g=Di.dot(ho);if(g>=0&&f<=g)return t.copy(r);const _=f*l-c*g;if(_<=0&&l>=0&&g<=0)return a=l/(l-g),t.copy(n).addScaledVector(Di,a);const m=u*g-f*h;if(m<=0&&h-u>=0&&f-g>=0)return kl.subVectors(r,s),a=(h-u)/(h-u+(f-g)),t.copy(s).addScaledVector(kl,a);const p=1/(m+_+d);return o=_*p,a=d*p,t.copy(n).addScaledVector(Pi,o).addScaledVector(Di,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const pu={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},zn={h:0,s:0,l:0},nr={h:0,s:0,l:0};function go(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class Ke{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Rt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,tt.colorSpaceToWorking(this,t),this}setRGB(e,t,n,s=tt.workingColorSpace){return this.r=e,this.g=t,this.b=n,tt.colorSpaceToWorking(this,s),this}setHSL(e,t,n,s=tt.workingColorSpace){if(e=Bh(e,1),t=Qe(t,0,1),n=Qe(n,0,1),t===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+t):n+t-n*t,o=2*n-r;this.r=go(o,r,e+1/3),this.g=go(o,r,e),this.b=go(o,r,e-1/3)}return tt.colorSpaceToWorking(this,s),this}setStyle(e,t=Rt){function n(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r;const o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){const r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Rt){const n=pu[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Ln(e.r),this.g=Ln(e.g),this.b=Ln(e.b),this}copyLinearToSRGB(e){return this.r=Gi(e.r),this.g=Gi(e.g),this.b=Gi(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Rt){return tt.workingToColorSpace(Lt.copy(this),e),Math.round(Qe(Lt.r*255,0,255))*65536+Math.round(Qe(Lt.g*255,0,255))*256+Math.round(Qe(Lt.b*255,0,255))}getHexString(e=Rt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=tt.workingColorSpace){tt.workingToColorSpace(Lt.copy(this),t);const n=Lt.r,s=Lt.g,r=Lt.b,o=Math.max(n,s,r),a=Math.min(n,s,r);let c,l;const u=(a+o)/2;if(a===o)c=0,l=0;else{const h=o-a;switch(l=u<=.5?h/(o+a):h/(2-o-a),o){case n:c=(s-r)/h+(s<r?6:0);break;case s:c=(r-n)/h+2;break;case r:c=(n-s)/h+4;break}c/=6}return e.h=c,e.s=l,e.l=u,e}getRGB(e,t=tt.workingColorSpace){return tt.workingToColorSpace(Lt.copy(this),t),e.r=Lt.r,e.g=Lt.g,e.b=Lt.b,e}getStyle(e=Rt){tt.workingToColorSpace(Lt.copy(this),e);const t=Lt.r,n=Lt.g,s=Lt.b;return e!==Rt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(e,t,n){return this.getHSL(zn),this.setHSL(zn.h+e,zn.s+t,zn.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(zn),e.getHSL(nr);const n=jr(zn.h,nr.h,t),s=jr(zn.s,nr.s,t),r=jr(zn.l,nr.l,t);return this.setHSL(n,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*s,this.g=r[1]*t+r[4]*n+r[7]*s,this.b=r[2]*t+r[5]*n+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Lt=new Ke;Ke.NAMES=pu;let ed=0;class vi extends rs{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:ed++}),this.uuid=os(),this.name="",this.type="Material",this.blending=Hi,this.side=Kn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=ko,this.blendDst=Vo,this.blendEquation=cn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ke(0,0,0),this.blendAlpha=0,this.depthFunc=Wi,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=wl,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=yi,this.stencilZFail=yi,this.stencilZPass=yi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Hi&&(n.blending=this.blending),this.side!==Kn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==ko&&(n.blendSrc=this.blendSrc),this.blendDst!==Vo&&(n.blendDst=this.blendDst),this.blendEquation!==cn&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==Wi&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==wl&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==yi&&(n.stencilFail=this.stencilFail),this.stencilZFail!==yi&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==yi&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){const o=[];for(const a in r){const c=r[a];delete c.metadata,o.push(c)}return o}if(t){const r=s(e.textures),o=s(e.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const s=t.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class Nt extends vi{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ke(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new mn,this.combine=Jc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const St=new D,ir=new oe;let td=0;class Vt{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:td++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Al,this.updateRanges=[],this.gpuType=Mn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[n+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)ir.fromBufferAttribute(this,t),ir.applyMatrix3(e),this.setXY(t,ir.x,ir.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)St.fromBufferAttribute(this,t),St.applyMatrix3(e),this.setXYZ(t,St.x,St.y,St.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)St.fromBufferAttribute(this,t),St.applyMatrix4(e),this.setXYZ(t,St.x,St.y,St.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)St.fromBufferAttribute(this,t),St.applyNormalMatrix(e),this.setXYZ(t,St.x,St.y,St.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)St.fromBufferAttribute(this,t),St.transformDirection(e),this.setXYZ(t,St.x,St.y,St.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=ps(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Gt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=ps(t,this.array)),t}setX(e,t){return this.normalized&&(t=Gt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=ps(t,this.array)),t}setY(e,t){return this.normalized&&(t=Gt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=ps(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Gt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=ps(t,this.array)),t}setW(e,t){return this.normalized&&(t=Gt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Gt(t,this.array),n=Gt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,s){return e*=this.itemSize,this.normalized&&(t=Gt(t,this.array),n=Gt(n,this.array),s=Gt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e*=this.itemSize,this.normalized&&(t=Gt(t,this.array),n=Gt(n,this.array),s=Gt(s,this.array),r=Gt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Al&&(e.usage=this.usage),e}}class mu extends Vt{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class gu extends Vt{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class ht extends Vt{constructor(e,t,n){super(new Float32Array(e),t,n)}}let nd=0;const Qt=new nt,_o=new Et,Ii=new D,Kt=new Jn,vs=new Jn,At=new D;class wt extends rs{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:nd++}),this.uuid=os(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(du(e)?gu:mu)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new je().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Qt.makeRotationFromQuaternion(e),this.applyMatrix4(Qt),this}rotateX(e){return Qt.makeRotationX(e),this.applyMatrix4(Qt),this}rotateY(e){return Qt.makeRotationY(e),this.applyMatrix4(Qt),this}rotateZ(e){return Qt.makeRotationZ(e),this.applyMatrix4(Qt),this}translate(e,t,n){return Qt.makeTranslation(e,t,n),this.applyMatrix4(Qt),this}scale(e,t,n){return Qt.makeScale(e,t,n),this.applyMatrix4(Qt),this}lookAt(e){return _o.lookAt(e),_o.updateMatrix(),this.applyMatrix4(_o.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Ii).negate(),this.translate(Ii.x,Ii.y,Ii.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let s=0,r=e.length;s<r;s++){const o=e[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new ht(n,3))}else{const n=Math.min(e.length,t.count);for(let s=0;s<n;s++){const r=e[s];t.setXYZ(s,r.x,r.y,r.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Jn);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new D(-1/0,-1/0,-1/0),new D(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,s=t.length;n<s;n++){const r=t[n];Kt.setFromBufferAttribute(r),this.morphTargetsRelative?(At.addVectors(this.boundingBox.min,Kt.min),this.boundingBox.expandByPoint(At),At.addVectors(this.boundingBox.max,Kt.max),this.boundingBox.expandByPoint(At)):(this.boundingBox.expandByPoint(Kt.min),this.boundingBox.expandByPoint(Kt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new as);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new D,1/0);return}if(e){const n=this.boundingSphere.center;if(Kt.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){const a=t[r];vs.setFromBufferAttribute(a),this.morphTargetsRelative?(At.addVectors(Kt.min,vs.min),Kt.expandByPoint(At),At.addVectors(Kt.max,vs.max),Kt.expandByPoint(At)):(Kt.expandByPoint(vs.min),Kt.expandByPoint(vs.max))}Kt.getCenter(n);let s=0;for(let r=0,o=e.count;r<o;r++)At.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(At));if(t)for(let r=0,o=t.length;r<o;r++){const a=t[r],c=this.morphTargetsRelative;for(let l=0,u=a.count;l<u;l++)At.fromBufferAttribute(a,l),c&&(Ii.fromBufferAttribute(e,l),At.add(Ii)),s=Math.max(s,n.distanceToSquared(At))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,s=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Vt(new Float32Array(4*n.count),4));const o=this.getAttribute("tangent"),a=[],c=[];for(let I=0;I<n.count;I++)a[I]=new D,c[I]=new D;const l=new D,u=new D,h=new D,d=new oe,f=new oe,g=new oe,_=new D,m=new D;function p(I,y,M){l.fromBufferAttribute(n,I),u.fromBufferAttribute(n,y),h.fromBufferAttribute(n,M),d.fromBufferAttribute(r,I),f.fromBufferAttribute(r,y),g.fromBufferAttribute(r,M),u.sub(l),h.sub(l),f.sub(d),g.sub(d);const C=1/(f.x*g.y-g.x*f.y);isFinite(C)&&(_.copy(u).multiplyScalar(g.y).addScaledVector(h,-f.y).multiplyScalar(C),m.copy(h).multiplyScalar(f.x).addScaledVector(u,-g.x).multiplyScalar(C),a[I].add(_),a[y].add(_),a[M].add(_),c[I].add(m),c[y].add(m),c[M].add(m))}let S=this.groups;S.length===0&&(S=[{start:0,count:e.count}]);for(let I=0,y=S.length;I<y;++I){const M=S[I],C=M.start,F=M.count;for(let H=C,X=C+F;H<X;H+=3)p(e.getX(H+0),e.getX(H+1),e.getX(H+2))}const T=new D,x=new D,P=new D,w=new D;function R(I){P.fromBufferAttribute(s,I),w.copy(P);const y=a[I];T.copy(y),T.sub(P.multiplyScalar(P.dot(y))).normalize(),x.crossVectors(w,y);const C=x.dot(c[I])<0?-1:1;o.setXYZW(I,T.x,T.y,T.z,C)}for(let I=0,y=S.length;I<y;++I){const M=S[I],C=M.start,F=M.count;for(let H=C,X=C+F;H<X;H+=3)R(e.getX(H+0)),R(e.getX(H+1)),R(e.getX(H+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Vt(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);const s=new D,r=new D,o=new D,a=new D,c=new D,l=new D,u=new D,h=new D;if(e)for(let d=0,f=e.count;d<f;d+=3){const g=e.getX(d+0),_=e.getX(d+1),m=e.getX(d+2);s.fromBufferAttribute(t,g),r.fromBufferAttribute(t,_),o.fromBufferAttribute(t,m),u.subVectors(o,r),h.subVectors(s,r),u.cross(h),a.fromBufferAttribute(n,g),c.fromBufferAttribute(n,_),l.fromBufferAttribute(n,m),a.add(u),c.add(u),l.add(u),n.setXYZ(g,a.x,a.y,a.z),n.setXYZ(_,c.x,c.y,c.z),n.setXYZ(m,l.x,l.y,l.z)}else for(let d=0,f=t.count;d<f;d+=3)s.fromBufferAttribute(t,d+0),r.fromBufferAttribute(t,d+1),o.fromBufferAttribute(t,d+2),u.subVectors(o,r),h.subVectors(s,r),u.cross(h),n.setXYZ(d+0,u.x,u.y,u.z),n.setXYZ(d+1,u.x,u.y,u.z),n.setXYZ(d+2,u.x,u.y,u.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)At.fromBufferAttribute(e,t),At.normalize(),e.setXYZ(t,At.x,At.y,At.z)}toNonIndexed(){function e(a,c){const l=a.array,u=a.itemSize,h=a.normalized,d=new l.constructor(c.length*u);let f=0,g=0;for(let _=0,m=c.length;_<m;_++){a.isInterleavedBufferAttribute?f=c[_]*a.data.stride+a.offset:f=c[_]*u;for(let p=0;p<u;p++)d[g++]=l[f++]}return new Vt(d,u,h)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new wt,n=this.index.array,s=this.attributes;for(const a in s){const c=s[a],l=e(c,n);t.setAttribute(a,l)}const r=this.morphAttributes;for(const a in r){const c=[],l=r[a];for(let u=0,h=l.length;u<h;u++){const d=l[u],f=e(d,n);c.push(f)}t.morphAttributes[a]=c}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,c=o.length;a<c;a++){const l=o[a];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const c in n){const l=n[c];e.data.attributes[c]=l.toJSON(e.data)}const s={};let r=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],u=[];for(let h=0,d=l.length;h<d;h++){const f=l[h];u.push(f.toJSON(e.data))}u.length>0&&(s[c]=u,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const s=e.attributes;for(const l in s){const u=s[l];this.setAttribute(l,u.clone(t))}const r=e.morphAttributes;for(const l in r){const u=[],h=r[l];for(let d=0,f=h.length;d<f;d++)u.push(h[d].clone(t));this.morphAttributes[l]=u}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let l=0,u=o.length;l<u;l++){const h=o[l];this.addGroup(h.start,h.count,h.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Vl=new nt,si=new Ja,sr=new as,Hl=new D,rr=new D,or=new D,ar=new D,vo=new D,lr=new D,Gl=new D,cr=new D;class st extends Et{constructor(e=new wt,t=new Nt){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){const n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(s,e);const a=this.morphTargetInfluences;if(r&&a){lr.set(0,0,0);for(let c=0,l=r.length;c<l;c++){const u=a[c],h=r[c];u!==0&&(vo.fromBufferAttribute(h,e),o?lr.addScaledVector(vo,u):lr.addScaledVector(vo.sub(t),u))}t.add(lr)}return t}raycast(e,t){const n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),sr.copy(n.boundingSphere),sr.applyMatrix4(r),si.copy(e.ray).recast(e.near),!(sr.containsPoint(si.origin)===!1&&(si.intersectSphere(sr,Hl)===null||si.origin.distanceToSquared(Hl)>(e.far-e.near)**2))&&(Vl.copy(r).invert(),si.copy(e.ray).applyMatrix4(Vl),!(n.boundingBox!==null&&si.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,si)))}_computeIntersections(e,t,n){let s;const r=this.geometry,o=this.material,a=r.index,c=r.attributes.position,l=r.attributes.uv,u=r.attributes.uv1,h=r.attributes.normal,d=r.groups,f=r.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,_=d.length;g<_;g++){const m=d[g],p=o[m.materialIndex],S=Math.max(m.start,f.start),T=Math.min(a.count,Math.min(m.start+m.count,f.start+f.count));for(let x=S,P=T;x<P;x+=3){const w=a.getX(x),R=a.getX(x+1),I=a.getX(x+2);s=ur(this,p,e,n,l,u,h,w,R,I),s&&(s.faceIndex=Math.floor(x/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{const g=Math.max(0,f.start),_=Math.min(a.count,f.start+f.count);for(let m=g,p=_;m<p;m+=3){const S=a.getX(m),T=a.getX(m+1),x=a.getX(m+2);s=ur(this,o,e,n,l,u,h,S,T,x),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}else if(c!==void 0)if(Array.isArray(o))for(let g=0,_=d.length;g<_;g++){const m=d[g],p=o[m.materialIndex],S=Math.max(m.start,f.start),T=Math.min(c.count,Math.min(m.start+m.count,f.start+f.count));for(let x=S,P=T;x<P;x+=3){const w=x,R=x+1,I=x+2;s=ur(this,p,e,n,l,u,h,w,R,I),s&&(s.faceIndex=Math.floor(x/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{const g=Math.max(0,f.start),_=Math.min(c.count,f.start+f.count);for(let m=g,p=_;m<p;m+=3){const S=m,T=m+1,x=m+2;s=ur(this,o,e,n,l,u,h,S,T,x),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}}}function id(i,e,t,n,s,r,o,a){let c;if(e.side===Xt?c=n.intersectTriangle(o,r,s,!0,a):c=n.intersectTriangle(s,r,o,e.side===Kn,a),c===null)return null;cr.copy(a),cr.applyMatrix4(i.matrixWorld);const l=t.ray.origin.distanceTo(cr);return l<t.near||l>t.far?null:{distance:l,point:cr.clone(),object:i}}function ur(i,e,t,n,s,r,o,a,c,l){i.getVertexPosition(a,rr),i.getVertexPosition(c,or),i.getVertexPosition(l,ar);const u=id(i,e,t,n,rr,or,ar,Gl);if(u){const h=new D;un.getBarycoord(Gl,rr,or,ar,h),s&&(u.uv=un.getInterpolatedAttribute(s,a,c,l,h,new oe)),r&&(u.uv1=un.getInterpolatedAttribute(r,a,c,l,h,new oe)),o&&(u.normal=un.getInterpolatedAttribute(o,a,c,l,h,new D),u.normal.dot(n.direction)>0&&u.normal.multiplyScalar(-1));const d={a,b:c,c:l,normal:new D,materialIndex:0};un.getNormal(rr,or,ar,d.normal),u.face=d,u.barycoord=h}return u}class jn extends wt{constructor(e=1,t=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};const a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);const c=[],l=[],u=[],h=[];let d=0,f=0;g("z","y","x",-1,-1,n,t,e,o,r,0),g("z","y","x",1,-1,n,t,-e,o,r,1),g("x","z","y",1,1,e,n,t,s,o,2),g("x","z","y",1,-1,e,n,-t,s,o,3),g("x","y","z",1,-1,e,t,n,s,r,4),g("x","y","z",-1,-1,e,t,-n,s,r,5),this.setIndex(c),this.setAttribute("position",new ht(l,3)),this.setAttribute("normal",new ht(u,3)),this.setAttribute("uv",new ht(h,2));function g(_,m,p,S,T,x,P,w,R,I,y){const M=x/R,C=P/I,F=x/2,H=P/2,X=w/2,L=R+1,U=I+1;let V=0,G=0;const J=new D;for(let se=0;se<U;se++){const de=se*C-H;for(let Te=0;Te<L;Te++){const Be=Te*M-F;J[_]=Be*S,J[m]=de*T,J[p]=X,l.push(J.x,J.y,J.z),J[_]=0,J[m]=0,J[p]=w>0?1:-1,u.push(J.x,J.y,J.z),h.push(Te/R),h.push(1-se/I),V+=1}}for(let se=0;se<I;se++)for(let de=0;de<R;de++){const Te=d+de+L*se,Be=d+de+L*(se+1),ze=d+(de+1)+L*(se+1),Ve=d+(de+1)+L*se;c.push(Te,Be,Ve),c.push(Be,ze,Ve),G+=6}a.addGroup(f,G,y),f+=G,d+=V}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new jn(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function Ji(i){const e={};for(const t in i){e[t]={};for(const n in i[t]){const s=i[t][n];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=s.clone():Array.isArray(s)?e[t][n]=s.slice():e[t][n]=s}}return e}function Bt(i){const e={};for(let t=0;t<i.length;t++){const n=Ji(i[t]);for(const s in n)e[s]=n[s]}return e}function sd(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function _u(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:tt.workingColorSpace}const xn={clone:Ji,merge:Bt};var rd=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,od=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Mt extends vi{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=rd,this.fragmentShader=od,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Ji(e.uniforms),this.uniformsGroups=sd(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const s in this.uniforms){const o=this.uniforms[s].value;o&&o.isTexture?t.uniforms[s]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[s]={type:"m4",value:o.toArray()}:t.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class vu extends Et{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new nt,this.projectionMatrix=new nt,this.projectionMatrixInverse=new nt,this.coordinateSystem=Sn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const kn=new D,Wl=new oe,Xl=new oe;class zt extends vu{constructor(e=50,t=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Nr*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Jr*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Nr*2*Math.atan(Math.tan(Jr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){kn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(kn.x,kn.y).multiplyScalar(-e/kn.z),kn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(kn.x,kn.y).multiplyScalar(-e/kn.z)}getViewSize(e,t){return this.getViewBounds(e,Wl,Xl),t.subVectors(Xl,Wl)}setViewOffset(e,t,n,s,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Jr*.5*this.fov)/this.zoom,n=2*t,s=this.aspect*n,r=-.5*s;const o=this.view;if(this.view!==null&&this.view.enabled){const c=o.fullWidth,l=o.fullHeight;r+=o.offsetX*s/c,t-=o.offsetY*n/l,s*=o.width/c,n*=o.height/l}const a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const Li=-90,Ui=1;class ad extends Et{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new zt(Li,Ui,e,t);s.layers=this.layers,this.add(s);const r=new zt(Li,Ui,e,t);r.layers=this.layers,this.add(r);const o=new zt(Li,Ui,e,t);o.layers=this.layers,this.add(o);const a=new zt(Li,Ui,e,t);a.layers=this.layers,this.add(a);const c=new zt(Li,Ui,e,t);c.layers=this.layers,this.add(c);const l=new zt(Li,Ui,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,s,r,o,a,c]=t;for(const l of t)this.remove(l);if(e===Sn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===Ur)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,c,l,u]=this.children,h=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const _=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,s),e.render(t,r),e.setRenderTarget(n,1,s),e.render(t,o),e.setRenderTarget(n,2,s),e.render(t,a),e.setRenderTarget(n,3,s),e.render(t,c),e.setRenderTarget(n,4,s),e.render(t,l),n.texture.generateMipmaps=_,e.setRenderTarget(n,5,s),e.render(t,u),e.setRenderTarget(h,d,f),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class xu extends Ft{constructor(e=[],t=Xi,n,s,r,o,a,c,l,u){super(e,t,n,s,r,o,a,c,l,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class ld extends Jt{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},s=[n,n,n,n,n,n];this.texture=new xu(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new jn(5,5,5),r=new Mt({name:"CubemapFromEquirect",uniforms:Ji(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Xt,blending:Dt});r.uniforms.tEquirect.value=t;const o=new st(s,r),a=t.minFilter;return t.minFilter===qn&&(t.minFilter=hn),new ad(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,s=!0){const r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,s);e.setRenderTarget(r)}}class Ue extends Et{constructor(){super(),this.isGroup=!0,this.type="Group"}}const cd={type:"move"};class xo{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ue,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ue,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new D,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new D),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ue,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new D,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new D),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let s=null,r=null,o=null;const a=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){o=!0;for(const _ of e.hand.values()){const m=t.getJointPose(_,n),p=this._getHandJoint(l,_);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const u=l.joints["index-finger-tip"],h=l.joints["thumb-tip"],d=u.position.distanceTo(h.position),f=.02,g=.005;l.inputState.pinching&&d>f+g?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&d<=f-g&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1));a!==null&&(s=t.getPose(e.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(cd)))}return a!==null&&(a.visible=s!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new Ue;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}class $a{constructor(e,t=25e-5){this.isFogExp2=!0,this.name="",this.color=new Ke(e),this.density=t}clone(){return new $a(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}}class Mu extends Et{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new mn,this.environmentIntensity=1,this.environmentRotation=new mn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class Qa extends Ft{constructor(e=null,t=1,n=1,s,r,o,a,c,l=kt,u=kt,h,d){super(null,o,a,c,l,u,s,r,h,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class ql extends Vt{constructor(e,t,n,s=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const Ni=new nt,Yl=new nt,hr=[],Zl=new Jn,ud=new nt,xs=new st,Ms=new as;class hd extends st{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new ql(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,ud)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new Jn),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Ni),Zl.copy(e.boundingBox).applyMatrix4(Ni),this.boundingBox.union(Zl)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new as),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Ni),Ms.copy(e.boundingSphere).applyMatrix4(Ni),this.boundingSphere.union(Ms)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const n=t.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,o=e*r+1;for(let a=0;a<n.length;a++)n[a]=s[o+a]}raycast(e,t){const n=this.matrixWorld,s=this.count;if(xs.geometry=this.geometry,xs.material=this.material,xs.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Ms.copy(this.boundingSphere),Ms.applyMatrix4(n),e.ray.intersectsSphere(Ms)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,Ni),Yl.multiplyMatrices(n,Ni),xs.matrixWorld=Yl,xs.raycast(e,hr);for(let o=0,a=hr.length;o<a;o++){const c=hr[o];c.instanceId=r,c.object=this,t.push(c)}hr.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new ql(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){const n=t.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new Qa(new Float32Array(s*this.count),s,this.count,Wa,Mn));const r=this.morphTexture.source.data.data;let o=0;for(let l=0;l<n.length;l++)o+=n[l];const a=this.geometry.morphTargetsRelative?1:1-o,c=s*e;r[c]=a,r.set(n,c+1)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const Mo=new D,dd=new D,fd=new je;class ci{constructor(e=new D(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,s){return this.normal.set(e,t,n),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const s=Mo.subVectors(n,t).cross(dd.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(Mo),s=this.normal.dot(n);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const r=-(e.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:t.copy(e.start).addScaledVector(n,r)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||fd.getNormalMatrix(e),s=this.coplanarPoint(Mo).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const ri=new as,pd=new oe(.5,.5),dr=new D;class el{constructor(e=new ci,t=new ci,n=new ci,s=new ci,r=new ci,o=new ci){this.planes=[e,t,n,s,r,o]}set(e,t,n,s,r,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Sn,n=!1){const s=this.planes,r=e.elements,o=r[0],a=r[1],c=r[2],l=r[3],u=r[4],h=r[5],d=r[6],f=r[7],g=r[8],_=r[9],m=r[10],p=r[11],S=r[12],T=r[13],x=r[14],P=r[15];if(s[0].setComponents(l-o,f-u,p-g,P-S).normalize(),s[1].setComponents(l+o,f+u,p+g,P+S).normalize(),s[2].setComponents(l+a,f+h,p+_,P+T).normalize(),s[3].setComponents(l-a,f-h,p-_,P-T).normalize(),n)s[4].setComponents(c,d,m,x).normalize(),s[5].setComponents(l-c,f-d,p-m,P-x).normalize();else if(s[4].setComponents(l-c,f-d,p-m,P-x).normalize(),t===Sn)s[5].setComponents(l+c,f+d,p+m,P+x).normalize();else if(t===Ur)s[5].setComponents(c,d,m,x).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),ri.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),ri.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(ri)}intersectsSprite(e){ri.center.set(0,0,0);const t=pd.distanceTo(e.center);return ri.radius=.7071067811865476+t,ri.applyMatrix4(e.matrixWorld),this.intersectsSphere(ri)}intersectsSphere(e){const t=this.planes,n=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const s=t[n];if(dr.x=s.normal.x>0?e.max.x:e.min.x,dr.y=s.normal.y>0?e.max.y:e.min.y,dr.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(dr)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class tl extends vi{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Ke(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const Kl=new nt,Ca=new Ja,fr=new as,pr=new D;class Su extends Et{constructor(e=new wt,t=new tl){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const n=this.geometry,s=this.matrixWorld,r=e.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),fr.copy(n.boundingSphere),fr.applyMatrix4(s),fr.radius+=r,e.ray.intersectsSphere(fr)===!1)return;Kl.copy(s).invert(),Ca.copy(e.ray).applyMatrix4(Kl);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=n.index,h=n.attributes.position;if(l!==null){const d=Math.max(0,o.start),f=Math.min(l.count,o.start+o.count);for(let g=d,_=f;g<_;g++){const m=l.getX(g);pr.fromBufferAttribute(h,m),Jl(pr,m,c,s,e,t,this)}}else{const d=Math.max(0,o.start),f=Math.min(h.count,o.start+o.count);for(let g=d,_=f;g<_;g++)pr.fromBufferAttribute(h,g),Jl(pr,g,c,s,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function Jl(i,e,t,n,s,r,o){const a=Ca.distanceSqToPoint(i);if(a<t){const c=new D;Ca.closestPointToPoint(i,c),c.applyMatrix4(n);const l=s.ray.origin.distanceTo(c);if(l<s.near||l>s.far)return;r.push({distance:l,distanceToRay:Math.sqrt(a),point:c,index:e,face:null,faceIndex:null,barycoord:null,object:o})}}class ls extends Ft{constructor(e,t,n,s,r,o,a,c,l){super(e,t,n,s,r,o,a,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}}class nl extends Ft{constructor(e,t,n=mi,s,r,o,a=kt,c=kt,l,u=Is,h=1){if(u!==Is&&u!==Zi)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const d={width:e,height:t,depth:h};super(d,s,r,o,a,c,u,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Ka(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class yu extends Ft{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class zr extends wt{constructor(e=1,t=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:s},t=Math.max(3,t);const r=[],o=[],a=[],c=[],l=new D,u=new oe;o.push(0,0,0),a.push(0,0,1),c.push(.5,.5);for(let h=0,d=3;h<=t;h++,d+=3){const f=n+h/t*s;l.x=e*Math.cos(f),l.y=e*Math.sin(f),o.push(l.x,l.y,l.z),a.push(0,0,1),u.x=(o[d]/e+1)/2,u.y=(o[d+1]/e+1)/2,c.push(u.x,u.y)}for(let h=1;h<=t;h++)r.push(h,h+1,0);this.setIndex(r),this.setAttribute("position",new ht(o,3)),this.setAttribute("normal",new ht(a,3)),this.setAttribute("uv",new ht(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new zr(e.radius,e.segments,e.thetaStart,e.thetaLength)}}class ji extends wt{constructor(e=1,t=1,n=1,s=32,r=1,o=!1,a=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:s,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:c};const l=this;s=Math.floor(s),r=Math.floor(r);const u=[],h=[],d=[],f=[];let g=0;const _=[],m=n/2;let p=0;S(),o===!1&&(e>0&&T(!0),t>0&&T(!1)),this.setIndex(u),this.setAttribute("position",new ht(h,3)),this.setAttribute("normal",new ht(d,3)),this.setAttribute("uv",new ht(f,2));function S(){const x=new D,P=new D;let w=0;const R=(t-e)/n;for(let I=0;I<=r;I++){const y=[],M=I/r,C=M*(t-e)+e;for(let F=0;F<=s;F++){const H=F/s,X=H*c+a,L=Math.sin(X),U=Math.cos(X);P.x=C*L,P.y=-M*n+m,P.z=C*U,h.push(P.x,P.y,P.z),x.set(L,R,U).normalize(),d.push(x.x,x.y,x.z),f.push(H,1-M),y.push(g++)}_.push(y)}for(let I=0;I<s;I++)for(let y=0;y<r;y++){const M=_[y][I],C=_[y+1][I],F=_[y+1][I+1],H=_[y][I+1];(e>0||y!==0)&&(u.push(M,C,H),w+=3),(t>0||y!==r-1)&&(u.push(C,F,H),w+=3)}l.addGroup(p,w,0),p+=w}function T(x){const P=g,w=new oe,R=new D;let I=0;const y=x===!0?e:t,M=x===!0?1:-1;for(let F=1;F<=s;F++)h.push(0,m*M,0),d.push(0,M,0),f.push(.5,.5),g++;const C=g;for(let F=0;F<=s;F++){const X=F/s*c+a,L=Math.cos(X),U=Math.sin(X);R.x=y*U,R.y=m*M,R.z=y*L,h.push(R.x,R.y,R.z),d.push(0,M,0),w.x=L*.5+.5,w.y=U*.5*M+.5,f.push(w.x,w.y),g++}for(let F=0;F<s;F++){const H=P+F,X=C+F;x===!0?u.push(X,X+1,H):u.push(X+1,X,H),I+=3}l.addGroup(p,I,x===!0?1:2),p+=I}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ji(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class En{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){console.warn("THREE.Curve: .getPoint() not implemented.")}getPointAt(e,t){const n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){const e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const t=[];let n,s=this.getPoint(0),r=0;t.push(0);for(let o=1;o<=e;o++)n=this.getPoint(o/e),r+=n.distanceTo(s),t.push(r),s=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){const n=this.getLengths();let s=0;const r=n.length;let o;t?o=t:o=e*n[r-1];let a=0,c=r-1,l;for(;a<=c;)if(s=Math.floor(a+(c-a)/2),l=n[s]-o,l<0)a=s+1;else if(l>0)c=s-1;else{c=s;break}if(s=c,n[s]===o)return s/(r-1);const u=n[s],d=n[s+1]-u,f=(o-u)/d;return(s+f)/(r-1)}getTangent(e,t){let s=e-1e-4,r=e+1e-4;s<0&&(s=0),r>1&&(r=1);const o=this.getPoint(s),a=this.getPoint(r),c=t||(o.isVector2?new oe:new D);return c.copy(a).sub(o).normalize(),c}getTangentAt(e,t){const n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){const n=new D,s=[],r=[],o=[],a=new D,c=new nt;for(let f=0;f<=e;f++){const g=f/e;s[f]=this.getTangentAt(g,new D)}r[0]=new D,o[0]=new D;let l=Number.MAX_VALUE;const u=Math.abs(s[0].x),h=Math.abs(s[0].y),d=Math.abs(s[0].z);u<=l&&(l=u,n.set(1,0,0)),h<=l&&(l=h,n.set(0,1,0)),d<=l&&n.set(0,0,1),a.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],a),o[0].crossVectors(s[0],r[0]);for(let f=1;f<=e;f++){if(r[f]=r[f-1].clone(),o[f]=o[f-1].clone(),a.crossVectors(s[f-1],s[f]),a.length()>Number.EPSILON){a.normalize();const g=Math.acos(Qe(s[f-1].dot(s[f]),-1,1));r[f].applyMatrix4(c.makeRotationAxis(a,g))}o[f].crossVectors(s[f],r[f])}if(t===!0){let f=Math.acos(Qe(r[0].dot(r[e]),-1,1));f/=e,s[0].dot(a.crossVectors(r[0],r[e]))>0&&(f=-f);for(let g=1;g<=e;g++)r[g].applyMatrix4(c.makeRotationAxis(s[g],f*g)),o[g].crossVectors(s[g],r[g])}return{tangents:s,normals:r,binormals:o}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){const e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}}class il extends En{constructor(e=0,t=0,n=1,s=1,r=0,o=Math.PI*2,a=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=o,this.aClockwise=a,this.aRotation=c}getPoint(e,t=new oe){const n=t,s=Math.PI*2;let r=this.aEndAngle-this.aStartAngle;const o=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(o?r=0:r=s),this.aClockwise===!0&&!o&&(r===s?r=-s:r=r-s);const a=this.aStartAngle+e*r;let c=this.aX+this.xRadius*Math.cos(a),l=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){const u=Math.cos(this.aRotation),h=Math.sin(this.aRotation),d=c-this.aX,f=l-this.aY;c=d*u-f*h+this.aX,l=d*h+f*u+this.aY}return n.set(c,l)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){const e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}}class md extends il{constructor(e,t,n,s,r,o){super(e,t,n,n,s,r,o),this.isArcCurve=!0,this.type="ArcCurve"}}function sl(){let i=0,e=0,t=0,n=0;function s(r,o,a,c){i=r,e=a,t=-3*r+3*o-2*a-c,n=2*r-2*o+a+c}return{initCatmullRom:function(r,o,a,c,l){s(o,a,l*(a-r),l*(c-o))},initNonuniformCatmullRom:function(r,o,a,c,l,u,h){let d=(o-r)/l-(a-r)/(l+u)+(a-o)/u,f=(a-o)/u-(c-o)/(u+h)+(c-a)/h;d*=u,f*=u,s(o,a,d,f)},calc:function(r){const o=r*r,a=o*r;return i+e*r+t*o+n*a}}}const mr=new D,So=new sl,yo=new sl,Eo=new sl;class gd extends En{constructor(e=[],t=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=s}getPoint(e,t=new D){const n=t,s=this.points,r=s.length,o=(r-(this.closed?0:1))*e;let a=Math.floor(o),c=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/r)+1)*r:c===0&&a===r-1&&(a=r-2,c=1);let l,u;this.closed||a>0?l=s[(a-1)%r]:(mr.subVectors(s[0],s[1]).add(s[0]),l=mr);const h=s[a%r],d=s[(a+1)%r];if(this.closed||a+2<r?u=s[(a+2)%r]:(mr.subVectors(s[r-1],s[r-2]).add(s[r-1]),u=mr),this.curveType==="centripetal"||this.curveType==="chordal"){const f=this.curveType==="chordal"?.5:.25;let g=Math.pow(l.distanceToSquared(h),f),_=Math.pow(h.distanceToSquared(d),f),m=Math.pow(d.distanceToSquared(u),f);_<1e-4&&(_=1),g<1e-4&&(g=_),m<1e-4&&(m=_),So.initNonuniformCatmullRom(l.x,h.x,d.x,u.x,g,_,m),yo.initNonuniformCatmullRom(l.y,h.y,d.y,u.y,g,_,m),Eo.initNonuniformCatmullRom(l.z,h.z,d.z,u.z,g,_,m)}else this.curveType==="catmullrom"&&(So.initCatmullRom(l.x,h.x,d.x,u.x,this.tension),yo.initCatmullRom(l.y,h.y,d.y,u.y,this.tension),Eo.initCatmullRom(l.z,h.z,d.z,u.z,this.tension));return n.set(So.calc(c),yo.calc(c),Eo.calc(c)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const s=e.points[t];this.points.push(s.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const s=this.points[t];e.points.push(s.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const s=e.points[t];this.points.push(new D().fromArray(s))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}}function jl(i,e,t,n,s){const r=(n-e)*.5,o=(s-t)*.5,a=i*i,c=i*a;return(2*t-2*n+r+o)*c+(-3*t+3*n-2*r-o)*a+r*i+t}function _d(i,e){const t=1-i;return t*t*e}function vd(i,e){return 2*(1-i)*i*e}function xd(i,e){return i*i*e}function As(i,e,t,n){return _d(i,e)+vd(i,t)+xd(i,n)}function Md(i,e){const t=1-i;return t*t*t*e}function Sd(i,e){const t=1-i;return 3*t*t*i*e}function yd(i,e){return 3*(1-i)*i*i*e}function Ed(i,e){return i*i*i*e}function Cs(i,e,t,n,s){return Md(i,e)+Sd(i,t)+yd(i,n)+Ed(i,s)}class Eu extends En{constructor(e=new oe,t=new oe,n=new oe,s=new oe){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new oe){const n=t,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Cs(e,s.x,r.x,o.x,a.x),Cs(e,s.y,r.y,o.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class Td extends En{constructor(e=new D,t=new D,n=new D,s=new D){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new D){const n=t,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Cs(e,s.x,r.x,o.x,a.x),Cs(e,s.y,r.y,o.y,a.y),Cs(e,s.z,r.z,o.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class Tu extends En{constructor(e=new oe,t=new oe){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new oe){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new oe){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class bd extends En{constructor(e=new D,t=new D){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new D){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new D){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class bu extends En{constructor(e=new oe,t=new oe,n=new oe){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new oe){const n=t,s=this.v0,r=this.v1,o=this.v2;return n.set(As(e,s.x,r.x,o.x),As(e,s.y,r.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class wd extends En{constructor(e=new D,t=new D,n=new D){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new D){const n=t,s=this.v0,r=this.v1,o=this.v2;return n.set(As(e,s.x,r.x,o.x),As(e,s.y,r.y,o.y),As(e,s.z,r.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class wu extends En{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new oe){const n=t,s=this.points,r=(s.length-1)*e,o=Math.floor(r),a=r-o,c=s[o===0?o:o-1],l=s[o],u=s[o>s.length-2?s.length-1:o+1],h=s[o>s.length-3?s.length-1:o+2];return n.set(jl(a,c.x,l.x,u.x,h.x),jl(a,c.y,l.y,u.y,h.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const s=e.points[t];this.points.push(s.clone())}return this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const s=this.points[t];e.points.push(s.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const s=e.points[t];this.points.push(new oe().fromArray(s))}return this}}var Ra=Object.freeze({__proto__:null,ArcCurve:md,CatmullRomCurve3:gd,CubicBezierCurve:Eu,CubicBezierCurve3:Td,EllipseCurve:il,LineCurve:Tu,LineCurve3:bd,QuadraticBezierCurve:bu,QuadraticBezierCurve3:wd,SplineCurve:wu});class Ad extends En{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){const e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){const n=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Ra[n](t,e))}return this}getPoint(e,t){const n=e*this.getLength(),s=this.getCurveLengths();let r=0;for(;r<s.length;){if(s[r]>=n){const o=s[r]-n,a=this.curves[r],c=a.getLength(),l=c===0?0:1-o/c;return a.getPointAt(l,t)}r++}return null}getLength(){const e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const e=[];let t=0;for(let n=0,s=this.curves.length;n<s;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){const t=[];let n;for(let s=0,r=this.curves;s<r.length;s++){const o=r[s],a=o.isEllipseCurve?e*2:o.isLineCurve||o.isLineCurve3?1:o.isSplineCurve?e*o.points.length:e,c=o.getPoints(a);for(let l=0;l<c.length;l++){const u=c[l];n&&n.equals(u)||(t.push(u),n=u)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){const s=e.curves[t];this.curves.push(s.clone())}return this.autoClose=e.autoClose,this}toJSON(){const e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){const s=this.curves[t];e.curves.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){const s=e.curves[t];this.curves.push(new Ra[s.type]().fromJSON(s))}return this}}class Us extends Ad{constructor(e){super(),this.type="Path",this.currentPoint=new oe,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){const n=new Tu(this.currentPoint.clone(),new oe(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,s){const r=new bu(this.currentPoint.clone(),new oe(e,t),new oe(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(e,t,n,s,r,o){const a=new Eu(this.currentPoint.clone(),new oe(e,t),new oe(n,s),new oe(r,o));return this.curves.push(a),this.currentPoint.set(r,o),this}splineThru(e){const t=[this.currentPoint.clone()].concat(e),n=new wu(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,s,r,o){const a=this.currentPoint.x,c=this.currentPoint.y;return this.absarc(e+a,t+c,n,s,r,o),this}absarc(e,t,n,s,r,o){return this.absellipse(e,t,n,n,s,r,o),this}ellipse(e,t,n,s,r,o,a,c){const l=this.currentPoint.x,u=this.currentPoint.y;return this.absellipse(e+l,t+u,n,s,r,o,a,c),this}absellipse(e,t,n,s,r,o,a,c){const l=new il(e,t,n,s,r,o,a,c);if(this.curves.length>0){const h=l.getPoint(0);h.equals(this.currentPoint)||this.lineTo(h.x,h.y)}this.curves.push(l);const u=l.getPoint(1);return this.currentPoint.copy(u),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){const e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}}class Hs extends Us{constructor(e){super(e),this.uuid=os(),this.type="Shape",this.holes=[]}getPointsHoles(e){const t=[];for(let n=0,s=this.holes.length;n<s;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){const s=e.holes[t];this.holes.push(s.clone())}return this}toJSON(){const e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){const s=this.holes[t];e.holes.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){const s=e.holes[t];this.holes.push(new Us().fromJSON(s))}return this}}function Cd(i,e,t=2){const n=e&&e.length,s=n?e[0]*t:i.length;let r=Au(i,0,s,t,!0);const o=[];if(!r||r.next===r.prev)return o;let a,c,l;if(n&&(r=Ld(i,e,r,t)),i.length>80*t){a=1/0,c=1/0;let u=-1/0,h=-1/0;for(let d=t;d<s;d+=t){const f=i[d],g=i[d+1];f<a&&(a=f),g<c&&(c=g),f>u&&(u=f),g>h&&(h=g)}l=Math.max(u-a,h-c),l=l!==0?32767/l:0}return Ns(r,o,t,a,c,l,0),o}function Au(i,e,t,n,s){let r;if(s===Wd(i,e,t,n)>0)for(let o=e;o<t;o+=n)r=$l(o/n|0,i[o],i[o+1],r);else for(let o=t-n;o>=e;o-=n)r=$l(o/n|0,i[o],i[o+1],r);return r&&$i(r,r.next)&&(Os(r),r=r.next),r}function gi(i,e){if(!i)return i;e||(e=i);let t=i,n;do if(n=!1,!t.steiner&&($i(t,t.next)||vt(t.prev,t,t.next)===0)){if(Os(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function Ns(i,e,t,n,s,r,o){if(!i)return;!o&&r&&Bd(i,n,s,r);let a=i;for(;i.prev!==i.next;){const c=i.prev,l=i.next;if(r?Pd(i,n,s,r):Rd(i)){e.push(c.i,i.i,l.i),Os(i),i=l.next,a=l.next;continue}if(i=l,i===a){o?o===1?(i=Dd(gi(i),e),Ns(i,e,t,n,s,r,2)):o===2&&Id(i,e,t,n,s,r):Ns(gi(i),e,t,n,s,r,1);break}}}function Rd(i){const e=i.prev,t=i,n=i.next;if(vt(e,t,n)>=0)return!1;const s=e.x,r=t.x,o=n.x,a=e.y,c=t.y,l=n.y,u=Math.min(s,r,o),h=Math.min(a,c,l),d=Math.max(s,r,o),f=Math.max(a,c,l);let g=n.next;for(;g!==e;){if(g.x>=u&&g.x<=d&&g.y>=h&&g.y<=f&&bs(s,a,r,c,o,l,g.x,g.y)&&vt(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function Pd(i,e,t,n){const s=i.prev,r=i,o=i.next;if(vt(s,r,o)>=0)return!1;const a=s.x,c=r.x,l=o.x,u=s.y,h=r.y,d=o.y,f=Math.min(a,c,l),g=Math.min(u,h,d),_=Math.max(a,c,l),m=Math.max(u,h,d),p=Pa(f,g,e,t,n),S=Pa(_,m,e,t,n);let T=i.prevZ,x=i.nextZ;for(;T&&T.z>=p&&x&&x.z<=S;){if(T.x>=f&&T.x<=_&&T.y>=g&&T.y<=m&&T!==s&&T!==o&&bs(a,u,c,h,l,d,T.x,T.y)&&vt(T.prev,T,T.next)>=0||(T=T.prevZ,x.x>=f&&x.x<=_&&x.y>=g&&x.y<=m&&x!==s&&x!==o&&bs(a,u,c,h,l,d,x.x,x.y)&&vt(x.prev,x,x.next)>=0))return!1;x=x.nextZ}for(;T&&T.z>=p;){if(T.x>=f&&T.x<=_&&T.y>=g&&T.y<=m&&T!==s&&T!==o&&bs(a,u,c,h,l,d,T.x,T.y)&&vt(T.prev,T,T.next)>=0)return!1;T=T.prevZ}for(;x&&x.z<=S;){if(x.x>=f&&x.x<=_&&x.y>=g&&x.y<=m&&x!==s&&x!==o&&bs(a,u,c,h,l,d,x.x,x.y)&&vt(x.prev,x,x.next)>=0)return!1;x=x.nextZ}return!0}function Dd(i,e){let t=i;do{const n=t.prev,s=t.next.next;!$i(n,s)&&Ru(n,t,t.next,s)&&Fs(n,s)&&Fs(s,n)&&(e.push(n.i,t.i,s.i),Os(t),Os(t.next),t=i=s),t=t.next}while(t!==i);return gi(t)}function Id(i,e,t,n,s,r){let o=i;do{let a=o.next.next;for(;a!==o.prev;){if(o.i!==a.i&&Vd(o,a)){let c=Pu(o,a);o=gi(o,o.next),c=gi(c,c.next),Ns(o,e,t,n,s,r,0),Ns(c,e,t,n,s,r,0);return}a=a.next}o=o.next}while(o!==i)}function Ld(i,e,t,n){const s=[];for(let r=0,o=e.length;r<o;r++){const a=e[r]*n,c=r<o-1?e[r+1]*n:i.length,l=Au(i,a,c,n,!1);l===l.next&&(l.steiner=!0),s.push(kd(l))}s.sort(Ud);for(let r=0;r<s.length;r++)t=Nd(s[r],t);return t}function Ud(i,e){let t=i.x-e.x;if(t===0&&(t=i.y-e.y,t===0)){const n=(i.next.y-i.y)/(i.next.x-i.x),s=(e.next.y-e.y)/(e.next.x-e.x);t=n-s}return t}function Nd(i,e){const t=Fd(i,e);if(!t)return e;const n=Pu(t,i);return gi(n,n.next),gi(t,t.next)}function Fd(i,e){let t=e;const n=i.x,s=i.y;let r=-1/0,o;if($i(i,t))return t;do{if($i(i,t.next))return t.next;if(s<=t.y&&s>=t.next.y&&t.next.y!==t.y){const h=t.x+(s-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(h<=n&&h>r&&(r=h,o=t.x<t.next.x?t:t.next,h===n))return o}t=t.next}while(t!==e);if(!o)return null;const a=o,c=o.x,l=o.y;let u=1/0;t=o;do{if(n>=t.x&&t.x>=c&&n!==t.x&&Cu(s<l?n:r,s,c,l,s<l?r:n,s,t.x,t.y)){const h=Math.abs(s-t.y)/(n-t.x);Fs(t,i)&&(h<u||h===u&&(t.x>o.x||t.x===o.x&&Od(o,t)))&&(o=t,u=h)}t=t.next}while(t!==a);return o}function Od(i,e){return vt(i.prev,i,e.prev)<0&&vt(e.next,i,i.next)<0}function Bd(i,e,t,n){let s=i;do s.z===0&&(s.z=Pa(s.x,s.y,e,t,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,zd(s)}function zd(i){let e,t=1;do{let n=i,s;i=null;let r=null;for(e=0;n;){e++;let o=n,a=0;for(let l=0;l<t&&(a++,o=o.nextZ,!!o);l++);let c=t;for(;a>0||c>0&&o;)a!==0&&(c===0||!o||n.z<=o.z)?(s=n,n=n.nextZ,a--):(s=o,o=o.nextZ,c--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=o}r.nextZ=null,t*=2}while(e>1);return i}function Pa(i,e,t,n,s){return i=(i-t)*s|0,e=(e-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,i|e<<1}function kd(i){let e=i,t=i;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==i);return t}function Cu(i,e,t,n,s,r,o,a){return(s-o)*(e-a)>=(i-o)*(r-a)&&(i-o)*(n-a)>=(t-o)*(e-a)&&(t-o)*(r-a)>=(s-o)*(n-a)}function bs(i,e,t,n,s,r,o,a){return!(i===o&&e===a)&&Cu(i,e,t,n,s,r,o,a)}function Vd(i,e){return i.next.i!==e.i&&i.prev.i!==e.i&&!Hd(i,e)&&(Fs(i,e)&&Fs(e,i)&&Gd(i,e)&&(vt(i.prev,i,e.prev)||vt(i,e.prev,e))||$i(i,e)&&vt(i.prev,i,i.next)>0&&vt(e.prev,e,e.next)>0)}function vt(i,e,t){return(e.y-i.y)*(t.x-e.x)-(e.x-i.x)*(t.y-e.y)}function $i(i,e){return i.x===e.x&&i.y===e.y}function Ru(i,e,t,n){const s=_r(vt(i,e,t)),r=_r(vt(i,e,n)),o=_r(vt(t,n,i)),a=_r(vt(t,n,e));return!!(s!==r&&o!==a||s===0&&gr(i,t,e)||r===0&&gr(i,n,e)||o===0&&gr(t,i,n)||a===0&&gr(t,e,n))}function gr(i,e,t){return e.x<=Math.max(i.x,t.x)&&e.x>=Math.min(i.x,t.x)&&e.y<=Math.max(i.y,t.y)&&e.y>=Math.min(i.y,t.y)}function _r(i){return i>0?1:i<0?-1:0}function Hd(i,e){let t=i;do{if(t.i!==i.i&&t.next.i!==i.i&&t.i!==e.i&&t.next.i!==e.i&&Ru(t,t.next,i,e))return!0;t=t.next}while(t!==i);return!1}function Fs(i,e){return vt(i.prev,i,i.next)<0?vt(i,e,i.next)>=0&&vt(i,i.prev,e)>=0:vt(i,e,i.prev)<0||vt(i,i.next,e)<0}function Gd(i,e){let t=i,n=!1;const s=(i.x+e.x)/2,r=(i.y+e.y)/2;do t.y>r!=t.next.y>r&&t.next.y!==t.y&&s<(t.next.x-t.x)*(r-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==i);return n}function Pu(i,e){const t=Da(i.i,i.x,i.y),n=Da(e.i,e.x,e.y),s=i.next,r=e.prev;return i.next=e,e.prev=i,t.next=s,s.prev=t,n.next=t,t.prev=n,r.next=n,n.prev=r,n}function $l(i,e,t,n){const s=Da(i,e,t);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function Os(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function Da(i,e,t){return{i,x:e,y:t,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function Wd(i,e,t,n){let s=0;for(let r=e,o=t-n;r<t;r+=n)s+=(i[o]-i[r])*(i[r+1]+i[o+1]),o=r;return s}class Xd{static triangulate(e,t,n=2){return Cd(e,t,n)}}class Bi{static area(e){const t=e.length;let n=0;for(let s=t-1,r=0;r<t;s=r++)n+=e[s].x*e[r].y-e[r].x*e[s].y;return n*.5}static isClockWise(e){return Bi.area(e)<0}static triangulateShape(e,t){const n=[],s=[],r=[];Ql(e),ec(n,e);let o=e.length;t.forEach(Ql);for(let c=0;c<t.length;c++)s.push(o),o+=t[c].length,ec(n,t[c]);const a=Xd.triangulate(n,s);for(let c=0;c<a.length;c+=3)r.push(a.slice(c,c+3));return r}}function Ql(i){const e=i.length;e>2&&i[e-1].equals(i[0])&&i.pop()}function ec(i,e){for(let t=0;t<e.length;t++)i.push(e[t].x),i.push(e[t].y)}class Gs extends wt{constructor(e=new Hs([new oe(.5,.5),new oe(-.5,.5),new oe(-.5,-.5),new oe(.5,-.5)]),t={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];const n=this,s=[],r=[];for(let a=0,c=e.length;a<c;a++){const l=e[a];o(l)}this.setAttribute("position",new ht(s,3)),this.setAttribute("uv",new ht(r,2)),this.computeVertexNormals();function o(a){const c=[],l=t.curveSegments!==void 0?t.curveSegments:12,u=t.steps!==void 0?t.steps:1,h=t.depth!==void 0?t.depth:1;let d=t.bevelEnabled!==void 0?t.bevelEnabled:!0,f=t.bevelThickness!==void 0?t.bevelThickness:.2,g=t.bevelSize!==void 0?t.bevelSize:f-.1,_=t.bevelOffset!==void 0?t.bevelOffset:0,m=t.bevelSegments!==void 0?t.bevelSegments:3;const p=t.extrudePath,S=t.UVGenerator!==void 0?t.UVGenerator:qd;let T,x=!1,P,w,R,I;p&&(T=p.getSpacedPoints(u),x=!0,d=!1,P=p.computeFrenetFrames(u,!1),w=new D,R=new D,I=new D),d||(m=0,f=0,g=0,_=0);const y=a.extractPoints(l);let M=y.shape;const C=y.holes;if(!Bi.isClockWise(M)){M=M.reverse();for(let te=0,Q=C.length;te<Q;te++){const j=C[te];Bi.isClockWise(j)&&(C[te]=j.reverse())}}function H(te){const j=10000000000000001e-36;let $=te[0];for(let pe=1;pe<=te.length;pe++){const re=pe%te.length,me=te[re],Ge=me.x-$.x,Fe=me.y-$.y,b=Ge*Ge+Fe*Fe,v=Math.max(Math.abs(me.x),Math.abs(me.y),Math.abs($.x),Math.abs($.y)),k=j*v*v;if(b<=k){te.splice(re,1),pe--;continue}$=me}}H(M),C.forEach(H);const X=C.length,L=M;for(let te=0;te<X;te++){const Q=C[te];M=M.concat(Q)}function U(te,Q,j){return Q||console.error("THREE.ExtrudeGeometry: vec does not exist"),te.clone().addScaledVector(Q,j)}const V=M.length;function G(te,Q,j){let $,pe,re;const me=te.x-Q.x,Ge=te.y-Q.y,Fe=j.x-te.x,b=j.y-te.y,v=me*me+Ge*Ge,k=me*b-Ge*Fe;if(Math.abs(k)>Number.EPSILON){const Z=Math.sqrt(v),ie=Math.sqrt(Fe*Fe+b*b),K=Q.x-Ge/Z,we=Q.y+me/Z,ue=j.x-b/ie,be=j.y+Fe/ie,Re=((ue-K)*b-(be-we)*Fe)/(me*b-Ge*Fe);$=K+me*Re-te.x,pe=we+Ge*Re-te.y;const le=$*$+pe*pe;if(le<=2)return new oe($,pe);re=Math.sqrt(le/2)}else{let Z=!1;me>Number.EPSILON?Fe>Number.EPSILON&&(Z=!0):me<-Number.EPSILON?Fe<-Number.EPSILON&&(Z=!0):Math.sign(Ge)===Math.sign(b)&&(Z=!0),Z?($=-Ge,pe=me,re=Math.sqrt(v)):($=me,pe=Ge,re=Math.sqrt(v/2))}return new oe($/re,pe/re)}const J=[];for(let te=0,Q=L.length,j=Q-1,$=te+1;te<Q;te++,j++,$++)j===Q&&(j=0),$===Q&&($=0),J[te]=G(L[te],L[j],L[$]);const se=[];let de,Te=J.concat();for(let te=0,Q=X;te<Q;te++){const j=C[te];de=[];for(let $=0,pe=j.length,re=pe-1,me=$+1;$<pe;$++,re++,me++)re===pe&&(re=0),me===pe&&(me=0),de[$]=G(j[$],j[re],j[me]);se.push(de),Te=Te.concat(de)}let Be;if(m===0)Be=Bi.triangulateShape(L,C);else{const te=[],Q=[];for(let j=0;j<m;j++){const $=j/m,pe=f*Math.cos($*Math.PI/2),re=g*Math.sin($*Math.PI/2)+_;for(let me=0,Ge=L.length;me<Ge;me++){const Fe=U(L[me],J[me],re);Se(Fe.x,Fe.y,-pe),$===0&&te.push(Fe)}for(let me=0,Ge=X;me<Ge;me++){const Fe=C[me];de=se[me];const b=[];for(let v=0,k=Fe.length;v<k;v++){const Z=U(Fe[v],de[v],re);Se(Z.x,Z.y,-pe),$===0&&b.push(Z)}$===0&&Q.push(b)}}Be=Bi.triangulateShape(te,Q)}const ze=Be.length,Ve=g+_;for(let te=0;te<V;te++){const Q=d?U(M[te],Te[te],Ve):M[te];x?(R.copy(P.normals[0]).multiplyScalar(Q.x),w.copy(P.binormals[0]).multiplyScalar(Q.y),I.copy(T[0]).add(R).add(w),Se(I.x,I.y,I.z)):Se(Q.x,Q.y,0)}for(let te=1;te<=u;te++)for(let Q=0;Q<V;Q++){const j=d?U(M[Q],Te[Q],Ve):M[Q];x?(R.copy(P.normals[te]).multiplyScalar(j.x),w.copy(P.binormals[te]).multiplyScalar(j.y),I.copy(T[te]).add(R).add(w),Se(I.x,I.y,I.z)):Se(j.x,j.y,h/u*te)}for(let te=m-1;te>=0;te--){const Q=te/m,j=f*Math.cos(Q*Math.PI/2),$=g*Math.sin(Q*Math.PI/2)+_;for(let pe=0,re=L.length;pe<re;pe++){const me=U(L[pe],J[pe],$);Se(me.x,me.y,h+j)}for(let pe=0,re=C.length;pe<re;pe++){const me=C[pe];de=se[pe];for(let Ge=0,Fe=me.length;Ge<Fe;Ge++){const b=U(me[Ge],de[Ge],$);x?Se(b.x,b.y+T[u-1].y,T[u-1].x+j):Se(b.x,b.y,h+j)}}}Y(),ee();function Y(){const te=s.length/3;if(d){let Q=0,j=V*Q;for(let $=0;$<ze;$++){const pe=Be[$];ve(pe[2]+j,pe[1]+j,pe[0]+j)}Q=u+m*2,j=V*Q;for(let $=0;$<ze;$++){const pe=Be[$];ve(pe[0]+j,pe[1]+j,pe[2]+j)}}else{for(let Q=0;Q<ze;Q++){const j=Be[Q];ve(j[2],j[1],j[0])}for(let Q=0;Q<ze;Q++){const j=Be[Q];ve(j[0]+V*u,j[1]+V*u,j[2]+V*u)}}n.addGroup(te,s.length/3-te,0)}function ee(){const te=s.length/3;let Q=0;_e(L,Q),Q+=L.length;for(let j=0,$=C.length;j<$;j++){const pe=C[j];_e(pe,Q),Q+=pe.length}n.addGroup(te,s.length/3-te,1)}function _e(te,Q){let j=te.length;for(;--j>=0;){const $=j;let pe=j-1;pe<0&&(pe=te.length-1);for(let re=0,me=u+m*2;re<me;re++){const Ge=V*re,Fe=V*(re+1),b=Q+$+Ge,v=Q+pe+Ge,k=Q+pe+Fe,Z=Q+$+Fe;Ne(b,v,k,Z)}}}function Se(te,Q,j){c.push(te),c.push(Q),c.push(j)}function ve(te,Q,j){De(te),De(Q),De(j);const $=s.length/3,pe=S.generateTopUV(n,s,$-3,$-2,$-1);A(pe[0]),A(pe[1]),A(pe[2])}function Ne(te,Q,j,$){De(te),De(Q),De($),De(Q),De(j),De($);const pe=s.length/3,re=S.generateSideWallUV(n,s,pe-6,pe-3,pe-2,pe-1);A(re[0]),A(re[1]),A(re[3]),A(re[1]),A(re[2]),A(re[3])}function De(te){s.push(c[te*3+0]),s.push(c[te*3+1]),s.push(c[te*3+2])}function A(te){r.push(te.x),r.push(te.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){const e=super.toJSON(),t=this.parameters.shapes,n=this.parameters.options;return Yd(t,n,e)}static fromJSON(e,t){const n=[];for(let r=0,o=e.shapes.length;r<o;r++){const a=t[e.shapes[r]];n.push(a)}const s=e.options.extrudePath;return s!==void 0&&(e.options.extrudePath=new Ra[s.type]().fromJSON(s)),new Gs(n,e.options)}}const qd={generateTopUV:function(i,e,t,n,s){const r=e[t*3],o=e[t*3+1],a=e[n*3],c=e[n*3+1],l=e[s*3],u=e[s*3+1];return[new oe(r,o),new oe(a,c),new oe(l,u)]},generateSideWallUV:function(i,e,t,n,s,r){const o=e[t*3],a=e[t*3+1],c=e[t*3+2],l=e[n*3],u=e[n*3+1],h=e[n*3+2],d=e[s*3],f=e[s*3+1],g=e[s*3+2],_=e[r*3],m=e[r*3+1],p=e[r*3+2];return Math.abs(a-u)<Math.abs(o-l)?[new oe(o,1-c),new oe(l,1-h),new oe(d,1-g),new oe(_,1-p)]:[new oe(a,1-c),new oe(u,1-h),new oe(f,1-g),new oe(m,1-p)]}};function Yd(i,e,t){if(t.shapes=[],Array.isArray(i))for(let n=0,s=i.length;n<s;n++){const r=i[n];t.shapes.push(r.uuid)}else t.shapes.push(i.uuid);return t.options=Object.assign({},e),e.extrudePath!==void 0&&(t.options.extrudePath=e.extrudePath.toJSON()),t}class rl extends wt{constructor(e=[new oe(0,-.5),new oe(.5,0),new oe(0,.5)],t=12,n=0,s=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:e,segments:t,phiStart:n,phiLength:s},t=Math.floor(t),s=Qe(s,0,Math.PI*2);const r=[],o=[],a=[],c=[],l=[],u=1/t,h=new D,d=new oe,f=new D,g=new D,_=new D;let m=0,p=0;for(let S=0;S<=e.length-1;S++)switch(S){case 0:m=e[S+1].x-e[S].x,p=e[S+1].y-e[S].y,f.x=p*1,f.y=-m,f.z=p*0,_.copy(f),f.normalize(),c.push(f.x,f.y,f.z);break;case e.length-1:c.push(_.x,_.y,_.z);break;default:m=e[S+1].x-e[S].x,p=e[S+1].y-e[S].y,f.x=p*1,f.y=-m,f.z=p*0,g.copy(f),f.x+=_.x,f.y+=_.y,f.z+=_.z,f.normalize(),c.push(f.x,f.y,f.z),_.copy(g)}for(let S=0;S<=t;S++){const T=n+S*u*s,x=Math.sin(T),P=Math.cos(T);for(let w=0;w<=e.length-1;w++){h.x=e[w].x*x,h.y=e[w].y,h.z=e[w].x*P,o.push(h.x,h.y,h.z),d.x=S/t,d.y=w/(e.length-1),a.push(d.x,d.y);const R=c[3*w+0]*x,I=c[3*w+1],y=c[3*w+0]*P;l.push(R,I,y)}}for(let S=0;S<t;S++)for(let T=0;T<e.length-1;T++){const x=T+S*e.length,P=x,w=x+e.length,R=x+e.length+1,I=x+1;r.push(P,w,I),r.push(R,I,w)}this.setIndex(r),this.setAttribute("position",new ht(o,3)),this.setAttribute("uv",new ht(a,2)),this.setAttribute("normal",new ht(l,3))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new rl(e.points,e.segments,e.phiStart,e.phiLength)}}class dn extends wt{constructor(e=1,t=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:s};const r=e/2,o=t/2,a=Math.floor(n),c=Math.floor(s),l=a+1,u=c+1,h=e/a,d=t/c,f=[],g=[],_=[],m=[];for(let p=0;p<u;p++){const S=p*d-o;for(let T=0;T<l;T++){const x=T*h-r;g.push(x,-S,0),_.push(0,0,1),m.push(T/a),m.push(1-p/c)}}for(let p=0;p<c;p++)for(let S=0;S<a;S++){const T=S+l*p,x=S+l*(p+1),P=S+1+l*(p+1),w=S+1+l*p;f.push(T,x,w),f.push(x,P,w)}this.setIndex(f),this.setAttribute("position",new ht(g,3)),this.setAttribute("normal",new ht(_,3)),this.setAttribute("uv",new ht(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new dn(e.width,e.height,e.widthSegments,e.heightSegments)}}class Bs extends wt{constructor(e=1,t=32,n=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const c=Math.min(o+a,Math.PI);let l=0;const u=[],h=new D,d=new D,f=[],g=[],_=[],m=[];for(let p=0;p<=n;p++){const S=[],T=p/n;let x=0;p===0&&o===0?x=.5/t:p===n&&c===Math.PI&&(x=-.5/t);for(let P=0;P<=t;P++){const w=P/t;h.x=-e*Math.cos(s+w*r)*Math.sin(o+T*a),h.y=e*Math.cos(o+T*a),h.z=e*Math.sin(s+w*r)*Math.sin(o+T*a),g.push(h.x,h.y,h.z),d.copy(h).normalize(),_.push(d.x,d.y,d.z),m.push(w+x,1-T),S.push(l++)}u.push(S)}for(let p=0;p<n;p++)for(let S=0;S<t;S++){const T=u[p][S+1],x=u[p][S],P=u[p+1][S],w=u[p+1][S+1];(p!==0||o>0)&&f.push(T,x,w),(p!==n-1||c<Math.PI)&&f.push(x,P,w)}this.setIndex(f),this.setAttribute("position",new ht(g,3)),this.setAttribute("normal",new ht(_,3)),this.setAttribute("uv",new ht(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Bs(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class kr extends wt{constructor(e=1,t=.4,n=12,s=48,r=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:s,arc:r},n=Math.floor(n),s=Math.floor(s);const o=[],a=[],c=[],l=[],u=new D,h=new D,d=new D;for(let f=0;f<=n;f++)for(let g=0;g<=s;g++){const _=g/s*r,m=f/n*Math.PI*2;h.x=(e+t*Math.cos(m))*Math.cos(_),h.y=(e+t*Math.cos(m))*Math.sin(_),h.z=t*Math.sin(m),a.push(h.x,h.y,h.z),u.x=e*Math.cos(_),u.y=e*Math.sin(_),d.subVectors(h,u).normalize(),c.push(d.x,d.y,d.z),l.push(g/s),l.push(f/n)}for(let f=1;f<=n;f++)for(let g=1;g<=s;g++){const _=(s+1)*f+g-1,m=(s+1)*(f-1)+g-1,p=(s+1)*(f-1)+g,S=(s+1)*f+g;o.push(_,m,S),o.push(m,p,S)}this.setIndex(o),this.setAttribute("position",new ht(a,3)),this.setAttribute("normal",new ht(c,3)),this.setAttribute("uv",new ht(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new kr(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}}class Zd extends Mt{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class Du extends vi{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Ke(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ke(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Za,this.normalScale=new oe(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new mn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Kd extends vi{constructor(e){super(),this.isMeshNormalMaterial=!0,this.type="MeshNormalMaterial",this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Za,this.normalScale=new oe(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.setValues(e)}copy(e){return super.copy(e),this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.flatShading=e.flatShading,this}}class Jd extends vi{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Ch,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class jd extends vi{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}class Vr extends Et{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Ke(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}}class $d extends Vr{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Et.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Ke(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const To=new nt,tc=new D,nc=new D;class Iu{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new oe(512,512),this.mapType=pn,this.map=null,this.mapPass=null,this.matrix=new nt,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new el,this._frameExtents=new oe(1,1),this._viewportCount=1,this._viewports=[new lt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;tc.setFromMatrixPosition(e.matrixWorld),t.position.copy(tc),nc.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(nc),t.updateMatrixWorld(),To.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(To,t.coordinateSystem,t.reversedDepth),t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(To)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}class Qd extends Iu{constructor(){super(new zt(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){const t=this.camera,n=Nr*2*e.angle*this.focus,s=this.mapSize.width/this.mapSize.height*this.aspect,r=e.distance||t.far;(n!==t.fov||s!==t.aspect||r!==t.far)&&(t.fov=n,t.aspect=s,t.far=r,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}}class ef extends Vr{constructor(e,t,n=0,s=Math.PI/3,r=0,o=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(Et.DEFAULT_UP),this.updateMatrix(),this.target=new Et,this.distance=n,this.angle=s,this.penumbra=r,this.decay=o,this.map=null,this.shadow=new Qd}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}const ic=new nt,Ss=new D,bo=new D;class tf extends Iu{constructor(){super(new zt(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new oe(4,2),this._viewportCount=6,this._viewports=[new lt(2,1,1,1),new lt(0,1,1,1),new lt(3,1,1,1),new lt(1,1,1,1),new lt(3,0,1,1),new lt(1,0,1,1)],this._cubeDirections=[new D(1,0,0),new D(-1,0,0),new D(0,0,1),new D(0,0,-1),new D(0,1,0),new D(0,-1,0)],this._cubeUps=[new D(0,1,0),new D(0,1,0),new D(0,1,0),new D(0,1,0),new D(0,0,1),new D(0,0,-1)]}updateMatrices(e,t=0){const n=this.camera,s=this.matrix,r=e.distance||n.far;r!==n.far&&(n.far=r,n.updateProjectionMatrix()),Ss.setFromMatrixPosition(e.matrixWorld),n.position.copy(Ss),bo.copy(n.position),bo.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(bo),n.updateMatrixWorld(),s.makeTranslation(-Ss.x,-Ss.y,-Ss.z),ic.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(ic,n.coordinateSystem,n.reversedDepth)}}class nf extends Vr{constructor(e,t,n=0,s=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new tf}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}}class Lu extends vu{constructor(e=-1,t=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=n-e,o=n+e,a=s+t,c=s-t;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,o=r+l*this.view.width,a-=u*this.view.offsetY,c=a-u*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class sf extends Vr{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}class rf extends zt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class Uu{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=performance.now();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}const sc=new nt;class of{constructor(e,t,n=0,s=1/0){this.ray=new Ja(e,t),this.near=n,this.far=s,this.camera=null,this.layers=new ja,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error("THREE.Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return sc.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(sc),this}intersectObject(e,t=!0,n=[]){return Ia(e,this,n,t),n.sort(rc),n}intersectObjects(e,t=!0,n=[]){for(let s=0,r=e.length;s<r;s++)Ia(e[s],this,n,t);return n.sort(rc),n}}function rc(i,e){return i.distance-e.distance}function Ia(i,e,t,n){let s=!0;if(i.layers.test(e.layers)&&i.raycast(e,t)===!1&&(s=!1),s===!0&&n===!0){const r=i.children;for(let o=0,a=r.length;o<a;o++)Ia(r[o],e,t,!0)}}function oc(i,e,t,n){const s=af(n);switch(t){case lu:return i*e;case Wa:return i*e/s.components*s.byteLength;case Xa:return i*e/s.components*s.byteLength;case uu:return i*e*2/s.components*s.byteLength;case qa:return i*e*2/s.components*s.byteLength;case cu:return i*e*3/s.components*s.byteLength;case tn:return i*e*4/s.components*s.byteLength;case Ya:return i*e*4/s.components*s.byteLength;case Cr:case Rr:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Pr:case Dr:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case ta:case ia:return Math.max(i,16)*Math.max(e,8)/4;case ea:case na:return Math.max(i,8)*Math.max(e,8)/2;case sa:case ra:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case oa:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case aa:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case la:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case ca:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case ua:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case ha:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case da:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case fa:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case pa:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case ma:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case ga:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case _a:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case va:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case xa:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case Ma:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case Sa:case ya:case Ea:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Ta:case ba:return Math.ceil(i/4)*Math.ceil(e/4)*8;case wa:case Aa:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function af(i){switch(i){case pn:case su:return{byteLength:1,components:1};case Ds:case ru:case fn:return{byteLength:2,components:1};case Ha:case Ga:return{byteLength:2,components:4};case mi:case Va:case Mn:return{byteLength:4,components:1};case ou:case au:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:za}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=za);function Nu(){let i=null,e=!1,t=null,n=null;function s(r,o){t(r,o),n=i.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(s),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function lf(i){const e=new WeakMap;function t(a,c){const l=a.array,u=a.usage,h=l.byteLength,d=i.createBuffer();i.bindBuffer(c,d),i.bufferData(c,l,u),a.onUploadCallback();let f;if(l instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)f=i.HALF_FLOAT;else if(l instanceof Uint16Array)a.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(l instanceof Int16Array)f=i.SHORT;else if(l instanceof Uint32Array)f=i.UNSIGNED_INT;else if(l instanceof Int32Array)f=i.INT;else if(l instanceof Int8Array)f=i.BYTE;else if(l instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:d,type:f,bytesPerElement:l.BYTES_PER_ELEMENT,version:a.version,size:h}}function n(a,c,l){const u=c.array,h=c.updateRanges;if(i.bindBuffer(l,a),h.length===0)i.bufferSubData(l,0,u);else{h.sort((f,g)=>f.start-g.start);let d=0;for(let f=1;f<h.length;f++){const g=h[d],_=h[f];_.start<=g.start+g.count+1?g.count=Math.max(g.count,_.start+_.count-g.start):(++d,h[d]=_)}h.length=d+1;for(let f=0,g=h.length;f<g;f++){const _=h[f];i.bufferSubData(l,_.start*u.BYTES_PER_ELEMENT,u,_.start,_.count)}c.clearUpdateRanges()}c.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const c=e.get(a);c&&(i.deleteBuffer(c.buffer),e.delete(a))}function o(a,c){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const u=e.get(a);(!u||u.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const l=e.get(a);if(l===void 0)e.set(a,t(a,c));else if(l.version<a.version){if(l.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,a,c),l.version=a.version}}return{get:s,remove:r,update:o}}var cf=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,uf=`#ifdef USE_ALPHAHASH
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
#endif`,hf=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,df=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,ff=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,pf=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,mf=`#ifdef USE_AOMAP
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
#endif`,gf=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,_f=`#ifdef USE_BATCHING
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
#endif`,vf=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,xf=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Mf=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Sf=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,yf=`#ifdef USE_IRIDESCENCE
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
#endif`,Ef=`#ifdef USE_BUMPMAP
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
#endif`,Tf=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,bf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,wf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Af=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Cf=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Rf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Pf=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Df=`#if defined( USE_COLOR_ALPHA )
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
#endif`,If=`#define PI 3.141592653589793
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
} // validated`,Lf=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,Uf=`vec3 transformedNormal = objectNormal;
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
#endif`,Nf=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Ff=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Of=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Bf=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,zf="gl_FragColor = linearToOutputTexel( gl_FragColor );",kf=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Vf=`#ifdef USE_ENVMAP
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
#endif`,Hf=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Gf=`#ifdef USE_ENVMAP
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
#endif`,Wf=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Xf=`#ifdef USE_ENVMAP
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
#endif`,qf=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Yf=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Zf=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Kf=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Jf=`#ifdef USE_GRADIENTMAP
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
}`,jf=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,$f=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Qf=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,ep=`uniform bool receiveShadow;
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
#endif`,tp=`#ifdef USE_ENVMAP
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
#endif`,np=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,ip=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,sp=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,rp=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,op=`PhysicalMaterial material;
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
#endif`,ap=`struct PhysicalMaterial {
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
}`,lp=`
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
#endif`,cp=`#if defined( RE_IndirectDiffuse )
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
#endif`,up=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,hp=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,dp=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,fp=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,pp=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,mp=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,gp=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,_p=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,vp=`#if defined( USE_POINTS_UV )
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
#endif`,xp=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Mp=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Sp=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,yp=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Ep=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Tp=`#ifdef USE_MORPHTARGETS
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
#endif`,bp=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,wp=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,Ap=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,Cp=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Rp=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Pp=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Dp=`#ifdef USE_NORMALMAP
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
#endif`,Ip=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Lp=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Up=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Np=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Fp=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Op=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,Bp=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,zp=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,kp=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Vp=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Hp=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Gp=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Wp=`#if NUM_SPOT_LIGHT_COORDS > 0
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
		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			return step( depth, compare );
		#else
			return step( compare, depth );
		#endif
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			float hard_shadow = step( distribution.x, compare );
		#else
			float hard_shadow = step( compare, distribution.x );
		#endif
		if ( hard_shadow != 1.0 ) {
			float distance = compare - distribution.x;
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
#endif`,Xp=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,qp=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,Yp=`float getShadowMask() {
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
}`,Zp=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Kp=`#ifdef USE_SKINNING
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
#endif`,Jp=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,jp=`#ifdef USE_SKINNING
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
#endif`,$p=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Qp=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,e0=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,t0=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,n0=`#ifdef USE_TRANSMISSION
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
#endif`,i0=`#ifdef USE_TRANSMISSION
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
#endif`,s0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,r0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,o0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,a0=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const l0=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,c0=`uniform sampler2D t2D;
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
}`,u0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,h0=`#ifdef ENVMAP_TYPE_CUBE
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
}`,d0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,f0=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,p0=`#include <common>
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
}`,m0=`#if DEPTH_PACKING == 3200
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
}`,g0=`#define DISTANCE
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
}`,_0=`#define DISTANCE
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
}`,v0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,x0=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,M0=`uniform float scale;
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
}`,S0=`uniform vec3 diffuse;
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
}`,y0=`#include <common>
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
}`,E0=`uniform vec3 diffuse;
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
}`,T0=`#define LAMBERT
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
}`,b0=`#define LAMBERT
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
}`,w0=`#define MATCAP
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
}`,A0=`#define MATCAP
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
}`,C0=`#define NORMAL
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
}`,R0=`#define NORMAL
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
}`,P0=`#define PHONG
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
}`,D0=`#define PHONG
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
}`,I0=`#define STANDARD
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
}`,L0=`#define STANDARD
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
}`,U0=`#define TOON
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
}`,N0=`#define TOON
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
}`,F0=`uniform float size;
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
}`,O0=`uniform vec3 diffuse;
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
}`,B0=`#include <common>
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
}`,z0=`uniform vec3 color;
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
}`,k0=`uniform float rotation;
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
}`,V0=`uniform vec3 diffuse;
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
}`,$e={alphahash_fragment:cf,alphahash_pars_fragment:uf,alphamap_fragment:hf,alphamap_pars_fragment:df,alphatest_fragment:ff,alphatest_pars_fragment:pf,aomap_fragment:mf,aomap_pars_fragment:gf,batching_pars_vertex:_f,batching_vertex:vf,begin_vertex:xf,beginnormal_vertex:Mf,bsdfs:Sf,iridescence_fragment:yf,bumpmap_pars_fragment:Ef,clipping_planes_fragment:Tf,clipping_planes_pars_fragment:bf,clipping_planes_pars_vertex:wf,clipping_planes_vertex:Af,color_fragment:Cf,color_pars_fragment:Rf,color_pars_vertex:Pf,color_vertex:Df,common:If,cube_uv_reflection_fragment:Lf,defaultnormal_vertex:Uf,displacementmap_pars_vertex:Nf,displacementmap_vertex:Ff,emissivemap_fragment:Of,emissivemap_pars_fragment:Bf,colorspace_fragment:zf,colorspace_pars_fragment:kf,envmap_fragment:Vf,envmap_common_pars_fragment:Hf,envmap_pars_fragment:Gf,envmap_pars_vertex:Wf,envmap_physical_pars_fragment:tp,envmap_vertex:Xf,fog_vertex:qf,fog_pars_vertex:Yf,fog_fragment:Zf,fog_pars_fragment:Kf,gradientmap_pars_fragment:Jf,lightmap_pars_fragment:jf,lights_lambert_fragment:$f,lights_lambert_pars_fragment:Qf,lights_pars_begin:ep,lights_toon_fragment:np,lights_toon_pars_fragment:ip,lights_phong_fragment:sp,lights_phong_pars_fragment:rp,lights_physical_fragment:op,lights_physical_pars_fragment:ap,lights_fragment_begin:lp,lights_fragment_maps:cp,lights_fragment_end:up,logdepthbuf_fragment:hp,logdepthbuf_pars_fragment:dp,logdepthbuf_pars_vertex:fp,logdepthbuf_vertex:pp,map_fragment:mp,map_pars_fragment:gp,map_particle_fragment:_p,map_particle_pars_fragment:vp,metalnessmap_fragment:xp,metalnessmap_pars_fragment:Mp,morphinstance_vertex:Sp,morphcolor_vertex:yp,morphnormal_vertex:Ep,morphtarget_pars_vertex:Tp,morphtarget_vertex:bp,normal_fragment_begin:wp,normal_fragment_maps:Ap,normal_pars_fragment:Cp,normal_pars_vertex:Rp,normal_vertex:Pp,normalmap_pars_fragment:Dp,clearcoat_normal_fragment_begin:Ip,clearcoat_normal_fragment_maps:Lp,clearcoat_pars_fragment:Up,iridescence_pars_fragment:Np,opaque_fragment:Fp,packing:Op,premultiplied_alpha_fragment:Bp,project_vertex:zp,dithering_fragment:kp,dithering_pars_fragment:Vp,roughnessmap_fragment:Hp,roughnessmap_pars_fragment:Gp,shadowmap_pars_fragment:Wp,shadowmap_pars_vertex:Xp,shadowmap_vertex:qp,shadowmask_pars_fragment:Yp,skinbase_vertex:Zp,skinning_pars_vertex:Kp,skinning_vertex:Jp,skinnormal_vertex:jp,specularmap_fragment:$p,specularmap_pars_fragment:Qp,tonemapping_fragment:e0,tonemapping_pars_fragment:t0,transmission_fragment:n0,transmission_pars_fragment:i0,uv_pars_fragment:s0,uv_pars_vertex:r0,uv_vertex:o0,worldpos_vertex:a0,background_vert:l0,background_frag:c0,backgroundCube_vert:u0,backgroundCube_frag:h0,cube_vert:d0,cube_frag:f0,depth_vert:p0,depth_frag:m0,distanceRGBA_vert:g0,distanceRGBA_frag:_0,equirect_vert:v0,equirect_frag:x0,linedashed_vert:M0,linedashed_frag:S0,meshbasic_vert:y0,meshbasic_frag:E0,meshlambert_vert:T0,meshlambert_frag:b0,meshmatcap_vert:w0,meshmatcap_frag:A0,meshnormal_vert:C0,meshnormal_frag:R0,meshphong_vert:P0,meshphong_frag:D0,meshphysical_vert:I0,meshphysical_frag:L0,meshtoon_vert:U0,meshtoon_frag:N0,points_vert:F0,points_frag:O0,shadow_vert:B0,shadow_frag:z0,sprite_vert:k0,sprite_frag:V0},Me={common:{diffuse:{value:new Ke(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new je},alphaMap:{value:null},alphaMapTransform:{value:new je},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new je}},envmap:{envMap:{value:null},envMapRotation:{value:new je},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new je}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new je}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new je},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new je},normalScale:{value:new oe(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new je},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new je}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new je}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new je}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ke(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ke(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new je},alphaTest:{value:0},uvTransform:{value:new je}},sprite:{diffuse:{value:new Ke(16777215)},opacity:{value:1},center:{value:new oe(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new je},alphaMap:{value:null},alphaMapTransform:{value:new je},alphaTest:{value:0}}},vn={basic:{uniforms:Bt([Me.common,Me.specularmap,Me.envmap,Me.aomap,Me.lightmap,Me.fog]),vertexShader:$e.meshbasic_vert,fragmentShader:$e.meshbasic_frag},lambert:{uniforms:Bt([Me.common,Me.specularmap,Me.envmap,Me.aomap,Me.lightmap,Me.emissivemap,Me.bumpmap,Me.normalmap,Me.displacementmap,Me.fog,Me.lights,{emissive:{value:new Ke(0)}}]),vertexShader:$e.meshlambert_vert,fragmentShader:$e.meshlambert_frag},phong:{uniforms:Bt([Me.common,Me.specularmap,Me.envmap,Me.aomap,Me.lightmap,Me.emissivemap,Me.bumpmap,Me.normalmap,Me.displacementmap,Me.fog,Me.lights,{emissive:{value:new Ke(0)},specular:{value:new Ke(1118481)},shininess:{value:30}}]),vertexShader:$e.meshphong_vert,fragmentShader:$e.meshphong_frag},standard:{uniforms:Bt([Me.common,Me.envmap,Me.aomap,Me.lightmap,Me.emissivemap,Me.bumpmap,Me.normalmap,Me.displacementmap,Me.roughnessmap,Me.metalnessmap,Me.fog,Me.lights,{emissive:{value:new Ke(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:$e.meshphysical_vert,fragmentShader:$e.meshphysical_frag},toon:{uniforms:Bt([Me.common,Me.aomap,Me.lightmap,Me.emissivemap,Me.bumpmap,Me.normalmap,Me.displacementmap,Me.gradientmap,Me.fog,Me.lights,{emissive:{value:new Ke(0)}}]),vertexShader:$e.meshtoon_vert,fragmentShader:$e.meshtoon_frag},matcap:{uniforms:Bt([Me.common,Me.bumpmap,Me.normalmap,Me.displacementmap,Me.fog,{matcap:{value:null}}]),vertexShader:$e.meshmatcap_vert,fragmentShader:$e.meshmatcap_frag},points:{uniforms:Bt([Me.points,Me.fog]),vertexShader:$e.points_vert,fragmentShader:$e.points_frag},dashed:{uniforms:Bt([Me.common,Me.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:$e.linedashed_vert,fragmentShader:$e.linedashed_frag},depth:{uniforms:Bt([Me.common,Me.displacementmap]),vertexShader:$e.depth_vert,fragmentShader:$e.depth_frag},normal:{uniforms:Bt([Me.common,Me.bumpmap,Me.normalmap,Me.displacementmap,{opacity:{value:1}}]),vertexShader:$e.meshnormal_vert,fragmentShader:$e.meshnormal_frag},sprite:{uniforms:Bt([Me.sprite,Me.fog]),vertexShader:$e.sprite_vert,fragmentShader:$e.sprite_frag},background:{uniforms:{uvTransform:{value:new je},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:$e.background_vert,fragmentShader:$e.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new je}},vertexShader:$e.backgroundCube_vert,fragmentShader:$e.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:$e.cube_vert,fragmentShader:$e.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:$e.equirect_vert,fragmentShader:$e.equirect_frag},distanceRGBA:{uniforms:Bt([Me.common,Me.displacementmap,{referencePosition:{value:new D},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:$e.distanceRGBA_vert,fragmentShader:$e.distanceRGBA_frag},shadow:{uniforms:Bt([Me.lights,Me.fog,{color:{value:new Ke(0)},opacity:{value:1}}]),vertexShader:$e.shadow_vert,fragmentShader:$e.shadow_frag}};vn.physical={uniforms:Bt([vn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new je},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new je},clearcoatNormalScale:{value:new oe(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new je},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new je},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new je},sheen:{value:0},sheenColor:{value:new Ke(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new je},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new je},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new je},transmissionSamplerSize:{value:new oe},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new je},attenuationDistance:{value:0},attenuationColor:{value:new Ke(0)},specularColor:{value:new Ke(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new je},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new je},anisotropyVector:{value:new oe},anisotropyMap:{value:null},anisotropyMapTransform:{value:new je}}]),vertexShader:$e.meshphysical_vert,fragmentShader:$e.meshphysical_frag};const vr={r:0,b:0,g:0},oi=new mn,H0=new nt;function G0(i,e,t,n,s,r,o){const a=new Ke(0);let c=r===!0?0:1,l,u,h=null,d=0,f=null;function g(T){let x=T.isScene===!0?T.background:null;return x&&x.isTexture&&(x=(T.backgroundBlurriness>0?t:e).get(x)),x}function _(T){let x=!1;const P=g(T);P===null?p(a,c):P&&P.isColor&&(p(P,1),x=!0);const w=i.xr.getEnvironmentBlendMode();w==="additive"?n.buffers.color.setClear(0,0,0,1,o):w==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,o),(i.autoClear||x)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function m(T,x){const P=g(x);P&&(P.isCubeTexture||P.mapping===Br)?(u===void 0&&(u=new st(new jn(1,1,1),new Mt({name:"BackgroundCubeMaterial",uniforms:Ji(vn.backgroundCube.uniforms),vertexShader:vn.backgroundCube.vertexShader,fragmentShader:vn.backgroundCube.fragmentShader,side:Xt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(w,R,I){this.matrixWorld.copyPosition(I.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(u)),oi.copy(x.backgroundRotation),oi.x*=-1,oi.y*=-1,oi.z*=-1,P.isCubeTexture&&P.isRenderTargetTexture===!1&&(oi.y*=-1,oi.z*=-1),u.material.uniforms.envMap.value=P,u.material.uniforms.flipEnvMap.value=P.isCubeTexture&&P.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=x.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=x.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(H0.makeRotationFromEuler(oi)),u.material.toneMapped=tt.getTransfer(P.colorSpace)!==ot,(h!==P||d!==P.version||f!==i.toneMapping)&&(u.material.needsUpdate=!0,h=P,d=P.version,f=i.toneMapping),u.layers.enableAll(),T.unshift(u,u.geometry,u.material,0,0,null)):P&&P.isTexture&&(l===void 0&&(l=new st(new dn(2,2),new Mt({name:"BackgroundMaterial",uniforms:Ji(vn.background.uniforms),vertexShader:vn.background.vertexShader,fragmentShader:vn.background.fragmentShader,side:Kn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(l)),l.material.uniforms.t2D.value=P,l.material.uniforms.backgroundIntensity.value=x.backgroundIntensity,l.material.toneMapped=tt.getTransfer(P.colorSpace)!==ot,P.matrixAutoUpdate===!0&&P.updateMatrix(),l.material.uniforms.uvTransform.value.copy(P.matrix),(h!==P||d!==P.version||f!==i.toneMapping)&&(l.material.needsUpdate=!0,h=P,d=P.version,f=i.toneMapping),l.layers.enableAll(),T.unshift(l,l.geometry,l.material,0,0,null))}function p(T,x){T.getRGB(vr,_u(i)),n.buffers.color.setClear(vr.r,vr.g,vr.b,x,o)}function S(){u!==void 0&&(u.geometry.dispose(),u.material.dispose(),u=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(T,x=1){a.set(T),c=x,p(a,c)},getClearAlpha:function(){return c},setClearAlpha:function(T){c=T,p(a,c)},render:_,addToRenderList:m,dispose:S}}function W0(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=d(null);let r=s,o=!1;function a(M,C,F,H,X){let L=!1;const U=h(H,F,C);r!==U&&(r=U,l(r.object)),L=f(M,H,F,X),L&&g(M,H,F,X),X!==null&&e.update(X,i.ELEMENT_ARRAY_BUFFER),(L||o)&&(o=!1,x(M,C,F,H),X!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(X).buffer))}function c(){return i.createVertexArray()}function l(M){return i.bindVertexArray(M)}function u(M){return i.deleteVertexArray(M)}function h(M,C,F){const H=F.wireframe===!0;let X=n[M.id];X===void 0&&(X={},n[M.id]=X);let L=X[C.id];L===void 0&&(L={},X[C.id]=L);let U=L[H];return U===void 0&&(U=d(c()),L[H]=U),U}function d(M){const C=[],F=[],H=[];for(let X=0;X<t;X++)C[X]=0,F[X]=0,H[X]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:C,enabledAttributes:F,attributeDivisors:H,object:M,attributes:{},index:null}}function f(M,C,F,H){const X=r.attributes,L=C.attributes;let U=0;const V=F.getAttributes();for(const G in V)if(V[G].location>=0){const se=X[G];let de=L[G];if(de===void 0&&(G==="instanceMatrix"&&M.instanceMatrix&&(de=M.instanceMatrix),G==="instanceColor"&&M.instanceColor&&(de=M.instanceColor)),se===void 0||se.attribute!==de||de&&se.data!==de.data)return!0;U++}return r.attributesNum!==U||r.index!==H}function g(M,C,F,H){const X={},L=C.attributes;let U=0;const V=F.getAttributes();for(const G in V)if(V[G].location>=0){let se=L[G];se===void 0&&(G==="instanceMatrix"&&M.instanceMatrix&&(se=M.instanceMatrix),G==="instanceColor"&&M.instanceColor&&(se=M.instanceColor));const de={};de.attribute=se,se&&se.data&&(de.data=se.data),X[G]=de,U++}r.attributes=X,r.attributesNum=U,r.index=H}function _(){const M=r.newAttributes;for(let C=0,F=M.length;C<F;C++)M[C]=0}function m(M){p(M,0)}function p(M,C){const F=r.newAttributes,H=r.enabledAttributes,X=r.attributeDivisors;F[M]=1,H[M]===0&&(i.enableVertexAttribArray(M),H[M]=1),X[M]!==C&&(i.vertexAttribDivisor(M,C),X[M]=C)}function S(){const M=r.newAttributes,C=r.enabledAttributes;for(let F=0,H=C.length;F<H;F++)C[F]!==M[F]&&(i.disableVertexAttribArray(F),C[F]=0)}function T(M,C,F,H,X,L,U){U===!0?i.vertexAttribIPointer(M,C,F,X,L):i.vertexAttribPointer(M,C,F,H,X,L)}function x(M,C,F,H){_();const X=H.attributes,L=F.getAttributes(),U=C.defaultAttributeValues;for(const V in L){const G=L[V];if(G.location>=0){let J=X[V];if(J===void 0&&(V==="instanceMatrix"&&M.instanceMatrix&&(J=M.instanceMatrix),V==="instanceColor"&&M.instanceColor&&(J=M.instanceColor)),J!==void 0){const se=J.normalized,de=J.itemSize,Te=e.get(J);if(Te===void 0)continue;const Be=Te.buffer,ze=Te.type,Ve=Te.bytesPerElement,Y=ze===i.INT||ze===i.UNSIGNED_INT||J.gpuType===Va;if(J.isInterleavedBufferAttribute){const ee=J.data,_e=ee.stride,Se=J.offset;if(ee.isInstancedInterleavedBuffer){for(let ve=0;ve<G.locationSize;ve++)p(G.location+ve,ee.meshPerAttribute);M.isInstancedMesh!==!0&&H._maxInstanceCount===void 0&&(H._maxInstanceCount=ee.meshPerAttribute*ee.count)}else for(let ve=0;ve<G.locationSize;ve++)m(G.location+ve);i.bindBuffer(i.ARRAY_BUFFER,Be);for(let ve=0;ve<G.locationSize;ve++)T(G.location+ve,de/G.locationSize,ze,se,_e*Ve,(Se+de/G.locationSize*ve)*Ve,Y)}else{if(J.isInstancedBufferAttribute){for(let ee=0;ee<G.locationSize;ee++)p(G.location+ee,J.meshPerAttribute);M.isInstancedMesh!==!0&&H._maxInstanceCount===void 0&&(H._maxInstanceCount=J.meshPerAttribute*J.count)}else for(let ee=0;ee<G.locationSize;ee++)m(G.location+ee);i.bindBuffer(i.ARRAY_BUFFER,Be);for(let ee=0;ee<G.locationSize;ee++)T(G.location+ee,de/G.locationSize,ze,se,de*Ve,de/G.locationSize*ee*Ve,Y)}}else if(U!==void 0){const se=U[V];if(se!==void 0)switch(se.length){case 2:i.vertexAttrib2fv(G.location,se);break;case 3:i.vertexAttrib3fv(G.location,se);break;case 4:i.vertexAttrib4fv(G.location,se);break;default:i.vertexAttrib1fv(G.location,se)}}}}S()}function P(){I();for(const M in n){const C=n[M];for(const F in C){const H=C[F];for(const X in H)u(H[X].object),delete H[X];delete C[F]}delete n[M]}}function w(M){if(n[M.id]===void 0)return;const C=n[M.id];for(const F in C){const H=C[F];for(const X in H)u(H[X].object),delete H[X];delete C[F]}delete n[M.id]}function R(M){for(const C in n){const F=n[C];if(F[M.id]===void 0)continue;const H=F[M.id];for(const X in H)u(H[X].object),delete H[X];delete F[M.id]}}function I(){y(),o=!0,r!==s&&(r=s,l(r.object))}function y(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:I,resetDefaultState:y,dispose:P,releaseStatesOfGeometry:w,releaseStatesOfProgram:R,initAttributes:_,enableAttribute:m,disableUnusedAttributes:S}}function X0(i,e,t){let n;function s(l){n=l}function r(l,u){i.drawArrays(n,l,u),t.update(u,n,1)}function o(l,u,h){h!==0&&(i.drawArraysInstanced(n,l,u,h),t.update(u,n,h))}function a(l,u,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,u,0,h);let f=0;for(let g=0;g<h;g++)f+=u[g];t.update(f,n,1)}function c(l,u,h,d){if(h===0)return;const f=e.get("WEBGL_multi_draw");if(f===null)for(let g=0;g<l.length;g++)o(l[g],u[g],d[g]);else{f.multiDrawArraysInstancedWEBGL(n,l,0,u,0,d,0,h);let g=0;for(let _=0;_<h;_++)g+=u[_]*d[_];t.update(g,n,1)}}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=c}function q0(i,e,t,n){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){const R=e.get("EXT_texture_filter_anisotropic");s=i.getParameter(R.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(R){return!(R!==tn&&n.convert(R)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(R){const I=R===fn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(R!==pn&&n.convert(R)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&R!==Mn&&!I)}function c(R){if(R==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";R="mediump"}return R==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp";const u=c(l);u!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",u,"instead."),l=u);const h=t.logarithmicDepthBuffer===!0,d=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),S=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),T=i.getParameter(i.MAX_VARYING_VECTORS),x=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),P=g>0,w=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:a,precision:l,logarithmicDepthBuffer:h,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:g,maxTextureSize:_,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:S,maxVaryings:T,maxFragmentUniforms:x,vertexTextures:P,maxSamples:w}}function Y0(i){const e=this;let t=null,n=0,s=!1,r=!1;const o=new ci,a=new je,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(h,d){const f=h.length!==0||d||n!==0||s;return s=d,n=h.length,f},this.beginShadows=function(){r=!0,u(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(h,d){t=u(h,d,0)},this.setState=function(h,d,f){const g=h.clippingPlanes,_=h.clipIntersection,m=h.clipShadows,p=i.get(h);if(!s||g===null||g.length===0||r&&!m)r?u(null):l();else{const S=r?0:n,T=S*4;let x=p.clippingState||null;c.value=x,x=u(g,d,T,f);for(let P=0;P!==T;++P)x[P]=t[P];p.clippingState=x,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=S}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function u(h,d,f,g){const _=h!==null?h.length:0;let m=null;if(_!==0){if(m=c.value,g!==!0||m===null){const p=f+_*4,S=d.matrixWorldInverse;a.getNormalMatrix(S),(m===null||m.length<p)&&(m=new Float32Array(p));for(let T=0,x=f;T!==_;++T,x+=4)o.copy(h[T]).applyMatrix4(S,a),o.normal.toArray(m,x),m[x+3]=o.constant}c.value=m,c.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,m}}function Z0(i){let e=new WeakMap;function t(o,a){return a===jo?o.mapping=Xi:a===$o&&(o.mapping=qi),o}function n(o){if(o&&o.isTexture){const a=o.mapping;if(a===jo||a===$o)if(e.has(o)){const c=e.get(o).texture;return t(c,o.mapping)}else{const c=o.image;if(c&&c.height>0){const l=new ld(c.height);return l.fromEquirectangularTexture(i,o),e.set(o,l),o.addEventListener("dispose",s),t(l.texture,o.mapping)}else return null}}return o}function s(o){const a=o.target;a.removeEventListener("dispose",s);const c=e.get(a);c!==void 0&&(e.delete(a),c.dispose())}function r(){e=new WeakMap}return{get:n,dispose:r}}const zi=4,ac=[.125,.215,.35,.446,.526,.582],hi=20,wo=new Lu,lc=new Ke;let Ao=null,Co=0,Ro=0,Po=!1;const ui=(1+Math.sqrt(5))/2,Fi=1/ui,cc=[new D(-ui,Fi,0),new D(ui,Fi,0),new D(-Fi,0,ui),new D(Fi,0,ui),new D(0,ui,-Fi),new D(0,ui,Fi),new D(-1,1,-1),new D(1,1,-1),new D(-1,1,1),new D(1,1,1)],K0=new D;class La{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,s=100,r={}){const{size:o=256,position:a=K0}=r;Ao=this._renderer.getRenderTarget(),Co=this._renderer.getActiveCubeFace(),Ro=this._renderer.getActiveMipmapLevel(),Po=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(e,n,s,c,a),t>0&&this._blur(c,0,0,t),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=dc(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=hc(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(Ao,Co,Ro),this._renderer.xr.enabled=Po,e.scissorTest=!1,xr(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Xi||e.mapping===qi?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Ao=this._renderer.getRenderTarget(),Co=this._renderer.getActiveCubeFace(),Ro=this._renderer.getActiveMipmapLevel(),Po=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:hn,minFilter:hn,generateMipmaps:!1,type:fn,format:tn,colorSpace:Ki,depthBuffer:!1},s=uc(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=uc(e,t,n);const{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=J0(r)),this._blurMaterial=j0(r,e,t)}return s}_compileMaterial(e){const t=new st(this._lodPlanes[0],e);this._renderer.compile(t,wo)}_sceneToCubeUV(e,t,n,s,r){const c=new zt(90,1,t,n),l=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],h=this._renderer,d=h.autoClear,f=h.toneMapping;h.getClearColor(lc),h.toneMapping=Yn,h.autoClear=!1,h.state.buffers.depth.getReversed()&&(h.setRenderTarget(s),h.clearDepth(),h.setRenderTarget(null));const _=new Nt({name:"PMREM.Background",side:Xt,depthWrite:!1,depthTest:!1}),m=new st(new jn,_);let p=!1;const S=e.background;S?S.isColor&&(_.color.copy(S),e.background=null,p=!0):(_.color.copy(lc),p=!0);for(let T=0;T<6;T++){const x=T%3;x===0?(c.up.set(0,l[T],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x+u[T],r.y,r.z)):x===1?(c.up.set(0,0,l[T]),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y+u[T],r.z)):(c.up.set(0,l[T],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y,r.z+u[T]));const P=this._cubeSize;xr(s,x*P,T>2?P:0,P,P),h.setRenderTarget(s),p&&h.render(m,c),h.render(e,c)}m.geometry.dispose(),m.material.dispose(),h.toneMapping=f,h.autoClear=d,e.background=S}_textureToCubeUV(e,t){const n=this._renderer,s=e.mapping===Xi||e.mapping===qi;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=dc()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=hc());const r=s?this._cubemapMaterial:this._equirectMaterial,o=new st(this._lodPlanes[0],r),a=r.uniforms;a.envMap.value=e;const c=this._cubeSize;xr(t,0,0,3*c,2*c),n.setRenderTarget(t),n.render(o,wo)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const s=this._lodPlanes.length;for(let r=1;r<s;r++){const o=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),a=cc[(s-r-1)%cc.length];this._blur(e,r-1,r,o,a)}t.autoClear=n}_blur(e,t,n,s,r){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,n,s,"latitudinal",r),this._halfBlur(o,e,n,n,s,"longitudinal",r)}_halfBlur(e,t,n,s,r,o,a){const c=this._renderer,l=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const u=3,h=new st(this._lodPlanes[s],l),d=l.uniforms,f=this._sizeLods[n]-1,g=isFinite(r)?Math.PI/(2*f):2*Math.PI/(2*hi-1),_=r/g,m=isFinite(r)?1+Math.floor(u*_):hi;m>hi&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${hi}`);const p=[];let S=0;for(let R=0;R<hi;++R){const I=R/_,y=Math.exp(-I*I/2);p.push(y),R===0?S+=y:R<m&&(S+=2*y)}for(let R=0;R<p.length;R++)p[R]=p[R]/S;d.envMap.value=e.texture,d.samples.value=m,d.weights.value=p,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);const{_lodMax:T}=this;d.dTheta.value=g,d.mipInt.value=T-n;const x=this._sizeLods[s],P=3*x*(s>T-zi?s-T+zi:0),w=4*(this._cubeSize-x);xr(t,P,w,3*x,2*x),c.setRenderTarget(t),c.render(h,wo)}}function J0(i){const e=[],t=[],n=[];let s=i;const r=i-zi+1+ac.length;for(let o=0;o<r;o++){const a=Math.pow(2,s);t.push(a);let c=1/a;o>i-zi?c=ac[o-i+zi-1]:o===0&&(c=0),n.push(c);const l=1/(a-2),u=-l,h=1+l,d=[u,u,h,u,h,h,u,u,h,h,u,h],f=6,g=6,_=3,m=2,p=1,S=new Float32Array(_*g*f),T=new Float32Array(m*g*f),x=new Float32Array(p*g*f);for(let w=0;w<f;w++){const R=w%3*2/3-1,I=w>2?0:-1,y=[R,I,0,R+2/3,I,0,R+2/3,I+1,0,R,I,0,R+2/3,I+1,0,R,I+1,0];S.set(y,_*g*w),T.set(d,m*g*w);const M=[w,w,w,w,w,w];x.set(M,p*g*w)}const P=new wt;P.setAttribute("position",new Vt(S,_)),P.setAttribute("uv",new Vt(T,m)),P.setAttribute("faceIndex",new Vt(x,p)),e.push(P),s>zi&&s--}return{lodPlanes:e,sizeLods:t,sigmas:n}}function uc(i,e,t){const n=new Jt(i,e,t);return n.texture.mapping=Br,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function xr(i,e,t,n,s){i.viewport.set(e,t,n,s),i.scissor.set(e,t,n,s)}function j0(i,e,t){const n=new Float32Array(hi),s=new D(0,1,0);return new Mt({name:"SphericalGaussianBlur",defines:{n:hi,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:ol(),fragmentShader:`

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
		`,blending:Dt,depthTest:!1,depthWrite:!1})}function hc(){return new Mt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:ol(),fragmentShader:`

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
		`,blending:Dt,depthTest:!1,depthWrite:!1})}function dc(){return new Mt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:ol(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Dt,depthTest:!1,depthWrite:!1})}function ol(){return`

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
	`}function $0(i){let e=new WeakMap,t=null;function n(a){if(a&&a.isTexture){const c=a.mapping,l=c===jo||c===$o,u=c===Xi||c===qi;if(l||u){let h=e.get(a);const d=h!==void 0?h.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==d)return t===null&&(t=new La(i)),h=l?t.fromEquirectangular(a,h):t.fromCubemap(a,h),h.texture.pmremVersion=a.pmremVersion,e.set(a,h),h.texture;if(h!==void 0)return h.texture;{const f=a.image;return l&&f&&f.height>0||u&&f&&s(f)?(t===null&&(t=new La(i)),h=l?t.fromEquirectangular(a):t.fromCubemap(a),h.texture.pmremVersion=a.pmremVersion,e.set(a,h),a.addEventListener("dispose",r),h.texture):null}}}return a}function s(a){let c=0;const l=6;for(let u=0;u<l;u++)a[u]!==void 0&&c++;return c===l}function r(a){const c=a.target;c.removeEventListener("dispose",r);const l=e.get(c);l!==void 0&&(e.delete(c),l.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:o}}function Q0(i){const e={};function t(n){if(e[n]!==void 0)return e[n];let s;switch(n){case"WEBGL_depth_texture":s=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=i.getExtension(n)}return e[n]=s,s}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const s=t(n);return s===null&&Ls("THREE.WebGLRenderer: "+n+" extension not supported."),s}}}function em(i,e,t,n){const s={},r=new WeakMap;function o(h){const d=h.target;d.index!==null&&e.remove(d.index);for(const g in d.attributes)e.remove(d.attributes[g]);d.removeEventListener("dispose",o),delete s[d.id];const f=r.get(d);f&&(e.remove(f),r.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function a(h,d){return s[d.id]===!0||(d.addEventListener("dispose",o),s[d.id]=!0,t.memory.geometries++),d}function c(h){const d=h.attributes;for(const f in d)e.update(d[f],i.ARRAY_BUFFER)}function l(h){const d=[],f=h.index,g=h.attributes.position;let _=0;if(f!==null){const S=f.array;_=f.version;for(let T=0,x=S.length;T<x;T+=3){const P=S[T+0],w=S[T+1],R=S[T+2];d.push(P,w,w,R,R,P)}}else if(g!==void 0){const S=g.array;_=g.version;for(let T=0,x=S.length/3-1;T<x;T+=3){const P=T+0,w=T+1,R=T+2;d.push(P,w,w,R,R,P)}}else return;const m=new(du(d)?gu:mu)(d,1);m.version=_;const p=r.get(h);p&&e.remove(p),r.set(h,m)}function u(h){const d=r.get(h);if(d){const f=h.index;f!==null&&d.version<f.version&&l(h)}else l(h);return r.get(h)}return{get:a,update:c,getWireframeAttribute:u}}function tm(i,e,t){let n;function s(d){n=d}let r,o;function a(d){r=d.type,o=d.bytesPerElement}function c(d,f){i.drawElements(n,f,r,d*o),t.update(f,n,1)}function l(d,f,g){g!==0&&(i.drawElementsInstanced(n,f,r,d*o,g),t.update(f,n,g))}function u(d,f,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,r,d,0,g);let m=0;for(let p=0;p<g;p++)m+=f[p];t.update(m,n,1)}function h(d,f,g,_){if(g===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<d.length;p++)l(d[p]/o,f[p],_[p]);else{m.multiDrawElementsInstancedWEBGL(n,f,0,r,d,0,_,0,g);let p=0;for(let S=0;S<g;S++)p+=f[S]*_[S];t.update(p,n,1)}}this.setMode=s,this.setIndex=a,this.render=c,this.renderInstances=l,this.renderMultiDraw=u,this.renderMultiDrawInstances=h}function nm(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(t.calls++,o){case i.TRIANGLES:t.triangles+=a*(r/3);break;case i.LINES:t.lines+=a*(r/2);break;case i.LINE_STRIP:t.lines+=a*(r-1);break;case i.LINE_LOOP:t.lines+=a*r;break;case i.POINTS:t.points+=a*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:n}}function im(i,e,t){const n=new WeakMap,s=new lt;function r(o,a,c){const l=o.morphTargetInfluences,u=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,h=u!==void 0?u.length:0;let d=n.get(a);if(d===void 0||d.count!==h){let M=function(){I.dispose(),n.delete(a),a.removeEventListener("dispose",M)};var f=M;d!==void 0&&d.texture.dispose();const g=a.morphAttributes.position!==void 0,_=a.morphAttributes.normal!==void 0,m=a.morphAttributes.color!==void 0,p=a.morphAttributes.position||[],S=a.morphAttributes.normal||[],T=a.morphAttributes.color||[];let x=0;g===!0&&(x=1),_===!0&&(x=2),m===!0&&(x=3);let P=a.attributes.position.count*x,w=1;P>e.maxTextureSize&&(w=Math.ceil(P/e.maxTextureSize),P=e.maxTextureSize);const R=new Float32Array(P*w*4*h),I=new fu(R,P,w,h);I.type=Mn,I.needsUpdate=!0;const y=x*4;for(let C=0;C<h;C++){const F=p[C],H=S[C],X=T[C],L=P*w*4*C;for(let U=0;U<F.count;U++){const V=U*y;g===!0&&(s.fromBufferAttribute(F,U),R[L+V+0]=s.x,R[L+V+1]=s.y,R[L+V+2]=s.z,R[L+V+3]=0),_===!0&&(s.fromBufferAttribute(H,U),R[L+V+4]=s.x,R[L+V+5]=s.y,R[L+V+6]=s.z,R[L+V+7]=0),m===!0&&(s.fromBufferAttribute(X,U),R[L+V+8]=s.x,R[L+V+9]=s.y,R[L+V+10]=s.z,R[L+V+11]=X.itemSize===4?s.w:1)}}d={count:h,texture:I,size:new oe(P,w)},n.set(a,d),a.addEventListener("dispose",M)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)c.getUniforms().setValue(i,"morphTexture",o.morphTexture,t);else{let g=0;for(let m=0;m<l.length;m++)g+=l[m];const _=a.morphTargetsRelative?1:1-g;c.getUniforms().setValue(i,"morphTargetBaseInfluence",_),c.getUniforms().setValue(i,"morphTargetInfluences",l)}c.getUniforms().setValue(i,"morphTargetsTexture",d.texture,t),c.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:r}}function sm(i,e,t,n){let s=new WeakMap;function r(c){const l=n.render.frame,u=c.geometry,h=e.get(c,u);if(s.get(h)!==l&&(e.update(h),s.set(h,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",a)===!1&&c.addEventListener("dispose",a),s.get(c)!==l&&(t.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,i.ARRAY_BUFFER),s.set(c,l))),c.isSkinnedMesh){const d=c.skeleton;s.get(d)!==l&&(d.update(),s.set(d,l))}return h}function o(){s=new WeakMap}function a(c){const l=c.target;l.removeEventListener("dispose",a),t.remove(l.instanceMatrix),l.instanceColor!==null&&t.remove(l.instanceColor)}return{update:r,dispose:o}}const Fu=new Ft,fc=new nl(1,1),Ou=new fu,Bu=new qh,zu=new xu,pc=[],mc=[],gc=new Float32Array(16),_c=new Float32Array(9),vc=new Float32Array(4);function cs(i,e,t){const n=i[0];if(n<=0||n>0)return i;const s=e*t;let r=pc[s];if(r===void 0&&(r=new Float32Array(s),pc[s]=r),e!==0){n.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,i[o].toArray(r,a)}return r}function Tt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function bt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function Hr(i,e){let t=mc[e];t===void 0&&(t=new Int32Array(e),mc[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function rm(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function om(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Tt(t,e))return;i.uniform2fv(this.addr,e),bt(t,e)}}function am(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Tt(t,e))return;i.uniform3fv(this.addr,e),bt(t,e)}}function lm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Tt(t,e))return;i.uniform4fv(this.addr,e),bt(t,e)}}function cm(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Tt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),bt(t,e)}else{if(Tt(t,n))return;vc.set(n),i.uniformMatrix2fv(this.addr,!1,vc),bt(t,n)}}function um(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Tt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),bt(t,e)}else{if(Tt(t,n))return;_c.set(n),i.uniformMatrix3fv(this.addr,!1,_c),bt(t,n)}}function hm(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Tt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),bt(t,e)}else{if(Tt(t,n))return;gc.set(n),i.uniformMatrix4fv(this.addr,!1,gc),bt(t,n)}}function dm(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function fm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Tt(t,e))return;i.uniform2iv(this.addr,e),bt(t,e)}}function pm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Tt(t,e))return;i.uniform3iv(this.addr,e),bt(t,e)}}function mm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Tt(t,e))return;i.uniform4iv(this.addr,e),bt(t,e)}}function gm(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function _m(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Tt(t,e))return;i.uniform2uiv(this.addr,e),bt(t,e)}}function vm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Tt(t,e))return;i.uniform3uiv(this.addr,e),bt(t,e)}}function xm(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Tt(t,e))return;i.uniform4uiv(this.addr,e),bt(t,e)}}function Mm(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(fc.compareFunction=hu,r=fc):r=Fu,t.setTexture2D(e||r,s)}function Sm(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture3D(e||Bu,s)}function ym(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTextureCube(e||zu,s)}function Em(i,e,t){const n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture2DArray(e||Ou,s)}function Tm(i){switch(i){case 5126:return rm;case 35664:return om;case 35665:return am;case 35666:return lm;case 35674:return cm;case 35675:return um;case 35676:return hm;case 5124:case 35670:return dm;case 35667:case 35671:return fm;case 35668:case 35672:return pm;case 35669:case 35673:return mm;case 5125:return gm;case 36294:return _m;case 36295:return vm;case 36296:return xm;case 35678:case 36198:case 36298:case 36306:case 35682:return Mm;case 35679:case 36299:case 36307:return Sm;case 35680:case 36300:case 36308:case 36293:return ym;case 36289:case 36303:case 36311:case 36292:return Em}}function bm(i,e){i.uniform1fv(this.addr,e)}function wm(i,e){const t=cs(e,this.size,2);i.uniform2fv(this.addr,t)}function Am(i,e){const t=cs(e,this.size,3);i.uniform3fv(this.addr,t)}function Cm(i,e){const t=cs(e,this.size,4);i.uniform4fv(this.addr,t)}function Rm(i,e){const t=cs(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function Pm(i,e){const t=cs(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function Dm(i,e){const t=cs(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function Im(i,e){i.uniform1iv(this.addr,e)}function Lm(i,e){i.uniform2iv(this.addr,e)}function Um(i,e){i.uniform3iv(this.addr,e)}function Nm(i,e){i.uniform4iv(this.addr,e)}function Fm(i,e){i.uniform1uiv(this.addr,e)}function Om(i,e){i.uniform2uiv(this.addr,e)}function Bm(i,e){i.uniform3uiv(this.addr,e)}function zm(i,e){i.uniform4uiv(this.addr,e)}function km(i,e,t){const n=this.cache,s=e.length,r=Hr(t,s);Tt(n,r)||(i.uniform1iv(this.addr,r),bt(n,r));for(let o=0;o!==s;++o)t.setTexture2D(e[o]||Fu,r[o])}function Vm(i,e,t){const n=this.cache,s=e.length,r=Hr(t,s);Tt(n,r)||(i.uniform1iv(this.addr,r),bt(n,r));for(let o=0;o!==s;++o)t.setTexture3D(e[o]||Bu,r[o])}function Hm(i,e,t){const n=this.cache,s=e.length,r=Hr(t,s);Tt(n,r)||(i.uniform1iv(this.addr,r),bt(n,r));for(let o=0;o!==s;++o)t.setTextureCube(e[o]||zu,r[o])}function Gm(i,e,t){const n=this.cache,s=e.length,r=Hr(t,s);Tt(n,r)||(i.uniform1iv(this.addr,r),bt(n,r));for(let o=0;o!==s;++o)t.setTexture2DArray(e[o]||Ou,r[o])}function Wm(i){switch(i){case 5126:return bm;case 35664:return wm;case 35665:return Am;case 35666:return Cm;case 35674:return Rm;case 35675:return Pm;case 35676:return Dm;case 5124:case 35670:return Im;case 35667:case 35671:return Lm;case 35668:case 35672:return Um;case 35669:case 35673:return Nm;case 5125:return Fm;case 36294:return Om;case 36295:return Bm;case 36296:return zm;case 35678:case 36198:case 36298:case 36306:case 35682:return km;case 35679:case 36299:case 36307:return Vm;case 35680:case 36300:case 36308:case 36293:return Hm;case 36289:case 36303:case 36311:case 36292:return Gm}}class Xm{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Tm(t.type)}}class qm{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Wm(t.type)}}class Ym{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const s=this.seq;for(let r=0,o=s.length;r!==o;++r){const a=s[r];a.setValue(e,t[a.id],n)}}}const Do=/(\w+)(\])?(\[|\.)?/g;function xc(i,e){i.seq.push(e),i.map[e.id]=e}function Zm(i,e,t){const n=i.name,s=n.length;for(Do.lastIndex=0;;){const r=Do.exec(n),o=Do.lastIndex;let a=r[1];const c=r[2]==="]",l=r[3];if(c&&(a=a|0),l===void 0||l==="["&&o+2===s){xc(t,l===void 0?new Xm(a,i,e):new qm(a,i,e));break}else{let h=t.map[a];h===void 0&&(h=new Ym(a),xc(t,h)),t=h}}}class Ir{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let s=0;s<n;++s){const r=e.getActiveUniform(t,s),o=e.getUniformLocation(t,r.name);Zm(r,o,this)}}setValue(e,t,n,s){const r=this.map[t];r!==void 0&&r.setValue(e,n,s)}setOptional(e,t,n){const s=t[n];s!==void 0&&this.setValue(e,n,s)}static upload(e,t,n,s){for(let r=0,o=t.length;r!==o;++r){const a=t[r],c=n[a.id];c.needsUpdate!==!1&&a.setValue(e,c.value,s)}}static seqWithValue(e,t){const n=[];for(let s=0,r=e.length;s!==r;++s){const o=e[s];o.id in t&&n.push(o)}return n}}function Mc(i,e,t){const n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}const Km=37297;let Jm=0;function jm(i,e){const t=i.split(`
`),n=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=s;o<r;o++){const a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}const Sc=new je;function $m(i){tt._getMatrix(Sc,tt.workingColorSpace,i);const e=`mat3( ${Sc.elements.map(t=>t.toFixed(4))} )`;switch(tt.getTransfer(i)){case Lr:return[e,"LinearTransferOETF"];case ot:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function yc(i,e,t){const n=i.getShaderParameter(e,i.COMPILE_STATUS),r=(i.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";const o=/ERROR: 0:(\d+)/.exec(r);if(o){const a=parseInt(o[1]);return t.toUpperCase()+`

`+r+`

`+jm(i.getShaderSource(e),a)}else return r}function Qm(i,e){const t=$m(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function eg(i,e){let t;switch(e){case jc:t="Linear";break;case $c:t="Reinhard";break;case Qc:t="Cineon";break;case ka:t="ACESFilmic";break;case tu:t="AgX";break;case nu:t="Neutral";break;case eu:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Mr=new D;function tg(){tt.getLuminanceCoefficients(Mr);const i=Mr.x.toFixed(4),e=Mr.y.toFixed(4),t=Mr.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function ng(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(ws).join(`
`)}function ig(i){const e=[];for(const t in i){const n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function sg(i,e){const t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){const r=i.getActiveAttrib(e,s),o=r.name;let a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:i.getAttribLocation(e,o),locationSize:a}}return t}function ws(i){return i!==""}function Ec(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Tc(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const rg=/^[ \t]*#include +<([\w\d./]+)>/gm;function Ua(i){return i.replace(rg,ag)}const og=new Map;function ag(i,e){let t=$e[e];if(t===void 0){const n=og.get(e);if(n!==void 0)t=$e[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return Ua(t)}const lg=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function bc(i){return i.replace(lg,cg)}function cg(i,e,t,n){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function wc(i){let e=`precision ${i.precision} float;
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
#define LOW_PRECISION`),e}function ug(i){let e="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===Zc?e="SHADOWMAP_TYPE_PCF":i.shadowMapType===uh?e="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===Dn&&(e="SHADOWMAP_TYPE_VSM"),e}function hg(i){let e="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case Xi:case qi:e="ENVMAP_TYPE_CUBE";break;case Br:e="ENVMAP_TYPE_CUBE_UV";break}return e}function dg(i){let e="ENVMAP_MODE_REFLECTION";return i.envMap&&i.envMapMode===qi&&(e="ENVMAP_MODE_REFRACTION"),e}function fg(i){let e="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case Jc:e="ENVMAP_BLENDING_MULTIPLY";break;case bh:e="ENVMAP_BLENDING_MIX";break;case wh:e="ENVMAP_BLENDING_ADD";break}return e}function pg(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function mg(i,e,t,n){const s=i.getContext(),r=t.defines;let o=t.vertexShader,a=t.fragmentShader;const c=ug(t),l=hg(t),u=dg(t),h=fg(t),d=pg(t),f=ng(t),g=ig(r),_=s.createProgram();let m,p,S=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(ws).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(ws).join(`
`),p.length>0&&(p+=`
`)):(m=[wc(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(ws).join(`
`),p=[wc(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+u:"",t.envMap?"#define "+h:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Yn?"#define TONE_MAPPING":"",t.toneMapping!==Yn?$e.tonemapping_pars_fragment:"",t.toneMapping!==Yn?eg("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",$e.colorspace_pars_fragment,Qm("linearToOutputTexel",t.outputColorSpace),tg(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(ws).join(`
`)),o=Ua(o),o=Ec(o,t),o=Tc(o,t),a=Ua(a),a=Ec(a,t),a=Tc(a,t),o=bc(o),a=bc(a),t.isRawShaderMaterial!==!0&&(S=`#version 300 es
`,m=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",t.glslVersion===Cl?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Cl?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const T=S+m+o,x=S+p+a,P=Mc(s,s.VERTEX_SHADER,T),w=Mc(s,s.FRAGMENT_SHADER,x);s.attachShader(_,P),s.attachShader(_,w),t.index0AttributeName!==void 0?s.bindAttribLocation(_,0,t.index0AttributeName):t.morphTargets===!0&&s.bindAttribLocation(_,0,"position"),s.linkProgram(_);function R(C){if(i.debug.checkShaderErrors){const F=s.getProgramInfoLog(_)||"",H=s.getShaderInfoLog(P)||"",X=s.getShaderInfoLog(w)||"",L=F.trim(),U=H.trim(),V=X.trim();let G=!0,J=!0;if(s.getProgramParameter(_,s.LINK_STATUS)===!1)if(G=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,_,P,w);else{const se=yc(s,P,"vertex"),de=yc(s,w,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(_,s.VALIDATE_STATUS)+`

Material Name: `+C.name+`
Material Type: `+C.type+`

Program Info Log: `+L+`
`+se+`
`+de)}else L!==""?console.warn("THREE.WebGLProgram: Program Info Log:",L):(U===""||V==="")&&(J=!1);J&&(C.diagnostics={runnable:G,programLog:L,vertexShader:{log:U,prefix:m},fragmentShader:{log:V,prefix:p}})}s.deleteShader(P),s.deleteShader(w),I=new Ir(s,_),y=sg(s,_)}let I;this.getUniforms=function(){return I===void 0&&R(this),I};let y;this.getAttributes=function(){return y===void 0&&R(this),y};let M=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return M===!1&&(M=s.getProgramParameter(_,Km)),M},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(_),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Jm++,this.cacheKey=e,this.usedTimes=1,this.program=_,this.vertexShader=P,this.fragmentShader=w,this}let gg=0;class _g{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,s=this._getShaderStage(t),r=this._getShaderStage(n),o=this._getShaderCacheForMaterial(e);return o.has(s)===!1&&(o.add(s),s.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new vg(e),t.set(e,n)),n}}class vg{constructor(e){this.id=gg++,this.code=e,this.usedTimes=0}}function xg(i,e,t,n,s,r,o){const a=new ja,c=new _g,l=new Set,u=[],h=s.logarithmicDepthBuffer,d=s.vertexTextures;let f=s.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(y){return l.add(y),y===0?"uv":`uv${y}`}function m(y,M,C,F,H){const X=F.fog,L=H.geometry,U=y.isMeshStandardMaterial?F.environment:null,V=(y.isMeshStandardMaterial?t:e).get(y.envMap||U),G=V&&V.mapping===Br?V.image.height:null,J=g[y.type];y.precision!==null&&(f=s.getMaxPrecision(y.precision),f!==y.precision&&console.warn("THREE.WebGLProgram.getParameters:",y.precision,"not supported, using",f,"instead."));const se=L.morphAttributes.position||L.morphAttributes.normal||L.morphAttributes.color,de=se!==void 0?se.length:0;let Te=0;L.morphAttributes.position!==void 0&&(Te=1),L.morphAttributes.normal!==void 0&&(Te=2),L.morphAttributes.color!==void 0&&(Te=3);let Be,ze,Ve,Y;if(J){const rt=vn[J];Be=rt.vertexShader,ze=rt.fragmentShader}else Be=y.vertexShader,ze=y.fragmentShader,c.update(y),Ve=c.getVertexShaderID(y),Y=c.getFragmentShaderID(y);const ee=i.getRenderTarget(),_e=i.state.buffers.depth.getReversed(),Se=H.isInstancedMesh===!0,ve=H.isBatchedMesh===!0,Ne=!!y.map,De=!!y.matcap,A=!!V,te=!!y.aoMap,Q=!!y.lightMap,j=!!y.bumpMap,$=!!y.normalMap,pe=!!y.displacementMap,re=!!y.emissiveMap,me=!!y.metalnessMap,Ge=!!y.roughnessMap,Fe=y.anisotropy>0,b=y.clearcoat>0,v=y.dispersion>0,k=y.iridescence>0,Z=y.sheen>0,ie=y.transmission>0,K=Fe&&!!y.anisotropyMap,we=b&&!!y.clearcoatMap,ue=b&&!!y.clearcoatNormalMap,be=b&&!!y.clearcoatRoughnessMap,Re=k&&!!y.iridescenceMap,le=k&&!!y.iridescenceThicknessMap,ye=Z&&!!y.sheenColorMap,He=Z&&!!y.sheenRoughnessMap,Le=!!y.specularMap,xe=!!y.specularColorMap,Xe=!!y.specularIntensityMap,N=ie&&!!y.transmissionMap,ae=ie&&!!y.thicknessMap,ge=!!y.gradientMap,Ce=!!y.alphaMap,ce=y.alphaTest>0,ne=!!y.alphaHash,Ie=!!y.extensions;let Je=Yn;y.toneMapped&&(ee===null||ee.isXRRenderTarget===!0)&&(Je=i.toneMapping);const dt={shaderID:J,shaderType:y.type,shaderName:y.name,vertexShader:Be,fragmentShader:ze,defines:y.defines,customVertexShaderID:Ve,customFragmentShaderID:Y,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:f,batching:ve,batchingColor:ve&&H._colorsTexture!==null,instancing:Se,instancingColor:Se&&H.instanceColor!==null,instancingMorph:Se&&H.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:ee===null?i.outputColorSpace:ee.isXRRenderTarget===!0?ee.texture.colorSpace:Ki,alphaToCoverage:!!y.alphaToCoverage,map:Ne,matcap:De,envMap:A,envMapMode:A&&V.mapping,envMapCubeUVHeight:G,aoMap:te,lightMap:Q,bumpMap:j,normalMap:$,displacementMap:d&&pe,emissiveMap:re,normalMapObjectSpace:$&&y.normalMapType===Ph,normalMapTangentSpace:$&&y.normalMapType===Za,metalnessMap:me,roughnessMap:Ge,anisotropy:Fe,anisotropyMap:K,clearcoat:b,clearcoatMap:we,clearcoatNormalMap:ue,clearcoatRoughnessMap:be,dispersion:v,iridescence:k,iridescenceMap:Re,iridescenceThicknessMap:le,sheen:Z,sheenColorMap:ye,sheenRoughnessMap:He,specularMap:Le,specularColorMap:xe,specularIntensityMap:Xe,transmission:ie,transmissionMap:N,thicknessMap:ae,gradientMap:ge,opaque:y.transparent===!1&&y.blending===Hi&&y.alphaToCoverage===!1,alphaMap:Ce,alphaTest:ce,alphaHash:ne,combine:y.combine,mapUv:Ne&&_(y.map.channel),aoMapUv:te&&_(y.aoMap.channel),lightMapUv:Q&&_(y.lightMap.channel),bumpMapUv:j&&_(y.bumpMap.channel),normalMapUv:$&&_(y.normalMap.channel),displacementMapUv:pe&&_(y.displacementMap.channel),emissiveMapUv:re&&_(y.emissiveMap.channel),metalnessMapUv:me&&_(y.metalnessMap.channel),roughnessMapUv:Ge&&_(y.roughnessMap.channel),anisotropyMapUv:K&&_(y.anisotropyMap.channel),clearcoatMapUv:we&&_(y.clearcoatMap.channel),clearcoatNormalMapUv:ue&&_(y.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:be&&_(y.clearcoatRoughnessMap.channel),iridescenceMapUv:Re&&_(y.iridescenceMap.channel),iridescenceThicknessMapUv:le&&_(y.iridescenceThicknessMap.channel),sheenColorMapUv:ye&&_(y.sheenColorMap.channel),sheenRoughnessMapUv:He&&_(y.sheenRoughnessMap.channel),specularMapUv:Le&&_(y.specularMap.channel),specularColorMapUv:xe&&_(y.specularColorMap.channel),specularIntensityMapUv:Xe&&_(y.specularIntensityMap.channel),transmissionMapUv:N&&_(y.transmissionMap.channel),thicknessMapUv:ae&&_(y.thicknessMap.channel),alphaMapUv:Ce&&_(y.alphaMap.channel),vertexTangents:!!L.attributes.tangent&&($||Fe),vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&!!L.attributes.color&&L.attributes.color.itemSize===4,pointsUvs:H.isPoints===!0&&!!L.attributes.uv&&(Ne||Ce),fog:!!X,useFog:y.fog===!0,fogExp2:!!X&&X.isFogExp2,flatShading:y.flatShading===!0&&y.wireframe===!1,sizeAttenuation:y.sizeAttenuation===!0,logarithmicDepthBuffer:h,reversedDepthBuffer:_e,skinning:H.isSkinnedMesh===!0,morphTargets:L.morphAttributes.position!==void 0,morphNormals:L.morphAttributes.normal!==void 0,morphColors:L.morphAttributes.color!==void 0,morphTargetsCount:de,morphTextureStride:Te,numDirLights:M.directional.length,numPointLights:M.point.length,numSpotLights:M.spot.length,numSpotLightMaps:M.spotLightMap.length,numRectAreaLights:M.rectArea.length,numHemiLights:M.hemi.length,numDirLightShadows:M.directionalShadowMap.length,numPointLightShadows:M.pointShadowMap.length,numSpotLightShadows:M.spotShadowMap.length,numSpotLightShadowsWithMaps:M.numSpotLightShadowsWithMaps,numLightProbes:M.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:y.dithering,shadowMapEnabled:i.shadowMap.enabled&&C.length>0,shadowMapType:i.shadowMap.type,toneMapping:Je,decodeVideoTexture:Ne&&y.map.isVideoTexture===!0&&tt.getTransfer(y.map.colorSpace)===ot,decodeVideoTextureEmissive:re&&y.emissiveMap.isVideoTexture===!0&&tt.getTransfer(y.emissiveMap.colorSpace)===ot,premultipliedAlpha:y.premultipliedAlpha,doubleSided:y.side===ln,flipSided:y.side===Xt,useDepthPacking:y.depthPacking>=0,depthPacking:y.depthPacking||0,index0AttributeName:y.index0AttributeName,extensionClipCullDistance:Ie&&y.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Ie&&y.extensions.multiDraw===!0||ve)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:y.customProgramCacheKey()};return dt.vertexUv1s=l.has(1),dt.vertexUv2s=l.has(2),dt.vertexUv3s=l.has(3),l.clear(),dt}function p(y){const M=[];if(y.shaderID?M.push(y.shaderID):(M.push(y.customVertexShaderID),M.push(y.customFragmentShaderID)),y.defines!==void 0)for(const C in y.defines)M.push(C),M.push(y.defines[C]);return y.isRawShaderMaterial===!1&&(S(M,y),T(M,y),M.push(i.outputColorSpace)),M.push(y.customProgramCacheKey),M.join()}function S(y,M){y.push(M.precision),y.push(M.outputColorSpace),y.push(M.envMapMode),y.push(M.envMapCubeUVHeight),y.push(M.mapUv),y.push(M.alphaMapUv),y.push(M.lightMapUv),y.push(M.aoMapUv),y.push(M.bumpMapUv),y.push(M.normalMapUv),y.push(M.displacementMapUv),y.push(M.emissiveMapUv),y.push(M.metalnessMapUv),y.push(M.roughnessMapUv),y.push(M.anisotropyMapUv),y.push(M.clearcoatMapUv),y.push(M.clearcoatNormalMapUv),y.push(M.clearcoatRoughnessMapUv),y.push(M.iridescenceMapUv),y.push(M.iridescenceThicknessMapUv),y.push(M.sheenColorMapUv),y.push(M.sheenRoughnessMapUv),y.push(M.specularMapUv),y.push(M.specularColorMapUv),y.push(M.specularIntensityMapUv),y.push(M.transmissionMapUv),y.push(M.thicknessMapUv),y.push(M.combine),y.push(M.fogExp2),y.push(M.sizeAttenuation),y.push(M.morphTargetsCount),y.push(M.morphAttributeCount),y.push(M.numDirLights),y.push(M.numPointLights),y.push(M.numSpotLights),y.push(M.numSpotLightMaps),y.push(M.numHemiLights),y.push(M.numRectAreaLights),y.push(M.numDirLightShadows),y.push(M.numPointLightShadows),y.push(M.numSpotLightShadows),y.push(M.numSpotLightShadowsWithMaps),y.push(M.numLightProbes),y.push(M.shadowMapType),y.push(M.toneMapping),y.push(M.numClippingPlanes),y.push(M.numClipIntersection),y.push(M.depthPacking)}function T(y,M){a.disableAll(),M.supportsVertexTextures&&a.enable(0),M.instancing&&a.enable(1),M.instancingColor&&a.enable(2),M.instancingMorph&&a.enable(3),M.matcap&&a.enable(4),M.envMap&&a.enable(5),M.normalMapObjectSpace&&a.enable(6),M.normalMapTangentSpace&&a.enable(7),M.clearcoat&&a.enable(8),M.iridescence&&a.enable(9),M.alphaTest&&a.enable(10),M.vertexColors&&a.enable(11),M.vertexAlphas&&a.enable(12),M.vertexUv1s&&a.enable(13),M.vertexUv2s&&a.enable(14),M.vertexUv3s&&a.enable(15),M.vertexTangents&&a.enable(16),M.anisotropy&&a.enable(17),M.alphaHash&&a.enable(18),M.batching&&a.enable(19),M.dispersion&&a.enable(20),M.batchingColor&&a.enable(21),M.gradientMap&&a.enable(22),y.push(a.mask),a.disableAll(),M.fog&&a.enable(0),M.useFog&&a.enable(1),M.flatShading&&a.enable(2),M.logarithmicDepthBuffer&&a.enable(3),M.reversedDepthBuffer&&a.enable(4),M.skinning&&a.enable(5),M.morphTargets&&a.enable(6),M.morphNormals&&a.enable(7),M.morphColors&&a.enable(8),M.premultipliedAlpha&&a.enable(9),M.shadowMapEnabled&&a.enable(10),M.doubleSided&&a.enable(11),M.flipSided&&a.enable(12),M.useDepthPacking&&a.enable(13),M.dithering&&a.enable(14),M.transmission&&a.enable(15),M.sheen&&a.enable(16),M.opaque&&a.enable(17),M.pointsUvs&&a.enable(18),M.decodeVideoTexture&&a.enable(19),M.decodeVideoTextureEmissive&&a.enable(20),M.alphaToCoverage&&a.enable(21),y.push(a.mask)}function x(y){const M=g[y.type];let C;if(M){const F=vn[M];C=xn.clone(F.uniforms)}else C=y.uniforms;return C}function P(y,M){let C;for(let F=0,H=u.length;F<H;F++){const X=u[F];if(X.cacheKey===M){C=X,++C.usedTimes;break}}return C===void 0&&(C=new mg(i,M,y,r),u.push(C)),C}function w(y){if(--y.usedTimes===0){const M=u.indexOf(y);u[M]=u[u.length-1],u.pop(),y.destroy()}}function R(y){c.remove(y)}function I(){c.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:x,acquireProgram:P,releaseProgram:w,releaseShaderCache:R,programs:u,dispose:I}}function Mg(){let i=new WeakMap;function e(o){return i.has(o)}function t(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function s(o,a,c){i.get(o)[a]=c}function r(){i=new WeakMap}return{has:e,get:t,remove:n,update:s,dispose:r}}function Sg(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.z!==e.z?i.z-e.z:i.id-e.id}function Ac(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function Cc(){const i=[];let e=0;const t=[],n=[],s=[];function r(){e=0,t.length=0,n.length=0,s.length=0}function o(h,d,f,g,_,m){let p=i[e];return p===void 0?(p={id:h.id,object:h,geometry:d,material:f,groupOrder:g,renderOrder:h.renderOrder,z:_,group:m},i[e]=p):(p.id=h.id,p.object=h,p.geometry=d,p.material=f,p.groupOrder=g,p.renderOrder=h.renderOrder,p.z=_,p.group=m),e++,p}function a(h,d,f,g,_,m){const p=o(h,d,f,g,_,m);f.transmission>0?n.push(p):f.transparent===!0?s.push(p):t.push(p)}function c(h,d,f,g,_,m){const p=o(h,d,f,g,_,m);f.transmission>0?n.unshift(p):f.transparent===!0?s.unshift(p):t.unshift(p)}function l(h,d){t.length>1&&t.sort(h||Sg),n.length>1&&n.sort(d||Ac),s.length>1&&s.sort(d||Ac)}function u(){for(let h=e,d=i.length;h<d;h++){const f=i[h];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:t,transmissive:n,transparent:s,init:r,push:a,unshift:c,finish:u,sort:l}}function yg(){let i=new WeakMap;function e(n,s){const r=i.get(n);let o;return r===void 0?(o=new Cc,i.set(n,[o])):s>=r.length?(o=new Cc,r.push(o)):o=r[s],o}function t(){i=new WeakMap}return{get:e,dispose:t}}function Eg(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new D,color:new Ke};break;case"SpotLight":t={position:new D,direction:new D,color:new Ke,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new D,color:new Ke,distance:0,decay:0};break;case"HemisphereLight":t={direction:new D,skyColor:new Ke,groundColor:new Ke};break;case"RectAreaLight":t={color:new Ke,position:new D,halfWidth:new D,halfHeight:new D};break}return i[e.id]=t,t}}}function Tg(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new oe};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new oe};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new oe,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let bg=0;function wg(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function Ag(i){const e=new Eg,t=Tg(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new D);const s=new D,r=new nt,o=new nt;function a(l){let u=0,h=0,d=0;for(let y=0;y<9;y++)n.probe[y].set(0,0,0);let f=0,g=0,_=0,m=0,p=0,S=0,T=0,x=0,P=0,w=0,R=0;l.sort(wg);for(let y=0,M=l.length;y<M;y++){const C=l[y],F=C.color,H=C.intensity,X=C.distance,L=C.shadow&&C.shadow.map?C.shadow.map.texture:null;if(C.isAmbientLight)u+=F.r*H,h+=F.g*H,d+=F.b*H;else if(C.isLightProbe){for(let U=0;U<9;U++)n.probe[U].addScaledVector(C.sh.coefficients[U],H);R++}else if(C.isDirectionalLight){const U=e.get(C);if(U.color.copy(C.color).multiplyScalar(C.intensity),C.castShadow){const V=C.shadow,G=t.get(C);G.shadowIntensity=V.intensity,G.shadowBias=V.bias,G.shadowNormalBias=V.normalBias,G.shadowRadius=V.radius,G.shadowMapSize=V.mapSize,n.directionalShadow[f]=G,n.directionalShadowMap[f]=L,n.directionalShadowMatrix[f]=C.shadow.matrix,S++}n.directional[f]=U,f++}else if(C.isSpotLight){const U=e.get(C);U.position.setFromMatrixPosition(C.matrixWorld),U.color.copy(F).multiplyScalar(H),U.distance=X,U.coneCos=Math.cos(C.angle),U.penumbraCos=Math.cos(C.angle*(1-C.penumbra)),U.decay=C.decay,n.spot[_]=U;const V=C.shadow;if(C.map&&(n.spotLightMap[P]=C.map,P++,V.updateMatrices(C),C.castShadow&&w++),n.spotLightMatrix[_]=V.matrix,C.castShadow){const G=t.get(C);G.shadowIntensity=V.intensity,G.shadowBias=V.bias,G.shadowNormalBias=V.normalBias,G.shadowRadius=V.radius,G.shadowMapSize=V.mapSize,n.spotShadow[_]=G,n.spotShadowMap[_]=L,x++}_++}else if(C.isRectAreaLight){const U=e.get(C);U.color.copy(F).multiplyScalar(H),U.halfWidth.set(C.width*.5,0,0),U.halfHeight.set(0,C.height*.5,0),n.rectArea[m]=U,m++}else if(C.isPointLight){const U=e.get(C);if(U.color.copy(C.color).multiplyScalar(C.intensity),U.distance=C.distance,U.decay=C.decay,C.castShadow){const V=C.shadow,G=t.get(C);G.shadowIntensity=V.intensity,G.shadowBias=V.bias,G.shadowNormalBias=V.normalBias,G.shadowRadius=V.radius,G.shadowMapSize=V.mapSize,G.shadowCameraNear=V.camera.near,G.shadowCameraFar=V.camera.far,n.pointShadow[g]=G,n.pointShadowMap[g]=L,n.pointShadowMatrix[g]=C.shadow.matrix,T++}n.point[g]=U,g++}else if(C.isHemisphereLight){const U=e.get(C);U.skyColor.copy(C.color).multiplyScalar(H),U.groundColor.copy(C.groundColor).multiplyScalar(H),n.hemi[p]=U,p++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Me.LTC_FLOAT_1,n.rectAreaLTC2=Me.LTC_FLOAT_2):(n.rectAreaLTC1=Me.LTC_HALF_1,n.rectAreaLTC2=Me.LTC_HALF_2)),n.ambient[0]=u,n.ambient[1]=h,n.ambient[2]=d;const I=n.hash;(I.directionalLength!==f||I.pointLength!==g||I.spotLength!==_||I.rectAreaLength!==m||I.hemiLength!==p||I.numDirectionalShadows!==S||I.numPointShadows!==T||I.numSpotShadows!==x||I.numSpotMaps!==P||I.numLightProbes!==R)&&(n.directional.length=f,n.spot.length=_,n.rectArea.length=m,n.point.length=g,n.hemi.length=p,n.directionalShadow.length=S,n.directionalShadowMap.length=S,n.pointShadow.length=T,n.pointShadowMap.length=T,n.spotShadow.length=x,n.spotShadowMap.length=x,n.directionalShadowMatrix.length=S,n.pointShadowMatrix.length=T,n.spotLightMatrix.length=x+P-w,n.spotLightMap.length=P,n.numSpotLightShadowsWithMaps=w,n.numLightProbes=R,I.directionalLength=f,I.pointLength=g,I.spotLength=_,I.rectAreaLength=m,I.hemiLength=p,I.numDirectionalShadows=S,I.numPointShadows=T,I.numSpotShadows=x,I.numSpotMaps=P,I.numLightProbes=R,n.version=bg++)}function c(l,u){let h=0,d=0,f=0,g=0,_=0;const m=u.matrixWorldInverse;for(let p=0,S=l.length;p<S;p++){const T=l[p];if(T.isDirectionalLight){const x=n.directional[h];x.direction.setFromMatrixPosition(T.matrixWorld),s.setFromMatrixPosition(T.target.matrixWorld),x.direction.sub(s),x.direction.transformDirection(m),h++}else if(T.isSpotLight){const x=n.spot[f];x.position.setFromMatrixPosition(T.matrixWorld),x.position.applyMatrix4(m),x.direction.setFromMatrixPosition(T.matrixWorld),s.setFromMatrixPosition(T.target.matrixWorld),x.direction.sub(s),x.direction.transformDirection(m),f++}else if(T.isRectAreaLight){const x=n.rectArea[g];x.position.setFromMatrixPosition(T.matrixWorld),x.position.applyMatrix4(m),o.identity(),r.copy(T.matrixWorld),r.premultiply(m),o.extractRotation(r),x.halfWidth.set(T.width*.5,0,0),x.halfHeight.set(0,T.height*.5,0),x.halfWidth.applyMatrix4(o),x.halfHeight.applyMatrix4(o),g++}else if(T.isPointLight){const x=n.point[d];x.position.setFromMatrixPosition(T.matrixWorld),x.position.applyMatrix4(m),d++}else if(T.isHemisphereLight){const x=n.hemi[_];x.direction.setFromMatrixPosition(T.matrixWorld),x.direction.transformDirection(m),_++}}}return{setup:a,setupView:c,state:n}}function Rc(i){const e=new Ag(i),t=[],n=[];function s(u){l.camera=u,t.length=0,n.length=0}function r(u){t.push(u)}function o(u){n.push(u)}function a(){e.setup(t)}function c(u){e.setupView(t,u)}const l={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:s,state:l,setupLights:a,setupLightsView:c,pushLight:r,pushShadow:o}}function Cg(i){let e=new WeakMap;function t(s,r=0){const o=e.get(s);let a;return o===void 0?(a=new Rc(i),e.set(s,[a])):r>=o.length?(a=new Rc(i),o.push(a)):a=o[r],a}function n(){e=new WeakMap}return{get:t,dispose:n}}const Rg=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Pg=`uniform sampler2D shadow_pass;
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
}`;function Dg(i,e,t){let n=new el;const s=new oe,r=new oe,o=new lt,a=new Jd({depthPacking:Rh}),c=new jd,l={},u=t.maxTextureSize,h={[Kn]:Xt,[Xt]:Kn,[ln]:ln},d=new Mt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new oe},radius:{value:4}},vertexShader:Rg,fragmentShader:Pg}),f=d.clone();f.defines.HORIZONTAL_PASS=1;const g=new wt;g.setAttribute("position",new Vt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const _=new st(g,d),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Zc;let p=this.type;this.render=function(w,R,I){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||w.length===0)return;const y=i.getRenderTarget(),M=i.getActiveCubeFace(),C=i.getActiveMipmapLevel(),F=i.state;F.setBlending(Dt),F.buffers.depth.getReversed()===!0?F.buffers.color.setClear(0,0,0,0):F.buffers.color.setClear(1,1,1,1),F.buffers.depth.setTest(!0),F.setScissorTest(!1);const H=p!==Dn&&this.type===Dn,X=p===Dn&&this.type!==Dn;for(let L=0,U=w.length;L<U;L++){const V=w[L],G=V.shadow;if(G===void 0){console.warn("THREE.WebGLShadowMap:",V,"has no shadow.");continue}if(G.autoUpdate===!1&&G.needsUpdate===!1)continue;s.copy(G.mapSize);const J=G.getFrameExtents();if(s.multiply(J),r.copy(G.mapSize),(s.x>u||s.y>u)&&(s.x>u&&(r.x=Math.floor(u/J.x),s.x=r.x*J.x,G.mapSize.x=r.x),s.y>u&&(r.y=Math.floor(u/J.y),s.y=r.y*J.y,G.mapSize.y=r.y)),G.map===null||H===!0||X===!0){const de=this.type!==Dn?{minFilter:kt,magFilter:kt}:{};G.map!==null&&G.map.dispose(),G.map=new Jt(s.x,s.y,de),G.map.texture.name=V.name+".shadowMap",G.camera.updateProjectionMatrix()}i.setRenderTarget(G.map),i.clear();const se=G.getViewportCount();for(let de=0;de<se;de++){const Te=G.getViewport(de);o.set(r.x*Te.x,r.y*Te.y,r.x*Te.z,r.y*Te.w),F.viewport(o),G.updateMatrices(V,de),n=G.getFrustum(),x(R,I,G.camera,V,this.type)}G.isPointLightShadow!==!0&&this.type===Dn&&S(G,I),G.needsUpdate=!1}p=this.type,m.needsUpdate=!1,i.setRenderTarget(y,M,C)};function S(w,R){const I=e.update(_);d.defines.VSM_SAMPLES!==w.blurSamples&&(d.defines.VSM_SAMPLES=w.blurSamples,f.defines.VSM_SAMPLES=w.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),w.mapPass===null&&(w.mapPass=new Jt(s.x,s.y)),d.uniforms.shadow_pass.value=w.map.texture,d.uniforms.resolution.value=w.mapSize,d.uniforms.radius.value=w.radius,i.setRenderTarget(w.mapPass),i.clear(),i.renderBufferDirect(R,null,I,d,_,null),f.uniforms.shadow_pass.value=w.mapPass.texture,f.uniforms.resolution.value=w.mapSize,f.uniforms.radius.value=w.radius,i.setRenderTarget(w.map),i.clear(),i.renderBufferDirect(R,null,I,f,_,null)}function T(w,R,I,y){let M=null;const C=I.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(C!==void 0)M=C;else if(M=I.isPointLight===!0?c:a,i.localClippingEnabled&&R.clipShadows===!0&&Array.isArray(R.clippingPlanes)&&R.clippingPlanes.length!==0||R.displacementMap&&R.displacementScale!==0||R.alphaMap&&R.alphaTest>0||R.map&&R.alphaTest>0||R.alphaToCoverage===!0){const F=M.uuid,H=R.uuid;let X=l[F];X===void 0&&(X={},l[F]=X);let L=X[H];L===void 0&&(L=M.clone(),X[H]=L,R.addEventListener("dispose",P)),M=L}if(M.visible=R.visible,M.wireframe=R.wireframe,y===Dn?M.side=R.shadowSide!==null?R.shadowSide:R.side:M.side=R.shadowSide!==null?R.shadowSide:h[R.side],M.alphaMap=R.alphaMap,M.alphaTest=R.alphaToCoverage===!0?.5:R.alphaTest,M.map=R.map,M.clipShadows=R.clipShadows,M.clippingPlanes=R.clippingPlanes,M.clipIntersection=R.clipIntersection,M.displacementMap=R.displacementMap,M.displacementScale=R.displacementScale,M.displacementBias=R.displacementBias,M.wireframeLinewidth=R.wireframeLinewidth,M.linewidth=R.linewidth,I.isPointLight===!0&&M.isMeshDistanceMaterial===!0){const F=i.properties.get(M);F.light=I}return M}function x(w,R,I,y,M){if(w.visible===!1)return;if(w.layers.test(R.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&M===Dn)&&(!w.frustumCulled||n.intersectsObject(w))){w.modelViewMatrix.multiplyMatrices(I.matrixWorldInverse,w.matrixWorld);const H=e.update(w),X=w.material;if(Array.isArray(X)){const L=H.groups;for(let U=0,V=L.length;U<V;U++){const G=L[U],J=X[G.materialIndex];if(J&&J.visible){const se=T(w,J,y,M);w.onBeforeShadow(i,w,R,I,H,se,G),i.renderBufferDirect(I,null,H,se,w,G),w.onAfterShadow(i,w,R,I,H,se,G)}}}else if(X.visible){const L=T(w,X,y,M);w.onBeforeShadow(i,w,R,I,H,L,null),i.renderBufferDirect(I,null,H,L,w,null),w.onAfterShadow(i,w,R,I,H,L,null)}}const F=w.children;for(let H=0,X=F.length;H<X;H++)x(F[H],R,I,y,M)}function P(w){w.target.removeEventListener("dispose",P);for(const I in l){const y=l[I],M=w.target.uuid;M in y&&(y[M].dispose(),delete y[M])}}}const Ig={[Wo]:Xo,[qo]:Ko,[Yo]:Jo,[Wi]:Zo,[Xo]:Wo,[Ko]:qo,[Jo]:Yo,[Zo]:Wi};function Lg(i,e){function t(){let N=!1;const ae=new lt;let ge=null;const Ce=new lt(0,0,0,0);return{setMask:function(ce){ge!==ce&&!N&&(i.colorMask(ce,ce,ce,ce),ge=ce)},setLocked:function(ce){N=ce},setClear:function(ce,ne,Ie,Je,dt){dt===!0&&(ce*=Je,ne*=Je,Ie*=Je),ae.set(ce,ne,Ie,Je),Ce.equals(ae)===!1&&(i.clearColor(ce,ne,Ie,Je),Ce.copy(ae))},reset:function(){N=!1,ge=null,Ce.set(-1,0,0,0)}}}function n(){let N=!1,ae=!1,ge=null,Ce=null,ce=null;return{setReversed:function(ne){if(ae!==ne){const Ie=e.get("EXT_clip_control");ne?Ie.clipControlEXT(Ie.LOWER_LEFT_EXT,Ie.ZERO_TO_ONE_EXT):Ie.clipControlEXT(Ie.LOWER_LEFT_EXT,Ie.NEGATIVE_ONE_TO_ONE_EXT),ae=ne;const Je=ce;ce=null,this.setClear(Je)}},getReversed:function(){return ae},setTest:function(ne){ne?ee(i.DEPTH_TEST):_e(i.DEPTH_TEST)},setMask:function(ne){ge!==ne&&!N&&(i.depthMask(ne),ge=ne)},setFunc:function(ne){if(ae&&(ne=Ig[ne]),Ce!==ne){switch(ne){case Wo:i.depthFunc(i.NEVER);break;case Xo:i.depthFunc(i.ALWAYS);break;case qo:i.depthFunc(i.LESS);break;case Wi:i.depthFunc(i.LEQUAL);break;case Yo:i.depthFunc(i.EQUAL);break;case Zo:i.depthFunc(i.GEQUAL);break;case Ko:i.depthFunc(i.GREATER);break;case Jo:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}Ce=ne}},setLocked:function(ne){N=ne},setClear:function(ne){ce!==ne&&(ae&&(ne=1-ne),i.clearDepth(ne),ce=ne)},reset:function(){N=!1,ge=null,Ce=null,ce=null,ae=!1}}}function s(){let N=!1,ae=null,ge=null,Ce=null,ce=null,ne=null,Ie=null,Je=null,dt=null;return{setTest:function(rt){N||(rt?ee(i.STENCIL_TEST):_e(i.STENCIL_TEST))},setMask:function(rt){ae!==rt&&!N&&(i.stencilMask(rt),ae=rt)},setFunc:function(rt,Tn,gn){(ge!==rt||Ce!==Tn||ce!==gn)&&(i.stencilFunc(rt,Tn,gn),ge=rt,Ce=Tn,ce=gn)},setOp:function(rt,Tn,gn){(ne!==rt||Ie!==Tn||Je!==gn)&&(i.stencilOp(rt,Tn,gn),ne=rt,Ie=Tn,Je=gn)},setLocked:function(rt){N=rt},setClear:function(rt){dt!==rt&&(i.clearStencil(rt),dt=rt)},reset:function(){N=!1,ae=null,ge=null,Ce=null,ce=null,ne=null,Ie=null,Je=null,dt=null}}}const r=new t,o=new n,a=new s,c=new WeakMap,l=new WeakMap;let u={},h={},d=new WeakMap,f=[],g=null,_=!1,m=null,p=null,S=null,T=null,x=null,P=null,w=null,R=new Ke(0,0,0),I=0,y=!1,M=null,C=null,F=null,H=null,X=null;const L=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let U=!1,V=0;const G=i.getParameter(i.VERSION);G.indexOf("WebGL")!==-1?(V=parseFloat(/^WebGL (\d)/.exec(G)[1]),U=V>=1):G.indexOf("OpenGL ES")!==-1&&(V=parseFloat(/^OpenGL ES (\d)/.exec(G)[1]),U=V>=2);let J=null,se={};const de=i.getParameter(i.SCISSOR_BOX),Te=i.getParameter(i.VIEWPORT),Be=new lt().fromArray(de),ze=new lt().fromArray(Te);function Ve(N,ae,ge,Ce){const ce=new Uint8Array(4),ne=i.createTexture();i.bindTexture(N,ne),i.texParameteri(N,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(N,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Ie=0;Ie<ge;Ie++)N===i.TEXTURE_3D||N===i.TEXTURE_2D_ARRAY?i.texImage3D(ae,0,i.RGBA,1,1,Ce,0,i.RGBA,i.UNSIGNED_BYTE,ce):i.texImage2D(ae+Ie,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,ce);return ne}const Y={};Y[i.TEXTURE_2D]=Ve(i.TEXTURE_2D,i.TEXTURE_2D,1),Y[i.TEXTURE_CUBE_MAP]=Ve(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),Y[i.TEXTURE_2D_ARRAY]=Ve(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Y[i.TEXTURE_3D]=Ve(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),ee(i.DEPTH_TEST),o.setFunc(Wi),j(!1),$(El),ee(i.CULL_FACE),te(Dt);function ee(N){u[N]!==!0&&(i.enable(N),u[N]=!0)}function _e(N){u[N]!==!1&&(i.disable(N),u[N]=!1)}function Se(N,ae){return h[N]!==ae?(i.bindFramebuffer(N,ae),h[N]=ae,N===i.DRAW_FRAMEBUFFER&&(h[i.FRAMEBUFFER]=ae),N===i.FRAMEBUFFER&&(h[i.DRAW_FRAMEBUFFER]=ae),!0):!1}function ve(N,ae){let ge=f,Ce=!1;if(N){ge=d.get(ae),ge===void 0&&(ge=[],d.set(ae,ge));const ce=N.textures;if(ge.length!==ce.length||ge[0]!==i.COLOR_ATTACHMENT0){for(let ne=0,Ie=ce.length;ne<Ie;ne++)ge[ne]=i.COLOR_ATTACHMENT0+ne;ge.length=ce.length,Ce=!0}}else ge[0]!==i.BACK&&(ge[0]=i.BACK,Ce=!0);Ce&&i.drawBuffers(ge)}function Ne(N){return g!==N?(i.useProgram(N),g=N,!0):!1}const De={[cn]:i.FUNC_ADD,[hh]:i.FUNC_SUBTRACT,[dh]:i.FUNC_REVERSE_SUBTRACT};De[fh]=i.MIN,De[ph]=i.MAX;const A={[Ts]:i.ZERO,[mh]:i.ONE,[gh]:i.SRC_COLOR,[ko]:i.SRC_ALPHA,[Mh]:i.SRC_ALPHA_SATURATE,[Go]:i.DST_COLOR,[Ho]:i.DST_ALPHA,[_h]:i.ONE_MINUS_SRC_COLOR,[Vo]:i.ONE_MINUS_SRC_ALPHA,[xh]:i.ONE_MINUS_DST_COLOR,[vh]:i.ONE_MINUS_DST_ALPHA,[Sh]:i.CONSTANT_COLOR,[yh]:i.ONE_MINUS_CONSTANT_COLOR,[Eh]:i.CONSTANT_ALPHA,[Th]:i.ONE_MINUS_CONSTANT_ALPHA};function te(N,ae,ge,Ce,ce,ne,Ie,Je,dt,rt){if(N===Dt){_===!0&&(_e(i.BLEND),_=!1);return}if(_===!1&&(ee(i.BLEND),_=!0),N!==Kc){if(N!==m||rt!==y){if((p!==cn||x!==cn)&&(i.blendEquation(i.FUNC_ADD),p=cn,x=cn),rt)switch(N){case Hi:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Ps:i.blendFunc(i.ONE,i.ONE);break;case Tl:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case bl:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",N);break}else switch(N){case Hi:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Ps:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Tl:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case bl:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",N);break}S=null,T=null,P=null,w=null,R.set(0,0,0),I=0,m=N,y=rt}return}ce=ce||ae,ne=ne||ge,Ie=Ie||Ce,(ae!==p||ce!==x)&&(i.blendEquationSeparate(De[ae],De[ce]),p=ae,x=ce),(ge!==S||Ce!==T||ne!==P||Ie!==w)&&(i.blendFuncSeparate(A[ge],A[Ce],A[ne],A[Ie]),S=ge,T=Ce,P=ne,w=Ie),(Je.equals(R)===!1||dt!==I)&&(i.blendColor(Je.r,Je.g,Je.b,dt),R.copy(Je),I=dt),m=N,y=!1}function Q(N,ae){N.side===ln?_e(i.CULL_FACE):ee(i.CULL_FACE);let ge=N.side===Xt;ae&&(ge=!ge),j(ge),N.blending===Hi&&N.transparent===!1?te(Dt):te(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.blendColor,N.blendAlpha,N.premultipliedAlpha),o.setFunc(N.depthFunc),o.setTest(N.depthTest),o.setMask(N.depthWrite),r.setMask(N.colorWrite);const Ce=N.stencilWrite;a.setTest(Ce),Ce&&(a.setMask(N.stencilWriteMask),a.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),a.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),re(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?ee(i.SAMPLE_ALPHA_TO_COVERAGE):_e(i.SAMPLE_ALPHA_TO_COVERAGE)}function j(N){M!==N&&(N?i.frontFace(i.CW):i.frontFace(i.CCW),M=N)}function $(N){N!==ah?(ee(i.CULL_FACE),N!==C&&(N===El?i.cullFace(i.BACK):N===lh?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):_e(i.CULL_FACE),C=N}function pe(N){N!==F&&(U&&i.lineWidth(N),F=N)}function re(N,ae,ge){N?(ee(i.POLYGON_OFFSET_FILL),(H!==ae||X!==ge)&&(i.polygonOffset(ae,ge),H=ae,X=ge)):_e(i.POLYGON_OFFSET_FILL)}function me(N){N?ee(i.SCISSOR_TEST):_e(i.SCISSOR_TEST)}function Ge(N){N===void 0&&(N=i.TEXTURE0+L-1),J!==N&&(i.activeTexture(N),J=N)}function Fe(N,ae,ge){ge===void 0&&(J===null?ge=i.TEXTURE0+L-1:ge=J);let Ce=se[ge];Ce===void 0&&(Ce={type:void 0,texture:void 0},se[ge]=Ce),(Ce.type!==N||Ce.texture!==ae)&&(J!==ge&&(i.activeTexture(ge),J=ge),i.bindTexture(N,ae||Y[N]),Ce.type=N,Ce.texture=ae)}function b(){const N=se[J];N!==void 0&&N.type!==void 0&&(i.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}function v(){try{i.compressedTexImage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function k(){try{i.compressedTexImage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Z(){try{i.texSubImage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function ie(){try{i.texSubImage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function K(){try{i.compressedTexSubImage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function we(){try{i.compressedTexSubImage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function ue(){try{i.texStorage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function be(){try{i.texStorage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Re(){try{i.texImage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function le(){try{i.texImage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function ye(N){Be.equals(N)===!1&&(i.scissor(N.x,N.y,N.z,N.w),Be.copy(N))}function He(N){ze.equals(N)===!1&&(i.viewport(N.x,N.y,N.z,N.w),ze.copy(N))}function Le(N,ae){let ge=l.get(ae);ge===void 0&&(ge=new WeakMap,l.set(ae,ge));let Ce=ge.get(N);Ce===void 0&&(Ce=i.getUniformBlockIndex(ae,N.name),ge.set(N,Ce))}function xe(N,ae){const Ce=l.get(ae).get(N);c.get(ae)!==Ce&&(i.uniformBlockBinding(ae,Ce,N.__bindingPointIndex),c.set(ae,Ce))}function Xe(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),u={},J=null,se={},h={},d=new WeakMap,f=[],g=null,_=!1,m=null,p=null,S=null,T=null,x=null,P=null,w=null,R=new Ke(0,0,0),I=0,y=!1,M=null,C=null,F=null,H=null,X=null,Be.set(0,0,i.canvas.width,i.canvas.height),ze.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:ee,disable:_e,bindFramebuffer:Se,drawBuffers:ve,useProgram:Ne,setBlending:te,setMaterial:Q,setFlipSided:j,setCullFace:$,setLineWidth:pe,setPolygonOffset:re,setScissorTest:me,activeTexture:Ge,bindTexture:Fe,unbindTexture:b,compressedTexImage2D:v,compressedTexImage3D:k,texImage2D:Re,texImage3D:le,updateUBOMapping:Le,uniformBlockBinding:xe,texStorage2D:ue,texStorage3D:be,texSubImage2D:Z,texSubImage3D:ie,compressedTexSubImage2D:K,compressedTexSubImage3D:we,scissor:ye,viewport:He,reset:Xe}}function Ug(i,e,t,n,s,r,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new oe,u=new WeakMap;let h;const d=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(b,v){return f?new OffscreenCanvas(b,v):Fr("canvas")}function _(b,v,k){let Z=1;const ie=Fe(b);if((ie.width>k||ie.height>k)&&(Z=k/Math.max(ie.width,ie.height)),Z<1)if(typeof HTMLImageElement<"u"&&b instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&b instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&b instanceof ImageBitmap||typeof VideoFrame<"u"&&b instanceof VideoFrame){const K=Math.floor(Z*ie.width),we=Math.floor(Z*ie.height);h===void 0&&(h=g(K,we));const ue=v?g(K,we):h;return ue.width=K,ue.height=we,ue.getContext("2d").drawImage(b,0,0,K,we),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+ie.width+"x"+ie.height+") to ("+K+"x"+we+")."),ue}else return"data"in b&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+ie.width+"x"+ie.height+")."),b;return b}function m(b){return b.generateMipmaps}function p(b){i.generateMipmap(b)}function S(b){return b.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:b.isWebGL3DRenderTarget?i.TEXTURE_3D:b.isWebGLArrayRenderTarget||b.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function T(b,v,k,Z,ie=!1){if(b!==null){if(i[b]!==void 0)return i[b];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+b+"'")}let K=v;if(v===i.RED&&(k===i.FLOAT&&(K=i.R32F),k===i.HALF_FLOAT&&(K=i.R16F),k===i.UNSIGNED_BYTE&&(K=i.R8)),v===i.RED_INTEGER&&(k===i.UNSIGNED_BYTE&&(K=i.R8UI),k===i.UNSIGNED_SHORT&&(K=i.R16UI),k===i.UNSIGNED_INT&&(K=i.R32UI),k===i.BYTE&&(K=i.R8I),k===i.SHORT&&(K=i.R16I),k===i.INT&&(K=i.R32I)),v===i.RG&&(k===i.FLOAT&&(K=i.RG32F),k===i.HALF_FLOAT&&(K=i.RG16F),k===i.UNSIGNED_BYTE&&(K=i.RG8)),v===i.RG_INTEGER&&(k===i.UNSIGNED_BYTE&&(K=i.RG8UI),k===i.UNSIGNED_SHORT&&(K=i.RG16UI),k===i.UNSIGNED_INT&&(K=i.RG32UI),k===i.BYTE&&(K=i.RG8I),k===i.SHORT&&(K=i.RG16I),k===i.INT&&(K=i.RG32I)),v===i.RGB_INTEGER&&(k===i.UNSIGNED_BYTE&&(K=i.RGB8UI),k===i.UNSIGNED_SHORT&&(K=i.RGB16UI),k===i.UNSIGNED_INT&&(K=i.RGB32UI),k===i.BYTE&&(K=i.RGB8I),k===i.SHORT&&(K=i.RGB16I),k===i.INT&&(K=i.RGB32I)),v===i.RGBA_INTEGER&&(k===i.UNSIGNED_BYTE&&(K=i.RGBA8UI),k===i.UNSIGNED_SHORT&&(K=i.RGBA16UI),k===i.UNSIGNED_INT&&(K=i.RGBA32UI),k===i.BYTE&&(K=i.RGBA8I),k===i.SHORT&&(K=i.RGBA16I),k===i.INT&&(K=i.RGBA32I)),v===i.RGB&&(k===i.UNSIGNED_INT_5_9_9_9_REV&&(K=i.RGB9_E5),k===i.UNSIGNED_INT_10F_11F_11F_REV&&(K=i.R11F_G11F_B10F)),v===i.RGBA){const we=ie?Lr:tt.getTransfer(Z);k===i.FLOAT&&(K=i.RGBA32F),k===i.HALF_FLOAT&&(K=i.RGBA16F),k===i.UNSIGNED_BYTE&&(K=we===ot?i.SRGB8_ALPHA8:i.RGBA8),k===i.UNSIGNED_SHORT_4_4_4_4&&(K=i.RGBA4),k===i.UNSIGNED_SHORT_5_5_5_1&&(K=i.RGB5_A1)}return(K===i.R16F||K===i.R32F||K===i.RG16F||K===i.RG32F||K===i.RGBA16F||K===i.RGBA32F)&&e.get("EXT_color_buffer_float"),K}function x(b,v){let k;return b?v===null||v===mi||v===Yi?k=i.DEPTH24_STENCIL8:v===Mn?k=i.DEPTH32F_STENCIL8:v===Ds&&(k=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):v===null||v===mi||v===Yi?k=i.DEPTH_COMPONENT24:v===Mn?k=i.DEPTH_COMPONENT32F:v===Ds&&(k=i.DEPTH_COMPONENT16),k}function P(b,v){return m(b)===!0||b.isFramebufferTexture&&b.minFilter!==kt&&b.minFilter!==hn?Math.log2(Math.max(v.width,v.height))+1:b.mipmaps!==void 0&&b.mipmaps.length>0?b.mipmaps.length:b.isCompressedTexture&&Array.isArray(b.image)?v.mipmaps.length:1}function w(b){const v=b.target;v.removeEventListener("dispose",w),I(v),v.isVideoTexture&&u.delete(v)}function R(b){const v=b.target;v.removeEventListener("dispose",R),M(v)}function I(b){const v=n.get(b);if(v.__webglInit===void 0)return;const k=b.source,Z=d.get(k);if(Z){const ie=Z[v.__cacheKey];ie.usedTimes--,ie.usedTimes===0&&y(b),Object.keys(Z).length===0&&d.delete(k)}n.remove(b)}function y(b){const v=n.get(b);i.deleteTexture(v.__webglTexture);const k=b.source,Z=d.get(k);delete Z[v.__cacheKey],o.memory.textures--}function M(b){const v=n.get(b);if(b.depthTexture&&(b.depthTexture.dispose(),n.remove(b.depthTexture)),b.isWebGLCubeRenderTarget)for(let Z=0;Z<6;Z++){if(Array.isArray(v.__webglFramebuffer[Z]))for(let ie=0;ie<v.__webglFramebuffer[Z].length;ie++)i.deleteFramebuffer(v.__webglFramebuffer[Z][ie]);else i.deleteFramebuffer(v.__webglFramebuffer[Z]);v.__webglDepthbuffer&&i.deleteRenderbuffer(v.__webglDepthbuffer[Z])}else{if(Array.isArray(v.__webglFramebuffer))for(let Z=0;Z<v.__webglFramebuffer.length;Z++)i.deleteFramebuffer(v.__webglFramebuffer[Z]);else i.deleteFramebuffer(v.__webglFramebuffer);if(v.__webglDepthbuffer&&i.deleteRenderbuffer(v.__webglDepthbuffer),v.__webglMultisampledFramebuffer&&i.deleteFramebuffer(v.__webglMultisampledFramebuffer),v.__webglColorRenderbuffer)for(let Z=0;Z<v.__webglColorRenderbuffer.length;Z++)v.__webglColorRenderbuffer[Z]&&i.deleteRenderbuffer(v.__webglColorRenderbuffer[Z]);v.__webglDepthRenderbuffer&&i.deleteRenderbuffer(v.__webglDepthRenderbuffer)}const k=b.textures;for(let Z=0,ie=k.length;Z<ie;Z++){const K=n.get(k[Z]);K.__webglTexture&&(i.deleteTexture(K.__webglTexture),o.memory.textures--),n.remove(k[Z])}n.remove(b)}let C=0;function F(){C=0}function H(){const b=C;return b>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+b+" texture units while this GPU supports only "+s.maxTextures),C+=1,b}function X(b){const v=[];return v.push(b.wrapS),v.push(b.wrapT),v.push(b.wrapR||0),v.push(b.magFilter),v.push(b.minFilter),v.push(b.anisotropy),v.push(b.internalFormat),v.push(b.format),v.push(b.type),v.push(b.generateMipmaps),v.push(b.premultiplyAlpha),v.push(b.flipY),v.push(b.unpackAlignment),v.push(b.colorSpace),v.join()}function L(b,v){const k=n.get(b);if(b.isVideoTexture&&me(b),b.isRenderTargetTexture===!1&&b.isExternalTexture!==!0&&b.version>0&&k.__version!==b.version){const Z=b.image;if(Z===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(Z.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{Y(k,b,v);return}}else b.isExternalTexture&&(k.__webglTexture=b.sourceTexture?b.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,k.__webglTexture,i.TEXTURE0+v)}function U(b,v){const k=n.get(b);if(b.isRenderTargetTexture===!1&&b.version>0&&k.__version!==b.version){Y(k,b,v);return}t.bindTexture(i.TEXTURE_2D_ARRAY,k.__webglTexture,i.TEXTURE0+v)}function V(b,v){const k=n.get(b);if(b.isRenderTargetTexture===!1&&b.version>0&&k.__version!==b.version){Y(k,b,v);return}t.bindTexture(i.TEXTURE_3D,k.__webglTexture,i.TEXTURE0+v)}function G(b,v){const k=n.get(b);if(b.version>0&&k.__version!==b.version){ee(k,b,v);return}t.bindTexture(i.TEXTURE_CUBE_MAP,k.__webglTexture,i.TEXTURE0+v)}const J={[Un]:i.REPEAT,[di]:i.CLAMP_TO_EDGE,[Qo]:i.MIRRORED_REPEAT},se={[kt]:i.NEAREST,[Ah]:i.NEAREST_MIPMAP_NEAREST,[Zs]:i.NEAREST_MIPMAP_LINEAR,[hn]:i.LINEAR,[Kr]:i.LINEAR_MIPMAP_NEAREST,[qn]:i.LINEAR_MIPMAP_LINEAR},de={[Dh]:i.NEVER,[Oh]:i.ALWAYS,[Ih]:i.LESS,[hu]:i.LEQUAL,[Lh]:i.EQUAL,[Fh]:i.GEQUAL,[Uh]:i.GREATER,[Nh]:i.NOTEQUAL};function Te(b,v){if(v.type===Mn&&e.has("OES_texture_float_linear")===!1&&(v.magFilter===hn||v.magFilter===Kr||v.magFilter===Zs||v.magFilter===qn||v.minFilter===hn||v.minFilter===Kr||v.minFilter===Zs||v.minFilter===qn)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(b,i.TEXTURE_WRAP_S,J[v.wrapS]),i.texParameteri(b,i.TEXTURE_WRAP_T,J[v.wrapT]),(b===i.TEXTURE_3D||b===i.TEXTURE_2D_ARRAY)&&i.texParameteri(b,i.TEXTURE_WRAP_R,J[v.wrapR]),i.texParameteri(b,i.TEXTURE_MAG_FILTER,se[v.magFilter]),i.texParameteri(b,i.TEXTURE_MIN_FILTER,se[v.minFilter]),v.compareFunction&&(i.texParameteri(b,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(b,i.TEXTURE_COMPARE_FUNC,de[v.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(v.magFilter===kt||v.minFilter!==Zs&&v.minFilter!==qn||v.type===Mn&&e.has("OES_texture_float_linear")===!1)return;if(v.anisotropy>1||n.get(v).__currentAnisotropy){const k=e.get("EXT_texture_filter_anisotropic");i.texParameterf(b,k.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(v.anisotropy,s.getMaxAnisotropy())),n.get(v).__currentAnisotropy=v.anisotropy}}}function Be(b,v){let k=!1;b.__webglInit===void 0&&(b.__webglInit=!0,v.addEventListener("dispose",w));const Z=v.source;let ie=d.get(Z);ie===void 0&&(ie={},d.set(Z,ie));const K=X(v);if(K!==b.__cacheKey){ie[K]===void 0&&(ie[K]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,k=!0),ie[K].usedTimes++;const we=ie[b.__cacheKey];we!==void 0&&(ie[b.__cacheKey].usedTimes--,we.usedTimes===0&&y(v)),b.__cacheKey=K,b.__webglTexture=ie[K].texture}return k}function ze(b,v,k){return Math.floor(Math.floor(b/k)/v)}function Ve(b,v,k,Z){const K=b.updateRanges;if(K.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,v.width,v.height,k,Z,v.data);else{K.sort((le,ye)=>le.start-ye.start);let we=0;for(let le=1;le<K.length;le++){const ye=K[we],He=K[le],Le=ye.start+ye.count,xe=ze(He.start,v.width,4),Xe=ze(ye.start,v.width,4);He.start<=Le+1&&xe===Xe&&ze(He.start+He.count-1,v.width,4)===xe?ye.count=Math.max(ye.count,He.start+He.count-ye.start):(++we,K[we]=He)}K.length=we+1;const ue=i.getParameter(i.UNPACK_ROW_LENGTH),be=i.getParameter(i.UNPACK_SKIP_PIXELS),Re=i.getParameter(i.UNPACK_SKIP_ROWS);i.pixelStorei(i.UNPACK_ROW_LENGTH,v.width);for(let le=0,ye=K.length;le<ye;le++){const He=K[le],Le=Math.floor(He.start/4),xe=Math.ceil(He.count/4),Xe=Le%v.width,N=Math.floor(Le/v.width),ae=xe,ge=1;i.pixelStorei(i.UNPACK_SKIP_PIXELS,Xe),i.pixelStorei(i.UNPACK_SKIP_ROWS,N),t.texSubImage2D(i.TEXTURE_2D,0,Xe,N,ae,ge,k,Z,v.data)}b.clearUpdateRanges(),i.pixelStorei(i.UNPACK_ROW_LENGTH,ue),i.pixelStorei(i.UNPACK_SKIP_PIXELS,be),i.pixelStorei(i.UNPACK_SKIP_ROWS,Re)}}function Y(b,v,k){let Z=i.TEXTURE_2D;(v.isDataArrayTexture||v.isCompressedArrayTexture)&&(Z=i.TEXTURE_2D_ARRAY),v.isData3DTexture&&(Z=i.TEXTURE_3D);const ie=Be(b,v),K=v.source;t.bindTexture(Z,b.__webglTexture,i.TEXTURE0+k);const we=n.get(K);if(K.version!==we.__version||ie===!0){t.activeTexture(i.TEXTURE0+k);const ue=tt.getPrimaries(tt.workingColorSpace),be=v.colorSpace===Wn?null:tt.getPrimaries(v.colorSpace),Re=v.colorSpace===Wn||ue===be?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,v.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,v.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Re);let le=_(v.image,!1,s.maxTextureSize);le=Ge(v,le);const ye=r.convert(v.format,v.colorSpace),He=r.convert(v.type);let Le=T(v.internalFormat,ye,He,v.colorSpace,v.isVideoTexture);Te(Z,v);let xe;const Xe=v.mipmaps,N=v.isVideoTexture!==!0,ae=we.__version===void 0||ie===!0,ge=K.dataReady,Ce=P(v,le);if(v.isDepthTexture)Le=x(v.format===Zi,v.type),ae&&(N?t.texStorage2D(i.TEXTURE_2D,1,Le,le.width,le.height):t.texImage2D(i.TEXTURE_2D,0,Le,le.width,le.height,0,ye,He,null));else if(v.isDataTexture)if(Xe.length>0){N&&ae&&t.texStorage2D(i.TEXTURE_2D,Ce,Le,Xe[0].width,Xe[0].height);for(let ce=0,ne=Xe.length;ce<ne;ce++)xe=Xe[ce],N?ge&&t.texSubImage2D(i.TEXTURE_2D,ce,0,0,xe.width,xe.height,ye,He,xe.data):t.texImage2D(i.TEXTURE_2D,ce,Le,xe.width,xe.height,0,ye,He,xe.data);v.generateMipmaps=!1}else N?(ae&&t.texStorage2D(i.TEXTURE_2D,Ce,Le,le.width,le.height),ge&&Ve(v,le,ye,He)):t.texImage2D(i.TEXTURE_2D,0,Le,le.width,le.height,0,ye,He,le.data);else if(v.isCompressedTexture)if(v.isCompressedArrayTexture){N&&ae&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Ce,Le,Xe[0].width,Xe[0].height,le.depth);for(let ce=0,ne=Xe.length;ce<ne;ce++)if(xe=Xe[ce],v.format!==tn)if(ye!==null)if(N){if(ge)if(v.layerUpdates.size>0){const Ie=oc(xe.width,xe.height,v.format,v.type);for(const Je of v.layerUpdates){const dt=xe.data.subarray(Je*Ie/xe.data.BYTES_PER_ELEMENT,(Je+1)*Ie/xe.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ce,0,0,Je,xe.width,xe.height,1,ye,dt)}v.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ce,0,0,0,xe.width,xe.height,le.depth,ye,xe.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,ce,Le,xe.width,xe.height,le.depth,0,xe.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else N?ge&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,ce,0,0,0,xe.width,xe.height,le.depth,ye,He,xe.data):t.texImage3D(i.TEXTURE_2D_ARRAY,ce,Le,xe.width,xe.height,le.depth,0,ye,He,xe.data)}else{N&&ae&&t.texStorage2D(i.TEXTURE_2D,Ce,Le,Xe[0].width,Xe[0].height);for(let ce=0,ne=Xe.length;ce<ne;ce++)xe=Xe[ce],v.format!==tn?ye!==null?N?ge&&t.compressedTexSubImage2D(i.TEXTURE_2D,ce,0,0,xe.width,xe.height,ye,xe.data):t.compressedTexImage2D(i.TEXTURE_2D,ce,Le,xe.width,xe.height,0,xe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):N?ge&&t.texSubImage2D(i.TEXTURE_2D,ce,0,0,xe.width,xe.height,ye,He,xe.data):t.texImage2D(i.TEXTURE_2D,ce,Le,xe.width,xe.height,0,ye,He,xe.data)}else if(v.isDataArrayTexture)if(N){if(ae&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Ce,Le,le.width,le.height,le.depth),ge)if(v.layerUpdates.size>0){const ce=oc(le.width,le.height,v.format,v.type);for(const ne of v.layerUpdates){const Ie=le.data.subarray(ne*ce/le.data.BYTES_PER_ELEMENT,(ne+1)*ce/le.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,ne,le.width,le.height,1,ye,He,Ie)}v.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,le.width,le.height,le.depth,ye,He,le.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,Le,le.width,le.height,le.depth,0,ye,He,le.data);else if(v.isData3DTexture)N?(ae&&t.texStorage3D(i.TEXTURE_3D,Ce,Le,le.width,le.height,le.depth),ge&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,le.width,le.height,le.depth,ye,He,le.data)):t.texImage3D(i.TEXTURE_3D,0,Le,le.width,le.height,le.depth,0,ye,He,le.data);else if(v.isFramebufferTexture){if(ae)if(N)t.texStorage2D(i.TEXTURE_2D,Ce,Le,le.width,le.height);else{let ce=le.width,ne=le.height;for(let Ie=0;Ie<Ce;Ie++)t.texImage2D(i.TEXTURE_2D,Ie,Le,ce,ne,0,ye,He,null),ce>>=1,ne>>=1}}else if(Xe.length>0){if(N&&ae){const ce=Fe(Xe[0]);t.texStorage2D(i.TEXTURE_2D,Ce,Le,ce.width,ce.height)}for(let ce=0,ne=Xe.length;ce<ne;ce++)xe=Xe[ce],N?ge&&t.texSubImage2D(i.TEXTURE_2D,ce,0,0,ye,He,xe):t.texImage2D(i.TEXTURE_2D,ce,Le,ye,He,xe);v.generateMipmaps=!1}else if(N){if(ae){const ce=Fe(le);t.texStorage2D(i.TEXTURE_2D,Ce,Le,ce.width,ce.height)}ge&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,ye,He,le)}else t.texImage2D(i.TEXTURE_2D,0,Le,ye,He,le);m(v)&&p(Z),we.__version=K.version,v.onUpdate&&v.onUpdate(v)}b.__version=v.version}function ee(b,v,k){if(v.image.length!==6)return;const Z=Be(b,v),ie=v.source;t.bindTexture(i.TEXTURE_CUBE_MAP,b.__webglTexture,i.TEXTURE0+k);const K=n.get(ie);if(ie.version!==K.__version||Z===!0){t.activeTexture(i.TEXTURE0+k);const we=tt.getPrimaries(tt.workingColorSpace),ue=v.colorSpace===Wn?null:tt.getPrimaries(v.colorSpace),be=v.colorSpace===Wn||we===ue?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,v.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,v.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,be);const Re=v.isCompressedTexture||v.image[0].isCompressedTexture,le=v.image[0]&&v.image[0].isDataTexture,ye=[];for(let ne=0;ne<6;ne++)!Re&&!le?ye[ne]=_(v.image[ne],!0,s.maxCubemapSize):ye[ne]=le?v.image[ne].image:v.image[ne],ye[ne]=Ge(v,ye[ne]);const He=ye[0],Le=r.convert(v.format,v.colorSpace),xe=r.convert(v.type),Xe=T(v.internalFormat,Le,xe,v.colorSpace),N=v.isVideoTexture!==!0,ae=K.__version===void 0||Z===!0,ge=ie.dataReady;let Ce=P(v,He);Te(i.TEXTURE_CUBE_MAP,v);let ce;if(Re){N&&ae&&t.texStorage2D(i.TEXTURE_CUBE_MAP,Ce,Xe,He.width,He.height);for(let ne=0;ne<6;ne++){ce=ye[ne].mipmaps;for(let Ie=0;Ie<ce.length;Ie++){const Je=ce[Ie];v.format!==tn?Le!==null?N?ge&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,Ie,0,0,Je.width,Je.height,Le,Je.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,Ie,Xe,Je.width,Je.height,0,Je.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):N?ge&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,Ie,0,0,Je.width,Je.height,Le,xe,Je.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,Ie,Xe,Je.width,Je.height,0,Le,xe,Je.data)}}}else{if(ce=v.mipmaps,N&&ae){ce.length>0&&Ce++;const ne=Fe(ye[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,Ce,Xe,ne.width,ne.height)}for(let ne=0;ne<6;ne++)if(le){N?ge&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,0,0,0,ye[ne].width,ye[ne].height,Le,xe,ye[ne].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,0,Xe,ye[ne].width,ye[ne].height,0,Le,xe,ye[ne].data);for(let Ie=0;Ie<ce.length;Ie++){const dt=ce[Ie].image[ne].image;N?ge&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,Ie+1,0,0,dt.width,dt.height,Le,xe,dt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,Ie+1,Xe,dt.width,dt.height,0,Le,xe,dt.data)}}else{N?ge&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,0,0,0,Le,xe,ye[ne]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,0,Xe,Le,xe,ye[ne]);for(let Ie=0;Ie<ce.length;Ie++){const Je=ce[Ie];N?ge&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,Ie+1,0,0,Le,xe,Je.image[ne]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ne,Ie+1,Xe,Le,xe,Je.image[ne])}}}m(v)&&p(i.TEXTURE_CUBE_MAP),K.__version=ie.version,v.onUpdate&&v.onUpdate(v)}b.__version=v.version}function _e(b,v,k,Z,ie,K){const we=r.convert(k.format,k.colorSpace),ue=r.convert(k.type),be=T(k.internalFormat,we,ue,k.colorSpace),Re=n.get(v),le=n.get(k);if(le.__renderTarget=v,!Re.__hasExternalTextures){const ye=Math.max(1,v.width>>K),He=Math.max(1,v.height>>K);ie===i.TEXTURE_3D||ie===i.TEXTURE_2D_ARRAY?t.texImage3D(ie,K,be,ye,He,v.depth,0,we,ue,null):t.texImage2D(ie,K,be,ye,He,0,we,ue,null)}t.bindFramebuffer(i.FRAMEBUFFER,b),re(v)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Z,ie,le.__webglTexture,0,pe(v)):(ie===i.TEXTURE_2D||ie>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&ie<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,Z,ie,le.__webglTexture,K),t.bindFramebuffer(i.FRAMEBUFFER,null)}function Se(b,v,k){if(i.bindRenderbuffer(i.RENDERBUFFER,b),v.depthBuffer){const Z=v.depthTexture,ie=Z&&Z.isDepthTexture?Z.type:null,K=x(v.stencilBuffer,ie),we=v.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ue=pe(v);re(v)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,ue,K,v.width,v.height):k?i.renderbufferStorageMultisample(i.RENDERBUFFER,ue,K,v.width,v.height):i.renderbufferStorage(i.RENDERBUFFER,K,v.width,v.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,we,i.RENDERBUFFER,b)}else{const Z=v.textures;for(let ie=0;ie<Z.length;ie++){const K=Z[ie],we=r.convert(K.format,K.colorSpace),ue=r.convert(K.type),be=T(K.internalFormat,we,ue,K.colorSpace),Re=pe(v);k&&re(v)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,Re,be,v.width,v.height):re(v)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Re,be,v.width,v.height):i.renderbufferStorage(i.RENDERBUFFER,be,v.width,v.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function ve(b,v){if(v&&v.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(i.FRAMEBUFFER,b),!(v.depthTexture&&v.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const Z=n.get(v.depthTexture);Z.__renderTarget=v,(!Z.__webglTexture||v.depthTexture.image.width!==v.width||v.depthTexture.image.height!==v.height)&&(v.depthTexture.image.width=v.width,v.depthTexture.image.height=v.height,v.depthTexture.needsUpdate=!0),L(v.depthTexture,0);const ie=Z.__webglTexture,K=pe(v);if(v.depthTexture.format===Is)re(v)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,ie,0,K):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,ie,0);else if(v.depthTexture.format===Zi)re(v)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,ie,0,K):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,ie,0);else throw new Error("Unknown depthTexture format")}function Ne(b){const v=n.get(b),k=b.isWebGLCubeRenderTarget===!0;if(v.__boundDepthTexture!==b.depthTexture){const Z=b.depthTexture;if(v.__depthDisposeCallback&&v.__depthDisposeCallback(),Z){const ie=()=>{delete v.__boundDepthTexture,delete v.__depthDisposeCallback,Z.removeEventListener("dispose",ie)};Z.addEventListener("dispose",ie),v.__depthDisposeCallback=ie}v.__boundDepthTexture=Z}if(b.depthTexture&&!v.__autoAllocateDepthBuffer){if(k)throw new Error("target.depthTexture not supported in Cube render targets");const Z=b.texture.mipmaps;Z&&Z.length>0?ve(v.__webglFramebuffer[0],b):ve(v.__webglFramebuffer,b)}else if(k){v.__webglDepthbuffer=[];for(let Z=0;Z<6;Z++)if(t.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer[Z]),v.__webglDepthbuffer[Z]===void 0)v.__webglDepthbuffer[Z]=i.createRenderbuffer(),Se(v.__webglDepthbuffer[Z],b,!1);else{const ie=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,K=v.__webglDepthbuffer[Z];i.bindRenderbuffer(i.RENDERBUFFER,K),i.framebufferRenderbuffer(i.FRAMEBUFFER,ie,i.RENDERBUFFER,K)}}else{const Z=b.texture.mipmaps;if(Z&&Z.length>0?t.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer),v.__webglDepthbuffer===void 0)v.__webglDepthbuffer=i.createRenderbuffer(),Se(v.__webglDepthbuffer,b,!1);else{const ie=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,K=v.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,K),i.framebufferRenderbuffer(i.FRAMEBUFFER,ie,i.RENDERBUFFER,K)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function De(b,v,k){const Z=n.get(b);v!==void 0&&_e(Z.__webglFramebuffer,b,b.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),k!==void 0&&Ne(b)}function A(b){const v=b.texture,k=n.get(b),Z=n.get(v);b.addEventListener("dispose",R);const ie=b.textures,K=b.isWebGLCubeRenderTarget===!0,we=ie.length>1;if(we||(Z.__webglTexture===void 0&&(Z.__webglTexture=i.createTexture()),Z.__version=v.version,o.memory.textures++),K){k.__webglFramebuffer=[];for(let ue=0;ue<6;ue++)if(v.mipmaps&&v.mipmaps.length>0){k.__webglFramebuffer[ue]=[];for(let be=0;be<v.mipmaps.length;be++)k.__webglFramebuffer[ue][be]=i.createFramebuffer()}else k.__webglFramebuffer[ue]=i.createFramebuffer()}else{if(v.mipmaps&&v.mipmaps.length>0){k.__webglFramebuffer=[];for(let ue=0;ue<v.mipmaps.length;ue++)k.__webglFramebuffer[ue]=i.createFramebuffer()}else k.__webglFramebuffer=i.createFramebuffer();if(we)for(let ue=0,be=ie.length;ue<be;ue++){const Re=n.get(ie[ue]);Re.__webglTexture===void 0&&(Re.__webglTexture=i.createTexture(),o.memory.textures++)}if(b.samples>0&&re(b)===!1){k.__webglMultisampledFramebuffer=i.createFramebuffer(),k.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,k.__webglMultisampledFramebuffer);for(let ue=0;ue<ie.length;ue++){const be=ie[ue];k.__webglColorRenderbuffer[ue]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,k.__webglColorRenderbuffer[ue]);const Re=r.convert(be.format,be.colorSpace),le=r.convert(be.type),ye=T(be.internalFormat,Re,le,be.colorSpace,b.isXRRenderTarget===!0),He=pe(b);i.renderbufferStorageMultisample(i.RENDERBUFFER,He,ye,b.width,b.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ue,i.RENDERBUFFER,k.__webglColorRenderbuffer[ue])}i.bindRenderbuffer(i.RENDERBUFFER,null),b.depthBuffer&&(k.__webglDepthRenderbuffer=i.createRenderbuffer(),Se(k.__webglDepthRenderbuffer,b,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(K){t.bindTexture(i.TEXTURE_CUBE_MAP,Z.__webglTexture),Te(i.TEXTURE_CUBE_MAP,v);for(let ue=0;ue<6;ue++)if(v.mipmaps&&v.mipmaps.length>0)for(let be=0;be<v.mipmaps.length;be++)_e(k.__webglFramebuffer[ue][be],b,v,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ue,be);else _e(k.__webglFramebuffer[ue],b,v,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ue,0);m(v)&&p(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(we){for(let ue=0,be=ie.length;ue<be;ue++){const Re=ie[ue],le=n.get(Re);let ye=i.TEXTURE_2D;(b.isWebGL3DRenderTarget||b.isWebGLArrayRenderTarget)&&(ye=b.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ye,le.__webglTexture),Te(ye,Re),_e(k.__webglFramebuffer,b,Re,i.COLOR_ATTACHMENT0+ue,ye,0),m(Re)&&p(ye)}t.unbindTexture()}else{let ue=i.TEXTURE_2D;if((b.isWebGL3DRenderTarget||b.isWebGLArrayRenderTarget)&&(ue=b.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ue,Z.__webglTexture),Te(ue,v),v.mipmaps&&v.mipmaps.length>0)for(let be=0;be<v.mipmaps.length;be++)_e(k.__webglFramebuffer[be],b,v,i.COLOR_ATTACHMENT0,ue,be);else _e(k.__webglFramebuffer,b,v,i.COLOR_ATTACHMENT0,ue,0);m(v)&&p(ue),t.unbindTexture()}b.depthBuffer&&Ne(b)}function te(b){const v=b.textures;for(let k=0,Z=v.length;k<Z;k++){const ie=v[k];if(m(ie)){const K=S(b),we=n.get(ie).__webglTexture;t.bindTexture(K,we),p(K),t.unbindTexture()}}}const Q=[],j=[];function $(b){if(b.samples>0){if(re(b)===!1){const v=b.textures,k=b.width,Z=b.height;let ie=i.COLOR_BUFFER_BIT;const K=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,we=n.get(b),ue=v.length>1;if(ue)for(let Re=0;Re<v.length;Re++)t.bindFramebuffer(i.FRAMEBUFFER,we.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Re,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,we.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Re,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,we.__webglMultisampledFramebuffer);const be=b.texture.mipmaps;be&&be.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,we.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,we.__webglFramebuffer);for(let Re=0;Re<v.length;Re++){if(b.resolveDepthBuffer&&(b.depthBuffer&&(ie|=i.DEPTH_BUFFER_BIT),b.stencilBuffer&&b.resolveStencilBuffer&&(ie|=i.STENCIL_BUFFER_BIT)),ue){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,we.__webglColorRenderbuffer[Re]);const le=n.get(v[Re]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,le,0)}i.blitFramebuffer(0,0,k,Z,0,0,k,Z,ie,i.NEAREST),c===!0&&(Q.length=0,j.length=0,Q.push(i.COLOR_ATTACHMENT0+Re),b.depthBuffer&&b.resolveDepthBuffer===!1&&(Q.push(K),j.push(K),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,j)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Q))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),ue)for(let Re=0;Re<v.length;Re++){t.bindFramebuffer(i.FRAMEBUFFER,we.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Re,i.RENDERBUFFER,we.__webglColorRenderbuffer[Re]);const le=n.get(v[Re]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,we.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Re,i.TEXTURE_2D,le,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,we.__webglMultisampledFramebuffer)}else if(b.depthBuffer&&b.resolveDepthBuffer===!1&&c){const v=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[v])}}}function pe(b){return Math.min(s.maxSamples,b.samples)}function re(b){const v=n.get(b);return b.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&v.__useRenderToTexture!==!1}function me(b){const v=o.render.frame;u.get(b)!==v&&(u.set(b,v),b.update())}function Ge(b,v){const k=b.colorSpace,Z=b.format,ie=b.type;return b.isCompressedTexture===!0||b.isVideoTexture===!0||k!==Ki&&k!==Wn&&(tt.getTransfer(k)===ot?(Z!==tn||ie!==pn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",k)),v}function Fe(b){return typeof HTMLImageElement<"u"&&b instanceof HTMLImageElement?(l.width=b.naturalWidth||b.width,l.height=b.naturalHeight||b.height):typeof VideoFrame<"u"&&b instanceof VideoFrame?(l.width=b.displayWidth,l.height=b.displayHeight):(l.width=b.width,l.height=b.height),l}this.allocateTextureUnit=H,this.resetTextureUnits=F,this.setTexture2D=L,this.setTexture2DArray=U,this.setTexture3D=V,this.setTextureCube=G,this.rebindTextures=De,this.setupRenderTarget=A,this.updateRenderTargetMipmap=te,this.updateMultisampleRenderTarget=$,this.setupDepthRenderbuffer=Ne,this.setupFrameBufferTexture=_e,this.useMultisampledRTT=re}function Ng(i,e){function t(n,s=Wn){let r;const o=tt.getTransfer(s);if(n===pn)return i.UNSIGNED_BYTE;if(n===Ha)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Ga)return i.UNSIGNED_SHORT_5_5_5_1;if(n===ou)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===au)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===su)return i.BYTE;if(n===ru)return i.SHORT;if(n===Ds)return i.UNSIGNED_SHORT;if(n===Va)return i.INT;if(n===mi)return i.UNSIGNED_INT;if(n===Mn)return i.FLOAT;if(n===fn)return i.HALF_FLOAT;if(n===lu)return i.ALPHA;if(n===cu)return i.RGB;if(n===tn)return i.RGBA;if(n===Is)return i.DEPTH_COMPONENT;if(n===Zi)return i.DEPTH_STENCIL;if(n===Wa)return i.RED;if(n===Xa)return i.RED_INTEGER;if(n===uu)return i.RG;if(n===qa)return i.RG_INTEGER;if(n===Ya)return i.RGBA_INTEGER;if(n===Cr||n===Rr||n===Pr||n===Dr)if(o===ot)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Cr)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Rr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Pr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Dr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Cr)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Rr)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Pr)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Dr)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===ea||n===ta||n===na||n===ia)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===ea)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===ta)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===na)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===ia)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===sa||n===ra||n===oa)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===sa||n===ra)return o===ot?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===oa)return o===ot?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===aa||n===la||n===ca||n===ua||n===ha||n===da||n===fa||n===pa||n===ma||n===ga||n===_a||n===va||n===xa||n===Ma)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===aa)return o===ot?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===la)return o===ot?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===ca)return o===ot?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===ua)return o===ot?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===ha)return o===ot?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===da)return o===ot?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===fa)return o===ot?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===pa)return o===ot?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===ma)return o===ot?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===ga)return o===ot?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===_a)return o===ot?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===va)return o===ot?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===xa)return o===ot?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Ma)return o===ot?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Sa||n===ya||n===Ea)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===Sa)return o===ot?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===ya)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Ea)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Ta||n===ba||n===wa||n===Aa)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===Ta)return r.COMPRESSED_RED_RGTC1_EXT;if(n===ba)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===wa)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Aa)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Yi?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}const Fg=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Og=`
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

}`;class Bg{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new yu(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new Mt({vertexShader:Fg,fragmentShader:Og,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new st(new dn(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class zg extends rs{constructor(e,t){super();const n=this;let s=null,r=1,o=null,a="local-floor",c=1,l=null,u=null,h=null,d=null,f=null,g=null;const _=typeof XRWebGLBinding<"u",m=new Bg,p={},S=t.getContextAttributes();let T=null,x=null;const P=[],w=[],R=new oe;let I=null;const y=new zt;y.viewport=new lt;const M=new zt;M.viewport=new lt;const C=[y,M],F=new rf;let H=null,X=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Y){let ee=P[Y];return ee===void 0&&(ee=new xo,P[Y]=ee),ee.getTargetRaySpace()},this.getControllerGrip=function(Y){let ee=P[Y];return ee===void 0&&(ee=new xo,P[Y]=ee),ee.getGripSpace()},this.getHand=function(Y){let ee=P[Y];return ee===void 0&&(ee=new xo,P[Y]=ee),ee.getHandSpace()};function L(Y){const ee=w.indexOf(Y.inputSource);if(ee===-1)return;const _e=P[ee];_e!==void 0&&(_e.update(Y.inputSource,Y.frame,l||o),_e.dispatchEvent({type:Y.type,data:Y.inputSource}))}function U(){s.removeEventListener("select",L),s.removeEventListener("selectstart",L),s.removeEventListener("selectend",L),s.removeEventListener("squeeze",L),s.removeEventListener("squeezestart",L),s.removeEventListener("squeezeend",L),s.removeEventListener("end",U),s.removeEventListener("inputsourceschange",V);for(let Y=0;Y<P.length;Y++){const ee=w[Y];ee!==null&&(w[Y]=null,P[Y].disconnect(ee))}H=null,X=null,m.reset();for(const Y in p)delete p[Y];e.setRenderTarget(T),f=null,d=null,h=null,s=null,x=null,Ve.stop(),n.isPresenting=!1,e.setPixelRatio(I),e.setSize(R.width,R.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Y){r=Y,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Y){a=Y,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function(Y){l=Y},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return h===null&&_&&(h=new XRWebGLBinding(s,t)),h},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(Y){if(s=Y,s!==null){if(T=e.getRenderTarget(),s.addEventListener("select",L),s.addEventListener("selectstart",L),s.addEventListener("selectend",L),s.addEventListener("squeeze",L),s.addEventListener("squeezestart",L),s.addEventListener("squeezeend",L),s.addEventListener("end",U),s.addEventListener("inputsourceschange",V),S.xrCompatible!==!0&&await t.makeXRCompatible(),I=e.getPixelRatio(),e.getSize(R),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let _e=null,Se=null,ve=null;S.depth&&(ve=S.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,_e=S.stencil?Zi:Is,Se=S.stencil?Yi:mi);const Ne={colorFormat:t.RGBA8,depthFormat:ve,scaleFactor:r};h=this.getBinding(),d=h.createProjectionLayer(Ne),s.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),x=new Jt(d.textureWidth,d.textureHeight,{format:tn,type:pn,depthTexture:new nl(d.textureWidth,d.textureHeight,Se,void 0,void 0,void 0,void 0,void 0,void 0,_e),stencilBuffer:S.stencil,colorSpace:e.outputColorSpace,samples:S.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{const _e={antialias:S.antialias,alpha:!0,depth:S.depth,stencil:S.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,t,_e),s.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),x=new Jt(f.framebufferWidth,f.framebufferHeight,{format:tn,type:pn,colorSpace:e.outputColorSpace,stencilBuffer:S.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}x.isXRRenderTarget=!0,this.setFoveation(c),l=null,o=await s.requestReferenceSpace(a),Ve.setContext(s),Ve.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function V(Y){for(let ee=0;ee<Y.removed.length;ee++){const _e=Y.removed[ee],Se=w.indexOf(_e);Se>=0&&(w[Se]=null,P[Se].disconnect(_e))}for(let ee=0;ee<Y.added.length;ee++){const _e=Y.added[ee];let Se=w.indexOf(_e);if(Se===-1){for(let Ne=0;Ne<P.length;Ne++)if(Ne>=w.length){w.push(_e),Se=Ne;break}else if(w[Ne]===null){w[Ne]=_e,Se=Ne;break}if(Se===-1)break}const ve=P[Se];ve&&ve.connect(_e)}}const G=new D,J=new D;function se(Y,ee,_e){G.setFromMatrixPosition(ee.matrixWorld),J.setFromMatrixPosition(_e.matrixWorld);const Se=G.distanceTo(J),ve=ee.projectionMatrix.elements,Ne=_e.projectionMatrix.elements,De=ve[14]/(ve[10]-1),A=ve[14]/(ve[10]+1),te=(ve[9]+1)/ve[5],Q=(ve[9]-1)/ve[5],j=(ve[8]-1)/ve[0],$=(Ne[8]+1)/Ne[0],pe=De*j,re=De*$,me=Se/(-j+$),Ge=me*-j;if(ee.matrixWorld.decompose(Y.position,Y.quaternion,Y.scale),Y.translateX(Ge),Y.translateZ(me),Y.matrixWorld.compose(Y.position,Y.quaternion,Y.scale),Y.matrixWorldInverse.copy(Y.matrixWorld).invert(),ve[10]===-1)Y.projectionMatrix.copy(ee.projectionMatrix),Y.projectionMatrixInverse.copy(ee.projectionMatrixInverse);else{const Fe=De+me,b=A+me,v=pe-Ge,k=re+(Se-Ge),Z=te*A/b*Fe,ie=Q*A/b*Fe;Y.projectionMatrix.makePerspective(v,k,Z,ie,Fe,b),Y.projectionMatrixInverse.copy(Y.projectionMatrix).invert()}}function de(Y,ee){ee===null?Y.matrixWorld.copy(Y.matrix):Y.matrixWorld.multiplyMatrices(ee.matrixWorld,Y.matrix),Y.matrixWorldInverse.copy(Y.matrixWorld).invert()}this.updateCamera=function(Y){if(s===null)return;let ee=Y.near,_e=Y.far;m.texture!==null&&(m.depthNear>0&&(ee=m.depthNear),m.depthFar>0&&(_e=m.depthFar)),F.near=M.near=y.near=ee,F.far=M.far=y.far=_e,(H!==F.near||X!==F.far)&&(s.updateRenderState({depthNear:F.near,depthFar:F.far}),H=F.near,X=F.far),F.layers.mask=Y.layers.mask|6,y.layers.mask=F.layers.mask&3,M.layers.mask=F.layers.mask&5;const Se=Y.parent,ve=F.cameras;de(F,Se);for(let Ne=0;Ne<ve.length;Ne++)de(ve[Ne],Se);ve.length===2?se(F,y,M):F.projectionMatrix.copy(y.projectionMatrix),Te(Y,F,Se)};function Te(Y,ee,_e){_e===null?Y.matrix.copy(ee.matrixWorld):(Y.matrix.copy(_e.matrixWorld),Y.matrix.invert(),Y.matrix.multiply(ee.matrixWorld)),Y.matrix.decompose(Y.position,Y.quaternion,Y.scale),Y.updateMatrixWorld(!0),Y.projectionMatrix.copy(ee.projectionMatrix),Y.projectionMatrixInverse.copy(ee.projectionMatrixInverse),Y.isPerspectiveCamera&&(Y.fov=Nr*2*Math.atan(1/Y.projectionMatrix.elements[5]),Y.zoom=1)}this.getCamera=function(){return F},this.getFoveation=function(){if(!(d===null&&f===null))return c},this.setFoveation=function(Y){c=Y,d!==null&&(d.fixedFoveation=Y),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=Y)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(F)},this.getCameraTexture=function(Y){return p[Y]};let Be=null;function ze(Y,ee){if(u=ee.getViewerPose(l||o),g=ee,u!==null){const _e=u.views;f!==null&&(e.setRenderTargetFramebuffer(x,f.framebuffer),e.setRenderTarget(x));let Se=!1;_e.length!==F.cameras.length&&(F.cameras.length=0,Se=!0);for(let A=0;A<_e.length;A++){const te=_e[A];let Q=null;if(f!==null)Q=f.getViewport(te);else{const $=h.getViewSubImage(d,te);Q=$.viewport,A===0&&(e.setRenderTargetTextures(x,$.colorTexture,$.depthStencilTexture),e.setRenderTarget(x))}let j=C[A];j===void 0&&(j=new zt,j.layers.enable(A),j.viewport=new lt,C[A]=j),j.matrix.fromArray(te.transform.matrix),j.matrix.decompose(j.position,j.quaternion,j.scale),j.projectionMatrix.fromArray(te.projectionMatrix),j.projectionMatrixInverse.copy(j.projectionMatrix).invert(),j.viewport.set(Q.x,Q.y,Q.width,Q.height),A===0&&(F.matrix.copy(j.matrix),F.matrix.decompose(F.position,F.quaternion,F.scale)),Se===!0&&F.cameras.push(j)}const ve=s.enabledFeatures;if(ve&&ve.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&_){h=n.getBinding();const A=h.getDepthInformation(_e[0]);A&&A.isValid&&A.texture&&m.init(A,s.renderState)}if(ve&&ve.includes("camera-access")&&_){e.state.unbindTexture(),h=n.getBinding();for(let A=0;A<_e.length;A++){const te=_e[A].camera;if(te){let Q=p[te];Q||(Q=new yu,p[te]=Q);const j=h.getCameraImage(te);Q.sourceTexture=j}}}}for(let _e=0;_e<P.length;_e++){const Se=w[_e],ve=P[_e];Se!==null&&ve!==void 0&&ve.update(Se,ee,l||o)}Be&&Be(Y,ee),ee.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:ee}),g=null}const Ve=new Nu;Ve.setAnimationLoop(ze),this.setAnimationLoop=function(Y){Be=Y},this.dispose=function(){}}}const ai=new mn,kg=new nt;function Vg(i,e){function t(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,_u(i)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function s(m,p,S,T,x){p.isMeshBasicMaterial||p.isMeshLambertMaterial?r(m,p):p.isMeshToonMaterial?(r(m,p),h(m,p)):p.isMeshPhongMaterial?(r(m,p),u(m,p)):p.isMeshStandardMaterial?(r(m,p),d(m,p),p.isMeshPhysicalMaterial&&f(m,p,x)):p.isMeshMatcapMaterial?(r(m,p),g(m,p)):p.isMeshDepthMaterial?r(m,p):p.isMeshDistanceMaterial?(r(m,p),_(m,p)):p.isMeshNormalMaterial?r(m,p):p.isLineBasicMaterial?(o(m,p),p.isLineDashedMaterial&&a(m,p)):p.isPointsMaterial?c(m,p,S,T):p.isSpriteMaterial?l(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,t(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===Xt&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,t(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===Xt&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,t(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,t(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const S=e.get(p),T=S.envMap,x=S.envMapRotation;T&&(m.envMap.value=T,ai.copy(x),ai.x*=-1,ai.y*=-1,ai.z*=-1,T.isCubeTexture&&T.isRenderTargetTexture===!1&&(ai.y*=-1,ai.z*=-1),m.envMapRotation.value.setFromMatrix4(kg.makeRotationFromEuler(ai)),m.flipEnvMap.value=T.isCubeTexture&&T.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,m.aoMapTransform))}function o(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform))}function a(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function c(m,p,S,T){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*S,m.scale.value=T*.5,p.map&&(m.map.value=p.map,t(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function l(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function u(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function h(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function d(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function f(m,p,S){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Xt&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=S.texture,m.transmissionSamplerSize.value.set(S.width,S.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function _(m,p){const S=e.get(p).light;m.referencePosition.value.setFromMatrixPosition(S.matrixWorld),m.nearDistance.value=S.shadow.camera.near,m.farDistance.value=S.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function Hg(i,e,t,n){let s={},r={},o=[];const a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function c(S,T){const x=T.program;n.uniformBlockBinding(S,x)}function l(S,T){let x=s[S.id];x===void 0&&(g(S),x=u(S),s[S.id]=x,S.addEventListener("dispose",m));const P=T.program;n.updateUBOMapping(S,P);const w=e.render.frame;r[S.id]!==w&&(d(S),r[S.id]=w)}function u(S){const T=h();S.__bindingPointIndex=T;const x=i.createBuffer(),P=S.__size,w=S.usage;return i.bindBuffer(i.UNIFORM_BUFFER,x),i.bufferData(i.UNIFORM_BUFFER,P,w),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,T,x),x}function h(){for(let S=0;S<a;S++)if(o.indexOf(S)===-1)return o.push(S),S;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(S){const T=s[S.id],x=S.uniforms,P=S.__cache;i.bindBuffer(i.UNIFORM_BUFFER,T);for(let w=0,R=x.length;w<R;w++){const I=Array.isArray(x[w])?x[w]:[x[w]];for(let y=0,M=I.length;y<M;y++){const C=I[y];if(f(C,w,y,P)===!0){const F=C.__offset,H=Array.isArray(C.value)?C.value:[C.value];let X=0;for(let L=0;L<H.length;L++){const U=H[L],V=_(U);typeof U=="number"||typeof U=="boolean"?(C.__data[0]=U,i.bufferSubData(i.UNIFORM_BUFFER,F+X,C.__data)):U.isMatrix3?(C.__data[0]=U.elements[0],C.__data[1]=U.elements[1],C.__data[2]=U.elements[2],C.__data[3]=0,C.__data[4]=U.elements[3],C.__data[5]=U.elements[4],C.__data[6]=U.elements[5],C.__data[7]=0,C.__data[8]=U.elements[6],C.__data[9]=U.elements[7],C.__data[10]=U.elements[8],C.__data[11]=0):(U.toArray(C.__data,X),X+=V.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,F,C.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(S,T,x,P){const w=S.value,R=T+"_"+x;if(P[R]===void 0)return typeof w=="number"||typeof w=="boolean"?P[R]=w:P[R]=w.clone(),!0;{const I=P[R];if(typeof w=="number"||typeof w=="boolean"){if(I!==w)return P[R]=w,!0}else if(I.equals(w)===!1)return I.copy(w),!0}return!1}function g(S){const T=S.uniforms;let x=0;const P=16;for(let R=0,I=T.length;R<I;R++){const y=Array.isArray(T[R])?T[R]:[T[R]];for(let M=0,C=y.length;M<C;M++){const F=y[M],H=Array.isArray(F.value)?F.value:[F.value];for(let X=0,L=H.length;X<L;X++){const U=H[X],V=_(U),G=x%P,J=G%V.boundary,se=G+J;x+=J,se!==0&&P-se<V.storage&&(x+=P-se),F.__data=new Float32Array(V.storage/Float32Array.BYTES_PER_ELEMENT),F.__offset=x,x+=V.storage}}}const w=x%P;return w>0&&(x+=P-w),S.__size=x,S.__cache={},this}function _(S){const T={boundary:0,storage:0};return typeof S=="number"||typeof S=="boolean"?(T.boundary=4,T.storage=4):S.isVector2?(T.boundary=8,T.storage=8):S.isVector3||S.isColor?(T.boundary=16,T.storage=12):S.isVector4?(T.boundary=16,T.storage=16):S.isMatrix3?(T.boundary=48,T.storage=48):S.isMatrix4?(T.boundary=64,T.storage=64):S.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",S),T}function m(S){const T=S.target;T.removeEventListener("dispose",m);const x=o.indexOf(T.__bindingPointIndex);o.splice(x,1),i.deleteBuffer(s[T.id]),delete s[T.id],delete r[T.id]}function p(){for(const S in s)i.deleteBuffer(s[S]);o=[],s={},r={}}return{bind:c,update:l,dispose:p}}class Gg{constructor(e={}){const{canvas:t=zh(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:h=!1,reversedDepthBuffer:d=!1}=e;this.isWebGLRenderer=!0;let f;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=n.getContextAttributes().alpha}else f=o;const g=new Uint32Array(4),_=new Int32Array(4);let m=null,p=null;const S=[],T=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Yn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const x=this;let P=!1;this._outputColorSpace=Rt;let w=0,R=0,I=null,y=-1,M=null;const C=new lt,F=new lt;let H=null;const X=new Ke(0);let L=0,U=t.width,V=t.height,G=1,J=null,se=null;const de=new lt(0,0,U,V),Te=new lt(0,0,U,V);let Be=!1;const ze=new el;let Ve=!1,Y=!1;const ee=new nt,_e=new D,Se=new lt,ve={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Ne=!1;function De(){return I===null?G:1}let A=n;function te(E,B){return t.getContext(E,B)}try{const E={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:u,failIfMajorPerformanceCaveat:h};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${za}`),t.addEventListener("webglcontextlost",ge,!1),t.addEventListener("webglcontextrestored",Ce,!1),t.addEventListener("webglcontextcreationerror",ce,!1),A===null){const B="webgl2";if(A=te(B,E),A===null)throw te(B)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(E){throw console.error("THREE.WebGLRenderer: "+E.message),E}let Q,j,$,pe,re,me,Ge,Fe,b,v,k,Z,ie,K,we,ue,be,Re,le,ye,He,Le,xe,Xe;function N(){Q=new Q0(A),Q.init(),Le=new Ng(A,Q),j=new q0(A,Q,e,Le),$=new Lg(A,Q),j.reversedDepthBuffer&&d&&$.buffers.depth.setReversed(!0),pe=new nm(A),re=new Mg,me=new Ug(A,Q,$,re,j,Le,pe),Ge=new Z0(x),Fe=new $0(x),b=new lf(A),xe=new W0(A,b),v=new em(A,b,pe,xe),k=new sm(A,v,b,pe),le=new im(A,j,me),ue=new Y0(re),Z=new xg(x,Ge,Fe,Q,j,xe,ue),ie=new Vg(x,re),K=new yg,we=new Cg(Q),Re=new G0(x,Ge,Fe,$,k,f,c),be=new Dg(x,k,j),Xe=new Hg(A,pe,j,$),ye=new X0(A,Q,pe),He=new tm(A,Q,pe),pe.programs=Z.programs,x.capabilities=j,x.extensions=Q,x.properties=re,x.renderLists=K,x.shadowMap=be,x.state=$,x.info=pe}N();const ae=new zg(x,A);this.xr=ae,this.getContext=function(){return A},this.getContextAttributes=function(){return A.getContextAttributes()},this.forceContextLoss=function(){const E=Q.get("WEBGL_lose_context");E&&E.loseContext()},this.forceContextRestore=function(){const E=Q.get("WEBGL_lose_context");E&&E.restoreContext()},this.getPixelRatio=function(){return G},this.setPixelRatio=function(E){E!==void 0&&(G=E,this.setSize(U,V,!1))},this.getSize=function(E){return E.set(U,V)},this.setSize=function(E,B,W=!0){if(ae.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}U=E,V=B,t.width=Math.floor(E*G),t.height=Math.floor(B*G),W===!0&&(t.style.width=E+"px",t.style.height=B+"px"),this.setViewport(0,0,E,B)},this.getDrawingBufferSize=function(E){return E.set(U*G,V*G).floor()},this.setDrawingBufferSize=function(E,B,W){U=E,V=B,G=W,t.width=Math.floor(E*W),t.height=Math.floor(B*W),this.setViewport(0,0,E,B)},this.getCurrentViewport=function(E){return E.copy(C)},this.getViewport=function(E){return E.copy(de)},this.setViewport=function(E,B,W,q){E.isVector4?de.set(E.x,E.y,E.z,E.w):de.set(E,B,W,q),$.viewport(C.copy(de).multiplyScalar(G).round())},this.getScissor=function(E){return E.copy(Te)},this.setScissor=function(E,B,W,q){E.isVector4?Te.set(E.x,E.y,E.z,E.w):Te.set(E,B,W,q),$.scissor(F.copy(Te).multiplyScalar(G).round())},this.getScissorTest=function(){return Be},this.setScissorTest=function(E){$.setScissorTest(Be=E)},this.setOpaqueSort=function(E){J=E},this.setTransparentSort=function(E){se=E},this.getClearColor=function(E){return E.copy(Re.getClearColor())},this.setClearColor=function(){Re.setClearColor(...arguments)},this.getClearAlpha=function(){return Re.getClearAlpha()},this.setClearAlpha=function(){Re.setClearAlpha(...arguments)},this.clear=function(E=!0,B=!0,W=!0){let q=0;if(E){let z=!1;if(I!==null){const he=I.texture.format;z=he===Ya||he===qa||he===Xa}if(z){const he=I.texture.type,Ee=he===pn||he===mi||he===Ds||he===Yi||he===Ha||he===Ga,Pe=Re.getClearColor(),Ae=Re.getClearAlpha(),We=Pe.r,qe=Pe.g,Oe=Pe.b;Ee?(g[0]=We,g[1]=qe,g[2]=Oe,g[3]=Ae,A.clearBufferuiv(A.COLOR,0,g)):(_[0]=We,_[1]=qe,_[2]=Oe,_[3]=Ae,A.clearBufferiv(A.COLOR,0,_))}else q|=A.COLOR_BUFFER_BIT}B&&(q|=A.DEPTH_BUFFER_BIT),W&&(q|=A.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),A.clear(q)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",ge,!1),t.removeEventListener("webglcontextrestored",Ce,!1),t.removeEventListener("webglcontextcreationerror",ce,!1),Re.dispose(),K.dispose(),we.dispose(),re.dispose(),Ge.dispose(),Fe.dispose(),k.dispose(),xe.dispose(),Xe.dispose(),Z.dispose(),ae.dispose(),ae.removeEventListener("sessionstart",gn),ae.removeEventListener("sessionend",_l),ei.stop()};function ge(E){E.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),P=!0}function Ce(){console.log("THREE.WebGLRenderer: Context Restored."),P=!1;const E=pe.autoReset,B=be.enabled,W=be.autoUpdate,q=be.needsUpdate,z=be.type;N(),pe.autoReset=E,be.enabled=B,be.autoUpdate=W,be.needsUpdate=q,be.type=z}function ce(E){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",E.statusMessage)}function ne(E){const B=E.target;B.removeEventListener("dispose",ne),Ie(B)}function Ie(E){Je(E),re.remove(E)}function Je(E){const B=re.get(E).programs;B!==void 0&&(B.forEach(function(W){Z.releaseProgram(W)}),E.isShaderMaterial&&Z.releaseShaderCache(E))}this.renderBufferDirect=function(E,B,W,q,z,he){B===null&&(B=ve);const Ee=z.isMesh&&z.matrixWorld.determinant()<0,Pe=th(E,B,W,q,z);$.setMaterial(q,Ee);let Ae=W.index,We=1;if(q.wireframe===!0){if(Ae=v.getWireframeAttribute(W),Ae===void 0)return;We=2}const qe=W.drawRange,Oe=W.attributes.position;let et=qe.start*We,at=(qe.start+qe.count)*We;he!==null&&(et=Math.max(et,he.start*We),at=Math.min(at,(he.start+he.count)*We)),Ae!==null?(et=Math.max(et,0),at=Math.min(at,Ae.count)):Oe!=null&&(et=Math.max(et,0),at=Math.min(at,Oe.count));const xt=at-et;if(xt<0||xt===1/0)return;xe.setup(z,q,Pe,W,Ae);let ft,ut=ye;if(Ae!==null&&(ft=b.get(Ae),ut=He,ut.setIndex(ft)),z.isMesh)q.wireframe===!0?($.setLineWidth(q.wireframeLinewidth*De()),ut.setMode(A.LINES)):ut.setMode(A.TRIANGLES);else if(z.isLine){let ke=q.linewidth;ke===void 0&&(ke=1),$.setLineWidth(ke*De()),z.isLineSegments?ut.setMode(A.LINES):z.isLineLoop?ut.setMode(A.LINE_LOOP):ut.setMode(A.LINE_STRIP)}else z.isPoints?ut.setMode(A.POINTS):z.isSprite&&ut.setMode(A.TRIANGLES);if(z.isBatchedMesh)if(z._multiDrawInstances!==null)Ls("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),ut.renderMultiDrawInstances(z._multiDrawStarts,z._multiDrawCounts,z._multiDrawCount,z._multiDrawInstances);else if(Q.get("WEBGL_multi_draw"))ut.renderMultiDraw(z._multiDrawStarts,z._multiDrawCounts,z._multiDrawCount);else{const ke=z._multiDrawStarts,gt=z._multiDrawCounts,it=z._multiDrawCount,qt=Ae?b.get(Ae).bytesPerElement:1,Si=re.get(q).currentProgram.getUniforms();for(let Yt=0;Yt<it;Yt++)Si.setValue(A,"_gl_DrawID",Yt),ut.render(ke[Yt]/qt,gt[Yt])}else if(z.isInstancedMesh)ut.renderInstances(et,xt,z.count);else if(W.isInstancedBufferGeometry){const ke=W._maxInstanceCount!==void 0?W._maxInstanceCount:1/0,gt=Math.min(W.instanceCount,ke);ut.renderInstances(et,xt,gt)}else ut.render(et,xt)};function dt(E,B,W){E.transparent===!0&&E.side===ln&&E.forceSinglePass===!1?(E.side=Xt,E.needsUpdate=!0,Ys(E,B,W),E.side=Kn,E.needsUpdate=!0,Ys(E,B,W),E.side=ln):Ys(E,B,W)}this.compile=function(E,B,W=null){W===null&&(W=E),p=we.get(W),p.init(B),T.push(p),W.traverseVisible(function(z){z.isLight&&z.layers.test(B.layers)&&(p.pushLight(z),z.castShadow&&p.pushShadow(z))}),E!==W&&E.traverseVisible(function(z){z.isLight&&z.layers.test(B.layers)&&(p.pushLight(z),z.castShadow&&p.pushShadow(z))}),p.setupLights();const q=new Set;return E.traverse(function(z){if(!(z.isMesh||z.isPoints||z.isLine||z.isSprite))return;const he=z.material;if(he)if(Array.isArray(he))for(let Ee=0;Ee<he.length;Ee++){const Pe=he[Ee];dt(Pe,W,z),q.add(Pe)}else dt(he,W,z),q.add(he)}),p=T.pop(),q},this.compileAsync=function(E,B,W=null){const q=this.compile(E,B,W);return new Promise(z=>{function he(){if(q.forEach(function(Ee){re.get(Ee).currentProgram.isReady()&&q.delete(Ee)}),q.size===0){z(E);return}setTimeout(he,10)}Q.get("KHR_parallel_shader_compile")!==null?he():setTimeout(he,10)})};let rt=null;function Tn(E){rt&&rt(E)}function gn(){ei.stop()}function _l(){ei.start()}const ei=new Nu;ei.setAnimationLoop(Tn),typeof self<"u"&&ei.setContext(self),this.setAnimationLoop=function(E){rt=E,ae.setAnimationLoop(E),E===null?ei.stop():ei.start()},ae.addEventListener("sessionstart",gn),ae.addEventListener("sessionend",_l),this.render=function(E,B){if(B!==void 0&&B.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(P===!0)return;if(E.matrixWorldAutoUpdate===!0&&E.updateMatrixWorld(),B.parent===null&&B.matrixWorldAutoUpdate===!0&&B.updateMatrixWorld(),ae.enabled===!0&&ae.isPresenting===!0&&(ae.cameraAutoUpdate===!0&&ae.updateCamera(B),B=ae.getCamera()),E.isScene===!0&&E.onBeforeRender(x,E,B,I),p=we.get(E,T.length),p.init(B),T.push(p),ee.multiplyMatrices(B.projectionMatrix,B.matrixWorldInverse),ze.setFromProjectionMatrix(ee,Sn,B.reversedDepth),Y=this.localClippingEnabled,Ve=ue.init(this.clippingPlanes,Y),m=K.get(E,S.length),m.init(),S.push(m),ae.enabled===!0&&ae.isPresenting===!0){const he=x.xr.getDepthSensingMesh();he!==null&&Yr(he,B,-1/0,x.sortObjects)}Yr(E,B,0,x.sortObjects),m.finish(),x.sortObjects===!0&&m.sort(J,se),Ne=ae.enabled===!1||ae.isPresenting===!1||ae.hasDepthSensing()===!1,Ne&&Re.addToRenderList(m,E),this.info.render.frame++,Ve===!0&&ue.beginShadows();const W=p.state.shadowsArray;be.render(W,E,B),Ve===!0&&ue.endShadows(),this.info.autoReset===!0&&this.info.reset();const q=m.opaque,z=m.transmissive;if(p.setupLights(),B.isArrayCamera){const he=B.cameras;if(z.length>0)for(let Ee=0,Pe=he.length;Ee<Pe;Ee++){const Ae=he[Ee];xl(q,z,E,Ae)}Ne&&Re.render(E);for(let Ee=0,Pe=he.length;Ee<Pe;Ee++){const Ae=he[Ee];vl(m,E,Ae,Ae.viewport)}}else z.length>0&&xl(q,z,E,B),Ne&&Re.render(E),vl(m,E,B);I!==null&&R===0&&(me.updateMultisampleRenderTarget(I),me.updateRenderTargetMipmap(I)),E.isScene===!0&&E.onAfterRender(x,E,B),xe.resetDefaultState(),y=-1,M=null,T.pop(),T.length>0?(p=T[T.length-1],Ve===!0&&ue.setGlobalState(x.clippingPlanes,p.state.camera)):p=null,S.pop(),S.length>0?m=S[S.length-1]:m=null};function Yr(E,B,W,q){if(E.visible===!1)return;if(E.layers.test(B.layers)){if(E.isGroup)W=E.renderOrder;else if(E.isLOD)E.autoUpdate===!0&&E.update(B);else if(E.isLight)p.pushLight(E),E.castShadow&&p.pushShadow(E);else if(E.isSprite){if(!E.frustumCulled||ze.intersectsSprite(E)){q&&Se.setFromMatrixPosition(E.matrixWorld).applyMatrix4(ee);const Ee=k.update(E),Pe=E.material;Pe.visible&&m.push(E,Ee,Pe,W,Se.z,null)}}else if((E.isMesh||E.isLine||E.isPoints)&&(!E.frustumCulled||ze.intersectsObject(E))){const Ee=k.update(E),Pe=E.material;if(q&&(E.boundingSphere!==void 0?(E.boundingSphere===null&&E.computeBoundingSphere(),Se.copy(E.boundingSphere.center)):(Ee.boundingSphere===null&&Ee.computeBoundingSphere(),Se.copy(Ee.boundingSphere.center)),Se.applyMatrix4(E.matrixWorld).applyMatrix4(ee)),Array.isArray(Pe)){const Ae=Ee.groups;for(let We=0,qe=Ae.length;We<qe;We++){const Oe=Ae[We],et=Pe[Oe.materialIndex];et&&et.visible&&m.push(E,Ee,et,W,Se.z,Oe)}}else Pe.visible&&m.push(E,Ee,Pe,W,Se.z,null)}}const he=E.children;for(let Ee=0,Pe=he.length;Ee<Pe;Ee++)Yr(he[Ee],B,W,q)}function vl(E,B,W,q){const z=E.opaque,he=E.transmissive,Ee=E.transparent;p.setupLightsView(W),Ve===!0&&ue.setGlobalState(x.clippingPlanes,W),q&&$.viewport(C.copy(q)),z.length>0&&qs(z,B,W),he.length>0&&qs(he,B,W),Ee.length>0&&qs(Ee,B,W),$.buffers.depth.setTest(!0),$.buffers.depth.setMask(!0),$.buffers.color.setMask(!0),$.setPolygonOffset(!1)}function xl(E,B,W,q){if((W.isScene===!0?W.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[q.id]===void 0&&(p.state.transmissionRenderTarget[q.id]=new Jt(1,1,{generateMipmaps:!0,type:Q.has("EXT_color_buffer_half_float")||Q.has("EXT_color_buffer_float")?fn:pn,minFilter:qn,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:tt.workingColorSpace}));const he=p.state.transmissionRenderTarget[q.id],Ee=q.viewport||C;he.setSize(Ee.z*x.transmissionResolutionScale,Ee.w*x.transmissionResolutionScale);const Pe=x.getRenderTarget(),Ae=x.getActiveCubeFace(),We=x.getActiveMipmapLevel();x.setRenderTarget(he),x.getClearColor(X),L=x.getClearAlpha(),L<1&&x.setClearColor(16777215,.5),x.clear(),Ne&&Re.render(W);const qe=x.toneMapping;x.toneMapping=Yn;const Oe=q.viewport;if(q.viewport!==void 0&&(q.viewport=void 0),p.setupLightsView(q),Ve===!0&&ue.setGlobalState(x.clippingPlanes,q),qs(E,W,q),me.updateMultisampleRenderTarget(he),me.updateRenderTargetMipmap(he),Q.has("WEBGL_multisampled_render_to_texture")===!1){let et=!1;for(let at=0,xt=B.length;at<xt;at++){const ft=B[at],ut=ft.object,ke=ft.geometry,gt=ft.material,it=ft.group;if(gt.side===ln&&ut.layers.test(q.layers)){const qt=gt.side;gt.side=Xt,gt.needsUpdate=!0,Ml(ut,W,q,ke,gt,it),gt.side=qt,gt.needsUpdate=!0,et=!0}}et===!0&&(me.updateMultisampleRenderTarget(he),me.updateRenderTargetMipmap(he))}x.setRenderTarget(Pe,Ae,We),x.setClearColor(X,L),Oe!==void 0&&(q.viewport=Oe),x.toneMapping=qe}function qs(E,B,W){const q=B.isScene===!0?B.overrideMaterial:null;for(let z=0,he=E.length;z<he;z++){const Ee=E[z],Pe=Ee.object,Ae=Ee.geometry,We=Ee.group;let qe=Ee.material;qe.allowOverride===!0&&q!==null&&(qe=q),Pe.layers.test(W.layers)&&Ml(Pe,B,W,Ae,qe,We)}}function Ml(E,B,W,q,z,he){E.onBeforeRender(x,B,W,q,z,he),E.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,E.matrixWorld),E.normalMatrix.getNormalMatrix(E.modelViewMatrix),z.onBeforeRender(x,B,W,q,E,he),z.transparent===!0&&z.side===ln&&z.forceSinglePass===!1?(z.side=Xt,z.needsUpdate=!0,x.renderBufferDirect(W,B,q,z,E,he),z.side=Kn,z.needsUpdate=!0,x.renderBufferDirect(W,B,q,z,E,he),z.side=ln):x.renderBufferDirect(W,B,q,z,E,he),E.onAfterRender(x,B,W,q,z,he)}function Ys(E,B,W){B.isScene!==!0&&(B=ve);const q=re.get(E),z=p.state.lights,he=p.state.shadowsArray,Ee=z.state.version,Pe=Z.getParameters(E,z.state,he,B,W),Ae=Z.getProgramCacheKey(Pe);let We=q.programs;q.environment=E.isMeshStandardMaterial?B.environment:null,q.fog=B.fog,q.envMap=(E.isMeshStandardMaterial?Fe:Ge).get(E.envMap||q.environment),q.envMapRotation=q.environment!==null&&E.envMap===null?B.environmentRotation:E.envMapRotation,We===void 0&&(E.addEventListener("dispose",ne),We=new Map,q.programs=We);let qe=We.get(Ae);if(qe!==void 0){if(q.currentProgram===qe&&q.lightsStateVersion===Ee)return yl(E,Pe),qe}else Pe.uniforms=Z.getUniforms(E),E.onBeforeCompile(Pe,x),qe=Z.acquireProgram(Pe,Ae),We.set(Ae,qe),q.uniforms=Pe.uniforms;const Oe=q.uniforms;return(!E.isShaderMaterial&&!E.isRawShaderMaterial||E.clipping===!0)&&(Oe.clippingPlanes=ue.uniform),yl(E,Pe),q.needsLights=ih(E),q.lightsStateVersion=Ee,q.needsLights&&(Oe.ambientLightColor.value=z.state.ambient,Oe.lightProbe.value=z.state.probe,Oe.directionalLights.value=z.state.directional,Oe.directionalLightShadows.value=z.state.directionalShadow,Oe.spotLights.value=z.state.spot,Oe.spotLightShadows.value=z.state.spotShadow,Oe.rectAreaLights.value=z.state.rectArea,Oe.ltc_1.value=z.state.rectAreaLTC1,Oe.ltc_2.value=z.state.rectAreaLTC2,Oe.pointLights.value=z.state.point,Oe.pointLightShadows.value=z.state.pointShadow,Oe.hemisphereLights.value=z.state.hemi,Oe.directionalShadowMap.value=z.state.directionalShadowMap,Oe.directionalShadowMatrix.value=z.state.directionalShadowMatrix,Oe.spotShadowMap.value=z.state.spotShadowMap,Oe.spotLightMatrix.value=z.state.spotLightMatrix,Oe.spotLightMap.value=z.state.spotLightMap,Oe.pointShadowMap.value=z.state.pointShadowMap,Oe.pointShadowMatrix.value=z.state.pointShadowMatrix),q.currentProgram=qe,q.uniformsList=null,qe}function Sl(E){if(E.uniformsList===null){const B=E.currentProgram.getUniforms();E.uniformsList=Ir.seqWithValue(B.seq,E.uniforms)}return E.uniformsList}function yl(E,B){const W=re.get(E);W.outputColorSpace=B.outputColorSpace,W.batching=B.batching,W.batchingColor=B.batchingColor,W.instancing=B.instancing,W.instancingColor=B.instancingColor,W.instancingMorph=B.instancingMorph,W.skinning=B.skinning,W.morphTargets=B.morphTargets,W.morphNormals=B.morphNormals,W.morphColors=B.morphColors,W.morphTargetsCount=B.morphTargetsCount,W.numClippingPlanes=B.numClippingPlanes,W.numIntersection=B.numClipIntersection,W.vertexAlphas=B.vertexAlphas,W.vertexTangents=B.vertexTangents,W.toneMapping=B.toneMapping}function th(E,B,W,q,z){B.isScene!==!0&&(B=ve),me.resetTextureUnits();const he=B.fog,Ee=q.isMeshStandardMaterial?B.environment:null,Pe=I===null?x.outputColorSpace:I.isXRRenderTarget===!0?I.texture.colorSpace:Ki,Ae=(q.isMeshStandardMaterial?Fe:Ge).get(q.envMap||Ee),We=q.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,qe=!!W.attributes.tangent&&(!!q.normalMap||q.anisotropy>0),Oe=!!W.morphAttributes.position,et=!!W.morphAttributes.normal,at=!!W.morphAttributes.color;let xt=Yn;q.toneMapped&&(I===null||I.isXRRenderTarget===!0)&&(xt=x.toneMapping);const ft=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,ut=ft!==void 0?ft.length:0,ke=re.get(q),gt=p.state.lights;if(Ve===!0&&(Y===!0||E!==M)){const Ot=E===M&&q.id===y;ue.setState(q,E,Ot)}let it=!1;q.version===ke.__version?(ke.needsLights&&ke.lightsStateVersion!==gt.state.version||ke.outputColorSpace!==Pe||z.isBatchedMesh&&ke.batching===!1||!z.isBatchedMesh&&ke.batching===!0||z.isBatchedMesh&&ke.batchingColor===!0&&z.colorTexture===null||z.isBatchedMesh&&ke.batchingColor===!1&&z.colorTexture!==null||z.isInstancedMesh&&ke.instancing===!1||!z.isInstancedMesh&&ke.instancing===!0||z.isSkinnedMesh&&ke.skinning===!1||!z.isSkinnedMesh&&ke.skinning===!0||z.isInstancedMesh&&ke.instancingColor===!0&&z.instanceColor===null||z.isInstancedMesh&&ke.instancingColor===!1&&z.instanceColor!==null||z.isInstancedMesh&&ke.instancingMorph===!0&&z.morphTexture===null||z.isInstancedMesh&&ke.instancingMorph===!1&&z.morphTexture!==null||ke.envMap!==Ae||q.fog===!0&&ke.fog!==he||ke.numClippingPlanes!==void 0&&(ke.numClippingPlanes!==ue.numPlanes||ke.numIntersection!==ue.numIntersection)||ke.vertexAlphas!==We||ke.vertexTangents!==qe||ke.morphTargets!==Oe||ke.morphNormals!==et||ke.morphColors!==at||ke.toneMapping!==xt||ke.morphTargetsCount!==ut)&&(it=!0):(it=!0,ke.__version=q.version);let qt=ke.currentProgram;it===!0&&(qt=Ys(q,B,z));let Si=!1,Yt=!1,fs=!1;const _t=qt.getUniforms(),jt=ke.uniforms;if($.useProgram(qt.program)&&(Si=!0,Yt=!0,fs=!0),q.id!==y&&(y=q.id,Yt=!0),Si||M!==E){$.buffers.depth.getReversed()&&E.reversedDepth!==!0&&(E._reversedDepth=!0,E.updateProjectionMatrix()),_t.setValue(A,"projectionMatrix",E.projectionMatrix),_t.setValue(A,"viewMatrix",E.matrixWorldInverse);const Ht=_t.map.cameraPosition;Ht!==void 0&&Ht.setValue(A,_e.setFromMatrixPosition(E.matrixWorld)),j.logarithmicDepthBuffer&&_t.setValue(A,"logDepthBufFC",2/(Math.log(E.far+1)/Math.LN2)),(q.isMeshPhongMaterial||q.isMeshToonMaterial||q.isMeshLambertMaterial||q.isMeshBasicMaterial||q.isMeshStandardMaterial||q.isShaderMaterial)&&_t.setValue(A,"isOrthographic",E.isOrthographicCamera===!0),M!==E&&(M=E,Yt=!0,fs=!0)}if(z.isSkinnedMesh){_t.setOptional(A,z,"bindMatrix"),_t.setOptional(A,z,"bindMatrixInverse");const Ot=z.skeleton;Ot&&(Ot.boneTexture===null&&Ot.computeBoneTexture(),_t.setValue(A,"boneTexture",Ot.boneTexture,me))}z.isBatchedMesh&&(_t.setOptional(A,z,"batchingTexture"),_t.setValue(A,"batchingTexture",z._matricesTexture,me),_t.setOptional(A,z,"batchingIdTexture"),_t.setValue(A,"batchingIdTexture",z._indirectTexture,me),_t.setOptional(A,z,"batchingColorTexture"),z._colorsTexture!==null&&_t.setValue(A,"batchingColorTexture",z._colorsTexture,me));const $t=W.morphAttributes;if(($t.position!==void 0||$t.normal!==void 0||$t.color!==void 0)&&le.update(z,W,qt),(Yt||ke.receiveShadow!==z.receiveShadow)&&(ke.receiveShadow=z.receiveShadow,_t.setValue(A,"receiveShadow",z.receiveShadow)),q.isMeshGouraudMaterial&&q.envMap!==null&&(jt.envMap.value=Ae,jt.flipEnvMap.value=Ae.isCubeTexture&&Ae.isRenderTargetTexture===!1?-1:1),q.isMeshStandardMaterial&&q.envMap===null&&B.environment!==null&&(jt.envMapIntensity.value=B.environmentIntensity),Yt&&(_t.setValue(A,"toneMappingExposure",x.toneMappingExposure),ke.needsLights&&nh(jt,fs),he&&q.fog===!0&&ie.refreshFogUniforms(jt,he),ie.refreshMaterialUniforms(jt,q,G,V,p.state.transmissionRenderTarget[E.id]),Ir.upload(A,Sl(ke),jt,me)),q.isShaderMaterial&&q.uniformsNeedUpdate===!0&&(Ir.upload(A,Sl(ke),jt,me),q.uniformsNeedUpdate=!1),q.isSpriteMaterial&&_t.setValue(A,"center",z.center),_t.setValue(A,"modelViewMatrix",z.modelViewMatrix),_t.setValue(A,"normalMatrix",z.normalMatrix),_t.setValue(A,"modelMatrix",z.matrixWorld),q.isShaderMaterial||q.isRawShaderMaterial){const Ot=q.uniformsGroups;for(let Ht=0,Zr=Ot.length;Ht<Zr;Ht++){const ti=Ot[Ht];Xe.update(ti,qt),Xe.bind(ti,qt)}}return qt}function nh(E,B){E.ambientLightColor.needsUpdate=B,E.lightProbe.needsUpdate=B,E.directionalLights.needsUpdate=B,E.directionalLightShadows.needsUpdate=B,E.pointLights.needsUpdate=B,E.pointLightShadows.needsUpdate=B,E.spotLights.needsUpdate=B,E.spotLightShadows.needsUpdate=B,E.rectAreaLights.needsUpdate=B,E.hemisphereLights.needsUpdate=B}function ih(E){return E.isMeshLambertMaterial||E.isMeshToonMaterial||E.isMeshPhongMaterial||E.isMeshStandardMaterial||E.isShadowMaterial||E.isShaderMaterial&&E.lights===!0}this.getActiveCubeFace=function(){return w},this.getActiveMipmapLevel=function(){return R},this.getRenderTarget=function(){return I},this.setRenderTargetTextures=function(E,B,W){const q=re.get(E);q.__autoAllocateDepthBuffer=E.resolveDepthBuffer===!1,q.__autoAllocateDepthBuffer===!1&&(q.__useRenderToTexture=!1),re.get(E.texture).__webglTexture=B,re.get(E.depthTexture).__webglTexture=q.__autoAllocateDepthBuffer?void 0:W,q.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(E,B){const W=re.get(E);W.__webglFramebuffer=B,W.__useDefaultFramebuffer=B===void 0};const sh=A.createFramebuffer();this.setRenderTarget=function(E,B=0,W=0){I=E,w=B,R=W;let q=!0,z=null,he=!1,Ee=!1;if(E){const Ae=re.get(E);if(Ae.__useDefaultFramebuffer!==void 0)$.bindFramebuffer(A.FRAMEBUFFER,null),q=!1;else if(Ae.__webglFramebuffer===void 0)me.setupRenderTarget(E);else if(Ae.__hasExternalTextures)me.rebindTextures(E,re.get(E.texture).__webglTexture,re.get(E.depthTexture).__webglTexture);else if(E.depthBuffer){const Oe=E.depthTexture;if(Ae.__boundDepthTexture!==Oe){if(Oe!==null&&re.has(Oe)&&(E.width!==Oe.image.width||E.height!==Oe.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");me.setupDepthRenderbuffer(E)}}const We=E.texture;(We.isData3DTexture||We.isDataArrayTexture||We.isCompressedArrayTexture)&&(Ee=!0);const qe=re.get(E).__webglFramebuffer;E.isWebGLCubeRenderTarget?(Array.isArray(qe[B])?z=qe[B][W]:z=qe[B],he=!0):E.samples>0&&me.useMultisampledRTT(E)===!1?z=re.get(E).__webglMultisampledFramebuffer:Array.isArray(qe)?z=qe[W]:z=qe,C.copy(E.viewport),F.copy(E.scissor),H=E.scissorTest}else C.copy(de).multiplyScalar(G).floor(),F.copy(Te).multiplyScalar(G).floor(),H=Be;if(W!==0&&(z=sh),$.bindFramebuffer(A.FRAMEBUFFER,z)&&q&&$.drawBuffers(E,z),$.viewport(C),$.scissor(F),$.setScissorTest(H),he){const Ae=re.get(E.texture);A.framebufferTexture2D(A.FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_CUBE_MAP_POSITIVE_X+B,Ae.__webglTexture,W)}else if(Ee){const Ae=B;for(let We=0;We<E.textures.length;We++){const qe=re.get(E.textures[We]);A.framebufferTextureLayer(A.FRAMEBUFFER,A.COLOR_ATTACHMENT0+We,qe.__webglTexture,W,Ae)}}else if(E!==null&&W!==0){const Ae=re.get(E.texture);A.framebufferTexture2D(A.FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_2D,Ae.__webglTexture,W)}y=-1},this.readRenderTargetPixels=function(E,B,W,q,z,he,Ee,Pe=0){if(!(E&&E.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ae=re.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&Ee!==void 0&&(Ae=Ae[Ee]),Ae){$.bindFramebuffer(A.FRAMEBUFFER,Ae);try{const We=E.textures[Pe],qe=We.format,Oe=We.type;if(!j.textureFormatReadable(qe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!j.textureTypeReadable(Oe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}B>=0&&B<=E.width-q&&W>=0&&W<=E.height-z&&(E.textures.length>1&&A.readBuffer(A.COLOR_ATTACHMENT0+Pe),A.readPixels(B,W,q,z,Le.convert(qe),Le.convert(Oe),he))}finally{const We=I!==null?re.get(I).__webglFramebuffer:null;$.bindFramebuffer(A.FRAMEBUFFER,We)}}},this.readRenderTargetPixelsAsync=async function(E,B,W,q,z,he,Ee,Pe=0){if(!(E&&E.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ae=re.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&Ee!==void 0&&(Ae=Ae[Ee]),Ae)if(B>=0&&B<=E.width-q&&W>=0&&W<=E.height-z){$.bindFramebuffer(A.FRAMEBUFFER,Ae);const We=E.textures[Pe],qe=We.format,Oe=We.type;if(!j.textureFormatReadable(qe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!j.textureTypeReadable(Oe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const et=A.createBuffer();A.bindBuffer(A.PIXEL_PACK_BUFFER,et),A.bufferData(A.PIXEL_PACK_BUFFER,he.byteLength,A.STREAM_READ),E.textures.length>1&&A.readBuffer(A.COLOR_ATTACHMENT0+Pe),A.readPixels(B,W,q,z,Le.convert(qe),Le.convert(Oe),0);const at=I!==null?re.get(I).__webglFramebuffer:null;$.bindFramebuffer(A.FRAMEBUFFER,at);const xt=A.fenceSync(A.SYNC_GPU_COMMANDS_COMPLETE,0);return A.flush(),await kh(A,xt,4),A.bindBuffer(A.PIXEL_PACK_BUFFER,et),A.getBufferSubData(A.PIXEL_PACK_BUFFER,0,he),A.deleteBuffer(et),A.deleteSync(xt),he}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(E,B=null,W=0){const q=Math.pow(2,-W),z=Math.floor(E.image.width*q),he=Math.floor(E.image.height*q),Ee=B!==null?B.x:0,Pe=B!==null?B.y:0;me.setTexture2D(E,0),A.copyTexSubImage2D(A.TEXTURE_2D,W,0,0,Ee,Pe,z,he),$.unbindTexture()};const rh=A.createFramebuffer(),oh=A.createFramebuffer();this.copyTextureToTexture=function(E,B,W=null,q=null,z=0,he=null){he===null&&(z!==0?(Ls("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),he=z,z=0):he=0);let Ee,Pe,Ae,We,qe,Oe,et,at,xt;const ft=E.isCompressedTexture?E.mipmaps[he]:E.image;if(W!==null)Ee=W.max.x-W.min.x,Pe=W.max.y-W.min.y,Ae=W.isBox3?W.max.z-W.min.z:1,We=W.min.x,qe=W.min.y,Oe=W.isBox3?W.min.z:0;else{const $t=Math.pow(2,-z);Ee=Math.floor(ft.width*$t),Pe=Math.floor(ft.height*$t),E.isDataArrayTexture?Ae=ft.depth:E.isData3DTexture?Ae=Math.floor(ft.depth*$t):Ae=1,We=0,qe=0,Oe=0}q!==null?(et=q.x,at=q.y,xt=q.z):(et=0,at=0,xt=0);const ut=Le.convert(B.format),ke=Le.convert(B.type);let gt;B.isData3DTexture?(me.setTexture3D(B,0),gt=A.TEXTURE_3D):B.isDataArrayTexture||B.isCompressedArrayTexture?(me.setTexture2DArray(B,0),gt=A.TEXTURE_2D_ARRAY):(me.setTexture2D(B,0),gt=A.TEXTURE_2D),A.pixelStorei(A.UNPACK_FLIP_Y_WEBGL,B.flipY),A.pixelStorei(A.UNPACK_PREMULTIPLY_ALPHA_WEBGL,B.premultiplyAlpha),A.pixelStorei(A.UNPACK_ALIGNMENT,B.unpackAlignment);const it=A.getParameter(A.UNPACK_ROW_LENGTH),qt=A.getParameter(A.UNPACK_IMAGE_HEIGHT),Si=A.getParameter(A.UNPACK_SKIP_PIXELS),Yt=A.getParameter(A.UNPACK_SKIP_ROWS),fs=A.getParameter(A.UNPACK_SKIP_IMAGES);A.pixelStorei(A.UNPACK_ROW_LENGTH,ft.width),A.pixelStorei(A.UNPACK_IMAGE_HEIGHT,ft.height),A.pixelStorei(A.UNPACK_SKIP_PIXELS,We),A.pixelStorei(A.UNPACK_SKIP_ROWS,qe),A.pixelStorei(A.UNPACK_SKIP_IMAGES,Oe);const _t=E.isDataArrayTexture||E.isData3DTexture,jt=B.isDataArrayTexture||B.isData3DTexture;if(E.isDepthTexture){const $t=re.get(E),Ot=re.get(B),Ht=re.get($t.__renderTarget),Zr=re.get(Ot.__renderTarget);$.bindFramebuffer(A.READ_FRAMEBUFFER,Ht.__webglFramebuffer),$.bindFramebuffer(A.DRAW_FRAMEBUFFER,Zr.__webglFramebuffer);for(let ti=0;ti<Ae;ti++)_t&&(A.framebufferTextureLayer(A.READ_FRAMEBUFFER,A.COLOR_ATTACHMENT0,re.get(E).__webglTexture,z,Oe+ti),A.framebufferTextureLayer(A.DRAW_FRAMEBUFFER,A.COLOR_ATTACHMENT0,re.get(B).__webglTexture,he,xt+ti)),A.blitFramebuffer(We,qe,Ee,Pe,et,at,Ee,Pe,A.DEPTH_BUFFER_BIT,A.NEAREST);$.bindFramebuffer(A.READ_FRAMEBUFFER,null),$.bindFramebuffer(A.DRAW_FRAMEBUFFER,null)}else if(z!==0||E.isRenderTargetTexture||re.has(E)){const $t=re.get(E),Ot=re.get(B);$.bindFramebuffer(A.READ_FRAMEBUFFER,rh),$.bindFramebuffer(A.DRAW_FRAMEBUFFER,oh);for(let Ht=0;Ht<Ae;Ht++)_t?A.framebufferTextureLayer(A.READ_FRAMEBUFFER,A.COLOR_ATTACHMENT0,$t.__webglTexture,z,Oe+Ht):A.framebufferTexture2D(A.READ_FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_2D,$t.__webglTexture,z),jt?A.framebufferTextureLayer(A.DRAW_FRAMEBUFFER,A.COLOR_ATTACHMENT0,Ot.__webglTexture,he,xt+Ht):A.framebufferTexture2D(A.DRAW_FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_2D,Ot.__webglTexture,he),z!==0?A.blitFramebuffer(We,qe,Ee,Pe,et,at,Ee,Pe,A.COLOR_BUFFER_BIT,A.NEAREST):jt?A.copyTexSubImage3D(gt,he,et,at,xt+Ht,We,qe,Ee,Pe):A.copyTexSubImage2D(gt,he,et,at,We,qe,Ee,Pe);$.bindFramebuffer(A.READ_FRAMEBUFFER,null),$.bindFramebuffer(A.DRAW_FRAMEBUFFER,null)}else jt?E.isDataTexture||E.isData3DTexture?A.texSubImage3D(gt,he,et,at,xt,Ee,Pe,Ae,ut,ke,ft.data):B.isCompressedArrayTexture?A.compressedTexSubImage3D(gt,he,et,at,xt,Ee,Pe,Ae,ut,ft.data):A.texSubImage3D(gt,he,et,at,xt,Ee,Pe,Ae,ut,ke,ft):E.isDataTexture?A.texSubImage2D(A.TEXTURE_2D,he,et,at,Ee,Pe,ut,ke,ft.data):E.isCompressedTexture?A.compressedTexSubImage2D(A.TEXTURE_2D,he,et,at,ft.width,ft.height,ut,ft.data):A.texSubImage2D(A.TEXTURE_2D,he,et,at,Ee,Pe,ut,ke,ft);A.pixelStorei(A.UNPACK_ROW_LENGTH,it),A.pixelStorei(A.UNPACK_IMAGE_HEIGHT,qt),A.pixelStorei(A.UNPACK_SKIP_PIXELS,Si),A.pixelStorei(A.UNPACK_SKIP_ROWS,Yt),A.pixelStorei(A.UNPACK_SKIP_IMAGES,fs),he===0&&B.generateMipmaps&&A.generateMipmap(gt),$.unbindTexture()},this.initRenderTarget=function(E){re.get(E).__webglFramebuffer===void 0&&me.setupRenderTarget(E)},this.initTexture=function(E){E.isCubeTexture?me.setTextureCube(E,0):E.isData3DTexture?me.setTexture3D(E,0):E.isDataArrayTexture||E.isCompressedArrayTexture?me.setTexture2DArray(E,0):me.setTexture2D(E,0),$.unbindTexture()},this.resetState=function(){w=0,R=0,I=null,$.reset(),xe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Sn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=tt._getDrawingBufferColorSpace(e),t.unpackColorSpace=tt._getUnpackColorSpace()}}const Ct=44021;function Ws(i){let e=i>>>0;return function(){e|=0,e=e+1831565813|0;let n=Math.imul(e^e>>>15,1|e);return n=n+Math.imul(n^n>>>7,61|n)^n,((n^n>>>14)>>>0)/4294967296}}const Ze={hullRadius:1.26,hullCenterY:.99,length:22,hatchWidth:.66,hatchHeight:1.5,hatchSill:.06,rooms:{control:{z0:.18,z1:4.4},corridor:{z0:4.4,z1:8.2},crew:{z0:8.2,z1:13.1},passage:{z0:13.1,z1:16.2}}};function Wg(i){const e=i-Ze.hullCenterY,t=Ze.hullRadius,n=t*t-e*e;return Math.sqrt(n)}const In={hull:13025972,hullGreen:8225900,instrumentGreen:7323514,instrumentAmber:13935178,instrumentCyan:5941424,waterDeep:398364,waterMid:731699,fabric:5919558},Io=new Map;let al="used";function ku(i){al=i==="clean"?"clean":"used"}function Xg(i,e,t){const n=Math.sin(i*127.1+e*311.7+t*.013)*43758.5453;return n-Math.floor(n)}function Wt(i,e,t,n=5){let s=0,r=.5,o=1;for(let a=0;a<n;a++)s+=r*Xg(i*o,e*o,t+a*19),r*=.5,o*=2.03;return s}function nn(i){return Math.max(0,Math.min(1,i))}function Na(i){const e=document.createElement("canvas");return e.width=i,e.height=i,e}function Lo(i,e=!1,t=2){const n=new ls(i);return n.wrapS=Un,n.wrapT=Un,n.repeat.set(t,t),n.generateMipmaps=!0,n.minFilter=qn,n.magFilter=hn,n.anisotropy=4,e&&(n.colorSpace=Rt),n.needsUpdate=!0,n}function qg(i,e,t=2.4){const n=Na(e),s=n.getContext("2d"),r=s.createImageData(e,e),o=r.data,a=(c,l)=>i[(l+e)%e*e+(c+e)%e];for(let c=0;c<e;c++)for(let l=0;l<e;l++){const u=a(l+1,c)-a(l-1,c),h=a(l,c+1)-a(l,c-1);let d=-u*t,f=-h*t,g=1;const _=Math.hypot(d,f,g)||1;d/=_,f/=_,g/=_;const m=(c*e+l)*4;o[m]=(d*.5+.5)*255,o[m+1]=(f*.5+.5)*255,o[m+2]=(g*.5+.5)*255,o[m+3]=255}return s.putImageData(r,0,0),n}function Xs(i,e){const t=Na(i),n=Na(i),s=new Float32Array(i*i),r=t.getContext("2d"),o=n.getContext("2d"),a=r.createImageData(i,i),c=o.createImageData(i,i),l=a.data,u=c.data;for(let h=0;h<i;h++)for(let d=0;d<i;d++){const f=d/i,g=h/i,_=e(f,g,d,h),m=(h*i+d)*4;l[m]=_.r,l[m+1]=_.g,l[m+2]=_.b,l[m+3]=255;const p=nn(_.rough);u[m]=u[m+1]=u[m+2]=p*255,u[m+3]=255,s[h*i+d]=_.h}return r.putImageData(a,0,0),o.putImageData(c,0,0),{albedoC:t,roughC:n,height:s}}function ll(){return al==="clean"?.28:1}function Sr(i,e){const n=ll();return Xs(256,(r,o)=>{const a=Wt(r*7,o*7,e,5),c=Wt(r*38,o*38,e+3,3),l=Math.pow(Wt(r*22,o*2.2,e+8,3),8),u=Math.pow(Math.abs(Math.sin(r*Math.PI*4)*Math.sin(o*Math.PI*3)),.35),h=Math.pow(Wt(r*3.2,o*3.5,e+11,4),1.6),d=a>.78&&c>.62?1:0,f=nn(l*.9+d*.7)*n,g=h*.22*n*(1.1-u),_=i.r*255*(.86+a*.12-f*.28-g*.25),m=i.g*255*(.86+a*.1-f*.22-g*.22),p=i.b*255*(.84+a*.1-f*.16-g*.18),S=f*40;return{r:nn((_+S)/255)*255,g:nn((m+S*.95)/255)*255,b:nn((p+S*.9)/255)*255,rough:.52+a*.18+g*.22-f*.2+c*.05,h:a*.55+c*.18-f*.25+(1-u)*.08}})}function Pc(i,e=!1){const n=ll();return Xs(256,(s,r)=>{const o=Math.sin((s*180+Wt(s*4,r*40,i,2)*8)*Math.PI),a=Wt(s*10,r*10,i,4),c=e?Math.pow(Wt(s*2.4,r*3.1,i+4,4),1.4):0,l=Math.pow(Wt(s*5,r*1.4,i+6,3),2.2)*n,u=e?38:118,h=u+o*14+a*18-l*22-c*10,d=u+2+o*14+a*16-l*18-c*6,f=u+6+o*12+a*14-l*12;return{r:nn(h/255)*255,g:nn(d/255)*255,b:nn(f/255)*255,rough:e?.22+a*.2+c*.18+l*.12:.28+a*.16-Math.abs(o)*.08,h:o*.12+a*.3+c*.1}})}function Dc(i){return Xs(256,(t,n)=>{const s=Math.abs(Math.sin(t*Math.PI*28))*.35+Math.abs(Math.sin(n*Math.PI*10))*.2,r=Wt(t*12,n*12,i,4),o=Math.pow(1-Math.abs(t-.5)*1.6,2)*.35*ll(),a=28+r*10+s*8+o*18,c=26+r*8+s*6+o*14,l=24+r*7+s*5+o*10;return{r:a,g:c,b:l,rough:.86+r*.08-o*.12+s*.04,h:s*.7+r*.2-o*.15}})}function Yg(i,e){return Xs(256,(n,s)=>{const r=Math.sin(n*Math.PI*90)*Math.sin(s*Math.PI*70)*.5+.5,o=Wt(n*3.5,s*2.2,i,4),a=Wt(n*18,s*18,i+2,3),c=Wt(n*40,s*40,i+5,2),l=e.r*255*(.72+o*.22+r*.08-c*.04),u=e.g*255*(.72+o*.2+r*.07),h=e.b*255*(.7+o*.18+r*.06);return{r:nn(l/255)*255,g:nn(u/255)*255,b:nn(h/255)*255,rough:.9+a*.06-o*.04,h:o*.7+r*.25+a*.1}})}function Zg(i){return Xs(256,(t,n)=>{const s=Math.pow(Wt(t*4,n*5,i,5),1.8),r=Math.pow(Wt(t*2,n*9,i+3,3),2.4),o=nn(s*.7+r*.55);return{r:70+o*90,g:38+o*28,b:24+o*10,rough:.7+o*.22,h:o*.4}})}function ys(i){return new Ke(i)}function _n(i,e,t=!0){const n=Lo(i.albedoC,t,e),s=Lo(i.roughC,!1,e),r=Lo(qg(i.height,i.albedoC.width,3.1),!1,e);return{map:n,roughnessMap:s,normalMap:r}}function Vu(i,e){if(Io.has(i))return Io.get(i);const t=e();return Io.set(i,t),t}function pt(i){return new Du({color:16777215,roughness:.6,metalness:.1,envMapIntensity:.85,...i})}function Kg(){return Vu(`mats:${al}:${Ct}`,()=>{const i=ys(In.hull),e=ys(In.hullGreen),t=ys(In.fabric),n=_n(Sr(i,Ct),2.4),s=_n(Sr(e,Ct+17),2.1),r=_n(Sr(ys(9077876),Ct+31),1.8),o=_n(Pc(Ct+41,!1),1.6),a=_n(Pc(Ct+53,!0),1.4),c=_n(Dc(Ct+67),3.2),l=_n(Yg(Ct+71,t),1.8),u=_n(Zg(Ct+83),1.2),h=_n(Sr(ys(7173224),Ct+91),1.5),d=_n(Dc(Ct+101),2.6),f=pt({...n,color:15789024,roughness:.58,metalness:.06,normalScale:{x:.1,y:.1}}),g=pt({...s,color:13949126,roughness:.6,metalness:.08,normalScale:{x:.2,y:.2}}),_=pt({...r,color:13946816,roughness:.58,metalness:.16,normalScale:{x:.7,y:.7}}),m=pt({...o,color:12961996,roughness:.32,metalness:.86,envMapIntensity:1.15,normalScale:{x:.45,y:.45}}),p=pt({...a,color:11843774,roughness:.3,metalness:.86,envMapIntensity:1.15,normalScale:{x:.22,y:.22}}),S=pt({...c,color:4868166,roughness:.92,metalness:0,normalScale:{x:1.1,y:1.1}}),T=pt({...l,color:12036758,roughness:.94,metalness:0,normalScale:{x:1.4,y:1.4}}),x=pt({...l,color:6968134,roughness:.72,metalness:.04,normalScale:{x:.8,y:.8}}),P=pt({color:3817534,roughness:.42,metalness:.05,map:r.map,roughnessMap:r.roughnessMap}),w=pt({color:4864044,roughness:.38,metalness:.02}),R=pt({color:9087152,roughness:.08,metalness:.12,transparent:!0,opacity:.16,envMapIntensity:1.35,depthWrite:!1}),I=pt({color:8034464,roughness:.1,metalness:.1,transparent:!0,opacity:.2,envMapIntensity:1.2,depthWrite:!1}),y=pt({...n,color:13620434,roughness:.22,metalness:.12,envMapIntensity:1.05,normalScale:{x:.35,y:.35}}),M=pt({...u,color:11889212,roughness:.82,metalness:.18,normalScale:{x:.9,y:.9}}),C=pt({...h,color:12041134,roughness:.55,metalness:.22,normalScale:{x:.45,y:.45}}),F=pt({...h,color:8227734,roughness:.5,metalness:.28}),H=pt({...h,color:11893320,roughness:.52,metalness:.2}),X=pt({...d,color:4012340,roughness:.88,metalness:.04,normalScale:{x:1.2,y:1.2}}),L=pt({...o,color:5920852,roughness:.48,metalness:.7}),U=pt({color:1057300,emissive:In.instrumentGreen,emissiveIntensity:.55,roughness:.35,metalness:.1}),V=pt({color:1708552,emissive:In.instrumentAmber,emissiveIntensity:.45,roughness:.35,metalness:.1}),G=pt({color:529432,emissive:In.instrumentCyan,emissiveIntensity:.4,roughness:.32,metalness:.1}),J=pt({color:526602,roughness:.95,metalness:0}),se=pt({color:13157040,roughness:.9,metalness:0}),de=pt({color:14210252,roughness:.28,metalness:0});return{hull:f,hullGreen:g,chipped:_,brushed:m,oily:p,rubber:S,fabric:T,leather:x,plastic:P,bakelite:w,glass:R,glassThick:I,wet:y,rust:M,pipe:C,pipeBlue:F,pipeOrange:H,deck:X,grate:L,emissiveGreen:U,emissiveAmber:V,emissiveCyan:G,blackout:J,foam:se,ceramic:de}})}function Jg(i,e={}){const{w:t=256,h:n=128,bg:s="#8a7a3a",fg:r="#1a160c",border:o="#1a160c",sub:a=""}=e,c=`label:${i}:${a}:${t}:${n}:${s}`;return Vu(c,()=>{const l=document.createElement("canvas");l.width=t,l.height=n;const u=l.getContext("2d");u.fillStyle=s,u.fillRect(0,0,t,n),u.strokeStyle=o,u.lineWidth=10,u.strokeRect(6,6,t-12,n-12),u.fillStyle=r,u.font=`700 ${Math.floor(n*.28)}px sans-serif`,u.textAlign="center",u.textBaseline="middle",u.fillText(i,t*.5,a?n*.4:n*.5),a&&(u.font=`600 ${Math.floor(n*.16)}px sans-serif`,u.fillText(a,t*.5,n*.68));const h=new ls(l);return h.colorSpace=Rt,h.needsUpdate=!0,h})}function jg(i,e,t=.9){for(const n of Object.values(i))n&&n.isMaterial&&(n.envMap=e,n.envMapIntensity=t*(n.envMapIntensity||1),n.needsUpdate=!0)}const Es=new D;function en(i,e,t,n,s,r){const o=2*Math.PI*s/4,a=Math.max(r-2*s,0),c=Math.PI/4;Es.copy(e),Es[n]=0,Es.normalize();const l=.5*o/(o+a),u=1-Es.angleTo(i)/c;return Math.sign(Es[t])===1?u*l:a/(o+a)+l+l*(1-u)}class cl extends jn{constructor(e=1,t=1,n=1,s=2,r=.1){const o=s*2+1;if(r=Math.min(e/2,t/2,n/2,r),super(1,1,1,o,o,o),this.type="RoundedBoxGeometry",this.parameters={width:e,height:t,depth:n,segments:s,radius:r},o===1)return;const a=this.toNonIndexed();this.index=null,this.attributes.position=a.attributes.position,this.attributes.normal=a.attributes.normal,this.attributes.uv=a.attributes.uv;const c=new D,l=new D,u=new D(e,t,n).divideScalar(2).subScalar(r),h=this.attributes.position.array,d=this.attributes.normal.array,f=this.attributes.uv.array,g=h.length/6,_=new D,m=.5/o;for(let p=0,S=0;p<h.length;p+=3,S+=2)switch(c.fromArray(h,p),l.copy(c),l.x-=Math.sign(l.x)*m,l.y-=Math.sign(l.y)*m,l.z-=Math.sign(l.z)*m,l.normalize(),h[p+0]=u.x*Math.sign(c.x)+l.x*r,h[p+1]=u.y*Math.sign(c.y)+l.y*r,h[p+2]=u.z*Math.sign(c.z)+l.z*r,d[p+0]=l.x,d[p+1]=l.y,d[p+2]=l.z,Math.floor(p/g)){case 0:_.set(1,0,0),f[S+0]=en(_,l,"z","y",r,n),f[S+1]=1-en(_,l,"y","z",r,t);break;case 1:_.set(-1,0,0),f[S+0]=1-en(_,l,"z","y",r,n),f[S+1]=1-en(_,l,"y","z",r,t);break;case 2:_.set(0,1,0),f[S+0]=1-en(_,l,"x","z",r,e),f[S+1]=en(_,l,"z","x",r,n);break;case 3:_.set(0,-1,0),f[S+0]=1-en(_,l,"x","z",r,e),f[S+1]=1-en(_,l,"z","x",r,n);break;case 4:_.set(0,0,1),f[S+0]=1-en(_,l,"x","y",r,e),f[S+1]=1-en(_,l,"y","x",r,t);break;case 5:_.set(0,0,-1),f[S+0]=en(_,l,"x","y",r,e),f[S+1]=1-en(_,l,"y","x",r,t);break}}static fromJSON(e){return new cl(e.width,e.height,e.depth,e.segments,e.radius)}}function Hu(i,e=!1){const t=i[0].index!==null,n=new Set(Object.keys(i[0].attributes)),s=new Set(Object.keys(i[0].morphAttributes)),r={},o={},a=i[0].morphTargetsRelative,c=new wt;let l=0;for(let u=0;u<i.length;++u){const h=i[u];let d=0;if(t!==(h.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const f in h.attributes){if(!n.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+'. All geometries must have compatible attributes; make sure "'+f+'" attribute exists among all geometries, or in none of them.'),null;r[f]===void 0&&(r[f]=[]),r[f].push(h.attributes[f]),d++}if(d!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+". Make sure all geometries have the same number of attributes."),null;if(a!==h.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const f in h.morphAttributes){if(!s.has(f))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+".  .morphAttributes must be consistent throughout all geometries."),null;o[f]===void 0&&(o[f]=[]),o[f].push(h.morphAttributes[f])}if(e){let f;if(t)f=h.index.count;else if(h.attributes.position!==void 0)f=h.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+u+". The geometry must have either an index or a position attribute"),null;c.addGroup(l,f,u),l+=f}}if(t){let u=0;const h=[];for(let d=0;d<i.length;++d){const f=i[d].index;for(let g=0;g<f.count;++g)h.push(f.getX(g)+u);u+=i[d].attributes.position.count}c.setIndex(h)}for(const u in r){const h=Ic(r[u]);if(!h)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+u+" attribute."),null;c.setAttribute(u,h)}for(const u in o){const h=o[u][0].length;if(h===0)break;c.morphAttributes=c.morphAttributes||{},c.morphAttributes[u]=[];for(let d=0;d<h;++d){const f=[];for(let _=0;_<o[u].length;++_)f.push(o[u][_][d]);const g=Ic(f);if(!g)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+u+" morphAttribute."),null;c.morphAttributes[u].push(g)}}return c}function Ic(i){let e,t,n,s=-1,r=0;for(let l=0;l<i.length;++l){const u=i[l];if(e===void 0&&(e=u.array.constructor),e!==u.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(t===void 0&&(t=u.itemSize),t!==u.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=u.normalized),n!==u.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(s===-1&&(s=u.gpuType),s!==u.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;r+=u.count*t}const o=new e(r),a=new Vt(o,t,n);let c=0;for(let l=0;l<i.length;++l){const u=i[l];if(u.isInterleavedBufferAttribute){const h=c/t;for(let d=0,f=u.count;d<f;d++)for(let g=0;g<t;g++){const _=u.getComponent(d,g);a.setComponent(d+h,g,_)}}else o.set(u.array,c);c+=u.count*t}return s!==void 0&&(a.gpuType=s),a}function fe(i,e,t,n=.012,s=2){const r=Math.min(n,i*.45,e*.45,t*.45);return new cl(i,e,t,s,r)}function ct(i,e,t){return new jn(i,e,t)}function Ye(i,e,t,n=16,s=1,r=!1){return new ji(i,e,t,n,s,r)}function Gr(i,e=12,t=8){return new Bs(i,e,t)}function us(i,e,t=16,n=12,s=Math.PI*2){return new kr(i,e,t,n,s)}function ul(i){const e=i.filter(Boolean);return e.length===0?new wt:e.length===1?e[0]:Hu(e,!1)||e[0]}function Zn(i,e,t,n,s=0,r=0,o=0){const a=i.clone();return a.rotateX(s),a.rotateY(r),a.rotateZ(o),a.translate(e,t,n),a}function $g(i,e=.045,t=.07,n=.018,s=48,r=-.08){const o=[],a=Math.PI*2/s;for(let c=0;c<s;c++){const l=c*a,u=(c+1)*a,h=(l+u)*.5,d=Math.sin(h)*i;if(d<r)continue;const f=Math.cos(h)*i,g=i*a*1.08,_=Zn(ct(g,e,n),f,d,0,0,0,h+Math.PI*.5),m=Zn(ct(g,n,t),f,d,0,0,0,h+Math.PI*.5);o.push(_,m)}return ul(o)}function Qg(i,e,t=.22){const n=i*.5,s=Math.min(t,n-.01,e*.35),r=new Hs;return r.moveTo(-n,0),r.lineTo(-n,e-s),r.absarc(-n+s,e-s,s,Math.PI,Math.PI*.5,!0),r.lineTo(n-s,e),r.absarc(n-s,e-s,s,Math.PI*.5,0,!0),r.lineTo(n,0),r.closePath(),r}function e_(i,e,t,n,s=.08){const r=new Hs,o=48;for(let d=0;d<=o;d++){const f=d/o*Math.PI*2,g=Math.cos(f)*i,_=Math.sin(f)*i;d===0?r.moveTo(g,_):r.lineTo(g,_)}const a=new Us,c=e*.5,l=t*.5,u=Math.min(.12,c-.02,l-.02);a.moveTo(-c+u,n-l),a.lineTo(c-u,n-l),a.absarc(c-u,n-l+u,u,-Math.PI*.5,0,!1),a.lineTo(c,n+l-u),a.absarc(c-u,n+l-u,u,0,Math.PI*.5,!1),a.lineTo(-c+u,n+l),a.absarc(-c+u,n+l-u,u,Math.PI*.5,Math.PI,!1),a.lineTo(-c,n-l+u),a.absarc(-c+u,n-l+u,u,Math.PI,Math.PI*1.5,!1),a.closePath(),r.holes.push(a);const h=new Gs(r,{depth:s,bevelEnabled:!0,bevelThickness:.012,bevelSize:.01,bevelSegments:2});return h.translate(0,0,-s*.5),h}function Lc(i,e,t,n,s=.08){const r=new Hs,o=48;for(let f=0;f<=o;f++){const g=f/o*Math.PI*2,_=Math.cos(g)*i,m=Math.sin(g)*i;f===0?r.moveTo(_,m):r.lineTo(_,m)}Qg(e,t).curves.forEach(()=>{});const c=new Us,l=e*.5,u=Math.min(.22,l-.01),h=n-i*.02;c.moveTo(-l,h),c.lineTo(-l,h+t-u),c.absarc(-l+u,h+t-u,u,Math.PI,Math.PI*.5,!0),c.lineTo(l-u,h+t),c.absarc(l-u,h+t-u,u,Math.PI*.5,0,!0),c.lineTo(l,h),c.closePath(),r.holes.push(c);const d=new Gs(r,{depth:s,bevelEnabled:!0,bevelThickness:.012,bevelSize:.01,bevelSegments:2});return d.translate(0,0,-s*.5),d}function t_(i,e,t=.018,n=20){const s=new Hs;s.absarc(0,0,e,0,Math.PI*2,!1);const r=new Us;r.absarc(0,0,i,0,Math.PI*2,!0),s.holes.push(r);const o=new Gs(s,{depth:t,bevelEnabled:!0,bevelThickness:.003,bevelSize:.003,bevelSegments:1});return o.rotateX(Math.PI*.5),o.translate(0,t*.5,0),o}function Gu(i=.09,e=.01,t=5){const n=[new kr(i,e,8,18)];for(let s=0;s<t;s++){const r=s/t*Math.PI*2;n.push(Zn(Ye(e*.7,e*.7,i*1.7,6),0,0,0,Math.PI*.5,0,r))}return n.push(Gr(e*1.8,8,6)),ul(n)}function Wr(i,e=20){return new rl(i.map(([t,n])=>new oe(t,n)),e)}function n_(i,e){const t=[[i*.35,-e*.5],[i*.92,-e*.42],[i,-e*.28],[i,e*.22],[i*.88,e*.34],[i*.55,e*.42],[i*.28,e*.5]];return Wr(t,28)}function i_(i,e){const t=[[i*.4,-e*.5],[i*.85,-e*.3],[i,-e*.1],[i*.95,e*.15],[i*.7,e*.35],[i*.45,e*.5]];return Wr(t,20)}function Uc(i){const e=i.index;if(e){const n=e.array;for(let s=0;s<n.length;s+=3){const r=n[s];n[s]=n[s+1],n[s+1]=r}e.needsUpdate=!0}const t=i.attributes.normal;if(t){for(let n=0;n<t.count;n++)t.setXYZ(n,-t.getX(n),-t.getY(n),-t.getZ(n));t.needsUpdate=!0}return i}function s_(i){const e=i.attributes.uv;return e&&i.setAttribute("uv2",new Vt(e.array,2)),i}new nt;const Vn=new Et;new D(1,0,0);new D(0,1,0);new D(0,0,1);function O(i,e){const t=new st(i,e);return t.castShadow=!1,t.receiveShadow=!0,t}function r_(i,e,t,n,s,r,o="z"){const a=Ye(.007,.007,.016,6),c=new hd(a,e.brushed,n);c.castShadow=!0;for(let l=0;l<n;l++){const u=l/n*Math.PI*2,h=Math.cos(u)*t,d=Math.sin(u)*t;o==="z"?(Vn.position.set(h,s+d,r),Vn.rotation.set(Math.PI*.5,0,0)):o==="y"?(Vn.position.set(h,s,r+d),Vn.rotation.set(0,0,0)):(Vn.position.set(s,d,r+h),Vn.rotation.set(0,0,Math.PI*.5)),Vn.updateMatrix(),c.setMatrixAt(l,Vn.matrix)}return c.instanceMatrix.needsUpdate=!0,i.add(c),c}function mt(i,e,t,n,s,r,o="z",a="pipe"){const c=new Ue,l=i[a]||i.pipe,u=O(Ye(r,r,s,10),l);o==="z"&&(u.rotation.x=Math.PI*.5),o==="x"&&(u.rotation.z=Math.PI*.5),u.position.set(e,t,n),c.add(u);const h=O(t_(r*.9,r*1.5,.014,10),i.brushed),d=h.clone();return o==="z"?(h.rotation.x=Math.PI*.5,d.rotation.x=Math.PI*.5,h.position.set(e,t,n-s*.5+.02),d.position.set(e,t,n+s*.5-.02)):o==="x"?(h.rotation.z=Math.PI*.5,d.rotation.z=Math.PI*.5,h.position.set(e-s*.5+.02,t,n),d.position.set(e+s*.5-.02,t,n)):(h.position.set(e,t-s*.5+.02,n),d.position.set(e,t+s*.5-.02,n)),c.add(h,d),c}function Nc(i,e){const t=new Ue;return t.add(O(Zn(ct(e*2.4,.016,.028),0,0,0),i.brushed)),t.add(O(Zn(ct(.012,.03,.012),e*1.15,-.02,0),i.brushed)),t.add(O(Zn(ct(.012,.03,.012),-e*1.15,-.02,0),i.brushed)),t}function zs(i,e=.032,t=.08){const n=new Ue,s=O(Gr(e*1.35,12,10),i.oily);n.add(s);const r=O(Ye(.01,.01,.08,8),i.brushed);r.position.y=e*1.2+.03,n.add(r);const o=O(Gu(t,.009,5),i.chipped);o.position.y=e*1.2+.08,o.rotation.x=Math.PI*.5,n.add(o);const a=O(Ye(e,e,.08,10),i.pipe);a.rotation.z=Math.PI*.5,a.position.x=-.06;const c=a.clone();return c.position.x=.06,n.add(a,c),n}function hl(i,e,t=.07){const n=new Ue,s=O(Ye(t,t*.92,.028,16),i.brushed);s.rotation.x=Math.PI*.5,n.add(s);const r=O(us(t*.92,.006,8,16),i.brushed);n.add(r);const o=O(Ye(t*.82,t*.82,.004,16),i.plastic);if(e){const l=i.plastic.clone();l.map=e,l.color.set(16777215),l.roughness=.35,o.material=l}o.rotation.x=Math.PI*.5,o.position.z=.012,n.add(o);const a=O(Ye(t*.8,t*.8,.006,16),i.glass);a.rotation.x=Math.PI*.5,a.position.z=.016,a.castShadow=!1,n.add(a);const c=O(ct(.004,t*.62,.003),i.oily);return c.position.set(0,t*.12,.015),c.rotation.z=-.4,n.add(c),n.userData.needle=c,n}function Qi(i,e,t=.16){const n=new Ue,s=O(fe(t,.018,e,.004,1),i.hullGreen);n.add(s);const r=O(ct(.01,.03,e),i.brushed);r.position.set(-t*.5,.02,0);const o=r.clone();o.position.x=t*.5,n.add(r,o);const a=O(Ye(.012,.012,e*.96,6),i.plastic);a.rotation.x=Math.PI*.5,a.position.set(-.03,.02,0);const c=a.clone();c.position.x=.01,c.material=i.bakelite;const l=a.clone();return l.position.x=.04,l.scale.set(.7,1,.7),n.add(a,c,l),n}function ks(i,e=.18,t=.22,n=.08){const s=new Ue;s.add(O(fe(e,t,n,.008,1),i.hullGreen));const r=O(fe(e*.86,t*.8,.012,.006,1),i.chipped);r.position.z=n*.5+.004,s.add(r);const o=O(ct(.018,.04,.016),i.brushed);o.position.set(e*.32,0,n*.5+.014),s.add(o);const a=O(Ye(.016,.016,.1,8),i.pipe);return a.position.set(0,t*.5+.04,0),s.add(a),s}function Xr(i,e=.22,t=.1){const n=new Ue;n.add(O(fe(e,t,.03,.006,1),i.brushed));for(let s=0;s<5;s++){const r=O(ct(e*.86,.006,.02),i.oily);r.position.set(0,-t*.32+s*.018,.01),r.rotation.x=-.35,n.add(r)}return n}function Fc(i,e=.09){const t=new Ue,n=O(Ye(e*1.08,e*1.08,.04,16,1,!0),i.brushed);n.rotation.x=Math.PI*.5,t.add(n);const s=O(us(e,.008,8,16),i.brushed);t.add(s);const r=O(Ye(.018,.018,.03,10),i.oily);r.rotation.x=Math.PI*.5,t.add(r);const o=new Ue;for(let a=0;a<5;a++){const c=O(ct(e*.85,.018,.006),i.plastic);c.position.x=e*.38;const l=new Ue;l.rotation.z=a/5*Math.PI*2,l.add(c),o.add(l)}return t.add(o),t.userData.rotor=o,t}function es(i,e,t=.92){const n=new Ue,s=O(Ye(.014,.014,e,8),i.brushed);s.rotation.x=Math.PI*.5,s.position.y=t,n.add(s);const r=Math.max(2,Math.floor(e/.7)+1);for(let o=0;o<r;o++){const a=r===1?0:o/(r-1),c=-e*.5+a*e,l=O(Ye(.012,.012,t,8),i.brushed);l.position.set(0,t*.5,c),n.add(l);const u=O(Ye(.03,.03,.012,10),i.chipped);u.position.set(0,.006,c),n.add(u)}return n}function yn(i,e,t=""){const n=new Ue,s=Jg(e,{sub:t,w:256,h:128,bg:"#b49a4a",fg:"#1c1608"}),r=O(fe(.16,.08,.006,.003,1),i.plastic),o=i.plastic.clone();return o.map=s,o.color.set(16777215),o.roughness=.45,r.material=o,n.add(r),n}function fi(i,e=.28,t=.2){const n=new Ue;n.add(O(fe(e,t,.018,.006,1),i.chipped));for(const[s,r]of[[-e*.4,t*.36],[e*.4,t*.36],[-e*.4,-t*.36],[e*.4,-t*.36]]){const o=O(Ye(.008,.008,.012,6),i.brushed);o.rotation.x=Math.PI*.5,o.position.set(s,r,.012),n.add(o)}return n}function ts(i,e,t){const n=new Ue,s=O(fe(e,.02,t,.004,1),i.grate);n.add(s);const r=[],o=Math.max(4,Math.floor(t/.045));for(let l=0;l<o;l++){const u=-t*.45+l/(o-1)*t*.9;r.push(Zn(ct(e*.92,.012,.012),0,.004,u))}const a=Math.max(2,Math.floor(e/.12));for(let l=0;l<a;l++){const u=-e*.4+l/Math.max(1,a-1)*e*.8;r.push(Zn(ct(.01,.01,t*.9),u,.002,0))}const c=O(ul(r),i.grate);return n.add(c),n}function dl(i,e,t){const n=new Ue,s=O(ct(e,.4,t),i.blackout);s.position.y=-.28,n.add(s);const r=O(ct(e*.9,.04,.04),i.oily);r.position.y=-.08,n.add(r);const o=mt(i,0,-.16,0,t*.8,.025,"z","pipeOrange");return n.add(o),n}function o_(i,e=.42){const t=new Ue,n=O(fe(.07,.04,e,.008,1),i.brushed);t.add(n);const s=O(fe(.05,.018,e*.86,.006,1),i.emissiveAmber);s.position.y=-.018,s.castShadow=!1,t.add(s);const r=O(ct(.002,.03,e*.8),i.brushed);r.position.set(.028,-.01,0);const o=r.clone();return o.position.x=-.028,t.add(r,o),t}function Uo(i,e=8){const t=new Ue;t.add(O(fe(e*.028+.04,.05,.04,.004,1),i.plastic));for(let n=0;n<e;n++){const s=O(ct(.012,.02,.01),i.bakelite);s.position.set(-e*.014+n*.028,.02,.01),s.rotation.x=n%3===0?-.4:.35,t.add(s)}return t}function a_(i,e=.16){const t=new Ue,n=O(Gu(e,.014,6),i.chipped);n.rotation.x=Math.PI*.5,t.add(n);const s=O(Ye(.03,.03,.04,10),i.brushed);return s.rotation.x=Math.PI*.5,t.add(s),t}function l_(i,e,t){const n=new Ue,s=O(fe(e*.96,t*.96,.05,.02,2),i.hull);n.add(s);const r=O(fe(e*.88,t*.88,.02,.018,1),i.chipped);r.position.z=.02,n.add(r);const o=a_(i,.13);o.position.z=.05,n.add(o);const a=O(Ye(.018,.018,t*.7,8),i.brushed);return a.position.set(-e*.5,0,0),n.add(a),n}function Wu(i,e=.16){const t=new Ue,n=O(Ye(e+.05,e+.055,.08,20),i.chipped);n.rotation.x=Math.PI*.5,t.add(n);const s=O(Ye(e+.02,e+.02,.03,18),i.brushed);s.rotation.x=Math.PI*.5,s.position.z=.02,t.add(s);const r=new st(new zr(e*.96,20),new Nt({color:6465712,fog:!1}));r.position.z=-.02,r.castShadow=!1,r.receiveShadow=!1,r.userData.noMerge=!0,t.add(r);const o=O(Ye(e,e,.024,18),i.glassThick);o.rotation.x=Math.PI*.5,o.position.z=.01,o.castShadow=!1,o.renderOrder=3,t.add(o);const a=O(us(e+.012,.008,8,18),i.rubber);return t.add(a),r_(t,i,e+.042,10,0,.03,"z"),t}function Oc(i){const e=new Ue,t=O(fe(.38,.06,.36,.02,2),i.leather);t.position.y=.46,e.add(t);const n=O(fe(.38,.42,.07,.02,2),i.leather);n.position.set(0,.7,-.16),n.rotation.x=-.12,e.add(n);const s=O(Ye(.07,.09,.42,10),i.brushed);s.position.y=.22,e.add(s);const r=O(fe(.28,.03,.28,.01,1),i.oily);r.position.y=.02,e.add(r);const o=O(ct(.04,.012,.3),i.rubber);o.position.set(.12,.5,0);const a=o.clone();return a.position.x=-.12,e.add(o,a),e}function c_(i,e){let t=i;for(;t;){if(e.has(t))return!0;const n=t.userData||{};if(n.interact||n.rotor||n.needle||n.noMerge||n.sonarTex)return!0;t=t.parent}return!1}function u_(i,e=new Set){i.updateMatrixWorld(!0);const t=new Map;i.traverse(s=>{if(s===i||!s.isMesh||s.isInstancedMesh||!s.geometry||!s.material||Array.isArray(s.material)||s.material.transparent||c_(s,e))return;const r=s.material.uuid;t.has(r)||t.set(r,{material:s.material,meshes:[]}),t.get(r).meshes.push(s)});let n=0;for(const{material:s,meshes:r}of t.values()){if(r.length<2)continue;const o=r.map(l=>{let u=l.geometry.clone();if(u.index){const h=u.toNonIndexed();u.dispose(),u=h}for(const h of Object.keys(u.attributes))h!=="position"&&h!=="normal"&&h!=="uv"&&u.deleteAttribute(h);return!u.attributes.uv&&u.attributes.position&&u.setAttribute("uv",new ht(u.attributes.position.count*2,2)),u.morphAttributes={},u.clearGroups&&u.clearGroups(),u.applyMatrix4(l.matrixWorld),u});let a=null;try{a=Hu(o,!1)}catch{a=null}if(o.forEach(l=>l.dispose()),!a)continue;const c=new st(a,s);c.castShadow=!1,c.receiveShadow=!0,c.frustumCulled=!0,c.userData.merged=!0,i.add(c);for(const l of r)l.removeFromParent();n+=1}return n}new D;new D;const Ut=new D;class h_{constructor(){this.boxes=[]}addBox(e,t,n,s,r,o){this.boxes.push({min:new D(e-s*.5,t-r*.5,n-o*.5),max:new D(e+s*.5,t+r*.5,n+o*.5)})}addAABB(e,t){this.boxes.push({min:e.clone(),max:t.clone()})}addBox3(e){this.boxes.push({min:e.min.clone(),max:e.max.clone()})}resolve(e,t,n){Ut.copy(e);const s=.02,r=n;let o=!1;for(let a=0;a<this.boxes.length;a++){const c=this.boxes[a];if(r<c.min.y||s>c.max.y)continue;const l=Math.max(c.min.x,Math.min(Ut.x,c.max.x)),u=Math.max(c.min.z,Math.min(Ut.z,c.max.z));let h=Ut.x-l,d=Ut.z-u;const f=h*h+d*d;if(!(f>=t*t))if(o=!0,f<1e-8){const g=Math.abs(Ut.x-c.min.x),_=Math.abs(c.max.x-Ut.x),m=Math.abs(Ut.z-c.min.z),p=Math.abs(c.max.z-Ut.z),S=Math.min(g,_,m,p);S===g?Ut.x=c.min.x-t:S===_?Ut.x=c.max.x+t:S===m?Ut.z=c.min.z-t:Ut.z=c.max.z+t}else{const g=Math.sqrt(f),_=(t-g)/g;Ut.x+=h*_,Ut.z+=d*_}}return e.copy(Ut),o}overlaps(e,t,n){const r=n;for(const o of this.boxes){if(r<o.min.y||.02>o.max.y)continue;const a=Math.max(o.min.x,Math.min(e.x,o.max.x)),c=Math.max(o.min.z,Math.min(e.z,o.max.z)),l=e.x-a,u=e.z-c;if(l*l+u*u<t*t)return!0}return!1}debugBox3s(){return this.boxes.map(e=>new Jn(e.min,e.max))}}function d_(i,e,t,n,s,r=.08){const o=Math.sqrt(Math.max(0,n*n-s*s))-r,a=(e+t)*.5,c=t-e;i.addBox(-o-.25,1,a,.5,2.2,c),i.addBox(o+.25,1,a,.5,2.2,c)}const Rs=new Map;function $n(i,e){const t=document.createElement("canvas");return t.width=i,t.height=e,t}function Qn(i){const e=new ls(i);return e.colorSpace=Rt,e.needsUpdate=!0,e}function hs(i,e,t,n="#0b120e"){i.fillStyle=n,i.fillRect(0,0,e,t),i.strokeStyle="#1c2a20",i.lineWidth=4,i.strokeRect(3,3,e-6,t-6)}function f_(){const i=$n(512,512),e=i.getContext("2d"),t=Qn(i);return t.userData={canvas:i,ctx:e,sweep:.2,ping:0},Xu(t,0),t}function Xu(i,e,t=0){const n=i.userData.ctx,s=512,r=512;n.fillStyle="#06140c",n.fillRect(0,0,s,r);const o=256,a=256;n.strokeStyle="#1a4a28",n.lineWidth=1;for(let h=40;h<=230;h+=38)n.beginPath(),n.arc(o,a,h,0,Math.PI*2),n.stroke();for(let h=0;h<12;h++){const d=h/12*Math.PI*2;n.beginPath(),n.moveTo(o,a),n.lineTo(o+Math.cos(d)*230,a+Math.sin(d)*230),n.stroke()}n.fillStyle="#6fbf7a",n.font="12px monospace",n.fillText("ACTIVE SONAR  ·  3.5 kHz",16,22),n.fillText("RNG  4.0 km",400,22),n.fillText("NO CONTACT",16,496);const c=e*.35%(Math.PI*2);n.createConicalGradient,n.save(),n.translate(o,a),n.rotate(c);const l=n.createLinearGradient(0,0,180,40);l.addColorStop(0,"rgba(80, 200, 110, 0.0)"),l.addColorStop(.7,"rgba(80, 200, 110, 0.08)"),l.addColorStop(1,"rgba(140, 230, 150, 0.45)"),n.fillStyle=l,n.beginPath(),n.moveTo(0,0),n.arc(0,0,230,-.18,.02),n.closePath(),n.fill(),n.restore(),t>0&&(n.strokeStyle=`rgba(160,240,170,${t})`,n.lineWidth=2,n.beginPath(),n.arc(o,a,40+(1-t)*200,0,Math.PI*2),n.stroke());const u=Ws(Ct+9);n.fillStyle="rgba(90,190,110,0.35)";for(let h=0;h<6;h++){const d=u()*Math.PI*2,f=50+u()*160;n.beginPath(),n.arc(o+Math.cos(d)*f,a+Math.sin(d)*f,2+u()*2,0,Math.PI*2),n.fill()}i.needsUpdate=!0}function Bc(){return Rs.get("nav")||Rs.set("nav",p_()).get("nav")}function p_(){const i=$n(512,384),e=i.getContext("2d");hs(e,512,384,"#0a1218"),e.strokeStyle="#2a4a52",e.lineWidth=1;for(let t=24;t<500;t+=28)e.beginPath(),e.moveTo(t,28),e.lineTo(t,360),e.stroke();for(let t=28;t<370;t+=24)e.beginPath(),e.moveTo(20,t),e.lineTo(492,t),e.stroke();return e.strokeStyle="#5aa8b0",e.lineWidth=2,e.beginPath(),e.moveTo(40,220),e.bezierCurveTo(140,160,220,250,320,180),e.bezierCurveTo(400,130,450,200,490,170),e.stroke(),e.fillStyle="#8fd0d4",e.beginPath(),e.arc(248,198,5,0,Math.PI*2),e.fill(),e.fillStyle="#c8e8e4",e.font="13px monospace",e.fillText("NAV CHART  ·  RV ARGENT  ·  SECTOR 14-C",16,20),e.fillText("HDG 247°   STN 0.4 kt   DPT 312 m",16,372),e.fillStyle="#6aa0a4",e.fillText("RIDGE",360,120),e.fillText("BASIN",80,280),Qn(i)}function zc(){const i=$n(256,512),e=i.getContext("2d");hs(e,256,512,"#0c100c"),e.fillStyle="#6fbf7a",e.font="14px monospace",e.fillText("DEPTH",16,28),e.font="42px monospace",e.fillText("312.4",16,80),e.font="14px monospace",e.fillText("METERS",16,108),e.strokeStyle="#2a5a34",e.beginPath(),e.moveTo(24,140);for(let t=0;t<20;t++)e.lineTo(24+t*10,260+Math.sin(t*.7)*18+t*2);return e.stroke(),e.fillStyle="#8fd89a",e.fillText("KEEL  18.2 m",16,470),e.fillText("CEIL  +94 m",16,494),Qn(i)}function m_(){const i=$n(512,160),e=i.getContext("2d");hs(e,512,160,"#10140e"),e.fillStyle="#d4a24a",e.font="16px monospace",e.fillText("GYRO  247.3°",16,28),e.strokeStyle="#8a7a40",e.beginPath(),e.moveTo(20,90),e.lineTo(492,90),e.stroke();const t=["N","030","060","E","120","150","S","210","240","W","300","330"];e.fillStyle="#c8b56a",e.font="12px monospace";for(let n=0;n<t.length;n++){const s=30+n*40;e.fillRect(s,78,2,14),e.fillText(t[n],s-10,70)}return e.fillStyle="#e8c86a",e.beginPath(),e.moveTo(256,100),e.lineTo(248,128),e.lineTo(264,128),e.fill(),Qn(i)}function g_(){const i=$n(384,256),e=i.getContext("2d");hs(e,384,256,"#0e120e");const t=[["HULL PRESS","NOMINAL","#6fbf7a"],["BATTERY","86%","#6fbf7a"],["O2 SCRUB","OK","#6fbf7a"],["BALLAST","TRIMMED","#d4a24a"],["PROPULSION","AHEAD 1/3","#6fbf7a"],["COMMS","VLF STANDBY","#5aa8b0"]];return e.font="15px monospace",t.forEach((n,s)=>{e.fillStyle="#8a9084",e.fillText(n[0],16,36+s*34),e.fillStyle=n[2],e.fillText(n[1],200,36+s*34)}),Qn(i)}function fl(i,e=100,t=42){const n=`gf:${i}:${t}`;if(Rs.has(n))return Rs.get(n);const s=$n(256,256),r=s.getContext("2d");r.fillStyle="#161410",r.beginPath(),r.arc(128,128,124,0,Math.PI*2),r.fill(),r.strokeStyle="#8a8068",r.lineWidth=6,r.stroke(),r.strokeStyle="#c8c0a8",r.lineWidth=2;for(let a=0;a<=10;a++){const c=Math.PI*.75+a/10*Math.PI*1.5;r.beginPath(),r.moveTo(128+Math.cos(c)*96,128+Math.sin(c)*96),r.lineTo(128+Math.cos(c)*112,128+Math.sin(c)*112),r.stroke()}r.fillStyle="#d8d0b8",r.font="14px sans-serif",r.textAlign="center",r.fillText(i,128,188),r.font="12px sans-serif",r.fillText(String(e),190,168),r.fillText("0",70,168);const o=Qn(s);return Rs.set(n,o),o}function kc(i=!1){const e=$n(384,256),t=e.getContext("2d");return hs(t,384,256,i?"#140808":"#100e0c"),t.fillStyle=i?"#d46a4a":"#d4a24a",t.font="16px monospace",t.fillText(i?"SILENT RUNNING":"PROPULSION CTRL",16,28),t.font="14px monospace",t.fillStyle=i?"#c88870":"#b8b09a",t.fillText(i?"RPM  42   FANS HOLD":"RPM  180   FANS RUN",16,64),t.fillText(i?"PUMPS  MIN":"PUMPS  NORMAL",16,92),t.fillText(i?"WORKLIGHTS  DIM":"WORKLIGHTS  ON",16,120),t.fillText("SHAFT  SEAL OK",16,160),t.fillText("GEAR OIL  68°C",16,188),t.fillText("E: TOGGLE MODE",16,232),Qn(e)}function __(){const i=$n(256,160),e=i.getContext("2d");hs(e,256,160,"#0c1010"),e.fillStyle="#5aa8b0",e.font="13px monospace",e.fillText("VLF  ·  CH-2",12,24),e.fillText("SYNC  18.4 kHz",12,48),e.fillStyle="#3a686c";for(let t=0;t<24;t++){const n=8+t*17%40;e.fillRect(12+t*9,130-n,6,n)}return Qn(i)}function v_(){const i=document.createElement("canvas");i.width=256,i.height=160;const e=i.getContext("2d"),t=e.createLinearGradient(0,0,0,160);t.addColorStop(0,"#8fd0da"),t.addColorStop(.45,"#3e8490"),t.addColorStop(1,"#16343c"),e.fillStyle=t,e.fillRect(0,0,256,160),e.fillStyle="rgba(18, 36, 40, 0.72)",e.beginPath(),e.moveTo(0,118),e.lineTo(70,88),e.lineTo(140,108),e.lineTo(256,78),e.lineTo(256,160),e.lineTo(0,160),e.fill(),e.fillStyle="rgba(230, 246, 248, 0.9)",e.beginPath(),e.arc(78,86,7,0,Math.PI*2),e.fill();for(let s=0;s<22;s++)e.fillStyle=`rgba(210, 236, 240, ${.25+s%3*.18})`,e.beginPath(),e.arc(s*53%256,s*37%150,1.4,0,Math.PI*2),e.fill();const n=new ls(i);return n.colorSpace=Rt,n.needsUpdate=!0,n}function Hn(i,e,t,n){const s=i.plastic.clone();return s.map=e,s.color.set(16777215),s.emissiveMap=e,s.emissive.set(6982256),s.emissiveIntensity=.85,s.roughness=.28,O(fe(t,n,.03,.006,1),s)}function x_(i,e,t,n){const s=new Ue;s.name="controlRoom";const r=Ze.rooms.control.z0,o=Ze.rooms.control.z1,a=(r+o)*.5,c=O(fe(1.22,.08,.14,.02,1),i.chipped);c.position.set(0,1.64,.38),s.add(c);const l=O(fe(1.22,.08,.14,.02,1),i.chipped);l.position.set(0,.92,.38),s.add(l);const u=O(fe(.08,.8,.14,.02,1),i.chipped);u.position.set(-.57,1.28,.38),s.add(u);const h=u.clone();h.position.x=.57,s.add(h);const d=O(fe(1.02,.06,.06,.015,1),i.brushed);d.position.set(0,1.6,.36),s.add(d);const f=O(fe(.96,.58,.03,.01,1),i.glassThick);f.position.set(0,1.28,.34),f.castShadow=!1,f.renderOrder=4,s.add(f);const g=O(fe(.94,.56,.02,.008,1),i.glass);g.position.set(0,1.28,.3),g.castShadow=!1,g.renderOrder=4,s.add(g);const _=new st(new dn(.92,.54),new Nt({map:v_(),fog:!1}));_.position.set(0,1.28,.2),_.userData.noMerge=!0,s.add(_);const m=O(fe(1,.04,.04,.01,1),i.rubber);m.position.set(0,1.28,.34),s.add(m);for(const[De,A]of[[-.55,1.6],[.55,1.6],[-.55,.96],[.55,.96],[0,1.64],[0,.92]]){const te=O(Ye(.012,.012,.03,8),i.brushed);te.rotation.x=Math.PI*.5,te.position.set(De,A,.38),s.add(te)}const p=O(fe(1.12,.08,.22,.02,1),i.hull);p.position.set(0,1.68,.32),s.add(p);const S=new Ue;S.add(O(fe(.72,.62,.48,.02,2),i.hullGreen)),S.position.set(.36,.55,1.55);const T=O(fe(.7,.04,.46,.01,1),i.chipped);T.position.set(0,.33,0),S.add(T);const x=O(Ye(.11,.11,.03,16),i.brushed);x.rotation.x=1.15,x.position.set(.08,.42,.16),S.add(x);for(let De=0;De<6;De++){const A=O(ct(.012,.1,.01),i.brushed);A.position.set(.08,.42,.16),A.rotation.z=De/6*Math.PI*2,A.rotation.x=1.15,S.add(A)}S.add(Uo(i,8)),S.children[S.children.length-1].position.set(-.16,.36,.12);const P=Hn(i,m_(),.42,.12);P.position.set(.08,.38,-.05),P.rotation.x=-.4,S.add(P);const w=Hn(i,zc(),.16,.28);w.position.set(.26,.22,.08),w.rotation.x=-.15,S.add(w),s.add(S);const R=new Ue;R.add(O(fe(.58,.7,.42,.02,2),i.hull)),R.position.set(.48,.58,2.55);const I=Hn(i,Bc(),.42,.3);I.position.set(0,.22,.12),I.rotation.x=-.35,R.add(I);const y=Hn(i,g_(),.36,.22);y.position.set(0,.02,.16),R.add(y),R.add(Uo(i,6)),R.children[R.children.length-1].position.set(0,.38,.1),s.add(R);const M=new Ue;M.add(O(fe(.62,.78,.46,.02,2),i.hullGreen)),M.position.set(-.46,.62,1.72);const C=f_(),F=Hn(i,C,.42,.42);F.position.set(0,.18,.14),F.rotation.x=-.28,M.add(F);const H=Hn(i,__(),.28,.16);H.position.set(.12,-.12,.18),M.add(H),M.add(Uo(i,7)),M.children[M.children.length-1].position.set(-.08,.42,.12),M.userData.interact="sonar",M.userData.prompt="E: Active Sonar Ping",M.userData.sonarTex=C,s.add(M),t.push(M),n.push({type:"sonar",tex:C,group:M});const X=Oc(i);X.position.set(.36,0,2.18),X.rotation.y=Math.PI,s.add(X);const L=Oc(i);L.position.set(-.46,0,2.35),L.rotation.y=Math.PI+.15,s.add(L);const U=O(fe(.9,.08,1.6,.015,1),i.chipped);U.position.set(0,2.02,2.1),s.add(U);for(let De=0;De<10;De++){const A=O(ct(.03,.02,.04),De%4===0?i.emissiveGreen:i.bakelite);A.position.set(-.35+De%5*.16,1.97,1.6+Math.floor(De/5)*.35),s.add(A)}const V=new Ue,G=O(Ye(.055,.06,1.1,14),i.brushed);G.position.y=1.35,V.add(G);const J=O(fe(.16,.1,.22,.02,2),i.oily);J.position.set(0,1.85,.04),V.add(J);const se=O(Ye(.03,.03,.08,10),i.plastic);se.rotation.x=Math.PI*.5,se.position.set(0,1.55,.1),V.add(se),V.position.set(.52,0,1.35),s.add(V);for(const[De,A,te,Q]of[[.55,1.35,1.25,"HYD"],[.62,1.15,1.4,"AIR"],[-.62,1.42,2.4,"PSI"],[.58,1.48,2.15,"V"]]){const j=hl(i,fl(Q,100,40+Q.length*3),.05);j.position.set(De,A,te),j.rotation.y=De>0?-.5:.5,s.add(j)}s.add(mt(i,-.72,1.85,a,3.2,.028,"z","pipe")),s.add(mt(i,-.72,1.72,a,3.2,.02,"z","pipeBlue")),s.add(mt(i,.74,1.88,a,3.1,.025,"z","pipeOrange"));const de=Qi(i,3,.18);de.position.set(.08,2.05,a),s.add(de);const Te=es(i,1.6,.88);Te.position.set(-.62,0,2.6),s.add(Te);const Be=ts(i,.42,.7);Be.position.set(.02,.03,3.2),s.add(Be);const ze=dl(i,.4,.66);ze.position.set(.02,0,3.2),s.add(ze);const Ve=ks(i,.16,.2,.07);Ve.position.set(.7,1.35,3.4),Ve.rotation.y=-Math.PI*.5,s.add(Ve);const Y=fi(i,.24,.18);Y.position.set(-.7,.85,3.5),Y.rotation.y=Math.PI*.5,s.add(Y);const ee=Xr(i,.2,.08);ee.position.set(.2,1.95,3.6),s.add(ee);const _e=yn(i,"CONTROL","DECK 1");_e.position.set(.55,1.72,3.95),s.add(_e);const Se=Hn(i,Bc(),.36,.24);Se.position.set(-.62,1.42,2.95),Se.rotation.y=.55,s.add(Se);const ve=Hn(i,zc(),.14,.26);ve.position.set(.66,1.38,2.05),ve.rotation.y=-.6,s.add(ve);const Ne=O(fe(.2,.16,.16,.01,1),i.plastic);Ne.position.set(-.55,1.15,2.85),s.add(Ne);for(let De=0;De<3;De++){const A=O(Ye(.012,.012,.02,8),i.bakelite);A.position.set(-.6+De*.04,1.2,2.93),s.add(A)}return e.addBox(.36,.45,1.55,.62,.9,.48),e.addBox(.48,.5,2.55,.5,.95,.4),e.addBox(-.46,.5,1.72,.52,1,.42),e.addBox(.36,.45,2.18,.36,.9,.36),e.addBox(-.46,.45,2.35,.36,.9,.36),e.addBox(.42,1,1.12,.16,2,.2),e.addBox(0,1.2,.18,1.1,1.4,.16),s}function M_(i,e,t,n){const s=new Ue;s.name="corridor";const r=Ze.rooms.corridor.z0,o=Ze.rooms.corridor.z1,a=(r+o)*.5,c=o-r;s.add(mt(i,-.7,1.82,a,c-.2,.038,"z","pipe")),s.add(mt(i,-.7,1.62,a,c-.2,.024,"z","pipeBlue")),s.add(mt(i,-.68,1.46,a,c-.35,.018,"z","pipe")),s.add(mt(i,.7,1.86,a,c-.15,.03,"z","pipeOrange")),s.add(mt(i,.72,1.66,a,c-.25,.02,"z","pipe")),s.add(mt(i,.58,2,a,c-.3,.016,"z","pipeBlue"));for(const U of[4.9,5.8,6.7,7.5]){const V=Nc(i,.038);V.position.set(-.7,1.82,U);const G=Nc(i,.03);G.position.set(.7,1.86,U),s.add(V,G)}const l=Qi(i,c-.3,.2);l.position.set(.05,2.06,a),s.add(l);const u=Qi(i,c-.5,.12);u.position.set(-.22,2.04,a+.1),s.add(u);const h=es(i,c-.5,.9);h.position.set(-.48,0,a),s.add(h);const d=es(i,c-.5,.9);d.position.set(.48,0,a),s.add(d);const f=Wu(i,.15);f.position.set(.78,1.32,6.55),f.rotation.y=-Math.PI*.5,s.add(f);const g=O(fe(.06,.42,.08,.012,1),i.chipped);g.position.set(.68,1.32,6.32),s.add(g);const _=g.clone();_.position.z=6.78,s.add(_);const m=ts(i,.5,.7);m.position.set(0,.03,5.4),s.add(m);const p=dl(i,.48,.66);p.position.set(0,0,5.4),s.add(p);const S=ts(i,.5,.55);S.position.set(0,.03,7.15),s.add(S);const T=ks(i,.18,.22,.08);T.position.set(.68,1.15,5.15),T.rotation.y=-Math.PI*.5,s.add(T);const x=ks(i,.16,.18,.07);x.position.set(-.68,1.22,6.9),x.rotation.y=Math.PI*.5,s.add(x);const P=fi(i,.26,.2);P.position.set(-.7,.72,5.5),P.rotation.y=Math.PI*.5,s.add(P);const w=fi(i,.22,.16);w.position.set(.7,.68,7.4),w.rotation.y=-Math.PI*.5,s.add(w);const R=Xr(i,.24,.09);R.position.set(.18,1.92,6.2),s.add(R);const I=zs(i,.03,.07);I.position.set(-.62,1.42,6.2),I.rotation.z=Math.PI*.5,s.add(I);const y=O(fe(.2,.55,.32,.012,1),i.hullGreen);y.position.set(.62,.32,5.7),s.add(y);const M=O(fe(.02,.08,.02,.004,1),i.brushed);M.position.set(.52,.34,5.7),s.add(M);const C=yn(i,"FWD","CONTROL");C.position.set(-.42,1.78,4.55),s.add(C);const F=yn(i,"AFT","CREW");F.position.set(.42,1.78,7.95),s.add(F);const H=yn(i,"KEEP CLEAR","HATCH");H.position.set(.55,.95,6.1),H.rotation.y=-Math.PI*.5,s.add(H);const X=O(fe(.12,.01,.18,.003,1),i.oily);X.position.set(.28,.03,6.4),s.add(X);const L=O(fe(1.2,.04,.04,.008,1),i.brushed);L.position.set(0,1.98,6.3),s.add(L);for(const U of[5.2,6,6.8,7.55]){const V=fi(i,.22,.16);V.position.set(-.72,1.05,U),V.rotation.y=Math.PI*.5,s.add(V);const G=fi(i,.2,.14);G.position.set(.72,.95,U+.18),G.rotation.y=-Math.PI*.5,s.add(G)}return e.addBox(-.48,.45,a,.08,.9,c-.6),e.addBox(.48,.45,a,.08,.9,c-.6),e.addBox(.62,.32,5.7,.22,.6,.34),e.addBox(.78,1.32,6.55,.16,.5,.4),s}function S_(i,e,t){const n=new dn(e,t,18,14),s=n.attributes.position;for(let o=0;o<s.count;o++){const a=s.getX(o),c=s.getY(o),l=Math.sin(a*9+c*4)*.012+Math.sin(c*11)*.01;s.setZ(o,l+Math.abs(a)*.01)}n.computeVertexNormals();const r=new st(n,i.fabric);return r.rotation.x=-Math.PI*.5,r.castShadow=!0,r.receiveShadow=!0,r}function y_(i){const e=O(fe(.2,.06,.16,.03,2),i.fabric);return e.scale.set(1,.85,1),e}function E_(i,e=!0){const t=new Ue,n=O(fe(.72,.06,1.85,.012,1),i.brushed);n.position.y=.02,t.add(n);const s=O(fe(.72,.08,.03,.008,1),i.chipped);s.position.set(0,.08,.91),t.add(s);const r=s.clone();r.position.z=-.91,t.add(r);const o=O(fe(.68,.08,1.78,.03,2),i.foam);o.position.y=.08,t.add(o);const a=S_(i,.66,1.5);a.position.set(0,.13,.08),t.add(a);const c=y_(i);c.position.set(.02,.16,-.72),t.add(c);const l=O(ct(.62,.012,.03),i.rubber);l.position.set(0,.15,.35),t.add(l);const u=O(fe(.02,.42,.7,.01,1),i.fabric);u.position.set(.36,.32,.1),t.add(u);const h=O(Ye(.02,.02,.03,8),i.emissiveAmber);h.position.set(-.28,.38,-.7),t.add(h);const d=O(fe(.16,.12,.22,.008,1),i.hullGreen);return d.position.set(.26,.08,.7),t.add(d),t}function T_(i,e,t,n){const s=new Ue;s.name="crewQuarters";const r=Ze.rooms.crew.z0,o=Ze.rooms.crew.z1,a=(r+o)*.5,c=[];[[-.5,.18,9.2],[-.5,1.05,9.2],[-.5,.18,11.2],[-.5,1.05,11.2]].forEach(Ne=>{const De=E_(i);De.position.set(Ne[0],Ne[1],Ne[2]),s.add(De),c.push(De),e.addBox(Ne[0],Ne[1]+.2,Ne[2],.72,.45,1.85)});const u=c[0];u.userData.interact="rest",u.userData.prompt="E: Rest",t.push(u);const h=O(fe(.05,1.85,.05,.01,1),i.brushed);h.position.set(-.72,.95,10.15);const d=h.clone();d.position.z=9.15;const f=h.clone();f.position.z=11.15,s.add(h,d,f);const g=O(fe(.28,1.15,.85,.012,1),i.hullGreen);g.position.set(.62,.6,9.35),s.add(g);for(let Ne=0;Ne<4;Ne++){const De=O(fe(.02,.48,.18,.006,1),i.chipped);De.position.set(.48,Ne<2?.85:.32,9.05+Ne%2*.42),s.add(De);const A=O(ct(.012,.04,.012),i.brushed);A.position.copy(De.position),A.position.x-=.02,s.add(A)}const _=yn(i,"LOCKER","01-04");_.position.set(.48,1.28,9.35),_.rotation.y=-Math.PI*.5,s.add(_);const m=new Ue,p=O(fe(.42,.03,.55,.01,1),i.chipped);p.position.y=.72,m.add(p);const S=O(ct(.42,.02,.03),i.brushed);S.position.set(0,.7,-.26),m.add(S);const T=O(ct(.03,.28,.03),i.brushed);T.position.set(.16,.56,.1),m.add(T),m.position.set(.42,0,10.55),s.add(m);const x=O(fe(.22,.08,.5,.02,2),i.leather);x.position.set(.22,.42,10.55),s.add(x);const P=O(fe(.2,.38,.2,.01,1),i.brushed);P.position.set(.22,.2,10.55),s.add(P);const w=new Ue;w.add(O(fe(.42,.72,.7,.015,1),i.hull)),w.position.set(.55,.4,12.15);const R=O(fe(.42,.04,.7,.01,1),i.brushed);R.position.set(0,.38,0),w.add(R);const I=O(fe(.2,.06,.18,.02,2),i.brushed);I.position.set(.02,.4,-.12),w.add(I);const y=O(fe(.16,.04,.14,.015,1),i.ceramic);y.position.set(.02,.38,-.12),w.add(y);const M=O(Ye(.01,.01,.12,8),i.brushed);M.position.set(.08,.48,-.12),w.add(M);const C=O(Ye(.008,.008,.08,8),i.brushed);C.rotation.z=Math.PI*.5,C.position.set(.03,.53,-.12),w.add(C);const F=O(fe(.38,.28,.02,.006,1),i.chipped);F.position.set(-.2,.05,.2),w.add(F);const H=O(ct(.08,.012,.012),i.brushed);H.position.set(-.2,.05,.22),w.add(H);const X=O(fe(.28,.55,.28,.012,1),i.hullGreen);X.position.set(.02,.55,.18),w.add(X);const L=O(Ye(.025,.02,.05,10),i.ceramic);L.position.set(-.1,.44,.18),w.add(L);const U=O(Ye(.025,.02,.05,10),i.plastic);U.position.set(-.16,.44,.22),w.add(U),s.add(w);const V=new Ue;V.add(O(fe(.36,1.5,.55,.015,1),i.hull)),V.position.set(.58,.78,12.75);const G=O(fe(.2,.22,.01,.004,1),i.glassThick);G.position.set(-.18,.45,0),V.add(G);const J=O(fe(.22,.24,.016,.006,1),i.brushed);J.position.set(-.18,.45,-.01),V.add(J);const se=O(fe(.2,.08,.18,.02,2),i.ceramic);se.position.set(-.12,-.05,.05),V.add(se);const de=O(fe(.04,.22,.12,.02,2),i.fabric);de.position.set(-.16,.15,.18),V.add(de);const Te=O(fe(.2,.28,.22,.03,2),i.ceramic);Te.position.set(.02,-.4,-.08),V.add(Te),s.add(V);const Be=Wu(i,.12);Be.position.set(.78,1.38,10.7),Be.rotation.y=-Math.PI*.5,s.add(Be),s.add(mt(i,-.72,1.88,a,4.4,.026,"z","pipe")),s.add(mt(i,.72,1.9,a,4.2,.02,"z","pipeBlue"));const ze=Qi(i,4.3,.16);ze.position.set(0,2.06,a),s.add(ze);const Ve=Xr(i,.2,.08);Ve.position.set(.15,1.94,10.2),s.add(Ve);const Y=ks(i,.14,.16,.06);Y.position.set(.7,1.55,10.15),Y.rotation.y=-Math.PI*.5,s.add(Y);const ee=ts(i,.36,.5);ee.position.set(.05,.03,10.55),s.add(ee);const _e=es(i,1.2,.88);_e.position.set(.12,0,9),s.add(_e);const Se=yn(i,"CREW","BERTH");Se.position.set(.5,1.75,8.4),s.add(Se);const ve=fi(i,.2,.14);return ve.position.set(-.72,.55,10.2),ve.rotation.y=Math.PI*.5,s.add(ve),e.addBox(.62,.6,9.35,.3,1.2,.88),e.addBox(.42,.5,10.55,.45,.85,.55),e.addBox(.55,.5,12.15,.45,.9,.72),e.addBox(.58,.78,12.75,.38,1.5,.55),s}function b_(i){const e=new Ue,t=O(n_(.4,1.35),i.oily);t.rotation.x=Math.PI*.5,t.castShadow=!0,e.add(t);const n=O(Ye(.28,.38,.22,24),i.oily);n.rotation.x=Math.PI*.5,n.position.z=-.76,e.add(n);const s=O(Ye(.4,.22,.2,24),i.oily);s.rotation.x=Math.PI*.5,s.position.z=.76,e.add(s);const r=new Ue;for(let d=0;d<16;d++){const f=d/16*Math.PI*2,g=O(fe(.018,.085,.7,.004,1),i.oily);g.position.set(Math.cos(f)*.435,Math.sin(f)*.435,.02),g.rotation.z=f,r.add(g)}e.add(r);for(const d of[-.55,.05,.48]){const f=O(us(.43,.018,8,24),i.brushed);f.position.z=d,e.add(f)}const o=O(fe(.28,.18,.02,.006,1),i.chipped);o.position.set(0,.32,.1),o.rotation.x=-.4,e.add(o);const a=O(fe(.7,.12,1.4,.02,1),(i.gunmetal,i.oily));a.position.y=-.48,e.add(a);const c=O(fe(.16,.1,1.2,.015,1),i.chipped);c.position.set(-.32,-.52,0);const l=c.clone();l.position.x=.32,e.add(c,l);const u=O(Ye(.07,.07,.7,16),i.brushed);u.rotation.x=Math.PI*.5,u.position.z=1.05,e.add(u);const h=O(Ye(.11,.11,.12,12),i.oily);return h.rotation.x=Math.PI*.5,h.position.z=.78,e.add(h),e.userData.vibrate=t,e}function w_(i){const e=new Ue,t=O(fe(.62,.48,.55,.04,2),i.oily);e.add(t);const n=O(fe(.42,.36,.4,.03,2),i.oily);n.position.set(0,.12,.38),e.add(n);const s=O(fe(.28,.28,.03,.01,1),i.brushed);s.position.set(.32,.05,0),e.add(s);const r=O(Ye(.04,.04,.02,12),i.glass);return r.rotation.z=Math.PI*.5,r.position.set(.34,.05,.12),e.add(r),e}function Vc(i,e=1){const t=new Ue,n=O(i_(.14*e,.32*e),(i.machineBlue,i.pipeBlue));n.rotation.z=Math.PI*.5,t.add(n);const s=O(us(.1*e,.045*e,10,16),i.oily);s.position.x=.06*e,t.add(s);const r=O(Ye(.08*e,.08*e,.2*e,14),i.oily);r.rotation.z=Math.PI*.5,r.position.x=-.18*e,t.add(r);const o=O(fe(.36*e,.05*e,.2*e,.01,1),i.chipped);o.position.y=-.16*e,t.add(o);const a=mt(i,.16*e,.02,0,.22*e,.03*e,"z","pipe");return t.add(a),t.userData.spin=r,t}function A_(i){const e=new Ue,t=O(Ye(.11,.11,.55,16),i.pipeBlue);t.rotation.z=Math.PI*.5,e.add(t);const n=O(fe(.2,.18,.18,.02,2),i.oily);n.position.x=-.28,e.add(n);const s=O(Ye(.07,.07,.03,12),i.rubber);s.rotation.z=Math.PI*.5,s.position.set(-.38,.02,0),e.add(s);const r=O(fe(.7,.06,.24,.012,1),i.chipped);return r.position.y=-.16,e.add(r),e}function yr(i,e=.42,t=1.15,n=.22){const s=new Ue;s.add(O(fe(e,t,n,.012,1),i.hullGreen));const r=O(fe(e*.9,t*.86,.02,.008,1),i.chipped);r.position.z=n*.5+.008,s.add(r);for(let l=0;l<3;l++){const u=O(ct(e*.7,.012,.01),i.brushed);u.position.set(0,t*.28-l*.08,n*.5+.02),s.add(u)}const o=O(ct(.03,.03,.01),i.emissiveGreen);o.position.set(e*.32,t*.38,n*.5+.02),s.add(o);const a=O(ct(.018,.1,.02),i.brushed);a.position.set(e*.36,0,n*.5+.02),s.add(a);const c=O(fe(e+.04,.06,n+.04,.01,1),i.oily);return c.position.y=-t*.5-.02,s.add(c),s}function C_(i){const e=new Ue,t=O(fe(.7,.62,.38,.012,1),i.oily);e.add(t);for(let n=0;n<6;n++){const s=O(fe(.18,.16,.14,.01,1),i.plastic);s.position.set(-.2+n%3*.2,n<3?.12:-.1,.08),e.add(s);const r=O(Ye(.012,.012,.03,6),i.brushed);r.position.copy(s.position),r.position.y+=.1,e.add(r)}return e}function R_(i){const e=new Ue,t=O(Ye(.12,.12,.7,16),i.pipe);t.rotation.z=Math.PI*.5,e.add(t);for(let n=0;n<8;n++){const s=O(Ye(.15,.15,.012,14),i.brushed);s.rotation.z=Math.PI*.5,s.position.x=-.28+n*.08,e.add(s)}return e}function P_(i){const e=new Ue;e.add(O(fe(.36,.7,.22,.01,1),i.hullGreen));for(let t=0;t<3;t++){const n=O(fe(.32,.16,.02,.006,1),i.chipped);n.position.set(0,.2-t*.2,.12),e.add(n);const s=O(ct(.08,.012,.016),i.brushed);s.position.set(0,.2-t*.2,.14),e.add(s)}return e}function Hc(i){const e=new Ue,t=zs(i,.03,.07);t.position.set(-.12,0,0);const n=zs(i,.028,.06);n.position.set(.08,.02,.05),n.rotation.y=.4,e.add(t,n),e.add(mt(i,0,0,0,.4,.028,"x","pipeOrange"));const s=hl(i,fl("BAR",40,18),.045);return s.position.set(.16,.12,0),e.add(s),e}function D_(i){const e=new Ue,t=O(Gr(.16,16,12),i.pipe);t.scale.set(1,1.15,1),e.add(t);const n=O(us(.16,.012,8,16),i.brushed);e.add(n);const s=O(Ye(.03,.03,.1,10),i.brushed);return s.position.y=.2,e.add(s),e}function I_(i){const e=new Ue,t=O(Ye(.01,.01,.28,8),i.brushed);t.rotation.z=.6,e.add(t);const n=O(Gr(.035,10,8),i.brushed);n.position.set(.12,.1,0),e.add(n);const s=O(Ye(.028,.028,.01,10),i.emissiveAmber);return s.position.set(.14,.1,.02),s.rotation.x=Math.PI*.5,e.add(s),e}function L_(i,e,t,n){const s=new Ue;s.name="engineRoom";const r=(Ze.rooms.passage.z0+Ze.rooms.passage.z1)*.5;s.add(mt(i,-.7,1.8,r,2.8,.034,"z","pipe")),s.add(mt(i,.7,1.84,r,2.8,.028,"z","pipeOrange")),s.add(mt(i,-.7,1.58,r,2.6,.02,"z","pipeBlue"));const o=Qi(i,2.7,.18);o.position.set(.05,2.05,r),s.add(o);const a=yr(i,.36,1.05,.2);a.position.set(.58,.62,13.7),s.add(a);const c=yr(i,.32,.95,.18);c.position.set(.6,.56,14.35),s.add(c);const l=C_(i);l.position.set(-.48,.38,14.6),s.add(l);const u=ks(i,.16,.2,.08);u.position.set(-.7,1.25,13.9),u.rotation.y=Math.PI*.5,s.add(u);const h=yn(i,"HIGH VOLT","ISOLATE");h.position.set(.48,1.35,13.7),h.rotation.y=-.4,s.add(h),e.addBox(.58,.62,13.7,.38,1.1,.24),e.addBox(.6,.56,14.35,.34,1,.22),e.addBox(-.48,.38,14.6,.72,.7,.4);const d=b_(i);d.position.set(.28,.72,19.85),s.add(d),n.push({type:"vibrate",object:d,amp:.0012});const f=w_(i);f.position.set(.28,.55,18.85),s.add(f);const g=O(Ye(.09,.09,.9,14),i.brushed);g.rotation.x=Math.PI*.5,g.position.set(.28,.55,20.85),s.add(g);const _=O(fe(.22,.18,.16,.02,2),i.oily);_.position.set(.28,.42,21.25),s.add(_);const m=Vc(i,1.05);m.position.set(-.48,.38,17.4),s.add(m),n.push({type:"spin",object:m.userData.spin,speed:8});const p=Vc(i,.9);p.position.set(-.52,.36,18.15),p.rotation.y=.3,s.add(p),n.push({type:"spin",object:p.userData.spin,speed:6.5});const S=A_(i);S.position.set(-.42,.4,19.15),s.add(S);const T=R_(i);T.position.set(.55,1.15,17.6),s.add(T);const x=D_(i);x.position.set(-.55,1.35,20.15),s.add(x);const P=yr(i,.38,1.2,.2);P.position.set(.62,.68,17.15),s.add(P);const w=P_(i);w.position.set(.6,.4,16.55),s.add(w);const R=Hc(i);R.position.set(-.55,.85,17.85),s.add(R);const I=zs(i,.034,.08);I.position.set(-.62,1.15,19.55),s.add(I);const y=zs(i,.03,.07);y.position.set(.58,.95,19.35),s.add(y),s.add(mt(i,-.62,1.72,18.8,4.6,.04,"z","pipe")),s.add(mt(i,-.62,1.52,18.9,4.2,.026,"z","pipeOrange")),s.add(mt(i,.68,1.78,18.7,4.4,.03,"z","pipeBlue")),s.add(mt(i,.48,.28,19.2,3.2,.032,"z","pipeOrange")),s.add(mt(i,-.2,.22,19,2.8,.028,"z","pipe"));const M=mt(i,-.62,1.1,18.4,.9,.03,"y","pipe");s.add(M);const C=Qi(i,5,.2);C.position.set(.02,2.06,18.8),s.add(C);const F=Fc(i,.09);F.position.set(-.15,1.92,17.8),F.rotation.x=Math.PI*.5,s.add(F),n.push({type:"spin",object:F.userData.rotor,speed:4.2});const H=Fc(i,.08);H.position.set(.22,1.9,20.4),H.rotation.x=Math.PI*.5,s.add(H),n.push({type:"spin",object:H.userData.rotor,speed:3.6});const X=O(fe(.42,.04,2.2,.01,1),i.grate);X.position.set(-.08,.92,19.6),s.add(X);const L=es(i,2.1,.42);L.position.set(-.26,.92,19.6),s.add(L);const U=es(i,2.1,.42);U.position.set(.12,.92,19.6),s.add(U);const V=O(fe(.28,.08,.36,.01,1),i.chipped);V.position.set(-.08,.42,18.35),s.add(V);const G=O(fe(.28,.08,.3,.01,1),i.chipped);G.position.set(-.08,.68,18.55),s.add(G);const J=ts(i,.55,.8);J.position.set(-.15,.03,17.7),s.add(J);const se=dl(i,.52,.76);se.position.set(-.15,0,17.7),s.add(se);const de=ts(i,.4,.55);de.position.set(-.2,.03,20.5),s.add(de);const Te=kc(!1),Be=kc(!0),ze=i.plastic.clone();ze.map=Te,ze.color.set(16777215),ze.emissiveMap=Te,ze.emissive.set(9072704),ze.emissiveIntensity=.22;const Ve=O(fe(.36,.28,.06,.01,1),ze),Y=new Ue;Y.add(Ve);const ee=O(fe(.4,.42,.12,.015,1),i.hullGreen);ee.position.z=-.04,Y.add(ee),Y.position.set(-.15,1.25,16.55),Y.userData.interact="silentRunning",Y.userData.prompt="E: Silent Running",Y.userData.panelMat=ze,Y.userData.panelTex=Te,Y.userData.panelTexSilent=Be,s.add(Y),t.push(Y);for(const[pe,re,me,Ge]of[[-.58,1.05,18.55,"OIL"],[.52,1.05,18.75,"CW"],[-.5,.72,20.35,"AIR"],[.48,.85,20.55,"PSI"]]){const Fe=hl(i,fl(Ge,80,30),.045);Fe.position.set(pe,re,me),s.add(Fe),n.push({type:"needle",object:Fe.userData.needle,speed:.4})}const _e=I_(i);_e.position.set(.45,1.35,19.6),s.add(_e);const Se=Xr(i,.22,.1);Se.position.set(.1,1.95,18.9),s.add(Se);const ve=fi(i,.24,.18);ve.position.set(.7,.55,20.15),ve.rotation.y=-Math.PI*.5,s.add(ve);const Ne=yn(i,"PROPULSION","NO STEP");Ne.position.set(.15,1.55,21.15),s.add(Ne);const De=yn(i,"ROTATING","MACHINERY");De.position.set(-.55,1.55,16.4),s.add(De),s.add(mt(i,.18,1.35,19.1,1.8,.034,"z","pipeOrange")),s.add(mt(i,-.28,1.42,18.9,1.6,.028,"z","pipeBlue"));const A=Hc(i);A.position.set(.02,.72,18.35),s.add(A);const te=O(fe(1.3,.06,.06,.01,1),i.oily);te.position.set(0,1.98,18.4),s.add(te);const Q=te.clone();Q.position.z=20.2,s.add(Q);const j=O(fe(2.35,2.15,.14,.02,1),i.hull);j.position.set(0,.95,21.72),s.add(j);const $=yr(i,.3,.8,.16);return $.position.set(-.45,.5,21.45),s.add($),e.addBox(.36,.7,19.85,.62,1.2,1.7),e.addBox(.32,.55,18.85,.58,.7,.6),e.addBox(-.48,.4,17.4,.5,.55,.5),e.addBox(-.52,.4,18.15,.45,.5,.45),e.addBox(-.42,.4,19.15,.75,.5,.35),e.addBox(.62,.68,17.15,.4,1.25,.24),e.addBox(.6,.4,16.55,.38,.75,.24),e.addBox(.18,1.15,19.6,.36,.5,2.2),e.addBox(0,1,21.72,1.6,1.8,.2),e.addBox(-.15,1.1,16.55,.42,.5,.16),s}function U_(i){const e=new Ue,t=Ze.length,n=Ze.hullRadius,s=t-.55,r=new ji(n,n,s,48,12,!0);r.rotateX(Math.PI*.5),Uc(r),s_(r);const o=O(r,i.hull);o.position.set(0,Ze.hullCenterY,.55+s*.5),e.add(o);const a=O(e_(n-.01,1.02,.64,1.28-Ze.hullCenterY,.1),i.chipped);a.position.set(0,Ze.hullCenterY,.36),e.add(a);const c=new ji(n*.7,n,.8,32,3,!0);c.rotateX(-Math.PI*.5),Uc(c);const l=O(c,i.hull);l.position.set(0,Ze.hullCenterY,t-.15),e.add(l);const u=O(new zr(n*.72,28),i.hull);return u.rotation.y=Math.PI,u.position.set(0,Ze.hullCenterY,t+.22),e.add(u),e}function N_(i){const e=new Ue,t=Ze.length-.3,n=Wg(.02)*2-.04,s=O(fe(n,.035,t,.006,1),i.deck);s.position.set(0,.018,Ze.length*.5),e.add(s);const r=O(fe(n*.96,.08,t,.004,1),i.oily);r.position.set(0,-.04,Ze.length*.5),e.add(r);const o=O(fe(.04,.06,t,.006,1),i.chipped);o.position.set(-n*.42,-.01,Ze.length*.5);const a=o.clone();return a.position.x=n*.42,e.add(o,a),e}function F_(i){const e=new Ue,t=Ze.hullRadius-.02;for(let n=.7;n<Ze.length-.4;n+=.72){const s=O($g(t,.04,.055,.014,40,-.02),i.chipped);s.position.set(0,Ze.hullCenterY,n),e.add(s)}return e}function Er(i,e,t=1){const n=new Ue,s=Ze.hullRadius-.01,r=O(Lc(s,Ze.hatchWidth,Ze.hatchHeight,Ze.hatchSill-Ze.hullCenterY+.08,.07),i.hull);r.position.set(0,Ze.hullCenterY,e),n.add(r);const o=O(Lc(s*.99,Ze.hatchWidth-.04,Ze.hatchHeight-.04,Ze.hatchSill-Ze.hullCenterY+.1,.03),i.chipped);o.position.set(0,Ze.hullCenterY,e+.04),n.add(o);const a=l_(i,Ze.hatchWidth,Ze.hatchHeight);a.position.set(t*(Ze.hatchWidth*.72),Ze.hatchHeight*.48,e+.12),a.rotation.y=t*1.35,n.add(a);const c=O(fe(Ze.hatchWidth+.08,.05,.16,.01,1),i.chipped);c.position.set(0,.03,e),n.add(c);const l=yn(i,"WATERTIGHT",`FR ${Math.round(e)}`);return l.position.set(-.42,1.72,e+.05),n.add(l),n}function O_(i,e){const t=new Ue;t.name="submarine";const n=new h_;t.add(U_(e)),t.add(N_(e)),t.add(F_(e));const s=Ze.rooms;t.add(Er(e,s.control.z1,1)),t.add(Er(e,s.corridor.z1,-1)),t.add(Er(e,s.crew.z1,1)),t.add(Er(e,s.passage.z1,-1)),d_(n,.1,Ze.length-.2,Ze.hullRadius,Ze.hullCenterY,.1),n.addBox(0,1.1,-.15,2.4,2.2,.3),n.addBox(0,1.1,Ze.length+.05,2.4,2.2,.3);const r=[],o=[],a=x_(e,n,r,o),c=M_(e,n),l=T_(e,n,r),u=L_(e,n,r,o);t.add(a,c,l,u);for(const d of[1.4,3.1,5.5,7.1,9.4,11.6,14.4,17.6,19.8]){const f=o_(e,.38);f.position.set(0,2.08,d),t.add(f)}const h=new Set(r);for(const d of o)d.object&&h.add(d.object),d.group&&h.add(d.group);return u_(t,h),i.add(t),{root:t,collision:n,interactables:r,animators:o}}function B_(i){const e=new Mu;e.background=new Ke(1710100);const t=new st(new dn(6,2),new Nt({color:14729360}));t.position.set(0,2.2,-1);const n=new st(new dn(4,2.4),new Nt({color:3828338}));n.position.set(0,1,-4);const s=new st(new dn(3,2),new Nt({color:1382432}));s.position.set(2.4,.4,1),s.rotation.y=-.8;const r=new st(new dn(5,3),new Nt({color:13157040}));r.position.set(-2.2,1.2,.6),r.rotation.y=.9,e.add(t,n,s,r);const o=new La(i),a=o.fromScene(e,.04,.1,100).texture;return o.dispose(),a}function Pn(i,e,t,n,s){const r=new ef(i,e,t,n,s,1.6);return r.castShadow=!1,r}function li(i,e,t){return new nf(i,e,t,2)}function z_(i){const e={ambient:new sf(3814444,.62),hemi:new $d(12898508,3813928,.82),keyControl:Pn(15784104,11.5,9,.9,.55),fillControl:li(10142916,4.6,8),windowFill:Pn(8307916,8.5,8,.75,.55),corridorA:Pn(15782032,8.4,7,.75,.5),corridorB:Pn(15782032,8,7,.75,.5),crewWarm:Pn(16044192,8.2,7.5,.9,.55),crewRead:li(15779960,2.2,3.4),engineKey:Pn(16175232,12.5,10,.95,.5),engineFill:li(10136244,5.6,8),engineWork:Pn(16046240,8.2,6,.6,.45),extraFill:li(15258800,3.4,14),restReds:[],instruments:[],floodL:Pn(9357508,14,32,.38,.4),floodR:Pn(9357508,14,32,.38,.4)};e.keyControl.position.set(.15,2.05,1.6),e.keyControl.target.position.set(.1,.9,2.4),e.keyControl.castShadow=!0,e.keyControl.shadow.mapSize.set(512,512),e.keyControl.shadow.bias=-4e-4,e.keyControl.shadow.normalBias=.04,e.keyControl.shadow.camera.near=.3,e.keyControl.shadow.camera.far=7,e.fillControl.position.set(-.55,1.35,2.1),e.windowFill.position.set(0,1.25,.35),e.windowFill.target.position.set(0,1,2.2),e.corridorA.position.set(0,2.02,5.4),e.corridorA.target.position.set(0,.8,6.1),e.corridorB.position.set(0,2.02,7.2),e.corridorB.target.position.set(0,.8,7.8),e.crewWarm.position.set(.1,2,10.2),e.crewWarm.target.position.set(0,.9,10.8),e.crewRead.position.set(-.55,1.55,9.3),e.engineKey.position.set(-.15,2.08,18.2),e.engineKey.target.position.set(.2,.7,19.4),e.engineKey.castShadow=!1,e.engineFill.position.set(.45,1.4,17.4),e.engineWork.position.set(-.35,1.9,19.8),e.engineWork.target.position.set(.1,.8,20.4),e.floodL.position.set(-.55,.95,-.15),e.floodL.target.position.set(-1.4,-2.2,-8),e.floodR.position.set(.55,.95,-.15),e.floodR.target.position.set(1.4,-2.2,-8),e.extraFill.position.set(0,1.4,11);const t=li(10502192,0,5);t.position.set(0,1.7,2.4);const n=li(10502192,0,5);n.position.set(0,1.7,10.4);const s=li(10502192,0,6);s.position.set(0,1.7,18.6),e.restReds.push(t,n,s);for(const r of Object.values(e))Array.isArray(r)?r.forEach(o=>i.add(o)):(i.add(r),r.target&&i.add(r.target));return i.background=new Ke(In.waterDeep),i.fog=new $a(792088,.0025),e._base={keyControl:11.5,fillControl:4.6,windowFill:8.5,corridorA:8.4,corridorB:8,crewWarm:8.2,crewRead:2.2,engineKey:12.5,engineFill:5.6,engineWork:8.2,ambient:.62,hemi:.82,extraFill:3.4},qu(e,"cruising"),e}function qu(i,e){const t=i._base,n=(s,r,o)=>{i[s]&&(i[s].intensity=t[s]*r,o&&i[s].color.set(o))};i.restReds.forEach(s=>{s.intensity=0}),e==="restCycle"?(n("keyControl",.18,12611648),n("fillControl",.25),n("windowFill",.7),n("corridorA",.16,12611648),n("corridorB",.14,12611648),n("crewWarm",.22,13137984),n("crewRead",.35),n("engineKey",.16,11558968),n("engineFill",.2),n("engineWork",.08),n("ambient",.7),n("hemi",.45),i.restReds.forEach(s=>{s.intensity=.55,s.color.set(11028528)})):e==="silentRunning"?(n("keyControl",.35,14196832),n("fillControl",.45),n("windowFill",.85),n("corridorA",.28,13668432),n("corridorB",.26,13668432),n("crewWarm",.32,13668432),n("crewRead",.4),n("engineKey",.22,12611648),n("engineFill",.28),n("engineWork",.08),n("ambient",.85),n("hemi",.55),i.restReds.forEach(s=>{s.intensity=.42,s.color.set(10506288)})):e==="maintenanceLights"?(n("keyControl",1.15,16048312),n("fillControl",1.1),n("windowFill",.8),n("corridorA",1.2,16048312),n("corridorB",1.2,16048312),n("crewWarm",1.15,16048312),n("engineKey",1.2,16048312),n("engineFill",1.1),n("engineWork",1.3),n("ambient",1.2),n("hemi",1.1)):(n("keyControl",1,15784104),n("fillControl",1),n("windowFill",1),n("corridorA",1,15255688),n("corridorB",1,15255688),n("crewWarm",1,15779984),n("crewRead",1),n("engineKey",1,15908976),n("engineFill",1),n("engineWork",1),n("ambient",1),n("hemi",1)),i._state=e}const pi={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};class xi{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const k_=new Lu(-1,1,1,-1,0,1);class V_ extends wt{constructor(){super(),this.setAttribute("position",new ht([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ht([0,2,0,0,2,0],2))}}const H_=new V_;class qr{constructor(e){this._mesh=new st(H_,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,k_)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class Yu extends xi{constructor(e,t="tDiffuse"){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof Mt?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=xn.clone(e.uniforms),this.material=new Mt({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new qr(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}class Gc extends xi{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){const s=e.getContext(),r=e.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,a;this.inverse?(o=0,a=1):(o=1,a=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(s.REPLACE,s.REPLACE,s.REPLACE),r.buffers.stencil.setFunc(s.ALWAYS,o,4294967295),r.buffers.stencil.setClear(a),r.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(s.EQUAL,1,4294967295),r.buffers.stencil.setOp(s.KEEP,s.KEEP,s.KEEP),r.buffers.stencil.setLocked(!0)}}class G_ extends xi{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class W_{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const n=e.getSize(new oe);this._width=n.width,this._height=n.height,t=new Jt(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:fn}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Yu(pi),this.copyPass.material.blending=Dt,this.clock=new Uu}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let n=!1;for(let s=0,r=this.passes.length;s<r;s++){const o=this.passes[s];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(s),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),o.needsSwap){if(n){const a=this.renderer.getContext(),c=this.renderer.state.buffers.stencil;c.setFunc(a.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),c.setFunc(a.EQUAL,1,4294967295)}this.swapBuffers()}Gc!==void 0&&(o instanceof Gc?n=!0:o instanceof G_&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new oe);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const n=this._width*this._pixelRatio,s=this._height*this._pixelRatio;this.renderTarget1.setSize(n,s),this.renderTarget2.setSize(n,s);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(n,s)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class X_ extends xi{constructor(e,t,n=null,s=null,r=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=s,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Ke}render(e,t,n){const s=e.autoClear;e.autoClear=!1;let r,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(r=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),e.autoClear=s}}const q_={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Ke(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};class ns extends xi{constructor(e,t=1,n,s){super(),this.strength=t,this.radius=n,this.threshold=s,this.resolution=e!==void 0?new oe(e.x,e.y):new oe(256,256),this.clearColor=new Ke(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new Jt(r,o,{type:fn}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let u=0;u<this.nMips;u++){const h=new Jt(r,o,{type:fn});h.texture.name="UnrealBloomPass.h"+u,h.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(h);const d=new Jt(r,o,{type:fn});d.texture.name="UnrealBloomPass.v"+u,d.texture.generateMipmaps=!1,this.renderTargetsVertical.push(d),r=Math.round(r/2),o=Math.round(o/2)}const a=q_;this.highPassUniforms=xn.clone(a.uniforms),this.highPassUniforms.luminosityThreshold.value=s,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Mt({uniforms:this.highPassUniforms,vertexShader:a.vertexShader,fragmentShader:a.fragmentShader}),this.separableBlurMaterials=[];const c=[3,5,7,9,11];r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let u=0;u<this.nMips;u++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(c[u])),this.separableBlurMaterials[u].uniforms.invSize.value=new oe(1/r,1/o),r=Math.round(r/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const l=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=l,this.bloomTintColors=[new D(1,1,1),new D(1,1,1),new D(1,1,1),new D(1,1,1),new D(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=xn.clone(pi.uniforms),this.blendMaterial=new Mt({uniforms:this.copyUniforms,vertexShader:pi.vertexShader,fragmentShader:pi.fragmentShader,blending:Ps,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new Ke,this._oldClearAlpha=1,this._basic=new Nt,this._fsQuad=new qr(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),s=Math.round(t/2);this.renderTargetBright.setSize(n,s);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(n,s),this.renderTargetsVertical[r].setSize(n,s),this.separableBlurMaterials[r].uniforms.invSize.value=new oe(1/n,1/s),n=Math.round(n/2),s=Math.round(s/2)}render(e,t,n,s,r){e.getClearColor(this._oldClearColor),this._oldClearAlpha=e.getClearAlpha();const o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),r&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=n.texture,e.setRenderTarget(null),e.clear(),this._fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this._fsQuad.render(e);let a=this.renderTargetBright;for(let c=0;c<this.nMips;c++)this._fsQuad.material=this.separableBlurMaterials[c],this.separableBlurMaterials[c].uniforms.colorTexture.value=a.texture,this.separableBlurMaterials[c].uniforms.direction.value=ns.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[c]),e.clear(),this._fsQuad.render(e),this.separableBlurMaterials[c].uniforms.colorTexture.value=this.renderTargetsHorizontal[c].texture,this.separableBlurMaterials[c].uniforms.direction.value=ns.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[c]),e.clear(),this._fsQuad.render(e),a=this.renderTargetsVertical[c];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this._fsQuad.render(e),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(n),this._fsQuad.render(e)),e.setClearColor(this._oldClearColor,this._oldClearAlpha),e.autoClear=o}_getSeparableBlurMaterial(e){const t=[];for(let n=0;n<e;n++)t.push(.39894*Math.exp(-.5*n*n/(e*e))/e);return new Mt({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new oe(.5,.5)},direction:{value:new oe(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}_getCompositeMaterial(e){return new Mt({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}}ns.BlurDirectionX=new oe(1,0);ns.BlurDirectionY=new oe(0,1);const Tr={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
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

		}`};class Y_ extends xi{constructor(){super(),this.uniforms=xn.clone(Tr.uniforms),this.material=new Zd({name:Tr.name,uniforms:this.uniforms,vertexShader:Tr.vertexShader,fragmentShader:Tr.fragmentShader}),this._fsQuad=new qr(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},tt.getTransfer(this._outputColorSpace)===ot&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===jc?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===$c?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===Qc?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===ka?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===tu?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===nu?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===eu&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}const br={defines:{PERSPECTIVE_CAMERA:1,SAMPLES:16,NORMAL_VECTOR_TYPE:1,DEPTH_SWIZZLING:"x",SCREEN_SPACE_RADIUS:0,SCREEN_SPACE_RADIUS_SCALE:100,SCENE_CLIP_BOX:0},uniforms:{tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new oe},cameraNear:{value:null},cameraFar:{value:null},cameraProjectionMatrix:{value:new nt},cameraProjectionMatrixInverse:{value:new nt},cameraWorldMatrix:{value:new nt},radius:{value:.25},distanceExponent:{value:1},thickness:{value:1},distanceFallOff:{value:1},scale:{value:1},sceneBoxMin:{value:new D(-1,-1,-1)},sceneBoxMax:{value:new D(1,1,1)}},vertexShader:`

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

		vec3 getViewPosition(const in vec2 screenPosition, const in float depth) {
			vec4 clipSpacePosition = vec4(vec3(screenPosition, depth) * 2.0 - 1.0, 1.0);
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
			if (depth >= 1.0) {
				discard;
				return;
			}
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
		}`},wr={defines:{PERSPECTIVE_CAMERA:1},uniforms:{tDepth:{value:null},cameraNear:{value:null},cameraFar:{value:null}},vertexShader:`
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

		}`},No={uniforms:{tDiffuse:{value:null},intensity:{value:1}},vertexShader:`
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
		}`};function Z_(i=5){const e=Math.floor(i)%2===0?Math.floor(i)+1:Math.floor(i),t=K_(e),n=t.length,s=new Uint8Array(n*4);for(let o=0;o<n;++o){const a=t[o],c=2*Math.PI*a/n,l=new D(Math.cos(c),Math.sin(c),0).normalize();s[o*4]=(l.x*.5+.5)*255,s[o*4+1]=(l.y*.5+.5)*255,s[o*4+2]=127,s[o*4+3]=255}const r=new Qa(s,e,e);return r.wrapS=Un,r.wrapT=Un,r.needsUpdate=!0,r}function K_(i){const e=Math.floor(i)%2===0?Math.floor(i)+1:Math.floor(i),t=e*e,n=Array(t).fill(0);let s=Math.floor(e/2),r=e-1;for(let o=1;o<=t;){if(s===-1&&r===e?(r=e-2,s=0):(r===e&&(r=0),s<0&&(s=e-1)),n[s*e+r]!==0){r-=2,s++;continue}else n[s*e+r]=o++;r++,s--}return n}const Ar={defines:{SAMPLES:16,SAMPLE_VECTORS:Zu(16,2,1),NORMAL_VECTOR_TYPE:1,DEPTH_VALUE_SOURCE:0},uniforms:{tDiffuse:{value:null},tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},resolution:{value:new oe},cameraProjectionMatrixInverse:{value:new nt},lumaPhi:{value:5},depthPhi:{value:5},normalPhi:{value:5},radius:{value:4},index:{value:0}},vertexShader:`

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

		vec3 getViewPosition(const in vec2 screenPosition, const in float depth) {
			vec4 clipSpacePosition = vec4(vec3(screenPosition, depth) * 2.0 - 1.0, 1.0);
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
		}`};function Zu(i,e,t){const n=J_(i,e,t);let s="vec3[SAMPLES](";for(let r=0;r<i;r++){const o=n[r];s+=`vec3(${o.x}, ${o.y}, ${o.z})${r<i-1?",":")"}`}return s}function J_(i,e,t){const n=[];for(let s=0;s<i;s++){const r=2*Math.PI*e*s/i,o=Math.pow(s/(i-1),t);n.push(new D(Math.cos(r),Math.sin(r),o))}return n}class j_{constructor(e=Math){this.grad3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]],this.grad4=[[0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],[0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],[1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],[-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],[1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],[-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],[1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],[-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0]],this.p=[];for(let t=0;t<256;t++)this.p[t]=Math.floor(e.random()*256);this.perm=[];for(let t=0;t<512;t++)this.perm[t]=this.p[t&255];this.simplex=[[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]]}noise(e,t){let n,s,r;const o=.5*(Math.sqrt(3)-1),a=(e+t)*o,c=Math.floor(e+a),l=Math.floor(t+a),u=(3-Math.sqrt(3))/6,h=(c+l)*u,d=c-h,f=l-h,g=e-d,_=t-f;let m,p;g>_?(m=1,p=0):(m=0,p=1);const S=g-m+u,T=_-p+u,x=g-1+2*u,P=_-1+2*u,w=c&255,R=l&255,I=this.perm[w+this.perm[R]]%12,y=this.perm[w+m+this.perm[R+p]]%12,M=this.perm[w+1+this.perm[R+1]]%12;let C=.5-g*g-_*_;C<0?n=0:(C*=C,n=C*C*this._dot(this.grad3[I],g,_));let F=.5-S*S-T*T;F<0?s=0:(F*=F,s=F*F*this._dot(this.grad3[y],S,T));let H=.5-x*x-P*P;return H<0?r=0:(H*=H,r=H*H*this._dot(this.grad3[M],x,P)),70*(n+s+r)}noise3d(e,t,n){let s,r,o,a;const l=(e+t+n)*.3333333333333333,u=Math.floor(e+l),h=Math.floor(t+l),d=Math.floor(n+l),f=1/6,g=(u+h+d)*f,_=u-g,m=h-g,p=d-g,S=e-_,T=t-m,x=n-p;let P,w,R,I,y,M;S>=T?T>=x?(P=1,w=0,R=0,I=1,y=1,M=0):S>=x?(P=1,w=0,R=0,I=1,y=0,M=1):(P=0,w=0,R=1,I=1,y=0,M=1):T<x?(P=0,w=0,R=1,I=0,y=1,M=1):S<x?(P=0,w=1,R=0,I=0,y=1,M=1):(P=0,w=1,R=0,I=1,y=1,M=0);const C=S-P+f,F=T-w+f,H=x-R+f,X=S-I+2*f,L=T-y+2*f,U=x-M+2*f,V=S-1+3*f,G=T-1+3*f,J=x-1+3*f,se=u&255,de=h&255,Te=d&255,Be=this.perm[se+this.perm[de+this.perm[Te]]]%12,ze=this.perm[se+P+this.perm[de+w+this.perm[Te+R]]]%12,Ve=this.perm[se+I+this.perm[de+y+this.perm[Te+M]]]%12,Y=this.perm[se+1+this.perm[de+1+this.perm[Te+1]]]%12;let ee=.6-S*S-T*T-x*x;ee<0?s=0:(ee*=ee,s=ee*ee*this._dot3(this.grad3[Be],S,T,x));let _e=.6-C*C-F*F-H*H;_e<0?r=0:(_e*=_e,r=_e*_e*this._dot3(this.grad3[ze],C,F,H));let Se=.6-X*X-L*L-U*U;Se<0?o=0:(Se*=Se,o=Se*Se*this._dot3(this.grad3[Ve],X,L,U));let ve=.6-V*V-G*G-J*J;return ve<0?a=0:(ve*=ve,a=ve*ve*this._dot3(this.grad3[Y],V,G,J)),32*(s+r+o+a)}noise4d(e,t,n,s){const r=this.grad4,o=this.simplex,a=this.perm,c=(Math.sqrt(5)-1)/4,l=(5-Math.sqrt(5))/20;let u,h,d,f,g;const _=(e+t+n+s)*c,m=Math.floor(e+_),p=Math.floor(t+_),S=Math.floor(n+_),T=Math.floor(s+_),x=(m+p+S+T)*l,P=m-x,w=p-x,R=S-x,I=T-x,y=e-P,M=t-w,C=n-R,F=s-I,H=y>M?32:0,X=y>C?16:0,L=M>C?8:0,U=y>F?4:0,V=M>F?2:0,G=C>F?1:0,J=H+X+L+U+V+G,se=o[J][0]>=3?1:0,de=o[J][1]>=3?1:0,Te=o[J][2]>=3?1:0,Be=o[J][3]>=3?1:0,ze=o[J][0]>=2?1:0,Ve=o[J][1]>=2?1:0,Y=o[J][2]>=2?1:0,ee=o[J][3]>=2?1:0,_e=o[J][0]>=1?1:0,Se=o[J][1]>=1?1:0,ve=o[J][2]>=1?1:0,Ne=o[J][3]>=1?1:0,De=y-se+l,A=M-de+l,te=C-Te+l,Q=F-Be+l,j=y-ze+2*l,$=M-Ve+2*l,pe=C-Y+2*l,re=F-ee+2*l,me=y-_e+3*l,Ge=M-Se+3*l,Fe=C-ve+3*l,b=F-Ne+3*l,v=y-1+4*l,k=M-1+4*l,Z=C-1+4*l,ie=F-1+4*l,K=m&255,we=p&255,ue=S&255,be=T&255,Re=a[K+a[we+a[ue+a[be]]]]%32,le=a[K+se+a[we+de+a[ue+Te+a[be+Be]]]]%32,ye=a[K+ze+a[we+Ve+a[ue+Y+a[be+ee]]]]%32,He=a[K+_e+a[we+Se+a[ue+ve+a[be+Ne]]]]%32,Le=a[K+1+a[we+1+a[ue+1+a[be+1]]]]%32;let xe=.6-y*y-M*M-C*C-F*F;xe<0?u=0:(xe*=xe,u=xe*xe*this._dot4(r[Re],y,M,C,F));let Xe=.6-De*De-A*A-te*te-Q*Q;Xe<0?h=0:(Xe*=Xe,h=Xe*Xe*this._dot4(r[le],De,A,te,Q));let N=.6-j*j-$*$-pe*pe-re*re;N<0?d=0:(N*=N,d=N*N*this._dot4(r[ye],j,$,pe,re));let ae=.6-me*me-Ge*Ge-Fe*Fe-b*b;ae<0?f=0:(ae*=ae,f=ae*ae*this._dot4(r[He],me,Ge,Fe,b));let ge=.6-v*v-k*k-Z*Z-ie*ie;return ge<0?g=0:(ge*=ge,g=ge*ge*this._dot4(r[Le],v,k,Z,ie)),27*(u+h+d+f+g)}_dot(e,t,n){return e[0]*t+e[1]*n}_dot3(e,t,n,s){return e[0]*t+e[1]*n+e[2]*s}_dot4(e,t,n,s,r){return e[0]*t+e[1]*n+e[2]*s+e[3]*r}}class an extends xi{constructor(e,t,n=512,s=512,r,o,a){super(),this.width=n,this.height=s,this.clear=!0,this.camera=t,this.scene=e,this.output=0,this._renderGBuffer=!0,this._visibilityCache=[],this.blendIntensity=1,this.pdRings=2,this.pdRadiusExponent=2,this.pdSamples=16,this.gtaoNoiseTexture=Z_(),this.pdNoiseTexture=this._generateNoise(),this.gtaoRenderTarget=new Jt(this.width,this.height,{type:fn}),this.pdRenderTarget=this.gtaoRenderTarget.clone(),this.gtaoMaterial=new Mt({defines:Object.assign({},br.defines),uniforms:xn.clone(br.uniforms),vertexShader:br.vertexShader,fragmentShader:br.fragmentShader,blending:Dt,depthTest:!1,depthWrite:!1}),this.gtaoMaterial.defines.PERSPECTIVE_CAMERA=this.camera.isPerspectiveCamera?1:0,this.gtaoMaterial.uniforms.tNoise.value=this.gtaoNoiseTexture,this.gtaoMaterial.uniforms.resolution.value.set(this.width,this.height),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.normalMaterial=new Kd,this.normalMaterial.blending=Dt,this.pdMaterial=new Mt({defines:Object.assign({},Ar.defines),uniforms:xn.clone(Ar.uniforms),vertexShader:Ar.vertexShader,fragmentShader:Ar.fragmentShader,depthTest:!1,depthWrite:!1}),this.pdMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.pdMaterial.uniforms.tNoise.value=this.pdNoiseTexture,this.pdMaterial.uniforms.resolution.value.set(this.width,this.height),this.pdMaterial.uniforms.lumaPhi.value=10,this.pdMaterial.uniforms.depthPhi.value=2,this.pdMaterial.uniforms.normalPhi.value=3,this.pdMaterial.uniforms.radius.value=8,this.depthRenderMaterial=new Mt({defines:Object.assign({},wr.defines),uniforms:xn.clone(wr.uniforms),vertexShader:wr.vertexShader,fragmentShader:wr.fragmentShader,blending:Dt}),this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this.copyMaterial=new Mt({uniforms:xn.clone(pi.uniforms),vertexShader:pi.vertexShader,fragmentShader:pi.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blendSrc:Go,blendDst:Ts,blendEquation:cn,blendSrcAlpha:Ho,blendDstAlpha:Ts,blendEquationAlpha:cn}),this.blendMaterial=new Mt({uniforms:xn.clone(No.uniforms),vertexShader:No.vertexShader,fragmentShader:No.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blending:Kc,blendSrc:Go,blendDst:Ts,blendEquation:cn,blendSrcAlpha:Ho,blendDstAlpha:Ts,blendEquationAlpha:cn}),this._fsQuad=new qr(null),this._originalClearColor=new Ke,this.setGBuffer(r?r.depthTexture:void 0,r?r.normalTexture:void 0),o!==void 0&&this.updateGtaoMaterial(o),a!==void 0&&this.updatePdMaterial(a)}setSize(e,t){this.width=e,this.height=t,this.gtaoRenderTarget.setSize(e,t),this.normalRenderTarget.setSize(e,t),this.pdRenderTarget.setSize(e,t),this.gtaoMaterial.uniforms.resolution.value.set(e,t),this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.pdMaterial.uniforms.resolution.value.set(e,t),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse)}dispose(){this.gtaoNoiseTexture.dispose(),this.pdNoiseTexture.dispose(),this.normalRenderTarget.dispose(),this.gtaoRenderTarget.dispose(),this.pdRenderTarget.dispose(),this.normalMaterial.dispose(),this.pdMaterial.dispose(),this.copyMaterial.dispose(),this.depthRenderMaterial.dispose(),this._fsQuad.dispose()}get gtaoMap(){return this.pdRenderTarget.texture}setGBuffer(e,t){e!==void 0?(this.depthTexture=e,this.normalTexture=t,this._renderGBuffer=!1):(this.depthTexture=new nl,this.depthTexture.format=Zi,this.depthTexture.type=Yi,this.normalRenderTarget=new Jt(this.width,this.height,{minFilter:kt,magFilter:kt,type:fn,depthTexture:this.depthTexture}),this.normalTexture=this.normalRenderTarget.texture,this._renderGBuffer=!0);const n=this.normalTexture?1:0,s=this.depthTexture===this.normalTexture?"w":"x";this.gtaoMaterial.defines.NORMAL_VECTOR_TYPE=n,this.gtaoMaterial.defines.DEPTH_SWIZZLING=s,this.gtaoMaterial.uniforms.tNormal.value=this.normalTexture,this.gtaoMaterial.uniforms.tDepth.value=this.depthTexture,this.pdMaterial.defines.NORMAL_VECTOR_TYPE=n,this.pdMaterial.defines.DEPTH_SWIZZLING=s,this.pdMaterial.uniforms.tNormal.value=this.normalTexture,this.pdMaterial.uniforms.tDepth.value=this.depthTexture,this.depthRenderMaterial.uniforms.tDepth.value=this.normalRenderTarget.depthTexture}setSceneClipBox(e){e?(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX!==1,this.gtaoMaterial.defines.SCENE_CLIP_BOX=1,this.gtaoMaterial.uniforms.sceneBoxMin.value.copy(e.min),this.gtaoMaterial.uniforms.sceneBoxMax.value.copy(e.max)):(this.gtaoMaterial.needsUpdate=this.gtaoMaterial.defines.SCENE_CLIP_BOX===0,this.gtaoMaterial.defines.SCENE_CLIP_BOX=0)}updateGtaoMaterial(e){e.radius!==void 0&&(this.gtaoMaterial.uniforms.radius.value=e.radius),e.distanceExponent!==void 0&&(this.gtaoMaterial.uniforms.distanceExponent.value=e.distanceExponent),e.thickness!==void 0&&(this.gtaoMaterial.uniforms.thickness.value=e.thickness),e.distanceFallOff!==void 0&&(this.gtaoMaterial.uniforms.distanceFallOff.value=e.distanceFallOff,this.gtaoMaterial.needsUpdate=!0),e.scale!==void 0&&(this.gtaoMaterial.uniforms.scale.value=e.scale),e.samples!==void 0&&e.samples!==this.gtaoMaterial.defines.SAMPLES&&(this.gtaoMaterial.defines.SAMPLES=e.samples,this.gtaoMaterial.needsUpdate=!0),e.screenSpaceRadius!==void 0&&(e.screenSpaceRadius?1:0)!==this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS&&(this.gtaoMaterial.defines.SCREEN_SPACE_RADIUS=e.screenSpaceRadius?1:0,this.gtaoMaterial.needsUpdate=!0)}updatePdMaterial(e){let t=!1;e.lumaPhi!==void 0&&(this.pdMaterial.uniforms.lumaPhi.value=e.lumaPhi),e.depthPhi!==void 0&&(this.pdMaterial.uniforms.depthPhi.value=e.depthPhi),e.normalPhi!==void 0&&(this.pdMaterial.uniforms.normalPhi.value=e.normalPhi),e.radius!==void 0&&e.radius!==this.radius&&(this.pdMaterial.uniforms.radius.value=e.radius),e.radiusExponent!==void 0&&e.radiusExponent!==this.pdRadiusExponent&&(this.pdRadiusExponent=e.radiusExponent,t=!0),e.rings!==void 0&&e.rings!==this.pdRings&&(this.pdRings=e.rings,t=!0),e.samples!==void 0&&e.samples!==this.pdSamples&&(this.pdSamples=e.samples,t=!0),t&&(this.pdMaterial.defines.SAMPLES=this.pdSamples,this.pdMaterial.defines.SAMPLE_VECTORS=Zu(this.pdSamples,this.pdRings,this.pdRadiusExponent),this.pdMaterial.needsUpdate=!0)}render(e,t,n){switch(this._renderGBuffer&&(this._overrideVisibility(),this._renderOverride(e,this.normalMaterial,this.normalRenderTarget,7829503,1),this._restoreVisibility()),this.gtaoMaterial.uniforms.cameraNear.value=this.camera.near,this.gtaoMaterial.uniforms.cameraFar.value=this.camera.far,this.gtaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.gtaoMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this.gtaoMaterial.uniforms.cameraWorldMatrix.value.copy(this.camera.matrixWorld),this._renderPass(e,this.gtaoMaterial,this.gtaoRenderTarget,16777215,1),this.pdMaterial.uniforms.cameraProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse),this._renderPass(e,this.pdMaterial,this.pdRenderTarget,16777215,1),this.output){case an.OUTPUT.Off:break;case an.OUTPUT.Diffuse:this.copyMaterial.uniforms.tDiffuse.value=n.texture,this.copyMaterial.blending=Dt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case an.OUTPUT.AO:this.copyMaterial.uniforms.tDiffuse.value=this.gtaoRenderTarget.texture,this.copyMaterial.blending=Dt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case an.OUTPUT.Denoise:this.copyMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this.copyMaterial.blending=Dt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case an.OUTPUT.Depth:this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this._renderPass(e,this.depthRenderMaterial,this.renderToScreen?null:t);break;case an.OUTPUT.Normal:this.copyMaterial.uniforms.tDiffuse.value=this.normalRenderTarget.texture,this.copyMaterial.blending=Dt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t);break;case an.OUTPUT.Default:this.copyMaterial.uniforms.tDiffuse.value=n.texture,this.copyMaterial.blending=Dt,this._renderPass(e,this.copyMaterial,this.renderToScreen?null:t),this.blendMaterial.uniforms.intensity.value=this.blendIntensity,this.blendMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture,this._renderPass(e,this.blendMaterial,this.renderToScreen?null:t);break;default:console.warn("THREE.GTAOPass: Unknown output type.")}}_renderPass(e,t,n,s,r){e.getClearColor(this._originalClearColor);const o=e.getClearAlpha(),a=e.autoClear;e.setRenderTarget(n),e.autoClear=!1,s!=null&&(e.setClearColor(s),e.setClearAlpha(r||0),e.clear()),this._fsQuad.material=t,this._fsQuad.render(e),e.autoClear=a,e.setClearColor(this._originalClearColor),e.setClearAlpha(o)}_renderOverride(e,t,n,s,r){e.getClearColor(this._originalClearColor);const o=e.getClearAlpha(),a=e.autoClear;e.setRenderTarget(n),e.autoClear=!1,s=t.clearColor||s,r=t.clearAlpha||r,s!=null&&(e.setClearColor(s),e.setClearAlpha(r||0),e.clear()),this.scene.overrideMaterial=t,e.render(this.scene,this.camera),this.scene.overrideMaterial=null,e.autoClear=a,e.setClearColor(this._originalClearColor),e.setClearAlpha(o)}_overrideVisibility(){const e=this.scene,t=this._visibilityCache;e.traverse(function(n){(n.isPoints||n.isLine||n.isLine2)&&n.visible&&(n.visible=!1,t.push(n))})}_restoreVisibility(){const e=this._visibilityCache;for(let t=0;t<e.length;t++)e[t].visible=!0;e.length=0}_generateNoise(e=64){const t=new j_,n=e*e*4,s=new Uint8Array(n);for(let o=0;o<e;o++)for(let a=0;a<e;a++){const c=o,l=a;s[(o*e+a)*4]=(t.noise(c,l)*.5+.5)*255,s[(o*e+a)*4+1]=(t.noise(c+e,l)*.5+.5)*255,s[(o*e+a)*4+2]=(t.noise(c,l+e)*.5+.5)*255,s[(o*e+a)*4+3]=(t.noise(c+e,l+e)*.5+.5)*255}const r=new Qa(s,e,e,tn,pn);return r.wrapS=Un,r.wrapT=Un,r.needsUpdate=!0,r}}an.OUTPUT={Off:-1,Default:0,Diffuse:1,Depth:2,Normal:3,AO:4,Denoise:5};const $_={uniforms:{tDiffuse:{value:null},vignette:{value:.12},grain:{value:.003},time:{value:0},lift:{value:.045},gain:{value:1.06},warm:{value:.02}},vertexShader:`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,fragmentShader:`
    uniform sampler2D tDiffuse;
    uniform float vignette;
    uniform float grain;
    uniform float time;
    uniform float lift;
    uniform float gain;
    uniform float warm;
    varying vec2 vUv;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float v = 1.0 - dot(d, d) * vignette * 1.6;
      float n = (hash(vUv * vec2(1600.0, 900.0)) - 0.5) * grain;
      c.rgb = c.rgb * v * gain + lift + n;
      c.r += warm * 0.015;
      c.b -= warm * 0.01;
      gl_FragColor = c;
    }
  `};function Q_(i,e,t){const n=i.getSize(new oe),s=new W_(i),r=new X_(e,t);s.addPass(r);let o=null;const a=i.getContext(),c=a.getExtension&&a.getExtension("WEBGL_debug_renderer_info"),l=c?String(a.getParameter(c.UNMASKED_RENDERER_WEBGL)):"",u=/swiftshader|llvmpipe|software/i.test(l);try{u||(o=new an(e,t,n.x,n.y),o.output=an.OUTPUT.Default,o.blendIntensity!==void 0&&(o.blendIntensity=.55),s.addPass(o))}catch(g){console.warn("GTAO unavailable",g)}const h=new ns(new oe(n.x,n.y),u?.08:.12,.32,.88);s.addPass(h);const d=new Yu(new Mt($_));s.addPass(d);const f=new Y_;return s.addPass(f),{composer:s,bloom:h,aoPass:o,grade:d,renderPass:r,setSize(g,_){s.setSize(g,_),o&&o.setSize&&o.setSize(g,_)},render(g){d.uniforms.time.value+=g,s.render()},setCamera(g){r.camera=g,o&&(o.camera=g)}}}const Fo=new D,Oo=new D,Gn=new D,ev=new D,Wc=new mn(0,0,0,"YXZ");function tv(i,e,t={}){const n=t.eyeHeight??1.7,s=t.radius??.2,r=t.height??1.72,a={position:(t.spawn??new D(.05,0,2.15)).clone(),velocity:new D,yaw:0,pitch:-.08,enabled:!0,bob:0,keys:new Set,locked:!1,onGround:!0,lookDx:0,lookDy:0,ignoreLook:0,bound:!1};function c(){Wc.set(a.pitch,a.yaw,0),i.quaternion.setFromEuler(Wc)}function l(_){const m=a.velocity.length();a.enabled&&m>.05&&(a.bob+=_*(6+m*2));const p=a.enabled?Math.sin(a.bob)*.012*Math.min(1,m*1.4):0,S=a.enabled?Math.cos(a.bob*.5)*.006*Math.min(1,m):0;i.position.set(a.position.x+S,n+p,a.position.z),c()}function u(){!a.locked||!a.lookDx&&!a.lookDy||(a.yaw-=a.lookDx*.0015,a.pitch-=a.lookDy*.0015,a.pitch=Math.max(-1.15,Math.min(1.15,a.pitch)),a.lookDx=0,a.lookDy=0,c())}function h(_){if(u(),!a.enabled){l(_);return}const m=18,p=1.7,S=10;Fo.set(-Math.sin(a.yaw),0,-Math.cos(a.yaw)),Oo.set(Math.cos(a.yaw),0,-Math.sin(a.yaw)),Gn.set(0,0,0),a.keys.has("KeyW")&&Gn.add(Fo),a.keys.has("KeyS")&&Gn.sub(Fo),a.keys.has("KeyA")&&Gn.sub(Oo),a.keys.has("KeyD")&&Gn.add(Oo),Gn.lengthSq()>0?(Gn.normalize().multiplyScalar(m*_),a.velocity.add(Gn)):a.velocity.multiplyScalar(Math.max(0,1-S*_)),a.velocity.length()>p&&a.velocity.setLength(p),ev.copy(a.position).addScaledVector(a.velocity,_);const T=3;for(let x=0;x<T;x++){const P=1/T;a.position.addScaledVector(a.velocity,_*P),e.resolve(a.position,s,r)}a.position.y=0,l(_)}function d(_,m){if(!a.enabled||!a.locked)return;if(a.ignoreLook>0){a.ignoreLook-=1;return}const p=Math.max(-48,Math.min(48,Number.isFinite(_)?_:0)),S=Math.max(-48,Math.min(48,Number.isFinite(m)?m:0));p===0&&S===0||(a.lookDx+=p,a.lookDy+=S)}function f(_,m,p,S,T){a.position.set(_,0,p),a.yaw=S,a.pitch=T,a.velocity.set(0,0,0),l(0)}function g(_){if(a.bound)return;a.bound=!0;const m=(p,S)=>{S?a.keys.add(p.code):a.keys.delete(p.code)};window.addEventListener("keydown",p=>m(p,!0)),window.addEventListener("keyup",p=>m(p,!1)),_.addEventListener("click",()=>{if(document.pointerLockElement!==_)try{const p=_.requestPointerLock({unadjustedMovement:!0});p&&typeof p.catch=="function"&&p.catch(()=>_.requestPointerLock())}catch{_.requestPointerLock()}}),document.addEventListener("pointerlockchange",()=>{const p=document.pointerLockElement===_;a.locked=p,a.lookDx=0,a.lookDy=0,p&&(a.ignoreLook=3)}),document.addEventListener("mousemove",p=>{a.locked&&d(p.movementX,p.movementY)})}return{camera:i,state:a,update:h,look:d,setPose:f,bind:g,syncCamera:l,radius:s,height:r,eye:n}}function nv(){const i=new zt(68,1.7777777777777777,.05,120);return i.position.set(0,1.7,2.2),i}const Xc=new of,iv=new oe(0,0);function sv(i){const{camera:e,scene:t,player:n,lights:s,applyState:r,getState:o,water:a}=i,c=[],l={prompt:document.getElementById("prompt"),status:document.getElementById("status"),fade:document.getElementById("fade"),hint:document.getElementById("hint"),crosshair:document.getElementById("crosshair")};let u=null,h=0,d=0,f=0,g=0,_=0,m=0,p=0,S=!0;function T(L){l.prompt&&(l.prompt.textContent=L||"",l.prompt.classList.toggle("visible",!!L&&S))}function x(L,U=2.4){l.status&&(l.status.textContent=L||"",l.status.classList.toggle("visible",!!L&&S),h=U,i.statusText=L||"")}function P(L){S=L;const U=L?"":"none";l.prompt&&(l.prompt.style.display=U),l.status&&(l.status.style.display=U),l.hint&&(l.hint.style.display=U),l.crosshair&&(l.crosshair.style.display=U),L||l.prompt?.classList.remove("visible")}function w(L){L.traverse(U=>{if(!(!U.isMesh||!U.material||U.userData._isolated)){if(Array.isArray(U.material))U.material=U.material.map(V=>V.clone());else{const V=U.material.clone();L.userData.panelMat&&U.material===L.userData.panelMat&&(L.userData.panelMat=V),U.material=V}U.userData._isolated=!0}})}function R(L,U){L.traverse(V=>{if(!V.isMesh||!V.material)return;(Array.isArray(V.material)?V.material:[V.material]).forEach(J=>{J.emissive&&(U?(J.userData._em==null&&(J.userData._em=J.emissiveIntensity),J.userData._ec||(J.userData._ec=J.emissive.clone()),J.emissive.setHex(13152368),J.emissiveIntensity=.22):J.userData._em!=null&&(J.emissiveIntensity=J.userData._em,J.userData._ec&&J.emissive.copy(J.userData._ec)))})})}function I(L,U,V){U.userData.interact=L,U.userData.prompt=V,w(U);const G=new st(new jn(.7,.9,.7),new Nt({visible:!1}));G.position.y=.35,U.add(G),c.push(U)}function y(L,U,V){const G=e.position,J=new D;e.getWorldDirection(J);const se=new D;L.getWorldPosition(se),se.y+=.35;const de=se.sub(G),Te=de.length();return Te>V||Te<.15?!1:de.normalize().dot(J)>U}function M(){Xc.setFromCamera(iv,e);const L=Xc.intersectObjects(c,!0);if(L.length&&L[0].distance<=2.2){let se=L[0].object;for(;se&&!se.userData.interact;)se=se.parent;if(se)return se}if(u&&y(u,.55,2.6))return u;const U=e.position,V=new D;e.getWorldDirection(V);let G=null,J=.22;for(const se of c){const de=new D;se.getWorldPosition(de),de.y+=.35;const Te=de.clone().sub(U),Be=Te.length();if(Be>2.1||Be<.2)continue;const ze=Te.normalize().dot(V),Ve=1-ze+Be*.04;ze>.82&&Ve<J&&(J=Ve,G=se)}return G}function C(){try{const L=new(window.AudioContext||window.webkitAudioContext),U=L.createOscillator(),V=L.createGain();U.type="sine",U.frequency.setValueAtTime(180,L.currentTime),U.frequency.exponentialRampToValueAtTime(70,L.currentTime+.7),V.gain.setValueAtTime(1e-4,L.currentTime),V.gain.exponentialRampToValueAtTime(.18,L.currentTime+.02),V.gain.exponentialRampToValueAtTime(1e-4,L.currentTime+1.1),U.connect(V),V.connect(L.destination),U.start(),U.stop(L.currentTime+1.15)}catch{}}function F(L){if(L==="sonar")return m=1,i.sonarPing=1,C(),x("Sonar pulse transmitted."),window.setTimeout(()=>x("No immediate contact."),900),i.onSonar&&i.onSonar(),!0;if(L==="rest")return f=1,g=1,_=0,n.state.enabled=!1,!0;if(L==="silentRunning"){const U=o().lighting==="silentRunning"?"cruising":"silentRunning";return r(U),x(U==="silentRunning"?"Silent running engaged.":"Silent running disengaged."),i.onSilent&&i.onSilent(U==="silentRunning"),!0}return!1}function H(L){p+=L,m>0&&(m=Math.max(0,m-L*.85),i.sonarPing=m),h>0&&(h-=L,h<=0&&(l.status?.classList.remove("visible"),i.statusText="")),g>0&&(_+=L,d=Math.max(0,Math.min(1,d+f*L*1.1)),l.fade&&(l.fade.style.opacity=String(d)),g===1&&d>=1?(x("6 hours pass.",2.2),r("restCycle"),g=2,_=0):g===2&&_>1.6?(f=-1,g=3):g===3&&d<=0&&(x("Rested."),r("cruising"),n.state.enabled=!0,g=0));const U=M();U!==u&&(u&&R(u,!1),u=U,u&&R(u,!0)),i.promptText=U?U.userData.prompt:"",T(U?U.userData.prompt:""),i.hovered=U?U.userData.interact:null}function X(){window.addEventListener("keydown",L=>{if(L.code==="KeyE"){const U=M();U&&F(U.userData.interact)}})}return{register:I,update:H,trigger:F,bind:X,setHUDVisible:P,setStatus:x,setPrompt:T,get hovered(){return i.hovered},get prompt(){return i.promptText},get status(){return i.statusText},get fade(){return d},get sonarTime(){return p},get sonarPing(){return m}}}const qc={controlRoom:{pos:[.04,1.52,3.25],look:[.08,1.12,1.35],fov:60},corridor:{pos:[0,1.52,4.95],look:[.05,1.22,7.35],fov:58},crewQuarters:{pos:[.2,1.48,10.05],look:[-.42,.95,9.2],fov:58},engineRoom:{pos:[-.22,1.5,17.35],look:[.22,.88,19.7],fov:58},machineryCloseup:{pos:[-.05,1.22,18.7],look:[.3,.82,19.95],fov:48},sonarConsole:{pos:[-.12,1.42,2.65],look:[-.46,1.18,1.88],fov:46},forwardViewport:{pos:[0,1.36,2.55],look:[0,1.24,.22],fov:48},porthole:{pos:[.02,1.32,6.55],look:[.78,1.32,6.55],fov:46},aftWide:{pos:[-.18,1.55,16.7],look:[.2,.95,20.3],fov:64},walking:{pos:[0,1.65,5.05],look:[0,1.28,7.6],fov:64}};function rv(i){const e={ready:!1,views:Object.keys(qc),setView(t){const n=qc[t];if(!n)return!1;if(i.player.state.enabled=!1,i.debugCamera.fov=n.fov,i.debugCamera.position.set(...n.pos),i.debugCamera.lookAt(...n.look),i.debugCamera.updateProjectionMatrix(),i.activeCamera=i.debugCamera,i.post.setCamera(i.debugCamera),i.currentView=t,i.water){const{setWaterFrozen:s}=i.waterApi;s(i.water,t.length)}return!0},setSubmarineState(t){return i.applyState(t),!0},setMotionEnabled(t){return i.motionEnabled=!!t,!0},setPlayerEnabled(t){return i.player.state.enabled=!!t,t&&(i.activeCamera=i.player.camera,i.post.setCamera(i.player.camera)),!0},setHUDVisible(t){return i.interact.setHUDVisible(!!t),!0},triggerInteraction(t){return i.interact.trigger(t)},resetScene(){return i.player.setPose(.05,0,2.15,0,-.08),i.applyState("cruising"),i.wear="used",i.motionEnabled=!0,i.interact.setHUDVisible(!0),i.activeCamera=i.player.camera,i.post.setCamera(i.player.camera),!0},setPlayerPose(t,n,s,r,o){return i.player.setPose(t,n,s,r,o),!0},simulateSeconds(t){const n=Math.max(1,Math.ceil(Number(t)/.05));for(let s=0;s<n;s++)i.simulate(.05);return!0},lookAtInteractable(t){const n=i.sub.interactables.find(l=>l.userData.interact===t);if(!n)return!1;const s=new D;n.getWorldPosition(s),s.y+=.45;const r=i.player.state.position.clone();r.y=i.player.eye;const o=s.x-r.x,a=s.y-r.y,c=s.z-r.z;return i.player.state.yaw=Math.atan2(-o,-c),i.player.state.pitch=Math.atan2(a,Math.hypot(o,c)),i.player.syncCamera(0),!0},getPlayerState(){const t=i.player.state.position;return{x:t.x,y:t.y,z:t.z,yaw:i.player.state.yaw,pitch:i.player.state.pitch,locked:i.player.state.locked}},getInteractionState(){return{prompt:i.interact.prompt||"",status:i.interact.status||"",hovered:i.interact.hovered||null,fade:i.interact.fade||0,lighting:i.lightingState,silent:i.lightingState==="silentRunning"}},getMetrics(){const t=i.renderer.info,n=i.sceneStats||t.render,s=i.frameTimes,r=s.length?s.reduce((h,d)=>h+d,0)/s.length:16.6,o=s.slice().sort((h,d)=>d-h),a=o[Math.max(0,Math.floor(o.length*.01))]||r,c=i.renderer.getContext(),l=c.getExtension&&c.getExtension("WEBGL_debug_renderer_info"),u=l?c.getParameter(l.UNMASKED_RENDERER_WEBGL):"unknown";return{fps:1e3/r,averageFrameTimeMs:r,onePercentLowFps:1e3/a,drawCalls:n.calls??t.render.calls,triangles:n.triangles??t.render.triangles,points:n.points??t.render.points,lines:n.lines??t.render.lines,geometries:t.memory.geometries,textures:t.memory.textures,programs:t.programs?t.programs.length:0,renderer:u,rendererInfo:{vendor:l?c.getParameter(l.UNMASKED_VENDOR_WEBGL):"",webgl:c.getParameter(c.VERSION)}}}};return window.debugAPI=e,e}const Bo=new Du({color:1714734,roughness:.95,metalness:.02,envMapIntensity:.25}),ov=new Nt({color:In.waterDeep,side:1,fog:!1});function zo(i,e){const t=Ws(i),n=[],s=2+t()*4;for(let a=0;a<8;a++){const c=a/7,l=(.3+t()*.7)*(1-c*.55)*e;n.push([l,c*s*e])}const r=Wr(n,8),o=r.attributes.position;for(let a=0;a<o.count;a++){const c=o.getX(a),l=o.getY(a),u=o.getZ(a),h=(t()-.5)*.12*e;o.setXYZ(a,c+h,l,u+h)}return r.computeVertexNormals(),r}function av(){const i=document.createElement("canvas");i.width=32,i.height=32;const e=i.getContext("2d"),t=e.createRadialGradient(16,16,1,16,16,15);t.addColorStop(0,"rgba(255,255,255,0.9)"),t.addColorStop(1,"rgba(255,255,255,0)"),e.fillStyle=t,e.fillRect(0,0,32,32);const n=new ls(i);return n.needsUpdate=!0,n}const lv=av();function Oi(i,e,t,n,s){const r=new wt,o=new Float32Array(i*3),a=Ws(Ct+i);for(let u=0;u<i;u++)o[u*3]=(a()-.5)*e.x,o[u*3+1]=(a()-.5)*e.y,o[u*3+2]=(a()-.5)*e.z;r.setAttribute("position",new Vt(o,3));const c=new tl({color:n,size:t,map:lv,transparent:!0,opacity:s,depthWrite:!1,blending:Ps,sizeAttenuation:!0}),l=new Su(r,c);return l.frustumCulled=!1,l}function cv(i){const e=new Ue;e.name="underwater";const t=new st(new Bs(80,24,16),ov);t.scale.y=.72,e.add(t);const n=new st(new Bs(48,20,12),new Nt({color:In.waterMid,transparent:!0,opacity:.18,side:1,depthWrite:!1}));n.scale.y=.7,e.add(n);const s=new Ue,r=Ws(Ct+200);for(let p=0;p<10;p++){const S=new st(zo(Ct+p*13,1.4+r()*2.2),Bo);S.position.set(-10+r()*20,-3.2-r()*2.2,-3-r()*22),S.rotation.y=r()*Math.PI*2,S.scale.setScalar(.8+r()*1.6),s.add(S)}const o=new Ue;for(let p=0;p<6;p++){const S=new st(zo(Ct+400+p*7,2.4),Bo);S.position.set(3.2+r()*2.2,-2.4,-2.5-p*3.4),S.scale.set(1.6,2.2+r(),1.4),o.add(S)}s.add(o);const a=new st(zo(Ct+77,3.4),Bo);a.position.set(1.6,-2.1,-6.5),a.scale.set(2.2,2.6,1.8),s.add(a),e.add(s);const c=Oi(160,new D(6,3.5,8),.04,12902628,.42),l=Oi(110,new D(12,6,16),.055,8038576,.24),u=Oi(70,new D(20,8,24),.08,3827824,.16),h=Oi(18,new D(14,6,16),.045,7000264,.2);e.add(c,l,u,h);const d=Oi(24,new D(3,2,4),.025,13691116,.28);d.position.set(0,1.1,-.6),e.add(d);const f=new Nt({color:9357508,transparent:!0,opacity:.045,depthWrite:!1}),g=new st(new ji(.08,1.8,7,16,1,!0),f);g.position.set(-.45,.7,-2.1),g.rotation.x=Math.PI*.72;const _=g.clone();_.position.set(.55,.85,-2.4),e.add(g,_);const m=Oi(36,new D(10,2,14),.09,6979712,.1);return m.position.y=-4.5,e.add(m),e.userData={terrain:s,ridge:o,near:c,midP:l,farP:u,bio:h,bubbles:d,silt:m,motion:0},i.add(e),e}function Ku(i,e,t,n){if(!i)return;const s=i.userData;t&&(s.motion+=e);const r=s.motion;i.position.x=Math.sin(r*.04)*.15,s.terrain&&(s.terrain.position.z=r*.085%18),s.ridge&&(s.ridge.position.z=r*.07%12),s.near&&(s.near.position.x=r*.35%2,s.near.position.y=Math.sin(r*.2)*.1),s.midP&&(s.midP.position.z=r*.16%4),s.farP&&(s.farP.position.z=r*.05%6),s.bio&&(s.bio.position.x=Math.sin(r*.08)*1.2,s.bio.position.y=Math.sin(r*.11)*.4),s.bubbles&&(s.bubbles.position.y=1+r*.12%1.4,s.bubbles.position.x=Math.sin(r*.3)*.2),s.silt&&(s.silt.position.x=Math.sin(r*.05)*2)}function uv(i,e=0){if(!i)return;const t=18+e;i.userData.motion=t,Ku(i,0,!1)}function hv(){const i=document.createElement("canvas");i.width=512,i.height=512;const e=i.getContext("2d"),t=e.createLinearGradient(0,0,0,512);t.addColorStop(0,"#6eb4c0"),t.addColorStop(.3,"#3a7e8c"),t.addColorStop(.65,"#1e5360"),t.addColorStop(1,"#12343c"),e.fillStyle=t,e.fillRect(0,0,512,512),e.fillStyle="rgba(140,200,210,0.16)";for(let s=0;s<36;s++)e.beginPath(),e.ellipse(s*67%512,80+s*41%360,70,10,.4,0,Math.PI*2),e.fill();e.fillStyle="rgba(20,40,46,0.55)",e.beginPath(),e.moveTo(0,390),e.lineTo(80,320),e.lineTo(160,360),e.lineTo(260,280),e.lineTo(360,340),e.lineTo(512,300),e.lineTo(512,512),e.lineTo(0,512),e.fill();const n=new ls(i);return n.colorSpace=Rt,n.needsUpdate=!0,n}function dv(){const i=new Ue;i.name="windowVista";const e=new st(new dn(4.2,2.4),new Nt({map:hv(),color:15004918,fog:!1,side:ln,depthWrite:!1}));e.position.set(0,.06,-.52),e.renderOrder=-2,i.add(e);const t=new st(e.geometry,new Nt({color:4890792,transparent:!0,opacity:.22,fog:!1,side:ln,depthWrite:!1}));t.position.set(0,.06,-.4),t.renderOrder=-1,i.add(t);const n=Ws(Ct+90);for(let a=0;a<5;a++){const c=[],l=.7+n()*1.1;for(let h=0;h<6;h++)c.push([(.18+n()*.28)*(1-h/7),h/5*l]);const u=new st(Wr(c,6),new Nt({color:new Ke().setHSL(.48,.18,.16+n()*.06),fog:!1}));u.position.set(-1.15+a*.55,-.28-n()*.1,-.58-n()*.22),u.scale.set(1.3+n()*.4,1.2+n()*.5,1.1),u.renderOrder=-1,i.add(u)}const s=new Float32Array(270);for(let a=0;a<90;a++)s[a*3]=(n()-.5)*3.2,s[a*3+1]=(n()-.5)*1.8,s[a*3+2]=-.45-n()*1.4;const r=new wt;r.setAttribute("position",new Vt(s,3));const o=new Su(r,new tl({color:14217460,size:.028,transparent:!0,opacity:.55,depthWrite:!1,blending:Ps}));return o.renderOrder=1,i.add(o),i.userData.particles=o,i.userData.backdrop=e,i.position.set(0,1.26,.28),i}function fv(i,e){i?.userData.particles&&(i.userData.particles.position.x=Math.sin(e*.35)*.2,i.userData.particles.position.y=e*.12%.35,i.userData.backdrop&&(i.userData.backdrop.position.x=Math.sin(e*.04)*.08))}const Ju=document.getElementById("c"),Pt=new Gg({canvas:Ju,antialias:!1,powerPreference:"high-performance",stencil:!1}),Fa=Pt.getContext(),Yc=Fa.getExtension&&Fa.getExtension("WEBGL_debug_renderer_info"),pv=Yc?String(Fa.getParameter(Yc.UNMASKED_RENDERER_WEBGL)):"",pl=/swiftshader|llvmpipe|software/i.test(pv);Pt.setPixelRatio(pl?1:Math.min(window.devicePixelRatio||1,1.25));Pt.setSize(window.innerWidth,window.innerHeight);Pt.outputColorSpace=Rt;Pt.toneMapping=ka;Pt.toneMappingExposure=1.28;Pt.shadowMap.enabled=!pl;Pt.shadowMap.type=ch;Pt.setClearColor(new Ke(398364),1);const Mi=new Mu,is=nv(),Oa=new zt(60,window.innerWidth/window.innerHeight,.05,140);ku("used");const ju=Kg(),mv=B_(Pt);jg(ju,mv,.95);const ki=z_(Mi);pl&&(ki.keyControl.castShadow=!1);const ml=cv(Mi),$u=dv();Mi.add($u);const ss=O_(Mi,ju),ds=tv(is,ss.collision,{spawn:new D(.05,0,2.15)});ds.syncCamera(0);ds.bind(Ju);const yt={renderer:Pt,scene:Mi,player:ds,debugCamera:Oa,activeCamera:is,post:null,water:ml,waterApi:{setWaterFrozen:uv},sub:ss,motionEnabled:!0,lightingState:"cruising",wear:"used",frameTimes:[],currentView:"walking",applyState(i){if(i==="clean"||i==="used"){yt.wear=i,ku(i);return}const e=i==="cruising"||i==="restCycle"||i==="silentRunning"||i==="maintenanceLights"?i:"cruising";yt.lightingState=e,qu(ki,e);const t=e==="silentRunning";yt.speedMul=t?.35:1;for(const n of ss.interactables)if(n.userData.panelMat&&n.userData.panelTexSilent){const s=t?n.userData.panelTexSilent:n.userData.panelTex;n.userData.panelMat.map=s,n.userData.panelMat.emissiveMap=s,n.userData.panelMat.needsUpdate=!0}},speedMul:1},gv={camera:is,scene:Mi,player:ds,lights:ki,water:ml,applyState:i=>yt.applyState(i),getState:()=>({lighting:yt.lightingState}),statusText:"",promptText:"",hovered:null,sonarPing:0,onSonar(){ki.fillControl.intensity=1.6,window.setTimeout(()=>{yt.lightingState==="cruising"&&(ki.fillControl.intensity=ki._base.fillControl)},350)},onSilent(){}},Xn=sv(gv);Xn.bind();for(const i of ss.interactables)Xn.register(i.userData.interact,i,i.userData.prompt);yt.interact=Xn;const _i=Q_(Pt,Mi,is);yt.post=_i;yt.sceneStats={calls:0,triangles:0,points:0,lines:0};const _v=_i.renderPass.render.bind(_i.renderPass);_i.renderPass.render=function(...e){Pt.info.reset(),_v(...e),yt.sceneStats={calls:Pt.info.render.calls,triangles:Pt.info.render.triangles,points:Pt.info.render.points,lines:Pt.info.render.lines}};const vv=rv(yt);vv.ready=!0;window.app=yt;const Vi=new Uu;let Ba=null;for(const i of ss.animators)i.type==="sonar"&&(Ba=i);function xv(){const i=window.innerWidth,e=window.innerHeight;is.aspect=i/e,is.updateProjectionMatrix(),Oa.aspect=i/e,Oa.updateProjectionMatrix(),Pt.setSize(i,e),_i.setSize(i,e)}window.addEventListener("resize",xv);function gl(i){ds.update(i),Xn.update(i),Ku(ml,i,yt.motionEnabled,Vi.elapsedTime),fv($u,Vi.elapsedTime);const e=yt.speedMul??1;for(const t of ss.animators)t.type==="spin"&&t.object?t.object.rotation.z+=i*t.speed*e:t.type==="vibrate"&&t.object?(t._baseY==null&&(t._baseY=t.object.position.y),t.object.position.y=t._baseY+Math.sin(Vi.elapsedTime*28)*t.amp*e):t.type==="needle"&&t.object&&(t.object.rotation.z=-.4+Math.sin(Vi.elapsedTime*t.speed)*.12);Ba&&(Xn.sonarPing>0||Xn.sonarTime<.05)&&Xu(Ba.tex,Xn.sonarTime,Xn.sonarPing)}yt.simulate=gl;let Or=performance.now(),Qu=0;setInterval(()=>{if(performance.now()-Qu<80)return;const i=performance.now(),e=Math.min(.05,(i-Or)/1e3);Or=i,Vi.elapsedTime+=e,gl(e)},50);function eh(i){Qu=i;const e=Math.min(.05,(i-Or)/1e3);Or=i,Vi.elapsedTime+=e,gl(e),_i.setCamera(yt.activeCamera);const t=performance.now();_i.render(e),yt.frameTimes.push(Math.max(performance.now()-t,e*1e3)),yt.frameTimes.length>120&&yt.frameTimes.shift(),requestAnimationFrame(eh)}ds.syncCamera(0);requestAnimationFrame(eh);
