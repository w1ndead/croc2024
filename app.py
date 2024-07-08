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

sids = []

@socketio.on('on_ice_candidate')
def on_ice_candidate(data):
    sid = request.sid
    ice = data['ice']
    print('recieved ice candidate from ' + str(sid) + ' to ' + data['recipient_sid'])
    emit('ice_candidate_recieved', {'ice': ice, 'sender_sid': sid}, to=data['recipient_sid'])

@socketio.on('on_create_offer_success')
def on_create_offer_success(data):
    global sids
    sid = request.sid
    offer = data['offer']
    print('recieved offer from ' + str(sid) + ' to ' + data['recipient_sid'])
    emit('offer_recieved', {'offer': offer, 'sender_sid': sid}, to=data['recipient_sid'])

@socketio.on('on_answer_create_success')
def on_answer_create_success(data):
    global sids
    sid = request.sid
    answer = data['answer']
    print('recieved answer from ' + str(sid) + ' to ' + data['recipient_sid'])
    emit('answer_recieved', {'answer': answer, 'sender_sid': sid}, to=data['recipient_sid'])

@socketio.on('user_joined')
def on_user_joined(data):
    global sids
    sid = request.sid
    sids.append(sid)

@socketio.on('start_call_request')
def on_start_call(data):
    print('start call request')
    print('sids: ' + str(sids))
    for sid in sids:
        print('sending sids to ' + sid)
        emit('call_started', {'sids': sids}, to=sid)

@app.route('/')
def main(): return render_template('main.html')

if __name__ == '__main__':
    print('SERVER IS RUNNING 😎')
    socketio.run(app, debug=True, port=5000, host='192.168.126.200')
    # socketio.run(app, debug=True, port=5000)