# Discord <--> EC2 Server Manager

Manage multiple game server worlds on AWS EC2 through Discord slash commands. Each game+world runs on its own EC2 instance, and a single Discord bot controls them all.

## Architecture

The project is split into three layers:

- **Game configs** (`games/`) — per-game settings: instance type, storage, ports, start script
- **Infrastructure stacks** (`infrastructure/`) — a reusable SAM template deployed once per game+world, creating EC2, S3, security group, and SSM registry entries
- **Bot stack** (`bot/`) — a single SAM stack with the Discord bot Lambdas, which discovers worlds at runtime via SSM

A daily scheduled shutdown (2:30 AM PST) automatically stops all running worlds to save costs.

## Commands

- `/bot start <world>` — Start a game world
- `/bot stop <world>` — Stop a game world
- `/bot status` — Show status of all worlds
- `/bot status <world>` — Show status of a specific world

## Prerequisites

- Discord Bot setup
- AWS CLI configured for your target region
- AWS SAM CLI installed
- Node.js 20+
- A UNIX terminal (Linux, Mac, Windows with Bash)

## Getting Started

### 1. Store the bot client secret in SSM

```
./setup-ssm-params.sh <your-bot-client-secret>
```

### 2. Configure the bot

Edit `bot/samconfig.toml` and fill in the `parameter_overrides` with your `BotApplicationId`, `BotPublicKey`, and `AwsRegion`.

### 3. Deploy the bot

```
./deploy-bot.sh
```

Note the `DiscordEC2ServerManagerApi` URL from the deploy output.

### 4. Configure the Discord Interaction URL

Go to your Discord bot settings and set the **Interaction URL** to the API Gateway URL from the previous step.

### 5. Register slash commands

```
POST https://discord.com/api/v10/applications/<your-app-id>/commands

Headers:
  Authorization: Bot <your-bot-token>

Body:
[
  {
    "name": "bot",
    "description": "Manage game servers",
    "options": [
      {
        "type": 1,
        "name": "start",
        "description": "Start a game world",
        "options": [
          { "type": 3, "name": "world", "description": "World name", "required": true }
        ]
      },
      {
        "type": 1,
        "name": "stop",
        "description": "Stop a game world",
        "options": [
          { "type": 3, "name": "world", "description": "World name", "required": true }
        ]
      },
      {
        "type": 1,
        "name": "status",
        "description": "Show server status",
        "options": [
          { "type": 3, "name": "world", "description": "World name (omit for all)", "required": false }
        ]
      }
    ]
  }
]
```

### 6. Deploy a game world

```
./deploy-world.sh valheim survival play.example.com:2456
```

### 7. Upload server files

After deploying a world, upload your game server files to its S3 bucket:

```
aws s3 cp ./my-server-files/ s3://game-server-valheim-survival-server-files/server-files/ --recursive
```

### 8. Verify

In your Discord server, run `/bot status` to see all registered worlds.

## Adding a new game

Create a JSON file in `games/` with the game's requirements:

```json
{
  "instanceType": "t3a.large",
  "storageGB": 20,
  "imageId": "ami-008fe2fc65df48dac",
  "startScript": "my-game/start-server.sh",
  "ports": [
    { "protocol": "udp", "from": 27015, "to": 27015 }
  ]
}
```

Then deploy a world for it: `./deploy-world.sh my-game world1 play.example.com:27015`
