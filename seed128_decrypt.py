# see reference http://stackoverflow.com/questions/7380460/byte-array-in-python

from cryptography.hazmat.backends.openssl.backend import backend
from cryptography.hazmat.primitives.ciphers import algorithms, base, modes
from cryptography.hazmat.primitives import padding
from urllib import parse
import random
import base64
import sys
from mitmproxy import http

block_size=16

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
    #response packet에서는...
    #unpadder = padding.ANSIX923(block_size).unpadder()
    #ddata = unpadder.update(ddata) + unpadder.finalize()

    return ddata

if __name__=='__main__':

    #key = "9b5dPlf6VB39IlJN"
    #key = "4d24837e85fb4d62"


    if len(sys.argv) > 2:
        keynum = sys.argv[1]
        enc = sys.argv[2]
        if keynum == "1": 
            key = "9b5dPlf6VB39IlJN"
        elif keynum == "2":
            key = "98b2f09ee4434f86"

        if '%' in enc:
            enc = parse.unquote(enc)

    data = decrypt(key, enc)
    print(data.decode('utf-8',errors='ignore'))
    #print(list(data))
