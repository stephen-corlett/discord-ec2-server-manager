#!/usr/bin/env bash

mkdir -p /home/ubuntu/server-files/valheim-server/savegame
chown -R 1000:1000 /home/ubuntu/server-files/valheim-server/savegame

mkdir -p /home/ubuntu/valheim-server
chown -R 1000:1000 /home/ubuntu/valheim-server

cp /home/ubuntu/server-files/valheim-server/docker-compose.service /etc/systemd/system/docker-compose.service

echo "Game server is starting."

systemctl daemon-reload
systemctl enable docker-compose.service
systemctl start docker-compose.service

systemctl status docker-compose.service

exit 0
