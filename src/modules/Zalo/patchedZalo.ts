// import { Zalo } from 'zca-js';
// import { CookieJar, Cookie } from 'tough-cookie';

// function isSpecialObject(obj: any): boolean {
//   if (!obj || typeof obj !== 'object') return false;
//   const constructorName = obj.constructor?.name;
//   return (
//     obj instanceof AbortSignal ||
//     obj instanceof AbortController ||
//     obj instanceof Blob ||
//     obj instanceof URLSearchParams ||
//     constructorName === 'File' ||
//     constructorName === 'FormData' ||
//     constructorName === 'ReadableStream'
//   );
// }

// // Helper: clean Symbol keys đệ quy
// function deepCleanSymbols(obj: any): any {
//   if (obj === null || obj === undefined) return obj;
//   if (typeof obj !== 'object') return obj;
//   if (isSpecialObject(obj)) return obj;

//   if (Array.isArray(obj)) return obj.map((i) => deepCleanSymbols(i));

//   if (obj instanceof globalThis.Headers) {
//     const cleaned: Record<string, string> = {};
//     obj.forEach((v: string, k: string) => {
//       if (typeof k === 'string') cleaned[k] = v;
//     });
//     return cleaned;
//   }

//   const cleaned: Record<string, any> = {};
//   for (const key in obj) {
//     if (typeof key === 'string' && obj.hasOwnProperty(key)) {
//       const val = obj[key];
//       if (typeof val !== 'function' && typeof val !== 'symbol') {
//         cleaned[key] = deepCleanSymbols(val);
//       }
//     }
//   }
//   return cleaned;
// }

// // Patch fetch
// const originalFetch = globalThis.fetch;
// globalThis.fetch = function (input: any, init?: any) {
//   if (init) {
//     const cleanedInit: any = {};
//     for (const key in init) {
//       if (init.hasOwnProperty(key)) {
//         const value = init[key];
//         if (key === 'headers') {
//           const cleanHeaders: Record<string, string> = {};
//           if (value instanceof globalThis.Headers) {
//             value.forEach((v: string, k: string) => {
//               if (typeof k === 'string') cleanHeaders[k] = v;
//             });
//             cleanedInit.headers = cleanHeaders;
//           } else if (typeof value === 'object' && value !== null) {
//             for (const hKey in value) {
//               if (typeof hKey === 'string' && value.hasOwnProperty(hKey)) {
//                 cleanHeaders[hKey] = value[hKey];
//               }
//             }
//             cleanedInit.headers = cleanHeaders;
//           } else {
//             cleanedInit.headers = value;
//           }
//         } else if (isSpecialObject(value)) {
//           cleanedInit[key] = value;
//         } else if (typeof value !== 'symbol') {
//           cleanedInit[key] = value;
//         }
//       }
//     }
//     return originalFetch.call(this, input, cleanedInit);
//   }
//   return originalFetch.call(this, input, init);
// } as any;

// // Patch Headers
// const OriginalHeaders = globalThis.Headers;
// class PatchedHeaders extends OriginalHeaders {
//   constructor(init?: any) {
//     if (init && typeof init === 'object' && !Array.isArray(init)) {
//       const cleaned = deepCleanSymbols(init);
//       super(cleaned);
//     } else {
//       super(init);
//     }
//   }
// }
// globalThis.Headers = PatchedHeaders as any;

// // Patch Request
// const OriginalRequest = globalThis.Request;
// class PatchedRequest extends OriginalRequest {
//   constructor(input: any, init?: any) {
//     if (init) {
//       init = deepCleanSymbols(init);
//       if (init.headers) init.headers = deepCleanSymbols(init.headers);
//     }
//     super(input, init);
//   }
// }
// globalThis.Request = PatchedRequest as any;

// // Patch JSON.stringify để bỏ symbol
// const originalStringify = JSON.stringify;
// JSON.stringify = function (value: any, replacer?: any, space?: any) {
//   const safeReplacer = (key: string, val: any) => {
//     if (typeof key === 'symbol') return undefined;
//     if (typeof val === 'symbol') return undefined;
//     if (typeof replacer === 'function') return replacer(key, val);
//     return val;
//   };
//   try {
//     return originalStringify(value, safeReplacer, space);
//   } catch (e) {
//     console.warn('⚠️ JSON.stringify failed, attempting deep clean...', e);
//     const cleaned = deepCleanSymbols(value);
//     return originalStringify(cleaned, safeReplacer, space);
//   }
// } as any;

// //
// // ========== Cookie Patch ==========
// //

// // Safe setCookie: ép domain về host hiện tại nếu không khớp
// async function safeSetCookie(
//   jar: CookieJar,
//   cookie: string | Cookie,
//   url: string
// ): Promise<void> {
//   try {
//     let parsed = typeof cookie === 'string' ? Cookie.parse(cookie) : cookie;
//     if (!parsed) return;
//     const urlObj = new URL(url);
//     if (parsed.domain && !urlObj.hostname.endsWith(parsed.domain)) {
//       parsed.domain = urlObj.hostname;
//     }
//     await jar.setCookie(parsed, url);
//   } catch (e) {
//     console.warn('⚠️ Failed to set cookie:', e);
//   }
// }

// // Override parseCookies
// (Zalo.prototype as any).parseCookies = async function (
//   jar: CookieJar,
//   cookies: any,
//   url: string
// ) {
//   if (!cookies) return;
//   if (!Array.isArray(cookies)) cookies = [cookies];
//   for (const cookie of cookies) {
//     await safeSetCookie(jar, cookie, url);
//   }
// };

// // Override loginCookie để đảm bảo ctx.cookie luôn là CookieJar
// // const originalLoginCookie = (Zalo.prototype as any).loginCookie;
// // (Zalo.prototype as any).loginCookie = async function (cookies?: any) {
// //   let jar: CookieJar;

// //   if (!cookies && this.ctx?.cookie instanceof CookieJar) {
// //     jar = this.ctx.cookie;
// //   } else if (cookies instanceof CookieJar) {
// //     jar = cookies;
// //   } else if (cookies && typeof cookies === 'object' && cookies.version) {
// //     jar = CookieJar.deserializeSync(cookies);
// //   } else {
// //     jar = new CookieJar();
// //   }

// //   if (!this.ctx) this.ctx = {};
// //   this.ctx.cookie = jar;

// //   return originalLoginCookie.apply(this, [jar]);
// // };

// // Override loginCookie để bỏ checkUpdate lỗi
// (Zalo.prototype as any).loginCookie = async function (cookies: any) {
//   let jar: CookieJar;

//   if (cookies instanceof CookieJar) {
//     jar = cookies;
//   } else if (cookies && typeof cookies === 'object' && cookies.version) {
//     jar = CookieJar.deserializeSync(cookies);
//   } else {
//     jar = new CookieJar();
//   }

//   if (!this.ctx) this.ctx = {};
//   this.ctx.cookie = jar;

//   // 🔥 Thay vì gọi originalLoginCookie (bị lỗi checkUpdate)
//   // ta gọi thẳng login bằng QR/cookie API thấp hơn của zca-js
//   if (typeof (this as any)._loginWithCookie === 'function') {
//     return (this as any)._loginWithCookie(jar);
//   }

//   // fallback: trả lại this để dùng được ctx.cookie
//   return this;
// };

// //
// // ========== Exported API ==========
// //

// // Tạo instance Zalo đã patch
// export function createPatchedZalo(options: any) {
//   const zalo = new Zalo(options) as any;
//   zalo.getCookies = () => {
//     if (zalo.ctx?.cookie) {
//       return zalo.ctx.cookie.serializeSync(); // chuẩn để save
//     }
//     return null;
//   };
//   return zalo;
// }

// // Helper: khôi phục CookieJar từ JSON
// export function restoreCookieJar(serialized: any): CookieJar {
//   return CookieJar.deserializeSync(serialized);
// }
