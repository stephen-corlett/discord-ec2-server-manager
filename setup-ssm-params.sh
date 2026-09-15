#!/usr/bin/env bash
set -e

# One-time setup: stores the Discord bot client secret in SSM Parameter Store.
# Usage: ./setup-ssm-params.sh <bot-client-secret>

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <bot-client-secret>"
  exit 1
fi

PREFIX="/discord-ec2-server-manager"

aws ssm put-parameter --name "${PREFIX}/bot-client-secret" --value "$1" --type String --overwrite > /dev/null
echo "stored  ${PREFIX}/bot-client-secret"

echo ""
echo "Done! Verify with:"
echo "  aws ssm get-parameter --name ${PREFIX}/bot-client-secret"
