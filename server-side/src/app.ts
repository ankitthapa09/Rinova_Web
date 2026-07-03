import express from 'express';

const app = express();
const PORT = process.env.PORT || 5000;

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ status: 'OK', message: 'Rinova server initialized' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
