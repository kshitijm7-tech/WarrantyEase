import urllib.request
import json

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
test_content = b'%PDF-1.4 test invoice'

body = (
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="file"; filename="test.pdf"\r\n'
    'Content-Type: application/pdf\r\n\r\n'
).encode() + test_content + ('\r\n--' + boundary + '--\r\n').encode()

req = urllib.request.Request('http://localhost:8001/api/v1/documents/upload-invoice', method='POST')
req.add_header('Content-Type', 'multipart/form-data; boundary=' + boundary)
req.add_header('Origin', 'http://localhost:3000')
resp = urllib.request.urlopen(req, body)
result = json.loads(resp.read().decode())
print('Status:', resp.getcode())
print('Product:', result.get('productName'))
print('Currency:', result.get('currency'))
print('Invoice:', result.get('invoiceNumber'))