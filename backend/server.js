const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Replace with your actual frontend Netlify URL
const frontendURL = 'https://sportssquare.netlify.app';

// Directory for posts
const postsDir = path.join(__dirname, 'posts');
if (!fs.existsSync(postsDir)) {
  fs.mkdirSync(postsDir);
}

// Enable CORS for your frontend origin
app.use(cors({ origin: frontendURL }));

app.use(express.json());

// Serve static files from /posts
app.use('/posts', express.static(postsDir));

// Publish new post endpoint
app.post('/publish', (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  const filename = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-') + '.html';

  const filePath = path.join(postsDir, filename);
  const fullHtml = `<!DOCTYPE html><html><head><title>${title}</title></head><body>${content}</body></html>`;

  fs.writeFile(filePath, fullHtml, (err) => {
    if (err) {
      console.error('Write file error:', err);
      return res.status(500).json({ error: 'Failed to save post.' });
    }
    // Send JSON response with URL
    res.json({ url: `/posts/${filename}` });
  });
});

// Optional: Serve frontend static files locally if you have any
app.use(express.static(path.join(__dirname, 'public')));

// Root fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Individual post route (fallback)
app.get('/posts/:filename', (req, res) => {
  const filePath = path.join(postsDir, req.params.filename);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).send('Post not found.');
    }
    res.sendFile(filePath);
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
