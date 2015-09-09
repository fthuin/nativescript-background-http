module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      dist: ["dist"],
      "api-ref": ["dist/api-ref"],
      "github.io": ["github.io/**.*", "!github.io/.git", "!github.io/.gitignore", "!github.io/.nojekyll"]
    },
    exec: {
      tsc_source: 'node_modules/typescript/bin/tsc -p ./source/',
      tsc_example: 'node_modules/typescript/bin/tsc -p ./examples/SimpleBackgroundHttp/',
      npm_pack: {
        cmd: 'npm pack ./package',
        cwd: 'dist/'
      },
      tns_install: {
        cmd: 'tns install',
        cwd: 'examples/SimpleBackgroundHttp'
      },
      tns_plugin_install: {
        cmd: 'tns plugin add ../../dist/package',
        cwd: 'examples/SimpleBackgroundHttp'
      },
      run_ios_emulator: {
        cmd: 'tns run ios --emulator --device iPhone-6',
        cwd: 'examples/SimpleBackgroundHttp'
      },
      run_android_emulator: {
        cmd: 'tns run android --emulator',
        cwd: 'examples/SimpleBackgroundHttp'
      },
      tsd_link: {
        cmd: 'tsd link',
        cwd: 'examples/SimpleBackgroundHttp'
      },
    },
    typedoc: {
      "api-ref": {
        options: {
          // 'flag:undefined' will set flags without options.
          module: 'commonjs',
          target: 'es5',
          out: './dist/api-ref/',
          json: './dist/doc.json',
          name: 'Background HTTP for NativeScript',
          includeDeclarations: undefined, 
          hideGenerator: undefined,
          excludeExternals: undefined,
          externalPattern: '**/d.ts/**',
          mode: 'file',
          readme: 'source/README.md',
          entryPoint: '"background-http"'
          // verbose: undefined
        },
        src: ['source/background-http.d.ts', 'source/d.ts/data/observable/observable.d.ts']
      }
    },
    copy: {
      package: {
        files: [
          { expand: true, cwd: 'source', src: ['**/*.js', '**/*.xml', '**/*.jar', './*.d.ts', 'package.json', 'README.md', 'imagepicker.d.ts'], dest: 'dist/package' }
        ]
      },
      "github.io": {
      	files: [
		      { expand: true, cwd: 'dist/api-ref', src: ['**/*'], dest: 'github.io' }
      	]
      }
    },
    mkdir: {
      dist: {
        options: {
          create: ["dist/package"]
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-mkdir');
  grunt.loadNpmTasks('grunt-typedoc');

  grunt.registerTask('http-dev', 'Host handle uploads.', function() {

    var done = this.async();

    var http = require("http");
    var fs = require("fs");

    var server = http.createServer(function(request, response) {
      var Throttle = require("stream-throttle").Throttle;

      var fileName = request.headers["file-name"];
      console.log(request.method + "Request! Content-Length: " + request.headers["content-length"] + ", file-name: " + fileName);
      console.dir(request.headers);

      var out = "tests/www/uploads/upload-" + new Date().getTime() + "-" + fileName;
      console.log("Output in: " + out);

      var total = request.headers["content-length"];
      var current = 0;

      var shouldFail = request.headers["should-fail"];

      request.pipe(new Throttle({ rate: 1024 * 512 })).pipe(fs.createWriteStream(out, { flags: 'w', encoding: null, fd: null, mode: 0666 }));

      request.on('data', function(chunk) {
        current += chunk.length;
        
        if (shouldFail && (current / total > 0.25)) {
          console.log("Error ");
          var body = "Denied!";
          response.writeHead(408, "Die!", { "Content-Type": "text/plain", "Content-Length": body.length, "Connection": "close" });
          response.write(body);
          response.end();
          console.log("Terminated with error: [" + out + "]: " + current + " / " + total + "  " + Math.floor(100 * current / total) + "%");
        } else {
          console.log("Data [" + out + "]: " + current + " / " + total + "  " + Math.floor(100 * current / total) + "%");
        }
      });

      request.on('end', function () {
        setTimeout(function() {
          console.log("Done (" + out + ")");
          var body = "Upload complete!";
          response.writeHead(200, "Done!", { "Content-Type": "text/plain", "Content-Length": body.length });
          response.write(body);
          response.end();
        }, 10000);
      });

      request.on('error', function(e) {
        console.log('error!');
        console.log(e);
      });
    });

    server.listen(8083);
    console.log("Server is listening");
  });

  // Default task(s).
  grunt.registerTask('default', [
    'clean:dist',
    'exec:tsc_source',
    'mkdir:dist',
    'copy:package',
    'exec:npm_pack',
    'exec:tns_install',
    'exec:tns_plugin_install',
    'exec:tsd_link',
    'exec:tsc_example'
  ]);

  grunt.registerTask('ios', [
    'default',
    'exec:run_ios_emulator'
  ]);

  grunt.registerTask('android', [
    'default',
    'exec:run_android_emulator'
  ]);

  grunt.registerTask('github.io', [
  	'clean:api-ref',
  	'clean:github.io',
  	'typedoc:api-ref',
  	'copy:github.io'
  ]);
};

