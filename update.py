from app import db, app
from app import User, Session

with app.app_context():
    db.drop_all()
    db.create_all()