# see reference http://stackoverflow.com/questions/7380460/byte-array-in-python

from cryptography.hazmat.backends.openssl.backend import backend
from cryptography.hazmat.primitives.ciphers import algorithms, base, modes
import urllib
import random
import base64
import sys
from mitmproxy import http

class OcbEncrypt:
    def __init__(self):
        self.crypted2 = {}

    def request(self, flow: http.HTTPFlow):
        # header 값에 crypted 확인
        ocb_session_id = flow.request.headers.get("ocb_session_id", "")
        
        if ocb_session_id != null && self.crypted2[ocb_session_id] == null:
            self.crypted2[ocb_session_id] = get_ocb_crypted2_key(ocb_session_id)
        
        crypted_type = flow.request.headers['xxxx'] #todo: crypted type만 추출
        
        if crypted_type == "1": 
            key = "9b5dPlf6VB39IlJN".encode('utf-8')
        elif crypted_type == "2":
            key = self.crypted2[ocb_session_id].encode('utf-8')
        
        enc = bytes(flow.request.content, encoding='raw_unicode_escape').decode('unicode_escape').encode('raw_unicode_escape')
        data = encrypt_param(key, enc)
        
        flow.request.query["enc"] = data


    else:
        print("usage: python3 %s crypted_num plane_text")

    data = encrypt_param(key, enc)

        
        if crypted_type == 1:
            flow.

    def response(self, flow: http.HTTPFlow):
        
        
    # todo: webview session info json 조회해서 key값 확인
    def get_ocb_crypted2_key(ocb_session_id):
        key = 'test'
        return key
    
addons = [OcbEncrypt()]



# 16바이트에 모자라면 '\x00'을 뒤에 붙침.
def pad_to_sixteen_bytes(txt):
    if len(txt) < 16:
        txt += '\x00'*(16 - len(txt))
    return txt

def strip_padding(txt):
    idx = txt.find(b'\x00')
    # no padding in the first place
    if idx == -1:
        return txt
    return txt[:idx]

# use this for encrypting parameters. actually used in API
def encrypt_param(key, txt):
    txt = pad_to_sixteen_bytes(txt)
    cipher_text = encrypt(key, txt)

    encoded = [unichr(sign_byte(each)).encode('utf-8') for each in cipher_text]
    return urllib.quote_plus(''.join(encoded))


# use this for decrypting. actually used in APIs
def decrypt_param(key, cipher_text):
    cipher_text = list(urllib.unquote_plus(cipher_text).decode('utf-8'))
    cipher_text = ''.join(map(chr, map(unsign_byte, cipher_text)))
    return strip_padding(decrypt(key, cipher_text))

# for testing purposes
def generate_text():
    return ''.join([random.choice('0123456789abcdefghjklmnopqrstuxyzABCDEFGHIJKLMNOPQRSTUXYZ') for i in range(16)])

# for testing purposes
def test():
    for _ in range(5):
        txt = generate_text()
        print(txt, encrypt_param(key, txt))

# python cryptography documentation.
# seed 128 encryption
def encrypt(key, txt):
    mode = modes.ECB()
    cipher = base.Cipher(
        algorithms.SEED(key),
        mode,
        backend
    )
    encryptor = cipher.encryptor()
    ct = encryptor.update(txt)
    ct += encryptor.finalize()
    return ct

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
    ct = decryptor.update(txt)
    #ct += decryptor.finalize()
    return ct

# java byte = signed
# python byte = unsigned
# means 0x80 ~ 0xFF needs to be converted.
# see http://stackoverflow.com/questions/4958658/char-into-byte-java
# 65280을 더하는 이유는 ..자바에서 byte를 chr로 강제 캐스팅시 byte가 int형태로 sign_extension되고 그 뒤,
# chr는 2바이트니 결과값의 최하위 바이트 2개를 사용.

def sign_byte(me):
    if ord(me) > 127:
        # java casting rule. from chr to int.
        # 65280 == '\xFF00'
        return 65280 + ord(me)
    else:
        return ord(me)

def unsign_byte(me):
    if ord(me) >= 65280:
        return ord(me) - 65280
    else:
        return ord(me)


if __name__=='__main__':

    #key = "9b5dPlf6VB39IlJN"
    #key = "4d24837e85fb4d62"


    if len(sys.argv) > 2:
        keynum = sys.argv[1]
        enc = sys.argv[2]

        if keynum == "1": 
            key = "9b5dPlf6VB39IlJN"
        elif keynum == "2":
            key = "4d24837e85fb4d62"

        if '%' in enc:
            enc = urllib.parse.unquote_to_bytes(enc)

    data = decrypt(key, enc)
    print()
    print(strip_padding(data))
