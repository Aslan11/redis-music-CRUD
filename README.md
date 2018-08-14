# Redis Music - An Express CRUD Example

So this happened on reddit:
![reddit-screenshot](https://i.imgur.com/qrhBfgF.png)

And I followed through!
I built a super simple API with https://github.com/swagger-api/swagger-node. It's a simple example of how you can take relational data (Songs, Albums, Artists) denormalize it for use in something like Redis.

##### Pre-Reqs:
NodeJs

swagger-node (not necessary but nice to have so you can play with the swagger editor)

redis

##### Assumptions:
you're connecting on localhost.

##### Start

1. pull repo and cd into it
2. npm i
3. swagger start (or npm start)

### TODO:
Make the tests pass. The API works as expected, I just need to clean up some stuff in the tests themselves.
