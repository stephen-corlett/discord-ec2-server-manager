# Discord <--> EC2 Server Manager

This project manages the connection between a Discord bot and an AWS EC2 server. With Discord commands you can easily start and stop the server while also being able to check it's current status.

This is mainly useful to keep costs down by enabling anyone in your Discord server to stop the server so you aren't paying for a high quality game server to run when you aren't even using it.

## How it works

This project uses AWS API Gateway and AWS Lambda to receive requests from Discord and manage the EC2 server. The two services are essentially free for this purpose.

The stack is deployed via AWS SAM so that you can deploy to any AWS account but just configuring a few environment variables.

## Currently supported commands

- `status` - Check if the server is running or not
- `start` - Start the server
- `stop` - Stop the server

## Getting started

### Prerequisites

- Discord Bot Setup
- AWS CLI setup to authenticate to your desired region
- AWS SAM Installed
- A UNIX terminal (Linux, Mac, Windows w\ Bash enabled)

### Clone the repository

```
git clone git@github.com:stephen-corlett/discord-ec2-server-manager.git
```

### Setup environment variables


```
cd discord-ec2-server-manager && cp .env.example .env
```

Open the `.env` file and fill in the missing values.

### Deploy

```
./deploy.sh
```

In the deploy `Outputs` note the `DiscordEc2ServerManagerApi` and save the Value for the next step. It should be a URL similar to: `https://z3ykyzzr29.execute-api.us-west-2.amazonaws.com/Prod/`

### Configure Bot Interaction URL

Go to the settings of your Discord bot and find the `Interaction URL` input. Enter the `DiscordEc2ServerManagerApi` URL to took from the previous step and hit save changes.

### Add commands to your Discord bot

```
POST `{{discordApiBaseUrl}}/applications/814014697527312434/commands`

Headers:
  Authorization: Bot {{BotAPIKey}}

Body:
[
  {
    "name": "Discord Bot",
    "description": "Tell the Discord bot to do something.",
    "options": [
      {
        "type": 1,
        "name": "start",
        "description": "Start the server"
      },
      {
        "type": 1,
        "name": "stop",
        "description": "Stop the server"
      },
      {
        "type": 1,
        "name": "status",
        "description": "Show the current server status"
      }
    ]
  }
]
```

### Verify

In your Discord server run one of the commands like `/bot start`.
