import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import storyRoutes from "./routes/stories.js";
import commentRoutes from "./routes/comments.js";
import voteRoutes from "./routes/votes.js";
import adminRoutes from "./routes/admin.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:8080" }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`ARN API server running on port ${PORT}`);
});
