from flask import Blueprint, current_app, request, jsonify
import jwt
from datetime import datetime, timedelta, timezone
from models.user import User

refresh_bp = Blueprint('auth_refresh', __name__)


def _now():
    return datetime.now(timezone.utc)


def create_access_token(user_id):
    now = _now()
    exp = now + timedelta(seconds=current_app.config.get('ACCESS_EXPIRES_SECONDS', 900))
    payload = {
        'sub': str(user_id),
        'iat': int(now.timestamp()),
        'exp': int(exp.timestamp()),
        'type': 'access'
    }
    return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')


def create_refresh_token(user_id, session_start=None):
    now = _now()
    session_start = session_start or now
    exp = now + timedelta(seconds=current_app.config.get('REFRESH_EXPIRES_SECONDS', 7 * 24 * 3600))
    payload = {
        'sub': str(user_id),
        'iat': int(now.timestamp()),
        'exp': int(exp.timestamp()),
        'type': 'refresh',
        'session_start': int(session_start.timestamp())
    }
    return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')


@refresh_bp.route('/auth/refresh', methods=['POST'])
def refresh_tokens():
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return jsonify({'msg': 'Missing Bearer token'}), 401
    token = auth.split(' ', 1)[1]

    try:
        payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return jsonify({'msg': 'Refresh token expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'msg': 'Invalid token'}), 401

    if payload.get('type') != 'refresh':
        return jsonify({'msg': 'Invalid token type'}), 401

    session_start_ts = payload.get('session_start')
    if session_start_ts is None:
        return jsonify({'msg': 'Malformed refresh token'}), 401

    session_start = datetime.fromtimestamp(session_start_ts, tz=timezone.utc)
    max_session = current_app.config.get('MAX_SESSION_SECONDS', 30 * 24 * 3600)
    if (_now() - session_start) > timedelta(seconds=max_session):
        return jsonify({'msg': 'Session exceeded maximum lifetime, please log in again'}), 401

    user_id = payload.get('sub')
    user = User.query.get(user_id)
    if not user:
        return jsonify({'msg': 'User not found'}), 404

    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id, session_start=session_start)

    return jsonify({'access_token': access_token, 'refresh_token': refresh_token}), 200

