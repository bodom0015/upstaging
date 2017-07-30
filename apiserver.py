from flask import Flask, request, jsonify, make_response, send_from_directory, redirect
from flask_cors import CORS, cross_origin
from flask_restful import reqparse, abort, Api, Resource
#from flask_mail import Mail

import jwt

# DEBUG ONLY! Remove in production
from pprint import pprint

from pymongo import MongoClient
from passlib.hash import bcrypt

from bson import ObjectId
from bson.json_util import dumps

import os
import logging
import copy
import json
import uuid
from datetime import datetime, timedelta

import smtplib
from email.mime.text import MIMEText

import ssl
context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
context.load_cert_chain('upstaging.crt', 'upstaging.key')

allowed_user_agents = [
    'Mozilla/5.0 (Linux; Android 6.0; HTC One_M8 Build/MRA58K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.125 Mobile Safari/537.36',                   # Chrome on HTC One M8 (Android)
    'Mozilla/5.0 (Linux; Android 6.0; HTC One_M8 Build/MRA58K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/59.0.3071.125 Mobile Safari/537.36',   # Native App on HTC One M8 (Android)
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36',                                          # Chrome on CIRCE (Desktop)
    'Mozilla/5.0+(compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)',                                                                                       # UptimeRobot (External)
    'Mozilla/5.0 (Linux; Android 7.0; SM-G920T Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.83 Mobile Safari/537.36',                      # Laura's Phone
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.104 Safari/537.36',                                    # Chrome on OSX (work laptop)
    'Mozilla/5.0 (Linux; Android 7.1.2; Pixel XL Build/NJH47B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.83 Mobile Safari/537.36',                    # Brandon's Phone
]

flask_level = logging.INFO
flask_port = os.getenv('FLASK_PORT', 8080)
flask_debug = os.getenv('FLASK_DEBUG', False)
flask_log_format = '%(asctime)s - %(name)s - %(levelname)s: %(message)s'
flask_log_date_format = '%Y-%m-%d (%a) - %I:%M:%S %p'
flask_cors_origin = ['https://slambert.org:8080/upstaging', 'http://localhost:8100']
flask_cors_headers = ['Content-Type', 'Authorization']

api_path_prefix = '/api'
smtp_server = smtplib.SMTP('smtp.gmail.com', 587)
smtp_server.ehlo()
smtp_server.starttls()
smtp_server.login("", "")
smtp_sender = ''

# TODO: Change this in production
jwt_secret = 'change.this.in.production'
jwt_algorithm= 'HS256'

# Set up our MongoDB connection/collections
client = MongoClient('mongo', 27017)
db = client['up-staging']
users = db.users
settings = db.settings
songs = db.songs

demo_account_email = 'test@example.com'
demo_account_password = 'test'
demo_account_token = 'faketoken'
demo_account_status = 'demo'

unverified_account_status = 'unverified'
verified_account_status = 'verified'

# Set up our Flask app with adequate CORS
app = Flask(__name__, static_url_path='/static')
api = Api(app)

# Keep CORS secure in production
cors = CORS(app, resources={r'/*': {'origins': flask_cors_origin }}, allow_headers=flask_cors_headers)

# Configure logging
logging.basicConfig(level=flask_level, format=flask_log_format, datefmt=flask_log_date_format)
logger = logging.getLogger('upstaging')
webserver_logging = logging.getLogger('werkzeug')
webserver_logging.setLevel(logging.WARN)

demo_account_songs = [
    {
      "_id": uuid.uuid4().hex, 
      "album": "21", 
      "artist": "Adele", 
      "chords": [
        {
          "chordSet": "Am Em G Em G", 
          "setName": "Verse"
        }, 
        {
          "chordSet": "F G Em F", 
          "setName": "Pre-Chorus"
        }, 
        {
          "chordSet": "Am G F G", 
          "setName": "Chorus"
        }
      ],
      "capo": 3,
      "favorite": True, 
      "lyrics": "There's a fire starting in my heart\nReaching a fever pitch and it's bringing me out the dark\nFinally I can see you crystal clear\nGo ahead and sell me out and I'll lay your ship bare\n\nSee how I leave with every piece of you\nDon't underestimate the things that I will do\nThere's a fire starting in my heart\nReaching a fever pitch and it's bringing me out the dark\n\nThe scars of your love remind me of us\nThey keep me thinking that we almost had it all\nThe scars of your love they leave me breathless\nI can't help feeling\n\nWe could've had it all\nRolling in the deep\nYou had my heart inside your hands\nBut you played it with a beating\n\nBaby I have no story to be told\nBut I've heard one of you and I'm gonna make your head burn\nThink of me in the depths of your despair\nMaking a home down there 'cause mine sure won't be shared\n\nThe scars of your love remind me of us\nThey keep me thinking that we almost had it all\nThe scars of your love they leave me breathless\nI can't help feeling\n\nWe could've had it all\nRolling in the deep\nYou had my heart inside your hands\nBut you played it with a beating\n\nThrow your soul through every open door\nCount your blessings to find what you look for\nTurn my sorrow into treasured gold\nPay me back in kind and reap just what you sow\n\nWe could've had it all\nCould've had it all\nIt all\nIt all\nIt all\n\nWe could've had it all\nRolling in the deep\nYou had my heart inside your hands\nBut you played it with a beating", 
      "title": "Rolling in the Deep"
    },
    {
      "_id": uuid.uuid4().hex, 
      "album": "Lead Sails, Paper Anchor", 
      "artist": "Atreyu", 
      "chords": [
        {
          "chordSet": "Em D C B", 
          "setName": "Verse"
        }, 
        {
          "chordSet": "C D", 
          "setName": "Pre-Chorus"
        }, 
        {
          "chordSet": "Am Em B Em", 
          "setName": "Chorus"
        }, 
        {
          "chordSet": "G D C B", 
          "setName": "Bridge"
        }
      ], 
      "capo": 4,
      "favorite": True, 
      "lyrics": "Marching along, like a good soldier does\nI'm setting sail, with anchors holding me down\nPack up my bags, stow them away\nI'm bidding farewell to all that is safe\n\nWill I come up for air, come up for air\nAfter awhile the current is calling me\nLulling me, waving goodbye\nI'm out here alone, oh God can you save me now?\nSinking my heart turns to stone\n\nWithering away, a shrinking violet dies\nSo full of life, these lights they've dried me out\nInto the sea, I needed a drink\nI never thought this would consume me whole\n\nWill I come up for air, come up for air\nAfter awhile the current is calling me\nLulling me, waving goodbye\nI'm out here alone, oh God can you save me now?\nSinking my heart turns to stone\n(I turn to stone)\nSinking my heart turns to stone\nSave me, take me home\nOver and over again\nSave me, take me home\nWishing that this all would end\nSave me, take me home\nOver and over again\nSave me, take me home\nWishing that this all would end\n\nAfter awhile the current is calling me\nLulling me, waving goodbye\nI'm out here alone, oh God can you save me now?\nSinking my heart turns to stone\nAfter awhile the current is calling me\nLulling me, waving goodbye\nI'm out here alone, oh God can you save me now?\nSinking my heart turns to stone\nSinking my heart turns to stone\n\nSave me take me home\nWhen I come up for air\nSave me take me home\nWhen I come up for air\nSave me take me home\nOver and over again\nSave me take me home\n\nWishing that all this would end", 
      "title": "Lead Sails and a Paper Anchor"
    },
    {
      "_id": uuid.uuid4().hex, 
      "album": "The Marshall Mathers LP 2", 
      "artist": "Eminem (ft. Rihanna)", 
      "chords": [
        {
          "chordSet": "Am G F--", 
          "setName": "All"
        }
      ], 
      "favorite": True,
      "capo": 3,
      "lyrics": "I'm friends with the monster that's under my bed\nGet along with the voices inside of my head\nYou're trying to save me, stop holding your breath\nAnd you think I'm crazy, yeah you think I'm crazy\n\nI wanted the fame but not the cover of Newsweek, oh well\nGuess beggars can't be choosy\nWanted to receive attention for my music\nWanted to be left alone in public, excuse me\nFor wanting my cake and eat it too, for wanting it both ways\nFame made me a balloon, as my ego inflated\nWhen I blew, see, well it was confusing\n'Cause all I wanted to do is be the Bruce Lee of loose-leaf\nAbused ink, used it as a tool and I blew steam woo!\nHit the lottery, ooh-wee!\nBut with what I gave up to get it was bitter-sweet\nIt was like winning a used mink\nIronic 'cause I think I'm gettin' so huge I need a shrink\nI'm beginning to lose sleep, one sheep, two sheep\nGoin' coo-coo and cooky as Cool Keith,\nBut I'm actually weirder than you think\n\n'Cause I'm friends with the monster that's under my bed\nGet along with the voices inside of my head\nYou're trying to save me, stop holding your breath\nAnd you think I'm crazy, yeah you think I'm crazy\nWell that's nothing!\nWell that's nothing!\n\nWell I ain't much of a poet\nBut I know somebody once told me\nTo seize the moment and don't squander it\n'Cause you'll never know when it all could be over tomorrow\nSometimes I wonder where these thoughts spawn from\nYeah, ponderin' will do you wonders boy\nWhen you're losin' your mind the way it wanders\nYodel-yodelay eeee-hoo!\nI think it went wanderin' off and\nStumbled down to Jeff VanVondrin (sic?)\n'Cause I need an interventionist\nTo intervene between me and this monster\nTo save me from myself and all this conflict\n'Cause the very thing that I love is killin' me and I can't conquer it\nMy OCD's conkin' me in the head\nKeep knockin', nobody's home, I'm sleep-walking\nI'm just relaying what the voice in my head sayin'\nDon't shoot the messenger, I'm just\n\nFriends with the monster that's under my bed\nGet along with the voices inside of my head\nYou're trying to save me, stop holding your breath\nAnd you think I'm crazy, yeah you think I'm crazy\nWell that's nothing!\nWell that's nothing!\n\nCall me crazy, but I have this vision that\nOne day I'll walk amongst you a regular civilian\nBut until then, drums get killed and I'm coming straight at MC's blood get spilled and I'll\nTake you back to the days that I'd get on a Dre track\nAnd give every kid who got played that pumped-up feeling\nAnd shit to say back to the kid's who played him\nI ain't here to save the fuckin' children\nBut if one kid out a hundred million who are going through a stuggle feels that it relates that's great!\nIt's payback Russel Wilson (sic?) fallin' way back in the draft\nTurn nothing into something still can make that\nStraw into gold, chump, I will spin Rumplestiltskin (sic?) in a haystack\nMaybe I need a straight-jacket, face facts I am nuts, for real, but I'm ok with that\nThat's nothing I'm still\n\nFriends with the monster that's under my bed\nGet along with the voices inside of my head\nYou're trying to save me, stop holding your breath\nAnd you think I'm crazy, yeah you think I'm crazy\n\nI'm friends with the monster that's under my bed (get along with)\nGet along with the voices inside of my head (you're trying to\nYou're trying to save me, stop holding your breath (you think I'm)\nAnd you think I'm crazy, yeah you think I'm crazy\nWell that's nothing!\nWell that's nothing!", 
      "title": "Monster"
    }, 
]

# TODO: cache users? songs?
userList = []
def getUsers():
    if len(userList) > 0:
        return userList
    else:
        for doc in users.find():
            userList.append(doc)
    return userList

def getLogMessage(message, request, user=None):
    if user is None:
        return '%s - %s' % (request.remote_addr, message)
    else:
        return '%s - %s - %s' % (request.remote_addr, user['email'], message)
        
def printRequest():
    #pprint (request.headers)
    user_agent = request.headers.get('User-Agent', None)
    logger.info('"%s" is requesting %s' % (user_agent, request.path))
    if user_agent is None:
        logger.warn('No User-Agent header found... blocking suspicious attempt')
        return "", 404
    if user_agent not in allowed_user_agents:
        logger.warn('User-Agent not allowed: %s... consider blocking?' % user_agent)
    #    return "", 404
    
def prettyPrint(json_data, sort_keys=False):
    return json.dumps(json_data, sort_keys=sort_keys, indent=2, separators=(',', ': '))
    
def emptyResponse():
    return jsonify({})
    
def errorResponse(message):
    return jsonify({"status": "error", "message": message })
    
def successResponse(fields={}):
    fields['status'] = 'success'
    return jsonify(fields)
    
def getToken(request):
    try:
        header = request.headers['Authorization']
        token = str(header.split(' ')[1])
        return token
    except KeyError:
        logger.error('No authorization header found: %s' % request.remote_addr)
        return None
    
def checkToken(token):
    try:
        if token == demo_account_token:
            return { 'email': demo_account_email, 'status': demo_account_status }
        payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
        email = payload['email']
        user = users.find_one({ "email": email })
        return user
    except jwt.ExpiredSignatureError as ex:
        logger.error("Token has expired: %s" % token)
        return None
    except jwt.exceptions.DecodeError as ex:
        logger.error("Failed to decode token: %s" % token)
        return None
        
def createToken(json_data, expiration_days=7):
    # TODO: Shorten expiration from 7 days in production?
    json_data['exp'] = datetime.utcnow() + timedelta(days=expiration_days)
    return jwt.encode(json_data, jwt_secret, algorithm=jwt_algorithm)
    
def sendEmail(smtp_server, recipient, message_body, subject=None):
    if subject is None:
        subject = 'UpStaging Support'
    
    # Messages MUST start with a newline, or contents are confused with headers
    email = MIMEText(message_body)
     
    email['Subject'] = subject
    email['From'] = smtp_sender
    email['To'] = recipient
    smtp_server.sendmail(smtp_sender, [recipient], email.as_string())
    
        
"""Serve static files from"""
@app.route('/upstaging/', defaults={'filename': 'index.html'}, methods=['GET'])
@app.route('/upstaging/<path:filename>', methods=['GET'])
def serve_static(filename):
    #logger.debug('Request for static file: %s' % filename)
    
    block = printRequest()
    if block is not None:
        return block
        
    root_dir = os.path.dirname(os.getcwd())
    abs_dir = os.path.join(root_dir, 'upstaging', 'static', 'www')
    #logger.debug('Serving static absolute file: %s' % os.path.join(abs_dir, filename))
    return send_from_directory(abs_dir, filename)

"""Allow existing users to authenticate"""
@app.route(api_path_prefix + '/login', methods=['POST'])
def login():
    logger.debug(getLogMessage('POST received: /login', request))
    
    block = printRequest()
    if block is not None:
        return block
        
    json_data = request.json

    email = json_data['email']
    password = json_data['password']
    
    # Allow our test account inside, even if not registered
    if email == demo_account_email and password == demo_account_password:
        logger.debug(getLogMessage('logger in with test user credentials: %s' % email, request))
        del json_data['password']
        #token = createToken(json_data, 1)
        return make_response(successResponse({ 
            "user": json_data,
            "token": demo_account_token
        }), 201)

    user = users.find_one({ "email": email })
    # Deny if user is not registered
    if user is None:
        logger.debug("DEBUG: no user found with this e-mail: %s" % email)
        return make_response(errorResponse('Invalid credentials'), 401)
        
    # Deny if user has not yet verified their account
    if user['status'] != verified_account_status:
        logger.debug("DEBUG: no user found with this e-mail: %s" % email)
        return make_response(errorResponse('Please click the verification link sent to your account\' e-mail address before continuing'), 401)
        
    # TODO: Better session handling?
    h = user['password']
        
    # Allow only if user password hash matches
    if bcrypt.verify(password, h):
        logger.debug(getLogMessage('logger in with real user credentials: %s' % email, request))
        del json_data['password']
        token = createToken(json_data)
        return make_response(successResponse({ 
            "user": json_data,
            "token": str(token, encoding="UTF-8")
        }), 200)
    else:
        logger.debug(getLogMessage("DEBUG: password mismatch for: %s" % email, request))
        return make_response(errorResponse('Invalid credentials'), 401)
    
"""Allow new users to sign up"""
@app.route(api_path_prefix + '/register', methods=['POST'])
def register():
    prelim_json = copy.copy(request.json)
    prelim_json['password'] = 'REDACTED'
    logger.debug(getLogMessage('POST received: /register - %s' % prelim_json, request))
    
    block = printRequest()
    if block is not None:
        return block
    json_data = request.json
    
    email = json_data['email']
    if email is None:
        return make_response('E-mail is required', 400)
    if email == demo_account_email:
        return make_response('E-mail address already exists', 409)

    # Ensure user has not already registered
    currentUser = users.find_one({ "email": email })
    if currentUser is not None:
        return make_response(errorResponse("E-mail already exists"), 409)
    
    # Create a new 'unverified' user in the db
    json_data['status'] = unverified_account_status
    json_data['registered_on'] = datetime.utcnow()
    
    # Generate a new salt and hash the password
    password = json_data['password']
    h = bcrypt.hash(password)
    json_data['password'] = h
    
    # Generate a temporary JWT for e-mail verification
    token = createToken({ 'email': email }, 1)
    try:
        # Notify user that they need to verify their e-mail address
        verification_link = "https://slambert.org:8080/api/verify/" + str(token, encoding="UTF-8")
        msg = "\nPlease verify your e-mail address before continuing!\n\nYou have 24 hours to follow click the following link:\n%s" % verification_link # The /n separates the message from the headers
        
        # Messages MUST start with a newline, or contents are confused with headers
        sendEmail(smtp_server, email, msg, 'Account Verification')
        
        # Store a copy of this user (w/ password) in our dictionary
        id = str(users.insert_one(copy.copy(json_data)).inserted_id)
        json_data['_id'] = id
        return make_response(successResponse({ "created_id": id, "user": json_data }), 201)
    except Exception as e:
        message = "Error sending registration e-mail"
        pprint (e)
        logger.error(message)
        return make_response(errorResponse(message), 500)
        
    
@app.route(api_path_prefix + '/verify/<string:token>', methods=['GET'])
def verify(token):
    logger.debug(getLogMessage('GET received: /verify/%s' % token, request))
    
    block = printRequest()
    if block is not None:
        return block
    if token is None:
        return make_response(errorResponse('Token required'), 401)
    
    user = checkToken(token)
    if user is None:
        return make_response(errorResponse('Invalid credentials'), 401)
    
    email = user['email']
    if user['status'] == verified_account_status:
        logger.error('User %s was already verified' % email)
        return make_response(successResponse({ "message": "E-mail address was already verified" }))
    if user['status'] == demo_account_status:
        return make_response(errorResponse('Invalid credentials'), 401)
            
    # Mark this user as 'verified'
    users.update_one({ '_id': ObjectId(user['_id']) }, { '$set': { 'status': 'verified', 'verified_on': datetime.utcnow() } })
    
    # The /n separates the message from the headers
    msg = "Thank you for verifying your e-mail!\n\nYou should now be able to log into the UpStaging app!"
    
    sendEmail(smtp_server, email, msg, 'Account Confirmed!')
    
    return redirect("https://slambert.org:8080/upstaging/index.html?token=%s" % token, code=302)

class Songs(Resource):
    """Allow users to retrieve all songs"""
    def get(self):
        logger.debug(getLogMessage('GET received: /songs', request))
        
        block = printRequest()
        if block is not None:
            return block
        token = getToken(request)
        if token is None:
            return make_response(errorResponse('Invalid credentials'), 401)

        user = checkToken(token)
        if user is None:
            return make_response(errorResponse('Invalid credentials'), 401)
        if user['status'] == demo_account_status:
            return make_response(successResponse({ 'songs': demo_account_songs }), 200)
            
        logger.debug(str(user['_id']))
    
        # Accumulate any records created by this user
        output = []
        for s in songs.find({ 'user': str(user['_id']) }):
            output.append({
                '_id': str(s['_id']),
                'title': s['title'],
                'artist': s['artist'],
                'album': s['album'],
                'favorite': s['favorite'],
                'chords': s['chords'],
                'lyrics': s['lyrics'],
                'user': str(user['_id'])
            })
        logger.info(getLogMessage('GET processed: /songs', request, user))
        return make_response(successResponse({ 'songs': output }), 200)
        
    """Allow users to add a song"""
    def post(self):
        logger.debug(getLogMessage('POST received: /songs - %s' % request.json, request))
        
        block = printRequest()
        if block is not None:
            return block
        token = getToken(request)
        if token is None:
            return make_response(errorResponse('Invalid credentials'), 401)
            
        user = checkToken(token)
        if user is None:
            return make_response(errorResponse('Invalid credentials'), 401)
        if user['status'] == demo_account_status:
            new_id = uuid.uuid4().hex
            json_data = request.json
            json_data['_id'] = str(new_id)
            return make_response(successResponse({ "created_id": new_id, "song": json_data }), 201)
            
        # TODO: Validation? Handle duplicates properly?
        json_data = request.json
        
        # Ignore existing _id on create
        if json_data.get('_id', None) is not None:
            del json_data['_id']
        
        # Associate this song with the user who created it
        json_data['user'] = str(user['_id'])
        s = json_data
        
        id = str(songs.insert_one({
            'title': s['title'],
            'artist': s['artist'],
            'album': s['album'],
            'favorite': s['favorite'],
            'chords': s['chords'],
            'lyrics': s['lyrics'],
            'user': str(user['_id'])
        }).inserted_id)
        
        s['_id'] = str(id)
            
        logger.info(getLogMessage('POST processed: /songs - %s' % s, request, user))
        
        return make_response(successResponse({ "created_id": id, "song": s }), 201)
        
    def put(self):
        logger.debug(getLogMessage('PUT received: /songs - %s' % request.json, request))
        block = printRequest()
        if block is not None:
            return block
        return make_response(errorResponse('Not implemented'), 501)
        
    def delete(self):
        logger.debug(getLogMessage('DELETE received: /songs - %s' % request.json, request))
        block = printRequest()
        if block is not None:
            return block
        return make_response(errorResponse('Not implemented'), 501)

class Song(Resource):
    """Allow users to retrieve a song"""
    def get(self, id):
        logger.debug(getLogMessage('GET received: /songs/%s' % id, request))
        
        block = printRequest()
        if block is not None:
            return block
        token = getToken(request)
        if token is None:
            return make_response(errorResponse('Invalid credentials'), 401)
            
        user = checkToken(token)
        if user is None:
            return make_response(errorResponse('Invalid credentials'), 401)
        if user['status'] == demo_account_status:
            return make_response(successResponse({ 'song': {} }), 200)
            
        if id is None:
            return make_response(errorResponse('id is required'), 400)
            
        song = songs.find_one({ '_id': ObjectId(id), 'user': str(user['_id']) })
        song['_id'] = str(songs['_id'])
        
        if str(user['_id']) != song['user']:
            return make_response(errorResponse('You are forbidden from accessing this resource'), 403)
        
        logger.info(getLogMessage('GET processed: /songs/%s - %s' % (id, song), request, user))
        
        return make_response(successResponse({ "song": song }), 200)
        
    def post(self, id):
        logger.debug(getLogMessage('POST received: /songs/%s - %s' % (id, request.json), request))
        
        block = printRequest()
        if block is not None:
            return block
        return make_response(errorResponse('Not implemented'), 501)

    """Allow users to update a song"""
    def put(self, id):
        logger.debug(getLogMessage('PUT received: /songs/%s - %s' % (id, request.json), request))
        
        block = printRequest()
        if block is not None:
            return block
        token = getToken(request)
        if token is None:
            return make_response(errorResponse('Invalid credentials'), 401)
        user = checkToken(token)
        if user is None:
            return make_response(errorResponse('Invalid credentials'), 401)
        if user['status'] == demo_account_status:
            return make_response(successResponse({ "updated_id": id, "song": request.json }), 200)
        if id is None:
            return make_response(errorResponse('id is required'), 400)
            
        # TODO: Validation?
        json_data = request.json
        
        # Remove _id before using update_one or pymongo complains
        oid = json_data.pop('_id')
        str_id = ObjectId(oid)
        if str(str_id) != str(id):
            return make_response(errorResponse('id mismatch'), 400)
        
        # TODO: Update only the "changedFields"?
        existingItem = songs.find_one({ "_id": ObjectId(id) })
        
        if existingItem is None:
            return make_response(errorResponse('Item not found'), 404)
        if str(user['_id']) != existingItem['user']:
            return make_response(errorResponse('You are forbidden from accessing this resource'), 403)
            
        # Ensure relation remains intact
        json_data['user'] = str(user['_id'])
        
        songs.update_one({ "_id": ObjectId(id) }, { '$set': json_data })
        
        logger.info(getLogMessage('PUT received: /songs/%s - %s' % (id, request.json), request, user))
        
        return make_response(successResponse({ "updated_id": id, "song": json_data }), 200)
    
    def delete(self, id):
        logger.debug(getLogMessage('DELETE received: /songs/%s' % (id), request))
        block = printRequest()
        if block is not None:
            return block
        token = getToken(request)
        if token is None:
            return make_response(errorResponse('Invalid credentials'), 401)
            
        user = checkToken(token)
        if user is None:
            return make_response(errorResponse('Invalid credentials'), 401)
        if user['status'] == demo_account_status:
            return make_response(successResponse({ "deleted_id": id }), 200)
            
        if id is None:
            return make_response(errorResponse('id is required'), 400)
            
        logger.debug(getLogMessage('DELETE /songs/%s' % id, request, user))
        
        existingItem = songs.find_one({ "_id": ObjectId(id) })
        if existingItem is None:
            return make_response(errorResponse('Item not found'), 404)
            
        json_data = request.json
        
        if str(user['_id']) != existingItem['user']:
            return make_response(errorResponse('You are forbidden from accessing this resource'), 403)
        
        # Delete the requested song
        songs.delete_one({ "_id": ObjectId(id) })
        
        logger.info(getLogMessage('DELETE processed: /songs/%s - %s' % (id, str(existingItem)), request))
        
        return make_response(successResponse({ "deleted_id": id }), 200)
        

api.add_resource(Songs, api_path_prefix + '/songs')
api.add_resource(Song, api_path_prefix + '/songs/<string:id>')


# TODO: is this a security risk?
"""Allow UptimeRobot to check that the server is up"""
@app.route(api_path_prefix + '/healthz', methods=['GET', 'HEAD'])
def health_check():
    logger.debug(getLogMessage('GET received: /healthz', request))
    
    # TODO: add /settings endpoint?
    block = printRequest()
    if block is not None:
        return block
    return "OK", 200
    
# TODO: is this a security risk?
"""Block all other odd requests"""
@app.route('/', defaults={'path': ''}, methods=['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'])
@app.route('/<path:path>', methods=['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'])
def block_all(path):
    logger.debug(getLogMessage('Unknown request received: /%s' % path, request))
    
    # TODO: add /settings endpoint?
    block = printRequest()
    if block is not None:
        return block
        
    # Return 404 (block) anyways
    return "", 404
    #return """/login
#/register
#/verify
#/songs
#/songs/:id
#"""

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=flask_port, ssl_context=context, debug=flask_debug)