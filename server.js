var express = require("express")
var auth = require("http-auth");
var config = require('./config');
var basic = auth.basic({
    realm: "Private Area.",
    file: __dirname + "/htpasswd"
}, function (username, password, callback) {
    callback(username == config.username && password == config.password);
});
var pool = require('./database');
var questions = require('./questions');
var fnx_questions = require('./fnx_questions');
var app = express();
app.use(auth.connect(basic));
var http = require('http');
var server = http.Server(app)
var io = require("socket.io").listen(server);
var bodyParser = require('body-parser')
var request = require("request");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
var mustacheExpress = require('mustache-express');
app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname);

var util = require('util')
var count = 0;
let players = [];
let winners = [];
let emails = [];
let codes = [];
app.use('/favicon.ico', express.static('images/fnx-favicon.png'));
app.use('/images/fnx-app.jpg', express.static('images/fnx-app.jpg'));
app.use('/images/apple-watch.jpg', express.static('images/apple-watch.jpg'));
app.use('/images/qr-code.png', express.static('images/qr-code.png'));
app.use('/images/demo-game.gif', express.static('images/demo-game.gif'));
app.use('/images/amazfit-bip.jpg', express.static('images/amazfit-bip.jpg'));
app.use('/images/mi-band-4.jpg', express.static('images/mi-band-4.jpg'));

// Questions Images
app.use('/images/questions/question-1.jpg', express.static('images/questions/question-1.jpg'));
app.use('/images/questions/question-2.jpg', express.static('images/questions/question-2.jpg'));
app.use('/images/questions/question-3.jpg', express.static('images/questions/question-3.jpg'));
app.use('/images/questions/question-4.jpg', express.static('images/questions/question-4.jpg'));
app.use('/images/questions/question-5.jpg', express.static('images/questions/question-5.jpg'));
app.use('/images/questions/question-6.jpg', express.static('images/questions/question-6.jpg'));
app.use('/images/questions/question-7.jpg', express.static('images/questions/question-7.jpg'));
app.use('/images/questions/question-8.jpg', express.static('images/questions/question-8.jpg'));
app.use('/images/questions/the-end.jpg', express.static('images/questions/the-end.png'));

app.use('/main.js', express.static('main.js'));
app.use('/dist/descrambler.js', express.static('dist/descrambler.js'));
app.use('/css/style2.css', express.static('css/style2.css'));
app.use('/css/style.css', express.static('css/style.css'));
app.use('/css/style.scss', express.static('css/style.scss'));
app.get("/", function (req, res) {
    res.sendFile(__dirname + '/index.html');
});
app.get("/x-jackpot", function (req, res) {
    res.sendFile(__dirname + '/x-jackpot.html');
});

app.get("/game", function (req, res) {
    res.render('game.html', {hasQuestion: false, yourdata: 'Hello from Mustache Template'});
});

app.get("/financex/:id", function (req, res) {
    var questionNumber = req.params.id - 1;
    var nextQuestion = parseInt(req.params.id) + 1;
    var question = fnx_questions[questionNumber];
    var options = '';
    Object.keys(question.options).forEach(function (k) {
        var extra_class = ''
        if (k == question.answer) {
            extra_class = 'correct';
        }
        options += '<li class="option ' + extra_class + '" id="option_' + k + '">' + question.options[k] + '</li>'
    });
    var params = {
        question: question.question,
        options: options,
        answer: question.options[question.answer],
    }
    if (nextQuestion <= fnx_questions.length) {
        params['next'] = nextQuestion
    }
    res.render('financex.html', params);
});

app.get("/question/:id", function (req, res) {
    var questionNumber = req.params.id - 1;
    var nextQuestion = parseInt(req.params.id) + 1
    var question = questions[questionNumber];
    var answer = '';
    var has_question = !question.theend;
    if (has_question) {
        for (var i = 0; i < question.answer.length; i++) {
            if (question.answer[i] == ' ') {
                answer += '<span class="space">' + question.answer[i] + '</span>';
            } else {
                answer += '<span>' + question.answer[i] + '</span>';
            }
        }
        var suggest = '';
        for (var i = 0; i < question.suggest.length; i++) {
            if (question.suggest[i] == '*') {
                question.suggest[i] = '';
            }
            if (question.suggest[i] == ' ') {
                suggest += '<span class="space">' + question.suggest[i] + '</span>';
            } else {
                suggest += '<span>' + question.suggest[i] + '</span>';
            }
        }
    }
    var params = {
        hasQuestion: !question.theend,
        theEnd: question.theend,
        image: question.image,
        explain: question.explain,
        answer: answer,
        suggest: suggest,
    }
    if (nextQuestion <= questions.length) {
        params['next'] = nextQuestion
    }
    res.render('question.html', params);
});

app.post("/play", async (req, res) => {
    if (codes.length) {
        var type = req.body.type;
        var code = get_prize();
        var email = ''
        players.forEach(function (player) {
            if (player.referralId == code) {
                email = player.email;
            }
        });
        var payload = {prize: type, code: code, email: email, created_at: new Date()}
        set_player_data(payload, function (res) {
            console.log('Saved winner!')
        })
        io.emit('update prize', {type: type, code: code, email: email});
        res.send('Success!');
    }
    else {
        res.send('No player!');
    }

});

app.post("/start", async (req, res) => {
    io.emit('start game', {});
    res.send('Started!');

});

app.post("/answer", async (req, res) => {
    io.emit('answer question', {});
    res.send('Answer!');

});

app.post("/next", async (req, res) => {
    io.emit('next question', {});
    res.send('Started!');

});

app.post("/confirm", async (req, res) => {
    io.emit('confirm winner', {});
    res.send('Confirmed!');

});

app.get("/app", async (req, res) => {
    res.send(false);
});


function get_prize() {
    var index = get_random_index(codes);
    if (winners.length == players.length) {
        winners = []
        return get_prize();
    }
    if (winners.indexOf(index) !== -1) {
        return get_prize();
    }
    winners.push(index);
    var prize = codes[index];
    return prize;
}

function get_random_index(array) {
    return Math.floor(Math.random() * array.length);
}

setInterval(function () {
    count++;
    get_player_data_from_api(function (res) {
        if (res) {
            var refresh_count = false;
            res.forEach(function (element) {
                if (emails.indexOf(element.email) == -1) {
                    var new_player = []
                    new_player.push(element)
                    emails.push(element.email)
                    players.push(new_player)
                    codes.push(element.referralId)
                    refresh_count = true
                    console.log('new players')
                    io.emit('new players', new_player);
                }
            });
            if (refresh_count) {
                console.log('refresh count')
                io.emit('refresh count', players.length);
            }
        } else {
            console.log("error");
            io.emit('error');
        }
    });
}, 500);


/*  This is auto initiated event when Client connects.  */
io.on('connection', function (socket) {
    console.log("A user is connected");
    get_player_data_from_api(function (res) {
        if (res) {
            players = codes = [];
            players = res;
            players.forEach(function (player) {
                emails.push(player.email)
                codes.push(player.referralId)
            });
            console.log("refresh players");
            io.emit('refresh players', players);
            io.emit('refresh count', players.length);
        } else {
            console.log("error");
            io.emit('error');
        }
    });
});

var get_player_data_from_api = function (callback) {

    var apiKey = config.apiKey;
    var url = config.host;
    request.get({
        "headers": {
            'x-token': apiKey,
            "content-type": "application/json"
        },
        "url": url
    }, (error, response, body) => {
        if (error) {
            return console.dir(error);
        }
        var players = JSON.parse(body).source
        callback(players);
    });
}

var set_player_data = function (payload, callback) {
    pool.getConnection(function (err, connection) {
        if (err) {

            callback(false);
            return;
        }
        var query = connection.query("INSERT INTO `players` SET ? ", payload, function (err, result, fields) {
            if (!err) {
                callback(result);
            }
            else {
                console.log(err)
            }
        });
        connection.on('error', function (err) {
            console.log(err)
            callback(false);
        });
        if (connection) {
            connection.release();
        }
    });
    pool.query = util.promisify(pool.query)
}

var get_winners = function (callback) {
    pool.getConnection(function (err, connection) {
        if (err) {
            callback(false);
            return;
        }
        connection.query("SELECT * FROM `winners`", function (err, result, fields) {
            if (!err) {
                callback(result);
            }
        });
        connection.on('error', function (err) {
            callback(false);
        });
        if (connection) {
            connection.release();
        }
    });
    pool.query = util.promisify(pool.query)
}


server.listen(9999,'', function () {
    console.log("Listening on 9999");
});
