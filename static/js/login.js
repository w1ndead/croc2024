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

document.getElementById("login-btn").addEventListener("click", () => {
    let username = document.getElementById('username').value;
    let password = document.getElementById('password').value;
    send_xhr('POST', '/login_user',
        {
            'username': username,
            'password': password
        },
        function(xhr) {
            if (xhr.status == 200) {
                document.cookie = "user_id=" + xhr.response.user_id + ";";
                document.cookie = "token=" + xhr.response.token + ";";
                window.location.replace('/');
            } else {
                document.getElementById('error-message').innerHTML = xhr.response.error;
            }
        }
    );
});