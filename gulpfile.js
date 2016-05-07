var gulp = require('gulp');
var load = require('gulp-load-plugins')();
var openURL = require('open');
var runSequence = require('run-sequence');
var vfs = require('vinyl-fs');
var fs = require('fs');
var cheerio = require('cheerio');
var through2 = require('through2');
var cleanCSS = require('gulp-clean-css');
var path = require('path');
//var useref  = require('gulp-useref');
var less = require('gulp-less');
var inject = require('gulp-inject-xm');
//var jshint = require('gulp-jshint');
var extend = require('util')._extend;

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
	'./bower_components/bootstrap/dist/js/bootstrap.js',
    './bower_components/angular-animate/angular-animate.js',
    './bower_components/angular-aria/angular-aria.js',
	'./bower_components/angular-cookies/angular-cookies.js',
    './bower_components/angular-messages/angular-messages.js',
    './bower_components/angular-resource/angular-resource.js',
	'./bower_components/angular-touch/angular-touch.js',
	'./bower_components/angular-route/angular-route.js',
    './bower_components/angular-sanitize/angular-sanitize.js'
  ],
  bowercss: [
   // './bower_components/bootstrap/dist/css/bootstrap.css',
   // './bower_components/bootstrap/dist/css/bootstrap-theme.css'
  ],
  bowerstatic: [
    './bower_components/bootstrap/dist/fonts/*.*'
  ],
  watched:[
	config.app + '/**/*.*', '!'+config.app + '/**/*.less',  '!'+config.app + '/**/*.html'
  ],
  karma: 'karma.conf.js',
  htmls:  [
		config.app + '/**/*.html'
	]
};

/**
 * ************************
 * *******公共模块*********
 * ************************
 **/
//js语法检测
gulp.task('lint:scripts', function() {
	return gulp.src(paths.scripts)
		.pipe(load.jshint('.jshintrc'))
		.pipe(load.jshint.reporter('jshint-stylish'));
});

//编译less
gulp.task('less', function(){
	return gulp.src(paths.styles)
		.pipe(less(
			{
				paths: [ path.join(__dirname, 'less', 'includes') ]  //这个参数，编译到less的当前目录
			}
		))
        .pipe(gulp.dest(config.app+'/styles/'));
});

//将bower的库文件对应到指定位置
gulp.task('bower:ref', function(){
	//console.log(paths.bowerjs);
	gulp.src(paths.bowerjs)
		.pipe(gulp.dest(config.app+'/scripts/public/'));
		
	gulp.src(paths.bowercss)
		.pipe(gulp.dest(config.app+'/styles/public/'));
	gulp.src(paths.bowerstatic)
		.pipe(gulp.dest(config.app+'/static/'));
});

//删除.tmp目录
gulp.task('clean:tmp', function (cb) {
	//rimraf('./.tmp', cb);
	return gulp.src('./.tmp', {read: false})
		.pipe(load.clean());
});

//删除.tmp目录和dist目录
gulp.task('clean:all', function () {
	//rimraf('./.tmp', cb);
	//rimraf(config.dist, cb);
	return gulp.src([config.dist, './.tmp'], {read: false})
		.pipe(load.clean());
});

//复制文件
gulp.task('copy', function () {
	return gulp.src(paths.copys)
		.pipe(gulp.dest(config.dist));
});

//复制文件
gulp.task('copy:all', function () {
	return gulp.src([config.app+"/**/*.*", "!"+config.app+"/**/*.html"])
		.pipe(gulp.dest(".tmp/"));
});

//打开浏览器
gulp.task('start:client', ['start:server', 'less'], function () {
  openURL('http://localhost:9000');
});

//启动服务器
gulp.task('start:server', function() {
  load.connect.server({
    //root: config.app,
    root: ".tmp",
    livereload: true,
    // Change this to '0.0.0.0' to access the server from outside.
    port: 9000
  });
});

//处理html的回调函数
var htmlCallback = function (info, isDebug){
	if(info.type == "tpl"){
		var source = fs.readFileSync(config.app+"/"+info.ref);
		if(source)
			return source.toString();
		else 
			return "";
	}else if(info.type=='bower'){
		var bowerjss;
		if(isDebug){
			bowerjss = paths.bowerjs.map(function(item, i){
				var paths = item.split("/");
				var jsName = paths[paths.length-1];
				return "<script type='text/javascript' src='/scripts/public/"+jsName+"'></script>";
			}).reduce(function(a, b){
				return a+b; 
			});	
		}else{
			bowerjss = "<script type='text/javascript' src='scripts/vender.js' ></script>";
		}
		
		return bowerjss;
		
	}else
		return "";
	
}

//监听文件变化
gulp.task('watch', function() {
	load.watch(paths.watched)
		.pipe(load.plumber())
		.pipe(gulp.dest(".tmp/"))
		.pipe(load.connect.reload());
	
	load.watch(config.app+'/**/*.html')
		.pipe(load.plumber())
		.pipe(inject({
			isDebug : true,
			callback: htmlCallback
		}))
		.pipe(gulp.dest(".tmp/"))
		.pipe(load.connect.reload());
	
	gulp.watch(config.app+'/**/*.less', ['less']);
	
	//gulp.watch('bower.json', ['bower']);
});

//处理html文件到.tmp用于开发
gulp.task('process:html:server', function() {
	
	gulp.src(config.app+'/**/*.html')
		.pipe(load.plumber())
		.pipe(inject({
			isDebug : true,
			callback: htmlCallback
		}))
		.pipe(gulp.dest(".tmp/"));
});

/**
 * ************************
 * *********任务***********
 * ************************
 **/
 gulp.task('server', function (cb) {
  runSequence('clean:all',
    ['bower:ref', 'lint:scripts', 'less', 'copy:all', "process:html:server"],
    ['start:client'],
    'watch', cb);
});
 
gulp.task('default', ['server']);
gulp.task('build', function(cb){
	runSequence('clean:all',
		['bower:ref', 'less', 'copy'], 
		//['bower:ref', 'copy'], 
		'process:build', cb);
	
});

gulp.task('process:build', function(){
	//'js', 'css', 'html'
	gulp.src(paths.scriptsPublic)
		.pipe(load.concat("vender.js"))
		.pipe(load.uglify())
		.pipe(gulp.dest(config.dist+"/scripts/"));
	
	gulp.src(paths.stylesPublic)
		.pipe(load.concat('main.css'))
		.pipe(cleanCSS())
		.pipe(gulp.dest(config.dist+'/styles/'));
		
	//处理html
	var stream = gulp.src(paths.htmls)
		.pipe(processhtml({
			isDebug : false,
			callback: htmlCallback
		}))
		.pipe(gulp.dest(config.dist+'/'));
	
});


/**
 * ************************
 * *******处理html*********
 * ************************
 **/
 /*
	options = {
		isDebug : false,
		callback: function(info){
			var sourcePath = info.ref;
			var source = fs.readFileSync(info.ref);
			if(source)
				return source.toString();
			else 
				return "";
		}
	}
 */
function processhtml(options){
	options = extend({isDebug: false}, options)
	return through2.obj(function (file, enc, done) {
		
		// 如果文件为空，不做任何操作，转入下一个操作，即下一个 .pipe()
		if (file.isNull()) {
			this.push(file);
			return done();
		}
		
		// 插件不支持对 Stream 对直接操作，跑出异常
		if (file.isStream()) {
			this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
			return cb();
		}
		
		var content = file.contents.toString();
		
		if(!options.isDebug){
			var $ = cheerio.load(content, options);
			processHtmlForDOM($);
			content = $.html();
		}
		
		//instead of gulp-inject-xm
		//content = processHtmlForString(content, options); 
				
		file.contents = new Buffer(content);
		this.push(file);
		done();
	});
}

//<span class="buildjs" name="main.js" dist="/scripts/" />
//<script type="text/script" class="concat" base="../.." src="../../script/main.js"></script>
//<span class="buildcss" name="main.css" dist="/styles/" />
//<link type="text/css" class="concat" base="../.." href="../../style/main.css"></link>
/**
 * 将html里面标有class='concat'的js文件进行合并
 * 替换掉html已经合并的js引用，替换依据来自于html中，class='buildjs'的元素中
 * 将html里面标有class='concat'的css文件进行合并
 * 替换掉html已经合并的js引用，替换依据来自于html中，class='buildcss'的元素中
 **/
/**
 * $ : cheerio
 * file: stream
 */
function processHtmlForDOM($){
	
	var files = function(){
		return $('script.concat').map(function(i,elem){
			var el = $(elem);
			return el.attr('src').replace(el.attr("base"),"");
		}).toArray().map(function(item){
			return path.join(config.app,item);
		});
	}();
	
	if(files && files.length>0){
		var dist = $(".buildjs").attr("dist");
		var name = $(".buildjs").attr("name");

		var stream = vfs.src(files);
		stream.pipe(load.concat(name))
			.pipe(load.jshint('.jshintrc'))
			.pipe(load.jshint.reporter('jshint-stylish'))
			.pipe(load.uglify())
			.pipe(gulp.dest(config.dist+dist));
		
		$('script.concat').remove();
		$('.buildjs').remove();
		$('body').append('<script src="'+dist+name+'"></script>');

	}
	
	//process css
	var cdist = $(".buildcss").attr("dist");
	var cname = $(".buildcss").attr("name");
	var cfiles = function(){
		return $('lnik.concat').map(function(i,elem){
			
			var base = $(elem).attr("base");
			if(base){
				return $(elem).attr('href').replace($(elem).attr("base"),"");
			}else
				return $(elem).attr('href');
		}).toArray().map(function(item){
			return path.join(config.app,item);
		});
	}();
	
	if(files && cfiles.length>0){
		var stream = vfs.src(cfiles);
		stream.pipe(load.concat(cname))
			.pipe(cleanCSS())
			.pipe(gulp.dest(config.dist+cdist));		
	
		$('link.concat').remove();
		$('.buildcss').remove();
		$('head').append('<link href="'+cdist+cname+'"></link>');
	}
}

//处理字符串形式的html
//这里主要处理：注入
//默认处理：
//<!-- build {"type": "script", "ref":"style/main.js"} -->
//<script src="scripts/app.js"></script>
//<script src="scripts/controllers/main.js"></script>
//<!-- endbuild -->
/*
function processHtmlForString(content, options){
		
	//这里处理字符串形式的html
	//<!-- build {"type": "script", "ref":"style/main.js"} -->
	//<script src="scripts/app.js"></script>
	//<script src="scripts/controllers/main.js"></script>
	//<!-- endbuild -->
	
	//<!-- build {type: "css", ref:"style/main.js"} -->
	//<link href="styles/main.css"></link>
	//<link href="styles/default/style.css"></link>
	//<!-- endbuild -->
	var jsRegExp = /(<!--\s*build)[\s\S]*?(endbuild\s*-->)/g;

	//<!-- build {"type": "script", "ref":"style/main.js"} -->
	var headerReg = /<!--.*-->/;
	
	//{"type": "script", "ref":"style/main.js"}
	var jsonReg = /\{.*\}/;
	
	var matchElems = content.match(jsRegExp);
	if(matchElems && matchElems.length>0){
		//console.log("1:"+matchElems.length+", "+matchElems);
		for(var i=0; i < matchElems.length; i++){
			
			var head = matchElems[i].match(headerReg);
			//console.log("2:"+head);
			
			if(head && head.length>0){
				//console.log("3:"+head);
				
				var jsonStr = head[0].match(jsonReg);
				
				if(jsonStr && jsonStr.length>0){
					//console.log("4:"+jsonStr, "options.isDebug:"+options.isDebug);
					
					var info = JSON.parse(jsonStr[0]);
					
					if(!options.isDebug){
						var replaceText = "";
						if(info.type){
							if(info.type==='script'){
								replaceText = '<script type="text/script" src="'+info.ref+'"/>';
							}else if(info.type==='css')
								replaceText = '<link type="text/css" href="'+info.ref+'"/>';
							else{
								if(options && options.callback){
									console.log(replaceText);
									replaceText = options.callback(info, options.isDebug)
								}
							}
						}
						content = content.replace(matchElems[i], replaceText);
					}else{
						if(options && options.callback){
							var replaceText = options.callback(info, options.isDebug);
							
							if(replaceText){
								content = content.replace(matchElems[i], replaceText);
							}
						}
					}
					
				}
				
			}
			
		}
	}
	return content;
}
*/
//rename 官网例子
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


