var express = require("express")
var auth = require("http-auth");
var basic = auth.basic({
    realm: "Private Area.",
    file: __dirname + "/htpasswd"
});

var app = express();
app.use(auth.connect(basic));
var config = require('./config');
var http = require('http');
var server = http.Server(app)
var io = require("socket.io").listen(server);
var bodyParser = require('body-parser')
var request = require("request");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
// var util = require('util')
var count = 0;
var players = [];
var winners = [];
var emails = [];
var codes = [];
app.use('/favicon.ico', express.static('images/fnx-favicon.png'));
app.use('/images/fnx-app.jpg', express.static('images/fnx-app.jpg'));
app.use('/images/apple-watch.jpg', express.static('images/apple-watch.jpg'));
app.use('/images/qr-code.png', express.static('images/qr-code.png'));
app.use('/images/iphonex.png', express.static('images/iphonex.png'));
app.use('/images/amazfit-bip.jpg', express.static('images/amazfit-bip.jpg'));
app.use('/images/mi-band-4.jpg', express.static('images/mi-band-4.jpg'));
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
    res.sendFile(__dirname + '/game.html');
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

app.post("/confirm", async (req, res) => {
    io.emit('confirm winner', {});
    res.send('Confirmed!');

});

app.get("/app", async (req, res) => {
    res.send(false);
});


function get_prize() {
    var index = get_random_index(codes);
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
                    io.emit('refresh players', new_player);
                }
            });
            if (refresh_count) {
                io.emit('refresh count', players.length);
            }
        } else {
            console.log("error");
            io.emit('error');
        }
    });
}, 100);


/*  This is auto initiated event when Client connects.  */
io.on('connection', function (socket) {
    console.log("A user is connected");
    get_player_data_from_api(function (res) {
        if (res) {
            players = res;
            players.forEach(function (player) {
                emails.push(player.email)
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
server.listen(9999, function () {
    console.log("Listening on 9999");
});
