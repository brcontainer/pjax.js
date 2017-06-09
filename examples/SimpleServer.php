<?php

if (PHP_SAPI !== 'cli-server') {
    header('Content-Type: text/plain', true, 500);

    echo 'server.php is not allowed with "', PHP_SAPI,
            '", use a command like this:', PHP_EOL,
              'php -S localhost:9000 server.php', PHP_EOL;
    exit;
}

if (isset($_SERVER['HTTP_X_PJAX'])) {
    sleep(2); // Simulate slow page
}

$assets = __DIR__ . '/../';
$www = __DIR__ . '/www/';

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($path === '/') {
    $current = $www . 'index.html';
} else if (strpos($path, '/assets/') === 0) {
    $current = $assets . substr($path, 8);
} else {
    $current = $www . $path;
}

if (is_file($current)) {
    $extension = pathinfo($current, PATHINFO_EXTENSION);

    switch ($extension) {
        case 'html':
            $type = 'text/html; charset=UTF-8';
        break;
        case 'txt':
            $type = 'text/plain; charset=UTF-8';
        break;
        case 'json':
            $type = 'application/json; charset=UTF-8';
        break;
        case 'js':
            $type = 'application/javascript';
        break;
        case 'css':
            $type = 'text/css';
        break;
        default:
            $type = 'application/octet-stream';
    }

    header('Content-Type: ' . $type);

    $data = file_get_contents($current);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $req = str_replace('<', '&lt;', file_get_contents('php://input'));
        $req = str_replace('{FORMDATA}', $req, $data);
    }

    echo $data;
} else {
    http_response_code(404);
    echo 'File not found: ' . $current;
}
