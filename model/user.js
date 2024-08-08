const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    cryptoId: {
        type: String
    },
    price: {
        type: String
    },
    option: {
        type: String
    }
}, { _id: false });
const userSchema = new mongoose.Schema({
    username: {
        type: String,
    },
    email: {
        type: String,
    },
    password: {
        type: String,
    },
    notification: [notificationSchema]
});

const User = mongoose.model('Users', userSchema);
module.exports = User;
