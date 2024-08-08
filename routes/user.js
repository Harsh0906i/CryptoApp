const express = require('express');
const router = express.Router();
const User = require('../model/user');

router.post('/notify', async (req, res) => {
    const { crypto_id, price, option, email } = req.body;
    try {
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).send('User not found');
        }
        user.notification.push({ cryptoId: crypto_id, price, option });
        await user.save();
        req.flash('message', 'You will be notified!');
        res.redirect(`/${crypto_id}`);
    } catch (error) {
        console.error('Error processing notification request:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
