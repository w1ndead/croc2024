from flask import Flask
from flask import request
from flask import render_template
from datetime import datetime
import random
from flask_socketio import SocketIO
from flask_socketio import emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

sid_1 = ''
sid_2 = ''

@socketio.on('on_ice_candidate')
def on_ice_candidate(data):
    sid = request.sid
    ice = data['ice']
    print('recieved ice candidate from ' + str(sid))
    if sid == sid_1:
        emit('ice_candidate_recieved', {'ice': ice}, to=sid_2)
    else:
        emit('ice_candidate_recieved', {'ice': ice}, to=sid_1)

@socketio.on('on_create_offer_success')
def on_create_offer_success(data):
    global sid_1, sid_2
    sid = request.sid
    offer = data['offer']
    print('recieved offer')
    emit('offer_recieved', {'offer': offer}, to=sid_2)

@socketio.on('on_answer_create_success')
def on_answer_create_success(data):
    global sid_1, sid_2
    sid = request.sid
    answer = data['answer']
    print('recieved answer')
    emit('answer_recieved', {'answer': answer}, to=sid_1)

@socketio.on('user_joined')
def on_user_joined(data):
    global sid_1, sid_2
    sid = request.sid
    if sid_1 == '':
        print('user connected: ' + str(sid) + ', sid_1')
        sid_1 = sid
        emit('offerer_was_decided', {'is_offering': True}, to=sid)
    else:
        print('user connected: ' + str(sid) + ', sid_2')
        sid_2 = sid
        emit('offerer_was_decided', {'is_offering': False}, to=sid)

@app.route('/')
def main(): return render_template('main.html')

if __name__ == '__main__':
    print('SERVER IS RUNNING 😎')
    socketio.run(app, debug=True, port=5000, host='192.168.172.200')
    # socketio.run(app, debug=True, port=5000)