#!/usr/bin/python
from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
from time import sleep
import os, sys
import inspect

PORT_NUMBER = int(sys.argv[1])

dirpath = os.path.dirname(os.path.realpath(sys.argv[0]))

assets = dirpath + '/../'
www = dirpath + '/www/'

class ServerHandler(BaseHTTPRequestHandler):

    method = "GET"

    def do_GET(self):
        self.doRequestHttp()

    def do_PUT(self):
        self.method = "PUT"
        self.doRequestHttp()

    def do_HEAD(self):
        self.method = "HEAD"
        self.doRequestHttp()

    def do_POST(self):
        self.method = "POST"
        self.doRequestHttp()

    def getInput(self):
        contentLength = self.headers.getheader('content-length')

        if contentLength:
            contentLength = int(contentLength)
            return self.rfile.read(contentLength)

        return ''

    def doRequestHttp(self):
        if self.path == '/':
            self.path = '/index.html'

        try:
            if self.path.endswith('.html'):
                type = 'text/html; charset=UTF-8'
            elif self.path.endswith('.txt'):
                type = 'text/plain; charset=UTF-8'
            elif self.path.endswith('.json'):
                type = 'application/json; charset=UTF-8'
            elif self.path.endswith('.js'):
                type = 'application/javascript'
            elif self.path.endswith('.css'):
                type = 'text/css'
            else:
                type = 'application/octet-stream'

            if self.path.startswith('/assets/'):
                current = assets + self.path[8:]
            else:
                current = www + self.path

            if self.headers.getheader('x-pjax') == 'true':
                sleep(2) # Simulate slow page

            f = open(current)

            self.send_response(200)
            self.send_header('content-type', type)
            self.end_headers()

            filecontents = f.read()

            if self.method == 'POST':
                inputData = self.getInput().replace('<', '&lt;')
                filecontents = filecontents.replace('{FORMDATA}', inputData)

            self.wfile.write(filecontents)

            f.close()

        except IOError:
            self.send_error(404, 'File not found: %s' % current)

try:
    server = HTTPServer(('', PORT_NUMBER), ServerHandler)
    print 'Server is listening on port', PORT_NUMBER
    server.serve_forever()

except KeyboardInterrupt:
    print '^C received, shutting down the web server'
    server.socket.close()
