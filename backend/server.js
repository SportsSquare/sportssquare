const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000; // ✅ THIS IS CRITICAL

app.use(express.json());
app.use(express.static(__dirname)); // Or update to serve 'frontend' properly

app.post('/publish', (req, res) => {
  const { title, content } = req.body;

  const filename = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-') + '.html';

  const filePath = path.join(__dirname, 'posts', filename);
  const fullHtml = `<!DOCTYPE html><html><head><title>${title}</title></head><body>${content}</body></html>`;

  fs.writeFile(filePath, fullHtml, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Failed to save post.');
    }
    res.send('Post published as ' + filename);
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
