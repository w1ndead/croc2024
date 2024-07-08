const player = function() {
    console.log('player unction start');
    let room = get_get_parameter('room');
    let xhr = send_and_get_xhr('POST', '/check_if_host', {'room': room, 'user_id': get_cookie('user_id')});
    let username = xhr.response.split(',')[0];
    let if_host = xhr.response.split(',')[1];
    
    if (if_host == 'true') {
        add_host_content(room, username);
    }
    
    socket.emit('user_requested_joining', {'room': room, 'username': username});
    
    socket.on('user_joined', function(data) {
        add_user_to_waiting_list(data['username'], data['master_name'])
    });
    
    socket.on('user_join_request_was_confirmed', function(data) {
        console.log('user join request was confirmed');
        document.getElementsByClassName('info')[0].innerHTML = '';
    });
    
    socket.on('user_join_request_was_declined', function(data) {
        console.log('user join request was declined');
        window.location.replace('/?msg=request_declined')
    });
    
    socket.on('master_changed', function(data) {
        change_master(data['new_master_username']);
    });
    
    document.getElementsByClassName('master-request')[0].
    addEventListener('click', () => {
        console.log('sending master request');
        socket.emit('user_requested_becoming_master', {'username': username, 'room': room, 'sid': socket.id});
    });
    
    socket.on('waiting_user_was_removed', function(data) {
        remove_waiting_user(data['username']);
    });
    
    socket.on('user_from_requests_was_removed', function(data) {
        remove_user_from_requests(data['username']);
    });
    
    socket.on('start_game', function(data) {
        start_game(data, room, username, if_host);
    });
    
    socket.on('you_are_the_host_now', function(data) {
        if_host = 'true'
        console.log('becoming host');
        add_host_content(room, username);
    });
    
    document.getElementById('leave-button').addEventListener('click', leave);
    
    set_local_video();
    
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
                for (let user of xhr.response.users) {
                    let master_name = xhr.response.master_name;
                    add_user_to_waiting_list(user.username, master_name)
                }
            }
        }
    );
}

const leave = function() {
    console.log('leaving the game');
    window.location.replace('/');
}

const remove_waiting_user = function(username) {
    console.log('removing waiting user, username: ' + username);
    let element = document.querySelector(`[class="users_waiting_tr"][username="${username}"]`);
    element.remove();
}

const remove_user_from_requests = function(username) {
    console.log('removing user from requests, user: ' + username);
    let element = document.querySelector(`[class="request_tr"][username="${username}"]`);
    element.remove();
}

const remove_master_request = function(username) {
    let el1 = document.querySelector(`[class="master-confirm-td"][username="${username}"]`);
    if (el1 != null) {
        el1.remove();
    }
    let el2 = document.querySelector(`[class="master-decline-td"][username="${username}"]`);
    if (el2 != null) {
        el2.remove();
    }
}

const add_master_request = function(new_master_username, room) {
    let element = document.querySelector(`[class="users_waiting_tr"][username="${new_master_username}"]`);
    element.innerHTML += `
        <td class="master-confirm-td" username="${new_master_username}"><button class="master-confirm" username="${new_master_username}">✅</button></td>
        <td class="master-decline-td" username="${new_master_username}"><button class="master-decline" username="${new_master_username}">❌</button></td>
    `;
    document.querySelector(`[class="master-confirm"][username="${new_master_username}"]`).
    addEventListener('click', () => {
        socket.emit('master_change_request_confirmed', {'username': new_master_username, 'room': room});
        remove_master_request(new_master_username);
    });
    document.querySelector(`[class="master-decline"][username="${new_master_username}"]`).
    addEventListener('click', () => {
        remove_master_request(new_master_username);
    });
}

const change_master = function(new_master_username) {
    console.log('changing master to ' + new_master_username);
    let elements = document.getElementsByClassName('users_waiting');
    for (let element of elements) {
        element.setAttribute('style', 'color: black');
    }
    let element = document.querySelector(`[class="users_waiting"][username="${new_master_username}"]`);
    element.setAttribute('style', 'color: green');
}

const add_user_to_request_list = function(username, sid, room) {
    document.getElementById('requests').
    innerHTML += `
        <tr class="request_tr" username="${username}" sid="${sid}">
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

const add_user_to_waiting_list = function(username, master_name) {
    document.getElementById('players_waiting').innerHTML += `
        <tr class="users_waiting_tr" username="${username}">
            <th class="users_waiting" scope="row" username="${username}">${username}</th>
        </tr>
    `;
    if (username == master_name) {
        document.querySelector(`[class="users_waiting"][username="${username}"]`).
        setAttribute('style', 'color: green');
    }
}

const add_host_content = function(room, username) {
    console.log('add_host_content function start');
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
    document.getElementsByClassName('start')[0].
    addEventListener('click', () => {
        socket.emit('start_game_request', {'room': room, 'username': username, 'sid': socket.id});
    });
    
    socket.on('master_change_request', function(data) {
        add_master_request(data['username'], room);
    });
    
    socket.on('user_sent_join_request', function(data) {
        add_user_to_request_list(data['username'], data['user_sid'], room)
    });
    
    document.getElementsByClassName('master-request')[0].
    addEventListener('click', () => {
        socket.emit('user_requested_becoming_master', {'username': username, 'room': room, 'sid': socket.id});
    });
}

const set_local_video = async function() { // TODO: not working
    console.log('setting local video');
    const stream = await navigator.mediaDevices.getUserMedia({audio: false, video: true});
    console.log('received local stream');
    const video = document.getElementById('cam');
    video.srcObject = stream;
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
    console.log('connected to socket, sid: ' + socket.id);
});

if (get_get_parameter('t') == 'player') {
    player();
} else if (get_get_parameter('t') == 'spectator') {
    spectator();
}
        