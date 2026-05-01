/**
 * Vercel serverless: proxy GitHub releases API (avoids browser rate limits on shared IPs).
 */
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const gh = await fetch(
      'https://api.github.com/repos/ledoit/Matrix-Maze/releases?per_page=50',
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'MatrixMaze-Landing/1.0 (Vercel)',
        },
      }
    );

    const data = await gh.json();

    if (!gh.ok) {
      res.status(502).json({
        error: 'GitHub API error',
        status: gh.status,
        message: data && data.message,
      });
      return;
    }

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=120, stale-while-revalidate=600'
    );
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err && err.message ? err.message : 'proxy failed' });
  }
};
