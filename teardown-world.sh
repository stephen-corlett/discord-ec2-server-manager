#!/usr/bin/env bash
set -e

GAME=$1
WORLD=$2

if [ -z "$GAME" ] || [ -z "$WORLD" ]; then
  echo "Usage: $0 <game> <world>"
  echo "Example: $0 valheim survival"
  exit 1
fi

SCRIPT_DIR="$(dirname "$0")"
WORLD_CONFIG="${SCRIPT_DIR}/games/${GAME}/worlds/${WORLD}.json"
ENV_FILE="${SCRIPT_DIR}/.env"

if [ ! -f "$WORLD_CONFIG" ]; then
  echo "Error: World config not found at ${WORLD_CONFIG}"
  exit 1
fi

if [ -f "$ENV_FILE" ]; then
  set -a; source <(tr -d '\r' < "$ENV_FILE"); set +a
fi

export AWS_PAGER=""

WORLD_ID=$(node -e "console.log(require('${WORLD_CONFIG}').worldId)")
STACK_NAME="game-server-${WORLD_ID}"
SUBDOMAIN="${WORLD_ID}"
SERVER_URL="${SUBDOMAIN}.${CF_DOMAIN}"

echo "Tearing down ${STACK_NAME}..."

# Stop the instance first so saves sync via the shutdown hook
INSTANCE_ID=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='InstanceId'].OutputValue" \
  --output text 2>/dev/null || true)

if [ -n "$INSTANCE_ID" ] && [ "$INSTANCE_ID" != "None" ]; then
  INSTANCE_STATE=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query "Reservations[0].Instances[0].State.Name" \
    --output text 2>/dev/null || true)

  if [ "$INSTANCE_STATE" = "running" ]; then
    echo "Stopping instance ${INSTANCE_ID} (waiting for save sync)..."
    aws ec2 stop-instances --instance-ids "$INSTANCE_ID" > /dev/null
    aws ec2 wait instance-stopped --instance-ids "$INSTANCE_ID"
    echo "  Instance stopped, saves synced to S3"
  else
    echo "  Instance is ${INSTANCE_STATE}, skipping stop"
  fi
fi

# Delete the CloudFormation stack
echo "Deleting CloudFormation stack..."
aws cloudformation delete-stack --stack-name "${STACK_NAME}"
echo "  Stack deletion initiated (S3 bucket retained with saves)"

# Clean up DNS record
if [ -n "$CF_API_TOKEN" ] && [ -n "$CF_ZONE_ID" ] && [ -n "$CF_DOMAIN" ]; then
  echo "Cleaning up DNS record: ${SERVER_URL}"

  EXISTING=$(curl -s -X GET \
    "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?type=A&name=${SERVER_URL}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json")

  RECORD_ID=$(echo "$EXISTING" | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const r = d.result && d.result[0];
    if (r) console.log(r.id);
  " 2>/dev/null || true)

  if [ -n "$RECORD_ID" ]; then
    curl -s -X DELETE \
      "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records/${RECORD_ID}" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" \
      > /dev/null
    echo "  DNS record deleted"
  else
    echo "  No DNS record found"
  fi
fi

echo ""
echo "Done! World '${WORLD_ID}' (${GAME}/${WORLD}) is being torn down."
echo "  Save files are preserved in S3 bucket: ${STACK_NAME}-server-files"
echo "  To restore, run: ./deploy-world.sh ${GAME} ${WORLD}"
