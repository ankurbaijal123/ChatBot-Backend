require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRouter = require('./routes/api')
const app = express();
app.use(cors({
   origin: [
      'http://localhost:8080',          // local frontend
      'https://your-frontend-domain.app' // deployed frontend
    ],
    credentials: true,
}));
app.use(express.json());
app.use("/", apiRouter)

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
