from mitmproxy import ctx, http
import urllib.parse, urllib.request, json
from cryptography.hazmat.backends.openssl.backend import backend
from cryptography.hazmat.primitives.ciphers import algorithms, base, modes
#from cryptography.hazmat.primitives import padding
from urllib import parse
import random
import base64
import sys

block_size=16

# use this for encrypting parameters. actually used in API
def encrypt_param(key, txt):
    #txt = pad(txt)
    cipher_text = encrypt(key.encode('utf-8'), bytes(txt, encoding='raw_unicode_escape'))

    encoded = [chr(sign_byte(each)).encode('utf-8') for each in cipher_text]
    encoded = list(map(lambda i: i.decode(), encoded))
    return ''.join(encoded)

# python cryptography documentation.
# seed 128 encryption
def encrypt(key, txt):
    mode = modes.ECB()
    cipher = base.Cipher(
        algorithms.SEED(key),
        mode,
        backend
    )
    
    #padder = padding.ANSIX923(block_size).padder()
    #txt = padder.update(txt) + padder.finalize()
    padding_size = block_size - (len(txt)%block_size)
    txt += b'\x00'*(padding_size-1) + bytes([padding_size])
    encryptor = cipher.encryptor()    
    ddata = encryptor.update(txt) + encryptor.finalize()
    ddata = base64.b64encode(ddata)
    return ddata

# java byte = signed
# python byte = unsigned
# means 0x80 ~ 0xFF needs to be converted.
# see http://stackoverflow.com/questions/4958658/char-into-byte-java
# 65280을 더하는 이유는 ..자바에서 byte를 chr로 강제 캐스팅시 byte가 int형태로 sign_extension되고 그 뒤,
# chr는 2바이트니 결과값의 최하위 바이트 2개를 사용.

def sign_byte(me):
    if me > 127:
        # java casting rule. from chr to int.
        # 65280 == '\xFF00'
        return 65280 + ord(me)
    else:
        return me

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

    return ddata.decode('utf-8',errors='ignore')

# webview session info json 조회해서 key값 확인
def get_ocb_crypted2_key(ocb_session_id):
    #ocb_session_id = 'b18473b13223467888f5fc864fea1432'
    url = 'https://webview.okcashbag.com/api/v2.0/internal/session'
    headers = {'X-Ocbwv-Session-Id': ocb_session_id}
    req = urllib.request.Request(url, headers=headers, method='GET')
    json_response = urllib.request.urlopen(req)
    data = json.loads(json_response.read().decode())
    crypted2_key = data['cryptedKey']
    ctx.log.info('crypted2_key:'+crypted2_key)
    return crypted2_key
    
def parse_http_header(header_string):
    header_values = {}
    for c in header_string.split(";"):
        c = c.strip()
        if c:            
            if '=' in c:
                k, v = c.split("=",1)
                header_values[k]=v
            else:
                k = c
                header_values[k]=""
    return header_values

class OcbEncrypt:
    ocb_session_id = 'test'
    
    def __init__(self):
        self.ocb_session_id
        self.crypted2_key = {}
        
    def request(self, flow: http.HTTPFlow):
        # get crypted2 key
        if "X-Ocb-Session-Id" in flow.request.headers:
            ocb_session_id = flow.request.headers["X-Ocb-Session-Id"] 
            ctx.log.info('ocb_session_id:'+ocb_session_id)
            if ocb_session_id != None and not ocb_session_id in self.crypted2_key:
                self.crypted2_key[ocb_session_id] = get_ocb_crypted2_key(ocb_session_id)
                self.ocb_session_id = ocb_session_id

        # check crypted level
        crypted_type = None
        if "X-Ocb-Agent" in flow.request.headers:
            x_ocb_agent = flow.request.headers["X-Ocb-Agent"]
            ctx.log.info('x_ocb_agent:'+x_ocb_agent)
            x_ocb_agent = parse_http_header(x_ocb_agent)
            if "crypted" in x_ocb_agent:
                crypted_type = x_ocb_agent['crypted']
                ctx.log.info('crypted_type:'+crypted_type)
            if crypted_type != None:
                if crypted_type == "1": 
                    key = "9b5dPlf6VB39IlJN"
                elif crypted_type == "2":
                    key = self.crypted2_key[ocb_session_id]
        
        # 복호화
        if crypted_type != None:
            #GET enc 복호화
            if flow.request.query:
                enc = parse.urlencode(flow.request.query)
                data = encrypt_param(key, enc)
                flow.request.query.clear()
                flow.request.query = {'enc':data}

            #POST enc 복호화
            content = flow.request.content.decode('utf-8',errors='ignore')
            if content:
                enc = content
                data = encrypt_param(key, enc)
                ctx.log.info("encrypt post data:"+data)
                flow.request.content = ("enc="+parse.quote_plus(data)).encode('utf-8')
                
    def response(self, flow: http.HTTPFlow):
        # check crypted level
        crypted_type = None
        if "Content-Type" in flow.response.headers:
            x_ocb_agent = flow.response.headers["Content-Type"]
            ctx.log.info('Content-Type:'+x_ocb_agent)
            x_ocb_agent = parse_http_header(x_ocb_agent)
            if "crypted" in x_ocb_agent:
                crypted_type = x_ocb_agent['crypted']
                ctx.log.info('crypted_type:'+crypted_type)
            if crypted_type != None:
                if crypted_type == "1": 
                    key = "9b5dPlf6VB39IlJN"
                elif crypted_type == "2":
                    key = self.crypted2_key[self.ocb_session_id]
        
        # 복호화
        if crypted_type != None:
            #POST enc 복호화
            content = flow.response.content.decode('utf-8',errors='ignore')
            if content:
                enc = content.replace("enc=","").replace("&","")
                if '%' in content:
                    enc = parse.unquote(enc)
                data = decrypt(key, enc)
                ctx.log.info("decrypt post data:"+data)
                flow.response.content = data.encode('utf-8')
        
    
addons = [OcbEncrypt()]