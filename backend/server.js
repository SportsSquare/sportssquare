const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Replace with your actual Netlify frontend URL
const frontendURL = 'https://sportssquare.netlify.app';

app.use(cors({
  origin: frontendURL,
}));

app.use(express.json());
app.use(express.static(__dirname));

app.post('/publish', (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).send('Title and content are required.');
  }

  const filename = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-') + '.html';

  const postsDir = path.join(__dirname, 'posts');
  if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir);
  }

  const filePath = path.join(postsDir, filename);
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
