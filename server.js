const express = require('express');
const https = require('https');
const cors = require('cors');
const app = express();

const HTTP_PORT = process.env.PORT || 8080;
const packageId = "21c83b32-d5a8-4106-a54f-010dbe49f6f2"; // from Toronto open data website

app.use(cors());
app.use(express.static('public'));

// API CODE 

// Retrieving Metadata
const getPackage = () => {
  return new Promise((resolve, reject) => {
    https.get(`https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=${packageId}`, (res) => {
      let chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const data = JSON.parse(Buffer.concat(chunks).toString());
        resolve(data.result);
      });
      res.on("error", reject);
    });
  });
};

app.get("/api/shelters", async (req, res) => {
  try {
    const pkg = await getPackage(); 
    const resourceUrl = pkg.resources.find(r => r.format === "JSON").url;

https.get(resourceUrl, (resp) => {
  let data = '';
  resp.on('data', chunk => data += chunk);
  resp.on('end', () => {
    res.json(JSON.parse(data));
  });
}).on('error', err => {
  console.error('Error retrieving resource data:', err);
  res.status(500).json({ error: 'Failed to load shelter records.' });
});
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: "Failed to fetch shelter data." });
  }
});

app.listen(HTTP_PORT, () => {
  console.log(`Server listening on port ${HTTP_PORT}`);
});
