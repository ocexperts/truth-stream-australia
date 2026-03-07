import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Get comments for a story
router.get("/:storyId", async (req, res) => {
  try {
    const { rows: comments } = await db.query(
      "SELECT * FROM comments WHERE story_id = $1 ORDER BY created_at ASC",
      [req.params.storyId]
    );

    const userIds = [...new Set(comments.map((c) => c.user_id))];
    let profileMap = new Map();
    if (userIds.length > 0) {
      const { rows: profiles } = await db.query(
        "SELECT user_id, display_name FROM profiles WHERE user_id = ANY($1)",
        [userIds]
      );
      profileMap = new Map(profiles.map((p) => [p.user_id, p.display_name]));
    }

    const result = comments.map((c) => ({
      ...c,
      author_name: profileMap.get(c.user_id) || "Anonymous",
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// Create comment
router.post("/", requireAuth, async (req, res) => {
  try {
    const { story_id, content } = req.body;
    if (!story_id || !content?.trim()) return res.status(400).json({ error: "story_id and content required" });

    const { rows } = await db.query(
      "INSERT INTO comments (story_id, user_id, content) VALUES ($1, $2, $3) RETURNING *",
      [story_id, req.user.id, content.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create comment" });
  }
});

// Delete comment
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT user_id FROM comments WHERE id = $1", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Comment not found" });

    const isOwner = rows[0].user_id === req.user.id;
    const { rows: roleRows } = await db.query(
      "SELECT role FROM user_roles WHERE user_id = $1 AND role = 'admin'",
      [req.user.id]
    );
    const isAdmin = roleRows.length > 0;

    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Forbidden" });

    await db.query("DELETE FROM comments WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

export default router;
