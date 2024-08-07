require('dotenv').config()
const express = require('express');
const app = express();
const path = require('path');
const cookie = require('cookie-parser')
const bodyParser = require('body-parser');
const flash = require('express-flash');
const session = require('express-session');
const authrouter = require('./routes/auth');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const cron = require('node-cron');
const cors = require('cors');
const userRouter = require('./routes/user');
const userSchema = require('./model/user');
const verify = require('./utils/verify');
const nodemailer = require('nodemailer');

app.use(cors())
app.use(flash());
app.use(cookie());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
}));
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.use('/api/auth', authrouter);
app.use('/api/user', userRouter);

main()
    .then(() => {
        console.log("connected to DB");
    }).catch((err) => {
        console.log(err);
    });
async function main() {
    await mongoose.connect(process.env.MONGOURI);
};

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
        text: `The price for (${cryptoId}) has reached your set preference for ${price}.`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

app.get('/', async (req, res) => {
    res.render('signup', { message: req.flash('message') })
})

app.get('/login', (req, res) => {
    res.render('login', { message: req.flash('message') })
})

app.get('/home', verify, async (req, res) => {
    const options = { method: 'GET', headers: { accept: 'application/json', 'x-cg-demo-api-key': process.env.CRYPTO_API_KEY } };
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd', options)
        const data = await response.json();
        res.render('home', { message: req.flash('message'), data });
    } catch (error) {
        console.log(error)
    }
})

app.get('/:id', verify, async (req, res) => {
    const { id } = req.params;
    const { _id } = req.user;
    const user = await userSchema.findById(_id)
    if (!user) {
        return
    }
    const userEmail = user.email;

    const options = {
        method: 'GET',
        headers: { accept: 'application/json', 'x-cg-demo-api-key': process.env.CRYPTO_API_KEY }
    };
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${id}`, options)
        const data = await response.json();
        res.render('CryptoPage', { message: req.flash('message'), data, id, userEmail });
    } catch (error) {
        console.log('error occured!', error)
    }
});


async function checkPrice() {
    const options = {
        method: 'GET',
        headers: { accept: 'application/json', 'x-cg-demo-api-key': process.env.CRYPTO_API_KEY }
    };

    const users = await userSchema.find({ notification: { $exists: true, $not: { $size: 0 } } });
    for (const user of users) {
        for (const notification of user.notification) {
            const coinRes = await fetch(`https://api.coingecko.com/api/v3/coins/${notification.cryptoId}`, options);
            const coinData = await coinRes.json();

            let sendEmail = false;
            if (notification.option === 'less' && coinData?.market_data?.current_price?.usd <= notification.price) {
                console.log(`Preference matched for less ${user.email}`);
                sendEmail = true;
            }

            if (notification.option === 'greater' && coinData?.market_data?.current_price?.usd >= notification.price) {
                console.log(`Preference matched for greater ${user.email}`);
                sendEmail = true;
            }

            if (notification.option === null && notification.price === null) {
                console.log('nothing to email');
            }

            if (sendEmail) {
                sendEmailfunction(user.email, notification.cryptoId, notification.price)
                notification.price = null;
                notification.option = null;
                await user.save();
            }
        }
    }
}

cron.schedule('* * * * *', checkPrice);

const server = app.listen('8080', () => {
    console.log('server is listening!')
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {

    console.log('Client connected');

    ws.on('message', async (message) => {
        console.log('Received message from client: %s', message);
        const data = JSON.parse(message);
        if (data.type === 'subscribe' && data.id) {

            const options = {
                method: 'GET',
                headers: { accept: 'application/json', 'x-cg-demo-api-key': process.env.CRYPTO_API_KEY }
            };

            console.log(`Client subscribed to updates for id: ${data.id}`);
            async function fetchPrice() {
                try {
                    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${data.id}/market_chart?vs_currency=usd&days=1`, options);
                    const priceData = await response.json();

                    if (priceData && priceData.prices) {
                        const update = {
                            type: 'priceUpdate',
                            id: data.id,
                            timestamp: Date.now(),
                            prices: priceData.prices
                        };
                        ws.send(JSON.stringify(update));

                    } else {
                        console.error('Price data not found for id:', data.id);
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Price data not found'
                        }));
                    }
                } catch (error) {
                    console.error('Error fetching price data:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Error fetching price data'
                    }));
                }
            }

            fetchPrice();
            const interval = setInterval(fetchPrice, 5000);

            ws.on('close', () => {
                clearInterval(interval);
                console.log('Client disconnected');
            });
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

console.log('WebSocket server is running on ws://localhost:8080');