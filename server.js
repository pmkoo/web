/**
 * A development web server for the Stencila `web` module.
 *
 * Bundles Javascript and compiles SCSS on the fly so that a page refresh
 * can be used in development to load latest versions. Proxies other
 * requests to a Stencila component host (e.g. one started locally using `stencila-r serve`)
 *
 * Usage:
 *
 *   node server.js
 *
 * Or, to proxy to a host other than http://localhost:7373 add the host's URL. e.g.
 *
 *   node server.js --upstream=https://stenci.la
 */

var express = require('express');
var proxy = require('express-http-proxy');
var url = require('url');
var path = require('path');
var sass = require('node-sass');
var browserify = require('browserify');
var babel = require('babelify');
var fs = require('fs');
var glob = require('glob');
var http = require('http');
var he = require('he');

var Err = require('substance/util/SubstanceError');

var opts = {
  'realredis': false
};

// Enable mockery in development so that developers don't
// neeed to have netwrok services installed and running
var mockery = require('mockery');

if (!opts.realredis) {
  console.log('Using fakeredis');
  // Require `fakeredis` before enabling `mockery` so that
  // fakeredis can itself load properly
  mockery.registerMock('redis', require('fakeredis'));
}

mockery.enable({
  warnOnReplace: false,
  warnOnUnregistered: false
});

var httpServer = http.createServer();
var app = express();

// Middleware to prevent browser caching of any of the following endpoints
app.use(function (req, res, next) {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
});

// Function used to override the above no caching headers
// Useful for JS and CSS that is used multiple times during functional tests
function caching (res, seconds) {
  res.header('Cache-Control', 'max-age=' + seconds);
  res.header('Expires', new Date(Date.now() + seconds).toUTCString());
  res.header('Pragma', 'cache');
}

// Home page
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Tests
app.get('/tests', function (req, res, next) {
  res.send(
    '<!DOCTYPE html>\n<html><head></head><body>' +
    'Yo! Open up a console (Ctrl+Shift+I) to see tests results. <script src="tests-bundle.js"></script>' +
    '</body></html>'
  );
});
app.get('/tests-bundle.js', function (req, res, next) {
  browserify({
    // Don't include collab tests when in browser
    entries: glob.sync('tests/document/**/*.test.js'),
    debug: true,
    cache: false
  })
    .bundle()
    .on('error', function (err) {
      console.error(err.message);
      res.send('console.error("Browserify error: ' + err.message + '");');
    })
    .pipe(res);
});

// Generate a simple page for a component with necessary CSS and JS
function page (res, componentType, dataType, data) {
  var page = '<!DOCTYPE html>\n<html><head>';
  page += '<meta name="viewport" content="width=device-width, initial-scale=1">';
  page += '<link rel="stylesheet" type="text/css" href="/get/web/' + componentType + '.min.css">';
  page += '<script src="/get/web/' + componentType + '.min.js"></script>';
  page += '</head><body>';
  if (dataType === 'html') page += '<main id="content">' + data + '</main>';
  else {
    // Simulate what is done on hub
    var payload = {
      user: 'develop',
      rights: 'UPDATE',
      collabUrl: 'ws://localhost:5000/',
      snapshot: data
    };
    // Do HTML encoding of JSON data to avoid XSS attacks as suggested at
    // https://www.owasp.org/index.php/XSS_(Cross_Site_Scripting)_Prevention_Cheat_Sheet#HTML_entity_encoding
    page += '<script id="data" type="application/json">' + he.encode(JSON.stringify(payload)) + '</script>';
  }
  page += '</body></html>';
  res.set('Content-Type', 'text/html');
  res.send(page);
}

// Collaboration server
var collab = require('./collab').bind(httpServer, app, '/collab/');

// Request for a live collaboration clone for a test file
// This simulates what is done on via the hub: the collaboration `DocumentServer` is requested to
// create a new collab session for a document (in production content supplied, here read from file)
// and the client is passed back the initial snapshot JSON data and the Websocket URL for updates
// (ie. in production there is no direct HTTP connection between the client and the collaboration
// `DocumentServer`, only a Websocket connection to the `CollabServer`)
app.get('/tests/:type/*@live', function (req, res) {
  var matches = req.path.match(/\/([^@]+)(@(\w+))?/);
  var address = matches[1];
  var clone = matches[3];
  // TODO currently limited to Stencila Documents. Will need to resolve component type later
  var schemaName = 'stencila-document';
  var documentId = address + '@' + clone;
  // Get the details for the clone (i.e. collab document data, version etc)
  // Check if it already exsts
  var documentEngine = collab.documentEngine;
  documentEngine.documentExists(documentId, function (err, exists) {
    if (err) return cb(new Err('ExistsError', { message: err }));

    if (exists) {
      // yep, just get latest snapshot
      documentEngine.getDocument({ documentId: documentId }, cb);
    } else {
      // nope, read in from local file, convert to JSON data,...
      fs.readFile(path.join(address, 'index.html'), 'utf8', function (err, content) {
        if (err) return cb(new Err('ReadError', { message: err }));

        // ... create a new document from HTML
        documentEngine.createDocument({
          schemaName: schemaName,
          documentId: documentId,
          format: 'html',
          content: content
        }, cb);
      });
    }
  });
  var cb = function (err, snapshot) {
    if (err) return res.send(err.message);
    page(res, req.params.type, 'json', snapshot);
  };
});

// Test HTML pages are served up with the associated CSS and JS
// These pages are intended fo interactive testing of one node type
app.get('/tests/:type/*', function (req, res, next) {
  fs.readFile(path.join(__dirname, req.path, 'index.html'), 'utf8', function (err, content) {
    if (err) return res.send(err);
    page(res, req.params.type, 'html', content);
  });
});

// Examples
app.use('/examples', express.static(path.join(__dirname, 'examples')));

// Paths that normally get served statically...

function nameToPath (name) {
  var matches = name.match(/(\w+)-?(\w+)?/);
  var clas = matches[1];
  var mode = matches[2];
  var file = mode ? (clas + '-' + mode) : clas;
  return path.join(__dirname, clas, file);
}

// Javascript
app.get('/get/web/:name.min.js', function (req, res, next) {
  caching(res, 60);
  browserify({
    debug: true
  }).transform(babel, {
    presets: ['es2015']
  })
    .add(nameToPath(req.params.name) + '.js')
    .bundle()
    .on('error', function (err) {
      console.error(err.message);
      res.send('console.error("Browserify error: ' + err.message + '");');
    })
    .pipe(res);
});

// CSS
function sassify (name, output, res) {
  sass.render({
    file: nameToPath(name) + '.scss',
    sourceMap: true,
    outFile: name + '.min.css'
  }, function (err, result) {
    if (err) {
      console.error(err);
      res.status(500).json(err);
      return;
    }
    res.set('Content-Type', 'text/css');
    res.send(result[output]);
  });
}
app.get('/get/web/:name.min.css', function (req, res) {
  caching(res, 60);
  sassify(req.params.name, 'css', res);
});
app.get('/get/web/:name.min.css.map', function (req, res) {
  sassify(req.params.name, 'map', res);
});

// Images
app.use('/get/web/images', express.static(path.join(__dirname, 'images')));

// Everything else at `/get/web` falls back to the `build` directory (e.g. fonts, MathJax)
// So, you'll need to do a build first
app.use('/get/web', express.static(path.join(__dirname, 'build')));

// Internationalization
app.use('/i18n', express.static(path.join(__dirname, 'i18n')));

// Deal with favicon to prevent uneeded error messages when no upstream proxy
app.get('/favicon.ico', function (req, res) {
  res.sendStatus(404);
});

// Fallback to proxying to hosted components
// Don't use bodyParser middleware in association with this proxying,
// it seems to screw it up
var upstream = 'http://localhost:7373';
if (opts.upstream) {
  upstream = opts.upstream;
}
app.use('*', proxy(upstream, {
  decorateRequest: function (req) {
    if (upstream !== 'http://localhost:7373') {
      if (!process.env.STENCILA_TOKEN) {
        console.error('Error no access token. Create an access token (e.g. at https://stenci.la/api/#!/Tokens/post_tokens) and copy its string into environment variable STENCILA_TOKEN');
        process.exit(1);
      } else {
        req.headers['Authorization'] = 'Token ' + process.env.STENCILA_TOKEN;
      }
    }
    return req;
  },
  forwardPath: function (req, res) {
    var uri = req.params[0];
    console.log('Proxying to ' + upstream + uri);
    return url.parse(uri).path;
  }
}));

// Delegate http requests to express app
httpServer.on('request', app);

// Serve app
var host = 'localhost';
var port = process.env.PORT || 5000;
httpServer.listen(port, host, function () {
  console.log('Running at http://localhost:' + httpServer.address().port + '/');
});

// Export app for requiring in test files
module.exports = app;