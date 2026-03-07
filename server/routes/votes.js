import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Upvote/toggle vote
router.post("/", requireAuth, async (req, res) => {
  try {
    const { story_id } = req.body;
    if (!story_id) return res.status(400).json({ error: "story_id required" });

    // Upsert vote
    await db.query(
      `INSERT INTO votes (story_id, user_id, vote_type) VALUES ($1, $2, 1) ON CONFLICT (story_id, user_id) DO UPDATE SET vote_type = 1`,
      [story_id, req.user.id]
    );

    // Update upvote count on story
    const { rows } = await db.query(
      "SELECT count(*) as count FROM votes WHERE story_id = $1",
      [story_id]
    );
    await db.query("UPDATE stories SET upvotes = $1 WHERE id = $2", [
      parseInt(rows[0].count, 10),
      story_id,
    ]);

    res.json({ success: true, upvotes: parseInt(rows[0].count, 10) });
  } catch (err) {
    res.status(500).json({ error: "Failed to vote" });
  }
});

export default router;
