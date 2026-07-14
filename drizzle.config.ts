// drizzle-kit CLI config. Install the CLI only when you push the schema:
//   npm i -D drizzle-kit && npx drizzle-kit push
export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL as string },
};
