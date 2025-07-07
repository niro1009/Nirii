const express = require('express');
const bodyParser = require('body-parser');
const bot = require('./bot');

const app = express();
const port = process.env.PORT || 3000;
const token = '8104059957:AAGvG8WUATsPzO5VZkIGBQRxTBiyz0GdCIk';

app.use(bodyParser.json());

app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

app.get("/", (req, res) => {
    res.send("Nirvana bot is running.");
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});