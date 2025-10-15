import { Zalo } from 'zca-js';
import { CookieJar, Cookie } from 'tough-cookie';
import FormData from 'form-data';
import { ReadableStream } from 'stream/web';

/* ============================================================
   🔧 1. Các hàm xử lý đối tượng đặc biệt & loại bỏ Symbol
============================================================ */

function isSpecialObject(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const constructorName = obj.constructor?.name;
  return (
    obj instanceof AbortSignal ||
    obj instanceof AbortController ||
    obj instanceof Blob ||
    obj instanceof URLSearchParams ||
    obj instanceof ReadableStream ||
    obj instanceof FormData ||
    constructorName === 'File'
  );
}

function deepCleanSymbols(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (isSpecialObject(obj)) return obj;

  if (Array.isArray(obj)) return obj.map((i) => deepCleanSymbols(i));

  // Xử lý Headers
  if (obj instanceof globalThis.Headers) {
    const cleaned: Record<string, string> = {};
    obj.forEach((v: string, k: string) => {
      if (typeof k === 'string') cleaned[k] = v;
    });
    return cleaned;
  }

  const cleaned: Record<string, any> = {};
  for (const key in obj) {
    if (typeof key === 'string' && obj.hasOwnProperty(key)) {
      const val = obj[key];
      if (typeof val !== 'function' && typeof val !== 'symbol') {
        cleaned[key] = deepCleanSymbols(val);
      }
    }
  }
  return cleaned;
}

/* ============================================================
   🌐 2. Patch global fetch để loại bỏ Symbol khi stringify
============================================================ */
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input: any, init?: any) => {
  try {
    if (
      init &&
      typeof init.body === 'object' &&
      !(init.body instanceof Buffer) &&
      !(init.body instanceof ReadableStream) &&
      !(init.body instanceof FormData)
    ) {
      init.body = JSON.stringify(deepCleanSymbols(init.body));
      init.headers = init.headers || {};
      if (!init.headers['Content-Type'])
        init.headers['Content-Type'] = 'application/json';
    }
  } catch (e) {
    console.warn('⚠️ Failed to clean fetch body:', e);
  }

  return originalFetch(input, init);
};

/* ============================================================
   🍪 3. Cookie Patch
============================================================ */
async function safeSetCookie(
  jar: CookieJar,
  cookie: string | Cookie,
  url: string
): Promise<void> {
  try {
    const parsed = typeof cookie === 'string' ? Cookie.parse(cookie) : cookie;
    if (!parsed) return;
    const urlObj = new URL(url);
    if (parsed.domain && !urlObj.hostname.endsWith(parsed.domain)) {
      parsed.domain = urlObj.hostname;
    }
    await jar.setCookie(parsed, url);
  } catch (e) {
    console.warn('⚠️ Failed to set cookie:', e);
  }
}

(Zalo.prototype as any).parseCookies = async function (
  jar: CookieJar,
  cookies: any,
  url: string
) {
  if (!cookies) return;
  if (!Array.isArray(cookies)) cookies = [cookies];
  for (const c of cookies) {
    await safeSetCookie(jar, c, url);
  }
};

/* ============================================================
   🔑 4. Patch loginCookie cho zca-js@2.x
============================================================ */
(Zalo.prototype as any).loginCookie = async function (cookies: any) {
  let jar: CookieJar;

  if (cookies instanceof CookieJar) {
    jar = cookies;
  } else if (cookies && typeof cookies === 'object' && cookies.version) {
    jar = CookieJar.deserializeSync(cookies);
  } else {
    jar = new CookieJar();
  }

  if (!this.ctx) this.ctx = {};
  this.ctx.cookie = jar;

  // Đồng bộ session nếu có
  if (typeof (this as any).checkUpdate === 'function') {
    try {
      await (this as any).checkUpdate();
    } catch (e: any) {
      console.warn('⚠️ checkUpdate failed (safe to ignore):', e.message);
    }
  }

  // Tạo listener nếu SDK hỗ trợ
  if (!this.listener && typeof (this as any).createListener === 'function') {
    this.listener = (this as any).createListener();
  }

  // Nếu listener chưa có, thử kích hoạt loginQR ẩn (WebSocket khởi động)
  if (!this.listener && typeof (this as any).loginQR === 'function') {
    try {
      console.log('🔁 Trigger hidden loginQR to bring up listener');
      await (this as any).loginQR({ headless: true }, () => {});
    } catch (e: any) {
      console.warn('⚠️ Hidden loginQR failed:', e.message);
    }
  }

  // Kiểm tra lại listener
  if (!this.listener) {
    console.warn(
      '⚠️ Listener vẫn chưa được khởi tạo — SDK 2.x này có thể không hỗ trợ tự động listener sau loginCookie'
    );
  } else {
    console.log('✅ Listener đã được khởi tạo sau loginCookie');
  }

  return this;
};

/* ============================================================
   🚀 5. API Export
============================================================ */
export function createPatchedZalo(options: any) {
  const zalo = new Zalo(options) as any;
  zalo.getCookies = () => {
    if (zalo.ctx?.cookie) {
      return zalo.ctx.cookie.serializeSync();
    }
    return null;
  };
  return zalo;
}

export function restoreCookieJar(serialized: any): CookieJar {
  return CookieJar.deserializeSync(serialized);
}
