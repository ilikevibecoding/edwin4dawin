import{C as v,V as c,O as S,U as _,b as w,c as B,S as F,W as L,d as y,X as V,K as R,G,i as j,D as O,P as H,Y as T,Z as Y,$ as E,a0 as K,q as $,x as N,R as X,k as Z,y as z,e as D,a1 as U,a2 as k,A as J,a3 as C,a4 as A,a5 as M,a6 as Q}from"./index-4PCJ7y1R.js";class ee{mesh;u;constructor(e={}){this.u={uTop:{value:new v(e.top??329743)},uHorizon:{value:new v(e.horizon??1451834)},uGround:{value:new v(e.ground??461584)},uClouds:{value:e.clouds??.6},uCloudColor:{value:new v(e.cloudColor??2767952)},uSun:{value:(e.sun??new c(-.4,.35,-1)).clone().normalize()},uSunColor:{value:new v(e.sunColor??10470632)},uSunSize:{value:e.sunSize??.02},uIntensity:{value:e.intensity??1},uTime:{value:0},uCityGlow:{value:e.cityGlow??.5},uCityGlowColor:{value:new v(e.cityGlowColor??3560302)}};const t=new S({uniforms:this.u,side:_,depthWrite:!1,vertexShader:`
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
      `});this.mesh=new w(new B(1,40,24),t),this.mesh.scale.setScalar(900),this.mesh.frustumCulled=!1,this.mesh.renderOrder=-1,this.mesh.name="sky"}update(e){this.u.uTime.value=e}set intensity(e){this.u.uIntensity.value=e}buildEnvironment(e,t){const i=new F,s=this.mesh.clone();if(s.scale.setScalar(80),i.add(s),t)for(const l of t)i.add(l.clone());const a=new L(e);a.compileEquirectangularShader();const r=a.fromScene(i,.04,.1,200);return a.dispose(),r.texture}}function te(n,e,t,i,s,a=!0){const r=new w(new y(t,i),new V({color:new v(n).multiplyScalar(e),side:R}));return r.position.copy(s),a&&r.lookAt(0,s.y*.5,0),r}function b(n,e={}){const t=new j(e.color??16777215,e.intensity??40,e.distance??24,e.angle??.62,e.penumbra??.65,e.decay??1.7);t.position.copy(e.position??new c(2,3.4,2)),t.target.position.copy(e.target??new c(0,1.4,0));const i=(e.shadow??!0)&&n.shadowMapSize>0;return t.castShadow=i,i&&(t.shadow.mapSize.set(n.shadowMapSize,n.shadowMapSize),t.shadow.bias=e.shadowBias??-9e-4,t.shadow.normalBias=.022,t.shadow.radius=n.softShadows?e.radius??3.2:1,t.shadow.camera.near=e.near??.4,t.shadow.camera.far=e.far??e.distance??24,t.shadow.blurSamples=n.softShadows?12:4),t}function se(n,e={}){const t=new O(e.color??12375278,e.intensity??.9);t.position.copy(e.position??new c(-8,14,-6)),t.target.position.copy(e.target??new c(0,1,0));const i=(e.shadow??!0)&&n.shadowMapSize>0;if(t.castShadow=i,i){const s=e.area??12;t.shadow.mapSize.set(n.shadowMapSize,n.shadowMapSize),t.shadow.camera.left=-s,t.shadow.camera.right=s,t.shadow.camera.top=s,t.shadow.camera.bottom=-s,t.shadow.camera.near=.5,t.shadow.camera.far=e.far??60,t.shadow.bias=e.shadowBias??-6e-4,t.shadow.normalBias=.03,t.shadow.radius=n.softShadows?e.radius??2.4:1,t.shadow.blurSamples=n.softShadows?10:4}return t}function ie(n,e,t={}){const i=new G,s=t.distance??3.2,a=(t.keyDir??new c(-.8,.85,.9)).clone().normalize(),r=(t.rimDir??new c(.7,.6,-1)).clone().normalize(),l=b(n,{color:t.keyColor??16773341,intensity:t.keyIntensity??26,position:e.clone().addScaledVector(a,s),target:e.clone(),angle:.62,penumbra:.75,distance:s*4}),h=b(n,{color:t.rimColor??9423103,intensity:t.rimIntensity??34,position:e.clone().addScaledVector(r,s*1.1),target:e.clone(),angle:.5,penumbra:.9,distance:s*4,shadow:!1}),f=b(n,{color:t.fillColor??4283770,intensity:t.fillIntensity??8,position:e.clone().add(new c(s*.9,-.2,s*.6)),target:e.clone(),angle:.9,penumbra:1,distance:s*5,shadow:!1});return i.add(l,l.target,h,h.target,f,f.target),{key:l,rim:h,fill:f,group:i}}class ae{mesh;material;rt;reflCam=new H;textureMatrix=new T;plane=new Y;uniforms={};enabled;y;constructor(e={}){const t=e.size??120,i=e.resolution??.5;this.y=e.y??0,this.enabled=i>0;const s=Math.max(64,Math.floor(1024*i)),a=Math.max(64,Math.floor(576*i));this.rt=new E(s,a,{type:K,samples:0});const r=$(512),l=e.texRepeat??t/4;for(const o of[r.map,r.normalMap,r.roughnessMap])o?.repeat.set(l,l);const h=N(256);h.wrapS=h.wrapT=X,this.material=new Z({color:new v(e.color??9080982).convertSRGBToLinear(),map:r.map,normalMap:r.normalMap,roughnessMap:r.roughnessMap,roughness:1,metalness:0,normalScale:new z(.28,.28),envMapIntensity:.22}),this.uniforms={tRefl:{value:this.rt.texture},textureMatrix:{value:this.textureMatrix},tRipple:{value:h},uWetness:{value:e.wetness??.85},uReflStrength:{value:e.reflectStrength??1},uTime:{value:0},uRippleScale:{value:e.rippleScale??3.2},uBlur:{value:e.blur??2.2},uReflRes:{value:new z(s,a)},uRainAmount:{value:1}};const f=this.enabled;this.material.onBeforeCompile=o=>{Object.assign(o.uniforms,this.uniforms),o.vertexShader=o.vertexShader.replace("#include <common>",`#include <common>
           uniform mat4 textureMatrix;
           varying vec4 vReflCoord;
           varying vec3 vWorldPos;`).replace("#include <fog_vertex>",`#include <fog_vertex>
           vReflCoord = textureMatrix * vec4( position, 1.0 );
           vWorldPos = ( modelMatrix * vec4( position, 1.0 ) ).xyz;`),o.fragmentShader=o.fragmentShader.replace("#include <common>",`#include <common>
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
           diffuseColor.rgb *= mix( 1.0, 0.34, wetMask );`).replace("#include <colorspace_fragment>",`${f?`{
             vec2 ruv = vReflCoord.xy / max( vReflCoord.w, 0.0001 );
             vec2 distort = vec2( ripple.x, ripple.y ) * 0.035 * uWetness;
             vec3 refl = sampleRefl( clamp( ruv + distort, vec2( 0.002 ), vec2( 0.998 ) ), uBlur + roughnessFactor * 22.0 );
             vec3 V = normalize( vViewPosition );
             float fres = pow( 1.0 - clamp( dot( normalize( normal ), V ), 0.0, 1.0 ), 4.0 );
             float amt = uWetness * uReflStrength * mix( 0.05, 0.85, fres );
             gl_FragColor.rgb += refl * amt;
           }`:""}
           #include <colorspace_fragment>`)},this.material.customProgramCacheKey=()=>`wetground_${f}`;const g=e.segments??1,p=new y(t,t,g,g);this.mesh=new w(p,this.material),this.mesh.rotation.x=-Math.PI/2,this.mesh.position.y=this.y,this.mesh.receiveShadow=!0,this.mesh.name="wet-ground",this.mesh.matrixAutoUpdate=!0,this.mesh.updateMatrixWorld()}set wetness(e){this.uniforms.uWetness.value=D(e,0,1)}get wetness(){return this.uniforms.uWetness.value}set rainAmount(e){this.uniforms.uRainAmount.value=e}set reflectStrength(e){this.uniforms.uReflStrength.value=e}update(e){this.uniforms.uTime.value=e}renderReflection(e,t,i){if(!this.enabled)return;const s=new c(0,1,0),a=new c(0,this.y,0),r=new c().setFromMatrixPosition(i.matrixWorld);if(r.y<this.y+.02)return;const l=new c().subVectors(a,r);l.reflect(s).negate().add(a);const h=new T().extractRotation(i.matrixWorld),f=new c(0,0,-1).applyMatrix4(h).add(r),g=new c().subVectors(a,f);g.reflect(s).negate().add(a),this.reflCam.copy(i),this.reflCam.position.copy(l),this.reflCam.up.set(0,1,0).applyMatrix4(h).reflect(s),this.reflCam.lookAt(g),this.reflCam.far=i.far,this.reflCam.updateMatrixWorld(),this.reflCam.projectionMatrix.copy(i.projectionMatrix),this.textureMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),this.textureMatrix.multiply(this.reflCam.projectionMatrix),this.textureMatrix.multiply(this.reflCam.matrixWorldInverse),this.textureMatrix.multiply(this.mesh.matrixWorld),this.plane.setFromNormalAndCoplanarPoint(s,a),this.plane.applyMatrix4(this.reflCam.matrixWorldInverse);const p=new U(this.plane.normal.x,this.plane.normal.y,this.plane.normal.z,this.plane.constant),o=this.reflCam.projectionMatrix,u=new U((Math.sign(p.x)+o.elements[8])/o.elements[0],(Math.sign(p.y)+o.elements[9])/o.elements[5],-1,(1+o.elements[10])/o.elements[14]);p.multiplyScalar(2/p.dot(u)),o.elements[2]=p.x,o.elements[6]=p.y,o.elements[10]=p.z+1-.004,o.elements[14]=p.w;const m=e.getRenderTarget(),d=e.shadowMap.autoUpdate;e.shadowMap.autoUpdate=!1,this.mesh.visible=!1,e.setRenderTarget(this.rt),e.clear(),e.render(t,this.reflCam),this.mesh.visible=!0,e.shadowMap.autoUpdate=d,e.setRenderTarget(m)}dispose(){this.rt.dispose(),this.material.dispose(),this.mesh.geometry.dispose()}}class oe{group=new G;streaks;splashes;follow=!0;mist;uniforms={};splashUniforms={};mistUniforms={};groundY=0;amount=1;constructor(e={}){const t=e.count??12e3;this.follow=e.follow??!0;const i=e.radius??26,s=e.height??26,a=new J(20380815);this.group.name="rain",this.group.frustumCulled=!1;const r=new y(1,1),l=new k;l.index=r.index,l.attributes.position=r.attributes.position,l.attributes.uv=r.attributes.uv;const h=new Float32Array(t*3),f=new Float32Array(t*3);for(let u=0;u<t;u++){const m=a.next()*Math.PI*2,d=i*Math.pow(a.next(),.62);h[u*3]=Math.cos(m)*d,h[u*3+1]=a.next()*s,h[u*3+2]=Math.sin(m)*d,f[u*3]=a.range(11,19),f[u*3+1]=a.range(.5,1.5),f[u*3+2]=a.chance(.14)?a.range(1.6,3.4):a.range(.28,.85)}l.setAttribute("iOffset",new C(h,3)),l.setAttribute("iParam",new C(f,3)),l.instanceCount=t,l.boundingSphere=new A(new c,i*3);const g=e.wind??new z(1.4,.5);this.uniforms={uTime:{value:0},uHeight:{value:s},uWind:{value:g.clone()},uColor:{value:new v(e.color??12575999)},uIntensity:{value:e.intensity??1},uAmount:{value:1},uWidth:{value:.009}};const p=new S({uniforms:this.uniforms,transparent:!0,depthWrite:!1,blending:M,side:R,vertexShader:`
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
      `});this.streaks=new w(l,p),this.streaks.frustumCulled=!1,this.streaks.renderOrder=5,this.group.add(this.streaks);const o=e.splashes??600;if(o>0){const u=new y(1,1),m=new k;m.index=u.index,m.attributes.position=u.attributes.position,m.attributes.uv=u.attributes.uv;const d=new Float32Array(o*3);for(let x=0;x<o;x++){const W=a.next()*Math.PI*2,P=i*.75*Math.sqrt(a.next());d[x*3]=Math.cos(W)*P,d[x*3+1]=a.next(),d[x*3+2]=Math.sin(W)*P}m.setAttribute("iOffset",new C(d,3)),m.instanceCount=o,m.boundingSphere=new A(new c,i*3),this.splashUniforms={uTime:{value:0},uColor:{value:new v(e.color??12575999)},tSprite:{value:Q(128,2.2,.86)},uAmount:{value:1},uScale:{value:.055}};const I=new S({uniforms:this.splashUniforms,transparent:!0,depthWrite:!1,blending:M,vertexShader:`
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
        `});this.splashes=new w(m,I),this.splashes.rotation.x=-Math.PI/2,this.splashes.frustumCulled=!1,this.splashes.renderOrder=4,this.group.add(this.splashes)}if(e.mist!==!1){this.mistUniforms={uTime:{value:0},uColor:{value:new v(10339550)},uOpacity:{value:.028}};const u=new S({uniforms:this.mistUniforms,transparent:!0,depthWrite:!1,blending:M,side:R,vertexShader:`
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
        `}),m=new y(i*2.4,5,1,1);this.mist=new w(m,u),this.mist.position.y=1.4,this.mist.rotation.x=-Math.PI/2,this.mist.frustumCulled=!1,this.mist.renderOrder=3,this.group.add(this.mist)}}setGroundY(e){this.groundY=e,this.splashes&&(this.splashes.position.y=e),this.mist&&(this.mist.position.y=e+1.2)}update(e,t,i){if(this.follow){const s=i.position;this.group.position.set(Math.round(s.x*.5)*2,this.groundY,Math.round(s.z*.5)*2)}this.uniforms.uTime.value=t,this.uniforms.uAmount.value=this.amount,this.splashes&&(this.splashUniforms.uTime.value=t,this.splashUniforms.uAmount.value=this.amount),this.mist&&(this.mistUniforms.uTime.value=t)}setIntensity(e){this.amount=D(e,0,1),this.uniforms.uIntensity.value=.55+this.amount*.75}setColor(e){this.uniforms.uColor.value.set(e),this.splashes&&this.splashUniforms.uColor.value.set(e)}dispose(){this.group.traverse(e=>{const t=e;t.geometry?.dispose?.(),t.material?.dispose?.()})}}class re{constructor(e=14216447,t=6){this.peak=t,this.light=new O(e,0),this.light.position.set(-14,22,-18)}light;t=-1;seq=[];strength=0;onFlash;strike(e=0){this.t=-e,this.seq=[.06,.05,.09,.04,.26,.16]}update(e){if(this.t<-1e3||(this.t+=e,this.t<0))return;let t=0,i=!1;for(let s=0;s<this.seq.length;s++){const a=t+this.seq[s];if(this.t>=t&&this.t<a){i=s%2===0;break}t=a}this.t>t+.4?(this.t=-1e9,this.strength=0):this.strength=i?1:0,this.light.intensity=this.strength*this.peak,this.onFlash?.(this.strength*.42)}}export{re as L,oe as R,ee as S,ae as W,se as d,te as e,b as s,ie as t};
