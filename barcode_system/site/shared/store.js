// Storage backends for messages ({ id, text, image_url, fingerprint }).
//
// SupabaseStore talks to Supabase's REST + Storage APIs directly with fetch
// (no SDK needed). LocalStore keeps everything in localStorage so the whole
// pipeline can be developed and demoed on one machine without any cloud.

import { CONFIG } from "./config.js";

class SupabaseStore {
  constructor() {
    this.url = CONFIG.supabaseUrl.replace(/\/$/, "");
    this.key = CONFIG.supabaseAnonKey;
    this.mode = "supabase";
  }

  headers(extra = {}) {
    return {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      ...extra,
    };
  }

  async list() {
    const res = await fetch(
      `${this.url}/rest/v1/${CONFIG.table}?select=id,code,text,image_url&order=created_at.desc`,
      { headers: this.headers() }
    );
    if (!res.ok) throw new Error(`Supabase list failed: ${res.status}`);
    return res.json();
  }

  async getByCode(code) {
    const res = await fetch(
      `${this.url}/rest/v1/${CONFIG.table}?code=eq.${code}&select=id,code,text,image_url&limit=1`,
      { headers: this.headers() }
    );
    if (!res.ok) throw new Error(`Supabase lookup failed: ${res.status}`);
    const rows = await res.json();
    return rows[0] || null;
  }

  async add(entry, pngBlob) {
    const objectPath = `${entry.id}.png`;
    const upload = await fetch(
      `${this.url}/storage/v1/object/${CONFIG.bucket}/${objectPath}`,
      {
        method: "POST",
        headers: this.headers({ "Content-Type": "image/png" }),
        body: pngBlob,
      }
    );
    if (!upload.ok)
      throw new Error(`Supabase image upload failed: ${upload.status}`);

    const image_url = `${this.url}/storage/v1/object/public/${CONFIG.bucket}/${objectPath}`;
    const insert = await fetch(`${this.url}/rest/v1/${CONFIG.table}`, {
      method: "POST",
      headers: this.headers({
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      }),
      body: JSON.stringify({
        id: entry.id,
        code: entry.code,
        text: entry.text,
        image_url,
      }),
    });
    if (!insert.ok)
      throw new Error(`Supabase insert failed: ${insert.status}`);
    return { ...entry, image_url };
  }
}

const LOCAL_KEY = "secret-receipts-db";

class LocalStore {
  constructor() {
    this.mode = "local";
  }

  read() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
    } catch {
      return [];
    }
  }

  async list() {
    return this.read();
  }

  async getByCode(code) {
    return this.read().find((r) => r.code === code) || null;
  }

  async add(entry, pngBlob) {
    const image_url = await blobToDataUrl(pngBlob);
    const rows = this.read();
    const stored = {
      id: entry.id,
      code: entry.code,
      text: entry.text,
      image_url,
    };
    rows.unshift(stored);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
    return stored;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function createStore() {
  if (CONFIG.supabaseUrl && CONFIG.supabaseAnonKey) return new SupabaseStore();
  return new LocalStore();
}
