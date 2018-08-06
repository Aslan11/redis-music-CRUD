'use strict';

var util = require('util');
var redis = require('redis');
var bluebird = require('bluebird');

// this promisifies all the standard redis functions.
// to leverage the new promisiefied functions, we just tack on
// Async to the normal client function. E.G. hgetallAsync('hashkey')
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

// Initialize Redis
var r = redis.createClient();

module.exports = {
  add: add,
  getByTitle: getByTitle,
  getAlbumByTitle: getAlbumByTitle,
  getArtistByName: getArtistByName,
  getAllAlbums: getAllAlbums,
  getAllArtists: getAllArtists,
  getAllSongs: getAllSongs
};

// Add a song to the database
function add(req, res) {
  // variables defined in the Swagger document can be referenced using
  // req.swagger.params.{parameter_name}
  var song = req.swagger.params.song.value;

  // We need to keep master indexes of all the songs, artists and
  // albums coming in. To retrieve them all quickly (SMEMBERS) and make sure
  // that we don't add duplicates we'll leverage the Set Data-Structure.

  // SADD adds a song to master library set
  r.sadd('library', song.title);

  // SADD adds an artist to master artist set
  r.sadd('artists', song.artist);

  // SADD adds album to master albums set
  r.sadd('albums', song.album);

  // We'll represent an individual song as a Hash
  // HMSET (Hash Multi Set) sets multiple subfields at once,
  // and creates the hash if it doesn't exist already
  r.hmset('song:'+song.title, 'title', song.title, 'artist', song.artist, 'album', song.album);

  // We'll represent albums as Sets of songs
  // SADD to add the song to the album set
  r.sadd('album:'+song.album, song.title);

  // We'll create a secondary indexes for everything
  // Secondary indexing is a huge part of managing de-normalized data,
  // it'll be a pattern you become familiar with if you leverage redis beyond
  // simple caching or session storage.
  r.sadd('artist:'+song.artist+':albums', song.album)
  r.sadd('artist:'+song.artist+':songs', song.title)
  r.sadd('album:'+song.album+':artists', song.artist)

  var songResponse = {
    "title": song.title,
    "artist": song.artist,
    "album": song.album
  };

  res.status(200).json(songResponse);
}

function getByTitle(req, res) {
  var title = req.swagger.params.title.value;
  // We'll use an HGETALL to get all the information from the hash, including the field labels
  r.hgetallAsync('song:'+title)
    .then(function(data){
      res.status(200).json(data);
    })
    .catch(function(err){
      res.status(400).json({message: err});
    })
}

function getAlbumByTitle(req, res) {
  var album = req.swagger.params.album.value;
  var promises = [];
  // We're going to use SMEMBERS here to quickly get
  // all the artists and songs for the specified album
  var songs = r.smembersAsync('album:'+album)
  var artists = r.smembersAsync('album:'+album+':artists');
  promises.push(songs);
  promises.push(artists);
  Promise.all(promises)
    .then(function(data){
      var albumResponse = {
        title: album,
        artists: data[1],
        songs: data[0]
      };
      res.status(200).json(albumResponse);
    })
    .catch(function(err){
      res.status(400).json({message: err});
    })
}

function getArtistByName(req, res) {
  var name = req.swagger.params.name.value;
  var promises = [];
  // We're going to use SMEMBERS here to quickly get
  // all the artists and songs for the specified album
  var songs = r.smembersAsync('artist:'+name+':songs')
  var albums = r.smembersAsync('artist:'+name+':albums')
  promises.push(songs);
  promises.push(albums);
  Promise.all(promises)
    .then(function(data){
      var albumResponse = {
        artist: name,
        albums: data[1],
        songs: data[0]
      };
      res.status(200).json(albumResponse);
    })
    .catch(function(err){
      res.status(400).json({message: err});
    })
}

// For the fetch alls, we'll just leverage smembers
function getAllAlbums(req, res) {
  r.smembersAsync('albums')
    .then(function(data){
      res.status(200).json({albums: data})
    })
    .catch(function(err){
      res.status(400).json({message: err})
    })
}

function getAllArtists(req, res) {
  r.smembersAsync('artists')
    .then(function(data){
      res.status(200).json({artists: data})
    })
    .catch(function(err){
      res.status(400).json({message: err})
    })
}

function getAllSongs(req, res) {
  r.smembersAsync('library')
    .then(function(data){
      res.status(200).json({songs: data})
    })
    .catch(function(err){
      res.status(400).json({message: err})
    })
}
