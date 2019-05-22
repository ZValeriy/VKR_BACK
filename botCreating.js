var TelegramBot = require('node-telegram-bot-api');

// Устанавливаем токен, который выдавал нам бот.
var token = '760527860:AAGqAnqcL7_EPUwNMkmcYwkthDNSipqD-ao';

// Включить опрос сервера
var bot = new TelegramBot(token, {polling: true});

module.exports = bot;
