from flask import Flask
from flask import render_template

app = Flask(__name__)

@app.route('/')
def main():
    return render_template('main.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/register')
def register():
    return render_template('register.html')

@app.route('/create_room')
def create_room():
    return render_template('create_room.html')

@app.route('/room')
def room():
    return render_template('room.html')

if __name__ == '__main__':
    app.run()