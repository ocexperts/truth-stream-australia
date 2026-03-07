import bcrypt from "bcryptjs";
import db from "./db.js";

const EMAIL = process.argv[2] || "admin@arn.net.au";
const PASSWORD = process.argv[3] || "changeme123";
const DISPLAY_NAME = process.argv[4] || "Admin";

async function seed() {
  try {
    const hash = await bcrypt.hash(PASSWORD, 12);
    const { rows } = await db.query(
      "INSERT INTO auth_users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET password_hash = $2 RETURNING id",
      [EMAIL, hash]
    );
    const userId = rows[0].id;

    await db.query(
      "INSERT INTO profiles (user_id, display_name) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET display_name = $2",
      [userId, DISPLAY_NAME]
    );

    await db.query(
      "INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin') ON CONFLICT (user_id, role) DO NOTHING",
      [userId]
    );

    console.log(`Admin user created: ${EMAIL} (${userId})`);
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seed();
