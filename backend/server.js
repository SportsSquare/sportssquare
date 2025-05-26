const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Your frontend Netlify URL (must match exactly)
const frontendURL = 'https://sportssquare.netlify.app';

// Define posts directory BEFORE using it
const postsDir = path.join(__dirname, 'posts');
if (!fs.existsSync(postsDir)) {
  fs.mkdirSync(postsDir);
}

app.use(cors({ origin: frontendURL }));
app.use(express.json());

// Serve generated posts statically under /posts
app.use('/posts', express.static(postsDir));

// POST /publish to save new post HTML files
app.post('/publish', (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  // Sanitize title to filename-safe string
  const filename = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '.html';

  const filePath = path.join(postsDir, filename);
  const fullHtml = `<!DOCTYPE html><html><head><title>${title}</title></head><body>${content}</body></html>`;

  fs.writeFile(filePath, fullHtml, (err) => {
    if (err) {
      console.error('Error writing post:', err);
      return res.status(500).json({ error: 'Failed to save post.' });
    }
    res.json({ message: 'Post published', url: `/posts/${filename}` });
  });
});

// Safety net for serving posts individually
app.get('/posts/:filename', (req, res) => {
  const filePath = path.join(postsDir, req.params.filename);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) return res.status(404).send('Post not found.');
    res.sendFile(filePath);
  });
});

// Optional: serve frontend statically if local testing
app.use(express.static(path.join(__dirname, 'public')));

// Optional: root fallback route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
