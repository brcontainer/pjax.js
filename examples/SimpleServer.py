try:
    from http.server import BaseHTTPRequestHandler, HTTPServer

except:
    from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer


from time import sleep
import os, sys
import inspect


PORT_NUMBER = int(sys.argv[1])

dirpath = os.path.dirname(os.path.realpath(sys.argv[0]))

assets = dirpath + '/../'
www = dirpath + '/www/'


class ServerHandler(BaseHTTPRequestHandler):
    legacy = sys.version_info < (3, 0)
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
        contentLength = self.headers['content-length'] if 'content-length' in self.headers else '0'

        if contentLength:
            contentLength = int(contentLength)
            return self.rfile.read(contentLength)

        return '' if self.legacy else bytes('')

    def displayInput(self, contents):
        data = self.getInput()

        param = '{FORMDATA}'
        pattern = '<'
        replacement = '&lt;'
        alternative = ''

        if not self.legacy:
            param = bytes(param, 'utf-8')
            pattern = bytes(pattern, 'utf-8')
            replacement = bytes(replacement, 'utf-8')
            alternative = bytes(alternative, 'utf-8')

        if data:
            return contents.replace(param, data.replace(pattern, replacement))
        else:
            return alternative

    def doRequestHttp(self):
        if self.path == '/':
            self.path = '/index.html'

        if self.path.endswith('.html'):
            contentType = 'text/html; charset=UTF-8'
        elif self.path.endswith('.txt'):
            contentType = 'text/plain; charset=UTF-8'
        elif self.path.endswith('.json'):
            contentType = 'application/json; charset=UTF-8'
        elif self.path.endswith('.js'):
            contentType = 'application/javascript'
        elif self.path.endswith('.css'):
            contentType = 'text/css'
        else:
            contentType = 'application/octet-stream'

        if self.path.startswith('/assets/'):
            current = assets + self.path[8:]
        else:
            current = www + self.path

        if 'x-pjax' in self.headers and self.headers['x-pjax'] == 'true':
            sleep(2) # Simulate slow page

        try:
            with open(current, 'rb') as f:
                self.send_response(200)
                self.send_header('content-type', contentType)
                self.end_headers()

                fileContents = f.read()

                if self.method == 'POST' and fileContents:
                    fileContents = self.displayInput(fileContents)

                self.wfile.write(fileContents)

                f.close()

        except IOError:
            self.send_error(404, 'File not found: %s' % current)


try:
    server = HTTPServer(('', PORT_NUMBER), ServerHandler)
    print('Server is listening on port ' + str(PORT_NUMBER))
    server.serve_forever()

except KeyboardInterrupt:
    print('^C received, shutting down the web server')
    server.socket.close()
