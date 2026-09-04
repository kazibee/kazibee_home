const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./main.js","./main-BYxnE2PG.css"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const c of document.querySelectorAll('link[rel="modulepreload"]'))i(c);new MutationObserver(c=>{for(const s of c)if(s.type==="childList")for(const f of s.addedNodes)f.tagName==="LINK"&&f.rel==="modulepreload"&&i(f)}).observe(document,{childList:!0,subtree:!0});function n(c){const s={};return c.integrity&&(s.integrity=c.integrity),c.referrerPolicy&&(s.referrerPolicy=c.referrerPolicy),c.crossOrigin==="use-credentials"?s.credentials="include":c.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(c){if(c.ep)return;c.ep=!0;const s=n(c);fetch(c.href,s)}})();const Vt="modulepreload",$t=function(e,t){return new URL(e,t).href},ft={},qt=function(t,n,i){let c=Promise.resolve();if(n&&n.length>0){const f=document.getElementsByTagName("link"),k=document.querySelector("meta[property=csp-nonce]"),b=(k==null?void 0:k.nonce)||(k==null?void 0:k.getAttribute("nonce"));c=Promise.allSettled(n.map(y=>{if(y=$t(y,i),y in ft)return;ft[y]=!0;const R=y.endsWith(".css"),x=R?'[rel="stylesheet"]':"";if(!!i)for(let E=f.length-1;E>=0;E--){const S=f[E];if(S.href===y&&(!R||S.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${y}"]${x}`))return;const w=document.createElement("link");if(w.rel=R?"stylesheet":Vt,R||(w.as="script"),w.crossOrigin="",w.href=y,b&&w.setAttribute("nonce",b),document.head.appendChild(w),R)return new Promise((E,S)=>{w.addEventListener("load",E),w.addEventListener("error",()=>S(new Error(`Unable to preload CSS for ${y}`)))})}))}function s(f){const k=new Event("vite:preloadError",{cancelable:!0});if(k.payload=f,window.dispatchEvent(k),!k.defaultPrevented)throw f}return c.then(f=>{for(const k of f||[])k.status==="rejected"&&s(k.reason);return t().catch(s)})},vt=globalThis;typeof vt.global>"u"&&(vt.global=globalThis);/*! *****************************************************************************
Copyright (C) Microsoft. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */var _t;(function(e){(function(t){var n=typeof globalThis=="object"||typeof globalThis=="object"?globalThis:typeof self=="object"?self:typeof this=="object"?this:k(),i=c(e);typeof n.Reflect<"u"&&(i=c(n.Reflect,i)),t(i,n),typeof n.Reflect>"u"&&(n.Reflect=e);function c(b,y){return function(R,x){Object.defineProperty(b,R,{configurable:!0,writable:!0,value:x}),y&&y(R,x)}}function s(){try{return Function("return this;")()}catch{}}function f(){try{return(0,eval)("(function() { return this; })()")}catch{}}function k(){return s()||f()}})(function(t,n){var i=Object.prototype.hasOwnProperty,c=typeof Symbol=="function",s=c&&typeof Symbol.toPrimitive<"u"?Symbol.toPrimitive:"@@toPrimitive",f=c&&typeof Symbol.iterator<"u"?Symbol.iterator:"@@iterator",k=typeof Object.create=="function",b={__proto__:[]}instanceof Array,y=!k&&!b,R={create:k?function(){return Y(Object.create(null))}:b?function(){return Y({__proto__:null})}:function(){return Y({})},has:y?function(r,a){return i.call(r,a)}:function(r,a){return a in r},get:y?function(r,a){return i.call(r,a)?r[a]:void 0}:function(r,a){return r[a]}},x=Object.getPrototypeOf(Function),I=typeof Map=="function"&&typeof Map.prototype.entries=="function"?Map:He(),w=typeof Set=="function"&&typeof Set.prototype.entries=="function"?Set:Ye(),E=typeof WeakMap=="function"?WeakMap:Ze(),S=c?Symbol.for("@reflect-metadata:registry"):void 0,B=Ve(),L=$e(B);function te(r,a,o,l){if(_(o)){if(!ue(r))throw new TypeError;if(!de(a))throw new TypeError;return je(r,a)}else{if(!ue(r))throw new TypeError;if(!M(a))throw new TypeError;if(!M(l)&&!_(l)&&!W(l))throw new TypeError;return W(l)&&(l=void 0),o=D(o),Le(r,a,o,l)}}t("decorate",te);function z(r,a){function o(l,v){if(!M(l))throw new TypeError;if(!_(v)&&!Ne(v))throw new TypeError;oe(r,a,l,v)}return o}t("metadata",z);function Q(r,a,o,l){if(!M(o))throw new TypeError;return _(l)||(l=D(l)),oe(r,a,o,l)}t("defineMetadata",Q);function N(r,a,o){if(!M(a))throw new TypeError;return _(o)||(o=D(o)),ne(r,a,o)}t("hasMetadata",N);function U(r,a,o){if(!M(a))throw new TypeError;return _(o)||(o=D(o)),$(r,a,o)}t("hasOwnMetadata",U);function Ce(r,a,o){if(!M(a))throw new TypeError;return _(o)||(o=D(o)),re(r,a,o)}t("getMetadata",Ce);function xe(r,a,o){if(!M(a))throw new TypeError;return _(o)||(o=D(o)),ae(r,a,o)}t("getOwnMetadata",xe);function Ae(r,a){if(!M(r))throw new TypeError;return _(a)||(a=D(a)),ie(r,a)}t("getMetadataKeys",Ae);function De(r,a){if(!M(r))throw new TypeError;return _(a)||(a=D(a)),se(r,a)}t("getOwnMetadataKeys",De);function Be(r,a,o){if(!M(a))throw new TypeError;if(_(o)||(o=D(o)),!M(a))throw new TypeError;_(o)||(o=D(o));var l=F(a,o,!1);return _(l)?!1:l.OrdinaryDeleteMetadata(r,a,o)}t("deleteMetadata",Be);function je(r,a){for(var o=r.length-1;o>=0;--o){var l=r[o],v=l(a);if(!_(v)&&!W(v)){if(!de(v))throw new TypeError;a=v}}return a}function Le(r,a,o,l){for(var v=r.length-1;v>=0;--v){var C=r[v],P=C(a,o,l);if(!_(P)&&!W(P)){if(!M(P))throw new TypeError;l=P}}return l}function ne(r,a,o){var l=$(r,a,o);if(l)return!0;var v=H(a);return W(v)?!1:ne(r,v,o)}function $(r,a,o){var l=F(a,o,!1);return _(l)?!1:le(l.OrdinaryHasOwnMetadata(r,a,o))}function re(r,a,o){var l=$(r,a,o);if(l)return ae(r,a,o);var v=H(a);if(!W(v))return re(r,v,o)}function ae(r,a,o){var l=F(a,o,!1);if(!_(l))return l.OrdinaryGetOwnMetadata(r,a,o)}function oe(r,a,o,l){var v=F(o,l,!0);v.OrdinaryDefineOwnMetadata(r,a,o,l)}function ie(r,a){var o=se(r,a),l=H(r);if(l===null)return o;var v=ie(l,a);if(v.length<=0)return o;if(o.length<=0)return v;for(var C=new w,P=[],m=0,u=o;m<u.length;m++){var d=u[m],h=C.has(d);h||(C.add(d),P.push(d))}for(var p=0,g=v;p<g.length;p++){var d=g[p],h=C.has(d);h||(C.add(d),P.push(d))}return P}function se(r,a){var o=F(r,a,!1);return o?o.OrdinaryOwnMetadataKeys(r,a):[]}function ce(r){if(r===null)return 1;switch(typeof r){case"undefined":return 0;case"boolean":return 2;case"string":return 3;case"symbol":return 4;case"number":return 5;case"object":return r===null?1:6;default:return 6}}function _(r){return r===void 0}function W(r){return r===null}function We(r){return typeof r=="symbol"}function M(r){return typeof r=="object"?r!==null:typeof r=="function"}function Fe(r,a){switch(ce(r)){case 0:return r;case 1:return r;case 2:return r;case 3:return r;case 4:return r;case 5:return r}var o="string",l=he(r,s);if(l!==void 0){var v=l.call(r,o);if(M(v))throw new TypeError;return v}return ze(r)}function ze(r,a){var o,l;{var v=r.toString;if(G(v)){var l=v.call(r);if(!M(l))return l}var o=r.valueOf;if(G(o)){var l=o.call(r);if(!M(l))return l}}throw new TypeError}function le(r){return!!r}function Ge(r){return""+r}function D(r){var a=Fe(r);return We(a)?a:Ge(a)}function ue(r){return Array.isArray?Array.isArray(r):r instanceof Object?r instanceof Array:Object.prototype.toString.call(r)==="[object Array]"}function G(r){return typeof r=="function"}function de(r){return typeof r=="function"}function Ne(r){switch(ce(r)){case 3:return!0;case 4:return!0;default:return!1}}function q(r,a){return r===a||r!==r&&a!==a}function he(r,a){var o=r[a];if(o!=null){if(!G(o))throw new TypeError;return o}}function pe(r){var a=he(r,f);if(!G(a))throw new TypeError;var o=a.call(r);if(!M(o))throw new TypeError;return o}function fe(r){return r.value}function ve(r){var a=r.next();return a.done?!1:a}function _e(r){var a=r.return;a&&a.call(r)}function H(r){var a=Object.getPrototypeOf(r);if(typeof r!="function"||r===x||a!==x)return a;var o=r.prototype,l=o&&Object.getPrototypeOf(o);if(l==null||l===Object.prototype)return a;var v=l.constructor;return typeof v!="function"||v===r?a:v}function Ue(){var r;!_(S)&&typeof n.Reflect<"u"&&!(S in n.Reflect)&&typeof n.Reflect.defineMetadata=="function"&&(r=qe(n.Reflect));var a,o,l,v=new E,C={registerProvider:P,getProvider:u,setProvider:h};return C;function P(p){if(!Object.isExtensible(C))throw new Error("Cannot add provider to a frozen registry.");switch(!0){case r===p:break;case _(a):a=p;break;case a===p:break;case _(o):o=p;break;case o===p:break;default:l===void 0&&(l=new w),l.add(p);break}}function m(p,g){if(!_(a)){if(a.isProviderFor(p,g))return a;if(!_(o)){if(o.isProviderFor(p,g))return a;if(!_(l))for(var T=pe(l);;){var O=ve(T);if(!O)return;var A=fe(O);if(A.isProviderFor(p,g))return _e(T),A}}}if(!_(r)&&r.isProviderFor(p,g))return r}function u(p,g){var T=v.get(p),O;return _(T)||(O=T.get(g)),_(O)&&(O=m(p,g),_(O)||(_(T)&&(T=new I,v.set(p,T)),T.set(g,O))),O}function d(p){if(_(p))throw new TypeError;return a===p||o===p||!_(l)&&l.has(p)}function h(p,g,T){if(!d(T))throw new Error("Metadata provider not registered.");var O=u(p,g);if(O!==T){if(!_(O))return!1;var A=v.get(p);_(A)&&(A=new I,v.set(p,A)),A.set(g,T)}return!0}}function Ve(){var r;return!_(S)&&M(n.Reflect)&&Object.isExtensible(n.Reflect)&&(r=n.Reflect[S]),_(r)&&(r=Ue()),!_(S)&&M(n.Reflect)&&Object.isExtensible(n.Reflect)&&Object.defineProperty(n.Reflect,S,{enumerable:!1,configurable:!1,writable:!1,value:r}),r}function $e(r){var a=new E,o={isProviderFor:function(d,h){var p=a.get(d);return _(p)?!1:p.has(h)},OrdinaryDefineOwnMetadata:P,OrdinaryHasOwnMetadata:v,OrdinaryGetOwnMetadata:C,OrdinaryOwnMetadataKeys:m,OrdinaryDeleteMetadata:u};return B.registerProvider(o),o;function l(d,h,p){var g=a.get(d),T=!1;if(_(g)){if(!p)return;g=new I,a.set(d,g),T=!0}var O=g.get(h);if(_(O)){if(!p)return;if(O=new I,g.set(h,O),!r.setProvider(d,h,o))throw g.delete(h),T&&a.delete(d),new Error("Wrong provider for target.")}return O}function v(d,h,p){var g=l(h,p,!1);return _(g)?!1:le(g.has(d))}function C(d,h,p){var g=l(h,p,!1);if(!_(g))return g.get(d)}function P(d,h,p,g){var T=l(p,g,!0);T.set(d,h)}function m(d,h){var p=[],g=l(d,h,!1);if(_(g))return p;for(var T=g.keys(),O=pe(T),A=0;;){var ke=ve(O);if(!ke)return p.length=A,p;var Je=fe(ke);try{p[A]=Je}catch(Qe){try{_e(O)}finally{throw Qe}}A++}}function u(d,h,p){var g=l(h,p,!1);if(_(g)||!g.delete(d))return!1;if(g.size===0){var T=a.get(h);_(T)||(T.delete(p),T.size===0&&a.delete(T))}return!0}}function qe(r){var a=r.defineMetadata,o=r.hasOwnMetadata,l=r.getOwnMetadata,v=r.getOwnMetadataKeys,C=r.deleteMetadata,P=new E,m={isProviderFor:function(u,d){var h=P.get(u);return!_(h)&&h.has(d)?!0:v(u,d).length?(_(h)&&(h=new w,P.set(u,h)),h.add(d),!0):!1},OrdinaryDefineOwnMetadata:a,OrdinaryHasOwnMetadata:o,OrdinaryGetOwnMetadata:l,OrdinaryOwnMetadataKeys:v,OrdinaryDeleteMetadata:C};return m}function F(r,a,o){var l=B.getProvider(r,a);if(!_(l))return l;if(o){if(B.setProvider(r,a,L))return L;throw new Error("Illegal state.")}}function He(){var r={},a=[],o=function(){function m(u,d,h){this._index=0,this._keys=u,this._values=d,this._selector=h}return m.prototype["@@iterator"]=function(){return this},m.prototype[f]=function(){return this},m.prototype.next=function(){var u=this._index;if(u>=0&&u<this._keys.length){var d=this._selector(this._keys[u],this._values[u]);return u+1>=this._keys.length?(this._index=-1,this._keys=a,this._values=a):this._index++,{value:d,done:!1}}return{value:void 0,done:!0}},m.prototype.throw=function(u){throw this._index>=0&&(this._index=-1,this._keys=a,this._values=a),u},m.prototype.return=function(u){return this._index>=0&&(this._index=-1,this._keys=a,this._values=a),{value:u,done:!0}},m}(),l=function(){function m(){this._keys=[],this._values=[],this._cacheKey=r,this._cacheIndex=-2}return Object.defineProperty(m.prototype,"size",{get:function(){return this._keys.length},enumerable:!0,configurable:!0}),m.prototype.has=function(u){return this._find(u,!1)>=0},m.prototype.get=function(u){var d=this._find(u,!1);return d>=0?this._values[d]:void 0},m.prototype.set=function(u,d){var h=this._find(u,!0);return this._values[h]=d,this},m.prototype.delete=function(u){var d=this._find(u,!1);if(d>=0){for(var h=this._keys.length,p=d+1;p<h;p++)this._keys[p-1]=this._keys[p],this._values[p-1]=this._values[p];return this._keys.length--,this._values.length--,q(u,this._cacheKey)&&(this._cacheKey=r,this._cacheIndex=-2),!0}return!1},m.prototype.clear=function(){this._keys.length=0,this._values.length=0,this._cacheKey=r,this._cacheIndex=-2},m.prototype.keys=function(){return new o(this._keys,this._values,v)},m.prototype.values=function(){return new o(this._keys,this._values,C)},m.prototype.entries=function(){return new o(this._keys,this._values,P)},m.prototype["@@iterator"]=function(){return this.entries()},m.prototype[f]=function(){return this.entries()},m.prototype._find=function(u,d){if(!q(this._cacheKey,u)){this._cacheIndex=-1;for(var h=0;h<this._keys.length;h++)if(q(this._keys[h],u)){this._cacheIndex=h;break}}return this._cacheIndex<0&&d&&(this._cacheIndex=this._keys.length,this._keys.push(u),this._values.push(void 0)),this._cacheIndex},m}();return l;function v(m,u){return m}function C(m,u){return u}function P(m,u){return[m,u]}}function Ye(){var r=function(){function a(){this._map=new I}return Object.defineProperty(a.prototype,"size",{get:function(){return this._map.size},enumerable:!0,configurable:!0}),a.prototype.has=function(o){return this._map.has(o)},a.prototype.add=function(o){return this._map.set(o,o),this},a.prototype.delete=function(o){return this._map.delete(o)},a.prototype.clear=function(){this._map.clear()},a.prototype.keys=function(){return this._map.keys()},a.prototype.values=function(){return this._map.keys()},a.prototype.entries=function(){return this._map.entries()},a.prototype["@@iterator"]=function(){return this.keys()},a.prototype[f]=function(){return this.keys()},a}();return r}function Ze(){var r=16,a=R.create(),o=l();return function(){function u(){this._key=l()}return u.prototype.has=function(d){var h=v(d,!1);return h!==void 0?R.has(h,this._key):!1},u.prototype.get=function(d){var h=v(d,!1);return h!==void 0?R.get(h,this._key):void 0},u.prototype.set=function(d,h){var p=v(d,!0);return p[this._key]=h,this},u.prototype.delete=function(d){var h=v(d,!1);return h!==void 0?delete h[this._key]:!1},u.prototype.clear=function(){this._key=l()},u}();function l(){var u;do u="@@WeakMap@@"+m();while(R.has(a,u));return a[u]=!0,u}function v(u,d){if(!i.call(u,o)){if(!d)return;Object.defineProperty(u,o,{value:R.create()})}return u[o]}function C(u,d){for(var h=0;h<d;++h)u[h]=Math.random()*255|0;return u}function P(u){if(typeof Uint8Array=="function"){var d=new Uint8Array(u);return typeof crypto<"u"?crypto.getRandomValues(d):typeof msCrypto<"u"?msCrypto.getRandomValues(d):C(d,u),d}return C(new Array(u),u)}function m(){var u=P(r);u[6]=u[6]&79|64,u[8]=u[8]&191|128;for(var d="",h=0;h<r;++h){var p=u[h];(h===4||h===6||h===8)&&(d+="-"),p<16&&(d+="0"),d+=p.toString(16).toLowerCase()}return d}}function Y(r){return r.__=void 0,delete r.__,r}})})(_t||(_t={}));/*! *****************************************************************************
Copyright (C) Microsoft. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */var kt;(function(e){(function(t){var n=typeof globalThis=="object"||typeof globalThis=="object"?globalThis:typeof self=="object"?self:typeof this=="object"?this:k(),i=c(e);typeof n.Reflect<"u"&&(i=c(n.Reflect,i)),t(i,n),typeof n.Reflect>"u"&&(n.Reflect=e);function c(b,y){return function(R,x){Object.defineProperty(b,R,{configurable:!0,writable:!0,value:x}),y&&y(R,x)}}function s(){try{return Function("return this;")()}catch{}}function f(){try{return(0,eval)("(function() { return this; })()")}catch{}}function k(){return s()||f()}})(function(t,n){var i=Object.prototype.hasOwnProperty,c=typeof Symbol=="function",s=c&&typeof Symbol.toPrimitive<"u"?Symbol.toPrimitive:"@@toPrimitive",f=c&&typeof Symbol.iterator<"u"?Symbol.iterator:"@@iterator",k=typeof Object.create=="function",b={__proto__:[]}instanceof Array,y=!k&&!b,R={create:k?function(){return Y(Object.create(null))}:b?function(){return Y({__proto__:null})}:function(){return Y({})},has:y?function(r,a){return i.call(r,a)}:function(r,a){return a in r},get:y?function(r,a){return i.call(r,a)?r[a]:void 0}:function(r,a){return r[a]}},x=Object.getPrototypeOf(Function),I=typeof Map=="function"&&typeof Map.prototype.entries=="function"?Map:He(),w=typeof Set=="function"&&typeof Set.prototype.entries=="function"?Set:Ye(),E=typeof WeakMap=="function"?WeakMap:Ze(),S=c?Symbol.for("@reflect-metadata:registry"):void 0,B=Ve(),L=$e(B);function te(r,a,o,l){if(_(o)){if(!ue(r))throw new TypeError;if(!de(a))throw new TypeError;return je(r,a)}else{if(!ue(r))throw new TypeError;if(!M(a))throw new TypeError;if(!M(l)&&!_(l)&&!W(l))throw new TypeError;return W(l)&&(l=void 0),o=D(o),Le(r,a,o,l)}}t("decorate",te);function z(r,a){function o(l,v){if(!M(l))throw new TypeError;if(!_(v)&&!Ne(v))throw new TypeError;oe(r,a,l,v)}return o}t("metadata",z);function Q(r,a,o,l){if(!M(o))throw new TypeError;return _(l)||(l=D(l)),oe(r,a,o,l)}t("defineMetadata",Q);function N(r,a,o){if(!M(a))throw new TypeError;return _(o)||(o=D(o)),ne(r,a,o)}t("hasMetadata",N);function U(r,a,o){if(!M(a))throw new TypeError;return _(o)||(o=D(o)),$(r,a,o)}t("hasOwnMetadata",U);function Ce(r,a,o){if(!M(a))throw new TypeError;return _(o)||(o=D(o)),re(r,a,o)}t("getMetadata",Ce);function xe(r,a,o){if(!M(a))throw new TypeError;return _(o)||(o=D(o)),ae(r,a,o)}t("getOwnMetadata",xe);function Ae(r,a){if(!M(r))throw new TypeError;return _(a)||(a=D(a)),ie(r,a)}t("getMetadataKeys",Ae);function De(r,a){if(!M(r))throw new TypeError;return _(a)||(a=D(a)),se(r,a)}t("getOwnMetadataKeys",De);function Be(r,a,o){if(!M(a))throw new TypeError;if(_(o)||(o=D(o)),!M(a))throw new TypeError;_(o)||(o=D(o));var l=F(a,o,!1);return _(l)?!1:l.OrdinaryDeleteMetadata(r,a,o)}t("deleteMetadata",Be);function je(r,a){for(var o=r.length-1;o>=0;--o){var l=r[o],v=l(a);if(!_(v)&&!W(v)){if(!de(v))throw new TypeError;a=v}}return a}function Le(r,a,o,l){for(var v=r.length-1;v>=0;--v){var C=r[v],P=C(a,o,l);if(!_(P)&&!W(P)){if(!M(P))throw new TypeError;l=P}}return l}function ne(r,a,o){var l=$(r,a,o);if(l)return!0;var v=H(a);return W(v)?!1:ne(r,v,o)}function $(r,a,o){var l=F(a,o,!1);return _(l)?!1:le(l.OrdinaryHasOwnMetadata(r,a,o))}function re(r,a,o){var l=$(r,a,o);if(l)return ae(r,a,o);var v=H(a);if(!W(v))return re(r,v,o)}function ae(r,a,o){var l=F(a,o,!1);if(!_(l))return l.OrdinaryGetOwnMetadata(r,a,o)}function oe(r,a,o,l){var v=F(o,l,!0);v.OrdinaryDefineOwnMetadata(r,a,o,l)}function ie(r,a){var o=se(r,a),l=H(r);if(l===null)return o;var v=ie(l,a);if(v.length<=0)return o;if(o.length<=0)return v;for(var C=new w,P=[],m=0,u=o;m<u.length;m++){var d=u[m],h=C.has(d);h||(C.add(d),P.push(d))}for(var p=0,g=v;p<g.length;p++){var d=g[p],h=C.has(d);h||(C.add(d),P.push(d))}return P}function se(r,a){var o=F(r,a,!1);return o?o.OrdinaryOwnMetadataKeys(r,a):[]}function ce(r){if(r===null)return 1;switch(typeof r){case"undefined":return 0;case"boolean":return 2;case"string":return 3;case"symbol":return 4;case"number":return 5;case"object":return r===null?1:6;default:return 6}}function _(r){return r===void 0}function W(r){return r===null}function We(r){return typeof r=="symbol"}function M(r){return typeof r=="object"?r!==null:typeof r=="function"}function Fe(r,a){switch(ce(r)){case 0:return r;case 1:return r;case 2:return r;case 3:return r;case 4:return r;case 5:return r}var o="string",l=he(r,s);if(l!==void 0){var v=l.call(r,o);if(M(v))throw new TypeError;return v}return ze(r)}function ze(r,a){var o,l;{var v=r.toString;if(G(v)){var l=v.call(r);if(!M(l))return l}var o=r.valueOf;if(G(o)){var l=o.call(r);if(!M(l))return l}}throw new TypeError}function le(r){return!!r}function Ge(r){return""+r}function D(r){var a=Fe(r);return We(a)?a:Ge(a)}function ue(r){return Array.isArray?Array.isArray(r):r instanceof Object?r instanceof Array:Object.prototype.toString.call(r)==="[object Array]"}function G(r){return typeof r=="function"}function de(r){return typeof r=="function"}function Ne(r){switch(ce(r)){case 3:return!0;case 4:return!0;default:return!1}}function q(r,a){return r===a||r!==r&&a!==a}function he(r,a){var o=r[a];if(o!=null){if(!G(o))throw new TypeError;return o}}function pe(r){var a=he(r,f);if(!G(a))throw new TypeError;var o=a.call(r);if(!M(o))throw new TypeError;return o}function fe(r){return r.value}function ve(r){var a=r.next();return a.done?!1:a}function _e(r){var a=r.return;a&&a.call(r)}function H(r){var a=Object.getPrototypeOf(r);if(typeof r!="function"||r===x||a!==x)return a;var o=r.prototype,l=o&&Object.getPrototypeOf(o);if(l==null||l===Object.prototype)return a;var v=l.constructor;return typeof v!="function"||v===r?a:v}function Ue(){var r;!_(S)&&typeof n.Reflect<"u"&&!(S in n.Reflect)&&typeof n.Reflect.defineMetadata=="function"&&(r=qe(n.Reflect));var a,o,l,v=new E,C={registerProvider:P,getProvider:u,setProvider:h};return C;function P(p){if(!Object.isExtensible(C))throw new Error("Cannot add provider to a frozen registry.");switch(!0){case r===p:break;case _(a):a=p;break;case a===p:break;case _(o):o=p;break;case o===p:break;default:l===void 0&&(l=new w),l.add(p);break}}function m(p,g){if(!_(a)){if(a.isProviderFor(p,g))return a;if(!_(o)){if(o.isProviderFor(p,g))return a;if(!_(l))for(var T=pe(l);;){var O=ve(T);if(!O)return;var A=fe(O);if(A.isProviderFor(p,g))return _e(T),A}}}if(!_(r)&&r.isProviderFor(p,g))return r}function u(p,g){var T=v.get(p),O;return _(T)||(O=T.get(g)),_(O)&&(O=m(p,g),_(O)||(_(T)&&(T=new I,v.set(p,T)),T.set(g,O))),O}function d(p){if(_(p))throw new TypeError;return a===p||o===p||!_(l)&&l.has(p)}function h(p,g,T){if(!d(T))throw new Error("Metadata provider not registered.");var O=u(p,g);if(O!==T){if(!_(O))return!1;var A=v.get(p);_(A)&&(A=new I,v.set(p,A)),A.set(g,T)}return!0}}function Ve(){var r;return!_(S)&&M(n.Reflect)&&Object.isExtensible(n.Reflect)&&(r=n.Reflect[S]),_(r)&&(r=Ue()),!_(S)&&M(n.Reflect)&&Object.isExtensible(n.Reflect)&&Object.defineProperty(n.Reflect,S,{enumerable:!1,configurable:!1,writable:!1,value:r}),r}function $e(r){var a=new E,o={isProviderFor:function(d,h){var p=a.get(d);return _(p)?!1:p.has(h)},OrdinaryDefineOwnMetadata:P,OrdinaryHasOwnMetadata:v,OrdinaryGetOwnMetadata:C,OrdinaryOwnMetadataKeys:m,OrdinaryDeleteMetadata:u};return B.registerProvider(o),o;function l(d,h,p){var g=a.get(d),T=!1;if(_(g)){if(!p)return;g=new I,a.set(d,g),T=!0}var O=g.get(h);if(_(O)){if(!p)return;if(O=new I,g.set(h,O),!r.setProvider(d,h,o))throw g.delete(h),T&&a.delete(d),new Error("Wrong provider for target.")}return O}function v(d,h,p){var g=l(h,p,!1);return _(g)?!1:le(g.has(d))}function C(d,h,p){var g=l(h,p,!1);if(!_(g))return g.get(d)}function P(d,h,p,g){var T=l(p,g,!0);T.set(d,h)}function m(d,h){var p=[],g=l(d,h,!1);if(_(g))return p;for(var T=g.keys(),O=pe(T),A=0;;){var ke=ve(O);if(!ke)return p.length=A,p;var Je=fe(ke);try{p[A]=Je}catch(Qe){try{_e(O)}finally{throw Qe}}A++}}function u(d,h,p){var g=l(h,p,!1);if(_(g)||!g.delete(d))return!1;if(g.size===0){var T=a.get(h);_(T)||(T.delete(p),T.size===0&&a.delete(T))}return!0}}function qe(r){var a=r.defineMetadata,o=r.hasOwnMetadata,l=r.getOwnMetadata,v=r.getOwnMetadataKeys,C=r.deleteMetadata,P=new E,m={isProviderFor:function(u,d){var h=P.get(u);return!_(h)&&h.has(d)?!0:v(u,d).length?(_(h)&&(h=new w,P.set(u,h)),h.add(d),!0):!1},OrdinaryDefineOwnMetadata:a,OrdinaryHasOwnMetadata:o,OrdinaryGetOwnMetadata:l,OrdinaryOwnMetadataKeys:v,OrdinaryDeleteMetadata:C};return m}function F(r,a,o){var l=B.getProvider(r,a);if(!_(l))return l;if(o){if(B.setProvider(r,a,L))return L;throw new Error("Illegal state.")}}function He(){var r={},a=[],o=function(){function m(u,d,h){this._index=0,this._keys=u,this._values=d,this._selector=h}return m.prototype["@@iterator"]=function(){return this},m.prototype[f]=function(){return this},m.prototype.next=function(){var u=this._index;if(u>=0&&u<this._keys.length){var d=this._selector(this._keys[u],this._values[u]);return u+1>=this._keys.length?(this._index=-1,this._keys=a,this._values=a):this._index++,{value:d,done:!1}}return{value:void 0,done:!0}},m.prototype.throw=function(u){throw this._index>=0&&(this._index=-1,this._keys=a,this._values=a),u},m.prototype.return=function(u){return this._index>=0&&(this._index=-1,this._keys=a,this._values=a),{value:u,done:!0}},m}(),l=function(){function m(){this._keys=[],this._values=[],this._cacheKey=r,this._cacheIndex=-2}return Object.defineProperty(m.prototype,"size",{get:function(){return this._keys.length},enumerable:!0,configurable:!0}),m.prototype.has=function(u){return this._find(u,!1)>=0},m.prototype.get=function(u){var d=this._find(u,!1);return d>=0?this._values[d]:void 0},m.prototype.set=function(u,d){var h=this._find(u,!0);return this._values[h]=d,this},m.prototype.delete=function(u){var d=this._find(u,!1);if(d>=0){for(var h=this._keys.length,p=d+1;p<h;p++)this._keys[p-1]=this._keys[p],this._values[p-1]=this._values[p];return this._keys.length--,this._values.length--,q(u,this._cacheKey)&&(this._cacheKey=r,this._cacheIndex=-2),!0}return!1},m.prototype.clear=function(){this._keys.length=0,this._values.length=0,this._cacheKey=r,this._cacheIndex=-2},m.prototype.keys=function(){return new o(this._keys,this._values,v)},m.prototype.values=function(){return new o(this._keys,this._values,C)},m.prototype.entries=function(){return new o(this._keys,this._values,P)},m.prototype["@@iterator"]=function(){return this.entries()},m.prototype[f]=function(){return this.entries()},m.prototype._find=function(u,d){if(!q(this._cacheKey,u)){this._cacheIndex=-1;for(var h=0;h<this._keys.length;h++)if(q(this._keys[h],u)){this._cacheIndex=h;break}}return this._cacheIndex<0&&d&&(this._cacheIndex=this._keys.length,this._keys.push(u),this._values.push(void 0)),this._cacheIndex},m}();return l;function v(m,u){return m}function C(m,u){return u}function P(m,u){return[m,u]}}function Ye(){var r=function(){function a(){this._map=new I}return Object.defineProperty(a.prototype,"size",{get:function(){return this._map.size},enumerable:!0,configurable:!0}),a.prototype.has=function(o){return this._map.has(o)},a.prototype.add=function(o){return this._map.set(o,o),this},a.prototype.delete=function(o){return this._map.delete(o)},a.prototype.clear=function(){this._map.clear()},a.prototype.keys=function(){return this._map.keys()},a.prototype.values=function(){return this._map.keys()},a.prototype.entries=function(){return this._map.entries()},a.prototype["@@iterator"]=function(){return this.keys()},a.prototype[f]=function(){return this.keys()},a}();return r}function Ze(){var r=16,a=R.create(),o=l();return function(){function u(){this._key=l()}return u.prototype.has=function(d){var h=v(d,!1);return h!==void 0?R.has(h,this._key):!1},u.prototype.get=function(d){var h=v(d,!1);return h!==void 0?R.get(h,this._key):void 0},u.prototype.set=function(d,h){var p=v(d,!0);return p[this._key]=h,this},u.prototype.delete=function(d){var h=v(d,!1);return h!==void 0?delete h[this._key]:!1},u.prototype.clear=function(){this._key=l()},u}();function l(){var u;do u="@@WeakMap@@"+m();while(R.has(a,u));return a[u]=!0,u}function v(u,d){if(!i.call(u,o)){if(!d)return;Object.defineProperty(u,o,{value:R.create()})}return u[o]}function C(u,d){for(var h=0;h<d;++h)u[h]=Math.random()*255|0;return u}function P(u){if(typeof Uint8Array=="function"){var d=new Uint8Array(u);return typeof crypto<"u"?crypto.getRandomValues(d):typeof msCrypto<"u"?msCrypto.getRandomValues(d):C(d,u),d}return C(new Array(u),u)}function m(){var u=P(r);u[6]=u[6]&79|64,u[8]=u[8]&191|128;for(var d="",h=0;h<r;++h){var p=u[h];(h===4||h===6||h===8)&&(d+="-"),p<16&&(d+="0"),d+=p.toString(16).toLowerCase()}return d}}function Y(r){return r.__=void 0,delete r.__,r}})})(kt||(kt={}));var Z=(e=>(e[e.Singleton=0]="Singleton",e[e.Scoped=1]="Scoped",e[e.Transient=2]="Transient",e))(Z||{});const Ht=Symbol.for("ioc:component:options"),lr="design:paramtypes",wt=Symbol.for("ioc:inject:tokens");function Yt(){var e,t;try{const n=((t=(e=globalThis.process)==null?void 0:e.getBuiltinModule)==null?void 0:t.call(e,"node:async_hooks"))??(typeof require=="function"?require("node:async_hooks"):void 0);if(n!=null&&n.AsyncLocalStorage)return new n.AsyncLocalStorage;throw new Error("AsyncLocalStorage unavailable")}catch{let n;return{run(i,c){const s=n;n=i;try{return c()}finally{n=s}},getStore(){return n}}}}const mt=Symbol.for("@noego/ioc.execution-context.v1");function Zt(){const e=globalThis,t=e[mt];if(t&&typeof t.run=="function"&&typeof t.getStore=="function")return t;const n=Yt();return Object.defineProperty(e,mt,{value:n,writable:!1,enumerable:!1,configurable:!1}),n}const gt=Zt(),Jt={run(e,t){return gt.run(e,t)},current(){return gt.getStore()}};function me(e={}){return t=>{const n={scope:e.scope??Z.Transient};Reflect.defineMetadata(Ht,n,t),Reflect.defineMetadata("ComponentOptions",n,t)}}function Ot(e){return(t,n,i)=>{const c=Reflect.getOwnMetadata(wt,t)||new Map;c.set(i,e),Reflect.defineMetadata(wt,c,t)}}var ot=function(e,t){return ot=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,i){n.__proto__=i}||function(n,i){for(var c in i)Object.prototype.hasOwnProperty.call(i,c)&&(n[c]=i[c])},ot(e,t)};function Me(e,t){if(typeof t!="function"&&t!==null)throw new TypeError("Class extends value "+String(t)+" is not a constructor or null");ot(e,t);function n(){this.constructor=e}e.prototype=t===null?Object.create(t):(n.prototype=t.prototype,new n)}function Qt(e,t,n,i){function c(s){return s instanceof n?s:new n(function(f){f(s)})}return new(n||(n=Promise))(function(s,f){function k(R){try{y(i.next(R))}catch(x){f(x)}}function b(R){try{y(i.throw(R))}catch(x){f(x)}}function y(R){R.done?s(R.value):c(R.value).then(k,b)}y((i=i.apply(e,t||[])).next())})}function Mt(e,t){var n={label:0,sent:function(){if(s[0]&1)throw s[1];return s[1]},trys:[],ops:[]},i,c,s,f=Object.create((typeof Iterator=="function"?Iterator:Object).prototype);return f.next=k(0),f.throw=k(1),f.return=k(2),typeof Symbol=="function"&&(f[Symbol.iterator]=function(){return this}),f;function k(y){return function(R){return b([y,R])}}function b(y){if(i)throw new TypeError("Generator is already executing.");for(;f&&(f=0,y[0]&&(n=0)),n;)try{if(i=1,c&&(s=y[0]&2?c.return:y[0]?c.throw||((s=c.return)&&s.call(c),0):c.next)&&!(s=s.call(c,y[1])).done)return s;switch(c=0,s&&(y=[y[0]&2,s.value]),y[0]){case 0:case 1:s=y;break;case 4:return n.label++,{value:y[1],done:!1};case 5:n.label++,c=y[1],y=[0];continue;case 7:y=n.ops.pop(),n.trys.pop();continue;default:if(s=n.trys,!(s=s.length>0&&s[s.length-1])&&(y[0]===6||y[0]===2)){n=0;continue}if(y[0]===3&&(!s||y[1]>s[0]&&y[1]<s[3])){n.label=y[1];break}if(y[0]===6&&n.label<s[1]){n.label=s[1],s=y;break}if(s&&n.label<s[2]){n.label=s[2],n.ops.push(y);break}s[2]&&n.ops.pop(),n.trys.pop();continue}y=t.call(e,n)}catch(R){y=[6,R],c=0}finally{i=s=0}if(y[0]&5)throw y[1];return{value:y[0]?y[1]:void 0,done:!0}}}function ee(e){var t=typeof Symbol=="function"&&Symbol.iterator,n=t&&e[t],i=0;if(n)return n.call(e);if(e&&typeof e.length=="number")return{next:function(){return e&&i>=e.length&&(e=void 0),{value:e&&e[i++],done:!e}}};throw new TypeError(t?"Object is not iterable.":"Symbol.iterator is not defined.")}function Te(e,t){var n=typeof Symbol=="function"&&e[Symbol.iterator];if(!n)return e;var i=n.call(e),c,s=[],f;try{for(;(t===void 0||t-- >0)&&!(c=i.next()).done;)s.push(c.value)}catch(k){f={error:k}}finally{try{c&&!c.done&&(n=i.return)&&n.call(i)}finally{if(f)throw f.error}}return s}function Se(e,t,n){if(n||arguments.length===2)for(var i=0,c=t.length,s;i<c;i++)(s||!(i in t))&&(s||(s=Array.prototype.slice.call(t,0,i)),s[i]=t[i]);return e.concat(s||Array.prototype.slice.call(t))}function K(e){return this instanceof K?(this.v=e,this):new K(e)}function Xt(e,t,n){if(!Symbol.asyncIterator)throw new TypeError("Symbol.asyncIterator is not defined.");var i=n.apply(e,t||[]),c,s=[];return c=Object.create((typeof AsyncIterator=="function"?AsyncIterator:Object).prototype),k("next"),k("throw"),k("return",f),c[Symbol.asyncIterator]=function(){return this},c;function f(w){return function(E){return Promise.resolve(E).then(w,x)}}function k(w,E){i[w]&&(c[w]=function(S){return new Promise(function(B,L){s.push([w,S,B,L])>1||b(w,S)})},E&&(c[w]=E(c[w])))}function b(w,E){try{y(i[w](E))}catch(S){I(s[0][3],S)}}function y(w){w.value instanceof K?Promise.resolve(w.value.v).then(R,x):I(s[0][2],w)}function R(w){b("next",w)}function x(w){b("throw",w)}function I(w,E){w(E),s.shift(),s.length&&b(s[0][0],s[0][1])}}function Kt(e){if(!Symbol.asyncIterator)throw new TypeError("Symbol.asyncIterator is not defined.");var t=e[Symbol.asyncIterator],n;return t?t.call(e):(e=typeof ee=="function"?ee(e):e[Symbol.iterator](),n={},i("next"),i("throw"),i("return"),n[Symbol.asyncIterator]=function(){return this},n);function i(s){n[s]=e[s]&&function(f){return new Promise(function(k,b){f=e[s](f),c(k,b,f.done,f.value)})}}function c(s,f,k,b){Promise.resolve(b).then(function(y){s({value:y,done:k})},f)}}function j(e){return typeof e=="function"}function Pt(e){var t=function(i){Error.call(i),i.stack=new Error().stack},n=e(t);return n.prototype=Object.create(Error.prototype),n.prototype.constructor=n,n}var Xe=Pt(function(e){return function(n){e(this),this.message=n?n.length+` errors occurred during unsubscription:
`+n.map(function(i,c){return c+1+") "+i.toString()}).join(`
  `):"",this.name="UnsubscriptionError",this.errors=n}});function it(e,t){if(e){var n=e.indexOf(t);0<=n&&e.splice(n,1)}}var Pe=function(){function e(t){this.initialTeardown=t,this.closed=!1,this._parentage=null,this._finalizers=null}return e.prototype.unsubscribe=function(){var t,n,i,c,s;if(!this.closed){this.closed=!0;var f=this._parentage;if(f)if(this._parentage=null,Array.isArray(f))try{for(var k=ee(f),b=k.next();!b.done;b=k.next()){var y=b.value;y.remove(this)}}catch(S){t={error:S}}finally{try{b&&!b.done&&(n=k.return)&&n.call(k)}finally{if(t)throw t.error}}else f.remove(this);var R=this.initialTeardown;if(j(R))try{R()}catch(S){s=S instanceof Xe?S.errors:[S]}var x=this._finalizers;if(x){this._finalizers=null;try{for(var I=ee(x),w=I.next();!w.done;w=I.next()){var E=w.value;try{yt(E)}catch(S){s=s??[],S instanceof Xe?s=Se(Se([],Te(s)),Te(S.errors)):s.push(S)}}}catch(S){i={error:S}}finally{try{w&&!w.done&&(c=I.return)&&c.call(I)}finally{if(i)throw i.error}}}if(s)throw new Xe(s)}},e.prototype.add=function(t){var n;if(t&&t!==this)if(this.closed)yt(t);else{if(t instanceof e){if(t.closed||t._hasParent(this))return;t._addParent(this)}(this._finalizers=(n=this._finalizers)!==null&&n!==void 0?n:[]).push(t)}},e.prototype._hasParent=function(t){var n=this._parentage;return n===t||Array.isArray(n)&&n.includes(t)},e.prototype._addParent=function(t){var n=this._parentage;this._parentage=Array.isArray(n)?(n.push(t),n):n?[n,t]:t},e.prototype._removeParent=function(t){var n=this._parentage;n===t?this._parentage=null:Array.isArray(n)&&it(n,t)},e.prototype.remove=function(t){var n=this._finalizers;n&&it(n,t),t instanceof e&&t._removeParent(this)},e.EMPTY=function(){var t=new e;return t.closed=!0,t}(),e}(),Ct=Pe.EMPTY;function xt(e){return e instanceof Pe||e&&"closed"in e&&j(e.remove)&&j(e.add)&&j(e.unsubscribe)}function yt(e){j(e)?e():e.unsubscribe()}var en={Promise:void 0},tn={setTimeout:function(e,t){for(var n=[],i=2;i<arguments.length;i++)n[i-2]=arguments[i];return setTimeout.apply(void 0,Se([e,t],Te(n)))},clearTimeout:function(e){return clearTimeout(e)},delegate:void 0};function At(e){tn.setTimeout(function(){throw e})}function bt(){}function Ie(e){e()}var Dt=function(e){Me(t,e);function t(n){var i=e.call(this)||this;return i.isStopped=!1,n?(i.destination=n,xt(n)&&n.add(i)):i.destination=an,i}return t.create=function(n,i,c){return new we(n,i,c)},t.prototype.next=function(n){this.isStopped||this._next(n)},t.prototype.error=function(n){this.isStopped||(this.isStopped=!0,this._error(n))},t.prototype.complete=function(){this.isStopped||(this.isStopped=!0,this._complete())},t.prototype.unsubscribe=function(){this.closed||(this.isStopped=!0,e.prototype.unsubscribe.call(this),this.destination=null)},t.prototype._next=function(n){this.destination.next(n)},t.prototype._error=function(n){try{this.destination.error(n)}finally{this.unsubscribe()}},t.prototype._complete=function(){try{this.destination.complete()}finally{this.unsubscribe()}},t}(Pe),nn=function(){function e(t){this.partialObserver=t}return e.prototype.next=function(t){var n=this.partialObserver;if(n.next)try{n.next(t)}catch(i){be(i)}},e.prototype.error=function(t){var n=this.partialObserver;if(n.error)try{n.error(t)}catch(i){be(i)}else be(t)},e.prototype.complete=function(){var t=this.partialObserver;if(t.complete)try{t.complete()}catch(n){be(n)}},e}(),we=function(e){Me(t,e);function t(n,i,c){var s=e.call(this)||this,f;return j(n)||!n?f={next:n??void 0,error:i??void 0,complete:c??void 0}:f=n,s.destination=new nn(f),s}return t}(Dt);function be(e){At(e)}function rn(e){throw e}var an={closed:!0,next:bt,error:rn,complete:bt},dt=function(){return typeof Symbol=="function"&&Symbol.observable||"@@observable"}();function on(e){return e}function sn(e){return e.length===0?on:e.length===1?e[0]:function(n){return e.reduce(function(i,c){return c(i)},n)}}var V=function(){function e(t){t&&(this._subscribe=t)}return e.prototype.lift=function(t){var n=new e;return n.source=this,n.operator=t,n},e.prototype.subscribe=function(t,n,i){var c=this,s=ln(t)?t:new we(t,n,i);return Ie(function(){var f=c,k=f.operator,b=f.source;s.add(k?k.call(s,b):b?c._subscribe(s):c._trySubscribe(s))}),s},e.prototype._trySubscribe=function(t){try{return this._subscribe(t)}catch(n){t.error(n)}},e.prototype.forEach=function(t,n){var i=this;return n=It(n),new n(function(c,s){var f=new we({next:function(k){try{t(k)}catch(b){s(b),f.unsubscribe()}},error:s,complete:c});i.subscribe(f)})},e.prototype._subscribe=function(t){var n;return(n=this.source)===null||n===void 0?void 0:n.subscribe(t)},e.prototype[dt]=function(){return this},e.prototype.pipe=function(){for(var t=[],n=0;n<arguments.length;n++)t[n]=arguments[n];return sn(t)(this)},e.prototype.toPromise=function(t){var n=this;return t=It(t),new t(function(i,c){var s;n.subscribe(function(f){return s=f},function(f){return c(f)},function(){return i(s)})})},e.create=function(t){return new e(t)},e}();function It(e){var t;return(t=e??en.Promise)!==null&&t!==void 0?t:Promise}function cn(e){return e&&j(e.next)&&j(e.error)&&j(e.complete)}function ln(e){return e&&e instanceof Dt||cn(e)&&xt(e)}function un(e){return j(e==null?void 0:e.lift)}function dn(e){return function(t){if(un(t))return t.lift(function(n){try{return e(n,this)}catch(i){this.error(i)}});throw new TypeError("Unable to lift unknown Observable type")}}var hn=Pt(function(e){return function(){e(this),this.name="ObjectUnsubscribedError",this.message="object unsubscribed"}}),ht=function(e){Me(t,e);function t(){var n=e.call(this)||this;return n.closed=!1,n.currentObservers=null,n.observers=[],n.isStopped=!1,n.hasError=!1,n.thrownError=null,n}return t.prototype.lift=function(n){var i=new Rt(this,this);return i.operator=n,i},t.prototype._throwIfClosed=function(){if(this.closed)throw new hn},t.prototype.next=function(n){var i=this;Ie(function(){var c,s;if(i._throwIfClosed(),!i.isStopped){i.currentObservers||(i.currentObservers=Array.from(i.observers));try{for(var f=ee(i.currentObservers),k=f.next();!k.done;k=f.next()){var b=k.value;b.next(n)}}catch(y){c={error:y}}finally{try{k&&!k.done&&(s=f.return)&&s.call(f)}finally{if(c)throw c.error}}}})},t.prototype.error=function(n){var i=this;Ie(function(){if(i._throwIfClosed(),!i.isStopped){i.hasError=i.isStopped=!0,i.thrownError=n;for(var c=i.observers;c.length;)c.shift().error(n)}})},t.prototype.complete=function(){var n=this;Ie(function(){if(n._throwIfClosed(),!n.isStopped){n.isStopped=!0;for(var i=n.observers;i.length;)i.shift().complete()}})},t.prototype.unsubscribe=function(){this.isStopped=this.closed=!0,this.observers=this.currentObservers=null},Object.defineProperty(t.prototype,"observed",{get:function(){var n;return((n=this.observers)===null||n===void 0?void 0:n.length)>0},enumerable:!1,configurable:!0}),t.prototype._trySubscribe=function(n){return this._throwIfClosed(),e.prototype._trySubscribe.call(this,n)},t.prototype._subscribe=function(n){return this._throwIfClosed(),this._checkFinalizedStatuses(n),this._innerSubscribe(n)},t.prototype._innerSubscribe=function(n){var i=this,c=this,s=c.hasError,f=c.isStopped,k=c.observers;return s||f?Ct:(this.currentObservers=null,k.push(n),new Pe(function(){i.currentObservers=null,it(k,n)}))},t.prototype._checkFinalizedStatuses=function(n){var i=this,c=i.hasError,s=i.thrownError,f=i.isStopped;c?n.error(s):f&&n.complete()},t.prototype.asObservable=function(){var n=new V;return n.source=this,n},t.create=function(n,i){return new Rt(n,i)},t}(V),Rt=function(e){Me(t,e);function t(n,i){var c=e.call(this)||this;return c.destination=n,c.source=i,c}return t.prototype.next=function(n){var i,c;(c=(i=this.destination)===null||i===void 0?void 0:i.next)===null||c===void 0||c.call(i,n)},t.prototype.error=function(n){var i,c;(c=(i=this.destination)===null||i===void 0?void 0:i.error)===null||c===void 0||c.call(i,n)},t.prototype.complete=function(){var n,i;(i=(n=this.destination)===null||n===void 0?void 0:n.complete)===null||i===void 0||i.call(n)},t.prototype._subscribe=function(n){var i,c;return(c=(i=this.source)===null||i===void 0?void 0:i.subscribe(n))!==null&&c!==void 0?c:Ct},t}(ht),pn=function(e){return e&&typeof e.length=="number"&&typeof e!="function"};function fn(e){return j(e==null?void 0:e.then)}function vn(e){return j(e[dt])}function _n(e){return Symbol.asyncIterator&&j(e==null?void 0:e[Symbol.asyncIterator])}function kn(e){return new TypeError("You provided "+(e!==null&&typeof e=="object"?"an invalid object":"'"+e+"'")+" where a stream was expected. You can provide an Observable, Promise, ReadableStream, Array, AsyncIterable, or Iterable.")}function wn(){return typeof Symbol!="function"||!Symbol.iterator?"@@iterator":Symbol.iterator}var mn=wn();function gn(e){return j(e==null?void 0:e[mn])}function yn(e){return Xt(this,arguments,function(){var n,i,c,s;return Mt(this,function(f){switch(f.label){case 0:n=e.getReader(),f.label=1;case 1:f.trys.push([1,,9,10]),f.label=2;case 2:return[4,K(n.read())];case 3:return i=f.sent(),c=i.value,s=i.done,s?[4,K(void 0)]:[3,5];case 4:return[2,f.sent()];case 5:return[4,K(c)];case 6:return[4,f.sent()];case 7:return f.sent(),[3,2];case 8:return[3,10];case 9:return n.releaseLock(),[7];case 10:return[2]}})})}function bn(e){return j(e==null?void 0:e.getReader)}function Bt(e){if(e instanceof V)return e;if(e!=null){if(vn(e))return In(e);if(pn(e))return Rn(e);if(fn(e))return En(e);if(_n(e))return jt(e);if(gn(e))return Tn(e);if(bn(e))return Sn(e)}throw kn(e)}function In(e){return new V(function(t){var n=e[dt]();if(j(n.subscribe))return n.subscribe(t);throw new TypeError("Provided object does not correctly implement Symbol.observable")})}function Rn(e){return new V(function(t){for(var n=0;n<e.length&&!t.closed;n++)t.next(e[n]);t.complete()})}function En(e){return new V(function(t){e.then(function(n){t.closed||(t.next(n),t.complete())},function(n){return t.error(n)}).then(null,At)})}function Tn(e){return new V(function(t){var n,i;try{for(var c=ee(e),s=c.next();!s.done;s=c.next()){var f=s.value;if(t.next(f),t.closed)return}}catch(k){n={error:k}}finally{try{s&&!s.done&&(i=c.return)&&i.call(c)}finally{if(n)throw n.error}}t.complete()})}function jt(e){return new V(function(t){On(e,t).catch(function(n){return t.error(n)})})}function Sn(e){return jt(yn(e))}function On(e,t){var n,i,c,s;return Qt(this,void 0,void 0,function(){var f,k;return Mt(this,function(b){switch(b.label){case 0:b.trys.push([0,5,6,11]),n=Kt(e),b.label=1;case 1:return[4,n.next()];case 2:if(i=b.sent(),!!i.done)return[3,4];if(f=i.value,t.next(f),t.closed)return[2];b.label=3;case 3:return[3,1];case 4:return[3,11];case 5:return k=b.sent(),c={error:k},[3,11];case 6:return b.trys.push([6,,9,10]),i&&!i.done&&(s=n.return)?[4,s.call(n)]:[3,8];case 7:b.sent(),b.label=8;case 8:return[3,10];case 9:if(c)throw c.error;return[7];case 10:return[7];case 11:return t.complete(),[2]}})})}function Mn(e){e===void 0&&(e={});var t=e.connector,n=t===void 0?function(){return new ht}:t,i=e.resetOnError,c=i===void 0?!0:i,s=e.resetOnComplete,f=s===void 0?!0:s,k=e.resetOnRefCountZero,b=k===void 0?!0:k;return function(y){var R,x,I,w=0,E=!1,S=!1,B=function(){x==null||x.unsubscribe(),x=void 0},L=function(){B(),R=I=void 0,E=S=!1},te=function(){var z=R;L(),z==null||z.unsubscribe()};return dn(function(z,Q){w++,!S&&!E&&B();var N=I=I??n();Q.add(function(){w--,w===0&&!S&&!E&&(x=Ke(te,b))}),N.subscribe(Q),!R&&w>0&&(R=new we({next:function(U){return N.next(U)},error:function(U){S=!0,B(),x=Ke(L,c,U),N.error(U)},complete:function(){E=!0,B(),x=Ke(L,f),N.complete()}}),Bt(z).subscribe(R))})(y)}}function Ke(e,t){for(var n=[],i=2;i<arguments.length;i++)n[i-2]=arguments[i];if(t===!0){e();return}if(t!==!1){var c=new we({next:function(){c.unsubscribe(),e()}});return Bt(t.apply(void 0,Se([],Te(n)))).subscribe(c)}}const et=Symbol.for("@noego/wood.trace.hub"),Lt={debug:0,info:1,warn:2,error:3},Pn=Lt.info;function X(e){return Lt[e]??Pn}let Wt="debug",Ft=!1,st=null,tt=null;function Cn(){const e=globalThis.crypto;return e&&typeof e.randomUUID=="function"?e.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`}function nt(){var e;return tt===null&&(tt=`${typeof process<"u"&&((e=process==null?void 0:process.versions)!=null&&e.electron)?process.type==="renderer"?"renderer":"main":typeof window<"u"?"renderer":"main"}:${Cn()}`),tt}function zt(e){const t=e??{},n=typeof t.source=="string"&&t.source.trim().length>0?t.source:"unknown",i=typeof t.type=="string"&&t.type.trim().length>0?t.type:"unknown",c=typeof t.message=="string"?t.message:void 0,s=typeof t.conversationId=="number"||typeof t.conversationId=="string"?t.conversationId:void 0,f=typeof t.windowId=="string"&&t.windowId.trim().length>0?t.windowId:void 0,k=typeof t.webContentsId=="number"&&Number.isFinite(t.webContentsId)?t.webContentsId:void 0,b=typeof t.routeKey=="string"&&t.routeKey.trim().length>0?t.routeKey:void 0,y=typeof t.harnessId=="string"&&t.harnessId.trim().length>0?t.harnessId:void 0,R=xn(t.payload)?{...t.payload}:void 0;return{source:n,type:i,...c?{message:c}:{},...s!==void 0?{conversationId:s}:{},...f!==void 0?{windowId:f}:{},...k!==void 0?{webContentsId:k}:{},...b!==void 0?{routeKey:b}:{},...y!==void 0?{harnessId:y}:{},...R?{payload:R}:{}}}function xn(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function An(){var n,i;const e=globalThis,t=e.__NOEGO_WOOD_BRIDGE__??((n=e.window)==null?void 0:n.__NOEGO_WOOD_BRIDGE__)??e.wood??((i=e.window)==null?void 0:i.wood);return!t||typeof t!="object"?null:t}class Dn{constructor(){this.subject=new ht,this.shared$=this.subject.asObservable().pipe(Mn()),this.sinks=new Set,this.nextTraceSeq=1,this.minLevels={main:"debug",renderer:"debug",test:"debug"}}get events$(){return this.shared$}setMinLevel(t,n){this.minLevels[t]=n}registerSink(t){return this.sinks.add(t),()=>{this.sinks.delete(t)}}publish(t,n,i){const s={...zt(i),level:n,process:t,timestamp:new Date().toISOString(),traceSeq:this.nextTraceSeq++,producerId:nt()};return X(n)>=X(this.minLevels[t])&&(this.publishToSinks(s),this.subject.next(s)),s}admitRenderer(t,n){const i={...n,level:t,process:"renderer",timestamp:new Date().toISOString(),traceSeq:this.nextTraceSeq++,producerId:nt()};return this.publishToSinks(i),this.subject.next(i),i}ingest(t){if(t.producerId!==void 0&&t.producerId===nt())return;const n=this.minLevels[t.process]??this.minLevels.renderer;X(t.level)<X(n)||(this.publishToSinks(t),this.subject.next(t))}publishToSinks(t){if(this.sinks.size===0)return;const n=Object.freeze({...t,...t.payload?{payload:Object.freeze({...t.payload})}:{}});for(const i of this.sinks)try{i(n)}catch{}}}function J(){const e=globalThis;return e[et]||(e[et]=new Dn),e[et]}function pt(){return J().events$}function Bn(e){return J().registerSink(e)}function jn(e){J().setMinLevel("main",e)}function Ln(e){Wt=e,J().setMinLevel("renderer",e)}function Wn(e){Ft=e}function Fn(e,t){return J().publish("main",e,t)}function zn(e,t,n){return J().publish(e,t,n)}function ur(e){st=e}function Re(e,t){if(!Ft||X(e)<X(Wt))return;const n=J().admitRenderer(e,zt(t));if(st)try{st(n);return}catch{}const i=An();if(!(!i||typeof i.__trace!="function"))try{i.__trace(n)}catch{}}new TextEncoder;var Gn=Object.getOwnPropertyDescriptor,ge=(e,t,n,i)=>{for(var c=i>1?void 0:i?Gn(t,n):t,s=e.length-1,f;s>=0;s--)(f=e[s])&&(c=f(c)||c);return c},Gt=(e,t)=>(n,i)=>t(n,i,e);class ye{registerSink(t){return Bn(t)}extend(t){return new Nn(this,t)}}class Nn extends ye{constructor(t,n){super(),this.parent=t,this.context=n}get mode(){return this.parent.mode}get process(){return this.parent.process}get events$(){return this.parent.events$}traceAt(t,n){this.parent.traceAt(t,this.mergeEvent(n))}debug(t){this.parent.debug(this.mergeEvent(t))}info(t){this.parent.info(this.mergeEvent(t))}warn(t){this.parent.warn(this.mergeEvent(t))}error(t){this.parent.error(this.mergeEvent(t))}mergeEvent(t){return{...this.context,...t}}}let Oe=class{constructor(){this.mode="live",this.runtime="main",this.minLevel="debug",this.enabled=null,this.databasePath=null}configureMode(e){this.mode=e}configureDatabasePath(e){this.databasePath=e}getDatabasePath(){return this.databasePath}configureRuntime(e){this.runtime=e,this.applyRuntimeConfiguration()}configureMinLevel(e){this.minLevel=e,this.applyRuntimeConfiguration()}configureEnabled(e){this.enabled=e,this.applyRuntimeConfiguration()}getMode(){return this.mode}getRuntime(){return this.runtime}getMinLevel(){return this.minLevel}getEnabled(){return this.enabled??this.runtime!=="renderer"}applyRuntimeConfiguration(){if(this.runtime==="renderer"){Wn(this.getEnabled()),Ln(this.minLevel);return}jn(this.minLevel)}};Oe=ge([me({scope:Z.Singleton})],Oe);let ct=class extends ye{constructor(){super(...arguments),this.mode="live",this.process="main",this.events$=pt()}traceAt(e,t){Fn(e,t)}debug(e){this.traceAt("debug",e)}info(e){this.traceAt("info",e)}warn(e){this.traceAt("warn",e)}error(e){this.traceAt("error",e)}};ct=ge([me({scope:Z.Singleton})],ct);let lt=class extends ye{constructor(){super(...arguments),this.mode="live",this.process="renderer",this.events$=pt()}traceAt(e,t){Re(e,t)}debug(e){this.traceAt("debug",e)}info(e){this.traceAt("info",e)}warn(e){this.traceAt("warn",e)}error(e){this.traceAt("error",e)}};lt=ge([me({scope:Z.Singleton})],lt);let ut=class extends ye{constructor(e){super(),this.configuration=e,this.mode="test",this.events$=pt()}get process(){const e=this.configuration.getRuntime();return e==="renderer"?"renderer":e==="main"?"main":"test"}traceAt(e,t){this.publish(e,t)}debug(e){this.traceAt("debug",e)}info(e){this.traceAt("info",e)}warn(e){this.traceAt("warn",e)}error(e){this.traceAt("error",e)}publish(e,t){zn(this.process,e,t)}};ut=ge([me({scope:Z.Singleton}),Gt(0,Ot(Oe))],ut);let Et=class extends ye{constructor(e){super(),this.configuration=e}get mode(){return this.resolveImplementation().mode}get process(){return this.resolveImplementation().process}get events$(){return this.resolveImplementation().events$}traceAt(e,t){this.resolveImplementation().traceAt(e,t)}debug(e){this.resolveImplementation().debug(e)}info(e){this.resolveImplementation().info(e)}warn(e){this.resolveImplementation().warn(e)}error(e){this.resolveImplementation().error(e)}resolveImplementation(){return this.configuration.getMode()==="test"?this.resolveSync(ut):this.configuration.getRuntime()==="renderer"?this.resolveSync(lt):this.resolveSync(ct)}resolveSync(e){var i,c,s;let t=Jt.current()??this.lastScope;if(t&&((i=t.isDisposed)!=null&&i.call(t))){const f=(c=t.contextRoot)==null?void 0:c.call(t),k=f&&!((s=f.isDisposed)!=null&&s.call(f))?f:void 0;if(!k)return Un();t=k,this.lastScope=t}if(!t)throw new Error(`TraceProvider cannot resolve ${e.name}: no active IoC execution context. Resolve TraceProvider through the container and call it from IoC-managed code.`);this.lastScope=t;const n=t.instance(e);if(n instanceof Promise)throw new Error(`${e.name} must resolve synchronously`);return n}};Et=ge([me({scope:Z.Singleton}),Gt(0,Ot(Oe))],Et);function Un(){return new Proxy({},{get:()=>()=>{}})}const rt=Symbol.for("@noego/wood.navigation"),Vn="__wood_navigation_state__";class $n{constructor(){this.entries=[],this.index=-1,this.listeners=new Set}getCurrent(){return this.index<0||this.index>=this.entries.length?null:this.cloneEntry(this.entries[this.index])}getPages(){return this.entries.map(t=>this.cloneEntry(t))}getParams(){const t=this.getCurrent();return t?{...t.params}:{}}replace(t,n={},i={},c={}){const s=this.createEntry(t,n,i,c);return this.index<0?(this.entries.push(s),this.index=0):this.entries[this.index]=s,this.writeWindowHistory("replaceState",s),this.notify(),Re("info",{source:"wood.navigation",type:"navigation.replace",payload:{page:s.page,params:s.params,query:s.query,options:s.options}}),this.cloneEntry(s)}go(t,n={},i={},c={}){const s=this.createEntry(t,n,i,c);return this.index<this.entries.length-1&&(this.entries=this.entries.slice(0,this.index+1)),this.entries.push(s),this.index=this.entries.length-1,this.writeWindowHistory("pushState",s),this.notify(),Re("info",{source:"wood.navigation",type:"navigation.go",payload:{page:s.page,params:s.params,query:s.query,options:s.options}}),this.cloneEntry(s)}goto(t){return this.moveCursor(t)}goBack(){return this.goto(-1)}goForward(){return this.goto(1)}subscribe(t){return this.listeners.add(t),t(this.getCurrent()),()=>{this.listeners.delete(t)}}moveCursor(t){if(t===0)return this.getCurrent();const n=this.index+t;if(n<0||n>=this.entries.length)return this.getCurrent();this.index=n;const i=this.entries[this.index];return this.writeWindowHistory("replaceState",i),this.notify(),Re("info",{source:"wood.navigation",type:"navigation.goto",payload:{delta:t,page:i.page}}),this.cloneEntry(i)}notify(){const t=this.getCurrent();for(const n of this.listeners)n(t)}createEntry(t,n,i,c){return{page:t,params:this.normalizeRecord(n),query:this.normalizeRecord(i),options:{...c}}}cloneEntry(t){return{page:t.page,params:{...t.params},query:{...t.query},options:{...t.options}}}normalizeRecord(t){const n={};for(const[i,c]of Object.entries(t??{}))n[String(i)]=String(c);return n}writeWindowHistory(t,n){if(typeof window>"u")return;const i={[Vn]:!0,page:n.page,params:{...n.params},query:{...n.query},options:{...n.options}};window.history[t](i,"")}}function qn(){return new $n}function Hn(){const e=globalThis;return e[rt]||(e[rt]=qn()),e[rt]}const Yn=[{name:"trace",value:1e3},{name:"debug",value:2e3},{name:"info",value:3e3},{name:"warn",value:4e3},{name:"error",value:5e3},{name:"fatal",value:6e3}],Zn=new Map,Jn=new Map;for(const e of Yn)Qn(e);function Qn(e){const t=Xn(e.name);!t||!Kn(e.value)||(Zn.set(t,e.value),Jn.set(e.value,t.toUpperCase()))}function Xn(e){return e.trim().toLowerCase()}function Kn(e){return Number.isFinite(e)&&e>=0}function er(e){return!!(e.inputSchema&&e.inputSchema.type==="object"&&Object.keys(e.inputSchema.properties??{}).length>0)}function tr(e){return Array.from(e.values()).map(t=>({channel:t.channel,controller:t.controller,action:t.action,path:t.channel.split("."),hasInput:er(t)}))}function nr(e,t){const n={};for(const i of e.keys()){const c=i.split(".");let s=n;for(let k=0;k<c.length-1;k++)s[c[k]]||(s[c[k]]={}),s=s[c[k]];const f=c[c.length-1];s[f]=k=>t.invoke(i,k)}return n.on=(i,c)=>t.subscribe(i,s=>c(s)),n.__rpcManifest=tr(e),{bridge:n}}const rr=`// AUTO-GENERATED by @noego/wood -- do not edit.
//
// Changes here are overwritten by \`wood dev\` and \`wood build\`.
// Update the source files that feed Wood codegen instead.
// To change IPC channels or preload bridge methods, edit the operations YAML configured by
// wood.config.yml main.openapi and regenerate with \`wood dev\` or \`wood build\`.
import { contextBridge, ipcRenderer } from 'electron';
import {
  RendererTraceBatchTransport,
  type WoodRendererTraceInput,
  type WoodTraceBatch,
  type WoodTraceBatchAcknowledgement,
  type WoodTraceBatchPort,
} from '@noego/wood/trace-transport';

const __WOOD_RPC_MANIFEST = [
  {"channel":"app_update.get_status","controller":"app_update","action":"getStatus","path":["app_update","get_status"],"hasInput":false},
  {"channel":"app_update.quit_and_install","controller":"app_update","action":"quitAndInstall","path":["app_update","quit_and_install"],"hasInput":false},
  {"channel":"assets.read","controller":"assets","action":"read","path":["assets","read"],"hasInput":true},
  {"channel":"attachments.export","controller":"attachments","action":"export","path":["attachments","export"],"hasInput":true},
  {"channel":"attachments.get","controller":"attachments","action":"get","path":["attachments","get"],"hasInput":true},
  {"channel":"attachments.list","controller":"attachments","action":"list","path":["attachments","list"],"hasInput":true},
  {"channel":"backend_service.check_release","controller":"backend_service","action":"checkRelease","path":["backend_service","check_release"],"hasInput":false},
  {"channel":"backend_service.disable","controller":"backend_service","action":"disable","path":["backend_service","disable"],"hasInput":false},
  {"channel":"backend_service.enable","controller":"backend_service","action":"enable","path":["backend_service","enable"],"hasInput":false},
  {"channel":"backend_service.install","controller":"backend_service","action":"install","path":["backend_service","install"],"hasInput":true},
  {"channel":"backend_service.recovery","controller":"backend_service","action":"recovery","path":["backend_service","recovery"],"hasInput":false},
  {"channel":"backend_service.retry_with_cancel","controller":"backend_service","action":"retryWithCancel","path":["backend_service","retry_with_cancel"],"hasInput":true},
  {"channel":"backend_service.stage_release","controller":"backend_service","action":"stageRelease","path":["backend_service","stage_release"],"hasInput":true},
  {"channel":"backend_service.status","controller":"backend_service","action":"getStatus","path":["backend_service","status"],"hasInput":false},
  {"channel":"backend_service.uninstall","controller":"backend_service","action":"uninstall","path":["backend_service","uninstall"],"hasInput":false},
  {"channel":"browser.open","controller":"browser","action":"openBrowser","path":["browser","open"],"hasInput":false},
  {"channel":"claude_accounts.add","controller":"claude_accounts","action":"add","path":["claude_accounts","add"],"hasInput":true},
  {"channel":"claude_accounts.cancel_connect","controller":"claude_accounts","action":"cancelConnect","path":["claude_accounts","cancel_connect"],"hasInput":true},
  {"channel":"claude_accounts.connect","controller":"claude_accounts","action":"connect","path":["claude_accounts","connect"],"hasInput":true},
  {"channel":"claude_accounts.list","controller":"claude_accounts","action":"list","path":["claude_accounts","list"],"hasInput":false},
  {"channel":"claude_accounts.recheck","controller":"claude_accounts","action":"recheck","path":["claude_accounts","recheck"],"hasInput":true},
  {"channel":"claude_accounts.remove","controller":"claude_accounts","action":"remove","path":["claude_accounts","remove"],"hasInput":true},
  {"channel":"claude_accounts.submit_code","controller":"claude_accounts","action":"submitCode","path":["claude_accounts","submit_code"],"hasInput":true},
  {"channel":"compaction.run","controller":"compaction","action":"run","path":["compaction","run"],"hasInput":true},
  {"channel":"compaction.status","controller":"compaction","action":"getStatus","path":["compaction","status"],"hasInput":true},
  {"channel":"connect.bind_local","controller":"connect","action":"bindLocal","path":["connect","bind_local"],"hasInput":true},
  {"channel":"connect.disconnect","controller":"connect","action":"disconnect","path":["connect","disconnect"],"hasInput":false},
  {"channel":"connect.execution_binding","controller":"connect","action":"executionBinding","path":["connect","execution_binding"],"hasInput":true},
  {"channel":"connect.list_executors","controller":"connect","action":"listExecutors","path":["connect","list_executors"],"hasInput":false},
  {"channel":"connect.open_browser","controller":"connect","action":"openBrowser","path":["connect","open_browser"],"hasInput":false},
  {"channel":"connect.open_management","controller":"connect","action":"openManagement","path":["connect","open_management"],"hasInput":false},
  {"channel":"connect.refresh_executors","controller":"connect","action":"refreshExecutors","path":["connect","refresh_executors"],"hasInput":false},
  {"channel":"connect.remote_cancel","controller":"connect","action":"remoteCancel","path":["connect","remote_cancel"],"hasInput":true},
  {"channel":"connect.remote_read","controller":"connect","action":"remoteRead","path":["connect","remote_read"],"hasInput":true},
  {"channel":"connect.remote_retry","controller":"connect","action":"remoteRetry","path":["connect","remote_retry"],"hasInput":true},
  {"channel":"connect.remote_send","controller":"connect","action":"remoteSend","path":["connect","remote_send"],"hasInput":true},
  {"channel":"connect.remote_transcript","controller":"connect","action":"remoteTranscript","path":["connect","remote_transcript"],"hasInput":true},
  {"channel":"connect.remote_workspaces","controller":"connect","action":"remoteWorkspaces","path":["connect","remote_workspaces"],"hasInput":true},
  {"channel":"connect.retry","controller":"connect","action":"retry","path":["connect","retry"],"hasInput":false},
  {"channel":"connect.start_link","controller":"connect","action":"startLink","path":["connect","start_link"],"hasInput":false},
  {"channel":"connect.status","controller":"connect","action":"status","path":["connect","status"],"hasInput":false},
  {"channel":"conversation_sync.changes","controller":"conversation_sync","action":"changes","path":["conversation_sync","changes"],"hasInput":true},
  {"channel":"conversation_sync.snapshot","controller":"conversation_sync","action":"snapshot","path":["conversation_sync","snapshot"],"hasInput":true},
  {"channel":"conversations.children","controller":"conversations","action":"children","path":["conversations","children"],"hasInput":true},
  {"channel":"conversations.context","controller":"conversations","action":"context","path":["conversations","context"],"hasInput":true},
  {"channel":"conversations.get","controller":"conversations","action":"get","path":["conversations","get"],"hasInput":true},
  {"channel":"conversations.list","controller":"conversations","action":"list","path":["conversations","list"],"hasInput":true},
  {"channel":"conversations.workspace","controller":"conversations","action":"workspace","path":["conversations","workspace"],"hasInput":true},
  {"channel":"d2.renderSvg","controller":"d2","action":"renderSvg","path":["d2","renderSvg"],"hasInput":true},
  {"channel":"dialog.openDirectory","controller":"dialog","action":"openDirectory","path":["dialog","openDirectory"],"hasInput":false},
  {"channel":"explores.cancel","controller":"explores","action":"cancel","path":["explores","cancel"],"hasInput":true},
  {"channel":"files.listDirectory","controller":"files","action":"listWorkspaceDirectory","path":["files","listDirectory"],"hasInput":true},
  {"channel":"files.readDiff","controller":"files","action":"readWorkspaceFileDiff","path":["files","readDiff"],"hasInput":true},
  {"channel":"files.readFile","controller":"files","action":"readWorkspaceFile","path":["files","readFile"],"hasInput":true},
  {"channel":"files.recordAccess","controller":"files","action":"recordFileAccess","path":["files","recordAccess"],"hasInput":true},
  {"channel":"files.resolvePathKind","controller":"files","action":"resolveWorkspacePathKind","path":["files","resolvePathKind"],"hasInput":true},
  {"channel":"files.search","controller":"files","action":"searchFiles","path":["files","search"],"hasInput":true},
  {"channel":"files.searchContents","controller":"files","action":"searchFileContents","path":["files","searchContents"],"hasInput":true},
  {"channel":"flight_recorder.artifact_chunk.append","controller":"flight_recorder","action":"appendArtifactChunk","path":["flight_recorder","artifact_chunk","append"],"hasInput":true},
  {"channel":"flight_recorder.artifact.begin","controller":"flight_recorder","action":"beginArtifact","path":["flight_recorder","artifact","begin"],"hasInput":true},
  {"channel":"flight_recorder.artifact.commit","controller":"flight_recorder","action":"commitArtifact","path":["flight_recorder","artifact","commit"],"hasInput":true},
  {"channel":"flight_recorder.artifacts.list","controller":"flight_recorder","action":"listArtifacts","path":["flight_recorder","artifacts","list"],"hasInput":false},
  {"channel":"goal_surface.clear","controller":"goal_surface","action":"clear","path":["goal_surface","clear"],"hasInput":true},
  {"channel":"goal_surface.complete","controller":"goal_surface","action":"complete","path":["goal_surface","complete"],"hasInput":true},
  {"channel":"goal_surface.reject","controller":"goal_surface","action":"reject","path":["goal_surface","reject"],"hasInput":true},
  {"channel":"goal_surface.set","controller":"goal_surface","action":"set","path":["goal_surface","set"],"hasInput":true},
  {"channel":"goal_surface.show","controller":"goal_surface","action":"show","path":["goal_surface","show"],"hasInput":true},
  {"channel":"handoffs.cancel","controller":"handoffs","action":"cancel","path":["handoffs","cancel"],"hasInput":true},
  {"channel":"handoffs.children.get","controller":"handoffs","action":"getChild","path":["handoffs","children","get"],"hasInput":true},
  {"channel":"handoffs.children.list","controller":"handoffs","action":"listChildren","path":["handoffs","children","list"],"hasInput":true},
  {"channel":"handoffs.children.stop","controller":"handoffs","action":"stopChild","path":["handoffs","children","stop"],"hasInput":true},
  {"channel":"handoffs.profile.activate","controller":"handoffs","action":"activateProfile","path":["handoffs","profile","activate"],"hasInput":true},
  {"channel":"handoffs.profile.apply","controller":"handoffs","action":"applyProfile","path":["handoffs","profile","apply"],"hasInput":true},
  {"channel":"handoffs.profile.delete","controller":"handoffs","action":"deleteProfile","path":["handoffs","profile","delete"],"hasInput":true},
  {"channel":"handoffs.profile.export","controller":"handoffs","action":"exportProfile","path":["handoffs","profile","export"],"hasInput":true},
  {"channel":"handoffs.profile.show","controller":"handoffs","action":"showProfile","path":["handoffs","profile","show"],"hasInput":true},
  {"channel":"handoffs.profile.validate","controller":"handoffs","action":"validateProfile","path":["handoffs","profile","validate"],"hasInput":true},
  {"channel":"handoffs.profiles","controller":"handoffs","action":"profiles","path":["handoffs","profiles"],"hasInput":false},
  {"channel":"kazibee.deleteEnvVariable","controller":"kazibee","action":"deleteEnvVariable","path":["kazibee","deleteEnvVariable"],"hasInput":true},
  {"channel":"kazibee.getExtensionDetail","controller":"kazibee","action":"getExtensionDetail","path":["kazibee","getExtensionDetail"],"hasInput":true},
  {"channel":"kazibee.installCli","controller":"kazibee","action":"installCli","path":["kazibee","installCli"],"hasInput":false},
  {"channel":"kazibee.installExtension","controller":"kazibee","action":"installExtension","path":["kazibee","installExtension"],"hasInput":true},
  {"channel":"kazibee.linkExtension","controller":"kazibee","action":"linkExtension","path":["kazibee","linkExtension"],"hasInput":true},
  {"channel":"kazibee.listExtensions","controller":"kazibee","action":"listExtensions","path":["kazibee","listExtensions"],"hasInput":false},
  {"channel":"kazibee.removeExtension","controller":"kazibee","action":"removeExtension","path":["kazibee","removeExtension"],"hasInput":true},
  {"channel":"kazibee.runExtensionCommand","controller":"kazibee","action":"runExtensionCommand","path":["kazibee","runExtensionCommand"],"hasInput":true},
  {"channel":"kazibee.setEnvVariable","controller":"kazibee","action":"setEnvVariable","path":["kazibee","setEnvVariable"],"hasInput":true},
  {"channel":"kazibee.updateExtension","controller":"kazibee","action":"updateExtension","path":["kazibee","updateExtension"],"hasInput":true},
  {"channel":"master_control.adopt","controller":"master_control","action":"adopt","path":["master_control","adopt"],"hasInput":true},
  {"channel":"master_control.configure","controller":"master_control","action":"configure","path":["master_control","configure"],"hasInput":true},
  {"channel":"master_control.continue","controller":"master_control","action":"continueRoot","path":["master_control","continue"],"hasInput":true},
  {"channel":"master_control.message","controller":"master_control","action":"message","path":["master_control","message"],"hasInput":true},
  {"channel":"master_control.monitor","controller":"master_control","action":"monitor","path":["master_control","monitor"],"hasInput":true},
  {"channel":"master_control.read","controller":"master_control","action":"read","path":["master_control","read"],"hasInput":true},
  {"channel":"master_control.reconcile","controller":"master_control","action":"reconcile","path":["master_control","reconcile"],"hasInput":true},
  {"channel":"master_control.stop","controller":"master_control","action":"stop","path":["master_control","stop"],"hasInput":true},
  {"channel":"master_surface.clear","controller":"master_surface","action":"clear","path":["master_surface","clear"],"hasInput":false},
  {"channel":"master_surface.open","controller":"master_surface","action":"open","path":["master_surface","open"],"hasInput":false},
  {"channel":"master_surface.rotate","controller":"master_surface","action":"rotate","path":["master_surface","rotate"],"hasInput":true},
  {"channel":"master_surface.status","controller":"master_surface","action":"status","path":["master_surface","status"],"hasInput":false},
  {"channel":"messages.cancel","controller":"messages","action":"cancel","path":["messages","cancel"],"hasInput":true},
  {"channel":"messages.compactions.listByTurnIds","controller":"messages","action":"listCompactionsByTurnIds","path":["messages","compactions","listByTurnIds"],"hasInput":true},
  {"channel":"messages.compactions.listForThread","controller":"messages","action":"listCompactionsForThread","path":["messages","compactions","listForThread"],"hasInput":true},
  {"channel":"messages.file_comment_annotations.create","controller":"messages","action":"createFileCommentAnnotation","path":["messages","file_comment_annotations","create"],"hasInput":true},
  {"channel":"messages.file_comment_annotations.dismiss","controller":"messages","action":"dismissFileCommentAnnotation","path":["messages","file_comment_annotations","dismiss"],"hasInput":true},
  {"channel":"messages.file_comment_annotations.list","controller":"messages","action":"listFileCommentAnnotations","path":["messages","file_comment_annotations","list"],"hasInput":true},
  {"channel":"messages.get","controller":"messages","action":"get","path":["messages","get"],"hasInput":true},
  {"channel":"messages.latest_window.get","controller":"messages","action":"getLatestWindow","path":["messages","latest_window","get"],"hasInput":true},
  {"channel":"messages.newer_page.get","controller":"messages","action":"getNewerPage","path":["messages","newer_page","get"],"hasInput":true},
  {"channel":"messages.older_page.get","controller":"messages","action":"getOlderPage","path":["messages","older_page","get"],"hasInput":true},
  {"channel":"messages.provider_runs.load","controller":"messages","action":"loadProviderRuns","path":["messages","provider_runs","load"],"hasInput":true},
  {"channel":"messages.retry","controller":"messages","action":"retry","path":["messages","retry"],"hasInput":true},
  {"channel":"messages.send","controller":"messages","action":"send","path":["messages","send"],"hasInput":true},
  {"channel":"messages.startAnalysis","controller":"messages","action":"startAnalysis","path":["messages","startAnalysis"],"hasInput":true},
  {"channel":"messages.subagent_activity.get","controller":"messages","action":"getSubagentActivity","path":["messages","subagent_activity","get"],"hasInput":true},
  {"channel":"messages.subagent_run_complete.list","controller":"messages","action":"listSubagentRunComplete","path":["messages","subagent_run_complete","list"],"hasInput":true},
  {"channel":"messages.tokens_ledger.load","controller":"messages","action":"loadTokensLedger","path":["messages","tokens_ledger","load"],"hasInput":true},
  {"channel":"models.list","controller":"models","action":"list","path":["models","list"],"hasInput":false},
  {"channel":"models.list_all","controller":"models","action":"listAll","path":["models","list_all"],"hasInput":false},
  {"channel":"models.load_frecency_scores","controller":"models","action":"loadFrecencyScores","path":["models","load_frecency_scores"],"hasInput":false},
  {"channel":"models.record_access","controller":"models","action":"recordAccess","path":["models","record_access"],"hasInput":true},
  {"channel":"models.set_favorite","controller":"models","action":"setFavorite","path":["models","set_favorite"],"hasInput":true},
  {"channel":"notifications.backgroundWorkCount","controller":"notifications","action":"backgroundWorkCount","path":["notifications","backgroundWorkCount"],"hasInput":true},
  {"channel":"notifications.showCompletion","controller":"notifications","action":"showCompletion","path":["notifications","showCompletion"],"hasInput":true},
  {"channel":"notifications.showTest","controller":"notifications","action":"showTest","path":["notifications","showTest"],"hasInput":false},
  {"channel":"onboarding.deleteProviderApiCredential","controller":"onboarding","action":"deleteProviderApiCredential","path":["onboarding","deleteProviderApiCredential"],"hasInput":true},
  {"channel":"onboarding.getProviderEnvAvailability","controller":"onboarding","action":"getProviderEnvAvailability","path":["onboarding","getProviderEnvAvailability"],"hasInput":false},
  {"channel":"onboarding.getProviderEnvKeys","controller":"onboarding","action":"getProviderEnvKeys","path":["onboarding","getProviderEnvKeys"],"hasInput":false},
  {"channel":"onboarding.getSavedProviderApiCredentials","controller":"onboarding","action":"getSavedProviderApiCredentials","path":["onboarding","getSavedProviderApiCredentials"],"hasInput":false},
  {"channel":"onboarding.installCliTool","controller":"onboarding","action":"installCliTool","path":["onboarding","installCliTool"],"hasInput":true},
  {"channel":"onboarding.runApiProbe","controller":"onboarding","action":"runApiProbe","path":["onboarding","runApiProbe"],"hasInput":true},
  {"channel":"onboarding.runCliProbe","controller":"onboarding","action":"runCliProbe","path":["onboarding","runCliProbe"],"hasInput":true},
  {"channel":"onboarding.saveProviderApiCredential","controller":"onboarding","action":"saveProviderApiCredential","path":["onboarding","saveProviderApiCredential"],"hasInput":true},
  {"channel":"plans.activate","controller":"plans","action":"activate","path":["plans","activate"],"hasInput":true},
  {"channel":"plans.deactivate","controller":"plans","action":"deactivate","path":["plans","deactivate"],"hasInput":true},
  {"channel":"plans.list","controller":"plans","action":"list","path":["plans","list"],"hasInput":true},
  {"channel":"plans.start","controller":"plans","action":"start","path":["plans","start"],"hasInput":true},
  {"channel":"plans.status","controller":"plans","action":"status","path":["plans","status"],"hasInput":true},
  {"channel":"process_output.lookup_running","controller":"process_output","action":"lookupRunning","path":["process_output","lookup_running"],"hasInput":true},
  {"channel":"process_output.subscribe","controller":"process_output","action":"subscribe","path":["process_output","subscribe"],"hasInput":true},
  {"channel":"process_output.unsubscribe","controller":"process_output","action":"unsubscribe","path":["process_output","unsubscribe"],"hasInput":true},
  {"channel":"relay.disable","controller":"relay","action":"disable","path":["relay","disable"],"hasInput":false},
  {"channel":"relay.enable","controller":"relay","action":"enable","path":["relay","enable"],"hasInput":true},
  {"channel":"relay.get_status","controller":"relay","action":"getStatus","path":["relay","get_status"],"hasInput":false},
  {"channel":"relay.start_pairing","controller":"relay","action":"startPairing","path":["relay","start_pairing"],"hasInput":false},
  {"channel":"relay.stop_pairing","controller":"relay","action":"stopPairing","path":["relay","stop_pairing"],"hasInput":false},
  {"channel":"remote_tools.disconnect","controller":"remote_tools","action":"disconnect","path":["remote_tools","disconnect"],"hasInput":false},
  {"channel":"remote_tools.list_workspaces","controller":"remote_tools","action":"listWorkspaces","path":["remote_tools","list_workspaces"],"hasInput":false},
  {"channel":"remote_tools.open_browser","controller":"remote_tools","action":"openBrowser","path":["remote_tools","open_browser"],"hasInput":false},
  {"channel":"remote_tools.retry","controller":"remote_tools","action":"retry","path":["remote_tools","retry"],"hasInput":false},
  {"channel":"remote_tools.set_workspace_enabled","controller":"remote_tools","action":"setWorkspaceEnabled","path":["remote_tools","set_workspace_enabled"],"hasInput":true},
  {"channel":"remote_tools.start_link","controller":"remote_tools","action":"startLink","path":["remote_tools","start_link"],"hasInput":false},
  {"channel":"remote_tools.status","controller":"remote_tools","action":"status","path":["remote_tools","status"],"hasInput":false},
  {"channel":"scheduled_tasks.create","controller":"scheduled_tasks","action":"create","path":["scheduled_tasks","create"],"hasInput":true},
  {"channel":"scheduled_tasks.debugPhase","controller":"scheduled_tasks","action":"debugPhase","path":["scheduled_tasks","debugPhase"],"hasInput":true},
  {"channel":"scheduled_tasks.delete","controller":"scheduled_tasks","action":"delete","path":["scheduled_tasks","delete"],"hasInput":true},
  {"channel":"scheduled_tasks.discardDraft","controller":"scheduled_tasks","action":"discardDraft","path":["scheduled_tasks","discardDraft"],"hasInput":true},
  {"channel":"scheduled_tasks.generateInputSchema","controller":"scheduled_tasks","action":"generateInputSchema","path":["scheduled_tasks","generateInputSchema"],"hasInput":true},
  {"channel":"scheduled_tasks.get","controller":"scheduled_tasks","action":"get","path":["scheduled_tasks","get"],"hasInput":true},
  {"channel":"scheduled_tasks.getRunDetail","controller":"scheduled_tasks","action":"getRunDetail","path":["scheduled_tasks","getRunDetail"],"hasInput":true},
  {"channel":"scheduled_tasks.list","controller":"scheduled_tasks","action":"list","path":["scheduled_tasks","list"],"hasInput":true},
  {"channel":"scheduled_tasks.listRuns","controller":"scheduled_tasks","action":"listRuns","path":["scheduled_tasks","listRuns"],"hasInput":true},
  {"channel":"scheduled_tasks.listToolGroups","controller":"scheduled_tasks","action":"listToolGroups","path":["scheduled_tasks","listToolGroups"],"hasInput":false},
  {"channel":"scheduled_tasks.listVersions","controller":"scheduled_tasks","action":"listVersions","path":["scheduled_tasks","listVersions"],"hasInput":true},
  {"channel":"scheduled_tasks.previewRun","controller":"scheduled_tasks","action":"previewRun","path":["scheduled_tasks","previewRun"],"hasInput":true},
  {"channel":"scheduled_tasks.restoreVersion","controller":"scheduled_tasks","action":"restoreVersion","path":["scheduled_tasks","restoreVersion"],"hasInput":true},
  {"channel":"scheduled_tasks.runNow","controller":"scheduled_tasks","action":"runNow","path":["scheduled_tasks","runNow"],"hasInput":true},
  {"channel":"scheduled_tasks.saveDraft","controller":"scheduled_tasks","action":"saveDraft","path":["scheduled_tasks","saveDraft"],"hasInput":true},
  {"channel":"scheduled_tasks.setEnabled","controller":"scheduled_tasks","action":"setEnabled","path":["scheduled_tasks","setEnabled"],"hasInput":true},
  {"channel":"scheduled_tasks.updateDraft","controller":"scheduled_tasks","action":"updateDraft","path":["scheduled_tasks","updateDraft"],"hasInput":true},
  {"channel":"scheduled_tasks.validateWorkflow","controller":"scheduled_tasks","action":"validateWorkflow","path":["scheduled_tasks","validateWorkflow"],"hasInput":true},
  {"channel":"settings_navigation.acknowledge","controller":"settings_navigation","action":"acknowledge","path":["settings_navigation","acknowledge"],"hasInput":true},
  {"channel":"settings_view.clear","controller":"settings_view","action":"clear","path":["settings_view","clear"],"hasInput":false},
  {"channel":"settings_view.publish","controller":"settings_view","action":"publish","path":["settings_view","publish"],"hasInput":true},
  {"channel":"settings.get","controller":"settings","action":"getPreferences","path":["settings","get"],"hasInput":false},
  {"channel":"settings.update","controller":"settings","action":"updatePreferences","path":["settings","update"],"hasInput":true},
  {"channel":"swarm_room.board","controller":"swarm_room","action":"board","path":["swarm_room","board"],"hasInput":true},
  {"channel":"swarm_room.cancelProject","controller":"swarm_room","action":"cancelProject","path":["swarm_room","cancelProject"],"hasInput":true},
  {"channel":"swarm_room.diagnostics","controller":"swarm_room","action":"diagnostics","path":["swarm_room","diagnostics"],"hasInput":true},
  {"channel":"swarm_room.groupDetail","controller":"swarm_room","action":"groupDetail","path":["swarm_room","groupDetail"],"hasInput":true},
  {"channel":"swarm_room.list","controller":"swarm_room","action":"list","path":["swarm_room","list"],"hasInput":true},
  {"channel":"swarm_room.postBoard","controller":"swarm_room","action":"postBoard","path":["swarm_room","postBoard"],"hasInput":true},
  {"channel":"swarm_room.status","controller":"swarm_room","action":"status","path":["swarm_room","status"],"hasInput":true},
  {"channel":"swarm_room.stop","controller":"swarm_room","action":"stop","path":["swarm_room","stop"],"hasInput":true},
  {"channel":"swarm_room.waiveFinding","controller":"swarm_room","action":"waiveFinding","path":["swarm_room","waiveFinding"],"hasInput":true},
  {"channel":"threads.configure","controller":"threads","action":"configure","path":["threads","configure"],"hasInput":true},
  {"channel":"threads.create","controller":"threads","action":"create","path":["threads","create"],"hasInput":true},
  {"channel":"threads.create_orchestrator","controller":"threads","action":"createOrchestratorThread","path":["threads","create_orchestrator"],"hasInput":true},
  {"channel":"threads.create_settings_assistant","controller":"threads","action":"createSettingsAssistantThread","path":["threads","create_settings_assistant"],"hasInput":false},
  {"channel":"threads.delete","controller":"threads","action":"delete","path":["threads","delete"],"hasInput":true},
  {"channel":"threads.ensure_orchestrator","controller":"threads","action":"ensureOrchestratorThread","path":["threads","ensure_orchestrator"],"hasInput":true},
  {"channel":"threads.fastMode.update","controller":"threads","action":"updateFastMode","path":["threads","fastMode","update"],"hasInput":true},
  {"channel":"threads.fork","controller":"threads","action":"fork","path":["threads","fork"],"hasInput":true},
  {"channel":"threads.getCompletedAt","controller":"threads","action":"getCompletedAt","path":["threads","getCompletedAt"],"hasInput":true},
  {"channel":"threads.list_orchestrator","controller":"threads","action":"listOrchestratorThreads","path":["threads","list_orchestrator"],"hasInput":true},
  {"channel":"threads.markCompleted","controller":"threads","action":"markCompleted","path":["threads","markCompleted"],"hasInput":true},
  {"channel":"threads.markUncompleted","controller":"threads","action":"markUncompleted","path":["threads","markUncompleted"],"hasInput":true},
  {"channel":"threads.mode.update","controller":"threads","action":"updateThreadMode","path":["threads","mode","update"],"hasInput":true},
  {"channel":"threads.model.update","controller":"threads","action":"updateModel","path":["threads","model","update"],"hasInput":true},
  {"channel":"threads.priority.update","controller":"threads","action":"updatePriority","path":["threads","priority","update"],"hasInput":true},
  {"channel":"threads.reasoning.update","controller":"threads","action":"updateReasoningLevel","path":["threads","reasoning","update"],"hasInput":true},
  {"channel":"threads.rename","controller":"threads","action":"rename","path":["threads","rename"],"hasInput":true},
  {"channel":"threads.researchDepth.get","controller":"threads","action":"getResearchDepth","path":["threads","researchDepth","get"],"hasInput":true},
  {"channel":"threads.researchDepth.update","controller":"threads","action":"updateResearchDepth","path":["threads","researchDepth","update"],"hasInput":true},
  {"channel":"threads.supervisor.update","controller":"threads","action":"updateSupervisorEnabled","path":["threads","supervisor","update"],"hasInput":true},
  {"channel":"transcript.attach","controller":"transcript","action":"attach","path":["transcript","attach"],"hasInput":true},
  {"channel":"transcript.detach","controller":"transcript","action":"detach","path":["transcript","detach"],"hasInput":true},
  {"channel":"transcript.dismissStreamNotification","controller":"transcript","action":"dismissStreamNotification","path":["transcript","dismissStreamNotification"],"hasInput":true},
  {"channel":"transcript.repair","controller":"transcript","action":"repair","path":["transcript","repair"],"hasInput":true},
  {"channel":"workspace.activeThread.get","controller":"workspace","action":"getActiveThread","path":["workspace","activeThread","get"],"hasInput":true},
  {"channel":"workspace.activeThread.set","controller":"workspace","action":"setActiveThread","path":["workspace","activeThread","set"],"hasInput":true},
  {"channel":"workspace.collaborative.register","controller":"workspace","action":"registerCollaborativeWorkspace","path":["workspace","collaborative","register"],"hasInput":true},
  {"channel":"workspace.create","controller":"workspace","action":"create","path":["workspace","create"],"hasInput":true},
  {"channel":"workspace.delete","controller":"workspace","action":"delete","path":["workspace","delete"],"hasInput":true},
  {"channel":"workspace.folders.add","controller":"workspace","action":"addFolder","path":["workspace","folders","add"],"hasInput":true},
  {"channel":"workspace.folders.clearCandidates","controller":"workspace","action":"listFolderClearCandidates","path":["workspace","folders","clearCandidates"],"hasInput":true},
  {"channel":"workspace.folders.delete","controller":"workspace","action":"deleteFolder","path":["workspace","folders","delete"],"hasInput":true},
  {"channel":"workspace.folders.threads","controller":"workspace","action":"listFolderThreads","path":["workspace","folders","threads"],"hasInput":true},
  {"channel":"workspace.list","controller":"workspace","action":"list","path":["workspace","list"],"hasInput":false},
  {"channel":"workspace.operations.run","controller":"workspace","action":"runWorkspaceOperation","path":["workspace","operations","run"],"hasInput":true},
  {"channel":"workspace.participants.attach","controller":"workspace","action":"attachWorkspaceParticipant","path":["workspace","participants","attach"],"hasInput":true},
  {"channel":"workspace.participants.detach","controller":"workspace","action":"detachWorkspaceParticipant","path":["workspace","participants","detach"],"hasInput":true},
  {"channel":"workspace.rename","controller":"workspace","action":"rename","path":["workspace","rename"],"hasInput":true},
  {"channel":"workspace.select","controller":"workspace","action":"select","path":["workspace","select"],"hasInput":true},
  {"channel":"workspace.threads.search","controller":"workspace","action":"searchThreads","path":["workspace","threads","search"],"hasInput":true},
  {"channel":"worktree.branches","controller":"worktree","action":"listBranches","path":["worktree","branches"],"hasInput":true},
  {"channel":"worktree.checkoutBranch","controller":"worktree","action":"checkoutBranchInPlace","path":["worktree","checkoutBranch"],"hasInput":true},
  {"channel":"worktree.createBranch","controller":"worktree","action":"createBranch","path":["worktree","createBranch"],"hasInput":true},
  {"channel":"worktree.delete","controller":"worktree","action":"deleteWorktree","path":["worktree","delete"],"hasInput":true},
  {"channel":"worktree.deleteBranch","controller":"worktree","action":"deleteBranch","path":["worktree","deleteBranch"],"hasInput":true},
  {"channel":"worktree.migrateClaim","controller":"worktree","action":"migrateClaim","path":["worktree","migrateClaim"],"hasInput":true},
  {"channel":"worktree.promote","controller":"worktree","action":"promote","path":["worktree","promote"],"hasInput":true},
  {"channel":"worktree.releaseClaim","controller":"worktree","action":"releaseClaim","path":["worktree","releaseClaim"],"hasInput":true},
  {"channel":"worktree.status","controller":"worktree","action":"getStatus","path":["worktree","status"],"hasInput":true},
  {"channel":"worktree.switch","controller":"worktree","action":"switchBranch","path":["worktree","switch"],"hasInput":true},
];

const __WOOD_INTERNAL_BRIDGE_KEY = '__NOEGO_WOOD_BRIDGE__';

contextBridge.exposeInMainWorld(__WOOD_INTERNAL_BRIDGE_KEY, {
  app_update: {
    get_status: () =>
      ipcRenderer.invoke('app_update.get_status'),
    quit_and_install: () =>
      ipcRenderer.invoke('app_update.quit_and_install'),
  },
  backend_service: {
    status: () =>
      ipcRenderer.invoke('backend_service.status'),
    check_release: () =>
      ipcRenderer.invoke('backend_service.check_release'),
    stage_release: (data: unknown) =>
      ipcRenderer.invoke('backend_service.stage_release', data),
    install: (data: unknown) =>
      ipcRenderer.invoke('backend_service.install', data),
    enable: () =>
      ipcRenderer.invoke('backend_service.enable'),
    disable: () =>
      ipcRenderer.invoke('backend_service.disable'),
    retry_with_cancel: (data: unknown) =>
      ipcRenderer.invoke('backend_service.retry_with_cancel', data),
    uninstall: () =>
      ipcRenderer.invoke('backend_service.uninstall'),
    recovery: () =>
      ipcRenderer.invoke('backend_service.recovery'),
  },
  workspace: {
    list: () =>
      ipcRenderer.invoke('workspace.list'),
    create: (data: unknown) =>
      ipcRenderer.invoke('workspace.create', data),
    rename: (data: unknown) =>
      ipcRenderer.invoke('workspace.rename', data),
    delete: (data: unknown) =>
      ipcRenderer.invoke('workspace.delete', data),
    select: (data: unknown) =>
      ipcRenderer.invoke('workspace.select', data),
    activeThread: {
      set: (data: unknown) =>
        ipcRenderer.invoke('workspace.activeThread.set', data),
      get: (data: unknown) =>
        ipcRenderer.invoke('workspace.activeThread.get', data),
    },
    folders: {
      add: (data: unknown) =>
        ipcRenderer.invoke('workspace.folders.add', data),
      delete: (data: unknown) =>
        ipcRenderer.invoke('workspace.folders.delete', data),
      threads: (data: unknown) =>
        ipcRenderer.invoke('workspace.folders.threads', data),
      clearCandidates: (data: unknown) =>
        ipcRenderer.invoke('workspace.folders.clearCandidates', data),
    },
    threads: {
      search: (data: unknown) =>
        ipcRenderer.invoke('workspace.threads.search', data),
    },
    collaborative: {
      register: (data: unknown) =>
        ipcRenderer.invoke('workspace.collaborative.register', data),
    },
    participants: {
      attach: (data: unknown) =>
        ipcRenderer.invoke('workspace.participants.attach', data),
      detach: (data: unknown) =>
        ipcRenderer.invoke('workspace.participants.detach', data),
    },
    operations: {
      run: (data: unknown) =>
        ipcRenderer.invoke('workspace.operations.run', data),
    },
  },
  worktree: {
    status: (data: unknown) =>
      ipcRenderer.invoke('worktree.status', data),
    branches: (data: unknown) =>
      ipcRenderer.invoke('worktree.branches', data),
    switch: (data: unknown) =>
      ipcRenderer.invoke('worktree.switch', data),
    createBranch: (data: unknown) =>
      ipcRenderer.invoke('worktree.createBranch', data),
    checkoutBranch: (data: unknown) =>
      ipcRenderer.invoke('worktree.checkoutBranch', data),
    delete: (data: unknown) =>
      ipcRenderer.invoke('worktree.delete', data),
    deleteBranch: (data: unknown) =>
      ipcRenderer.invoke('worktree.deleteBranch', data),
    promote: (data: unknown) =>
      ipcRenderer.invoke('worktree.promote', data),
    releaseClaim: (data: unknown) =>
      ipcRenderer.invoke('worktree.releaseClaim', data),
    migrateClaim: (data: unknown) =>
      ipcRenderer.invoke('worktree.migrateClaim', data),
  },
  dialog: {
    openDirectory: () =>
      ipcRenderer.invoke('dialog.openDirectory'),
  },
  attachments: {
    list: (data: unknown) =>
      ipcRenderer.invoke('attachments.list', data),
    get: (data: unknown) =>
      ipcRenderer.invoke('attachments.get', data),
    export: (data: unknown) =>
      ipcRenderer.invoke('attachments.export', data),
  },
  assets: {
    read: (data: unknown) =>
      ipcRenderer.invoke('assets.read', data),
  },
  conversations: {
    list: (data: unknown) =>
      ipcRenderer.invoke('conversations.list', data),
    get: (data: unknown) =>
      ipcRenderer.invoke('conversations.get', data),
    children: (data: unknown) =>
      ipcRenderer.invoke('conversations.children', data),
    context: (data: unknown) =>
      ipcRenderer.invoke('conversations.context', data),
    workspace: (data: unknown) =>
      ipcRenderer.invoke('conversations.workspace', data),
  },
  conversation_sync: {
    snapshot: (data: unknown) =>
      ipcRenderer.invoke('conversation_sync.snapshot', data),
    changes: (data: unknown) =>
      ipcRenderer.invoke('conversation_sync.changes', data),
  },
  messages: {
    get: (data: unknown) =>
      ipcRenderer.invoke('messages.get', data),
    latest_window: {
      get: (data: unknown) =>
        ipcRenderer.invoke('messages.latest_window.get', data),
    },
    older_page: {
      get: (data: unknown) =>
        ipcRenderer.invoke('messages.older_page.get', data),
    },
    newer_page: {
      get: (data: unknown) =>
        ipcRenderer.invoke('messages.newer_page.get', data),
    },
    subagent_activity: {
      get: (data: unknown) =>
        ipcRenderer.invoke('messages.subagent_activity.get', data),
    },
    subagent_run_complete: {
      list: (data: unknown) =>
        ipcRenderer.invoke('messages.subagent_run_complete.list', data),
    },
    provider_runs: {
      load: (data: unknown) =>
        ipcRenderer.invoke('messages.provider_runs.load', data),
    },
    tokens_ledger: {
      load: (data: unknown) =>
        ipcRenderer.invoke('messages.tokens_ledger.load', data),
    },
    file_comment_annotations: {
      create: (data: unknown) =>
        ipcRenderer.invoke('messages.file_comment_annotations.create', data),
      list: (data: unknown) =>
        ipcRenderer.invoke('messages.file_comment_annotations.list', data),
      dismiss: (data: unknown) =>
        ipcRenderer.invoke('messages.file_comment_annotations.dismiss', data),
    },
    compactions: {
      listByTurnIds: (data: unknown) =>
        ipcRenderer.invoke('messages.compactions.listByTurnIds', data),
      listForThread: (data: unknown) =>
        ipcRenderer.invoke('messages.compactions.listForThread', data),
    },
    startAnalysis: (data: unknown) =>
      ipcRenderer.invoke('messages.startAnalysis', data),
    send: (data: unknown) =>
      ipcRenderer.invoke('messages.send', data),
    retry: (data: unknown) =>
      ipcRenderer.invoke('messages.retry', data),
    cancel: (data: unknown) =>
      ipcRenderer.invoke('messages.cancel', data),
  },
  flight_recorder: {
    artifact: {
      begin: (data: unknown) =>
        ipcRenderer.invoke('flight_recorder.artifact.begin', data),
      commit: (data: unknown) =>
        ipcRenderer.invoke('flight_recorder.artifact.commit', data),
    },
    artifact_chunk: {
      append: (data: unknown) =>
        ipcRenderer.invoke('flight_recorder.artifact_chunk.append', data),
    },
    artifacts: {
      list: () =>
        ipcRenderer.invoke('flight_recorder.artifacts.list'),
    },
  },
  compaction: {
    run: (data: unknown) =>
      ipcRenderer.invoke('compaction.run', data),
    status: (data: unknown) =>
      ipcRenderer.invoke('compaction.status', data),
  },
  transcript: {
    attach: (data: unknown) =>
      ipcRenderer.invoke('transcript.attach', data),
    detach: (data: unknown) =>
      ipcRenderer.invoke('transcript.detach', data),
    repair: (data: unknown) =>
      ipcRenderer.invoke('transcript.repair', data),
    dismissStreamNotification: (data: unknown) =>
      ipcRenderer.invoke('transcript.dismissStreamNotification', data),
  },
  models: {
    list: () =>
      ipcRenderer.invoke('models.list'),
    list_all: () =>
      ipcRenderer.invoke('models.list_all'),
    set_favorite: (data: unknown) =>
      ipcRenderer.invoke('models.set_favorite', data),
    record_access: (data: unknown) =>
      ipcRenderer.invoke('models.record_access', data),
    load_frecency_scores: () =>
      ipcRenderer.invoke('models.load_frecency_scores'),
  },
  threads: {
    create: (data: unknown) =>
      ipcRenderer.invoke('threads.create', data),
    create_settings_assistant: () =>
      ipcRenderer.invoke('threads.create_settings_assistant'),
    ensure_orchestrator: (data: unknown) =>
      ipcRenderer.invoke('threads.ensure_orchestrator', data),
    create_orchestrator: (data: unknown) =>
      ipcRenderer.invoke('threads.create_orchestrator', data),
    list_orchestrator: (data: unknown) =>
      ipcRenderer.invoke('threads.list_orchestrator', data),
    fork: (data: unknown) =>
      ipcRenderer.invoke('threads.fork', data),
    delete: (data: unknown) =>
      ipcRenderer.invoke('threads.delete', data),
    rename: (data: unknown) =>
      ipcRenderer.invoke('threads.rename', data),
    model: {
      update: (data: unknown) =>
        ipcRenderer.invoke('threads.model.update', data),
    },
    supervisor: {
      update: (data: unknown) =>
        ipcRenderer.invoke('threads.supervisor.update', data),
    },
    fastMode: {
      update: (data: unknown) =>
        ipcRenderer.invoke('threads.fastMode.update', data),
    },
    researchDepth: {
      get: (data: unknown) =>
        ipcRenderer.invoke('threads.researchDepth.get', data),
      update: (data: unknown) =>
        ipcRenderer.invoke('threads.researchDepth.update', data),
    },
    priority: {
      update: (data: unknown) =>
        ipcRenderer.invoke('threads.priority.update', data),
    },
    reasoning: {
      update: (data: unknown) =>
        ipcRenderer.invoke('threads.reasoning.update', data),
    },
    mode: {
      update: (data: unknown) =>
        ipcRenderer.invoke('threads.mode.update', data),
    },
    configure: (data: unknown) =>
      ipcRenderer.invoke('threads.configure', data),
    markCompleted: (data: unknown) =>
      ipcRenderer.invoke('threads.markCompleted', data),
    markUncompleted: (data: unknown) =>
      ipcRenderer.invoke('threads.markUncompleted', data),
    getCompletedAt: (data: unknown) =>
      ipcRenderer.invoke('threads.getCompletedAt', data),
  },
  plans: {
    status: (data: unknown) =>
      ipcRenderer.invoke('plans.status', data),
    list: (data: unknown) =>
      ipcRenderer.invoke('plans.list', data),
    activate: (data: unknown) =>
      ipcRenderer.invoke('plans.activate', data),
    deactivate: (data: unknown) =>
      ipcRenderer.invoke('plans.deactivate', data),
    start: (data: unknown) =>
      ipcRenderer.invoke('plans.start', data),
  },
  settings: {
    get: () =>
      ipcRenderer.invoke('settings.get'),
    update: (data: unknown) =>
      ipcRenderer.invoke('settings.update', data),
  },
  settings_view: {
    publish: (data: unknown) =>
      ipcRenderer.invoke('settings_view.publish', data),
    clear: () =>
      ipcRenderer.invoke('settings_view.clear'),
  },
  settings_navigation: {
    acknowledge: (data: unknown) =>
      ipcRenderer.invoke('settings_navigation.acknowledge', data),
  },
  handoffs: {
    cancel: (data: unknown) =>
      ipcRenderer.invoke('handoffs.cancel', data),
    profiles: () =>
      ipcRenderer.invoke('handoffs.profiles'),
    profile: {
      show: (data: unknown) =>
        ipcRenderer.invoke('handoffs.profile.show', data),
      export: (data: unknown) =>
        ipcRenderer.invoke('handoffs.profile.export', data),
      validate: (data: unknown) =>
        ipcRenderer.invoke('handoffs.profile.validate', data),
      apply: (data: unknown) =>
        ipcRenderer.invoke('handoffs.profile.apply', data),
      activate: (data: unknown) =>
        ipcRenderer.invoke('handoffs.profile.activate', data),
      delete: (data: unknown) =>
        ipcRenderer.invoke('handoffs.profile.delete', data),
    },
    children: {
      list: (data: unknown) =>
        ipcRenderer.invoke('handoffs.children.list', data),
      get: (data: unknown) =>
        ipcRenderer.invoke('handoffs.children.get', data),
      stop: (data: unknown) =>
        ipcRenderer.invoke('handoffs.children.stop', data),
    },
  },
  explores: {
    cancel: (data: unknown) =>
      ipcRenderer.invoke('explores.cancel', data),
  },
  scheduled_tasks: {
    list: (data: unknown) =>
      ipcRenderer.invoke('scheduled_tasks.list', data),
    listRuns: (data: unknown) =>
      ipcRenderer.invoke('scheduled_tasks.listRuns', data),
    create: (data: unknown) =>
      ipcRenderer.invoke('scheduled_tasks.create', data),
    delete: (data: unknown) =>
      ipcRenderer.invoke('scheduled_tasks.delete', data),
    runNow: (data: unknown) =>
      ipcRenderer.invoke('scheduled_tasks.runNow', data),
    validateWorkflow: (data: unknown) =>
      ipcRenderer.invoke('scheduled_tasks.validateWorkflow', data),
    listToolGroups: () =>
      ipcRenderer.invoke('scheduled_tasks.listToolGroups'),
    generateInputSchema: (data: unknown) =>
      ipcRenderer.invoke('scheduled_tasks.generateInputSchema', data),
    get: (data: unknown) =>
      ipcRenderer.invoke('scheduled_tasks.get', data),
    getRunDetail: (data: unknown) =>
      ipcRenderer.invoke('scheduled_tasks.getRunDetail', data),
    listVersions: (data: unknown) =>
      ipcRenderer.invoke('scheduled_tasks.listVersions', data),
    restoreVersion: (data: unknown) =>
      ipcRenderer.invoke('scheduled_tasks.restoreVersion', data),
    updateDraft: (data: unknown) =>
      ipcRenderer.invoke('scheduled_tasks.updateDraft', data),
    saveDraft: (data: unknown) =>
      ipcRenderer.invoke('scheduled_tasks.saveDraft', data),
    discardDraft: (data: unknown) =>
      ipcRenderer.invoke('scheduled_tasks.discardDraft', data),
    setEnabled: (data: unknown) =>
      ipcRenderer.invoke('scheduled_tasks.setEnabled', data),
    previewRun: (data: unknown) =>
      ipcRenderer.invoke('scheduled_tasks.previewRun', data),
    debugPhase: (data: unknown) =>
      ipcRenderer.invoke('scheduled_tasks.debugPhase', data),
  },
  onboarding: {
    getProviderEnvAvailability: () =>
      ipcRenderer.invoke('onboarding.getProviderEnvAvailability'),
    getProviderEnvKeys: () =>
      ipcRenderer.invoke('onboarding.getProviderEnvKeys'),
    getSavedProviderApiCredentials: () =>
      ipcRenderer.invoke('onboarding.getSavedProviderApiCredentials'),
    saveProviderApiCredential: (data: unknown) =>
      ipcRenderer.invoke('onboarding.saveProviderApiCredential', data),
    deleteProviderApiCredential: (data: unknown) =>
      ipcRenderer.invoke('onboarding.deleteProviderApiCredential', data),
    runApiProbe: (data: unknown) =>
      ipcRenderer.invoke('onboarding.runApiProbe', data),
    runCliProbe: (data: unknown) =>
      ipcRenderer.invoke('onboarding.runCliProbe', data),
    installCliTool: (data: unknown) =>
      ipcRenderer.invoke('onboarding.installCliTool', data),
  },
  claude_accounts: {
    list: () =>
      ipcRenderer.invoke('claude_accounts.list'),
    add: (data: unknown) =>
      ipcRenderer.invoke('claude_accounts.add', data),
    connect: (data: unknown) =>
      ipcRenderer.invoke('claude_accounts.connect', data),
    submit_code: (data: unknown) =>
      ipcRenderer.invoke('claude_accounts.submit_code', data),
    cancel_connect: (data: unknown) =>
      ipcRenderer.invoke('claude_accounts.cancel_connect', data),
    remove: (data: unknown) =>
      ipcRenderer.invoke('claude_accounts.remove', data),
    recheck: (data: unknown) =>
      ipcRenderer.invoke('claude_accounts.recheck', data),
  },
  browser: {
    open: () =>
      ipcRenderer.invoke('browser.open'),
  },
  notifications: {
    showCompletion: (data: unknown) =>
      ipcRenderer.invoke('notifications.showCompletion', data),
    showTest: () =>
      ipcRenderer.invoke('notifications.showTest'),
    backgroundWorkCount: (data: unknown) =>
      ipcRenderer.invoke('notifications.backgroundWorkCount', data),
  },
  relay: {
    start_pairing: () =>
      ipcRenderer.invoke('relay.start_pairing'),
    stop_pairing: () =>
      ipcRenderer.invoke('relay.stop_pairing'),
    get_status: () =>
      ipcRenderer.invoke('relay.get_status'),
    enable: (data: unknown) =>
      ipcRenderer.invoke('relay.enable', data),
    disable: () =>
      ipcRenderer.invoke('relay.disable'),
  },
  connect: {
    status: () =>
      ipcRenderer.invoke('connect.status'),
    start_link: () =>
      ipcRenderer.invoke('connect.start_link'),
    open_browser: () =>
      ipcRenderer.invoke('connect.open_browser'),
    open_management: () =>
      ipcRenderer.invoke('connect.open_management'),
    retry: () =>
      ipcRenderer.invoke('connect.retry'),
    disconnect: () =>
      ipcRenderer.invoke('connect.disconnect'),
    refresh_executors: () =>
      ipcRenderer.invoke('connect.refresh_executors'),
    list_executors: () =>
      ipcRenderer.invoke('connect.list_executors'),
    remote_workspaces: (data: unknown) =>
      ipcRenderer.invoke('connect.remote_workspaces', data),
    bind_local: (data: unknown) =>
      ipcRenderer.invoke('connect.bind_local', data),
    execution_binding: (data: unknown) =>
      ipcRenderer.invoke('connect.execution_binding', data),
    remote_send: (data: unknown) =>
      ipcRenderer.invoke('connect.remote_send', data),
    remote_read: (data: unknown) =>
      ipcRenderer.invoke('connect.remote_read', data),
    remote_retry: (data: unknown) =>
      ipcRenderer.invoke('connect.remote_retry', data),
    remote_cancel: (data: unknown) =>
      ipcRenderer.invoke('connect.remote_cancel', data),
    remote_transcript: (data: unknown) =>
      ipcRenderer.invoke('connect.remote_transcript', data),
  },
  files: {
    search: (data: unknown) =>
      ipcRenderer.invoke('files.search', data),
    searchContents: (data: unknown) =>
      ipcRenderer.invoke('files.searchContents', data),
    readFile: (data: unknown) =>
      ipcRenderer.invoke('files.readFile', data),
    resolvePathKind: (data: unknown) =>
      ipcRenderer.invoke('files.resolvePathKind', data),
    listDirectory: (data: unknown) =>
      ipcRenderer.invoke('files.listDirectory', data),
    readDiff: (data: unknown) =>
      ipcRenderer.invoke('files.readDiff', data),
    recordAccess: (data: unknown) =>
      ipcRenderer.invoke('files.recordAccess', data),
  },
  process_output: {
    subscribe: (data: unknown) =>
      ipcRenderer.invoke('process_output.subscribe', data),
    unsubscribe: (data: unknown) =>
      ipcRenderer.invoke('process_output.unsubscribe', data),
    lookup_running: (data: unknown) =>
      ipcRenderer.invoke('process_output.lookup_running', data),
  },
  d2: {
    renderSvg: (data: unknown) =>
      ipcRenderer.invoke('d2.renderSvg', data),
  },
  kazibee: {
    listExtensions: () =>
      ipcRenderer.invoke('kazibee.listExtensions'),
    getExtensionDetail: (data: unknown) =>
      ipcRenderer.invoke('kazibee.getExtensionDetail', data),
    setEnvVariable: (data: unknown) =>
      ipcRenderer.invoke('kazibee.setEnvVariable', data),
    deleteEnvVariable: (data: unknown) =>
      ipcRenderer.invoke('kazibee.deleteEnvVariable', data),
    runExtensionCommand: (data: unknown) =>
      ipcRenderer.invoke('kazibee.runExtensionCommand', data),
    removeExtension: (data: unknown) =>
      ipcRenderer.invoke('kazibee.removeExtension', data),
    installExtension: (data: unknown) =>
      ipcRenderer.invoke('kazibee.installExtension', data),
    linkExtension: (data: unknown) =>
      ipcRenderer.invoke('kazibee.linkExtension', data),
    updateExtension: (data: unknown) =>
      ipcRenderer.invoke('kazibee.updateExtension', data),
    installCli: () =>
      ipcRenderer.invoke('kazibee.installCli'),
  },
  master_control: {
    configure: (data: unknown) =>
      ipcRenderer.invoke('master_control.configure', data),
    read: (data: unknown) =>
      ipcRenderer.invoke('master_control.read', data),
    monitor: (data: unknown) =>
      ipcRenderer.invoke('master_control.monitor', data),
    message: (data: unknown) =>
      ipcRenderer.invoke('master_control.message', data),
    stop: (data: unknown) =>
      ipcRenderer.invoke('master_control.stop', data),
    adopt: (data: unknown) =>
      ipcRenderer.invoke('master_control.adopt', data),
    reconcile: (data: unknown) =>
      ipcRenderer.invoke('master_control.reconcile', data),
    continue: (data: unknown) =>
      ipcRenderer.invoke('master_control.continue', data),
  },
  master_surface: {
    open: () =>
      ipcRenderer.invoke('master_surface.open'),
    status: () =>
      ipcRenderer.invoke('master_surface.status'),
    clear: () =>
      ipcRenderer.invoke('master_surface.clear'),
    rotate: (data: unknown) =>
      ipcRenderer.invoke('master_surface.rotate', data),
  },
  goal_surface: {
    set: (data: unknown) =>
      ipcRenderer.invoke('goal_surface.set', data),
    show: (data: unknown) =>
      ipcRenderer.invoke('goal_surface.show', data),
    clear: (data: unknown) =>
      ipcRenderer.invoke('goal_surface.clear', data),
    complete: (data: unknown) =>
      ipcRenderer.invoke('goal_surface.complete', data),
    reject: (data: unknown) =>
      ipcRenderer.invoke('goal_surface.reject', data),
  },
  remote_tools: {
    status: () =>
      ipcRenderer.invoke('remote_tools.status'),
    start_link: () =>
      ipcRenderer.invoke('remote_tools.start_link'),
    open_browser: () =>
      ipcRenderer.invoke('remote_tools.open_browser'),
    retry: () =>
      ipcRenderer.invoke('remote_tools.retry'),
    disconnect: () =>
      ipcRenderer.invoke('remote_tools.disconnect'),
    list_workspaces: () =>
      ipcRenderer.invoke('remote_tools.list_workspaces'),
    set_workspace_enabled: (data: unknown) =>
      ipcRenderer.invoke('remote_tools.set_workspace_enabled', data),
  },
  swarm_room: {
    list: (data: unknown) =>
      ipcRenderer.invoke('swarm_room.list', data),
    status: (data: unknown) =>
      ipcRenderer.invoke('swarm_room.status', data),
    board: (data: unknown) =>
      ipcRenderer.invoke('swarm_room.board', data),
    postBoard: (data: unknown) =>
      ipcRenderer.invoke('swarm_room.postBoard', data),
    groupDetail: (data: unknown) =>
      ipcRenderer.invoke('swarm_room.groupDetail', data),
    diagnostics: (data: unknown) =>
      ipcRenderer.invoke('swarm_room.diagnostics', data),
    stop: (data: unknown) =>
      ipcRenderer.invoke('swarm_room.stop', data),
    cancelProject: (data: unknown) =>
      ipcRenderer.invoke('swarm_room.cancelProject', data),
    waiveFinding: (data: unknown) =>
      ipcRenderer.invoke('swarm_room.waiveFinding', data),
  },

  // Internal: backend controller/action RPC map for @Inject(App)
  __rpcManifest: __WOOD_RPC_MANIFEST,

  // Internal: loader data requests
  __load: (route: string, params: Record<string, string>) =>
    ipcRenderer.invoke('__load', { route, params }),

  // Internal: cross-window navigation
  __navigate: (windowId: string, route: string) =>
    ipcRenderer.invoke('__navigate', { windowId, route }),

  // Internal: window management
  __window: {
    current: () =>
      ipcRenderer.invoke('__window', { action: 'current' }),
    open: (windowId: string, options?: Record<string, unknown>) =>
      ipcRenderer.invoke('__window', { action: 'open', windowId, options }),
    close: (windowId?: string) =>
      ipcRenderer.invoke('__window', { action: 'close', windowId }),
    focus: (windowId: string) =>
      ipcRenderer.invoke('__window', { action: 'focus', windowId }),
    minimize: (windowId?: string) =>
      ipcRenderer.invoke('__window', { action: 'minimize', windowId }),
    maximize: (windowId?: string) =>
      ipcRenderer.invoke('__window', { action: 'maximize', windowId }),
  },

  // Internal: framework config (trace min level, etc)
  __woodConfig: () =>
    ipcRenderer.invoke('__woodConfig'),

  // Internal: debug metadata
  __debug: {
    current: () =>
      ipcRenderer.invoke('__debug', { action: 'current' }),
  },

  // Internal: context menu
  __contextMenu: {
    show: (data: unknown) =>
      ipcRenderer.invoke('__contextMenu', { action: 'show', ...data as Record<string, unknown> }),
  },

  // Push events from main process
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const subscription = (_event: unknown, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(\`__event:\${channel}\`, subscription);
    return () => ipcRenderer.removeListener(\`__event:\${channel}\`, subscription);
  },
  __trace: (event: unknown) => {
    ipcRenderer.send('__trace', event);
  },
  __log: (level: string, logger: string, message: string, context?: unknown) => {
    ipcRenderer.send('__log', { level, logger, message, context });
  },
  __logBatch: (batch: unknown) => {
    ipcRenderer.send('__log_batch', batch);
  },
});

// Trace transport via MessagePort (activated when main process sends a port)
let __tracePort: MessagePort | null = null;
const __traceBuffer: unknown[] = [];
const __TRACE_BUFFER_CAPACITY = 256;
let __traceDroppedCapacity = 0;

function __traceFlush(): void {
  while (__traceBuffer.length > 0 && __tracePort) {
    __tracePort.postMessage(__traceBuffer.shift());
  }
}

ipcRenderer.on('__trace-port', (event) => {
  __tracePort = event.ports[0];
  __tracePort.start();
  __traceFlush();
});

contextBridge.exposeInMainWorld('__NOEGO_TRACE__', {
  send: (data: unknown) => {
    if (__tracePort) {
      __tracePort.postMessage(data);
    } else if (__traceBuffer.length >= __TRACE_BUFFER_CAPACITY) {
      __traceDroppedCapacity += 1;
    } else {
      __traceBuffer.push(data);
    }
  },
  status: () => ({
    queuedEvents: __traceBuffer.length,
    droppedCapacity: __traceDroppedCapacity,
  }),
});

const __traceBatchProducerId = typeof globalThis.crypto?.randomUUID === 'function'
  ? globalThis.crypto.randomUUID()
  : \`wood-renderer-\${Date.now()}-\${Math.random().toString(16).slice(2)}\`;
let __traceBatchListener: ((message: unknown) => void) | null = null;

const __traceBatchPort: WoodTraceBatchPort = {
  postMessage: (batch: WoodTraceBatch) => {
    void ipcRenderer.invoke('__traceBatch', batch)
      .then((acknowledgement: WoodTraceBatchAcknowledgement) => {
        __traceBatchListener?.(acknowledgement);
      })
      .catch((error: unknown) => {
        __traceBatchListener?.({
          kind: 'retryable',
          batchId: batch.batchId,
          reason: error instanceof Error ? error.message : String(error),
          retryAfterMs: 100,
        });
      });
  },
  subscribe: (listener: (message: unknown) => void) => {
    __traceBatchListener = listener;
    return () => {
      if (__traceBatchListener === listener) {
        __traceBatchListener = null;
      }
    };
  },
  close: () => {
    __traceBatchListener = null;
  },
};

// Batching policy resolved from wood.config.yml observability configuration
// at generation time; this file embeds but does not own it.
const __traceBatchTransport = new RendererTraceBatchTransport({
  producerId: __traceBatchProducerId,
  maxQueuedEvents: 256,
  maxBatchEvents: 32,
  acknowledgementTimeoutMs: 1000,
  retryLimit: 3,
  retryBaseDelayMs: 25,
  now: () => Date.now(),
  schedule: (work: () => void) => queueMicrotask(work),
  delay: (durationMs: number) => new Promise((resolve) => setTimeout(resolve, durationMs)),
});
__traceBatchTransport.attachPort(__traceBatchPort);

contextBridge.exposeInMainWorld('__NOEGO_WOOD_TRACE_BATCH__', {
  send: (event: WoodRendererTraceInput) => __traceBatchTransport.admit(event),
  status: () => __traceBatchTransport.status(),
  flush: (deadlineMs: number) => __traceBatchTransport.flush(deadlineMs),
  close: (deadlineMs: number) => __traceBatchTransport.close(deadlineMs),
});

ipcRenderer.on('__woodTraceDrainRequest', (_event, payload: unknown) => {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return;
  }
  const requestId = Reflect.get(payload, 'requestId');
  const deadlineMs = Reflect.get(payload, 'deadlineMs');
  if (typeof requestId !== 'string'
    || typeof deadlineMs !== 'number'
    || !Number.isFinite(deadlineMs)) {
    return;
  }
  void __traceBatchTransport.close(deadlineMs).finally(() => {
    ipcRenderer.send('__woodTraceDrainAck', {
      requestId,
      status: __traceBatchTransport.status(),
    });
  });
});

globalThis.addEventListener?.('pagehide', () => {
  void __traceBatchTransport.flush(Date.now() + 100);
});
`,Nt="__KAZIBEE_WEB_AGENT__";function ar(){globalThis[Nt]=!0}function dr(){return globalThis[Nt]===!0}const or="web-agent",Ee="Disconnected — reopen from kazibee.com";let Tt=0;function St(){let e,t;return{promise:new Promise((i,c)=>{e=i,t=c}),resolve:e,reject:t}}function ir(e){const t=e.match(/const __WOOD_RPC_MANIFEST = (\[[\s\S]*?\]);/);if(!t)throw new Error("Generated Wood RPC manifest is unavailable");const n=JSON.parse(t[1].replace(/,\s*\]$/,"]"));if(!Array.isArray(n)||n.length===0)throw new Error("Generated Wood RPC manifest is empty");return n}function at(e){return Tt+=1,`${e}_${Date.now().toString(36)}_${Tt.toString(36)}`}function Ut(e){if(document.getElementById("web-agent-disconnected"))return;const t=document.createElement("div");t.id="web-agent-disconnected",t.textContent=e&&e!==Ee?`${Ee}

${e}`:Ee,Object.assign(t.style,{whiteSpace:"pre-wrap",alignItems:"center",background:"#111827",color:"#f8fafc",display:"flex",font:"500 16px system-ui, sans-serif",inset:"0",justifyContent:"center",padding:"24px",position:"fixed",textAlign:"center",zIndex:"2147483647"}),document.body.appendChild(t)}function sr(e){return new Map(e.map(t=>[t.channel,{channel:t.channel,controller:t.controller,action:t.action,...t.hasInput?{inputSchema:{type:"object",properties:{payload:{}}}}:{}}]))}async function cr(){ar();const e=new WebSocket(`wss://${location.host}/v1/agent/session`),t=new Map,n=new Map,i=St(),c=St();let s=!1;const f=(I=Ee)=>{if(!s){s=!0;for(const w of t.values())w.reject(new Error(I));t.clear(),i.reject(new Error(I)),c.reject(new Error(I)),Ut(I)}},k=new Map,b=I=>{var E;if("kind"in I){I.kind==="session.ready"&&i.resolve(),I.kind==="session.closed"&&f(I.reason);return}if(I.type==="ready"){c.resolve();return}if(I.type==="event"){(E=n.get(I.id))==null||E(I.payload);return}const w=t.get(I.id);w&&(t.delete(I.id),I.type==="error"?w.reject(new Error(I.message)):w.resolve(I.value))};e.addEventListener("message",I=>{let w;try{w=JSON.parse(String(I.data))}catch{f("Remote renderer returned a malformed frame"),e.close(4400,"malformed frame");return}if("kind"in w&&w.kind==="session.chunk"){const E=k.get(w.frameId)??{chunkCount:w.chunkCount,parts:[]};if(w.chunkIndex!==E.parts.length||w.chunkCount!==E.chunkCount){k.delete(w.frameId),f("Remote renderer returned an out-of-order frame chunk"),e.close(4400,"out-of-order chunk");return}if(E.parts.push(w.payload),E.parts.length<E.chunkCount){k.set(w.frameId,E);return}k.delete(w.frameId);let S;try{S=JSON.parse(E.parts.join(""))}catch{f("Remote renderer returned a malformed multi-chunk frame"),e.close(4400,"malformed frame");return}b(S);return}b(w)}),e.addEventListener("close",()=>f()),e.addEventListener("error",()=>f());const y=I=>{if(s||e.readyState!==WebSocket.OPEN)throw new Error("Remote renderer session is not connected");e.send(JSON.stringify(I))},R={invoke(I,w){const E=at("invoke");return new Promise((S,B)=>{t.set(E,{resolve:S,reject:B});try{y({type:"invoke",id:E,channel:I,...w===void 0?{}:{payload:w}})}catch(L){t.delete(E),B(L)}})},subscribe(I,w){const E=at("subscription");return n.set(E,w),y({type:"subscribe",id:E,channel:I}),()=>{n.delete(E),!s&&y({type:"unsubscribe",id:at("unsubscribe"),subscriptionId:E})}}};await i.promise,await c.promise;const{bridge:x}=nr(sr(ir(rr)),R);Object.assign(x,{__window:{current:async()=>({ok:!0,windowId:or,defaultRoute:"main.start"}),open:async()=>{},close:async()=>{},focus:async()=>{},minimize:async()=>{},maximize:async()=>{}},__woodConfig:async()=>({appEnv:"production",rendererTraceEnabled:!1,rendererTraceBatchEnabled:!1}),__navigate:async(I,w)=>{Hn().go(w)},__contextMenu:{show:async()=>{}},__load:async()=>{throw new Error("Route loaders are unavailable in the web agent")},__debug:{current:async()=>({runtime:"web-agent"})},__log:(I,w,E,S)=>{(I==="error"?console.error:I==="warn"?console.warn:I==="debug"?console.debug:console.info)(`[${w}] ${E}`,S)},__trace:()=>{}}),globalThis.__NOEGO_WOOD_BRIDGE__=x,globalThis.wood=x,await qt(()=>import("./main.js").then(I=>I.m),__vite__mapDeps([0,1]),import.meta.url)}cr().catch(e=>{console.error("[web-agent] bootstrap failed",e);const t=e instanceof Error?`${e.name}: ${e.message}`:String(e);Ut(`Bootstrap failed — ${t}`)});export{Ht as C,Jt as E,wt as I,Z as L,$n as N,V as O,lr as P,Pe as S,Oe as T,qt as _,Me as a,Se as b,Te as c,it as d,ht as e,Re as f,Hn as g,me as h,Et as i,Ot as j,dr as k,ur as s};
