import express from "express";
import app from "./dist/server/server.js";

const server = express();

server.use(express.static("dist/client", { index: false }));

server.use(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) value.forEach(v => headers.append(key, v));
      else if (value) headers.set(key, value);
    }
    
    let body = undefined;
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.headers["content-length"] !== "0") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks);
    }

    const fetchReq = new Request(url.href, { method: req.method, headers, body });
    const fetchRes = await app.fetch(fetchReq, process.env, { waitUntil: () => {} });

    res.status(fetchRes.status);
    fetchRes.headers.forEach((value, key) => res.append(key, value));
    
    if (fetchRes.body) {
      for await (const chunk of fetchRes.body) res.write(chunk);
    }
    res.end();
  } catch (error) {
    console.error("SSR Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

server.listen(3001, "0.0.0.0", () => console.log("Server listening on port 3001"));
