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
send_xhr('POST', '/check_if_user_logged',
    {},
    function(xhr) {
        html = ``;
        console.log(xhr.response.check)
        if (xhr.response.check) {
            html += `
            <p class="username">${xhr.response.username}</p>
            <a href="/logout_btn" class="button-container"><button class="button">Выйти из аккаунта</button></a>`;
        } else {
            html += `
            <a href="/login" class="barak">Вход</a>
            <a href="/signup"><button class="button">Регистрация</button></a>`;
        }
        document.getElementById("profile").innerHTML = html;
    }
);