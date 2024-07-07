from flask import Flask
from flask import render_template
from flask import jsonify
from flask import request
from flask import make_response
from flask import redirect
from flask import flash
from flask import abort
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from datetime import timezone
from datetime import timedelta
import random
from flask_socketio import SocketIO
from flask_socketio import join_room
from flask_socketio import leave_room
from flask_socketio import send
from flask_socketio import emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

db_name = 'data.db'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + db_name
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = True
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(25), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(25), nullable=False)

    def __repr__(self):
        return '<User %r>' % self.id

class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer)
    token = db.Column(db.String(30), nullable=False)

    def __repr__(self):
        return '<Session %r>' % self.id

rooms = {
    'stariy_bog': {
        'users_waiting': [], # {'username', 'user_sid'}
        'user_join_requests': [], # {'username', 'user_sid'}
        'users': { # {'username', 'user_sid', 'role', 'is_alive'}
            1: '',
            2: '',
            3: '',
            4: '',
            5: '',
            6: '',
            7: '',
            8: '',
            9: '',
            10: ''
        },
        'spectators': [], # {'username', 'user_sid'}
        'settings': {
            'id': 0,
            'master': '',
            'master_sid': '',
            'master_exists': True,
            'status': 'не начато',
            'host': 'tim',
            'privacy_status': 'закрытая'
        }
    }
}
room_by_user_sids = {}

@app.route('/get_rooms', methods=['GET', 'POST'])
def get_rooms():
    if (request.method == "GET"):
        abort(404)
    return jsonify(rooms)

@app.route('/check_if_loggined_create_room_btn', methods=['GET', 'POST'])
def check_if_loggined_create_room_btn():
    if (request.method == "GET"):
        abort(404)
    if check_cookies():
        data = {}
        return jsonify(data), 200
    else:
        data = {
            'error' : '!Вы не авторизованы!'
        }
        return jsonify(data), 400

@app.route('/create_room_btn', methods=['GET', 'POST'])
def create_room_btn():
    if (request.method == "GET"):
        abort(404)
    rec_data = request.json
    room_name = rec_data['room_name']
    master = rec_data['master']
    privacy = rec_data['privacy']
    if (len(room_name) < 3):
        data = {
            'error' : 'Название комнаты очень короткое'
        }
        return jsonify(data), 400
    if (len(room_name) > 25):
        data = {
            'error' : 'Название комнаты слишком длинное'
        }
        return jsonify(data), 400
    print(room_name, master, privacy)
    data = {
        'room_name' : room_name,
        'host' : master,
        'privacy' : privacy
    }
    return jsonify(data), 200

@app.route('/logout_btn', methods=['GET', 'POST'])
def logout_btn():
    if (not check_cookies()):
        abort(404)
    user_id = request.cookies.get('user_id')
    delete = Session.query.filter_by(user_id=user_id).all()
    for i in delete:
        db.session.delete(i)
    db.session.commit()
    cookie = make_response(redirect("/"))
    cookie.set_cookie('user_id', 'delete', max_age=0)
    cookie.set_cookie('token', 'delete', max_age=0)
    return cookie

@app.route('/check_if_user_logged', methods=['GET', 'POST'])
def check_if_user_logged():
    if (request.method == "GET"):
        abort(404)
    if check_cookies(): 
        user_id = request.cookies.get('user_id')
        username = User.query.filter_by(id=user_id).first()
        username = username.username
        data = {
            'check' : 1,
            'username' : username
        }
    else:
        data = {
            'check' : 0,
            'username' : None 
        }
    return jsonify(data)

@app.route('/signup_user', methods=['GET', 'POST'])
def signup_user():
    def used_username(username):
        check_user = User.query.filter_by(username=username).all()
        if (len(check_user) > 0):
            return False
        else:
            return True
    def used_email(email):
        check_email = User.query.filter_by(email=email).all()
        if (len(check_email) > 0):
            return False
        else:
            return True
    def generate_token():
        res = ''
        for i in range(30):
            char = chr(random.randint(33, 125))
            while (char == ';' or char == '"' or char == "'" or char == "\\"):
                char = chr(random.randint(33, 125))
            res += char
        return res
    if (request.method == "GET"):
        abort(404)
    rec_data = request.json
    username = rec_data['username']
    email = rec_data['email']
    password = rec_data['password']
    repeat_password = rec_data['repeat_password']
    if (len(username) < 3):
        data = {
            'error' : 'Никнейм очень короткий'
        }
        return jsonify(data), 400
    if (len(username) > 25):
        data = {
            'error' : 'Никнейм слишком длинный'
        }
        return jsonify(data), 400
    if (len(password) < 5):
        data = {
            'error' : 'Пароль очень короткий'
        }
        return jsonify(data), 400
    if (len(password) > 25):
        data = {
            'error' : 'Пароль слишком длинный'
        }
        return jsonify(data), 400
    if (not used_username(username)):
        data = {
            'error' : 'Никнейм уже использован'
        }
        return jsonify(data), 400
    if (not used_email(email)):
        data = {
            'error' : 'Почта уже использована'
        }
        return jsonify(data), 400
    if (password != repeat_password):
        data = {
            'error' : 'Пароли не совпадают'
        }
        return jsonify(data), 400
    new_user = User(username=username, email=email, password=password)
    db.session.add(new_user)
    db.session.commit()
    user_id = User.query.filter_by(username=username).first().id
    sessions = Session.query.filter_by(user_id=user_id).all()
    if (len(sessions) > 0):
        for session in sessions:
            db.session.delete(session)
        db.session.commit()
    token = generate_token()
    session = Session(user_id=user_id, token=token)
    db.session.add(session)
    db.session.commit()
    data = {
        'user_id' : user_id,
        'email' : email,
        'password' : password,
        'token' : token
    }
    return jsonify(data), 200

@app.route('/login_user', methods=['GET', 'POST'])
def login_user():
    if (request.method == "GET"):
        abort(404)
    def check_username(username):
        user = User.query.filter_by(username=username).first()
        if user is None:
            return None
        else:
            return user.id
    def check_password(username, password):
        user = User.query.filter_by(username=username).first()
        return password == user.password
    def generate_token():
        res = ''
        for i in range(30):
            char = chr(random.randint(33, 125))
            while (char == ';' or char == '"' or char == "'" or char == "\\"):
                char = chr(random.randint(33, 125))
            res += char
        return res
    rec_data = request.json
    username = rec_data['username']
    password = rec_data['password']
    if (check_username(username) == None):
        data = {
            'error': 'Никнейм не найден'
        }
        return jsonify(data), 400
    if (not check_password(username, password)):
        data = {
            'error': 'Неправильный пароль'
        }
        return jsonify(data), 400
    user_id = User.query.filter_by(username=username).first().id
    sessions = Session.query.filter_by(user_id=user_id).all()
    if (len(sessions) > 0):
        for session in sessions:
            db.session.delete(session)
        db.session.commit()
    token = generate_token()
    session = Session(user_id=user_id, token=token)
    db.session.add(session)
    db.session.commit()
    data = {
        'user_id': user_id,
        'token': token
    }
    return jsonify(data), 200

@app.route('/signup')
def signup():
    if check_cookies():
        abort(404)
    return render_template("signup.html")

@app.route('/login')
def login():
    if check_cookies():
        abort(404)
    return render_template("login.html")

@app.route('/check_if_loggined_enter_btn', methods=['GET', 'POST'])
def check_if_loggined_enter_btn():
    if (request.method == "GET"):
        abort(404)
    if check_cookies():
        data = {}
        return jsonify(data), 200
    else:
        data = {
            'error' : '!Вы не можете зайти в игру, пока не авторизованы!'
        }
        return jsonify(data), 400

@app.route('/create')
def create():
    if (not check_cookies()):
        return redirect("/")
    return render_template("create_room.html")

@app.route('/room')
def room():
    if (not check_cookies()):
        return redirect("/")
    return render_template("room.html")

@app.route('/')
def main():
    return render_template("main.html")

def check_cookies():
    if request.cookies.get('user_id') and request.cookies.get('token'):
        user_id = request.cookies.get('user_id')
        token = Session.query.filter_by(user_id=user_id).first()
        if token is None:
            return False
        token = token.token
        real_token = request.cookies.get('token')
        if (token == real_token):
            return True
        else:
            return False

@app.route('/create_room', methods=['POST'])
def create_room():
    rec_data = request.json
    print(rec_data)
    if not check_cookies():
        return abort(403)
    if rec_data['room_name'] in rooms.keys():
        return jsonify({'error': 'room_name_exists'}), 400
    if len(rec_data['room_name']) < 3:
        return jsonify({'error': 'too_short_room_name'}), 400
    if len(rec_data['room_name']) > 25:
        return jsonify({'error': 'too_long_room_name'}), 400
    user = User.query.filter_by(id=request.cookies.get('user_id')).first()
    master_exists = False
    if master_exists == 'with_master':
        master_exists = True
    privacy_status = 'открытая'
    if rec_data['privacy'] == 'private':
        privacy_status = 'закрытая'
    rooms[rec_data['room_name']] = {
        'users_waiting': [],
        'users': {
            0: {'username': '', 'user_sid': '', 'role': '', 'is_alive': ''},
            1: {'username': '', 'user_sid': '', 'role': '', 'is_alive': ''},
            2: {'username': '', 'user_sid': '', 'role': '', 'is_alive': ''},
            3: {'username': '', 'user_sid': '', 'role': '', 'is_alive': ''},
            4: {'username': '', 'user_sid': '', 'role': '', 'is_alive': ''},
            5: {'username': '', 'user_sid': '', 'role': '', 'is_alive': ''},
            6: {'username': '', 'user_sid': '', 'role': '', 'is_alive': ''},
            7: {'username': '', 'user_sid': '', 'role': '', 'is_alive': ''},
            8: {'username': '', 'user_sid': '', 'role': '', 'is_alive': ''},
            9: {'username': '', 'user_sid': '', 'role': '', 'is_alive': ''}
        },
        'spectators': [],
        'settings': {
            'id': 0,
            'master': '',
            'master_exists': master_exists,
            'status': 'не начато',
            'host': user.username,
            'privacy_status': privacy_status
        }
    }
    return jsonify({}), 200

@app.route('/check_if_host', methods=['POST'])
def check_if_host():
    if not check_cookies():
        return abort(403)
    rec_data = request.json
    room = rec_data['room']
    user = User.query.filter_by(id=rec_data['user_id']).first()
    if rooms[room]['settings']['host'] == user.username:
        return user.username + ',true'
    else:
        return user.username + ',false'

@socketio.on('start_game_request')
def on_start_game_request(data):
    room = data['room']
    username = data['username']
    sid = data['sid']
    print('start game request from host ' + username + ' (room: ' + room + ')')
    if username != rooms[room]['settings']['host']:
        return
    users_amount_needed = 10
    if rooms[room]['settings']['master_exists']:
        if rooms[room]['settings']['master'] == '':
            print('master required, but not assigned in room ' + room)
            emit('master_not_assigned', {}, to=sid)
        users_amount_needed += 1
    if users_amount_needed != len(rooms[room]['users_waiting']):
        print('incorrect amount of players in room ' + room + '. ' + str(len(rooms[room]['users_waiting'])) + ' instead of ' + str(users_amount_needed))
        emit('incorrect_amount_of_players_in_room', {}, to=sid)
    else:
        users_waiting = rooms[room]['users_waiting'][:]
        rooms[room]['users_waiting'] = []
        for user in users_waiting:
            if user['username'] == rooms[room]['settings']['master']:
                rooms[room]['settings']['master_sid'] = user['user_sid']
                users_waiting.remove(user)
                break
        random.shuffle(users_waiting)
        print(users_waiting)
        # assign roles
        for i in range(1, len(users_waiting) + 1):
            print(i)
            rooms[room]['users'][i] =\
                  {'username': users_waiting[i - 1]['username'], 'user_sid': users_waiting[i - 1]['user_sid'], 'role': 'unassigned', 'alive': True}
        emit('start_game', to=room)
        print('game started, room: ' + room)

@socketio.on('master_change_request_confirmed')
def on_master_change_request_confirmed(data):
    print('master change request was confirmed: ' + str(data))
    print('changing master, new master: ' + data['username'])
    username = data['username']
    room = data['room']
    rooms[room]['settings']['master'] = username
    rooms[room]['settings']['master_sid'] = request.sid
    emit('master_changed', {'new_master_username': username}, to=room)

@socketio.on('user_requested_becoming_master')
def on_user_requested_becoming_master(data):
    print('user requested becoming master: ' + str(data))
    username = data['username']
    room = data['room']
    if username == rooms[room]['settings']['master']:
        print('user ' + username + ' is already master in room ' + room)
        return
    host = rooms[room]['settings']['host']
    host_sid = ''
    for user in rooms[room]['users_waiting']:
        if user['username'] == rooms[room]['settings']['host']:
            host_sid = user['user_sid']
            break
    if host == username:
        rooms[room]['settings']['master'] = username
        rooms[room]['settings']['master_sid'] = host_sid
        print('changing master, new master: ' + data['username'])
        emit('master_changed', {'new_master_username': username}, to=room)
    else:
        emit('master_change_request', {'username': username}, to=host_sid)

@socketio.on('join_request_declined')
def on_join_request_declined(data):
    print('user request was declined: ' + str(data))
    user_sid = data['user_sid']
    room = data['room']
    for i in range(len(rooms[room]['user_join_requests'])):
        if rooms[room]['user_join_requests'][i]['user_sid'] == user_sid:
            rooms[room]['user_join_requests'].pop(i)
            break
    emit('user_join_request_was_declined', {}, to=user_sid)

@socketio.on('join_request_confirmed')
def on_join_request_confirmed(data):
    print('user request was confirmed: ' + str(data))
    user_sid = data['user_sid']
    room = data['room']
    username = ''
    room_by_user_sids[user_sid] = room
    for i in range(len(rooms[room]['user_join_requests'])):
        if rooms[room]['user_join_requests'][i]['user_sid'] == user_sid:
            username = rooms[room]['user_join_requests'][i]['username']
            rooms[room]['user_join_requests'].pop(i)
            break
    rooms[room]['users_waiting'].append({'username': username, 'user_sid': user_sid})
    emit('user_joined', {'username': username, 'user_sid': user_sid, 'master_name': rooms[room]['settings']['master']}, to=room)
    emit('user_join_request_was_confirmed', {}, to=user_sid)

@socketio.on('user_requested_joining')
def on_user_requested_joining(data):
    print('user requested joining: ' + str(data))
    room = data['room']
    username = data['username']
    sid = request.sid
    room_by_user_sids[sid] = room
    if rooms[room]['settings']['privacy_status'] == 'открытая' or username == rooms[room]['settings']['host']:
        rooms[room]['users_waiting'].append({'username': username, 'user_sid': sid})
        join_room(room)
        print('user_joined: ' + str({'username': username, 'user_sid': sid}))
        emit('user_joined', {'username': username, 'user_sid': sid, 'master_name': rooms[room]['settings']['master']}, to=room)
        emit('user_join_request_was_confirmed', {}, to=sid)
    else:
        rooms[room]['user_join_requests'].append({'username': username, 'user_sid': sid})
        join_room(room)
        host_sid = ''
        for user in rooms[room]['users_waiting']:
            if user['username'] == rooms[room]['settings']['host']:
                host_sid = user['user_sid']
                break
            print('user_sent_join_request' + str({'username': username, 'user_sid': sid}))
        emit('user_sent_join_request', {'username': username, 'user_sid': sid}, to=host_sid)

@socketio.on('disconnect')
def on_disconnect():
    print('user disconnected: ' + request.sid)
    room = room_by_user_sids[request.sid]
    host = rooms[room]['settings']['host']
    host_sid = ''
    for user in rooms[room]['users_waiting']:
        if user['username'] == host:
            host_sid = user['user_sid']
            break
    for user in rooms[room]['users_waiting']:
        if user['user_sid'] == request.sid:
            rooms[room]['users_waiting'].remove(user)
            if rooms[room]['settings']['master_sid'] == request.sid:
                print('master of room ' + room + ' disconnected, re-assigning master')
                if len(rooms[room]['users_waiting']) == 0:
                    print('cannot re-assign master, no users left in the room')
                    rooms[room]['settings']['master'] = ''
                    rooms[room]['settings']['master_sid'] = ''
                else:
                    print('re-assigning master, new master: ' + rooms[room]['users_waiting'][0]['username'])
                    rooms[room]['settings']['master'] = rooms[room]['users_waiting'][0]['username']
                    rooms[room]['settings']['master_sid'] = rooms[room]['users_waiting'][0]['user_sid']
                    emit('master_changed', {'new_master_username': rooms[room]['users_waiting'][0]['username']}, to=room)
            if host_sid == request.sid:
                print('host of room ' + room + ' disconnected, re-assigning host')
                if len(rooms[room]['users_waiting']) == 0:
                    print('cannot re-assign host, no users left in the room')
                    rooms[room]['settings']['host'] = ''
                else:
                    print('re-assigning host, new host: ' + rooms[room]['users_waiting'][0]['username'])
                    rooms[room]['settings']['host'] = rooms[room]['users_waiting'][0]['username']
                    emit('you_are_the_host_now', {}, to=rooms[room]['users_waiting'][0]['user_sid'])
            print('removing user ' + request.sid + ' from waiting list')
            emit('waiting_user_was_removed', {'username': user['username']}, to=room)
            break
    for user in rooms[room]['user_join_requests']:
        if user['user_sid'] == request.sid:
            rooms[room]['user_join_requests'].remove(user)
            print('removing user ' + request.sid + ' from request list')
            emit('user_from_requests_was_removed', {'username': user['username']}, to=room)
            break

@app.route('/get_username_by_id', methods=['POST'])
def get_username_by_id():
    rec_data = request.json()
    if not check_cookies(request):
        abort(403)
    user = User.query.filter_by(id=rec_data['id']).first()
    return jsonify({'username': user.username}), 200

@app.route('/get_waiting_users_by_room', methods=['POST'])
def get_users_by_room():
    recieved_data = request.json
    if recieved_data['room'] not in rooms.keys():
        return jsonify({'error': 'room_not_found'}), 400
    else:
        return jsonify({'users': rooms[recieved_data['room']]['users_waiting'], 'master_name': rooms[recieved_data['room']]['settings']['master']}), 200

@app.route('/room')
def page_room():
    return render_template('room.html')

if __name__ == '__main__':
    print('SERVER IS RUNNING 😎')
    # socketio.run(app, debug=True, port=8000, host='192.168.172.200')
    socketio.run(app, debug=True, port=8000)