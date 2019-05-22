var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var lessMiddleware = require('less-middleware');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var bot = require('./botCreating');

const db = require('./tasks/tasks');
var app = express();

// const TeleBot = require('telebot');
// const bot = new TeleBot({
//     token: '760527860:AAGqAnqcL7_EPUwNMkmcYwkthDNSipqD-ao' // Required. Telegram Bot API token.
// });
// bot.on(['/start', '/hello'], (msg) => {
//     console.log('CUKA');
//     msg.reply.text('Welcome!')
// });

// var TelegramBot = require('node-telegram-bot-api');
//
// // Устанавливаем токен, который выдавал нам бот.
// var token = '760527860:AAGqAnqcL7_EPUwNMkmcYwkthDNSipqD-ao';
//
// // Включить опрос сервера
// var bot = new TelegramBot(token, {polling: true});

// bot.on('message', (msg) => {
//     bot.sendMessage(msg.chat.id, `Ill have the tuna. No crust. ${msg.chat.id}`);
// });

bot.onText(/\/hello/, function (msg) {
    bot.sendMessage(msg.chat.id, 'Добро пожаловать в Решатель-бот', {
        reply_markup: {
            inline_keyboard: [[
                {
                    text: 'Регистрация',
                    callback_data: 'registry'
                }
            ]]
        }
    });
});

bot.on("polling_error", (err) => console.log(err));

bot.on("callback_query", (callbackQuery) => {
    const data = callbackQuery.data;

    if (data === 'registry') {
        bot.sendMessage(callbackQuery.message.chat.id, 'Кто вы?', {
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: 'Родитель',
                        callback_data: 'parent'
                    },
                    {
                        text: 'Учитель',
                        callback_data: 'teacher'
                    },
                    {
                        text: 'Ученик',
                        callback_data: 'learner'
                    }
                ]]
            }
        });
    }

    if (data === 'teacher') {
        bot.sendMessage(callbackQuery.message.chat.id, 'Введите ваш логин в системе');
        let lala = bot.on('message', (event) => {
            db.addTgToDatabase('teacher', event.chat.id, event.text.toString())
                .then(function (user) {
                    if(!user) {
                        bot.sendMessage(event.chat.id, `Пользователь с таким логином не найден! Попробуйте еще раз!`);

                        return ;
                    }
                    bot.sendMessage(event.chat.id, `Добро пожаловать, ${user.name} ${user.lastname}`);
                })
                .catch(function (error) {
                    // Handle Errors here.
                    var errorCode = error.code;
                    var errorMessage = error.message;
                    // ...
                });

        });
    }

    if (data === 'learner') {
        bot.sendMessage(callbackQuery.message.chat.id, 'Введите ваш логин в системе');
        let lala = bot.on('message', (event) => {
            db.addTgToDatabase('learner', event.chat.id, event.text.toString())
                .then(function (user) {
                    if(!user) {
                        bot.sendMessage(event.chat.id, `Пользователь с таким логином не найден! Попробуйте еще раз!`);

                        return ;
                    }
                    bot.sendMessage(event.chat.id, `Добро пожаловать, ${user.name} ${user.lastname}!`);
                })
                .catch(function (error) {
                    var errorCode = error.code;
                    var errorMessage = error.message;
                    // ...
                });
        });
    }

    if (data === 'parent') {
        bot.sendMessage(callbackQuery.message.chat.id, 'Введите логин вашего ребенка в системе');
        let lala = bot.on('message', (event) => {
            const data = db.addTgToDatabase('parent', event.chat.id, event.text.toString())
                .then(function(user) {
                    if(!user) {
                        bot.sendMessage(event.chat.id, `Пользователь с таким логином не найден! Попробуйте еще раз!`);
                        return ;
                    }
                    bot.sendMessage(event.chat.id, `Добро пожаловать, ${user.name} ${user.lastname}`);
                })
                .catch(function(error) {
                    // Handle Errors here.
                    var errorCode = error.code;
                    var errorMessage = error.message;
                    // ...
                });
        });
    }
});

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(lessMiddleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/tasks', db.getTasks);
app.post('/signinUser', db.signinUser);
app.post('/isExists', db.isExists);
app.get('/generate_uid', db.generateUID);
app.post('/signupUser', db.signupUser);
app.get('/getSections', db.getSections);
app.get('/getMaximumTasks', db.getMaximumTasks);
app.post('/getLearners', db.getLearners);
app.post('/getDoneWorks', db.getDoneWorks);
app.post('/getTasksFromWork', db.getTasksFromWork);
app.post('/submitWork', db.submitWork);
app.post('/addLearner', db.addLearner);
app.post('/getNotDoneWorks', db.getNotDoneWorks);
app.post('/createWork', db.createWork);
app.post('/createTask', db.createTask);
app.use('/', indexRouter);


// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

const port = 8000;
app.listen(port, () => {
    console.log('We are live on ' + port);
});


app.use(function (req, res, next) {
    next(createError(404));
});

module.exports = app;
