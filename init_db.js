var mysql = require('mysql');
var fs= require("fs");
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: ""
});
con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
  con.query("CREATE DATABASE test", function (err, result) {
	/*if (err) throw err;
		console.log("Database created");
	*/
	con.query("use test", function (err, result) {});
	var sql = "CREATE TABLE sys (name VARCHAR(255), value VARCHAR(255))";
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("Table created sys");
  });
  sql = "INSERT INTO sys (name, value) VALUES ('rtmpport', '1935')";
  con.query(sql, function (err, result) {if (err) throw err;console.log("1 record inserted");});
  
  sql = "CREATE TABLE trans (status int(11), app VARCHAR(255), hls int(11), hlsFlags VARCHAR(255), dash int(11), dashFlags VARCHAR(255), mp4 int(11),mp4Flags VARCHAR(255))";
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("Table created trans");
  });
  sql = "INSERT INTO trans (status, app, hls, hlsFlags, mp4, mp4Flags, dash, dashFlags) VALUES (1, 'live', 1, '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]', 0, '[movflags=frag_keyframe+empty_moov]',0,'[f=dash:window_size=3:extra_window_size=5]')";
  con.query(sql, function (err, result) {if (err) throw err;console.log("1 record inserted");});
  sql = "INSERT INTO trans (status, app, hls, hlsFlags, mp4, mp4Flags, dash, dashFlags) VALUES (1, 'cctv', 1, '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]', 1, '[movflags=frag_keyframe+empty_moov]',0,'[f=dash:window_size=3:extra_window_size=5]')";
  con.query(sql, function (err, result) {if (err) throw err;console.log("1 record inserted");});
  
  sql = "CREATE TABLE relay (app VARCHAR(255), mode VARCHAR(255), edge VARCHAR(255), name VARCHAR(255), rtsp_transport VARCHAR(255))";
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("Table created relay");
  });
  sql = "INSERT INTO relay (app, mode, edge, name, rtsp_transport) VALUES ('cctv', 'static', 'rtsp://admin:Admin@123@192.168.1.66:554/h264/ch1/sub/av_stream', 'ch1', 'tcp')";
  con.query(sql, function (err, result) {if (err) throw err;console.log("1 record inserted");});
  
  con.query("use mysql", function (err, result) {});
  sql ="update user set password=password('123456') where user='root';";
  con.query(sql, function (err, result) {if (err) throw err;console.log("change passwd");});
  con.query("flush privileges;", function (err, result) {});
  });
  /*try{
	  fs.accessSync("./sql.lock",fs.F_OK);
	  console.log('the file was already existed.');
	}
	catch(e){
		console.log('the file not exist...');
		con.query("CREATE DATABASE test", function (err, result) {
			if (err) throw err;
			console.log("Database created");
			});
	}*/
});