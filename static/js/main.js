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

// let xhr = new XMLHttpRequest();
// xhr.open('GET', 'http://192.168.172.200:1489/get_rooms', true);
// xhr.withCredentials = false;
// xhr.responseType = "json";
// xhr.setRequestHeader("Content-Type", "application/json");
// xhr.setRequestHeader('Access-Control-Allow-Origin', '*')
// xhr.onload = () => {
//     let rooms = xhr.response;
//     for (const key in rooms) {
//         console.log(key + ':', rooms[key]);
//     }
// };
// xhr.send(JSON.stringify({}));

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