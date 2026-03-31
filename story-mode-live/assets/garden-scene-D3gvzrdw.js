import{c as as,N as bn,S as Qn,C as He,F as Za,V as at,R as rs,a as on,w as ao,M as li,W as Co,b as qn,d as Ht,L as Ln,H as Li,U as On,D as It,B as cn,e as fi,f as Ui,p as ss,E as cs,g as Jt,P as ri,A as ls,h as Gi,i as Mn,j as Ci,k as vo,l as di,m as ui,n as $a,o as fs,q as Vn,r as yi,s as ds,t as us,u as ti,O as ps,v as hs,x as ms,y as _s,z as gs,G as vs,I as Ss,J as Ms,K as Es,Q as xs,T as Ts,X as ws,Y as bs,Z as As,_ as Rs,$ as Cs,a0 as ys,a1 as Fn,a2 as Hi,a3 as gn,a4 as mi,a5 as Ps,a6 as si,a7 as Ds,a8 as Is,a9 as Ls,aa as Us,ab as Qa,ac as Ns,ad as Os,ae as Fs,af as Bs,ag as Et,ah as Gs,ai as Hs,aj as Vs,ak as Bn,al as Kn,am as An,an as P,ao as ja,ap as Nn,aq as vn,ar as Pi,as as Ja,at as er,au as tr,av as an,aw as ks,ax as zs,ay as Ws,az as Xs,aA as nr,aB as Un,aC as Ys,aD as qs,aE as Ks,aF as ir,aG as Zs,aH as or,aI as ar,aJ as Vi,aK as ki,aL as zi,aM as Wi,aN as Dt,aO as yo,aP as Po,aQ as Do,aR as Io,aS as Lo,aT as Uo,aU as No,aV as Oo,aW as Fo,aX as Bo,aY as Go,aZ as Ho,a_ as Vo,a$ as ko,b0 as zo,b1 as Wo,b2 as Xo,b3 as Yo,b4 as qo,b5 as Ko,b6 as Zo,b7 as $o,b8 as Qo,b9 as jo,ba as Jo,bb as ea,bc as ta,bd as na,be as ro,bf as so,bg as co,bh as lo,bi as fo,bj as uo,bk as po,bl as $s,bm as ia,bn as Qs,bo as bi,bp as js,bq as oa,br as aa,bs as ra,bt as ho,bu as mo,bv as Js,bw as rr,bx as ec,by as Ni,bz as tc,bA as nc,bB as sr,bC as Ct,bD as sa,bE as cr,bF as ca,bG as lr,bH as pi,bI as Zn,bJ as ic,bK as wn,bL as oc,bM as ac,bN as rc,bO as la,bP as tn,bQ as sc,bR as fr,bS as cc,bT as lc,bU as fc,bV as ci,bW as dc,bX as uc,bY as pc,bZ as hc,b_ as mc,b$ as _c,c0 as gc,c1 as vc,c2 as Sc,c3 as Mc,c4 as Ec,c5 as xc,c6 as We,c7 as ee,c8 as tt,c9 as rt,ca as $n,cb as dr,cc as ur,cd as Gt,ce as fa,cf as Yn,cg as Tc,ch as un,ci as da,cj as ua,ck as Di,cl as Ii,cm as wc,cn as Ai,co as bc,cp as Ac,cq as Rc,cr as Cc,cs as yc,ct as Pc,cu as Dc}from"./three.core-SvSVpCk_.js";import{C as $t,R as kn,g as Xi}from"./index-CnckupkB.js";import{ResourceTracker as Ic}from"./resource-tracker-aK3-kU4R.js";function pr(){let e=null,n=!1,t=null,i=null;function o(a,c){t(a,c),i=e.requestAnimationFrame(o)}return{start:function(){n!==!0&&t!==null&&(i=e.requestAnimationFrame(o),n=!0)},stop:function(){e.cancelAnimationFrame(i),n=!1},setAnimationLoop:function(a){t=a},setContext:function(a){e=a}}}function Lc(e){const n=new WeakMap;function t(l,g){const v=l.array,b=l.usage,T=v.byteLength,x=e.createBuffer();e.bindBuffer(g,x),e.bufferData(g,v,b),l.onUploadCallback();let w;if(v instanceof Float32Array)w=e.FLOAT;else if(typeof Float16Array<"u"&&v instanceof Float16Array)w=e.HALF_FLOAT;else if(v instanceof Uint16Array)l.isFloat16BufferAttribute?w=e.HALF_FLOAT:w=e.UNSIGNED_SHORT;else if(v instanceof Int16Array)w=e.SHORT;else if(v instanceof Uint32Array)w=e.UNSIGNED_INT;else if(v instanceof Int32Array)w=e.INT;else if(v instanceof Int8Array)w=e.BYTE;else if(v instanceof Uint8Array)w=e.UNSIGNED_BYTE;else if(v instanceof Uint8ClampedArray)w=e.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+v);return{buffer:x,type:w,bytesPerElement:v.BYTES_PER_ELEMENT,version:l.version,size:T}}function i(l,g,v){const b=g.array,T=g.updateRanges;if(e.bindBuffer(v,l),T.length===0)e.bufferSubData(v,0,b);else{T.sort((w,B)=>w.start-B.start);let x=0;for(let w=1;w<T.length;w++){const B=T[x],C=T[w];C.start<=B.start+B.count+1?B.count=Math.max(B.count,C.start+C.count-B.start):(++x,T[x]=C)}T.length=x+1;for(let w=0,B=T.length;w<B;w++){const C=T[w];e.bufferSubData(v,C.start*b.BYTES_PER_ELEMENT,b,C.start,C.count)}g.clearUpdateRanges()}g.onUploadCallback()}function o(l){return l.isInterleavedBufferAttribute&&(l=l.data),n.get(l)}function a(l){l.isInterleavedBufferAttribute&&(l=l.data);const g=n.get(l);g&&(e.deleteBuffer(g.buffer),n.delete(l))}function c(l,g){if(l.isInterleavedBufferAttribute&&(l=l.data),l.isGLBufferAttribute){const b=n.get(l);(!b||b.version<l.version)&&n.set(l,{buffer:l.buffer,type:l.type,bytesPerElement:l.elementSize,version:l.version});return}const v=n.get(l);if(v===void 0)n.set(l,t(l,g));else if(v.version<l.version){if(v.size!==l.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(v.buffer,l,g),v.version=l.version}}return{get:o,remove:a,update:c}}var Uc=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Nc=`#ifdef USE_ALPHAHASH
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
#endif`,Oc=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Fc=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Bc=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Gc=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Hc=`#ifdef USE_AOMAP
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
#endif`,Vc=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,kc=`#ifdef USE_BATCHING
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
#endif`,zc=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Wc=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Xc=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Yc=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,qc=`#ifdef USE_IRIDESCENCE
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
#endif`,Kc=`#ifdef USE_BUMPMAP
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
#endif`,Zc=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,$c=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Qc=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,jc=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Jc=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,el=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,tl=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,nl=`#if defined( USE_COLOR_ALPHA )
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
#endif`,il=`#define PI 3.141592653589793
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
} // validated`,ol=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,al=`vec3 transformedNormal = objectNormal;
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
#endif`,rl=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,sl=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,cl=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,ll=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,fl="gl_FragColor = linearToOutputTexel( gl_FragColor );",dl=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,ul=`#ifdef USE_ENVMAP
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
#endif`,pl=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif

#endif`,hl=`#ifdef USE_ENVMAP
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
#endif`,ml=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS

		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,_l=`#ifdef USE_ENVMAP
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
#endif`,gl=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,vl=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Sl=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Ml=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,El=`#ifdef USE_GRADIENTMAP
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
}`,xl=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Tl=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,wl=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,bl=`uniform bool receiveShadow;
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
#endif`,Al=`#ifdef USE_ENVMAP
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
#endif`,Rl=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Cl=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,yl=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Pl=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Dl=`PhysicalMaterial material;
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
#endif`,Il=`struct PhysicalMaterial {
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
}`,Ll=`
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
#endif`,Ul=`#if defined( RE_IndirectDiffuse )
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
#endif`,Nl=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Ol=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Fl=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Bl=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Gl=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Hl=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Vl=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,kl=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,zl=`#if defined( USE_POINTS_UV )
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
#endif`,Wl=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Xl=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Yl=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,ql=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Kl=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Zl=`#ifdef USE_MORPHTARGETS
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
#endif`,$l=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ql=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,jl=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,Jl=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,ef=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,tf=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,nf=`#ifdef USE_NORMALMAP
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
#endif`,of=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,af=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,rf=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,sf=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,cf=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,lf=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,ff=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,df=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,uf=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,pf=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,hf=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,mf=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,_f=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,gf=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,vf=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,Sf=`float getShadowMask() {
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
}`,Mf=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Ef=`#ifdef USE_SKINNING
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
#endif`,xf=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Tf=`#ifdef USE_SKINNING
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
#endif`,wf=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,bf=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Af=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Rf=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,Cf=`#ifdef USE_TRANSMISSION
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
#endif`,yf=`#ifdef USE_TRANSMISSION
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
#endif`,Pf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Df=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,If=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Lf=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Uf=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Nf=`uniform sampler2D t2D;
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
}`,Of=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Ff=`#ifdef ENVMAP_TYPE_CUBE
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
}`,Bf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Gf=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Hf=`#include <common>
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
}`,Vf=`#if DEPTH_PACKING == 3200
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
}`,kf=`#define DISTANCE
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
}`,zf=`#define DISTANCE
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
}`,Wf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Xf=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Yf=`uniform float scale;
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
}`,qf=`uniform vec3 diffuse;
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
}`,Kf=`#include <common>
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
}`,Zf=`uniform vec3 diffuse;
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
}`,$f=`#define LAMBERT
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
}`,Qf=`#define LAMBERT
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
}`,jf=`#define MATCAP
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
}`,Jf=`#define MATCAP
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
}`,ed=`#define NORMAL
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
}`,td=`#define NORMAL
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
}`,nd=`#define PHONG
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
}`,id=`#define PHONG
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
}`,od=`#define STANDARD
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
}`,ad=`#define STANDARD
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
}`,rd=`#define TOON
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
}`,sd=`#define TOON
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
}`,cd=`uniform float size;
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
}`,ld=`uniform vec3 diffuse;
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
}`,fd=`#include <common>
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
}`,dd=`uniform vec3 color;
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
}`,ud=`uniform float rotation;
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
}`,pd=`uniform vec3 diffuse;
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
}`,ut={alphahash_fragment:Uc,alphahash_pars_fragment:Nc,alphamap_fragment:Oc,alphamap_pars_fragment:Fc,alphatest_fragment:Bc,alphatest_pars_fragment:Gc,aomap_fragment:Hc,aomap_pars_fragment:Vc,batching_pars_vertex:kc,batching_vertex:zc,begin_vertex:Wc,beginnormal_vertex:Xc,bsdfs:Yc,iridescence_fragment:qc,bumpmap_pars_fragment:Kc,clipping_planes_fragment:Zc,clipping_planes_pars_fragment:$c,clipping_planes_pars_vertex:Qc,clipping_planes_vertex:jc,color_fragment:Jc,color_pars_fragment:el,color_pars_vertex:tl,color_vertex:nl,common:il,cube_uv_reflection_fragment:ol,defaultnormal_vertex:al,displacementmap_pars_vertex:rl,displacementmap_vertex:sl,emissivemap_fragment:cl,emissivemap_pars_fragment:ll,colorspace_fragment:fl,colorspace_pars_fragment:dl,envmap_fragment:ul,envmap_common_pars_fragment:pl,envmap_pars_fragment:hl,envmap_pars_vertex:ml,envmap_physical_pars_fragment:Al,envmap_vertex:_l,fog_vertex:gl,fog_pars_vertex:vl,fog_fragment:Sl,fog_pars_fragment:Ml,gradientmap_pars_fragment:El,lightmap_pars_fragment:xl,lights_lambert_fragment:Tl,lights_lambert_pars_fragment:wl,lights_pars_begin:bl,lights_toon_fragment:Rl,lights_toon_pars_fragment:Cl,lights_phong_fragment:yl,lights_phong_pars_fragment:Pl,lights_physical_fragment:Dl,lights_physical_pars_fragment:Il,lights_fragment_begin:Ll,lights_fragment_maps:Ul,lights_fragment_end:Nl,logdepthbuf_fragment:Ol,logdepthbuf_pars_fragment:Fl,logdepthbuf_pars_vertex:Bl,logdepthbuf_vertex:Gl,map_fragment:Hl,map_pars_fragment:Vl,map_particle_fragment:kl,map_particle_pars_fragment:zl,metalnessmap_fragment:Wl,metalnessmap_pars_fragment:Xl,morphinstance_vertex:Yl,morphcolor_vertex:ql,morphnormal_vertex:Kl,morphtarget_pars_vertex:Zl,morphtarget_vertex:$l,normal_fragment_begin:Ql,normal_fragment_maps:jl,normal_pars_fragment:Jl,normal_pars_vertex:ef,normal_vertex:tf,normalmap_pars_fragment:nf,clearcoat_normal_fragment_begin:of,clearcoat_normal_fragment_maps:af,clearcoat_pars_fragment:rf,iridescence_pars_fragment:sf,opaque_fragment:cf,packing:lf,premultiplied_alpha_fragment:ff,project_vertex:df,dithering_fragment:uf,dithering_pars_fragment:pf,roughnessmap_fragment:hf,roughnessmap_pars_fragment:mf,shadowmap_pars_fragment:_f,shadowmap_pars_vertex:gf,shadowmap_vertex:vf,shadowmask_pars_fragment:Sf,skinbase_vertex:Mf,skinning_pars_vertex:Ef,skinning_vertex:xf,skinnormal_vertex:Tf,specularmap_fragment:wf,specularmap_pars_fragment:bf,tonemapping_fragment:Af,tonemapping_pars_fragment:Rf,transmission_fragment:Cf,transmission_pars_fragment:yf,uv_pars_fragment:Pf,uv_pars_vertex:Df,uv_vertex:If,worldpos_vertex:Lf,background_vert:Uf,background_frag:Nf,backgroundCube_vert:Of,backgroundCube_frag:Ff,cube_vert:Bf,cube_frag:Gf,depth_vert:Hf,depth_frag:Vf,distanceRGBA_vert:kf,distanceRGBA_frag:zf,equirect_vert:Wf,equirect_frag:Xf,linedashed_vert:Yf,linedashed_frag:qf,meshbasic_vert:Kf,meshbasic_frag:Zf,meshlambert_vert:$f,meshlambert_frag:Qf,meshmatcap_vert:jf,meshmatcap_frag:Jf,meshnormal_vert:ed,meshnormal_frag:td,meshphong_vert:nd,meshphong_frag:id,meshphysical_vert:od,meshphysical_frag:ad,meshtoon_vert:rd,meshtoon_frag:sd,points_vert:cd,points_frag:ld,shadow_vert:fd,shadow_frag:dd,sprite_vert:ud,sprite_frag:pd},Re={common:{diffuse:{value:new He(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Et},alphaMap:{value:null},alphaMapTransform:{value:new Et},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Et}},envmap:{envMap:{value:null},envMapRotation:{value:new Et},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Et}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Et}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Et},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Et},normalScale:{value:new Jt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Et},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Et}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Et}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Et}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new He(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new He(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Et},alphaTest:{value:0},uvTransform:{value:new Et}},sprite:{diffuse:{value:new He(16777215)},opacity:{value:1},center:{value:new Jt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Et},alphaMap:{value:null},alphaMapTransform:{value:new Et},alphaTest:{value:0}}},_n={basic:{uniforms:tn([Re.common,Re.specularmap,Re.envmap,Re.aomap,Re.lightmap,Re.fog]),vertexShader:ut.meshbasic_vert,fragmentShader:ut.meshbasic_frag},lambert:{uniforms:tn([Re.common,Re.specularmap,Re.envmap,Re.aomap,Re.lightmap,Re.emissivemap,Re.bumpmap,Re.normalmap,Re.displacementmap,Re.fog,Re.lights,{emissive:{value:new He(0)}}]),vertexShader:ut.meshlambert_vert,fragmentShader:ut.meshlambert_frag},phong:{uniforms:tn([Re.common,Re.specularmap,Re.envmap,Re.aomap,Re.lightmap,Re.emissivemap,Re.bumpmap,Re.normalmap,Re.displacementmap,Re.fog,Re.lights,{emissive:{value:new He(0)},specular:{value:new He(1118481)},shininess:{value:30}}]),vertexShader:ut.meshphong_vert,fragmentShader:ut.meshphong_frag},standard:{uniforms:tn([Re.common,Re.envmap,Re.aomap,Re.lightmap,Re.emissivemap,Re.bumpmap,Re.normalmap,Re.displacementmap,Re.roughnessmap,Re.metalnessmap,Re.fog,Re.lights,{emissive:{value:new He(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:ut.meshphysical_vert,fragmentShader:ut.meshphysical_frag},toon:{uniforms:tn([Re.common,Re.aomap,Re.lightmap,Re.emissivemap,Re.bumpmap,Re.normalmap,Re.displacementmap,Re.gradientmap,Re.fog,Re.lights,{emissive:{value:new He(0)}}]),vertexShader:ut.meshtoon_vert,fragmentShader:ut.meshtoon_frag},matcap:{uniforms:tn([Re.common,Re.bumpmap,Re.normalmap,Re.displacementmap,Re.fog,{matcap:{value:null}}]),vertexShader:ut.meshmatcap_vert,fragmentShader:ut.meshmatcap_frag},points:{uniforms:tn([Re.points,Re.fog]),vertexShader:ut.points_vert,fragmentShader:ut.points_frag},dashed:{uniforms:tn([Re.common,Re.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:ut.linedashed_vert,fragmentShader:ut.linedashed_frag},depth:{uniforms:tn([Re.common,Re.displacementmap]),vertexShader:ut.depth_vert,fragmentShader:ut.depth_frag},normal:{uniforms:tn([Re.common,Re.bumpmap,Re.normalmap,Re.displacementmap,{opacity:{value:1}}]),vertexShader:ut.meshnormal_vert,fragmentShader:ut.meshnormal_frag},sprite:{uniforms:tn([Re.sprite,Re.fog]),vertexShader:ut.sprite_vert,fragmentShader:ut.sprite_frag},background:{uniforms:{uvTransform:{value:new Et},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:ut.background_vert,fragmentShader:ut.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Et}},vertexShader:ut.backgroundCube_vert,fragmentShader:ut.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:ut.cube_vert,fragmentShader:ut.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:ut.equirect_vert,fragmentShader:ut.equirect_frag},distanceRGBA:{uniforms:tn([Re.common,Re.displacementmap,{referencePosition:{value:new at},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:ut.distanceRGBA_vert,fragmentShader:ut.distanceRGBA_frag},shadow:{uniforms:tn([Re.lights,Re.fog,{color:{value:new He(0)},opacity:{value:1}}]),vertexShader:ut.shadow_vert,fragmentShader:ut.shadow_frag}};_n.physical={uniforms:tn([_n.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Et},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Et},clearcoatNormalScale:{value:new Jt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Et},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Et},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Et},sheen:{value:0},sheenColor:{value:new He(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Et},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Et},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Et},transmissionSamplerSize:{value:new Jt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Et},attenuationDistance:{value:0},attenuationColor:{value:new He(0)},specularColor:{value:new He(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Et},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Et},anisotropyVector:{value:new Jt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Et}}]),vertexShader:ut.meshphysical_vert,fragmentShader:ut.meshphysical_frag};const _i={r:0,b:0,g:0},yn=new cr,hd=new li;function md(e,n,t,i,o,a,c){const l=new He(0);let g=a===!0?0:1,v,b,T=null,x=0,w=null;function B(R){let M=R.isScene===!0?R.background:null;return M&&M.isTexture&&(M=(R.backgroundBlurriness>0?t:n).get(M)),M}function C(R){let M=!1;const y=B(R);y===null?r(l,g):y&&y.isColor&&(r(y,1),M=!0);const N=e.xr.getEnvironmentBlendMode();N==="additive"?i.buffers.color.setClear(0,0,0,1,c):N==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,c),(e.autoClear||M)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function d(R,M){const y=B(M);y&&(y.isCubeTexture||y.mapping===Ni)?(b===void 0&&(b=new P(new Ct(1,1,1),new Bn({name:"BackgroundCubeMaterial",uniforms:sa(_n.backgroundCube.uniforms),vertexShader:_n.backgroundCube.vertexShader,fragmentShader:_n.backgroundCube.fragmentShader,side:cn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),b.geometry.deleteAttribute("normal"),b.geometry.deleteAttribute("uv"),b.onBeforeRender=function(N,k,G){this.matrixWorld.copyPosition(G.matrixWorld)},Object.defineProperty(b.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),o.update(b)),yn.copy(M.backgroundRotation),yn.x*=-1,yn.y*=-1,yn.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(yn.y*=-1,yn.z*=-1),b.material.uniforms.envMap.value=y,b.material.uniforms.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,b.material.uniforms.backgroundBlurriness.value=M.backgroundBlurriness,b.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,b.material.uniforms.backgroundRotation.value.setFromMatrix4(hd.makeRotationFromEuler(yn)),b.material.toneMapped=Ht.getTransfer(y.colorSpace)!==Dt,(T!==y||x!==y.version||w!==e.toneMapping)&&(b.material.needsUpdate=!0,T=y,x=y.version,w=e.toneMapping),b.layers.enableAll(),R.unshift(b,b.geometry,b.material,0,0,null)):y&&y.isTexture&&(v===void 0&&(v=new P(new an(2,2),new Bn({name:"BackgroundMaterial",uniforms:sa(_n.background.uniforms),vertexShader:_n.background.vertexShader,fragmentShader:_n.background.fragmentShader,side:fi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),v.geometry.deleteAttribute("normal"),Object.defineProperty(v.material,"map",{get:function(){return this.uniforms.t2D.value}}),o.update(v)),v.material.uniforms.t2D.value=y,v.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,v.material.toneMapped=Ht.getTransfer(y.colorSpace)!==Dt,y.matrixAutoUpdate===!0&&y.updateMatrix(),v.material.uniforms.uvTransform.value.copy(y.matrix),(T!==y||x!==y.version||w!==e.toneMapping)&&(v.material.needsUpdate=!0,T=y,x=y.version,w=e.toneMapping),v.layers.enableAll(),R.unshift(v,v.geometry,v.material,0,0,null))}function r(R,M){R.getRGB(_i,sr(e)),i.buffers.color.setClear(_i.r,_i.g,_i.b,M,c)}function L(){b!==void 0&&(b.geometry.dispose(),b.material.dispose(),b=void 0),v!==void 0&&(v.geometry.dispose(),v.material.dispose(),v=void 0)}return{getClearColor:function(){return l},setClearColor:function(R,M=1){l.set(R),g=M,r(l,g)},getClearAlpha:function(){return g},setClearAlpha:function(R){g=R,r(l,g)},render:C,addToRenderList:d,dispose:L}}function _d(e,n){const t=e.getParameter(e.MAX_VERTEX_ATTRIBS),i={},o=x(null);let a=o,c=!1;function l(p,D,F,q,Q){let ne=!1;const j=T(q,F,D);a!==j&&(a=j,v(a.object)),ne=w(p,q,F,Q),ne&&B(p,q,F,Q),Q!==null&&n.update(Q,e.ELEMENT_ARRAY_BUFFER),(ne||c)&&(c=!1,M(p,D,F,q),Q!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,n.get(Q).buffer))}function g(){return e.createVertexArray()}function v(p){return e.bindVertexArray(p)}function b(p){return e.deleteVertexArray(p)}function T(p,D,F){const q=F.wireframe===!0;let Q=i[p.id];Q===void 0&&(Q={},i[p.id]=Q);let ne=Q[D.id];ne===void 0&&(ne={},Q[D.id]=ne);let j=ne[q];return j===void 0&&(j=x(g()),ne[q]=j),j}function x(p){const D=[],F=[],q=[];for(let Q=0;Q<t;Q++)D[Q]=0,F[Q]=0,q[Q]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:D,enabledAttributes:F,attributeDivisors:q,object:p,attributes:{},index:null}}function w(p,D,F,q){const Q=a.attributes,ne=D.attributes;let j=0;const ve=F.getAttributes();for(const Z in ve)if(ve[Z].location>=0){const Ye=Q[Z];let Ze=ne[Z];if(Ze===void 0&&(Z==="instanceMatrix"&&p.instanceMatrix&&(Ze=p.instanceMatrix),Z==="instanceColor"&&p.instanceColor&&(Ze=p.instanceColor)),Ye===void 0||Ye.attribute!==Ze||Ze&&Ye.data!==Ze.data)return!0;j++}return a.attributesNum!==j||a.index!==q}function B(p,D,F,q){const Q={},ne=D.attributes;let j=0;const ve=F.getAttributes();for(const Z in ve)if(ve[Z].location>=0){let Ye=ne[Z];Ye===void 0&&(Z==="instanceMatrix"&&p.instanceMatrix&&(Ye=p.instanceMatrix),Z==="instanceColor"&&p.instanceColor&&(Ye=p.instanceColor));const Ze={};Ze.attribute=Ye,Ye&&Ye.data&&(Ze.data=Ye.data),Q[Z]=Ze,j++}a.attributes=Q,a.attributesNum=j,a.index=q}function C(){const p=a.newAttributes;for(let D=0,F=p.length;D<F;D++)p[D]=0}function d(p){r(p,0)}function r(p,D){const F=a.newAttributes,q=a.enabledAttributes,Q=a.attributeDivisors;F[p]=1,q[p]===0&&(e.enableVertexAttribArray(p),q[p]=1),Q[p]!==D&&(e.vertexAttribDivisor(p,D),Q[p]=D)}function L(){const p=a.newAttributes,D=a.enabledAttributes;for(let F=0,q=D.length;F<q;F++)D[F]!==p[F]&&(e.disableVertexAttribArray(F),D[F]=0)}function R(p,D,F,q,Q,ne,j){j===!0?e.vertexAttribIPointer(p,D,F,Q,ne):e.vertexAttribPointer(p,D,F,q,Q,ne)}function M(p,D,F,q){C();const Q=q.attributes,ne=F.getAttributes(),j=D.defaultAttributeValues;for(const ve in ne){const Z=ne[ve];if(Z.location>=0){let Le=Q[ve];if(Le===void 0&&(ve==="instanceMatrix"&&p.instanceMatrix&&(Le=p.instanceMatrix),ve==="instanceColor"&&p.instanceColor&&(Le=p.instanceColor)),Le!==void 0){const Ye=Le.normalized,Ze=Le.itemSize,ct=n.get(Le);if(ct===void 0)continue;const vt=ct.buffer,Qe=ct.type,lt=ct.bytesPerElement,$=Qe===e.INT||Qe===e.UNSIGNED_INT||Le.gpuType===nr;if(Le.isInterleavedBufferAttribute){const Y=Le.data,ue=Y.stride,ye=Le.offset;if(Y.isInstancedInterleavedBuffer){for(let Te=0;Te<Z.locationSize;Te++)r(Z.location+Te,Y.meshPerAttribute);p.isInstancedMesh!==!0&&q._maxInstanceCount===void 0&&(q._maxInstanceCount=Y.meshPerAttribute*Y.count)}else for(let Te=0;Te<Z.locationSize;Te++)d(Z.location+Te);e.bindBuffer(e.ARRAY_BUFFER,vt);for(let Te=0;Te<Z.locationSize;Te++)R(Z.location+Te,Ze/Z.locationSize,Qe,Ye,ue*lt,(ye+Ze/Z.locationSize*Te)*lt,$)}else{if(Le.isInstancedBufferAttribute){for(let Y=0;Y<Z.locationSize;Y++)r(Z.location+Y,Le.meshPerAttribute);p.isInstancedMesh!==!0&&q._maxInstanceCount===void 0&&(q._maxInstanceCount=Le.meshPerAttribute*Le.count)}else for(let Y=0;Y<Z.locationSize;Y++)d(Z.location+Y);e.bindBuffer(e.ARRAY_BUFFER,vt);for(let Y=0;Y<Z.locationSize;Y++)R(Z.location+Y,Ze/Z.locationSize,Qe,Ye,Ze*lt,Ze/Z.locationSize*Y*lt,$)}}else if(j!==void 0){const Ye=j[ve];if(Ye!==void 0)switch(Ye.length){case 2:e.vertexAttrib2fv(Z.location,Ye);break;case 3:e.vertexAttrib3fv(Z.location,Ye);break;case 4:e.vertexAttrib4fv(Z.location,Ye);break;default:e.vertexAttrib1fv(Z.location,Ye)}}}}L()}function y(){G();for(const p in i){const D=i[p];for(const F in D){const q=D[F];for(const Q in q)b(q[Q].object),delete q[Q];delete D[F]}delete i[p]}}function N(p){if(i[p.id]===void 0)return;const D=i[p.id];for(const F in D){const q=D[F];for(const Q in q)b(q[Q].object),delete q[Q];delete D[F]}delete i[p.id]}function k(p){for(const D in i){const F=i[D];if(F[p.id]===void 0)continue;const q=F[p.id];for(const Q in q)b(q[Q].object),delete q[Q];delete F[p.id]}}function G(){h(),c=!0,a!==o&&(a=o,v(a.object))}function h(){o.geometry=null,o.program=null,o.wireframe=!1}return{setup:l,reset:G,resetDefaultState:h,dispose:y,releaseStatesOfGeometry:N,releaseStatesOfProgram:k,initAttributes:C,enableAttribute:d,disableUnusedAttributes:L}}function gd(e,n,t){let i;function o(v){i=v}function a(v,b){e.drawArrays(i,v,b),t.update(b,i,1)}function c(v,b,T){T!==0&&(e.drawArraysInstanced(i,v,b,T),t.update(b,i,T))}function l(v,b,T){if(T===0)return;n.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,v,0,b,0,T);let w=0;for(let B=0;B<T;B++)w+=b[B];t.update(w,i,1)}function g(v,b,T,x){if(T===0)return;const w=n.get("WEBGL_multi_draw");if(w===null)for(let B=0;B<v.length;B++)c(v[B],b[B],x[B]);else{w.multiDrawArraysInstancedWEBGL(i,v,0,b,0,x,0,T);let B=0;for(let C=0;C<T;C++)B+=b[C]*x[C];t.update(B,i,1)}}this.setMode=o,this.render=a,this.renderInstances=c,this.renderMultiDraw=l,this.renderMultiDrawInstances=g}function vd(e,n,t,i){let o;function a(){if(o!==void 0)return o;if(n.has("EXT_texture_filter_anisotropic")===!0){const k=n.get("EXT_texture_filter_anisotropic");o=e.getParameter(k.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else o=0;return o}function c(k){return!(k!==Mn&&i.convert(k)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT))}function l(k){const G=k===Li&&(n.has("EXT_color_buffer_half_float")||n.has("EXT_color_buffer_float"));return!(k!==On&&i.convert(k)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE)&&k!==Un&&!G)}function g(k){if(k==="highp"){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return"highp";k="mediump"}return k==="mediump"&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let v=t.precision!==void 0?t.precision:"highp";const b=g(v);b!==v&&(console.warn("THREE.WebGLRenderer:",v,"not supported, using",b,"instead."),v=b);const T=t.logarithmicDepthBuffer===!0,x=t.reversedDepthBuffer===!0&&n.has("EXT_clip_control"),w=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),B=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),C=e.getParameter(e.MAX_TEXTURE_SIZE),d=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),r=e.getParameter(e.MAX_VERTEX_ATTRIBS),L=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),R=e.getParameter(e.MAX_VARYING_VECTORS),M=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),y=B>0,N=e.getParameter(e.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:g,textureFormatReadable:c,textureTypeReadable:l,precision:v,logarithmicDepthBuffer:T,reversedDepthBuffer:x,maxTextures:w,maxVertexTextures:B,maxTextureSize:C,maxCubemapSize:d,maxAttributes:r,maxVertexUniforms:L,maxVaryings:R,maxFragmentUniforms:M,vertexTextures:y,maxSamples:N}}function Sd(e){const n=this;let t=null,i=0,o=!1,a=!1;const c=new Bs,l=new Et,g={value:null,needsUpdate:!1};this.uniform=g,this.numPlanes=0,this.numIntersection=0,this.init=function(T,x){const w=T.length!==0||x||i!==0||o;return o=x,i=T.length,w},this.beginShadows=function(){a=!0,b(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(T,x){t=b(T,x,0)},this.setState=function(T,x,w){const B=T.clippingPlanes,C=T.clipIntersection,d=T.clipShadows,r=e.get(T);if(!o||B===null||B.length===0||a&&!d)a?b(null):v();else{const L=a?0:i,R=L*4;let M=r.clippingState||null;g.value=M,M=b(B,x,R,w);for(let y=0;y!==R;++y)M[y]=t[y];r.clippingState=M,this.numIntersection=C?this.numPlanes:0,this.numPlanes+=L}};function v(){g.value!==t&&(g.value=t,g.needsUpdate=i>0),n.numPlanes=i,n.numIntersection=0}function b(T,x,w,B){const C=T!==null?T.length:0;let d=null;if(C!==0){if(d=g.value,B!==!0||d===null){const r=w+C*4,L=x.matrixWorldInverse;l.getNormalMatrix(L),(d===null||d.length<r)&&(d=new Float32Array(r));for(let R=0,M=w;R!==C;++R,M+=4)c.copy(T[R]).applyMatrix4(L,l),c.normal.toArray(d,M),d[M+3]=c.constant}g.value=d,g.needsUpdate=!0}return n.numPlanes=C,n.numIntersection=0,d}}function Md(e){let n=new WeakMap;function t(c,l){return l===ho?c.mapping=pi:l===mo&&(c.mapping=Zn),c}function i(c){if(c&&c.isTexture){const l=c.mapping;if(l===ho||l===mo)if(n.has(c)){const g=n.get(c).texture;return t(g,c.mapping)}else{const g=c.image;if(g&&g.height>0){const v=new Js(g.height);return v.fromEquirectangularTexture(e,c),n.set(c,v),c.addEventListener("dispose",o),t(v.texture,c.mapping)}else return null}}return c}function o(c){const l=c.target;l.removeEventListener("dispose",o);const g=n.get(l);g!==void 0&&(n.delete(l),g.dispose())}function a(){n=new WeakMap}return{get:i,dispose:a}}const Xn=4,pa=[.125,.215,.35,.446,.526,.582],In=20,Yi=new ic,ha=new He;let qi=null,Ki=0,Zi=0,$i=!1;const Dn=(1+Math.sqrt(5))/2,Gn=1/Dn,ma=[new at(-Dn,Gn,0),new at(Dn,Gn,0),new at(-Gn,0,Dn),new at(Gn,0,Dn),new at(0,Dn,-Gn),new at(0,Dn,Gn),new at(-1,1,-1),new at(1,1,-1),new at(-1,1,1),new at(1,1,1)],Ed=new at;class _a{constructor(n){this._renderer=n,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(n,t=0,i=.1,o=100,a={}){const{size:c=256,position:l=Ed}=a;qi=this._renderer.getRenderTarget(),Ki=this._renderer.getActiveCubeFace(),Zi=this._renderer.getActiveMipmapLevel(),$i=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(c);const g=this._allocateTargets();return g.depthBuffer=!0,this._sceneToCubeUV(n,i,o,g,l),t>0&&this._blur(g,0,0,t),this._applyPMREM(g),this._cleanup(g),g}fromEquirectangular(n,t=null){return this._fromTexture(n,t)}fromCubemap(n,t=null){return this._fromTexture(n,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Sa(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=va(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(n){this._lodMax=Math.floor(Math.log2(n)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let n=0;n<this._lodPlanes.length;n++)this._lodPlanes[n].dispose()}_cleanup(n){this._renderer.setRenderTarget(qi,Ki,Zi),this._renderer.xr.enabled=$i,n.scissorTest=!1,gi(n,0,0,n.width,n.height)}_fromTexture(n,t){n.mapping===pi||n.mapping===Zn?this._setSize(n.image.length===0?16:n.image[0].width||n.image[0].image.width):this._setSize(n.image.width/4),qi=this._renderer.getRenderTarget(),Ki=this._renderer.getActiveCubeFace(),Zi=this._renderer.getActiveMipmapLevel(),$i=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(n,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const n=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:gn,minFilter:gn,generateMipmaps:!1,type:Li,format:Mn,colorSpace:Ui,depthBuffer:!1},o=ga(n,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==n||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=ga(n,t,i);const{_lodMax:a}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=xd(a)),this._blurMaterial=Td(a,n,t)}return o}_compileMaterial(n){const t=new P(this._lodPlanes[0],n);this._renderer.compile(t,Yi)}_sceneToCubeUV(n,t,i,o,a){const g=new ri(90,1,t,i),v=[1,-1,1,1,1,1],b=[1,1,1,-1,-1,-1],T=this._renderer,x=T.autoClear,w=T.toneMapping;T.getClearColor(ha),T.toneMapping=bn,T.autoClear=!1,T.state.buffers.depth.getReversed()&&(T.setRenderTarget(o),T.clearDepth(),T.setRenderTarget(null));const C=new wn({name:"PMREM.Background",side:cn,depthWrite:!1,depthTest:!1}),d=new P(new Ct,C);let r=!1;const L=n.background;L?L.isColor&&(C.color.copy(L),n.background=null,r=!0):(C.color.copy(ha),r=!0);for(let R=0;R<6;R++){const M=R%3;M===0?(g.up.set(0,v[R],0),g.position.set(a.x,a.y,a.z),g.lookAt(a.x+b[R],a.y,a.z)):M===1?(g.up.set(0,0,v[R]),g.position.set(a.x,a.y,a.z),g.lookAt(a.x,a.y+b[R],a.z)):(g.up.set(0,v[R],0),g.position.set(a.x,a.y,a.z),g.lookAt(a.x,a.y,a.z+b[R]));const y=this._cubeSize;gi(o,M*y,R>2?y:0,y,y),T.setRenderTarget(o),r&&T.render(d,g),T.render(n,g)}d.geometry.dispose(),d.material.dispose(),T.toneMapping=w,T.autoClear=x,n.background=L}_textureToCubeUV(n,t){const i=this._renderer,o=n.mapping===pi||n.mapping===Zn;o?(this._cubemapMaterial===null&&(this._cubemapMaterial=Sa()),this._cubemapMaterial.uniforms.flipEnvMap.value=n.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=va());const a=o?this._cubemapMaterial:this._equirectMaterial,c=new P(this._lodPlanes[0],a),l=a.uniforms;l.envMap.value=n;const g=this._cubeSize;gi(t,0,0,3*g,2*g),i.setRenderTarget(t),i.render(c,Yi)}_applyPMREM(n){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const o=this._lodPlanes.length;for(let a=1;a<o;a++){const c=Math.sqrt(this._sigmas[a]*this._sigmas[a]-this._sigmas[a-1]*this._sigmas[a-1]),l=ma[(o-a-1)%ma.length];this._blur(n,a-1,a,c,l)}t.autoClear=i}_blur(n,t,i,o,a){const c=this._pingPongRenderTarget;this._halfBlur(n,c,t,i,o,"latitudinal",a),this._halfBlur(c,n,i,i,o,"longitudinal",a)}_halfBlur(n,t,i,o,a,c,l){const g=this._renderer,v=this._blurMaterial;c!=="latitudinal"&&c!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const b=3,T=new P(this._lodPlanes[o],v),x=v.uniforms,w=this._sizeLods[i]-1,B=isFinite(a)?Math.PI/(2*w):2*Math.PI/(2*In-1),C=a/B,d=isFinite(a)?1+Math.floor(b*C):In;d>In&&console.warn(`sigmaRadians, ${a}, is too large and will clip, as it requested ${d} samples when the maximum is set to ${In}`);const r=[];let L=0;for(let k=0;k<In;++k){const G=k/C,h=Math.exp(-G*G/2);r.push(h),k===0?L+=h:k<d&&(L+=2*h)}for(let k=0;k<r.length;k++)r[k]=r[k]/L;x.envMap.value=n.texture,x.samples.value=d,x.weights.value=r,x.latitudinal.value=c==="latitudinal",l&&(x.poleAxis.value=l);const{_lodMax:R}=this;x.dTheta.value=B,x.mipInt.value=R-i;const M=this._sizeLods[o],y=3*M*(o>R-Xn?o-R+Xn:0),N=4*(this._cubeSize-M);gi(t,y,N,3*M,2*M),g.setRenderTarget(t),g.render(T,Yi)}}function xd(e){const n=[],t=[],i=[];let o=e;const a=e-Xn+1+pa.length;for(let c=0;c<a;c++){const l=Math.pow(2,o);t.push(l);let g=1/l;c>e-Xn?g=pa[c-e+Xn-1]:c===0&&(g=0),i.push(g);const v=1/(l-2),b=-v,T=1+v,x=[b,b,T,b,T,T,b,b,T,T,b,T],w=6,B=6,C=3,d=2,r=1,L=new Float32Array(C*B*w),R=new Float32Array(d*B*w),M=new Float32Array(r*B*w);for(let N=0;N<w;N++){const k=N%3*2/3-1,G=N>2?0:-1,h=[k,G,0,k+2/3,G,0,k+2/3,G+1,0,k,G,0,k+2/3,G+1,0,k,G+1,0];L.set(h,C*B*N),R.set(x,d*B*N);const p=[N,N,N,N,N,N];M.set(p,r*B*N)}const y=new Kn;y.setAttribute("position",new An(L,C)),y.setAttribute("uv",new An(R,d)),y.setAttribute("faceIndex",new An(M,r)),n.push(y),o>Xn&&o--}return{lodPlanes:n,sizeLods:t,sigmas:i}}function ga(e,n,t){const i=new qn(e,n,t);return i.texture.mapping=Ni,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function gi(e,n,t,i,o){e.viewport.set(n,t,i,o),e.scissor.set(n,t,i,o)}function Td(e,n,t){const i=new Float32Array(In),o=new at(0,1,0);return new Bn({name:"SphericalGaussianBlur",defines:{n:In,CUBEUV_TEXEL_WIDTH:1/n,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:o}},vertexShader:So(),fragmentShader:`

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
		`,blending:Nn,depthTest:!1,depthWrite:!1})}function va(){return new Bn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:So(),fragmentShader:`

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
		`,blending:Nn,depthTest:!1,depthWrite:!1})}function Sa(){return new Bn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:So(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Nn,depthTest:!1,depthWrite:!1})}function So(){return`

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
	`}function wd(e){let n=new WeakMap,t=null;function i(l){if(l&&l.isTexture){const g=l.mapping,v=g===ho||g===mo,b=g===pi||g===Zn;if(v||b){let T=n.get(l);const x=T!==void 0?T.texture.pmremVersion:0;if(l.isRenderTargetTexture&&l.pmremVersion!==x)return t===null&&(t=new _a(e)),T=v?t.fromEquirectangular(l,T):t.fromCubemap(l,T),T.texture.pmremVersion=l.pmremVersion,n.set(l,T),T.texture;if(T!==void 0)return T.texture;{const w=l.image;return v&&w&&w.height>0||b&&w&&o(w)?(t===null&&(t=new _a(e)),T=v?t.fromEquirectangular(l):t.fromCubemap(l),T.texture.pmremVersion=l.pmremVersion,n.set(l,T),l.addEventListener("dispose",a),T.texture):null}}}return l}function o(l){let g=0;const v=6;for(let b=0;b<v;b++)l[b]!==void 0&&g++;return g===v}function a(l){const g=l.target;g.removeEventListener("dispose",a);const v=n.get(g);v!==void 0&&(n.delete(g),v.dispose())}function c(){n=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:c}}function bd(e){const n={};function t(i){if(n[i]!==void 0)return n[i];let o;switch(i){case"WEBGL_depth_texture":o=e.getExtension("WEBGL_depth_texture")||e.getExtension("MOZ_WEBGL_depth_texture")||e.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":o=e.getExtension("EXT_texture_filter_anisotropic")||e.getExtension("MOZ_EXT_texture_filter_anisotropic")||e.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":o=e.getExtension("WEBGL_compressed_texture_s3tc")||e.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":o=e.getExtension("WEBGL_compressed_texture_pvrtc")||e.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:o=e.getExtension(i)}return n[i]=o,o}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const o=t(i);return o===null&&ao("THREE.WebGLRenderer: "+i+" extension not supported."),o}}}function Ad(e,n,t,i){const o={},a=new WeakMap;function c(T){const x=T.target;x.index!==null&&n.remove(x.index);for(const B in x.attributes)n.remove(x.attributes[B]);x.removeEventListener("dispose",c),delete o[x.id];const w=a.get(x);w&&(n.remove(w),a.delete(x)),i.releaseStatesOfGeometry(x),x.isInstancedBufferGeometry===!0&&delete x._maxInstanceCount,t.memory.geometries--}function l(T,x){return o[x.id]===!0||(x.addEventListener("dispose",c),o[x.id]=!0,t.memory.geometries++),x}function g(T){const x=T.attributes;for(const w in x)n.update(x[w],e.ARRAY_BUFFER)}function v(T){const x=[],w=T.index,B=T.attributes.position;let C=0;if(w!==null){const L=w.array;C=w.version;for(let R=0,M=L.length;R<M;R+=3){const y=L[R+0],N=L[R+1],k=L[R+2];x.push(y,N,N,k,k,y)}}else if(B!==void 0){const L=B.array;C=B.version;for(let R=0,M=L.length/3-1;R<M;R+=3){const y=R+0,N=R+1,k=R+2;x.push(y,N,N,k,k,y)}}else return;const d=new(rc(x)?oc:ac)(x,1);d.version=C;const r=a.get(T);r&&n.remove(r),a.set(T,d)}function b(T){const x=a.get(T);if(x){const w=T.index;w!==null&&x.version<w.version&&v(T)}else v(T);return a.get(T)}return{get:l,update:g,getWireframeAttribute:b}}function Rd(e,n,t){let i;function o(x){i=x}let a,c;function l(x){a=x.type,c=x.bytesPerElement}function g(x,w){e.drawElements(i,w,a,x*c),t.update(w,i,1)}function v(x,w,B){B!==0&&(e.drawElementsInstanced(i,w,a,x*c,B),t.update(w,i,B))}function b(x,w,B){if(B===0)return;n.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,w,0,a,x,0,B);let d=0;for(let r=0;r<B;r++)d+=w[r];t.update(d,i,1)}function T(x,w,B,C){if(B===0)return;const d=n.get("WEBGL_multi_draw");if(d===null)for(let r=0;r<x.length;r++)v(x[r]/c,w[r],C[r]);else{d.multiDrawElementsInstancedWEBGL(i,w,0,a,x,0,C,0,B);let r=0;for(let L=0;L<B;L++)r+=w[L]*C[L];t.update(r,i,1)}}this.setMode=o,this.setIndex=l,this.render=g,this.renderInstances=v,this.renderMultiDraw=b,this.renderMultiDrawInstances=T}function Cd(e){const n={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(a,c,l){switch(t.calls++,c){case e.TRIANGLES:t.triangles+=l*(a/3);break;case e.LINES:t.lines+=l*(a/2);break;case e.LINE_STRIP:t.lines+=l*(a-1);break;case e.LINE_LOOP:t.lines+=l*a;break;case e.POINTS:t.points+=l*a;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",c);break}}function o(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:n,render:t,programs:null,autoReset:!0,reset:o,update:i}}function yd(e,n,t){const i=new WeakMap,o=new on;function a(c,l,g){const v=c.morphTargetInfluences,b=l.morphAttributes.position||l.morphAttributes.normal||l.morphAttributes.color,T=b!==void 0?b.length:0;let x=i.get(l);if(x===void 0||x.count!==T){let h=function(){k.dispose(),i.delete(l),l.removeEventListener("dispose",h)};x!==void 0&&x.texture.dispose();const w=l.morphAttributes.position!==void 0,B=l.morphAttributes.normal!==void 0,C=l.morphAttributes.color!==void 0,d=l.morphAttributes.position||[],r=l.morphAttributes.normal||[],L=l.morphAttributes.color||[];let R=0;w===!0&&(R=1),B===!0&&(R=2),C===!0&&(R=3);let M=l.attributes.position.count*R,y=1;M>n.maxTextureSize&&(y=Math.ceil(M/n.maxTextureSize),M=n.maxTextureSize);const N=new Float32Array(M*y*4*T),k=new rr(N,M,y,T);k.type=Un,k.needsUpdate=!0;const G=R*4;for(let p=0;p<T;p++){const D=d[p],F=r[p],q=L[p],Q=M*y*4*p;for(let ne=0;ne<D.count;ne++){const j=ne*G;w===!0&&(o.fromBufferAttribute(D,ne),N[Q+j+0]=o.x,N[Q+j+1]=o.y,N[Q+j+2]=o.z,N[Q+j+3]=0),B===!0&&(o.fromBufferAttribute(F,ne),N[Q+j+4]=o.x,N[Q+j+5]=o.y,N[Q+j+6]=o.z,N[Q+j+7]=0),C===!0&&(o.fromBufferAttribute(q,ne),N[Q+j+8]=o.x,N[Q+j+9]=o.y,N[Q+j+10]=o.z,N[Q+j+11]=q.itemSize===4?o.w:1)}}x={count:T,texture:k,size:new Jt(M,y)},i.set(l,x),l.addEventListener("dispose",h)}if(c.isInstancedMesh===!0&&c.morphTexture!==null)g.getUniforms().setValue(e,"morphTexture",c.morphTexture,t);else{let w=0;for(let C=0;C<v.length;C++)w+=v[C];const B=l.morphTargetsRelative?1:1-w;g.getUniforms().setValue(e,"morphTargetBaseInfluence",B),g.getUniforms().setValue(e,"morphTargetInfluences",v)}g.getUniforms().setValue(e,"morphTargetsTexture",x.texture,t),g.getUniforms().setValue(e,"morphTargetsTextureSize",x.size)}return{update:a}}function Pd(e,n,t,i){let o=new WeakMap;function a(g){const v=i.render.frame,b=g.geometry,T=n.get(g,b);if(o.get(T)!==v&&(n.update(T),o.set(T,v)),g.isInstancedMesh&&(g.hasEventListener("dispose",l)===!1&&g.addEventListener("dispose",l),o.get(g)!==v&&(t.update(g.instanceMatrix,e.ARRAY_BUFFER),g.instanceColor!==null&&t.update(g.instanceColor,e.ARRAY_BUFFER),o.set(g,v))),g.isSkinnedMesh){const x=g.skeleton;o.get(x)!==v&&(x.update(),o.set(x,v))}return T}function c(){o=new WeakMap}function l(g){const v=g.target;v.removeEventListener("dispose",l),t.remove(v.instanceMatrix),v.instanceColor!==null&&t.remove(v.instanceColor)}return{update:a,dispose:c}}const hr=new _c,Ma=new $a(1,1),mr=new rr,_r=new mc,gr=new hc,Ea=[],xa=[],Ta=new Float32Array(16),wa=new Float32Array(9),ba=new Float32Array(4);function jn(e,n,t){const i=e[0];if(i<=0||i>0)return e;const o=n*t;let a=Ea[o];if(a===void 0&&(a=new Float32Array(o),Ea[o]=a),n!==0){i.toArray(a,0);for(let c=1,l=0;c!==n;++c)l+=t,e[c].toArray(a,l)}return a}function Vt(e,n){if(e.length!==n.length)return!1;for(let t=0,i=e.length;t<i;t++)if(e[t]!==n[t])return!1;return!0}function kt(e,n){for(let t=0,i=n.length;t<i;t++)e[t]=n[t]}function Oi(e,n){let t=xa[n];t===void 0&&(t=new Int32Array(n),xa[n]=t);for(let i=0;i!==n;++i)t[i]=e.allocateTextureUnit();return t}function Dd(e,n){const t=this.cache;t[0]!==n&&(e.uniform1f(this.addr,n),t[0]=n)}function Id(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y)&&(e.uniform2f(this.addr,n.x,n.y),t[0]=n.x,t[1]=n.y);else{if(Vt(t,n))return;e.uniform2fv(this.addr,n),kt(t,n)}}function Ld(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z)&&(e.uniform3f(this.addr,n.x,n.y,n.z),t[0]=n.x,t[1]=n.y,t[2]=n.z);else if(n.r!==void 0)(t[0]!==n.r||t[1]!==n.g||t[2]!==n.b)&&(e.uniform3f(this.addr,n.r,n.g,n.b),t[0]=n.r,t[1]=n.g,t[2]=n.b);else{if(Vt(t,n))return;e.uniform3fv(this.addr,n),kt(t,n)}}function Ud(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z||t[3]!==n.w)&&(e.uniform4f(this.addr,n.x,n.y,n.z,n.w),t[0]=n.x,t[1]=n.y,t[2]=n.z,t[3]=n.w);else{if(Vt(t,n))return;e.uniform4fv(this.addr,n),kt(t,n)}}function Nd(e,n){const t=this.cache,i=n.elements;if(i===void 0){if(Vt(t,n))return;e.uniformMatrix2fv(this.addr,!1,n),kt(t,n)}else{if(Vt(t,i))return;ba.set(i),e.uniformMatrix2fv(this.addr,!1,ba),kt(t,i)}}function Od(e,n){const t=this.cache,i=n.elements;if(i===void 0){if(Vt(t,n))return;e.uniformMatrix3fv(this.addr,!1,n),kt(t,n)}else{if(Vt(t,i))return;wa.set(i),e.uniformMatrix3fv(this.addr,!1,wa),kt(t,i)}}function Fd(e,n){const t=this.cache,i=n.elements;if(i===void 0){if(Vt(t,n))return;e.uniformMatrix4fv(this.addr,!1,n),kt(t,n)}else{if(Vt(t,i))return;Ta.set(i),e.uniformMatrix4fv(this.addr,!1,Ta),kt(t,i)}}function Bd(e,n){const t=this.cache;t[0]!==n&&(e.uniform1i(this.addr,n),t[0]=n)}function Gd(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y)&&(e.uniform2i(this.addr,n.x,n.y),t[0]=n.x,t[1]=n.y);else{if(Vt(t,n))return;e.uniform2iv(this.addr,n),kt(t,n)}}function Hd(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z)&&(e.uniform3i(this.addr,n.x,n.y,n.z),t[0]=n.x,t[1]=n.y,t[2]=n.z);else{if(Vt(t,n))return;e.uniform3iv(this.addr,n),kt(t,n)}}function Vd(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z||t[3]!==n.w)&&(e.uniform4i(this.addr,n.x,n.y,n.z,n.w),t[0]=n.x,t[1]=n.y,t[2]=n.z,t[3]=n.w);else{if(Vt(t,n))return;e.uniform4iv(this.addr,n),kt(t,n)}}function kd(e,n){const t=this.cache;t[0]!==n&&(e.uniform1ui(this.addr,n),t[0]=n)}function zd(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y)&&(e.uniform2ui(this.addr,n.x,n.y),t[0]=n.x,t[1]=n.y);else{if(Vt(t,n))return;e.uniform2uiv(this.addr,n),kt(t,n)}}function Wd(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z)&&(e.uniform3ui(this.addr,n.x,n.y,n.z),t[0]=n.x,t[1]=n.y,t[2]=n.z);else{if(Vt(t,n))return;e.uniform3uiv(this.addr,n),kt(t,n)}}function Xd(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z||t[3]!==n.w)&&(e.uniform4ui(this.addr,n.x,n.y,n.z,n.w),t[0]=n.x,t[1]=n.y,t[2]=n.z,t[3]=n.w);else{if(Vt(t,n))return;e.uniform4uiv(this.addr,n),kt(t,n)}}function Yd(e,n,t){const i=this.cache,o=t.allocateTextureUnit();i[0]!==o&&(e.uniform1i(this.addr,o),i[0]=o);let a;this.type===e.SAMPLER_2D_SHADOW?(Ma.compareFunction=Qa,a=Ma):a=hr,t.setTexture2D(n||a,o)}function qd(e,n,t){const i=this.cache,o=t.allocateTextureUnit();i[0]!==o&&(e.uniform1i(this.addr,o),i[0]=o),t.setTexture3D(n||_r,o)}function Kd(e,n,t){const i=this.cache,o=t.allocateTextureUnit();i[0]!==o&&(e.uniform1i(this.addr,o),i[0]=o),t.setTextureCube(n||gr,o)}function Zd(e,n,t){const i=this.cache,o=t.allocateTextureUnit();i[0]!==o&&(e.uniform1i(this.addr,o),i[0]=o),t.setTexture2DArray(n||mr,o)}function $d(e){switch(e){case 5126:return Dd;case 35664:return Id;case 35665:return Ld;case 35666:return Ud;case 35674:return Nd;case 35675:return Od;case 35676:return Fd;case 5124:case 35670:return Bd;case 35667:case 35671:return Gd;case 35668:case 35672:return Hd;case 35669:case 35673:return Vd;case 5125:return kd;case 36294:return zd;case 36295:return Wd;case 36296:return Xd;case 35678:case 36198:case 36298:case 36306:case 35682:return Yd;case 35679:case 36299:case 36307:return qd;case 35680:case 36300:case 36308:case 36293:return Kd;case 36289:case 36303:case 36311:case 36292:return Zd}}function Qd(e,n){e.uniform1fv(this.addr,n)}function jd(e,n){const t=jn(n,this.size,2);e.uniform2fv(this.addr,t)}function Jd(e,n){const t=jn(n,this.size,3);e.uniform3fv(this.addr,t)}function eu(e,n){const t=jn(n,this.size,4);e.uniform4fv(this.addr,t)}function tu(e,n){const t=jn(n,this.size,4);e.uniformMatrix2fv(this.addr,!1,t)}function nu(e,n){const t=jn(n,this.size,9);e.uniformMatrix3fv(this.addr,!1,t)}function iu(e,n){const t=jn(n,this.size,16);e.uniformMatrix4fv(this.addr,!1,t)}function ou(e,n){e.uniform1iv(this.addr,n)}function au(e,n){e.uniform2iv(this.addr,n)}function ru(e,n){e.uniform3iv(this.addr,n)}function su(e,n){e.uniform4iv(this.addr,n)}function cu(e,n){e.uniform1uiv(this.addr,n)}function lu(e,n){e.uniform2uiv(this.addr,n)}function fu(e,n){e.uniform3uiv(this.addr,n)}function du(e,n){e.uniform4uiv(this.addr,n)}function uu(e,n,t){const i=this.cache,o=n.length,a=Oi(t,o);Vt(i,a)||(e.uniform1iv(this.addr,a),kt(i,a));for(let c=0;c!==o;++c)t.setTexture2D(n[c]||hr,a[c])}function pu(e,n,t){const i=this.cache,o=n.length,a=Oi(t,o);Vt(i,a)||(e.uniform1iv(this.addr,a),kt(i,a));for(let c=0;c!==o;++c)t.setTexture3D(n[c]||_r,a[c])}function hu(e,n,t){const i=this.cache,o=n.length,a=Oi(t,o);Vt(i,a)||(e.uniform1iv(this.addr,a),kt(i,a));for(let c=0;c!==o;++c)t.setTextureCube(n[c]||gr,a[c])}function mu(e,n,t){const i=this.cache,o=n.length,a=Oi(t,o);Vt(i,a)||(e.uniform1iv(this.addr,a),kt(i,a));for(let c=0;c!==o;++c)t.setTexture2DArray(n[c]||mr,a[c])}function _u(e){switch(e){case 5126:return Qd;case 35664:return jd;case 35665:return Jd;case 35666:return eu;case 35674:return tu;case 35675:return nu;case 35676:return iu;case 5124:case 35670:return ou;case 35667:case 35671:return au;case 35668:case 35672:return ru;case 35669:case 35673:return su;case 5125:return cu;case 36294:return lu;case 36295:return fu;case 36296:return du;case 35678:case 36198:case 36298:case 36306:case 35682:return uu;case 35679:case 36299:case 36307:return pu;case 35680:case 36300:case 36308:case 36293:return hu;case 36289:case 36303:case 36311:case 36292:return mu}}class gu{constructor(n,t,i){this.id=n,this.addr=i,this.cache=[],this.type=t.type,this.setValue=$d(t.type)}}class vu{constructor(n,t,i){this.id=n,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=_u(t.type)}}class Su{constructor(n){this.id=n,this.seq=[],this.map={}}setValue(n,t,i){const o=this.seq;for(let a=0,c=o.length;a!==c;++a){const l=o[a];l.setValue(n,t[l.id],i)}}}const Qi=/(\w+)(\])?(\[|\.)?/g;function Aa(e,n){e.seq.push(n),e.map[n.id]=n}function Mu(e,n,t){const i=e.name,o=i.length;for(Qi.lastIndex=0;;){const a=Qi.exec(i),c=Qi.lastIndex;let l=a[1];const g=a[2]==="]",v=a[3];if(g&&(l=l|0),v===void 0||v==="["&&c+2===o){Aa(t,v===void 0?new gu(l,e,n):new vu(l,e,n));break}else{let T=t.map[l];T===void 0&&(T=new Su(l),Aa(t,T)),t=T}}}class Ri{constructor(n,t){this.seq=[],this.map={};const i=n.getProgramParameter(t,n.ACTIVE_UNIFORMS);for(let o=0;o<i;++o){const a=n.getActiveUniform(t,o),c=n.getUniformLocation(t,a.name);Mu(a,c,this)}}setValue(n,t,i,o){const a=this.map[t];a!==void 0&&a.setValue(n,i,o)}setOptional(n,t,i){const o=t[i];o!==void 0&&this.setValue(n,i,o)}static upload(n,t,i,o){for(let a=0,c=t.length;a!==c;++a){const l=t[a],g=i[l.id];g.needsUpdate!==!1&&l.setValue(n,g.value,o)}}static seqWithValue(n,t){const i=[];for(let o=0,a=n.length;o!==a;++o){const c=n[o];c.id in t&&i.push(c)}return i}}function Ra(e,n,t){const i=e.createShader(n);return e.shaderSource(i,t),e.compileShader(i),i}const Eu=37297;let xu=0;function Tu(e,n){const t=e.split(`
`),i=[],o=Math.max(n-6,0),a=Math.min(n+6,t.length);for(let c=o;c<a;c++){const l=c+1;i.push(`${l===n?">":" "} ${l}: ${t[c]}`)}return i.join(`
`)}const Ca=new Et;function wu(e){Ht._getMatrix(Ca,Ht.workingColorSpace,e);const n=`mat3( ${Ca.elements.map(t=>t.toFixed(4))} )`;switch(Ht.getTransfer(e)){case lr:return[n,"LinearTransferOETF"];case Dt:return[n,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",e),[n,"LinearTransferOETF"]}}function ya(e,n,t){const i=e.getShaderParameter(n,e.COMPILE_STATUS),a=(e.getShaderInfoLog(n)||"").trim();if(i&&a==="")return"";const c=/ERROR: 0:(\d+)/.exec(a);if(c){const l=parseInt(c[1]);return t.toUpperCase()+`

`+a+`

`+Tu(e.getShaderSource(n),l)}else return a}function bu(e,n){const t=wu(n);return[`vec4 ${e}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function Au(e,n){let t;switch(n){case pc:t="Linear";break;case uc:t="Reinhard";break;case dc:t="Cineon";break;case ci:t="ACESFilmic";break;case fc:t="AgX";break;case lc:t="Neutral";break;case cc:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",n),t="Linear"}return"vec3 "+e+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const vi=new at;function Ru(){Ht.getLuminanceCoefficients(vi);const e=vi.x.toFixed(4),n=vi.y.toFixed(4),t=vi.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${e}, ${n}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Cu(e){return[e.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",e.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(ai).join(`
`)}function yu(e){const n=[];for(const t in e){const i=e[t];i!==!1&&n.push("#define "+t+" "+i)}return n.join(`
`)}function Pu(e,n){const t={},i=e.getProgramParameter(n,e.ACTIVE_ATTRIBUTES);for(let o=0;o<i;o++){const a=e.getActiveAttrib(n,o),c=a.name;let l=1;a.type===e.FLOAT_MAT2&&(l=2),a.type===e.FLOAT_MAT3&&(l=3),a.type===e.FLOAT_MAT4&&(l=4),t[c]={type:a.type,location:e.getAttribLocation(n,c),locationSize:l}}return t}function ai(e){return e!==""}function Pa(e,n){const t=n.numSpotLightShadows+n.numSpotLightMaps-n.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,n.numDirLights).replace(/NUM_SPOT_LIGHTS/g,n.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,n.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,n.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,n.numPointLights).replace(/NUM_HEMI_LIGHTS/g,n.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,n.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,n.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,n.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,n.numPointLightShadows)}function Da(e,n){return e.replace(/NUM_CLIPPING_PLANES/g,n.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,n.numClippingPlanes-n.numClipIntersection)}const Du=/^[ \t]*#include +<([\w\d./]+)>/gm;function _o(e){return e.replace(Du,Lu)}const Iu=new Map;function Lu(e,n){let t=ut[n];if(t===void 0){const i=Iu.get(n);if(i!==void 0)t=ut[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',n,i);else throw new Error("Can not resolve #include <"+n+">")}return _o(t)}const Uu=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Ia(e){return e.replace(Uu,Nu)}function Nu(e,n,t,i){let o="";for(let a=parseInt(n);a<parseInt(t);a++)o+=i.replace(/\[\s*i\s*\]/g,"[ "+a+" ]").replace(/UNROLLED_LOOP_INDEX/g,a);return o}function La(e){let n=`precision ${e.precision} float;
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
	`;return e.precision==="highp"?n+=`
#define HIGH_PRECISION`:e.precision==="mediump"?n+=`
#define MEDIUM_PRECISION`:e.precision==="lowp"&&(n+=`
#define LOW_PRECISION`),n}function Ou(e){let n="SHADOWMAP_TYPE_BASIC";return e.shadowMapType===ja?n="SHADOWMAP_TYPE_PCF":e.shadowMapType===fr?n="SHADOWMAP_TYPE_PCF_SOFT":e.shadowMapType===vn&&(n="SHADOWMAP_TYPE_VSM"),n}function Fu(e){let n="ENVMAP_TYPE_CUBE";if(e.envMap)switch(e.envMapMode){case pi:case Zn:n="ENVMAP_TYPE_CUBE";break;case Ni:n="ENVMAP_TYPE_CUBE_UV";break}return n}function Bu(e){let n="ENVMAP_MODE_REFLECTION";return e.envMap&&e.envMapMode===Zn&&(n="ENVMAP_MODE_REFRACTION"),n}function Gu(e){let n="ENVMAP_BLENDING_NONE";if(e.envMap)switch(e.combine){case Mc:n="ENVMAP_BLENDING_MULTIPLY";break;case Sc:n="ENVMAP_BLENDING_MIX";break;case vc:n="ENVMAP_BLENDING_ADD";break}return n}function Hu(e){const n=e.envMapCubeUVHeight;if(n===null)return null;const t=Math.log2(n)-2,i=1/n;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:i,maxMip:t}}function Vu(e,n,t,i){const o=e.getContext(),a=t.defines;let c=t.vertexShader,l=t.fragmentShader;const g=Ou(t),v=Fu(t),b=Bu(t),T=Gu(t),x=Hu(t),w=Cu(t),B=yu(a),C=o.createProgram();let d,r,L=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(d=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,B].filter(ai).join(`
`),d.length>0&&(d+=`
`),r=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,B].filter(ai).join(`
`),r.length>0&&(r+=`
`)):(d=[La(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,B,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+b:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+g:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(ai).join(`
`),r=[La(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,B,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+v:"",t.envMap?"#define "+b:"",t.envMap?"#define "+T:"",x?"#define CUBEUV_TEXEL_WIDTH "+x.texelWidth:"",x?"#define CUBEUV_TEXEL_HEIGHT "+x.texelHeight:"",x?"#define CUBEUV_MAX_MIP "+x.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+g:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==bn?"#define TONE_MAPPING":"",t.toneMapping!==bn?ut.tonemapping_pars_fragment:"",t.toneMapping!==bn?Au("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",ut.colorspace_pars_fragment,bu("linearToOutputTexel",t.outputColorSpace),Ru(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(ai).join(`
`)),c=_o(c),c=Pa(c,t),c=Da(c,t),l=_o(l),l=Pa(l,t),l=Da(l,t),c=Ia(c),l=Ia(l),t.isRawShaderMaterial!==!0&&(L=`#version 300 es
`,d=[w,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+d,r=["#define varying in",t.glslVersion===la?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===la?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+r);const R=L+d+c,M=L+r+l,y=Ra(o,o.VERTEX_SHADER,R),N=Ra(o,o.FRAGMENT_SHADER,M);o.attachShader(C,y),o.attachShader(C,N),t.index0AttributeName!==void 0?o.bindAttribLocation(C,0,t.index0AttributeName):t.morphTargets===!0&&o.bindAttribLocation(C,0,"position"),o.linkProgram(C);function k(D){if(e.debug.checkShaderErrors){const F=o.getProgramInfoLog(C)||"",q=o.getShaderInfoLog(y)||"",Q=o.getShaderInfoLog(N)||"",ne=F.trim(),j=q.trim(),ve=Q.trim();let Z=!0,Le=!0;if(o.getProgramParameter(C,o.LINK_STATUS)===!1)if(Z=!1,typeof e.debug.onShaderError=="function")e.debug.onShaderError(o,C,y,N);else{const Ye=ya(o,y,"vertex"),Ze=ya(o,N,"fragment");console.error("THREE.WebGLProgram: Shader Error "+o.getError()+" - VALIDATE_STATUS "+o.getProgramParameter(C,o.VALIDATE_STATUS)+`

Material Name: `+D.name+`
Material Type: `+D.type+`

Program Info Log: `+ne+`
`+Ye+`
`+Ze)}else ne!==""?console.warn("THREE.WebGLProgram: Program Info Log:",ne):(j===""||ve==="")&&(Le=!1);Le&&(D.diagnostics={runnable:Z,programLog:ne,vertexShader:{log:j,prefix:d},fragmentShader:{log:ve,prefix:r}})}o.deleteShader(y),o.deleteShader(N),G=new Ri(o,C),h=Pu(o,C)}let G;this.getUniforms=function(){return G===void 0&&k(this),G};let h;this.getAttributes=function(){return h===void 0&&k(this),h};let p=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return p===!1&&(p=o.getProgramParameter(C,Eu)),p},this.destroy=function(){i.releaseStatesOfProgram(this),o.deleteProgram(C),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=xu++,this.cacheKey=n,this.usedTimes=1,this.program=C,this.vertexShader=y,this.fragmentShader=N,this}let ku=0;class zu{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(n){const t=n.vertexShader,i=n.fragmentShader,o=this._getShaderStage(t),a=this._getShaderStage(i),c=this._getShaderCacheForMaterial(n);return c.has(o)===!1&&(c.add(o),o.usedTimes++),c.has(a)===!1&&(c.add(a),a.usedTimes++),this}remove(n){const t=this.materialCache.get(n);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(n),this}getVertexShaderID(n){return this._getShaderStage(n.vertexShader).id}getFragmentShaderID(n){return this._getShaderStage(n.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(n){const t=this.materialCache;let i=t.get(n);return i===void 0&&(i=new Set,t.set(n,i)),i}_getShaderStage(n){const t=this.shaderCache;let i=t.get(n);return i===void 0&&(i=new Wu(n),t.set(n,i)),i}}class Wu{constructor(n){this.id=ku++,this.code=n,this.usedTimes=0}}function Xu(e,n,t,i,o,a,c){const l=new sc,g=new zu,v=new Set,b=[],T=o.logarithmicDepthBuffer,x=o.vertexTextures;let w=o.precision;const B={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function C(h){return v.add(h),h===0?"uv":`uv${h}`}function d(h,p,D,F,q){const Q=F.fog,ne=q.geometry,j=h.isMeshStandardMaterial?F.environment:null,ve=(h.isMeshStandardMaterial?t:n).get(h.envMap||j),Z=ve&&ve.mapping===Ni?ve.image.height:null,Le=B[h.type];h.precision!==null&&(w=o.getMaxPrecision(h.precision),w!==h.precision&&console.warn("THREE.WebGLProgram.getParameters:",h.precision,"not supported, using",w,"instead."));const Ye=ne.morphAttributes.position||ne.morphAttributes.normal||ne.morphAttributes.color,Ze=Ye!==void 0?Ye.length:0;let ct=0;ne.morphAttributes.position!==void 0&&(ct=1),ne.morphAttributes.normal!==void 0&&(ct=2),ne.morphAttributes.color!==void 0&&(ct=3);let vt,Qe,lt,$;if(Le){const st=_n[Le];vt=st.vertexShader,Qe=st.fragmentShader}else vt=h.vertexShader,Qe=h.fragmentShader,g.update(h),lt=g.getVertexShaderID(h),$=g.getFragmentShaderID(h);const Y=e.getRenderTarget(),ue=e.state.buffers.depth.getReversed(),ye=q.isInstancedMesh===!0,Te=q.isBatchedMesh===!0,Ve=!!h.map,Tt=!!h.matcap,S=!!ve,ke=!!h.aoMap,qe=!!h.lightMap,De=!!h.bumpMap,be=!!h.normalMap,St=!!h.displacementMap,Ne=!!h.emissiveMap,nt=!!h.metalnessMap,yt=!!h.roughnessMap,wt=h.anisotropy>0,_=h.clearcoat>0,s=h.dispersion>0,V=h.iridescence>0,J=h.sheen>0,de=h.transmission>0,K=wt&&!!h.anisotropyMap,Oe=_&&!!h.clearcoatMap,Ee=_&&!!h.clearcoatNormalMap,Ue=_&&!!h.clearcoatRoughnessMap,ze=V&&!!h.iridescenceMap,oe=V&&!!h.iridescenceThicknessMap,Se=J&&!!h.sheenColorMap,Xe=J&&!!h.sheenRoughnessMap,Fe=!!h.specularMap,xe=!!h.specularColorMap,et=!!h.specularIntensityMap,A=de&&!!h.transmissionMap,_e=de&&!!h.thicknessMap,Me=!!h.gradientMap,Ae=!!h.alphaMap,me=h.alphaTest>0,ae=!!h.alphaHash,Ie=!!h.extensions;let je=bn;h.toneMapped&&(Y===null||Y.isXRRenderTarget===!0)&&(je=e.toneMapping);const mt={shaderID:Le,shaderType:h.type,shaderName:h.name,vertexShader:vt,fragmentShader:Qe,defines:h.defines,customVertexShaderID:lt,customFragmentShaderID:$,isRawShaderMaterial:h.isRawShaderMaterial===!0,glslVersion:h.glslVersion,precision:w,batching:Te,batchingColor:Te&&q._colorsTexture!==null,instancing:ye,instancingColor:ye&&q.instanceColor!==null,instancingMorph:ye&&q.morphTexture!==null,supportsVertexTextures:x,outputColorSpace:Y===null?e.outputColorSpace:Y.isXRRenderTarget===!0?Y.texture.colorSpace:Ui,alphaToCoverage:!!h.alphaToCoverage,map:Ve,matcap:Tt,envMap:S,envMapMode:S&&ve.mapping,envMapCubeUVHeight:Z,aoMap:ke,lightMap:qe,bumpMap:De,normalMap:be,displacementMap:x&&St,emissiveMap:Ne,normalMapObjectSpace:be&&h.normalMapType===nc,normalMapTangentSpace:be&&h.normalMapType===tc,metalnessMap:nt,roughnessMap:yt,anisotropy:wt,anisotropyMap:K,clearcoat:_,clearcoatMap:Oe,clearcoatNormalMap:Ee,clearcoatRoughnessMap:Ue,dispersion:s,iridescence:V,iridescenceMap:ze,iridescenceThicknessMap:oe,sheen:J,sheenColorMap:Se,sheenRoughnessMap:Xe,specularMap:Fe,specularColorMap:xe,specularIntensityMap:et,transmission:de,transmissionMap:A,thicknessMap:_e,gradientMap:Me,opaque:h.transparent===!1&&h.blending===bi&&h.alphaToCoverage===!1,alphaMap:Ae,alphaTest:me,alphaHash:ae,combine:h.combine,mapUv:Ve&&C(h.map.channel),aoMapUv:ke&&C(h.aoMap.channel),lightMapUv:qe&&C(h.lightMap.channel),bumpMapUv:De&&C(h.bumpMap.channel),normalMapUv:be&&C(h.normalMap.channel),displacementMapUv:St&&C(h.displacementMap.channel),emissiveMapUv:Ne&&C(h.emissiveMap.channel),metalnessMapUv:nt&&C(h.metalnessMap.channel),roughnessMapUv:yt&&C(h.roughnessMap.channel),anisotropyMapUv:K&&C(h.anisotropyMap.channel),clearcoatMapUv:Oe&&C(h.clearcoatMap.channel),clearcoatNormalMapUv:Ee&&C(h.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Ue&&C(h.clearcoatRoughnessMap.channel),iridescenceMapUv:ze&&C(h.iridescenceMap.channel),iridescenceThicknessMapUv:oe&&C(h.iridescenceThicknessMap.channel),sheenColorMapUv:Se&&C(h.sheenColorMap.channel),sheenRoughnessMapUv:Xe&&C(h.sheenRoughnessMap.channel),specularMapUv:Fe&&C(h.specularMap.channel),specularColorMapUv:xe&&C(h.specularColorMap.channel),specularIntensityMapUv:et&&C(h.specularIntensityMap.channel),transmissionMapUv:A&&C(h.transmissionMap.channel),thicknessMapUv:_e&&C(h.thicknessMap.channel),alphaMapUv:Ae&&C(h.alphaMap.channel),vertexTangents:!!ne.attributes.tangent&&(be||wt),vertexColors:h.vertexColors,vertexAlphas:h.vertexColors===!0&&!!ne.attributes.color&&ne.attributes.color.itemSize===4,pointsUvs:q.isPoints===!0&&!!ne.attributes.uv&&(Ve||Ae),fog:!!Q,useFog:h.fog===!0,fogExp2:!!Q&&Q.isFogExp2,flatShading:h.flatShading===!0&&h.wireframe===!1,sizeAttenuation:h.sizeAttenuation===!0,logarithmicDepthBuffer:T,reversedDepthBuffer:ue,skinning:q.isSkinnedMesh===!0,morphTargets:ne.morphAttributes.position!==void 0,morphNormals:ne.morphAttributes.normal!==void 0,morphColors:ne.morphAttributes.color!==void 0,morphTargetsCount:Ze,morphTextureStride:ct,numDirLights:p.directional.length,numPointLights:p.point.length,numSpotLights:p.spot.length,numSpotLightMaps:p.spotLightMap.length,numRectAreaLights:p.rectArea.length,numHemiLights:p.hemi.length,numDirLightShadows:p.directionalShadowMap.length,numPointLightShadows:p.pointShadowMap.length,numSpotLightShadows:p.spotShadowMap.length,numSpotLightShadowsWithMaps:p.numSpotLightShadowsWithMaps,numLightProbes:p.numLightProbes,numClippingPlanes:c.numPlanes,numClipIntersection:c.numIntersection,dithering:h.dithering,shadowMapEnabled:e.shadowMap.enabled&&D.length>0,shadowMapType:e.shadowMap.type,toneMapping:je,decodeVideoTexture:Ve&&h.map.isVideoTexture===!0&&Ht.getTransfer(h.map.colorSpace)===Dt,decodeVideoTextureEmissive:Ne&&h.emissiveMap.isVideoTexture===!0&&Ht.getTransfer(h.emissiveMap.colorSpace)===Dt,premultipliedAlpha:h.premultipliedAlpha,doubleSided:h.side===It,flipSided:h.side===cn,useDepthPacking:h.depthPacking>=0,depthPacking:h.depthPacking||0,index0AttributeName:h.index0AttributeName,extensionClipCullDistance:Ie&&h.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Ie&&h.extensions.multiDraw===!0||Te)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:h.customProgramCacheKey()};return mt.vertexUv1s=v.has(1),mt.vertexUv2s=v.has(2),mt.vertexUv3s=v.has(3),v.clear(),mt}function r(h){const p=[];if(h.shaderID?p.push(h.shaderID):(p.push(h.customVertexShaderID),p.push(h.customFragmentShaderID)),h.defines!==void 0)for(const D in h.defines)p.push(D),p.push(h.defines[D]);return h.isRawShaderMaterial===!1&&(L(p,h),R(p,h),p.push(e.outputColorSpace)),p.push(h.customProgramCacheKey),p.join()}function L(h,p){h.push(p.precision),h.push(p.outputColorSpace),h.push(p.envMapMode),h.push(p.envMapCubeUVHeight),h.push(p.mapUv),h.push(p.alphaMapUv),h.push(p.lightMapUv),h.push(p.aoMapUv),h.push(p.bumpMapUv),h.push(p.normalMapUv),h.push(p.displacementMapUv),h.push(p.emissiveMapUv),h.push(p.metalnessMapUv),h.push(p.roughnessMapUv),h.push(p.anisotropyMapUv),h.push(p.clearcoatMapUv),h.push(p.clearcoatNormalMapUv),h.push(p.clearcoatRoughnessMapUv),h.push(p.iridescenceMapUv),h.push(p.iridescenceThicknessMapUv),h.push(p.sheenColorMapUv),h.push(p.sheenRoughnessMapUv),h.push(p.specularMapUv),h.push(p.specularColorMapUv),h.push(p.specularIntensityMapUv),h.push(p.transmissionMapUv),h.push(p.thicknessMapUv),h.push(p.combine),h.push(p.fogExp2),h.push(p.sizeAttenuation),h.push(p.morphTargetsCount),h.push(p.morphAttributeCount),h.push(p.numDirLights),h.push(p.numPointLights),h.push(p.numSpotLights),h.push(p.numSpotLightMaps),h.push(p.numHemiLights),h.push(p.numRectAreaLights),h.push(p.numDirLightShadows),h.push(p.numPointLightShadows),h.push(p.numSpotLightShadows),h.push(p.numSpotLightShadowsWithMaps),h.push(p.numLightProbes),h.push(p.shadowMapType),h.push(p.toneMapping),h.push(p.numClippingPlanes),h.push(p.numClipIntersection),h.push(p.depthPacking)}function R(h,p){l.disableAll(),p.supportsVertexTextures&&l.enable(0),p.instancing&&l.enable(1),p.instancingColor&&l.enable(2),p.instancingMorph&&l.enable(3),p.matcap&&l.enable(4),p.envMap&&l.enable(5),p.normalMapObjectSpace&&l.enable(6),p.normalMapTangentSpace&&l.enable(7),p.clearcoat&&l.enable(8),p.iridescence&&l.enable(9),p.alphaTest&&l.enable(10),p.vertexColors&&l.enable(11),p.vertexAlphas&&l.enable(12),p.vertexUv1s&&l.enable(13),p.vertexUv2s&&l.enable(14),p.vertexUv3s&&l.enable(15),p.vertexTangents&&l.enable(16),p.anisotropy&&l.enable(17),p.alphaHash&&l.enable(18),p.batching&&l.enable(19),p.dispersion&&l.enable(20),p.batchingColor&&l.enable(21),p.gradientMap&&l.enable(22),h.push(l.mask),l.disableAll(),p.fog&&l.enable(0),p.useFog&&l.enable(1),p.flatShading&&l.enable(2),p.logarithmicDepthBuffer&&l.enable(3),p.reversedDepthBuffer&&l.enable(4),p.skinning&&l.enable(5),p.morphTargets&&l.enable(6),p.morphNormals&&l.enable(7),p.morphColors&&l.enable(8),p.premultipliedAlpha&&l.enable(9),p.shadowMapEnabled&&l.enable(10),p.doubleSided&&l.enable(11),p.flipSided&&l.enable(12),p.useDepthPacking&&l.enable(13),p.dithering&&l.enable(14),p.transmission&&l.enable(15),p.sheen&&l.enable(16),p.opaque&&l.enable(17),p.pointsUvs&&l.enable(18),p.decodeVideoTexture&&l.enable(19),p.decodeVideoTextureEmissive&&l.enable(20),p.alphaToCoverage&&l.enable(21),h.push(l.mask)}function M(h){const p=B[h.type];let D;if(p){const F=_n[p];D=ec.clone(F.uniforms)}else D=h.uniforms;return D}function y(h,p){let D;for(let F=0,q=b.length;F<q;F++){const Q=b[F];if(Q.cacheKey===p){D=Q,++D.usedTimes;break}}return D===void 0&&(D=new Vu(e,p,h,a),b.push(D)),D}function N(h){if(--h.usedTimes===0){const p=b.indexOf(h);b[p]=b[b.length-1],b.pop(),h.destroy()}}function k(h){g.remove(h)}function G(){g.dispose()}return{getParameters:d,getProgramCacheKey:r,getUniforms:M,acquireProgram:y,releaseProgram:N,releaseShaderCache:k,programs:b,dispose:G}}function Yu(){let e=new WeakMap;function n(c){return e.has(c)}function t(c){let l=e.get(c);return l===void 0&&(l={},e.set(c,l)),l}function i(c){e.delete(c)}function o(c,l,g){e.get(c)[l]=g}function a(){e=new WeakMap}return{has:n,get:t,remove:i,update:o,dispose:a}}function qu(e,n){return e.groupOrder!==n.groupOrder?e.groupOrder-n.groupOrder:e.renderOrder!==n.renderOrder?e.renderOrder-n.renderOrder:e.material.id!==n.material.id?e.material.id-n.material.id:e.z!==n.z?e.z-n.z:e.id-n.id}function Ua(e,n){return e.groupOrder!==n.groupOrder?e.groupOrder-n.groupOrder:e.renderOrder!==n.renderOrder?e.renderOrder-n.renderOrder:e.z!==n.z?n.z-e.z:e.id-n.id}function Na(){const e=[];let n=0;const t=[],i=[],o=[];function a(){n=0,t.length=0,i.length=0,o.length=0}function c(T,x,w,B,C,d){let r=e[n];return r===void 0?(r={id:T.id,object:T,geometry:x,material:w,groupOrder:B,renderOrder:T.renderOrder,z:C,group:d},e[n]=r):(r.id=T.id,r.object=T,r.geometry=x,r.material=w,r.groupOrder=B,r.renderOrder=T.renderOrder,r.z=C,r.group=d),n++,r}function l(T,x,w,B,C,d){const r=c(T,x,w,B,C,d);w.transmission>0?i.push(r):w.transparent===!0?o.push(r):t.push(r)}function g(T,x,w,B,C,d){const r=c(T,x,w,B,C,d);w.transmission>0?i.unshift(r):w.transparent===!0?o.unshift(r):t.unshift(r)}function v(T,x){t.length>1&&t.sort(T||qu),i.length>1&&i.sort(x||Ua),o.length>1&&o.sort(x||Ua)}function b(){for(let T=n,x=e.length;T<x;T++){const w=e[T];if(w.id===null)break;w.id=null,w.object=null,w.geometry=null,w.material=null,w.group=null}}return{opaque:t,transmissive:i,transparent:o,init:a,push:l,unshift:g,finish:b,sort:v}}function Ku(){let e=new WeakMap;function n(i,o){const a=e.get(i);let c;return a===void 0?(c=new Na,e.set(i,[c])):o>=a.length?(c=new Na,a.push(c)):c=a[o],c}function t(){e=new WeakMap}return{get:n,dispose:t}}function Zu(){const e={};return{get:function(n){if(e[n.id]!==void 0)return e[n.id];let t;switch(n.type){case"DirectionalLight":t={direction:new at,color:new He};break;case"SpotLight":t={position:new at,direction:new at,color:new He,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new at,color:new He,distance:0,decay:0};break;case"HemisphereLight":t={direction:new at,skyColor:new He,groundColor:new He};break;case"RectAreaLight":t={color:new He,position:new at,halfWidth:new at,halfHeight:new at};break}return e[n.id]=t,t}}}function $u(){const e={};return{get:function(n){if(e[n.id]!==void 0)return e[n.id];let t;switch(n.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Jt};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Jt};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Jt,shadowCameraNear:1,shadowCameraFar:1e3};break}return e[n.id]=t,t}}}let Qu=0;function ju(e,n){return(n.castShadow?2:0)-(e.castShadow?2:0)+(n.map?1:0)-(e.map?1:0)}function Ju(e){const n=new Zu,t=$u(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let v=0;v<9;v++)i.probe.push(new at);const o=new at,a=new li,c=new li;function l(v){let b=0,T=0,x=0;for(let h=0;h<9;h++)i.probe[h].set(0,0,0);let w=0,B=0,C=0,d=0,r=0,L=0,R=0,M=0,y=0,N=0,k=0;v.sort(ju);for(let h=0,p=v.length;h<p;h++){const D=v[h],F=D.color,q=D.intensity,Q=D.distance,ne=D.shadow&&D.shadow.map?D.shadow.map.texture:null;if(D.isAmbientLight)b+=F.r*q,T+=F.g*q,x+=F.b*q;else if(D.isLightProbe){for(let j=0;j<9;j++)i.probe[j].addScaledVector(D.sh.coefficients[j],q);k++}else if(D.isDirectionalLight){const j=n.get(D);if(j.color.copy(D.color).multiplyScalar(D.intensity),D.castShadow){const ve=D.shadow,Z=t.get(D);Z.shadowIntensity=ve.intensity,Z.shadowBias=ve.bias,Z.shadowNormalBias=ve.normalBias,Z.shadowRadius=ve.radius,Z.shadowMapSize=ve.mapSize,i.directionalShadow[w]=Z,i.directionalShadowMap[w]=ne,i.directionalShadowMatrix[w]=D.shadow.matrix,L++}i.directional[w]=j,w++}else if(D.isSpotLight){const j=n.get(D);j.position.setFromMatrixPosition(D.matrixWorld),j.color.copy(F).multiplyScalar(q),j.distance=Q,j.coneCos=Math.cos(D.angle),j.penumbraCos=Math.cos(D.angle*(1-D.penumbra)),j.decay=D.decay,i.spot[C]=j;const ve=D.shadow;if(D.map&&(i.spotLightMap[y]=D.map,y++,ve.updateMatrices(D),D.castShadow&&N++),i.spotLightMatrix[C]=ve.matrix,D.castShadow){const Z=t.get(D);Z.shadowIntensity=ve.intensity,Z.shadowBias=ve.bias,Z.shadowNormalBias=ve.normalBias,Z.shadowRadius=ve.radius,Z.shadowMapSize=ve.mapSize,i.spotShadow[C]=Z,i.spotShadowMap[C]=ne,M++}C++}else if(D.isRectAreaLight){const j=n.get(D);j.color.copy(F).multiplyScalar(q),j.halfWidth.set(D.width*.5,0,0),j.halfHeight.set(0,D.height*.5,0),i.rectArea[d]=j,d++}else if(D.isPointLight){const j=n.get(D);if(j.color.copy(D.color).multiplyScalar(D.intensity),j.distance=D.distance,j.decay=D.decay,D.castShadow){const ve=D.shadow,Z=t.get(D);Z.shadowIntensity=ve.intensity,Z.shadowBias=ve.bias,Z.shadowNormalBias=ve.normalBias,Z.shadowRadius=ve.radius,Z.shadowMapSize=ve.mapSize,Z.shadowCameraNear=ve.camera.near,Z.shadowCameraFar=ve.camera.far,i.pointShadow[B]=Z,i.pointShadowMap[B]=ne,i.pointShadowMatrix[B]=D.shadow.matrix,R++}i.point[B]=j,B++}else if(D.isHemisphereLight){const j=n.get(D);j.skyColor.copy(D.color).multiplyScalar(q),j.groundColor.copy(D.groundColor).multiplyScalar(q),i.hemi[r]=j,r++}}d>0&&(e.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=Re.LTC_FLOAT_1,i.rectAreaLTC2=Re.LTC_FLOAT_2):(i.rectAreaLTC1=Re.LTC_HALF_1,i.rectAreaLTC2=Re.LTC_HALF_2)),i.ambient[0]=b,i.ambient[1]=T,i.ambient[2]=x;const G=i.hash;(G.directionalLength!==w||G.pointLength!==B||G.spotLength!==C||G.rectAreaLength!==d||G.hemiLength!==r||G.numDirectionalShadows!==L||G.numPointShadows!==R||G.numSpotShadows!==M||G.numSpotMaps!==y||G.numLightProbes!==k)&&(i.directional.length=w,i.spot.length=C,i.rectArea.length=d,i.point.length=B,i.hemi.length=r,i.directionalShadow.length=L,i.directionalShadowMap.length=L,i.pointShadow.length=R,i.pointShadowMap.length=R,i.spotShadow.length=M,i.spotShadowMap.length=M,i.directionalShadowMatrix.length=L,i.pointShadowMatrix.length=R,i.spotLightMatrix.length=M+y-N,i.spotLightMap.length=y,i.numSpotLightShadowsWithMaps=N,i.numLightProbes=k,G.directionalLength=w,G.pointLength=B,G.spotLength=C,G.rectAreaLength=d,G.hemiLength=r,G.numDirectionalShadows=L,G.numPointShadows=R,G.numSpotShadows=M,G.numSpotMaps=y,G.numLightProbes=k,i.version=Qu++)}function g(v,b){let T=0,x=0,w=0,B=0,C=0;const d=b.matrixWorldInverse;for(let r=0,L=v.length;r<L;r++){const R=v[r];if(R.isDirectionalLight){const M=i.directional[T];M.direction.setFromMatrixPosition(R.matrixWorld),o.setFromMatrixPosition(R.target.matrixWorld),M.direction.sub(o),M.direction.transformDirection(d),T++}else if(R.isSpotLight){const M=i.spot[w];M.position.setFromMatrixPosition(R.matrixWorld),M.position.applyMatrix4(d),M.direction.setFromMatrixPosition(R.matrixWorld),o.setFromMatrixPosition(R.target.matrixWorld),M.direction.sub(o),M.direction.transformDirection(d),w++}else if(R.isRectAreaLight){const M=i.rectArea[B];M.position.setFromMatrixPosition(R.matrixWorld),M.position.applyMatrix4(d),c.identity(),a.copy(R.matrixWorld),a.premultiply(d),c.extractRotation(a),M.halfWidth.set(R.width*.5,0,0),M.halfHeight.set(0,R.height*.5,0),M.halfWidth.applyMatrix4(c),M.halfHeight.applyMatrix4(c),B++}else if(R.isPointLight){const M=i.point[x];M.position.setFromMatrixPosition(R.matrixWorld),M.position.applyMatrix4(d),x++}else if(R.isHemisphereLight){const M=i.hemi[C];M.direction.setFromMatrixPosition(R.matrixWorld),M.direction.transformDirection(d),C++}}}return{setup:l,setupView:g,state:i}}function Oa(e){const n=new Ju(e),t=[],i=[];function o(b){v.camera=b,t.length=0,i.length=0}function a(b){t.push(b)}function c(b){i.push(b)}function l(){n.setup(t)}function g(b){n.setupView(t,b)}const v={lightsArray:t,shadowsArray:i,camera:null,lights:n,transmissionRenderTarget:{}};return{init:o,state:v,setupLights:l,setupLightsView:g,pushLight:a,pushShadow:c}}function ep(e){let n=new WeakMap;function t(o,a=0){const c=n.get(o);let l;return c===void 0?(l=new Oa(e),n.set(o,[l])):a>=c.length?(l=new Oa(e),c.push(l)):l=c[a],l}function i(){n=new WeakMap}return{get:t,dispose:i}}const tp=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,np=`uniform sampler2D shadow_pass;
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
}`;function ip(e,n,t){let i=new Za;const o=new Jt,a=new Jt,c=new on,l=new Gs({depthPacking:Hs}),g=new Vs,v={},b=t.maxTextureSize,T={[fi]:cn,[cn]:fi,[It]:It},x=new Bn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Jt},radius:{value:4}},vertexShader:tp,fragmentShader:np}),w=x.clone();w.defines.HORIZONTAL_PASS=1;const B=new Kn;B.setAttribute("position",new An(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const C=new P(B,x),d=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=ja;let r=this.type;this.render=function(N,k,G){if(d.enabled===!1||d.autoUpdate===!1&&d.needsUpdate===!1||N.length===0)return;const h=e.getRenderTarget(),p=e.getActiveCubeFace(),D=e.getActiveMipmapLevel(),F=e.state;F.setBlending(Nn),F.buffers.depth.getReversed()===!0?F.buffers.color.setClear(0,0,0,0):F.buffers.color.setClear(1,1,1,1),F.buffers.depth.setTest(!0),F.setScissorTest(!1);const q=r!==vn&&this.type===vn,Q=r===vn&&this.type!==vn;for(let ne=0,j=N.length;ne<j;ne++){const ve=N[ne],Z=ve.shadow;if(Z===void 0){console.warn("THREE.WebGLShadowMap:",ve,"has no shadow.");continue}if(Z.autoUpdate===!1&&Z.needsUpdate===!1)continue;o.copy(Z.mapSize);const Le=Z.getFrameExtents();if(o.multiply(Le),a.copy(Z.mapSize),(o.x>b||o.y>b)&&(o.x>b&&(a.x=Math.floor(b/Le.x),o.x=a.x*Le.x,Z.mapSize.x=a.x),o.y>b&&(a.y=Math.floor(b/Le.y),o.y=a.y*Le.y,Z.mapSize.y=a.y)),Z.map===null||q===!0||Q===!0){const Ze=this.type!==vn?{minFilter:si,magFilter:si}:{};Z.map!==null&&Z.map.dispose(),Z.map=new qn(o.x,o.y,Ze),Z.map.texture.name=ve.name+".shadowMap",Z.camera.updateProjectionMatrix()}e.setRenderTarget(Z.map),e.clear();const Ye=Z.getViewportCount();for(let Ze=0;Ze<Ye;Ze++){const ct=Z.getViewport(Ze);c.set(a.x*ct.x,a.y*ct.y,a.x*ct.z,a.y*ct.w),F.viewport(c),Z.updateMatrices(ve,Ze),i=Z.getFrustum(),M(k,G,Z.camera,ve,this.type)}Z.isPointLightShadow!==!0&&this.type===vn&&L(Z,G),Z.needsUpdate=!1}r=this.type,d.needsUpdate=!1,e.setRenderTarget(h,p,D)};function L(N,k){const G=n.update(C);x.defines.VSM_SAMPLES!==N.blurSamples&&(x.defines.VSM_SAMPLES=N.blurSamples,w.defines.VSM_SAMPLES=N.blurSamples,x.needsUpdate=!0,w.needsUpdate=!0),N.mapPass===null&&(N.mapPass=new qn(o.x,o.y)),x.uniforms.shadow_pass.value=N.map.texture,x.uniforms.resolution.value=N.mapSize,x.uniforms.radius.value=N.radius,e.setRenderTarget(N.mapPass),e.clear(),e.renderBufferDirect(k,null,G,x,C,null),w.uniforms.shadow_pass.value=N.mapPass.texture,w.uniforms.resolution.value=N.mapSize,w.uniforms.radius.value=N.radius,e.setRenderTarget(N.map),e.clear(),e.renderBufferDirect(k,null,G,w,C,null)}function R(N,k,G,h){let p=null;const D=G.isPointLight===!0?N.customDistanceMaterial:N.customDepthMaterial;if(D!==void 0)p=D;else if(p=G.isPointLight===!0?g:l,e.localClippingEnabled&&k.clipShadows===!0&&Array.isArray(k.clippingPlanes)&&k.clippingPlanes.length!==0||k.displacementMap&&k.displacementScale!==0||k.alphaMap&&k.alphaTest>0||k.map&&k.alphaTest>0||k.alphaToCoverage===!0){const F=p.uuid,q=k.uuid;let Q=v[F];Q===void 0&&(Q={},v[F]=Q);let ne=Q[q];ne===void 0&&(ne=p.clone(),Q[q]=ne,k.addEventListener("dispose",y)),p=ne}if(p.visible=k.visible,p.wireframe=k.wireframe,h===vn?p.side=k.shadowSide!==null?k.shadowSide:k.side:p.side=k.shadowSide!==null?k.shadowSide:T[k.side],p.alphaMap=k.alphaMap,p.alphaTest=k.alphaToCoverage===!0?.5:k.alphaTest,p.map=k.map,p.clipShadows=k.clipShadows,p.clippingPlanes=k.clippingPlanes,p.clipIntersection=k.clipIntersection,p.displacementMap=k.displacementMap,p.displacementScale=k.displacementScale,p.displacementBias=k.displacementBias,p.wireframeLinewidth=k.wireframeLinewidth,p.linewidth=k.linewidth,G.isPointLight===!0&&p.isMeshDistanceMaterial===!0){const F=e.properties.get(p);F.light=G}return p}function M(N,k,G,h,p){if(N.visible===!1)return;if(N.layers.test(k.layers)&&(N.isMesh||N.isLine||N.isPoints)&&(N.castShadow||N.receiveShadow&&p===vn)&&(!N.frustumCulled||i.intersectsObject(N))){N.modelViewMatrix.multiplyMatrices(G.matrixWorldInverse,N.matrixWorld);const q=n.update(N),Q=N.material;if(Array.isArray(Q)){const ne=q.groups;for(let j=0,ve=ne.length;j<ve;j++){const Z=ne[j],Le=Q[Z.materialIndex];if(Le&&Le.visible){const Ye=R(N,Le,h,p);N.onBeforeShadow(e,N,k,G,q,Ye,Z),e.renderBufferDirect(G,null,q,Ye,N,Z),N.onAfterShadow(e,N,k,G,q,Ye,Z)}}}else if(Q.visible){const ne=R(N,Q,h,p);N.onBeforeShadow(e,N,k,G,q,ne,null),e.renderBufferDirect(G,null,q,ne,N,null),N.onAfterShadow(e,N,k,G,q,ne,null)}}const F=N.children;for(let q=0,Q=F.length;q<Q;q++)M(F[q],k,G,h,p)}function y(N){N.target.removeEventListener("dispose",y);for(const G in v){const h=v[G],p=N.target.uuid;p in h&&(h[p].dispose(),delete h[p])}}}const op={[po]:uo,[fo]:so,[lo]:ro,[yi]:co,[uo]:po,[so]:fo,[ro]:lo,[co]:yi};function ap(e,n){function t(){let A=!1;const _e=new on;let Me=null;const Ae=new on(0,0,0,0);return{setMask:function(me){Me!==me&&!A&&(e.colorMask(me,me,me,me),Me=me)},setLocked:function(me){A=me},setClear:function(me,ae,Ie,je,mt){mt===!0&&(me*=je,ae*=je,Ie*=je),_e.set(me,ae,Ie,je),Ae.equals(_e)===!1&&(e.clearColor(me,ae,Ie,je),Ae.copy(_e))},reset:function(){A=!1,Me=null,Ae.set(-1,0,0,0)}}}function i(){let A=!1,_e=!1,Me=null,Ae=null,me=null;return{setReversed:function(ae){if(_e!==ae){const Ie=n.get("EXT_clip_control");ae?Ie.clipControlEXT(Ie.LOWER_LEFT_EXT,Ie.ZERO_TO_ONE_EXT):Ie.clipControlEXT(Ie.LOWER_LEFT_EXT,Ie.NEGATIVE_ONE_TO_ONE_EXT),_e=ae;const je=me;me=null,this.setClear(je)}},getReversed:function(){return _e},setTest:function(ae){ae?Y(e.DEPTH_TEST):ue(e.DEPTH_TEST)},setMask:function(ae){Me!==ae&&!A&&(e.depthMask(ae),Me=ae)},setFunc:function(ae){if(_e&&(ae=op[ae]),Ae!==ae){switch(ae){case po:e.depthFunc(e.NEVER);break;case uo:e.depthFunc(e.ALWAYS);break;case fo:e.depthFunc(e.LESS);break;case yi:e.depthFunc(e.LEQUAL);break;case lo:e.depthFunc(e.EQUAL);break;case co:e.depthFunc(e.GEQUAL);break;case so:e.depthFunc(e.GREATER);break;case ro:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}Ae=ae}},setLocked:function(ae){A=ae},setClear:function(ae){me!==ae&&(_e&&(ae=1-ae),e.clearDepth(ae),me=ae)},reset:function(){A=!1,Me=null,Ae=null,me=null,_e=!1}}}function o(){let A=!1,_e=null,Me=null,Ae=null,me=null,ae=null,Ie=null,je=null,mt=null;return{setTest:function(st){A||(st?Y(e.STENCIL_TEST):ue(e.STENCIL_TEST))},setMask:function(st){_e!==st&&!A&&(e.stencilMask(st),_e=st)},setFunc:function(st,_t,zt){(Me!==st||Ae!==_t||me!==zt)&&(e.stencilFunc(st,_t,zt),Me=st,Ae=_t,me=zt)},setOp:function(st,_t,zt){(ae!==st||Ie!==_t||je!==zt)&&(e.stencilOp(st,_t,zt),ae=st,Ie=_t,je=zt)},setLocked:function(st){A=st},setClear:function(st){mt!==st&&(e.clearStencil(st),mt=st)},reset:function(){A=!1,_e=null,Me=null,Ae=null,me=null,ae=null,Ie=null,je=null,mt=null}}}const a=new t,c=new i,l=new o,g=new WeakMap,v=new WeakMap;let b={},T={},x=new WeakMap,w=[],B=null,C=!1,d=null,r=null,L=null,R=null,M=null,y=null,N=null,k=new He(0,0,0),G=0,h=!1,p=null,D=null,F=null,q=null,Q=null;const ne=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let j=!1,ve=0;const Z=e.getParameter(e.VERSION);Z.indexOf("WebGL")!==-1?(ve=parseFloat(/^WebGL (\d)/.exec(Z)[1]),j=ve>=1):Z.indexOf("OpenGL ES")!==-1&&(ve=parseFloat(/^OpenGL ES (\d)/.exec(Z)[1]),j=ve>=2);let Le=null,Ye={};const Ze=e.getParameter(e.SCISSOR_BOX),ct=e.getParameter(e.VIEWPORT),vt=new on().fromArray(Ze),Qe=new on().fromArray(ct);function lt(A,_e,Me,Ae){const me=new Uint8Array(4),ae=e.createTexture();e.bindTexture(A,ae),e.texParameteri(A,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(A,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let Ie=0;Ie<Me;Ie++)A===e.TEXTURE_3D||A===e.TEXTURE_2D_ARRAY?e.texImage3D(_e,0,e.RGBA,1,1,Ae,0,e.RGBA,e.UNSIGNED_BYTE,me):e.texImage2D(_e+Ie,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,me);return ae}const $={};$[e.TEXTURE_2D]=lt(e.TEXTURE_2D,e.TEXTURE_2D,1),$[e.TEXTURE_CUBE_MAP]=lt(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),$[e.TEXTURE_2D_ARRAY]=lt(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),$[e.TEXTURE_3D]=lt(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),c.setClear(1),l.setClear(0),Y(e.DEPTH_TEST),c.setFunc(yi),De(!1),be(ia),Y(e.CULL_FACE),ke(Nn);function Y(A){b[A]!==!0&&(e.enable(A),b[A]=!0)}function ue(A){b[A]!==!1&&(e.disable(A),b[A]=!1)}function ye(A,_e){return T[A]!==_e?(e.bindFramebuffer(A,_e),T[A]=_e,A===e.DRAW_FRAMEBUFFER&&(T[e.FRAMEBUFFER]=_e),A===e.FRAMEBUFFER&&(T[e.DRAW_FRAMEBUFFER]=_e),!0):!1}function Te(A,_e){let Me=w,Ae=!1;if(A){Me=x.get(_e),Me===void 0&&(Me=[],x.set(_e,Me));const me=A.textures;if(Me.length!==me.length||Me[0]!==e.COLOR_ATTACHMENT0){for(let ae=0,Ie=me.length;ae<Ie;ae++)Me[ae]=e.COLOR_ATTACHMENT0+ae;Me.length=me.length,Ae=!0}}else Me[0]!==e.BACK&&(Me[0]=e.BACK,Ae=!0);Ae&&e.drawBuffers(Me)}function Ve(A){return B!==A?(e.useProgram(A),B=A,!0):!1}const Tt={[ti]:e.FUNC_ADD,[us]:e.FUNC_SUBTRACT,[ds]:e.FUNC_REVERSE_SUBTRACT};Tt[Ec]=e.MIN,Tt[xc]=e.MAX;const S={[Rs]:e.ZERO,[As]:e.ONE,[bs]:e.SRC_COLOR,[ws]:e.SRC_ALPHA,[Ts]:e.SRC_ALPHA_SATURATE,[xs]:e.DST_COLOR,[Es]:e.DST_ALPHA,[Ms]:e.ONE_MINUS_SRC_COLOR,[Ss]:e.ONE_MINUS_SRC_ALPHA,[vs]:e.ONE_MINUS_DST_COLOR,[gs]:e.ONE_MINUS_DST_ALPHA,[_s]:e.CONSTANT_COLOR,[ms]:e.ONE_MINUS_CONSTANT_COLOR,[hs]:e.CONSTANT_ALPHA,[ps]:e.ONE_MINUS_CONSTANT_ALPHA};function ke(A,_e,Me,Ae,me,ae,Ie,je,mt,st){if(A===Nn){C===!0&&(ue(e.BLEND),C=!1);return}if(C===!1&&(Y(e.BLEND),C=!0),A!==js){if(A!==d||st!==h){if((r!==ti||M!==ti)&&(e.blendEquation(e.FUNC_ADD),r=ti,M=ti),st)switch(A){case bi:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case ra:e.blendFunc(e.ONE,e.ONE);break;case aa:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case oa:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",A);break}else switch(A){case bi:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case ra:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case aa:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case oa:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",A);break}L=null,R=null,y=null,N=null,k.set(0,0,0),G=0,d=A,h=st}return}me=me||_e,ae=ae||Me,Ie=Ie||Ae,(_e!==r||me!==M)&&(e.blendEquationSeparate(Tt[_e],Tt[me]),r=_e,M=me),(Me!==L||Ae!==R||ae!==y||Ie!==N)&&(e.blendFuncSeparate(S[Me],S[Ae],S[ae],S[Ie]),L=Me,R=Ae,y=ae,N=Ie),(je.equals(k)===!1||mt!==G)&&(e.blendColor(je.r,je.g,je.b,mt),k.copy(je),G=mt),d=A,h=!1}function qe(A,_e){A.side===It?ue(e.CULL_FACE):Y(e.CULL_FACE);let Me=A.side===cn;_e&&(Me=!Me),De(Me),A.blending===bi&&A.transparent===!1?ke(Nn):ke(A.blending,A.blendEquation,A.blendSrc,A.blendDst,A.blendEquationAlpha,A.blendSrcAlpha,A.blendDstAlpha,A.blendColor,A.blendAlpha,A.premultipliedAlpha),c.setFunc(A.depthFunc),c.setTest(A.depthTest),c.setMask(A.depthWrite),a.setMask(A.colorWrite);const Ae=A.stencilWrite;l.setTest(Ae),Ae&&(l.setMask(A.stencilWriteMask),l.setFunc(A.stencilFunc,A.stencilRef,A.stencilFuncMask),l.setOp(A.stencilFail,A.stencilZFail,A.stencilZPass)),Ne(A.polygonOffset,A.polygonOffsetFactor,A.polygonOffsetUnits),A.alphaToCoverage===!0?Y(e.SAMPLE_ALPHA_TO_COVERAGE):ue(e.SAMPLE_ALPHA_TO_COVERAGE)}function De(A){p!==A&&(A?e.frontFace(e.CW):e.frontFace(e.CCW),p=A)}function be(A){A!==$s?(Y(e.CULL_FACE),A!==D&&(A===ia?e.cullFace(e.BACK):A===Qs?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))):ue(e.CULL_FACE),D=A}function St(A){A!==F&&(j&&e.lineWidth(A),F=A)}function Ne(A,_e,Me){A?(Y(e.POLYGON_OFFSET_FILL),(q!==_e||Q!==Me)&&(e.polygonOffset(_e,Me),q=_e,Q=Me)):ue(e.POLYGON_OFFSET_FILL)}function nt(A){A?Y(e.SCISSOR_TEST):ue(e.SCISSOR_TEST)}function yt(A){A===void 0&&(A=e.TEXTURE0+ne-1),Le!==A&&(e.activeTexture(A),Le=A)}function wt(A,_e,Me){Me===void 0&&(Le===null?Me=e.TEXTURE0+ne-1:Me=Le);let Ae=Ye[Me];Ae===void 0&&(Ae={type:void 0,texture:void 0},Ye[Me]=Ae),(Ae.type!==A||Ae.texture!==_e)&&(Le!==Me&&(e.activeTexture(Me),Le=Me),e.bindTexture(A,_e||$[A]),Ae.type=A,Ae.texture=_e)}function _(){const A=Ye[Le];A!==void 0&&A.type!==void 0&&(e.bindTexture(A.type,null),A.type=void 0,A.texture=void 0)}function s(){try{e.compressedTexImage2D(...arguments)}catch(A){console.error("THREE.WebGLState:",A)}}function V(){try{e.compressedTexImage3D(...arguments)}catch(A){console.error("THREE.WebGLState:",A)}}function J(){try{e.texSubImage2D(...arguments)}catch(A){console.error("THREE.WebGLState:",A)}}function de(){try{e.texSubImage3D(...arguments)}catch(A){console.error("THREE.WebGLState:",A)}}function K(){try{e.compressedTexSubImage2D(...arguments)}catch(A){console.error("THREE.WebGLState:",A)}}function Oe(){try{e.compressedTexSubImage3D(...arguments)}catch(A){console.error("THREE.WebGLState:",A)}}function Ee(){try{e.texStorage2D(...arguments)}catch(A){console.error("THREE.WebGLState:",A)}}function Ue(){try{e.texStorage3D(...arguments)}catch(A){console.error("THREE.WebGLState:",A)}}function ze(){try{e.texImage2D(...arguments)}catch(A){console.error("THREE.WebGLState:",A)}}function oe(){try{e.texImage3D(...arguments)}catch(A){console.error("THREE.WebGLState:",A)}}function Se(A){vt.equals(A)===!1&&(e.scissor(A.x,A.y,A.z,A.w),vt.copy(A))}function Xe(A){Qe.equals(A)===!1&&(e.viewport(A.x,A.y,A.z,A.w),Qe.copy(A))}function Fe(A,_e){let Me=v.get(_e);Me===void 0&&(Me=new WeakMap,v.set(_e,Me));let Ae=Me.get(A);Ae===void 0&&(Ae=e.getUniformBlockIndex(_e,A.name),Me.set(A,Ae))}function xe(A,_e){const Ae=v.get(_e).get(A);g.get(_e)!==Ae&&(e.uniformBlockBinding(_e,Ae,A.__bindingPointIndex),g.set(_e,Ae))}function et(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),c.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),b={},Le=null,Ye={},T={},x=new WeakMap,w=[],B=null,C=!1,d=null,r=null,L=null,R=null,M=null,y=null,N=null,k=new He(0,0,0),G=0,h=!1,p=null,D=null,F=null,q=null,Q=null,vt.set(0,0,e.canvas.width,e.canvas.height),Qe.set(0,0,e.canvas.width,e.canvas.height),a.reset(),c.reset(),l.reset()}return{buffers:{color:a,depth:c,stencil:l},enable:Y,disable:ue,bindFramebuffer:ye,drawBuffers:Te,useProgram:Ve,setBlending:ke,setMaterial:qe,setFlipSided:De,setCullFace:be,setLineWidth:St,setPolygonOffset:Ne,setScissorTest:nt,activeTexture:yt,bindTexture:wt,unbindTexture:_,compressedTexImage2D:s,compressedTexImage3D:V,texImage2D:ze,texImage3D:oe,updateUBOMapping:Fe,uniformBlockBinding:xe,texStorage2D:Ee,texStorage3D:Ue,texSubImage2D:J,texSubImage3D:de,compressedTexSubImage2D:K,compressedTexSubImage3D:Oe,scissor:Se,viewport:Xe,reset:et}}function rp(e,n,t,i,o,a,c){const l=n.has("WEBGL_multisampled_render_to_texture")?n.get("WEBGL_multisampled_render_to_texture"):null,g=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),v=new Jt,b=new WeakMap;let T;const x=new WeakMap;let w=!1;try{w=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function B(_,s){return w?new OffscreenCanvas(_,s):gc("canvas")}function C(_,s,V){let J=1;const de=wt(_);if((de.width>V||de.height>V)&&(J=V/Math.max(de.width,de.height)),J<1)if(typeof HTMLImageElement<"u"&&_ instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&_ instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&_ instanceof ImageBitmap||typeof VideoFrame<"u"&&_ instanceof VideoFrame){const K=Math.floor(J*de.width),Oe=Math.floor(J*de.height);T===void 0&&(T=B(K,Oe));const Ee=s?B(K,Oe):T;return Ee.width=K,Ee.height=Oe,Ee.getContext("2d").drawImage(_,0,0,K,Oe),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+de.width+"x"+de.height+") to ("+K+"x"+Oe+")."),Ee}else return"data"in _&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+de.width+"x"+de.height+")."),_;return _}function d(_){return _.generateMipmaps}function r(_){e.generateMipmap(_)}function L(_){return _.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:_.isWebGL3DRenderTarget?e.TEXTURE_3D:_.isWebGLArrayRenderTarget||_.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function R(_,s,V,J,de=!1){if(_!==null){if(e[_]!==void 0)return e[_];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+_+"'")}let K=s;if(s===e.RED&&(V===e.FLOAT&&(K=e.R32F),V===e.HALF_FLOAT&&(K=e.R16F),V===e.UNSIGNED_BYTE&&(K=e.R8)),s===e.RED_INTEGER&&(V===e.UNSIGNED_BYTE&&(K=e.R8UI),V===e.UNSIGNED_SHORT&&(K=e.R16UI),V===e.UNSIGNED_INT&&(K=e.R32UI),V===e.BYTE&&(K=e.R8I),V===e.SHORT&&(K=e.R16I),V===e.INT&&(K=e.R32I)),s===e.RG&&(V===e.FLOAT&&(K=e.RG32F),V===e.HALF_FLOAT&&(K=e.RG16F),V===e.UNSIGNED_BYTE&&(K=e.RG8)),s===e.RG_INTEGER&&(V===e.UNSIGNED_BYTE&&(K=e.RG8UI),V===e.UNSIGNED_SHORT&&(K=e.RG16UI),V===e.UNSIGNED_INT&&(K=e.RG32UI),V===e.BYTE&&(K=e.RG8I),V===e.SHORT&&(K=e.RG16I),V===e.INT&&(K=e.RG32I)),s===e.RGB_INTEGER&&(V===e.UNSIGNED_BYTE&&(K=e.RGB8UI),V===e.UNSIGNED_SHORT&&(K=e.RGB16UI),V===e.UNSIGNED_INT&&(K=e.RGB32UI),V===e.BYTE&&(K=e.RGB8I),V===e.SHORT&&(K=e.RGB16I),V===e.INT&&(K=e.RGB32I)),s===e.RGBA_INTEGER&&(V===e.UNSIGNED_BYTE&&(K=e.RGBA8UI),V===e.UNSIGNED_SHORT&&(K=e.RGBA16UI),V===e.UNSIGNED_INT&&(K=e.RGBA32UI),V===e.BYTE&&(K=e.RGBA8I),V===e.SHORT&&(K=e.RGBA16I),V===e.INT&&(K=e.RGBA32I)),s===e.RGB&&(V===e.UNSIGNED_INT_5_9_9_9_REV&&(K=e.RGB9_E5),V===e.UNSIGNED_INT_10F_11F_11F_REV&&(K=e.R11F_G11F_B10F)),s===e.RGBA){const Oe=de?lr:Ht.getTransfer(J);V===e.FLOAT&&(K=e.RGBA32F),V===e.HALF_FLOAT&&(K=e.RGBA16F),V===e.UNSIGNED_BYTE&&(K=Oe===Dt?e.SRGB8_ALPHA8:e.RGBA8),V===e.UNSIGNED_SHORT_4_4_4_4&&(K=e.RGBA4),V===e.UNSIGNED_SHORT_5_5_5_1&&(K=e.RGB5_A1)}return(K===e.R16F||K===e.R32F||K===e.RG16F||K===e.RG32F||K===e.RGBA16F||K===e.RGBA32F)&&n.get("EXT_color_buffer_float"),K}function M(_,s){let V;return _?s===null||s===ui||s===di?V=e.DEPTH24_STENCIL8:s===Un?V=e.DEPTH32F_STENCIL8:s===Pi&&(V=e.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):s===null||s===ui||s===di?V=e.DEPTH_COMPONENT24:s===Un?V=e.DEPTH_COMPONENT32F:s===Pi&&(V=e.DEPTH_COMPONENT16),V}function y(_,s){return d(_)===!0||_.isFramebufferTexture&&_.minFilter!==si&&_.minFilter!==gn?Math.log2(Math.max(s.width,s.height))+1:_.mipmaps!==void 0&&_.mipmaps.length>0?_.mipmaps.length:_.isCompressedTexture&&Array.isArray(_.image)?s.mipmaps.length:1}function N(_){const s=_.target;s.removeEventListener("dispose",N),G(s),s.isVideoTexture&&b.delete(s)}function k(_){const s=_.target;s.removeEventListener("dispose",k),p(s)}function G(_){const s=i.get(_);if(s.__webglInit===void 0)return;const V=_.source,J=x.get(V);if(J){const de=J[s.__cacheKey];de.usedTimes--,de.usedTimes===0&&h(_),Object.keys(J).length===0&&x.delete(V)}i.remove(_)}function h(_){const s=i.get(_);e.deleteTexture(s.__webglTexture);const V=_.source,J=x.get(V);delete J[s.__cacheKey],c.memory.textures--}function p(_){const s=i.get(_);if(_.depthTexture&&(_.depthTexture.dispose(),i.remove(_.depthTexture)),_.isWebGLCubeRenderTarget)for(let J=0;J<6;J++){if(Array.isArray(s.__webglFramebuffer[J]))for(let de=0;de<s.__webglFramebuffer[J].length;de++)e.deleteFramebuffer(s.__webglFramebuffer[J][de]);else e.deleteFramebuffer(s.__webglFramebuffer[J]);s.__webglDepthbuffer&&e.deleteRenderbuffer(s.__webglDepthbuffer[J])}else{if(Array.isArray(s.__webglFramebuffer))for(let J=0;J<s.__webglFramebuffer.length;J++)e.deleteFramebuffer(s.__webglFramebuffer[J]);else e.deleteFramebuffer(s.__webglFramebuffer);if(s.__webglDepthbuffer&&e.deleteRenderbuffer(s.__webglDepthbuffer),s.__webglMultisampledFramebuffer&&e.deleteFramebuffer(s.__webglMultisampledFramebuffer),s.__webglColorRenderbuffer)for(let J=0;J<s.__webglColorRenderbuffer.length;J++)s.__webglColorRenderbuffer[J]&&e.deleteRenderbuffer(s.__webglColorRenderbuffer[J]);s.__webglDepthRenderbuffer&&e.deleteRenderbuffer(s.__webglDepthRenderbuffer)}const V=_.textures;for(let J=0,de=V.length;J<de;J++){const K=i.get(V[J]);K.__webglTexture&&(e.deleteTexture(K.__webglTexture),c.memory.textures--),i.remove(V[J])}i.remove(_)}let D=0;function F(){D=0}function q(){const _=D;return _>=o.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+_+" texture units while this GPU supports only "+o.maxTextures),D+=1,_}function Q(_){const s=[];return s.push(_.wrapS),s.push(_.wrapT),s.push(_.wrapR||0),s.push(_.magFilter),s.push(_.minFilter),s.push(_.anisotropy),s.push(_.internalFormat),s.push(_.format),s.push(_.type),s.push(_.generateMipmaps),s.push(_.premultiplyAlpha),s.push(_.flipY),s.push(_.unpackAlignment),s.push(_.colorSpace),s.join()}function ne(_,s){const V=i.get(_);if(_.isVideoTexture&&nt(_),_.isRenderTargetTexture===!1&&_.isExternalTexture!==!0&&_.version>0&&V.__version!==_.version){const J=_.image;if(J===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(J.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{$(V,_,s);return}}else _.isExternalTexture&&(V.__webglTexture=_.sourceTexture?_.sourceTexture:null);t.bindTexture(e.TEXTURE_2D,V.__webglTexture,e.TEXTURE0+s)}function j(_,s){const V=i.get(_);if(_.isRenderTargetTexture===!1&&_.version>0&&V.__version!==_.version){$(V,_,s);return}t.bindTexture(e.TEXTURE_2D_ARRAY,V.__webglTexture,e.TEXTURE0+s)}function ve(_,s){const V=i.get(_);if(_.isRenderTargetTexture===!1&&_.version>0&&V.__version!==_.version){$(V,_,s);return}t.bindTexture(e.TEXTURE_3D,V.__webglTexture,e.TEXTURE0+s)}function Z(_,s){const V=i.get(_);if(_.version>0&&V.__version!==_.version){Y(V,_,s);return}t.bindTexture(e.TEXTURE_CUBE_MAP,V.__webglTexture,e.TEXTURE0+s)}const Le={[Fn]:e.REPEAT,[ys]:e.CLAMP_TO_EDGE,[Cs]:e.MIRRORED_REPEAT},Ye={[si]:e.NEAREST,[Ps]:e.NEAREST_MIPMAP_NEAREST,[mi]:e.NEAREST_MIPMAP_LINEAR,[gn]:e.LINEAR,[Hi]:e.LINEAR_MIPMAP_NEAREST,[Ln]:e.LINEAR_MIPMAP_LINEAR},Ze={[Fs]:e.NEVER,[Os]:e.ALWAYS,[Ns]:e.LESS,[Qa]:e.LEQUAL,[Us]:e.EQUAL,[Ls]:e.GEQUAL,[Is]:e.GREATER,[Ds]:e.NOTEQUAL};function ct(_,s){if(s.type===Un&&n.has("OES_texture_float_linear")===!1&&(s.magFilter===gn||s.magFilter===Hi||s.magFilter===mi||s.magFilter===Ln||s.minFilter===gn||s.minFilter===Hi||s.minFilter===mi||s.minFilter===Ln)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),e.texParameteri(_,e.TEXTURE_WRAP_S,Le[s.wrapS]),e.texParameteri(_,e.TEXTURE_WRAP_T,Le[s.wrapT]),(_===e.TEXTURE_3D||_===e.TEXTURE_2D_ARRAY)&&e.texParameteri(_,e.TEXTURE_WRAP_R,Le[s.wrapR]),e.texParameteri(_,e.TEXTURE_MAG_FILTER,Ye[s.magFilter]),e.texParameteri(_,e.TEXTURE_MIN_FILTER,Ye[s.minFilter]),s.compareFunction&&(e.texParameteri(_,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(_,e.TEXTURE_COMPARE_FUNC,Ze[s.compareFunction])),n.has("EXT_texture_filter_anisotropic")===!0){if(s.magFilter===si||s.minFilter!==mi&&s.minFilter!==Ln||s.type===Un&&n.has("OES_texture_float_linear")===!1)return;if(s.anisotropy>1||i.get(s).__currentAnisotropy){const V=n.get("EXT_texture_filter_anisotropic");e.texParameterf(_,V.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(s.anisotropy,o.getMaxAnisotropy())),i.get(s).__currentAnisotropy=s.anisotropy}}}function vt(_,s){let V=!1;_.__webglInit===void 0&&(_.__webglInit=!0,s.addEventListener("dispose",N));const J=s.source;let de=x.get(J);de===void 0&&(de={},x.set(J,de));const K=Q(s);if(K!==_.__cacheKey){de[K]===void 0&&(de[K]={texture:e.createTexture(),usedTimes:0},c.memory.textures++,V=!0),de[K].usedTimes++;const Oe=de[_.__cacheKey];Oe!==void 0&&(de[_.__cacheKey].usedTimes--,Oe.usedTimes===0&&h(s)),_.__cacheKey=K,_.__webglTexture=de[K].texture}return V}function Qe(_,s,V){return Math.floor(Math.floor(_/V)/s)}function lt(_,s,V,J){const K=_.updateRanges;if(K.length===0)t.texSubImage2D(e.TEXTURE_2D,0,0,0,s.width,s.height,V,J,s.data);else{K.sort((oe,Se)=>oe.start-Se.start);let Oe=0;for(let oe=1;oe<K.length;oe++){const Se=K[Oe],Xe=K[oe],Fe=Se.start+Se.count,xe=Qe(Xe.start,s.width,4),et=Qe(Se.start,s.width,4);Xe.start<=Fe+1&&xe===et&&Qe(Xe.start+Xe.count-1,s.width,4)===xe?Se.count=Math.max(Se.count,Xe.start+Xe.count-Se.start):(++Oe,K[Oe]=Xe)}K.length=Oe+1;const Ee=e.getParameter(e.UNPACK_ROW_LENGTH),Ue=e.getParameter(e.UNPACK_SKIP_PIXELS),ze=e.getParameter(e.UNPACK_SKIP_ROWS);e.pixelStorei(e.UNPACK_ROW_LENGTH,s.width);for(let oe=0,Se=K.length;oe<Se;oe++){const Xe=K[oe],Fe=Math.floor(Xe.start/4),xe=Math.ceil(Xe.count/4),et=Fe%s.width,A=Math.floor(Fe/s.width),_e=xe,Me=1;e.pixelStorei(e.UNPACK_SKIP_PIXELS,et),e.pixelStorei(e.UNPACK_SKIP_ROWS,A),t.texSubImage2D(e.TEXTURE_2D,0,et,A,_e,Me,V,J,s.data)}_.clearUpdateRanges(),e.pixelStorei(e.UNPACK_ROW_LENGTH,Ee),e.pixelStorei(e.UNPACK_SKIP_PIXELS,Ue),e.pixelStorei(e.UNPACK_SKIP_ROWS,ze)}}function $(_,s,V){let J=e.TEXTURE_2D;(s.isDataArrayTexture||s.isCompressedArrayTexture)&&(J=e.TEXTURE_2D_ARRAY),s.isData3DTexture&&(J=e.TEXTURE_3D);const de=vt(_,s),K=s.source;t.bindTexture(J,_.__webglTexture,e.TEXTURE0+V);const Oe=i.get(K);if(K.version!==Oe.__version||de===!0){t.activeTexture(e.TEXTURE0+V);const Ee=Ht.getPrimaries(Ht.workingColorSpace),Ue=s.colorSpace===Vn?null:Ht.getPrimaries(s.colorSpace),ze=s.colorSpace===Vn||Ee===Ue?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,s.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,s.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,s.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,ze);let oe=C(s.image,!1,o.maxTextureSize);oe=yt(s,oe);const Se=a.convert(s.format,s.colorSpace),Xe=a.convert(s.type);let Fe=R(s.internalFormat,Se,Xe,s.colorSpace,s.isVideoTexture);ct(J,s);let xe;const et=s.mipmaps,A=s.isVideoTexture!==!0,_e=Oe.__version===void 0||de===!0,Me=K.dataReady,Ae=y(s,oe);if(s.isDepthTexture)Fe=M(s.format===Ci,s.type),_e&&(A?t.texStorage2D(e.TEXTURE_2D,1,Fe,oe.width,oe.height):t.texImage2D(e.TEXTURE_2D,0,Fe,oe.width,oe.height,0,Se,Xe,null));else if(s.isDataTexture)if(et.length>0){A&&_e&&t.texStorage2D(e.TEXTURE_2D,Ae,Fe,et[0].width,et[0].height);for(let me=0,ae=et.length;me<ae;me++)xe=et[me],A?Me&&t.texSubImage2D(e.TEXTURE_2D,me,0,0,xe.width,xe.height,Se,Xe,xe.data):t.texImage2D(e.TEXTURE_2D,me,Fe,xe.width,xe.height,0,Se,Xe,xe.data);s.generateMipmaps=!1}else A?(_e&&t.texStorage2D(e.TEXTURE_2D,Ae,Fe,oe.width,oe.height),Me&&lt(s,oe,Se,Xe)):t.texImage2D(e.TEXTURE_2D,0,Fe,oe.width,oe.height,0,Se,Xe,oe.data);else if(s.isCompressedTexture)if(s.isCompressedArrayTexture){A&&_e&&t.texStorage3D(e.TEXTURE_2D_ARRAY,Ae,Fe,et[0].width,et[0].height,oe.depth);for(let me=0,ae=et.length;me<ae;me++)if(xe=et[me],s.format!==Mn)if(Se!==null)if(A){if(Me)if(s.layerUpdates.size>0){const Ie=ca(xe.width,xe.height,s.format,s.type);for(const je of s.layerUpdates){const mt=xe.data.subarray(je*Ie/xe.data.BYTES_PER_ELEMENT,(je+1)*Ie/xe.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,me,0,0,je,xe.width,xe.height,1,Se,mt)}s.clearLayerUpdates()}else t.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,me,0,0,0,xe.width,xe.height,oe.depth,Se,xe.data)}else t.compressedTexImage3D(e.TEXTURE_2D_ARRAY,me,Fe,xe.width,xe.height,oe.depth,0,xe.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else A?Me&&t.texSubImage3D(e.TEXTURE_2D_ARRAY,me,0,0,0,xe.width,xe.height,oe.depth,Se,Xe,xe.data):t.texImage3D(e.TEXTURE_2D_ARRAY,me,Fe,xe.width,xe.height,oe.depth,0,Se,Xe,xe.data)}else{A&&_e&&t.texStorage2D(e.TEXTURE_2D,Ae,Fe,et[0].width,et[0].height);for(let me=0,ae=et.length;me<ae;me++)xe=et[me],s.format!==Mn?Se!==null?A?Me&&t.compressedTexSubImage2D(e.TEXTURE_2D,me,0,0,xe.width,xe.height,Se,xe.data):t.compressedTexImage2D(e.TEXTURE_2D,me,Fe,xe.width,xe.height,0,xe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):A?Me&&t.texSubImage2D(e.TEXTURE_2D,me,0,0,xe.width,xe.height,Se,Xe,xe.data):t.texImage2D(e.TEXTURE_2D,me,Fe,xe.width,xe.height,0,Se,Xe,xe.data)}else if(s.isDataArrayTexture)if(A){if(_e&&t.texStorage3D(e.TEXTURE_2D_ARRAY,Ae,Fe,oe.width,oe.height,oe.depth),Me)if(s.layerUpdates.size>0){const me=ca(oe.width,oe.height,s.format,s.type);for(const ae of s.layerUpdates){const Ie=oe.data.subarray(ae*me/oe.data.BYTES_PER_ELEMENT,(ae+1)*me/oe.data.BYTES_PER_ELEMENT);t.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,ae,oe.width,oe.height,1,Se,Xe,Ie)}s.clearLayerUpdates()}else t.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,oe.width,oe.height,oe.depth,Se,Xe,oe.data)}else t.texImage3D(e.TEXTURE_2D_ARRAY,0,Fe,oe.width,oe.height,oe.depth,0,Se,Xe,oe.data);else if(s.isData3DTexture)A?(_e&&t.texStorage3D(e.TEXTURE_3D,Ae,Fe,oe.width,oe.height,oe.depth),Me&&t.texSubImage3D(e.TEXTURE_3D,0,0,0,0,oe.width,oe.height,oe.depth,Se,Xe,oe.data)):t.texImage3D(e.TEXTURE_3D,0,Fe,oe.width,oe.height,oe.depth,0,Se,Xe,oe.data);else if(s.isFramebufferTexture){if(_e)if(A)t.texStorage2D(e.TEXTURE_2D,Ae,Fe,oe.width,oe.height);else{let me=oe.width,ae=oe.height;for(let Ie=0;Ie<Ae;Ie++)t.texImage2D(e.TEXTURE_2D,Ie,Fe,me,ae,0,Se,Xe,null),me>>=1,ae>>=1}}else if(et.length>0){if(A&&_e){const me=wt(et[0]);t.texStorage2D(e.TEXTURE_2D,Ae,Fe,me.width,me.height)}for(let me=0,ae=et.length;me<ae;me++)xe=et[me],A?Me&&t.texSubImage2D(e.TEXTURE_2D,me,0,0,Se,Xe,xe):t.texImage2D(e.TEXTURE_2D,me,Fe,Se,Xe,xe);s.generateMipmaps=!1}else if(A){if(_e){const me=wt(oe);t.texStorage2D(e.TEXTURE_2D,Ae,Fe,me.width,me.height)}Me&&t.texSubImage2D(e.TEXTURE_2D,0,0,0,Se,Xe,oe)}else t.texImage2D(e.TEXTURE_2D,0,Fe,Se,Xe,oe);d(s)&&r(J),Oe.__version=K.version,s.onUpdate&&s.onUpdate(s)}_.__version=s.version}function Y(_,s,V){if(s.image.length!==6)return;const J=vt(_,s),de=s.source;t.bindTexture(e.TEXTURE_CUBE_MAP,_.__webglTexture,e.TEXTURE0+V);const K=i.get(de);if(de.version!==K.__version||J===!0){t.activeTexture(e.TEXTURE0+V);const Oe=Ht.getPrimaries(Ht.workingColorSpace),Ee=s.colorSpace===Vn?null:Ht.getPrimaries(s.colorSpace),Ue=s.colorSpace===Vn||Oe===Ee?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,s.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,s.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,s.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ue);const ze=s.isCompressedTexture||s.image[0].isCompressedTexture,oe=s.image[0]&&s.image[0].isDataTexture,Se=[];for(let ae=0;ae<6;ae++)!ze&&!oe?Se[ae]=C(s.image[ae],!0,o.maxCubemapSize):Se[ae]=oe?s.image[ae].image:s.image[ae],Se[ae]=yt(s,Se[ae]);const Xe=Se[0],Fe=a.convert(s.format,s.colorSpace),xe=a.convert(s.type),et=R(s.internalFormat,Fe,xe,s.colorSpace),A=s.isVideoTexture!==!0,_e=K.__version===void 0||J===!0,Me=de.dataReady;let Ae=y(s,Xe);ct(e.TEXTURE_CUBE_MAP,s);let me;if(ze){A&&_e&&t.texStorage2D(e.TEXTURE_CUBE_MAP,Ae,et,Xe.width,Xe.height);for(let ae=0;ae<6;ae++){me=Se[ae].mipmaps;for(let Ie=0;Ie<me.length;Ie++){const je=me[Ie];s.format!==Mn?Fe!==null?A?Me&&t.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+ae,Ie,0,0,je.width,je.height,Fe,je.data):t.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+ae,Ie,et,je.width,je.height,0,je.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):A?Me&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+ae,Ie,0,0,je.width,je.height,Fe,xe,je.data):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+ae,Ie,et,je.width,je.height,0,Fe,xe,je.data)}}}else{if(me=s.mipmaps,A&&_e){me.length>0&&Ae++;const ae=wt(Se[0]);t.texStorage2D(e.TEXTURE_CUBE_MAP,Ae,et,ae.width,ae.height)}for(let ae=0;ae<6;ae++)if(oe){A?Me&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+ae,0,0,0,Se[ae].width,Se[ae].height,Fe,xe,Se[ae].data):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+ae,0,et,Se[ae].width,Se[ae].height,0,Fe,xe,Se[ae].data);for(let Ie=0;Ie<me.length;Ie++){const mt=me[Ie].image[ae].image;A?Me&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+ae,Ie+1,0,0,mt.width,mt.height,Fe,xe,mt.data):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+ae,Ie+1,et,mt.width,mt.height,0,Fe,xe,mt.data)}}else{A?Me&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+ae,0,0,0,Fe,xe,Se[ae]):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+ae,0,et,Fe,xe,Se[ae]);for(let Ie=0;Ie<me.length;Ie++){const je=me[Ie];A?Me&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+ae,Ie+1,0,0,Fe,xe,je.image[ae]):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+ae,Ie+1,et,Fe,xe,je.image[ae])}}}d(s)&&r(e.TEXTURE_CUBE_MAP),K.__version=de.version,s.onUpdate&&s.onUpdate(s)}_.__version=s.version}function ue(_,s,V,J,de,K){const Oe=a.convert(V.format,V.colorSpace),Ee=a.convert(V.type),Ue=R(V.internalFormat,Oe,Ee,V.colorSpace),ze=i.get(s),oe=i.get(V);if(oe.__renderTarget=s,!ze.__hasExternalTextures){const Se=Math.max(1,s.width>>K),Xe=Math.max(1,s.height>>K);de===e.TEXTURE_3D||de===e.TEXTURE_2D_ARRAY?t.texImage3D(de,K,Ue,Se,Xe,s.depth,0,Oe,Ee,null):t.texImage2D(de,K,Ue,Se,Xe,0,Oe,Ee,null)}t.bindFramebuffer(e.FRAMEBUFFER,_),Ne(s)?l.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,J,de,oe.__webglTexture,0,St(s)):(de===e.TEXTURE_2D||de>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&de<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,J,de,oe.__webglTexture,K),t.bindFramebuffer(e.FRAMEBUFFER,null)}function ye(_,s,V){if(e.bindRenderbuffer(e.RENDERBUFFER,_),s.depthBuffer){const J=s.depthTexture,de=J&&J.isDepthTexture?J.type:null,K=M(s.stencilBuffer,de),Oe=s.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,Ee=St(s);Ne(s)?l.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,Ee,K,s.width,s.height):V?e.renderbufferStorageMultisample(e.RENDERBUFFER,Ee,K,s.width,s.height):e.renderbufferStorage(e.RENDERBUFFER,K,s.width,s.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,Oe,e.RENDERBUFFER,_)}else{const J=s.textures;for(let de=0;de<J.length;de++){const K=J[de],Oe=a.convert(K.format,K.colorSpace),Ee=a.convert(K.type),Ue=R(K.internalFormat,Oe,Ee,K.colorSpace),ze=St(s);V&&Ne(s)===!1?e.renderbufferStorageMultisample(e.RENDERBUFFER,ze,Ue,s.width,s.height):Ne(s)?l.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,ze,Ue,s.width,s.height):e.renderbufferStorage(e.RENDERBUFFER,Ue,s.width,s.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function Te(_,s){if(s&&s.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(e.FRAMEBUFFER,_),!(s.depthTexture&&s.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const J=i.get(s.depthTexture);J.__renderTarget=s,(!J.__webglTexture||s.depthTexture.image.width!==s.width||s.depthTexture.image.height!==s.height)&&(s.depthTexture.image.width=s.width,s.depthTexture.image.height=s.height,s.depthTexture.needsUpdate=!0),ne(s.depthTexture,0);const de=J.__webglTexture,K=St(s);if(s.depthTexture.format===vo)Ne(s)?l.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,de,0,K):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,de,0);else if(s.depthTexture.format===Ci)Ne(s)?l.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,de,0,K):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,de,0);else throw new Error("Unknown depthTexture format")}function Ve(_){const s=i.get(_),V=_.isWebGLCubeRenderTarget===!0;if(s.__boundDepthTexture!==_.depthTexture){const J=_.depthTexture;if(s.__depthDisposeCallback&&s.__depthDisposeCallback(),J){const de=()=>{delete s.__boundDepthTexture,delete s.__depthDisposeCallback,J.removeEventListener("dispose",de)};J.addEventListener("dispose",de),s.__depthDisposeCallback=de}s.__boundDepthTexture=J}if(_.depthTexture&&!s.__autoAllocateDepthBuffer){if(V)throw new Error("target.depthTexture not supported in Cube render targets");const J=_.texture.mipmaps;J&&J.length>0?Te(s.__webglFramebuffer[0],_):Te(s.__webglFramebuffer,_)}else if(V){s.__webglDepthbuffer=[];for(let J=0;J<6;J++)if(t.bindFramebuffer(e.FRAMEBUFFER,s.__webglFramebuffer[J]),s.__webglDepthbuffer[J]===void 0)s.__webglDepthbuffer[J]=e.createRenderbuffer(),ye(s.__webglDepthbuffer[J],_,!1);else{const de=_.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,K=s.__webglDepthbuffer[J];e.bindRenderbuffer(e.RENDERBUFFER,K),e.framebufferRenderbuffer(e.FRAMEBUFFER,de,e.RENDERBUFFER,K)}}else{const J=_.texture.mipmaps;if(J&&J.length>0?t.bindFramebuffer(e.FRAMEBUFFER,s.__webglFramebuffer[0]):t.bindFramebuffer(e.FRAMEBUFFER,s.__webglFramebuffer),s.__webglDepthbuffer===void 0)s.__webglDepthbuffer=e.createRenderbuffer(),ye(s.__webglDepthbuffer,_,!1);else{const de=_.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,K=s.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,K),e.framebufferRenderbuffer(e.FRAMEBUFFER,de,e.RENDERBUFFER,K)}}t.bindFramebuffer(e.FRAMEBUFFER,null)}function Tt(_,s,V){const J=i.get(_);s!==void 0&&ue(J.__webglFramebuffer,_,_.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),V!==void 0&&Ve(_)}function S(_){const s=_.texture,V=i.get(_),J=i.get(s);_.addEventListener("dispose",k);const de=_.textures,K=_.isWebGLCubeRenderTarget===!0,Oe=de.length>1;if(Oe||(J.__webglTexture===void 0&&(J.__webglTexture=e.createTexture()),J.__version=s.version,c.memory.textures++),K){V.__webglFramebuffer=[];for(let Ee=0;Ee<6;Ee++)if(s.mipmaps&&s.mipmaps.length>0){V.__webglFramebuffer[Ee]=[];for(let Ue=0;Ue<s.mipmaps.length;Ue++)V.__webglFramebuffer[Ee][Ue]=e.createFramebuffer()}else V.__webglFramebuffer[Ee]=e.createFramebuffer()}else{if(s.mipmaps&&s.mipmaps.length>0){V.__webglFramebuffer=[];for(let Ee=0;Ee<s.mipmaps.length;Ee++)V.__webglFramebuffer[Ee]=e.createFramebuffer()}else V.__webglFramebuffer=e.createFramebuffer();if(Oe)for(let Ee=0,Ue=de.length;Ee<Ue;Ee++){const ze=i.get(de[Ee]);ze.__webglTexture===void 0&&(ze.__webglTexture=e.createTexture(),c.memory.textures++)}if(_.samples>0&&Ne(_)===!1){V.__webglMultisampledFramebuffer=e.createFramebuffer(),V.__webglColorRenderbuffer=[],t.bindFramebuffer(e.FRAMEBUFFER,V.__webglMultisampledFramebuffer);for(let Ee=0;Ee<de.length;Ee++){const Ue=de[Ee];V.__webglColorRenderbuffer[Ee]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,V.__webglColorRenderbuffer[Ee]);const ze=a.convert(Ue.format,Ue.colorSpace),oe=a.convert(Ue.type),Se=R(Ue.internalFormat,ze,oe,Ue.colorSpace,_.isXRRenderTarget===!0),Xe=St(_);e.renderbufferStorageMultisample(e.RENDERBUFFER,Xe,Se,_.width,_.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+Ee,e.RENDERBUFFER,V.__webglColorRenderbuffer[Ee])}e.bindRenderbuffer(e.RENDERBUFFER,null),_.depthBuffer&&(V.__webglDepthRenderbuffer=e.createRenderbuffer(),ye(V.__webglDepthRenderbuffer,_,!0)),t.bindFramebuffer(e.FRAMEBUFFER,null)}}if(K){t.bindTexture(e.TEXTURE_CUBE_MAP,J.__webglTexture),ct(e.TEXTURE_CUBE_MAP,s);for(let Ee=0;Ee<6;Ee++)if(s.mipmaps&&s.mipmaps.length>0)for(let Ue=0;Ue<s.mipmaps.length;Ue++)ue(V.__webglFramebuffer[Ee][Ue],_,s,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,Ue);else ue(V.__webglFramebuffer[Ee],_,s,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+Ee,0);d(s)&&r(e.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Oe){for(let Ee=0,Ue=de.length;Ee<Ue;Ee++){const ze=de[Ee],oe=i.get(ze);let Se=e.TEXTURE_2D;(_.isWebGL3DRenderTarget||_.isWebGLArrayRenderTarget)&&(Se=_.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),t.bindTexture(Se,oe.__webglTexture),ct(Se,ze),ue(V.__webglFramebuffer,_,ze,e.COLOR_ATTACHMENT0+Ee,Se,0),d(ze)&&r(Se)}t.unbindTexture()}else{let Ee=e.TEXTURE_2D;if((_.isWebGL3DRenderTarget||_.isWebGLArrayRenderTarget)&&(Ee=_.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),t.bindTexture(Ee,J.__webglTexture),ct(Ee,s),s.mipmaps&&s.mipmaps.length>0)for(let Ue=0;Ue<s.mipmaps.length;Ue++)ue(V.__webglFramebuffer[Ue],_,s,e.COLOR_ATTACHMENT0,Ee,Ue);else ue(V.__webglFramebuffer,_,s,e.COLOR_ATTACHMENT0,Ee,0);d(s)&&r(Ee),t.unbindTexture()}_.depthBuffer&&Ve(_)}function ke(_){const s=_.textures;for(let V=0,J=s.length;V<J;V++){const de=s[V];if(d(de)){const K=L(_),Oe=i.get(de).__webglTexture;t.bindTexture(K,Oe),r(K),t.unbindTexture()}}}const qe=[],De=[];function be(_){if(_.samples>0){if(Ne(_)===!1){const s=_.textures,V=_.width,J=_.height;let de=e.COLOR_BUFFER_BIT;const K=_.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,Oe=i.get(_),Ee=s.length>1;if(Ee)for(let ze=0;ze<s.length;ze++)t.bindFramebuffer(e.FRAMEBUFFER,Oe.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+ze,e.RENDERBUFFER,null),t.bindFramebuffer(e.FRAMEBUFFER,Oe.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+ze,e.TEXTURE_2D,null,0);t.bindFramebuffer(e.READ_FRAMEBUFFER,Oe.__webglMultisampledFramebuffer);const Ue=_.texture.mipmaps;Ue&&Ue.length>0?t.bindFramebuffer(e.DRAW_FRAMEBUFFER,Oe.__webglFramebuffer[0]):t.bindFramebuffer(e.DRAW_FRAMEBUFFER,Oe.__webglFramebuffer);for(let ze=0;ze<s.length;ze++){if(_.resolveDepthBuffer&&(_.depthBuffer&&(de|=e.DEPTH_BUFFER_BIT),_.stencilBuffer&&_.resolveStencilBuffer&&(de|=e.STENCIL_BUFFER_BIT)),Ee){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,Oe.__webglColorRenderbuffer[ze]);const oe=i.get(s[ze]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,oe,0)}e.blitFramebuffer(0,0,V,J,0,0,V,J,de,e.NEAREST),g===!0&&(qe.length=0,De.length=0,qe.push(e.COLOR_ATTACHMENT0+ze),_.depthBuffer&&_.resolveDepthBuffer===!1&&(qe.push(K),De.push(K),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,De)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,qe))}if(t.bindFramebuffer(e.READ_FRAMEBUFFER,null),t.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),Ee)for(let ze=0;ze<s.length;ze++){t.bindFramebuffer(e.FRAMEBUFFER,Oe.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+ze,e.RENDERBUFFER,Oe.__webglColorRenderbuffer[ze]);const oe=i.get(s[ze]).__webglTexture;t.bindFramebuffer(e.FRAMEBUFFER,Oe.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+ze,e.TEXTURE_2D,oe,0)}t.bindFramebuffer(e.DRAW_FRAMEBUFFER,Oe.__webglMultisampledFramebuffer)}else if(_.depthBuffer&&_.resolveDepthBuffer===!1&&g){const s=_.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[s])}}}function St(_){return Math.min(o.maxSamples,_.samples)}function Ne(_){const s=i.get(_);return _.samples>0&&n.has("WEBGL_multisampled_render_to_texture")===!0&&s.__useRenderToTexture!==!1}function nt(_){const s=c.render.frame;b.get(_)!==s&&(b.set(_,s),_.update())}function yt(_,s){const V=_.colorSpace,J=_.format,de=_.type;return _.isCompressedTexture===!0||_.isVideoTexture===!0||V!==Ui&&V!==Vn&&(Ht.getTransfer(V)===Dt?(J!==Mn||de!==On)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",V)),s}function wt(_){return typeof HTMLImageElement<"u"&&_ instanceof HTMLImageElement?(v.width=_.naturalWidth||_.width,v.height=_.naturalHeight||_.height):typeof VideoFrame<"u"&&_ instanceof VideoFrame?(v.width=_.displayWidth,v.height=_.displayHeight):(v.width=_.width,v.height=_.height),v}this.allocateTextureUnit=q,this.resetTextureUnits=F,this.setTexture2D=ne,this.setTexture2DArray=j,this.setTexture3D=ve,this.setTextureCube=Z,this.rebindTextures=Tt,this.setupRenderTarget=S,this.updateRenderTargetMipmap=ke,this.updateMultisampleRenderTarget=be,this.setupDepthRenderbuffer=Ve,this.setupFrameBufferTexture=ue,this.useMultisampledRTT=Ne}function sp(e,n){function t(i,o=Vn){let a;const c=Ht.getTransfer(o);if(i===On)return e.UNSIGNED_BYTE;if(i===Ja)return e.UNSIGNED_SHORT_4_4_4_4;if(i===er)return e.UNSIGNED_SHORT_5_5_5_1;if(i===ks)return e.UNSIGNED_INT_5_9_9_9_REV;if(i===zs)return e.UNSIGNED_INT_10F_11F_11F_REV;if(i===Ws)return e.BYTE;if(i===Xs)return e.SHORT;if(i===Pi)return e.UNSIGNED_SHORT;if(i===nr)return e.INT;if(i===ui)return e.UNSIGNED_INT;if(i===Un)return e.FLOAT;if(i===Li)return e.HALF_FLOAT;if(i===Ys)return e.ALPHA;if(i===qs)return e.RGB;if(i===Mn)return e.RGBA;if(i===vo)return e.DEPTH_COMPONENT;if(i===Ci)return e.DEPTH_STENCIL;if(i===Ks)return e.RED;if(i===ir)return e.RED_INTEGER;if(i===Zs)return e.RG;if(i===or)return e.RG_INTEGER;if(i===ar)return e.RGBA_INTEGER;if(i===Vi||i===ki||i===zi||i===Wi)if(c===Dt)if(a=n.get("WEBGL_compressed_texture_s3tc_srgb"),a!==null){if(i===Vi)return a.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===ki)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===zi)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Wi)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(a=n.get("WEBGL_compressed_texture_s3tc"),a!==null){if(i===Vi)return a.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===ki)return a.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===zi)return a.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Wi)return a.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===yo||i===Po||i===Do||i===Io)if(a=n.get("WEBGL_compressed_texture_pvrtc"),a!==null){if(i===yo)return a.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Po)return a.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===Do)return a.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Io)return a.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Lo||i===Uo||i===No)if(a=n.get("WEBGL_compressed_texture_etc"),a!==null){if(i===Lo||i===Uo)return c===Dt?a.COMPRESSED_SRGB8_ETC2:a.COMPRESSED_RGB8_ETC2;if(i===No)return c===Dt?a.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:a.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===Oo||i===Fo||i===Bo||i===Go||i===Ho||i===Vo||i===ko||i===zo||i===Wo||i===Xo||i===Yo||i===qo||i===Ko||i===Zo)if(a=n.get("WEBGL_compressed_texture_astc"),a!==null){if(i===Oo)return c===Dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:a.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Fo)return c===Dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:a.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Bo)return c===Dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:a.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Go)return c===Dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:a.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Ho)return c===Dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:a.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Vo)return c===Dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:a.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===ko)return c===Dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:a.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===zo)return c===Dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:a.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===Wo)return c===Dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:a.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===Xo)return c===Dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:a.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Yo)return c===Dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:a.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===qo)return c===Dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:a.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Ko)return c===Dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:a.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Zo)return c===Dt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:a.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===$o||i===Qo||i===jo)if(a=n.get("EXT_texture_compression_bptc"),a!==null){if(i===$o)return c===Dt?a.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:a.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Qo)return a.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===jo)return a.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Jo||i===ea||i===ta||i===na)if(a=n.get("EXT_texture_compression_rgtc"),a!==null){if(i===Jo)return a.COMPRESSED_RED_RGTC1_EXT;if(i===ea)return a.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===ta)return a.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===na)return a.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===di?e.UNSIGNED_INT_24_8:e[i]!==void 0?e[i]:null}return{convert:t}}const cp=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,lp=`
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

}`;class fp{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(n,t){if(this.texture===null){const i=new tr(n.texture);(n.depthNear!==t.depthNear||n.depthFar!==t.depthFar)&&(this.depthNear=n.depthNear,this.depthFar=n.depthFar),this.texture=i}}getMesh(n){if(this.texture!==null&&this.mesh===null){const t=n.cameras[0].viewport,i=new Bn({vertexShader:cp,fragmentShader:lp,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new P(new an(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class dp extends cs{constructor(n,t){super();const i=this;let o=null,a=1,c=null,l="local-floor",g=1,v=null,b=null,T=null,x=null,w=null,B=null;const C=typeof XRWebGLBinding<"u",d=new fp,r={},L=t.getContextAttributes();let R=null,M=null;const y=[],N=[],k=new Jt;let G=null;const h=new ri;h.viewport=new on;const p=new ri;p.viewport=new on;const D=[h,p],F=new ls;let q=null,Q=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function($){let Y=y[$];return Y===void 0&&(Y=new Gi,y[$]=Y),Y.getTargetRaySpace()},this.getControllerGrip=function($){let Y=y[$];return Y===void 0&&(Y=new Gi,y[$]=Y),Y.getGripSpace()},this.getHand=function($){let Y=y[$];return Y===void 0&&(Y=new Gi,y[$]=Y),Y.getHandSpace()};function ne($){const Y=N.indexOf($.inputSource);if(Y===-1)return;const ue=y[Y];ue!==void 0&&(ue.update($.inputSource,$.frame,v||c),ue.dispatchEvent({type:$.type,data:$.inputSource}))}function j(){o.removeEventListener("select",ne),o.removeEventListener("selectstart",ne),o.removeEventListener("selectend",ne),o.removeEventListener("squeeze",ne),o.removeEventListener("squeezestart",ne),o.removeEventListener("squeezeend",ne),o.removeEventListener("end",j),o.removeEventListener("inputsourceschange",ve);for(let $=0;$<y.length;$++){const Y=N[$];Y!==null&&(N[$]=null,y[$].disconnect(Y))}q=null,Q=null,d.reset();for(const $ in r)delete r[$];n.setRenderTarget(R),w=null,x=null,T=null,o=null,M=null,lt.stop(),i.isPresenting=!1,n.setPixelRatio(G),n.setSize(k.width,k.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function($){a=$,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function($){l=$,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return v||c},this.setReferenceSpace=function($){v=$},this.getBaseLayer=function(){return x!==null?x:w},this.getBinding=function(){return T===null&&C&&(T=new XRWebGLBinding(o,t)),T},this.getFrame=function(){return B},this.getSession=function(){return o},this.setSession=async function($){if(o=$,o!==null){if(R=n.getRenderTarget(),o.addEventListener("select",ne),o.addEventListener("selectstart",ne),o.addEventListener("selectend",ne),o.addEventListener("squeeze",ne),o.addEventListener("squeezestart",ne),o.addEventListener("squeezeend",ne),o.addEventListener("end",j),o.addEventListener("inputsourceschange",ve),L.xrCompatible!==!0&&await t.makeXRCompatible(),G=n.getPixelRatio(),n.getSize(k),C&&"createProjectionLayer"in XRWebGLBinding.prototype){let ue=null,ye=null,Te=null;L.depth&&(Te=L.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ue=L.stencil?Ci:vo,ye=L.stencil?di:ui);const Ve={colorFormat:t.RGBA8,depthFormat:Te,scaleFactor:a};T=this.getBinding(),x=T.createProjectionLayer(Ve),o.updateRenderState({layers:[x]}),n.setPixelRatio(1),n.setSize(x.textureWidth,x.textureHeight,!1),M=new qn(x.textureWidth,x.textureHeight,{format:Mn,type:On,depthTexture:new $a(x.textureWidth,x.textureHeight,ye,void 0,void 0,void 0,void 0,void 0,void 0,ue),stencilBuffer:L.stencil,colorSpace:n.outputColorSpace,samples:L.antialias?4:0,resolveDepthBuffer:x.ignoreDepthValues===!1,resolveStencilBuffer:x.ignoreDepthValues===!1})}else{const ue={antialias:L.antialias,alpha:!0,depth:L.depth,stencil:L.stencil,framebufferScaleFactor:a};w=new XRWebGLLayer(o,t,ue),o.updateRenderState({baseLayer:w}),n.setPixelRatio(1),n.setSize(w.framebufferWidth,w.framebufferHeight,!1),M=new qn(w.framebufferWidth,w.framebufferHeight,{format:Mn,type:On,colorSpace:n.outputColorSpace,stencilBuffer:L.stencil,resolveDepthBuffer:w.ignoreDepthValues===!1,resolveStencilBuffer:w.ignoreDepthValues===!1})}M.isXRRenderTarget=!0,this.setFoveation(g),v=null,c=await o.requestReferenceSpace(l),lt.setContext(o),lt.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(o!==null)return o.environmentBlendMode},this.getDepthTexture=function(){return d.getDepthTexture()};function ve($){for(let Y=0;Y<$.removed.length;Y++){const ue=$.removed[Y],ye=N.indexOf(ue);ye>=0&&(N[ye]=null,y[ye].disconnect(ue))}for(let Y=0;Y<$.added.length;Y++){const ue=$.added[Y];let ye=N.indexOf(ue);if(ye===-1){for(let Ve=0;Ve<y.length;Ve++)if(Ve>=N.length){N.push(ue),ye=Ve;break}else if(N[Ve]===null){N[Ve]=ue,ye=Ve;break}if(ye===-1)break}const Te=y[ye];Te&&Te.connect(ue)}}const Z=new at,Le=new at;function Ye($,Y,ue){Z.setFromMatrixPosition(Y.matrixWorld),Le.setFromMatrixPosition(ue.matrixWorld);const ye=Z.distanceTo(Le),Te=Y.projectionMatrix.elements,Ve=ue.projectionMatrix.elements,Tt=Te[14]/(Te[10]-1),S=Te[14]/(Te[10]+1),ke=(Te[9]+1)/Te[5],qe=(Te[9]-1)/Te[5],De=(Te[8]-1)/Te[0],be=(Ve[8]+1)/Ve[0],St=Tt*De,Ne=Tt*be,nt=ye/(-De+be),yt=nt*-De;if(Y.matrixWorld.decompose($.position,$.quaternion,$.scale),$.translateX(yt),$.translateZ(nt),$.matrixWorld.compose($.position,$.quaternion,$.scale),$.matrixWorldInverse.copy($.matrixWorld).invert(),Te[10]===-1)$.projectionMatrix.copy(Y.projectionMatrix),$.projectionMatrixInverse.copy(Y.projectionMatrixInverse);else{const wt=Tt+nt,_=S+nt,s=St-yt,V=Ne+(ye-yt),J=ke*S/_*wt,de=qe*S/_*wt;$.projectionMatrix.makePerspective(s,V,J,de,wt,_),$.projectionMatrixInverse.copy($.projectionMatrix).invert()}}function Ze($,Y){Y===null?$.matrixWorld.copy($.matrix):$.matrixWorld.multiplyMatrices(Y.matrixWorld,$.matrix),$.matrixWorldInverse.copy($.matrixWorld).invert()}this.updateCamera=function($){if(o===null)return;let Y=$.near,ue=$.far;d.texture!==null&&(d.depthNear>0&&(Y=d.depthNear),d.depthFar>0&&(ue=d.depthFar)),F.near=p.near=h.near=Y,F.far=p.far=h.far=ue,(q!==F.near||Q!==F.far)&&(o.updateRenderState({depthNear:F.near,depthFar:F.far}),q=F.near,Q=F.far),F.layers.mask=$.layers.mask|6,h.layers.mask=F.layers.mask&3,p.layers.mask=F.layers.mask&5;const ye=$.parent,Te=F.cameras;Ze(F,ye);for(let Ve=0;Ve<Te.length;Ve++)Ze(Te[Ve],ye);Te.length===2?Ye(F,h,p):F.projectionMatrix.copy(h.projectionMatrix),ct($,F,ye)};function ct($,Y,ue){ue===null?$.matrix.copy(Y.matrixWorld):($.matrix.copy(ue.matrixWorld),$.matrix.invert(),$.matrix.multiply(Y.matrixWorld)),$.matrix.decompose($.position,$.quaternion,$.scale),$.updateMatrixWorld(!0),$.projectionMatrix.copy(Y.projectionMatrix),$.projectionMatrixInverse.copy(Y.projectionMatrixInverse),$.isPerspectiveCamera&&($.fov=fs*2*Math.atan(1/$.projectionMatrix.elements[5]),$.zoom=1)}this.getCamera=function(){return F},this.getFoveation=function(){if(!(x===null&&w===null))return g},this.setFoveation=function($){g=$,x!==null&&(x.fixedFoveation=$),w!==null&&w.fixedFoveation!==void 0&&(w.fixedFoveation=$)},this.hasDepthSensing=function(){return d.texture!==null},this.getDepthSensingMesh=function(){return d.getMesh(F)},this.getCameraTexture=function($){return r[$]};let vt=null;function Qe($,Y){if(b=Y.getViewerPose(v||c),B=Y,b!==null){const ue=b.views;w!==null&&(n.setRenderTargetFramebuffer(M,w.framebuffer),n.setRenderTarget(M));let ye=!1;ue.length!==F.cameras.length&&(F.cameras.length=0,ye=!0);for(let S=0;S<ue.length;S++){const ke=ue[S];let qe=null;if(w!==null)qe=w.getViewport(ke);else{const be=T.getViewSubImage(x,ke);qe=be.viewport,S===0&&(n.setRenderTargetTextures(M,be.colorTexture,be.depthStencilTexture),n.setRenderTarget(M))}let De=D[S];De===void 0&&(De=new ri,De.layers.enable(S),De.viewport=new on,D[S]=De),De.matrix.fromArray(ke.transform.matrix),De.matrix.decompose(De.position,De.quaternion,De.scale),De.projectionMatrix.fromArray(ke.projectionMatrix),De.projectionMatrixInverse.copy(De.projectionMatrix).invert(),De.viewport.set(qe.x,qe.y,qe.width,qe.height),S===0&&(F.matrix.copy(De.matrix),F.matrix.decompose(F.position,F.quaternion,F.scale)),ye===!0&&F.cameras.push(De)}const Te=o.enabledFeatures;if(Te&&Te.includes("depth-sensing")&&o.depthUsage=="gpu-optimized"&&C){T=i.getBinding();const S=T.getDepthInformation(ue[0]);S&&S.isValid&&S.texture&&d.init(S,o.renderState)}if(Te&&Te.includes("camera-access")&&C){n.state.unbindTexture(),T=i.getBinding();for(let S=0;S<ue.length;S++){const ke=ue[S].camera;if(ke){let qe=r[ke];qe||(qe=new tr,r[ke]=qe);const De=T.getCameraImage(ke);qe.sourceTexture=De}}}}for(let ue=0;ue<y.length;ue++){const ye=N[ue],Te=y[ue];ye!==null&&Te!==void 0&&Te.update(ye,Y,v||c)}vt&&vt($,Y),Y.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:Y}),B=null}const lt=new pr;lt.setAnimationLoop(Qe),this.setAnimationLoop=function($){vt=$},this.dispose=function(){}}}const Pn=new cr,up=new li;function pp(e,n){function t(d,r){d.matrixAutoUpdate===!0&&d.updateMatrix(),r.value.copy(d.matrix)}function i(d,r){r.color.getRGB(d.fogColor.value,sr(e)),r.isFog?(d.fogNear.value=r.near,d.fogFar.value=r.far):r.isFogExp2&&(d.fogDensity.value=r.density)}function o(d,r,L,R,M){r.isMeshBasicMaterial||r.isMeshLambertMaterial?a(d,r):r.isMeshToonMaterial?(a(d,r),T(d,r)):r.isMeshPhongMaterial?(a(d,r),b(d,r)):r.isMeshStandardMaterial?(a(d,r),x(d,r),r.isMeshPhysicalMaterial&&w(d,r,M)):r.isMeshMatcapMaterial?(a(d,r),B(d,r)):r.isMeshDepthMaterial?a(d,r):r.isMeshDistanceMaterial?(a(d,r),C(d,r)):r.isMeshNormalMaterial?a(d,r):r.isLineBasicMaterial?(c(d,r),r.isLineDashedMaterial&&l(d,r)):r.isPointsMaterial?g(d,r,L,R):r.isSpriteMaterial?v(d,r):r.isShadowMaterial?(d.color.value.copy(r.color),d.opacity.value=r.opacity):r.isShaderMaterial&&(r.uniformsNeedUpdate=!1)}function a(d,r){d.opacity.value=r.opacity,r.color&&d.diffuse.value.copy(r.color),r.emissive&&d.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(d.map.value=r.map,t(r.map,d.mapTransform)),r.alphaMap&&(d.alphaMap.value=r.alphaMap,t(r.alphaMap,d.alphaMapTransform)),r.bumpMap&&(d.bumpMap.value=r.bumpMap,t(r.bumpMap,d.bumpMapTransform),d.bumpScale.value=r.bumpScale,r.side===cn&&(d.bumpScale.value*=-1)),r.normalMap&&(d.normalMap.value=r.normalMap,t(r.normalMap,d.normalMapTransform),d.normalScale.value.copy(r.normalScale),r.side===cn&&d.normalScale.value.negate()),r.displacementMap&&(d.displacementMap.value=r.displacementMap,t(r.displacementMap,d.displacementMapTransform),d.displacementScale.value=r.displacementScale,d.displacementBias.value=r.displacementBias),r.emissiveMap&&(d.emissiveMap.value=r.emissiveMap,t(r.emissiveMap,d.emissiveMapTransform)),r.specularMap&&(d.specularMap.value=r.specularMap,t(r.specularMap,d.specularMapTransform)),r.alphaTest>0&&(d.alphaTest.value=r.alphaTest);const L=n.get(r),R=L.envMap,M=L.envMapRotation;R&&(d.envMap.value=R,Pn.copy(M),Pn.x*=-1,Pn.y*=-1,Pn.z*=-1,R.isCubeTexture&&R.isRenderTargetTexture===!1&&(Pn.y*=-1,Pn.z*=-1),d.envMapRotation.value.setFromMatrix4(up.makeRotationFromEuler(Pn)),d.flipEnvMap.value=R.isCubeTexture&&R.isRenderTargetTexture===!1?-1:1,d.reflectivity.value=r.reflectivity,d.ior.value=r.ior,d.refractionRatio.value=r.refractionRatio),r.lightMap&&(d.lightMap.value=r.lightMap,d.lightMapIntensity.value=r.lightMapIntensity,t(r.lightMap,d.lightMapTransform)),r.aoMap&&(d.aoMap.value=r.aoMap,d.aoMapIntensity.value=r.aoMapIntensity,t(r.aoMap,d.aoMapTransform))}function c(d,r){d.diffuse.value.copy(r.color),d.opacity.value=r.opacity,r.map&&(d.map.value=r.map,t(r.map,d.mapTransform))}function l(d,r){d.dashSize.value=r.dashSize,d.totalSize.value=r.dashSize+r.gapSize,d.scale.value=r.scale}function g(d,r,L,R){d.diffuse.value.copy(r.color),d.opacity.value=r.opacity,d.size.value=r.size*L,d.scale.value=R*.5,r.map&&(d.map.value=r.map,t(r.map,d.uvTransform)),r.alphaMap&&(d.alphaMap.value=r.alphaMap,t(r.alphaMap,d.alphaMapTransform)),r.alphaTest>0&&(d.alphaTest.value=r.alphaTest)}function v(d,r){d.diffuse.value.copy(r.color),d.opacity.value=r.opacity,d.rotation.value=r.rotation,r.map&&(d.map.value=r.map,t(r.map,d.mapTransform)),r.alphaMap&&(d.alphaMap.value=r.alphaMap,t(r.alphaMap,d.alphaMapTransform)),r.alphaTest>0&&(d.alphaTest.value=r.alphaTest)}function b(d,r){d.specular.value.copy(r.specular),d.shininess.value=Math.max(r.shininess,1e-4)}function T(d,r){r.gradientMap&&(d.gradientMap.value=r.gradientMap)}function x(d,r){d.metalness.value=r.metalness,r.metalnessMap&&(d.metalnessMap.value=r.metalnessMap,t(r.metalnessMap,d.metalnessMapTransform)),d.roughness.value=r.roughness,r.roughnessMap&&(d.roughnessMap.value=r.roughnessMap,t(r.roughnessMap,d.roughnessMapTransform)),r.envMap&&(d.envMapIntensity.value=r.envMapIntensity)}function w(d,r,L){d.ior.value=r.ior,r.sheen>0&&(d.sheenColor.value.copy(r.sheenColor).multiplyScalar(r.sheen),d.sheenRoughness.value=r.sheenRoughness,r.sheenColorMap&&(d.sheenColorMap.value=r.sheenColorMap,t(r.sheenColorMap,d.sheenColorMapTransform)),r.sheenRoughnessMap&&(d.sheenRoughnessMap.value=r.sheenRoughnessMap,t(r.sheenRoughnessMap,d.sheenRoughnessMapTransform))),r.clearcoat>0&&(d.clearcoat.value=r.clearcoat,d.clearcoatRoughness.value=r.clearcoatRoughness,r.clearcoatMap&&(d.clearcoatMap.value=r.clearcoatMap,t(r.clearcoatMap,d.clearcoatMapTransform)),r.clearcoatRoughnessMap&&(d.clearcoatRoughnessMap.value=r.clearcoatRoughnessMap,t(r.clearcoatRoughnessMap,d.clearcoatRoughnessMapTransform)),r.clearcoatNormalMap&&(d.clearcoatNormalMap.value=r.clearcoatNormalMap,t(r.clearcoatNormalMap,d.clearcoatNormalMapTransform),d.clearcoatNormalScale.value.copy(r.clearcoatNormalScale),r.side===cn&&d.clearcoatNormalScale.value.negate())),r.dispersion>0&&(d.dispersion.value=r.dispersion),r.iridescence>0&&(d.iridescence.value=r.iridescence,d.iridescenceIOR.value=r.iridescenceIOR,d.iridescenceThicknessMinimum.value=r.iridescenceThicknessRange[0],d.iridescenceThicknessMaximum.value=r.iridescenceThicknessRange[1],r.iridescenceMap&&(d.iridescenceMap.value=r.iridescenceMap,t(r.iridescenceMap,d.iridescenceMapTransform)),r.iridescenceThicknessMap&&(d.iridescenceThicknessMap.value=r.iridescenceThicknessMap,t(r.iridescenceThicknessMap,d.iridescenceThicknessMapTransform))),r.transmission>0&&(d.transmission.value=r.transmission,d.transmissionSamplerMap.value=L.texture,d.transmissionSamplerSize.value.set(L.width,L.height),r.transmissionMap&&(d.transmissionMap.value=r.transmissionMap,t(r.transmissionMap,d.transmissionMapTransform)),d.thickness.value=r.thickness,r.thicknessMap&&(d.thicknessMap.value=r.thicknessMap,t(r.thicknessMap,d.thicknessMapTransform)),d.attenuationDistance.value=r.attenuationDistance,d.attenuationColor.value.copy(r.attenuationColor)),r.anisotropy>0&&(d.anisotropyVector.value.set(r.anisotropy*Math.cos(r.anisotropyRotation),r.anisotropy*Math.sin(r.anisotropyRotation)),r.anisotropyMap&&(d.anisotropyMap.value=r.anisotropyMap,t(r.anisotropyMap,d.anisotropyMapTransform))),d.specularIntensity.value=r.specularIntensity,d.specularColor.value.copy(r.specularColor),r.specularColorMap&&(d.specularColorMap.value=r.specularColorMap,t(r.specularColorMap,d.specularColorMapTransform)),r.specularIntensityMap&&(d.specularIntensityMap.value=r.specularIntensityMap,t(r.specularIntensityMap,d.specularIntensityMapTransform))}function B(d,r){r.matcap&&(d.matcap.value=r.matcap)}function C(d,r){const L=n.get(r).light;d.referencePosition.value.setFromMatrixPosition(L.matrixWorld),d.nearDistance.value=L.shadow.camera.near,d.farDistance.value=L.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:o}}function hp(e,n,t,i){let o={},a={},c=[];const l=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function g(L,R){const M=R.program;i.uniformBlockBinding(L,M)}function v(L,R){let M=o[L.id];M===void 0&&(B(L),M=b(L),o[L.id]=M,L.addEventListener("dispose",d));const y=R.program;i.updateUBOMapping(L,y);const N=n.render.frame;a[L.id]!==N&&(x(L),a[L.id]=N)}function b(L){const R=T();L.__bindingPointIndex=R;const M=e.createBuffer(),y=L.__size,N=L.usage;return e.bindBuffer(e.UNIFORM_BUFFER,M),e.bufferData(e.UNIFORM_BUFFER,y,N),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,R,M),M}function T(){for(let L=0;L<l;L++)if(c.indexOf(L)===-1)return c.push(L),L;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function x(L){const R=o[L.id],M=L.uniforms,y=L.__cache;e.bindBuffer(e.UNIFORM_BUFFER,R);for(let N=0,k=M.length;N<k;N++){const G=Array.isArray(M[N])?M[N]:[M[N]];for(let h=0,p=G.length;h<p;h++){const D=G[h];if(w(D,N,h,y)===!0){const F=D.__offset,q=Array.isArray(D.value)?D.value:[D.value];let Q=0;for(let ne=0;ne<q.length;ne++){const j=q[ne],ve=C(j);typeof j=="number"||typeof j=="boolean"?(D.__data[0]=j,e.bufferSubData(e.UNIFORM_BUFFER,F+Q,D.__data)):j.isMatrix3?(D.__data[0]=j.elements[0],D.__data[1]=j.elements[1],D.__data[2]=j.elements[2],D.__data[3]=0,D.__data[4]=j.elements[3],D.__data[5]=j.elements[4],D.__data[6]=j.elements[5],D.__data[7]=0,D.__data[8]=j.elements[6],D.__data[9]=j.elements[7],D.__data[10]=j.elements[8],D.__data[11]=0):(j.toArray(D.__data,Q),Q+=ve.storage/Float32Array.BYTES_PER_ELEMENT)}e.bufferSubData(e.UNIFORM_BUFFER,F,D.__data)}}}e.bindBuffer(e.UNIFORM_BUFFER,null)}function w(L,R,M,y){const N=L.value,k=R+"_"+M;if(y[k]===void 0)return typeof N=="number"||typeof N=="boolean"?y[k]=N:y[k]=N.clone(),!0;{const G=y[k];if(typeof N=="number"||typeof N=="boolean"){if(G!==N)return y[k]=N,!0}else if(G.equals(N)===!1)return G.copy(N),!0}return!1}function B(L){const R=L.uniforms;let M=0;const y=16;for(let k=0,G=R.length;k<G;k++){const h=Array.isArray(R[k])?R[k]:[R[k]];for(let p=0,D=h.length;p<D;p++){const F=h[p],q=Array.isArray(F.value)?F.value:[F.value];for(let Q=0,ne=q.length;Q<ne;Q++){const j=q[Q],ve=C(j),Z=M%y,Le=Z%ve.boundary,Ye=Z+Le;M+=Le,Ye!==0&&y-Ye<ve.storage&&(M+=y-Ye),F.__data=new Float32Array(ve.storage/Float32Array.BYTES_PER_ELEMENT),F.__offset=M,M+=ve.storage}}}const N=M%y;return N>0&&(M+=y-N),L.__size=M,L.__cache={},this}function C(L){const R={boundary:0,storage:0};return typeof L=="number"||typeof L=="boolean"?(R.boundary=4,R.storage=4):L.isVector2?(R.boundary=8,R.storage=8):L.isVector3||L.isColor?(R.boundary=16,R.storage=12):L.isVector4?(R.boundary=16,R.storage=16):L.isMatrix3?(R.boundary=48,R.storage=48):L.isMatrix4?(R.boundary=64,R.storage=64):L.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",L),R}function d(L){const R=L.target;R.removeEventListener("dispose",d);const M=c.indexOf(R.__bindingPointIndex);c.splice(M,1),e.deleteBuffer(o[R.id]),delete o[R.id],delete a[R.id]}function r(){for(const L in o)e.deleteBuffer(o[L]);c=[],o={},a={}}return{bind:g,update:v,dispose:r}}class mp{constructor(n={}){const{canvas:t=as(),context:i=null,depth:o=!0,stencil:a=!1,alpha:c=!1,antialias:l=!1,premultipliedAlpha:g=!0,preserveDrawingBuffer:v=!1,powerPreference:b="default",failIfMajorPerformanceCaveat:T=!1,reversedDepthBuffer:x=!1}=n;this.isWebGLRenderer=!0;let w;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");w=i.getContextAttributes().alpha}else w=c;const B=new Uint32Array(4),C=new Int32Array(4);let d=null,r=null;const L=[],R=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=bn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const M=this;let y=!1;this._outputColorSpace=Qn;let N=0,k=0,G=null,h=-1,p=null;const D=new on,F=new on;let q=null;const Q=new He(0);let ne=0,j=t.width,ve=t.height,Z=1,Le=null,Ye=null;const Ze=new on(0,0,j,ve),ct=new on(0,0,j,ve);let vt=!1;const Qe=new Za;let lt=!1,$=!1;const Y=new li,ue=new at,ye=new on,Te={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Ve=!1;function Tt(){return G===null?Z:1}let S=i;function ke(f,U){return t.getContext(f,U)}try{const f={alpha:!0,depth:o,stencil:a,antialias:l,premultipliedAlpha:g,preserveDrawingBuffer:v,powerPreference:b,failIfMajorPerformanceCaveat:T};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${rs}`),t.addEventListener("webglcontextlost",Me,!1),t.addEventListener("webglcontextrestored",Ae,!1),t.addEventListener("webglcontextcreationerror",me,!1),S===null){const U="webgl2";if(S=ke(U,f),S===null)throw ke(U)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(f){throw console.error("THREE.WebGLRenderer: "+f.message),f}let qe,De,be,St,Ne,nt,yt,wt,_,s,V,J,de,K,Oe,Ee,Ue,ze,oe,Se,Xe,Fe,xe,et;function A(){qe=new bd(S),qe.init(),Fe=new sp(S,qe),De=new vd(S,qe,n,Fe),be=new ap(S,qe),De.reversedDepthBuffer&&x&&be.buffers.depth.setReversed(!0),St=new Cd(S),Ne=new Yu,nt=new rp(S,qe,be,Ne,De,Fe,St),yt=new Md(M),wt=new wd(M),_=new Lc(S),xe=new _d(S,_),s=new Ad(S,_,St,xe),V=new Pd(S,s,_,St),oe=new yd(S,De,nt),Ee=new Sd(Ne),J=new Xu(M,yt,wt,qe,De,xe,Ee),de=new pp(M,Ne),K=new Ku,Oe=new ep(qe),ze=new md(M,yt,wt,be,V,w,g),Ue=new ip(M,V,De),et=new hp(S,St,De,be),Se=new gd(S,qe,St),Xe=new Rd(S,qe,St),St.programs=J.programs,M.capabilities=De,M.extensions=qe,M.properties=Ne,M.renderLists=K,M.shadowMap=Ue,M.state=be,M.info=St}A();const _e=new dp(M,S);this.xr=_e,this.getContext=function(){return S},this.getContextAttributes=function(){return S.getContextAttributes()},this.forceContextLoss=function(){const f=qe.get("WEBGL_lose_context");f&&f.loseContext()},this.forceContextRestore=function(){const f=qe.get("WEBGL_lose_context");f&&f.restoreContext()},this.getPixelRatio=function(){return Z},this.setPixelRatio=function(f){f!==void 0&&(Z=f,this.setSize(j,ve,!1))},this.getSize=function(f){return f.set(j,ve)},this.setSize=function(f,U,z=!0){if(_e.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}j=f,ve=U,t.width=Math.floor(f*Z),t.height=Math.floor(U*Z),z===!0&&(t.style.width=f+"px",t.style.height=U+"px"),this.setViewport(0,0,f,U)},this.getDrawingBufferSize=function(f){return f.set(j*Z,ve*Z).floor()},this.setDrawingBufferSize=function(f,U,z){j=f,ve=U,Z=z,t.width=Math.floor(f*z),t.height=Math.floor(U*z),this.setViewport(0,0,f,U)},this.getCurrentViewport=function(f){return f.copy(D)},this.getViewport=function(f){return f.copy(Ze)},this.setViewport=function(f,U,z,X){f.isVector4?Ze.set(f.x,f.y,f.z,f.w):Ze.set(f,U,z,X),be.viewport(D.copy(Ze).multiplyScalar(Z).round())},this.getScissor=function(f){return f.copy(ct)},this.setScissor=function(f,U,z,X){f.isVector4?ct.set(f.x,f.y,f.z,f.w):ct.set(f,U,z,X),be.scissor(F.copy(ct).multiplyScalar(Z).round())},this.getScissorTest=function(){return vt},this.setScissorTest=function(f){be.setScissorTest(vt=f)},this.setOpaqueSort=function(f){Le=f},this.setTransparentSort=function(f){Ye=f},this.getClearColor=function(f){return f.copy(ze.getClearColor())},this.setClearColor=function(){ze.setClearColor(...arguments)},this.getClearAlpha=function(){return ze.getClearAlpha()},this.setClearAlpha=function(){ze.setClearAlpha(...arguments)},this.clear=function(f=!0,U=!0,z=!0){let X=0;if(f){let O=!1;if(G!==null){const he=G.texture.format;O=he===ar||he===or||he===ir}if(O){const he=G.texture.type,we=he===On||he===ui||he===Pi||he===di||he===Ja||he===er,Ge=ze.getClearColor(),Ce=ze.getClearAlpha(),Je=Ge.r,it=Ge.g,Ke=Ge.b;we?(B[0]=Je,B[1]=it,B[2]=Ke,B[3]=Ce,S.clearBufferuiv(S.COLOR,0,B)):(C[0]=Je,C[1]=it,C[2]=Ke,C[3]=Ce,S.clearBufferiv(S.COLOR,0,C))}else X|=S.COLOR_BUFFER_BIT}U&&(X|=S.DEPTH_BUFFER_BIT),z&&(X|=S.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),S.clear(X)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",Me,!1),t.removeEventListener("webglcontextrestored",Ae,!1),t.removeEventListener("webglcontextcreationerror",me,!1),ze.dispose(),K.dispose(),Oe.dispose(),Ne.dispose(),yt.dispose(),wt.dispose(),V.dispose(),xe.dispose(),et.dispose(),J.dispose(),_e.dispose(),_e.removeEventListener("sessionstart",zt),_e.removeEventListener("sessionend",rn),Ft.stop()};function Me(f){f.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),y=!0}function Ae(){console.log("THREE.WebGLRenderer: Context Restored."),y=!1;const f=St.autoReset,U=Ue.enabled,z=Ue.autoUpdate,X=Ue.needsUpdate,O=Ue.type;A(),St.autoReset=f,Ue.enabled=U,Ue.autoUpdate=z,Ue.needsUpdate=X,Ue.type=O}function me(f){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",f.statusMessage)}function ae(f){const U=f.target;U.removeEventListener("dispose",ae),Ie(U)}function Ie(f){je(f),Ne.remove(f)}function je(f){const U=Ne.get(f).programs;U!==void 0&&(U.forEach(function(z){J.releaseProgram(z)}),f.isShaderMaterial&&J.releaseShaderCache(f))}this.renderBufferDirect=function(f,U,z,X,O,he){U===null&&(U=Te);const we=O.isMesh&&O.matrixWorld.determinant()<0,Ge=Ot(f,U,z,X,O);be.setMaterial(X,we);let Ce=z.index,Je=1;if(X.wireframe===!0){if(Ce=s.getWireframeAttribute(z),Ce===void 0)return;Je=2}const it=z.drawRange,Ke=z.attributes.position;let pt=it.start*Je,xt=(it.start+it.count)*Je;he!==null&&(pt=Math.max(pt,he.start*Je),xt=Math.min(xt,(he.start+he.count)*Je)),Ce!==null?(pt=Math.max(pt,0),xt=Math.min(xt,Ce.count)):Ke!=null&&(pt=Math.max(pt,0),xt=Math.min(xt,Ke.count));const Lt=xt-pt;if(Lt<0||Lt===1/0)return;xe.setup(O,X,Ge,z,Ce);let At,ht=Se;if(Ce!==null&&(At=_.get(Ce),ht=Xe,ht.setIndex(At)),O.isMesh)X.wireframe===!0?(be.setLineWidth(X.wireframeLinewidth*Tt()),ht.setMode(S.LINES)):ht.setMode(S.TRIANGLES);else if(O.isLine){let Be=X.linewidth;Be===void 0&&(Be=1),be.setLineWidth(Be*Tt()),O.isLineSegments?ht.setMode(S.LINES):O.isLineLoop?ht.setMode(S.LINE_LOOP):ht.setMode(S.LINE_STRIP)}else O.isPoints?ht.setMode(S.POINTS):O.isSprite&&ht.setMode(S.TRIANGLES);if(O.isBatchedMesh)if(O._multiDrawInstances!==null)ao("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),ht.renderMultiDrawInstances(O._multiDrawStarts,O._multiDrawCounts,O._multiDrawCount,O._multiDrawInstances);else if(qe.get("WEBGL_multi_draw"))ht.renderMultiDraw(O._multiDrawStarts,O._multiDrawCounts,O._multiDrawCount);else{const Be=O._multiDrawStarts,dt=O._multiDrawCounts,gt=O._multiDrawCount,Kt=Ce?_.get(Ce).bytesPerElement:1,xn=Ne.get(X).currentProgram.getUniforms();for(let Qt=0;Qt<gt;Qt++)xn.setValue(S,"_gl_DrawID",Qt),ht.render(Be[Qt]/Kt,dt[Qt])}else if(O.isInstancedMesh)ht.renderInstances(pt,Lt,O.count);else if(z.isInstancedBufferGeometry){const Be=z._maxInstanceCount!==void 0?z._maxInstanceCount:1/0,dt=Math.min(z.instanceCount,Be);ht.renderInstances(pt,Lt,dt)}else ht.render(pt,Lt)};function mt(f,U,z){f.transparent===!0&&f.side===It&&f.forceSinglePass===!1?(f.side=cn,f.needsUpdate=!0,ge(f,U,z),f.side=fi,f.needsUpdate=!0,ge(f,U,z),f.side=It):ge(f,U,z)}this.compile=function(f,U,z=null){z===null&&(z=f),r=Oe.get(z),r.init(U),R.push(r),z.traverseVisible(function(O){O.isLight&&O.layers.test(U.layers)&&(r.pushLight(O),O.castShadow&&r.pushShadow(O))}),f!==z&&f.traverseVisible(function(O){O.isLight&&O.layers.test(U.layers)&&(r.pushLight(O),O.castShadow&&r.pushShadow(O))}),r.setupLights();const X=new Set;return f.traverse(function(O){if(!(O.isMesh||O.isPoints||O.isLine||O.isSprite))return;const he=O.material;if(he)if(Array.isArray(he))for(let we=0;we<he.length;we++){const Ge=he[we];mt(Ge,z,O),X.add(Ge)}else mt(he,z,O),X.add(he)}),r=R.pop(),X},this.compileAsync=function(f,U,z=null){const X=this.compile(f,U,z);return new Promise(O=>{function he(){if(X.forEach(function(we){Ne.get(we).currentProgram.isReady()&&X.delete(we)}),X.size===0){O(f);return}setTimeout(he,10)}qe.get("KHR_parallel_shader_compile")!==null?he():setTimeout(he,10)})};let st=null;function _t(f){st&&st(f)}function zt(){Ft.stop()}function rn(){Ft.start()}const Ft=new pr;Ft.setAnimationLoop(_t),typeof self<"u"&&Ft.setContext(self),this.setAnimationLoop=function(f){st=f,_e.setAnimationLoop(f),f===null?Ft.stop():Ft.start()},_e.addEventListener("sessionstart",zt),_e.addEventListener("sessionend",rn),this.render=function(f,U){if(U!==void 0&&U.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(y===!0)return;if(f.matrixWorldAutoUpdate===!0&&f.updateMatrixWorld(),U.parent===null&&U.matrixWorldAutoUpdate===!0&&U.updateMatrixWorld(),_e.enabled===!0&&_e.isPresenting===!0&&(_e.cameraAutoUpdate===!0&&_e.updateCamera(U),U=_e.getCamera()),f.isScene===!0&&f.onBeforeRender(M,f,U,G),r=Oe.get(f,R.length),r.init(U),R.push(r),Y.multiplyMatrices(U.projectionMatrix,U.matrixWorldInverse),Qe.setFromProjectionMatrix(Y,Co,U.reversedDepth),$=this.localClippingEnabled,lt=Ee.init(this.clippingPlanes,$),d=K.get(f,L.length),d.init(),L.push(d),_e.enabled===!0&&_e.isPresenting===!0){const he=M.xr.getDepthSensingMesh();he!==null&&Bt(he,U,-1/0,M.sortObjects)}Bt(f,U,0,M.sortObjects),d.finish(),M.sortObjects===!0&&d.sort(Le,Ye),Ve=_e.enabled===!1||_e.isPresenting===!1||_e.hasDepthSensing()===!1,Ve&&ze.addToRenderList(d,f),this.info.render.frame++,lt===!0&&Ee.beginShadows();const z=r.state.shadowsArray;Ue.render(z,f,U),lt===!0&&Ee.endShadows(),this.info.autoReset===!0&&this.info.reset();const X=d.opaque,O=d.transmissive;if(r.setupLights(),U.isArrayCamera){const he=U.cameras;if(O.length>0)for(let we=0,Ge=he.length;we<Ge;we++){const Ce=he[we];W(X,O,f,Ce)}Ve&&ze.render(f);for(let we=0,Ge=he.length;we<Ge;we++){const Ce=he[we];H(d,f,Ce,Ce.viewport)}}else O.length>0&&W(X,O,f,U),Ve&&ze.render(f),H(d,f,U);G!==null&&k===0&&(nt.updateMultisampleRenderTarget(G),nt.updateRenderTargetMipmap(G)),f.isScene===!0&&f.onAfterRender(M,f,U),xe.resetDefaultState(),h=-1,p=null,R.pop(),R.length>0?(r=R[R.length-1],lt===!0&&Ee.setGlobalState(M.clippingPlanes,r.state.camera)):r=null,L.pop(),L.length>0?d=L[L.length-1]:d=null};function Bt(f,U,z,X){if(f.visible===!1)return;if(f.layers.test(U.layers)){if(f.isGroup)z=f.renderOrder;else if(f.isLOD)f.autoUpdate===!0&&f.update(U);else if(f.isLight)r.pushLight(f),f.castShadow&&r.pushShadow(f);else if(f.isSprite){if(!f.frustumCulled||Qe.intersectsSprite(f)){X&&ye.setFromMatrixPosition(f.matrixWorld).applyMatrix4(Y);const we=V.update(f),Ge=f.material;Ge.visible&&d.push(f,we,Ge,z,ye.z,null)}}else if((f.isMesh||f.isLine||f.isPoints)&&(!f.frustumCulled||Qe.intersectsObject(f))){const we=V.update(f),Ge=f.material;if(X&&(f.boundingSphere!==void 0?(f.boundingSphere===null&&f.computeBoundingSphere(),ye.copy(f.boundingSphere.center)):(we.boundingSphere===null&&we.computeBoundingSphere(),ye.copy(we.boundingSphere.center)),ye.applyMatrix4(f.matrixWorld).applyMatrix4(Y)),Array.isArray(Ge)){const Ce=we.groups;for(let Je=0,it=Ce.length;Je<it;Je++){const Ke=Ce[Je],pt=Ge[Ke.materialIndex];pt&&pt.visible&&d.push(f,we,pt,z,ye.z,Ke)}}else Ge.visible&&d.push(f,we,Ge,z,ye.z,null)}}const he=f.children;for(let we=0,Ge=he.length;we<Ge;we++)Bt(he[we],U,z,X)}function H(f,U,z,X){const O=f.opaque,he=f.transmissive,we=f.transparent;r.setupLightsView(z),lt===!0&&Ee.setGlobalState(M.clippingPlanes,z),X&&be.viewport(D.copy(X)),O.length>0&&fe(O,U,z),he.length>0&&fe(he,U,z),we.length>0&&fe(we,U,z),be.buffers.depth.setTest(!0),be.buffers.depth.setMask(!0),be.buffers.color.setMask(!0),be.setPolygonOffset(!1)}function W(f,U,z,X){if((z.isScene===!0?z.overrideMaterial:null)!==null)return;r.state.transmissionRenderTarget[X.id]===void 0&&(r.state.transmissionRenderTarget[X.id]=new qn(1,1,{generateMipmaps:!0,type:qe.has("EXT_color_buffer_half_float")||qe.has("EXT_color_buffer_float")?Li:On,minFilter:Ln,samples:4,stencilBuffer:a,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Ht.workingColorSpace}));const he=r.state.transmissionRenderTarget[X.id],we=X.viewport||D;he.setSize(we.z*M.transmissionResolutionScale,we.w*M.transmissionResolutionScale);const Ge=M.getRenderTarget(),Ce=M.getActiveCubeFace(),Je=M.getActiveMipmapLevel();M.setRenderTarget(he),M.getClearColor(Q),ne=M.getClearAlpha(),ne<1&&M.setClearColor(16777215,.5),M.clear(),Ve&&ze.render(z);const it=M.toneMapping;M.toneMapping=bn;const Ke=X.viewport;if(X.viewport!==void 0&&(X.viewport=void 0),r.setupLightsView(X),lt===!0&&Ee.setGlobalState(M.clippingPlanes,X),fe(f,z,X),nt.updateMultisampleRenderTarget(he),nt.updateRenderTargetMipmap(he),qe.has("WEBGL_multisampled_render_to_texture")===!1){let pt=!1;for(let xt=0,Lt=U.length;xt<Lt;xt++){const At=U[xt],ht=At.object,Be=At.geometry,dt=At.material,gt=At.group;if(dt.side===It&&ht.layers.test(X.layers)){const Kt=dt.side;dt.side=cn,dt.needsUpdate=!0,te(ht,z,X,Be,dt,gt),dt.side=Kt,dt.needsUpdate=!0,pt=!0}}pt===!0&&(nt.updateMultisampleRenderTarget(he),nt.updateRenderTargetMipmap(he))}M.setRenderTarget(Ge,Ce,Je),M.setClearColor(Q,ne),Ke!==void 0&&(X.viewport=Ke),M.toneMapping=it}function fe(f,U,z){const X=U.isScene===!0?U.overrideMaterial:null;for(let O=0,he=f.length;O<he;O++){const we=f[O],Ge=we.object,Ce=we.geometry,Je=we.group;let it=we.material;it.allowOverride===!0&&X!==null&&(it=X),Ge.layers.test(z.layers)&&te(Ge,U,z,Ce,it,Je)}}function te(f,U,z,X,O,he){f.onBeforeRender(M,U,z,X,O,he),f.modelViewMatrix.multiplyMatrices(z.matrixWorldInverse,f.matrixWorld),f.normalMatrix.getNormalMatrix(f.modelViewMatrix),O.onBeforeRender(M,U,z,X,f,he),O.transparent===!0&&O.side===It&&O.forceSinglePass===!1?(O.side=cn,O.needsUpdate=!0,M.renderBufferDirect(z,U,X,O,f,he),O.side=fi,O.needsUpdate=!0,M.renderBufferDirect(z,U,X,O,f,he),O.side=It):M.renderBufferDirect(z,U,X,O,f,he),f.onAfterRender(M,U,z,X,O,he)}function ge(f,U,z){U.isScene!==!0&&(U=Te);const X=Ne.get(f),O=r.state.lights,he=r.state.shadowsArray,we=O.state.version,Ge=J.getParameters(f,O.state,he,U,z),Ce=J.getProgramCacheKey(Ge);let Je=X.programs;X.environment=f.isMeshStandardMaterial?U.environment:null,X.fog=U.fog,X.envMap=(f.isMeshStandardMaterial?wt:yt).get(f.envMap||X.environment),X.envMapRotation=X.environment!==null&&f.envMap===null?U.environmentRotation:f.envMapRotation,Je===void 0&&(f.addEventListener("dispose",ae),Je=new Map,X.programs=Je);let it=Je.get(Ce);if(it!==void 0){if(X.currentProgram===it&&X.lightsStateVersion===we)return ft(f,Ge),it}else Ge.uniforms=J.getUniforms(f),f.onBeforeCompile(Ge,M),it=J.acquireProgram(Ge,Ce),Je.set(Ce,it),X.uniforms=Ge.uniforms;const Ke=X.uniforms;return(!f.isShaderMaterial&&!f.isRawShaderMaterial||f.clipping===!0)&&(Ke.clippingPlanes=Ee.uniform),ft(f,Ge),X.needsLights=sn(f),X.lightsStateVersion=we,X.needsLights&&(Ke.ambientLightColor.value=O.state.ambient,Ke.lightProbe.value=O.state.probe,Ke.directionalLights.value=O.state.directional,Ke.directionalLightShadows.value=O.state.directionalShadow,Ke.spotLights.value=O.state.spot,Ke.spotLightShadows.value=O.state.spotShadow,Ke.rectAreaLights.value=O.state.rectArea,Ke.ltc_1.value=O.state.rectAreaLTC1,Ke.ltc_2.value=O.state.rectAreaLTC2,Ke.pointLights.value=O.state.point,Ke.pointLightShadows.value=O.state.pointShadow,Ke.hemisphereLights.value=O.state.hemi,Ke.directionalShadowMap.value=O.state.directionalShadowMap,Ke.directionalShadowMatrix.value=O.state.directionalShadowMatrix,Ke.spotShadowMap.value=O.state.spotShadowMap,Ke.spotLightMatrix.value=O.state.spotLightMatrix,Ke.spotLightMap.value=O.state.spotLightMap,Ke.pointShadowMap.value=O.state.pointShadowMap,Ke.pointShadowMatrix.value=O.state.pointShadowMatrix),X.currentProgram=it,X.uniformsList=null,it}function Pe(f){if(f.uniformsList===null){const U=f.currentProgram.getUniforms();f.uniformsList=Ri.seqWithValue(U.seq,f.uniforms)}return f.uniformsList}function ft(f,U){const z=Ne.get(f);z.outputColorSpace=U.outputColorSpace,z.batching=U.batching,z.batchingColor=U.batchingColor,z.instancing=U.instancing,z.instancingColor=U.instancingColor,z.instancingMorph=U.instancingMorph,z.skinning=U.skinning,z.morphTargets=U.morphTargets,z.morphNormals=U.morphNormals,z.morphColors=U.morphColors,z.morphTargetsCount=U.morphTargetsCount,z.numClippingPlanes=U.numClippingPlanes,z.numIntersection=U.numClipIntersection,z.vertexAlphas=U.vertexAlphas,z.vertexTangents=U.vertexTangents,z.toneMapping=U.toneMapping}function Ot(f,U,z,X,O){U.isScene!==!0&&(U=Te),nt.resetTextureUnits();const he=U.fog,we=X.isMeshStandardMaterial?U.environment:null,Ge=G===null?M.outputColorSpace:G.isXRRenderTarget===!0?G.texture.colorSpace:Ui,Ce=(X.isMeshStandardMaterial?wt:yt).get(X.envMap||we),Je=X.vertexColors===!0&&!!z.attributes.color&&z.attributes.color.itemSize===4,it=!!z.attributes.tangent&&(!!X.normalMap||X.anisotropy>0),Ke=!!z.morphAttributes.position,pt=!!z.morphAttributes.normal,xt=!!z.morphAttributes.color;let Lt=bn;X.toneMapped&&(G===null||G.isXRRenderTarget===!0)&&(Lt=M.toneMapping);const At=z.morphAttributes.position||z.morphAttributes.normal||z.morphAttributes.color,ht=At!==void 0?At.length:0,Be=Ne.get(X),dt=r.state.lights;if(lt===!0&&($===!0||f!==p)){const Yt=f===p&&X.id===h;Ee.setState(X,f,Yt)}let gt=!1;X.version===Be.__version?(Be.needsLights&&Be.lightsStateVersion!==dt.state.version||Be.outputColorSpace!==Ge||O.isBatchedMesh&&Be.batching===!1||!O.isBatchedMesh&&Be.batching===!0||O.isBatchedMesh&&Be.batchingColor===!0&&O.colorTexture===null||O.isBatchedMesh&&Be.batchingColor===!1&&O.colorTexture!==null||O.isInstancedMesh&&Be.instancing===!1||!O.isInstancedMesh&&Be.instancing===!0||O.isSkinnedMesh&&Be.skinning===!1||!O.isSkinnedMesh&&Be.skinning===!0||O.isInstancedMesh&&Be.instancingColor===!0&&O.instanceColor===null||O.isInstancedMesh&&Be.instancingColor===!1&&O.instanceColor!==null||O.isInstancedMesh&&Be.instancingMorph===!0&&O.morphTexture===null||O.isInstancedMesh&&Be.instancingMorph===!1&&O.morphTexture!==null||Be.envMap!==Ce||X.fog===!0&&Be.fog!==he||Be.numClippingPlanes!==void 0&&(Be.numClippingPlanes!==Ee.numPlanes||Be.numIntersection!==Ee.numIntersection)||Be.vertexAlphas!==Je||Be.vertexTangents!==it||Be.morphTargets!==Ke||Be.morphNormals!==pt||Be.morphColors!==xt||Be.toneMapping!==Lt||Be.morphTargetsCount!==ht)&&(gt=!0):(gt=!0,Be.__version=X.version);let Kt=Be.currentProgram;gt===!0&&(Kt=ge(X,U,O));let xn=!1,Qt=!1,Cn=!1;const Pt=Kt.getUniforms(),en=Be.uniforms;if(be.useProgram(Kt.program)&&(xn=!0,Qt=!0,Cn=!0),X.id!==h&&(h=X.id,Qt=!0),xn||p!==f){be.buffers.depth.getReversed()&&f.reversedDepth!==!0&&(f._reversedDepth=!0,f.updateProjectionMatrix()),Pt.setValue(S,"projectionMatrix",f.projectionMatrix),Pt.setValue(S,"viewMatrix",f.matrixWorldInverse);const Zt=Pt.map.cameraPosition;Zt!==void 0&&Zt.setValue(S,ue.setFromMatrixPosition(f.matrixWorld)),De.logarithmicDepthBuffer&&Pt.setValue(S,"logDepthBufFC",2/(Math.log(f.far+1)/Math.LN2)),(X.isMeshPhongMaterial||X.isMeshToonMaterial||X.isMeshLambertMaterial||X.isMeshBasicMaterial||X.isMeshStandardMaterial||X.isShaderMaterial)&&Pt.setValue(S,"isOrthographic",f.isOrthographicCamera===!0),p!==f&&(p=f,Qt=!0,Cn=!0)}if(O.isSkinnedMesh){Pt.setOptional(S,O,"bindMatrix"),Pt.setOptional(S,O,"bindMatrixInverse");const Yt=O.skeleton;Yt&&(Yt.boneTexture===null&&Yt.computeBoneTexture(),Pt.setValue(S,"boneTexture",Yt.boneTexture,nt))}O.isBatchedMesh&&(Pt.setOptional(S,O,"batchingTexture"),Pt.setValue(S,"batchingTexture",O._matricesTexture,nt),Pt.setOptional(S,O,"batchingIdTexture"),Pt.setValue(S,"batchingIdTexture",O._indirectTexture,nt),Pt.setOptional(S,O,"batchingColorTexture"),O._colorsTexture!==null&&Pt.setValue(S,"batchingColorTexture",O._colorsTexture,nt));const jt=z.morphAttributes;if((jt.position!==void 0||jt.normal!==void 0||jt.color!==void 0)&&oe.update(O,z,Kt),(Qt||Be.receiveShadow!==O.receiveShadow)&&(Be.receiveShadow=O.receiveShadow,Pt.setValue(S,"receiveShadow",O.receiveShadow)),X.isMeshGouraudMaterial&&X.envMap!==null&&(en.envMap.value=Ce,en.flipEnvMap.value=Ce.isCubeTexture&&Ce.isRenderTargetTexture===!1?-1:1),X.isMeshStandardMaterial&&X.envMap===null&&U.environment!==null&&(en.envMapIntensity.value=U.environmentIntensity),Qt&&(Pt.setValue(S,"toneMappingExposure",M.toneMappingExposure),Be.needsLights&&Rt(en,Cn),he&&X.fog===!0&&de.refreshFogUniforms(en,he),de.refreshMaterialUniforms(en,X,Z,ve,r.state.transmissionRenderTarget[f.id]),Ri.upload(S,Pe(Be),en,nt)),X.isShaderMaterial&&X.uniformsNeedUpdate===!0&&(Ri.upload(S,Pe(Be),en,nt),X.uniformsNeedUpdate=!1),X.isSpriteMaterial&&Pt.setValue(S,"center",O.center),Pt.setValue(S,"modelViewMatrix",O.modelViewMatrix),Pt.setValue(S,"normalMatrix",O.normalMatrix),Pt.setValue(S,"modelMatrix",O.matrixWorld),X.isShaderMaterial||X.isRawShaderMaterial){const Yt=X.uniformsGroups;for(let Zt=0,Jn=Yt.length;Zt<Jn;Zt++){const fn=Yt[Zt];et.update(fn,Kt),et.bind(fn,Kt)}}return Kt}function Rt(f,U){f.ambientLightColor.needsUpdate=U,f.lightProbe.needsUpdate=U,f.directionalLights.needsUpdate=U,f.directionalLightShadows.needsUpdate=U,f.pointLights.needsUpdate=U,f.pointLightShadows.needsUpdate=U,f.spotLights.needsUpdate=U,f.spotLightShadows.needsUpdate=U,f.rectAreaLights.needsUpdate=U,f.hemisphereLights.needsUpdate=U}function sn(f){return f.isMeshLambertMaterial||f.isMeshToonMaterial||f.isMeshPhongMaterial||f.isMeshStandardMaterial||f.isShadowMaterial||f.isShaderMaterial&&f.lights===!0}this.getActiveCubeFace=function(){return N},this.getActiveMipmapLevel=function(){return k},this.getRenderTarget=function(){return G},this.setRenderTargetTextures=function(f,U,z){const X=Ne.get(f);X.__autoAllocateDepthBuffer=f.resolveDepthBuffer===!1,X.__autoAllocateDepthBuffer===!1&&(X.__useRenderToTexture=!1),Ne.get(f.texture).__webglTexture=U,Ne.get(f.depthTexture).__webglTexture=X.__autoAllocateDepthBuffer?void 0:z,X.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(f,U){const z=Ne.get(f);z.__webglFramebuffer=U,z.__useDefaultFramebuffer=U===void 0};const En=S.createFramebuffer();this.setRenderTarget=function(f,U=0,z=0){G=f,N=U,k=z;let X=!0,O=null,he=!1,we=!1;if(f){const Ce=Ne.get(f);if(Ce.__useDefaultFramebuffer!==void 0)be.bindFramebuffer(S.FRAMEBUFFER,null),X=!1;else if(Ce.__webglFramebuffer===void 0)nt.setupRenderTarget(f);else if(Ce.__hasExternalTextures)nt.rebindTextures(f,Ne.get(f.texture).__webglTexture,Ne.get(f.depthTexture).__webglTexture);else if(f.depthBuffer){const Ke=f.depthTexture;if(Ce.__boundDepthTexture!==Ke){if(Ke!==null&&Ne.has(Ke)&&(f.width!==Ke.image.width||f.height!==Ke.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");nt.setupDepthRenderbuffer(f)}}const Je=f.texture;(Je.isData3DTexture||Je.isDataArrayTexture||Je.isCompressedArrayTexture)&&(we=!0);const it=Ne.get(f).__webglFramebuffer;f.isWebGLCubeRenderTarget?(Array.isArray(it[U])?O=it[U][z]:O=it[U],he=!0):f.samples>0&&nt.useMultisampledRTT(f)===!1?O=Ne.get(f).__webglMultisampledFramebuffer:Array.isArray(it)?O=it[z]:O=it,D.copy(f.viewport),F.copy(f.scissor),q=f.scissorTest}else D.copy(Ze).multiplyScalar(Z).floor(),F.copy(ct).multiplyScalar(Z).floor(),q=vt;if(z!==0&&(O=En),be.bindFramebuffer(S.FRAMEBUFFER,O)&&X&&be.drawBuffers(f,O),be.viewport(D),be.scissor(F),be.setScissorTest(q),he){const Ce=Ne.get(f.texture);S.framebufferTexture2D(S.FRAMEBUFFER,S.COLOR_ATTACHMENT0,S.TEXTURE_CUBE_MAP_POSITIVE_X+U,Ce.__webglTexture,z)}else if(we){const Ce=U;for(let Je=0;Je<f.textures.length;Je++){const it=Ne.get(f.textures[Je]);S.framebufferTextureLayer(S.FRAMEBUFFER,S.COLOR_ATTACHMENT0+Je,it.__webglTexture,z,Ce)}}else if(f!==null&&z!==0){const Ce=Ne.get(f.texture);S.framebufferTexture2D(S.FRAMEBUFFER,S.COLOR_ATTACHMENT0,S.TEXTURE_2D,Ce.__webglTexture,z)}h=-1},this.readRenderTargetPixels=function(f,U,z,X,O,he,we,Ge=0){if(!(f&&f.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ce=Ne.get(f).__webglFramebuffer;if(f.isWebGLCubeRenderTarget&&we!==void 0&&(Ce=Ce[we]),Ce){be.bindFramebuffer(S.FRAMEBUFFER,Ce);try{const Je=f.textures[Ge],it=Je.format,Ke=Je.type;if(!De.textureFormatReadable(it)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!De.textureTypeReadable(Ke)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}U>=0&&U<=f.width-X&&z>=0&&z<=f.height-O&&(f.textures.length>1&&S.readBuffer(S.COLOR_ATTACHMENT0+Ge),S.readPixels(U,z,X,O,Fe.convert(it),Fe.convert(Ke),he))}finally{const Je=G!==null?Ne.get(G).__webglFramebuffer:null;be.bindFramebuffer(S.FRAMEBUFFER,Je)}}},this.readRenderTargetPixelsAsync=async function(f,U,z,X,O,he,we,Ge=0){if(!(f&&f.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ce=Ne.get(f).__webglFramebuffer;if(f.isWebGLCubeRenderTarget&&we!==void 0&&(Ce=Ce[we]),Ce)if(U>=0&&U<=f.width-X&&z>=0&&z<=f.height-O){be.bindFramebuffer(S.FRAMEBUFFER,Ce);const Je=f.textures[Ge],it=Je.format,Ke=Je.type;if(!De.textureFormatReadable(it))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!De.textureTypeReadable(Ke))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const pt=S.createBuffer();S.bindBuffer(S.PIXEL_PACK_BUFFER,pt),S.bufferData(S.PIXEL_PACK_BUFFER,he.byteLength,S.STREAM_READ),f.textures.length>1&&S.readBuffer(S.COLOR_ATTACHMENT0+Ge),S.readPixels(U,z,X,O,Fe.convert(it),Fe.convert(Ke),0);const xt=G!==null?Ne.get(G).__webglFramebuffer:null;be.bindFramebuffer(S.FRAMEBUFFER,xt);const Lt=S.fenceSync(S.SYNC_GPU_COMMANDS_COMPLETE,0);return S.flush(),await ss(S,Lt,4),S.bindBuffer(S.PIXEL_PACK_BUFFER,pt),S.getBufferSubData(S.PIXEL_PACK_BUFFER,0,he),S.deleteBuffer(pt),S.deleteSync(Lt),he}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(f,U=null,z=0){const X=Math.pow(2,-z),O=Math.floor(f.image.width*X),he=Math.floor(f.image.height*X),we=U!==null?U.x:0,Ge=U!==null?U.y:0;nt.setTexture2D(f,0),S.copyTexSubImage2D(S.TEXTURE_2D,z,0,0,we,Ge,O,he),be.unbindTexture()};const pn=S.createFramebuffer(),Rn=S.createFramebuffer();this.copyTextureToTexture=function(f,U,z=null,X=null,O=0,he=null){he===null&&(O!==0?(ao("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),he=O,O=0):he=0);let we,Ge,Ce,Je,it,Ke,pt,xt,Lt;const At=f.isCompressedTexture?f.mipmaps[he]:f.image;if(z!==null)we=z.max.x-z.min.x,Ge=z.max.y-z.min.y,Ce=z.isBox3?z.max.z-z.min.z:1,Je=z.min.x,it=z.min.y,Ke=z.isBox3?z.min.z:0;else{const jt=Math.pow(2,-O);we=Math.floor(At.width*jt),Ge=Math.floor(At.height*jt),f.isDataArrayTexture?Ce=At.depth:f.isData3DTexture?Ce=Math.floor(At.depth*jt):Ce=1,Je=0,it=0,Ke=0}X!==null?(pt=X.x,xt=X.y,Lt=X.z):(pt=0,xt=0,Lt=0);const ht=Fe.convert(U.format),Be=Fe.convert(U.type);let dt;U.isData3DTexture?(nt.setTexture3D(U,0),dt=S.TEXTURE_3D):U.isDataArrayTexture||U.isCompressedArrayTexture?(nt.setTexture2DArray(U,0),dt=S.TEXTURE_2D_ARRAY):(nt.setTexture2D(U,0),dt=S.TEXTURE_2D),S.pixelStorei(S.UNPACK_FLIP_Y_WEBGL,U.flipY),S.pixelStorei(S.UNPACK_PREMULTIPLY_ALPHA_WEBGL,U.premultiplyAlpha),S.pixelStorei(S.UNPACK_ALIGNMENT,U.unpackAlignment);const gt=S.getParameter(S.UNPACK_ROW_LENGTH),Kt=S.getParameter(S.UNPACK_IMAGE_HEIGHT),xn=S.getParameter(S.UNPACK_SKIP_PIXELS),Qt=S.getParameter(S.UNPACK_SKIP_ROWS),Cn=S.getParameter(S.UNPACK_SKIP_IMAGES);S.pixelStorei(S.UNPACK_ROW_LENGTH,At.width),S.pixelStorei(S.UNPACK_IMAGE_HEIGHT,At.height),S.pixelStorei(S.UNPACK_SKIP_PIXELS,Je),S.pixelStorei(S.UNPACK_SKIP_ROWS,it),S.pixelStorei(S.UNPACK_SKIP_IMAGES,Ke);const Pt=f.isDataArrayTexture||f.isData3DTexture,en=U.isDataArrayTexture||U.isData3DTexture;if(f.isDepthTexture){const jt=Ne.get(f),Yt=Ne.get(U),Zt=Ne.get(jt.__renderTarget),Jn=Ne.get(Yt.__renderTarget);be.bindFramebuffer(S.READ_FRAMEBUFFER,Zt.__webglFramebuffer),be.bindFramebuffer(S.DRAW_FRAMEBUFFER,Jn.__webglFramebuffer);for(let fn=0;fn<Ce;fn++)Pt&&(S.framebufferTextureLayer(S.READ_FRAMEBUFFER,S.COLOR_ATTACHMENT0,Ne.get(f).__webglTexture,O,Ke+fn),S.framebufferTextureLayer(S.DRAW_FRAMEBUFFER,S.COLOR_ATTACHMENT0,Ne.get(U).__webglTexture,he,Lt+fn)),S.blitFramebuffer(Je,it,we,Ge,pt,xt,we,Ge,S.DEPTH_BUFFER_BIT,S.NEAREST);be.bindFramebuffer(S.READ_FRAMEBUFFER,null),be.bindFramebuffer(S.DRAW_FRAMEBUFFER,null)}else if(O!==0||f.isRenderTargetTexture||Ne.has(f)){const jt=Ne.get(f),Yt=Ne.get(U);be.bindFramebuffer(S.READ_FRAMEBUFFER,pn),be.bindFramebuffer(S.DRAW_FRAMEBUFFER,Rn);for(let Zt=0;Zt<Ce;Zt++)Pt?S.framebufferTextureLayer(S.READ_FRAMEBUFFER,S.COLOR_ATTACHMENT0,jt.__webglTexture,O,Ke+Zt):S.framebufferTexture2D(S.READ_FRAMEBUFFER,S.COLOR_ATTACHMENT0,S.TEXTURE_2D,jt.__webglTexture,O),en?S.framebufferTextureLayer(S.DRAW_FRAMEBUFFER,S.COLOR_ATTACHMENT0,Yt.__webglTexture,he,Lt+Zt):S.framebufferTexture2D(S.DRAW_FRAMEBUFFER,S.COLOR_ATTACHMENT0,S.TEXTURE_2D,Yt.__webglTexture,he),O!==0?S.blitFramebuffer(Je,it,we,Ge,pt,xt,we,Ge,S.COLOR_BUFFER_BIT,S.NEAREST):en?S.copyTexSubImage3D(dt,he,pt,xt,Lt+Zt,Je,it,we,Ge):S.copyTexSubImage2D(dt,he,pt,xt,Je,it,we,Ge);be.bindFramebuffer(S.READ_FRAMEBUFFER,null),be.bindFramebuffer(S.DRAW_FRAMEBUFFER,null)}else en?f.isDataTexture||f.isData3DTexture?S.texSubImage3D(dt,he,pt,xt,Lt,we,Ge,Ce,ht,Be,At.data):U.isCompressedArrayTexture?S.compressedTexSubImage3D(dt,he,pt,xt,Lt,we,Ge,Ce,ht,At.data):S.texSubImage3D(dt,he,pt,xt,Lt,we,Ge,Ce,ht,Be,At):f.isDataTexture?S.texSubImage2D(S.TEXTURE_2D,he,pt,xt,we,Ge,ht,Be,At.data):f.isCompressedTexture?S.compressedTexSubImage2D(S.TEXTURE_2D,he,pt,xt,At.width,At.height,ht,At.data):S.texSubImage2D(S.TEXTURE_2D,he,pt,xt,we,Ge,ht,Be,At);S.pixelStorei(S.UNPACK_ROW_LENGTH,gt),S.pixelStorei(S.UNPACK_IMAGE_HEIGHT,Kt),S.pixelStorei(S.UNPACK_SKIP_PIXELS,xn),S.pixelStorei(S.UNPACK_SKIP_ROWS,Qt),S.pixelStorei(S.UNPACK_SKIP_IMAGES,Cn),he===0&&U.generateMipmaps&&S.generateMipmap(dt),be.unbindTexture()},this.initRenderTarget=function(f){Ne.get(f).__webglFramebuffer===void 0&&nt.setupRenderTarget(f)},this.initTexture=function(f){f.isCubeTexture?nt.setTextureCube(f,0):f.isData3DTexture?nt.setTexture3D(f,0):f.isDataArrayTexture||f.isCompressedArrayTexture?nt.setTexture2DArray(f,0):nt.setTexture2D(f,0),be.unbindTexture()},this.resetState=function(){N=0,k=0,G=null,be.reset(),xe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Co}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(n){this._outputColorSpace=n;const t=this.getContext();t.drawingBufferColorSpace=Ht._getDrawingBufferColorSpace(n),t.unpackColorSpace=Ht._getUnpackColorSpace()}}const Sn=.5,nn=.15,qt=.06,hn=.008,Si=nn*.6,_p={color:9132587,roughness:.85,metalness:.05},gp={color:8015396,roughness:.8,metalness:.08},vp={color:4929574,roughness:.96},Sp={color:4997167,transparent:!0,opacity:.16,roughness:.98,metalness:0};function Fa(e){let n=Math.sin(e*127.1+311.7)*43758.5453;return n-Math.floor(n)}function Mp(e,n,t){const i=Math.sin((n+e*.17)*12.9898+(t-e*.11)*78.233)*43758.5453;return i-Math.floor(i)}function vr(e,n,t=1,i=1){const o=document.createElement("canvas");o.width=e,o.height=e;const a=o.getContext("2d");n(a,e);const c=new $n(o);return c.colorSpace=Qn,c.wrapS=Fn,c.wrapT=Fn,c.repeat.set(t,i),c.needsUpdate=!0,c}function Ba(e,n,t=1,i=1){const o=new He(e),a=new He(n);return vr(192,(c,l)=>{c.fillStyle=`#${o.getHexString()}`,c.fillRect(0,0,l,l);for(let g=0;g<l;g+=2){const v=Math.sin(g*.09)*8,b=.18+(Math.sin(g*.17)*.08+.08);c.strokeStyle=`rgba(${Math.round(a.r*255)}, ${Math.round(a.g*255)}, ${Math.round(a.b*255)}, ${b})`,c.lineWidth=1,c.beginPath(),c.moveTo(0,g+v),c.lineTo(l,g-v*.25),c.stroke()}for(let g=0;g<10;g++){const v=g*37%l,b=g*19%l;c.fillStyle="rgba(60,30,10,0.12)",c.beginPath(),c.ellipse(v,b,8+g%3*3,3+g%2*2,.3,0,Math.PI*2),c.fill()}},t,i)}function Ep(){return vr(192,(e,n)=>{e.fillStyle="#4b3826",e.fillRect(0,0,n,n);for(let t=0;t<900;t++){const i=t*73%n,o=t*41%n,a=1+t%3,c=46+t%42;e.fillStyle=`rgba(${c}, ${28+t%28}, ${15+t%20}, 0.17)`,e.beginPath(),e.arc(i,o,a,0,Math.PI*2),e.fill()}for(let t=0;t<120;t++){const i=t*29%n,o=t*61%n;e.fillStyle="rgba(150,118,74,0.08)",e.fillRect(i,o,6+t%4,2+t%3)}for(let t=0;t<180;t++){const i=t*17%n,o=t*97%n;e.fillStyle="rgba(92,64,36,0.12)",e.beginPath(),e.ellipse(i,o,3+t%3,1.5+t%2,t%7*.3,0,Math.PI*2),e.fill()}},1.4,1.4)}function xp(e){const n=Sn*.985,t=new an(n,n,12,12),i=t.getAttribute("position"),o=n/2;for(let a=0;a<i.count;a++){const c=i.getX(a),l=i.getY(a),g=c/o,v=l/o,b=Math.min(1,Math.sqrt(g*g+v*v)),T=(1-b)**2*.013,x=b*.0018,w=(Mp(e,c*3.1,l*3.1)-.5)*.0048,B=Math.sin((c+e*.07)*20)*.0012*(1-b);i.setZ(a,T-x+w+B)}return i.needsUpdate=!0,t.computeVertexNormals(),t.computeBoundingBox(),t}const Ga=[6719658,8947848,8947848,8956518,13805914,8956518,8956518,8956518];function Tp(e,n){return e===0?"Back · Wall":e===n-1?"Front · Access":`Row ${e}`}function wp(e=null,n=$t,t=kn){const i=new We,o=[],a=[],c=[],l=[],g=[],v=new ee(_p),b=new ee(gp),T=new ee(Sp),x=Ba(9132587,7226141,1.3,1.3),w=Ba(8015396,5912343,1.4,1.4),B=Ep();v.map=x,v.bumpMap=x,v.bumpScale=.01,b.map=w,b.bumpMap=w,b.bumpScale=.008;const C=n*Sn,d=t*Sn,r=new Ct(C+qt*2,nn,qt),L=new Ct(qt,nn,d),R=new Ct(C+qt*2+hn,hn,qt+hn),M=new Ct(qt+hn,hn,d+hn),y=new P(r,v);y.position.set(0,nn/2,d/2+qt/2),y.castShadow=!0,y.receiveShadow=!0,i.add(y);const N=new P(R,b);N.position.set(0,nn+hn/2,d/2+qt/2),i.add(N);const k=new P(r,v);k.position.set(0,nn/2,-d/2-qt/2),k.castShadow=!0,k.receiveShadow=!0,i.add(k);const G=new P(R,b);G.position.set(0,nn+hn/2,-d/2-qt/2),i.add(G);const h=new P(L,v);h.position.set(-C/2-qt/2,nn/2,0),h.castShadow=!0,h.receiveShadow=!0,i.add(h);const p=new P(M,b);p.position.set(-C/2-qt/2,nn+hn/2,0),i.add(p);const D=new P(L,v);D.position.set(C/2+qt/2,nn/2,0),D.castShadow=!0,D.receiveShadow=!0,i.add(D);const F=new P(M,b);F.position.set(C/2+qt/2,nn+hn/2,0),i.add(F);const q=new ee({color:6636321,roughness:.82,metalness:.05}),Q=new ee({color:9077880,transparent:!0,opacity:.18,roughness:.52,metalness:.55,wireframe:!0}),ne=-d/2-qt*.15,j=1.2,ve=C-.12;for(const Y of[-ve/2,ve/2]){const ue=new P(new tt(.025,.028,j,8),q);ue.position.set(Y,j/2,ne),ue.castShadow=!0,i.add(ue)}for(const Y of[.12,j-.12]){const ue=new P(new tt(.022,.022,ve+.08,8),q);ue.rotation.z=Math.PI/2,ue.position.set(0,Y,ne),ue.castShadow=!0,i.add(ue)}const Z=8,Le=Math.max(5,t+1);for(let Y=0;Y<Z;Y++){const ue=-ve/2+Y/(Z-1)*ve,ye=new P(new tt(.01,.01,j-.18,7),q);ye.position.set(ue,j/2,ne),ye.castShadow=!0,i.add(ye)}for(let Y=0;Y<Le;Y++){const ue=.18+Y/(Le-1)*(j-.36),ye=new P(new tt(.01,.01,ve-.08,7),q);ye.rotation.z=Math.PI/2,ye.position.set(0,ue,ne),ye.castShadow=!0,i.add(ye)}const Ye=[.3,.6,.9];for(const Y of Ye){const ue=new P(new tt(.004,.004,ve+.04,6),new ee({color:8420210,roughness:.6,metalness:.45,transparent:!0,opacity:.58}));ue.rotation.z=Math.PI/2,ue.position.set(0,Y,ne-.01),ue.name="trellis-wire",i.add(ue),g.push(ue)}const Ze=.42,ct=d/2+qt*.55,vt=new P(new an(C-.12,Ze-.08,10,6),Q);vt.position.set(0,Ze/2+.04,ct+.012),i.add(vt),l.push(vt);for(const Y of[-C/2+.06,0,C/2-.06]){const ue=new P(new tt(.02,.022,Ze,7),q);ue.position.set(Y,Ze/2,ct),i.add(ue)}const Qe=new P(new tt(.02,.02,C-.04,7),q);Qe.rotation.z=Math.PI/2,Qe.position.set(0,Ze,ct),i.add(Qe);const lt=.004;for(let Y=1;Y<n;Y++){const ue=(Y-n/2)*Sn,ye=new Ct(lt,.003,d),Te=new P(ye,T);Te.position.set(ue,Si+.001,0),i.add(Te),o.push(Te)}for(let Y=1;Y<t;Y++){const ue=(Y-t/2)*Sn,ye=new Ct(C,.003,lt),Te=new P(ye,T);Te.position.set(0,Si+.001,ue),i.add(Te),o.push(Te)}const $=[];for(let Y=0;Y<t;Y++)for(let ue=0;ue<n;ue++){const ye=Y*n+ue,Te=xp(ye*17+23),Ve=new ee(vp);Ve.map=B,Ve.bumpMap=B,Ve.bumpScale=.012;const S=.02*(Fa(ye*7+42)-.5);Ve.color.offsetHSL(0,0,S);const ke=new P(Te,Ve);ke.rotation.x=-Math.PI/2;const qe=(ue-(n-1)/2)*Sn,De=(Y-(t-1)/2)*Sn,be=(Fa(ye*13+97)-.5)*.008;ke.position.set(qe,Si+be,De),ke.receiveShadow=!0,ke.userData.cellIndex=ye,ke.userData.row=Y,ke.userData.col=ue,i.add(ke),$.push(ke)}for(let Y=0;Y<t;Y++){const ue=(Y-(t-1)/2)*Sn,ye=-C/2-qt-.05,Te=new rt(.035,10,8),Ve=new ee({color:Ga[Y],roughness:.5,emissive:Ga[Y],emissiveIntensity:.3}),Tt=new P(Te,Ve);Tt.position.set(ye,nn*.5,ue),Tt.scale.set(1,.9,1),i.add(Tt),c.push(Tt);const S=document.createElement("canvas");S.width=256,S.height=64;const ke=S.getContext("2d");ke.clearRect(0,0,256,64),ke.fillStyle="rgba(18,12,8,0.76)",typeof ke.roundRect=="function"?(ke.beginPath(),ke.roundRect(0,8,212,48,16),ke.fill()):ke.fillRect(0,8,212,48),ke.strokeStyle="rgba(232,200,74,0.42)",ke.lineWidth=2,typeof ke.roundRect=="function"?(ke.beginPath(),ke.roundRect(1,9,210,46,15),ke.stroke()):ke.strokeRect(1,9,210,46),ke.font="600 28px monospace",ke.fillStyle="#f4ead8",ke.textAlign="left",ke.textBaseline="middle",ke.shadowColor="rgba(0,0,0,0.55)",ke.shadowBlur=6,ke.fillText(Tp(Y,t),14,32);const qe=new $n(S);qe.minFilter=gn;const De=new dr({map:qe,transparent:!0,opacity:.92}),be=new ur(De);be.scale.set(.84,.21,1),be.position.set(ye-.48,nn*.62,ue),i.add(be),a.push(be)}return e?.trackObject(i),{group:i,cellMeshes:$,gridLineMeshes:o,labelSprites:a,labelMarkers:c,guardMeshes:l,trellisWireMeshes:g,cellSize:Sn,soilY:Si,frameHeight:nn,cols:n,rows:t}}const Ha=7029286,Va=4861464,ka=9075290,bp=7172205,za=5981487,ji={spring:[5941845,7191400,4889157],summer:[3836469,4889152,2980392],fall:[13399842,14505267,15641122],winter:[6974058,8026746,5921370]};function Sr(e,n,t=1,i=1){const o=document.createElement("canvas");o.width=e,o.height=e;const a=o.getContext("2d");n(a,e);const c=new $n(o);return c.colorSpace=Qn,c.wrapS=Fn,c.wrapT=Fn,c.repeat.set(t,i),c.needsUpdate=!0,c}function Mi(e,n,t=1,i=1){const o=new He(e),a=new He(n);return Sr(192,(c,l)=>{c.fillStyle=`#${o.getHexString()}`,c.fillRect(0,0,l,l);for(let g=0;g<l;g+=18)c.fillStyle="rgba(255,255,255,0.05)",c.fillRect(g,0,2,l);for(let g=0;g<l;g+=3){const v=.08+(Math.sin(g*.13)*.04+.04);c.strokeStyle=`rgba(${Math.round(a.r*255)}, ${Math.round(a.g*255)}, ${Math.round(a.b*255)}, ${v})`,c.beginPath(),c.moveTo(0,g+Math.sin(g*.09)*4),c.lineTo(l,g-Math.cos(g*.07)*3),c.stroke()}},t,i)}function Ji(e,n,t=1,i=1){const o=new He(e),a=new He(n);return Sr(192,(c,l)=>{c.fillStyle=`#${o.getHexString()}`,c.fillRect(0,0,l,l);for(let g=0;g<1200;g++){const v=g*47%l,b=g*83%l,T=1+g%2,x=.12+g%4*.03;c.fillStyle=`rgba(${Math.round(a.r*255)}, ${Math.round(a.g*255)}, ${Math.round(a.b*255)}, ${x})`,c.beginPath(),c.arc(v,b,T,0,Math.PI*2),c.fill()}},t,i)}function eo(e,n,t=12,i=12,o=.01,a=0){const c=new an(e,n,t,i),l=c.getAttribute("position");for(let g=0;g<l.count;g++){const v=l.getX(g)/e,b=l.getY(g)/n,T=Math.max(0,1-Math.max(Math.abs(v)*1.9,Math.abs(b)*1.9)),x=Math.sin((v+a)*17)*Math.cos((b-a)*13)*.55,w=Math.sin((v-b+a)*11)*.45;l.setZ(g,(x+w)*o*T)}return c.computeVertexNormals(),c}function Ap(e=null){const n=new We,t=[],i=[],o=[],a=[],c=Mi(12174281,8885146,5.5,2.2),l=Mi(15261905,12298639,2.8,2.8),g=Mi(14143680,10849907,3.4,2.2),v=Mi(Ha,Va,2.6,2.6),b=Ji(ka,12694429,3.6,3.6),T=Ji(za,8019258,3.8,1.4),x=Ji(11907234,14867922,2.2,2.2),w=new ee({color:12174281,roughness:.9,side:It,map:c,bumpMap:c,bumpScale:.01}),B=new ee({color:15261905,roughness:.78,map:l,bumpMap:l,bumpScale:.008}),C=new ee({color:14143680,roughness:.88,map:g,bumpMap:g,bumpScale:.008});new ee({color:4868164,roughness:.92});const d=new ee({color:13097183,roughness:.2,metalness:.05}),r=new ee({color:Ha,roughness:.88,map:v,bumpMap:v,bumpScale:.01}),L=new ee({color:Va,roughness:.9,map:v,bumpMap:v,bumpScale:.008}),R=new ee({color:ka,roughness:1,map:b,bumpMap:b,bumpScale:.012});function M(H,{rotX:W=0,rotY:fe=0,rotZ:te=.04,lift:ge=0,speed:Pe=.7,phase:ft=0}={}){return H.userData.breeze={rotX:W,rotY:fe,rotZ:te,lift:ge,speed:Pe,phase:ft,basePositionY:H.position.y,baseRotationX:H.rotation.x,baseRotationY:H.rotation.y,baseRotationZ:H.rotation.z},a.push(H),H}const y=new P(new an(7.8,3.5),w);y.position.set(0,1.75,-6.15),y.receiveShadow=!0,n.add(y);const N=new P(new Ct(7.95,.38,.18),new ee({color:bp,roughness:.94}));N.position.set(0,.19,-6.06),n.add(N);const k=new P(eo(7.3,.95,32,8,.022,.18),new ee({color:za,roughness:.98,map:T,bumpMap:T,bumpScale:.01}));k.rotation.x=-Math.PI/2,k.position.set(.25,.005,-4.95),k.receiveShadow=!0,n.add(k);for(const{x:H,z:W,scale:fe,color:te}of[{x:-1.9,z:-4.86,scale:1.1,color:5406022},{x:-1.15,z:-4.72,scale:.92,color:6457935},{x:.05,z:-4.8,scale:1.08,color:5076034},{x:.96,z:-4.69,scale:.88,color:6194509},{x:1.8,z:-4.88,scale:.98,color:5798217}]){const ge=new P(new rt(.22*fe,12,10),new ee({color:te,roughness:.84}));ge.scale.set(1.2,.85,1),ge.position.set(H,.19*fe,W),M(ge,{rotY:.03,rotZ:.018,lift:.008,speed:.8,phase:H*.35}),n.add(ge),i.push(ge)}for(const{x:H,z:W,color:fe}of[{x:-2.35,z:-4.62,color:12570591},{x:-.72,z:-4.55,color:14078642},{x:1.35,z:-4.56,color:13088472}]){const te=new P(new rt(.09,10,8),new ee({color:fe,roughness:.6}));te.scale.set(1.15,.8,1),te.position.set(H,.34,W),M(te,{rotZ:.05,lift:.012,speed:1.6,phase:H+W}),n.add(te),o.push(te)}for(let H=0;H<11;H++){const W=new P(new Ct(7.4,.045,.02),B);W.position.set(0,.22+H*.29,-6.12),n.add(W)}const G=new P(new Ct(2.15,.12,1.6),C);G.position.set(-2.95,.06,-5.45),G.receiveShadow=!0,n.add(G);const h=new P(new Ct(2.35,.08,1.72),C);h.position.set(-2.95,2.72,-5.42),n.add(h);for(const H of[-3.38,-2.52,-1.72]){const W=new P(new tt(.045,.05,2.58,10),B);W.position.set(H-.4,1.29,-5.38),n.add(W)}const p=new P(new tt(.03,.03,1.82,10),B);p.rotation.z=Math.PI/2,p.position.set(-2.95,.72,-4.7),n.add(p);for(const H of[-3.35,-2.55,-1.75]){const W=new P(new tt(.022,.024,.54,8),B);W.position.set(H,.39,-4.7),n.add(W)}for(const[H,W,fe,te,ge,Pe]of[[-2.95,.12,-4.52,.88,.08,.5],[-2.95,.08,-4.25,.72,.06,.36]]){const ft=new P(new Ct(te,ge,Pe),C);ft.position.set(H,W,fe),ft.receiveShadow=!0,n.add(ft)}const D=new P(new Ct(.82,1.62,.08),B);D.position.set(-2.95,.95,-6.18),n.add(D);const F=new P(new Ct(.92,1.12,.08),B);F.position.set(.25,1.95,-6.18),n.add(F);const q=new P(new Ct(.72,.88,.04),d);q.position.set(.25,1.95,-6.22),n.add(q);for(let H=0;H<10;H++){const W=.42+H%2*.04,fe=new P(new tt(.028,.032,W,8),H%3===0?L:r);fe.position.set(4.95,fe.geometry.parameters.height/2,-.2+H*.36),fe.rotation.y=-.08,n.add(fe)}[{w:5.8,h:1.9,x:0,z:2.05},{w:.95,h:2.9,x:-3.05,z:.85},{w:.95,h:2.9,x:3.05,z:.85},{w:5.8,h:1.15,x:0,z:-1.95}].forEach(({w:H,h:W,x:fe,z:te})=>{const ge=new P(eo(H,W,16,16,.008,fe*.13+te*.07),R);ge.rotation.x=-Math.PI/2,ge.position.set(fe,.006,te),ge.receiveShadow=!0,n.add(ge)});const ne=new ee({color:11705468,roughness:.92});for(let H=0;H<48;H++){const W=new P(new tt(.025+H%3*.012,.025+H%3*.012,.014,6),ne),fe=H%4,te=fe===0?-2.7+H%12*.48:fe===1?-3.18+H%12*.04:fe===2?3.18-H%12*.04:-2.7+H%12*.48,ge=fe===0?1.35+Math.floor(H/12)*.24:fe===1||fe===2?-.45+Math.floor(H/12)*.42:-2.2+Math.floor(H/12)*.12;W.position.set(te,.014,ge),W.rotation.y=H*.37,n.add(W)}const j=new ee({color:5913114,roughness:.9}),ve=[{x:4.8,z:.1,scale:.82},{x:-4.7,z:3.8,scale:.75}];for(const H of ve){const W=new We,fe=new P(new tt(.06*H.scale,.1*H.scale,1.1*H.scale,14),j);fe.position.y=.55*H.scale,fe.castShadow=!0,W.add(fe);const te=new We,ge=[.46,.36,.26],Pe=[.9,1.2,1.42];for(let ft=0;ft<3;ft++){const Ot=new ee({color:ji.spring[ft],roughness:.75}),Rt=new P(new rt(ge[ft]*H.scale,20,16),Ot);Rt.position.y=Pe[ft]*H.scale,Rt.castShadow=!0,te.add(Rt)}W.add(te),M(te,{rotY:.045,rotZ:.03,lift:.02,speed:.45+H.scale*.08,phase:H.x*.4+H.z*.2}),W.position.set(H.x,0,H.z),n.add(W),t.push(te)}const Z=new ee({color:4157234,roughness:.82});for(const[H,W,fe]of[[-4.1,2.6,.9],[4,3.9,.72]]){const te=new P(new rt(.34*fe,18,14),Z);te.scale.set(1.1,.8,1),te.position.set(H,.22*fe,W),M(te,{rotY:.028,rotZ:.016,lift:.008,speed:.72,phase:W*.3}),n.add(te)}const Le=new We,Ye=new P(new tt(.06,.08,.12,8),new ee({color:4885098,roughness:.6,metalness:.2}));Ye.position.y=.06,Le.add(Ye);const Ze=new P(new tt(.01,.025,.1,8),new ee({color:4885098,roughness:.6,metalness:.2}));Ze.position.set(.06,.1,0),Ze.rotation.z=-.6,Le.add(Ze),Le.position.set(2.78,0,.84),Le.rotation.y=-.62,n.add(Le);const ct=new ee({color:2779706,roughness:.7}),vt=new We;for(let H=0;H<12;H++){const W=H/12*Math.PI*2.5,fe=.15+H*.008,te=new P(new rt(.015,6,5),ct);te.position.set(Math.cos(W)*fe,.02,Math.sin(W)*fe),vt.add(te)}vt.position.set(-2.78,0,.95),n.add(vt);const Qe=new ee({color:12038560,roughness:.92}),lt=new ee({color:6982540,roughness:.8});for(const[H,W,fe]of[[1.42,1.72,.35],[1.66,1.6,-.28]]){const te=new P(new Gt(.026,.11,5,10),Qe);te.position.set(H,.02,W),te.rotation.y=fe,te.rotation.z=Math.PI/2,te.scale.set(1,.48,.72),n.add(te);const ge=new P(new tt(.022,.028,.06,10),lt);ge.position.set(H-.08,.02,W),ge.rotation.y=fe,ge.rotation.z=Math.PI/2,ge.scale.set(1,.85,.95),n.add(ge)}const $=new ee({color:9068594,roughness:.88}),Y=new P(new tt(.16,.18,.16,24),$);Y.scale.set(1.28,1,.92),Y.position.set(2.54,.08,1.58),n.add(Y);const ue=new P(new fa(.17,.012,6,18),$);ue.position.set(2.54,.16,1.58),ue.rotation.x=Math.PI/2,ue.scale.set(1.28,1,.92),n.add(ue);const ye=new P(new fa(.14,.015,5,18,Math.PI),$);ye.position.set(2.54,.19,1.58),ye.rotation.z=Math.PI,n.add(ye);const Te=new ee({color:13916723,roughness:.55}),Ve=new ee({color:4885066,roughness:.7});for(const[H,W,fe,te]of[[2.45,.16,1.54,Te],[2.56,.17,1.6,Ve],[2.64,.16,1.5,Te]]){const ge=new P(new rt(.04,10,8),te);ge.position.set(H,W,fe),n.add(ge)}const Tt=new ee({color:12632256,roughness:.5,metalness:.6}),S=new P(new tt(.06,.06,.08,8),Tt);S.rotation.x=Math.PI/2,S.position.set(1.1,.8,-4.68),n.add(S);const ke=new ee({color:11053224,roughness:.7}),qe=new P(new tt(.032,.036,2.4,10),ke);qe.scale.set(1,1,.62),qe.position.set(3.4,1.2,-4.68),n.add(qe);const De=new ee({color:3956550,roughness:.76}),be=new P(new tt(.18,.2,.7,18),De);be.position.set(3.03,.35,-4.78),be.castShadow=!0,n.add(be);const St=new P(new tt(.18,.18,.03,18),B);St.position.set(3.03,.72,-4.78),n.add(St);const Ne=new ee({color:11907234,roughness:.95,map:x,bumpMap:x,bumpScale:.007}),nt=new P(eo(4.2,3,18,14,.004,.34),Ne);nt.rotation.x=-Math.PI/2,nt.position.set(0,.003,0),nt.receiveShadow=!0,n.add(nt);const yt=new ee({color:3815994,roughness:.7}),wt=new We,_=new P(new tt(.035,.04,.03,10),yt);_.rotation.x=Math.PI/2,wt.add(_);const s=new P(new Yn(.045,.08,10,1,!0),yt);s.rotation.x=Math.PI/2,s.position.z=.045,wt.add(s);const V=new P(new rt(.022,10,8),new ee({color:16312514,emissive:16769442,emissiveIntensity:.18,roughness:.25}));V.position.z=.035,wt.add(V),wt.position.set(-2.55,2,-4.7),n.add(wt);const J=new Tc(16773332,.3,3);J.position.set(-2.55,1.88,-4.6),n.add(J);const de=new ee({color:12873788,roughness:.85}),K=[{rTop:.1,rBot:.1,h:.08,yOff:.04},{rTop:.08,rBot:.08,h:.07,yOff:.08+.035},{rTop:.06,rBot:.06,h:.06,yOff:.08+.07+.03}];for(const H of K){const W=new P(new tt(H.rTop,H.rBot,H.h,10),de);W.position.set(2.86,H.yOff,2.12),n.add(W)}const Oe=new P(new tt(.08,.08,.07,10),de);Oe.rotation.z=Math.PI/2,Oe.position.set(2.55,.04,2.26),n.add(Oe);const Ee=new ee({color:10123858,roughness:.9}),Ue=new P(new Ct(.22,.06,.14),Ee);Ue.position.set(-2.35,.03,1.78),n.add(Ue);const ze=[14703147,15387691,4889152,5929663];for(let H=0;H<4;H++){const W=new ee({color:ze[H],roughness:.7}),fe=new P(new Ct(.03,.06,.02),W);fe.position.set(-2.35+(H-1.5)*.045,.09,1.78),n.add(fe)}const oe=new ee({color:5933642,roughness:.95}),Se=new P(new Gt(.06,.16,5,10),oe);Se.position.set(.72,.01,2.08),Se.rotation.y=.22,Se.rotation.z=Math.PI/2,Se.scale.set(1,.15,.72),n.add(Se);const Xe=new We,Fe=new ee({color:9075290,roughness:.85});for(const[H,W,fe,te]of[[.06,1.5,-.32,0],[.06,1.5,.32,0],[.7,.06,0,.72],[.7,.06,0,-.72]]){const ge=W>H,Pe=new P(ge?new tt(.026,.03,W,8):new tt(.026,.026,H,8),Fe);ge||(Pe.rotation.z=Math.PI/2),Pe.position.set(fe,te,0),Xe.add(Pe)}const xe=new P(new Ct(.58,.3,.028),Fe);xe.position.set(0,-.58,.003),Xe.add(xe);const et=new P(new an(.56,1.12),new ee({color:5923160,transparent:!0,opacity:.24,side:It}));et.position.set(0,.04,.018),Xe.add(et),Xe.position.set(-2.55,.85,-4.1),Xe.rotation.y=-.12,n.add(Xe);const A=new P(new Gt(.022,.04,4,8),new ee({color:3811866,roughness:.88}));A.rotation.z=Math.PI/2,A.scale.set(1,.86,.82),A.position.set(-2,.22,-3.5),n.add(A);const _e=new P(new tt(.005,.005,.1,6),new ee({color:8947848,roughness:.5,metalness:.4}));_e.position.set(-2,.3,-3.5),n.add(_e);const Me=new We;{const H=new We,W=new ee({color:8014378,roughness:.8}),fe=new ee({color:14265684,roughness:.65}),te=new P(new Gt(.018,.034,5,10),W);te.rotation.z=Math.PI/2,te.scale.set(1.15,.95,.9),H.add(te);const ge=new P(new rt(.019,8,7),W);ge.position.set(.03,.018,0),H.add(ge);const Pe=new P(new Yn(.007,.02,6),fe);Pe.rotation.z=-Math.PI/2,Pe.position.set(.052,.016,0),H.add(Pe);const ft=new P(new tt(.003,.01,.026,6),W);ft.rotation.z=1.18,ft.position.set(-.03,.004,0),H.add(ft),H.position.set(4.98,.5,.18),Me.add(H)}n.add(Me);const Ae=new We;{const H=[13399842,14500898,9132586];for(let W=0;W<15;W++){const fe=.02+Math.abs(Math.sin(W*2.7))*.02,te=new ee({color:H[W%3],roughness:.9,side:It}),ge=new P(new un(fe,10),te);ge.rotation.x=-Math.PI/2,ge.position.set(-1.5+Math.sin(W*1.7)*2,.008,-.5+Math.cos(W*2.3)*2),ge.rotation.z=W*.8,Ae.add(ge)}}Ae.visible=!1,n.add(Ae);const me=new We;{const H=new ee({color:15791359,roughness:.85}),W=[.5,.3,.7,.4,.6,.35,.8,.45];[[-1.2,1.8],[.6,2.4],[-2,.5],[1.5,1.2],[-.4,3],[2.2,.8],[-1.8,2.8],[.2,.3]].forEach(([Ot,Rt],sn)=>{const En=W[sn],pn=new P(new an(En,En),H);pn.rotation.x=-Math.PI/2,pn.position.set(Ot,.01,Rt),me.add(pn)});const te=new ee({color:15791359,emissive:14544639,emissiveIntensity:.2,roughness:.85}),ge=4*.5/2,Pe=4*.5/2,ft=.16;for(const[Ot,Rt,sn,En]of[[ge*2+.1,.04,0,Pe+.03],[ge*2+.1,.04,0,-1.03],[.04,Pe*2,-1.03,0],[.04,Pe*2,ge+.03,0]]){const pn=new P(new Ct(Ot,.006,Rt),te);pn.position.set(sn,ft,En),me.add(pn)}}me.visible=!1,n.add(me);const ae=new We;{const H=[16772676,11163084,16777215,16746683,16763938];for(let W=0;W<20;W++){const fe=new ee({color:H[W%H.length],roughness:.6}),te=new P(new rt(.01,8,6),fe);te.position.set(-3.5+Math.sin(W*3.1)*3.5,.01,2.5+Math.cos(W*2.1)*2),M(te,{rotZ:.08,lift:.01,speed:1.9+W%4*.07,phase:W*.42}),ae.add(te),o.push(te)}}ae.visible=!1,n.add(ae);const Ie=new We;{const H=new ee({color:6965802,roughness:.9}),W=new P(new Ct(.12,.01,.08),H);W.position.set(-2.3,.2,-3.4),Ie.add(W);const fe=new ee({color:9071178,roughness:.85}),te=new P(new Ct(.12,.003,.08),fe);te.position.set(-2.3,.205,-3.4),Ie.add(te)}{const H=new ee({color:8956552,transparent:!0,opacity:.45,roughness:.2,metalness:.05}),W=new P(new tt(.025,.025,.06,8),H);W.position.set(-2.2,.15,-3.35),Ie.add(W)}Ie.visible=!0,n.add(Ie);{const H=new da;H.moveTo(0,0),H.lineTo(.15,.04),H.lineTo(0,.08),H.closePath();const W=new ua(H),fe=new ee({color:15210536,roughness:.7,side:It}),te=new P(W,fe);te.position.set(4.98,.56,1.18),te.rotation.y=-Math.PI/2,n.add(te)}const je=new We;{const H=[14703147,15387691,4889152,5929663];for(let W=0;W<4;W++){const fe=new ee({color:H[W],roughness:.7}),te=new P(new an(.04,.06),fe);te.rotation.x=-Math.PI/2,te.position.set(-.8+W*.12,.008,2.2+W%2*.08),te.rotation.z=(W-1.5)*.15,je.add(te)}}je.visible=!1,n.add(je);{const H=new ee({color:3811866,roughness:.92}),W=new P(new tt(.06,.06,3,8),H);W.position.set(7.8,1.5,-5.4),n.add(W);const fe=new P(new tt(.02,.024,.6,8),H);fe.rotation.z=Math.PI/2,fe.position.set(7.8,3,-5.4),n.add(fe);const te=new ee({color:2236962,roughness:.5}),ge=new P(new tt(.003,.003,2.4,6),te);ge.rotation.z=Math.PI/2,ge.position.set(9,2.98,-5.4),n.add(ge)}{const H=new ee({color:3816010,roughness:.95});[{w:2,h:1.2,d:1.5,x:8.8,y:.6,z:-8.3},{w:1.5,h:1.8,d:1.2,x:10.9,y:.9,z:-7.9},{w:1.8,h:1,d:1.4,x:12.4,y:.5,z:-9.1}].forEach(({w:fe,h:te,d:ge,x:Pe,y:ft,z:Ot})=>{const Rt=new P(new Ct(fe,te,ge),H);Rt.position.set(Pe,ft,Ot),n.add(Rt)})}const mt=[];{const H=new ee({color:16777215,transparent:!0,opacity:.55,roughness:1});[{x:-4,y:12,z:-6,sx:2.5,sy:.6,sz:1.2},{x:3,y:14,z:-8,sx:3,sy:.5,sz:1.5},{x:-1,y:13,z:-10,sx:2,sy:.4,sz:1},{x:6,y:15,z:-5,sx:2.2,sy:.55,sz:1.3}].forEach(({x:fe,y:te,z:ge,sx:Pe,sy:ft,sz:Ot})=>{const Rt=new P(new rt(.5,20,16),H.clone());Rt.scale.set(Pe,ft,Ot),Rt.position.set(fe,te,ge),n.add(Rt),mt.push({mesh:Rt,baseX:fe,speed:.08+Math.abs(Math.sin(fe))*.04})})}const st=new We;let _t;{const W=new Float32Array(90);for(let Pe=0;Pe<30;Pe++)W[Pe*3]=-3+Math.sin(Pe*2.1)*4,W[Pe*3+1]=.3+Math.abs(Math.sin(Pe*1.3))*1.5,W[Pe*3+2]=-2+Math.cos(Pe*1.7)*4;_t=W;const fe=new Kn;fe.setAttribute("position",new An(W,3));const te=new Di({color:16772710,size:.015,transparent:!0,opacity:.8,sizeAttenuation:!0}),ge=new Ii(fe,te);st.add(ge)}st.visible=!1,n.add(st);const zt=new We;{const H=new ee({color:8952234,metalness:.25,roughness:.15,transparent:!0,opacity:.22});[{r:.12,x:-1,z:1.8},{r:.08,x:1.2,z:2.2},{r:.18,x:0,z:3.2},{r:.1,x:-2,z:.6}].forEach(({r:fe,x:te,z:ge})=>{const Pe=new P(new un(fe,16),H.clone());Pe.rotation.x=-Math.PI/2,Pe.position.set(te,.009,ge),zt.add(Pe)})}zt.visible=!1,n.add(zt);{const H=new ee({color:2763306,roughness:.85}),W=new We,fe=new P(new Gt(.026,.05,5,10),H);fe.rotation.z=Math.PI/2,fe.scale.set(1,.9,.78),W.add(fe);const te=new P(new rt(.03,8,7),H);te.position.set(.05,.022,0),W.add(te);for(const Pe of[-.01,.01]){const ft=new P(new Yn(.01,.02,6),H);ft.position.set(.05+Pe,.055,0),W.add(ft)}const ge=new P(new tt(.008,.005,.1,8),H);ge.rotation.z=-.8,ge.position.set(-.07,.03,0),W.add(ge),W.position.set(5.02,.55,2),Me.add(W)}const rn=new We;let Ft;{const W=new Float32Array(60);for(let Pe=0;Pe<20;Pe++)W[Pe*3]=4.7+Math.sin(Pe*1.5)*.1,W[Pe*3+1]=2.5+Pe*.08,W[Pe*3+2]=-2.1+Math.cos(Pe*1.3)*.1;Ft=W;const fe=new Kn;fe.setAttribute("position",new An(W,3));const te=new Di({color:11184810,size:.015,transparent:!0,opacity:.45,sizeAttenuation:!0}),ge=new Ii(fe,te);rn.add(ge)}rn.visible=!1,n.add(rn);const Bt=new We;{const H=new ee({color:8947848,roughness:.6,metalness:.3}),W=new P(new tt(.01,.01,.3,6),H);W.position.y=.15,Bt.add(W);const fe=new da;fe.moveTo(0,0),fe.lineTo(.06,.02),fe.lineTo(0,.04),fe.closePath();const te=new ua(fe),ge=new ee({color:15623731,roughness:.7,side:It}),Pe=new P(te,ge);Pe.position.set(.01,.25,0),M(Pe,{rotZ:.22,speed:2.5,phase:1.1}),Bt.add(Pe),Bt._flag=Pe}return Bt.position.set(4.95,.5,1),n.add(Bt),e?.trackObject(n),{group:n,updateSeason(H){const W=ji[H]||ji.spring;for(const ft of t)ft.children.forEach((Ot,Rt)=>{Ot.material.color.set(W[Rt]||W[0])});Ae.visible=H==="fall",me.visible=H==="winter",rn.visible=H==="winter",ae.visible=H==="spring",Me.visible=H!=="winter";const fe={spring:[6262093,7511395,7251850],summer:[4355387,5081153,6197079],fall:[8219190,9198130,10448700],winter:[8094344,9410722,10990267]},te={spring:[14477039,15984304,14207216],summer:[16767326,16037230,15921369],fall:[13208116,10312756,12095058],winter:[13489887,14476783,11977423]},ge=fe[H]||fe.spring;i.forEach((ft,Ot)=>{ft.material.color.setHex(ge[Ot%ge.length])});const Pe=te[H]||te.spring;if(o.forEach((ft,Ot)=>{ft.material.color.setHex(Pe[Ot%Pe.length])}),Bt._flag){const ft={spring:.3,summer:.1,fall:.6,winter:.8};Bt._flag.rotation.y=ft[H]||.2,Bt._flag.userData.breeze&&(Bt._flag.userData.breeze.baseRotationY=Bt._flag.rotation.y)}},updateBreeze(H,W=1){for(const fe of a){const te=fe.userData?.breeze;if(!te)continue;const ge=Math.sin(H*te.speed+te.phase),Pe=Math.cos(H*te.speed*1.7+te.phase*.6);fe.position.y=te.basePositionY+Math.max(0,ge)*te.lift*W,fe.rotation.x=te.baseRotationX+Pe*te.rotX*W,fe.rotation.y=te.baseRotationY+Pe*te.rotY*W,fe.rotation.z=te.baseRotationZ+ge*te.rotZ*W}},updateClouds(H){for(const W of mt)W.mesh.position.x=W.baseX+Math.sin(performance.now()*1e-4*W.speed)*3},updateSmoke(H){if(!rn.visible)return;const W=rn.children[0];if(!W||!Ft)return;const fe=W.geometry.getAttribute("position");for(let te=0;te<fe.count;te++)Ft[te*3+1]+=H*.12,Ft[te*3]+=Math.sin(performance.now()*.001+te)*H*.02,Ft[te*3+1]>4.5&&(Ft[te*3]=4.7+Math.sin(te*1.5)*.1,Ft[te*3+1]=2.5,Ft[te*3+2]=-2.1+Math.cos(te*1.3)*.1);fe.needsUpdate=!0},updateFireflies(H){if(!st.visible)return;const W=st.children[0];if(!W||!_t)return;const fe=W.geometry.getAttribute("position"),te=performance.now()*.001;for(let ge=0;ge<fe.count;ge++)_t[ge*3]+=Math.sin(te*.5+ge*.7)*H*.15,_t[ge*3+1]+=Math.cos(te*.3+ge*1.1)*H*.08,_t[ge*3+2]+=Math.sin(te*.4+ge*.9)*H*.12,Math.abs(_t[ge*3])>5&&(_t[ge*3]*=.95),(_t[ge*3+1]>2.5||_t[ge*3+1]<.1)&&(_t[ge*3+1]=.3+Math.abs(Math.sin(ge*1.3))*1.5),Math.abs(_t[ge*3+2])>5&&(_t[ge*3+2]*=.95);fe.needsUpdate=!0,W.material.opacity=.5+Math.sin(te*2)*.3},showPlanningProps(H){je.visible=H},showNarrativeProps(H,W){Ie.visible=H>=2||W&&W.length>0},showFireflies(H){st.visible=H},showPuddles(H){zt.visible=H}}}const Rp={PLANNING:"planner",INSPECT:"planner",TRANSITION:"story",EARLY_SEASON:"story",MID_SEASON:"story",LATE_SEASON:"story",HARVEST:"celebration",CUTSCENE:"story",GRADE:"celebration",CELEBRATION:"celebration"},Wa={planner:{toneMapping:ci,toneMappingExposure:1.08,shadowsEnabled:!0,fogDensityMultiplier:.32,backgroundColor:new He(14209990),skyTint:new He(15920870),hemiSkyTint:new He(15328216),hemiGroundTint:new He(6972506),hemiIntensityMultiplier:1.06,sunIntensityMultiplier:.58,fillIntensityMultiplier:.44,rimIntensityMultiplier:.22,material:{roughness:.92,metalness:0,envMapIntensity:0,saturation:.82,lightness:1.02,flatShading:!1}},story:{toneMapping:ci,toneMappingExposure:1.24,shadowsEnabled:!0,fogDensityMultiplier:.92,backgroundColor:null,skyTint:new He(16777215),hemiSkyTint:null,hemiGroundTint:null,hemiIntensityMultiplier:1.08,sunIntensityMultiplier:1.03,fillIntensityMultiplier:1.14,rimIntensityMultiplier:1.08,material:{roughness:null,metalness:null,envMapIntensity:null,saturation:1,lightness:1,flatShading:!1}},celebration:{toneMapping:ci,toneMappingExposure:1.25,shadowsEnabled:!0,fogDensityMultiplier:.78,backgroundColor:null,skyTint:new He(16773583),hemiSkyTint:new He(16774102),hemiGroundTint:null,hemiIntensityMultiplier:1.08,sunIntensityMultiplier:1.18,fillIntensityMultiplier:1.14,rimIntensityMultiplier:1.08,material:{roughness:null,metalness:null,envMapIntensity:null,saturation:1.08,lightness:1.03,flatShading:!1}}},Ei={h:0,s:0,l:0};function Xa(e){return Math.min(1,Math.max(0,e))}function Ya(e,n){if(!e||!e.isMaterial)return;e.userData.__sceneStyleBase||(e.userData.__sceneStyleBase={color:e.color?.clone?.()??null,roughness:e.roughness,metalness:e.metalness,envMapIntensity:e.envMapIntensity,flatShading:e.flatShading??!1});const t=e.userData.__sceneStyleBase;e.color&&t.color&&(e.color.copy(t.color),e.color.getHSL(Ei),e.color.setHSL(Ei.h,Xa(Ei.s*n.saturation),Xa(Ei.l*n.lightness))),t.roughness!==void 0&&n.roughness!==null?e.roughness=n.roughness:t.roughness!==void 0&&(e.roughness=t.roughness),t.metalness!==void 0&&n.metalness!==null?e.metalness=n.metalness:t.metalness!==void 0&&(e.metalness=t.metalness),t.envMapIntensity!==void 0&&n.envMapIntensity!==null?e.envMapIntensity=n.envMapIntensity:t.envMapIntensity!==void 0&&(e.envMapIntensity=t.envMapIntensity),"flatShading"in e&&(e.flatShading=n.flatShading),e.needsUpdate=!0}function go(e,n){if(e){if(e instanceof Map){for(const t of e.values())go(t,n);return}if(Array.isArray(e)){e.forEach(t=>go(t,n));return}if(e.isMesh){(Array.isArray(e.material)?e.material:[e.material]).forEach(i=>Ya(i,n));return}e.traverse&&e.traverse(t=>{if(!t.isMesh)return;(Array.isArray(t.material)?t.material:[t.material]).forEach(o=>Ya(o,n))})}}function xi(e){return Rp[String(e||"").toUpperCase()]||"story"}function Cp(e,n){const t=Wa[e]||Wa.story,{renderer:i,scene:o,skyMat:a,hemi:c,sun:l,fill:g,rim:v,lightingState:b,materialTargets:T=[]}=n;i&&(i.toneMapping=t.toneMapping,i.toneMappingExposure=t.toneMappingExposure,i.shadowMap.enabled=t.shadowsEnabled,i.shadowMap.needsUpdate=!0),o&&b?.background&&(t.backgroundColor?o.background.copy(t.backgroundColor):o.background.copy(b.background)),o?.fog&&b&&(o.fog.color.copy(b.fogColor),o.fog.density=b.fogDensity*t.fogDensityMultiplier),a?.color&&a.color.copy(t.skyTint),c&&b&&(c.color.copy(t.hemiSkyTint??b.hemiSky),c.groundColor.copy(t.hemiGroundTint??b.hemiGround),c.intensity=b.hemiIntensity*t.hemiIntensityMultiplier),l&&b&&(l.color.copy(b.sunColor),l.position.copy(b.sunPosition),l.intensity=b.sunIntensity*t.sunIntensityMultiplier,l.castShadow=t.shadowsEnabled),g&&b&&(g.color.copy(b.fillColor),g.position.copy(b.fillPosition),g.intensity=b.fillIntensity*t.fillIntensityMultiplier),v&&b&&(v.color.copy(b.rimColor),v.position.copy(b.rimPosition),v.intensity=b.rimIntensity*t.rimIntensityMultiplier),T.forEach(x=>go(x,t.material))}const ni=[{time:0,sunColor:16757606,sunIntensity:.6,hemiSky:16766115,hemiGround:5914144,ambient:.4},{time:.25,sunColor:16777200,sunIntensity:1,hemiSky:8900331,hemiGround:9419919,ambient:.6},{time:.5,sunColor:16744272,sunIntensity:.5,hemiSky:13468991,hemiGround:4073251,ambient:.35},{time:.75,sunColor:4286945,sunIntensity:.15,hemiSky:1710654,hemiGround:855322,ambient:.15},{time:1,sunColor:16757606,sunIntensity:.6,hemiSky:16766115,hemiGround:5914144,ambient:.4}];function yp(e){return e*e*(3-2*e)}function to(e,n,t){return new He(e).lerp(new He(n),t)}function Pp(e){for(let n=0;n<ni.length-1;n++){const t=ni[n],i=ni[n+1];if(e>=t.time&&e<=i.time)return[t,i]}return[ni[0],ni[1]]}class Dp{constructor(n,t={}){this.scene=n,this.cycleDurationMs=t.cycleDurationMs??3e5,this.enabled=!!t.enabled,this.timeOfDay=0,this.currentSeason="spring",this.baseFogDensity=n.fog?.density??.02,this.moonLight=new Ai(11058175,0),this.moonLight.position.set(-2,5,-3),this.stars=this.createStars(),n.add(this.moonLight,this.stars),this.enabled&&this.apply()}createStars(){const n=new Kn,t=new Float32Array(90);for(let a=0;a<t.length;a+=3)t[a]=(Math.random()-.5)*20,t[a+1]=5+Math.random()*4,t[a+2]=(Math.random()-.5)*20;n.setAttribute("position",new An(t,3));const i=new Di({color:16777215,size:.06,transparent:!0,opacity:0,depthWrite:!1}),o=new Ii(n,i);return o.visible=!1,o}setEnabled(n){this.enabled=!!n,this.enabled||(this.stars.visible=!1,this.stars.material.opacity=0,this.moonLight.intensity=0)}setSeason(n){this.currentSeason=n??this.currentSeason}setTimeOfDay(n){this.timeOfDay=Math.max(0,Math.min(1,n)),this.apply()}getTimeOfDay(){return this.timeOfDay}setCycleDuration(n){this.cycleDurationMs=Math.max(1e3,n??this.cycleDurationMs)}update(n){this.enabled&&(this.timeOfDay=(this.timeOfDay+n*1e3/this.cycleDurationMs)%1,this.apply())}apply(){const n=this.scene.userData.lightingRig??{};if(!n.sun||!n.hemi)return;const[t,i]=Pp(this.timeOfDay),o=yp((this.timeOfDay-t.time)/Math.max(i.time-t.time,1e-4)),a=to(t.sunColor,i.sunColor,o),c=to(t.hemiSky,i.hemiSky,o),l=to(t.hemiGround,i.hemiGround,o),g=t.sunIntensity+(i.sunIntensity-t.sunIntensity)*o,v=t.ambient+(i.ambient-t.ambient)*o;n.sun.color.copy(a),n.sun.intensity=g,n.sun.position.set(Math.cos(this.timeOfDay*Math.PI*2)*5,Math.max(.5,Math.sin(this.timeOfDay*Math.PI*2)*5+4),Math.sin(this.timeOfDay*Math.PI*2)*4),n.hemi.color.copy(c),n.hemi.groundColor.copy(l),n.hemi.intensity=v,n.fill&&(n.fill.intensity=v*.8),n.rim&&(n.rim.intensity=v*.35),this.scene.fog&&(this.scene.fog.color.copy(c),this.scene.fog.density=this.baseFogDensity*(this.timeOfDay>=.75?.6:1));const b=this.timeOfDay>=.75&&this.timeOfDay<=.95;this.stars.visible=b,this.stars.material.opacity=b?.75:0,this.moonLight.intensity=b?.25:0,this.scene.userData.weatherFx?.[this.timeOfDay>=.2&&this.timeOfDay<=.3?"startSunRays":"stopSunRays"]?.(1.2),this.scene.userData.scenery?.showFireflies?.(this.currentSeason==="summer"&&this.timeOfDay>=.6&&this.timeOfDay<=.8)}dispose(){this.scene.remove(this.moonLight,this.stars),this.stars.geometry.dispose(),this.stars.material.dispose()}}function Ip(e,n=null){const i=new Kn,o=new Float32Array(300*3),a=new Float32Array(300),c=8,l=6;for(let L=0;L<300;L++)o[L*3]=(Math.random()-.5)*c,o[L*3+1]=Math.random()*l,o[L*3+2]=(Math.random()-.5)*c,a[L]=3+Math.random()*2;i.setAttribute("position",new An(o,3));const g=new Di({color:9088460,size:.03,transparent:!0,opacity:.6,depthWrite:!1}),v=new Ii(i,g);v.visible=!1,e.add(v),n?.trackObject(v);const b=new an(10,10),T=new wn({color:16777215,transparent:!0,opacity:0,depthWrite:!1,side:It}),x=new P(b,T);x.rotation.x=-Math.PI/2,x.position.y=.3,x.visible=!1,e.add(x),n?.trackObject(x);const w=new wc(16769184,0,20,Math.PI/6,.5,1);w.position.set(2,8,-1),w.target.position.set(0,0,0),w.visible=!1,e.add(w),e.add(w.target);let B=new Set,C=0,d=0,r=0;return{startRain(L=1){B.add("rain"),C=L,v.visible=!0},stopRain(){B.delete("rain"),C=0,v.visible=!1},startFrost(L=.25){B.add("frost"),d=L,x.visible=!0},stopFrost(){B.delete("frost"),d=0,x.visible=!1,T.opacity=0},startSunRays(L=2){B.add("sun"),r=L,w.visible=!0},stopSunRays(){B.delete("sun"),r=0,w.visible=!1,w.intensity=0},stopAll(){this.stopRain(),this.stopFrost(),this.stopSunRays()},update(L){if(B.has("rain")){const R=i.attributes.position.array;for(let M=0;M<300;M++)R[M*3+1]-=a[M]*L*C,R[M*3+1]<-.1&&(R[M*3]=(Math.random()-.5)*c,R[M*3+1]=l,R[M*3+2]=(Math.random()-.5)*c),R[M*3]+=(Math.random()-.5)*.005;i.attributes.position.needsUpdate=!0}B.has("frost")&&(T.opacity=Math.min(T.opacity+L*.3,d)),B.has("sun")&&(w.intensity=r*(.8+Math.sin(Date.now()*.001)*.2))},triggerForEvent(L,R){if(this.stopAll(),!L){R==="spring"&&this.startRain(.5),R==="winter"&&this.startFrost(.15),R==="summer"&&this.startSunRays(1.5);return}const M=(L.title||"").toLowerCase(),y=(L.description||"").toLowerCase();(M.includes("rain")||M.includes("shower")||y.includes("rain"))&&this.startRain(1.2),(M.includes("frost")||M.includes("cold")||M.includes("freeze"))&&this.startFrost(.3),(M.includes("heat")||M.includes("sun")||y.includes("sun beats"))&&this.startSunRays(2.5),(M.includes("wind")||y.includes("wind"))&&this.startRain(.3)},dispose(){this.stopAll(),e.remove(v),e.remove(x),e.remove(w),e.remove(w.target)},get active(){return B}}}const Lp={overview:{position:[0,3.45,5.35],target:[0,.44,-.18]},closeup:{position:[0,2.15,3.55],target:[0,.36,-.16]},side:{position:[3.7,2.65,3.5],target:[.15,.4,-.14]},birds:{position:[0,6.5,2.2],target:[0,.1,-.15]}};function Up(e,n){const t=new at(0,.44,-.18),i=new at(0,.44,-.18),o=[];let a=!1,c=0,l=0,g=0,v=1.08,b=6.55,T=null,x=.1,w=.12,B=!1;function C(){e.position.set(t.x+b*Math.sin(v)*Math.sin(g),t.y+b*Math.cos(v),t.z+b*Math.sin(v)*Math.cos(g)),e.lookAt(t)}function d(G,h,p){n.addEventListener(G,h,p),o.push(()=>n.removeEventListener(G,h,p))}d("pointerdown",G=>{if(G.pointerType==="touch"&&G.isPrimary){if(G.clientX<window.innerWidth*.4)return;a=!0,c=G.clientX,l=G.clientY}else G.pointerType==="mouse"&&G.button===0&&(a=!0,c=G.clientX,l=G.clientY)}),d("pointermove",G=>{if(!a)return;const h=G.clientX-c,p=G.clientY-l;c=G.clientX,l=G.clientY,g-=h*.005,v=Math.max(.48,Math.min(1.34,v-p*.005)),T=null,C()});const R=()=>{a=!1};d("pointerup",R),d("pointercancel",R);let M=0;return d("touchstart",G=>{if(G.touches.length===2){const h=G.touches[0].clientX-G.touches[1].clientX,p=G.touches[0].clientY-G.touches[1].clientY;M=Math.sqrt(h*h+p*p)}},{passive:!0}),d("touchmove",G=>{if(G.touches.length===2){const h=G.touches[0].clientX-G.touches[1].clientX,p=G.touches[0].clientY-G.touches[1].clientY,D=Math.sqrt(h*h+p*p),F=M-D;b=Math.max(4.4,Math.min(11.5,b+F*.02)),M=D,T=null,C()}},{passive:!0}),d("wheel",G=>{G.preventDefault(),b=Math.max(4.4,Math.min(11.5,b+G.deltaY*.01)),T=null,C()},{passive:!1}),C(),{setPose(G){const h=Lp[G];h&&(T={position:new at(...h.position),target:new at(...h.target)})},setFollowTarget(G,h={}){G&&(i.copy(G),typeof h.strength=="number"&&(w=h.strength),B=h.enabled??!0)},clearFollowTarget(){B=!1},update(){T?(e.position.lerp(T.position,x),t.lerp(T.target,x),e.lookAt(t),e.position.distanceTo(T.position)<.01&&(T=null)):B&&(t.lerp(i,w),C())},applyOrbitDelta(G,h){g-=G,v=Math.max(.48,Math.min(1.34,v-h)),T=null,C()},getTarget(){return t},dispose(){o.forEach(G=>G()),o.length=0,a=!1}}}function Np(e=null){const n=new We;n.name="player-character";const t=new P(new un(.22,18),new wn({color:0,transparent:!0,opacity:.18,depthWrite:!1}));t.rotation.x=-Math.PI/2,t.position.y=.01,n.add(t);const i=new We;i.position.y=.02,n.add(i);const o=new ee({color:14200972,roughness:.82}),a=new ee({color:7163187,roughness:.88}),c=new ee({color:8362594,roughness:.78}),l=new ee({color:13217906,roughness:.92}),g=new ee({color:4873078,roughness:.84}),v=new ee({color:3680285,roughness:.92}),b=new ee({color:3877920,roughness:.9}),T=new We;T.position.y=.38,i.add(T);const x=new P(new Gt(.07,.14,7,12),c);x.scale.set(1.2,1.02,.82),x.position.y=.14,x.castShadow=!0,T.add(x);const w=new P(new tt(.085,.1,.16,14,1,!0),l);w.position.set(0,.09,.065),w.rotation.y=Math.PI/2,w.rotation.z=Math.PI/2,w.scale.set(1,1,.36),w.castShadow=!0,T.add(w);const B=new We;B.position.y=.31,T.add(B);const C=new P(new rt(.085,20,16),o);C.castShadow=!0,B.add(C);const d=new P(new rt(.088,18,14),b);d.scale.set(1.02,.72,1.02),d.position.y=.016,d.castShadow=!0,B.add(d);const r=new P(new tt(.12,.12,.015,28),a);r.position.y=.065,r.castShadow=!0,B.add(r);const L=new P(new tt(.08,.09,.09,24),a);L.position.y=.11,L.castShadow=!0,B.add(L);const R=[];for(const F of[-1,1]){const q=new We;q.position.set(F*.13,.22,0),T.add(q);const Q=new P(new Gt(.026,.1,5,10),c);Q.position.y=-.085,Q.castShadow=!0,q.add(Q);const ne=new P(new rt(.032,10,8),o);ne.position.y=-.18,ne.castShadow=!0,q.add(ne),R.push(q)}const M=new We;M.position.set(.015,-.165,.035),R[1].add(M);const y={water:new P(new tt(.018,.026,.16,8),new ee({color:5148616,roughness:.52})),plant:new P(new Yn(.034,.12,8),new ee({color:9086567,roughness:.72})),harvest:new P(new Gt(.022,.04,4,8),new ee({color:13085012,roughness:.78})),protect:new P(new rt(.05,10,8),new ee({color:8951983,roughness:.48})),mulch:new P(new rt(.045,10,8),new ee({color:8018483,roughness:.9}))};y.water.rotation.z=Math.PI/2,y.water.position.set(.015,-.03,.03),y.plant.rotation.z=-.85,y.plant.position.set(.02,-.02,.04),y.harvest.rotation.z=Math.PI/2,y.harvest.scale.set(1,.86,.8),y.harvest.position.set(.016,-.04,.03),y.protect.position.set(.02,-.03,.045),y.mulch.scale.set(1.08,.72,.86),y.mulch.position.set(.015,-.035,.02),Object.values(y).forEach(F=>{F.castShadow=!0,F.visible=!1,M.add(F)});const N=[];for(const F of[-1,1]){const q=new We;q.position.set(F*.055,.2,0),i.add(q);const Q=new P(new Gt(.034,.1,6,12),g);Q.position.y=-.06,Q.castShadow=!0,q.add(Q);const ne=new P(new Gt(.03,.08,5,10),g);ne.position.y=-.15,ne.castShadow=!0,q.add(ne);const j=new P(new Gt(.036,.05,4,10),v);j.scale.set(.95,.65,1.4),j.position.set(0,-.22,.02),j.castShadow=!0,q.add(j),N.push(q)}let k={position:{x:0,y:0,z:2.55},facing:Math.PI,moving:!1,speed:0,time:0},G="hand";function h(F){if(!F)return;k=F;const q=F.moving?Math.min(1,F.speed/1.7):0,Q=Math.sin(F.time*9.5)*.55*q,ne=Math.abs(Math.sin(F.time*9.5))*.025*q;n.position.set(F.position.x,F.position.y??0,F.position.z),n.rotation.y=F.facing,T.position.y=.38+ne,T.rotation.z=Q*.06,B.rotation.z=-Q*.04,t.scale.setScalar(1-ne*.8),t.material.opacity=.18-ne*.4,R[0].rotation.x=Q,R[1].rotation.x=-Q,N[0].rotation.x=-Q*.9,N[1].rotation.x=Q*.9}function p(F=new at){return F.copy(n.position),F.y+=.66,F}function D(F){G=F??"hand",Object.entries(y).forEach(([q,Q])=>{Q.visible=q===G})}return e?.trackObject(n),h(k),D(G),{group:n,update:h,getFocusTarget:p,setEquippedTool:D}}const Op="/garden-os/story-mode/assets/bed-cell-C_FrYzf1.png",Fp="/garden-os/story-mode/assets/bed-empty-ChVTfCDp.png",Bp="/garden-os/story-mode/assets/bed-grid-C-DXUgpC.png",Gp="/garden-os/story-mode/assets/crop-arugula-BGqj-HUY.png",Hp="/garden-os/story-mode/assets/crop-basil-DoQDikcV.png",Vp="/garden-os/story-mode/assets/crop-lettuce-DehEW-xK.png",kp="/garden-os/story-mode/assets/crop-marigold-D9PKsFVy.png",zp="/garden-os/story-mode/assets/crop-radish-LSxNrFlB.png",Wp="/garden-os/story-mode/assets/crop-sheet-BI3Y8iMf.png",Xp="/garden-os/story-mode/assets/crop-spinach-BME0-V9m.png",Yp="/garden-os/story-mode/assets/env-fence-CZblozxF.png",qp="/garden-os/story-mode/assets/env-grass-CAWVaR3i.png",Kp="/garden-os/story-mode/assets/env-path-CzCo7pNS.png",Zp="/garden-os/story-mode/assets/env-spigot-Bxmo22HG.png",$p="/garden-os/story-mode/assets/grow-arugula-D5ddiItD.png",Qp="/garden-os/story-mode/assets/grow-basil-wRRc5B9M.png",jp="/garden-os/story-mode/assets/grow-lettuce-BNOf-sUs.png",Jp="/garden-os/story-mode/assets/grow-marigold-BMOUpR1n.png",e0="/garden-os/story-mode/assets/grow-master-DBx5h7t7.png",t0="/garden-os/story-mode/assets/grow-radish-j__uKvtC.png",n0="/garden-os/story-mode/assets/grow-spinach-B8H4f4Ez.png",i0="/garden-os/story-mode/assets/portrait-calvin-DAQYBkHa.svg",o0="/garden-os/story-mode/assets/ui-badges-BmoPL5AN.png",a0="/garden-os/story-mode/assets/ui-month-card-CjFKsnqr.png",r0="/garden-os/story-mode/assets/ui-nav-pills-D_GYqv0H.png",s0={"bed-empty":{file:"bed-empty.png",w:1024,h:512},"bed-grid":{file:"bed-grid.png",w:1024,h:512},"bed-rain":{file:"bed-rain.png",w:1024,h:512},"bed-cell":{file:"bed-cell.png",w:256,h:256},"crop-lettuce":{file:"crop-lettuce.png",w:256,h:256},"crop-spinach":{file:"crop-spinach.png",w:256,h:256},"crop-arugula":{file:"crop-arugula.png",w:256,h:256},"crop-radish":{file:"crop-radish.png",w:256,h:256},"crop-basil":{file:"crop-basil.png",w:256,h:256},"crop-marigold":{file:"crop-marigold.png",w:256,h:256},"env-spigot":{file:"env-spigot.png",w:128,h:256},"env-fence":{file:"env-fence.png",w:256,h:512},"env-path":{file:"env-path.png",w:512,h:512},"env-grass":{file:"env-grass.png",w:512,h:512},"ui-badges":{file:"ui-badges.png",w:512,h:64},"ui-month-card":{file:"ui-month-card.png",w:320,h:96},"ui-nav-pills":{file:"ui-nav-pills.png",w:320,h:48}},Mr={"crop-sheet":{file:"crop-sheet.png",w:1536,h:256,cols:6,rows:1},"bed-seasons":{file:"bed-seasons.png",w:2048,h:512,cols:4,rows:1},"grow-lettuce":{file:"grow-lettuce.png",w:1024,h:256,cols:4,rows:1},"grow-spinach":{file:"grow-spinach.png",w:1024,h:256,cols:4,rows:1},"grow-arugula":{file:"grow-arugula.png",w:1024,h:256,cols:4,rows:1},"grow-radish":{file:"grow-radish.png",w:1024,h:256,cols:4,rows:1},"grow-basil":{file:"grow-basil.png",w:1024,h:256,cols:4,rows:1},"grow-marigold":{file:"grow-marigold.png",w:1024,h:256,cols:4,rows:1}},ii={SEED:0,SPROUT:1,GROWING:2,HARVEST:3},c0={LETTUCE:0,SPINACH:1,ARUGULA:2,RADISH:3,BASIL:4,MARIGOLD:5},l0=new bc,Mo=new Map,no=new Map;let Ti=null,Eo=[];function f0(e){return new URL(Object.assign({"../../assets/textures/bed-cell.png":Op,"../../assets/textures/bed-empty.png":Fp,"../../assets/textures/bed-grid.png":Bp,"../../assets/textures/crop-arugula.png":Gp,"../../assets/textures/crop-basil.png":Hp,"../../assets/textures/crop-lettuce.png":Vp,"../../assets/textures/crop-marigold.png":kp,"../../assets/textures/crop-radish.png":zp,"../../assets/textures/crop-sheet.png":Wp,"../../assets/textures/crop-spinach.png":Xp,"../../assets/textures/env-fence.png":Yp,"../../assets/textures/env-grass.png":qp,"../../assets/textures/env-path.png":Kp,"../../assets/textures/env-spigot.png":Zp,"../../assets/textures/grow-arugula.png":$p,"../../assets/textures/grow-basil.png":Qp,"../../assets/textures/grow-lettuce.png":jp,"../../assets/textures/grow-marigold.png":Jp,"../../assets/textures/grow-master.png":e0,"../../assets/textures/grow-radish.png":t0,"../../assets/textures/grow-spinach.png":n0,"../../assets/textures/portrait-calvin.svg":i0,"../../assets/textures/ui-badges.png":o0,"../../assets/textures/ui-month-card.png":a0,"../../assets/textures/ui-nav-pills.png":r0})[`../../assets/textures/${e}`],import.meta.url).href}function qa(e,n){return new Promise((t,i)=>{l0.load(f0(n),o=>{o.colorSpace=Qn,o.magFilter=gn,o.minFilter=Ln,o.generateMipmaps=!0,Mo.set(e,o),t(o)},void 0,()=>{console.warn(`[sprite-loader] missing texture: ${n}`),Eo.push(e),t(null)})})}function d0(){if(Ti)return Ti;const e=Object.entries(s0).map(([t,{file:i}])=>qa(t,i)),n=Object.entries(Mr).map(([t,{file:i}])=>qa(t,i));return Eo=[],Ti=Promise.all([...e,...n]).then(()=>{}),Ti}function u0(e){return Mo.get(e)??null}function Er(e,n){const t=`${e}:${n}`;if(no.has(t))return no.get(t);const i=Mr[e];if(!i)return null;const o=Mo.get(e);if(!o)return null;const{cols:a,rows:c}=i,l=n%a,g=Math.floor(n/a),v=o.clone();return v.repeat.set(1/a,1/c),v.offset.set(l/a,1-(g+1)/c),v.needsUpdate=!0,no.set(t,v),v}function p0(e){const n=`crop-${e}`,t=u0(n);if(t)return t;const i=c0[e.toUpperCase()];return i!==void 0?Er("crop-sheet",i):null}function h0(e,n){const t=`grow-${e}`;return Er(t,n)??p0(e)}function m0(){return[...Eo]}const Ka={spring:{sky:13162980,ground:5654061,sunAngle:52,sunInt:1.45,ambInt:.7,fillInt:.48,fogDensity:.021,sunX:-2.7,sunZ:4.8,fillX:3.8,fillZ:-2.1},summer:{sky:15787727,ground:6967859,sunAngle:68,sunInt:1.72,ambInt:.82,fillInt:.52,fogDensity:.018,sunX:-1.8,sunZ:4.4,fillX:4.2,fillZ:-2.4},fall:{sky:14201210,ground:4862230,sunAngle:38,sunInt:1.16,ambInt:.56,fillInt:.4,fogDensity:.024,sunX:-3.4,sunZ:4.6,fillX:3.6,fillZ:-1.8},winter:{sky:8294048,ground:2301734,sunAngle:28,sunInt:.78,ambInt:.42,fillInt:.3,fogDensity:.028,sunX:-4,sunZ:3.3,fillX:2.8,fillZ:-1.6}},_0={climbers:2984526,fast_cycles:7192429,greens:3832399,roots:12876346,herbs:8042590,fruiting:13912618,brassicas:4885098,companions:15255626},g0={"chapter-intro":{position:[0,3.55,5.95],target:[0,.54,-.06],fov:35},overview:{position:[0,2.95,4.9],target:[0,.46,-.12],fov:31},"bed-low-angle":{position:[0,2,3.65],target:[0,.4,-.18],fov:36},"row-close":{position:[.9,1.92,3.28],target:[.45,.37,-.17],fov:36},"event-push":{position:[0,2.4,4],target:[0,.42,-.16],fov:34},"harvest-hero":{position:[0,2.72,3.88],target:[0,.46,-.05],fov:32},"front-access":{position:[0,2.72,5.2],target:[0,.44,-.18],fov:35}},v0={dawn:{fogColor:16766366,fogDensity:.018,ambientIntensity:.62,ambientColor:16771264,fillIntensity:.34,skyTint:16770227},calm:{fogColor:10335142,fogDensity:.02,ambientIntensity:.6,ambientColor:14282720,fillIntensity:.4,skyTint:10277096},storm:{fogColor:6385786,fogDensity:.04,ambientIntensity:.32,ambientColor:10727610,fillIntensity:.22,skyTint:7638177},heat:{fogColor:16766604,fogDensity:.024,ambientIntensity:.9,ambientColor:16773050,fillIntensity:.46,skyTint:15910524},"harvest-gold":{fogColor:15777888,fogDensity:.018,ambientIntensity:.98,ambientColor:16765024,fillIntensity:.44,skyTint:15911274},night:{fogColor:1712176,fogDensity:.05,ambientIntensity:.18,ambientColor:7310016,fillIntensity:.14,skyTint:3689082},celebration:{fogColor:16773060,fogDensity:.012,ambientIntensity:1.12,ambientColor:16773823,fillIntensity:.5,skyTint:16769702},loss:{fogColor:6318192,fogDensity:.03,ambientIntensity:.28,ambientColor:9083044,fillIntensity:.18,skyTint:7109252}},oi={storm:{soil:8022607,emissive:4017240,emissiveIntensity:.18,tilt:.16,tint:6979471},flood:{soil:5984053,emissive:3102320,emissiveIntensity:.22,tilt:.08,tint:5998500},frost:{soil:8090983,emissive:12244200,emissiveIntensity:.18,tilt:.05,tint:12178655},heat:{soil:6965798,emissive:9129762,emissiveIntensity:.14,tilt:.12,tint:11106373},pest:{soil:6114602,emissive:6978099,emissiveIntensity:.16,tilt:.2,tint:7504442},blight:{soil:5654329,emissive:6113077,emissiveIntensity:.2,tilt:.22,tint:7165242},impact:{soil:6769973,emissive:6113077,emissiveIntensity:.14,tilt:.14,tint:9071176}},S0=new He(12633807),M0=new He(12108234),E0=8886442;function x0(e,n,t=1,i=1){const o=document.createElement("canvas");o.width=e,o.height=e;const a=o.getContext("2d");n(a,e);const c=new $n(o);return c.colorSpace=Qn,c.wrapS=Fn,c.wrapT=Fn,c.repeat.set(t,i),c.needsUpdate=!0,c}function T0(e=1,n=1){return x0(192,(t,i)=>{t.fillStyle="#496b34",t.fillRect(0,0,i,i);for(let o=0;o<1500;o++){const a=o*37%i,c=o*73%i,l=4+o%5;t.strokeStyle=o%7===0?"rgba(190, 170, 96, 0.16)":"rgba(92, 140, 72, 0.22)",t.beginPath(),t.moveTo(a,c+l),t.lineTo(a+(o%3-1)*2,c),t.stroke()}for(let o=0;o<320;o++){const a=o*53%i,c=o*97%i;t.fillStyle="rgba(58, 92, 43, 0.16)",t.beginPath(),t.arc(a,c,2+o%2,0,Math.PI*2),t.fill()}},e,n)}function wi(e){const n=Math.sin(e*127.1+311.7)*43758.5453123;return n-Math.floor(n)}function mn(e,n=0,t=0,i=0){return new He(e).offsetHSL(n,t,i)}function w0(e,n,{segmentsX:t=6,segmentsY:i=10,bend:o=.04,cup:a=.02,taper:c=.58}={}){const l=new an(e,n,t,i),g=l.getAttribute("position"),v=e/2||1;for(let b=0;b<g.count;b++){const T=g.getX(b),x=g.getY(b),w=T/v,B=(x+n/2)/n,C=Math.abs(w),d=T*Math.max(.12,1-B*c),r=Math.max(0,1-C*.9),L=Math.sin(B*Math.PI)*o*r,R=Math.sin(C*Math.PI*.5)*a*(.2+B*.8),M=Math.sin((w*1.3+B*1.1)*Math.PI)*o*.14;g.setX(b,d),g.setZ(b,L+R+M)}return l.translate(0,n/2,0),l.computeVertexNormals(),l}function zn(e,{rotX:n=0,rotY:t=0,rotZ:i=.08,lift:o=0,speed:a=1.3,phase:c=0}={}){return e.userData.breeze={rotX:n,rotY:t,rotZ:i,lift:o,speed:a,phase:c,basePositionY:e.position.y,baseRotationX:e.rotation.x,baseRotationY:e.rotation.y,baseRotationZ:e.rotation.z},e}function Wn(e,n={}){const t=new P(w0(n.width??.08,n.height??.14,n),new ee({color:n.color??e,roughness:n.roughness??.72,side:It}));return t.castShadow=!0,t}function Tn(e,{tilt:n=.03,yaw:t=.02,lift:i=.006,speed:o=1.2,phase:a=0}={}){return e.userData.sway={tilt:n,yaw:t,lift:i,speed:o,phase:a},e}function b0(e,{radiusX:n=.11,radiusZ:t=.09,opacity:i=.14,y:o=.005}={}){const a=new P(new un(.12,18),new wn({color:0,transparent:!0,opacity:i,depthWrite:!1}));return a.rotation.x=-Math.PI/2,a.position.y=o,a.scale.set(n/.12,t/.12,1),a.renderOrder=2,e.add(a),a}function io(e,n="crop"){const t=n==="crop"?1.7:4.3;return{xOffset:(wi(e*17.3+t)-.5)*(n==="crop"?.085:.04),zOffset:(wi(e*23.9+t)-.5)*(n==="crop"?.09:.04),rotationY:(wi(e*31.7+t)-.5)*(n==="crop"?.7:.35),scale:n==="crop"?.92+wi(e*11.1+t)*.16:1}}function Hn(e,{count:n=6,radiusX:t=.08,radiusZ:i=.08,height:o=.02,leafWidth:a=.08,leafHeight:c=.16,color:l,roughness:g=.72,tilt:v=-.95,bend:b=.04,cup:T=.02,yawOffset:x=0,liftJitter:w=.015,phaseOffset:B=0}={}){for(let C=0;C<n;C++){const d=x+C/n*Math.PI*2,r=Wn(l,{width:a*(.92+C%3*.06),height:c*(.92+(C+1)%2*.08),roughness:g,bend:b,cup:T});r.position.set(Math.cos(d)*t,o+Math.sin(C*1.7)*w,Math.sin(d)*i),r.rotation.x=v,r.rotation.y=d+Math.PI/2,r.rotation.z=Math.sin(C*2.1)*.18,zn(r,{rotX:.03,rotY:.04,rotZ:.13,lift:.004,speed:1.3+C%3*.14,phase:B+C*.72}),e.add(r)}}function oo(e){return e<.5?4*e*e*e:1-(-2*e+2)**3/2}const A0={"🥒":4889150,"🥬":5941845,"🌿":4033102,"🌱":5941845,"🍃":4033085,"🫛":2263091,"🫛":2263091,"🌰":13395524,"🥕":15632435,"🧅":14526549,"🧄":15654348,"🫑":4491332,"🍅":14496546,"🍆":6697864,"🪷":3377322,"🥔":14531464,"🥦":3377220,"🌻":15649843,"🌼":15636787,"🌸":16737928,"💐":13391274};function R0(e,n){for(const[t,i]of Object.entries(A0))if(e&&e.includes(t))return i;return n}function C0({container:e,renderer:n,scene:t,weather:i,dayNight:o,cameraController:a,resourceTracker:c,cropMeshes:l,supportMeshes:g,accentMeshes:v}){c?.trackObject(t),i?.dispose?.(),o?.dispose?.(),a?.dispose?.(),l?.clear(),g?.clear(),v?.clear(),t?.clear?.(),c?.disposeAll(),n?.dispose(),n?.domElement?.remove?.()}function I0(e){const n=document.createElement("canvas");if(!(n.getContext("webgl2")||n.getContext("webgl")))throw new Error("WebGL not available");const i=new Ac,o=new Ic;i.background=new He(8900331),i.fog=new Rc(11585744,.022);const a=new ri(45,1,.1,100);a.position.set(0,2.95,4.9),a.lookAt(0,.46,-.12);const c=new at(0,.46,-.12);let l=null,g=null,v="PLANNING",b=xi(v),T=null;const x=new mp({antialias:!0,alpha:!1});x.shadowMap.enabled=!0,x.shadowMap.type=fr,x.toneMapping=ci,x.toneMappingExposure=1.18,x.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),e.appendChild(x.domElement);const w=new We;i.add(w);const B=new rt(50,64,32),C=document.createElement("canvas");C.width=8,C.height=256;const d=C.getContext("2d"),r=d.createLinearGradient(0,0,0,256);r.addColorStop(0,"#6a9fd4"),r.addColorStop(.35,"#a8d8f0"),r.addColorStop(.6,"#d4e8f2"),r.addColorStop(.8,"#e8eeef"),r.addColorStop(1,"#f2e8d4"),d.fillStyle=r,d.fillRect(0,0,8,256);const L=new $n(C);L.minFilter=gn;const R=new wn({map:L,side:cn,fog:!1}),M=new P(B,R);i.add(M);const y=wp(o);w.add(y.group);for(const u of y.cellMeshes)u.userData._baseColor=u.material.color.clone();const N=new an(40,40,64,64),k=[],G=N.getAttribute("position"),h=T0(5.5,5.5);for(let u=0;u<G.count;u++){const m=G.getX(u),E=G.getY(u),I=Math.sqrt(m*m+E*E),re=Math.min(I/5.5,1),le=Math.sin(m*.52)*Math.cos(E*.58)*.04,ie=Math.sin((m+E)*.34)*.025,se=Math.cos(m*.28+1.2)*Math.sin(E*.22)*.02;G.setZ(u,(le+ie+se)*(.15+re*.85));const pe=Math.min(I/6,1),ce=.22+pe*.1,ot=.36+pe*.08,$e=.16+pe*.06;k.push(ce,ot,$e)}G.needsUpdate=!0,N.setAttribute("color",new Cc(k,3)),N.computeVertexNormals();const p=new P(N,new ee({color:4877114,roughness:.95,vertexColors:!0,map:h,bumpMap:h,bumpScale:.012}));p.rotation.x=-Math.PI/2,p.position.y=-.01,p.receiveShadow=!0,w.add(p);const D=new We;D.name="grass-sprites";{const u=document.createElement("canvas");u.width=32,u.height=64;const m=u.getContext("2d");m.clearRect(0,0,32,64);const E=["#4a7a3a","#3d6a2e","#5a8a48","#3a5e28","#6a9a52"];for(let pe=0;pe<5;pe++){const ce=8+pe*3.2+pe%2*1.5,ot=(pe-2)*2.5;m.strokeStyle=E[pe],m.lineWidth=1.8+pe%2*.6,m.lineCap="round",m.beginPath(),m.moveTo(ce,62),m.quadraticCurveTo(ce+ot*.4,36,ce+ot,4+pe*3),m.stroke()}const I=new $n(u);I.magFilter=gn,I.minFilter=Ln,I.generateMipmaps=!0,I.colorSpace=Qn;const re=new an(.12,.18),le=new ee({map:I,alphaTest:.3,transparent:!1,side:It,roughness:.9,depthWrite:!0}),ie=220,se=7919;for(let pe=0;pe<ie;pe++){const ce=(pe+1)*se%10007,ot=ce%997/997*2-1,$e=ce%991/991*2-1,Ut=ot*8,bt=$e*6+1.5;if(Math.abs(Ut)<2.2&&bt>-1.2&&bt<1.4||bt>2.5&&Math.abs(Ut)<1.8||bt<-2.5||Math.sqrt(Ut*Ut+(bt-1)*(bt-1))>9)continue;const Wt=.7+ce%13/13*.6,Xt=ce%31/31*Math.PI,Mt=.85+ce%17/17*.3,Nt=new P(re,le.clone());if(Nt.material.color=new He(Mt*.3,Mt*.45,Mt*.22),Nt.scale.set(Wt,Wt,Wt),Nt.position.set(Ut,.07*Wt,bt),Nt.rotation.y=Xt,D.add(Nt),pe%2===0){const dn=new P(re,Nt.material);dn.scale.copy(Nt.scale),dn.position.copy(Nt.position),dn.rotation.y=Xt+Math.PI/2,D.add(dn)}}o.trackObject(D)}w.add(D);const F=Ap(o);w.add(F.group),d0().then(()=>{const u=m0();if(u.length>0){const m=document.getElementById("toast-container");if(m){const E=document.createElement("div");E.className="toast-notification toast--info",E.textContent=`${u.length} sprite${u.length===1?"":"s"} unavailable — some visuals may be simplified`,m.appendChild(E),requestAnimationFrame(()=>E.classList.add("is-visible")),setTimeout(()=>{E.classList.remove("is-visible"),setTimeout(()=>E.remove(),300)},4e3)}}}).catch(()=>{});const q=new We,Q=new ee({color:2763306,roughness:.85}),ne=new P(new Gt(.034,.08,5,10),Q);ne.rotation.z=Math.PI/2,ne.scale.set(1,.9,.82),ne.position.set(0,0,0),q.add(ne);const j=new P(new rt(.035,10,8),Q);j.position.set(.07,.028,0),q.add(j);for(const u of[-.012,.012]){const m=new P(new Yn(.012,.026,6),Q);m.position.set(.07+u,.075,0),q.add(m)}const ve=new P(new tt(.008,.005,.1,8),Q);ve.rotation.z=-.7,ve.position.set(-.09,.04,0),q.add(ve),q.position.set(5,.5,.5),q.visible=!1,w.add(q);const Z=new We,Le=new ee({color:13935988,roughness:.8}),Ye=new ee({color:6044958,roughness:.9}),Ze=new P(new tt(.03,.03,.4,10),Le);Ze.rotation.z=Math.PI/4,Ze.position.set(0,0,0),Z.add(Ze);const ct=new P(new rt(.045,10,8),Ye);ct.scale.set(1.12,.84,.92),ct.position.set(.2,-.2,0),Z.add(ct);const vt=new P(new tt(.016,.024,.035,8),Ye);vt.rotation.z=-.5,vt.position.set(.17,-.17,0),Z.add(vt),Z.position.set(4.8,.8,-.2),Z.visible=!1,w.add(Z);const Qe=new We;Qe.visible=!1;const lt=new ee({color:3944745,roughness:.95}),$=new ee({color:15130580,roughness:.96}),Y=new ee({color:1513239,roughness:.72}),ue=new ee({color:1513239,roughness:.6}),ye=new wn({color:0,transparent:!0,opacity:.22,depthWrite:!1}),Te=new P(new un(.42,18),ye);Te.rotation.x=-Math.PI/2,Te.position.y=.012,Qe.add(Te);const Ve=new We;Ve.position.y=.34,Qe.add(Ve);const Tt=new P(new Gt(.12,.28,8,16),$);Tt.rotation.z=Math.PI/2,Tt.scale.set(1,.9,.78),Tt.castShadow=!0,Ve.add(Tt);const S=new P(new Gt(.08,.14,6,12),lt);S.rotation.z=Math.PI/2,S.scale.set(1.02,.88,.8),S.position.set(-.04,.05,0),S.castShadow=!0,Ve.add(S);const ke=new P(new rt(.13,20,16),lt);ke.position.set(-.22,-.01,0),ke.scale.set(1.1,1,.95),ke.castShadow=!0,Ve.add(ke);const qe=new P(new rt(.13,20,16),$);qe.position.set(.21,-.02,0),qe.scale.set(.95,1.05,.95),qe.castShadow=!0,Ve.add(qe);for(const[u,m,E,I,re,le,ie]of[[-.04,.12,-.09,.12,.1,.1,lt],[.06,.13,.09,.13,.11,.1,lt],[.18,.12,-.08,.1,.09,.08,$]]){const se=new P(new rt(1,10,8),ie);se.position.set(u,m,E),se.scale.set(I,re,le),se.castShadow=!0,Ve.add(se)}const De=new We;De.position.set(.3,.08,0),Ve.add(De);const be=new P(new Gt(.04,.08,5,10),$);be.position.set(-.005,-.01,0),be.rotation.z=-.35,be.scale.set(.9,1,1.15),be.castShadow=!0,De.add(be);const St=new P(new Gt(.075,.11,8,12),$);St.rotation.z=Math.PI/2,St.scale.set(1.02,.9,.84),St.position.set(.12,.02,0),St.castShadow=!0,De.add(St);const Ne=new P(new rt(.075,10,8),lt);Ne.position.set(.175,.015,0),Ne.scale.set(.62,1,.92),Ne.castShadow=!0,De.add(Ne);const nt=new P(new Gt(.038,.07,6,10),$);nt.rotation.z=Math.PI/2,nt.scale.set(1,.82,.85),nt.position.set(.23,-.03,0),nt.castShadow=!0,De.add(nt);const yt=new P(new rt(.022,10,8),Y);yt.position.set(.285,-.02,0),yt.scale.set(1,.9,1.2),De.add(yt);const wt=new ee({color:15239834,roughness:.65}),_=new P(new Gt(.008,.022,4,8),wt);_.position.set(.25,-.065,.012),_.rotation.z=.22,_.rotation.x=Math.PI/2,_.scale.set(1,1.25,.9),_.visible=!1,De.add(_);const s=new We,V=new ee({color:15986405,roughness:.92}),J=new ee({color:4866101,roughness:.8});for(const[u,m,E]of[[-.1,.08,.03],[-.04,.18,.045],[.06,.33,.11]]){const I=new P(new rt(E,14,12),V);I.position.set(u,m,0),s.add(I)}for(const u of[-.03,.02,.07]){const m=new P(new rt(.012,8,6),J);m.position.set(u,.34,.08),s.add(m)}s.position.set(.1,.62,0),s.visible=!1,Qe.add(s);for(const u of[-.035,.035]){const m=new P(new rt(.012,8,6),ue);m.position.set(.2,.035,u),De.add(m)}const de=[];for(const[u,m]of[[-.05,.22],[.05,-.22]]){const E=new We;E.position.set(.1,.1,u);const I=new P(new tt(.01,.028,.12,8),lt);I.position.set(-.005,-.06,0),I.rotation.z=m,I.scale.set(1,1,.85),I.castShadow=!0,E.add(I),De.add(E),de.push(E)}const K=new We;K.position.set(-.31,.04,0),Ve.add(K);const Oe=new P(new tt(.018,.008,.18,10),$);Oe.position.set(-.09,.02,0),Oe.rotation.z=-.99,Oe.castShadow=!0,K.add(Oe);const Ee=[];for(const{x:u,z:m,phase:E}of[{x:.18,z:-.07,phase:0},{x:-.12,z:-.07,phase:Math.PI},{x:.18,z:.07,phase:Math.PI},{x:-.12,z:.07,phase:0}]){const I=new We;I.position.set(u,-.08,m),Ve.add(I);const re=new P(new Gt(.022,.08,5,10),$);re.position.set(0,-.08,0),re.scale.set(1,1.02,.9),re.castShadow=!0,I.add(re);const le=new We;le.position.set(0,-.16,0),I.add(le);const ie=new P(new Gt(.02,.075,5,10),lt);ie.position.set(0,-.07,0),ie.scale.set(1,1,.88),ie.castShadow=!0,le.add(ie);const se=new P(new rt(.036,10,8),$);se.position.set(.015,-.15,0),se.scale.set(1.25,.55,1.05),se.castShadow=!0,le.add(se),Ee.push({hipPivot:I,kneePivot:le,phase:E})}const Ue=[],ze=new wn({color:13154456,transparent:!0,opacity:0,depthWrite:!1});for(let u=0;u<6;u++){const m=new P(new rt(.03,8,6),ze.clone());m.visible=!1,m.userData={age:0,maxAge:400,active:!1},Qe.add(m),Ue.push(m)}Qe.scale.setScalar(1.12),Qe.position.set(-4.15,0,2.1),w.add(Qe);const oe={active:!1,elapsedMs:0,duration:2600,fadeOutMs:0,start:new at(-4.15,0,2.1),end:new at(4.7,0,1.88),arcHeight:.1,sway:.14},Se={active:!1,remainingMs:0,position:new at(.15,0,.34)};function Xe(){_.visible=!1,s.visible=!1,Te.scale.setScalar(1),Te.material.opacity=.22,Ue.forEach(u=>{u.userData.active=!1,u.visible=!1,u.userData.age=0}),Qe.traverse(u=>{!u.isMesh||!u.material||(u.material.transparent=!1,u.material.opacity=1)})}const Fe=[];y.group.traverse(u=>{u.isMesh&&u.name==="trellis-wire"&&Fe.push({mesh:u,baseX:u.position.x})});const xe=Ip(i,o),et=new yc(13097183,5654061,.7);i.add(et);const A=new Ai(16774366,1.45);A.position.set(-2.7,8,4.8),A.castShadow=!0,A.shadow.mapSize.set(2048,2048),A.shadow.camera.near=.5,A.shadow.camera.far=30,A.shadow.camera.left=-6,A.shadow.camera.right=6,A.shadow.camera.top=6,A.shadow.camera.bottom=-6,i.add(A);const _e=new Ai(9349308,.48);_e.position.set(3.8,4.4,-2.1),i.add(_e);const Me=new Ai(14149365,.18);Me.position.set(-4.4,3.1,-4.7),i.add(Me),i.userData.lightingRig={hemi:et,sun:A,fill:_e,rim:Me,skyMat:R},i.userData.weatherFx=xe,i.userData.scenery=F;const Ae=new Dp(i,{enabled:!1});function me(u={}){!T&&!u.force||(Cp(b,{renderer:x,scene:i,skyMat:R,hemi:et,sun:A,fill:_e,rim:Me,lightingState:T,materialTargets:[w]}),qr(b))}function ae(u,m={}){!m.force&&u===b||(b=u,me({force:!0}))}function Ie(u,m={}){v=u,ae(xi(u),m)}const je=new We;{const u=[13200170,9127187,10506797];[[-1.8,2.6],[-.6,1.5],[.4,2.8],[1.2,1.8],[-.2,3.1],[.9,2.2],[-1.2,3.3],[1.8,1.4],[-.8,2],[.2,1.6],[-1.5,1.9],[.7,3],[-.4,1.3],[1.4,2.7],[-1,2.4],[.5,1.1],[-1.9,3],[1.1,3.2]].forEach(([E,I],re)=>{const le=.02+re%3*.007,ie=new un(le,6),se=new ee({color:u[re%u.length],roughness:.9,side:It}),pe=new P(ie,se);pe.rotation.x=-Math.PI/2,pe.rotation.z=re*.71,pe.position.set(E,.008,I),je.add(pe)})}je.visible=!1,w.add(je);const mt=new We;{const u=new ee({color:15791359,roughness:.85}),m=8*.5,E=4*.5,I=.15,re=E/2+.03,le=-1.03,ie=-1.009,se=1.08;[{w:m+.12,d:.06,x:0,y:I+.003,z:re},{w:m+.12,d:.06,x:0,y:I+.003,z:le},{w:.06,d:E,x:-2.03,y:I+.003,z:0},{w:.06,d:E,x:m/2+.03,y:I+.003,z:0}].forEach(({w:ce,d:ot,x:$e,y:Ut,z:bt})=>{for(let ln=0;ln<8;ln++){const Wt=new P(new Ct(ce/8*(.6+ln%3*.2),.005,ot*(.5+ln%2*.3)),u);Wt.position.set($e+(ln-3.5)*(ce/8),Ut,bt),mt.add(Wt)}});for(let ce=0;ce<10;ce++){const ot=new P(new Ct(.35+ce%3*.1,.005,.03),u);ot.position.set(-1.7+ce*.38,se+.028,ie),mt.add(ot)}for(const ce of[-1.94,1.94])for(let ot=0;ot<6;ot++){const $e=new P(new Ct(.06,.005,.03+ot%2*.01),u);$e.position.set(ce,.15+ot*.18,ie),mt.add($e)}}mt.visible=!1,w.add(mt);const st=new We;{const u=new ee({color:8952234,roughness:.15,metalness:.25,opacity:.2,transparent:!0});[{r:.08,x:-.9,z:2.4},{r:.06,x:1.3,z:1.6},{r:.1,x:.3,z:3},{r:.07,x:-2,z:.7}].forEach(({r:E,x:I,z:re})=>{const le=new P(new un(E,16),u.clone());le.rotation.x=-Math.PI/2,le.position.set(I,.009,re),st.add(le)})}st.visible=!1,w.add(st);const _t=new We;{const u=new ee({color:3813416,roughness:.85}),m=new ee({color:14527044,roughness:.7}),E=new P(new rt(.025,10,8),u);E.scale.set(1.4,.8,1.1),_t.add(E);const I=new P(new rt(.015,8,7),u);I.position.set(.028,.018,0),_t.add(I);const re=new P(new Yn(.008,.022,6),m);re.rotation.z=-Math.PI/2,re.position.set(.048,.016,0),_t.add(re);const le=new P(new tt(.003,.01,.028,6),u);le.position.set(-.034,.004,0),le.rotation.z=1.22,_t.add(le)}_t.position.set(1.24,1.105,-1.009),_t.visible=!0,w.add(_t);let zt=!0,rn=0;const Ft=new We;{const u=new ee({color:16768392,emissive:16768392,emissiveIntensity:.6,roughness:.5}),m=-3.38,E=-1.72,I=2.5,re=-4.08;for(let le=0;le<8;le++){const ie=le/7,se=m+(E-m)*ie,pe=-.06*Math.sin(ie*Math.PI),ce=new P(new rt(.012,8,6),u.clone());ce.position.set(se,I+pe,re),Ft.add(ce)}}Ft.visible=!1,w.add(Ft);const Bt=new We,H=[];{const u=new ee({color:16032864,roughness:.5,side:It,emissive:16032864,emissiveIntensity:.15});[{x:-.4,y:.55,z:.8,phase:0,speed:1.1},{x:.8,y:.65,z:-.3,phase:1.8,speed:.9},{x:-1,y:.72,z:-.9,phase:3.5,speed:1.3}].forEach(E=>{const I=new P(new an(.03,.03),u.clone());I.position.set(E.x,E.y,E.z),Bt.add(I),H.push({mesh:I,baseX:E.x,baseY:E.y,baseZ:E.z,phase:E.phase,speed:E.speed})})}Bt.visible=!1,w.add(Bt),o.trackObject(w),o.trackObject(M);const W=Np(o);w.add(W.group);const fe=new at(0,.46,-.12),te=new at,ge=new at;let Pe=0;performance.now();const ft=Up(a,x.domElement),Ot=new Pc,Rt=new Jt;let sn=-1;const En=new He(6969904),pn=new He(4025999);let Rn=new Set,f=[],U="spring",z=null,X=-1,O=.3;const he=new at,we=new at;function Ge(u){const m=y.cellMeshes[u];if(!m)return new He(3811866);const E=m.userData._baseColor?.clone()??m.material.color.clone(),I=f[u];U==="winter"&&I?.cropId&&E.lerp(S0,.72);const re=I?.damageState;return!re||!oi[re]?E:E.lerp(new He(oi[re].soil),.55)}function Ce(u){const m=y.cellMeshes[u];if(!m)return;if(sn===u){m.material.color.copy(En),m.material.emissive?.setHex(0),m.material.emissiveIntensity=0;return}const I=f[u]?.damageState,re=I?oi[I]:null;m.material.color.copy(Ge(u)),X===u?(m.material.emissive?.setHex(15255626),m.material.emissiveIntensity=O):Rn.has(u)?(m.material.emissive?.copy(pn),m.material.emissiveIntensity=.35):re?(m.material.emissive?.setHex(re.emissive),m.material.emissiveIntensity=re.emissiveIntensity):(m.material.emissive?.setHex(0),m.material.emissiveIntensity=0)}function Je(u){u!==sn&&(sn>=0&&sn<y.cellMeshes.length&&Ce(sn),sn=u,u>=0&&u<y.cellMeshes.length&&Ce(u))}function it(u){if(!u?.inside){Je(-1);return}Rt.x=u.x,Rt.y=u.y,Ot.setFromCamera(Rt,a);const m=Ot.intersectObjects(y.cellMeshes),E=m.length>0?m[0].object.userData.cellIndex:-1,I=Rn.size>0&&!Rn.has(E)?-1:E;Je(I)}function Ke(){Je(-1)}function pt(u,m=.3){const E=Number.isInteger(u)?u:-1,I=X,re=Math.abs(O-m)>1e-4;I===E&&!re||(X=E,O=m,I>=0&&I<y.cellMeshes.length&&Ce(I),E>=0&&E<y.cellMeshes.length&&Ce(E))}function xt(){pt(-1,0)}function Lt(u){u&&(W.update(u),te.copy(fe).lerp(W.getFocusTarget(ge),.28),ft.setFollowTarget(te,{strength:u.moving?.16:.1,enabled:!0}))}function At(u){W.setEquippedTool?.(u)}const ht=new Map,Be=new Map,dt=new Map;function gt(u,m){if(m==="winter")return ii.SEED;switch(u){case"EARLY_SEASON":case"TRANSITION":return ii.SPROUT;case"MID_SEASON":return ii.GROWING;case"LATE_SEASON":return ii.GROWING;case"HARVEST":case"GRADE":case"CELEBRATION":return ii.HARVEST;default:return-1}}const Kt=[.22,.34,.22,.12],xn=[.14,.18,.2,.18],Qt=[.055,.08,.105,.12],Cn=new He(15920610),Pt=new He(12043216),en=new He(13152664);function jt(u,m,E,I){const re=Kt[m]??.7,le=xn[m]??.25,ie=Qt[m]??.18;if(u.material.opacity=re,u.material.color.copy(Cn),u.material.alphaTest=.16,I==="winter")u.material.color.lerp(Pt,.5),u.material.opacity*=.82;else if(E&&oi[E]){const se=E==="critical"?.6:.35;u.material.color.lerp(en,se),u.material.opacity*=E==="critical"?.72:.86}u.scale.set(le,le,1),u.position.y=y.soilY+ie,u.renderOrder=12}function Yt(u,m,E){const re=xi(m)==="planner",le=gt(m,E),ie=new Set;for(let se=0;se<u.length;se++){const pe=u[se],ce=`accent-${se}`;if(re||!pe.cropId||le<0){dt.has(ce)&&(o.disposeObject(dt.get(ce)),dt.delete(ce));continue}const ot=h0(pe.cropId,le);if(!ot){dt.has(ce)&&(o.disposeObject(dt.get(ce)),dt.delete(ce));continue}ie.add(ce);const $e=`${pe.cropId}:${le}:${pe.damageState??"none"}:${E}`;if(dt.has(ce)&&dt.get(ce).userData.sig===$e){const dn=dt.get(ce);jt(dn,le,pe.damageState,E);continue}dt.has(ce)&&(o.disposeObject(dt.get(ce)),dt.delete(ce));const Ut=new dr({map:ot,transparent:!0,opacity:Kt[le]??.7,depthWrite:!1,depthTest:!0,sizeAttenuation:!0,alphaTest:.16}),bt=new ur(Ut),ln=Math.floor(se/$t),Wt=se%$t,Xt=y.cellSize,Mt=(Wt-($t-1)/2)*Xt,Nt=(ln-(kn-1)/2)*Xt;bt.position.set(Mt,y.soilY,Nt),bt.userData.sig=$e,bt.userData.cellIndex=se,jt(bt,le,pe.damageState,E),o.trackObject(bt),w.add(bt),dt.set(ce,bt)}for(const[se,pe]of dt)ie.has(se)||(o.disposeObject(pe),dt.delete(se))}const Zt=48,Jn=1.5,fn=[],xo=[15255626,5942123,13912618,8900331,16750916,13391274];{const u=new rt(.012,8,6);for(let m=0;m<Zt;m++){const E=new wn({color:xo[m%xo.length],transparent:!0,opacity:1}),I=new P(u,E);I.visible=!1,I.userData.active=!1,I.userData.age=0,I.userData.vx=0,I.userData.vy=0,I.userData.vz=0,w.add(I),fn.push(I)}}function xr(u){const m=Math.floor(u/$t),I=(u%$t-($t-1)/2)*y.cellSize,re=(m-(kn-1)/2)*y.cellSize,le=y.soilY+.3;let ie=0;for(const se of fn){if(ie>=8)break;if(se.userData.active)continue;se.userData.active=!0,se.userData.age=0,se.position.set(I,le,re);const pe=ie/8*Math.PI*2+Math.sin(u)*.5,ce=.6+ie%3*.2;se.userData.vx=Math.cos(pe)*ce*.3,se.userData.vy=1.2+ie%4*.3,se.userData.vz=Math.sin(pe)*ce*.3,se.visible=!0,se.material.opacity=1,se.scale.setScalar(.8+ie%3*.4),ie++}}function Tr(u){for(const m of fn){if(!m.userData.active)continue;m.userData.age+=u;const E=m.userData.age/Jn;if(E>=1){m.userData.active=!1,m.visible=!1;continue}m.userData.vy-=3.2*u,m.position.x+=m.userData.vx*u,m.position.y+=m.userData.vy*u,m.position.z+=m.userData.vz*u,m.material.opacity=Math.max(0,1-E*E),m.rotation.x+=u*4,m.rotation.z+=u*3}}let Fi=new Set,To=null;function wr(u,m){const E=new We;Tn(E,{tilt:.05,yaw:.032,lift:.012,speed:1.18,phase:.5});const I=new ee({color:4864544,roughness:.9}),re=mn(m,-.02,.06,.04),le=new P(new tt(.018,.025,.55,8),I);le.position.y=.275,le.castShadow=!0,E.add(le);for(let ie=0;ie<4;ie++){const se=ie%2===0?1:-1,pe=Wn(re,{width:.09+ie*.008,height:.15-ie*.01,roughness:.68,bend:.045,cup:.024});pe.position.set(.05*se,.14+ie*.1,.015*se),pe.rotation.y=se*.55+ie*.18,pe.rotation.z=se*(.28+ie*.06),zn(pe,{rotX:.04,rotY:.05,rotZ:.16,lift:.005,speed:1.55+ie*.08,phase:ie*.7}),E.add(pe)}return Hn(E,{count:3,radiusX:.028,radiusZ:.028,height:.46,leafWidth:.07,leafHeight:.11,color:mn(m,.02,.04,.08),roughness:.66,tilt:-.25,bend:.05,cup:.022,liftJitter:.01,phaseOffset:1.2}),E}function br(u,m){const E=new We;Tn(E,{tilt:.035,yaw:.03,lift:.007,speed:1.45,phase:.2}),Hn(E,{count:7,radiusX:.075,radiusZ:.075,height:.015,leafWidth:.085,leafHeight:.14,color:mn(m,-.02,.03,.04),tilt:-1.05,bend:.035,cup:.018,liftJitter:.008}),Hn(E,{count:4,radiusX:.04,radiusZ:.04,height:.045,leafWidth:.06,leafHeight:.11,color:mn(m,.01,.04,.09),tilt:-.72,bend:.05,cup:.018,yawOffset:.35,liftJitter:.006,phaseOffset:.8});const I=new P(new rt(.028,10,8),new ee({color:mn(m,0,.02,.12),roughness:.68}));return I.position.y=.04,I.scale.set(1,.75,1),I.castShadow=!0,E.add(I),E}function Ar(u,m){const E=new We;Tn(E,{tilt:.04,yaw:.026,lift:.008,speed:1.34,phase:1.1}),Hn(E,{count:6,radiusX:.085,radiusZ:.085,height:.018,leafWidth:.1,leafHeight:.17,color:mn(m,-.03,.05,.03),tilt:-1.08,bend:.05,cup:.028,liftJitter:.012}),Hn(E,{count:4,radiusX:.045,radiusZ:.045,height:.05,leafWidth:.07,leafHeight:.12,color:mn(m,0,.03,.08),tilt:-.62,bend:.06,cup:.022,yawOffset:.28,liftJitter:.006,phaseOffset:.7});const I=new P(new rt(.035,10,8),new ee({color:mn(m,.01,.02,.1),roughness:.7}));return I.position.y=.055,I.scale.set(1,.75,1),I.castShadow=!0,E.add(I),E}function Rr(u,m){const E=new We;Tn(E,{tilt:.048,yaw:.02,lift:.007,speed:1.52,phase:.9});const I=4885054;for(let ie=0;ie<6;ie++){const se=Wn(I,{width:.04,height:.16,roughness:.7,bend:.055,cup:.01}),pe=(ie-2)*Math.PI/8;se.position.set(Math.sin(pe)*.02,.08,Math.cos(pe)*.02),se.rotation.x=-.22,se.rotation.z=pe*.78,se.rotation.y=pe,zn(se,{rotX:.05,rotY:.02,rotZ:.18,lift:.005,speed:1.7+ie*.06,phase:ie*.5}),E.add(se)}const re=new ee({color:m,roughness:.8}),le=new P(new rt(.03,10,8),re);return le.position.y=.01,le.scale.set(1,.5,1),E.add(le),E}function Cr(u,m){const E=new We;Tn(E,{tilt:.03,yaw:.022,lift:.008,speed:1.6,phase:.3});const I=new ee({color:5929534,roughness:.85}),re=new ee({color:mn(m,-.01,.04,.06),roughness:.7});for(let le=0;le<3;le++){const ie=le*Math.PI*2/3,se=Math.cos(ie)*.03,pe=Math.sin(ie)*.03,ce=.15+le*.04,ot=new P(new tt(.008,.012,ce,8),I);ot.position.set(se,ce/2,pe),ot.castShadow=!0,E.add(ot);for(const Ut of[-1,1]){const bt=Wn(m,{width:.05,height:.08,roughness:.68,bend:.04,cup:.014});bt.position.set(se+Ut*.016,ce*.55,pe),bt.rotation.y=ie+Ut*.72,bt.rotation.z=Ut*.42,zn(bt,{rotY:.05,rotZ:.12,lift:.003,speed:1.7+le*.1,phase:le*.8+Ut}),E.add(bt)}const $e=new P(new rt(.028,10,8),re);$e.position.set(se,ce+.02,pe),$e.castShadow=!0,E.add($e)}return E}function yr(u,m){const E=new We;Tn(E,{tilt:.028,yaw:.025,lift:.006,speed:1.16,phase:.65});const I=new ee({color:3832378,roughness:.75}),re=new P(new rt(.1,18,14),I);re.position.y=.1,re.scale.set(1.2,.8,1.2),re.castShadow=!0,E.add(re),Hn(E,{count:5,radiusX:.08,radiusZ:.08,height:.06,leafWidth:.085,leafHeight:.13,color:mn(3832378,-.01,.02,.08),tilt:-.7,bend:.04,cup:.02,liftJitter:.01,phaseOffset:.4});const le=m,ie=new ee({color:le,roughness:.5,metalness:.1}),se=[[.06,.14,.05],[-.05,.12,-.06],[.02,.16,-.04]];for(const pe of se){const ce=new P(new rt(.025,10,8),ie);ce.position.set(...pe),ce.castShadow=!0,E.add(ce)}return E}function Pr(u,m){const E=new We;Tn(E,{tilt:.033,yaw:.024,lift:.007,speed:1.24,phase:1.4});const I=new ee({color:5933658,roughness:.85}),re=new P(new tt(.025,.03,.06,8),I);re.position.y=.03,E.add(re);const le=new ee({color:m,roughness:.7}),ie=new P(new rt(.09,10,8),le);ie.position.y=.1,ie.scale.set(1,.75,1),ie.castShadow=!0,E.add(ie);const se=new ee({color:new He(m).offsetHSL(0,-.1,.05),roughness:.7,side:It});for(let pe=0;pe<5;pe++){const ce=pe*Math.PI*2/5,ot=Wn(se.color,{width:.08,height:.14,roughness:.7,bend:.05,cup:.024});ot.position.set(Math.cos(ce)*.075,.03,Math.sin(ce)*.075),ot.rotation.x=-.92,ot.rotation.y=ce+Math.PI/2,ot.rotation.z=Math.sin(pe*1.8)*.2,zn(ot,{rotX:.03,rotY:.05,rotZ:.14,lift:.004,speed:1.35+pe*.06,phase:pe*.6}),E.add(ot)}return E}function Dr(u,m){const E=new We;Tn(E,{tilt:.038,yaw:.028,lift:.008,speed:1.5,phase:.75});const I=new ee({color:4880954,roughness:.85}),re=new P(new tt(.01,.015,.1,8),I);re.position.y=.05,re.castShadow=!0,E.add(re);const le=new ee({color:m,roughness:.5,emissive:m,emissiveIntensity:.15,side:It});for(let ce=0;ce<6;ce++){const ot=ce*Math.PI*2/6,$e=Wn(m,{width:.03,height:.07,roughness:.5,bend:.045,cup:.016});$e.material=le.clone(),$e.position.set(Math.cos(ot)*.035,.12,Math.sin(ot)*.035),$e.rotation.x=-.32,$e.rotation.y=ot+Math.PI/2,$e.rotation.z=Math.sin(ce*1.3)*.12,zn($e,{rotX:.04,rotY:.05,rotZ:.12,lift:.003,speed:1.8+ce*.04,phase:ce*.5}),E.add($e)}const ie=new ee({color:11171618,roughness:.6}),se=new P(new rt(.02,10,8),ie);se.position.y=.12,se.castShadow=!0,E.add(se);const pe=new ee({color:4885054,roughness:.7,side:It});for(let ce=0;ce<3;ce++){const ot=ce*Math.PI*2/3+.3,$e=new P(new un(.04,10),pe);$e.position.set(Math.cos(ot)*.04,.03,Math.sin(ot)*.04),$e.rotation.x=-Math.PI/3,$e.rotation.y=ot,E.add($e)}return E}function Ir(u){const m=Xi(u);if(!m)return null;const E=_0[m.faction]||4885066,I=R0(m.emoji,E);let re=null;switch(m.faction){case"climbers":re=wr(m,I);break;case"fast_cycles":re=br(m,I);break;case"greens":re=Ar(m,I);break;case"roots":re=Rr(m,I);break;case"herbs":re=Cr(m,I);break;case"fruiting":re=yr(m,I);break;case"brassicas":re=Pr(m,I);break;case"companions":re=Dr(m,I);break;default:{const ie=new We,se=new P(new rt(.1,12,10),new ee({color:I,roughness:.75}));se.position.y=.08,se.castShadow=!0,ie.add(se),re=ie;break}}const le={climbers:{radiusX:.085,radiusZ:.07,opacity:.12},fast_cycles:{radiusX:.1,radiusZ:.095,opacity:.13},greens:{radiusX:.12,radiusZ:.11,opacity:.14},roots:{radiusX:.08,radiusZ:.075,opacity:.11},herbs:{radiusX:.09,radiusZ:.08,opacity:.11},fruiting:{radiusX:.115,radiusZ:.105,opacity:.14},brassicas:{radiusX:.12,radiusZ:.115,opacity:.15},companions:{radiusX:.085,radiusZ:.08,opacity:.12},default:{radiusX:.1,radiusZ:.09,opacity:.13}};return b0(re,le[m.faction]||le.default),re}function Lr(){const u=new We,m=new ee({color:9136958,roughness:.95});return[[-.1,.02],[-.04,-.09],[.08,-.06],[.1,.05],[0,.11],[.04,.01]].forEach(([I,re],le)=>{const ie=new P(new rt(.026,8,6),m);ie.position.set(I,.006+le%2*.002,re),ie.rotation.y=le*.55,ie.scale.set(1,.22,.58),u.add(ie)}),u}function Ur(){const u=new We,m=new ee({color:7229744,roughness:.86}),E=new ee({color:12101754,roughness:.8});for(const[re,le,ie]of[[-.08,-.02,.1],[.08,.02,-.1]]){const se=new P(new tt(.012,.015,.62,8),m);se.position.set(re,.31,le),se.rotation.z=ie,se.castShadow=!0,u.add(se)}const I=new P(new tt(.007,.007,.18,6),E);return I.rotation.z=Math.PI/2,I.position.set(0,.38,0),u.add(I),u}function Nr(){const u=new ee({color:12571865,transparent:!0,opacity:.22,roughness:.25,metalness:.15,wireframe:!0}),m=new P(new rt(.18,16,12,0,Math.PI*2,0,Math.PI/2),u);return m.rotation.x=Math.PI,m.position.y=.17,m}function Or(){const u=new ee({color:5942123,transparent:!0,opacity:.35,emissive:4029007,emissiveIntensity:.4,side:It}),m=new P(new Dc(.14,.17,16),u);return m.rotation.x=-Math.PI/2,m.position.y=.01,m}function Fr(){const u=new We,m=new ee({color:9124394,roughness:.9});for(const[E,I,re,le]of[[-.05,-.04,.3,.12],[.06,.03,-.5,.1],[.02,-.08,.8,.08]]){const ie=new P(new tt(.004,.004,le,8),m);ie.position.set(E,.004,I),ie.rotation.z=Math.PI/2,ie.rotation.y=re,u.add(ie)}return u}function Br(){const u=new ee({color:9075290,roughness:.92}),m=new P(new tt(.03,.04,.03,6),u);return m.position.y=.015,m.castShadow=!0,m}function Gr(){const u=new ee({color:15255626,transparent:!0,opacity:.15,emissive:15255626,emissiveIntensity:.3,side:It}),m=new P(new un(.15,12),u);return m.rotation.x=-Math.PI/2,m.position.y=.005,m}function Hr(){const u=new We,m=new ee({color:3811866,roughness:.98});for(const[E,I,re]of[[-.06,-.05,.07],[.05,.04,.06],[0,-.02,.05]]){const le=new P(new un(re,5),m);le.rotation.x=-Math.PI/2,le.position.set(E,.003,I),u.add(le)}return u}function Vr(){const u=new ee({color:8026746,transparent:!0,opacity:.2,side:It}),m=new P(new un(.14,10),u);return m.rotation.x=-Math.PI/2,m.position.y=.004,m}function kr(u){const m=new We,E=u.cropId?Xi(u.cropId):null;let I=!1;return(u.mulched||u.carryForwardType==="mulched")&&(m.add(Lr()),I=!0),E?.support&&(m.add(Ur()),I=!0),u.protected&&(m.add(Nr()),I=!0),u.companionPatched&&(m.add(Or()),I=!0),u.pruned&&!u.cropId&&(m.add(Br()),I=!0),u.eventDamaged&&(m.add(Fr()),I=!0),u.carryForwardType==="enriched"&&(m.add(Gr()),I=!0),u.carryForwardType==="compacted"&&(m.add(Hr()),I=!0),(u.soilFatigue??0)>.1&&(m.add(Vr()),I=!0),I?m:null}function zr(u,m){return m==="winter"?.52:u==="MID_SEASON"?.7:u==="LATE_SEASON"||u==="HARVEST"||u==="TRANSITION"?1:.4}function wo(u,m,E){const I=m?oi[m]:null,re=E==="winter";u.userData.restRotationZ=I?-I.tilt:re?-.04:0,u.userData.restRotationX=0,u.userData.restRotationY=u.userData.basePlacementRotationY??0,u.rotation.z=u.userData.restRotationZ,u.rotation.x=u.userData.restRotationX,u.rotation.y=u.userData.restRotationY,u.position.y=y.soilY,u.traverse(le=>{!le.isMesh||!le.material?.color||(le.material.userData._baseColor||(le.material.userData._baseColor=le.material.color.clone()),le.material.color.copy(le.material.userData._baseColor),le.material.emissive?.setHex(0),le.material.emissiveIntensity=0,re&&(le.material.color.lerp(M0,.7),le.material.emissive&&(le.material.emissive.setHex(E0),le.material.emissiveIntensity=.04)),I&&(le.material.color.lerp(new He(I.tint),.42),le.material.emissive&&(le.material.emissive.setHex(I.emissive),le.material.emissiveIntensity=Math.max(.08,I.emissiveIntensity*.45))))})}function Wr(u,m,E){const I=new Set,re=zr(m,E);for(let ie=0;ie<u.length;ie++){const se=u[ie],pe=`cell-${ie}`;if(!se.cropId){ht.has(pe)&&(o.disposeObject(ht.get(pe)),ht.delete(pe));continue}if(I.add(pe),ht.has(pe)){const Xt=ht.get(pe);if(Xt.userData.cropId===se.cropId){const Mt=Math.floor(ie/$t),Nt=ie%$t,dn=y.cellSize,hi=(Nt-($t-1)/2)*dn,os=(Mt-(kn-1)/2)*dn,ei=Xt.userData.anchor??io(ie,"crop");Xt.userData.anchor=ei,Xt.userData.basePlacementRotationY=ei.rotationY,Xt.position.x=hi+ei.xOffset,Xt.position.z=os+ei.zOffset,Xt.scale.setScalar(re*ei.scale),wo(Xt,se.damageState,E);continue}o.disposeObject(Xt),ht.delete(pe)}const ce=Ir(se.cropId);if(!ce)continue;o.trackObject(ce);const ot=Math.floor(ie/$t),$e=ie%$t,Ut=y.cellSize,bt=($e-($t-1)/2)*Ut,ln=(ot-(kn-1)/2)*Ut,Wt=io(ie,"crop");ce.userData.anchor=Wt,ce.userData.basePlacementRotationY=Wt.rotationY,ce.position.set(bt+Wt.xOffset,y.soilY,ln+Wt.zOffset),ce.scale.setScalar(re*Wt.scale),ce.userData.cropId=se.cropId,ce.userData.cellIndex=ie,wo(ce,se.damageState,E),w.add(ce),ht.set(pe,ce)}for(const[ie,se]of ht)!I.has(ie)&&ie.startsWith("cell-")&&(o.disposeObject(se),ht.delete(ie));const le=xi(m)==="celebration";if(m!==To&&(Fi.clear(),To=m),le)for(let ie=0;ie<u.length;ie++)u[ie].cropId&&!Fi.has(ie)&&(Fi.add(ie),xr(ie))}function Xr(u,m){for(const E of ht.values()){const I=E.userData.sway;if(!I)continue;const re=I.phase+(E.userData.cellIndex??0)*.67,le=Math.sin(u*I.speed+re),ie=Math.sin(u*I.speed*.55+re*1.4),se=Math.cos(u*I.speed*.34+re);E.rotation.x=(E.userData.restRotationX??0)+se*I.tilt*.12*m,E.rotation.y=(E.userData.restRotationY??0)+ie*I.yaw*m,E.rotation.z=(E.userData.restRotationZ??0)+le*I.tilt*m,E.position.y=y.soilY+Math.max(0,le)*I.lift*m,E.traverse(pe=>{const ce=pe.userData?.breeze;if(!ce)return;const ot=Math.sin(u*ce.speed+re+ce.phase),$e=Math.cos(u*ce.speed*.58+re*.7+ce.phase);pe.rotation.x=ce.baseRotationX+$e*ce.rotX*m,pe.rotation.y=ce.baseRotationY+$e*ce.rotY*m,pe.rotation.z=ce.baseRotationZ+ot*ce.rotZ*m,pe.position.y=ce.basePositionY+Math.max(0,ot)*ce.lift*m})}}function Yr(u){const m=new Set;for(let E=0;E<u.length;E++){const I=u[E],re=`support-${E}`,le=JSON.stringify({cropId:I.cropId,support:!!(I.cropId&&Xi(I.cropId)?.support),mulched:!!(I.mulched||I.carryForwardType==="mulched"),protected:!!I.protected,companionPatched:!!I.companionPatched,pruned:!!I.pruned,eventDamaged:!!I.eventDamaged,carryForwardType:I.carryForwardType||null,soilFatigue:Math.round((I.soilFatigue??0)*10)});if(Be.has(re)&&Be.get(re).userData.signature===le){m.add(re);continue}const ie=kr(I);if(!ie){Be.has(re)&&(o.disposeObject(Be.get(re)),Be.delete(re));continue}m.add(re),Be.has(re)&&(o.disposeObject(Be.get(re)),Be.delete(re)),o.trackObject(ie);const se=Math.floor(E/$t),ce=(E%$t-($t-1)/2)*y.cellSize,ot=(se-(kn-1)/2)*y.cellSize,$e=io(E,"support");ie.position.set(ce+$e.xOffset,y.soilY,ot+$e.zOffset),ie.rotation.y=$e.rotationY,ie.userData.signature=le,w.add(ie),Be.set(re,ie)}for(const[E,I]of Be)m.has(E)||(o.disposeObject(I),Be.delete(E))}function Bi(u){const m=Ka[u]||Ka.spring,E=m.sunAngle*Math.PI/180;T={background:new He(m.sky),fogColor:new He(m.sky),fogDensity:m.fogDensity,hemiSky:new He(m.sky),hemiGround:new He(m.ground),hemiIntensity:m.ambInt,sunColor:new He(16774366),sunIntensity:m.sunInt,sunPosition:new at(m.sunX,8*Math.sin(E),m.sunZ),fillColor:new He(9349308),fillIntensity:m.fillInt,fillPosition:new at(m.fillX,4.4+Math.sin(E)*.5,m.fillZ),rimColor:new He(14149365),rimIntensity:.18,rimPosition:new at(-4.4,3.1,-4.7)},me({force:!0}),F.updateSeason(u);const I={spring:{r:.3,g:.46,b:.22},summer:{r:.24,g:.4,b:.18},fall:{r:.44,g:.38,b:.2},winter:{r:.32,g:.32,b:.28}},re=I[u]||I.spring;D.traverse(le=>{if(le.isMesh&&le.material?.color){const ie=.85+Math.random()*.3;le.material.color.setRGB(re.r*ie,re.g*ie,re.b*ie)}}),D.visible=u!=="winter",je.visible=u==="fall",mt.visible=u==="winter",st.visible=u==="spring",Bt.visible=u==="summer",u==="winter"&&(_t.visible=!1),F.showFireflies(u==="winter"),F.showPuddles(u==="spring")}function qr(u=b){const m={planner:{gridOpacity:.16,guardOpacity:.15,trellisOpacity:.5,labelsVisible:!0,labelOpacity:.92,markerOpacity:1},story:{gridOpacity:.05,guardOpacity:.06,trellisOpacity:.34,labelsVisible:!1,labelOpacity:0,markerOpacity:.34},celebration:{gridOpacity:.035,guardOpacity:.04,trellisOpacity:.28,labelsVisible:!1,labelOpacity:0,markerOpacity:.24}}[u]||{gridOpacity:.08,guardOpacity:.08,trellisOpacity:.38,labelsVisible:!1,labelOpacity:0,markerOpacity:.3};y.gridLineMeshes?.forEach(E=>{E.visible=m.gridOpacity>.01,E.material&&(E.material.transparent=!0,E.material.opacity=m.gridOpacity)}),y.guardMeshes?.forEach(E=>{E.visible=m.guardOpacity>.01,E.material&&(E.material.transparent=!0,E.material.opacity=m.guardOpacity)}),y.trellisWireMeshes?.forEach(E=>{E.material&&(E.material.transparent=!0,E.material.opacity=m.trellisOpacity)}),y.labelSprites?.forEach(E=>{E.visible=m.labelsVisible,E.material&&(E.material.opacity=m.labelOpacity)}),y.labelMarkers?.forEach(E=>{E.material&&(E.material.transparent=!0,E.material.opacity=m.markerOpacity,E.material.emissiveIntensity=.08+m.markerOpacity*.18)})}let bo=null;function Kr(u,m={}){const E=g0[u];E&&(l={startedAt:performance.now(),duration:m.duration??800,fromPosition:a.position.clone(),fromTarget:c.clone(),fromFov:a.fov,toPosition:new at(...E.position),toTarget:new at(...E.target),toFov:E.fov})}function Ao(u,m={}){const E=v0[u];E&&(g={startedAt:performance.now(),duration:m.duration??1200,fromFogColor:i.fog.color.clone(),fromFogDensity:i.fog.density,fromAmbientIntensity:et.intensity,fromAmbientColor:et.color.clone(),fromFillIntensity:_e.intensity,fromSkyTint:R.color.clone(),toFogColor:new He(E.fogColor),toFogDensity:E.fogDensity,toAmbientIntensity:E.ambientIntensity,toAmbientColor:new He(E.ambientColor),toFillIntensity:E.fillIntensity,toSkyTint:new He(E.skyTint)},Ft.visible=u==="night",F.showFireflies(u==="night"))}function Zr(){Ao("calm",{duration:600})}function $r(u){Ro(u,15255626,650)}function Qr(u,m={}){if(u==="sheepdog-bed"){oe.active=!1,oe.fadeOutMs=0,Se.active=!0,Se.remainingMs=m.cueDuration??1600,Se.position.set(m.cueFromX??.15,0,m.cueFromZ??.34),Xe(),s.visible=!0,Qe.position.copy(Se.position),Qe.rotation.y=-.55,Qe.visible=!0;return}u==="sheepdog-run"&&(Se.active=!1,oe.active=!0,oe.elapsedMs=0,oe.fadeOutMs=0,oe.duration=m.cueDuration??2600,oe.arcHeight=m.cueArcHeight??.1,oe.sway=m.cueSway??.18,oe.start.set(m.cueFromX??-4.15,0,m.cueFromZ??2.1),oe.end.set(m.cueToX??4.7,0,m.cueToZ??1.88),Xe(),Qe.position.copy(oe.start),Qe.visible=!0)}function jr(u){if(l){const m=Math.min((u-l.startedAt)/l.duration,1),E=oo(m);a.position.lerpVectors(l.fromPosition,l.toPosition,E),c.lerpVectors(l.fromTarget,l.toTarget,E),a.fov=l.fromFov+(l.toFov-l.fromFov)*E,a.updateProjectionMatrix(),a.lookAt(c),m>=1&&(l=null)}if(g){const m=Math.min((u-g.startedAt)/g.duration,1),E=oo(m);i.fog.color.lerpColors(g.fromFogColor,g.toFogColor,E),i.fog.density=g.fromFogDensity+(g.toFogDensity-g.fromFogDensity)*E,et.intensity=g.fromAmbientIntensity+(g.toAmbientIntensity-g.fromAmbientIntensity)*E,et.color.lerpColors(g.fromAmbientColor,g.toAmbientColor,E),_e.intensity=g.fromFillIntensity+(g.toFillIntensity-g.fromFillIntensity)*E,R.color.lerpColors(g.fromSkyTint,g.toSkyTint,E),m>=1&&(g=null)}}function Jr(u,m){const E=x.domElement.getBoundingClientRect();Rt.x=(u-E.left)/E.width*2-1,Rt.y=-((m-E.top)/E.height)*2+1,Ot.setFromCamera(Rt,a);const I=Ot.intersectObjects(y.cellMeshes);return I.length>0?I[0].object.userData.cellIndex:-1}function es(){return y.cellMeshes.map((u,m)=>{u.updateWorldMatrix(!0,!1),u.getWorldPosition(we),u.geometry&&!u.geometry.boundingBox&&u.geometry.computeBoundingBox();const E=u.geometry?.boundingBox?(u.geometry.boundingBox.max.x-u.geometry.boundingBox.min.x)*u.scale.x:.25,I=u.geometry?.boundingBox?(u.geometry.boundingBox.max.z-u.geometry.boundingBox.min.z)*u.scale.z:.25;return{index:m,x:we.x,y:we.y,z:we.z,width:E,depth:I}})}function ts(u){return u?(he.set(u.x??0,u.y??0,u.z??0),he.project(a),{x:(he.x*.5+.5)*x.domElement.clientWidth,y:(-he.y*.5+.5)*x.domElement.clientHeight,visible:he.z>=-1&&he.z<=1&&he.x>=-1.05&&he.x<=1.05&&he.y>=-1.05&&he.y<=1.05}):null}function Ro(u,m,E){if(u<0||u>=y.cellMeshes.length)return;y.cellMeshes[u].material.color.set(m),setTimeout(()=>{Ce(u)},E||400)}function ns(u=[]){Rn=new Set(u);for(let m=0;m<y.cellMeshes.length;m++)Ce(m)}function is(){Rn.clear(),sn=-1;for(let u=0;u<y.cellMeshes.length;u++)Ce(u)}return Bi("spring"),{canvas:x.domElement,resize(u,m){x.setSize(u,m,!1),a.aspect=u/m,a.updateProjectionMatrix()},sync(u){z=u,f=u.season.grid;const m=u.season.season!==U||!T;U=u.season.season;for(let ie=0;ie<y.cellMeshes.length;ie++)Ce(ie);Wr(u.season.grid,u.season.phase,u.season.season),Yr(u.season.grid),Yt(u.season.grid,u.season.phase,u.season.season),m&&Bi(u.season.season),u.season.season!==bo&&(bo=u.season.season,xe.triggerForEvent(null,u.season.season),Ae.setSeason?.(u.season.season)),Ae.setEnabled(!!u.settings?.dayNightEnabled),F.showPlanningProps(u.season.phase==="PLANNING"),F.showNarrativeProps(u.season.chapter??1,u.campaign??[]),xe.update(.016),ft.update(),jr(performance.now());const E=u.season?.currentEvent??null,I=E?.title??"",re=E?.category??"",le=E?.valence??"";q.visible=re==="critter"&&(I.toLowerCase().includes("cat")||I.toLowerCase().includes("alley")),Z.visible=re==="neighbor"&&le==="positive"},render(){Ae.update(1/60);const u=performance.now()*.001,m=z?.season?.currentEvent??null,E=m?.category==="weather"&&(m?.title?.toLowerCase().includes("wind")||m?.title?.toLowerCase().includes("storm"));if(E&&Fe.length>0)for(const{mesh:se,baseX:pe}of Fe)se.position.x=pe+Math.sin(u*8)*.003;else for(const{mesh:se,baseX:pe}of Fe)se.position.x=pe;performance.now();const I=1/60;if(Pe+=I,Bt.visible&&H.forEach(({mesh:se,baseX:pe,baseY:ce,baseZ:ot,phase:$e,speed:Ut})=>{se.position.x=pe+Math.sin(Pe*Ut+$e)*.08,se.position.y=ce+Math.sin(Pe*Ut*1.3+$e+1)*.04,se.position.z=ot+Math.cos(Pe*Ut*.7+$e)*.06,se.quaternion.copy(a.quaternion)}),rn+=I,rn>4+Math.sin(Pe*.17)*2){rn=0,zt=Math.sin(Pe*137.5)>0;const se=z?.season?.season??"spring";_t.visible=zt&&se!=="winter"}_t.visible&&(_t.position.y=1.105+Math.sin(Pe*1.7)*.008,_t.rotation.z=Math.sin(Pe*1.5)*.08);const re=z?.season?.season??"spring",ie=({spring:.95,summer:.72,fall:1.08,winter:.45}[re]??.85)*(E?1.9:1);if(Xr(Pe,ie),Se.active&&(Se.remainingMs-=I*1e3,Qe.visible=!0,Qe.position.copy(Se.position),Ve.position.y=.34+Math.sin(u*3.4)*.012,De.rotation.z=Math.sin(u*2.1)*.03,K.rotation.y=Math.sin(u*4.1)*.22,K.rotation.z=.34+Math.cos(u*4.1)*.06,s.position.y=.62+Math.sin(u*2.8)*.015,Se.remainingMs<=0&&(Se.active=!1)),oe.active){oe.elapsedMs+=I*1e3;const se=Math.min(oe.elapsedMs/oe.duration,1),pe=oo(se),ce=1-Math.abs(se-.5)*1.2,ot=8+ce*6,$e=pe*Math.PI*ot,Ut=new at().lerpVectors(oe.start,oe.end,pe),bt=Math.abs(Math.sin($e))*oe.arcHeight*ce,ln=Math.sin(se*Math.PI)*oe.sway;Qe.visible=!0,Qe.position.set(Ut.x,0,Ut.z+ln);const Wt=oe.end.clone().sub(oe.start).normalize();Qe.rotation.y=Math.atan2(Wt.x,Wt.z),_.visible=!0,_.rotation.x=Math.sin($e*1.3)*.12,Te.scale.setScalar(1-bt*1.9),Te.material.opacity=.24-bt*.7,Ve.position.y=.34+bt,Ve.rotation.z=Math.sin($e)*.06*ce,Ve.rotation.x=Math.cos($e*.5)*.04*ce,De.rotation.z=Math.sin($e+.35)*.08*ce,De.rotation.x=-.05+Math.cos($e+.4)*.04;const Xt=se<.3?1.4:se>.8?.6:1;if(K.rotation.y=Math.sin($e*.92)*.5*Xt,K.rotation.z=.28+Math.cos($e*.92)*.14*Xt,de.forEach((Mt,Nt)=>{Mt.rotation.z=(Nt===0?1:-1)*.08+Math.sin($e+Nt)*.05*ce,Mt.rotation.x=-.08+Math.cos($e+Nt)*.04}),Ee.forEach(({hipPivot:Mt,kneePivot:Nt,phase:dn})=>{const hi=$e+dn;Mt.rotation.z=Math.sin(hi)*.85*ce,Nt.rotation.z=-.28+Math.max(0,Math.sin(hi+.6))*.95*ce}),Math.sin($e)>.9&&ce>.5){const Mt=Ue.find(Nt=>!Nt.userData.active);Mt&&(Mt.userData.active=!0,Mt.userData.age=0,Mt.position.set((Math.random()-.5)*.15,.02,(Math.random()-.5)*.1),Mt.visible=!0,Mt.scale.setScalar(.6))}Ue.forEach(Mt=>{if(!Mt.userData.active)return;Mt.userData.age+=I*1e3;const Nt=Mt.userData.age/Mt.userData.maxAge;Mt.material.opacity=Math.max(0,.35*(1-Nt)),Mt.scale.setScalar(.6+Nt*1.2),Mt.position.y+=I*.15,Nt>=1&&(Mt.userData.active=!1,Mt.visible=!1)}),se>=1&&(oe.active=!1,oe.fadeOutMs=400,_.visible=!1,Ue.forEach(Mt=>{Mt.userData.active=!1,Mt.visible=!1}))}if(oe.fadeOutMs>0){oe.fadeOutMs-=I*1e3;const se=Math.max(0,oe.fadeOutMs/400);Qe.visible=!0,Qe.traverse(pe=>{pe.isMesh&&pe.material&&(pe.material.transparent=!0,pe.material.opacity=se)}),oe.fadeOutMs<=0&&(Qe.visible=!1,Qe.traverse(pe=>{pe.isMesh&&pe.material&&(pe.material.transparent=!1,pe.material.opacity=1)}),Te.scale.setScalar(1),Te.material.opacity=.22,Ve.position.y=.34,Ve.rotation.z=0,Ve.rotation.x=0,De.rotation.z=0,De.rotation.x=0,K.rotation.y=0,K.rotation.z=.28,de.forEach(pe=>{pe.rotation.z=0,pe.rotation.x=0}),Ee.forEach(({hipPivot:pe,kneePivot:ce})=>{pe.rotation.z=0,ce.rotation.z=-.28}))}else Se.active||(Qe.visible=!1);F.updateClouds(I),F.updateBreeze(Pe,ie),z?.season?.season==="winter"&&F.updateSmoke(I),F.updateFireflies(I),Tr(I),x.render(i,a)},applySeason:Bi,raycastCell:Jr,getGridLayout:es,projectWorldPosition:ts,updatePointer:it,clearPointerHover:Ke,setInteractionHighlight:pt,clearInteractionHighlight:xt,flashCell:Ro,setTargetableCells:ns,clearTargeting:is,setPlayerState:Lt,setPlayerTool:At,setScenePhase:Ie,setSceneStyle:ae,setDayNightEnabled(u){Ae.setEnabled(!!u)},setCameraPreset:Kr,applyCameraOrbitDelta(u,m){ft.applyOrbitDelta(u,m)},applyMood:Ao,resetMood:Zr,pulseEventFocus:$r,playSceneCue:Qr,weather:xe,dayNight:Ae,getRenderer(){return x},getResourceTracker(){return o},dispose(){C0({container:e,renderer:x,scene:i,weather:xe,dayNight:Ae,cameraController:ft,resourceTracker:o,cropMeshes:ht,supportMeshes:Be,accentMeshes:dt})}}}export{I0 as createGardenScene,C0 as disposeGardenScene};
//# sourceMappingURL=garden-scene-D3gvzrdw.js.map
