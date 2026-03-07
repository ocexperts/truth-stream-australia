import { Router } from "express";
import bcrypt from "bcryptjs";
import db from "../db.js";
import { generateToken, requireAuth } from "../middleware/auth.js";
import { TOTP } from "otpauth";
import QRCode from "qrcode";

const router = Router();

router.post("/signup", async (req, res) => {
  try {
    const { email, password, display_name } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const existing = await db.query("SELECT id FROM auth_users WHERE email = $1", [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      "INSERT INTO auth_users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
      [email, passwordHash]
    );
    const user = rows[0];

    // Create profile
    await db.query(
      "INSERT INTO profiles (user_id, display_name) VALUES ($1, $2)",
      [user.id, display_name || "Anonymous"]
    );

    const token = generateToken(user);
    res.json({ user: { id: user.id, email: user.email }, token });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Failed to create account" });
  }
});

router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await db.query("SELECT * FROM auth_users WHERE email = $1", [email]);
    if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    // Check if MFA is enabled
    if (user.mfa_secret && user.mfa_verified) {
      // Return partial token that requires MFA
      const mfaToken = generateToken({ id: user.id, email: user.email, mfa_pending: true });
      return res.json({ mfa_required: true, mfa_token: mfaToken });
    }

    const token = generateToken(user);
    res.json({ user: { id: user.id, email: user.email }, token });
  } catch (err) {
    console.error("Signin error:", err);
    res.status(500).json({ error: "Sign in failed" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT u.id, u.email, u.created_at, p.display_name, p.avatar_url FROM auth_users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = $1",
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to get user" });
  }
});

// MFA enrollment
router.post("/mfa/enroll", requireAuth, async (req, res) => {
  try {
    const totp = new TOTP({ issuer: "ARN", label: req.user.email, algorithm: "SHA1", digits: 6, period: 30 });
    const secret = totp.secret.base32;
    const uri = totp.toString();
    const qr = await QRCode.toDataURL(uri);

    await db.query("UPDATE auth_users SET mfa_secret = $1, mfa_verified = false WHERE id = $2", [secret, req.user.id]);

    res.json({ qr_code: qr, secret });
  } catch (err) {
    console.error("MFA enroll error:", err);
    res.status(500).json({ error: "Failed to enroll MFA" });
  }
});

// MFA verify (both for enrollment and login)
router.post("/mfa/verify", requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const { rows } = await db.query("SELECT mfa_secret FROM auth_users WHERE id = $1", [req.user.id]);
    if (!rows[0]?.mfa_secret) return res.status(400).json({ error: "MFA not enrolled" });

    const totp = new TOTP({ secret: rows[0].mfa_secret, algorithm: "SHA1", digits: 6, period: 30 });
    const valid = totp.validate({ token: code, window: 1 }) !== null;

    if (!valid) return res.status(400).json({ error: "Invalid code" });

    await db.query("UPDATE auth_users SET mfa_verified = true WHERE id = $1", [req.user.id]);

    // If this was a login MFA challenge, issue a full token
    const token = generateToken({ id: req.user.id, email: req.user.email });
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ error: "MFA verification failed" });
  }
});

router.get("/mfa/status", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT mfa_verified FROM auth_users WHERE id = $1", [req.user.id]);
    res.json({ enabled: !!rows[0]?.mfa_verified });
  } catch (err) {
    res.status(500).json({ error: "Failed to check MFA status" });
  }
});

export default router;
