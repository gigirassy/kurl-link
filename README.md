# kurl

open source, extremely lightweight link shortener for personal usage, using node.js, curl, and sqlite

1. password system prevents abuse by people you don't know. if the password isn't specified in a link creation curl request, it will fail. you can be the only one that knows the password, or you can give the password to your friends for group usage.
2. very minimal dependencies. all you need is docker or node.js to get it started.
3. no public-facing analytics, and an extremely simple html main page. load on a system is minimal to the point where you can safely host it on a 1 buck vps.

## docker (recommended)

1. if not done already, install docker-compose-v2. ```apt-get install docker-compose-v2```
2. ```mkdir kurl && cd kurl```
3. ```wget https://raw.githubusercontent.com/gigirassy/kurl-link/refs/heads/main/compose.yml```
4. use nano or vim to edit the CREATE_PASSWORD and INSTANCE_URL fields as you please. change the host port if it's taken. set the password to something that is not easy to guess.
5. ```docker compose up -d```

after, make sure to reverse-proxy the host port to a domain.
