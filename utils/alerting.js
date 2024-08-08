const userSchema = require('../model/user');
const NodeCache = require('node-cache');
const nodemailer = require('nodemailer');

const cache = new NodeCache({ stdTTL: 10 });

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});

async function sendEmailfunction(to, cryptoId, price) {
    const mailOptions = {
        from: process.env.EMAIL,
        to: to,
        subject: `Price Alert for (${cryptoId})`,
        text: `The price for (${cryptoId}) has reached your set preference for $${price}.`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
}
async function checkPrice() {
    const options = {
        method: 'GET',
        headers: { accept: 'application/json', 'x-cg-demo-api-key': process.env.CRYPTO_API_KEY }
    };

    try {
        const users = await userSchema.find({ notification: { $exists: true, $not: { $size: 0 } } });

        for (const user of users) {
            for (const notification of user.notification) {
                try {
                    let coinData = cache.get(notification.cryptoId);

                    if (!coinData) {
                        const coinRes = await fetch(`https://api.coingecko.com/api/v3/coins/${notification.cryptoId}`, options);

                        if (!coinRes.ok) {
                            console.error(`Failed to fetch data for ${notification.cryptoId}`);
                            continue;
                        }

                        coinData = await coinRes.json();
                        cache.set(notification.cryptoId, coinData);
                    }

                    let sendEmail = false;

                    if (notification.option === 'less' && coinData?.market_data?.current_price?.usd <= notification.price) {
                        console.log(`Preference matched for less ${user.email}`);
                        sendEmail = true;
                    }

                    if (notification.option === 'greater' && coinData?.market_data?.current_price?.usd >= notification.price) {
                        console.log(`Preference matched for greater ${user.email}`);
                        sendEmail = true;
                    }

                    if (sendEmail) {
                        await sendEmailfunction(user.email, notification.cryptoId, notification.price);
                        notification.price = null;
                        notification.option = null;
                        await user.save();
                    }
                } catch (error) {
                    console.error(`Error processing notification for user ${user.email}:`, error);
                }
            }
        }
    } catch (error) {
        console.error('Error fetching users or processing notifications:', error);
    }
}

module.exports = checkPrice;
