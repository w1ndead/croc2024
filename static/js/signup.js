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

document.getElementById("signup-btn").addEventListener("click", () => {
    let username = document.getElementById('username').value;
    let email = document.getElementById('email').value;
    let password = document.getElementById('password').value;
    let repeat_password = document.getElementById('repeat-password').value;
    send_xhr('POST', '/signup_user',
        {
            'username': username,
            'email' : email,
            'password' : password,
            'repeat_password' : repeat_password
        },
        function(xhr) {
            console.log(xhr.status)
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