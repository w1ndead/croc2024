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

document.getElementById("create_room_btn").addEventListener("click", () => {
    send_xhr('POST', '/check_if_loggined_create_room_btn',
        {},
        function(xhr) {
            if (xhr.status == 200) {
                window.location.replace('/create_room');
            } else {
                document.getElementById('error-message').innerHTML = xhr.response.error;
            }
        }
    );
});