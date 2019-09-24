$(document).ready(function () {
    var socket = io();
    var $start = $("button.btn-start-game");
    var $play = $("button.play");
    var started = false;
    $start.on("click", function () {
        started = true;
        $.post('/start', {type: $(this).val()})
    });

    $play.on("click", function () {
        $.post('/play', {type: $(this).val()})
    });
    socket.on('start game', function (data) {
        $start.attr("disabled", true);
        if (!started) {
            $start.click();
        }
    });

    socket.on('update prize', function (data) {
        var prize = $('.prize .' + data.type);
        var button = $('button.' + data.type);
        button.attr("disabled", true);
        prize.text(data.code)
        if (data.type == 'jackpot') {
            prize.scramble(40000, 20, "alphabet", true, update_winners);
        }
        else {
            prize.scramble(40000, 20, "alphabet", true, update_winners);
        }
    });
    var update_winners = function () {

    }
});