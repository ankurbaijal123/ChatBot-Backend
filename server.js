require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const pdfParse = require('pdf-parse');

const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Project Schema
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  systemPrompt: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});
const Project = mongoose.model('Project', projectSchema);

// Auth Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

// Register
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create Project
app.post('/projects', auth, async (req, res) => {
  try {
    const { name, systemPrompt } = req.body;
    const project = new Project({ name, systemPrompt, userId: req.userId });
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get User Projects
app.get('/projects', auth, async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
async function extractTextFromPDF(file) {
  const data = await pdfParse(file.buffer);
  return data.text;
}

app.post(
  '/chat',
  auth,
  upload.single('file'), // field name must match frontend
  async (req, res) => {
    try {
      console.log('chat api called');

      console.log('BODY:', req.body);   // projectId, messages (as string)
      console.log('FILE:', req.file);   // file or undefined

      const { projectId, messages } = req.body;

      const project = await Project.findOne({ _id: projectId, userId: req.userId }); 
      if (!project) {
        return res.status(404).json({ message: 'Project not found' }); 
         }

      // messages comes as string in multipart
      const parsedMessages = messages ? JSON.parse(messages) : [];
       if (req.file && req.file.mimetype === 'application/pdf') {
        const pdfText = await extractTextFromPDF(req.file);

        parsedMessages.unshift({
          role: 'system',
          content: `Use the following PDF content to answer the user:\n\n${pdfText}`,
        });
      }


      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
     model: 'openai/gpt-3.5-turbo',
max_tokens: 600,


            messages: parsedMessages,
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        return res.status(500).json({ message: data.error.message });
      }

      res.json({
        message: data.choices[0].message.content,
      });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ message: 'Failed' });
    }
  }
);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));