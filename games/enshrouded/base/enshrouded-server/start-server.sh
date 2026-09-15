#!/usr/bin/env bash

mkdir -p /home/ubuntu/server-files/enshrouded-server/savegame
chown -R 10000:10000 /home/ubuntu/server-files/enshrouded-server/savegame

set -a
source /home/ubuntu/server-files/.env
set +a

if docker ps -q &> /dev/null; then
    echo "Game server is running."
else
    echo "Game server is starting."

    docker run \
        --detach \
        --restart=unless-stopped \
        --name enshrouded-server \
        --mount type=bind,source=/home/ubuntu/server-files/enshrouded-server/savegame,target=/home/steam/enshrouded/savegame \
        --publish 15636:15636/udp \
        --publish 15637:15637/udp \
        --env=SERVER_NAME="${SERVER_NAME}" \
        --env=SERVER_SLOTS="${SERVER_SLOTS}" \
        --env=SERVER_PASSWORD="${SERVER_PASSWORD}" \
        --env=GAME_PORT=15636 \
        --env=QUERY_PORT=15637 \
        sknnr/enshrouded-dedicated-server:proton-latest
fi

exit 0
