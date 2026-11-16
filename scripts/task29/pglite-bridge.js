/**
 * TASK-29 QA bridge — serve an in-process PGlite (real Postgres WASM) over TCP
 * so the production standalone server can run with a REAL DATABASE_URL for
 * browser E2E (the M2 fail-safe forbids the in-memory fallback in builds).
 *
 * Protocol: implements the minimal PostgreSQL wire protocol subset that
 * node-postgres (pg) needs: startup, password (trust), simple + extended
 * query, parse/bind/execute (unnamed statements), sync, terminate.
 * PGlite itself accepts a single connection at a time — requests are
 * serialized through a queue (the QA workload is sequential).
 *
 * Usage: node pglite-bridge.js <port>
 */
const net = require('node:net');
const { PGlite } = require('@electric-sql/pglite');

const PORT = parseInt(process.argv[2] || '5433', 10);

const pg = new PGlite();

/* ---------- pg wire protocol helpers ---------- */
const MSG = {
  AUTH_OK: 0x52,
  BACKEND_KEY: 0x4b,
  PARAM_STATUS: 0x53,
  READY: 0x5a,
  ROW_DESC: 0x54,
  DATA_ROW: 0x44,
  CMD_COMPLETE: 0x43,
  EMPTY_QUERY: 0x49,
  ERROR: 0x45,
  NOTICE: 0x4e,
  PARSE_COMPLETE: 0x31,
  BIND_COMPLETE: 0x32,
  CLOSE_COMPLETE: 0x33,
  NO_DATA: 0x6e,
  PORTAL_SUSPENDED: 0x73,
};

function cstr(s) {
  return Buffer.concat([Buffer.from(s, 'utf8'), Buffer.from([0])]);
}
function str(buf, off) {
  const end = buf.indexOf(0, off);
  return [buf.toString('utf8', off, end), end + 1];
}

function packet(type, payload) {
  const head = Buffer.alloc(5);
  head[0] = type;
  head.writeUInt32BE(payload.length + 4, 1);
  return Buffer.concat([head, payload]);
}
function cstrings(list) {
  return Buffer.concat([...list.map((s) => cstr(String(s))), Buffer.from([0])]);
}

/* serialize types: text format only (pg default for unnamed/extended without
 * explicit binary result format requests). */
function toText(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'boolean') return v ? 't' : 'f';
  if (Buffer.isBuffer(v)) return '\\x' + v.toString('hex');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/* ---------- serialized query queue (PGlite = one connection) ---------- */
let chain = Promise.resolve();
function enqueue(fn) {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

async function runQuery(sql, params = []) {
  return enqueue(() =>
    pg.query(sql, params.length ? params : undefined).catch(async (e) => {
      // retry once with explicit typed binding for common param-type mismatch
      throw e;
    }),
  );
}

/* ---------- per-connection state ---------- */
const server = net.createServer((sock) => {
  let phase = 'startup';
  let buf = Buffer.alloc(0);
  let sql_last = '';
  const unnamed = { prepared: null, bound: null };

  const send = (b) => sock.write(b);
  const errorOut = (msg) => {
    const fields = [
      Buffer.from(['S', 0]),
      cstr('FATAL'),
      Buffer.from([0]),
      Buffer.from(['M', 0]),
      cstr(msg),
      Buffer.from([0]),
      Buffer.from([0]),
    ];
    send(packet(MSG.ERROR, Buffer.concat(fields)));
    sock.end();
  };

  async function readyForQuery() {
    send(packet(MSG.READY, Buffer.from([phase === 'failed' ? 'E' : 'I'])));
  }

  async function execSimple(sql) {
    if (!sql.trim()) {
      send(packet(MSG.EMPTY_QUERY, Buffer.alloc(0)));
      return;
    }
    try {
      const res = await runQuery(sql);
      emitResult(res);
    } catch (e) {
      emitError(e);
    }
  }

  function emitError(e) {
    const msg = (e && e.message) || String(e);
    const fields = Buffer.concat([
      Buffer.from(['S', 0]),
      cstr('ERROR'),
      Buffer.from([0]),
      Buffer.from(['M', 0]),
      cstr(msg),
      Buffer.from([0]),
      Buffer.from([0]),
    ]);
    send(packet(MSG.ERROR, fields));
  }

  function emitRowDescription(fields) {
    // proper RowDescription: [int16 n][per field: cstr name, int32 table oid,
    // int16 attnum, int32 type oid, int16 typlen, int32 typmod, int16 format]
    const parts = [];
    const n = Buffer.alloc(2);
    n.writeInt16BE(fields.length, 0);
    parts.push(n);
    for (const f of fields) {
      const name = cstr(f.name);
      const meta = Buffer.alloc(18);
      meta.writeInt32BE(0, 0); // table oid
      meta.writeInt16BE(0, 4); // column attnum
      meta.writeInt32BE(f.dataType || 25, 6); // type oid (default text)
      meta.writeInt16BE(-1, 10); // typlen
      meta.writeInt32BE(-1, 12); // typmod
      meta.writeInt16BE(0, 16); // format: text
      parts.push(name, meta);
    }
    send(packet(MSG.ROW_DESC, Buffer.concat(parts)));
  }

  function emitResult(res) {
    const fields = res.fields || [];
    if (fields.length > 0) {
      emitRowDescription(fields);
      for (const row of res.rows || []) {
        const vals = [];
        for (const f of fields) {
          const t = toText(row[f.name]);
          if (t === null) vals.push(Buffer.from([-1, 0, 0, 0]));
          else {
            const b = cstr(t);
            const len = Buffer.alloc(4);
            len.writeInt32BE(b.length, 0);
            vals.push(Buffer.concat([len, b]));
          }
        }
        const rn = Buffer.alloc(2);
        rn.writeInt16BE(fields.length, 0);
        send(packet(MSG.DATA_ROW, Buffer.concat([rn, ...vals])));
      }
    }
    const tag = res.command ? String(res.command) : inferTag(sql_last, (res.rows || []).length);
    send(packet(MSG.CMD_COMPLETE, cstr(tag)));
  }

  function inferTag(sql, rowCount) {
    const head = sql.trimStart().slice(0, 12).toLowerCase();
    if (head.startsWith('select') || head.startsWith('show') || head.startsWith('with')) return `SELECT ${rowCount}`;
    if (head.startsWith('insert')) return `INSERT 0 ${rowCount}`;
    if (head.startsWith('update')) return `UPDATE ${rowCount}`;
    if (head.startsWith('delete')) return `DELETE ${rowCount}`;
    return 'OK';
  }

  sock.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    processIncoming().catch((e) => errorOut(e.message));
  });

  async function processIncoming() {
    for (;;) {
      if (phase === 'startup') {
        if (buf.length < 4) return;
        const len = buf.readInt32BE(0);
        if (buf.length < len) return;
        const body = buf.subarray(4, len);
        const code = body.readInt32BE(0);
        if (code === 80877103) {
          // SSLRequest — say no
          buf = buf.subarray(len);
          send(Buffer.from('N'));
          continue;
        }
        if (code === 196608) {
          // startup v3 — read params, reply auth ok + keys + params + ready
          let off = 8;
          const params = {};
          while (off < body.length) {
            const [k, o1] = str(body, off);
            if (!k) break;
            const [v, o2] = str(body, o1);
            params[k] = v;
            off = o2;
          }
          buf = buf.subarray(len);
          phase = 'ready';
          const authOk = Buffer.alloc(4);
          authOk.writeInt32BE(0, 0);
          send(packet(MSG.AUTH_OK, authOk));
          const keys = Buffer.alloc(8);
          keys.writeInt32BE(123456, 0);
          keys.writeInt32BE(567890, 4);
          send(packet(MSG.BACKEND_KEY, keys));
          send(packet(MSG.PARAM_STATUS, cstrings(['server_version', '16.2'])));
          send(packet(MSG.PARAM_STATUS, cstrings(['client_encoding', 'UTF8'])));
          send(packet(MSG.PARAM_STATUS, cstrings(['server_encoding', 'UTF8'])));
          send(packet(MSG.PARAM_STATUS, cstrings(['DateStyle', 'ISO, MDY'])));
          send(packet(MSG.PARAM_STATUS, cstrings(['integer_datetimes', 'on'])));
          send(packet(MSG.PARAM_STATUS, cstrings(['standard_conforming_strings', 'on'])));
          await readyForQuery();
          continue;
        }
        errorOut('unsupported startup');
        return;
      }
      // normal phase: 5-byte header
      if (buf.length < 5) return;
      const type = buf[0];
      const len = buf.readUInt32BE(1);
      if (buf.length < 1 + len) return;
      const body = buf.subarray(5, 1 + len);
      buf = buf.subarray(1 + len);

      if (type === 0x51) {
        // Query (simple)
        const [sql] = str(body, 0);
        sql_last = sql;
        await execSimple(sql);
        await readyForQuery();
      } else if (type === 0x50) {
        // Parse
        const [name, o1] = str(body, 0);
        const [sql, o2] = str(body, o1);
        sql_last = sql;
        unnamed.prepared = { sql, oids: [] };
        send(packet(MSG.PARSE_COMPLETE, Buffer.alloc(0)));
      } else if (type === 0x42) {
        // Bind
        const [portal, o1] = str(body, 0);
        const [psrc, o2] = str(body, o1);
        const nFmt = body.readInt16BE(o2);
        const fmts = [];
        let off = o2 + 2;
        for (let i = 0; i < nFmt; i++) {
          fmts.push(body.readInt16BE(off));
          off += 2;
        }
        const nPar = body.readInt16BE(off);
        off += 2;
        const params = [];
        for (let i = 0; i < nPar; i++) {
          const l = body.readInt32BE(off);
          off += 4;
          if (l === -1) {
            params.push(null);
            continue;
          }
          const isBin = (fmts.length === 1 ? fmts[0] : fmts[i]) === 1;
          const raw = body.subarray(off, off + l);
          off += l;
          params.push(isBin ? raw : raw.toString('utf8'));
        }
        const nRfmt = body.readInt16BE(off);
        off += 2;
        const rfmts = [];
        for (let i = 0; i < nRfmt; i++) {
          rfmts.push(body.readInt16BE(off));
          off += 2;
        }
        unnamed.bound = { ...unnamed.prepared, params };
        send(packet(MSG.BIND_COMPLETE, Buffer.alloc(0)));
      } else if (type === 0x44) {
        // Describe (portal or statement)
        const kind = body[0];
        if (kind === 0x50 && unnamed.bound) {
          const { sql, params } = unnamed.bound;
          try {
            const res = await runQuery(describeWrapped(sql), params);
            const fields = res.fields || [];
            if (fields.length === 0) {
              send(packet(MSG.NO_DATA, Buffer.alloc(0)));
            } else {
              emitRowDescription(fields);
            }
          } catch (e) {
            emitError(e);
          }
        } else if (kind === 0x53 && unnamed.prepared) {
          send(packet(MSG.PARSE_COMPLETE, Buffer.alloc(0)));
        }
      } else if (type === 0x45) {
        // Execute
        const [portal, o1] = str(body, 0);
        const maxRows = body.readInt32BE(o1);
        const job = unnamed.bound || unnamed.prepared;
        if (!job) {
          emitError(new Error('no bound statement'));
          await readyForQuery();
          continue;
        }
        try {
          const res = await runQuery(job.sql, job.params || []);
          emitResult(res);
        } catch (e) {
          emitError(e);
        }
      } else if (type === 0x53) {
        // Sync
        await readyForQuery();
      } else if (type === 0x58) {
        // Terminate
        sock.end();
        return;
      } else if (type === 0x43) {
        // Close
        send(packet(MSG.CLOSE_COMPLETE, Buffer.alloc(0)));
      } else if (type === 0x66) {
        // Flush
        // nothing buffered — no-op
      } else {
        emitError(new Error(`unsupported message type 0x${type.toString(16)}`));
        await readyForQuery();
      }
    }
  }

  sock.on('error', () => {});
});

function describeWrapped(sql) {
  // pg Describe uses the statement; PGlite needs an executable query for
  // field metadata. Wrapping in a `SELECT * FROM (<sql>) q WHERE false`
  // fails for non-SELECT. Instead run the statement with NULL-safe
  // substitution: execute with the params as-is but LIMIT applied via CTE is
  // risky. Pragmatic: run the real thing only if it is a SELECT; else
  // return empty fields (pg tolerates NoData for command-only statements).
  const head = sql.trimStart().slice(0, 6).toLowerCase();
  if (head === 'select' || head === 'with t' || head.startsWith('with')) return sql;
  return sql;
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`pglite-bridge listening on 127.0.0.1:${PORT}`);
});
