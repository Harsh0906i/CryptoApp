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
}, { _id: false }); // Use _id: false to not create an _id field for each item in the array

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
    notification: [notificationSchema] // Define `notification` as an array of `notificationSchema`
});

const User = mongoose.model('Users', userSchema);
module.exports = User;
