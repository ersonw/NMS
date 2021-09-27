const NodeMediaServer = require('./');
//const DbClient = require('ali-mysql-client');
//const redis = require("redis");

var transs = [];
var relays = [];
async function init(){
	/*const db = new DbClient({
  host     : 'localhost',
  user     : 'root',
  password : '123456',
  database : 'test'
});
transs = await db
  .select("*")
  .from("trans")
  .where("status", "1", 'like') // name like '%测试页面%'
  .queryList();
  
relays = await db
  .select("*")
  .from("relay")
  .queryList();
  console.log(transs);
console.log(relays);*/
const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
	/*
    ssl: {
      port: 443,
      key: './privatekey.pem',
      cert: './certificate.pem',
    }
	*/
  },
  http: {
    port: 8000,
    mediaroot: './media',
    webroot: './www',
    allow_origin: '*',
    api: true
  },
  /*https: {
    port: 8443,
    key: './privatekey.pem',
    cert: './certificate.pem',
  },*/
  auth: {
    api: true,
    api_user: 'admin',
    api_pass: 'admin',
    play: false,
    publish: false,
    secret: 'nodemedia2017privatekey'
  },
  trans: {
    ffmpeg: './bin/ffmpeg.exe',
    tasks: [
      {
        app: 'cctv',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
       // dash: true,
       // dashFlags: '[f=dash:window_size=3:extra_window_size=5]',
		//mp4: true,
        //mp4Flags: '[movflags=frag_keyframe+empty_moov]',
      },{
		app: 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
	  }
    ]
  },
  relay: {
  ffmpeg: './bin/ffmpeg.exe',
  tasks: /*relays*/[
    {
      app: 'live',
      mode: 'static',
      edge: 'https://pull.tonhorn.cn/football/live20_hd.m3u8?auth_key=1610108527-4OGnbIL8gJ-0-31deb0b4981a261fcc051cd32e0f5bef',
      name: '1',
      rtsp_transport : 'tcp' //['udp', 'tcp', 'udp_multicast', 'http']
    },
	//{
     //   app: 'mv',
     //   mode: 'static',
     //   edge: '/Volumes/ExtData/Movies/Dancing.Queen-SD.mp4',
     //   name: 'dq'
      //}
  ]
 }
};


let nms = new NodeMediaServer(config)
nms.run();
}
init();
var allclient = [];
var WebSocketServer = require('websocket').server;
var http = require('http');
var defaultSou = 'http://172.21.68.10:8000/live/1/index.m3u8';
async function websockInit(){
  const redis = require("redis");
  const client = redis.createClient();
  let clientAdd = async function(data){
    for (let i = 0; i < allclient.length; i++) {
      if(allclient[i].token === data.token){
        delete allclient[i];
        break;
      }
    }
    allclient.push(data);
  };
  let clientGet = async function(token){
    await client.get('source',function(err,data){
      if(!err && data){
        var sou ='';
        data = JSON.parse(data);
        for (let i = 0; i < data.list.length; i++) {
          if(data.list[i].token == token){
            sou = data.list[i].source;
          }
        }
        if(sou == ''){
          sou = defaultSou;
                //sou = data.default;
        }
        var msg = {
          code: 101,
          source: sou,
          flash:false
        };
        zadd(token,JSON.stringify(msg));
      }else{
        client.set('source',JSON.stringify({list:[],default:defaultSou}),function(err){console.log(err);});
      }
    });
  };
  let zadd = async function (key, str) {  
    await client.del(key, function(err){
      if(err){
        console.log(err);
      }
    });
    await client.set(key,str,function(err){
      if(!err){
        client.publish('group',key);
      }
    });
  }
  var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
  });
  server.listen(808, function() {
    console.log((new Date()) + ' Server is listening on port 808');
  });
  let wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
  });
  let originIsAllowed = function (origin) {
    if(origin){
      return true;
    }
    return true;
  }
  wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    let token = '';
    var subscribe = redis.createClient();
    var snedMsg = async function(){
        await client.get(token, function(err,data){
            if(!err){
               // console.log("我接收到data了" + data);
                connection.sendUTF(data);
            }else{
                console.log(err);
            }
        });
    };
    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');
    subscribe.on("ready", function () {
        subscribe.subscribe("group");
    })
    subscribe.on('message',function(channel,message){
        if(message == token){
            snedMsg();
        }
    })
    connection.on('message', function(message) {
        
        if (message.type === 'utf8') {
            
            if(message.utf8Data === 'H'){
                connection.sendUTF(message.utf8Data);
                return;
            }
            var data = JSON.parse(message.utf8Data);
            if(!data.code){
                connection.close();
                return;
            }
            switch (data.code) {
                case 100:
                    token = data.token.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
                    console.log((new Date()) + ' TOKEN:'+token);
                    var val = {
                        token: token, 
                        info: data.info,
                        sock:connection,
                    };
                    for (let i = 0; i < allclient.length; i++) {
                        if((allclient[i].token) && allclient[i].token == token){
                            allclient[i].sock.close();
                        }
                    }
                    clientAdd(val);
                    connection.sendUTF(JSON.stringify({code:100}));
                    break;
                case 101:
                    clientGet(token);
                    break;
                default:
                    connection.sendUTF(message.utf8Data);
                    console.log((new Date()) + 'Received Message: ' + message.utf8Data);
                    break;
            }
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected. code:'+reasonCode + 'description:'+description);
    });
});
}
websockInit();
/*
const db = new DbClient({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'test'
});
const transs =  db
  .select("*")
  .from("trans")
  .where("status", "1") 
  .queryList();
const relays =  db
  .select("*")
  .from("relay")
  .where("status", "1") 
  .queryList();*/

/*
nms.on('preConnect', (id, args) => {
  console.log('[NodeEvent on preConnect]', `id=${id} args=${JSON.stringify(args)}`);
  // let session = nms.getSession(id);
  // session.reject();
})

nms.on('postConnect', (id, args) => {
  console.log('[NodeEvent on postConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('doneConnect', (id, args) => {
  console.log('[NodeEvent on doneConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('prePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  // let session = nms.getSession(id);
  // session.reject();
});

nms.on('postPublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('prePlay', (id, StreamPath, args) => {
  console.log('[NodeEvent on prePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  // let session = nms.getSession(id);
  // session.reject();
});

nms.on('postPlay', (id, StreamPath, args) => {
  console.log('[NodeEvent on postPlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePlay', (id, StreamPath, args) => {
  console.log('[NodeEvent on donePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

*/