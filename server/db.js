import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgres://arn_app:password@localhost:5432/arn",
});

export default pool;
