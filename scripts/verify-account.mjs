// Run with: npm run verify:account   (needs Node 22.6+)
import { computeCrop, isJpeg, AVATAR_SIZE, AVATAR_MAX_BYTES } from "../lib/avatar/process.ts";
import { validatePassword, validateUsername, validateEmail, safeNextPath } from "../lib/validation/auth.ts";

let failures = 0;
const check = (cond, msg) => { if (!cond) { failures++; console.error("FAIL:", msg); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// --- square crop ---
check(eq(computeCrop(3000, 2000), { sx: 500, sy: 0, size: 2000 }), "landscape crops the centre");
check(eq(computeCrop(2000, 3000), { sx: 0, sy: 500, size: 2000 }), "portrait crops the centre");
check(eq(computeCrop(800, 800), { sx: 0, sy: 0, size: 800 }), "square stays whole");
check(eq(computeCrop(101, 100), { sx: 0, sy: 0, size: 100 }), "odd difference rounds down, stays in bounds");
for (const [w, h] of [[4032, 3024], [1080, 1920], [333, 777], [50, 50], [1, 999]]) {
  const c = computeCrop(w, h);
  check(c.sx >= 0 && c.sy >= 0 && c.sx + c.size <= w && c.sy + c.size <= h, `crop ${w}x${h} stays inside the image`);
}
check(AVATAR_SIZE === 256 && AVATAR_MAX_BYTES === 307200, "limits match the storage bucket (300 KB)");

// --- JPEG signature (the server does not trust the browser's mime type) ---
check(isJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10])), "real JPEG header accepted");
check(!isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), "PNG rejected");
check(!isJpeg(new Uint8Array([0x47, 0x49, 0x46, 0x38])), "GIF rejected");
check(!isJpeg(new TextEncoder().encode("<script>alert(1)</script>")), "HTML/script rejected");
check(!isJpeg(new Uint8Array([])) && !isJpeg(new Uint8Array([0xff, 0xd8])), "empty and truncated input rejected");

// --- password rules used by registration AND change-password ---
check(validatePassword("1234567") !== null, "7 characters is too short");
check(validatePassword("12345678") === null, "8 characters is fine");
check(validatePassword("x".repeat(72)) === null, "72 characters is fine");
check(validatePassword("x".repeat(73)) !== null, "73 characters is refused (bcrypt limit)");

// --- open-redirect protection for ?next= ---
check(safeNextPath("/account") === "/account", "normal path kept");
check(safeNextPath("//evil.com") === "/", "protocol-relative URL blocked");
check(safeNextPath("https://evil.com") === "/", "absolute URL blocked");
check(safeNextPath("/\\evil.com") === "/", "backslash trick blocked");
check(safeNextPath(undefined) === "/" && safeNextPath(42) === "/", "non-strings fall back to home");

// --- usernames / emails (unchanged rules, guarded because the account page relies on them) ---
check(validateUsername("Vincy_9") === null && validateUsername("ab") !== null && validateUsername("a b") !== null, "username rules");
check(validateEmail("a@b.co") === null && validateEmail("nope") !== null, "email rules");

if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
console.log("All account checks passed.");
