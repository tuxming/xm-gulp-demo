var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var openURL = require('open');
var runSequence = require('run-sequence');
var vfs = require('vinyl-fs');
var cleanCSS = require('gulp-clean-css');
var cheerio = require('gulp-cheerio');
var path = require('path');
//var useref  = require('gulp-useref');
var through2 = require('through2');
var less = require('gulp-less');
//var jshint = require('gulp-jshint');

var config = {
	app: require('./bower.json').appPath || 'app',
	dist: 'dist'
};

var paths = {
  scripts: [config.app + '/scripts/**/*.js', '!'+config.app + '/scripts/public/**/*.js'],
  scriptsPublic:[config.app + '/scripts/public/**/*.js'],
  styles: [config.app + '/styles/**/*.less'],
  stylesPublic: [config.app+'/styles/main.css', config.app+'/styles/style.css'], 
  copys: [
	config.app +'/**/*.*',
	'!'+config.app+'/scripts/**/*.*',
	'!'+config.app+'/styles/**/*.?(css|less)',
	'!'+config.app+'/**/*.html'
  ],
  bowerjs: [
    './bower_components/jquery/dist/jquery.js',
	'./bower_components/angular/angular.js',
    './bower_components/angular-resource/angular-resource.js',
    './bower_components/angular-cookies/angular-cookies.js',
    './bower_components/angular-sanitize/angular-sanitize.js',
    './bower_components/angular-route/angular-route.js',
    './bower_components/bootstrap/dist/js/bootstrap.js'
  ],
  bowercss: [
   // './bower_components/bootstrap/dist/css/bootstrap.css',
   // './bower_components/bootstrap/dist/css/bootstrap-theme.css'
  ],
  bowerstatic: [
    './bower_components/bootstrap/dist/fonts/*.*'
  ],
  watched:[
	config.app + '/**/*.*', '!'+config.app + '/**/*.less',
  ],
  karma: 'karma.conf.js',
  htmls:  [
		config.app + '/**/*.html'
	]
};
/**
 * ************************
 * *******����ģ��*********
 * ************************
 **/
//js�﷨���
gulp.task('lint:scripts', function() {
	return gulp.src(paths.scripts)
		.pipe($.jshint('.jshintrc'))
		.pipe($.jshint.reporter('jshint-stylish'));
});

//����sass
gulp.task('less', function(){
	return gulp.src(paths.styles)
		.pipe(less(
			{
				paths: [ path.join(__dirname, 'less', 'includes') ]  //������������뵽less�ĵ�ǰĿ¼
			}
		))
        .pipe(gulp.dest(config.app+'/styles/'));
});

//��bower�Ŀ��ļ���Ӧ��ָ��λ��
gulp.task('bower:ref', function(){
	//console.log(paths.bowerjs);
	gulp.src(paths.bowerjs)
		.pipe(gulp.dest(config.app+'/scripts/public/'));
		
	gulp.src(paths.bowercss)
		.pipe(gulp.dest(config.app+'/styles/public/'));
	gulp.src(paths.bowerstatic)
		.pipe(gulp.dest(config.app+'/static/'));
});

//ɾ��.tmpĿ¼
gulp.task('clean:tmp', function (cb) {
	//rimraf('./.tmp', cb);
	return gulp.src('./.tmp', {read: false})
		.pipe($.clean());
});

//ɾ��.tmpĿ¼��distĿ¼
gulp.task('clean:all', function () {
	//rimraf('./.tmp', cb);
	//rimraf(config.dist, cb);
	return gulp.src([config.dist, './.tmp'], {read: false})
		.pipe($.clean());
});

//�����ļ�
gulp.task('copy', function () {
	return gulp.src(paths.copys)
		.pipe(gulp.dest(config.dist));
});

//�������
gulp.task('start:client', ['start:server', 'less'], function () {
  openURL('http://localhost:9000');
});

//����������
gulp.task('start:server', function() {
  $.connect.server({
    root: config.app,
    livereload: true,
    // Change this to '0.0.0.0' to access the server from outside.
    port: 9000
  });
});

//�����ļ��仯
gulp.task('watch', function() {
	$.watch(paths.watched)
		.pipe($.plumber())
		.pipe($.connect.reload());
	
	gulp.watch(config.app+'/**/*.less', ['less']);
	
	//gulp.watch('bower.json', ['bower']);
});

/**
 * ************************
 * *********����***********
 * ************************
 **/
gulp.task('default', ['build']);
gulp.task('build', function(cb){
	runSequence('clean:all',
		['bower:ref', 'less', 'copy'], 
		//['bower:ref', 'copy'], 
		'process:build', cb);
	
});

gulp.task('process:build', function(){
	//'js', 'css', 'html'
	gulp.src(paths.scriptsPublic)
		.pipe($.concat("vender.js"))
		.pipe($.uglify())
		.pipe(gulp.dest(config.dist+"/scripts/"));
	
	gulp.src(paths.stylesPublic)
		.pipe($.concat('main.css'))
		.pipe(cleanCSS())
		.pipe(gulp.dest(config.dist+'/styles/'));
	
	processhtml();
});

gulp.task('server', function (cb) {
  runSequence('clean:all',
    ['lint:scripts'],
    ['start:client'],
    'watch', cb);
});


/**
 * ************************
 * *******����html*********
 * ************************
 **/


function processhtml(){
	var stream = gulp.src(paths.htmls)
		.pipe(processHtmlForString()) //���ﴦ���ַ�����ʽ��html
		.pipe(cheerio(function($$, file){
			processHtmlForDOM($$, file);  //���ﴦ��dom��ʽ��html
		}))
		.pipe(gulp.dest(config.dist+'/'));
	return stream;
}

//<span class="buildjs" name="main.js" dist="/scripts/" />
//<script type="text/script" class="concat" base="../.." src="../../script/main.js"></script>
//<span class="buildcss" name="main.css" dist="/styles/" />
//<link type="text/css" class="concat" base="../.." href="../../style/main.css"></link>
/**
 * ��html�������class='concat'��js�ļ����кϲ�
 * �滻��html�Ѿ��ϲ���js���ã��滻����������html�У�class='buildjs'��Ԫ����
 * ��html�������class='concat'��css�ļ����кϲ�
 * �滻��html�Ѿ��ϲ���js���ã��滻����������html�У�class='buildcss'��Ԫ����
 **/
/**
 * $$ : cheerio
 * file: stream
 */
function processHtmlForDOM($$, file){
	
	var dist = $$(".buildjs").attr("dist");
	var name = $$(".buildjs").attr("name");
	var files = function(){
		return $$('script.concat').map(function(i,elem){
			var el = $$(elem);
			return el.attr('src').replace(el.attr("base"),"");
		}).toArray().map(function(item){
			return path.join(config.app,item);
		});
	}();
	
	if(files && files.length>0){
		//console.log(files);
		//console.log("11:"+config.dist+dist+", name:"+name)
		var stream = vfs.src(files);
		stream.pipe($.concat(name))
			.pipe($.uglify())
			.pipe(gulp.dest(config.dist+dist));
							
		$$('script.concat').remove();
		$$('.buildjs').remove();
		$$('body').append('<script src="'+dist+name+'"></script>');

	}
	
	//process css
	var cdist = $$(".buildcss").attr("dist");
	var cname = $$(".buildcss").attr("name");
	var cfiles = function(){
		return $$('lnik.concat').map(function(i,elem){
			return $$(elem).attr('href').replace($$(elem).attr("base"),"");
		}).toArray().map(function(item){
			return path.join(config.app,item);
		});
	}();
	
	if(files && cfiles.length>0){
		var stream = vfs.src(cfiles);
		stream.pipe($.concat(cname))
			.pipe(cleanCSS())
			.pipe(gulp.dest(config.dist+cdist));		
	
		$$('link.concat').remove();
		$$('.buildcss').remove();
		$$('head').append('<link href="'+cdist+cname+'"></script>');
	}
	
}

//�����ַ�����ʽ��html
//������Ҫ����ע��
//Ĭ�ϴ���
//<!-- build {"type": "script", "ref":"style/main.js"} -->
//<script src="scripts/app.js"></script>
//<script src="scripts/controllers/main.js"></script>
//<!-- endbuild -->

function processHtmlForString(callback){
	return through2.obj(function (file, enc, done) {
		
		// ����ļ�Ϊ�գ������κβ�����ת����һ������������һ�� .pipe()
		if (file.isNull()) {
			this.push(file);
			return done();
		}
		
		// �����֧�ֶ� Stream ��ֱ�Ӳ������ܳ��쳣
		if (file.isStream()) {
			this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
			return cb();
		}
		
		var content = file.contents.toString();
		
		//���ﴦ���ַ�����ʽ��html
		//<!-- build {"type": "script", "ref":"style/main.js"} -->
		//<script src="scripts/app.js"></script>
		//<script src="scripts/controllers/main.js"></script>
		//<!-- endbuild -->
		
		//<!-- build {type: "css", ref:"style/main.js"} -->
		//<link href="styles/main.css"></link>
		//<link href="styles/default/style.css"></link>
		//<!-- endbuild -->
		var jsRegExp = /(<!--\s*build)(\s\S]*(endbuild\s*-->)/g;

		//<!-- build {"type": "script", "ref":"style/main.js"} -->
		//<!-- build {"type": "script", "ref":"style/main.js"} -->
		var headerReg = /<!--.*-->/;
		var jsonReg = /\{.*\};
		
		var matchElems = content.match(jsRegExp);
		if(matchElems && matchElems.length>0){
			for(var i=0; i < matchElems.length; i++){
				
				var head = matchElems[i].match(headerReg);
				
				var replaceText = "";
				if(head && head.length>0){
					
					var jsonStr = head[0].match(jsonReg);
					if(jsonStr && jsonStr.length>0){
						
						var info = JSON.parse(jsonStr[0]);
						if(info.type && info.ref){
							if(info.type==='script'){
								replaceText = '<script type="text/script" src="'+info.name+'"/>';
							}
						}else{
							if(callback){
								replaceText = callback(info)
							}
						}
						
					}
					
				}
				
				content = content.replace(matchElems[i], replaceText);
				
			}
		}

		
		
		file.contents = new Buffer(content);
		this.push(file);
		done();
	});
}

//rename ��������
/*
gulp.src("./src/main/text/hello.txt", { base: process.cwd() })
  .pipe(rename({
    dirname: "main/text/ciao",
    basename: "aloha",
    prefix: "bonjour-",
    suffix: "-hola",
    extname: ".md"
  }))
  .pipe(gulp.dest("./dist")); // ./dist/main/text/ciao/bonjour-aloha-hola.md 
*/
/*
function plugin(keepQuantity){
    keepQuantity = parseInt(keepQuantity) || 2;
    var list = [];
    
    return through.obj(function (file, enc, cb) {
        if ( new RegExp( '-[0-9a-f]{8}\\' + path.extname(file.path) + '$' ).test(file.path) ) {
            list.push({
                file: file,
                time: file.stat.ctime.getTime()
            });
        }
        cb();
    }, function (cb) {
        list.sort(function(a, b){
            return b.time - a.time;
        })
        .slice(keepQuantity)
        .forEach(function(f){
            this.push(f.file);
        }, this);

        cb();
    });
}

module.exports = plugin;
*/
