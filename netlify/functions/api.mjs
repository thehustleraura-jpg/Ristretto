// All of /api/* runs here (netlify.toml rewrites /api/* to this function). Data: Supabase Postgres; files: Supabase Storage.
import serverless from "serverless-http";
import { createApp } from "../../server/app.mjs";
import { openDb } from "../../server/db.mjs";
import { openFiles } from "../../server/files.mjs";

const missing = ["APP_SECRET", "DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((k) => !process.env[k]);
let wrapped;
if (!missing.length) {
  const app = createApp({ db: openDb(), files: openFiles({ dataDir: "/tmp", secret: process.env.APP_SECRET }), secret: process.env.APP_SECRET });
  wrapped = serverless(app);
}

export const handler = async (event, context) => {
  if (missing.length) {
    console.error(`Missing environment variables: ${missing.join(", ")}`);
    return { statusCode: 500, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: `Server is not configured (missing ${missing.join(", ")})` }) };
  }
  context.callbackWaitsForEmptyEventLoop = false; // keep the Postgres pool open between invocations
  return wrapped(event, context);
};
