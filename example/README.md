> It's are webserver examples, should not be used in production

## PJAX example with PHP

After download you can copy files to Apache folder or can use [PHP Built server](http://php.net/manual/en/features.commandline.webserver.php), in terminal navigate to `www` folder and type this:

```
php -S 0.0.0.0:9000 SimpleServer.php
```

After navigate to `http://localhost:9000/` in your browser

## PJAX example with Python SimpleHTTPServer

In terminal navigate to `www` folder and type this:

```
python SimpleServer.py 9000
```

After navigate to `http://localhost:9000/` in your browser

## PJAX example with Java

First compile SimpleServer.java in terminal/cmd.exe (this is only necessary once):

```
javac SimpleServer.java
```

For execute server type in terminal/cmd:

```
java SimpleServer 9000
```

After navigate to `http://localhost:9000/` in your browser
