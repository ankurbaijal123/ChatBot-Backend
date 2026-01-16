
const express = require('express');
const apiRouter = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const User = require("../modals/user");
const Project = require("../modals/project")
const userAuth = require("../middleware/useAuth")
const jwt = require('jsonwebtoken');

// Register
apiRouter.post('/auth/register', async (req, res) => {
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
apiRouter.post('/auth/login', async (req, res) => {
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
apiRouter.post('/projects', userAuth, async (req, res) => {
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
apiRouter.get('/projects', userAuth, async (req, res) => {
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

apiRouter.post(
    '/chat', userAuth, upload.single('file'), async (req, res) => {
        try {

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
module.exports = apiRouter