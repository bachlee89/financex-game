function hide4DigitsEmail(email) {
    var email_arr = email.split('@');
    var email = email_arr[0].substring(0, email_arr[0].length - 4) + '****' + '@' + email_arr[1]
    return email
}


$(document).ready(function () {
    var socket = io();
    var $start = $("button.btn-start-game");
    var $play = $("button.play");
    var $confirm = $("button.swal2-confirm")
    var started = false;
    var confirmed = false;
    $start.on("click", function () {
        started = true;
        $.post('/start', {})
    });
    $play.on("click", function () {
        $.post('/play', {type: $(this).val()})
    });
    socket.on('start game', function (data) {
        if (!started) {
            $start.click();
        }
        $start.attr("disabled", true);
    });

    socket.on('confirm winner', function (data) {
        if (!confirmed) {
            confirmed = true;
            $confirm.click();
            $confirm.attr("disabled", true);
        }
    });

    socket.on('update prize', function (data) {
        var prize = $('.prize .' + data.type);
        var button = $('button.' + data.type);
        button.attr("disabled", true);
        prize.text(data.code)
        if (data.type == 'jackpot') {
            prize.scramble(40000, 20, "alphabet", true, update_winners, data);
        }
        else {
            prize.scramble(5000, 20, "alphabet", true, update_winners, data);
        }
    });

    var update_winners = function (winner) {
        confirmed = false;
        var prize = {
            jackpot: "Jackpot 1 -  Apple Watch",
            first: "Jackpot 2 - Amzfit Bip ",
            second: "Jackpot 3 - Miband 4",
        }
        Swal.fire(
            'Xin chúc mừng <br />' + hide4DigitsEmail(winner.email) + '!',
            'Đã trúng giải ' + prize[winner.type] + '!',
            'success'
        )
        $confirm = $("button.swal2-confirm")
        $confirm.on("click", function () {
            $.post('/confirm', {})
        });
    }


    // Only visible play button on Ipad
    var is_iPad = navigator.userAgent.match(/iPad/i) != null;
    if (!is_iPad) {
        // $play.hide();
        // $('.jackpot.gift').css('padding-top', '50px');
    }
});


