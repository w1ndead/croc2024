function send_xhr(method, addr, data, handler){
    let xhr = new XMLHttpRequest();
    xhr.open(method, addr);
    xhr.responseType = "json";
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = () => {
        handler(xhr);
    };
    xhr.send(JSON.stringify(data));
}

document.getElementById("create_room-btn").addEventListener("click", () => {
    let room_name = document.getElementById('room_name').value;
    let master = document.getElementById('master').value;
    let privacy = document.getElementById('privacy').value;
    send_xhr('POST', '/create_room',
        {
            'room_name': room_name,
            'master': master,
            'privacy': privacy
        },
        function(xhr) {
            if (xhr.status == 200) {
                window.location.replace('/room?room=' + room_name + '&t=player');
            } else {
                document.getElementById('error-message').innerHTML = xhr.response.error;
            }
        }
    );
});