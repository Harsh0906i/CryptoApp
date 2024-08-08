const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const userSchema = require('../model/user');
const bcrypt = require('bcrypt');

router.post('/signup', async (req, res) => {
    const { username, password, email } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        const existingUser = await userSchema.findOne({ email });
        if (existingUser) {
            req.flash('message', 'user already exists!');
            res.redirect('/');
            return;
        }
        const newUser = new userSchema({
            username,
            email,
            password: hash
        });
        const user = await newUser.save();
        res.redirect('/login');
        req.flash('message', 'Signup successfull!');
    } catch (error) {
        console.log(error)
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body
    try {
        const existingUser = await userSchema.findOne({ email });
        if (!existingUser) {
            req.flash('message', 'user does not exists!')
            res.redirect('/login')
            return;
        }
        const validPassword = await bcrypt.compare(password, existingUser.password);
        if (!validPassword) {
            req.flash('message', 'Invalid password!');
            res.redirect('/login');
            return;
        }
        const token = jwt.sign({ _id: existingUser._id }, process.env.JWT, { expiresIn: '1h' });
        res.cookie('access_token', token, { httpOnly: true })
        res.redirect('/home');
    } catch (error) {
        console.log(error);
    }
});

module.exports = router