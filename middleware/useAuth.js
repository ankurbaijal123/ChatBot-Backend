// Auth Middleware
const jwt = require('jsonwebtoken');
const userAuth = async (req, res, next) => {
     //Read the token from request and validate the user

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
module.exports = userAuth ;