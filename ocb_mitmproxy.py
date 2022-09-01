# see reference http://stackoverflow.com/questions/7380460/byte-array-in-python

from mitmproxy import http
from cryptography.hazmat.backends.openssl.backend import backend
from cryptography.hazmat.primitives.ciphers import algorithms, base, modes
from cryptography.hazmat.primitives import padding
from urllib import parse
import random
import base64
import sys
from mitmproxy import http

block_size=16

class OcbEncrypt:
    def __init__(self):
        self.crypted2 = {}

    # seed 128 decryption
    def decrypt(key, txt):
        #key =  base64.b64decode(key)
        txt =  base64.b64decode(txt)
        mode = modes.ECB()
        cipher = base.Cipher(
            algorithms.SEED(key.encode()),
            mode,
            backend
        )
        decryptor = cipher.decryptor()
        ddata = decryptor.update(txt) + decryptor.finalize()


        #request packet에서는...
        padding_size = int.from_bytes(ddata[-1:],"little")
        ddata = ddata[0:len(ddata)-padding_size]
        
        #response packet은 jdk8의 javax crypt library를 사용하고 ansix923를 ISO 10126로 해석하는 오류가 있음
        #https://en.wikipedia.org/wiki/Padding_%28cryptography%29#ANSI_X9.23
        #unpadder = padding.ANSIX923(block_size).unpadder()
        #ddata = unpadder.update(ddata) + unpadder.finalize()
        
        return ddata

    def request(self, flow: http.HTTPFlow):
        # header 값에 crypted 확인
        ocb_session_id = flow.request.headers.get("ocb_session_id", "")
        
        if ocb_session_id != null && self.crypted2[ocb_session_id] == null:
            self.crypted2[ocb_session_id] = get_ocb_crypted2_key(ocb_session_id)
        
        crypted_type = flow.request.headers['xxxx'] #todo: crypted type만 추출
        
        if crypted_type == "1": 
            key = "9b5dPlf6VB39IlJN"
        elif crypted_type == "2":
            #key = self.crypted2[ocb_session_id]
	    key = "98b2f09ee4434f86"
        
        enc = bytes(flow.request.content, encoding='raw_unicode_escape').decode('unicode_escape').encode('raw_unicode_escape')
        if '%' in enc:
	    enc = parse.unquote(enc)

        data = decrypt(key, enc)
        
        print(data.decode('utf-8',errors='ignore'))
        #print(list(data))
        flow.request.query["enc"] = data

    def response(self, flow: http.HTTPFlow):
        return 'test'
        
        
    # todo: webview session info json 조회해서 key값 확인
    def get_ocb_crypted2_key(ocb_session_id):
        key = '98b2f09ee4434f86'
        return key
    
addons = [OcbEncrypt()]
