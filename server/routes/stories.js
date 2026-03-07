import { Router } from "express";
import db from "../db.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";

const router = Router();

// Get all approved stories (+ own stories if logged in)
router.get("/", optionalAuth, async (req, res) => {
  try {
    let query, params;
    if (req.user) {
      // Check if user is admin/editor
      const { rows: roleRows } = await db.query(
        "SELECT role FROM user_roles WHERE user_id = $1",
        [req.user.id]
      );
      const roles = roleRows.map((r) => r.role);
      const isPrivileged = roles.includes("admin") || roles.includes("editor");

      if (isPrivileged) {
        query = `SELECT s.*, (SELECT count(*) FROM comments c WHERE c.story_id = s.id) as comment_count FROM stories s ORDER BY s.created_at DESC`;
        params = [];
      } else {
        query = `SELECT s.*, (SELECT count(*) FROM comments c WHERE c.story_id = s.id) as comment_count FROM stories s WHERE s.status = 'approved' OR s.user_id = $1 ORDER BY s.created_at DESC`;
        params = [req.user.id];
      }
    } else {
      query = `SELECT s.*, (SELECT count(*) FROM comments c WHERE c.story_id = s.id) as comment_count FROM stories s WHERE s.status = 'approved' ORDER BY s.created_at DESC`;
      params = [];
    }

    const { rows: stories } = await db.query(query, params);

    // Fetch author names
    const userIds = [...new Set(stories.filter((s) => s.user_id).map((s) => s.user_id))];
    let profileMap = new Map();
    if (userIds.length > 0) {
      const { rows: profiles } = await db.query(
        "SELECT user_id, display_name FROM profiles WHERE user_id = ANY($1)",
        [userIds]
      );
      profileMap = new Map(profiles.map((p) => [p.user_id, p.display_name]));
    }

    const result = stories.map((s) => ({
      ...s,
      comment_count: parseInt(s.comment_count, 10),
      author_name: s.user_id ? profileMap.get(s.user_id) || "Anonymous" : s.guest_name || "Guest",
    }));

    res.json(result);
  } catch (err) {
    console.error("Get stories error:", err);
    res.status(500).json({ error: "Failed to fetch stories" });
  }
});

// Get recent stories (limit 5)
router.get("/recent", optionalAuth, async (req, res) => {
  try {
    const { rows: stories } = await db.query(
      `SELECT s.*, (SELECT count(*) FROM comments c WHERE c.story_id = s.id) as comment_count FROM stories s WHERE s.status = 'approved' ORDER BY s.created_at DESC LIMIT 5`
    );

    const userIds = [...new Set(stories.filter((s) => s.user_id).map((s) => s.user_id))];
    let profileMap = new Map();
    if (userIds.length > 0) {
      const { rows: profiles } = await db.query(
        "SELECT user_id, display_name FROM profiles WHERE user_id = ANY($1)",
        [userIds]
      );
      profileMap = new Map(profiles.map((p) => [p.user_id, p.display_name]));
    }

    const result = stories.map((s) => ({
      ...s,
      comment_count: parseInt(s.comment_count, 10),
      author_name: s.user_id ? profileMap.get(s.user_id) || "Anonymous" : s.guest_name || "Guest",
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch recent stories" });
  }
});

// Get single story
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM stories WHERE id = $1", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Story not found" });

    const story = rows[0];
    // Only allow viewing approved stories or own stories or if admin/editor
    if (story.status !== "approved") {
      if (!req.user) return res.status(404).json({ error: "Story not found" });
      if (story.user_id !== req.user.id) {
        const { rows: roleRows } = await db.query(
          "SELECT role FROM user_roles WHERE user_id = $1 AND role IN ('admin', 'editor')",
          [req.user.id]
        );
        if (roleRows.length === 0) return res.status(404).json({ error: "Story not found" });
      }
    }

    let authorName = story.guest_name || "Guest";
    if (story.user_id) {
      const { rows: profiles } = await db.query(
        "SELECT display_name FROM profiles WHERE user_id = $1",
        [story.user_id]
      );
      authorName = profiles[0]?.display_name || "Anonymous";
    }

    res.json({ ...story, author_name: authorName });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch story" });
  }
});

// Create story
router.post("/", optionalAuth, async (req, res) => {
  try {
    const { title, content, media_outlet, guest_name, guest_email } = req.body;
    if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: "Title and content required" });

    let insertQuery, insertParams;
    if (req.user) {
      insertQuery = `INSERT INTO stories (user_id, title, content, media_outlet, status) VALUES ($1, $2, $3, $4, 'approved') RETURNING *`;
      insertParams = [req.user.id, title.trim(), content.trim(), media_outlet || null];
    } else {
      if (!guest_name?.trim() || !guest_email?.trim()) {
        return res.status(400).json({ error: "Guest name and email required" });
      }
      insertQuery = `INSERT INTO stories (title, content, media_outlet, guest_name, guest_email, status) VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`;
      insertParams = [title.trim(), content.trim(), media_outlet || null, guest_name.trim(), guest_email.trim()];
    }

    const { rows } = await db.query(insertQuery, insertParams);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Create story error:", err);
    res.status(500).json({ error: "Failed to create story" });
  }
});

// Update story
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { rows: existing } = await db.query("SELECT * FROM stories WHERE id = $1", [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: "Story not found" });

    const story = existing[0];
    const isOwner = story.user_id === req.user.id;

    const { rows: roleRows } = await db.query(
      "SELECT role FROM user_roles WHERE user_id = $1 AND role IN ('admin', 'editor')",
      [req.user.id]
    );
    const isPrivileged = roleRows.length > 0;

    if (!isOwner && !isPrivileged) return res.status(403).json({ error: "Forbidden" });

    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of ["title", "content", "status", "media_outlet", "original_title", "original_content"]) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(req.body[key]);
      }
    }

    if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });

    values.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE stories SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update story" });
  }
});

// Delete story
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { rows: existing } = await db.query("SELECT user_id FROM stories WHERE id = $1", [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: "Story not found" });

    const isOwner = existing[0].user_id === req.user.id;
    const { rows: roleRows } = await db.query(
      "SELECT role FROM user_roles WHERE user_id = $1 AND role = 'admin'",
      [req.user.id]
    );
    const isAdmin = roleRows.length > 0;

    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Forbidden" });

    await db.query("DELETE FROM stories WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete story" });
  }
});

// Get pending stories (admin/editor)
router.get("/admin/pending", requireAuth, async (req, res) => {
  try {
    const { rows: roleRows } = await db.query(
      "SELECT role FROM user_roles WHERE user_id = $1 AND role IN ('admin', 'editor')",
      [req.user.id]
    );
    if (roleRows.length === 0) return res.status(403).json({ error: "Forbidden" });

    const { rows } = await db.query(
      "SELECT * FROM stories WHERE status = 'pending' ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pending stories" });
  }
});

export default router;
