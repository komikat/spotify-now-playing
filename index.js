const express = require('express')
const fs = require('fs')
const axios = require('axios')
const SpotifyWebApi = require('spotify-web-api-node');
const cors = require('cors')

const dotenv = require('dotenv');

dotenv.config();

var spotifyApi = new SpotifyWebApi();

const clientId = 'c899485844584bfa9e4c77ec3ec54d8f';
const clientSecret = process.env.secret



const buff = Buffer.from(clientId + ':' + clientSecret);
const base64data = buff.toString('base64');


const app = express()

app.use(cors());
const redirect_uri = process.env.repl ? "https://spotify.akshitkumar3110.repl.co/callback" : "http://127.0.0.1:3000/callback"


// fs.writeFileSync('./refresh_token.txt', refresh_token);

app.get('/', (req, res) => {
    return res.send('Welcome to the backend for the spotify status, I use this to fetch songs playing on my spotify.')
})

app.get('/login', function (req, res) {
    const scope = 'user-read-currently-playing user-read-recently-played';
    const client_id = clientId;
    res.redirect('https://accounts.spotify.com/authorize' +
        '?response_type=code' +
        '&client_id=' + client_id +
        '&scope=' + encodeURIComponent(scope) +
        '&redirect_uri=' + encodeURIComponent(redirect_uri));
});

const axiosReq = async (options) => {

    const response = await axios(options);

    return response
}

app.get('/callback', async function (req, res) {
    const auth_code = req.query.code;

    if(!auth_code){
        return res.send("Invalid request.")
    }
    const options = {
        url: 'https://accounts.spotify.com/api/token',
        method: 'post',
        headers: {
            authorization: `Basic ${base64data}`, /* remember ? */
            contentType: 'application/x-www-form-urlencoded'
        },
        params: {
            grant_type: 'authorization_code',
            code: auth_code,
            redirect_uri: redirect_uri
        }
    };

    axiosReq(options).then((response) => {
        const refresh_token = response.data.refresh_token;
        fs.writeFileSync('./refresh_token.txt', refresh_token);

        return res.end('Success ! You can close this tab now!');
    }).catch((err) => {
        res.end("Something went wrong: " + err.response.data.error_description)
    })
});


const getAccessToken = async () => {
    let refresh_token;

    try {
        refresh_token = fs.readFileSync('./refresh_token.txt', 'utf8');
    }
    catch (err) {
        return null
    }

    const auth_response = await axios({
        url: 'https://accounts.spotify.com/api/token',
        method: 'post',
        headers: {
            authorization: `Basic ${base64data}`,
            contentType: 'application/x-www-form-urlencoded'
        },
        params: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        }
  });

    const access_token = auth_response.data.access_token;
    return access_token
}



app.get("/now", async (req, res) => {

    const access_token = await getAccessToken();

    if(!access_token){
        console.log("File not found, logging in again")
        return res.redirect("/login")
    }


    spotifyApi.setAccessToken(access_token);

    spotifyApi.getMyCurrentPlayingTrack()
        .then( (data) => {
            const song = data.body.item.name;
            const artist = data.body.item.artists[0].name;
            const url = data.body.item.external_urls.spotify;

            const trackData = {
                playing: true,
                song: song,
                url: url,
                artist: artist
            }

            fs.writeFileSync('./track.json', JSON.stringify(trackData));
            res.send(trackData)

        }).catch( (err) => {
            res.send({
                playing: false
            })
            console.log('Offline');
        });

})


app.get("/history", async(req, res) => {

    const access_token = await getAccessToken();

    spotifyApi.setAccessToken(access_token);

    spotifyApi.getMyRecentlyPlayedTracks({
        limit : 20
      }).then(function(data) {
          // Output items
          console.log("Your 20 most recently played tracks are:");
          data.body.items.forEach(item => console.log(item.track));
        }, function(err) {
          console.log('Something went wrong!', err);
        });
      
})
app.listen(3000, () => {
    console.log("Listening on 3000")
})