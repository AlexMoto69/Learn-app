from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.user import User

friends_bp = Blueprint('friends', __name__)


@friends_bp.route('/search', methods=['GET'])
@jwt_required()
def search_users():
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify({'msg': 'q param required'}), 400

    # simple search by username or email (case-insensitive)
    users = User.query.filter(db.or_(
        User.username.ilike(f"%{q}%"),
        User.email.ilike(f"%{q}%")
    )).limit(20).all()

    return jsonify([u.to_dict(public=True) for u in users]), 200


@friends_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_public(user_id):
    u = User.query.get(user_id)
    if not u:
        return jsonify({'msg': 'user not found'}), 404
    return jsonify(u.to_dict(public=True)), 200


@friends_bp.route('/add', methods=['POST'])
@jwt_required()
def add_friend():
    body = request.get_json(silent=True) or {}
    friend_id = body.get('friend_id')
    if not friend_id:
        return jsonify({'msg': 'friend_id required'}), 400

    me_id = int(get_jwt_identity())
    if me_id == int(friend_id):
        return jsonify({'msg': "can't add yourself"}), 400

    me = User.query.get(me_id)
    other = User.query.get(friend_id)
    if not other:
        return jsonify({'msg': 'user not found'}), 404

    # add mutual friendship if not exists
    if other not in me.friends:
        me.friends.append(other)
    if me not in other.friends:
        other.friends.append(me)

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'failed to add friend', 'error': str(e)}), 500

    return jsonify({'msg': 'friend added', 'friend_id': int(friend_id)}), 200


@friends_bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required()
def remove_friend(user_id):
    me_id = int(get_jwt_identity())
    me = User.query.get(me_id)
    other = User.query.get(user_id)
    if not other:
        return jsonify({'msg': 'user not found'}), 404

    try:
        if other in me.friends:
            me.friends.remove(other)
        if me in other.friends:
            other.friends.remove(me)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'failed to remove friend', 'error': str(e)}), 500

    return jsonify({'msg': 'friend removed', 'friend_id': user_id}), 200


@friends_bp.route('/list', methods=['GET'])
@jwt_required()
def list_friends():
    me_id = int(get_jwt_identity())
    me = User.query.get(me_id)
    friends = me.friends.all() if hasattr(me.friends, 'all') else list(me.friends)
    return jsonify([u.to_dict(public=True) for u in friends]), 200


@friends_bp.route('/stats', methods=['GET'])
@jwt_required()
def friends_stats():
    """Return statistics for the current user's friends.
    Response JSON:
    {
      "count": <number of friends>,
      "friends": [ {id, username, total_score, current_streak, completed_modules_count, modules_progress}, ... ],
      "summary": { "avg_score": <float>, "top_score": <int>, "top_user_id": <id> }
    }
    """
    me_id = int(get_jwt_identity())
    me = User.query.get(me_id)
    if not me:
        return jsonify({'msg': 'user not found'}), 404

    # fetch friends list (support both dynamic and list relationships)
    friends_q = me.friends.all() if hasattr(me.friends, 'all') else list(me.friends)

    friends_stats = []
    total_score_sum = 0
    top_score = None
    top_user_id = None

    for u in friends_q:
        # safe parse modules_progress and completed_modules
        data = u.to_dict(public=True)
        modules_progress = data.get('modules_progress', {}) or {}
        completed = data.get('completed_modules', []) or []
        completed_count = len(completed)

        score = data.get('total_score', 0) or 0
        total_score_sum += score
        if top_score is None or score > top_score:
            top_score = score
            top_user_id = data.get('id')

        friends_stats.append({
            'id': data.get('id'),
            'username': data.get('username'),
            'total_score': score,
            'current_streak': data.get('current_streak', 0),
            'completed_modules_count': completed_count,
            'modules_progress': modules_progress
        })

    count = len(friends_stats)
    avg_score = (total_score_sum / count) if count else 0

    return jsonify({
        'count': count,
        'friends': friends_stats,
        'summary': {
            'avg_score': avg_score,
            'top_score': top_score or 0,
            'top_user_id': top_user_id
        }
    }), 200
