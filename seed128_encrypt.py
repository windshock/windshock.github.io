# see reference http://stackoverflow.com/questions/7380460/byte-array-in-python

from cryptography.hazmat.backends.openssl.backend import backend
from cryptography.hazmat.primitives.ciphers import algorithms, base, modes
from cryptography.hazmat.primitives import padding
import urllib
import random
import base64
import sys

block_size=16

# use this for encrypting parameters. actually used in API
def encrypt_param(key, txt):
    #txt = pad(txt)
    cipher_text = encrypt(key, txt)

    encoded = [chr(sign_byte(each)).encode('utf-8') for each in cipher_text]
    encoded = list(map(lambda i: i.decode(), encoded))
    return urllib.parse.quote_plus(''.join(encoded))

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

if __name__=='__main__':

    #key = "9b5dPlf6VB39IlJN"
    #key = "98b2f09ee4434f86"
    #key = "4d24837e85fb4d62"

    if len(sys.argv) > 2:
        keynum = sys.argv[1]
        #enc = sys.argv[2].encode('utf-8').decode('unicode_escape').encode('utf-8')
        enc = bytes(sys.argv[2], encoding='raw_unicode_escape').decode('unicode_escape').encode('raw_unicode_escape')

        if keynum == "1": 
            key = "9b5dPlf6VB39IlJN".encode('utf-8')
        elif keynum == "2":
            key = "98b2f09ee4434f86".encode('utf-8')

    else:
        print("usage: python3 %s crypted_num plane_text")

    data = encrypt_param(key, enc)
    print(data)
