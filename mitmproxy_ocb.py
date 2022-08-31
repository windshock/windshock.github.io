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
