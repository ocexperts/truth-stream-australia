import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Middleware: require admin
async function requireAdmin(req, res, next) {
  const { rows } = await db.query(
    "SELECT role FROM user_roles WHERE user_id = $1 AND role = 'admin'",
    [req.user.id]
  );
  if (rows.length === 0) return res.status(403).json({ error: "Forbidden" });
  next();
}

// List all users with roles
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows: users } = await db.query(
      `SELECT u.id, u.email, u.created_at, p.display_name
       FROM auth_users u
       LEFT JOIN profiles p ON p.user_id = u.id
       ORDER BY u.created_at DESC`
    );

    const { rows: allRoles } = await db.query("SELECT * FROM user_roles");
    const roleMap = new Map();
    allRoles.forEach((r) => {
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role);
      roleMap.set(r.user_id, existing);
    });

    const result = users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      display_name: u.display_name || "Anonymous",
      roles: roleMap.get(u.id) || [],
    }));

    res.json(result);
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ error: "Failed to list users" });
  }
});

// Add role
router.post("/roles", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user_id, role } = req.body;
    await db.query(
      "INSERT INTO user_roles (user_id, role) VALUES ($1, $2) ON CONFLICT (user_id, role) DO NOTHING",
      [user_id, role]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to add role" });
  }
});

// Remove role
router.delete("/roles", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user_id, role } = req.body;
    await db.query("DELETE FROM user_roles WHERE user_id = $1 AND role = $2", [user_id, role]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove role" });
  }
});

// Get roles for current user
router.get("/my-roles", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT role FROM user_roles WHERE user_id = $1", [req.user.id]);
    res.json(rows.map((r) => r.role));
  } catch (err) {
    res.status(500).json({ error: "Failed to get roles" });
  }
});

export default router;
