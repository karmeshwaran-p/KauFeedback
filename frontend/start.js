import http from "node:http";
import { Readable } from "node:stream";
import app from "./dist/server/server.js";

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    
    // Convert Node Headers to Web Headers
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) value.forEach(v => headers.append(key, v));
      else if (value) headers.set(key, value);
    }
    
    // Read Body for POST/PUT
    let body = undefined;
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.headers["content-length"] !== "0") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks);
    }

    const fetchReq = new Request(url.href, { 
      method: req.method, 
      headers, 
      body 
    });
    
    const fetchRes = await app.fetch(fetchReq, process.env, { waitUntil: () => {} });

    res.statusCode = fetchRes.status;
    fetchRes.headers.forEach((value, key) => res.appendHeader(key, value));
    
    if (fetchRes.body) {
      for await (const chunk of fetchRes.body) res.write(chunk);
    }
    res.end();
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.end("Internal Error");
  }
});
server.listen(3000, "0.0.0.0", () => console.log("Server listening on port 3000"));
