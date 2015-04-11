function initialize() {
  //Setup Google Map
  var myLatlng = new google.maps.LatLng(17.7850,0);
  var light_grey_style = [{"featureType":"landscape","stylers":[{"saturation":-100},{"lightness":65},{"visibility":"on"}]},
                          {"featureType":"poi","stylers":[{"saturation":-100},{"lightness":51},{"visibility":"simplified"}]},
                          {"featureType":"road.highway","stylers":[{"saturation":-100},{"visibility":"simplified"}]},
                          {"featureType":"road.arterial","stylers":[{"saturation":-100},{"lightness":30},{"visibility":"on"}]},
                          {"featureType":"road.local","stylers":[{"saturation":-100},{"lightness":40},{"visibility":"on"}]},
                          {"featureType":"transit","stylers":[{"saturation":-100},{"visibility":"simplified"}]},
                          {"featureType":"administrative.province","stylers":[{"visibility":"off"}]},
                          {"featureType":"water","elementType":"labels","stylers":[{"visibility":"on"},{"lightness":-25},{"saturation":-100}]},
                          {"featureType":"water","elementType":"geometry","stylers":[{"hue":"#ffff00"},{"lightness":-25},{"saturation":-97}]}];
  var myOptions = {
    zoom: 2,
    center: myLatlng,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: true,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.LEFT_BOTTOM
    },
    styles: light_grey_style
  };
  var map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
  
  //Setup heat map and link to Twitter array we will append data to
  var heatmap;
  var liveTweets = new google.maps.MVCArray();
  heatmap = new google.maps.visualization.HeatmapLayer({
    data: liveTweets,
    radius: 25,
    dissipating: true
  });
  heatmap.setMap(map);

  if(io !== undefined) {
    // Storage for WebSocket connections  local host: http://localhost:8081/
    //has to be "/" when deploy
    var socket = io.connect('http://localhost:8081/');

    // This listens on the "twitter-steam" channel and data is 
    // received everytime a new tweet is receieved.
    socket.on('twitter-stream', function (data) {

      //Add tweet to the heat map array.
      var tweetLocation = new google.maps.LatLng(data.lng,data.lat);
      liveTweets.push(tweetLocation);
      var content = document.createElement("div");
      content.setAttribute('class', 'twitter-text');
      content.innerHTML = data.name+ ": "+data.text;
      document.getElementById('tweets').appendChild(content);
      console.log(data.text);
      document.getElementById("tweets").scrollTop = document.getElementById("tweets").scrollHeight;
      //flash marker on the map quickly
      var image = "css/Twitter_logo_blue.png";
      var marker = new google.maps.Marker({
        position: tweetLocation,
        map: map,
        icon: image
      });
      setTimeout(function(){
        marker.setMap(null);
      },1000);

    });//end of twitter stream event

    //listens on "twitter-trend" channel and update data accordingly
    //append trending topic names to html
    socket.on('twitter-trend', function (data) {
      console.log("going to display trending list");
      if(data&& data[0].trends){
        for(var i = 0; i<data[0].trends.length; i++){
          var topic = document.createElement("div");
          topic.setAttribute('class','trend');
          topic.setAttribute('id', i);
          if(i ==9) topic.innerHTML = "a";
          else if(i==8) topic.innerHTML = "e";
          else if(i ==7) topic.innerHTML = "o";
          else topic.innerHTML = data[0].trends[i].name;
          topic.addEventListener("click", click);
          document.getElementById("side-bar").appendChild(topic);
        }
      }
      else{
        console.log('Improper JSON Object Format');
      }
      //after receiving trends, start receiving tweets
      socket.emit("start tweets");
    });//end of twitter trend event

    // Listens for a success response from the server to 
    // say the connection was successful.
    socket.on("connected", function(r) {
      //Now that we are connected to the server let's tell 
      //the server we are ready to start receiving trending topics.
      socket.emit("give trends");
    });

    function click (){
      if(document.getElementsByClassName("chosen-trend").length == 0){
        if(this.className == 'trend'){
          this.className = 'chosen-trend';
          var kw = {'keyword': this.innerHTML};
          socket.emit("filter tweets", kw);
          var element = document.getElementById('tweets');
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }
        }
      }
      else if(this.className == 'chosen-trend'){
        this.className = 'trend';
        socket.emit("start tweets");
        var element = document.getElementById('tweets');
        while (element.firstChild) {
          element.removeChild(element.firstChild);
        }
      }
    }//end of click envent

  }//end of if
}//end of initialize




