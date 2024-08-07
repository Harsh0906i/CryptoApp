const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.cookies.access_token;
    if (!token) {
        req.flash('message', 'Not authenticated!');
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT);
        req.user = decoded;
        next();
    } catch (error) {
        console.log(error);
        req.flash('message', 'Login to access!');
        res.redirect('/login');
    }
};

module.exports = authMiddleware;
