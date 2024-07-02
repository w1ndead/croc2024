const socket = io();

const player = function() {
    let room = get_get_parameter('room');
    let xhr = send_and_get_xhr('POST', '/check_if_host', {'room': room, 'user_id': get_cookie('user_id')});
    let username = xhr.response.split(',')[0];
    let if_host = xhr.response.split(',')[1];
    
    if (if_host == 'true') {
        add_host_html();
    }
    
    socket.emit('user_requested_joining', {'room': room, 'username': username});
    
    socket.on('user_joined', function(data) {
        add_user_to_waiting_list(data['username'])
    });
    
    socket.on('user_join_request_was_confirmed', function(data) {
        document.getElementsByClassName('info')[0].innerHTML = '';
    });
    
    socket.on('user_join_request_was_declined', function(data) {
        window.location.replace('/?msg=request_declined')
    });
    
    if (if_host == 'true') {
        socket.on('user_sent_join_request', function(data) {
            add_user_to_request_list(data['username'], data['user_sid'], room)
        });
    }
    
    send_xhr(
        'POST',
        '/get_waiting_users_by_room',
        {
            'room': room
        },
        function(xhr) {
            if (xhr.status != 200) {
                console.log(xhr.status);
            } else {
                console.log(xhr.response)
                for (let user of xhr.response.users) {
                    add_user_to_waiting_list(user.username)
                }
            }
        }
    );
}

const add_user_to_request_list = function(username, sid, room) {
    document.getElementById('requests').
    innerHTML += `
        <tr sid="${sid}">
            <th scope="row">Заявка ${username}</th>
            <td><button class="confirm" sid="${sid}">✅</button></td>
            <td><button class="decline" sid="${sid}">❌</button></td>
        </tr>
    `;
    document.querySelector(`[sid="${sid}"][class="confirm"]`).
    addEventListener('click', () => {
        socket.emit('join_request_confirmed', {'user_sid': sid, 'room': room});
        let el = document.querySelector(`tr[sid="${sid}"]`);
        el.remove();
    });
    document.querySelector(`[sid="${sid}"][class="decline"]`).
    addEventListener('click', () => {
        socket.emit('join_request_declined', {'user_sid': sid, 'room': room});
        let el = document.querySelector(`tr[sid="${sid}"]`);
        el.remove();
    });
}

const add_user_to_waiting_list = function(username) {
    document.getElementById('players_waiting').innerHTML += `
        <tr>
            <th scope="row">${username}</th>
        </tr>
    `
}

const add_host_html = function() {
    document.getElementsByClassName('info')[0].innerHTML = '';
    let body = document.getElementsByTagName('body')[0];
    body.innerHTML += `
        <button class="start">Начать игру</button>
        <button class="settings">⚙️</button>
        <table class="applications">
            <tbody id="requests">
            </tbody>
        </table>
    `;
}

const show_room = function(room) {
    document.getElementById('join-div').innerHTML = '';
    document.getElementById('room').innerHTML = `
        <div class="esh">
            <div class="frst-row">
                <div class="frstcam"><p class="user-label" id="player-9">не подключен</p><video id="video-9" autoplay></video></div>
                <div class="frstcam"><p class="user-label" id="player-10">не подключен</p><video id="video-10" autoplay></video></div>
                <div class="frstcam"><p class="user-label" id="player-1">не подключен</p><video id="video-1" autoplay></video></div>
                <div class="frstcam"><p class="user-label" id="player-2">не подключен</p><video id="video-2" autoplay></video></div>
            </div>
            <div class="scnd-row">
                <div class="frstcam"><p class="user-label" id="player-8">не подключен</p><video id="video-8" autoplay></video></div>
                <div class="scndcam"><p class="user-label" id="player-3">не подключен</p><video id="video-3" autoplay></video></div>
            </div>
            <div class="thrd-row">
                <div class="frstcam"><p class="user-label" id="player-7">не подключен</p><video id="video-7" autoplay></video></div>
                <div class="frstcam"><p class="user-label" id="player-6">не подключен</p><video id="video-6" autoplay></video></div>
                <div class="frstcam"><p class="user-label" id="player-5">не подключен</p><video id="video-5" autoplay></video></div>
                <div class="frstcam"><p class="user-label" id="player-4">не подключен</p><video id="video-4" autoplay></video></div>
            </div>
        </div>
        <div class="leave">
            <button id="leave-btn">
                Выйти из игры
            </button>
        </div>
    `;
    send_xhr(
        'POST',
        '/get_users_by_room',
        {
            'room': room
        },
        function(xhr) {
            if (xhr.status == 400) {
                document.write(xhr.response.error);
            } else if (xhr.status == 200) {
                console.log('users:' + xhr.response.users);
                for (let i in xhr.response.users) {
                    add_user(xhr.response.users[i], parseInt(i) + 1);
                }
            }
        }
    );
}

const send_xhr = function(method, addr, data, handler) {
    let xhr = new XMLHttpRequest();
    xhr.open(method, addr);
    xhr.responseType = "json";
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = () => {
        handler(xhr);
    };
    xhr.send(JSON.stringify(data));
}

const send_and_get_xhr = function(method, addr, data) {
    let xhr = new XMLHttpRequest();
    xhr.open(method, addr, false);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(data));
    return xhr;
}

const get_get_parameter = function(parameterName) {
    let result = null,
    tmp = [];
    location.search
            .substr(1)
            .split("&")
            .forEach(function (item) {
            tmp = item.split("=");
            if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
        });
    return result;
}

const get_cookie = function(name) {
    if (document.cookie.length > 0) {
        start = document.cookie.indexOf(name + "=");
        if (start != -1) {
            start = start + name.length + 1;
            end = document.cookie.indexOf(";", start);
            if (end == -1) {
                end = document.cookie.length;
            }
            return document.cookie.substring(start, end);
        }
    }
    return "no_cookie";
}

socket.on('connect', () => {
    console.log(socket.id);
});

if (get_get_parameter('t') == 'player') {
    player()
} else if (get_get_parameter('t') == 'spectator') {
    spectator()
}
        