import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.Path;
import java.nio.file.FileSystemNotFoundException;

import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;

import java.lang.IllegalArgumentException;
import java.lang.SecurityException;
import java.lang.Thread;
import java.lang.Integer;

import java.net.InetSocketAddress;
import java.net.URLDecoder;

import java.util.List;
import java.util.concurrent.Executors;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

public class SimpleServer
{
    public static void main(String[] args)
    {
        if (args.length != 1) {
            throw new IllegalArgumentException("Invalid arguments, use like this `java Server 9000`");
        }

        ServerHandler handler = new ServerHandler();
        final int port = Integer.parseInt(args[0]);

        try {
            handler.setPath(
                URLDecoder.decode(
                    Server.class.getProtectionDomain().getCodeSource().getLocation().getPath(),
                    "UTF-8"
                )
            );

            InetSocketAddress addr = new InetSocketAddress(port);
            HttpServer server = HttpServer.create(addr, 0);

            server.createContext("/", handler);
            server.setExecutor(Executors.newCachedThreadPool());
            server.start();

            System.out.println("Server is listening on port 9000" );
        } catch (UnsupportedEncodingException e) {
            System.out.println("UnsupportedEncodingException" + e.getMessage());
        } catch (IOException e) {
            System.out.println("IOException" + e.getMessage());
        }
    }
}

class ServerHandler implements HttpHandler
{
    private String assets;
    private String www;

    public void setPath(String path)
    {
        path = path.replaceAll("^/([A-Za-z]):", "$1:");

        assets = path + "..";
        www = path + "www";
    }

    public void handle(HttpExchange exchange) throws IOException
    {
        Headers requestHeaders = exchange.getRequestHeaders();
        Headers responseHeaders = exchange.getResponseHeaders();
        OutputStream responseBody = exchange.getResponseBody();

        String path = exchange.getRequestURI().getPath();
        String current = www + path;
        String type;

        int status = 404;
        byte[] output = "".getBytes();

        if (path.equals("/")) {
            current += "index.html";
        } else if (path.startsWith("/assets/")) {
            current = assets + path.substring(7);
        }

        if (current.endsWith(".html")) {
            type = "text/html; charset=UTF-8";
        } else if (current.endsWith(".txt")) {
            type = "text/plain; charset=UTF-8";
        } else if (current.endsWith(".json")) {
            type = "application/json; charset=UTF-8";
        } else if (current.endsWith(".js")) {
            type = "application/javascript";
        } else if (current.endsWith(".css")) {
            type = "text/css";
        } else {
            type = "application/octet-stream";
        }

        output = ("File not found: " + current).getBytes();

        try {
            output = Files.readAllBytes(Paths.get(current));
            status = 200;

            String isPjax = requestHeaders.getFirst("x-pjax");

            if (isPjax != null && !isPjax.isEmpty()) {
                // Simulate slow page
                try {
                    Thread.sleep(2000);
                } catch (InterruptedException ex) {}
            }

            if (exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                InputStreamReader isr = new InputStreamReader(exchange.getRequestBody(), "UTF-8");
                BufferedReader br = new BufferedReader(isr);

                String line, formdata = "";

                while ((line = br.readLine()) != null) {
                    formdata += line + "\n";
                }

                formdata = formdata.replaceAll("<", "&lt;");

                output = new String(output, "UTF-8").replaceAll("\\{FORMDATA\\}", formdata).getBytes();
            }
        } catch (FileSystemNotFoundException e) {
            System.out.println("FileSystemNotFoundException: " + e.getMessage());
        } catch (IllegalArgumentException e) {
            System.out.println("IllegalArgumentException: " + e.getMessage());
        } catch (SecurityException e) {
            System.out.println("SecurityException: " + e.getMessage());
        } catch (IOException e) {
            System.out.println("IOException: " + e.getMessage());
        } catch (OutOfMemoryError e) {
            System.out.println("OutOfMemoryError: " + e.getMessage());
        }

        responseHeaders.set("Content-Type", type);
        exchange.sendResponseHeaders(status, 0);

        responseBody.write(output);
        responseBody.close();
    }
}
