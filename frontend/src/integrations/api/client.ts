/**
 * Custom API client — drop-in replacement for the Supabase client.
 * Talks to the Express backend at VITE_API_URL (default: http://localhost:4000).
 *
 * Exposes the same surface used in the app:
 *   api.auth.signIn / getSession / getUser / signOut
 *   api.from(table).select().eq().order().range().maybeSingle()
 *   api.from(table).insert(data)
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// ─── Token storage ────────────────────────────────────────────────────────────

function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('kau_token') : null;
}
function setToken(t: string | null) {
  if (typeof window === 'undefined') return;
  t ? localStorage.setItem('kau_token', t) : localStorage.removeItem('kau_token');
}

function getAdmin(): { id: number; email: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('kau_admin');
  return raw ? JSON.parse(raw) : null;
}
function setAdmin(a: { id: number; email: string } | null) {
  if (typeof window === 'undefined') return;
  a ? localStorage.setItem('kau_admin', JSON.stringify(a)) : localStorage.removeItem('kau_admin');
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ─── Auth module ──────────────────────────────────────────────────────────────

const auth = {
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const { ok, data } = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!ok) return { data: { user: null, session: null }, error: new Error(data.error ?? 'Login failed') };
    setToken(data.token);
    setAdmin(data.admin);
    const session = { access_token: data.token, user: data.admin };
    return { data: { user: data.admin, session }, error: null };
  },

  async signUp(_opts: { email: string; password: string; options?: unknown }) {
    return { data: { user: null, session: null }, error: new Error('Sign-up is not available. Contact your administrator.') };
  },

  async getSession() {
    const token = getToken();
    const admin = getAdmin();
    if (!token || !admin) return { data: { session: null }, error: null };
    const session = { access_token: token, user: admin };
    return { data: { session }, error: null };
  },

  async getUser() {
    const token = getToken();
    if (!token) return { data: { user: null }, error: null };
    const { ok, data } = await apiFetch('/api/auth/me');
    if (!ok) { setToken(null); setAdmin(null); return { data: { user: null }, error: null }; }
    return { data: { user: data.admin }, error: null };
  },

  async signOut() {
    setToken(null);
    setAdmin(null);
    return { error: null };
  },

  async getClaims(_token: string) {
    const { ok, data } = await apiFetch('/api/auth/me');
    if (!ok) return { data: null, error: new Error('Invalid token') };
    return { data: { claims: { sub: String(data.admin.id), email: data.admin.email } }, error: null };
  },
};

// ─── Query builder ─────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

interface QueryState {
  table: string;
  _select: string;
  _filters: Array<{ col: string; val: unknown }>;
  _order: { col: string; asc: boolean } | null;
  _range: [number, number] | null;
  _count: boolean;
  _single: boolean;
  _eq: Array<{ col: string; val: unknown }>;
}

function buildQuery(state: QueryState) {
  return {
    async execute(): Promise<{ data: Row[] | Row | null; count: number | null; error: Error | null }> {
      const { table, _filters, _order, _range, _eq } = state;

      // Map table → API endpoint
      const endpointMap: Record<string, string> = {
        departments: '/api/departments',
        services: '/api/services',
        locations: '/api/locations',
        feedback_entries: '/api/feedback',
        user_roles: '/api/auth/me', // not really used
      };

      let url = endpointMap[table] ?? `/api/${table}`;

      // Add page/size for paginated endpoints
      if (table === 'feedback_entries' && _range) {
        const size  = _range[1] - _range[0] + 1;
        const page  = Math.floor(_range[0] / size) + 1;
        url += `?page=${page}&size=${size}`;
      }

      const token = getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        const res  = await fetch(`${BASE}${url}`, { headers });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) return { data: null, count: null, error: new Error(json.error ?? 'API error') };

        // Normalise response shape
        let rows: Row[] = [];
        let count: number | null = null;

        if (table === 'feedback_entries' && json.data) {
          rows  = json.data.map((r: Row) => ({
            ...r,
            departments: r.department_name ? { name: r.department_name } : null,
            services:    r.service_name    ? { name: r.service_name }    : null,
            locations:   r.location_name   ? { name: r.location_name }   : null,
          }));
          count = json.total ?? rows.length;
        } else if (Array.isArray(json)) {
          rows = json;
          count = rows.length;
        } else {
          // user_roles / maybeSingle path
          if (json.admin) {
            // simulate admin role row
            rows = [{ role: 'admin', user_id: json.admin.id }];
          }
          count = rows.length;
        }

        // Apply eq filters client-side (simple with boolean coercion)
        if (_eq.length) {
          rows = rows.filter((r) => _eq.every(({ col, val }) => {
            const actual = r[col];
            if (typeof val === 'boolean') {
              return !!actual === val;
            }
            return actual === val;
          }));
        }
        for (const f of _filters) {
          rows = rows.filter((r) => {
            const actual = r[f.col];
            if (typeof f.val === 'boolean') {
              return !!actual === f.val;
            }
            return actual === f.val;
          });
        }

        // Order client-side
        if (_order) {
          rows.sort((a, b) => {
            const av = a[_order!.col] as string;
            const bv = b[_order!.col] as string;
            return _order!.asc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
          });
        }

        if (state._single) {
          return { data: rows[0] ?? null, count: null, error: null };
        }
        return { data: rows, count, error: null };
      } catch (err) {
        return { data: null, count: null, error: err as Error };
      }
    },

    then(resolve: (v: unknown) => void, reject: (e: unknown) => void) {
      return this.execute().then(resolve, reject);
    },
  };
}

function from(table: string) {
  const state: QueryState = {
    table,
    _select: '*',
    _filters: [],
    _order: null,
    _range: null,
    _count: false,
    _single: false,
    _eq: [],
  };

  const builder = {
    select(_cols: string, opts?: { count?: string }) {
      if (opts?.count) state._count = true;
      return builder;
    },
    eq(col: string, val: unknown) {
      state._eq.push({ col, val });
      return builder;
    },
    order(col: string, opts?: { ascending?: boolean }) {
      state._order = { col, asc: opts?.ascending ?? true };
      return builder;
    },
    range(from: number, to: number) {
      state._range = [from, to];
      return builder;
    },
    maybeSingle() {
      state._single = true;
      return buildQuery(state);
    },
    then(resolve: (v: unknown) => void, reject: (e: unknown) => void) {
      return buildQuery(state).then(resolve, reject);
    },

    async insert(payload: Row | Row[]) {
      const rows = Array.isArray(payload) ? payload : [payload];
      const token = getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const endpointMap: Record<string, string> = {
        departments: '/api/departments',
        services: '/api/services',
        feedback_entries: '/api/feedback',
      };
      const url = endpointMap[table] ?? `/api/${table}`;

      const res  = await fetch(`${BASE}${url}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rows[0]),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { data: null, error: { message: data.error ?? 'Insert failed', code: data.code } };
      return { data, error: null };
    },
  };

  return builder;
}

// ─── rpc (bootstrap_first_admin — no-op in MySQL mode) ────────────────────────

async function rpc(name: string) {
  // No-op: MySQL mode doesn't use Supabase RPCs
  console.debug(`[api] rpc('${name}') called — no-op in MySQL mode`);
  return { data: null, error: null };
}

// ─── Export as `api` — the main client used throughout the app ───────────────

export const api = { auth, from, rpc };
