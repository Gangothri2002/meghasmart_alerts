const app = require('./server');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Megha Smart is running on http://localhost:${PORT}`);
});
