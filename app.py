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
        'users': {
            0: 'down',
            1: '',
            2: '',
            3: '',
            4: '',
            5: '',
            6: '',
            7: '',
            8: '',
            9: ''
        },
        'user_sids': {
            0: '',
            1: '',
            2: '',
            3: '',
            4: '',
            5: '',
            6: '',
            7: '',
            8: '',
            9: ''
        },
        'spectators': [],
        'settings': {
            'id': 0,
            'master': '',
            'status': 'не начато',
            'host': 'tim',
            'privacy_status': 'открытая'
        }
    }
}

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

@app.route('/create')
def create_room():
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

@socketio.on('user_joined')
def on_user_joined(data):
    print('user joined: ' + str(data))
    index = 0
    for i in range(10):
        if rooms[data['room']]['users'][i] == '':
            rooms[data['room']]['users'][i] = data['name']
            rooms[data['room']]['user_sids'][i] = request.sid
            index = i
            break
    print(rooms)
    join_room(data['room'])
    emit('user_connected_to_room', {'name': data['name'], 'index': index}, to=data['room'])

@socketio.on('disconnect')
def on_diconnect():
    print('user left: ' + request.sid)
    index = 0
    room_ = ''
    name = ''
    for room in rooms.keys():
        for i in range(10):
            if rooms[room]['user_sids'][i] == request.sid:
                rooms[room]['users'][i] = ''
                rooms[room]['user_sids'][i] = ''
                room_ = room
                index = i
                break
        if name != '':
            break
    print(rooms)
    emit('user_disconnected_from_room', {'name': name, 'index': index}, to=room_)

@app.route('/get_users_by_room', methods=['POST'])
def get_users_by_room():
    recieved_data = request.json
    if recieved_data['room'] not in rooms.keys():
        return jsonify({'error': 'room_not_found'}), 400
    else:
        return jsonify({'users': rooms[recieved_data['room']]['users']}), 200

@app.route('/room')
def page_room():
    return render_template('room.html')

if __name__ == '__main__':
    print('SERVER IS RUNNING 😎')
    # socketio.run(app, debug=True, port=1488, host='192.168.172.200')
    socketio.run(app, debug=True, port=1488)