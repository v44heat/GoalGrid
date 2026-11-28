// Run with: npm run audit
// Static security checks for the rules this project relies on. It reads source and SQL only;
// it cannot prove the app is secure, but it catches the mistakes that would break these rules.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok, detail });

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
};
const rel = (p) => path.relative(root, p).split(path.sep).join("/");
const read = (p) => fs.readFileSync(p, "utf8");

const all = walk(root).filter((p) => /\.(ts|tsx|mjs|sql|json)$/.test(p) || p.endsWith(".gitignore") || p.endsWith(".env.example"));
const src = all.filter((p) => /\.(ts|tsx)$/.test(rel(p)) && !rel(p).startsWith("scripts/"));

// 1. Every server action file: "use server" first, and every exported function authorises.
{
  const actionFiles = src.filter((p) => rel(p).startsWith("app/") && /(^|\/)(actions|[\w-]+-actions)\.ts$/.test(rel(p)));
  const PUBLIC_ON_PURPOSE = new Set(["registerAction", "loginAction", "logoutAction"]); // pre-login by nature
  for (const f of actionFiles) {
    const text = read(f);
    const r = rel(f);
    check(`${r}: starts with "use server"`, /^\s*"use server";/.test(text));
    const isAdminArea = r.startsWith("app/admin/");
    const needs = isAdminArea ? /getApprovedAdmin\(/ : /getCurrentProfile\(|getApprovedAdmin\(/;
    // Authorisation must happen before any database access.
    const authorisesFirst = (body) => {
      const authAt = body.search(needs);
      const dbAt = body.search(/createClient\(|createAdminClient\(/);
      return authAt !== -1 && (dbAt === -1 || authAt < dbAt);
    };

    // Split into top-level functions; remember which private helpers authorise first.
    const chunks = text.split(/^(?=(?:export )?async function )/m);
    const helpers = new Map();
    const exported = [];
    for (const c of chunks) {
      const m = c.match(/^(export )?async function (\w+)/);
      if (!m) continue;
      if (m[1]) exported.push({ name: m[2], body: c });
      else helpers.set(m[2], authorisesFirst(c));
    }

    for (const { name, body } of exported) {
      if (PUBLIC_ON_PURPOSE.has(name)) continue;
      // A thin wrapper counts if it hands straight off to a helper that authorises first.
      const delegatesTo = [...helpers].find(([h, ok]) => ok && new RegExp(`return ${h}\\(`).test(body));
      const ok = authorisesFirst(body) || Boolean(delegatesTo);
      check(
        `${r}: ${name}() checks ${isAdminArea ? "admin" : "login"} before touching data${delegatesTo ? ` (via ${delegatesTo[0]})` : ""}`,
        ok,
        "no authorisation before data access"
      );
    }
  }
  check("found server action files to audit", actionFiles.length >= 6, `found ${actionFiles.length}`);
}

// 2. The service-role key and admin client stay on the server, in known places.
{
  const keyUsers = all
    .filter((p) => !rel(p).endsWith(".md") && !rel(p).startsWith("scripts/") && read(p).includes("SUPABASE_SERVICE_ROLE_KEY"))
    .map(rel);
  const okKey = new Set(["lib/supabase/admin.ts", ".env.example"]);
  check("service-role key is only referenced in lib/supabase/admin.ts (and .env.example)", keyUsers.every((f) => okKey.has(f)), keyUsers.join(", "));
  const nextPublic = all.filter((p) => /NEXT_PUBLIC_\w*(SERVICE|SECRET|PRIVATE)/i.test(read(p)) && !rel(p).startsWith("scripts/")).map(rel);
  check("no NEXT_PUBLIC_ variable names a secret", nextPublic.length === 0, nextPublic.join(", "));

  const adminClientUsers = src.filter((p) => read(p).includes("createAdminClient")).map(rel);
  const allowed = new Set(["lib/supabase/admin.ts", "app/actions/auth.ts", "app/seasons/actions.ts", "app/admin/players/page.tsx", "app/account/actions.ts"]);
  const stray = adminClientUsers.filter((f) => !allowed.has(f));
  check("createAdminClient() is used only in the reviewed files", stray.length === 0, stray.join(", "));

  for (const f of ["lib/supabase/admin.ts", "lib/auth/session.ts"]) {
    check(`${f} imports "server-only"`, /import "server-only";/.test(read(path.join(root, f))));
  }
  const clientFiles = src.filter((p) => /^\s*"use client";/.test(read(p)));
  const bad = clientFiles.filter((p) => /createAdminClient|lib\/supabase\/admin|lib\/auth\/session/.test(read(p))).map(rel);
  check("no client component imports server-only modules", bad.length === 0, bad.join(", "));
}

// 3. Admin area is guarded on the server, not just by the middleware.
{
  check("app/admin/layout.tsx calls requireAdmin()", /requireAdmin\(/.test(read(path.join(root, "app/admin/layout.tsx"))));
  check("middleware.ts guards /admin", /startsWith\("\/admin"\)/.test(read(path.join(root, "middleware.ts"))));
}

// 4. Passwords and unsafe patterns.
{
  const userCode = src.filter((p) => !rel(p).startsWith("lib/graphics/"));
  check("no password column or plaintext password storage", !userCode.some((p) => /password_hash|plain_?text/i.test(read(p)) && !rel(p).includes("validation")), "");
  check("no dangerouslySetInnerHTML", !src.some((p) => read(p).includes("dangerouslySetInnerHTML")));
  check("no localStorage/sessionStorage", !src.some((p) => /localStorage|sessionStorage/.test(read(p))));
  check("no eval()", !src.some((p) => /\beval\(/.test(read(p))));
  check("redirects after login are sanitised", /safeNextPath/.test(read(path.join(root, "app/actions/auth.ts"))));
}

// 5. Secrets never committed.
{
  const gi = read(path.join(root, ".gitignore"));
  check(".gitignore excludes .env and .env.local", /^\.env$/m.test(gi) && /^\.env\.local$/m.test(gi));
  const envFiles = fs.readdirSync(root).filter((f) => /^\.env(\.|$)/.test(f) && f !== ".env.example");
  check("no real .env file in the project folder", envFiles.length === 0, envFiles.join(", "));
  const ex = read(path.join(root, ".env.example"));
  check(".env.example holds placeholders only", !/eyJ[A-Za-z0-9_-]{20,}/.test(ex) && !/sb_secret_/.test(ex));
}

// 6. Database: RLS on every table, a read policy on each, definer functions pinned.
{
  const sql = all.filter((p) => p.endsWith(".sql") && rel(p).startsWith("supabase/migrations/")).sort().map(read).join("\n");
  const tables = [...sql.matchAll(/create table (\w+)\s*\(/gi)].map((m) => m[1]);
  for (const t of tables) {
    check(`table ${t}: row level security enabled`, new RegExp(`alter table ${t}\\s+enable row level security`, "i").test(sql));
    check(`table ${t}: has a select policy`, new RegExp(`create policy "[^"]+"\\s+on\\s+${t}\\s+for select`, "i").test(sql));
  }
  check("found all 8 tables", tables.length === 8, tables.join(", "));

  const definers = [...sql.matchAll(/create or replace function (\w+)[\s\S]*?\$\$;?/gi)].map((m) => m[0]).filter((b) => /security definer/i.test(b));
  for (const b of definers) {
    const name = b.match(/function (\w+)/)[1];
    check(`security definer function ${name} pins search_path`, /set search_path/i.test(b));
  }
  // Every policy, parsed. League data may only be written by admins; the audit log by nobody directly.
  const policies = [...sql.matchAll(/create policy\s+"([^"]+)"\s+on\s+([\w.]+)\s+(?:as\s+\w+\s+)?for\s+(\w+)([\s\S]*?);/gi)].map((m) => ({
    name: m[1], table: m[2], cmd: m[3].toLowerCase(), body: m[4],
  }));
  const LEAGUE = ["users", "teams", "seasons", "season_participants", "fixtures", "match_results"];
  for (const pol of policies.filter((x) => LEAGUE.includes(x.table) && x.cmd !== "select")) {
    check(`policy "${pol.name}" (${pol.cmd} on ${pol.table}) is admin-only`, /is_admin\(\)/.test(pol.body));
  }
  check("audit log has NO insert/update/delete policy (only the stamping function can write)",
    !policies.some((x) => x.table === "admin_actions" && x.cmd !== "select"));
  check("audit log is readable by admins only", policies.some((x) => x.table === "admin_actions" && x.cmd === "select" && /is_admin\(\)/.test(x.body)));
  const ins = policies.find((x) => x.table === "result_proposals" && x.cmd === "insert" && !/is_admin/.test(x.body));
  check("players can only propose scores as themselves", Boolean(ins && /submitted_by = auth\.uid\(\)/.test(ins.body)));
  check("a proposal can only be proposed as PENDING", Boolean(ins && /status = 'PENDING'/.test(ins.body)));
  const upd = policies.find((x) => x.table === "result_proposals" && x.cmd === "update" && !/is_admin/.test(x.body));
  check("players can only withdraw (CANCELLED) their own pending proposals", Boolean(upd && /submitted_by = auth\.uid\(\)/.test(upd.body) && /status = 'CANCELLED'/.test(upd.body)));
  for (const pol of policies.filter((x) => x.table === "storage.objects" && /bucket_id = 'avatars'/.test(x.body) && ["insert", "update"].includes(x.cmd))) {
    check(`avatar policy "${pol.name}" limits writes to the user's own folder`, /auth\.uid\(\)::text/.test(pol.body));
  }
  check("profile pictures are stored as paths, never URLs (cannot point at another site)", /avatar_path_shape/.test(sql) && !/avatar_url/.test(sql));
  check("avatar path function validates the folder", /INVALID_AVATAR_PATH/.test(sql));
  check("result changes are written to the audit log inside the database", /function record_match_result[\s\S]*?log_admin_action[\s\S]*?function delete_match_result[\s\S]*?log_admin_action/i.test(sql));
  check("approve/reject functions require an admin", /function approve_result_proposal[\s\S]*?NOT_ADMIN/i.test(sql) && /function reject_result_proposal[\s\S]*?NOT_ADMIN/i.test(sql));

  // Account deletion
  check("erase_player cannot be run by players or the public (service role only)",
    /revoke execute on function erase_player\(uuid\) from[^;]*\bauthenticated\b[^;]*;/i.test(sql) &&
    /revoke execute on function erase_player\(uuid\) from[^;]*\banon\b/i.test(sql) &&
    /grant\s+execute on function erase_player\(uuid\) to service_role/i.test(sql));
  check("deleting a login account erases the player in the same transaction (trigger on auth.users)",
    /create trigger on_auth_user_deleted\s+after delete on auth\.users/i.test(sql));
  check("the link from users to auth.users is dropped by what it points at (not a guessed name)", /confrelid = 'auth\.users'::regclass/.test(sql));
  check("the last admin can never be erased", /function erase_player[\s\S]*?LAST_ADMIN/i.test(sql));
  check("audit log scrubbing never rewrites JSON as text", !/regexp_replace\(\s*details/i.test(sql));
  check("only deleted players may have a non-standard username", /deleted_at is not null or username ~/.test(sql));
  check("erased players are made unusable (suspended, role reset, picture cleared)", /set username = v_new_name,[\s\S]*?avatar_path = null,[\s\S]*?role = 'PLAYER',[\s\S]*?status = 'SUSPENDED'/i.test(sql));
  check("new accounts are forced to PLAYER / PENDING by the trigger", /values \(new\.id, new\.raw_user_meta_data ->> 'username', 'PLAYER', 'PENDING'\)/.test(sql));
  check("finished seasons are protected from deletion", /protect_finished_seasons/.test(sql));
}

// 7. Admin actions are logged; the service worker never caches data.
{
  for (const f of ["app/admin/players/actions.ts", "app/admin/teams/actions.ts", "app/admin/seasons/actions.ts",
                   "app/admin/seasons/fixture-actions.ts", "app/admin/seasons/lifecycle-actions.ts", "app/admin/fixtures/actions.ts"]) {
    check(`${f} writes to the audit log`, /await audit\(/.test(read(path.join(root, f))));
  }
  const sw = read(path.join(root, "public/sw.js"));
  check("service worker never stores pages or data (only the offline page may be cached)", !/\.put\(|\.addAll\(|\.add\((?!new Request\(OFFLINE_URL)/.test(sw.replace(/\/\*[\s\S]*?\*\//g, "")));
  check("service worker only handles page navigations", /request\.mode !== "navigate"\) return;/.test(sw));
  check("offline page is static (does not show anyone's account)", !/username|<script src/i.test(read(path.join(root, "public/offline.html"))));

  // Account deletion flow
  const acct = read(path.join(root, "app/account/actions.ts"));
  const del = acct.slice(acct.indexOf("export async function deleteAccountAction"));
  check("deleteAccountAction requires the typed confirmation", /isDeleteConfirmed\(/.test(del));
  check("deleteAccountAction re-checks the password BEFORE deleting anything",
    del.indexOf("signInWithPassword") !== -1 && del.indexOf("signInWithPassword") < del.indexOf("deleteUser("));
  check("deleteAccountAction removes picture files before the point of no return",
    del.indexOf("set_my_avatar") !== -1 && del.indexOf("set_my_avatar") < del.indexOf("deleteUser("));
  check("deleteAccountAction protects the last admin", /role === "ADMIN"/.test(del) && /only admin/.test(del));
  check("deleteAccountAction signs out and leaves the site afterwards", del.indexOf("signOut") > del.indexOf("deleteUser(") && /redirect\("\/\?deleted=1"\)/.test(del));
  check("admin player list hides deleted accounts", /\.is\("deleted_at", null\)/.test(read(path.join(root, "app/admin/players/page.tsx"))));
  check("admin cannot change a deleted account", /target\.deleted_at/.test(read(path.join(root, "app/admin/players/actions.ts"))));
}

// 8. The lint rule that broke the first Vercel build: raw ' or " in page text (react/no-unescaped-entities).
{
  let ts = null;
  try {
    const { createRequire } = await import("node:module");
    ts = createRequire(import.meta.url)("typescript");
  } catch {
    check("typescript is installed so JSX text can be checked", false, "run npm install first");
  }
  if (ts) {
    const bad = [];
    for (const f of src.filter((p) => p.endsWith(".tsx"))) {
      const text = read(f);
      const sf = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const visit = (n) => {
        if (n.kind === ts.SyntaxKind.JsxText && /['">}]/.test(n.getText(sf))) {
          const { line } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
          bad.push(`${rel(f)}:${line + 1}`);
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
    check("no raw apostrophes or quotes in JSX text (would fail next lint)", bad.length === 0, bad.join(", "));
  }
}

// ---- report ----
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${!r.ok && r.detail ? `  -> ${r.detail}` : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
