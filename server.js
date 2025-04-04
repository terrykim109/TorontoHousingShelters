const express = require('express');
const https = require('https');
const cors = require('cors');
const app = express();

const HTTP_PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.static('public'));

// API CODE 

app.listen(HTTP_PORT, () => {
  console.log(`Server listening on port ${HTTP_PORT}`);
});
