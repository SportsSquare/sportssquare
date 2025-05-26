const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Replace with your actual frontend Netlify URL
const frontendURL = 'https://sportssquare.netlify.app';

app.use(cors({ origin: frontendURL }));
app.use(express.json());

// Directory for dynamically generated post files (Render only allows writing to /tmp)
const postsDir = '/tmp/posts';
if (!fs.existsSync(postsDir)) {
  fs.mkdirSync(postsDir);
}

// Serve generated posts
app.use('/posts', express.static(postsDir));

// Handle publishing new post
app.post('/publish', (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).send('Title and content are required.');
  }

  const filename = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-') + '.html';

  const filePath = path.join(postsDir, filename);
  const fullHtml = `<!DOCTYPE html><html><head><title>${title}</title></head><body>${content}</body></html>`;

  fs.writeFile(filePath, fullHtml, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Failed to save post.');
    }
    res.send(`Post published at /posts/${filename}`);
  });
});

// Serve static frontend files (optional — only if you're testing frontend locally)
app.use(express.static(path.join(__dirname, 'public')));

// Fallback route (optional)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Explicit route to serve individual posts (already handled above, but safe fallback)
app.get('/posts/:filename', (req, res) => {
  const filePath = path.join(postsDir, req.params.filename);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).send('Post not found.');
    }
    res.sendFile(filePath);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
