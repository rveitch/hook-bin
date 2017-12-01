module.exports = {
  name: '', // tinyid.encode(unixTimeStamp);
  created: '', // moment().unix();
  requests: [],
  color: '', // random_color()
  favicon_uri: '',
  private: false,
  secret_key: '', // os.urandom(24) if private else
};

/* ---FULL SCHEMA---
{
  name: '', // tinyid.encode(unixTimeStamp);
  created: '', // moment().unix();
  requests: [{
    id: '',
    time: '',
    remote_addr: '',
    method: '',
    headers: '',
    query_string: '',
    raw: '',
    form_data: '',
    body: '',
    path: '',
    content_length: '',
    content_type: '',
  }],
  color: '', // random_color()
  favicon_uri: '',
  private: false,
  secret_key: '', // os.urandom(24) if private else
};
*/


/*
-------------------------------------------------
base_url = https://cos-request-bin.herokuapp.com
request.method = POST
request.path + request.query_string|to_qs = /1cxak1g1
request.content_type = application/json
request.content_length = 447 bytes
request.time = 8d ago
request.remote_addr = From 54.205.24.227
-------------------------------------------------
- FORM/POST PARAMETERS = request.form_data (for each)
- QUERYSTRING = request.query_string (for each)
- HEADERS = request.headers.items() (for each)
-------------------------------------------------
- RAW BODY = request.raw
*/
