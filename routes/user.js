const express = require('express');
const router = express.Router();
const User = require('../model/user'); // Ensure the correct path to your User model

router.post('/notify', async (req, res) => {
    const { crypto_id, price, option, email } = req.body;

    try {
        // Find the user by email
        const user = await User.findOne({ email: email });

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Add the notification to the user's notifications
        user.notification.push({ cryptoId: crypto_id, price, option });

        // Save the user with the updated notifications
        await user.save();

        req.flash('message', 'You will be notified!');
        res.redirect(`/${crypto_id}`);
    } catch (error) {
        console.error('Error processing notification request:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
