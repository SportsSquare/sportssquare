const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Your frontend origin URL (adjust if needed)
const frontendURL = 'https://sportssquare.netlify.app';

// Directory where posts are saved (on the server)
const postsDir = path.join(__dirname, 'posts');
if (!fs.existsSync(postsDir)) {
  fs.mkdirSync(postsDir);
}

app.use(cors({ origin: frontendURL }));
app.use(express.json());

// Serve posts statically
app.use('/posts', express.static(postsDir));

// Endpoint: Publish new post
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

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
</head>
<body>
  ${content}
</body>
</html>`;

  fs.writeFile(filePath, fullHtml, (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return res.status(500).json({ error: 'Failed to save post.' });
    }
    console.log(`Post saved: ${filename}`);
    res.json({ message: 'Post published', url: `/posts/${filename}` });
  });
});

// Endpoint: List all posts (for debugging)
app.get('/list-posts', (req, res) => {
  fs.readdir(postsDir, (err, files) => {
    if (err) {
      console.error('Error reading posts dir:', err);
      return res.status(500).json({ error: 'Failed to list posts' });
    }
    res.json({ posts: files });
  });
});

// Fallback root route (optional)
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
