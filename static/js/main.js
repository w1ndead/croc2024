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

let count_rooms = 0;

send_xhr('POST', '/get_rooms',
    {},
    function(xhr) {
        html = `
        <table class="rooms">
            <thead>
                <tr>
                    <th scope="col">№</th>
                    <th scope="col">Название</th>
                    <th scope="col">Ведущий</th>
                    <th scope="col">Игроки</th>
                    <th scope="col">Зрители</th>
                    <th scope="col">Приватность</th>
                    <th scope="col">Статус</th>
                    <th scope="col"></th>
                    <th scope="col"></th>
                </tr>
            </thead>
            <tbody>`;
        for (const room in xhr.response) {
            count_rooms += 1;
            let master;
            if (xhr.response[room].settings.master == '') {
                master = '-';
            } else {
                master = xhr.response[room].settings.master;
            }
            let count_players = 0;
            for (const user in xhr.response[room].users) {
                if (xhr.response[room].users[user] != "") {
                    count_players += 1;
                }
            }
            html += `
                <tr>
                    <th scope="row">${xhr.response[room].settings.id}</th>
                    <td>${room}</td>
                    <td>${master}</td>
                    <td>${count_players}/10</td>
                    <td>${xhr.response[room].spectators.length}</td>
                    <td>${xhr.response[room].settings.privacy_status}</td>
                    <td>${xhr.response[room].settings.status}</td>
                    <td><button class="enter_btn" id="${room}&t=player">Войти</button></td>
                    <td><button class="view_enter_btn" id="${room}&t=spectator">Войти как зритель</button></td>
                </tr>`;
        }
        html += `
            </tbody>
        </table>`
        document.getElementById('table').innerHTML = html;
        for (let i = 0; i < count_rooms; ++i) {
            document.getElementsByClassName("enter_btn")[i].addEventListener("click", () => {
                send_xhr('POST', '/check_if_loggined_enter_btn',
                    {},
                    function(xhr) {
                        if (xhr.status == 200) {
                            window.location.replace(`/room?room=${document.getElementsByClassName("enter_btn")[i].id}`);
                        } else {
                            document.getElementById('error-message').innerHTML = xhr.response.error;
                        }
                    }
                );
            });
        }
        for (let i = 0; i < count_rooms; ++i) {
            document.getElementsByClassName("view_enter_btn")[i].addEventListener("click", () => {
                send_xhr('POST', '/check_if_loggined_enter_btn',
                    {},
                    function(xhr) {
                        if (xhr.status == 200) {
                            window.location.replace(`/room?room=${document.getElementsByClassName("view_enter_btn")[i].id}`);
                        } else {
                            document.getElementById('error-message').innerHTML = xhr.response.error;
                        }
                    }
                );
            });
        }
    }
);

document.getElementById("create_room_btn").addEventListener("click", () => {
    send_xhr('POST', '/check_if_loggined_create_room_btn',
        {},
        function(xhr) {
            if (xhr.status == 200) {
                window.location.replace('/create');
            } else {
                document.getElementById('error-message').innerHTML = xhr.response.error;
            }
        }
    );
});