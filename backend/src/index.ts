import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { writeFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { cors } from 'hono/cors'

const app = new Hono();

app.use('*', cors({
  origin: 'http://localhost:5173'
}));

app.post("/generate-json-mrf", async (c) => {
  const { rows, columnDefs } = await c.req.json();

  if (!Array.isArray(rows) || !Array.isArray(columnDefs)) {
    return c.json({ error: "Invalid input format" }, 400);
  }

  const mrfData = {
    rows,
    columnDefs,
  };

  const fileName = `mrf-${uuidv4()}.json`;

  await writeFile(`./storage/${fileName}`, JSON.stringify(mrfData, null, 2));

  return c.json({ success: true });
});

serve({ fetch: app.fetch, port: 8080 });
console.log("Server is running on http://localhost:8080");
