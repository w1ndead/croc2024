String.prototype.trim_zeros = function() {
    return String(this).replace(0, '');
};

const socket = io(); //'http://127.0.0.1:5000');
let name_ = '';
let room = '';


socket.on('connect', () => {
    console.log(socket.id); // x8WIv7-mJelg7on_ALbx
});

socket.on('user_connected_to_room', function(data) {
    console.log('user connected: ' + data['name'] + ' ' + data['index']);
    add_user(data['name'], parseInt(data['index']) + 1);
});

socket.on('user_disconnected_from_room', function(data) {
    console.log('user disconnected: ' + data['name'] + ' ' + data['index']);
    remove_user(parseInt(data['index']) + 1);
});

document.getElementById('join-btn').
addEventListener('click', function(event) {
    event.preventDefault();
    name_ = document.getElementById('name').value;
    room = document.getElementById('room').value;
    show_room(room);
    socket.emit('user_joined', {
        'name': name_,
        'room': room
    });
});

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
};

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

const add_user = function(name, index) {
    let id = 'player-' + index;
    document.getElementById(id).innerHTML = name;
}

const remove_user = function(index) {
    let id = 'player-' + index;
    document.getElementById(id).innerHTML = 'не подключено';
}

const add_video = function() {
    //Initialize video
    const video = document.getElementById('video-1');

    // validate video element
    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
            .getUserMedia({ video: true })
            .then((stream) => {
                video.srcObject = stream;
            })
            .catch(function(error) {
                console.log("Something went wrong!");
            });
    }
}