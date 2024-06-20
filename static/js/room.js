const socket = io();

const player = function() {
    let username = '';
    let room = get_get_parameter('room');
    let is_host = false;
    let has_game_started = false;
    let xhr = new XMLHttpRequest();
    xhr.open('POST', '/check_if_host');
    xhr.responseType = "json";
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = () => {
        username = xhr.response.username;
        is_host = xhr.response.is_host;
    };
    xhr.send(JSON.stringify({'room': room, 'user_id': get_cookie('user_id')}));
    console.log(username);
}

const spectator = function() {
    
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

const add_user = function(name, index) {
    let id = 'player-' + index;
    document.getElementById(id).innerHTML = name;
}
    
const remove_user = function(index) {
    let id = 'player-' + index;
    document.getElementById(id).innerHTML = '';
}

const send_xhr = function(method, addr, data, handler){
    let xhr = new XMLHttpRequest();
    xhr.open(method, addr);
    xhr.responseType = "json";
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = () => {
        handler(xhr);
    };
    xhr.send(JSON.stringify(data));
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
        