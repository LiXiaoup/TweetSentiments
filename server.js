//Setup web server and socket
var twitter = require('twit'),
    express = require('express'),
    //mysql = require('mysql'),
    app = express(),
    http = require('http'),
    server = http.createServer(app),
    io = require('socket.io').listen(server);

//Setup twitter stream api
var twit = new twitter({
  consumer_key: 'ejCEHa6IMNxi51zrQTE136wdi',
  consumer_secret: 'gfWykQNDhbTy3Oswl0s7npWexglTeZvAQqS5zJExkAjURX2q1s',
  access_token: '391259637-w34O1NT5sYPdiIdGN1YWW8FIe2Y6PYEvXxEydtYl',
  access_token_secret: 'EEOOVs8IVMWtjx4uK3KeWRrmkKTlsYkdatShSAltWnGpW'
}),
stream = null;

var curStream = null;

// var mydb = new mysql.createConnection({
//   host     : 'aaox5h15g7usi4.cnjryr7wwjlv.us-west-2.rds.amazonaws.com',
//   user     : 'CloudA1',
//   password : 'twittermap',
//   database : 'ebdb'
// });
// //connect to specified database
// mydb.connect();

//Use the default port (for beanstalk) or default to 8080 locally
server.listen(process.env.PORT || 8081);

//Setup rotuing for app
app.use(express.static(__dirname + '/public'));

//Create web sockets connection.
io.sockets.on('connection', function (socket) {
    //11 extract a list of trending topic worldwide on start up
    socket.on("give trends", function(){
      twit.get('trends/place', {id:1}, function (error, data, response){
          if(error){console.log(error);}
          var trends = data;
          //if cannot get trends, use predefined keywords
          if(data == null){
            trends = [{"trends":[{"name":"YOLO"},{"name":"Apple"},{"name":"RIP Kirby"},{"name":"Jeremy Clarkson"},
                                {"name":"DealBreaker"},{"name":"HappyBirthday"},{"name":"Obama"},{"name":"Yelp"},
                                {"name":"KimKardashian"},{"name":"netflix"}]}];
          }
          console.log(trends);
          socket.broadcast.emit('twitter-trend', trends);
          socket.emit('twitter-trend',trends);
      });
    });//end of give trends

    socket.on("start tweets", function() {
      if(stream != null) {
        stream.stop();
      }
        //Connect to twitter stream passing in filter for entire world: 'locations':'-180,-90,180,90'.
        //or set keywords for filter like: track: 'twitter'
      stream = twit.stream('statuses/filter', {locations:['-180','-90','180','90']});
      stream.on('tweet', streamHandler);
    });// end of start tweets event

    socket.on("filter tweets", function (data) {
      //first query from database for previous stored topics
      //then start twitter filter stream for the keyword
      if(stream != null) {
        stream.stop();
      }
      var topic = data.keyword;
      stream = twit.stream('statuses/filter', {track:topic});
      stream.on('tweet', streamHandler);
    });

    // Emits signal to the client telling them that the connection is started
    //and create tables in db for storing tweets
    // mydb.query('DROP TABLE IF EXISTS tweets', function(err, row, field){
    //   if(err)
    //     console.log(err);
    //   else
    //     console.log('Cleared Duplicates');
    // });
    // mydb.query('CREATE TABLE tweets (name VARCHAR(100), text VARCHAR(255), lat DOUBLE,'+
    //            'lng DOUBLE, PRIMARY KEY(name))', function(err, row, field){
    //   if(err)
    //     console.log(err);
    //   else
    //     console.log('Table tweets created.');
    // });
    socket.emit("connected");

    function streamHandler(data) {
      // Does the JSON result have coordinates
      if (data.coordinates){
        if (data.coordinates !== null){
          //If so then build up some nice json and send out to web sockets
          var outputPoint = {"name": data.user.name, "text": data.text, "lat": data.coordinates.coordinates[0],"lng": data.coordinates.coordinates[1]};
          //mydb.query('INSERT INTO tweets SET ?', outputPoint, function(err, result){
          //   if(err)
          //     console.log(err);
          //   else
          //     console.log('Insert Success');
          // });
          socket.broadcast.emit("twitter-stream", outputPoint);

          //Send out to web sockets channel.
          socket.emit('twitter-stream', outputPoint);
        }
        else if(data.place){
          if(data.place.bounding_box === 'Polygon'){
            // Calculate the center of the bounding box for the tweet
            var coord, _i, _len;
            var centerLat = 0;
            var centerLng = 0;

            for (_i = 0, _len = coords.length; _i < _len; _i++) {
              coord = coords[_i];
              centerLat += coord[0];
              centerLng += coord[1];
            }
            centerLat = centerLat / coords.length;
            centerLng = centerLng / coords.length;

            // Build json object and broadcast it
            var outputPoint = {"name": data.user.name, "text":data.text,"lat": centerLat,"lng": centerLng};
            //mydb.query('INSERT INTO tweets SET ?', outputPoint, function(err, result){
            //   if(err)
            //     console.log(err);
            //   else
            //     console.log('Insert Success');
            // });
            socket.broadcast.emit("twitter-stream", outputPoint);
            socket.emit('twitter-stream', outputPoint);

          }
        }
      }//end of if status have location info check

      stream.on('limit', function (limitMessage) {
        //return console.log(limitMessage);
      });

      stream.on('warning', function (warning) {
        return console.log(warning);
      });

      stream.on('disconnect', function (disconnectMessage) {
        return console.log(disconnectMessage);
      });
    }//end of stream handler

});//end of create connection



